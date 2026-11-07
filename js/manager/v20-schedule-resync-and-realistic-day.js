
(() => {
  'use strict';

  // v20: 40 real minutes = 1 in-game day at 1x.
  // Calendar is the single source of truth for game time. Match timers follow the
  // same speed multiplier, while schedule times are continuously rebased when
  // a previous match runs late.
  const V20_SLOT_STEP_MIN = 10;

  function v20Cal(){
    try { return typeof v15EnsureCalendar === 'function' ? v15EnsureCalendar() : (seasonState.calendar || (seasonState.calendar={}), seasonState.calendar); }
    catch(e){ return seasonState.calendar || (seasonState.calendar={}); }
  }
  function v20Now(){ return Number(v20Cal().currentMs) || Date.now(); }
  function v20Ceil10(ms){
    const d=new Date(Number(ms)||v20Now());
    d.setSeconds(0,0);
    const m=d.getMinutes();
    const add=(V20_SLOT_STEP_MIN-(m%V20_SLOT_STEP_MIN))%V20_SLOT_STEP_MIN;
    if(add) d.setMinutes(m+add,0,0);
    return d.getTime();
  }
  function v20Fmt(ms){
    const d=new Date(Number(ms)||v20Now());
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function v20ResyncFutureSchedule(reason='') {
    const t=typeof currentTournament!=='undefined' ? currentTournament : null;
    const b=t?.broadcast;
    if(!t || t.completed || !b || !Array.isArray(b.queue) || !b.queue.length) return false;
    // Сдвигаем, только пока прошлая серия ещё идёт. Если эфир свободен, наступивший матч должен стартовать сейчас,
    // а не уезжать на следующие «круглые» 10 минут (на x5 он так уезжал раз за разом и не начинался).
    if(!Array.isArray(b.active) || !b.active.length) return false;
    const c=v20Cal();
    const now=v20Now();
    const ordered=b.queue.slice().sort((a,b2)=>Number(a.time||0)-Number(b2.time||0));
    const first=ordered[0];
    if(!first) return false;
    const oldFirst=Number(first.time)||now;
    // Only move the future schedule when the calendar has actually reached/passed
    // its next slot. Never pull a future match earlier.
    if(oldFirst > now) return false;
    const target=v20Ceil10(now);
    const delta=target-oldFirst;
    if(delta<0) return false;

    ordered.forEach(item=>{
      const old=Number(item.time)||now;
      item.time=old+delta;
      item.v18PlannedTime=item.time;
      item.gameScheduledAt=item.time;
      item.v19ShiftedByMs=(Number(item.v19ShiftedByMs)||0)+delta;
      item.delayedByMs=Math.max(0, item.time-(Number(item.originalPlannedTime)||item.time));
    });
    b.v18ScheduleCursor=(Number(b.v18ScheduleCursor)||0)+delta;
    b.scheduleCursorGame=(Number(b.scheduleCursorGame)||0)+delta;
    if(t.calendar){
      t.calendar.lastScheduleResyncAt=now;
      t.calendar.lastScheduleResyncReason=reason||'calendar';
      t.calendar.nextMatchAt=Number(ordered[0].time)||now;
    }
    try{ if(typeof renderBroadcastPanel==='function') renderBroadcastPanel(); }catch(e){}
    try{ if(typeof v15RenderCalendar==='function') v15RenderCalendar(); }catch(e){}
    return true;
  }

  function v20NormalizeAllQueueTimes(){
    const b=currentTournament?.broadcast;
    if(!b?.queue?.length) return;
    const seen=new Map();
    b.queue.forEach(item=>{
      const key=Number.isFinite(item.batchId)?item.batchId:item.id;
      const raw=Number(item.time||0);
      if(!raw) return;
      if(seen.has(key)) item.time=seen.get(key);
      else { item.time=v20Ceil10(raw); seen.set(key,item.time); }
      item.v18PlannedTime=item.time;
      item.gameScheduledAt=item.time;
      if(!Number.isFinite(Number(item.originalPlannedTime))) item.originalPlannedTime=item.time;
    });
  }

  // Replace the v19 launch-time schedule updater with a robust continuous resync.
  const priorSchedule=window.scheduleNextBroadcastBatch;
  if(typeof priorSchedule==='function' && !priorSchedule.__v20Wrapped){
    const wrapped=function(...args){
      try{ v20NormalizeAllQueueTimes(); v20ResyncFutureSchedule('before launch'); }catch(e){}
      return priorSchedule.apply(this,args);
    };
    wrapped.__v20Wrapped=true;
    window.scheduleNextBroadcastBatch=wrapped;
    try{ scheduleNextBroadcastBatch=wrapped; }catch(e){}
  }

  // Important: queue resync is a task of the shared scheduler, not a second interval owner.
  window.CS2SimulationTasks = window.CS2SimulationTasks || {};
  window.CS2SimulationTasks.v20Resync = () => {
    try{
      if(!currentTournament || currentTournament.completed) return;
      const b=currentTournament.broadcast;
      if(!b || !b.running || b.paused || !Array.isArray(b.queue) || !b.queue.length || !Array.isArray(b.active) || !b.active.length) return;
      const now=v20Now();
      // O(n) minimum scan only. Queue normalisation/sorting is needed only after
      // a previous live series has actually overrun the next scheduled slot.
      let first=null, firstAt=Infinity;
      for(let i=0;i<b.queue.length;i++){
        const item=b.queue[i], at=Number(item?.time)||0;
        if(at<firstAt){ firstAt=at; first=item; }
      }
      if(!first || firstAt>now) return;
      v20NormalizeAllQueueTimes();
      const shifted=v20ResyncFutureSchedule('clock passed next slot');
      if(shifted && typeof window.v18FitDays==='function') window.v18FitDays(b);
      if(!shifted && currentTournament.calendar) currentTournament.calendar.nextMatchAt=Number(first.time)||now;
    }catch(e){ console.warn('[v20] schedule resync',e); }
  };

  // When a series ends, explicitly rebase the future queue from the actual game time.
  const priorFinish=window.finishBroadcastMatch;
  if(typeof priorFinish==='function' && !priorFinish.__v20Wrapped){
    const wrapped=function(item,winner,loser){
      try{
        const b=currentTournament?.broadcast;
        if(b?.queue?.length){
          const now=v20Now();
          const first=b.queue.slice().sort((a,b2)=>Number(a.time||0)-Number(b2.time||0))[0];
          if(first && Number(first.time)<=now){
            const target=v20Ceil10(now);
            const delta=target-Number(first.time);
            if(delta>=0){
              b.queue.forEach(q=>{
                q.time=Number(q.time||now)+delta;
                q.v18PlannedTime=q.time;
                q.gameScheduledAt=q.time;
                q.v19ShiftedByMs=(Number(q.v19ShiftedByMs)||0)+delta;
                q.delayedByMs=Math.max(0, q.time-(Number(q.originalPlannedTime)||q.time));
              });
            }
          }
        }
      }catch(e){ console.warn('[v20] finish resync',e); }
      const result=priorFinish.apply(this,arguments);
      try{ v20NormalizeAllQueueTimes(); }catch(e){}
      try{ if(typeof window.v18FitDays==='function') window.v18FitDays(currentTournament?.broadcast); }catch(e){}
      try{ renderBroadcastPanel(); }catch(e){}
      return result;
    };
    wrapped.__v20Wrapped=true;
    window.finishBroadcastMatch=wrapped;
    try{ finishBroadcastMatch=wrapped; }catch(e){}
  }

  // Store original planned time once so delay labels remain meaningful after repeated shifts.
  const priorBuild=window.buildBroadcastQueue;
  if(typeof priorBuild==='function' && !priorBuild.__v20Wrapped){
    const wrapped=function(...args){
      const result=priorBuild.apply(this,args);
      try{
        const b=currentTournament?.broadcast;
        b?.queue?.forEach(q=>{
          if(!Number.isFinite(Number(q.originalPlannedTime))) q.originalPlannedTime=Number(q.time)||v20Now();
        });
        v20NormalizeAllQueueTimes();
      }catch(e){}
      return result;
    };
    wrapped.__v20Wrapped=true;
    window.buildBroadcastQueue=wrapped;
    try{ buildBroadcastQueue=wrapped; }catch(e){}
  }

  // Playback-speed sync is owned by v19; this layer owns only live-queue resync.

  // Update the calendar panel copy to match the new longer day.
  try{
    const el=document.getElementById('calendar-next-event');
    if(el && /Слоты:/.test(el.textContent||'')) el.dataset.v20=true;
  }catch(e){}
})();
