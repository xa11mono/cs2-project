// Автопилот карьеры менеджера: выбирает клуб, проматывает сезоны штатной перемоткой (v33SkipDays) и ведёт трансферы
// теми же функциями, что и кнопки игры (V99Transfers.start → V98Squad.queue offer/terms/sign). Пишет отчёт JSON.
// Запуск: node tests/career-autoplay.js <стратегия top|mid|niche> <клуб|auto> [сезонов=3] [отчёт.json]
// Стратегии:
//   top   — топ-клуб, состав сохраняется; покупка только если в пятёрке дыра (игрок ушёл/завершил карьеру);
//   mid   — клуб из середины: заявки на Tier-2, в межсезонье — 1–2 усиления из команд ниже/академий;
//   niche — нишевый клуб: те же действия + попытка купить звезду (проверка, что звезда откажет).
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
(async () => {
  const dir = path.resolve(__dirname, '..');
  const strat = process.argv[2] || 'top', want = process.argv[3] || 'auto', seasons = Math.max(1, +process.argv[4] || 3);
  const reportFile = process.argv[5] || path.join(os.tmpdir(), `cs2-career-${strat}-${Date.now()}.json`);
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-career-')), { viewport: { width: 1280, height: 800 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3000);
  try { await p.waitForSelector('#v84-legacy-modal [data-lg="history"]', { timeout: 20000 }); await p.click('#v84-legacy-modal [data-lg="history"]'); await p.waitForTimeout(400); } catch (e) {}
  await p.waitForFunction(() => window.CS2Roster && window.v33SkipDays && window.V99Transfers && window.V98Squad && window.CS2Control && seasonState.v88Seed, null, { timeout: 60000 });
  let cdp = null; try { cdp = await ctx.newCDPSession(p); } catch (e) {}

  // ---------------- выбор клуба и делегирование
  const pick = await p.evaluate(({ strat, want }) => {
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    let name = want;
    if (want === 'auto') name = strat === 'top' ? pro[0].name : strat === 'mid' ? pro[27].name : pro[70].name;
    if (!pro.some(t => t.name === name)) return { err: 'нет клуба ' + name + '; есть: ' + pro.slice(0, 120).map(t => t.name).join(', ') };
    window.CS2Control.take(name);
    window.CS2Control.DIRS.forEach(([k]) => window.CS2Control.setLevel(k, k === 'market' ? 'manual' : 'auto'));
    try { window.V31.careerLog(`Автопилот: старт карьеры (${strat})`); } catch (e) {}
    try { saveSeasonState(); } catch (e) {}
    return { name, rank: pro.findIndex(t => t.name === name) + 1 };
  }, { strat, want });
  if (pick.err) { console.error(pick.err); await ctx.close(); process.exit(2); }
  console.log(`[${strat}] клуб ${pick.name} (#${pick.rank})`);

  // ---------------- общие функции в странице
  await p.evaluate(({ strat }) => {
    const DAY = 864e5;
    const A = window.__auto = { strat, team: window.V31.managed(), deals: [], weeks: [], seasons: [], fired: null, startSeason: seasonState.currentSeason };
    A.pow = x => window.V31.pow(x);
    A.rank = n => { const l = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts); const i = l.findIndex(t => t.name === n); return i < 0 ? 999 : i + 1; };
    A.me = () => teams.find(t => t.name === A.team);
    A.starters = t => (t.players || []).filter(x => x && (!x.status || x.status === 'STARTER'));
    A.snap = () => { const t = A.me(); return t ? A.starters(t).map(x => x.nick).sort() : []; };
    A.roster0 = A.snap();
    A.allPlayers = () => { const out = []; teams.forEach(t => (t.players || []).forEach(x => x && out.push({ p: x, t }))); return out; };
    // кандидаты на усиление: роль слабейшего игрока основы, сила выше, бюджет позволяет
    A.targets = (opts) => {
      const t = A.me(), myR = A.rank(t.name), st = A.starters(t), weakest = st.slice().sort((a, b) => A.pow(a) - A.pow(b))[0];
      if (!weakest) return [];
      const budget = Number(window.V31.org(t.name).budget) || 0;
      return A.allPlayers().filter(({ p, t: o }) => o !== t && (!p.status || p.status === 'STARTER' || o.isAcademy) && A.pow(p) > A.pow(weakest) + (opts.gain || 2)
        && (opts.star || !(['star', 'franchise'].includes(window.CS2Stature ? window.CS2Stature.tier(p) : '')))
        && (o.isAcademy ? true : A.rank(o.name) >= (opts.minRank || 1) && A.rank(o.name) <= (opts.maxRank || 999))
        && (p.role === weakest.role || !['AWPer', 'IGL'].includes(p.role) && !['AWPer', 'IGL'].includes(weakest.role)))
        .map(({ p, t: o }) => ({ nick: p.nick, from: o.name, academy: !!o.isAcademy, pow: Math.round(A.pow(p)), age: +p.age || null, rank: o.isAcademy ? 'acad' : A.rank(o.name),
          tier: window.CS2Stature ? window.CS2Stature.tier(p) : '', price: (() => { try { return Math.round(window.V31.valueOf(p)); } catch (e) { return 0; } })() }))
        .filter(x => opts.star || x.price <= budget * .8)
        // как живой менеджер: только те, с кем агент готов говорить (V99Transfers.rules), и без повторов неудачных
        .filter(x => opts.star || (!(A.failedNicks || {})[x.nick] && (() => { try { return window.V99Transfers.rules(x.nick).ok; } catch (e) { return true; } })()))
        .sort((a, b) => b.pow - a.pow).slice(0, opts.n || 6);
    };
    A.startDeal = (c, why) => {
      const n = window.V99Transfers.start(c.nick);
      const d = { date: new Date(seasonState.calendar.currentMs).toISOString().slice(0, 10), nick: c.nick, from: c.from, pow: c.pow, age: c.age, tier: c.tier, why, id: n && n.id, st: n ? n.st : 'none', log: n ? n.log.slice(-4) : ['переговоры не начались'] };
      A.deals.push(d); if (!n || n.st === 'failed') { A.failedNicks = A.failedNicks || {}; A.failedNicks[c.nick] = 1; }
      if (n && n.st === 'offer') window.V98Squad.queue(n.id, 'offer', [n.ask]);
      return d;
    };
    // продвигаем идущие сделки: предложение принято → условия агенту; условия приняты → регистрация
    A.pump = () => {
      const negs = window.V31Nego.negs();
      A.deals.forEach(d => {
        const n = negs.find(x => x.id === d.id); if (!n) return;
        if (!n.wait && n.st === 'offer' && n.counter && (n.rounds || 0) < 3) window.V98Squad.queue(n.id, 'offer', [n.counter]);
        if (!n.wait && n.st === 'terms') {
          const x = A.allPlayers().find(o => o.p.nick === n.nick) || { p: (transferState.freeAgents || []).find(q => q.nick === n.nick) };
          if (x && x.p) { const want = window.V31Nego.demand(x.p), age = +x.p.age || 24, yrs = age <= 23 ? 3 : age >= 29 ? 1 : 2; window.V98Squad.queue(n.id, 'terms', [Math.round(want * 1.06 / 1000) * 1000, yrs]); }
        }
        if (!n.wait && n.st === 'ready') window.V98Squad.queue(n.id, 'sign', []);
        d.st = n.st; d.log = n.log.slice(-5);
      });
    };
    // решения менеджера: события клуба и разговоры с игроками — варианты, сохраняющие состав; всё пишется в отчёт
    A.decisions = [];
    const PREF = ['trust', 'keep', 'talk', 'mediate', 'psych', 'promise', 'raise', 'stay', 'wait', 'none', 'ignore', 'switch', 'anti', 'media', 'cut'];
    A.decide = () => {
      const c = window.V31.S(), mine = (c.events || []).filter(e => e.team === A.team && e.status === 'open');
      mine.forEach(ev => {
        const keys = (ev.options || []).map(o => o.k), k = PREF.find(x => keys.includes(x)) || keys[0];
        const r = window.V31.resolve(ev.id, k);
        A.decisions.push({ date: new Date(seasonState.calendar.currentMs).toISOString().slice(0, 10), type: ev.type, title: ev.title, choice: ((ev.options || []).find(o => o.k === k) || {}).l, result: ev.result || (r && r.why) || '' });
      });
      try {
        const T = window.V99Talks; (T.pending() || []).forEach(id => { const conv = (T.S().convs || []).find(x => x.id === id); const r = T.answer(id, 0);
          A.decisions.push({ date: new Date(seasonState.calendar.currentMs).toISOString().slice(0, 10), type: 'talk:' + (conv ? conv.key : ''), title: conv ? conv.nick : id, choice: 'вариант 1', result: r && r.ok === false ? (r.why || 'нет') : '' }); });
      } catch (e) {}
      try { if (window.v15IsCalendarPaused && window.v15IsCalendarPaused()) window.toggleGameCalendarPause(); } catch (e) {}
      const g = document.getElementById('v96-gate'); if (g) g.style.display = 'none';
    };
    // окно «Требует решения» само открывается при свежем событии и ставит паузу — автопилот решает события сам
    try { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); } catch (e) {}
    // заявки на ближайшие Tier-2/3 турниры (клубы середины и ниши)
    A.applyEvents = () => {
      if (A.strat === 'top') return [];
      const out = [];
      (window.V99Events.upcoming() || []).slice(0, 4).forEach(ev => { if (ev.tier === '3' && A.rank(A.team) < 40) return; const r = window.V99Events.apply(ev.id); if (r.ok) out.push(ev.name); });
      return out;
    };
  }, { strat });

  // ---------------- цикл по неделям
  const startSeason = await p.evaluate(() => seasonState.currentSeason);
  const rssMB = () => { try { const out = require('child_process').execSync('ps -C chrome-headless-shell,chrome-headless,chrome,chromium -o rss= 2>/dev/null || true').toString(); return Math.round(out.split(/\s+/).filter(Boolean).reduce((a, b) => a + (+b || 0), 0) / 1024); } catch (e) { return 0; } };
  let week = 0; const t0 = Date.now();
  while (true) {
    week++;
    const r = await p.evaluate(async () => {
      const A = window.__auto, DAY = 864e5, s0 = seasonState.currentSeason;
      const target = seasonState.calendar.currentMs + 7 * DAY;
      for (let k = 0; k < 14 && seasonState.calendar.currentMs < target - 3600e3; k++) {
        const left = Math.max(1, Math.round((target - seasonState.calendar.currentMs) / DAY));
        try { A.decide(); } catch (e) {}
        try { await window.v33SkipDays(left); } catch (e) {}
        document.querySelectorAll('#v84-legacy-modal').forEach(x => x.remove());
        try { window.V98Squad.settle(); A.pump(); } catch (e) {}
      }
      const date = new Date(seasonState.calendar.currentMs), mon = date.getUTCMonth(), day = date.getUTCDate();
      const managed = window.V31.managed();
      if (!managed && !A.fired) { const k = (window.CS2Board.state() || {})[A.team] || {}; A.fired = { date: date.toISOString().slice(0, 10), why: k.why || k.reason || 'см. журнал CONTROL', board: k }; }
      if (!managed) return { date: date.toISOString().slice(0, 10), fired: true, season: seasonState.currentSeason };
      const t = A.me(), acts = [];
      // ---- состав: дыра в пятёрке → срочная покупка
      const st = A.starters(t);
      const outNow = (t.players || []).filter(x => x && (x.isStandIn || x.v99out || x.status === 'OUT')).length + (t.tempStandIn ? 1 : 0);
      if (st.length < 5 && !outNow && !(window.V99Talks && window.V99Talks.isOut && st.length === 4)) { const c = A.targets({ gain: -50, n: 3, maxRank: 999 })[0]; if (c) acts.push(A.startDeal(c, 'дыра в пятёрке')); }
      // ---- окно: межсезонье (декабрь–январь) и середина сезона (июль)
      const window1 = (mon === 11 && day >= 10) || (mon === 0 && day <= 20), window2 = mon === 6 && day <= 10;
      const open = A.deals.filter(d => !['signed', 'failed', 'none'].includes(d.st)).length;
      const doneThisWin = A.deals.filter(d => d.st === 'signed' && Math.abs(new Date(d.date) - date) < 45 * DAY).length;
      if ((window1 || window2) && !open) {
        if (A.strat === 'mid' && doneThisWin < 2) {
          const c = A.targets({ gain: 3, minRank: A.rank(A.team) + 1, n: 5 }); if (c[0]) acts.push(A.startDeal(c[0], 'усиление (из команд ниже/академий)'));
        }
        if (A.strat === 'niche' && doneThisWin < 2) {
          if (!A.triedStar) { A.triedStar = 1; const s = A.targets({ gain: 10, star: true, minRank: 1, maxRank: 15, n: 3 }).filter(x => ['star', 'franchise'].includes(x.tier))[0]; if (s) acts.push(A.startDeal(s, 'попытка купить звезду')); }
          const c = A.targets({ gain: 3, minRank: 20, n: 5 })[0]; if (c) acts.push(A.startDeal(c, 'усиление'));
        }
      }
      const evs = mon % 2 === 0 && day <= 7 ? A.applyEvents() : [];
      const w = { date: date.toISOString().slice(0, 10), season: seasonState.currentSeason, rank: A.rank(A.team), roster: A.snap().join(','), budget: Math.round(Number(window.V31.org(A.team).budget) || 0), acts: acts.map(a => a.nick + ':' + a.st), applied: evs };
      A.weeks.push(w);
      return w;
    });
    if (week % 4 === 0 || r.fired) console.log(`[${strat}] ${r.date} сезон ${r.season} ранг #${r.rank} бюджет $${r.budget} ${r.fired ? 'УВОЛЕН' : ''} (${Math.round((Date.now() - t0) / 1000)} с, RSS ${rssMB()} МБ)`);
    try { if (cdp) await cdp.send('HeapProfiler.collectGarbage'); } catch (e) {}
    if (r.fired || r.season >= startSeason + seasons || week > 60 * seasons) break;
  }

  // ---------------- отчёт
  const rep = await p.evaluate(() => {
    const A = window.__auto, me = A.team, arch = Object.values(window.HS.archive() || {}).filter(Boolean);
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), rank = n => pro.findIndex(t => t.name === n) + 1;
    const mine = arch.filter(s => s.season >= A.startSeason && ((s.participants || []).some(x => (x.name || x) === me) || (s.results || []).some(r => r.n === me)));
    const place = s => { const r = (s.results || []).find(x => x.n === me); return r ? r.p : null; };
    const bySeason = {};
    mine.forEach(s => { const k = s.season, b = bySeason[k] = bySeason[k] || { events: 0, titles: [], majors: [], tier1: 0, finals: 0 }; b.events++;
      if (/^T1/.test(s.id || '') || s.prestige === 'major' || s.prestige === 'elite' || s.prestige === 'regular') b.tier1++;
      if (s.champion === me) b.titles.push(`${s.name} (${s.prestige || s.kind || ''})`);
      if (place(s) === 2) b.finals++;
      if (s.prestige === 'major') b.majors.push(`${s.name}: место ${place(s) || '—'}`); });
    // мир: скамейки, кого подписывает топ, академии
    const top30 = pro.slice(0, 30), FA = transferState.freeAgents || [], bench = top30.map(t => (t.players || []).filter(x => x && x.status === 'BENCH').length + FA.filter(x => x && x.status === 'BENCH' && (x.reservedFor === t.name || x.benchFrom === t.name)).length);
    const J = (window.CS2Journal && window.CS2Journal.list()) || [];
    const sign = J.filter(e => e.type === 'ROSTER_CHANGE' && /^ai/.test(e.actor || '') && rank(e.team) > 0 && rank(e.team) <= 20);
    const kinds = {}; sign.forEach(e => { kinds[e.kind] = (kinds[e.kind] || 0) + 1; });
    const acad = teams.filter(t => t.isAcademy), avg = l => l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length * 10) / 10 : 0;
    const st = t => (t.players || []).filter(x => x && (!x.status || x.status === 'STARTER'));
    const world = { benchTop30Avg: avg(bench), benchTop30Zero: bench.filter(x => !x).length, top20SigningKinds: kinds,
      acadPow: avg(acad.flatMap(t => st(t).map(A.pow))), top20Pow: avg(pro.slice(0, 20).flatMap(t => st(t).map(A.pow))), rank50Pow: avg(pro.slice(40, 60).flatMap(t => st(t).map(A.pow))),
      bestAcad: acad.flatMap(t => st(t).map(x => ({ nick: x.nick, team: t.name, pow: Math.round(A.pow(x)), age: x.age }))).sort((a, b) => b.pow - a.pow).slice(0, 5) };
    const t = A.me();
    return { team: me, strat: A.strat, fired: A.fired, finalRank: rank(me), roster0: A.roster0, roster1: t ? st(t).map(x => x.nick).sort() : [], bench: t ? (t.players || []).filter(x => x && x.status === 'BENCH').map(x => x.nick) : [],
      bySeason, deals: A.deals, decisions: A.decisions, weeks: A.weeks, journal: J.filter(e => e.team === me || e.from === me || (e.players || []).some(x => (A.roster0 || []).includes(x))).slice(-80).map(e => ({ d: new Date(e.ts).toISOString().slice(0, 10), type: e.type, team: e.team, from: e.from, kind: e.kind, actor: e.actor, player: e.player, out: e.out, reason: e.reason })), world, careerLog: (window.V31.S().career.log || []).slice(-40) };
  });
  rep.errors = errs.slice(0, 20); rep.minutes = Math.round((Date.now() - t0) / 600) / 100;
  fs.writeFileSync(reportFile, JSON.stringify(rep, null, 1));
  console.log(`[${strat}] готово: ${reportFile}`);
  await ctx.close();
})().catch(e => { console.error(e); process.exit(1); });
