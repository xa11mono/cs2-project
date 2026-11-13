/* v58 · Full factory reset + stale browser/autosave database cleanup */
(() => {
  'use strict';

  const RESET_KEY_RE = /^(?:cs2(?:_|-|$)|cs2media(?:_|-|$)|v29_(?:news|fan)(?:_|$))/i;

  function clearIndexedDBStore(dbName, storeName) {
    return new Promise(resolve => {
      if (!window.indexedDB) { resolve(false); return; }
      let request;
      try { request = window.indexedDB.open(dbName); }
      catch (e) { resolve(false); return; }
      request.onblocked = () => resolve(false);
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          try { db.close(); } catch (e) {}
          resolve(true); // No store means there is no persisted archive to restore.
          return;
        }
        try {
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).clear();
          tx.oncomplete = () => { try { db.close(); } catch (e) {} resolve(true); };
          tx.onerror = tx.onabort = () => { try { db.close(); } catch (e) {} resolve(false); };
        } catch (e) {
          try { db.close(); } catch (e2) {}
          resolve(false);
        }
      };
    });
  }

  function clearStorageNamespace(storage) {
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && RESET_KEY_RE.test(key)) keys.push(key);
    }
    keys.forEach(key => storage.removeItem(key));
    return keys.length;
  }

  async function resetToDefaultV58() {
    let accepted = false;
    try {
      accepted = window.confirm(
        'Полностью сбросить базу CS2 Manager к исходному состоянию?\n\n' +
        'Будут удалены сезоны, турниры, сетки, матчи, трансферы, новости, награды, Pick’em и все игровые сохранения.\n' +
        'Папка автосохранения тоже будет очищена, если браузер разрешит доступ.\n\n' +
        'Это действие нельзя отменить.'
      );
    } catch (e) {}
    if (!accepted) return false;

    // Stop every writer before clearing storage; otherwise autosave/IDB timers
    // could write the previous season back during the reload window.
    window.__CS2_FACTORY_RESET_IN_PROGRESS = true;
    try {
      if (typeof seasonState !== 'undefined' && seasonState?.calendar) seasonState.calendar.paused = true;
    } catch (e) {}
    try {
      const b = typeof currentTournament !== 'undefined' ? currentTournament?.broadcast : null;
      if (b?.running && typeof window.stopTournamentBroadcast === 'function') window.stopTournamentBroadcast(false);
    } catch (e) {}

    let autosaveResult = null;
    try {
      if (typeof window.v56PrepareFactoryReset === 'function') {
        autosaveResult = await window.v56PrepareFactoryReset();
      }
    } catch (e) {
      console.warn('[v58 reset] autosave cleanup failed:', e);
    }
    let autosaveDbCleared = false;
    try {
      if (typeof window.v56ClearAutosaveDatabase === 'function') {
        autosaveDbCleared = !!(await window.v56ClearAutosaveDatabase());
      }
    } catch (e) {
      console.warn('[v58 reset] autosave IndexedDB cleanup failed:', e);
    }

    // Cancel delayed writes and clear the persistent bracket store before reload.
    try { window.twAwardsClear?.(); } catch (e) {}
    try { window.V29NewsClear?.(); } catch (e) {}
    let archiveCleared = false;
    try {
      if (typeof window.hubArchiveClear === 'function') archiveCleared = !!(await window.hubArchiveClear());
    } catch (e) {
      console.warn('[v58 reset] IndexedDB archive cleanup failed:', e);
    }
    if (!archiveCleared) {
      try { archiveCleared = await clearIndexedDBStore('cs2_hltv_brackets_v1', 'events'); }
      catch (e) { console.warn('[v58 reset] fallback archive cleanup failed:', e); }
    }
    try { window.hltvSiteReset?.(); } catch (e) {}
    // v145: основное сохранение (IndexedDB js/boot/store.js) и его аварийные копии — иначе после перезагрузки
    // возвращался прежний сезон с новостями
    let storeCleared = false;
    try { storeCleared = !!(await window.CS2Store?.clearAll?.()); } catch (e) { console.warn('[v58 reset] store cleanup failed:', e); }

    // The database is spread across versioned localStorage keys. Clear the
    // complete game namespace instead of maintaining a fragile hand-written list.
    try {
      clearStorageNamespace(localStorage);
      // Suppress synthetic first-run news on the first boot after reset.
      localStorage.setItem('cs2_news_suppress_boot_once', '1');
    } catch (e) {
      console.warn('[v58 reset] localStorage cleanup failed:', e);
    }
    try {
      clearStorageNamespace(sessionStorage);
    } catch (e) {}

    // Custom media assets (cs2-media IndexedDB) are deliberately preserved;
    // they are user artwork, not part of the game database. Autosave JSON files
    // have been deleted or their inaccessible folder handle was forgotten.
    console.info('[v58 reset] completed', { archiveCleared, autosaveDbCleared, storeCleared, autosaveResult });
    try { window.location.reload(); }
    catch (e) { location.reload(); }
    return true;
  }

  // полный сброс заменяет исходный (глобальная привязка обновляется — onclick="resetToDefault()" вызывает новый)
  CS2.patch('resetToDefault', () => resetToDefaultV58, { optional: true });
})();
