import { Component, useEffect, useState } from 'react';
import { View, Text, Pressable, I18nManager, ScrollView, Share, BackHandler } from 'react-native';
import * as Native from './lib/native';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeCtx, useSystemTheme, useT, R } from './lib/theme';
import { DayProvider, useDay } from './lib/DayContext';
import { initNotifications, askPermission } from './lib/notify';
import Icon from './components/Icon';
import UpdateButton from './components/UpdateButton';
import NowScreen from './screens/NowScreen';
import DayScreen from './screens/DayScreen';
import SettingsScreen from './screens/SettingsScreen';
import AppsScreen from './screens/AppsScreen';

// עברית מימין לשמאל — נכנס לתוקף מהפתיחה השנייה
try { I18nManager.allowRTL(true); I18nManager.forceRTL(true); } catch {}

const TABS = [
  { k: 'now', icon: 'now', label: 'עכשיו' },
  { k: 'day', icon: 'day', label: 'היום' },
  { k: 'apps', icon: 'grid', label: 'אפליקציות' },
  { k: 'settings', icon: 'settings', label: 'הגדרות' },
];

function TabBar({ tab, setTab }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom: ins.bottom + 12,
      backgroundColor: t.navy, borderRadius: R.pill, flexDirection: 'row', padding: 6,
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
      {TABS.map(x => {
        const on = tab === x.k;
        return (
          <Pressable key={x.k} onPress={() => setTab(x.k)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 6, paddingVertical: 11, borderRadius: R.pill, backgroundColor: on ? t.gold : 'transparent' }}>
            <Icon name={x.icon} size={18} color={on ? '#fff' : t.onNavy} />
            {on && <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{x.label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function Main() {
  const [tab, setTab] = useState('now');
  const { blocked } = useDay();
  // אפליקציה נחסמה — עוברים ל"עכשיו", שם שואלים בשביל מה
  useEffect(() => { if (blocked) setTab('now'); }, [blocked]);
  const t = useT();
  // מסך הבית: "חזור" לא יוצא מהאפליקציה — חוזר ל"עכשיו"
  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => { setTab('now'); return true; });
    return () => h.remove();
  }, []);
  useEffect(() => {
    // אתחול התראות אחרי שהמסך עלה — לא בזמן import
    const h = setTimeout(async () => { await initNotifications(); await askPermission(); }, 600);
    return () => clearTimeout(h);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      {!I18nManager.isRTL && (
        <View style={{ backgroundColor: t.goldSoft, padding: 12, paddingTop: 48 }}>
          <Text style={{ color: t.ink, textAlign: 'center', fontWeight: '700' }}>
            פתיחה ראשונה: לסגור את האפליקציה לגמרי ולפתוח שוב, כדי שהיא תוצג מימין לשמאל
          </Text>
        </View>
      )}
      {tab === 'now' && <NowScreen go={setTab} />}
      {tab === 'day' && <DayScreen go={setTab} />}
      {tab === 'settings' && <SettingsScreen go={setTab} />}
      {tab === 'apps' && <AppsScreen />}
      <UpdateButton />
      <TabBar tab={tab} setTab={setTab} />
    </View>
  );
}

class Boundary extends Component {
  state = { err: null, recovering: false, recoveryError: '' };
  recover = async () => {
    this.setState({ recovering: true, recoveryError: '' });
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      this.setState({ recovering: false, recoveryError: String(e?.message || e) });
    }
  };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = String(this.state.err?.stack || this.state.err);
    return (
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>משהו נשבר</Text>
        <Text style={{ marginTop: 8 }}>אפשר לשלוח את השגיאה ל-ChatGPT:</Text>
        <Pressable onPress={this.recover} disabled={this.state.recovering} style={{ marginTop: 16, padding: 14, backgroundColor: '#14213D', borderRadius: 999 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{this.state.recovering ? 'בודק ומתקין עדכון…' : 'בדוק עדכון ושחזר אפליקציה'}</Text></Pressable>
        {!!this.state.recoveryError && <Text selectable style={{ marginTop: 8, color: '#b45309' }}>{this.state.recoveryError}</Text>}
        <Pressable onPress={() => Share.share({ message: msg })} style={{ marginTop: 16, padding: 14, backgroundColor: '#14213D', borderRadius: 999 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>שתף שגיאה</Text>
        </Pressable>
        <Pressable onPress={() => Native.openHomeSettings()} style={{ marginTop: 10, padding: 14, borderWidth: 1, borderColor: '#14213D', borderRadius: 999 }}>
          <Text style={{ textAlign: 'center', fontWeight: '700' }}>חירום: לבחור מסך בית אחר</Text>
        </Pressable>
        <Pressable onPress={() => this.setState({ err: null })} style={{ marginTop: 10, padding: 14 }}>
          <Text style={{ textAlign: 'center' }}>נסה שוב</Text>
        </Pressable>
        <Text selectable style={{ marginTop: 16, fontSize: 11, color: '#666' }}>{msg}</Text>
      </ScrollView>
    );
  }
}

export default function App() {
  const theme = useSystemTheme();
  return (
    <SafeAreaProvider>
      <ThemeCtx.Provider value={theme}>
        <Boundary>
          <DayProvider>
            <Main />
          </DayProvider>
        </Boundary>
      </ThemeCtx.Provider>
    </SafeAreaProvider>
  );
}
