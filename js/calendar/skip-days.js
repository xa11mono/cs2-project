/* v33 — пропуск нескольких игровых дней из шапки: «День ▾» → к ближайшему матчу Tier-1, 3 / 5 / 7 / 14 / 30 дней или своё число.
   Дни пропускаются по одному той же функцией, что и кнопка «День» (турниры, рынок и новости обрабатываются
   как обычно); идёт индикатор, повторный клик останавливает пропуск. */
(function () {
'use strict';
let run = null;
const $ = id => document.getElementById(id);
function label(t) { const l = $('pt-skip-l'); if (l) l.textContent = t; }
function yieldToBrowser() {
  if (window.CS2Yield) return window.CS2Yield.frame();   // v144: общий планировщик уступок (js/core/scheduler.js)
  return new Promise(resolve => {
    try {
      if (document.visibilityState !== 'hidden' && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(() => resolve());
      else setTimeout(resolve, 4);
    } catch (e) { setTimeout(resolve, 4); }
  });
}
function calendarIsPaused(){
  try { return typeof window.v15IsCalendarPaused === 'function' ? window.v15IsCalendarPaused() : !!(typeof seasonState !== 'undefined' && seasonState.calendar?.paused); }
  catch(e) { return false; }
}
async function skipDays(n) {
  if (run) { run.stop = true; return; }
  if (calendarIsPaused()) { label('Сначала снимите паузу'); return; }
  if (typeof window.skipGameCalendarDay !== 'function') return;
  run = { stop: false }; const me = run;
  const startedAt = (window.performance?.now ? window.performance.now() : Date.now());
  let dayMsTotal = 0, peakDayMs = 0, yields = 0, completedDays = 0;
  let batchParallelChanged = false, parallelNewsDirty = false, matchNewsDirty = false;
  const nowPerf = () => window.performance?.now ? window.performance.now() : Date.now();
  const previousBatch = !!window.v57BatchCalendarSkip;
  const previousCpuBudget = window.__CS2_BATCH_CPU_BUDGET_MS;
  const previousIdleMs = window.__CS2_FAST_FORWARD_IDLE_MS;
  // 90-day runs use a deliberately low CPU duty cycle; responsiveness matters more than raw throughput.
  // v84: work is sliced by a 10 ms budget; the old artificial idle gaps only stretched wall time.
  window.__CS2_BATCH_CPU_BUDGET_MS = 10;
  window.__CS2_FAST_FORWARD_IDLE_MS = 0;
  window.__CS2_BATCH_CPU_RESET = true;
  window.__CS2_BATCH_TRAINING_MAP_STATS = null;
  window.CS2SimulationPerf = window.CS2SimulationPerf || {};
  window.CS2SimulationPerf.batchSlice = { cpuBudgetMs: window.__CS2_BATCH_CPU_BUDGET_MS, idleMs: window.__CS2_FAST_FORWARD_IDLE_MS, yields: 0, worstStage: '', worstMs: 0 };
  const batchBroadcastWasRunning = !!(typeof currentTournament !== 'undefined' && currentTournament?.broadcast?.running);
  const deferred = [];
  window.v57CalendarRenderDirty = false;
  window.v57CalendarStateDirty = false;
  window.v57LastBatchDayMatches = 0;
  window.CS2SimulationPerf = window.CS2SimulationPerf || {};
  window.CS2SimulationPerf.batchStageTotals = {};
  window.CS2SimulationPerf.finalStageTotals = {};
  window.CS2SimulationPerf.parallelCatchup = { processedMatches: 0, yields: 0, maxSliceMs: 0, passes: 0, remainingOverdue: 0 };
  const patchDeferred = (name, syncName = name) => {
    const original = window[name];
    if (typeof original !== 'function') return;
    const wrapped = function (...args) { wrapped.__v57Dirty = true; return undefined; };
    wrapped.__v57Deferred = true;
    window[name] = wrapped;
    try { if (syncName === 'saveTeams') saveTeams = wrapped; } catch (e) {}
    try { if (syncName === 'saveSeasonState') saveSeasonState = wrapped; } catch (e) {}
    try { if (syncName === 'saveTransferState') saveTransferState = wrapped; } catch (e) {}
    try { if (syncName === 'v15RenderCalendar') v15RenderCalendar = wrapped; } catch (e) {}
    try { if (syncName === 'renderTournament') renderTournament = wrapped; } catch (e) {}
    try { if (syncName === 'renderRating') renderRating = wrapped; } catch (e) {}
    deferred.push(() => {
      window[name] = original;
      try { if (syncName === 'saveTeams') saveTeams = original; } catch (e) {}
      try { if (syncName === 'saveSeasonState') saveSeasonState = original; } catch (e) {}
      try { if (syncName === 'saveTransferState') saveTransferState = original; } catch (e) {}
      try { if (syncName === 'v15RenderCalendar') v15RenderCalendar = original; } catch (e) {}
      try { if (syncName === 'renderTournament') renderTournament = original; } catch (e) {}
      try { if (syncName === 'renderRating') renderRating = original; } catch (e) {}
    });
  };
  const oldHRender = window.HS?.render;
  if (window.HS && typeof oldHRender === 'function') window.HS.render = function () { window.v57HubRenderDirty = true; };
  window.v57BatchCalendarSkip = true;
  // The skip loop owns virtual time until the final transaction commit.
  // Storage writes and expensive page renders are collected and flushed once.
  patchDeferred('saveSeasonState');
  patchDeferred('saveTeams');
  patchDeferred('saveTransferState');
  patchDeferred('v15RenderCalendar');
  patchDeferred('renderTournament');
  patchDeferred('renderRating');
  try {
    for (let i = 1; i <= n && !me.stop; i++) {
      if (calendarIsPaused()) { me.stop = true; break; }
      const dayStarted = nowPerf();
      const oneDay = window.v17AdvanceSingleCalendarDayForBatch || window.skipGameCalendarDay;
      try {
        if ((await oneDay()) === false) { me.stop = true; break; }
        // Use the scheduler's wake-time index: normal days are O(1), while any
        // due qualifier/match is still processed on the exact virtual day.
        let parallelChanged = false;
        if (!calendarIsPaused()) {
          if (window.CS2SimulationKernel?.afterClockJump) parallelChanged = !!window.CS2SimulationKernel.afterClockJump('multi-day calendar skip', { deferIO: true, forceParallel: false, matchBudget: 1 });
          else if (typeof window.v21TickParallel === 'function') parallelChanged = !!window.v21TickParallel(false, { deferIO: true, matchBudget: 1 });
          else if (typeof window.v21ProcessParallelNow === 'function') parallelChanged = !!window.v21ProcessParallelNow({ deferIO: true, matchBudget: 1 });
          // The normal dispatcher is deliberately capped at one parallel series
          // during fast-forward. Drain the remaining overdue matches one at a time,
          // yielding a browser frame after each match so input and paint stay live.
          const pendingParallel = window.CS2ParallelSchedulerDiagnostics?.();
          if (Number(pendingParallel?.overdueMatches) > 0 && typeof window.v21ProcessOverdueCooperative === 'function') {
            const caught = await window.v21ProcessOverdueCooperative({ shouldStop: () => me.stop, maxMatches: 12000 });
            parallelChanged = parallelChanged || !!caught?.changed;
            window.CS2SimulationPerf = window.CS2SimulationPerf || {};
            const row = window.CS2SimulationPerf.parallelCatchup || (window.CS2SimulationPerf.parallelCatchup = { processedMatches: 0, yields: 0, maxSliceMs: 0, passes: 0 });
            row.processedMatches += Number(caught?.result?.processedMatches) || 0;
            row.yields += Number(caught?.result?.yields) || 0;
            row.maxSliceMs = Math.max(row.maxSliceMs, Number(caught?.result?.maxSliceMs) || 0);
            row.remainingOverdue = Number(caught?.result?.remainingOverdue) || 0;
            row.passes++;
          }
        }
        const played = Number(window.v57LastBatchDayMatches) || 0;
        if (parallelChanged) { batchParallelChanged = true; parallelNewsDirty = true; }
        // Match-story analytics and news DOM scans are postponed until the batch
        // ends. They are presentation work and must not run once per simulated day.
        if (played > 0 || parallelChanged) matchNewsDirty = true;
      } catch (e) { console.warn('[v33 skip]', e); break; }
      const took = Math.max(0, nowPerf() - dayStarted);
      dayMsTotal += took; peakDayMs = Math.max(peakDayMs, took); completedDays++;
      try { window.V30RankSnapshotTick?.(); } catch (e) {}   // v88: недельный снимок рейтинга и при перемотке — иначе «Нед.» показывает изменение за весь пропуск
      // Paint once per simulated day. requestAnimationFrame gives Chromium an
      // actual rendering opportunity; setTimeout(0) alone can keep a long chain
      // of batch tasks ahead of paint and make the page appear frozen.
      label(`Пропуск ${i}/${n}…`);
      // v84: Кубок наций не проскакиваем — останавливаемся в день турнира.
      if (window.__v84NationsHalt) { me.nations = window.__v84NationsHalt; window.__v84NationsHalt = null; me.stop = true; break; }
      // v84: не проскакиваем окно Pick'Em — останавливаемся один раз на каждом открывшемся этапе.
      try {
        const open = window.__v84PickemHalt || window.V33Pickem?.openUnfilled?.();
        window.__v84PickemHalt = null;
        const st = typeof seasonState !== 'undefined' ? seasonState : null;
        if (open && st) {
          st.v84PickemPrompted = st.v84PickemPrompted || {};
          if (!st.v84PickemPrompted[open.key]) {
            st.v84PickemPrompted[open.key] = Number(st.calendar?.currentMs) || Date.now();
            me.stop = true; me.pickem = open;
            break;
          }
        }
      } catch (e) {}
      if (await (window.CS2Yield ? window.CS2Yield.maybe(12) : Promise.resolve(false))) yields++;
    }
  } finally {
    // Keep the batch owner active while reconciling. All compatibility timers
    // remain suspended until catch-up, rendering and the final persistence pass finish.
    const finalStage = async (name, fn) => {
      const t0 = nowPerf();
      try { await fn(); } catch (e) { console.warn(`[v33] final ${name} failed`, e); }
      const ms = Math.max(0, nowPerf() - t0);
      const perf = window.CS2SimulationPerf = window.CS2SimulationPerf || {};
      const stages = perf.finalStageTotals = perf.finalStageTotals || {};
      const row = stages[name] || (stages[name] = { calls: 0, totalMs: 0, maxMs: 0 });
      row.calls++; row.totalMs = Math.round((row.totalMs + ms) * 100) / 100; row.maxMs = Math.max(row.maxMs, Math.round(ms * 100) / 100);
      await yieldToBrowser();
    };
    // One final scheduler pass at the exact final virtual timestamp.
    let finalParallelChanged = false;
    try {
      if (!calendarIsPaused()) {
        if (window.CS2SimulationKernel?.afterClockJump) finalParallelChanged = !!window.CS2SimulationKernel.afterClockJump('multi-day calendar skip completed', { deferIO: true, flush: true, matchBudget: 1 });
        else finalParallelChanged = !!window.v21ProcessParallelNow?.({ deferIO: true, matchBudget: 1 });
        const caught = await window.v21ProcessOverdueCooperative?.({ shouldStop: () => me.stop, maxMatches: 12000 });
        finalParallelChanged = finalParallelChanged || !!caught?.changed;
        if (caught?.result) {
          const row = window.CS2SimulationPerf.parallelCatchup;
          row.processedMatches += Number(caught.result.processedMatches) || 0;
          row.yields += Number(caught.result.yields) || 0;
          row.maxSliceMs = Math.max(row.maxSliceMs, Number(caught.result.maxSliceMs) || 0);
          row.remainingOverdue = Number(caught.result.remainingOverdue) || 0;
          row.passes++;
        }
      }
    } catch (e) { console.warn('[v33] parallel catch-up failed', e); }
    batchParallelChanged = batchParallelChanged || finalParallelChanged;
    await finalStage('schedulerMaintenance', async () => {
      if (typeof window.CS2SimulationKernel?.flushMaintenanceCooperative === 'function') await window.CS2SimulationKernel.flushMaintenanceCooperative();
      else window.CS2SimulationKernel?.flushMaintenance?.();
    });
    if (parallelNewsDirty || batchParallelChanged) await finalStage('parallelNews', () => window.v29FlushParallelNews?.());
    if (matchNewsDirty || batchParallelChanged) await finalStage('newsQueue', () => window.v29FlushNews?.());
    if (matchNewsDirty || batchParallelChanged) await finalStage('newsAnalytics', () => window.V30NewsScanner?.flush?.());
    await finalStage('fpl', () => window.V35Fpl?.tick?.());
    await finalStage('awards', () => window.V33Awards?.flushBatch?.());
    await finalStage('shows', () => window.V33Shows?.tick?.());
    await finalStage('showmatch', () => window.V35Show?.tick?.());
    await finalStage('majorOdds', () => window.V35Major?.tick?.());
    await finalStage('tournamentNews', () => window.v29CheckTournamentStart?.());
    await finalStage('predictions', () => window.v29SyncPredictions?.());
    await finalStage('pickem', () => window.V33Pickem?.sync?.());
    await finalStage('publicPickem', () => window.V70PickemPublications?.sync?.());
    await finalStage('careerClock', () => typeof window.V31?.syncClockCooperative==='function' ? window.V31.syncClockCooperative() : window.V31?.syncClock?.());
    await finalStage('rosterClock', () => window.V34Roster?.syncClock?.());
    await finalStage('transferClock', () => window.V30MarketSyncClock?.());
    await finalStage('rankSnapshot', () => window.V30RankSnapshotTick?.());
    await finalStage('parallelPrizes', () => window.V31SyncParallelPrizes?.());
    await finalStage('archivePoll', () => window.v37PollArchives?.());
    await finalStage('calendarRefresh', () => window.V30CalendarRefresh?.());
    await finalStage('newsRefresh', () => window.V34NewsRefresh?.());
    await finalStage('badges', () => window.V35Badges?.refresh?.());
    await finalStage('bets', () => window.V35Bets?.sync?.());
    await finalStage('careerCapture', () => window.v57CaptureCareerStats?.());
    // If the player had a live broadcast before skipping, resume it once at the final virtual date.
    await finalStage('resumeBroadcast', () => {
      if (batchBroadcastWasRunning && typeof currentTournament !== 'undefined' && currentTournament && !currentTournament.completed && !currentTournament.broadcast?.running && typeof startTVBroadcastMode === 'function') startTVBroadcastMode();
    });

    // Restore deferred wrappers only after all catch-up consumers have run, so
    // they cannot trigger dozens of localStorage writes and full renders.
    deferred.reverse().forEach(restore => { try { restore(); } catch (e) {} });
    try { if (window.HS && oldHRender) window.HS.render = oldHRender; } catch (e) {}

    // Explicit final commit: one write per canonical store, not one per subsystem.
    if (!previousBatch) window.v57BatchCalendarSkip = false;
    await finalStage('saveTeams', () => { if (typeof saveTeams === 'function') saveTeams(); });
    await finalStage('saveSeason', () => { if (typeof saveSeasonState === 'function') saveSeasonState(); });
    await finalStage('saveTransfers', () => { if (typeof saveTransferState === 'function') saveTransferState(); });
    await finalStage('calendarRender', () => window.v15RenderCalendar?.());
    await finalStage('tournamentRender', () => { if (typeof renderTournament === 'function') renderTournament(); });
    await finalStage('ratingRender', () => { if (typeof renderRating === 'function') renderRating(); });
    await finalStage('hubRender', () => window.HS?.render?.());
    try { await window.v56FlushBatchAutosave?.(); } catch (e) { console.warn('[v33] final autosave failed', e); }
    try { delete window.__CS2_BATCH_TRAINING_MAP_STATS; } catch (e) { window.__CS2_BATCH_TRAINING_MAP_STATS = null; }
    window.v57BatchCalendarSkip = previousBatch;
    if (!previousBatch) { try { window.CS2Compact?.run?.(); } catch (e) {} } // v84: после перемотки ужимаем завершённые фоновые турниры
    window.__CS2_BATCH_CPU_BUDGET_MS = previousCpuBudget;
    window.__CS2_FAST_FORWARD_IDLE_MS = previousIdleMs;
    const elapsed = Math.max(0, nowPerf() - startedAt);
    window.CS2SimulationPerf = window.CS2SimulationPerf || {};
    window.CS2SimulationPerf.lastBatch = {
      requestedDays: Number(n) || 0,
      completedDays,
      stopped: !!me.stop,
      elapsedMs: Math.round(elapsed),
      daysPerSecond: elapsed > 0 ? Math.round(completedDays * 1000 / elapsed * 10) / 10 : 0,
      averageDayMs: completedDays ? Math.round(dayMsTotal / completedDays * 100) / 100 : 0,
      peakDayMs: Math.round(peakDayMs * 100) / 100,
      browserYields: yields,
      savedOnce: true,
      virtualScheduler: 'wake-indexed',
      batchStages: window.CS2SimulationPerf?.batchStageTotals || {},
      finalStages: window.CS2SimulationPerf?.finalStageTotals || {},
      parallelCatchup: window.CS2SimulationPerf?.parallelCatchup || null,
      training: window.V31?.trainingDiagnostics?.() || null,
      sliceBudget: window.CS2SimulationPerf?.batchSlice || null
    };
    run = null; label('День');
    if (me.nations) { try { window.v84ShowToast?.(`${me.nations}: турнир сборных сыгран, перемотка остановлена. Итоги — в новостях и архиве.`); } catch (e) {} }
    if (me.pickem) {
      label(`Pick'Em: ${me.pickem.label}`);
      try { window.V29News?.add?.({ cat: 'event', icon: '🎯', imp: 6, title: `Открыт Pick'Em ${me.pickem.major}: ${me.pickem.label}`, lead: 'Перемотка остановлена, чтобы вы успели сделать прогноз до первого матча этапа.', body: ['Откройте раздел Pick’Em на портале и заполните прогноз.'], tags: [] }); } catch (e) {}
      try { window.v84ShowToast?.(`Открыт Pick'Em: ${me.pickem.label}. Перемотка остановлена.`); } catch (e) {}
    }
  }
}
window.v33SkipDays = skipDays;
// «К ближайшему матчу Tier-1»: часы переводятся на минуту раньше следующего матча основного турнира (идущий
// матч — сразу на месте). Между турнирами сначала переход к старту следующего (тем же «Днём», он сам прыгает к старту).
const sleep = ms => new Promise(r => setTimeout(r, ms));
function nextT1() {
  const t = typeof currentTournament !== 'undefined' ? currentTournament : null, b = t?.broadcast;
  if (!t || t.completed) return null;
  if (b?.active?.length) return { live: true };
  const q = (b?.queue || []).filter(x => Number(x.time)).sort((x, y) => x.time - y.time)[0];
  if (q) return { at: Number(q.time) };
  const auto = Number(t.calendar?.autoBroadcastAt) || 0; // сетка готова, эфир ещё не начат
  return auto ? { at: auto, wait: true } : null;
}
async function skipToTier1() {
  if (run) { run.stop = true; return; }
  const cal = typeof v15EnsureCalendar === 'function' ? v15EnsureCalendar() : seasonState.calendar;
  if (cal?.paused) { label('Сначала снимите паузу'); return; }
  run = { stop: false }; const me = run; label('К матчу Tier-1…');
  try {
    for (let guard = 0; guard < 40 && !me.stop; guard++) {
      if (cal?.paused) { me.stop = true; label('Пауза'); break; }
      const n = nextT1();
      if (n?.live) break;
      if (n?.at) {
        const mins = Math.floor((n.at - cal.currentMs) / 60000) - 1;
        if (mins > 0) { if (typeof v15AdvanceMinutes === 'function') v15AdvanceMinutes(mins, 'к ближайшему матчу Tier-1'); else cal.currentMs += mins * 60000; cal.lastWallMs = Date.now(); }
        if (!n.wait) break;
        await sleep(1500); continue; // ждём, пока эфир соберёт расписание
      }
      window.skipGameCalendarDay(); await sleep(400); // турнира нет — переход к старту следующего
    }
  } catch (e) { console.warn('[v33 skip tier1]', e); }
  try { saveSeasonState(); } catch (e) {}
  run = null; label('День');
  try { window.HS && window.HS.render(); } catch (e) {}
}
window.v33SkipToTier1 = skipToTier1;
function mount() {
  const btn = $('pt-skip'); if (!btn) return false;
  if ($('pt-skipdd')) return true;
  const dd = document.createElement('div'); dd.className = 'pt-dd pt-skipdd'; dd.id = 'pt-skipdd';
  dd.innerHTML = `<button type="button" class="pt-tbtn" data-dd aria-label="Пропустить несколько дней" title="Пропустить несколько дней">▾</button>
    <div class="pt-menu right"><button type="button" data-skipt1>К ближайшему матчу Tier-1</button>${[3, 5, 7, 14, 30, 60, 90, 180, 365].map(d => `<button type="button" data-skipn="${d}">Пропустить ${d} ${d === 3 ? 'дня' : 'дней'}</button>`).join('')}
      <div class="pt-skipn"><input type="number" min="1" max="365" value="30" id="pt-skipn" aria-label="Сколько дней"><button type="button" class="hs-btn sm" data-skipn="custom">Пропустить</button></div></div>`;
  btn.insertAdjacentElement('afterend', dd);
  return true;
}
document.addEventListener('click', e => {
  if (e.target.closest?.('[data-skipt1]')) { e.preventDefault(); e.stopPropagation(); document.querySelectorAll('.pt-dd.open').forEach(x => x.classList.remove('open')); skipToTier1(); return; }
  const b = e.target.closest?.('[data-skipn]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const v = b.dataset.skipn === 'custom' ? Math.max(1, Math.min(365, +($('pt-skipn')?.value || 0))) : +b.dataset.skipn;
  document.querySelectorAll('.pt-dd.open').forEach(x => x.classList.remove('open'));
  if (v) skipDays(v);
}, true);
// во время пропуска кнопка «День» работает как «Стоп»
document.addEventListener('click', e => { if (run && e.target.closest?.('#pt-skip')) { e.preventDefault(); e.stopPropagation(); run.stop = true; } }, true);
const t = setInterval(() => { if (mount()) clearInterval(t); }, 300);
})();
