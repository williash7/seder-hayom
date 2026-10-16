// פתיחת אפליקציות חיצוניות: וויז, מצלמה, אפליקציות אחרות, חיוג
import { Linking, Share } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export function wazeUrl(place) {
  const a = String(place?.address || '').trim();
  if (!a) return null;
  const ll = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/.exec(a);
  return ll
    ? `https://waze.com/ul?ll=${ll[1]},${ll[3]}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(a)}&navigate=yes`;
}

export async function openWaze(place) {
  const url = wazeUrl(place);
  if (!url) throw new Error('אין כתובת למקום הזה — אפשר להוסיף בהגדרות ← מקומות');
  await Linking.openURL(url);
}

export async function openApp(app) {
  if (!app) throw new Error('האפליקציה לא הוגדרה');
  if (app.pkg) {
    try { await IntentLauncher.openApplication(app.pkg); return; }
    catch (e) { if (!app.url) throw new Error(`לא הצלחתי לפתוח את ${app.name} — האם היא מותקנת?`); }
  }
  if (app.url) { await Linking.openURL(app.url); return; }
  throw new Error(`לא הוגדר קישור או חבילה ל${app.name} — הגדרות ← אפליקציות`);
}

/** פותח את אפליקציית הלימוד בעמוד מסוים. {wd}=יום בשבוע, {end}=שעת הסיום של התחנה */
export async function openAppAt(app, path, vars = {}) {
  if (!path || !app?.url) return openApp(app);
  const base = app.url.endsWith('/') ? app.url : app.url + '/';
  const p = path.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vars[k] ?? ''));
  await Linking.openURL(base + p);
}

export async function openVideoCamera() {
  try { await IntentLauncher.startActivityAsync('android.media.action.VIDEO_CAMERA'); }
  catch { await IntentLauncher.startActivityAsync('android.media.action.STILL_IMAGE_CAMERA'); }
}

export const dial = phone => Linking.openURL('tel:' + String(phone).replace(/[^\d+]/g, ''));

export const shareText = message => Share.share({ message });
