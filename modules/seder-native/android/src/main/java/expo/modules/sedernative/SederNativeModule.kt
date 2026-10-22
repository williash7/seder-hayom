package expo.modules.sedernative

import android.app.NotificationManager
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import java.io.ByteArrayOutputStream
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SederNativeModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun open(action: String, withPackage: Boolean) {
    val i = Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    if (withPackage) i.data = Uri.parse("package:" + ctx.packageName)
    try { ctx.startActivity(i) } catch (_: Exception) {
      ctx.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx.packageName))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }

  override fun definition() = ModuleDefinition {
    Name("SederNative")

    // ── שעון מעורר ──
    Function("scheduleAlarm") { atMs: Double, title: String, body: String ->
      AlarmScheduler.schedule(ctx, atMs.toLong(), title, body)
    }
    Function("cancelAlarm") { AlarmScheduler.cancel(ctx) }
    Function("stopRinging") { AlarmScheduler.stopRinging(ctx) }
    Function("consumeWoke") {
      val p = Prefs.get(ctx)
      val v = p.getLong("wokeAt", 0L)
      if (v > 0) p.edit().remove("wokeAt").apply()
      v.toDouble()
    }
    Function("canExactAlarm") { AlarmScheduler.canExact(ctx) }
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= 31) open(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, true)
    }
    Function("canFullScreen") {
      if (Build.VERSION.SDK_INT >= 34) {
        (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()
      } else true
    }
    Function("openFullScreenSettings") {
      if (Build.VERSION.SDK_INT >= 34) open(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, true)
    }

    // ── זמן בית ──
    Function("setLock") { active: Boolean, fromMs: Double, untilMs: Double, allowed: List<String> ->
      LockState.set(ctx, active, fromMs.toLong(), untilMs.toLong(), allowed)
    }
    Function("unlockFor") { minutes: Double -> LockState.unlockFor(ctx, minutes) }
    Function("isLockServiceOn") {
      val list = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
      list.split(':').any { it.startsWith(ctx.packageName + "/") && it.endsWith("HomeLockService") }
    }
    Function("openAccessibilitySettings") { open(Settings.ACTION_ACCESSIBILITY_SETTINGS, false) }
    Function("consumeBlocked") {
      val p = Prefs.get(ctx)
      val pkg = p.getString("blockedPkg", "") ?: ""
      if (pkg.isNotEmpty()) p.edit().remove("blockedPkg").apply()
      pkg
    }
    Function("appLabel") { pkg: String -> UsageLog.label(ctx, pkg) }
    Function("openPackage") { pkg: String ->
      val i = ctx.packageManager.getLaunchIntentForPackage(pkg)
      if (i != null) { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); ctx.startActivity(i); true } else false
    }

    // ── מסך הבית ──
    Function("isDefaultHome") {
      val r = ctx.packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), PackageManager.MATCH_DEFAULT_ONLY)
      r?.activityInfo?.packageName == ctx.packageName
    }
    Function("openHomeSettings") {
      try { ctx.startActivity(Intent(Settings.ACTION_HOME_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
      catch (_: Exception) { open(Settings.ACTION_SETTINGS, false) }
    }
    // כל האפליקציות שאפשר לפתוח: { pkg, label, icon (PNG base64) }
    AsyncFunction("listApps") { withIcons: Boolean ->
      val pm = ctx.packageManager
      val list = pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
      val seen = HashSet<String>()
      list.mapNotNull { ri ->
        val pkg = ri.activityInfo.packageName
        if (pkg == ctx.packageName || !seen.add(pkg)) return@mapNotNull null
        val m = HashMap<String, Any>()
        m["pkg"] = pkg
        m["label"] = ri.loadLabel(pm).toString()
        if (withIcons) {
          try {
            val d = ri.loadIcon(pm)
            val size = 96
            val b = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val c = Canvas(b)
            d.setBounds(0, 0, size, size); d.draw(c)
            val out = ByteArrayOutputStream()
            b.compress(Bitmap.CompressFormat.PNG, 100, out)
            m["icon"] = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
          } catch (_: Exception) {}
        }
        m
      }.sortedBy { (it["label"] as String).lowercase() }
    }

    // ── וידג'טים של אפליקציות אחרות (מוצגים בתוך סדר היום) ──
    OnActivityEntersForeground { WidgetHost.start(ctx) }
    OnActivityEntersBackground { WidgetHost.stop(ctx) }

    View(WidgetView::class) {
      Prop("widgetId") { view: WidgetView, id: Int -> view.setWidget(id) }
    }

    // כל הווידג'טים שהותקנו בטלפון: { provider, label, app, w, h, configure }
    AsyncFunction("listWidgetProviders") {
      val pm = ctx.packageManager
      val d = ctx.resources.displayMetrics.density
      AppWidgetManager.getInstance(ctx).installedProviders.map { p ->
        val m = HashMap<String, Any>()
        m["provider"] = p.provider.flattenToString()
        m["label"] = try { p.loadLabel(pm) ?: p.provider.shortClassName } catch (_: Exception) { p.provider.shortClassName }
        m["app"] = try { pm.getApplicationLabel(pm.getApplicationInfo(p.provider.packageName, 0)).toString() } catch (_: Exception) { p.provider.packageName }
        m["pkg"] = p.provider.packageName
        m["w"] = Math.round(p.minWidth / d)
        m["h"] = Math.round(p.minHeight / d)
        m["configure"] = p.configure != null
        m
      }.sortedWith(compareBy({ (it["app"] as String).lowercase() }, { (it["label"] as String).lowercase() }))
    }

    // שלב 1: מקצה מזהה ומנסה לקשור. אם צריך אישור — נפתח חלון אישור של המערכת
    Function("allocateWidget") { provider: String ->
      val cn = ComponentName.unflattenFromString(provider)!!
      val host = WidgetHost.get(ctx)
      val mgr = AppWidgetManager.getInstance(ctx)
      val id = host.allocateAppWidgetId()
      val ok = mgr.bindAppWidgetIdIfAllowed(id, cn)
      var resolved = ""
      if (!ok) {
        val i = Intent(AppWidgetManager.ACTION_APPWIDGET_BIND)
          .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
          .putExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER, cn)
        resolved = i.resolveActivity(ctx.packageManager)?.flattenToShortString() ?: ""
        val act = appContext.currentActivity
        try {
          if (act != null) act.startActivity(i)
          else ctx.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: Exception) { resolved = "שגיאה: " + (e.message ?: e.javaClass.simpleName) }
      }
      val m = HashMap<String, Any>()
      m["id"] = id
      m["bound"] = ok
      m["resolved"] = resolved
      m
    }
    // האם הווידג'ט נקשר, והאם יש לו מסך הגדרה
    Function("widgetState") { id: Int ->
      val info = AppWidgetManager.getInstance(ctx).getAppWidgetInfo(id)
      val m = HashMap<String, Any>()
      m["bound"] = info != null
      m["configure"] = info?.configure != null
      m["h"] = if (info != null) Math.round(info.minHeight / ctx.resources.displayMetrics.density) else 0
      m
    }
    Function("configureWidget") { id: Int ->
      val act = appContext.currentActivity
      if (act != null) {
        try { WidgetHost.get(ctx).startAppWidgetConfigureActivityForResult(act, id, 0, 7001, null) } catch (_: Exception) {}
      }
    }
    Function("deleteWidget") { id: Int ->
      try { WidgetHost.get(ctx).deleteAppWidgetId(id) } catch (_: Exception) {}
    }

    // ── יומן שימוש ──
    Function("usageSince") { fromMs: Double ->
      val ignore = setOf(ctx.packageName, "com.android.systemui", "android")
      UsageLog.since(ctx, fromMs.toLong(), ignore).filter { !LockState.alwaysAllowed(ctx, it["pkg"] as String) || it["pkg"] == ctx.packageName }
    }
  }
}
