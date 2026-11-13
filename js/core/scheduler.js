/* v84 — единый игровой цикл и кооперативная передача управления браузеру.
   До v84 каждый модуль заводил собственный setInterval (≈45 независимых таймеров,
   части из них по 0.5–1.5 с). Теперь все периодические задачи регистрируются в одном
   планировщике: один таймер, общий бюджет на кадр, задачи, не уложившиеся в бюджет,
   переносятся на следующий тик, а не выполняются пачкой в одном кадре.

   CS2Loop.every(fn, ms)  — совместимо по сигнатуре с setInterval, возвращает id.
   CS2Loop.clear(id)      — снять задачу.
   CS2Yield.maybe(ms)     — уступить кадр браузеру, только если текущий отрезок работы
                            занял больше ms (по умолчанию 10 мс). Раньше перемотка
                            уступала кадр после каждых 4 команд/каждого матча и ждала
                            дополнительные 7–12 мс простоя даже при пустой работе. */
(function () {
  'use strict';
  const W = window;
  const now = () => (W.performance && performance.now ? performance.now() : Date.now());
  const BASE_MS = 250;      // разрешение планировщика
  const FRAME_BUDGET = 12;  // максимум работы периодических задач за один тик
  const tasks = new Map();
  let seq = 0, timer = null, cursor = 0;

  function tick() {
    const start = now();
    const list = [...tasks.values()];
    if (!list.length) return;
    // Круговой обход: при нехватке бюджета следующий тик начнёт с прерванной задачи.
    for (let i = 0; i < list.length; i++) {
      const t = list[(cursor + i) % list.length];
      if (!tasks.has(t.id) || start < t.next) continue;
      t.next = start + t.ms;
      const t0 = now();
      try { t.fn(); } catch (e) { console.warn('[CS2Loop] задача', t.label || t.id, e); }
      const spent = now() - t0;
      t.calls++; t.totalMs += spent; if (spent > t.maxMs) t.maxMs = spent;
      if (now() - start >= FRAME_BUDGET) { cursor = (cursor + i + 1) % list.length; return; }
    }
    cursor = 0;
  }
  function ensureTimer() { if (!timer) timer = setInterval(tick, BASE_MS); }
  function every(fn, ms, label) {
    if (typeof fn !== 'function') return 0;
    const id = ++seq;
    if (!label) { try { const line = String(new Error().stack || '').split('\n').find(l => /\.js/.test(l) && !/core\/scheduler\.js/.test(l)) || ''; label = (line.match(/([\w.-]+\.js)(?:\?[^:]*)?:(\d+)/) || []).slice(1, 3).join(':'); } catch (e) {} }
    const period = Math.max(BASE_MS, Number(ms) || BASE_MS);
    // Разносим первые запуски, чтобы задачи с одинаковым периодом не совпадали по фазе.
    tasks.set(id, { id, fn, ms: period, next: now() + period + (id * 97) % period, label: label || '', calls: 0, totalMs: 0, maxMs: 0 });
    ensureTimer();
    return id;
  }
  function clear(id) { tasks.delete(id); }
  function diagnostics() {
    return [...tasks.values()].map(t => ({ id: t.id, label: t.label || t.fn.name || '', ms: t.ms, calls: t.calls,
      totalMs: Math.round(t.totalMs * 10) / 10, maxMs: Math.round(t.maxMs * 10) / 10 }))
      .sort((a, b) => b.totalMs - a.totalMs);
  }
  W.CS2Loop = Object.freeze({ every, clear, diagnostics, BASE_MS, FRAME_BUDGET });

  /* v144: уступка браузеру без лишнего простоя. Раньше каждая уступка ждала следующего кадра (requestAnimationFrame,
     до 16 мс): профиль перемотки на 30 дней — 60% времени поток простаивал. Теперь кадр (перерисовка) — не чаще
     раза в PAINT_MS; в остальные разы — мгновенная макрозадача (MessageChannel): браузер обрабатывает ввод и таймеры,
     но не ждёт кадра. В фоновой вкладке setTimeout троттлится до 1 с, MessageChannel — нет.
     Все самописные «yield frame» модулей перемотки идут сюда (CS2Yield.frame). */
  const PAINT_MS = 50;
  let sliceStart = now(), lastPaint = 0;
  const mq = [];
  let mc = null;
  try { mc = new MessageChannel(); mc.port1.onmessage = () => { const f = mq.shift(); if (f) f(); }; } catch (e) { mc = null; }
  const macrotask = fn => { if (mc) { mq.push(fn); mc.port2.postMessage(0); } else setTimeout(fn, 0); };
  const stats = { frames: 0, quick: 0 };
  function frame() {
    return new Promise(resolve => {
      const done = () => { sliceStart = now(); resolve(true); };
      try {
        const visible = document.visibilityState !== 'hidden' && typeof W.requestAnimationFrame === 'function';
        if (visible && now() - lastPaint >= PAINT_MS) { stats.frames++; W.requestAnimationFrame(() => { lastPaint = now(); done(); }); }
        else { stats.quick++; macrotask(done); }
      } catch (e) { setTimeout(done, 0); }
    });
  }
  function maybe(budgetMs) {
    const budget = Number(budgetMs) > 0 ? Number(budgetMs) : 10;
    if (now() - sliceStart < budget) return Promise.resolve(false);
    return frame();
  }
  W.CS2Yield = Object.freeze({ maybe, frame, reset: () => { sliceStart = now(); }, stats: () => Object.assign({}, stats), PAINT_MS });
})();
// Ненавязчивое уведомление (вместо alert) — используется при остановке перемотки.
window.v84ShowToast = function (text, ms) {
  // v84: системные сообщения — в общей стопке уведомлений (справа внизу, не больше двух карточек)
  if (typeof window.v29Toast === 'function') { try { const e = String(text || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); window.v29Toast(`<div class="v29-toast-ic">⏸</div><div class="v29-toast-t"><small>Игра</small><b>${e}</b></div>`); return; } catch (er) {} }
  try {
    let el = document.getElementById('v84-toast');
    if (!el) {
      el = document.createElement('div'); el.id = 'v84-toast'; el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;max-width:min(420px,calc(100vw - 32px));padding:10px 16px;border-radius:8px;background:#1d232c;color:#e8edf3;border:1px solid #3a4452;font:600 13px/1.4 Inter,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:opacity .25s;opacity:0;pointer-events:none';
      document.body.appendChild(el);
    }
    el.textContent = String(text || '');
    el.style.opacity = '1';
    clearTimeout(el.__t); el.__t = setTimeout(() => { el.style.opacity = '0'; }, ms || 4500);
  } catch (e) {}
};
/* v84: возраст из базы игроков (EMDB/2026) — это возраст на 2026 год. Пять модулей регулярно переписывали p.age
   этим значением, поэтому ежегодное старение затиралось и игроки «застывали» в возрасте 2026 года.
   Все места записи теперь берут возраст через эту функцию: возраст 2026 + прошедшие календарные годы. */
(function () {
  window.cs2MetaAge = function (metaAge) {
    const a = Number(metaAge); if (!Number.isFinite(a) || a <= 0) return metaAge;
    let y = 2026;
    try { const ms = Number(typeof seasonState !== 'undefined' && seasonState?.calendar?.currentMs); if (ms) y = new Date(ms).getFullYear(); } catch (e) {}
    return a + Math.max(0, y - 2026);
  };
})();
