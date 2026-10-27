// תיבת משימות חד-פעמיות שאשר מעביר ל-Claude (למשל הודעות מירי).
// כל "חבילה" נכנסת פעם אחת בלבד לתוכנית של היום שלה, כמו "שינוי בתוכנית" — לפני התחנה הנוכחית.
// id חייב להיות ייחודי; date בפורמט YYYY-MM-DD (היום שבו היא נכנסת).
export const INBOX = [
  {
    id: 'election-2026-10-27',
    date: '2026-10-27',
    // יום בחירות — הילדים בבית, בלי מוסדות. יוצאים: פיזור ואיסוף ילדים, כריכים, כולל, מענדלה.
    offIds: ['shopping', 'shop_am', 'sandwiches', 'drive_kids', 'drive_mikveh', 'mikveh', 'drive_shul', 'pick_shacharit', 'study_am', 'korbanot', 'shacharit',
      'study_post', 'shiur_prep', 'drive_kollel', 'kollel', 'drive_mendele_tue', 'drive_home_tue', 'edit_kollel_tue', 'drive_tzivia', 'drive_home2'],
    items: [
      { type: 'drive', title: 'למקווה', icon: 'car', legs: ['mikveh'] },
      { type: 'timer', title: 'מקווה', icon: 'drop', minutes: 20 },
      { type: 'timer', title: 'קרבנות', icon: 'book', minutes: 10 },
      { type: 'prayer', prayer: 'shacharit', title: 'שחרית', icon: 'shul', alone: true },
      { type: 'study', title: 'השלמת חת״ת ורמב״ם מאתמול', icon: 'book', appKey: 'limud', path: 'index.html?go=1&until={end}', minutes: 30 },
      // אחרי השיעור עם אלכס (לפני "משימות להיום")
      { group: 'b', beforeId: 'tasks2', type: 'timer', title: 'קנייה לבית — אוכל לילדים', icon: 'box', minutes: 45,
        sub: 'הילדים בבית היום — הבית ריק, להביא אוכל' },
      { group: 'b', beforeId: 'tasks2', type: 'timer', title: 'כרטיס בוחר — תיבת הדואר בבית הקודם', icon: 'home', minutes: 20,
        sub: 'לקחת את הכרטיס ולהביא הביתה (אם יש שם)' },
      { group: 'b', beforeId: 'tasks2', type: 'timer', title: 'להצביע', icon: 'check', minutes: 20,
        sub: 'עם תעודת זהות · הקלפי פתוחה עד הערב' },
    ],
  },
  {
    id: 'miri-2026-10-22-v2',
    date: '2026-10-22',
    // מחליף את הגרסה הראשונה (שבה הכל היה מעורבב בין המזוודה לשקית)
    dropTitles: ['גופיות של מענדלה — מהמכונה למייבש', 'ללקט למזוודה של מירי', 'גופיות מהמייבש — למזוודה', 'שקית למירי — להעביר עם ברוך או קליין'],
    items: [
      { type: 'routine', title: 'גופיות של מענדלה — מהמכונה למייבש', icon: 'drop', sub: 'למזוודה',
        notifyAfter: { minutes: 50, title: 'המייבש סיים', body: 'להוציא את הגופיות של מענדלה ולהכניס למזוודה' },
        steps: [
          { id: 'move', label: 'להעביר 2 גופיות של מענדלה מהמכונה למייבש', minutes: 3 },
          { id: 'start', label: 'להפעיל את המייבש', minutes: 1 },
        ] },
      { type: 'checklist', title: 'למזוודה של מירי', icon: 'list', minutes: 15,
        sub: 'מההודעה הראשונה של מירי',
        items: [
          'גרביים למענדלה — 2',
          'גרביים לצביה — 2',
          'נעליים לכולם (לבנות / שמנת / בורדו)',
          'חולצה למענדלה — לקנות בלידר אם אפשר, אחרת מה ששמה',
          'כיפה ירוקה של ר״ה למענדלה',
          'קשתות וסיכה לצביה — כבר בתא החיצוני של המזוודה',
        ] },
      { type: 'checklist', title: 'שקית למירי — ללקט', icon: 'list', minutes: 15,
        sub: 'אם מצליחים — מצוין. אם לא — "השגחה פרטית"',
        items: [
          'ז׳קט אפור כהה פתוח (בארון התליה — כמו חולצה מכופתרת פתוחה)',
          'ז׳קט שמנת עם כובע (בארון התליה — כמו מעיל דק)',
          'גרביונים קטנים — כמה שאפשר (במגירת הגרביונים בחדר של צביה)',
          'שמיכה ורודה עבה של שיינא (מתחת למיטה)',
        ] },
      { type: 'timer', title: 'גופיות מהמייבש — למזוודה', icon: 'list', minutes: 3,
        sub: 'אם עוד לא התייבשו — לדלג ולחזור אליהן' },
      { type: 'routine', title: 'להעביר את השקית עם ברוך או קליין', icon: 'car',
        steps: [
          { id: 'ask', label: 'לשאול את ברוך או קליין מי נוסע ומתי', minutes: 3 },
          { id: 'hand', label: 'להעביר להם את השקית', minutes: 10 },
        ] },
    ],
  },
];
