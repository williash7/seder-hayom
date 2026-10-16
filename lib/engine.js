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

/** התחנות של יום מסוים (לפי יום בשבוע) */
export function stationsForDay(settings, date) {
  const dow = date.getDay();
  return (settings.stations || []).filter(s =>
    s.enabled !== false && (!s.days || s.days.includes(dow)));
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

/** האפשרויות למניין: הראשון שמתחיל אחרי earliest, אחרת האחרון */
export function autoMinyan(settings, prayer, earliest) {
  const opts = (settings.minyanim?.[prayer] || []).map(toMin).filter(m => m != null).sort((a, b) => a - b);
  if (!opts.length) return null;
  return opts.find(m => m >= earliest - 0.5) ?? opts[opts.length - 1];
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
  if (st.type === 'prayer') {
    const chosen = choices[st.prayer] != null ? toMin(choices[st.prayer]) : null;
    const m = chosen ?? ctx.auto[st.prayer] ?? autoMinyan(settings, st.prayer, earliest);
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
export function planDay({ settings, date, state = {}, zmanim = {}, now }) {
  const items = stationsForDay(settings, date);
  const recs = state.stations || {};
  const ctx = { settings, zmanim, choices: state.choices || {}, auto: {} };

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

    let duration = dur0;
    if (st.fill) {
      duration = fillDuration(i, start, items, durOf, ctx, recs) ?? (Number(st.minutes) || 30);
      if (st.until && toMin(st.until) != null) duration = Math.max(0, Math.min(duration, toMin(st.until) - start));
    }

    const end = start + duration;
    out.push({
      ...st, status: i === currentIndex ? 'current' : 'pending',
      plannedStart: start, plannedEnd: end, duration, late, waiting,
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
  const opts = (settings.minyanim?.[prayer] || []).filter(t => toMin(t) != null);
  const base = planDay({ settings, date, state, zmanim, now });
  const prayerIdx = base.list.findIndex(s => s.type === 'prayer' && s.prayer === prayer && s.status !== 'done');
  const arrive = prayerIdx >= 0 ? (base.list[prayerIdx].plannedStart - (base.list[prayerIdx].waiting || 0)) : now;
  const prayerMin = Number(settings.prayerMinutes?.[prayer]) || 20;

  return opts.map(t => {
    const m = toMin(t);
    const sim = planDay({ settings, date, state: { ...state, choices: { ...(state.choices || {}), [prayer]: t } }, zmanim, now });
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
