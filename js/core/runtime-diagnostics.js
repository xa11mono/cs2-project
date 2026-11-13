/* v74 — legacy-save responsiveness and runtime diagnostics. */
(() => {
  'use strict';
  const state = { longTasks: 0, totalLongTaskMs: 0, maxLongTaskMs: 0, lastLongTaskMs: 0, recent: [], observer: null };
  const push = entry => {
    const d = Math.max(0, Number(entry?.duration) || 0);
    state.longTasks++;
    state.totalLongTaskMs += d;
    state.maxLongTaskMs = Math.max(state.maxLongTaskMs, d);
    state.lastLongTaskMs = Date.now();
    const attribution = Array.isArray(entry?.attribution) ? entry.attribution.slice(0, 4).map(a => ({ name: a?.name || '', containerType: a?.containerType || '', containerSrc: a?.containerSrc || '' })) : [];
    state.recent.push({ durationMs: Math.round(d), at: state.lastLongTaskMs, attribution });
    if (state.recent.length > 20) state.recent.shift();
  };
  try {
    if (typeof PerformanceObserver === 'function' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      state.observer = new PerformanceObserver(list => list.getEntries().forEach(push));
      state.observer.observe({ type: 'longtask', buffered: true });
    }
  } catch (e) { state.observer = null; }
  window.CS2RuntimePerformance = {
    snapshot() {
      const c = typeof seasonState !== 'undefined' ? seasonState.calendar || {} : {};
      const perf = window.CS2SimulationPerf?.lastBatch || null;
      return {
        calendarSpeed: Number(c.speed) || 1,
        longTasks: state.longTasks,
        totalLongTaskMs: Math.round(state.totalLongTaskMs),
        maxLongTaskMs: Math.round(state.maxLongTaskMs),
        lastLongTaskAt: state.lastLongTaskMs ? new Date(state.lastLongTaskMs).toISOString() : null,
        recent: state.recent.slice(),
        lastBatch: perf,
        teams: typeof teams !== 'undefined' && Array.isArray(teams) ? teams.length : null,
        archivedEvents: typeof window.hubArchiveCount === 'function' ? window.hubArchiveCount() : null,
        archiveRevision: typeof window.hubArchiveRevision === 'function' ? window.hubArchiveRevision() : null
      };
    },
    reset() { state.longTasks = 0; state.totalLongTaskMs = 0; state.maxLongTaskMs = 0; state.lastLongTaskMs = 0; state.recent = []; return true; }
  };
  console.info('[v74] responsive legacy-save rendering enabled; diagnostics: CS2RuntimePerformance.snapshot()');
})();
