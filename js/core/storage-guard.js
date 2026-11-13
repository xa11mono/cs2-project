(() => {
'use strict';
/* =====================================================================
   v29 · Защита сохранений (грузится ПЕРВЫМ, до auto_script_1)
   Было: после 3–5 сезонов localStorage (≈5 млн символов на сайт; у file:// —
   общий лимит на ВСЕ локальные HTML-файлы) переполнялся. saveTeams() вызывается
   после каждого матча и падал с QuotaExceededError → матч получал победителя,
   но не продвигался по сетке (пустые слоты, «Быстро всё» останавливался),
   а матч в эфире бесконечно висел на финальном счёте.
   Стало: запись никогда не роняет игру. При переполнении: удаляем старые ключи
   прошлых версий игры, ужимаем историю/архив и пробуем ещё раз. Если места всё
   равно нет — игра продолжает работать, а сверху появляется подсказка сделать экспорт.
   ===================================================================== */
const ACTIVE_KEYS = new Set([
  'cs2_season_state_v61', 'cs2_season_teams_v61', 'cs2_transfer_market_v1', 'cs2_hltv_archive_v1',
  'cs2_player_awards_v1', 'cs2_rating_balance_v4_applied', 'cs2_mirage_roles_v2',
  'cs2_news_v1', 'cs2_fan_v1'
]);
const ARCHIVE_KEY = 'cs2_hltv_archive_v1';
const proto = Storage.prototype;
const rawSet = proto.setItem;
const isQuota = e => !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014 || /quota/i.test(String(e.message)));
let warned = false;

function usage() { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } } catch (e) {} return n; }
function dropLegacyKeys() { // ключи старых версий этой же игры (cs2_season_state_v60 и т. п.)
  let freed = 0;
  try {
    const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
    ks.forEach(k => { if (/^cs2_/i.test(k) && !ACTIVE_KEYS.has(k)) { freed += (localStorage.getItem(k) || '').length; localStorage.removeItem(k); } });
  } catch (e) {}
  return freed;
}
function trimTeams(level) {
  try {
    if (typeof teams === 'undefined' || !Array.isArray(teams)) return;
    const cur = (typeof seasonState !== 'undefined' && seasonState?.currentSeason) || 1;
    const keepSeasons = level >= 3 ? 1 : 2;
    teams.forEach(t => {
      if (Array.isArray(t.history)) {
        t.history = t.history.filter(h => {
          if (!h) return false;
          if (h.place === 1 && !h.isBootcamp) return true;                         // трофеи храним всегда
          const old = (Number(h.season) || cur) < cur - keepSeasons;
          const background = String(h.archiveId || '').startsWith('P-') || /Фонов/.test(h.placeTitle || '');
          if (background) return !old && level < 3;
          return !old || (level < 2 && (h.isMajor || h.isElite));
        });
      }
      if (Array.isArray(t.mapHistory)) t.mapHistory = t.mapHistory.slice(0, level >= 2 ? 12 : 30);
    });
  } catch (e) {}
}
function trimArchive(level) {
  try {
    if (typeof window.hubArchiveUsesIndexedDB === 'function' && window.hubArchiveUsesIndexedDB()) {
      try { localStorage.removeItem(ARCHIVE_KEY); } catch (e) {}
      return; // полная история находится в IndexedDB; локальный дубликат только съедает квоту
    }
    const source = window.hubArchiveExport ? window.hubArchiveExport() : null;
    if (!source) return;
    // Ужимается только localStorage-кэш. При наличии IndexedDB полная коллекция
    // сеток остаётся нетронутой; в резервном режиме первыми удаляются старые
    // академические/Tier-3 записи, а Major и Tier-1 имеют наивысший приоритет.
    const arch = { ...source };
    const cur = (typeof seasonState !== 'undefined' && seasonState?.currentSeason) || 1;
    const rank = s => ({ major: 100, elite: 90, regular: 80, tier2: 65, tier3: 50, academy: 40, qual: 20, show: 10, nations: 10 }[s?.prestige || s?.kind] || 30);
    const ids = Object.keys(arch).sort((a, b) => rank(arch[a]) - rank(arch[b]) || (Number(arch[a]?.ts) || 0) - (Number(arch[b]?.ts) || 0));
    if (level >= 2) {
      const target = Math.ceil(ids.length * (level >= 3 ? 0.45 : 0.25));
      ids.slice(0, target).forEach(id => { const s = arch[id]; if (s && rank(s) < 80) delete arch[id]; });
    } else {
      ids.forEach(id => { const s = arch[id]; if (s && ['tier3', 'academy'].includes(s.prestige || s.kind) && (Number(s.season) || cur) < cur - 1) delete arch[id]; });
    }
    // Резервный кэш для браузеров без IndexedDB ограничен 350 KB. Считаем
    // размер отдельных записей один раз, затем сериализуем итоговый объект.
    const compact = {}; let used = 2, count = 0;
    const recent = Object.keys(arch).sort((a, b) => rank(arch[b]) - rank(arch[a]) || (Number(arch[b]?.ts) || 0) - (Number(arch[a]?.ts) || 0));
    for (const id of recent) {
      let keyJson, snapJson;
      try { keyJson = JSON.stringify(String(id)); snapJson = JSON.stringify(arch[id]); } catch (e) { continue; }
      if (typeof keyJson !== 'string' || typeof snapJson !== 'string') continue;
      const extra = (count ? 1 : 0) + keyJson.length + 1 + snapJson.length;
      if (used + extra > 350000) continue;
      compact[id] = arch[id]; used += extra; count++;
    }
    try { rawSet.call(localStorage, ARCHIVE_KEY, JSON.stringify(compact)); } catch (e) {}
  } catch (e) {}
}
function trimMisc(level) {
  try { if (typeof transferState !== 'undefined' && Array.isArray(transferState.history)) transferState.history = transferState.history.slice(0, level >= 2 ? 40 : 80); } catch (e) {}
  try { if (typeof window.v29NewsTrim === 'function') window.v29NewsTrim(level); } catch (e) {}
}
function freshValue(key, value) { // после ужатия данных в памяти — сериализуем заново
  try {
    if (key === 'cs2_season_teams_v61' && typeof teams !== 'undefined') return JSON.stringify(teams);
    if (key === 'cs2_season_state_v61' && typeof seasonState !== 'undefined') return JSON.stringify(seasonState);
    if (key === 'cs2_transfer_market_v1' && typeof transferState !== 'undefined') return JSON.stringify(transferState);
  } catch (e) {}
  return value;
}
function warn() {
  if (warned) return; warned = true;
  const hasBrowserBackup = typeof window.v56AutosaveNow === 'function' || !!window.indexedDB;
  console.warn(hasBrowserBackup
    ? '[v29] localStorage переполнен; основной автосейв продолжает использовать IndexedDB'
    : '[v29] localStorage переполнен — часть данных может не сохраниться');
  const show = () => {
    const box = document.getElementById('event-alert-box');
    if (box) { box.style.display = 'block'; box.innerHTML = hasBrowserBackup
      ? '⚠️ <b>Локальный кэш браузера заполнен.</b> Игра продолжает сохранять основной автосейв в IndexedDB. Для дополнительной защиты периодически делайте экспорт JSON.'
      : '⚠️ <b>Хранилище браузера заполнено.</b> Игра продолжает работать, но часть прогресса может не сохраниться. Откройте ☰ → 💾 Экспорт, чтобы сохранить сейв в файл.'; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
}
let compacting = false;
// v84: если запись уже не влезла после всех уровней ужатия, повторные попытки того же или большего
// объёма не запускают дорогое ужатие заново (раньше это давало подвисание при каждом сохранении).
const failedLen = Object.create(null);
proto.setItem = function (key, value) {
  try { const r = rawSet.call(this, key, value); delete failedLen[key]; return r; }
  catch (e) {
    if (!isQuota(e) || this !== window.localStorage || compacting) throw e;
    const len = String(value || '').length;
    if (failedLen[key] && len >= failedLen[key] * 0.97 && key !== ARCHIVE_KEY) { warn(); return; }
    compacting = true;
    try {
      for (let level = 1; level <= 3; level++) {
        if (level === 1) dropLegacyKeys();
        trimTeams(level); trimMisc(level);
        if (key !== ARCHIVE_KEY) trimArchive(level);
        try { rawSet.call(this, key, freshValue(key, value)); console.info('[v29] сохранение после ужатия данных, уровень', level, '• занято ~', usage()); return; }
        catch (e2) { if (!isQuota(e2)) throw e2; }
      }
    } finally { compacting = false; }
    failedLen[key] = len;
    if (key === ARCHIVE_KEY) throw e;     // у архива HLTV своя логика вытеснения
    warn();                                // остальные записи не роняют игру
  }
};
window.v29StorageUsage = usage;
window.v29CompactSaves = (level = 1) => { dropLegacyKeys(); trimTeams(level); trimMisc(level); trimArchive(level); };
})();
