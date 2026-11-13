const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const core = read('js/base/game.js');
const v17 = read('js/calendar/smart-skip.js');
const v21 = read('js/competition/parallel-tournaments.js');
const v55 = read('js/core/sim-liveness.js');
const html = read('index.html');

// Season-end work must be linear, and the new season must rebuild all 14 Tier-1 events.
const seasonFn = core.slice(core.indexOf('function finalizeTournamentRating()'), core.indexOf('function getTeamCurrentPts('));
const roll = seasonFn.slice(seasonFn.indexOf('if ((typeof window.v21ShouldEndSeason'), seasonFn.indexOf('} else {\n    seasonState.tournamentIndex += 1;'));
const mapDrifts = (roll.match(/driftMapStats\(t\.maps\)/g) || []).length;
assert(mapDrifts === 1, 'each season must drift map stats exactly once per team');
assert((roll.match(/teams\.forEach/g) || []).length === 3, 'season rollover must contain only the expected linear team passes, not a nested team pass');
assert(/window\.v21GenerateTier1Schedule\(false\)/.test(roll), 'season rollover must restore the 14-event calendar and parallel circuit');
assert(/function v21YearStart\(\)[\s\S]*?seasonPlanSeason[\s\S]*?next\.setDate\(next\.getDate\(\)\+1\)/.test(v21), 'calendar anchor must move forward when season changes after January');
assert(/window\.v21GenerateTier1Schedule\s*=\s*v21GenerateTier1Schedule/.test(v21), 'season schedule builder must be exposed to the core rollover');
assert(/v55RepairTournamentProgress/.test(v17) && /getNextPlayableMatch/.test(v17), 'day skip must invoke recovery and use the canonical fallback match resolver');
assert(/v55-simulation-liveness\.js/.test(html), 'v55 recovery module must load after prior gameplay layers');

// Execute v55's public repair API in a minimal deterministic context.
const apiWindow = {};
let seasonRebuilds = 0;
const context = {
  window: apiWindow,
  seasonState: {
    currentSeason: 2,
    tournamentIndex: 1,
    seasonSchedule: Array.from({length: 15}, (_, i) => i ? {name:`event-${i}`} : null),
    parallelSchedule: [{season: 2}],
    calendar: {currentMs: new Date(2027, 1, 1).getTime(), seasonPlanSeason: 2}
  },
  currentTournament: null,
  teams: [],
  saveSeasonState() {},
  renderTournament() {},
  v21GenerateTier1Schedule() { seasonRebuilds++; },
  console,
  Map, Set, Number, Math, Array, Object, Date
};
vm.runInNewContext(v55, context, {filename:'js/core/sim-liveness.js'});
assert(seasonRebuilds === 0, 'valid current-season calendar must not be reset');

// A completed Swiss round with a stale currentRound must generate the next round.
context.currentTournament = {
  name: 'Swiss recovery test',
  formatChoice: 'swiss',
  swiss: {
    currentRound: 5,
    teams: [
      {name:'Alpha', wins:0, losses:0, diff:0, playedAgainst:[]},
      {name:'Bravo', wins:0, losses:0, diff:0, playedAgainst:[]}
    ],
    rounds: [[{t1:'Alpha', t2:'Bravo', winner:'Alpha', isBO1:true}]]
  },
  upperRounds: []
};
context.generateSwissRound = round => {
  context.currentTournament.swiss.rounds.push([{t1:'Alpha', t2:'Bravo', winner:null, isBO1:true}]);
};
context.finalizeSwissStage = () => { context.currentTournament.swiss = null; };
apiWindow.v55RepairTournamentProgress();
assert(context.currentTournament.swiss.currentRound === 2, 'Swiss pointer must be corrected to the first missing round');
assert(context.currentTournament.swiss.rounds.length === 2, 'completed Swiss round must advance instead of remaining idle');
assert(context.currentTournament.swiss.teams[0].wins === 1 && context.currentTournament.swiss.teams[1].losses === 1, 'Swiss standings must be rebuilt from recorded match results');

// The same recovery must work for a Major stage after a skipped stage callback.
context.currentTournament = {
  name: 'Major recovery test', isMajor: true,
  majorPools: {stage2:[], stage3:[]}, majorStages: [{
    number:1, currentRound:4, completed:false,
    teams:[
      {name:'Alpha', wins:0, losses:0, diff:0, playedAgainst:[]},
      {name:'Bravo', wins:0, losses:0, diff:0, playedAgainst:[]}
    ],
    rounds:[[{t1:'Alpha',t2:'Bravo',winner:'Alpha',isBO1:true}]]
  }, null, null],
  upperRounds: []
};
context.generateMajorSwissRound = stage => {
  stage.rounds.push([{t1:'Alpha',t2:'Bravo',winner:null,isBO1:true}]);
};
context.finalizeMajorStage = () => {};
apiWindow.v55RepairTournamentProgress();
assert(context.currentTournament.majorStages[0].currentRound === 2, 'Major currentRound must recover from a stale save pointer');
assert(context.currentTournament.majorStages[0].rounds.length === 2, 'Major must generate the missing next round');
assert(context.currentTournament.majorStages[0].teams[0].wins === 1, 'Major standings must be reconstructed from saved match winners');

console.log('PASS v55: season reset is O(N), and each season restores Tier-1 + parallel calendars');
console.log('PASS v55: Swiss/ Major stages recover stale round pointers and rebuild missing transitions');
// Rebuild missing hand-offs in a partially saved 8-team double-elimination bracket.
context.currentTournament = {
  name: 'Double-elimination recovery test',
  formatChoice: 'double', hasLowerBracket: true, size: 8, completed: false,
  upperRounds: [
    [
      {t1:'A',t2:'B',winner:'A'}, {t1:'C',t2:'D',winner:'C'},
      {t1:'E',t2:'F',winner:'E'}, {t1:'G',t2:'H',winner:'G'}
    ],
    [{t1:null,t2:null},{t1:null,t2:null}],
    [{t1:null,t2:null}]
  ],
  lowerRounds: [
    [{t1:null,t2:null},{t1:null,t2:null}],
    [{t1:null,t2:null},{t1:null,t2:null}],
    [{t1:null,t2:null}],
    [{t1:null,t2:null}]
  ],
  grandFinal: {t1:null,t2:null}, placements: {}
};
apiWindow.v55RepairTournamentProgress();
const dbl = context.currentTournament;
assert(dbl.upperRounds[1][0].t1 === 'A' && dbl.upperRounds[1][0].t2 === 'C', 'upper-round winners must be restored to the next upper round');
assert(dbl.lowerRounds[0][0].t1 === 'B' && dbl.lowerRounds[0][0].t2 === 'D', 'upper-round losers must be restored to the first lower round');
console.log('PASS v55: double-elimination winner/loser hand-offs recover missing slots');

// GSL results restore group qualification and the missing playoff transition.
let gslFinalized = 0;
context.finalizeGSLStage = () => { gslFinalized++; return true; };
const makeGroup = prefix => ({
  qualified: [], eliminated: [], matches: {
    opening1:{t1:`${prefix}1`,t2:`${prefix}2`,winner:`${prefix}1`},
    opening2:{t1:`${prefix}3`,t2:`${prefix}4`,winner:`${prefix}3`},
    winners:{t1:`${prefix}1`,t2:`${prefix}3`,winner:`${prefix}1`},
    losers:{t1:`${prefix}2`,t2:`${prefix}4`,winner:`${prefix}2`},
    decider:{t1:null,t2:null,winner:`${prefix}3`}
  }
});
context.currentTournament = {
  name:'GSL recovery test', formatChoice:'gsl', completed:false,
  gsl:{groups:['A','B','C','D'].map(makeGroup)}, upperRounds:[]
};
apiWindow.v55RepairTournamentProgress();
assert(gslFinalized === 1, 'fully resolved GSL groups must trigger the missing playoff hand-off');
assert(context.currentTournament.gsl.groups[0].qualified.join(',') === 'A1,A3', 'GSL qualifiers must be rebuilt from saved winners');
assert(context.currentTournament.gsl.groups[0].matches.decider.t1 === 'A3' && context.currentTournament.gsl.groups[0].matches.decider.t2 === 'A2', 'GSL decider inputs must be restored');
console.log('PASS v55: GSL qualification and playoff transition recover from saved match winners');

// Bounty stage-one winners must feed the eight LAN-stage match slots.
context.currentTournament = {
  name:'Bounty recovery test', formatChoice:'bounty', completed:false,
  bounty:{lanStageStarted:false,
    stage1:Array.from({length:16},(_,i)=>({t1:`W${i}`,t2:`L${i}`,winner:`W${i}`})),
    stage2:Array.from({length:8},()=>({t1:null,t2:null,winner:null}))
  }, upperRounds:[]
};
apiWindow.v55RepairTournamentProgress();
assert(context.currentTournament.bounty.stage2[0].t1 === 'W0' && context.currentTournament.bounty.stage2[0].t2 === 'W1', 'Bounty winners must be restored into the LAN bracket');
console.log('PASS v55: Bounty stage hand-offs recover when the save missed slot assignment');

console.log('PASS v55: calendar day skip has a canonical fallback when the broadcast queue is empty');
