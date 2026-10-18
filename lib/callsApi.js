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

// ── קריאה ישירה מהגיליון (הוא פתוח לצפייה לכל מי שיש לו קישור) — בלי סקריפט, בלי כתיבה ──
export const PUBLIC_SHEET = 'https://docs.google.com/spreadsheets/d/1FRoh_zkJ-OH1wFOlsB-AyW5jAeWVhzrSzn0qX3dyevQ/gviz/tq?tqx=out:csv&headers=0&sheet='
  + encodeURIComponent('אנשי קשר חדש');

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// עמודות בלשונית "אנשי קשר חדש": B מקור, C שם, D טלפון, E פוטנציאל, F צפי 2026, K כסף ביד 2026,
// L סטטוס, N כסף ביד 2025, P–R תרומות 24–22, S הערות
const COL = { source: 1, name: 2, phone: 3, potential: 4, forecast: 5, cash: 10, status: 11, h25: 13, h24: 15, h23: 16, h22: 17, note: 18 };

async function fetchPublic(url) {
  const ctrl = new AbortController();
  const tm = setTimeout(() => { try { ctrl.abort(); } catch {} }, 25000);
  let text;
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('הגיליון לא נפתח (' + r.status + ')');
    text = await r.text();
  } finally { clearTimeout(tm); }
  if (/^\s*</.test(text)) throw new Error('הגיליון לא פתוח לצפייה — צריך "כל מי שיש לו קישור"');
  const rows = parseCSV(text);
  let h = rows.findIndex(r => (r[COL.name] || '').trim() === 'שם');
  if (h < 0) h = 2;
  const people = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i]; const c = k => String(r[COL[k]] || '').trim();
    if (!c('name')) continue;
    people.push({
      row: i + 1, name: c('name'), phone: c('phone'), source: c('source'),
      potential: c('potential'), forecast: c('forecast'), cash: c('cash'), status: c('status'), note: c('note'),
      history: [c('h25'), c('h24'), c('h23'), c('h22')],
    });
  }
  if (!people.length) throw new Error('לא נמצאו אנשים בגיליון');
  return people;
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
    let data;
    if (url.includes('/gviz/')) data = { people: await fetchPublic(url), statuses: [] };
    else {
      const j = await getT(url + (url.includes('?') ? '&' : '?') + 'action=list');
      if (!j.ok) throw new Error(j.error || 'שגיאה מהגיליון');
      data = { people: j.people || [], statuses: j.statuses || [] };
    }
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
