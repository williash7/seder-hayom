package expo.modules.sedernative

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build

internal object AlarmScheduler {
  const val ACTION_FIRE = "expo.modules.sedernative.ALARM_FIRE"
  const val CHANNEL = "seder_alarm_full"
  const val NOTIF_ID = 4711

  private fun flags() = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

  private fun firePending(ctx: Context): PendingIntent =
    PendingIntent.getBroadcast(ctx, 10, Intent(ctx, AlarmReceiver::class.java).setAction(ACTION_FIRE), flags())

  fun schedule(ctx: Context, atMs: Long, title: String, body: String) {
    Prefs.get(ctx).edit()
      .putLong("alarmAt", atMs).putString("alarmTitle", title).putString("alarmBody", body)
      .apply()
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = firePending(ctx)
    if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pi)
    } else {
      val show = PendingIntent.getActivity(ctx, 11, Prefs.appIntent(ctx, null), flags())
      am.setAlarmClock(AlarmManager.AlarmClockInfo(atMs, show), pi)
    }
  }

  fun cancel(ctx: Context) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(firePending(ctx))
    Prefs.get(ctx).edit().remove("alarmAt").apply()
  }

  fun canExact(ctx: Context): Boolean {
    if (Build.VERSION.SDK_INT < 31) return true
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return am.canScheduleExactAlarms()
  }

  private fun ensureChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT < 26) return
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL) != null) return
    val ch = NotificationChannel(CHANNEL, "שעון מעורר — מסך מלא", NotificationManager.IMPORTANCE_HIGH)
    ch.setSound(
      RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
    )
    ch.enableVibration(true)
    ch.vibrationPattern = longArrayOf(0, 800, 500, 800, 500, 800)
    ch.setBypassDnd(true)
    ch.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    nm.createNotificationChannel(ch)
  }

  /** מציג את ההשכמה: התראה על מסך מלא שמצלצלת שוב ושוב עד שלוחצים */
  fun ring(ctx: Context) {
    ensureChannel(ctx)
    val p = Prefs.get(ctx)
    val title = p.getString("alarmTitle", null) ?: "בוקר טוב — מודה אני"
    val body = p.getString("alarmBody", null) ?: "לחץ \"קמתי\" כדי להתחיל את היום"
    val full = PendingIntent.getActivity(
      ctx, 12,
      Intent(ctx, AlarmActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION),
      flags()
    )
    @Suppress("DEPRECATION")
    val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(ctx, CHANNEL) else Notification.Builder(ctx)
    b.setSmallIcon(Prefs.smallIcon(ctx))
      .setContentTitle(title)
      .setContentText(body)
      .setCategory(Notification.CATEGORY_ALARM)
      .setFullScreenIntent(full, true)
      .setContentIntent(full)
      .setOngoing(true)
      .setAutoCancel(false)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
    if (Build.VERSION.SDK_INT < 26) {
      @Suppress("DEPRECATION")
      b.setPriority(Notification.PRIORITY_MAX)
        .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
    }
    val n = b.build()
    n.flags = n.flags or Notification.FLAG_INSISTENT
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.notify(NOTIF_ID, n)
    p.edit().putBoolean("ringing", true).remove("alarmAt").apply()
  }

  fun stopRinging(ctx: Context) {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.cancel(NOTIF_ID)
    Prefs.get(ctx).edit().putBoolean("ringing", false).apply()
  }
}
