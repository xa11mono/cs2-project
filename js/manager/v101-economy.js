/* v101 — сила и стоимость игроков, отмена сделки.

   1. Сила (CS2Power). Сила игрока считается одной формулой для всех ролей (огонь 40%, тактика 25%, клатч 20%,
      утилити 15%), и в базе у капитанов завышена тактика — magixx оказывался №1 мира, ZywOo — 10-м, s1mple — 86.
      Один раз на сохранение (и в каждой новой игре) сила пересчитывается:
        • топ-игроки сцены — по ориентирам реального уровня (ZywOo и donk — 95.5, m0NESY — 94.5, …);
        • у капитанов (IGL) без ориентира снимается перекос тактики над стрельбой;
        • остальные без ориентира — не выше 91.5 (выше — только признанная элита).
      Сдвиг распределяется на все четыре навыка поровну, потенциал не ниже нового уровня.
   2. Стоимость (v31 valueOf пересчитан): часть потенциала у молодых, возрастная кривая, форма, контракт, академия.
      Раз в игровую неделю — снимок стоимости; в профиле игрока — изменение за 4 недели.
   3. Отмена сделки: на любой стадии до регистрации — «Отменить сделку». После согласия клуба отмена стоит
      −1 репутации (клуб потратил время). Письмо в почту клуба. */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31;
  if (!H || !V || typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const esc = H.esc, DAY = 864e5;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const money = n => { try { return V.money(n); } catch (e) { return '$' + Math.round(n); } };

  /* ------------------------------------------------------------ 1. сила */
  const ANCHOR = {
    zywoo: 95.5, donk: 95.5, m0nesy: 94.5, sh1ro: 93.5, ropz: 93, niko: 92.8, flamez: 92.3, kscerato: 92, torzsi: 92,
    spinx: 91.5, frozen: 91.5, molodoy: 91.5, xantares: 91, xertion: 90.8, b1t: 90.5, im: 90.5, jl: 90.5, kyousuke: 90.5,
    broky: 90, twistzz: 90, yuurih: 90, wicadia: 90, w0nderful: 89.5, s1mple: 89.5, mezii: 89, zont1x: 89, jimpphat: 89.5,
    // капитаны — тактика не делает их лучшими стрелками сцены
    magixx: 87.5, aleksib: 86.5, siuhy: 87, karrigan: 85, apex: 85, chopper: 85, fallen: 84, hooxi: 84, maj3r: 85, nexa: 85, blitz: 86, snappi: 84, bymas: 88
  };
  const NON_ANCHOR_CAP = 91.5;
  function target(p) {
    const k = String(p.nick || '').toLowerCase(), cur = pow(p);
    if (ANCHOR[k] != null) return ANCHOR[k];
    let t = cur;
    if (p.role === 'IGL') t -= .4 * Math.max(0, (+p.tacticalIQ || 0) - (+p.firepower || 0)) + 1;
    return Math.min(t, NON_ANCHOR_CAP);
  }
  function shift(p, d) {
    if (Math.abs(d) < .05) return;
    ['firepower', 'tacticalIQ', 'clutch', 'utility'].forEach(a => { p[a] = clamp(Math.round(((+p[a] || 70) + d) * 10) / 10, 50, 99); });
    const lv = pow(p); if (!(+p.pot >= lv)) p.pot = Math.round((lv + ((+p.age || 25) <= 22 ? 2 : 0)) * 10) / 10;
  }
  function recalibrate() {
    if (seasonState.v101Pow) return 0;
    let n = 0;
    const all = teams.flatMap(t => t.players || []).concat((typeof transferState !== 'undefined' && transferState.freeAgents) || []);
    all.forEach(p => { if (!p || !p.nick) return; const d = target(p) - pow(p); if (Math.abs(d) >= .05) { shift(p, d); n++; } });
    seasonState.v101Pow = { at: now(), n };
    try { teams.forEach(t => { try { W.ensurePlayerLayer && W.ensurePlayerLayer(t); } catch (e) {} }); } catch (e) {}
    try { W.saveTeams && W.saveTeams(); W.saveSeasonState && W.saveSeasonState(); } catch (e) {}
    console.info('[v101] сила игроков пересчитана:', n);
    return n;
  }

  /* ------------------------------------------------------------ 1б. стартовый рейтинг новой игры
     В базе у части клубов стартовые очки расходятся с составом (3DMAX: состав #12 по силе, очки #73 — за сезон
     «▲63» выглядело как взлёт слабой команды). В новой игре (до первого турнира) позиция по очкам, отличающаяся от
     позиции по силе больше чем на 15 мест, сдвигается на 2/3 пути к ней; рейтинг дальше считают результаты. */
  function reseed() {
    if (seasonState.v101Seed) return 0;
    const fresh = (Number(seasonState.currentSeason) || 1) === 1 && (Number(seasonState.tournamentIndex) || 1) <= 1 && !(teams.some(t => (t.history || []).some(h => h && h.place > 0 && !h.isSeasonAward)));
    if (!fresh) { seasonState.v101Seed = { skipped: true }; return 0; }
    const pro = teams.filter(t => t && !t.isAcademy && Array.isArray(t.players) && t.players.length >= 5);
    const tp = t => t.players.slice(0, 5).reduce((a, p) => a + pow(p), 0) / 5;
    const byPts = pro.slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)), byPow = pro.slice().sort((a, b) => tp(b) - tp(a));
    const ptsAt = byPts.map(t => +t.pts || 0), changes = [];
    pro.forEach(t => {
      const rP = byPts.indexOf(t) + 1, rW = byPow.indexOf(t) + 1; if (Math.abs(rP - rW) <= 15) return;
      const rT = Math.round((rW * 2 + rP) / 3), pts = Math.round(ptsAt[clamp(rT, 1, ptsAt.length) - 1]);
      if (!pts || pts === t.pts) return;
      changes.push(`${t.name}: #${rP} → ~#${rT}`);
      t.pts = pts; t.vrsShown = pts; t.vrsTarget = pts; t.seasonStartRank = null;
      if (t.vrsLedger) t.vrsLedger.basePts = pts;
      if (Number.isFinite(Number(t.matchStrength))) t.matchStrength = pts;
    });
    seasonState.v101Seed = { at: now(), changes };
    try { teams.sort((a, b) => (b.pts || 0) - (a.pts || 0)); W.saveTeams && W.saveTeams(); W.saveSeasonState && W.saveSeasonState(); } catch (e) {}
    if (changes.length) console.info('[v101] стартовый рейтинг выровнен по составам:', changes.join('; '));
    return changes.length;
  }

  /* ------------------------------------------------------------ 2. история стоимости */
  const wk = () => Math.floor(now() / DAY / 7);
  function snapValues() {
    if (seasonState.v101ValWk === wk()) return; seasonState.v101ValWk = wk();
    teams.forEach(t => (t.players || []).forEach(p => {
      if (!p || !p.nick) return; let v = 0; try { v = V.valueOf(p); } catch (e) { return; }
      const h = p.v101v = Array.isArray(p.v101v) ? p.v101v : []; h.push([wk(), v]); if (h.length > 10) h.splice(0, h.length - 10);
    }));
  }
  function trend(p) {
    const h = Array.isArray(p.v101v) ? p.v101v : []; if (h.length < 2) return null;
    const last = h[h.length - 1], base = h.find(x => x[0] >= last[0] - 4) || h[0]; if (!base[1] || base === last) return null;
    return Math.round((last[1] - base[1]) / base[1] * 100);
  }

  /* ------------------------------------------------------------ 3. отмена сделки */
  function cancel(id) {
    const N = W.V31Nego; if (!N) return false;
    const n = N.negs().find(x => x.id === id); if (!n || n.st === 'signed' || n.st === 'failed') return false;
    const late = n.st === 'terms' || n.st === 'ready' || (n.wait && n.wait.kind !== 'offer');
    delete n.wait; n.st = 'failed'; n.cancelled = now();
    n.log.push(late ? 'Сделка отменена менеджером. Клуб и агент потратили время — репутация организации −1.' : 'Сделка отменена менеджером.');
    if (late) { try { const o = V.org(me()); o.rep = clamp((+o.rep || 50) - 1, 0, 100); } catch (e) {} }
    try { W.V99Mail && W.V99Mail.add({ team: me(), icon: '✖', from: n.from || 'Агент игрока', title: `Сделка по ${n.nick} отменена`, text: late ? 'Репутация −1.' : '', nav: 'negotiate', ng: n.id, btn: 'Открыть' }); } catch (e) {}
    try { V.careerLog(`Отменена сделка: ${n.nick}`); } catch (e) {}
    try { W.saveSeasonState && W.saveSeasonState(); } catch (e) {}
    return true;
  }
  H.CLICKS.push(['[data-v101cancel]', el => { const n = W.V31Nego && W.V31Nego.negs().find(x => x.id === el.dataset.v101cancel); if (!n || !confirm(`Отменить сделку по ${n.nick}?`)) return; cancel(n.id); H.render(); }]);

  /* ------------------------------------------------------------ интерфейс */
  // Мейджор — золотая звёздочка на иконке турнира (списки турниров, календарь, «Главная»)
  const MAJOR_RE = /\bmajor\b|мейджор/i;
  function markMajors(root) {
    (root || document).querySelectorAll('.hs-ev-tr, .ax-cal-ic, .ax-evcard-ic').forEach(ic => {
      if (ic.dataset.v101maj) return; ic.dataset.v101maj = '1';
      const row = ic.closest('[data-event], tr, li, button, .ax-evcard, .ax-card') || ic.parentNode;
      const name = (row && (row.querySelector('b') || row).textContent) || '';
      if (MAJOR_RE.test(name) && !/qualifier|квалиф|отбор|\brmr\b/i.test(name)) { ic.classList.add('v101-major'); ic.title = 'Major'; }   // отборы к Мейджору — без звезды
    });
    // кубки в профилях команды и игрока: звезда рядом с кубком Мейджора
    (root || document).querySelectorAll('svg.tw-svg').forEach(sv => {
      if (sv.dataset && sv.dataset.v101maj) return; try { sv.dataset.v101maj = '1'; } catch (e) {}
      const host = sv.closest('[title],[data-tip]') || sv.parentNode; if (!host) return;
      const txt = host.getAttribute('title') || host.getAttribute('data-tip') || host.textContent || '';
      if (!MAJOR_RE.test(txt) || /qualifier|квалиф|отбор|\brmr\b/i.test(txt)) return;
      if (host.closest('.v101-major, .hs-ev-tr, .ax-cal-ic') || host.querySelector('.st, .v101-major, .v101-st')) return;   // у чипа уже есть своя звезда Мейджора
      if (/MVP турниров|Игрок года|топ-20/i.test(txt) && !/^[^•]*Major/i.test(txt.split('\n')[0])) return;   // чипы MVP/наград — не кубок Мейджора
      // та же нижняя звезда, что у кубков в профиле игрока (.hs-achi i.st)
      host.classList.add('v101-cuphost'); host.insertAdjacentHTML('beforeend', '<i class="st v101-st" title="Major">★</i>');
    });
  }
  (H.AFTER || []).push((pg, arg, root) => { try { markMajors(root); } catch (e) {} });
  (H.AFTER || []).push((pg, arg, root) => {
    if (!root) return;
    try {
      if (pg === 'negotiate' && me()) {
        const N = W.V31Nego, n = N && (N.negs().find(x => x.id === H.S.ng) || N.negs().find(x => !['signed', 'failed'].includes(x.st)));
        const head = root.querySelector('.ng-h');
        if (n && head && !['signed', 'failed'].includes(n.st) && !head.parentNode.querySelector('[data-v101cancel]')) {
          head.insertAdjacentHTML('afterend', `<div class="v101-cancel"><button type="button" class="hs-btn sm ghost" data-v101cancel="${esc(n.id)}">Отменить сделку</button><small>${n.st === 'offer' && !n.wait ? 'бесплатно' : 'после согласия клуба — репутация −1'}</small></div>`);
        }
      }
      if (pg === 'player') {
        const nick = decodeURIComponent(String(H.S.arg || '').split('/')[0]);
        const p = teams.flatMap(t => t.players || []).find(x => x && x.nick === nick); if (!p) return;
        const tr = trend(p); if (tr == null) return;
        root.querySelectorAll('td.l').forEach(td => { if (td.textContent.trim() !== 'Оценка стоимости' || td.nextElementSibling.querySelector('.v101-tr')) return;
          td.nextElementSibling.insertAdjacentHTML('beforeend', ` <span class="v101-tr ${tr > 0 ? 'up' : tr < 0 ? 'dn' : ''}">${tr > 0 ? '▲' : tr < 0 ? '▼' : '='} ${Math.abs(tr)}% за 4 нед.</span>`); });
      }
    } catch (e) { console.warn('[v101 economy]', e); }
  });

  // сила: сразу (новая игра и старые сохранения), стоимость — раз в игровую неделю
  try { recalibrate(); } catch (e) { console.warn('[v101 power]', e); }
  // выравнивание стартового рейтинга — после посева новой игры (v88: seasonState.v88Seed), иначе очки ещё не окончательные
  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => { if (W.v57BatchCalendarSkip) return; try { if (!seasonState.v101Pow) recalibrate(); if (!seasonState.v101Seed && seasonState.v88Seed) reseed(); snapValues(); } catch (e) {} }, 4000, 'v101-economy');

  W.CS2Power = { target, recalibrate, reseed, ANCHOR, pow, trend };
  W.V101Deals = { cancel };
  W.V101MarkMajors = markMajors;
})();
