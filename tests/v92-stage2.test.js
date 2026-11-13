// v92 · Этап 2: развитие игроков, тренерский штаб, тактика по картам, влияние на матч.
// Запуск: node tests/v92-stage2.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v92-')), { viewport: { width: 1500, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3000);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(400); }
  await p.waitForFunction(() => window.CS2Develop && window.CS2Staff && window.CS2Tactics && window.V31, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);

  // 1. развитие: популяция игроков за 3 сезона — без инфляции, молодые растут, ветераны стареют, потенциал не превышается
  const d = await p.evaluate(() => {
    const D = window.CS2Develop, pl = teams.filter(t => !t.isAcademy).flatMap(t => t.players.filter(x => x && (!x.status || x.status === 'STARTER')));
    pl.forEach(x => window.V31.ensurePerson(x));
    const sim = D.simulate(pl, 3, null), rows = sim.rows;
    const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
    const bySeason = [1, 2, 3].map(s => avg(rows.filter(r => r.s === s).map(r => r.d)));
    const young = avg(rows.filter(r => r.age <= 21).map(r => r.d)), old = avg(rows.filter(r => r.age >= 33).map(r => r.d));
    const overPot = rows.filter(r => r.pot && r.pow > r.pot + 1).length, bigDrop = rows.filter(r => r.d < -5).length / rows.length;
    // характер: профессионал стареет медленнее
    const base = JSON.parse(JSON.stringify(pl.find(x => (+x.age || 25) >= 24) || pl[0]));
    const mk = (prof) => Object.assign(JSON.parse(JSON.stringify(base)), { nick: 'v92vet', age: 33, firepower: 85, tacticalIQ: 85, clutch: 85, utility: 85, pot: 86, pers: Object.assign({}, base.pers, { prof }) });
    const hi = D.delta(mk(18), null, 5).d.firepower, lo = D.delta(mk(5), null, 5).d.firepower;
    // тренер: сильный тренировочный процесс — быстрее растут
    const kid = Object.assign(JSON.parse(JSON.stringify(base)), { nick: 'v92kid', age: 18, firepower: 70, tacticalIQ: 68, clutch: 68, utility: 68, pot: 92 });
    const good = { name: 'GoodClub', coach: { name: 'v92good', rating: 92, style: 'Наставник молодёжи' } }, bad = { name: 'BadClub', coach: { name: 'v92bad', rating: 58, style: 'Мотиватор' } };
    const gG = D.delta(kid, good, 7).d.firepower, gB = D.delta(kid, bad, 7).d.firepower;
    // запись причин
    const one = JSON.parse(JSON.stringify(kid)); D.annual(one, good, 9);
    return { bySeason, young, old, overPot, bigDrop, hi, lo, gG, gB, log: one.v92dev && one.v92dev[0], n: pl.length };
  });
  assert(d.bySeason.every(x => Math.abs(x) <= 1.0), 'средний уровень не раздувается и не проседает: ' + JSON.stringify(d.bySeason));
  assert(d.young > 0.5 && d.old < 0, 'молодые растут, ветераны стареют: ' + JSON.stringify(d));
  assert(d.overPot === 0 && d.bigDrop < 0.02, 'потенциал не превышен, обвалов почти нет: ' + JSON.stringify(d));
  assert(d.hi > d.lo && d.gG > d.gB, 'профессионализм и тренер влияют: ' + JSON.stringify(d));
  assert(d.log && d.log.why.length && d.log.age === 19, 'история развития с причинами: ' + JSON.stringify(d.log));
  pass(`v92: development over 3 seasons for ${d.n} starters — avg/season ${d.bySeason.map(x => x.toFixed(2)).join(', ')}; U21 ${d.young.toFixed(2)}, 33+ ${d.old.toFixed(2)}; pro vs lazy veteran ${d.hi} vs ${d.lo}; good vs weak coach for an 18-year-old ${d.gG} vs ${d.gB}`);

  // 2. штаб: навыки по ролям, восстановление, найм с совместимостью
  const s = await p.evaluate(() => {
    const S = window.CS2Staff, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const t = pro[20]; window.CS2Control.take(t.name);
    const st = S.of(t);
    // восстановление: тренер по нагрузке 95 против 45
    const a = pro[30], b = pro[31];
    S.of(a); S.of(b); a.v92staff.perf.skill = 95; b.v92staff.perf.skill = 45;
    a.players.forEach(x => { x.fatigue = 50; }); b.players.forEach(x => { x.fatigue = 50; });
    S.recover();
    const fa = a.players[0].fatigue, fb = b.players[0].fatigue;
    // найм аналитика
    window.V31.org(t.name).budget = 3e6;
    const mk = S.market(t), before = window.V31.org(t.name).budget, cand = mk.analyst[0];
    const r = S.hire(t, 'analyst', 0);
    const headC = (mk.head || []).map(c => Math.round(S.compat(t, c.pace) * 100));
    return { skills: st.head.skills, pace: st.head.pace, analyst: st.analyst.skill, perf: st.perf.skill, fa, fb, hired: r.ok, analystNow: S.of(t).analyst.name === cand.name, spent: before - window.V31.org(t.name).budget, fee: cand.fee, headC };
  });
  assert(s.skills.training && s.skills.tactics && s.skills.youth && s.skills.people && s.analyst && s.perf, 'штаб: ' + JSON.stringify(s));
  assert(s.fa < s.fb && s.fb <= 50, 'тренер по нагрузке восстанавливает: ' + JSON.stringify(s));
  assert(s.hired && s.analystNow && s.spent >= s.fee, 'найм: ' + JSON.stringify(s));
  pass(`v92: staff — head coach skills ${JSON.stringify(s.skills)} (${s.pace}); recovery 95 vs 45: fatigue ${s.fa} vs ${s.fb}; analyst hired for $${Math.round(s.fee / 1000)}k; head coach compatibility shown ${JSON.stringify(s.headC)}`);

  // 3. разведка: точность аналитика — качество подготовки и ошибка в выводах
  const sc = await p.evaluate(async () => {
    // немного сыгранных матчей для разведки
    for (let i = 0; i < 30 && !(currentTournament && !currentTournament.completed); i++) { skipGameCalendarDay(); await new Promise(r => setTimeout(r, 20)); }
    if (currentTournament && !currentTournament.completed) simulateWholeTournament();
    await new Promise(r => setTimeout(r, 300));
    const me = teams.find(t => t.name === window.V31.managed());
    const opp = Object.values(window.HS.stats().T || {}).length ? teams.filter(t => !t.isAcademy && t !== me).find(t => { const r = window.V31.scout(me.name, t.name); return r && Object.keys(r.maps || {}).length; }) : null;
    if (!opp) return { skip: true };
    me.v92staff.analyst.skill = 50; const lo = window.V31.scout(me.name, opp.name);
    me.v92staff.analyst.skill = 95; const hi = window.V31.scout(me.name, opp.name);
    const errLo = Object.values(lo.maps).reduce((a, x) => a + (x.err || 0), 0), errHi = Object.values(hi.maps).reduce((a, x) => a + (x.err || 0), 0);
    return { qLo: lo.quality, qHi: hi.quality, accLo: lo.analyst.accuracy, accHi: hi.analyst.accuracy, errLo, errHi };
  });
  assert(sc.skip || (sc.qHi > sc.qLo && sc.accHi > sc.accLo && sc.errHi <= sc.errLo), 'разведка: ' + JSON.stringify(sc));
  pass('v92: scouting — ' + (sc.skip ? 'skipped (no scouted matches yet)' : `analyst 95 vs 50: prep quality ${sc.qHi} vs ${sc.qLo}, accuracy ${sc.accHi}% vs ${sc.accLo}%, map read error ${sc.errHi} vs ${sc.errLo} pts`));

  // 4. тактика: столкновение планов, сыгранность, смена капитана, влияние на раунд в пределах
  const tc = await p.evaluate(() => {
    const T = window.CS2Tactics, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), a = pro[40], b = pro[41], map = 'Mirage';
    const pa = T.plan(a, map), pb = T.plan(b, map);
    Object.assign(pa, { t: 'fast', ct: 'default', fam: 1 }); Object.assign(pb, { t: 'default', ct: 'hold', fam: 1 });
    const rushIntoHold = T.mapMod(a, b, map);
    Object.assign(pa, { t: 'exec' });
    const execVsHold = T.mapMod(a, b, map);
    const p0 = window.calcMapWinProbability(a.name, b.name, map);
    // смена плана: сыгранность падает и растёт по неделям
    T.setPlan(a, map, 't', 'slow'); const famNew = pa.fam;
    a.v92tac.wk -= 1; T.weekly(); const famWeek = pa.fam;
    // смена капитана
    const igl = a.players.find(x => x.role === 'IGL'), other = a.players.find(x => x !== igl && x.role !== 'AWPer');
    pa.fam = 1; a.v92tac.igl = igl ? igl.nick : 'x'; if (igl && other) { igl.role = 'Rifler'; other.role = 'IGL'; }
    T.weekly(); const famIgl = pa.fam;
    // предел и вход в матч
    let maxD = 0; pro.slice(0, 30).forEach((x, i) => pro.slice(i + 1, 30).forEach(y => { maxD = Math.max(maxD, Math.abs(T.roundDelta(x.name, y.name, map))); }));
    const p1 = window.calcMapWinProbability(a.name, b.name, map);
    return { rushIntoHold, execVsHold, famNew, famWeek, famIgl, maxD, p0, p1 };
  });
  assert(tc.rushIntoHold < 0 && tc.execVsHold > 0, 'столкновение планов: ' + JSON.stringify(tc));
  assert(Math.abs(tc.famNew - 0.3) < 1e-9 && tc.famWeek > tc.famNew && Math.abs(tc.famIgl - 0.5) < 0.01, 'сыгранность планов: ' + JSON.stringify(tc));
  assert(tc.maxD <= 0.0120001 && tc.p0 >= 0.25 && tc.p0 <= 0.75 && tc.p1 !== tc.p0, 'влияние на раунд в пределах: ' + JSON.stringify(tc));
  pass(`v92: tactics — fast into a stacked hold ${(tc.rushIntoHold * 100).toFixed(2)}%, utility execute ${(tc.execVsHold * 100).toFixed(2)}%; new plan fam ${tc.famNew} → ${tc.famWeek} after a week; IGL change → ${tc.famIgl}; max staff+tactics delta ${(tc.maxD * 100).toFixed(2)}% per round`);

  // 5. страницы: штаб, тактика, развитие в профиле
  const pg = await p.evaluate(async () => {
    const out = {}; for (const k of ['staff', 'tactics', 'training']) { HS.nav(k); await new Promise(r => setTimeout(r, 200)); out[k] = !/Не удалось показать страницу/.test(document.getElementById('hs-page').innerHTML) && !!document.querySelector('#hs-page h1'); }
    const me = teams.find(t => t.name === window.V31.managed()), nick = me.players[0].nick; window.CS2Develop.annual(me.players[0], me, 99);
    HS.nav('player', nick); await new Promise(r => setTimeout(r, 300)); out.dev = !!document.querySelector('#hs-page .v92-dev');
    return out;
  });
  assert(pg.staff && pg.tactics && pg.training && pg.dev, 'страницы: ' + JSON.stringify(pg));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert(['js/rosters/develop.js', 'js/career/staff.js', 'js/match/tactics.js'].every(x => html.includes(x)) && !html.includes('?v=93'), 'модули v92 подключены');
  assert(!errs.length, 'ошибки страницы: ' + errs.join(' | '));
  pass('v92: staff, tactics and player development pages render; modules wired; no page errors');
  await ctx.close(); console.log('v92 stage 2 tests passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
