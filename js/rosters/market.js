(() => {
'use strict';
/* =====================================================================
   v30 · Живой трансферный рынок
   Было (v29): по ходу сезона рынок запускался с вероятностью 18% и делал максимум 1 сделку;
   почти все переходы — в окне после Major.
   Стало: периодический анализ составов. Каждый тик (после каждого Tier-1 турнира — «mid»,
   раз в игровую неделю — «week», после Major — «big» поверх окна v29) у каждой команды
   считается давление (результаты против ожиданий по рейтингу, падение в рейтинге, серия
   поражений) и слабое звено состава. Команда под давлением действует:
     • подписывает свободного агента (старый игрок уходит на скамейку, позже — в свободные агенты);
     • покупает игрока у команды слабее (applyPlayerTransfer v28: роли AWPer/IGL, уникальные ники);
     • повышает игрока своей академии;
     • берёт в аренду молодого игрока чужой академии (с возвратом через несколько тиков);
     • меняет тренера.
   Звёзды слабых команд просят перехода (амбиции). Громкие сделки начинаются с переговоров:
   слух публикуется, затем подтверждается сделкой или опровергается, если переговоры сорвались.
   Контракты: у игрока есть contractUntil (сезон); в межсезонье — продления или уход.
   Сильные составы с хорошими результатами почти не трогаются. Перед Major и во время турнира
   команды-участники заморожены (ростер-лок). Все события — через шину v29 → новости, а журнал
   переходов — transferState.v30Moves (единый источник для профилей и страницы трансферов).
   ===================================================================== */
if (typeof teams === 'undefined' || typeof transferState === 'undefined' || typeof seasonState === 'undefined') return;
const DAY = 864e5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const emit = (type, data) => { try { window.v29Emit && window.v29Emit(type, data); } catch (e) {} };
const calNow = () => Number(seasonState.calendar?.currentMs) || Date.now();
const lc = s => String(s || '').toLowerCase();
const UNIQUE = ['AWPer', 'IGL'];
const pow = p => window.CS2Power ? window.CS2Power.overall(p) : (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
// v86: капитана оценивают по тому, как он ведёт игру, а не по стрельбе (иначе хороший IGL всегда «слабое звено»)
const iglPow = p => window.CS2Power ? window.CS2Power.role(p, 'IGL') : (+p.tacticalIQ || 0) * .55 + (+p.utility || 0) * .2 + (+p.clutch || 0) * .15 + (+p.firepower || 0) * .1;
const val = (p, role) => window.CS2Power ? window.CS2Power.role(p, role || p?.role) : ((role || p?.role) === 'IGL' ? iglPow(p) : pow(p));
const fitOf = (team, p) => { try { return typeof teamIdentityFit === 'function' ? teamIdentityFit(team, p) : 1; } catch (e) { return 1; } };
const pro = () => teams.filter(t => !t.isAcademy);
const rankOf = t => pro().sort((a, b) => b.pts - a.pts).indexOf(t) + 1;
const clone = o => JSON.parse(JSON.stringify(o));
const run = () => Number(transferState.marketRuns) || 0;
const rnd = (() => { let s = (h32(String(seasonState.v29Salt || '') + Date.now()) || 1); return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const M = () => { const s = transferState; if (!Array.isArray(s.v30Moves)) s.v30Moves = []; if (!Array.isArray(s.v30Bench)) s.v30Bench = []; if (!Array.isArray(s.v30Loans)) s.v30Loans = []; if (!Array.isArray(s.v30Nego)) s.v30Nego = []; if (!s.v30Stats) s.v30Stats = {}; return s; };
const save = () => { try { saveTransferState(); saveTeams(); } catch (e) {} };
const onRoster = nick => teams.find(t => (t.players || []).some(p => lc(p.nick) === lc(nick))) || null;
const ACAD_PARENT = { 'Spirit Academy': 'Team Spirit', 'NAVI Junior': 'NAVI', 'G2 Ares': 'G2', 'MOUZ NXT': 'MOUZ' };
const academyFor = t => teams.find(a => a.isAcademy && (a.academyParent || a.parentTeam || ACAD_PARENT[a.name]) === t.name) || null;

/* ------------------------------------------------------------ журнал переходов */
function logMove(m) {
  const s = M(); m.ts = m.ts || calNow(); m.season = m.season || seasonState.currentSeason; m.id = m.id || ('mv' + (s.v30Moves.length + 1).toString(36) + (h32(m.player + m.ts) % 1e4).toString(36));
  s.v30Moves.unshift(m); if (s.v30Moves.length > 1500) s.v30Moves.length = 1500;
  try { window.CS2CareerNote && window.CS2CareerNote(m); } catch (e) {}   // v88: летопись команд игрока не обрезается вместе с журналом
  const st = s.v30Stats[m.season] || (s.v30Stats[m.season] = {}); st[m.type] = (st[m.type] || 0) + 1;
}
// всё, что идёт через шину v29 (в т. ч. трансферы окна после Major), попадает в журнал
function scanBus() {
  (window.__v29Bus || []).forEach(ev => {
    if (!ev || ev.__v30) return; ev.__v30 = true; const d = ev.data || {};
    if (ev.type === 'transfer') {
      logMove({ type: d.buyout ? 'buyout' : 'transfer', player: d.player, role: d.role, from: d.from, to: d.to, reason: d.reason, nego: d.nego || null });
      if (d.out) logMove({ type: 'release', player: d.out, from: d.to, to: 'Свободный агент', reason: d.outWhy ? `покидает состав: ${d.outWhy}` : `покидает состав: на его позицию пришёл ${d.player}` });
      if (d.rep) logMove({ type: 'signing', player: d.rep, from: 'Свободный агент', to: d.from, reason: `замена ушедшему в ${d.to} ${d.player}` });
    } else if (ev.type === 'coach') logMove({ type: 'coach', player: d.to, from: d.team, to: d.team, reason: `вместо ${d.from}${d.reason ? ' · ' + d.reason : ''}` });
    else if (ev.type === 'standin') logMove({ type: 'standin', player: d.player, from: 'Свободный агент', to: d.team, reason: `временно вместо ${d.out}` });
    else if (ev.type === 'retire') { logMove({ type: 'retire', player: d.player, role: d.role, from: d.team, to: '—', reason: `${d.age} лет`, cc: d.cc || '', iq: d.iq || 0 }); 
      // v86: замену не дублируем, если её переход (выкуп/подписание) уже есть в журнале
      const already = d.rep && (M().v30Moves || []).slice(0, 40).some(m => m && lc(m.player) === lc(d.rep) && m.to === d.team && /transfer|buyout|signing/.test(m.type || ''));
      if (d.rep && !d.smart && !already) logMove({ type: 'signing', player: d.rep, from: 'Академия / FA', to: d.team, reason: `замена завершившему карьеру ${d.player}` }); }
    else if (['signing', 'bench', 'release', 'promotion', 'loan', 'loan-return', 'extension'].includes(ev.type)) logMove({ type: ev.type, player: d.player, role: d.role, from: d.from, to: d.to, reason: d.reason });
  });
}
(() => { const prev = window.v29OnEvent; window.v29OnEvent = function () { try { scanBus(); } catch (e) {} if (typeof prev === 'function') return prev.apply(this, arguments); }; })();

/* ------------------------------------------------------------ контракты */
function ensureContracts() {
  const s = seasonState.currentSeason || 1;
  teams.forEach(t => (t.players || []).forEach(p => { if (!Number.isFinite(+p.contractUntil) || !p.contractUntil) p.contractUntil = s + 2 + (h32('c' + p.nick) % 3); })); // v33: стартовые контракты на 2–4 сезона
  // v33: один раз для старых сохранений — короткие стартовые контракты продлеваются минимум на 2 сезона вперёд,
  // чтобы исходные составы не распадались в первом же межсезонье
  if (!seasonState.v33LongContracts) { seasonState.v33LongContracts = 1; teams.forEach(t => (t.players || []).forEach(p => { if ((+p.contractUntil || 0) < s + 2) p.contractUntil = s + 2 + (h32('x' + p.nick) % 2); })); }
}
// v33: контракты в основном на 2–3 сезона (звёзды — 3), однолетние — редкость (ветераны, временные замены)
function newContract(p, years) {
  const star = typeof isStarPlayer === 'function' && isStarPlayer(p), old = (+p.age || 25) >= 31;
  p.contractUntil = (seasonState.currentSeason || 1) + (years || (star ? 3 : old ? 1 + Math.floor(rnd() * 2) : (rnd() < 0.1 ? 1 : 2 + Math.floor(rnd() * 2))));
}
/* ---- v33: реалистичные правила рынка ----
   • окна: межсезонье (январь), летний перерыв (июнь–июль) и неделя после Major; вне окон — только экстренные замены;
   • у команды не больше 2 добровольных изменений состава за сезон и пауза 90 игровых дней после каждого;
   • выкуп игрока с действующим контрактом — только при заметном усилении (иначе ждут окончания контракта). */
function windowOpen() { const m = new Date(calNow()).getMonth(); return m === 0 || m === 1 || m === 5 || m === 6 || m === 7 || m === 11 || calNow() <= (+transferState.v33WindowUntil || 0); } // v40: январь–февраль, июнь–август, декабрь (после ноябрьского Major) + неделя после Major
function changes() { const s = seasonState.currentSeason || 1, o = transferState.v33Changes || (transferState.v33Changes = {}); if (o.s !== s) { o.s = s; o.t = {}; } return o.t; }
function canChange(t) { if ((+t.v90AiGraceUntil || 0) > calNow()) return false; if (t.tempStandIn) return false; /* v90: у команды временная замена — состав не трогаем, пока игрок не вернётся */ /* v90: клуб только что передан ИИ от менеджера */ const c = changes()[t.name]; return !c || (c.n < 3 && calNow() - c.ts >= 60 * DAY); }
function noteChange(t) { const o = changes(), c = o[t.name] || (o[t.name] = { n: 0, ts: 0 }); c.n++; c.ts = calNow(); }

/* ------------------------------------------------------------ состояние команд */
function busyTeams() { // участники идущих турниров не меняют состав
  const set = new Set(), ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
  if (ct && !ct.completed) (ct.participants || []).forEach(n => set.add(n));
  (seasonState.parallelSchedule || []).forEach(ev => { if (ev.status === 'live') (ev.participants || []).forEach(x => set.add(typeof x === 'string' ? x : x.name)); });
  return set;
}
function locked() { // ростер-лок перед Major: за 12 игровых дней до старта и до конца
  const st = seasonState, nx = (st.seasonSchedule || [])[st.tournamentIndex], ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
  if (ct && !ct.completed && ct.isMajor) return true;
  if (nx?.type === 'major' && nx.calendar?.startMs && calNow() >= nx.calendar.startMs - 12 * DAY) return true;
  return false;
}
function recent(t, n) { return (t.history || []).filter(h => h && !h.isBootcamp && !h.isSeasonAward && h.place > 0).slice(0, n || 4); }
function pressure(t) {
  const rank = rankOf(t), rec = recent(t, 4);
  const expected = clamp(rank / 2.2, 1.5, 12);
  const avg = rec.length ? rec.reduce((s, h) => s + Math.min(16, h.place), 0) / rec.length : expected;
  const perf = avg / expected;
  const drop = Number(t.seasonStartRank) ? rank - t.seasonStartRank : 0;
  const losses = Math.abs(Math.min(0, Number(t.streak) || 0));
  let p = 0.45 + 0.45 * (perf - 1) + 0.04 * Math.max(0, drop) + (losses >= 3 ? 0.25 : 0) + (rec[0]?.place >= 9 ? 0.15 : 0);
  if (rank <= 5 && perf <= 1.1) p *= 0.3;                                             // сильный состав с результатом — бережём
  if (rec.some(h => h.place === 1) && rank <= 10) p *= 0.5;                           // недавний титул
  if (t.v30LastMoveRun != null && run() - t.v30LastMoveRun < 3) p *= 0.35;            // только что перестраивались
  return clamp(p, 0.05, 2.5);
}
function weakLink(t) {
  const st = (t.players || []).filter(p => !p.status || p.status === 'STARTER');
  if (st.length < 5) return null;
  const avg = st.reduce((s, p) => s + pow(p), 0) / st.length;
  // v86: IGL сравнивается с партнёрами по своей шкале (тактика), а сильный капитан не считается слабым звеном
  const iglAvg = st.reduce((s, p) => s + iglPow(p), 0) / st.length;
  const score = p => (p.role === 'IGL' ? iglPow(p) - iglAvg + 3 : pow(p) - avg) + ((+p.form || 100) - 100) * 0.15 - Math.max(0, (+p.age || 25) - 30) * 0.8 - (p.onLoan ? 99 : 0);
  const goodIgl = p => p.role === 'IGL' && ((+p.tacticalIQ || 0) >= 84 || st.every(x => x === p || (+x.tacticalIQ || 0) <= (+p.tacticalIQ || 0)));
  // v84: «лицо клуба» (вес карьеры — CS2Stature) не бывает слабым звеном: спад формы звезды — не повод сажать её на скамейку
  // v89: защищена и звезда (не только франшиза), пока у неё нет явного спада — CS2Stature.shielded
  const prot = p => !!(window.CS2Stature && (window.CS2Stature.shielded ? window.CS2Stature.shielded(p, t) : window.CS2Stature.protectedIn(p, t)));
  // v94: новичок первые market.newcomerWeeks недель не «слабое звено» (раньше — 3 тика рынка ≈ 3 недели: новичков быстро меняли)
  const fresh = p => (p.joinedRun != null && run() - p.joinedRun < 3) || (+p.v94joinedAt > 0 && calNow() - p.v94joinedAt < CF('market.newcomerWeeks', 10) * 7 * DAY);
  const w = st.filter(p => !p.onLoan && !prot(p) && !goodIgl(p) && !fresh(p)).sort((a, b) => score(a) - score(b))[0];
  return w ? { p: w, gap: w.role === 'IGL' ? iglAvg + 3 - iglPow(w) : avg - pow(w), avg } : null;
}
const roleOk = (team, out, role) => !UNIQUE.includes(role) || !(team.players || []).some(p => p !== out && p.role === role);
const roleFits = (out, role) => role === out.role || (!UNIQUE.includes(out.role) && !UNIQUE.includes(role));
/* v89: одна мера усиления для всех источников (академия, свободные агенты, покупка, аренда).
   Сравнение — по позиции уходящего: капитана меняют только на более сильного капитана (тактика), а не на лучшего стрелка.
   Порог: лидер состава (звезда/франшиза/лучший в пятёрке) — +4, ветеран 32+ — +0.5, остальные — +1.5. */
const isLeaderIn = (t, p) => { const tr = window.CS2Stature ? window.CS2Stature.tier(p) : 'regular'; if (tr === 'franchise' || tr === 'star') return true;
  const st = (t.players || []).filter(x => !x.status || x.status === 'STARTER'); return st.length > 0 && st.every(x => x === p || pow(x) <= pow(p)); };
const CF = (k, d) => { try { return window.CS2Config ? window.CS2Config.get(k, d) : d; } catch (e) { return d; } };
const needGain = (t, out) => isLeaderIn(t, out) ? CF('roster.needLeader', 4) : (+out.age || 25) >= CF('roster.veteranAge', 32) ? CF('roster.needVeteran', 0.5) : CF('roster.needRegular', 1.5);
const coreGain = (c, out) => val(c, out.role) - val(out) + ((+c.form || 100) - (+out.form || 100)) * 0.05;

/* ------------------------------------------------------------ сделки */
function markProfessionalOrigin(player, team) {
  if (!player || !team || team.isAcademy) return player;
  player.v30ProOrigin = true;
  player.v30LastProTeam = team.name;
  player.v31team = player.v31team || team.name;
  return player;
}
function professionalSource(player) {
  if (!player) return null;
  const nick = lc(player.nick);
  const bench = (M().v30Bench || []).slice().reverse().find(x => lc(x.nick) === nick && x.team);
  const moves = (M().v30Moves || []).slice().reverse().filter(x => lc(x.player) === nick && x.from && x.type !== 'signing');
  const candidates = [player.v30LastProTeam, player.benchFrom, bench?.team, lastTeam(player.nick), player.v31team, player.lastTeam, player.teamName, ...moves.map(x => x.from)];
  for (const name of candidates) {
    if (!name) continue;
    const source = teams.find(t => t && lc(t.name) === lc(name));
    if (source && !source.isAcademy) return source;
  }
  return null;
}
function academyCanSign(player) {
  if (!player || player.v30ProOrigin === true) return false;
  if ((Number(player.age) || 25) > 21) return false; // v84: академия — только молодёжь до 21 года
  const source = professionalSource(player);
  if (source) {
    // Backfill old save data immediately, so subsequent markets stay deterministic.
    player.v30ProOrigin = true;
    player.v30LastProTeam = source.name;
    return false;
  }
  return true;
}
window.v30AcademyCanSign = academyCanSign;
window.v30ProfessionalSource = professionalSource;
// Recover professional origin from old saves and remove players accidentally placed in academies.
(function migrateProFreeAgents(){
  try {
    // Любой игрок, уже выступавший за основную профессиональную команду,
    // сохраняет этот статус даже после увольнения/перехода в другой клуб.
    let tagged = false;
    teams.filter(t => t && !t.isAcademy).forEach(t => (t.players || []).forEach(p => {
      if (p && (p.v30ProOrigin !== true || p.v30LastProTeam !== t.name)) tagged = true;
      markProfessionalOrigin(p, t);
    }));
    (transferState.freeAgents || []).forEach(p => {
      if (!p || p.v30ProOrigin === true) return;
      const source = professionalSource(p);
      if (source) { p.v30ProOrigin = true; p.v30LastProTeam = source.name; }
    });
    let removed = 0;
    teams.filter(t => t?.isAcademy && Array.isArray(t.players)).forEach(ac => {
      const keep = [];
      ac.players.forEach(p => {
        const source = professionalSource(p);
        if (p?.v30ProOrigin === true || source) {
          if (source) { p.v30ProOrigin = true; p.v30LastProTeam = source.name; }
          p.status = 'BENCH'; p.benchFrom = source?.name || p.v30LastProTeam || p.v31team || 'Профессиональная команда';
          delete p.reservedFor;
          if (!(transferState.freeAgents || []).some(x => lc(x.nick) === lc(p.nick))) transferState.freeAgents.push(p);
          removed++;
        } else keep.push(p);
      });
      if (keep.length !== ac.players.length) { ac.players = keep; try { if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(ac); } catch(e) {} }
    });
    if ((removed || tagged) && typeof saveTeams === 'function') saveTeams();
    if (removed) console.info('[v50] removed professional-origin players from academies:', removed);
  } catch (e) { console.warn('[v48] academy roster migration', e); }
})();
function bench(team, out, reason) {
  markProfessionalOrigin(out, team);
  out.status = 'BENCH'; out.benchFrom = team.name; delete out.reservedFor;
  transferState.freeAgents.push(out);
  M().v30Bench.push({ nick: out.nick, team: team.name, since: run() });
  emit('bench', { player: out.nick, role: out.role, from: team.name, to: 'Скамейка', reason });
}
// v95: смена поколений — клуб вне топ-12 ценит потенциал молодого игрока, ветеран после 30 стоит чуть меньше (CS2Gen)
const ageBonus = (team, p) => { try { return window.CS2Gen ? window.CS2Gen.ageBonus(team, p) : 0; } catch (e) { return 0; } };
function findFA(team, out) {
  const pool = transferState.freeAgents || [];
  let best = null, bs = 3.5;
  pool.forEach((p, i) => {
    if (!p || p.reservedFor || onRoster(p.nick) || p.onLoan) return;
    // Академия не должна забирать освободившегося игрока из профессионального состава.
    // Молодые игроки из других академий и свободные агенты по-прежнему доступны.
    if (team.isAcademy && !academyCanSign(p)) return;
    const fit = typeof teamIdentityFit === 'function' ? teamIdentityFit(team, p) : 1; if (fit < 0.55) return;
    if (!roleFits(out, p.role) || !roleOk(team, out, p.role)) return;
    if (p.benchFrom === team.name) return;
    if (window.CS2Stature && !team.isAcademy && !window.CS2Stature.canJoin(p, team, null)) return; // звезда без клуба ждёт предложения топ-команды
    if (window.CS2Expect && !team.isAcademy && !window.CS2Expect.evaluate(p, null, team, { out }).accept) return;   // v91: роль, игровое время
    const gain = val(p, out.role) - val(out) + ((+p.form || 100) - (+out.form || 100)) * 0.1 + (fit - 0.7) * 3 + ageBonus(team, p) - ageBonus(team, out);
    if (gain > bs) { bs = gain; best = i; }
  });
  if (best == null) return null;
  return { src: 'fa', p: pool[best], idx: best, score: bs, gain: coreGain(pool[best], out) };
}
// v90: все изменения состава — через Roster Engine (проверки, журнал, целостность)
const RUN = (op, fn) => (window.CS2Roster ? window.CS2Roster.run(op, fn) : fn());
function signFA(team, out, why, found) {
  const f = found || findFA(team, out); if (!f) return false;
  return RUN({ kind: 'fa', team, out, incoming: f.p, reason: why }, () => signFAImpl(team, out, why, f));
}
function signFAImpl(team, out, why, found) {
  const f = found || findFA(team, out); if (!f) return false;
  const pool = transferState.freeAgents || [], best = pool.indexOf(f.p), bs = f.score; if (best < 0) return false;
  const fa = pool.splice(best, 1)[0], np = clone(fa), from = fa.benchFrom || lastTeam(fa.nick) || 'Свободный агент';
  Object.assign(np, { status: 'STARTER', joinedRun: run(), morale: clamp((+np.morale || 85) + 5, 40, 100) }); delete np.benchFrom; delete np.reservedFor; newContract(np);
  const idx = team.players.indexOf(out); team.players[idx] = np;
  M().v30Bench = M().v30Bench.filter(b => lc(b.nick) !== lc(np.nick));
  bench(team, out, `в запасе: ${(window.CS2OutWhy && window.CS2OutWhy(team, out, np)) || 'в состав подписан ' + np.nick}`);
  try { ensurePlayerLayer(team); } catch (e) {}
  team.rosterLastChange = { type: 'IN', player: np.nick, from, reason: why };
  team.v30LastMoveRun = run();
  const w2 = String(why || '').startsWith(out.nick + ' ') ? String(why).slice(out.nick.length + 1) : why; // v88: причина подписания — про того, кого заменили
  emit('signing', { player: np.nick, role: np.role, from, to: team.name, out: out.nick, reason: w2 ? `замена ${out.nick}: ${w2}` : `замена ${out.nick}`, gain: Math.round(bs * 10) / 10 });
  return true;
}
function lastTeam(nick) { const key = lc(nick); const m = (M().v30Moves || []).find(x => lc(x.player) === key && x.from && x.type !== 'signing'); return m ? m.from : null; }
// v89: воспитанник оценивается по позиции уходящего (капитан — по тактике) и с тем же порогом усиления, что и
// остальные кандидаты. Раньше брали сильнейшего по общей силе, а молодому хватало +0.5 — и академия выигрывала
// у более сильного свободного агента только потому, что её ветка проверялась первой.
function findAcademy(team, w) {
  const ac = academyFor(team); if (!ac || !w) return null;
  const cand = (ac.players || []).filter(p => !p.onLoan && roleFits(w.p, p.role) && roleOk(team, w.p, p.role) && fitOf(team, p) >= 0.55)
    .sort((a, b) => val(b, w.p.role) - val(a, w.p.role))[0];
  if (!cand) return null;
  const gain = coreGain(cand, w.p);
  if (gain < needGain(team, w.p)) return null;
  return { src: 'academy', p: cand, ac, gain };
}
function promote(team, why, found) {
  const w = weakLink(team); if (!w) return false;
  const f = found || findAcademy(team, w); if (!f) return false;
  return RUN({ kind: 'academy', team, out: w.p, incoming: f.p, academy: f.ac, reason: why }, () => promoteImpl(team, why, f));
}
function promoteImpl(team, why, found) {
  const w = weakLink(team); if (!w) return false;
  const f = found || findAcademy(team, w); if (!f) return false;
  const ac = f.ac, cand = f.p; if (!(ac.players || []).includes(cand)) return false;
  let rep = null; try { rep = findCompatibleFreeAgent(ac, cand); } catch (e) {}
  if (!rep) return false;
  const repP = clone(rep.p); transferState.freeAgents.splice(rep.idx, 1); repP.status = 'STARTER'; delete repP.reservedFor; newContract(repP, 1);
  ac.players[ac.players.indexOf(cand)] = repP;
  const np = clone(cand); np.status = 'STARTER'; np.joinedRun = run(); newContract(np, 2 + Math.floor(rnd() * 2));
  np.academyGrad = team.name; np.academyFrom = ac.name;   // v93: воспитанник академии клуба
  team.players[team.players.indexOf(w.p)] = np;
  bench(team, w.p, `в запасе: ${(window.CS2OutWhy && window.CS2OutWhy(team, w.p, np)) || 'в основу поднят воспитанник академии ' + np.nick}`);
  try { ensurePlayerLayer(team); ensurePlayerLayer(ac); } catch (e) {}
  team.v30LastMoveRun = run();
  emit('promotion', { player: np.nick, role: np.role, from: ac.name, to: team.name, out: w.p.nick, age: np.age, reason: why || 'лучший игрок академии готов к основе' });
  emit('signing', { player: repP.nick, role: repP.role, from: 'Свободный агент', to: ac.name, reason: `замена ушедшему в основу ${np.nick}`, quiet: true });
  return true;
}
function findLoan(team, w) {
  if (!w) return null;
  const busy = busyTeams(), need = needGain(team, w.p);
  const cands = [];
  teams.filter(a => a.isAcademy && !busy.has(a.name) && (a.academyParent || a.parentTeam || ACAD_PARENT[a.name]) !== team.name).forEach(a => (a.players || []).forEach(p => {
    if (p.onLoan || (+p.age || 25) > 22 || !roleFits(w.p, p.role) || !roleOk(team, w.p, p.role)) return;
    // v114: два лучших игрока академии и таланты с потенциалом 86+ — резерв своего клуба, в чужую аренду не уходят
    const best2 = (a.players || []).filter(Boolean).slice().sort((x, y) => pow(y) - pow(x)).slice(0, 2);
    if (best2.includes(p) || (+p.pot || 0) >= 86) return;
    if (fitOf(team, p) < 0.55) return;   // v86: язык общения
    const g = coreGain(p, w.p); if (g >= need) cands.push({ a, p, g });   // v89: по позиции (капитан — по тактике)
  }));
  const c = cands.sort((x, y) => y.g - x.g)[0]; if (!c) return null;
  return { src: 'loan', a: c.a, p: c.p, gain: c.g };
}
function loan(team, why, found) {
  const w = weakLink(team); if (!w) return false;
  const c = found || findLoan(team, w); if (!c) return false;
  return RUN({ kind: 'loan', team, out: w.p, incoming: c.p, academy: c.a, reason: why }, () => loanImpl(team, why, c));
}
function loanImpl(team, why, found) {
  const w = weakLink(team); if (!w) return false;
  const c = found || findLoan(team, w); if (!c || !(c.a.players || []).includes(c.p)) return false;
  let rep = null; try { rep = findCompatibleFreeAgent(c.a, c.p); } catch (e) {}
  if (!rep) return false;
  const repP = clone(rep.p); transferState.freeAgents.splice(rep.idx, 1); repP.status = 'STARTER'; delete repP.reservedFor; newContract(repP, 1);
  c.a.players[c.a.players.indexOf(c.p)] = repP;
  const np = clone(c.p); np.status = 'STARTER'; np.onLoan = c.a.name; np.joinedRun = run();
  team.players[team.players.indexOf(w.p)] = np;
  bench(team, w.p, `в запасе: ${(window.CS2OutWhy && window.CS2OutWhy(team, w.p, np)) || 'в состав взят в аренду ' + np.nick}`);
  M().v30Loans.push({ nick: np.nick, from: c.a.name, to: team.name, until: run() + 3 + Math.floor(rnd() * 3), repl: repP.nick });
  try { ensurePlayerLayer(team); ensurePlayerLayer(c.a); } catch (e) {}
  team.v30LastMoveRun = run();
  emit('loan', { player: np.nick, role: np.role, from: c.a.name, to: team.name, out: w.p.nick, age: np.age, reason: why || 'нужна свежая кровь в составе' });
  return true;
}
/* v131: продажа талантов в топ-30. Раньше игроки академий почти никогда не уходили в сильные клубы: свои клубы
   поднимали воспитанника только при большом усилении, чужие брали лишь в аренду (и не лучших), а «лишних» академия
   выгоняла в свободные агенты — их подбирали слабые команды. Теперь клуб из топ-30 со слабым звеном может купить
   готового таланта из любой академии (свой клуб — в приоритете); деньги получает организация академии. */
const parentOfAcademy = ac => ac && (ac.academyParent || ac.parentTeam || ACAD_PARENT[ac.name]) || '';
const money131 = v => '$' + (Math.round(v / 10000) / 100).toFixed(2) + ' млн';
function topBuyerFor(p, srcName, kind) {
  const busy = busyTeams(), parent = srcName ? parentOfAcademy(teams.find(t => t.name === srcName)) : '';
  let best = null;
  pro().filter(t => t.name !== srcName && rankOf(t) <= 30 && !busy.has(t.name) && canChange(t)).forEach(t => {
    try { const V = window.V31; if (V && V.managed() === t.name && !V.auto('market')) return; } catch (e) {}
    const w = weakLink(t); if (!w || !roleFits(w.p, p.role) || !roleOk(t, w.p, p.role) || fitOf(t, p) < 0.55) return;
    const g = coreGain(p, w.p); if (g < needGain(t, w.p)) return;
    try { if (window.V31 && window.V31.org(t.name).budget < (window.V31.valueOf ? window.V31.valueOf(p) : 0)) return; } catch (e) {}
    const sc = g + (t.name === parent ? 3 : 0) + (31 - rankOf(t)) * 0.03;
    if (!best || sc > best.sc) best = { t, w, g, sc };
  });
  return best;
}
function sellTalentImpl(ac, p, b, kind) {
  const buyer = b.t, w = weakLink(buyer); if (!w || w.p !== b.w.p) return false;
  if (ac && !(ac.players || []).includes(p)) return false;
  if (ac) { let rep = null; try { rep = findCompatibleFreeAgent(ac, p); } catch (e) {} if (!rep) return false;
    const repP = clone(rep.p); transferState.freeAgents.splice(rep.idx, 1); repP.status = 'STARTER'; delete repP.reservedFor; newContract(repP, 1);
    ac.players[ac.players.indexOf(p)] = repP;
    emit('signing', { player: repP.nick, role: repP.role, from: 'Свободный агент', to: ac.name, reason: `замена проданному ${p.nick}`, quiet: true }); }
  else { const i = (transferState.freeAgents || []).indexOf(p); if (i >= 0) transferState.freeAgents.splice(i, 1); }
  const np = clone(p); np.status = 'STARTER'; np.joinedRun = run(); delete np.benchFrom; delete np.reservedFor; newContract(np, 3);
  if (ac) { np.academyFrom = ac.name; if (parentOfAcademy(ac) === buyer.name) np.academyGrad = buyer.name; }
  buyer.players[buyer.players.indexOf(w.p)] = np;
  bench(buyer, w.p, `в запасе: ${(window.CS2OutWhy && window.CS2OutWhy(buyer, w.p, np)) || 'в состав куплен ' + np.nick}`);
  let fee = 0; try { const V = window.V31; if (V) { fee = Math.round((V.valueOf ? V.valueOf(np) : 300000) / 10000) * 10000; const seller = ac ? (parentOfAcademy(ac) || ac.name) : (p.v131SellerOrg || '');
    V.book(buyer.name, -fee, 'trans', `Покупка ${np.nick}${ac ? ' из ' + ac.name : ''}`); if (seller) V.book(seller, fee, 'trans', `Продажа ${np.nick} в ${buyer.name}`); } } catch (e) {}
  try { ensurePlayerLayer(buyer); if (ac) ensurePlayerLayer(ac); } catch (e) {}
  buyer.v30LastMoveRun = run(); noteChange(buyer);
  emit('transfer', { player: np.nick, role: np.role, from: ac ? ac.name : (p.v131SellerOrg ? `${p.v131SellerOrg}: молодёжная программа` : 'Свободный агент'), to: buyer.name, out: w.p.nick,
    reason: `талант ${ac ? 'академии ' + ac.name : 'молодёжной программы'} — продан${fee ? ' за ' + money131(fee) : ''}`, window: kind === 'big' ? 'post-major' : 'mid' });
  return true;
}
function sellTalent(ac, p, b, kind) {
  return RUN({ kind: 'buy', team: b.t, from: ac || null, out: b.w.p, incoming: p, fee: 1, reason: 'покупка таланта академии' }, () => sellTalentImpl(ac, p, b, kind));
}
// раз в окно: готовые таланты академий (19+ лет или потенциал 84+) предлагаются клубам топ-30
function sellAcademyTalents(kind, cap) {
  let n = 0; const busy = busyTeams();
  teams.filter(a => a.isAcademy && !busy.has(a.name)).forEach(ac => {
    if (n >= cap) return;
    const cands = (ac.players || []).filter(p => p && !p.onLoan && ((+p.age || 0) >= 19 || (+p.pot || 0) >= 84)).sort((x, y) => val(y) - val(x));
    for (const p of cands) { const b = topBuyerFor(p, ac.name, kind); if (b && sellTalent(ac, p, b, kind)) { n++; break; } }
  });
  return n;
}
window.v131SellTalent = (p, sellerOrg) => { try { p.v131SellerOrg = sellerOrg || ''; const b = topBuyerFor(p, null, 'mid'); if (!b) return null;
  if (!(transferState.freeAgents || []).includes(p)) transferState.freeAgents.push(p); return sellTalent(null, p, b, 'mid') ? b.t.name : null; } catch (e) { return null; } };
function returnLoans() {
  const s = M(), busy = busyTeams(); let n = 0;
  s.v30Loans = s.v30Loans.filter(l => {
    if (run() < l.until) return true;
    const to = teams.find(t => t.name === l.to), ac = teams.find(t => t.name === l.from);
    if (!to || !ac) return false;
    if (busy.has(to.name) || busy.has(ac.name)) return true;
    const p = (to.players || []).find(x => lc(x.nick) === lc(l.nick)); if (!p) return false;
    // клуб может выкупить арендованного, если он лучше прежнего игрока
    const prevBack = (transferState.freeAgents || []).findIndex(x => x.benchFrom === to.name && !onRoster(x.nick));
    const keep = rnd() < 0.3 && pow(p) >= 80;
    if (keep) { delete p.onLoan; newContract(p, 2); const r = ac.players.find(x => lc(x.nick) === lc(l.repl)); emit('transfer', { player: p.nick, role: p.role, from: ac.name, to: to.name, reason: 'выкуп после удачной аренды', buyout: true, window: 'mid' });
      try { window.CS2Roster && window.CS2Roster.commit({ kind: 'loan-buyout', team: to, from: ac, incoming: p, reason: 'выкуп после удачной аренды', actor: 'ai' }, null, null); } catch (e) {}
      return false; }
    // вернуть: в клуб — прежний игрок со скамейки или свободный агент; в академию — арендованный
    let back = null;
    if (prevBack >= 0) back = transferState.freeAgents.splice(prevBack, 1)[0];
    else { try { const fa = findCompatibleFreeAgent(to, p); if (fa) back = transferState.freeAgents.splice(fa.idx, 1)[0]; } catch (e) {} }
    if (!back) return true;
    back = clone(back); back.status = 'STARTER'; delete back.benchFrom; delete back.reservedFor;
    to.players[to.players.indexOf(p)] = back;
    const r = ac.players.findIndex(x => lc(x.nick) === lc(l.repl));
    const home = clone(p); delete home.onLoan; home.status = 'STARTER';
    if (r >= 0) { const out = ac.players[r]; ac.players[r] = home; out.status = 'FREE AGENT'; transferState.freeAgents.push(out); }
    else { const w = weakLink(ac); if (w) { ac.players[ac.players.indexOf(w.p)] = home; w.p.status = 'FREE AGENT'; transferState.freeAgents.push(w.p); } }
    M().v30Bench = M().v30Bench.filter(b => lc(b.nick) !== lc(back.nick));
    try { ensurePlayerLayer(to); ensurePlayerLayer(ac); } catch (e) {}
    emit('loan-return', { player: home.nick, role: home.role, from: to.name, to: ac.name, back: back.nick, reason: 'аренда завершена' }); n++;
    try { window.CS2Roster && window.CS2Roster.commit({ kind: 'loan-return', team: to, from: ac, incoming: back, out: home, reason: 'аренда завершена', actor: 'system' }, null, null); } catch (e) {}
    return false;
  });
  return n;
}
const C133 = (k, d) => (window.CS2Config ? window.CS2Config.get(k, d) : d);
function releaseBench() { // скамейка → свободные агенты через 2 тика
  const s = M(); let n = 0;
  // v133: каждый клуб ИИ держит одного запасного — лучшего со своей скамейки. Раньше скамейка через два тика рынка
  // целиком уходила в свободные агенты: у всех команд топ-30 не было ни одного запасного, и на болезнь/травму
  // в состав брали случайного свободного агента. Лишние запасные по-прежнему отпускаются; клуб в долгах не держит никого.
  const keep = {};
  s.v30Bench.forEach(b => {
    const p = (transferState.freeAgents || []).find(x => lc(x.nick) === lc(b.nick)), t = teams.find(x => x && x.name === b.team);
    if (!p || !t || t.isAcademy || onRoster(b.nick) || p.status === 'FREE AGENT') return;
    try { if (window.V31 && V31.isManaged && V31.isManaged(t.name)) return; } catch (e) {}
    try { if ((Number(window.V31.org(t.name).budget) || 0) < 0) return; } catch (e) {}
    if (!keep[b.team] || pow(p) > pow(keep[b.team])) keep[b.team] = p;
  });
  s.v30Bench = s.v30Bench.filter(b => {
    const p = (transferState.freeAgents || []).find(x => lc(x.nick) === lc(b.nick));
    if (!p || onRoster(b.nick)) return false;
    if (keep[b.team] === p) { p.status = 'BENCH'; p.benchFrom = b.team; p.v133Sub = b.team; p.reservedFor = b.team; return true; }
    if (p.v133Sub === b.team) { delete p.v133Sub; if (p.reservedFor === b.team) delete p.reservedFor; }
    if (run() - b.since < 2) return true;
    // v131: молодой игрок с запасом роста — не выбрасываем сразу: сначала предложение клубам топ-30, иначе ждём дольше
    const young = (+p.age || 25) <= 21 && (+p.pot || 0) - pow(p) >= 3;
    if (young && run() - b.since < 8) { const b2 = topBuyerFor(p, b.team, 'mid'); if (b2 && sellTalent(null, p, b2, 'mid')) { n++; return false; } return true; }
    p.status = 'FREE AGENT'; delete p.benchFrom; delete p.reservedFor; p.v84FaSince = calNow(); p.v84FaTeam = b.team;
    emit('release', { player: p.nick, role: p.role, from: b.team, to: 'Свободный агент', reason: 'контракт расторгнут после скамейки' });
    n++; return false;
  });
  // v84: ветеран без клуба завершает карьеру не сразу после скамейки (раньше — 50% у всех 33+), а только после
  // долгого поиска команды: 36+ — через 4 месяца, 34–35 — через 8, 32–33 — через год; сильные игроки ждут дольше.
  (transferState.freeAgents || []).slice().forEach(p => {
    if (!p || !p.v84FaSince || p.reservedFor || onRoster(p.nick)) return;
    const age = +p.age || 25; if (age < 32) return;
    let wait = (age >= 36 ? 60 : age >= 34 ? 120 : 180) * DAY; if (pow(p) >= 80) wait *= 1.5;   // v95: раньше 120/240/365 дней — ветераны годами числились свободными агентами
    if (calNow() - p.v84FaSince < wait) return;
    transferState.freeAgents.splice(transferState.freeAgents.indexOf(p), 1);
    emit('retire', { player: p.nick, team: p.v84FaTeam || p.v30LastProTeam || '—', age, role: p.role, rep: null, fa: true, cc: p.country || '', iq: +p.tacticalIQ || 0 });
  });
  // v133: клуб топ-40 без запасного подписывает шестого игрока — свободного агента своего языка и близкого уровня.
  // Скамейка почти не появлялась сама: при сделках ИИ вытесненный игрок уходит сразу в свободные агенты.
  try {
    const hasSub = new Set((transferState.freeAgents || []).filter(p => p && p.status === 'BENCH' && p.reservedFor).map(p => p.reservedFor));
    let signed = 0;
    pro().filter(t => rankOf(t) <= C133('market.subTopRank', 40)).forEach(t => {
      if (signed >= 4 || hasSub.has(t.name)) return;
      if ((C133('concept.clubs', ['WW Team', 'Without a Roof']) || []).includes(t.name)) return;   // v136: клубы-концепции — без навязанного шестого
      try { if (window.V31 && V31.isManaged && V31.isManaged(t.name)) return; if ((Number(V31.org(t.name).budget) || 0) < 0) return; } catch (e) {}
      const st = (t.players || []).filter(x => x && (!x.status || x.status === 'STARTER')); if (st.length < 5) return;
      const avg = st.reduce((a, x) => a + pow(x), 0) / st.length;
      const pick = (transferState.freeAgents || []).filter(p => p && p.nick && !p.reservedFor && !p.onLoan && p.status !== 'BENCH' && !onRoster(p.nick)
        && fitOf(t, p) >= 0.55 && pow(p) >= avg - C133('market.subGap', 9) && (!window.CS2Stature || window.CS2Stature.canJoin(p, t, null)))
        .sort((a, b) => (pow(b) - Math.max(0, (+b.age || 25) - 27)) - (pow(a) - Math.max(0, (+a.age || 25) - 27)))[0];
      if (!pick) return;
      pick.status = 'BENCH'; pick.benchFrom = t.name; pick.reservedFor = t.name; pick.v133Sub = t.name; delete pick.v84FaSince;
      M().v30Bench.push({ nick: pick.nick, team: t.name, since: run() });
      try { window.CS2Journal && window.CS2Journal.log('ROSTER_CHANGE', { team: t.name, kind: 'sub', actor: 'ai', player: pick.nick, reason: 'запасной игрок (шестой)' }); } catch (e) {}
      hasSub.add(t.name); signed++;
    });
  } catch (e) { console.warn('[v133 subs]', e); }
  // пул свободных агентов не разрастается бесконечно
  const fa = transferState.freeAgents || [];
  // v95: лишние уходят со сцены по интересу рынка, а не по одному уровню (раньше молодые таланты отсеивались первыми)
  const cap = window.CS2Config ? window.CS2Config.get('gen.faCap', 70) : 70;
  const interest = p => pow(p) + ((+p.age || 25) <= 21 ? Math.max(0, (+p.pot || pow(p)) - pow(p)) * 0.6 + 2 : 0) - Math.max(0, (+p.age || 25) - 29);
  // v133: запасные клубов (зарезервированы за клубом) из пула не вычёркиваются
  if (fa.length > cap) { fa.sort((a, b) => (b && b.reservedFor ? 1e6 : 0) + interest(b) - (a && a.reservedFor ? 1e6 : 0) - interest(a)); fa.length = Math.max(cap, fa.filter(p => p && p.reservedFor).length); }
  return n;
}
function findBuy(team, w) {
  if (!w) return null;
  const rank = rankOf(team), busy = busyTeams();
  let best = null, bs = 4;
  pro().forEach(from => {
    if (from === team || busy.has(from.name)) return;
    const fr = rankOf(from); if (fr < rank - 3) return;                                // у сильных не покупаем
    (from.players || []).forEach(p => {
      if (p.status && p.status !== 'STARTER') return; if (p.onLoan) return;
      if (!roleFits(w.p, p.role) || !roleOk(team, w.p, p.role)) return;
      if (p.joinedRun != null && run() - p.joinedRun < 3) return;
      const fit = typeof teamIdentityFit === 'function' ? teamIdentityFit(team, p) : 1; if (fit < 0.6) return;
      const expiring = (+p.contractUntil || 99) <= (seasonState.currentSeason || 1);
      const gain = val(p, w.p.role) - val(w.p) + fit * 2 + (expiring ? 1.5 : 0) - (fr <= 8 ? 1.5 : 0) - (expiring ? 0 : 2.5); // действующий контракт — выкуп дорогой, нужен заметный плюс
      if (window.V33Prestige && V33Prestige.refuses(p, from, team)) return;
      if (window.CS2Stature && (window.CS2Stature.protectedIn(p, from) || !window.CS2Stature.canJoin(p, team, from))) return;   // звезда не идёт в куда менее престижный клуб
      if (window.CS2Expect && !window.CS2Expect.evaluate(p, from, team, { out: w.p }).accept) return;   // v91: агент заранее сказал, что игрок откажет
      if (coreGain(p, w.p) < needGain(team, w.p)) return;   // v89: тот же порог усиления, что у остальных источников
      if (gain > bs) { bs = gain; best = { from, p, expiring }; }
    });
  });
  if (!best) return null;
  return { src: 'buy', from: best.from, p: best.p, expiring: best.expiring, gain: coreGain(best.p, w.p) };
}
function buy(team, why, allowNego, found) {
  const w = weakLink(team); if (!w) return false;
  const best = found || findBuy(team, w); if (!best) return false;
  const star = typeof isStarPlayer === 'function' && isStarPlayer(best.p);
  if (allowNego && star && rnd() < 0.7) return startNego(best.p, best.from, team, why);
  const ok = applyPlayerTransfer(best.from, team, best.p, why + (best.expiring ? ' (истекающий контракт)' : ''));
  if (ok) { const np = team.players.find(x => lc(x.nick) === lc(best.p.nick)); if (np) newContract(np, 2 + Math.floor(rnd() * 2)); team.v30LastMoveRun = run(); }
  return ok;
}
/* ---- переговоры и слухи ---- */
function startNego(p, from, to, why) {
  const s = M(); if (s.v30Nego.some(n => n.player === p.nick)) return false;
  // v86: слух публикуется только о сделке, которая в принципе возможна (язык, роль, звёздный статус)
  if (fitOf(to, p) < 0.6) return false;
  if (s.v30Nego.some(n => n.to === to.name)) return false;   // одна команда — одни переговоры за раз
  const n = { id: 'ng' + run() + (h32(p.nick + to.name) % 1e4).toString(36), player: p.nick, from: from.name, to: to.name, role: p.role, run: run(), why, odds: clamp(0.35 + (rankOf(from) - rankOf(to)) * 0.03 + (window.V33Prestige ? V33Prestige.oddsAdj(from.name, to.name) : 0), 0.15, 0.85) };
  s.v30Nego.push(n);
  emit('negotiation', { ...n, reason: why });
  return true;
}
function progressNego() {
  const s = M(), busy = busyTeams(); let n = 0;
  s.v30Nego = s.v30Nego.filter(x => {
    if (run() - x.run < 1) return true;
    const from = teams.find(t => t.name === x.from), to = teams.find(t => t.name === x.to);
    const p = from?.players.find(q => q.nick === x.player);
    if (!from || !to || !p) { emit('rumor-denied', { ...x, why: 'игрок сменил команду иначе' }); return false; }
    if (busy.has(from.name) || busy.has(to.name)) return true;
    if (rnd() < x.odds) {
      const old = window.playerWillAccept; window.playerWillAccept = () => true;
      // v86: договорённость уже достигнута — ворота «поиска игроков» v34 её не блокируют (иначе слух висел и тихо умирал)
      const prevForce = window.__v34Force; window.__v34Force = true; window.__v86Nego = x.id;
      let ok = false; try { ok = applyPlayerTransfer(from, to, p, x.why || 'усиление состава'); } finally { window.playerWillAccept = old; window.__v34Force = prevForce; window.__v86Nego = null; }
      if (ok) { const np = to.players.find(q => q.nick === x.player); if (np) newContract(np, 3); to.v30LastMoveRun = run(); n++; return false; }
      emit('rumor-denied', { ...x, why: fitOf(to, p) < 0.6 ? 'игрок не подходит по языку общения в команде' : 'клубы не нашли место в составе под эту роль' }); return false;
    }
    if (run() - x.run >= 3 || rnd() < 0.25) { emit('rumor-denied', { ...x, why: pick(['стороны не сошлись в сумме выкупа', 'игрок решил остаться', 'клуб отказался отпускать игрока по ходу сезона', 'переговоры зашли в тупик']) }); return false; }
    return true;
  });
  return n;
}
const pick = a => a[Math.floor(rnd() * a.length)];
/* ---- тренеры ---- */
const CO_A = ['Zon', 'Kel', 'Rav', 'Mor', 'Tav', 'Bri', 'Ste', 'Gul', 'Fen', 'Lio', 'Nad', 'Ork', 'Vas', 'Dem', 'Hel'], CO_B = ['ic', 'ko', 'ex', 'ard', 'iss', 'om', 'ty', 'ven', 'lo', 'ar'];
function coachChange(team, why) {
  const old = team.coach?.name || 'coach';
  if (team.coach?.changedAtSeason === seasonState.currentSeason) return false;
  // v84: тренер — с рынка тренеров (реальные тренеры без клуба, бывшие игроки); выдуманное имя — только при пустом пуле
  if (window.CS2Coaches) { const r = window.CS2Coaches.change(team, why); if (r) team.v30LastMoveRun = run(); return r; }
  const used = new Set(teams.map(t => t.coach?.name));
  let nm = null; for (let i = 0; i < 30 && !nm; i++) { const c = CO_A[h32(team.name + i + run()) % CO_A.length] + CO_B[h32(i + team.name) % CO_B.length]; if (!used.has(c)) nm = c; }
  if (!nm) return false;
  team.coach = { name: nm, flag: team.coach?.flag || '', changedAtSeason: seasonState.currentSeason };
  team.rosterLastChange = { type: 'COACH', player: nm, from: old, reason: why };
  team.v30LastMoveRun = run();
  try { transferLog(`🧠 ${team.name} сменили тренера: ${old} → ${nm} (${why}).`, 'coach'); } catch (e) {}
  emit('coach', { team: team.name, from: old, to: nm, reason: why });
  return true;
}
/* ---- амбиции звёзд ---- */
function ambition(limit) {
  let n = 0;
  const all = pro().flatMap(t => (t.players || []).map(p => ({ t, p }))).sort((a, b) => pow(b.p) - pow(a.p)), cut = pow(all[Math.floor(all.length * 0.12)]?.p || {});
  all.filter(x => pow(x.p) >= cut && rankOf(x.t) >= 12 && !x.p.onLoan && !(x.p.joinedRun != null && run() - x.p.joinedRun < 4)).forEach(x => {
    if (n >= limit || rnd() > 0.08) return;
    const buyers = pro().filter(b => rankOf(b) <= 10 && rankOf(b) < rankOf(x.t) - 5).filter(b => { const w = weakLink(b); return w && fitOf(b, x.p) >= 0.6 && roleFits(w.p, x.p.role) && roleOk(b, w.p, x.p.role) && pow(x.p) > pow(w.p) + 1; });
    const b = buyers[Math.floor(rnd() * buyers.length)];
    if (b && startNego(x.p, x.t, b, `${x.p.nick} хочет играть за команду из топ-10`)) n++;
  });
  return n;
}
/* ---- межсезонье: контракты ---- */
function contracts() {
  const s = seasonState.currentSeason || 1; let ext = 0, rel = 0;
  pro().forEach(t => (t.players || []).slice().forEach(p => {
    if ((+p.contractUntil || 99) >= s) return;
    const rank = rankOf(t), w = weakLink(t), weakest = w && w.p === p;
    if (!weakest || rank <= 8 || rnd() < 0.6 || window.CS2Stature?.protectedIn(p, t) || window.CS2Stature?.shielded?.(p, t)) { newContract(p); if (rank <= 12 && (typeof isStarPlayer === 'function' && isStarPlayer(p))) emit('extension', { player: p.nick, role: p.role, from: t.name, to: t.name, until: p.contractUntil, reason: `новый контракт до сезона ${p.contractUntil}` }); ext++; } // рядовые продления не пишем в журнал — он для заметных событий
    else if (signFA(t, p, `контракт ${p.nick} истёк`)) rel++;
    else newContract(p, 1);
  }));
  return { ext, rel };
}

/* ------------------------------------------------------------ v89: лучший кандидат из всех источников
   Академия, свободные агенты, игроки других клубов и аренда сравниваются в одном списке по усилению позиции.
   Раньше порядок веток был случайным (академия — первой с шансом 35%), и выбирался первый подходящий, а не лучший. */
function candidates(t, w) {
  const out = [];
  const add = f => { try { const x = f(); if (x) out.push(x); } catch (e) { console.warn('[v89 market]', e); } };
  add(() => findAcademy(t, w));
  add(() => findFA(t, w.p));
  add(() => findBuy(t, w));
  if (rankOf(t) >= 15) add(() => findLoan(t, w));
  // v91: стратегия клуба выбирает среди кандидатов, прошедших проверки; у «сохранения состава» порог усиления выше
  const CS = window.CS2ClubStrategy;
  if (!CS) return out.sort((a, b) => b.gain - a.gain);
  const strat = CS.of(t), extra = CS.extraNeed(t, strat), need = needGain(t, w.p) + extra;
  candidates.lastStrategy = strat;
  // v94: поправка по опыту рынка — средний чистый итог решений этого типа (CS2MarketLearn), ±market.learnMax
  const L = window.CS2MarketLearn ? window.CS2MarketLearn.bonus : () => 0;
  out.forEach(c => { c.age = Math.round((ageBonus(t, c.p) - ageBonus(t, w.p)) * 10) / 10; });   // v95: потенциал/возраст
  return out.filter(c => c.gain + Math.max(0, c.age) >= need).map(c => { const b = CS.bonus(t, c, strat); c.bonus = b.v; c.bonusWhy = b.why; c.learn = L(c.src); c.score = c.gain + b.v + c.learn + c.age; return c; })
    .sort((a, b) => b.score - a.score);
}
function bestMove(t, w, why, kind) {
  const list = candidates(t, w), tried = [];
  for (const c of list) {
    let ok = false;
    if (c.src === 'academy') ok = promote(t, why, c);
    else if (c.src === 'fa') ok = signFA(t, w.p, why, c);
    else if (c.src === 'buy') ok = buy(t, why, kind !== 'big', c);
    else if (c.src === 'loan') ok = loan(t, why, c);
    tried.push(c);
    if (ok) { bestMove.last = { list, chosen: c, tried }; return true; }
  }
  bestMove.last = { list, chosen: null, tried };
  return false;
}
// v90: решение рынка — в журнал: потребность, рассмотренные кандидаты, выбор и почему отклонены остальные
function logDecision(t, w, why, pr, kind, ok, coach) {
  if (!window.CS2Journal) return;
  const d = bestMove.last || { list: [], chosen: null, tried: [] }, blocks = (window.CS2Roster && window.CS2Roster.lastBlocks) || [];
  const cand = (d.list || []).slice(0, 6).map(c => ({ src: c.src, nick: c.p.nick, from: c.from ? c.from.name : c.ac ? c.ac.name : c.a ? c.a.name : 'FA', gain: Math.round(c.gain * 10) / 10, bonus: c.bonus ? Math.round(c.bonus * 10) / 10 : undefined, bonusWhy: c.bonusWhy && c.bonusWhy.length ? c.bonusWhy : undefined,
    verdict: d.chosen === c ? (ok ? 'выбран' : 'сделка сорвалась') : d.tried.includes(c) ? 'отклонён: ' + (blocks.map(b => b.text).join('; ') || 'сделка не состоялась') : 'не понадобился' }));
  const strat = candidates.lastStrategy || (window.CS2ClubStrategy ? window.CS2ClubStrategy.of(t) : null);
  // v94: тренд клуба за 8 недель до решения — чтобы итог решения не путать с тем, что клуб и так падал/рос
  let trend8 = null; try { const h = (seasonState.v93Eras && seasonState.v93Eras.ranks[t.name]) || []; if (h.length > 8) trend8 = h[8] - h[0]; } catch (e) {}
  window.CS2Journal.log('MARKET_DECISION', { team: t.name, window: kind, pressure: Math.round(pr * 100) / 100, rankAt: rankOf(t), trend8, reason: why, strategy: strat ? { key: strat.key, label: strat.label, why: strat.why } : undefined,
    need: { out: w.p.nick, role: w.p.role, gap: Math.round(w.gap * 10) / 10, age: +w.p.age || null, form: Math.round(+w.p.form || 100) },
    candidates: cand, chosen: coach ? { src: 'coach' } : ok && d.chosen ? { src: d.chosen.src, nick: d.chosen.p.nick, gain: Math.round(d.chosen.gain * 10) / 10 } : null,
    result: coach ? 'смена тренера' : ok ? 'сделка' : cand.length ? 'кандидаты не прошли проверки' : 'подходящих кандидатов нет' });
}

/* ------------------------------------------------------------ тик рынка */
const INTENSITY = { big: 0.26, mid: 0.045, week: 0.012 };   // v31: рынок спокойнее — сделки только по делу
function tick(kind) {
  if (window.__v30MarketOff) return 0;
  ensureContracts(); M();
  transferState.marketRuns = run() + 1;
  if (locked() && kind !== 'big') { returnLoans(); return 0; }
  if (kind === 'big') transferState.v33WindowUntil = calNow() + 7 * DAY;           // окно после Major
  if (kind !== 'big' && !windowOpen()) { let m = releaseBench() + returnLoans(); scanBus(); save(); return m; } // вне окна сделок нет
  const busy = busyTeams(), base = INTENSITY[kind] || 0.05;
  let moves = 0;
  moves += releaseBench(); moves += returnLoans(); moves += progressNego();
  const cap = kind === 'big' ? CF('market.capBig', 6) : kind === 'mid' ? CF('market.capMid', 2) : CF('market.capWeek', 2);   // v91: из CS2Config
  const list = pro().filter(t => !busy.has(t.name)).map(t => ({ t, pr: pressure(t) })).sort((a, b) => b.pr - a.pr);
  let deals = 0;
  for (const { t, pr } of list) {
    if (deals >= cap) break;
    if (!canChange(t)) continue;                                                       // лимит и пауза после прошлых изменений
    try { const V = window.V31; if (V && V.managed() === t.name && !V.auto('market') && window.__v31ForceBuy !== t.name) continue; } catch (e) {}   // v90: составом менеджера занимается менеджер
    if (window.V34Roster && !window.V34Roster.allowSearch(t)) continue;               // v34: только после подтверждённой потребности (состояние «Поиск игроков»)
    // v91: нужда подтверждена Roster AI (несколько недель сигналов) — решение принимается по делу, без второго «кубика».
    // Раньше поверх подтверждённой нужды шёл бросок с шансом ~1.2% в неделю (INTENSITY.week × давление), и за полгода
    // клубы в состоянии «Поиск игроков» не делали ни одной замены. Без Roster AI (старые сохранения) — прежняя схема.
    const confirmed = !!window.V34Roster;
    if (confirmed) { try { const x = window.V34Roster.st(t.name); x.looks = (x.looks || 0) + 1; } catch (e) {} }   // рынок действительно смотрел кандидатов
    if (!confirmed && kind !== 'big' && pr < 0.95) continue;                          // по ходу сезона меняются только команды в кризисе
    if (!confirmed && rnd() > base * pr) continue;
    const w = weakLink(t); if (!w) continue;
    if (window.V34Roster && !window.V34Roster.replaceable(t, w.p)) continue;          // v34: меняют того, на кого указывают сигналы
    if (w.gap < 2.5 && (+w.p.age || 25) < 31 && pr < 1.4) continue;                   // нет явного слабого звена — нет повода
    if (pr < 0.7 && w.gap < 4 && (+w.p.contractUntil || 99) > (seasonState.currentSeason || 1)) continue; // v88: дела идут нормально — состав не трогают
    const why = pr > 1.3 ? (recent(t, 1)[0]?.place >= 9 ? `после провала на ${recent(t, 1)[0].tournament}` : 'серия неудачных турниров') : w.gap > 4 ? `${w.p.nick} заметно уступает партнёрам` : (+w.p.age || 25) >= 31 ? `${w.p.nick} (${w.p.age}) теряет форму` : ((window.CS2OutWhy && window.CS2OutWhy(t, w.p)) || 'усиление состава');
    let ok = false, coach = false;
    if (pr > 1.15 && rnd() < (kind === 'big' ? 0.4 : 0.3)) coach = ok = coachChange(t, why);
    bestMove.last = null; candidates.lastStrategy = null;
    if (!ok) ok = bestMove(t, w, why, kind);
    try { logDecision(t, w, why, pr, kind, ok, coach); } catch (e) {}
    if (ok) { deals++; noteChange(t); }
  }
  // академии тоже живут: подписывают молодых, если кто-то провалился
  // v131: таланты академий — в клубы топ-30 (а не в свободные агенты)
  deals += sellAcademyTalents(kind, kind === 'big' ? 3 : 1);
  // академии тоже живут: ротация — только если у слабого звена нет запаса роста (потенциал исчерпан) или ему 21+, и отставание большое
  teams.filter(a => a.isAcademy && !busy.has(a.name)).forEach(a => { if (deals < cap && rnd() < base * 0.2) { const w = weakLink(a);
    if (!w || w.gap < 5 || ((+w.p.age || 25) < 21 && (+w.p.pot || 0) - pow(w.p) >= 2)) return;
    const b = topBuyerFor(w.p, a.name, kind); if (b && sellTalent(a, w.p, b, kind)) { deals++; return; }
    if (signFA(a, w.p, 'ротация в академии')) deals++; } });
  if (kind === 'big') { window.__v34Force = true; try { deals += ambition(2); } finally { window.__v34Force = false; } }   // запрос игрока об уходе — вынужденное событие
  try { if (typeof window.repairRosters === 'function') window.repairRosters(true); } catch (e) {}
  teams.forEach(t => { try { ensurePlayerLayer(t); } catch (e) {} });
  scanBus(); save();
  return moves + deals;
}
window.v30MarketTick = tick;

/* ------------------------------------------------------------ подключение */
const nextStep = () => seasonState.seasonSchedule?.[seasonState.tournamentIndex] || null;
const prevGate = window.processTransferMarket;
if (typeof prevGate === 'function' && !prevGate.__v30) {
  const g = function (reason) {
    if (reason !== 'tournament_end') return prevGate.apply(this, arguments);
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    if (ct?.isMajor) { const r = prevGate.apply(this, arguments); try { tick('big'); } catch (e) { console.warn('[v30 market]', e); } return r; }
    if (nextStep()?.type === 'major') return prevGate.apply(this, arguments);          // ростер-лок v29 + новость
    try { tick('mid'); } catch (e) { console.warn('[v30 market]', e); }                // вместо «18% случайности»
  };
  g.__v30 = g.__v29 = true; window.processTransferMarket = g; try { processTransferMarket = g; } catch (e) {}
}
// запрет перепродажи игрока в аренде
(() => { const f = window.applyPlayerTransfer; if (typeof f !== 'function' || f.__v30) return;
  const w = function (fromTeam, toTeam, player) {
    if (player?.onLoan) return false;
    if (toTeam?.isAcademy && ((fromTeam && !fromTeam.isAcademy) || player?.v30ProOrigin === true || !!professionalSource(player))) return false;
    return f.apply(this, arguments);
  };
  w.__v30 = true; Object.keys(f).forEach(k => { w[k] = f[k]; }); window.applyPlayerTransfer = w; try { applyPlayerTransfer = w; } catch (e) {} })();
// Игровая неделя → тик рынка. Catch-up идёт по календарю, а не по частоте
// реального setInterval: быстрый пропуск не теряет промежуточные недели.
function syncMarketClock(){
  try {
    const now=calNow(); let last=Number(transferState.v30WeekMs)||0;
    if(!last || now<last){ transferState.v30WeekMs=now; last=now; }
    if(seasonState.v30ContractSeason!==seasonState.currentSeason){
      seasonState.v30ContractSeason=seasonState.currentSeason;
      if(last){ ensureContracts(); const c=contracts(); scanBus(); if(c.ext+c.rel) save(); }
    }
    let processed=0;
    while(now-last>=7*DAY){ last+=7*DAY; transferState.v30WeekMs=last; tick('week'); processed++; }
    return processed;
  } catch(e){ console.warn('[v30 market week]',e); return 0; }
}
window.V30MarketSyncClock=syncMarketClock;
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; syncMarketClock(); }, 2000);
setTimeout(() => { try { ensureContracts(); M(); if (!seasonState.v30ContractSeason) seasonState.v30ContractSeason = seasonState.currentSeason; } catch (e) {} }, 800);
window.v30MarketDebug = { pressure, weakLink, rankOf, busyTeams, locked, contracts, state: () => M(), candidates, bestMove, signFA, returnLoans, canChange, needGain, coreGain, findAcademy, findFA, findBuy, findLoan, promote, loan };
console.info('[v30] трансферный рынок: периодический анализ составов');
})();
