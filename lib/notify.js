// התראות: שעון מעורר, תזכורות לעוגנים, סוף טיימר, סגירת יום
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { toMin, toTime, atTime, addDays } from './time';
import { stationsForDay } from './engine';

let ready = false;

export async function initNotifications() {
  if (ready) return;
  ready = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
        shouldShowBanner: true, shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarm', {
        name: 'שעון מעורר',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 800, 400, 800, 400, 800],
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('stations', {
        name: 'תחנות היום',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 300, 200, 300],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('close', {
        name: 'סגירת יום',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
  } catch (e) { console.warn('notif init', e); }
}

export async function askPermission() {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const r = await Notifications.requestPermissionsAsync();
    return r.granted;
  } catch { return false; }
}

async function at(date, channelId, title, body, data = {}) {
  if (!date || date.getTime() < Date.now() + 5000) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default', priority: 'max' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId },
  });
}

/**
 * מתזמן מחדש את כל ההתראות לפי התכנית החיה.
 * plan — מ-planDay. dayDate — תאריך היום הפעיל.
 */
export async function reschedule({ settings, plan, dayDate, state }) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const woke = state?.stations?.wake?.status === 'done';

    // 1. שעון מעורר — היום (אם עוד לא קמת) ומחר
    const alarmDays = [];
    if (!woke) alarmDays.push(dayDate);
    alarmDays.push(addDays(dayDate, 1));
    for (const d of alarmDays) {
      const hasWake = stationsForDay(settings, d).some(s => s.type === 'wake');
      if (!hasWake) continue;
      const base = atTime(settings.wakeTime, d);
      const { repeatEveryMin = 2, repeatCount = 15 } = settings.alarm || {};
      for (let i = 0; i < repeatCount; i++) {
        await at(new Date(base.getTime() + i * repeatEveryMin * 60000), 'alarm',
          i === 0 ? 'בוקר טוב ☀️ מודה אני' : 'עוד לא קמת?',
          'לחץ "קמתי" באפליקציה כדי להתחיל את היום', { kind: 'alarm' });
      }
    }

    if (!plan || plan.empty || plan.finished) return;

    // 2. תזכורת 10 דקות לפני כל עוגן קשיח, ובשעת העוגן
    for (const s of plan.list) {
      if (s.status === 'done' || s.status === 'skipped' || !s.anchor?.hard) continue;
      const t = s.anchor.start;
      await at(atTime(toTime(t - 10), dayDate), 'stations', `בעוד 10 דק׳: ${s.title}`,
        s.anchor.endAt != null ? `צריך לצאת ב-${toTime(t)}` : `מתחיל ב-${toTime(t)}`, { station: s.id });
      await at(atTime(toTime(t), dayDate), 'stations', s.title,
        s.anchor.endAt != null ? 'זמן לצאת' : 'הגיע הזמן', { station: s.id });
    }

    // 3. סוף הטיימר של התחנה הנוכחית
    const c = plan.current;
    if (c && c.rec?.start != null && c.duration > 0 && !['wake', 'sleep', 'close'].includes(c.type)) {
      await at(atTime(toTime(c.plannedEnd), dayDate), 'stations', `נגמר הזמן: ${c.title}`,
        'עוברים לתחנה הבאה?', { station: c.id });
    }

    // 4. סגירת יום — כל רבע שעה
    if (!state?.closed) {
      const { firstReminder = '22:45', every = 15, hardClose = '23:45' } = settings.dayClose || {};
      for (let m = toMin(firstReminder); m <= toMin(hardClose); m += every) {
        const last = m >= toMin(hardClose);
        await at(atTime(toTime(m), dayDate), 'close', last ? 'היום נסגר 🌙' : 'סגירת יום',
          last ? 'קריאת שמע שעל המיטה ולישון' : 'הגיע הזמן לסגור את היום', { kind: 'close' });
      }
    }
  } catch (e) { console.warn('reschedule', e); }
}

export async function cancelAlarms() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content?.data?.kind === 'alarm') {
        const d = n.trigger?.value ?? n.trigger?.date;
        if (d && new Date(d).toDateString() === new Date().toDateString())
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    await Notifications.dismissAllNotificationsAsync();
  } catch {}
}
