// ─────────────────────────────────────────────────────────────
// ברירות מחדל — סדר היום של אשר.
// הכל ניתן לעריכה במסך ההגדרות; זה רק נקודת הפתיחה.
// days: 0=ראשון … 6=שבת. בלי days = כל ימות החול.
// ─────────────────────────────────────────────────────────────

const SUN_THU = [0, 1, 2, 3, 4];
const WEEKDAYS = [0, 1, 2, 3, 4, 5];
const SHIUR_DAYS = [0, 2];          // שיעור ערב ברוסית — ראשון ושלישי

export const DEFAULT_SETTINGS = {
  version: 20,

  wakeTime: '06:30',
  alarm: { repeatEveryMin: 2, repeatCount: 15 },

  // סגירת יום: תזכורת כל רבע שעה, ובסוף נסגר לבד
  dayClose: { firstReminder: '22:45', every: 15, hardClose: '23:45' },

  // הטלפון ישן — מסוף היום ועד ההשכמה פתוחים רק אלה (ועוד הטלפון והגדרות, תמיד)
  nightLock: { allowed: ['com.google.android.deskclock', 'com.sec.android.app.clockpackage'] },

  // ── מקומות ── (כתובת לוויז; minutes = זמן נסיעה משוער מהתחנה הקודמת)
  places: {
    gan:    { name: 'גן בוגרים חב״ד — חנצ׳י ומוסיא', address: 'הסוכנות היהודית, עפולה', minutes: 6 },
    mendele:{ name: 'מענדלה — עומר 5',      address: 'עומר 5, עפולה',   minutes: 6 },
    tzivia: { name: 'צביה — כורש 16',       address: 'כורש 16, עפולה',  minutes: 6 },
    mikveh: { name: 'מקווה גברים קינמון',   address: 'מקווה גברים קינמון עפולה', minutes: 7 },
    shul:   { name: 'בית הכנסת בעלי מלאכה חב״ד', address: 'בית כנסת בעלי מלאכה חב"ד עפולה', minutes: 5 },
    kollel: { name: 'כולל — בית הכנסת הפתוח', address: 'יפה ירקוני, עפולה', minutes: 10 },
    home:   { name: 'בית — וולפסון 3',      address: 'וולפסון 3, עפולה', minutes: 8 },
    mendele_pick: { name: 'איסוף מענדלה — יין בעיר', address: 'יין בעיר עפולה', minutes: 8 },
    alex:   { name: 'שיעור עם אלכס — נחום לוין', address: 'נחום לוין, עפולה', minutes: 6 },
    shiur:  { name: 'מקום שיעור הערב',      address: '', minutes: 10 },
  },

  // ── מניינים ──
  minyanim: {
    shacharit: ['07:00', '07:30', '08:00', '08:30', '09:00', '09:15'],
    mincha:    ['15:00'],
    maariv:    ['21:30', '22:00'],
  },
  // מניינים נוספים לפי יום (0=ראשון … 5=שישי)
  minyanimByDay: {
    5: { shacharit: ['09:30', '10:00'] },   // בשישי (אין כולל) — גם 9:30 ו-10:00
  },
  prayerMinutes: { shacharit: 35, mincha: 15, maariv: 20 },

  // ── אפליקציות וקישורים ──
  apps: {
    limud:  { name: 'תהילים ולימוד יומי', url: 'https://williash7.github.io/hoshana-raba/', pkg: '' },
    editor: { name: 'עורך הווידאו', url: '', pkg: 'com.haessentz.videoeditor' },
    crm:    { name: 'ה-CRM', url: 'https://williash7.github.io/kehila-crm/', pkg: '' },
    whatsapp: { name: 'וואטסאפ ביזנס', url: '', pkg: 'com.whatsapp.w4b' },
  },

  // ── גיליון ההתרמה (כתובת הסקריפט נשמרת רק בטלפון) ──
  calls: { url: '' },
  crm: { url: '' },

  // ── זמן בית: רק אלה פתוחים בלי לכתוב סיבה ──
  homeTime: {
    allowed: ['limud', 'whatsapp'],
    // חבילות נוספות שמותרות תמיד בזמן בית (* בסוף = כל מה שמתחיל כך)
    // הלימוד היומי נפתח בדפדפן או כאפליקציית רשת — לכן הדפדפן מותר
    extraPkgs: ['com.android.chrome', 'org.chromium.webapk*', 'com.sec.android.app.sbrowser', 'com.google.android.deskclock', 'com.sec.android.app.clockpackage'],
    defaultUnlockMin: 10,
  },

  // ── תפריט כריכים לפי יום (0=ראשון … 5=שישי). כל פריט = כריך אחד ──
  sandwichMenu: {
    kids: ['מענדלה', 'מוסיא', 'חנצ׳י'],
    days: {
      0: { 'מענדלה': ['חביתה גבינה', 'אבוקדו'], 'מוסיא': ['גבינה ומלפפון'], 'חנצ׳י': ['טוסט'] },
      1: { 'מענדלה': ['חביתה גבינה', 'אבוקדו'], 'מוסיא': ['חביתה'], 'חנצ׳י': ['אבוקדו'] },
      2: { 'מענדלה': ['חביתה גבינה'], 'מוסיא': ['גבינה וזיתים'], 'חנצ׳י': ['שוקולד'] },
      3: { 'מענדלה': ['חביתה גבינה', 'אבוקדו'], 'מוסיא': ['טוסט'], 'חנצ׳י': ['גבינה'] },
      4: { 'מענדלה': ['חביתה גבינה', 'אבוקדו'], 'מוסיא': ['אבוקדו'], 'חנצ׳י': ['לחם חביתה'] },
      5: { 'מענדלה': ['חביתה גבינה'], 'מוסיא': ['גבינה צהובה'], 'חנצ׳י': ['פיתה צהובה'] },
    },
  },

  // ── מצרכים לכל יום (מהפתק) + קבועים ──
  suppliesByDay: {
    0: ['ביצים', 'גבינה', 'מלפפון', 'לחם', 'אבוקדו', 'קטשופ', 'גבינה צהובה'],
    1: ['ביצים', 'גבינה', 'אבוקדו', 'לחם'],
    2: ['ביצים', 'גבינה', 'זיתים', 'שוקולד', 'לחם'],
    3: ['ביצים', 'גבינה', 'לחם', 'אבוקדו', 'קטשופ', 'גבינה צהובה'],
    4: ['ביצים', 'גבינה', 'אבוקדו', 'לחם'],
    5: ['ביצים', 'גבינה', 'גבינה צהובה', 'פיתה', 'לחם'],
  },
  suppliesExtra: ['ירקות', 'פירות', 'שתייה'],

  // ── רשימות ──
  lists: {
    sandwiches: ['לחם', 'ממרח', 'ירקות', 'פירות', 'שתייה', 'חטיפים'],
  },

  // ── תבניות טקסט (תפילות) — מדביקים את הנוסח בהגדרות ──
  texts: {
    birchos: '',
    shemaBed: '',
  },

  // תזכורות שמופיעות בזמן בית, לפי יום
  // (הכנת השיעורים — ברשימת "השיעורים השבוע" שמופיעה בכל זמן פנוי)
  homeChecks: [],

  // ── התחנות ──
  stations: [
    // ═════ בוקר ═════
    { id: 'wake', type: 'wake', title: 'השכמה', icon: 'sun', minutes: 0, atKey: 'wakeTime', days: WEEKDAYS },

    { id: 'morning', type: 'routine', title: 'שגרת קימה', icon: 'drop', days: WEEKDAYS, steps: [
      { id: 'modeh',   label: 'מודה אני',               minutes: 1 },
      { id: 'netila',  label: 'נטילת ידיים',            minutes: 1 },
      { id: 'toilet',  label: 'שירותים',                minutes: 4 },
      { id: 'tamei',   label: 'לפנות את הטמא וואסער',   minutes: 1 },
      { id: 'dress',   label: 'להתלבש',                 minutes: 5 },
      { id: 'teeth',   label: 'צחצוח שיניים',           minutes: 3 },
      { id: 'netila2', label: 'נטילת ידיים ליד הכיור',  minutes: 1 },
    ] },

    { id: 'birchos', type: 'text', title: 'ברכות השחר', icon: 'book', minutes: 8, textKey: 'birchos', appKey: 'limud', path: 'session.html?u=tfl:shacharit:{wd}&min=10&free=1', days: WEEKDAYS },

    // מופיע בבוקר רק אם לא סומן בערב שלפני
    { id: 'shopping', type: 'supplies', title: 'מצרכים לכריכים', icon: 'list', minutes: 3, target: 'today',
      sub: 'לא סומן אתמול בערב', days: WEEKDAYS },

    // הכריכים לפי התפריט של היום (הגדרות ← כריכים), ועוד ירקות
    { id: 'sandwiches', type: 'routine', title: 'כריכים וקופסאות אוכל', icon: 'box', days: WEEKDAYS,
      menu: true, perItem: 4, finish: 'הכל מוכן', steps: [
      { id: 'veg', label: 'ירקות לכל הקופסאות', minutes: 5 },
    ] },

    { id: 'drive_kids', type: 'drive', title: 'פיזור הילדים', icon: 'car', legs: ['tzivia', 'mendele', 'gan'], days: WEEKDAYS },
    { id: 'drive_mikveh', type: 'drive', title: 'למקווה', icon: 'car', legs: ['mikveh'], canDrop: true, days: WEEKDAYS },
    { id: 'mikveh', type: 'timer', title: 'מקווה', icon: 'drop', minutes: 20, canDrop: true, days: WEEKDAYS },
    { id: 'drive_shul', type: 'drive', title: 'לבית הכנסת', icon: 'car', legs: ['shul'], days: WEEKDAYS },

    { id: 'pick_shacharit', type: 'minyan', title: 'איזה מניין?', icon: 'clock', prayer: 'shacharit', minutes: 1, days: WEEKDAYS },
    { id: 'study_am', type: 'study', title: 'חסידות לפני התפילה', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true,
      sub: 'או קרבנות של שחרית', days: WEEKDAYS },
    { id: 'shacharit', type: 'prayer', title: 'שחרית', icon: 'shul', prayer: 'shacharit', days: WEEKDAYS },
    { id: 'study_post', type: 'study', title: 'נשאר זמן — לימוד', icon: 'book', appKey: 'limud', fill: true,
      optional: true, minMinutes: 5, maxByDay: { 5: 30 }, days: WEEKDAYS,
      options: [
        { label: 'חת״ת', path: 'index.html?go=1&until={end}' },
        { label: 'תהילים', path: 'tehillim.html', days: [5] },
      ] },

    // ═════ כולל (א׳–ה׳) ═════
    { id: 'shiur_prep', type: 'note', title: 'לפני הכולל', icon: 'print', minutes: 10, squeeze: 0, days: SUN_THU,
      check: 'צריך להדפיס דפים לשיעור?', ask: 'מה אני מוסר היום?' },
    { id: 'drive_kollel', type: 'drive', title: 'לכולל', icon: 'car', legs: ['kollel'], arriveBy: '10:00', protect: true, days: SUN_THU },
    { id: 'kollel', type: 'camera', title: 'שיעור בכולל', icon: 'camera', at: '10:00', minutes: 90, days: SUN_THU, lesson: true, protect: true,
      sub: 'להפעיל הקלטה לפני שמתחילים' },
    { id: 'edit_kollel', type: 'app', title: 'עריכה והעלאה ליוטיוב', icon: 'film', appKey: 'editor', minutes: 20, days: [0, 1, 3, 4] },
    { id: 'drive_home1', type: 'drive', title: 'הביתה', icon: 'car', legs: ['home'], days: [0, 1, 3, 4] },

    // שלישי — שיעור עם אלכס שכנר בנחום לוין (הבניין שבו היה דיסקונט)
    { id: 'drive_alex', type: 'drive', title: 'לשיעור עם אלכס', icon: 'car', legs: ['alex'], arriveBy: '11:45', days: [2] },
    { id: 'alex_shiur', type: 'timer', title: 'שיעור עם אלכס שכנר', icon: 'book', at: '11:45', minutes: 45, days: [2], lesson: true,
      sub: 'נחום לוין — הבניין שבו היה דיסקונט' },

    // ═════ שישי — מבצעים ═════
    { id: 'mivtzaim', type: 'counter', title: 'מבצעים', icon: 'hand', fill: true, days: [5],
      counterLabel: 'הנחות תפילין', sub: 'בסוף — לדווח כמה הנחות היו' },
    { id: 'fri_pick1', type: 'drive', title: 'לאסוף את צביה', icon: 'car', legs: ['tzivia'], days: [5] },
    { id: 'fri_mendele', type: 'drive', title: 'לאסוף את מענדלה', icon: 'car', legs: ['mendele_pick'], arriveBy: '11:45', days: [5] },
    { id: 'fri_girls', type: 'drive', title: 'לאסוף את הבנות מהגן', icon: 'car', legs: ['gan'], arriveBy: '12:00', days: [5] },
    { id: 'drive_home_fri', type: 'drive', title: 'הביתה', icon: 'car', legs: ['home'], days: [5] },
    { id: 'crm_ad', type: 'app', title: 'מודעה לשבת', icon: 'send', appKey: 'crm', minutes: 15, days: [5],
      sub: 'להוציא מודעה לשבת מתוך ה-CRM' },
    { id: 'home_fri', type: 'home', title: 'זמן בית', icon: 'home', fill: true, days: [5] },
    { id: 'shabbat_prep', type: 'routine', title: 'הכנות לשבת', icon: 'candle', days: [5], endByZman: 'candles', steps: [
      { id: 'clothes', label: 'בגדי שבת',       minutes: 10 },
      { id: 'table',   label: 'לערוך שולחן',    minutes: 20 },
      { id: 'candles', label: 'להכין נרות',     minutes: 10 },
      { id: 'parasha', label: 'שניים מקרא',     minutes: 30 },
      { id: 'showers', label: 'מקלחות',         minutes: 30 },
    ] },
    { id: 'shabbat_in', type: 'shabbat', title: 'כניסת שבת', icon: 'candle', minutes: 0, atZman: 'candles', days: [5] },

    // ═════ צהריים (א׳–ה׳) ═════
    { id: 'tasks', type: 'tasks', title: 'משימות להיום', icon: 'list', fill: true, days: SUN_THU,
      sub: 'אין משימות? הזמן שנותר — להתרים' },
    { id: 'drive_mendele', type: 'drive', title: 'לאסוף את מענדלה מ״יין בעיר״', icon: 'car', legs: ['mendele_pick'], arriveBy: '14:20', days: [0, 1, 3, 4] },
    { id: 'drive_mendele_home', type: 'drive', title: 'להביא את מענדלה הביתה', icon: 'car', legs: ['home'], days: [0, 1, 3, 4] },
    { id: 'drive_mendele_tue', type: 'drive', title: 'לאסוף את מענדלה מ״יין בעיר״', icon: 'car', legs: ['mendele_pick'], arriveBy: '12:45', days: [2] },
    { id: 'drive_home_tue', type: 'drive', title: 'הביתה', icon: 'car', legs: ['home'], days: [2] },
    { id: 'edit_kollel_tue', type: 'app', title: 'עריכה והעלאה ליוטיוב', icon: 'film', appKey: 'editor', minutes: 20, days: [2] },
    { id: 'tasks2', type: 'tasks', title: 'משימות להיום', icon: 'list', fill: true, until: '14:00', days: [2] },
    { id: 'drive_mincha', type: 'drive', title: 'למנחה', icon: 'car', legs: ['shul'], days: SUN_THU },
    { id: 'study_pm', type: 'study', title: 'חת״ת, רמב״ם וקרבנות', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true, days: SUN_THU },
    { id: 'mincha', type: 'prayer', title: 'מנחה', icon: 'shul', prayer: 'mincha', days: SUN_THU },
    { id: 'study_after_mincha', type: 'study', title: 'המשך לימוד', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', fill: true, days: SUN_THU },
    { id: 'drive_tzivia', type: 'drive', title: 'לאסוף את הבנות ואת צביה', icon: 'car', legs: ['gan', 'tzivia'], chooseOrder: true, at: '15:30', days: SUN_THU },
    { id: 'drive_home2', type: 'drive', title: 'הביתה', icon: 'car', legs: ['home'], days: SUN_THU },

    // מצרכים למחר — כמה שיותר מוקדם: נכנס לזמן הפנוי הראשון אחרי שחוזרים הביתה
    { id: 'supplies_eve', type: 'supplies', title: 'מצרכים לכריכים של מחר', icon: 'list', minutes: 3, target: 'tomorrow',
      flex: true, flexAfter: 'drive_home2', flexFallback: 'plan_tomorrow', days: SUN_THU },

    // ═════ ערב ═════
    { id: 'home_time', type: 'home', title: 'זמן בית', icon: 'home', fill: true, days: SUN_THU },
    { id: 'showers', type: 'routine', title: 'מקלחות', icon: 'drop', at: '18:45', days: SUN_THU, steps: [
      { id: 'prep',    label: 'להכין מגבות ופיג׳מות', minutes: 5 },
      { id: 'kids1',   label: 'מקלחת — מענדלה',       minutes: 10 },
      { id: 'kids2',   label: 'מקלחת — צביה',          minutes: 10 },
      { id: 'kids3',   label: 'מקלחת — שאר הילדים',    minutes: 15 },
      { id: 'clean',   label: 'לסדר את המקלחת',        minutes: 5 },
    ] },

    { id: 'bedtime_kids', type: 'open', title: 'השכבת הילדים', icon: 'moon', minutes: 30, learn: true, learnKey: 'bedtime_kids',
      nudgeEvery: 10, days: SUN_THU, items: ['קריאת שמע עם הילדים', 'סיפור', 'לשכב ליד צביה עד שתירדם'] },
    { id: 'laundry', type: 'routine', title: 'כביסת חולצות', icon: 'drop', flex: true, flexAfter: 'bedtime_kids', flexFallback: 'plan_tomorrow', every: 3, from: '2026-10-17', countTitle: 'כביסת חולצות ({n})', days: SUN_THU,
      notifyAfter: { minutes: 60, title: 'המכונה סיימה', body: 'לתלות את החולצות' },
      sub: 'אחרי שמכניסים — המכונה כשעה, תגיע תזכורת', steps: [
      { id: 'sh1',  label: 'טיפול בחולצה 1',          minutes: 5, nth: 1 },
      { id: 'sh2',  label: 'טיפול בחולצה 2',          minutes: 5, nth: 2 },
      { id: 'sh3',  label: 'טיפול בחולצה 3',          minutes: 5, nth: 3 },
      { id: 'soak', label: 'שהייה בחומר',            minutes: 15 },
      { id: 'in',   label: 'להכניס למכונה ולהפעיל',   minutes: 1 },
    ] },
    { id: 'home_time2', type: 'home', title: 'זמן בית', icon: 'home', fill: true, days: SUN_THU },

    // שיעור ערב ברוסית — ראשון ושלישי
    { id: 'drive_shiur', type: 'drive', title: 'לשיעור', icon: 'car', legs: ['shiur'], arriveBy: '20:30', days: SHIUR_DAYS },
    { id: 'shiur_eve', type: 'camera', title: 'שיעור ערב (רוסית)', icon: 'camera', at: '20:30', minutes: 60, days: SHIUR_DAYS, lesson: true },
    { id: 'edit_eve', type: 'app', title: 'העלאת השיעור — רוסית', icon: 'film', appKey: 'editor', minutes: 15, days: SHIUR_DAYS },

    { id: 'pick_maariv', type: 'minyan', title: 'מעריב — מתי?', icon: 'clock', prayer: 'maariv', minutes: 1, days: SUN_THU },
    { id: 'drive_maariv', type: 'drive', title: 'למעריב', icon: 'car', legs: ['shul'], days: SUN_THU },
    { id: 'maariv', type: 'prayer', title: 'מעריב', icon: 'shul', prayer: 'maariv', days: SUN_THU },
    { id: 'drive_home3', type: 'drive', title: 'הביתה', icon: 'car', legs: ['home'], days: SUN_THU },

    // מוצאי שבת — מתחיל בצאת השבת
    { id: 'motzash', type: 'plan', title: 'שבוע טוב — משימות למחר', icon: 'plus', minutes: 10, atZman: 'havdala', days: [6] },
    { id: 'supplies_motzash', type: 'supplies', title: 'מצרכים לכריכים של מחר', icon: 'list', minutes: 3, target: 'tomorrow', days: [6] },
    { id: 'showers_motzash', type: 'routine', title: 'מקלחות', icon: 'drop', days: [6], steps: [
      { id: 'prep',    label: 'להכין מגבות ופיג׳מות', minutes: 5 },
      { id: 'kids1',   label: 'מקלחת — מענדלה',       minutes: 10 },
      { id: 'kids2',   label: 'מקלחת — צביה',          minutes: 10 },
      { id: 'kids3',   label: 'מקלחת — שאר הילדים',    minutes: 15 },
      { id: 'clean',   label: 'לסדר את המקלחת',        minutes: 5 },
    ] },
    { id: 'bedtime_kids_motzash', type: 'open', title: 'השכבת הילדים', icon: 'moon', minutes: 30, learn: true, learnKey: 'bedtime_kids',
      nudgeEvery: 10, days: [6], items: ['קריאת שמע עם הילדים', 'סיפור', 'לשכב ליד צביה עד שתירדם'] },
    { id: 'laundry_motzash', type: 'routine', title: 'כביסת חולצות', icon: 'drop', flex: true, flexAfter: 'bedtime_kids_motzash', flexFallback: 'day_close', every: 3, from: '2026-10-17', countTitle: 'כביסת חולצות ({n})', days: [6],
      notifyAfter: { minutes: 60, title: 'המכונה סיימה', body: 'לתלות את החולצות' },
      sub: 'אחרי שמכניסים — המכונה כשעה, תגיע תזכורת', steps: [
      { id: 'sh1',  label: 'טיפול בחולצה 1',          minutes: 5, nth: 1 },
      { id: 'sh2',  label: 'טיפול בחולצה 2',          minutes: 5, nth: 2 },
      { id: 'sh3',  label: 'טיפול בחולצה 3',          minutes: 5, nth: 3 },
      { id: 'soak', label: 'שהייה בחומר',            minutes: 15 },
      { id: 'in',   label: 'להכניס למכונה ולהפעיל',   minutes: 1 },
    ] },
    { id: 'home_motzash', type: 'home', title: 'זמן פנוי — הכנת שיעורים', icon: 'home', fill: true, days: [6] },
    { id: 'plan_tomorrow', type: 'plan', title: 'משימות למחר', icon: 'plus', minutes: 5, days: SUN_THU },
    { id: 'catchup', type: 'checklist', title: 'להשלים לפני השינה', icon: 'list', minutes: 30, days: SUN_THU,
      items: ['חת״ת', 'רמב״ם', 'הכנת שיעור'], sub: 'סמן מה כבר נעשה' },
    { id: 'day_close', type: 'close', title: 'סגירת יום', icon: 'moon', minutes: 1, days: [0, 1, 2, 3, 4, 6] },
    { id: 'shema_bed', type: 'text', title: 'קריאת שמע שעל המיטה', icon: 'book', minutes: 8, textKey: 'shemaBed', appKey: 'limud', path: 'session.html?u=tfl:shema:{wd}&min=10&free=1', days: [0, 1, 2, 3, 4, 6] },
    { id: 'bedtime', type: 'routine', title: 'לישון', icon: 'moon', days: [0, 1, 2, 3, 4, 6], steps: [
      { id: 'pajama', label: 'פיג׳מה',               minutes: 3 },
      { id: 'teeth',  label: 'שיניים',               minutes: 3 },
      { id: 'negel',  label: 'נעגל וואסער ליד המיטה', minutes: 1 },
      { id: 'bed',    label: 'למיטה',                minutes: 1 },
    ] },
    { id: 'sleep', type: 'sleep', title: 'לילה טוב', icon: 'moon', minutes: 0, days: [0, 1, 2, 3, 4, 6] },
  ],
};

// מוצאי שבת: יום ראשון מתחיל רגיל; מוצ״ש עצמו — אין תבנית (הטלפון חופשי)

export const STATION_TYPES = {
  wake:      'השכמה',
  routine:   'שגרה עם טיימר',
  text:      'טקסט',
  checklist: 'רשימת סימון',
  drive:     'נסיעה',
  timer:     'טיימר',
  minyan:    'בחירת מניין',
  study:     'לימוד',
  prayer:    'תפילה',
  note:      'רישום',
  camera:    'צילום שיעור',
  app:       'פתיחת אפליקציה',
  counter:   'מונה',
  tasks:     'משימות',
  home:      'זמן בית',
  plan:      'משימות למחר',
  close:     'סגירת יום',
  sleep:     'שינה',
  supplies:  'מצרכים',
  open:      'פתוחה (נלמדת)',
  shabbat:   'שבת',
};
