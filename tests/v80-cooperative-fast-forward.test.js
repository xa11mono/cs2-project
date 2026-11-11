// v81: cooperative virtual-day and parallel-match catch-up prevents long main-thread tasks.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = (v, m) => { if (!v) throw new Error(m); };
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const v17 = read('js/manager/v17-smart-calendar-skip.js');
const v21 = read('js/manager/v21-parallel-tournaments-academies-layer.js');
const v33 = read('js/manager/v33-time.js');
const v63 = read('js/manager/v63-simulation-kernel.js');
const html = read('index.html');

assert(/async function v17PlayDueMatchesCooperative/.test(v17) && /await v17YieldToBrowser\(\)/.test(v17), 'Tier-1 day skip must yield between match resolutions');
assert(/async function v17RunBatchStage/.test(v17) && /result = await fn\(\)/.test(v17), 'batch-stage timings must include awaited stage work');
assert(/await window\.v21ProcessOverdueCooperative/.test(v33), 'the day-skip driver must await cooperative background catch-up');
assert(/flushMaintenanceCooperative/.test(v63) && /await finalStage\('schedulerMaintenance'/.test(v33), 'final scheduler maintenance must yield between each maintenance task');
assert(/if \(window\.v57BatchCalendarSkip\) return result;/.test(read('js/manager/v18-calendar-match-sync.js')), 'Tier-1 broadcast scheduler wrapper must not rebuild queues on every skipped day');
assert(/skipBacklogRecompute:true/.test(v21) && /opts\.skipBacklogRecompute \? true/.test(v21), 'single-match catch-up slices must not rescan the full 70-event archive after every match');
assert(/matchBudget: 1/.test(v33), 'the normal per-day scheduler tick must be capped at one background match');
assert(/requestAnimationFrame/.test(v21) && /await v21YieldBatchFrame\(\)/.test(v21), 'background catch-up must yield between matches');
assert(/skipGlobalMaintenance:true/.test(v21) && /eventIds:\[eventId\]/.test(v21), 'subsequent catch-up slices must target one overdue event without repeating global maintenance');
assert(/lastCooperativeCatchup/.test(v21) && /maxSliceMs/.test(v21), 'scheduler diagnostics must expose cooperative slice timings');
assert(/processOptions = Object\.assign/.test(v63) && /processParallel\(options\.forceParallel !== false, processOptions\)/.test(v63), 'kernel must pass match budget through to parallel scheduler');
for (const [file, version] of [
  ['v17-smart-calendar-skip.js', 99],
  ['v18-calendar-match-sync.js', 99],
  ['v21-parallel-tournaments-academies-layer.js', 99],
  ['v27-hltv-site.js', 99],
  ['v33-time.js', 99],
  ['v63-simulation-kernel.js', 99]
]) assert(html.includes(`${file}?v=${version}`), `${file} must bypass browser cache`);

// Exercise the real cooperative helper against a minimal deterministic overdue queue.
(async () => {
  const start = v21.indexOf('  function v21CollectOverdueEventIds(now=v21Now()){');
  const end = v21.indexOf('  window.v21ProcessOverdueCooperative=v21ProcessOverdueCooperative;', start);
  assert(start >= 0 && end > start, 'cooperative catch-up functions must remain isolated for regression testing');
  const events = [
    { id: 'event-a', season: 1, status: 'live', br: { matches: [{ at: 100, w: null }, { at: 200, w: null }, { at: 300, w: null }] } },
    { id: 'event-b', season: 1, status: 'live', br: { matches: [{ at: 150, w: null }] } },
    { id: 'future', season: 1, status: 'scheduled', startMs: 11000000, br: { matches: [{ at: 11000000, w: null }] } }
  ];
  const now = 12000000;
  let clock = 0, nextWake = 0, lastSeason = 0, deferredSince = 0, yields = 0;
  const count = (at, ids = null) => events.reduce((n, e) => {
    if (e.season !== 1 || ['completed', 'cancelled'].includes(e.status) || (ids && !ids.has(e.id))) return n;
    if (e.status === 'scheduled' && Number(e.startMs || 0) > at) return n;
    return n + e.br.matches.filter(m => !m.w && Number(m.at || 0) + 150 * 60000 <= at).length;
  }, 0);
  const sourceStart = start;
  const snippet = v21.slice(sourceStart, end) + '\nthis.runCatchup=v21ProcessOverdueCooperative;';
  const ctx = {
    seasonState: { currentSeason: 1, parallelSchedule: events },
    window: {}, document: { visibilityState: 'visible' }, v21Cal: () => ({ paused: false }), Number, Math, String, Set, Array, Date,
    performance: { now: () => clock }, requestAnimationFrame(fn) { yields++; clock += 1; fn(); }, setTimeout(fn) { yields++; clock += 1; fn(); }, console,
    v21Now: () => now, V22_RESOLVE_MIN: 150,
    v21CountOverdueMatches: count, v21HasOverdueMatches: (at) => count(at) > 0,
    v21ProcessParallel(at, force, opts) {
      const e = events.find(x => opts.eventIds?.includes(x.id));
      if (!e) return false;
      const m = e.br.matches.find(x => !x.w && Number(x.at || 0) + 150 * 60000 <= at);
      if (!m) return false;
      m.w = 'winner'; return true;
    },
    v21ComputeNextParallelWake: () => now + 1,
    v21LastParallelSeason: 1,
    v21NextParallelWakeAt: 0,
    v21DeferredSinceWall: 0
  };
  vm.runInNewContext(snippet, ctx, { filename: 'v21-cooperative-catchup.js' });
  const out = await ctx.runCatchup({ maxMatches: 100 });
  assert(out.changed && out.result.processedMatches === 4, 'all four overdue matches should be resolved');
  assert(out.result.remainingOverdue === 0, 'cooperative catch-up should leave no overdue matches');
  assert(out.result.yields === 4 && yields === 4, 'the browser must receive a frame between each resolved background match');
  assert(events.find(e => e.id === 'future').br.matches[0].w == null, 'future matches must not be resolved early');

console.log('PASS v81: Tier-1 and parallel match simulation yield between expensive match resolutions');
console.log('PASS v81: cooperative background catch-up drains due matches one at a time and leaves future matches untouched');
console.log('PASS v81: per-batch stage timings and catch-up diagnostics expose the remaining heavy slices');
})().catch(err => { console.error(err); process.exitCode = 1; });
