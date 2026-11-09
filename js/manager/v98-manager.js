/* v98 — режим тренера: главное окно, матч дня, состав на тренировке.

   1. ГЛАВНОЕ ОКНО (#/hub, «Главное окно» — первый пункт «Карьеры»; сюда же ведут «Рабочее место» и «Возглавить клуб»)
      Сетка панелей, как в менеджерах: следующий матч, отчёт о сопернике, календарь на 4 недели, задачи и решения,
      финансы (баланс по журналу операций), подготовка к сопернику, последние матчи, состав (уровень и потенциал в
      звёздах, возраст, контракт, настроение, Rating 3.0), мировой рейтинг. Все данные — из существующих систем
      (V31, CS2Finance, HLTV-статистика, расписания турниров), игровые данные не меняются.

   2. МАТЧ ДНЯ — матчи своей команды больше не пролистываются
      Раньше «Продолжить» и пропуск дней разыгрывали матчи клуба менеджера мгновенно, как чужие. Теперь перед матчем
      своей команды время останавливается и открывается окно «Матч дня»: соперник, форма, личные встречи, сильные
      карты, состав и его состояние. Дальше:
        • «Смотреть матч» (турниры основного календаря) — включается эфир, скорость 1x, открывается режим зрителя;
        • «Быстрый результат» — матч разыгрывается сразу, открывается «Итог матча» (счёт, карты);
        • «Подготовка к сопернику» — разведка; окно вернётся при следующем «Продолжить».
      Матчи фоновых турниров (Tier-2/3, отборы, академии) — тоже с остановкой; трансляции у них нет, только результат.
      Флажок «Не останавливаться на матчах моей команды» возвращает прежнее поведение (seasonState.v98AutoMatches).
      Чужие матчи не затрагиваются, пропуск дней работает как раньше.

   3. ТРЕНИРОВКИ: карточки игроков — фото, роль, четыре навыка полосами, усталость, рост за сезон. */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31;
  if (!H || !V || typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const esc = H.esc, logo = H.logo || (() => ''), DAY = 864e5;
  const $ = id => document.getElementById(id);
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const byName = n => teams.find(t => t && t.name === n) || null;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const ranked = () => pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const rankOf = n => { const i = ranked().findIndex(t => t.name === n); return i < 0 ? null : i + 1; };
  const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const starters = t => (t && t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
  const money = v => { try { return V.money(v); } catch (e) { return '$' + Math.round(v).toLocaleString('en-US'); } };
  const fdate = ms => ms ? new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—';
  const ftime = ms => ms ? new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
  const lc = s => String(s || '').toLowerCase();
  const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);
  const statsP = () => { try { return H.stats().P || {}; } catch (e) { return {}; } };
  const statsT = () => { try { return H.stats().T || {}; } catch (e) { return {}; } };
  const ratingOf = nick => { try { const o = statsP()[nick]; if (!o) return null; const b = o.bySeason && o.bySeason[season()]; const L = H.line(b && b.maps >= 2 ? b : o.all); return L && L.maps ? L : null; } catch (e) { return null; } };

  /* ------------------------------------------------------------ звёзды уровня и потенциала */
  // уровень 70 → ½ звезды … 95 → 5 звёзд (шаг ½)
  const starsOf = v => Math.max(0.5, Math.min(5, Math.round(((v - 68) / 27 * 5) * 2) / 2));
  function starsHtml(v, cls) {
    const s = starsOf(v), full = Math.floor(s), half = s - full >= 0.5;
    return `<span class="v98-stars ${cls || ''}" title="${Math.round(v)}" aria-label="${s} из 5">${'<i class="f">★</i>'.repeat(full)}${half ? '<i class="h">★</i>' : ''}${'<i>★</i>'.repeat(5 - full - (half ? 1 : 0))}</span>`;
  }
  const moodOf = p => { const m = +p.morale || 75; return m >= 85 ? ['Отличное', 'up'] : m >= 70 ? ['Хорошее', 'up'] : m >= 55 ? ['Ровное', 'ok'] : ['Плохое', 'dn']; };
  const contractTxt = p => { const y = (+p.contractUntil || season()) - season(); return y <= 0 ? 'до конца сезона' : y === 1 ? '+1 сезон' : `+${y} сезона`; };
  const ratingCls = r => r >= 1.1 ? 'up' : r >= 0.98 ? 'ok' : 'dn';

  /* ------------------------------------------------------------ ближайший матч команды */
  function bgMatches(name, includeDone) {
    const out = [];
    (seasonState.parallelSchedule || []).forEach(ev => {
      if (!ev || !ev.br || !Array.isArray(ev.br.matches)) return;
      ev.br.matches.forEach(m => { if (m && (m.t1 === name || m.t2 === name) && (includeDone || !m.w)) out.push({ ev, m }); });
    });
    return out;
  }
  function mainItem(name) {
    const t = CT(); if (!t || t.completed) return null;
    let list = []; try { list = getBroadcastPlayableMatches() || []; } catch (e) {}
    const it = list.find(x => x && x.match && !x.match.winner && (x.match.t1 === name || x.match.t2 === name));
    if (it) return it;
    try { const n = getNextPlayableMatch(); if (n && n.match && !n.match.winner && (n.match.t1 === name || n.match.t2 === name)) return n; } catch (e) {}
    return null;
  }
  const mainKey = (t, m) => `M|${t ? t.name : ''}|${m.t1}|${m.t2}`;
  const bgKey = (ev, m) => `B|${ev.id}|${m.id}`;
  function liveItem(name) {
    const b = CT() && CT().broadcast; if (!b || !b.running) return null;
    return (b.active || []).find(x => x && x.match && (x.match.t1 === name || x.match.t2 === name)) || null;
  }
  function nextMatch(name) {
    if (!name) return null;
    const t = CT(), live = liveItem(name);
    if (live) { const m = live.match; return { kind: 'main', live: true, ev: t.name, stage: live.stage || '', opp: m.t1 === name ? m.t2 : m.t1, at: now(), key: mainKey(t, m), bo: m.isBO1 ? 1 : 3 }; }
    const cands = [];
    const it = mainItem(name);
    if (it) { const m = it.match; cands.push({ kind: 'main', ev: t.name, stage: it.stage || '', opp: m.t1 === name ? m.t2 : m.t1, at: Number(t.calendar && t.calendar.nextMatchAt) || now(), key: mainKey(t, m), bo: m.isBO1 ? 1 : 3, item: it }); }
    bgMatches(name).forEach(({ ev, m }) => { if (m.t1 && m.t2) cands.push({ kind: 'bg', ev: ev.name, evId: ev.id, mId: m.id, stage: (ev.br.rounds || []).find(r => (r.ids || []).includes(m.id))?.name || '', opp: m.t1 === name ? m.t2 : m.t1, at: +m.at || now(), key: bgKey(ev, m), bo: 3 }); });
    cands.sort((a, b) => a.at - b.at);
    return cands[0] || null;
  }
  function nextEvent(name) {
    const t0 = now(), out = [];
    const ct = CT(); if (ct && !ct.completed && (ct.participants || ct.teams || []).some(x => (x.name || x) === name)) out.push({ name: ct.name, start: t0, live: true });
    (seasonState.seasonSchedule || []).forEach(st => {
      const start = Number(st && st.calendar && st.calendar.startMs) || 0; if (!start || start < t0) return;
      const inv = (st.v35Roster && st.v35Roster.participants) || st.v45Participants || (st.v95Major && st.v95Major.direct) || st.v35Invites || [];
      if (inv.includes(name)) out.push({ name: st.name, start, end: Number(st.calendar.endMs) || start, kind: st.type });
    });
    (seasonState.parallelSchedule || []).forEach(e => { if (e && e.status !== 'completed' && (e.participants || []).includes(name)) out.push({ name: e.name, start: e.startMs, end: e.endMs, kind: 'tier' + (e.tier || '') }); });
    return out.sort((a, b) => a.start - b.start);
  }

  /* ------------------------------------------------------------ 2. матч дня: остановка перед матчем своей команды */
  const ST = () => { const s = seasonState.v98 = seasonState.v98 || { allow: [], results: [] }; return s; };
  let pending = null, skipping = 0, pausedByUs = false;
  const auto = () => !!seasonState.v98AutoMatches;
  const allowed = key => ST().allow.includes(key);
  const allow = key => { const a = ST().allow; if (!a.includes(key)) a.push(key); if (a.length > 40) a.splice(0, a.length - 40); };
  const isPaused = () => { try { return W.v15IsCalendarPaused ? W.v15IsCalendarPaused() : !!seasonState.calendar.paused; } catch (e) { return false; } };
  function pauseTime() { if (!isPaused() && typeof W.toggleGameCalendarPause === 'function') { try { W.toggleGameCalendarPause(); pausedByUs = true; } catch (e) {} } }
  function resumeTime() { if (pausedByUs && isPaused() && typeof W.toggleGameCalendarPause === 'function') { try { W.toggleGameCalendarPause(); } catch (e) {} } pausedByUs = false; try { ST().pausedByUs = false; } catch (e) {} }
  function hold(info) {
    if (pending && pending.key === info.key) return true;
    pending = Object.assign({ at: now() }, info);
    W.__v98MatchHalt = pending;
    pauseTime();
    // ожидающий матч и «паузу ставили мы» — в сейв: после перезагрузки окно матча вернётся, а время не останется на паузе
    const s = ST(); s.pending = pending; s.pausedByUs = pausedByUs;
    try { saveSeasonState(); } catch (e) {}
    try { W.v34SaveTournament && W.v34SaveTournament(); } catch (e) {}
    return true;
  }
  // матч ещё не сыгран?
  function stillOpen(p) {
    if (!p) return false;
    if (p.kind === 'main') { const it = mainItem(me()); return !!it && mainKey(CT(), it.match) === p.key; }
    const ev = (seasonState.parallelSchedule || []).find(e => e && e.id === p.evId), m = ev && ev.br && (ev.br.matches || []).find(x => x.id === p.mId);
    return !!m && !m.w;
  }
  // восстановление после перезагрузки
  setTimeout(function restore() {
    try {
      const s = ST();
      if (s.pending && me() && stillOpen(s.pending)) { pending = s.pending; W.__v98MatchHalt = pending; pausedByUs = !!s.pausedByUs; return; }
      if (s.pending || s.pausedByUs) { pausedByUs = !!s.pausedByUs; s.pending = null; s.pausedByUs = false; resumeTime(); try { saveSeasonState(); } catch (e) {} }
    } catch (e) { console.warn('[v98 restore]', e); }
  }, 2500);
  // фоновые турниры: вызывается из v22Advance перед розыгрышем матча
  function holdBg(ev, m) {
    const name = me(); if (!name || auto() || !m || (m.t1 !== name && m.t2 !== name)) return false;
    const key = bgKey(ev, m); if (allowed(key)) return false;
    return hold({ kind: 'bg', key, ev: ev.name, evId: ev.id, mId: m.id, opp: m.t1 === name ? m.t2 : m.t1, stage: (ev.br && ev.br.rounds || []).find(r => (r.ids || []).includes(m.id))?.name || '', bo: 3 });
  }
  // основной календарь: розыгрыш при пропуске идёт через instantMatch
  (function hookInstant() {
    const f = W.instantMatch; if (typeof f !== 'function') { setTimeout(hookInstant, 500); return; } if (f.__v98) return;
    const w = function (match, cb) {
      try {
        const name = me(), t = CT();
        if (name && !auto() && match && !match.winner && (match.t1 === name || match.t2 === name) && (skipping > 0 || W.v57BatchCalendarSkip)) {
          const key = mainKey(t, match);
          if (!allowed(key)) { hold({ kind: 'main', key, ev: t ? t.name : '', opp: match.t1 === name ? match.t2 : match.t1, bo: match.isBO1 ? 1 : 3 }); return; }
        }
      } catch (e) { console.warn('[v98 match day]', e); }
      const r = f.apply(this, arguments);
      try { const name = me(); if (name && match && match.winner && (match.t1 === name || match.t2 === name)) noteResult({ kind: 'main', ev: CT() ? CT().name : '', a: match.t1, b: match.t2, w: match.winner, score: match.score }); } catch (e) {}
      return r;
    };
    w.__v98 = true; Object.keys(f).forEach(k => { if (!(k in w)) w[k] = f[k]; });
    W.instantMatch = w; try { instantMatch = w; } catch (e) {} // eslint-disable-line no-global-assign
  })();
  // пропуск дня и перемотка — помечаем, что время идёт по кнопке (тогда матч своей команды останавливает время)
  function wrapSkip(name) {
    const f = W[name]; if (typeof f !== 'function' || f.__v98) return !!(f && f.__v98);
    const w = function () {
      skipping++;
      let r; try { r = f.apply(this, arguments); } catch (e) { skipping--; throw e; }
      if (r && typeof r.then === 'function') return r.finally(() => { skipping = Math.max(0, skipping - 1); });
      skipping = Math.max(0, skipping - 1); return r;
    };
    w.__v98 = true; Object.keys(f).forEach(k => { if (!(k in w)) w[k] = f[k]; });
    W[name] = w; return true;
  }
  (function hookSkips(n) { const ok = ['skipGameCalendarDay', 'v33SkipDays', 'v33SkipToTier1'].map(wrapSkip).every(Boolean); if (!ok && n < 40) setTimeout(() => hookSkips(n + 1), 500); })(0);
  // эфир: матч своей команды закончился — итог
  (function hookBroadcast() {
    const f = W.finishBroadcastSeries; if (typeof f !== 'function') { setTimeout(hookBroadcast, 800); return; } if (f.__v98) return;
    const w = function (item) {
      const r = f.apply(this, arguments);
      try { const name = me(), m = item && item.match, st = item && item.state; if (name && m && (m.t1 === name || m.t2 === name) && st) { const wn = st.series1 > st.series2 ? m.t1 : m.t2; noteResult({ kind: 'main', ev: CT() ? CT().name : '', a: m.t1, b: m.t2, w: wn, score: `${st.series1}-${st.series2}`, maps: (st.mapResults || []).map(x => ({ map: x.map, s1: x.t1Score, s2: x.t2Score })) }, true); } } catch (e) {}
      return r;
    };
    w.__v98 = true; Object.keys(f).forEach(k => { if (!(k in w)) w[k] = f[k]; });
    W.finishBroadcastSeries = w; try { finishBroadcastSeries = w; } catch (e) {} // eslint-disable-line no-global-assign
  })();
  function mapsFromHistory(a, b) {
    const t = byName(me()); if (!t) return [];
    const opp = a === t.name ? b : a, h = (t.mapHistory || []).slice(0, 7).filter(x => x.opponent === opp);
    const first = h.length ? h[0].tournament : null;
    return h.filter(x => x.tournament === first).reverse().map(x => ({ map: x.map, txt: x.score || x.result, res: x.result }));
  }
  let resultQueue = [];
  function noteResult(r, show) {
    const s = ST(); r.ts = now(); s.results.unshift(r); if (s.results.length > 20) s.results.length = 20;
    if (show) { resultQueue.push(r); }
  }

  /* ------------------------------------------------------------ окна: матч дня и итог */
  const isRunning = () => { const l = $('pt-skip-l'); return !!l && /Пропуск|К матчу/.test(l.textContent || ''); };
  function teamCard(name, side) {
    const t = byName(name), rk = rankOf(name), T = statsT()[name] || {};
    const form = (T.form || []).slice(0, 5).map(x => `<i class="${x}">${x}</i>`).join('');
    return `<div class="v98-md-side ${side}">${logo(name, 'xl')}<b>${esc(name)}</b><small>${rk ? '№' + rk + ' в мире' : ''}</small><span class="hs-form">${form}</span></div>`;
  }
  function h2hTxt(a, b) { const T = statsT()[a]; const h = T && T.h2h && T.h2h[b]; return h ? `${h.w} : ${h.l}` : '0 : 0'; }
  function bestMaps(name, n) {
    const t = byName(name); if (!t) return [];
    const ms = t.mapStats || {};
    return Object.entries(t.maps || {}).filter(([, v]) => Number.isFinite(+v)).map(([m, v]) => ({ m, v: +v, n: ms[m] ? (ms[m].wins || 0) + (ms[m].losses || 0) : 0 })).sort((a, b) => b.v - a.v).slice(0, n || 3);
  }
  function lineupRows(name) {
    return starters(byName(name)).map(p => `<li><span class="ph">${H.photoHtml ? H.photoHtml(p) : ''}</span><span class="nm"><b>${esc(p.nick)}</b><small>${esc(p.role || '')}</small></span><em class="${(+p.fatigue || 0) >= 45 ? 'dn' : ''}">усталость ${Math.round(+p.fatigue || 0)}</em><em>форма ${Math.round(+p.form || 100)}</em></li>`).join('');
  }
  function overlay(html, cls) {
    let el = $('v98-ov');
    if (!el) { el = document.createElement('div'); el.id = 'v98-ov'; el.className = 'v98-ov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
    el.className = 'v98-ov ' + (cls || ''); el.innerHTML = `<div class="v98-ov-box">${html}</div>`; el.hidden = false;
    const f = el.querySelector('.v98-primary') || el.querySelector('button'); if (f) setTimeout(() => f.focus(), 30);
  }
  const closeOverlay = () => { const el = $('v98-ov'); if (el) el.hidden = true; };
  const overlayOpen = () => { const el = $('v98-ov'); return !!el && !el.hidden; };
  function matchDayHtml(p) {
    const name = me(), opp = p.opp, ob = bestMaps(opp, 3), mb = bestMaps(name, 3);
    const watchOk = p.kind === 'main' && !!CT() && !CT().completed;
    return `<header class="v98-md-h"><span class="v98-kicker">Матч дня</span><h2>${esc(p.ev || 'Матч')}</h2><p>${esc([p.stage, 'Bo' + (p.bo || 3), fdate(now())].filter(Boolean).join(' · '))}</p></header>
      <div class="v98-md-vs">${teamCard(name, 'a')}<div class="v98-md-mid"><span>VS</span><small>личные встречи ${esc(h2hTxt(name, opp))}</small></div>${teamCard(opp, 'b')}</div>
      <div class="v98-md-grid">
        <section><h3>Состав ${esc(name)}</h3><ul class="v98-md-line">${lineupRows(name)}</ul></section>
        <section><h3>Сильные карты</h3><div class="v98-md-maps"><div><small>${esc(name)}</small>${mb.map(x => `<p><b>${esc(x.m)}</b><span>${x.v.toFixed(0)}%</span></p>`).join('') || '<p class="hs-dim">нет данных</p>'}</div><div><small>${esc(opp)}</small>${ob.map(x => `<p><b>${esc(x.m)}</b><span>${x.v.toFixed(0)}%</span></p>`).join('') || '<p class="hs-dim">нет данных</p>'}</div></div></section>
      </div>
      <footer class="v98-md-f">
        ${watchOk ? '<button type="button" class="v98-btn v98-primary" data-v98md="watch">Смотреть матч</button>' : ''}
        <button type="button" class="v98-btn ${watchOk ? '' : 'v98-primary'}" data-v98md="quick">Быстрый результат</button>
        <button type="button" class="v98-btn ghost" data-v98md="prep">Подготовка к сопернику</button>
        ${watchOk ? '' : '<small class="v98-dim">Трансляции фоновых турниров нет — только результат.</small>'}
        <label class="v98-auto"><input type="checkbox" data-v98auto${auto() ? ' checked' : ''}> Не останавливаться на матчах моей команды</label>
      </footer>`;
  }
  function resultHtml(r) {
    const name = me(), won = r.w === name, opp = r.a === name ? r.b : r.a;
    const mm = /(\d+)\s*[-:]\s*(\d+)/.exec(String(r.score || '')), sc = mm ? [+mm[1], +mm[2]] : [NaN, NaN];
    // порядок в строке счёта разный (основной календарь — по командам, фоновые турниры — «победитель–проигравший»),
    // поэтому счёт клуба — по исходу: у победителя большее число
    const hi = Math.max(sc[0], sc[1]), lo = Math.min(sc[0], sc[1]), mine = won ? [hi, lo] : [lo, hi];
    const maps = r.maps && r.maps.length ? r.maps.map(x => { const a = r.a === name ? x.s1 : x.s2, b = r.a === name ? x.s2 : x.s1; return `<li class="${a > b ? 'up' : 'dn'}"><b>${esc(x.map)}</b><span>${a} : ${b}</span></li>`; }).join('')
      : mapsFromHistory(r.a, r.b).map(x => `<li class="${x.res === 'W' ? 'up' : 'dn'}"><b>${esc(x.map)}</b><span>${esc(x.txt)}</span></li>`).join('');
    return `<header class="v98-md-h"><span class="v98-kicker ${won ? 'up' : 'dn'}">${won ? 'Победа' : 'Поражение'}</span><h2>${esc(name)} ${Number.isFinite(mine[0]) ? mine[0] + ' : ' + mine[1] : ''} ${esc(opp)}</h2><p>${esc(r.ev || '')}</p></header>
      ${maps ? `<ul class="v98-res-maps">${maps}</ul>` : ''}
      <footer class="v98-md-f"><button type="button" class="v98-btn v98-primary" data-v98md="close">Продолжить</button><button type="button" class="v98-btn ghost" data-v98md="hub">Главное окно</button></footer>`;
  }
  function openMatchDay() { if (!pending) return; overlay(matchDayHtml(pending), 'md'); }
  function finishPending() { pending = null; W.__v98MatchHalt = null; const s = ST(); s.pending = null; s.pausedByUs = pausedByUs; }
  function quick() {
    const p = pending; if (!p) return;
    allow(p.key); resumeTime();
    let r = null;
    try {
      if (p.kind === 'main') {
        const it = mainItem(me());
        if (it) { W.instantMatch(it.match, it.callback); try { renderTournament(); } catch (e) {} const m = it.match; if (m.winner) r = { kind: 'main', ev: p.ev, a: m.t1, b: m.t2, w: m.winner, score: m.score }; }
      } else {
        try { W.v21ProcessParallelNow && W.v21ProcessParallelNow({}); } catch (e) {}
        const ev = (seasonState.parallelSchedule || []).find(e => e && e.id === p.evId), m = ev && ev.br && ev.br.matches.find(x => x.id === p.mId);
        if (m && m.w) r = { kind: 'bg', ev: ev.name, a: m.t1, b: m.t2, w: m.w, score: m.sc, maps: (m.maps || []).map(x => ({ map: x.map, s1: x.s1 != null ? x.s1 : x.t1Score, s2: x.s2 != null ? x.s2 : x.t2Score })) };
      }
    } catch (e) { console.warn('[v98 quick]', e); }
    finishPending();
    try { saveTeams(); saveSeasonState(); } catch (e) {}
    try { W.v34SaveTournament && W.v34SaveTournament(); } catch (e) {}   // идущий турнир сохраняется сразу, а не через 12 с
    if (r) { if (r.kind === 'bg') noteResult(r); overlay(resultHtml(r), 'res'); } else closeOverlay();   // матч основного турнира уже записан в обёртке instantMatch
    try { H.render(); } catch (e) {}
  }
  function watch() {
    const p = pending; if (!p) return;
    allow(p.key); finishPending(); closeOverlay();
    if (isPaused() && typeof W.toggleGameCalendarPause === 'function') { try { W.toggleGameCalendarPause(); } catch (e) {} } pausedByUs = false; ST().pausedByUs = false;
    try { if (typeof W.setGameCalendarSpeed === 'function') W.setGameCalendarSpeed(1); } catch (e) {}
    try { const t = CT(); if (t && !t.completed && !(t.broadcast && t.broadcast.running) && typeof startTVBroadcastMode === 'function') startTVBroadcastMode(); } catch (e) { console.warn('[v98 watch]', e); }
    try { H.nav('watch'); } catch (e) {}
  }
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-v98md]'); if (!b) return;
    const k = b.dataset.v98md;
    if (k === 'watch') watch();
    else if (k === 'quick') quick();
    else if (k === 'prep') { closeOverlay(); H.nav('scout'); }
    else if (k === 'close') { closeOverlay(); showQueued(); }
    else if (k === 'hub') { closeOverlay(); H.nav('hub'); }
  });
  document.addEventListener('change', e => { if (e.target && e.target.matches && e.target.matches('[data-v98auto]')) { seasonState.v98AutoMatches = !!e.target.checked; try { saveSeasonState(); } catch (x) {} } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlayOpen() && !pending) closeOverlay(); });
  // «Продолжить» при ожидающем матче — сначала окно матча
  W.addEventListener('click', e => {
    if (!pending) return;
    const el = e.target && e.target.closest && e.target.closest('#pt-skip,[data-skipn],[data-skipt1]'); if (!el || isRunning()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    document.querySelectorAll('.pt-dd.open').forEach(x => x.classList.remove('open'));
    openMatchDay();
  }, true);
  // матч своей команды пошёл в эфире (время идёт само, 1x–16x) — уведомление со ссылкой на трансляцию
  const toasted = new Set();
  function liveToast() {
    const name = me(), it = name && liveItem(name), el = $('v98-toast');
    if (!it || H.S.page === 'watch') { if (el && !it) el.remove(); return; }
    const key = mainKey(CT(), it.match); if (toasted.has(key)) return; toasted.add(key);
    const opp = it.match.t1 === name ? it.match.t2 : it.match.t1, t = document.createElement('div');
    t.id = 'v98-toast'; t.className = 'v98-toast'; t.setAttribute('role', 'status');
    t.innerHTML = `<b class="v98-live">LIVE</b><span>Матч вашей команды начался: <b>${esc(name)}</b> — <b>${esc(opp)}</b></span><button type="button" class="v98-btn v98-primary sm" data-v98watch>Смотреть</button><button type="button" class="v98-x" aria-label="Закрыть" data-v98tx>×</button>`;
    if (el) el.remove(); document.body.appendChild(t);
  }
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('[data-v98watch]')) { $('v98-toast')?.remove(); try { if (typeof W.setGameCalendarSpeed === 'function') W.setGameCalendarSpeed(1); } catch (x) {} H.nav('watch'); }
    else if (e.target.closest && e.target.closest('[data-v98tx]')) $('v98-toast')?.remove();
  });
  function showQueued() { const r = resultQueue.shift(); if (r && !overlayOpen()) overlay(resultHtml(r), 'res'); }
  setInterval(() => {
    try {
      if (!me()) { if (pending) { finishPending(); resumeTime(); } return; }
      // ожидающий матч всегда в сейве (seasonState могут пересоздавать другие системы — запись не должна теряться)
      { const s = ST(); if (pending && (!s.pending || s.pending.key !== pending.key)) { s.pending = pending; s.pausedByUs = pausedByUs; try { saveSeasonState(); } catch (e) {} } }
      if (pending && !isRunning() && !stillOpen(pending)) { finishPending(); resumeTime(); }
      if (pending && !isRunning() && !overlayOpen() && document.visibilityState !== 'hidden' && !document.getElementById('v96-gate')?.matches(':not([hidden])')) openMatchDay();
      if (!pending && resultQueue.length && !overlayOpen()) showQueued();
      const c = $('pt-skip'); if (c) c.classList.toggle('v98-matchday', !!pending);
      liveToast();
    } catch (e) {}
  }, 500);
  W.CS2MatchDay = { holdBg, nextMatch, nextEvent, pending: () => pending, open: openMatchDay, quick, watch, results: () => ST().results.slice() };

  /* ------------------------------------------------------------ 1. главное окно */
  const panel = (title, body, opts) => `<section class="v98-p ${opts && opts.cls || ''}"><header><h3>${title}</h3>${opts && opts.link ? `<button type="button" class="v98-link" data-nav="${opts.link[0]}"${opts.link[2] ? ` data-arg="${esc(opts.link[2])}"` : ''}>${opts.link[1]} →</button>` : ''}</header><div class="v98-pb">${body}</div></section>`;
  function pNext(t) {
    const n = nextMatch(t.name), ne = nextEvent(t.name)[0];
    if (!n) return panel('Следующий матч', ne ? `<div class="v98-nx-ev"><b>${esc(ne.name)}</b><small>${ne.live ? 'идёт сейчас' : 'старт ' + fdate(ne.start)}</small><p class="v98-dim">Соперник определится по жеребьёвке.</p></div>` : '<p class="v98-dim">Приглашений на турниры пока нет. Следите за отборами в календаре.</p>', { cls: 'v98-next', link: ['calendar', 'Календарь'] });
    const today = new Date(n.at).toDateString() === new Date(now()).toDateString();
    return panel('Следующий матч', `<div class="v98-nx"><div class="v98-nx-ev"><b>${esc(n.ev)}</b><small>${esc([n.stage, 'Bo' + n.bo].filter(Boolean).join(' · '))}</small></div>
      <div class="v98-nx-vs"><div>${logo(t.name, 'xl')}<b>${esc(t.name)}</b><small>№${rankOf(t.name) || '—'}</small></div><span>VS</span><div>${logo(n.opp, 'xl')}<b data-team="${esc(n.opp)}">${esc(n.opp)}</b><small>№${rankOf(n.opp) || '—'}</small></div></div>
      <div class="v98-nx-f"><span>${n.live ? '<b class="v98-live">LIVE</b> идёт сейчас' : (today ? 'Сегодня' : fdate(n.at)) + (n.kind === 'main' && !n.live ? '' : ' · ' + ftime(n.at))}</span>
      ${pending ? '<button type="button" class="v98-btn v98-primary sm" data-v98open>К матчу</button>' : n.live ? '<button type="button" class="v98-btn v98-primary sm" data-nav="watch">Смотреть</button>' : '<button type="button" class="v98-btn sm" data-nav="scout">Подготовка</button>'}</div></div>`, { cls: 'v98-next' });
  }
  function pOpp(t) {
    const n = nextMatch(t.name); if (!n) return panel('Отчёт о сопернике', '<p class="v98-dim">Отчёт появится, когда станет известен соперник.</p>');
    const o = byName(n.opp); if (!o) return panel('Отчёт о сопернике', '<p class="v98-dim">Нет данных о сопернике.</p>');
    let pr = ''; try { pr = W.V33Prestige ? W.V33Prestige.starsHtml(W.V33Prestige.prestige(o.name)) : ''; } catch (e) {}
    let budget = null; try { budget = V.org(o.name).budget; } catch (e) {}
    const top = starters(o).slice().sort((a, b) => pow(b) - pow(a)).slice(0, 2);
    const recent = (o.history || []).filter(h => h && !h.isBootcamp && !h.isSeasonAward && h.tournament).slice(0, 3);
    const kv = (v, l) => `<div><b>${v}</b><small>${l}</small></div>`;
    return panel('Отчёт о сопернике', `<div class="v98-op-h">${logo(o.name, 'lg')}<b data-team="${esc(o.name)}">${esc(o.name)}</b></div>
      <div class="v98-kv">${kv('№' + (rankOf(o.name) || '—'), 'Мировой рейтинг')}${kv(pr || '—', 'Престиж')}${kv((() => { try { return typeof getTeamFlag === 'function' ? getTeamFlag(o.name) : '—'; } catch (e) { return '—'; } })(), 'Страна')}${kv(budget == null ? '—' : budget > 3e6 ? '<span class="up">Высокие</span>' : budget > 8e5 ? 'Средние' : '<span class="dn">Низкие</span>', 'Финансы')}</div>
      <div class="v98-op-g"><div><h4>Лучшие игроки</h4>${top.map(p => { const L = ratingOf(p.nick); return `<button type="button" class="v98-op-pl" data-player="${esc(p.nick)}"><span class="ph">${H.photoHtml ? H.photoHtml(p) : ''}</span><b>${esc(p.nick)}</b><small>${L ? L.rating.toFixed(2) + ' Rating · ' + Math.round(L.adr || 0) + ' ADR' : esc(p.role || '')}</small></button>`; }).join('')}</div>
      <div><h4>Сильные карты</h4>${bestMaps(o.name, 3).map(x => `<p class="v98-map"><b>${esc(x.m)}</b><span>${x.v.toFixed(1)}%</span></p>`).join('') || '<p class="v98-dim">нет данных</p>'}</div>
      <div><h4>Последние турниры</h4>${recent.map(h => `<p class="v98-rec"><b>${esc(h.tournament)}</b><small>${esc(h.placeTitle || (h.place ? h.place + '-е место' : ''))}</small></p>`).join('') || '<p class="v98-dim">нет данных</p>'}</div></div>`, { cls: 'v98-opp', link: ['scout', 'Разведка'] });
  }
  function pCalendar(t) {
    const t0 = now(), d0 = new Date(t0); d0.setHours(0, 0, 0, 0);
    const start = d0.getTime() - ((d0.getDay() + 6) % 7) * DAY, weeks = [0, 1, 2, 3].map(i => ({ from: start + i * 7 * DAY, to: start + (i + 1) * 7 * DAY, items: [] }));
    const put = (ms, txt, cls) => { const w = weeks.find(x => ms >= x.from && ms < x.to); if (w) w.items.push({ ms, txt, cls }); };
    nextEvent(t.name).forEach(e => { if (e.live) put(t0, e.name, 'ev live'); else put(e.start, e.name, 'ev'); });
    bgMatches(t.name).forEach(({ ev, m }) => { if (m.t1 && m.t2) put(+m.at, `${m.t1 === t.name ? m.t2 : m.t1} · матч`, 'mt'); });
    try { (V.S().events || []).filter(e => e.team === t.name && e.status === 'open' && e.until).forEach(e => put(e.until, `Срок: ${e.title}`, 'dl')); } catch (e) {}
    const exp = (t.players || []).filter(p => p && (+p.contractUntil || 99) <= season()); if (exp.length) put(t0, `Контракты: ${exp.map(p => p.nick).join(', ')}`, 'dl');
    const mon = ms => new Date(ms).toLocaleDateString('ru-RU', { month: 'short' });
    return panel('Календарь', `<div class="v98-cal">${weeks.map((w, i) => `<div class="v98-cal-w${i === 0 ? ' on' : ''}"><header><b>${mon(w.from)}</b><small>Нед. ${i === 0 ? '(эта)' : '+' + i}</small></header>${w.items.sort((a, b) => a.ms - b.ms).slice(0, 4).map(x => `<p class="${x.cls}" title="${esc(fdate(x.ms))}">${esc(x.txt)}</p>`).join('') || '<p class="v98-dim">—</p>'}</div>`).join('')}</div>`, { link: ['calendar', 'Весь календарь'] });
  }
  function tasks(t) {
    const items = [], o = V.org(t.name), c = V.S();
    (c.events || []).filter(e => e.team === t.name && e.status === 'open').forEach(e => items.push({ l: e.title, d: `ответить до ${fdate(e.until)}`, nav: 'inbox', urgent: e.until - now() < 3 * DAY }));
    const offs = (o.v94offers && o.v94offers.list) || []; if (offs.length) items.push({ l: `Предложения спонсоров: ${offs.length}`, d: 'контракт с партнёром заканчивается', nav: 'finance', urgent: true });
    const exp = (t.players || []).filter(p => p && (+p.contractUntil || 99) <= season()); if (exp.length) items.push({ l: `Истекают контракты: ${exp.map(p => p.nick).join(', ')}`, d: 'продление — в переговорах', nav: 'negotiate' });
    if (!o.train || o.train.auto) items.push({ l: 'План тренировок не утверждён', d: o.train && o.train.auto ? 'действует план ассистента' : 'фокус и интенсивность', nav: 'training' });
    const n = nextMatch(t.name); if (n && !(o.prep && now() - (o.prep.ts || 0) < 10 * DAY)) items.push({ l: `Подготовка к матчу с ${n.opp}`, d: 'разведка соперника даёт бонус в матче', nav: 'scout', urgent: true });
    const tired = starters(t).filter(p => (+p.fatigue || 0) >= 50); if (tired.length) items.push({ l: `${tired.map(p => p.nick).join(', ')}: сильная усталость`, d: 'восстановление в плане тренировок', nav: 'training', urgent: true });
    try { const k = W.CS2Board.contract(t.name); if (k && k.status === 'active' && k.warned) items.push({ l: 'Предупреждение руководства', d: 'доверие ниже порога', nav: 'org', urgent: true }); } catch (e) {}
    try { (W.CS2Press.promises() || []).filter(p => p.team === t.name && p.status === 'open').forEach(p => items.push({ l: `Обещание прессе: «${p.text}»`, d: 'проверка после турнира', nav: 'career' })); } catch (e) {}
    return items;
  }
  function pTasks(t) {
    const it = tasks(t);
    return panel(`Задачи и решения · ${it.length}`, it.length ? `<ul class="v98-tasks">${it.slice(0, 7).map(x => `<li class="${x.urgent ? 'urg' : ''}"><button type="button" data-nav="${x.nav}"><b>${esc(x.l)}</b><small>${esc(x.d || '')}</small><em>Открыть</em></button></li>`).join('')}</ul>` : '<p class="v98-dim">Срочных дел нет — можно продолжать.</p>', { link: ['inbox', 'Центр событий'] });
  }
  function pFinance(t) {
    const o = V.org(t.name), led = (o.ledger || []).slice(0, 40);
    // баланс по времени: от текущего назад по журналу операций
    let bal = +o.budget || 0; const pts = [{ ts: now(), v: bal }]; led.forEach(x => { bal -= +x.amt || 0; pts.push({ ts: x.ts, v: bal }); });
    pts.reverse();
    let fc = null; try { fc = W.CS2Finance.forecast(t); } catch (e) {}
    let wage = 0; try { wage = V.wageBill(t); } catch (e) {}
    const Wd = 300, Hh = 90, vs = pts.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), rng = Math.max(1, hi - lo);
    const path = pts.length > 1 ? pts.map((p, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1) * Wd).toFixed(1)} ${(Hh - 6 - (p.v - lo) / rng * (Hh - 12)).toFixed(1)}`).join('') : '';
    return panel('Финансы', `<div class="v98-fin-h"><small>Баланс</small><b class="${o.budget < 0 ? 'dn' : 'up'}">${money(o.budget)}</b></div>
      ${path ? `<svg class="v98-spark" viewBox="0 0 ${Wd} ${Hh}" preserveAspectRatio="none" aria-hidden="true"><path d="${path}"/></svg>` : ''}
      <div class="v98-kv two"><div><b>${fc ? money(fc.end) : '—'}</b><small>Прогноз на конец сезона</small></div><div><b>${wage ? money(wage) : '—'}</b><small>Зарплаты за сезон</small></div></div>`, { link: ['finance', 'Финансы'] });
  }
  function pPrep(t) {
    const o = V.org(t.name), n = nextMatch(t.name), fresh = o.prep && now() - (o.prep.ts || 0) < 10 * DAY;
    let ch = null, cf = null; try { ch = V.chemistry(t); cf = V.teamConf(t); } catch (e) {}
    const ring = (v, l) => `<div class="v98-ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" class="tr"/><circle cx="22" cy="22" r="18" class="br" stroke-dasharray="${(113.1 * Math.max(0, Math.min(1, v))).toFixed(1)} 113.1" transform="rotate(-90 22 22)"/></svg><b>${Math.round(v * 100)}</b><small>${l}</small></div>`;
    return panel('Подготовка', `<div class="v98-prep">${ch != null ? ring(ch, 'Сыгранность') : ''}${cf != null ? ring(cf / 100, 'Уверенность') : ''}
      <div class="v98-prep-t"><b>${n ? (fresh ? `Соперник изучен: ${esc(o.prep.opp || n.opp)}` : `Соперник не изучен: ${esc(n.opp)}`) : 'Соперника пока нет'}</b><small>${fresh ? 'бонус подготовки действует' : 'разведка и анти-страты дают бонус в матче'}</small>
      <button type="button" class="v98-btn sm" data-nav="${n && !fresh ? 'scout' : 'tactics'}">${n && !fresh ? 'Изучить соперника' : 'Тактика'}</button></div></div>`);
  }
  function pLast(t) {
    const h = (t.mapHistory || []).slice(0, 9);
    return panel('Последние матчи', h.length ? `<table class="v98-tbl"><thead><tr><th class="l">Турнир</th><th class="l">Соперник</th><th class="l">Карта</th><th>Счёт</th></tr></thead><tbody>${h.map(x => `<tr><td class="l v98-ell">${esc(x.tournament || '')}</td><td class="l"><button type="button" data-team="${esc(x.opponent)}">${logo(x.opponent, 'xs')} ${esc(x.opponent)}</button></td><td class="l">${esc(x.map || '')}</td><td class="${x.result === 'W' ? 'up' : 'dn'}"><b>${esc(x.score || x.result)}</b></td></tr>`).join('')}</tbody></table>` : '<p class="v98-dim">Матчей в этом сезоне ещё не было.</p>', { link: ['team', 'Все матчи', t.name] });
  }
  function pRoster(t) {
    const list = (t.players || []).filter(Boolean).slice().sort((a, b) => ((a.status === 'BENCH') - (b.status === 'BENCH')));
    return panel('Состав', `<table class="v98-tbl v98-roster"><thead><tr><th class="l">Игрок</th><th>Возраст</th><th>Уровень</th><th>Потенциал</th><th>Контракт</th><th>Настроение</th><th>Rating</th></tr></thead><tbody>${list.map(p => { const L = ratingOf(p.nick), md = moodOf(p), pot = Math.max(pow(p), +p.pot || pow(p));
      return `<tr data-player="${esc(p.nick)}"><td class="l"><span class="v98-pl"><span class="ph">${H.photoHtml ? H.photoHtml(p) : ''}</span><span><b>${H.pFlag ? H.pFlag(p) : ''} ${esc(p.nick)}</b><small>${esc(p.role || '')}${p.status === 'BENCH' ? ' · запас' : ''}</small></span></span></td>
        <td>${esc(String(p.age || '—'))}</td><td>${starsHtml(pow(p))}</td><td>${starsHtml(pot, 'pot')}</td><td>${esc(contractTxt(p))}</td><td class="${md[1]}">${md[0]}</td><td class="${L ? ratingCls(L.rating) : ''}">${L ? L.rating.toFixed(2) : '—'}</td></tr>`; }).join('')}</tbody></table>`, { cls: 'v98-wide', link: ['team', 'Страница команды', t.name] });
  }
  function pRanking(t) {
    const r = ranked(), my = r.findIndex(x => x.name === t.name), show = r.slice(0, 12);
    if (my >= 12) show.push(null, r[my]);
    return panel('Мировой рейтинг', `<ol class="v98-rk">${show.map(x => x ? `<li class="${x.name === t.name ? 'me' : ''}" data-team="${esc(x.name)}"><span>${r.indexOf(x) + 1}</span>${logo(x.name, 'xs')}<b>${esc(x.name)}</b><em>${Math.round(x.pts || 0)}</em></li>` : '<li class="gap">…</li>').join('')}</ol>`, { link: ['ranking', 'Рейтинг'] });
  }
  function hubPage() {
    const t = byName(me());
    if (!t) return `<div class="hs-head"><h1>Главное окно</h1></div><section class="v98-p"><div class="v98-pb v98-empty"><b>Вы ещё не возглавили клуб</b><p>Выберите организацию — главное окно тренера появится здесь: матчи, состав, задачи, финансы.</p><button type="button" class="v98-btn v98-primary" data-nav="pick">Выбрать организацию</button></div></section>`;
    const rk = rankOf(t.name);
    return `<div class="hs-head v98-head"><h1>${logo(t.name, 'md')} ${esc(t.name)}</h1><div class="hs-filters"><span class="hs-sub">№${rk || '—'} в мире · сезон ${season()} · ${fdate(now())}</span><button type="button" class="v98-btn sm ghost" data-nav="org">Штаб организации</button></div></div>
      <div class="v98-grid">
        ${pNext(t)}${pOpp(t)}${pCalendar(t)}
        ${pTasks(t)}${pFinance(t)}${pPrep(t)}${pLast(t)}
        ${pRoster(t)}${pRanking(t)}
      </div>`;
  }
  H.PAGES.hub = hubPage;
  H.PAGES.desk = hubPage;   // «Рабочее место» — то же главное окно
  if (Array.isArray(H.NAV_GAME) && !H.NAV_GAME.some(x => x[0] === 'hub')) H.NAV_GAME.unshift(['hub', 'Главное окно']);
  H.CLICKS.push(['[data-v98open]', () => openMatchDay()]);
  // пункт меню «Главное окно» в «Карьере»
  (function addMenu(n) {
    const menu = document.querySelector('#hs-root .pt-menu[data-menu="game"]');
    if (!menu) { if (n < 40) setTimeout(() => addMenu(n + 1), 500); return; }
    // «Рабочее место» теперь то же главное окно — второй пункт меню не нужен
    menu.querySelectorAll('[data-nav="desk"]').forEach(b => { b.hidden = true; });
    if (!menu.querySelector('[data-nav="hub"]')) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.nav = 'hub'; b.textContent = 'Главное окно';
      menu.insertBefore(b, menu.firstElementChild);
    }
    try { W.CS2Shell && W.CS2Shell.refresh(); } catch (e) {}
  })(0);
  // заголовок экрана в оболочке
  try { if (H.TITLES) H.TITLES.hub = 'Главное окно'; } catch (e) {}

  /* ------------------------------------------------------------ 3. тренировки: состав карточками */
  const bar = (v, l) => `<div class="v98-bar"><small>${l}</small><i><b style="width:${Math.max(0, Math.min(100, (v - 50) * 2)).toFixed(0)}%"></b></i><em>${Math.round(v)}</em></div>`;
  if (Array.isArray(H.AFTER)) H.AFTER.push(page => {
    if (page !== 'training') return;
    try {
      const t = byName(me()), root = $('hs-page'); if (!t || !root || root.querySelector('.v98-train')) return;
      const cards = starters(t).map(p => { const g = p.v31tg && p.v31tg.s === season() ? p.v31tg.sum : 0, fat = Math.round(+p.fatigue || 0);
        return `<button type="button" class="v98-tc" data-player="${esc(p.nick)}"><span class="v98-tc-ph ph">${H.photoHtml ? H.photoHtml(p, true) : ''}</span>
          <span class="v98-tc-h"><b>${H.pFlag ? H.pFlag(p) : ''} ${esc(p.nick)}</b><small>${esc(p.role || '')} · ${esc(String(p.age || '—'))} лет</small>${starsHtml(pow(p))}</span>
          <span class="v98-tc-b">${bar(+p.firepower || 0, 'Огонь')}${bar(+p.tacticalIQ || 0, 'Тактика')}${bar(+p.clutch || 0, 'Клатч')}${bar(+p.utility || 0, 'Утилити')}</span>
          <span class="v98-tc-f"><em class="${fat >= 50 ? 'dn' : fat >= 30 ? 'ok' : 'up'}">усталость ${fat}</em><em class="${g > 0 ? 'up' : ''}">рост ${g >= 0 ? '+' : ''}${g.toFixed(2)}</em></span></button>`; }).join('');
      const html = `<section class="v98-train"><header><h3>Состав на тренировке</h3><small>${esc(t.name)} · основной состав</small></header><div class="v98-tcs">${cards}</div></section>`;
      const head = root.querySelector('.hs-head'); const first = root.querySelector('.hs-box, section');
      if (first) first.insertAdjacentHTML('beforebegin', html); else if (head) head.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('afterbegin', html);
    } catch (e) { console.warn('[v98 training]', e); }
  });

  /* ------------------------------------------------------------ после выбора клуба — в главное окно */
  W.CS2HubAfterPick = () => { try { H.nav('hub'); } catch (e) {} };
  // при запуске игры в режиме менеджера стартовая страница — главное окно (портал HLTV — пункт «Главная» в меню)
  setTimeout(() => { try { if (me() && (H.S.page === 'home' || !H.S.page) && /^(#\/?(home)?)?$/.test(location.hash || '')) H.nav('hub'); } catch (e) {} }, 1200);
})();
