/* v34 — сохранение идущего турнира. Раньше currentTournament жил только в памяти: после перезагрузки
   страницы календарь создавал турнир заново, и сыгранные матчи групп пропадали.
   Теперь турнир (без состояния эфира) пишется в localStorage при каждом изменении и при закрытии страницы,
   а при загрузке восстанавливается до того, как календарь успеет создать новый — если это тот же сезон
   и тот же слот расписания и турнир не завершён. Матч, который шёл в эфире, начнётся заново с 0:0;
   результаты сыгранных матчей сохраняются. Загружается сразу после js/base/game.js. */
// ошибки модулей — видны игроку (какой файл и что случилось), а не только в консоли
window.__v34Errors = [];
window.addEventListener('error', e => {
  try {
    const f = String(e.filename || '').split('/').pop() || 'скрипт';
    window.__v34Errors.push({ f, m: String(e.message || e.error || ''), at: Date.now() });
    if (window.__v34Errors.length > 5) return;
    const show = () => { const d = document.createElement('div'); d.className = 'v34-err'; d.textContent = `Ошибка в ${f}: ${e.message}. Сообщите разработчику — часть функций может не работать.`; d.onclick = () => d.remove(); document.body.appendChild(d); setTimeout(() => d.remove(), 15000); };
    if (document.body) show(); else window.addEventListener('DOMContentLoaded', show);
  } catch (x) {}
});
(function () {
'use strict';
const KEY = 'cs2_current_tournament_v34';
if (typeof seasonState === 'undefined') return;
const idle = () => ({ running: false, paused: false, queue: [], active: [], finished: [], clock: 0, timerIds: [] });
// восстановление
try {
  const raw = localStorage.getItem(KEY), saved = raw ? JSON.parse(raw) : null;
  if (saved && !saved.completed && saved.season === seasonState.currentSeason && saved.tourIndex === seasonState.tournamentIndex && (typeof currentTournament === 'undefined' || !currentTournament)) {
    saved.broadcast = idle();
    // флаги эфира у матчей («идёт», «в очереди») после перезагрузки недействительны — эфир стартует заново
    (function clean(o, d) { if (!o || typeof o !== 'object' || d > 12) return; if ('broadcastStatus' in o) delete o.broadcastStatus; ['broadcastId', 'broadcastItemId', 'v18PlannedTime'].forEach(k => { if (k in o) delete o[k]; }); for (const k in o) clean(o[k], d + 1); })(saved, 0);
    if (saved.calendar) { saved.calendar.broadcastAutoStartPending = true; saved.calendar.autoBroadcastAt = Number(seasonState.calendar?.currentMs) || Date.now(); }
    currentTournament = saved;   // eslint-disable-line no-global-assign
    window.__v34Restored = saved.name;
    console.info('[v34] турнир восстановлен после перезагрузки:', saved.name);
  } else if (saved && (saved.completed || saved.season !== seasonState.currentSeason || saved.tourIndex !== seasonState.tournamentIndex)) localStorage.removeItem(KEY);
} catch (e) { console.warn('[v34] восстановление турнира', e); }
// сохранение
let last = '';
function snapshot() {
  const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
  if (!ct) return;
  if (ct.completed) { if (last !== 'done') { try { localStorage.removeItem(KEY); } catch (e) {} last = 'done'; } return; }
  let json; try { json = JSON.stringify(ct, (k, v) => k === 'broadcast' ? undefined : v); } catch (e) { return; }
  if (json === last) return;
  try { localStorage.setItem(KEY, json); last = json; } catch (e) { console.warn('[v34] турнир не сохранён (хранилище заполнено?)', e); }
}
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip || document.hidden) return; snapshot(); }, 12000);
window.addEventListener('beforeunload', snapshot);
window.addEventListener('pagehide', snapshot);
window.v34SaveTournament = snapshot;
})();
