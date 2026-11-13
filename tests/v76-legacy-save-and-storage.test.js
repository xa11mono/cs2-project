const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const core = read('js/base/game.js');
const normalizeStart = core.indexOf('function normalizeTeamCollection(input) {');
const normalizeEnd = core.indexOf('\nfunction loadTeams()', normalizeStart);
assert(normalizeStart >= 0 && normalizeEnd > normalizeStart, 'legacy team normalizer must be a standalone function');
const normalizeSource = core.slice(normalizeStart, normalizeEnd);
const normContext = {
  DEFAULT_TEAMS: [{ name: 'Alpha', pts: 777, style: 'Tactical' }],
  TEAM_ROSTER_2026: { Phantom: ['P1', 'P2', 'P3', 'P4', 'P5'] },
  window: { CS2_EMDB_2026: { rosters: { 'Legacy Club': ['L1', 'L2', 'L3', 'L4', 'L5'] }, teams: {} } },
  PLAYER_LAYER_VERSION: 2,
  MAP_POOL: ['Mirage', 'Nuke'],
  generateMapStats: () => ({ Mirage: 55, Nuke: 50 }),
  createPlayerFromNick: (team, nick) => ({ nick, status: 'STARTER', team: team.name }),
  JSON, Array, Object, String, Number, Set, Math
};
vm.runInNewContext(`${normalizeSource}\nthis.normalizeTeamCollection = normalizeTeamCollection;`, normContext);
const originalAlpha = { name: 'Alpha', pts: 840, history: [{ tournament: 'Major', place: 1 }] };
const migrated = normContext.normalizeTeamCollection([originalAlpha, 'Alpha', 'Phantom', '  Phantom  ', 'Legacy Club', null, 17]);
assert(migrated.teams.length === 3, 'duplicates and malformed primitives must be removed from imported team arrays');
assert(migrated.teams[0] === originalAlpha && migrated.teams[0].pts === 840, 'existing full team record must retain identity, rating and history');
assert(migrated.teams[1].name === 'Phantom' && migrated.teams[1].pts === 500, 'string-only legacy team must become a real team record');
assert(migrated.teams[1].players.length === 0 && migrated.teams[1].__v77LegacyRoster.length === 5 && migrated.teams[1].__v77LegacyRoster[0] === 'P1', 'known legacy string team should preserve its mapped roster for the existing player-layer pass');
assert(migrated.teams[2].name === 'Legacy Club' && migrated.teams[2].__v77LegacyRoster[0] === 'L1', 'EMDB-only legacy string should recover its roster');
assert(migrated.converted.join(',') === 'Phantom,Legacy Club' && migrated.dropped === 4, 'normalizer should report converted and discarded records');
assert(/const normalizedImport = normalizeTeamCollection\(parsed\.teams\)/.test(core), 'manual JSON import must call the shared team normalizer');
assert(/teams\.forEach\(t => \{ try \{ if \(typeof ensurePlayerLayer/.test(core), 'imported team records must initialize their player layer');

// Execute the actual VRS module with an intentionally mixed legacy global team array.
const teamA = { name: 'Alpha', pts: 800, players: [] };
const teamB = { name: 'Beta', pts: 700, players: [] };
const mixedTeams = [teamA, 'Phantom', null, teamB, 'Change The Game'];
const window = {};
const sandbox = {
  window, teams: mixedTeams,
  seasonState: { calendar: { currentMs: 1_800_000_000_000 } },
  console: { info() {}, warn() {} },
  Date, Math, Number, String, Object, Array, Map, Set, JSON, Promise,
  typeof: undefined
};
vm.runInNewContext(read('js/competition/vrs.js'), sandbox, { filename: 'js/competition/vrs.js' });
assert(window.CS2VRSModel && window.CS2VRSModel.version >= 2, 'VRS model should load with mixed legacy team data');
const audit = window.CS2VRSModel.audit();
assert(audit.validTeams === 2 && audit.invalidCount === 3, 'VRS audit should isolate non-object entries');
const result = window.CS2VRSModel.applyMatch(teamA, teamB, 'Alpha', { name: 'Legacy cup', prizePool: 100000, isLAN: true }, {});
assert(result && result.winner === 'Alpha', 'VRS should process matches despite unrelated string entries in the global team array');
assert(mixedTeams[1] === 'Phantom' && mixedTeams[4] === 'Change The Game', 'VRS must never mutate primitive string entries');
assert(Array.isArray(teamA.vrsLedger.matches) && teamA.vrsLedger.matches.length > 0, 'valid team should receive the VRS match entry');

const hub = read('js/competition/hltv-hub.js');
const guard = read('js/core/storage-guard.js');
assert(/if \(archiveDbOk\)/.test(hub), 'IndexedDB must prevent synchronous localStorage archive serialization during migration');
assert(/localStorage\.removeItem\(ARCHIVE_KEY\)/.test(hub), 'redundant localStorage archive must be removed after IndexedDB migration');
assert(/archiveLocalCacheDisabled = true/.test(hub), 'QuotaExceededError must disable repeated localStorage archive writes');
assert(/tx\.oncomplete = \(\) => resolve\(true\)/.test(hub) && /const BATCH = 20/.test(hub), 'archive history must be committed in small transactions before removing its local copy');
assert(/hubArchiveUsesIndexedDB/.test(guard), 'storage compaction must understand when archive data is safely in IndexedDB');
assert(/основной автосейв продолжает использовать IndexedDB/.test(guard), 'quota warning must not falsely imply data loss when browser autosave is active');
const html = require('./lib/project').pageSources();
assert(html.includes('js/base/game.js') && html.includes('js/competition/hltv-hub.js') && html.includes('js/competition/vrs.js') && html.includes('js/core/storage-guard.js'), 'all patched scripts must use the matching cache busting versions');

console.log('PASS v76: old JSON team-name strings are converted into team records and duplicates are removed');
console.log('PASS v76: VRS safely ignores malformed global entries and still applies valid background matches');
console.log('PASS v76/v77: archive history migrates to IndexedDB in small batches and avoids repeated oversized localStorage writes');
