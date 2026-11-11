// v95 · Этап 5: путь к Мейджору (приглашения, региональные отборы, стадии), пресса и внутренние события,
// рабочее место менеджера, досье игрока по вкладкам.
// Запуск: node tests/v95-stage5.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v95-')), { viewport: { width: 1500, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3500);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(500); }
  await p.waitForFunction(() => window.CS2MajorPath && window.CS2Press && window.CS2Desk && window.V31 && window.v45LockMajorRoster, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);

  // 1. путь к Мейджору: объявление приглашений и отборы → Pick'Em Day → победители отборов в Stage 1
  const mp = await p.evaluate(() => {
    const sch = seasonState.seasonSchedule, i = sch.findIndex(s => s && s.type === 'major'), st = sch[i], start = st.calendar.startMs, DAY = 864e5;
    const t0 = seasonState.calendar.currentMs;
    seasonState.calendar.currentMs = start - 40 * DAY; const early = window.CS2MajorPath.ensure();
    seasonState.calendar.currentMs = start - 25 * DAY; window.CS2MajorPath.ensure();
    const M = st.v95Major, qs = seasonState.parallelSchedule.filter(e => e.qual && e.qual.step === i);
    const region = t => window.v35Region(t);
    // отборы сыграны: победители — сильнейшие по рейтингу региона вне приглашений
    qs.filter(q => q.qual.stage === 'closed').forEach(q => {
      const pool = teams.filter(t => !t.isAcademy && !M.direct.includes(t.name) && region(t) === q.qual.region).sort((a, b) => b.pts - a.pts).map(t => t.name);
      q.participants = pool.slice(0, 8); q.placements = pool.slice(2, 10).concat(pool.slice(0, 2)); q.status = 'completed';
    });
    const winners = qs.filter(q => q.qual.stage === 'closed').flatMap(q => q.placements.slice(0, q.qual.slots));
    const path = window.CS2MajorPath.teamPath(winners[0]);
    seasonState.calendar.currentMs = start - 3 * DAY; window.v45LockMajorRoster(i, seasonState.calendar.currentMs);
    const parts = st.v45Participants || [], pools = st.v45StagePools || {};
    const res = { early, direct: M.direct.length, slots: M.slots, quals: qs.map(q => q.qual.region + ':' + q.qual.stage + ':' + q.size + ':' + q.prize).sort(), winners, parts: parts.length,
      allIn: winners.every(n => parts.includes(n)), inS1: winners.every(n => (pools.stage1 || []).includes(n)), directIn: M.direct.every(n => parts.includes(n)), qualified: (M.qualified || []).length, atLarge: (M.atLarge || []).length,
      s3: (pools.stage3 || []).length, s2: (pools.stage2 || []).length, s1: (pools.stage1 || []).length, path, invites: (st.v35Invites || []).length,
      jr: (transferState.v90Journal || []).filter(e => e.type === 'TOURNAMENT').map(e => e.kind) };
    seasonState.calendar.currentMs = t0;
    return res;
  });
  assert(!mp.early && mp.direct === 24 && mp.slots.EU === 4 && mp.slots.AM === 2 && mp.slots.AS === 2 && mp.quals.length === 5, 'приглашения и отборы: ' + JSON.stringify(mp));
  assert(mp.parts === 32 && mp.allIn && mp.inS1 && mp.directIn && mp.qualified === 8 && mp.atLarge === 0 && mp.s3 === 8 && mp.s2 === 8 && mp.s1 === 16, 'состав Мейджора: ' + JSON.stringify(mp));
  assert(mp.jr.includes('major-invites') && mp.jr.includes('major-qualified') && /отбор/.test(mp.path.text), 'журнал и путь команды: ' + JSON.stringify(mp));
  pass(`v95: Major path — ${mp.direct} invites by VRS, regional qualifiers ${mp.quals.join(', ')}; ${mp.qualified} qualifier winners start in Stage 1; path: «${mp.path.text}»`);

  // 2. стадии Мейджора: репутация за плей-офф/полуфинал/финал
  const rp = await p.evaluate(() => {
    const V = window.V31, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), names = pro.slice(0, 32).map(t => t.name);
    const before = names.map(n => V.org(n).rep);
    V.payPrizes({ id: 'test-major-v95', name: 'Test Major', prestige: 'major', prizePool: 1250000, results: names.map((n, k) => ({ n, p: k + 1 })) });
    const after = names.map(n => V.org(n).rep);
    return { d2: after[1] - before[1], d4: after[3] - before[3], d8: after[7] - before[7], d16: after[15] - before[15], d30: after[29] - before[29] };
  });
  assert(rp.d2 >= 3 && rp.d4 >= 2 && rp.d8 >= 1 && rp.d16 >= 0.5 && rp.d30 === 0, 'репутация за стадии: ' + JSON.stringify(rp));
  pass(`v95: Major stages pay reputation — final +${rp.d2.toFixed(1)}, semi +${rp.d4.toFixed(1)}, playoffs +${rp.d8.toFixed(1)}, Stage 3 +${rp.d16.toFixed(1)}`);

  // 3. пресс-конференция: вопрос из положения команды, ответ — обещание, слова и дела у руководства
  const pr = await p.evaluate(() => {
    const V = window.V31, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), t = pro[14];
    window.CS2Control.take(t.name); window.CS2Control.setLevel && window.CS2Control.setLevel('events', 'manual');
    try { V.setAuto && V.setAuto('events', false); } catch (e) {}
    const k = window.CS2Board.contract(t.name) || window.CS2Board.create(t.name);
    t.streak = -5; window.CS2Press.tick();
    const ev = V.S().events.find(e => e.team === t.name && e.type === 'prepress' && e.status === 'open');
    const q = ev && ev.data.q;
    const mor0 = t.players.map(x => x.morale);
    if (ev) V.resolve(ev.id, 'trust');
    const open = window.CS2Press.promises().filter(x => x.team === t.name && x.status === 'open').map(x => x.kind);
    // состав всё же изменён — обещание нарушено
    window.CS2Journal.log('ROSTER_CHANGE', { team: t.name, kind: 'transfer', actor: 'user', player: 'x', players: ['x'] });
    seasonState.calendar.currentMs += 864e5; window.CS2Press.tick();
    const st = window.CS2Press.promises().filter(x => x.team === t.name).map(x => x.status);
    const k2 = window.CS2Board.contract(t.name), sc = window.CS2Board.score(k2);
    // Мейджор: вопрос о цели
    const qm = window.CS2Press.question(t, { name: 'Test Major', isMajor: true }, false);
    t.streak = 0;
    return { q, open, st, press: k2.v95press, part: sc && sc.parts.press && sc.parts.press.t, mq: qm && qm.q, mopts: qm && qm.options.map(o => o.k) };
  });
  assert(pr.q === 'roster' && pr.open.includes('trust') && pr.st.includes('broken') && pr.press && pr.press.n >= 1 && pr.press.v < 0.6 && /обещания/.test(pr.part || ''), 'пресса и обещания: ' + JSON.stringify(pr));
  assert(pr.mq === 'major' && pr.mopts.join() === 'title,po,exp', 'вопрос перед Мейджором: ' + JSON.stringify(pr));
  pass(`v95: press — after a losing streak the question is about the roster; «we trust this roster» + a roster change = broken promise (board: ${pr.part})`);

  // 4. внутренние события из состояния людей: зарплата, выгорание, разногласия с тренером, игровая система, возвращение
  const ie = await p.evaluate(() => {
    const V = window.V31, t = teams.find(x => x.name === window.CS2Control.team()), EV = V.EV, st = t.players.filter(x => !x.status || x.status === 'STARTER');
    const a = V.ensurePerson(st[0]); a.pers.amb = 16; a.salary = Math.round(V.salaryOf(a, t) * 0.3); delete a.v95salAsk;
    const b = st[1]; b.fatigue = 85; delete b.v95burn;
    const c = V.ensurePerson(st[2]); c.pers.lead = 17; c.pers.prof = 6; t.seasonStartRank = 2; t.coach = t.coach || { name: 'Coach' };
    t.v92tac = t.v92tac || { maps: {} }; t.v92tac.maps.Mirage = { t: 'fast', ct: 'hold', fam: 0.3, since: 0 }; t.streak = -3;
    window.CS2Config.set('events.perWeek', 5);   // по умолчанию — не больше 3 новых событий на клуб в неделю
    ['salary', 'burnout', 'rift', 'system'].forEach(k => { try { EV[k].check(t); } catch (e) { console.warn(k, e); } });
    window.CS2Config.reset('events.perWeek');
    const evs = V.S().events.filter(e => e.team === t.name && e.status === 'open').map(e => e.type);
    const sal = V.S().events.find(e => e.team === t.name && e.type === 'salary' && e.status === 'open');
    const before = a.salary; if (sal) V.resolve(sal.id, 'raise');
    // возвращение после неудачного периода
    const d = st[3]; d.conf = 20; seasonState.calendar.currentMs += 7 * 864e5; window.CS2Press.weekly(); d.conf = 70; seasonState.calendar.currentMs += 7 * 864e5; window.CS2Press.weekly();
    // ИИ-клуб решает сам
    const ai = teams.filter(x => !x.isAcademy && x.name !== t.name).sort((x, y) => y.pts - x.pts)[5], ap = V.ensurePerson(ai.players[0]); ap.pers.amb = 16; ap.salary = 1000; delete ap.v95salAsk;
    for (let w = 0; w < 30 && !V.S().events.some(e => e.team === ai.name && e.type === 'salary'); w++) { seasonState.calendar.currentMs += 7 * 864e5; delete ap.v95salAsk; EV.salary.check(ai); }
    const aiEv = V.S().events.find(e => e.team === ai.name && e.type === 'salary');
    t.streak = 0;
    return { evs, raised: a.salary > before, stats: window.CS2Press.stats(), ai: aiEv && aiEv.status, aiChoice: aiEv && aiEv.choice };
  });
  assert(['salary', 'burnout', 'rift', 'system'].every(k => ie.evs.includes(k)) && ie.raised && ie.stats.comeback >= 1 && ie.ai === 'done' && ie.aiChoice, 'внутренние события: ' + JSON.stringify(ie));
  pass(`v95: internal events from state — ${ie.evs.join(', ')}; AI club decides itself (${ie.aiChoice}); comeback news`);

  // 5. последствия титула и слухи с достоверностью
  const ti = await p.evaluate(() => {
    const V = window.V31, t = teams.find(x => x.name === window.CS2Control.team()), o = V.org(t.name);
    const k = window.CS2Board.contract(t.name), rT0 = k.rT;
    if (!o.sponsor) o.sponsor = { name: 'Test', perSeason: 1000000, industry: 'tech', demand: 'pop', target: 10, until: seasonState.currentSeason + 1 };
    const sp0 = o.sponsor.perSeason;
    t.history.unshift({ tournament: 'Test Major v95', season: seasonState.currentSeason, place: 1, isMajor: true });
    window.CS2Press.tick();
    const offer = V.S().events.find(e => e.team === t.name && e.type === 'offer' && /После титула/.test(e.title));
    t.history.shift();
    const N = window.V29News;
    N.add({ cat: 'rumor', rumor: true, teamRumor: true, team: t.name, planKind: 'search', title: 'Тестовый слух v95', lead: '', body: [], tags: [{ t: 'team', v: t.name }] });
    const it = N.all().find(x => x.title === 'Тестовый слух v95');
    return { offer: !!offer, rT0, rT: k.rT, sp0, sp: o.sponsor.perSeason, rel: it && it.rel, id: it && it.id };
  });
  assert(ti.offer && (ti.rT < ti.rT0 || ti.rT0 === 1) && ti.sp > ti.sp0 && ti.rel && ti.rel.k === 2, 'последствия титула и слухи: ' + JSON.stringify(ti));
  pass(`v95: a Major title brings an offer for the star, a higher board target (№${ti.rT0} → №${ti.rT}) and a bigger sponsor deal; rumours carry reliability («${ti.rel.l}», source: ${ti.rel.src})`);

  // 6. рабочее место и досье игрока
  await p.evaluate(() => window.HS.nav('desk')); await p.waitForTimeout(600);
  const desk = await p.evaluate(() => { const r = document.getElementById('hs-page'); return { h: r.querySelector('h1').textContent, boxes: Array.from(r.querySelectorAll('.hs-box-h h3')).map(x => x.textContent), kpis: r.querySelectorAll('.v95-kpis > div').length, sec: r.querySelectorAll('.v95-sec button').length, todo: r.querySelectorAll('.v95-todo li').length }; });
  // v100: «Рабочее место» менеджера — дашборд «Главная» (герой, следующий матч, обзор клуба, задачи, календарь)
  const dash = await p.evaluate(() => { const r = document.getElementById('hs-page'); return { dash: !!r.querySelector('.ax-dash'), parts: ['.ax-hero', '.ax-next-card', '.ax-overview', '.ax-tasks', '.ax-cal'].filter(s => r.querySelector(s)).length }; });
  assert(dash.dash ? dash.parts === 5 : (/Рабочее место/.test(desk.h) && desk.kpis === 4 && desk.boxes.some(b => /Требуют решения/.test(b))), 'рабочее место: ' + JSON.stringify(Object.assign(desk, dash)));
  const nick = await p.evaluate(() => teams.find(x => x.name === window.CS2Control.team()).players[0].nick);
  await p.evaluate(n => window.HS.nav('player', n), nick); await p.waitForTimeout(900);
  const dos = await p.evaluate(() => { const r = document.getElementById('hs-page'); const tabs = Array.from(r.querySelectorAll('.hs-ptabs .hs-ptab')).map(x => x.textContent); return { tabs }; });
  await p.evaluate(() => { const g = document.getElementById('v96-gate'); if (g) g.remove(); });
  await p.click('.hs-ptabs [data-ptab="v95con"]', { force: true }); await p.waitForTimeout(600);
  const con = await p.evaluate(() => { const r = document.getElementById('hs-page'); return { on: (r.querySelector('.hs-ptabs .hs-ptab.on') || {}).textContent, body: (r.querySelector('.hs-ptab-body') || {}).textContent || '' }; });
  assert(['Развитие', 'Контракт', 'Характер', 'Обзор', 'Статистика'].every(x => dos.tabs.includes(x)) && con.on === 'Контракт' && /Рыночная зарплата/.test(con.body), 'досье игрока: ' + JSON.stringify({ dos, on: con.on, body: con.body.slice(0, 120) }));
  await p.evaluate(() => { window.HS.S.ptab = 'overview'; });
  await p.evaluate(() => window.HS.nav('home')); await p.waitForTimeout(500);
  const home = await p.evaluate(() => !!document.querySelector('#hs-page .v95-home'));
  assert(home, 'сводка рабочего места на главной');
  pass(`v95: manager desk — ${desk.kpis} KPIs, ${desk.todo} items to decide, 12 sections; player dossier tabs: ${dos.tabs.join(' / ')}`);

  // 7. смена поколений: приток талантов, ценность потенциала у клубов вне топ-12, дисциплина зарплат
  const gen = await p.evaluate(() => {
    const G = window.CS2Gen, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const fa0 = transferState.freeAgents.length, n = G.intake(true), list = transferState.freeAgents.slice(fa0);
    const nicks = new Set(); let dup = 0; teams.forEach(t => (t.players || []).forEach(x => { if (list.some(y => y.nick.toLowerCase() === String(x.nick).toLowerCase())) dup++; }));
    list.forEach(x => nicks.add(x.nick.toLowerCase()));
    const young = list[0], vet = Object.assign({}, young, { age: 33, pot: 70 });
    const low = pro[60], top = pro[3];
    // фонд зарплат по средствам: клуб ИИ с раздутыми зарплатами в новом сезоне урезает их (не больше 20%)
    const t = pro[45], F = window.CS2Finance; t.players.forEach(x => { x.salary = Math.round((+x.salary || 100000) * 3); });
    const w0 = window.V31.wageBill(t); seasonState.v94SalarySeason = -1; F.seasonStart(); const w1 = window.V31.wageBill(t);
    return { n, uniq: nicks.size === list.length && !dup, ages: [Math.min(...list.map(x => x.age)), Math.max(...list.map(x => x.age))], pots: list.filter(x => x.pot > window.CS2Develop.pow(x) + 5).length,
      bLow: G.ageBonus(low, young), bTop: G.ageBonus(top, young), bVet: G.ageBonus(low, vet), cut: 1 - w1 / w0,
      j: (transferState.v90Journal || []).some(e => e.type === 'FINANCE' && e.action === 'wage-cap' && e.team === t.name) };
  });
  assert(gen.n >= 40 && gen.uniq && gen.ages[0] >= 16 && gen.ages[1] <= 19 && gen.pots >= gen.n * 0.8 && gen.bLow > 1 && gen.bTop === 0 && gen.bVet < 0 && gen.cut > 0.15 && gen.j, 'смена поколений: ' + JSON.stringify(gen));
  pass(`v95: generations — ${gen.n} new talents aged ${gen.ages.join('–')}; potential counts for club #61 (+${gen.bLow.toFixed(1)}), not for top-12; veteran ${gen.bVet.toFixed(1)}; bloated wage bill cut by ${Math.round(gen.cut * 100)}%`);

  assert(!errs.length, 'ошибки страницы: ' + errs.join(' | '));
  await ctx.close();
  console.log('v95 stage 5 tests passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
