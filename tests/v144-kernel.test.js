// v144 — ядро: CS2.patch, CS2.chain/layers, шина событий, CS2Rank, CS2Config.version, манифест.
// Запуск: node tests/v144-kernel.test.js (без браузера)
const assert = require('node:assert/strict');
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);   // массивы из vm-контекста — другой realm
const vm = require('node:vm');
const { read, manifest } = require('./lib/project');

const win = { console: { warn() {}, error() {}, info() {} }, performance: { now: () => Date.now() } };
win.window = win;
win.document = { currentScript: null };
const ctx = vm.createContext(win);
vm.runInContext(read('js/core/kernel.js'), ctx, { filename: 'kernel.js' });
const CS2 = win.CS2;
assert.ok(CS2 && CS2.__kernel, 'kernel installed');

// --- CS2.patch: слой, id-идемпотентность, перенос свойств, цепочка
win.calc = function (x) { return x + 1; };
win.calc.__old = true;
CS2.__afterModule('js/base/game.js', true);              // «модуль загрузился» — функция объявлена
CS2.patch('calc', base => function (x) { return base(x) * 2; }, { id: '__a', layer: 'js/a.js' });
CS2.__afterModule('js/a.js', true);
const once = win.calc;
CS2.patch('calc', base => function (x) { return base(x) * 100; }, { id: '__a', layer: 'js/a.js' });
assert.equal(win.calc, once, 'same id is not applied twice');
win.calc = (b => function (x) { return b(x) - 3; })(win.calc);   // старый стиль — ручная обёртка
CS2.__afterModule('js/b.js', true);
assert.equal(win.calc(1), 1, '(1+1)*2-3');
assert.ok(once.__old && once.__a, 'base properties carried over, id set');
same(CS2.chain('calc').map(x => x.layer + ':' + x.kind), ['js/b.js:wrap', 'js/a.js:patch', 'js/base/game.js:define']);
same(CS2.layers().calc, ['js/base/game.js', 'js/a.js', 'js/b.js'], 'automatic layer map sees hand-written wrappers too');
assert.equal(CS2.patch('nope', b => function () { return b(); }), undefined, 'missing base: skipped');
assert.equal(win.nope, undefined);

// --- шина событий: порядок, отписка, once, ошибка подписчика не ломает остальных
const got = [];
const off = CS2.on('e', p => got.push('a' + p));
CS2.on('e', () => { throw new Error('boom'); });
CS2.once('e', p => got.push('once' + p));
assert.equal(CS2.emit('e', 1), 2, 'two handlers succeeded, one threw');
off(); CS2.emit('e', 2);
same(got, ['a1', 'once1']);

// --- CS2Rank: тот же порядок, что у прежней сортировки, кеш пересчитывается при изменении очков
const rctx = vm.createContext({ window: {}, console });
rctx.window = rctx;
vm.runInContext('var teams = [{name:"A",pts:10},{name:"B",pts:30},{name:"Acad",pts:99,isAcademy:true},{name:"C",pts:30},{name:"D",pts:5}];', rctx);
vm.runInContext(read('js/core/ranking.js'), rctx);
const R = rctx.CS2Rank;
const ref = () => vm.runInContext('teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts).map(t => t.name)', rctx);
same(R.pro().map(t => t.name), ref(), 'stable order like the old copies');
assert.equal(R.of('C'), 2); assert.equal(R.of('Acad'), 0); assert.equal(R.of(vm.runInContext('teams[1]', rctx)), 1);
vm.runInContext('teams[3].pts = 50', rctx);
assert.equal(R.of('C'), 1, 'points change invalidates the cache');
vm.runInContext('teams[0].isAcademy = true', rctx);
assert.equal(R.of('A'), 0, 'academy flag change invalidates the cache');
vm.runInContext('teams = teams.concat([{name:"E",pts:1000}])', rctx);
assert.equal(R.of('E'), 1, 'reassigned teams array is noticed');
const arr = R.pro(); arr.length = 0; assert.ok(R.pro().length > 0, 'pro() returns a copy');

// --- CS2Config.version
const cctx = vm.createContext({ console, localStorage: { getItem() { return null; }, setItem() {} } });
cctx.window = cctx;
vm.runInContext(read('js/core/config.js'), cctx);
const v0 = cctx.CS2Config.version; cctx.CS2Config.set('power.current.form', 0.2);
assert.equal(cctx.CS2Config.version, v0 + 1); cctx.CS2Config.reset(); assert.equal(cctx.CS2Config.version, v0 + 2);

// --- манифест: файлы существуют, без дублей, ядро первым
const M = manifest(), fs = require('node:fs'), path = require('node:path');
assert.equal(M.js[0], 'js/core/kernel.js');
assert.equal(new Set(M.js).size, M.js.length, 'no duplicate modules');
[...M.js, ...M.css].forEach(f => assert.ok(fs.existsSync(path.join(__dirname, '..', f)), 'exists: ' + f));
assert.ok(M.js.indexOf('js/core/ranking.js') < M.js.indexOf('js/rosters/market.js'), 'ranking before its users');
assert.ok(M.js.indexOf('js/data/trophy-arts.js') < M.js.indexOf('js/awards/trophy-forge.js'), 'trophy data before the forge');
console.log('v144 kernel tests passed');
