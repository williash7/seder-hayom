// וידג'טים של אפליקציות אחרות, בתוך סדר היום — לא צריך לצאת מהאפליקציה.
// כפתור בוידג'ט שפועל ברקע (שער, פודקאסט) לא פותח את האפליקציה ולכן לא מפעיל נעילה.
import { useEffect, useRef, useState } from 'react';
import { View, Alert } from 'react-native';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Chip, Sheet, Field } from './UI';
import * as Native from '../lib/native';

export default function Widgets() {
  const t = useT();
  const { settings, actions } = useDay();
  const list = settings.widgets || [];
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [providers, setProviders] = useState([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const pending = useRef(null);       // טיימר ההמתנה לאישור המערכת

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const save = next => actions.saveSettings({ ...settingsRef.current, widgets: next });

  const finish = (id, h) => {
    const st = Native.widgetState(id);
    if (!st?.bound) return false;
    if (st.configure) Native.configureWidget(id);
    save([...(settingsRef.current.widgets || []), { id, h: Math.max(64, h || st.h || 100), half: false }]);
    setMsg('');
    return true;
  };

  // ממתינים לאישור של המערכת: בודקים כל חצי שנייה עד שהווידג'ט נקשר (עד שתי דקות).
  // לא מוחקים בחזרה לאפליקציה — החלון של המערכת יכול לגרום ל"חזרה" לפני שבחרת.
  const waitBind = (id, h, d = '') => {
    const t0 = Date.now();
    pending.current = setInterval(() => {
      if (finish(id, h)) { clearInterval(pending.current); pending.current = null; return; }
      if (Date.now() - t0 > 120000) {
        clearInterval(pending.current); pending.current = null;
        Native.deleteWidget(id); setMsg('המערכת לא אישרה את הווידג\'ט, או שהאישור לא הופיע' + d);
      }
    }, 500);
  };
  useEffect(() => () => { if (pending.current) clearInterval(pending.current); }, []);

  const openAdd = async () => {
    setAdding(true); setMsg('');
    try { setProviders(await Native.listWidgetProviders()); } catch (e) { setMsg('לא הצלחתי לטעון: ' + String(e?.message || e)); }
  };

  const pick = p => {
    setAdding(false);
    Native.unlockFor(3);          // שהנעילה לא תחסום את חלון האישור של המערכת
    const r = Native.allocateWidget(p.provider);
    if (!r) { setMsg('הגרסה המותקנת ישנה — צריך להתקין את ה-APK החדש'); return; }
    if (r.bound) { if (!finish(r.id, p.h)) setMsg('הווידג\'ט נקשר אבל לא נטען'); }
    else {
      const d = r.resolved === undefined ? '' : r.resolved === '' ? ' (לא נמצא חלון אישור במערכת)' : ` (${r.resolved})`;
      setMsg('ממתין לאישור של המערכת…' + d); waitBind(r.id, p.h, d);
    }
  };

  const change = (id, patch) => save(list.map(w => (w.id === id ? { ...w, ...patch } : w)));
  const remove = id => Alert.alert('להסיר את הווידג\'ט?', '', [
    { text: 'ביטול', style: 'cancel' },
    { text: 'הסר', style: 'destructive', onPress: () => { Native.deleteWidget(id); save(list.filter(w => w.id !== id)); } },
  ]);

  if (!Native.hasNative) return null;
  const shown = providers.filter(p => !q || (p.app + ' ' + p.label).toLowerCase().includes(q.toLowerCase()));

  return (
    <View style={{ marginTop: SP.xl }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="bodyB">וידג׳טים</T>
        <View style={{ flexDirection: 'row', gap: SP.sm }}>
          {list.length > 0 && <Chip label={edit ? 'סיום' : 'עריכה'} active={edit} onPress={() => setEdit(!edit)} />}
          <Chip label="+ הוספה" onPress={openAdd} />
        </View>
      </View>
      {!!msg && <T v="small" style={{ marginTop: SP.sm, color: t.warn }}>{msg}</T>}
      {!!pending.current && <Chip label="ביטול" onPress={() => { clearInterval(pending.current); pending.current = null; setMsg(''); }} />}
      {list.length === 0 && <T v="small" c="sub" style={{ marginTop: SP.sm }}>אפשר להוסיף כאן וידג׳טים של אפליקציות אחרות — בנק, שער, פודקאסט — ולהשתמש בהם בלי לצאת מסדר היום.</T>}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: SP.sm }}>
        {list.map(w => (
          <View key={w.id} style={{ width: w.half ? '48.5%' : '100%', marginBottom: SP.md }}>
            {edit && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                <Chip label="גדול" onPress={() => change(w.id, { h: w.h + 40 })} />
                <Chip label="קטן" onPress={() => change(w.id, { h: Math.max(48, w.h - 40) })} />
                <Chip label={w.half ? 'רוחב מלא' : 'חצי רוחב'} onPress={() => change(w.id, { half: !w.half })} />
                <Chip label="הסר" tone="warn" onPress={() => remove(w.id)} />
              </View>
            )}
            <View style={{ height: w.h, borderRadius: R.md, overflow: 'hidden', backgroundColor: t.sunk }}>
              {Native.WidgetView && <Native.WidgetView widgetId={w.id} style={{ flex: 1 }} />}
            </View>
          </View>
        ))}
      </View>

      <Sheet visible={adding} onClose={() => setAdding(false)} title="איזה וידג׳ט להוסיף?">
        <Field value={q} onChangeText={setQ} placeholder="חיפוש (שם אפליקציה)" />
        <View style={{ marginTop: SP.sm }}>
          {shown.slice(0, 60).map(p => (
            <View key={p.provider} style={{ paddingVertical: 8 }}>
              <Btn kind="line" small title={`${p.app} — ${p.label}`} onPress={() => pick(p)} />
            </View>
          ))}
          {!shown.length && <T c="sub">לא נמצאו וידג׳טים</T>}
        </View>
      </Sheet>
    </View>
  );
}
