// "עכשיו" — המסך המרכזי: רק התחנה הנוכחית, והעוגן הבא
import { View, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Card, Ring, Chip, Sheet, Field } from '../components/UI';
import { useState } from 'react';
import { appLabel } from '../lib/native';
import * as Native from '../lib/native';
import LockPause from '../components/LockPause';
import PlanChange from '../components/PlanChange';
import Icon from '../components/Icon';
import StationBody, { useSeconds } from '../stations/Stations';
import { toTime, fmtDur, fmtClock, toMin, DAY_NAMES } from '../lib/time';

function KeepAwake() { useKeepAwake(); return null; }

export default function NowScreen({ go }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { plan, now, hebrew, dayDate, zmanim, settings, eff, actions, loaded, night, nightUntil } = useDay();
  const sec = useSeconds();
  if (!loaded) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const dow = dayDate.getDay();
  const inShabbat = (dow === 5 && zmanim.candles && now >= toMin(zmanim.candles))
    || (dow === 6 && (!zmanim.havdala || now < toMin(zmanim.havdala)));

  const nightBar = night ? (
    <View style={{ backgroundColor: t.navy, borderRadius: R.md, padding: SP.md, marginBottom: SP.md, flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
      <Icon name="moon" size={20} color={t.onNavy} />
      <T v="small" style={{ color: t.onNavy, flex: 1 }}>
        הטלפון ישן עד {toTime(new Date(nightUntil).getHours() * 60 + new Date(nightUntil).getMinutes())} — פתוחים רק השעון והטלפון. אפליקציה אחרת תשאל בשביל מה.
      </T>
    </View>
  ) : null;
  const header = (<>{nightBar}<View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}><PlanChange /><LockPause /></View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View>
        <T v="tiny" c="sub">יום {DAY_NAMES[dow]}{hebrew ? ` · ${hebrew}` : ''}</T>
        <T v="h2" style={{ marginTop: 2 }}>{toTime(Math.floor(sec / 60))}</T>
      </View>
      {plan.nextAnchor && <AnchorPill a={plan.nextAnchor} now={now} />}
    </View>
  </>);

  const wrap = body => (<>
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: SP.xl, paddingTop: ins.top + SP.lg, paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled">
      {header}
      {body}
    </ScrollView>
    <BlockedSheet />
  </>);

  if (inShabbat) {
    return wrap(
      <Center icon="candle" title="שבת שלום" sub={zmanim.havdala ? `צאת השבת ${zmanim.havdala}` : 'האפליקציה נחה בשבת'} />
    );
  }
  if (plan.empty) return wrap(<Center icon="sun" title="אין תכנית להיום" sub="אפשר להוסיף תחנות ליום הזה בהגדרות" />);
  if (plan.finished) {
    return wrap(
      <Center icon="moon" title="לילה טוב" sub={`השכמה ב-${(eff || settings).wakeTime}`}>
        <Btn title="פתח מחדש את התחנה האחרונה" kind="line" small style={{ marginTop: SP.xl }}
          onPress={() => actions.undo(plan.list[plan.list.length - 1].id)} />
      </Center>
    );
  }

  const s = plan.current;
  const startedAt = s.rec?.start;
  const waitingMin = s.plannedStart - now;
  const isWaiting = startedAt == null && waitingMin > 0.5;
  const total = Math.max(1, s.duration) * 60;
  const elapsed = startedAt != null ? sec - startedAt * 60 : now * 60 - s.plannedStart * 60;
  const remainSec = s.plannedEnd * 60 - sec;
  const over = remainSec < 0 && s.duration > 0;

  const next = plan.list.slice(plan.currentIndex + 1).find(x => x.status === 'pending');

  return wrap(
    <>
      {['routine', 'timer', 'text', 'counter'].includes(s.type) && startedAt != null ? <KeepAwake /> : null}
      <View style={{ alignItems: 'center', marginTop: SP.xl }}>
        <Ring size={210} p={isWaiting ? 0 : Math.min(1, elapsed / total)} color={over && s.type !== 'open' ? t.warn : t.gold}>
          <Icon name={s.icon || 'now'} size={30} color={t.gold} />
          {isWaiting ? (
            <>
              <T v="small" c="sub" style={{ marginTop: 6 }}>מתחיל ב-</T>
              <T v="clock">{toTime(s.plannedStart)}</T>
              <T v="small" c="sub">בעוד {fmtDur(waitingMin)}</T>
            </>
          ) : s.type === 'open' && startedAt != null ? (
            <>
              <T v="clock" style={{ marginTop: 6 }}>{fmtClock(sec - startedAt * 60)}</T>
              <T v="small" c="sub">{s.squeezed ? `עד ${toTime(s.plannedEnd)}` : `בדרך כלל כ-${fmtDur(s.duration)}`}</T>
            </>
          ) : s.duration > 0 ? (
            <>
              <T v="clock" style={{ marginTop: 6, color: over ? t.warn : t.ink }}>
                {over ? '+' + fmtClock(-remainSec) : fmtClock(remainSec)}
              </T>
              <T v="small" c="sub">{over ? 'חרגת מהזמן' : `עד ${toTime(s.plannedEnd)}`}</T>
            </>
          ) : (
            <T v="small" c="sub" style={{ marginTop: 6 }}>{toTime(s.plannedStart)}</T>
          )}
        </Ring>
        <T v="title" style={{ marginTop: SP.lg, textAlign: 'center' }}>{s.title}</T>
        {!!s.sub && <T c="sub" style={{ textAlign: 'center', marginTop: 4 }}>{s.sub}</T>}
        {s.late > 1 && (
          <View style={{ marginTop: SP.sm }}><Chip tone="warn" label={`מאחרים ב-${Math.round(s.late)} דק׳`} /></View>
        )}
      </View>

      <View style={{ marginTop: SP.xl }}>
        <StationBody s={s} go={go} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SP.xxl }}>
        <View style={{ flex: 1 }}>
          {next && <T v="small" c="sub">אחר כך: {next.title} · {toTime(next.plannedStart)}</T>}
        </View>
        {s.type !== 'wake' && (
          <Btn title="דלג" icon="skip" kind="ghost" small onPress={() =>
            Alert.alert('לדלג?', s.title, [{ text: 'ביטול', style: 'cancel' }, { text: 'דלג', onPress: () => actions.skip(s.id) }])} />
        )}
      </View>
    </>
  );
}

function BlockedSheet() {
  const { blocked, actions, settings, night, plan } = useDay();
  const [reason, setReason] = useState('');
  const mode = night ? 'לילה' : plan.current?.type === 'home' ? 'זמן בית' : 'שעות העבודה';
  const [mins, setMins] = useState(settings.homeTime?.defaultUnlockMin || 10);
  if (!blocked) return null;
  const label = appLabel(blocked) || blocked;
  return (
    <Sheet visible onClose={() => actions.dismissBlocked()} title={mode}>
      <T v="h2">בשביל מה צריך את {label}?</T>
      <Field value={reason} onChangeText={setReason} placeholder="למשל: לענות להודעה של ההורים בגן" style={{ marginTop: SP.md }} autoFocus />
      <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.md }}>
        {[5, 10, 20, 30].map(m => <Chip key={m} label={`${m} דק׳`} active={mins === m} onPress={() => setMins(m)} />)}
      </View>
      <Btn title={`לפתוח ל-${mins} דק׳`} icon="lock" kind="gold" style={{ marginTop: SP.lg }}
        disabled={!reason.trim()} onPress={() => { const p = blocked; actions.unlockApp(p, label, reason.trim(), mins, mode); setReason(''); setTimeout(() => Native.openPackage(p), 300); }} />
      <Btn title="לא צריך — חוזר לבית" kind="ghost" style={{ marginTop: SP.sm }} onPress={() => actions.dismissBlocked()} />
      <Btn title="זה חלון של המערכת — להשאיר תמיד פתוח" icon="check" kind="line" small style={{ marginTop: SP.md }} onPress={() => {
        const p = blocked, l = settings.launcher || {};
        actions.saveSettings({ ...settings, launcher: { ...l, always: [...new Set([...(l.always || []), p])] } });
        actions.unlockApp(p, label, 'חלון מערכת — תמיד פתוח', 1, mode);
        setTimeout(() => Native.openPackage(p), 300);
      }} />
    </Sheet>
  );
}

function AnchorPill({ a, now }) {
  const t = useT();
  const late = a.late > 1;
  const slackMin = Math.round((a.arrive ? a.time - a.plannedAt : a.time - a.plannedAt));
  const label = late ? `מאחרים ${Math.round(a.late)} דק׳`
    : slackMin >= 1 ? `${slackMin} דק׳ רזרבה` : 'בדיוק בזמן';
  return (
    <View style={{ backgroundColor: late ? t.warnSoft : t.sunk, borderRadius: R.md, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 200 }}>
      <T v="tiny" c="sub" numberOfLines={1}>{a.title} · {toTime(a.time)}</T>
      <T v="small" style={{ color: late ? t.warn : t.ok, fontWeight: '800', marginTop: 2 }}>{label}</T>
    </View>
  );
}

function Center({ icon, title, sub, children }) {
  const t = useT();
  return (
    <View style={{ alignItems: 'center', marginTop: 120 }}>
      <Icon name={icon} size={56} color={t.gold} stroke={1.4} />
      <T v="title" style={{ marginTop: SP.lg }}>{title}</T>
      {!!sub && <T c="sub" style={{ marginTop: SP.sm, textAlign: 'center' }}>{sub}</T>}
      {children}
    </View>
  );
}
