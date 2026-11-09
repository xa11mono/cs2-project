// v93 · Этап 3: карьера и её завершение, эпохи организаций, болельщики, выпускники академий.
// Запуск: node tests/v93-stage3.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v93-')), { viewport: { width: 1500, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3500);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(600); }
  await p.waitForFunction(() => window.CS2Careers && window.CS2Eras && window.CS2Fans && window.CS2Staff, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);

  // 1. завершение карьеры: разные пути, легенда поколения, бывшие игроки — на рынке штаба и тренерами академий
  const r = await p.evaluate(() => {
    const now = seasonState.calendar.currentMs, pro = teams.filter(t => !t.isAcademy);
    const withAc = pro.find(t => teams.some(a => a.isAcademy && (a.academyParent || a.parentTeam) === t.name));
    const mk = (i, o) => Object.assign({ type: 'retire', player: 'v93ret' + i, role: i % 3 === 0 ? 'IGL' : 'Rifler', from: i % 2 ? withAc.name : pro[30 + (i % 20)].name, to: '—', reason: (30 + (i % 7)) + ' лет', iq: 70 + (i * 7) % 25, ts: now - 60 * 864e5 }, o || {});
    const moves = Array.from({ length: 40 }, (_, i) => mk(i));
    moves.push(mk(99, { player: 'dupreeh', role: 'Rifler', iq: 80, reason: '33 лет' }));
    transferState.v30Moves = moves.concat(transferState.v30Moves || []);
    window.CS2Careers.scan();
    const recs = window.CS2Careers.retired().filter(x => /^v93ret|^dupreeh$/.test(x.nick));
    const paths = {}; recs.forEach(x => { paths[x.path] = (paths[x.path] || 0) + 1; });
    const leg = recs.find(x => x.nick === 'dupreeh');
    // аналитик из бывших игроков — среди кандидатов на рынке штаба менеджера
    window.CS2Control.take(pro[25].name); seasonState.v92StaffMarket = null;
    const mkt = window.CS2Staff.market(teams.find(t => t.name === window.V31.managed()));
    const exAn = (mkt.analyst || []).filter(x => x.exPlayer).length;
    const acCoach = recs.filter(x => x.path === 'academy').map(x => { const ac = teams.find(a => a.name === x.academy); return ac && ac.coach && ac.coach.name === x.nick; });
    return { n: recs.length, paths, ages: recs.filter(x => x.age).length, legend: leg && leg.legend, legPath: leg && leg.pathLabel, exAn, acCoach: acCoach.length ? acCoach.every(Boolean) : null };
  });
  assert(r.n === 41 && r.ages === 41 && Object.keys(r.paths).length >= 3, 'пути после карьеры: ' + JSON.stringify(r));
  assert(r.legend === true, 'легенда поколения: ' + JSON.stringify(r));
  assert((r.paths.analyst ? r.exAn >= 1 : true) && r.acCoach !== false, 'бывшие игроки в штабе и академиях: ' + JSON.stringify(r));
  pass(`v93: career end — ${r.n} retirements, paths ${JSON.stringify(r.paths)}; dupreeh is a legend of his generation (${r.legPath}); ex-players on the staff market: ${r.exAn}`);

  // 2. ветеран без клуба продолжает карьеру в Tier-2
  const v = await p.evaluate(() => {
    const now = seasonState.calendar.currentMs, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const tpl = pro[50].players.find(x => x.role === 'Rifler') || pro[50].players[1];
    const vet = Object.assign(JSON.parse(JSON.stringify(tpl)), { nick: 'v93vet', age: 32, firepower: 90, tacticalIQ: 88, clutch: 88, utility: 86, status: 'FREE AGENT', v84FaSince: now - 45 * 864e5, reservedFor: null, benchFrom: null, joinedRun: null });
    transferState.freeAgents.push(vet);
    const n = window.CS2Careers.veteransToTier2();
    const club = teams.find(t => (t.players || []).some(x => x.nick === 'v93vet'));
    const rank = club ? pro.indexOf(club) + 1 : null;
    const j = (transferState.v90Journal || []).find(e => e.type === 'CAREER' && e.action === 'tier2' && e.player === 'v93vet');
    return { n, club: club && club.name, rank, journaled: !!j };
  });
  assert(v.n >= 1 && v.club && v.rank >= 35 && v.journaled, 'ветеран в Tier-2: ' + JSON.stringify(v));
  pass(`v93: veteran free agent (32) continues in Tier-2 — ${v.club} (#${v.rank})`);

  // 3. карточка карьеры
  const c = await p.evaluate(() => {
    const s = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts)[0].players[0];
    window.CS2Careers.markPeak(s);
    const a = window.CS2Careers.card(s.nick), b = window.CS2Careers.card('dupreeh');
    return { a: { nick: a.nick, status: a.status, seasons: a.seasons, clubs: a.clubs.length, peak: !!a.peak, active: a.active }, b: { status: b.status, active: b.active, ret: b.retired && b.retired.pathLabel, majors: b.trophies.majors } };
  });
  assert(c.a.active && c.a.seasons >= 1 && c.a.clubs >= 1 && c.a.peak, 'карточка игрока: ' + JSON.stringify(c));
  assert(!c.b.active && c.b.status === 'завершил карьеру' && c.b.majors >= 1, 'карточка завершившего: ' + JSON.stringify(c));
  pass(`v93: career card — ${c.a.nick}: ${c.a.status}, ${c.a.clubs} club(s); dupreeh: ${c.b.status}, ${c.b.majors} Majors, then ${c.b.ret}`);

  // 4. эпохи: правила и еженедельный пересчёт
  const e = await p.evaluate(() => {
    const E = window.CS2Eras, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), t = pro[40];
    const dom = E.judge(t, 1, Array(13).fill(1)).key;
    const ret = E.judge(t, 3, [3].concat(Array(25).fill(4), Array(26).fill(25))).key;
    const cri = E.judge(t, 30, [30].concat(Array(24).fill(20), [8], Array(10).fill(8))).key;
    const young = Object.assign({}, t, { name: 'v93young', players: t.players.map(x => Object.assign({}, x, { age: 20 })) });
    const you = E.judge(young, 40, Array(30).fill(40)).key;
    E.weekly(true);
    const all = pro.filter(x => E.of(x.name)).length, dist = {}; pro.forEach(x => { const k = (E.of(x.name) || {}).key; dist[k] = (dist[k] || 0) + 1; });
    return { dom, ret, cri, you, all, total: pro.length, dist };
  });
  assert(e.dom === 'dominance' && e.ret === 'return' && e.cri === 'crisis' && e.you === 'youth', 'правила эпох: ' + JSON.stringify(e));
  assert(e.all === e.total, 'эпоха у каждой организации: ' + JSON.stringify(e));
  pass(`v93: eras — rules (dominance/return/crisis/youth) hold; ${e.all} orgs have an era ${JSON.stringify(e.dist)}`);

  // 5. болельщики: популярность, реакция на уход легенды, репутация
  const f = await p.evaluate(() => {
    const F = window.CS2Fans, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const pops = pro.map(t => F.popularity(t)), navi = teams.find(t => t.name === 'NAVI'), low = pro[100];
    const t = pro[3], star = t.players.find(x => window.CS2Stature.tier(x) !== 'regular') || t.players[0];
    const before = F.mood(t.name), news0 = (window.V29News && window.V29News.store ? window.V29News.store().items.length : 0);
    transferState.v90Journal.unshift({ id: 'jt', ts: seasonState.calendar.currentMs + 1, type: 'ROSTER_CHANGE', team: t.name, kind: 'fa', actor: 'ai', out: star.nick, player: 'x' });
    F.react();
    const after = F.mood(t.name);
    const o = window.V31.org(t.name), rep0 = o.rep; o.rep = 10; seasonState.v93Fans.wk -= 1; F.weekly();
    return { min: Math.min(...pops), max: Math.max(...pops), navi: navi ? F.popularity(navi) : null, low: F.popularity(low), before, after, star: star.nick, repUp: o.rep > 10, followers: F.followers(F.popularity(t)) };
  });
  assert(f.min >= 1 && f.max <= 100 && (f.navi == null || f.navi > f.low), 'популярность: ' + JSON.stringify(f));
  assert(f.after < f.before && f.repUp, 'реакция болельщиков и репутация: ' + JSON.stringify(f));
  pass(`v93: fans — popularity ${f.min}–${f.max} (NAVI ${f.navi} vs #101 ${f.low}); ${f.star} leaving: mood ${f.before} → ${f.after}; popularity pulls org reputation`);

  // 7. неполная основа не пересобирается по базе 2026: игрок, пришедший позже, не исчезает, ушедшие не «воскресают»
  const ep = await p.evaluate(() => {
    const where = n => teams.filter(t => t.players.some(x => x.nick === n)).map(t => t.name).concat(transferState.freeAgents.filter(x => x.nick === n).map(() => 'FA'));
    const fal = teams.find(x => x.name === 'Team Falcons'), faze = teams.find(x => x.name === 'FAZE');
    if (!fal || !faze) return { skip: true };
    const tw = faze.players.find(x => x.nick === 'Twistzz') || faze.players[0], nick = tw.nick;
    faze.players.splice(faze.players.indexOf(tw), 1); const fa0 = transferState.freeAgents.shift(); faze.players.push(Object.assign(JSON.parse(JSON.stringify(fa0)), { status: 'STARTER' }));
    const out = fal.players.find(x => x.nick === 'TeSeS') || fal.players[2]; const outNick = out.nick;
    fal.players[fal.players.indexOf(out)] = Object.assign(tw, { status: 'STARTER' }); out.status = 'FREE AGENT'; transferState.freeAgents.push(out);
    tw.status = 'BENCH'; ensurePlayerLayer(fal);   // «внутренний конфликт»: игрок в запас прямо в составе
    return { nick, at: where(nick), out: outNick, outAt: where(outNick), size: fal.players.filter(x => !x.status || x.status === 'STARTER').length };
  });
  assert(ep.skip || (ep.at.length === 1 && ep.at[0] === 'Team Falcons' && !ep.outAt.includes('Team Falcons') && ep.size === 5), 'неполная основа: ' + JSON.stringify(ep));
  pass('v93: incomplete lineup is filled from its own bench — ' + (ep.skip ? 'skipped' : `${ep.nick} stays in Falcons, ${ep.out} is not resurrected`));

  // 6. страницы: эпоха и болельщики на странице команды, карьера в профиле
  const pg = await p.evaluate(async () => {
    const t = teams.filter(x => !x.isAcademy).sort((a, b) => b.pts - a.pts)[2];
    HS.nav('team', t.name); await new Promise(r => setTimeout(r, 400));
    // v97: блок эпохи — только у команды с эпохой (доминирование, возвращение, кризис); у «стабильной» его нет
    const E = seasonState.v93Eras, prev = E.cur[t.name];
    const shown = ['dominance', 'return', 'crisis'].includes((prev || {}).key);
    let era = !!document.querySelector('#hs-page .v93-era') === shown;
    E.cur[t.name] = { key: 'stable', since: Date.now(), why: '' }; HS.render(); await new Promise(r => setTimeout(r, 200));
    era = era && !document.querySelector('#hs-page .v93-era');
    E.cur[t.name] = { key: 'dominance', since: Date.now(), why: 'тест' }; HS.render(); await new Promise(r => setTimeout(r, 200));
    era = era && !!document.querySelector('#hs-page .v93-era');
    E.cur[t.name] = prev;
    const fans = !!document.querySelector('#hs-page .v93-fans');
    const tier = !!document.querySelector('#hs-page .v84-tier'), strat = !!document.querySelector('#hs-page .v91-strat');
    HS.nav('player', t.players[0].nick); await new Promise(r => setTimeout(r, 400));
    return { era, fans, tier, strat, career: !!document.querySelector('#hs-page .v93-career') };
  });
  assert(pg.era && pg.fans && pg.career && pg.tier && pg.strat, 'страницы: ' + JSON.stringify(pg));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert(['v93-careers.js?v=97', 'v93-eras.js?v=97', 'v93-fans.js?v=97'].every(x => html.includes(x)) && !html.includes('?v=93'), 'модули v93 подключены');
  assert(!errs.length, 'ошибки страницы: ' + errs.join(' | '));
  pass('v93: team page shows era, fans, Tier status and strategy; player page shows career; modules wired; no page errors');
  await ctx.close(); console.log('v93 stage 3 tests passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
