package expo.modules.sedernative

import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.content.Context
import android.os.Bundle
import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/** מארח הווידג'טים של סדר היום (אותו מנגנון שבו לאנצ'ר רגיל מציג וידג'טים) */
internal object WidgetHost {
  const val HOST_ID = 4242
  private var host: AppWidgetHost? = null
  private var listening = false

  fun get(ctx: Context): AppWidgetHost {
    val h = host ?: AppWidgetHost(ctx.applicationContext, HOST_ID).also { host = it }
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
    val v = WidgetHost.get(context).createView(context, id, info)
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
    val d = resources.displayMetrics.density
    val wd = (w / d).toInt()
    val hd = (h / d).toInt()
    try { v.updateAppWidgetSize(Bundle(), wd, hd, wd, hd) } catch (_: Exception) {}
  }

  // מאפשר לווידג'ט לקבל לחיצות גם בתוך ScrollView
  override fun onInterceptTouchEvent(ev: android.view.MotionEvent?) = false
}
