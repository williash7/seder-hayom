package expo.modules.sedernative

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** מסך ההשכמה — מעל מסך הנעילה, עד שלוחצים "קמתי" */
class AlarmActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    val navy = Color.parseColor("#14213D")
    val gold = Color.parseColor("#C9A227")
    val cream = Color.parseColor("#F4EFE6")
    val d = resources.displayMetrics.density
    fun dp(v: Int) = (v * d).toInt()

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(navy)
      setPadding(dp(32), dp(48), dp(32), dp(48))
      layoutDirection = View.LAYOUT_DIRECTION_RTL
    }

    val time = TextView(this).apply {
      text = SimpleDateFormat("HH:mm", Locale.US).format(Date())
      setTextColor(cream)
      textSize = 84f
      typeface = Typeface.create("sans-serif-thin", Typeface.NORMAL)
      gravity = Gravity.CENTER
    }
    val title = TextView(this).apply {
      text = "בוקר טוב ☀️"
      setTextColor(gold)
      textSize = 30f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(0, dp(8), 0, dp(4))
    }
    val sub = TextView(this).apply {
      text = "מודה אני לפניך מלך חי וקיים"
      setTextColor(cream)
      textSize = 20f
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(56))
    }

    fun pill(label: String, bg: Int, fg: Int, onClick: () -> Unit) = Button(this).apply {
      text = label
      setTextColor(fg)
      textSize = 20f
      typeface = Typeface.DEFAULT_BOLD
      isAllCaps = false
      background = GradientDrawable().apply { cornerRadius = dp(40).toFloat(); setColor(bg) }
      setPadding(dp(24), dp(18), dp(24), dp(18))
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        .apply { topMargin = dp(12) }
      setOnClickListener { onClick() }
    }

    val woke = pill("קמתי — מודה אני", gold, navy) {
      AlarmScheduler.stopRinging(this)
      Prefs.get(this).edit().putLong("wokeAt", System.currentTimeMillis()).apply()
      try { startActivity(Prefs.appIntent(this, "sederhayom://woke")) } catch (_: Exception) {}
      finish()
    }
    val snooze = pill("עוד 5 דקות", Color.parseColor("#26345A"), cream) {
      AlarmScheduler.stopRinging(this)
      val p = Prefs.get(this)
      AlarmScheduler.schedule(this, System.currentTimeMillis() + 5 * 60_000L,
        p.getString("alarmTitle", "") ?: "", p.getString("alarmBody", "") ?: "")
      finish()
    }

    root.addView(time); root.addView(title); root.addView(sub); root.addView(woke); root.addView(snooze)
    setContentView(root)
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    // לא סוגרים את השעון בטעות בכפתור חזרה
  }
}
