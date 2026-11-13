/* v57 — сохранение карьерной статистики игроков при переходе в FA/другой клуб. */
(() => {
  'use strict';
  const H = window.HS;
  if (!H || typeof H.stats !== 'function') return;

  const getTeams = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const getState = () => {
    try {
      if (typeof transferState === 'undefined' || !transferState || typeof transferState !== 'object') return null;
      if (!transferState.v57PlayerCareer || typeof transferState.v57PlayerCareer !== 'object') transferState.v57PlayerCareer = {};
      return transferState;
    } catch (e) { return null; }
  };
  let lastRoster = new Map();
  let lastStats = new Map();
  let initialized = false;
  let insideSync = false;
  let lastRosterSignature = '';


  function persistSnapshot(nick, source) {
    if (!nick || !source || !Array.isArray(source.matches) || !source.matches.length) return false;
    const state = getState();
    if (!state) return false;
    const previous = state.v57PlayerCareer[nick];
    const sourceCount = Number(source.__v57MatchCount) || source.matches.length;
    const oldCount = Number(previous?.__v57MatchCount) || (Array.isArray(previous?.matches) ? previous.matches.length : 0);
    if (oldCount > sourceCount) return false;
    try {
      // Trim the potentially huge match list BEFORE cloning; cloning thousands of
      // legacy match rows and slicing afterwards caused multi-second main-thread stalls.
      const slim = { ...source, matches: source.matches.slice(0, 24) }; // v84: 24 последних матча (было 48) — журнал карьеры не раздувает сохранение
      if (slim.byEv && typeof slim.byEv === 'object') {
        slim.byEv = Object.fromEntries(Object.entries(slim.byEv).sort((a,b)=>(Number(b[1]?.ts)||0)-(Number(a[1]?.ts)||0)).slice(0, 16));
      }
      const snapshot = JSON.parse(JSON.stringify(slim));
      // Keep full career aggregates, but bound detailed match/event rows so the
      // transfer-state localStorage record cannot grow without limit over seasons.
      snapshot.__v57MatchCount = sourceCount;
      snapshot.__v57UpdatedAt = Date.now();
      state.v57PlayerCareer[nick] = snapshot;
      return true;
    } catch (e) {
      console.warn('[v57 career] не удалось сохранить статистику', nick, e);
      return false;
    }
  }

  function syncBaseline(force = false) {
    if (insideSync) return false;
    insideSync = true;
    let persisted = false;
    try {
      const currentRoster = new Map();
      getTeams().forEach(t => (t?.players || []).forEach(p => {
        if (p?.nick) currentRoster.set(String(p.nick), String(t.name || ''));
      }));
      const signature = Array.from(currentRoster, ([nick, team]) => `${nick}\u0000${team}`).sort().join('\u0001');
      const rosterChanged = !initialized || signature !== lastRosterSignature;
      // Polls are only a safety net. When neither the roster nor the imported
      // archive changed, do not invoke HS.stats() (it walks the full archive).
      if (initialized && !force && !rosterChanged) return false;

      // Сначала переносим статистику из предыдущего снимка состава — до пересчёта HS.stats()
      // по уже изменившимся ростерам. Это ловит и уход в FA, и прямой переход в другой клуб.
      if (initialized) {
        for (const [nick, previousTeam] of lastRoster) {
          const nextTeam = currentRoster.get(nick);
          if (!nextTeam || nextTeam !== previousTeam) {
            if (persistSnapshot(nick, lastStats.get(nick))) persisted = true;
          }
        }
      }
      if (persisted) {
        try { if (typeof saveTransferState === 'function') saveTransferState(); } catch (e) {}
      }

      const currentStats = H.stats();
      Object.entries(currentStats?.P || {}).forEach(([nick, row]) => {
        if (row && Array.isArray(row.matches) && row.matches.length) lastStats.set(nick, row);
      });
      lastRoster = currentRoster;
      lastRosterSignature = signature;
      initialized = true;
    } catch (e) {
      console.warn('[v57 career] snapshot error', e);
    } finally {
      insideSync = false;
    }
    return persisted;
  }

  // Первичный снимок нужен, чтобы даже старое сохранение без roster snapshots
  // не теряло уже видимую статистику после первого последующего трансфера.
  syncBaseline();

  const wrap = (name, before, after, forceAfter = false) => {
    const original = window[name];
    if (typeof original !== 'function' || original.__v57CareerWrapped) return;
    const wrapped = function (...args) {
      try { if (before) syncBaseline(); } catch (e) {}
      const result = original.apply(this, args);
      try { if (after) syncBaseline(!!forceAfter); } catch (e) {}
      return result;
    };
    wrapped.__v57CareerWrapped = true;
    Object.keys(original).forEach(k => { try { wrapped[k] = original[k]; } catch (e) {} });
    window[name] = wrapped;
    try { if (name === 'saveTeams') saveTeams = wrapped; } catch (e) {}
    try { if (name === 'processTransferMarket') processTransferMarket = wrapped; } catch (e) {}
    try { if (name === 'applyPlayerTransfer') applyPlayerTransfer = wrapped; } catch (e) {}
  };

  // События рынка + обычные сохранения — основные точки, где ростер меняется атомарно.
  wrap('applyPlayerTransfer', true, true);
  wrap('processTransferMarket', true, true);
  wrap('saveTeams', true, false);
  wrap('saveTournamentToArchive', false, true, true);
  wrap('hubArchiveImport', false, true, true);

  // Перехватываем также прямые изменения ростеров из UI/карьерных сделок.
  // The previous 1.2s poll called HS.stats() over the whole historical archive.
  // The 15s fallback now only builds a roster fingerprint; the expensive stats
  // refresh is event-driven (archive import/finalisation and roster changes).
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(!window.v57BatchCalendarSkip && !document.hidden) syncBaseline(false); }, 15000);
  window.v57CaptureCareerStats = (force = true) => syncBaseline(!!force);
})();
