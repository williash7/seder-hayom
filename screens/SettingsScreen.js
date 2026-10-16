// הגדרות — כל מה שקובע את סדר היום
import { useState } from 'react';
import { View, ScrollView, Alert, Switch, Pressable } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDay } from '../lib/DayContext';
import { useT, SP, R } from '../lib/theme';
import { T, Btn, Card, Field, Section, Chip, ListEditor, Divider, IconBtn, Sheet } from '../components/UI';
import { askPermission } from '../lib/notify';
import { DAY_SHORT, uid } from '../lib/time';
import { STATION_TYPES } from '../lib/defaults';

const PANES = [
  ['general', 'כללי'], ['places', 'מקומות'], ['minyanim', 'מניינים'], ['apps', 'אפליקציות'],
  ['lists', 'רשימות ונוסחים'], ['stations', 'תחנות'],
];

export default function SettingsScreen() {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { settings, actions } = useDay();
  const [pane, setPane] = useState('general');
  const save = patch => actions.saveSettings({ ...settings, ...patch });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: SP.xl, paddingTop: ins.top + SP.lg, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled">
        <T v="title">הגדרות</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SP.lg, marginHorizontal: -SP.xl }}
          contentContainerStyle={{ gap: SP.sm, paddingHorizontal: SP.xl }}>
          {PANES.map(([k, l]) => <Chip key={k} label={l} active={pane === k} onPress={() => setPane(k)} />)}
        </ScrollView>

        {pane === 'general' && <General settings={settings} save={save} actions={actions} />}
        {pane === 'places' && <Places settings={settings} save={save} />}
        {pane === 'minyanim' && <Minyanim settings={settings} save={save} />}
        {pane === 'apps' && <Apps settings={settings} save={save} />}
        {pane === 'lists' && <Lists settings={settings} save={save} />}
        {pane === 'stations' && <Stations settings={settings} save={save} />}
      </ScrollView>
    </View>
  );
}

function Row({ label, children }) {
  return (
    <View style={{ marginBottom: SP.md }}>
      <T v="small" c="sub" style={{ marginBottom: 6 }}>{label}</T>
      {children}
    </View>
  );
}

function General({ settings, save, actions }) {
  const testAlarm = async () => {
    await askPermission();
    await Notifications.scheduleNotificationAsync({
      content: { title: 'בדיקת שעון מעורר', body: 'ככה זה יישמע בבוקר', sound: 'default', priority: 'max' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: 'alarm' },
    });
    Alert.alert('בעוד 10 שניות', 'אפשר לנעול את המסך ולחכות');
  };
  return (
    <>
      <Section title="השכמה">
        <Card>
          <Row label="שעת השכמה (HH:MM)">
            <Field value={settings.wakeTime} onChangeText={v => save({ wakeTime: v })} keyboardType="numbers-and-punctuation" />
          </Row>
          <Row label="צלצול חוזר כל (דקות)">
            <Field value={String(settings.alarm?.repeatEveryMin ?? 2)} keyboardType="number-pad"
              onChangeText={v => save({ alarm: { ...settings.alarm, repeatEveryMin: Number(v) || 2 } })} />
          </Row>
          <Btn title="בדיקת צלצול" kind="line" small icon="sun" onPress={testAlarm} />
        </Card>
      </Section>
      <Section title="סגירת יום">
        <Card>
          <Row label="תזכורת ראשונה"><Field value={settings.dayClose.firstReminder} onChangeText={v => save({ dayClose: { ...settings.dayClose, firstReminder: v } })} /></Row>
          <Row label="נסגר סופית"><Field value={settings.dayClose.hardClose} onChangeText={v => save({ dayClose: { ...settings.dayClose, hardClose: v } })} /></Row>
        </Card>
      </Section>
      <Section title="הרשאות">
        <Card style={{ gap: SP.sm }}>
          <Btn title="לאשר התראות" kind="line" small onPress={async () => Alert.alert(await askPermission() ? 'מאושר ✓' : 'לא אושר — אפשר להפעיל בהגדרות הטלפון')} />
          <T v="small" c="sub">נעילת זמן בית אמיתית ומעקב אחרי מה פתחת בטלפון — בגרסה הבאה (צריכה הרשאת נגישות).</T>
        </Card>
      </Section>
      <Section title="איפוס">
        <Card style={{ gap: SP.sm }}>
          <Btn title="לאפס את התחנות של היום" kind="line" small onPress={() => actions.resetToday()} />
          <Btn title="להחזיר את כל ההגדרות לברירת המחדל" kind="ghost" small onPress={() =>
            Alert.alert('לאפס הכל?', 'מקומות, מניינים ותחנות יחזרו להתחלה', [
              { text: 'ביטול', style: 'cancel' }, { text: 'אפס', style: 'destructive', onPress: () => actions.resetSettings() }])} />
        </Card>
      </Section>
      <T v="small" c="faint" style={{ marginTop: SP.xl, textAlign: 'center' }}>
        סדר היום · גרסה {Constants.expoConfig?.extra?.releaseName || ''}
      </T>
    </>
  );
}

function Places({ settings, save }) {
  const set = (id, patch) => save({ places: { ...settings.places, [id]: { ...settings.places[id], ...patch } } });
  return (
    <Section title="כתובות לוויז">
      {Object.entries(settings.places).map(([id, p]) => (
        <Card key={id} style={{ marginBottom: SP.sm }}>
          <Field value={p.name} onChangeText={v => set(id, { name: v })} placeholder="שם" />
          <Field value={p.address} onChangeText={v => set(id, { address: v })} placeholder="כתובת או קואורדינטות" style={{ marginTop: SP.sm }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.sm }}>
            <T v="small" c="sub">זמן נסיעה (דק׳)</T>
            <Field value={String(p.minutes ?? '')} keyboardType="number-pad" style={{ width: 80 }}
              onChangeText={v => set(id, { minutes: Number(v) || 0 })} />
          </View>
        </Card>
      ))}
    </Section>
  );
}

function Minyanim({ settings, save }) {
  const L = { shacharit: 'שחרית', mincha: 'מנחה', maariv: 'מעריב' };
  return (
    <>
      {Object.keys(L).map(k => (
        <Section key={k} title={L[k]}>
          <Card>
            <ListEditor items={settings.minyanim[k] || []} placeholder="HH:MM"
              onChange={v => save({ minyanim: { ...settings.minyanim, [k]: [...v].sort() } })} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.md }}>
              <T v="small" c="sub">משך התפילה (דק׳)</T>
              <Field value={String(settings.prayerMinutes[k] ?? '')} keyboardType="number-pad" style={{ width: 80 }}
                onChangeText={v => save({ prayerMinutes: { ...settings.prayerMinutes, [k]: Number(v) || 0 } })} />
            </View>
          </Card>
        </Section>
      ))}
    </>
  );
}

function Apps({ settings, save }) {
  const set = (id, patch) => save({ apps: { ...settings.apps, [id]: { ...settings.apps[id], ...patch } } });
  const allowed = settings.homeTime?.allowed || [];
  return (
    <>
      <Section title="אפליקציות וקישורים">
        {Object.entries(settings.apps).map(([id, a]) => (
          <Card key={id} style={{ marginBottom: SP.sm }}>
            <T v="bodyB">{a.name}</T>
            <Field value={a.url} onChangeText={v => set(id, { url: v })} placeholder="קישור (אתר / אפליקציית רשת)" style={{ marginTop: SP.sm }} />
            <Field value={a.pkg} onChangeText={v => set(id, { pkg: v })} placeholder="שם חבילה באנדרואיד (com.example.app)" style={{ marginTop: SP.sm }} />
          </Card>
        ))}
      </Section>
      <Section title="פתוחות בזמן בית בלי לכתוב סיבה">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
          {Object.entries(settings.apps).map(([id, a]) => (
            <Chip key={id} label={a.name} active={allowed.includes(id)} onPress={() => save({ homeTime: { ...settings.homeTime,
              allowed: allowed.includes(id) ? allowed.filter(x => x !== id) : [...allowed, id] } })} />
          ))}
        </View>
      </Section>
    </>
  );
}

function Lists({ settings, save }) {
  return (
    <>
      <Section title="מצרכים לכריכים">
        <Card><ListEditor items={settings.lists.sandwiches || []} onChange={v => save({ lists: { ...settings.lists, sandwiches: v } })} /></Card>
      </Section>
      <Section title="נוסח ברכות השחר">
        <Field multiline value={settings.texts.birchos} style={{ minHeight: 180 }} placeholder="להדביק כאן את הנוסח"
          onChangeText={v => save({ texts: { ...settings.texts, birchos: v } })} />
      </Section>
      <Section title="נוסח קריאת שמע שעל המיטה">
        <Field multiline value={settings.texts.shemaBed} style={{ minHeight: 180 }} placeholder="להדביק כאן את הנוסח"
          onChangeText={v => save({ texts: { ...settings.texts, shemaBed: v } })} />
      </Section>
    </>
  );
}

function Stations({ settings, save }) {
  const t = useT();
  const [edit, setEdit] = useState(null);
  const list = settings.stations;
  const update = (id, patch) => {
    const next = list.map(s => s.id === id ? { ...s, ...patch } : s);
    save({ stations: next });
    setEdit(e => e && e.id === id ? { ...e, ...patch } : e);
  };
  const move = (id, dir) => {
    const i = list.findIndex(s => s.id === id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list]; [next[i], next[j]] = [next[j], next[i]]; save({ stations: next });
  };

  return (
    <Section title="התחנות לפי הסדר (לחיצה לעריכה)">
      {list.map(s => (
        <Pressable key={s.id} onPress={() => setEdit(s)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 10, opacity: s.enabled === false ? 0.4 : 1 }}>
            <View style={{ flex: 1 }}>
              <T v="bodyB">{s.title}</T>
              <T v="small" c="sub">
                {STATION_TYPES[s.type]} · {s.days ? s.days.map(d => DAY_SHORT[d]).join(' ') : 'כל יום'}
                {s.at ? ` · ב-${s.at}` : ''}{s.arriveBy ? ` · להגיע עד ${s.arriveBy}` : ''}
              </T>
            </View>
            <IconBtn name="back" size={32} onPress={() => move(s.id, -1)} />
            <IconBtn name="fwd" size={32} onPress={() => move(s.id, 1)} />
          </View>
          <Divider />
        </Pressable>
      ))}

      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit?.title || ''}>
        {edit && <StationEditor s={edit} update={p => update(edit.id, p)} />}
      </Sheet>
    </Section>
  );
}

function StationEditor({ s, update }) {
  const days = s.days || [0, 1, 2, 3, 4, 5, 6];
  const toggleDay = d => update({ days: days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort() });
  const setStep = (i, patch) => update({ steps: s.steps.map((x, j) => j === i ? { ...x, ...patch } : x) });
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
        <T>פעילה</T>
        <Switch value={s.enabled !== false} onValueChange={v => update({ enabled: v })} />
      </View>
      <Row label="שם"><Field value={s.title} onChangeText={v => update({ title: v })} /></Row>
      <Row label="ימים">
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {DAY_SHORT.map((l, d) => <Chip key={d} label={l} active={days.includes(d)} onPress={() => toggleDay(d)} />)}
        </View>
      </Row>
      {!['routine', 'drive', 'prayer'].includes(s.type) && !s.fill && (
        <Row label="משך (דקות)"><Field value={String(s.minutes ?? '')} keyboardType="number-pad" onChangeText={v => update({ minutes: Number(v) || 0 })} /></Row>
      )}
      {s.at !== undefined || ['camera', 'routine', 'timer'].includes(s.type) ? (
        <Row label="שעה קבועה להתחלה (ריק = בלי)"><Field value={s.at || ''} onChangeText={v => update({ at: v || undefined })} placeholder="HH:MM" /></Row>
      ) : null}
      {s.type === 'drive' && (
        <Row label="להגיע עד (ריק = בלי)"><Field value={s.arriveBy || ''} onChangeText={v => update({ arriveBy: v || undefined })} placeholder="HH:MM" /></Row>
      )}
      {s.type === 'routine' && (
        <Row label="שלבים">
          {s.steps.map((x, i) => (
            <View key={x.id} style={{ flexDirection: 'row', gap: SP.sm, marginBottom: SP.sm, alignItems: 'center' }}>
              <Field value={x.label} onChangeText={v => setStep(i, { label: v })} style={{ flex: 1 }} />
              <Field value={String(x.minutes)} keyboardType="number-pad" style={{ width: 64 }} onChangeText={v => setStep(i, { minutes: Number(v) || 0 })} />
              <IconBtn name="trash" size={34} onPress={() => update({ steps: s.steps.filter((_, j) => j !== i) })} />
            </View>
          ))}
          <Btn title="שלב חדש" icon="plus" kind="line" small onPress={() => update({ steps: [...s.steps, { id: uid('st'), label: 'שלב חדש', minutes: 2 }] })} />
        </Row>
      )}
    </View>
  );
}
