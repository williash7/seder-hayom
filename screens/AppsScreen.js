// "אפליקציות" — כשסדר היום הוא מסך הבית, מכאן פותחים את כל השאר.
// מה שלא ברשימת "פתוח" — נפתח רק אחרי שכותבים בשביל מה (ונרשם ביומן הטלפון).
import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Image, AppState, Alert, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Card, Field, Chip, Sheet, Check } from '../components/UI';
import * as Native from '../lib/native';
import LockPause from '../components/LockPause';
import { GROUPS, groupOf } from '../lib/appGroups';

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
  const [err, setErr] = useState(null);
  const [move, setMove] = useState(null);       // אפליקציה שמעבירים לקבוצה אחרת
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsHome(Native.isDefaultHome());
      // קודם רק שמות (מהר), ואז אייקונים ברקע
      try {
        const names = await Native.listApps(false);
        if (!names?.length) { setErr(Native.hasNative ? 'לא נמצאו אפליקציות' : 'הגרסה המותקנת ישנה — צריך להתקין את בנייה 17'); return; }
        setErr(null);
        if (!cache) { setApps(names); }
        const withIcons = await Native.listApps(true);
        if (withIcons?.length) { cache = withIcons; setApps(withIcons); }
      } catch (e) { setErr(String(e?.message || e)); }
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
    const bad = settings.launcher?.auto?.bad || [];
    const ok = list => new Set(list.filter(p => !bad.includes(p)));
    if (mode === 'home') return ok([...homePkgs, ...(settings.launcher?.homeFree || []), ...(settings.launcher?.auto?.home || [])]);
    return ok([...appPkgs, ...(settings.launcher?.free || []), ...(settings.launcher?.auto?.free || [])]);
  }, [settings, mode]);

  const { lockPausedUntil } = useDay();
  const isFree = pkg => (lockPausedUntil || 0) > Date.now() || free.has(pkg) || (freeUntil[pkg] || 0) > Date.now();
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

  // רשימת כל האפליקציות + זמן שימוש השבוע — לשלוח ל-Claude כדי לחלק לקבוצות
  const shareList = async () => {
    const since = Date.now() - 7 * 86400000;
    const usage = Object.fromEntries((Native.usageSince(since) || []).map(u => [u.pkg, u]));
    const lines = apps.map(a => {
      const u = usage[a.pkg];
      return `${a.label} | ${a.pkg}${u ? ` | ${Math.round(u.minutes)} דק׳ השבוע, ${u.opens} פתיחות` : ''}`;
    });
    try { await Share.share({ message: `האפליקציות שלי (${apps.length}):\n` + lines.join('\n') }); } catch {}
  };

  const torahPkgs = useMemo(() => Object.values(settings.apps || {}).map(a => a.pkg).filter(Boolean), [settings.apps]);
  const gOf = pkg => groupOf(settings, pkg, { torahPkgs });
  const setGroup = (pkg, g) => {
    const l = settings.launcher || {};
    actions.saveSettings({ ...settings, launcher: { ...l, groups: { ...(l.groups || {}), [pkg]: g } } });
    setMove(null);
  };
  const resetGroup = pkg => {
    const l = settings.launcher || {};
    const groups = { ...(l.groups || {}) }; delete groups[pkg];
    actions.saveSettings({ ...settings, launcher: { ...l, groups } });
    setMove(null);
  };

  const shown = apps.filter(a => !q || a.label.toLowerCase().includes(q.toLowerCase()));
  const byGroup = Object.fromEntries(GROUPS.map(g => [g.k, shown.filter(a => gOf(a.pkg) === g.k)]));

  const Grid = ({ list, dim }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {list.map(a => (
        <Pressable key={a.pkg} onPress={() => tap(a)} onLongPress={() => setMove(a)} style={({ pressed }) => ({ width: '25%', alignItems: 'center', paddingVertical: SP.md, opacity: pressed ? 0.5 : dim ? 0.55 : 1 })}>
          {a.icon ? <Image source={{ uri: 'data:image/png;base64,' + a.icon }} style={{ width: 52, height: 52 }} />
            : <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: t.sunk, alignItems: 'center', justifyContent: 'center' }}><T v="bodyB" c="sub">{a.label.slice(0, 1)}</T></View>}
          <T v="tiny" numberOfLines={1} style={{ marginTop: 6, paddingHorizontal: 4, textAlign: 'center' }}>{a.label}</T>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: SP.xl, paddingTop: ins.top + SP.lg, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <LockPause />
        {apps.length > 0 && (
          <Pressable onPress={shareList} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
            <T v="small" c="sub">לשתף את רשימת האפליקציות (כדי לחלק לקבוצות)</T>
          </Pressable>
        )}
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
        {GROUPS.map(g => {
          const list = byGroup[g.k];
          if (!list.length) return null;
          if (g.k === 'hidden' && !showHidden) {
            return (
              <Pressable key={g.k} onPress={() => setShowHidden(true)} style={{ marginTop: SP.lg }}>
                <T v="small" c="sub">{g.label} ({list.length}) — להצגה</T>
              </Pressable>
            );
          }
          return (
            <View key={g.k} style={{ marginTop: SP.lg }}>
              <T v="bodyB">{g.label} <T v="tiny" c="sub">· {list.length}</T></T>
              <T v="tiny" c="sub">{g.sub}</T>
              <Grid list={list} dim={g.k === 'bad' || g.k === 'hidden' || (g.k === 'reason' && !list.some(a => isFree(a.pkg)))} />
            </View>
          );
        })}
        {apps.length > 0 && <T v="tiny" c="sub" style={{ marginTop: SP.lg }}>לחיצה ארוכה על אפליקציה — להעביר אותה לקבוצה אחרת.</T>}
        {!apps.length && !err && <T c="sub" style={{ marginTop: SP.xl }}>טוען…</T>}
        {!!err && <T style={{ marginTop: SP.xl, color: t.warn }}>לא הצלחתי לטעון את האפליקציות: {err}</T>}
      </ScrollView>

      <Sheet visible={!!ask} onClose={() => setAsk(null)} title={ask ? `בשביל מה ${ask.label}?` : ''}>
        <Field value={reason} onChangeText={setReason} placeholder="בשביל מה?" autoFocus />
        <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.sm }}>
          {[5, 10, 20, 30].map(m => <Chip key={m} label={`${m} דק׳`} active={mins === m} onPress={() => setMins(m)} />)}
        </View>
        {gOf(ask?.pkg) === 'bad' && <T v="small" style={{ marginTop: SP.sm, color: t.warn }}>זו אפליקציה שמבזבזת זמן. בטוח שצריך?</T>}
        {mode === 'work' && gOf(ask?.pkg) !== 'bad' && (
          <Check label="לפתוח תמיד בלי לשאול (בשעות העבודה)" checked={always} onPress={() => setAlways(!always)} />
        )}
        <T v="small" c="sub" style={{ marginTop: SP.sm }}>נרשם ביומן הטלפון.</T>
        <Btn title="פתח" icon="lock" disabled={!reason.trim()} style={{ marginTop: SP.md }} onPress={confirm} />
      </Sheet>

      <Sheet visible={!!move} onClose={() => setMove(null)} title={move ? `${move.label} — לאיזו קבוצה?` : ''}>
        {move && GROUPS.map(g => (
          <View key={g.k} style={{ marginBottom: SP.sm }}>
            <Btn kind={gOf(move.pkg) === g.k ? 'primary' : 'line'} small title={g.label} onPress={() => setGroup(move.pkg, g.k)} />
            <T v="tiny" c="sub" style={{ marginTop: 2 }}>{g.sub}</T>
          </View>
        ))}
        {!!settings.launcher?.groups?.[move?.pkg] && <Btn kind="line" small title="חזרה לברירת המחדל" onPress={() => resetGroup(move.pkg)} />}
      </Sheet>
    </View>
  );
}
