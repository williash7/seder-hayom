// מסך עריכה מרוכזת: משנים תחנות ומשימות בטיוטה ורק בסוף מבצעים שמירה אחת.
import { useEffect, useMemo, useState } from 'react';
import { Alert, View, Pressable } from 'react-native';
import { Sheet, T, Btn, Field, Chip } from './UI';
import { useT, SP, R } from '../lib/theme';
import { dateKey, toMin, toTime } from '../lib/time';
import { createDayDraft, normalizedTime, reviewDayDraft } from '../lib/dayBatch';

const makeForm = (s, isNew = false) => ({
  id: isNew ? null : s.id,
  title: isNew ? '' : (s.title || ''),
  sub: isNew ? '' : (s.sub || ''),
  mode: isNew ? 'none' : s.arriveBy ? 'arrive' : s.at ? 'at' : 'none',
  time: isNew ? '' : (s.arriveBy || s.at || ''),
  duration: String(isNew ? 10 : Math.max(0, Math.round(s.manualMinutes ?? s.duration ?? s.minutes ?? 10))),
  address: isNew ? '' : (s.address || ''),
  walk: isNew ? false : !!s.walk,
  listField: isNew ? null : Array.isArray(s.steps) ? 'steps' : Array.isArray(s.items) ? 'items' : null,
  listText: isNew ? '' : Array.isArray(s.steps)
    ? s.steps.map(x => x.label || x.title || '').join('\n')
    : Array.isArray(s.items) ? s.items.map(x => typeof x === 'string' ? x : x.label || x.title || '').join('\n') : '',
  taskRecord: false,
});

export default function BatchDayEditor({
  visible, onClose, onSave, settings, dayDate, dayState, zmanim, now, focusId, tasks = [], isToday,
}) {
  const t = useT();
  const dayKey = dateKey(dayDate);
  const [draft, setDraft] = useState(null);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [validation, setValidation] = useState('');

  useEffect(() => {
    if (!visible) return;
    setDraft(createDayDraft(dayState));
    setForm(null);
    setDirty(false);
    setWarningsOpen(false);
    setValidation('');
  }, [visible, dayKey, focusId]);

  const report = useMemo(() => draft ? reviewDayDraft({
    settings, date: dayDate, state: dayState, draft, zmanim, now, tasks,
  }) : null, [settings, dayKey, dayState, draft, zmanim, now, tasks]);

  const list = report?.plan?.list || [];
  const taskRows = (tasks || [])
    .map(task => ({ ...task, ...(draft?.taskEdits?.[task.id] || {}) }))
    .filter(task => task.date === dayKey || (isToday && task.date < dayKey && !task.done));
  const chooseTask = id => {
    const task = taskRows.find(x => x.id === id);
    if (!task) return;
    setForm({ ...makeForm(task), taskRecord: true });
    setWarningsOpen(false);
    setValidation('');
  };
  const choose = id => {
    const s = list.find(x => x.id === id) || draft?.extras?.find(x => x.id === id);
    if (!s) return;
    setForm(makeForm(s));
    setWarningsOpen(false);
    setValidation('');
  };
  useEffect(() => {
    if (visible && draft && focusId && !form) {
      const s = list.find(x => x.id === focusId);
      if (s) setForm(makeForm(s));
    }
  }, [visible, !!draft, focusId]);

  const update = (key, value) => setForm(p => ({ ...p, [key]: value }));
  const addNew = () => { setForm(makeForm({}, true)); setWarningsOpen(false); setValidation(''); };
  const validate = () => {
    if (!form.title.trim()) return 'חסר שם למשימה או לתחנה.';
    if (form.mode !== 'none' && !normalizedTime(form.time)) return 'יש לכתוב שעה תקינה, למשל 17:30.';
    if (!/^\d+$/.test(form.duration.trim()) || Number(form.duration) > 1440) return 'משך המשימה צריך להיות בדקות, בין 0 ל־1440.';
    if (form.walk && !form.address.trim() && form.id &&
        !(list.find(x => x.id === form.id)?.legs || []).length) {
      return 'כדי לנווט ברגל יש להזין כתובת.';
    }
    if (form.walk && !form.id && !form.address.trim()) return 'כדי לנווט ברגל יש להזין כתובת.';
    return '';
  };
  const stage = () => {
    const error = validate();
    if (error) { setValidation(error); return; }
    const title = form.title.trim();
    const sub = form.sub.trim();
    const address = form.address.trim();
    const duration = Number(form.duration);
    const at = form.mode === 'at' ? normalizedTime(form.time) : null;
    const arriveBy = form.mode === 'arrive' ? normalizedTime(form.time) : null;
    if (form.taskRecord) {
      const original = taskRows.find(x => x.id === form.id);
      if (!original) { setValidation('המשימה לא נמצאה.'); return; }
      const patch = {};
      if (title !== original.title) patch.title = title;
      if (sub !== (original.sub || '')) patch.sub = sub;
      if (address !== (original.address || '')) patch.address = address;
      if (form.walk !== !!original.walk) patch.walk = form.walk;
      if (duration !== Number(original.minutes ?? 10)) patch.minutes = duration;
      const oldMode = original.arriveBy ? 'arrive' : original.at ? 'at' : 'none';
      const oldTime = original.arriveBy || original.at || '';
      if (form.mode !== oldMode ||
          (form.mode !== 'none' && normalizedTime(form.time) !== normalizedTime(oldTime))) {
        patch.at = at;
        patch.arriveBy = arriveBy;
      }
      if (Object.keys(patch).length) {
        setDraft(d => ({ ...d, taskEdits: {
          ...(d.taskEdits || {}), [form.id]: { ...(d.taskEdits?.[form.id] || {}), ...patch },
        } }));
      }
    } else if (!form.id) {
      const id = 'edit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const requested = at ? toMin(at) : (arriveBy ? toMin(arriveBy) - duration : null);
      const target = requested == null ? null :
        list.find(x => !['done', 'skipped', 'auto'].includes(x.status) &&
          x.plannedStart >= requested - 0.5);
      const end = list.find(x => x.type === 'close' && !['done', 'skipped'].includes(x.status));
      const item = { id, type: 'timer', icon: 'list', title, sub, minutes: duration,
        at, arriveBy, address, walk: form.walk, batch: id, beforeId: target?.id || end?.id || null };
      setDraft(d => ({ ...d, extras: [...d.extras, item] }));
    } else {
      const s = list.find(x => x.id === form.id) || draft.extras.find(x => x.id === form.id);
      if (!s) { setValidation('התחנה לא נמצאה בטיוטה.'); return; }
      const patch = {};
      if (title !== s.title) patch.title = title;
      if (sub !== (s.sub || '')) patch.sub = sub;
      if (address !== (s.address || '')) patch.address = address;
      if (form.walk !== !!s.walk) patch.walk = form.walk;
      if (form.listField) {
        const before = (s[form.listField] || []).map(x => typeof x === 'string' ? x : x.label || x.title || '');
        const after = form.listText.split('\n').map(x => x.trim()).filter(Boolean);
        if (before.join('\n') !== after.join('\n')) {
          if (form.listField === 'items') { patch.items = after; patch.useEditedItems = true; }
          else patch.steps = after.map((label, i) => ({
            ...(s.steps?.[i] || {}),
            id: s.steps?.[i]?.id || ('step_edit_' + Date.now() + '_' + i),
            label, minutes: s.steps?.[i]?.minutes ?? 5,
          }));
        }
      }
      if (duration !== Math.round(s.manualMinutes ?? s.duration ?? s.minutes ?? 0)) {
        patch.manualMinutes = duration;
        if (s.fill) patch.fill = false;
      }
      const oldMode = s.arriveBy ? 'arrive' : s.at ? 'at' : 'none';
      const oldTime = s.arriveBy || s.at || '';
      if (form.mode !== oldMode ||
          (form.mode !== 'none' && normalizedTime(form.time) !== normalizedTime(oldTime))) {
        patch.at = at;
        patch.arriveBy = arriveBy;
        patch.atKey = null;
        patch.atZman = null;
        patch.endByZman = null;
      }
      if (Object.keys(patch).length) {
        if (s.extra) {
          setDraft(d => ({ ...d, extras: d.extras.map(x => x.id === s.id ? { ...x, ...patch } : x) }));
        } else {
          setDraft(d => ({ ...d, overrides: {
            ...d.overrides, [s.id]: { ...(d.overrides[s.id] || {}), ...patch },
          } }));
        }
      }
    }
    setDirty(true);
    setWarningsOpen(false);
    setValidation('');
    setForm(null);
  };

  const omit = () => {
    if (!form?.id) return;
    const s = list.find(x => x.id === form.id);
    if (form.taskRecord) {
      setForm(null);
      return;
    }
    if (s?.extra) setDraft(d => ({ ...d, extras: d.extras.filter(x => x.id !== s.id) }));
    else setDraft(d => ({ ...d, overrides: {
      ...d.overrides, [form.id]: { ...(d.overrides[form.id] || {}), off: true },
    } }));
    setDirty(true);
    setWarningsOpen(false);
    setForm(null);
  };
  const restore = id => {
    setDraft(d => {
      const overrides = { ...d.overrides };
      if (overrides[id]) {
        const { off, ...rest } = overrides[id];
        if (Object.keys(rest).length) overrides[id] = rest;
        else delete overrides[id];
      }
      return { ...d, overrides };
    });
    setDirty(true);
    setWarningsOpen(false);
  };
  const askClose = () => {
    if (!dirty) return onClose();
    Alert.alert('לצאת בלי לשמור?', 'כל השינויים בטיוטה יימחקו.', [
      { text: 'להמשיך לערוך', style: 'cancel' },
      { text: 'לצאת בלי לשמור', style: 'destructive', onPress: onClose },
    ]);
  };
  const finish = confirmed => {
    if (!draft || !dirty) return onClose();
    if (report?.warnings.length && !confirmed) { setWarningsOpen(true); return; }
    onSave(draft);
    setDirty(false);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={askClose} title={'עריכה מרוכזת — יום ' + dayKey}>
      {!draft || !report ? <T c="sub">טוען טיוטה…</T> : (
        <View style={{ gap: SP.md }}>
          {!form ? (
            <>
              <T c="sub">אפשר לערוך כמה תחנות, להוסיף משימות ולשנות כתובת או הליכה. שום שינוי לא נשמר עד ללחיצה על ״שמור שינויים״.</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
                <Btn title="הוסף משימה" icon="plus" kind="line" small onPress={addNew} />
                <Chip label={dirty ? 'יש שינויים שלא נשמרו' : 'אין שינויים בטיוטה'} active={dirty} />
              </View>
              {warningsOpen && !!report.warnings.length && (
                <View style={{ padding: SP.md, backgroundColor: t.warnSoft, borderRadius: R.md, gap: 8 }}>
                  <T v="bodyB" style={{ color: t.warn }}>נמצאו התנגשויות או איחורים</T>
                  {report.warnings.slice(0, 12).map((w, i) => (
                    <T key={i} v="small" style={{ color: t.warn }}>• {w}</T>
                  ))}
                  {report.warnings.length > 12 && <T c="sub">ועוד {report.warnings.length - 12} התראות.</T>}
                  <T v="small" c="sub">מומלץ לתקן את השעות לפני השמירה. אפשר גם לשמור במודע למרות ההתראות.</T>
                  <Btn title="חזור לתיקון השעות" kind="line" onPress={() => setWarningsOpen(false)} />
                  <Btn title="שמור למרות ההתראות" kind="gold" onPress={() => finish(true)} />
                </View>
              )}
              {dirty && !warningsOpen && !!report.warnings.length && (
                <T v="small" style={{ color: t.warn }}>שימו לב: זוהו {report.warnings.length} התראות בתוכנית. לחץ על שמירה כדי לראות אותן.</T>
              )}
              {list.map(s => (
                <Pressable key={s.id} onPress={() => choose(s.id)}
                  style={{ padding: SP.md, borderRadius: R.md, backgroundColor: t.sunk,
                    opacity: ['done', 'skipped'].includes(s.status) ? 0.7 : 1, gap: 3 }}>
                  <T v="bodyB">{s.title} {draft.overrides[s.id] ? '✎' : ''}</T>
                  <T v="small" c="sub">{toTime(s.plannedStart)}–{toTime(s.plannedEnd)}
                    {s.address ? ' · ' + s.address : ''}{s.walk ? ' · ברגל' : ''}</T>
                </Pressable>
              ))}
              {!!taskRows.length && <T v="bodyB">משימות אישיות ברשימת היום</T>}
              {taskRows.map(task => (
                <Pressable key={'task:' + task.id} onPress={() => chooseTask(task.id)}
                  style={{ padding: SP.md, borderRadius: R.md, backgroundColor: t.sunk, gap: 3 }}>
                  <T v="bodyB">{task.title} {draft.taskEdits?.[task.id] ? '✎' : ''}</T>
                  <T v="small" c="sub">
                    {task.at || task.arriveBy || 'ללא שעה'}{task.minutes != null ? ' · ' + task.minutes + ' דקות' : ''}
                    {task.address ? ' · ' + task.address : ''}{task.walk ? ' · הליכה' : ''}
                  </T>
                </Pressable>
              ))}
              {Object.entries(draft.overrides).filter(([, patch]) => patch?.off).map(([id]) => (
                <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
                  <T v="small" c="sub" style={{ flex: 1 }}>תחנה שבוטלה: {id}</T>
                  <Btn title="להחזיר" kind="line" small onPress={() => restore(id)} />
                </View>
              ))}
              <Btn title="הוסף משימה נוספת" icon="plus" kind="line" onPress={addNew} />
              <Btn title="שמור שינויים" icon="check" kind="gold" disabled={!dirty} onPress={() => finish(false)} />
              <Btn title="ביטול עריכה" kind="ghost" onPress={askClose} />
            </>
          ) : (
            <View style={{ gap: SP.md }}>
              <T v="bodyB">{form.id ? 'עריכת תחנה או משימה' : 'משימה חדשה'}</T>
              <T v="small" c="sub">שם המשימה</T>
              <Field value={form.title} onChangeText={v => update('title', v)} placeholder="מה צריך לעשות?" />
              <T v="small" c="sub">מתי?</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
                <Chip label="ללא שעה קבועה" active={form.mode === 'none'} onPress={() => update('mode', 'none')} />
                <Chip label="מתחיל בשעה" active={form.mode === 'at'} onPress={() => update('mode', 'at')} />
                <Chip label="להגיע עד" active={form.mode === 'arrive'} onPress={() => update('mode', 'arrive')} />
              </View>
              {form.mode !== 'none' && <Field value={form.time} onChangeText={v => update('time', v)}
                placeholder="17:30" keyboardType="numbers-and-punctuation" />}
              <T v="small" c="sub">משך בדקות</T>
              <Field value={form.duration} onChangeText={v => update('duration', v)} placeholder="15" keyboardType="number-pad" />
              <T v="small" c="sub">כתובת (לא חובה)</T>
              <Field value={form.address} onChangeText={v => update('address', v)}
                placeholder="רחוב, מספר, עיר" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
                <Chip label="ניווט בהליכה בגוגל מפות" active={form.walk} onPress={() => update('walk', !form.walk)} />
              </View>
              {!!form.listField && !form.taskRecord && (
                <>
                  <T v="small" c="sub">פריטי המשימה — שורה לכל פריט</T>
                  <Field value={form.listText} onChangeText={v => update('listText', v)}
                    placeholder="פריט ראשון, פריט שני..." multiline />
                </>
              )}
              <T v="small" c="sub">הערות או הוראות הגעה</T>
              <Field value={form.sub} onChangeText={v => update('sub', v)}
                placeholder="מידע נוסף (לא חובה)" multiline />
              {!!form.id && ['done', 'skipped'].includes(list.find(s => s.id === form.id)?.status) && (
                <T v="small" style={{ color: t.warn }}>משימה שכבר בוצעה: העריכה לא תשנה את שעת הביצוע שנשמרה.</T>
              )}
              {!!validation && <T v="small" style={{ color: t.warn }}>{validation}</T>}
              <Btn title="הוסף את השינוי לטיוטה" icon="check" kind="gold" onPress={stage} />
              {!!form.id && !form.taskRecord && <Btn title="הסר את התחנה מהיום" icon="x" kind="line" onPress={omit} />}
              <Btn title="חזרה לרשימה בלי לשנות" kind="ghost" onPress={() => setForm(null)} />
            </View>
          )}
        </View>
      )}
    </Sheet>
  );
}
