/* v101 — legacy-экономика игроков и отмена сделки.
   v114 вынес индивидуальную силу в отдельный модуль CS2Power. Этот файл продолжает отвечать за историю
   трансферной стоимости и отмену переговоров; ручная калибровка силы и пересев VRS отключены. */
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

  /* ------------------------------------------------------------ 1. сила
     v114: индивидуальный Overall рассчитывает js/manager/v114-player-power.js.
     v101 сохраняет только совместимые legacy helpers; атрибуты игроков и VRS не калибруются по никам.
  */
  function recalibrate() { return 0; }

  /* v114: стартовый VRS остаётся данными рейтинговой системы, не пересеивается из силы игроков. */
  function reseed() { return 0; }

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
  // v112: звезда Мейджора — только у кубков в профилях команды и игрока (не в календаре, списках турниров и на странице турнира)
  function markMajors(root, pg) {
    if (pg !== 'team' && pg !== 'player') return;
    if (0) (root || document).querySelectorAll('.hs-ev-tr, .ax-cal-ic, .ax-evcard-ic').forEach(ic => {
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
  (H.AFTER || []).push((pg, arg, root) => { try { markMajors(root, pg); } catch (e) {} });
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
  every(() => { if (W.v57BatchCalendarSkip) return; try { snapValues(); } catch (e) {} }, 4000, 'v101-economy');

  W.CS2Power = { recalibrate, reseed, pow, trend }; // v114-player-power.js подключается следующим и публикует полный API.
  W.V101Deals = { cancel };
  W.V101MarkMajors = (root, pg) => markMajors(root, pg || (H.S && H.S.page));
})();
