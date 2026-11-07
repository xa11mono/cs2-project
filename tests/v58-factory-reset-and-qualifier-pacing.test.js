const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const reset = read('js/manager/v58-factory-reset.js');
const html = read('index.html');
const hub = read('js/manager/v25-hltv-hub.js');
const autosave = read('js/manager/v56-autosave.js');
const calendar = read('js/manager/v15-training-calendar-layer.js');
const smartSkip = read('js/manager/v17-smart-calendar-skip.js');
const parallel = read('js/manager/v21-parallel-tournaments-academies-layer.js');
const batch = read('js/manager/v33-time.js');
const site = read('js/manager/v27-hltv-site.js');

assert(/await window\.v56PrepareFactoryReset\(\)/.test(reset), 'factory reset must await autosave file cleanup');
assert(/await window\.v56ClearAutosaveDatabase\(\)/.test(reset) && /window\.v56ClearAutosaveDatabase = clearAutosaveDatabase/.test(autosave), 'factory reset must clear the persistent autosave directory handle and settings');
assert(/await window\.hubArchiveClear\(\)/.test(reset), 'factory reset must await the IndexedDB bracket archive clear');
assert(/clearIndexedDBStore\('cs2_hltv_brackets_v1', 'events'\)/.test(reset), 'factory reset must retry archive-store cleanup if the archive module cannot clear it');
assert(/RESET_KEY_RE/.test(reset) && /cs2\(\_|\-|\$\)/.test(reset), 'factory reset must clear the whole CS2 storage namespace, not only a short key list');
assert(/window\.resetToDefault = resetToDefaultV58/.test(reset), 'reset buttons must use the v58 async reset handler');
assert(/hubArchiveClear = \(\) =>[\s\S]*?tx\.oncomplete = \(\) => resolve\(true\)/.test(hub), 'archive clear must resolve after the IndexedDB transaction commits');
assert(/v56PrepareFactoryReset/.test(autosave) && /handle\.removeEntry\(name\)/.test(autosave), 'autosave helper must delete the current and backup JSON files before reset');
assert(/v58-factory-reset\.js/.test(html) && html.indexOf('v58-factory-reset.js') > html.indexOf('v56-autosave.js'), 'reset override must load after autosave and legacy reset definitions');
assert(/CS2 Manager <i class="pt-ver">v86<\/i>/.test(site), 'visible header version must be v81');

// Pause must freeze the calendar itself and all background competition ticks.
assert(/if\(c\.paused \|\| !Number\.isFinite\(mins\)/.test(calendar), 'calendar must reject advances while paused');
assert(/if \(v21Cal\(\)\.paused\) return false/.test(parallel), 'background tournament runner must reject paused ticks unconditionally');
assert(/if\(v17Calendar\(\)\.paused\) return false/.test(smartSkip), 'smart day skip must not progress while paused');
assert(/if \(calendarIsPaused\(\)\) \{ label\('Сначала снимите паузу'\); return; \}/.test(batch), 'multi-day skip must not begin during pause');
assert(!/allowPaused:\s*true/.test(batch), 'batch mode must not force background matches through a pause');

// Qualifiers now use a dedicated slower cadence and are not completed by the Tier-1 start callback.
assert(/V22_QUAL_SLOTS_PER_DAY=1/.test(parallel), 'qualifier bracket scheduling should limit itself to one two-match slot per day');
assert(/at\(18,12\)/.test(parallel) && /at\(9,13\)/.test(parallel), 'Open and Closed qualifiers must be spread over a longer pre-event window');
assert(/v17HandleQualifierWindow\(step,stepIndex\)/.test(smartSkip), 'the next-event shortcut must stop at qualifiers');
assert(/v17RebaseOverdueQualifiers/.test(smartSkip), 'late-created untouched qualifier schedules must be rebased rather than bulk simulated');
const finishQuals = parallel.slice(parallel.indexOf('window.v35FinishQuals=i=>'), parallel.indexOf('window.v35QualInfo=i=>'));
assert(!/v22Advance\(/.test(finishQuals), 'main event creation must only snapshot qualification progress, never instantly simulate all missed rounds');

// Runtime: all persistent CS2 keys are removed only after asynchronous archive/autosave cleanup.
function memoryStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(String(k)) ? map.get(String(k)) : null; },
    setItem(k, v) { map.set(String(k), String(v)); },
    removeItem(k) { map.delete(String(k)); },
    snapshot() { return Object.fromEntries(map); }
  };
}
(async () => {
  const localStorage = memoryStorage({
    cs2_season_state_v61: '{old-season}',
    cs2_current_tournament_v34: '{old-current-tournament}',
    cs2_hltv_archive_v1: '{old-events}',
    cs2_player_awards_v1: '{old-awards}',
    cs2_news_v1: '{old-news}',
    cs2_custom_tournaments_v59: '{old-tournaments}',
    cs2_custom_rosters_v59: '{old-rosters}',
    cs2_fan_profile_v1: '{old-fan-profile}',
    cs2media_autofill: '{old-cache}',
    v29_news_v1: '{old-news}',
    unrelated_user_setting: 'keep'
  });
  const sessionStorage = memoryStorage({ cs2_session_state: 'old', unrelated_session: 'keep' });
  const calls = [];
  const seasonState = { calendar: { paused: false } };
  const currentTournament = { broadcast: { running: true } };
  const win = {
    confirm() { calls.push('confirm'); return true; },
    location: { reload() { calls.push('reload'); } },
    stopTournamentBroadcast() { calls.push('stop-broadcast'); },
    async v56PrepareFactoryReset() { calls.push('autosave-cleaned'); return { filesCleared: true }; },
    async v56ClearAutosaveDatabase() { calls.push('autosave-db-cleared'); return true; },
    twAwardsClear() { calls.push('awards-cleared'); },
    V29NewsClear() { calls.push('news-cleared'); },
    async hubArchiveClear() { await Promise.resolve(); calls.push('archive-committed'); return true; },
    hltvSiteReset() { calls.push('site-reset'); }
  };
  const context = { window: win, localStorage, sessionStorage, seasonState, currentTournament, console, Promise, Date };
  vm.runInNewContext(reset, context, { filename: 'v58-factory-reset.js' });
  const ok = await win.resetToDefault();
  assert(ok === true, 'confirmed factory reset must complete');
  assert(seasonState.calendar.paused === true, 'reset must pause the clock before clearing');
  assert(calls.indexOf('autosave-cleaned') < calls.indexOf('archive-committed'), 'autosave cleanup must complete before archive reset');
  assert(calls.indexOf('autosave-db-cleared') < calls.indexOf('reload'), 'autosave database must be cleared before reload');
  assert(calls.indexOf('archive-committed') < calls.indexOf('reload'), 'reload must wait for IndexedDB transaction completion');
  const remaining = localStorage.snapshot();
  assert(Object.keys(remaining).length === 2 && remaining.cs2_news_suppress_boot_once === '1' && remaining.unrelated_user_setting === 'keep', 'all game state keys must be removed while unrelated browser settings are preserved');
  assert(sessionStorage.snapshot().unrelated_session === 'keep' && sessionStorage.length === 1, 'unrelated session data must be preserved');
  assert(win.__CS2_FACTORY_RESET_IN_PROGRESS === true, 'reset barrier must prevent background writers during cleanup');

  // A declined confirmation must leave the database unchanged.
  const storage2 = memoryStorage({ cs2_season_state_v61: 'do-not-delete' });
  let reload2 = 0;
  const win2 = { confirm() { return false; }, location: { reload() { reload2++; } } };
  vm.runInNewContext(reset, { window: win2, localStorage: storage2, sessionStorage: memoryStorage(), console, Promise, Date }, { filename: 'v58-reset-cancel.js' });
  const cancelled = await win2.resetToDefault();
  assert(cancelled === false && reload2 === 0 && storage2.getItem('cs2_season_state_v61') === 'do-not-delete', 'cancelled reset must not mutate data');

  console.log('PASS v58: factory reset waits for autosave and IndexedDB cleanup and removes all game database keys');
  console.log('PASS v58: qualifier cadence is slower, calendar pause is unconditional, and T1 startup no longer backfills quals');
})().catch(err => { console.error(err); process.exitCode = 1; });
