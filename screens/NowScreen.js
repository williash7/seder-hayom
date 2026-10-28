// "עכשיו" — המסך המרכזי: רק התחנה הנוכחית, והעוגן הבא
// Pressable is required by the tappable flight countdown and top actions.
import { View, ScrollView, Alert, Pressable, Linking } from 'react-native';
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
import CatchUp from '../components/CatchUp';
import Widgets from '../components/Widgets';
import Dock from '../components/Dock';
import Shortcuts from '../components/Shortcuts';
import HomeEdit from '../components/HomeEdit';
import { layoutOf } from '../lib/homeLayout';
import Icon from '../components/Icon';
import { nextFlight, fmtLeft, OUTBOUND_MILESTONES } from '../lib/trips';
import StationBody, { useSeconds } from '../stations/Stations';
import { toTime, fmtDur, fmtClock, toMin, DAY_NAMES } from '../lib/time';

function KeepAwake() { useKeepAwake(); return null; }

export default function NowScreen({ go }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { plan, now, hebrew, dayDate, zmanim, settings, eff, actions, loaded, loadError, reload, learnSync, night, nightUntil } = useDay();
  const sec = useSeconds();
  const [showTopActions, setShowTopActions] = useState(false);
  if (!loaded) return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: SP.xl }}>
      <T v="h2">{loadError ? 'לא הצלחנו לטעון את סדר היום' : 'טוען את סדר היום…'}</T>
      {!!loadError && <T v="small" c="sub" style={{ marginTop: SP.md, textAlign: 'center' }}>{loadError}</T>}
      <Btn title="לנסות שוב" kind="gold" style={{ marginTop: SP.xl }} onPress={reload} />
    </View>
  );

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
  // אזור עליון נקי: פרטי היום בשורה אחת, פעולות נוספות רק בלחיצה.
  const header = (<>
    {nightBar}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SP.sm, marginBottom: SP.sm }}>
      <View style={{ flex: 1 }}>
        <T v="tiny" c="sub" numberOfLines={1}>יום {DAY_NAMES[dow]}{hebrew ? ` · ${hebrew}` : ''}</T>
        <T v="h2" style={{ marginTop: 1 }}>{toTime(Math.floor(sec / 60))}</T>
      </View>
      <Pressable onPress={() => setShowTopActions(v => !v)}
        style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.md, backgroundColor: t.sunk, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="settings" size={16} color={t.sub} />
        <T v="small" c="sub">{showTopActions ? 'סגור' : 'פעולות'}</T>
      </Pressable>
    </View>
    <FlightCountdown sec={sec} />
    {plan.nextAnchor && <View style={{ marginBottom: 6 }}><T v="tiny" c="sub" numberOfLines={1}>
      הבא: {plan.nextAnchor.title} · {toTime(plan.nextAnchor.time)}{plan.nextAnchor.late > 1 ? ` · איחור ${Math.round(plan.nextAnchor.late)} דק׳` : ''}
    </T></View>}
    {showTopActions && (
      <View style={{ backgroundColor: t.sunk, padding: SP.md, borderRadius: R.md, marginBottom: SP.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <PlanChange /><LockPause />
        </View>
      </View>
    )}
  </>);
  const wrap = body => (<>
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: SP.xl, paddingTop: ins.top + SP.lg, paddingBottom: layoutOf(settings).hidden.includes('dock') ? 120 : 24 }}
      keyboardShouldPersistTaps="handled">
      {header}
      <LearningSummary data={learnSync} settings={settings} plan={plan} />
      {body}
      {layoutOf(settings).order.filter(k => !layoutOf(settings).hidden.includes(k)).map(k => (k === 'shortcuts' ? <Shortcuts key={k} /> : k === 'widgets' ? <Widgets key={k} /> : null))}
      <HomeEdit />
    </ScrollView>
    {!layoutOf(settings).hidden.includes('dock') && <Dock />}
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

  // כאשר סדר היום משתנה באמצע היום, ייתכן שאין תחנה נוכחית תקינה.
  // במקום להפיל את מסך הבית, מציגים מעבר בטוח למסך התוכנית.
  const s = plan?.current;
  if (!s) return wrap(
    <Center icon="list" title="אין תחנה פעילה כרגע" sub="אפשר לבדוק את המשימות ולבחור מאיפה להמשיך">
      <Btn title="לפתוח את סדר היום" kind="gold" style={{ marginTop: SP.lg }} onPress={() => go('day')} />
    </Center>
  );
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

      {over && s.type !== 'open' && s.type !== 'wake' && (
        <View style={{ marginTop: SP.lg, alignItems: 'center' }}>
          <T v="small" c="sub">להוסיף זמן?</T>
          <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: 6 }}>
            {[5, 10, 15, 30].map(m => (
              <Chip key={m} label={`+${m} דק׳`} onPress={() =>
                actions.setOverride(s.id, { addMin: (Number(s.addMin) || 0) + Math.ceil(-remainSec / 60) + m })} />
            ))}
          </View>
        </View>
      )}

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
      <CatchUp />
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

// כרטיס טיסה חי — שניות מתעדכנות באמצעות שעון המסך; לחיצה מציגה את כל אבני הדרך.
function FlightCountdown({ sec }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const nf = nextFlight();
  if (!nf || nf.ms > 21 * 864e5) return null;
  const ms = Math.max(0, nf.ms);
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const digits = [hours, mins, seconds].map(v => String(v).padStart(2, '0')).join(':');
  const events = nf.flight.id === 'ua85' ? OUTBOUND_MILESTONES : [
    { at: nf.flight.at, title: 'המראה — ' + nf.flight.no }
  ];
  const formatTime = at => {
    const d = new Date(at);
    return d.toLocaleString('he-IL', { timeZone: nf.flight.id === 'ua85' ? 'Asia/Jerusalem' : 'America/New_York', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  };
  return (
    <>
      <Pressable onPress={() => setOpen(true)}
        style={{ backgroundColor: t.navy, borderRadius: R.lg, paddingVertical: 12, paddingHorizontal: 16, marginBottom: SP.md, marginTop: SP.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
          <Icon name="send" size={22} color={t.gold} />
          <View style={{ flex: 1 }}>
            <T v="tiny" style={{ color: t.onNavy }}>עד ההמראה · {nf.flight.no}</T>
            <T v="h2" style={{ color: t.onNavy, marginTop: 2, fontVariant: ['tabular-nums'] }}>
              {days ? days + ' ימים  ' : ''}{digits}
            </T>
            <T v="tiny" style={{ color: t.onNavy }}>{nf.flight.label} · לחץ לציר הזמנים</T>
          </View>
          <Icon name="chevron-left" size={20} color={t.gold} />
        </View>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="עד ההמראה — ציר הזמנים">
        <ScrollView style={{ maxHeight: 500 }}>
          <T v="small" c="sub">התוכנית מתעדכנת עם הזמן. הזמנים מתוכננים לפי סדר הנסיעה, ולא נתוני טיסה חיים.</T>
          {events.map((event, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: SP.sm, paddingVertical: 12, borderBottomWidth: 1, borderColor: t.hair, opacity: event.at < Date.now() ? 0.5 : 1 }}>
              <Icon name={event.at < Date.now() ? 'check' : 'clock'} size={18} color={event.at < Date.now() ? t.sub : t.gold} />
              <View style={{ flex: 1 }}>
                <T v="bodyB">{event.title}</T>
                <T v="small" c="sub">{formatTime(event.at)}{event.note ? ' · ' + event.note : ''}</T>
              </View>
              {event.at > Date.now() && <T v="tiny" c="sub">{fmtLeft(event.at - Date.now())}</T>}
            </View>
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

// סטטוס לימוד שהועבר מאפליקציית הלימוד; לא מציגים כמידע חי אם עבר יום.
function LearningSummary({ data, settings, plan }) {
  const t = useT();
  const today = new Date();
  const key = [today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  const current = data?.date === key ? data : null;
  const items = current?.remaining || [];
  const minutes = items.reduce((n,u)=>n+(u.minutes||0),0);
  const target = Math.max(1, Math.round(plan?.current?.type === 'study' ? plan.current.duration : 10));
  const url = (settings.apps?.limud?.url || 'https://williash7.github.io/hoshana-raba/').replace(/\\/$/,'');
  const open = () => Linking.openURL(url+'/index.html?go=1&min='+target).catch(()=>{});
  if (!current) return (
    <Pressable onPress={() => Linking.openURL(url+'/index.html')} style={{ marginTop: 5, paddingVertical: 8 }}>
      <T v="small" c="sub">📖 לימוד יומי · פתח כדי לסנכרן את מצב הלימוד</T>
    </Pressable>
  );
  return (
    <View style={{ borderRadius: R.md, backgroundColor: t.sunk, padding: SP.md, marginTop: SP.sm }}>
      <View style={{ flexDirection:'row',justifyContent:'space-between',alignItems:'center' }}>
        <T v="bodyB">📖 הלימוד שנותר</T>
        <T v="small" c="sub">{minutes} דק׳ לפי הקצב שלך</T>
      </View>
      <T v="small" c="sub" style={{ marginTop: 5 }} numberOfLines={2}>
        {items.length ? items.slice(0,4).map(x=>x.name+' · '+x.minutes+' דק׳').join(' | ') : 'כל הלימודים שסונכרנו הושלמו ✓'}
      </T>
      <View style={{ marginTop: SP.sm, flexDirection: 'row', gap: SP.sm }}>
        <Btn small kind="gold" title={'ללמוד '+target+' דקות'} onPress={open} />
        <Btn small kind="line" title="סנכרון" onPress={() => Linking.openURL(url+'/index.html').catch(()=>{})} />
      </View>
      <T v="tiny" c="sub" style={{ marginTop: 6 }}>לעדכון ההתקדמות: לחץ באתר הלימוד על ״עדכון סדר היום״.</T>
    </View>
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
