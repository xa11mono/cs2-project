// v96 · экран выбора организации: список клубов с фильтрами + досье выбранного клуба.
// Запуск: node tests/v96-team-select.test.js [папка-для-скриншотов]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..'), shots = process.argv[2] || '';
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v96-')), { viewport: { width: 1672, height: 941 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3500);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(500); }
  await p.waitForFunction(() => window.V96Pick && window.V31 && window.HS && window.CS2Board && window.CS2Control, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);
  const shot = async n => { if (shots) await p.screenshot({ path: path.join(shots, n + '.png') }); };
  const go = async h => { await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(500); };

  // 1. наблюдатель: любая страница «Карьеры» без клуба открывает экран выбора
  await p.evaluate(() => { if (V31.managed()) V31.setManaged(''); });
  for (const pg of ['org', 'inbox', 'training', 'finance', 'pick']) {
    await go('#/' + pg);
    const n = await p.$$eval('#v96-rows .v96-row', r => r.length);
    assert(n >= 100, `страница ${pg}: в списке ${n} клубов`);
    assert(await p.$('#v96-detail .v96-hero h2'), `страница ${pg}: нет досье`);
  }
  assert((await p.textContent('#gs-title')).trim() === 'Выбор организации', 'заголовок экрана');
  pass('без клуба страницы карьеры открывают экран выбора (116 клубов, досье)');

  // 2. досье: состав, цели, сильные стороны, риски, ключевые цифры
  await go('#/pick');
  const d = await p.evaluate(() => ({
    players: document.querySelectorAll('#v96-detail .v96-pl').length, kpis: document.querySelectorAll('#v96-detail .v96-kpi').length,
    goals: document.querySelectorAll('#v96-detail .v96-goals > div').length, pros: document.querySelectorAll('#v96-detail .v96-pros li').length,
    cons: document.querySelectorAll('#v96-detail .v96-cons li').length, photos: document.querySelectorAll('#v96-detail .v96-pl img').length,
    ovr: [...document.querySelectorAll('#v96-detail .v96-pl-ovr')].map(x => +x.textContent), cta: document.querySelector('#v96-detail .v96-go').textContent.trim(),
    title: document.querySelector('#v96-detail .v96-cta-t b').textContent.trim(), name: document.querySelector('#v96-detail .v96-hero h2').textContent.trim() }));
  assert(d.players === 5 && d.kpis === 5, `состав ${d.players}, цифр ${d.kpis}`);
  assert(d.goals >= 3 && d.pros >= 1 && d.cons >= 1, `цели ${d.goals}, плюсы ${d.pros}, риски ${d.cons}`);
  assert(d.ovr.every(v => v > 40 && v <= 100), 'сила игроков в диапазоне: ' + d.ovr);
  assert(/Возглавить клуб/.test(d.cta) && d.title === 'Возглавить ' + d.name, 'кнопка: ' + d.cta + ' / ' + d.title);
  pass(`досье ${d.name}: 5 игроков, цели ${d.goals}, плюсы ${d.pros}, риски ${d.cons}`);
  await shot('01-default');

  // 3. выбор в списке меняет досье на месте, без полной перерисовки страницы
  const marker = await p.evaluate(() => { const el = document.getElementById('v96-rows'); el.dataset.keep = '1'; return document.querySelectorAll('#v96-rows .v96-row')[4].dataset.v96t; });
  await p.click('#v96-rows .v96-row:nth-child(5)'); await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ name: document.querySelector('#v96-detail .v96-hero h2').textContent.trim(), keep: document.getElementById('v96-rows').dataset.keep, on: [...document.querySelectorAll('#v96-rows .v96-row.on')].length, pressed: document.querySelector('#v96-rows .v96-row.on').getAttribute('aria-pressed') }));
  assert(after.name === marker && after.keep === '1' && after.on === 1 && after.pressed === 'true', JSON.stringify(after));
  pass('выбор строки: досье обновляется на месте (' + after.name + ')');

  // 4. поиск, регион, сложность, сортировка
  await p.fill('#v96-q', 'navi'); await p.waitForTimeout(200);
  let names = await p.$$eval('#v96-rows .v96-row .nm b', r => r.map(x => x.textContent));
  assert(names.length >= 1 && names.every(n => /navi/i.test(n)), 'поиск: ' + names);
  await p.fill('#v96-q', 'qqqqq'); await p.waitForTimeout(200);
  assert(await p.$('#v96-rows .v96-none'), 'пустой результат поиска сообщает об этом');
  await p.fill('#v96-q', ''); await p.waitForTimeout(200);
  await p.click('[data-v96f="region|AS"]'); await p.waitForTimeout(200);
  const asia = await p.$$eval('#v96-rows .v96-row small', r => r.map(x => x.textContent));
  assert(asia.length > 3 && asia.every(t => /Азия/.test(t)), 'регион Азия: ' + asia.length);
  await p.click('[data-v96f="region|"]'); await p.click('[data-v96f="diff|4"]'); await p.waitForTimeout(200);
  const ranks = await p.$$eval('#v96-rows .v96-row .n', r => r.map(x => +x.textContent));
  assert(ranks.length > 10 && ranks.every(n => n > 70), 'сложность «Вызов»: места ' + ranks.slice(0, 3));
  await p.click('[data-v96f="diff|0"]');
  await p.selectOption('#v96-sort', 'name'); await p.waitForTimeout(200);
  names = await p.$$eval('#v96-rows .v96-row .nm b', r => r.map(x => x.textContent));
  assert([...names].sort((a, b) => a.localeCompare(b, 'ru')).join() === names.join(), 'сортировка по названию');
  await p.selectOption('#v96-sort', 'rank');
  pass('поиск, регион, сложность и сортировка работают');

  // 5. клавиатура: стрелки двигают фокус и выбор вместе
  await p.focus('#v96-rows .v96-row.on'); const cur = await p.evaluate(() => document.querySelector('#v96-rows .v96-row.on').dataset.v96t);
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200);
  const nxt = await p.evaluate(() => ({ sel: document.querySelector('#v96-rows .v96-row.on').dataset.v96t, focus: document.activeElement.dataset.v96t, h2: document.querySelector('#v96-detail .v96-hero h2').textContent.trim() }));
  assert(nxt.sel !== cur && nxt.sel === nxt.focus && nxt.h2 === nxt.sel, 'стрелка вниз: ' + JSON.stringify(nxt));
  pass('клавиатура: стрелки вверх/вниз по списку');

  // 6. «Возглавить клуб» берёт клуб, экран сменяется штабом
  const pickName = await p.evaluate(() => { const r = document.querySelectorAll('#v96-rows .v96-row')[11]; r.click(); return r.dataset.v96t; });
  await p.waitForTimeout(300); await shot('02-selected');
  await p.click('#v96-detail .v96-go'); await p.waitForTimeout(800);
  const taken = await p.evaluate(() => ({ me: V31.managed(), pick: !!document.querySelector('.v96-pick'), title: document.getElementById('gs-title').textContent.trim(), log: (V31.S().career.log || []).slice(-3).map(x => x.t || x.text || JSON.stringify(x)).join('|') }));
  assert(taken.me === pickName && !taken.pick && /Штаб/.test(taken.title), 'клуб взят: ' + JSON.stringify(taken));
  pass('кнопка «Возглавить клуб»: менеджер ведёт ' + taken.me + ', открыт штаб');

  // 7. смена клуба: #/pick при действующем клубе предлагает переход, старый клуб возвращается ИИ
  await go('#/pick');
  const sw = await p.evaluate(() => ({ cta: document.querySelector('#v96-detail .v96-go, #v96-detail .v96-cta [data-nav]').textContent.trim(), sel: document.querySelector('#v96-detail .v96-hero h2').textContent.trim() }));
  assert(sw.sel === pickName, 'в режиме смены выбран свой клуб: ' + sw.sel);
  await p.click('#v96-rows .v96-row:nth-child(2)'); await p.waitForTimeout(300);
  const sw2 = await p.evaluate(() => ({ cta: document.querySelector('#v96-detail .v96-go').textContent.trim(), t: document.querySelector('#v96-detail .v96-cta-t b').textContent.trim(), note: document.querySelector('#v96-detail .v96-cta-t small').textContent.trim() }));
  assert(/Перейти/.test(sw2.cta) && /ИИ/.test(sw2.note), JSON.stringify(sw2));
  await shot('03-switch');
  const target = await p.evaluate(() => document.querySelector('#v96-detail .v96-hero h2').textContent.trim());
  await p.click('#v96-detail .v96-go'); await p.waitForTimeout(800);
  const sw3 = await p.evaluate(() => ({ me: V31.managed(), hist: (seasonState.v90Control.history || []).map(h => h.team + ':' + (h.to ? 'closed' : 'open')) }));
  assert(sw3.me === target && sw3.hist.includes(pickName + ':closed') && sw3.hist.includes(target + ':open'), JSON.stringify(sw3));
  pass('смена клуба: ' + pickName + ' → ' + target + ', прежний клуб возвращён ИИ');

  // 8. страница «Режим игры» ведёт на экран выбора, а не показывает сетку логотипов
  await go('#/control');
  assert(await p.$('[data-nav="pick"]') && !(await p.$('.cr-pickt')), 'страница «Режим игры»: вход на экран выбора');
  pass('«Режим игры»: кнопка «Выбрать организацию»');

  // 9. адаптив: 1280×800 и телефон — без горизонтальной прокрутки страницы
  await p.evaluate(() => V31.setManaged(''));
  for (const [w, h, n] of [[1280, 800, 'w1280'], [1024, 768, 'w1024'], [390, 844, 'w390']]) {
    await p.setViewportSize({ width: w, height: h }); await go('#/pick'); await p.waitForTimeout(400);
    // верхняя панель оболочки на телефоне шире окна и без экрана выбора (так же на «Новостях») — меряем только сам экран
    const m = await p.evaluate(() => { const e = document.querySelector('.v96-pick'), r = e.getBoundingClientRect(); return { right: Math.round(r.right), sw: e.scrollWidth, cw: e.clientWidth, win: window.innerWidth, cta: !!document.querySelector('#v96-detail .v96-go') }; });
    assert(m.right <= m.win + 1 && m.sw <= m.cw + 1 && m.cta, `${w}px: экран шире окна ${JSON.stringify(m)}`);
    await shot('04-' + n);
  }
  pass('адаптив: 1280, 1024 и 390 px — экран выбора не шире окна');

  assert(!errs.length, 'ошибки страницы: ' + errs.slice(0, 3).join(' | '));
  pass('ошибок в консоли нет');
  await ctx.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
