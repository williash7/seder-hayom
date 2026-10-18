// ─────────────────────────────────────────────────────────────
// מנוע היום.
// מקבל את התחנות, מה שכבר נעשה, ואת השעה — ומחזיר תכנית חיה:
// לכל תחנה שעת התחלה וסיום, מה התחנה הנוכחית, ומה העוגן הבא
// (שעה שלא זזה — כולל, איסוף, מניין) והאם מספיקים אליו.
//
// תחנה "ממלאת" (fill) תופסת את כל הזמן שנשאר עד העוגן הבא —
// כך הלימוד לפני שחרית מתארך או מתקצר לפי המניין שנבחר.
// ─────────────────────────────────────────────────────────────

import { toMin } from './time';

export const isClosed = rec => rec && (rec.status === 'done' || rec.status === 'skipped');

/**
 * תחנה שחוזרת כל N ימים (every + from).
 * כל מועד הוא N ימים אחרי הקודם. אם הוא נופל בשישי — מקדימים לחמישי,
 * והסבב ממשיך משם. מחזיר כמה ימים עברו מהפעם הקודמת (0 = לא היום).
 */
/**
 * תחנה מחזורית (כל N ימים). כמה ימים עברו מהפעם הקודמת — 0 = לא היום.
 * כשידוע מתי נעשתה בפועל (settings.cadenceLast[id] = { last, prev }):
 * מגיע N ימים אחרי הפעם האחרונה (שישי → חמישי), ואם לא נעשתה — נשארת כל יום עד שעושים.
 */
export function cadenceGap(st, date, settings) {
  if (!st.every) return 1;
  const rec = settings?.cadenceLast?.[st.cadenceKey || st.id.replace(/_motzash$/, '')];
  const utc = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const parse = k => { const [y, m, d] = String(k).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  if (rec?.last) {
    const day = utc(date), last = parse(rec.last);
    const days = t => Math.round(t / 864e5);
    if (day === last) return rec.prev ? Math.max(1, Math.min(st.every, days(last - parse(rec.prev)))) : st.every;
    if (day < last) return 0;
    let due = last + st.every * 864e5;
    if (new Date(due).getUTCDay() === 5) due -= 864e5;   // שישי → חמישי
    return day >= due ? Math.min(st.every, days(day - last)) : 0;
  }
  const [y, m, d] = String(st.from || '2026-10-17').split('-').map(Number);
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  let cur = Date.UTC(y, m - 1, d), prev = null;
  const dowOf = t => new Date(t).getUTCDay();
  for (let i = 0; i < 2000 && cur <= day; i++) {
    if (cur === day) return prev == null ? st.every : Math.round((cur - prev) / 864e5);
    prev = cur;
    cur += st.every * 864e5;
    if (dowOf(cur) === 5) cur -= 864e5;          // שישי → חמישי
  }
  return 0;
}
export const onCadence = (st, date, settings) => cadenceGap(st, date, settings) > 0;

/** התחנות של יום מסוים (לפי יום בשבוע ומחזוריות) */
/**
 * שינויים ליום אחד (state.overrides): { [id]: { at, arriveBy, minutes, off } }
 * למשל: מחר הכולל עד 10:45 → { kollel: { minutes: 45 } }
 */
export function applyOverrides(items, ov) {
  if (!ov || !Object.keys(ov).length) return items;
  const out = [];
  items.forEach((s, i) => {
    const o = ov[s.id];
    if (o?.off) return;
    let st = o ? { ...s, overridden: true } : s;
    if (o?.minutes != null && o.minutes !== '') st.minutes = Number(o.minutes);
    if (o?.at) st.at = o.at;
    if (o?.arriveBy) st.arriveBy = o.arriveBy;
    // שעת עוגן זזה — גם הנסיעה שמגיעה אליו זזה איתה
    if (o?.at && s.at && out.length && out[out.length - 1].arriveBy === s.at && !ov[out[out.length - 1].id]?.arriveBy) {
      out[out.length - 1] = { ...out[out.length - 1], arriveBy: o.at };
    }
    out.push(st);
  });
  return out;
}

export function stationsForDay(settings, date, state) {
  const base = baseStationsForDay(settings, date);
  // שעה קבועה לפי יום — גם הנסיעה שמגיעה אליה זזה
  const dow = date.getDay();
  for (let i = 1; i < base.length; i++) {
    const orig = (settings.stations || []).find(x => x.id === base[i].id);
    if (orig?.atByDay?.[dow] && base[i - 1].arriveBy === orig.at && !base[i - 1].arriveByDay?.[dow]) base[i - 1] = { ...base[i - 1], arriveBy: orig.atByDay[dow] };
  }
  return applyOverrides(base, state?.overrides);
}

function baseStationsForDay(settings, date) {
  const dow = date.getDay();
  return (settings.stations || [])
    .filter(s => s.enabled !== false && (!s.days || s.days.includes(dow)) && onCadence(s, date, settings))
    .map(s => {
      // שעה / משך קבועים לפי יום בשבוע (למשל: בשני הכולל עד 10:45)
      if (s.minutesByDay?.[dow] != null) s = { ...s, minutes: Number(s.minutesByDay[dow]) };
      if (s.atByDay?.[dow]) s = { ...s, at: s.atByDay[dow] };
      if (s.arriveByDay?.[dow]) s = { ...s, arriveBy: s.arriveByDay[dow] };
      // כריכים לפי התפריט של היום
      if (s.menu) {
        const day = settings.sandwichMenu?.days?.[dow] || {};
        const steps = (settings.sandwichMenu?.kids || []).flatMap(kid =>
          (day[kid] || []).filter(Boolean).map((it, i) => ({ id: `m_${kid}_${i}`, label: `${kid} — ${it}`, minutes: s.perItem || 4 })));
        return { ...s, steps: [...steps, ...(s.steps || [])] };
      }
      // שלבים לפי כמות (למשל: חולצה לכל יום שעבר מהכביסה הקודמת)
      if (!s.every || !(s.steps || []).some(x => x.nth)) return s;
      const n = Math.min(cadenceGap(s, date, settings), s.every);
      return { ...s, count: n, steps: s.steps.filter(x => !x.nth || x.nth <= n),
        title: s.countTitle ? s.countTitle.replace('{n}', n) : s.title };
    });
}

/** משך תחנה בדקות (בלי מילוי) */
export function baseDuration(st, settings) {
  switch (st.type) {
    case 'routine':
      return (st.steps || []).reduce((a, s) => a + (Number(s.minutes) || 0), 0);
    case 'drive':
      return (st.legs || []).reduce((a, id) => a + (Number(settings.places?.[id]?.minutes) || 10), 0);
    case 'prayer':
      return Number(settings.prayerMinutes?.[st.prayer]) || 20;
    default:
      return Number(st.minutes) || 0;
  }
}

/** רשימת המניינים ליום מסוים: הקבועים + תוספות לפי יום (למשל שחרית 10:00 בשישי) */
export function minyanList(settings, prayer, date) {
  const dow = date ? date.getDay() : null;
  const extra = dow != null ? (settings.minyanimByDay?.[dow]?.[prayer] || []) : [];
  return [...new Set([...(settings.minyanim?.[prayer] || []), ...extra])]
    .filter(t => toMin(t) != null).sort((a, b) => toMin(a) - toMin(b));
}

/** המניין הראשון שמתחיל אחרי earliest */
export function autoMinyan(settings, prayer, earliest, date) {
  const opts = minyanList(settings, prayer, date).map(toMin);
  if (!opts.length) return null;
  // כל המניינים עברו — אין עוגן (מתפללים ביחידות, בלי "איחור")
  return opts.find(m => m >= earliest - 0.5) ?? null;
}

/**
 * שעת העוגן של תחנה (שעת ההתחלה שאסור להקדים).
 * מחזיר { start, hard } או null. hard=true → איחור הוא בעיה.
 */
function anchorOf(st, ctx, dur, earliest) {
  const { settings, zmanim, choices } = ctx;
  if (st.atKey && settings[st.atKey]) return { start: toMin(settings[st.atKey]), hard: false };
  if (st.at) return { start: toMin(st.at), hard: true };
  if (st.atZman && zmanim?.[st.atZman]) return { start: toMin(zmanim[st.atZman]), hard: true };
  if (st.arriveBy) return { start: toMin(st.arriveBy) - dur, hard: true, endAt: toMin(st.arriveBy) };
  if (st.endByZman && zmanim?.[st.endByZman]) {
    const end = toMin(zmanim[st.endByZman]);
    return { start: end - dur, hard: true, endAt: end };
  }
  if (st.type === 'prayer' && !st.alone) {
    const chosen = choices[st.prayer] != null ? toMin(choices[st.prayer]) : null;
    const m = chosen ?? ctx.auto[st.prayer] ?? autoMinyan(settings, st.prayer, earliest, ctx.date);
    if (m == null) return null;
    ctx.auto[st.prayer] = m;
    return { start: m, hard: true, prayer: true };
  }
  return null;
}

/**
 * בונה את התכנית.
 * state = { stations: { [id]: { status, start, end, data } }, choices: { shacharit: "08:00" } }
 * now = דקות מחצות
 */
export function planDay(args) {
  if (args._items || args.noProtect) return planCore(args);
  return protectAnchors(args);
}

/**
 * עוגן מוגן (protect) — למשל הכולל ב-10:00: לא מאחרים אליו בשום מצב.
 * אם התכנית מאחרת אליו, מוותרים לפי הסדר:
 *   1. מקצרים תחנות "דחיסות" (squeeze) שלפניו
 *   2. התפילה עוברת לאחרי העוגן — ביחידות
 *   3. מוותרים על תחנות canDrop (למשל מקווה)
 */
function protectAnchors(args) {
  const { settings, date, state = {} } = args;
  const recs = state.stations || {};
  const open = s => !isClosed(recs[s.id]) && recs[s.id]?.start == null;
  let items = placeFlex(stationsForDay(settings, date, state), args);

  // 0. עוגן מוגן שכבר התחיל או נגמר (הגעתי לכולל) — מה שלפניו ולא נעשה כבר עבר:
  //    לא חוזרים אליו. רק תפילה שלא התפללו עוברת לאחריו, ביחידות.
  let reached = -1;
  items.forEach((s, i) => { if (s.protect && recs[s.id] && (isClosed(recs[s.id]) || recs[s.id].start != null)) reached = i; });
  if (reached >= 0) {
    while (reached + 1 < items.length && items[reached + 1].protect) reached++;
    const pre = items.slice(0, reached + 1), post = items.slice(reached + 1);
    const moved = [];
    const kept = pre.filter(s => {
      if (!open(s) || s.protect) return true;
      if (s.type === 'prayer') { moved.push({ ...s, alone: true, title: s.title + ' ביחידות', sub: 'אחרי הכולל' }); return false; }
      return true;
    }).map(s => (open(s) && !s.protect) ? { ...s, dropped: true, passed: true } : s);
    // תפילה שהתפללו ביחידות אחרי הכולל — מוצגת במקומה, אחרי הכולל
    const lastProt = recs[pre[reached].id] || {};
    const after = kept.filter(s => s.type === 'prayer' && !s.protect && recs[s.id]?.start != null && lastProt.start != null && recs[s.id].start >= lastProt.start);
    const before = kept.filter(s => !after.includes(s));
    items = [...before, ...after, ...moved, ...post];
  }

  let p = planCore({ ...args, _items: items });
  const lateProt = () => p.list.findIndex(s => s.protect && !isClosed(s.rec) && s.late > 0.5);

  let pi = lateProt();
  if (pi < 0) return p;

  // 1. דחיסה
  items = items.map((s, i) => (i < pi && s.squeeze != null && open(s)) ? { ...s, minutes: s.squeeze, steps: s.squeeze === 0 ? [] : s.steps, squeezed: true } : s);
  p = planCore({ ...args, _items: items });
  if ((pi = lateProt()) < 0) return p;

  // 2. התפילה לאחרי העוגן, ביחידות
  const prIdx = items.findIndex((s, i) => i < pi && s.type === 'prayer' && open(s));
  if (prIdx >= 0) {
    const pr = { ...items[prIdx], alone: true, title: items[prIdx].title + ' ביחידות', sub: 'אחרי הכולל — כדי להגיע ב-10:00' };
    const rest = items.filter((_, i) => i !== prIdx);
    // אחרי העוגן המוגן האחרון ברצף (למשל: נסיעה לכולל ← שיעור בכולל)
    let at = rest.findIndex(s => s.id === p.list[pi].id);
    while (at + 1 < rest.length && rest[at + 1].protect) at++;
    items = [...rest.slice(0, at + 1), pr, ...rest.slice(at + 1)];
    p = planCore({ ...args, _items: items });
    if ((pi = lateProt()) < 0) return p;
  }

  // 3. ויתור על תחנות canDrop
  items = items.map((s, i) => (i < pi && s.canDrop && open(s)) ? { ...s, dropped: true } : s);
  return planCore({ ...args, _items: items });
}

function planCore({ settings, date, state = {}, zmanim = {}, now, _items }) {
  const recs = state.stations || {};
  const items = _items || placeFlex(stationsForDay(settings, date, state), { settings, date, state, zmanim, now });
  const ctx = { settings, zmanim, choices: state.choices || {}, auto: {}, date };

  const out = [];
  let cursor = null;
  let currentIndex = -1;

  // זמני עזר לכל תחנה (לחישוב מילוי)
  const durOf = items.map(st => baseDuration(st, settings));

  for (let i = 0; i < items.length; i++) {
    const st = items[i];
    const rec = recs[st.id];
    const dur0 = durOf[i];

    if (isClosed(rec)) {
      const start = rec.start ?? cursor ?? now;
      const end = rec.end ?? start;
      out.push({ ...st, status: rec.status, plannedStart: start, plannedEnd: end, duration: end - start, rec });
      cursor = end;
      continue;
    }

    // תחנה שכבר עברה (לפני כולל שכבר התחיל) — לא נוכחית, במקומה בזמן
    if (st.passed) {
      const at = cursor ?? now;
      out.push({ ...st, status: 'auto', plannedStart: at, plannedEnd: at, duration: 0, late: 0, waiting: 0, anchor: null, rec });
      continue;
    }

    let base;
    if (currentIndex === -1) {
      currentIndex = i;
      base = rec?.start != null ? rec.start : Math.max(cursor ?? now, now);
    } else {
      base = cursor;
    }

    // לפני הקימה — ציר הזמן מתחיל משעת ההשכמה
    if (base == null) base = now;

    const anchor = anchorOf(st, ctx, dur0, base);
    let start = base, late = 0, waiting = 0;
    const started = rec?.start != null;
    if (anchor && !started) {
      if (base < anchor.start) { waiting = anchor.start - base; start = anchor.start; }
      else if (anchor.hard && base - anchor.start > 0.5) late = base - anchor.start;
    }

    let duration = dur0, openEnded = false;
    if (st.fill) {
      const fd = fillDuration(i, start, items, durOf, ctx, recs);
      openEnded = fd == null;                        // אין שום דבר קבוע אחריו — הזמן פתוח
      duration = fd ?? (Number(st.minutes) || 30);
      if (st.until && toMin(st.until) != null) duration = Math.max(0, Math.min(duration, toMin(st.until) - start));
      const cap = st.maxByDay?.[date.getDay()] ?? st.maxMinutes;
      if (cap != null) duration = Math.min(duration, Number(cap));
    }

    // תחנה רשות ("אם נשאר זמן") — כשאין לה זמן, מדלגים עליה בשקט. וגם תחנה שוותרו עליה כדי להגיע לעוגן
    if ((st.dropped && !started) || (st.squeezed && !started && duration === 0) || (st.optional && !started && duration < (st.minMinutes ?? 5))) {
      if (i === currentIndex) currentIndex = -1;
      out.push({ ...st, status: 'auto', plannedStart: start, plannedEnd: start, duration: 0, late: 0, waiting: 0, anchor: null, rec });
      cursor = start;
      continue;
    }

    const end = start + duration;
    out.push({
      ...st, status: i === currentIndex ? 'current' : 'pending',
      plannedStart: start, plannedEnd: end, duration, late, waiting, openEnded,
      anchor: anchor ? { ...anchor } : null, rec,
    });
    cursor = end;
  }

  // העוגן הקשיח הבא אחרי התחנה הנוכחית
  let nextAnchor = null;
  for (let i = Math.max(0, currentIndex); i < out.length && currentIndex >= 0; i++) {
    const s = out[i];
    if (s.anchor?.hard && s.status !== 'done') {
      if (i === currentIndex && s.rec?.start != null) continue;
      nextAnchor = {
        id: s.id, title: s.title,
        time: s.anchor.endAt ?? s.anchor.start,
        arrive: s.anchor.endAt != null,
        plannedAt: s.anchor.endAt != null ? s.plannedEnd : s.plannedStart,
        late: s.late,
        slack: (s.anchor.start) - (s.plannedStart - s.waiting),
      };
      break;
    }
  }

  return {
    list: out,
    currentIndex,
    current: currentIndex >= 0 ? out[currentIndex] : null,
    nextAnchor,
    finished: currentIndex === -1 && out.length > 0,
    empty: out.length === 0,
  };
}

/**
 * תחנות גמישות (flex) — אין להן מקום קבוע.
 * נכנסות לזמן הפנוי הראשון (תחנה ממלאת) אחרי flexAfter שיש בו מספיק זמן;
 * אם אין — לפני flexFallback (סוף הערב). אחרי שהתחילו — נשארות במקומן בזמן.
 */
function placeFlex(items, args) {
  const flex = items.filter(s => s.flex);
  if (!flex.length) return items;
  let list = items.filter(s => !s.flex);
  const recs = args.state.stations || {};
  for (const f of flex) {
    const r = recs[f.id];
    let idx;
    if (r?.start != null) {
      // כבר התחילה — לפי הזמן שבו התחילה
      idx = list.findIndex(s => { const q = recs[s.id]; return !q || q.start == null || q.start > r.start; });
    } else {
      const p0 = planDay({ ...args, _items: list });
      const need = baseDuration(f, args.settings);
      const after = list.findIndex(s => s.id === f.flexAfter);
      const slot = p0.list.findIndex((s, i) => i > after && s.fill && ['pending', 'current'].includes(s.status)
        && s.rec?.start == null && (s.openEnded || s.duration >= need));
      idx = slot >= 0 ? slot : list.findIndex(s => s.id === f.flexFallback);
      if (idx < 0) idx = list.findIndex(s => s.type === 'close');
    }
    if (idx < 0) idx = list.length;
    list = [...list.slice(0, idx), f, ...list.slice(idx)];
  }
  return list;
}

/** כמה דקות תחנה ממלאת יכולה לתפוס עד העוגן הבא */
function fillDuration(i, start, items, durOf, ctx, recs) {
  let between = 0;
  for (let j = i + 1; j < items.length; j++) {
    const st = items[j];
    if (isClosed(recs[st.id])) continue;
    const earliest = start + between;
    const a = anchorOf(st, ctx, durOf[j], earliest);
    if (a) return Math.max(0, a.start - start - between);
    if (!st.fill) between += durOf[j];
  }
  return null;
}

/**
 * לכל מניין אפשרי — מה יקרה אם נבחר בו:
 * האם מספיקים אליו, וכמה מאחרים לעוגן הבא שאחריו (למשל כולל ב-10:00).
 */
export function evaluateMinyan({ settings, date, state, zmanim, now, prayer }) {
  const opts = minyanList(settings, prayer, date);
  const base = planDay({ settings, date, state, zmanim, now, noProtect: true });
  const prayerIdx = base.list.findIndex(s => s.type === 'prayer' && s.prayer === prayer && s.status !== 'done');
  const arrive = prayerIdx >= 0 ? (base.list[prayerIdx].plannedStart - (base.list[prayerIdx].waiting || 0)) : now;
  const prayerMin = Number(settings.prayerMinutes?.[prayer]) || 20;

  return opts.map(t => {
    const m = toMin(t);
    const sim = planDay({ settings, date, state: { ...state, choices: { ...(state.choices || {}), [prayer]: t } }, zmanim, now, noProtect: true });
    const pi = sim.list.findIndex(s => s.type === 'prayer' && s.prayer === prayer && s.status !== 'done');
    let after = null;
    for (let k = pi + 1; k < sim.list.length && pi >= 0; k++) {
      const s = sim.list[k];
      if (s.anchor?.hard && !s.anchor.prayer) { after = { title: s.title, late: s.late, time: s.anchor.endAt ?? s.anchor.start }; break; }
    }
    const warn = [];
    if (prayer === 'shacharit' && zmanim) {
      const tfila = toMin(zmanim.sofZmanTfilla), shma = toMin(zmanim.sofZmanShma);
      if (shma != null && m + 15 > shma) warn.push('לקרוא קריאת שמע לפני — סוף זמן ק״ש ' + zmanim.sofZmanShma);
      if (tfila != null && m + 30 > tfila) warn.push('אחרי סוף זמן תפילה (' + zmanim.sofZmanTfilla + ')');
    }
    return {
      time: t,
      reachable: m >= arrive - 0.5,
      studyMinutes: Math.max(0, Math.round(m - arrive)),
      endsAt: m + prayerMin,
      after,
      ok: m >= arrive - 0.5 && !(after && after.late > 1),
      warn,
    };
  });
}
