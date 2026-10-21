// "כבר עשיתי…" — האפליקציה לא ידעה שכבר עשיתי דברים: בוחרים עד איפה הגעתי, והכל עד שם מסומן כבוצע
import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useDay } from '../lib/DayContext';
import { useT, SP } from '../lib/theme';
import { T, Sheet } from './UI';
import Icon from './Icon';
import { toTime } from '../lib/time';

export default function CatchUp() {
  const t = useT();
  const { plan, actions } = useDay();
  const [open, setOpen] = useState(false);
  if (plan.currentIndex < 0) return null;
  const next = plan.list.slice(plan.currentIndex).filter(x => !['done', 'skipped', 'auto'].includes(x.status)).slice(0, 10);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ alignSelf: 'center', paddingVertical: 8 }}>
        <T v="small" c="sub">כבר עשיתי את זה ועוד? לעדכן</T>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="עד איפה כבר הגעתי?">
        <T v="small" c="sub" style={{ marginBottom: SP.sm }}>לוחצים על הדבר האחרון שכבר עשית — הוא וכל מה שלפניו יסומנו כבוצעים.</T>
        {next.map(x => (
          <Pressable key={x.id} onPress={() => { actions.markDone(x.id, { upTo: true }); setOpen(false); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: 12, borderBottomWidth: 1, borderColor: t.hair }}>
            <T v="small" c="sub" style={{ width: 46 }}>{toTime(x.plannedStart)}</T>
            <Icon name={x.icon} size={18} color={t.sub} />
            <T v="bodyB" style={{ flex: 1 }}>{x.title}</T>
            <Icon name="check" size={18} color={t.ok} />
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}
