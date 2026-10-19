// לומד כמה זמן לוקחות תחנות פתוחות (כמו השכבת הילדים) — ממוצע של 7 הפעמים האחרונות
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'learned_durations_v1';

export async function loadLearned() {
  try { return JSON.parse(await AsyncStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export async function recordDuration(key, minutes) {
  if (!(minutes > 0) || minutes > 240) return null;
  const all = await loadLearned();
  all[key] = [...(all[key] || []), Math.round(minutes)].slice(-7);
  try { await AsyncStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  return all;
}

/** כמה מדידות בבת אחת: [[מפתח, דקות], …] */
export async function recordMany(entries) {
  const ok = entries.filter(([, m]) => m > 0.2 && m <= 240);
  if (!ok.length) return null;
  const all = await loadLearned();
  for (const [k, m] of ok) all[k] = [...(all[k] || []), Math.round(m * 10) / 10].slice(-7);
  try { await AsyncStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  return all;
}

// תחנות שהמשך שלהן נלמד אוטומטית (בלי שעה קבועה ובלי "ממלא")
export const AUTO_LEARN = ['note', 'app', 'text', 'supplies', 'checklist', 'timer', 'camera'];
const learnable = s => AUTO_LEARN.includes(s.type) && !s.at && !s.atZman && !s.arriveBy && !s.endByZman && !s.fill && !s.lesson;
const MIN_SAMPLES = 2;
const avg1 = list => (list?.length >= MIN_SAMPLES ? Math.max(1, Math.round(list.reduce((a, b) => a + b, 0) / list.length)) : null);

export const avg = list => (list?.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null);

/** מחליף את משך התחנות הלומדות בממוצע שנלמד */
export function applyLearned(settings, learned) {
  if (!learned || !Object.keys(learned).length) return settings;
  // זמני נסיעה לכל מקום — לפי הנסיעות האחרונות
  const places = { ...(settings.places || {}) };
  for (const id of Object.keys(places)) {
    const a = avg1(learned[`place:${id}`]);
    if (a) places[id] = { ...places[id], minutes: a, plannedMinutes: places[id].minutes };
  }
  return {
    ...settings,
    places,
    stations: (settings.stations || []).map(s => {
      if (s.learn) {
        const a = avg(learned[s.learnKey || s.id]);
        return a ? { ...s, minutes: a, learnedFrom: learned[s.learnKey || s.id].length } : s;
      }
      let st = s;
      // כל שלב בשגרה — לפי כמה שהוא לקח בפועל בימים האחרונים
      if (Array.isArray(s.steps)) {
        let changed = false;
        const steps = s.steps.map(x => {
          const a = avg1(learned[`${s.id}:${x.id}`]);
          if (a == null || a === x.minutes) return x;
          changed = true; return { ...x, minutes: a, planned: x.minutes };
        });
        if (changed) st = { ...st, steps };
      }
      if (s.menu) { const a = avg1(learned[`${s.id}:menu`]); if (a) st = { ...st, perItem: a }; }
      if (learnable(s)) { const a = avg1(learned[s.id]); if (a) st = { ...st, minutes: a, learnedFrom: learned[s.id].length }; }
      return st;
    }),
  };
}
