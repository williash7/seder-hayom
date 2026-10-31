// מסך כלים — וידג׳טים וקיצורי דרך בנפרד מהמשימה הפעילה.
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, SP } from '../lib/theme';
import { T, Btn, Card } from '../components/UI';
import Widgets from '../components/Widgets';
import Shortcuts from '../components/Shortcuts';
import HomeEdit from '../components/HomeEdit';

export default function ToolsScreen({ go }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: SP.xl, paddingTop: ins.top + SP.lg, paddingBottom: ins.bottom + 120 }}
      keyboardShouldPersistTaps="handled">
      <T v="title">כלים וקיצורים</T>
      <T c="sub" style={{ marginTop: SP.sm }}>הווידג׳טים והשליטה באפליקציות נמצאים כאן, בלי להעמיס על מסך ״עכשיו״.</T>
      <Card tone="sunk" style={{ marginTop: SP.lg }}>
        <T v="bodyB">האפליקציות שלי</T>
        <T v="small" c="sub" style={{ marginTop: SP.sm }}>רשימת כל האפליקציות, קיצורים ואפשרויות פתיחה.</T>
        <Btn title="פתח את מסך האפליקציות" kind="line" small style={{ marginTop: SP.md }}
          onPress={() => go('apps')} />
      </Card>
      <Shortcuts />
      <Widgets />
      <HomeEdit />
    </ScrollView>
  );
}
