const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };
const cal = read('js/calendar/training-calendar.js');
const career = read('js/rosters/player-career-stats.js');
const persist = read('js/core/persist-tournament.js');
const autosave = read('js/core/autosave.js');
const v20 = read('js/calendar/schedule-resync.js');
const news = read('js/media/headlines.js');
const editorial = read('js/media/news-stories.js');
const people = read('js/portal/people.js');
const html = require('./lib/project').pageSources();
const hub = read('js/competition/hltv-hub.js');
const site = read('js/portal/hltv-site.js');
const legacy = read('js/portal/home-legacy.js');
assert(/v15UpdateClockDisplay\(\)/.test(cal) && /v15UpdateClockDisplay\(\);/.test(cal), 'clock painting must be separated from full calendar rendering');
assert(/v15LastHeavyRenderWallMs>=15000/.test(cal), 'expensive calendar content must not refresh every second');
assert(/v15CampCache/.test(cal) && /wall-v15CampCache\.at<15000/.test(cal), 'bootcamp recommendations must be cached for legacy team databases');
assert(/Math\.min\(30,\(now-v15LastWallMs\)\/1000\)/.test(cal), 'delayed browser timer must catch up rather than lose more than five seconds');
assert(/v15SaveAccumulator>=60/.test(cal), 'large full season writes must not occur every 15 seconds from the clock ticker');
assert(/rosterChanged = !initialized \|\| signature !== lastRosterSignature/.test(career), 'career scanner should gate HS.stats on roster changes');
assert(/syncBaseline\(false\); }, 15000\)/.test(career), 'career fallback scan must not rebuild archive aggregates every 1.2s');
assert(/wrap\('saveTournamentToArchive', false, true, true\)/.test(career), 'career aggregates should refresh after an archive is finalized');
assert(/snapshot\(\); }, 12000\)/.test(persist), 'current tournament stringify polling must be less frequent');
assert(/saveNow\('periodic'\); }, 45000\)/.test(autosave), 'full browser autosaves should not serialize a huge legacy save every 20s');
assert(/scheduleSave\(5000\)/.test(autosave), 'autosave writes should be coalesced for several seconds');
assert(/if\(!first \|\| firstAt>now\) return/.test(v20), 'Tier-1 queue should avoid normalizing a not-yet-due queue');
assert(/v20NormalizeAllQueueTimes\(\);\s*const shifted/.test(v20), 'queue normalization should only happen after overdue match is detected');
assert(/}, 2500\)/.test(news), 'news title rewrite polling should be throttled');
assert(/}, 15000\)/.test(people), 'rank snapshot poll should be throttled');
assert(/archive\[snap.id\] = snap; archiveDirty.add\(String\(snap.id\)\); markArchiveChanged\(snap.id\)/.test(hub) && /hubArchiveRevision = \(\) => archiveRevision/.test(hub) && /hubArchiveHas = id => !!archive\[String\(id\)\]/.test(hub) && /hubArchiveCount = \(\) => Object.keys\(archive\)\.length/.test(hub) && /hubArchiveChangesSince/.test(hub) && /hubArchiveGet/.test(hub), 'archive hub must expose revisioned incremental change access');
assert(/const extra = \(count \? 1 : 0\) \+ keyJson\.length \+ 1 \+ snapJson\.length/.test(hub) && !/const next = JSON\.stringify\(cache\)/.test(hub), 'archive cache must use linear-size accounting rather than serialising the growing object per event');
assert(/revision === ARCH_REV\) return ARCH_MS/.test(site) && /const ms = archived\.filter/.test(site), 'player statistics must skip whole-archive scans when archive revision is unchanged');
assert(/function matchIndex\(\) \{ return allMatches\(\); \}/.test(site) && /typeof HS\.matchIndex === 'function' \? HS\.matchIndex\(\)/.test(editorial), 'newsroom should use the lightweight raw match index instead of full player-stat aggregation');
assert(/}, 5000\)/.test(editorial) && /document\.hidden/.test(editorial), 'heavy match/news archive scan must be throttled and skipped for hidden tabs');
assert(/archiveIndex\(force = false\)/.test(legacy) && /revision === v37LastArchivePollRevision && hofSignature === v37LastHallOfFameSignature\) return/.test(legacy), 'legacy archive newsroom must use cached archive index and skip unchanged polls');
const careerCore = read('js/career/career-core.js');
assert(/hubArchiveChangesSince/.test(careerCore) && /revision === v31ParallelPrizeArchiveRevision/.test(careerCore) && /}, 8000\)/.test(careerCore), 'parallel tournament prize scan must be incremental and skip unchanged archive revisions');
const campFn = cal.slice(cal.indexOf('function v15RecommendedCamps'), cal.indexOf('function v15CalendarCampButton'));
assert(!/ensurePlayerLayer/.test(campFn), 'read-only calendar recommendations must not initialise every legacy team player layer');
assert(html.includes('js/competition/hltv-hub.js') && html.includes('js/portal/hltv-site.js') && html.includes('js/media/news-stories.js') && html.includes('js/portal/home-legacy.js'), 'all archive-performance modules must bust browser cache');
assert(html.includes('js/core/runtime-diagnostics.js'), 'runtime diagnostics must be included with the current cache version');
assert(/CS2RuntimePerformance\.snapshot/.test(read('js/core/runtime-diagnostics.js')) && /containerSrc/.test(read('js/core/runtime-diagnostics.js')), 'long-task diagnostics API must include attribution when browser exposes it');
console.log('PASS v74: clock-only UI updates remain responsive while full calendar panels are throttled');
console.log('PASS v74: archive statistics refresh on data changes, not every 1.2 seconds');
console.log('PASS v74: legacy tournament queue and autosave serialisation are no longer hot-loop work');
console.log('PASS v75: archive persistence is linear and prize/news scans are revision-driven on large legacy saves');

// Runtime check: repeated safety polls with an unchanged legacy roster must not rebuild archive stats.
{
  const vm = require('vm');
  let statsCalls = 0, timerFn = null, transferSaves = 0;
  const win = {
    HS: { stats() { statsCalls++; return { P: { Alpha: { nick: 'Alpha', matches: [{ id: 1 }] } } }; } },
    saveTeams() {}, saveTransferState() { transferSaves++; },
    applyPlayerTransfer() {}, processTransferMarket() {},
    saveTournamentToArchive() {}, hubArchiveImport() {}
  };
  let teams = [{ name: 'Team A', players: [{ nick: 'Alpha' }] }];
  const transferState = {};
  win.setInterval = (fn, ms) => { assert(ms === 15000, 'career polling fallback must be 15 seconds'); timerFn = fn; return 1; };
  const sandbox = {
    window: win, teams, transferState,
    saveTeams: win.saveTeams, saveTransferState: win.saveTransferState,
    document: { hidden: false }, console,
    Map, Array, Object, String, Number, JSON, Date
  };
  vm.runInNewContext(career, sandbox, { filename: 'js/rosters/player-career-stats.js' });
  assert(statsCalls === 1, 'initial career baseline should be captured once');
  timerFn();
  assert(statsCalls === 1, 'unchanged roster poll must not recalculate archive stats');
  teams = [{ name: 'Team A', players: [] }]; sandbox.teams = teams;
  win.saveTeams();
  assert(statsCalls === 2, 'roster change must refresh career statistics exactly once');
  assert(transferState.v57PlayerCareer.Alpha?.matches?.length === 1, 'departed player career snapshot must still be retained');
  win.hubArchiveImport({});
  assert(statsCalls === 3, 'archive import must explicitly refresh career statistics');
}
console.log('PASS v74: unchanged legacy roster no longer invokes full archive statistics every poll; transfers/import still refresh career data');
