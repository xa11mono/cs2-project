/* v84 — жизнь организаций: выкуп кора и распад команд. Раз в межсезонье (1 декабря — 10 января) каждая команда
   получает оценку кризиса: деньги (бюджет в минусе / почти пустой), чехарда трансферов за год, провал сезона
   (падение в рейтинге), низкий статус (Tier-3). При высокой оценке:
   • сильное ядро — его выкупает новая или вернувшаяся на сцену организация (iBUYPOWER, Titan, Evil Geniuses…):
     три лучших игрока переходят вместе с очками VRS (правило 3 из 5) и статусом уровня, старая организация уходит;
   • слабое ядро — команда распадается, игроки становятся свободными агентами.
   Не больше двух таких событий за межсезонье — топ-100 не «рассыпается». Своя команда игрока не затрагивается. */
(function () {
  'use strict';
  const W = window, DAY = 864e5, YEAR = 365 * DAY;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const RETURNING = ['iBUYPOWER', 'Titan', 'Evil Geniuses', 'Gambit Esports', 'Cloud9', 'OpTic Gaming', 'Team Dignitas', 'Team EnVyUs', 'Renegades', 'North', 'Natus Vincere Junior', 'Team Kinguin', 'Team Empire'];
  const pow = p => (+p.firepower || 70) * .4 + (+p.tacticalIQ || 70) * .25 + (+p.clutch || 70) * .2 + (+p.utility || 70) * .15;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const news = it => { try { W.V29News?.add?.(it); } catch (e) {} };
  const S = () => { const s = ST(); return s ? (s.v84Orgs = s.v84Orgs || { done: {}, log: [] }) : null; };
  function crisis(t, rank) {
    let sc = 0, why = [];
    let budget = null; try { budget = Number(W.V31?.org?.(t.name)?.budget); } catch (e) {}
    if (Number.isFinite(budget)) { if (budget < 0) { sc += 2; why.push('долги'); } else if (budget < 300000) { sc += 1; why.push('пустой бюджет'); } }
    const moves = (typeof transferState !== 'undefined' ? transferState.v30Moves || [] : []).filter(m => m && (m.from === t.name || m.to === t.name) && /transfer|signing|release|buyout|bench/.test(m.type || '') && nowMs() - (Number(m.ts || m.at) || 0) < YEAR).length;
    if (moves >= 6) { sc += 1; why.push('чехарда в составе'); }
    const start = Number(t.seasonStartRank) || rank; if (rank - start >= 15) { sc += 1; why.push('провальный сезон'); }
    if (W.CS2TeamTier && W.CS2TeamTier(t.name) === 3) { sc += 1; why.push('без перспектив в Tier-1'); }
    return { sc, why };
  }
  // v94: распад и выкуп ядра — в журнал Roster Engine (сторож UNTRACKED нашёл: распад KRÜ шёл мимо журнала)
  const jlog = (team, kind, players, reason, extra) => { try { W.CS2Journal?.log?.('ROSTER_CHANGE', Object.assign({ team, kind, actor: 'system', player: players.join(', '), players, reason }, extra || {})); } catch (e) {} };
  function freeAgent(p, from) { try { p.status = 'FREE AGENT'; p.v30ProOrigin = true; if (from) p.v30LastProTeam = from; delete p.v31team; transferState.freeAgents.push(p); } catch (e) {} }
  function buyout(seller, buyer) {
    const core = seller.players.filter(p => p && p.status !== 'BENCH').sort((a, b) => pow(b) - pow(a)).slice(0, 3);
    const rest = seller.players.filter(p => !core.includes(p));
    const fas = (transferState.freeAgents || []).filter(p => p && p.nick).sort((a, b) => pow(b) - pow(a)).slice(0, 2);
    transferState.freeAgents = transferState.freeAgents.filter(p => !fas.includes(p));
    const t = JSON.parse(JSON.stringify(seller));
    t.name = buyer; t.history = []; t.trophies = { majors: 0, elite: 0, regular: 0, grandFinalsWon: 0 }; t.mapHistory = []; t.photo = null; t.logo = null; t.crest = null;
    t.players = core.concat(fas).map(p => Object.assign(p, { status: 'STARTER', v31team: buyer }));
    t.rosterLastChange = { type: 'IN', player: core.map(p => p.nick).join(', '), from: seller.name, reason: `выкуп кора ${seller.name}` };
    try { if (typeof TEAM_REGION_FLAG !== 'undefined') TEAM_REGION_FLAG[buyer] = TEAM_REGION_FLAG[seller.name]; } catch (e) {}
    rest.forEach(p => freeAgent(p, seller.name));
    jlog(seller.name, 'org-buyout', core.map(p => p.nick).concat(rest.map(p => p.nick)), `кор выкуплен ${buyer}; остальные — свободные агенты`, { to: buyer });
    if (fas.length) jlog(buyer, 'org-buyout-sign', fas.map(p => p.nick), `${buyer} дополняет состав свободными агентами`);
    const i = teams.indexOf(seller); teams.splice(i, 1, t);
    try { const tr = W.CS2Tiers?.state?.(); if (tr?.teams?.[seller.name]) { tr.teams[buyer] = Object.assign({}, tr.teams[seller.name]); delete tr.teams[seller.name]; } } catch (e) {}
    try { ensurePlayerLayer(t); } catch (e) {}
    news({ cat: 'transfer', icon: '💼', imp: 8, title: `${buyer} возвращается в CS: выкуплен кор ${seller.name}`, lead: `Организация забирает ${core.map(p => p.nick).join(', ')} вместе с местом в рейтинге VRS. ${seller.name} уходит со сцены.`,
      body: [`Состав дополнят ${fas.map(p => p.nick).join(' и ') || 'игроки, которых назовут позже'}.`, `Оставшиеся игроки ${seller.name} (${rest.map(p => p.nick).join(', ') || '—'}) стали свободными агентами.`], tags: core.map(p => ({ t: 'player', v: p.nick })) });
  }
  function disband(t, why) {
    const list = (t.players || []).slice(); list.forEach(p => freeAgent(p, t.name));
    jlog(t.name, 'org-disband', list.map(p => p.nick), `организация распускает состав: ${why.join(', ')}`);
    teams.splice(teams.indexOf(t), 1);
    news({ cat: 'transfer', icon: '💔', imp: 7, title: `${t.name} распускает состав по CS2`, lead: `Причины — ${why.join(', ')}. Игроки (${list.map(p => p.nick).join(', ')}) стали свободными агентами.`, body: ['Организация не исключает возвращения в будущем.'], tags: [{ t: 'team', v: t.name }] });
  }
  function offseason() {
    const st = S(), now = nowMs(), d = new Date(now), m = d.getMonth(), day = d.getDate();
    const inWindow = (m === 11 && day >= 1) || (m === 0 && day <= 10); if (!st || !inWindow || typeof teams === 'undefined') return;
    const key = m === 11 ? d.getFullYear() : d.getFullYear() - 1; if (st.done[key]) return; st.done[key] = 1;
    const managed = (() => { try { return W.V31?.managed?.() || ''; } catch (e) { return ''; } })();
    const list = teams.filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0));
    const cands = list.map((t, i) => ({ t, rank: i + 1, ...crisis(t, i + 1) })).filter(x => x.t.name !== managed && x.sc >= 3 && x.rank > 4);
    let events = 0;
    cands.sort((a, b) => b.sc - a.sc).forEach(x => {
      if (events >= 1) return; // одно событие за межсезонье
      const chance = Math.min(.6, .15 * (x.sc - 2)); if ((h32('org|' + key + x.t.name) % 1000) / 1000 > chance) return;
      const core = x.t.players.slice().sort((a, b) => pow(b) - pow(a)).slice(0, 3), strong = core.reduce((a, p) => a + pow(p), 0) / Math.max(1, core.length) >= 78;
      // v84: возвращение старой организации — редкость: не чаще раза в три сезона и только ради сильного ядра
      // команды из топ-40 (иначе такой состав никому не интересен — он просто распадается или доживает сезон).
      const lastBuy = (st.log || []).filter(l => l.type === 'buyout').reduce((a, l) => Math.max(a, +l.y || 0), 0);
      const buyer = RETURNING.find(n => !teams.some(t => t.name === n) && !(st.log || []).some(l => l.buyer === n));
      const canBuy = strong && buyer && x.rank <= 40 && key - lastBuy >= 3 && (h32('ret|' + key) % 100) < 35;
      if (canBuy) { buyout(x.t, buyer); st.log.push({ y: key, type: 'buyout', seller: x.t.name, buyer }); }
      else if (x.sc >= 4 || x.rank > 30) { disband(x.t, x.why); st.log.push({ y: key, type: 'disband', team: x.t.name }); }
      else return;
      events++;
    });
    if (events) { try { W.saveTeams?.(); W.saveTransferState?.(); W.saveSeasonState?.(); } catch (e) {} }
  }
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(() => { if (!W.v57BatchCalendarSkip) try { offseason(); } catch (e) { console.warn('[v84 orgs]', e); } }, 7000);
  // v84: единые правила для любого трансфера (рынок, ИИ составов, выкупы):
  //  • в академию — только игроки до 21 года;
  //  • «лицо клуба» (два лучших игрока команды топ-12, до 31 года) не уходит в команду ниже рейтингом —
  //    кроме сделок самого игрока-менеджера и клубов в долгах.
  CS2.patch('applyPlayerTransfer', f => function (fromTeam, toTeam, player) {
      try {
        if (toTeam?.isAcademy && (Number(player?.age) || 25) > 21) return false;
        if (!fromTeam && toTeam && !W.__v31UserDeal && W.CS2Stature && !W.CS2Stature.canJoin(player, toTeam, null)) return false;
        if (fromTeam && toTeam && !fromTeam.isAcademy && !W.__v31UserDeal && player) {
          const list = teams.filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0)), rf = list.indexOf(fromTeam), rt = list.indexOf(toTeam);
          const stars = (fromTeam.players || []).filter(p => p && p.status !== 'BENCH').sort((a, b) => pow(b) - pow(a)).slice(0, 2);
          let debt = false; try { debt = Number(W.V31?.org?.(fromTeam.name)?.budget) < 0; } catch (e) {}
          if (rf >= 0 && rf < 12 && stars.includes(player) && (Number(player.age) || 25) <= 31 && (rt < 0 || rt > rf) && !debt) return false;
          // вес карьеры: франшиза — только в топ-10, звезда — в топ-20 или выше нынешней команды; клуб не продаёт франшизу сам
          if (W.CS2Stature && !debt && (!W.CS2Stature.canJoin(player, toTeam, fromTeam) || W.CS2Stature.protectedIn(player, fromTeam))) return false;
        }
      } catch (e) {}
      return f.apply(this, arguments);
    }, { id: '__v84gate' });
  W.CS2Orgs = { offseason, crisis, buyout, disband, state: S };
})();
