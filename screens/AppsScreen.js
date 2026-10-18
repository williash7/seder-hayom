// "אפליקציות" — כשסדר היום הוא מסך הבית, מכאן פותחים את כל השאר.
// מה שלא ברשימת "פתוח" — נפתח רק אחרי שכותבים בשביל מה (ונרשם ביומן הטלפון).
import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Image, AppState, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Card, Field, Chip, Sheet, Check } from '../components/UI';
import * as Native from '../lib/native';

let cache = null;           // רשימת האפליקציות (עם אייקונים) — נטענת פעם אחת
let freeUntil = {};         // pkg → עד מתי פתוח בלי לשאול שוב

export default function AppsScreen() {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { settings, night, plan, actions } = useDay();
  const [apps, setApps] = useState(cache || []);
  const [q, setQ] = useState('');
  const [ask, setAsk] = useState(null);
  const [reason, setReason] = useState('');
  const [mins, setMins] = useState(10);
  const [always, setAlways] = useState(false);
  const [isHome, setIsHome] = useState(true);

  useEffect(() => {
    const load = async () => {
      const l = await Native.listApps(true);
      if (l.length) { cache = l; setApps(l); }
      setIsHome(Native.isDefaultHome());
    };
    load();
    const sub = AppState.addEventListener('change', s => s === 'active' && load());
    return () => sub.remove();
  }, []);

  // מה פתוח עכשיו בלי סיבה
  const mode = night ? 'night' : plan.current?.type === 'home' ? 'home' : 'work';
  const free = useMemo(() => {
    const appPkgs = Object.values(settings.apps || {}).map(a => a.pkg).filter(Boolean);
    const homePkgs = (settings.homeTime?.allowed || []).map(k => settings.apps?.[k]?.pkg).filter(Boolean);
    if (mode === 'night') return new Set(settings.nightLock?.allowed || []);
    if (mode === 'home') return new Set([...homePkgs, ...(settings.launcher?.homeFree || [])]);
    return new Set([...appPkgs, ...(settings.launcher?.free || [])]);
  }, [settings, mode]);

  const isFree = pkg => free.has(pkg) || (freeUntil[pkg] || 0) > Date.now();
  const open = pkg => { if (!Native.openPackage(pkg)) Alert.alert('לא נפתח', 'האפליקציה לא נמצאה'); };
  const tap = a => (isFree(a.pkg) ? open(a.pkg) : (setAsk(a), setReason(''), setAlways(false)));

  const confirm = () => {
    if (!reason.trim()) return;
    const a = ask;
    actions.unlockApp(a.pkg, a.label, reason.trim(), mins, mode === 'work' ? 'מסך הבית' : undefined);
    freeUntil[a.pkg] = Date.now() + mins * 60000;
    if (always && mode === 'work') {
      const l = settings.launcher || {};
      actions.saveSettings({ ...settings, launcher: { ...l, free: [...new Set([...(l.free || []), a.pkg])] } });
    }
    setAsk(null);
    open(a.pkg);
  };

  const shown = apps.filter(a => !q || a.label.toLowerCase().includes(q.toLowerCase()));
  const top = shown.filter(a => isFree(a.pkg));
  const rest = shown.filter(a => !isFree(a.pkg));

  const Grid = ({ list, dim }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {list.map(a => (
        <Pressable key={a.pkg} onPress={() => tap(a)} style={({ pressed }) => ({ width: '25%', alignItems: 'center', paddingVertical: SP.md, opacity: pressed ? 0.5 : dim ? 0.55 : 1 })}>
          {a.icon ? <Image source={{ uri: 'data:image/png;base64,' + a.icon }} style={{ width: 52, height: 52 }} />
            : <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: t.sunk }} />}
          <T v="tiny" numberOfLines={1} style={{ marginTop: 6, paddingHorizontal: 4, textAlign: 'center' }}>{a.label}</T>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: SP.xl, paddingTop: ins.top + SP.lg, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <T v="title">אפליקציות</T>
        <T c="sub" style={{ marginTop: 2 }}>
          {mode === 'night' ? 'לילה — רק השעון פתוח' : mode === 'home' ? 'זמן בית — רק מה שמותר' : 'פתוחות למעלה; השאר — עם סיבה'}
        </T>
        {Native.hasNative && !isHome && (
          <Card tone="warn" style={{ marginTop: SP.md }}>
            <T v="bodyB">סדר היום עוד לא מסך הבית</T>
            <T v="small" c="sub" style={{ marginTop: 4 }}>בוחרים "סדר היום" כאפליקציית הבית — פעם אחת.</T>
            <Btn title="לבחירת מסך הבית" small kind="line" style={{ marginTop: SP.sm, alignSelf: 'flex-start' }} onPress={() => Native.openHomeSettings()} />
          </Card>
        )}
        <Field value={q} onChangeText={setQ} placeholder="חיפוש" style={{ marginTop: SP.md }} />
        {top.length > 0 && <Grid list={top} />}
        {rest.length > 0 && (
          <>
            <T v="tiny" c="sub" style={{ marginTop: SP.lg }}>עם סיבה</T>
            <Grid list={rest} dim />
          </>
        )}
        {!apps.length && <T c="sub" style={{ marginTop: SP.xl }}>טוען…</T>}
      </ScrollView>

      <Sheet visible={!!ask} onClose={() => setAsk(null)} title={ask ? `בשביל מה ${ask.label}?` : ''}>
        <Field value={reason} onChangeText={setReason} placeholder="בשביל מה?" autoFocus />
        <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.sm }}>
          {[5, 10, 20, 30].map(m => <Chip key={m} label={`${m} דק׳`} active={mins === m} onPress={() => setMins(m)} />)}
        </View>
        {mode === 'work' && (
          <Check label="לפתוח תמיד בלי לשאול (בשעות העבודה)" checked={always} onPress={() => setAlways(!always)} />
        )}
        <T v="small" c="sub" style={{ marginTop: SP.sm }}>נרשם ביומן הטלפון.</T>
        <Btn title="פתח" icon="lock" disabled={!reason.trim()} style={{ marginTop: SP.md }} onPress={confirm} />
      </Sheet>
    </View>
  );
}
