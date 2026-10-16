// כל סוגי התחנות. כל רכיב מקבל את התחנה מהתכנית (s) ומציג את גוף התחנה
// ואת הפעולות שלה. המעטפת (כותרת, טבעת, דילוג) — ב-NowScreen.
import { useEffect, useState, useRef } from 'react';
import { View, Alert, AppState, Pressable } from 'react-native';
import { useDay } from '../lib/DayContext';
import { evaluateMinyan } from '../lib/engine';
import { openWaze, openApp, openVideoCamera, dial, shareText } from '../lib/launch';
import { toTime, fmtDur, fmtClock, toMin, dateKey, addDays } from '../lib/time';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Check, Card, Field, Chip, IconBtn, Divider, Sheet } from '../components/UI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPeople, reportCall, whoToCall, firstPhone } from '../lib/callsApi';
import Icon from '../components/Icon';

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

// ───────────── השכמה ─────────────
function Wake({ s }) {
  const { actions, settings } = useDay();
  return (
    <View>
      <T v="body" c="sub" style={{ textAlign: 'center' }}>
        השעון יצלצל ב-{settings.wakeTime}, ויחזור כל {settings.alarm?.repeatEveryMin || 2} דקות עד שתסמן.
      </T>
      <Actions>
        <Btn title="קמתי — מודה אני" icon="sun" kind="gold" onPress={() => actions.done(s.id)} />
      </Actions>
    </View>
  );
}

// ───────────── שגרה עם טיימר לכל שלב ─────────────
function Routine({ s }) {
  const { actions } = useDay();
  const t = useT();
  const sec = useSeconds();
  const data = s.rec?.data || {};
  const marks = data.steps || {};
  const steps = s.steps || [];
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
  const { actions, settings } = useDay();
  const text = settings.texts?.[s.textKey];
  useEffect(() => { actions.start(s.id); }, [s.id]);
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

// ───────────── טיימר פשוט ─────────────
function Timer({ s }) {
  const { actions } = useDay();
  const started = s.rec?.start != null;
  return (
    <Actions>
      {!started && <Btn title="התחל טיימר" icon="play" kind="gold" onPress={() => actions.start(s.id)} />}
      <Btn title="סיימתי" icon="check" kind={started ? 'ok' : 'line'} onPress={() => actions.done(s.id)} />
    </Actions>
  );
}

// ───────────── נסיעה ─────────────
function Drive({ s }) {
  const { actions, settings } = useDay();
  const t = useT();
  const legs = s.legs || [];
  const leg = s.rec?.data?.leg || 0;
  const [returned, setReturned] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', st => { if (st === 'active' && opened.current) setReturned(true); });
    return () => sub.remove();
  }, []);

  const go = async () => {
    actions.start(s.id);
    try { opened.current = true; await openWaze(settings.places?.[legs[leg]]); } catch (e) { fail(e); }
  };
  const arrived = () => {
    setReturned(false); opened.current = false;
    if (leg + 1 >= legs.length) actions.done(s.id, { leg: leg + 1 });
    else actions.setData(s.id, { leg: leg + 1 });
  };

  return (
    <View>
      {legs.map((id, i) => {
        const p = settings.places?.[id] || { name: id };
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
        <Btn title={`פתח וויז — ${settings.places?.[legs[leg]]?.name || ''}`} icon="nav" kind={returned ? 'line' : 'gold'} onPress={go} />
        <Btn title={leg + 1 >= legs.length ? 'הגעתי' : 'הגעתי — לתחנה הבאה'} icon="check"
          kind={returned ? 'ok' : 'primary'} onPress={arrived} />
      </Actions>
    </View>
  );
}

// ───────────── בחירת מניין ─────────────
function Minyan({ s }) {
  const ctx = useDay();
  const { actions, settings, state, zmanim, now, dayDate } = ctx;
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
          <Pressable key={o.time} disabled={!o.reachable} onPress={() => pick(o.time)}>
            <Card tone={isRec ? 'gold' : undefined} style={{ opacity: o.reachable ? 1 : 0.4, flexDirection: 'row', alignItems: 'center', gap: SP.lg }}>
              <T v="clock" style={{ fontSize: 34 }}>{o.time}</T>
              <View style={{ flex: 1 }}>
                {!o.reachable ? <T c="sub">כבר לא מספיקים</T> : (
                  <>
                    <T v="bodyB">{o.studyMinutes > 0 ? `${fmtDur(o.studyMinutes)} ללימוד לפני` : 'מתחילים מיד'}</T>
                    {o.after && (
                      <T v="small" style={{ color: lateAfter ? t.bad : t.ok }}>
                        {lateAfter ? `איחור של ${Math.round(o.after.late)} דק׳ ל${o.after.title}` : `מספיקים ל${o.after.title} (${toTime(o.after.time)})`}
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
    </View>
  );
}

// ───────────── לימוד (ממלא את הזמן עד העוגן הבא) ─────────────
function Study({ s }) {
  const { actions, settings } = useDay();
  const app = settings.apps?.[s.appKey];
  return (
    <Actions>
      {app && <Btn title={`פתח את ${app.name}`} icon="book" kind="gold"
        onPress={async () => { actions.start(s.id); try { await openApp(app); } catch (e) { fail(e); } }} />}
      <Btn title="סיימתי ללמוד" icon="check" kind="line" onPress={() => actions.done(s.id)} />
    </Actions>
  );
}

// ───────────── תפילה ─────────────
function Prayer({ s }) {
  const { actions, now } = useDay();
  const wait = Math.round(s.plannedStart - now);
  return (
    <View>
      <T v="h2" style={{ textAlign: 'center' }}>{wait > 0 ? `מתחילים ב-${toTime(s.plannedStart)} · בעוד ${fmtDur(wait)}` : `מניין ${toTime(s.plannedStart)}`}</T>
      <Actions><Btn title="התפללתי" icon="check" kind="ok" onPress={() => actions.done(s.id)} /></Actions>
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
      {open.length === 0 && <CallList />}
      <Actions><Btn title="סיימתי" icon="check" kind="line" onPress={() => actions.done(s.id)} /></Actions>
    </View>
  );
}

export function CallList() {
  const { settings } = useDay();
  return settings.calls?.url ? <RemoteCalls url={settings.calls.url} /> : <LocalCalls />;
}

// רשימה מהגיליון
function RemoteCalls({ url }) {
  const { dayKey } = useDay();
  const t = useT();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [seen, setSeen] = useState({});
  const [cur, setCur] = useState(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);

  const load = force => fetchPeople(url, { force }).then(d => { setData(d); setErr(d?.error || null); }).catch(e => setErr(String(e.message || e)));
  useEffect(() => {
    load(false);
    AsyncStorage.getItem('calls_seen_v1').then(r => r && setSeen(JSON.parse(r))).catch(() => {});
  }, [url]);

  const markSeen = row => {
    const next = { ...seen, [row]: dayKey }; setSeen(next);
    AsyncStorage.setItem('calls_seen_v1', JSON.stringify(next)).catch(() => {});
  };
  const call = p => { markSeen(p.row); setCur(p); setStatus(''); setNote(''); dial(firstPhone(p.phone)).catch(fail); };
  const send = async () => {
    if (!status && !note.trim()) { setCur(null); return; }
    setBusy(true);
    try { await reportCall(url, { row: cur.row, name: cur.name, status, note: note.trim() }); setCur(null); load(true); }
    catch (e) { fail(e); } finally { setBusy(false); }
  };

  if (!data && !err) return <T c="sub" style={{ marginTop: SP.xl }}>טוען את רשימת ההתרמה…</T>;
  const list = whoToCall(data?.people || []);
  const todayDone = list.filter(p => seen[p.row] === dayKey);
  const queue = list.filter(p => seen[p.row] !== dayKey);
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
                {[p.status, (p.forecast || p.potential) && `צפי ${p.forecast || p.potential}`, hist.length && `שנים קודמות: ${hist.join(' · ')}`, p.note].filter(Boolean).join(' · ')}
              </T>
            </View>
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
        <Btn title={busy ? 'שומר…' : 'לרשום בגיליון'} icon="check" kind="ok" disabled={busy} style={{ marginTop: SP.md }} onPress={send} />
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
  const checks = (settings.homeChecks || []).filter(c => !c.days || c.days.includes(dayDate.getDay()));
  const allowed = (settings.homeTime?.allowed || []).map(k => ({ k, ...settings.apps?.[k] })).filter(a => a.name);
  const log = d.log || [];
  const unlockUntil = d.unlockUntil;
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const unlocked = unlockUntil != null && nowM < unlockUntil;

  const unlock = () => {
    if (!reason.trim()) { Alert.alert('זמן בית', 'כתוב קודם בשביל מה צריך את הטלפון'); return; }
    actions.start(s.id);
    actions.setData(s.id, { unlockUntil: nowM + mins, log: [...log, { at: toTime(nowM), reason: reason.trim(), minutes: mins }] });
    setReason('');
  };

  return (
    <View>
      {checks.map(c => (
        <Check key={c.id} label={c.label} checked={!!d.checks?.[c.id]}
          onPress={() => actions.setData(s.id, { checks: { ...(d.checks || {}), [c.id]: !d.checks?.[c.id] } })} />
      ))}

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
          <T v="tiny" c="sub">מה פתחת היום</T>
          {log.map((l, i) => <T key={i} v="small" style={{ marginTop: 4 }}>{l.at} · {l.reason} ({l.minutes} דק׳)</T>)}
        </View>
      )}
      <Actions><Btn title="סיום זמן בית" icon="check" kind="line" onPress={() => actions.done(s.id)} /></Actions>
    </View>
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
  const { actions, settings } = useDay();
  return (
    <View>
      <T v="body" c="sub" style={{ textAlign: 'center' }}>השכמה מחר ב-{settings.wakeTime}. הטלפון הולך לישון.</T>
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

const MAP = {
  wake: Wake, routine: Routine, text: TextSt, checklist: Checklist, timer: Timer, drive: Drive,
  minyan: Minyan, study: Study, prayer: Prayer, note: Note, camera: Camera, app: AppSt,
  counter: Counter, tasks: Tasks, home: Home, plan: Plan, close: Close, sleep: Sleep, shabbat: Shabbat,
};

export default function StationBody({ s, go }) {
  const C = MAP[s.type] || Timer;
  return <C s={s} go={go} />;
}
