// ─────────────────────────────────────────────────────────────
// טיסות — ספירה לאחור, ותכנית מיוחדת לימים שסביבן.
// מקור: כרטיס United, הזמנה UBRDFW (3.11.2026 ← 10.11.2026).
// השעות של הטיסות הן בשעון המקומי של שדה התעופה, כאן הן מומרות לרגע מוחלט (UTC)
// כדי שהספירה לאחור תהיה נכונה בכל אזור זמן.
// ─────────────────────────────────────────────────────────────

export const FLIGHTS = [
  // 3.11 11:30 שעון ישראל (UTC+2)
  { id: 'ua85', no: 'UA 85', label: 'תל אביב ← ניוארק', at: Date.UTC(2026, 10, 3, 9, 30) },
  // 9.11 18:17 שעון ניו יורק (UTC-5)
  { id: 'ua2838', no: 'UA 2838', label: 'ניו יורק ← שיקגו', at: Date.UTC(2026, 10, 9, 23, 17) },
  // 9.11 22:00 שעון שיקגו (UTC-6)
  { id: 'ua140', no: 'UA 140', label: 'שיקגו ← תל אביב', at: Date.UTC(2026, 10, 10, 4, 0) },
];

/** הטיסה הבאה (כזו שעוד לא המריאה) ובעוד כמה מילישניות */
export function nextFlight(nowMs = Date.now()) {
  const f = FLIGHTS.find(x => x.at > nowMs);
  return f ? { flight: f, ms: f.at - nowMs } : null;
}

/** "עוד 6 ימים ו-3 שעות" / "עוד 4:25 שעות" / "עוד 35 דק׳" */
export function fmtLeft(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d >= 1) return `${d === 1 ? 'יום' : d === 2 ? 'יומיים' : d + ' ימים'}${h ? ` ו-${h === 1 ? 'שעה' : h + ' שעות'}` : ''}`;
  if (h >= 1) return `${h}:${String(m).padStart(2, '0')} שעות`;
  return `${m} דק׳`;
}

// מקום שלא קיים ברשימת המקומות של האפליקציה
export const TRIP_PLACES = {
  airport: { name: 'נמל התעופה בן גוריון — טרמינל 3', address: 'נמל התעופה בן גוריון טרמינל 3', minutes: 90 },
};

// שעת השכמה מיוחדת (בימים שקמים מוקדם בשביל הטיסה)
const WAKE = { '2026-11-03': '05:15' };
export function wakeTimeFor(settings, date) {
  return WAKE[keyOf(date)] || settings.wakeTime;
}

const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const CHECKLIST_PREP = {
  id: 'trip_prep', type: 'checklist', title: 'הכנות לטיסה', icon: 'list', minutes: 25,
  sub: 'טיסה UA 85 ביום שלישי 3.11 ב-11:30',
  items: [
    'להכין מזוודה — עד 23 ק״ג, ועוד תיק יד אחד',
    'דרכון בתוקף + ויזה / ESTA — לוודא',
    'ביטוח נסיעות — לוודא שיש',
    'מנות כשרות — כבר הוזמנו לטיסה לשם ולחזור (UA 85 ו-UA 140)',
    'להסדיר מי מסיע לשדה ביום שלישי',
    'מטענים, מטען נייד, מתאם',
    'תפילין, טלית, סידור, ספר לימוד',
    'להסדיר עם מירי: ילדים, הסעות, איסופים בזמן שאתה בחוץ',
  ],
};
const CHECKLIST_EVE = {
  id: 'trip_eve', type: 'checklist', title: 'צ׳ק-אין וסידורים אחרונים', icon: 'list', minutes: 20,
  sub: 'הצ׳ק-אין נפתח 24 שעות לפני — מ-11:30 היום',
  items: [
    'צ׳ק-אין ל-UA 85 (באפליקציה של United) — אחרי 11:30',
    'כרטיס עלייה לטלפון',
    'מזוודה סגורה ליד הדלת',
    'דרכון, כסף, כרטיס אשראי — בתיק היד',
    'ללכת לישון מוקדם — השכמה מחר ב-05:15',
  ],
};

/**
 * מחזיר null (יום רגיל) או { add: [...] } (תחנות נוספות ליום רגיל)
 * או { replace: [...] } (במקום כל התכנית הרגילה).
 * pick(id) — התחנה הרגילה לפי מזהה, כדי להשתמש בה בלי להעתיק.
 */
export function tripDay(settings, date) {
  const k = keyOf(date);
  const all = settings.stations || [];
  const pick = (id, over = {}) => {
    const s = all.find(x => x.id === id);
    if (!s) return null;
    const { days, ...rest } = s;
    return { ...rest, ...over };
  };
  const list = arr => arr.filter(Boolean);

  if (k === '2026-11-01') return { add: [CHECKLIST_PREP] };
  if (k === '2026-11-02') return { add: [CHECKLIST_EVE] };

  // ── יום היציאה: אחורה מהטיסה ב-11:30 ──
  //   עלייה 10:50 · בשער מראש, בנמל התעופה ב-08:30 (3 שעות לפני) · יציאה מהבית 07:00
  if (k === '2026-11-03') {
    return { replace: list([
      pick('wake', { at: '05:15', atKey: undefined, title: 'השכמה — טיסה היום' }),
      pick('morning'),
      pick('birchos'),
      pick('korbanot'),
      pick('shacharit', { alone: true, title: 'שחרית ביחידות — בבית' }),
      { id: 'trip_leave', type: 'checklist', title: 'לפני היציאה לשדה', icon: 'list', minutes: 25,
        items: ['דרכון וכרטיס עלייה', 'מזוודה ותיק יד', 'תפילין, טלית, סידור', 'מטען ומטען נייד', 'להיפרד מהילדים ומירי', 'לנעול, לכבות אור וגז'] },
      { id: 'drive_airport', type: 'drive', title: 'לנמל התעופה', icon: 'car', legs: ['airport'], driveMinutes: 90, arriveBy: '08:30', protect: true,
        sub: 'שלוש שעות לפני ההמראה' },
      { id: 'airport_checkin', type: 'timer', title: 'צ׳ק-אין, מזוודה ובידוק ביטחוני', icon: 'list', minutes: 60 },
      { id: 'airport_wait', type: 'study', title: 'בשער — לימוד עד העלייה', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true },
      { id: 'boarding', type: 'timer', title: 'עלייה למטוס', icon: 'car', at: '10:50', minutes: 40, protect: true,
        sub: 'טרמינל 3 · UA 85 ממריא ב-11:30' },
      { id: 'flight_ua85', type: 'timer', title: 'בטיסה UA 85 — לניוארק', icon: 'now', minutes: 725,
        sub: 'נוחתים ב-16:35 שעון ניו יורק · ארוחה כשרה · לסמן "סיימתי" בנחיתה' },
      { id: 'landed_ewr', type: 'checklist', title: 'נחתנו — לשלוח הודעה', icon: 'list', minutes: 30,
        items: ['להודיע למירי שנחתת', 'מעבר דרכונים ומזוודה', 'לסדר שעון ואזור זמן בטלפון'] },
      pick('maariv', { alone: true, title: 'מעריב ביחידות' }),
      pick('day_close'),
      pick('shema_bed'),
    ]) };
  }

  // ── ימים בחו״ל: תכנית פשוטה, ביחידות, לפי השעון המקומי ──
  if (['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'].includes(k)) {
    return { replace: abroad(pick, list) };
  }

  // ── יום החזרה מניו יורק: לה גארדיה 18:17 ← שיקגו 20:08, ואז UA 140 ב-22:00 ──
  if (k === '2026-11-09') {
    return { replace: list([
      pick('wake'),
      pick('morning'),
      pick('birchos'),
      pick('shacharit', { alone: true, title: 'שחרית ביחידות' }),
      { id: 'pack_return', type: 'checklist', title: 'לארוז ולצאת', icon: 'list', minutes: 30,
        items: ['לארוז את הכל — מזוודה עד 23 ק״ג', 'דרכון וכרטיסי עלייה', 'לבדוק צ׳ק-אין לשתי הטיסות', 'מטענים'] },
      { id: 'study_ret', type: 'study', title: 'לימוד', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true },
      pick('mincha', { alone: true, at: '14:30', title: 'מנחה ביחידות — לפני השדה' }),
      { id: 'drive_lga', type: 'drive', title: 'ללה גארדיה (LGA)', icon: 'car', legs: ['lga'], driveMinutes: 45, arriveBy: '16:15', protect: true,
        sub: 'שעתיים לפני ההמראה · טרמינל B' },
      { id: 'flight_ua2838', type: 'timer', title: 'טיסה UA 2838 — לשיקגו', icon: 'now', at: '18:17', minutes: 171,
        sub: 'נוחתים ב-20:08 שעון שיקגו · טרמינל 1' },
      { id: 'ord_connection', type: 'checklist', title: 'שיקגו — החלפת טיסה', icon: 'list', minutes: 20,
        sub: 'ממשיכים מאותו טרמינל 1 · UA 140 ב-22:00',
        items: ['למצוא את השער של UA 140', 'לוודא שהמזוודה עוברת לתל אביב', 'לקנות מים'] },
      pick('maariv', { alone: true, title: 'מעריב ביחידות — בשדה' }),
      { id: 'flight_ua140', type: 'timer', title: 'בטיסה UA 140 — לתל אביב', icon: 'now', at: '22:00', minutes: 680,
        sub: 'נוחתים ב-17:20 (10.11) · ארוחה כשרה · שחרית ומנחה בטיסה, ביחידות' },
    ]) };
  }

  // ── יום החזרה: הטיסה נוחתת 17:20 ──
  if (k === '2026-11-10') {
    return { replace: list([
      { id: 'inflight_day', type: 'study', title: 'בטיסה — לימוד ומנוחה', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true,
        sub: 'נוחתים ב-17:20 · שחרית ומנחה ביחידות' },
      { id: 'land_tlv', type: 'timer', title: 'נחיתה — דרכונים ומזוודה', icon: 'now', at: '17:20', minutes: 60,
        sub: 'טרמינל 3 · להודיע למירי' },
      { id: 'drive_home_airport', type: 'drive', title: 'הביתה מהשדה', icon: 'car', legs: ['home'], driveMinutes: 80 },
      pick('pick_maariv'),
      pick('drive_maariv'),
      pick('maariv'),
      pick('drive_home3'),
      pick('plan_tomorrow'),
      pick('day_close'),
      pick('shema_bed'),
    ]) };
  }
  return null;
}

function abroad(pick, list) {
  return list([
    pick('wake'),
    pick('morning'),
    pick('birchos'),
    pick('shacharit', { alone: true, title: 'שחרית ביחידות' }),
    { id: 'study_abroad', type: 'study', title: 'לימוד', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true,
      sub: 'ימים בחו״ל — לימוד עד המנחה' },
    pick('mincha', { alone: true, at: '15:30', title: 'מנחה ביחידות' }),
    { id: 'free_abroad', type: 'study', title: 'המשך היום', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true, optional: true, minMinutes: 5 },
    pick('maariv', { alone: true, at: '18:30', title: 'מעריב ביחידות' }),
    pick('day_close'),
    pick('shema_bed'),
  ]);
}

// מקומות של ימי הטיסה (נסיעות) — לוויז
TRIP_PLACES.lga = { name: 'נמל התעופה לה גארדיה — טרמינל B', address: 'LaGuardia Airport Terminal B, New York', minutes: 45 };
