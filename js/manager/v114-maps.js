/* v114 — тренировка карт: компромисс, ассистент и смена пула.

   • Компромисс: неделя тренировки одной карты (фокус «Карты и анти-страты») ослабляет остальные карты пула на 0.08
     уровня сверх обычного недельного спада (−3.5%). Нельзя держать все семь карт на максимуме.
   • «Карту выбирает ассистент» (страница «Тренировки», для клуба менеджера): каждую неделю — самая слабая карта пула
     (натренированность + результаты команды на карте); ассистент держит выбранную карту, пока она не дойдёт до 6 из 10
     или 4 недель, затем переключается на следующую слабую. Не обязательно до максимума.
   • Смена пула (Valve убирает карту): 60% натренированности ушедшей карты переходит на новую карту пула; если ассистент
     тренировал ушедшую карту, он сразу выбирает другую. Состояние — seasonState.v114maps. */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31, DAY = 864e5;
  if (!H || !V || typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const esc = H.esc;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const week = () => Math.floor(now() / (7 * DAY));
  const pool = () => (typeof MAP_POOL !== 'undefined' && Array.isArray(MAP_POOL) ? MAP_POOL.slice() : []);
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const S = () => { const s = seasonState.v114maps = seasonState.v114maps || {}; s.auto = s.auto || {}; s.hold = s.hold || {}; return s; };
  const save = () => { try { W.saveSeasonState && W.saveSeasonState(); W.saveTeams && W.saveTeams(); } catch (e) {} };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function mapWr(t, m) {
    try { const st = H.stats(), T = st.T && st.T[t.name], o = T && T.maps && T.maps[m]; if (o && o.n) return o.w / o.n; } catch (e) {}
    const v = Number((t.maps || {})[m]); return Number.isFinite(v) ? v / 100 : 0.5;
  }
  function weakest(t) {
    const P = pool(); if (!P.length) return '';
    const vm = t.v31map || {};
    return P.map(m => ({ m, sc: (vm[m] || 0) / 10 * 0.6 + mapWr(t, m) * 0.4 })).sort((a, b) => a.sc - b.sc)[0].m;
  }
  // ассистент выбирает карту для клуба менеджера
  function autoPick(t) {
    const o = V.org(t.name); if (!o || !o.train) return;
    const s = S(), h = s.hold[t.name] || {}, vm = t.v31map || {}, P = pool();
    const cur = o.train.map, keep = cur && P.includes(cur) && (vm[cur] || 0) < 6 && h.map === cur && week() - (h.since || 0) < 4;
    const next = keep ? cur : weakest(t);
    if (next && next !== cur) { o.train.map = next; s.hold[t.name] = { map: next, since: week() }; }
    else if (!h.map) s.hold[t.name] = { map: cur, since: week() };
  }
  function weekly() {
    const s = S(), wk = week(); if (s.wk === wk) return; const first = s.wk == null; s.wk = wk;
    const P = pool(); if (!P.length) return;
    teams.forEach(t => {
      if (!t) return; const vm = t.v31map; if (!vm) return;
      // смена пула: ушедшая карта отдаёт 60% новой
      const gone = Object.keys(vm).filter(m => !P.includes(m) && vm[m] > 0);
      if (gone.length) { const fresh = P.filter(m => !(vm[m] > 0)); gone.forEach((m, i) => { const to = fresh[i] || weakest(t); if (to) vm[to] = clamp((vm[to] || 0) + vm[m] * 0.6, 0, 10); delete vm[m]; }); }
      if (first) return;
      // компромисс: тренировка одной карты ослабляет остальные
      let o = null; try { o = V.org(t.name); } catch (e) {}
      const tm = o && o.train && /map/i.test(String(o.train.focus || '')) ? o.train.map : '';
      if (tm) P.forEach(m => { if (m !== tm && vm[m] > 0) vm[m] = Math.max(0, Math.round((vm[m] - 0.08) * 100) / 100); });
    });
    const m = me(), t = m && teams.find(x => x && x.name === m);
    if (t) { let o = null; try { o = V.org(t.name); } catch (e) {}
      if (o && o.train && o.train.map && !P.includes(o.train.map)) o.train.map = weakest(t);   // карта ушла из пула
      if (s.auto[t.name]) autoPick(t); }
    save();
  }

  /* ------------------------------------------------------------ интерфейс: переключатель на «Тренировках» */
  H.CLICKS.push(['[data-v114mapauto]', el => {
    const t = teams.find(x => x && x.name === me()); if (!t) return; const s = S();
    s.auto[t.name] = !s.auto[t.name]; if (s.auto[t.name]) { s.hold[t.name] = {}; autoPick(t); }
    save(); H.render();
  }]);
  document.addEventListener('click', e => {   // окно «Требует решения» лежит вне #hs-root
    const el = e.target && e.target.closest && e.target.closest('#v96-gate [data-v114mapauto]'); if (!el) return;
    e.preventDefault(); e.stopPropagation();
    const t = teams.find(x => x && x.name === me()); if (!t) return; const s = S();
    s.auto[t.name] = !s.auto[t.name]; if (s.auto[t.name]) { s.hold[t.name] = {}; autoPick(t); } save();
    try { W.V96Windows && W.V96Windows.repaint && W.V96Windows.repaint(); } catch (er) {} setTimeout(() => decorate(document.getElementById('v96-gate')), 30);
  }, true);
  function decorate(root) {
    const t = teams.find(x => x && x.name === me()); if (!t || !root) return;
    root.querySelectorAll('select[data-crtm], select[data-v96tm]').forEach(sel => {
      const row = sel.closest('.cr-row, label') || sel.parentElement; if (!row || row.parentElement.querySelector('.v114-mapauto')) return;
      const on = !!S().auto[t.name], h = S().hold[t.name] || {};
      if (on) sel.disabled = true;
      row.insertAdjacentHTML('afterend', `<div class="v114-mapauto"><button type="button" class="hs-chip${on ? ' on' : ''}" data-v114mapauto>${on ? '✓ ' : ''}Карту выбирает ассистент</button><small>${on ? `сейчас: ${esc(h.map || sel.value || '—')} · самая слабая карта пула, до 6/10 или 4 недели, затем следующая` : 'тренировка одной карты слегка ослабляет остальные — ассистент сам переключается на слабые'}</small></div>`);
    });
  }
  (H.AFTER || []).push((pg, arg, root) => { try { decorate(root); } catch (e) {} });
  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => { try { weekly(); decorate(document.getElementById('v96-gate')); } catch (e) { console.warn('[v114 maps]', e); } }, 4000, 'v114-maps');
  W.V114Maps = { weekly, weakest, autoPick, state: S };
})();
