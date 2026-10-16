package expo.modules.sedernative

import android.app.NotificationManager
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

    // ── יומן שימוש ──
    Function("usageSince") { fromMs: Double ->
      val ignore = setOf(ctx.packageName, "com.android.systemui", "android")
      UsageLog.since(ctx, fromMs.toLong(), ignore).filter { !LockState.alwaysAllowed(ctx, it["pkg"] as String) || it["pkg"] == ctx.packageName }
    }
  }
}
