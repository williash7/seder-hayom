// מצרכים לכריכים — מסמנים בערב שלפני (או בבוקר אם לא סומן). נשמר לפי תאריך היעד.
import AsyncStorage from '@react-native-async-storage/async-storage';

const key = d => 'supplies_' + d;
export async function loadSupplies(d) {
  try { return JSON.parse(await AsyncStorage.getItem(key(d)) || '{}'); } catch { return {}; }
}
export async function saveSupplies(d, v) {
  try { await AsyncStorage.setItem(key(d), JSON.stringify(v)); } catch {}
}

/** תפריט הכריכים ליום בשבוע: [{ kid, items: [...] }] */
export function menuFor(settings, dow) {
  const m = settings.sandwichMenu || {};
  const day = m.days?.[dow] || {};
  return (m.kids || []).map(kid => ({ kid, items: (day[kid] || []).filter(Boolean) })).filter(x => x.items.length);
}
