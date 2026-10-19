// הקדמה הדרגתית של השינה וההשכמה: מהמצוי לרצוי (ברירת מחדל 23:30–06:30).
// כל יום מתכננים קצת לפני הממוצע של הימים האחרונים — ולא לפני היעד.
import { toMin } from './time';
import * as S from './store';
import { dateKey, addDays } from './time';

const r5 = m => Math.round(m / 5) * 5;
const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const mean = l => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);

/** היסטוריה של 7 הימים האחרונים: [{ date, wake, sleep }] (דקות מחצות; שינה אחרי חצות > 1440) */
export async function loadSleepHistory(today = new Date()) {
  const out = [];
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, -i), k = dateKey(d);
    const day = await S.loadDay(k);
    const st = day?.stations || {};
    const wake = st.wake?.status === 'done' ? (st.wake.end ?? st.wake.start) : null;
    const sl = st.sleep?.status === 'done' ? (st.sleep.end ?? st.sleep.start) : null;
    // שינה לפני 12:00 בצהריים = אחרי חצות
    const sleep = sl == null ? null : sl < 720 ? sl + 1440 : sl;
    if (wake != null || sleep != null) out.push({ date: k, wake, sleep });
  }
  return out;
}

/** התכנית להיום: { wake, sleep, actualWake, actualSleep, goal } — שעות "HH:MM" (שינה עד "25:30") */
export function sleepPlan(settings, history) {
  const g = settings.sleepGoal || {};
  const goalWake = toMin(g.wake || '06:30'), goalSleep = toMin(g.sleep || '23:30');
  const step = Number(g.step) || 10;
  const wakes = history.map(h => h.wake).filter(x => x != null && x > 240 && x < 720);
  const sleeps = history.map(h => h.sleep).filter(x => x != null && x > 1200 && x < 1680);
  const aw = wakes.length >= 2 ? mean(wakes) : null;
  const as = sleeps.length >= 2 ? mean(sleeps) : null;
  const wake = aw != null ? Math.max(goalWake, r5(aw - step)) : toMin(settings.wakeTime) ?? goalWake;
  const sleep = as != null ? Math.max(goalSleep, r5(as - step)) : toMin(settings.dayClose?.hardClose || '23:45');
  return {
    wake: hhmm(wake), sleep: hhmm(sleep),
    actualWake: aw != null ? hhmm(r5(aw)) : null, actualSleep: as != null ? hhmm(r5(as)) : null,
    goal: { wake: hhmm(goalWake), sleep: hhmm(goalSleep) }, days: Math.max(wakes.length, sleeps.length),
  };
}

/** מחיל את התכנית על ההגדרות: שעת השכמה, וסגירת היום/נעילת הלילה */
export function applySleepPlan(settings, plan) {
  if (!plan || settings.sleepGoal?.off) return settings;
  const hc = toMin(plan.sleep);
  return {
    ...settings,
    wakeTime: plan.wake,
    dayClose: { ...(settings.dayClose || {}), hardClose: plan.sleep, firstReminder: hhmm(hc - 60) },
  };
}
