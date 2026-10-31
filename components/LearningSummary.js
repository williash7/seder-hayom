// מצב לימוד יומי המסונכרן מאפליקציית לימוד יומי.
import { useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { useT, SP, R } from '../lib/theme';
import { T, Btn } from './UI';

const dateKeyLocal = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');

// חלון לימוד יומי — מסך הבית מציג רק נתונים שאפליקציית הלימוד באמת סינכרנה.
// אחוז ההתקדמות מחושב רק עבור הפריטים שעדיין נכללים בסנכרון,
// ואינו מוצג כאחוז סיום של כל הלימודים ביום.
export default function LearningSummary({ data, settings, plan, state }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const today = new Date();
  const key = dateKeyLocal(today);
  const current = data?.date === key ? data : null;
  const items = Array.isArray(current?.remaining) ? current.remaining : [];
  const minutes = items.reduce((n,u) => n + Math.max(0, Number(u.minutes) || 0), 0);
  const itemCount = items.length;
  const average = itemCount ? Math.round(items.reduce((sum,u) => sum + Math.max(0,Math.min(100,Number(u.pct)||0)),0) / itemCount) : 100;
  const finished = current && itemCount === 0;
  const syncedAt = current?.at ? new Date(current.at).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}) : '';
  const nextAt = plan?.nextAnchor?.time;
  const timeNow = today.getHours() * 60 + today.getMinutes();
  const freeUntilAnchor = Number.isFinite(nextAt) ? Math.max(1, Math.floor(nextAt - timeNow)) : null;
  const target = Math.max(1, Math.min(180, Math.round(plan?.current?.type === 'study'
    ? Math.max(1, plan.current.plannedEnd - timeNow)
    : (freeUntilAnchor == null ? 10 : Math.min(10, freeUntilAnchor)))));
  const url = (settings.apps?.limud?.url || 'https://williash7.github.io/hoshana-raba/').replace(/\/$/,'');
  const completed = (settings.stations||[]).filter(st=>st.type==='prayer'
    && ['shacharit','mincha','maariv','shema'].includes(st.prayer)
    && state?.stations?.[st.id]?.status==='done').map(st=>st.prayer);
  const query = '&markDay='+key+'&markPrayers='+[...new Set(completed)].join(',');
  const open = () => Linking.openURL(url+'/index.html?go=1&min='+target+query).catch(()=>{});
  const sync = () => Linking.openURL(url+'/index.html?fromSeder=1'+query).catch(()=>{});
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: R.lg, padding: SP.md, marginTop: SP.md, marginBottom: SP.md, borderWidth: 1, borderColor: t.hair }}>
      <Pressable onPress={() => setExpanded(v => !v)}
        accessibilityRole="button" accessibilityLabel={expanded ? 'צמצם פרטי הלימוד' : 'הרחב פרטי הלימוד'}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SP.sm }}>
        <View style={{ flex: 1 }}>
          <T v="bodyB">📖 הלימוד היומי</T>
          <T v="tiny" c="sub" style={{ marginTop: 3 }}>{!current ? 'דרוש סנכרון כדי לראות את המצב' : finished ? 'כל הפריטים שסונכרנו הושלמו ✓' : itemCount + ' נושאים שנותרו · לפי הסנכרון האחרון'}</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T v="h2" style={{ color: t.ink }}>{current ? minutes + ' דק׳' : '—'}</T>
          <T v="tiny" c="sub">{expanded ? 'צמצם ⌃' : 'פירוט ⌄'}</T>
        </View>
      </Pressable>
      {current && !finished && <>
        <View style={{ height: 8, borderRadius: 6, overflow: 'hidden', backgroundColor: t.sunk, marginTop: SP.md }}>
          <View style={{ width: average+'%', height: '100%', backgroundColor: t.gold, borderRadius: 6 }} />
        </View>
        <T v="tiny" c="sub" style={{ marginTop: 5 }}>התקדמות ממוצעת בנושאים שנותרו: {average}% · לא אחוז מכל הלימוד היומי</T>
      </>}
      {expanded && <>
        {current ? <>
          {finished ? <T v="small" style={{ marginTop: SP.md, color: t.ok }}>אין לימודים שנותרו ברשימה שסונכרנה היום.</T> :
            items.map((u,i) => (
              <View key={u.id+':'+i} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.hair, flexDirection: 'row', alignItems: 'center', gap: SP.sm }}>
                <View style={{ flex: 1 }}>
                  <T v="small">{u.name}</T>
                  <View style={{ backgroundColor: t.sunk, borderRadius: 5, height: 5, marginTop: 5, overflow: 'hidden' }}>
                    <View style={{ backgroundColor: t.gold, width: Math.max(0,Math.min(100,Number(u.pct)||0))+'%', height: 5 }} />
                  </View>
                </View>
                <T v="tiny" c="sub" style={{ minWidth: 78, textAlign: 'left' }}>{Math.round(Number(u.pct)||0)}% · {Math.ceil(Number(u.minutes)||0)} דק׳</T>
              </View>
            ))
          }
          <T v="tiny" c="sub" style={{ marginTop: SP.sm }}>עודכן לאחרונה ב־{syncedAt}. הנתונים משתנים אחרי סנכרון עם לימוד יומי.</T>
        </> : <T v="small" c="sub" style={{ marginTop: SP.md }}>פתח את אפליקציית הלימוד לסנכרון ראשון היום, כדי לקבל את הנושאים, הזמנים וההתקדמות.</T>}
      </>}
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap: SP.sm, marginTop: SP.md }}>
        <Btn small kind="gold" title={'ללמוד '+target+' דקות'} onPress={open} />
        <Btn small kind="line" title="עדכון נתונים" onPress={sync} />
      </View>
    </View>
  );
}

