// v60 regression: Tier-2, Tier-3 and every qualifier use category markers, never cup art.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const trophySource = read('js/manager/v26-trophies.js');
const hubSource = read('js/manager/v25-hltv-hub.js');
const siteSource = read('js/manager/v27-hltv-site.js');
const peopleSource = read('js/manager/v30-portal-people.js');
const careerSource = read('js/manager/v31-career-ui.js');
const prestigeSource = read('js/manager/v33-prestige.js');

// The shared category classifier and visual API must initialize before the UI integration guard.
const context = vm.createContext({ window: {}, console });
vm.runInContext(trophySource, context);
const api = context.window;
assert(typeof api.twNormalizeTitleKind === 'function' && api.TW?.trophySvg, 'trophy API must initialize without temporal-dead-zone errors');
assert(api.twNormalizeTitleKind('elite', 'IEM Rio', '2', { name: 'IEM Rio', prestige: 'elite', tier: '2' }) === 'tier2', 'actual Tier-2 metadata must win over stale S-Tier prestige');
assert(api.twNormalizeTitleKind('elite', 'IEM Rio', '3', { name: 'IEM Rio', prestige: 'elite', tier: '3' }) === 'tier3', 'actual Tier-3 metadata must win over stale S-Tier prestige');
assert(api.twNormalizeTitleKind('regular', 'IEM Rio', '2', { name: 'IEM Rio', prestige: 'regular', tier: '2' }) === 'tier2', 'actual Tier-2 metadata must also win over stale generic regular prestige');
assert(api.twNormalizeTitleKind('elite', 'Open Stage', '1', { name: 'Open Stage', prestige: 'elite', isQualifier: true }) === 'qual', 'legacy isQualifier flag must override stale cup prestige');
assert(api.twNormalizeTitleKind('elite', 'Open Qualifier', '1', { name: 'Open Qualifier', prestige: 'elite', tier: '1', qual: true }) === 'qual', 'qualifier flag must win over all tier metadata');
assert(api.twNormalizeTitleKind('regular', 'Tier-1 Event', '3') === 'regular', 'canonical Tier-1 classification must not be demoted by stale metadata');

const lowKinds = ['tier2', 'tier3', 'qual'];
const rendered = lowKinds.map(k => api.TW.trophySvg('Sample event', 5, k));
lowKinds.forEach((kind, i) => {
  assert(api.twIsPlaceholderKind(kind), `${kind} must be recognised as a placeholder category`);
  assert(!api.twIsCupKind(kind), `${kind} must not count as a cup`);
  assert(rendered[i].includes(`tw-placeholder-${kind}`), `${kind} needs its own visual class`);
});
assert(new Set(rendered).size === 3, 'Tier-2, Tier-3 and qualifier placeholders must be visually distinct');
assert(api.twIsCupKind('regular') && api.twIsCupKind('elite') && api.twIsCupKind('major'), 'Major/S-Tier/Tier-1 titles remain cups');

// Exercise the real site trophy helper against legacy archive metadata and verify it bypasses organiser logos.
const begin = siteSource.indexOf('const trophy = (name, season, kind, metadata = null) => {');
const end = siteSource.indexOf('\n};', begin);
assert(begin >= 0 && end > begin, 'shared site trophy helper must exist');
const trophyExpr = siteSource.slice(begin + 'const trophy = '.length, end + 2);
const siteWindow = {
  twNormalizeTitleKind: api.twNormalizeTitleKind,
  twIsPlaceholderKind: api.twIsPlaceholderKind,
  TW: api.TW,
  V31Media: { url: () => 'https://example.invalid/event-logo.svg' }
};
const archived = {
  oldTier2: { id: 'oldTier2', name: 'IEM Rio', season: 5, prestige: 'elite', kind: 'elite', tier: '2' },
  oldTier3: { id: 'oldTier3', name: 'Regional Open', season: 6, prestige: 'elite', kind: 'elite', tier: '3' },
  oldQual: { id: 'oldQual-Q-1', name: 'Europe Open', season: 7, prestige: 'elite', kind: 'elite', tier: '1', qual: true }
};
const siteContext = vm.createContext({
  window: siteWindow,
  archive: () => archived,
  esc: value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
});
const siteTrophy = vm.runInContext(`(${trophyExpr})`, siteContext);
assert(siteTrophy('IEM Rio', 5, 'elite').includes('tw-placeholder-tier2'), 'legacy Tier-2 archive item must not render a cup or organiser image');
assert(siteTrophy('Regional Open', 6, 'elite').includes('tw-placeholder-tier3'), 'legacy Tier-3 archive item must render the Tier-3 sign');
assert(siteTrophy('Europe Open', 7, 'elite').includes('tw-placeholder-qual'), 'legacy qualifier archive item must render the qualifier pass');
assert(siteTrophy('Major Event', 8, 'major').includes('ev-logo'), 'true cup categories may still use organiser event artwork');

// All achievement pages use the same team achievement ledger; qualifiers are tracked by advancement, not by `champion`.
assert(/window\.twNormalizeTitleKind/.test(hubSource), 'parallel tournament archive must use the shared classifier');
assert(/function qualifiedTeams\(snap\)/.test(trophySource) && /snap\.qualified/.test(trophySource), 'qualified-team resolver must collect every advancing team');
assert(/qualifiedTeams\(snap\)\.forEach\(teamName =>/.test(trophySource), 'player achievements must include qualified team rosters');
assert(/window\.twTeamAchievements\(name, t\)/.test(peopleSource), 'team profile must use the shared achievement ledger');
assert(/window\.twTeamAchievements\(t\.name, t\)/.test(careerSource), 'career page must use the shared achievement ledger');
assert(/window\.twTeamAchievements\(name, team\)/.test(prestigeSource), 'prestige shelf must use the shared achievement ledger');
assert(/Кабинет наград и отметок/.test(peopleSource), 'the cabinet must not call non-cup achievements trophies');
assert(/kind === 'qual' \? '🎟️' : kind === 'tier2' \? '🏅' : kind === 'tier3' \? '🔰'/.test(siteSource), 'player award list must use non-cup category marks');

console.log('PASS v60: trophy module initializes shared category APIs before UI integration');
console.log('PASS v60: Tier-2, Tier-3 and all qualifiers render distinct non-cup placeholders');
console.log('PASS v60: legacy archive metadata overrides stale cup classification and event logos');
console.log('PASS v60: team, player, career, cabinet and prestige surfaces share the achievement ledger');
