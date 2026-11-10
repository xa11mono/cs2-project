// v97 · дизайн окон менеджера и режима зрителя: меню по группам, экран ожидания эфира, тренерский штаб, тактика, режим игры.
// Запуск: node tests/v97-design.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v97-')), { viewport: { width: 1672, height: 941 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3500);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(500); }
  await p.waitForFunction(() => window.V97Design && window.V31 && window.HS, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);
  const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(1100); };

  // 1. наблюдатель: меню по группам, страницы клуба приглушены, но остаются в меню
  await go('#/watch');
  const s1 = await p.evaluate(() => ({ mode: document.documentElement.dataset.v97Mode, pg: document.getElementById('hs-page').dataset.pg,
    caps: [...document.querySelectorAll('#gs-side .gs-sub .v97-cap')].map(x => x.textContent), dim: document.querySelectorAll('#gs-side .gs-it.v97-dim').length,
    org: !!document.querySelector('#gs-side .gs-it[data-nav="org"]'), off: !!document.querySelector('#hs-page .v97-off'), nav: !!document.querySelector('#hs-page .v97-off [data-nav="matches"]') }));
  assert(s1.mode === 'spectator' && s1.pg === 'watch', JSON.stringify(s1));
  assert(s1.caps.includes('Эфир') && s1.caps.includes('Стать менеджером') && s1.dim >= 8 && s1.org, 'меню наблюдателя: ' + JSON.stringify(s1));
  assert(s1.off && s1.nav, 'экран ожидания эфира');
  pass('наблюдатель: группы меню ' + s1.caps.join(' / ') + ', экран ожидания эфира');

  // 2. «Режим игры»: два режима, текущий отмечен, вход на выбор клуба
  await go('#/control');
  const c1 = await p.evaluate(() => ({ n: document.querySelectorAll('#hs-page .v97-mode').length, on: document.querySelector('#hs-page .v97-mode.on h3')?.textContent, pick: !!document.querySelector('#hs-page .v97-mode [data-nav="pick"]') }));
  assert(c1.n === 2 && c1.on === 'Наблюдатель' && c1.pick, JSON.stringify(c1));
  pass('«Режим игры»: два режима, сейчас — ' + c1.on);

  // 3. менеджер: группы, счётчик событий, заголовки страниц
  const me = await p.evaluate(() => { const n = HS.ranked().filter(t => !t.isAcademy)[11].name; V31.setManaged(n); V31.S(); try { V31.setAuto('training', true); } catch (e) {} return n; });
  await go('#/training');
  const m1 = await p.evaluate(() => ({ mode: document.documentElement.dataset.v97Mode, caps: [...document.querySelectorAll('#gs-side .gs-sub .v97-cap')].map(x => x.textContent), h1: !!document.querySelector('#hs-page h1'),
    fin: (() => { const b = document.querySelector('#gs-side .gs-it[data-nav="finance"]'), s = document.getElementById('gs-side'); if (!b) return false; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return r.height > 20 && document.elementFromPoint(r.left + 60, r.top + r.height / 2)?.closest('[data-nav]') === b; })() }));
  assert(m1.mode === 'manager' && ['Клуб', 'Команда', 'Рынок', 'Игра'].every(c => m1.caps.includes(c)), JSON.stringify(m1));
  assert(m1.h1, 'у страницы «Тренировки» есть заголовок'); assert(m1.fin, '«Финансы» видны в меню (раньше обрезались)');
  await p.evaluate(() => { const t = HS.teamBy(V31.managed()), a = t.players[1]; V31.ensurePerson(a); a.conf = 20; V31.EV.confidence.check(t); });
  await p.waitForTimeout(1500);
  if (await p.$('#v96-gate:not([hidden]) .v96-x')) await p.click('#v96-gate .v96-x');
  await p.waitForTimeout(1200);
  const badge = await p.evaluate(() => document.querySelector('#gs-side .gs-it[data-nav="inbox"] .v97-badge')?.textContent || '');
  assert(badge === '1', 'счётчик событий в меню: ' + badge);
  pass('менеджер: группы ' + m1.caps.join(' / ') + ', счётчик событий ' + badge);

  // 4. тренерский штаб: карточки и рынок, кнопки «Нанять» в пределах экрана
  await go('#/staff');
  const st = await p.evaluate(() => { const bs = [...document.querySelectorAll('#hs-page [data-v92hire]')]; const vw = document.documentElement.clientWidth;
    return { title: document.getElementById('gs-title').textContent, coach: !!document.querySelector('#hs-page .v97-coach h2')?.textContent, meters: document.querySelectorAll('#hs-page .v97-meter').length, hire: bs.length,
      inside: bs.every(b => { const r = b.getBoundingClientRect(), box = b.closest('.hs-box').getBoundingClientRect(); return r.right <= box.right + 1 && r.right <= vw; }) }; });
  assert(st.title === 'Тренерский штаб' && st.coach && st.meters === 6 && st.hire >= 3 && st.inside, JSON.stringify(st));
  pass('тренерский штаб: ' + st.meters + ' шкал, ' + st.hire + ' кнопок «Нанять» видны целиком');

  // 5. тактика: таблица «что чем бьётся» из CS2Tactics.M, выбор плана работает
  await go('#/tactics');
  const tc = await p.evaluate(() => ({ rows: document.querySelectorAll('#hs-page .v97-rps tbody tr').length, sel: document.querySelectorAll('#hs-page select[data-v92tac]').length }));
  assert(tc.rows >= 3 && tc.sel >= 10, JSON.stringify(tc));
  pass('тактика: ' + tc.rows + ' строк «что чем бьётся», ' + tc.sel + ' списков');

  // 6. все страницы карьеры рисуются и не шире окна (1672 и 390)
  for (const w of [1672, 390]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300);
    for (const pg of ['desk', 'org', 'inbox', 'training', 'tactics', 'staff', 'scout', 'negotiate', 'academy', 'finance', 'career', 'control', 'decisions', 'watch']) {
      await go('#/' + pg);
      const r = await p.evaluate(() => { const vw = document.documentElement.clientWidth; let over = 0;   // содержимое страницы не вылезает за окно (кроме блоков со своей прокруткой)
        document.querySelectorAll('#hs-page *').forEach(e => { const b = e.getBoundingClientRect(); if (b.width && b.right > vw + 1) { for (let q = e.parentElement; q && q.id !== 'hs-page'; q = q.parentElement) { if (/auto|hidden|scroll/.test(getComputedStyle(q).overflowX)) return; } over = Math.max(over, Math.round(b.right - vw)); } });
        return { bad: /Не удалось показать страницу/.test(document.getElementById('hs-page').innerHTML), over }; });
      assert(!r.bad && r.over <= 1, pg + ' @' + w + ': ' + JSON.stringify(r));
    }
  }
  pass('страницы карьеры и эфира: без ошибок, содержимое не шире окна на 1672 и 390 px');
  assert(!errs.length, 'ошибки страницы: ' + errs.join(' | '));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert(html.includes('css/v97-design.css?v=97') && html.includes('js/manager/v97-design.js?v=97'), 'v97 подключён');
  console.log('v97 design: all checks passed');
  await ctx.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
