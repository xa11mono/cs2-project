/* v41 — глубина карьеры:
   1) HLTV World Ranking — отдельный рейтинг (результаты за 12 месяцев, затухание, правило «3 из 5 игроков»);
   2) тренировки: индивидуальные планы игроков + новые командные фокусы (IGL, анти-страты, подготовка к турниру, восстановление);
   3) финансы события: поездки и спонсорские выплаты за участие;
   4) сюжетные цепочки с последствиями (рождение звезды, эра, рискованный трансфер, распад, аутсайдер, финансовый кризис).
   Все даты — по игровому календарю. Состояние хранится в seasonState.v41. */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DAY = 864e5;
  const TS = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const V = () => window.V31;
  const now = () => { try { return Number(seasonState.calendar?.currentMs) || Date.now(); } catch (e) { return Date.now(); } };
  const season = () => (typeof seasonState !== 'undefined' && seasonState.currentSeason) || 1;
  const byName = n => TS().find(t => t && t.name === n) || null;
  const starters = t => (t.players || []).filter(p => p && p.nick && !['BENCH', 'RESERVE'].includes(String(p.status || '').toUpperCase())).slice(0, 5);
  const nicks = t => starters(t).map(p => p.nick);
  const save = () => { try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {} };
  function S() {
    seasonState.v41 = seasonState.v41 || {};
    const s = seasonState.v41;
    s.ledger = s.ledger || {}; s.base = s.base || {}; s.snap = s.snap || { wk: -1, ranks: {}, prev: {} };
    s.story = s.story || {}; s.roster = s.roster || {}; s.winners = s.winners || []; s.evCount = s.evCount || 0;
    return s;
  }

  /* =============== 1. HLTV World Ranking =============== */
  const placeShare = p => (p === 1 ? 1 : p === 2 ? 0.65 : p === 3 ? 0.45 : p === 4 ? 0.38 : p <= 8 ? 0.25 : p <= 16 ? 0.12 : 0.05);
  // v89: стартовая база HLTV — по порядку рейтинга HLTV из базы составов 2026, а не по текущим очкам VRS: два рейтинга
  // должны быть независимыми. Команды вне списка HLTV идут после него (между собой — по VRS на момент появления).
  function hltvSeed(t) {
    const order = Object.keys((window.CS2_ROSTERS_2026 && window.CS2_ROSTERS_2026.teams) || {}).map(n => String(n).toLowerCase());
    const seed = window.CS2SeedPts; if (!order.length || typeof seed !== 'function') return null;
    const i = order.indexOf(String(t.name).toLowerCase()); if (i >= 0) return seed(i + 1);
    return Math.min(Number(t.pts) || 0, seed(order.length + 1));
  }
  function ensureBase(t) {
    const s = S();
    if (!s.base[t.name]) { const sd = hltvSeed(t); s.base[t.name] = { pts: sd != null ? sd : (Number(t.pts) || 0), t0: Number(s.t0) || now(), core: nicks(t), v89: sd != null ? 1 : 0 }; }
    return s.base[t.name];
  }
  // старые сохранения: база, взятая из VRS, заменяется независимой (время растворения не меняется)
  function migrateBase() {
    const s = S(); if (s.v89base) return; s.t0 = s.t0 || now();
    if (typeof window.CS2SeedPts !== 'function' || !window.CS2_ROSTERS_2026) return;
    Object.keys(s.base).forEach(n => { const b = s.base[n], t = byName(n); if (!b || b.v89 || !t) return; const sd = hltvSeed(t); if (sd != null) { b.pts = sd; b.v89 = 1; } });
    s.v89base = 1;
  }
  function hltvPoints(t) {
    const s = S(), cur = nicks(t); let sum = 0;
    (s.ledger[t.name] || []).forEach(e => {
      const age = (now() - e.t) / DAY; if (age > 365 || age < 0) return;
      const f = age <= 90 ? 1 : 1 - 0.85 * (age - 90) / 275;                  // свежие результаты весят больше
      if (e.core.filter(n => cur.includes(n)).length < 3) return;             // правило HLTV: нужны 3 игрока из состава события
      sum += 110 * Math.pow(e.pool / 1e6, 0.6) * placeShare(e.place) * f;
    });
    const b = ensureBase(t), age = (now() - b.t0) / DAY;                       // стартовая база растворяется за год
    if (age >= 0 && age < 365 && b.core.filter(n => cur.includes(n)).length >= 3) sum += b.pts * (1 - age / 365);
    return Math.round(sum);
  }
  function hltvRanking() {
    const s = S();
    const rows = TS().filter(t => t && t.name && !t.isAcademy).map(t => ({ name: t.name, pts: hltvPoints(t) }))
      .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
    const ranks = {}; rows.forEach((r, i) => { r.rank = i + 1; ranks[r.name] = r.rank; });
    const wk = Math.floor(now() / (7 * DAY));                                  // официальный снимок — раз в игровую неделю
    if (wk !== s.snap.wk) { s.snap.prev = s.snap.ranks || {}; s.snap.ranks = ranks; s.snap.wk = wk; }
    rows.forEach(r => { const p = s.snap.prev[r.name]; r.delta = p ? p - r.rank : 0; const t = byName(r.name); if (t) { t.hltvPts = r.pts; t.hltvRank = r.rank; } });
    return rows;
  }
  function recordResults(ct) {
    const s = S(); if (!ct || !ct.placements) return;
    Object.entries(ct.placements).forEach(([name, pl]) => {
      const t = byName(name); if (!t || !pl || !Number.isFinite(pl.place)) return;
      (s.ledger[name] = s.ledger[name] || []).unshift({ t: now(), ev: ct.name, pool: Number(ct.prizePool) || 250000, place: pl.place, n: ct.size || 16, major: !!ct.isMajor, core: nicks(t) });
      trimLedger(s, name);
    });
  }
  // v89: история — по давности (12 месяцев), а не «последние 40»: фоновые турниры не вытесняют результаты Tier-1
  function trimLedger(s, name) {
    const a = s.ledger[name]; if (!a) return; const cut = now() - 366 * DAY;
    s.ledger[name] = a.filter(e => e && e.t >= cut).slice(0, 150);
  }
  // v89: фоновые турниры Tier-2/3, академии и квалификации тоже попадают в HLTV World Ranking (раньше — только основной
  // календарь через afterTournament). Вес — по призовому фонду события, как у остальных турниров.
  function recordParallel(ev, order) {
    if (!ev || ev.v41done || !Array.isArray(order) || !order.length) return;
    ev.v41done = true;
    const s = S(), qual = !!ev.qual || /qualifier|квалиф|отбор/i.test(String(ev.name || ''));
    const pool = Number(ev.prize || ev.prizePool) || (qual ? 5000 : 15000);
    order.forEach((name, i) => {
      const t = byName(name); if (!t || t.isAcademy) return;
      (s.ledger[name] = s.ledger[name] || []).unshift({ t: Number(ev.completedAt) || now(), ev: ev.name, pool, place: i + 1, n: order.length, major: false, bg: ev.tier || ev.kind || 'bg', core: nicks(t) });
      trimLedger(s, name);
    });
  }
  function hltvBox() {
    const H = window.HS, rows = hltvRanking();
    return `<div class="hs-head"><h1>HLTV World Ranking</h1><div class="hs-filters"><span class="hs-sub">Результаты за 12 месяцев · свежие весят больше · очки сохраняются, если в составе остаются 3 игрока из состава события · обновляется раз в неделю · всего команд: ${rows.length}</span></div></div>
      <div class="hs-ranklist">${rows.map(r => { const t = byName(r.name);
        const mv = r.delta > 0 ? `<small style="color:#4ade80">▲${r.delta}</small>` : r.delta < 0 ? `<small style="color:#f87171">▼${-r.delta}</small>` : '<small>—</small>';
        return `<div class="hs-rankrow${r.rank <= 3 ? ' top' + r.rank : ''}" data-team="${H.esc(r.name)}"><span class="hs-rnum">#${r.rank}</span>${H.logo(r.name, 'lg')}
          <div class="hs-rmain"><b>${H.esc(r.name)}</b><span class="hs-roster">${(t ? starters(t) : []).map(p => `<button type="button" class="hs-plink" data-player="${H.esc(p.nick)}">${H.pFlag ? H.pFlag(p) : ''} ${H.esc(p.nick)}</button>`).join('')}</span></div>
          <div class="hs-rpts"><b>${r.pts}</b> ${mv}<small>HLTV points</small></div></div>`; }).join('')}</div>`;
  }

  // Рейтинг открывается на HLTV. VRS сохраняется отдельной вкладкой и использует
  // прежнюю страницу рейтинга без изменения расчётов, фильтров и истории.
  let rankingBase = null;
  let rankingWasVisible = false;
  function rankingPage() {
    const H = window.HS;
    if (!rankingWasVisible) {
      H.S.rk.source = 'hltv';
      rankingWasVisible = true;
    }
    const source = H.S.rk.source === 'vrs' ? 'vrs' : 'hltv';
    const tabs = `<div class="v41-rank-tabs" role="tablist" aria-label="Тип рейтинга">
      <button type="button" class="v41-rank-tab${source === 'hltv' ? ' active' : ''}" data-v41-rank-mode="hltv" role="tab" aria-selected="${source === 'hltv'}"><span class="v41-rank-tab-mark">▰</span> HLTV World Ranking</button>
      <button type="button" class="v41-rank-tab${source === 'vrs' ? ' active' : ''}" data-v41-rank-mode="vrs" role="tab" aria-selected="${source === 'vrs'}"><span class="v41-rank-tab-mark">↗</span> VRS / Valve Ranking</button>
    </div>`;
    const content = source === 'vrs' ? rankingBase.apply(this, arguments) : hltvBox();
    return `<div class="v41-ranking-page">${tabs}<div class="v41-ranking-content">${content}</div></div>`;
  }

  /* =============== 2. Тренировки =============== */
  const ROLE_FOCUS = { AWPer: 'firepower', AWP: 'firepower', IGL: 'tacticalIQ', Support: 'utility', Lurker: 'clutch', Entry: 'firepower', 'Entry-fragger': 'firepower', Rifler: 'firepower' };
  const PLAN_L = { auto: 'По роли (авто)', firepower: 'Огневая мощь', tacticalIQ: 'Тактика', clutch: 'Клатч', utility: 'Утилити', balanced: 'Сбалансированно', rest: 'Отдых' };
  function defaultPlan(p) {
    if (ROLE_FOCUS[p.role]) return { focus: ROLE_FOCUS[p.role] };
    const a = ['firepower', 'tacticalIQ', 'clutch', 'utility'].sort((x, y) => (+p[x] || 0) - (+p[y] || 0));
    return { focus: a[0] };
  }
  function individualTraining(t, p, ctx) {
    const o = V().org(t.name), team = o.train && o.train.focus;
    if (team === 'recovery') { p.fatigue = clamp((+p.fatigue || 0) - 14, 0, 85); p.conf = clamp((+p.conf || 60) + 1.5, 5, 98); }
    const plan = (p.v41plan && p.v41plan.focus && p.v41plan.focus !== 'auto') ? p.v41plan : defaultPlan(p);
    if (plan.focus === 'rest') { p.fatigue = clamp((+p.fatigue || 0) - 6, 0, 85); return; }
    const g = ctx.gains; if (g.sum >= 3) return;
    const k = 0.11 * ctx.I.k * ctx.fac * ctx.ageK * ctx.profK * 0.6 * (window.CS2Develop ? window.CS2Develop.trainK(p) : 1);   // личная работа слабее командной, но точечная; v92: по фазе карьеры
    const room = clamp(((+p.pot || 90) - V().pow(p)) / 30, 0, 1);   // v92: на потенциале личные тренировки не дают роста
    const attrs = plan.focus === 'balanced' ? { firepower: .25, tacticalIQ: .25, clutch: .25, utility: .25 } : { [plan.focus]: 1 };
    Object.entries(attrs).forEach(([a, w]) => {
      if (g.sum >= 3) return;
      const add = Math.min(k * w * room, 3 - g.sum);
      p[a] = clamp(Math.round(((+p[a] || 70) + add) * 100) / 100, 50, 99); g.sum += add;
    });
    if (plan.focus !== 'balanced') p.fatigue = clamp((+p.fatigue || 0) + 1.5, 0, 85); // персональная нагрузка
  }
  function installTraining() {
    const T = V() && V().TRAIN; if (!T || T.igl) return;
    T.igl = { l: 'Работа с IGL', attrs: { tacticalIQ: .4 }, chem: 10, hint: 'тактика и сыгранность вокруг капитана' };
    T.antistrat = { l: 'Анти-страты соперника', map: 1.0, attrs: { tacticalIQ: .3 }, hint: 'карта и тактика под ближайшего соперника' };
    T.eventprep = { l: 'Подготовка к турниру', attrs: { clutch: .3 }, conf: 4, chem: 5, hint: 'уверенность и сыгранность перед важным событием' };
    T.recovery = { l: 'Восстановление', conf: 2, hint: 'снимает усталость всей команды' };
  }
  function trainingBox() {
    const H = window.HS, v = V(); if (!v) return '';
    const me = v.S().career && v.S().career.team, t = byName(me); if (!t) return '';
    const opts = k => Object.entries(PLAN_L).map(([x, l]) => `<option value="${x}"${((t.players.find(p => p.nick === k)?.v41plan?.focus) || 'auto') === x ? ' selected' : ''}>${l}</option>`).join('');
    const rows = (t.players || []).map(p => { const g = p.v31tg && p.v31tg.s === season() ? p.v31tg.sum : 0;
      return `<tr><td class="l"><b>${H.esc(p.nick)}</b><small>${H.esc(p.role || '')}</small></td><td>${Math.round(+p.firepower)}</td><td>${Math.round(+p.tacticalIQ)}</td><td>${Math.round(+p.clutch)}</td><td>${Math.round(+p.utility)}</td><td>+${g.toFixed(2)}</td><td class="l"><select class="hs-inp sm" data-v41p="${H.esc(p.nick)}">${opts(p.nick)}</select></td></tr>`; }).join('');
    return `<section class="hs-box"><header class="hs-box-h"><h3>Индивидуальные планы</h3></header><div class="hs-box-b">
      <table class="hs-tbl hs-stbl"><thead><tr><th class="l">Игрок</th><th>Огонь</th><th>Тактика</th><th>Клатч</th><th>Утилити</th><th>За сезон</th><th class="l">Личный фокус</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="hs-note">Командный фокус задаёт общий план недели, а личный — над чем работает каждый игрок отдельно. Личная работа слабее командной, добавляет нагрузку, а общий потолок прироста за сезон (+3) сохраняется. «Отдых» снимает усталость. Командный фокус «Восстановление» снижает усталость всем.</p></div></section>`;
  }

  /* =============== 3. Финансы события: поездки и спонсоры =============== */
  const EVENT_REGION = [[/Singapore|Astana|Chengdu|Shanghai|Macau|Asia|Riyadh|Dubai|Abu Dhabi|Tokyo|Seoul|Mongol|Bangkok/i, 'AS'], [/Dallas|Austin|Buenos Aires|Rio\b|S[aã]o Paulo|Montreal|Toronto|Los Angeles|Atlanta|Americas|Arlington/i, 'AM']];
  const eventRegion = name => { for (const [re, r] of EVENT_REGION) if (re.test(String(name || ''))) return r; return 'EU'; };
  const FIN = { major: { travel: .3, fee: .02 }, elite: { travel: .3, fee: .01 }, regular: { travel: .6, fee: .006 }, tier2: { travel: .7, fee: .003 }, tier3: { travel: 1, fee: .0015 }, academy: { travel: 1, fee: .001 } };
  function eventFinance(snap, api) {
    const cfg = FIN[snap.prestige]; if (!cfg || !snap.results) return;
    const evReg = eventRegion(snap.name), online = snap.prestige === 'tier3' || /online|open qualifier/i.test(String(snap.name || ''));
    const size = snap.size || (snap.results || []).length || 16;
    snap.results.forEach(r => {
      const t = byName(r.n); if (!t) return; const o = api.org(r.n);
      const same = window.CS2Realism ? window.CS2Realism.regionOfTeam(t) === evReg : true;
      const lux = (snap.prestige === 'major' || snap.prestige === 'elite') ? 1.3 : snap.prestige === 'regular' ? 1 : .5;
      let cost = (same ? 4000 : 11000) * 8 * lux * cfg.travel;                  // 5 игроков + тренер, аналитик, менеджер; организатор покрывает часть на топ-событиях
      if (online) cost *= .05; cost = Math.round(cost / 100) * 100;
      if (cost) api.book(r.n, -cost, 'travel', `Поездка: ${snap.name}${same ? '' : ' (межконтинентальный перелёт)'}`);
      if (o.sponsor && !t.isAcademy) {
        let fee = o.sponsor.perSeason * cfg.fee; if (r.p <= 4) fee *= 1.5; if (r.p === 1) fee *= 2; fee = Math.round(fee / 1000) * 1000;
        if (fee) api.book(r.n, fee, 'spon', `Спонсор за участие: ${snap.name}`);
        if ((snap.prestige === 'major' || snap.prestige === 'elite') && r.p > size * 0.75) o.sponsor.strikes = (o.sponsor.strikes || 0) + 1; // слабое выступление пугает спонсора
      }
    });
  }

  /* =============== 4. Сюжетные цепочки =============== */
  const N = () => window.V29News;
  function news(o) {
    try { const n = N(); if (!n || !n.add) return; n.add(Object.assign({ icon: '📰', imp: 5, body: [], tags: [] }, o)); } catch (e) { console.warn('[v41] news', e); }
  }
  const tag = (kind, v) => { try { const n = N(); return kind === 't' ? n.T(v) : n.P(v); } catch (e) { return null; } };
  const tags = (...a) => a.filter(Boolean);
  const allPlayers = () => { const out = []; TS().forEach(t => (t.players || []).forEach(p => out.push({ p, team: t.name }))); try { (transferState.freeAgents || []).forEach(p => out.push({ p, team: null })); } catch (e) {} return out; };
  const findPlayer = nick => allPlayers().find(x => x.p.nick === nick);
  const lastPlaces = (name, n) => (S().ledger[name] || []).slice(0, n).map(e => e.place);
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

  function afterTournament(ct) {
    const s = S(), v = V(); if (!ct || ct.v41done) return; ct.v41done = true;
    const pls = ct.placements || {}, top1 = ct.isMajor || ct.isElite;
    // --- результаты в рейтинг HLTV
    const prior = {}; Object.keys(pls).forEach(n => { prior[n] = lastPlaces(n, 3); });
    recordResults(ct); hltvRanking();
    const win = Object.entries(pls).find(([, p]) => p.place === 1); const winner = win && win[0];
    if (top1) { s.evCount++; if (winner) { s.winners.unshift({ ev: s.evCount, name: winner, major: !!ct.isMajor }); s.winners.length = Math.min(s.winners.length, 6); } }
    if (!v) return;
    // --- смена составов
    const changed = {};
    TS().filter(t => !t.isAcademy).forEach(t => {
      const cur = nicks(t), prev = s.roster[t.name];
      if (prev) { const added = cur.filter(n => !prev.includes(n)), removed = prev.filter(n => !cur.includes(n)); if (added.length || removed.length) changed[t.name] = { added, removed }; }
      s.roster[t.name] = cur;
    });
    // --- рискованный трансфер: молодой вместо ветерана
    Object.entries(changed).forEach(([team, c]) => {
      c.added.forEach(a => {
        const pa = findPlayer(a); if (!pa || !(+pa.p.age <= 21)) return;
        const vet = c.removed.map(findPlayer).find(x => x && +x.p.age >= 28); if (!vet) return;
        const key = `risk:${team}:${a}`; if (s.story[key]) return;
        s.story[key] = { stage: 1, team, nick: a, vet: vet.p.nick, before: avg(prior[team] && prior[team].length ? prior[team] : lastPlaces(team, 3)), places: [] };
        news({ cat: 'roster', icon: '🎲', title: `${team} ставит на ${a}: ${vet.p.nick} уступает место юному таланту`, lead: `Клуб рискует: вместо ветерана в основу выходит ${a}.`, body: ['Болельщики разделились. Первые три турнира покажут, оправдан ли риск.'], tags: tags(tag('t', team), tag('p', a), tag('p', vet.p.nick)), imp: 5, team, player: a });
      });
    });
    Object.values(s.story).forEach(c => {
      if (c.stage !== 1 || !String(c.nick) || !c.vet || pls[c.team] == null || !top1) return;
      if (!nicks(byName(c.team) || { players: [] }).includes(c.nick)) { c.stage = 9; return; }
      c.places.push(pls[c.team].place);
      if (c.places.length >= 3) {
        const after = avg(c.places), pa = findPlayer(c.nick), o = v.org(c.team); c.stage = 2;
        if (c.before != null && after <= c.before - 1.5) {
          news({ cat: 'roster', icon: '✅', title: `Риск оправдался: ${c.nick} усилил ${c.team}`, lead: `Средний результат команды вырос с ${c.before.toFixed(1)} до ${after.toFixed(1)} места.`, body: [`Решение сменить ${c.vet} на молодого игрока признано удачным.`], tags: tags(tag('t', c.team), tag('p', c.nick)), imp: 6, team: c.team, player: c.nick });
          if (pa) pa.p.conf = clamp((+pa.p.conf || 60) + 5, 5, 98); o.rep = clamp(o.rep + 2, 0, 100);
        } else {
          news({ cat: 'roster', icon: '⚠', title: `${c.team}: замена ${c.vet} на ${c.nick} пока не работает`, lead: 'Результаты не улучшились, болельщики и спонсоры недовольны.', body: ['Игроку нужно время, но терпение клуба не бесконечно.'], tags: tags(tag('t', c.team), tag('p', c.nick)), imp: 5, team: c.team, player: c.nick });
          if (pa) pa.p.conf = clamp((+pa.p.conf || 60) - 5, 5, 98); o.rep = clamp(o.rep - 2, 0, 100); if (o.sponsor) o.sponsor.strikes = (o.sponsor.strikes || 0) + 1;
        }
      }
    });
    if (top1) {
      // --- рождение звезды
      let starsNow = 0; const seasonStars = Object.values(s.story).filter(c => c.stage >= 1 && c.starSeason === season()).length;
      TS().filter(t => !t.isAcademy).forEach(t => {
        const pl = pls[t.name]; if (!pl) return;
        const best = starters(t).slice().sort((a, b) => v.pow(b) - v.pow(a)).slice(0, 2).map(p => p.nick); // звезда — один из двух сильнейших в команде
        starters(t).forEach(p => {
          const key = `star:${p.nick}`, c = s.story[key];
          if (!c && starsNow < 1 && seasonStars + starsNow < 3 && pl.place <= (ct.isMajor ? 4 : 2) && +p.age <= 21 && v.pow(p) >= 84 && best.includes(p.nick)) {
            starsNow++;
            s.story[key] = { stage: 1, team: t.name, nick: p.nick, ev: s.evCount, starSeason: season() };
            news({ cat: 'roster', icon: '🌟', title: `Рождение звезды: ${p.nick} (${p.age}) ведёт ${t.name} к топ-4`, lead: 'Молодой игрок стал открытием турнира.', body: ['Клубы уже наводят справки о его контракте.'], tags: tags(tag('t', t.name), tag('p', p.nick)), imp: 6, team: t.name, player: p.nick });
            p.conf = clamp((+p.conf || 60) + 6, 5, 98); v.org(t.name).rep = clamp(v.org(t.name).rep + 2, 0, 100);
          } else if (c && c.stage === 1 && s.evCount - c.ev >= 3 && c.team === t.name) {
            c.stage = 2;
            news({ cat: 'roster', icon: '🔭', title: `За ${p.nick} охотятся топ-клубы`, lead: `Сезон подтвердил: ${p.nick} — не случайный талант.`, body: ['Цена игрока на рынке выросла.'], tags: tags(tag('t', t.name), tag('p', p.nick)), imp: 6, team: t.name, player: p.nick });
            p.v41hype = true; p.conf = clamp((+p.conf || 60) + 3, 5, 98);
          }
        });
      });
      // --- эра команды
      const recent = s.winners.slice(0, 3);
      if (winner) {
        const cnt = recent.filter(w => w.name === winner).length, key = `era:${winner}`, c = s.story[key];
        if (cnt >= 2 && (!c || c.stage !== 1)) {
          s.story[key] = { stage: 1, team: winner, titles: cnt, out: 0, core: nicks(byName(winner)) };
          const o = v.org(winner); o.rep = clamp(o.rep + 5, 0, 100); if (o.sponsor) o.sponsor.perSeason = Math.round(o.sponsor.perSeason * 1.1 / 1000) * 1000;
          news({ cat: 'analytics', icon: '👑', title: `Начало эры: ${winner} выигрывает снова`, lead: `${cnt} титула в трёх последних топ-событиях.`, body: ['Спонсоры и болельщики говорят о новой династии.'], tags: tags(tag('t', winner)), imp: 8, team: winner });
        } else if (c && c.stage === 1) { c.titles++; const core = nicks(byName(winner)); if (c.titles >= 3 && !c.legend && c.core.filter(n => core.includes(n)).length >= 4) { c.legend = true; starters(byName(winner)).forEach(p => { p.legend = true; }); news({ cat: 'analytics', icon: '🏛', title: `${winner}: легендарная пятёрка`, lead: `${c.titles} титула подряд с одним составом.`, body: ['Эта пятёрка войдёт в историю.'], tags: tags(tag('t', winner)), imp: 8, team: winner }); } }
      }
      Object.values(s.story).filter(c => c.stage === 1 && String(c.team) && Object.prototype.hasOwnProperty.call(c, 'titles')).forEach(c => {
        const pl = pls[c.team]; if (!pl) return;
        c.out = pl.place > 8 ? c.out + 1 : 0;
        const t = byName(c.team), cur = t ? nicks(t) : [], kept = c.core.filter(n => cur.includes(n)).length;
        if (kept <= 2) { c.stage = 2; news({ cat: 'analytics', icon: '💔', title: `${c.team}: распад чемпионской пятёрки`, lead: `Из состава эры остались лишь ${kept} игрок(а).`, body: ['Эпоха закончилась, клубу предстоит всё начинать заново.'], tags: tags(tag('t', c.team)), imp: 7, team: c.team }); v.org(c.team).rep = clamp(v.org(c.team).rep - 3, 0, 100); }
        else if (c.out >= 2) { c.stage = 2; news({ cat: 'analytics', icon: '🌇', title: `Конец эры ${c.team}`, lead: 'Два турнира подряд без топ-8.', body: ['Преемники уже наступают на пятки.'], tags: tags(tag('t', c.team)), imp: 6, team: c.team }); v.org(c.team).rep = clamp(v.org(c.team).rep - 2, 0, 100); }
      });
      // --- неожиданная победа аутсайдера
      if (winner && v.rankOf(winner) >= 20) {
        news({ cat: 'match', icon: '🐺', title: `Сенсация: ${winner} выигрывает ${ct.name}`, lead: `Команда из второй двадцатки рейтинга обошла всех фаворитов.`, body: ['Один из самых неожиданных титулов сезона.'], tags: tags(tag('t', winner)), imp: 9, team: winner });
        const o = v.org(winner); o.rep = clamp(o.rep + 6, 0, 100); if (o.sponsor) o.sponsor.perSeason = Math.round(o.sponsor.perSeason * 1.05 / 1000) * 1000;
      }
    }
    // --- финансовый кризис
    Object.entries(v.S().orgs || {}).forEach(([name, o]) => {
      if (!o || o.budget >= -200000) return; const key = `fin:${name}:${season()}`; if (s.story[key]) return; s.story[key] = { stage: 1 };
      if (o.sponsor) o.sponsor.perSeason = Math.round(o.sponsor.perSeason * 0.92 / 1000) * 1000;
      news({ cat: 'analytics', icon: '💸', title: `${name}: финансовые проблемы`, lead: 'Клуб ушёл в минус, спонсоры пересматривают условия.', body: ['Возможны продажа игроков и сокращение инфраструктуры.'], tags: tags(tag('t', name)), imp: 5, team: name });
    });
    save();
  }

  /* =============== Подключение =============== */
  function install() {
    installTraining();
    const H = window.HS;
    if (H && H.PAGES && !H.PAGES.__v41) {
      rankingBase = H.PAGES.ranking;
      const tr = H.PAGES.training;
      if (rankingBase) H.PAGES.ranking = rankingPage;
      if (tr) H.PAGES.training = function () { let o = tr.apply(this, arguments); try { o += trainingBox(); } catch (e) { console.warn('[v41] training', e); } return o; };
      H.AFTER.push(page => { if (page !== 'ranking') rankingWasVisible = false; });
      H.CLICKS.push(['[data-v41-rank-mode]', el => {
        H.S.rk.source = el.dataset.v41RankMode === 'vrs' ? 'vrs' : 'hltv';
        H.render();
      }]);
      H.PAGES.__v41 = true;
    }
    document.addEventListener('change', e => {
      const el = e.target; if (!el || !el.matches || !el.matches('#hs-root select[data-v41p]')) return;
      const v = V(), t = byName(v && v.S().career && v.S().career.team), p = t && t.players.find(x => x.nick === el.dataset.v41p); if (!p) return;
      p.v41plan = { focus: el.value }; save(); if (H && H.render) H.render();
    });
    const f = window.finalizeTournamentRating;
    if (typeof f === 'function' && !f.__v41) {
      const w = function () { const ct = typeof currentTournament !== 'undefined' ? currentTournament : null; const r = f.apply(this, arguments); try { afterTournament(ct); } catch (e) { console.warn('[v41] after', e); } return r; };
      w.__v41 = true; window.finalizeTournamentRating = w; try { finalizeTournamentRating = w; } catch (e) {}
    }
  }
  window.V41 = { hltvRanking, hltvPoints, individualTraining, eventFinance, afterTournament, recordParallel, migrateBase, defaultPlan, state: S, PLAN_L };
  setTimeout(() => { try { migrateBase(); } catch (e) {} }, 3000);
  install();
})();
