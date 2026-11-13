/* v84/v86 — «умная» замена ушедшего игрока (завершение карьеры и т.п.).
   v86: уходит капитан — клуб в первую очередь ищет капитана:
   1) свободный агент или выкуп настоящего IGL (роль IGL, сильная тактика) у команды ниже в рейтинге;
   2) если такого нет — роль переходит к игроку состава, который к ней готов (тактика ≥ 84, не AWPer,
      энтри-фраггер — в последнюю очередь), а на освободившееся место ищут стрелка;
   3) если и такого нет — опытный свободный агент с лучшей тактикой.
   Любой кандидат должен подходить команде по языку общения (teamIdentityFit) и по статусу (CS2Stature).
   Обычная замена (не капитан): лучший подходящий свободный агент или выкуп; иначе — молодой игрок. */
(function () {
  'use strict';
  const W = window;
  const RICH = ['Team Falcons', 'Team Vitality', 'NAVI', 'Team Spirit', 'G2', 'FAZE', 'FaZe', 'Team Liquid', 'MOUZ', 'FURIA'];
  const pow = p => (+p.firepower || 70) * .4 + (+p.tacticalIQ || 70) * .25 + (+p.clutch || 70) * .2 + (+p.utility || 70) * .15;
  const iglPow = p => (+p.tacticalIQ || 70) * .55 + (+p.utility || 70) * .2 + (+p.clutch || 70) * .15 + (+p.firepower || 70) * .1;
  const isIgl = p => /IGL/i.test(String(p && p.role || ''));
  const roleOk = (p, role) => role === 'IGL' ? isIgl(p) : (!role || role === 'Rifler') ? !/IGL|AWP/i.test(p.role || '') : String(p.role || '').toLowerCase().includes(role.toLowerCase().slice(0, 3));
  const fit = (t, p) => { try { return typeof teamIdentityFit === 'function' ? teamIdentityFit(t, p) : 1; } catch (e) { return 1; } };
  const nowMs = () => { try { return Number(seasonState.calendar.currentMs) || Date.now(); } catch (e) { return Date.now(); } };
  const emit = (type, data) => { try { (W.__v29Bus = W.__v29Bus || []).push({ type, data, at: nowMs() }); W.v29OnEvent?.(); } catch (e) {} };
  const news = it => { try { W.V29News?.add?.(it); } catch (e) {} };
  // готов ли игрок состава вести команду: тактика, опыт; энтри-фраггер — только при явном перевесе в тактике
  const captainScore = p => (+p.tacticalIQ || 0) + (/Support|Lurker/i.test(p.role || '') ? 2 : 0) - (/Entry/i.test(p.role || '') ? 5 : 0) + Math.min(4, Math.max(0, (+p.age || 22) - 23) * .5);
  W.CS2CaptainScore = captainScore;

  W.CS2SmartReplace = function (t, out) {
    W.CS2SmartReplace.last = null;
    if (!t || !out || typeof teams === 'undefined' || typeof transferState === 'undefined') return null;
    const list = teams.filter(x => x && !x.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0)), rank = list.indexOf(t) + 1 || 99;
    let budget = 0; try { budget = Number(W.V31?.org?.(t.name)?.budget) || 0; } catch (e) {}
    const rich = RICH.includes(t.name) || rank <= 6 || budget >= 2.5e6;
    const SJ = (p, src) => !W.CS2Stature || W.CS2Stature.canJoin(p, t, src);
    const okFit = p => fit(t, p) >= 0.55;
    const mates = (t.players || []).filter(p => p && p !== out && p.status !== 'BENCH');

    // кандидаты: свободные агенты и (для богатых клубов) игроки команд заметно ниже в рейтинге
    function candidates(role, ageMax) {
      const fa = (transferState.freeAgents || []).filter(p => p && p.nick && !p.reservedFor && roleOk(p, role) && (+p.age || 25) <= ageMax && okFit(p) && SJ(p, null)).map(p => ({ p, from: null }));
      const buy = [];
      if (rich) list.forEach((src, i) => {
        if (src === t || i + 1 <= rank + 3) return;
        (src.players || []).forEach(p => { if (p && p.status !== 'BENCH' && !p.onLoan && roleOk(p, role) && (+p.age || 25) <= Math.min(ageMax, 31) && okFit(p) && SJ(p, src) && !(W.CS2Stature?.protectedIn(p, src))) buy.push({ p, from: src }); });
      });
      // v133: таланты академий (до 21 года) — для клубов топ-30: топ-клуб скорее подтянет молодую звезду академии,
      // чем возьмёт случайного свободного агента
      const acad = [];
      if (rank <= 30) teams.forEach(src => { if (!src || !src.isAcademy) return;
        (src.players || []).forEach(p => { if (p && p.status !== 'BENCH' && !p.onLoan && roleOk(p, role) && (+p.age || 25) <= 21 && okFit(p)) acad.push({ p, from: src, acad: true }); }); });
      return { fa, buy, acad };
    }
    // запас роста таланта (потенциал − текущая сила), до +4 к оценке
    const upside = p => Math.max(0, Math.min(4, ((+p.pot || 0) - pow(p)) * 0.5));
    // «заметный» свободный агент для клуба топ-20: играл в топ-40 или явно сильнее уровня замены
    const notable = (p, floor, score) => { if (score(p) >= floor + 2) return true; const was = p.v30LastProTeam || p.v84FaTeam || ''; const i = list.findIndex(x => x.name === was); return i >= 0 && i < 40; };
    function pickBest(role, floor, score, ageMax) {
      const c = candidates(role, ageMax), by = (a, b) => score(b.p) - score(a.p);
      c.fa.sort(by); c.buy.sort(by); c.acad.sort((a, b) => (score(b.p) + upside(b.p)) - (score(a.p) + upside(a.p)));
      const top = rank <= 20;
      const fa = top ? c.fa.find(x => notable(x.p, floor, score)) : c.fa[0];
      let best = fa && score(fa.p) >= floor - (top ? 0 : 3) ? fa : null;
      const b = c.buy[0];
      if (b && (!best || score(b.p) > score(best.p) + 1.5) && score(b.p) >= floor) best = b;
      const a = c.acad[0];
      if (a && score(a.p) + upside(a.p) >= floor - (top ? 1 : 3) && (!best || score(a.p) + upside(a.p) >= score(best.p) - 1)) best = a;
      return best;
    }

    let need = out.role || 'Rifler', best = null, newIgl = null;
    if (isIgl(out)) {
      need = 'IGL';
      // 1) настоящий капитан со стороны
      best = pickBest('IGL', iglPow(out) - (rich ? 4 : 8), iglPow, 34);
      if (!best) {
        // 2) капитанство внутри состава — только тому, кто к нему готов
        const cand = mates.filter(p => !/AWP/i.test(p.role || '') && (+p.tacticalIQ || 0) >= 84).sort((a, b) => captainScore(b) - captainScore(a))[0];
        if (cand) {
          const prevRole = /Entry/i.test(cand.role || '') ? 'Entry-fragger' : 'Rifler';
          cand.role = 'IGL'; cand.v84roleLocked = 1; newIgl = cand; need = prevRole;
          news({ cat: 'transfer', icon: '🧠', imp: 6, team: t.name, player: cand.nick, title: `${cand.nick} — новый капитан ${t.name}`, lead: `После ухода ${out.nick} роль IGL переходит к ${cand.nick}.`, body: ['Клуб будет искать на освободившуюся позицию игрока с сильной стрельбой.'], tags: [{ t: 'player', v: cand.nick }, { t: 'team', v: t.name }] });
          best = pickBest(need, pow(out) - (rich ? 2 : 6), pow, 33);
        } else {
          // 3) опытный свободный агент с лучшей тактикой станет капитаном
          const fa = (transferState.freeAgents || []).filter(p => p && p.nick && !p.reservedFor && !/AWP/i.test(p.role || '') && (+p.tacticalIQ || 0) >= 80 && (+p.age || 25) <= 35 && okFit(p) && SJ(p, null)).sort((a, b) => captainScore(b) - captainScore(a))[0];
          if (fa) best = { p: fa, from: null };
        }
      }
    } else {
      best = pickBest(need, pow(out) - (rich ? 2 : 6), pow, 33);
    }
    if (!best) { W.CS2SmartReplace.last = newIgl ? { newIgl: newIgl.nick, need } : null; return null; }
    const p = best.p;
    if (best.from) {
      const src = best.from, i = src.players.indexOf(p);
      let fee = 900000; try { fee = Math.round((W.V31?.valueOf?.(p) || pow(p) * 15000) / 1000) * 1000; } catch (e) {}
      let rep = null; try { rep = generateFreeAgent(src, p.role, (transferState.marketRuns || 0) * 13 + i); } catch (e) {}
      if (rep) { rep.status = 'STARTER'; src.players[i] = rep; } else src.players.splice(i, 1);
      try { W.V31?.book?.(t.name, -fee, 'trans', `Выкуп ${p.nick}`); W.V31?.book?.(src.name, fee, 'trans', `Продажа ${p.nick}`); } catch (e) {}
      emit('transfer', { player: p.nick, role: need === 'IGL' ? 'IGL' : p.role, from: src.name, to: t.name, rep: rep ? rep.nick : null, reason: `замена ${out.nick}${need === 'IGL' ? ' в роли капитана' : ''}, выкуп ~$${(fee / 1e6).toFixed(2)} млн`, buyout: true });
      try { ensurePlayerLayer(src); } catch (e) {}
    } else {
      transferState.freeAgents = transferState.freeAgents.filter(x => x !== p);
      emit('transfer', { player: p.nick, role: need === 'IGL' ? 'IGL' : p.role, from: 'Свободный агент', to: t.name, reason: `замена ${out.nick}${need === 'IGL' ? ' в роли капитана' : ''}` });
    }
    p.status = 'STARTER'; delete p.benchFrom; delete p.reservedFor; p.v84From = best.from ? best.from.name : 'Свободный агент';
    if (need === 'IGL') { p.role = 'IGL'; p.v84roleLocked = 1; }
    else if (/IGL/i.test(p.role || '')) { p.role = 'Rifler'; p.v84roleLocked = 1; }
    W.CS2SmartReplace.last = { from: p.v84From, newIgl: newIgl ? newIgl.nick : (need === 'IGL' ? p.nick : null), need };
    return p;
  };
})();
// v84/v86: очистка сохранений — лишняя запись «Подписание · Академия / FA» рядом с настоящим выкупом/подписанием
// того же игрока в ту же команду (её добавлял код завершения карьеры поверх умной замены). v86: проверяется не только
// при загрузке, но и после каждого обновления журнала (раньше дубль, появившийся по ходу игры, оставался до перезагрузки).
(function () {
  const clean = () => { try {
    const mv = (typeof transferState !== 'undefined' ? transferState.v30Moves : null); if (!Array.isArray(mv) || !mv.length) return 0;
    const real = mv.filter(m => m && m.from !== 'Академия / FA' && /transfer|buyout|signing/.test(m.type || ''));
    const bad = m => m && m.type === 'signing' && m.from === 'Академия / FA' && real.some(r => r !== m && r.player === m.player && r.to === m.to && Math.abs((r.ts || 0) - (m.ts || 0)) < 3 * 864e5);
    const n = mv.length, keep = mv.filter(m => !bad(m));
    if (keep.length !== n) { transferState.v30Moves = keep; try { window.saveTransferState?.(); } catch (e) {} console.info('[v86] убраны дубли переходов:', n - keep.length); }
    return n - keep.length;
  } catch (e) { return 0; } };
  window.CS2CleanMoveDupes = clean;
  setTimeout(clean, 4000);
})();
