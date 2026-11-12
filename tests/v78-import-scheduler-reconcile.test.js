const fs=require('fs');
const path=require('path');
const assert=(v,m)=>{if(!v)throw new Error(m)};
const root=path.resolve(__dirname,'..');
const v21=fs.readFileSync(path.join(root,'js/manager/v21-parallel-tournaments-academies-layer.js'),'utf8');
const v63=fs.readFileSync(path.join(root,'js/manager/v63-simulation-kernel.js'),'utf8');
const core=fs.readFileSync(path.join(root,'js/manager/auto_script_1.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(v21.includes('window.v21InvalidateParallelWake = v21InvalidateParallelWake'),'parallel wake index must be explicitly invalidatable');
assert(v21.includes('window.CS2ParallelSchedulerDiagnostics=') && v21.includes('overdueMatches:v21CountOverdueMatches(now)'),'scheduler should expose an actionable backlog diagnostic for legacy-save debugging');
assert(v21.includes('window.v21ReconcileImportedSave = function(reason=\'save import\')'),'import recovery must reconcile imported schedules');
assert(v21.includes('const BATCH=2') && v21.includes('setTimeout(resolve,0)'),'import catch-up must yield after small event batches');
assert(v21.includes('window.__CS2_IMPORT_RECONCILING && !opts.importBatch'),'regular scheduler must not overlap the import catch-up');
assert(v21.includes('if(eventIds && !eventIds.has(String(ev?.id))) continue'),'catch-up must process only the current batch of event ids');
assert(v21.includes('for(const match of matches)') && v21.includes('eventWake=Math.min(eventWake,window.CS2ParallelMatchTiming.nextWake(match,now))'),'legacy unsorted brackets must wake on their earliest unresolved match, not the first array item');
assert(v63.includes('v20Resync: 1000') && v63.includes('v18Broadcast: 1000') && v63.includes('}, 500);'),'maintenance polling must be less aggressive');
const autosave=fs.readFileSync(path.join(root,'js/manager/v56-autosave.js'),'utf8');
assert(autosave.includes('window.__CS2_PARALLEL_CATCHUP') && autosave.includes('bulkSimulationOwnsThread()'), 'full autosave snapshots must pause while overdue matches are batch-resolving');
assert(v63.includes('api.reconcileImportedSave=reconcileImportedSave'),'kernel must expose import reconciliation');
assert(core.includes('reconcile(\'save import\')'),'save importer must trigger reconciliation after state replacement');
assert(html.includes('auto_script_1.js?v=113') && html.includes('v21-parallel-tournaments-academies-layer.js?v=113') && html.includes('v63-simulation-kernel.js?v=113') && html.includes('v56-autosave.js?v=113') && html.includes('v38-vrs-emdb-awards.js?v=113'),'updated scripts must bypass stale browser cache');
console.log('PASS v78: importing save invalidates stale parallel wake index');
console.log('PASS v78: overdue parallel matches catch up in small yielding batches');
console.log('PASS v78: ordinary scheduler timers cannot overlap save-import reconciliation');
console.log('PASS v78: maintenance polling frequency reduced and cache bust updated');

// Exercise the timestamp-repair and stale completed-bracket wake guards directly.
{
  const vm = require('vm');
  const v21 = fs.readFileSync(path.join(root,'js/manager/v21-parallel-tournaments-academies-layer.js'),'utf8');
  const repairStart=v21.indexOf('  function v22RepairMatchTimes(ev){');
  const repairEnd=v21.indexOf('\n  function v22Migrate(ev){',repairStart);
  assert(repairStart>=0 && repairEnd>repairStart,'timestamp repair function must remain isolated');
  const ctx={V22_QUAL_SLOTS_PER_DAY:1,V22_PER_DAY:3,V21_DAY:86400000,V22_SLOT_MIN:180,Number,Math,Map,Array};
  vm.runInNewContext(v21.slice(repairStart,repairEnd)+'\nthis.repair=v22RepairMatchTimes;',ctx);
  const valid={startMs:1000,br:{matches:[{wave:0,at:2000},{wave:1,at:3000}]}};
  assert(ctx.repair(valid)===false,'valid legacy match times should take the constant-work fast path');
  const broken={startMs:1000,br:{matches:[{wave:0,at:0},{wave:0,at:0},{wave:1,at:0}]}};
  assert(ctx.repair(broken)===true && broken.br.matches.every(m=>Number(m.at)>0),'missing legacy match slots should be repaired');

  const advanceStart=v21.indexOf('  function v22Advance(ev,now,fastForward=false,maxMatches=Infinity){');
  const advanceEnd=v21.indexOf('\n  let v22OpenId',advanceStart);
  assert(advanceStart>=0 && advanceEnd>advanceStart,'parallel advance function must remain isolated');
  const aCtx={V22_RESOLVE_MIN:150,v22Idx:()=>({}),v22Fill:()=>{},v22SwissPair:()=>{},v22Finish:()=>{throw new Error('must not re-finish an archived winner')},teams:[],v21ApplyBgMatch:()=>{}};
  vm.runInNewContext(v21.slice(advanceStart,advanceEnd)+'\nthis.advance=v22Advance;',aCtx);
  const archived={status:'live',winner:'Legacy Winner',completedAt:5,br:{matches:[{w:'Legacy Winner',l:'Other'}],swiss:false}};
  assert(aCtx.advance(archived,10)===true && archived.status==='completed','legacy winner+live status must transition to completed once, not remain due on every pulse');

  // Catch-up must never simulate an unbounded number of overdue matches in one UI task.
  let applied=0;
  const teams=[{name:'A'},{name:'B'}];
  const budgetCtx={
    V22_RESOLVE_MIN:150, v22Idx:()=>({}), v22Fill:()=>{}, v22SwissPair:()=>{},
    v22Finish:()=>{}, teams, v21ApplyBgMatch:()=>{applied++;},
    v22Series:(a,b)=>({winner:a.name,loser:b.name,score:'2-0',maps:[]}),
    Number, Math, Array, Date
  };
  vm.runInNewContext(v21.slice(advanceStart,advanceEnd)+'\nthis.advance=v22Advance;',budgetCtx);
  const queued={status:'live',results:[],standings:[],br:{matches:Array.from({length:5},(_,i)=>({r:0,wave:0,at:0,t1:'A',t2:'B'})),swiss:false}};
  budgetCtx.advance(queued,999999999,true,2);
  assert(applied===2 && queued.br.matches.filter(m=>m.w).length===2,'a scheduler pulse must process no more than its explicit match budget');
  assert(queued.__v21AdvanceProcessed===2,'bounded advance must report its work count to the shared dispatcher');
  const outOfOrder={status:'live',results:[],standings:[],br:{matches:[{r:0,wave:1,at:999999999999,t1:'A',t2:'B'},{r:0,wave:0,at:0,t1:'A',t2:'B'}],swiss:false}};
  const beforeApplied=applied;
  budgetCtx.advance(outOfOrder,999999999,true,4);
  assert(applied===beforeApplied+1 && !!outOfOrder.br.matches[1].w,'an overdue match later in an unsorted legacy bracket must not be blocked by a future first slot');
}
console.log('PASS v78: valid bracket timestamps use the fast path and stale completed matches no longer retrigger the scheduler');
console.log('PASS v78: overdue bracket catch-up obeys a per-pulse match budget');
console.log('PASS v79: full archive saves and auto-snapshots are deferred while overdue queues are drained');
