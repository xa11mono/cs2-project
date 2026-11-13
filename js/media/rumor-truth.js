/* v86 — слухи о командах только о том, что клуб действительно планирует, и у каждого слуха есть итог.
   • CS2TeamPlan(team) — что клуб делает с составом прямо сейчас: оценивает состав, ищет игрока, ведёт переговоры
     (состояния v34 и переговоры рынка v30). Нет плана — нет слуха «в X растёт напряжение / грядут перемены».
   • Когда клуб переходит к оценке состава или поиску игрока, выходит один слух о нём (с реальными причинами).
   • Слух о команде подтверждается, когда клуб меняет состав или тренера; опровергается, когда клуб
     успокаивается (состояние «стабилен») или долго ничего не происходит. */
(function () {
  'use strict';
  const W = window, DAY = 864e5;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const N = () => W.V29News;
  const nowMs = () => Number(seasonState?.calendar?.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const pk = (a, k) => a[h32(k) % a.length];
  const PLAN_STATES = { UNDER_REVIEW: 'review', TRANSFER_SEARCH: 'search', NEGOTIATION: 'nego' };
  const MOVE_TYPES = /transfer|buyout|signing|promotion|loan|coach|bench/;

  function plan(name) {
    if (!name) return null;
    try {
      const nego = (typeof transferState !== 'undefined' ? transferState.v30Nego || [] : []).find(n => n && (n.to === name || n.from === name));
      if (nego) return { kind: 'nego', nego, why: nego.to === name ? `переговоры о ${nego.player}` : `интерес к ${nego.player} со стороны ${nego.to}` };
      const x = W.V34Roster?.st?.(name);
      if (x && PLAN_STATES[x.state]) return { kind: PLAN_STATES[x.state], why: (x.signals || []).map(s => s.t).slice(0, 2).join('; ') };
    } catch (e) {}
    return null;
  }
  W.CS2TeamPlan = plan;

  const S = () => { const s = seasonState.v86Rumors = seasonState.v86Rumors || { seen: {} }; s.seen = s.seen || {}; return s; };
  const ranked = () => teams.filter(t => t && !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const openTeamRumor = name => (N()?.all() || []).find(x => x.teamRumor && x.team === name && !x.confirmed && !x.denied);

  // слух в момент, когда клуб действительно начинает думать о перестановках
  function announce() {
    const o = S(), top = ranked().slice(0, 30), quiet = !o.init; o.init = 1;   // первый запуск в идущем сейве — без пачки слухов задним числом
    top.forEach(t => {
      const p = plan(t.name); if (!p || p.kind === 'nego') return;    // о переговорах пишет рынок (слух с именем игрока)
      const x = W.V34Roster?.st?.(t.name); const key = t.name + '|' + (x?.since || 0);
      if (quiet || o.seen[key] || openTeamRumor(t.name)) { o.seen[key] = 1; return; }
      o.seen[key] = 1;
      const search = p.kind === 'search';
      N()?.add?.({ cat: 'rumor', rumor: true, teamRumor: true, team: t.name, planKind: p.kind, icon: '🕵️', imp: search ? 5 : 4,
        title: search ? pk([`Источники: ${t.name} ищут усиление`, `${t.name} присматриваются к рынку`, `Инсайд: ${t.name} готовят замену в составе`], key)
          : pk([`Слухи: в ${t.name} обсуждают состав`, `Источники: ${t.name} на грани перестройки?`, `В ${t.name} недовольны результатами`], key),
        lead: search ? `По данным источников, руководство ${t.name} ищет игрока на рынке.` : `По данным источников, в ${t.name} оценивают текущий состав.`,
        body: [p.why ? `Причины: ${p.why}.` : '', 'Слух подтвердится, если клуб изменит состав, и будет снят, если клуб решит сохранить пятёрку.'].filter(Boolean),
        tags: [{ t: 'team', v: t.name }] });
    });
    const keys = Object.keys(o.seen); if (keys.length > 400) keys.slice(0, keys.length - 300).forEach(k => delete o.seen[k]);
  }

  // итог слухов о командах
  function resolve() {
    const items = (N()?.all() || []).filter(x => x.teamRumor && x.team && !x.confirmed && !x.denied);
    if (!items.length) return 0;
    const moves = typeof transferState !== 'undefined' ? transferState.v30Moves || [] : [];
    let n = 0;
    items.forEach(it => {
      const ts = Number(it.ts) || 0;
      const mv = moves.find(m => m && (m.ts || 0) >= ts - DAY && MOVE_TYPES.test(m.type || '') && (m.to === it.team || (m.type === 'coach' && m.from === it.team) || (m.type === 'bench' && m.from === it.team)));
      if (mv) {
        it.confirmed = true; n++;
        it.body = (it.body || []).concat([mv.type === 'coach' ? `Обновление: слух подтвердился — ${it.team} сменили тренера (${mv.player}).` : `Обновление: слух подтвердился — ${mv.player} ${mv.to === it.team ? 'в составе ' + it.team : 'покидает основу'}.`]);
        return;
      }
      const age = nowMs() - ts, p = plan(it.team);
      if ((!p && age > 45 * DAY) || age > 120 * DAY) {
        it.denied = true; n++;
        it.body = (it.body || []).concat([`Обновление: слух не подтвердился — ${it.team} сохранили состав.`]);
      }
    });
    if (n) { try { N()?.flush?.(); } catch (e) {} }
    return n;
  }
  W.CS2RumorTruth = { plan, announce, resolve, hasOpen: n => !!openTeamRumor(n) };

  // старые сохранения: атмосферные слухи без плана за плечами получают итог по тем же правилам
  setTimeout(() => { try { (N()?.all() || []).forEach(x => { if (x.cat === 'rumor' && !x.player && x.team && !x.nego && !x.teamRumor) x.teamRumor = true; }); resolve(); } catch (e) {} }, 5000);
  (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => {
    if (W.v57BatchCalendarSkip || !N()?.add) return;
    try { announce(); resolve(); } catch (e) { console.warn('[v86] rumors', e); }
  }, 3000);
  console.info('[v86] слухи о командах привязаны к планам клубов');
})();
