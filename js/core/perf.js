/* v99 — производительность.
   • Старая таблица рейтинга (#rating-table) спрятана под порталом: renderRating() её не пересобирает, пока она
     невидима (флаг data-stale). Когда старый интерфейс открывают («Управление турнирами»), таблица строится заново.
   • См. также: v33-pickem (refresh перерисовывает только Pick'Em / Путь на Мейджор), v59 (тренер «—» больше не
     «чинится» на каждом сохранении), v90-save-coalesce (большие сохранения не чаще раза в 4 с). */
(function () {
  'use strict';
  const W = window;
  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => {
    const tb = document.querySelector('#rating-table tbody');
    if (!tb || tb.dataset.stale !== '1' || !tb.offsetParent || typeof W.renderRating !== 'function') return;
    W.__v99ForceRating = true;
    try { W.renderRating(); } catch (e) {} finally { W.__v99ForceRating = false; }
  }, 1000, 'v99-rating-stale');
})();
