// "שינוי בתוכנית" — בונים רצף תחנות חד-פעמי ומכניסים אותו עכשיו:
// נסיעה (לכתובת חדשה או למקום שמור) → להיות שם X דק׳ → לימוד X דק׳ → משימה/טיימר…
// הכל נכנס לפני התחנה הנוכחית, ומה שקבוע בהמשך היום — נשמר.
import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Field, Chip, Sheet, Card } from './UI';
import Icon from './Icon';
import { fmtDur, toMin } from '../lib/time';
import { parsePlan } from '../lib/parsePlan';

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;

const KINDS = [
  { k: 'drive', label: 'נסיעה', icon: 'car' },
  { k: 'stay', label: 'להיות שם', icon: 'clock' },
  { k: 'study', label: 'לימוד', icon: 'book' },
  { k: 'task', label: 'משימה', icon: 'list' },
  { k: 'timer', label: 'טיימר', icon: 'play' },
];
const MINS = [5, 10, 15, 20, 30, 45, 60, 90];

export default function PlanChange() {
  const t = useT();
  const { settings, actions } = useDay();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [newPlaces, setNewPlaces] = useState({});
  const [edit, setEdit] = useState(null);   // הפריט שבונים עכשיו
  const [say, setSay] = useState('');       // משפט מוקלד/מוכתב
  const [when, setWhen] = useState('now');
  const [atTime, setAtTime] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const seqs = settings.sequences || [];

  const build = () => {
    const [it, np] = parsePlan(say, { ...(settings.places || {}), ...newPlaces });
    if (!it.length) return;
    setItems(l => [...l, ...it]); setNewPlaces(p => ({ ...p, ...np })); setSay('');
  };
  const saveSeq = () => {
    if (!saveName.trim() || !items.length) return;
    const next = [...seqs.filter(x => x.name !== saveName.trim()), { id: 's' + Date.now(), name: saveName.trim(), items }];
    actions.saveSettings({ ...settings, places: { ...(settings.places || {}), ...newPlaces }, sequences: next });
    setNewPlaces({}); setSaving(false); setSaveName('');
  };
  const delSeq = id => actions.saveSettings({ ...settings, sequences: seqs.filter(x => x.id !== id) });

  const places = { ...(settings.places || {}), ...newPlaces };
  const start = k => setEdit({ k, title: '', minutes: k === 'study' ? 30 : k === 'stay' ? 20 : 10, place: null, name: '', address: '', drive: 10 });

  const addItem = () => {
    const e = edit;
    if (e.k === 'drive') {
      let id = e.place;
      if (!id) {
        if (!e.name.trim() || !e.address.trim()) return;
        id = 'p_' + Date.now();
        setNewPlaces(p => ({ ...p, [id]: { name: e.name.trim(), address: e.address.trim(), minutes: Number(e.drive) || 10 } }));
      }
      const name = e.place ? places[id]?.name : e.name.trim();
      setItems(l => [...l, { type: 'drive', title: `ל${name}`, icon: 'car', legs: [id] }]);
    } else if (e.k === 'stay') {
      const where = [...items].reverse().find(x => x.type === 'drive');
      setItems(l => [...l, { type: 'timer', title: e.title.trim() || (where ? `${where.title.slice(1)}` : 'להיות שם'), icon: 'clock', minutes: e.minutes }]);
    } else if (e.k === 'study') {
      setItems(l => [...l, { type: 'study', title: e.title.trim() || 'זמן לימוד', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', minutes: e.minutes }]);
    } else if (e.k === 'task') {
      if (!e.title.trim()) return;
      setItems(l => [...l, { type: 'timer', title: e.title.trim(), icon: 'list', minutes: e.minutes }]);
    } else {
      setItems(l => [...l, { type: 'timer', title: e.title.trim() || 'טיימר', icon: 'play', minutes: e.minutes }]);
    }
    setEdit(null);
  };

  const commit = () => {
    if (!items.length) return;
    if (when === 'at' && !HHMM.test(atTime)) return;
    actions.addExtras(items, newPlaces, when === 'at' ? atTime.padStart(5, '0') : null);
    setItems([]); setNewPlaces({}); setEdit(null); setOpen(false); setWhen('now'); setAtTime('');
  };
  const close = () => { setOpen(false); setEdit(null); };
  const total = items.reduce((a, x) => a + (x.type === 'drive' ? (Number(places[x.legs[0]]?.minutes) || 10) : x.minutes || 0), 0);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
        <Icon name="plus" size={16} color={t.gold} />
        <T v="small" style={{ color: t.gold, fontWeight: '700' }}>שינוי בתוכנית</T>
      </Pressable>

      <Sheet visible={open} onClose={close} title="שינוי בתוכנית — מה עכשיו?">
        <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
          {items.map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 8 }}>
              <T v="small" c="sub" style={{ width: 18 }}>{i + 1}</T>
              <Icon name={x.icon} size={18} color={t.sub} />
              <T v="bodyB" style={{ flex: 1 }}>{x.title}</T>
              <T v="small" c="sub">{x.type === 'drive' ? `~${places[x.legs[0]]?.minutes || 10} דק׳` : fmtDur(x.minutes)}</T>
              <Pressable onPress={() => setItems(l => l.filter((_, j) => j !== i))} hitSlop={8}><Icon name="x" size={16} color={t.faint} /></Pressable>
            </View>
          ))}
          {items.length > 0 && <T v="small" c="sub" style={{ marginBottom: SP.sm }}>סה״כ כ-{fmtDur(total)}. מה שקבוע בהמשך היום לא זז — השאר יתקצר או יזוז.</T>}

          {!edit && !items.length && seqs.length > 0 && (
            <>
              <T v="tiny" c="sub" style={{ marginBottom: SP.sm }}>רצפים שמורים (לחיצה ארוכה — למחוק):</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.md }}>
                {seqs.map(q => (
                  <Chip key={q.id} label={q.name} onPress={() => setItems(q.items)} onLongPress={() => delSeq(q.id)} />
                ))}
              </View>
            </>
          )}
          {!edit && (
            <View style={{ flexDirection: 'row', gap: SP.sm, alignItems: 'flex-start' }}>
              <Field value={say} onChangeText={setSay} multiline style={{ flex: 1, minHeight: 56 }}
                placeholder={'לכתוב או להכתיב (המיקרופון במקלדת): "נסיעה למקס סטוק, חצי שעה שם, ואז לבית חב״ד"'} />
              <Btn title="לבנות" small kind="line" disabled={!say.trim()} onPress={build} />
            </View>
          )}
          {!edit ? (
            <>
              <T v="tiny" c="sub" style={{ marginTop: SP.md, marginBottom: SP.sm }}>{items.length ? 'ואחר כך:' : 'או להוסיף אחד-אחד:'}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
                {KINDS.map(k => <Chip key={k.k} label={k.label} onPress={() => start(k.k)} />)}
              </View>
              {items.length > 0 && (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.lg, alignItems: 'center' }}>
                    <T v="small" c="sub">מתי?</T>
                    <Chip label="עכשיו" active={when === 'now'} onPress={() => setWhen('now')} />
                    <Chip label="בשעה…" active={when === 'at'} onPress={() => setWhen('at')} />
                    {when === 'at' && <Field value={atTime} onChangeText={setAtTime} placeholder="17:00" keyboardType="numbers-and-punctuation" style={{ width: 90 }} />}
                  </View>
                  {saving ? (
                    <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.md }}>
                      <Field value={saveName} onChangeText={setSaveName} placeholder="שם לרצף (למשל: קניות בעיר)" style={{ flex: 1 }} autoFocus />
                      <Btn title="לשמור" small kind="line" disabled={!saveName.trim()} onPress={saveSeq} />
                    </View>
                  ) : (
                    <Pressable onPress={() => setSaving(true)} style={{ marginTop: SP.md }}>
                      <T v="small" style={{ color: t.gold }}>+ לשמור את הרצף לפעם הבאה</T>
                    </Pressable>
                  )}
                </>
              )}
              <Btn title={!items.length ? 'להכניס' : when === 'at' ? `להכניס ב-${atTime || '…'} (${items.length})` : `להכניס עכשיו (${items.length})`} icon="check" kind="gold"
                disabled={!items.length || (when === 'at' && !HHMM.test(atTime))}
                style={{ marginTop: SP.lg }} onPress={commit} />
            </>
          ) : (
            <Card tone="sunk" style={{ marginTop: SP.sm }}>
              <T v="bodyB">{KINDS.find(k => k.k === edit.k).label}</T>
              {edit.k === 'drive' ? (
                <>
                  <T v="tiny" c="sub" style={{ marginTop: SP.sm }}>למקום שמור:</T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {Object.entries(places).map(([id, p]) => (
                      <Chip key={id} label={p.name} active={edit.place === id} onPress={() => setEdit({ ...edit, place: edit.place === id ? null : id })} />
                    ))}
                  </View>
                  {!edit.place && (
                    <>
                      <T v="tiny" c="sub" style={{ marginTop: SP.md }}>או מקום חדש (נשמר לפעם הבאה):</T>
                      <Field value={edit.name} onChangeText={v => setEdit({ ...edit, name: v })} placeholder="שם (למשל מקס סטוק)" style={{ marginTop: 4 }} />
                      <Field value={edit.address} onChangeText={v => setEdit({ ...edit, address: v })} placeholder="כתובת לוויז" style={{ marginTop: SP.sm }} />
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SP.sm }}>
                        <T v="small" c="sub" style={{ alignSelf: 'center' }}>נסיעה של</T>
                        {[5, 10, 15, 20, 30].map(m => <Chip key={m} label={`${m} דק׳`} active={edit.drive === m} onPress={() => setEdit({ ...edit, drive: m })} />)}
                      </View>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Field value={edit.title} onChangeText={v => setEdit({ ...edit, title: v })} autoFocus={edit.k === 'task'}
                    placeholder={edit.k === 'task' ? 'מה צריך לעשות?' : edit.k === 'study' ? 'מה לומדים? (לא חובה)' : edit.k === 'stay' ? 'מה עושים שם? (לא חובה)' : 'שם (לא חובה)'}
                    style={{ marginTop: SP.sm }} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SP.sm }}>
                    {MINS.map(m => <Chip key={m} label={fmtDur(m)} active={edit.minutes === m} onPress={() => setEdit({ ...edit, minutes: m })} />)}
                  </View>
                  {edit.k === 'study' && <T v="small" c="sub" style={{ marginTop: SP.sm }}>נפתח באפליקציית הלימוד, עד סוף הזמן.</T>}
                </>
              )}
              <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.md }}>
                <Btn title="להוסיף לרצף" icon="plus" kind="primary" small onPress={addItem} />
                <Btn title="ביטול" kind="ghost" small onPress={() => setEdit(null)} />
              </View>
            </Card>
          )}
        </ScrollView>
      </Sheet>
    </>
  );
}
