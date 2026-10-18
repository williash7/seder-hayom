// מצב האפליקציה — הגדרות, מצב היום, משימות, רשימת התרמה, יומן זמן בית
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from './defaults';
import { dateKey, addDays } from './time';

const K = {
  settings: 'settings_v1',
  day: k => 'day_' + k,
  tasks: 'tasks_v1',
  calls: 'calls_v1',
  homelog: k => 'homelog_' + k,
};

async function getJSON(key, fallback) {
  try { const r = await AsyncStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
async function setJSON(key, val) {
  try { await AsyncStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── הגדרות ──
export async function loadSettings() {
  const saved = await getJSON(K.settings, null);
  if (!saved) return DEFAULT_SETTINGS;
  const merged = { ...DEFAULT_SETTINGS, ...saved };
  // שדות מקוננים — מוסיפים מפתחות חדשים שנוספו בגרסאות חדשות
  for (const k of ['places', 'minyanim', 'minyanimByDay', 'prayerMinutes', 'apps', 'lists', 'texts', 'alarm', 'dayClose', 'homeTime', 'calls', 'crm', 'nightLock', 'sandwichMenu']) {
    merged[k] = { ...DEFAULT_SETTINGS[k], ...(saved[k] || {}) };
  }
  // תחנות: אם יצאה גרסת תבנית חדשה — מוסיפים תחנות חדשות במקומן
  if ((saved.version || 0) < DEFAULT_SETTINGS.version || !Array.isArray(saved.stations)) {
    merged.stations = DEFAULT_SETTINGS.stations;
    merged.version = DEFAULT_SETTINGS.version;
  }
  return merged;
}
export const saveSettings = s => setJSON(K.settings, s);
export const resetSettings = () => AsyncStorage.removeItem(K.settings);

// ── היום הפעיל ──
// אחרי חצות ועד 03:00, אם אתמול לא נסגר — עדיין "אתמול"
export async function activeDate(now = new Date()) {
  if (now.getHours() < 3) {
    const y = addDays(now, -1);
    const st = await getJSON(K.day(dateKey(y)), null);
    if (st && !st.closed && Object.keys(st.stations || {}).length) return y;
  }
  return now;
}

export const loadDay = k => getJSON(K.day(k), { stations: {}, choices: {} });
export const saveDay = (k, s) => setJSON(K.day(k), s);

// ── משימות ──
export const loadTasks = () => getJSON(K.tasks, []);
export const saveTasks = t => setJSON(K.tasks, t);

// ── רשימת התרמה / טלפונים ──
export const loadCalls = () => getJSON(K.calls, []);
export const saveCalls = c => setJSON(K.calls, c);

// ── יומן זמן בית ──
export const loadHomeLog = k => getJSON(K.homelog(k), []);
export const saveHomeLog = (k, l) => setJSON(K.homelog(k), l);
