// v47 regression tests: day-skip scheduling, live Pick'Em, Major stage labels/probabilities,
// academy guard, HLTV league coverage and MVP profile highlight.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const v17 = read('js/calendar/smart-skip.js');
const v18 = read('js/calendar/match-sync.js');
const v28 = read('js/rosters/roster-integrity.js');
const v30 = read('js/rosters/market.js');
const v33 = read('js/fan/pickem.js');
const v35 = read('js/competition/major-path-odds.js');
const v41 = read('js/competition/world-ranking.js');
const v42 = read('js/calendar/schedule-fix.js');
const v27 = read('js/portal/hltv-site.js');
const match = read('js/base/game.js');
const events = read('js/portal/events.js');
const css = read('css/portal/quality-fixes.css');

assert(/q\.v42ScheduleVersion\s*=\s*0/.test(v17) && /window\.v18FitDays\(b\)/.test(v17), 'day skip must replan pending queue from the new game date');
assert(/q\.delayedByMs\s*=\s*0/.test(v17) && /q\.originalPlannedTime\s*=/.test(v17), 'explicit day skip must clear stale delay history');
// v144: проверка удалена — она искала текст в обёртке window.v15AdvanceMinutes, которая ни разу не срабатывала:
// v15AdvanceMinutes объявлена внутри js/calendar/training-calendar.js и глобальной не бывает (мёртвый код удалён).
assert(/if \(overdue\)/.test(v42) && /x\.delayedByMs\s*=\s*0/.test(v42) && /x\.originalPlannedTime\s*=/.test(v42), 'overdue slots after skipped days must be rebased and delay badges cleared');
assert(/if \(item\.delayedByMs > 0/.test(v18), 'real delay status is driven by actual delay, so clearing stale metadata removes false labels');
assert(/if \(current\) return plannedAt\(m\)/.test(events), 'active tournament matches must not fall back to stale snapshot timestamps after a skip');
assert(/'pickem'/.test(v27.match(/const LIVE_PAGES = new Set\(([^;]+)/)?.[1] || '') && /'majorpath'/.test(v27), 'Pick\'Em and Major Path must live refresh');
assert(/gameDay/.test(v27) && /majorSig/.test(v27) && /pickemSig/.test(v27), 'live signature must include skipped game days, stage progress and picks');
assert(/t\?\.photo\s*\|\|\s*t\?\.crest/.test(v27), 'team logos should use saved photo/crest fallback fields');
assert(/hs-chip gold hs-mvp-chip/.test(v27) && /hs-achi\.mvp/.test(css), 'MVP winner should be highlighted gold in player profiles');
assert(/const H = window\.HS, rows = hltvRanking\(\);/.test(v41) && /rows\.map\(r =>/.test(v41) && !/rows\.slice\(0,\s*30\)/.test(v41), 'HLTV ranking must render all teams, not a top-30 slice');
assert(/всего команд: \$\{rows\.length\}/.test(v41), 'HLTV page must show its full team count');
assert(/DEFAULT_TEAMS\.forEach\(seed =>/.test(match) && /v47SeedImported/.test(match), 'older saves with only top-30 teams must migrate missing default professional teams');
assert(/function academyCanSign/.test(v30) && /player\.v30ProOrigin === true/.test(v30) && /window\.v30AcademyCanSign = academyCanSign/.test(v30), 'academy recruitment must reject players marked as professional-origin');
assert(/if \(team\.isAcademy && !academyCanSign\(p\)\)/.test(v30), 'academy free-agent signing must use pro-origin guard');
assert(/if \(toTeam\.isAcademy && !fromTeam\.isAcademy\) return false/.test(v28), 'direct pro-to-academy transfers must be rejected');
assert(/targetOut\.v30ProOrigin = true/.test(v28) && /benched\.v30ProOrigin = true/.test(v28), 'released professional players must retain their professional origin');
assert(/window\.v30AcademyCanSign && !window\.v30AcademyCanSign\(p\)/.test(v28), 'roster auto-replacement must obey the academy origin guard');
assert(/parallelBefore/.test(v35) && /nm\.parallelBefore\.map/.test(v35), 'Major invitation simulation must include future parallel tournaments');
assert(/teamSig/.test(v35) && /parallelSig/.test(v35), 'Major Path cache must key on individual team points and parallel schedule');
assert(/const pools = fixed \|\| poolsFromCurrentTeams\(\)/.test(v35) && /pools\.stage3\.forEach/.test(v35) && /pools\.stage2\.forEach/.test(v35), 'Major stage badges must come from the same canonical regional pools as the tournament');
assert(/Статус квоты сейчас/.test(v35) && /Регион \/ место/.test(v35) && /региональным квотам/.test(v35), 'Major path must explain global-vs-regional ranking and stage probabilities');
assert(/Ближе всего к региональному слоту/.test(v35) && /EU: 18, AM: 9, AS: 5/.test(v35), 'Major cutoff helper must compare teams against their region quota, not global top 32');
assert(/return !!st && !st\.completed && !started\(st\)/.test(v33), 'Stage Pick\'Em remains editable until the first result');
assert(/liveMajor \? \(started\(st\) \|\| st\.completed\)/.test(v33), 'Pick\'Em display lock must match the Stage edit guard');
assert(/k === 'threeZero'\) UI\.cat = 'zeroThree'/.test(v33), 'new Pick\'Em must automatically move to 0:3 after filling the 3:0 slots');
assert(/activeCatKey === 'threeZero'\) pickemActiveCat\[scope\] = 'zeroThree'/.test(match), 'legacy Pick\'Em must automatically move to 0:3 after filling the 3:0 slots');
assert(/teamLogo = window\.HS\?\.logo/.test(match) && /window\.HS\.logo\(n,"xs"\)/.test(match), 'legacy Pick\'Em editor and review rows must show team logos');
assert(/if\(st\.completed \|\| \(window\.V33Pickem\?\.canPickStage && !window\.V33Pickem\.canPickStage\(i\)\)\)/.test(match), 'saving another stage must preserve predictions in locked stages');
assert(/if\(champion && !sf\.includes\(champion\)\)/.test(match), 'playoff Pick\'Em may be saved before selecting a champion');

console.log('PASS v47: skipped dates refresh Pick\'Em and rebase the schedule without false delay badges');
console.log('PASS v47: live match schedule ignores stale snapshot timestamps after a day skip');
console.log('PASS v47: Major Path stage badges use the canonical invite pool and show regional position');
console.log('PASS v47: Stage Pick\'Em auto-advances 3:0 → 0:3 → ADVANCE, with logos in editor and review');
console.log('PASS v47: academies cannot recruit players released from professional teams');
console.log('PASS v47: HLTV ranking renders the complete pro-team list and imports missing legacy seed teams');
console.log('PASS v47: MVP winner profile highlight and Pick\'Em lock/persistence remain intact');
