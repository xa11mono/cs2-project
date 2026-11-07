// v49 regression tests: stale planned-time aliases, consistent regional pools,
// stage labels for non-global top-8 teams, and near-cutoff invitation probabilities.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const v17 = read('js/manager/v17-smart-calendar-skip.js');
const v18 = read('js/manager/v18-calendar-match-sync.js');
const v30 = read('js/manager/v30-portal-events.js');
const v35 = read('js/manager/v35-major-path.js');
const v40 = read('js/manager/v40-realism.js');
const v42 = read('js/manager/v42-calendar-schedule-fix.js');
const v21 = read('js/manager/v21-parallel-tournaments-academies-layer.js');

assert(/q\.v18PlannedTime\s*=\s*at/.test(v17) && /q\.plannedTime\s*=\s*at/.test(v17) && /q\.gameScheduledAt\s*=\s*at/.test(v17), 'day skip must synchronize every planned-time alias');
assert(/q\.actualStartAt\s*=\s*0/.test(v17) && /q\.v18ShiftedByMs\s*=\s*0/.test(v17), 'day skip must clear stale launch/shift metadata');
assert(/replanNewQueueItems\(b, pending, true\)/.test(v42) && /item\.plannedTime = at/.test(v42), 'replan must write canonical slot to old and new UI aliases');
assert(/Number\(it\?\.time \|\| it\?\.v18PlannedTime \|\| it\?\.gameScheduledAt\)/.test(v30), 'calendar must read the canonical queue time first');
assert(!/hasDelayFlag/.test(v30) && /delayedByMs >= 5 \* 60000/.test(v30), 'boolean legacy flags alone must not label a skipped match delayed');
assert(/CS2Realism\?\.regionOfTeam\?\.\(t\)/.test(v21), 'qualifier seeding must use the same region classifier as Major invitations');
assert(/return buildPools\(\(all32 \|\| \[\]\)\.filter\(t => t && !t\.isAcademy\)\)/.test(v40), 'Major stage pools must be rebuilt from the exact roster, not a stale global cache');
assert(/normalizeRegion\(t\.region\)/.test(v40) && /regCache\.get\(n\)/.test(v40), 'explicit regional identity and roster-aware cache must be used');
assert(/const RUNS = 5000/.test(v35) && /Math\.max\(12, Math\.min\(28/.test(v35), 'near-cutoff invitation forecasts must include realistic point volatility');
assert(/v < 0\.005 \? '<1%'/.test(v35) && /99\.9%\+/.test(v35), 'Monte Carlo estimates must not be presented as exact 0%/100%');
assert(/Статус квоты сейчас/.test(v35) && /До региональной квоты/.test(v35), 'Major Path must explain actual regional standing and distance to cutoff');
assert(/8 приглашений по квотам/.test(v35) && !/места 1–8 рейтинга/.test(v35), 'Stage labels must not imply global rank ranges');

// Execute the v40 allocator and make sure its pools are stable and region-consistent.
const poolTeams = [];
for (let i=0;i<19;i++) poolTeams.push({name:`EU${i+1}`,pts:1000-i*10,region:'EU',players:[]});
for (let i=0;i<9;i++) poolTeams.push({name:`AM${i+1}`,pts:1300-i*10,region:'AM',players:[]});
for (let i=0;i<5;i++) poolTeams.push({name:`AS${i+1}`,pts:1200-i*10,region:'AS',players:[]});
// Explicit team region must win even when the current roster is internationally mixed.
poolTeams[0].players = [{country:'BR'},{country:'US'},{country:'DE'},{country:'FR'},{country:'PL'}];
const apiWindow = { CS2_REAL:{newTeams:[]}, CS2_EMDB_2026:{players:{}}, setTimeout:()=>{} };
const apiCtx = { window:apiWindow, teams:poolTeams, document:{}, console, setTimeout:()=>{} };
vm.runInNewContext(v40, apiCtx, {filename:'v40-realism.js'});
const api = apiWindow.CS2Realism;
assert(api.regionOfTeam(poolTeams[0]) === 'EU', 'explicit team region must override mixed player nationalities');
const before = api.majorPools(poolTeams);
assert(before.stage3.length===8 && before.stage2.length===8 && before.stage1.length===16, 'major pools must have 8/8/16 slots');
const priorStage3 = before.stage3.map(t=>t.name).join('|');
// Mutating points must cause a fresh allocation rather than returning lastPools.
poolTeams[18].pts = 1500;
const after = api.majorPools(poolTeams);
assert(after.stage3.map(t=>t.name).join('|') !== priorStage3, 'majorPools must not leak the previous global lastPools cache');

// Test an EU #18/#19 pair that is only three points apart while 14 AM/AS teams
// occupy better world ranks. The local cutoff should remain probabilistic.
const simTeams = [];
for (let i=0;i<17;i++) simTeams.push({name:`EU-${i+1}`,pts:900-i*3,region:'EU',history:[],players:[]});
simTeams.push({name:'EU-18',pts:800,region:'EU',history:[],players:[]});
simTeams.push({name:'EU-19',pts:797,region:'EU',history:[],players:[]});
for (let i=0;i<9;i++) simTeams.push({name:`AM-${i+1}`,pts:1100-i*5,region:'AM',history:[],players:[]});
for (let i=0;i<5;i++) simTeams.push({name:`AS-${i+1}`,pts:1000-i*5,region:'AS',history:[],players:[]});
const sStart = Date.now()+30*86400000;
const H = { esc:s=>String(s??''), logo:n=>`<b>${n}</b>`, box:(t,b)=>`<section>${t}${b}</section>`, empty:s=>s, fdate:()=> 'soon', PAGES:{}, SECTION_OF:{} };
const simWindow = { HS:H, CS2Realism:api, V29News:null, setInterval:()=>{} };
const simSeason = { currentSeason:1, tournamentIndex:1, calendar:{currentMs:Date.now()}, seasonSchedule:[null,{type:'major',name:'Major Test',size:32,calendar:{startMs:sStart}}], parallelSchedule:[] };
const simCtx = { window:simWindow, teams:simTeams, seasonState:simSeason, currentTournament:null, calcMatchOdds:()=>({pct1:50}), setInterval:()=>{}, Date, Math, console };
vm.runInNewContext(v35, simCtx, {filename:'v35-major-path.js'});
const result = simWindow.V35Major.simulateInvites();
const r32 = result.rows.find(r=>r.name==='EU-18');
const r33 = result.rows.find(r=>r.name==='EU-19');
assert(r32 && r33, 'cutoff test teams must appear in simulation results');
assert(r32.in > 0.15 && r32.in < 0.95, `team at regional cutoff should have uncertainty, got ${r32.in}`);
assert(r33.in > 0.05 && r33.in < 0.85, `team three points below regional cutoff should retain a realistic chance, got ${r33.in}`);
const html = H.PAGES.majorpath();
assert(html.includes('Регион / место') && html.includes('До региональной квоты'), 'Major Path must show region rank and cutoff distance');

// Verify the calendar time resolver ignores an old alias/flag after rebase.

// Region quotas can place a team outside the global top 8 directly into Stage 3.
// Its badge must reflect the actual invite pool, not its world-rank number.
const rankTeams = [];
rankTeams.push({name:'AS-Top-1',pts:1800,region:'AS',history:[],players:[]});
rankTeams.push({name:'AS-Top-2',pts:1790,region:'AS',history:[],players:[]});
for (let i=1;i<=6;i++) rankTeams.push({name:`EU-Top-${i}`,pts:1700-i*10,region:'EU',history:[],players:[]});
for (let i=1;i<=9;i++) rankTeams.push({name:`AM-Top-${i}`,pts:1630-i*10,region:'AM',history:[],players:[]});
for (let i=7;i<=24;i++) rankTeams.push({name:`EU-Lower-${i}`,pts:1500-i*10,region:'EU',history:[],players:[]});
const rankWindow = {HS:H, CS2Realism:api, setInterval:()=>{}};
const rankSeason = {currentSeason:1,tournamentIndex:1,calendar:{currentMs:Date.now()},seasonSchedule:[null,{type:'major',name:'Major Rank Test',size:32,calendar:{startMs:Date.now()+10*86400000}}],parallelSchedule:[]};
const rankCtx = {window:rankWindow,teams:rankTeams,seasonState:rankSeason,currentTournament:null,setInterval:()=>{},Date,Math,console};
vm.runInNewContext(v35,rankCtx,{filename:'v35-major-path-rank.js'});
const rankHtml = H.PAGES.majorpath();
const rank9 = rankHtml.match(/<tr data-team="AM-Top-1"[^>]*>([\s\S]*?)<\/tr>/);
assert(rank9 && /В квоте/.test(rank9[1]) && /title="Сейчас проходит в Stage 3/.test(rank9[1]), 'world rank 9 team invited via AM quota must retain the Stage 3 current-pool detail in its tooltip');

const start = v30.indexOf('function plannedAt(m) {');
const end = v30.indexOf('\nfunction matchPlannedTime(m)', start);
assert(start>=0 && end>start, 'plannedAt function should be extractable for behavior test');
const snippet = v30.slice(start,end) + '\nthis.testPlannedAt = plannedAt;';
const now = 2_000_000_000_000;
const queueItem = {match:{t1:'A',t2:'B'},status:'scheduled',time:now+86400000,v18PlannedTime:now-86400000,plannedTime:now-86400000,delayedByMs:86400000,delayed:true,isDelayed:true};
const calCtx = { H:{nowMs:()=>now}, CT:()=>({broadcast:{queue:[queueItem]}}), matchBelongsToCurrentTournament:()=>true, window:{}, Number, Math };
vm.runInNewContext(snippet, calCtx);
const planned = calCtx.testPlannedAt({a:'A',b:'B',w:false});
assert(planned && planned.ms===now+86400000 && planned.delayed===false, 'calendar must display rebased future slot, not stale delay');
console.log('PASS v49: day-skip schedule aliases are synchronized and stale delay flags ignored');
console.log('PASS v49: tournament qualification and Major invitations use one region classifier');
console.log('PASS v49: Major Stage 1/2/3 pools are rebuilt from the same roster snapshot');
console.log('PASS v49: regional Stage 3 badge overrides misleading global rank #9');
console.log(`PASS v49: 3-point regional cutoff remains probabilistic (inside=${r32.in.toFixed(2)}, outside=${r33.in.toFixed(2)})`);
