/* CS2 Manager — ядро (первый модуль манифеста).

   Зачем: игра собрана из слоёв — каждая версия расширяла функции предыдущей, оборачивая глобальные функции вручную
   («const old = window.X; window.X = function () { … old … }; try { X = … } catch {}»). Такие обёртки невидимы:
   нельзя узнать, сколько слоёв стоит над функцией и в каком порядке они срабатывают, поэтому новые правки
   «накладывались» на старые вслепую. Ядро делает слои явными.

   API (window.CS2):
     CS2.patch(name, factory, opts?)  — расширить глобальную функцию: factory(base) возвращает новую функцию,
                                        base — текущая реализация (может быть undefined, если opts.optional).
                                        Слой (файл) определяется автоматически; цепочку видно в CS2.chain(name).
     CS2.chain(name)                  — слои функции сверху вниз: [{ layer, kind }].
     CS2.layers(name?)                — карта загрузки: какой модуль объявил/заменил какую глобальную функцию
                                        (собирается автоматически после каждого файла, даже для старых обёрток).
     CS2.on(evt, fn) / CS2.off / CS2.once / CS2.emit(evt, payload) — шина событий: модули подписываются на
                                        события вместо того, чтобы оборачивать чужие функции.
     CS2.modules()                    — загруженные модули по порядку, время загрузки, ошибки.
   Правила — ARCHITECTURE.md. */
(function () {
  'use strict';
  const W = window, D = document;
  if (W.CS2 && W.CS2.__kernel) return;
  const now = () => (W.performance && performance.now ? performance.now() : Date.now());

  // ------------------------------------------------------------ текущий слой
  const modules = [];             // { src, ok, ms }
  let lastMark = now();
  function currentLayer() {
    if (W.CS2 && W.CS2.__layer) return W.CS2.__layer;   // сборка dist/: один файл, слой отмечается вставками
    try {
      const s = D.currentScript;
      const src = s && (s.dataset && s.dataset.cs2module || s.getAttribute('src'));
      if (src) return String(src).replace(/\?.*$/, '');
    } catch (e) {}
    return 'runtime';
  }

  // ------------------------------------------------------------ patch / chain
  const META = typeof Symbol === 'function' ? Symbol.for('cs2.patch') : '__cs2patch';
  const patchLog = new Map();     // name -> [{ layer, kind, at }]
  function note(map, name, rec) { let a = map.get(name); if (!a) map.set(name, a = []); a.push(rec); }
  function patch(name, factory, opts) {
    opts = opts || {};
    const base = W[name];
    if (typeof base !== 'function' && !opts.optional) {
      console.warn('[CS2.patch] нечего расширять: ' + name + ' (слой ' + (opts.layer || currentLayer()) + ')');
      return base;
    }
    let next;
    try { next = factory(base); } catch (e) { console.error('[CS2.patch] ' + name, e); return base; }
    if (typeof next !== 'function' || next === base) return base;
    const layer = opts.layer || currentLayer();
    try { Object.defineProperty(next, META, { value: { name, layer, base }, configurable: true }); } catch (e) {}
    W[name] = next;
    note(patchLog, name, { layer, kind: base ? 'patch' : 'define', at: modules.length });
    return next;
  }
  function chain(name) {
    const out = []; let f = W[name], guard = 0;
    while (typeof f === 'function' && guard++ < 64) {
      const m = f[META];
      if (!m) { out.push({ layer: firstDefiner(name) || 'исходная реализация', kind: 'base' }); break; }
      out.push({ layer: m.layer, kind: 'patch' }); f = m.base;
    }
    return out;
  }

  // ------------------------------------------------------------ автоматическая карта слоёв
  // После каждого файла сравниваем глобальные функции с предыдущим снимком: так видны и старые ручные обёртки.
  const builtins = new Set(Object.getOwnPropertyNames(W));
  const WATCH_BUILTINS = ['setInterval', 'setTimeout', 'alert', 'confirm', 'prompt', 'fetch', 'requestAnimationFrame'];
  const layerMap = new Map();     // name -> [{ layer, kind: 'define'|'replace' }]
  let snap = new Map();
  function scan() {
    const cur = new Map();
    const names = Object.getOwnPropertyNames(W);
    for (let i = 0; i < names.length; i++) {
      const n = names[i];
      if (builtins.has(n) && !WATCH_BUILTINS.includes(n)) continue;
      let v; try { v = W[n]; } catch (e) { continue; }
      if (typeof v === 'function') cur.set(n, v);
    }
    return cur;
  }
  function firstDefiner(name) { const a = layerMap.get(name); return a && a[0] ? a[0].layer : null; }
  function afterModule(src, ok) {
    const t = now();
    modules.push({ src, ok: ok !== false, ms: Math.round((t - lastMark) * 10) / 10 });
    lastMark = t;
    const cur = scan();
    cur.forEach((fn, n) => {
      const prev = snap.get(n);
      if (prev === fn) return;
      note(layerMap, n, { layer: src, kind: prev ? 'replace' : (builtins.has(n) ? 'replace' : 'define') });
    });
    snap = cur;
  }
  snap = scan();
  function layers(name) {
    if (name) return (layerMap.get(name) || []).slice();
    const out = {};
    layerMap.forEach((a, n) => { if (a.length > 1) out[n] = a.map(r => r.layer); });
    return out;
  }

  // ------------------------------------------------------------ шина событий
  const listeners = new Map();
  function on(evt, fn) { if (typeof fn !== 'function') return () => {}; let s = listeners.get(evt); if (!s) listeners.set(evt, s = new Set()); s.add(fn); return () => off(evt, fn); }
  function off(evt, fn) { const s = listeners.get(evt); if (s) s.delete(fn); }
  function once(evt, fn) { const u = on(evt, p => { u(); fn(p); }); return u; }
  function emit(evt, payload) {
    const s = listeners.get(evt); if (!s || !s.size) return 0;
    let n = 0;
    [...s].forEach(fn => { try { fn(payload); n++; } catch (e) { console.warn('[CS2.emit] ' + evt, e); } });
    return n;
  }

  W.CS2 = Object.assign(W.CS2 || {}, {
    __kernel: 1,
    build: (W.CS2_MANIFEST && W.CS2_MANIFEST.build) || 'dev',
    patch, chain, layers, on, off, once, emit,
    modules: () => modules.slice(),
    __afterModule: afterModule
  });
})();
