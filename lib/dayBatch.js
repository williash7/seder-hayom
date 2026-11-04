// עריכה מרוכזת — טיוטה ללא כתיבה לאחסון עד אישור סופי.
import { planDay } from './engine';
import { toMin, toTime } from './time';

export const validTime = value => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(value || '').trim());
export const normalizedTime = value => {
  const s = String(value || '').trim();
  return validTime(s) ? s.padStart(5, '0') : null;
};
export const createDayDraft = day => ({
  overrides: Object.fromEntries(Object.entries(day?.overrides || {}).map(([id, patch]) => [id, { ...patch }])),
  extras: (day?.extras || []).map(x => ({ ...x })),
});
export const draftState = (state, draft) => ({
  ...state, overrides: draft.overrides, extras: draft.extras,
});

// הסימולציה משתמשת באותו מנוע שבו מוצג סדר היום בפועל.
// היא מזהה גם איחור לעוגן שהמנוע דחה וגם שני אירועים בעלי שעות מפורשות שחופפים.
export function reviewDayDraft({ settings, date, state, draft, zmanim, now }) {
  const simulated = draftState(state, draft);
  const plan = planDay({ settings, date, state: simulated, zmanim, now });
  const warnings = [];
  const active = plan.list.filter(s => !['done', 'skipped', 'auto'].includes(s.status) && !s.passed);
  for (const s of active) {
    if (s.late > 0.5 && s.anchor?.hard) {
      warnings.push('איחור של ' + Math.ceil(s.late) + ' דק׳ ל״' + s.title + '״ (שעה שנקבעה: ' +
        toTime(s.anchor.endAt ?? s.anchor.start) + ').');
    }
    const requested = s.at && validTime(s.at) ? toMin(s.at) :
      (s.arriveBy && validTime(s.arriveBy) ? toMin(s.arriveBy) - s.duration : null);
    if (requested != null && s.plannedStart > requested + 0.5 && !(s.late > 0.5)) {
      warnings.push('״' + s.title + '״ מתחילה בפועל ב־' + toTime(s.plannedStart) +
        ' ולא בשעה המבוקשת ' + toTime(requested) + '.');
    }
  }
  const anchors = active.filter(s => {
    return ((s.at && validTime(s.at)) || (s.arriveBy && validTime(s.arriveBy))) &&
      s.duration > 0 && s.rec?.start == null;
  }).map(s => {
    const start = s.at && validTime(s.at) ? toMin(s.at) : toMin(s.arriveBy) - s.duration;
    return { id: s.id, title: s.title, start, end: start + s.duration };
  });
  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      const a = anchors[i], b = anchors[j];
      if (a.start < b.end - 0.5 && b.start < a.end - 0.5) {
        warnings.push('חפיפה: ״' + a.title + '״ (' + toTime(a.start) + '–' + toTime(a.end) +
          ') ו״' + b.title + '״ (' + toTime(b.start) + '–' + toTime(b.end) + ').');
      }
    }
  }
  for (const s of plan.list) {
    if (s.status === 'auto' && !s.passed && (draft.overrides[s.id] || draft.extras.some(x => x.id === s.id))) {
      warnings.push('״' + s.title + '״ לא נכנסה לתוכנית עקב אילוצי הזמן.');
    }
  }
  return { plan, warnings: [...new Set(warnings)] };
}
