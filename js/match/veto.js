/* v84 — план вето для своей команды. Тренер заранее выбирает пермабан и приоритет пиков;
   штатное вето (conductMapVeto) учитывает план: пермабан уходит первым баном, приоритетные карты
   берутся первыми, если их не забанил соперник. Оценки карт возвращаются сразу после вето. */
(function () {
  'use strict';
  const W = window, H = W.HS;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const myTeam = () => { try { return W.V31?.managed?.() || ''; } catch (e) { return ''; } };
  const plans = () => { const s = ST(); return s ? (s.v84Veto = s.v84Veto || {}) : {}; };
  const teamBy = n => (typeof teams !== 'undefined' ? teams : []).find(t => t && t.name === n);
  const pool = () => (typeof MAP_POOL !== 'undefined' && MAP_POOL.length ? MAP_POOL.slice() : []);
  function bias(t, plan) {
    const mod = {}; if (!plan) return mod;
    if (plan.ban) mod[plan.ban] = -60;
    (plan.prio || []).forEach((m, i) => { if (m && m !== plan.ban) mod[m] = (mod[m] || 0) + [14, 9, 5][i]; });
    return mod;
  }
  {
    CS2.patch('conductMapVeto', base => function (t1Name, t2Name, mode) {
      const me = myTeam(), plan = plans()[me];
      if (!me || !plan || (t1Name !== me && t2Name !== me)) return base.apply(this, arguments);
      const t = teamBy(me); if (!t) return base.apply(this, arguments);
      const keep = { maps: t.maps, ms: t.mapStrength }, mod = bias(t, plan);
      const apply = o => { if (!o) return o; const c = { ...o }; Object.entries(mod).forEach(([m, d]) => { if (m in c || pool().includes(m)) c[m] = Math.max(1, Math.min(99, (Number(c[m]) || 55) + d)); }); return c; };
      t.maps = apply(keep.maps); if (keep.ms) t.mapStrength = apply(keep.ms);
      try { return base.apply(this, arguments); } finally { t.maps = keep.maps; t.mapStrength = keep.ms; }
    }, { id: '__v84veto' });   // метка __v84 нижнего слоя переносится сама
  }
  if (!H) return;
  const { esc, box, empty } = H;
  function nextOpp(me) {
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null; if (!ct || ct.completed) return '';
    try { const list = W.getBroadcastPlayableMatches?.() || []; const m = list.map(x => x.match).find(x => x && (x.t1 === me || x.t2 === me)); if (m) return m.t1 === me ? m.t2 : m.t1; } catch (e) {}
    return '';
  }
  H.PAGES.veto = function () {
    const me = myTeam();
    if (!me) return `<div class="hs-head"><h1>План вето</h1></div>` + box('Своя команда', empty('Выберите команду в режиме карьеры — план вето составляется для неё'));
    const plan = plans()[me] || (plans()[me] = { ban: '', prio: ['', '', ''] }), t = teamBy(me), opp = nextOpp(me), ot = opp ? teamBy(opp) : null;
    const rate = (tm, m) => Math.round(Number(tm?.mapStrength?.[m] ?? tm?.maps?.[m]) || 55);
    const rows = pool().map(m => {
      const a = rate(t, m), b = ot ? rate(ot, m) : null, d = b == null ? null : a - b;
      const role = plan.ban === m ? 'ban' : plan.prio.indexOf(m) >= 0 ? 'p' + (plan.prio.indexOf(m) + 1) : '';
      const btn = (k, l) => `<button type="button" class="hs-chip${role === k ? ' on' : ''}" data-veto="${esc(m)}|${k}">${l}</button>`;
      return `<tr><td class="l"><b>${esc(m)}</b></td><td>${a}</td><td>${b ?? '—'}</td><td class="${d == null ? '' : d >= 0 ? 'v84-pos' : 'v84-neg'}">${d == null ? '—' : (d > 0 ? '+' : '') + d}</td><td class="l v84-vbtn">${btn('ban', 'Пермабан')}${btn('p1', 'Пик 1')}${btn('p2', 'Пик 2')}${btn('p3', 'Пик 3')}${btn('', '—')}</td></tr>`;
    }).join('');
    const sum = `Пермабан: <b>${esc(plan.ban || 'по ситуации')}</b> · пики: <b>${plan.prio.filter(Boolean).map(esc).join(' → ') || 'по силе'}</b>`;
    return `<div class="hs-head"><h1>План вето · ${esc(me)}</h1></div>` +
      box(opp ? `Ближайший соперник: ${esc(opp)}` : 'Пул карт', `<table class="hs-tbl hs-stbl"><thead><tr><th class="l">Карта</th><th>Мы</th><th>${opp ? esc(opp) : 'Соперник'}</th><th>Разница</th><th class="l">План</th></tr></thead><tbody>${rows}</tbody></table><p class="v84-note">${sum}. План применяется во всех матчах команды, пока вы его не измените. Соперник может забанить ваш приоритет — тогда берётся следующая карта.</p>`, '', 'flush');
  };
  H.CLICKS.push(['[data-veto]', el => {
    const me = myTeam(); if (!me) return; const [m, k] = el.dataset.veto.split('|'), p = plans()[me] || (plans()[me] = { ban: '', prio: ['', '', ''] });
    if (p.ban === m) p.ban = ''; p.prio = p.prio.map(x => x === m ? '' : x);
    if (k === 'ban') p.ban = m; else if (/^p\d$/.test(k)) p.prio[+k[1] - 1] = m;
    try { W.saveSeasonState?.(); } catch (e) {} H.render();
  }]);
  try { if (Array.isArray(H.NAV_MORE) && !H.NAV_MORE.some(x => x[0] === 'veto')) H.NAV_MORE.push(['veto', 'План вето']); } catch (e) {}
  const addMenu = () => { try { const m = document.querySelector('.pt-menu[data-menu="more"]'); if (m && !m.querySelector('[data-nav="veto"]')) m.insertAdjacentHTML('beforeend', '<button type="button" data-nav="veto">План вето</button>'); } catch (e) {} };
  (H.AFTER || []).push(addMenu); setTimeout(addMenu, 1800);
  W.CS2VetoPlan = { plans, bias };
})();
