// v62 regression: all screens and legacy writes converge on one reward registry.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/awards/reward-registry.js'), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const db = {
  p: { star: { mvp: [{ id: 'm1' }], ti: [
    { id: 'legacy-player-title', n: 'Old Event', s: 1, team: 'Alpha' },
    { id: 'archived-player-title', n: 'Old Event', s: 1, team: 'Alpha', a: 'archive-event' }
  ], top: [], aw: [] } },
  teamTitles: [
    { id: 'legacy-team-title', n: 'Old Event', s: 1, team: 'Alpha' },
    { id: 'archived-team-title', n: 'Old Event', s: 1, team: 'Alpha', a: 'archive-event' }
  ], seasons: [], calendarYears: [2027, 2027],
  teamAwards: [
    { id: 'old-one', type: 'team-year', team: 'Alpha', year: 2028, score: 9 },
    { id: 'new-one', type: 'team-year', team: 'Alpha', year: 2028, scorePts: 9, events: 5, createdAt: 22 },
    { id: 'season-one', type: 'team-season', team: 'Alpha', year: 2028, season: 3 }
  ]
};
const teamRows = {
  Alpha: [
    { team: 'Alpha', name: 'Major Test', season: 3, kind: 'major', ts: 30 },
    { team: 'Alpha', name: 'Tier-2 Test', season: 3, kind: 'tier2', marker: true, ts: 20 },
    { team: 'Alpha', name: 'Open Qualifier', season: 3, kind: 'qual', marker: true, ts: 10 }
  ]
};
const playerRows = { star: [{ name: 'Tier-3 Event', season: 2, team: 'Alpha', kind: 'tier3' }] };
let saves = 0;
const win = {
  twAwardsExport: () => db,
  twAwardsImport: value => { Object.assign(db, value); },
  twAddTeamAward: row => { db.teamAwards.unshift({ ...row }); return true; },
  twTeamAchievements: name => teamRows[name] || (name === 'Beta' ? [{ team: 'Beta', name: 'Archived Major', season: 4, kind: 'major' }] : []),
  twPlayerAchievements: nick => playerRows[nick] || [],
  twNormalizeTitleKind: (kind, name, tier, meta) => meta?.qual || /qualifier/i.test(name || '') ? 'qual' : (['major','elite','regular','tier2','tier3','academy','qual'].includes(kind) ? kind : 'regular'),
  twQualifiedTeams: snap => snap.qualified || [],
  hubArchiveExport: () => ({
    a: { id: 'a', name: 'Archived Major', season: 4, prestige: 'major', champion: 'Beta' },
    q: { id: 'q', name: 'Archived Qualifier', season: 4, prestige: 'qual', qualified: ['Alpha'] }
  }),
  V33Awards: { slams: () => ({ list: [{ id: 'gs-alpha', team: 'Alpha', season: 4, at: 999, events: [{ id: 'a', name: 'Grand Slam Event' }] }] }) },
  dispatchEvent: () => {}
};
const seasonState = {
  v37Legacy: { teamAwards: [{ id: 'legacy-a', type: 'team-year', team: 'Beta', year: 2027, season: 2, score: 4 }] },
  hallOfFame: [{ champion: 'Beta', season: 2, year: 2027, scorePts: 44 }]
};
const sandbox = { window: win, seasonState, teams: [{ name: 'Alpha' }, { name: 'Beta' }], saveSeasonState: () => saves++, CustomEvent: function CustomEvent() {}, console, Date };
require('./lib/project').attachKernel(sandbox);   // v144: модули расширяют функции через CS2.patch
vm.runInNewContext(source, sandbox, { filename: 'js/awards/reward-registry.js' });

assert(win.RewardSystem && win.RewardSystem.version === 1, 'unified RewardSystem API should initialize');
assert(db.teamTitles.length === 1 && db.teamTitles[0].id === 'archived-team-title', 'legacy duplicate team achievement ledger should be normalized at startup');
assert(db.p.star.ti.length === 1 && db.p.star.ti[0].a === 'archive-event', 'legacy duplicate player achievement ledger should be normalized at startup');
assert(win.RewardSystem.getCalendarYears().length === 1, 'duplicate year-completion markers should be normalized at startup');
assert(!Object.prototype.hasOwnProperty.call(seasonState.v37Legacy, 'teamAwards'), 'legacy duplicate team-awards storage should be removed after migration');
assert(win.RewardSystem.getTeamAwards('Beta').some(x => x.year === 2027), 'legacy annual team award should migrate into the central ledger');
assert(win.RewardSystem.getTeamSpecialAwards('Beta').filter(x => x.type === 'team-year' && x.year === 2027).length === 1, 'v84: legacy season winner appears once, as the single Team of the Year');
assert(win.RewardSystem.getTeamAwards('Alpha').filter(x => x.type === 'team-year' && x.year === 2028).length === 1, 'logical duplicate team/year awards should collapse to one canonical record');
assert(win.RewardSystem.getTeamAwards('Alpha').find(x => x.type === 'team-year').events === 5, 'richer duplicate record should win during canonicalization');
assert(db.teamAwards.filter(x => x.type === 'team-year' && x.team === 'Alpha' && x.year === 2028).length === 1, 'duplicate legacy records should be cleaned in persisted storage at startup');
assert(win.RewardSystem.getTeamSpecialAwards('Alpha').some(x => x.type === 'grand-slam' && x.category === 'honour'), 'Grand Slam and annual honours should share one special-awards read model');
assert(win.twAddTeamAward({ id: 'different-id', type: 'team-year', team: 'Alpha', year: 2028 }) === false, 'legacy add function must not bypass logical deduplication');
assert(win.twAddTeamAward({ type: 'team-season', team: 'Gamma', year: 2029, season: 4 }) === true, 'legacy add function should still write new awards through registry');
win.twAwardsImport({ p: { star: { mvp: [{ id: 'm1' }], ti: [{ id: 'e1' }], top: [], aw: [] } }, teamTitles: [], seasons: [], teamAwards: [
  { id: 'import-a', type: 'team-year', team: 'Gamma', year: 2029 },
  { id: 'import-b', type: 'team-year', team: 'Gamma', year: 2029, scorePts: 5 }
] });
assert(win.RewardSystem.getTeamAwards('Gamma').filter(x => x.type === 'team-year' && x.year === 2029).length === 1, 'imports must be canonicalized before persistence');
const all = win.RewardSystem.getAllTeamEventAchievements();
assert(all.some(x => x.team === 'Alpha' && x.kind === 'qual' && x.marker), 'qualifier achievements must be normalized as markers');
assert(all.some(x => x.team === 'Beta' && x.name === 'Archived Major'), 'all-team view must include archived champions even when no current team object exists');
assert(win.RewardSystem.getAllTeamEventAchievements({ includeQualifiers: false }).every(x => x.kind !== 'qual'), 'consumer filters should apply centrally');
assert(win.twPlayerAchievements('star')[0].kind === 'tier3' && win.twPlayerAchievements('star')[0].marker, 'legacy player achievement adapter should return normalized player rows');
assert(win.RewardSystem.getPlayerAwards('star').mvp.length === 1, 'player award record should be available from the same service');
assert(win.RewardSystem.getAllPlayerAwards().star.ti.length === 1, 'all-player award queries should use the same service');
assert(win.RewardSystem.addTeamEventAchievement({ team: 'Gamma', name: 'Unified Major', season: 5, kind: 'major', archiveId: 'gamma-major' }), 'team event title writes should go through the registry');
assert(db.teamTitles.some(x => x.team === 'Gamma' && x.a === 'gamma-major'), 'team event title should persist in the canonical ledger');
assert(win.RewardSystem.addPlayerEventAchievement('star', { id: 'event-star', n: 'Unified Major', s: 5, k: 'major', team: 'Gamma' }), 'player event achievement writes should go through the registry');
assert(!win.RewardSystem.addPlayerEventAchievement('star', { id: 'event-star', n: 'Unified Major', s: 5, k: 'major', team: 'Gamma' }), 'player event achievement writes should deduplicate');
assert(win.RewardSystem.addPlayerMvp('star', { id: 'mvp-unified', n: 'Unified Major', s: 5, team: 'Gamma' }), 'MVP writes should go through the registry');
assert(!win.RewardSystem.addPlayerMvp('other', { id: 'mvp-unified', n: 'Unified Major', s: 5, team: 'Gamma' }), 'an event cannot award MVP to two players through duplicate writes');
assert(win.RewardSystem.commitPlayerYearAwards(2030, [{ nick: 'star', r: 1, team: 'Gamma' }], [{ nick: 'star', type: 'poty', team: 'Gamma' }]), 'year awards should commit atomically through the registry');
assert(!win.RewardSystem.commitPlayerYearAwards(2030, [{ nick: 'other', r: 1, team: 'Gamma' }], []), 'the same award year cannot be committed twice');
assert(win.RewardSystem.getCalendarYears().includes(2030) && win.RewardSystem.getPlayerAwards('star').top.some(x => x.y === 2030), 'year commit should persist Top-20, awards and once-only marker together');
assert(win.RewardSystem.getYearRankingVersion(2030) === 1, 'annual ranking formula version should be persisted centrally');
assert(win.RewardSystem.commitPlayerYearAwards(2030, [{ nick: 'other', r: 1, team: 'Gamma', mvpCount: 6, mvpPoints: 54 }], [{ nick: 'other', type: 'poty', team: 'Gamma' }], { rebuild: true, rankingVersion: 2, replaceTypes: ['poty'] }), 'an outdated completed year can be rebuilt with a newer ranking formula');
assert(win.RewardSystem.getPlayerAwards('star').top.every(x => Number(x.y) !== 2030) && win.RewardSystem.getPlayerAwards('other').top.some(x => x.y === 2030 && x.mvpCount === 6), 'rebuild should move old Top-20 entry and persist annual MVP count');
assert(!win.RewardSystem.getPlayerAwards('star').aw.some(x => x.type === 'poty' && Number(x.y) === 2030) && win.RewardSystem.getPlayerAwards('other').aw.some(x => x.type === 'poty' && Number(x.y) === 2030), 'rebuild should replace POTY without duplicating the old winner');
assert(win.RewardSystem.getYearRankingVersion(2030) === 2, 'rebuilt year should persist the new ranking version');
assert(saves > 0, 'legacy award migration should be persisted');
const prestigeSource = fs.readFileSync(path.join(root, 'js/competition/prestige.js'), 'utf8');
const peopleSource = fs.readFileSync(path.join(root, 'js/portal/people.js'), 'utf8');
assert(/honour: 'Особые награды'/.test(prestigeSource) && /honour: all\.filter/.test(prestigeSource), 'annual/Grand Slam honours must stay in their own shelf category, not Tier-1');
const awardsSource = fs.readFileSync(path.join(root, 'js/awards/grand-slam-top20.js'), 'utf8');
assert(/RewardSystem\?\.getTeamSpecialAwards\(name\)/.test(awardsSource), 'team trophy shelves should consume the central special-awards collection');
assert(/RewardSystem\?\.getTeamEventAchievements\(t\.name, t\)/.test(peopleSource), 'team list title counters should use the central team-achievement model');
assert(!/const trophies = wins\.filter/.test(peopleSource), 'team overview must not render a second inline copy of the unified trophy shelf');
const trophiesSource = fs.readFileSync(path.join(root, 'js/awards/trophies.js'), 'utf8');
assert(/RewardSystem\?\.addTeamEventAchievement/.test(trophiesSource) && /RewardSystem\?\.addPlayerEventAchievement/.test(trophiesSource) && /RewardSystem\?\.addPlayerMvp/.test(trophiesSource), 'tournament title, player title and MVP writes should use the common registry');
assert(/RewardSystem\?\.getPlayerAwards\(p\.nick\)/.test(trophiesSource), 'player trophy shelves should read their MVP and annual awards from the common registry');
assert(/teamAwards\.some\(a => a\.type === 'team-season'/.test(trophiesSource), 'legacy Hall-of-Fame rows must not duplicate canonical team-season awards');
const v36Source = fs.readFileSync(path.join(root, 'js/awards/calendar-year-fixes.js'), 'utf8');
assert(/RewardSystem\?\.commitPlayerYearAwards/.test(v36Source), 'Top-20 and yearly individual awards should be written atomically through the registry');
const v27Source = fs.readFileSync(path.join(root, 'js/portal/hltv-site.js'), 'utf8');
assert(/RewardSystem\?\.getTeamSpecialAwards/.test(v27Source), 'HLTV Hall of Fame should read team-season awards from the central registry');
assert(/function teamSeasonAwards\(\)[\s\S]*?RewardSystem\?\.getTeamSpecialAwards/.test(peopleSource), 'portal Hall of Fame and season counts should use the central team-season model');

console.log('PASS v62: legacy team awards migrate into one persisted registry');
console.log('PASS v62: direct adds and imports cannot create duplicate team/year awards');
console.log('PASS v62: team, player and archive achievement views share the normalized registry');
