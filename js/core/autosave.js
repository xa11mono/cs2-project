/* v64 · Надёжное автосохранение: внутренняя копия браузера + необязательная папка.
   Полный сейв всегда хранится в IndexedDB. При наличии File System Access API
   пользователь может дополнительно подключить папку и получать JSON-файл на диске.
*/
(() => {
  'use strict';
  const DB_NAME = 'cs2manager_v56_autosave';
  const DB_VERSION = 1;
  const STORE = 'settings';
  const SAVE_FILE = 'CS2Manager-Autosave.json';
  const BACKUP_FILE = 'CS2Manager-Autosave.backup.json';
  const $ = id => document.getElementById(id);
  let dbPromise = null, folderHandle = null, saveTimer = null, saving = false;
  let saveAgain = false, batchSaveDeferred = false, lastPayload = '', lastBackupAt = 0, lastBrowserBackupAt = 0, lastMessage = '', factoryResetting = false;
  let dirtyVersion = 1, lastBrowserDirtyVersion = 0;
  const nowText = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const bulkSimulationOwnsThread = () => !!(window.v57BatchCalendarSkip || window.__CS2_IMPORT_RECONCILING || window.__CS2_PARALLEL_CATCHUP);

  function status(message, type) {
    lastMessage = message;
    const els = [$('v56-autosave-status'), $('v56-autosave-status-drawer'), $('v56-autosave-status-short')].filter(Boolean);
    els.forEach(el => { el.textContent = message; el.dataset.state = type || 'info'; });
  }
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB недоступна')); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Не удалось открыть IndexedDB'));
    });
    return dbPromise;
  }
  async function dbGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly'), req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function dbPut(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Запись IndexedDB отменена'));
    });
  }
  async function dbDelete(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Удаление IndexedDB отменено'));
    });
  }
  async function getFolder() {
    if (folderHandle) return folderHandle;
    try { folderHandle = (await dbGet('directoryHandle')) || null; } catch (e) { folderHandle = null; }
    return folderHandle;
  }
  async function askFolderPermission(handle) {
    if (!handle) return 'denied';
    try {
      let p = await handle.queryPermission({ mode: 'readwrite' });
      if (p !== 'granted') p = await handle.requestPermission({ mode: 'readwrite' });
      return p;
    } catch (e) { return 'denied'; }
  }
  function cloneCurrentTournament() {
    try {
      const ct = typeof currentTournament !== 'undefined' && currentTournament && !currentTournament.completed ? currentTournament : null;
      if (!ct) return null;
      // Shallow snapshot: IndexedDB performs structured cloning off the hot path.
      // The broadcast contains timers/callbacks and is intentionally excluded.
      const copy = Object.assign({}, ct); delete copy.broadcast; return copy;
    } catch (e) { return null; }
  }
  function localStorageSnapshot() {
    const out = {};
    // Canonical game data is already stored in top-level save fields below.
    // Duplicating the full team graph, archive, awards and news a second time
    // inflated old career snapshots and could block the first autosave on boot.
    const canonical = /^(?:cs2_season_state_v61|cs2_season_teams_v61|cs2_transfer_market_v1|cs2_hltv_archive_v1|cs2_player_awards_v1|cs2_current_tournament_v34|cs2_news(?:_|$))/;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key == null || canonical.test(key)) continue;
        try { out[key] = localStorage.getItem(key); } catch (e) {}
      }
    } catch (e) {}
    return out;
  }
  async function buildPayload() {
    try { await Promise.resolve(window.hubArchiveReady); } catch (e) {}
    const save = {
      teams: typeof teams !== 'undefined' ? teams : [],
      seasonState: typeof seasonState !== 'undefined' ? seasonState : null,
      transferState: typeof transferState !== 'undefined' ? transferState : null,
      hltvArchive: typeof window.hubArchiveExport === 'function' ? (window.hubArchiveExport() || {}) : {},
      playerAwards: typeof window.twAwardsExport === 'function' ? window.twAwardsExport() : null,
      news: typeof window.V29NewsExport === 'function' ? window.V29NewsExport() : null,
      currentTournament: cloneCurrentTournament(),
      localStorageSnapshot: localStorageSnapshot()
    };
    return save;
  }
  async function writeFile(handle, fileName, text) {
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
  }
  // v131: игровая дата снимка (для защиты от перезаписи более позднего снимка более ранним)
  const calOf = rec => { try { let st = rec && rec.payload && rec.payload.seasonState; if (typeof st === 'string') st = JSON.parse(st); return Number(st && st.calendar && st.calendar.currentMs) || 0; } catch (e) { return 0; } };
  async function saveBrowserSnapshot(payload, reason) {
    const now = Date.now();
    const current = await dbGet('browserAutosave');
    // v131: игра открылась на более ранней дате (например, основное хранилище не записалось), а в автокопии — более
    // поздняя игра. Не затираем её автоматически, пока игрок не решил в окне «Найдено более свежее сохранение».
    try {
      const curCal = calOf(current), newCal = calOf({ payload }), okCal = Number(localStorage.getItem('cs2_v131_snapshot_ok') || 0);
      if (curCal && newCal && curCal - newCal > 2 * 864e5 && okCal < curCal && !['manual', 'factory-reset', 'import'].includes(reason)) {
        status('Автокопия с более поздней игрой сохранена — выберите, загрузить ли её', 'warn');
        return;
      }
    } catch (e) {}
    // IndexedDB stores the structured game object directly. Do not stringify a
    // multi-season career on Chromium's UI thread just to persist the browser copy.
    if (current && (current.payload || current.body) && now - lastBrowserBackupAt > 10 * 60 * 1000) {
      await dbPut('browserBackup', current);
      lastBrowserBackupAt = now;
      await dbPut('lastBrowserBackupAt', now);
    }
    await dbPut('browserAutosave', {
      payload,
      savedAt: new Date(now).toISOString(),
      trigger: reason || 'auto'
    });
  }
  async function stringifyPayloadAsync(value) {
    // External JSON-file backups still need JSON text. Move stringify into a Blob
    // worker where supported; file:// browsers without worker support use fallback.
    if (typeof Worker !== 'function' || typeof Blob !== 'function' || !URL?.createObjectURL) return JSON.stringify(value);
    let worker = null, url = null;
    try {
      const source = 'self.onmessage=function(e){try{self.postMessage({ok:true,text:JSON.stringify(e.data)});}catch(err){self.postMessage({ok:false,error:String(err&&err.message||err)});}};';
      url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      worker = new Worker(url);
      const text = await new Promise((resolve, reject) => {
        worker.onmessage = e => e.data?.ok ? resolve(e.data.text) : reject(new Error(e.data?.error || 'Worker stringify failed'));
        worker.onerror = e => reject(e.error || new Error(e.message || 'Worker stringify failed'));
        worker.postMessage(value);
      });
      return text;
    } catch (e) {
      return JSON.stringify(value);
    } finally {
      try { worker?.terminate(); } catch (e) {}
      try { if (url) URL.revokeObjectURL(url); } catch (e) {}
    }
  }
  async function saveNow(reason) {
    if (factoryResetting) return false;
    if (bulkSimulationOwnsThread() && reason !== 'pagehide') { batchSaveDeferred = true; return false; }
    if (saving) { saveAgain = true; return false; }
    saving = true;
    try {
      const handle = await getFolder();
      // In browser-only mode, a periodic call with no dirty writes is a no-op.
      // A batch-final/manual save always snapshots, even if its dirty hooks were deferred.
      if (!handle && reason === 'periodic' && dirtyVersion === lastBrowserDirtyVersion) return true;
      const payload = await buildPayload();

      if (!handle) {
        await saveBrowserSnapshot(payload, reason);
        lastBrowserDirtyVersion = dirtyVersion;
        status('✓ Автосохранено в браузере · полная копия хранится в IndexedDB', 'ok');
        return true;
      }

      // With an external folder, produce JSON off the UI thread where possible.
      const body = await stringifyPayloadAsync(payload);
      const unchanged = body === lastPayload;
      if (!unchanged) {
        await saveBrowserSnapshot(payload, reason);
        lastPayload = body;
      }
      lastBrowserDirtyVersion = dirtyVersion;

      let permission = 'denied';
      try { permission = await handle.queryPermission({ mode: 'readwrite' }); } catch (e) {}
      if (permission !== 'granted') {
        status(`✓ Копия сохранена в браузере · для записи в папку нажмите «Разрешить доступ» · ${handle.name}`, 'warn');
        return true;
      }

      if (unchanged && !['permission-restored', 'folder-selected', 'manual'].includes(reason)) {
        status(`Автосохранение включено · без изменений · ${handle.name}`, 'ok');
        return true;
      }

      try {
        const stamped = await stringifyPayloadAsync({ ...payload, _autosave: { version: 80, savedAt: new Date().toISOString(), trigger: reason || 'auto' } });
        const target = await handle.getFileHandle(SAVE_FILE, { create: true });
        const now = Date.now();
        if (now - lastBackupAt > 10 * 60 * 1000) {
          try {
            const old = await target.getFile();
            if (old && old.size > 20) await writeFile(handle, BACKUP_FILE, await old.text());
            lastBackupAt = now;
            try { await dbPut('lastBackupAt', now); } catch (e) {}
          } catch (e) {}
        }
        const writable = await target.createWritable();
        await writable.write(stamped);
        await writable.close();
        status(`✓ Автосохранено ${nowText()} · ${handle.name}`, 'ok');
      } catch (folderError) {
        status(`✓ Автокопия сохранена в браузере · не удалось обновить файл в папке: ${folderError?.message || folderError}`, 'warn');
      }
      return true;
    } catch (e) {
      console.warn('[v56 autosave] запись не удалась:', e);
      status(`Не удалось сохранить автокопию: ${e?.message || e}`, 'error');
      return false;
    } finally {
      saving = false;
      if (saveAgain && !factoryResetting) { saveAgain = false; scheduleSave(500); }
      else if (factoryResetting) saveAgain = false;
    }
  }
  function scheduleSave(delay) {
    if (factoryResetting) return;
    dirtyVersion++;
    if (bulkSimulationOwnsThread()) { batchSaveDeferred = true; clearTimeout(saveTimer); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow('auto'), Math.max(200, delay || 1600));
  }
  async function chooseFolder() {
    if (typeof window.showDirectoryPicker !== 'function') {
      status('Выбор папки недоступен в этом браузере. Полное автосохранение внутри браузера уже работает; копию на диск можно сделать через «Экспорт в файл».', 'warn');
      await saveNow('browser-fallback');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ id: 'cs2-manager-autosave', mode: 'readwrite' });
      const permission = await askFolderPermission(handle);
      if (permission !== 'granted') {
        status('Браузер не выдал разрешение на запись в эту папку', 'error');
        return;
      }
      folderHandle = handle;
      await dbPut('directoryHandle', handle);
      lastPayload = '';
      lastBackupAt = Number(await dbGet('lastBackupAt')) || 0;
      status(`Папка выбрана: ${handle.name} · автосохранение включено`, 'ok');
      await saveNow('folder-selected');
    } catch (e) {
      if (e && e.name === 'AbortError') status('Выбор папки отменён · автокопия в браузере продолжает работать', 'info');
      else {
        status(`Не удалось подключить папку: ${e?.message || e} · автокопия в браузере продолжает работать`, 'warn');
        await saveNow('folder-picker-fallback');
      }
    }
  }
  async function enableAutosave() {
    const handle = await getFolder();
    if (!handle) return chooseFolder();
    const permission = await askFolderPermission(handle);
    if (permission !== 'granted') {
      status('Нет доступа к папке. Выберите папку заново.', 'warn');
      return;
    }
    status(`Автосохранение включено · ${handle.name}`, 'ok');
    await saveNow('permission-restored');
  }
  function importSnapshotText(body, fileName) {
    if (typeof importData !== 'function') throw new Error('Функция загрузки сейва не найдена');
    const file = new Blob([body], { type: 'application/json' });
    try { Object.defineProperty(file, 'name', { value: fileName || SAVE_FILE }); } catch (e) {}
    importData({ target: { files: [file] } });
    return true;
  }
  async function restoreBrowserSnapshot() {
    const primary = await dbGet('browserAutosave');
    const backup = await dbGet('browserBackup');
    const record = primary && (primary.payload || primary.body) ? primary : (backup && (backup.payload || backup.body) ? backup : null);
    if (!record) return false;
    const body = record.body || JSON.stringify(record.payload);
    importSnapshotText(body, primary === record ? SAVE_FILE : BACKUP_FILE);
    status(`Загрузка автокопии из браузера · ${new Date(record.savedAt || Date.now()).toLocaleString('ru-RU')}`, 'ok');
    return true;
  }
  async function restoreFromFolder() {
    const handle = await getFolder();
    if (!handle) {
      try {
        if (await restoreBrowserSnapshot()) return;
      } catch (e) { status(`Не удалось загрузить автокопию браузера: ${e?.message || e}`, 'error'); return; }
      status('Автокопия пока отсутствует. Сначала сохраните игру или подключите папку.', 'warn');
      return;
    }
    const permission = await askFolderPermission(handle);
    if (permission !== 'granted') {
      try {
        if (await restoreBrowserSnapshot()) return;
      } catch (e) { status(`Нет доступа к папке; ошибка браузерной копии: ${e?.message || e}`, 'error'); return; }
      status('Нет доступа к папке автосохранения и нет резервной копии в браузере', 'error');
      return;
    }
    try {
      let fileHandle;
      try { fileHandle = await handle.getFileHandle(SAVE_FILE); }
      catch (e) { fileHandle = await handle.getFileHandle(BACKUP_FILE); }
      const file = await fileHandle.getFile();
      if (typeof importData === 'function') importData({ target: { files: [file] } });
      else throw new Error('Функция загрузки сейва не найдена');
      status(`Загрузка автосейва: ${file.name}`, 'ok');
    } catch (e) {
      try {
        if (await restoreBrowserSnapshot()) return;
      } catch (fallbackError) {}
      status(`Не удалось прочитать автосейв: ${e?.message || e}`, 'error');
    }
  }

  async function prepareFactoryReset() {
    factoryResetting = true;
    clearTimeout(saveTimer); saveTimer = null; saveAgain = false;
    // Let an already-started write finish before deleting either autosave file.
    while (saving) await new Promise(resolve => setTimeout(resolve, 30));
    let filesCleared = false, folderForgotten = false;
    try {
      const handle = await getFolder();
      if (handle) {
        let permission = 'denied';
        try { permission = await handle.queryPermission({ mode: 'readwrite' }); } catch (e) {}
        if (permission !== 'granted') {
          try { permission = await handle.requestPermission({ mode: 'readwrite' }); } catch (e) {}
        }
        if (permission === 'granted') {
          for (const name of [SAVE_FILE, BACKUP_FILE]) {
            try { await handle.removeEntry(name); } catch (e) { if (e?.name !== 'NotFoundError') throw e; }
          }
          filesCleared = true;
          lastBackupAt = 0; lastBrowserBackupAt = 0;
          try { await dbPut('lastBackupAt', 0); await dbPut('lastBrowserBackupAt', 0); } catch (e) {}
          status('Старые файлы автосохранения очищены вместе с базой', 'ok');
        } else {
          // Forget an inaccessible handle, so a stale external autosave cannot
          // silently be treated as the active database after the reset.
          try { await dbDelete('directoryHandle'); folderHandle = null; folderForgotten = true; } catch (e) {}
          status('Нет доступа к папке автосохранения: после сброса её нужно подключить заново', 'warn');
        }
      }
    } catch (e) {
      console.warn('[v56 autosave] factory-reset cleanup:', e);
      status('Не удалось полностью очистить файлы автосохранения: ' + (e?.message || e), 'warn');
    }
    lastPayload = '';
    return { filesCleared, folderForgotten };
  }

  // Remove the remembered folder handle and backup timestamp as well as the
  // external JSON files. Keeping the IndexedDB settings after a factory reset
  // could reconnect an old autosave folder on the next launch.
  async function clearAutosaveDatabase() {
    factoryResetting = true;
    clearTimeout(saveTimer); saveTimer = null; saveAgain = false;
    while (saving) await new Promise(resolve => setTimeout(resolve, 30));
    let db = null;
    try {
      db = await openDb();
      const cleared = await new Promise(resolve => {
        let tx;
        try {
          if (!db.objectStoreNames.contains(STORE)) { resolve(true); return; }
          tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).clear();
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
          tx.onabort = () => resolve(false);
        } catch (e) { resolve(false); }
      });
      try { db.close(); } catch (e) {}
      dbPromise = null; folderHandle = null;
      lastBackupAt = 0; lastBrowserBackupAt = 0; lastPayload = '';
      return cleared;
    } catch (e) {
      try { db?.close(); } catch (e2) {}
      dbPromise = null; folderHandle = null;
      lastBackupAt = 0; lastBrowserBackupAt = 0; lastPayload = '';
      console.warn('[v56 autosave] IndexedDB cleanup failed:', e);
      return false;
    }
  }

  window.v56PrepareFactoryReset = prepareFactoryReset;
  window.v56ClearAutosaveDatabase = clearAutosaveDatabase;
  window.v56ChooseAutosaveFolder = chooseFolder;
  window.v56EnableAutosave = enableAutosave;
  window.v56AutosaveNow = () => saveNow('manual');
  window.v56FlushBatchAutosave = () => { batchSaveDeferred = false; return saveNow('batch-final'); };
  window.v56RestoreAutosave = restoreFromFolder;
  window.v56AutosaveStatus = () => lastMessage;

  // v131: защита от потери прогресса. Когда localStorage переполнен, записи состояния молча не проходят,
  // и после перезагрузки игра открывалась на старой дате (в тесте — март 2027 вместо 2033). Полная копия
  // при этом лежит в IndexedDB. При запуске сравниваем даты и, если автокопия заметно новее, предлагаем её загрузить.
  async function checkNewerSnapshot() {
    try {
      if (typeof seasonState === 'undefined' || !seasonState?.calendar) return;
      const rec = await dbGet('browserAutosave'); if (!rec || !rec.payload) return;
      let st = rec.payload.seasonState; if (typeof st === 'string') { try { st = JSON.parse(st); } catch (e) { st = null; } }
      const snapMs = Number(st?.calendar?.currentMs) || 0, curMs = Number(seasonState.calendar.currentMs) || 0;
      if (!snapMs || snapMs - curMs < 2 * 864e5) return;
      if (document.getElementById('v131-restore')) return;
      const f = ms => new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      const box = document.createElement('div'); box.id = 'v131-restore';
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      box.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(5,7,10,.72);font-family:inherit';
      box.innerHTML = `<div style="max-width:460px;margin:16px;padding:22px 24px;border-radius:14px;background:#14171c;border:1px solid #f08a24;color:#e8edf3;box-shadow:0 20px 60px rgba(0,0,0,.6)">
        <h2 style="margin:0 0 10px;font-size:19px">Найдено более свежее сохранение</h2>
        <p style="margin:0 0 6px;color:#b9c3cf;font-size:14px">Сейчас загружено: <b>${f(curMs)}</b></p>
        <p style="margin:0 0 14px;color:#b9c3cf;font-size:14px">Автокопия в браузере: <b style="color:#ffd27a">${f(snapMs)}</b> (сохранена ${new Date(rec.savedAt || Date.now()).toLocaleString('ru-RU')})</p>
        <p style="margin:0 0 16px;color:#8d99a6;font-size:13px">Основное хранилище браузера переполнено, поэтому последние сохранения попали только в автокопию.</p>
        <div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" data-v131r="no" style="padding:9px 14px;border-radius:9px;border:1px solid #3a4350;background:#1c2128;color:#cfd6df;cursor:pointer">Оставить как есть</button>
        <button type="button" data-v131r="yes" style="padding:9px 14px;border-radius:9px;border:0;background:linear-gradient(180deg,#ffb04d,#f08a24);color:#1a0d00;font-weight:800;cursor:pointer">Загрузить автокопию</button></div></div>`;
      box.addEventListener('click', async e => { const b = e.target.closest('[data-v131r]'); if (!b) return; box.remove(); if (b.dataset.v131r === 'no') { try { localStorage.setItem('cs2_v131_snapshot_ok', String(snapMs)); } catch (er) {} } if (b.dataset.v131r === 'yes') { try { await restoreBrowserSnapshot(); } catch (er) { status('Не удалось загрузить автокопию: ' + (er?.message || er), 'err'); } } });
      document.body.appendChild(box);
    } catch (e) { console.warn('[v131 autosave check]', e); }
  }
  setTimeout(checkNewerSnapshot, 4500);
  window.v131CheckNewerSnapshot = checkNewerSnapshot;

  // Перехватываем стандартные записи браузерного сейва; тяжёлые данные из памяти
  // также подхватываются периодическим снимком, даже если конкретный модуль не пишет в localStorage.
  try {
    const proto = Storage.prototype, raw = proto.setItem;
    if (!proto.__v56AutosaveWrapped) {
      proto.setItem = function (key, value) {
        const result = raw.call(this, key, value);
        if (this === window.localStorage && /^(?:cs2_season_state_v61|cs2_season_teams_v61|cs2_transfer_market_v1|cs2_hltv_archive_v1|cs2_player_awards_v1|cs2_current_tournament_v34|cs2_news(?:_|$))/.test(String(key))) scheduleSave(5000);
        return result;
      };
      Object.defineProperty(proto, '__v56AutosaveWrapped', { value: true });
    }
  } catch (e) {}
  ['saveTeams', 'saveSeasonState'].forEach(name => {
    try {
      CS2.patch(name, original => function (...args) {
        const result = original.apply(this, args);
        scheduleSave(5000);
        return result;
      }, { id: '__v56Wrapped', ifExists: true });
    } catch (e) {}
  });
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if (factoryResetting || document.hidden) return; if(bulkSimulationOwnsThread()){ batchSaveDeferred=true; return; } saveNow('periodic'); }, 45000);
  window.addEventListener('pagehide', () => { if (!factoryResetting) saveNow('pagehide'); });

  // Поднимаем сохранённый дескриптор папки. После обновления браузер может попросить
  // повторно подтвердить доступ — это выполняется кнопкой, а не скрытым диалогом.
  getFolder().then(async handle => {
    lastBrowserBackupAt = Number(await dbGet('lastBrowserBackupAt')) || 0;
    if (!handle) {
      status(typeof window.showDirectoryPicker === 'function'
        ? 'Автокопия в браузере активна · при желании подключите папку для копии на диск'
        : 'Автокопия в браузере активна · этот браузер не поддерживает выбор папки', 'info');
      if (!factoryResetting) scheduleSave(1800);
      return;
    }
    lastBackupAt = Number(await dbGet('lastBackupAt')) || 0;
    let permission = 'prompt';
    try { permission = await handle.queryPermission({ mode: 'readwrite' }); } catch (e) {}
    if (permission === 'granted') {
      status(`Автосохранение активно · ${handle.name}`, 'ok');
      if (!factoryResetting) scheduleSave(2500);
    } else {
      status(`Папка ${handle.name} подключена · нажмите «Включить автосохранение»`, 'warn');
    }
  }).catch(() => {
    status('Автокопия в браузере недоступна: не удалось открыть IndexedDB. Используйте «Экспорт в файл» для резервной копии.', 'warn');
  });
})();