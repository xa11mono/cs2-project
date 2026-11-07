/* v33 — шоу-турниры и Кубок наций. На рейтинг, призовые клубов и личные титулы не влияют.
   • Streamers Battle (СНГ, Европа, Бразилия) и All-Star Showmatch: команды собираются вокруг капитанов-звёзд
     из реальных игроков региона (змейкой по уровню), без смены клубов; большая аудитория.
   • eSports Nations Cup (декабрь): 8 сильнейших сборных — 5 лучших игроков страны из всех клубов;
     клубы отпускают игроков, составы не меняются.
   Каждый турнир разыгрывается в свой игровой день, попадает в архив (страница турнира, сетка, итоги)
   и в новости — анонс за 3 дня и итог с числом зрителей. */
(function () {
'use strict';
const H = window.HS;
if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
const DAY = 864e5;
const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const rng = seed => { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
const nowMs = () => Number(seasonState.calendar?.currentMs) || Date.now();
const yearOf = s => 2025 + (s || 1);
const CIS = ['RU', 'UA', 'BY', 'KZ', 'UZ', 'KG', 'AM', 'GE', 'MD', 'LV', 'LT', 'EE'];
const EU = ['DK', 'SE', 'NO', 'FI', 'FR', 'DE', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'RS', 'BA', 'HR', 'SI', 'ME', 'MK', 'XK', 'GB', 'IE', 'NL', 'BE', 'PT', 'ES', 'IT', 'TR', 'IL', 'CH', 'AT', 'GR'];
const SA = ['BR', 'AR', 'CL', 'UY', 'PE', 'CO'];
const NATION = { RU: 'Россия', UA: 'Украина', BY: 'Беларусь', KZ: 'Казахстан', DK: 'Дания', SE: 'Швеция', NO: 'Норвегия', FI: 'Финляндия', FR: 'Франция', DE: 'Германия', PL: 'Польша', CZ: 'Чехия', SK: 'Словакия', HU: 'Венгрия', RO: 'Румыния', BG: 'Болгария', RS: 'Сербия', BA: 'Босния и Герцеговина', GB: 'Великобритания', NL: 'Нидерланды', BE: 'Бельгия', PT: 'Португалия', ES: 'Испания', TR: 'Турция', IL: 'Израиль', BR: 'Бразилия', AR: 'Аргентина', CL: 'Чили', US: 'США', CA: 'Канада', AU: 'Австралия', MN: 'Монголия', CN: 'Китай', LV: 'Латвия', LT: 'Литва', EE: 'Эстония', MK: 'Северная Македония', ME: 'Черногория', XK: 'Косово', ZA: 'ЮАР' };
// календарь шоу (месяц 0–11, день)
const SHOWS = [
  { key: 'sb-cis', name: 'Streamers Battle', m: 2, d: 21, region: CIS, kind: 'show', size: 4, viewers: [1.2, 2.6] },
  { key: 'sb-eu', name: 'Streamers Battle Europe', m: 5, d: 13, region: EU, kind: 'show', size: 4, viewers: [0.5, 1.2] },
  { key: 'allstar', name: 'All-Star Showmatch', m: 7, d: 9, region: null, kind: 'show', size: 2, viewers: [0.8, 1.6] },
  { key: 'sb-br', name: 'Streamers Battle Brasil', m: 8, d: 19, region: SA, kind: 'show', size: 4, viewers: [0.7, 1.5] },
  { key: 'nations', name: 'eSports Nations Cup', m: 11, d: 6, region: null, kind: 'nations', size: 24, viewers: [2.4, 4.2] }
];
const S = () => (seasonState.v33Shows = seasonState.v33Shows || {});
const pool = () => teams.filter(t => !t.isAcademy).flatMap(t => (t.players || []).map(p => ({ p, team: t.name })));
const dateOf = (sh, season) => new Date(yearOf(season), sh.m, sh.d, 18, 0, 0, 0).getTime();

// v84: в сборную могут вызвать любого игрока страны — из клуба, академии или свободного агента
const poolAll = () => { const seen = new Set(), out = []; // один игрок — одна запись (ник может встречаться в клубе и в академии/списке свободных)
  teams.slice().sort((a, b) => (a.isAcademy ? 1 : 0) - (b.isAcademy ? 1 : 0)).forEach(t => (t.players || []).forEach(p => { if (p && p.nick && !/BENCH|STAND/.test(p.status || '') && !seen.has(p.nick.toLowerCase())) { seen.add(p.nick.toLowerCase()); out.push({ p, team: t.name }); } }));
  (typeof transferState !== 'undefined' ? transferState.freeAgents || [] : []).forEach(p => { if (p && p.nick && (+p.firepower || 0) > 0 && !seen.has(p.nick.toLowerCase())) { seen.add(p.nick.toLowerCase()); out.push({ p, team: 'Свободный агент' }); } });
  return out; };
function nationPool() {
  const by = {}; poolAll().forEach(x => { const c = x.p.country; if (/^[A-Z]{2}$/.test(c || '') && NATION[c]) (by[c] = by[c] || []).push(x); });
  return by;
}
// v84: Кубок наций — сюжет на месяц: слухи о вызовах (−35…−21 день), объявление сборных (−14), турнир с остановкой перемотки.
function nationCandidates(season) {
  const by = nationPool(), r = rng(h32('enc-cand|' + season + (seasonState.v29Salt || '')));
  return Object.entries(by).filter(([, l]) => l.length >= 5).map(([c, l]) => {
    const ranked = l.map(x => ({ ...x, sc: pow(x.p) + (r() - .5) * 5 })).sort((a, b) => b.sc - a.sc);
    return { cc: c, name: NATION[c], ranked, str: ranked.slice(0, 5).reduce((a, x) => a + pow(x.p), 0) / 5 };
  }).sort((a, b) => b.str - a.str).slice(0, 24); // v84: до 24 сборных: 8 сеяных + отборочный раунд для 9–24
}
function lockedSquads(season) {
  const L = (S().encSquads || {})[season]; if (!L) return null;
  const by = {}; poolAll().forEach(x => { if (!by[x.p.nick]) by[x.p.nick] = x; });
  return L.map(n => { const pl = n.nicks.map(k => by[k]).filter(Boolean); return pl.length >= 5 ? { name: n.name, cc: n.cc, players: pl.slice(0, 5), str: pl.slice(0, 5).reduce((a, x) => a + pow(x.p), 0) / 5 } : null; }).filter(Boolean);
}
function squadsFor(sh, season, r) {
  if (sh.kind === 'nations') {
    const locked = lockedSquads(season); if (locked && locked.length >= 4) return locked.sort((a, b) => b.str - a.str);
    const by = {}; pool().forEach(x => { const c = x.p.country; if (/^[A-Z]{2}$/.test(c || '') && NATION[c]) (by[c] = by[c] || []).push(x); });
    return Object.entries(by).filter(([, l]) => l.length >= 5).map(([c, l]) => { const five = l.sort((a, b) => pow(b.p) - pow(a.p)).slice(0, 5); return { name: NATION[c], cc: c, players: five, str: five.reduce((s, x) => s + pow(x.p), 0) / 5 }; })
      .sort((a, b) => b.str - a.str).slice(0, sh.size);
  }
  if (sh.key === 'sb-cis') { // v35: настоящий BetBoom Streamers Battle — капитаны-стримеры, в командах стримеры и по два про-игрока СНГ
    const P = window.V35People || {}, st = n => ({ p: { nick: n, role: 'Стример', country: P[n]?.[0] || 'RU', firepower: 55, tacticalIQ: 55, clutch: 55, utility: 55 }, team: 'Стример' });
    const caps = ['Recrent', 'Buster', 'Evelone', 'StRoGo'], mates = ['Exile', 'Skywhywalker', 'shadowkekw', 'des0ut', 'Lixxx', 'Bratishkin', 'Mokrivskyi', 'Mapke'].sort(() => r() - .5);
    const pros = pool().filter(x => CIS.includes(x.p.country)).sort((a, b) => pow(b.p) - pow(a.p)).slice(0, 16).sort(() => r() - .5);
    return caps.map((c, i) => { const pl = [st(c), st(mates[i * 2]), st(mates[i * 2 + 1]), pros[i * 2], pros[i * 2 + 1]].filter(Boolean); return { name: `Команда ${c}`, players: pl, str: pl.reduce((a, x) => a + pow(x.p), 0) / pl.length }; });
  }
  // v84: Streamers Battle Europe/Brasil — капитаны-стримеры сообщества, в каждой команде по три приглашённых про-игрока.
  if ((sh.key === 'sb-eu' || sh.key === 'sb-br') && window.CS2Community) {
    const C = window.CS2Community, region = sh.key === 'sb-eu' ? 'eu' : 'br';
    const caps = C.streamersFor(region, 4), others = C.streamers().filter(x => !caps.includes(x)).sort(() => r() - .5);
    const stP = x => ({ p: { nick: x.nick, role: 'Стример', country: x.cc, firepower: 56, tacticalIQ: 56, clutch: 56, utility: 56 }, team: 'Стример' });
    const pros = pool().filter(x => !sh.region || sh.region.includes(x.p.country)).sort((a, b) => pow(b.p) - pow(a.p)).slice(0, 20).sort(() => r() - .5);
    if (caps.length >= 2 && pros.length >= caps.length * 3) return caps.map((c, i) => {
      const pl = [stP(c), stP(others[i] || caps[(i + 1) % caps.length]), pros[i * 3], pros[i * 3 + 1], pros[i * 3 + 2]].filter(Boolean);
      return { name: `Команда ${c.nick}`, players: pl, str: pl.reduce((a, x) => a + pow(x.p), 0) / pl.length };
    });
  }
  let list = pool().filter(x => !sh.region || sh.region.includes(x.p.country)).sort((a, b) => pow(b.p) - pow(a.p));
  if (sh.key === 'allstar') { // СНГ против остального мира
    const cis = pool().filter(x => CIS.includes(x.p.country)).sort((a, b) => pow(b.p) - pow(a.p)).slice(0, 5), rest = pool().filter(x => !CIS.includes(x.p.country)).sort((a, b) => pow(b.p) - pow(a.p)).slice(0, 5);
    return cis.length === 5 && rest.length === 5 ? [{ name: 'All-Stars СНГ', players: cis, str: cis.reduce((s, x) => s + pow(x.p), 0) / 5 }, { name: 'All-Stars World', players: rest, str: rest.reduce((s, x) => s + pow(x.p), 0) / 5 }] : [];
  }
  const n = sh.size; list = list.slice(0, n * 5 + 4);
  if (list.length < n * 5) return [];
  const caps = list.slice(0, n), rest = list.slice(n).sort(() => r() - .5).sort((a, b) => pow(b.p) - pow(a.p) + (r() - .5) * 6), sq = caps.map(c => ({ name: `Команда ${c.p.nick}`, players: [c] }));
  for (let i = 0; sq.some(s => s.players.length < 5) && i < rest.length; i++) { const round = Math.floor(i / n), j = round % 2 ? n - 1 - (i % n) : i % n; if (sq[j].players.length < 5) sq[j].players.push(rest[i]); }
  sq.forEach(s => { s.str = s.players.reduce((a, x) => a + pow(x.p), 0) / s.players.length; });
  return sq;
}
const MAPS = ['Mirage', 'Inferno', 'Nuke', 'Dust II', 'Ancient', 'Anubis', 'Cache'];
function playSeries(a, b, r, bo) {
  const pA = 1 / (1 + Math.exp(-(a.str - b.str) / 3.5)); let wa = 0, wb = 0; const mp = [], need = Math.ceil(bo / 2), maps = MAPS.slice().sort(() => r() - .5);
  while (wa < need && wb < need) {
    const aw = r() < pA, lo = r() < .12 ? 14 : Math.floor(3 + r() * 9), sc = r() < .12 ? [16, 14] : [13, lo > 11 ? 11 : lo];
    mp.push([maps[mp.length], aw ? sc[0] : sc[1], aw ? sc[1] : sc[0]]); aw ? wa++ : wb++;
  }
  return { a: a.name, b: b.name, w: wa > wb ? a.name : b.name, s: [wa, wb], mp, bo };
}
function run(sh, season) {
  const st = S(), key = sh.key + '|' + season; if (st[key]) return;
  if (sh.kind === 'nations') {
    try { encAnnounce(sh, season); } catch (e) {}
    // Кубок наций по важности как Major: перемотка останавливается в день турнира.
    if (window.v57BatchCalendarSkip && !st['halt|' + key]) { st['halt|' + key] = 1; window.__v84NationsHalt = `${sh.name} ${yearOf(season)}`; }
  }
  const r = rng(h32(key + (seasonState.v29Salt || ''))), sq = squadsFor(sh, season, r);
  st[key] = { done: true, at: nowMs() };
  if (sq.length < 2) return;
  let seed = sq.slice(); const SEED16 = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
  // v84: больше 16 сборных — отборочный раунд: посевы 9…N играют за восемь мест в 1/8 финала против первой восьмёрки
  const opening = [];
  if (sh.kind === 'nations' && seed.length > 16) {
    const top = seed.slice(0, 8), rest = seed.slice(8), k = rest.length - 8, play = rest.slice(rest.length - 2 * k), bye = rest.slice(0, rest.length - 2 * k), win = [];
    for (let i = 0; i < k; i++) { const a = play[i], b = play[2 * k - 1 - i], m = playSeries(a, b, r, 3); opening.push(m); win.push(m.w === a.name ? a : b); }
    seed = top.concat(bye, win);
  }
  let cur = seed.length >= 16 ? SEED16.map(i => seed[i]) : seed.length >= 8 ? [0, 7, 3, 4, 1, 6, 2, 5].map(i => seed[i]) : seed.length >= 4 ? [seed[0], seed[3], seed[1], seed[2]] : seed.slice(0, 2);
  const rounds = [], titles = cur.length === 16 ? ['1/8 финала', 'Четвертьфинал', 'Полуфинал', 'Финал'] : cur.length === 8 ? ['Четвертьфинал', 'Полуфинал', 'Финал'] : cur.length === 4 ? ['Полуфинал', 'Финал'] : ['Шоуматч'];
  const outRound = {};
  const placed = [];
  if (opening.length) { rounds.push({ title: 'Отборочный раунд', ms: opening }); opening.forEach(m => { const l = sq.find(x => x.name === (m.w === m.a ? m.b : m.a)); if (l) { outRound[l.name] = titles.length + 1; placed.unshift(l); } }); }
  titles.forEach((title, i) => {
    const ms = [], next = [];
    for (let j = 0; j < cur.length; j += 2) { const m = playSeries(cur[j], cur[j + 1], r, title === 'Финал' || title === 'Шоуматч' ? (sh.kind === 'nations' ? 5 : 3) : 3); ms.push(m); next.push(cur[j].name === m.w ? cur[j] : cur[j + 1]); outRound[(cur[j].name === m.w ? cur[j + 1] : cur[j]).name] = titles.length - i; placed.unshift(cur[j].name === m.w ? cur[j + 1] : cur[j]); }
    rounds.push({ title, ms }); cur = next;
  });
  const champ = cur[0], results = [{ n: champ.name, p: 1 }].concat(placed.map(x => ({ n: x.name, p: ({ 1: 2, 2: 3, 3: 5, 4: 9, 5: 17 })[outRound[x.name]] || 9 })));
  const rost = {}; sq.forEach(s => { rost[s.name] = s.players.map(x => ({ nick: x.p.nick, role: x.p.role, club: x.team, country: x.p.country, firepower: +x.p.firepower || 0, clutch: +x.p.clutch || 0, utility: +x.p.utility || 0, tacticalIQ: +x.p.tacticalIQ || 0 })); });
  const t = nowMs(), id = `SH${season}-${sh.key}`;
  const snap = { id, v: 1, ts: Date.now(), tier: 'show', prestige: sh.kind, name: `${sh.name} ${yearOf(season)}`, season, year: yearOf(season), format: 'single', size: sq.length, champion: champ.name, prize: sh.kind === 'nations' ? 1500000 : 100000,
    blocks: [{ tab: 'playoff', title: sh.kind === 'nations' ? 'Плей-офф сборных' : 'Шоу-сетка', sections: [{ title: null, rounds }] }], results, gs: t, ge: t, rost, show: true };
  // v84: Кубок наций идёт четыре дня — по раунду в день; итоги, награды и новости — после финала (encReveal)
  const NAT = sh.kind === 'nations', later = [];
  if (NAT) {
    const liveSnap = Object.assign({}, snap, { live: true, champion: '—', results: [], ge: t + (rounds.length - 1) * DAY, blocks: [{ tab: 'playoff', title: 'Плей-офф сборных', sections: [{ title: null, rounds: rounds.slice(0, 1) }] }] });
    try { const A = window.hubArchiveExport(); A[id] = liveSnap; window.hubArchiveImport(A); } catch (e) { console.warn('[v33 shows] архив', e); }
  } else { try { const A = window.hubArchiveExport(); A[id] = snap; window.hubArchiveImport(A); } catch (e) { console.warn('[v33 shows] архив', e); } }
  const v = (sh.viewers[0] + r() * (sh.viewers[1] - sh.viewers[0])).toFixed(1), N0 = window.V29News;
  const N = NAT && N0 ? Object.assign({}, N0, { add: it => { if (it && /^Стартует/.test(it.title || '')) return N0.add(it); later.push(it); } }) : N0;
  const final = rounds[rounds.length - 1].ms[0];
  if (sh.kind === 'nations' && N && N.add) N.add({ cat: 'tournament', icon: '🌍', imp: 7, ev: id, title: `Стартует eSports Nations Cup ${yearOf(season)}: ${sq.length} сборных`,
    lead: `Фавориты по силе составов — ${sq.slice(0, 4).map(x => x.name).join(', ')}. ${opening.length ? 'Отборочный раунд, затем плей-офф' : 'Плей-офф'} с 1/8 финала, финал — до трёх побед.${window.CS2Nations ? ' Хозяин турнира — ' + window.CS2Nations.hostFor(yearOf(season)).city + '.' : ''}`,
    body: [`Первые матчи: ${rounds[0].ms.slice(0, 4).map(m => `${m.a} — ${m.b}`).join(', ')}.`], tags: [] });
  if (N && N.add) N.add({ cat: sh.kind === 'nations' ? 'tournament' : 'event', icon: sh.kind === 'nations' ? '🌍' : '🎙️', title: sh.kind === 'nations' ? `${champ.name} — чемпион eSports Nations Cup ${yearOf(season)}!` : `${sh.name}: победа «${champ.name}»`,
    lead: `${final.w} обыграли ${final.w === final.a ? final.b : final.a} в финале со счётом ${Math.max(...final.s)}:${Math.min(...final.s)}. Пик зрителей — ${v} млн.`,
    body: [sh.kind === 'nations' ? `Состав: ${champ.players.map(x => `${x.p.nick} (${x.team})`).join(', ')}. Клубы отпустили игроков на турнир; на мировой рейтинг он не влияет.` : `Шоу-турнир звёзд: ${champ.players.map(x => x.p.nick).join(', ')}. На рейтинг и титулы клубов не влияет.`],
    tags: N.P ? champ.players.slice(0, 3).map(x => N.P(x.p.nick)) : [], imp: sh.kind === 'nations' ? 9 : 5, ev: id });
  if (sh.kind === 'nations' && N && N.add) {
    const qf = rounds[0].ms.map(m => `${m.w} — ${m.w === m.a ? m.b : m.a} ${Math.max(...m.s)}:${Math.min(...m.s)}`);
    N.add({ cat: 'tournament', icon: '🌍', imp: 7, ev: id, title: `Кубок наций ${yearOf(season)}: итоги плей-офф`, lead: `${rounds[0].title}: ${qf.join('; ')}.`,
      body: rounds.slice(1).map(rd => `${rd.title}: ` + rd.ms.map(m => `${m.w} — ${m.w === m.a ? m.b : m.a} ${Math.max(...m.s)}:${Math.min(...m.s)}`).join('; ') + '.') });
    const mvp = champ.players.slice().sort((a, b) => pow(b.p) - pow(a.p))[0];
    if (mvp) N.add({ cat: 'interview', icon: '🎙️', imp: 6, ev: id, title: `${mvp.p.nick}: «Выиграть за ${champ.name === 'США' ? 'США' : 'свою страну'} — особое чувство»`,
      lead: `MVP Кубка наций ${yearOf(season)} — ${mvp.p.nick} (${mvp.team}).`, body: [r() < .5 ? '«В клубе ты играешь за контракт, здесь — за людей дома. Такой поддержки я не слышал никогда»' : '«Мы собрались за неделю, но говорили на одном языке с первого дня. Этот кубок поедет домой»'], tags: N.P ? [N.P(mvp.p.nick)] : [] });
  }
  if (NAT) { const P = S(); (P.encPending = P.encPending || {})[season] = { snap, later, at: t, n: rounds.length }; }
}
// v84: Кубок наций — особая награда в профиле каждого игрока сборной-победителя (не клубный титул)
function awardNations(snap) {
  const R = window.RewardSystem; if (!R?.addPlayerEventAchievement || !snap || !snap.champion) return 0;
  let n = 0;
  (snap.rost?.[snap.champion] || []).forEach(p => {
    const nick = p?.nick || p; if (!nick) return;
    if (R.addPlayerEventAchievement(nick, { id: snap.id, a: snap.id, n: snap.name, s: snap.season, y: snap.year, k: 'nations', team: snap.champion, nations: true })) n++;
  });
  return n;
}
function awardPastNations() {
  const st = S(); if (st.v84EncAwarded) return; st.v84EncAwarded = 1;
  try { Object.values(window.hubArchiveExport?.() || {}).forEach(s => { if (s && s.prestige === 'nations' && s.champion) awardNations(s); }); } catch (e) {}
}
setTimeout(awardPastNations, 4000);
function preview(sh, season) {
  const st = S(), key = 'pre|' + sh.key + '|' + season, N = window.V29News; if (st[key] || !N || !N.add) return; st[key] = 1;
  N.add({ cat: 'preview', icon: sh.kind === 'nations' ? '🌍' : '🎙️', title: sh.kind === 'nations' ? `Через три дня — eSports Nations Cup ${yearOf(season)}` : `Скоро ${sh.name}: звёзды сыграют в шоу-турнире`,
    lead: sh.kind === 'nations' ? 'До 24 сборных: отборочный раунд, плей-офф с 1/8 финала, финал BO5. Главный турнир сборных года; на клубный рейтинг не влияет.' : 'Капитаны-звёзды соберут команды из игроков региона. Ждём рекордный онлайн.', imp: 4 });
}
const pickOne = (r, a) => a[Math.floor(r() * a.length) % a.length];
function encNews(it) { const N = window.V29News; if (N && N.add) N.add(Object.assign({ icon: '🌍', ev: null }, it)); }
function encRumors(sh, season, wave) {
  const st = S(), key = 'enc-rum' + wave + '|' + season; if (st[key]) return; st[key] = 1;
  const C = nationCandidates(season), r = rng(h32(key)), N = window.V29News, P = N?.P || (x => ({ t: 'player', v: x })), Y = yearOf(season);
  if (C.length < 4) return;
  if (wave === 0) {
    const fav = C.slice(0, 4).map(n => n.name).join(', ');
    encNews({ cat: 'rumor', imp: 6, title: pickOne(r, [`Кубок наций ${Y}: федерации начали собирать сборные`, `До eSports Nations Cup ${Y} месяц — тренеры сборных составляют списки`, `Сборные к Кубку наций: первые списки кандидатов`]),
      lead: `Главные претенденты по силе пятёрок — ${fav}. Окончательные составы объявят за две недели до старта.`,
      body: C.slice(0, 6).map(n => `${n.name}: в расширенном списке ${n.ranked.slice(0, 7).map(x => x.p.nick).join(', ')}.`), tags: C[0].ranked.slice(0, 2).map(x => P(x.p.nick)) });
    return;
  }
  // волны 1–2: спор за последнее место в составе конкретной сборной
  const n = C[(wave * 3 + Math.floor(r() * 3)) % C.length], a = n.ranked[4], b = n.ranked[5] || n.ranked[3];
  if (!a || !b) return;
  const t = pickOne(r, [
    `Источники: ${b.p.nick} может потеснить ${a.p.nick} в сборной (${n.name})`,
    `${n.name}: последнее место в составе на Кубок наций — между ${a.p.nick} и ${b.p.nick}`,
    `Тренер сборной (${n.name}) ещё не определился с пятым игроком`,
    `${b.p.nick} рассчитывает на вызов в сборную — ${n.name}`]);
  const quote = pickOne(r, [`«Играть за страну — это другое. Если позовут, отменю всё»`, `«Решать тренеру. Я своё на сервере показал»`, `«Мы с ${a.p.nick} давно знакомы, кто бы ни поехал — болеть буду за своих»`, `«Слышал разговоры, но официально мне никто не звонил»`]);
  encNews({ cat: 'rumor', imp: 5, title: t, lead: `По данным инсайдеров, в штабе сборной обсуждают две кандидатуры: ${a.p.nick} (${a.team}) и ${b.p.nick} (${b.team}).`,
    body: [`${b.p.nick}: ${quote}.`, `Ядро состава не вызывает вопросов: ${n.ranked.slice(0, 3).map(x => x.p.nick).join(', ')}.`], tags: [P(a.p.nick), P(b.p.nick)] });
}
function encAnnounce(sh, season) {
  const st = S(); st.encSquads = st.encSquads || {}; if (st.encSquads[season]) return;
  const C = nationCandidates(season); if (C.length < 4) { st.encSquads[season] = []; return; }
  const r = rng(h32('enc-ann|' + season)), P = window.V29News?.P || (x => ({ t: 'player', v: x })), Y = yearOf(season);
  st.encSquads[season] = C.map(n => {
    const five = n.ranked.slice(0, 5), capt = five.slice().sort((a, b) => (+b.p.tacticalIQ || 0) - (+a.p.tacticalIQ || 0))[0];
    return { cc: n.cc, name: n.name, nicks: five.map(x => x.p.nick), capt: capt.p.nick, snub: n.ranked[5]?.p.nick || null };
  });
  const A = st.encSquads[season];
  encNews({ cat: 'tournament', imp: 8, title: `Объявлены сборные на eSports Nations Cup ${Y}`, lead: `${A.length} сборных назвали окончательные составы. Капитаны: ${A.slice(0, 4).map(n => `${n.capt} (${n.name})`).join(', ')}.`,
    body: A.map(n => `${n.name}: ${n.nicks.join(', ')}${n.snub ? ` — без ${n.snub}` : ''}.`), tags: A.slice(0, 3).map(n => P(n.capt)) });
  A.slice(0, 8).forEach((n, i) => {
    encNews({ cat: 'tournament', imp: i < 4 ? 6 : 5, title: pickOne(r, [`Сборная (${n.name}) на Кубок наций: ${n.nicks.join(', ')}`, `${n.name} назвала состав на eSports Nations Cup ${Y}`, `Кого вызвали в сборную (${n.name}): ${n.nicks.slice(0, 3).join(', ')} и другие`]),
      lead: `Капитан — ${n.capt}. В составе: ${n.nicks.join(', ')}.`, body: [n.snub ? `Без вызова остался ${n.snub}.` : 'Тренерский штаб обошёлся без сюрпризов.', `Посев на турнире: ${i + 1}.`], tags: n.nicks.slice(0, 3).map(x => P(x)) });
  });
  A.filter(n => n.snub).slice(0, 2).forEach((n, i) => {
    encNews({ cat: 'player', imp: 5, title: pickOne(r, [`${n.snub} не попал в сборную (${n.name})`, `Без ${n.snub}: сборная (${n.name}) сделала выбор`, `${n.snub} остался вне состава сборной`]),
      lead: `Тренерский штаб предпочёл пятёрку ${n.nicks.join(', ')}. ${n.snub} остаётся в резерве.`,
      body: [pickOne(r, [`«Обидно, но я понимаю логику — у ребят сыгранность»`, `«Буду болеть из дома. В следующем году докажу»`, `«Никаких обид. Это решение тренера»`])], tags: [P(n.snub)] });
  });
}
// Сезон в счётчике игры переключается сразу после последнего Мейджора (ноябрь), а шоу привязаны к датам
// календарного года, поэтому их сезон считаем по текущей дате.
const calSeason = () => Math.max(1, new Date(nowMs()).getFullYear() - 2025);
function encReveal(now) {
  const P = S(), pend = P.encPending || {};
  Object.keys(pend).forEach(season => {
    const x = pend[season]; if (!x || !x.snap) return;
    const k = Math.min(x.n, Math.floor((now - x.at) / DAY) + 1), id = x.snap.id;
    if (k < x.n) {
      if (x.shown === k) return; x.shown = k;
      try { const A = window.hubArchiveExport(); if (A[id]) { A[id].blocks = [{ tab: 'playoff', title: 'Плей-офф сборных', sections: [{ title: null, rounds: x.snap.blocks[0].sections[0].rounds.slice(0, k) }] }]; window.hubArchiveImport(A); } } catch (e) {}
      return;
    }
    const fin = Object.assign({}, x.snap, { gs: x.at, ge: now });
    try { const A = window.hubArchiveExport(); A[id] = fin; window.hubArchiveImport(A); } catch (e) {}
    awardNations(fin);
    try { (x.later || []).forEach(it => window.V29News?.add?.(it)); } catch (e) {}
    delete pend[season];
  });
}
function tick() {
  const s = calSeason(), now = nowMs();
  try { encReveal(now); } catch (e) { console.warn('[v33 enc]', e); }
  SHOWS.forEach(sh => {
    const at = dateOf(sh, s);
    if (sh.kind === 'nations') {
      if (now >= at - 35 * DAY && now < at) encRumors(sh, s, 0);
      if (now >= at - 28 * DAY && now < at) encRumors(sh, s, 1);
      if (now >= at - 21 * DAY && now < at) encRumors(sh, s, 2);
      if (now >= at - 14 * DAY && now < at) encAnnounce(sh, s);
    }
    if (now >= at - 3 * DAY && now < at) preview(sh, s);
    if (now >= at) run(sh, s);
  });
}
// логотип сборной — нарисованный флаг страны (SVG): полосы, скандинавские кресты, звёзды, канton и т.д.
const NAT_BY_NAME = Object.fromEntries(Object.entries(NATION).map(([c, n]) => [n, c]));
const flagUri = c => window.V34Flags ? window.V34Flags.uri(c) : '';
window.V33Flag = c => window.V34Flags ? window.V34Flags.svg(c) : '';
(function wrapMedia() { const M = window.V31Media; if (!M || M.__v33) return; const orig = M.url; M.url = (kind, name) => (kind === 'team' && NAT_BY_NAME[name]) ? flagUri(NAT_BY_NAME[name]) : orig(kind, name); M.__v33 = true; })();
if (H) { H.KIND.show = 'Шоу'; H.KIND.nations = 'S-Tier · Сборные'; if (H.KIND_ORDER) { H.KIND_ORDER.show = 7; H.KIND_ORDER.nations = 1.5; } }
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; try { tick(); } catch (e) { console.warn('[v33 shows]', e); } }, 3000);
window.V33Shows = { calSeason, SHOWS, squadsFor, run, tick, dateOf, nationCandidates, encAnnounce, NATION, NAT_BY_NAME };
console.info('[v33] шоу-турниры и Кубок наций');
})();
