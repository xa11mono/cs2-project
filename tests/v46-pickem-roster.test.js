// Регрессионные тесты v46: фиксация состава Major, закрытие Pick'Em и единый список квалификантов.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const v21 = fs.readFileSync(path.join(root, 'js/competition/parallel-tournaments.js'), 'utf8');
const match = fs.readFileSync(path.join(root, 'js/base/game.js'), 'utf8');
const events = fs.readFileSync(path.join(root, 'js/portal/events.js'), 'utf8');
const people = fs.readFileSync(path.join(root, 'js/portal/people.js'), 'utf8');
const pickem = fs.readFileSync(path.join(root, 'js/fan/pickem.js'), 'utf8');

// Open -> Closed: в Closed попадают только финалисты Open и посев; Open берёт следующий слой рейтинга.
assert(/const openSlots=Number\(op\?\.qual\?\.slots\)/.test(v21), 'closed qualifier should use the actual Open advancement quota');
assert(/const seeded=pool\.filter\(n=>!adv\.includes\(n\)\)\.slice\(0,seededCount\)/.test(v21), 'closed qualifier must use seeded teams, not the whole regional pool');
assert(/list=pool\.slice\(seededCount,seededCount\+\(ev\.size\|\|16\)\)/.test(v21), 'open qualifier must use the next regional ranking layer');
assert(/const now=v21Now\(\)[\s\S]*?st\.v35Roster=\{version:1,lockedAt:now,invites,qualified:/.test(v21), 'the final roster should be persisted once and reused');
assert(/window\.v35QualSlots=i=>/.test(v21), 'the actual tournament should consume canonical qualification slots');
assert(/if\(String\(st\.format\|\|'\'\)\.toLowerCase\(\)==='bounty'\) continue/.test(v21), 'Bounty tournaments should not generate unrelated qualifiers');

// Actual tournament consumes the same canonical roster that the portal previews.
assert(/window\.v35FinishQuals\(seasonState\.tournamentIndex\)/.test(match), 'main tournament start should finish missing qualifier windows deterministically');
assert(/QS\.participants\.map\(byName\)/.test(match), 'actual Tier-1 roster should be built from canonical participants');
assert(!/simulateQualificationStage\(shuffleArray\(fieldPool\)/.test(match), 'hidden random qualification fallback should not replace shown winners');

// Tournament page shows both direct invites and qualified winners; the global Teams page keeps placements.
assert(/QI\.invites \|\| \[\]/.test(events) && /QI\.qualified \|\| \[\]/.test(events), 'upcoming tournament page should list invitees and qualified teams');
assert(/Победитель ещё не определён/.test(events) && /Квалификационное место/.test(events), 'unknown qualifier slots should be shown as placeholders, not fake teams');
assert(/В закрытую квалификацию/.test(people) && /Квалифицирована на турнир/.test(people), 'Teams page should label Open and Closed advancement places');
assert(/slice\(0,24\)/.test(people), 'Teams page should show more than a tiny recent subset of qualifiers');

// Pick'Em cannot be edited until the roster lock marker is set; the legacy modal has the same guard.
assert(/return i===1 && !!nx\?\.locked/.test(pickem), 'upcoming Pick\'Em must require the roster lock');
assert(/canPickStage: i => pickemCanEditStage\(Number\(i\)\)/.test(pickem), 'Pick\'Em stage guard should be available to legacy UI');
assert(/!window\.V33Pickem\.canPickStage\(1\)/.test(match), 'legacy Pick\'Em modal must respect the roster lock');
assert(/if\s*\(!pickemCanEdit\(\)\) return;/.test(pickem), 'Pick\'Em interaction handlers must reject edits while locked');

// Runtime gate test: before Pick'Em Day locked; on Pick'Em Day it opens; after first match it closes.
const startMs = Date.UTC(2027, 0, 20, 12, 0, 0), lockAt = startMs - 86400000;
const entry = { type: 'major', name: 'Test Major', calendar: { startMs }, v45Participants: null };
const simTeams = Array.from({ length: 32 }, (_, i) => ({ name: `Team ${i+1}`, pts: 1000-i }));
const seasonState = { tournamentIndex: 1, currentSeason: 1, calendar: { currentMs: lockAt - 1000 }, seasonSchedule: [null, entry] };
let currentTournament = null;
const window = {
  HS: { PAGES: {}, SECTION_OF: {}, NAV_MORE: [], CLICKS: [], esc: String, logo: () => '', box: () => '', empty: () => '', fdate: () => '19.01.2027' },
  CS2Realism: { majorInvites: xs => xs.slice().sort((a,b)=>b.pts-a.pts).slice(0,32), majorPools: xs => ({ stage1: xs.slice(16), stage2: xs.slice(8,16), stage3: xs.slice(0,8) }) },
  v45LockMajorRoster(i, now) { const e=seasonState.seasonSchedule[i]; if(now>=lockAt&&!e.v45RosterLockedAt){e.v45RosterLockedAt=lockAt;e.v45Participants=simTeams.map(t=>t.name);} },
  scrollTo() {}
};
const ctx = { window, teams: simTeams, seasonState, currentTournament, currentPickem: { major: { stages: {}, playoffs: {} } }, saveSeasonState(){}, console: { log(){}, warn(){}, info(){} }, setTimeout(){}, Math, Number, String, Object, Array, Set, Date, Map };
vm.createContext(ctx);
vm.runInContext(pickem, ctx);
assert(window.V33Pickem && window.V33Pickem.canPickStage(1) === false, 'Pick\'Em should be closed before the participant lock');
seasonState.calendar.currentMs = lockAt + 1;
window.V33Pickem.upcomingMajor();
assert(entry.v45RosterLockedAt === lockAt && window.V33Pickem.canPickStage(1) === true, 'Pick\'Em should open exactly when participants are frozen');
ctx.currentTournament = { isMajor: true, completed: false, name: 'Test Major', majorStages: [{ completed:false, rounds:[[{winner:null}]], teams:[] }, { completed:false, rounds:[[{winner:null}]], teams:[] }, null], matches:[] };
assert(window.V33Pickem.canPickStage(1) === true, 'Stage I picks should remain editable until its first match result');
assert(window.V33Pickem.canPickStage(2) === true, 'Stage II picks should open once its bracket is created');
ctx.currentTournament.majorStages[0].rounds[0][0].winner = 'Team 2';
assert(window.V33Pickem.canPickStage(1) === false, 'Stage I picks should close after the first result');
ctx.currentTournament.majorStages[1].rounds[0][0].winner = 'Team 1';
assert(window.V33Pickem.canPickStage(2) === false, 'Stage II picks should close after its first match result');

console.log('PASS v46: Open and Closed qualifier rosters are disjoint by construction');
console.log('PASS v46: tournament preview and actual participants share a canonical roster');
console.log('PASS v46: Teams page shows qualification placements and advancement labels');
console.log('PASS v46/v47: Pick\'Em opens on roster lock and each stage closes after its first result');
