// "היום" — כל התחנות על ציר זמן, עם מה שנעשה ומה שנשאר
import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Card, Sheet, Chip, Field } from '../components/UI';
import Icon from '../components/Icon';
import { toTime, fmtDur, DAY_NAMES } from '../lib/time';
import { STATION_TYPES } from '../lib/defaults';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as S from '../lib/store';
import * as Native from '../lib/native';
import { dateKey, addDays } from '../lib/time';
import { planDay } from '../lib/engine';
import { SleepCard } from '../stations/Stations';
import { getZmanim } from '../lib/zmanim';

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** עריכת תחנה ליום אחד: שעה, משך, ביטול */
function OverrideEditor({ s, ov, onSave, dow, onSaveWeekly }) {
  const [at, setAt] = useState(ov?.at || s.atByDay?.[dow] || s.at || '');
  const [arr, setArr] = useState(ov?.arriveBy || s.arriveByDay?.[dow] || s.arriveBy || '');
  const [min, setMin] = useState(String(ov?.minutes ?? s.minutesByDay?.[dow] ?? s.minutes ?? ''));
  const hasMin = !['routine', 'drive', 'prayer'].includes(s.type) && !s.fill;
  if (!s.at && !s.arriveBy && !hasMin) return (
    <Btn title="לבטל ביום הזה" icon="x" kind="ghost" onPress={() => onSave({ off: true })} />
  );
  const save = () => {
    const p = {};
    if (s.at && at !== s.at) { if (!HHMM.test(at)) return; p.at = at.padStart(5, '0'); }
    if (s.arriveBy && arr !== s.arriveBy) { if (!HHMM.test(arr)) return; p.arriveBy = arr.padStart(5, '0'); }
    if (hasMin && min !== String(s.minutes ?? '')) p.minutes = Number(min) || 0;
    onSave(Object.keys(p).length ? p : null);
  };
  return (
    <View style={{ gap: SP.sm, marginTop: SP.sm }}>
      <T v="tiny" c="sub">לשנות ליום הזה בלבד</T>
      {!!s.at && <Field value={at} onChangeText={setAt} placeholder="שעה (למשל 10:00)" keyboardType="numbers-and-punctuation" />}
      {!!s.arriveBy && <Field value={arr} onChangeText={setArr} placeholder="להגיע עד (למשל 10:00)" keyboardType="numbers-and-punctuation" />}
      {hasMin && <Field value={min} onChangeText={setMin} placeholder="כמה דקות" keyboardType="number-pad" />}
      {hasMin && !!s.at && HHMM.test(at) && Number(min) > 0 && (
        <T v="small" c="sub">עד {toTime(Number(at.split(':')[0]) * 60 + Number(at.split(':')[1]) + Number(min))}</T>
      )}
      <Btn title="לשמור ליום הזה" icon="check" kind="gold" onPress={save} />
      <Btn title={`לקבוע לכל יום ${DAY_NAMES[dow]}`} icon="day" kind="line" onPress={() => {
        const p = {};
        if (s.at) { if (!HHMM.test(at)) return; p.atByDay = { ...(s.atByDay || {}), [dow]: at.padStart(5, '0') }; }
        if (s.arriveBy) { if (!HHMM.test(arr)) return; p.arriveByDay = { ...(s.arriveByDay || {}), [dow]: arr.padStart(5, '0') }; }
        if (hasMin) p.minutesByDay = { ...(s.minutesByDay || {}), [dow]: Number(min) || 0 };
        onSaveWeekly(p);
      }} />
      {!!ov && <Btn title="להחזיר לרגיל" icon="undo" kind="line" onPress={() => onSave(null)} />}
      <Btn title="לבטל ביום הזה" icon="x" kind="ghost" onPress={() => onSave({ off: true })} />
    </View>
  );
}

/** יומן הטלפון: בשביל מה פתחתי, וכמה זמן בכל אפליקציה — לפי יום */
function PhoneLog() {
  const t = useT();
  const [off, setOff] = useState(0);
  const [log, setLog] = useState([]);
  const [usage, setUsage] = useState([]);
  const day = addDays(new Date(), -off);
  useEffect(() => {
    const load = () => {
      S.loadHomeLog(dateKey(day)).then(setLog);
      const from = new Date(day); from.setHours(0, 0, 0, 0);
      const to = new Date(from); to.setDate(to.getDate() + 1);
      const all = off === 0 ? (Native.usageSince(from.getTime()) || []) : [];
      setUsage(all.filter(u => u.minutes >= 1).slice(0, 10));
    };
    load();
    const sub = AppState.addEventListener('change', s => s === 'active' && load());
    return () => sub.remove();
  }, [off]);
  const total = usage.reduce((a, u) => a + u.minutes, 0);
  return (
    <Card style={{ marginTop: SP.xl }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="bodyB">יומן הטלפון</T>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip label="היום" active={off === 0} onPress={() => setOff(0)} />
          <Chip label="אתמול" active={off === 1} onPress={() => setOff(1)} />
          <Chip label="שלשום" active={off === 2} onPress={() => setOff(2)} />
        </View>
      </View>
      <T v="tiny" c="sub" style={{ marginTop: SP.md }}>בשביל מה פתחתי</T>
      {log.length ? log.map((l, i) => (
        <T key={i} v="small" style={{ marginTop: 4 }}>{l.at} · {l.app ? `${l.app} — ` : ''}{l.reason} ({l.minutes} דק׳{l.mode ? `, ${l.mode}` : ''})</T>
      )) : <T v="small" c="sub" style={{ marginTop: 4 }}>לא נפתח כלום מחוץ למותר</T>}
      {off === 0 && (
        <>
          <T v="tiny" c="sub" style={{ marginTop: SP.md }}>הזמן בטלפון היום{total ? ` · ${fmtDur(total)}` : ''}</T>
          {usage.length ? usage.map(u => (
            <View key={u.pkg} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <T v="small">{u.label}</T><T v="small" c="sub">{fmtDur(u.minutes)} · {u.opens} פתיחות</T>
            </View>
          )) : <T v="small" c="sub" style={{ marginTop: 4 }}>{Native.isLockServiceOn() ? 'עוד אין נתונים' : 'כדי לראות זמן שימוש — להפעיל את "סדר היום — זמן בית" בנגישות'}</T>}
        </>
      )}
      <T v="small" c="faint" style={{ marginTop: SP.md }}>נשמר רק בטלפון. זמן השימוש נשמר כ-3,000 מעברים אחרונים (כשבועיים).</T>
    </Card>
  );
}

export default function DayScreen({ go }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { plan: todayPlan, zmanim: todayZ, dayDate: today, hebrew, actions, settings, eff, sleep, state: todayState } = useDay();
  // היום / מחר
  const [which, setWhich] = useState('today');
  const tDate = addDays(today, 1), tKey = dateKey(tDate);
  const [tState, setTState] = useState({ stations: {}, choices: {} });
  const [tZ, setTZ] = useState({});
  useEffect(() => {
    if (which !== 'tomorrow') return;
    S.loadDay(tKey).then(setTState);
    getZmanim(tDate).then(z => z && setTZ(z)).catch(() => {});
  }, [which, tKey]);
  const isToday = which === 'today';
  const dayDate = isToday ? today : tDate;
  const zmanim = isToday ? todayZ : tZ;
  const plan = isToday ? todayPlan : planDay({ settings: eff || settings, date: tDate, state: tState, zmanim: tZ, now: 0 });
  const overrides = (isToday ? todayState.overrides : tState.overrides) || {};
  const setOverride = (id, patch) => {
    if (isToday) return actions.setOverride(id, patch);
    const ov = { ...(tState.overrides || {}) };
    if (patch == null) delete ov[id]; else ov[id] = { ...(ov[id] || {}), ...patch };
    const next = { ...tState, overrides: ov };
    setTState(next); S.saveDay(tKey, next);
  };
  const offList = (settings.stations || []).filter(x => overrides[x.id]?.off);
  const [sel, setSel] = useState(null);
  const [movePicker, setMovePicker] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const isPast = s => s.status === 'done' || s.status === 'skipped' || s.status === 'auto';
  const pastCount = plan.list.filter(isPast).length;
  const list = showPast ? plan.list : plan.list.filter(s => !isPast(s));

  const done = plan.list.filter(s => s.status === 'done').length;
  const Z = [['נץ', zmanim.sunrise], ['סוף ק״ש', zmanim.sofZmanShma], ['סוף תפילה', zmanim.sofZmanTfilla],
    ['שקיעה', zmanim.sunset], ['צאת', zmanim.tzeit], ['נרות', zmanim.candles]].filter(z => z[1]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: SP.xl, paddingTop: ins.top + SP.lg, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: SP.sm }}>
          <Chip label="היום" active={isToday} onPress={() => setWhich('today')} />
          <Chip label="מחר" active={!isToday} onPress={() => setWhich('tomorrow')} />
        </View>
        {isToday && <T v="tiny" c="sub">{hebrew || ''}</T>}
        <T v="title">{isToday ? '' : 'מחר — '}יום {DAY_NAMES[dayDate.getDay()]}</T>
        <T c="sub" style={{ marginTop: 2 }}>נעשו {done} · נשארו {plan.list.filter(x => x.status === 'pending' || x.status === 'current').length}</T>

        {Z.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: SP.lg, backgroundColor: t.surface, borderRadius: R.md, borderWidth: 1, borderColor: t.hair, paddingVertical: 6 }}>
            {Z.map(([k, v]) => (
              <View key={k} style={{ width: '33.33%', alignItems: 'center', paddingVertical: 6 }}>
                <T v="tiny" c="sub">{k}</T><T v="bodyB">{v}</T>
              </View>
            ))}
          </View>
        )}

        {isToday && sleep && <View style={{ marginTop: SP.md }}><SleepCard sleep={sleep} /></View>}
        {pastCount > 0 && (
          <Btn title={showPast ? 'להסתיר את מה שעבר' : `להראות את מה שעבר (${pastCount})`} icon={showPast ? 'minus' : 'plus'}
            kind="ghost" small style={{ marginTop: SP.lg, alignSelf: 'flex-start' }} onPress={() => setShowPast(!showPast)} />
        )}
        <View style={{ marginTop: SP.md }}>
          {list.map((s, i) => {
            const cur = s.status === 'current';
            const off = s.status === 'done' || s.status === 'skipped' || s.status === 'auto';
            return (
              <Pressable key={s.id} onPress={() => { setMovePicker(false); setSel(s); }}
                style={{ flexDirection: 'row', gap: SP.md, minHeight: 58 }}>
                <View style={{ width: 52, alignItems: 'flex-start', paddingTop: 2 }}>
                  <T v="small" style={{ color: cur ? t.gold : off ? t.faint : t.sub, fontWeight: cur ? '800' : '600' }}>
                    {toTime(s.plannedStart)}
                  </T>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: cur ? t.gold : s.status === 'done' ? t.okSoft : t.sunk }}>
                    <Icon name={s.status === 'done' ? 'check' : s.status === 'skipped' ? 'skip' : s.icon} size={15}
                      color={cur ? '#fff' : s.status === 'done' ? t.ok : t.sub} />
                  </View>
                  {i < list.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: t.hair, marginVertical: 2 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: SP.md }}>
                  <T v="bodyB" style={{ color: off ? t.faint : t.ink, textDecorationLine: s.status === 'skipped' ? 'line-through' : 'none' }}>
                    {s.title}
                  </T>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    {s.duration > 0 && <T v="small" c="sub">{fmtDur(s.duration)}</T>}
                    {s.anchor?.hard && !off && <T v="small" style={{ color: t.gold }}>· קבוע {toTime(s.anchor.endAt ?? s.anchor.start)}</T>}
                    {s.late > 1 && !off && isToday && <T v="small" style={{ color: t.warn }}>· איחור {Math.round(s.late)} דק׳</T>}
                    {s.overridden && <T v="small" style={{ color: t.gold }}>· שונה ליום הזה</T>}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {offList.map(x => (
          <Pressable key={x.id} onPress={() => setOverride(x.id, null)}>
            <T v="small" c="sub" style={{ marginTop: SP.sm }}>בוטל ליום הזה: {x.title} · <T v="small" style={{ color: t.gold }}>להחזיר</T></T>
          </Pressable>
        ))}
        {plan.empty && <Card tone="sunk"><T c="sub">אין תחנות ליום הזה.</T></Card>}
        {isToday && <PhoneLog />}
        <Btn title="לאפס את היום" kind="ghost" small style={{ marginTop: SP.xl }} onPress={() => actions.resetToday()} />
      </ScrollView>

      <Sheet visible={!!sel} onClose={() => setSel(null)} title={sel?.title || ''}>
        {sel && (
          <View style={{ gap: SP.sm }}>
            <T c="sub">{STATION_TYPES[sel.type]} · {toTime(sel.plannedStart)}–{toTime(sel.plannedEnd)}</T>
            {isToday && sel.status !== 'current' && sel.status !== 'done' && (
              <Btn title="לעבור לתחנה הזו עכשיו" icon="fwd" kind="gold"
                onPress={() => { actions.jumpTo(sel.id); setSel(null); go('now'); }} />
            )}
            {isToday && (sel.status === 'done' || sel.status === 'skipped') && (
              <Btn title="לבטל את הסימון" icon="undo" kind="line" onPress={() => { actions.undo(sel.id); setSel(null); }} />
            )}
            {isToday && sel.status === 'current' && (
              <Btn title="לסמן כבוצע" icon="check" kind="ok" onPress={() => { actions.done(sel.id); setSel(null); }} />
            )}
            {isToday && !['done', 'skipped', 'auto'].includes(sel.status) && (
              <>
                {sel.status !== 'current' && (
                  <Btn title="כבר עשיתי את זה" icon="check" kind="ok" onPress={() => { actions.markDone(sel.id); setSel(null); }} />
                )}
                <Btn title="כבר עשיתי הכל עד כאן" icon="check" kind="line" onPress={() => { actions.markDone(sel.id, { upTo: true }); setSel(null); }} />
              </>
            )}
            {isToday && sel.status !== 'done' && sel.status !== 'skipped' && (
              <Btn title="לדלג" icon="skip" kind="ghost" onPress={() => { actions.skip(sel.id); setSel(null); }} />
            )}
            {isToday && !['done', 'skipped', 'auto'].includes(sel.status) &&
              !sel.at && !sel.arriveBy && !sel.protect && sel.rec?.start == null && (
              <>
                <Btn title="שינוי סדר — להעביר תחנה" icon="fwd" kind="line"
                  onPress={() => setMovePicker(v => !v)} />
                {movePicker && (
                  <View style={{ gap: SP.sm }}>
                    <T v="small" c="sub">לפני איזו תחנה להעביר את ״{sel.title}״? שאר המשימות נשמרות.</T>
                    {plan.list.filter(x => x.id !== sel.id &&
                      !['done', 'skipped', 'auto'].includes(x.status) && !x.dropped).map(x => (
                      <Btn key={x.id} title={`לפני: ${x.title} (${toTime(x.plannedStart)})`}
                        kind="ghost" small onPress={() => {
                          actions.moveStationBefore(sel.id, x.id);
                          setMovePicker(false); setSel(null);
                        }} />
                    ))}
                  </View>
                )}
              </>
            )}
            {isToday && sel.extra && (
              <Btn title="להוריד מהתוכנית" icon="x" kind="ghost" onPress={() => { actions.removeExtra(sel.id); setSel(null); }} />
            )}
            {sel.status !== 'done' && !sel.extra && (
              <OverrideEditor key={sel.id + which} s={(settings.stations || []).find(x => x.id === sel.id) || sel}
                ov={overrides[sel.id]} onSave={p => { setOverride(sel.id, p); setSel(null); }}
                dow={dayDate.getDay()}
                onSaveWeekly={p => {
                  actions.saveSettings({ ...settings, stations: settings.stations.map(x => x.id === sel.id ? { ...x, ...p } : x) });
                  setOverride(sel.id, null); setSel(null);
                }} />
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}
