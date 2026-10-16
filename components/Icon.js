// אייקונים בקו דק — מצוירים כאן, בלי ספריית אייקונים (וגם בלי expo-font)
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { useT } from '../lib/theme';

const P = {
  sun: <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  drop: <Path d="M12 2.7l5.7 5.6a8 8 0 1 1-11.3 0z" />,
  book: <><Path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" /><Path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" /></>,
  list: <><Line x1="9" y1="6" x2="21" y2="6" /><Line x1="9" y1="12" x2="21" y2="12" /><Line x1="9" y1="18" x2="21" y2="18" /><Polyline points="3 6 4 7 6 5" /><Polyline points="3 12 4 13 6 11" /><Polyline points="3 18 4 19 6 17" /></>,
  box: <><Path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><Path d="M3 8l9 5 9-5M12 13v8" /></>,
  car: <><Path d="M5 17H3v-5l2-5h14l2 5v5h-2" /><Circle cx="7.5" cy="17" r="2" /><Circle cx="16.5" cy="17" r="2" /><Line x1="9.5" y1="17" x2="14.5" y2="17" /><Line x1="3" y1="12" x2="21" y2="12" /></>,
  clock: <><Circle cx="12" cy="12" r="9" /><Polyline points="12 7 12 12 15 14" /></>,
  shul: <><Path d="M3 21h18M5 21V10l7-6 7 6v11" /><Path d="M10 21v-5h4v5" /><Path d="M12 7l1.2 2h-2.4z" /></>,
  print: <><Path d="M6 9V3h12v6" /><Rect x="3" y="9" width="18" height="8" rx="2" /><Rect x="7" y="14" width="10" height="7" /></>,
  camera: <><Path d="M23 7l-7 5 7 5z" /><Rect x="1" y="5" width="15" height="14" rx="2" /></>,
  film: <><Rect x="2" y="3" width="20" height="18" rx="2" /><Path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5M2 12h20" /></>,
  hand: <><Path d="M7 11V5a1.5 1.5 0 0 1 3 0v6M10 10V3.5a1.5 1.5 0 0 1 3 0V10M13 10V4.5a1.5 1.5 0 0 1 3 0V11M16 11V7.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L3 14a1.5 1.5 0 0 1 2.6-1.5L7 14" /></>,
  send: <><Path d="M22 2L11 13" /><Path d="M22 2l-7 20-4-9-9-4z" /></>,
  candle: <><Rect x="9" y="10" width="6" height="12" rx="1" /><Path d="M12 2c1.5 2 2 3.2 2 4.2A2 2 0 0 1 12 8a2 2 0 0 1-2-1.8C10 5.2 10.5 4 12 2z" /></>,
  home: <><Path d="M3 10.5L12 3l9 7.5V21H3z" /><Path d="M9 21v-6h6v6" /></>,
  plus: <><Line x1="12" y1="5" x2="12" y2="19" /><Line x1="5" y1="12" x2="19" y2="12" /></>,
  check: <Polyline points="20 6 9 17 4 12" />,
  x: <><Line x1="18" y1="6" x2="6" y2="18" /><Line x1="6" y1="6" x2="18" y2="18" /></>,
  skip: <><Polyline points="13 17 18 12 13 7" /><Polyline points="6 17 11 12 6 7" /></>,
  back: <Polyline points="9 18 15 12 9 6" />,
  fwd: <Polyline points="15 18 9 12 15 6" />,
  settings: <><Circle cx="12" cy="12" r="3" /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  day: <><Rect x="3" y="4" width="18" height="18" rx="2" /><Line x1="16" y1="2" x2="16" y2="6" /><Line x1="8" y1="2" x2="8" y2="6" /><Line x1="3" y1="10" x2="21" y2="10" /></>,
  now: <><Circle cx="12" cy="12" r="9" /><Circle cx="12" cy="12" r="3" /></>,
  phone: <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />,
  nav: <Path d="M3 11l19-9-9 19-2-8z" />,
  play: <Path d="M6 4l14 8-14 8z" />,
  pause: <><Rect x="6" y="4" width="4" height="16" /><Rect x="14" y="4" width="4" height="16" /></>,
  undo: <><Polyline points="9 14 4 9 9 4" /><Path d="M20 20v-7a4 4 0 0 0-4-4H4" /></>,
  alert: <><Path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><Line x1="12" y1="9" x2="12" y2="13" /><Line x1="12" y1="17" x2="12.01" y2="17" /></>,
  lock: <><Rect x="3" y="11" width="18" height="11" rx="2" /><Path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  trash: <><Polyline points="3 6 5 6 21 6" /><Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" /></>,
  edit: <Path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />,
  minus: <Line x1="5" y1="12" x2="19" y2="12" />,
};

export default function Icon({ name, size = 22, color, stroke = 1.8 }) {
  const t = useT();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || t.ink} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {P[name] || P.now}
    </Svg>
  );
}
