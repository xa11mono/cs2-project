// v68: Major Path invite odds are calibrated by current regional quota position
// while keeping the exact expected slot totals for Stage 3 / Stage 2 / Stage 1.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/competition/major-path-odds.js'), 'utf8');
const assert = (value, message) => { if (!value) throw new Error(message); };

const H = { PAGES: {}, SECTION_OF: {}, esc: s => String(s ?? ''), box: (t, b) => `${t}${b}`, empty: s => s };
const win = { HS: H, setInterval() { return 1; } };
const ctx = { window: win, setInterval() { return 1; }, console: { info() {}, warn() {} }, Date, Math, Number, String, Object, Array, Map, Set };
vm.runInNewContext(source, ctx, { filename: 'js/competition/major-path-odds.js' });
const api = win.V35Major;
assert(typeof api.buildQuotaPositionProfile === 'function', 'v68 must expose the regional quota position profile');
assert(typeof api.calibrateStageProbabilities === 'function', 'v68 must expose the quota-aware probability calibrator');
assert(typeof api.quotaAdjustmentLambda === 'function', 'v68 must expose a horizon-aware adjustment strength');

// Simulate real stage allocation totals: EU 18, AM 9, AS 5.
const teams = [];
for (let i = 1; i <= 20; i++) teams.push({ name: `EU${i}`, region: 'EU', pts: 1000 - i * 3 });
for (let i = 1; i <= 12; i++) teams.push({ name: `AM${i}`, region: 'AM', pts: 900 - i * 3 });
for (let i = 1; i <= 6; i++) teams.push({ name: `AS${i}`, region: 'AS', pts: 800 - i * 3 });
win.CS2Realism = {
  regionOfTeam: t => t.region,
  majorPools: () => ({
    stage3: [...teams.filter(t => t.region === 'EU').slice(0, 6), ...teams.filter(t => t.region === 'AM').slice(0, 2)],
    stage2: [...teams.filter(t => t.region === 'EU').slice(6, 12), teams.find(t => t.name === 'AM7'), teams.find(t => t.name === 'AS1')],
    stage1: [...teams.filter(t => t.region === 'EU').slice(12, 18), ...teams.filter(t => t.region === 'AM').slice(3, 9), ...teams.filter(t => t.region === 'AS').slice(1, 5)]
  })
};
const profile = api.buildQuotaPositionProfile(teams);
assert(profile.get('EU17').inQuota && profile.get('AM9').inQuota, 'teams currently in their regional slots must be marked inside');
assert(!profile.get('EU19').inQuota && !profile.get('AM10').inQuota, 'teams below their regional slot line must be marked outside');
assert(profile.get('EU17').score > profile.get('EU19').score, 'a team inside the quota must have a stronger prior than a nearby outsider');
assert(profile.get('AM9').seats === 9 && profile.get('EU17').seats === 18, 'regional slot counts must follow actual Major pools');

// Use the real positional profile at the screenshot's positions: EU #17 is in,
// while AM #10 is one place outside. Their regional competitors preserve their own quotas.
const actualCrossRows = [
  { name: 'EU17', s3: 0, s2: 0, s1: .26 },
  { name: 'EU19', s3: 0, s2: 0, s1: .50 },
  { name: 'AM10', s3: 0, s2: 0, s1: .52 },
  { name: 'AM9', s3: 0, s2: 0, s1: .26 }
];
const actualCross = api.calibrateStageProbabilities(actualCrossRows, profile, 1);
const actualCrossByName = new Map(actualCross.map(r => [r.name, r]));
assert(actualCrossByName.get('EU17').in > .26 && actualCrossByName.get('AM10').in < .52, 'actual EU #17 / AM #10 positions should shift in-quota chance up and outside chance down');
assert(actualCrossByName.get('EU17').in > actualCrossByName.get('AM10').in, `the screenshot's comparable EU #17 in-quota team should now be favoured over AM #10 outside (${actualCrossByName.get('EU17').in} vs ${actualCrossByName.get('AM10').in})`);

// The same pre-calibration forecast as the user's example: HOTU is in the EU quota,
// NRG is just outside the AM quota. The quota-aware posterior should reverse the raw order.
const sample = [
  { name: 'HOTU', s3: 0, s2: 0, s1: .26, in: .26 },
  { name: 'NRG', s3: 0, s2: 0, s1: .52, in: .52 }
];
const sampleProfile = new Map([
  ['HOTU', { score: .4, inQuota: true, place: 17, seats: 18 }],
  ['NRG', { score: -.4, inQuota: false, place: 10, seats: 9 }]
]);
const calibrated = api.calibrateStageProbabilities(sample, sampleProfile, 1);
const hotu = calibrated.find(x => x.name === 'HOTU');
const nrg = calibrated.find(x => x.name === 'NRG');
assert(hotu.in > nrg.in, `a comparable team inside the quota should receive a higher adjusted chance than a team just outside (${hotu.in} vs ${nrg.in})`);
assert(hotu.in > .26 && nrg.in < .52, 'calibration should raise the in-quota candidate and reduce the outside candidate');
assert(Math.abs(hotu.in + nrg.in - .78) < 1e-8, 'calibration must preserve total expected invitations');
assert(Math.abs(hotu.s3 + hotu.s2 + hotu.s1 - hotu.in) < 1e-10, 'displayed total must equal the sum of stage probabilities');

// Reproduce the screenshot's cross-region comparison. Each region is balanced
// independently so the current in-quota candidate gains probability while the
// outsider loses it without transferring regional slots between EU and AM.
const crossRows = [
  { name: 'HOTU', s3: 0, s2: 0, s1: .26 },
  { name: 'EU challenger', s3: 0, s2: 0, s1: .50 },
  { name: 'NRG', s3: 0, s2: 0, s1: .52 },
  { name: 'AM qualifier', s3: 0, s2: 0, s1: .26 }
];
const crossProfile = new Map([
  ['HOTU', { region: 'EU', score: .4, inQuota: true }],
  ['EU challenger', { region: 'EU', score: -.4, inQuota: false }],
  ['NRG', { region: 'AM', score: -.4, inQuota: false }],
  ['AM qualifier', { region: 'AM', score: .4, inQuota: true }]
]);
const crossAdjusted = api.calibrateStageProbabilities(crossRows, crossProfile, 1);
const crossByName = new Map(crossAdjusted.map(r => [r.name, r]));
assert(crossByName.get('HOTU').in > .26 && crossByName.get('NRG').in < .52, 'the in-quota HOTU outlook should rise and the outside-quota NRG outlook should fall');
assert(crossByName.get('HOTU').in > crossByName.get('NRG').in, `in-quota HOTU should rank above the comparable outside-quota NRG example (${crossByName.get('HOTU').in} vs ${crossByName.get('NRG').in})`);
assert(Math.abs(crossByName.get('HOTU').in + crossByName.get('EU challenger').in - .76) < 1e-8, 'EU expected invitations must remain unchanged');
assert(Math.abs(crossByName.get('NRG').in + crossByName.get('AM qualifier').in - .78) < 1e-8, 'AM expected invitations must remain unchanged');

// Slot totals and the per-team <=100% constraint must survive matrix balancing.
const many = Array.from({ length: 44 }, (_, i) => ({
  name: `T${i}`,
  s3: i < 8 ? .72 : .005,
  s2: i >= 8 && i < 16 ? .70 : .01,
  s1: i >= 16 && i < 32 ? .76 : .015
}));
many.forEach(r => { r.in = r.s3 + r.s2 + r.s1; });
const manyProfile = new Map(many.map((r, i) => { const region = i < 24 ? 'EU' : i < 36 ? 'AM' : 'AS'; const place = i < 24 ? i + 1 : i < 36 ? i - 23 : i - 35; const seats = region === 'EU' ? 18 : region === 'AM' ? 9 : 5; return [r.name, { region, score: (place <= seats ? 1 : -1) * (1 + (i % 4) / 10), inQuota: place <= seats }]; }));
const regionStageTotal = (list, region, key, profiles) => list.reduce((sum, row) => sum + ((profiles.get(row.name)?.region || 'EU') === region ? row[key] : 0), 0);
const adjustedMany = api.calibrateStageProbabilities(many, manyProfile, 4);
['EU', 'AM', 'AS'].forEach(region => ['s3', 's2', 's1'].forEach(key => {
  const before = regionStageTotal(many, region, key, manyProfile);
  const after = regionStageTotal(adjustedMany, region, key, manyProfile);
  assert(Math.abs(before - after) < 1e-7, `${region}/${key} expected slots must remain unchanged (${before} vs ${after})`);
}));
adjustedMany.forEach(r => {
  assert(r.s3 >= 0 && r.s2 >= 0 && r.s1 >= 0, 'stage probabilities cannot be negative');
  assert(r.in <= 1 + 1e-9, `a team's combined invite chance cannot exceed 100% (${r.name}: ${r.in})`);
  assert(Math.abs(r.in - (r.s3 + r.s2 + r.s1)) < 1e-9, 'overall chance must equal the three stage chances');
});

assert(api.quotaAdjustmentLambda(0) > api.quotaAdjustmentLambda(8), 'current quota should weigh more near invite lock than with a long tournament horizon');
const near = api.calibrateStageProbabilities(sample, sampleProfile, 0);
const far = api.calibrateStageProbabilities(sample, sampleProfile, 8);
assert(near[0].in > far[0].in, 'the in-quota prior should weaken as more future tournaments remain');
console.log('PASS v68: quota-aware invite probabilities, regional slot totals, and per-team probability limits');
