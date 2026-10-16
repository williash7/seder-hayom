// זיהוי הגעה: גדר וירטואלית סביב כל יעד בנסיעה הנוכחית.
// כשנכנסים לגדר (גם כשהאפליקציה ברקע) — נרשמת הגעה ונשלחת התראה.
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GEO_TASK = 'seder-arrival';
const ARR = 'geo_arrivals_v1';
const COORDS = 'geo_coords_v1';
const NAMES = 'geo_names_v1';

// חייב לרוץ בטעינת הקוד (גם כשהמערכת מעירה את האפליקציה ברקע)
try {
  TaskManager.defineTask(GEO_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const { eventType, region } = data;
    if (eventType !== Location.GeofencingEventType.Enter || !region?.identifier) return;
    try {
      const list = JSON.parse(await AsyncStorage.getItem(ARR) || '[]');
      list.push({ id: region.identifier, at: Date.now() });
      await AsyncStorage.setItem(ARR, JSON.stringify(list.slice(-30)));
      const names = JSON.parse(await AsyncStorage.getItem(NAMES) || '{}');
      await Notifications.scheduleNotificationAsync({
        content: { title: `הגעת: ${names[region.identifier] || ''}`.trim(), body: 'התחנה התקדמה לבד', data: { kind: 'arrival' } },
        trigger: null,
      });
    } catch {}
  });
} catch {}

async function coordsFor(placeId, place) {
  const cache = JSON.parse(await AsyncStorage.getItem(COORDS) || '{}');
  const key = placeId + '|' + (place.address || '');
  if (cache[key]) return cache[key];
  const a = String(place.address || '').trim();
  if (!a) return null;
  const ll = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/.exec(a);
  let c = null;
  if (ll) c = { latitude: +ll[1], longitude: +ll[3] };
  else {
    const r = await Location.geocodeAsync(a.includes('עפולה') ? a : a + ', עפולה');
    if (r?.[0]) c = { latitude: r[0].latitude, longitude: r[0].longitude };
  }
  if (c) { cache[key] = c; await AsyncStorage.setItem(COORDS, JSON.stringify(cache)); }
  return c;
}

export async function geoPermissionState() {
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    return { foreground: fg.granted, background: bg.granted };
  } catch { return { foreground: false, background: false }; }
}

export async function askGeoPermission() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted;
}

/** מתחיל לשמור על היעדים שנשארו בנסיעה הנוכחית */
export async function watchLegs(station, fromLeg, places) {
  try {
    const { background } = await geoPermissionState();
    if (!background) return false;
    const regions = [], names = {};
    for (let i = fromLeg; i < (station.legs || []).length; i++) {
      const id = station.legs[i];
      const c = await coordsFor(id, places[id] || {});
      if (!c) continue;
      const identifier = `${station.id}|${i}`;
      names[identifier] = places[id]?.name || id;
      regions.push({ identifier, ...c, radius: 150, notifyOnEnter: true, notifyOnExit: false });
    }
    await AsyncStorage.setItem(NAMES, JSON.stringify(names));
    if (!regions.length) { await stopWatching(); return false; }
    await Location.startGeofencingAsync(GEO_TASK, regions);
    return true;
  } catch (e) { console.warn('geo', e); return false; }
}

export async function stopWatching() {
  try { if (await Location.hasStartedGeofencingAsync(GEO_TASK)) await Location.stopGeofencingAsync(GEO_TASK); } catch {}
}

/** מחזיר ומנקה את ההגעות שנרשמו ברקע */
export async function takeArrivals() {
  try {
    const list = JSON.parse(await AsyncStorage.getItem(ARR) || '[]');
    if (list.length) await AsyncStorage.setItem(ARR, '[]');
    return list;
  } catch { return []; }
}
