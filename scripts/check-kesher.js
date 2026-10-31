const { buildSync } = require('esbuild');
const { execFileSync } = require('child_process');
const path = require('path');
const out = path.join(require('os').tmpdir(), 'seder-kesher-test.js');
buildSync({ entryPoints: [path.join(__dirname, 'test/kesher.test.js')], bundle: true, platform: 'node', outfile: out, logLevel: 'warning' });
execFileSync(process.execPath, [out], { stdio: 'inherit' });
