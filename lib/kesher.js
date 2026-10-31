// אימות החוזה המקומי. סיכומי שיחות וטלפונים אינם חלק מהחוזה.
export const KESHER_PERIODS = [['day', 'היום'], ['week', 'השבוע'], ['month', 'החודש'], ['campaign', 'הקמפיין']];
const number = (n, key) => {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`נתון לא תקין: ${key}`);
  return n;
};
const text = (s, max) => { if (typeof s !== 'string' || s.length > max) throw new Error('טקסט לא תקין'); return s; };
export function parseKesher(raw, now = Date.now()) {
  if (typeof raw !== 'string' || raw.length > 500000) throw new Error('תשובה גדולה מדי');
  const d = JSON.parse(raw);
  if (d.schema !== 1 || d.timezone !== 'Asia/Jerusalem' || typeof d.running !== 'boolean') throw new Error('נדרשת גרסה תואמת');
  number(d.generatedAt, 'generatedAt');
  if (d.generatedAt > now + 120000 || now - d.generatedAt > 300000) throw new Error('תשובה שאינה עדכנית');
  const periods = {};
  for (const [key] of KESHER_PERIODS) {
    const p = d.periods?.[key]; if (!p) throw new Error('תקופה חסרה');
    periods[key] = Object.fromEntries(['from', 'to', 'paidCents', 'payments', 'pledgedCents', 'monthlyCents', 'workMs'].map(k => [k, number(p[k], k)]));
    if (p.from > p.to || p.to !== d.generatedAt || p.workMs > p.to - p.from) throw new Error('טווח זמן לא תקין');
  }
  if (!Array.isArray(d.tasks) || d.tasks.length > 100) throw new Error('משימות לא תקינות');
  const tasks = d.tasks.map(t => ({ id: text(t.id, 100), title: text(t.title, 500), donorName: text(t.donorName, 150), due: number(t.due, 'due') }));
  const openTaskCount = number(d.openTaskCount, 'openTaskCount');
  if (openTaskCount < tasks.length) throw new Error('ספירת משימות לא תקינה');
  return { schema: 1, generatedAt: d.generatedAt, campaignName: text(d.campaignName, 200), campaignStart: number(d.campaignStart, 'campaignStart'), running: d.running,
    periods, tasks, openTaskCount, tasksTruncated: d.tasksTruncated === true, openPledgesCents: number(d.openPledgesCents, 'openPledgesCents') };
}
export function kesherState(previous, result, now = Date.now()) {
  if (result?.status === 'ok') {
    try { return { status: 'ok', data: parseKesher(result.json, now) }; }
    catch { return { status: 'invalid', data: null }; }
  }
  const status = result?.status || 'error';
  // אין לשמר שמות/משימות לאחר ניתוק, הסרה או חוסר תאימות.
  return { status, data: status === 'error' ? previous?.data || null : null };
}
export const workLabel = ms => `${Math.floor(ms / 3600000)} ש׳ ${Math.floor(ms / 60000) % 60} דק׳`;
export const cashLabel = cents => `${(cents / 100).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪`;
