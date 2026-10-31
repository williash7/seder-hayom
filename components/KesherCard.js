import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { T, Btn, Card, Chip } from './UI';
import { SP } from '../lib/theme';
import * as Native from '../lib/native';
import { KESHER_PERIODS, kesherState, workLabel, cashLabel } from '../lib/kesher';

const messages = {
  loading: 'בודק חיבור לקשר…',
  missing_app: 'יש להתקין את אפליקציית קשר במכשיר הזה.',
  needs_app_update: 'החיבור דורש התקנת APK חדש של סדר היום.',
  not_connected: 'פתח את קשר ← הגדרות ← חיבור לסדר היום, ואשר סיכומים ומשימות. אחרי אתחול הטלפון ייתכן שצריך לפתוח שוב את קשר.',
  invalid: 'גרסת הנתונים אינה תואמת. יש לעדכן את שתי האפליקציות.',
  error: 'לא ניתן לרענן כרגע. הנתונים המוצגים, אם ישנם, הם מהקריאה הקודמת.',
};

// רכיב יציב בתוך מסך הבית; שעון השניות של המסך אינו מפעיל קריאה מחדש.
export default memo(function KesherCard() {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [period, setPeriod] = useState('day');
  const [openError, setOpenError] = useState('');
  const active = useRef(true), sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!active.current || AppState.currentState === 'background') return;
    const token = ++sequence.current;
    let result;
    try { result = await Native.readKesherSnapshot(); } catch { result = { status: 'error' }; }
    if (active.current && token === sequence.current) setState(old => kesherState(old, result));
  }, []);
  useEffect(() => {
    active.current = true; refresh();
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') { active.current = true; refresh(); }
      else { active.current = false; sequence.current++; setState({ status: 'loading', data: null }); }
    });
    const timer = setInterval(refresh, 30000);
    return () => { active.current = false; sequence.current++; sub.remove(); clearInterval(timer); };
  }, [refresh]);
  const open = mode => {
    setOpenError(Native.openKesher(mode) ? '' : 'לא ניתן לפתוח את קשר. בדוק שהיא מותקנת במכשיר.');
  };
  const d = state.data, p = d?.periods[period];
  return <Card style={{ marginBottom: SP.lg }}>
    <T v="h2">קשר · ההתרמה שלך</T>
    <Btn title="פתיחת קשר" kind="ok" style={{ marginTop: SP.md, minHeight: 56 }} onPress={() => open('home')} />
    {!!openError && <T v="small" c="warn">{openError}</T>}
    {state.status !== 'ok' && <>
      <T v="small" c="sub" style={{ marginTop: SP.md }}>{messages[state.status] || messages.error}</T>
      {state.status === 'not_connected' && <Btn title="פתיחת הגדרות החיבור בקשר" kind="line" small onPress={() => open('sync')} style={{ marginTop: SP.sm }} />}
    </>}
    {!!p && <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.md }}>
        {KESHER_PERIODS.map(([key, label]) => <Chip key={key} label={label} active={period === key} onPress={() => setPeriod(key)} />)}
      </View>
      <T v="h2" style={{ marginTop: SP.md }}>{cashLabel(p.paidCents)} התקבלו</T>
      <T v="body">{p.payments} תשלומים · זמן התרמה: {workLabel(p.workMs)}</T>
      <T v="small" c={d.running ? 'ok' : 'sub'}>{d.running ? 'מדידת הזמן פועלת בקשר' : 'מדידת הזמן עצורה'}</T>
      <T v="small" c="sub">הבטחות חדשות: {cashLabel(p.pledgedCents)} · התחייבויות חודשיות חדשות: {cashLabel(p.monthlyCents)} לחודש</T>
      <T v="small" c="sub">בקמפיין: {cashLabel(d.openPledgesCents)} הבטחות חד פעמיות שטרם שולמו</T>
      <T v="tiny" c="sub">תשלומים שתועדו בקשר בלבד; יתרות קודמות מהגיליון אינן נכללות. שבוע מיום ראשון וחודש לועזי, לפי שעון ירושלים.</T>
      <T v="bodyB" style={{ marginTop: SP.md }}>משימות המשך פתוחות · {d.openTaskCount}</T>
      {d.tasks.slice(0, 3).map(task => <View key={task.id} style={{ marginTop: SP.sm }}>
        <T v="small">{task.donorName ? `${task.donorName} · ` : ''}{task.title}</T>
        {!!task.due && <T v="tiny" c="sub">{new Date(task.due).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</T>}
      </View>)}
      <Btn title="פתיחת המשימות בקשר" kind="line" small style={{ marginTop: SP.sm }} onPress={() => open('tasks')} />
      <T v="tiny" c="sub" style={{ marginTop: SP.sm }}>נקרא מקשר ב־{new Date(d.generatedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} · פעימה מוגבלת לשעתיים</T>
    </>}
    <Btn title="רענון הסיכום" kind="ghost" small onPress={refresh} style={{ marginTop: SP.sm }} />
  </Card>;
});
