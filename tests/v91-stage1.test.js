// v91 · Этап 1: калибровка рынка, стратегии клубов, ожидания игроков, контракт с руководством.
// Запуск: node tests/v91-stage1.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v91-')), { viewport: { width: 1500, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3000);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(400); }
  await p.waitForFunction(() => window.CS2ClubStrategy && window.CS2Expect && window.CS2Board && window.CS2Control && window.V34Roster, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);

  // 1. подтверждённая нужда → решение без «кубика»: каждый клуб в поиске получает рассмотрение на первом же тике
  const m = await p.evaluate(() => {
    const R = window.V34Roster, a0 = R.allowSearch, r0 = R.replaceable;
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts).slice(40, 52);
    const set = new Set(pro.map(t => t.name));
    R.allowSearch = t => set.has(t.name); R.replaceable = () => true;
    transferState.v33WindowUntil = seasonState.calendar.currentMs + 7 * 864e5; transferState.v33Changes = {};
    pro.forEach(t => { t.v30LastMoveRun = null; t.v90AiGraceUntil = 0; t.tempStandIn = null;
      // явное слабое звено: обычный рифлер заметно уступает партнёрам (нужда, которую Roster AI подтвердил бы сигналами)
      const x = t.players.find(p => (!p.status || p.status === 'STARTER') && p.role !== 'IGL' && p.role !== 'AWPer' && window.CS2Stature.tier(p) === 'regular');
      if (x) Object.assign(x, { firepower: (+x.firepower || 70) - 14, tacticalIQ: (+x.tacticalIQ || 70) - 10, joinedRun: null }); });
    const n0 = window.CS2Journal.list({ type: 'MARKET_DECISION' }).length;
    let decided = 0;
    try { for (let i = 0; i < 4; i++) { window.v30MarketTick('week'); } } finally { R.allowSearch = a0; R.replaceable = r0; }
    const dec = window.CS2Journal.list({ type: 'MARKET_DECISION' }).slice(0, window.CS2Journal.list({ type: 'MARKET_DECISION' }).length - n0).filter(e => set.has(e.team));
    const looks = pro.map(t => R.st(t.name).looks || 0);
    return { decided: new Set(dec.map(e => e.team)).size, withStrategy: dec.filter(e => e.strategy).length, total: dec.length, looks: looks.reduce((a, b) => a + b, 0) };
  });
  assert(m.decided >= 4 && m.withStrategy === m.total && m.looks >= 4, 'рынок по подтверждённой нужде: ' + JSON.stringify(m));
  pass(`v91: confirmed need is acted on without dice (${m.decided} clubs decided in 4 weekly ticks, strategy logged, ${m.looks} market looks counted)`);

  // 2. стратегии клубов: кризис, чемпион, развитие молодых, сохранение; поправка ограничена и не обходит порог
  const s = await p.evaluate(() => {
    const CS = window.CS2ClubStrategy, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const champ = CS.of(pro[0]);
    const c = pro[30], keep = { h: c.history, s: c.seasonStartRank, st: c.streak };
    c.history = [{ tournament: 'A', place: 15 }, { tournament: 'B', place: 14 }, { tournament: 'C', place: 13 }].concat(c.history || []); c.seasonStartRank = 18; c.streak = -5;
    const crisis = CS.of(c);
    Object.assign(c, { history: keep.h, seasonStartRank: keep.s, streak: keep.st });
    const ac = teams.find(a => a.isAcademy && (a.academyParent || a.parentTeam));
    const parent = ac && teams.find(t => t.name === (ac.academyParent || ac.parentTeam));
    const ys = parent ? { key: 'youth' } : null;
    const bA = parent ? CS.bonus(parent, { src: 'academy', p: { age: 19 } }, ys).v : null, bB = parent ? CS.bonus(parent, { src: 'buy', p: { age: 26 } }, ys).v : null;
    const max = window.CS2Config.get('club.maxBonus');
    const extreme = CS.bonus(pro[0], { src: 'buy', p: { age: 26, nick: 'x' } }, { key: 'champion' }).v;
    return { champ: champ.key, crisis: crisis.key, crisisWhy: crisis.why, bA, bB, max, extreme, keepExtra: CS.extraNeed(pro[60], { key: 'keep' }) };
  });
  assert(s.champ === 'champion' && s.crisis === 'crisis', 'стратегии: ' + JSON.stringify(s));
  assert(s.bA > s.bB && Math.abs(s.extreme) <= s.max && s.keepExtra > 0, 'поправка стратегии: ' + JSON.stringify(s));
  pass(`v91: club strategies — leader buys stars, slump → crisis (${s.crisisWhy}); youth club prefers its academy (+${s.bA} vs ${s.bB}); bonus capped at ±${s.max}`);

  // 3. ожидания игроков: причины отказа видны и записаны
  const e = await p.evaluate(() => {
    const X = window.CS2Expect, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const st = t => t.players.filter(x => !x.status || x.status === 'STARTER');
    // снайпер на позицию рифлера
    const awp = st(pro[50]).find(x => x.role === 'AWPer'), rif = st(pro[45]).find(x => x.role !== 'AWPer' && x.role !== 'IGL');
    const role = awp && rif ? X.evaluate(awp, pro[50], pro[45], { out: rif }).reasons.map(r => r.code) : ['skip'];
    // молодой амбициозный — в пятёрку, где он будет намного слабее
    const kid = Object.assign(JSON.parse(JSON.stringify(st(pro[90])[0])), { nick: 'v91kid', age: 18, firepower: 62, tacticalIQ: 62, clutch: 62, utility: 62, role: 'Rifler' });
    window.V31.ensurePerson(kid); kid.pers.amb = 16;
    const out0 = st(pro[1]).find(x => x.role !== 'AWPer' && x.role !== 'IGL');
    const play = X.evaluate(kid, pro[90], pro[1], { out: out0 }).reasons.map(r => r.code);
    // амбициозный игрок с действующим контрактом — из №5 в №60
    const amb = st(pro[4]).find(x => x.role === 'Rifler') || st(pro[4])[1]; window.V31.ensurePerson(amb); const keepAmb = amb.pers.amb, keepC = amb.contractUntil; amb.pers.amb = 17; amb.contractUntil = (seasonState.currentSeason || 1) + 2;
    const ambR = X.evaluate(amb, pro[4], pro[59]).reasons.map(r => r.code); amb.pers.amb = keepAmb; amb.contractUntil = keepC;
    // отказ через playerWillAccept — в журнале
    const n0 = window.CS2Journal.blocks().length; const acc = playerWillAccept(amb, pro[4], pro[100]);
    const logged = window.CS2Journal.blocks().slice(0, window.CS2Journal.blocks().length - n0).some(b => b.kind === 'refusal');
    return { role, play, ambR, acc, logged };
  });
  assert((e.role.includes('PLAYER_ROLE') || e.role[0] === 'skip') && e.play.includes('PLAYER_PLAYTIME') && e.ambR.includes('PLAYER_AMBITION'), 'ожидания: ' + JSON.stringify(e));
  assert(e.acc === false && e.logged, 'отказ записан: ' + JSON.stringify(e));
  pass(`v91: player expectations — role ${e.role.join(',')}, playing time ${e.play.join(',')}, ambition ${e.ambR.join(',')}; refusals journaled`);

  // 4. контракт с руководством: «с 35-го на 12-е без трофея» — успех; «3-е место, но без денег и с конфликтами» — нет
  const b = await p.evaluate(() => {
    const B = window.CS2Board, K = window.CS2Control, pro = () => teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const t = pro()[34]; K.take(t.name); B.tick();
    const k = B.contract(); const r0 = k.r0;
    // поднимаем клуб на 12-е место, выход на турнир Tier-1, бюджет не тронут
    t.pts = pro()[11].pts + 1; t.history = [{ tournament: 'IEM Test 2026', place: 6, prestige: 'regular' }].concat(t.history || []);
    const good = B.score(k);
    // топ-3 клуб: место держит, но бюджет ушёл в минус, мораль упала
    const top = pro()[2]; K.take(top.name); B.tick(); const k2 = B.contract();
    window.V31.org(top.name).budget = -200000; top.players.forEach(x => { x.morale = 50; });
    const bad = B.score(k2);
    // увольнение: две плохие оценки и прошло 40% срока
    top.pts = pro()[70].pts - 1;   // и клуб провалился в рейтинге
    k2.from -= 400 * 864e5; B.review(k2, 'тест 1'); B.review(k2, 'тест 2'); B.tick();
    const fired = { mode: K.mode(), status: k2.status, offers: (window.CS2Manager2.state().offers || []).length };
    return { r0, good: good.conf, goodParts: Object.fromEntries(Object.entries(good.parts).map(([x, v]) => [x, Math.round(v.v * 100)])), bad: bad.conf, badParts: Object.fromEntries(Object.entries(bad.parts).map(([x, v]) => [x, Math.round(v.v * 100)])), fired };
  });
  assert(b.good >= 75 && b.good - b.bad >= 20, 'оценка совета: ' + JSON.stringify(b));
  assert(b.fired.mode === 'observer' && b.fired.status === 'fired' && b.fired.offers > 0, 'увольнение: ' + JSON.stringify(b.fired));
  pass(`v91: board — #${b.r0}→#12 without a trophy: ${b.good}% ${JSON.stringify(b.goodParts)}; top-3 but broke and unhappy: ${b.bad}% ${JSON.stringify(b.badParts)}; firing works`);

  // 6. профиль сейва: в двух новых играх — разные бюджеты и характеры клубов, но в коридорах; после перезагрузки — те же
  const prof = async (page) => page.evaluate(() => {
    const V = window.V31, D = window.V34Roster, P = window.CS2SaveProfile, T = n => teams.find(t => t.name === n);
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const low = pro.slice(60).map(t => V.org(t.name).budget);
    return { seed: P.state().seed, falcons: T('Team Falcons') ? V.org('Team Falcons').budget : null, navi: T('NAVI') ? V.org('NAVI').budget : null,
      faze: D.dna('FAZE'), spirit: D.dna('Team Spirit'), lowMin: Math.min(...low), lowMax: Math.max(...low), lowDistinct: new Set(low).size };
  });
  const a1 = await prof(p);
  await p.reload(); await p.waitForTimeout(3000); await p.waitForFunction(() => window.CS2SaveProfile && window.V31, null, { timeout: 30000 });
  const a1r = await prof(p);
  const ctx2 = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v91b-')), { viewport: { width: 1200, height: 800 } });
  const p2 = ctx2.pages()[0] || await ctx2.newPage(); p2.on('dialog', d => d.accept());
  await p2.goto('file://' + dir + '/index.html'); await p2.waitForTimeout(3000); await p2.waitForFunction(() => window.CS2SaveProfile && window.V31 && window.V34Roster, null, { timeout: 30000 });
  const a2 = await prof(p2); await ctx2.close();
  const inR = (v, lo, hi) => v != null && v >= lo && v <= hi;
  assert(a1.seed && a2.seed && a1.seed !== a2.seed, 'у сейвов разные зёрна: ' + JSON.stringify([a1.seed, a2.seed]));
  assert(a1r.seed === a1.seed && a1r.falcons === a1.falcons && JSON.stringify(a1r.faze) === JSON.stringify(a1.faze), 'после перезагрузки профиль тот же');
  assert(inR(a1.falcons, 6e6, 9e6) && inR(a2.falcons, 6e6, 9e6) && a1.falcons !== a2.falcons, 'Falcons всегда богаты, но по-разному: ' + [a1.falcons, a2.falcons]);
  assert(inR(a1.navi, 3.5e6, 6.5e6) && inR(a2.navi, 3.5e6, 6.5e6), 'NAVI в коридоре богатых: ' + [a1.navi, a2.navi]);
  const base = { faze: .2, spirit: .9 };
  assert(Math.abs(a1.faze.youth - base.faze) <= .151 && Math.abs(a2.faze.youth - base.faze) <= .151 && a1.faze.youth !== a2.faze.youth, 'FaZe: ставка на молодёжь меняется в коридоре: ' + [a1.faze.youth, a2.faze.youth]);
  assert(a1.spirit.youth >= .75 && a2.spirit.youth >= .75, 'Spirit остаётся клубом молодёжи: ' + [a1.spirit.youth, a2.spirit.youth]);
  assert(a2.lowDistinct > 5 && a2.lowMin >= 150000, 'бюджеты клубов вне топ-60 различаются (чистый сейв): ' + JSON.stringify(a2));
  pass(`v91: save profile — Falcons $${(a1.falcons / 1e6).toFixed(1)}M / $${(a2.falcons / 1e6).toFixed(1)}M, FaZe youth ${a1.faze.youth} / ${a2.faze.youth}, Spirit youth ${a1.spirit.youth} / ${a2.spirit.youth}; stable after reload`);

  // 5. страницы и совет v84 не увольняет отдельно
  const pg = await p.evaluate(async () => {
    window.CS2Control.take(teams.filter(t => !t.isAcademy)[20].name);
    const out = {}; for (const k of ['control', 'org', 'decisions']) { HS.nav(k); await new Promise(r => setTimeout(r, 200)); out[k] = !/Не удалось показать страницу/.test(document.getElementById('hs-page').innerHTML); }
    out.board = !!document.querySelector('#hs-page .v91-board') || (HS.nav('control'), await new Promise(r => setTimeout(r, 200)), !!document.querySelector('#hs-page .v91-board'));
    return out;
  });
  assert(pg.control && pg.org && pg.decisions && pg.board, 'страницы: ' + JSON.stringify(pg));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert(['v91-clubs.js?v=95', 'v91-expectations.js?v=95', 'v91-board.js?v=95'].every(x => html.includes(x)) && !html.includes('?v=93'), 'модули v91 подключены');
  assert(!errs.length, 'ошибки страницы: ' + errs.join(' | '));
  pass('v91: pages render, contract box shown, modules wired, no page errors');
  await ctx.close(); console.log('v91 stage 1 tests passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
