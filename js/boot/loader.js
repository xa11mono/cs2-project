/* CS2 Manager — загрузчик. Подключается в <head> сразу после js/boot/manifest.js.

   1. Стили из манифеста подключаются синхронно (document.write во время разбора <head>), поэтому порядок каскада
      и отсутствие «мигания» — как у обычных <link> в разметке.
   2. Скрипты игры запускает js/boot/store.js (после чтения сохранения из IndexedDB) через CS2Boot.run():
      они добавляются по порядку с async=false — браузер исполняет их строго в порядке манифеста.
      После каждого файла ядро (js/core/kernel.js) отмечает, какие глобальные функции он объявил или заменил —
      карта слоёв доступна в консоли: CS2.layers(), CS2.layers('processTransferMarket').
   Сборка dist/ использует тот же загрузчик: в её манифесте один CSS и один JS. */
(function () {
  'use strict';
  const W = window, D = document;
  const M = W.CS2_MANIFEST;
  if (!M) { console.error('[CS2Boot] нет js/boot/manifest.js'); return; }
  const q = '?v=' + encodeURIComponent(M.build);
  const url = p => p + (p.includes('?') ? '' : q);
  try {
    D.write(M.css.map(h => '<link rel="stylesheet" href="' + url(h) + '">').join(''));
  } catch (e) {
    M.css.forEach(h => { const l = D.createElement('link'); l.rel = 'stylesheet'; l.href = url(h); D.head.appendChild(l); });
  }

  const state = { started: false, total: M.js.length, loaded: 0, failed: [], t0: 0, ms: 0 };
  function run(done) {
    if (state.started) return; state.started = true; state.t0 = performance.now();
    const list = M.js.slice();
    list.forEach((src, i) => {
      const el = D.createElement('script');
      el.src = url(src); el.async = false; el.dataset.cs2module = src;
      const fin = ok => {
        state.loaded++; if (!ok) { state.failed.push(src); console.error('[CS2Boot] не загрузился модуль', src); }
        try { W.CS2 && W.CS2.__afterModule && W.CS2.__afterModule(src, ok); } catch (e) {}
        if (i === list.length - 1) { state.ms = Math.round(performance.now() - state.t0); try { done && done(state); } catch (e) {} }
      };
      el.onload = () => fin(true); el.onerror = () => fin(false);
      D.body.appendChild(el);
    });
  }
  W.CS2Boot = Object.freeze({ run, state, manifest: M, url });
})();
