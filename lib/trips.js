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
  { at: Date.UTC(2026, 10, 2, 9, 33), title: 'יציאה מעפולה לירושלים', note: 'לאסוף את הדרכון האמריקאי' },
  { at: Date.UTC(2026, 10, 2, 12, 0), title: 'איסוף הדרכון בשגרירות', note: 'חלון האיסוף 14:00–14:30' },
  { at: Date.UTC(2026, 10, 2, 13, 0), title: 'מנחה בירושלים', note: 'שעת יעד — מניין לא אומת' },
  { at: Date.UTC(2026, 10, 2, 18, 30), title: 'סידורים אחרונים לטיסה', note: '20:30 שעון ישראל; לאחר זמן המשפחה והשכבת הילדים' },
  { at: Date.UTC(2026, 10, 3, 2, 40), title: 'השכמה' },
  { at: Date.UTC(2026, 10, 3, 3, 0), title: 'מקווה', note: 'לברר פתיחה מראש' },
  { at: Date.UTC(2026, 10, 3, 3, 55), title: 'הגעה לתחנת עפולה' },
  { at: Date.UTC(2026, 10, 3, 4, 14), title: 'הרכבת יוצאת' },
  { at: Date.UTC(2026, 10, 3, 6, 20), title: 'הגעה לנתב״ג' },
  { at: Date.UTC(2026, 10, 3, 6, 35), title: 'צ׳ק-אין ובידוק', note: '08:35–09:30, אחר כך ביקורת דרכונים' },
  { at: Date.UTC(2026, 10, 3, 8, 0), title: 'שחרית בנתב״ג', note: 'חלון תכנון מותנה: לוודא סוף זמן ק״ש ותפילה ולתכנן מוקדם יותר אם צריך' },
  { at: Date.UTC(2026, 10, 3, 9, 0), title: 'להיות בשער לעלייה למטוס' },
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
const WAKE = { '2026-11-03': '04:40' };
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
  id: 'trip_eve', type: 'checklist', title: 'סידורים אחרונים לטיסה', icon: 'list', minutes: 45,
  at: '20:30',
  sub: 'חלון תכנון 20:30–21:15; הזמנים יזוזו אם החזרה מירושלים תתאחר',
  items: [
    'הדרכון החדש אצלי — לבדוק פרטים ותוקף',
    'לבצע צ׳ק־אין ב-United לטיסה UA85 ולשמור כרטיס עלייה',
    'לוודא לינה עם דוד ברוך ולקבל כתובת מדויקת',
    'לוודא שביטוח הנסיעות נרכש ושמור בטלפון',
    'לבדוק שה-eSIM של VOYE מותקן, בלי להפעיל גלישה מוקדמת',
    'לאמת שרכבת 06:14 פועלת ושיש דרך הגעה לתחנה',
    'לסגור מזוודה, טרולי ותיק תפילין',
    'לשמור מסמכים, כתובות ופרטי הטיסה גם ללא אינטרנט',
    'לכוון שעון ל-04:40 וגם שעון גיבוי',
  ],
};
const CHECKLIST_PACK = {
  id: 'trip_pack', type: 'checklist', title: 'אריזה ובדיקת ציוד ליציאה', icon: 'list',
  at: '21:15', minutes: 25,
  sub: 'מזוודה עד 23 ק״ג, טרולי ותיק תפילין — להכין ליד הדלת',
  items: ['דרכון אמריקאי וכרטיס עלייה', 'מזוודה וטרולי סגורים', 'טלית, תפילין וסידור', 'מטענים, טלפון ומטען נייד', 'בגדים וציוד למקווה', 'מזומן ואמצעי תשלום'],
};

/**
 * מחזיר null (יום רגיל) או { add: [...] } (תחנות נוספות ליום רגיל)
 * או { replace: [...] } (במקום כל התכנית הרגילה)
 * או { replaceAfter: { id, stations } } — שומר את כל סדר היום הרגיל עד לתחנה id, ומחליף את ההמשך.
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
  if (k === '2026-11-02') return { replaceAfter: { id: 'study_post', fallbackId: 'shacharit', stations: list([
    { id: 'embassy_depart', type: 'timer', title: 'נסיעה לירושלים — איסוף הדרכון', icon: 'car',
      at: '11:33', minutes: 132, protect: true,
      sub: 'לצאת מיד; זמן הנסיעה משוער, יעד הגעה 13:45 — תנועה עלולה לשנות את הזמנים' },
    { id: 'embassy_arrival', type: 'checklist', title: 'חניה וכניסה לשגרירות', icon: 'list',
      at: '13:45', minutes: 15,
      items: ['למצוא חניה', 'תעודה מזהה והנחיות איסוף', 'להתייצב לאיסוף עד 14:00'] },
    { id: 'embassy_passport', type: 'checklist', title: 'שגרירות ארה״ב — איסוף הדרכון', icon: 'list',
      at: '14:00', minutes: 30, protect: true,
      sub: 'לפי ההודעה: 14:00–14:30',
      items: ['להציג תעודה מזהה ומסמכים שהתבקשו', 'לאסוף את הדרכון', 'לבדוק שם, תאריך לידה ותוקף', 'לשמור את הדרכון בתיק היד'] },
    { id: 'jerusalem_mincha', type: 'prayer', title: 'מנחה בירושלים', icon: 'shul',
      prayer: 'mincha', appKey: 'limud', path: 'session.html?u=tfl:mincha:{wd}&min={min}&free=1',
      at: '15:00', sub: 'חלון 14:30–15:30; מניין ושעה מדויקים טרם אומתו' },
    { id: 'jerusalem_return', type: 'timer', title: 'נסיעה חזרה לעפולה', icon: 'car',
      at: '15:30', minutes: 150, sub: 'הזמן משוער; להחליק את תוכנית הערב לפי שעת ההגעה בפועל' },
    { id: 'trip_family', type: 'timer', title: 'זמן משפחה וארוחת ערב', icon: 'home',
      at: '18:00', minutes: 90, sub: 'זמן מוצע, בהתאם לחזרה מירושלים' },
    pick('bedtime_kids', { at: '19:30', minutes: 60, sub: 'השכבת הילדים עם מירי — 19:30–20:30 בתכנון' }),
    CHECKLIST_EVE,
    CHECKLIST_PACK,
    pick('day_close'),
    pick('shema_bed', { at: '21:40' }),
    pick('bedtime'),
    pick('sleep'),
  ]) } };

  // ── יום הטיסה: השכמה 04:40, מקווה 05:00, תחנה 05:55, טיסה 11:30 ──
  // שחרית ב-10:00 היא חלון תכנון בלבד; יש לוודא מראש זמני ק״ש ותפילה ובידוק.
  if (k === '2026-11-03') {
    const shortMorning = (pick('morning')?.steps || []).filter(x =>
      ['modeh', 'netila', 'toilet', 'dress'].includes(x.id));
    return { replace: list([
      pick('wake', { at: '04:40', atKey: undefined, title: 'השכמה — טיסה היום' }),
      pick('morning', { steps: shortMorning, sub: 'התארגנות קצרה לפני מקווה מוקדם; להשלים את השאר לאחריו' }),
      pick('drive_mikveh', { arriveBy: '05:00', protect: true, canDrop: false }),
      pick('mikveh', { at: '05:00', protect: true, canDrop: false,
        sub: 'לברר פתיחה מראש; אם המקווה סגור — להתאים את התוכנית' }),
      pick('birchos'),
      { id: 'trip_leave', type: 'checklist', title: 'אוכל קל, ציוד ויציאה לתחנה', icon: 'list', minutes: 15,
        sub: 'סביב 05:30 — לעלות לרכבת בלי לחץ',
        items: ['דרכון וכרטיס עלייה שמורים', 'רכבת 06:14 אומתה', 'מזוודה, טרולי ותיק תפילין', 'טלפון ומטען נייד', 'בדיקת מזג האוויר', 'להיפרד ממירי והילדים'] },
      { id: 'drive_station', type: 'drive', title: 'לתחנת הרכבת עפולה', icon: 'car',
        legs: ['station'], driveMinutes: 10, arriveBy: '05:55', protect: true },
      { id: 'train_wait', type: 'study', title: 'בתחנה — לימוד עד הרכבת', icon: 'book',
        appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true },
      { id: 'train_ride', type: 'timer', title: 'ברכבת לנתב״ג', icon: 'car',
        at: '06:14', minutes: 126, protect: true,
        sub: 'הגעה מתוכננת ב-08:20; לפי מסלול עם החלפה אחת — לאמת לפני השינה. אפשר לנצל ללימוד' },
      { id: 'airport_walk', type: 'timer', title: 'מהרכבת לטרמינל 3', icon: 'car',
        at: '08:20', minutes: 15, sub: 'מעבר לאולם היוצאים' },
      { id: 'airport_checkin', type: 'timer', title: 'בידוק ביטחוני ומסירת מזוודה', icon: 'list',
        at: '08:35', minutes: 55, protect: true,
        sub: 'חלון מתוכנן בלבד — בפועל זמן ההמתנה עשוי להשתנות' },
      { id: 'passport_control', type: 'timer', title: 'ביקורת דרכונים והמשך לשער', icon: 'list',
        at: '09:30', minutes: 30, sub: 'אם הבידוק נמשך — לפעול לפי הזמנים בפועל' },
      pick('shacharit', { alone: true, at: '10:00',
        title: 'שחרית — חלון תכנון בנתב״ג',
        sub: 'מותנה בסיום הבידוק ובזמני ק״ש ותפילה; אם צריך, לתכנן פתרון מוקדם יותר' }),
      { id: 'airport_wait', type: 'study', title: 'אוכל, שירותים והמתנה בשער', icon: 'book',
        appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true },
      { id: 'boarding', type: 'timer', title: 'זמין לעלייה למטוס בשער', icon: 'car',
        at: '11:00', minutes: 30, protect: true,
        sub: 'לפי ההודעה בשער; הטיסה UA85 מתוכננת להמריא ב-11:30' },
      { id: 'flight_guide', type: 'checklist', title: 'תכנון גמיש לטיסה — לימוד, מנחה ומנוחה', icon: 'list', minutes: 0,
        sub: 'הזמנים להמחשה בלבד, לא לוח שירותי המטוס',
        items: ['מנחה — לפי זמן הלכתי מתאים; לפי דוח MyZmanim לא לפני 12:39 בישראל אם חל הטווח המתואר', 'ארוחות כשרות ומנוחה', 'חת״ת, רמב״ם ושיחות בענייני שליחות', 'להכין מחשבות ופ״נ לביקור באוהל'] },
      { id: 'flight_ua85', type: 'timer', title: 'בטיסה UA85 — לניוארק', icon: 'now',
        at: '11:30', minutes: 725, protect: true,
        sub: 'טיסה ישירה; נחיתה מתוכננת 16:35 שעון ניו יורק (EWR, טרמינל C). ארוחה כשרה בהזמנה' },
      { id: 'landed_ewr', type: 'checklist', title: 'נחתנו — לשלוח הודעה', icon: 'list', minutes: 30,
        items: ['להודיע למירי שנחתת', 'ביקורת גבולות ואיסוף מזוודה', 'להמשיך עם אבא לקראון הייטס'] },
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
      { id: 'ohel_return', type: 'checklist', title: 'האוהל הק׳ — הביקור המרכזי לפני החזרה', icon: 'list', minutes: 0,
        sub: 'יום שני: הביקור באוהל הוא עיקר הנסיעה; להשאיר זמן להגיע לשדה ב-16:15',
        items: ['פ״נ ותפילה באוהל', 'לוודא חזרה בזמן לקראת הטיסה'] },
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
  // התוכנייה הכללית נשארת בשלמותה ברשימת האירועים; משימות אישיות גוברות על אירועים חופפים.
  const fixed = events.filter(([at, title]) => /^\d{2}:\d{2}$/.test(at) &&
    !(key === '2026-11-05' && ((at === '07:00' && title === 'שחרית') || (at === '09:30' && title === 'יריד הקניות ועזרי השליחות'))));
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
    // ארוחת הבוקר של חמישי לא יכולה לגלוש מעבר לשחרית האישית ב-09:30.
    const nextAt = key === '2026-11-05' && at === '09:00' ? '09:30' : next?.[0];
    const gap = nextAt ? Math.max(1, toMin(nextAt) - toMin(at)) : 45;
    const isPrayer = /^(שחרית|תהילים|מעריב והבדלה)$/.test(title);
    return {
      id: 'kinus_' + key + '_' + index,
      type: 'timer', title: title, icon: isPrayer ? 'shul' : 'calendar',
      at, minutes: Math.max(1, Math.min(gap, 45)),
      sub: 'מקום: ' + place + ' · שעון ניו יורק',
    };
  });
  const personal = [];
  if (key === '2026-11-04') personal.push({
    id: 'ohel_wed', type: 'checklist', title: 'האוהל הק׳ — ביקור יום רביעי', icon: 'list', minutes: 0,
    sub: 'זהו עיקר הנסיעה; זמן היציאה והחזרה יתואם בנפרד',
    items: ['פ״נ ותפילה באוהל', 'תיאום דרך חזרה לקראון הייטס'],
  });
  if (key === '2026-11-05') personal.push({
    id: 'rebbe_room_shacharit', type: 'timer', title: 'שחרית בחדרו של הרבי', icon: 'shul',
    at: '09:30', minutes: 35, protect: true,
    sub: 'המועד האישי שנקבע; במקום שחרית 07:00 שמופיעה בתוכניית הכינוס',
  });
  // Keep the entire official program as information; only personal commitments become higher-priority stations.
  // On Shabbat avoid a forced phone routine; keep the schedule itself available.
  return list([fullSchedule, ...personal, ...stations]).sort((a, b) => {
    // Keep unscheduled priority items before the official timed events.
    if (!a.at && b.at) return -1;
    if (a.at && !b.at) return 1;
    if (a.at && b.at) return a.at.localeCompare(b.at);
    return 0;
  });
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
