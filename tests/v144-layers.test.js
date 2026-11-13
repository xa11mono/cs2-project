// v144 — все слои глобальных функций подключены через CS2.patch (видны в CS2.chain). Ручная обёртка или замена
// глобальной функции в новом модуле роняет этот тест: правки не должны снова «накладываться» вслепую.
// Запуск: node tests/v144-layers.test.js
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const ALLOW = new Set(['__v21OpenLegacy']);   // не слой: сохранённая ссылка на старую функцию
// Главное правило (ARCHITECTURE.md, CLAUDE.md): правки вносятся в модуль-хозяин, а не новым слоем поверх.
// Число слоёв CS2.patch не растёт. Увеличивать только для новой подсистемы без хозяина — в том же изменении, с причиной.
const LAYER_BUDGET = 216;
(async () => {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v144l-')), { viewport: { width: 1400, height: 900 } });
  const p = ctx.pages()[0]; const errs = [], warns = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  p.on('console', m => { if (m.type() === 'warning' && /CS2\.patch/.test(m.text())) warns.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await require('./lib/project').chooseStart(p, 'history');
  await p.waitForFunction(() => window.V99Talks && window.CS2 && window.HS, null, { timeout: 60000 });
  await p.waitForTimeout(4000);   // отложенные подключения (повторы через setTimeout)
  const r = await p.evaluate(() => {
    const wraps = [], counts = { patch: 0, functions: 0 };
    Object.keys(CS2.layers()).forEach(n => { counts.functions++; CS2.chain(n).forEach(c => { if (c.kind === 'wrap') wraps.push(n + ' ← ' + c.layer); if (c.kind === 'patch') counts.patch++; }); });
    return { wraps, counts, sample: CS2.chain('applyPlayerTransfer').map(c => c.layer.replace(/^js\//, '') + ':' + c.kind) };
  });
  const bad = r.wraps.filter(x => !ALLOW.has(x.split(' ← ')[0]));
  const fail = m => { console.error('FAIL ' + m); process.exitCode = 1; };
  if (bad.length) fail('слои не через CS2.patch: ' + bad.join('; ')); else console.log(`PASS все слои через CS2.patch: ${r.counts.patch} слоёв у ${r.counts.functions} функций`);
  if (r.counts.patch > LAYER_BUDGET) fail(`слоёв CS2.patch стало ${r.counts.patch} (было ${LAYER_BUDGET}): правку нужно внести в модуль-хозяин функции, а не новым слоем поверх (ARCHITECTURE.md, раздел 2)`);
  else console.log(`PASS слоёв не прибавилось (${r.counts.patch} из ${LAYER_BUDGET}): правки внесены в хозяев`);
  if (warns.length) fail('CS2.patch: нечего расширять — ' + warns.join('; ')); else console.log('PASS нет расширений несуществующих функций');
  if (r.sample.length < 8 || r.sample[r.sample.length - 1] !== 'base/game.js:define') fail('цепочка applyPlayerTransfer: ' + r.sample.join(' → ')); else console.log('PASS CS2.chain(applyPlayerTransfer): ' + r.sample.join(' → '));
  if (errs.length) fail('ошибки страницы: ' + errs.join('; ')); else console.log('PASS без ошибок страницы');
  await ctx.close();
})();
