// רשימת ההתרמה מהגיליון — דרך סקריפט Apps Script (google-apps-script/calls.gs)
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE = 'calls_remote_v1';
const DONE_STATUSES = ['תורם', 'תורם עם סכום', 'לא תורם'];

async function getT(url, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => { try { ctrl.abort(); } catch {} }, ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    const text = await r.text();
    try { return JSON.parse(text); }
    catch { throw new Error('התשובה מהגיליון לא תקינה — האם הפריסה מוגדרת "כל אחד"?'); }
  } finally { clearTimeout(t); }
}

const num = v => Number(String(v || '').replace(/[^\d.]/g, '')) || 0;

/** מספר ראשון בשדה, בפורמט לחיוג */
export function firstPhone(raw) {
  const p = String(raw || '').split(/:::|,|\//)[0].trim();
  let d = p.replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) return d.replace(/^\+9720/, '+972');
  if (d.startsWith('972')) return '+' + d;
  if (/^5\d{8}$/.test(d)) return '0' + d;
  return d;
}

/** מי בתור להתקשר: עוד לא תרם השנה, ולא סומן "לא תורם". "לחזור אליו" קודם, ואז לפי הצפי */
export function whoToCall(people = [], log = {}) {
  return people
    .map(p => {
      const l = log[String(p.row)];
      return l && l.name === p.name ? { ...p, myStatus: l.status, myNotes: l.notes, lastCall: l.date } : p;
    })
    .filter(p => p.phone && !num(p.cash) && !DONE_STATUSES.includes(p.myStatus || p.status))
    .map(p => ({ ...p, score: ((p.myStatus || p.status) === 'לחזור אליו' ? 1e7 : 0) + Math.max(num(p.forecast), num(p.potential)) }))
    .sort((a, b) => b.score - a.score);
}

export async function fetchPeople(url, { force = false } = {}) {
  if (!url) return null;
  if (!force) {
    try {
      const c = JSON.parse(await AsyncStorage.getItem(CACHE) || 'null');
      if (c && c.url === url && Date.now() - c.ts < 30 * 60000) return c.data;
    } catch {}
  }
  try {
    const j = await getT(url + (url.includes('?') ? '&' : '?') + 'action=list');
    if (!j.ok) throw new Error(j.error || 'שגיאה מהגיליון');
    const data = { people: j.people || [], statuses: j.statuses || [] };
    await AsyncStorage.setItem(CACHE, JSON.stringify({ url, ts: Date.now(), data }));
    return data;
  } catch (e) {
    try { const c = JSON.parse(await AsyncStorage.getItem(CACHE) || 'null'); if (c?.data) return { ...c.data, stale: true, error: String(e.message || e) }; } catch {}
    throw e;
  }
}

// ── מה שקרה בשיחה נשמר רק בטלפון — לא נכתב לגיליון ──
const LOG = 'calls_log_v1';

export async function loadCallLog() {
  try { return JSON.parse(await AsyncStorage.getItem(LOG) || '{}'); } catch { return {}; }
}

/** רושם שיחה: { row, name, status, note, date } */
export async function logCall({ row, name, status, note, date }) {
  const log = await loadCallLog();
  const key = String(row);
  const prev = log[key] || { notes: [] };
  log[key] = {
    name, date,
    status: status || prev.status || '',
    notes: note ? [...(prev.notes || []), `${date}: ${note}`] : (prev.notes || []),
  };
  await AsyncStorage.setItem(LOG, JSON.stringify(log));
  return log;
}
