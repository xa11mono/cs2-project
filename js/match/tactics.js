/* v92 — Этап 2 · тактика по картам и влияние штаба на матч.

   У каждой команды на каждой карте — план атаки (T) и обороны (CT):
     T:  быстрые выходы · подготовленные выходы с гранатами · медленный дефолт с контролем карты · сбалансированный;
     CT: ранние контакты (агрессия) · плотная оборона точек · сдать точку и вернуть (ретейки) · сбалансированный.
   Планы сталкиваются по принципу «камень—ножницы—бумага», а не множителем к силе:
     ранние контакты ловят медленный дефолт, но их сминают быстрые выходы;
     плотная оборона разбивает быстрые выходы, но вскрывается подготовленными выходами с гранатами;
     ретейки обесценивают подготовленные выходы, но проигрывают медленному дефолту с контролем карты.
   Сыгранность плана: новый план команда ещё не умеет играть (растёт каждую неделю). Смена капитана (IGL) — команда заново
   привыкает ко всем схемам: сыгранность планов падает вдвое, даже если новый капитан индивидуально сильнее.
   ИИ-команды играют планы по своему стилю; менеджер выбирает планы на странице «Тактика». Планы соперника видны, если
   аналитик достаточно силён.
   Влияние на матч — поправка к вероятности раунда на карте (вместе со штабом CS2Staff.roundMod), в общих пределах
   0.25–0.75. Коэффициенты — CS2Config 'tactics.*' (design). */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DAY = 864e5, WEEK = 7 * DAY;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const byName = n => teams.find(t => t && t.name === n) || null;
  const pool = () => (typeof MAP_POOL !== 'undefined' && Array.isArray(MAP_POOL) ? MAP_POOL.slice() : ['Mirage', 'Inferno', 'Nuke', 'Dust II', 'Ancient', 'Anubis', 'Train']);
  const T_L = { default: 'сбалансированная атака', fast: 'быстрые выходы', exec: 'выходы с гранатами', slow: 'медленный дефолт' };
  const CT_L = { default: 'сбалансированная оборона', aggressive: 'ранние контакты', hold: 'плотная оборона', retake: 'ретейки' };
  // преимущество атаки (план T) против обороны (план CT): +1 — атака в выигрыше
  const M = { fast: { aggressive: 1, hold: -1, retake: 0, default: 0 }, exec: { hold: 1, retake: -1, aggressive: 0, default: 0 }, slow: { retake: 1, aggressive: -1, hold: 0, default: 0 }, default: { aggressive: 0, hold: 0, retake: 0, default: 0 } };
  const BY_STYLE = { Aggressive: ['fast', 'aggressive'], Discipline: ['slow', 'hold'], Tactical: ['exec', 'retake'], Chaos: ['fast', 'aggressive'] };
  const iglOf = t => { const p = (t.players || []).find(x => x && (!x.status || x.status === 'STARTER') && x.role === 'IGL'); return p ? p.nick : ''; };

  function state(t) {
    if (!t.v92tac) t.v92tac = { maps: {}, igl: iglOf(t), wk: Math.floor(now() / WEEK) };
    return t.v92tac;
  }
  function plan(t, map) {
    const s = state(t);
    if (!s.maps[map]) { const d = BY_STYLE[t.style] || ['default', 'default']; s.maps[map] = { t: d[0], ct: d[1], fam: 1, since: 0 }; }   // привычный план команды — сыгран
    return s.maps[map];
  }
  function setPlan(t, map, side, val) {
    const p = plan(t, map), L = side === 't' ? T_L : CT_L; if (!L[val] || p[side] === val) return false;
    p[side] = val; p.fam = Math.min(p.fam, C('tactics.famNew', 0.3)); p.since = now();
    try { saveTeams(); } catch (e) {}
    return true;
  }
  // сыгранность растёт по неделям; смена капитана — сыгранность всех планов падает вдвое
  function weekly() {
    const wk = Math.floor(now() / WEEK);
    teams.forEach(t => {
      if (!t || t.isAcademy || !Array.isArray(t.players)) return;
      const s = state(t), steps = clamp(wk - (s.wk || wk), 0, 12); s.wk = wk;
      const igl = iglOf(t);
      if (igl && s.igl && igl !== s.igl) { Object.values(s.maps).forEach(p => { p.fam = Math.round(p.fam * C('tactics.iglLoss', 0.5) * 100) / 100; }); s.iglChange = { from: s.igl, to: igl, at: now() }; try { W.CS2Journal && W.CS2Journal.log('TACTICS', { team: t.name, action: 'igl-change', reason: `новый капитан ${igl} вместо ${s.igl}: сыгранность схем упала` }); } catch (e) {} }
      if (igl) s.igl = igl;
      if (steps) Object.values(s.maps).forEach(p => { p.fam = Math.round(Math.min(1, p.fam + steps * C('tactics.famPerWeek', 0.15)) * 100) / 100; });
    });
  }
  // поправка к раунду для команды a против b на карте
  function mapMod(a, b, map) {
    if (!a || !b || !map) return 0;
    const pa = plan(a, map), pb = plan(b, map), K = C('tactics.k', 0.006);
    const atk = (M[pa.t] || M.default)[pb.ct] || 0, def = (M[pb.t] || M.default)[pa.ct] || 0;
    // своё преимущество реализуется настолько, насколько план сыгран; несыгранный план сам по себе стоит раундов
    return 0.5 * (atk * pa.fam - def * pb.fam) * K - (1 - pa.fam) * C('tactics.unfamK', 0.003);
  }
  function roundDelta(n1, n2, map) {
    const a = byName(n1), b = byName(n2); if (!a || !b) return 0;
    let d = 0;
    try { d += mapMod(a, b, map) - mapMod(b, a, map); } catch (e) {}
    try { if (W.CS2Staff) d += W.CS2Staff.roundMod(a, b) - W.CS2Staff.roundMod(b, a); } catch (e) {}
    return clamp(d, -C('tactics.maxDelta', 0.012), C('tactics.maxDelta', 0.012));
  }
  // в матч: та же точка, что и все модификаторы v31 (calcMapWinProbability), в общих пределах 0.25–0.75
  (function wrap() {
    if (typeof window.calcMapWinProbability !== 'function') { setTimeout(wrap, 1000); return; } CS2.patch('calcMapWinProbability', f => function (t1, t2, map) { const p = f.apply(this, arguments); let d = 0; try { d = roundDelta(t1, t2, map); } catch (e) {} return clamp(p + d, 0.25, 0.75); }, { id: '__v92' });
  })();
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { weekly(); } catch (e) {} }, 5000, 'v92-tactics');
  W.CS2Tactics = { plan, setPlan, mapMod, roundDelta, weekly, T_L, CT_L, M };

  /* ---------- страница «Тактика» ---------- */
  const H = W.HS; if (!H) return;
  if (Array.isArray(H.NAV_GAME) && !H.NAV_GAME.some(x => x[0] === 'tactics')) { const i = H.NAV_GAME.findIndex(x => x[0] === 'training'); H.NAV_GAME.splice(i >= 0 ? i + 1 : 1, 0, ['tactics', 'Тактика']); }
  const esc = H.esc, box = H.box;
  function nextOpp(t) {
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    try { const o = W.V31 && W.V31.org(t.name); if (o && o.prep && o.prep.opp) return byName(o.prep.opp); } catch (e) {}
    if (ct && !ct.completed && (ct.participants || []).includes(t.name)) { const m = (ct.matches || ct.upperRounds?.flat?.() || []).find(x => x && !x.winner && (x.t1 === t.name || x.t2 === t.name)); if (m) return byName(m.t1 === t.name ? m.t2 : m.t1); }
    return null;
  }
  H.PAGES.tactics = function () {
    const me = W.V31 && W.V31.managed && W.V31.managed(), t = byName(me);
    if (!t) return `<div class="hs-head"><h1>Тактика</h1></div>${box('Нет клуба', '<p class="hs-note">Тактику выбирает менеджер клуба — возьмите клуб на странице «Режим игры».</p>')}`;
    weekly();
    const opp = nextOpp(t), an = W.CS2Staff ? W.CS2Staff.of(t).analyst.skill : 60, sees = an >= C('tactics.scoutSkill', 70);
    const sel = (map, side, cur) => `<select class="hs-inp sm" data-v92tac="${esc(map)}|${side}">${Object.entries(side === 't' ? T_L : CT_L).map(([k, l]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    const rows = pool().map(m => { const p = plan(t, m), o = opp ? plan(opp, m) : null; const d = opp ? roundDelta(t.name, opp.name, m) : 0;
      return `<tr><td class="l"><b>${esc(m)}</b></td><td>${sel(m, 't', p.t)}</td><td>${sel(m, 'ct', p.ct)}</td><td><span class="cr-bar"><i style="width:${Math.round(p.fam * 100)}%"></i></span> ${Math.round(p.fam * 100)}%</td>
        ${opp ? `<td class="l"><small>${sees ? `${esc(T_L[o.t])} / ${esc(CT_L[o.ct])}` : 'нужен аналитик сильнее'}</small></td><td class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${sees ? (d > 0 ? '+' : '') + (d * 100).toFixed(1) + '%' : '?'}</td>` : ''}</tr>`; }).join('');
    const ig = state(t).iglChange;
    return `<div class="hs-head"><h1>Тактика</h1><div class="hs-filters"><span class="hs-sub">${esc(t.name)}${opp ? ' · следующий соперник: ' + esc(opp.name) : ''}</span></div></div>
      ${box('Планы на картах', `<table class="hs-tbl"><thead><tr><th class="l">Карта</th><th>Атака (T)</th><th>Оборона (CT)</th><th>Сыгранность</th>${opp ? '<th class="l">План соперника</th><th>Раунд</th>' : ''}</tr></thead><tbody>${rows}</tbody></table>
      <p class="hs-note">Ранние контакты ловят медленный дефолт, но их сминают быстрые выходы; плотная оборона разбивает быстрые выходы, но вскрывается выходами с гранатами; ретейки обесценивают выходы с гранатами, но проигрывают медленному дефолту. Новый план команда играет хуже, пока не сыграется (+${Math.round(C('tactics.famPerWeek', 0.15) * 100)}% в неделю).${ig ? ` Смена капитана (${esc(ig.from)} → ${esc(ig.to)}) сбила сыгранность всех схем.` : ''}</p>`)}`;
  };
  document.addEventListener('change', e => {
    if (!e.target.matches || !e.target.matches('#hs-root [data-v92tac]')) return;
    const [map, side] = e.target.dataset.v92tac.split('|'), t = byName(W.V31.managed()); if (!t) return;
    setPlan(t, map, side, e.target.value); H.render();
  });
})();
