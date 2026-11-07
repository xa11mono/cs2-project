// v48 regression tests: calendar skip delay labels, Major stage pools, Pick'Em refresh,
// invitation probabilities, logos, academy recruitment, and full HLTV table.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const events = read('js/manager/v30-portal-events.js');
const skip = read('js/manager/v17-smart-calendar-skip.js');
const pickem = read('js/manager/v33-pickem.js');
const legacy = read('js/manager/auto_script_1.js');
const pathMajor = read('js/manager/v35-major-path.js');
const logos = read('js/manager/v27-hltv-site.js');
const academy = read('js/manager/v30-market.js');
const career = read('js/manager/v31-career-ui.js');
const hltv = read('js/manager/v41-career-depth.js');
const mvpCss = read('css/v47-quality-fixes.css');

assert(/delayedByMs >= 5 \* 60000/.test(events) && !/hasDelayFlag/.test(events), 'calendar should require a measured delay, not a stale legacy flag');
assert(/if \(t && t < now - 5 \* 60000\) return null/.test(events), 'stale past queue slots after a day-skip should be hidden, not labeled delayed');
assert(/whenTxt\(pa\.ms, pa\.est, pa\.delayed\)/.test(events), 'both match rows and detail rows should pass explicit delay status');
assert(/q\.delayed = false/.test(skip) && /q\.isDelayed = false/.test(skip) && /q\.late = false/.test(skip), 'day skip must clear every legacy delay marker');
assert(/rosterState\?\.pools \|\| window\.v45MajorStagePools/.test(events) && /stage3\.length !== 8/.test(events), 'future Major preview must use immutable Stage 1/2/3 pools after roster lock');
assert(/sync: \(\) => syncAfterCalendarAdvance\(\)/.test(pickem), 'calendar sync must reconcile Pick\'Em after skipped days');
assert(/function syncAfterCalendarAdvance\(\)/.test(pickem) && /scoreMajorStagePickem\(i\)/.test(pickem) && /selectNextOpenStage\(\)/.test(pickem), 'completed stage picks should be scored and the next stage should become active after a skip');
assert(/function normalizePickCategory\(\)/.test(pickem) && /p\.threeZero/.test(pickem), 'saved stage picks should reopen on the first unfilled category');
assert(/function openPickemModal\(\)[\s\S]*?window\.hltvSiteOpen\('pickem'\)/.test(legacy) && !/id="pickem-modal"/.test(read('index.html')), 'legacy Pick\'Em entry points should redirect to the medal-first portal page, not open the old modal');
assert(/Math\.max\(12, Math\.min\(28/.test(pathMajor), 'Major invitation forecast should model realistic uncertainty for teams close to the regional cutoff');
assert(/99\.5%\+/.test(pathMajor), 'near-certain simulations should not be rounded to a misleading exact 100%');
assert(/meta\?\.photo/.test(logos), 'logos should fall back to EMDB metadata for teams advancing from Stage II/III');
assert(/if \(t\.isAcademy && window\.v30AcademyCanSign && !window\.v30AcademyCanSign\(p\)\)/.test(career), 'manual free-agent signing must reject pro-origin players for academies');
assert(/teams\.filter\(t => t\?\.isAcademy/.test(academy) && /removed professional-origin players from academies/.test(academy), 'old saves should migrate accidental pro players out of academy rosters');
assert(/rows\.map\(r =>/.test(hltv) && !/rows\.slice\(0,\s*30\)/.test(hltv), 'HLTV page must not cap the ranking to 30 teams');
assert(/meta\?\.photo/.test(logos) && /rows\.length/.test(hltv), 'logo fallback and full team count should remain visible');
assert(/hs-mvp-chip/.test(mvpCss) && /#ffe58b/.test(mvpCss), 'MVP Winner chip should keep bright yellow/gold styling');

// Dynamic smoke test: after a skipped-day sync completes Stage I, Pick'Em switches to Stage II,
// scores the saved Stage I card once, and the editor auto-switches from 3:0 to 0:3 when full.
const H = {
  esc: s => String(s ?? ''), logo: n => `<logo>${n}</logo>`, box: (t, b) => `<section>${t}${b}</section>`,
  empty: s => s, fdate: () => 'day', teamBy: n => ({name:n,pts:100}),
  PAGES: {}, SECTION_OF: {}, NAV_MORE: [], CLICKS: [], render: () => {}
};
const teamNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];
const stage2 = { teams: teamNames.map(name => ({name,wins:0,losses:0})), rounds:[], completed:false };
const ct = { isMajor:true, completed:false, name:'Major Test', majorStages:[
  {teams:[{name:'Old A',wins:3,losses:0},{name:'Old B',wins:0,losses:3}],rounds:[],completed:true}, stage2, null
], matches:[] };
const majorData = { stages:{1:{threeZero:['Old A','Old B'],zeroThree:[],advance:[],scored:false}}, playoffs:{qf:[],sf:[],champion:null} };
let scored = 0, saved = 0;
const context = {
  window:{HS:H, scrollY:0, scrollTo:()=>{}}, document:{getElementById:()=>null}, setTimeout:()=>{},
  seasonState:{calendar:{currentMs:1000},v33Pickem:{t:'Major Test',major:majorData},pickemScore:0},
  currentTournament:ct, currentPickem:{major:majorData}, teams:[],
  saveSeasonState:()=>{saved++;}, scoreMajorStagePickem:(i)=>{scored++;majorData.stages[i].scored=true;return 2;},
};
vm.runInNewContext(pickem, context, {filename:'v33-pickem.js'});
context.window.V33Pickem.sync();
assert(scored === 1, 'day-skip sync should score a completed Pick\'Em stage once');
let html = H.PAGES.pickem();
assert(/class="pk-tab on" data-pktab="2"/.test(html), 'Pick\'Em should switch to newly available Stage II after Stage I completes');
const tabClick = H.CLICKS.find(x => x[0] === '[data-pktab]')[1];
tabClick({dataset:{pktab:'2'}});
const teamClick = H.CLICKS.find(x => x[0] === '[data-pkteam]')[1];
teamClick({dataset:{pkteam:'Alpha'}});
teamClick({dataset:{pkteam:'Bravo'}});
html = H.PAGES.pickem();
assert(/class="pk-box out on"/.test(html), 'filling both 3:0 slots should immediately focus the 0:3 bucket');
const categoryClick = H.CLICKS.find(x => x[0] === '[data-pkcat]')[1];
categoryClick({dataset:{pkcat:'threeZero'}});
html = H.PAGES.pickem();
assert(/class="pk-box adv on"/.test(html), 'manual category selection should still allow reviewing a completed 3:0 bucket');
assert(saved >= 3, 'Pick\'Em changes and day-skip reconciliation should persist');

console.log('PASS v48: stale calendar slots no longer show false delay labels');
console.log('PASS v48: Major preview stage labels share the frozen roster pools');
console.log('PASS v48: day-skip Pick\'Em sync scores Stage I and opens Stage II');
console.log('PASS v48: Pick\'Em editor auto-focuses 0:3 after completing 3:0');
console.log('PASS v48: probability uncertainty, team logos, academy guard, all-team HLTV and gold MVP are covered');
