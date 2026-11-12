/* v90 — Этап 0 · Roster Engine и журнал решений.

   ROSTER ENGINE (CS2Roster)
   Любое изменение состава — покупка, свободный агент, академия, аренда, скамейка, возврат из аренды, замена у
   продавшей команды, сделка менеджера — проходит одну последовательность:
     1. контракт и статус игрока (аренда, академия только для молодых);
     2. совместимость (язык общения);
     3. роль (капитан — только на капитана, одна роль IGL/AWPer в составе);
     4. спортивное усиление (по позиции уходящего, порог из CS2Config);
     5. финансы (баланс после выкупа);
     6. ограничения организации: управляемая менеджером команда, защита звёзд (CS2Stature), престиж клуба;
     7. изменение состава (выполняет вызывающая функция);
     8–10. журнал, целостность («игрок числится в одном месте»), летопись игрока.
   Для ИИ нарушения правил 1–6 — запрет. Для менеджера — предупреждения (CS2Roster.lastWarnings): решение за ним.
   Вынужденные операции (возврат из аренды, замена ушедшего, завершение карьеры) проверяются только на целостность.

   ЖУРНАЛ (CS2Journal) — transferState.v90Journal
   Записи с причинами: ROSTER_CHANGE (что изменилось и почему), ROSTER_BLOCK (почему сделка отклонена),
   MARKET_DECISION (потребность, рассмотренные кандидаты, выбор), CONTROL (передача клуба), REPAIR (исправления
   целостности). Через journal.followupDays у решения рынка появляется outcome: место в рейтинге тогда и сейчас,
   играет ли новичок в основе. Так любой странный трансфер можно разобрать по шагам. */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof transferState === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const DAY = 864e5, UNIQUE = ['AWPer', 'IGL'];
  const lc = s => String(s || '').toLowerCase();
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const pow = p => W.CS2Power ? W.CS2Power.overall(p) : (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const iglPow = p => W.CS2Power ? W.CS2Power.role(p, 'IGL') : (+p.tacticalIQ || 0) * .55 + (+p.utility || 0) * .2 + (+p.clutch || 0) * .15 + (+p.firepower || 0) * .1;
  const val = (p, role) => W.CS2Power ? W.CS2Power.role(p, role || p.role) : ((role || p.role) === 'IGL' ? iglPow(p) : pow(p));
  const starters = t => (t && t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankOf = t => { const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.indexOf(t); return i < 0 ? 999 : i + 1; };
  const managed = () => { try { return (W.V31 && W.V31.managed && W.V31.managed()) || ''; } catch (e) { return ''; } };
  const marketAuto = () => { try { return !W.V31 || !W.V31.auto || W.V31.auto('market'); } catch (e) { return true; } };
  const fitOf = (t, p) => { try { return typeof teamIdentityFit === 'function' ? teamIdentityFit(t, p) : 1; } catch (e) { return 1; } };
  const stat = () => W.CS2Stature || null;
  const roleFits = (out, role) => role === out.role || (!UNIQUE.includes(out.role) && !UNIQUE.includes(role));

  /* ------------------------------------------------------------ журнал */
  const J = () => { if (!Array.isArray(transferState.v90Journal)) transferState.v90Journal = []; return transferState.v90Journal; };
  const BL = () => { if (!Array.isArray(transferState.v90Blocks)) transferState.v90Blocks = []; return transferState.v90Blocks; };
  let seq = 0;
  function log(type, e) {
    const x = Object.assign({ id: 'j' + now().toString(36) + (++seq).toString(36), ts: now(), s: season(), type }, e);
    if (type === 'ROSTER_BLOCK') { const b = BL(); b.unshift(x); if (b.length > 150) b.length = 150; return x; }   // отказы — отдельным кольцом, чтобы не вытеснять решения
    const j = J(); j.unshift(x); const max = C('journal.max', 800); if (j.length > max) j.length = max;
    return x;
  }
  function list(f) {
    const all = J().concat(f && f.blocks ? BL() : []);
    if (!f) return all.slice();
    return all.filter(e => (!f.type || e.type === f.type) && (!f.team || e.team === f.team || e.from === f.team) && (!f.player || (e.players || []).includes(f.player) || e.player === f.player));
  }
  // результат решения рынка через journal.followupDays
  function followups() {
    const lim = C('journal.followupDays', 56) * DAY, t = now(); let n = 0;
    J().forEach(e => {
      if (e.type !== 'MARKET_DECISION' || !e.chosen || e.outcome || t - e.ts < lim) return;
      const team = teams.find(x => x.name === e.team), np = team && (team.players || []).find(p => lc(p.nick) === lc(e.chosen.nick));
      e.outcome = { at: t, rankAt: e.rankAt, rankNow: team ? rankOf(team) : null, starter: !!(np && (!np.status || np.status === 'STARTER')) };
      e.outcome.delta = e.outcome.rankNow != null && e.rankAt ? e.rankAt - e.outcome.rankNow : null;
      // v94: чистый итог — за вычетом тренда клуба до решения (8 недель ≈ срок оценки)
      e.outcome.net = e.outcome.delta != null ? e.outcome.delta - (Number.isFinite(+e.trend8) ? +e.trend8 : 0) : null;
      try { if (W.CS2MarketLearn && e.chosen && e.chosen.src) W.CS2MarketLearn.note(e.chosen.src, e.outcome.net, e.outcome.starter); } catch (x) {}
      n++;
    });
    return n;
  }
  W.CS2Journal = { log, list, followups, blocks: () => BL().slice() };
  /* v94: рынок учится на своих итогах — по каждому источнику кандидатов (академия, свободные агенты, покупка, аренда)
     копится чистый итог решений (изменение места минус тренд до решения) и доля новичков, оставшихся в основе. Отсюда —
     поправка к выбору: ±market.learnMax (решения, которые в этом мире окупаются, — чуть предпочтительнее). */
  const LS = () => { const s = transferState.v94Learn = transferState.v94Learn || {}; return s; };
  W.CS2MarketLearn = {
    note(src, net, starter) { if (!src || src === 'coach' || net == null) return; const s = LS(), x = s[src] = s[src] || { n: 0, net: 0, st: 0 }; const a = 1 / Math.min(40, x.n + 1); x.net = x.net + (net - x.net) * a; x.st = x.st + ((starter ? 1 : 0) - x.st) * a; x.n++; },
    bonus(src) { const x = LS()[src]; if (!x || x.n < C('market.learnMin', 8)) return 0; return Math.max(-C('market.learnMax', 0.5), Math.min(C('market.learnMax', 0.5), (x.net / 10 + (x.st - 0.7)) * 0.5)); },
    stats: () => JSON.parse(JSON.stringify(LS()))
  };

  /* ------------------------------------------------------------ правила */
  // вынужденные операции: не решение клуба, а следствие события (возврат из аренды, продажа игрока, завершение карьеры)
  const FORCED = new Set(['loan-return', 'sold-replacement', 'retire-replacement', 'repair', 'standin', 'standin-return', 'release', 'contract']);
  const isLeader = (t, p) => { const S = stat(), tr = S ? S.tier(p) : 'regular'; if (tr === 'franchise' || tr === 'star') return true; const st = starters(t); return st.length > 0 && st.every(x => x === p || pow(x) <= pow(p)); };
  const needGain = (t, out) => isLeader(t, out) ? C('roster.needLeader', 4) : (+out.age || 25) >= C('roster.veteranAge', 32) ? C('roster.needVeteran', 0.5) : C('roster.needRegular', 1.5);
  const coreGain = (c, out) => val(c, out.role) - val(out) + ((+c.form || 100) - (+out.form || 100)) * 0.05;
  function actorOf(op) {
    if (op.actor) return op.actor;
    if (W.__v31UserDeal) return 'user';
    return 'ai';
  }
  /* op: { kind, team, out?, incoming?, from?, fee?, reason?, actor? }
     kind: buy | fa | academy | loan | bench | release | loan-return | sold-replacement | retire-replacement | user | contract */
  function evaluate(op) {
    const actor = actorOf(op), r = { ok: true, actor, kind: op.kind, blocks: [], warnings: [], gain: null, need: null };
    const { team, out, incoming, from } = op;
    const soft = (code, text) => (actor === 'user' ? r.warnings : r.blocks).push({ code, text });
    const hard = (code, text) => r.blocks.push({ code, text });
    if (!team) { hard('NO_TEAM', 'нет команды'); r.ok = false; return r; }
    const forced = FORCED.has(op.kind);
    // 6a. управляемая менеджером команда: ИИ не меняет её состав без делегирования рынка
    const allowed = W.__v31ForceBuy && W.__v31ForceBuy === team.name;   // менеджер сам поручил ИИ найти игрока (решение в «Центре событий»)
    if (actor === 'ai' && !forced && !allowed && team.name && team.name === managed() && !marketAuto()) hard('MANAGED', `${team.name} управляет менеджер — рынок не делегирован ИИ`);
    if (actor === 'ai' && !forced && from && from.name === managed() && !marketAuto() && incoming && !incoming.v31listed) hard('MANAGED_SELL', `игрок ${from.name} не выставлен менеджером на продажу`);
    if (incoming) {
      // 1. контракт и статус
      if (incoming.onLoan && op.kind !== 'loan-return' && op.kind !== 'loan') hard('ON_LOAN', `${incoming.nick} в аренде`);
      if (team.isAcademy && (+incoming.age || 25) > 21 && !forced) hard('ACADEMY_AGE', `${incoming.nick} старше 21 — не для академии`);
      // 2. совместимость
      if (!forced && !team.isAcademy) { const f = fitOf(team, incoming); if (f < C('roster.minFit', 0.55)) soft('FIT', `${incoming.nick} не подходит по языку общения (${f.toFixed(2)})`); }
      // 6b. престиж: звезда не идёт в куда менее престижный клуб
      if (!forced && !team.isAcademy && stat() && !stat().canJoin(incoming, team, from || null)) soft('STATURE', `${incoming.nick} не перейдёт в клуб такого уровня`);
    }
    if (out && incoming && !forced) {
      // 3. роль
      if (!roleFits(out, incoming.role)) soft('ROLE', `${incoming.nick} (${incoming.role}) не закрывает позицию ${out.role}`);
      if (UNIQUE.includes(incoming.role) && starters(team).some(p => p !== out && lc(p.nick) !== lc(incoming.nick) && p.role === incoming.role)) soft('ROLE_DUP', `в составе уже есть ${incoming.role}`);
      // 4. спортивное усиление (по позиции уходящего: капитан — по тактике)
      if (!team.isAcademy) {
        r.gain = Math.round(coreGain(incoming, out) * 10) / 10; r.need = needGain(team, out);
        if (r.gain < r.need) soft('GAIN', `${incoming.nick} усиливает позицию ${out.role || ''} на ${r.gain} — нужно ${r.need}`);
        // 6c. защита звезды и франшизы
        const S = stat();
        if (S && (S.shielded ? S.shielded(out, team) : S.protectedIn(out, team)) && r.gain < C('roster.needShielded', 6)) soft('PROTECTED', `${out.nick} — ${S.tier(out) === 'franchise' ? 'лицо клуба' : 'звезда'} без спада формы`);
      }
    }
    if (out && !incoming && !forced && op.kind === 'bench') {
      const S = stat(); if (S && (S.shielded ? S.shielded(out, team) : false)) soft('PROTECTED', `${out.nick} — звезда без спада формы`);
    }
    // 5. финансы
    if ((op.fee > 0 || (incoming && out)) && !forced && !team.isAcademy) {
      // v94: прогноз сезона с учётом выкупа и разницы зарплат («хватит ли денег на следующий сезон»)
      let salaryDelta = 0; try { if (incoming && W.V31) { const q = JSON.parse(JSON.stringify(incoming)); q.v31sv = 0; delete q.salary; W.V31.ensurePerson(q); salaryDelta = (q.salary || 0) - ((out && out.salary) || 0); } } catch (e) {}
      if (W.CS2Finance) {
        const f = W.CS2Finance.forecast(team, { fee: op.fee || 0, salaryDelta });
        r.forecast = f;
        if (actor !== 'user' && op.fee > 0 && W.CS2Finance.policy(team) === 'austerity') soft('AUSTERITY', `${team.name} в режиме экономии — выкуп невозможен`);
        if (f.end < C('roster.financeFloor', -300000)) soft('BUDGET', `бюджет на конец сезона станет ${Math.round(f.end / 1000)}k (сейчас ${Math.round(f.budget / 1000)}k, через сезон ${Math.round(f.next / 1000)}k)`);
      } else if (op.fee > 0) {
        let b = null; try { b = Number(W.V31.org(team.name).budget); } catch (e) {}
        if (Number.isFinite(b) && b - op.fee < C('roster.financeFloor', -300000)) soft('BUDGET', `после выкупа баланс ${Math.round((b - op.fee) / 1000)}k — ниже допустимого`);
      }
    }
    r.ok = !r.blocks.length;
    return r;
  }

  /* ------------------------------------------------------------ снимок и целостность */
  const snapTeams = list => new Map(list.filter(Boolean).map(t => [t, (t.players || []).map(p => p && { nick: p.nick, role: p.role, status: p.status || 'STARTER', v: val(p) })]));
  function diff(snap) {
    const changes = [];
    snap.forEach((before, t) => {
      const after = (t.players || []).map(p => p && { nick: p.nick, role: p.role, status: p.status || 'STARTER' });
      const bn = new Set(before.filter(Boolean).map(x => lc(x.nick))), an = new Set(after.filter(Boolean).map(x => lc(x.nick)));
      before.forEach(x => { if (x && !an.has(lc(x.nick))) changes.push({ team: t.name, out: x.nick, role: x.role }); });
      after.forEach(x => { if (x && !bn.has(lc(x.nick))) changes.push({ team: t.name, in: x.nick, role: x.role }); });
    });
    return changes;
  }
  // инвариант: игрок числится в одном месте — в одном составе или среди свободных агентов
  function integrity(nicks) {
    const fixes = [], fa = transferState.freeAgents || [];
    const where = n => teams.filter(t => (t.players || []).some(p => p && lc(p.nick) === lc(n)));
    (nicks || []).forEach(n => {
      const ts = where(n);
      if (ts.length) {
        for (let i = fa.length - 1; i >= 0; i--) if (fa[i] && lc(fa[i].nick) === lc(n)) { fa.splice(i, 1); fixes.push(`${n}: убран из свободных агентов (числится в ${ts[0].name})`); }
      }
      if (ts.length > 1) {
        // оставляем игрока там, где он в основе; запасной дубль убираем
        const keep = ts.find(t => (t.players || []).some(p => lc(p.nick) === lc(n) && (!p.status || p.status === 'STARTER'))) || ts[0];
        ts.filter(t => t !== keep).forEach(t => { const i = t.players.findIndex(p => lc(p.nick) === lc(n) && /BENCH|RESERVE/.test(String(p.status || ''))); if (i >= 0) { t.players.splice(i, 1); fixes.push(`${n}: запасной дубль убран из ${t.name}`); } });
      }
    });
    if (fixes.length) log('REPAIR', { players: nicks, fixes });
    return fixes;
  }
  function checkAll() {
    const seen = new Map(), dup = [];
    teams.forEach(t => (t.players || []).forEach(p => { if (!p || !p.nick) return; const k = lc(p.nick); if (seen.has(k)) dup.push(p.nick); else seen.set(k, t.name); }));
    const both = (transferState.freeAgents || []).filter(p => p && seen.has(lc(p.nick))).map(p => p.nick);
    return { duplicates: dup, inBothRosterAndFA: both };
  }

  /* ------------------------------------------------------------ целостность всего мира
     Источник дублей — данные: в базе EMDB 9 игроков записаны в двух командах (Rkzinho и Tatu — в paiN и paiN Academy,
     kyxsan — в Aurora и Team Falcons…). Какой импорт применится последним, зависело от таймингов загрузки, поэтому
     проверка «игрок в одном месте» падала то в одном, то в другом прогоне. Правило: где игрок числится в базе составов
     2026, там он и остаётся; иначе основа важнее запаса, профессиональный клуб — академии, клуб выше в рейтинге —
     клуба ниже. На освободившееся место — подходящий свободный агент (или игрок резерва под роль). */
  function rosterOwner(nick) {
    const R = W.CS2_ROSTERS_2026 && W.CS2_ROSTERS_2026.teams; if (!R) return null;
    const k = lc(nick); for (const name in R) if ((R[name] || []).some(x => lc(Array.isArray(x) ? x[0] : x) === k)) return lc(name);
    return null;
  }
  function refill(t, gone, idx) {
    let rep = null;
    try { const fa = typeof findCompatibleFreeAgent === 'function' ? findCompatibleFreeAgent(t, gone) : null; if (fa && fa.p && lc(fa.p.nick) !== lc(gone.nick)) { rep = JSON.parse(JSON.stringify(fa.p)); if (fa.idx >= 0 && transferState.freeAgents[fa.idx] === fa.p) transferState.freeAgents.splice(fa.idx, 1); } } catch (e) {}
    if (!rep) return null;
    Object.assign(rep, { status: gone.status || 'STARTER' }); delete rep.reservedFor; delete rep.benchFrom;
    if (UNIQUE.includes(gone.role) && !(t.players || []).some(p => p && p !== gone && p.role === gone.role)) rep.role = gone.role;
    t.players.splice(idx, 0, rep);
    try { if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(t); } catch (e) {}
    return rep;
  }
  function resolveWorld() {
    const map = new Map(), fixes = [];
    teams.forEach(t => (t && t.players || []).forEach(p => { if (!p || !p.nick) return; const k = lc(p.nick); if (!map.has(k)) map.set(k, []); map.get(k).push({ t, p }); }));
    map.forEach((list, k) => {
      if (list.length < 2) return;
      const owner = rosterOwner(k);
      const score = x => (owner && lc(x.t.name) === owner ? 1e6 : 0) + ((!x.p.status || x.p.status === 'STARTER') ? 1e4 : 0) + (x.t.isAcademy ? 0 : 1e3) - (x.t.isAcademy ? 0 : rankOf(x.t));
      const keep = list.slice().sort((a, b) => score(b) - score(a))[0];
      list.filter(x => x !== keep).forEach(x => {
        const idx = x.t.players.indexOf(x.p); if (idx < 0) return;
        x.t.players.splice(idx, 1);
        const rep = refill(x.t, x.p, idx);
        fixes.push(`${x.p.nick}: оставлен в ${keep.t.name}, убран из ${x.t.name}${rep ? ', на его место — ' + rep.nick : ''}`);
      });
    });
    // у каждого игрока основы — действующий контракт (игроки, добавленные импортом или заменой между тиками рынка)
    // v95: после межсезонной проверки контрактов (v30) просроченный контракт у игрока основы — тоже исправление
    // (игрок пришёл со старым контрактом через замену, возвращение из аренды или стенд-ина)
    const checked = seasonState.v30ContractSeason === seasonState.currentSeason;
    teams.forEach(t => (t && !t.isAcademy ? t.players || [] : []).forEach(p => { if (p && (!Number.isFinite(+p.contractUntil) || !p.contractUntil || (checked && +p.contractUntil < season()))) { p.contractUntil = season() + 2 + (lc(p.nick).length % 2); fixes.push(`${p.nick} (${t.name}): контракт до сезона ${p.contractUntil}`); } }));
    // летопись клубов (v88): игрок, появившийся в составе между проверками, получает запись сразу
    const L = transferState.v88Career || {};
    if (typeof W.CS2CareerNote === 'function') teams.forEach(t => (t && t.players || []).forEach(p => { if (p && p.nick && !(L[p.nick] || []).length) { try { W.CS2CareerNote({ type: 'signing', player: p.nick, from: '—', to: t.name, ts: now() }); } catch (e) {} } }));
    const fa = transferState.freeAgents || [];
    for (let i = fa.length - 1; i >= 0; i--) { const p = fa[i]; if (p && p.nick && map.has(lc(p.nick))) { fa.splice(i, 1); fixes.push(`${p.nick}: убран из свободных агентов (числится в ${map.get(lc(p.nick))[0].t.name})`); } }
    if (fixes.length) { log('REPAIR', { scope: 'world', fixes }); try { saveTeams(); saveTransferState(); } catch (e) {} }
    return fixes;
  }

  /* ------------------------------------------------------------ выполнение */
  // gate → мутация (fn) → commit. fn возвращает true/false. Для ИИ при запрете fn не вызывается.
  let depth = 0;
  W.CS2Roster = {
    lastWarnings: [], lastBlocks: [],
    evaluate, needGain, coreGain, checkAll, integrity, resolveWorld,
    run(op, fn) {
      const r = evaluate(op);
      this.lastWarnings = r.warnings; this.lastBlocks = r.blocks;
      if (!r.ok) {
        log('ROSTER_BLOCK', { team: op.team && op.team.name, from: op.from && op.from.name, kind: op.kind, actor: r.actor, player: op.incoming && op.incoming.nick, out: op.out && op.out.nick, reason: op.reason || '', blocks: r.blocks });
        return false;
      }
      const involved = [op.team, op.from, op.academy].concat(op.also || []).filter(Boolean);
      const snap = snapTeams(involved);
      depth++;
      let ok = false;
      try { ok = !!fn(r); } finally { depth--; }
      if (ok) this.commit(op, r, snap);
      return ok;
    },
    commit(op, r, snap) {
      const changes = snap ? diff(snap) : [];
      const players = [...new Set(changes.map(c => c.in || c.out).concat([op.incoming && op.incoming.nick, op.out && op.out.nick]).filter(Boolean))];
      integrity(players);
      // v94: дата прихода новичка — для защиты от немедленной замены (v30 weakLink)
      changes.filter(c => c.in).forEach(c => { const tt = teams.find(x => x.name === c.team), p = tt && (tt.players || []).find(q => q && q.nick === c.in); if (p) { p.v94joinedAt = now(); if (!(+p.contractUntil >= season())) p.contractUntil = season() + 1 + (lc(p.nick).length % 2); } });   // v95: новичок без действующего контракта получает контракт при переходе
      log('ROSTER_CHANGE', {
        team: op.team && op.team.name, from: op.from && op.from.name, kind: op.kind, actor: r ? r.actor : actorOf(op),
        player: op.incoming && op.incoming.nick, out: op.out && op.out.nick, role: op.out ? op.out.role : op.incoming && op.incoming.role,
        reason: op.reason || '', gain: r ? r.gain : null, need: r ? r.need : null, warnings: r && r.warnings.length ? r.warnings : undefined,
        fee: op.fee || undefined, changes, players, rankAt: op.team && !op.team.isAcademy ? rankOf(op.team) : undefined
      });
    },
    get busy() { return depth > 0; }
  };

  /* ------------------------------------------------------------ applyPlayerTransfer — внешний слой
     Покупки ИИ, сделки менеджера, «звезда уходит из гранда», амбиции — всё идёт через applyPlayerTransfer (v28 и
     обёртки v30/v31/v84/v88). Engine — самый внешний слой: проверка до сделки, журнал и целостность после. */
  (function () {
    const f = W.applyPlayerTransfer; if (typeof f !== 'function' || f.__v90) return;
    const w = function (fromTeam, toTeam, player, reason) {
      if (!fromTeam || !toTeam || !player || W.CS2Roster.busy) return f.apply(this, arguments);
      const out = typeof W.CS2OutFor === 'function' ? W.CS2OutFor(toTeam, player) : null;
      let fee = 0; try { fee = W.__v31UserDeal && W.__v31UserDeal.fee != null ? +W.__v31UserDeal.fee : Math.round((W.V31.valueOf(player) || 0) / 1000) * 1000; } catch (e) {}
      const forced = !!(W.__v34Force && W.__v86Nego);   // договорённость уже достигнута переговорами — проверялась при старте переговоров
      const op = { kind: W.__v31UserDeal ? 'user' : 'buy', team: toTeam, from: fromTeam, incoming: player, out, fee, reason, actor: W.__v31UserDeal ? 'user' : (forced ? 'ai-nego' : 'ai') };
      const args = arguments, self = this;
      return W.CS2Roster.run(op, () => f.apply(self, args));
    };
    w.__v90 = true; Object.keys(f).forEach(k => { if (!(k in w)) w[k] = f[k]; });
    W.applyPlayerTransfer = w; try { applyPlayerTransfer = w; } catch (e) {} // eslint-disable-line no-global-assign
  })();

  /* ------------------------------------------------------------ замена ушедшего (завершение карьеры и т. п.) — v84-replace
     Вынужденная операция: правил усиления нет, но журнал и целостность — те же. */
  function wrapReplace() {
    const f = W.CS2SmartReplace; if (typeof f !== 'function' || f.__v90) return !!(f && f.__v90);
    const w = function (t, out) {
      // v94: снимок всех профессиональных клубов — замена может прийти выкупом из другого клуба (сторож нашёл: alex666
      // ушёл из B8 в Falcons на место karrigan, а в журнале был только клуб-покупатель)
      const snap = t ? snapTeams(teams.filter(x => x && !x.isAcademy)) : null;
      const res = f.apply(this, arguments);
      try {
        const ch = snap ? diff(snap) : [];
        if (ch.length) {
          const inc = ch.find(c => c.in && c.team === t.name), src = inc && ch.find(c => c.out === inc.in && c.team !== t.name);
          const from = src ? teams.find(x => x.name === src.team) : null;
          W.CS2Roster.commit({ kind: 'retire-replacement', actor: 'system', team: t, from, out, incoming: inc ? { nick: inc.in, role: inc.role } : null, reason: `замена ушедшего ${out && out.nick || ''}${from ? ` (выкуп из ${from.name})` : ''}` }, null, snap);
        }
      } catch (e) {}
      return res;
    };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v90 = true;
    Object.defineProperty(w, 'last', { get() { return f.last; }, set(v) { f.last = v; } });
    W.CS2SmartReplace = w; return true;
  }
  if (!wrapReplace()) setTimeout(wrapReplace, 1500);

  /* ------------------------------------------------------------ временная замена (стенд-ин) — auto_script_1
     Найдено долгой симуляцией: игрок, временно заменённый стенд-ином (так за сезон уходил даже s1mple), лежал среди
     свободных агентов и возвращался, только если стенд-ин всё ещё в составе. Если место занял кто-то другой, отметка
     стиралась, а игрок навсегда оставался без клуба — и ни в одном журнале этого не было. Теперь: обе операции в
     журнале; возврат гарантирован — игрок занимает место того, кто пришёл в команду за время замены (тот уходит в запас),
     или свободное место; если вернуть некуда — запись с объяснением. Пока у команды временная замена, рынок её не трогает. */
  function wrapStandIn() {
    const ap = W.applyTemporaryStandIn, rs = W.restoreTemporaryStandIn;
    if (typeof ap !== 'function' || typeof rs !== 'function') return false;
    if (ap.__v90 && rs.__v90) return true;
    const apW = function (t, reason) {
      const before = t ? (t.players || []).map(p => p && p.nick).filter(Boolean) : [];
      const snap = t ? snapTeams([t]) : null;
      const ok = ap.apply(this, arguments);
      if (ok && t && t.tempStandIn) {
        t.tempStandIn.v90before = before;
        try { W.CS2Roster.commit({ kind: 'standin', actor: 'system', team: t, out: t.tempStandIn.original, incoming: (t.players || []).find(p => p && p.isStandIn) || null, reason: `временная замена: ${reason || ''}` }, null, snap); } catch (e) {}
      }
      return ok;
    };
    const rsW = function (t) {
      const ts = t && t.tempStandIn, orig = ts && ts.original, before = (ts && ts.v90before) || [];
      const snap = t ? snapTeams([t]) : null;
      const r = rs.apply(this, arguments);
      if (!t || !orig) return r;
      try {
        const onAny = teams.some(x => (x.players || []).some(p => p && lc(p.nick) === lc(orig.nick)));
        let note = 'возвращение после временной замены';
        if (!onAny) {
          // стенд-ина в составе уже нет — возвращаем игрока на место того, кто пришёл за время замены
          const fa = transferState.freeAgents || [], fi = fa.findIndex(p => p && lc(p.nick) === lc(orig.nick));
          const back = fi >= 0 ? fa.splice(fi, 1)[0] : JSON.parse(JSON.stringify(orig));
          Object.assign(back, { status: 'STARTER' }); delete back.benchFrom; delete back.reservedFor; delete back.isStandIn;
          const st = (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
          const newcomer = st.filter(p => !before.some(n => lc(n) === lc(p.nick))).sort((a, b) => val(a, orig.role) - val(b, orig.role))[0];
          if (newcomer) {
            const i = t.players.indexOf(newcomer); t.players[i] = back;
            newcomer.status = 'BENCH'; newcomer.benchFrom = t.name; fa.push(newcomer);
            (transferState.v30Bench = transferState.v30Bench || []).push({ nick: newcomer.nick, team: t.name, since: Number(transferState.marketRuns) || 0 });
            note = `возвращение после временной замены: место ${newcomer.nick}, пришедшего за время замены`;
          } else if (st.length < 5) { t.players.push(back); note = 'возвращение после временной замены на свободное место'; }
          else { fa.push(back); back.status = 'BENCH'; back.benchFrom = t.name; note = 'после временной замены места в основе нет — игрок в запасе клуба'; }
          try { if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(t); } catch (e) {}
        }
        W.CS2Roster.commit({ kind: 'standin-return', actor: 'system', team: t, incoming: orig, reason: note }, null, snap);
      } catch (e) { console.warn('[v90 standin]', e); }
      return r;
    };
    apW.__v90 = rsW.__v90 = true;
    W.applyTemporaryStandIn = apW; W.restoreTemporaryStandIn = rsW;
    try { (0, eval)('applyTemporaryStandIn = window.applyTemporaryStandIn; restoreTemporaryStandIn = window.restoreTemporaryStandIn'); } catch (e) {}
    return true;
  }
  if (!wrapStandIn()) setTimeout(wrapStandIn, 1500);

  /* ------------------------------------------------------------ v94: сторож неучтённых уходов из основы
     Каждый игровой день: кто из игроков основы профессиональных клубов ушёл из клуба. Если за этот промежуток в журнале нет
     записи с этим игроком (переход, замена, временная замена, завершение карьеры, исправление) — запись UNTRACKED с
     событиями игры за этот день. Так долгая симуляция сама показывает пути изменения состава мимо Roster Engine. */
  let watchPrev = null, watchAt = 0;
  function watch() {
    const cur = new Map(); teams.forEach(t => { if (t && !t.isAcademy) (t.players || []).forEach(p => { if (p && p.nick && (!p.status || p.status === 'STARTER')) cur.set(lc(p.nick), { team: t.name, nick: p.nick }); }); });
    const t0 = watchAt; watchAt = now();
    if (watchPrev) {
      const jl = J(), since = jl.filter(e => e.ts >= t0 - DAY);
      const bus = (W.__v29Bus || []).slice(-60);
      watchPrev.forEach((x, k) => {
        const n = cur.get(k); if (n && n.team === x.team) return;
        const tracked = since.some(e => JSON.stringify(e).toLowerCase().includes(k));
        const retired = (transferState.v30Moves || []).slice(0, 40).some(m => m && m.type === 'retire' && lc(m.player) === k);
        if (tracked || retired) return;
        const where = n ? n.team : (transferState.freeAgents || []).some(p => p && lc(p.nick) === k) ? 'свободный агент' : (teams.some(t => (t.players || []).some(p => p && lc(p.nick) === k)) ? 'запас клуба' : 'нигде');
        log('UNTRACKED', { team: x.team, player: x.nick, out: x.nick, players: [x.nick], reason: `ушёл из основы ${x.team} без записи в журнале → ${where}`, bus: bus.filter(e => JSON.stringify(e.data || {}).toLowerCase().includes(k)).map(e => e.type + ' ' + JSON.stringify(e.data || {}).slice(0, 160)).slice(-6) });
      });
    }
    watchPrev = cur;
  }
  W.CS2Roster.watch = watch;
  (function hookWatch() {
    const f = W.V30RankSnapshotTick; if (typeof f !== 'function') { setTimeout(hookWatch, 1000); return; }
    if (f.__v94w) return;
    const w = function () { const r = f.apply(this, arguments); try { watch(); } catch (e) {} return r; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v94w = true; W.V30RankSnapshotTick = w;
  })();

  /* ------------------------------------------------------------ периодически: результаты решений, проверка целостности */
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { followups(); } catch (e) {} try { if (!W.v57BatchCalendarSkip) watch(); } catch (e) {} }, 7000, 'v90-journal');
  // целостность мира: при загрузке (после всех импортов составов) и затем регулярно — дёшево, O(игроков)
  every(() => { try { if (!W.v57BatchCalendarSkip) resolveWorld(); } catch (e) { console.warn('[v90 world]', e); } }, 2000, 'v90-world');
  try { resolveWorld(); } catch (e) {}
  // v91: и каждый игровой день, в том числе при перемотке (снимок рейтинга вызывается ежедневно)
  (function hookDaily() {
    const f = W.V30RankSnapshotTick; if (typeof f !== 'function') { setTimeout(hookDaily, 1000); return; }
    if (f.__v91world) return;
    const w = function () { const r = f.apply(this, arguments); try { resolveWorld(); } catch (e) {} return r; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v91world = true; W.V30RankSnapshotTick = w;
  })();
  console.info('[v90] Roster Engine: единые проверки и журнал для всех изменений состава');
})();
