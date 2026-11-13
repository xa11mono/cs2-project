// Быстрые регрессионные тесты v43 без браузера и Playwright.
// Запуск из корня проекта: node tests/v43-match-immersion.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

// Реальная симуляция раунда v34: исход, события и план команды.
const simContext = { window: {}, console: { log(){}, warn(){}, info(){} }, Math, Map, Number, String, Object, Array, Set, Date };
vm.createContext(simContext);
vm.runInContext(read('js/match/round-sim.js'), simContext);
const V34 = simContext.window.V34Round;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const player = nick => ({ nick, role: 'Rifler', firepower: 75, tacticalIQ: 80, clutch: 80, utility: 80 });
const sim = V34.simulate({ map: 'Mirage', round: 4, idp: 'test:', s1side: 'CT', p1: ['A1','A2','A3','A4','A5'].map(player), p2: ['B1','B2','B3','B4','B5'].map(player), buy1: 'full', buy2: 'full', style1: 'Aggressive', style2: 'Discipline' }, .55, rng(987));
assert([1, 2].includes(sim.winner), 'v34 должен определить победителя раунда');
assert(sim.plan && sim.tStyle === 'Discipline' && sim.ctStyle === 'Aggressive', 'стиль и план раунда должны учитываться');
assert(sim.events.some(e => e.type === 'kill'), 'в раунде должны быть реальные события перестрелки');

// Изолируем pause-слой v43 с заглушками только для зависимостей UI.
const feed = [];
const context = {
  console: { log(){}, warn(){}, info(){} }, Date, Math, Number, String, Object, Array, Set,
  tvPlaybackSpeed: 1,
  window: {
    HS: { PAGES: { match(){ return '<div class="mx-grid">'; }, watch(){ return '<div class="hs-grid2">'; } }, spectator: { direct(){ return null; } }, liveItem(){ return null; }, findMatch(){ return null; } },
    V34Round: { play(){ return 1; }, live(){ return null; } },
    maybeTriggerBroadcastTacticalPause(){ return false; },
    broadcastAdvancePhase(item, now) { const st = item?.state; if (st?.phase === 'tactical-pause' && now >= st.phaseUntil) { st.phase = 'playing'; st.phaseUntil = 0; return true; } return false; },
    addBroadcastEvent(st, text, type) { feed.push({ text, type }); },
    getBroadcastTeamTrend(st, side) { return st.testTactical && side === 1 ? { streak: 5, losses: 5 } : { streak: 0, losses: 0 }; },
    V31: { managed(){ return ''; } }
  }
};
vm.createContext(context);
vm.runInContext(read('js/match/immersion.js'), context);
const API = context.window.CS2MatchImmersion;
assert(API && API.technicalPauseChancePerRound === .0025, 'частота технической паузы должна быть 0.25% на подходящий раунд');
const makeItem = id => ({ id, match: { t1: 'Alpha', t2: 'Beta' }, state: { phase: 'playing', finished: false, round: 8, mapIndex: 0, maps: ['Mirage'], map1: 4, map2: 4, mode: 'BO3', t1Pauses: 3, t2Pauses: 3, mapRoundWinners: [1,2,1,2,1], pauseHistory: [] } });

// Техническая остановка появляется по детерминированному roll, не тратит тактический лимит и возобновляет матч.
let tech = null;
for (let i = 0; i < 10000 && !tech; i++) { const item = makeItem('tech-' + i); if (API.triggerSmartPause(item, 1000) && item.state.phase === 'technical-pause') tech = item; }
assert(tech, 'тестовый поиск должен найти редкую техническую остановку');
assert(tech.state.t1Pauses === 3 && tech.state.t2Pauses === 3, 'техническая остановка не должна списывать тактические паузы');
assert(tech.state.pauseKind === 'technical' && tech.state.technicalPauseHistory.length === 1, 'техническая остановка должна иметь отдельную историю');
assert(context.window.broadcastAdvancePhase(tech, tech.state.phaseUntil + 1) && tech.state.phase === 'playing', 'техническая пауза должна корректно завершаться');

// ИИ берет тактический тайм-аут только после серии поражений, списывая один из трёх.
let tactical = null;
for (let i = 0; i < 10000 && !tactical; i++) { const item = makeItem('tactical-' + i); item.state.round = 7; item.state.map1 = 2; item.state.map2 = 5; item.state.mapRoundWinners = [2,2,2,2,2]; item.state.testTactical = true; if (API.triggerSmartPause(item, 1000) && item.state.phase === 'tactical-pause') tactical = item; }
assert(tactical, 'ИИ должен взять тайм-аут при затяжной серии поражений');
assert(tactical.state.t1Pauses === 2 && tactical.state.pauseKind === 'tactical', 'тактическая пауза должна списывать тайм-аут и иметь правильный тип');
assert(tactical.state.pauseHistory[0].automatic && tactical.state.pauseHistory[0].kind === 'tactical', 'автоматический тайм-аут должен записываться в историю');
assert(context.window.broadcastAdvancePhase(tactical, tactical.state.phaseUntil - 1) === false && tactical.state.phase === 'tactical-pause', 'тактическая пауза не должна закончиться раньше времени');
assert(context.window.broadcastAdvancePhase(tactical, tactical.state.phaseUntil + 1) && tactical.state.phase === 'playing', 'тактическая пауза должна завершаться');

// Команда пользователя не должна автоматически тратить свой лимит.
context.window.V31.managed = () => 'Alpha';
const managed = makeItem('managed'); managed.state.round = 7; managed.state.map1 = 2; managed.state.map2 = 5; managed.state.mapRoundWinners = [2,2,2,2,2]; managed.state.testTactical = true;
assert(!API.triggerSmartPause(managed, 1000) && managed.state.t1Pauses === 3, 'ИИ не должен автоматически брать паузы за управляемую команду');

console.log('PASS v34: исход раунда, события, тактический стиль');
console.log('PASS v43: техническая пауза (редкость, отдельный лимит, завершение)');
console.log('PASS v43: автоматический тактический тайм-аут (условия, списание, завершение)');
console.log('PASS v43: автоматические тайм-ауты не расходуются у команды пользователя');
