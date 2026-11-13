// v53 regression tests: annual awards are generated on season-end, and success dialogs no longer block the player.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const v36 = read('js/awards/calendar-year-fixes.js');
const v53 = read('js/awards/season-awards.js');
const sim = read('js/base/game.js');
const index = read('index.html');

assert(/function tickCalendarAwards\(\)[\s\S]*?return false;/.test(v36), 'December-only awards trigger must be disabled');
assert(/\/awp\|snip\|снайпер\//.test(v36), 'AWP/AWPer/Sniper role aliases should be recognized');
assert(/\['awper', choose\(/.test(v36), 'yearly AWPer category should be present');
assert(/v53-season-awards-and-no-popups\.js/.test(index) && index.indexOf('js/awards/season-awards.js') < index.indexOf('</body>'), 'v53 module must load before body closes');
assert(!/alert\([`"']🎯 Топ-8 команд вышли на LAN-финал/.test(sim), 'Bounty qualification success alert must be removed');
assert(!/alert\([`"']🇨🇭 Швейцарский этап завершен/.test(sim), 'Swiss qualification success alert must be removed');
assert(!/alert\(`🎉 СЕЗОН \$\{seasonState\.currentSeason - 1\} ЗАВЕРШЕН/.test(sim), 'season completion success alert must be removed');
assert(!/alert\(`🏆 Турнир завершен! Чемпион:/.test(sim), 'tournament completion success alert must be removed');

const db = { p: {
  star: { team: 'Team A', aw: [{ type: 'poty', y: 2028, team: 'Team A' }, { type: 'awper', y: 2028, team: 'Team A' }], top: [{ r: 1, y: 2028, team: 'Team A' }] },
  igl: { team: 'Team B', aw: [{ type: 'igl', y: 2028, team: 'Team B' }], top: [{ r: 2, y: 2028, team: 'Team B' }] }
} };
const captured = { stories: [], saves: 0, generated: [] };
const N = {
  H: { 'season-end': d => { captured.baseCalled = d.season; } },
  add: x => { captured.stories.push(x); },
  P: n => ({ t: 'player', v: n }), T: n => ({ t: 'team', v: n })
};
const win = {
  V29News: N,
  HS: { yearOf: s => 2025 + s, invalidate: () => { captured.invalidated = true; } },
  V36Fixes: { generateYearAwards: y => { captured.generated.push(y); return { top: [{ nick: 'star', r: 1, team: 'Team A' }], announcements: [] }; } },
  TW: { AWARD_DEF: { poty: { title: 'Игрок года' }, awper: { title: 'Лучший снайпер года' }, igl: { title: 'Лучший капитан года' } } },
  // The central registry must take precedence over a stale legacy export.
  RewardSystem: { getAllPlayerAwards: () => db.p },
  twAwardsExport: () => ({ p: {} })
};
const seasonState = { currentSeason: 4 };
const sandbox = { window: win, seasonState, saveSeasonState: () => captured.saves++, console };
vm.runInNewContext(v53, sandbox, { filename: 'js/awards/season-awards.js' });
N.H['season-end']({ season: 3, champion: 'Team A' });
assert(captured.baseCalled === 3, 'previous season-end news handlers must still run');
assert(captured.generated.length === 1 && captured.generated[0] === 2028, 'year awards should be generated for the just-ended season');
assert(captured.stories.length === 1 && /HLTV Awards 2028/.test(captured.stories[0].title), 'one news story should announce all yearly awards');
assert(captured.stories[0].body.some(x => /Лучший снайпер года: star/.test(x)), 'news story should list the saved Sniper award');
assert(captured.stories[0].body.some(x => /#1 star/.test(x)), 'news story should include the yearly Top-3 when available');
assert(seasonState.v53AwardNews[2028] === true && captured.saves > 0, 'publishing should persist the once-only key');
N.H['season-end']({ season: 3, champion: 'Team A' });
assert(captured.stories.length === 1 && captured.generated.length === 1, 'repeated event must not duplicate awards or news');

console.log('PASS v53: annual individual awards trigger on season-end, not on a fixed December date');
console.log('PASS v53: AWPer accepts AWP/AWPer/Sniper aliases and all saved winners appear in news');
console.log('PASS v53: news ceremony is saved and cannot duplicate on repeated season-end events');
console.log('PASS v53: completion and playoff qualification success alerts are removed');
