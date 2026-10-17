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

export const avg = list => (list?.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null);

/** מחליף את משך התחנות הלומדות בממוצע שנלמד */
export function applyLearned(settings, learned) {
  if (!learned || !Object.keys(learned).length) return settings;
  return {
    ...settings,
    stations: (settings.stations || []).map(s => {
      if (!s.learn) return s;
      const a = avg(learned[s.learnKey || s.id]);
      return a ? { ...s, minutes: a, learnedFrom: learned[s.learnKey || s.id].length } : s;
    }),
  };
}
