// עזרי זמן — הכל בדקות מחצות ("HH:MM" ↔ מספר)

export const pad = n => String(n).padStart(2, '0');

export const toMin = t => {
  if (typeof t === 'number') return t;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ''));
  return m ? +m[1] * 60 + +m[2] : null;
};

export const toTime = m => {
  if (m == null || isNaN(m)) return '';
  const v = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`;
};

export const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Date של היום בשעה "HH:MM" */
export const atTime = (hhmm, base = new Date()) => {
  const m = toMin(hhmm);
  if (m == null) return null;
  const d = new Date(base);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
};

export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

/** "12 דק׳" / "1:05 ש׳" */
export function fmtDur(min) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}:${pad(r)} ש׳` : `${h} ש׳`;
}

/** ספירה לאחור "MM:SS" או "H:MM:SS" */
export function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

export const uid = (p = 'x') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
