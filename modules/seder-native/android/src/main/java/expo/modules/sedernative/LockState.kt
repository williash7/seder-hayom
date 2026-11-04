package expo.modules.sedernative

import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.TelecomManager

/** מתי לחסום אפליקציה בזמן בית */
internal object LockState {
  // אפליקציות מערכת שחייבות להישאר זמינות גם כשנעילת זמן בית פעילה.
  // רשימה מפורשת בלבד — לא לפתוח אוטומטית כל חבילה עם קידומת Samsung.
  private val criticalPackages = setOf(
    "com.android.settings",
    "com.samsung.android.settings",
    "com.android.dialer",
    "com.google.android.dialer",
    "com.samsung.android.dialer",
    "com.sec.android.app.dialertab",
    "com.android.phone",
    "com.android.incallui",
    "com.samsung.android.incallui",
    "com.android.server.telecom",
    "com.android.providers.telephony",
    "com.android.contacts",
    "com.google.android.contacts",
    "com.samsung.android.app.contacts",
    "com.google.android.permissioncontroller",
    "com.android.permissioncontroller",
    "com.samsung.android.permissioncontroller",
    "com.osp.app.signin",
    "com.samsung.android.mobileservice",
    "com.samsung.android.samsungaccount",
  )

  fun set(ctx: Context, active: Boolean, fromMs: Long, untilMs: Long, allowed: List<String>) {
    Prefs.get(ctx).edit()
      .putBoolean("lockActive", active)
      .putLong("lockFrom", fromMs)
      .putLong("lockUntil", untilMs)
      .putStringSet("lockAllowed", allowed.toSet())
      .apply()
  }

  fun unlockFor(ctx: Context, minutes: Double) {
    Prefs.get(ctx).edit().putLong("unlockUntil", System.currentTimeMillis() + (minutes * 60_000).toLong()).apply()
  }

  private var homePkg: String? = null
  private var homeAt = 0L
  private fun launcher(ctx: Context): String? {
    // מתעדכן כל דקה — כי "סדר היום" יכול להפוך למסך הבית
    if (homePkg == null || System.currentTimeMillis() - homeAt > 60_000) {
      homeAt = System.currentTimeMillis()
      homePkg = try {
        ctx.packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0)
          ?.activityInfo?.packageName
      } catch (_: Exception) { null }
    }
    return homePkg
  }

  private fun dialer(ctx: Context): String? = try {
    if (Build.VERSION.SDK_INT >= 23) (ctx.getSystemService(Context.TELECOM_SERVICE) as TelecomManager).defaultDialerPackage else null
  } catch (_: Exception) { null }

  /** חבילות שלעולם לא נחסמות */
  fun alwaysAllowed(ctx: Context, pkg: String): Boolean =
    pkg == ctx.packageName || pkg == "com.android.systemui" || pkg == "android" ||
      pkg in criticalPackages ||
      pkg == launcher(ctx) || pkg == dialer(ctx) ||
      pkg.contains("incallui") || pkg.contains("inputmethod") || pkg.contains("keyboard") ||
      pkg == "com.android.settings" || pkg == "com.google.android.permissioncontroller" ||
      pkg == "com.android.permissioncontroller" || pkg == "com.samsung.android.honeyboard"

  fun shouldBlock(ctx: Context, pkg: String): Boolean {
    val p = Prefs.get(ctx)
    if (!p.getBoolean("lockActive", false)) return false
    val now = System.currentTimeMillis()
    if (now < p.getLong("lockFrom", 0L) || now > p.getLong("lockUntil", 0L)) return false
    if (now < p.getLong("unlockUntil", 0L)) return false
    if (alwaysAllowed(ctx, pkg)) return false
    val allowed = p.getStringSet("lockAllowed", emptySet()) ?: emptySet()
    return allowed.none { a -> pkg == a || (a.endsWith("*") && pkg.startsWith(a.dropLast(1))) }
  }
}
