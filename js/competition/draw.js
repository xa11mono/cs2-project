/* v84 — жеребьёвка турниров Tier-1 заранее. Как только состав турнира зафиксирован (приглашения + квалификации),
   посев замораживается по VRS на этот момент, и сетка первого раунда становится известна: пары, даты, ожидаемые
   «вкусные» матчи. Турнир стартует ровно с этой сеткой (setupBracketTournament берёт замороженный посев).
   Новость «Жеребьёвка …» выделяет дерби (команды одной страны/СНГ), реванш последнего финала и битвы топ-8.
   На странице ещё не начавшегося турнира — блок «Сетка первого раунда» с расписанием.
   Сейчас — для форматов с сеткой (одиночное/двойное выбывание); групповые и швейцарские этапы показывают состав. */
(function () {
  'use strict';
  const W = window, H = W.HS, DAY = 864e5;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const T = n => (typeof teams !== 'undefined' ? teams : []).find(t => t.name === n);
  const CIS = ['RU', 'UA', 'BY', 'KZ', 'UZ', 'KG'];
  function seedOrder(n) { let ord = [1]; while (ord.length < n) { const m = ord.length * 2 + 1; ord = ord.flatMap(x => [x, m - x]); } return ord; }
  function nation(t) { const c = {}; (t?.players || []).slice(0, 5).forEach(p => { if (p?.country) c[p.country] = (c[p.country] || 0) + 1; }); const b = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return b && b[1] >= 3 ? b[0] : null; }
  function lastFinal() {
    try { const A = Object.values(W.hubArchiveExport?.() || {}).filter(s => s && s.champion && !s.show && /major|elite|regular/i.test(String(s.prestige || s.kind || ''))).sort((a, b) => (b.ge || 0) - (a.ge || 0))[0];
      const second = (A?.results || []).find(r => r.p === 2)?.n; return A && second ? { a: A.champion, b: second, ev: A.name } : null; } catch (e) { return null; }
  }
  function storyOf(a, b, rank, fin) {
    const na = nation(T(a)), nb = nation(T(b));
    if (fin && ((fin.a === a && fin.b === b) || (fin.a === b && fin.b === a))) return `реванш финала ${fin.ev}`;
    if (na && na === nb) return `дерби (${na})`;
    if (na && nb && CIS.includes(na) && CIS.includes(nb)) return 'СНГ-дерби';
    if ((rank[a] || 99) <= 8 && (rank[b] || 99) <= 8) return 'битва топ-8 уже в первом раунде';
    if (Math.abs((rank[a] || 50) - (rank[b] || 50)) >= 15) return 'шанс на сенсацию';
    return '';
  }
  // участники известны: состав зафиксирован или все квалификации турнира завершены
  function knownParticipants(i, step) {
    if (step.v35Roster?.participants?.length) return step.v35Roster.participants.slice();
    const need = Number(step.size) || 16, now = Number(ST()?.calendar?.currentMs) || Date.now(), start = Number(step.calendar?.startMs) || 0;
    try {
      const info = W.v35QualInfo?.(i);
      if (info && info.quals.length && info.quals.every(q => q.status === 'completed')) { const list = [...new Set([...info.invites, ...info.qualified, ...info.atLarge])]; return list.length >= need ? list.slice(0, need) : null; }
      // турнир только по приглашениям: состав фиксируется за 7 дней до старта
      if (info && !info.quals.length && start && start - now <= 7 * DAY) { const list = (W.CS2InviteList ? W.CS2InviteList(need) : info.participants || []).slice(0, need); return list.length >= need ? list : null; }
    } catch (e) {}
    return null;
  }
  function makeDraw(step, names) {
    names = (names || step.v35Roster?.participants || []).slice(); const size = names.length;
    const fmt = String(step.format || '');
    if (size < 4 || (size & (size - 1)) !== 0 || !/single|double|swiss|gsl/.test(fmt)) return null;
    const seeds = names.map(T).filter(Boolean).sort((a, b) => (Number(b.pts) || 0) - (Number(a.pts) || 0)).map(t => t.name);
    if (seeds.length !== size) return null;
    const at = Number(ST()?.calendar?.currentMs) || Date.now(), pairs = [];
    if (/swiss/.test(fmt)) { // первый тур Swiss как у Valve: 1–9, 2–10, … (верхняя половина посева против нижней)
      const half = size / 2; for (let i = 0; i < half; i++) pairs.push([seeds[i], seeds[i + half]]);
      return { type: 'swiss', seeds, pairs, at };
    }
    if (/gsl/.test(fmt) && size === 16) { // четыре группы «змейкой» по корзинам; в группе стартовые матчи: 1-й против 4-го, 2-й против 3-го
      const groups = [[0, 15, 7, 8], [1, 14, 6, 9], [2, 13, 5, 10], [3, 12, 4, 11]].map(g => g.map(i => seeds[i]));
      groups.forEach(g => { pairs.push([g[0], g[1]]); pairs.push([g[2], g[3]]); });
      return { type: 'gsl', seeds, groups, pairs, at };
    }
    if (!/single|double/.test(fmt)) return null;
    const ord = seedOrder(size).map(i => seeds[i - 1]);
    for (let i = 0; i < size; i += 2) pairs.push([ord[i], ord[i + 1]]);
    return { type: 'bracket', seeds, pairs, at };
  }
  function tick() {
    const st = ST(); if (!st) return;
    const sch = st.seasonSchedule || [], from = Number(st.tournamentIndex) || 1;
    for (let i = from; i < Math.min(sch.length, from + 3); i++) {
      const step = sch[i]; if (!step || step.type === 'major' || step.v84Draw) continue;
      const names = knownParticipants(i, step); if (!names) continue;
      const d = makeDraw(step, names); if (!d) { step.v84Draw = { none: true }; continue; }
      step.v84Seeds = d.seeds; step.v84Draw = d;
      // жеребьёвка фиксирует и состав: при старте турнир берёт ровно эти команды (а не пересчитанный за неделю рейтинг)
      if (!step.v35Roster) { let info = null; try { info = W.v35QualInfo?.(i); } catch (e) {} const inv = (info?.invites || []).filter(n => d.seeds.includes(n));
        step.v35Roster = { version: 1, lockedAt: d.at, invites: inv, qualified: d.seeds.filter(n => !inv.includes(n)), atLarge: [], participants: d.seeds.slice(), pendingQualifiers: [], v84: true }; step.v35Invites = inv.slice(); }
      const rank = {}; (typeof teams !== 'undefined' ? teams : []).filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0)).forEach((t, k) => { rank[t.name] = k + 1; });
      const fin = lastFinal(), stories = d.pairs.map(([a, b]) => ({ a, b, s: storyOf(a, b, rank, fin) })).filter(x => x.s);
      try {
        W.V29News?.add?.({ cat: 'tournament', icon: '🎲', imp: 6, title: `Жеребьёвка ${step.name}: ${d.type === 'gsl' ? 'составлены группы' : 'известны пары первого раунда'}`, lead: stories.length ? `Главное: ${stories.slice(0, 3).map(x => `${x.a} — ${x.b} (${x.s})`).join('; ')}.` : `Первый номер посева — ${d.seeds[0]}, сетка сформирована по рейтингу VRS.`,
          body: [`Пары: ${d.pairs.map(([a, b]) => `${a} — ${b}`).join(', ')}.`, `Старт — ${step.calendar?.startMs ? new Date(step.calendar.startMs).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'по календарю'}.`], tags: [] });
      } catch (e) {}
    }
  }
  // турнир стартует с замороженным посевом
  CS2.patch('setupBracketTournament', base => function (roster, formatChoice) {
      try {
        const ct = typeof currentTournament !== 'undefined' ? currentTournament : null, st = ST();
        const step = ct && !ct.isMajor && st ? ((st.seasonSchedule || []).find(x => x && x.name === ct.name && x.v84Seeds) || (st.seasonSchedule || [])[ct.tourIndex]) : null, seeds = step?.v84Seeds;
        if (ct && Array.isArray(seeds) && Array.isArray(roster) && roster.length === seeds.length && roster.every(t => seeds.includes(t.name))) {
          const sorted = seeds.map(n => roster.find(t => t.name === n)); ct.seedFromOrder = true;
          return base.call(this, sorted, formatChoice);
        }
      } catch (e) {}
      return base.apply(this, arguments);
    }, { id: '__v84draw' });
  const drawForCurrent = () => { const ct = typeof currentTournament !== 'undefined' ? currentTournament : null, st = ST(); if (!ct || ct.isMajor || !st) return null; const d = ((st.seasonSchedule || []).find(x => x && x.name === ct.name && x.v84Draw) || (st.seasonSchedule || [])[ct.tourIndex])?.v84Draw; return d && !d.none ? d : null; };
  CS2.patch('setupSwissTournament', base => function (roster) {
      try { const d = drawForCurrent(); if (d && d.type === 'swiss' && Array.isArray(roster) && roster.length === d.seeds.length && roster.every(t => d.seeds.includes(t.name))) {
        const by = n => roster.find(t => t.name === n); return base.call(this, d.pairs.flat().map(by)); } } catch (e) {}
      return base.apply(this, arguments);
    }, { id: '__v84draw' });
  CS2.patch('setupGSLTournament', base => function (roster) {
      try { const d = drawForCurrent(); if (d && d.type === 'gsl' && Array.isArray(roster) && roster.length === 16 && roster.every(t => d.seeds.includes(t.name))) {
        const by = n => roster.find(t => t.name === n);
        currentTournament.gsl = { groups: d.groups.map((g, i) => { const tm = g.map(by); return { id: i + 1, teams: tm, qualified: [], eliminated: [], matches: {
          opening1: { t1: tm[0].name, t2: tm[1].name, winner: null, score: '', isBO1: false }, opening2: { t1: tm[2].name, t2: tm[3].name, winner: null, score: '', isBO1: false },
          winners: { t1: null, t2: null, winner: null, score: '', isBO1: false }, losers: { t1: null, t2: null, winner: null, score: '', isBO1: false }, decider: { t1: null, t2: null, winner: null, score: '', isBO1: false } } }; }) };
        return; } } catch (e) {}
      return base.apply(this, arguments);
    }, { id: '__v84draw' });
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(() => { try { tick(); } catch (e) {} }, 4000);
  try { CS2.patch('v29CheckTournamentStart', b => function () { try { tick(); } catch (e) {} return b.apply(this, arguments); }, { id: '__v84draw', ifExists: true }); } catch (e) {}

  // блок на странице ещё не начавшегося турнира
  if (H) (H.AFTER || []).push(page => {
    if (page !== 'event') return;
    try {
      const st = ST(), m = /^T1:(\d+):(\d+)$/.exec(String(H.S.arg || '')); if (!m || +m[1] !== Number(st?.currentSeason)) return;
      const step = (st.seasonSchedule || [])[+m[2]], d = step?.v84Draw; if (!d || d.none) return;
      const root = document.getElementById('hs-page'); if (!root || root.querySelector('.v84-draw')) return;
      const rank = {}; (typeof teams !== 'undefined' ? teams : []).filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0)).forEach((t, k) => { rank[t.name] = k + 1; });
      const fin = lastFinal(), start = Number(step.calendar?.startMs) || 0, perDay = Math.ceil(d.pairs.length / 2);
      const rows = d.pairs.map(([a, b], i) => { const s = storyOf(a, b, rank, fin), day = start ? new Date(start + Math.floor(i / perDay) * DAY).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';
        return `<div class="v84-draw-m"><small>${day} · ${15 + (i % perDay) * 3}:00</small><button type="button" data-team="${H.esc(a)}">${H.logo(a, 'sm')}<b>${H.esc(a)}</b><i>#${d.seeds.indexOf(a) + 1}</i></button><em>vs</em><button type="button" data-team="${H.esc(b)}">${H.logo(b, 'sm')}<b>${H.esc(b)}</b><i>#${d.seeds.indexOf(b) + 1}</i></button>${s ? `<span class="v84-draw-s">${H.esc(s)}</span>` : ''}</div>`; }).join('');
      const groupsHtml = d.type === 'gsl' ? `<div class="v84-draw-groups">${d.groups.map((g, gi) => `<div><h4>Группа ${'ABCD'[gi]}</h4>${g.map(n => `<button type="button" data-team="${H.esc(n)}">${H.logo(n, 'xs')} ${H.esc(n)} <i>#${d.seeds.indexOf(n) + 1}</i></button>`).join('')}</div>`).join('')}</div>` : '';
      const title = d.type === 'gsl' ? 'Группы и стартовые матчи · жеребьёвка проведена' : d.type === 'swiss' ? 'Первый тур Swiss · жеребьёвка проведена' : 'Сетка первого раунда · жеребьёвка проведена';
      const html = H.box(title, `${groupsHtml}<div class="v84-draw">${rows}</div><p class="hs-note">Посев — по рейтингу VRS на момент завершения квалификаций. ${d.type === 'swiss' ? 'Первый тур: верхняя половина посева против нижней (1–9, 2–10…), дальше пары по результатам. ' : d.type === 'gsl' ? 'Группы составлены «змейкой» по корзинам; в группе сильнейший играет со слабейшим. ' : ''}Время матчей ориентировочное.</p>`);
      const tabs = root.querySelector('.hs-ptabs'); if (tabs) tabs.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('beforeend', html);
    } catch (e) {}
  });
  W.CS2Draw = { tick, makeDraw };
})();
