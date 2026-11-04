// בודק את תחביר כל מסכי React Native, גם אלה שאינם נכללים בבדיקות המנוע.
const { buildSync } = require('esbuild');
const path = require('path');

buildSync({
  entryPoints: [path.join(__dirname, '..', 'App.js')],
  bundle: true,
  platform: 'node',
  packages: 'external',
  loader: { '.js': 'jsx' },
  jsx: 'automatic',
  write: false,
  logLevel: 'warning',
});
console.log('✓ מסכי האפליקציה עוברים בדיקת תחביר');
