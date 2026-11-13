/* v113 — места команд в сетках: VRS (опубликованный рейтинг Valve) и HLTV World Ranking.
   В сетке плей-офф под названием команды — «VRS #3 · HLTV #5»; в групповых таблицах (только логотипы) — в подсказке. */
(function () {
  'use strict';
  const W = window, H = W.HS;
  if (!H || typeof teams === 'undefined') return;
  let cache = { at: 0, vrs: {}, hltv: {} };
  function ranks() {
    const t = Date.now(); if (t - cache.at < 3000) return cache;
    const vrs = {}, hltv = {};
    teams.filter(x => x && x.name && !x.isAcademy).slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)).forEach((x, i) => { vrs[x.name] = i + 1; });
    try { if (W.V41 && W.V41.hltvRanking) W.V41.hltvRanking().forEach(r => { hltv[r.name] = r.rank; }); } catch (e) {}
    teams.forEach(x => { if (x && x.name && !hltv[x.name] && x.hltvRank) hltv[x.name] = x.hltvRank; });
    cache = { at: t, vrs, hltv };
    return cache;
  }
  const label = (r, n) => [r.vrs[n] ? `VRS #${r.vrs[n]}` : '', r.hltv[n] ? `HLTV #${r.hltv[n]}` : ''].filter(Boolean).join(' · ');
  function decorate(root) {
    if (!root) return;
    const list = root.querySelectorAll('.br-t:not([data-v113]), .sg-t:not([data-v113])'); if (!list.length) return;
    const r = ranks();
    list.forEach(el => {
      el.setAttribute('data-v113', '1');
      const nm = el.querySelector('.nm'), name = (nm && nm.textContent.trim()) || el.getAttribute('data-team') || el.getAttribute('title') || '';
      if (!name || name === 'TBD') return;
      const txt = label(r, name); if (!txt) return;
      if (nm) nm.insertAdjacentHTML('afterend', `<small class="v113-rk">${H.esc(txt)}</small>`);
      else el.setAttribute('title', `${name} · ${txt}`);
    });
  }
  (H.AFTER || []).push((pg, arg, root) => { try { decorate(root); } catch (e) {} });
  // сетки перерисовываются по ходу матчей частями — догоняем дешёвым тиком
  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => { try { decorate(document.getElementById('hs-page')); } catch (e) {} }, 2000, 'v113-ranks');
  W.V113Ranks = { ranks, label };
})();
