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

// אבני דרך מתוכנית הנסיעה לטיסת ההלוך (שעון ישראל, UTC+2).
// מדובר בזמנים מתוכננים ולא במעקב חי אחרי חברת התעופה.
export const OUTBOUND_MILESTONES = [
  { at: Date.UTC(2026, 10, 2, 9, 30), title: 'צ׳ק-אין אונליין נפתח', note: '24 שעות לפני ההמראה' },
  { at: Date.UTC(2026, 10, 2, 9, 30), title: 'יציאה מהכולל לירושלים', note: 'לאסוף את הדרכון האמריקאי' },
  { at: Date.UTC(2026, 10, 2, 12, 0), title: 'איסוף הדרכון בשגרירות', note: 'חלון האיסוף 14:00–14:30' },
  { at: Date.UTC(2026, 10, 2, 13, 0), title: 'מנחה בירושלים', note: 'שעת יעד — מניין לא אומת' },
  { at: Date.UTC(2026, 10, 2, 16, 0), title: 'השלמת צ׳ק-אין ואריזה', note: 'שעה משוערת, אחרי החזרה הביתה' },
  { at: Date.UTC(2026, 10, 3, 2, 35), title: 'השכמה' },
  { at: Date.UTC(2026, 10, 3, 3, 10), title: 'מקווה' },
  { at: Date.UTC(2026, 10, 3, 3, 55), title: 'הגעה לתחנת עפולה' },
  { at: Date.UTC(2026, 10, 3, 4, 14), title: 'הרכבת יוצאת' },
  { at: Date.UTC(2026, 10, 3, 6, 20), title: 'הגעה לנתב״ג' },
  { at: Date.UTC(2026, 10, 3, 6, 30), title: 'צ׳ק-אין וביקורת גבולות' },
  { at: Date.UTC(2026, 10, 3, 7, 40), title: 'שחרית בשדה התעופה', note: 'בהתאם לסיום הבידוק' },
  { at: Date.UTC(2026, 10, 3, 8, 50), title: 'עלייה למטוס' },
  { at: Date.UTC(2026, 10, 3, 9, 30), title: 'המראה — UA 85' },
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
const WAKE = { '2026-11-03': '04:35' };
export function wakeTimeFor(settings, date) {
  return WAKE[keyOf(date)] || settings.wakeTime;
}

const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const CHECKLIST_PREP = {
  id: 'trip_prep', type: 'checklist', title: 'הכנות לטיסה', icon: 'list', minutes: 25,
  sub: 'טיסה UA 85 ביום שלישי 3.11 ב-11:30',
  items: [
    'להכין מזוודה — עד 23 ק״ג, ועוד תיק יד אחד',
    'דרכון אמריקאי — לאסוף בשגרירות ביום שני ולוודא שהפרטים נכונים',
    'ביטוח נסיעות לחו״ל — לרכוש או לוודא שהופעל',
    'eSIM לארצות הברית — לבדוק התקנה והפעלה לפני ההמראה',
    'ליצור קשר עם דוד ברוך ולאשר מקום לינה בניו יורק',
    'לוודא סידור הגעה מניוארק לקראון הייטס עם אבא',
    'אמצעי תשלום: לבדוק שהדביט עובד בארה״ב ולהצטייד במזומן לפי הצורך',
    'מנות כשרות — כבר הוזמנו לטיסה לשם ולחזור (UA 85 ו-UA 140)',
    'כרטיס רכבת מעפולה — רכבת ב-06:14, להגיע לתחנה ב-05:55',
    'מזוודה, טרולי ותיק תפילין — להכין ולבדוק את מדיניות הכבודה בכרטיס',
    'מטענים, מטען נייד, מתאם לשקע אמריקאי',
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
    'מזוודה, טרולי ותפילין מוכנים ליד הדלת',
    'דרכון, כסף, כרטיס דביט וכרטיסי נסיעה — בתיק היד',
    'לוודא שפעולת ה-eSIM והגלישה בארה״ב ברורה',
    'לבדוק שוב את שעת הרכבת והמסלול בפועל',
    'ללכת לישון מוקדם — השכמה מחר ב-04:35',
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
  // יום שני: איסוף דרכון אמריקאי בשגרירות בירושלים, חזרה רק אחרי מנחה.
  // הזמנים הם התכנון שנמסר, ואינם אישור לשעות פתיחה או למניין מסוים.
  if (k === '2026-11-02') return { replace: list([
    pick('wake'), pick('morning'), pick('birchos'), pick('mikveh'),
    pick('shacharit'), pick('drive_kollel'), pick('kollel'),
    { id: 'embassy_depart', type: 'timer', title: 'יציאה לירושלים — איסוף הדרכון', icon: 'car',
      at: '11:30', minutes: 150, protect: true,
      sub: 'לצאת אחרי הכולל; נסיעה עשויה להימשך כשעתיים או יותר, יעד הגעה עד 14:00' },
    { id: 'embassy_passport', type: 'checklist', title: 'שגרירות ארה״ב — איסוף הדרכון', icon: 'list',
      at: '14:00', minutes: 30, protect: true,
      sub: 'חלון איסוף מתוכנן 14:00–14:30; לבדוק הנחיות כניסה, כתובת ומסמכים',
      items: ['תעודה מזהה וכל מסמך שהתבקש לאיסוף', 'לאסוף את הדרכון', 'לבדוק מיד שם, תאריך לידה ותוקף', 'לוודא שהדרכון נשמר בתיק היד'] },
    { id: 'jerusalem_mincha', type: 'prayer', title: 'מנחה במניין בירושלים', icon: 'shul',
      prayer: 'mincha', appKey: 'limud', path: 'session.html?u=tfl:mincha:{wd}&min={min}&free=1',
      at: '15:00', minutes: 25, sub: 'יעד למניין באזור השגרירות; מקום ושעה מדויקים עדיין טעונים בדיקה' },
    { id: 'jerusalem_return', type: 'timer', title: 'חזרה מירושלים לעפולה', icon: 'car',
      minutes: 135, sub: 'לצאת אחרי מנחה; זמן הנסיעה משוער' },
    CHECKLIST_EVE, pick('plan_tomorrow'), pick('day_close'), pick('shema_bed'),
  ]) };

  // ── יום היציאה: לפי הסידור של אשר ──
  //   05:10 מקווה · 05:55 תחנת הרכבת בעפולה · 06:14 רכבת · 08:20 נתב״ג
  //   08:30–09:30 צ׳ק-אין ובקרת גבולות · אחרי זה שחרית · 11:30 המראה
  if (k === '2026-11-03') {
    return { replace: list([
      pick('wake', { at: '04:35', atKey: undefined, title: 'השכמה — טיסה היום' }),
      pick('morning'),
      pick('birchos'),
      pick('drive_mikveh', { arriveBy: '05:10', protect: true, canDrop: false }),
      pick('mikveh', { at: '05:10', protect: true, canDrop: false }),
      { id: 'trip_leave', type: 'checklist', title: 'לפני היציאה לרכבת', icon: 'list', minutes: 15,
        items: ['דרכון וכרטיס עלייה', 'כרטיס רכבת', 'מזוודה ותיק יד', 'תפילין, טלית, סידור', 'מטען ומטען נייד', 'להיפרד מהילדים ומירי'] },
      { id: 'drive_station', type: 'drive', title: 'לתחנת הרכבת עפולה', icon: 'car', legs: ['station'], driveMinutes: 10, arriveBy: '05:55', protect: true },
      { id: 'train_wait', type: 'study', title: 'בתחנה — לימוד עד הרכבת', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true },
      { id: 'train_ride', type: 'timer', title: 'ברכבת לנתב״ג', icon: 'car', at: '06:14', minutes: 126, protect: true,
        sub: 'מגיעים ב-08:20' },
      { id: 'airport_checkin', type: 'timer', title: 'צ׳ק-אין, מזוודה וביקורת גבולות', icon: 'list', at: '08:30', minutes: 60, protect: true },
      pick('korbanot'),
      pick('shacharit', { alone: true, title: 'שחרית ביחידות — בנמל התעופה', sub: 'אם הבידוק הסתיים' }),
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

  // ── 4–8 בנובמבר: התוכנייה הרשמית של כינוס השלוחים, שעון ניו יורק ──
  if (KINUS_SCHEDULE[k]) return { replace: kinusDay(k, pick, list) };

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

// לוח הכינוס מתוך צילומי התוכנייה שהתקבלו ב־31.10.2026.
// זוהי תוכנית אירועים, לא רישום אישי לאירוע. כל השעות בשעון ניו יורק.
// מקומות: JCM=מוזיאון צבאות ה׳; OT=אוהלי תורה; MOCC=Major R. Owens Center;
// NJCEC=New Jersey Conference and Expo Center; 770=770; Ohel=אהל הק׳;
// RH=ביתו הק׳ של הרבי; VL=מקומות שונים בקראון הייטס.
const KINUS_SCHEDULE = {
  '2026-11-04': [
    ['14:00', 'קבלת פנים ורישום', 'JCM'],
    ['15:00', 'חדר הק׳ של הרבי · תערוכת ספריית אגודת חסידי חב״ד', '770'],
    ['18:00', 'ארוחת ערב', 'OT'],
    ['21:00', 'ההרשמה נסגרת', 'JCM'],
  ],
  '2026-11-05': [
    ['07:00', 'שחרית', '770'],
    ['09:00', 'ארוחת בוקר · ההרשמה נפתחת', 'OT · JCM'],
    ['09:30', 'יריד הקניות ועזרי השליחות', 'OT'],
    ['11:30', 'מקבץ סדנאות ראשון', 'VL'],
    ['13:00', 'מנחה, ארוחת צהריים אישית', 'VL'],
    ['14:00', 'מקבץ סדנאות שני', 'VL'],
    ['15:30', 'מקבץ סדנאות שלישי', 'VL'],
    ['17:00', 'מקבץ סדנאות רביעי', 'VL'],
    ['18:30', 'ארוחת ערב ומושב פתיחה מרכזי', 'MOCC'],
    ['21:00', 'ההרשמה נסגרת', 'JCM'],
    ['21:15', 'חדר הק׳ של הרבי · ביתו הק׳ של הרבי · תערוכת ספריית אגודת חסידי חב״ד', '770 · RH'],
  ],
  '2026-11-06': [
    ['07:00', 'שחרית', '770'],
    ['07:45', 'ההרשמה נפתחת · נסיעה לאהל הק׳', 'JCM · אהל הק׳'],
    ['09:00', 'סדר ניגונים והתקשרות', 'Ohel'],
    ['10:15', 'קריאת הפ״נ', 'Ohel'],
    ['11:00', 'ארוחת צהריים', 'OT'],
    ['12:45', 'מושב כללי', 'OT'],
    ['13:00', 'ההרשמה נסגרת', 'JCM'],
    ['16:28', 'הדלקת נרות שבת', 'ניו יורק'],
    ['19:00', 'סעודת שבת והתוועדות', 'OT'],
  ],
  '2026-11-07': [
    ['08:30', 'תהילים', '770'],
    ['10:30', 'שחרית', '770'],
    ['13:30', 'התוועדות', 'OT'],
    ['17:28', 'מעריב והבדלה', 'ניו יורק'],
    ['18:35', 'חדר הק׳ של הרבי · ביתו הק׳ של הרבי', '770 · RH'],
    ['19:00', 'ההרשמה נפתחת', 'JCM'],
    ['20:00', 'מלווה מלכה — מושב מרכזי', 'MOCC'],
    ['21:00', 'ההרשמה נסגרת', 'JCM'],
  ],
  '2026-11-08': [
    ['07:00', 'שחרית', '770'],
    ['08:00', 'ההרשמה נפתחת', 'JCM'],
    ['08:30', 'תמונה קבוצתית', '770'],
    ['09:30', 'ארוחת בוקר', 'OT'],
    ['11:00', 'ההרשמה נסגרת (נפתחת בבאנקעט ב־12:00)', 'JCM'],
    ['11:15', 'נסיעה למתחם הבאנקעט בניו ג׳רזי', 'ניו יורק → NJCEC'],
    ['12:00', 'הבאנקעט המרכזי — הגעה', 'NJCEC'],
    ['13:00', 'Banquet Pre-Show', 'NJCEC'],
    ['14:00', 'הבאנקעט המרכזי', 'NJCEC'],
    ['19:00', 'חדר הק׳ של הרבי · ביתו הק׳ של הרבי', '770 · RH'],
    ['ללא שעה', 'התוועדות', 'לפי התוכנייה'],
  ],
};

function kinusDay(key, pick, list) {
  const events = KINUS_SCHEDULE[key];
  const fixed = events.filter(e => /^\\d{2}:\\d{2}$/.test(e[0]));
  const fullSchedule = {
    id: 'kinus_full_' + key, type: 'checklist', title: 'תוכניית הכינוס — כל האירועים',
    icon: 'list', minutes: 5,
    sub: 'שעות ניו יורק · האירועים אינם מסומנים כהשתתפות בפועל',
    items: events.map(([at, title, place]) => at + ' · ' + title + ' (' + place + ')'),
  };
  // The full list is retained inside a checklist as well, including parallel events
  // and the Sunday farbrengen without a published time.
  const stations = fixed.map(([at, title, place], index) => {
    const next = fixed[index + 1];
    const toMin = time => Number(time.slice(0,2)) * 60 + Number(time.slice(3,5));
    const gap = next ? Math.max(1, toMin(next[0]) - toMin(at)) : 45;
    const isPrayer = /^(שחרית|תהילים|מעריב והבדלה)$/.test(title);
    return {
      id: 'kinus_' + key + '_' + index,
      type: 'timer', title: title, icon: isPrayer ? 'shul' : 'calendar',
      at, minutes: Math.max(1, Math.min(gap, 45)),
      sub: 'מקום: ' + place + ' · שעון ניו יורק',
    };
  });
  // On Shabbat avoid a forced phone routine; keep the schedule itself available.
  return list([fullSchedule, ...stations]);
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
TRIP_PLACES.station = { name: 'תחנת הרכבת עפולה', address: 'תחנת הרכבת עפולה', minutes: 10 };
TRIP_PLACES.lga = { name: 'נמל התעופה לה גארדיה — טרמינל B', address: 'LaGuardia Airport Terminal B, New York', minutes: 45 };
