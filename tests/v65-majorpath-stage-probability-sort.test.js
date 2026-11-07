// v65: Major Path sorting is staged by dominant invite stage, then overall Major invite chance.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/manager/v35-major-path.js'), 'utf8');
const assert = (value, message) => { if (!value) throw new Error(message); };

const H = { PAGES: {}, SECTION_OF: {}, esc: s => String(s ?? ''), box: (t, b) => `${t}${b}`, empty: s => s };
const win = { HS: H, setInterval() { return 1; } };
const context = { window: win, setInterval() { return 1; }, console: { info() {}, warn() {} }, Date, Math, Number, String, Object, Array, Map, Set };
vm.runInNewContext(source, context, { filename: 'v35-major-path.js' });
const api = win.V35Major;
assert(api && typeof api.sortProbabilityRows === 'function', 'Major Path must expose its canonical sorter');
assert(typeof api.probabilityStage === 'function', 'Major Path must expose its dominant-stage classifier');
assert(source.includes('Наиболее вероятная стадия') && source.includes('mp-z s${primary}'), 'Major Path table must visibly label the dominant forecast stage separately from the current quota status');

const rows = [
  { name: 'Stage 1 99', rank: 4, s3: 0, s2: 0, s1: .99, in: .99 },
  { name: 'Stage 2 72', rank: 6, s3: 0, s2: .70, s1: .02, in: .72 },
  { name: 'Stage 3 72', rank: 7, s3: .70, s2: .02, s1: 0, in: .72 },
  { name: 'Vitality', rank: 2, s3: .99, s2: 0, s1: 0, in: .99 },
  { name: 'Falcons', rank: 3, s3: .98, s2: .02, s1: 0, in: 1 },
  { name: 'Stage 2 99', rank: 5, s3: 0, s2: .99, s1: 0, in: .99 },
  { name: 'Spirit', rank: 1, s3: .99, s2: 0, s1: 0, in: .99 }
];
const sorted = api.sortProbabilityRows(rows);
const names = sorted.map(row => row.name);
assert(names.join('|') === 'Falcons|Spirit|Vitality|Stage 3 72|Stage 2 99|Stage 2 72|Stage 1 99', `unexpected sorted order: ${names.join(', ')}`);
assert(api.probabilityStage(rows.find(row => row.name === 'Falcons')) === 3, '98% Stage 3 + 2% Stage 2 must remain in the Stage 3 group');
assert(api.probabilityStage(rows.find(row => row.name === 'Stage 2 72')) === 2, 'higher Stage 2 probability must classify a team as Stage 2');
assert(api.probabilityStage(rows.find(row => row.name === 'Stage 1 99')) === 1, 'Stage 1 must be the final stage group');
assert(sorted[0].name === 'Falcons', 'within the Stage 3 group, 100% overall invite chance must rank above 99%');
assert(sorted.findIndex(row => row.name === 'Stage 3 72') < sorted.findIndex(row => row.name === 'Stage 2 99'), 'every Stage 3 candidate must rank above every Stage 2 candidate, even if its overall chance is lower');
assert(sorted.findIndex(row => row.name === 'Stage 2 72') < sorted.findIndex(row => row.name === 'Stage 1 99'), 'every Stage 2 candidate must rank above every Stage 1 candidate');
assert(rows[0].name === 'Stage 1 99', 'sorting must not mutate the original simulation result array');

console.log('PASS v65: Major Path sorts Stage 3 → Stage 2 → Stage 1, then sorts by overall invite chance descending');
