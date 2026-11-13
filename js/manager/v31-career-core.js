(() => {
'use strict';
/* =====================================================================
   v31 · Карьера и управление организацией — ядро
   Все механики работают для ВСЕХ команд по одним правилам: управляемая организация
   (seasonState.favoriteTeam) решает вручную, остальные — тем же AI-правилом автоматически.
   Влияние на симуляцию — только через реальные каналы:
     1) модификатор вероятности раунда в calcMapWinProbability (инстант, пошагово, эфир),
        суммарно ограничен ±0.03 (≈ ±10% к шансу на карту);
     2) характеристики игроков (огневая мощь, клатч, утилити, тактика), форма, мораль, усталость;
     3) рынок: бюджет ограничивает покупки, сделки двигают деньги, характер влияет на переходы.
   Состояние: seasonState.v31 (версия 1). Игроки получают p.pers, p.conf, p.salary, p.pot, p.v31since.
   ===================================================================== */
if (typeof teams === 'undefined' || typeof seasonState === 'undefined' || typeof transferState === 'undefined') return;
const DAY = 864e5, WEEK = 7 * DAY;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const u01 = s => (h32(s) % 100000) / 100000;                         // детерминированная «случайность» по ключу
const calNow = () => Number(seasonState.calendar?.currentMs) || Date.now();
const season = () => Number(seasonState.currentSeason) || 1;
const pro = () => teams.filter(t => !t.isAcademy);
const byName = n => teams.find(t => t.name === n) || null;
const rankOf = n => pro().sort((a, b) => b.pts - a.pts).findIndex(t => t.name === n) + 1;
const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
const emit = (type, data) => { try { window.v29Emit && window.v29Emit(type, data); } catch (e) {} };
const money = v => (v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US');

/* ------------------------------------------------------------ состояние и миграция */
function S() {
  const st = seasonState;
  if (!st.v31 || typeof st.v31 !== 'object') st.v31 = {};
  const c = st.v31;
  if (c.v !== 1) { Object.assign(c, { v: 1 }); }
  c.mode = c.mode || 'standard';
  c.auto = Object.assign({ training: false, scouting: false, market: false, finance: true, events: false }, c.auto || {});
  c.orgs = c.orgs || {}; c.events = Array.isArray(c.events) ? c.events : []; c.evSeq = c.evSeq || 0; c.evKeys = c.evKeys || {};
  c.career = c.career || { log: [], ach: {} }; c.career.log = c.career.log || []; c.career.ach = c.career.ach || {};
  c.rivals = c.rivals || { list: [], at: 0 };
  return c;
}
const managed = () => (seasonState.v31 && seasonState.v31.career && seasonState.v31.career.team) || ''; // свой ключ: v16 стирает favoriteTeam при каждой загрузке
const isManaged = n => !!n && n === managed();
// режим автоматизации: что делает AI для управляемой команды
const MODES = {
  quick: { training: true, scouting: true, market: true, finance: true, events: true },
  standard: { training: false, scouting: false, market: false, finance: true, events: false },
  hardcore: { training: false, scouting: false, market: false, finance: false, events: false }
};
const auto = k => { const c = S(); return !managed() || !!c.auto[k]; };

/* ------------------------------------------------------------ личность игрока */
const TRAITS = ['amb', 'prof', 'loy', 'lead', 'press', 'comm'];
const TRAIT_L = { amb: 'Амбиции', prof: 'Профессионализм', loy: 'Лояльность', lead: 'Лидерство', press: 'Стрессоустойчивость', comm: 'Коммуникация' };
function ensurePerson(p) {
  if (!p) return p;
  if (!p.pers) { p.pers = {}; TRAITS.forEach(k => { p.pers[k] = 4 + Math.round(u01(k + '|' + p.nick) * 15); }); if (p.role === 'IGL') p.pers.lead = Math.max(p.pers.lead, 13); }
  if (!Number.isFinite(+p.conf)) p.conf = 60;
  const age = +p.age || 24;
  if (!Number.isFinite(+p.pot)) p.pot = Math.round(clamp(pow(p) + Math.max(0, 24 - age) * 1.6 + (u01('pot|' + p.nick) - .4) * 8, pow(p), 97) * 10) / 10;
  if (!Number.isFinite(+p.salary) || p.v31sv !== 6) { p.salary = salaryOf(p, teams.find(t => (t.players || []).includes(p)) || null); p.v31sv = 6; }   // v137: пересчёт по шкале со статусом   // v92: пересчёт по новой шкале
  return p;
}
function wageTier(name) { const rk = rankOf(name), CF = (k, d) => { try { return window.CS2Config ? window.CS2Config.get(k, d) : d; } catch (e) { return d; } }; return !rk || rk <= 10 ? 1.15 : rk <= 30 ? 1 : rk <= 60 ? CF('econ.wageMid', 0.7) : CF('econ.wageLow', 0.5); }
function salaryOf(p, team) { // зарплата за сезон: уровень игрока, возраст, статус команды
  const lv = pow(p), rk = team ? rankOf(team.name) : 20, ac = team?.isAcademy ? .25 : 1;   // академический контракт — стипендия
  // v92: зарплатная шкала зависит и от уровня клуба: тот же игрок в клубе вне топ-30 получает меньше (как на Tier-2 сцене).
  // Раньше маленький клуб платил игрокам как клуб топ-20: зарплаты ~$550k при доходе от спонсора ~$370k — четверть клубов
  // уходила в долги за год (долгая симуляция v92).
  const CF = (k, d) => { try { return window.CS2Config ? window.CS2Config.get(k, d) : d; } catch (e) { return d; } };
  const tier = !rk || rk <= 10 ? 1.15 : rk <= 30 ? 1 : rk <= 60 ? CF('econ.wageMid', 0.7) : CF('econ.wageLow', 0.5);
  // v137: статус игрока в зарплате — обычный игрок получает примерно на треть меньше, чем раньше (в клубе середины ~$5–8 тыс.
  // в месяц, Tier-2/3 — $2–4 тыс.), звезда — около $40–60 тыс., франшиза — до ~$85 тыс. в месяц
  let st = 'regular'; try { if (window.CS2Stature && !team?.isAcademy) st = window.CS2Stature.tier(p); } catch (e) {}
  const stK = st === 'franchise' ? CF('wage.franchiseK', 1.15) : st === 'star' ? CF('wage.starK', 1) : CF('wage.regularK', 0.65);
  return Math.round(clamp((24000 + Math.pow(Math.max(0, lv - 72) / 20, 2.6) * 560000) * tier * ac * stK, 12000, 1100000) / 1000) * 1000;
}
// v101: стоимость — уровень + часть оставшегося потенциала (у молодых), возрастная кривая, форма, контракт, академия.
// Растёт вместе с развитием игрока и падает с возрастом, спадом формы и истечением контракта (история — v101-economy).
// ранги для цены — кэш на ~2 с (valueOf зовут в циклах рынка; полная сортировка 116 клубов на каждый вызов дорога)
let rkCache = null, rkAt = 0;
const rankCached = n => { const t0 = Date.now(); if (!rkCache || t0 - rkAt > 2000) { rkCache = new Map(pro().slice().sort((a, b) => b.pts - a.pts).map((t, i) => [t.name, i + 1])); rkAt = t0; } return rkCache.get(n) || 0; };
const valueOf = p => {
  const CF = (k, d) => { try { return window.CS2Config ? window.CS2Config.get(k, d) : d; } catch (e) { return d; } };
  const lv = pow(p), age = +p.age || 24, yrs = Math.max(0, (+p.contractUntil || season()) - season());
  const t = (p.v31team && teams.find(x => x.name === p.v31team)) || teams.find(x => (x.players || []).includes(p)) || null;
  const isAcad = !!((t && t.isAcademy) || p.isProspect || p.academy);
  // v135.1: шкала рынка. Обычный игрок — в основном $150–400 тыс., хороший игрок топ-клуба — до ~$1,5 млн; звезда — до
  // ~$3,5 млн, франшиза (donk, ZywOo, m0NESY) — до ~$6 млн. У академистов цена — от потенциала и престижа академии.
  const pot = Math.max(lv, +p.pot || lv), grow = isAcad ? (age <= 19 ? .6 : age <= 21 ? .45 : .3) : (age <= 19 ? .3 : age <= 21 ? .22 : age <= 23 ? .14 : age <= 25 ? .06 : 0);
  const eff = lv + (pot - lv) * grow + clamp(((+p.form || 100) - 100) * .06, -1.2, 1.2);
  const ageK = age <= 21 ? 1.15 : age <= 24 ? 1.08 : age <= 27 ? 1 : age <= 29 ? .85 : age <= 31 ? .65 : .45;
  const con = yrs <= 0 ? .45 : .55 + .25 * Math.min(2, yrs);                          // истекающий контракт — дёшево
  let tier = 'regular'; try { if (window.CS2Stature) tier = window.CS2Stature.tier(p); } catch (e) {}
  if (isAcad) tier = 'academy';
  const K = tier === 'franchise' ? CF('price.franchiseK', 1.3) : tier === 'star' ? CF('price.starK', 0.85) : CF('price.regularK', 0.4);
  const cap = tier === 'academy' ? CF('price.capAcademy', 2000000) : tier === 'franchise' ? CF('price.capFranchise', 6500000) : tier === 'star' ? CF('price.capStar', 3500000) : CF('price.capRegular', 1500000);
  // академия: престиж клуба-хозяина (академия топ-10 — талант на виду у всего рынка), иначе скидка «не доказал на про-сцене»
  let acadK = 1;
  if (tier === 'academy') { const par = t && (window.V21AcademyParent || {})[t.name], prk = par ? rankCached(par) : 0; acadK = prk && prk <= 10 ? CF('price.acadTop10', 1.3) : prk && prk <= 30 ? 1 : CF('price.acadOther', .7); }
  // видимость: игрок клуба топ-10 на виду у всего рынка, вне топ-60 — дешевле
  const rk = t && !t.isAcademy ? rankCached(t.name) : 0, vis = !rk ? 1 : rk <= 10 ? CF('price.top10Mul', 1.1) : rk > 60 ? CF('price.lowMul', .85) : 1;
  return Math.round(clamp(Math.pow(Math.max(0, eff - 68) / 22, 2.6) * 2300000 * K * ageK * con * vis * acadK, 15000, cap) / 1000) * 1000;
};

/* ------------------------------------------------------------ организация */
const FAC = { training: 'Тренировочная база', analysis: 'Аналитический отдел', academy: 'Академия', scouting: 'Скаутский отдел', bootcamp: 'Буткемп-центр', psych: 'Спортивная психология', media: 'Медиа-отдел' };
const FAC_COST = [0, 250000, 600000, 1200000];           // стоимость перехода на уровень
const FAC_UPKEEP = [0, 60000, 140000, 280000];           // содержание за сезон
function org(name) {
  const c = S(); let o = c.orgs[name];
  if (!o) {
    const rk = rankOf(name) || 40, t = byName(name);
    const top = clamp(1 - (rk - 1) / 40, 0, 1);
    // v91: стартовый бюджет — из профиля сейва (класс богатства клуба + случайность в коридоре); старые сейвы — прежняя формула
    const pb = window.CS2SaveProfile ? window.CS2SaveProfile.budget(name, rk, !!t?.isAcademy) : null;
    o = c.orgs[name] = { budget: pb != null ? pb : Math.round((400000 + top * top * 4200000) / 1000) * 1000, rep: Math.round(18 + top * 72), fac: {}, ledger: [], train: null, prep: null, plan: { tempo: 'default', aggr: 'mid' }, prospects: [], hist: {}, since: calNow() };
    Object.keys(FAC).forEach(k => { o.fac[k] = rk <= 5 ? 2 : rk <= 15 ? 1 : 0; });
    if (t?.isAcademy) { o.budget = 150000; o.rep = 15; }
    o.sponsor = newSponsor(name, o);
  }
  return o;
}
function newSponsor(name, o) {
  const rk = rankOf(name) || 40, base = 300000 + Math.pow(clamp((o.rep || 30) / 100, 0, 1), 1.6) * 3800000;
  const tiers = ['Региональный партнёр', 'Технологический партнёр', 'Генеральный спонсор', 'Титульный спонсор'];
  return { name: tiers[o.rep >= 80 ? 3 : o.rep >= 60 ? 2 : o.rep >= 35 ? 1 : 0], perSeason: Math.round(base / 1000) * 1000, target: clamp(rk + 2, 1, 40), until: season() + 1 + (h32(name + season()) % 2), bonus: Math.round(base * .15 / 1000) * 1000, strikes: 0 };
}
function book(name, amt, kind, note) {
  const o = org(name); o.budget = Math.round(o.budget + amt);
  o.ledger.unshift({ ts: calNow(), s: season(), amt: Math.round(amt), kind, note });
  // v131: у ИИ-клубов журнал короче (25 записей) — 133 журнала по 80 записей занимали ~1 МБ сохранения и переполняли localStorage
  const cap = isManaged(name) ? 80 : 25; if (o.ledger.length > cap) o.ledger.length = cap;
  const y = o.hist[season()] || (o.hist[season()] = { inc: 0, exp: 0, prize: 0, spon: 0, wage: 0, trans: 0, fac: 0, owner: 0 });
  if (y.owner == null) y.owner = 0;   // v89: дивиденды владельцам — отдельная категория (раньше были только в общих расходах)
  if (amt >= 0) y.inc += amt; else y.exp += -amt;
  if (y[kind] == null && kind !== 'inc' && kind !== 'exp') y[kind] = 0;   // v94: новые статьи (медиа, штаб, академия, буткемп)
  y[kind] += amt;
}
function wageBill(t) { return (t.players || []).reduce((s, p) => s + (ensurePerson(p).salary || 0), 0) + (t.coach ? Math.round(120000 * wageTier(t.name) / 1000) * 1000 : 0); }   // v93: зарплата тренера — по шкале уровня клуба
function facUpkeep(o) { return Object.values(o.fac).reduce((s, l) => s + FAC_UPKEEP[l || 0], 0); }
function upgrade(name, key) {
  const o = org(name), l = o.fac[key] || 0; if (l >= 3) return { ok: false, why: 'максимальный уровень' };
  const cost = FAC_COST[l + 1]; if (o.budget < cost) return { ok: false, why: `не хватает ${money(cost - o.budget)}` };
  book(name, -cost, 'fac', `${FAC[key]}: уровень ${l + 1}`); o.fac[key] = l + 1;
  if (isManaged(name)) careerLog(`Инвестиция: ${FAC[key]} → уровень ${l + 1} (${money(cost)})`);
  return { ok: true };
}
function downgrade(name, key) { const o = org(name); if ((o.fac[key] || 0) <= 0) return false; o.fac[key]--; return true; }
const facMul = (name, key, per) => 1 + per * (org(name).fac[key] || 0);

/* ------------------------------------------------------------ экономика: неделя и призовые */
const PRIZE = { major: 1250000, elite: 500000, regular: 250000, tier2: 50000, tier3: 15000, academy: 25000 };
const SPLIT = { 1: .40, 2: .18, 3: .09, 4: .07, 5: .035, 6: .035, 7: .035, 8: .035 };
// v89: фонд фонового турнира и квалификации — из самого события (ev.prize). Раньше архивная запись не переносила prize,
// у квалификаций (prestige 'qual') не было стандартного фонда, а отметка «оплачено» ставилась до проверки —
// и квалификации не приносили денег, а повторная обработка уже не помогала.
function poolOf(snap) {
  let pool = Number(snap.prizePool) || 0;
  if (!pool && /^P-/.test(String(snap.id || ''))) {
    const ev = (seasonState.parallelSchedule || []).find(e => e && 'P-' + e.id === snap.id);
    pool = Number(ev && (ev.prize || ev.prizePool)) || 0;
    if (pool) snap.prizePool = pool;
  }
  return pool || PRIZE[snap.prestige] || 0;
}
function payPrizes(snap) {
  if (!snap || !snap.results || snap.v31paid) return;
  const pool = poolOf(snap);
  snap.v31paid = 1; snap.v31pool = pool;
  if (pool) { // v40: призовой фонд конкретного события
    // v94: Мейджор платит и за стадии: вылет на Stage 2 (17–24) и Stage 1 (25–32) — небольшие выплаты, как в реальных Мейджорах
    const stageShare = p => snap.prestige === 'major' ? (p <= 24 ? .005 : p <= 32 ? .0035 : 0) : 0;
    snap.results.forEach(r => { const sh = SPLIT[r.p] || (r.p <= 16 ? .0125 : stageShare(r.p)); if (!sh || !byName(r.n)) return;
      // v138: призовые делятся — игрокам основы большая часть (в их карьерных заработках), клубу — своя доля
      const CFp = (k, d) => { try { return window.CS2Config ? window.CS2Config.get(k, d) : d; } catch (e) { return d; } }, clubShare = CFp('econ.prizeClubShare', 0.4);
      const amt = pool * sh * clubShare; book(r.n, amt, 'prize', `${snap.name}: ${r.p}-е место (доля клуба ${Math.round(clubShare * 100)}%)`);
      const o = org(r.n); if (r.p === 1) { o.rep = clamp(o.rep + (snap.prestige === 'major' ? 8 : snap.prestige === 'elite' ? 4 : 2), 0, 100); if (o.sponsor && ['major', 'elite', 'regular'].includes(snap.prestige)) book(r.n, o.sponsor.bonus, 'spon', `Бонус спонсора за титул (${o.sponsor.name})`); } });
    // v95: стадия Мейджора — репутация организации (титул уже +8 выше): финал +4, полуфинал +3, плей-офф +2, Stage 3 +1
    if (snap.prestige === 'major') snap.results.forEach(r => { if (!byName(r.n) || r.p === 1) return; const d = r.p === 2 ? 4 : r.p <= 4 ? 3 : r.p <= 8 ? 2 : r.p <= 16 ? 1 : 0; if (d) { const o = org(r.n); o.rep = clamp(o.rep + d, 0, 100); } });
    try { if (window.V41) window.V41.eventFinance(snap, { book, org }); } catch (e) {} // v41: поездки и спонсоры события
  }
  // Persist the paid marker once. This prevents duplicate payouts after a reload
  // and also lets incremental archive consumers see that the record changed.
  try { if (snap.id && window.hubArchivePersist) window.hubArchivePersist(snap.id); } catch (e) {}
}
function weekEconomy() {
  const s = season();
  teams.forEach(t => {
    const o = org(t.name);
    (t.players || []).forEach(ensurePerson);
    // доходы: спонсор + медиа; расходы: зарплаты, содержание объектов, поездки
    const media = 1 + 0.1 * (o.fac.media || 0);
    book(t.name, (o.sponsor?.perSeason || 0) * media / 48, 'spon', o.sponsor?.name || 'Спонсор');
    book(t.name, -wageBill(t) / 48, 'wage', 'Зарплаты');
    const up = facUpkeep(o); if (up) book(t.name, -up / 48, 'fac', 'Содержание объектов');
    // репутация медленно тянется к уровню команды
    const rk = rankOf(t.name) || 40, target = t.isAcademy ? 15 : 18 + clamp(1 - (rk - 1) / 40, 0, 1) * 72 + (o.fac.media || 0) * 3;
    o.rep = Math.round(clamp(o.rep + (target - o.rep) * 0.03, 0, 100) * 10) / 10;
    // спонсор: требования к рейтингу
    if (window.CS2Sponsors && !t.isAcademy) { try { window.CS2Sponsors.week(t, o); } catch (e) { console.warn('[v94 sponsors]', e); } }   // v94: спонсоры-партнёры
    else if (o.sponsor && !t.isAcademy) {
      if (rk > o.sponsor.target + 3) o.sponsor.strikes = (o.sponsor.strikes || 0) + 1; else o.sponsor.strikes = Math.max(0, (o.sponsor.strikes || 0) - 1);
      if (o.sponsor.until < s || o.sponsor.strikes >= 10) { const old = o.sponsor; o.sponsor = newSponsor(t.name, o); if (old.strikes >= 10) o.sponsor.perSeason = Math.round(o.sponsor.perSeason * .8); if (isManaged(t.name)) careerLog(`Новый спонсорский контракт: ${o.sponsor.name}, ${money(o.sponsor.perSeason)} за сезон, цель — топ-${o.sponsor.target}`); }
    }
    // AI-финансы: вложения при запасе денег, экономия при долге (управляемая — по режиму)
    if (!isManaged(t.name) || auto('finance')) aiFinance(t.name);
    ownerDividend(t, o);
  });
}
// Владельцы забирают часть прибыли сверх резерва (раз в 4 недели 10%, ~70% излишка за сезон):
// иначе топ-клубы копят десятки миллионов, которые некуда тратить.
function ownerDividend(t, o) {
  if (t.isAcademy || Math.floor(calNow() / DAY / 7) % 4) return;
  const reserve = Math.max(4000000, wageBill(t) * 2 + (o.sponsor?.perSeason || 0)), excess = o.budget - reserve;
  if (excess <= 0) return;
  const amt = Math.round(excess * 0.10 / 1000) * 1000; if (amt < 1000) return;
  book(t.name, -amt, 'owner', 'Дивиденды владельцам');
  if (isManaged(t.name)) careerLog(`Владельцы забрали ${money(amt)} прибыли сверх резерва ${money(reserve)}`);
}
function aiFinance(name) {
  const o = org(name), t = byName(name); if (!t || t.isAcademy) return;
  const reserve = wageBill(t) * 0.5;
  if (o.budget > reserve + 900000) {
    const order = ['training', 'analysis', 'psych', 'bootcamp', 'media', 'scouting', 'academy'].sort((a, b) => (o.fac[a] || 0) - (o.fac[b] || 0));
    for (const k of order) { const l = o.fac[k] || 0; if (l < 3 && o.budget - FAC_COST[l + 1] > reserve) { upgrade(name, k); break; } }
  }
  if (o.budget < -200000) { const k = Object.keys(o.fac).sort((a, b) => (o.fac[b] || 0) - (o.fac[a] || 0))[0]; if (o.fac[k] > 0) { o.fac[k]--; book(name, 0, 'fac', `Сокращение: ${FAC[k]}`); } }
}

/* ------------------------------------------------------------ сыгранность и уверенность */
function stampTenure() { // игрок без отметки «с какой даты в этой команде» получает её; старые составы — уже сыграны
  const now = calNow();
  teams.forEach(t => (t.players || []).forEach(p => { if (!p.v31since || p.v31team !== t.name) { const fresh = !!p.v31team; p.v31team = t.name; p.v31since = fresh ? now : now - 200 * DAY; } }));
}
function chemistry(t) { // 0..1: время вместе (до 240 дней), коммуникация, лидер
  if (!t?.players?.length) return .5;
  const now = calNow(), ps = t.players.map(ensurePerson);
  const ten = ps.map(p => clamp((now - (p.v31since || now)) / DAY / 240, 0, 1));
  const pair = ten.reduce((s, a, i) => s + ten.reduce((q, b, j) => j > i ? q + Math.min(a, b) : q, 0), 0) / 10;
  const comm = ps.reduce((s, p) => s + p.pers.comm, 0) / ps.length / 19, lead = Math.max(...ps.map(p => p.pers.lead)) / 19;
  const bonus = (t.v31chemBonus || 0);
  return clamp(pair * .7 + comm * .18 + lead * .12 + bonus, 0, 1);
}
function teamConf(t) { return (t?.players || []).reduce((s, p) => s + (+ensurePerson(p).conf || 60), 0) / Math.max(1, (t?.players || []).length); }
function afterMatch(w, l, big) { // уверенность меняется постепенно; психолог смягчает падения
  [[w, 1], [l, -1]].forEach(([n, sgn]) => { const t = byName(n); if (!t) return; const ps = facMul(n, 'psych', .25);
    (t.players || []).forEach(p => { ensurePerson(p); const d = sgn > 0 ? 2.2 + (big ? 1.5 : 0) : -(2.4 + (big ? 1.2 : 0)) / ps; p.conf = clamp(Math.round((p.conf + d + (60 - p.conf) * 0.04) * 10) / 10, 5, 98); }); });
}

/* ------------------------------------------------------------ тренировки */
// v99.2: шесть фокусов вместо пятнадцати. Похожие упражнения объединены, эффекты — суммарно те же направления.
// Старые ключи из сейвов и решений ИИ сводятся к новым через TRAIN_ALIAS.
const TRAIN = {
  entry: { l: 'Стрельба и выходы', attrs: { firepower: .8, clutch: .2 }, hint: 'огневая мощь всех, немного клатча' },
  utility: { l: 'Утилити и раунды', attrs: { utility: .6, tacticalIQ: .4 }, hint: 'гранаты, ретейки, экономика' },
  mapcontrol: { l: 'Карты и анти-страты', map: 1.2, attrs: { tacticalIQ: .2 }, hint: 'выбранная карта, T и CT, анти-страты' },
  comm: { l: 'Сыгранность', chem: 14, attrs: { tacticalIQ: .2 }, hint: 'коммуникация, размены, капитан' },
  mental: { l: 'Психология и клатчи', conf: 6, attrs: { clutch: .5 }, hint: 'уверенность, клатчи, турниры' },
  recovery: { l: 'Восстановление', conf: 2, hint: 'снимает усталость всей команды' }
};
const TRAIN_ALIAS = { retake: 'utility', clutch: 'mental', trading: 'comm', economy: 'utility', tside: 'entry', ctside: 'utility', igl: 'comm', antistrat: 'mapcontrol', eventprep: 'mental' };
const trainKey = k => (TRAIN[k] ? k : TRAIN_ALIAS[k]) || 'comm';
const INTENS = { low: { k: .6, fat: -4 }, normal: { k: 1, fat: 2 }, high: { k: 1.45, fat: 9 } };
const v31TrainingDiagnostics = { indexBuilds: 0, cacheHits: 0, cooperativeYields: 0, lastMatchCount: 0, lastBuildMs: 0, lastTeamCount: 0, lastTrainingTeams: 0, lastTrainingWorkMs: 0, lastTrainingYields: 0 };
let v31TrainingMapCache = null;
function trainingMapCacheKey() {
  let archiveRevision = -1, liveFinished = 0, liveId = '';
  try { if (typeof window.hubArchiveRevision === 'function') archiveRevision = Number(window.hubArchiveRevision()) || 0; } catch (e) {}
  try { const ct = typeof currentTournament !== 'undefined' ? currentTournament : null; liveFinished = Number(ct?.broadcast?.finished?.length) || 0; liveId = String(ct?.hubArchiveId || ct?.id || ct?.name || ''); } catch (e) {}
  return `${season()}|${archiveRevision}|${liveId}|${liveFinished}`;
}
function getTrainingMatches() {
  try {
    if (typeof window.HS?.matchIndex === 'function') return window.HS.matchIndex() || [];
    if (typeof window.HS?.stats === 'function') return window.HS.stats()?.ms || [];
  } catch (e) {}
  return [];
}
function addTrainingMatch(byTeam, m) {
  if (!m || !m.a || !m.b || !m.w || m.wo || m.kind === 'show' || m.kind === 'nations') return;
  const maps = Array.isArray(m.mp) ? m.mp : [];
  for (const row of maps) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const map = String(row[0] || ''), a = Number(row[1]), b = Number(row[2]);
    if (!map || !Number.isFinite(a) || !Number.isFinite(b) || a + b === 0) continue;
    const sa = byTeam[m.a] || (byTeam[m.a] = Object.create(null));
    const sb = byTeam[m.b] || (byTeam[m.b] = Object.create(null));
    const ma = sa[map] || (sa[map] = { n: 0, w: 0 });
    const mb = sb[map] || (sb[map] = { n: 0, w: 0 });
    ma.n++; mb.n++;
    if (a > b) ma.w++; else if (b > a) mb.w++;
  }
}
function finishTrainingMapBuild(byTeam, matches, started, key) {
  const ended = window.performance?.now ? window.performance.now() : Date.now();
  v31TrainingDiagnostics.indexBuilds++;
  v31TrainingDiagnostics.lastMatchCount = matches.length;
  v31TrainingDiagnostics.lastBuildMs = Math.round(Math.max(0, ended - started) * 100) / 100;
  v31TrainingDiagnostics.lastTeamCount = Object.keys(byTeam).length;
  const entry = { key, season: season(), data: byTeam };
  v31TrainingMapCache = entry;
  if (window.v57BatchCalendarSkip) window.__CS2_BATCH_TRAINING_MAP_STATS = entry;
  return byTeam;
}
function buildTrainingMapStats() {
  // Cached across virtual weeks: a 90-day skip must not rebuild years of map
  // history every time the weekly career clock crosses another boundary.
  const key = trainingMapCacheKey();
  const batchEntry = window.v57BatchCalendarSkip ? window.__CS2_BATCH_TRAINING_MAP_STATS : null;
  if (batchEntry && batchEntry.season === season()) { v31TrainingDiagnostics.cacheHits++; return batchEntry.data; }
  if (v31TrainingMapCache && v31TrainingMapCache.key === key) { v31TrainingDiagnostics.cacheHits++; if (window.v57BatchCalendarSkip) window.__CS2_BATCH_TRAINING_MAP_STATS = v31TrainingMapCache; return v31TrainingMapCache.data; }
  const started = window.performance?.now ? window.performance.now() : Date.now();
  const matches = getTrainingMatches(), byTeam = Object.create(null);
  for (const m of matches) addTrainingMatch(byTeam, m);
  return finishTrainingMapBuild(byTeam, matches, started, key);
}
async function buildTrainingMapStatsCooperative() {
  const key = trainingMapCacheKey();
  const batchEntry = window.v57BatchCalendarSkip ? window.__CS2_BATCH_TRAINING_MAP_STATS : null;
  if (batchEntry && batchEntry.season === season()) { v31TrainingDiagnostics.cacheHits++; return batchEntry.data; }
  if (v31TrainingMapCache && v31TrainingMapCache.key === key) { v31TrainingDiagnostics.cacheHits++; if (window.v57BatchCalendarSkip) window.__CS2_BATCH_TRAINING_MAP_STATS = v31TrainingMapCache; return v31TrainingMapCache.data; }
  const started = window.performance?.now ? window.performance.now() : Date.now();
  const matches = getTrainingMatches(), byTeam = Object.create(null);
  for (let i = 0; i < matches.length; i++) {
    addTrainingMatch(byTeam, matches[i]);
    if ((i + 1) % 300 === 0 && i + 1 < matches.length) {
      v31TrainingDiagnostics.cooperativeYields++;
      await new Promise(resolve => {
        try { if (document.visibilityState !== 'hidden' && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(() => resolve()); else setTimeout(resolve, 4); }
        catch (e) { setTimeout(resolve, 4); }
      });
    }
  }
  return finishTrainingMapBuild(byTeam, matches, started, key);
}
function v31YieldFrame() {
  return new Promise(resolve => {
    try { if (document.visibilityState !== 'hidden' && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(() => resolve()); else setTimeout(resolve, 4); }
    catch (e) { setTimeout(resolve, 4); }
  });
}
/* v89: автоматический план тренировок.
   Раньше карты сортировались по убыванию процента побед и бралась maps[0] — самая сильная, а фокусы, работающие с картой
   (контроль карты, T/CT-сторона), ИИ не выбирал вообще: анализ карт ни на что не влиял.
   Теперь: слабейшая сыгранная карта (процент побед со сглаживанием, минимум 3 карты); работа над ней — если она заметно
   проседает, команда не перегружена и турнир не начинается в ближайшие 4 дня, и не две недели подряд. Перед турниром —
   подготовка к событию, при сильной усталости — восстановление. Сторону выбираем по составу: стрельба слабее утилити —
   T-сторона, иначе CT (отдельной статистики по сторонам в архиве нет). */
function eventSoon(t, days) {
  const now = calNow(), lim = now + (days || 4) * DAY, has = ev => (ev.participants || []).some(x => (typeof x === 'string' ? x : x && x.name) === t.name);
  try { const ct = typeof currentTournament !== 'undefined' ? currentTournament : null; if (ct && !ct.completed && has(ct)) return true; } catch (e) {}
  return (seasonState.parallelSchedule || []).some(ev => ev && ev.status !== 'completed' && has(ev) && (ev.status === 'live' || (+ev.startMs || 0) <= lim) && (+ev.endMs || +ev.startMs || 0) >= now);
}
function aiTrainingPlan(t, trainingMapStats = null) { // AI выбирает фокус по слабому месту — так же работает «авто» у игрока
  const ps = t.players || [], avg = k => ps.reduce((s, p) => s + (+p[k] || 0), 0) / Math.max(1, ps.length);
  const st = trainingMapStats ? (trainingMapStats[t.name] || {}) : window.HS?.stats?.().T?.[t.name];
  const wr = v => (v.w + 1) / (v.n + 2);
  const CF = (k, d) => { try { return window.CS2Config ? window.CS2Config.get(k, d) : d; } catch (e) { return d; } };
  const maps = st ? Object.entries(st.byMap || st).filter(([, v]) => v && v.n >= CF('training.minMaps', 3)).sort((a, b) => wr(a[1]) - wr(b[1])) : [];   // v89: слабейшая — первой
  const weakMap = maps[0] || null, bestMap = maps[maps.length - 1] || null;
  const fat = ps.reduce((s, p) => s + (+p.fatigue || 0), 0) / Math.max(1, ps.length);
  const weakest = [['utility', avg('utility')], ['clutch', avg('clutch')], ['tacticalIQ', avg('tacticalIQ')], ['firepower', avg('firepower')]].sort((a, b) => a[1] - b[1])[0][0];
  const attrFocus = { utility: 'utility', clutch: 'clutch', tacticalIQ: 'economy', firepower: 'entry' }[weakest];
  const week = Math.floor(calNow() / DAY / 7), soon = eventSoon(t, CF('training.eventSoonDays', 4));
  const fallbackMap = (typeof MAP_POOL !== 'undefined' ? MAP_POOL[0] : 'Mirage');
  let focus, map = (weakMap || bestMap)?.[0] || fallbackMap, intensity = fat > CF('training.fatigueLow', 35) ? 'low' : 'normal';
  // сыгранность растёт со временем вместе (240 дней) — у новых составов и в начале игры она низкая у всех; раньше ИИ
  // из-за этого месяцами тренировал только коммуникацию. Теперь коммуникация — не две недели подряд.
  if (chemistry(t) < CF('training.chemLow', .45) && t.v89commWeek !== week - 1) focus = 'comm';
  else if (teamConf(t) < 45) focus = 'mental';
  else if (fat > CF('training.fatigueRecovery', 50) && TRAIN.recovery) { focus = 'recovery'; intensity = 'low'; }
  else if (soon) { focus = 'mental'; intensity = 'low'; }   // v99.2: перед турниром — психология и клатчи (бывшая «подготовка к турниру»)   // перед турниром не ломаем карты и не перегружаем
  else if (weakMap && wr(weakMap[1]) < CF('training.mapSideWr', .45) && fat <= CF('training.fatigueLow', 35) && t.v89mapWeek !== week - 1) {
    const sideFocus = avg('firepower') < avg('utility') - 1 ? 'tside' : 'ctside';
    focus = 'mapcontrol'; void sideFocus; map = weakMap[0];   // v99.2: T/CT-стороны вошли в «Карты и анти-страты»
  } else focus = attrFocus;
  focus = trainKey(focus);   // v99.2
  return { focus, map, intensity, mapWork: focus === 'mapcontrol', commWork: focus === 'comm' };
}
function trainTeamRow(t, o, s, trainingMapStats) {
  if (!o.train || (!isManaged(t.name) || auto('training'))) { if (!isManaged(t.name) || auto('training') || !o.train) { o.train = Object.assign(aiTrainingPlan(t, trainingMapStats), { auto: true }); const wk = Math.floor(calNow() / DAY / 7); if (o.train.mapWork) t.v89mapWeek = wk; if (o.train.commWork) t.v89commWeek = wk; } }
  if (o.train && !TRAIN[o.train.focus]) o.train.focus = trainKey(o.train.focus);   // v99.2: старые фокусы из сейвов
  const tr = TRAIN[o.train.focus]; if (!tr) return;
  const I = INTENS[o.train.intensity] || INTENS.normal, fac = facMul(t.name, 'training', .22);
  (t.players || []).forEach(p => {
    ensurePerson(p);
    const age = +p.age || 24, ageK = age <= 21 ? 1.5 : age <= 25 ? 1.1 : age <= 29 ? .8 : .45, profK = .7 + p.pers.prof / 30;
    const gains = p.v31tg && p.v31tg.s === s ? p.v31tg : (p.v31tg = { s, sum: 0 });
    const k = 0.11 * I.k * fac * ageK * profK * (window.CS2Develop ? window.CS2Develop.trainK(p) : 1);   // v92: на пике тренировки держат уровень, а не поднимают
    Object.entries(tr.attrs || {}).forEach(([attr, w]) => {
      if (tr.roles && !tr.roles.includes(p.role)) return;
      if (gains.sum >= 3) return;
      // v92: без минимального прироста — игрок на потенциале на тренировках не растёт (раньше +0.15 у всех: инфляция уровня сцены)
      const room = clamp((+p.pot || 90) - pow(p), 0, 30) / 30;
      const add = Math.min(k * w * room, 3 - gains.sum);
      p[attr] = clamp(Math.round(((+p[attr] || 70) + add) * 100) / 100, 50, 99); gains.sum += add;
    });
    try { if (window.V41) window.V41.individualTraining(t, p, { I, fac, ageK, profK, gains }); } catch (e) {}
    p.fatigue = clamp((+p.fatigue || 0) + I.fat * (1.1 - p.pers.prof / 40), 0, 85);
    if (tr.conf) p.conf = clamp((+p.conf || 60) + tr.conf * I.k * facMul(t.name, 'psych', .2) * .5, 5, 98);
  });
  if (tr.chem) t.v31chemBonus = clamp((t.v31chemBonus || 0) + tr.chem / 1000 * I.k * fac, 0, .12);
  t.v31chemBonus = Math.max(0, (t.v31chemBonus || 0) * .97);
  t.v31map = t.v31map || {};
  if (tr.map && o.train.map) t.v31map[o.train.map] = clamp((t.v31map[o.train.map] || 0) + tr.map * I.k * fac, 0, 10);
  Object.keys(t.v31map).forEach(m => { t.v31map[m] = Math.round(t.v31map[m] * .965 * 100) / 100; });
  try { ensurePlayerLayer(t); } catch (e) {}
}
function weekTraining() {
  const s = season(), rows = teams.map(t => ({ t, o: org(t.name) }));
  const needsAiPlan = rows.some(({ t, o }) => !o.train || !isManaged(t.name) || auto('training'));
  const trainingMapStats = needsAiPlan ? buildTrainingMapStats() : null;
  const started = window.performance?.now ? window.performance.now() : Date.now();
  rows.forEach(({ t, o }) => trainTeamRow(t, o, s, trainingMapStats));
  v31TrainingDiagnostics.lastTrainingTeams = rows.length;
  v31TrainingDiagnostics.lastTrainingWorkMs = Math.round(Math.max(0, (window.performance?.now ? window.performance.now() : Date.now()) - started) * 100) / 100;
}
async function weekTrainingCooperative() {
  const s = season(), rows = teams.map(t => ({ t, o: org(t.name) }));
  const needsAiPlan = rows.some(({ t, o }) => !o.train || !isManaged(t.name) || auto('training'));
  const trainingMapStats = needsAiPlan ? await buildTrainingMapStatsCooperative() : null;
  const started = window.performance?.now ? window.performance.now() : Date.now();
  let yields = 0;
  for (let i = 0; i < rows.length; i++) {
    const { t, o } = rows[i]; trainTeamRow(t, o, s, trainingMapStats);
    if (i + 1 < rows.length && await (window.CS2Yield ? window.CS2Yield.maybe(10) : Promise.resolve(false))) { yields++; v31TrainingDiagnostics.cooperativeYields++; }
  }
  v31TrainingDiagnostics.lastTrainingTeams = rows.length;
  v31TrainingDiagnostics.lastTrainingYields = yields;
  v31TrainingDiagnostics.lastTrainingWorkMs = Math.round(Math.max(0, (window.performance?.now ? window.performance.now() : Date.now()) - started) * 100) / 100;
}


/* ------------------------------------------------------------ разведка и подготовка */
function scout(teamName, oppName) {
  // отчёт строится только из сыгранных матчей архива; объём ограничен аналитическим отделом
  const H = window.HS; if (!H) return null;
  const st = H.stats(), cap = 4 + 4 * (org(teamName).fac.analysis || 0), now = calNow();
  const ms = st.ms.filter(m => m.w && (m.a === oppName || m.b === oppName)).slice(0, cap);
  const opp = byName(oppName); if (!opp) return null;
  const cur = (opp.players || []).map(p => p.nick);
  const studiedRoster = ms[0]?.rost?.[oppName]?.map(p => p.nick) || null;
  const changed = studiedRoster ? cur.filter(n => !studiedRoster.includes(n)) : [];
  const coachMove = ((transferState.v30Moves || []).find(m => m.type === 'coach' && m.from === oppName) || null);
  const maps = {}; ms.forEach(m => m.mp.forEach(([map, a, b]) => { if (+a + +b === 0) return; const mine = m.a === oppName ? [+a, +b] : [+b, +a]; const x = maps[map] || (maps[map] = { n: 0, w: 0, rf: 0, ra: 0 }); x.n++; if (mine[0] > mine[1]) x.w++; x.rf += mine[0]; x.ra += mine[1]; }));
  const players = cur.map(n => { const o = st.P[n]; const l = o ? H.line((() => { const z = H.Z0(); o.matches.filter(x => ms.some(m => m.id === x.id)).forEach(x => Object.keys(z).forEach(k => { z[k] += x.z[k]; })); return z; })()) : null; return { nick: n, l, role: opp.players.find(p => p.nick === n)?.role }; });
  const picks = opp.mapPickHistory ? Object.entries(opp.mapPickHistory).map(([k, v]) => [k, typeof v === 'number' ? v : (v?.picks || v?.count || 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]) : [];
  const ageDays = ms[0] ? Math.max(0, Math.round((Date.now() - (ms[0].ts || Date.now())) / DAY)) : null;
  const coachNew = coachMove && ms[0] && (coachMove.ts || 0) > (ms[0].ts || 0) - 1;
  const completeness = clamp(ms.length / 8, 0, 1), fresh = (changed.length ? clamp(1 - changed.length * .3, .2, 1) : 1) * (coachMove ? .85 : 1);
  return { opp: oppName, studied: ms.length, cap, matches: ms, maps, players, picks, changed, coachMove, completeness, fresh, style: opp.style, quality: Math.round(clamp((.45 + .15 * (org(teamName).fac.analysis || 0)) * (.35 + .65 * completeness) * fresh, .05, 1) * 100) / 100, ageDays };
}
const STYLE_COUNTER = { // темп нашего плана против стиля соперника → поправка к раунду
  fast: { Aggressive: -.003, Discipline: -.004, Tactical: .004, Chaos: .002 },
  default: { Aggressive: .001, Discipline: .001, Tactical: 0, Chaos: .001 },
  slow: { Aggressive: .004, Discipline: -.002, Tactical: -.002, Chaos: .004 }
};
function setPrep(teamName, prep) {
  const o = org(teamName), r = scout(teamName, prep.opp);
  o.prep = { opp: prep.opp, maps: (prep.maps || []).slice(0, 2), anti: prep.anti || null, ts: calNow(), quality: r ? r.quality : .2, roster: (byName(prep.opp)?.players || []).map(p => p.nick) };
  o.prepUse = o.prepUse || {};
  if (isManaged(teamName)) careerLog(`Подготовка к ${prep.opp}: ${o.prep.maps.join(', ') || 'общий план'}${o.prep.anti ? `, против ${o.prep.anti}` : ''} (качество ${Math.round(o.prep.quality * 100)}%)`);
  return o.prep;
}
function prepMod(teamName, oppName, map) {
  const o = org(teamName), p = o.prep; if (!p || p.opp !== oppName) return 0;
  if (calNow() - p.ts > 21 * DAY) return 0;                                        // подготовка устаревает
  const now = (byName(oppName)?.players || []).map(x => x.nick), stale = now.filter(n => !p.roster.includes(n)).length;
  let q = p.quality * clamp(1 - stale * .3, .2, 1);
  // адаптация соперника: одна и та же заготовка против одной команды теряет силу
  const k = oppName + '|' + map, used = (o.prepUse || {})[k] || 0; q *= Math.pow(.62, used);
  let m = 0;
  if (map && p.maps.includes(map)) m += .011 * q;
  if (p.anti && now.includes(p.anti)) m += .003 * q;
  return m;
}
function markPrepUsed(teamName, oppName, map) { const o = org(teamName); if (!o.prep || o.prep.opp !== oppName || !o.prep.maps.includes(map)) return; o.prepUse = o.prepUse || {}; const k = oppName + '|' + map; o.prepUse[k] = (o.prepUse[k] || 0) + 1; }
function aiPrep(teamName, oppName) { // AI готовится только к важным матчам (контекст «ставки высоки»)
  const H = window.HS; if (!H) return;
  const T = H.stats().T[teamName]; const best = T ? Object.entries(T.byMap).filter(([, v]) => v.n >= 2).sort((a, b) => (b[1].w / b[1].n) - (a[1].w / a[1].n))[0] : null;
  const opp = byName(oppName), star = (opp?.players || []).slice().sort((a, b) => pow(b) - pow(a))[0];
  setPrep(teamName, { opp: oppName, maps: best ? [best[0]] : [], anti: star?.nick || null });
}

/* ------------------------------------------------------------ соперничества */
function computeRivals() {
  const H = window.HS; if (!H) return [];
  const c = S(), ms = H.stats().ms, pairs = {};
  ms.forEach(m => {
    if (!m.w || !['major', 'elite', 'regular'].includes(m.kind)) return;
    const k = [m.a, m.b].sort().join('|'), x = pairs[k] || (pairs[k] = { a: [m.a, m.b].sort()[0], b: [m.a, m.b].sort()[1], n: 0, wa: 0, po: 0, fin: 0, close: 0, last: 0 });
    x.n++; if (m.w === x.a) x.wa++;
    const stg = (m.stage || '');
    if (!/Swiss|Stage|Группа|Открытие|Раунд \d/i.test(stg)) x.po++;
    if (/Гранд|Финал \(|^Финал/.test(stg.split(' · ').pop() || '')) x.fin++;
    if (m.s && Math.abs(m.s[0] - m.s[1]) === 1 && m.s[0] + m.s[1] >= 3) x.close++;
    x.last = Math.max(x.last, m.ts || 0);
  });
  const list = Object.values(pairs).map(x => ({ ...x, score: x.n + x.po * 1.5 + x.fin * 4 + x.close * 1.5, bal: Math.min(x.wa, x.n - x.wa) / Math.max(1, x.n) }))
    .filter(x => x.score >= 12 && x.bal >= .25 && byName(x.a) && byName(x.b)).sort((a, b) => b.score - a.score).slice(0, 24);
  c.rivals = { list, at: Date.now() };
  return list;
}
const rivalOf = (a, b) => (S().rivals.list || []).find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a)) || null;

/* ------------------------------------------------------------ контекст матча и модификатор */
let CTX = null; // { a, b, stakes: 0..2 } — какой матч сейчас считается
function stakesOf(m) {
  const ct = typeof currentTournament !== 'undefined' ? currentTournament : null; if (!ct || !m) return 0;
  if (m === ct.grandFinal) return 2;
  const up = ct.upperRounds || []; if (up.length && (up[up.length - 1] || []).includes(m)) return ct.hasLowerBracket ? 1 : 2;
  if (up.length > 1 && (up[up.length - 2] || []).includes(m)) return 1;
  return ct.isMajor ? 1 : 0;
}
function withCtx(m, fn) { const prev = CTX; CTX = { a: m?.t1, b: m?.t2, stakes: stakesOf(m), m }; try { return fn(); } finally { CTX = prev; } }
function teamMod(name, opp, map) { // вклад команды в вероятность раунда (до суммирования и ограничения)
  const t = byName(name); if (!t) return 0;
  const o = org(name);
  let m = 0;
  m += (chemistry(t) - .5) * .016;                                                  // сыгранность
  m += (teamConf(t) - 60) * .00018;                                                 // уверенность
  m += ((t.v31map || {})[map] || 0) * .0011;                                        // натренированная карта
  m += prepMod(name, opp, map);                                                     // подготовка к сопернику
  const oppT = byName(opp);
  if (o.plan && oppT) m += (STYLE_COUNTER[o.plan.tempo] || STYLE_COUNTER.default)[oppT.style || 'Tactical'] || 0;
  if (CTX && CTX.stakes) {                                                          // давление: финалы и соперничество
    const pr = (t.players || []).reduce((s, p) => s + ensurePerson(p).pers.press, 0) / 5;
    const riv = rivalOf(name, opp) ? 1.5 : 1;
    m += (pr - 11.5) * .0006 * CTX.stakes * riv * facMul(name, 'psych', .15);
  }
  return m;
}
function careerMod(t1, t2, map) { return clamp(teamMod(t1, t2, map) - teamMod(t2, t1, map), -.03, .03); }
window.v31CareerMod = careerMod;
(() => {
  const f = window.calcMapWinProbability; if (typeof f !== 'function' || f.__v31) return;
  const w = function (t1, t2, map) { const p = f.apply(this, arguments); let d = 0; try { d = careerMod(t1, t2, map); } catch (e) {} return clamp(p + d, .25, .75); };
  w.__v31 = true; window.calcMapWinProbability = w; try { calcMapWinProbability = w; } catch (e) {}
  const o = window.calcMatchOdds; if (typeof o === 'function' && !o.__v31) {
    const wo = function (t1, t2, bo1) { const r = o.apply(this, arguments); if (!r) return r; let d = 0; try { d = careerMod(t1, t2, null) * 3.2; } catch (e) {} const p1 = clamp(r.p1_win + d, .08, .92);
      return { pct1: Math.round(p1 * 100), pct2: 100 - Math.round(p1 * 100), c1: Math.max(1.05, Math.min(7.5, .94 / p1)).toFixed(2), c2: Math.max(1.05, Math.min(7.5, .94 / (1 - p1))).toFixed(2), p1_win: p1 }; };
    wo.__v31 = true; window.calcMatchOdds = wo; try { calcMatchOdds = wo; } catch (e) {}
  }
  // контекст матча: мгновенный, пошаговый и эфир
  const im = window.instantMatch; if (typeof im === 'function' && !im.__v31) {
    const wi = function (match, cb) { if (match?.t1 && match?.t2) beforeMatch(match); const wrapped = function (wn, ln) { try { afterMatch(wn, ln, stakesOf(match) > 0); markUsed(match); } catch (e) {} return cb.apply(this, arguments); }; return withCtx(match, () => im.call(this, match, wrapped)); };
    wi.__v31 = true; Object.keys(im).forEach(k => { wi[k] = im[k]; }); window.instantMatch = wi; try { instantMatch = wi; } catch (e) {}
  }
  const fb = window.finishBroadcastMatch; if (typeof fb === 'function' && !fb.__v31) {
    const wf = function (item, winner, loser) { try { afterMatch(winner, loser, stakesOf(item?.match) > 0); markUsed(item?.match); } catch (e) {} return fb.apply(this, arguments); };
    wf.__v31 = true; window.finishBroadcastMatch = wf; try { finishBroadcastMatch = wf; } catch (e) {}
  }
})();
function beforeMatch(m) { // AI готовится к важным матчам и к соперникам
  const st = stakesOf(m); if (!st && !rivalOf(m.t1, m.t2)) return;
  [[m.t1, m.t2], [m.t2, m.t1]].forEach(([a, b]) => { if (isManaged(a) && !auto('scouting')) return; const o = org(a); if (!o.prep || o.prep.opp !== b || calNow() - o.prep.ts > 14 * DAY) aiPrep(a, b); });
}
function markUsed(m) { if (!m) return; const maps = (m.broadcastResult?.maps || []).map(x => x.map); maps.forEach(map => { markPrepUsed(m.t1, m.t2, map); markPrepUsed(m.t2, m.t1, map); }); }
// эфир: контекст ставок для раундов текущего матча
(() => { const ba = window.broadcastAdvancePhase; if (typeof ba !== 'function' || ba.__v31) return;
  const w = function (item) { if (item?.match) { if (!item.__v31b) { item.__v31b = 1; try { beforeMatch(item.match); } catch (e) {} } return withCtx(item.match, () => ba.apply(this, arguments)); } return ba.apply(this, arguments); };
  w.__v31 = true; window.broadcastAdvancePhase = w; try { broadcastAdvancePhase = w; } catch (e) {} })();

/* ------------------------------------------------------------ тайм-ауты и перерыв */
const CALLS = {
  calm: { l: 'Успокоить команду', d: 'Снять напряжение после серии проигранных раундов' },
  aggr: { l: 'Агрессия на слабой экономике', d: 'Давить, пока у соперника нет денег на полный закуп' },
  defense: { l: 'Перестроить защиту', d: 'Сменить расстановку, если соперник забирает раунды подряд' },
  counter: { l: 'Заготовка против соперника', d: 'Разыграть подготовленное решение — сильнее при хорошей разведке' },
  tempo: { l: 'Сменить темп', d: 'Если медленная игра не приносит раундов — ускориться, и наоборот' }
};
function callValue(st, side, key, teamName) { // насколько вызов уместен в этой ситуации
  const opp = side === 1 ? 2 : 1, tr = getBroadcastTeamTrend(st, side, 6), otr = getBroadcastTeamTrend(st, opp, 6);
  const oppMoney = st.economy?.[opp === 1 ? 't1' : 't2']?.money ?? 4000, diff = side === 1 ? st.map1 - st.map2 : st.map2 - st.map1;
  const oppName = side === 1 ? st.__match?.t2 : st.__match?.t1;
  switch (key) {
    case 'calm': return tr.losses >= 3 || diff <= -3 ? .042 : .012;
    case 'aggr': return oppMoney < 2600 ? .05 : .008;
    case 'defense': return otr.streak >= 3 ? .046 : .014;
    case 'counter': { const p = org(teamName).prep; return p && p.opp === oppName ? .02 + .035 * p.quality : .006; }
    case 'tempo': return tr.losses >= 2 && diff < 0 ? .036 : .01;
    default: return .02;
  }
}
(() => { const pp = window.publishPostPauseTactic; if (typeof pp !== 'function' || pp.__v31) return;
  const w = function (st, teamName, mapName) {
    const r = pp.apply(this, arguments);
    try {
      const side = teamName === st.__match?.t1 ? 1 : 2, call = st.v31Call?.[side];
      if (call && CALLS[call]) {
        const v = callValue(st, side, call, teamName);
        st.pauseImpact[side] = Object.assign(st.pauseImpact[side] || {}, { base: CALLS[call].l, boost: v, roundsLeft: 3, user: true });
        if (call === 'calm') { const t = byName(teamName); (t?.players || []).forEach(p => { p.conf = clamp((+ensurePerson(p).conf || 60) + 3, 5, 98); }); }
        st.phaseText = `🧠 ${teamName}: ${CALLS[call].l}`;
        try { addBroadcastEvent(st, `🧠 <b>${teamName}</b> — решение тренера: ${CALLS[call].l} (${v >= .03 ? 'в точку' : 'не самое удачное время'})`, 'tactic'); } catch (e) {}
        st.v31Call[side] = null;
        (st.v31Log = st.v31Log || []).unshift({ round: st.round, team: teamName, call, value: v });
      }
    } catch (e) { console.warn('[v31 call]', e); }
    return r;
  };
  w.__v31 = true; window.publishPostPauseTactic = w; try { publishPostPauseTactic = w; } catch (e) {} })();
function userTimeout(itemId, call) { // тайм-аут управляемой команды в эфире — по правилам эфира (лимит пауз, не в 10–12 раунде)
  const b = (typeof currentTournament !== 'undefined' ? currentTournament : null)?.broadcast; const item = (b?.active || []).find(x => x.id === itemId);
  const st = item?.state, m = item?.match, me = managed(); if (!st || !m || !me) return { ok: false, why: 'матч не в эфире' };
  const side = m.t1 === me ? 1 : m.t2 === me ? 2 : 0; if (!side) return { ok: false, why: 'это не матч вашей команды' };
  if (st.phase !== 'playing') return { ok: false, why: 'дождитесь розыгрыша раунда' };
  const left = side === 1 ? st.t1Pauses : st.t2Pauses; if (left <= 0) return { ok: false, why: 'тайм-ауты закончились' };
  if (side === 1) st.t1Pauses--; else st.t2Pauses--;
  st.v31Call = st.v31Call || {}; st.v31Call[side] = call;
  st.pauseTeam = me; st.pauseReason = 'Тактический тайм-аут'; st.pauseKind = 'tactical'; st.phase = 'tactical-pause';
  st.phaseUntil = Date.now() + clamp(Math.round(4500 / (Number(tvPlaybackSpeed) || 1)), 2400, 5400);
  st.lastRoundAt = Date.now();
  st.phaseText = `⏸ Пауза: ${me}`; st.pauseHistory = st.pauseHistory || []; st.pauseHistory.unshift({ team: me, round: st.round, mapIndex: st.mapIndex, at: Date.now(), automatic: false, kind: 'tactical' });
  try { addBroadcastEvent(st, `⏸ <strong>${me}</strong> берут тактический тайм-аут.`); } catch (e) {}
  return { ok: true };
}
// перерыв: после 12-го раунда у управляемой команды есть до 15-го, чтобы выбрать решение на вторую половину
function halfReport(st, side) {
  const rw = st.mapRoundWinners || [], first = rw.slice(0, 12), mine = first.filter(x => x === side).length, last6 = rw.slice(6, 12).filter(x => x === side).length;
  const oppSide = side === 1 ? 2 : 1, pist = first[0] === side;
  const notes = [];
  notes.push(pist ? 'Пистолетный раунд выигран — экономика первой половины была на нашей стороне.' : 'Пистолетный раунд проигран — первая половина началась с отставания по деньгам.');
  if (last6 <= 2) notes.push('Конец половины провален: соперник нашёл ответ на нашу игру.');
  if (last6 >= 4) notes.push('Концовка половины за нами: текущий план работает.');
  const streakOpp = (() => { let s = 0; for (let i = first.length - 1; i >= 0 && first[i] === oppSide; i--) s++; return s; })();
  if (streakOpp >= 3) notes.push(`Соперник забрал ${streakOpp} раунда подряд перед перерывом.`);
  return { mine, theirs: first.length - mine, last6, notes, options: [
    { k: 'stay', l: 'Оставить план', good: last6 >= 4 || mine >= 8, d: 'Плюс, если план работает; минус — если соперник уже адаптировался.' },
    { k: 'switch', l: 'Сменить план атаки/защиты', good: last6 <= 2 || mine <= 4, d: 'Сильный ход при провале концовки, лишний — при преимуществе.' },
    { k: 'anti', l: 'Сыграть от заготовки на сопернике', good: !!org(st.__match ? (side === 1 ? st.__match.t1 : st.__match.t2) : '').prep, d: 'Работает, если была подготовка к этому сопернику.' }
  ] };
}
function chooseHalf(itemId, key) {
  const b = (typeof currentTournament !== 'undefined' ? currentTournament : null)?.broadcast; const item = (b?.active || []).find(x => x.id === itemId);
  const st = item?.state, m = item?.match, me = managed(); if (!st || !m || !me) return { ok: false, why: 'матч не в эфире' };
  const side = m.t1 === me ? 1 : m.t2 === me ? 2 : 0; if (!side) return { ok: false, why: 'это не ваш матч' };
  if (st.overtime || st.round < 12 || st.round > 15) return { ok: false, why: 'решение на вторую половину принимается в перерыве (раунды 12–15)' };
  if (st.v31Half?.[st.mapIndex]) return { ok: false, why: 'решение на эту карту уже принято' };
  const rep = halfReport(st, side), opt = rep.options.find(o => o.k === key); if (!opt) return { ok: false };
  const v = opt.good ? .022 : -.006;
  st.v31Half = st.v31Half || {}; st.v31Half[st.mapIndex] = { side, key, v };
  st.pauseImpact = st.pauseImpact || { 1: null, 2: null };
  st.pauseImpact[side] = { team: me, base: opt.l, startedRound: st.round, roundsLeft: 6, boost: v, user: true };
  try { addBroadcastEvent(st, `📋 <b>${me}</b> на вторую половину: ${opt.l}`, 'tactic'); } catch (e) {}
  return { ok: true, good: opt.good };
}

/* ------------------------------------------------------------ события (единый движок) */
// событие: { id, key, ts, s, type, team, actors[], title, text, options[{k,l,d}], status: open|done|expired, choice, until }
const EV = {};
function raise(type, team, actors, data) {
  const c = S(), key = `${type}|${team}|${(actors || []).join(',')}|${data.keySuffix || season()}`;
  if (c.evKeys[key]) return null;                                                   // защита от повторного срабатывания
  c.evKeys[key] = calNow();
  const ev = { id: 'e' + (++c.evSeq).toString(36), key, ts: calNow(), s: season(), type, team, actors: actors || [], title: data.title, text: data.text, options: data.options, status: 'open', until: calNow() + (data.days || 10) * DAY, data: data.data || {} };
  c.events.unshift(ev); if (c.events.length > 120) c.events.length = 120;
  const ks = Object.keys(c.evKeys); if (ks.length > 400) ks.slice(0, ks.length - 400).forEach(k => delete c.evKeys[k]);
  if (!isManaged(team) || auto('events')) resolve(ev.id, EV[type].ai(ev), true);
  else emit('career-event', { id: ev.id, team, title: ev.title, type });
  return ev;
}
function resolve(id, k, silent) {
  const c = S(), ev = c.events.find(e => e.id === id); if (!ev || ev.status !== 'open') return { ok: false, why: 'событие уже закрыто' };
  const def = EV[ev.type]; if (!def) return { ok: false };
  const opt = ev.options.find(o => o.k === k) || ev.options[0];
  let res = ''; try { res = def.apply(ev, opt.k) || ''; } catch (e) { console.warn('[v31 event]', e); }
  ev.status = 'done'; ev.choice = opt.k; ev.result = res; ev.doneAt = calNow();
  if (isManaged(ev.team)) careerLog(`${ev.title} → ${opt.l}${res ? ': ' + res : ''}`);
  return { ok: true, res };
}
const P_ = (t, nick) => (t?.players || []).find(p => p.nick === nick);
EV.unhappy = { // звезда недовольна положением команды
  check(t) { const rk = rankOf(t.name); if (rk < 10) return; const p = (t.players || []).map(ensurePerson).filter(p => p.pers.amb >= 14 && pow(p) >= 86).sort((a, b) => pow(b) - pow(a))[0];
    if (p) raise('unhappy', t.name, [p.nick], { title: `${p.nick} недоволен перспективами`, text: `Амбициозный ${p.role} считает, что ${t.name} (#${rk}) не борются за трофеи, и намекает на уход.`, options: [{ k: 'raise', l: 'Повысить зарплату (+25%)', d: 'Мораль и уверенность растут, расходы на зарплату выше' }, { k: 'list', l: 'Выставить на трансфер', d: 'Игрок станет доступен для покупки другими клубами' }, { k: 'ignore', l: 'Ничего не менять', d: 'Мораль падает; позже он может потребовать перехода' }], data: { nick: p.nick } }); },
  ai: ev => byName(ev.team) && org(ev.team).budget > 600000 ? 'raise' : 'list',
  apply(ev, k) { const t = byName(ev.team), p = P_(t, ev.data.nick); if (!p) return 'игрок уже в другой команде';
    if (k === 'raise') { p.salary = Math.round(p.salary * 1.25 / 1000) * 1000; p.morale = clamp((+p.morale || 85) + 8, 40, 100); p.conf = clamp(p.conf + 5, 5, 98); p.pers.loy = clamp(p.pers.loy + 2, 1, 20); return `зарплата ${money(p.salary)} за сезон`; }
    if (k === 'list') { p.v31listed = calNow(); return 'игрок доступен на рынке'; }
    p.morale = clamp((+p.morale || 85) - 10, 30, 100); p.pers.loy = clamp(p.pers.loy - 3, 1, 20); return 'мораль снизилась'; }
};
EV.confidence = { // кризис уверенности
  check(t) { const p = (t.players || []).map(ensurePerson).filter(p => p.conf < 32).sort((a, b) => a.conf - b.conf)[0];
    if (p) raise('confidence', t.name, [p.nick], { title: `${p.nick} теряет уверенность`, text: `Серия неудач сказалась на игроке: уверенность ${Math.round(p.conf)} из 100.`, options: [{ k: 'psych', l: 'Работа с психологом ($40 000)', d: 'Сильнее с отделом спортивной психологии' }, { k: 'talk', l: 'Личный разговор с тренером', d: 'Бесплатно, помогает умеренно' }, { k: 'none', l: 'Пусть играет через кризис', d: 'Может восстановиться сам — или нет' }], data: { nick: p.nick } }); },
  ai: ev => org(ev.team).budget > 300000 ? 'psych' : 'talk',
  apply(ev, k) { const t = byName(ev.team), p = P_(t, ev.data.nick); if (!p) return '';
    if (k === 'psych') { book(ev.team, -40000, 'fac', 'Спортивный психолог'); const g = 10 + 6 * (org(ev.team).fac.psych || 0); p.conf = clamp(p.conf + g, 5, 98); return `уверенность +${g}`; }
    if (k === 'talk') { const g = 5 + Math.round(p.pers.prof / 4); p.conf = clamp(p.conf + g, 5, 98); return `уверенность +${g}`; }
    p.conf = clamp(p.conf + (p.pers.press >= 12 ? 6 : -3), 5, 98); return p.pers.press >= 12 ? 'игрок справился сам' : 'кризис затянулся'; }
};
EV.captain = { // капитан просит усиления
  check(t) { const igl = (t.players || []).map(ensurePerson).find(p => p.role === 'IGL'); if (!igl || igl.pers.lead < 15 || rankOf(t.name) <= 6) return;
    const rec = (t.history || []).filter(h => h.place > 0 && !h.isBootcamp && !h.isSeasonAward).slice(0, 3); if (rec.length < 3 || rec.reduce((s, h) => s + h.place, 0) / 3 < 9) return;
    raise('captain', t.name, [igl.nick], { title: `Капитан ${igl.nick} просит усилить состав`, text: `Три турнира подряд без плей-офф. ${igl.nick} считает, что команде не хватает огневой мощи.`, options: [{ k: 'sign', l: 'Искать усиление на рынке', d: 'Клуб попробует купить игрока сейчас (нужен бюджет)' }, { k: 'trust', l: 'Сохранить состав', d: 'Сыгранность растёт, но капитан разочарован' }], data: { nick: igl.nick } }); },
  ai: ev => org(ev.team).budget > 800000 ? 'sign' : 'trust',
  apply(ev, k) { const t = byName(ev.team);
    if (k === 'sign') { t.v31wantBuy = calNow(); const ok = window.v30MarketTick ? (window.__v31ForceBuy = ev.team, window.v30MarketTick('week'), window.__v31ForceBuy = null, true) : false; return ok ? 'клуб вышел на рынок' : ''; }
    t.v31chemBonus = clamp((t.v31chemBonus || 0) + .03, 0, .12); const p = P_(t, ev.data.nick); if (p) p.morale = clamp((+p.morale || 85) - 6, 30, 100); return 'сыгранность растёт, капитан недоволен'; }
};
EV.veteran = { // ветеран готов стать лидером
  check(t) { const igl = (t.players || []).find(p => p.role === 'IGL'); const v = (t.players || []).map(ensurePerson).filter(p => p !== igl && (+p.age || 0) >= 29 && p.pers.lead >= 16 && p.role !== 'AWPer')[0];
    if (v && igl && ensurePerson(igl).pers.lead < v.pers.lead - 4) raise('veteran', t.name, [v.nick, igl.nick], { title: `${v.nick} готов взять на себя роль капитана`, text: `Опытный ${v.nick} (${v.age}) пользуется авторитетом в команде больше, чем нынешний капитан ${igl.nick}.`, options: [{ k: 'swap', l: 'Передать роль IGL', d: 'Роли меняются; сыгранность временно падает' }, { k: 'keep', l: 'Оставить всё как есть', d: 'Без изменений' }], data: { v: v.nick, igl: igl.nick } }); },
  ai: ev => 'keep',
  apply(ev, k) { if (k !== 'swap') return ''; const t = byName(ev.team), v = P_(t, ev.data.v), g = P_(t, ev.data.igl); if (!v || !g) return 'состав изменился'; const r = v.role; v.role = 'IGL'; g.role = r; t.v31chemBonus = Math.max(0, (t.v31chemBonus || 0) - .04); try { ensurePlayerLayer(t); } catch (e) {} return `${v.nick} — новый капитан`; }
};
EV.clash = { // конфликт двух амбициозных игроков с плохой коммуникацией
  check(t) { const ps = (t.players || []).map(ensurePerson).filter(p => p.pers.amb >= 13 && p.pers.comm <= 8); if (ps.length < 2 || teamConf(t) > 62) return;
    raise('clash', t.name, [ps[0].nick, ps[1].nick], { title: `Конфликт в ${t.name}: ${ps[0].nick} и ${ps[1].nick}`, text: 'Два амбициозных игрока не находят общий язык — это мешает коммуникации в раундах.', options: [{ k: 'mediate', l: 'Тимбилдинг и разговор ($30 000)', d: 'Сыгранность сохраняется' }, { k: 'list', l: 'Выставить одного на трансфер', d: 'Проблема уйдёт вместе с игроком' }, { k: 'ignore', l: 'Не вмешиваться', d: 'Сыгранность падает' }], data: { a: ps[0].nick, b: ps[1].nick } }); },
  ai: ev => org(ev.team).budget > 200000 ? 'mediate' : 'ignore',
  apply(ev, k) { const t = byName(ev.team);
    if (k === 'mediate') { book(ev.team, -30000, 'fac', 'Тимбилдинг'); [ev.data.a, ev.data.b].forEach(n => { const p = P_(t, n); if (p) p.pers.comm = clamp(p.pers.comm + 2, 1, 20); }); return 'коммуникация улучшилась'; }
    if (k === 'list') { const p = P_(t, ev.data.b) || P_(t, ev.data.a); if (p) p.v31listed = calNow(); return p ? `${p.nick} выставлен на трансфер` : ''; }
    t.v31chemBonus = Math.max(0, (t.v31chemBonus || 0) - .05); return 'сыгранность снизилась'; }
};
EV.sponsor = { // спонсор недоволен результатами
  check(t) { const o = org(t.name); if (!o.sponsor || (o.sponsor.strikes || 0) < 6) return;
    raise('sponsor', t.name, [], { title: `${o.sponsor.name} недоволен результатами`, text: `Команда ниже цели контракта (топ-${o.sponsor.target}) уже несколько недель.`, options: [{ k: 'promise', l: 'Пообещать результат', d: 'Если цель не будет достигнута — выплаты урежут сильнее' }, { k: 'media', l: 'Медиа-кампания ($120 000)', d: 'Спонсор даёт время, репутация растёт' }, { k: 'cut', l: 'Согласиться на снижение выплат (−15%)', d: 'Надёжно, но дешевле' }], data: {}, keySuffix: season() + '-' + Math.floor(calNow() / (60 * DAY)) }); },
  ai: ev => org(ev.team).budget > 500000 ? 'media' : 'cut',
  apply(ev, k) { const o = org(ev.team);
    if (k === 'media') { book(ev.team, -120000, 'fac', 'Медиа-кампания'); o.rep = clamp(o.rep + 4, 0, 100); o.sponsor.strikes = 0; return 'спонсор дал время'; }
    if (k === 'cut') { o.sponsor.perSeason = Math.round(o.sponsor.perSeason * .85); o.sponsor.strikes = 0; return `выплаты ${money(o.sponsor.perSeason)} за сезон`; }
    o.sponsor.strikes = 3; o.sponsor.promised = calNow(); return 'обещание дано'; }
};
EV.crisis = { // финансовый кризис
  check(t) { const o = org(t.name); if (o.budget > -150000) return;
    raise('crisis', t.name, [], { title: `Финансовый кризис в ${t.name}`, text: `Баланс организации отрицательный: ${money(o.budget)}.`, options: [{ k: 'sell', l: 'Продать самого дорогого игрока', d: 'Он появится на рынке, выручка покроет долг' }, { k: 'cut', l: 'Сократить объекты', d: 'Понизить уровень самого дорогого объекта' }, { k: 'loan', l: 'Кредит ($500 000, вернуть $600 000)', d: 'Выплаты в течение сезона' }], data: {}, keySuffix: season() + '-' + Math.floor(calNow() / (45 * DAY)) }); },
  ai: ev => (org(ev.team).fac.training || 0) >= 2 ? 'cut' : 'sell',
  apply(ev, k) { const t = byName(ev.team), o = org(ev.team);
    if (k === 'sell') { const p = (t.players || []).slice().sort((a, b) => valueOf(b) - valueOf(a))[0]; if (p) p.v31listed = calNow(); return p ? `${p.nick} выставлен на продажу` : ''; }
    if (k === 'cut') { const kk = Object.keys(o.fac).sort((a, b) => (o.fac[b] || 0) - (o.fac[a] || 0))[0]; if (o.fac[kk] > 0) o.fac[kk]--; return `${FAC[kk]}: уровень ${o.fac[kk]}`; }
    book(ev.team, 500000, 'trans', 'Кредит'); o.debt = (o.debt || 0) + 600000; return 'кредит получен'; }
};
EV.youth = { // молодой талант просится в основу
  check(t) { const o = org(t.name);
    // v86: у компьютерных клубов «кого убрать» решает общая логика слабого звена — хорошего капитана за низкую стрельбу не убирают
    let w = null; if (!isManaged(t.name)) { try { w = window.v30MarketDebug?.weakLink?.(t)?.p || null; } catch (e) {} if (!w) return; } else w = (t.players || []).slice().sort((a, b) => pow(a) - pow(b))[0]; const pr = (o.prospects || []).filter(p => p.age >= 17 && pow(p) >= pow(w || {}) - 1).sort((a, b) => pow(b) - pow(a))[0];
    if (pr && w) raise('youth', t.name, [pr.nick, w.nick], { title: `${pr.nick} (${pr.age}) просится в основу`, text: `Воспитанник академии уже почти не уступает ${w.nick} (${Math.round(pow(pr))} против ${Math.round(pow(w))}).`, options: [{ k: 'promote', l: 'Поднять в основу', d: `${w.nick} уходит на скамейку` }, { k: 'wait', l: 'Пусть ещё поиграет в академии', d: 'Мораль таланта снижается' }], data: { pr: pr.nick, w: w.nick } }); },
  ai: ev => { const o = org(ev.team), t = byName(ev.team), pr = (o.prospects || []).find(p => p.nick === ev.data.pr), w = P_(t, ev.data.w); return pr && w && pow(pr) >= pow(w) + 1 ? 'promote' : 'wait'; },
  apply(ev, k) { if (k === 'promote') return promoteProspect(ev.team, ev.data.pr, ev.data.w) ? 'игрок в основном составе' : 'не удалось (роли или состав изменились)';
    const pr = (org(ev.team).prospects || []).find(p => p.nick === ev.data.pr); if (pr) pr.morale = clamp((+pr.morale || 85) - 8, 30, 100); return 'талант остаётся в академии'; }
};
function weekEvents() {
  const c = S();
  c.events.forEach(e => { if (e.status === 'open' && calNow() > e.until) { const def = EV[e.type]; resolve(e.id, def.ai(e), true); e.status = 'expired'; } });
  teams.forEach(t => { if (t.isAcademy) return; Object.values(EV).forEach(def => { try { if (u01('ev|' + t.name + calNow() + def.apply.length) < .5) def.check(t); } catch (e) {} }); });
  // кредит: выплаты
  teams.forEach(t => { const o = org(t.name); if (o.debt > 0) { const pay = Math.min(o.debt, 600000 / 24); o.debt -= pay; book(t.name, -pay, 'trans', 'Выплата кредита'); } });
}

/* ------------------------------------------------------------ академия: таланты */
const SYL = [['ka', 'zy', 'ro', 'me', 'sha', 'vi', 'lu', 'de', 'ny', 'ox'], ['ri', 'nn', 'xo', 'ke', 'la', 'ze', 'mi', 'ty', 'rk', 'vo'], ['', 'x', 'n', '1', 'z', 'k', 'o', 'r', 'y', 's']];
function prospectNick(seed) { for (let i = 0; i < 50; i++) { const h = h32(seed + ':' + i), n = SYL[0][h % 10] + SYL[1][(h >>> 4) % 10] + SYL[2][(h >>> 8) % 10]; const taken = teams.some(t => (t.players || []).some(p => p.nick.toLowerCase() === n)) || (transferState.freeAgents || []).some(p => p.nick.toLowerCase() === n) || Object.values(S().orgs).some(o => (o.prospects || []).some(p => p.nick === n)); if (!taken) return n; } return 'yth' + (h32(seed) % 9999); }
function youthIntake() { // раз в сезон: новые таланты по уровню академии и скаутинга
  const s = season();
  pro().forEach(t => {
    const o = org(t.name); if (o.intake === s) return; o.intake = s; o.prospects = o.prospects || [];
    const n = (o.fac.academy || 0) + ((o.fac.scouting || 0) >= 2 ? 1 : 0); if (!n) return;
    for (let i = 0; i < n && o.prospects.length < 6; i++) {
      const seed = t.name + s + i, roles = ['Rifler', 'Entry-fragger', 'Support', 'Lurker', 'AWPer'];
      const pot = clamp(68 + Math.pow(u01('pp' + seed), 1.6) * 26 + (o.fac.academy || 0) * 1.2 + (o.fac.scouting || 0) * .5, 66, 97);   // звёздный потенциал — редкость
      const base = clamp(62 + u01('pb' + seed) * 9, 60, 74);
      const country = (t.players || [])[0]?.country || 'EU';
      const rx = window.V33Reserve ? (window.V33Reserve.take({ countries: [country], max: 62, young: true }) || window.V33Reserve.take({ max: 66, young: true })) : null;   // v33: реальные молодые игроки из резерва
      o.prospects.push({ nick: rx ? rx.nick : prospectNick(seed), age: 16 + (h32(seed) % 3), role: roles[h32('r' + seed) % roles.length], country: rx ? rx.country : country, flag: rx && typeof countryFlag === 'function' ? countryFlag(rx.country) : ((t.players || [])[0]?.flag || '🌍'), firepower: base + 2, tacticalIQ: base - 2, clutch: base, utility: base - 1,
        pot: Math.round(pot * 10) / 10, morale: 88, form: 100, fatigue: 0, exp: 0, joined: s, hist: [{ s, pw: Math.round(base * 10) / 10 }], pers: (() => { const x = {}; TRAITS.forEach(k => { x[k] = 4 + Math.round(u01(k + seed) * 15); }); return x; })(), conf: 60, status: 'PROSPECT' });
    }
    if (isManaged(t.name) && n) careerLog(`Академия: в набор сезона ${s} вошли ${n} ${n === 1 ? 'игрок' : 'игрока'}`);
  });
}
function weekYouth() { // развитие: потенциал, возраст, академия, профессионализм; плато и прорывы
  const s = season();
  Object.entries(S().orgs).forEach(([name, o]) => (o.prospects || []).forEach(p => {
    const room = Math.max(0, p.pot - pow(p)); if (room <= 0) return;
    const phase = u01('ph' + p.nick + s);                                            // в каждом сезоне свой ритм: плато / норма / прорыв
    const k = (phase < .18 ? .25 : phase > .9 ? 1.9 : 1) * (.5 + .25 * (o.fac.academy || 0)) * (.6 + p.pers.prof / 25) * (p.age <= 19 ? 1.2 : 1);
    const g = Math.min(room, room * .018 * k + .02);
    ['firepower', 'tacticalIQ', 'clutch', 'utility'].forEach(a => { p[a] = Math.round((p[a] + g * (a === 'firepower' && /Entry|AWP/.test(p.role) ? 1.2 : 1)) * 100) / 100; });
    p.exp = Math.round(((p.exp || 0) + 1) * 10) / 10;
    const last = p.hist[p.hist.length - 1]; if (!last || last.s !== s) p.hist.push({ s, pw: Math.round(pow(p) * 10) / 10 }); else last.pw = Math.round(pow(p) * 10) / 10;
    if (p.hist.length > 8) p.hist.shift();
  }));
  // молодые игроки в составах академий и команд тоже растут к потенциалу (умеренно)
  // v92: рост молодых игроков в составах к потенциалу считает годовая модель развития (CS2Develop) — здесь он больше не дублируется
  if (!window.CS2Develop) teams.forEach(t => { const lvl = org(t.name).fac.academy || 0; (t.players || []).forEach(p => { ensurePerson(p); if ((+p.age || 25) > 22) return; const room = p.pot - pow(p); if (room <= .5) return; const g = room * .006 * (1 + .3 * lvl) * (.7 + p.pers.prof / 30); ['firepower', 'clutch'].forEach(a => { p[a] = clamp(Math.round((+p[a] + g) * 100) / 100, 50, 99); }); }); });
}
// v131: воспитанник, переросший молодёжную программу (23+), больше не исчезает молча: клуб продаёт его в команду топ-30,
// где он усиливает слабое звено (деньги — клубу); если покупателя нет — он уходит свободным агентом и об этом пишут новости.
function seasonAge() { const s = season(); Object.entries(S().orgs).forEach(([name, o]) => { if (o.aged === s) return; o.aged = s; (o.prospects || []).forEach(p => { p.age++; });
  (o.prospects || []).filter(p => p.age > 22).forEach(p => { try { delete p.hist; p.status = 'FREE AGENT'; p.salary = salaryOf(p, null);
    const to = window.v131SellTalent ? window.v131SellTalent(p, name) : null;
    if (!to) { if (!transferState.freeAgents.some(x => x.nick === p.nick)) transferState.freeAgents.push(p); emit('release', { player: p.nick, role: p.role, from: `${name}: молодёжная программа`, to: 'Свободный агент', reason: 'вырос из молодёжной программы, покупателя в топ-30 не нашлось' }); }
  } catch (e) {} });
  o.prospects = (o.prospects || []).filter(p => p.age <= 22); }); }
function estPot(name, p) { // оценка скаута: погрешность зависит от скаутского отдела, детерминирована
  const lvl = org(name).fac.scouting || 0, err = [10, 7, 4, 2][lvl], d = (u01('est' + p.nick + name) - .5) * 2 * err;
  return { lo: Math.round(clamp(p.pot + d - err, 50, 99)), hi: Math.round(clamp(p.pot + d + err, 50, 99)), err };
}
// v90: повышение воспитанника — через Roster Engine. Для менеджера правила — предупреждения, для ИИ — запрет.
function promoteProspect(teamName, nick, outNick) {
  const t = byName(teamName), R = window.CS2Roster; if (!R || !t) return promoteProspectImpl(teamName, nick, outNick);
  const pr = (org(teamName).prospects || []).find(p => p.nick === nick); if (!pr) return false;
  let out = outNick ? P_(t, outNick) : null;
  if (!out) { try { out = !isManaged(teamName) ? window.v30MarketDebug?.weakLink?.(t)?.p || null : null; } catch (e) {} }
  if (!out) out = (t.players || []).slice().sort((a, b) => pow(a) - pow(b))[0];
  return R.run({ kind: 'academy', team: t, out, incoming: pr, actor: isManaged(teamName) ? 'user' : 'ai', reason: 'повышение воспитанника' }, () => promoteProspectImpl(teamName, nick, outNick));
}
function promoteProspectImpl(teamName, nick, outNick) {
  let pi; const t = byName(teamName), o = org(teamName); pi = (o.prospects || []).findIndex(p => p.nick === nick); if (!t || pi < 0) return false;
  let pr = o.prospects[pi];
  // v86: компьютерный клуб убирает в запас настоящее слабое звено (хороший капитан им не бывает), а не просто игрока с худшей стрельбой
  let auto = null; try { auto = !outNick && !isManaged(teamName) ? window.v30MarketDebug?.weakLink?.(t)?.p || null : null; } catch (e) {}
  const out = outNick ? P_(t, outNick) : (auto || (t.players || []).slice().sort((a, b) => pow(a) - pow(b))[0]); if (!out) return false;
  // v84: повышение идёт из настоящей академии клуба (Spirit Academy, NAVI Junior, G2 Ares, MOUZ NXT…):
  // в основу поднимается лучший игрок академии, а талант из молодёжной программы занимает его место в академии.
  // Клубы без академии повышать некого — только своя команда игрока в карьере пользуется молодёжной программой напрямую.
  const acadName = Object.entries(window.V21AcademyParent || {}).find(([, par]) => par === teamName)?.[0] || null;
  const acad = acadName ? byName(acadName) : null;
  let fromLabel = `${teamName}: молодёжная программа`;
  if (acad && (acad.players || []).length) {
    const best = acad.players.filter(p => p && p.nick && p.status !== 'BENCH').sort((a, b) => pow(b) - pow(a))[0];
    if (best && pow(best) >= pow(pr) - 1) {
      const ix = acad.players.indexOf(best), incoming = JSON.parse(JSON.stringify(pr)); delete incoming.hist; incoming.status = 'STARTER'; incoming.v31team = acad.name;
      acad.players[ix] = incoming; o.prospects.splice(pi, 1); pi = -1;
      pr = best; try { ensurePlayerLayer(acad); } catch (e) {}
    }
    fromLabel = acad.name;
  } else if (!isManaged(teamName)) return false;
  const uniq = ['AWPer', 'IGL'];
  if (uniq.includes(pr.role) && pr.role !== out.role && (t.players || []).some(p => p !== out && p.role === pr.role)) pr.role = uniq.includes(out.role) ? out.role : 'Rifler';
  // v86: молодой игрок из академии не становится капитаном — роль IGL переходит к самому готовому игроку состава
  let newCap = null;
  if (out.role === 'IGL') {
    const capScore = window.CS2CaptainScore || (p => +p.tacticalIQ || 0);
    newCap = (t.players || []).filter(p => p && p !== out && p.status !== 'BENCH' && p.role !== 'AWPer').sort((a, b) => capScore(b) - capScore(a))[0] || null;
    if (newCap && (+newCap.tacticalIQ || 0) >= (+pr.tacticalIQ || 0) - 3) { newCap.role = 'IGL'; newCap.v84roleLocked = 1; if (pr.role === 'IGL' || pr.role === 'AWPer') pr.role = 'Rifler'; }
    else { newCap = null; pr.role = 'IGL'; }
  } else if (uniq.includes(out.role) && pr.role !== out.role) pr.role = out.role;
  const np = JSON.parse(JSON.stringify(pr)); np.v84roleLocked = 1; np.status = 'STARTER'; np.contractUntil = season() + 3; np.salary = salaryOf(np, t); np.v31team = t.name; np.v31since = calNow(); np.academyGrad = teamName; delete np.hist;
  t.players[t.players.indexOf(out)] = np; if (pi >= 0) o.prospects.splice(pi, 1);
  out.status = 'BENCH'; out.benchFrom = t.name;
  if (!t.isAcademy) { out.v30ProOrigin = true; out.v30LastProTeam = t.name; out.v31team = out.v31team || t.name; }
  transferState.freeAgents.push(out);
  (transferState.v30Bench = transferState.v30Bench || []).push({ nick: out.nick, team: t.name, since: Number(transferState.marketRuns) || 0 });
  try { ensurePlayerLayer(t); } catch (e) {}
  emit('promotion', { player: np.nick, role: np.role, from: fromLabel, to: teamName, out: out.nick, age: np.age, reason: acad ? 'воспитанник академии клуба' : 'воспитанник молодёжной программы' });
  emit('bench', { player: out.nick, role: out.role, from: teamName, to: 'Скамейка', reason: `в запасе: ${(window.CS2OutWhy && window.CS2OutWhy(t, out, np)) || 'клуб доверил место воспитаннику ' + np.nick}` });
  if (newCap) { try { window.V29News?.add?.({ cat: 'transfer', icon: '🧠', imp: 5, team: teamName, player: newCap.nick, title: `${newCap.nick} — новый капитан ${teamName}`, lead: `${out.nick} уходит в запас, роль IGL переходит к ${newCap.nick}.`, body: [`В состав поднят ${np.nick} из ${fromLabel}.`], tags: [{ t: 'player', v: newCap.nick }, { t: 'team', v: teamName }] }); } catch (e) {} }
  return true;
}
function sellProspect(teamName, nick) { // продажа таланта в команду Tier-2/3 через тот же рынок свободных агентов
  const o = org(teamName), pi = (o.prospects || []).findIndex(p => p.nick === nick); if (pi < 0) return false;
  const p = o.prospects.splice(pi, 1)[0], fee = Math.round(valueOf(p) * .6 / 1000) * 1000;
  delete p.hist; p.status = 'FREE AGENT'; p.salary = salaryOf(p, null); transferState.freeAgents.push(p);
  book(teamName, fee, 'trans', `Продажа таланта ${p.nick}`);
  emit('release', { player: p.nick, role: p.role, from: `${teamName}: молодёжная программа`, to: 'Свободный агент', reason: `продан за ${money(fee)}` });
  return fee;
}

/* ------------------------------------------------------------ рынок: деньги и характер */
// выкуп двигает деньги; покупатель без бюджета не может купить (для всех, включая окно после Major)
(() => { const f = window.applyPlayerTransfer; if (typeof f !== 'function' || f.__v31) return;
  const w = function (fromTeam, toTeam, player, reason) {
    if (!fromTeam || !toTeam || !player) return f.apply(this, arguments);
    if (isManaged(toTeam.name) && !auto('market') && !window.__v31UserDeal && window.__v31ForceBuy !== toTeam.name) return false;   // за управляемую команду AI не покупает
    if (isManaged(fromTeam.name) && !auto('market') && !window.__v31UserDeal && !player.v31listed) return false;                     // и не продаёт её игроков без разрешения
    ensurePerson(player);
    const fee = window.__v31UserDeal?.fee ?? Math.round(valueOf(player) * (player.v31listed ? .8 : 1) * (window.__v99FeeMul || 1) / 1000) * 1000;   // v99.2: выкуп по ходу сезона дороже
    if (org(toTeam.name).budget - fee < -300000) return false;
    const ok = f.apply(this, arguments);
    if (ok) {
      book(toTeam.name, -fee, 'trans', `Выкуп ${player.nick} у ${fromTeam.name}`); book(fromTeam.name, fee, 'trans', `Продажа ${player.nick} в ${toTeam.name}`);
      const np = (toTeam.players || []).find(p => p.nick === player.nick); if (np) { np.salary = window.__v31UserDeal?.salary ?? Math.round(salaryOf(np, toTeam) * (1 + np.pers.amb / 60) / 1000) * 1000; np.v31team = toTeam.name; np.v31since = calNow(); delete np.v31listed; if (window.__v31UserDeal?.years) np.contractUntil = season() + window.__v31UserDeal.years; }
      (fromTeam.players || []).forEach(p => { ensurePerson(p); if (p.v31team !== fromTeam.name) { p.v31team = fromTeam.name; p.v31since = calNow(); } });
      if (isManaged(toTeam.name) || isManaged(fromTeam.name)) careerLog(`Трансфер: ${player.nick} ${fromTeam.name} → ${toTeam.name} за ${money(fee)}`);
    }
    return ok;
  };
  w.__v31 = true; Object.keys(f).forEach(k => { w[k] = f[k]; }); window.applyPlayerTransfer = w; try { applyPlayerTransfer = w; } catch (e) {} })();
// амбиции и лояльность решают, согласится ли игрок
(() => { const f = window.playerWillAccept; if (typeof f !== 'function' || f.__v31) return;
  const w = function (p, fromTeam, toTeam) { ensurePerson(p); const base = f.apply(this, arguments);
    const up = rankOf(fromTeam?.name) - rankOf(toTeam?.name);                          // > 0 — переход в более сильную команду
    if (p.pers.loy >= 16 && up < 6 && !p.v31listed) return false;                      // лояльный не уходит ради шага в сторону
    if (!base && p.pers.amb >= 15 && up >= 8) return true;                             // амбициозный идёт в топ даже против правил
    return base; };
  w.__v31 = true; window.playerWillAccept = w; try { playerWillAccept = w; } catch (e) {} })();

/* ------------------------------------------------------------ цели карьеры и наследие */
function careerLog(text) { const c = S(); c.career.log.unshift({ ts: calNow(), s: season(), text }); if (c.career.log.length > 200) c.career.log.length = 200; }
const GOALS = [
  { k: 'top10', l: 'Войти в мировой топ-10', ok: me => rankOf(me) && rankOf(me) <= 10 },
  { k: 'top5', l: 'Войти в топ-5', ok: me => rankOf(me) && rankOf(me) <= 5 },
  { k: 'no1', l: 'Стать командой №1 в мире', ok: me => rankOf(me) === 1 },
  { k: 't1title', l: 'Выиграть турнир Tier-1', ok: me => titles(me, ['regular', 'elite', 'major']) >= 1 },
  { k: 'stier', l: 'Выиграть S-Tier', ok: me => titles(me, ['elite']) >= 1 },
  { k: 'major', l: 'Выиграть Major', ok: me => titles(me, ['major']) >= 1 },
  { k: 'major2', l: 'Выиграть два Major', ok: me => titles(me, ['major']) >= 2 },
  { k: 'triple', l: 'Три титула Tier-1 за сезон', ok: me => titles(me, ['regular', 'elite', 'major'], season()) >= 3 },
  { k: 'academy', l: 'Поднять воспитанника академии в основу', ok: me => (byName(me)?.players || []).some(p => p.academyGrad === me) },
  { k: 'grad20', l: 'Воспитанник академии в Top 20 года', ok: me => { const A = window.RewardSystem?.getAllPlayerAwards?.() || (window.twAwardsExport ? window.twAwardsExport().p || {} : {}); return Object.entries(A).some(([n, r]) => (r.top || []).length && teams.some(t => (t.players || []).some(p => p.nick === n && p.academyGrad === me))); } },
  { k: 'dynasty', l: 'Династия: №1 в конце двух сезонов подряд', ok: me => { const sn = (seasonState.v30Rank?.snaps || []); const ends = {}; sn.forEach(x => { ends[x.s] = x; }); const ss = Object.keys(ends).map(Number).sort((a, b) => a - b); return ss.some((s, i) => i > 0 && ends[s].n[0] === me && ends[ss[i - 1]].n[0] === me && s < season()); } },
  { k: 'rebuild', l: 'Перестройка: из-за пределов топ-15 в топ-5', ok: me => !!S().career.wasOut15 && rankOf(me) <= 5 },
  { k: 'rich', l: 'Бюджет организации больше $5 млн', ok: me => org(me).budget >= 5e6 },
  { k: 'infra', l: 'Все объекты организации на уровне 2+', ok: me => Object.values(org(me).fac).every(l => l >= 2) }
];
function titles(name, kinds, s) { const arch = window.hubArchiveExport ? window.hubArchiveExport() : {}; return Object.values(arch).filter(x => x && x.champion === name && kinds.includes(x.prestige) && (!s || x.season === s)).length; }
function checkGoals() {
  const me = managed(); if (!me) return; const c = S();
  if (rankOf(me) > 15) c.career.wasOut15 = true;
  const ach = c.career.ach[me] || (c.career.ach[me] = {});
  GOALS.forEach(g => { if (ach[g.k]) return; let ok = false; try { ok = g.ok(me); } catch (e) {} if (ok) { ach[g.k] = { ts: calNow(), s: season() }; careerLog(`Цель выполнена: ${g.l}`); emit('career-goal', { team: me, goal: g.l }); } });
}

/* ------------------------------------------------------------ недельный цикл */
let busy = false;
function week() {
  if (busy) return; busy = true;
  try { S(); stampTenure(); youthIntake(); seasonAge(); weekEconomy(); weekTraining(); weekYouth(); weekEvents(); checkGoals(); }
  catch (e) { console.warn('[v31 week]', e); }
  finally { busy = false; try { saveTeams(); saveSeasonState(); } catch (e) {} }
}
function syncCareerClock(){
  try {
    const c=S(), now=calNow();
    if(!c.weekMs || now<c.weekMs){ c.weekMs=now; return 0; }
    let n=0;
    while(now-c.weekMs>=WEEK){ c.weekMs+=WEEK; week(); n++; }
    return n;
  } catch(e){ console.warn('[v31]',e); return 0; }
}
async function weekCooperative(){
  if (busy) return false; busy = true;
  const runStage = async fn => { fn(); await (window.CS2Yield ? window.CS2Yield.maybe(10) : Promise.resolve(false)); };
  try {
    S();
    await runStage(stampTenure);
    await runStage(youthIntake);
    await runStage(seasonAge);
    await runStage(weekEconomy);
    await weekTrainingCooperative();
    await runStage(weekYouth);
    await runStage(weekEvents);
    await runStage(checkGoals);
  } catch (e) { console.warn('[v31 cooperative week]', e); }
  finally { busy = false; try { saveTeams(); saveSeasonState(); } catch (e) {} }
  return true;
}
async function syncCareerClockCooperative(){
  try {
    const c=S(), now=calNow();
    if(!c.weekMs || now<c.weekMs){ c.weekMs=now; return 0; }
    let n=0;
    while(now-c.weekMs>=WEEK){ c.weekMs+=WEEK; await weekCooperative(); n++; await (window.CS2Yield ? window.CS2Yield.maybe(10) : Promise.resolve(false)); }
    return n;
  } catch(e){ console.warn('[v31 cooperative clock]',e); return 0; }
}
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; syncCareerClock(); }, 1500);
// после турнира: призовые, соперничества, цели
(() => { const f = window.finalizeTournamentRating; if (typeof f !== 'function' || f.__v31) return;
  const w = function () { const ct = typeof currentTournament !== 'undefined' ? currentTournament : null, done = ct?.completed; const r = f.apply(this, arguments);
    try { if (ct && !done && ct.completed && ct.hubArchiveId) { const snap = (window.hubArchiveExport() || {})[ct.hubArchiveId]; payPrizes(snap); computeRivals(); checkGoals(); if (isManaged(snap?.champion)) careerLog(`Титул: ${snap.name}`); } } catch (e) { console.warn('[v31 finalize]', e); }
    return r; };
  w.__v31 = true; Object.keys(f).forEach(k => { w[k] = f[k]; }); window.finalizeTournamentRating = w; try { finalizeTournamentRating = w; } catch (e) {} })();
// Параллельные турниры тоже платят призовые. Во время пакетной перемотки
// архив сканируется один раз в финале, а не каждые четыре реальные секунды.
let v31ParallelPrizeArchiveRevision = -1;
function syncParallelPrizes(force = false){
  try {
    const revision = typeof window.hubArchiveRevision === 'function' ? Number(window.hubArchiveRevision()) : null;
    if (!force && revision !== null && Number.isFinite(revision) && revision === v31ParallelPrizeArchiveRevision) return 0;
    let candidates = [];
    const changes = typeof window.hubArchiveChangesSince === 'function' && revision !== null
      ? window.hubArchiveChangesSince(v31ParallelPrizeArchiveRevision) : null;
    if (changes && !changes.reset && typeof window.hubArchiveGet === 'function') {
      candidates = changes.ids.map(id => window.hubArchiveGet(id)).filter(Boolean);
    } else {
      const arch = window.hubArchiveExport ? window.hubArchiveExport() : {};
      candidates = Object.values(arch);
    }
    let paid = 0;
    // v89: квалификации этого сезона, помеченные оплаченными без фонда (до v89), оплачиваются один раз
    candidates.forEach(s => { if (s && /^P-/.test(s.id) && s.v31paid && s.prestige === 'qual' && s.v31pool == null && s.season === season()) { s.v31paid = 0; } });
    candidates.forEach(s => { if (s && /^P-/.test(s.id) && !s.v31paid && s.season === season()) { payPrizes(s); paid++; } });
    v31ParallelPrizeArchiveRevision = typeof window.hubArchiveRevision === 'function'
      ? Number(window.hubArchiveRevision()) : (revision ?? v31ParallelPrizeArchiveRevision);
    return paid;
  } catch (e) { return 0; }
}
window.V31SyncParallelPrizes = syncParallelPrizes;
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(!window.v57BatchCalendarSkip && !document.hidden) syncParallelPrizes(); }, 8000);
setTimeout(() => { try { S(); stampTenure(); teams.forEach(t => (t.players || []).forEach(ensurePerson)); pro().forEach(t => org(t.name)); computeRivals(); } catch (e) { console.warn('[v31 init]', e); } }, 900);

window.V31 = { S, org, FAC, FAC_COST, FAC_UPKEEP, upgrade, downgrade, TRAIN, TRAIN_ALIAS, trainKey, INTENS, TRAIT_L, CALLS, MODES, scout, setPrep, prepMod, chemistry, teamConf, careerMod, teamMod, ensurePerson, valueOf, salaryOf, wageBill, facUpkeep,
  setManaged: n => { const c = S(); c.career.team = n || ''; c.career.since = c.career.since || {}; if (n && !c.career.since[n]) c.career.since[n] = { ts: calNow(), s: season() }; },
  userTimeout, chooseHalf, halfReport, resolve, EV, estPot, promoteProspect, sellProspect, rivalOf, computeRivals, GOALS, careerLog, money, managed, isManaged, rankOf, pow, auto, book, week, payPrizes, aiTrainingPlan,
  syncClock: syncCareerClock,
  syncClockCooperative: syncCareerClockCooperative,
  trainingDiagnostics: () => Object.assign({}, v31TrainingDiagnostics),
  _t: { weekTraining, weekTrainingCooperative, youthIntake, weekYouth, weekEconomy, ownerDividend, raise, callValue, markPrepUsed, buildTrainingMapStats },
  setMode: m => { const c = S(); if (!MODES[m]) return; c.mode = m; c.auto = Object.assign({}, MODES[m]); }, setAuto: (k, v) => { S().auto[k] = !!v; } };
console.info('[v31] карьера: организация, финансы, характер, тренировки, разведка, события');
})();
