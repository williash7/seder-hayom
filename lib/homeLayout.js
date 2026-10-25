// מה מוצג במסך הבית ("עכשיו") ובאיזה סדר — נשמר ב-settings.homeLayout
export const SECTIONS = [
  { k: 'shortcuts', label: 'קיצורים (נגן ושער)' },
  { k: 'widgets', label: 'וידג׳טים' },
  { k: 'dock', label: 'אפליקציות קבועות (שורה תחתונה)', fixed: true },
];
export const SHORTCUTS = [
  { k: 'back', label: '⏪ אחורה', key: 89 },
  { k: 'play', label: '⏯ הפעל / עצור', key: 85 },
  { k: 'fwd', label: '⏩ קדימה', key: 90 },
  { k: 'gate', label: '🚪 פתח שער' },
];

export function layoutOf(settings) {
  const l = settings.homeLayout || {};
  const known = SECTIONS.map(s => s.k);
  const order = [...(l.order || []).filter(k => known.includes(k)), ...known.filter(k => !(l.order || []).includes(k))];
  return { order, hidden: l.hidden || [], hiddenShortcuts: l.hiddenShortcuts || [] };
}
