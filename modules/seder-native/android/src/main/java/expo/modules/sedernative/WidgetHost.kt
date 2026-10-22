package expo.modules.sedernative

import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.content.Context
import android.os.Bundle
import android.util.SizeF
import android.widget.RemoteViews
import android.widget.TextView
import android.graphics.Color
import android.os.Build
import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/** מארח הווידג'טים של סדר היום (אותו מנגנון שבו לאנצ'ר רגיל מציג וידג'טים) */
/** מארח שמציג בתוך הווידג'ט את הסיבה האמיתית כשהוא נכשל בטעינה */
internal class SederHost(ctx: Context) : AppWidgetHost(ctx, WidgetHost.HOST_ID) {
  override fun onCreateView(context: Context, appWidgetId: Int, info: android.appwidget.AppWidgetProviderInfo?): AppWidgetHostView =
    DiagHostView(context)
}

internal class DiagHostView(context: Context) : AppWidgetHostView(context) {
  private var lastError: String? = null

  override fun updateAppWidget(remoteViews: RemoteViews?) {
    lastError = null
    if (remoteViews != null) {
      try { remoteViews.apply(context, this) } catch (e: Throwable) {
        lastError = (e.javaClass.simpleName + ": " + (e.message ?: "")).take(300)
      }
    }
    super.updateAppWidget(remoteViews)
  }

  override fun getErrorView(): View {
    val t = TextView(context)
    t.setTextColor(Color.LTGRAY)
    t.textSize = 11f
    t.setPadding(12, 12, 12, 12)
    t.text = "הווידג'ט נכשל בטעינה" + (lastError?.let { "\n$it" } ?: "")
    return t
  }
}

internal object WidgetHost {
  const val HOST_ID = 4242
  private var host: AppWidgetHost? = null
  private var listening = false

  fun get(ctx: Context): AppWidgetHost {
    val h = host ?: SederHost(ctx.applicationContext).also { host = it }
    return h
  }

  fun start(ctx: Context) {
    try { get(ctx).startListening(); listening = true } catch (_: Exception) {}
  }

  fun stop(ctx: Context) {
    try { if (listening) get(ctx).stopListening(); listening = false } catch (_: Exception) {}
  }
}

/** תצוגה של וידג'ט אחד בתוך מסך React Native */
class WidgetView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  override val shouldUseAndroidLayout = true
  private var hv: AppWidgetHostView? = null
  private var id = -1

  fun setWidget(newId: Int) {
    if (newId == id && hv != null) return
    id = newId
    removeAllViews()
    hv = null
    val info = AppWidgetManager.getInstance(context).getAppWidgetInfo(id) ?: return
    WidgetHost.start(context)
    val v = WidgetHost.get(context).createView(context.applicationContext, id, info)
    v.setPadding(0, 0, 0, 0)
    hv = v
    addView(v, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    requestLayout()
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    val w = r - l
    val h = b - t
    val v = hv ?: return
    v.measure(MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY))
    v.layout(0, 0, w, h)
    if (w <= 0 || h <= 0) return
    val d = resources.displayMetrics.density
    val wd = (w / d).toInt()
    val hd = (h / d).toInt()
    try {
      val o = Bundle()
      if (Build.VERSION.SDK_INT >= 31) o.putParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES, arrayListOf(SizeF(wd.toFloat(), hd.toFloat())))
      v.updateAppWidgetSize(o, wd, hd, wd, hd)
    } catch (_: Exception) {}
  }

  // מאפשר לווידג'ט לקבל לחיצות גם בתוך ScrollView
  override fun onInterceptTouchEvent(ev: android.view.MotionEvent?) = false
}
