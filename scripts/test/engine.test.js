// בדיקות למנוע היום — רצות בכל בנייה. אם משהו כאן נכשל, הבנייה נעצרת.
import { planDay, evaluateMinyan } from '../../lib/engine';
import { DEFAULT_SETTINGS as S } from '../../lib/defaults';
import { toMin, toTime } from '../../lib/time';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('✗ ' + msg); } else console.log('✓ ' + msg); };
const z = { sofZmanShma: '09:12', sofZmanTfilla: '10:10', candles: '17:08', sunset: '17:26', tzeit: '17:50' };
const find = (p, id) => p.list.find(s => s.id === id);

// יום ראשון לפני הקימה
const sun = new Date('2026-10-18T05:00:00');
let p = planDay({ settings: S, date: sun, state: {}, zmanim: z, now: toMin('05:00') });
ok(p.current?.id === 'wake', 'לפני הקימה — התחנה הנוכחית היא השכמה');
ok(toTime(find(p, 'kollel').plannedStart) === '10:00', 'הכולל ב-10:00');
ok(toTime(find(p, 'drive_mendele').plannedEnd) === '14:00', 'מגיעים למענדלה ב-14:00');
ok(toTime(find(p, 'showers').plannedStart) === '18:45', 'מקלחות ב-18:45');
ok(!!find(p, 'shiur_eve'), 'ביום ראשון יש שיעור ערב');
ok(p.list.every(s => s.plannedEnd >= s.plannedStart), 'אין תחנה שנגמרת לפני שהתחילה');
for (let i = 1; i < p.list.length; i++) {
  if (p.list[i].plannedStart + 0.01 < p.list[i - 1].plannedEnd) ok(false, 'חפיפה: ' + p.list[i].title);
}

// בבית הכנסת ב-08:02 — בחירת מניין
const st = { stations: {} };
let m = toMin('06:50');
for (const id of ['wake', 'morning', 'birchos', 'shopping', 'sandwiches', 'drive_kids', 'drive_mikveh', 'mikveh', 'drive_shul']) {
  st.stations[id] = { status: 'done', start: m, end: m + 8 }; m += 8;
}
const opts = evaluateMinyan({ settings: S, date: sun, state: st, zmanim: z, now: m, prayer: 'shacharit' });
ok(!opts.find(o => o.time === '08:00').reachable, 'מניין 08:00 כבר עבר');
ok(opts.find(o => o.time === '08:30').ok, 'מניין 08:30 — מספיקים לכולל');
ok(opts.find(o => o.time === '09:30').after.late > 1, 'מניין 09:30 — איחור לכולל');
p = planDay({ settings: S, date: sun, state: { ...st, choices: { shacharit: '08:30' } }, zmanim: z, now: m });
ok(Math.round(find(p, 'study_am').duration) === 27, 'הלימוד לפני התפילה ממלא את הזמן עד 08:30');

// שלישי — איסוף מענדלה ב-12:45
const tue = new Date('2026-10-20T05:00:00');
p = planDay({ settings: S, date: tue, state: {}, zmanim: z, now: toMin('05:00') });
ok(toTime(find(p, 'drive_mendele_tue').plannedEnd) === '12:45', 'שלישי — מענדלה ב-12:45');
ok(!find(p, 'drive_mendele'), 'שלישי — אין איסוף של 14:00');
ok(find(p, 'drive_mendele_tue').legs[0] === 'mendele_pick', 'מענדלה נאסף מ״יין בעיר״');

// שישי — מבצעים והכנות לשבת עד הדלקת נרות
const fri = new Date('2026-10-23T05:00:00');
p = planDay({ settings: S, date: fri, state: {}, zmanim: z, now: toMin('05:00') });
ok(!!find(p, 'mivtzaim') && !find(p, 'kollel'), 'שישי — מבצעים במקום כולל');
ok(toTime(find(p, 'shabbat_prep').plannedEnd) === '17:08', 'הכנות לשבת נגמרות בהדלקת נרות');
ok(toTime(find(p, 'fri_mendele').plannedEnd) === '11:45', 'שישי — מענדלה עד 11:45');
ok(toTime(find(p, 'fri_girls').plannedEnd) === '12:00', 'שישי — הבנות עד 12:00');
ok(toTime(find(p, 'mivtzaim').plannedEnd) === toTime(find(p, 'fri_pick1').plannedStart), 'המבצעים נמשכים עד היציאה לאיסוף');

// קמים מאוחר בשישי — כל המניינים עברו: אין "איחור" לשחרית
p = planDay({ settings: S, date: fri, state: { stations: { wake: { status: 'done', start: 636, end: 636 } } }, zmanim: z, now: 636 });
ok(!find(p, 'shacharit').anchor && !(p.nextAnchor && p.nextAnchor.id === 'shacharit'), 'אחרי המניין האחרון — שחרית בלי עוגן ובלי איחור');
ok(find(p, 'study_am').path.includes('{end}'), 'לימוד לפני התפילה נפתח עד שעת הסיום');

// שישי — יש גם מניין 10:00
const fopts = evaluateMinyan({ settings: S, date: fri, state: { stations: { wake: { status: 'done', start: 560, end: 560 } } }, zmanim: z, now: 560, prayer: 'shacharit' });
ok(fopts.some(o => o.time === '10:00'), 'שישי — מניין 10:00 ברשימה');
const sopts = evaluateMinyan({ settings: S, date: sun, state: {}, zmanim: z, now: 300, prayer: 'shacharit' });
ok(!sopts.some(o => o.time === '10:00'), 'ראשון — אין מניין 10:00');

// אחרי שחרית: אם נשאר זמן — לימוד; אם לא — מדלגים בשקט
p = planDay({ settings: S, date: sun, state: { ...st, choices: { shacharit: '08:30' } }, zmanim: z, now: m });
ok(Math.round(find(p, 'study_post').duration) === 20, 'ראשון אחרי מניין 08:30 — 20 דק׳ לימוד עד היציאה לכולל');
p = planDay({ settings: S, date: sun, state: { ...st, choices: { shacharit: '09:00' } }, zmanim: z, now: m });
ok(find(p, 'study_post').status === 'auto', 'ראשון אחרי מניין 09:00 — אין זמן, מדלגים בשקט');
p = planDay({ settings: S, date: sun, state: { ...st, choices: { shacharit: '07:30' } }, zmanim: z, now: toMin('07:20') });
ok(find(p, 'study_post').duration >= 5, 'ראשון אחרי מניין מוקדם — יש לימוד אחרי שחרית');
p = planDay({ settings: S, date: fri, state: {}, zmanim: z, now: toMin('05:00') });
ok(find(p, 'study_post').duration <= 30 && find(p, 'mivtzaim').duration > 30, 'שישי — עד חצי שעה לימוד, והשאר למבצעים');

// שבת — אין תחנות
p = planDay({ settings: S, date: new Date('2026-10-24T09:00:00'), state: {}, zmanim: z, now: 540 });
ok(p.empty, 'בשבת אין תכנית');

if (failed) { console.error(`\n${failed} בדיקות נכשלו`); process.exit(1); }
console.log('\nכל הבדיקות עברו');
