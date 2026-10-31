import { Component, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, I18nManager, ScrollView, Share, BackHandler, PanResponder } from 'react-native';
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
import ToolsScreen from './screens/ToolsScreen';

// עברית מימין לשמאל — נכנס לתוקף מהפתיחה השנייה
try { I18nManager.allowRTL(true); I18nManager.forceRTL(true); } catch {}

const TABS = [
  { k: 'now', icon: 'now', label: 'עכשיו' },
  { k: 'tools', icon: 'box', label: 'כלים' },
  { k: 'day', icon: 'day', label: 'היום' },
  { k: 'apps', icon: 'grid', label: 'אפליקציות' },
  { k: 'settings', icon: 'settings', label: 'הגדרות' },
];

function TabBar({ tab, setTab }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 14, right: 14, bottom: ins.bottom + 10,
      backgroundColor: t.navy, borderRadius: 28, flexDirection: 'row', padding: 5,
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
      {TABS.map(x => {
        const on = tab === x.k;
        return (
          <Pressable key={x.k} onPress={() => setTab(x.k)}
            accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ flex: 1, minWidth: 0, height: 56, alignItems: 'center', justifyContent: 'center',
              gap: 2, borderRadius: 23, backgroundColor: on ? t.gold : 'transparent',
              opacity: pressed ? 0.7 : 1 })}>
            <Icon name={x.icon} size={21} color={on ? '#fff' : t.onNavy} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
              style={{ color: on ? '#fff' : t.onNavy, fontWeight: on ? '800' : '600',
                fontSize: 11, textAlign: 'center', includeFontPadding: false }}>
              {x.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Main() {
  const [tab, setTab] = useState('now');
  const tabRef = useRef(tab);
  tabRef.current = tab;
  // Swipe horizontally across pages; vertical ScrollViews remain in control of vertical gestures.
  // On an RTL layout, swiping left from the home screen opens the next tab (כלים).
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) =>
      Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderTerminationRequest: () => true,
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) < 65 || Math.abs(g.dx) < Math.abs(g.dy) * 1.5) return;
      const current = TABS.findIndex(x => x.k === tabRef.current);
      const next = current + (g.dx < 0 ? 1 : -1);
      if (next >= 0 && next < TABS.length) setTab(TABS[next].k);
    },
  })).current;
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
    <View style={{ flex: 1, backgroundColor: t.bg }} {...swipe.panHandlers}>
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
      {tab === 'tools' && <ToolsScreen go={setTab} />}
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
