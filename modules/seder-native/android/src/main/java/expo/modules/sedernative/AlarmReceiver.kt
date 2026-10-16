package expo.modules.sedernative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action != AlarmScheduler.ACTION_FIRE) return
    AlarmScheduler.ring(ctx)
    // אם מותר — לפתוח את מסך ההשכמה מיד (ואם לא, ההתראה על מסך מלא תפתח אותו)
    try {
      ctx.startActivity(Intent(ctx, AlarmActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {}
  }
}
