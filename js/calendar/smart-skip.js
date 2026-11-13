
(() => {
  'use strict';

  function v17Calendar(){
    if(typeof v15EnsureCalendar==='function') return v15EnsureCalendar();
    if(!seasonState.calendar || typeof seasonState.calendar!=='object') seasonState.calendar={};
    return seasonState.calendar;
  }

  function v17GetNextTournamentStep(){
    try{
      if(typeof v15NextStep==='function') return v15NextStep();
      const idx=Number(seasonState.tournamentIndex)||1;
      return seasonState.seasonSchedule?.[idx] || null;
    }catch(e){ return null; }
  }

  function v17HasActiveTournament(){
    return !!(typeof currentTournament!=='undefined' && currentTournament && !currentTournament.completed);
  }

  function v17SetTournamentFormFromSchedule(){
    try{
      if(typeof updateTournamentSuggestion==='function') updateTournamentSuggestion();
    }catch(e){ console.warn('[v17] schedule form sync failed',e); }
  }

  function v17StartScheduledTournament(){
    if(v17Calendar().paused) return false;
    if(v17HasActiveTournament()) return true;
    const step=v17GetNextTournamentStep();
    if(!step) return false;
    const c=v17Calendar();
    const start=Number(step.calendar?.startMs)||0;
    if(start>0 && c.currentMs<start) return false;

    // Put the form in sync with the scheduled event before automatic launch.
    v17SetTournamentFormFromSchedule();
    try{
      if(typeof initTournamentCycle==='function'){
        initTournamentCycle();
      }else if(typeof createTournament==='function'){
        createTournament();
        if(typeof renderTournament==='function') renderTournament();
        if(typeof renderRating==='function') renderRating();
        if(typeof saveSeasonState==='function') saveSeasonState();
      }
    }catch(err){
      console.error('[v17] automatic scheduled tournament launch failed:',err);
      const status=document.getElementById('tour-status');
      if(status) status.innerText=`⚠️ Не удалось автоматически открыть турнир: ${err?.message||'ошибка'}`;
      return false;
    }
    if(!v17HasActiveTournament()) return false;

    const cc=v17Calendar();
    const actualStart=Math.max(Number(cc.currentMs)||0, start||0);
    cc.nextMatchAt=actualStart;
    try{ saveSeasonState(); }catch(e){}
    if(typeof v15RenderCalendar==='function') v15RenderCalendar();
    return true;
  }

  // Пропуск дня: сыграть дневную норму серий (v18DayCap: ранние стадии — до 6, с четвертьфинала — 2) в порядке сетки,
  // за вычетом уже сыгранных сегодня в эфире; идущие в эфире серии доигрываются.
  function v17PlayDueMatches(){
    const t=currentTournament, b=t?.broadcast;
    const today=new Date(Number(v17Calendar().currentMs)||Date.now()).toDateString();
    let done=(b?.finished||[]).filter(x=>new Date(Number(x.actualStartAt||x.time)||0).toDateString()===today).length;
    const live=(b?.active||[]).length;
    const wasRunning=!!b?.running;
    if(wasRunning && typeof stopTournamentBroadcast==='function') stopTournamentBroadcast(false);
    let n=0;
    try{ window.v55RepairTournamentProgress?.(); }catch(e){}
    while(!t.completed){
      let list=[];
      try{ list=getBroadcastPlayableMatches(); }catch(e){ console.warn('[v17] match list failed',e); }
      // Calendar skips use the same canonical next-match resolver as step mode
      // when a saved queue/currentRound pointer is stale or temporarily empty.
      if(!list.length){
        try{ const fallback=typeof getNextPlayableMatch==='function'?getNextPlayableMatch():null; if(fallback?.match) list=[fallback]; }catch(e){}
      }
      if(!list.length){
        try{ window.v55RepairTournamentProgress?.(); }catch(e){}
        try{ list=getBroadcastPlayableMatches(); }catch(e){}
        if(!list.length){
          try{ const fallback=typeof getNextPlayableMatch==='function'?getNextPlayableMatch():null; if(fallback?.match) list=[fallback]; }catch(e){}
        }
      }
      if(!list.length) break;
      const cap=typeof window.v18DayCap==='function' ? window.v18DayCap(list) : 6;
      if(n>=live && done+n>=cap) break;
      // v84: и при пропуске одного дня — новый этап Pick'Em открылся, матчи этапа не играем до прогноза
      try {
        const open = window.V33Pickem?.openUnfilled?.(), st = seasonState;
        if (open && !(st.v84PickemPrompted || {})[open.key]) { window.__v84PickemHalt = open; break; }
      } catch(e) {}
      try{ instantMatch(list[0].match,list[0].callback); n++; }
      catch(e){ console.warn('[v17] skip: match failed',e); break; }
      if(n % 2 === 0){ try{ window.v55RepairTournamentProgress?.(); }catch(e){} }
    }
    try{ window.v55RepairTournamentProgress?.(); }catch(e){}
    try{ if(typeof renderTournament==='function') renderTournament(); }catch(e){}
    if(wasRunning && !window.v57BatchCalendarSkip && !t.completed && typeof startTVBroadcastMode==='function') startTVBroadcastMode();
    return n;
  }

  function v17RebaseQueueAfterSkip(){
    try {
      const b = currentTournament?.broadcast;
      if (!b || !Array.isArray(b.queue) || !b.queue.length) return;
      const pending = b.queue.filter(q => q && q.status !== 'live' && q.status !== 'done');
      if (!pending.length) return;
      // Скип игрового дня — это не задержка матчей. Переносим несыгранные серии
      // на новую дату, сбрасываем старый planned time и считаем расписание заново.
      pending.forEach(q => {
        q.v42ScheduleVersion = 0;
        q.delayedByMs = 0;
        q.v19ShiftedByMs = 0;
        q.delayed = false;
        q.isDelayed = false;
        q.late = false;
      });
      b.v18ScheduleCursor = 0;
      b.scheduleCursorGame = 0;
      if (typeof window.v18FitDays === 'function') window.v18FitDays(b);
      pending.forEach(q => {
        // v42 writes the authoritative slot to `time`; older renderers may still
        // prefer `plannedTime`/`v18PlannedTime`, so synchronize every alias.
        const at = Number(q.time) || Number(v17Calendar().currentMs) || Date.now();
        q.time = at;
        q.v18PlannedTime = at;
        q.gameScheduledAt = at;
        q.plannedTime = at;
        q.originalPlannedTime = at;
        q.actualStartAt = 0;
        q.delayedByMs = 0;
        q.v19ShiftedByMs = 0;
        q.v18ShiftedByMs = 0;
        q.delayed = false;
        q.isDelayed = false;
        q.late = false;
        q.v42ScheduleVersion = 1;
        q.v42LastPlannedTime = at;
        q.v49RebasedAfterSkip = Number(v17Calendar().currentMs) || Date.now();
      });
      if (currentTournament?.calendar) {
        const first = pending.slice().sort((a,b) => Number(a.time)-Number(b.time))[0];
        if (first) currentTournament.calendar.nextMatchAt = Number(first.time) || 0;
      }
      try { if (typeof renderBroadcastPanel === 'function') renderBroadcastPanel(); } catch (e) {}
    } catch (e) { console.warn('[v17] queue rebase after skip', e); }
  }
  function v17RefreshPickem(){
    try {
      // A day-skip is a simulation tick: update Pick'Em from the new Major stage
      // state/date before repainting either portal or legacy modal.
      if (window.V33Pickem?.sync) window.V33Pickem.sync();
      if (window.V33Pickem?.refresh) window.V33Pickem.refresh();
      else if (window.HS?.S?.page === 'pickem' || window.HS?.S?.page === 'majorpath') window.HS.render();
      const modal = document.getElementById('pickem-modal');
      const visible = modal && (modal.style.display === 'flex' || (!modal.style.display && modal.offsetParent));
      if (visible && typeof renderPickemContent === 'function') renderPickemContent();
      try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch(e) {}
    } catch (e) { console.warn("[v17] Pick'Em refresh failed", e); }
  }

  const V17_DAY_MS = 86400000;
  const V17_WEEK_MS = 7 * V17_DAY_MS;
  let v17BatchCpuSinceYield = 0;
  function v17YieldToBrowser(){
    if (window.CS2Yield) return window.CS2Yield.frame();   // v144: общий планировщик уступок (js/core/scheduler.js)
    return new Promise(resolve => {
      const finish = () => { try { window.CS2Yield?.reset?.(); } catch(e) {} resolve(); }; // v84: no artificial idle gap
      try { if (document.visibilityState !== 'hidden' && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(finish); else setTimeout(finish,4); }
      catch (e) { setTimeout(finish,4); }
    });
  }
  async function v17RunBatchStage(name, fn){
    if (window.__CS2_BATCH_CPU_RESET) { v17BatchCpuSinceYield = 0; window.__CS2_BATCH_CPU_RESET = false; }
    const perf = window.CS2SimulationPerf = window.CS2SimulationPerf || {};
    const stages = perf.batchStageTotals = perf.batchStageTotals || {};
    const started = window.performance?.now ? window.performance.now() : Date.now();
    let result;
    try { result = await fn(); }
    finally {
      const ended = window.performance?.now ? window.performance.now() : Date.now();
      const ms = Math.max(0, ended - started), row = stages[name] || (stages[name] = { calls: 0, totalMs: 0, maxMs: 0 });
      const rounded = Math.round(ms * 100) / 100;
      row.calls++; row.totalMs = Math.round((row.totalMs + ms) * 100) / 100; row.maxMs = Math.max(row.maxMs, rounded);
      // Weekly career processing yields internally; exclude its wall time from this budget.
      if (name !== 'tier1Matches' && name !== 'careerWeekly') v17BatchCpuSinceYield += ms;
      const budget = Math.max(3, Math.min(16, Number(window.__CS2_BATCH_CPU_BUDGET_MS) || 10));
      if (name !== 'tier1Matches' && name !== 'careerWeekly' && v17BatchCpuSinceYield >= budget) {
        v17BatchCpuSinceYield = 0;
        perf.batchSlice = perf.batchSlice || { yields: 0, cpuBudgetMs: budget };
        perf.batchSlice.yields = (Number(perf.batchSlice.yields) || 0) + 1;
        await v17YieldToBrowser();
      }
    }
    return result;
  }

  // Batch-only resolver: a series is still simulated by the same instantMatch
  // function, but the browser gets a paint/input opportunity between matches.
  // This prevents a day with several Tier-1 matches from monopolising the main thread.
  async function v17PlayDueMatchesCooperative(){
    const t=currentTournament, b=t?.broadcast;
    if(!t || !b) return 0;
    const today=new Date(Number(v17Calendar().currentMs)||Date.now()).toDateString();
    let done=(b.finished||[]).filter(x=>new Date(Number(x.actualStartAt||x.time)||0).toDateString()===today).length;
    const live=(b.active||[]).length, wasRunning=!!b.running;
    if(wasRunning && typeof stopTournamentBroadcast==='function') stopTournamentBroadcast(false);
    let n=0, guard=0;
    try { window.v55RepairTournamentProgress?.(); } catch(e) {}
    while(!t.completed && guard++ < 16){
      let list=[];
      try { list=getBroadcastPlayableMatches(); } catch(e) { console.warn('[v17] cooperative match list failed',e); }
      if(!list.length){
        try { const fallback=typeof getNextPlayableMatch==='function'?getNextPlayableMatch():null; if(fallback?.match) list=[fallback]; } catch(e) {}
      }
      if(!list.length){
        try { window.v55RepairTournamentProgress?.(); } catch(e) {}
        try { list=getBroadcastPlayableMatches(); } catch(e) {}
        if(!list.length){
          try { const fallback=typeof getNextPlayableMatch==='function'?getNextPlayableMatch():null; if(fallback?.match) list=[fallback]; } catch(e) {}
        }
      }
      if(!list.length) break;
      const cap=typeof window.v18DayCap==='function' ? window.v18DayCap(list) : 6;
      if(n>=live && done+n>=cap) break;
      // v84: новый этап Pick'Em открылся внутри дня — не играем его матчи, пока игрок не сделал прогноз.
      try {
        const open = window.V33Pickem?.openUnfilled?.(), st = seasonState;
        if (open && !(st.v84PickemPrompted || {})[open.key]) { window.__v84PickemHalt = open; break; }
      } catch(e) {}
      const before=t.broadcast?.finished?.length || 0;
      try { instantMatch(list[0].match,list[0].callback); n++; }
      catch(e) { console.warn('[v17] cooperative skip match failed',e); break; }
      const after=t.broadcast?.finished?.length || 0;
      if(after===before && !t.completed && list[0]?.match && !list[0].match.winner && !list[0].match.w){
        // A resolver that did not advance state must not be retried forever.
        break;
      }
      if(n % 2 === 0){
        try { window.v55RepairTournamentProgress?.(); } catch(e) {}
      }
      await (window.CS2Yield ? window.CS2Yield.maybe(10) : Promise.resolve(false));
    }
    try { window.v55RepairTournamentProgress?.(); } catch(e) {}
    try { if(typeof renderTournament==='function') renderTournament(); } catch(e) {}
    if(wasRunning && !window.v57BatchCalendarSkip && !t.completed && typeof startTVBroadcastMode==='function') startTVBroadcastMode();
    return n;
  }
  function v17PersistCalendarJump(){
    const c=v17Calendar(); c.lastWallMs=Date.now();
    try{saveSeasonState();}catch(e){}
    try{if(typeof v15RenderCalendar==='function') v15RenderCalendar();}catch(e){}
    try{v17RefreshPickem();}catch(e){}
    try{v17RefreshSkipLabel();}catch(e){}
  }
  function v17ProcessParallelNow(){
    try{
      if(!v17Calendar().paused){
        if(window.CS2SimulationKernel?.afterClockJump) window.CS2SimulationKernel.afterClockJump('qualifier/calendar progression');
        else window.v21ProcessParallelNow?.({deferIO:false});
      }
    }catch(e){console.warn('[v17] qualifier tick',e);}
  }
  function v17AdvanceParallelDay(){
    const c=v17Calendar(); if(c.paused) return false;
    if(typeof v15AdvanceMinutes==='function') v15AdvanceMinutes(1440,'пропуск дня');
    else c.currentMs=(Number(c.currentMs)||Date.now())+V17_DAY_MS;
    if(c.paused) return false;
    v17ProcessParallelNow();
    v17PersistCalendarJump();
    return true;
  }
  function v17RebaseOverdueQualifiers(qs, now){
    const list=(qs||[]).filter(e=>e && e.status==='scheduled');
    if(!list.length || !list.some(e=>Number(e.startMs)<now)) return false;
    // Rebase only untouched qualifier brackets. This prevents a newly created
    // Open/Closed path from being simulated in one burst when the player opens
    // the next tournament late in the 42-day planning window.
    if(qs.some(e=>e.status==='live'||e.status==='completed'||(e.br?.matches||[]).some(m=>m.w))) return false;
    const at=new Date(now); at.setHours(12,0,0,0); if(at.getTime()<=now) at.setDate(at.getDate()+1);
    const openAt=at.getTime(), closedAt=openAt+9*V17_DAY_MS;
    list.forEach(ev=>{
      const isOpen=ev.qual?.stage==='open';
      ev.startMs=isOpen?openAt:closedAt;
      ev.endMs=ev.startMs+(isOpen?8:4)*V17_DAY_MS;
      ev.nextRoundAt=ev.startMs;
      ev.qual.rebasedAt=Number(now)||Date.now();
    });
    return true;
  }
  function v17HandleQualifierWindow(step, stepIndex){
    if(!step || step.type==='major' || String(step.format||'').toLowerCase()==='bounty') return false;
    const c=v17Calendar(), now=Number(c.currentMs)||Date.now(), start=Number(step.calendar?.startMs)||0;
    if(!start || !window.v21ProcessParallelNow) return false;
    try{ window.v45EnsureQuals?.(now); }catch(e){}
    let qs=(seasonState.parallelSchedule||[]).filter(e=>e?.qual&&Number(e.qual.step)===Number(stepIndex)&&Number(e.season)===Number(seasonState.currentSeason));
    if(v17RebaseOverdueQualifiers(qs,now)) { try{saveSeasonState();}catch(e){} }
    // If the player jumps from far before the qualifier window, stop at the
    // Open Qualifier date instead of jumping over the entire qualification path.
    if(!qs.length && now<start){
      c.currentMs=Math.max(now,start-18*V17_DAY_MS);
      c.lastAdvanceReason='переход к Open Qualifier';
      try{window.v45EnsureQuals?.(c.currentMs);}catch(e){}
      qs=(seasonState.parallelSchedule||[]).filter(e=>e?.qual&&Number(e.qual.step)===Number(stepIndex)&&Number(e.season)===Number(seasonState.currentSeason));
      v17RebaseOverdueQualifiers(qs,Number(c.currentMs)||now);
      v17ProcessParallelNow();
      v17PersistCalendarJump();
      return true;
    }
    const alreadyLive=qs.some(e=>e.status==='live');
    const dueScheduled=qs.some(e=>e.status==='scheduled' && Number(e.startMs)<=now);
    if(alreadyLive){ return v17AdvanceParallelDay(); }
    if(dueScheduled){
      // Open a qualifier at its scheduled date, but do not consume the first
      // competition day in the same click. Series wait for their own match slots.
      v17ProcessParallelNow();
      v17PersistCalendarJump();
      return true;
    }
    const next=qs.filter(e=>e.status==='scheduled' && Number(e.startMs)>now).sort((a,b)=>a.startMs-b.startMs)[0];
    if(next){
      c.currentMs=Math.max(now,Number(next.startMs));
      c.lastAdvanceReason=next.qual.stage==='open'?'переход к Open Qualifier':'переход к Closed Qualifier';
      v17ProcessParallelNow();
      v17PersistCalendarJump();
      return true;
    }
    // Any unfinished qualifier that is already due should advance by one day,
    // never by an infinite-time catch-up at the next Tier-1 tournament.
    if(qs.some(e=>e.status!=='completed')) return v17AdvanceParallelDay();
    return false;
  }

  function v17SmartSkip(){
    const c=v17Calendar();
    if(c.paused) return false;

    // During a running event: play every match scheduled before the end of the skipped day, then jump one day.
    // (Без этого v20 переносил просроченные матчи на «сейчас», и пропуск дня их только откладывал.)
    if(v17HasActiveTournament()){
      v17PlayDueMatches();
      // v84: остановка на открывшемся Pick'Em — день не перематывается, игрок успевает сделать прогноз
      const halt=window.__v84PickemHalt; window.__v84PickemHalt=null;
      if(halt){
        try{ seasonState.v84PickemPrompted=seasonState.v84PickemPrompted||{}; seasonState.v84PickemPrompted[halt.key]=Number(c.currentMs)||Date.now(); saveSeasonState(); }catch(e){}
        try{ window.v84ShowToast?.(`Открыт Pick'Em: ${halt.label}. Сделайте прогноз — следующий пропуск дня продолжит турнир.`); }catch(e){}
        try{ window.V29News?.add?.({ cat:'event', icon:'🎯', imp:6, title:`Открыт Pick'Em ${halt.major}: ${halt.label}`, lead:'Матчи этапа начнутся после вашего следующего пропуска дня.', body:[], tags:[] }); }catch(e){}
        if(typeof v15RenderCalendar==='function') v15RenderCalendar();
        v17RefreshPickem();
        return;
      }
      if(!v17HasActiveTournament()){
        c.lastWallMs=Date.now();
        try{ saveSeasonState(); }catch(e){}
        if(typeof v15RenderCalendar==='function') v15RenderCalendar();
        v17RefreshPickem();
        return;
      }
      if(typeof v15AdvanceMinutes==='function') v15AdvanceMinutes(1440,'пропуск дня');
      else c.currentMs += 1440*60000;
      v17RebaseQueueAfterSkip();
      c.lastWallMs=Date.now();
      try{ saveSeasonState(); }catch(e){}
      if(typeof v15RenderCalendar==='function') v15RenderCalendar();
      v17RefreshPickem();
      return;
    }

    // Between events, qualifiers are real calendar events. Visit their Open and
    // Closed windows before the Tier-1 tournament rather than resolving them all
    // retroactively when the main event is created.
    const step=v17GetNextTournamentStep();
    const stepIndex=Number(seasonState.tournamentIndex)||1;
    if(step && v17HandleQualifierWindow(step,stepIndex)) return;
    if(!step){
      if(typeof v15AdvanceMinutes==='function') v15AdvanceMinutes(1440,'пропуск дня');
      else c.currentMs += 1440*60000;
      v17RebaseQueueAfterSkip();
      c.lastWallMs=Date.now();
      try{ saveSeasonState(); }catch(e){}
      if(typeof v15RenderCalendar==='function') v15RenderCalendar();
      v17RefreshPickem();
      return;
    }
    const start=Number(step.calendar?.startMs)||0;
    const isMajor = step.type === 'major';
    const pickemDay = isMajor && start > 0 ? start - (window.CS2_PICKEM_LEAD_DAYS||4) * 86400000 : 0;
    // Don't jump over the dedicated Pick'Em Day. First stop at roster lock,
    // refresh/snapshot the finalized roster, and only the next skip launches Major.
    if (pickemDay > Number(c.currentMs || 0)) {
      c.currentMs = pickemDay;
      c.lastAdvanceReason = "день фиксации состава и Pick'Em";
      try { window.v45LockMajorRoster?.(Number(seasonState.tournamentIndex) || 1, c.currentMs); } catch(e) {}
      try { window.V33Pickem?.sync?.(); } catch(e) {}
      c.lastWallMs=Date.now();
      try{ saveSeasonState(); }catch(e){}
      if(typeof v15RenderCalendar==='function') v15RenderCalendar();
      v17RefreshPickem();
      return;
    }
    if(start>0 && c.currentMs<start){
      c.currentMs=start;
      c.lastAdvanceReason='переход к началу следующего турнира';
    }

    // If the scheduled start was already missed while the user skipped manually,
    // treat the event as due now instead of requiring another manual click.
    v17StartScheduledTournament(false);

    c.lastWallMs=Date.now();
    try{ saveSeasonState(); }catch(e){}
    if(typeof v15RenderCalendar==='function') v15RenderCalendar();
    v17RefreshPickem();
  }

  // Multi-day fast-forward must advance one virtual day at a time. The old
  // between-events shortcut jumped straight to Tier-1 start and retroactively
  // completed all missed qualifiers in one burst.
  async function v17AdvanceSingleCalendarDayForBatch(){
    const c=v17Calendar();
    if(c.paused) return false;
    const previousDayMs=Number(c.currentMs)||0;
    let played=0;
    // v84: a scheduled Tier-1 event must open during a multi-day skip as well.
    // Before v84 it was only opened after the whole skip finished, so a 30-day
    // skip advanced exactly one tournament and the season drifted into next year.
    if(!v17HasActiveTournament()){
      try{ await v17RunBatchStage('tier1Start',()=>v17AutoStartDueTournament()); }catch(e){ console.warn('[v84] batch tournament start',e); }
    }
    if(v17HasActiveTournament()) played=await v17RunBatchStage('tier1Matches',v17PlayDueMatchesCooperative)||0;
    if(typeof v15AdvanceMinutes==='function') v15AdvanceMinutes(1440,'пропуск дня',{deferRender:true});
    else c.currentMs=(Number(c.currentMs)||Date.now())+1440*60000;
    c.lastWallMs=Date.now();
    if(!v17HasActiveTournament()){ try{ v17AutoStartDueTournament(); }catch(e){} }
    window.v57LastBatchDayMatches=Number(played)||0;
    const idx=Number(seasonState.tournamentIndex)||1;
    let rosterLocked=false;
    try{ rosterLocked=!!window.v45LockMajorRoster?.(idx,Number(c.currentMs)||0); }catch(e){}
    const isMajor=!!(typeof currentTournament!=='undefined' && currentTournament?.isMajor && !currentTournament?.completed);
    if(isMajor && (played>0 || rosterLocked || !currentTournament?.v57PickemInitialized)){
      await v17RunBatchStage('majorPickem',()=>{
        try{ window.V33Pickem?.sync?.(); }catch(e){}
        try{ window.V70PickemPublications?.sync?.(); }catch(e){}
        if(currentTournament) currentTournament.v57PickemInitialized=true;
      });
    } else if(rosterLocked){
      await v17RunBatchStage('majorRosterLock',()=>window.V70PickemPublications?.sync?.());
    }
    // Weekly subsystems remain event-driven: each receives the new virtual date,
    // but expensive weekly work runs only when its own stored week boundary is reached.
    await v17RunBatchStage('careerWeekly',()=>typeof window.V31?.syncClockCooperative==='function' ? window.V31.syncClockCooperative() : window.V31?.syncClock?.());
    await v17RunBatchStage('rosterWeekly',()=>window.V34Roster?.syncClock?.());
    await v17RunBatchStage('transferWeekly',()=>window.V30MarketSyncClock?.());
    await v17RunBatchStage('awardsDaily',()=>window.V33Awards?.tickCalendarDay?.());
    await v17RunBatchStage('showsDaily',()=>window.V33Shows?.tick?.());
    await v17RunBatchStage('showmatchDaily',()=>window.V35Show?.tick?.());
    // Rank snapshots are weekly. Run only when this day crosses a UTC week
    // boundary; the previous modulo check accidentally ran on six days of seven.
    if(Math.floor(previousDayMs/V17_WEEK_MS)!==Math.floor(Number(c.currentMs)/V17_WEEK_MS)){
      await v17RunBatchStage('rankSnapshot',()=>window.V30RankSnapshotTick?.());
    }
    if(played>0) await v17RunBatchStage('predictions',()=>window.v29SyncPredictions?.());
    await v17RunBatchStage('tournamentNews',()=>window.v29CheckTournamentStart?.());
    if(isMajor && (played>0 || !currentTournament?.v35InvNews)){
      await v17RunBatchStage('majorOdds',()=>window.V35Major?.tick?.());
    }
    if(!window.v57BatchCalendarSkip) try{ v17RefreshSkipLabel(); }catch(e){}
    return !c.paused;
  }
  window.v17AdvanceSingleCalendarDayForBatch=v17AdvanceSingleCalendarDayForBatch;

  window.skipGameCalendarDay=v17SmartSkip;

  function v17RefreshSkipLabel(){
    const btn=document.getElementById('calendar-skip-btn');
    if(!btn) return;
    if(v17HasActiveTournament()){
      btn.textContent='⏭ День';
      btn.title='Пропустить 1 игровой день турнира';
      return;
    }
    const step=v17GetNextTournamentStep();
    if(step && step.type!=='major' && String(step.format||'').toLowerCase()!=='bounty'){
      const idx=Number(seasonState.tournamentIndex)||1, now=Number(v17Calendar().currentMs)||Date.now();
      const qs=(seasonState.parallelSchedule||[]).filter(e=>e?.qual&&Number(e.qual.step)===idx&&Number(e.season)===Number(seasonState.currentSeason));
      if(qs.some(e=>e.status==='live')){ btn.textContent='⏭ День квалификации'; btn.title='Пропустить один игровой день региональных квалификаций'; return; }
      const next=qs.filter(e=>e.status==='scheduled'&&Number(e.startMs)>now).sort((a,b)=>a.startMs-b.startMs)[0];
      if(next){ btn.textContent='⏭ К квалификации'; btn.title='Перейти к ближайшей Open/Closed Qualifier'; return; }
    }
    if(step?.calendar?.startMs){
      const c=v17Calendar();
      if(Number(step.calendar.startMs)>Number(c.currentMs)){
        const pickemAt = step.type === 'major' ? Number(step.calendar.startMs) - (window.CS2_PICKEM_LEAD_DAYS||4) * 86400000 : 0;
        const isPickemDayNext = pickemAt > Number(c.currentMs) && pickemAt <= Number(c.currentMs) + 86400000;
        btn.textContent = isPickemDayNext ? '⏭ Pick’Em Day' : '⏭ К турниру';
        btn.title = isPickemDayNext ? 'Перейти к дню фиксации состава и прогнозов Major' : 'Пропустить время до начала следующего турнира';
      }else{
        btn.textContent='▶ Начать турнир';
        btn.title='Начать запланированный турнир, который уже наступил';
      }
    }else{
      btn.textContent='⏭ День';
      btn.title='Пропустить 1 игровой день';
    }
  }

  // Automatically open a scheduled tournament when the virtual clock reaches it.
  function v17AutoStartDueTournament(){
    if(v17Calendar().paused) return false;
    if(v17HasActiveTournament()) return false;
    const step=v17GetNextTournamentStep();
    if(!step?.calendar?.startMs) return false;
    const c=v17Calendar();
    if(Number(c.currentMs) < Number(step.calendar.startMs)) return false;
    return v17StartScheduledTournament();
  }

  const priorAdvance = window.v15AdvanceMinutes;
  if(typeof priorAdvance==='function' && !priorAdvance.__v17Wrapped){
    const wrapped=function(mins,reason=''){
      const before = Number(v17Calendar().currentMs) || 0;
      const r=priorAdvance.apply(this,arguments);
      const after = Number(v17Calendar().currentMs) || 0;
      try{ v17AutoStartDueTournament(); }catch(e){ console.warn('[v17] auto-start after advance failed',e); }
      // Manual day skips and other calendar advances must refresh previews and
      // saved predictions too, not only the dedicated Skip button handler.
      if (!window.v57BatchCalendarSkip && before && after && Math.floor(before / 86400000) !== Math.floor(after / 86400000)) {
        try {
          const b = currentTournament?.broadcast;
          if (b && typeof window.v18FitDays === 'function') window.v18FitDays(b);
          v17RefreshPickem();
        } catch(e) { console.warn('[v17] day-change refresh failed', e); }
      }
      if(!window.v57BatchCalendarSkip) try{ v17RefreshSkipLabel(); }catch(e){}
      return r;
    };
    wrapped.__v17Wrapped=true;
    window.v15AdvanceMinutes=wrapped;
  }

  // Hook the calendar render so the button always reflects the current state.
  const priorRender=window.v15RenderCalendar;
  if(typeof priorRender==='function' && !priorRender.__v17Wrapped){
    const wrapped=function(){
      const r=priorRender.apply(this,arguments);
      try{ v17RefreshSkipLabel(); }catch(e){}
      return r;
    };
    wrapped.__v17Wrapped=true;
    window.v15RenderCalendar=wrapped;
  }

  // Auto-start and skip-label maintenance run from the shared v63 dispatcher.
  window.CS2SimulationTasks = window.CS2SimulationTasks || {};
  window.CS2SimulationTasks.v17Calendar = () => {
    try{
      if(!v17HasActiveTournament()) v17AutoStartDueTournament();
      v17RefreshSkipLabel();
    }catch(e){}
  };

  // Initialize once after the page has restored the state.
  setTimeout(()=>{
    try{ v17AutoStartDueTournament(); }catch(e){}
    try{ v17RefreshSkipLabel(); }catch(e){}
  },500);
})();
