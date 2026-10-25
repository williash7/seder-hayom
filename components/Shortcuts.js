// קיצורים: שליטה בנגן שמתנגן (בלי לפתוח אותו) ופתיחת השער
import { useState } from 'react';
import { View } from 'react-native';
import { useDay } from '../lib/DayContext';
import { useT, SP } from '../lib/theme';
import { T, Chip } from './UI';
import * as Native from '../lib/native';
import { SHORTCUTS, layoutOf } from '../lib/homeLayout';

export default function Shortcuts() {
  const t = useT();
  const { settings } = useDay();
  const [msg, setMsg] = useState('');
  if (!Native.hasNative) return null;
  const L = layoutOf(settings);
  const shown = SHORTCUTS.filter(x => !L.hiddenShortcuts.includes(x.k));
  if (!shown.length) return null;
  const run = x => {
    if (x.k === 'gate') { if (!Native.openPackage('com.bluegate.app')) setMsg('PalGate לא נמצא'); return; }
    if (!Native.mediaKey(x.key)) setMsg('כפתורי הנגן דורשים את הגרסה החדשה (APK)');
  };
  return (
    <View style={{ marginTop: SP.xl }}>
      <T v="bodyB">קיצורים</T>
      <T v="tiny" c="sub">הנגן שמתנגן עכשיו (פודקאסט) — בלי לפתוח אותו</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.sm }}>
        {shown.map(x => <Chip key={x.k} label={x.label} onPress={() => run(x)} />)}
      </View>
      {!!msg && <T v="small" style={{ marginTop: SP.sm, color: t.warn }}>{msg}</T>}
    </View>
  );
}
