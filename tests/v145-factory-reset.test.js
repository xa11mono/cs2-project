// v145 — «Сбросить всё к исходному» начинает новую игру: сезон, новости, награды, архив, аварийные копии сохранения.
// Раньше основное сохранение (IndexedDB, js/boot/store.js) не очищалось — после перезагрузки возвращался прежний сезон.
// Запуск: node tests/v145-factory-reset.test.js
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const { chooseStart } = require('./lib/project');
(async () => {
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v145r-')), { viewport: { width: 1400, height: 900 } });
  const p = ctx.pages()[0]; const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  const fail = m => { console.error('FAIL ' + m); process.exitCode = 1; };
  const state = () => p.evaluate(() => {
    let news = 0; try { const s = JSON.parse(localStorage.getItem('cs2_news_v1') || 'null'); news = s && Array.isArray(s.items) ? s.items.length : 0; } catch (e) {}
    return { day: new Date(seasonState.calendar.currentMs).toISOString().slice(0, 10), legacy: !!seasonState.v84Legacy, news,
      archive: Object.keys(window.hubArchiveExport ? hubArchiveExport() : {}).length,
      unsaved: Object.keys(localStorage).filter(k => k.startsWith('__cs2_unsaved__')).length };
  });
  const ready = () => p.waitForFunction(() => window.v33SkipDays && window.V99Talks && typeof seasonState !== 'undefined' && seasonState.calendar, null, { timeout: 60000 });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await chooseStart(p, 'history'); await ready(); await p.waitForTimeout(1500);
  const day0 = (await state()).day;
  await p.evaluate(() => window.v33SkipDays(20)); await p.waitForTimeout(5000);   // сезон идёт, новости копятся, сохранение пишется
  const before = await state();
  if (before.day <= day0 || !before.legacy) fail('подготовка: ' + JSON.stringify({ day0, before }));
  const nav = p.waitForNavigation({ timeout: 30000 }).catch(() => null);
  await p.evaluate(() => { resetToDefault(); }); await nav;
  await ready(); await p.waitForTimeout(4000);
  const after = await state();
  const modal = !!(await p.$('#v84-legacy-modal [data-lg="history"]'));
  if (after.day !== day0 || after.legacy || after.archive !== 0 || after.unsaved !== 0 || !(after.news < before.news) || !modal) fail('после сброса: ' + JSON.stringify({ day0, before, after, modal }));
  else console.log(`PASS сброс: ${before.day} → ${after.day}, новостей ${before.news} → ${after.news}, архив ${before.archive} → 0, история карьер снята, снова выбор новой игры`);
  if (errs.length) fail('ошибки страницы: ' + errs.join('; ')); else console.log('PASS без ошибок страницы');
  await ctx.close();
})();
