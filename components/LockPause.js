// השהיית כל הנעילה — לזמן מסוים או עד שעה שבוחרים. אחר כך הכל ננעל חזרה לבד.
import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Field, Chip, Sheet } from './UI';
import Icon from './Icon';
import { toTime, toMin } from '../lib/time';

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;

export default function LockPause() {
  const t = useT();
  const { lockPausedUntil, actions } = useDay();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('for');
  const [mins, setMins] = useState(30);
  const [until, setUntil] = useState('');
  const [reason, setReason] = useState('');
  const paused = lockPausedUntil && lockPausedUntil > Date.now();
  const hhmm = ms => { const d = new Date(ms); return toTime(d.getHours() * 60 + d.getMinutes()); };

  const endMs = () => {
    if (mode === 'for') return Date.now() + mins * 60000;
    if (!HHMM.test(until)) return null;
    const m = toMin(until.padStart(5, '0'));
    const d = new Date(); d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d.getTime();
  };
  const go = () => {
    const e = endMs();
    if (!e || !reason.trim()) return;
    actions.pauseLock(e, reason.trim());
    setOpen(false); setReason('');
  };

  return (
    <>
      {paused ? (
        <View style={{ backgroundColor: t.goldSoft, borderRadius: R.md, padding: SP.md, marginBottom: SP.md, flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
          <Icon name="lock" size={18} color={t.gold} />
          <T v="small" style={{ flex: 1 }}>הנעילה מושהית עד {hhmm(lockPausedUntil)} — אחר כך הכל ננעל חזרה</T>
          <Btn title="לנעול עכשיו" small kind="line" onPress={() => actions.resumeLock()} />
        </View>
      ) : (
        <Pressable onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, marginBottom: SP.sm }}>
          <Icon name="lock" size={16} color={t.sub} />
          <T v="small" c="sub">להשהות את הנעילה</T>
        </Pressable>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title="להשהות את כל הנעילה">
        <View style={{ flexDirection: 'row', gap: SP.sm }}>
          <Chip label="לזמן מסוים" active={mode === 'for'} onPress={() => setMode('for')} />
          <Chip label="עד שעה" active={mode === 'until'} onPress={() => setMode('until')} />
        </View>
        {mode === 'for' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.md }}>
            {[15, 30, 60, 120, 180].map(m => <Chip key={m} label={m < 60 ? `${m} דק׳` : `${m / 60} ש׳`} active={mins === m} onPress={() => setMins(m)} />)}
          </View>
        ) : (
          <Field value={until} onChangeText={setUntil} placeholder="עד השעה (למשל 23:00)" keyboardType="numbers-and-punctuation" style={{ marginTop: SP.md }} />
        )}
        <Field value={reason} onChangeText={setReason} placeholder="בשביל מה?" style={{ marginTop: SP.md }} />
        {!!endMs() && <T v="small" c="sub" style={{ marginTop: SP.sm }}>ננעל חזרה ב-{hhmm(endMs())}. נרשם ביומן הטלפון.</T>}
        <Btn title="להשהות" icon="lock" kind="gold" disabled={!reason.trim() || !endMs()} style={{ marginTop: SP.md }} onPress={go} />
      </Sheet>
    </>
  );
}
