// v82: a long skip must not rebuild historical player stats once per team/week.
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const assert = (v,m) => { if(!v) throw new Error(m); };
const root=path.resolve(__dirname,'..'); const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const career=read('js/career/career-core.js'), calendar=read('js/calendar/smart-skip.js'), batch=read('js/calendar/skip-days.js'), html=read('index.html'), site=read('js/portal/hltv-site.js');
const aiStart=career.indexOf('function aiTrainingPlan('), helpersStart=career.indexOf('const v31TrainingDiagnostics =');
assert(helpersStart>=0 && aiStart>helpersStart,'training index helper section exists');
assert(/function getTrainingMatches\(\)[\s\S]*?window\.HS\.matchIndex\(\)/.test(career),'training should use lightweight match index rather than full player stats');
assert(/const st = trainingMapStats \? \(trainingMapStats\[t\.name\] \|\| \{\}\)/.test(career),'AI plan must use the provided training index, including teams with no history');
assert(/async function weekTrainingCooperative\(\)/.test(career) && /await buildTrainingMapStatsCooperative\(\)/.test(career),'weekly training must yield while building the index and processing teams');
assert(/syncClockCooperative: syncCareerClockCooperative/.test(career) && /syncClockCooperative/.test(calendar),'day skip must await cooperative weekly career catch-up');
assert(/__CS2_BATCH_CPU_BUDGET_MS = 10/.test(batch) && /__CS2_FAST_FORWARD_IDLE_MS = 0/.test(batch),'v84: skips use 10 ms work slices without artificial idle gaps');
assert(/window\.__CS2_BATCH_TRAINING_MAP_STATS = null/.test(batch) && /delete window\.__CS2_BATCH_TRAINING_MAP_STATS/.test(batch),'batch historical map index is scoped to one skip');
assert(/window\.CS2SimulationPerf\.lastBatch/.test(batch) && /training: window\.V31\?\.trainingDiagnostics/.test(batch),'lastBatch exposes training diagnostics');
assert(html.includes('js/calendar/smart-skip.js') && html.includes('js/career/career-core.js') && html.includes('js/calendar/skip-days.js') && html.includes('js/portal/hltv-site.js'),'changed scripts bypass browser cache');
assert(site.includes('CS2 Manager <i class="pt-ver">v86</i>'),'visible version is v82');

const matches=[
 {a:'Alpha',b:'Beta',w:'Alpha',kind:'regular',mp:[['Mirage',13,8],['Nuke',10,13]]},
 {a:'Beta',b:'Gamma',w:'Beta',kind:'major',mp:[['Mirage',13,5]]},
 {a:'Alpha',b:'Show',w:'Alpha',kind:'show',mp:[['Mirage',13,0]]},
 {a:'Alpha',b:'WO',w:'Alpha',kind:'regular',wo:true,mp:[['Nuke',13,0]]},
 {a:'Gamma',b:'Beta',w:'Beta',kind:'regular',mp:[['Ancient',0,13]]}
];
const helperCode=career.slice(helpersStart,aiStart);
const ctx={window:{v57BatchCalendarSkip:true,HS:{matchIndex:()=>matches},performance:{now:(()=>{let x=0;return()=>++x;})()}},season:()=>1,Object,Number,Math,String,Array,Date,document:{visibilityState:'hidden'},setTimeout};
vm.runInNewContext(`${helperCode}\nthis.build=buildTrainingMapStats;this.diag=v31TrainingDiagnostics;`,ctx);
const first=ctx.build(), second=ctx.build();
assert(first===second && ctx.diag.indexBuilds===1 && ctx.diag.cacheHits===1,'same 90-day batch reuses the prepared map index');
assert(first.Alpha.Mirage.n===1 && first.Alpha.Mirage.w===1,'Alpha Mirage result is counted');
assert(first.Beta.Mirage.n===2 && first.Beta.Mirage.w===1,'Beta map result aggregates wins and losses');
assert(first.Gamma.Ancient.n===1 && first.Gamma.Ancient.w===0,'Gamma Ancient loss is counted');
console.log('PASS v82: cached historic map index is reused throughout the fast-forward batch');
console.log('PASS v82: weekly career training yields cooperatively and exposes diagnostics');

(async () => {
  const bigMatches = Array.from({ length: 751 }, (_, i) => ({
    a: `Team ${i % 10}`, b: `Opponent ${i % 10}`, w: `Team ${i % 10}`,
    kind: 'regular', mp: [['Mirage', 13, 7]]
  }));
  let frameYields = 0;
  const bigCtx = {
    window: {
      v57BatchCalendarSkip: true,
      HS: { matchIndex: () => bigMatches },
      performance: { now: (() => { let x = 0; return () => ++x; })() },
      requestAnimationFrame(fn) { frameYields++; fn(); }
    },
    season: () => 1, Object, Number, Math, String, Array, Date,
    document: { visibilityState: 'visible' }, setTimeout(fn) { frameYields++; fn(); }
  };
  vm.runInNewContext(`${helperCode}\nthis.buildCooperative=buildTrainingMapStatsCooperative;this.diag=v31TrainingDiagnostics;`, bigCtx);
  const index = await bigCtx.buildCooperative();
  assert(frameYields >= 2 && bigCtx.diag.cooperativeYields >= 2, 'large training-history scans must yield to browser frames every 300 matches');
  assert(index['Team 0'].Mirage.n > 0, 'cooperative training index must preserve map results');
  console.log('PASS v82: large historical training-index scans yield in chunks instead of blocking one frame');
})().catch(err => { console.error(err); process.exitCode = 1; });
