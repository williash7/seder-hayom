// בדיקות למנוע היום — רצות בכל בנייה. אם משהו כאן נכשל, הבנייה נעצרת.
import { planDay, evaluateMinyan } from '../../lib/engine';
import { DEFAULT_SETTINGS as S } from '../../lib/defaults';
import { toMin, toTime } from '../../lib/time';
import { weekLessons } from '../../lib/lessons';

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
ok(toTime(find(p, 'alex_shiur').plannedStart) === '11:45', 'שלישי — שיעור עם אלכס ב-11:45');
ok(find(p, 'drive_mendele_tue').late < 1, 'שלישי — מספיקים למענדלה אחרי השיעור');
for (let i = 1; i < p.list.length; i++) if (p.list[i].plannedStart + 0.01 < p.list[i - 1].plannedEnd) ok(false, 'שלישי — חפיפה: ' + p.list[i].title);
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
p = planDay({ settings: S, date: new Date('2026-10-24T09:00:00'), state: {}, zmanim: { ...z, havdala: '18:45' }, now: 540 });
ok(p.current?.id === 'motzash' && toTime(p.current.plannedStart) === '18:45', 'שבת — התכנית מתחילה רק בצאת השבת');
ok(!find(p, 'shacharit') && !find(p, 'wake'), 'שבת — אין תחנות של יום חול');

// השיעורים השבוע
const wl = weekLessons(S, new Date('2026-10-17T20:00:00'));  // מוצאי שבת → השבוע הבא
ok(wl.length === 8, 'מוצ״ש — 8 שיעורים בשבוע הבא (5 כולל, 2 ערב, אלכס) — יצא ' + wl.length);
ok(wl[0].date === '2026-10-18' && wl[0].at === '10:00', 'הראשון — כולל ביום ראשון');
const wt = weekLessons(S, new Date('2026-10-20T09:00:00'));  // שלישי
ok(wt.every(l => l.date >= '2026-10-20') && wt.some(l => l.title.includes('אלכס')), 'שלישי — רק מהיום והלאה, כולל אלכס');
p = planDay({ settings: S, date: new Date('2026-10-24T09:00:00'), state: {}, zmanim: { ...z, havdala: '18:45' }, now: 540 });
ok(!!find(p, 'showers_motzash'), 'מוצ״ש — מקלחות');

// כביסת חולצות — כל 3 ימים מ-17.10; שישי מוקדם לחמישי (ואז 2 חולצות)
const wash = [];
for (let i = 0; i < 21; i++) {
  const d = new Date(2026, 9, 17 + i, 12);
  const st = planDay({ settings: S, date: d, state: {}, zmanim: { ...z, havdala: '18:45' }, now: 300 }).list.find(x => x.id.startsWith('laundry'));
  if (st) wash.push(`${d.getDate()}:${st.steps.filter(x => x.nth).length}`);
}
ok(wash.join(',') === '17:3,20:3,22:2,25:3,28:3,31:3,3:3,5:2', 'כביסה — ' + wash.join(','));

// השכבת הילדים — בכל ערב כולל מוצ״ש, משך נלמד
import { applyLearned } from '../../lib/learn';
const S2 = applyLearned(S, { bedtime_kids: [40, 50, 45] });
p = planDay({ settings: S2, date: sun, state: {}, zmanim: z, now: 300 });
ok(Math.round(find(p, 'bedtime_kids').duration) === 45, 'השכבה — 45 דק׳ לפי הממוצע שנלמד');
ok(find(p, 'bedtime_kids').plannedStart === find(p, 'showers').plannedEnd, 'השכבה מיד אחרי המקלחות');
p = planDay({ settings: S2, date: new Date('2026-10-24T09:00:00'), state: {}, zmanim: { ...z, havdala: '18:45' }, now: 540 });
ok(!!find(p, 'bedtime_kids_motzash'), 'מוצ״ש — השכבת הילדים');

// כביסה גמישה — נכנסת לזמן הפנוי הראשון שמספיק לה
{
  const tue = new Date(2026, 9, 20, 12), mon = new Date(2026, 9, 19, 12);   // 20.10 יום כביסה, 19.10 לא
  const S3 = { ...S2, stations: S2.stations.map(x => x.id === 'laundry' ? { ...x, from: '2026-10-19' } : x) }; // לבדיקה: גם ב-19
  let q = planDay({ settings: S2, date: tue, state: {}, zmanim: z, now: 300 });
  const L = find(q, 'laundry'), pt = find(q, 'plan_tomorrow');
  ok(L && L.plannedStart >= find(q, 'drive_home3').plannedEnd - 0.5, 'שלישי (שיעור ערב) — הכביסה אחרי החזרה מהמעריב, ב-' + toTime(L.plannedStart));
  q = planDay({ settings: S3, date: mon, state: {}, zmanim: z, now: 300 });
  const L2 = find(q, 'laundry');
  ok(L2 && toTime(L2.plannedStart) === toTime(find(q, 'bedtime_kids').plannedEnd), 'שני (בלי שיעור) — הכביסה מיד אחרי שהילדים נרדמו, ב-' + toTime(L2.plannedStart));
  for (let i = 1; i < q.list.length; i++) if (q.list[i].plannedStart + 0.01 < q.list[i - 1].plannedEnd) ok(false, 'חפיפה: ' + q.list[i].title);
  // מוצ״ש — אין שום דבר קבוע בהמשך הערב: הכביסה מיד אחרי ההשכבה, לפני הזמן הפנוי
  q = planDay({ settings: S2, date: new Date(2026, 9, 17, 21), state: {}, zmanim: { ...z, havdala: '18:41' }, now: 20 * 60 });
  const ids = q.list.map(x => x.id);
  ok(ids.indexOf('laundry_motzash') === ids.indexOf('bedtime_kids_motzash') + 1, 'מוצ״ש — כביסה מיד אחרי השכבת הילדים: ' + ids.join(' > '));
}

// כריכים לפי תפריט
{
  const q = planDay({ settings: S2, date: new Date(2026, 9, 18, 6), state: {}, zmanim: z, now: 300 });
  const sw = find(q, 'sandwiches');
  ok(sw.steps.length === 5 && sw.steps[0].label === 'מענדלה — חביתה גבינה' && sw.steps.at(-1).id === 'veg', 'ראשון — 4 כריכים + ירקות');
  const q2 = planDay({ settings: S2, date: new Date(2026, 9, 20, 6), state: {}, zmanim: z, now: 300 });
  ok(find(q2, 'sandwiches').steps.filter(x => x.label.startsWith('מענדלה')).length === 1, 'שלישי — למענדלה כריך אחד');
  const ids = q.list.map(x => x.id);
  ok(ids.indexOf('supplies_eve') === ids.indexOf('drive_home2') + 1, 'מצרכים למחר — מיד כשחוזרים הביתה');
  const S4 = { ...S2, stations: S2.stations.map(x => x.id === 'shopping' ? { ...x, enabled: false } : x) };
  ok(!find(planDay({ settings: S4, date: new Date(2026, 9, 18, 6), state: {}, zmanim: z, now: 300 }), 'shopping'), 'סומן בערב — לא מופיע בבוקר');
}

if (failed) { console.error(`\n${failed} בדיקות נכשלו`); process.exit(1); }
console.log('\nכל הבדיקות עברו');
