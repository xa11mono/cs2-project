const fs = require('fs');
const path = require('path');
const assert = (v,m)=>{ if(!v) throw new Error(m); };
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const core=read('js/manager/auto_script_1.js');
const norm=core.slice(core.indexOf('function normalizeTeamCollection(input) {'),core.indexOf('\nfunction loadTeams()'));
assert(norm.includes('const defaultsByKey = new Map()') && norm.includes('const rosterByKey = new Map()') && norm.includes('const emdbRosterByKey = new Map()'),'legacy migration must build lookup indexes once');
assert(!norm.includes('Object.entries(emdb.rosters || {}).find'),'legacy migration must not rebuild/search roster arrays per team');
assert(!/if \(window\.__CS2_V76_TEAM_REPAIR_PENDING\)[\s\S]{0,700}localStorage\.setItem\(\"cs2_season_teams_v61\", JSON\.stringify\(teams\)\)/.test(core),'boot repair must not synchronously serialize the full team graph');
assert(core.includes('window.__CS2_V77_TEAM_REPAIR_PENDING = true'),'normalized legacy teams must remain marked for normal autosave');
assert(core.includes('Array.isArray(t.__v77LegacyRoster)'),'legacy rosters must be hydrated in the existing team pass, not during repeated lookups');
const hub=read('js/manager/v25-hltv-hub.js');
assert(hub.includes('const BATCH = 20') && hub.includes('setTimeout(resolve, 0)'),'archive migration must yield between small IndexedDB write batches');
assert(hub.includes('if (archiveDbOk) {'),'archive must avoid sync localStorage serialization while IndexedDB migration is active');
const autosave=read('js/manager/v56-autosave.js');
assert(autosave.includes('const canonical = /^(?:cs2_season_state_v61') && autosave.includes('if (key == null || canonical.test(key)) continue'),'autosave must not duplicate canonical save data in localStorageSnapshot');
const html=read('index.html');
for(const f of ['auto_script_1.js?v=113','v25-hltv-hub.js?v=113','v56-autosave.js?v=113']) assert(html.includes(f),'cache bust '+f);
console.log('PASS v77: no full-team synchronous write during startup');
console.log('PASS v77: O(n+m) legacy team lookup and one-pass roster supplementation');
console.log('PASS v77: archive migration writes in yielding batches');
console.log('PASS v77: autosave payload avoids duplicating canonical save blobs');

{
  const vm=require('vm');
  const context={
    DEFAULT_TEAMS:[], TEAM_ROSTER_2026:{}, window:{CS2_EMDB_2026:{rosters:{},teams:{}}},
    PLAYER_LAYER_VERSION:2, MAP_POOL:['Mirage','Nuke'], generateMapStats:()=>({Mirage:50,Nuke:50}),
    JSON, Array, Object, String, Number, Set, Map, Math
  };
  vm.runInNewContext(`${norm}\nthis.migrate = normalizeTeamCollection;`,context);
  const input=Array.from({length:3000},(_,i)=>`Legacy Club ${i}`);
  const started=Date.now(); const result=context.migrate(input); const elapsed=Date.now()-started;
  assert(result.teams.length===3000 && result.converted.length===3000,'large legacy team list must fully normalize');
  assert(elapsed<2500,`3,000 name-only records should normalize without quadratic scans (took ${elapsed} ms)`);
  console.log(`PASS v77: 3,000 legacy team names normalized in ${elapsed} ms`);
}

