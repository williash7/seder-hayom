// כל סוגי התחנות. כל רכיב מקבל את התחנה מהתכנית (s) ומציג את גוף התחנה
// ואת הפעולות שלה. המעטפת (כותרת, טבעת, דילוג) — ב-NowScreen.
import { useEffect, useState, useRef } from 'react';
import { View, Alert, AppState, Pressable } from 'react-native';
import { useDay } from '../lib/DayContext';
import { evaluateMinyan, planDay } from '../lib/engine';
import { openWaze, openApp, openAppAt, openVideoCamera, dial, shareText } from '../lib/launch';
import { toTime, fmtDur, fmtClock, toMin, dateKey, addDays } from '../lib/time';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Check, Card, Field, Chip, IconBtn, Divider, Sheet } from '../components/UI';
import { fetchPeople, whoToCall, firstPhone, loadCallLog, logCall, toggleLater, PUBLIC_SHEET } from '../lib/callsApi';
import * as Native from '../lib/native';
import { fetchCrmTasks, crmDone, toggleCrmDone } from '../lib/crmTasks';
import { weekLessons, loadPrep, savePrep } from '../lib/lessons';
import { loadSupplies, saveSupplies, menuFor } from '../lib/supplies';
import Icon from '../components/Icon';
import { TRIP_PLACES } from '../lib/trips';

const fail = e => Alert.alert('לא הצלחתי', String(e?.message || e));

export function useSeconds() {
  const [, set] = useState(0);
  useEffect(() => { const iv = setInterval(() => set(x => x + 1), 1000); return () => clearInterval(iv); }, []);
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

function Actions({ children }) {
  return <View style={{ gap: SP.sm, marginTop: SP.xl }}>{children}</View>;
}

// מעקב שינה: המצוי, התכנית של היום, והרצוי
export function SleepCard({ sleep }) {
  const t = useT();
  const Row = ({ k, a, b, c }) => (
    <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
      <T v="small" c="sub" style={{ flex: 1.2 }}>{k}</T>
      <T v="small" style={{ flex: 1, textAlign: 'center' }}>{a || '—'}</T>
      <T v="bodyB" style={{ flex: 1, textAlign: 'center', color: t.gold }}>{b}</T>
      <T v="small" style={{ flex: 1, textAlign: 'center' }}>{c}</T>
    </View>
  );
  return (
    <Card tone="sunk" style={{ marginBottom: SP.md }}>
      <View style={{ flexDirection: 'row' }}>
        <T v="tiny" c="sub" style={{ flex: 1.2 }} />
        <T v="tiny" c="sub" style={{ flex: 1, textAlign: 'center' }}>בפועל</T>
        <T v="tiny" c="sub" style={{ flex: 1, textAlign: 'center' }}>השבוע</T>
        <T v="tiny" c="sub" style={{ flex: 1, textAlign: 'center' }}>היעד</T>
      </View>
      <Row k="שינה" a={sleep.actualSleep && toTime(toMin(sleep.actualSleep))} b={toTime(toMin(sleep.sleep))} c={sleep.goal.sleep} />
      <Row k="השכמה" a={sleep.actualWake} b={sleep.wake} c={sleep.goal.wake} />
      <T v="tiny" c="sub" style={{ marginTop: 4 }}>
        {sleep.days >= 2 ? 'כל יום מתכננים 10 דק׳ לפני הממוצע של הימים האחרונים — עד שמגיעים ליעד' : 'אחרי יומיים של "קמתי" ו"לילה טוב" — מתחילים להקדים בהדרגה'}
      </T>
    </Card>
  );
}

// ───────────── השכמה ─────────────
function Wake({ s }) {
  const { actions, settings, eff, sleep } = useDay();
  return (
    <View>
      <T v="body" c="sub" style={{ textAlign: 'center' }}>
        השעון יצלצל ב-{(eff || settings).wakeTime}, ויחזור כל {settings.alarm?.repeatEveryMin || 2} דקות עד שתסמן.
      </T>
      {sleep?.actualWake && <T v="small" c="sub" style={{ textAlign: 'center', marginTop: 4 }}>
        בימים האחרונים קמת בערך ב-{sleep.actualWake} · היעד {sleep.goal.wake}
      </T>}
      <Actions>
        <Btn title="קמתי — מודה אני" icon="sun" kind="gold" onPress={() => actions.done(s.id)} />
      </Actions>
    </View>
  );
}

// ───────────── שגרה עם טיימר לכל שלב ─────────────
// עריכת שלבי שגרה ליום הזה בלבד (למשל כריכים — "היום הם רוצים משהו אחר")
function StepsEditor({ s, onClose }) {
  const { actions } = useDay();
  const [rows, setRows] = useState((s.steps || []).map(x => ({ ...x, minutes: String(x.minutes ?? '') })));
  const upd = (i, patch) => setRows(l => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const add = () => setRows(l => [...l, { id: 'n_' + Date.now() + '_' + l.length, label: '', minutes: String(s.perItem || 4) }]);
  const save = () => {
    const steps = rows.filter(x => x.label.trim()).map(x => ({ ...x, label: x.label.trim(), minutes: Math.max(0, Number(x.minutes) || 0) }));
    actions.setOverride(s.id, { steps });
    onClose();
  };
  const reset = () => { actions.setOverride(s.id, null); onClose(); };
  return (
    <Sheet visible onClose={onClose} title={`${s.title} — לערוך להיום`}>
      <T v="small" c="sub" style={{ marginBottom: SP.sm }}>השינוי חל על היום בלבד. לשינוי קבוע — בהגדרות.</T>
      {rows.map((x, i) => (
        <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.sm }}>
          <Field value={x.label} onChangeText={v => upd(i, { label: v })} placeholder="מה לעשות" style={{ flex: 1 }} />
          <Field value={x.minutes} onChangeText={v => upd(i, { minutes: v.replace(/[^0-9]/g, '') })} keyboardType="numeric" style={{ width: 56, textAlign: 'center' }} />
          <Pressable onPress={() => setRows(l => l.filter((_, j) => j !== i))} hitSlop={8}><Icon name="x" size={18} color="#999" /></Pressable>
        </View>
      ))}
      <Btn title="+ להוסיף" kind="line" small onPress={add} style={{ alignSelf: 'flex-start', marginTop: SP.xs }} />
      <Btn title="לשמור להיום" icon="check" onPress={save} style={{ marginTop: SP.lg }} />
      {s.overridden && <Btn title="חזרה לרגיל" kind="line" small onPress={reset} style={{ marginTop: SP.sm }} />}
    </Sheet>
  );
}

function Routine({ s }) {
  const { actions } = useDay();
  const t = useT();
  const sec = useSeconds();
  const data = s.rec?.data || {};
  const marks = data.steps || {};
  const steps = s.steps || [];
  const [editing, setEditing] = useState(false);
  const canEdit = !!s.menu || !!s.overridden;
  const editBtn = canEdit ? (
    <Pressable onPress={() => setEditing(true)} style={{ alignSelf: 'flex-start', paddingVertical: 6, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Icon name="edit" size={14} color={t.gold} /><T v="small" style={{ color: t.gold, fontWeight: '700' }}>לערוך להיום</T>
    </Pressable>
  ) : null;
  const curIdx = steps.findIndex(x => !marks[x.id]);
  const cur = steps[curIdx];
  const started = s.rec?.start != null;
  const stepStartSec = (data.stepStart ?? (s.rec?.start ?? 0)) * 60;
  const left = cur ? cur.minutes * 60 - (sec - stepStartSec) : 0;

  const mark = id => {
    const n = Math.round((sec / 60) * 10) / 10;
    const next = { ...marks, [id]: n };
    if (steps.every(x => next[x.id])) actions.done(s.id, { steps: next });
    else actions.setData(s.id, { steps: next, stepStart: n });
  };

  if (!started) {
    return (
      <View>
        {editBtn}
        {editing && <StepsEditor s={s} onClose={() => setEditing(false)} />}
        {steps.map(x => (
          <View key={x.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
            <T>{x.label}</T><T c="sub" v="small">{x.minutes} דק׳</T>
          </View>
        ))}
        <Actions><Btn title="התחל" icon="play" kind="gold" onPress={() => actions.start(s.id)} /></Actions>
      </View>
    );
  }

  return (
    <View>
      {editBtn}
      {editing && <StepsEditor s={s} onClose={() => setEditing(false)} />}
      {cur && (
        <Card tone="gold" style={{ alignItems: 'center', marginBottom: SP.lg }}>
          <T v="tiny" c="sub">עכשיו · {curIdx + 1} מתוך {steps.length}</T>
          <T v="title" style={{ marginTop: 6, textAlign: 'center' }}>{cur.label}</T>
          <T v="clock" style={{ marginTop: 6, color: left < 0 ? t.warn : t.ink }}>
            {left < 0 ? '+' + fmtClock(-left) : fmtClock(left)}
          </T>
          <Btn title="בוצע" icon="check" kind="ok" style={{ alignSelf: 'stretch', marginTop: SP.md }} onPress={() => mark(cur.id)} />
        </Card>
      )}
      {steps.map((x, i) => (
        <Check key={x.id} label={x.label} checked={!!marks[x.id]}
          sub={i === curIdx ? 'עכשיו' : marks[x.id] ? 'בוצע' : `${x.minutes} דק׳`}
          onPress={() => mark(x.id)} />
      ))}
      {s.finish && <Actions><Btn title={s.finish} icon="check" onPress={() => actions.done(s.id)} /></Actions>}
    </View>
  );
}

// ───────────── טקסט (ברכות השחר, ק״ש שעל המיטה) ─────────────
function TextSt({ s, go }) {
  const { actions, settings, dayDate } = useDay();
  const text = settings.texts?.[s.textKey];
  const app = settings.apps?.[s.appKey];
  useEffect(() => { actions.start(s.id); }, [s.id]);
  const open = () => openAppAt(app, s.path, { wd: dayDate.getDay(), min: Math.max(1, Math.round(s.duration || s.minutes || 10)), end: toTime(s.plannedEnd) }).catch(fail);
  if (!text && app) {
    return (
      <Actions>
        <Btn title={`לפתוח ב${app.name}`} icon="book" kind="gold" onPress={open} />
        <Btn title="אמרתי" icon="check" kind="ok" onPress={() => actions.done(s.id)} />
      </Actions>
    );
  }
  return (
    <View>
      {text ? (
        <Card><T v="body" style={{ fontSize: 22, lineHeight: 38 }}>{text}</T></Card>
      ) : (
        <Card tone="sunk">
          <T c="sub">הנוסח עוד לא הוכנס. אפשר להדביק אותו בהגדרות ← נוסחים, ומאז הוא יופיע כאן.</T>
          <Btn title="להגדרות" kind="line" small style={{ marginTop: SP.md, alignSelf: 'flex-start' }} onPress={() => go?.('settings')} />
        </Card>
      )}
      <Actions><Btn title="אמרתי" icon="check" kind="ok" onPress={() => actions.done(s.id)} /></Actions>
    </View>
  );
}

// ───────────── רשימת סימון ─────────────
function Checklist({ s }) {
  const { actions, settings } = useDay();
  const items = s.listKey ? (settings.lists?.[s.listKey] || []) : (s.items || []);
  const checked = s.rec?.data?.checked || {};
  const [draft, setDraft] = useState('');
  const toggle = it => actions.setData(s.id, { checked: { ...checked, [it]: !checked[it] } });
  const add = () => {
    const v = draft.trim(); if (!v || !s.listKey) return;
    actions.saveSettings({ ...settings, lists: { ...settings.lists, [s.listKey]: [...items, v] } });
    setDraft('');
  };
  const missing = items.filter(i => !checked[i]);
  return (
    <View>
      {items.map(it => <Check key={it} label={it} checked={!!checked[it]} onPress={() => toggle(it)} />)}
      {s.listKey && (
        <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.sm }}>
          <Field value={draft} onChangeText={setDraft} placeholder="להוסיף לרשימה" style={{ flex: 1 }} onSubmitEditing={add} />
          <Btn title="+" small onPress={add} />
        </View>
      )}
      <Actions>
        <Btn title="סיימתי" icon="check" kind="ok" onPress={() => actions.done(s.id, { missing })} />
      </Actions>
    </View>
  );
}

// ───────────── מצרכים לכריכים (בערב למחר, או בבוקר להיום) ─────────────
function Supplies({ s }) {
  const { actions, settings, dayKey, tomorrowKey, dayDate } = useDay();
  const t = useT();
  const forTomorrow = s.target === 'tomorrow';
  const target = forTomorrow ? tomorrowKey : dayKey;
  const dow = forTomorrow ? (dayDate.getDay() + 1) % 7 : dayDate.getDay();
  const [v, setV] = useState({ checked: {} });
  const [draft, setDraft] = useState('');
  useEffect(() => { loadSupplies(target).then(x => setV({ checked: {}, ...x })); }, [target]);
  const dayItems = settings.suppliesByDay?.[dow] || [];
  const extra = settings.suppliesExtra || [];
  const items = [...new Set([...dayItems, ...extra])];
  const menu = menuFor(settings, dow);
  const toggle = it => { const n = { ...v, checked: { ...v.checked, [it]: !v.checked[it] } }; setV(n); saveSupplies(target, n); };
  const add = () => {
    const x = draft.trim(); if (!x) return;
    actions.saveSettings({ ...settings, suppliesExtra: [...extra, x] }); setDraft('');
  };
  const finish = () => {
    const missing = items.filter(i => !v.checked[i]);
    saveSupplies(target, { ...v, missing, bought: missing.length ? false : v.bought, doneEve: forTomorrow ? true : v.doneEve, done: true })
      .then(() => actions.suppliesChanged());
    actions.done(s.id, { missing });
  };
  return (
    <View>
      {menu.length > 0 && (
        <Card tone="sunk" style={{ marginBottom: SP.md }}>
          <T v="tiny" c="sub">{forTomorrow ? 'הכריכים של מחר' : 'הכריכים של היום'}</T>
          {menu.map(m => <T key={m.kid} v="small" style={{ marginTop: 4 }}><T v="small" style={{ fontWeight: '800' }}>{m.kid}:</T> {m.items.join(' · ')}</T>)}
        </Card>
      )}
      <T v="small" c="sub">לסמן מה יש בבית:</T>
      {items.map(it => <Check key={it} label={it} checked={!!v.checked[it]} onPress={() => toggle(it)} />)}
      <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.sm }}>
        <Field value={draft} onChangeText={setDraft} placeholder="להוסיף לרשימה" style={{ flex: 1 }} onSubmitEditing={add} />
        <Btn title="+" small onPress={add} />
      </View>
      <Actions>
        <Btn title="סיימתי" icon="check" kind="ok" onPress={finish} />
        <T v="small" c="sub" style={{ textAlign: 'center' }}>מה שלא סומן — נכנסת תחנה של קפיצה למכולת</T>
      </Actions>
    </View>
  );
}

// ───────────── טיימר פשוט ─────────────
function Timer({ s }) {
  const { actions, settings, dayDate } = useDay();
  const started = s.rec?.start != null;
  const app = s.appKey ? settings.apps?.[s.appKey] : null;
  const open = async () => {
    if (!started) actions.start(s.id);
    try { await openAppAt(app, s.path, { wd: dayDate.getDay(), min: Math.max(1, Math.round(s.duration || s.minutes || 10)), end: toTime(s.plannedEnd) }); } catch (e) { fail(e); }
  };
  return (
    <Actions>
      {app && s.path && <Btn title={`פתח את ${s.title} ב${app.name}`} icon="book" kind="gold" onPress={open} />}
      {!started && <Btn title="התחל טיימר" icon="play" kind={app && s.path ? 'line' : 'gold'} onPress={() => actions.start(s.id)} />}
      <Btn title="סיימתי" icon="check" kind={started ? 'ok' : 'line'} onPress={() => actions.done(s.id)} />
    </Actions>
  );
}

// ───────────── נסיעה ─────────────
function Drive({ s }) {
  const { actions, settings } = useDay();
  const t = useT();
  const legs = s.rec?.data?.order || s.legs || [];
  const leg = s.rec?.data?.leg || 0;
  // סדר האיסוף לבחירה (למשל: קודם הבנות או קודם צביה)
  const first = id => actions.setData(s.id, { order: [id, ...legs.filter(x => x !== id)] });
  const [returned, setReturned] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', st => { if (st === 'active' && opened.current) setReturned(true); });
    return () => sub.remove();
  }, []);

  const go = async () => {
    actions.start(s.id);
    try { opened.current = true; await openWaze(settings.places?.[legs[leg]] || TRIP_PLACES[legs[leg]]); } catch (e) { fail(e); }
  };
  const arrived = () => {
    setReturned(false); opened.current = false;
    // מתי הגענו לכל תחנה — כדי ללמוד כמה זמן לוקחת כל נסיעה
    const nowM = Math.round((Date.now() - new Date(new Date().setHours(0, 0, 0, 0)).getTime()) / 6000) / 10;
    const legAt = { ...(s.rec?.data?.legAt || {}), [leg]: nowM };
    if (leg + 1 >= legs.length) actions.done(s.id, { leg: leg + 1, legAt, order: legs });
    else actions.setData(s.id, { leg: leg + 1, legAt });
  };

  return (
    <View>
      {s.chooseOrder && leg === 0 && legs.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.sm }}>
          <T v="small" c="sub" style={{ alignSelf: 'center' }}>קודם:</T>
          {legs.map(id => <Chip key={id} label={(settings.places?.[id] || TRIP_PLACES[id])?.name || id} active={legs[0] === id} onPress={() => first(id)} />)}
        </View>
      )}
      {legs.map((id, i) => {
        const p = settings.places?.[id] || TRIP_PLACES[id] || { name: id };
        const state = i < leg ? 'done' : i === leg ? 'cur' : 'next';
        return (
          <View key={id + i} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: 10, opacity: state === 'done' ? 0.45 : 1 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
              backgroundColor: state === 'cur' ? t.navy : t.sunk }}>
              {state === 'done' ? <Icon name="check" size={16} color={t.ok} /> :
                <T v="small" style={{ color: state === 'cur' ? t.onNavy : t.sub, fontWeight: '800' }}>{i + 1}</T>}
            </View>
            <View style={{ flex: 1 }}>
              <T v="bodyB">{p.name}</T>
              <T v="small" c="sub">{p.address || 'אין כתובת — להוסיף בהגדרות'} · ~{p.minutes || 10} דק׳</T>
            </View>
          </View>
        );
      })}
      <Actions>
        <Btn title={`פתח וויז — ${(settings.places?.[legs[leg]] || TRIP_PLACES[legs[leg]])?.name || ''}`} icon="nav" kind={returned ? 'line' : 'gold'} onPress={go} />
        <Btn title={leg + 1 >= legs.length ? 'הגעתי' : 'הגעתי — לתחנה הבאה'} icon="check"
          kind={returned ? 'ok' : 'primary'} onPress={arrived} />
      </Actions>
    </View>
  );
}

// ───────────── בחירת מניין ─────────────
function Minyan({ s }) {
  const ctx = useDay();
  const { actions, state, zmanim, now, dayDate } = ctx;
  const settings = ctx.eff || ctx.settings;
  const t = useT();
  const opts = evaluateMinyan({ settings, date: dayDate, state, zmanim, now, prayer: s.prayer });
  const chosen = state.choices?.[s.prayer];
  const recommended = opts.find(o => o.ok) || opts.find(o => o.reachable);
  const pick = time => { actions.choose(s.prayer, time); actions.done(s.id, { picked: time }); };

  return (
    <View style={{ gap: SP.sm }}>
      {opts.map(o => {
        const isRec = recommended?.time === o.time;
        const lateAfter = o.after && o.after.late > 1;
        return (
          <Pressable key={o.time} disabled={!o.reachable || lateAfter} onPress={() => pick(o.time)}>
            <Card tone={isRec ? 'gold' : undefined} style={{ opacity: o.reachable && !lateAfter ? 1 : 0.4, flexDirection: 'row', alignItems: 'center', gap: SP.lg }}>
              <T v="clock" style={{ fontSize: 34 }}>{o.time}</T>
              <View style={{ flex: 1 }}>
                {!o.reachable ? <T c="sub">כבר לא מספיקים</T> : (
                  <>
                    <T v="bodyB">{o.joinLate > 0 ? `מצטרפים באמצע (${o.joinLate} דק׳ אחרי שהתחיל)` : o.studyMinutes > 0 ? `${fmtDur(o.studyMinutes)} ללימוד לפני` : 'מתחילים מיד'}</T>
                    {o.after && (
                      <T v="small" style={{ color: lateAfter ? t.bad : t.ok }}>
                        {lateAfter ? `לא מספיקים ל${o.after.title} (${toTime(o.after.time)})` : `מספיקים ל${o.after.title} (${toTime(o.after.time)})`}
                      </T>
                    )}
                    {o.warn.map(w => <T key={w} v="small" style={{ color: t.warn }}>{w}</T>)}
                  </>
                )}
              </View>
              {(chosen === o.time || (!chosen && isRec)) && <Icon name="check" color={t.ok} />}
            </Card>
          </Pressable>
        );
      })}
      {!opts.length && <T c="sub">לא הוגדרו מניינים — הגדרות ← מניינים</T>}
      {(!opts.some(o => o.ok)) && (() => {
        // ביחידות — האם מספיקים לפני הכולל? (עד 9:15 בערך: קרבנות + שחרית + נסיעה)
        // עם כל הוויתורים (הכנה לכולל מתבטלת וכו׳) — האם שחרית עדיין לפני הכולל?
        const sim = planDay({ settings, date: dayDate, state: { ...state, choices: { ...(state.choices || {}), [s.prayer]: 'alone' } }, zmanim, now });
        const pi = sim.list.findIndex(x => x.type === 'prayer' && x.prayer === s.prayer);
        const prot = sim.list.findIndex(x => x.protect);
        const lateProt = prot >= 0 && pi > prot;
        const pr = sim.list[pi];
        return (
          <Btn title={!lateProt ? `ביחידות עכשיו${pr ? ` (${toTime(pr.plannedStart)})` : ''} — מספיקים ל${sim.list.slice(pi + 1).find(x => x.protect)?.title || 'הבא'}` : 'לא מספיקים לפני הכולל — ביחידות אחרי הכולל'}
            icon="check" kind="gold" style={{ marginTop: SP.md }}
            onPress={() => { actions.choose(s.prayer, 'alone'); actions.done(s.id, { picked: 'alone' }); }} />
        );
      })()}
    </View>
  );
}

// ───────────── לימוד (ממלא את הזמן עד העוגן הבא) ─────────────
function Study({ s }) {
  const { actions, settings, dayDate, learnSync, state } = useDay();
  const currentDate = dateKey(new Date());
  const snap = learnSync?.date === currentDate ? learnSync : null;
  const outstanding = (snap?.remaining || []).filter(x => x.pct < 100);
  const remainingMinutes = outstanding.reduce((sum,x) => sum + x.minutes,0);
  const prayers = ['shacharit','mincha','maariv'].filter(k =>
    state.stations?.[k]?.status === 'done').join(',');
  const prayerQuery = prayers ? `&markPrayers=${encodeURIComponent(prayers)}&markDay=${currentDate}` : '';
  const app = settings.apps?.[s.appKey];
  return (
    <Actions>
      {snap && <Card tone="sunk">
        <T v="bodyB">נותרו ללימוד: {remainingMinutes} דקות · {outstanding.length} חלקים</T>
        {outstanding.slice(0,5).map(x => <T key={x.id} v="small" c="sub">{x.name}: {x.minutes} דק׳{x.pct ? ` · ${x.pct}% הושלם` : ''}</T>)}
      </Card>}
      <Btn title={snap ? 'רענן התקדמות מהלימוד היומי' : 'ייבא את ההתקדמות מהלימוד היומי'}
        icon="undo" kind="line" small onPress={() =>
          openAppAt(app, 'index.html?syncSeder=1').catch(fail)} />
      {!snap && <T v="small" c="sub">לחיצה מייבאת את הלימודים שנותרו ואת הזמן המשוער.</T>}
      {app && (s.options || [{ label: `פתח את ${app.name}`, path: s.path }])
        .filter(o => !o.days || o.days.includes(dayDate.getDay()))
        .map((o, i) => (
          <Btn key={o.label} title={`${o.label}${s.duration > 0 && i === 0 ? ` · ${fmtDur(s.duration)}` : ''}`} icon="book" kind={i === 0 ? 'gold' : 'line'}
            onPress={async () => { actions.start(s.id); try { await openAppAt(app, (o.path || 'index.html?go=1&min={min}') + prayerQuery, { wd: dayDate.getDay(), min: Math.max(1,Math.floor(s.duration||10)), end: toTime(s.plannedEnd) }); } catch (e) { fail(e); } }} />
        ))}
      <Btn title="סיימתי ללמוד" icon="check" kind="line" onPress={() => actions.done(s.id)} />
    </Actions>
  );
}

// ───────────── תפילה ─────────────
function Prayer({ s }) {
  const { actions, now, settings, dayDate } = useDay();
  const app = s.appKey ? settings.apps?.[s.appKey] : null;
  const open = async () => {
    if (s.rec?.start == null) actions.start(s.id);
    try { await openAppAt(app, s.path, { wd: dayDate.getDay(), min: Math.max(1, Math.round(s.duration || 20)), end: toTime(s.plannedEnd) }); } catch (e) { fail(e); }
  };
  const wait = Math.round(s.plannedStart - now);
  return (
    <View>
      <T v="h2" style={{ textAlign: 'center' }}>{!s.anchor ? 'כל המניינים עברו — ביחידות' : wait > 0 ? `מתחילים ב-${toTime(s.plannedStart)} · בעוד ${fmtDur(wait)}` : `מניין ${toTime(s.plannedStart)}`}</T>
      <Actions>
        {app && s.path && <Btn title={`פתח את ה${s.title.replace(/ ביחידות.*$/, '')} ב${app.name}`} icon="book" kind="gold" onPress={open} />}
        <Btn title="התפללתי" icon="check" kind="ok" onPress={() => actions.done(s.id)} />
      </Actions>
    </View>
  );
}

// ───────────── רישום (מה אני מוסר / להדפיס) ─────────────
function Note({ s }) {
  const { actions } = useDay();
  const d = s.rec?.data || {};
  const [text, setText] = useState(d.text || '');
  return (
    <View>
      {!!s.check && <Check label={s.check} checked={!!d.print} onPress={() => actions.setData(s.id, { print: !d.print })}
        sub={d.print ? 'לא לשכוח להדפיס לפני היציאה' : null} />}
      {!!s.ask && (
        <View style={{ marginTop: SP.md }}>
          <T v="bodyB" style={{ marginBottom: SP.sm }}>{s.ask}</T>
          <Field value={text} onChangeText={setText} placeholder="הנושא של השיעור" multiline
            style={{ minHeight: 70 }} />
        </View>
      )}
      <Actions><Btn title="מוכן — יוצאים" icon="check" kind="ok" onPress={() => actions.done(s.id, { text })} /></Actions>
    </View>
  );
}

// ───────────── צילום שיעור ─────────────
function Camera({ s }) {
  const { actions } = useDay();
  return (
    <Actions>
      <Btn title="פתח מצלמה — להתחיל להקליט" icon="camera" kind="gold"
        onPress={async () => { actions.start(s.id); try { await openVideoCamera(); } catch (e) { fail(e); } }} />
      <Btn title="השיעור הסתיים" icon="check" kind="ok" onPress={() => actions.done(s.id)} />
    </Actions>
  );
}

// ───────────── פתיחת אפליקציה ─────────────
function AppSt({ s }) {
  const { actions, settings } = useDay();
  const app = settings.apps?.[s.appKey];
  return (
    <Actions>
      <Btn title={`פתח את ${app?.name || 'האפליקציה'}`} icon="fwd" kind="gold"
        onPress={async () => { actions.start(s.id); try { await openApp(app); } catch (e) { fail(e); } }} />
      <Btn title="סיימתי" icon="check" kind="ok" onPress={() => actions.done(s.id)} />
    </Actions>
  );
}

// ───────────── מונה (מבצעים) ─────────────
function Counter({ s }) {
  const { actions } = useDay();
  const n = s.rec?.data?.count || 0;
  const set = v => { actions.start(s.id); actions.setData(s.id, { count: Math.max(0, v) }); };
  return (
    <View style={{ alignItems: 'center' }}>
      <T v="small" c="sub">{s.counterLabel}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.xl, marginTop: SP.sm }}>
        <IconBtn name="minus" size={56} tone="sunk" onPress={() => set(n - 1)} />
        <T v="hero" style={{ minWidth: 100, textAlign: 'center' }}>{n}</T>
        <IconBtn name="plus" size={56} tone="sunk" onPress={() => set(n + 1)} />
      </View>
      <View style={{ alignSelf: 'stretch' }}>
        <Actions>
          <Btn title="שלח דיווח" icon="send" kind="gold"
            onPress={() => shareText(`מבצעים היום: ${n} ${s.counterLabel || ''}`.trim())} />
          <Btn title="סיימתי" icon="check" kind="ok" onPress={() => actions.done(s.id, { count: n })} />
        </Actions>
      </View>
    </View>
  );
}

// ───────────── מכולת: לקנות מה שחסר לכריכים ─────────────
function Shop({ s }) {
  const { actions, dayKey, tomorrowKey } = useDay();
  const target = s.target === 'tomorrow' ? tomorrowKey : dayKey;
  const [v, setV] = useState(null);
  useEffect(() => { loadSupplies(target).then(x => setV(x || {})); }, [target]);
  if (!v) return null;
  const missing = v.missing || [];
  const got = v.got || {};
  const toggle = it => { const n = { ...v, got: { ...got, [it]: !got[it] } }; setV(n); saveSupplies(target, n); };
  const finish = async () => {
    const left = missing.filter(i => !got[i]);
    await saveSupplies(target, { ...v, bought: true, leftover: left });
    if (left.length) actions.addTask(`לא היה במכולת: ${left.join(', ')}`);
    actions.suppliesChanged();
    actions.done(s.id, { got, left });
  };
  return (
    <View>
      <T v="small" c="sub">לקנות:</T>
      {missing.map(it => <Check key={it} label={it} checked={!!got[it]} onPress={() => toggle(it)} />)}
      <Actions>
        {!s.rec?.start && <Btn title="יוצא למכולת" icon="play" kind="gold" onPress={() => actions.start(s.id)} />}
        <Btn title="חזרתי" icon="check" kind="ok" onPress={finish} />
        <T v="small" c="sub" style={{ textAlign: 'center' }}>מה שלא סומן — נכנס למשימות</T>
      </Actions>
    </View>
  );
}

// ───────────── משימות להיום / התרמה ─────────────
function Tasks({ s }) {
  const { actions, todayTasks, calls, dayKey, tomorrowKey } = useDay();
  const [draft, setDraft] = useState('');
  const open = todayTasks.filter(x => !x.done);
  const add = () => { const v = draft.trim(); if (!v) return; actions.addTask(v); setDraft(''); };
  return (
    <View>
      {todayTasks.map(x => (
        <Check key={x.id} label={x.title} checked={x.done} onPress={() => actions.toggleTask(x.id)}
          sub={x.date < dayKey && !x.done ? 'נשאר מיום קודם' : null}
          right={!x.done && <Chip label="למחר" onPress={() => actions.moveTask(x.id, tomorrowKey)} />} />
      ))}
      <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.sm }}>
        <Field value={draft} onChangeText={setDraft} placeholder="משימה חדשה להיום" style={{ flex: 1 }} onSubmitEditing={add} />
        <Btn title="+" small onPress={add} />
      </View>
      <CrmTasks />
      <LessonsWeek />
      <CallList />
      <Actions><Btn title="סיימתי" icon="check" kind="line" onPress={() => actions.done(s.id)} /></Actions>
    </View>
  );
}

function CrmTasks() {
  const { settings, dayKey } = useDay();
  const [list, setList] = useState([]);
  const [done, setDone] = useState({});
  const url = settings.crm?.url;
  useEffect(() => {
    if (!url) return;
    fetchCrmTasks(url, dayKey).then(setList);
    crmDone().then(setDone);
  }, [url, dayKey]);
  if (!url || !list.length) return null;
  return (
    <View style={{ marginTop: SP.lg }}>
      <T v="tiny" c="sub">מה-CRM</T>
      {list.map(x => (
        <Check key={x.id} label={x.title} checked={!!done[x.id]}
          sub={[x.group, x.overdue && `מ-${x.date}`, x.time].filter(Boolean).join(' · ')}
          onPress={() => toggleCrmDone(x.id, dayKey).then(setDone)} />
      ))}
    </View>
  );
}

export function CallList() {
  const { settings } = useDay();
  return <RemoteCalls url={settings.calls?.url || PUBLIC_SHEET} />;
}

// רשימה מהגיליון
function RemoteCalls({ url }) {
  const { dayKey } = useDay();
  const t = useT();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [log, setLog] = useState({});
  const [cur, setCur] = useState(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);

  const load = force => fetchPeople(url, { force }).then(d => { setData(d); setErr(d?.error || null); }).catch(e => setErr(String(e.message || e)));
  useEffect(() => {
    load(false);
    loadCallLog().then(setLog);
  }, [url]);

  const call = async p => {
    setLog(await logCall({ row: p.row, name: p.name, date: dayKey }));
    setCur(p); setStatus(''); setNote('');
    dial(firstPhone(p.phone)).catch(fail);
  };
  const send = async () => {
    setBusy(true);
    try { setLog(await logCall({ row: cur.row, name: cur.name, date: dayKey, status, note: note.trim() })); setCur(null); }
    catch (e) { fail(e); } finally { setBusy(false); }
  };

  if (!data && !err) return <T c="sub" style={{ marginTop: SP.xl }}>טוען את רשימת ההתרמה…</T>;
  const list = whoToCall(data?.people || [], log);
  const todayDone = list.filter(p => p.lastCall === dayKey);
  const queue = list.filter(p => p.lastCall !== dayKey);
  const shown = queue.slice(0, more ? 40 : 10);
  const statuses = (data?.statuses?.length ? data.statuses : ['לנסות שוב', 'לחזור אליו', 'תורם', 'לא תורם', 'נשלח לינק', 'לשלוח לינק']);

  return (
    <View style={{ marginTop: SP.xl }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="tiny" c="sub">להתרים · {queue.length} בתור{todayDone.length ? ` · ${todayDone.length} היום` : ''}</T>
        <Chip label="רענון" onPress={() => load(true)} />
      </View>
      {!!err && <T v="small" style={{ color: t.warn, marginTop: 6 }}>{data ? 'מציג רשימה שמורה — ' : ''}{err}</T>}
      {shown.map(p => {
        const hist = p.history.filter(Boolean);
        return (
          <View key={p.row} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 10 }}>
            <View style={{ flex: 1 }}>
              <T v="bodyB">{p.name}</T>
              <T v="small" c="sub" numberOfLines={2}>
                {[p.myStatus || p.status, (p.forecast || p.potential) && `צפי ${p.forecast || p.potential}`, hist.length && `שנים קודמות: ${hist.join(' · ')}`, p.note, p.lastCall && `התקשרתי ${p.lastCall}`, p.myNotes?.slice(-1)[0]].filter(Boolean).join(' · ')}
              </T>
            </View>
            <Chip label={p.later ? 'להחזיר' : 'לסוף'} onPress={async () => setLog(await toggleLater(p))} />
            <IconBtn name="phone" tone="sunk" onPress={() => call(p)} />
          </View>
        );
      })}
      {queue.length > 10 && !more && <Btn title="להציג עוד" kind="ghost" small onPress={() => setMore(true)} />}

      <Sheet visible={!!cur} onClose={() => setCur(null)} title={cur ? `איך היה עם ${cur.name}?` : ''}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
          {statuses.map(x => <Chip key={x} label={x} active={status === x} onPress={() => setStatus(status === x ? '' : x)} />)}
        </View>
        <Field value={note} onChangeText={setNote} placeholder="הערה (סכום, מתי לחזור…)" multiline style={{ marginTop: SP.md, minHeight: 70 }} />
        <T v="small" c="sub" style={{ marginTop: SP.sm }}>נשמר רק בטלפון — הגיליון לא משתנה.</T>
        <Btn title={busy ? 'שומר…' : 'שמור'} icon="check" kind="ok" disabled={busy} style={{ marginTop: SP.md }} onPress={send} />
      </Sheet>
    </View>
  );
}

// רשימה מקומית (עד שמחברים את הגיליון)
function LocalCalls() {
  const { calls, actions, dayKey } = useDay();
  const t = useT();
  const [name, setName] = useState(''), [phone, setPhone] = useState('');
  const sorted = [...calls].sort((a, b) => (a.last || '').localeCompare(b.last || ''));
  return (
    <View style={{ marginTop: SP.xl }}>
      <T v="tiny" c="sub">אין משימות פתוחות — זמן להתרים</T>
      <T v="small" c="sub" style={{ marginTop: 4 }}>אפשר לחבר את גיליון ההתרמה בהגדרות ← התרמה</T>
      {sorted.map(c => {
        const today = c.last === dayKey;
        return (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <T v="bodyB" style={today ? { color: t.ok } : null}>{c.name}</T>
              <T v="small" c="sub">{today ? 'דיברתם היום' : c.last ? `שיחה אחרונה ${c.last}` : 'עוד לא התקשרת'}</T>
            </View>
            {!!c.phone && <IconBtn name="phone" tone="sunk" onPress={() => { actions.updateCall(c.id, { last: dayKey }); dial(c.phone).catch(fail); }} />}
          </View>
        );
      })}
      <View style={{ gap: SP.sm, marginTop: SP.sm }}>
        <Field value={name} onChangeText={setName} placeholder="שם" />
        <View style={{ flexDirection: 'row', gap: SP.sm }}>
          <Field value={phone} onChangeText={setPhone} placeholder="טלפון" keyboardType="phone-pad" style={{ flex: 1 }} />
          <Btn title="הוסף" small onPress={() => { if (!name.trim()) return; actions.addCall({ name: name.trim(), phone }); setName(''); setPhone(''); }} />
        </View>
      </View>
    </View>
  );
}

// ───────────── זמן בית ─────────────
function Home({ s }) {
  const { actions, settings, dayDate } = useDay();
  const t = useT();
  const d = s.rec?.data || {};
  const [reason, setReason] = useState('');
  const [mins, setMins] = useState(settings.homeTime?.defaultUnlockMin || 10);
  const [usage, setUsage] = useState([]);
  const [lockOn, setLockOn] = useState(true);
  const checks = (settings.homeChecks || []).filter(c => !c.days || c.days.includes(dayDate.getDay()));
  const allowed = (settings.homeTime?.allowed || []).map(k => ({ k, ...settings.apps?.[k] })).filter(a => a.name);
  const log = d.log || [];
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const unlockUntil = d.unlockUntil;
  const unlocked = unlockUntil != null && nowM < unlockUntil;

  useEffect(() => {
    const load = () => {
      const from = new Date(dayDate); from.setHours(0, 0, 0, 0);
      setUsage((Native.usageSince(from.getTime()) || []).filter(u => u.minutes >= 1).slice(0, 8));
      setLockOn(Native.isLockServiceOn());
    };
    load();
    const sub = AppState.addEventListener('change', st => st === 'active' && load());
    return () => sub.remove();
  }, [dayDate]);

  const unlock = () => {
    if (!reason.trim()) { Alert.alert('זמן בית', 'כתוב קודם בשביל מה צריך את הטלפון'); return; }
    actions.unlockApp(null, null, reason.trim(), mins);
    actions.setData(s.id, { unlockUntil: nowM + mins });
    setReason('');
  };

  return (
    <View>
      {checks.map(c => (
        <Check key={c.id} label={c.label} checked={!!d.checks?.[c.id]}
          onPress={() => actions.setData(s.id, { checks: { ...(d.checks || {}), [c.id]: !d.checks?.[c.id] } })} />
      ))}

      <LessonsWeek />

      {Native.hasNative && !lockOn && (
        <Card tone="warn" style={{ marginTop: SP.md }}>
          <T v="bodyB">הנעילה עוד לא פעילה</T>
          <T v="small" c="sub" style={{ marginTop: 4 }}>צריך להפעיל פעם אחת את "סדר היום — זמן בית" בהגדרות הנגישות של הטלפון.</T>
          <Btn title="להפעלה" small kind="line" style={{ marginTop: SP.sm, alignSelf: 'flex-start' }} onPress={() => Native.openAccessibilitySettings()} />
        </Card>
      )}

      <T v="tiny" c="sub" style={{ marginTop: SP.lg, marginBottom: SP.sm }}>פתוח בזמן בית</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
        {allowed.map(a => <Btn key={a.k} title={a.name} small kind="line" onPress={() => openApp(a).catch(fail)} />)}
      </View>

      <Card tone={unlocked ? 'ok' : 'sunk'} style={{ marginTop: SP.lg }}>
        {unlocked ? (
          <T v="bodyB">הטלפון פתוח עד {toTime(unlockUntil)}</T>
        ) : (
          <>
            <T v="bodyB" style={{ marginBottom: SP.sm }}>צריך משהו אחר?</T>
            <Field value={reason} onChangeText={setReason} placeholder="בשביל מה?" />
            <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.sm }}>
              {[5, 10, 20, 30].map(m => <Chip key={m} label={`${m} דק׳`} active={mins === m} onPress={() => setMins(m)} />)}
            </View>
            <Btn title="פתח" icon="lock" small style={{ marginTop: SP.md, alignSelf: 'flex-start' }} onPress={unlock} />
          </>
        )}
      </Card>

      {log.length > 0 && (
        <View style={{ marginTop: SP.lg }}>
          <T v="tiny" c="sub">בשביל מה פתחת</T>
          {log.map((l, i) => (
            <T key={i} v="small" style={{ marginTop: 4 }}>
              {typeof l.at === 'number' ? toTime(l.at) : l.at} · {l.app ? `${l.app} — ` : ''}{l.reason} ({l.minutes} דק׳)
            </T>
          ))}
        </View>
      )}

      {usage.length > 0 && (
        <View style={{ marginTop: SP.lg }}>
          <T v="tiny" c="sub">הזמן בטלפון היום</T>
          {usage.map(u => (
            <View key={u.pkg} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <T v="small">{u.label}</T>
              <T v="small" c="sub">{fmtDur(u.minutes)} · {u.opens} פתיחות</T>
            </View>
          ))}
        </View>
      )}
      <Actions><Btn title="סיום זמן בית" icon="check" kind="line" onPress={() => actions.done(s.id)} /></Actions>
    </View>
  );
}

// ───────────── השיעורים השבוע — מופיע בכל זמן פנוי ─────────────
export function LessonsWeek() {
  const { settings, dayDate } = useDay();
  const t = useT();
  const [prep, setPrep] = useState({});
  useEffect(() => { loadPrep().then(setPrep); }, []);
  const list = weekLessons(settings, dayDate);
  if (!list.length) return null;
  const toggle = k => { const n = { ...prep, [k]: !prep[k] }; setPrep(n); savePrep(n); };
  const left = list.filter(l => !prep[l.key]).length;
  return (
    <Card tone={left ? 'gold' : 'ok'} style={{ marginTop: SP.lg }}>
      <T v="tiny" c="sub">השיעורים השבוע · {left ? `${left} עוד לא הוכנו` : 'הכל מוכן ✓'}</T>
      {list.map(l => (
        <Check key={l.key} label={l.title} checked={!!prep[l.key]}
          sub={`${l.isToday ? 'היום' : `יום ${l.day}`}${l.at ? ` · ${l.at}` : ''}${prep[l.key] ? ' · הוכן' : ''}`}
          onPress={() => toggle(l.key)} />
      ))}
    </Card>
  );
}

// ───────────── משימות למחר ─────────────
function Plan({ s }) {
  const { actions, tasks, tomorrowKey } = useDay();
  const [draft, setDraft] = useState('');
  const list = tasks.filter(x => x.date === tomorrowKey);
  const add = () => { const v = draft.trim(); if (!v) return; actions.addTask(v, tomorrowKey); setDraft(''); };
  return (
    <View>
      {list.map(x => (
        <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
          <T style={{ flex: 1 }}>• {x.title}</T>
          <IconBtn name="trash" size={34} onPress={() => actions.removeTask(x.id)} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.sm }}>
        <Field value={draft} onChangeText={setDraft} placeholder="מה צריך מחר?" style={{ flex: 1 }} onSubmitEditing={add} autoFocus />
        <Btn title="+" small onPress={add} />
      </View>
      <LessonsWeek />
      <Actions><Btn title={list.length ? 'זהו למחר' : 'אין משהו מיוחד'} icon="check" kind="ok" onPress={() => actions.done(s.id)} /></Actions>
    </View>
  );
}

// ───────────── סגירת יום ─────────────
function Close({ s }) {
  const { actions, plan } = useDay();
  const done = plan.list.filter(x => x.status === 'done').length;
  const skipped = plan.list.filter(x => x.status === 'skipped');
  return (
    <View>
      <T v="h2">{done} תחנות הושלמו היום</T>
      {skipped.length > 0 && <T c="sub" style={{ marginTop: 6 }}>דולגו: {skipped.map(x => x.title).join(' · ')}</T>}
      <Actions><Btn title="סגירת יום" icon="moon" kind="gold" onPress={() => actions.done(s.id)} /></Actions>
    </View>
  );
}

function Sleep({ s }) {
  const { actions, settings, eff, sleep } = useDay();
  return (
    <View>
      {sleep && <SleepCard sleep={sleep} />}
      <T v="body" c="sub" style={{ textAlign: 'center' }}>השכמה מחר ב-{(eff || settings).wakeTime}. אחרי "לילה טוב" הטלפון ננעל — פתוחים רק השעון והטלפון.</T>
      <Actions><Btn title="לילה טוב" icon="moon" onPress={() => actions.done(s.id)} /></Actions>
    </View>
  );
}

function Shabbat({ s }) {
  const { actions, zmanim } = useDay();
  return (
    <View>
      <T v="h2" style={{ textAlign: 'center' }}>הדלקת נרות {zmanim.candles || ''}</T>
      <Actions><Btn title="שבת שלום" icon="candle" kind="gold" onPress={() => actions.done(s.id)} /></Actions>
    </View>
  );
}

// ───────────── תחנה פתוחה — השכבת הילדים ─────────────
function Open({ s }) {
  const { actions } = useDay();
  const t = useT();
  const sec = useSeconds();
  const d = s.rec?.data || {};
  const started = s.rec?.start != null;
  const elapsed = started ? sec - s.rec.start * 60 : 0;
  const marks = d.items || {};
  const toggle = it => actions.setData(s.id, { items: { ...marks, [it]: !marks[it] } });
  if (!started) {
    return (
      <View>
        {(s.items || []).map(it => <T key={it} style={{ paddingVertical: 6 }}>• {it}</T>)}
        <T v="small" c="sub" style={{ marginTop: SP.sm }}>
          {s.learnedFrom ? `בדרך כלל לוקח כ-${fmtDur(s.minutes)} (ממוצע של ${s.learnedFrom} ערבים)` : 'האפליקציה תלמד כמה זמן זה לוקח'}
        </T>
        <Actions><Btn title="מתחילים" icon="play" kind="gold" onPress={() => actions.start(s.id)} /></Actions>
      </View>
    );
  }
  return (
    <View>
      <Card tone="sunk" style={{ alignItems: 'center' }}>
        <T v="small" c="sub">עבר</T>
        <T v="clock">{fmtClock(elapsed)}</T>
        {s.nudgeEvery && <T v="small" c="sub">רטט שקט כל {s.nudgeEvery} דק׳ — "כולם ישנים?"</T>}
      </Card>
      {s.squeezed && (
        <Card tone="warn" style={{ marginTop: SP.sm, alignItems: 'center' }}>
          <T v="bodyB">לסיים עד {toTime(s.plannedEnd)}</T>
          <T v="small" c="sub">{s.squeezeFor ? `כדי להגיע ל${s.squeezeFor} בזמן` : 'כדי להגיע בזמן'}</T>
        </Card>
      )}
      {(s.items || []).map(it => <Check key={it} label={it} checked={!!marks[it]} onPress={() => toggle(it)} />)}
      <Actions><Btn title="כולם ישנים" icon="moon" kind="ok" onPress={() => actions.done(s.id)} /></Actions>
    </View>
  );
}

const MAP = {
  wake: Wake, routine: Routine, text: TextSt, checklist: Checklist, timer: Timer, drive: Drive,
  minyan: Minyan, study: Study, prayer: Prayer, note: Note, camera: Camera, app: AppSt,
  open: Open, supplies: Supplies, shop: Shop, counter: Counter, tasks: Tasks, home: Home, plan: Plan, close: Close, sleep: Sleep, shabbat: Shabbat,
};

export default function StationBody({ s, go }) {
  const C = MAP[s.type] || Timer;
  return <C s={s} go={go} />;
}
