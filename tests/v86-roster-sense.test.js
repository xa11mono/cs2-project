// v86 regression: язык общения в составах, замена капитана, двойные ники, дубли в журнале, слухи, круглые трофеи.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => document.documentElement.classList.contains('cs2-ready'), null, { timeout: 30000 });
  await p.waitForTimeout(3700);
  await p.evaluate(() => { try { CS2Legacy.choose('zero'); } catch (e) {} });

  // 1. язык команды — по текущему составу
  const idents = await p.evaluate(() => Object.fromEntries(['Team Spirit', 'The Mongolz', 'Team Vitality', 'Aurora', 'B8', 'FURIA', 'Team Falcons']
    .map(n => [n, teamIdentityGroup(teams.find(t => t.name === n))])));
  assert(idents['Team Spirit'] === 'russian', 'Spirit is a Russian-speaking roster: ' + idents['Team Spirit']);
  assert(idents['The Mongolz'] === 'mongolian', 'The Mongolz must be Mongolian (name case differs from the old list): ' + idents['The Mongolz']);
  // v87: составы приведены к реальным на ноябрь 2026 — у Aurora теперь Jimpphat и kyxsan, турок трое → общий язык английский
  const auroraTr = await p.evaluate(() => teams.find(t => t.name === 'Aurora').players.slice(0, 5).filter(x => x.country === 'TR').length);
  assert(idents['Aurora'] === (auroraTr >= 4 ? 'turkish' : 'international'), `Aurora language follows its roster (${auroraTr} TR): ` + idents['Aurora']);
  assert(idents['Team Vitality'] === 'international' && idents['Team Falcons'] === 'international', 'mixed rosters talk in English');
  assert(idents['B8'] === 'russian', 'Ukrainian rosters share the Russian-speaking group');
  console.log('PASS v86: team language is derived from the current roster');

  // 2. монгол не попадает в русскоязычный состав ни одним путём рынка
  const lang = await p.evaluate(() => {
    const spirit = teams.find(t => t.name === 'Team Spirit'), mz = teams.find(t => t.name === 'The Mongolz');
    const techno = mz.players.find(x => /techno/i.test(x.nick));
    const fit = teamIdentityFit(spirit, techno);
    const before = spirit.players.map(x => x.nick).join();
    const old = window.playerWillAccept; window.playerWillAccept = () => true; window.__v34Force = true;
    let moved = false; try { moved = applyPlayerTransfer(mz, spirit, techno, 'тест'); } finally { window.playerWillAccept = old; window.__v34Force = false; }
    // замены из резерва для русскоязычной команды — только игроки СНГ
    const cc = []; for (let i = 0; i < 12; i++) { const x = generateFreeAgent(spirit, 'Rifler', 900 + i); cc.push(x.country); }
    return { fit, moved, same: before === spirit.players.map(x => x.nick).join(), cc };
  });
  assert(lang.fit < 0.5, 'Mongolian player must not fit a Russian-speaking team: ' + lang.fit);
  assert(!lang.moved && lang.same, 'forced negotiation must not bypass the language check');
  const CIS = ['RU', 'UA', 'BY', 'KZ', 'UZ', 'KG', 'TJ', 'TM', 'AM', 'AZ', 'GE', 'MD'];
  assert(lang.cc.every(c => CIS.includes(c)), 'reserve replacements for Spirit must come from CIS: ' + lang.cc.join(','));
  console.log('PASS v86: language gate holds for negotiated deals and reserve replacements');

  // 3. уход капитана: ищут капитана, а не делают IGL из звёздного стрелка или энтри
  const igl = await p.evaluate(() => {
    const t = teams.find(x => x.name === 'Team Falcons'), out = t.players.find(x => x.role === 'IGL');
    const i = t.players.indexOf(out);
    const rep = CS2SmartReplace(t, out);
    if (rep) t.players[i] = rep; else t.players.splice(i, 1);
    const igls = t.players.filter(x => x.role === 'IGL');
    const cap = igls[0];
    return { out: out.nick, rep: rep && rep.nick, repRole: rep && rep.role, repFit: rep ? teamIdentityFit(t, rep) : 1, n: igls.length, cap: cap && cap.nick, capIQ: cap && +cap.tacticalIQ, capWasAwp: cap && /AWP/i.test(cap.role), last: CS2SmartReplace.last };
  });
  assert(igl.n === 1, 'exactly one IGL after the captain leaves: ' + JSON.stringify(igl));
  assert(igl.capIQ >= 80, 'new captain must be a tactical player (IQ ≥ 80): ' + JSON.stringify(igl));
  assert(igl.repFit >= 0.55, 'replacement must fit the team language');
  console.log('PASS v86: captain replacement — ' + JSON.stringify({ out: igl.out, in: igl.rep, captain: igl.cap }));

  // 4. weakLink не делает хорошего капитана «слабым звеном»
  const wl = await p.evaluate(() => teams.filter(t => !t.isAcademy).slice(0, 30).map(t => { const w = v30MarketDebug.weakLink(t); return w && w.p.role === 'IGL' && (+w.p.tacticalIQ || 0) >= 84 ? t.name : null; }).filter(Boolean));
  assert(!wl.length, 'strong IGLs must not be weak links: ' + wl.join(','));
  console.log('PASS v86: strong captains are not benched as the weak link');

  // 5. Techno и Techno4k — один игрок
  const alias = await p.evaluate(() => {
    const spirit = teams.find(t => t.name === 'Team Spirit');
    const res = [];
    for (let i = 0; i < 40; i++) { const x = V33Reserve.take({ countries: ['MN'] }); if (!x) break; res.push(x.nick); }
    const clone = JSON.parse(JSON.stringify(spirit.players[4])); clone.nick = 'Techno4k'; spirit.players[4] = clone;
    repairRosters(true);
    return { res, still: spirit.players.some(x => x.nick === 'Techno4k'), orig: teams.find(t => t.name === 'The Mongolz').players.some(x => x.nick === 'Techno') };
  });
  assert(!alias.res.some(n => /^techno4k$/i.test(n)), 'Techno4k must not be offered from the reserve while Techno plays');
  assert(!alias.still && alias.orig, 'a save with Techno4k next to Techno keeps the real Techno and removes the double');
  console.log('PASS v86: one player under two nicknames is treated as one');

  // 6. журнал: замена ушедшего ветерана не записывается дважды («Академия / FA» + выкуп)
  const dup = await p.evaluate(() => {
    const n0 = transferState.v30Moves.length;
    v29Emit('transfer', { player: 'zzTestRep', role: 'Rifler', from: 'FURIA', to: 'Team Falcons', reason: 'замена zzOld, выкуп', buyout: true });
    v29Emit('retire', { player: 'zzOld', team: 'Team Falcons', age: 36, rep: 'zzTestRep', role: 'IGL', smart: false });
    const mv = transferState.v30Moves.slice(0, transferState.v30Moves.length - n0);
    return mv.filter(m => m.player === 'zzTestRep').map(m => m.type + ':' + m.from);
  });
  assert(dup.length === 1 && /buyout/.test(dup[0]), 'replacement must be logged once: ' + dup.join(' | '));
  console.log('PASS v86: retirement replacement is logged once');

  // 7. круглые трофеи (монеты) не растягиваются
  const coin = await p.evaluate(() => {
    const out = [];
    ['Tipsport Masters 2026', 'Tipsport Cup 2026', 'Elisa Masters 2026', 'Winline Insight 2026'].forEach(n => [1, 2, 3, 4, 5].forEach(s => {
      const svg = TW.trophySvg(n, s, 'regular'), m = /scale\(([\d.]+) ([\d.]+)\)/.exec(svg);
      if (/r="27"/.test(svg) && m && Math.abs(+m[1] - +m[2]) > 1e-6) out.push(n + ' s' + s + ' ' + m[0]);
    }));
    return out;
  });
  assert(!coin.length, 'coins must keep a round shape: ' + coin.join(', '));
  console.log('PASS v86: coins and medallions keep their proportions');

  // 9. Tier-2 и любые замены — реальные игроки, а не выдуманные
  const realT2 = await p.evaluate(() => {
    const isReal = n => !!PLAYER_META_2026[n] || Object.values(TEAM_ROSTER_2026).some(r => r.includes(n)) || (CS2_REAL.reserve || []).some(x => x[0].toLowerCase() === String(n).toLowerCase()) || (CS2_REAL.freeAgents || []).includes(n) || !!(window.CS2_EMDB_2026?.players?.[n]);
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0));
    const gens = []; pro.slice(30, 90).forEach((t, i) => { const x = generateFreeAgent(t, 'Rifler', 5000 + i); gens.push([t.name, x.nick, isReal(x.nick)]); });
    // выдуманный игрок в составе Tier-2 заменяется реальным по ходу игры
    const t2 = pro[60], fake = JSON.parse(JSON.stringify(t2.players[2])); fake.nick = 'zyxkonTest'; t2.players[2] = fake;
    V33Reserve.replaceFakes(new Set());
    return { fakes: gens.filter(g => !g[2]).map(g => g[0] + ':' + g[1]), replaced: !t2.players.some(x => x.nick === 'zyxkonTest'), now: t2.players[2].nick, nowReal: isReal(t2.players[2].nick) };
  });
  assert(!realT2.fakes.length, 'Tier-2 replacements must be real players: ' + realT2.fakes.join(', '));
  assert(realT2.replaced && realT2.nowReal, 'a generated player on a Tier-2 roster is replaced with a real one: ' + realT2.now);
  console.log('PASS v86: Tier-2 teams sign real players (' + realT2.now + ' replaced a generated one)');

  // 10. слухи о командах — только при реальном плане, и у каждого есть итог
  const rum = await p.evaluate(() => {
    const t = teams.filter(x => !x.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0))[5], x = V34Roster.st(t.name);
    x.state = 'STABLE'; transferState.v30Nego = (transferState.v30Nego || []).filter(n => n.to !== t.name && n.from !== t.name);
    const noPlan = CS2TeamPlan(t.name);
    CS2RumorTruth.announce();   // первый вызов в сейве — «тихий»
    const before = V29News.all().filter(n => n.teamRumor && n.team === t.name).length;
    CS2RumorTruth.announce();
    const quietStable = V29News.all().filter(n => n.teamRumor && n.team === t.name).length === before;
    x.state = 'TRANSFER_SEARCH'; x.since = seasonState.calendar.currentMs + 1; x.signals = [{ k: 'form', w: 1, t: 'длительный спад игрока' }];
    CS2RumorTruth.announce();
    const r = V29News.all().find(n => n.teamRumor && n.team === t.name && !n.confirmed && !n.denied);
    v29Emit('signing', { player: 'zzRumorIn', role: 'Rifler', from: 'Свободный агент', to: t.name, reason: 'тест' });
    CS2RumorTruth.resolve();
    // слух без плана долго висеть не может
    const t2 = teams.filter(q => !q.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0))[8]; V34Roster.st(t2.name).state = 'STABLE';
    transferState.v30Nego = (transferState.v30Nego || []).filter(n => n.to !== t2.name && n.from !== t2.name);
    V29News.add({ cat: 'rumor', rumor: true, teamRumor: true, team: t2.name, title: 'тест слуха', lead: '', body: [], tags: [] });
    const old = V29News.all().find(n => n.title === 'тест слуха'); old.ts = seasonState.calendar.currentMs - 60 * 864e5;
    CS2RumorTruth.resolve();
    return { noPlan, quietStable, published: !!r, confirmed: !!(r && r.confirmed), oldDenied: !!(old && old.denied) };
  });
  assert(rum.noPlan === null && rum.quietStable, 'a stable team with no plans gets no rumors');
  assert(rum.published && rum.confirmed, 'a team that starts searching gets a rumor, confirmed by its signing: ' + JSON.stringify(rum));
  assert(rum.oldDenied, 'a team rumor without a plan is denied after a while');
  console.log('PASS v86: team rumors follow real plans and get an outcome');

  // 11. повышение из академии на место капитана: новичок не становится IGL, капитан в команде остаётся
  const promo = await p.evaluate(() => {
    const t = teams.find(x => x.name === 'FURIA'), cap = t.players.find(x => x.role === 'IGL'), o = V31.S().orgs?.[t.name] || null;
    const org = window.V31.org(t.name); org.prospects = org.prospects || [];
    const pr = { nick: 'zzProspect', role: 'IGL', age: 17, firepower: 80, tacticalIQ: 70, clutch: 75, utility: 75, country: 'BR', status: 'PROSPECT' };
    org.prospects.push(pr);
    const ok = V31.promoteProspect(t.name, 'zzProspect', cap.nick);
    const active = t.players.filter(x => x.status !== 'BENCH');
    const igls = active.filter(x => x.role === 'IGL');
    const newbie = active.find(x => x.academyGrad === t.name && x.v31since);
    return { ok, n: igls.length, cap: igls[0] && igls[0].nick, newbieRole: newbie && newbie.role, newbie: newbie && newbie.nick };
  });
  assert(promo.n === 1 && promo.newbieRole !== 'IGL', 'academy promotion over the captain keeps one experienced IGL: ' + JSON.stringify(promo));
  console.log('PASS v86: academy promotion does not make a rookie the captain (' + JSON.stringify(promo) + ')');

  // 8. все скрипты грузятся с новой версией кэша
  const html = require('./lib/project').pageSources();
  assert(html.includes('js/awards/trophy-forge.js') && Number(require('./lib/project').manifest().build) >= 95, 'scripts must bypass the v85 browser cache (manifest BUILD)');
  console.log('PASS v86: cache version bumped');

  assert(!errs.length, 'page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log('v86 roster sense tests passed');
})().catch(e => { console.error(e); process.exit(1); });
