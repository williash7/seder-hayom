// עריכת מסך הבית: מה מוצג ובאיזה סדר
import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useDay } from '../lib/DayContext';
import { useT, SP } from '../lib/theme';
import { T, Chip, Sheet, Btn } from './UI';
import { SECTIONS, SHORTCUTS, layoutOf } from '../lib/homeLayout';

export default function HomeEdit() {
  const t = useT();
  const { settings, actions } = useDay();
  const [open, setOpen] = useState(false);
  const L = layoutOf(settings);
  const save = patch => actions.saveSettings({ ...settings, homeLayout: { ...(settings.homeLayout || {}), order: L.order, hidden: L.hidden, hiddenShortcuts: L.hiddenShortcuts, ...patch } });
  const toggle = (list, k) => (list.includes(k) ? list.filter(x => x !== k) : [...list, k]);
  const move = (k, d) => {
    const scroll = L.order.filter(x => !SECTIONS.find(s => s.k === x)?.fixed);
    const i = scroll.indexOf(k), j = i + d;
    if (j < 0 || j >= scroll.length) return;
    [scroll[i], scroll[j]] = [scroll[j], scroll[i]];
    save({ order: [...scroll, ...L.order.filter(x => !scroll.includes(x))] });
  };
  const label = k => SECTIONS.find(s => s.k === k).label;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ alignSelf: 'center', paddingVertical: SP.lg }}>
        <T v="small" c="sub">✎ עריכת מסך הבית</T>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="עריכת מסך הבית">
        <T v="small" c="sub">מה מופיע ובאיזה סדר (מתחת לתחנה הנוכחית).</T>
        {L.order.map(k => {
          const fixed = SECTIONS.find(s => s.k === k)?.fixed;
          const off = L.hidden.includes(k);
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.md }}>
              <T v="bodyB" style={{ flex: 1, opacity: off ? 0.45 : 1 }}>{label(k)}</T>
              {!fixed && <Chip label="↑" onPress={() => move(k, -1)} />}
              {!fixed && <Chip label="↓" onPress={() => move(k, 1)} />}
              <Chip label={off ? 'מוסתר' : 'מוצג'} active={!off} onPress={() => save({ hidden: toggle(L.hidden, k) })} />
            </View>
          );
        })}
        <T v="bodyB" style={{ marginTop: SP.xl }}>כפתורי הקיצורים</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.sm }}>
          {SHORTCUTS.map(x => <Chip key={x.k} label={x.label} active={!L.hiddenShortcuts.includes(x.k)} onPress={() => save({ hiddenShortcuts: toggle(L.hiddenShortcuts, x.k) })} />)}
        </View>
        <T v="tiny" c="sub" style={{ marginTop: SP.sm }}>וידג׳טים: "עריכה" בתוך אזור הוידג׳טים (סדר, גודל, הסרה). אפליקציות קבועות: ✎ בשורה התחתונה.</T>
        <Btn title="סיום" kind="line" small style={{ marginTop: SP.lg }} onPress={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
