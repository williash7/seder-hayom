// גישה למודול האנדרואיד (modules/seder-native). אם הוא חסר — כל הפעולות שקטות.
import Native from '../modules/seder-native';

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
export const listApps = async (withIcons = true) => { try { return Native ? await Native.listApps(withIcons) : []; } catch (e) { console.warn('native', e); return []; } };
