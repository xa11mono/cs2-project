const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function createSandbox() {
  const store = new Map();
  const localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    get length() { return store.size; },
    key: i => [...store.keys()][i] ?? null
  };
  const nodes = new Map();
  const document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, { checked: undefined, textContent: '', dataset: {} }); return nodes.get(id); } };
  const ctx = {
    console, localStorage, document, Date, Math, JSON, Object, Array, Set, Map, String, Number, RegExp, Blob,
    URL, setTimeout, clearTimeout,
    teams: [{ name: 'Team Spirit', pts: 1000, style: 'Tactical', coach: { name: 'hally', flag: '🇷🇺' }, players: [{ nick: 'sh1ro', status: 'STARTER' }, { nick: 'magixx' }, { nick: 'tN1R' }, { nick: 'zont1x' }, { nick: 'donk' }] }],
    seasonState: { currentSeason: 1, tournamentIndex: 1, seasonSchedule: [null, { type: 'major', name: 'Old Major 2026', format: 'swiss' }, { type: 'regular', name: 'Old Tier One 2026', format: 'single' }, { type: 'elite', name: 'Old S-Tier 2026', format: 'double' }], parallelSchedule: [] },
    currentTournament: null,
    TEAM_ROSTER_2026: {}, PLAYER_META_2026: {}, TEAM_REGION_FLAG: {}, DEFAULT_TEAMS: [],
    TOUR_DATABASE: { major: [], elite: [], regular: [], bounty: [], weak: [] }, MAP_POOL: ['Mirage', 'Inferno'], PLAYER_LAYER_VERSION: 2,
    COACHES_2026: { 'Team Spirit': { name: 'hally', flag: '🇷🇺' } },
    generateMapStats: () => ({ Mirage: 50, Inferno: 50 }),
    createPlayerFromNick: (team, nick, index) => ({ nick, role: 'Rifler', firepower: 75, status: 'STARTER', age: 22 + index }),
    ensurePlayerLayer: () => {}, countryFlag: c => c === 'RU' ? '🇷🇺' : '🌍', getTeamFlag: () => '🌍',
    saveTeams: () => {}, renderRating: () => {}, saveSeasonState: () => {},
    generateCoach: name => ({ name: `legacy-${name}`, flag: '🌍' }),
    generateDynamicSeasonSchedule: () => { ctx.seasonState.seasonSchedule = [null, ...ctx.seasonState.seasonSchedule.slice(1)]; return ctx.seasonState.seasonSchedule; }
  };
  ctx.window = ctx;
  ctx.HS = { invalidate() {}, render() {} };
  ctx.CS2ParallelTournamentPools = { extend(groups) { ctx.lastParallel = groups; }, list() { return {}; } };
  ctx.window.CS2ParallelTournamentPools = ctx.CS2ParallelTournamentPools;
  require('./lib/project').attachKernel(ctx);   // v144: модули расширяют функции через CS2.patch
  vm.createContext(ctx);
  const modulePath = path.join(__dirname, '..', 'js/core/database-import.js');
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), ctx, { filename: modulePath });
  return { ctx, store, nodes };
}

async function fakeFile(fileName) {
  const full = path.join(__dirname, '..', fileName);
  return { name: path.basename(full), text: async () => fs.readFileSync(full, 'utf8') };
}

const siteSource = fs.readFileSync(path.join(__dirname, '..', 'js/portal/hltv-site.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(__dirname, '..', 'js/portal/game-ui.js'), 'utf8');
const htmlSource = require('./lib/project').pageSources();
assert.match(siteSource, /NAV_MORE = \[.*\['settings', 'Сейвы и базы'\]/, 'save/base settings should be directly discoverable under More');
assert.match(uiSource, /Выбрать папку для автосейва/, 'folder picker must be present on the visible settings page');
assert.match(uiSource, /v59-roster-file-page[\s\S]*?multiple/, 'roster importer should allow selecting multiple files');
assert.ok(htmlSource.includes('js/core/database-import.js'), 'v59 database importer must be loaded with a cache-busting version');

(async () => {
  // The real EMDB and legacy CS2_REAL JS assignment formats parse as passive objects.
  {
    const { ctx } = createSandbox();
    await ctx.v59ImportRosters(await fakeFile('js/data/real-players-2026.js'));
    assert.ok(ctx.TEAM_ROSTER_2026['Rare Atom']?.length >= 5, 'CS2_REAL rosters should be imported');
    assert.ok(ctx.PLAYER_META_2026.donk, 'player metadata should be imported');
    assert.ok(ctx.teams.length > 1, 'unknown teams should be added to the team pool');
    assert.equal(JSON.parse(ctx.localStorage.getItem('cs2_custom_rosters_v59')).rosters['Rare Atom'].length, 5);
  }
  {
    const { ctx } = createSandbox();
    await ctx.v59ImportRosters(await fakeFile('js/data/emdb-2026.js'));
    assert.ok(ctx.TEAM_ROSTER_2026.NRG?.length >= 5, 'EMDB rosters should be imported');
    assert.ok(ctx.PLAYER_META_2026.hallzerk, 'EMDB player metadata should be imported');
    const stored = JSON.parse(ctx.localStorage.getItem('cs2_custom_rosters_v59'));
    assert.ok(Object.keys(stored.rosters).length > 40);
    assert.ok(Object.keys(stored.meta).length < 1500, 'persistent metadata should be limited to roster/bench/reserve players');
  }
  {
    const { ctx } = createSandbox();
    await ctx.v59ImportTournaments(await fakeFile('js/base/game.js'));
    assert.ok(ctx.TOUR_DATABASE.major.length > 0, 'TOUR_DATABASE JS object should be imported');
    assert.ok(ctx.TOUR_DATABASE.elite.length > 0, 'S-Tier pool should be imported');
    assert.ok(ctx.TOUR_DATABASE.weak.length > 0, 'weak/open pool should be imported');
    assert.match(ctx.seasonState.seasonSchedule[1].name, /Major/);
    assert.match(ctx.seasonState.seasonSchedule[2].name, /2026/);
  }
  {
    const { ctx } = createSandbox();
    ctx.teams.push({ name: 'Team Falcons', pts: 900, coach: { name: 'hally' }, players: [] });
    const audit = ctx.v59CoachAudit();
    assert.ok(audit.length > 0, 'coach audit should detect duplicates');
    ctx.v59EnsureUniqueCoaches();
    assert.equal(ctx.v59CoachAudit().length, 0, 'coach cleanup should remove duplicates');
  }

  {
    const { ctx } = createSandbox();
    const source = `
      const TEAM_ROSTER_2026 = { Aurora: ['neo1','neo2','neo3','neo4','neo5'] };
      const PLAYER_META_2026 = { neo1: { realName: 'Neo Player', country: 'SE', skill: 81, role: 'AWPer' } };
      const DEFAULT_TEAMS = [{ name: 'Aurora', pts: 640, style: 'Aggressive' }];
      const COACHES_2026 = { Aurora: { name: 'Coach Aurora', flag: '🇸🇪' } };
    `;
    await ctx.v59ImportRosters({ name: 'custom-base.js', text: async () => source });
    const aurora = ctx.teams.find(t => t.name === 'Aurora');
    assert.ok(aurora, 'direct TEAM_ROSTER_2026 assignments should create a team');
    assert.equal(aurora.players.length, 5);
    assert.equal(aurora.players[0].realName, 'Neo Player');
    assert.equal(aurora.players[0].role, 'AWPer');
    assert.equal(aurora.coach.name, 'Coach Aurora');
    assert.equal(aurora.pts, 640);
  }
  {
    const { ctx } = createSandbox();
    const source = `const TOUR_DATABASE = { major: ['PGL Major'], elite: ['IEM Katowice'], regular: ['BLAST Open'], tier2: ['CCT Europe'], tier3: ['Entry League'] };`;
    await ctx.v59ImportTournaments({ name: 'tournaments.js', text: async () => source });
    assert.ok(ctx.TOUR_DATABASE.major.includes('PGL Major'));
    assert.ok(ctx.TOUR_DATABASE.elite.includes('IEM Katowice'));
    assert.ok(ctx.lastParallel.tier2.includes('CCT Europe'));
    assert.ok(ctx.lastParallel.tier3.includes('Entry League'));
  }


  {
    const { ctx } = createSandbox();
    const make = (name, data) => ({ name, text: async () => data });
    await ctx.v59ImportRosters([
      make('rosters.js', `const TEAM_ROSTER_2026 = { Aurora: ['neo1','neo2','neo3','neo4','neo5'] };`),
      make('players.js', `const PLAYER_META_2026 = { neo1: { realName: 'Neo Player', country: 'SE', skill: 81, role: 'AWPer' } };`),
      make('teams.js', JSON.stringify({ teams: [{ name: 'Aurora', pts: 640, style: 'Aggressive' }], coaches: { Aurora: { name: 'Coach Aurora', flag: '🇸🇪' } } }))
    ]);
    const aurora = ctx.teams.find(t => t.name === 'Aurora');
    assert.ok(aurora, 'multiple selected files should be merged into a single roster database');
    assert.equal(aurora.players[0].realName, 'Neo Player');
    assert.equal(aurora.coach.name, 'Coach Aurora');
    assert.equal(aurora.pts, 640);
  }
  {
    const { ctx } = createSandbox();
    const make = (name, data) => ({ name, text: async () => data });
    await ctx.v59ImportTournaments([
      make('major.js', `const TOUR_DATABASE = { major: ['PGL Major'] };`),
      make('parallel.json', JSON.stringify({ tier2: ['CCT Europe'], tier3: ['Entry League'], academy: ['Spirit Academy'] }))
    ]);
    assert.ok(ctx.TOUR_DATABASE.major.includes('PGL Major'));
    assert.ok(ctx.lastParallel.tier2.includes('CCT Europe'));
    assert.ok(ctx.lastParallel.tier3.includes('Entry League'));
    assert.ok(ctx.lastParallel.academy.includes('Spirit Academy'));
  }


  {
    const { ctx } = createSandbox();
    await ctx.v59ImportRosters({ name: 'compact-rosters.js', text: async () => `const CS2_ROSTERS = { Aurora: ['p1','p2','p3','p4','p5'] };` });
    assert.ok(ctx.teams.some(t => t.name === 'Aurora'), 'CS2_ROSTERS compact map should be imported as a roster dictionary');
  }
  {
    const { ctx } = createSandbox();
    await ctx.v59ImportTournaments({ name: 'compact-tournaments.js', text: async () => `const CS2_TOURNAMENTS = [{ name: 'PGL Major', tier: 'Major' }, { name: 'CCT Europe', tier: 'Tier-2' }];` });
    assert.ok(ctx.TOUR_DATABASE.major.includes('PGL Major'), 'CS2_TOURNAMENTS array should map to the tournament catalog');
    assert.ok(ctx.lastParallel.tier2.includes('CCT Europe'));
  }

  console.log('v59 database import tests passed');
})().catch(err => { console.error(err); process.exitCode = 1; });
