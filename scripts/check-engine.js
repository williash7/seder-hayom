// מריץ את בדיקות המנוע: אורז אותן עם esbuild ומריץ ב-node
const { buildSync } = require('esbuild');
const path = require('path');
const { execFileSync } = require('child_process');
const out = path.join(require('os').tmpdir(), 'seder-engine-test.js');
buildSync({ entryPoints: [path.join(__dirname, 'test', 'engine.test.js')], bundle: true, platform: 'node', outfile: out, logLevel: 'warning', alias: { '@react-native-async-storage/async-storage': path.join(__dirname, 'test', 'stub', 'async-storage.js') } });
execFileSync(process.execPath, [out], { stdio: 'inherit' });
