// v85 regression: дизайн-проход — индикатор раздела, битые логотипы, значки новостей, мигание строк, шумные новости о капитанах.
const { chromium } = require('playwright');
const path = require('path');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => document.documentElement.classList.contains('cs2-ready'), null, { timeout: 30000 });
  await p.waitForTimeout(3700);
  await p.evaluate(() => { try { CS2Legacy.choose('zero'); } catch (e) {} });

  // 1. индикатор раздела стоит под активным пунктом (в т.ч. под папкой «Major» и под вкладкой для Календаря)
  const inkCheck = async (page, sel) => p.evaluate(([page, sel]) => {
    HS.nav(page);
    const ink = document.querySelector('.pt-ink'), btn = document.querySelector(sel);
    ink.style.setProperty('transition', 'none', 'important'); window.hltvPlaceInk(); void ink.offsetWidth;
    const a = ink.getBoundingClientRect(), r = btn.getBoundingClientRect();
    return Math.abs((a.left + a.width / 2) - (r.left + r.width / 2));
  }, [page, sel]);
  assert(await inkCheck('majorpath', '[data-dd="major"]') < 3, 'ink must sit under the Major folder on the Major Path page');
  assert(await inkCheck('calendar', '.pt-tabs > .hs-tab[data-nav="events"]') < 3, 'calendar belongs to «Турниры», the ink must not jump to «Ещё»');
  assert(await inkCheck('ranking', '.pt-tabs > .hs-tab[data-nav="ranking"]') < 3, 'ink under the active main tab');
  console.log('PASS v85: section indicator follows main tabs and dropdown folders');

  // 2. скрытая битая картинка логотипа не показывается
  const broken = await p.evaluate(() => { HS.nav('teams'); const s = document.createElement('span'); s.className = 'hs-logo img md'; s.innerHTML = '<img hidden src="data:,"><b class="hs-logo-fallback">XX</b>'; document.getElementById('hs-page').appendChild(s); return getComputedStyle(s.querySelector('img')).display; });
  assert(broken === 'none', 'hidden logo image must be display:none, got ' + broken);
  console.log('PASS v85: broken logo images stay hidden behind initials');

  // 3. значки новостей — SVG, без эмодзи; текстовые значки сохраняются
  const g = await p.evaluate(() => [CS2Glyph({ icon: '🧠', cat: 'transfer' }), CS2Glyph({ icon: '5', cat: 'match' }), CS2Glyph({ cat: 'unknown' })]);
  assert(g[0].includes('<svg') && !/🧠/.test(g[0]), 'emoji icon must become an SVG glyph');
  assert(g[1].includes('cs2-gl txt') && g[1].includes('>5<'), 'short text icons stay text');
  assert(g[2].includes('<svg'), 'unknown categories fall back to a neutral glyph');
  console.log('PASS v85: news glyphs are SVG category icons');

  // 4. строка идущего турнира не мигает
  const rowAnim = await p.evaluate(() => { HS.nav('events'); const tr = document.querySelector('#hs-page tr.live'); return tr ? getComputedStyle(tr).animationName : 'none'; });
  assert(rowAnim === 'none', 'live table rows must not pulse, got ' + rowAnim);
  console.log('PASS v85: live rows are highlighted, not blinking');

  // 5. при старте новой игры нет ложных новостей «X — новый капитан» (нормализация ролей базы)
  const captains = await p.evaluate(() => (V29News.all() || []).filter(n => /новый капитан/.test(n.title || '')).length);
  assert(captains === 0, 'boot role normalization must not publish captain news, got ' + captains);
  console.log('PASS v85: no fake captain news at game start');

  // 6. игрок без карт: плитки статистики не показывают «0.00» красным
  const tiles = await p.evaluate(() => { HS.nav('player', 'donk'); return document.querySelectorAll('#hs-page .hs-ptile').length; });
  assert(tiles === 0, 'player without maps must show an empty state instead of zero tiles');
  console.log('PASS v85: empty player stats show an empty state');

  assert(!errs.length, 'page errors: ' + errs.join(' | '));
  await b.close();
  console.log('v85 design polish tests passed');
})().catch(e => { console.error(e); process.exit(1); });
