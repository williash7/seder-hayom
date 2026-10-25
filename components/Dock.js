// שורת אפליקציות קבועות בתחתית מסך הבית (4–5). לחיצה ארוכה — לערוך מה מופיע.
// הנעילה ממשיכה לעבוד כרגיל: אפליקציה שלא מותרת עכשיו תשאל בשביל מה.
import { useEffect, useState } from 'react';
import { View, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Chip, Sheet, Field } from './UI';
import * as Native from '../lib/native';

const MAX = 5;
const DEFAULT_PINS = ['com.samsung.android.dialer', 'com.whatsapp.w4b', 'com.waze', 'com.sec.android.app.camera', 'com.bluegate.app'];
let cache = null;

export default function Dock() {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { settings, actions } = useDay();
  const [apps, setApps] = useState(cache || []);
  const [edit, setEdit] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (cache || !Native.hasNative) return;
    Native.listApps(true).then(l => { if (l?.length) { cache = l; setApps(l); } }).catch(() => {});
  }, []);

  if (!Native.hasNative) return null;
  const byPkg = Object.fromEntries(apps.map(a => [a.pkg, a]));
  const pins = (settings.pinned || DEFAULT_PINS).filter(p => byPkg[p]).slice(0, MAX);
  const save = list => actions.saveSettings({ ...settings, pinned: list.slice(0, MAX) });
  const toggle = pkg => save(pins.includes(pkg) ? pins.filter(p => p !== pkg) : [...pins, pkg]);
  const shown = apps.filter(a => !q || a.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: ins.bottom + 12 + 62, backgroundColor: t.surface, borderRadius: R.xl,
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderColor: t.hair }}>
        {pins.map(p => (
          <Pressable key={p} onPress={() => { if (!Native.openPackage(p)) setEdit(true); }} onLongPress={() => setEdit(true)}
            style={({ pressed }) => ({ alignItems: 'center', width: 62, opacity: pressed ? 0.5 : 1 })}>
            {byPkg[p].icon ? <Image source={{ uri: 'data:image/png;base64,' + byPkg[p].icon }} style={{ width: 44, height: 44 }} />
              : <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.sunk }} />}
            <T v="tiny" numberOfLines={1} style={{ marginTop: 2 }}>{byPkg[p].label}</T>
          </Pressable>
        ))}
        <Pressable onPress={() => setEdit(true)} hitSlop={8} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <T c="sub">{pins.length ? '✎' : '+ אפליקציות קבועות'}</T>
        </Pressable>
      </View>

      <Sheet visible={edit} onClose={() => { setEdit(false); setQ(''); }} title={`אפליקציות קבועות (${pins.length}/${MAX})`}>
        <T v="small" c="sub">לוחצים על אפליקציה כדי להוסיף או להסיר. עד {MAX}.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SP.sm }}>
          {pins.map(p => <Chip key={p} label={`${byPkg[p].label} ✕`} active onPress={() => toggle(p)} />)}
        </View>
        <Field value={q} onChangeText={setQ} placeholder="חיפוש" style={{ marginTop: SP.md }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SP.sm }}>
          {shown.filter(a => !pins.includes(a.pkg)).map(a => <Chip key={a.pkg} label={a.label} onPress={() => (pins.length < MAX ? toggle(a.pkg) : null)} />)}
        </View>
      </Sheet>
    </>
  );
}
