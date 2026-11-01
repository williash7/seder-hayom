// השיעורים של השבוע — מתוך התחנות שמסומנות lesson: true
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey, addDays, DAY_NAMES } from './time';
import { stationsForDay } from './engine';
import { loadDay } from './store';

const KEY = 'lessons_prep_v1';

/** השבוע הנוכחי מהיום ועד שישי. במוצאי שבת — השבוע הבא */
export function weekLessons(settings, today = new Date(), states = {}) {
  const start = new Date(today); start.setHours(12, 0, 0, 0);
  const dow = start.getDay();
  const from = dow === 6 ? addDays(start, 1) : start;
  const end = addDays(from, 5 - from.getDay());   // עד שישי
  const out = [];
  for (let d = new Date(from); d <= end; d = addDays(d, 1)) {
    const wd = d.getDay();
    const key = dateKey(d);
    const state = states[key] || {};
    // Same daily station resolver used by the planner: includes trip replacements,
    // one-day overrides, disabled lessons and ad-hoc additions.
    const stations = stationsForDay(settings, d, state);
    for (const st of stations) {
      if (!st.lesson || st.enabled === false) continue;
      if (state.stations?.[st.id]?.status === 'skipped') continue;
      out.push({
        key: `${key}_${st.id}`, date: key, wd,
        day: DAY_NAMES[wd], title: st.lessonTitle || st.title,
        at: st.atByDay?.[wd] || st.at || '',
        isToday: key === dateKey(today),
      });
    }
  }
  return out.sort((a, b) => (a.date + a.at).localeCompare(b.date + b.at));
}

export async function loadPrep() {
  try { return JSON.parse(await AsyncStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
export async function savePrep(p) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

/** Load persisted daily exceptions for the remaining week, without altering them. */
export async function loadWeekStates(today = new Date()) {
  const start = new Date(today); start.setHours(12, 0, 0, 0);
  const from = start.getDay() === 6 ? addDays(start, 1) : start;
  const end = addDays(from, 5 - from.getDay());
  const days = [];
  for (let d = new Date(from); d <= end; d = addDays(d, 1)) days.push(dateKey(d));
  const loaded = await Promise.all(days.map(async k => [k, await loadDay(k)]));
  return Object.fromEntries(loaded);
}
