/* v45 — Competition Integrity: stable VRS, pre-tournament fields, Major calendar & awards */
(() => {
  'use strict';
  const save = () => { try { if (typeof saveTeams === 'function') saveTeams(); if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {} };
  function prepareUpcoming() {
    try {
      const S = typeof seasonState !== 'undefined' ? seasonState : null;
      if (!S) return false;
      const now = Number(S.calendar?.currentMs) || Date.now();
      // v35 creates frozen invite lists/qualifier schedules from the game clock.
      if (typeof window.v45EnsureQuals === 'function') window.v45EnsureQuals(now);
      return true;
    } catch (e) { console.warn('[v45] prepare', e); return false; }
  }
  function refreshVRS() {
    try { if (window.CS2VRSModel?.recalcAll && Array.isArray(teams)) { window.CS2VRSModel.recalcAll(teams); if (typeof sortTeams === 'function') sortTeams(); save(); } }
    catch (e) { console.warn('[v45] VRS migration', e); }
  }
  window.v45CompetitionIntegrity = { prepareUpcoming, refreshVRS, version: 45 };
  prepareUpcoming();
  refreshVRS();
  console.info('[v45] Competition Integrity loaded');
})();
