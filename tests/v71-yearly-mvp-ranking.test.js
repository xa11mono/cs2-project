// v71 regression: year-end Top-20/POTY must reward earned MVPs and migrate old saved rankings.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const year = 2028;
const stats = { P: {
  m0NESY: { nick: 'm0NESY', p: { role: 'AWPer', age: 23 }, team: 'Falcons', byYear: { [year]: { maps: 140, rating: 1.34 } }, matches: [{ year, kind: 'regular', team: 'Falcons' }] },
  donk: { nick: 'donk', p: { role: 'Rifler', age: 18 }, team: 'Spirit', byYear: { [year]: { maps: 140, rating: 1.26 } }, matches: [{ year, kind: 'regular', team: 'Spirit' }] },
  ropz: { nick: 'ropz', p: { role: 'Rifler', age: 25 }, team: 'Vitality', byYear: { [year]: { maps: 110, rating: 1.20 } }, matches: [{ year, kind: 'regular', team: 'Vitality' }] }
} };
const db = { p: {
  m0NESY: { mvp: [], ti: [], top: [{ r: 1, y: year, team: 'Falcons' }], aw: [{ type: 'poty', y: year, team: 'Falcons' }] },
  donk: { mvp: Array.from({ length: 6 }, (_, i) => ({ id: `mvp-${i}`, n: `Tier-1 ${i + 1}`, y: year, s: 3, k: 'regular', team: 'Spirit' })), ti: [], top: [{ r: 2, y: year, team: 'Spirit' }], aw: [] },
  ropz: { mvp: [], ti: [], top: [], aw: [] }
}, calendarYears: [year], yearRankingVersions: { [year]: 1 } };
const captured = { commits: [], saves: 0 };
const win = {
  twAwardsExport: () => db,
  twAwardsImport: value => { Object.assign(db, value); },
  RewardSystem: {
    getAllPlayerAwards: () => db.p,
    getCalendarYears: () => db.calendarYears.slice(),
    getYearRankingVersion: y => Number(db.yearRankingVersions?.[y]) || 0,
    commitPlayerYearAwards: (y, top, awards, options) => {
      captured.commits.push({ year: y, top: top.map(x => ({ ...x })), awards: awards.map(x => ({ ...x })), options: { ...options } });
      Object.values(db.p).forEach(rec => {
        rec.top = (rec.top || []).filter(x => Number(x.y) !== Number(y));
        rec.aw = (rec.aw || []).filter(x => !(Number(x.y) === Number(y) && (options.replaceTypes || []).includes(x.type)));
      });
      top.forEach(x => { (db.p[x.nick] ||= { mvp: [], ti: [], top: [], aw: [] }).top.unshift({ ...x, y: y }); });
      awards.forEach(x => { (db.p[x.nick] ||= { mvp: [], ti: [], top: [], aw: [] }).aw.unshift({ ...x }); });
      db.yearRankingVersions = { ...(db.yearRankingVersions || {}), [y]: options.rankingVersion };
      return true;
    }
  },
  TW: { AWARD_DEF: {} }
};
const H = {
  invalidate() {}, stats: () => stats, yearOf: s => 2025 + Number(s),
  line: x => ({ maps: x.maps, rating: x.rating, impact: 0.2, okpr: 0.5, dpr: 0.6, clA: 10, clW: 5, kast: 75, apr: 0.2, adr: 80 }) ,
  PAGES: {}, S: { aw: {} }, nav() {}, render() {}
};
win.HS = H;
const sandbox = { window: win, document: { addEventListener() {} }, seasonState: { currentSeason: 4 }, saveSeasonState: () => captured.saves++, console, setInterval: () => 0 };
vm.runInNewContext(read('js/awards/calendar-year-fixes.js'), sandbox, { filename: 'js/awards/calendar-year-fixes.js' });

const rows = win.V36Fixes.yearRows(year);
assert(rows[0].nick === 'donk', `six MVPs should move donk above higher-rating m0NESY; got #1 ${rows[0]?.nick}`);
assert(rows[0].mvpCount === 6 && rows[0].mvpPoints === 54, 'all six Tier-1 MVPs should contribute ranking points');
assert(rows.find(x => x.nick === 'm0NESY').mvpCount === 0, 'm0NESY must have zero MVPs in this scenario');
const result = win.V36Fixes.generateYearAwards(year);
assert(result && result.top[0].nick === 'donk', 'already-published old year ranking should be rebuilt with new MVP-aware formula');
assert(captured.commits.length === 1 && captured.commits[0].options.rebuild === true, 'legacy committed year should be rebuilt atomically');
assert(captured.commits[0].awards.find(x => x.type === 'poty')?.nick === 'donk', 'POTY should follow the MVP-aware overall ranking');
assert(captured.commits[0].awards.find(x => x.type === 'awper')?.nick === 'm0NESY', 'role awards should remain based on role/performance rather than MVP bonus');
assert(win.V36Fixes.generateYearAwards(year) === null, 'new formula version should prevent reranking on every load');

const migrationWindow = {
  versions: { 2027: 2, 2028: 1 }, updated: [],
  RewardSystem: { getCalendarYears: () => [2027, 2028], getYearRankingVersion: y => migrationWindow.versions[y] || 0 },
  V36Fixes: { generateYearAwards: y => { migrationWindow.updated.push(y); migrationWindow.versions[y] = 2; return { top: [] }; } }
};
vm.runInNewContext(read('js/awards/yearly-mvp.js'), { window: migrationWindow, console, saveSeasonState() {} });
assert(migrationWindow.updated.length === 1 && migrationWindow.updated[0] === 2028, 'startup migration should only rebuild years with an outdated formula');
assert(migrationWindow.V71YearlyMvpRanking.version === 2, 'the migration module should publish the active formula version');

const people = read('js/portal/people.js');
const hltv = read('js/portal/hltv-site.js');
const trophies = read('js/awards/trophies.js');
assert(/mvpCount \? `\$\{x\.mvpCount\} MVP/.test(people) && /\$\{x\.mvpCount\} MVP/.test(hltv), 'Top-20 displays should show yearly MVP count transparently');
assert(/x\.mvpCount \?/.test(trophies), 'player achievement tooltip should disclose yearly MVP count in Top-20 record');
console.log('PASS v71: six MVPs can outweigh a modest raw-rating lead in annual ranking');
console.log('PASS v71: POTY follows overall ranking while role awards keep role-specific criteria');
console.log('PASS v71: old completed years are rebuilt exactly once with the new formula');
console.log('PASS v71: Top-20 UI displays each player’s annual MVP count');
