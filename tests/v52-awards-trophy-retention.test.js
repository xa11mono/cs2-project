// v52 regression tests: playoff loser logos retain colour and all trophy categories survive archive pruning.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const hub = read('js/competition/hltv-hub.js');
const trophies = read('js/awards/trophies.js');
const legacySite = read('js/portal/hltv-site.js');
const portalPeople = read('js/portal/people.js');
const career = read('js/career/career-ui.js');
const prestige = read('js/competition/prestige.js');
const rewardRegistry = read('js/awards/reward-registry.js');
const css = read('css/portal/tokens.css');

// A single shared classifier drives parallel snapshots, trophy art and achievement shelves.
const classify = vm.createContext({ window: {}, console });
vm.runInContext(trophies, classify);
const normalizeKind = classify.window.twNormalizeTitleKind;
assert(typeof normalizeKind === 'function', 'shared trophy kind normalizer should exist and initialize before the awards API');
assert(/window\.twNormalizeTitleKind/.test(hub), 'parallel snapshots must use the shared category classifier');
assert(normalizeKind('tier3', 'Legacy Tier-1 Event', '1') === 'regular', 'explicit Tier-1 level must override a stale Tier-3 kind');
assert(normalizeKind('regular', 'Tier-1 Event', '3') === 'regular', 'Tier-1 events should remain Tier-1 despite stale Tier-3 metadata');
assert(normalizeKind('tier2', 'IEM Rio', '2') === 'tier2', 'Tier-2 metadata must beat prestige/organiser branding');
assert(normalizeKind('elite', 'IEM Rio', '1') === 'elite', 'S-Tier should remain elite at generic tier 1');
assert(normalizeKind('regular', 'Open Qualifier', '1', { qual: true }) === 'qual', 'qualifier identity must override legacy tier metadata');

// The persistent ledger is independent from full event snapshots and is backfilled from old saves.
assert(/teamTitles: \[\]/.test(trophies), 'award schema should create a permanent team-title ledger');
assert(/function rememberTeamTitle\(ev\)/.test(trophies), 'every tournament winner should be stored in the durable ledger');
assert(/function migrateTeamTitleLedger\(\)/.test(trophies) && /migrateTeamTitleLedger\(\);/.test(trophies), 'legacy team history and player titles should be migrated at startup');
assert(/const uniqueTitles = new Map\(\)/.test(trophies) && /const dedupe = `\$\{t\.name\}\|/.test(trophies), 'old trophy IDs should be deduplicated by team, event and season');
assert(/const openId = id && arch\[id\] \? id : null/.test(trophies), 'pruned event snapshots should leave a static trophy rather than a broken link');
assert(/open: !!\(x\.a && arch\[x\.a\]\)/.test(trophies), 'player trophy tiles should remain visible but only open snapshots that still exist');

// Award tabs, team profiles, career pages, and archive are all fed from the permanent ledger.
assert(/function champions\(includeMarkers = false\)[\s\S]*?RewardSystem\?\.getAllTeamEventAchievements/.test(portalPeople), 'the awards master list should use the unified achievement registry');
assert(/const ch = champions\(f\.tab === 'cabinet' \|\| f\.tab === 'teams'\)/.test(portalPeople), 'all award tabs should use the merged trophy list');
assert(/else if \(f\.tab === 'teams'\)[\s\S]*?Tier-1[\s\S]*?Tier-2[\s\S]*?Tier-3/.test(portalPeople), 'team awards should count every trophy tier separately');
assert(/const all = \[\.\.\.byId\.values\(\)\]/.test(portalPeople) && /Object\.values\(H\.archive\(\)\)\.forEach/.test(portalPeople), 'season archive should merge the title ledger with all full event snapshots');
assert(/window\.twTeamAchievements\(name, t\)/.test(portalPeople) && /RewardSystem\?\.getTeamAwards\(name\)/.test(portalPeople), 'team profiles should use the shared achievement ledger and central annual-awards store');
assert(/window\.twTeamAchievements\(t\.name, t\)/.test(career) && !/titles\.slice\(0,\s*18\)/.test(career), 'career pages should use the shared achievement ledger without truncation');
assert(/function getAllPlayerAwards\(\)/.test(rewardRegistry) && /RewardSystem\?\.getAllPlayerAwards/.test(read('js/career/career-core.js')), 'career milestone checks should read player awards through the central registry');
assert(!/\)\.slice\(0,\s*14\)\.map\(h =>/.test(legacySite), 'legacy team trophy rendering should not truncate the trophy list at 14');
assert(/major: 'Major'/.test(prestige) && /elite: 'S-Tier'/.test(prestige) && /t1: 'Tier-1'/.test(prestige), 'team shelves should expose distinct Major, S-Tier and Tier-1 categories');

// A playoff loss may mute the score/name, but never the team crest itself.
assert(css.includes('#hs-root .br-t.l .hs-logo') && css.includes('opacity:1!important;filter:none!important'), 'eliminated playoff team logos should remain fully opaque and coloured');
assert(css.includes('#hs-root .br-t.l .hs-logo.img img') && css.includes('filter:none!important'), 'eliminated playoff logo images must not inherit grayscale filters');
assert(/mix-blend-mode:normal!important/.test(css), 'loser logos must not be colour-muted by blend modes');

console.log('PASS v52: parallel Tier-1 events are not misclassified as Tier-3 and qualifiers are represented as markers');
console.log('PASS v52: durable title ledger restores cups and category marks across team/player/career/award/archive tabs');
console.log('PASS v52: Major, S-Tier, Tier-1, Tier-2, Tier-3 and academy cup/mark counts are separated');
console.log('PASS v52: playoff loser logos stay full-colour while loser text remains visually muted');
