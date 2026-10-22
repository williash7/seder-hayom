// חלוקת האפליקציות לקבוצות. ברירת המחדל לפי שם החבילה; אשר משנה בלחיצה ארוכה (settings.launcher.groups).
export const GROUPS = [
  { k: 'essential', label: 'חיוניות', sub: 'טלפון, הודעות, מצלמה, ניווט, בנק — פתוחות תמיד' },
  { k: 'torah', label: 'תורה ותפילה', sub: 'פתוחות בעבודה ובזמן בית' },
  { k: 'work', label: 'עבודה', sub: 'פתוחות בשעות העבודה בלבד' },
  { k: 'reason', label: 'צריך סיבה', sub: 'נפתחות רק אחרי שכותבים בשביל מה' },
  { k: 'bad', label: 'מבזבזות זמן', sub: 'נעולות. נפתחות רק בהשהיית נעילה או אחרי סיבה' },
  { k: 'hidden', label: 'מוסתרות', sub: 'לא רלוונטיות — מוסתרות מהרשימה' },
];
export const GROUP_LABEL = Object.fromEntries(GROUPS.map(g => [g.k, g.label]));

const has = (pkg, list) => list.some(s => (s.endsWith('*') ? pkg.startsWith(s.slice(0, -1)) : pkg === s || pkg.includes(s)));

const RULES = {
  bad: ['com.google.android.youtube', 'com.facebook.katana', 'com.facebook.orca', 'com.instagram.', 'com.zhiliaoapp.musically', 'com.ss.android.ugc',
    'com.twitter.android', 'com.reddit.', 'com.netflix.mediaclient', 'com.snapchat.', 'com.pinterest', 'com.king.', 'com.supercell.', 'com.mojang.',
    'com.roblox.', 'com.google.android.play.games', 'com.miniclip', 'com.zynga', 'com.tinder', 'com.amazon.avod', 'tv.twitch', 'com.discord'],
  hidden: ['com.samsung.android.app.tips', 'com.samsung.android.bixby', 'com.samsung.android.app.sharelive', 'com.facebook.appmanager', 'com.facebook.services',
    'com.netflix.partner', 'com.samsung.android.app.updatecenter', 'com.samsung.android.mobileservice', 'com.samsung.android.game', 'com.samsung.android.app.galaxyfinder',
    'com.microsoft.appmanager', 'com.microsoft.skydrive', 'com.samsung.android.themestore', 'com.samsung.android.app.spage', 'com.samsung.android.forest',
    'com.samsung.sree', 'com.samsung.android.arzone', 'com.samsung.android.ardrawing', 'com.samsung.android.aremoji', 'com.google.android.apps.youtube.kids'],
  essential: ['dialer', 'com.android.contacts', 'com.samsung.android.contacts', 'com.google.android.contacts', 'messaging', 'camera', 'clockpackage', 'deskclock',
    'com.android.settings', 'calculator', 'com.waze', 'com.google.android.apps.maps', 'gallery3d', 'com.google.android.apps.photos', 'walletnfcrel', 'samsung.android.spay',
    'hapoalim', 'leumi', 'discount', 'mizrahi', 'fibi', 'bankotsar', 'onezero', 'mercantile', 'massad', 'yahav', 'bnhp.payments', 'paybox', 'com.google.android.apps.authenticator',
    'com.android.vending', 'com.google.android.apps.tasks', 'com.google.android.keep', 'com.sec.android.app.myfiles', 'com.google.android.apps.nbu.files'],
  torah: ['chabad', 'chabadinfo', 'tehilim', 'tehillim', 'siddur', 'sefaria', 'hebcal', 'dafyomi', 'torah', 'hayom', 'jewish', 'shabbat', 'sefer', 'hoshana', 'orot', 'daf'],
  work: ['com.whatsapp', 'com.google.android.gm', 'com.google.android.apps.docs', 'com.google.android.calendar', 'com.samsung.android.calendar', 'com.google.android.apps.meetings',
    'us.zoom', 'com.github', 'host.exp', 'com.anthropic.claude', 'com.openai.chatgpt', 'com.android.chrome', 'com.microsoft.office', 'com.microsoft.teams', 'com.canva', 'org.telegram',
    'com.google.android.apps.drive', 'com.google.android.apps.sheets', 'com.google.android.apps.bard', 'com.google.android.apps.gemini'],
};

/** הקבוצה לפי ברירת מחדל. הסדר חשוב: "מבזבזות" ו"מוסתרות" לפני השאר. */
export function defaultGroup(pkg, extra = {}) {
  if (extra.torahPkgs?.includes(pkg)) return 'torah';
  for (const k of ['bad', 'hidden', 'essential', 'torah', 'work']) if (has(pkg, RULES[k])) return k;
  return 'reason';
}

export const groupOf = (settings, pkg, extra) => settings.launcher?.groups?.[pkg] || defaultGroup(pkg, extra);

/** רשימות החבילות המותרות בכל מצב, לפי הקבוצות. */
export function computeAuto(apps, settings) {
  const torahPkgs = Object.values(settings.apps || {}).map(a => a.pkg).filter(Boolean);
  const free = [], home = [], bad = [];
  for (const a of apps) {
    const g = groupOf(settings, a.pkg, { torahPkgs });
    if (g === 'essential' || g === 'torah') { free.push(a.pkg); home.push(a.pkg); }
    else if (g === 'work') free.push(a.pkg);
    else if (g === 'bad') bad.push(a.pkg);
  }
  return { free: free.sort(), home: home.sort(), bad: bad.sort() };
}
