/* v131 — основное хранилище сохранения в IndexedDB.

   Проблема: localStorage ограничен ~5 млн символов (у file:// — один лимит на все локальные HTML-файлы), а состояние игры
   «С историей карьер» уже на старте весит ~5,6 млн. Записи сезона/команд молча не проходили (QuotaExceeded), игра жила
   на автокопии, а после перезагрузки открывалась на давней дате (в тестах — 5 января 2026 при игре в 2028 году).

   Решение: крупные ключи сохранения хранятся в IndexedDB. Перед запуском игры этот модуль читает их в память и подменяет
   localStorage.getItem/setItem/removeItem/clear для этих ключей: чтение — из памяти, запись — в память и (с задержкой
   ~0,3 с, а также при скрытии/закрытии страницы) в IndexedDB. Код игры по-прежнему работает с localStorage синхронно.
   Мелкие ключи остаются в localStorage. Скрипты игры запускаются по порядку только после загрузки данных
   (теги <script type="text/plain" data-cs2src> в index.html). Если IndexedDB недоступен — прежнее поведение. */
(function () {
  'use strict';
  const BIG = new Set(['cs2_season_state_v61', 'cs2_season_teams_v61', 'cs2_transfer_market_v1', 'cs2_player_awards_v1', 'cs2_news_v1', 'cs2_fan_v1']);
  const DB = 'cs2manager_v131_store', ST = 'kv';
  const MEM = new Map(), dirty = new Set();
  const proto = Storage.prototype, raw = { get: proto.getItem, set: proto.setItem, remove: proto.removeItem, clear: proto.clear };
  let db = null, flushT = null, active = false, unloading = false;
  const diag = window.CS2Store = { active: false, loadMs: 0, writes: 0, lastFlush: 0, errors: 0, keys: () => [...MEM.keys()], flush: () => flush() };
  const isLS = s => { try { return s === window.localStorage; } catch (e) { return false; } };

  function openDb() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no indexedDB'));
      let r; try { r = indexedDB.open(DB, 1); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => { try { r.result.createObjectStore(ST); } catch (e) {} };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('open failed'));
      r.onblocked = () => rej(new Error('blocked'));
    });
  }
  function readAll(d) {
    return new Promise((res, rej) => {
      const out = {}; let tx; try { tx = d.transaction(ST, 'readonly'); } catch (e) { return rej(e); }
      const s = tx.objectStore(ST), cur = s.openCursor();
      cur.onsuccess = () => { const c = cur.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); };
      cur.onerror = () => rej(cur.error);
    });
  }
  function flush() {
    clearTimeout(flushT); flushT = null;
    if (!db || !dirty.size) return;
    const keys = [...dirty]; dirty.clear();
    try {
      const tx = db.transaction(ST, 'readwrite'), s = tx.objectStore(ST);
      keys.forEach(k => { if (MEM.has(k)) s.put({ v: MEM.get(k), t: Date.now() }, k); else s.delete(k); });
      tx.oncomplete = () => { diag.writes += keys.length; diag.lastFlush = Date.now();
        // после успешной записи в IndexedDB освобождаем квоту localStorage от дубликата
        keys.forEach(k => { try { raw.remove.call(window.localStorage, k); } catch (e) {} }); };
      tx.onerror = () => { diag.errors++; keys.forEach(k => dirty.add(k)); };
    } catch (e) { diag.errors++; keys.forEach(k => dirty.add(k)); }
  }
  // при закрытии/скрытии страницы — сразу (игра пишет свои отложенные сохранения в обработчиках закрытия)
  const schedule = () => { if (unloading) { flush(); return; } if (!flushT) flushT = setTimeout(flush, 300); };

  function install() {
    proto.getItem = function (k) { if (active && isLS(this) && BIG.has(k)) return MEM.has(k) ? MEM.get(k) : null; return raw.get.call(this, k); };
    proto.setItem = function (k, v) { if (active && isLS(this) && BIG.has(k)) { MEM.set(k, String(v)); dirty.add(k); schedule(); return; } return raw.set.call(this, k, v); };
    proto.removeItem = function (k) { if (active && isLS(this) && BIG.has(k)) { MEM.delete(k); dirty.add(k); schedule(); } return raw.remove.call(this, k); };
    proto.clear = function () { if (active && isLS(this)) { [...MEM.keys()].forEach(k => dirty.add(k)); MEM.clear(); schedule(); } return raw.clear.call(this); };
    const now = () => { unloading = true; window.__cs2Unloading = true; flush(); };
    window.addEventListener('pagehide', now); window.addEventListener('beforeunload', now);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { unloading = true; try { window.CS2Saves && window.CS2Saves.flush && window.CS2Saves.flush(); } catch (e) {} flush(); } else { unloading = false; window.__cs2Unloading = false; } });
    // поздние обработчики — после обработчиков игры (её отложенные записи уже в памяти)
    setTimeout(() => { window.addEventListener('pagehide', () => flush()); window.addEventListener('beforeunload', () => flush()); }, 6000);
  }

  function runGame() {
    const list = [...document.querySelectorAll('script[data-cs2src]')].map(s => s.getAttribute('data-cs2src'));
    list.forEach(src => { const el = document.createElement('script'); el.src = src; el.async = false; document.body.appendChild(el); });
  }

  const t0 = performance.now();
  let started = false;
  const start = () => { if (started) return; started = true; diag.loadMs = Math.round(performance.now() - t0); runGame(); };
  const guard = setTimeout(() => { console.warn('[v131 store] IndexedDB не ответил вовремя — запуск без него'); start(); }, 4000);
  openDb().then(d => readAll(d).then(all => {
    if (started) return;   // уже запустились по таймауту — не подменяем хранилище на ходу
    db = d;
    BIG.forEach(k => {
      const rec = all[k];
      if (rec && typeof rec.v === 'string') MEM.set(k, rec.v);
      else { let v = null; try { v = raw.get.call(window.localStorage, k); } catch (e) {} if (v != null) { MEM.set(k, v); dirty.add(k); } }   // миграция из localStorage
    });
    active = diag.active = true; install(); if (dirty.size) schedule();
    clearTimeout(guard); start();
  })).catch(e => { console.warn('[v131 store] IndexedDB недоступен:', e && e.message); clearTimeout(guard); start(); });
})();
