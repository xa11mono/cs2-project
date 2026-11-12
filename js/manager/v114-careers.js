/* v114 — после карьеры игрока: тренер своего клуба и награды тренера в профиле.

   1. Игрок, завершивший карьеру (капитан или тактически сильный ветеран), с вероятностью ~40% сразу становится главным
      тренером клуба, в котором закончил играть. Прежний тренер уходит на рынок тренеров. Клуб менеджера не трогаем —
      там тренера назначает игрок. Решение стабильно для ника (как у рынка тренеров v84).
   2. Титулы, которые команда выигрывает при тренере (Tier-1 и Мейджоры), записываются тренеру: в профиле человека —
      блок «Титулы тренера» с кубками (у бывших игроков — рядом с игровыми наградами). */
(function () {
  'use strict';
  const W = window, H = W.HS, DAY = 864e5;
  if (!H || typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const esc = H.esc, lc = s => String(s || '').toLowerCase();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const S = () => { const s = seasonState.v114Car = seasonState.v114Car || {}; s.seen = s.seen || {}; s.titles = s.titles || {}; s.arch = s.arch || {}; return s; };
  const me = () => { try { return W.V31 && W.V31.managed ? W.V31.managed() : ''; } catch (e) { return ''; } };
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const save = () => { try { W.saveSeasonState && W.saveSeasonState(); W.saveTeams && W.saveTeams(); } catch (e) {} };

  /* ------------------------------------------------------------ 1. тренер своего клуба */
  function playerToCoach() {
    const C = W.CS2Coaches; if (!C || !C.state) return 0;
    const moves = (typeof transferState !== 'undefined' && transferState.v30Moves) || [], s = S(); let n = 0;
    moves.forEach(m => {
      if (!m || m.type !== 'retire' || !m.player) return;
      const key = lc(m.player); if (s.seen[key]) return; s.seen[key] = now();
      const t = teams.find(x => x && !x.isAcademy && x.name === m.from); if (!t || t.name === me()) return;
      const igl = /IGL/i.test(m.role || ''), smart = (+m.iq || 0) >= 80;
      if (!igl && !smart) return;
      if ((h32('ownclub|' + m.player) % 100) >= (igl ? 45 : 30)) return;
      if (now() - (Number(m.ts || m.at) || now()) > 30 * DAY) return;   // только свежие завершения (старые сохранения не перекраиваем)
      const o = C.state(); if (!o) return;
      const old = t.coach && t.coach.name ? t.coach : null;
      o.pool = (o.pool || []).filter(c => lc(c.name) !== key);
      try { if (old && C.release) C.release(old, t.name); } catch (e) {}
      t.coach = { name: m.player, flag: (o.career[key] && o.career[key].flag) || (W.CS2Coaches && '🌍'), changedAtSeason: seasonState.currentSeason, exPlayer: true };
      o.career[key] = Object.assign(o.career[key] || {}, { status: 'coach', team: t.name, since: now(), exTeam: t.name });
      t.rosterLastChange = { type: 'COACH', player: m.player, from: old ? old.name : '—', reason: 'завершил карьеру и возглавил клуб' };
      try { W.v29Emit && W.v29Emit('coach', { team: t.name, from: old ? old.name : '—', to: m.player, reason: 'завершил карьеру игрока и сразу возглавил клуб как главный тренер' }); } catch (e) {}
      n++;
    });
    if (n) save();
    return n;
  }

  /* ------------------------------------------------------------ 2. титулы тренера */
  const T1 = ['major', 'elite', 'regular'];
  function recordTitles() {
    let A = {}; try { A = H.archive ? H.archive() : {}; } catch (e) { return 0; }
    const s = S(); let n = 0;
    if (!s.init) { Object.keys(A).forEach(id => { s.arch[id] = 1; }); s.init = now(); save(); return 0; }   // прошлые титулы — без тренера (кто тренировал тогда, неизвестно)
    Object.entries(A).forEach(([id, snap]) => {
      if (!snap || s.arch[id] || !snap.champion || snap.champion === '—' || snap.live || snap.show) return;
      s.arch[id] = 1;
      if (!T1.includes(snap.prestige)) return;
      const t = teams.find(x => x && x.name === snap.champion), coach = t && t.coach && t.coach.name;
      if (!coach || t.coach.generated) return;
      const k = lc(coach);
      (s.titles[k] = s.titles[k] || []).push({ id, n: snap.name, s: snap.season, y: snap.year || (H.yearOf ? H.yearOf(snap.season) : 0), team: t.name, major: snap.prestige === 'major' });
      n++;
    });
    if (n) save();
    return n;
  }
  function coachBox(nick) {
    const list = (S().titles[lc(nick)] || []).slice().reverse(); if (!list.length) return '';
    const maj = list.filter(x => x.major).length;
    const items = list.slice(0, 24).map(x => { let svg = ''; try { svg = W.TW && W.TW.trophySvg ? W.TW.trophySvg(x.n, x.s, x.major ? 'major' : 'elite') : ''; } catch (e) {}
      return `<span class="hs-achi v114-ctr" title="${esc(x.n)} · тренер ${esc(x.team)}">${svg}<small>${esc(String(x.y || ''))}</small></span>`; }).join('');
    return `<section class="hs-box v114-coachbox"><header class="hs-box-h"><h3>📋 Титулы тренера</h3><span class="hs-sub">${list.length} ${list.length === 1 ? 'титул' : list.length < 5 ? 'титула' : 'титулов'}${maj ? ` · Мейджоров: ${maj}` : ''}</span></header><div class="hs-box-b v114-ctr-l">${items}</div></section>`;
  }
  (H.AFTER || []).push((pg, arg, root) => {
    if (pg !== 'player' || !root || root.querySelector('.v114-coachbox')) return;
    try { const nick = String(arg || H.S.arg || '').split('/')[0]; const html = coachBox(nick); if (!html) return;
      const head = root.querySelector('.hs-phead, .hs-head'); if (head) head.insertAdjacentHTML('afterend', html); } catch (e) {}
  });

  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => { try { playerToCoach(); recordTitles(); } catch (e) { console.warn('[v114 careers]', e); } }, 6000, 'v114-careers');
  W.V114Careers = { playerToCoach, recordTitles, coachBox, state: S };
})();
