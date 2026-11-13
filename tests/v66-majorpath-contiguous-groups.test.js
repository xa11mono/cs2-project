// v72: Major Path renders continuous stage buckets and orders each bucket by total invite chance.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/competition/major-path-odds.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/portal/tokens.css'), 'utf8');
const assert = (value, message) => { if (!value) throw new Error(message); };
const H = { PAGES: {}, SECTION_OF: {}, esc: s => String(s ?? ''), box: (t, b) => `${t}${b}`, empty: s => s };
const win = { HS: H, setInterval() { return 1; } };
const context = { window: win, setInterval() { return 1; }, console: { info() {}, warn() {} }, Date, Math, Number, String, Object, Array, Map, Set };
vm.runInNewContext(source, context, { filename: 'js/competition/major-path-odds.js' });
const api = win.V35Major;
assert(api && typeof api.probabilityBuckets === 'function' && typeof api.inviteProbability === 'function', 'v72 must expose probability bucket/total helpers');

// Reproduces the screenshot sequence: 32% had incorrectly appeared before 38%.
const screenshotRows = [
  { name: 'NRG', rank: 28, s3: 0, s2: 0, s1: .52, in: .52 },
  { name: 'Bounty Hunters', rank: 35, s3: 0, s2: 0, s1: .44, in: .44 },
  { name: 'WW Team', rank: 33, s3: 0, s2: 0, s1: .32, in: .32 },
  { name: 'Galorys', rank: 38, s3: 0, s2: 0, s1: .38, in: .38 },
  { name: 'Sangal', rank: 31, s3: 0, s2: 0, s1: .29, in: .29 },
  { name: 'HOTU', rank: 30, s3: 0, s2: 0, s1: .26, in: .26 }
];
const sortedScreenshot = api.sortProbabilityRows(screenshotRows).map(x => x.name);
assert(sortedScreenshot.join('|') === 'NRG|Bounty Hunters|Galorys|WW Team|Sangal|HOTU', `screenshot rows must be descending by invite chance: ${sortedScreenshot.join(', ')}`);

// Stages are contiguous even where the overall invite chance of a lower stage is larger.
const mixed = [
  { name: 'Stage 1 99', rank: 1, s3: 0, s2: 0, s1: .99, in: .99 },
  { name: 'Stage 2 72', rank: 2, s3: 0, s2: .70, s1: .02, in: .72 },
  { name: 'Stage 3 72', rank: 3, s3: .70, s2: .02, s1: 0, in: .72 },
  { name: 'Falcons', rank: 4, s3: .98, s2: .02, s1: 0, in: 1 },
  { name: 'Stage 2 99', rank: 5, s3: 0, s2: .99, s1: 0, in: .99 },
  { name: 'Spirit', rank: 6, s3: .99, s2: 0, s1: 0, in: .99 }
];
const mixedSorted = api.sortProbabilityRows(mixed).map(x => x.name);
assert(mixedSorted.join('|') === 'Falcons|Spirit|Stage 3 72|Stage 2 99|Stage 2 72|Stage 1 99', `stage buckets must stay contiguous: ${mixedSorted.join(', ')}`);
const buckets = api.probabilityBuckets(mixed);
assert(buckets[3].length === 3 && buckets[2].length === 2 && buckets[1].length === 1, 'no row should leak between forecast stage buckets');
assert(api.probabilityStage(mixed.find(x => x.name === 'Falcons')) === 3, 'Falcons 98% Stage 3 + 2% Stage 2 stay in Stage 3 bucket');

// `in` must not cause mis-ordering when stale; sum of mutually exclusive stage probabilities is canonical.
const stale = [
  { name: 'Actual 82', s3: .7, s2: .1, s1: .02, in: .25 },
  { name: 'Actual 65', s3: .3, s2: .2, s1: .15, in: .99 }
];
assert(api.inviteProbability(stale[0]) === .82, 'invite probability is derived from the three exclusive stage probabilities');
assert(api.sortProbabilityRows(stale)[0].name === 'Actual 82', 'stale `in` values must not split or reorder rows incorrectly');
assert(Math.abs(api.inviteProbability({ s3: '70%', s2: '5%', s1: '2%' }) - .77) < 1e-9, 'percentage strings should be normalized');

assert(source.includes('mp-stage-divider') && source.includes('const stageSections = [3, 2, 1]'), 'table should render continuous explicit stage sections');
assert(!source.includes('Number(x.in) > 0'), 'legacy `in` field should not override the normalized total');
assert(index.includes('js/competition/major-path-odds.js') && index.includes('css/portal/tokens.css'), 'cache busting should force v72 JS/CSS to load');
assert(css.includes('.mp-stage-divider td'), 'stage divider rows need visible group styling');
console.log('PASS v72: Major Path stage groups are contiguous; each is sorted by derived invite probability descending');
