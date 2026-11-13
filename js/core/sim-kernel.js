/* v63 — shared virtual clock + simulation scheduler coordinator.
   Tier-1 and background tournaments keep their specialised match resolvers,
   but all time changes and background scheduler pulses pass through this kernel. */
(() => {
  'use strict';
  if (window.CS2SimulationKernel?.version >= 1) return;

  let processing = false;
  let lastJumpMs = 0;
  let lastJumpWall = 0;
  let pulseCount = 0;

  function calendar() {
    try {
      if (typeof v15EnsureCalendar === 'function') return v15EnsureCalendar();
    } catch (e) {}
    try {
      if (typeof seasonState !== 'undefined') {
        return seasonState.calendar || (seasonState.calendar = {});
      }
    } catch (e) {}
    return null;
  }
  function now() {
    const c = calendar();
    return Number(c?.currentMs) || Date.now();
  }
  function paused() {
    const c = calendar();
    return !!c?.paused;
  }

  function processParallel(force, options = {}) {
    if (window.__CS2_FACTORY_RESET_IN_PROGRESS || paused() || processing) return false;
    const tick = window.v21TickParallel;
    if (typeof tick !== 'function') return false;
    processing = true;
    try {
      return !!tick(!!force, options);
    } catch (e) {
      console.warn('[v63] parallel scheduler failed', e);
      return false;
    } finally {
      processing = false;
    }
  }
  function afterClockJump(reason = 'calendar jump', options = {}) {
    if (window.__CS2_FACTORY_RESET_IN_PROGRESS || paused()) return false;
    const current = now();
    // A function chain can contain createTournament inside initTournamentCycle.
    // Reconcile once for the same clock value rather than running two catch-ups.
    const wall = Date.now();
    if (current === lastJumpMs && wall - lastJumpWall < 300 && !options.flush) return false;
    lastJumpMs = current;
    lastJumpWall = wall;
    const c = calendar();
    if (c) {
      c.lastWallMs = wall;
      if (reason) c.lastAdvanceReason = String(reason);
    }
    const processOptions = Object.assign({}, options, { deferIO: !!options.deferIO });
    delete processOptions.forceParallel;
    delete processOptions.flush;
    const changed = processParallel(options.forceParallel !== false, processOptions);
    if (!options.deferIO && options.persistClock && !changed) {
      try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {}
    }
    if (changed && !options.deferIO) {
      try { if (typeof renderRating === 'function') renderRating(); } catch (e) {}
      try { if (window.HS?.S?.page === 'events' || window.HS?.S?.page === 'event') window.HS.render(); } catch (e) {}
    }
    return changed;
  }
  function pulse(reason = 'scheduler pulse', options = {}) {
    if (window.__CS2_FACTORY_RESET_IN_PROGRESS) return false;
    pulseCount++;
    if (options.force) return afterClockJump(reason, options);
    const schedulerPulse = window.CS2ParallelSchedulerPulse;
    if (typeof schedulerPulse === 'function') {
      try { return !!schedulerPulse({ deferIO: !!options.deferIO }); }
      catch (e) { console.warn('[v63] scheduler pulse failed', e); return false; }
    }
    return processParallel(false, options);
  }
  function setTime(ms, reason = 'manual clock set', options = {}) {
    const c = calendar();
    if (!c || (paused() && !options.force)) return false;
    const next = Math.max(0, Number(ms) || 0);
    if (!Number.isFinite(next) || next === Number(c.currentMs)) return false;
    c.currentMs = next;
    c.lastAdvanceReason = String(reason || 'manual clock set');
    c.lastWallMs = Date.now();
    afterClockJump(reason, Object.assign({}, options, { persistClock: true }));
    try { window.v15RenderCalendar?.(); } catch (e) {}
    return true;
  }
  function advanceMinutes(minutes, reason = 'clock advance') {
    if (paused()) return false;
    if (typeof window.v15AdvanceMinutes === 'function') {
      return !!window.v15AdvanceMinutes(Number(minutes), reason);
    }
    const delta = Number(minutes);
    if (!Number.isFinite(delta) || delta <= 0) return false;
    return setTime(now() + delta * 60000, reason);
  }
  function matchState(match, atNow = now()) {
    const timing = window.CS2ParallelMatchTiming;
    if (match?.w) return { state: 'completed', at: Number(match.at) || 0, resolveAt: timing?.dueAt(match) || 0 };
    if (!match || !match.t1 || !match.t2) return { state: 'waiting-opponent', at: Number(match?.at) || 0, resolveAt: 0 };
    const at = Number(match.at) || 0;
    const resolveAt = Number(match.resolveAt) || timing?.dueAt(match) || 0;
    const t = Number(atNow) || now();
    if (!at) return { state: 'unscheduled', at: 0, resolveAt };
    if (t < at) return { state: 'scheduled', at, resolveAt };
    if (resolveAt > t) return { state: 'simulating', at, resolveAt };
    return { state: 'overdue', at, resolveAt };
  }
  function audit() {
    const c = calendar();
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    let parallel = [];
    try { parallel = typeof seasonState !== 'undefined' ? (seasonState.parallelSchedule || []) : []; } catch (e) {}
    const activeParallel = parallel.filter(e => e && e.status === 'live');
    const currentMs=Number(c?.currentMs)||0;
    const overdueMatches=activeParallel.reduce((n,e)=>n+(e.br?.matches||[]).filter(m=>!m.w&&((Number(m.at)||0)+150*60000)<=currentMs).length,0);
    return {
      version: 1,
      importReconciling: !!window.__CS2_IMPORT_RECONCILING,
      clock: { owner: 'v15 calendar', source: 'seasonState.calendar.currentMs', currentMs: Number(c?.currentMs) || 0, paused: !!c?.paused },
      controllers: {
        clock: 'CS2SimulationKernel',
        tier1Queue: 'currentTournament.broadcast.queue (legacy v18/v19/v20/v42 adapters)',
        parallelBrackets: 'CS2SimulationKernel → v21TickParallel → v22Advance'
      },
      counts: {
        tier1Queued: Number(ct?.broadcast?.queue?.length) || 0,
        parallelEvents: parallel.length,
        parallelLive: activeParallel.length,
        parallelPendingMatches: activeParallel.reduce((n, e) => n + (e.br?.matches || []).filter(m => !m.w).length, 0),
        parallelOverdueMatches: overdueMatches
      },
      topology: {
        canonicalClockSources: 1,
        recurringGameplayDispatchers: 1,
        independentMatchSchedulerTimers: 0,
        specialisedMatchResolvers: 2,
        tier1QueueCompatibilityAdapters: 4
      },
      independentClocks: 0,
      independentMatchSchedulerTimers: 0,
      specialisedMatchResolvers: 2,
      remainingCompatibilityLayers: ['Tier-1 broadcast queue adapters v18/v19/v20/v42', 'Tier-1 liveness v55', 'parallel bracket resolver v22'],
      pulseCount
    };
  }

  const api = {
    version: 1,
    now,
    paused,
    setTime,
    advanceMinutes,
    pulse,
    afterClockJump,
    matchState,
    audit,
    flushMaintenance,
    flushMaintenanceCooperative
  };
  window.CS2SimulationKernel = api;

  function wrapClockMutation(name, reason) {
    CS2.patch(name, original => {
      const wrapped = function (...args) {
        const before = now();
        const result = original.apply(this, args);
        const after = now();
        if (after !== before && after > before && !paused() && !window.v57BatchCalendarSkip) {
          afterClockJump(reason, { persistClock: name === 'v15SetClock' });
        }
        return result;
      };
      wrapped.__v63Original = original;
      return wrapped;
    }, { id: '__v63KernelWrapped', ifExists: true });
  }

  // Every public direct-jump entry point is observed. The v33 multi-day batch
  // intentionally defers I/O and already calls afterClockJump for each virtual day.
  ['v15SetClock', 'skipGameCalendarDay', 'initTournamentCycle', 'createTournament', 'runManualBootcamp']
    .forEach(name => wrapClockMutation(name, `clock jump: ${name}`));

  // One recurring dispatcher owns all gameplay schedule-maintenance tasks.
  // The actual virtual-time driver remains v15; this loop coordinates its consumers.
  const taskCadence = {
    v20Resync: 1000,
    v18Broadcast: 1000,
    v17Calendar: 2000,
    v19MatchSync: 2000,
    v18Cleanup: 5000,
    v42QueueWindow: 5000,
    parallel: 2000
  };
  const taskLastRun = Object.create(null);
  function flushMaintenance(){
    const wall=Date.now(), tasks=window.CS2SimulationTasks||{};
    Object.keys(taskCadence).forEach(name=>{
      if(name==='parallel') return;
      taskLastRun[name]=wall;
      try{ tasks[name]?.(); }catch(e){ console.warn(`[v63] flush task ${name} failed`,e); }
    });
  }
  async function flushMaintenanceCooperative(){
    const wall=Date.now(), tasks=window.CS2SimulationTasks||{}, results=[];
    const yieldFrame=()=>window.CS2Yield ? window.CS2Yield.frame() : new Promise(resolve=>{
      try{
        if(document.visibilityState!=='hidden' && typeof requestAnimationFrame==='function') requestAnimationFrame(()=>resolve());
        else setTimeout(resolve,4);
      }catch(e){setTimeout(resolve,4);}
    });
    for(const name of Object.keys(taskCadence)){
      if(name==='parallel') continue;
      taskLastRun[name]=wall;
      const t0=window.performance?.now?window.performance.now():Date.now();
      try{ await tasks[name]?.(); }
      catch(e){ console.warn(`[v63] cooperative flush task ${name} failed`,e); }
      const t1=window.performance?.now?window.performance.now():Date.now();
      results.push({name,durationMs:Math.round(Math.max(0,t1-t0)*100)/100});
      // Yield between *all* maintenance tasks, not just slow ones, so a group
      // of individually-small tasks cannot form one long unresponsive block.
      await yieldFrame();
    }
    window.CS2SimulationPerf=window.CS2SimulationPerf||{};
    window.CS2SimulationPerf.maintenanceFlush=results;
    return results;
  }
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => {
    // Import catch-up owns the scheduler while it reconciles overdue brackets in
    // yielding batches. Do not compete with it using ordinary maintenance timers.
    if(window.v57BatchCalendarSkip || window.__CS2_IMPORT_RECONCILING) return;
    const wall = Date.now();
    const tasks = window.CS2SimulationTasks || {};
    Object.entries(taskCadence).forEach(([name, cadence]) => {
      if (wall - (taskLastRun[name] || 0) < cadence) return;
      taskLastRun[name] = wall;
      try {
        if (name === 'parallel') pulse('parallel scheduler');
        else tasks[name]?.();
      } catch (e) { console.warn(`[v63] task ${name} failed`, e); }
    });
  }, 500);

  function invalidateSchedule(reason='state replaced'){
    try{ window.v21InvalidateParallelWake?.(reason); }catch(e){}
    lastJumpMs=0; lastJumpWall=0;
    return true;
  }
  async function reconcileImportedSave(reason='save import'){
    invalidateSchedule(reason);
    if(typeof window.v21ReconcileImportedSave==='function') return await window.v21ReconcileImportedSave(reason);
    try{ return window.v21TickParallel?.(true,{deferIO:false}); }catch(e){ return false; }
  }
  api.invalidateSchedule=invalidateSchedule;
  api.reconcileImportedSave=reconcileImportedSave;

  console.info('[v63] shared simulation clock and central scheduler dispatcher enabled');
})();
