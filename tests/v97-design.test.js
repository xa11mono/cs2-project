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
    caps: [...document.querySelectorAll('#gs-side .ax-nav > .ax-it[data-nav]')].map(x => x.dataset.nav), more: !!document.querySelector('#gs-side .v97-moretg'), dim: document.querySelectorAll('#gs-side .gs-it.v97-dim').length,
    org: !!document.querySelector('#gs-side .gs-it[data-nav="org"]'), off: !!document.querySelector('#hs-page .v97-off'), nav: !!document.querySelector('#hs-page .v97-off [data-nav="matches"]') }));
  assert(s1.mode === 'spectator' && s1.pg === 'watch', JSON.stringify(s1));
  // v100: меню наблюдателя — эфир, матчи, турниры, Pick'Em, прогнозы…; страниц клуба в нём нет
  assert(['home', 'watch', 'matches', 'pickem', 'predict'].every(k => s1.caps.includes(k)) && !s1.caps.includes('squad') && !s1.more && s1.dim === 0, 'меню наблюдателя: ' + JSON.stringify(s1));
  assert(s1.off && s1.nav, 'экран ожидания эфира');
  pass('наблюдатель: меню ' + s1.caps.join(' / ') + ', экран ожидания эфира');

  // 2. «Режим игры»: два режима, текущий отмечен, вход на выбор клуба
  await go('#/control');
  const c1 = await p.evaluate(() => ({ n: document.querySelectorAll('#hs-page .v97-mode').length, on: document.querySelector('#hs-page .v97-mode.on h3')?.textContent, pick: !!document.querySelector('#hs-page .v97-mode [data-nav="pick"]') }));
  assert(c1.n === 2 && c1.on === 'Наблюдатель' && c1.pick, JSON.stringify(c1));
  pass('«Режим игры»: два режима, сейчас — ' + c1.on);

  // 3. менеджер: группы, счётчик событий, заголовки страниц
  const me = await p.evaluate(() => { const n = HS.ranked().filter(t => !t.isAcademy)[11].name; V31.setManaged(n); V31.S(); try { V31.setAuto('training', true); } catch (e) {} return n; });
  await go('#/training');
  const m1 = await p.evaluate(() => ({ mode: document.documentElement.dataset.v97Mode, caps: [...document.querySelectorAll('#gs-side .ax-nav > .ax-it[data-nav]')].map(x => x.dataset.nav), h1: !!document.querySelector('#hs-page h1'),
    fin: (() => { const b = document.querySelector('#gs-side .ax-it[data-nav="org"], #gs-side .gs-it[data-nav="finance"]'), s = document.getElementById('gs-side'); if (!b) return false; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return r.height > 20 && document.elementFromPoint(r.left + 60, r.top + r.height / 2)?.closest('[data-nav]') === b; })() }));
  // v100: меню менеджера — Главная, Менеджер, Команда, Трансферы, Соревнования, Календарь, Организация (+ «Мир CS2»)
  assert(m1.mode === 'manager' && ['desk', 'squad', 'negotiate', 'clubev', 'org'].every(k => m1.caps.includes(k)), JSON.stringify(m1));
  assert(await p.evaluate(() => [...document.querySelectorAll('#hs-page .v99-tabs .v99-tab')].map(x => x.dataset.nav).join() === 'squad,training,tactics,staff,academy' && !!document.querySelector('#hs-page .v99-tab.on[data-nav="training"]') && !!document.querySelector('#gs-side .ax-it.on[data-nav="squad"], #gs-side .gs-it.on[data-nav="squad"]')), 'v99.1: «Тренировки» — вкладка раздела «Команда»');
  assert(m1.h1, 'у страницы «Тренировки» есть заголовок'); assert(m1.fin, 'раздел «Организация» виден в меню');
  await p.evaluate(() => { const t = HS.teamBy(V31.managed()), a = t.players[1]; V31.ensurePerson(a); a.conf = 20; V31.EV.confidence.check(t); });
  await p.waitForTimeout(1500);
  if (await p.$('#v96-gate:not([hidden]) .v96-x')) await p.click('#v96-gate .v96-x');
  await p.waitForTimeout(1200);
  const badge = await p.evaluate(() => (document.querySelector('#gs-side .ax-it[data-nav="desk"] .ax-badge') || document.querySelector('#gs-side .gs-it[data-nav="desk"] .v97-badge'))?.textContent || '');
  assert(badge === '1', 'счётчик событий в меню: ' + badge);
  pass('менеджер: меню ' + m1.caps.join(' / ') + ', счётчик событий ' + badge);

  // 3б. состав: роли, скамейка, сделки по времени
  await go('#/squad');
  const sq = await p.evaluate(async () => {
    const S = window.V98Squad, t = HS.teamBy(V31.managed()), out = {};
    const rifler = t.players.find(x => x.role !== 'IGL' && x.role !== 'AWPer'), oldCap = t.players.find(x => x.role === 'IGL');
    out.role = S.setRole(rifler.nick, 'IGL').ok && rifler.role === 'IGL' && (!oldCap || oldCap.role === 'Rifler') && t.players.filter(x => x.role === 'IGL').length === 1;
    // запасной: если скамейка пуста — сажаем свободного агента
    if (!S.bench().length) { const f = transferState.freeAgents.find(x => !x.reservedFor && !x.benchFrom); f.status = 'BENCH'; f.benchFrom = t.name; f.reservedFor = t.name; }
    const b = S.bench()[0].nick, o = t.players[4].nick; out.swap = S.swap(o, b).ok && t.players.some(x => x.nick === b) && S.bench().some(x => x.nick === o) && t.players.length === 5;
    transferState.v30Bench = [{ nick: o, team: t.name, since: 0 }]; await new Promise(r => setTimeout(r, 1800));
    out.kept = !transferState.v30Bench.some(x => x.team === t.name) && S.bench().some(x => x.nick === o);
    // сделка: ответ клуба приходит не сразу, а по игровому времени
    V31.org(t.name).budget = 9e6; const seller = HS.ranked().filter(x => !x.isAcademy && x.name !== t.name)[20], pl = seller.players.find(x => x.role !== 'AWPer' && x.role !== 'IGL');
    V31Nego.startNeg(pl.nick); const n = V31Nego.negs()[0]; out.queued = S.queue(n.id, 'offer', [n.ask]) && n.st === 'offer' && !!n.wait && n.wait.due - n.wait.since >= 2 * 864e5;
    out.early = S.settle() === 0 && n.st === 'offer'; seasonState.calendar.currentMs = n.wait.due + 1; out.late = S.settle() === 1 && n.st === 'terms' && !n.wait;
    return out; });
  assert(sq.role && sq.swap && sq.kept && sq.queued && sq.early && sq.late, 'состав и сделки: ' + JSON.stringify(sq));
  await go('#/squad');
  assert(await p.evaluate(() => document.querySelectorAll('#hs-page .v98-row select[data-v98role]').length === 5 && document.querySelectorAll('#hs-page .v98-row.bench').length >= 1), 'страница «Состав»: 5 списков ролей и скамейка');
  pass('состав: смена капитана, замена с запасным, скамейка не распускается сама; ответ клуба — через игровые дни');

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
    for (const pg of ['desk', 'squad', 'org', 'inbox', 'training', 'tactics', 'staff', 'scout', 'negotiate', 'academy', 'finance', 'career', 'control', 'decisions', 'watch']) {
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
  assert(html.includes('css/v97-design.css?v=113') && html.includes('js/manager/v97-design.js?v=113'), 'v97 подключён');
  console.log('v97 design: all checks passed');
  await ctx.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
