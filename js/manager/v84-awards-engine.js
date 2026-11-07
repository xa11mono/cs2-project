/* v84 — единый движок наград сезона (CS2Awards).
   Раньше итоги года решали независимо друг от друга:
     • auto_script_1 — «Чемпион/Команда сезона» = команда с наибольшими очками рейтинга;
     • auto_script_2 (v7) — «Ростер года», «MVP сезона» (команда!), «Прорыв», «Разочарование»;
     • v37 — «Команда года» по своей формуле мест на турнирах (могла отличаться от «Команды сезона»);
     • v53 — годовые награды игроков сразу в момент окончания сезона;
     • v33 — отложенный обратный отсчёт топ-20 (не вызывался).
   Теперь все решения принимаются здесь, один раз на сезон:
     teamOfYear() — одна «Команда года» (сезон = календарный год),
     risingTeam() — главный прорыв, disappointment() — разочарование;
     личные награды и топ-20 рассчитываются V36Fixes.computeYearAwards и фиксируются в момент
     окончания сезона (замороженный снимок), а публикуются по календарю:
       с 20 декабря — по одному месту топ-20 в день (№20 → №4),
       в начале января — церемония: топ-3, все личные награды и Команда года. */
(function () {
  'use strict';
  const W = window;
  const DAY = 86400000;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const TEAMS = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const now = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const yearOf = s => 2026 + (Math.max(1, Number(s) || 1) - 1);
  const save = () => { try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {} };
  const classify = s => W.RewardSystem?.classifyEvent?.(s?.prestige || s?.kind, s?.name, s?.tier, s) || s?.prestige || 'regular';

  // Вес события и очков за место — единая формула «результатов сезона».
  // Команду года решают только турниры Tier-1: Major весит заметно больше S-Tier, Tier-2/3 и академии не учитываются.
  const EVENT_WEIGHT = { major: 24, elite: 8, regular: 6, tier2: 0, tier3: 0, academy: 0 }; // Major-титул ≈ трём титулам S-Tier
  const placePts = p => ({ 1: 1, 2: .55, 3: .33, 4: .25, 5: .14, 6: .12, 7: .1, 8: .08 }[p] || (p <= 16 ? .035 : 0));

  function seasonEvents(season) {
    const all = W.RewardSystem?.getArchiveEvents?.() || Object.values(W.hubArchiveExport?.() || {});
    return all.filter(s => s && Number(s.season) === Number(season) && s.champion && s.champion !== '—' && !s.live && !s.scheduled)
      .map(s => ({ ...s, kind: classify(s) }))
      .filter(s => s.kind !== 'qual' && s.kind !== 'show' && !/show|шоу/i.test(String(s.name || '')));
  }
  function seasonScores(season) {
    const scores = {};
    seasonEvents(season).forEach(s => {
      const w = EVENT_WEIGHT[s.kind] ?? 1; if (!w) return;
      const res = Array.isArray(s.results) ? s.results : [];
      if (res.length) res.forEach(r => { if (r?.n && r.p) scores[r.n] = (scores[r.n] || 0) + w * placePts(Number(r.p)); });
      else scores[s.champion] = (scores[s.champion] || 0) + w;
    });
    return scores;
  }
  // Команда года: наибольший результат за сезон; при равенстве — рейтинг на конец года.
  function teamOfYear(season) {
    const scores = seasonScores(season), pts = n => Number(TEAMS().find(t => t.name === n)?.pts) || 0;
    const rows = Object.entries(scores).filter(([n]) => !TEAMS().find(t => t.name === n)?.isAcademy)
      .sort((a, b) => b[1] - a[1] || pts(b[0]) - pts(a[0]));
    if (rows.length) return { team: rows[0][0], score: Math.round(rows[0][1] * 100) / 100, events: seasonEvents(season).length };
    const top = TEAMS().filter(t => !t.isAcademy).slice().sort((a, b) => (b.pts || 0) - (a.pts || 0))[0];
    return top ? { team: top.name, score: 0, events: 0 } : null;
  }
  function rankMaps() {
    const list = TEAMS().filter(t => !t.isAcademy).slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
    const fin = {}; list.forEach((t, i) => { fin[t.name] = i + 1; });
    return { list, fin };
  }
  function risingTeam() {
    const { list, fin } = rankMaps(); let best = null, diff = -999;
    list.forEach(t => { const start = Number(t.seasonStartRank) || fin[t.name]; const d = start - fin[t.name]; if (fin[t.name] <= 20 && d > diff) { diff = d; best = t.name; } });
    return best ? { team: best, climb: diff } : null;
  }
  function disappointment(season) {
    const { list, fin } = rankMaps(), scores = seasonScores(season);
    const pool = list.filter(t => (Number(t.seasonStartRank) || 99) <= 8);
    pool.sort((a, b) => ((scores[a.name] || 0) - (scores[b.name] || 0)) || (fin[b.name] - fin[a.name]));
    return pool[0]?.name || null;
  }

  // Тренер года: тренер Команды года; если главный «прорыв» поднялся минимум на 8 мест
  // и вошёл в топ-10 рейтинга — награда уходит его тренеру.
  function coachOfYear(season, team, rise) {
    const coachOf = n => { const c = TEAMS().find(t => t.name === n)?.coach; return typeof c === 'string' ? c : c?.name || null; };
    const { fin } = rankMaps();
    if (rise?.team && rise.climb >= 8 && (fin[rise.team] || 99) <= 10 && coachOf(rise.team)) return { name: coachOf(rise.team), team: rise.team };
    if (team?.team && coachOf(team.team)) return { name: coachOf(team.team), team: team.team };
    return null;
  }
  // ---------------------------------------------------------------- церемония
  function state() { const s = ST(); if (!s) return null; s.v84Awards = s.v84Awards || {}; return s.v84Awards; }
  function ceremonyDates(year, endedAt) {
    const reveal = Math.max(new Date(year, 11, 20, 12).getTime(), endedAt + DAY);
    const ceremony = Math.max(new Date(year + 1, 0, 6, 19).getTime(), reveal + 17 * DAY);
    return { reveal, ceremony };
  }
  // Вызывается один раз в момент окончания сезона (после архивации последнего турнира).
  function onSeasonEnd(data) {
    const st = ST(), A = state(); if (!st || !A) return false;
    const season = Math.max(1, Number(data?.season) || Number(st.currentSeason) - 1 || 1);
    const year = Number(data?.year) || yearOf(season);
    if (A[year]) return false;
    try { W.HS?.invalidate?.(); } catch (e) {}
    let computed = null;
    try { computed = W.V36Fixes?.computeYearAwards?.(year) || null; } catch (e) { console.warn('[v84 awards] compute', e); }
    const team = teamOfYear(season), rise = risingTeam(), flop = disappointment(season);
    const coach = coachOfYear(season, team, rise);
    if (computed && coach) {
      computed.awardRows = (computed.awardRows || []).filter(r => r.type !== 'coach').concat([{ nick: coach.name, type: 'coach', y: year, s: season, team: coach.team, coach: true }]);
      computed.announcements = (computed.announcements || []).filter(x => x.label !== 'Тренер года').concat([{ label: 'Тренер года', nick: coach.name, team: coach.team }]);
    }
    const { reveal, ceremony } = ceremonyDates(year, now());
    A[year] = { season, year, team, rise, flop, computed, revealAt: reveal, ceremonyAt: ceremony, next: Math.min(20, computed?.top?.length || 0), lastDay: 0, done: false };
    // Зал славы: одна и та же «Команда года» везде.
    const hof = (st.hallOfFame || []).find(h => Number(h.season) === season);
    if (hof && team) {
      hof.champion = team.team; hof.scorePts = team.score; hof.v84 = true;
      if (rise) hof.risingStar = `${rise.team} (▲${rise.climb})`;
      hof.awards = Object.assign({}, hof.awards || {}, { rosterOfYear: team.team, breakthrough: rise?.team || hof.awards?.breakthrough || '—', disappointment: flop || hof.awards?.disappointment || '—', mvp: 'объявят на церемонии' });
    }
    save();
    return true;
  }
  function news(item) { try { return W.V29News?.add?.(item) || null; } catch (e) { return null; } }
  const T = n => (W.V29News?.T ? W.V29News.T(n) : { t: 'team', v: n });
  const P = n => (W.V29News?.P ? W.V29News.P(n) : { t: 'player', v: n });
  function statLine(nick, year) {
    try { const o = W.HS.stats().P[nick], L = o ? W.HS.line(o.byYear?.[year] || o.all) : null; return L ? `Rating 3.0 ${L.rating.toFixed(2)} на ${L.maps} картах, ADR ${L.adr.toFixed(1)}, KAST ${L.kast.toFixed(1)}%` : ''; } catch (e) { return ''; }
  }
  function commit(rec) {
    if (rec.committed) return;
    try { if (rec.computed) W.V36Fixes?.commitYearAwards?.(rec.year, rec.computed, true); } catch (e) { console.warn('[v84 awards] commit players', e); }
    if (rec.team?.team) {
      try {
        W.RewardSystem?.addTeamAward?.({ type: 'team-year', team: rec.team.team, season: rec.season, year: rec.year, score: rec.team.score, scorePts: rec.team.score, events: rec.team.events, createdAt: now() });
      } catch (e) { console.warn('[v84 awards] commit team', e); }
    }
    rec.committed = true;
  }
  function tick() {
    const A = state(); if (!A) return;
    const t = now(), day = Math.floor(t / DAY);
    Object.values(A).forEach(rec => {
      if (!rec || rec.done || t < rec.revealAt || rec.lastDay === day) return;
      rec.lastDay = day;
      const top = rec.computed?.top || [];
      if (t >= rec.ceremonyAt && rec.next > 3) {
        // Долгая перемотка проскочила обратный отсчёт: публикуем места №20–№4 одной статьёй.
        const rest = top.filter(z => z.r > 3 && z.r <= rec.next).sort((a, b) => b.r - a.r);
        if (rest.length) news({ cat: 'award', icon: '🏅', imp: 7, title: `Топ-20 игроков ${rec.year}: места №${rest[0].r}–№${rest[rest.length - 1].r}`,
          lead: 'Рейтинг лучших игроков календарного года — без тройки призёров, их назовут на церемонии.',
          body: rest.map(z => `№${z.r} — ${z.nick} (${z.team || '—'})`), tags: rest.slice(0, 8).map(z => P(z.nick)) });
        rec.next = 3;
      }
      if (t >= rec.ceremonyAt) { ceremony(rec); return; }
      if (rec.next <= 3) return; // ждём дня церемонии
      const x = top.find(z => z.r === rec.next); rec.next--;
      if (x) news({ cat: 'award', icon: '🏅', imp: x.r <= 5 ? 8 : 5, player: x.nick, team: x.team,
        title: `Топ-20 игроков ${rec.year}: №${x.r} — ${x.nick}`,
        lead: `${x.nick} (${x.team || '—'}) занимает ${x.r}-е место в рейтинге лучших игроков года.`,
        body: [statLine(x.nick, rec.year), x.mvpCount ? `MVP турниров за год: ${x.mvpCount}.` : '', x.r > 4 ? `Завтра — №${x.r - 1}.` : 'Тройку лучших и все награды года объявят на церемонии.'].filter(Boolean),
        tags: [P(x.nick)].concat(x.team ? [T(x.team)] : []) });
      save();
    });
  }
  function ceremony(rec) {
    commit(rec);
    const top = rec.computed?.top || [], an = rec.computed?.announcements || [];
    const top3 = [3, 2, 1].map(r => top.find(z => z.r === r)).filter(Boolean), first = top.find(z => z.r === 1);
    const hof = (ST()?.hallOfFame || []).find(h => Number(h.season) === rec.season);
    if (hof?.awards) hof.awards.mvp = first?.nick || '—';
    news({ cat: 'award', icon: '🏆', imp: 10, player: first?.nick || '', team: rec.team?.team || first?.team || '',
      title: `HLTV Awards ${rec.year}: ${first ? first.nick + ' — лучший игрок года' : 'итоги года'}`,
      lead: `Объявлены тройка лучших игроков ${rec.year} года, все личные награды и «Команда года».`,
      body: top3.map(x => `№${x.r} — ${x.nick} (${x.team || '—'})${statLine(x.nick, rec.year) ? ' · ' + statLine(x.nick, rec.year) : ''}.`)
        .concat(rec.team?.team ? [`Команда года — ${rec.team.team} (турниров в зачёте: ${rec.team.events}).`] : [])
        .concat(rec.rise?.team ? [`Прорыв года — ${rec.rise.team} (▲${rec.rise.climb} в рейтинге).`] : [])
        .concat(an.map(x => `${x.label}: ${x.nick}${x.team ? ' (' + x.team + ')' : ''}.`)),
      tags: top3.map(x => P(x.nick)).concat(rec.team?.team ? [T(rec.team.team)] : []) });
    rec.done = true; rec.next = 0;
    try { W.hltvSiteReset?.(); } catch (e) {}
    save();
  }
  function pending() { const A = state() || {}; return Object.values(A).filter(r => r && !r.done); }

  // Линия времени: награды года Y возможны только после церемонии Y. Записи за ещё не
  // завершённый (или «будущий») год — остатки старых сохранений, где сезон уходил в следующий
  // календарный год, — удаляются при загрузке.
  function repairTimeline() {
    const st = ST(); if (!st || typeof W.twAwardsExport !== 'function' || typeof W.twAwardsImport !== 'function') return 0;
    const curYear = yearOf(st.currentSeason), A = state() || {};
    const bad = y => { y = Number(y); return y >= curYear && !(A[y] && A[y].committed); };
    const db = W.twAwardsExport(); if (!db || !db.p) return 0;
    let removed = 0;
    Object.values(db.p).forEach(rec => {
      if (!rec) return;
      ['aw', 'top'].forEach(k => { if (!Array.isArray(rec[k])) return; const before = rec[k].length; rec[k] = rec[k].filter(x => !bad(x?.y ?? x?.year)); removed += before - rec[k].length; });
    });
    if (Array.isArray(db.teamAwards)) { const b = db.teamAwards.length; db.teamAwards = db.teamAwards.filter(a => !(['team-year', 'team-season'].includes(a?.type) && bad(a.year))); removed += b - db.teamAwards.length; }
    if (Array.isArray(db.calendarYears)) { const b = db.calendarYears.length; db.calendarYears = db.calendarYears.filter(y => !bad(y)); removed += b - db.calendarYears.length; }
    if (db.yearRankingVersions) Object.keys(db.yearRankingVersions).forEach(y => { if (bad(y)) delete db.yearRankingVersions[y]; });
    if (removed) { W.twAwardsImport(db); console.info(`[v84 awards] удалены награды незавершённого года: ${removed}`); try { W.hltvSiteReset?.(); } catch (e) {} }
    return removed;
  }
  setTimeout(() => { try { repairTimeline(); } catch (e) { console.warn('[v84 awards] timeline', e); } }, 2500);
  W.CS2Awards = Object.freeze({ repairTimeline, coachOfYear, teamOfYear, risingTeam, disappointment, seasonScores, onSeasonEnd, tick, pending, ceremonyDates });
  try { (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if (!W.v57BatchCalendarSkip) tick(); }, 2000); } catch (e) {}
})();
