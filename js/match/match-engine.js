/* v84 — единый движок исхода матчей (CS2MatchEngine).
   До v84 фоновые турниры Tier-2/3 и академий решали исход своей формулой (v21BgOdds: только
   очки VRS × форма × усталость) и рисовали счёт карты случайно (13:3…13:11, овертайм всегда 16:14),
   а карта для статистики выбиралась случайно и не совпадала с сыгранными. Коэффициенты при этом
   показывались по другой модели (calcMatchOdds). Теперь любой матч проходит одну цепочку:
     calcMatchOdds / calcMapWinProbability (сила состава, форма, усталость, карты, карьера)
       → упрощённое вето по силе на картах
       → CS2Realism.simulateMap (MR12, стороны CT/T, экономика, овертаймы MR3).
   Tier-1 эфир и мгновенная симуляция уже использовали эту же цепочку. */
(function () {
  'use strict';
  const W = window;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pool = () => (typeof MAP_POOL !== 'undefined' && Array.isArray(MAP_POOL) && MAP_POOL.length ? MAP_POOL.slice() : (W.CS2Realism?.ACTIVE_DUTY || ['Mirage', 'Inferno', 'Nuke', 'Dust II', 'Ancient', 'Anubis', 'Train']).slice());
  const byName = n => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams.find(t => t && t.name === n) : null;
  const mapRating = (t, map) => {
    const v = Number(t?.mapStrength?.[map]); if (Number.isFinite(v)) return v;
    const w = Number(t?.maps?.[map]); return Number.isFinite(w) ? w : 55;
  };
  // Вето: каждая команда банит свою худшую карту, затем каждая берёт свою лучшую; решающая — из оставшихся.
  function veto(a, b, bo, rng) {
    rng = rng || Math.random;
    let left = pool();
    const ta = byName(a), tb = byName(b);
    const edge = (t, o, m) => mapRating(t, m) - mapRating(o, m);
    const ban = (t, o) => { if (left.length <= 1) return; const m = left.slice().sort((x, y) => edge(t, o, x) - edge(t, o, y))[0]; left = left.filter(x => x !== m); };
    const take = (t, o) => { const m = left.slice().sort((x, y) => edge(t, o, y) - edge(t, o, x))[0]; left = left.filter(x => x !== m); return m; };
    if (bo === 1) { while (left.length > 1) { ban(ta, tb); ban(tb, ta); } return { maps: [left[0]], pickedBy: [null] }; }
    ban(ta, tb); ban(tb, ta);
    const picks = [], by = [];
    const need = bo === 5 ? 4 : 2;
    for (let i = 0; i < need; i++) { const t = i % 2 ? tb : ta, o = i % 2 ? ta : tb; picks.push(take(t, o)); by.push(i % 2 ? b : a); }
    while (left.length > 1) { ban(ta, tb); if (left.length > 1) ban(tb, ta); }
    picks.push(left[Math.floor(rng() * left.length)] || pool()[0]); by.push(null);
    return { maps: picks, pickedBy: by };
  }
  function seriesProb(a, b, bo) {
    try { const o = W.calcMatchOdds?.(a, b, bo === 1); if (o && Number.isFinite(o.p1_win)) return o.p1_win; } catch (e) {}
    return 0.5;
  }
  function roundProb(a, b, map) {
    try { const p = W.calcMapWinProbability?.(a, b, map); if (Number.isFinite(p)) return clamp(p, 0.06, 0.94); } catch (e) {}
    return 0.5;
  }
  function playMap(a, b, map, pickedBy, rng) {
    const R = W.CS2Realism;
    const q = roundProb(a, b, map);
    if (!R?.simulateMap) {
      const win = (rng || Math.random)() < q; return { map, s1: win ? 13 : 9, s2: win ? 9 : 13, ot: false, w: win ? 1 : 2 };
    }
    const start1 = R.chooseStartSide ? R.chooseStartSide(map, a, b, pickedBy, rng) : undefined;
    const r = R.simulateMap(q, { map, start1, rng });
    return { map, s1: r.m1, s2: r.m2, ot: !!r.overtime, w: r.m1 > r.m2 ? 1 : 2, start1: r.start1 };
  }
  // Сыграть серию целиком. Возвращает формат, совместимый с фоновыми сетками v22.
  function playSeries(a, b, opts) {
    opts = opts || {};
    syncMapPool();
    const bo = [1, 3, 5].includes(Number(opts.bo)) ? Number(opts.bo) : 3, need = Math.ceil(bo / 2), rng = opts.rng || Math.random;
    const v = veto(a, b, bo, rng), maps = [];
    let w1 = 0, w2 = 0;
    for (let i = 0; i < v.maps.length && w1 < need && w2 < need; i++) {
      const m = playMap(a, b, v.maps[i], v.pickedBy[i], rng);
      maps.push(m); if (m.w === 1) w1++; else w2++;
    }
    const winner = w1 > w2 ? a : b, loser = winner === a ? b : a;
    return { winner, loser, score: `${Math.max(w1, w2)}-${Math.min(w1, w2)}`, maps, bo };
  }
  // Пул Active Duty по датам реального календаря Valve:
  //   22.01.2026 — Anubis вместо Train; 08.07.2026 — Cache вместо Overpass (Premier Season 5).
  const POOL_CHANGES = [
    { at: Date.UTC(2026, 0, 22), out: 'Train', in: 'Anubis' },
    { at: Date.UTC(2026, 6, 8), out: 'Overpass', in: 'Cache' }
  ];
  function poolFor(ms) {
    const base = ['Mirage', 'Inferno', 'Nuke', 'Dust II', 'Ancient', 'Anubis', 'Cache'];
    return base.map(m => { const ch = POOL_CHANGES.find(c => c.in === m && ms < c.at); return ch ? ch.out : m; });
  }
  let lastPoolKey = '';
  function syncMapPool() {
    try {
      if (typeof MAP_POOL === 'undefined' || !Array.isArray(MAP_POOL)) return false;
      const now = Number(typeof seasonState !== 'undefined' && seasonState?.calendar?.currentMs) || Date.now();
      const want = poolFor(now), key = want.join('|');
      if (key === lastPoolKey && MAP_POOL.join('|') === key) return false;
      const before = MAP_POOL.slice(), firstSync = !lastPoolKey; // первая синхронизация при загрузке — без новости
      MAP_POOL.splice(0, MAP_POOL.length, ...want);
      lastPoolKey = key;
      // У команд должна быть оценка силы на новой карте: берём среднюю по их пулу.
      (typeof teams !== 'undefined' ? teams : []).forEach(t => ['maps', 'mapStrength'].forEach(k => {
        const o = t && t[k]; if (!o || typeof o !== 'object') return;
        want.forEach(m => { if (!Number.isFinite(Number(o[m]))) { const v = Object.values(o).map(Number).filter(Number.isFinite); o[m] = Math.round(v.length ? v.reduce((a, b) => a + b, 0) / v.length : 55); } });
      }));
      const added = want.filter(m => !before.includes(m)), removed = before.filter(m => !want.includes(m));
      const st = typeof seasonState !== 'undefined' ? seasonState : null;
      if (st && !firstSync && added.length && removed.length && before.length && POOL_CHANGES.some(c => added.includes(c.in))) {
        st.v84PoolNews = st.v84PoolNews || {};
        const nk = added.join(',') + '>' + removed.join(',');
        if (!st.v84PoolNews[nk]) { st.v84PoolNews[nk] = 1; try { W.V29News?.add?.({ cat: 'event', icon: '🗺️', imp: 7, title: `Пул карт обновлён: ${added.join(', ')} вместо ${removed.join(', ')}`, lead: `Valve обновила Active Duty. Актуальный пул: ${want.join(', ')}.`, body: ['Командам придётся перестраивать маппул: статистика на новой карте пока минимальна.'], tags: [] }); } catch (e) {} }
      }
      return true;
    } catch (e) { return false; }
  }
  CS2.patch('conductMapVeto', baseVeto => function () { syncMapPool(); return baseVeto.apply(this, arguments); }, { id: '__v84' });
  setTimeout(syncMapPool, 1500);
  W.CS2MatchEngine = Object.freeze({ seriesProb, roundProb, veto, playMap, playSeries, syncMapPool, poolFor });
})();
