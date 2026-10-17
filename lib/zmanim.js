// זמני היום ושבת לעפולה — מ-hebcal, עם שמירה מקומית למקרה שאין רשת
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey } from './time';

const BASE = 'https://www.hebcal.com';
const LAT = 32.6091, LON = 35.2892;
const CANDLE_MIN = 30; // הדלקת נרות — חצי שעה לפני השקיעה

async function fetchT(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => { try { ctrl.abort(); } catch {} }, ms);
  try { return await fetch(url, { signal: ctrl.signal }); } finally { clearTimeout(t); }
}

async function cached(key, ttlMs, fn) {
  let old = null;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      old = JSON.parse(raw);
      if (Date.now() - old.ts < ttlMs) return old.data;
    }
  } catch {}
  try {
    const data = await fn();
    if (data) await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    return data;
  } catch {
    return old?.data ?? null;
  }
}

// "2026-10-16T17:46:00+03:00" → "17:46" בשעון הטלפון (שנמצא בישראל)
const hm = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(11, 16) || null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const minus = (t, m) => { const [h, mm] = t.split(':').map(Number); const v = h * 60 + mm - m; return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };

/** { alot, sunrise, sofZmanShma, sofZmanTfilla, chatzot, minchaGedola, plag, sunset, tzeit, candles?, havdala?, parasha? } */
export async function getZmanim(date = new Date()) {
  const dk = dateKey(date);
  const z = await cached('z_' + dk, 7 * 864e5, async () => {
    const r = await fetchT(`${BASE}/zmanim?cfg=json&latitude=${LAT}&longitude=${LON}&tzid=Asia%2FJerusalem&date=${dk}`);
    const t = (await r.json()).times || {};
    return {
      alot: hm(t.alotHaShachar), sunrise: hm(t.sunrise),
      sofZmanShma: hm(t.sofZmanShma), sofZmanTfilla: hm(t.sofZmanTfilla),
      chatzot: hm(t.chatzot), minchaGedola: hm(t.minchaGedola), plag: hm(t.plagHaMincha),
      sunset: hm(t.sunset), tzeit: hm(t.tzeit7083deg || t.tzeit85deg || t.tzeit42min),
    };
  }) || {};

  // שישי/שבת — הדלקת נרות והבדלה
  const dow = date.getDay();
  if (dow === 5 || dow === 6) {
    const fri = new Date(date); if (dow === 6) fri.setDate(fri.getDate() - 1);
    const s = await getShabbat(fri);
    if (s) Object.keys(s).forEach(k => { if (s[k]) z[k] = s[k]; });
    // גיבוי: אם לא התקבלה הדלקת נרות — CANDLE_MIN דקות לפני השקיעה
    if (dow === 5 && !z.candles && z.sunset) z.candles = minus(z.sunset, CANDLE_MIN);
    // גיבוי להבדלה: צאת הכוכבים, ואם אין — 40 דקות אחרי השקיעה
    if (dow === 6 && !z.havdala) z.havdala = z.tzeit || (z.sunset ? minus(z.sunset, -40) : null);
  }
  return z;
}

/** זמני השבת של יום שישי נתון */
export async function getShabbat(friday) {
  const dk = dateKey(friday);
  return cached('shab4_' + dk, 7 * 864e5, async () => {
    const r = await fetchT(`${BASE}/shabbat?cfg=json&geo=pos&latitude=${LAT}&longitude=${LON}&tzid=Asia%2FJerusalem&b=${CANDLE_MIN}&M=on&gy=${friday.getFullYear()}&gm=${friday.getMonth() + 1}&gd=${friday.getDate()}`);
    const items = (await r.json()).items || [];
    const c = items.find(i => i.category === 'candles');
    const h = items.find(i => i.category === 'havdalah');
    return {
      candles: hm(c?.date), havdala: hm(h?.date),
      parasha: items.find(i => i.category === 'parashat')?.hebrew || null,
    };
  });
}

/** תאריך עברי */
export async function getHebrewDate(date = new Date()) {
  const dk = dateKey(date);
  return cached('hd_' + dk, 30 * 864e5, async () => {
    const r = await fetchT(`${BASE}/converter?cfg=json&gy=${date.getFullYear()}&gm=${date.getMonth() + 1}&gd=${date.getDate()}&g2h=1`);
    const j = await r.json();
    return j.hebrew || null;
  });
}
