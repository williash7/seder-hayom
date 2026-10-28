// בדיקות למנוע היום — רצות בכל בנייה. אם משהו כאן נכשל, הבנייה נעצרת.
import { planDay, evaluateMinyan } from '../../lib/engine';
import { DEFAULT_SETTINGS as S } from '../../lib/defaults';
import { toMin, toTime } from '../../lib/time';
import { weekLessons } from '../../lib/lessons';
import { INBOX } from '../../lib/inbox';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('✗ ' + msg); } else console.log('✓ ' + msg); };
const z = { sofZmanShma: '09:12', sofZmanTfilla: '10:10', candles: '17:08', sunset: '17:26', tzeit: '17:50' };
const find = (p, id) => p.list.find(s => s.id === id);

// יום ראשון לפני הקימה
const sun = new Date('2026-10-18T05:00:00');
let p = planDay({ settings: S, date: sun, state: {}, zmanim: z, now: toMin('05:00') });
ok(p.current?.id === 'wake', 'לפני הקימה — התחנה הנוכחית היא השכמה');
ok(toTime(find(p, 'kollel').plannedStart) === '10:00', 'הכולל ב-10:00');
ok(toTime(find(p, 'drive_mendele').plannedEnd) === '14:20', 'מגיעים למענדלה ב-14:20');
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
ok(!opts.find(o => o.time === '07:30').reachable && opts.find(o => o.time === '08:00').reachable, 'מניין 07:30 עבר; 08:00 — מצטרפים באמצע');
ok(opts.find(o => o.time === '08:30').ok, 'מניין 08:30 — מספיקים לכולל');
ok(!opts.some(o => o.time === '09:30'), 'ראשון — אין מניין 09:30');
p = planDay({ settings: S, date: sun, state: { ...st, choices: { shacharit: '08:30' } }, zmanim: z, now: m });
ok(Math.round(find(p, 'study_am').duration) === 17 && toTime(find(p, 'korbanot').plannedStart) === '08:20', 'הלימוד עד 08:20, קרבנות, ומניין 08:30');

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
ok(Math.round(find(p, 'study_post').duration) === 35, 'ראשון אחרי מניין 08:30 — 35 דק׳ לימוד עד היציאה לכולל');
p = planDay({ settings: S, date: sun, state: { ...st, choices: { shacharit: '09:15' } }, zmanim: z, now: m });
ok(find(p, 'study_post').status === 'auto', 'ראשון אחרי מניין 09:15 — אין זמן, מדלגים בשקט');
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
ok(wl.length === 9, 'מוצ״ש — 9 שיעורים בשבוע הבא (5 כולל, 2 ערב, אלכס, בר מצווה) — יצא ' + wl.length);
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
ok(wash.join(',') === '17:3,20:3,22:2,25:3,28:3,31:3', 'כביסה (3.11 ואילך — ימי טיסה, בלי כביסה) — ' + wash.join(','));

// השכבת הילדים — בכל ערב כולל מוצ״ש, משך נלמד
import { applyLearned } from '../../lib/learn';
import { sleepPlan, applySleepPlan } from '../../lib/sleep';
import { parsePlan } from '../../lib/parsePlan';
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
  ok(sw.steps.length === 6 && sw.steps[0].label === 'מענדלה — חביתה גבינה' && sw.steps.at(-1).id === 'water', 'ראשון — 4 כריכים + ירקות + מים');
  const q2 = planDay({ settings: S2, date: new Date(2026, 9, 20, 6), state: {}, zmanim: z, now: 300 });
  ok(find(q2, 'sandwiches').steps.filter(x => x.label.startsWith('מענדלה')).length === 1, 'שלישי — למענדלה כריך אחד');
  const ids = q.list.map(x => x.id);
  ok(ids.indexOf('supplies_eve') > ids.indexOf('drive_home3') &&
     ids.indexOf('supplies_eve') < ids.indexOf('plan_tomorrow') &&
     ids.indexOf('plan_tomorrow') < ids.indexOf('catchup') &&
     ids.indexOf('catchup') < ids.indexOf('prepare_tomorrow') &&
     ids.indexOf('prepare_tomorrow') < ids.indexOf('day_close'),
     'הכנות למחר — בערב לאחר החזרה ולפני סגירת היום');
  const S4 = { ...S2, stations: S2.stations.map(x => x.id === 'shopping' ? { ...x, enabled: false } : x) };
  ok(!find(planDay({ settings: S4, date: new Date(2026, 9, 18, 6), state: {}, zmanim: z, now: 300 }), 'shopping'), 'סומן בערב — לא מופיע בבוקר');
}

// הכולל ב-10:00 — עוגן מוגן
{
  const day = new Date(2026, 9, 18, 6);
  const mk = upto => { const st = { stations: {} }; let m = toMin('06:30'); for (const id of upto) { st.stations[id] = { status: 'done', start: m, end: m + 1 }; m += 1; } return st; };
  const before = ['wake', 'morning', 'birchos', 'shopping', 'sandwiches', 'drive_kids'];
  // מגיעים לבית הכנסת ב-9:01 (כמו היום): מניין 9:15, ההכנה מתבטלת, בכולל ב-10:00
  let st = mk([...before, 'drive_mikveh', 'mikveh', 'drive_shul']);
  let q = planDay({ settings: S2, date: day, state: st, zmanim: z, now: toMin('09:01') });
  ok(toTime(find(q, 'shacharit').anchor?.start) === '09:00' && find(q, 'shacharit').late < 0.5, 'מגיעים 9:01 — מצטרפים למניין 9:00 באמצע (עד רבע שעה)');
  ok(find(q, 'kollel').late < 0.5 && find(q, 'drive_kollel').late < 0.5, 'מגיעים 9:01 — בכולל ב-10:00 בלי איחור');
  // מגיעים ב-9:20 — אין מניין שמספיק: שחרית ביחידות אחרי הכולל
  q = planDay({ settings: S2, date: day, state: st, zmanim: z, now: toMin('09:20') });
  const sh = q.list.find(x => x.id === 'shacharit');
  ok(sh.alone && q.list.indexOf(sh) > q.list.indexOf(find(q, 'kollel')), 'מגיעים 9:20 — שחרית ביחידות אחרי הכולל');
  ok(find(q, 'kollel').late < 0.5, 'מגיעים 9:20 — הכולל עדיין ב-10:00');
  // עדיין בבית ב-9:35 (לפני מקווה) — מוותרים על המקווה
  st = mk(before);
  q = planDay({ settings: S2, date: day, state: st, zmanim: z, now: toMin('09:35') });
  ok(find(q, 'mikveh').status === 'auto' && find(q, 'kollel').late < 0.5, 'יוצאים ב-9:35 — מוותרים על המקווה, בכולל ב-10:00');
  // אחרי הכולל (11:34) — מה שלפני הכולל ולא סומן כבר עבר, לא חוזרים אליו
  st = mk([...before, 'drive_mikveh', 'mikveh', 'drive_shul', 'pick_shacharit']);
  st.stations.shacharit = { status: 'done', start: toMin('09:15'), end: toMin('09:48') };
  st.stations.drive_kollel = { status: 'done', start: toMin('09:50'), end: toMin('09:58') };
  st.stations.kollel = { status: 'done', start: toMin('10:00'), end: toMin('11:33') };
  q = planDay({ settings: S2, date: day, state: st, zmanim: z, now: toMin('11:34') });
  ok(q.current?.id === 'edit_kollel', 'אחרי הכולל — ממשיכים לעריכה, לא ללימוד/הכנה שלפני הכולל');
  ok(find(q, 'shiur_prep').status === 'auto' && find(q, 'study_post').status === 'auto', 'אחרי הכולל — ההכנה והלימוד של הבוקר עברו');
  // אחרי הכולל, ושחרית עוד לא — שחרית ביחידות עכשיו
  delete st.stations.shacharit;
  q = planDay({ settings: S2, date: day, state: st, zmanim: z, now: toMin('11:34') });
  ok(q.current?.id === 'korbanot' && q.list[q.currentIndex + 1].id === 'shacharit' && q.list[q.currentIndex + 1].alone, 'אחרי הכולל בלי שחרית — קרבנות ושחרית ביחידות עכשיו');
  // התפללו ביחידות אחרי הכולל — מוצג אחרי הכולל, והלאה לעריכה
  st.stations.shacharit = { status: 'done', start: toMin('11:35'), end: toMin('12:05') };
  q = planDay({ settings: S2, date: day, state: st, zmanim: z, now: toMin('12:06') });
  ok(q.current?.id === 'edit_kollel' && q.list.indexOf(find(q, 'shacharit')) > q.list.indexOf(find(q, 'kollel')), 'שחרית אחרי הכולל — במקומה, ואז עריכה');
  for (let i = 1; i < q.list.length; i++) if (q.list[i].plannedStart + 0.01 < q.list[i - 1].plannedEnd) ok(false, 'אחרי הכולל — חפיפה: ' + q.list[i].title);
  // שישי — אין כולל, 9:30 מותר
  const fo = evaluateMinyan({ settings: S2, date: new Date(2026, 9, 23, 6), state: {}, zmanim: z, now: toMin('09:10'), prayer: 'shacharit' });
  ok(fo.some(o => o.time === '09:30'), 'שישי — יש מניין 9:30');
  const so = evaluateMinyan({ settings: S2, date: day, state: {}, zmanim: z, now: 300, prayer: 'shacharit' });
  ok(!so.some(o => o.time === '09:30'), 'ראשון — אין 9:30');
}

// שינוי ליום אחד — הכולל עד 10:45; ביטול תחנה; הזזת שעה גוררת את הנסיעה
{
  const d = new Date(2026, 9, 19, 6);
  let q = planDay({ settings: S, date: d, state: { overrides: { kollel: { minutes: 45 } } }, zmanim: z, now: 300 });
  ok(toTime(find(q, 'kollel').plannedEnd) === '10:45', 'מחר — הכולל עד 10:45');
  q = planDay({ settings: S, date: d, state: {}, zmanim: z, now: 300 });
  ok(toTime(find(q, 'kollel').plannedEnd) === '10:45', 'בשני קבוע — הכולל עד 10:45');
  q = planDay({ settings: S, date: new Date(2026, 9, 21, 6), state: {}, zmanim: z, now: 300 });
  ok(toTime(find(q, 'kollel').plannedEnd) === '11:30', 'ברביעי — הכולל עד 11:30');
  q = planDay({ settings: S, date: d, state: { overrides: { mikveh: { off: true } } }, zmanim: z, now: 300 });
  ok(!find(q, 'mikveh'), 'ביטול תחנה ליום אחד');
  q = planDay({ settings: S, date: d, state: { overrides: { kollel: { at: '10:30' } } }, zmanim: z, now: 300 });
  ok(toTime(find(q, 'kollel').plannedStart) === '10:30' && toTime(find(q, 'drive_kollel').plannedEnd) === '10:30', 'כולל ב-10:30 — גם הנסיעה זזה');
}

// כביסה לפי מתי שנעשתה בפועל: לא כובסה אתמול → מופיעה היום, ונשארת עד שעושים
{
  const S5 = { ...S, cadenceLast: { laundry: { last: '2026-10-14' } } };
  const sun = new Date(2026, 9, 18, 6), mon = new Date(2026, 9, 19, 6);
  let q = planDay({ settings: S5, date: sun, state: {}, zmanim: z, now: 300 });
  ok(!!find(q, 'laundry') && find(q, 'laundry').steps.filter(x => x.id.startsWith('sh')).length === 3, 'לא כובס מאז 14 — היום כביסה (3 חולצות)');
  const S6 = { ...S, cadenceLast: { laundry: { last: '2026-10-18', prev: '2026-10-14' } } };
  ok(!find(planDay({ settings: S6, date: mon, state: {}, zmanim: z, now: 300 }), 'laundry'), 'כובס ראשון — לא בשני');
  ok(!!find(planDay({ settings: S6, date: new Date(2026, 9, 21, 6), state: {}, zmanim: z, now: 300 }), 'laundry'), 'כובס ראשון — שוב ברביעי');
  ok(!!find(planDay({ settings: S6, date: sun, state: {}, zmanim: z, now: 300 }), 'laundry'), 'ביום שכובס — עדיין מופיע (כבוצע)');
}

// שיעור ערב 20:30 (ראשון) — עוגן קבוע: ההשכבה מתקצרת כדי לצאת בזמן
{
  const d = new Date(2026, 9, 18, 6);
  const st = { stations: {} };
  const q0 = planDay({ settings: S, date: d, state: {}, zmanim: z, now: 300 });
  for (const x of q0.list) { if (x.id === 'bedtime_kids') break; st.stations[x.id] = { status: 'done', start: 300, end: 300 }; }
  const q = planDay({ settings: S, date: d, state: st, zmanim: z, now: toMin('19:58') });
  ok(toTime(find(q, 'shiur_eve').plannedStart) === '20:30' && find(q, 'shiur_eve').late < 0.5 && find(q, 'drive_shiur').late < 0.5, 'השכבה ב-19:58 — עדיין בשיעור ב-20:30');
  ok(find(q, 'bedtime_kids').duration >= 10 && find(q, 'bedtime_kids').duration <= 25, 'ההשכבה התקצרה (' + Math.round(find(q, 'bedtime_kids').duration) + ' דק׳)');
  // כבר התחילה ההשכבה ב-20:12 — עדיין נגמרת בזמן לצאת, והבא בתור: לשיעור
  st.stations.bedtime_kids = { start: toMin('20:12') };
  const q2 = planDay({ settings: S, date: d, state: st, zmanim: z, now: toMin('20:12') });
  const nx = q2.list[q2.currentIndex + 1];
  ok(toTime(find(q2, 'bedtime_kids').plannedEnd) === '20:20' && find(q2, 'shiur_eve').late < 0.5, 'השכבה שהתחילה 20:12 — עד 20:20');
  ok(q2.list.slice(q2.currentIndex + 1).find(x => x.status === 'pending')?.id === 'drive_shiur', 'אחרי ההשכבה — לשיעור');
}

// לומדים מהימים האחרונים: הירקות לקחו 8 ו-10 דק׳ → 9; כריך לקח 6 → 6 לכל כריך
{
  const L = applyLearned(S, { 'sandwiches:veg': [8, 10], 'sandwiches:menu': [6, 6], 'shiur_prep': [15] });
  const sw = L.stations.find(x => x.id === 'sandwiches');
  ok(sw.steps.find(x => x.id === 'veg').minutes === 9 && sw.perItem === 6, 'זמני הכריכים נלמדו');
  ok(L.stations.find(x => x.id === 'shiur_prep').minutes === 10, 'מדידה אחת — עוד לא משנים');
}

// הקדמה הדרגתית: קם ב-7:20 ונרדם ב-00:50 → השבוע 7:10 ו-00:40; כשמגיעים — לא לפני היעד
{
  const h = [{ wake: 440, sleep: 1490 }, { wake: 440, sleep: 1490 }];
  const pl = sleepPlan(S, h);
  ok(pl.wake === '07:10' && pl.sleep === '24:40', 'הקדמה של 10 דק׳ מהממוצע (' + pl.wake + ', ' + pl.sleep + ')');
  const pl2 = sleepPlan(S, [{ wake: 392, sleep: 1415 }, { wake: 390, sleep: 1412 }]);
  ok(pl2.wake === '06:30' && pl2.sleep === '23:30', 'לא לפני היעד');
  const e = applySleepPlan(S, pl);
  ok(e.wakeTime === '07:10' && e.dayClose.hardClose === '24:40' && e.dayClose.firstReminder === '23:40', 'מוחל על ההשכמה וסגירת היום');
  ok(sleepPlan(S, []).wake === S.wakeTime, 'בלי נתונים — כמו בהגדרות');
}

// ביחידות — 9:15 הוא הגבול: מתחיל קרבנות 9:05 → בכולל בזמן; 9:25 → אחרי הכולל
{
  const day = new Date(2026, 9, 18, 6);
  const st = { stations: {} };
  for (const id of ['wake', 'morning', 'birchos', 'shopping', 'sandwiches', 'drive_kids', 'drive_mikveh', 'mikveh', 'drive_shul', 'pick_shacharit']) st.stations[id] = { status: 'done', start: 400, end: 400 };
  st.choices = { shacharit: 'alone' };
  let q = planDay({ settings: S, date: day, state: st, zmanim: z, now: toMin('09:05') });
  ok(find(q, 'kollel').late < 0.5 && q.list.indexOf(find(q, 'shacharit')) < q.list.indexOf(find(q, 'kollel')), 'ביחידות מ-9:05 — לפני הכולל');
  q = planDay({ settings: S, date: day, state: st, zmanim: z, now: toMin('09:25') });
  ok(q.list.indexOf(find(q, 'shacharit')) > q.list.indexOf(find(q, 'kollel')) && q.list.indexOf(find(q, 'korbanot')) > q.list.indexOf(find(q, 'kollel')), 'ביחידות מ-9:25 — קרבנות ושחרית אחרי הכולל');
}

// שני: בבית עם הילדים עד ש-מירי חוזרת, איסוף, ומנחה רבע שעה לפני השקיעה (17:26 → 17:10)
{
  const mon = new Date(2026, 9, 19, 6);
  const q = planDay({ settings: S, date: mon, state: {}, zmanim: z, now: 300 });
  ok(!find(q, 'mincha') && toTime(find(q, 'mincha_mon').plannedStart) === '17:10', 'שני — מנחה ב-17:10 לפני השקיעה');
  ok(q.list.indexOf(find(q, 'mincha_mon')) > q.list.indexOf(find(q, 'drive_tzivia')) && find(q, 'drive_tzivia').late < 1, 'שני — קודם האיסוף, אחר כך מנחה');
  ok(find(q, 'tasks').title.includes('מירי'), 'שני — בבית עם הילדים');
  for (let i = 1; i < q.list.length; i++) if (q.list[i].plannedStart + 0.01 < q.list[i - 1].plannedEnd) ok(false, 'שני — חפיפה: ' + q.list[i].title);
}

// שלישי: מגיעים 9:31 — שחרית ביחידות אחרי הכולל, אבל לא על חשבון אלכס ומענדלה
{
  const tue = new Date(2026, 9, 20, 6);
  const st = { stations: {} };
  for (const id of ['wake', 'morning', 'birchos', 'shopping', 'sandwiches', 'drive_kids', 'drive_mikveh', 'mikveh', 'drive_shul']) st.stations[id] = { status: 'done', start: 400, end: 400 };
  const q = planDay({ settings: S, date: tue, state: st, zmanim: z, now: toMin('09:31') });
  ok(find(q, 'kollel').late < 0.5 && find(q, 'alex_shiur').late < 0.5 && find(q, 'drive_alex').late < 0.5 && find(q, 'drive_mendele_tue').late < 0.5, 'שלישי — כולל, אלכס ומענדלה בזמן');
  ok(q.list.indexOf(find(q, 'shacharit')) > q.list.indexOf(find(q, 'alex_shiur')), 'שלישי — שחרית ביחידות אחרי אלכס (' + toTime(find(q, 'shacharit').plannedStart) + ')');
  for (let i = 1; i < q.list.length; i++) if (q.list[i].plannedStart + 0.01 < q.list[i - 1].plannedEnd) ok(false, 'שלישי — חפיפה: ' + q.list[i].title);
}

// שלישי: מנחה 14:00, שיעור בר מצווה 14:30–15:30, ואז איסוף
{
  const q = planDay({ settings: S, date: new Date(2026, 9, 20, 6), state: {}, zmanim: z, now: 300 });
  ok(toTime(find(q, 'mincha').plannedStart) === '14:00' && toTime(find(q, 'barmitzva').plannedStart) === '14:30' && find(q, 'barmitzva').late < 0.5, 'שלישי — מנחה 14:00, בר מצווה 14:30');
  ok(find(q, 'drive_tzivia').late < 0.5, 'שלישי — האיסוף בזמן אחרי הבר מצווה');
  for (let i = 1; i < q.list.length; i++) if (q.list[i].plannedStart + 0.01 < q.list[i - 1].plannedEnd) ok(false, 'שלישי ב״מ — חפיפה: ' + q.list[i].title);
}

// שגרה דינמית: סימנתי מהר — הסוף מתקדם; התעכבתי — הסוף נדחה
{
  const d = new Date(2026, 9, 20, 6);
  const base = { settings: S, date: d, zmanim: z };
  const sh = S.stations.find(x => x.id === 'showers');
  const total = sh.steps.reduce((a, x) => a + x.minutes, 0);
  const start = toMin('19:00');
  // אחרי 2 דק׳ סימנתי את ההכנה (5) — נחסכו 3 דק׳
  let st = { stations: { showers: { start, data: { steps: { prep: start + 2 }, stepStart: start + 2 } } } };
  let q = planDay({ ...base, state: st, now: start + 2, _items: [sh] });
  ok(Math.round(find(q, 'showers').duration) === total - 3, 'סימון מוקדם — הזמן הכולל קטן ב-3 דק׳');
  // מענדלה (10) לוקח 15 — הזמן הכולל גדל ב-5 (פחות ה-3 שנחסכו)
  q = planDay({ ...base, state: st, now: start + 2 + 15, _items: [sh] });
  ok(Math.round(find(q, 'showers').duration) === total - 3 + 5, 'עיכוב — הזמן הכולל גדל');
}

// שינוי בתוכנית: נסיעה למקס סטוק, 20 דק׳ שם, נסיעה לבית חב״ד — נכנס עכשיו, לפני מה שהיה
{
  const d = new Date(2026, 9, 18, 6);
  const S7 = { ...S, places: { ...S.places, p_max: { name: 'מקס סטוק', address: 'עפולה', minutes: 10 } } };
  const st = { stations: {} };
  for (const x of planDay({ settings: S7, date: d, state: {}, zmanim: z, now: 300 }).list) { if (x.id === 'home_time') break; st.stations[x.id] = { status: 'done', start: 300, end: 300 }; }
  const q0 = planDay({ settings: S7, date: d, state: st, zmanim: z, now: toMin('17:00') });
  const cur = q0.current.id;
  const ex = [
    { id: 'x1', batch: 'b', beforeId: cur, type: 'drive', title: 'למקס סטוק', legs: ['p_max'] },
    { id: 'x2', batch: 'b', beforeId: cur, type: 'timer', title: 'מקס סטוק', minutes: 20 },
    { id: 'x3', batch: 'b', beforeId: cur, type: 'drive', title: 'לבית חב״ד', legs: ['chabad_house'] },
  ];
  const q = planDay({ settings: S7, date: d, state: { ...st, extras: ex }, zmanim: z, now: toMin('17:00') });
  ok(q.current.id === 'x1' && q.list[q.currentIndex + 1].id === 'x2' && q.list[q.currentIndex + 2].id === 'x3', 'שינוי בתוכנית — שלוש תחנות לפי הסדר, עכשיו');
  ok(toTime(find(q, 'showers').plannedStart) === '18:45' && find(q, 'showers').late < 0.5, 'שינוי בתוכנית — מה שקבוע לא זז');
}

// הכתבה: "נסיעה למקס סטוק, חצי שעה שם, ואז לבית חבד ולימוד 20 דקות"
{
  const [it, np] = parsePlan('נסיעה למקס סטוק, חצי שעה שם, ואז לבית חבד ולימוד 20 דקות', S.places);
  ok(it.length === 4 && it[0].type === 'drive' && it[1].minutes === 30 && it[1].title === 'מקס סטוק', 'הכתבה — מקס סטוק וחצי שעה שם (' + it.map(x => x.title + ':' + (x.minutes || '')).join(' | ') + ')');
  ok(it[2].type === 'drive' && it[2].legs[0] === 'chabad_house' && it[3].type === 'study' && it[3].minutes === 20, 'הכתבה — בית חב״ד מהשמורים, ולימוד 20 דק׳');
  ok(Object.keys(np).length === 1 && Object.values(np)[0].name === 'מקס סטוק', 'הכתבה — מקס סטוק נשמר כמקום חדש');
  const [it2] = parsePlan('להתקשר לאבא רבע שעה', S.places);
  ok(it2.length === 1 && it2[0].type === 'timer' && it2[0].minutes === 15 && it2[0].title === 'להתקשר לאבא', 'הכתבה — משימה עם זמן');
}

// מכולת: חסר משהו ולא קנינו — בבוקר לפני הכריכים
{
  const q = planDay({ settings: { ...S, shopNeeded: { today: true } }, date: new Date(2026, 9, 21, 6), state: {}, zmanim: z, now: 300 });
  const ids = q.list.map(x => x.id);
  ok(ids.indexOf('shop_am') === ids.indexOf('sandwiches') - 1, 'חסר לכריכים — מכולת לפני הכריכים');
  ok(!find(planDay({ settings: S, date: new Date(2026, 9, 21, 6), state: {}, zmanim: z, now: 300 }), 'shop_am'), 'לא חסר — אין מכולת');
}

// מגיעים 8:59 — מניין 9:00 עדיין אפשרי (עד רבע שעה איחור מצטרפים), ובכולל בזמן
{
  const day = new Date(2026, 9, 21, 6);
  const st = { stations: {} };
  for (const id of ['wake', 'morning', 'birchos', 'shopping', 'sandwiches', 'drive_kids', 'drive_mikveh', 'mikveh', 'drive_shul']) st.stations[id] = { status: 'done', start: 400, end: 400 };
  const o = evaluateMinyan({ settings: S, date: day, state: st, zmanim: z, now: toMin('08:59'), prayer: 'shacharit' });
  const nine = o.find(x => x.time === '09:00');
  ok(nine.reachable && nine.ok, 'מגיעים 8:59 — מניין 9:00 מותר ומספיקים לכולל');
  const q = planDay({ settings: S, date: day, state: st, zmanim: z, now: toMin('08:59') });
  ok(find(q, 'shacharit').anchor && find(q, 'shacharit').late < 0.5 && find(q, 'kollel').late < 0.5, 'מניין 9:00 בלי "איחור", וכולל בזמן');
}

// סימנתי שחרית כבוצעת, אבל לא את הלימוד שלפניה — לא חוזרים ללימוד
{
  const day = new Date(2026, 9, 21, 6);
  const st = { stations: {} };
  for (const id of ['wake', 'morning', 'birchos', 'shopping', 'sandwiches', 'drive_kids', 'drive_mikveh', 'mikveh', 'drive_shul', 'pick_shacharit', 'korbanot']) st.stations[id] = { status: 'done', start: 400, end: 400 };
  st.stations.shacharit = { status: 'done', start: toMin('09:00'), end: toMin('09:13') };
  const q = planDay({ settings: S, date: day, state: st, zmanim: z, now: toMin('09:23') });
  ok(q.current?.id !== 'study_am' && find(q, 'study_am').status === 'auto', 'שחרית סומנה — הלימוד שלפניה עבר (עכשיו: ' + q.current?.title + ')');
}

// שישי, מאחרים בבוקר — איסוף מענדלה (11:45) קבוע: לא מאחרים, ומוותרים על תחנות פחות חשובות
{
  const day = new Date(2026, 9, 23, 6);
  const q = planDay({ settings: S, date: day, state: { stations: {} }, zmanim: z, now: toMin('09:48') });
  ok(find(q, 'fri_mendele').late < 0.5, 'איסוף מענדלה בשישי — בלי איחור (איחור: ' + Math.round(find(q, 'fri_mendele').late) + ')');
  ok(find(q, 'shacharit').status !== 'dropped' && find(q, 'drive_shul').late < 0.5, 'תפילה ונסיעות לא נזרקו');
}

// שישי 9:53, נסיעות ארוכות: איסוף מענדלה בזמן — מקצרים קרבנות, מוותרים על מקווה, מתפללים בבית ביחידות
{
  const S2 = JSON.parse(JSON.stringify(S));
  S2.places.tzivia.minutes = 21; S2.places.mendele.minutes = 6; S2.places.gan.minutes = 14;
  const st = { stations: {}, choices: {} };
  for (const id of ['wake', 'morning', 'birchos', 'shopping', 'sandwiches']) st.stations[id] = { status: 'done', start: 540, end: 592 };
  const q = planDay({ settings: S2, date: new Date(2026, 9, 23, 6), state: st, zmanim: z, now: toMin('09:53') });
  ok(find(q, 'fri_mendele').late < 0.5 && find(q, 'fri_girls').late < 0.5, 'שישי עמוס — איסוף מענדלה והבנות בלי איחור');
  ok(find(q, 'shacharit').plannedStart < find(q, 'fri_pick1').plannedStart, 'השחרית נשארת לפני האיסוף (לא נדחית)');
}

// עריכת הכריכים ליום הזה — שלבים שנערכו מחליפים את התפריט, והמשך מתעדכן
{
  const day = new Date(2026, 9, 25, 6);
  const base = planDay({ settings: S, date: day, state: { stations: {} }, zmanim: z, now: toMin('07:34') });
  const steps = [{ id: 'm_מענדלה_0', label: 'מענדלה — טוסט', minutes: 5 }, { id: 'n_1', label: 'מוסיא — פיתה', minutes: 4 }];
  const q = planDay({ settings: S, date: day, state: { stations: {}, overrides: { sandwiches: { steps } } }, zmanim: z, now: toMin('07:34') });
  ok(find(q, 'sandwiches').steps.length === 2 && find(q, 'sandwiches').steps[1].label === 'מוסיא — פיתה' && find(q, 'sandwiches').overridden, 'כריכים: השלבים שנערכו ליום מחליפים את התפריט');
  ok(find(q, 'sandwiches').plannedEnd - find(q, 'sandwiches').plannedStart === 9 && find(base, 'sandwiches').steps.length > 2, 'המשך הכריכים מתעדכן לפי השלבים החדשים');
}

// שינוי בתוכנית: נסיעה/טיול במשך חופשי (לא יודע מתי אגיע) + שעה לשלב + דילוג עד תחנה
{
  const day = new Date(2026, 9, 25, 6);
  const st0 = { stations: {} };
  const base = planDay({ settings: S, date: day, state: st0, zmanim: z, now: toMin('09:18') });
  const cur = base.current.id;
  const extras = [
    { id: 'x1', type: 'drive', title: 'לטיול', icon: 'car', legs: ['home'], driveMinutes: 90, batch: 'b', beforeId: cur },
    { id: 'x2', type: 'timer', title: 'ארוחה', icon: 'clock', minutes: 30, at: '14:00', batch: 'b', beforeId: cur },
  ];
  const q = planDay({ settings: S, date: day, state: { stations: {}, extras }, zmanim: z, now: toMin('09:18') });
  const x1 = find(q, 'x1'), x2 = find(q, 'x2');
  ok(Math.round(x1.plannedEnd - x1.plannedStart) === 90, 'טיול במשך חופשי: 90 דק׳ (' + Math.round(x1.plannedEnd - x1.plannedStart) + ')');
  ok(x2.plannedStart >= toMin('14:00') - 0.5 && x2.late < 0.5, 'שלב עם שעה קבועה מתחיל ב-14:00');
  const next = base.list.find(x => !x.extra && x.id !== cur && !['done', 'skipped', 'auto'].includes(x.status));
  const q2 = planDay({ settings: S, date: day, state: { stations: {}, extras, overrides: { [next.id]: { off: true } } }, zmanim: z, now: toMin('09:18') });
  ok(!q2.list.some(x => x.id === next.id), 'דילוג עד תחנה: התחנות שבדרך יוצאות מהיום');
}

// ── יום הטיסה (3.11): אחורה מההמראה ב-11:30 ──
{
  const fly = new Date('2026-11-03T04:00:00');
  const q = planDay({ settings: S, date: fly, state: {}, zmanim: z, now: toMin('04:00') });
  const t = id => { const x = find(q, id); return x ? toTime(x.plannedStart) : '—'; };
  ok(t('wake') === '04:35', 'יום הטיסה: השכמה ב-04:35 (' + t('wake') + ')');
  ok(t('mikveh') === '05:10', 'מקווה ב-05:10 (' + t('mikveh') + ')');
  ok(t('drive_station') === '05:45' && toTime(find(q, 'drive_station').plannedEnd) === '05:55' && Math.round(find(q, 'drive_station').late) === 0, 'מגיעים לתחנה ב-05:55 (' + t('drive_station') + ')');
  ok(t('train_ride') === '06:14' && toTime(find(q, 'train_ride').plannedEnd) === '08:20', 'רכבת 06:14 עד 08:20');
  ok(t('airport_checkin') === '08:30', 'צ׳ק-אין ב-08:30 (' + t('airport_checkin') + ')');
  ok(t('shacharit') === '09:40' && toTime(find(q, 'shacharit').plannedEnd) <= '10:20', 'שחרית אחרי הצ׳ק-אין: ' + t('shacharit') + '–' + toTime(find(q, 'shacharit').plannedEnd));
  ok(t('boarding') === '10:50', 'עלייה למטוס ב-10:50');
  ok(t('flight_ua85') === '11:30', 'ההמראה ב-11:30 (' + t('flight_ua85') + ')');
  ok(!find(q, 'kollel') && !find(q, 'drive_kids'), 'ביום הטיסה אין כולל ופיזור ילדים');
  const eve = planDay({ settings: S, date: new Date('2026-11-02T08:00:00'), state: {}, zmanim: z, now: toMin('08:00') });
  ok(!!find(eve, 'trip_eve'), 'ערב הטיסה: צ׳ק-אין וסידורים');
  const back = planDay({ settings: S, date: new Date('2026-11-10T06:00:00'), state: {}, zmanim: z, now: toMin('06:00') });
  ok(toTime(find(back, 'land_tlv').plannedStart) === '17:20', 'נחיתה בארץ ב-17:20');
  for (const d of ['2026-11-01', '2026-11-04', '2026-11-09']) {
    const x = planDay({ settings: S, date: new Date(d + 'T06:00:00'), state: {}, zmanim: z, now: toMin('06:00') });
    ok(x.list.length > 3 && x.list.every(s => s.plannedEnd >= s.plannedStart), 'תכנית תקינה ל-' + d);
  }
}

// ── יום בחירות (27.10): הילדים בבית, המשימות מוכנסות והמוסדות יוצאים ──
{
  const b = INBOX.find(x => x.id === 'election-2026-10-27');
  const day = new Date('2026-10-27T09:52:00');
  const now = toMin('09:52');
  const DONE = { wake: { status: 'done', start: 400, end: 400 }, morning: { status: 'done', start: 400, end: 420 }, birchos: { status: 'done', start: 420, end: 428 } };
  const reg = planDay({ settings: S, date: day, state: { stations: DONE }, zmanim: z, now });
  const cur = reg.current.id;
  const off = Object.fromEntries(b.offIds.map(id => [id, { off: true }]));
  const probe = planDay({ settings: S, date: day, state: { stations: DONE, overrides: off }, zmanim: z, now });
  const beforeId = probe.list.find(x => !['done', 'skipped', 'auto'].includes(x.status))?.id;
  const extras = b.items.map((x, i) => ({ ...x, id: 'e' + i, batch: 'b1' + (x.group || ''), beforeId: x.beforeId || beforeId }));
  const q = planDay({ settings: S, date: day, state: { stations: DONE, overrides: off, extras }, zmanim: z, now });
  const ids = q.list.filter(x => x.status !== 'auto').map(x => x.title);
  ok(q.list.filter(x => x.extra).length === 8, 'יום בחירות: 8 משימות נכנסו');
  ok(!q.list.some(x => ['drive_kids', 'kollel', 'drive_tzivia', 'sandwiches'].includes(x.id)), 'יום בחירות: פיזור ילדים, כולל וכריכים יצאו');
  ok(q.list.filter(x => x.extra).every(x => x.plannedStart >= now - 0.5), 'יום בחירות: המשימות מתחילות מעכשיו');
  ok(toTime(find(q, 'e0').plannedStart) === '09:52', 'יום בחירות: מתחילים במקווה ב-09:52 (' + toTime(find(q, 'e0').plannedStart) + ', הייתה נוכחית: ' + cur + ')');
  console.log('סדר:', q.list.filter(x => x.status !== 'auto').map(x => toTime(x.plannedStart) + ' ' + x.title).join(' | '));
}

// תחנה שסומנה בסדר הפוך (דילגתי על לימוד שבהמשך) לא מחזירה את הלוז אחורה — אין שעות שלא מסתדרות
{
  const day = new Date('2026-10-28T09:50:00');
  const st = { stations: {}, choices: {} };
  for (const id of ['wake', 'morning', 'birchos', 'shopping', 'sandwiches', 'drive_kids', 'drive_mikveh', 'mikveh', 'drive_shul', 'pick_shacharit', 'study_am']) st.stations[id] = { status: 'done', start: 400, end: 410 };
  st.stations.korbanot = { start: toMin('09:47') };
  st.stations.study_post = { status: 'skipped', start: toMin('09:44'), end: toMin('09:44') };
  const q = planDay({ settings: S, date: day, state: st, zmanim: z, now: toMin('09:50') });
  const l = q.list.filter(x => !['done', 'skipped', 'auto'].includes(x.status));
  ok(l.every((x, i) => i === 0 || x.plannedStart + 0.01 >= l[i - 1].plannedStart), 'סדר השעות עולה (דילוג על לימוד שבהמשך)');
  ok(find(q, 'kollel').late < 0.5, 'הכולל ב-10:00 בלי איחור');
}

if (failed) { console.error(`\n${failed} בדיקות נכשלו`); process.exit(1); }
console.log('\nכל הבדיקות עברו');
