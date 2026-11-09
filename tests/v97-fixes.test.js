// v97 regression: правки по отзыву игрока — уровень игроков, куда готов перейти игрок, опыт капитана для топ-клуба,
// спад по нормам роли, скидка на переход из академии, VRS (смена состава, память клуба), история позиций, трансферы по
// межсезонью, Зал славы, вкладки наград, эпоха и стадии легендарного клуба, порядок «Истории команд», быстрая уступка.
// Запуск: node tests/v97-fixes.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v97-')), { viewport: { width: 1400, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3000);
  const lg = await p.$('#v84-legacy-modal [data-lg="zero"]'); if (lg) { await lg.click(); await p.waitForTimeout(500); }
  await p.waitForFunction(() => window.CS2V97 && window.CS2Experience && window.CS2Stature && window.CS2Stature.canJoin.__v97 && seasonState.v97Skill, null, { timeout: 40000 });
  const pass = m => console.log('PASS ' + m);

  // 1. уровень игроков: известные игроки — по реальной силе
  const sk = await p.evaluate(() => {
    const pw = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
    const find = n => { for (const t of teams) { const x = (t.players || []).find(p => p.nick === n); if (x) return x; } return null; };
    const o = {}; ['donk', 'magixx', 'ZywOo', 'm0NESY', 'alex666', 'karrigan'].forEach(n => { const x = find(n); o[n] = x ? { pow: Math.round(pw(x) * 10) / 10, iq: x.tacticalIQ } : null; });
    return o;
  });
  assert(sk.donk && sk.magixx && sk.donk.pow > sk.magixx.pow + 5, 'donk сильнее magixx: ' + JSON.stringify(sk));
  assert(sk.ZywOo.pow > 94 && sk.m0NESY.pow > 93, 'суперзвёзды наверху: ' + JSON.stringify(sk));
  assert(sk.magixx.iq >= 90 && sk.karrigan.iq >= 90, 'капитан сохраняет тактику: ' + JSON.stringify(sk));
  pass(`v97: skill recalibrated — donk ${sk.donk.pow} vs magixx ${sk.magixx.pow} (IQ ${sk.magixx.iq}), alex666 ${sk.alex666 && sk.alex666.pow}`);

  // 2. куда готов перейти игрок; ядро топ-клуба; опыт капитана
  const cj = await p.evaluate(() => {
    const S = window.CS2Stature, X = window.CS2Experience, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const pw = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
    // сильный игрок без клуба (уровень топ-15) — не в клуб №80
    const fa = JSON.parse(JSON.stringify(pro[3].players.slice().sort((a, b) => pw(b) - pw(a))[0])); fa.nick = 'v97Star'; delete fa.v84FaSince;
    transferState.freeAgents.push(fa); S.reset();
    const low = S.canJoin(fa, pro[79], null), top = S.canJoin(fa, pro[4], null);
    fa.v84FaSince = seasonState.calendar.currentMs - 30 * 30 * 864e5;   // 30 месяцев без клуба — снижает требования
    const lowLater = S.canJoin(fa, pro[60], null);
    transferState.freeAgents.splice(transferState.freeAgents.indexOf(fa), 1);
    // ядро топ-клуба: лучший игрок клуба №2 не уходит вниз, но может перейти выше
    const v = pro[1], core = v.players.filter(x => !x.status || x.status === 'STARTER').sort((a, b) => pw(b) - pw(a)).find(x => (+x.age || 25) < 31 && !S.declining(x));
    const down = core ? S.canJoin(core, pro[5], v) : null, up = core ? S.canJoin(core, pro[0], v) : null;
    const why = core ? (X.refusal(core, pro[5], v) || {}).code : '';
    // капитан без опыта — не в топ-5; опытный — можно
    const igl = { nick: 'v97Igl', role: 'IGL', age: 22, firepower: 85, tacticalIQ: 96, clutch: 85, utility: 88, form: 100 };
    const vet = { nick: 'v97Vet', role: 'IGL', age: 33, firepower: 82, tacticalIQ: 93, clutch: 82, utility: 85, form: 100 };
    // молодой капитан клуба №41 — мало опыта для топ-5; 33-летний капитан клуба №13 — достаточно
    return { low, top, lowLater, core: core && core.nick, down, up, why, expIgl: X.score(igl, pro[40]), iglTop: S.canJoin(igl, pro[2], pro[40]), iglMid: S.canJoin(igl, pro[25], pro[40]), vetTop: S.canJoin(vet, pro[2], pro[12]), expVet: X.score(vet, pro[12]) };
  });
  assert(cj.low === false && cj.top === true, 'сильный свободный агент не идёт в клуб №80: ' + JSON.stringify(cj));
  assert(cj.lowLater === true, 'со временем требования снижаются: ' + JSON.stringify(cj));
  assert(cj.down === false && cj.up === true && cj.why === 'CORE', 'ядро топ-клуба уходит только выше: ' + JSON.stringify(cj));
  assert(cj.iglTop === false && cj.iglMid === true && cj.vetTop === true, 'опыт капитана для топ-5: ' + JSON.stringify(cj));
  pass(`v97: canJoin — star FA refuses #80, core ${cj.core} stays unless moving up, IGL exp ${cj.expIgl} < 6 for top-5 (veteran ${cj.expVet})`);

  // 3. спад по нормам роли и скидка на академию
  const rl = await p.evaluate(() => ({ sup: window.CS2RoleRatingAdj('Support'), igl: window.CS2RoleRatingAdj('IGL'), awp: window.CS2RoleRatingAdj('AWPer'),
    st1: window.CS2AcademyStepUp(teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts)[0], { age: 18 }), st50: window.CS2AcademyStepUp(teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts)[50], { age: 21 }) }));
  assert(rl.sup < -0.05 && rl.igl < -0.05 && rl.awp > 0, 'нормы роли: ' + JSON.stringify(rl));
  assert(rl.st1 > rl.st50 && rl.st50 >= 1, 'скидка на переход из академии больше для топ-клуба: ' + JSON.stringify(rl));
  pass(`v97: role-normalised slump (Support ${rl.sup}, IGL ${rl.igl}, AWPer +${rl.awp}); academy step-up ${rl.st1} (top-1) vs ${rl.st50} (#51)`);
  const su = await p.evaluate(() => {
    const t = teams.filter(x => !x.isAcademy).sort((a, b) => b.pts - a.pts)[8], pl = t.players[4], fp = +pl.firepower;
    transferState.v30Moves = transferState.v30Moves || []; transferState.v30Moves.push({ type: 'promotion', player: pl.nick, to: t.name, from: 'Академия', ts: seasonState.calendar.currentMs, season: seasonState.currentSeason });
    window.CS2V97.stepUpTick(); const after = +pl.firepower, st = pl.v97step ? pl.v97step.d : 0;
    pl.v97step.wk -= 10; window.CS2V97.stepUpTick();
    return { fp, after, st, back: +pl.firepower, left: !!pl.v97step };
  });
  assert(su.after < su.fp && Math.abs(su.back - su.fp) < 0.21 && !su.left, 'временный спад после академии уходит за 10 недель: ' + JSON.stringify(su));
  pass(`v97: academy promotion dips firepower ${su.fp} → ${su.after} and recovers to ${su.back}`);

  // 4. VRS: новое ядро сохраняет 65% очков, результаты — не больше 65% итога
  const vr = await p.evaluate(() => {
    const C = window.CS2Config, t = teams.filter(x => !x.isAcademy).sort((a, b) => b.pts - a.pts)[0];
    return { keep: C.get('vrs.newRosterKeep'), share: C.get('vrs.resultShare'), tau: C.get('vrs.seedTauDays'), seedAt: !!(t.vrsLedger && t.vrsLedger.seedAt) || null };
  });
  assert(vr.keep === 0.65 && vr.share === 0.65 && vr.tau === 150, 'параметры VRS: ' + JSON.stringify(vr));
  pass('v97: VRS — new core keeps 65% above 400, results ≤ 65% of the score, club memory τ=150 days');

  // 5. история позиций, трансферы по межсезонью, награды, Зал славы, эпоха, стадии легендарного клуба
  const ui = await p.evaluate(async () => {
    const H = window.HS, w = () => new Promise(r => setTimeout(r, 120)), pg = () => document.getElementById('hs-page');
    window.CS2RankHistory.snap(true);
    const t0 = teams.filter(x => !x.isAcademy).sort((a, b) => b.pts - a.pts)[0];
    const sum = window.CS2RankHistory.summary(t0.name, 'all');
    H.nav('ranking'); await w(); const histTab = !!pg().querySelector('[data-v97-rank-hist]');
    pg().querySelector('[data-v97-rank-hist]').click(); await w();
    const histRows = pg().querySelectorAll('.v97-rk-tbl tbody tr').length, chips = [...pg().querySelectorAll('[data-v97rp]')].map(b => b.dataset.v97rp);
    H.nav('team', t0.name); await w(); const teamBox = !!pg().querySelector('[data-v97rp]');
    H.S.trf.period = undefined; H.nav('transfers'); await w();
    const per = pg().querySelector('[data-trperiod]'), opts = per ? [...per.options].map(o => o.value) : [];
    H.nav('awards'); await w(); const tabs = [...pg().querySelectorAll('[data-awtab]')].map(b => b.dataset.awtab);
    const A = { ti: [{ k: 'major', n: 'M' }, { k: 'regular', n: 'R' }, { k: 'tier2', n: 'T2' }, { k: 'nations', n: 'ENC', nations: true }], top: [{ r: 3 }, { r: 9 }], aw: [{ type: 'poty' }, { type: 'sniper' }, { type: 'rising' }] };
    const T = H.hofTitles('v97-nobody', A);
    const L = window.CS2LegendStage;
    return { sum, histTab, histRows, chips, teamBox, opts, tabs, T, legend: typeof L === 'function' };
  });
  assert(ui.sum && ui.sum.weeks >= 1 && ui.histTab && ui.histRows > 0 && ['month', 'year', 'season:1', 'all'].every(k => ui.chips.includes(k)) && ui.teamBox, 'история позиций: ' + JSON.stringify(ui));
  assert(ui.opts.includes('all') && ui.opts.some(o => /^off:/.test(o)) && ui.opts.some(o => /^in:/.test(o)), 'трансферы по периодам: ' + JSON.stringify(ui.opts));
  assert(!ui.tabs.includes('cabinet') && !ui.tabs.includes('teams') && ui.tabs.includes('hof'), 'вкладки наград: ' + JSON.stringify(ui.tabs));
  assert(ui.T.total === 6 && ui.T.cups === 2 && ui.T.enc === 1 && ui.T.top === 2 && ui.T.poty === 1, 'титулы Зала славы: ' + JSON.stringify(ui.T));
  assert(ui.legend, 'стадии легендарного клуба');
  pass(`v97: rank history (${ui.histRows} rows; month/year/season/all), transfer periods (${ui.opts.length}), awards tabs ${ui.tabs.join('/')}, HoF titles = cups+ENC+GS+Top-20+POTY (${ui.T.total})`);

  // 6. стадия легендарного клуба не теряется и новость — только при росте стадии
  const lgd = await p.evaluate(() => {
    const st = seasonState.v84Legend; st.stage = st.stage || {}; const before = (window.V29News?.all() || []).length;
    const M = window.CS2LegendClubs.majorsByTeam(); const name = teams.find(t => !t.isAcademy).name, k = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const was = M[k]; M[k] = 3; st.stage[name] = 2; window.CS2LegendClubs.tick(); const n1 = (window.V29News?.all() || []).length;
    M[k] = 4; window.CS2LegendClubs.tick(); const n2 = (window.V29News?.all() || []).length, lvl = st.stage[name];
    M[k] = 2; window.CS2LegendClubs.tick(); const keep = st.stage[name];
    if (was == null) delete M[k]; else M[k] = was;
    return { n1: n1 - before, n2: n2 - n1, lvl, keep, g: window.CS2LegendStage(name) };
  });
  assert(lgd.n1 === 0 && lgd.n2 === 1 && lgd.lvl === 3 && lgd.keep === 3, 'стадии легендарного клуба: ' + JSON.stringify(lgd));
  pass(`v97: legendary stage rises once (news ${lgd.n2}) and is kept (${lgd.g && lgd.g.label})`);

  // 7. умная уступка: не ждёт кадра чаще раза в 40 мс
  const yl = await p.evaluate(async () => { const t = performance.now(); for (let i = 0; i < 60; i++) await window.CS2Yield.frame(); return performance.now() - t; });
  assert(yl < 60 * 16 * 0.6, 'уступка без пустого ожидания кадра: ' + yl.toFixed(0) + ' мс на 60 уступок');
  pass(`v97: cooperative yield — 60 yields in ${yl.toFixed(0)} ms (was ~1000 ms with a frame per yield)`);

  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert(html.includes('v97-fixes.js?v=97') && html.includes('v97-fixes.css?v=97') && !/\?v=9[0-6]"/.test(html), 'модуль v97 подключён, кэш скриптов — ?v=97');
  assert(!errs.length, 'ошибки на странице: ' + errs.join(' | '));
  pass('v97: module wired, cache version 97, no page errors');
  await ctx.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
