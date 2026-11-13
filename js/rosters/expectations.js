/* v91 — Этап 1 · ожидания игроков.

   Раньше решение игрока о переходе (playerWillAccept) было набором разрозненных проверок без объяснения: сделка просто
   не происходила. Теперь у решения есть причины, и они видны: в журнале (ROSTER_BLOCK, код PLAYER_*), менеджеру —
   в советах штаба, ИИ-клубу — заранее: клуб узнаёт у агента, интересен ли игроку переход, и не тратит ход на того,
   кто откажет.
   Игрок учитывает не только деньги:
     • язык общения в команде;
     • уровень клуба: звезда и франшиза не идут в куда менее престижный клуб (CS2Stature);
     • амбиции: амбициозный игрок не уходит в клуб заметно ниже уровнем, пока у него действует контракт;
     • лояльность: преданный клубу игрок со стажем не уходит ради шага в сторону;
     • роль: снайпер и капитан не соглашаются играть на чужой позиции;
     • игровое время: молодой амбициозный игрок не идёт туда, где станет самым слабым в пятёрке и скоро сядет в запас.
   Договорённость, уже достигнутая на переговорах, не пересматривается. Пороги — в CS2Config ('expect.*'). */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const DAY = 864e5, UNIQUE = ['AWPer', 'IGL'];
  const lc = s => String(s || '').toLowerCase();
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const iglPow = p => (+p.tacticalIQ || 0) * .55 + (+p.utility || 0) * .2 + (+p.clutch || 0) * .15 + (+p.firepower || 0) * .1;
  const val = (p, role) => ((role || p.role) === 'IGL' ? iglPow(p) : pow(p));
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankOf = t => { if (!t || t.isAcademy) return 999; const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.indexOf(t); return i < 0 ? 999 : i + 1; };
  const pers = p => { try { if (W.V31 && W.V31.ensurePerson) W.V31.ensurePerson(p); } catch (e) {} return p.pers || { amb: 10, loy: 10 }; };
  const fitOf = (t, p) => { try { return typeof teamIdentityFit === 'function' ? teamIdentityFit(t, p) : 1; } catch (e) { return 1; } };

  function evaluate(p, from, to, ctx) {
    ctx = ctx || {};
    const r = { accept: true, reasons: [] };
    if (!p || !to) return r;
    const no = (code, text) => { r.accept = false; r.reasons.push({ code, text }); };
    const pp = pers(p), rf = rankOf(from), rt = rankOf(to), expiring = (+p.contractUntil || 99) <= season();
    // язык
    if (!to.isAcademy && fitOf(to, p) < C('expect.minFit', 0.5)) no('PLAYER_LANGUAGE', `${p.nick} не сможет общаться с командой`);
    // уровень клуба (вес карьеры)
    try { if (!to.isAcademy && W.CS2Stature && !W.CS2Stature.canJoin(p, to, from || null)) no('PLAYER_LEVEL', `${p.nick} (${W.CS2Stature.tier(p) === 'franchise' ? 'франшиза' : 'звезда'}) не пойдёт в клуб №${rt}`); } catch (e) {}
    // амбиции
    if (from && !from.isAcademy && (pp.amb || 0) >= C('expect.ambHigh', 14) && rt > rf + C('expect.ambDrop', 10) && !expiring && !p.v31listed)
      no('PLAYER_AMBITION', `${p.nick} амбициозен и не хочет уходить из №${rf} в №${rt}`);
    // v133: престиж клуба — не только для звёзд. Игрок с контрактом не уходит в клуб на 30+ мест ниже (если клуб его
    // не выставил и контракт не истекает); свободный агент, недавно игравший в топ-20, первые два месяца не идёт
    // в клуб ниже топ-50. Раньше обычный сильный игрок соглашался перейти куда угодно — даже в безымянную команду.
    if (!to.isAcademy && from && !from.isAcademy && rt - rf >= C('expect.prestigeDrop', 30) && !expiring && !p.v31listed)
      no('PLAYER_PRESTIGE', `${p.nick} не видит смысла уходить из №${rf} в №${rt}`);
    if (!to.isAcademy && !from) {
      const was = p.v30LastProTeam || p.v84FaTeam, wt = was ? teams.find(t => t && t.name === was) : null, wr = wt ? rankOf(wt) : 999;
      const faDays = p.v84FaSince ? (now() - p.v84FaSince) / DAY : 999;
      if (wr <= 20 && rt > C('expect.faTopMinRank', 50) && faDays < C('expect.faWaitDays', 60))
        no('PLAYER_PRESTIGE', `${p.nick} недавно играл в №${wr} и ждёт предложений сильнее, чем №${rt}`);
    }
    // лояльность
    const tenure = p.v31since ? (now() - p.v31since) / DAY : 0;
    if (from && (pp.loy || 0) >= C('expect.loyHigh', 16) && tenure >= C('expect.loyDays', 365) && rf - rt < 6 && !p.v31listed)
      no('PLAYER_LOYALTY', `${p.nick} предан ${from.name} и не уходит ради шага в сторону`);
    // роль
    const out = ctx.out !== undefined ? ctx.out : (typeof W.CS2OutFor === 'function' && !to.isAcademy ? W.CS2OutFor(to, p) : null);
    if (out && UNIQUE.includes(p.role) && out.role !== p.role) no('PLAYER_ROLE', `${p.nick} (${p.role}) не согласен играть на позиции ${out.role}`);
    // лидерство: звезда не идёт туда, где уже достаточно звёзд — лидером она там не будет
    try {
      const S = W.CS2Stature, tr = S ? S.tier(p) : 'regular';
      if (!to.isAcademy && (tr === 'star' || tr === 'franchise')) {
        const outN = ctx.out !== undefined ? ctx.out : (typeof W.CS2OutFor === 'function' ? W.CS2OutFor(to, p) : null);
        const stars = (to.players || []).filter(x => x && x !== outN && (!x.status || x.status === 'STARTER') && lc(x.nick) !== lc(p.nick) && ['star', 'franchise'].includes(S.tier(x))).length;
        if (stars >= C('expect.maxStars', 4)) no('PLAYER_LEADER', `${p.nick}: в ${to.name} уже ${stars} звезды — роли лидера не будет`);
      }
    } catch (e) {}
    // игровое время
    if (out && !to.isAcademy && (+p.age || 25) <= C('expect.youngAge', 22) && (pp.amb || 0) >= C('expect.benchAmb', 12)) {
      const rest = (to.players || []).filter(x => x && x !== out && (!x.status || x.status === 'STARTER'));
      if (rest.length) {
        const avg = rest.reduce((a, x) => a + val(x), 0) / rest.length, mine = val(p, out.role);
        if (avg - mine >= C('expect.benchRisk', 4)) no('PLAYER_PLAYTIME', `${p.nick} будет самым слабым в пятёрке ${to.name} (${mine.toFixed(0)} против ${avg.toFixed(0)}) — риск скоро сесть в запас`);
      }
    }
    return r;
  }
  W.CS2Expect = { evaluate, last: null };

  // решение игрока — с причинами; базовые правила (форма, звёздность, v31: амбиции/лояльность) сохраняются
  CS2.patch('playerWillAccept', f => function (p, fromTeam, toTeam) {
      if (W.__v86Nego || W.__v31UserDeal) return f.apply(this, arguments);         // договорённость уже достигнута
      const base = f.apply(this, arguments);
      const r = evaluate(p, fromTeam, toTeam);
      if (!base && r.accept) r.reasons.push({ code: 'PLAYER_BASE', text: `${p && p.nick} не видит смысла в переходе (форма и карьера в ${fromTeam && fromTeam.name})` });
      const ok = base && r.accept;
      W.CS2Expect.last = { player: p && p.nick, from: fromTeam && fromTeam.name, to: toTeam && toTeam.name, accept: ok, reasons: r.reasons };
      if (!ok) { try { W.CS2Journal && W.CS2Journal.log('ROSTER_BLOCK', { team: toTeam && toTeam.name, from: fromTeam && fromTeam.name, kind: 'refusal', actor: 'player', player: p && p.nick, blocks: r.reasons }); } catch (e) {} }
      return ok;
    }, { id: '__v91' });
})();
