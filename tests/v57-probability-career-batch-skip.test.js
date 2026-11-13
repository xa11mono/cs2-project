const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const majorPath = read('js/competition/major-path-odds.js');
const hltv = read('js/portal/hltv-site.js');
const parallel = read('js/competition/parallel-tournaments.js');
const batchSkip = read('js/calendar/skip-days.js');
const v17 = read('js/calendar/smart-skip.js');
const career = read('js/rosters/player-career-stats.js');
const css = read('css/portal/profile-performance.css');
const html = require('./lib/project').pageSources();
const calendar = read('js/calendar/training-calendar.js');

// Major Path groups teams by their most likely stage (3 → 2 → 1), then sorts each group by overall invite probability descending.
assert(/const visibleRows = d\.rows\.filter\(x => inviteProbability\(x\) > 0\)/.test(majorPath) && /const rows = sortProbabilityRows\(visibleRows\)/.test(majorPath), 'Major Path must use the canonical normalized probability sorter');
assert(/function probabilityStage\(row\)/.test(majorPath) && /function sortProbabilityRows\(rows\)/.test(majorPath), 'Major Path must classify each team by its dominant stage and use a shared sorter');
assert(/Шанс Stage 2<\/th>/.test(majorPath) && !/Шанс Stage 2 ↑/.test(majorPath) && !/data-major-sort/.test(majorPath), 'Major Path must not imply a Stage 2-only sort or offer a manual override');
assert(/сначала наиболее вероятная стадия, затем общий шанс приглашения/i.test(majorPath) && /по убыванию/.test(majorPath) && /Мировой VRS и очки не меняют порядок/.test(majorPath), 'Major Path must explain forecast-stage groups and descending invite odds separately from the current VRS quota status');

// An empty roster object produced by older archive writers must not block stamping.
assert(/const rost = snap\.rost && typeof snap\.rost === 'object' \? \{ \.\.\.snap\.rost \} : \{\};/.test(hltv), 'archive roster stamping must merge into an existing empty/partial roster map');
assert(/if \(Array\.isArray\(rost\[n\]\) && rost\[n\]\.length\) return;/.test(hltv), 'only missing team rosters should be filled');
assert(/earned\.allList[\s\S]*?filter\(x => x\.k === 'major'\)/.test(hltv), 'Major Winner badge must use normalized title kinds from the full award list');
assert(/major-winner/.test(hltv) && /hs-chip\.major-winner/.test(css), 'player profile must restore the yellow Major Winner badge');
assert(/filter:none!important/.test(css) && /v37-mvp-medal/.test(css), 'MVP medal glow must be removed from profile and inline medal variants');
assert(hltv.includes('CS2 Manager <i class="pt-ver">v86</i>'), 'visible application version should match v81 release');

// v58: qualification progress is calendar-driven and a pause is a hard stop.
assert(/if\s*\(v21Cal\(\)\.paused\) return false/.test(parallel), 'background events must stop while the calendar is paused');
assert(/window\.v21ProcessParallelNow=function\(options=\{\}\)/.test(parallel), 'parallel circuit must expose a forced but clock-respecting daily tick');
// v144: проверка удалена — она искала текст в обёртке window.v15AdvanceMinutes, которая ни разу не срабатывала:
// v15AdvanceMinutes объявлена внутри js/calendar/training-calendar.js и глобальной не бывает (мёртвый код удалён).
assert(/window\.v57BatchCalendarSkip = true/.test(batchSkip) && /matchBudget: 1/.test(batchSkip) && /await window\.v21ProcessOverdueCooperative/.test(batchSkip), 'multi-day skips must process overdue matches cooperatively while deferring writes');
assert(!/allowPaused:\s*true/.test(batchSkip), 'batch simulation must never override a calendar pause');
assert(/if\(c\.paused \|\| !Number\.isFinite\(mins\)/.test(calendar), 'the calendar clock itself must reject time advances while paused');
assert(/v17HandleQualifierWindow\(step,stepIndex\)/.test(v17), 'smart skip must visit qualification windows before the Tier-1 event');
assert(/v17HandleQualifierWindow/.test(v17) && /start-18\*V17_DAY_MS/.test(v17), 'smart skip must stop at the Open Qualifier date');
assert(/V22_QUAL_SLOTS_PER_DAY=1/.test(parallel) && /at\(18,12\)/.test(parallel) && /at\(9,13\)/.test(parallel), 'qualifier rounds need a slower cadence and longer Open/Closed windows');
const finishQuals = parallel.slice(parallel.indexOf('window.v35FinishQuals=i=>'), parallel.indexOf('window.v35QualInfo=i=>'));
assert(!/v22Advance\(/.test(finishQuals), 'main tournament creation must not instantly backfill unfinished qualifiers');
assert(!/setTimeout\(r, 45\)/.test(batchSkip) && /requestAnimationFrame/.test(batchSkip) && /await yieldToBrowser\(\)/.test(batchSkip), 'multi-day skip must yield to browser paint during each virtual day');

// Runtime: career stats captured before a player disappears from all active rosters.
let currentStats = { P: { Star: { nick: 'Star', team: 'Team A', matches: [{id:'m1'},{id:'m2'}], all: {maps:2}, p: {nick:'Star'} } } };
let saveTransferCalls = 0;
let saveTeamsCalls = 0;
const teams = [{ name: 'Team A', players: [{ nick: 'Star' }] }];
const transferState = {};
function saveTeams() { saveTeamsCalls++; }
function saveTransferState() { saveTransferCalls++; }
const gameWindow = {
  HS: { stats: () => currentStats },
  saveTeams,
  setInterval() { return 1; }
};
const context = { window: gameWindow, teams, transferState, saveTeams, saveTransferState, currentStats, console, JSON, Date, Map, Set, Object, Array };
vm.runInNewContext(career, require('./lib/project').attachKernel(context), { filename: 'js/rosters/player-career-stats.js' });
context.teams = [{ name: 'Team A', players: [] }];
currentStats = { P: {} };
context.currentStats = currentStats;
gameWindow.saveTeams();
assert(transferState.v57PlayerCareer?.Star?.matches?.length === 2, 'the last valid career match list must be captured before the player is removed from the roster');
assert(saveTransferCalls >= 1 && saveTeamsCalls === 1, 'career ledger must persist through the transfer-state save path without blocking the normal save');

// Runtime: day-by-day core simulation remains intact, but UI and saves are batched.
(async () => {
  let skipped = 0, savedTeams = 0, savedSeason = 0, renderedTournament = 0, renderedRating = 0, renderedHub = 0, parallelCatchups = 0, dailyCatchups = 0, finalCatchups = 0;
  const doc = { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } };
  function ctxSaveTeams() { savedTeams++; }
  function ctxSaveSeason() { savedSeason++; }
  function ctxRenderTournament() { renderedTournament++; }
  function ctxRenderRating() { renderedRating++; }
  const win = {
    saveTeams: ctxSaveTeams, saveSeasonState: ctxSaveSeason, renderTournament: ctxRenderTournament, renderRating: ctxRenderRating,
    skipGameCalendarDay() {},
    v17AdvanceSingleCalendarDayForBatch() {
      skipped++;
      assert(win.v57BatchCalendarSkip, 'batch mode must be active inside each skipped day');
      ctx.saveTeams(); ctx.saveSeasonState(); ctx.renderTournament(); ctx.renderRating(); win.HS.render();
      return true;
    },
    HS: { render() { renderedHub++; } },
    v15IsCalendarPaused() { return false; },
    v21ProcessParallelNow(options={}) { parallelCatchups++; if(options.deferIO) dailyCatchups++; else finalCatchups++; return false; }
  };
  const ctx = { window: win, document: doc, saveTeams: ctxSaveTeams, saveSeasonState: ctxSaveSeason, renderTournament: ctxRenderTournament, renderRating: ctxRenderRating, console, Promise, setTimeout, setInterval() { return 1; }, Math, Number, String, Object, Array };
  vm.runInNewContext(batchSkip, require('./lib/project').attachKernel(ctx), { filename: 'js/calendar/skip-days.js' });
  await win.v33SkipDays(4);
  assert(skipped === 4, 'batch skip must still process each requested in-game day');
  assert(parallelCatchups === 5 && dailyCatchups === 5 && finalCatchups === 0, 'parallel tournaments must use deferred I/O for each skipped day and the final catch-up');
  assert(savedTeams === 1 && savedSeason === 1, 'large save payloads must be written once at batch end when parallel catch-up did not save');
  assert(renderedTournament === 1 && renderedRating === 1 && renderedHub === 1, 'expensive UI rendering must be consolidated at batch end');
  console.log('PASS v57: Major Path stage-bucket/overall-probability sorting, roster capture, Major Winner badge and MVP styling');
  console.log('PASS v58: batch day skips process qualifiers per day, respect pause and defer only writes/rendering');
})().catch(err => { console.error(err); process.exitCode = 1; });
