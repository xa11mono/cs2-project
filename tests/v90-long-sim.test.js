// v90 · Этап 0: долгая симуляция мира (режим наблюдателя) с проверкой инвариантов и отчётом.
// Запуск: node tests/v90-long-sim.test.js [недель=20] [файл-отчёта.json]
// Перемотка — штатная (v33SkipDays): прогон «по дням» раздувает страницу до десятков ГБ.
// При нарушении в отчёт попадает цепочка событий журнала (CS2Journal), которая к нему привела.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
(async () => {
  const dir = path.resolve(__dirname, '..');
  const weeks = Math.max(1, +process.argv[2] || 20);
  const reportFile = process.argv[3] || path.join(os.tmpdir(), `cs2-v90-long-sim-${Date.now()}.json`);
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v90sim-')), { viewport: { width: 1280, height: 800 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3000);
  await require('./lib/project').chooseStart(p, 'history');
  // v146: защита стартовых составов (roster.freshDays) выключена — тест меряет долгую жизнь мира, а не старт сезона
  await p.evaluate(() => { try { window.CS2Config.set('roster.freshDays', 0); } catch (e) {} });
  await p.waitForFunction(() => window.CS2Roster && window.v33SkipDays && seasonState.v88Seed, null, { timeout: 40000 }).catch(() => {});

  // снимок мира на старте
  const start = await p.evaluate(() => {
    const S = window.CS2Stature; S.reset && S.reset();
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const elite = []; pro.forEach(t => (t.players || []).forEach(x => { const tr = S.tier(x); if (tr === 'franchise' || tr === 'star') elite.push({ nick: x.nick, tier: tr, team: t.name, age: +x.age || null }); }));
    let awards = 0; try { const A = window.RewardSystem.getAllPlayerAwards(); Object.values(A).forEach(r => { awards += (r.ti || []).length + (r.aw || []).length + (r.mvp || []).length; }); } catch (e) {}
    const top100 = pro.flatMap(t => (t.players || []).filter(x => x && (!x.status || x.status === 'STARTER'))).map(x => window.CS2Develop ? window.CS2Develop.pow(x) : 0).sort((a, b) => b - a).slice(0, 100);
    return { date: seasonState.calendar.currentMs, season: seasonState.currentSeason, top100: top100.reduce((a, b) => a + b, 0) / Math.max(1, top100.length), ranks: Object.fromEntries(pro.map((t, i) => [t.name, i + 1])), elite, awards, archive: Object.keys(window.hubArchiveExport ? window.hubArchiveExport() : {}).length, journal: (transferState.v90Journal || []).length,
      // v95: баланс на дистанции — возраст основы, бюджеты, разброс очков VRS
      age: (() => { const st = pro.flatMap(t => (t.players || []).filter(x => x && (!x.status || x.status === 'STARTER'))); return st.reduce((a, x) => a + (+x.age || 24), 0) / Math.max(1, st.length); })(),
      budgetMed: (() => { const b = pro.map(t => Number(window.V31.org(t.name).budget) || 0).sort((a, b) => a - b); return b[Math.floor(b.length / 2)]; })(),
      ptsTop: pro[0].pts, pts20: pro[19].pts, pts50: pro[49].pts };
  });

  // сборка мусора каждую неделю: без неё Chromium в плотном цикле перемотки копит гигабайты мусора и падает по памяти
  // (живых данных при этом ~30 МБ за 9 недель — утечки нет). RSS процессов браузера пишется в отчёт.
  let cdp = null; try { cdp = await ctx.newCDPSession(p); } catch (e) {}
  const rssMB = () => { try { const out = require('child_process').execSync("ps -C chrome-headless-shell,chrome-headless,chrome,chromium -o rss= 2>/dev/null || true").toString(); return Math.round(out.split(/\s+/).filter(Boolean).reduce((a, x) => a + (+x || 0), 0) / 1024); } catch (e) { return null; } };
  const timeline = [];
  for (let w = 1; w <= weeks; w++) {
    const r = await p.evaluate(async () => {
      const target = seasonState.calendar.currentMs + 7 * 864e5;
      for (let k = 0; k < 12 && seasonState.calendar.currentMs < target - 3600e3; k++) {
        const left = Math.max(1, Math.round((target - seasonState.calendar.currentMs) / 864e5));
        try { await window.v33SkipDays(left); } catch (e) {}
        // v94: турниры проводит сама перемотка — в их даты. Раньше тест принудительно проигрывал текущий турнир сразу,
        // календарь сжимался (14 турниров сезона — к августу) и сезон менялся на 4 месяца раньше.
        document.querySelectorAll('#v84-legacy-modal').forEach(x => x.remove());
      }
      // v95: журнал хранит последние 800 записей — на 3–5 сезонах ранние записи вытесняются; тест копит нужное каждую неделю
      const L = window.__lsAcc = window.__lsAcc || { lastTs: 0, vol: {}, untracked: [], chain: {} };
      const fresh = window.CS2Journal.list().filter(e => e.ts > L.lastTs);
      fresh.forEach(e => {
        if (e.type === 'ROSTER_CHANGE' && /^ai/.test(e.actor || '') && ['fa', 'buy', 'academy', 'loan'].includes(e.kind)) L.vol[e.team] = (L.vol[e.team] || 0) + 1;
        if (e.type === 'UNTRACKED') L.untracked.push({ date: new Date(e.ts).toISOString().slice(0, 10), team: e.team, player: e.player, reason: e.reason, bus: e.bus });
        const ps = [e.player, e.out].concat(e.players || []).filter(Boolean);
        ps.forEach(n => { const c = L.chain[n] = L.chain[n] || []; c.unshift(`${new Date(e.ts).toISOString().slice(0, 10)} ${e.type} ${e.team || ''} ${e.kind || e.action || ''} ${e.reason || ''}`.slice(0, 160)); if (c.length > 6) c.length = 6; });
      });
      if (fresh.length) L.lastTs = Math.max(...fresh.map(e => e.ts));
      const integ = window.CS2Roster.checkAll();
      return { date: new Date(seasonState.calendar.currentMs).toISOString().slice(0, 10), dup: integ.duplicates.length + integ.inBothRosterAndFA.length };
    });
    try { if (cdp) await cdp.send('HeapProfiler.collectGarbage'); } catch (e) {}
    r.heapMB = await p.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null)).catch(() => null);
    r.rssMB = rssMB();
    timeline.push(r); process.stdout.write(`w${w}:${r.date} ${r.rssMB}MB${r.dup ? ' DUP' + r.dup : ''} `);
  }
  console.log('');

  const res = await p.evaluate(({ start, weeks }) => {
    const S = window.CS2Stature; S.reset && S.reset();
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const rank = Object.fromEntries(pro.map((t, i) => [t.name, i + 1]));
    const J = window.CS2Journal, jl = J.list();
    const chain = (f) => jl.filter(f).slice(0, 12).map(e => `${new Date(e.ts).toISOString().slice(0, 10)} ${e.type} ${e.team || ''} ${e.kind || e.action || ''} ${e.player || ''}${e.out ? '←' + e.out : ''} ${e.reason || ''}`.trim());
    const bus = window.__v29Bus || [];
    const retired = new Set(bus.filter(e => e.type === 'retire').map(e => (e.data || {}).player));
    // игрок на временной замене (стенд-ин) по-прежнему принадлежит клубу и вернётся
    const onPro = n => pro.some(t => (t.players || []).some(x => x.nick === n && (!x.status || x.status === 'STARTER')) || (t.tempStandIn && t.tempStandIn.original && t.tempStandIn.original.nick === n));
    const where = n => { const t = teams.find(t => (t.players || []).some(x => x.nick === n)); return t ? t.name + (t.isAcademy ? ' (академия)' : '') : (transferState.freeAgents || []).some(x => x.nick === n) ? 'свободный агент' : 'нигде'; };
    const checks = [];
    const add = (name, ok, info, detail) => checks.push({ name, ok: !!ok, info, detail });
    // 1. звёзды не исчезают со сцены без причины
    try { (window.CS2Careers ? window.CS2Careers.retired() : []).forEach(x => retired.add(x.nick)); } catch (e) {}
    (transferState.v30Moves || []).forEach(m => { if (m && m.type === 'retire') retired.add(m.player); });
    const ACC = window.__lsAcc || { vol: {}, untracked: [], chain: {} };
    const lost = start.elite.filter(x => !onPro(x.nick) && !retired.has(x.nick)).map(x => ({ ...x, now: where(x.nick), chain: chain(e => e.player === x.nick || e.out === x.nick || (e.players || []).includes(x.nick) || JSON.stringify(e.fixes || e.bus || '').includes(x.nick)) }));
    lost.forEach(x => { if (!x.chain.length && ACC.chain[x.nick]) x.chain = ACC.chain[x.nick].slice(); });
    const lostNoReason = lost.filter(x => !x.chain.length);
    add('звёзды и франшизы не исчезают без причины', lostNoReason.length === 0, `${start.elite.length} на старте, не в основе: ${lost.length}, без объяснения в журнале: ${lostNoReason.length}`, lost);
    add('франшизы остаются в профессиональных составах', lost.filter(x => x.tier === 'franchise').length === 0, lost.filter(x => x.tier === 'franchise').map(x => x.nick).join(', ') || 'все на месте', null);
    // 2. случайные команды не попадают в топ-10
    const climbers = pro.slice(0, 10).filter(t => (start.ranks[t.name] || 999) > 40).map(t => ({ team: t.name, from: start.ranks[t.name], to: rank[t.name], vrs: t.vrsBreakdown }));
    const climbAllowed = weeks > 104 ? Math.floor((weeks - 104) / 52) : 0;   // за 2 сезона — ни одной; дальше — не больше одной в сезон сверх двух
    add(`в топ-10 команд со старта ниже 40-го места не больше ${climbAllowed}`, climbers.length <= climbAllowed, climbers.map(x => `${x.team} ${x.from}→${x.to}`).join(', ') || 'нет', climbers);
    // 3. нет бесконечных перестроек
    const vol = Object.assign({}, ACC.vol);
    const maxVol = Object.entries(vol).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
    const volLimit = Math.max(4, Math.ceil(weeks / 4));
    add(`плановых замен у клуба не больше ${volLimit} за ${weeks} недель`, maxVol[1] <= volLimit, `максимум: ${maxVol[0]} — ${maxVol[1]}`, Object.entries(vol).sort((a, b) => b[1] - a[1]).slice(0, 5));
    // 4. экономика
    let bad = 0, debt = 0, total = 0; pro.forEach(t => { let b = NaN; try { b = Number(window.V31.org(t.name).budget); } catch (e) {} if (!Number.isFinite(b)) bad++; else { total += b; if (b < 0) debt++; } });
    add('бюджеты клубов — числа, долгов меньше четверти клубов', bad === 0 && debt < pro.length / 4, `некорректных: ${bad}, в долгах: ${debt}/${pro.length}, сумма ${Math.round(total / 1e6)}M`, null);
    // 5. достижения не теряются
    let awards = 0; try { const A = window.RewardSystem.getAllPlayerAwards(); Object.values(A).forEach(r => { awards += (r.ti || []).length + (r.aw || []).length + (r.mvp || []).length; }); } catch (e) {}
    add('достижения игроков не теряются', awards >= start.awards, `${start.awards} → ${awards}`, null);
    // 6. контракты
    const noContract = []; pro.forEach(t => (t.players || []).forEach(x => { if (!Number.isFinite(+x.contractUntil) || +x.contractUntil < (seasonState.currentSeason || 1)) noContract.push(`${x.nick} (${t.name}): ${x.contractUntil}`); }));
    add('у игроков действующие контракты', noContract.length === 0, noContract.slice(0, 5).join(', ') || 'все действуют', null);
    // 7. турниры продолжают создаваться
    const arch = Object.keys(window.hubArchiveExport ? window.hubArchiveExport() : {}).length;
    const future = (seasonState.parallelSchedule || []).filter(e => e && e.status !== 'completed' && +e.startMs > seasonState.calendar.currentMs).length;
    add('турниры играются и появляются новые', arch > start.archive && future > 0, `архив ${start.archive} → ${arch}, впереди фоновых: ${future}`, null);
    // 8. летопись игроков
    const L = transferState.v88Career || {}; const noLedger = []; pro.forEach(t => (t.players || []).forEach(x => { if (!(L[x.nick] || []).length) noLedger.push(x.nick); }));
    add('у каждого игрока основы есть летопись клубов', noLedger.length === 0, noLedger.slice(0, 5).join(', ') || 'у всех', null);
    // 9. одна организация не скупает лучших
    // скупка: сравниваем с началом — стартовые суперсоставы (как реальная Vitality 2026) не нарушение
    const startStars = {}; start.elite.forEach(x => { startStars[x.team] = (startStars[x.team] || 0) + 1; });
    // считаются звёзды, пришедшие переходом (ROSTER_CHANGE в журнале): свой игрок, доросший до звезды, — не скупка
    const arrived = (team, nick) => jl.some(e => e.type === 'ROSTER_CHANGE' && e.team === team && e.player === nick && ['buy', 'fa', 'user', 'loan', 'loan-buyout'].includes(e.kind));
    const hoardList = pro.map(t => { const st = (t.players || []).filter(x => { const tr = S.tier(x); return tr === 'franchise' || tr === 'star'; });
      return { team: t.name, now: st.length, was: startStars[t.name] || 0, bought: st.filter(x => arrived(t.name, x.nick)).map(x => x.nick) }; })
      .filter(x => x.now > Math.max(4, x.was) && x.bought.length);
    add('ни один клуб не скупает звёзд сверх стартового ядра (или 4)', hoardList.length === 0, hoardList.map(x => `${x.team} ${x.was}→${x.now}`).join(', ') || 'нет', hoardList);
    // 10. целостность и журнал
    const integ = window.CS2Roster.checkAll();
    add('игрок числится в одном месте', !integ.duplicates.length && !integ.inBothRosterAndFA.length, JSON.stringify(integ), null);
    // v92: развитие при смене сезона — уровень сцены не раздувается и не проседает; у игроков есть история развития
    if ((seasonState.currentSeason || 1) > (start.season || 1)) {
      const top = pro.flatMap(t => (t.players || []).filter(x => x && (!x.status || x.status === 'STARTER'))).map(x => window.CS2Develop.pow(x)).sort((a, b) => b - a).slice(0, 100);
      const avgNow = top.reduce((a, b) => a + b, 0) / Math.max(1, top.length);
      const seasons = Math.max(1, (seasonState.currentSeason || 1) - (start.season || 1)), rate = (avgNow - start.top100) / seasons;
      add('уровень топ-100 игроков не убегает (±1.5 за сезон)', Math.abs(rate) <= 1.5, `${start.top100.toFixed(1)} → ${avgNow.toFixed(1)} за ${seasons} сез. (${rate >= 0 ? '+' : ''}${rate.toFixed(2)} за сезон)`, null);
      const st = pro.flatMap(t => (t.players || []).filter(x => x && (!x.status || x.status === 'STARTER')));
      const withDev = st.filter(x => (x.v92dev || []).length).length;
      add('у игроков основы есть годовая история развития', withDev >= st.length * 0.8, `${withDev}/${st.length}`, null);
    }
    // v93: живой мир — завершения карьеры с путём, эпохи у всех организаций, популярность в границах, новые звёзды
    let world = null;
    if (window.CS2Careers && window.CS2Eras && window.CS2Fans) {
      const ret = (transferState.v30Moves || []).filter(m => m && m.type === 'retire' && +m.ts >= start.date);
      const rec = window.CS2Careers.retired(), recSet = new Set(rec.map(x => String(x.nick).toLowerCase()));
      const noPath = ret.filter(m => !recSet.has(String(m.player).toLowerCase())).map(m => m.player);
      add('у каждого завершившего карьеру есть запись и путь после игры', noPath.length === 0, `${ret.length} завершили карьеру, без записи: ${noPath.length}`, noPath.slice(0, 10));
      const eras = {}; pro.forEach(t => { const e = window.CS2Eras.of(t.name); const k = e ? e.key : 'нет'; eras[k] = (eras[k] || 0) + 1; });
      add('у каждой организации есть эпоха', !eras['нет'], JSON.stringify(eras), null);
      const pops = pro.map(t => window.CS2Fans.popularity(t));
      add('популярность клубов в границах 1–100', Math.min(...pops) >= 1 && Math.max(...pops) <= 100, `${Math.min(...pops)}–${Math.max(...pops)}`, null);
      const startElite = new Set(start.elite.map(x => x.nick));
      const newStars = pro.flatMap(t => (t.players || []).filter(x => { const tr = S.tier(x); return (tr === 'star' || tr === 'franchise') && !startElite.has(x.nick); }).map(x => `${x.nick} (${x.age}, ${t.name})`));
      const paths = {}; rec.forEach(x => { paths[x.path] = (paths[x.path] || 0) + 1; });
      world = { newStars: newStars.length, newStarList: newStars.slice(0, 12), retirePaths: paths, legends: rec.filter(x => x.legend).map(x => x.nick), eras };
    }
    // v95: путь к Мейджору — у каждого сыгранного Мейджора есть отборы, их победители сыграли на Мейджоре
    let v95 = null;
    if (window.CS2MajorPath) {
      const inv = jl.filter(e => e.type === 'TOURNAMENT' && e.kind === 'major-invites' && e.ts >= start.date), q = jl.filter(e => e.type === 'TOURNAMENT' && e.kind === 'major-qualified' && e.ts >= start.date);
      const arch = Object.values(window.hubArchiveExport ? window.hubArchiveExport() : {}).filter(x => x && x.prestige === 'major' && x.champion);
      const bad = q.filter(e => { const snap = arch.find(x => x.name === e.team); const played = snap ? new Set((snap.results || []).map(r => r.n)) : null; return (e.qualified || []).length < 6 || (played && !(e.qualified || []).every(n => played.has(n))); });
      const done = inv.filter(e => seasonState.calendar.currentMs - e.ts > 40 * 864e5);
      // первый Мейджор сезона — в июне: при коротком прогоне (20 недель, до конца мая) сыгранных Мейджоров ещё нет — проверять нечего
      add('путь к Мейджору: отборы у каждого Мейджора, победители отборов играют на нём', (done.length === 0 || q.length >= done.length) && !bad.length, (done.length ? '' : 'в окне прогона Мейджор ещё не начался; ') + `приглашения объявлены ${inv.length} раз, отборы завершены ${q.length}, без 6+ победителей или не сыгравших: ${bad.length}`, bad.slice(0, 4).map(e => ({ major: e.team, q: e.qualified, at: e.atLarge, quals: e.quals, date: new Date(e.ts).toISOString().slice(0, 10) })));
      const ps = window.CS2Press ? window.CS2Press.stats() : {}, internal = ['salary', 'burnout', 'rift', 'system'].reduce((a, k) => a + (ps[k] || 0), 0);
      const seasons = Math.max(1, weeks / 52), perClub = internal / pro.length / seasons;
      add('внутренние события живут, но без спама (0.2–6 на клуб за сезон)', perClub >= 0.2 && perClub <= 6, `${internal} событий (${JSON.stringify(ps)}), ${perClub.toFixed(2)} на клуб за сезон`, null);
      // баланс на дистанции: возраст основы, бюджеты, разброс VRS
      const st = pro.flatMap(t => (t.players || []).filter(x => x && (!x.status || x.status === 'STARTER'))), age = st.reduce((a, x) => a + (+x.age || 24), 0) / Math.max(1, st.length);
      add('средний возраст основы не уплывает (±1.5 года)', Math.abs(age - start.age) <= 1.5, `${start.age.toFixed(1)} → ${age.toFixed(1)}`, null);
      const b = pro.map(t => Number(window.V31.org(t.name).budget) || 0).sort((x, y) => x - y), med = b[Math.floor(b.length / 2)], ratio = med / Math.max(1, start.budgetMed);
      add('медианный бюджет клуба без инфляции и обвала (×0.3–×3)', ratio >= 0.3 && ratio <= 3, `$${Math.round(start.budgetMed / 1000)}k → $${Math.round(med / 1000)}k (×${ratio.toFixed(2)})`, null);
      const spread0 = start.ptsTop - start.pts50, spread = pro[0].pts - pro[49].pts;
      add('шкала VRS не сжимается и не разлетается (разрыв №1–№50: ×0.6–×1.6)', spread >= spread0 * 0.6 && spread <= spread0 * 1.6, `${Math.round(spread0)} → ${Math.round(spread)} очков (№1 ${Math.round(pro[0].pts)}, №20 ${Math.round(pro[19].pts)}, №50 ${Math.round(pro[49].pts)})`, null);
      v95 = { press: ps, majorsAnnounced: inv.length, majorsQualified: q.map(e => `${e.team}: ${(e.qualified || []).join(', ')}`) };
    }
    const untracked = ACC.untracked;
    add('нет уходов из основы мимо журнала (UNTRACKED)', untracked.length === 0, `${untracked.length}`, untracked.slice(0, 8).map(e => ({ date: e.date, team: e.team, player: e.player, reason: e.reason, bus: e.bus })));
    const dec = jl.filter(e => e.type === 'MARKET_DECISION');
    add('решения рынка записаны с кандидатами', dec.filter(e => e.chosen && e.chosen.src !== 'coach' && !(e.candidates || []).length).length === 0, `${dec.length} решений, ${jl.filter(e => e.type === 'ROSTER_CHANGE').length} изменений, ${jl.filter(e => e.type === 'REPAIR').length} исправлений`, null);
    const outcomes = dec.filter(e => e.outcome); const avg = outcomes.length ? outcomes.reduce((a, e) => a + (e.outcome.delta || 0), 0) / outcomes.length : null;
    const nets = outcomes.filter(e => e.outcome.net != null), avgNet = nets.length ? nets.reduce((a, e) => a + e.outcome.net, 0) / nets.length : null;
    let learn = null; try { learn = window.CS2MarketLearn ? window.CS2MarketLearn.stats() : null; } catch (e) {}
    // активность рынка (диагностика, не проверка): почему ИИ меняет или не меняет составы
    const states = {}; try { const o = (seasonState.v34Roster || seasonState.v34 || {}).t || {}; Object.values(o).forEach(x => { states[x.state] = (states[x.state] || 0) + 1; }); } catch (e) {}
    if (!Object.keys(states).length) try { pro.forEach(t => { const x = window.V34Roster.st(t.name); states[x.state] = (states[x.state] || 0) + 1; }); } catch (e) {}
    const moves = {}; (transferState.v30Moves || []).filter(m => +m.ts >= start.date).forEach(m => { moves[m.type] = (moves[m.type] || 0) + 1; });
    let prs = []; try { prs = pro.map(t => window.v30MarketDebug.pressure(t)); } catch (e) {}
    const strategies = {}; try { pro.forEach(t => { const k = window.CS2ClubStrategy.of(t).key; strategies[k] = (strategies[k] || 0) + 1; }); } catch (e) {}
    const refusals = {}; J.blocks().filter(b => b.kind === 'refusal').forEach(b => (b.blocks || []).forEach(x => { refusals[x.code] = (refusals[x.code] || 0) + 1; }));
    const market = { rosterAiStates: states, strategies, refusals, movesByType: moves, blocks: J.blocks().length, pressureOver095: prs.filter(x => x >= 0.95).length, marketRuns: transferState.marketRuns || 0 };
    // v91: активность рынка в целевом диапазоне (проверяется на полугодовых прогонах, где есть трансферное окно)
    const changedTeams = new Set(Object.keys(vol)), share = changedTeams.size / pro.length;
    const lo = window.CS2Config ? window.CS2Config.get('market.targetShareMin', .15) : .15, hi = window.CS2Config ? window.CS2Config.get('market.targetShareMax', .45) : .45;
    // цель задана на 30 недель; для длинных прогонов — пересчёт на 30 недель (доля клубов, менявших состав за 30 недель)
    const share30 = 1 - Math.pow(1 - Math.min(share, 0.999), 30 / weeks);
    if (weeks >= 26) add(`рынок жив: доля клубов с плановой заменой ${Math.round(lo * 100)}–${Math.round(hi * 100)}% за 30 недель`, share30 >= lo && share30 <= hi, `${changedTeams.size}/${pro.length} = ${Math.round(share * 100)}% за ${weeks} нед. ≈ ${Math.round(share30 * 100)}% за 30 нед.`, Object.entries(vol).sort((a, b) => b[1] - a[1]).slice(0, 10));
    return { end: new Date(seasonState.calendar.currentMs).toISOString().slice(0, 10), checks, market, world, v95, outcomes: { n: outcomes.length, avgRankDelta: avg == null ? null : Math.round(avg * 10) / 10, avgNet: avgNet == null ? null : Math.round(avgNet * 10) / 10, learn, starterRate: outcomes.length ? Math.round(outcomes.filter(e => e.outcome.starter).length / outcomes.length * 100) : null },
      top10: pro.slice(0, 10).map(t => `${t.name}(${start.ranks[t.name] || '?'}→${rank[t.name]})`) };
  }, { start, weeks });

  const report = { version: 90, weeks, from: new Date(start.date).toISOString().slice(0, 10), to: res.end, timeline, ...res, pageErrors: errs.slice(0, 10) };
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 1));
  console.log(`\nСимуляция ${report.from} → ${report.to} (${weeks} нед.)`);
  res.checks.forEach(c => console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name} — ${c.info}`));
  console.log(`Итоги решений рынка через followup: ${JSON.stringify(res.outcomes)}`);
  console.log(`Активность рынка: ${JSON.stringify(res.market)}`);
  if (res.world) console.log(`Живой мир: ${JSON.stringify(res.world)}`);
  if (res.v95) console.log(`Мейджоры и пресса: ${JSON.stringify(res.v95)}`);
  console.log('Топ-10: ' + res.top10.join(', '));
  console.log('Отчёт: ' + reportFile);
  await ctx.close();
  const failed = res.checks.filter(c => !c.ok).length + (errs.length ? 1 : 0);
  if (errs.length) console.log('FAIL  ошибки страницы: ' + errs.slice(0, 3).join(' | '));
  if (failed) { console.log(`v90 long sim: ${failed} проверок не пройдено`); process.exit(1); }
  console.log('v90 long sim passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
