// v89 regression: вес фоновых турниров в VRS, лимит личных встреч, недельный статус Tier без «досчитанных» недель,
// защита звёзд от собственного клуба, единый список кандидатов и оценка капитана по тактике.
// Запуск: node tests/v89-fair.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v89-'));
  const ctx = await chromium.launchPersistentContext(udd, { viewport: { width: 1400, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3000);
  const lg = await p.$('#v84-legacy-modal [data-lg="zero"]'); if (lg) { await lg.click(); await p.waitForTimeout(500); }
  await p.waitForFunction(() => window.CS2V89 && window.v30MarketDebug && window.CS2VRSH2H, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);

  // 1. VRS: значимость фонового турнира (pointsMult) входит в личные встречи
  const v = await p.evaluate(() => {
    const sc = window.CS2VRSH2HScale;
    const t2 = { name: 'X Tier2 Cup', tier: '2', kind: 'tier2', prize: 50000, pointsMult: 0.35 };
    const t3 = { name: 'X Tier3 Cup', tier: '3', kind: 'tier3', prize: 15000, pointsMult: 0.12 };
    const major = { name: 'Test Major', prizePool: 1250000, isMajor: true };
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const d = ev => window.CS2VRSModel.delta(pro[40], pro[41], ev).win;
    return { s2: sc(t2), s3: sc(t3), sm: sc(major), w2: d(t2), w3: d(t3), wm: d(major) };
  });
  assert(Math.abs(v.s2 - 0.35) < 1e-9 && Math.abs(v.s3 - 0.12) < 1e-9 && v.sm === 1, 'вес турниров: ' + JSON.stringify(v));
  assert(v.w3 < v.w2 && v.w2 < v.wm, 'прибавка за победу растёт со значимостью: ' + JSON.stringify(v));
  pass(`v89: tournament significance drives H2H (Tier-3 +${v.w3}, Tier-2 +${v.w2}, Major +${v.wm})`);

  // 2. H2H — ограниченный набор: 60 побед на Tier-3 дают не больше лимита, топ-12 побед — не сумма всех
  const h = await p.evaluate(() => {
    const H = window.CS2VRSH2H, now = seasonState.calendar.currentMs;
    const low = Array.from({ length: 60 }, () => ({ date: now, won: true, h2hDelta: 5, low: true }));
    const hi = Array.from({ length: 30 }, () => ({ date: now, won: true, h2hDelta: 10, low: false, eventWeight: 0.8, isLAN: true }));
    const loss = Array.from({ length: 30 }, () => ({ date: now, won: false, h2hDelta: -3, low: true }));
    return { low: H.sum(low, now), hi: H.sum(hi, now), mix: H.sum(hi.concat(low, loss), now), oldLow: H.isLowEntry({ eventWeight: 0.12, isLAN: false }), cap: H.LOW_CAP, top: H.TOP };
  });
  assert(h.low === h.cap, '60 побед Tier-3 ограничены лимитом: ' + JSON.stringify(h));
  assert(h.hi === h.top * 10, 'учитываются только лучшие победы: ' + JSON.stringify(h));
  assert(h.mix === h.top * 10 - h.top * 3, 'сильные победы вытесняют слабые, поражения тоже ограничены: ' + JSON.stringify(h));
  assert(h.oldLow === true, 'старые записи без пометки распознаются по весу события');
  pass('v89: head-to-head counts the best ' + h.top + ' results, low-tier wins capped at ' + h.cap);

  // 3. серия фоновых побед Tier-3 не подбрасывает команду
  const run = await p.evaluate(() => {
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const me = pro[45], opp = pro.slice(40, 60).filter(t => t !== me);
    window.CS2VRSModel.ensureTeam(me);
    const before = me.vrsLedger.matches.length, h0 = window.CS2VRSH2H.sum(me.vrsLedger.matches, seasonState.calendar.currentMs);
    const ev = { name: 'V89 Tier3 Run', tier: '3', kind: 'tier3', prize: 15000, pointsMult: 0.12 };
    for (let i = 0; i < 50; i++) window.CS2VRSModel.applyMatch(me, opp[i % opp.length], me.name, ev, null);
    const h1 = window.CS2VRSH2H.sum(me.vrsLedger.matches, seasonState.calendar.currentMs);
    const added = me.vrsLedger.matches.slice(before);
    return { gain: h1 - h0, low: added.every(m => m.low === true), sig: added[0] && added[0].sig };
  });
  assert(run.low && run.sig === 0.12, 'записи фонового турнира помечены: ' + JSON.stringify(run));
  assert(run.gain <= 40.01, '50 побед на Tier-3 дают не больше 40 очков H2H: ' + JSON.stringify(run));
  pass('v89: 50 Tier-3 wins add only +' + run.gain.toFixed(1) + ' H2H');

  // 4. Tier-статус: пропущенные недели — «нет данных», не подтверждённая стабильность
  const tr = await p.evaluate(() => {
    const T = window.CS2Tiers, st = T.state(); T.init();
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const t = pro[20], rec = st.teams[t.name] || (st.teams[t.name] = { t: 2, since: 0, r: [] });
    rec.t = 2; rec.r = [];
    const wk = Math.floor(seasonState.calendar.currentMs / (7 * 864e5)); st.week = wk - 5;   // «перемотка» на 5 недель
    T.weekly();
    const after1 = { t: rec.t, r: rec.r.slice(0, 5) };
    return { after1, hasNull: rec.r.slice(1, 5).every(x => x === null) };
  });
  assert(tr.hasNull && tr.after1.r[0] > 0, 'пропущенные недели не заполняются текущим местом: ' + JSON.stringify(tr));
  assert(tr.after1.t === 2, 'одна замеренная неделя не даёт Tier-1: ' + JSON.stringify(tr));
  pass('v89: skipped weeks are not counted as stable top-24 weeks');

  // 5. звезда: не «слабое звено» без спада, статус не теряется на скамейке
  const s = await p.evaluate(() => {
    const S = window.CS2Stature; S.reset();
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    let team = null, star = null;
    for (const t of pro.slice(0, 20)) { const st = t.players.filter(x => !x.status || x.status === 'STARTER'); const s0 = st.find(x => S.tier(x) === 'star' && x.role !== 'IGL'); if (s0) { team = t; star = s0; break; } }
    if (!star) return { none: true };
    const keep = { ...star };
    // делаем звезду слабейшей в пятёрке по текущим показателям, без спада формы
    Object.assign(star, { firepower: 60, tacticalIQ: 60, clutch: 60, utility: 60, form: 100, age: 26, joinedRun: null });
    S.reset();
    const tier = S.tier(star), w1 = window.v30MarketDebug.weakLink(team);
    const notWeak = !w1 || w1.p !== star;
    // явный спад — звезду уже можно заменить
    star.form = 85; const w2 = window.v30MarketDebug.weakLink(team); const weakWhenSlump = !!w2 && w2.p === star;
    Object.assign(star, keep);
    // скамейка: вес карьеры не теряется
    S.reset(); const before = S.score(star), tb = S.tier(star);
    star.status = 'BENCH'; S.reset(); const onBench = S.score(star), tbench = S.tier(star); star.status = 'STARTER'; S.reset();
    return { nick: star.nick, team: team.name, tier, notWeak, weakWhenSlump, before, onBench, tb, tbench };
  });
  assert(!s.none, 'нет звезды в топ-20 для проверки');
  assert(s.tier === 'star' && s.notWeak, 'звезда без спада не слабое звено: ' + JSON.stringify(s));
  assert(s.weakWhenSlump, 'звезду в затяжном спаде можно заменить: ' + JSON.stringify(s));
  assert(s.onBench === s.before && s.tbench === s.tb, 'скамейка не обнуляет вес карьеры: ' + JSON.stringify(s));
  pass(`v89: star ${s.nick} (${s.team}) is not the weak link without a slump; bench keeps stature (${s.before})`);

  // 6. история до 2026 года учитывается, даже если не импортирована
  const lgS = await p.evaluate(() => { const S = window.CS2Stature; S.reset(); return { mode: seasonState.v84LegacyChoice || null, zyw: S.score({ nick: 'ZywOo' }), none: S.score({ nick: 'v89-nobody' }) }; });
  assert(lgS.zyw >= 15 && lgS.none === 0, 'карьера до 2026 года в весе игрока: ' + JSON.stringify(lgS));
  pass('v89: pre-2026 career counts toward stature (ZywOo ' + lgS.zyw + ', mode ' + lgS.mode + ')');

  // 7. академия vs рынок; капитан — по тактике
  const m = await p.evaluate(() => {
    const D = window.v30MarketDebug;
    const ac = teams.find(a => a.isAcademy && (a.academyParent || a.parentTeam) && teams.some(t => t.name === (a.academyParent || a.parentTeam) && !t.isAcademy));
    if (!ac) return { none: true };
    const team = teams.find(t => t.name === (ac.academyParent || ac.parentTeam));
    const st = team.players.filter(x => !x.status || x.status === 'STARTER');
    const igl = st.find(x => x.role === 'IGL'); if (!igl) return { none: 'igl' };
    const saved = JSON.parse(JSON.stringify({ team: team.players, ac: ac.players, fa: transferState.freeAgents }));
    const fit = (x, ref) => Object.assign(x, { country: ref.country, nationality: ref.nationality, lang: ref.lang, language: ref.language });
    try {
      // капитан: у воспитанника-капитана стрельба лучше, тактика хуже — повышение не проходит
      Object.assign(igl, { firepower: 70, tacticalIQ: 88, clutch: 75, utility: 80, form: 100, age: 27 });
      const kid = ac.players[0]; fit(kid, igl);
      Object.assign(kid, { role: 'IGL', firepower: 95, tacticalIQ: 70, clutch: 85, utility: 75, age: 19, form: 100, onLoan: null });
      const wIgl = { p: igl, gap: 3 };
      const aIgl = D.findAcademy(team, wIgl);
      // обычная позиция: воспитанник чуть сильнее, свободный агент — намного сильнее → выбирается агент
      const out = st.find(x => x.role !== 'IGL' && x.role !== 'AWPer');
      Object.assign(out, { firepower: 74, tacticalIQ: 74, clutch: 74, utility: 74, form: 100, age: 26 });
      const w = { p: out, gap: 5 };
      Object.assign(kid, { role: out.role, firepower: 78, tacticalIQ: 76, clutch: 76, utility: 76 });
      const fa = JSON.parse(JSON.stringify(out)); fit(fa, out);
      Object.assign(fa, { nick: 'v89FreeAgent', firepower: 90, tacticalIQ: 86, clutch: 86, utility: 86, age: 25, status: 'FREE AGENT', benchFrom: null, reservedFor: null, v30ProOrigin: true });
      transferState.freeAgents.push(fa);
      const list = D.candidates(team, w).map(c => c.src + ':' + c.p.nick + ':' + c.gain.toFixed(1));
      // слабое звено, которое лишь немного хуже воспитанника (+0.5), молодым игроком больше не заменяется
      Object.assign(kid, { firepower: 74.6, tacticalIQ: 74.6, clutch: 74.6, utility: 74.6 });
      ac.players.forEach(x => { if (x !== kid) Object.assign(x, { firepower: 50, tacticalIQ: 50, clutch: 50, utility: 50 }); });
      const tiny = D.findAcademy(team, w);
      return { aIgl: !!aIgl, first: list[0] || '', list, tiny: !!tiny };
    } finally { team.players = saved.team; ac.players = saved.ac; transferState.freeAgents = saved.fa; }
  });
  assert(!m.none, 'нет академии для проверки: ' + JSON.stringify(m));
  assert(!m.aIgl, 'капитан не уступает место воспитаннику, который лучше стреляет, но хуже ведёт игру');
  const iFa = m.list.findIndex(x => /^fa:v89FreeAgent/.test(x)), iAc = m.list.findIndex(x => /^academy:/.test(x));
  const gains = m.list.map(x => +x.split(':').pop());
  assert(iFa >= 0 && (iAc < 0 || iFa < iAc), 'сильный свободный агент выше воспитанника в общем списке: ' + JSON.stringify(m.list));
  assert(gains.every((g, i) => i === 0 || gains[i - 1] >= g), 'кандидаты отсортированы по усилению: ' + JSON.stringify(m.list));
  assert(!m.tiny, 'воспитаннику не хватает +0.5 для места в основе');
  pass('v89: one candidate list (' + m.list.join(' | ') + '), IGL judged by tactics');

  // 8. рынок по-прежнему работает
  const ticks = await p.evaluate(() => { let n = 0; for (let i = 0; i < 4; i++) { try { n += window.v30MarketTick('big') || 0; } catch (e) { return 'err ' + e.message; } } return n; });
  assert(typeof ticks === 'number', 'тик рынка: ' + ticks);
  pass('v89: market ticks run (' + ticks + ' moves)');

  // 9. все пути изменения состава (покупка, свободный агент, академия, аренда) — без ухудшения позиции и без звёзд на скамейке
  const all = await p.evaluate(() => {
    const val = (x, role) => (role || x.role) === 'IGL' ? (+x.tacticalIQ) * .55 + (+x.utility) * .2 + (+x.clutch) * .15 + (+x.firepower) * .1 : (+x.firepower) * .4 + (+x.tacticalIQ) * .25 + (+x.clutch) * .2 + (+x.utility) * .15;
    const R = window.V34Roster, a0 = R && R.allowSearch, r0 = R && R.replaceable;
    if (R) { R.allowSearch = () => true; R.replaceable = () => true; }   // открываем рынок, чтобы прошли все ветки
    const S = window.CS2Stature; let changes = 0, worse = [], starBench = [];
    const bus = () => (window.__v29Bus || []).length;
    try {
      for (let i = 0; i < 12; i++) {
        transferState.v33WindowUntil = (seasonState.calendar?.currentMs || Date.now()) + 7 * 864e5; transferState.v33Changes = {};
        const snap = new Map(teams.filter(t => !t.isAcademy).map(t => [t, t.players.map(x => x && (!x.status || x.status === 'STARTER') ? { nick: x.nick, role: x.role, v: val(x), star: S.shielded(x, t) } : null)]));
        const b0 = bus();
        window.v30MarketTick('big');
        const evs = (window.__v29Bus || []).slice(b0).filter(e => /retire|loan-return|standin/.test(e.type));
        const skip = new Set(); evs.forEach(e => { const d = e.data || {}; [d.team, d.from, d.to].forEach(n => n && skip.add(n)); });
        snap.forEach((before, t) => {
          if (skip.has(t.name)) return;
          before.forEach((o, i) => { const x = t.players[i]; if (!o || !x || x.nick === o.nick) return;
            if (t.players.some(y => y.nick === o.nick && (!y.status || y.status === 'STARTER'))) return;   // перестановка внутри состава
            if (teams.some(tt => tt !== t && (tt.players || []).some(y => y.nick === o.nick))) return;      // игрока купили — замена у продавшей команды
            changes++;
            const g = val(x, o.role) - o.v; if (g < -0.01) worse.push(`${t.name}: ${o.nick}→${x.nick} ${g.toFixed(1)}`);
            if (o.star) starBench.push(`${t.name}: ${o.nick}`);
          });
        });
      }
    } finally { if (R) { R.allowSearch = a0; R.replaceable = r0; } }
    return { changes, worse, starBench };
  });
  assert(!all.worse.length, 'замены ухудшили позицию: ' + JSON.stringify(all.worse));
  assert(!all.starBench.length, 'звёзды без спада убраны из основы: ' + JSON.stringify(all.starBench));
  pass(`v89: ${all.changes} roster changes over all paths — none downgraded a position, no star benched`);

  // 10. Swiss: 3 победы — выход, 3 поражения — вылет, без повторных встреч, плей-офф для 8 вышедших
  const sw = await p.evaluate(() => { const runOnce = () => {
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts).slice(30, 46).map(t => t.name);
    const now = seasonState.calendar.currentMs;
    const ev = { id: 'V89-SWISS', name: 'V89 Swiss Test', tier: '2', kind: 'tier2', format: 'swiss', prize: 50000, pointsMult: 0.35, participants: pro.slice(), startMs: now - 30 * 864e5, endMs: now, status: 'scheduled', matches: [], results: [], standings: [] };
    window.v22BuildBracketRef(ev); ev.status = 'live';
    const far = now + 365 * 864e5; let guard = 0;
    while (!ev.winner && guard++ < 20) window.v22AdvanceRef(ev, ev.br.matches.reduce((a, m) => Math.max(a, m.at), 0) + 864e5 * 2, true);
    const swm = ev.br.matches.filter(m => ev.br.rounds[m.r].grp === 'Швейцарка');
    const keys = swm.map(m => [m.t1, m.t2].sort().join('|'));
    const rec = ev.standings.map(x => x.wins + '-' + x.losses);
    const adv = ev.standings.filter(x => x.st === 'adv').map(x => x.team);
    const po = ev.br.matches.filter(m => ev.br.rounds[m.r].grp === 'Плей-офф');
    const res = { v: ev.br.swissV, swiss: swm.length, rematch: keys.length - new Set(keys).size, rec: [...new Set(rec)].sort(), ok: ev.standings.every(x => x.wins === 3 || x.losses === 3),
      adv: adv.length, po: po.length, poOk: po.every(m => m.w && m.sc !== 'w/o'), winnerAdv: adv.includes(ev.winner), places: new Set(ev.placements).size, wo: swm.filter(m => m.sc === 'w/o').length };
    return res; };
    // 6 турниров: без повторных встреч и с корректным выходом в каждом
    let last = null; for (let k = 0; k < 6; k++) { last = runOnce(); if (last.rematch || !last.ok || last.adv !== 8 || last.wo || last.places !== 16) return last; }
    return last;
  });
  assert(sw.v === 2 && sw.swiss === 33 && sw.ok && sw.rematch === 0 && sw.wo === 0, 'Swiss: ' + JSON.stringify(sw));
  assert(sw.adv === 8 && sw.po === 7 && sw.poOk && sw.winnerAdv && sw.places === 16, 'Swiss → плей-офф: ' + JSON.stringify(sw));
  pass('v89: Swiss to 3 wins/3 losses (' + sw.rec.join(', ') + '), 8 advance to a 7-match playoff');

  // 11. квалификация платит призовые; дивиденды — отдельная категория; тренировки работают с картами; HLTV видит фон
  const misc = await p.evaluate(() => {
    const V = window.V31, out = {};
    // HLTV World Ranking получает фоновые турниры
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts).slice(50, 58).map(t => t.name);
    const ev = { id: 'V89-HLTV', name: 'V89 Tier2 Event', tier: '2', prize: 50000, completedAt: seasonState.calendar.currentMs };
    window.V41.recordParallel(ev, pro);
    out.hltv = (window.V41.state().ledger[pro[0]] || []).some(e => e.ev === 'V89 Tier2 Event' && e.place === 1);
    // призовые квалификации: в архиве есть фонд, оплата — один раз
    const snap = { id: 'P-V89-Q', name: 'V89 Qualifier', prestige: 'qual', season: seasonState.currentSeason, results: pro.map((n, i) => ({ n, p: i + 1 })), prizePool: 20000 };
    V.payPrizes(snap); V.payPrizes(snap);
    out.paid = (V.org(pro[0]).ledger || []).filter(x => x.kind === 'prize' && /V89 Qualifier/.test(x.note || '')).map(x => x.amt);
    // дивиденды
    const y = V.org(pro[0]).hist[seasonState.currentSeason]; out.ownerCat = y && 'owner' in y;
    // тренировки: слабейшая карта, работа над картой
    const wk = Math.floor(seasonState.calendar.currentMs / 864e5 / 7);
    // коммуникацию тренировали на прошлой неделе — теперь очередь других фокусов
    const cands = teams.filter(x => !x.isAcademy && V.teamConf(x) >= 45);
    cands.forEach(x => { x.v89commWeek = wk - 1; });
    for (const t of cands) {
      const stats = { [t.name]: { Mirage: { n: 10, w: 8 }, Nuke: { n: 10, w: 1 }, Inferno: { n: 6, w: 3 } } };
      t.v89mapWeek = -5; t.players.forEach(x => { x.fatigue = 10; });
      const plan = V.aiTrainingPlan(t, stats); out.plan = plan; out.team = t.name;
      if (plan.mapWork) { t.v89mapWeek = Math.floor(seasonState.calendar.currentMs / 864e5 / 7) - 1; out.again = V.aiTrainingPlan(t, stats).mapWork; break; }
    }
    return out;
  });
  assert(misc.hltv, 'HLTV World Ranking видит фоновые турниры');
  assert(misc.paid.length === 1 && misc.paid[0] === 8000, 'призовые квалификации (40% от $20 000), один раз: ' + JSON.stringify(misc.paid));
  assert(misc.ownerCat, 'категория дивидендов в годовой истории');
  assert(misc.plan && misc.plan.map === 'Nuke' && misc.plan.mapWork && misc.plan.focus === 'mapcontrol', 'тренировка — контроль слабейшей карты: ' + JSON.stringify(misc));
  assert(misc.again === false, 'карту не тренируют две недели подряд: ' + JSON.stringify(misc));
  pass('v89: HLTV ranking gets background events, qualifier pays ' + misc.paid + ', owner category, training plan ' + JSON.stringify(misc.plan));

  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert(html.includes('v89-fair.js?v=111') && !html.includes('?v=93'), 'cache version bumped');
  assert(!errs.length, 'ошибки страницы: ' + errs.join(' | '));
  pass('v89: no page errors, cache version bumped');
  await ctx.close(); console.log('v89 fair tests passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
