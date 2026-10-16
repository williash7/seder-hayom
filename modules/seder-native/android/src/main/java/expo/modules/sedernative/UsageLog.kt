package expo.modules.sedernative

import android.content.Context
import android.content.pm.PackageManager
import java.io.File

/** יומן שימוש פשוט: כל מעבר בין אפליקציות נרשם בשורה "זמן<TAB>חבילה" */
internal object UsageLog {
  private const val FILE = "seder_usage_log.txt"
  const val OFF = "__off"

  private fun file(ctx: Context) = File(ctx.filesDir, FILE)

  fun append(ctx: Context, pkg: String) {
    try {
      val f = file(ctx)
      f.appendText("${System.currentTimeMillis()}\t$pkg\n")
      if (f.length() > 400_000) {
        val keep = f.readLines().takeLast(3000)
        f.writeText(keep.joinToString("\n", postfix = "\n"))
      }
    } catch (_: Exception) {}
  }

  fun label(ctx: Context, pkg: String): String = try {
    val pm = ctx.packageManager
    pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
  } catch (_: PackageManager.NameNotFoundException) { pkg } catch (_: Exception) { pkg }

  /** כמה דקות בכל אפליקציה מאז fromMs */
  fun since(ctx: Context, fromMs: Long, ignore: Set<String>): List<Map<String, Any>> {
    val f = file(ctx)
    if (!f.exists()) return emptyList()
    val rows = f.readLines().mapNotNull { line ->
      val i = line.indexOf('\t')
      if (i <= 0) null else line.substring(0, i).toLongOrNull()?.let { it to line.substring(i + 1) }
    }
    val totals = HashMap<String, Long>()
    val opens = HashMap<String, Int>()
    val now = System.currentTimeMillis()
    for (k in rows.indices) {
      val (ts, pkg) = rows[k]
      val end = if (k + 1 < rows.size) rows[k + 1].first else now
      if (end < fromMs || pkg == OFF || ignore.contains(pkg)) continue
      val start = maxOf(ts, fromMs)
      val dur = minOf(end - start, 60 * 60_000L) // מעל שעה ברצף — כנראה המסך כבה בלי שנרשם
      if (dur <= 0) continue
      totals[pkg] = (totals[pkg] ?: 0L) + dur
      if (ts >= fromMs) opens[pkg] = (opens[pkg] ?: 0) + 1
    }
    return totals.entries.sortedByDescending { it.value }.map {
      mapOf(
        "pkg" to it.key,
        "label" to label(ctx, it.key),
        "minutes" to (it.value / 60_000.0),
        "opens" to (opens[it.key] ?: 0)
      )
    }
  }
}
