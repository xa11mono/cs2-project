// v72: long fast-forward batches suspend wall-clock work, process virtual time deterministically, and commit once.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const batch = read('js/manager/v33-time.js');
const v17 = read('js/manager/v17-smart-calendar-skip.js');
const v15 = read('js/manager/v15-training-calendar-layer.js');
const v21 = read('js/manager/v21-parallel-tournaments-academies-layer.js');
const v63 = read('js/manager/v63-simulation-kernel.js');
const v29 = read('js/manager/v29-news.js');
const v56 = read('js/manager/v56-autosave.js');
const v57 = read('js/manager/v57-player-career.js');
const autoScript = read('js/manager/auto_script_1.js');
const spectator = read('js/manager/v32-spectator.js');
const v30Market = read('js/manager/v30-market.js');
const v31Career = read('js/manager/v31-career-core.js');
const html = read('index.html');

assert(!/setTimeout\(r,\s*45\)/.test(batch), 'there must be no fixed 45ms sleep for every virtual day');
assert(/requestAnimationFrame/.test(batch) && /await yieldToBrowser\(\)/.test(batch) && /await oneDay\(\)/.test(batch), 'the batch should yield to an actual browser paint after each virtual day');
assert(/CS2SimulationPerf\.lastBatch/.test(batch) && /daysPerSecond/.test(batch) && /peakDayMs/.test(batch) && /parallelCatchup/.test(batch), 'the last fast-forward should expose measurable performance and cooperative-catchup diagnostics');
assert(/365/.test(batch) && /Math\.min\(365/.test(batch), 'the skip UI should support a full 365-day simulation');
assert(/patchDeferred\('saveTransferState'\)/.test(batch), 'transfer-state writes should be deferred with team/season persistence');
assert(/await window\.v56FlushBatchAutosave\?\.\(\)/.test(batch), 'a full autosave should be committed after a batch');
assert(/if\(window\.v57BatchCalendarSkip \|\| window\.__CS2_IMPORT_RECONCILING\) return/.test(v63), 'the shared dispatcher must suspend duplicate wall-clock pulses during batch skip and import reconciliation');
assert(/v21NextParallelWakeAt/.test(v21) && /now < v21NextParallelWakeAt\) return false/.test(v21), 'parallel schedules must use their next-event wake index for O(1) idle days');
assert(/processOptions = Object\.assign\(\{\}, options/.test(v63) && /processParallel\(options\.forceParallel !== false, processOptions\)/.test(v63), 'the simulation kernel must preserve per-batch match budgets and cooperative scheduler options');
assert(v21.indexOf('now < v21NextParallelWakeAt) return false') < v21.indexOf('v21NormalizeState();', v21.indexOf('function v21ProcessParallel')), 'the idle wake check must happen before full bracket normalization');
assert(/if\(window\.v57BatchCalendarSkip\)\s*\{\s*v15LastWallMs=now;\s*return;\s*\}/.test(v15), 'the live calendar timer must not race the fast-forward driver');
assert(/if\(changed\)[\s\S]*localStorage\.setItem\('cs2_season_state_v61'/.test(v15), 'calendar state should only be serialized when schedule decoration changed');
assert(/await fn\(\)/.test(v17) && /await v17YieldToBrowser\(\)/.test(v17), 'daily stages must be awaited and yield after expensive work');
assert(/v21ProcessOverdueCooperative/.test(v21) && /matchBudget:\s*1/.test(batch), 'overdue parallel matches must be processed cooperatively one at a time during fast-forward');
assert(/v21CollectOverdueEventIds/.test(v21) && /skipGlobalMaintenance:true/.test(v21), 'cooperative catch-up should target only events with overdue matches and avoid repeating global maintenance');
assert(/syncCareerClock[\s\S]*while\(now-c\.weekMs>=WEEK\)/.test(v31Career), 'career weekly events must catch up without dropping weeks');
assert(/while\(now-last>=7\*DAY\)/.test(v30Market), 'transfer-market weeks must be processed from virtual time rather than wall-clock intervals');
assert(/bulkSimulationOwnsThread\(\) && reason !== 'pagehide'/.test(v56) && /v56FlushBatchAutosave/.test(v56), 'periodic autosaves must pause during fast-forward, import and parallel catch-up');
assert(/if\(!window\.v57BatchCalendarSkip && !document\.hidden\) syncBaseline\(false\)/.test(v57) && /rosterChanged/.test(v57), 'career stats must be event-driven and must not rebuild during batch simulation');
assert(/if\(!window\.v57BatchCalendarSkip\) drain\(\)/.test(v29) && /v29FlushNews/.test(v29), 'news processing should be deferred and flushed at the end');
assert(/if \(window\.v57BatchCalendarSkip \|\| !b\.running/.test(autoScript) && /if \(window\.v57BatchCalendarSkip\) \{ item\.tickInProgress = false; scheduleTick\(1000\); return; \}/.test(autoScript), 'broadcast watchdog and live match ticks must pause while virtual time is batch-owned');
assert(/if\(wasRunning && !window\.v57BatchCalendarSkip/.test(v17) && /batchBroadcastWasRunning/.test(batch) && /startTVBroadcastMode\(\)/.test(batch), 'a previously active live broadcast should resume once after the batch, not after each day');
assert(/window\.v57BatchCalendarSkip \|\| H\.S\.page/.test(spectator), 'spectator UI polling should suspend during long fast-forward');
for (const f of ['v17-smart-calendar-skip.js', 'v33-time.js', 'v63-simulation-kernel.js', 'v21-parallel-tournaments-academies-layer.js', 'auto_script_1.js', 'v32-spectator.js']) {
  const version = 114; // v114: all scripts share one cache version
  assert(html.includes(`${f}?v=${version}`), `${f} must bypass stale browser cache after the relevant patch`);
}
assert(html.includes('v56-autosave.js?v=114'), 'autosave snapshot scheduler must bypass the v80 browser cache');

(async () => {
  let days = 0, parallelTicks = 0, yields = 0, finalAutosaves = 0, renders = 0, savesTeams = 0, savesSeason = 0;
  const doc = { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } };
  function saveTeams() { savesTeams++; }
  function saveSeasonState() { savesSeason++; }
  const win = {
    requestAnimationFrame(fn) { yields++; fn(); return yields; },
    saveTeams, saveSeasonState,
    skipGameCalendarDay() {},
    v15IsCalendarPaused() { return false; },
    v17AdvanceSingleCalendarDayForBatch() {
      assert(win.v57BatchCalendarSkip, 'batch flag must own the virtual clock during every day');
      days++; win.v57LastBatchDayMatches = 0; return true;
    },
    CS2SimulationKernel: {
      afterClockJump(reason, options) { if(reason === 'multi-day calendar skip' && options.deferIO) parallelTicks++; return false; },
      flushMaintenance() {}
    },
    v56FlushBatchAutosave() { finalAutosaves++; return Promise.resolve(true); },
    HS: { render() { renders++; } }
  };
  const ctx = { window: win, document: { ...doc, visibilityState: 'visible' }, saveTeams, saveSeasonState, console, Promise, setTimeout(fn, ms) { if (ms <= 4) yields++; return setTimeout(fn, ms); }, setInterval() { return 1; }, clearInterval() {}, Math, Number, String, Object, Array, Date };
  vm.runInNewContext(batch, ctx, { filename: 'v33-time.js' });
  await win.v33SkipDays(25);
  assert(days === 25 && parallelTicks === 25, 'all virtual days and daily scheduler ticks must run exactly once');
  assert(yields >= 25, 'the browser should receive a paint/input opportunity after every virtual day');
  assert(savesTeams === 1 && savesSeason === 1, 'game state should be persisted once at the end, not once per day');
  assert(finalAutosaves === 1, 'the full IndexedDB/file backup should flush once per batch');
  assert(renders === 1, 'the main hub should render once after the batch');
  assert(win.CS2SimulationPerf.lastBatch.completedDays === 25 && Number.isFinite(win.CS2SimulationPerf.lastBatch.browserYields), 'performance diagnostics should reflect the completed batch (v84: yields only when a work slice exceeds its budget)');
  console.log('PASS v72: fast-forward has no per-day sleep, pauses duplicate pollers/saves, and processes every virtual day');
  console.log('PASS v72: idle parallel days use wake-index, weekly systems catch up, news/autosave flush once, and the 365-day option is available');
})().catch(err => { console.error(err); process.exitCode = 1; });
