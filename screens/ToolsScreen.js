// מסך כלים — וידג׳טים וקיצורי דרך בנפרד מהמשימה הפעילה.
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, SP } from '../lib/theme';
import { T, Btn, Card } from '../components/UI';
import Widgets from '../components/Widgets';
import Shortcuts from '../components/Shortcuts';
import HomeEdit from '../components/HomeEdit';
import LearningSummary from '../components/LearningSummary';
import KesherCard from '../components/KesherCard';
import { useDay } from '../lib/DayContext';

export default function ToolsScreen({ go }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  const { learnSync, settings, plan, state } = useDay();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: SP.xl, paddingTop: ins.top + SP.lg, paddingBottom: ins.bottom + 120 }}
      keyboardShouldPersistTaps="handled">
      <T v="title">החלונות שלי</T>
      <T c="sub" style={{ marginTop: SP.sm }}>לימוד, קשר, וידג׳טים וקיצורים — כל המידע במקום אחד.</T>
      <LearningSummary data={learnSync} settings={settings} plan={plan} state={state} />
      <KesherCard />
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
