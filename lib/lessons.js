// השיעורים של השבוע — מתוך התחנות שמסומנות lesson: true
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey, addDays, DAY_NAMES } from './time';

const KEY = 'lessons_prep_v1';

/** השבוע הנוכחי מהיום ועד שישי. במוצאי שבת — השבוע הבא */
export function weekLessons(settings, today = new Date()) {
  const start = new Date(today); start.setHours(12, 0, 0, 0);
  const dow = start.getDay();
  const from = dow === 6 ? addDays(start, 1) : start;
  const end = addDays(from, 5 - from.getDay());   // עד שישי
  const out = [];
  for (let d = new Date(from); d <= end; d = addDays(d, 1)) {
    const wd = d.getDay();
    for (const st of settings.stations || []) {
      if (!st.lesson || st.enabled === false) continue;
      if (st.days && !st.days.includes(wd)) continue;
      out.push({
        key: `${dateKey(d)}_${st.id}`, date: dateKey(d), wd,
        day: DAY_NAMES[wd], title: st.lessonTitle || st.title, at: st.at || '',
        isToday: dateKey(d) === dateKey(today),
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
