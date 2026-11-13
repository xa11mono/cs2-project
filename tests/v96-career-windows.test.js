// v96 · окна карьеры: «Требует решения» перед «Продолжить», план тренировок, страницы «Центр событий» и «Тренировки».
// Запуск: node tests/v96-career-windows.test.js [папка-для-скриншотов]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..'), shots = process.argv[2] || '';
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v96w-')), { viewport: { width: 1672, height: 941 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3500);
  await require('./lib/project').chooseStart(p, 'history');
  await p.waitForFunction(() => window.V96Windows && window.V31 && window.HS && window.v15IsCalendarPaused, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);
  const shot = async n => { if (shots) await p.screenshot({ path: path.join(shots, n + '.png') }); };
  const gateOpen = () => p.evaluate(() => { const g = document.getElementById('v96-gate'); return !!g && !g.hidden && !!g.querySelector('.v96-win'); });
  const nowMs = () => p.evaluate(() => seasonState.calendar.currentMs);
  // клуб из середины таблицы + два события (недовольная звезда, кризис уверенности)
  const mkEvents = () => p.evaluate(() => {
    const t = HS.teamBy(V31.managed()), a = t.players[0], c = t.players[1]; V31.ensurePerson(a); V31.ensurePerson(c);
    a.pers.amb = 18; ['firepower', 'tacticalIQ', 'clutch', 'utility'].forEach(k => { a[k] = 95; }); c.conf = 20;
    V31.EV.unhappy.check(t); V31.EV.confidence.check(t);
    return V31.S().events.filter(e => e.team === t.name && e.status === 'open').length;
  });
  const me = await p.evaluate(() => { const n = HS.ranked().filter(t => !t.isAcademy)[11].name; V31.setManaged(n); V31.S(); V31.setAuto && V31.setAuto('training', false); return n; });
  await p.evaluate(() => { location.hash = '#/org'; }); await p.waitForTimeout(600);
  if (await p.evaluate(() => window.v15IsCalendarPaused())) await p.evaluate(() => window.toggleGameCalendarPause());

  // 1. событие появилось само → время остановлено, окно открыто, на «Продолжить» счётчик
  const n = await mkEvents(); assert(n === 2, 'создано событий: ' + n);
  await p.waitForFunction(() => { const g = document.getElementById('v96-gate'); return g && !g.hidden; }, null, { timeout: 5000 });
  assert(await p.evaluate(() => window.v15IsCalendarPaused()), 'календарь остановлен окном');
  assert(await p.getAttribute('#pt-skip', 'data-pending') === '3', 'счётчик на «Продолжить»: ' + await p.getAttribute('#pt-skip', 'data-pending'));
  const w1 = await p.evaluate(() => ({ h: document.querySelector('#v96-gate h2').textContent, steps: document.querySelectorAll('#v96-gate .v96-steps i').length, opts: document.querySelectorAll('#v96-gate .v96-opt').length, title: document.querySelector('#v96-gate .v96-ev h3').textContent }));
  assert(w1.h === 'Требует решения' && w1.steps === 3 && w1.opts >= 2, JSON.stringify(w1));
  pass('новое событие: время остановлено, окно «Требует решения» (' + w1.title + '), счётчик 3');
  await shot('w1-event');

  // 2. крестик отменяет; «Продолжить» не пролистывает решения
  await p.click('#v96-gate .v96-x'); await p.waitForTimeout(300);
  assert(!(await gateOpen()), 'крестик закрывает окно');
  if (await p.evaluate(() => window.v15IsCalendarPaused())) await p.evaluate(() => window.toggleGameCalendarPause());
  const t0 = await nowMs();
  await p.click('#pt-skip'); await p.waitForTimeout(500);
  assert(await gateOpen(), '«Продолжить» открывает окно, а не пропускает день');
  assert(await nowMs() - t0 < 36e5 * 6, 'сутки не пропущены, пока решения не приняты (часы идут в реальном времени, пропуска нет)');
  pass('«Продолжить» с нерешёнными событиями открывает окно и не пропускает день');

  // 3. решаем клавишей 1 → результат → «Дальше» → второе событие → тренировка → «Продолжить игру»
  await p.keyboard.press('1'); await p.waitForTimeout(300);
  const res = await p.evaluate(() => ({ kind: document.querySelector('#v96-gate .v96-kind').textContent, btn: document.querySelector('#v96-gate .v96-go').textContent.trim(), open: V31.S().events.filter(e => e.team === V31.managed() && e.status === 'open').length }));
  assert(res.kind === 'Решение принято' && res.btn === 'Дальше' && res.open === 1, JSON.stringify(res));
  await shot('w2-result');
  await p.click('#v96-gate .v96-go'); await p.waitForTimeout(300);
  await p.keyboard.press('2'); await p.waitForTimeout(300); await p.click('#v96-gate .v96-go'); await p.waitForTimeout(300);
  const tr = await p.evaluate(() => ({ kind: document.querySelector('#v96-gate .v96-kind').textContent, focus: document.querySelectorAll('#v96-gate .v96-tf').length, ints: document.querySelectorAll('#v96-gate .v96-ti').length }));
  assert(tr.kind === 'Тренировка' && tr.focus === 6 && tr.ints === 3, JSON.stringify(tr));
  await shot('w3-training');
  await p.click('#v96-gate [data-v96tf="utility"]'); await p.click('#v96-gate [data-v96ti="high"]');
  const plan = await p.evaluate(() => { const o = V31.org(V31.managed()); return o.train.focus + '/' + o.train.intensity + '/' + o.train.auto; });
  assert(plan === 'utility/high/false', 'выбор плана: ' + plan);
  await p.click('#v96-gate [data-v96trok]'); await p.waitForTimeout(300);
  const fin = await p.evaluate(() => ({ btn: document.querySelector('#v96-gate .v96-go').textContent.trim() }));
  // после последнего решения окно закрывается и пропуск выполняется
  await p.waitForTimeout(2500);
  assert(!(await gateOpen()), 'окно закрыто после последнего решения');
  assert(await nowMs() - t0 >= 864e5 * 0.5, 'после решений «Продолжить» выполнился: пропущены сутки+');
  assert(await p.evaluate(() => seasonState.v96.trainWeek >= 0), 'неделя тренировки подтверждена');
  pass('очередь: 2 события + тренировка решены (клавишами и кнопками), затем пропуск дня выполнен');

  // 4. «Решить позже» не блокирует следующий «Продолжить»
  if (await p.evaluate(() => window.v15IsCalendarPaused())) await p.evaluate(() => window.toggleGameCalendarPause());
  await p.evaluate(() => { const t = HS.teamBy(V31.managed()), c = t.players[2]; V31.ensurePerson(c); c.conf = 15; seasonState.v96.trainWeek = Math.floor(seasonState.calendar.currentMs / 864e5 / 7); V31.EV.confidence.check(t); });
  await p.waitForFunction(() => { const g = document.getElementById('v96-gate'); return g && !g.hidden; }, null, { timeout: 5000 });
  await p.click('#v96-gate [data-v96later]'); await p.waitForTimeout(2500);
  assert(!(await gateOpen()), 'после «Решить позже» окно закрылось и день пропущен');
  const t1 = await nowMs(); if (await p.evaluate(() => window.v15IsCalendarPaused())) await p.evaluate(() => window.toggleGameCalendarPause());
  await p.click('#pt-skip'); await p.waitForTimeout(1500);
  assert(!(await gateOpen()) && await nowMs() - t1 >= 864e5 * 0.5, 'отложенное событие (срок > 2 дней) не блокирует «Продолжить»');
  pass('«Решить позже»: событие остаётся в центре событий и не блокирует время');

  // 5. страницы «Центр событий» и «Тренировки»
  await p.evaluate(() => { location.hash = '#/inbox'; }); await p.waitForTimeout(700);
  const ib = await p.evaluate(() => ({ cards: document.querySelectorAll('#hs-page .v96-ev').length, opts: document.querySelectorAll('#hs-page .v96-opt').length, hist: document.querySelectorAll('#hs-page .v96-hist li').length }));
  assert(ib.cards >= 1 && ib.opts >= 2 && ib.hist >= 2, JSON.stringify(ib));
  await shot('p1-inbox');
  await p.click('#hs-page .v96-opt'); await p.waitForTimeout(500);
  assert(await p.evaluate(() => document.querySelectorAll('#hs-page .v96-ev').length) === ib.cards - 1, 'решение на странице закрывает карточку');
  await p.evaluate(() => { location.hash = '#/training'; }); await p.waitForTimeout(700);
  await shot('p2-training');
  await p.click('#hs-page [data-v96tf="comm"]'); await p.waitForTimeout(300);
  assert(await p.evaluate(() => V31.org(V31.managed()).train.focus) === 'comm', 'страница «Тренировки»: смена фокуса');
  await p.click('#hs-page [data-v96trok]'); await p.waitForTimeout(300);
  assert(/утверждён/.test(await p.textContent('#hs-page .v96-status')), 'статус плана: утверждён');
  pass('страницы «Центр событий» и «Тренировки»: карточки, решение на месте, план недели');

  // 6. узкое окно: окно решений листом снизу, без горизонтальной прокрутки
  await p.evaluate(() => { const t = HS.teamBy(V31.managed()), c = t.players[3]; V31.ensurePerson(c); c.conf = 12; V31.EV.confidence.check(t); });
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForFunction(() => { const g = document.getElementById('v96-gate'); return g && !g.hidden; }, null, { timeout: 5000 });
  const m = await p.evaluate(() => { const r = document.querySelector('#v96-gate .v96-win').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
  assert(m.l >= 0 && m.r <= m.w + 1, 'окно в пределах экрана: ' + JSON.stringify(m));
  await shot('w4-mobile');
  pass('окно решений на 390 px помещается');

  assert(!errs.length, 'ошибки страницы: ' + errs.slice(0, 3).join(' | '));
  pass('ошибок в консоли нет');
  await ctx.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
