/* v87 — актуальные составы 2026.
   Один раз на сохранение (только первый сезон, 2026 год) составы команд приводятся к реальным
   (js/data-rosters-2026.js): тот же игрок переносится вместе со своими характеристиками и историей,
   новые игроки создаются из базы игроков, ушедшие — становятся свободными агентами.
   Если игрок из реального состава числился в другой команде, там его место занимает игрок из резерва
   той же страны. Команду менеджера (карьера) скрипт не трогает — её состав решает игрок. */
(function () {
  'use strict';
  const DATA = window.CS2_ROSTERS_2026; if (!DATA || !DATA.teams) return;
  const lc = s => String(s || '').toLowerCase();
  const managed = () => { try { return (window.V31 && window.V31.managed && window.V31.managed()) || ''; } catch (e) { return ''; } };
  function ready() {
    return typeof teams !== 'undefined' && Array.isArray(teams) && teams.length > 20 && typeof seasonState !== 'undefined' && seasonState
      && typeof createPlayerFromNick === 'function' && !document.getElementById('v84-legacy-modal');
  }
  function ensureIgl(t) {
    const ps = (t.players || []).filter(p => p.status !== 'BENCH').slice(0, 5);
    if (!ps.length || ps.some(p => p.role === 'IGL')) return;
    const c = ps.filter(p => p.role !== 'AWPer').sort((a, b) => (+b.tacticalIQ || 0) - (+a.tacticalIQ || 0))[0] || ps[0];
    c.role = 'IGL';
  }
  function apply() {
    const me = managed();
    const byName = new Map(teams.map(t => [lc(t.name), t]));
    // где сейчас каждый игрок (объект игрока сохраняет характеристики, форму, историю)
    const where = new Map();
    teams.forEach(t => (t.players || []).forEach(p => { if (p && p.nick && !where.has(lc(p.nick))) where.set(lc(p.nick), { p, t }); }));
    const fa = (typeof transferState !== 'undefined' && Array.isArray(transferState.freeAgents)) ? transferState.freeAgents : null;
    (fa || []).forEach(p => { if (p && p.nick && !where.has(lc(p.nick))) where.set(lc(p.nick), { p, t: null }); });
    const claimed = new Set(), changed = new Set(), plan = [];
    // 1) целевые составы
    Object.entries(DATA.teams).forEach(([name, list]) => {
      const t = byName.get(lc(name)); if (!t || t.name === me) return;
      const nicks = list.map(x => x[0]).filter(n => { const w = where.get(lc(n)); return !(w && w.t && w.t.name === me); }); // игроков менеджера не забираем
      nicks.forEach(n => claimed.add(lc(n)));
      plan.push({ t, list: list.filter(x => nicks.includes(x[0])) });
    });
    const dropped = [];
    plan.forEach(({ t, list }) => {
      const before = (t.players || []).map(p => lc(p.nick)).join(',');
      const next = list.map(([nick, cc], i) => {
        const w = where.get(lc(nick));
        const p = w ? w.p : createPlayerFromNick(t, nick, i);
        if (!w && cc && !p.country) { p.country = cc; if (typeof countryFlag === 'function') p.flag = countryFlag(cc); }
        p.status = 'STARTER';
        return p;
      });
      // неполный реальный состав (3–4 игрока) — добираем из прежних игроков команды, кого никто не забрал
      (t.players || []).forEach(p => { if (next.length < 5 && !claimed.has(lc(p.nick)) && !next.includes(p)) { next.push(p); claimed.add(lc(p.nick)); } });
      (t.players || []).forEach(p => { if (!claimed.has(lc(p.nick))) dropped.push(p); });
      t.players = next;
      if (next.map(p => lc(p.nick)).join(',') !== before) { changed.add(t); t.rosterSource = 'HLTV ' + DATA.asOf; t.rosterUpdatedAt = DATA.asOf; }
    });
    // 2) остальные команды: убрать «двойников», добрать до пяти из резерва
    teams.forEach(t => {
      if (plan.some(x => x.t === t)) return;
      const keep = (t.players || []).filter(p => !claimed.has(lc(p.nick)) || t.name === me);
      if (keep.length === (t.players || []).length) return;
      const cs = [...new Set(keep.map(p => p.country).filter(Boolean))];
      while (keep.filter(p => p.status !== 'BENCH').length < 5) {
        const r = window.V33Reserve && (window.V33Reserve.take({ countries: cs.length ? cs : undefined }) || window.V33Reserve.take({}));
        if (!r) break;
        const p = createPlayerFromNick(t, r.nick, keep.length); if (r.country) { p.country = r.country; if (typeof countryFlag === 'function') p.flag = countryFlag(r.country); }
        p.status = 'STARTER'; keep.push(p); claimed.add(lc(r.nick));
      }
      t.players = keep; changed.add(t);
    });
    // 3) ушедшие — в свободные агенты
    if (fa) {
      const inFa = new Set(fa.map(p => lc(p.nick)));
      dropped.forEach(p => { if (!claimed.has(lc(p.nick)) && !inFa.has(lc(p.nick))) { p.status = 'FA'; fa.push(p); inFa.add(lc(p.nick)); } });
      transferState.freeAgents = fa.filter(p => !claimed.has(lc(p.nick)));
    }
    changed.forEach(t => { ensureIgl(t); try { if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(t); } catch (e) {} });
    seasonState.v87Rosters2026 = DATA.asOf;
    try { if (typeof saveTeams === 'function') saveTeams(); } catch (e) {}
    try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {}
    try { window.HS && window.HS.render && window.HS.render(); } catch (e) {}
    console.info(`[v87] составы 2026: обновлено команд — ${changed.size}`);
    return changed.size;
  }
  // Справочник игры должен знать этих игроков как реальных: иначе проверка «сгенерированных» игроков (v33/v86)
  // заменяет новичков из реальных составов (st1xsy, Brain47, ms2180) игроками резерва.
  try {
    Object.entries(DATA.teams).forEach(([name, list]) => {
      list.forEach(([nick, cc]) => { if (typeof PLAYER_META_2026 !== 'undefined' && !PLAYER_META_2026[nick]) PLAYER_META_2026[nick] = cc ? { country: cc } : {}; });
      if (typeof TEAM_ROSTER_2026 !== 'undefined' && list.length >= 5) TEAM_ROSTER_2026[name] = list.slice(0, 5).map(x => x[0]);
    });
  } catch (e) { console.warn('[v87 rosters meta]', e); }
  let tries = 0;
  const timer = setInterval(() => {
    if (++tries > 90) return clearInterval(timer);
    if (!ready()) return;
    if (seasonState.v87Rosters2026 === DATA.asOf || (Number(seasonState.currentSeason) || 1) > 1) return clearInterval(timer);
    clearInterval(timer);
    try { apply(); } catch (e) { console.warn('[v87 rosters]', e); }
  }, 2000);
  window.CS2Rosters2026 = { apply, data: DATA };
})();
