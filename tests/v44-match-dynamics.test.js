// Регрессионные тесты v44: импульс, давление, адаптация, план тренера, комментатор.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/match/dynamics.js'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const teams = [
  { name: 'Alpha', style: 'Aggressive', coach: { name: 'Coach A' }, players: Array.from({ length: 5 }, (_, i) => ({ nick: `A${i}`, tacticalIQ: 82, clutch: 84 })) },
  { name: 'Bravo', style: 'Discipline', coach: { name: 'Coach B' }, players: Array.from({ length: 5 }, (_, i) => ({ nick: `B${i}`, tacticalIQ: 66, clutch: 68 })) }
];
const records = new Map();
const emitted = [];
let capturedProb = null;
const V34Round = {
  play(item, prob) {
    capturedProb = prob;
    const M = records.get(item.id) || { map: 'Mirage', rounds: [], board: { A0: { nick: 'A0', team: 1 }, B0: { nick: 'B0', team: 2 } } };
    const rec = {
      r: item.state.round, winner: 1, reason: 'bomb', side1: 'T',
      events: [
        { type: 'kill', team: 1, entry: true, by: 'A0', target: 'B0', weapon: 'AK-47', loc: 'A ramp' },
        { type: 'plant', team: 1, by: 'A0', loc: 'A site' }
      ], hl: null
    };
    M.rounds[item.state.round - 1] = rec;
    records.set(item.id, M);
    return rec.winner;
  },
  live(id) { const M = records.get(id); return M ? { maps: { 0: M } } : null; }
};
const window = {
  HS: { PAGES: {} }, V34Round, teams,
  addBroadcastEvent(st, html, kind) { emitted.push({ html, kind }); }
};
const context = { window, teams, console: { log(){}, warn(){}, info(){} }, Math, Number, String, Object, Array, Set, Date };
vm.createContext(context);
vm.runInContext(source, context);
const API = window.CS2MatchDynamics;
assert(API && API.version === 44, 'v44 API should be installed');

const item = {
  id: 'dynamics-test', match: { t1: 'Alpha', t2: 'Bravo' }, status: 'live',
  state: { mapIndex: 0, maps: ['Mirage'], round: 1, map1: 0, map2: 0, series1: 0, series2: 0, overtime: false, roundBuys: {} }
};

// Wrapper must apply only a small bounded modifier before the real round engine.
const basePlay = V34Round.play;
const winner = V34Round.play(item, .50);
assert(winner === 1, 'round wrapper must preserve simulated winner');
assert(capturedProb >= .47 && capturedProb <= .53, 'round modifier must stay within ±3 percentage points');
assert(item.state.v44Dynamics && item.state.v44Dynamics.rounds.length === 1, 'round result should be recorded in dynamics');
assert(item.state.v44Dynamics.comments.some(x => x.type === 'commentary'), 'commentator should react to a real round');
const dynamicsHtml = API.buildMarkup(item, true);
assert(dynamicsHtml.includes('ДИНАМИКА МАТЧА') && dynamicsHtml.includes('Психологическое давление') && dynamicsHtml.includes('КОММЕНТАТОР'), 'compact Match Center panel should render dynamics and commentary');

// Repeated A hits are detected and the defending side receives a counter-read.
for (let r = 2; r <= 3; r++) {
  item.state.round = r;
  item.state.map1 = r - 1;
  V34Round.play(item, .50);
}
assert(item.state.v44Dynamics.sides[2].read?.lane === 'A', 'defence should adapt after repeated attacks on A');
assert(item.state.v44Dynamics.comments.some(x => x.type === 'coach' && /прочитали повторяющийся маршрут/.test(x.text)), 'coach should announce tactical adaptation');
const liveMarkup = API.buildMarkup(item);
assert(liveMarkup.includes('3 победы подряд') && liveMarkup.includes('Форма: W W W'), 'match panel should expose current win streak and recent form');

// Three straight losses generate a tactical plan with a finite two-round duration.
const other = {
  id: 'pressure-test', match: { t1: 'Alpha', t2: 'Bravo' },
  state: { mapIndex: 0, maps: ['Mirage'], round: 4, map1: 1, map2: 4, series1: 0, series2: 0, overtime: false, roundBuys: {}, v44Dynamics: {
    version: 44, mapIndex: 0, rounds: [2, 2, 2], comments: [],
    sides: { 1: { momentum: -1, pressure: 0, activePlan: null, read: null, lastCoachRound: -99, mistakeUntil: 0, attacks: [] }, 2: { momentum: 1, pressure: 0, activePlan: null, read: null, lastCoachRound: -99, mistakeUntil: 0, attacks: [] } }
  } }
};
API.ensure(other);
const calculated = API.prepareRound(other, .50);
assert(calculated.prob >= .47 && calculated.prob <= .53, 'pressure modifiers must remain bounded');
API.processRound(other, { r: 4, winner: 2, side1: 'CT', events: [], reason: 'elimination' }, { board: {} });
assert(other.state.v44Dynamics.sides[1].activePlan?.roundsLeft === 2, 'coach should set a two-round plan after a long losing streak');
assert(API.buildMarkup(other).includes('ПЛАН ТРЕНЕРА · 2 РАУНДА'), 'match panel should show active coach-plan duration');
assert(emitted.some(x => x.kind === 'coach-reaction'), 'coach reactions should enter the broadcast event feed');

// Серия поражений на матч-пойнте создаёт заметное психологическое давление и аналитическую реплику.
const pressureProbe = { id:'pressure-probe', match:{t1:'Alpha',t2:'Bravo'}, state:{mapIndex:0,maps:['Mirage'],round:18,map1:3,map2:12,overtime:false,
  v44Dynamics:{version:44,mapIndex:0,rounds:[2,2,2,2],comments:[],sides:{
    1:{momentum:-1,pressure:0,activePlan:null,read:null,lastCoachRound:99,mistakeUntil:0,attacks:[]},
    2:{momentum:1,pressure:0,activePlan:null,read:null,lastCoachRound:99,mistakeUntil:0,attacks:[]}
  }}}
};
API.ensure(pressureProbe);
const neutralPressure = API.pressureFor(pressureProbe, 1, 6, 6, []);
const matchPointPressure = API.pressureFor(pressureProbe, 1, 3, 13, [2,2,2,2,2]);
assert(matchPointPressure > neutralPressure && matchPointPressure > .62, 'pressure should rise under a heavy deficit and match point');
API.processRound(pressureProbe, {r:18,winner:2,side1:'CT',reason:'elimination',events:[]}, {board:{}});
assert(pressureProbe.state.v44Dynamics.comments.some(x => x.type === 'analysis' && /давление/.test(x.text)), 'analyst should mention high psychological pressure');

// A failed trade is reported as a real mistake and penalizes the next round, not the current one.
const mistakeItem = {
  id: 'mistake-test', match: { t1: 'Alpha', t2: 'Bravo' },
  state: { mapIndex: 0, maps: ['Mirage'], round: 5, map1: 2, map2: 2, overtime: false, v44Dynamics: { version:44, mapIndex:0, rounds:[], comments:[], sides:{
    1:{momentum:0,pressure:0,activePlan:null,read:null,lastCoachRound:-99,mistakeUntil:0,attacks:[]},
    2:{momentum:0,pressure:0,activePlan:null,read:null,lastCoachRound:-99,mistakeUntil:0,attacks:[]}
  } } }
};
API.ensure(mistakeItem);
API.processRound(mistakeItem, { r:5, winner:2, side1:'CT', reason:'elimination', events:[{type:'trade-try',by:'A0',trade:false}] }, { board:{ A0:{team:1} } });
assert(mistakeItem.state.v44Dynamics.sides[1].mistakeUntil === 6, 'failed trade should affect only the following round');
assert(mistakeItem.state.v44Dynamics.comments.some(x => x.type === 'mistake'), 'mistake should be described in commentary');


// Планы тренера меняют стиль внутри настоящей микросимуляции, а не только в интерфейсе.
const roundSource = fs.readFileSync(path.join(root, 'js/match/round-sim.js'), 'utf8');
const actualTeams = [
  { name: 'Alpha', style: 'Aggressive', players: Array.from({ length: 5 }, (_, i) => ({ nick: `A${i}`, role: ['IGL','AWPer','Rifler','Support','Lurker'][i], firepower: 75 })) },
  { name: 'Bravo', style: 'Tactical', players: Array.from({ length: 5 }, (_, i) => ({ nick: `B${i}`, role: ['IGL','AWPer','Rifler','Support','Lurker'][i], firepower: 75 })) }
];
const actualWindow = {};
const actualContext = { window: actualWindow, teams: actualTeams, console: { log(){}, warn(){}, info(){} }, Math, Map, Number, String, Object, Array, Set, Date };
vm.createContext(actualContext);
vm.runInContext(roundSource, actualContext);
const actualItem = { id: 'real-style-switch', match: { t1: 'Alpha', t2: 'Bravo' }, state: {
  mapIndex: 0, maps: ['Mirage'], round: 13, roundBuys: { 13: { t1: { type: 'full' }, t2: { type: 'full' } } },
  v44Dynamics: { sides: { 1: { activePlan: { style: 'Discipline', roundsLeft: 2, startedRound: 12 } }, 2: {} } }
} };
actualWindow.V34Round.play(actualItem, .5);
const actualRec = actualWindow.V34Round.live(actualItem.id).maps[0].rounds[12];
assert(actualRec.tStyle === 'Discipline', 'active coach plan must change actual T-side simulation style');

// В v34 отметка успешного трейда должна оставаться на trade-try, а не на следующем kill-событии.
let tradeCheckCount = 0;
for (let seed = 1; seed <= 100; seed++) {
  const sample = actualWindow.V34Round.simulate({ map:'Mirage', round:8, idp:`trade-${seed}-`, s1side:'T',
    p1:actualTeams[0].players, p2:actualTeams[1].players, buy1:'full', buy2:'full', style1:'Aggressive', style2:'Tactical' }, .54,
    (() => { let x = seed >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t=x; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; })());
  for (let i = 0; i < sample.events.length; i++) if (sample.events[i].type === 'trade-try') {
    const next = sample.events[i + 1];
    assert(!!sample.events[i].trade === (next?.type === 'kill' && next.by === sample.events[i].by), 'trade success flag must match the actual follow-up duel');
    tradeCheckCount++;
  }
}
assert(tradeCheckCount > 0, 'test samples should include at least one trade attempt');

console.log('PASS v44: bounded form/pressure modifiers and compact panel markup');
console.log('PASS v44: repeated-site adaptation, current win streak and recent form');
console.log('PASS v44: automatic two-round tactical plans');
console.log('PASS v44: psychological pressure and analyst reaction at match point');
console.log('PASS v44: factual mistake detection and commentary');
console.log('PASS v44: coach plan changes real v34 micro-simulation style');
console.log('PASS v44: successful/failed trade markers match the actual duel result');
