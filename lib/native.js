// גישה למודול האנדרואיד (modules/seder-native). אם הוא חסר — כל הפעולות שקטות.
import Native from '../modules/seder-native';
import { requireNativeViewManager } from 'expo-modules-core';

const safe = (fn, fallback) => (...a) => {
  try { return Native ? fn(...a) : fallback; } catch (e) { console.warn('native', e); return fallback; }
};

export const hasNative = !!Native;

export const scheduleAlarm = safe((atMs, title, body) => Native.scheduleAlarm(atMs, title, body));
export const cancelAlarm = safe(() => Native.cancelAlarm());
export const stopRinging = safe(() => Native.stopRinging());
export const consumeWoke = safe(() => Native.consumeWoke(), 0);
export const canExactAlarm = safe(() => Native.canExactAlarm(), true);
export const openExactAlarmSettings = safe(() => Native.openExactAlarmSettings());
export const canFullScreen = safe(() => Native.canFullScreen(), true);
export const openFullScreenSettings = safe(() => Native.openFullScreenSettings());

export const setLock = safe((active, fromMs, untilMs, allowed) => Native.setLock(!!active, fromMs || 0, untilMs || 0, allowed || []));
export const unlockFor = safe(min => Native.unlockFor(min));
export const isLockServiceOn = safe(() => Native.isLockServiceOn(), false);
export const openAccessibilitySettings = safe(() => Native.openAccessibilitySettings());
export const consumeBlocked = safe(() => Native.consumeBlocked(), '');
export const appLabel = safe(pkg => Native.appLabel(pkg), '');
export const openPackage = safe(pkg => Native.openPackage(pkg), false);
export const usageSince = safe(ms => Native.usageSince(ms), []);

// מסך הבית
export const isDefaultHome = safe(() => Native.isDefaultHome(), false);
export const openHomeSettings = safe(() => Native.openHomeSettings());
// זורק שגיאה (כדי שאפשר יהיה להציג אותה)
export const listApps = async (withIcons = true) => (Native ? await Native.listApps(!!withIcons) : []);

// וידג'טים של אפליקציות אחרות (מוצגים בתוך סדר היום)
export const listWidgetProviders = async () => (Native ? await Native.listWidgetProviders() : []);
export const allocateWidget = safe(p => Native.allocateWidget(p), null);
export const widgetState = safe(id => Native.widgetState(id), { bound: false, configure: false, h: 0 });
export const configureWidget = safe(id => Native.configureWidget(id));
export const deleteWidget = safe(id => Native.deleteWidget(id));
export const WidgetView = (() => { try { return Native ? requireNativeViewManager('SederNative') : null; } catch { return null; } })();
