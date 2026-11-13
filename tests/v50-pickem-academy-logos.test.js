// v50 regression tests: direct Pick'em category selection, resilient team logo fallback,
// and permanent protection against professional-origin players entering academies.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const pickem = read('js/fan/pickem.js');
const logos = read('js/portal/hltv-site.js');
const market = read('js/rosters/market.js');
const rosterAI = read('js/rosters/roster-ai.js');
const css = read('css/portal/tokens.css');

// Logo selection must walk through every known source, not stop at one stale blob URL.
assert(/const saved = t\?\.photo \|\| t\?\.crest/.test(logos), 'legacy saved photo/crest fields should remain supported');
assert(/const sources = \[media, t\?\.logo, saved/.test(logos), 'logo source chain should include media and saved team fields');
assert(/meta\?\.photo, meta\?\.logo, meta\?\.crest, meta\?\.image/.test(logos), 'logo source chain should include the EMDB alternatives');
assert(/data-fallbacks=/.test(logos) && /this\.dataset\.fallbacks/.test(logos), 'failed logo URLs should fall through to the next known image URL');

// Any active pro roster player is permanently tagged; both automatic and manual gates check origin.
assert(/teams\.filter\(t => t && !t\.isAcademy\)\.forEach\(t => \(t\.players \|\| \[\]\)\.forEach\(p => \{[\s\S]*?markProfessionalOrigin\(p, t\)/.test(market), 'active professional players should receive a persistent origin marker');
assert(/toTeam\?\.isAcademy && \(\(fromTeam && !fromTeam\.isAcademy\) \|\| player\?\.v30ProOrigin === true \|\| !!professionalSource\(player\)\)/.test(market), 'market transfer wrapper must reject known pro-origin players entering academies');
assert(/const proOrigin = !!\(player && \(player\.v30ProOrigin === true \|\| player\.v30LastProTeam \|\| window\.v30ProfessionalSource\?\.\(player\)\)\)/.test(rosterAI), 'final roster AI gate must identify former pro players even after an academy-to-academy move');
assert(/if \(toTeam\?\.isAcademy && \(proOrigin \|\| \(fromTeam && !fromTeam\.isAcademy\)\)\) return false/.test(rosterAI), 'forced/manager transfers must not bypass the pro-to-academy restriction');

// Simulate the Pick'em UI and select 0:3 before filling any 3:0 slot.
const H = {
  esc: s => String(s ?? ''), logo: n => `<logo>${n}</logo>`, box: (t, b) => `<section>${t}${b}</section>`,
  empty: s => s, fdate: () => 'day', teamBy: n => ({ name:n, pts:100 }),
  PAGES: {}, SECTION_OF: {}, NAV_MORE: [], CLICKS: [], render: () => {}
};
const names = Array.from({length:16}, (_,i)=>`Team ${i+1}`);
const stage = { teams:names.map(name=>({name,wins:0,losses:0})), rounds:[], completed:false };
const currentTournament = { isMajor:true, completed:false, name:'Major v50', majorStages:[stage,null,null], matches:[] };
const majorData = { stages:{}, playoffs:{qf:[],sf:[],champion:null} };
const seasonState = { calendar:{currentMs:1000}, v33Pickem:{t:'Major v50',major:majorData}, pickemScore:0 };
const window = { HS:H, scrollY:0, scrollTo:()=>{}, V31Media:null };
const ctx = { window, document:{getElementById:()=>null}, seasonState, currentTournament, currentPickem:{major:majorData}, teams:names.map(name=>({name,pts:100})),
  saveSeasonState:()=>{}, console:{log(){},warn(){},info(){}}, setTimeout:()=>{}, Date, Math, Number, String, Object, Array, Set, Map };
vm.runInNewContext(pickem, ctx, {filename:'js/fan/pickem.js'});
let html = H.PAGES.pickem();
assert(html.includes('data-pkcat="zeroThree"'), 'Pick’em should expose a direct 0:3 category control');
assert(/Счёты 1:3 и 2:3 — результаты выбывания/.test(html), 'Pick’em should explain that 1:3/2:3 are outcomes, not prediction slots');
const chooseCategory = H.CLICKS.find(x=>x[0]==='[data-pkcat]')[1];
const chooseTeam = H.CLICKS.find(x=>x[0]==='[data-pkteam]')[1];
chooseCategory({dataset:{pkcat:'zeroThree'}});
chooseTeam({dataset:{pkteam:'Team 1'}});
assert((majorData.stages[1]?.zeroThree || []).includes('Team 1'), 'user must be able to place the first 0:3 pick without filling 3:0');
html = H.PAGES.pickem();
assert(/class="[^"]*pk-cat-btn on" data-pkcat="zeroThree"/.test(html), 'selected Pick’em category should remain highlighted after rendering');
assert(/class="pk-rules-note"/.test(html), 'Stage I–III should show the official Pick’em category rules');

console.log('PASS v50: Stage Pick’em lets users choose 0:3 directly and explains 1:3/2:3 outcomes');
console.log('PASS v50: team logos retry saved and EMDB sources when the first image URL fails');
console.log('PASS v50: professional-origin players are blocked from academy recruitment and transfers');
