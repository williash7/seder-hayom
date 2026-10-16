// משימות מה-CRM (kehila-crm) — קריאה בלבד. כתובת הסקריפט נשמרת רק בטלפון.
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE = 'crm_tasks_cache_v1';
const DONE = 'crm_tasks_done_v1';

async function get(url, action) {
  const ctrl = new AbortController();
  const t = setTimeout(() => { try { ctrl.abort(); } catch {} }, 20000);
  try {
    const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}action=${action}`, { signal: ctrl.signal, redirect: 'follow' });
    return JSON.parse(await r.text());
  } finally { clearTimeout(t); }
}

const iso = d => { try { const x = new Date(d); return isNaN(x) ? null : `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; } catch { return null; } };

/** משימות פתוחות עם תאריך משלהן: של היום ומה שעבר תאריכו (עד שבוע) */
export async function fetchCrmTasks(url, dayKey, { force = false } = {}) {
  if (!url) return [];
  if (!force) {
    try {
      const c = JSON.parse(await AsyncStorage.getItem(CACHE) || 'null');
      if (c && c.url === url && c.day === dayKey && Date.now() - c.ts < 20 * 60000) return c.data;
    } catch {}
  }
  try {
    const [ex, ev] = await Promise.all([get(url, 'getHolidayExtras'), get(url, 'getEvents')]);
    const extras = ex?.data || {}, events = Array.isArray(ev?.data) ? ev.data : [];
    const out = [];
    const today = new Date(dayKey + 'T12:00:00');
    const push = (t, group, id) => {
      if (!t?.text || t.done || t.skipped || !t.dueDate) return;
      const due = iso(t.dueDate); if (!due) return;
      const days = Math.round((new Date(due + 'T12:00:00') - today) / 864e5);
      if (days > 0 || days < -7) return;
      out.push({ id, title: t.text, group, date: due, overdue: days < 0, time: t.time || t.startTime || '', notes: t.notes || '' });
    };
    Object.entries(extras).forEach(([k, v]) => {
      if (k === '__personalDates__') return;
      (v?.tasks || []).forEach((t, i) => push(t, k === '__standalone__' ? 'משימות כלליות' : k, `crm_${k.replace(/\W/g, '')}_${i}`));
    });
    events.forEach((e, ei) => (e.tasks || []).forEach((t, i) => push(t, e.name || e.title || 'אירוע', `crm_ev${ei}_${i}`)));
    await AsyncStorage.setItem(CACHE, JSON.stringify({ url, day: dayKey, ts: Date.now(), data: out }));
    return out;
  } catch {
    try { const c = JSON.parse(await AsyncStorage.getItem(CACHE) || 'null'); if (c?.data) return c.data; } catch {}
    return [];
  }
}

export async function crmDone() {
  try { return JSON.parse(await AsyncStorage.getItem(DONE) || '{}'); } catch { return {}; }
}
export async function toggleCrmDone(id, dayKey) {
  const d = await crmDone();
  if (d[id]) delete d[id]; else d[id] = dayKey;
  await AsyncStorage.setItem(DONE, JSON.stringify(d));
  return d;
}
