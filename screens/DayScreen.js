// "היום" — כל התחנות על ציר זמן, עם מה שנעשה ומה שנשאר
import { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Card, Sheet, Chip } from '../components/UI';
import Icon from '../components/Icon';
import { toTime, fmtDur, DAY_NAMES } from '../lib/time';
import { STATION_TYPES } from '../lib/defaults';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as S from '../lib/store';
import * as Native from '../lib/native';
import { dateKey, addDays } from '../lib/time';

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
  const { plan, zmanim, dayDate, hebrew, actions } = useDay();
  const [sel, setSel] = useState(null);
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
        <T v="tiny" c="sub">{hebrew || ''}</T>
        <T v="title">יום {DAY_NAMES[dayDate.getDay()]}</T>
        <T c="sub" style={{ marginTop: 2 }}>{done} מתוך {plan.list.length} תחנות</T>

        {Z.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.lg }}>
            {Z.map(([k, v]) => (
              <View key={k} style={{ backgroundColor: t.surface, borderRadius: R.md, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: t.hair }}>
                <T v="tiny" c="sub">{k}</T><T v="bodyB">{v}</T>
              </View>
            ))}
          </View>
        )}

        {pastCount > 0 && (
          <Btn title={showPast ? 'להסתיר את מה שעבר' : `להראות את מה שעבר (${pastCount})`} icon={showPast ? 'minus' : 'plus'}
            kind="ghost" small style={{ marginTop: SP.lg, alignSelf: 'flex-start' }} onPress={() => setShowPast(!showPast)} />
        )}
        <View style={{ marginTop: SP.md }}>
          {list.map((s, i) => {
            const cur = s.status === 'current';
            const off = s.status === 'done' || s.status === 'skipped' || s.status === 'auto';
            return (
              <Pressable key={s.id} onPress={() => setSel(s)}
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
                    {s.late > 1 && !off && <T v="small" style={{ color: t.warn }}>· איחור {Math.round(s.late)} דק׳</T>}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {plan.empty && <Card tone="sunk"><T c="sub">אין תחנות ליום הזה.</T></Card>}
        <PhoneLog />
        <Btn title="לאפס את היום" kind="ghost" small style={{ marginTop: SP.xl }} onPress={() => actions.resetToday()} />
      </ScrollView>

      <Sheet visible={!!sel} onClose={() => setSel(null)} title={sel?.title || ''}>
        {sel && (
          <View style={{ gap: SP.sm }}>
            <T c="sub">{STATION_TYPES[sel.type]} · {toTime(sel.plannedStart)}–{toTime(sel.plannedEnd)}</T>
            {sel.status !== 'current' && sel.status !== 'done' && (
              <Btn title="לעבור לתחנה הזו עכשיו" icon="fwd" kind="gold"
                onPress={() => { actions.jumpTo(sel.id); setSel(null); go('now'); }} />
            )}
            {(sel.status === 'done' || sel.status === 'skipped') && (
              <Btn title="לבטל את הסימון" icon="undo" kind="line" onPress={() => { actions.undo(sel.id); setSel(null); }} />
            )}
            {sel.status === 'current' && (
              <Btn title="לסמן כבוצע" icon="check" kind="ok" onPress={() => { actions.done(sel.id); setSel(null); }} />
            )}
            {sel.status !== 'done' && sel.status !== 'skipped' && (
              <Btn title="לדלג" icon="skip" kind="ghost" onPress={() => { actions.skip(sel.id); setSel(null); }} />
            )}
          </View>
        )}
      </Sheet>
    </View>
  );
}
