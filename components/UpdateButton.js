// כפתור קבוע בצד המסך: לבקש שינוי מ-Claude, או להתקין גרסה חדשה.
// בודק ב-GitHub אם יש בנייה חדשה יותר מזו שמותקנת, ומסמן בנקודה.
import { useEffect, useState } from 'react';
import { View, Pressable, Linking, Alert } from 'react-native';
import * as Application from 'expo-application';
import { useT, SP } from '../lib/theme';
import { useDay } from '../lib/DayContext';
import { T, Btn, Sheet } from './UI';
import Icon from './Icon';

export const CHAT_URL = 'https://claude.ai/code/session_01U1eHQ7BU1KYHY9NWunHXgv';
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

  const go = url => Linking.openURL(url).catch(e => Alert.alert('לא נפתח', String(e?.message || e)));

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10}
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
          {hasNew && <Btn title="להתקין את הגרסה החדשה" icon="fwd" kind="gold" onPress={() => go(RELEASES)} />}
          <Btn title="לבקש שינוי מ-Claude" icon="edit" kind={hasNew ? 'line' : 'primary'}
            onPress={() => go(settings.chatUrl || CHAT_URL)} />
          {!hasNew && <Btn title="לכל הגרסאות" kind="ghost" small onPress={() => go(RELEASES)} />}
        </View>
      </Sheet>
    </>
  );
}
