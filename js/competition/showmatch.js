/* v35 — шоу-матчи на крупных турнирах. Случайно: на мейджорах и S-Tier ~60%, на Tier-1 ~20%; момент тоже случайный —
   перед гранд-финалом или в один из дней турнира. Форматы: капитаны-драфт из участников турнира, снайперы против
   рифлеров, легенды CS, классические составы (NAVI 2010 vs NAVI 2021 и др.), кастеры против аналитиков.
   Шоу-матч попадает в архив (страница, составы, счёт по картам) и в новости; на рейтинг не влияет. */
(function () {
'use strict';
const H = window.HS;
if (typeof seasonState === 'undefined') return;
const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const rng = seed => { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
const nowMs = () => Number(seasonState.calendar?.currentMs) || Date.now();
const DAY = 864e5, MAPS = ['Mirage', 'Inferno', 'Nuke', 'Dust II', 'Ancient', 'Anubis', 'Cache'];
const ST = () => (seasonState.v35Show = seasonState.v35Show || {});
// исторические составы и легенды (сила — условная, для шоу)
const CLASSIC = [
  [['NAVI 2010', ['Zeus', 'starix', 'markeloff', 'Edward', 'ceh9'], 78], ['NAVI 2021', ['s1mple', 'electroNic', 'b1t', 'Perfecto', 'Boombl4'], 80]],
  [['Fnatic 2015', ['olofmeister', 'flusha', 'JW', 'KRiMZ', 'pronax'], 79], ['Astralis 2018', ['device', 'dupreeh', 'Xyp9x', 'gla1ve', 'Magisk'], 80]],
  [['SK 2017', ['coldzera', 'FalleN', 'fer', 'TACO', 'felps'], 79], ['Virtus.pro 2014', ['Snax', 'pashaBiceps', 'TaZ', 'NEO', 'byali'], 77]]
];
const LEGENDS = [[['Легенды Европы', ['f0rest', 'GeT_RiGhT', 'olofmeister', 'kennyS', 'NEO'], 76], ['Легенды СНГ', ['markeloff', 'Edward', 'starix', 'Zeus', 'seized'], 75]],
  [['Легенды Бразилии', ['coldzera', 'fer', 'TACO', 'fnx', 'FalleN'], 76], ['Легенды мира', ['GuardiaN', 'kennyS', 'NiKo', 'f0rest', 'TaZ'], 77]]];
const CASTERS = [['Кастеры', ['SPUNJ', 'Machine', 'Hugo', 'JustHarry', 'moses'], 58], ['Аналитики', ['dupreeh', 'YNk', 'dinko', 'Sjokz', 'stunna'], 60]];
const TYPES = [['captains', 'All-Star: капитаны'], ['awp', 'Снайперы против рифлеров'], ['legends', 'Матч легенд'], ['classic', 'Классика: эпохи CS'], ['casters', 'Кастеры против аналитиков'], ['coaches', 'Шоу-матч тренеров']];

// реальные люди шоу-матчей: страна (флаг) и роль; где страна не подтверждена — без флага
const PEOPLE = { Recrent: ['RU', 'Стример'], Buster: ['RU', 'Стример'], Evelone: ['RU', 'Стример'], StRoGo: ['RU', 'Стример'], Exile: ['RU', 'Стример'], Skywhywalker: ['RU', 'Стример'],
  shadowkekw: ['RU', 'Стример'], des0ut: ['RU', 'Стример'], Lixxx: ['RU', 'Стример'], Bratishkin: ['RU', 'Стример'], Mokrivskyi: ['', 'Стример'], Mapke: ['RU', 'Стример'],
  Machine: ['GB', 'Кастер'], moses: ['US', 'Кастер'], SPUNJ: ['', 'Кастер'], Hugo: ['', 'Кастер'], JustHarry: ['GB', 'Кастер'], dinko: ['', 'Аналитик'], dupreeh: ['DK', 'Аналитик'], YNk: ['RS', 'Аналитик'], Sjokz: ['BE', 'Ведущая'], stunna: ['', 'Репортёр'],
  f0rest: ['SE', 'Легенда'], GeT_RiGhT: ['SE', 'Легенда'], olofmeister: ['SE', 'Легенда'], kennyS: ['FR', 'Легенда'], NEO: ['PL', 'Легенда'], markeloff: ['UA', 'Легенда'], Edward: ['UA', 'Легенда'], starix: ['UA', 'Легенда'],
  Zeus: ['UA', 'Легенда'], seized: ['RU', 'Легенда'], ceh9: ['UA', 'Легенда'], coldzera: ['BR', 'Легенда'], fer: ['BR', 'Легенда'], TACO: ['BR', 'Легенда'], fnx: ['BR', 'Легенда'], FalleN: ['BR', 'Легенда'], felps: ['BR', 'Легенда'],
  GuardiaN: ['SK', 'Легенда'], NiKo: ['BA', 'Игрок'], TaZ: ['PL', 'Легенда'], Snax: ['PL', 'Легенда'], pashaBiceps: ['PL', 'Легенда'], byali: ['PL', 'Легенда'], flusha: ['SE', 'Легенда'], JW: ['SE', 'Легенда'], KRiMZ: ['SE', 'Легенда'],
  pronax: ['SE', 'Легенда'], device: ['DK', 'Легенда'], Xyp9x: ['DK', 'Легенда'], gla1ve: ['DK', 'Тренер'], Magisk: ['DK', 'Игрок'], s1mple: ['UA', 'Легенда'], electroNic: ['RU', 'Игрок'], b1t: ['UA', 'Игрок'], Perfecto: ['RU', 'Игрок'], Boombl4: ['RU', 'Игрок'] };
window.V35People = PEOPLE;
const flagCC = f => { const c = [...String(f || '')].map(x => String.fromCharCode(x.codePointAt(0) - 127397)).join(''); return /^[A-Z]{2}$/.test(c) ? c : ''; };
function coachOf(nick) { const t = (typeof teams !== 'undefined' ? teams : []).find(x => x.coach && x.coach.name === nick); return t ? [flagCC(t.coach.flag), 'Тренер ' + t.name] : null; }
// все люди сцены для поиска и профилей: реестр + тренеры команд
window.V35PeopleList = () => Object.entries(PEOPLE).map(([nick, [cc, role]]) => ({ nick, cc, role }))
  .concat((typeof teams !== 'undefined' ? teams : []).filter(t => t.coach && t.coach.name && !/^(coach|—)$/.test(t.coach.name)).map(t => ({ nick: t.coach.name, cc: flagCC(t.coach.flag), role: 'Тренер ' + t.name })));
function players(ct) { return (ct.participants || []).flatMap(n => { const t = teams.find(x => x.name === (typeof n === 'string' ? n : n.name)); return t ? (t.players || []).slice(0, 5).map(p => ({ p, team: t.name })) : []; }); }
const sq = (name, list) => ({ name, players: list, str: list.reduce((s, x) => s + (x.str || pow(x.p)), 0) / list.length });
const fixed = ([name, nicks, s]) => sq(name, nicks.map(n => ({ p: { nick: n, role: PEOPLE[n]?.[1] || '', country: PEOPLE[n]?.[0] || '' }, team: name, str: s })));
function squads(type, ct, r) {
  const pl = players(ct).sort((a, b) => pow(b.p) - pow(a.p));
  if (type === 'captains' && pl.length >= 12) {
    const top = pl.slice(0, 14).sort(() => r() - .5), c1 = top[0], c2 = top[1], rest = pl.filter(x => x !== c1 && x !== c2).slice(0, 16), A = [c1], B = [c2];
    rest.forEach((x, i) => { const pickA = Math.floor(i / 1) % 4 === 0 || Math.floor(i / 1) % 4 === 3; if (A.length < 5 && (pickA || B.length >= 5)) A.push(x); else if (B.length < 5) B.push(x); });
    return [sq(`Команда ${c1.p.nick}`, A), sq(`Команда ${c2.p.nick}`, B)];
  }
  if (type === 'awp') { const awp = pl.filter(x => /awp/i.test(x.p.role || '')).slice(0, 5), rif = pl.filter(x => !/awp/i.test(x.p.role || '')).slice(0, 5);
    if (awp.length === 5 && rif.length === 5) return [sq('Снайперы', awp), sq('Рифлеры', rif)]; }
  if (type === 'legends') return LEGENDS[Math.floor(r() * LEGENDS.length)].map(fixed);
  if (type === 'classic') return CLASSIC[Math.floor(r() * CLASSIC.length)].map(fixed);
  if (type === 'casters') return CASTERS.map(fixed);
  if (type === 'coaches') { // два случайных игрока турнира драфтом набирают тренеров команд-участниц
    const co = (ct.participants || []).map(n => teams.find(t => t.name === (typeof n === 'string' ? n : n.name))).filter(t => t && t.coach && t.coach.name && !/^(coach|—)$/.test(t.coach.name))
      .map(t => ({ p: { nick: t.coach.name, role: 'Тренер', country: flagCC(t.coach.flag) }, team: t.name, str: 52 + (h32(t.coach.name) % 10) })).sort(() => r() - .5);
    const caps = pl.slice(0, 20).sort(() => r() - .5).slice(0, 2);
    if (co.length >= 8 && caps.length === 2) { const A = [caps[0]], B = [caps[1]]; co.slice(0, 8).forEach((x, i) => (i % 4 === 0 || i % 4 === 3 ? A : B).push(x)); return [sq(`Команда ${caps[0].p.nick}`, A), sq(`Команда ${caps[1].p.nick}`, B)]; }
  }
  return CLASSIC[0].map(fixed);
}
function series(a, b, r) {
  const pA = 1 / (1 + Math.exp(-(a.str - b.str) / 4)); let wa = 0, wb = 0; const mp = [], maps = MAPS.slice().sort(() => r() - .5);
  while (wa < 2 && wb < 2) { const aw = r() < pA, lo = Math.floor(4 + r() * 9), ot = r() < .15, sc = ot ? [16, 14] : [13, lo]; mp.push([maps[mp.length], aw ? sc[0] : sc[1], aw ? sc[1] : sc[0]]); aw ? wa++ : wb++; }
  return { a: a.name, b: b.name, w: wa > wb ? a.name : b.name, s: [wa, wb], mp, bo: 3 };
}
function play(ct, plan) {
  const r = rng(h32(plan.key + 'play')), [A, B] = squads(plan.type, ct, r); if (!A || !B) return;
  const m = series(A, B, r), id = 'SM-' + h32(plan.key).toString(36), title = TYPES.find(t => t[0] === plan.type)[1];
  const rost = {}; [A, B].forEach(s => { rost[s.name] = s.players.map(x => ({ nick: x.p.nick, role: x.p.role, club: x.team, country: x.p.country || PEOPLE[x.p.nick]?.[0] || '' })); });
  const t = nowMs(), name = `${title} · ${ct.name}`, champ = m.w, lose = champ === A.name ? B : A, win = champ === A.name ? A : B;
  const snap = { id, v: 1, ts: Date.now(), tier: 'show', prestige: 'show', name, season: ct.season, year: H ? H.yearOf(ct.season) : 0, format: 'single', size: 2, champion: champ,
    show: true, showMatch: true, showTitle: title, parentTournament: ct.name, parentTournamentId: ct.hubArchiveId || ct.id || null, showWhen: plan.when,
    blocks: [{ tab: 'playoff', title: 'Шоу-матч', sections: [{ title: null, rounds: [{ title: plan.when === 'final' ? 'Перед гранд-финалом' : 'Шоу-матч', ms: [m] }] }] }],
    results: [{ n: champ, p: 1 }, { n: lose.name, p: 2 }], gs: t, ge: t, rost };
  try { const AR = window.hubArchiveExport(); AR[id] = snap; window.hubArchiveImport(AR); } catch (e) { console.warn('[v35 show]', e); }
  const N = window.V29News, v = (0.4 + r() * (ct.isMajor ? 1.6 : 0.9)).toFixed(1), sc = `${Math.max(...m.s)}:${Math.min(...m.s)}`;
  const LEAD = { captains: `Капитаны ${A.players[0].p.nick} и ${B.players[0].p.nick} собрали команды из участников ${ct.name} — победили «${champ}» (${sc}).`,
    awp: `Пять снайперов против пяти рифлеров: ${champ === 'Снайперы' ? 'AWP решила' : 'рифлеры доказали, что винтовка сильнее'} — ${sc}.`,
    legends: `Легенды вернулись на сервер: ${champ} обыграли ${lose.name} со счётом ${sc}.`, classic: `Встреча эпох: ${champ} сильнее ${lose.name} — ${sc}. Ностальгия на максимум.`,
    coaches: `Тренеры вспомнили молодость: ${champ} обыграли ${lose.name} (${sc}) — капитаны сами выбирали тренеров.`,
    casters: `Таланты студии взяли мышки: ${champ} победили ${lose.name} (${sc}), а чат не переставал смеяться.` };
  if (N && N.add) N.add({ cat: 'event', icon: '🎪', imp: 5, ev: id, title: `Шоу-матч на ${ct.name}: ${champ} — ${lose.name} ${sc}`, lead: `В рамках турнира «${ct.name}» прошёл шоу-матч «${title}». ` + LEAD[plan.type] + ` Пик зрителей — ${v} млн.`,
    body: [`Формат: шоу-матч в рамках ${ct.name}, а не отдельный турнир.`, `${A.name}: ${A.players.map(x => x.p.nick).join(', ')}.`, `${B.name}: ${B.players.map(x => x.p.nick).join(', ')}.`, `Карты: ${m.mp.map(x => `${x[0]} ${x[1]}:${x[2]}`).join(', ')}.`,
      plan.when === 'final' ? 'Шоу-матч разогрел арену перед гранд-финалом.' : 'Шоу-матч прошёл в день отдыха турнира; на рейтинг он не влияет.'],
    tags: N.P ? win.players.filter(x => teams.some(t => (t.players || []).some(p => p.nick === x.p.nick))).slice(0, 3).map(x => N.P(x.p.nick)) : [] });
}
function tick() {
  const ct = typeof currentTournament !== 'undefined' ? currentTournament : null; if (!ct || ct.completed) return;
  const big = ct.isMajor || ct.isElite, key = ct.name + '|' + ct.season, S = ST();
  if (!S[key]) { const h = h32(key + (seasonState.v29Salt || '')), go = (h % 100) < (big ? 60 : 20);
    S[key] = go ? { key, type: TYPES[(h >>> 8) % TYPES.length][0], when: (h >>> 12) % 2 ? 'final' : 'day', at: nowMs() + (1 + (h >>> 16) % 3) * DAY, done: false } : { key, none: true }; }
  const plan = S[key]; if (plan.none || plan.done) return;
  const finalReady = (g => g && g.t1 && g.t2 && !g.winner)(ct.grandFinal || (ct.upperRounds || []).at?.(-1)?.[0]);
  if ((plan.when === 'final' && finalReady) || (plan.when === 'day' && nowMs() >= plan.at)) { plan.done = true; play(ct, plan); try { saveSeasonState(); } catch (e) {} }
}
// площадки по роли (значки simple-icons; адресов каналов нет — только где человек присутствует)
const SOC = { 'Стример': ['twitch', 'kick', 'youtube', 'telegram'], 'Кастер': ['twitch', 'youtube', 'x'], 'Аналитик': ['x', 'youtube'], 'Ведущая': ['x', 'instagram'], 'Репортёр': ['x', 'instagram'], 'Легенда': ['x', 'instagram'], 'Игрок': ['x', 'instagram'] };
const socials = role => { const I = window.V35Icons; if (!I) return ''; const k = SOC[role] || (/^Тренер/.test(role) ? ['x'] : []); return k.map(x => `<span class="hs-chip static si-chip" data-tip="${I.I[x].t}">${I.svg(x, 14)} ${I.I[x].t}</span>`).join(''); };
if (H && H.PAGES.player) {
  const orig = H.PAGES.player;
  function participation(sn, nick) {
    if (!sn || !sn.rost) return null;
    const found = Object.entries(sn.rost).find(([, list]) => (list || []).some(x => x && x.nick === nick));
    if (!found) return null;
    const team = found[0], place = (sn.results || []).find(x => x.n === team)?.p || 0;
    const isMatch = !!sn.showMatch || /^SM-/.test(String(sn.id || '')) || /Шоу-матч/.test(String(sn.blocks?.[0]?.title || ''));
    const parent = sn.parentTournament || (isMatch ? String(sn.name || '').split(' · ').slice(1).join(' · ') : '');
    let outcome;
    if (isMatch) outcome = team === sn.champion ? 'Победа в шоу-матче' : 'Поражение в шоу-матче';
    else outcome = place === 1 ? 'Чемпион шоу-турнира' : place === 2 ? 'Финалист шоу-турнира' : place ? `Место ${place}` : 'Участие в шоу-турнире';
    return { team, place, isMatch, parent, outcome };
  }
  function playerShows(nick) {
    return Object.values(H.archive()).filter(sn => sn && (sn.showMatch === true || /^SM-/.test(String(sn.id || '')) || sn.prestige === 'show' || sn.tier === 'show') && participation(sn, nick))
      .sort((a, b) => (b.ts || b.ge || 0) - (a.ts || a.ge || 0));
  }
  function showPanel(nick) {
    const list = playerShows(nick);
    if (!list.length) return '';
    const rows = list.map(sn => {
      const part = participation(sn, nick), year = sn.year || (H.yearOf ? H.yearOf(sn.season) : '');
      const label = part.isMatch ? `Шоу-матч: ${part.outcome}${part.parent ? ` · в рамках ${part.parent}` : ''}` : `${part.outcome} · ${part.team}`;
      return `<button type="button" class="ev-news" data-event="${H.esc(sn.id)}"><b>${H.esc(sn.name)}</b><small>${H.esc(label)} · ${H.esc(String(year))}</small></button>`;
    }).join('');
    return H.box('Шоу-матчи и шоу-турниры', rows, '', 'flush') + '<p class="hs-note">Шоу-матчи внутри Major и S-Tier указаны отдельно и привязаны к основному турниру. Шоу-события не влияют на мировой рейтинг и официальные титулы клубов.</p>';
  }
  H.PAGES.player = arg => {
    const nick = String(arg || '').split('/')[0], pp = PEOPLE[nick] || coachOf(nick), now = H.playerNow ? H.playerNow(nick) : null;
    const extra = showPanel(nick);
    // Игрок может отсутствовать в активных составах, но оставаться в архиве, на рынке свободных агентов
    // или в списке завершивших карьеру. Создаём пустую статистическую запись только для открытия полного профиля;
    // реальные цифры по-прежнему берутся исключительно из сыгранных и сохранённых карт.
    let statsEntry = H.stats && H.stats().P ? H.stats().P[nick] : null;
    let savedPlayer = null, savedTeam = 'Без команды';
    try {
      const fa = (typeof transferState !== 'undefined' && transferState.freeAgents || []).find(x => x && x.nick === nick);
      if (fa) savedPlayer = fa;
      const retired = (typeof transferState !== 'undefined' && transferState.retired || []).find(x => (x?.nick || x) === nick);
      if (!savedPlayer && retired && typeof retired === 'object') savedPlayer = retired;
      if (!savedPlayer && typeof teams !== 'undefined') {
        const tm = teams.find(t => (t.players || []).some(x => x.nick === nick));
        const pl = tm?.players?.find(x => x.nick === nick); if (pl) { savedPlayer = pl; savedTeam = tm.name; }
      }
      if (!savedPlayer) {
        const snap = Object.values(H.archive ? H.archive() : {}).find(sn => sn?.rost && Object.entries(sn.rost).some(([team, list]) => (list || []).some(x => x?.nick === nick && (savedTeam = team))));
        if (snap) savedPlayer = (snap.rost[savedTeam] || []).find(x => x?.nick === nick) || { nick };
      }
      if (!savedPlayer && pp) savedPlayer = { nick, role: pp[1] || 'Игрок', country: pp[0] || '' };
      if (!statsEntry && savedPlayer && H.stats) {
        const st = H.stats();
        if (!st.P[nick]) st.P[nick] = { nick, team: savedTeam, p: savedPlayer, all: H.Z0(), bySeason: {}, bySK: {}, byMap: {}, byEv: {}, matches: [] };
        statsEntry = st.P[nick];
      }
    } catch (e) { console.warn('[v35 show] профиль игрока', e); }
    if (now || statsEntry || savedPlayer || !pp) return orig(arg) + extra;
    const head = `${H.back()}<div class="hs-phead"><div class="hs-pphoto">${H.photoHtml ? H.photoHtml({ nick }, true) : ''}</div><div class="hs-pid"><div class="hs-pcountry">${pp[0] ? H.flag(pp[0]) + ' ' + H.esc((window.V34Flags?.NAMES || {})[pp[0]] || pp[0]) : ''}</div><h1>${H.esc(nick)}</h1>
      <div class="hs-pchips"><span class="hs-chip static">${H.esc(pp[1])}</span>${socials(pp[1])}</div></div></div>`;
    return head + (extra || H.box('История игрока', H.empty('Сохранённая статистика матчей не найдена.'))) + '<p class="hs-note">Статистика официальных матчей сохраняется в архиве карьеры; шоу-матчи показаны отдельным списком.</p>';
  };
  window.V35ShowParticipation = participation;
}
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; try { tick(); } catch (e) { console.warn('[v35 show]', e); } }, 3000);
window.V35Show = { tick, play, squads, TYPES };
console.info('[v35] шоу-матчи');
})();
