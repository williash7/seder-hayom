package expo.modules.sedernative

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri

internal object Prefs {
  fun get(ctx: Context): SharedPreferences =
    ctx.getSharedPreferences("seder_native", Context.MODE_PRIVATE)

  /** פותח את המסך הראשי של האפליקציה עם קישור פנימי (sederhayom://...) */
  fun appIntent(ctx: Context, uri: String?): Intent {
    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: Intent()
    val i = Intent(Intent.ACTION_VIEW)
    launch.component?.let { i.component = it }
    if (uri != null) i.data = Uri.parse(uri)
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return i
  }

  fun smallIcon(ctx: Context): Int {
    val id = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
    return if (id != 0) id else ctx.applicationInfo.icon
  }
}
