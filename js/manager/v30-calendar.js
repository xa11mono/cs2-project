(() => {
'use strict';
/* =====================================================================
   v30 · Турнирные серии и разнообразие календаря
   • V30Series.meta(name) — идентичность серии: организатор, город/регион, LAN или онлайн, престиж.
   • Tier-1: структура 14 слотов v29 сохраняется (даты, Major в финале сезона, редкий второй Major),
     но каждый новый сезон часть слотов разыгрывают другие серии — со своим форматом.
   • Tier-2/3 и академии: вместо 26 названий по кругу — региональные лиги, национальные
     чемпионаты, открытые/закрытые квалификации, онлайн- и LAN-кубки, академические серии.
     Переименовываются только будущие события (сыгранные и идущие не трогаются).
   ===================================================================== */
if (typeof seasonState === 'undefined') return;
const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const yearOf = s => 2026 + ((+s || 1) - 1);

/* ------------------------------------------------------------ библиотека серий */
// [регулярка, серия, организатор, город, регион, lan]
const LIB = [
  [/major/i, 'Major', '', '', 'Мир', true], [/championship finals/i, 'Championship Finals', 'CS2 Manager', 'Лас-Вегас', 'Мир', true],
  [/iem katowice/i, 'Intel Extreme Masters', 'ESL', 'Катовице', 'Европа', true], [/iem cologne/i, 'Intel Extreme Masters', 'ESL', 'Кёльн', 'Европа', true],
  [/iem dallas/i, 'Intel Extreme Masters', 'ESL', 'Даллас', 'Северная Америка', true], [/iem chengdu/i, 'Intel Extreme Masters', 'ESL', 'Чэнду', 'Азия', true],
  [/iem rio/i, 'Intel Extreme Masters', 'ESL', 'Рио-де-Жанейро', 'Южная Америка', true], [/iem atlanta/i, 'Intel Extreme Masters', 'ESL', 'Атланта', 'Северная Америка', true], [/iem beijing|iem china/i, 'Intel Extreme Masters', 'ESL', 'Пекин', 'Азия', true],
  [/iem melbourne/i, 'Intel Extreme Masters', 'ESL', 'Мельбурн', 'Океания', true], [/iem krak/i, 'Intel Extreme Masters', 'ESL', 'Краков', 'Европа', true], [/iem/i, 'Intel Extreme Masters', 'ESL', '', 'Мир', true],
  [/blast.*bounty/i, 'BLAST Bounty', 'BLAST', 'Мальта', 'Европа', true], [/blast.*world final/i, 'BLAST World Final', 'BLAST', 'Абу-Даби', 'Ближний Восток', true],
  [/blast.*rivals/i, 'BLAST Rivals', 'BLAST', 'Гонконг', 'Азия', true], [/blast open rotterdam/i, 'BLAST Open', 'BLAST', 'Роттердам', 'Европа', true], [/blast open copenhagen/i, 'BLAST Open', 'BLAST', 'Копенгаген', 'Европа', true], [/blast open london/i, 'BLAST Open', 'BLAST', 'Лондон', 'Европа', true], [/blast open porto/i, 'BLAST Open', 'BLAST', 'Порту', 'Европа', true], [/blast open/i, 'BLAST Open', 'BLAST', 'Лиссабон', 'Европа', true], [/blast/i, 'BLAST Premier', 'BLAST', 'Копенгаген', 'Европа', true],
  [/esl pro league/i, 'ESL Pro League', 'ESL', 'Сент-Джулианс', 'Европа', true], [/pgl bucharest/i, 'PGL', 'PGL', 'Бухарест', 'Европа', true], [/pgl astana/i, 'PGL', 'PGL', 'Астана', 'Азия', true],
  [/pgl lodz/i, 'PGL', 'PGL', 'Лодзь', 'Европа', true], [/pgl belgrade/i, 'PGL', 'PGL', 'Белград', 'Европа', true], [/pgl wallachia/i, 'PGL Wallachia', 'PGL', 'Бухарест', 'Европа', true],
    [/pgl cluj/i, 'PGL', 'PGL', 'Клуж-Напока', 'Европа', true], [/pgl masters/i, 'PGL Masters', 'PGL', 'Бухарест', 'Европа', true], [/pgl/i, 'PGL', 'PGL', '', 'Европа', true],
  [/esports world cup/i, 'Esports World Cup', 'EWC', 'Эр-Рияд', 'Ближний Восток', true], [/asian champions league/i, 'Asian Champions League', 'ESL FACEIT Group', 'Шанхай', 'Азия', true], [/xse pro league/i, 'XSE Pro League', 'XSE', '', 'Азия', true], [/forge of legends/i, 'Forge of Legends', 'Forge', '', 'Европа', true], [/thunderpick/i, 'Thunderpick World Championship', 'Thunderpick', 'Мальта', 'Европа', true],
  [/perfect world/i, 'Perfect World', 'Perfect World', 'Шанхай', 'Азия', true], [/fissure/i, 'FISSURE Playground', 'FISSURE', 'Белград', 'Европа', true], [/starladder|starseries/i, 'StarLadder StarSeries', 'StarLadder', 'Будапешт', 'Европа', true],
  [/cs asia/i, 'CS Asia Championships', 'Perfect World', 'Шанхай', 'Азия', true], [/perfect world/i, 'Perfect World', 'Perfect World', 'Шанхай', 'Азия', true],
  [/cct season finals/i, 'CCT', 'Grid', 'Белград', 'Европа', true], [/cct north america/i, 'CCT', 'Grid', '', 'Северная Америка', false], [/cct south america/i, 'CCT', 'Grid', '', 'Южная Америка', false],
  [/cct/i, 'CCT', 'Grid', '', 'Европа', false], [/esl challenger league/i, 'ESL Challenger League', 'ESL', '', 'Регион', false], [/esl challenger/i, 'ESL Challenger', 'ESL', 'Мельбурн', 'Мир', true],
  [/elisa/i, 'Elisa Masters', 'Elisa', 'Эспоо', 'Северная Европа', true], [/yalla/i, 'YaLLa Compass', 'YaLLa Esports', 'Дубай', 'Ближний Восток', true],
  [/\bres\b.*latin|latin american series/i, 'RES Regional Series', 'RES', '', 'Латинская Америка', false], [/\bres\b/i, 'RES Regional Series', 'RES', '', 'Европа', false],
  [/tipsport/i, 'Tipsport Masters', 'Tipsport', 'Прага', 'Центральная Европа', true], [/european pro league/i, 'European Pro League', 'EPL', '', 'Европа', false],
  [/united21/i, 'United21', 'United21', '', 'Европа', false], [/skyesports/i, 'Skyesports Masters', 'Skyesports', 'Мумбаи', 'Азия', true],
  [/baltic/i, 'Baltic Masters', 'Baltic Esports', 'Рига', 'Прибалтика', true], [/nordic/i, 'Nordic Championship', 'Nordic League', 'Стокгольм', 'Скандинавия', true],
  [/iberian/i, 'Iberian Cup', 'LVP', 'Мадрид', 'Пиренеи', true], [/balkan/i, 'Balkan Showdown', 'BSL', 'Белград', 'Балканы', true],
  [/polish/i, 'Polish Championship', 'ESL Polska', 'Варшава', 'Польша', true], [/brazilian/i, 'Gamers Club', 'Сан-Паулу', 'Бразилия', true],
  [/german pro/i, 'German Pro Series', '99Damage', 'Берлин', 'Германия', false], [/uk masters/i, 'UK Masters League', 'Epic', 'Лондон', 'Великобритания', false],
  [/ukrainian cup/i, 'Ukrainian Cup', 'Maincast', 'Киев', 'Украина', false], [/kazakhstan/i, 'Kazakhstan Open', 'KeSPA KZ', 'Алматы', 'Казахстан', true], [/turkish/i, 'Turkish Masters', 'ESL Türkiye', 'Стамбул', 'Турция', true],
  [/open qualifier/i, 'Открытая квалификация', '', '', 'Онлайн', false], [/closed qualifier/i, 'Закрытая квалификация', '', '', 'Онлайн', false],
  [/online cup|weekly/i, 'Онлайн-кубок', '', '', 'Онлайн', false], [/lan cup/i, 'LAN Cup', '', 'Прага', 'Европа', true], [/regional lan finals/i, 'Regional LAN Finals', '', 'Гамбург', 'Европа', true],
  [/academy league/i, 'Academy League', '', '', 'Европа', false], [/academy masters/i, 'Academy Masters', '', 'Берлин', 'Европа', true], [/young talents/i, 'Young Talents Cup', '', '', 'Европа', false],
  [/regional academy finals/i, 'Regional Academy Finals', '', 'Варшава', 'Европа', true], [/prodigy/i, 'Prodigy Invitational', '', 'Копенгаген', 'Европа', true],
  [/academy|junior|rookie|future|prospects|rising|grassroots|entry/i, 'Молодёжные турниры', '', '', 'Онлайн', false]
];
const meta = name => { const x = LIB.find(([re]) => re.test(name || '')); return x ? { series: x[1], org: x[2], city: x[3], region: x[4], lan: x[5] } : null; };
window.V30Series = { meta, LIB };

/* ------------------------------------------------------------ Tier-1: ротация слотов */
// слот (номер в расписании v29) → варианты [название, формат]; первый вариант — исходный
// v101: организатор каждого свободного турнира Tier-1 выбирается заново каждый сезон по частоте, как на реальной
// сцене: BLAST, ESL/IEM и PGL — основа календаря, Esports World Cup — не больше одного раза в сезон, редкие организаторы
// (StarLadder, FISSURE, CS Asia, Thunderpick, YaLLa) — 0–2 раза. ESL Pro League (весна/осень) и Мейджоры не трогаются.
const ORG = {
  ESL: { w: 26, list: [['IEM Kraków', 'gsl'], ['IEM Katowice', 'double'], ['IEM Dallas', 'double'], ['IEM Melbourne', 'double'], ['IEM Chengdu', 'double'], ['IEM Rio', 'double']] },
  BLAST: { w: 30, list: [['BLAST Open Lisbon', 'double'], ['BLAST Open Rotterdam', 'double'], ['BLAST Open Copenhagen', 'double'], ['BLAST Open London', 'double'], ['BLAST Open Porto', 'double'], ['BLAST Bounty Season 1', 'bounty'], ['BLAST Bounty Season 2', 'bounty'], ['BLAST Rivals Spring', 'gsl'], ['BLAST Rivals Fall', 'gsl']] },
  PGL: { w: 28, list: [['PGL Cluj-Napoca', 'swiss'], ['PGL Bucharest', 'swiss'], ['PGL Astana', 'swiss'], ['PGL Lodz', 'swiss'], ['PGL Belgrade', 'swiss'], ['PGL Wallachia', 'swiss'], ['PGL Masters', 'swiss']] },
  EWC: { w: 0, max: 1, list: [['Esports World Cup', 'swiss']] },   // Esports World Cup — каждый сезон один раз
  RARE: { w: 26, max: 2, regular: true, list: [['StarLadder StarSeries Fall', 'swiss'], ['FISSURE Playground', 'double'], ['CS Asia Championships', 'double'], ['Thunderpick World Championship', 'swiss'], ['Perfect World Shanghai Masters', 'double'], ['YaLLa Compass Masters', 'double']] }
};
const MIN_EACH = { ESL: 2, BLAST: 2, PGL: 2, EWC: 1 };   // основные организаторы — не меньше двух турниров, EWC — ровно один
const isFixed = e => !e || e.type === 'major' || /ESL Pro League/i.test(String(e.name || ''));
function rotate() {
  const st = seasonState, arr = st.seasonSchedule, s = Number(st.currentSeason) || 1;
  if (!Array.isArray(arr) || st.v30RotSeason === s) return;
  const idx = Number(st.tournamentIndex) || 1, ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
  const slots = []; arr.forEach((e, i) => { if (i < 1 || isFixed(e) || i < idx || (i === idx && ct && !ct.completed)) return; slots.push(i); });
  if (!slots.length) { st.v30RotSeason = s; return; }
  const rnd = k => h32('org|' + s + '|' + k + '|' + (st.v29Salt || '')) / 4294967296;
  // 1) организаторы по весам с минимумами и максимумами
  const plan = [], cnt = {};
  Object.entries(MIN_EACH).forEach(([o, n]) => { for (let j = 0; j < n && plan.length < slots.length; j++) plan.push(o); });
  for (let k = 0; plan.length < slots.length; k++) {
    const opts = Object.entries(ORG).filter(([o, d]) => d.w > 0 && (!d.max || plan.filter(x => x === o).length < d.max));
    const sum = opts.reduce((a, [, d]) => a + d.w, 0); let r = rnd('w' + k) * sum, pick = opts[0][0];
    for (const [o, d] of opts) { r -= d.w; if (r <= 0) { pick = o; break; } }
    plan.push(pick);
  }
  // перемешиваем порядок, чтобы организаторы не шли блоками
  for (let i = plan.length - 1; i > 0; i--) { const j = Math.floor(rnd('sh' + i) * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]]; }
  // 2) конкретный турнир организатора, без повторов в сезоне
  const used = new Set();
  slots.forEach((i, n) => {
    const o = plan[n], d = ORG[o], e = arr[i];
    let k = Math.floor(rnd('t' + i) * d.list.length), t = d.list[k];
    for (let j = 0; j < d.list.length && used.has(t[0]); j++) t = d.list[(k + j) % d.list.length];
    used.add(t[0]); cnt[o] = (cnt[o] || 0) + 1;
    e.name = `${t[0]} ${yearOf(s)}`; e.format = t[1]; e.organizer = o;
    const tp = d.regular ? 'regular' : 'elite';
    e.type = tp; e.fieldProfile = tp === 'elite' ? 'elite' : 'open'; e.min = tp === 'elite' ? 450 : 250; e.max = 2000;
  });
  st.v30RotSeason = s; st.v30OrgMix = st.v30OrgMix || {}; st.v30OrgMix[s] = cnt;
  try { saveSeasonState(); } catch (e) {}
  try { if (typeof updateTournamentSuggestion === 'function') updateTournamentSuggestion(); } catch (e) {}
}
(() => { const g = window.generateDynamicSeasonSchedule; if (typeof g !== 'function' || g.__v30) return;
  const w = function () { const r = g.apply(this, arguments); try { seasonState.v30RotSeason = 0; rotate(); } catch (e) { console.warn('[v30 cal]', e); } return r; };
  w.__v30 = true; Object.keys(g).forEach(k => { w[k] = g[k]; }); window.generateDynamicSeasonSchedule = w; try { generateDynamicSeasonSchedule = w; } catch (e) {} })();

/* ------------------------------------------------------------ Tier-2/3 и академии */
const T2 = ['Exort Series', 'BetBoom Dacha', 'Winline Insight', 'CIS LAN', 'CCT Europe Series', 'ESL Challenger League Europe', 'Elisa Invitational',
  'YaLLa Compass Contenders', 'RES Regional European Series', 'Tipsport Cup', 'European Pro League', 'United21 League', 'Skyesports Masters', 'Baltic Masters Riga', 'Iberian Cup Madrid', 'Balkan Showdown', 'Nordic Championship Finals'];
// Эти серии в календаре игры относятся к основному Tier-1/S-Tier, а не к параллельному Tier-2.
const T1_SERIES = [/^Thunderpick World Championship/i, /^FISSURE Playground/i, /^Esports World Cup/i, /^IEM /i, /^BLAST Premier/i, /^PGL /i, /Major/i, /^StarLadder StarSeries/i, /^CS Asia Championships/i];
const T3 = ['Exort Cup', 'Tipsport Cup Prague', 'Galaxy Battle', 'NODWIN Clutch Series', 'Polish Championship', 'German Pro Series', 'UK Masters League', 'Ukrainian Cup', 'Kazakhstan Open', 'Turkish Masters', 'Online Cup Weekly', 'LAN Cup Prague', 'Regional LAN Finals', 'CCT Rising Series', 'United21 Division', 'European Pro League 2nd Division', 'Future Stars Cup', 'Grassroots CS2 Cup', 'Entry League', 'Nordic National League'];
const AC = ['Academy League', 'Academy Masters', 'Young Talents Cup', 'Regional Academy Finals', 'Prodigy Invitational', 'European Academy League', 'CCT Academy Series', 'Academy Cup Europe'];
// v35: обычные турниры не должны называться квалификациями или носить регион, которого нет в их составе
const BAD_NAME = /Qualifier|Asia|America|Latin|Brazil/i;
// v84: региональные названия Tier-2/3 соответствуют составу: CIS LAN — команды СНГ, Nordic — Скандинавия и т.д.
const CIS_CC = ['RU', 'UA', 'BY', 'KZ', 'UZ', 'KG', 'AM', 'GE', 'MD', 'AZ', 'TJ'];
const REGION_OF_NAME = [
  [/^(CIS LAN|BetBoom Dacha|Winline Insight|Exort Series)/i, CIS_CC], [/^Ukrainian Cup/i, ['UA']], [/^Kazakhstan Open/i, ['KZ', 'UZ', 'KG']],
  [/^Polish Championship/i, ['PL']], [/^German Pro Series/i, ['DE', 'AT', 'CH']], [/^UK Masters/i, ['GB', 'IE']], [/^Turkish Masters/i, ['TR']],
  [/^Baltic Masters/i, ['LV', 'LT', 'EE']], [/^Iberian Cup/i, ['ES', 'PT']], [/^Balkan Showdown/i, ['RS', 'BA', 'HR', 'SI', 'ME', 'MK', 'BG', 'RO', 'GR', 'XK', 'AL']],
  [/^Nordic/i, ['DK', 'SE', 'NO', 'FI', 'IS']], [/^YaLLa Compass/i, ['SA', 'AE', 'JO', 'EG', 'KW', 'QA', 'BH', 'OM', 'LB', 'MA', 'TN', 'DZ', 'IQ', 'TR']]
];
const NEUTRAL = { tier2: ['CCT Europe Series', 'ESL Challenger League Europe', 'Elisa Invitational', 'RES Regional European Series', 'Tipsport Cup', 'European Pro League', 'United21 League', 'Skyesports Masters'],
  tier3: ['Exort Cup', 'Tipsport Cup Prague', 'Galaxy Battle', 'NODWIN Clutch Series', 'Online Cup Weekly'] };
const regionOfName = n => (REGION_OF_NAME.find(([re]) => re.test(String(n || ''))) || [])[1] || null;
const teamInRegion = (t, cc) => (t?.players || []).filter(p => p && p.status !== 'BENCH').slice(0, 5).filter(p => cc.includes(String(p.country || '').toUpperCase())).length >= 3;
window.v84TeamInRegion = teamInRegion;
function regionalize(ev) {
  const cc = regionOfName(ev.name); if (!cc) { ev.v84Region = null; return true; }
  const names = (ev.participants || []).map(x => x?.name || x).filter(Boolean), need = names.length;
  if (!need) return true;
  const T = n => (typeof teams !== 'undefined' ? teams : []).find(t => t.name === n);
  const managed = (() => { try { return window.V31?.managed?.() || ''; } catch (e) { return ''; } })();
  const avg = names.map(T).filter(Boolean).reduce((a, t, _, l) => a + (Number(t.pts) || 0) / l.length, 0);
  const strongTier = n => typeof window.CS2TeamTier === 'function' ? window.CS2TeamTier(n) < (ev.tier === '2' ? 2 : 3) : false;
  const keep = names.filter(n => n === managed || (teamInRegion(T(n), cc) && !strongTier(n)));
  // топ-команды не зовут на турниры Tier-2/3 (Spirit на онлайн-кубке — нереалистично)
  const ranked = (typeof teams !== 'undefined' ? teams : []).filter(t => t && !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0)).map(t => t.name);
  const capRank = ev.tier === '2' ? 16 : 30, tooStrong = n => { if (typeof window.CS2TeamTier === 'function') return window.CS2TeamTier(n) < (ev.tier === '2' ? 2 : 3); const i = ranked.indexOf(n); return i >= 0 && i < capRank; };
  const pool = (typeof teams !== 'undefined' ? teams : []).filter(t => t && !t.isAcademy && !keep.includes(t.name) && !tooStrong(t.name) && teamInRegion(t, cc))
    .sort((a, b) => Math.abs((a.pts || 0) - avg) - Math.abs((b.pts || 0) - avg)).map(t => t.name);
  if (keep.length + pool.length < need) return false;
  ev.participants = keep.concat(pool).slice(0, need); ev.v84Region = cc; ev.fieldVersion = Math.max(5, Number(ev.fieldVersion) || 0);
  try { window.v22BuildBracketRef?.(ev); } catch (e) {}
  return true;
}
function renameParallel() {
  const s = Number(seasonState.currentSeason) || 1, list = (seasonState.parallelSchedule || []).filter(e => e && e.season === s);
  if (!list.length) return;
  let changed = 0;
  const pools = { tier2: T2, tier3: T3, academy: AC }, k = { tier2: 0, tier3: 0, academy: 0 };
  list.sort((a, b) => a.startMs - b.startMs).forEach(ev => {
    if (ev.qual) return; // v35: у квалификаций своё название («… — Europe Closed Qualifier»)
    const kind = ev.kind === 'academy' ? 'academy' : ev.tier === '2' ? 'tier2' : 'tier3', pool = pools[kind];
    if (kind === 'tier2' && T1_SERIES.some(re => re.test(String(ev.name || '').replace(/\s+\d{4}$/, '')))) { ev.v30n = 0; ev.name = ''; }
    const off = h32(kind + s + (seasonState.v29Salt || '')) % pool.length, name = `${pool[(off + k[kind]++) % pool.length]} ${ev.year || yearOf(ev.season)}`;
    if ((ev.v30n && !BAD_NAME.test(ev.name)) || ev.status !== 'scheduled' || (ev.br?.matches || []).some(m => m.w)) {
      ev.v30n = 1;
      // v84: уже названный, но ещё не начавшийся турнир — один раз приводим состав в соответствие с названием
      if (ev.status === 'scheduled' && ev.v84Region === undefined && !(ev.br?.matches || []).some(m => m.w)) {
        if (!regionalize(ev)) { const nl = NEUTRAL[kind] || NEUTRAL.tier2; ev.name = `${nl[h32(ev.id + 'n') % nl.length]} ${ev.year || yearOf(ev.season)}`; ev.v84Region = null; }
        changed++;
      }
      return;
    }
    ev.name = name; ev.v30n = 1; changed++;
    if (!regionalize(ev)) { const nl = NEUTRAL[kind] || NEUTRAL.tier2; ev.name = `${nl[h32(ev.id + 'n') % nl.length]} ${ev.year || yearOf(ev.season)}`; ev.v84Region = null; }
  });
  if (changed) try { saveSeasonState(); } catch (e) {}
}
window.V30CalendarRefresh=()=>{ try { rotate(); renameParallel(); } catch(e){} };
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; window.V30CalendarRefresh(); }, 3000);
setTimeout(() => { try { rotate(); renameParallel(); } catch (e) {} }, 700);
console.info('[v30] серии турниров и ротация календаря');
})();
