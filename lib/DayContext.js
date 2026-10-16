// הקשר מרכזי: היום הפעיל, התכנית החיה, והפעולות על התחנות
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { planDay } from './engine';
import { getZmanim, getHebrewDate } from './zmanim';
import { dateKey, nowMin, addDays, uid } from './time';
import * as S from './store';
import { reschedule, cancelAlarms } from './notify';
import { DEFAULT_SETTINGS } from './defaults';

const Ctx = createContext(null);
export const useDay = () => useContext(Ctx);

export function DayProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [dayDate, setDayDate] = useState(new Date());
  const [state, setState] = useState({ stations: {}, choices: {} });
  const [zmanim, setZmanim] = useState({});
  const [hebrew, setHebrew] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [calls, setCalls] = useState([]);
  const [now, setNow] = useState(nowMin());
  const [loaded, setLoaded] = useState(false);
  const dk = dateKey(dayDate);
  const dkRef = useRef(dk);
  dkRef.current = dk;

  // ── טעינה ──
  const loadAll = useCallback(async () => {
    const st = await S.loadSettings();
    const d = await S.activeDate(new Date());
    const k = dateKey(d);
    const [day, ts, cs] = await Promise.all([S.loadDay(k), S.loadTasks(), S.loadCalls()]);
    setSettings(st); setDayDate(d); setState(day); setTasks(ts); setCalls(cs);
    setNow(minutesFor(d));
    setLoaded(true);
    getZmanim(d).then(z => z && setZmanim(z)).catch(() => {});
    getHebrewDate(d).then(h => h && setHebrew(h)).catch(() => {});
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // שעון — כל 15 שניות, ובחזרה לאפליקציה טוען מחדש (אולי עבר יום)
  useEffect(() => {
    const iv = setInterval(() => setNow(minutesFor(dayDate)), 15000);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') {
        S.activeDate(new Date()).then(d => {
          if (dateKey(d) !== dkRef.current) loadAll();
          else setNow(minutesFor(d));
        });
      }
    });
    return () => { clearInterval(iv); sub.remove(); };
  }, [dayDate, loadAll]);

  const plan = useMemo(
    () => planDay({ settings, date: dayDate, state, zmanim, now }),
    [settings, dayDate, state, zmanim, now]);

  // ── שמירה + תזמון התראות ──
  const commit = useCallback(next => {
    setState(next);
    S.saveDay(dkRef.current, next);
  }, []);

  const lastSched = useRef('');
  useEffect(() => {
    if (!loaded) return;
    const sig = JSON.stringify([dk, state, settings.wakeTime, settings.stations?.length, Math.floor(now / 30), zmanim.candles]);
    if (sig === lastSched.current) return;
    lastSched.current = sig;
    const t = setTimeout(() => reschedule({ settings, plan, dayDate, state }), 800);
    return () => clearTimeout(t);
  }, [loaded, dk, state, settings, plan, dayDate, now, zmanim]);

  // ── פעולות ──
  const rec = id => state.stations?.[id] || {};
  const setRec = (id, patch) => commit({
    ...state, stations: { ...state.stations, [id]: { ...rec(id), ...patch } },
  });

  const actions = {
    start(id) {
      if (rec(id).start != null) return;
      setRec(id, { start: Math.round(minutesFor(dayDate)) });
    },
    done(id, data) {
      const n = Math.round(minutesFor(dayDate));
      const p = plan.list.find(s => s.id === id);
      const start = rec(id).start ?? Math.min(n, Math.round(p?.plannedStart ?? n));
      const r = rec(id);
      const next = { ...state, stations: { ...state.stations,
        [id]: { ...r, status: 'done', start, end: n, data: data ? { ...(r.data || {}), ...data } : r.data } } };
      if (p?.type === 'close') next.closed = true;
      commit(next);
      if (p?.type === 'wake') cancelAlarms();
    },
    skip(id) {
      const n = Math.round(minutesFor(dayDate));
      setRec(id, { status: 'skipped', start: rec(id).start ?? n, end: n });
    },
    undo(id) {
      const st = { ...state.stations }; delete st[id];
      commit({ ...state, stations: st, closed: id === 'day_close' ? false : state.closed });
    },
    /** קופץ לתחנה — כל מה שלפניה ולא נעשה מסומן כדולג */
    jumpTo(id) {
      const n = Math.round(minutesFor(dayDate));
      const st = { ...state.stations };
      for (const s of plan.list) {
        if (s.id === id) break;
        if (!st[s.id] || !['done', 'skipped'].includes(st[s.id].status)) st[s.id] = { ...(st[s.id] || {}), status: 'skipped', start: n, end: n };
      }
      if (st[id] && ['done', 'skipped'].includes(st[id].status)) delete st[id];
      commit({ ...state, stations: st });
    },
    setData(id, patch) {
      const r = rec(id);
      setRec(id, { data: { ...(r.data || {}), ...patch } });
    },
    choose(prayer, time) {
      commit({ ...state, choices: { ...(state.choices || {}), [prayer]: time } });
    },
    async saveSettings(next) {
      setSettings(next); await S.saveSettings(next);
    },
    async resetSettings() { await S.resetSettings(); setSettings(DEFAULT_SETTINGS); },
    async resetToday() { commit({ stations: {}, choices: {} }); },

    // משימות
    addTask(title, date = dk, extra = {}) {
      const t = { id: uid('t'), title, date, done: false, ...extra };
      const next = [...tasks, t]; setTasks(next); S.saveTasks(next); return t;
    },
    toggleTask(id) {
      const next = tasks.map(t => t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? dk : null } : t);
      setTasks(next); S.saveTasks(next);
    },
    removeTask(id) { const next = tasks.filter(t => t.id !== id); setTasks(next); S.saveTasks(next); },
    moveTask(id, date) {
      const next = tasks.map(t => t.id === id ? { ...t, date } : t); setTasks(next); S.saveTasks(next);
    },

    // רשימת התרמה
    addCall(c) { const next = [...calls, { id: uid('c'), ...c }]; setCalls(next); S.saveCalls(next); },
    updateCall(id, patch) {
      const next = calls.map(c => c.id === id ? { ...c, ...patch } : c); setCalls(next); S.saveCalls(next);
    },
    removeCall(id) { const next = calls.filter(c => c.id !== id); setCalls(next); S.saveCalls(next); },
  };

  const tomorrowKey = dateKey(addDays(dayDate, 1));
  const value = {
    loaded, settings, dayDate, dayKey: dk, tomorrowKey, state, zmanim, hebrew, now, plan,
    tasks, calls, actions,
    todayTasks: tasks.filter(t => t.date === dk || (t.date < dk && !t.done)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** הדקות "עכשיו" ביחס ליום הפעיל (אחרי חצות של יום שלא נסגר → 24:xx) */
function minutesFor(dayDate) {
  const n = new Date();
  const m = nowMin(n);
  return dateKey(n) !== dateKey(dayDate) && n > dayDate ? m + 1440 : m;
}
