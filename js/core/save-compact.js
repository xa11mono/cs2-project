/* v84 — сжатие сохранения при долгой карьере.
   Завершённые фоновые турниры (Tier-2/3, академии, квалификации) хранили полную сетку со всеми матчами
   навсегда — к третьему сезону это ~4 МБ из ~6 МБ состояния, которое сериализуется при каждом сохранении.
   Итоги таких турниров уже лежат в архиве HLTV (P-<id>), поэтому через 14 игровых дней после окончания
   сетка удаляется из календаря; страница турнира, история и статистика берут данные из архива. */
(function () {
  'use strict';
  const W = window, DAY = 864e5;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  function archive() { try { return W.hubArchiveExport?.() || W.HS?.archive?.() || {}; } catch (e) { return {}; } }
  function compactParallel() {
    const st = ST(); if (!st || !Array.isArray(st.parallelSchedule)) return 0;
    const now = Number(st.calendar?.currentMs) || Date.now(), A = archive(); let n = 0;
    st.parallelSchedule.forEach(ev => {
      if (!ev || ev.v84Compact || !ev.br) return;
      const done = ev.status === 'completed' || ev.status === 'done';
      const end = Number(ev.endMs || ev.startMs) || 0;
      if (!done || !end || now - end < 14 * DAY || !A['P-' + ev.id]) return;
      ev.winner = ev.winner || A['P-' + ev.id].champion; ev.v84Matches = (ev.br.matches || []).length;
      delete ev.br; ev.v84Compact = 1; n++;
    });
    // турниры прошлых сезонов с итогами в архиве больше не нужны календарю текущего сезона
    const cur = Number(st.currentSeason) || 1, before = st.parallelSchedule.length;
    st.parallelSchedule = st.parallelSchedule.filter(ev => !(ev && Number(ev.season) < cur - 0 && Number(ev.season) < cur && (ev.status === 'completed' || ev.status === 'cancelled' || ev.status === 'done') && (A['P-' + ev.id] || ev.status === 'cancelled')));
    n += before - st.parallelSchedule.length;
    // журнал последних карт команды: интерфейс показывает 12, храним 40
    try { (typeof teams !== 'undefined' ? teams : []).forEach(t => { if (Array.isArray(t.mapHistory) && t.mapHistory.length > 40) { t.mapHistory.length = 40; n++; } }); } catch (e) {}
    return n;
  }
  function run() {
    if (W.v57BatchCalendarSkip) return;
    const n = compactParallel();
    if (n) { try { W.saveSeasonState?.(); W.saveTeams?.(); } catch (e) {} console.info('[v84 compact] сжато фоновых турниров:', n); }
  }
  // Склейка частых сохранений: фоновые модули (новости, сообщество, Pick'Em) вызывали saveSeasonState
  // независимо друг от друга — каждая запись сериализует всё состояние. Вне перемотки записи за 1,5 с
  // объединяются в одну; при закрытии вкладки отложенная запись выполняется немедленно.
  (function coalesceSaves() {
    const base = W.saveSeasonState; if (typeof base !== 'function' || base.__v84coalesce) return;
    let timer = null;
    const flush = () => { if (!timer) return; clearTimeout(timer); timer = null; try { base(); } catch (e) { console.warn('[v84 compact] save', e); } };
    CS2.patch('saveSeasonState', () => { const wrapped = function () {
      // v131: при закрытии/скрытии страницы — сразу (иначе запись из обработчика закрытия v90 снова откладывалась и терялась)
      if (W.v57BatchCalendarSkip || W.__cs2Unloading || document.visibilityState === 'hidden') { if (timer) { clearTimeout(timer); timer = null; } return base.apply(this, arguments); }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; try { base(); } catch (e) { console.warn('[v84 compact] save', e); } }, 1500);
    };
    wrapped.flushNow = flush; return wrapped; }, { id: '__v84coalesce' });   // base (выше) — та же текущая функция
    W.addEventListener('beforeunload', flush); W.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  })();
  setTimeout(run, 8000);
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(run, 60000);
  W.CS2Compact = { run, compactParallel };
})();
