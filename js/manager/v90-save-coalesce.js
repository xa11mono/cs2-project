/* v90 — Этап 0 · объединение сохранений.

   Найдено долгой симуляцией: игра падала по памяти в начале июля первого сезона (так же и v88). Причина — не
   бесконечный цикл, а сохранения: saveTeams() целиком сериализует команды и трансферы и пишет их в localStorage, и
   вызывается после КАЖДОЙ сыгранной карты (recordMapResult), каждой серии, каждого обновления усталости.
   Замер на первом турнире сезона: одна «симуляция всего турнира» — 452 записи, 231 МБ строк, 6.3 с. К лету сохранение
   перерастает лимит localStorage (~5 МБ), и каждая из сотен записей ещё запускает ужатие данных (v29-storage-guard) —
   память растёт быстрее, чем её освобождает сборщик мусора, вкладка падает.

   Теперь saveTeams / saveTransferState / saveSeasonState внутри одного синхронного прохода только отмечают, что данные
   изменились; запись выполняется один раз — в конце прохода (микрозадача, до любой перезагрузки или навигации).
   Данные в памяти не меняются, сохраняется их итоговое состояние.
   Если во время прохода удаляются ключи сохранения (сброс игры, импорт), отложенная запись отменяется — иначе она
   вернула бы старые данные после сброса. CS2Saves.flush() — записать немедленно; CS2Saves.stats() — счётчики. */
(function () {
  'use strict';
  const W = window;
  const NAMES = ['saveTeams', 'saveTransferState', 'saveSeasonState'];
  const KEYS = /^(cs2_season_teams|cs2_transfer_market|cs2_season_state)/;
  const orig = {}, pending = new Set();
  let scheduled = false, flushing = false, disabled = false;
  const stats = { requested: 0, written: 0, cancelled: 0 };
  function flush() {
    scheduled = false;
    if (disabled) { stats.cancelled += pending.size; pending.clear(); return; }
    if (!pending.size) return;
    const list = NAMES.filter(n => pending.has(n)); pending.clear();
    flushing = true;
    try { list.forEach(n => { try { orig[n](); stats.written++; } catch (e) { console.warn('[v90 saves]', n, e); } }); }
    finally { flushing = false; }
  }
  function install() {
    let n = 0;
    NAMES.forEach(name => {
      const f = W[name]; if (typeof f !== 'function' || f.__v90coalesce) { if (f && f.__v90coalesce) n++; return; }
      orig[name] = f;
      const w = function () {
        if (flushing || W.__cs2SaveNow) return f.apply(this, arguments);   // запись внутри записи — сразу (saveTeams → saveTransferState)
        if (disabled) return;
        stats.requested++;
        pending.add(name);
        if (!scheduled) { scheduled = true; Promise.resolve().then(flush); }
      };
      Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} });
      w.__v90coalesce = true; w.__orig = f;
      W[name] = w;
      try { (0, eval)(`${name} = window.${name}`); } catch (e) {}   // глобальная привязка функции (вызовы без window.)
      n++;
    });
    return n === NAMES.length;
  }
  // сброс игры / импорт удаляют ключи сохранения — отложенная запись не должна их вернуть
  (function () {
    const S = Storage.prototype, rm = S.removeItem, clr = S.clear;
    S.removeItem = function (k) { if (this === W.localStorage && KEYS.test(String(k))) { disabled = true; stats.cancelled += pending.size; pending.clear(); } return rm.apply(this, arguments); };
    S.clear = function () { if (this === W.localStorage) { disabled = true; stats.cancelled += pending.size; pending.clear(); } return clr.apply(this, arguments); };
  })();
  // закрытие вкладки — записать, если что-то ещё не записано
  W.addEventListener('pagehide', () => { try { flush(); } catch (e) {} });
  if (!install()) setTimeout(install, 0);
  W.CS2Saves = { flush, stats: () => Object.assign({ pending: [...pending], disabled }, stats), install };
})();
