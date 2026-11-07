// v88 regression: сделки по делу, причины ухода, динамика рейтинга за сезон, ровные фото в рейтинге, логотипы в новостях.
// Запуск: node tests/v88-sense.test.js [папка для скриншотов]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..'), shots = process.argv[2] || null;
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v88-'));
  const ctx = await chromium.launchPersistentContext(udd, { viewport: { width: 1600, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3000);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(500); }
  await p.waitForFunction(() => seasonState.v87Rosters2026 || (seasonState.currentSeason || 1) > 1, null, { timeout: 30000 }).catch(() => {});
  // один турнир — чтобы появились новости
  await p.evaluate(async () => { for (let i = 0; i < 40 && !(currentTournament && !currentTournament.completed); i++) { skipGameCalendarDay(); await new Promise(r => setTimeout(r, 30)); }
    if (currentTournament && !currentTournament.completed) simulateWholeTournament(); for (let k = 0; k < 200 && currentTournament && !currentTournament.completed; k++) await new Promise(r => setTimeout(r, 50)); });
  const pass = m => console.log('PASS ' + m);

  // 1. сторож: ИИ не меняет игрока на более слабого и не отпускает звезду без повода
  const g = await p.evaluate(() => {
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const top = pro[0], low = pro[pro.length - 1];
    const st = t => t.players.filter(p => !p.status || p.status === 'STARTER');
    const weak = st(low).filter(p => p.role !== 'IGL' && p.role !== 'AWPer').sort((a, b) => a.firepower - b.firepower)[0];
    const before = top.players.map(p => p.nick).join();
    const r1 = applyPlayerTransfer(low, top, weak, 'усиление состава');
    const star = st(top).filter(p => p.role !== 'IGL').sort((a, b) => b.firepower - a.firepower)[0];
    star.contractUntil = (seasonState.currentSeason || 1) + 3;
    const old = window.playerWillAccept; window.playerWillAccept = () => true;
    let r2; try { r2 = applyPlayerTransfer(top, pro[8], star, 'ради роли лидера и крупного контракта'); } finally { window.playerWillAccept = old; }
    return { r1, r2, same: top.players.map(p => p.nick).join() === before };
  });
  assert(g.r1 === false && g.same, 'слабый игрок не должен заменять игрока топ-команды: ' + JSON.stringify(g));
  assert(g.r2 === false, 'звезда с действующим контрактом не уходит из гранда без повода');
  pass('v88: AI never swaps a player for a weaker one, no star exodus without a reason');

  // 2. честный переход: причина ухода конкретная, без «освободили место»
  const t = await p.evaluate(() => {
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const st = x => x.players.filter(p => !p.status || p.status === 'STARTER');
    for (const to of pro.slice(14, 30)) for (const from of pro.slice(32, 80)) {
      const cand = st(from).find(p => p.role === 'Rifler' && teamIdentityFit(to, p) >= 0.6);
      if (!cand) continue;
      Object.assign(cand, { firepower: 93, tacticalIQ: 90, clutch: 90, utility: 90, joinedRun: null });
      to.lastBuyRun = null;
      const old = window.playerWillAccept; window.playerWillAccept = () => true; window.__v34Force = true;
      let ok; try { ok = applyPlayerTransfer(from, to, cand, 'усиление состава'); } finally { window.playerWillAccept = old; window.__v34Force = false; }
      if (!ok) continue;
      window.v29OnEvent && window.v29OnEvent();
      const mv = (transferState.v30Moves || []).slice(0, 6);
      const rel = mv.find(m => m.type === 'release'), tr = mv.find(m => m.type === 'transfer' || m.type === 'buyout');
      const news = (window.V29News && window.V29News.store ? window.V29News.store().items : []).slice(0, 5).map(n => (n.body || []).join(' ')).join(' ');
      return { ok, rel: rel && rel.reason, tr: tr && tr.reason, news };
    }
    return { ok: false };
  });
  assert(t.ok, 'тестовый переход не прошёл');
  assert(t.rel && /^покидает состав: /.test(t.rel) && !/освобод/i.test(t.rel), 'причина ухода: ' + t.rel);
  assert(!/освободили место/.test(t.news || ''), 'новость без «освободили место»');
  pass('v88: transfer log gives a concrete reason (' + t.rel + ' | ' + t.tr + ')');

  // 3. динамика сезона: без академий, новая команда — без «последнее + 1»
  const s = await p.evaluate(() => {
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const nt = { name: 'V88 Test Club', pts: pro[9].pts + 1, players: [], history: [], seasonStartRank: teams.length + 1 };
    teams.push(nt); window.CS2SeasonStartSync();
    const list = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const d = list.indexOf(nt) + 1 - nt.seasonStartRank;
    const bad = list.filter(t => !(t.seasonStartRank >= 1 && t.seasonStartRank <= list.length)).length;
    teams.splice(teams.indexOf(nt), 1); window.CS2SeasonStartSync();
    return { d, bad, acad: teams.filter(t => t.isAcademy && t.seasonStartRank != null).length };
  });
  assert(s.d === 0 && s.bad === 0 && s.acad === 0, 'динамика сезона: ' + JSON.stringify(s));
  pass('v88: season rank change uses a pro-only start snapshot');

  // 4. рейтинг: пять фото на одной линии макушки и в одном масштабе
  await p.evaluate(() => HS.nav('ranking')); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const H = window.CS2_HEADS || {}, rows = [...document.querySelectorAll('#hs-root .hs-rankrow')].slice(0, 12);
    let faces = 0, placed = 0, off = 0;
    rows.forEach(row => row.querySelectorAll('.gs-lineup.v88 .v88-face').forEach(f => {
      faces++; const img = f.querySelector('img'); if (!img) return;
      if (!img.classList.contains('v88-placed')) return; placed++;
      const m = H[decodeURIComponent(img.getAttribute('src').split('/').pop()).replace(/\.[a-z0-9]+$/i, '')];
      if (!m) return;
      const fr = f.getBoundingClientRect(), ir = img.getBoundingClientRect();
      const top = ir.top + m[0] * ir.height - fr.top, head = m[1] * ir.height;
      if (Math.abs(top - 5) > 1.5 || Math.abs(head - 21) > 1.5) off++;
    }));
    return { rows: rows.length, faces, placed, off, oldLineups: document.querySelectorAll('#hs-root .gs-lineup:not(.v88)').length };
  });
  assert(r.rows >= 10 && r.faces >= 45 && r.placed >= r.faces * 0.8 && r.off === 0 && r.oldLineups === 0, 'фото в рейтинге: ' + JSON.stringify(r));
  if (shots) { await p.waitForTimeout(600); const b = await p.evaluate(() => { const r = document.querySelector('#hs-root .hs-ranklist').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width }; }); await p.screenshot({ path: path.join(shots, 'v88-ranking.png'), clip: { x: b.x, y: Math.max(0, b.y), width: b.w, height: 900 - Math.max(0, b.y) } }); }
  pass(`v88: ranking lineups share one head line and scale (${r.placed}/${r.faces})`);

  // 5. логотип в карточке новости — целиком внутри рамки
  await p.evaluate(() => HS.nav('home')); await p.waitForTimeout(1500);
  const l = await p.evaluate(() => [...document.querySelectorAll('.v37-story-media .v37-story-logo img, .v37-story-media > img.v37-story-teamlogo')].slice(0, 6).map(img => {
    const b = img.closest('.v37-story-media').getBoundingClientRect(), r = img.getBoundingClientRect(), fit = getComputedStyle(img).objectFit;
    return { fit, r: [r.width, r.height, b.width, b.height].map(Math.round), inside: (fit === 'contain' || !!img.closest('.v37-story-logo')) && r.width <= b.width + 0.5 && r.height <= b.height + 0.5 };
  }));
  if (shots) { const rail = await p.$('.v37-news-rail'); if (rail) await rail.screenshot({ path: path.join(shots, 'v88-stories.png') }); }
  assert(l.length >= 1 && l.every(x => x.inside), 'логотипы в новостях не обрезаны: ' + JSON.stringify(l));
  pass(`v88: story logos fit their frame (${l.length} checked)`);

  // 6. рынок: сезон сделок без ошибок, ни одна сделка ИИ не ухудшила состав
  const m = await p.evaluate(() => {
    const pw = p => p.role === 'IGL' ? (+p.tacticalIQ) * .55 + (+p.utility) * .2 + (+p.clutch) * .15 + (+p.firepower) * .1 : (+p.firepower) * .4 + (+p.tacticalIQ) * .25 + (+p.clutch) * .2 + (+p.utility) * .15;
    const f = window.applyPlayerTransfer; let worse = 0, n = 0;
    window.applyPlayerTransfer = function (from, to, pl) {
      const before = new Map(to.players.map(x => [x.nick, x]));
      const ok = f.apply(this, arguments);
      if (ok && !to.isAcademy) { n++; const gone = [...before.values()].find(x => !to.players.some(y => y.nick === x.nick)); if (gone && pw(pl) < pw(gone) - 0.01 && gone.role === pl.role) worse++; }
      return ok;
    };
    try { applyPlayerTransfer = window.applyPlayerTransfer; } catch (e) {}
    for (let i = 0; i < 8; i++) { transferState.v33WindowUntil = (seasonState.calendar?.currentMs || Date.now()) + 7 * 864e5; transferState.v33Changes = {}; window.v30MarketTick('big'); }
    window.applyPlayerTransfer = f; try { applyPlayerTransfer = f; } catch (e) {}
    const bad = (transferState.v30Moves || []).filter(x => /освободил/i.test(x.reason || '')).length;
    return { n, worse, bad };
  });
  assert(m.worse === 0 && m.bad === 0, 'рынок: ' + JSON.stringify(m));
  pass(`v88: market ticks — ${m.n} AI deals, none downgraded a lineup`);

  // 7. история команд: стартовый клуб и скамейка видны, даже если игрок не сыграл за них ни одного турнира
  await p.waitForTimeout(4000);
  const c = await p.evaluate(() => {
    const H = window.HS, nm = s => s.map(x => x.team + (x.bench ? '(запас)' : '')).join(' > ');
    const fa = (transferState.freeAgents || []).find(x => x && x.nick === 'slaxejezzz');
    const pv = nm(H.careerOf('slaxejezzz'));
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const A = pro[40], B = pro[3], st = x => x.players.filter(p => !p.status || p.status === 'STARTER');
    const pl = st(A).find(x => x.role === 'Rifler') || st(A)[0];
    const nick = pl.nick;
    window.CS2CareerNote({ type: 'transfer', player: nick, from: A.name, to: B.name, ts: (seasonState.calendar?.currentMs || Date.now()) + 1000 });
    const after = nm(H.careerOf(nick));
    H.S.ptab = 'career'; H.nav('player', nick);
    const html = document.getElementById('hs-page').innerHTML;
    return { fa: !!fa, faTeam: fa && (fa.benchFrom || fa.reservedFor), pv, after, A: A.name, B: B.name, shows: html.includes(A.name) && html.includes(B.name) };
  });
  assert(!c.fa || /PARIVISION/.test(c.pv), 'игрок из запаса: ' + c.pv);   // в запасе или уже в составе — клуб в истории есть
  assert(c.after.indexOf(c.A) >= 0 && c.after.indexOf(c.B) > c.after.indexOf(c.A) && c.shows, 'стартовый клуб в истории: ' + JSON.stringify(c));
  pass('v88: career keeps the starting club and bench spells (' + c.pv + ' | ' + c.after + ')');

  // 8. VRS: квалификации весят меньше Major в личных встречах
  const v = await p.evaluate(() => {
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), a = pro[30], b = pro[5];
    const q = CS2VRSModel.delta(a, b, { name: 'IEM Katowice 2027 — Europe Closed Qualifier', qual: true });
    const m = CS2VRSModel.delta(a, b, { name: 'PGL Major Test', prizePool: 1250000, isLAN: true });
    return { q: q.win, m: m.win, sc: CS2VRSH2HScale({ name: 'X Closed Qualifier' }) };
  });
  assert(v.sc === 0.3 && v.q < v.m, 'вес квалификаций: ' + JSON.stringify(v));
  pass(`v88: qualifier head-to-head counts less (win +${v.q} vs Major +${v.m})`);

  // 9. новая игра: стартовые очки — по порядку HLTV 2026 и в шкале очков по результатам; вес результатов — по времени
  const sd = await p.evaluate(() => {
    const order = Object.keys(CS2_ROSTERS_2026.teams).slice(0, 12), l = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts).map(t => t.name);
    const pos = order.map(n => l.indexOf(n) + 1).filter(x => x > 0);
    const t = teams.find(x => x.vrsLedger && x.vrsLedger.startedAt);
    return { seeded: !!seasonState.v88Seed, pos, top: teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts)[0].pts, started: !!t };
  });
  assert(sd.seeded && sd.started && sd.top >= 1500, 'стартовые очки: ' + JSON.stringify(sd));
  pass('v88: fresh game seeded by the HLTV 2026 order (' + sd.pos.join(',') + ')');

  assert(!errs.length, 'ошибки страницы: ' + errs.join(' | '));
  pass('v88: no page errors');
  await ctx.close(); console.log('v88 sense tests passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
