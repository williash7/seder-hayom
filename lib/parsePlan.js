// מתרגם משפט בעברית (מוקלד או מוכתב) לרצף תחנות:
// "נסיעה למקס סטוק, חצי שעה שם, ואז לבית חב״ד ולימוד 20 דקות"
// → נסיעה למקס סטוק · מקס סטוק 30 דק׳ · נסיעה לבית חב״ד · לימוד 20 דק׳

const NUM = { 'אחת': 1, 'אחד': 1, 'שתיים': 2, 'שניים': 2, 'שלוש': 3, 'ארבע': 4, 'חמש': 5, 'שש': 6, 'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10, 'עשרים': 20, 'שלושים': 30, 'ארבעים': 40, 'חמישים': 50 };

export function parseDuration(seg) {
  const s = seg.replace(/[״"׳']/g, '');
  if (/שעה וחצי/.test(s)) return 90;
  if (/שעתיים/.test(s)) return 120;
  if (/שלוש שעות/.test(s)) return 180;
  if (/חצי שעה/.test(s)) return 30;
  if (/רבע שעה/.test(s)) return 15;
  if (/שלושת רבעי שעה/.test(s)) return 45;
  let m = /(\d+)\s*(דק|דקות|ד)(?=\s|$)/.exec(s) || /(\d+)\s*דק/.exec(s);
  if (m) return Number(m[1]);
  m = /(\d+)\s*(שעות|שעה)/.exec(s);
  if (m) return Number(m[1]) * 60;
  for (const [w, n] of Object.entries(NUM)) if (new RegExp(`(^|\\s)${w}\\s+דקות`).test(s)) return n;
  if (/(^|\s)שעה($|\s)/.test(s)) return 60;
  return null;
}

const stripDur = s => s
  .replace(/שעה וחצי|שעתיים|שלוש שעות|חצי שעה|רבע שעה|שלושת רבעי שעה/g, '')
  .replace(/\d+\s*(דקות|דק׳|דק'|דק|ד׳|שעות|שעה)/g, '')
  .replace(new RegExp(`(${Object.keys(NUM).join('|')})\\s+דקות`, 'g'), '')
  .replace(/(^|\s)(של|במשך|למשך|בערך|כ-|כ)(?=\s|$)/g, ' ')
  .replace(/\s+/g, ' ').trim();

const norm = s => s.replace(/[״"׳'\-–—]/g, '').replace(/\s+/g, ' ').trim();

/** places: { id: { name, address, minutes } } → [items, newPlaces] */
export function parsePlan(text, places = {}) {
  const items = [], newPlaces = {};
  const segs = String(text || '')
    .split(/[,،.\n]+|\s+(?:ואז|אחר כך|ואחר כך|ומשם|משם|אחרי זה|ואחרי זה)\s+/)
    .flatMap(x => x.split(/\s+ו(?=(?:נסיעה|לנסוע|לימוד|ללמוד|להיות|טיימר|משימה))/))
    .map(x => x.trim()).filter(Boolean);

  // מקום שמור לפי השם (גם חלקי): "בית חבד" ← "בית חב״ד — ברנר 2"
  const findPlace = name => {
    const n = norm(name);
    if (!n) return null;
    let best = null;
    for (const [id, p] of Object.entries(places)) {
      const base = norm(String(p.name || '').split(' — ')[0]);
      if (!base) continue;
      if (n === base || n.includes(base) || base.includes(n)) {
        if (!best || base.length > best[1]) best = [id, base.length];
      }
    }
    return best?.[0] || null;
  };

  let lastPlaceName = null;
  for (const raw of segs) {
    let seg = raw.replace(/^ו/, '').trim();
    const dur = parseDuration(seg);
    const isDrive = /^(נסיעה|לנסוע|ניסע|נוסע|נוסעים|סע)(?=\s|$)/.test(seg) || (/^ל\S/.test(seg) && !/^(לימוד|ללמוד|להיות|לעשות|להתקשר|לכתוב|לסדר|לקנות|להכין)/.test(seg));
    if (isDrive) {
      let name = stripDur(seg.replace(/^(נסיעה|לנסוע|ניסע|נוסע|נוסעים|סע)\s*/, '').replace(/^(אל|ל)\s*/, '').replace(/^ל(?=\S)/, ''));
      if (!name) continue;
      let id = findPlace(name);
      if (!id) {
        id = 'p_' + Date.now() + '_' + items.length;
        newPlaces[id] = { name, address: name, minutes: 10 };   // וויז מחפש לפי השם
      }
      const pname = (places[id] || newPlaces[id]).name;
      lastPlaceName = pname.split(' — ')[0];
      items.push({ type: 'drive', title: `ל${lastPlaceName}`, icon: 'car', legs: [id] });
      if (dur) items.push({ type: 'timer', title: lastPlaceName, icon: 'clock', minutes: dur });
      continue;
    }
    if (/לימוד|ללמוד|חת״ת|חת"ת|תניא|רמב״ם|רמב"ם|חסידות|שיעור/.test(seg)) {
      const title = stripDur(seg).replace(/^(זמן\s+)?(ללמוד|לימוד)\s*/, '') || 'זמן לימוד';
      items.push({ type: 'study', title: /^(זמן לימוד|לימוד)$/.test(title) ? 'זמן לימוד' : `לימוד — ${title}`, icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', minutes: dur || 30 });
      continue;
    }
    if (/^(שם|להיות שם|נשאר שם|להישאר שם)(?=\s|$)/.test(stripDur(seg)) || (dur && !stripDur(seg))) {
      items.push({ type: 'timer', title: lastPlaceName || 'להיות שם', icon: 'clock', minutes: dur || 20 });
      continue;
    }
    const title = stripDur(seg.replace(/^(טיימר|משימה)\s*/, '')) || 'טיימר';
    items.push({ type: 'timer', title, icon: /^טיימר/.test(seg) ? 'play' : 'list', minutes: dur || 10 });
  }
  return [items, newPlaces];
}
