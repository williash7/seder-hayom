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

export default function DayScreen({ go }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { plan, zmanim, dayDate, hebrew, actions } = useDay();
  const [sel, setSel] = useState(null);

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

        <View style={{ marginTop: SP.xl }}>
          {plan.list.map((s, i) => {
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
                  {i < plan.list.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: t.hair, marginVertical: 2 }} />}
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
