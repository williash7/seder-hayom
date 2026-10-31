import { Component, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, I18nManager, ScrollView, Share, BackHandler, PanResponder, Animated, useWindowDimensions } from 'react-native';
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
  const t = useT();
  const { width } = useWindowDimensions();
  const widthRef = useRef(width);
  widthRef.current = width;
  const [tab, setTab] = useState('now');
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const [incoming, setIncoming] = useState(null);
  const incomingRef = useRef(null);
  const signRef = useRef(0);
  const movingRef = useRef(false);
  const offset = useRef(new Animated.Value(0)).current;

  // Incoming page starts opposite to the direction of travel.
  // Both pages are mounted during a gesture so the neighboring page visibly
  // follows the finger. The bottom navigation and its controls stay stationary.
  const finish = target => {
    const next = incomingRef.current;
    if (!next || movingRef.current) return;
    movingRef.current = true;
    Animated.timing(offset, {
      toValue: target ? signRef.current * widthRef.current : 0,
      duration: target ? 180 : 150,
      useNativeDriver: true,
    }).start(() => {
      if (target) {
        tabRef.current = next;
        setTab(next);
      }
      offset.setValue(0);
      incomingRef.current = null;
      signRef.current = 0;
      setIncoming(null);
      movingRef.current = false;
    });
  };
  const navigate = next => {
    if (movingRef.current || incomingRef.current || next === tabRef.current ||
        !TABS.some(x => x.k === next)) return;
    const before = TABS.findIndex(x => x.k === tabRef.current);
    const after = TABS.findIndex(x => x.k === next);
    signRef.current = after > before ? -1 : 1;
    incomingRef.current = next;
    setIncoming(next);
    offset.setValue(0);
    finish(true);
  };
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      !movingRef.current && Math.abs(g.dx) > 22 && Math.abs(g.dx) > Math.abs(g.dy) * 1.7,
    onPanResponderTerminationRequest: () => true,
    onPanResponderMove: (_, g) => {
      if (movingRef.current) return;
      const sign = g.dx < 0 ? -1 : 1;
      if (!incomingRef.current) {
        const i = TABS.findIndex(x => x.k === tabRef.current);
        const neighbor = TABS[i + (sign < 0 ? 1 : -1)];
        if (!neighbor) return;
        signRef.current = sign;
        incomingRef.current = neighbor.k;
        setIncoming(neighbor.k);
      }
      // Do not reverse direction mid-gesture or attempt to drag beyond a tab edge.
      if (sign === signRef.current) offset.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (!incomingRef.current) return;
      const forward = g.dx * signRef.current > 0 &&
        (Math.abs(g.dx) > widthRef.current * 0.22 || Math.abs(g.vx) > 0.45);
      finish(forward);
    },
    onPanResponderTerminate: () => {
      if (incomingRef.current) finish(false);
    },
  })).current;
  const { blocked } = useDay();
  useEffect(() => { if (blocked) navigateRef.current('now'); }, [blocked]);
  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      navigateRef.current('now');
      return true;
    });
    return () => h.remove();
  }, []);
  useEffect(() => {
    const h = setTimeout(async () => { await initNotifications(); await askPermission(); }, 600);
    return () => clearTimeout(h);
  }, []);

  const screen = key => {
    switch (key) {
      case 'now': return <NowScreen go={navigate} />;
      case 'tools': return <ToolsScreen go={navigate} />;
      case 'day': return <DayScreen go={navigate} />;
      case 'apps': return <AppsScreen />;
      case 'settings': return <SettingsScreen />;
      default: return null;
    }
  };
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
      <View style={{ flex: 1, overflow: 'hidden' }} {...swipe.panHandlers}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: offset }] }}>
          {screen(tab)}
        </Animated.View>
        {incoming && (
          <Animated.View pointerEvents="none" style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: width,
            backgroundColor: t.bg,
            transform: [{ translateX: Animated.add(offset, -signRef.current * width) }],
          }}>
            {screen(incoming)}
          </Animated.View>
        )}
      </View>
      <UpdateButton />
      <TabBar tab={incoming || tab} setTab={navigate} />
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
