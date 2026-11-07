/* v84 — легендарные клубы и наследие. Клуб с двумя и более Мейджорами (сыгранными в игре или из перенесённой
   истории до 2026) получает статус «легендарный»: золотое свечение логотипа по всему порталу и новость.
   Когда легендарный клуб теряет игрока (завершение карьеры или уход), выходит прощальная новость и
   «спор о преемнике» — кандидаты на освободившуюся роль (свободные агенты и игроки команд ниже рейтингом). */
(function () {
  'use strict';
  const W = window;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const S = () => { const s = ST(); return s ? (s.v84Legend = s.v84Legend || { teams: {}, farewell: {} }) : null; };
  const norm = n => String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let cache = null, cacheKey = '';
  function majorsByTeam() {
    const A = (() => { try { return W.hubArchiveExport?.() || {}; } catch (e) { return {}; } })();
    const key = Object.keys(A).length + '|' + (ST()?.v84Legacy ? 1 : 0);
    if (cache && cacheKey === key) return cache;
    const c = {};
    Object.values(A).forEach(s => { if (s && !s.show && s.champion && s.champion !== '—' && /major/i.test(String(s.prestige || s.kind || ''))) c[norm(s.champion)] = (c[norm(s.champion)] || 0) + 1; });
    if (ST()?.v84Legacy && W.CS2Legacy?.MAJORS) W.CS2Legacy.MAJORS.forEach(([, , team]) => { const k = norm(team) === 'ninjasinpyjamas' ? 'nip' : norm(team); c[k] = (c[k] || 0) + 1; });
    cache = c; cacheKey = key; return c;
  }
  // активность: титул Tier-1/S-Tier/Major за последние 3 календарных года (включая перенесённую историю) или статус Tier-1
  function recentTitle(name) {
    const y = new Date(Number(ST()?.calendar?.currentMs) || Date.now()).getFullYear(), k = norm(name);
    try { const ix = W.CS2TitleIndex?.(); if (ix && (ix.lastYear[k] || 0) >= y - 3) return true; } catch (e) {}
    if (ST()?.v84Legacy && W.CS2Legacy) { const all = (W.CS2Legacy.MAJORS || []).concat(W.CS2Legacy.ELITE || []); if (all.some(([, yr, team]) => (norm(team) === 'ninjasinpyjamas' ? 'nip' : norm(team)) === k && yr >= y - 3)) return true; }
    return false;
  }
  // легендарность держится только на свежих трофеях: 2+ Мейджора в истории и титул Tier-1/S-Tier/Major за последние 3 года
  const isLegend = name => (majorsByTeam()[norm(name)] || 0) >= 2 && recentTitle(name);
  const memo = new Map(); let memoAt = 0;
  W.CS2Legend = name => { const now = Date.now(); if (now - memoAt > 5000) { memo.clear(); memoAt = now; } if (!memo.has(name)) memo.set(name, isLegend(name)); return memo.get(name); };
  const pow = p => (+p.firepower || 70) * .4 + (+p.tacticalIQ || 70) * .25 + (+p.clutch || 70) * .2 + (+p.utility || 70) * .15;
  const news = it => { try { W.V29News?.add?.(it); } catch (e) {} };
  function candidates(team, role) {
    const tl = (typeof teams !== 'undefined' ? teams : []).filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0)), rank = tl.findIndex(t => t.name === team);
    // v86: кандидаты — той же роли и того же языка общения, что и команда; капитанов сравнивают по тактике
    const tm = tl[rank] || null, igl = /IGL/i.test(role || '');
    const lang = p => { try { return !tm || typeof teamIdentityFit !== 'function' || teamIdentityFit(tm, p) >= 0.55; } catch (e) { return true; } };
    const fit = p => p && p.nick && lang(p) && (!role || String(p.role || '').slice(0, 3).toLowerCase() === String(role).slice(0, 3).toLowerCase() || (!/IGL|AWP/i.test(role) && !/IGL|AWP/i.test(p.role || '')));
    const score = p => igl ? (+p.tacticalIQ || 0) : pow(p);
    const pool = (typeof transferState !== 'undefined' ? transferState.freeAgents || [] : []).filter(fit).map(p => ({ p, from: 'свободный агент' }))
      .concat(tl.slice(rank + 3).flatMap(t => (t.players || []).filter(fit).map(p => ({ p, from: t.name }))));
    return pool.sort((a, b) => score(b.p) - score(a.p)).slice(0, 3);
  }
  function tick() {
    const st = S(); if (!st || typeof teams === 'undefined') return;
    // новые легендарные клубы
    const c = majorsByTeam();
    // потеря статуса: долгий спад (нет титулов 3 года и команда вне Tier-1)
    Object.keys(st.teams).forEach(n => { if (st.teams[n] && !isLegend(n)) { delete st.teams[n]; if (ST()?.v84LegendInit) news({ cat: 'season', icon: '🕯️', imp: 6, title: `${n}: легендарный статус угас`, lead: 'Три года без титулов Tier-1: легендарный статус держится только на свежих трофеях.', body: ['История клуба никуда не денется, но вернуть статус можно только новыми трофеями.'], tags: [{ t: 'team', v: n }] }); } });
    teams.filter(t => !t.isAcademy && isLegend(t.name) && !st.teams[t.name]).forEach(t => {
      st.teams[t.name] = Number(ST()?.calendar?.currentMs) || Date.now();
      if (Object.keys(st.teams).length > 0 && ST()?.v84LegendInit) news({ cat: 'season', icon: '👑', imp: 7, title: `${t.name} — легендарный клуб`, lead: `${c[norm(t.name)]} Мейджора в истории: ${t.name} входит в число легендарных организаций CS.`, body: ['Логотип клуба теперь отмечен золотым свечением.'], tags: [{ t: 'team', v: t.name }] });
    });
    const s0 = ST(); if (s0 && !s0.v84LegendInit) s0.v84LegendInit = 1; // при первом запуске — без новостей «задним числом»
    // прощание и спор о преемнике
    const moves = (typeof transferState !== 'undefined' ? transferState.v30Moves || [] : []).slice(-40);
    moves.forEach(m => {
      if (!m || !m.player || !m.from || !W.CS2Legend(m.from) || !/retire|transfer|buyout|release/.test(m.type || '')) return;
      const key = m.player + '|' + m.from; if (st.farewell[key]) return; st.farewell[key] = 1;
      const retire = m.type === 'retire';
      // v86: если клуб уже нашёл замену (выкуп, подписание, повышение из академии) — пишем о ней, а не гадаем
      const all = (typeof transferState !== 'undefined' ? transferState.v30Moves || [] : []);
      const repl = all.find(x => x && x !== m && x.to === m.from && x.player !== m.player && /transfer|buyout|signing|promotion/.test(x.type || '') && Math.abs((x.ts || 0) - (m.ts || 0)) <= 5 * 864e5);
      const team = (typeof teams !== 'undefined' ? teams : []).find(t => t.name === m.from);
      const capNow = /IGL/i.test(m.role || '') && team ? (team.players || []).find(p => p && p.role === 'IGL' && p.status !== 'BENCH') : null;
      const cand = repl ? [] : candidates(m.from, m.role);
      news({ cat: 'player', icon: retire ? '🙏' : '👋', imp: 6, title: retire ? `Легендарный ${m.from} прощается с ${m.player}` : `${m.player} покидает легендарный ${m.from}`,
        lead: retire ? `${m.player} завершает карьеру. Клуб благодарит игрока за годы в составе.` : `${m.player} уходит из ${m.from}${m.to && m.to !== '—' ? ` в ${m.to}` : ''}. Фанаты обсуждают, кто займёт его место.`,
        body: repl ? [`Замена уже найдена: ${repl.player}${repl.from && repl.from !== '—' ? ` (${repl.from})` : ''}.${capNow && capNow.nick !== m.player ? ` Капитан команды — ${capNow.nick}.` : ''}`]
          : [cand.length ? `Кто заменит ${m.player}? Сообщество называет кандидатов: ${cand.map(x => `${x.p.nick} (${x.from})`).join(', ')}.` : 'Клуб не спешит с решением: возможно, место займёт игрок академии.', 'Окончательное решение — в межсезонье, к старту нового сезона.'],
        tags: [{ t: 'player', v: m.player }, { t: 'team', v: m.from }] });
    });
  }
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(() => { if (!W.v57BatchCalendarSkip) try { tick(); } catch (e) {} }, 6000);
  W.CS2LegendClubs = { tick, majorsByTeam, state: S };
})();
