/* v84 — рынок тренеров. Раньше при смене тренера имя склеивалось из слогов («Zonic», «Kelko»), а запасной
   список из шести реальных тренеров давал повторы у разных команд. Теперь все смены тренеров идут через
   один пул:
     • реальные тренеры без клуба (известные тренеры сцены и те, кого уволили в игре — после паузы);
     • игроки, завершившие карьеру: капитаны и тактически сильные ветераны часто становятся тренерами
       (решение детерминировано по нику; через 1–3 месяца после ухода игрок появляется на рынке тренеров);
   Клуб выбирает лучшего доступного: бывший игрок клуба > тренер из того же региона > опыт. Один тренер — одна
   команда. Сгенерированное имя — только если пул пуст.
   Бывший игрок, ставший тренером, отмечается в профиле («Тренер ·  команда») и в трансферах (переход «игрок → тренер»). */
(function () {
  'use strict';
  const W = window, DAY = 864e5;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const TS = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const lc = s => String(s || '').toLowerCase();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const ccFlag = cc => /^[A-Z]{2}$/.test(cc || '') ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0))) : '🌍';
  // известные тренеры/наставники без клуба на старте (реальные люди сцены)
  const FREE_REAL = [['kassad', 'RU'], ['ruggah', 'NO'], ['Lucid', 'DK'], ['innersh1ne', 'RU'], ['Kalle', 'SE'], ['RobbaN', 'SE'], ['peacemaker', 'PT'], ['THREAT', 'GB'],
    ['zews', 'BR'], ['Twista', 'NO'], ['Swani', 'DE'], ['Rejin', 'DK'], ['starix', 'UA'], ['groove', 'BR'], ['valens', 'DK'], ['casle', 'DK'], ['pita', 'DE'], ['Andi', 'DE'],
    ['MSL', 'DK'], ['Xyp9x', 'DK'], ['Zakk', 'DE'], ['dead', 'BR'], ['Kaktus', 'SE'], ['ImAPet', 'RU'], ['T.c', 'RU'], ['Certus', 'RU'], ['GeT_RiGhT', 'SE'], ['Glace', 'SE']];
  const S = () => {
    const s = ST(); if (!s) return null;
    const o = s.v84Coaches = s.v84Coaches || { v: 1, pool: [], career: {}, seen: {} };
    if (!o.seeded) { o.seeded = 1; const used = usedNames(); FREE_REAL.forEach(([n, cc]) => { if (!used.has(lc(n)) && !o.pool.some(x => lc(x.name) === lc(n))) o.pool.push({ name: n, flag: ccFlag(cc), cc, from: 'real', at: 0 }); }); }
    return o;
  };
  const usedNames = () => new Set(TS().map(t => lc(t.coach?.name)).filter(Boolean));
  const activeNicks = () => { const s = new Set(); TS().forEach(t => (t.players || []).forEach(p => p && s.add(lc(p.nick)))); return s; };
  const IGL_RX = /IGL/i;
  // завершивший карьеру игрок → тренер? (капитаны чаще; решение стабильно для ника)
  function becomesCoach(m) {
    const r = (h32('coach|' + m.player) % 100) / 100;
    const base = IGL_RX.test(m.role || '') ? .7 : (+m.iq || 0) >= 80 ? .45 : .22;
    return r < base;
  }
  function absorbRetirements() {
    const o = S(); if (!o) return;
    const moves = (typeof transferState !== 'undefined' ? transferState.v30Moves || [] : []);
    moves.forEach(m => {
      if (!m || m.type !== 'retire' || !m.player) return; const key = lc(m.player); if (o.seen[key]) return; o.seen[key] = 1;
      if (!becomesCoach(m)) return;
      const delay = (30 + h32('cd|' + m.player) % 60) * DAY, ts = Number(m.ts || m.at) || nowMs();
      o.pool.push({ name: m.player, flag: ccFlag(m.cc), cc: m.cc || '', from: 'player', exTeam: m.from || '', igl: IGL_RX.test(m.role || ''), at: ts + delay });
      o.career[key] = { status: 'coach-free', since: ts + delay, exTeam: m.from || '' };
    });
  }
  function regionOf(teamName) { try { return W.CS2Realism?.regionOfTeam?.({ name: teamName }) || ''; } catch (e) { return ''; } }
  // выбор тренера для команды из пула; возвращает объект тренера или null
  function pick(team) {
    const o = S(); if (!o || !team) return null; absorbRetirements();
    const used = usedNames(), active = activeNicks(), now = nowMs();
    const cands = o.pool.filter(c => c && c.at <= now && !used.has(lc(c.name)) && !active.has(lc(c.name)) && c.lastTeam !== team.name);
    if (!cands.length) return null;
    const flagT = (() => { try { return typeof getTeamFlag === 'function' ? getTeamFlag(team.name) : ''; } catch (e) { return ''; } })();
    const sc = c => (c.exTeam === team.name ? 5 : 0) + (c.flag && c.flag === flagT ? 2 : 0) + (c.igl ? 1.5 : 0) + (c.from === 'real' ? 1 : 0) + (h32(team.name + c.name) % 100) / 100;
    const best = cands.sort((a, b) => sc(b) - sc(a))[0];
    o.pool.splice(o.pool.indexOf(best), 1);
    const coach = { name: best.name, flag: best.flag || '🌍', changedAtSeason: ST()?.currentSeason, exPlayer: best.from === 'player' || undefined };
    o.career[lc(best.name)] = Object.assign(o.career[lc(best.name)] || {}, { status: 'coach', team: team.name, since: now });
    return coach;
  }
  // освободившийся тренер возвращается на рынок через 2 месяца
  function release(coach, teamName) {
    const o = S(); if (!o || !coach || !coach.name || coach.generated) return;
    if (o.pool.some(x => lc(x.name) === lc(coach.name))) return;
    const k = lc(coach.name), was = o.career[k];
    o.pool.push({ name: coach.name, flag: coach.flag || '🌍', from: was ? 'player' : 'real', exTeam: was?.exTeam || '', lastTeam: teamName, at: nowMs() + 60 * DAY });
    if (was) Object.assign(was, { status: 'coach-free', team: '', since: nowMs() });
  }
  // единая смена тренера (используется рынком, ИИ составов и уникализацией)
  function change(team, why, opts) {
    if (!team) return false;
    const old = team.coach && team.coach.name ? team.coach : null;
    const next = pick(team); if (!next) return false;
    release(old, team.name);
    team.coach = next;
    team.rosterLastChange = { type: 'COACH', player: next.name, from: old?.name || '—', reason: why || '' };
    if (!(opts && opts.quiet)) { try { W.v29Emit?.('coach', { team: team.name, from: old?.name || '—', to: next.name, reason: (next.exPlayer ? 'бывший игрок, начинает тренерскую карьеру' + (why ? ' · ' : '') : '') + (why || '') }); } catch (e) {} }
    return true;
  }
  // текущая роль человека вне игровой карьеры (для профиля)
  function roleOf(nick) {
    const k = lc(nick), t = TS().find(x => lc(x.coach?.name) === k);
    if (t) return { status: 'coach', team: t.name };
    const o = S(), c = o?.career?.[k]; if (!c) return null;
    if (c.status === 'coach-free' && c.since > nowMs()) return null;
    return { status: c.status, team: c.team || '' };
  }
  // выдуманные имена прошлых версий (слоги «Zon»+«ic», «A. Surname») постепенно заменяются тренерами из пула
  const FAKE = /^(Zon|Kel|Rav|Mor|Tav|Bri|Ste|Gul|Fen|Lio|Nad|Ork|Vas|Dem|Hel)(ic|ko|ex|ard|iss|om|ty|ven|lo|ar)$|^[A-Z]\. [A-Z][a-z]+$|^Coach /;
  const isFake = c => !!c && (c.generated || FAKE.test(String(c.name || '')));
  function weekly() {
    const o = S(); if (!o) return; const wk = Math.floor(nowMs() / (7 * DAY)); if (o.week === wk) return; o.week = wk;
    absorbRetirements();
    const list = TS().filter(t => !t.isAcademy && isFake(t.coach)).sort((a, b) => (b.pts || 0) - (a.pts || 0));
    for (const t of list.slice(0, 2)) change(t, 'клуб нашёл постоянного тренера');
  }
  W.CS2Coaches = { isFake, weekly, pick, change, release, roleOf, absorbRetirements, state: S, becomesCoach };
  (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => { try { weekly(); } catch (e) {} }, 8000);
  // профиль: бывший игрок, ставший тренером, — отметка в шапке
  const H = W.HS;
  if (H) (H.AFTER || []).push(page => {
    if (page !== 'player') return;
    try {
      const root = document.getElementById('hs-page'), head = root?.querySelector('.hs-phead'); if (!head || head.querySelector('.v84-coachtag')) return;
      const nick = String(H.S.arg || '').split('/')[0], r = roleOf(nick); if (!r) return;
      const h = head.querySelector('h1, h2') || head.firstElementChild; if (!h) return;
      const tag = document.createElement('span'); tag.className = 'v84-coachtag';
      tag.innerHTML = r.status === 'coach' ? `📋 Тренер · <b data-team="${H.esc(r.team)}">${H.esc(r.team)}</b>` : '📋 Тренер · свободен';
      h.insertAdjacentElement('afterend', tag);
    } catch (e) {}
  });
})();
