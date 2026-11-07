const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const trophySource = read('js/manager/v26-trophies.js');
const autoSource = read('js/manager/v56-autosave.js');
const coreSource = read('js/manager/auto_script_1.js');
const html = read('index.html');
const css = read('css/v56-autosave.css');

// Dynamic trophy generation: each organizer has its own disjoint silhouette family and palette.
const gameWindow = {};
vm.runInNewContext(trophySource, { window: gameWindow, console });
assert(gameWindow.TW && typeof gameWindow.TW.specFor === 'function', 'TW generator must remain available');
const eslEvents = ['IEM Cologne','IEM Katowice','ESL Pro League Season 21','ESL Pro League Season 22','ESL One Cologne','IEM Dallas','ESL Challenger League Finals','IEM Chengdu','ESL Pro League Season 23','IEM Rio','ESL One Stockholm','IEM Masters Lisbon'];
const eslSpecs = eslEvents.map((event, i) => gameWindow.TW.specFor(event, i + 1, 'regular'));
const eslShapes = new Set(eslSpecs.map(x => x.arch));
const eslMetals = new Set(eslSpecs.map(x => x.metal));
const eslAccents = new Set(eslSpecs.map(x => x.accent));
assert(eslShapes.size >= 3, `ESL/IEM should offer several variations inside its own family; got ${[...eslShapes].join(', ')}`);
assert(eslMetals.size >= 3, 'same organizer must offer multiple metal finishes');
assert(eslAccents.size >= 2, 'same organizer must offer multiple organizer accent colors');
eslSpecs.forEach(spec => {
  const svg = gameWindow.TW.render(spec);
  assert(svg.startsWith('<svg') && svg.includes('</svg>'), `valid SVG expected for ${spec.arch}`);
});
const brands = {
  BLAST: ['BLAST Premier Copenhagen', ['prism','poly','wings']],
  PGL: ['PGL Major Copenhagen', ['spire','obelisk','ingot']],
  ESL: ['IEM Katowice', ['chalice','cup','coin','shield','plate']],
  StarLadder: ['StarLadder StarSeries', ['star','laurel']],
  PerfectWorld: ['Perfect World Major', ['orb','globe']],
  EWC: ['Esports World Cup', ['column']],
  Thunderpick: ['Thunderpick World Championship', ['flame']],
  FISSURE: ['FISSURE Playground', ['regal']],
  BetBoom: ['BetBoom Dacha', ['gem']],
  CCT: ['CCT Global Finals', ['hoop']],
  RES: ['RES Regional Series', ['helix']],
  DreamHack: ['DreamHack Open', ['bowl']]
};
const observed = {};
for (const [brand, [event, allowed]] of Object.entries(brands)) {
  const spec = gameWindow.TW.specFor(event, 3, 'regular');
  assert(allowed.includes(spec.arch), `${brand} must keep its own silhouette family; got ${spec.arch}`);
  observed[brand] = new Set(allowed);
}
const brandNames = Object.keys(observed);
for (let i = 0; i < brandNames.length; i++) for (let j = i + 1; j < brandNames.length; j++) {
  const a = brandNames[i], b = brandNames[j];
  assert(![...observed[a]].some(x => observed[b].has(x)), `${a} and ${b} must not share trophy silhouettes`);
}
// Lower-tier events keep the organizer's palette/shape identity, but never render cup/chalice variants.
const lowBrands = [['BLAST Premier Qualifier','prism','poly'],['PGL Regional Qualifier','spire','obelisk'],['ESL Open Qualifier','coin','shield','plate'],['StarLadder Open Qualifier','star','laurel']];
for (const [event, ...allowed] of lowBrands) {
  const spec = gameWindow.TW.specFor(event, 1, 'tier2');
  assert(allowed.includes(spec.arch), `${event} should use organizer-specific non-cup placeholder, got ${spec.arch}`);
  assert(!['cup','chalice'].includes(spec.arch), `${event} cannot display a cup for Tier-2 / qualifiers`);
}
const sampleA = gameWindow.TW.specFor('IEM Cologne', 2, 'regular');
const sampleB = gameWindow.TW.specFor('IEM Cologne', 2, 'regular');
assert(JSON.stringify(sampleA) === JSON.stringify(sampleB), 'trophy choice must be deterministic for the same event and season');
// Folder autosave must be wired into settings and write a standard importable full save.
assert(/showDirectoryPicker/.test(autoSource) && /createWritable/.test(autoSource), 'folder autosave must use the browser file-system picker and writable files');
assert(/saveBrowserSnapshot\(payload, reason\)/.test(autoSource) && /browserAutosave/.test(autoSource) && /browserBackup/.test(autoSource), 'full autosave and rolling backup must work in IndexedDB even without folder access');
assert(/restoreBrowserSnapshot/.test(autoSource) && /importSnapshotText/.test(autoSource), 'browser-only autosaves must be restorable through the normal import path');
assert(!/alert\('Автосохранение в папку поддерживается/.test(autoSource), 'unsupported folder access must not block the settings flow with an alert');
assert(/\(\(\) => \{ if \(factoryResetting \|\| document\.hidden\) return; if\(bulkSimulationOwnsThread\(\)\)/.test(autoSource) && /CS2Loop/.test(autoSource), 'periodic full autosave must be throttled, skip hidden tabs, and pause during all bulk simulation');
assert(/CS2Manager-Autosave\.json/.test(autoSource) && /CS2Manager-Autosave\.backup\.json/.test(autoSource), 'autosave and backup filenames must be stable');
assert(/localStorageSnapshot/.test(autoSource) && /hubArchiveExport/.test(autoSource), 'autosave must include browser key state and full IndexedDB bracket archive');
assert(/v56RestoreAutosave/.test(autoSource), 'folder autosave must expose restore action');
assert(/v56ChooseAutosaveFolder/.test(html) && /v56RestoreAutosave/.test(html) && /v56-autosave-status/.test(html), 'settings UI must expose folder selection and restore');
assert(/v56-autosave\.js/.test(html) && /v56-autosave\.css/.test(html), 'v56 autosave script and styles must load');
assert(/parsed\.localStorageSnapshot/.test(coreSource), 'standard import must restore the extra localStorage snapshot');
assert(/data-state="ok"/.test(css), 'autosave UI must expose success status styling');
console.log('v56 trophy variety + autosave tests passed');
