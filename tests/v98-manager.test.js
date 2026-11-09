// v98 regression: главное окно тренера, матч дня (матч своей команды не пролистывается), итог матча, восстановление
// ожидающего матча после перезагрузки, карточки состава на тренировках, кнопка «Играть за эту команду».
// Запуск: node tests/v98-manager.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v98-'));
  const open = async () => {
    const ctx = await chromium.launchPersistentContext(udd, { viewport: { width: 1600, height: 1000 } });
    const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto('file://' + dir + '/index.html');
    // окно «Как начать карьеру?» появляется не сразу — ждём его до 8 с (после перезагрузки его уже нет)
    for (let i = 0; i < 16; i++) { await p.waitForTimeout(500); const lg = await p.$('#v84-legacy-modal [data-lg="zero"]'); if (lg) { await lg.click(); await p.waitForTimeout(400); break; } if (i >= 5 && await p.evaluate(() => !!(seasonState && seasonState.v84LegacyChoice))) break; }
    await p.waitForFunction(() => window.CS2MatchDay && window.HS && window.HS.PAGES.hub && seasonState.v88Seed, null, { timeout: 40000 });
    return { ctx, p, errs };
  };
  const pass = m => console.log('PASS ' + m);
  let { ctx, p, errs } = await open();

  // 1. выбор клуба: кнопка в шапке досье ведёт в главное окно
  await p.evaluate(() => window.HS.nav('pick')); await p.waitForTimeout(500);
  const pick = await p.evaluate(() => { const rows = document.querySelectorAll('#v96-rows .v96-row'); rows[70].click(); return rows[70].dataset.v96t; });
  await p.waitForTimeout(300);
  await p.click('#v96-detail .v98-hero-go'); await p.waitForTimeout(900);
  const hub = await p.evaluate(() => ({ me: V31.managed(), page: HS.S.page, panels: [...document.querySelectorAll('#hs-page .v98-p > header h3')].map(x => x.textContent), roster: document.querySelectorAll('#hs-page .v98-roster tbody tr').length, stars: document.querySelectorAll('#hs-page .v98-roster .v98-stars').length, menu: !!document.querySelector('#hs-root .pt-menu[data-menu="game"] [data-nav="hub"]') }));
  assert(hub.me === pick && hub.page === 'hub', 'клуб взят, открыто главное окно: ' + JSON.stringify(hub));
  ['Следующий матч', 'Отчёт о сопернике', 'Календарь', 'Финансы', 'Подготовка', 'Последние матчи', 'Состав', 'Мировой рейтинг'].forEach(t => assert(hub.panels.includes(t), 'панель «' + t + '»: ' + hub.panels.join(', ')));
  assert(hub.roster >= 5 && hub.stars >= 10 && hub.menu, 'состав со звёздами уровня/потенциала, пункт меню: ' + JSON.stringify(hub));
  pass(`v98: hero button takes ${pick} → coach hub with ${hub.panels.length} panels, ${hub.roster} players`);

  // 2. тренировки: карточки состава
  await p.evaluate(() => window.HS.nav('training')); await p.waitForTimeout(600);
  const tc = await p.evaluate(() => ({ cards: document.querySelectorAll('#hs-page .v98-tc').length, bars: document.querySelectorAll('#hs-page .v98-tc .v98-bar').length }));
  assert(tc.cards >= 5 && tc.bars === tc.cards * 4, 'карточки состава на тренировке: ' + JSON.stringify(tc));
  pass(`v98: training shows ${tc.cards} player cards with 4 skill bars each`);

  // 3. перемотка останавливается перед матчем своей команды
  const md = await p.evaluate(async () => {
    const hide = () => document.querySelectorAll('#v96-gate').forEach(x => { x.hidden = true; });
    for (let i = 0; i < 14 && !CS2MatchDay.pending(); i++) { await window.v33SkipDays(7); hide(); }
    const pd = CS2MatchDay.pending();
    return { pd, paused: v15IsCalendarPaused(), date: new Date(seasonState.calendar.currentMs).toISOString().slice(0, 10) };
  });
  assert(md.pd && md.pd.opp && md.paused, 'перемотка остановилась перед матчем: ' + JSON.stringify(md));
  await p.waitForTimeout(900);
  const ov = await p.evaluate(() => ({ open: !!document.querySelector('#v98-ov:not([hidden])'), btns: [...document.querySelectorAll('#v98-ov [data-v98md]')].map(b => b.dataset.v98md) }));
  assert(ov.open && ov.btns.includes('quick') && ov.btns.includes('prep'), 'окно «Матч дня»: ' + JSON.stringify(ov));
  pass(`v98: skip halts before own match (${md.pd.kind}, vs ${md.pd.opp}, ${md.date}); match-day window offers ${ov.btns.join('/')}`);

  // 4. ожидающий матч переживает перезагрузку, время не остаётся на паузе без окна
  await p.waitForTimeout(700);
  const sv = await p.evaluate(() => { try { saveSeasonState(); window.v34SaveTournament && window.v34SaveTournament(); } catch (e) { return 'ERR ' + e.message; } return JSON.stringify((JSON.parse(localStorage.getItem('cs2_season_state_v61')) || {}).v98 || null).slice(0, 200); });
  assert(/pending/.test(sv), 'ожидающий матч записан в сейв: ' + sv);
  await ctx.close(); ({ ctx, p, errs } = await open()); await p.waitForTimeout(3500);
  const rs = await p.evaluate(() => ({ pd: CS2MatchDay.pending(), open: !!document.querySelector('#v98-ov:not([hidden])'), saved: JSON.stringify((seasonState.v98 || {}).pending || null).slice(0, 160), me: V31.managed(), paused: seasonState.calendar.paused }));
  assert(rs.pd && rs.pd.key === md.pd.key && rs.open, 'после перезагрузки матч ждёт и окно открыто: ' + JSON.stringify(rs));
  pass('v98: pending match restored after reload, window reopened');

  // 5. «Продолжить» при ожидающем матче — окно, а не пропуск
  await p.evaluate(() => { document.querySelector('#v98-ov').hidden = true; });
  const d0 = await p.evaluate(() => seasonState.calendar.currentMs);
  await p.click('#pt-skip'); await p.waitForTimeout(500);
  // сначала — обязательные решения (окно v96, например план тренировок), затем окно матча; день при этом не проходит
  const cont = await p.evaluate(d => ({ same: seasonState.calendar.currentMs === d, open: !!document.querySelector('#v98-ov:not([hidden])'), gate: !!document.querySelector('#v96-gate:not([hidden])') }), d0);
  assert(cont.same && (cont.open || cont.gate), '«Продолжить» не пропускает матч: ' + JSON.stringify(cont));
  if (!cont.open) { await p.evaluate(() => { document.querySelectorAll('#v96-gate').forEach(x => { x.hidden = true; }); window.CS2MatchDay.open(); }); await p.waitForTimeout(300); }
  pass('v98: «Продолжить» opens the match window instead of skipping');

  // 6. быстрый результат: матч сыгран, итог, время снова идёт
  await p.click('[data-v98md="quick"]'); await p.waitForTimeout(900);
  const res = await p.evaluate(() => ({ kicker: document.querySelector('#v98-ov .v98-kicker')?.textContent, h: document.querySelector('#v98-ov h2')?.textContent, pd: CS2MatchDay.pending(), paused: v15IsCalendarPaused(), last: CS2MatchDay.results()[0] }));
  assert(/Победа|Поражение/.test(res.kicker || '') && /\d+ : \d+/.test(res.h || '') && !res.pd && !res.paused && res.last, 'итог матча: ' + JSON.stringify(res));
  const won = res.kicker === 'Победа', nums = (res.h.match(/(\d+) : (\d+)/) || []).slice(1).map(Number);
  assert(won ? nums[0] > nums[1] : nums[0] < nums[1], 'счёт сходится с исходом: ' + res.h + ' / ' + res.kicker);
  pass(`v98: quick result — ${res.kicker}, ${res.h}; time resumes`);

  // 7. флажок «не останавливаться»
  await p.click('[data-v98md="close"]'); await p.waitForTimeout(300);
  const au = await p.evaluate(async () => { seasonState.v98AutoMatches = true; const hide = () => document.querySelectorAll('#v96-gate').forEach(x => { x.hidden = true; }); for (let i = 0; i < 3; i++) { await window.v33SkipDays(7); hide(); } const r = { pd: CS2MatchDay.pending() }; seasonState.v98AutoMatches = false; return r; });
  assert(!au.pd, 'с флажком матчи своей команды не останавливают время: ' + JSON.stringify(au));
  pass('v98: «не останавливаться на матчах моей команды» restores the old flow');

  assert(!errs.length, 'ошибки на странице: ' + errs.join(' | '));
  pass('v98: no page errors');
  await ctx.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
