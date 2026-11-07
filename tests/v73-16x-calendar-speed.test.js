const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const source = read('js/manager/v15-training-calendar-layer.js');
const html = read('index.html');
const css = read('css/v15-training-calendar-styles.css');
const portal = read('js/manager/v27-hltv-site.js');
assert(/V15_SPEEDS\s*=\s*\[1,2,5,16\]/.test(source), '16x must be an allowed persisted calendar speed');
assert(/data-calendar-speed="16"[^>]*onclick="setGameCalendarSpeed\(16\)"/.test(html), 'calendar UI must expose the 16x speed button');
assert(/\[1, 2, 5, 16\]\.map/.test(portal), 'HLTV portal speed selector must also expose 16x');
assert(/v27-hltv-site\.js\?v=95/.test(html), 'portal script cache version must be advanced');
assert(/v15-training-calendar-layer\.js\?v=95/.test(html) && /v15-training-calendar-styles\.css\?v=95/.test(html), 'cache-busting versions must be advanced');
assert(/Number\(c\.speed\)>=16\?250:1000/.test(source), '16x mode must tick the virtual clock every 250ms');
assert(/deferRender:true/.test(source) && /v15UpdateClockDisplay/.test(source), 'calendar DOM rendering must be throttled while clock ticks stay precise');
assert(/repeat\(4,1fr\)/.test(css), 'calendar layout must make room for the fourth speed option');

let wall = 1_000_000;
const timers = [];
const seasonState = { currentSeason: 1, tournamentIndex: 1, seasonSchedule: [], calendar: { currentMs: 1_800_000_000_000, speed: 1, paused: false, lastWallMs: wall } };
const document = { getElementById() { return null; }, querySelectorAll() { return []; } };
const window = { v57BatchCalendarSkip: false };
class FakeDate extends Date { static now() { return wall; } }
const context = {
  window, document, seasonState, teams: [], currentTournament: null,
  Date: FakeDate, Math, Number, String, Object, Array, Map, Set, Promise,
  console: { warn() {}, info() {} }, localStorage: { setItem() {} },
  setInterval(fn, ms) { const t = { fn, ms, active: true }; timers.push(t); return t; },
  clearInterval(t) { if (t) t.active = false; },
  setTimeout() { return 1; },
  saveSeasonState() { context.saved = (context.saved || 0) + 1; },
  saveTeams() {}, ensurePlayerLayer() {},
};
vm.runInNewContext(source, context, { filename: 'v15-training-calendar-layer.js' });
assert(timers.some(t => t.ms === 1000 && t.active), 'normal mode should retain the 1-second ticker');
window.setGameCalendarSpeed(16);
const active16 = timers.filter(t => t.active).slice(-1)[0];
assert(active16 && active16.ms === 250, 'switching to 16x must reconfigure the clock ticker to 250ms');
const before = seasonState.calendar.currentMs;
wall += 250;
active16.fn();
const elapsedMinutes = (seasonState.calendar.currentMs - before) / 60000;
assert(Math.abs(elapsedMinutes - 2.4) < 1e-8, `16x should advance 2.4 game minutes per 250ms tick, got ${elapsedMinutes}`);
window.setGameCalendarSpeed(5);
const active5 = timers.filter(t => t.active).slice(-1)[0];
assert(active5 && active5.ms === 1000 && seasonState.calendar.speed === 5, 'switching back to 5x must restore the 1-second ticker');
console.log('PASS v73: 16x is available, persists through the calendar setting, advances at 16x, and uses a 250ms event-resolution cadence');
