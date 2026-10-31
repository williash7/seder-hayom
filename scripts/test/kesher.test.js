import assert from 'node:assert/strict';
import { parseKesher, kesherState } from '../../lib/kesher';
const now = 1793613600000;
const period = { from: now - 86400000, to: now, paidCents: 18025, payments: 1, pledgedCents: 50000, monthlyCents: 10000, workMs: 300000 };
const data = { schema: 1, generatedAt: now, timezone: 'Asia/Jerusalem', campaignName: 'התרמה', campaignStart: now - 86400000, running: false,
  periods: Object.fromEntries(['day', 'week', 'month', 'campaign'].map(k => [k, { ...period }])), openPledgesCents: 50000,
  tasks: [{ id: 't1', title: 'קבלה', donorName: 'ישראל', due: now }], openTaskCount: 1, tasksTruncated: false, rawSummary: 'PRIVATE' };
const raw = JSON.stringify(data), good = parseKesher(raw, now);
assert.equal(good.periods.day.paidCents, 18025);
assert.equal(good.tasks[0].donorName, 'ישראל');
assert.equal('rawSummary' in good, false);
assert.throws(() => parseKesher(raw, now + 300001));
assert.throws(() => parseKesher(JSON.stringify({ ...data, schema: 2 }), now));
assert.throws(() => parseKesher(JSON.stringify({ ...data, periods: { ...data.periods, day: { ...period, paidCents: -1 } } }), now));
assert.throws(() => parseKesher(JSON.stringify({ ...data, periods: { ...data.periods, day: { ...period, workMs: 86400001 } } }), now));
assert.throws(() => parseKesher(JSON.stringify({ ...data, openTaskCount: 0 }), now));
const old = { status: 'ok', data: good };
for (const status of ['not_connected', 'missing_app', 'needs_app_update', 'invalid']) assert.equal(kesherState(old, { status }, now).data, null);
assert.equal(kesherState(old, { status: 'error' }, now).data, good);
assert.equal(kesherState(old, { status: 'ok', json: '{}' }, now).data, null);
assert.equal(kesherState(null, { status: 'ok', json: raw }, now).status, 'ok');
console.log('PASS: 15 בדיקות חוזה, סכומים, עדכניות וניתוק');
