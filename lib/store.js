// מצב האפליקציה — הגדרות, מצב היום, משימות, רשימת התרמה, יומן זמן בית
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, STATION_PATCHES } from './defaults';
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
  for (const k of ['places', 'minyanim', 'minyanimByDay', 'prayerMinutes', 'apps', 'lists', 'texts', 'alarm', 'dayClose', 'homeTime', 'calls', 'crm', 'nightLock', 'launcher', 'sandwichMenu', 'suppliesByDay']) {
    merged[k] = { ...DEFAULT_SETTINGS[k], ...(saved[k] || {}) };
  }
  if (!Array.isArray(saved.suppliesExtra)) merged.suppliesExtra = DEFAULT_SETTINGS.suppliesExtra;
  // תחנות: אם יצאה גרסת תבנית חדשה — מוסיפים תחנות חדשות במקומן
  const sv = saved.version || 0;
  // מגרסה 21 והלאה: רק מעדכנים שדות בתחנות הקיימות (שינויים שעשיתי בהגדרות נשמרים)
  if (sv >= 21 && sv < DEFAULT_SETTINGS.version && Array.isArray(saved.stations)) {
    let st = saved.stations;
    for (let v = sv + 1; v <= DEFAULT_SETTINGS.version; v++) {
      const p = STATION_PATCHES[v] || {};
      st = st.map(x => p[x.id] ? { ...x, ...p[x.id] } : x);
      // תחנות חדשות שנוספו בגרסה — במקומן
      for (const d of DEFAULT_SETTINGS.stations) {
        if (!st.some(x => x.id === d.id)) {
          const i = DEFAULT_SETTINGS.stations.indexOf(d);
          const prevId = DEFAULT_SETTINGS.stations[i - 1]?.id;
          const at = st.findIndex(x => x.id === prevId);
          st = [...st.slice(0, at + 1), d, ...st.slice(at + 1)];
        }
      }
    }
    merged.stations = st;
    merged.version = DEFAULT_SETTINGS.version;
  } else if (sv < DEFAULT_SETTINGS.version || !Array.isArray(saved.stations)) {
    merged.stations = DEFAULT_SETTINGS.stations;
    if ((saved.version || 0) < 14) merged.sandwichMenu = DEFAULT_SETTINGS.sandwichMenu;
    if ((saved.version || 0) < 15) merged.suppliesByDay = DEFAULT_SETTINGS.suppliesByDay;
    if ((saved.version || 0) < 16) {
      merged.minyanim = { ...merged.minyanim, shacharit: DEFAULT_SETTINGS.minyanim.shacharit };
      merged.minyanimByDay = DEFAULT_SETTINGS.minyanimByDay;
      merged.prayerMinutes = { ...merged.prayerMinutes, shacharit: DEFAULT_SETTINGS.prayerMinutes.shacharit };
    }
    if ((saved.version || 0) < 19 && merged.places?.gan?.address === 'גן בוגרים חב"ד עפולה') {
      merged.places = { ...merged.places, gan: { ...merged.places.gan, address: DEFAULT_SETTINGS.places.gan.address } };
    }
    if ((saved.version || 0) < 20 && merged.apps?.whatsapp?.pkg === 'com.whatsapp') {
      merged.apps = { ...merged.apps, whatsapp: { ...merged.apps.whatsapp, ...DEFAULT_SETTINGS.apps.whatsapp } };
    }
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

// ── מתי נעשתה בפועל תחנה מחזורית (כביסה): { laundry: { last, prev } } ──
const CAD = 'cadence_v1';
// התחלה: הכביסה האחרונה לפני 17.10 — כך מה שלא נעשה מאז מופיע היום
const CAD_SEED = { laundry: { last: '2026-10-14' } };
export const loadCadence = () => getJSON(CAD, CAD_SEED);
export const saveCadence = c => setJSON(CAD, c);
