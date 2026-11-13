// v63 regression tests: one clock coordinator, parallel wake math and overdue-match state.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/core/sim-kernel.js'), 'utf8');
const v21 = fs.readFileSync(path.join(root, 'js/competition/parallel-tournaments.js'), 'utf8');
const v25 = fs.readFileSync(path.join(root, 'js/competition/hltv-hub.js'), 'utf8');
const v30 = fs.readFileSync(path.join(root, 'js/portal/events.js'), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const calls = [];
const timers = [];
let saveCount = 0;
const cal = { currentMs: 1000, paused: false };
const win = {
  v21TickParallel: (force, options) => { calls.push({ type: 'tick', force, options }); if (!options?.deferIO) saveCount++; return true; },
  CS2ParallelSchedulerPulse: options => { calls.push({ type: 'pulse', options }); return true; },
  skipGameCalendarDay() { cal.currentMs += 86400000; return true; },
  initTournamentCycle() { cal.currentMs += 3600000; return true; },
  createTournament() { cal.currentMs += 60000; return true; },
  runManualBootcamp() { cal.currentMs += 3 * 86400000; return true; },
  v15SetClock(ms) { cal.currentMs = Number(ms); },
  v15RenderCalendar() {},
  __CS2_FACTORY_RESET_IN_PROGRESS: false
};
const sandbox = {
  window: win,
  seasonState: { calendar: cal, parallelSchedule: [] },
  currentTournament: null,
  v15EnsureCalendar: () => cal,
  saveTeams() {}, saveSeasonState() { saveCount++; }, renderRating() {},
  console: { info() {}, warn() {} },
  Date,
  setInterval(fn, ms) { timers.push({ fn, ms }); return timers.length; }
};
require('./lib/project').attachKernel(sandbox);   // v144: модули расширяют функции через CS2.patch
vm.runInNewContext(source, sandbox, { filename: 'js/core/sim-kernel.js' });

assert(win.CS2SimulationKernel?.version === 1, 'kernel API should initialize');
assert(timers.length === 1 && timers[0].ms === 500, 'kernel should own exactly one recurring gameplay dispatcher');
win.skipGameCalendarDay();
assert(calls.some(x => x.type === 'tick' && x.force), 'manual one-day skip must force a catch-up tick');
const beforeInit = calls.length;
win.initTournamentCycle();
assert(calls.length > beforeInit && calls.at(-1).force, 'direct tournament-start clock jump must be reconciled');
const beforeCreate = calls.length;
win.createTournament();
assert(calls.length > beforeCreate && calls.at(-1).force, 'direct tournament creation clock jump must be reconciled');
const beforeCamp = calls.length;
win.runManualBootcamp();
assert(calls.length > beforeCamp && calls.at(-1).force, 'bootcamp time advance must be reconciled');
const beforePulse = calls.length;
win.CS2SimulationKernel.pulse('test timer');
assert(calls.length > beforePulse && calls.at(-1).type === 'pulse', 'normal pulse should use the shared scheduler adapter');
const beforePause = calls.length;
cal.paused = true;
win.CS2SimulationKernel.afterClockJump('paused test');
assert(calls.length === beforePause, 'paused calendar must freeze scheduler catch-up');
cal.paused = false;
win.CS2SimulationKernel.setTime(123456, 'test setter');
assert(cal.currentMs === 123456, 'kernel setTime must update the canonical calendar');
assert(calls.at(-1).type === 'tick' && calls.at(-1).force, 'kernel setTime must reconcile all background brackets');
assert(saveCount > 0, 'direct kernel clock changes must persist even when no bracket match changes');
assert(win.CS2SimulationKernel.audit().independentClocks === 0, 'all match systems must read the one canonical virtual clock');
assert(win.CS2SimulationKernel.audit().topology.recurringGameplayDispatchers === 1, 'one dispatcher should own recurring match-maintenance tasks');
assert(win.CS2SimulationKernel.audit().independentMatchSchedulerTimers === 0, 'no match module should own an independent recurring scheduler timer');

// Pin the arithmetic regression: due time is anchored to the original match slot.
assert(/nextWake\(match, now\)/.test(v21), 'parallel timing contract should expose a shared nextWake calculation');
assert(/eventWake=Math\.min\(eventWake,window\.CS2ParallelMatchTiming\.nextWake\(match,now\)\)/.test(v21), 'scheduler should use the earliest unresolved match dueAt, not the first array entry or a fresh 150-minute wait from now');
assert(!/Math\.max\(now,Number\(pending\.at\)\|\|now\)\+V22_RESOLVE_MIN\*60000/.test(v21), 'old delayed-wake bug must be absent');
const timingStart = v21.indexOf('window.CS2ParallelMatchTiming = Object.freeze(');
const timingEnd = v21.indexOf('\n  });', timingStart) + '\n  });'.length;
assert(timingStart >= 0 && timingEnd > timingStart, 'parallel match timing contract should be extractable');
const timingSandbox = { window: {}, Object, Number, Math, V22_RESOLVE_MIN: 150, V22_SLOT_MIN: 180 };
vm.runInNewContext(v21.slice(timingStart, timingEnd), timingSandbox);
const timing = timingSandbox.window.CS2ParallelMatchTiming;
const slot = 1000000, deadline = slot + 150 * 60000;
assert(timing.dueAt({ at: slot }) === deadline, 'match deadline must be anchored to scheduled slot time');
assert(timing.nextWake({ at: slot }, slot + 60 * 60000) === deadline, 'a match already underway must wake at the original deadline, not current time + 150 minutes');
assert(timing.nextWake({ at: slot }, deadline + 60000) === deadline + 60000, 'an overdue match must wake immediately');
assert(/v22RepairMatchTimes\(ev\)/.test(v21), 'older brackets with missing timestamps should be repaired before simulation');
assert(!/setInterval/.test(v21), 'parallel tournament layer must not own a second scheduler timer');
assert(/CS2SimulationTasks\.v20Resync/.test(fs.readFileSync(path.join(root, 'js/calendar/schedule-resync.js'), 'utf8')), 'Tier-1 resync must register with the central dispatcher');
assert(!/CS2SimulationTasks\.v20SyncSpeed/.test(fs.readFileSync(path.join(root, 'js/calendar/schedule-resync.js'), 'utf8')), 'redundant second playback-speed owner must be removed');
win.CS2SimulationTasks = {
  v20Resync: () => calls.push({ type: 'task', name: 'v20Resync' }),
  v18Broadcast: () => calls.push({ type: 'task', name: 'v18Broadcast' }),
  v17Calendar: () => calls.push({ type: 'task', name: 'v17Calendar' }),
  v19MatchSync: () => calls.push({ type: 'task', name: 'v19MatchSync' }),
  v18Cleanup: () => calls.push({ type: 'task', name: 'v18Cleanup' }),
  v42QueueWindow: () => calls.push({ type: 'task', name: 'v42QueueWindow' })
};
timers[0].fn();
assert(calls.filter(x => x.type === 'task').length === 6, 'central dispatcher should run each registered Tier-1 maintenance task');
assert(calls.some(x => x.type === 'pulse'), 'central dispatcher should include the parallel bracket scheduler task');
assert(/o\.resolveAt=timing\.dueAt\(m\)/.test(v25), 'HLTV snapshots should carry the authoritative resolve time');
assert(/Симуляция матча/.test(v30) && /Матч ожидает обработки/.test(v30), 'portal should distinguish simulation/overdue from unknown schedule');

const schedulingLayers = [
  'js/calendar/smart-skip.js', 'js/calendar/match-sync.js',
  'js/calendar/schedule-speed.js', 'js/calendar/schedule-resync.js',
  'js/competition/parallel-tournaments.js', 'js/calendar/schedule-fix.js'
];
for (const file of schedulingLayers) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  assert(!/setInterval\s*\(/.test(text), `${file} must register tasks rather than own a recurring scheduler timer`);
}
const v33 = fs.readFileSync(path.join(root, 'js/calendar/skip-days.js'), 'utf8');
assert(/CS2SimulationKernel\?\.afterClockJump/.test(v33) && /flush: true/.test(v33), 'multi-day skips must use the kernel and flush deferred writes once at the end');

console.log('PASS v63 shared clock and parallel scheduler kernel');
console.log('PASS v63 delayed-match wake calculation');
console.log('PASS v63 stale bracket repair and visible processing state');
