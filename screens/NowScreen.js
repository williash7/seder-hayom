// "עכשיו" — המסך המרכזי: רק התחנה הנוכחית, והעוגן הבא
// Pressable is required by the tappable flight countdown and top actions.
import { View, ScrollView, Alert, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Card, Ring, Chip, Sheet, Field } from '../components/UI';
import { useEffect, useRef, useState } from 'react';
import { appLabel } from '../lib/native';
import * as Native from '../lib/native';
import LockPause from '../components/LockPause';
import PlanChange from '../components/PlanChange';
import CatchUp from '../components/CatchUp';
import Widgets from '../components/Widgets';
import Dock from '../components/Dock';
import Shortcuts from '../components/Shortcuts';
import KesherCard from '../components/KesherCard';
import HomeEdit from '../components/HomeEdit';
import { layoutOf } from '../lib/homeLayout';
import Icon from '../components/Icon';
import { nextFlight, fmtLeft, wakeTimeFor } from '../lib/trips';
import { planDay } from '../lib/engine';
import { getZmanim } from '../lib/zmanim';
import * as Store from '../lib/store';
import StationBody, { useSeconds } from '../stations/Stations';
import { toTime, fmtDur, fmtClock, toMin, DAY_NAMES } from '../lib/time';

const dateKeyLocal = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
function KeepAwake() { useKeepAwake(); return null; }

export default function NowScreen({ go }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { plan, now, hebrew, dayDate, zmanim, settings, eff, actions, state, loaded, loadError, reload, learnSync, night, nightUntil } = useDay();
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
    <FlightCountdown sec={sec} plan={plan} state={state} settings={eff} dayDate={dayDate} now={now} zmanim={zmanim} />
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
      <KesherCard />
      <LearningSummary data={learnSync} settings={settings} plan={plan} state={state} />
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

// כרטיס טיסה חי — לחיצה מציגה את *סדר היום עצמו*, ולא רשימת אבני דרך סטטית.
// ימי העתיד נטענים מאותו מנוע תכנון ומאותו אחסון כמו מסך היום.
function FlightCountdown({ sec, plan, state, settings, dayDate, now, zmanim }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [daysPlan, setDaysPlan] = useState([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [daysError, setDaysError] = useState('');
  const nf = nextFlight();
  const outbound = nf?.flight?.id === 'ua85';
  // The live clock re-renders this card each second. Do not treat a freshly
  // calculated plan as a signal to reload the sheet and reset its scroll.
  const latest = useRef({ plan, settings, dayDate });
  latest.current = { plan, settings, dayDate };
  const calendarKey = dateKeyLocal(new Date());

  useEffect(() => {
    if (!open || !outbound) return;
    let cancelled = false;
    async function loadTimeline() {
      setLoadingDays(true);
      setDaysError('');
      try {
        const { plan: activePlan, settings: activeSettings, dayDate: activeDate } = latest.current;
        const first = new Date();
        first.setHours(12, 0, 0, 0);
        const end = new Date(2026, 10, 3, 12);
        const dates = [];
        for (let d = new Date(first), count = 0; d <= end && count < 8; d.setDate(d.getDate() + 1), count++) {
          dates.push(new Date(d));
        }
        const result = await Promise.all(dates.map(async d => {
          const key = dateKeyLocal(d);
          const isToday = key === dateKeyLocal(activeDate);
          if (isToday) return { key, date: d, list: activePlan?.list || [], today: true };
          const saved = await Store.loadDay(key);
          const z = await getZmanim(d).catch(() => ({}));
          const daySettings = { ...activeSettings, wakeTime: wakeTimeFor(activeSettings, d) };
          const agenda = planDay({ settings: daySettings, date: d, state: saved, zmanim: z || {}, now: 0 });
          return { key, date: d, list: agenda?.list || [], today: false };
        }));
        if (!cancelled) setDaysPlan(result);
      } catch (e) {
        if (!cancelled) setDaysError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoadingDays(false);
      }
    }
    loadTimeline();
    return () => { cancelled = true; };
  }, [open, outbound, calendarKey]);

  if (!nf || nf.ms > 21 * 864e5) return null;
  const ms = Math.max(0, nf.ms);
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const digits = [hours, mins, seconds].map(v => String(v).padStart(2, '0')).join(':');
  const flightLimit = 11 * 60 + 30;
  const formatDate = d => 'יום ' + DAY_NAMES[d.getDay()] + ' · ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const visibleDays = daysPlan.map(d => ({
    ...d,
    list: d.list.filter(s => {
      if (s.status === 'auto' || s.status === 'skipped') return false;
      if (d.today && Number.isFinite(s.plannedEnd) && s.plannedEnd < nowMinutes && s.status !== 'current') return false;
      if (d.key === '2026-11-03' && Number.isFinite(s.plannedStart) && s.plannedStart >= flightLimit) return false;
      return true;
    })
  })).filter(d => d.list.length);

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
            <T v="tiny" style={{ color: t.onNavy }}>{nf.flight.label} · לחץ לסדר היום עד הטיסה</T>
          </View>
          <Icon name="chevron-left" size={20} color={t.gold} />
        </View>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={outbound ? 'כל סדר היום עד הטיסה' : 'הטיסה הבאה'}>
        <ScrollView style={{ maxHeight: 540 }} nestedScrollEnabled>
          {outbound ? <>
            <T v="small" c="sub" style={{ marginBottom: SP.sm }}>
              כל התחנות המתוכננות מעכשיו ועד להמראה ביום שלישי 3.11, כולל לימוד, תפילות, סידורים, הכנות ונסיעות. שעות משוערות עשויות להשתנות בהתאם להתקדמות.
            </T>
            {loadingDays && <T v="small" c="sub">טוען את סדר היום…</T>}
            {!!daysError && <T v="small" style={{ color: t.warn }}>לא הצלחתי לטעון את כל הימים: {daysError}</T>}
            {!loadingDays && visibleDays.map(day => (
              <View key={day.key} style={{ marginBottom: SP.md }}>
                <View style={{ backgroundColor: t.sunk, padding: SP.sm, borderRadius: R.md, marginVertical: SP.sm }}>
                  <T v="bodyB">{formatDate(day.date)}{day.today ? ' · מהעכשיו' : ''}</T>
                </View>
                {day.list.map((s, i) => {
                  const completed = s.status === 'done' || s.rec?.status === 'done';
                  const start = Number.isFinite(s.plannedStart) ? toTime(s.plannedStart) : '';
                  const finish = Number.isFinite(s.plannedEnd) && s.duration > 0 ? toTime(s.plannedEnd) : '';
                  return (
                    <View key={s.id + ':' + i} style={{ flexDirection: 'row', gap: SP.sm, paddingVertical: 9, borderBottomWidth: 1, borderColor: t.hair, opacity: completed ? 0.6 : 1 }}>
                      <Icon name={completed ? 'check' : s.status === 'current' ? 'play' : 'clock'} size={16} color={completed ? t.sub : t.gold} />
                      <View style={{ flex: 1 }}>
                        <T v="bodyB">{s.title || 'תחנה ללא כותרת'}{completed ? ' ✓' : ''}</T>
                        {!!s.sub && <T v="small" c="sub">{s.sub}</T>}
                        {Array.isArray(s.items) && s.items.map((item, n) => (
                          <T key={n} v="small" c="sub">• {typeof item === 'string' ? item : (item?.label || item?.title || '')}</T>
                        ))}
                        {Array.isArray(s.steps) && s.steps.map((step, n) => (
                          <T key={'step:' + n} v="small" c="sub">• {step.label || step.title || step.id}</T>
                        ))}
                      </View>
                      <T v="tiny" c="sub" style={{ minWidth: 45, textAlign: 'left' }}>
                        {start}{finish && finish !== start ? '–' + finish : ''}
                      </T>
                    </View>
                  );
                })}
              </View>
            ))}
            {!loadingDays && !daysError && !visibleDays.length && <T v="small" c="sub">אין תחנות נוספות לפני ההמראה.</T>}
            <View style={{ backgroundColor: t.goldSoft, padding: SP.md, borderRadius: R.md, marginTop: SP.sm }}>
              <T v="bodyB">✈ יום שלישי 3.11 · 11:30 — המראה UA 85</T>
            </View>
          </> : (
            <View style={{ padding: SP.md }}>
              <T v="bodyB">{nf.flight.no} · {nf.flight.label}</T>
              <T v="small" c="sub">מועד ההמראה מופיע לפי כרטיס הטיסה, אינו מעקב חי.</T>
            </View>
          )}
        </ScrollView>
      </Sheet>
    </>
  );
}

// סטטוס לימוד שהועבר מאפליקציית הלימוד; לא מציגים כמידע חי אם עבר יום.
function LearningSummary({ data, settings, plan, state }) {
  const t = useT();
  const today = new Date();
  const key = [today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  const current = data?.date === key ? data : null;
  const items = current?.remaining || [];
  const minutes = items.reduce((n,u)=>n+(u.minutes||0),0);
  const nextAt = plan?.nextAnchor?.time;
  const freeUntilAnchor = Number.isFinite(nextAt) ? Math.max(1, Math.floor(nextAt - (new Date().getHours() * 60 + new Date().getMinutes()))) : null;
  const target = Math.max(1, Math.min(180, Math.round(plan?.current?.type === 'study' ? Math.max(1, plan.current.plannedEnd - (new Date().getHours() * 60 + new Date().getMinutes())) : (freeUntilAnchor == null ? 10 : Math.min(10, freeUntilAnchor)))));
  const url = (settings.apps?.limud?.url || 'https://williash7.github.io/hoshana-raba/').replace(/\/$/,'');
  const completed = (settings.stations||[]).filter(st=>st.type==='prayer' && ['shacharit','mincha','maariv','shema'].includes(st.prayer) && state?.stations?.[st.id]?.status==='done').map(st=>st.prayer);
  const query = '&markDay='+key+'&markPrayers='+[...new Set(completed)].join(',');
  const open = () => Linking.openURL(url+'/index.html?go=1&min='+target+query).catch(()=>{});
  const sync = () => Linking.openURL(url+'/index.html?fromSeder=1'+query).catch(()=>{});
  if (!current) return (
    <Pressable onPress={sync} style={{ marginTop: 5, paddingVertical: 8 }}>
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
        <Btn small kind="line" title="סנכרון" onPress={sync} />
      </View>
      <T v="tiny" c="sub" style={{ marginTop: 6 }}>כשתסיים ללמוד, לחץ על ״סיימתי — עדכן את סדר היום״ כדי לחזור עם ההתקדמות.</T>
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
