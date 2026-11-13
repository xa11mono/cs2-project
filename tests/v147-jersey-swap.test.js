const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'media', 'jersey-swap.js'), 'utf8');
const listeners = new Map();
const window = {
  V31Media: { url: () => 'assets/media/players/player.webp', full: () => null },
  CS2_MEDIA: { players: { Player: { file: 'assets/media/players/player.webp' } } },
  CS2_TEAM_TINT: {},
  CS2: { on: (name, fn) => listeners.set(name, fn) },
  CS2Loop: { every: () => {} },
  HS: null
};
const context = {
  window,
  globalThis: window,
  console,
  setTimeout: () => 0,
  fetch: async () => ({ ok: true, json: async () => ({ configured: false }) }),
  btoa: value => Buffer.from(value, 'binary').toString('base64'),
  Date,
  Math,
  Uint8Array,
  Promise
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'js/media/jersey-swap.js' });

const teamA = { name: 'Team A', players: [{ nick: 'Player', status: 'STARTER' }] };
const seasonState = {};
const transferState = { freeAgents: [] };
context.teams = [teamA];
context.seasonState = seasonState;
context.transferState = transferState;
const api = window.CS2JerseySwap;

assert(api, 'subsystem is exposed');
assert.strictEqual(api.portraitKey('Player', 'Team A', 'portrait'), 'player|team a|portrait');
assert.strictEqual(api.photoFor(teamA.players[0], 'original.webp', 'portrait'), 'original.webp');

api.reconcile();
assert.strictEqual(api.state().bootstrapped, true, 'first run creates a baseline without mass generation');
assert.strictEqual(api.state().lastSeen.player, 'Team A', 'baseline remembers initial team');

const teamB = { name: 'Team B', players: [] };
teamA.players = [];
teamB.players = [{ nick: 'Player', status: 'STARTER' }];
context.teams = [teamA, teamB];
api.reconcile();
assert.strictEqual(api.state().lastSeen.player, 'Team B', 'transfer is detected through roster reconciliation');
assert.strictEqual(api.status().queue, 1, 'transfer queues one portrait job');
assert.strictEqual(Object.keys(api.state().pending).length, 1, 'queued work is persisted in the career save');

const key = api.portraitKey('Player', 'Team B', 'portrait');
api.state().portraits[key] = {
  url: 'assets/media/generated-jerseys/player-team-b-test.webp',
  kitFingerprint: api.kitFingerprint('Team B')
};
assert.strictEqual(api.photoFor(teamB.players[0], 'original.webp', 'portrait'),
  'assets/media/generated-jerseys/player-team-b-test.webp', 'generated portrait replaces source only for current team');

api.state().kits['Team B'] = { description: 'red kit', primaryColor: '#ff0000', secondaryColor: '#000000', version: 2 };
assert.strictEqual(api.photoFor(teamB.players[0], 'original.webp', 'portrait'), 'original.webp',
  'changing kit invalidates cached portrait and falls back to original until regeneration');

(async () => {
  const { safeSlug, resolveSourcePath, sniffImage } = await import('../tools/jerseys/server.mjs');
  assert.strictEqual(safeSlug('Team Falcons'), 'team-falcons');
  assert.throws(() => resolveSourcePath('../../.env', path.resolve(__dirname, '..')), /Only original player images/);
  assert.strictEqual(resolveSourcePath('assets/media/players/player.webp', path.resolve(__dirname, '..')),
    path.resolve(__dirname, '..', 'assets', 'media', 'players', 'player.webp'));
  assert.strictEqual(sniffImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])).ext, 'png');
  assert.strictEqual(sniffImage(Buffer.from('not an image')), null);
  console.log('PASS v147 jersey swap transfer tracking, persisted queue, fallback, cache and source-path validation');
})().catch(error => { console.error(error); process.exitCode = 1; });
