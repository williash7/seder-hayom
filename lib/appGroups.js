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

const has = (pkg, list) => { const p = pkg.toLowerCase(); return list.some(x => { const s = x.toLowerCase(); return s.endsWith('*') ? p.startsWith(s.slice(0, -1)) : p.includes(s); }); };

// כוון לפי הרשימה האמיתית של אשר (139 אפליקציות). אפליקציות-רשת (webapk) מזוהות לפי החבילה המלאה.
const RULES = {
  bad: ['com.google.android.youtube', 'org.schabi.newpipe', 'com.facebook.katana', 'com.facebook.orca', 'com.instagram.', 'com.zhiliaoapp.musically', 'com.ss.android.ugc',
    'com.twitter.android', 'com.reddit.', 'com.netflix.mediaclient', 'com.snapchat.', 'com.pinterest', 'com.king.', 'com.supercell.', 'com.mojang.',
    'com.roblox.', 'com.google.android.play.games', 'com.miniclip', 'com.zynga', 'com.tinder', 'tv.twitch', 'com.discord',
    'com.puzzle.sand.fill.aos', 'io.state.fight', 'cube.clear.burst', 'com.Garawell.LoopSort'],
  hidden: ['com.sec.android.easyMover', 'com.samsung.android.goodlock', 'com.samsung.android.soundassistant', 'com.nothing.smartcenter', 'com.mindblown.glbviewer',
    'com.samsung.android.app.sketchbook', 'com.sec.android.app.samsungapps', 'com.google.android.inputmethod.latin', 'com.asher.myplanner',
    'com.samsung.android.app.tips', 'com.samsung.android.bixby', 'com.samsung.android.app.sharelive', 'com.facebook.appmanager', 'com.facebook.services',
    'com.netflix.partner', 'com.samsung.android.app.updatecenter', 'com.samsung.android.mobileservice', 'com.samsung.android.game', 'com.samsung.android.app.galaxyfinder',
    'com.microsoft.appmanager', 'com.samsung.android.themestore', 'com.samsung.android.app.spage', 'com.samsung.android.forest', 'com.samsung.sree',
    'com.samsung.android.arzone', 'com.samsung.android.ardrawing', 'com.samsung.android.aremoji', 'com.google.android.apps.youtube.kids'],
  essential: ['dialer', 'com.android.contacts', 'com.samsung.android.app.contacts', 'com.google.android.contacts', 'messaging', 'app.camera', 'googlecamera', 'clockpackage', 'deskclock',
    'com.android.settings', 'popupcalculator', 'calculator', 'com.waze', 'com.google.android.apps.maps', 'gallery3d', 'com.google.android.apps.photos',
    'walletnfcrel', 'samsungpass', 'com.bnhp.payments', 'com.payboxapp', 'com.paypal.android', 'com.ideomobile.discount', 'hapoalim', 'leumi', 'mizrahi', 'fibi', 'onezero',
    'com.bluegate.app', 'com.gettaxi.android', 'com.unicell.pangoandroid', 'co.hopon.client', 'com.moblin.israeltrain', 'il.co.yellow.app', 'il.co.mitug.WhereBus',
    'com.sec.android.app.myfiles', 'com.google.android.apps.nbu.files', 'com.google.android.apps.authenticator'],
  torah: ['org.chromium.webapk.adeabc38e51009af1', 'org.chromium.webapk.a66d62245deff894d', 'org.chromium.webapk.a21bbd058056bc370', 'org.chromium.webapk.a54720f97254facbf',
    'org.chromium.webapk.a75240c56a82b136a', 'org.chromium.webapk.aa390e95488e2fda9', 'org.chromium.webapk.a2c2b7355376b19b4', 'org.chromium.webapk.a6dbeb668b99b9761',
    'org.chromium.webapk.a78860b65244c0d86', 'org.chromium.webapk.a70f209b694d06f30',
    'com.chassidus.app', 'igros.app', 'org.chabad.', 'org.likkuteisichos', 'app.mafteiach', 'com.myzmanim', 'com.chabad.ohel', 'org.sefaria', 'app.steinsaltz', 'com.jasidut',
    'com.dvar.malchus', 'maatayim.harambamhayomi', 'my.tanya.app', 'il.org.yomi', 'com.lionscribe.hebdate', 'com.two_mikra', 'il.avimak.TehillatHashem', 'tikun_korim', 'tikunkorim',
    'com.Rollep.MishneTora', 'org.readera', 'com.bambuna.podcastaddict', 'com.phonegap.mymikvahcal'],
  work: ['com.whatsapp', 'com.google.android.gm', 'com.google.android.apps.docs', 'com.google.android.calendar', 'com.samsung.android.calendar', 'com.google.android.apps.tachyon',
    'host.exp', 'com.github.android', 'com.anthropic.claude', 'com.openai.chatgpt', 'ai.x.grok', 'com.google.android.apps.bard', 'com.android.chrome', 'com.google.android.apps.cloudconsole',
    'com.google.android.apps.labs', 'com.google.android.apps.tasks', 'com.google.android.keep', 'com.ticktick.task', 'com.canva.editor', 'com.adobe.', 'com.camerasideas.instashot',
    'com.nocap.captions', 'com.psoffritti.trim.video', 'com.haessentz.videoeditor', 'com.google.android.apps.youtube.creator', 'com.google.android.apps.translate',
    'com.samsung.android.app.interpreter', 'in.ajaykhatri', 'io.heckel.ntfy', 'grant.m4a', 'com.sec.android.app.vepreload', 'com.rarlab.rar', 'org.videolan.vlc',
    'com.sec.android.app.voicenote', 'com.asher7.calendarapp', 'web2application', 'org.chromium.webapk.af59d8d67da79dc8a', 'org.chromium.webapk.a211d0088c88281ea', 'com.nfo.me.android'],
};

/** הקבוצה לפי ברירת מחדל. הסדר חשוב: "מבזבזות" ו"מוסתרות" לפני השאר. */
export function defaultGroup(pkg, extra = {}) {
  if (extra.torahPkgs?.includes(pkg)) return 'torah';
  for (const k of ['bad', 'hidden', 'essential', 'torah', 'work']) if (RULES[k] && has(pkg, RULES[k])) return k;
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
