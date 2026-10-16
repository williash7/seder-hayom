package expo.modules.sedernative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** אחרי הפעלה מחדש של הטלפון — מחזיר את השעון המעורר */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    val p = Prefs.get(ctx)
    val at = p.getLong("alarmAt", 0L)
    if (at > System.currentTimeMillis()) {
      AlarmScheduler.schedule(ctx, at, p.getString("alarmTitle", "") ?: "", p.getString("alarmBody", "") ?: "")
    }
  }
}
