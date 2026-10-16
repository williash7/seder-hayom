// עיצוב — "קלף ולילה": רקע קלף חם, דיו כחול-לילה, זהב כהדגשה.
// בחושך: לילה כחול עמוק עם זהב רך.
import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

export const LIGHT = {
  mode: 'light',
  bg: '#F4EFE6', surface: '#FFFCF6', raised: '#FFFFFF', sunk: '#ECE5D8',
  ink: '#14213D', sub: '#5C6478', faint: '#9298A6', hair: '#E2D9C8',
  gold: '#B98A12', goldSoft: '#F3E6BF', navy: '#14213D', onNavy: '#F4EFE6',
  ok: '#2F7D5B', okSoft: '#DCEFE4', warn: '#B4530A', warnSoft: '#FBE5D2', bad: '#B42318', badSoft: '#FBE0DD',
  ring: '#E7DECD',
};

export const DARK = {
  mode: 'dark',
  bg: '#0C1322', surface: '#141D31', raised: '#1B2640', sunk: '#0A1020',
  ink: '#F1ECE2', sub: '#A3ABBE', faint: '#6C7590', hair: '#25304A',
  gold: '#E2B84B', goldSoft: '#3A3018', navy: '#E2B84B', onNavy: '#0C1322',
  ok: '#5BC08F', okSoft: '#16352A', warn: '#F0A05A', warnSoft: '#3A2614', bad: '#F2756A', badSoft: '#3B1A18',
  ring: '#22304D',
};

export const ThemeCtx = createContext(LIGHT);
export const useT = () => useContext(ThemeCtx);
export const useSystemTheme = () => (useColorScheme() === 'dark' ? DARK : LIGHT);

export const R = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 };
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// טיפוגרפיה — מספרים גדולים, כותרות מודגשות
export const FONT = {
  hero:   { fontSize: 64, fontWeight: '200', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  clock:  { fontSize: 44, fontWeight: '300', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  title:  { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2:     { fontSize: 20, fontWeight: '700' },
  body:   { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyB:  { fontSize: 16, fontWeight: '600' },
  small:  { fontSize: 13, fontWeight: '500' },
  tiny:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  num:    { fontVariant: ['tabular-nums'] },
};
