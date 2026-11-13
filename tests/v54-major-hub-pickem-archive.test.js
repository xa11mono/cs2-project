// v54 regression tests: grouped Major navigation, medal-first Pick'em, durable full bracket history.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const hub = read('js/competition/hltv-hub.js');
const portal = read('js/portal/hltv-site.js');
const events = read('js/portal/events.js');
const people = read('js/portal/people.js');
const pickem = read('js/fan/pickem.js');
const badges = read('js/fan/medals.js');
const guard = read('js/core/storage-guard.js');
const sim = read('js/base/game.js');
const html = read('index.html');
const css = read('css/portal/tokens.css');

// One Major group contains the three related destinations; Pick'em remains date-gated.
assert(/const NAV_MAJOR = \[\['pickem'[^;]*'majorpath'[^;]*'majors'/.test(portal), 'Major dropdown must group Pick’em, Major Path and Major winners');
assert(/class="pt-dd pt-major"/.test(portal) && /data-dd="major"/.test(portal), 'Major dropdown must render in top-level navigation');
assert(/data-major-pickem hidden/.test(portal) && /pickemBtn\.hidden = !available/.test(portal), 'Pick’em must appear only during its availability window');
assert(!/pt-pickem-btn/.test(portal) && !/majorpath.*Путь на мейджор/.test(portal.slice(portal.indexOf('const NAV_MORE'), portal.indexOf('const NAV_MAJOR'))), 'Major features must not be duplicated in the old standalone or More menu');
assert(/const sec = SECTION_OF\[S\.page\] \|\| S\.page/.test(portal) && /major = NAV_MAJOR\.some/.test(portal), 'Major submenu remains highlighted for its child pages');

// Pick'em must show the real event coin, not the previous season-rank widget.
assert(!/const rankBox =/.test(pickem) && !/\$\{rankBox\}/.test(pickem), 'old Pick’em seasonal rank box must be removed');
assert(/class="pk-medal-card"/.test(pickem) && /Медаль за Pick’Em/.test(pickem), 'Pick’em page must show the Major medal panel');
assert(/V35Badges\?\.trackCoin\?\.\(\)/.test(pickem), 'the current Major coin must be initialized before medal rendering');
assert(/headerHtml,\s*trackCoin,/.test(badges), 'V35Badges must expose event coin tracking to Pick’em');
assert(/function pickemEventPoints\(major\)/.test(badges) && /return Math\.max\(0, Number\.isFinite\(explicit\) \? explicit : 0, staged\)/.test(badges) && /earnedPoints/.test(sim), 'Major medal must use a persisted event-specific Pick’em score and recover old staged points');
assert(/major\.earnedPoints = Math\.max/.test(sim) && /scoredPlayoffPicks/.test(sim), 'stage and playoff Pick’em points must persist and resist duplicate scoring');
assert(/const coinSig/.test(portal) && /pickemScore, coinSig/.test(portal), 'live refresh signature must include score and coin progress');
assert(!/id="pickem-modal"/.test(html) && /window\.hltvSiteOpen\('pickem'\)/.test(sim), 'legacy modal has been removed and its opener redirects to the new Pick’em page');
assert(/\.pt-major \.pt-menu button\[data-major-pickem\]/.test(css) && /pk-head-note/.test(css), 'Major dropdown and medal-first Pick’em header styling must exist');

// Full archived snapshots are stored independently from the bounded localStorage cache.
assert(/indexedDB\.open\(ARCHIVE_DB, 1\)/.test(hub) && /createObjectStore\(ARCHIVE_STORE, \{ keyPath: 'id' \}\)/.test(hub), 'full bracket archive must use a per-event IndexedDB store');
assert(/window\.hubArchiveReady = archiveDbReady/.test(hub), 'archive hydration promise must be exposed to dependent UI and export');
assert(/archiveDbReady\.then\(\(\) => \{ if \(archiveDbOk && archive\[snap\.id\]\) dbWriteSnapshots/.test(hub), 'snapshots created before IndexedDB opens must still be persisted after readiness');
assert(/const localSnapshots = Object\.values\(archive\)/.test(hub) && /dbWriteSnapshots\(localAndDirty, false\)/.test(hub), 'legacy localStorage snapshots and pending writes must migrate into IndexedDB');
assert(/window\.hubArchiveExport = \(\) => \(\{ \.\.\.archive \}\)/.test(hub), 'archive export must return a copy so quota cleanup cannot mutate in-memory history');
assert(/window\.hubArchivePersist = id/.test(hub), 'post-archive roster metadata must persist to the full archive');
assert(/Promise\.resolve\(window\.hubArchiveReady\)\.then/.test(portal) && /window\.hltvSiteReset\?\.\(\)/.test(portal), 'portal pages must refresh once the full bracket history has loaded');
assert(/Object\.values\(H\.archive\(\)\)\.forEach\(s =>/.test(people) && /data-event="\$\{esc\(s\.id\)\}"/.test(people), 'archive page must list every stored bracket and make its row openable');
assert(/H\.S\.ar\.season \?\? seasons\[0\]/.test(people), 'archive page defaults to the latest season so new completed brackets are visible');
assert(/отсутствует в текущем сохранении/.test(events), 'missing legacy brackets must not be blamed on v54 archive eviction');
assert(/Object\.values\(arch\)\.forEach\(s =>/.test(events), 'events directory must merge every restored archive snapshot');
assert(/async function exportData\(\)[\s\S]*?await window\.hubArchiveReady/.test(sim), 'save export must wait for full archive hydration');
assert(!/rest\.slice\(0, Math\.ceil\(rest\.length \* 0\.25\)\)/.test(guard), 'quota cleanup must no longer blindly evict a quarter of all tournament brackets');

console.log('PASS v54: Major menu groups Pick’em, Major Path and Major winners with correct availability state');
console.log('PASS v54: Pick’em page uses the active Major medal and removes the legacy seasonal badge/modal');
console.log('PASS v54: full tournament brackets migrate to IndexedDB and survive localStorage cache pruning');
console.log('PASS v54: events/archive pages and save export expose the restored full bracket history');
