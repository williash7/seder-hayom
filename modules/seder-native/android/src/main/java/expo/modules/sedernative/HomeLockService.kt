package expo.modules.sedernative

import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.view.accessibility.AccessibilityEvent

/**
 * שירות נגישות: רושם איזו אפליקציה פתוחה, ובזמן בית מחזיר לסדר היום
 * כשנפתחת אפליקציה שלא אושרה.
 */
class HomeLockService : AccessibilityService() {
  private var lastPkg: String? = null

  private val screenRx = object : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
      when (i.action) {
        Intent.ACTION_SCREEN_OFF -> { UsageLog.append(c, UsageLog.OFF); lastPkg = null }
        Intent.ACTION_USER_PRESENT -> lastPkg = null
      }
    }
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    val f = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_OFF)
      addAction(Intent.ACTION_USER_PRESENT)
    }
    try {
      if (Build.VERSION.SDK_INT >= 33) registerReceiver(screenRx, f, Context.RECEIVER_EXPORTED)
      else registerReceiver(screenRx, f)
    } catch (_: Exception) {}
  }

  override fun onAccessibilityEvent(e: AccessibilityEvent?) {
    if (e == null || e.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = e.packageName?.toString() ?: return
    if (pkg == lastPkg || pkg == "com.android.systemui") return
    if (pkg.contains("inputmethod") || pkg.contains("keyboard") || pkg == "com.samsung.android.honeyboard") return
    lastPkg = pkg
    UsageLog.append(this, pkg)

    if (LockState.shouldBlock(this, pkg)) {
      Prefs.get(this).edit().putString("blockedPkg", pkg).putLong("blockedAt", System.currentTimeMillis()).apply()
      try { startActivity(Prefs.appIntent(this, "sederhayom://blocked?pkg=$pkg")) } catch (_: Exception) {}
    }
  }

  override fun onInterrupt() {}

  override fun onDestroy() {
    try { unregisterReceiver(screenRx) } catch (_: Exception) {}
    super.onDestroy()
  }
}
