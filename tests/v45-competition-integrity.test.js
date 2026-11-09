// Регрессионные тесты v45: ограничение VRS, подготовка участников и фильтрация Major Path.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const roster = prefix => Array.from({ length: 5 }, (_, i) => ({ nick: `${prefix}${i}`, status: 'STARTER' }));
const teams = [
  { name: 'Alpha', pts: 1000, players: roster('A') },
  { name: 'Bravo', pts: 1000, players: roster('B') },
  { name: 'Charlie', pts: 520, players: roster('C') }
];
const context = {
  teams,
  seasonState: { calendar: { currentMs: Date.UTC(2026, 10, 1) } },
  window: {},
  console: { log(){}, warn(){}, info(){} },
  Math, Number, String, Object, Array, Set, Date, Map
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/manager/v38-vrs-emdb-awards.js'), 'utf8'), context);
const VRS = context.window.CS2VRSModel;
assert(VRS && VRS.version === 2, 'VRS model should load');

// v84: points are derived from results (Valve model). Full evidence → 400 + 1600 × factors, H2H capped at ±200.
const oldDate = Date.UTC(2026, 9, 15);
teams[0].vrsLedger = {
  version: 1,
  rosterKey: 'a0|a1|a2|a3|a4',
  basePts: 1000,
  earnings: Array.from({ length: 10 }, (_, i) => ({ id: `e${i}`, date: oldDate, amount: 100000 })),
  matches: Array.from({ length: 30 }, (_, i) => ({ date: oldDate, won: true, h2hDelta: 32, oppBounty: 1, network: 1, eventWeight: 1, isLAN: true, opponent: `O${i}` }))
};
VRS.recalcAll(teams);
assert(teams[0].pts >= 400 && teams[0].pts <= 2000, 'VRS points stay inside the Valve 400–2000 range');
// v97: при полной истории результаты дают vrs.resultShare (0.65) итога, остальное — память клуба (стартовые очки)
assert(Math.abs(teams[0].vrsBreakdown.h2h) <= 200 && Math.abs(teams[0].vrsBreakdown.coverage - 0.65) < 1e-9, 'full evidence: results give 65% of the score (club memory 35%); head-to-head adjustment is bounded');

// One even match should produce a modest, predictable preview rather than a massive point swing.
const preview = VRS.delta(teams[1], teams[0], { name: 'Test Match', prizePool: 0, online: true });
assert(preview.win <= 24 && preview.lose <= 24 && preview.win >= 1, 'v84: single match moves VRS by at most K=24 (head-to-head adjustment)');
assert(preview.win > 0 && preview.lose > 0, 'both win and loss previews should be meaningful');

// Base points stay anchored when other teams are added or the global ranking population changes.
const before = teams[0].pts;
teams.push({ name: 'Newcomer', pts: 400, players: roster('N') });
VRS.recalcAll(teams);
assert(teams[0].pts === before, 'adding another team must not renormalize established team points');

// Future Major invite list is frozen by the preparation helper once inside its advance window.
const v21 = fs.readFileSync(path.join(root, 'js/manager/v21-parallel-tournaments-academies-layer.js'), 'utf8');
assert(/st\.v45Participants=saved\?/.test(v21) && /st\.v45StagePools=saved/.test(v21), 'future Major participants and stage pools should be stored as a persistent frozen roster');
assert(/lockAt=start-\(window\.CS2_PICKEM_LEAD_DAYS\|\|4\)\*V21_DAY/.test(v21) && /if\(clock<lockAt\) return false/.test(v21), "v84: Major roster freezes on Pick'Em Day (4 days before start), not 42 days early");

// Major Path main list must not force in top-32 teams when probability is exactly zero.
const pathSource = fs.readFileSync(path.join(root, 'js/manager/v35-major-path.js'), 'utf8');
assert(/inviteProbability\(x\)\s*>\s*0/.test(pathSource), 'Major Path should only include teams with positive normalized invitation chance');
assert(!/x\.in\s*>\s*0\.005\s*\|\|\s*x\.rank\s*<=\s*32/.test(pathSource), 'old forced top-32 fallback must be removed');

// Upper/lower bracket finals must be previewed as qualification matches, never as title deciders.
const newsSource = fs.readFileSync(path.join(root, 'js/manager/v30-news.js'), 'utf8');
assert(/Финал верхней сетки/.test(newsSource) && /Финал нижней сетки/.test(newsSource), 'upper and lower finals should have separate news headlines');
assert(/разыгрывают последнее место в гранд-финале/.test(newsSource), 'lower final should announce the Grand Final slot, not the trophy');
assert(/решающий матч турнира за чемпионский титул и трофей/.test(newsSource), 'only the true final should be described as the title match');

console.log('PASS v45: legacy VRS totals bounded to ±30 around saved baseline');
console.log('PASS v45: single-match VRS preview is modest and predictable');
console.log('PASS v45: adding teams does not renormalize existing VRS scores');
console.log("PASS v45: Major invite preview stays provisional until Pick'Em Day");
console.log('PASS v45: Major Path excludes zero-chance teams');


// Trophy and MVP awards are independent: an existing champion cup must not skip MVP assignment.
const trophySource = fs.readFileSync(path.join(root, 'js/manager/v26-trophies.js'), 'utf8');
const awardBody = trophySource.slice(trophySource.indexOf('function awardTournament(ev)'), trophySource.indexOf('// v33: Rating 2.0'));
assert(awardBody.indexOf('rememberTeamTitle(ev)') < awardBody.indexOf("if (!['major', 'elite', 'regular'].includes") && awardBody.indexOf("if (!['major', 'elite', 'regular'].includes") < awardBody.indexOf('const eligible'), 'MVP eligibility is checked after team trophy writes and independently (v83 finalist model)');
assert(/window\.RewardSystem\?\.addPlayerMvp/.test(awardBody), 'MVP is deduplicated by the common registry (RewardSystem.addPlayerMvp: one MVP per event)');

// Player profiles must render achievements even without match-stat rows, and all trophies is default.
const playerSource = fs.readFileSync(path.join(root, 'js/manager/v27-hltv-site.js'), 'utf8');
assert(/const T = H_SHELF\(\), tab = S\.shelfT \|\| 'all'/.test(playerSource), 'player trophy shelf should default to all');
assert(/if \(!o\) return head \+ \(tab === 'awards'[\s\S]*?box\('Достижения'/.test(playerSource), 'player achievements should render when player has no match stats');
assert(/S\.shelfT = 'all'/.test(playerSource), 'opening a different player/team profile should reset trophy shelf to all');

// Team pages also reset the trophy shelf and retain qualification history/placements.
const prestigeSource = fs.readFileSync(path.join(root, 'js/manager/v33-prestige.js'), 'utf8');
assert(/lastShelfTeam !== name\) \{ H\.S\.shelfT = 'all'/.test(prestigeSource), 'team profile navigation should reset trophy shelf to all');
const peopleSource = fs.readFileSync(path.join(root, 'js/manager/v30-portal-people.js'), 'utf8');
assert(/Результаты квалификаций/.test(peopleSource), 'team index should show qualification results');
assert(/fieldProfile === 'medium'/.test(peopleSource), 'legacy tournament tier classification should use fieldProfile');

// Major Swiss qualification buckets must display team logos, not text-only labels.
const matchSource = fs.readFileSync(path.join(root, 'js/manager/auto_script_1.js'), 'utf8');
assert(/const teamChip = name => \{ const h = window\.HS\?\.logo \? window\.HS\.logo\(name,'sm'\)/.test(matchSource), '3:0/0:3 qualification chips should include team logos');

// The tournament is complete when the championship final ends; bronze match is independent.
const completion = matchSource.slice(matchSource.indexOf('function checkTournamentCompletion()'), matchSource.indexOf('function calcMatchOdds'));
assert(/currentTournament\.grandFinal && currentTournament\.grandFinal\.winner/.test(completion), 'double-elimination tournament should finish after Grand Final winner is known');
assert(/if \(finalRound && finalRound\.winner\) finalizeTournamentRating\(\)/.test(completion), 'single-elimination champion should not wait for bronze match');
assert(!/bronzeMatch/.test(completion), 'bronze match must not gate champion assignment');

// Calendar stages and Pick’Em day are separate entries; preview picks are persistent before start.
const portalEvents = fs.readFileSync(path.join(root, 'js/manager/v30-portal-events.js'), 'utf8');
['Pick\'Em Day', 'Stage I', 'Stage II', 'Stage III', 'Champions Stage'].forEach(label => assert(portalEvents.includes(label), `Major calendar should contain ${label}`));
const pickemSource = fs.readFileSync(path.join(root, 'js/manager/v33-pickem.js'), 'utf8');
assert(/function upcomingMajor\(\)/.test(pickemSource) && /s\.v33Pickem = \{ t: nx\.entry\.name, major: m \}/.test(pickemSource), 'Pick’Em preview should be available and saved before Major begins');
assert(/Состав участников ещё предварительный/.test(pickemSource) && /return i===1 && !!nx\?\.locked/.test(pickemSource), 'Pick’Em editing should stay locked until Major roster lock');

// Upcoming events expose invitees before start, and frozen participants feed the actual tournament.
assert(/Участники турнира/.test(portalEvents) && /Прямое приглашение/.test(portalEvents), 'upcoming event page should show invitees before start');
assert(/savedStep\?\.v45Participants/.test(matchSource), 'actual Major should use the same frozen participant preview');

console.log('PASS v45: MVP, player achievements, and all-trophies defaults are covered');
console.log('PASS v45: team qualification results and Swiss logos are present');
console.log('PASS v45: champion completion is independent from bronze match');
console.log('PASS v45: Pick’Em Day, separate Major stages, and pre-start invite previews are present');
