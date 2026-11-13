/* v71 — year-end player ranking includes earned event MVPs. */
(function () {
  'use strict';
  const W = window;
  const VERSION = 2;
  function migrateCompletedYears() {
    const rewards = W.RewardSystem;
    const annual = W.V36Fixes;
    if (!rewards || !annual?.generateYearAwards || !rewards.getCalendarYears) return { checked: 0, updated: 0 };
    let checked = 0, updated = 0;
    const years = rewards.getCalendarYears().map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    years.forEach(year => {
      checked++;
      if ((rewards.getYearRankingVersion?.(year) || 0) >= VERSION) return;
      try {
        const result = annual.generateYearAwards(year);
        if (result && (rewards.getYearRankingVersion?.(year) || 0) >= VERSION) updated++;
      } catch (error) { console.warn('[v71] annual ranking migration failed', year, error); }
    });
    return { checked, updated };
  }
  W.V71YearlyMvpRanking = Object.freeze({ version: VERSION, migrateCompletedYears });
  const result = migrateCompletedYears();
  if (result.updated) {
    try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {}
    console.info(`[v71] пересчитан годовой Top-20 с учётом MVP: ${result.updated}`);
  } else {
    console.info('[v71] годовой рейтинг MVP проверен', result);
  }
})();
