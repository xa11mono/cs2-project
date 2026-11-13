// v51 regression tests retained as compatibility coverage for the grouped Major hub.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const pickem = read('js/fan/pickem.js');
const portal = read('js/portal/hltv-site.js');
const html = require('./lib/project').pageSources();
const css = read('css/portal/tokens.css');

// v54 groups Pick’Em, Major Path and Major winners into one top navigation menu.
assert(!/NAV_MORE\.unshift\(\['pickem'/.test(pickem), 'Pick’Em must not be placed in the More menu');
assert(/const NAV_MAJOR = \[\['pickem'/.test(portal) && /'majorpath'/.test(portal) && /'majors'/.test(portal), 'Major menu should group Pick’Em, the Major Path and past Major winners');
assert(/class="pt-dd pt-major"/.test(portal) && /data-dd="major"/.test(portal), 'a dedicated Major dropdown should exist in the top navigation');
assert(/data-major-pickem hidden/.test(portal) && /window\.V33Pickem\?\.isAvailable\?\.\(\)/.test(portal), 'Pick’Em menu item should depend on Pick’em availability');
assert(!/pt-pickem-btn/.test(portal), 'the duplicate standalone Pick’Em button should be removed');
assert(!/id="pickem-trophy-display"/.test(html), 'the old Pick’Em label must be removed from the time-control header');
assert(!/id="pickem-open-btn"/.test(html), 'the duplicate old management-panel Pick’Em button must be removed');

const H = {
  esc: s => String(s ?? ''), logo: n => `<logo>${n}</logo>`, box: (t, b) => `<section>${t}${b}</section>`,
  empty: s => s, fdate: () => 'day', yearOf: () => 2026, teamBy: n => ({ name:n, pts:100 }),
  PAGES: {}, SECTION_OF: {}, NAV_MORE: [['calendar','Календарь']], CLICKS: [], render: () => {}
};
const names = Array.from({length:16}, (_,i)=>`Team ${i+1}`);
const stage = { teams:names.map(name=>({name,wins:0,losses:0})), rounds:[], completed:false };
const majorData = { stages:{}, playoffs:{qf:[],sf:[],champion:null} };
const seasonState = {
  currentSeason: 1, tournamentIndex: 1, pickemScore: 8,
  calendar:{currentMs:1000},
  v33Pickem:{t:'Major v51',major:majorData},
  v35Prof:{coins:{'Major v51|1':{name:'Major v51',season:1,year:2026,base:2,pts:0}}}
};
const currentTournament = { isMajor:true, completed:false, season:1, name:'Major v51', majorStages:[stage,null,null], matches:[] };
const window = {
  HS:H, scrollY:0, scrollTo:()=>{}, V31Media:null,
  V35Badges:{LV:[[0,'Бронза'],[3,'Серебро'],[6,'Золото'],[10,'Платина'],[14,'Алмаз']],coinSvg:(name,year,level,size)=>`<svg data-name="${name}" data-level="${level}" width="${size}"></svg>`}
};
const ctx = {
  window, document:{getElementById:()=>null}, seasonState, currentTournament, currentPickem:{major:majorData},
  teams:names.map(name=>({name,pts:100})), saveSeasonState:()=>{}, console:{log(){},warn(){},info(){}},
  setTimeout:()=>{}, setInterval:()=>{}, Date, Math, Number, String, Object, Array, Set, Map
};
vm.runInNewContext(pickem, ctx, {filename:'js/fan/pickem.js'});

assert(window.V33Pickem.isAvailable(), 'Pick’Em navigation should be available while a Major is live');
let out = H.PAGES.pickem();
assert(/class="pk-page-grid"/.test(out), 'Pick’Em workspace should use the two-column layout');
assert(/class="pk-medal-card"/.test(out), 'the medal should appear in the Pick’Em page beside the predictions');
assert(!/class="pk-rank"/.test(out), 'the old season-rank badge must not appear instead of the Major medal');
assert(/data-level="2"/.test(out), 'medal art should reflect the current Major score, not the season total');
assert(/<b>6<\/b><span>очков за этот Major/.test(out), 'medal points should use this Major’s score only');
assert(!H.NAV_MORE.some(x=>x[0]==='pickem'), 'Pick’Em should not be added to the More menu');

// On a Pick’em Day, the button is enabled only once the current Major roster is locked.
const oldTournament = currentTournament;
ctx.currentTournament = null;
const majorEntry = { type:'major', name:'Next Major', v45Participants:[], calendar:{startMs:86400000} };
seasonState.seasonSchedule = [{ type:'regular', name:'Regular Cup' }, majorEntry];
seasonState.tournamentIndex = 1;
window.v45LockMajorRoster = (i, now) => {
  if (now >= 0) { majorEntry.v45RosterLockedAt = 123; majorEntry.v45Participants = ['Team 1']; }
};
assert(window.V33Pickem.isAvailable(), 'the standalone button should appear after the scheduled Major roster lock');
majorEntry.v45RosterLockedAt = 0; majorEntry.v45Participants = [];
window.v45LockMajorRoster = () => {};
// current tournament is cleared; no explicit roster lock means no Pick’Em button.
assert(!window.V33Pickem.isAvailable(), 'the standalone button should stay hidden before Pick’em Day');

console.log('PASS v51/v54: Pick’Em is grouped under Major, not More or the old standalone button');
console.log('PASS v51: the Pick’Em page places the actual Major coin on the right and shows event-specific score/progress');
console.log('PASS v51: Pick’Em navigation follows the current Major / roster-lock window');
