/* v33 — реальные составы в пуле команд (новая игра и старые сохранения).
   1. Команда, у которой ни одного реального игрока, а в справочнике есть её состав, получает этот состав
      (The Mongolz раньше получала сгенерированных игроков из-за другого регистра в названии).
   2. SAW (состава в справочнике нет) заменяется командой с реальным составом — только вне идущего турнира.
   3. В пул добавляются команды из window.CS2_REAL.newTeams; занятые ники пропускаются, недостача —
      реальными свободными агентами; если реальных игроков не хватает, команда не добавляется.
   4. Из списка свободных агентов убираются сгенерированные игроки, пул пополняется реальными.
   5. Страна и флаг у всех игроков — из справочника, вместо глобуса. */
(function () {
'use strict';
const R = window.CS2_REAL;
if (!R || typeof teams === 'undefined' || typeof PLAYER_META_2026 === 'undefined') return;
const real = n => !!PLAYER_META_2026[n] || Object.values(TEAM_ROSTER_2026).some(r => r.includes(n));
const lc = s => String(s || '').toLowerCase();
const taken = () => new Set([...teams.flatMap(t => (t.players || []).map(p => lc(p.nick))), ...((transferState.freeAgents) || []).map(p => lc(p.nick))]);
const inPlay = name => { try { return !!(currentTournament && !currentTournament.completed && (currentTournament.participants || []).some(p => (p.name || p) === name)); } catch (e) { return false; } };
const FAKE_FA = new Set(['Jerry', 'k0mplex', 'n0vice', 'fak3r', 'm1nor', 'dreampy', 'n3gro', 'Kawz', 'deco', 'pH', 'Mistery', 'bodyz', 'Lucky7', 'Razz', 'neon', 'sik', 'madsen', 'JDC2', 'krux', 'nova',
  'r1ver', 's0ul', 'K1rill', 'nex1', 'v1ktor', 'Monk', 'sk0re', 'Lazuli', 'Kaze', 'Ming', 'Khosoo', 'sodbayar', 'Temu', 'Batu', 'Erdene', 'qw1n', 'Xerxes', 'paz2', 'Mert', 'cN',
  'nixer', 'Matti', 'Soto', 'Raku', 'l0pez', 'frosty', 'Eken', 'Malm', 'Kryo', 'Nils', 'Raven', 'michu2', 'Kaczor', 'Luker', 'Vex', 'Nilo', 'Revv', 'Meyzo', 'Karma', 'Slate']);
let changed = false;

/* ---- резерв реальных игроков (CS2_REAL.reserve): свободные агенты, замены, юниоры, таланты ---- */
// v86: в резерве были вторые ники игроков из составов (Techno4k = Techno из The Mongolz) — один человек числился дважды.
const aliasKey = window.CS2NickAlias || (n => String(n || '').toLowerCase());
const ROSTER_KEYS = new Set([...Object.keys(R.meta || {}), ...Object.values(R.rosters || {}).flat().map(x => typeof x === 'string' ? x : x && x.nick)].filter(Boolean).map(n => String(n).toLowerCase()));
const RESERVE = (() => { const seen = new Set(); return (R.reserve || []).map(([nick, country, skill]) => ({ nick, country, skill })).filter(x => {
  const k = aliasKey(x.nick); if (seen.has(k)) return false; seen.add(k);
  return !(k !== String(x.nick).toLowerCase() && ROSTER_KEYS.has(k)); }); })();
const RES_SET = new Set(RESERVE.map(x => lc(x.nick)));
const ACAD_NAMES = new Set(['VILBy', 'Kiryasoo', 'Netrix', 's1nside', 'k0gaSs', 'MahaR', 'FAZERY', 'skizzyee', 'yoki', 'kodak', 'SHiNE', 'hitori', 'Junyme', 'yksjupe', 'kl1m', 'opdust', 'ay0k', 'Nikodeon', 'eSx', 'mixer'].map(lc));
const isReal = n => real(n) || RES_SET.has(lc(n)) || ACAD_NAMES.has(lc(n)) || (R.freeAgents || []).some(x => lc(x) === lc(n)) || !!(window.CS2_EMDB_2026?.players?.[n]);
const GROUP = { CIS: ['RU', 'UA', 'BY', 'KZ', 'UZ', 'KG', 'TJ', 'AM', 'AZ', 'GE', 'MD'], NORD: ['DK', 'SE', 'NO', 'FI', 'IS'], BR: ['BR', 'AR', 'CL', 'UY', 'PE'], NA: ['US', 'CA'], OC: ['AU', 'NZ'], AS: ['CN', 'MN', 'ID', 'TH', 'PH', 'MY', 'SG', 'KR', 'JP', 'IN', 'VN'] };
const groupOf = c => Object.keys(GROUP).find(k => GROUP[k].includes(c)) || 'EU';
// v86: языковая группа страны (см. auto_script_1: LANG_COUNTRIES) — для команд с одним языком общения
const langCountries = g => (window.CS2_LANG_COUNTRIES || {})[g] || null;
function usedSet() {
  const u = new Set(teams.flatMap(t => (t.players || []).map(p => lc(p.nick))));
  ((transferState.freeAgents) || []).forEach(p => u.add(lc(p.nick)));
  ((transferState.retired) || []).forEach(r => u.add(lc(r?.nick || r)));
  try { Object.values(seasonState.v31?.orgs || {}).forEach(o => (o.prospects || []).forEach(p => u.add(lc(p.nick)))); } catch (e) {}
  (seasonState.v33ResUsed || []).forEach(n => u.add(lc(n)));
  return u;
}
// взять реального игрока из резерва: страна/регион, диапазон уровня; возвращает {nick,country,skill} или null
// известные ветераны — не годятся в «юниоры» и «таланты» (возраста в базе нет)
const VETS = new Set(['coldzera', 'felps', 'hen1', 'fer', 'fnx', 'taco', 'boltz', 'kngv-', 'lucas1', 'steel', 'br0', 'dennis', 'olofmeister', 'guardian', 'flusha', 'jw', 'krimz', 'pronax', 'xizt', 'f0rest', 'get_right', 'friberg', 'edward', 'zeus', 'seized', 'markeloff', 'adren', 'dosia', 'mou', 'n0thing', 'shroud', 'scream', 'kioshima', 'happy', 'nbk-', 'rpk', 'smithzz', 'kennys', 'maniac', 'allu', 'chayjesus', 'stewie2k', 'tarik', 'hiko', 'nitr0', 'elige', 'naf', 'twistzz', 'autimatic', 'skadoodle', 'freakazoid', 'fallen', 'gla1ve', 'xyp9x', 'dupreeh', 'magisk', 'device', 'k0nfig', 'karrigan', 'rain', 'snax', 'pashabiceps', 'neo', 'taz', 'byali', 'hooch', 'worldedit', 'electronic', 'flamie', 'edward', 's1mple', 'zywoo', 'niko', 'apex', 'shox', 'happy', 'kennys', 'jks', 'azr', 'gratisfaction', 'liazz', 'aliStair'.toLowerCase(), 'exit', 'lucaozy', 'vini', 'kscerato']);
function take(opt = {}) {
  if (opt.young) { const o = Object.assign({}, opt); delete o.young; o.notVet = true; return take(o); }
  const u = usedSet(), want = opt.countries || (opt.country ? [opt.country] : null), lo = opt.min ?? 0, hi = opt.max ?? 100;
  const ok = x => !u.has(lc(x.nick)) && x.skill >= lo && x.skill <= hi && !(opt.notVet && VETS.has(lc(x.nick))) && (!opt.pred || opt.pred(x));
  let c = RESERVE.filter(x => ok(x) && (!want || want.includes(x.country)));
  if (opt.strict) { if (!c.length) return null; }   // v86: команда с одним языком — только игроки этого языка
  else {
    if (!c.length && want) { const g = groupOf(want[0]); c = RESERVE.filter(x => ok(x) && groupOf(x.country) === g); }
    if (!c.length) c = RESERVE.filter(ok);
  }
  if (!c.length) return null;
  const pick = opt.best ? c[0] : c[Math.floor((typeof Math.random === 'function' ? Math.random() : .5) * Math.min(c.length, 12))];
  (seasonState.v33ResUsed = seasonState.v33ResUsed || []).push(pick.nick);
  return pick;
}
// атрибуты из уровня базы (40–94) в шкалу игры (60–98)
const attrOf = (sk, d = 0) => Math.max(60, Math.min(97, Math.round((58 + (sk - 40) * .72 + d) * 10) / 10));
function fromReserve(x, role, status) {
  const p = createPlayerFromNick({ name: 'FA', pts: 500, form: 100 }, x.nick, 0);
  p.country = x.country; p.flag = countryFlag(x.country); p.role = role || p.role; p.status = status || 'FREE AGENT';
  p.firepower = attrOf(x.skill, role === 'AWPer' || /Entry/.test(role || '') ? 1.5 : 0); p.tacticalIQ = attrOf(x.skill, role === 'IGL' ? 3 : -1);
  p.clutch = attrOf(x.skill, -1.5); p.utility = attrOf(x.skill, role === 'Support' ? 3 : -1); p.fatigue = 0; p.realReserve = true;
  if (!p.age) p.age = 19 + (h32s(x.nick) % 8);
  return p;
}
const h32s = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
window.V33Reserve = { take, fromReserve, isReal, size: () => RESERVE.length, left: () => { const u = usedSet(); return RESERVE.filter(x => !u.has(lc(x.nick))).length; } };
// генератор свободных агентов (замены, рынок, ушедшие на пенсию) — сначала реальные игроки резерва
// v86: подбор реального игрока резерва под команду. Сначала — свой язык (по нарастающему диапазону уровня),
// затем — англоговорящие реальные игроки (так в жизни поступают команды, когда «своих» на рынке нет).
// Выдуманный игрок появляется только если резерв реальных игроков исчерпан полностью.
const ANY_LANG = new Set(Object.values(window.CS2_LANG_COUNTRIES || {}).flat());
function levelOf(team) {
  const base = team && Array.isArray(team.players) && team.players.length ? team.players.filter(p => p && p.status !== 'BENCH') : null;
  const lvl = base && base.length ? base.reduce((a, p) => a + ((+p.firepower || 75) * .4 + (+p.tacticalIQ || 75) * .25 + (+p.clutch || 75) * .2 + (+p.utility || 75) * .15), 0) / base.length : 74;
  return 40 + (lvl - 58) / .72;   // обратно к шкале базы
}
function realPick(team, opts = {}) {
  const sk = opts.sk != null ? opts.sk : levelOf(team), young = !!(opts.young || team?.isAcademy);
  let lg = 'international'; try { lg = team && typeof teamIdentityGroup === 'function' ? teamIdentityGroup(team) : 'international'; } catch (e) {}
  const lc2 = lg !== 'international' ? langCountries(lg) : null;
  const cc = [...new Set((team?.players || []).map(p => p && p.country).filter(c => /^[A-Z]{2}$/.test(c || '')))];
  const T = o => take(Object.assign({ notVet: young }, o));
  if (lc2) {
    return T({ countries: lc2, min: sk - 12, max: sk + 4, strict: true }) || T({ countries: lc2, min: sk - 18, max: sk + 8, strict: true })
      || T({ countries: lc2, min: sk - 30, max: sk + 12, strict: true }) || T({ countries: lc2, strict: true })
      || T({ pred: x => !ANY_LANG.has(x.country), min: sk - 18, max: sk + 8, strict: true }) || T({ pred: x => !ANY_LANG.has(x.country), strict: true });
  }
  return T({ countries: cc.length ? cc : null, min: sk - 12, max: sk + 4 }) || T({ min: sk - 18, max: sk + 8 }) || T({ min: sk - 30, max: sk + 12 }) || T({});
}
window.V33Reserve.pick = realPick;
(function wrapGen() {
  const orig = window.generateFreeAgent; if (typeof orig !== 'function' || orig.__v33) return;
  let warned = false;
  const w = function (teamHint, roleHint, seedOffset) {
    try {
      const x = realPick(teamHint);
      if (x) { const p = fromReserve(x, roleHint); if (roleHint === 'IGL') p.tacticalIQ = Math.min(97, Math.max(+p.tacticalIQ || 70, attrOf(x.skill, 5))); if (teamHint?.isAcademy) p.age = Math.min(+p.age || 20, 17 + (h32s(x.nick) % 4)); return p; }
      if (!warned) { warned = true; console.info('[v86] резерв реальных игроков исчерпан — создаётся новый игрок'); }
    } catch (e) { console.warn('[v33 reserve]', e); }
    return orig.apply(this, arguments);
  };
  w.__v33 = true; Object.keys(orig).forEach(k => { w[k] = orig[k]; }); window.generateFreeAgent = w; try { generateFreeAgent = w; } catch (e) {}
})();

function rosterFor(name, need = 5) {
  const used = taken(), out = [];
  for (const n of (TEAM_ROSTER_2026[name] || [])) if (out.length < need && !used.has(lc(n))) { out.push(n); used.add(lc(n)); }
  // недостача — реальными свободными агентами (снимаются из списка свободных)
  const fa = (transferState.freeAgents || []);
  for (const n of (R.freeAgents || [])) {
    if (out.length >= need) break;
    const i = fa.findIndex(p => p.nick === n);
    if (i >= 0) { fa.splice(i, 1); out.push(n); continue; }
    if (!used.has(lc(n))) { out.push(n); used.add(lc(n)); }
  }
  return out.length >= need ? out : null;
}
function build(t, nicks) {
  t.players = nicks.map((n, i) => { const p = createPlayerFromNick(t, n, i); p.status = 'STARTER'; return p; });
  t.playerLayerVersion = PLAYER_LAYER_VERSION;
  try { ensurePlayerLayer(t); } catch (e) {}
}
// статистика карт — как у команд, созданных движком (без неё падает запись результатов карт)
function ensureMaps(t) {
  if (!t.maps || typeof t.maps !== 'object') { t.maps = typeof generateMapStats === 'function' ? generateMapStats() : {}; changed = true; }
  if (!t.mapStats || typeof t.mapStats !== 'object') { t.mapStats = {}; (typeof MAP_POOL !== 'undefined' ? MAP_POOL : []).forEach(m => { const wr = Number(t.maps[m]) || 50, w = Math.round(20 * wr / 100); t.mapStats[m] = { wins: w, losses: 20 - w }; }); t.mapStatsVersion = 2; changed = true; }
  if (!Array.isArray(t.mapHistory)) { t.mapHistory = []; changed = true; }
}
function newTeam(def, nicks) {
  const t = { name: def.name, pts: def.pts, style: def.style, history: [], form: 100, fatigue: 0, prevRank: null, lastBootcampSeason: 0,
    trophies: { majors: 0, elite: 0, regular: 0, grandFinalsWon: 0 }, activeModifier: null, seasonStartRank: null, seasonChampionships: 0, streak: 0 };
  ensureMaps(t);
  build(t, nicks);
  t.coach = (typeof COACHES_2026 !== 'undefined' && COACHES_2026[def.name]) || { name: '—', flag: def.country ? countryFlag(def.country) : '🌍' };
  return t;
}

// 1. команды без единого реального игрока
teams.forEach(t => {
  if (t.isAcademy || !TEAM_ROSTER_2026[t.name] || inPlay(t.name)) return;
  if ((t.players || []).some(p => real(p.nick))) return;
  const r = rosterFor(t.name); if (r) { build(t, r); changed = true; console.info('[v33] реальный состав:', t.name, r.join(', ')); }
});
// 2. SAW → команда с реальным составом
const saw = teams.find(t => t.name === 'SAW' && !(t.players || []).some(p => real(p.nick)));
if (saw && !inPlay('SAW')) {
  const def = (R.newTeams || []).find(d => !teams.some(t => t.name === d.name) && rosterFor(d.name));
  const r = def && rosterFor(def.name);
  if (r) { saw.name = def.name; saw.style = def.style; build(saw, r); saw.coach = (typeof COACHES_2026 !== 'undefined' && COACHES_2026[def.name]) || { name: '—', flag: def.country ? countryFlag(def.country) : '🌍' }; changed = true; console.info('[v33] SAW →', def.name); }
}
// 3. расширение пула
(R.newTeams || []).forEach(def => {
  if (teams.some(t => t.name === def.name)) return;
  const r = rosterFor(def.name); if (!r) return;
  teams.push(newTeam(def, r)); changed = true;
});
// 4. свободные агенты: только реальные
if (Array.isArray(transferState.freeAgents)) {
  const before = transferState.freeAgents.length;
  transferState.freeAgents = transferState.freeAgents.filter(p => !(FAKE_FA.has(String(p.nick).replace(/\d+$/, '')) && !real(p.nick)));
  if (transferState.freeAgents.length !== before) changed = true;
  try { ensureFreeAgentPool(); } catch (e) {}
}
// 5. страны и флаги
const FORCE = new Set(['kyxsan', 'fame', 'Ax1Le', 'Lucky']);
const fix = p => { const m = PLAYER_META_2026[p.nick]; if (!m) return;
  if (FORCE.has(p.nick) && m.country && p.country !== m.country) { p.country = m.country; p.flag = countryFlag(m.country); changed = true; }
  if ((!p.country || !/^[A-Z]{2}$/.test(p.country) || p.country === 'EU') && m.country) { p.country = m.country; p.flag = countryFlag(m.country); changed = true; }
  if (p.country && (!p.flag || p.flag === '🌍')) { p.flag = countryFlag(p.country); changed = true; } };
teams.forEach(t => (t.players || []).forEach(fix)); (transferState.freeAgents || []).forEach(fix);

teams.forEach(ensureMaps);
// выдуманные игроки (сгенерированные ники) в составах и среди свободных агентов → реальные игроки резерва.
// v86: подбор — по языку команды (realPick); проверка повторяется по ходу игры, а не только при загрузке:
// раньше выдуманный игрок, появившийся в Tier-2 посреди сезона, оставался до перезагрузки страницы.
function replaceFakes(busy) {
  if (!RESERVE.length) return 0;
  let rep = 0;
  teams.forEach(t => {
    if (busy && busy.has(t.name)) return;
    try { if (busy && window.V31?.managed?.() === t.name) return; } catch (e) {}   // состав менеджера по ходу игры не трогаем
    (t.players || []).forEach((p, i) => {
      if (!p || !p.nick || isReal(p.nick) || p.v86Manager) return;
      const lvl = (+p.firepower || 75) * .4 + (+p.tacticalIQ || 75) * .25 + (+p.clutch || 75) * .2 + (+p.utility || 75) * .15, sk = 40 + (lvl - 58) / .72;
      const x = realPick(t, { sk }); if (!x) return;
      const np = fromReserve(x, p.role, p.status || 'STARTER');
      ['form', 'morale', 'contractUntil', 'v31since', 'v31team', 'pers', 'conf', 'salary', 'v84roleLocked', 'joinedRun', 'v30ProOrigin', 'v30LastProTeam'].forEach(k => { if (p[k] !== undefined) np[k] = p[k]; });
      if (t.isAcademy) np.age = 17 + (h32s(x.nick) % 4);
      t.players[i] = np; rep++;
      try { if (typeof transferLog === 'function') transferLog(`✏️ ${t.name}: ${p.nick} → ${np.nick} (реальный игрок).`, 'market'); } catch (e) {}
      // v144: замена — тоже изменение состава: без записи в журнале сторож Roster Engine видел «ушёл из основы → нигде»
      // (долгая симуляция: выдуманный transs в Alliance)
      try { window.CS2Journal && window.CS2Journal.log('REPAIR', { team: t.name, player: np.nick, out: p.nick, players: [p.nick, np.nick], kind: 'real-player', reason: `выдуманный игрок ${p.nick} заменён реальным ${np.nick}` }); } catch (e) {}
    });
  });
  if (Array.isArray(transferState.freeAgents)) transferState.freeAgents = transferState.freeAgents.map(p => {
    if (!p || isReal(p.nick) || p.reservedFor || p.benchFrom) return p;
    const x = take({ countries: p.country ? [p.country] : null, min: 45 }) || take({ min: 45 }); if (!x) return p; rep++; return fromReserve(x, p.role);
  });
  try { Object.values(seasonState.v31?.orgs || {}).forEach(o => (o.prospects || []).forEach(p => { if (isReal(p.nick)) return; const x = take({ countries: [p.country], max: 62, young: true }) || take({ max: 66, young: true }); if (x) { p.nick = x.nick; p.country = x.country; p.flag = countryFlag(x.country); rep++; } })); } catch (e) {}
  return rep;
}
window.V33Reserve.replaceFakes = replaceFakes;
{ const rep = replaceFakes(null); if (rep) { changed = true; console.info('[v33] заменено выдуманных игроков:', rep); } }
// по ходу игры: раз в несколько секунд реального времени (вне пакетной перемотки), команды в идущих турнирах не трогаем
(globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => {
  if (window.v57BatchCalendarSkip) return;
  try {
    let busy = null; try { busy = window.v30MarketDebug?.busyTeams?.() || null; } catch (e) {}
    const n = replaceFakes(busy);
    if (n) { try { saveTeams(); saveTransferState(); } catch (e) {} }
  } catch (e) { console.warn('[v86] fakes', e); }
}, 7000);

if (changed) { try { saveTeams(); } catch (e) { console.warn('[v33] save', e); } }
})();
