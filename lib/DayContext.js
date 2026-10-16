// הקשר מרכזי: היום הפעיל, התכנית החיה, והפעולות על התחנות
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AppState, Linking } from 'react-native';
import { planDay } from './engine';
import { getZmanim, getHebrewDate } from './zmanim';
import { dateKey, nowMin, addDays, uid } from './time';
import * as S from './store';
import { reschedule, cancelAlarms } from './notify';
import { DEFAULT_SETTINGS } from './defaults';
import { consumeWoke, consumeBlocked, setLock, unlockFor, openPackage } from './native';
import { watchLegs, stopWatching, takeArrivals } from './geo';
import { toMin } from './time';

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
  const [blocked, setBlocked] = useState(null);   // אפליקציה שנחסמה בזמן בית
  const dk = dateKey(dayDate);
  const dkRef = useRef(dk);
  dkRef.current = dk;

  // ── טעינה ──
  const loadAll = useCallback(async () => {
    const st = await S.loadSettings();
    const d = await S.activeDate(new Date());
    const k = dateKey(d);
    const [day0, ts, cs] = await Promise.all([S.loadDay(k), S.loadTasks(), S.loadCalls()]);
    const day = applyWoke(day0, d);
    if (day !== day0) S.saveDay(k, day);
    setSettings(st); setDayDate(d); setState(day); setTasks(ts); setCalls(cs);
    const b = consumeBlocked(); if (b) setBlocked(b);
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
          else {
            setNow(minutesFor(d));
            setState(prev => { const n = applyWoke(prev, d); if (n !== prev) S.saveDay(dkRef.current, n); return n; });
            const b = consumeBlocked(); if (b) setBlocked(b);
          }
        });
      }
    });
    return () => { clearInterval(iv); sub.remove(); };
  }, [dayDate, loadAll]);

  // קישורים פנימיים מהמודול: sederhayom://woke, sederhayom://blocked?pkg=…
  useEffect(() => {
    const handle = url => {
      if (!url) return;
      if (url.includes('://woke')) {
        consumeWoke();
        setState(prev => {
          if (prev.stations?.wake?.status) return prev;
          const m = Math.round(minutesFor(dayDate));
          const n = { ...prev, stations: { ...prev.stations, wake: { status: 'done', start: m, end: m } } };
          S.saveDay(dkRef.current, n); return n;
        });
      }
      const mb = /blocked\?pkg=([^&]+)/.exec(url);
      if (mb) { consumeBlocked(); setBlocked(decodeURIComponent(mb[1])); }
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', e => handle(e.url));
    return () => sub.remove();
  }, [dayDate]);

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

  // ── זמן בית: נעילה אמיתית בזמן תחנת "זמן בית" ──
  const cur = plan.current;
  const lockKey = cur?.type === 'home' ? `${cur.id}:${Math.round(cur.plannedEnd)}` : 'off';
  useEffect(() => {
    if (!loaded) return;
    if (lockKey === 'off') { setLock(false, 0, 0, []); return; }
    const base = new Date(dayDate); base.setHours(0, 0, 0, 0);
    const ms = m => base.getTime() + m * 60000;
    const allowed = [
      ...(settings.homeTime?.allowed || []).map(k => settings.apps?.[k]?.pkg).filter(Boolean),
      ...(settings.homeTime?.extraPkgs || []),
    ];
    setLock(true, ms(cur.plannedStart) - 60000, ms(cur.plannedEnd), allowed);
  }, [loaded, lockKey, settings.homeTime, settings.apps]);

  // ── זיהוי הגעה בנסיעה ──
  const leg = cur?.type === 'drive' ? (cur.rec?.data?.leg || 0) : -1;
  const geoKey = cur?.type === 'drive' && cur.rec?.start != null ? `${cur.id}:${leg}` : 'off';
  useEffect(() => {
    if (!loaded) return;
    if (geoKey === 'off') { stopWatching(); return; }
    watchLegs(cur, leg, settings.places || {});
  }, [loaded, geoKey]);

  // הגעות שנרשמו ברקע → מקדמים את הנסיעה
  useEffect(() => {
    if (!loaded || cur?.type !== 'drive') return;
    takeArrivals().then(list => {
      const mine = list.map(a => a.id.split('|')).filter(([sid]) => sid === cur.id).map(([, l]) => +l);
      if (!mine.length) return;
      const reached = Math.max(...mine);
      if (reached < leg) return;
      if (reached + 1 >= (cur.legs || []).length) actions.done(cur.id, { leg: reached + 1, auto: true });
      else actions.setData(cur.id, { leg: reached + 1 });
    });
  }, [loaded, now, geoKey]);

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

    // זמן בית — פתיחה זמנית של אפליקציה שנחסמה, עם סיבה
    unlockApp(pkg, label, reason, minutes) {
      unlockFor(minutes);
      if (cur?.type === 'home') {
        const r = rec(cur.id);
        const n = Math.round(minutesFor(dayDate));
        setRec(cur.id, { start: r.start ?? n, data: { ...(r.data || {}),
          log: [...(r.data?.log || []), { at: n, reason, minutes, app: label || pkg }] } });
      }
      setBlocked(null);
      if (pkg) setTimeout(() => openPackage(pkg), 300);
    },
    dismissBlocked() { setBlocked(null); },
  };

  const tomorrowKey = dateKey(addDays(dayDate, 1));
  const value = {
    loaded, settings, dayDate, dayKey: dk, blocked, tomorrowKey, state, zmanim, hebrew, now, plan,
    tasks, calls, actions,
    todayTasks: tasks.filter(t => t.date === dk || (t.date < dk && !t.done)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** אם השעון המעורר סומן "קמתי" ממסך ההשכמה — מסמנים את תחנת ההשכמה */
function applyWoke(day, dayDate) {
  const w = consumeWoke();
  if (!w || day.stations?.wake?.status) return day;
  const d = new Date(w);
  if (dateKey(d) !== dateKey(dayDate)) return day;
  const m = d.getHours() * 60 + d.getMinutes();
  return { ...day, stations: { ...day.stations, wake: { status: 'done', start: m, end: m } } };
}

/** הדקות "עכשיו" ביחס ליום הפעיל (אחרי חצות של יום שלא נסגר → 24:xx) */
function minutesFor(dayDate) {
  const n = new Date();
  const m = nowMin(n);
  return dateKey(n) !== dateKey(dayDate) && n > dayDate ? m + 1440 : m;
}
