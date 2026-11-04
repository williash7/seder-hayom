// בחירת מיקום זמני היום בלי לחשוף כתובת פרטית או לבקש הרשאה בלי צורך.
const PRESETS = {
  'America/New_York': { latitude: 40.67, longitude: -73.94, name: 'ניו יורק', candleMinutes: 18 },
  'Asia/Jerusalem': { latitude: 32.6091, longitude: 35.2892, name: 'עפולה', candleMinutes: 30 },
  'Asia/Tel_Aviv': { latitude: 32.6091, longitude: 35.2892, name: 'עפולה', candleMinutes: 30 },
};

export function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; }
  catch { return null; }
}
export function fallbackZmanimPlace(zone = deviceTimeZone()) {
  const preset = PRESETS[zone];
  return preset ? { ...preset, timeZone: zone === 'Asia/Tel_Aviv' ? 'Asia/Jerusalem' : zone,
    source: 'timezone', label: preset.name + ' · לפי אזור הזמן בטלפון' } : null;
}
export function placeFromPosition(coords, zone = deviceTimeZone()) {
  const latitude = Number(coords?.latitude), longitude = Number(coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  // אזורי הזמן של הטלפון אינם תמיד מתעדכנים עם הנחיתה — בתחומי ישראל וניו יורק
  // מתקנים גם את אזור הזמן של חישוב הזמנים, בלי לשנות הגדרות מערכת.
  const ny = latitude > 39.5 && latitude < 42 && longitude > -75.5 && longitude < -72;
  const israel = latitude > 29 && latitude < 34 && longitude > 34 && longitude < 36.5;
  const timeZone = ny ? 'America/New_York' : israel ? 'Asia/Jerusalem' : zone;
  if (!timeZone) return null;
  const nearHome = Math.abs(latitude - 32.6091) < 0.2 && Math.abs(longitude - 35.2892) < 0.25;
  const nearJerusalem = latitude > 31.65 && latitude < 31.95 && longitude > 35.05 && longitude < 35.35;
  return {
    latitude, longitude, timeZone,
    candleMinutes: ny ? 18 : nearJerusalem ? 40 : nearHome ? 30 : israel ? 20 : 18,
    name: ny ? 'ניו יורק' : nearHome ? 'עפולה' : 'המיקום הנוכחי',
    label: (ny ? 'ניו יורק' : nearHome ? 'עפולה' : 'המיקום הנוכחי') + ' · לפי מיקום הטלפון',
    source: 'location',
  };
}
