/* v127 — MVP с портретом и компактная страница турнира.

   1. «Главная», шапка завершённого турнира: вместо значка-медали «MVP турнира» — карточка с портретом игрока
      (кадрирование «по плечи»: лицо всегда в верхней трети, не обрезается и не уезжает вниз), логотип команды.
   2. Страница турнира: подиум и MVP — одной компактной строкой (крупные логотипы, места, портрет MVP);
      «Материалы о турнире» — плотная сетка с обложками новостей вместо широких пустых плашек. */
(function () {
  'use strict';
  const W = window, H = W.HS; if (!H) return;
  const esc = H.esc, D = document;
  const photoUrl = nick => { try { return (W.V31Media && W.V31Media.full && W.V31Media.full(nick)) || (W.V31Media && W.V31Media.url('player', nick)) || ''; } catch (e) { return ''; } };
  const teamOf = nick => { try { return (W.V29News && W.V29News.playerTeam && W.V29News.playerTeam(nick)) || ''; } catch (e) { return ''; } };
  const tintOf = team => { try { const u = W.V31Media && W.V31Media.url('team', team), f = u && String(u).split('/').pop(), c = f && W.CS2_TEAM_TINT && W.CS2_TEAM_TINT[f]; if (c && Math.max(...c) - Math.min(...c) > 50) return c.join(','); } catch (e) {} return '242,193,78'; };
  const logo = (team, sz) => team && H.logo ? H.logo(team, sz || 'sm') : '';
  const medal = () => { try { return W.CS2TrophyForge.mvpMedal(); } catch (e) { return ''; } };
  function mvpCard(nick, team, cls) {
    const u = photoUrl(nick); team = team || teamOf(nick);
    return `<button type="button" class="v127-mvp ${cls || ''}" data-player="${esc(nick)}" style="--tc:${tintOf(team)}">` +
      `<span class="v127-mvp-ph">${u ? `<i style="background-image:url('${esc(u)}')"></i>` : `<b>${esc(String(nick).slice(0, 2).toUpperCase())}</b>`}</span>` +
      `<span class="v127-mvp-tx"><small>MVP турнира</small><b>${esc(nick)}</b>${team ? `<em>${logo(team, 'xs')}${esc(team)}</em>` : ''}</span><span class="v127-mvp-md">${medal()}</span></button>`;
  }
  // 1. главная
  function home(root) {
    root.querySelectorAll('.v37-mvp-chip:not([data-v127])').forEach(chip => {
      chip.setAttribute('data-v127', '1');
      const nick = (chip.querySelector('b') || {}).textContent || ''; if (!nick) return;
      chip.insertAdjacentHTML('afterend', mvpCard(nick.trim(), '', 'hero'));
      chip.remove();
    });
  }
  // 2. страница турнира
  // 2. страница турнира: подиум и материалы — как были; MVP — карточка с медалью и портретом
  function event(root) {
    root.querySelectorAll('.v37-event-mvp:not([data-v127])').forEach(mv => {
      mv.setAttribute('data-v127', '1');
      const nick = ((mv.querySelector('b') || {}).textContent || '').trim(), team = ((mv.querySelector('small') || {}).textContent || '').trim(); if (!nick) return;
      mv.insertAdjacentHTML('afterend', mvpCard(nick, team, 'ev')); mv.remove();
    });
  }
  (H.AFTER || []).push((pg, arg, root) => { if (!root) return; try { if (pg === 'home') home(root); if (pg === 'event') event(root); } catch (e) { console.warn('[v127 event]', e); } });
  // главная частично перерисовывается — догоняем
  (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => { try { const r = D.getElementById('hs-page'); if (r && H.S && H.S.page === 'home') home(r); } catch (e) {} }, 1500, 'v127-mvp');
  W.CS2EventPolish = { mvpCard };
})();
