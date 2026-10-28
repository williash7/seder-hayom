// כפתור קבוע בצד המסך: לבקש שינוי ב-ChatGPT, או להתקין גרסה חדשה.
// בודק ב-GitHub אם יש בנייה חדשה יותר מזו שמותקנת, ומסמן בנקודה.
import { useEffect, useState } from 'react';
import { View, Pressable, Linking, Alert, Image } from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { useT, SP } from '../lib/theme';
import { useDay } from '../lib/DayContext';
import { T, Btn, Sheet } from './UI';
import Icon from './Icon';

export const CHAT_URL = 'https://chatgpt.com/c/6ae1c356-9134-83eb-bb01-007de5a92dd4';
const REPO = 'williash7/seder-hayom';
const RELEASES = `https://github.com/${REPO}/releases/latest`;

async function latestBuild() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
    const j = await r.json();
    const n = Number(String(j.tag_name || '').replace(/\D/g, ''));
    return n || null;
  } catch { return null; }
}

export default function UpdateButton() {
  const t = useT();
  const { settings } = useDay();
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState(null);
  const installed = Number(Application.nativeBuildVersion) || 0;
  const hasNew = latest != null && latest > installed;

  useEffect(() => {
    latestBuild().then(setLatest);
    const iv = setInterval(() => latestBuild().then(setLatest), 30 * 60000);
    return () => clearInterval(iv);
  }, []);

  const [ota, setOta] = useState('');
  const checkOta = async () => {
    try {
      setOta('בודק…');
      const r = await Updates.checkForUpdateAsync();
      if (!r.isAvailable) { setOta('אין עדכון מהיר חדש ✓'); return; }
      setOta('מוריד עדכון…');
      await Updates.fetchUpdateAsync();
      setOta('מתעדכן…');
      await Updates.reloadAsync();
    } catch (e) { setOta('לא הצלחתי לבדוק: ' + String(e?.message || e)); }
  };

  // טעינה מחדש של קוד האפליקציה מהעדכון המותקן, בלי למחוק נתונים.
  const restartApp = async () => {
    try {
      setOta('מפעיל מחדש…');
      await Updates.reloadAsync();
    } catch (e) {
      setOta('לא ניתן להפעיל מחדש: ' + String(e?.message || e));
      Alert.alert('ההפעלה מחדש נכשלה', 'אפשר לסגור את האפליקציה מרשימת האפליקציות הפתוחות ולפתוח אותה מחדש.');
    }
  };

  const [shot, setShot] = useState(null);
  const [shotMsg, setShotMsg] = useState('');
  const press = async () => {
    // צילום המסך כמו שהוא עכשיו — לפני שהחלון נפתח
    try { setShot(await captureScreen({ format: 'jpg', quality: 0.85, result: 'tmpfile' })); } catch { setShot(null); }
    setShotMsg('');
    setOpen(true);
  };
  const sendToChatGPT = async () => {
    if (shot) {
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (perm.granted) { await MediaLibrary.saveToLibraryAsync(shot); setShotMsg('הצילום נשמר בגלריה — בשיחה לוחצים + ובוחרים אותו'); }
      } catch {}
    }
    setTimeout(() => go(CHAT_URL), shot ? 900 : 0);
  };
  const shareShot = async () => {
    try { await Sharing.shareAsync(shot, { mimeType: 'image/jpeg', dialogTitle: 'שליחת צילום מסך' }); }
    catch (e) { Alert.alert('לא הצלחתי לשתף', String(e?.message || e)); }
  };

  const go = url => Linking.openURL(url).catch(e => Alert.alert('לא נפתח', String(e?.message || e)));

  return (
    <>
      <Pressable onPress={press} hitSlop={10}
        style={({ pressed }) => ({
          position: 'absolute', left: 0, top: '42%',
          backgroundColor: hasNew ? t.gold : t.navy, opacity: pressed ? 0.7 : 0.9,
          paddingVertical: 14, paddingLeft: 6, paddingRight: 8,
          borderTopRightRadius: 14, borderBottomRightRadius: 14,
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 6,
        })}>
        <Icon name="edit" size={18} color={hasNew ? '#fff' : t.onNavy} />
        {hasNew && <View style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: t.bad }} />}
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="עדכון האפליקציה">
        <View style={{ gap: SP.md }}>
          <T c="sub">
            {hasNew ? `יש גרסה חדשה מוכנה (בנייה ${latest}). מותקנת אצלך בנייה ${installed}.`
              : `מותקנת בנייה ${installed || '—'}${latest ? ' — זו האחרונה' : ''}.`}
          </T>
          <Btn title="בדוק עדכון מהיר" icon="undo" kind="line" onPress={checkOta} />
          <Btn title="הפעל מחדש את האפליקציה" icon="undo" kind="line" onPress={restartApp} />
          {!!ota && <T v="small" c="sub">{ota}</T>}
          {hasNew && <Btn title="להתקין את הגרסה החדשה" icon="fwd" kind="gold" onPress={() => go(RELEASES)} />}
          {!!shot && (
            <View style={{ flexDirection: 'row', gap: SP.md, alignItems: 'center' }}>
              <Image source={{ uri: shot }} style={{ width: 72, height: 150, borderRadius: 10, backgroundColor: t.sunk }} resizeMode="cover" />
              <T v="small" c="sub" style={{ flex: 1 }}>צילום של המסך שהיה פתוח — יישמר בגלריה כדי לצרף לבקשה</T>
            </View>
          )}
          <Btn title={shot ? 'לבקש שינוי ב-ChatGPT + צילום' : 'לבקש שינוי ב-ChatGPT'} icon="edit" kind={hasNew ? 'line' : 'primary'}
            onPress={sendToChatGPT} />
          {!!shotMsg && <T v="small" style={{ color: t.ok }}>{shotMsg}</T>}
          {!!shot && <Btn title="לשתף את הצילום" icon="send" kind="ghost" small onPress={shareShot} />}
          {!hasNew && <Btn title="לכל הגרסאות" kind="ghost" small onPress={() => go(RELEASES)} />}
        </View>
      </Sheet>
    </>
  );
}
