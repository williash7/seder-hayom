/**
 * סדר היום — חיבור לגיליון ההתרמה
 * ────────────────────────────────────────────────
 * מחזיר לאפליקציה את רשימת האנשים להתקשר אליהם מהלשונית "אנשי קשר חדש".
 * קריאה בלבד — הסקריפט לא כותב שום דבר לגיליון.
 *
 * התקנה (פעם אחת, מהמחשב):
 *  1. בגיליון: הרחבות ← Apps Script
 *  2. למחוק את מה שיש ולהדביק את כל הקובץ הזה ← שמירה
 *  3. פריסה ← פריסה חדשה ← סוג: אפליקציית אינטרנט
 *     ביצוע בתור: אני · למי יש גישה: כל אחד
 *  4. לאשר הרשאות, להעתיק את כתובת ה-URL שמסתיימת ב-/exec
 *  5. באפליקציה: הגדרות ← התרמה ← להדביק את הכתובת
 *
 * הכתובת עצמה היא הסיסמה — לא לשתף אותה.
 */

const SPREADSHEET_ID = '1FRoh_zkJ-OH1wFOlsB-AyW5jAeWVhzrSzn0qX3dyevQ';
const SHEET_NAME = 'אנשי קשר חדש';

function doGet(e) {
  const p = (e && e.parameter) || {};
  let out;
  try {
    if (p.action === 'ping') out = { ok: true, sheet: SHEET_NAME };
    else out = list_();
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('לא נמצאה הלשונית "' + SHEET_NAME + '"');
  return sh;
}

/** מוצא את שורת הכותרות (זו שיש בה "שם") ומחזיר מפה: כותרת ← מספר עמודה */
function header_(sh) {
  const top = sh.getRange(1, 1, 8, sh.getLastColumn()).getDisplayValues();
  for (let r = 0; r < top.length; r++) {
    const row = top[r].map(function (x) { return String(x).trim(); });
    if (row.indexOf('שם') >= 0) {
      const map = {};
      row.forEach(function (h, i) { if (h && map[h] === undefined) map[h] = i + 1; }); // המופע הראשון
      return { row: r + 1, map: map };
    }
  }
  throw new Error('לא נמצאה שורת כותרות עם "שם"');
}

function list_() {
  const sh = sheet_();
  const h = header_(sh);
  const last = sh.getLastRow();
  if (last <= h.row) return { ok: true, people: [] };
  const vals = sh.getRange(h.row + 1, 1, last - h.row, sh.getLastColumn()).getDisplayValues();
  const col = function (row, name) { const c = h.map[name]; return c ? String(row[c - 1] || '').trim() : ''; };
  const people = [];
  vals.forEach(function (row, i) {
    const name = col(row, 'שם');
    if (!name) return;
    people.push({
      row: h.row + 1 + i,
      name: name,
      phone: col(row, 'טלפון'),
      source: col(row, 'מקור'),
      potential: col(row, 'פוטנציאל תרומה'),
      forecast: col(row, 'צפי 2026'),
      cash: col(row, 'כסף ביד 2026'),
      status: col(row, 'סטטוס'),
      note: col(row, 'הערות'),
      history: [col(row, 'כסף ביד 2025'), col(row, 'תרומה 24'), col(row, 'תרומה 23'), col(row, 'תרומה 22')],
    });
  });
  return { ok: true, people: people, statuses: statuses_() };
}

function statuses_() {
  const s = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Sheet12');
  if (!s) return ['לנסות שוב', 'לחזור אליו', 'תורם', 'לא תורם', 'נשלח לינק', 'לשלוח לינק'];
  return s.getRange(1, 1, s.getLastRow(), 1).getDisplayValues().map(function (r) { return String(r[0]).trim(); }).filter(String);
}
