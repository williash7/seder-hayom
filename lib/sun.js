// חישוב זמני היום על הטלפון עצמו (אלגוריתם NOAA) — בלי תלות ברשת.
// מחזיר שעות "HH:MM" בשעון המקומי של הטלפון.

const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;

/** זמן (בדקות UTC מחצות) שבו השמש בגובה `alt` מעלות, בבוקר או בערב */
function solarEventUTC(date, lat, lon, alt, morning) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  let t = 720 - 4 * lon;                         // הערכה ראשונה: צהריים
  for (let i = 0; i < 3; i++) {
    const jc = (jdn - 0.5 + t / 1440 - 2451545) / 36525;
    const L0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
    const M = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
    const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
    const C = Math.sin(rad(M)) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * jc) + Math.sin(rad(3 * M)) * 0.000289;
    const lam = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * jc));
    const eps0 = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(rad(125.04 - 1934.136 * jc));
    const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lam))));
    const yv = Math.tan(rad(eps / 2)) ** 2;
    const eqt = 4 * deg(yv * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * yv * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * yv * yv * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
    const cosH = (Math.sin(rad(alt)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl)));
    if (cosH < -1 || cosH > 1) return null;
    const H = deg(Math.acos(cosH));
    const noon = 720 - 4 * lon - eqt;
    t = morning ? noon - 4 * H : noon + 4 * H;
  }
  return t;
}

const pad = n => String(n).padStart(2, '0');
function fmt(date, utcMin) {
  if (utcMin == null) return null;
  const base = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const d = new Date(base + Math.round(utcMin) * 60000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** כל הזמנים ליום אחד. שעות זמניות לפי הגר״א (נץ–שקיעה) */
export function computeZmanim(date, lat = 32.6091, lon = 35.2892) {
  const rise = solarEventUTC(date, lat, lon, -0.833, true);
  const set = solarEventUTC(date, lat, lon, -0.833, false);
  const alot = solarEventUTC(date, lat, lon, -16.1, true);
  const tzeit = solarEventUTC(date, lat, lon, -8.5, false);
  if (rise == null || set == null) return {};
  const hour = (set - rise) / 12;
  const z = h => fmt(date, rise + hour * h);
  return {
    alot: fmt(date, alot), sunrise: fmt(date, rise),
    sofZmanShma: z(3), sofZmanTfilla: z(4), chatzot: z(6),
    minchaGedola: z(6.5), plag: z(10.75),
    sunset: fmt(date, set), tzeit: fmt(date, tzeit),
  };
}
