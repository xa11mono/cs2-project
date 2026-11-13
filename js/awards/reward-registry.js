/* v62 — единый реестр достижений и наград.
   Источник истины для турниров: AW.teamTitles + архив/история как источники миграции.
   Источник истины для командных наград: AW.teamAwards (старый v37Legacy.teamAwards мигрируется).
   Экраны читают готовые модели из RewardSystem и не склеивают источники самостоятельно. */
(() => {
  'use strict';
  const W = window;
  const db = () => { try { return W.twAwardsExport?.() || {}; } catch (e) { return {}; } };
  const state = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const normalize = (kind, name, tier, meta) => W.twNormalizeTitleKind
    ? W.twNormalizeTitleKind(kind, name, tier, meta)
    : (kind || (String(tier) === '2' ? 'tier2' : String(tier) === '3' ? 'tier3' : 'regular'));
  const markerKind = kind => ['tier2', 'tier3', 'qual'].includes(String(kind || '').toLowerCase());
  const identity = row => `${String(row?.team || '')}|${String(row?.name || row?.n || '')}|${Math.max(1, Number(row?.season ?? row?.s) || 1)}`;

  const rawAddTeamAward = W.twAddTeamAward;
  const rawAwardsImport = W.twAwardsImport;
  let importing = false;

  function normalizeTeamAwards(list) {
    const byIdentity = new Map();
    (Array.isArray(list) ? list : []).forEach(a => {
      if (!a || !a.team || !a.type) return;
      const year = Number(a.year) || (2026 + (Math.max(1, Number(a.season) || 1) - 1));
      const season = Math.max(1, Number(a.season) || year - 2025);
      const id = String(a.id || `${a.type}|${a.team}|${year}`);
      const row = { ...a, id, year, season, scorePts: a.scorePts ?? a.score ?? null };
      const key = `${a.type}|${a.team}|${year}`;
      const prior = byIdentity.get(key);
      const detail = x => (x.scorePts != null ? 1 : 0) + (x.events != null ? 1 : 0) + (x.title ? 1 : 0) + (x.createdAt ? 1 : 0);
      if (!prior || detail(row) > detail(prior) || (detail(row) === detail(prior) && Number(row.createdAt || 0) > Number(prior.createdAt || 0))) byIdentity.set(key, row);
    });
    return [...byIdentity.values()].sort((a, b) => b.year - a.year || b.season - a.season || Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }
  // v84: одна командная награда — «Команда года». Записи «Команда сезона» из старых сохранений
  // показываются как «Команда года», только если за этот год её ещё нет.
  function unifyTeamYear(list) {
    const hasYear = new Set(list.filter(a => a.type === 'team-year').map(a => Number(a.year)));
    const out = [];
    list.forEach(a => {
      if (a.type !== 'team-season') { out.push(a); return; }
      if (hasYear.has(Number(a.year))) return;
      hasYear.add(Number(a.year)); out.push({ ...a, type: 'team-year', legacyType: 'team-season' });
    });
    return out;
  }
  const canonicalAwards = () => unifyTeamYear(normalizeTeamAwards(db().teamAwards));

  function notifyChanged(reason) {
    try { W.dispatchEvent(new CustomEvent('cs2:rewards-changed', { detail: { reason, version: 1 } })); } catch (e) {}
  }
  function addTeamAward(input) {
    if (!input || !input.team || !input.type || typeof rawAddTeamAward !== 'function') return false;
    const year = Number(input.year) || (2026 + (Math.max(1, Number(input.season) || 1) - 1));
    const row = { ...input, year, season: Math.max(1, Number(input.season) || year - 2025),
      id: String(input.id || `${input.type}|${input.team}|${year}`) };
    if (canonicalAwards().some(x => x.type === row.type && x.team === row.team && Number(x.year) === year)) return false;
    const result = rawAddTeamAward(row);
    if (result) notifyChanged('team-award-added');
    return result;
  }
  function importAwards(value) {
    if (!value || !value.p || typeof rawAwardsImport !== 'function' || importing) return false;
    importing = true;
    try {
      const clean = { ...value, teamAwards: normalizeTeamAwards(value.teamAwards) };
      rawAwardsImport(clean);
      notifyChanged('awards-imported');
      return true;
    } finally { importing = false; }
  }
  function normalizeStoredTeamAwards() {
    if (typeof rawAwardsImport !== 'function') return false;
    const current = db();
    const normalized = normalizeTeamAwards(current.teamAwards);
    if (JSON.stringify(Array.isArray(current.teamAwards) ? current.teamAwards : []) === JSON.stringify(normalized)) return false;
    try { rawAwardsImport({ ...current, teamAwards: normalized }); return true; } catch (e) { return false; }
  }

  function uniqueRows(rows, keyOf, prefer = (a, b) => a) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      if (!row || typeof row !== 'object') return;
      const key = keyOf(row);
      if (!key) return;
      const prior = map.get(key);
      map.set(key, prior ? prefer(row, prior) : row);
    });
    return [...map.values()];
  }

  function isShowSnapEarly(snap) { return !!snap && (snap.showMatch === true || snap.show === true || /^SM-/.test(String(snap.id || '')) || ['show', 'nations'].includes(String(snap.prestige || snap.kind || snap.tier || '').toLowerCase())); }
  function normalizeStoredAchievementLedgers() {
    if (typeof rawAwardsImport !== 'function') return false;
    const current = db(), next = { ...current, p: { ...(current.p || {}) } };
    const archiveNow = W.hubArchiveExport?.() || {};
    const showId = x => { if (x && (x.k === 'nations' || x.nations)) return false; /* v84: Кубок наций — особая награда игроков, не шоу */ const id = String(x?.a || x?.id || ''); return /^SM-/.test(id) || (id && isShowSnapEarly(archiveNow[id])) || /^Шоу-матч\b/i.test(String(x?.n || x?.name || '')); };
    const showCount = (current.teamTitles || []).filter(showId).length + Object.values(current.p || {}).reduce((n, r) => n + (r?.ti || []).filter(showId).length + (r?.mvp || []).filter(showId).length, 0);
    if (showCount) {
      current.teamTitles = (current.teamTitles || []).filter(x => !showId(x));
      Object.values(current.p || {}).forEach(r => { if (!r) return; if (Array.isArray(r.ti)) r.ti = r.ti.filter(x => !showId(x)); if (Array.isArray(r.mvp)) r.mvp = r.mvp.filter(x => !showId(x)); });
    }
    const titleRows = uniqueRows(current.teamTitles, x => `${x.team || ''}|${x.n || x.name || ''}|${Number(x.s ?? x.season) || 1}`,
      (a, b) => ((a.a || a.archiveId) ? a : b));
    let changed = !!showCount || JSON.stringify(titleRows) !== JSON.stringify(Array.isArray(current.teamTitles) ? current.teamTitles : []);
    next.teamTitles = titleRows;
    Object.entries(next.p).forEach(([nick, old]) => {
      const rec = clonePlayerAwardRecord(old);
      const before = JSON.stringify({ mvp: rec.mvp, ti: rec.ti, top: rec.top, aw: rec.aw });
      rec.mvp = uniqueRows(rec.mvp, x => String(x.id || `${x.n || x.name || ''}|${x.s || x.season || 1}|${x.team || ''}`));
      rec.ti = uniqueRows(rec.ti, x => `${x.team || ''}|${x.n || x.name || ''}|${Number(x.s ?? x.season) || 1}`,
        (a, b) => (a.a || a.id ? a : b));
      rec.top = uniqueRows(rec.top, x => String(Number(x.y ?? x.year) || ''),
        (a, b) => Number(a.r || 99) <= Number(b.r || 99) ? a : b);
      rec.aw = uniqueRows(rec.aw, x => `${x.type || ''}|${Number(x.y ?? x.year) || ''}`);
      const after = JSON.stringify({ mvp: rec.mvp, ti: rec.ti, top: rec.top, aw: rec.aw });
      if (before !== after) changed = true;
      next.p[nick] = rec;
    });
    const years = [...new Set((Array.isArray(current.calendarYears) ? current.calendarYears : []).map(Number).filter(Boolean))].sort((a, b) => a - b);
    if (JSON.stringify(years) !== JSON.stringify(Array.isArray(current.calendarYears) ? current.calendarYears : [])) changed = true;
    next.calendarYears = years;
    const versions = current.yearRankingVersions && typeof current.yearRankingVersions === 'object' ? { ...current.yearRankingVersions } : {};
    if (JSON.stringify(versions) !== JSON.stringify(current.yearRankingVersions || {})) changed = true;
    next.yearRankingVersions = versions;
    if (!changed) return false;
    try { rawAwardsImport(next); return true; } catch (e) { return false; }
  }

  // Все записи достижений проходят через одну транзакцию. Генераторы по-прежнему
  // решают, КОМУ и ЗА ЧТО выдать награду, но не управляют хранилищем напрямую.
  function writeAwards(mutator, reason) {
    if (typeof rawAwardsImport !== 'function') return false;
    const current = db();
    const next = {
      ...current,
      p: { ...(current.p || {}) },
      teamAwards: Array.isArray(current.teamAwards) ? current.teamAwards.slice() : [],
      teamTitles: Array.isArray(current.teamTitles) ? current.teamTitles.slice() : [],
      seasons: Array.isArray(current.seasons) ? current.seasons.slice() : [],
      calendarYears: Array.isArray(current.calendarYears) ? current.calendarYears.slice() : [],
      yearRankingVersions: { ...(current.yearRankingVersions || {}) }
    };
    const changed = mutator(next);
    if (!changed) return false;
    rawAwardsImport(next);
    notifyChanged(reason || 'awards-updated');
    return true;
  }

  function playerRecord(target, nick) {
    const old = target.p[nick] || {};
    const rec = clonePlayerAwardRecord(old);
    target.p[nick] = rec;
    return rec;
  }

  function addTeamEventAchievement(event) {
    const team = String(event?.champion || event?.team || '').trim();
    const name = String(event?.name || event?.n || '').trim();
    if (!team || !name || team === '—') return false;
    const season = Math.max(1, Number(event.season ?? event.s) || 1);
    const archiveId = String(event.archiveId || event.a || event.id || '');
    const kind = normalize(event.kind || event.k || event.prestige, name, event.tier, event);
    const id = archiveId || `legacy|${team}|${name}|${season}`;
    return writeAwards(next => {
      const row = next.teamTitles.find(x => String(x.id || '') === id)
        || next.teamTitles.find(x => x.team === team && (x.n || x.name) === name && Number(x.s ?? x.season) === season);
      if (row) {
        let changed = false;
        if (row.k !== kind) { row.k = kind; changed = true; }
        if (archiveId && row.a !== archiveId) { row.a = archiveId; changed = true; }
        if (archiveId && row.id !== archiveId) { row.id = archiveId; changed = true; }
        if (!row.y) { row.y = Number(event.year ?? event.y) || (2026 + season - 1); changed = true; }
        return changed;
      }
      next.teamTitles.unshift({ id, n: name, s: season, y: Number(event.year ?? event.y) || (2026 + season - 1),
        k: kind, team, a: archiveId || null, ts: Number(event.ts) || Date.now() });
      return true;
    }, 'team-event-recorded');
  }

  function addPlayerEventAchievement(nick, row) {
    if (!nick || !row) return false;
    const name = String(row.n || row.name || '').trim();
    const team = String(row.team || '').trim();
    const season = Math.max(1, Number(row.s ?? row.season) || 1);
    const id = String(row.id || row.a || `${team}|${name}|${season}`);
    if (!name) return false;
    return writeAwards(next => {
      const rec = playerRecord(next, nick);
      if (rec.ti.some(x => String(x.id || x.a || `${x.team || ''}|${x.n || x.name || ''}|${x.s || x.season || 1}`) === id
        || ((x.n || x.name) === name && (x.team || '') === team && Number(x.s || x.season || 1) === season))) return false;
      rec.ti.unshift({ ...row, id, n: name, s: season, team });
      return true;
    }, 'player-event-recorded');
  }

  function addPlayerMvp(nick, row) {
    if (!nick || !row) return false;
    const id = String(row.id || `${row.n || row.name || 'event'}|${row.s || row.season || 1}`);
    return writeAwards(next => {
      // Один MVP на одно событие во всём реестре, а не по одному на каждый профиль.
      if (Object.values(next.p).some(rec => (rec.mvp || []).some(x => String(x.id || '') === id))) return false;
      playerRecord(next, nick).mvp.unshift({ ...row, id });
      return true;
    }, 'player-mvp-awarded');
  }

  // v84: EVP (Excellent Value Player) — по нескольку на турнир; одна запись на игрока и событие.
  function addPlayerEvp(nick, row) {
    if (!nick || !row) return false;
    const id = String(row.id || `${row.n || row.name || 'event'}|${row.s || row.season || 1}`);
    return writeAwards(next => {
      const rec = playerRecord(next, nick);
      rec.evp = Array.isArray(rec.evp) ? rec.evp.slice() : [];
      if (rec.evp.some(x => String(x.id || '') === id)) return false;
      rec.evp.unshift({ ...row, id });
      return true;
    }, 'player-evp-awarded');
  }
  function addPlayerYearAward(nick, row) {
    if (!nick || !row || !row.type) return false;
    const year = Number(row.y ?? row.year);
    if (!year) return false;
    return writeAwards(next => {
      const rec = playerRecord(next, nick);
      const idx = rec.aw.findIndex(x => x.type === row.type && Number(x.y ?? x.year) === year);
      const clean = { ...row, y: year };
      if (idx >= 0) {
        if (JSON.stringify(rec.aw[idx]) === JSON.stringify(clean)) return false;
        rec.aw.splice(idx, 1);
      }
      rec.aw.unshift(clean);
      return true;
    }, 'player-year-award-recorded');
  }

  function addPlayerTop20(nick, row) {
    if (!nick || !row) return false;
    const year = Number(row.y ?? row.year);
    if (!year) return false;
    return writeAwards(next => {
      const rec = playerRecord(next, nick);
      const prior = rec.top.find(x => Number(x.y ?? x.year) === year);
      if (prior && Number(prior.r) === Number(row.r) && (prior.team || '') === (row.team || '')) return false;
      rec.top = rec.top.filter(x => Number(x.y ?? x.year) !== year);
      rec.top.unshift({ ...row, y: year });
      return true;
    }, 'player-top20-recorded');
  }

  function getCalendarYears() {
    return Array.isArray(db().calendarYears) ? db().calendarYears.slice() : [];
  }
  function getYearRankingVersion(year) {
    return Number(db().yearRankingVersions?.[Number(year)]) || 0;
  }

  // Атомарная фиксация Top-20 и годовых персональных наград. Старые годы
  // можно один раз пересобрать новой формулой, не создавая повторных наград.
  function commitPlayerYearAwards(year, topRows, awardRows, options = {}) {
    year = Number(year);
    const rebuild = !!options.rebuild;
    if (!year || (!rebuild && getCalendarYears().includes(year))) return false;
    const season = Math.max(1, year - 2025);
    const replaceTypes = new Set((options.replaceTypes || (Array.isArray(awardRows) ? awardRows.map(x => x?.type) : [])).filter(Boolean));
    return writeAwards(next => {
      if (!rebuild && next.calendarYears.includes(year)) return false;
      if (rebuild) {
        Object.values(next.p).forEach(old => {
          const rec = clonePlayerAwardRecord(old);
          rec.top = rec.top.filter(x => Number(x.y ?? x.year) !== year);
          rec.aw = rec.aw.filter(x => !(Number(x.y ?? x.year) === year && replaceTypes.has(x.type)));
          Object.assign(old, rec);
        });
      }
      (Array.isArray(topRows) ? topRows : []).forEach(row => {
        if (!row?.nick) return;
        const rec = playerRecord(next, row.nick);
        rec.top = rec.top.filter(x => Number(x.y ?? x.year) !== year);
        rec.top.unshift({ r: Number(row.r) || 99, y: year, s: season, team: row.team || '',
          mvpCount: Math.max(0, Number(row.mvpCount) || 0), evpCount: Math.max(0, Number(row.evpCount) || 0), mvpPoints: Math.max(0, Number(row.mvpPoints) || 0),
          ...(Number.isFinite(Number(row.rating)) ? { rating: Number(row.rating) } : {}) });
      });
      (Array.isArray(awardRows) ? awardRows : []).forEach(row => {
        if (!row?.nick || !row.type) return;
        const rec = playerRecord(next, row.nick);
        rec.aw = rec.aw.filter(x => !(x.type === row.type && Number(x.y ?? x.year) === year));
        rec.aw.unshift({ type: row.type, y: year, s: season, team: row.team || '', ...(row.coach ? { coach: true } : {}) });
      });
      if (!next.calendarYears.includes(year)) next.calendarYears.push(year);
      next.calendarYears.sort((a, b) => a - b);
      next.yearRankingVersions = { ...(next.yearRankingVersions || {}), [year]: Number(options.rankingVersion) || 1 };
      return true;
    }, rebuild ? 'player-year-awards-rebuilt' : 'player-year-awards-committed');
  }

  // Одноразовая миграция второго хранилища командных наград.
  function migrateLegacyAwards() {
    const s = state(), legacy = s?.v37Legacy;
    if (!legacy || !Array.isArray(legacy.teamAwards) || !legacy.teamAwards.length) {
      if (legacy && Object.prototype.hasOwnProperty.call(legacy, 'teamAwards')) { delete legacy.teamAwards; try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {} }
      return 0;
    }
    let moved = 0;
    legacy.teamAwards.forEach(a => {
      if (addTeamAward({ ...a, scorePts: a.scorePts ?? a.score, createdAt: a.createdAt || Date.now() })) moved++;
    });
    delete legacy.teamAwards;
    try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {}
    return moved;
  }

  const rawTeamAchievements = W.twTeamAchievements;
  const rawPlayerAchievements = W.twPlayerAchievements;
  function getTeamEventAchievements(teamName, teamObj) {
    if (!teamName || typeof rawTeamAchievements !== 'function') return [];
    return rawTeamAchievements(teamName, teamObj).map(row => {
      const kind = normalize(row.kind || row.prestige, row.name, row.snapshot?.tier, row.snapshot || row.history || row);
      return { ...row, kind, marker: markerKind(kind), cup: !markerKind(kind), team: teamName };
    }).sort((a, b) => b.season - a.season || (b.ts || 0) - (a.ts || 0) || a.name.localeCompare(b.name));
  }

  // v84: результат кэшируется по ревизии архива и реестра — раньше каждый вызов перебирал
  // весь архив для каждой команды (на годовом сохранении главная рисовалась ~10 с).
  let allAchMemo = { key: '', value: null };
  function getAllTeamEventAchievements(options = {}) {
    const includeQualifiers = options.includeQualifiers !== false;
    let memoKey = '';
    try {
      const d = db();
      memoKey = [includeQualifiers ? 1 : 0, typeof W.hubArchiveRevision === 'function' ? W.hubArchiveRevision() : Object.keys(W.hubArchiveExport?.() || {}).length,
        (d.teamTitles || []).length, (typeof teams !== 'undefined' ? teams.length : 0), state()?.currentSeason || 0].join('|');
      if (allAchMemo.key === memoKey && allAchMemo.value) return allAchMemo.value.map(r => ({ ...r }));
    } catch (e) { memoKey = ''; }
    const out = computeAllTeamEventAchievements(includeQualifiers);
    if (memoKey) allAchMemo = { key: memoKey, value: out };
    return out.map(r => ({ ...r }));
  }
  function computeAllTeamEventAchievements(includeQualifiers) {
    const names = new Set((typeof teams !== 'undefined' ? teams : []).map(t => t?.name).filter(Boolean));
    (db().teamTitles || []).forEach(x => { if (x?.team) names.add(x.team); });
    const archive = W.hubArchiveExport?.() || {};
    Object.values(archive).forEach(snap => {
      if (!snap) return;
      if (snap.champion && snap.champion !== '—') names.add(snap.champion);
      if (normalize(snap.prestige || snap.kind, snap.name, snap.tier, snap) === 'qual') {
        (W.twQualifiedTeams?.(snap) || []).forEach(n => names.add(n));
      }
    });
    const out = [];
    names.forEach(name => {
      const teamObj = (typeof teams !== 'undefined' ? teams : []).find(t => t?.name === name);
      getTeamEventAchievements(name, teamObj).forEach(row => {
        if (!includeQualifiers && row.kind === 'qual') return;
        out.push({ ...row, champion: name, prestige: row.kind });
      });
    });
    const unique = new Map();
    out.forEach(row => {
      const key = identity({ team: row.team, name: row.name, season: row.season });
      const prior = unique.get(key);
      if (!prior || (!!row.snapshot && !prior.snapshot)) unique.set(key, row);
    });
    return [...unique.values()].sort((a, b) => b.season - a.season || (b.ts || 0) - (a.ts || 0) || a.name.localeCompare(b.name));
  }

  function getPlayerEventAchievements(nick, teamObj) {
    if (!nick || typeof rawPlayerAchievements !== 'function') return [];
    return rawPlayerAchievements(nick, teamObj).map(row => {
      const kind = normalize(row.kind || row.k, row.name || row.n, row.snapshot?.tier, row.snapshot || row);
      return { ...row, kind, k: kind, marker: markerKind(kind), cup: !markerKind(kind) };
    });
  }
  function clonePlayerAwardRecord(rec) {
    rec = rec && typeof rec === 'object' ? rec : {};
    return { ...rec, mvp: Array.isArray(rec.mvp) ? rec.mvp.slice() : [], aw: Array.isArray(rec.aw) ? rec.aw.slice() : [],
      top: Array.isArray(rec.top) ? rec.top.slice() : [], ti: Array.isArray(rec.ti) ? rec.ti.slice() : [] };
  }
  function getPlayerAwards(nick) { return clonePlayerAwardRecord(db().p?.[nick]); }
  function getAllPlayerAwards() {
    const out = {};
    Object.entries(db().p || {}).forEach(([nick, rec]) => { out[nick] = clonePlayerAwardRecord(rec); });
    return out;
  }
  function getTeamSpecialAwards(teamName) {
    const annual = canonicalAwards().map(row => ({ ...row, category: 'honour' }));
    // HOF remains in seasonState for simulation/history compatibility. It is a
    // legacy source only: this read model folds it into the same annual-awards
    // collection and prefers the richer persisted RewardSystem record.
    const persistedSeasonKeys = new Set(annual.filter(a => a.type === 'team-season')
      .map(a => `${a.team}|${Number(a.year) || (2025 + (Number(a.season) || 1))}`));
    (state()?.hallOfFame || []).forEach(h => {
      if (!h?.champion || h.champion === '—') return;
      // v84: сезоны движка CS2Awards получают награду только после церемонии.
      if (h.v84) return;
      const year = Number(h.year) || (2025 + (Math.max(1, Number(h.season) || 1)));
      const key = `${h.champion}|${year}`;
      if (persistedSeasonKeys.has(key)) return;
      annual.push({ id: `legacy-hof|${h.champion}|${year}`, type: 'team-season', team: h.champion,
        season: Math.max(1, Number(h.season) || year - 2025), year, scorePts: Number(h.scorePts) || 0,
        risingStar: h.risingStar || '', category: 'honour', legacy: true });
      persistedSeasonKeys.add(key);
    });
    let grandSlams = [];
    try { grandSlams = W.V33Awards?.slams?.().list || []; } catch (e) {}
    const special = grandSlams.map(g => ({ id: g.id, type: 'grand-slam', team: g.team, season: g.season,
      year: 2025 + Math.max(1, Number(g.season) || 1), events: Array.isArray(g.events) ? g.events.slice() : [],
      createdAt: Number(g.at) || 0, category: 'honour' }));
    // v84: сезон = календарный год, поэтому есть одна командная награда — «Команда года».
    // Старые записи «Команда сезона» показываются как «Команда года», если за этот год её ещё нет.
    const yearKey = a => Number(a.year) || (2025 + (Math.max(1, Number(a.season) || 1)));
    const hasYear = new Set(annual.filter(a => a.type === 'team-year').map(yearKey));
    for (let i = annual.length - 1; i >= 0; i--) {
      const a = annual[i]; if (a.type !== 'team-season') continue;
      if (hasYear.has(yearKey(a))) annual.splice(i, 1);
      else { annual[i] = { ...a, type: 'team-year', legacyType: 'team-season' }; hasYear.add(yearKey(a)); }
    }
    const unique = new Map();
    annual.concat(special).filter(a => !teamName || a.team === teamName).forEach(a => {
      const key = a.type === 'grand-slam'
        ? String(a.id || `${a.type}|${a.team}|${a.year || a.season}`)
        : `${a.type}|${a.team}|${Number(a.year) || Number(a.season) || 1}`;
      if (!unique.has(key)) unique.set(key, a);
    });
    return [...unique.values()].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || (Number(b.season) || 0) - (Number(a.season) || 0) || (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  }
  const isShowSnap = snap => !!snap && (snap.showMatch === true || snap.show === true || /^SM-/.test(String(snap.id || '')) || ['show', 'nations'].includes(String(snap.prestige || snap.kind || snap.tier || '').toLowerCase()));
  function getArchiveEvents() {
    return Object.values(W.hubArchiveExport?.() || {}).filter(snap => snap && !isShowSnap(snap)).map(snap => ({ ...snap,
      kind: normalize(snap.prestige || snap.kind, snap.name, snap.tier, snap),
      prestige: normalize(snap.prestige || snap.kind, snap.name, snap.tier, snap) }));
  }

  const api = {
    version: 1,
    classifyEvent: normalize,
    isMarkerKind: markerKind,
    isCupKind: kind => !markerKind(kind),
    getTeamAwards: teamName => canonicalAwards().filter(a => !teamName || a.team === teamName),
    getAllTeamAwards: canonicalAwards,
    getTeamSpecialAwards,
    addTeamAward,
    getTeamEventAchievements,
    getAllTeamEventAchievements,
    getPlayerEventAchievements,
    getPlayerAwards,
    getAllPlayerAwards,
    addTeamEventAchievement,
    addPlayerEventAchievement,
    addPlayerMvp,
    addPlayerEvp,
    addPlayerYearAward,
    addPlayerTop20,
    getCalendarYears,
    getYearRankingVersion,
    commitPlayerYearAwards,
    getArchiveEvents,
    migrateLegacyAwards
  };
  W.RewardSystem = Object.freeze(api);
  // Every legacy write/import enters the same validation and deduplication path.
  if (typeof rawAddTeamAward === 'function') W.twAddTeamAward = addTeamAward;
  if (typeof rawAwardsImport === 'function') W.twAwardsImport = importAwards;
  // Legacy read API names remain as thin adapters for old modules and older saves.
  W.twTeamAchievements = getTeamEventAchievements;
  W.twPlayerAchievements = getPlayerEventAchievements;
  normalizeStoredTeamAwards();
  normalizeStoredAchievementLedgers();
  migrateLegacyAwards();
  try { W.dispatchEvent(new CustomEvent('cs2:rewards-ready', { detail: { version: 1 } })); } catch (e) {}
  console.info('[v62] единый реестр наград активен');
})();
