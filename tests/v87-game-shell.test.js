// v87 regression: игровая оболочка — боковое меню, шапка экрана, «Продолжить», экраны с фото.
const { chromium } = require('playwright');
const path = require('path');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => document.documentElement.classList.contains('cs2-ready'), null, { timeout: 30000 });
  await p.waitForTimeout(3700);
  await p.evaluate(() => { try { CS2Legacy.choose('history'); } catch (e) {} });
  await p.waitForTimeout(800);

  // 1. боковое меню построено из навигации портала и ведёт на страницы
  const side = await p.evaluate(() => {
    const s = document.getElementById('gs-side'); if (!s) return null;
    const navs = [...s.querySelectorAll('[data-nav]')].map(b => b.dataset.nav);
    const oldNavVisible = getComputedStyle(document.querySelector('.pt-nav')).display !== 'none';
    return { navs, oldNavVisible, left: s.getBoundingClientRect().width };
  });
  assert(side, 'sidebar must exist');
  ['home', 'news', 'matches', 'events', 'ranking', 'players', 'teams', 'transfers', 'stats', 'org', 'settings'].forEach(k => assert(side.navs.includes(k), 'sidebar must contain ' + k));
  assert(!side.oldNavVisible, 'old tab bar must be hidden');
  assert(side.left >= 200, 'sidebar is expanded at 1600px');
  await p.click('#gs-side .gs-it[data-nav="ranking"]'); await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ page: HS.S.page, on: document.querySelector('#gs-side .gs-it.on')?.dataset.nav, title: document.getElementById('gs-title')?.textContent }));
  assert(r.page === 'ranking' && r.on === 'ranking' && r.title === 'Рейтинг', 'sidebar navigates and marks the active item: ' + JSON.stringify(r));
  console.log('PASS v87: sidebar mirrors portal navigation, navigates and marks the active section');

  // 2. «Продолжить» — это прежняя кнопка пропуска (id и подпись сохранены), часы рядом
  const cont = await p.evaluate(() => { const b = document.getElementById('pt-skip'); return b && { cls: b.className, label: !!b.querySelector('#pt-skip-l'), text: b.textContent, h: b.getBoundingClientRect().height, dd: !!document.getElementById('pt-skipdd') }; });
  assert(cont && /gs-continue/.test(cont.cls) && cont.label && /Продолжить/.test(cont.text), 'continue button wraps #pt-skip and keeps #pt-skip-l');
  assert(cont.h >= 40, 'continue button is the large primary control');
  assert(cont.dd, 'skip-days menu stays next to the continue button');
  console.log('PASS v87: continue button reuses the skip control');

  // 3. рейтинг: фото пятёрки; команда: карточки с ролью; игрок: кольца состояния
  const rank = await p.evaluate(() => document.querySelectorAll('#hs-page .hs-rankrow .gs-lineup img').length);
  assert(rank >= 10, 'ranking rows show lineup photos, got ' + rank);
  const team = await p.evaluate(async () => { HS.nav('team', HS.ranked()[0].name); await new Promise(r => setTimeout(r, 300)); return { roles: document.querySelectorAll('#hs-page .tm-roster .gs-role').length, tint: getComputedStyle(document.getElementById('hs-page')).getPropertyValue('--gs-team').trim() }; });
  assert(team.roles >= 5, 'roster cards carry role labels');
  assert(team.tint && team.tint !== '120,140,170', 'team colour comes from the precomputed logo palette under file:// (' + team.tint + ')');
  const rings = await p.evaluate(async () => { const n = HS.ranked()[0].players[0].nick; HS.nav('player', n); await new Promise(r => setTimeout(r, 300)); return document.querySelectorAll('#hs-page .gs-rings .gs-ring').length; });
  assert(rings === 3, 'player header shows form, morale and freshness rings');
  console.log('PASS v87: ranking lineups, roster cards and player condition rings');

  // 4. карьера: клуб менеджера в меню и карточки состава в штабе
  const career = await p.evaluate(async () => { const me = HS.ranked()[2].name; V31.setManaged(me); HS.nav('org'); await new Promise(r => setTimeout(r, 400)); return { brand: document.querySelector('#gs-side .gs-who b')?.textContent, me, cards: document.querySelectorAll('#hs-page .gs-staff .gs-card').length, chips: document.querySelectorAll('#hs-page .gs-staff .gs-st').length }; });
  assert(career.brand === career.me, 'sidebar brand shows the managed club');
  assert(career.cards >= 5 && career.chips >= 5, 'org page shows the starting five with status chips');
  console.log('PASS v87: managed club in the sidebar, staff cards on the org page');

  // 5. узкий экран: рельс с иконками, папка раскрывает меню поверх контента
  await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(300);
  const rail = await p.evaluate(() => ({ railed: document.documentElement.classList.contains('gs-railed'), w: document.getElementById('gs-side').getBoundingClientRect().width }));
  assert(rail.railed && rail.w <= 80, 'sidebar collapses to a rail below 1100px');
  await p.click('#gs-side [data-gs-tog="major"]'); await p.waitForTimeout(350);
  const peek = await p.evaluate(() => document.getElementById('gs-side').getBoundingClientRect().width);
  assert(peek > 200, 'folder opens the menu over the content in rail mode');
  await p.click('#gs-side .gs-grp[data-gs-grp="major"] .gs-sub [data-nav]'); await p.waitForTimeout(300);
  assert(await p.evaluate(() => !document.getElementById('gs-side').classList.contains('gs-peek')), 'choosing a page closes the overlay');
  console.log('PASS v87: rail and overlay menu on narrow screens');

  // 6. все страницы рисуются без ошибок
  const broken = await p.evaluate(async () => { const out = []; for (const pg of ['home', 'news', 'matches', 'events', 'calendar', 'ranking', 'players', 'teams', 'transfers', 'stats', 'awards', 'season', 'settings', 'watch', 'org', 'training', 'finance']) { HS.nav(pg); await new Promise(r => setTimeout(r, 40)); if (/Не удалось показать страницу/.test(document.getElementById('hs-page').innerHTML)) out.push(pg); } return out; });
  assert(!broken.length, 'pages failed: ' + broken.join(','));
  assert(!errs.length, 'page errors: ' + errs.join(' | '));
  console.log('PASS v87: all sections render without errors');
  console.log('v87 game shell tests passed');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
