// מוסיף ל-MainActivity אפשרות להיות "מסך הבית" של הטלפון (HOME launcher)
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withHome(config) {
  return withAndroidManifest(config, c => {
    const app = c.modResults.manifest.application[0];
    const main = (app.activity || []).find(a => a.$['android:name'] === '.MainActivity');
    if (!main) throw new Error('withHome: MainActivity not found');
    main['intent-filter'] = main['intent-filter'] || [];
    const has = main['intent-filter'].some(f => (f.category || []).some(x => x.$['android:name'] === 'android.intent.category.HOME'));
    if (!has) {
      main['intent-filter'].push({
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.HOME' } },
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        ],
      });
    }
    main.$['android:launchMode'] = 'singleTask';
    main.$['android:stateNotNeeded'] = 'true';
    return c;
  });
};
