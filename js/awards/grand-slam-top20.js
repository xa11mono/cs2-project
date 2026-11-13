/* v33 — Grand Slam и обратный отсчёт топ-20 календарного года.
   Grand Slam: команда, выигравшая 3 турнира серий IEM и ESL Pro League в пределах 5 таких турниров подряд,
   получает золотой слиток и $1 000 000 (бюджет организации), выходит новость. После награды отсчёт
   начинается заново: учитываются только турниры после выигранного слэма.
   Топ-20: в конце сезона места раскрываются по одному в игровой день — с №20 до №1; первая пятёрка —
   главные новости дня. */
(function () {
'use strict';
const H = window.HS;
const SS = () => (typeof seasonState !== 'undefined' ? seasonState : null);
const N = () => window.V29News;
const ELIG = /\biem\b|intel|esl pro league/i, NEED = 3, WINDOW = 5, PRIZE = 1000000;

function eligible() {
  const events = window.RewardSystem?.getArchiveEvents?.()
    || Object.values(window.hubArchiveExport ? window.hubArchiveExport() : {});
  const curSeason = (typeof seasonState !== 'undefined' && Number(seasonState.currentSeason)) || 99;
  return events.filter(s => s && Number(s.season || 1) <= curSeason && ELIG.test(s.name || '') && ['major', 'elite', 'regular'].includes(s.kind || s.prestige) && s.champion && s.champion !== '—')
    .sort((a, b) => (a.season - b.season) || ((a.ge || a.gs || a.ts || 0) - (b.ge || b.gs || b.ts || 0)));
}
// все слэмы по истории: окно из 5 подряд идущих турниров, 3 победы одной команды
function slams() {
  const ev = eligible(), out = []; let start = 0;
  for (let i = 0; i < ev.length; i++) {
    const win = ev.slice(Math.max(start, i - WINDOW + 1), i + 1), team = ev[i].champion;
    const mine = win.filter(s => s.champion === team);
    if (mine.length >= NEED) { out.push({ id: 'gs|' + ev[i].id, team, season: ev[i].season, events: mine.map(s => ({ id: s.id, name: s.name })), at: ev[i].ge || ev[i].ts || 0 }); start = i + 1; }
  }
  return { list: out, open: ev.slice(start) };
}
// гонка за текущим слэмом: кто сколько выиграл в открытом окне
function race() {
  const { open } = slams(), win = open.slice(-WINDOW), by = {};
  win.forEach(s => { (by[s.champion] = by[s.champion] || []).push(s); });
  return { left: WINDOW - win.length, rows: Object.entries(by).map(([team, l]) => ({ team, n: l.length, events: l })).sort((a, b) => b.n - a.n) };
}
function payNew() {
  const s = SS(); if (!s) return;
  const paid = s.v33GSPaid = s.v33GSPaid || [];
  slams().list.forEach(g => {
    if (paid.includes(g.id)) return; paid.push(g.id);
    try { if (window.V31) window.V31.book ? window.V31.book(g.team, PRIZE, 'prize', 'Grand Slam') : null; } catch (e) {}
    const n = N(); if (n && n.add) n.add({ cat: 'award', icon: '🥇', title: `${g.team} выигрывают Grand Slam!`, lead: `Три титула подряд в сериях IEM и ESL Pro League: ${g.events.map(e => e.name).join(', ')}. Команда получает золотой слиток и бонус $1 000 000.`,
      body: ['Grand Slam вручается команде, выигравшей 3 турнира IEM и ESL Pro League в пределах 5 таких турниров подряд. После вручения отсчёт начинается заново.'], tags: n.T ? [n.T(g.team)] : [], imp: 9, team: g.team });
  });
  if (paid.length > 200) paid.splice(0, paid.length - 200);
}

// обратный отсчёт топ-20
function startCountdown(y, top) {
  const s = SS(); if (!s) return;
  if (s.v33T20 && s.v33T20.y === y) return;
  s.v33T20 = { y, list: top.slice(0, 20).map(x => ({ nick: x.nick, r: x.r, team: x.team })), next: Math.min(20, top.length), day: 0 };
  try { saveSeasonState(); } catch (e) {}
}
// церемония HLTV Awards: топ-3 и все награды года — в один день
function setCeremonyAwards(y, aw) { const s = SS(); if (!s) return; s.v35Cer = s.v35Cer || {}; s.v35Cer[y] = aw; try { saveSeasonState(); } catch (e) {} }
function ceremony(s, c, n) {
  const y = c.y, top3 = [3, 2, 1].map(r => c.list.find(z => z.r === r)).filter(Boolean), aw = (s.v35Cer || {})[y] || [];
  const hof = (s.hallOfFame || []).find(h => (h.year || 2025 + h.season) === y), stat = x => { try { const o = H.stats().P[x.nick], L = o ? H.line(o.byYear?.[y] || o.bySeason[x.y - 2025] || o.bySeason[y - 2025] || o.all) : null; return L ? ` — Rating 3.0 ${L.rating.toFixed(2)}, ${L.maps} карт` : ''; } catch (e) { return ''; } };
  const first = top3.find(x => x.r === 1);
  n.add({ cat: 'award', icon: '🎤', imp: 9, title: `HLTV Awards ${y}: ${first ? first.nick + ' — лучший игрок года' : 'итоги года'}`, lead: `На церемонии объявлены тройка лучших игроков ${y} года и все награды календарного года.`,
    body: top3.map(x => `№${x.r} — ${x.nick} (${x.team || '—'})${stat(x)}.`).concat(hof ? [`Команда года — ${hof.champion}.`] : [], aw.map(x => `${x.label}: ${x.nick}${x.team ? ' (' + x.team + ')' : ''}.`)),
    tags: n.P ? top3.map(x => n.P(x.nick)) : [], player: first?.nick, team: first?.team });
  if (first) n.add({ cat: 'award', icon: '🏆', imp: 10, title: `Лучший игрок ${y} года — ${first.nick}!`, lead: `${first.nick} (${first.team || '—'}) возглавил топ-20 HLTV по итогам года${stat(first)}.`,
    body: [`Второе место — ${top3.find(x => x.r === 2)?.nick || '—'}, третье — ${top3.find(x => x.r === 3)?.nick || '—'}.`], tags: n.P ? [n.P(first.nick)] : [], player: first.nick, team: first.team });
  c.next = 0;
}
function tickCountdown() {
  const s = SS(), c = s?.v33T20, n = N(); if (!c || c.next < 1 || !n || !n.add) return;
  const day = Math.floor((Number(s.calendar?.currentMs) || Date.now()) / 864e5); if (day === c.day) return;
  c.day = day;
  if (c.next <= 3) { ceremony(s, c, n); try { saveSeasonState(); } catch (e) {} return; } // последний день — церемония HLTV Awards
  const x = c.list.find(z => z.r === c.next); c.next--;
  if (x) {
    const L = (() => { try { const o = H.stats().P[x.nick]; return o ? H.line(o.byYear?.[c.y] || o.bySeason[c.y - 2025] || o.all) : null; } catch (e) { return null; } })();
    const facts = L ? [`Rating 3.0 за год: ${L.rating.toFixed(2)} на ${L.maps} картах`, `ADR ${L.adr.toFixed(1)}, KAST ${L.kast.toFixed(1)}%, K/D ${L.kd.toFixed(2)}`] : [];
    const top = x.r <= 5;
    n.add({ cat: 'award', icon: '🏅', title: x.r === 1 ? `Лучший игрок ${c.y} года — ${x.nick}!` : `Топ-20 игроков ${c.y}: №${x.r} — ${x.nick}`, lead: x.r === 1 ? `${x.nick} (${x.team || '—'}) возглавляет рейтинг лучших игроков календарного года.` : `${x.nick} (${x.team || '—'}) занимает ${x.r}-е место в рейтинге лучших игроков года.`,
      body: facts.concat(x.r > 4 ? [`Завтра — №${x.r - 1}.`] : x.r === 4 ? ['Завтра — церемония HLTV Awards: объявят тройку лучших игроков года и все награды.'] : ['Рейтинг составлен по Rating 3.0 в турнирах Major/S-Tier/Tier-1 за календарный год, титулам и MVP.']), tags: n.P ? [n.P(x.nick)] : [], imp: x.r === 1 ? 10 : top ? 8 : 5, player: x.nick, team: x.team });
  }
  try { saveSeasonState(); } catch (e) {}
}

// полка команды: золотые слитки Grand Slam первыми
function teamShelf(name) {
  return teamShelfItems(name).map(item => item.html).join('');
}
// слэмы игрока: был в составе команды на турнире, который принёс слэм
function playerSlams(nick) {
  const A = window.hubArchiveExport ? window.hubArchiveExport() : {};
  return slams().list.filter(g => g.events.some(e => (A[e.id]?.rost?.[g.team] || []).some(p => p.nick === nick)));
}
function teamShelfItems(name) {
  if (!window.TW) return [];
  const specials = window.RewardSystem?.getTeamSpecialAwards(name) || [];
  return specials.map(a => {
    if (a.type === 'grand-slam') {
      const events = (a.events || []).map(e => e.name).filter(Boolean);
      const detail = `Grand Slam · сезон ${a.season}${events.length ? '\n' + events.map(n => '• ' + n).join('\n') : ''}`;
      return { s: a.season, t: a.createdAt || 0, k: 'honour', html: `<span class="tm-cup gs" data-tip="${H ? H.esc(detail) : detail}">${window.TW.goldBarSvg ? window.TW.goldBarSvg() : '<b>🥇</b>'}<i>${H ? H.yearOf(a.season) : a.year}</i></span>` };
    }
    const year = Number(a.year) || H?.yearOf(a.season) || 2026;
    const type = a.type === 'team-season' ? 'teamseason' : 'team';
    const label = a.type === 'team-year' ? 'Команда года' : 'Команда сезона';
    const svg = window.TW.awardSvg ? window.TW.awardSvg(type, year) : `<b class="team-honour-fallback">${type === 'teamseason' ? '◈' : '★'}</b>`;
    return { s: a.season, t: a.createdAt || 0, k: 'honour', html: `<span class="tm-cup team-honour" data-tip="${H ? H.esc(`${label} · ${year} · ${name}`) : `${label} · ${year}`} ">${svg}<i>${year}</i></span>` };
  });
}

window.V33Awards = { slams, race, startCountdown, setCeremonyAwards, teamShelf, teamShelfItems, playerSlams, tickCalendarDay: () => window.CS2Awards ? window.CS2Awards.tick() : tickCountdown(), flushBatch: () => { payNew(); window.CS2Awards ? window.CS2Awards.tick() : tickCountdown(); }, tick: () => { payNew(); window.CS2Awards ? window.CS2Awards.tick() : tickCountdown(); } };

if (H) {
  const orig = H.PAGES.awards;
  H.PAGES.awards = arg => {
    const html = orig(arg);
    if (H.S.aw?.tab && H.S.aw.tab !== 'year') return html;
    const r = race(), all = slams().list.slice().reverse();
    const rows = r.rows.slice(0, 6).map(x => `<div class="gs-row" data-team="${H.esc(x.team)}">${H.logo(x.team, 'sm')}<b>${H.esc(x.team)}</b><span class="gs-pips">${Array.from({ length: NEED }, (_, i) => `<i class="${i < x.n ? 'on' : ''}"></i>`).join('')}</span><small>${x.events.map(e => H.esc(e.name)).join(' · ')}</small></div>`).join('');
    const boxHtml = H.box('Grand Slam', `<div class="gs"><span class="gs-bar">${window.TW?.goldBarSvg ? window.TW.goldBarSvg() : ''}</span><div class="gs-b"><p class="hs-note">3 титула IEM / ESL Pro League в пределах 5 таких турниров подряд. Приз — золотой слиток и $1 000 000. Учитываются последние 5 турниров этих серий после прошлого слэма.</p>${rows || '<p class="hs-dim">В текущем окне титулов ещё нет.</p>'}
      ${all.length ? `<div class="gs-hist">${all.slice(0, 8).map(g => `<span data-team="${H.esc(g.team)}">${H.logo(g.team, 'xs')} ${H.esc(g.team)} · ${H.yearOf(g.season)}</span>`).join('')}</div>` : ''}</div></div>`);
    const i = html.indexOf('<section'); return i < 0 ? html + boxHtml : html.slice(0, i) + boxHtml + html.slice(i);
  };
}
// полка трофеев в шапке игрока: Grand Slam, медаль MVP со счётчиком, награды года, топ-20, титулы
if (H) {
  const origP = H.PAGES.player;
  H.PAGES.player = arg => {
    const html = origP(arg), nick = String(arg || '').split('/')[0];
    let items = '';
    try { const gs = playerSlams(nick).map(g => ({ y: H.yearOf(g.season), html: `<span class="hs-achi gs" data-tip="${H.esc(`Grand Slam · ${g.team} · сезон ${g.season}\n` + g.events.map(e => '• ' + e.name).join('\n'))}">${window.TW.goldBarSvg()}<i>'${String(H.yearOf(g.season)).slice(-2)}</i></span>` }));
      const ach = H.achItems ? H.achItems(nick) : { list: [] };
      const head = (ach.list || []).filter(x => x.lead), rest = (ach.list || []).filter(x => !x.lead).concat(gs).sort((a, b) => (b.y || 0) - (a.y || 0) || (b.o || 0) - (a.o || 0));
      items = head.concat(rest).map(x => x.html).join(''); } catch (e) { console.warn('[v33 shelf]', e); }
    if (!items) return html;
    const shelf = `<div class="pl-shelf" aria-label="Трофеи игрока">${items}</div>`;
    const i = html.indexOf('<div class="hs-ptiles">');
    return i < 0 ? html : html.slice(0, i) + shelf + html.slice(i);
  };
}
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; try { payNew(); if (!window.CS2Awards) tickCountdown(); } catch (e) { console.warn('[v33 awards]', e); } }, 4000);
console.info('[v33] Grand Slam и топ-20');
})();
