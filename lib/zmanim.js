// זמני חב״ד לפי המיקום הנוכחי (או אזור הזמן, אם לא ניתנה הרשאת GPS).
// החישוב האסטרונומי עובד גם ללא רשת; נתוני הפרשה ושבת נטענים לפי המיקום.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { dateKey } from './time';
import { computeZmanim } from './sun';
import { deviceTimeZone, fallbackZmanimPlace, placeFromPosition } from './zmanimLocation';

const BASE = 'https://www.hebcal.com';
let lastLocation = null;
let pendingLocation = null;

async function detectedLocation() {
  const zone = deviceTimeZone();
  if (lastLocation && lastLocation.zone === zone && Date.now() - lastLocation.at < 10 * 60000)
    return lastLocation.place;
  if (pendingLocation) return pendingLocation;
  pendingLocation = (async () => {
    let place = null;
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) {
        let point = await Location.getLastKnownPositionAsync({
          maxAge: 2 * 60 * 60000, requiredAccuracy: 20000,
        });
        if (!point || Date.now() - (point.timestamp || 0) > 2 * 60 * 60000) {
          // לא דורשים המתנה ממושכת לשירות המיקום בשעה שהאפליקציה נפתחת.
          point = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
            new Promise(resolve => setTimeout(() => resolve(null), 4000)),
          ]);
        }
        if (point && (!point.coords.accuracy || point.coords.accuracy <= 20000)) {
          place = placeFromPosition(point.coords, zone);
        }
      }
    } catch {}
    place = place || fallbackZmanimPlace(zone);
    lastLocation = { zone, at: Date.now(), place };
    return place;
  })();
  try { return await pendingLocation; }
  finally { pendingLocation = null; }
}

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
  } catch { return old?.data ?? null; }
}
const hm = (iso, timeZone) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(11, 16) || null;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d);
    return parts.find(p => p.type === 'hour').value + ':' +
      parts.find(p => p.type === 'minute').value;
  } catch {
    return String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  }
};
const minus = (t, m) => {
  if (!t) return null;
  const [h, mm] = t.split(':').map(Number);
  const v = (h * 60 + mm - m + 1440) % 1440;
  return String(Math.floor(v / 60)).padStart(2, '0') + ':' +
    String(v % 60).padStart(2, '0');
};

/** תמיד לפי השמש במיקום המקומי, ולא לפי קואורדינטות עפולה כאשר נמצאים בחו״ל. */
export async function getZmanim(date = new Date()) {
  const place = await detectedLocation();
  if (!place) return { locationLabel: 'מיקום לא זוהה · אפשר לאפשר גישה למיקום בהגדרות', unknownLocation: true };
  const z = computeZmanim(date, place.latitude, place.longitude, place.timeZone);
  z.locationLabel = place.label;
  z.locationSource = place.source;
  z.locationTimeZone = place.timeZone;
  const dow = date.getDay();
  if (dow === 5 || dow === 6) {
    const fri = new Date(date);
    if (dow === 6) fri.setDate(fri.getDate() - 1);
    const zf = dow === 5 ? z : computeZmanim(fri, place.latitude, place.longitude, place.timeZone);
    z.candles = minus(zf.sunset, place.candleMinutes);
    if (dow === 6) z.havdala = z.shabbatEnd || z.tzeit;
    try {
      const shabbat = await getShabbat(fri, place);
      if (shabbat?.parasha) z.parasha = shabbat.parasha;
    } catch {}
  }
  return z;
}

/** זמני שבת במיקום הנוכחי; מטמון מופרד לפי עיר כדי לא לערבב עפולה וניו יורק. */
export async function getShabbat(friday, suppliedPlace = null) {
  const place = suppliedPlace || await detectedLocation();
  if (!place) return null;
  const key = 'shab5_' + dateKey(friday) + '_' +
    Math.round(place.latitude * 100) + '_' + Math.round(place.longitude * 100) +
    '_' + place.candleMinutes + '_' + place.timeZone;
  return cached(key, 7 * 864e5, async () => {
    const url = BASE + '/shabbat?cfg=json&geo=pos&latitude=' + place.latitude +
      '&longitude=' + place.longitude + '&tzid=' + encodeURIComponent(place.timeZone) +
      '&b=' + place.candleMinutes + '&M=on&gy=' + friday.getFullYear() +
      '&gm=' + (friday.getMonth() + 1) + '&gd=' + friday.getDate();
    const r = await fetchT(url);
    const items = (await r.json()).items || [];
    const c = items.find(i => i.category === 'candles');
    const h = items.find(i => i.category === 'havdalah');
    return {
      candles: hm(c?.date, place.timeZone),
      havdala: hm(h?.date, place.timeZone),
      parasha: items.find(i => i.category === 'parashat')?.hebrew || null,
    };
  });
}

/** תאריך עברי — אינו תלוי במיקום עבור התאריך האזרחי שנבחר. */
export async function getHebrewDate(date = new Date()) {
  const dk = dateKey(date);
  return cached('hd_' + dk, 30 * 864e5, async () => {
    const r = await fetchT(BASE + '/converter?cfg=json&gy=' + date.getFullYear() +
      '&gm=' + (date.getMonth() + 1) + '&gd=' + date.getDate() + '&g2h=1');
    const j = await r.json();
    return j.hebrew || null;
  });
}
