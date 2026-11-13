/* v84 — доработка раскладки страниц портала: без пустых экранов, ровные ряды, полка трофеев в шапке игрока. */
(function () {
  'use strict';
  const H = window.HS; if (!H) return;
  const { esc, logo, box, empty } = H;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const T1 = ['major', 'elite', 'regular'];
  const fdate = ms => new Date(ms).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });

  function recentT1(limit) {
    let ms = []; try { ms = (H.allMatches() || []).filter(m => m && m.w && Array.isArray(m.mp) && T1.includes(m.kind)); } catch (e) {}
    return ms.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, limit);
  }
  function upcomingEvents(limit) {
    let ev = []; try { ev = (H.calendarEvents() || []).filter(e => e.status !== 'done' && T1.includes(e.kind)); } catch (e) {}
    return ev.slice(0, limit).map(e => `<div class="v84-up"><span class="hs-ev-tr">${H.trophy ? H.trophy(e.name, e.season, e.kind) : ''}</span><span class="v84-up-b"><b>${esc(e.name)}</b><small>${fdate(e.startMs)} – ${fdate(e.endMs)} · <span class="hs-kind k-${e.kind}">${esc(H.KIND?.[e.kind] || e.kind)}</span></small></span>${e.status === 'live' ? '<em class="v84-live">LIVE</em>' : ''}</div>`).join('');
  }

  // ---------------------------------------------------------------- «Матчи»: под списком — результаты и турниры
  const baseMatches = H.PAGES.matches;
  if (baseMatches) H.PAGES.matches = function () {
    const html = baseMatches.apply(this, arguments);
    if ((H.S.mt?.view || 'live') !== 'live') return html;
    // v100.4: пока Tier-1 не сыгран, показываем последние результаты любых турниров (без пустой заглушки)
    let t1 = recentT1(10), title = 'Последние результаты Tier-1';
    if (!t1.length) { try { t1 = (H.allMatches() || []).filter(m => m && m.w && Array.isArray(m.mp)).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 10); } catch (e) { t1 = []; } title = 'Последние результаты'; }
    const res = t1.map(m => H.matchRow(m)).join('');
    return html + `<div class="v84-grid2">${box(title, res ? `<div class="mrows">${res}</div>` : empty('Матчей пока не было'), '<button type="button" class="hs-more" data-mtview="results">все →</button>')}${box('Турниры впереди', upcomingEvents(6) || empty('Календарь пуст'), '<button type="button" class="hs-more" data-nav="calendar">календарь →</button>')}</div>`;
  };

  // ---------------------------------------------------------------- «Трансферы»: свободные агенты, слухи, окно
  const baseTransfers = H.PAGES.transfers;
  if (baseTransfers) H.PAGES.transfers = function () {
    const html = baseTransfers.apply(this, arguments);
    const fa = ((typeof transferState !== 'undefined' && transferState.freeAgents) || []).filter(p => p && p.nick && p.status !== 'BENCH')
      .map(p => ({ p, pw: (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15 }))
      .sort((a, b) => b.pw - a.pw).slice(0, 8);
    const faHtml = fa.map(({ p, pw }) => `<button type="button" class="v84-fa" data-player="${esc(p.nick)}"><span class="ph">${H.photoHtml(p)}</span><span class="v84-fa-b"><b>${H.pFlag(p)} ${esc(p.nick)}</b><small>${esc(p.role || 'Rifler')} · ${p.age ? p.age + ' лет' : '—'}</small></span><em>${Math.round(pw)}</em></button>`).join('');
    let rumors = []; try { rumors = (H.NW()?.all() || []).filter(n => n.cat === 'rumor').slice(0, 5); } catch (e) {}
    const rmHtml = rumors.map(n => H.newsRow ? H.newsRow(n) : `<div>${esc(n.title)}</div>`).join('');
    const w = window.__v29Window, st = ST();
    const nextMajor = (st?.seasonSchedule || []).slice(Number(st?.tournamentIndex) || 1).find(e => e && e.type === 'major');
    const windowNote = w === 'post-major' ? 'Открыто трансферное окно после Major: клубы активно меняют составы.'
      : `Основное окно откроется после ${nextMajor ? esc(nextMajor.name) : 'ближайшего Major'}. До него сделки редки, перед Major — ростер-лок.`;
    return html + `<div class="v84-grid3">${box('Лучшие свободные агенты', faHtml || empty('Свободных агентов нет'))}${box('Слухи', rmHtml || empty('Слухов пока нет'))}${box('Трансферное окно', `<p class="v84-note">${windowNote}</p>`)}</div>`;
  };

  // Лента трофеев: колесо мыши прокручивает её по горизонтали, если трофеи не помещаются
  document.addEventListener('wheel', e => {
    const el = e.target && e.target.closest && e.target.closest('#hs-root .pl-shelf, #hs-root .tm-shelf');
    if (!el || el.scrollWidth <= el.clientWidth + 2 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const max = el.scrollWidth - el.clientWidth, next = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
    if (next !== el.scrollLeft) { el.scrollLeft = next; e.preventDefault(); }
  }, { passive: false });

  // ---------------------------------------------------------------- после отрисовки: игрок и команда
  (H.AFTER || []).push(page => {
    try {
      const root = document.getElementById('hs-page'); if (!root) return;
      if (page === 'player') {
        const head = root.querySelector('.hs-phead'), shelf = root.querySelector('.pl-shelf');
        // Линия трофеев остаётся на своём прежнем месте (под шапкой) — так она читается лучше.
        if (head && !shelf && !head.querySelector('.v84-phead-shelf')) {
          // Нет наград — показываем сводку сезона, чтобы шапка не была пустой.
          const nick = H.S.arg ? String(H.S.arg).split('/')[0] : ''; let L = null, Y = null;
          try { const o = H.stats().P[nick]; if (o) { L = H.line(o.all); const cur = ST()?.currentSeason; Y = o.bySeason?.[cur] ? H.line(o.bySeason[cur]) : null; } } catch (e) {}
          if (L) {
            const cell = (k, v) => `<div><small>${k}</small><b>${v}</b></div>`;
            const wrap = document.createElement('div'); wrap.className = 'v84-phead-shelf v84-pfacts';
            wrap.innerHTML = '<small>Сводка</small><div class="v84-pfacts-g">' + cell('Карт всего', L.maps) + cell('Рейтинг в сезоне', Y ? Y.rating.toFixed(2) : '—') + cell('Карт в сезоне', Y ? Y.maps : 0) + cell('Клатчи', `${L.clW}/${L.clA}`) + '</div>';
            head.insertBefore(wrap, head.querySelector('.hs-pact') || null);
          }
        }
        // Лучшие карты — с баннером карты
        if (window.CS2MapArt) root.querySelectorAll('.hs-bmap').forEach(el => {
          if (el.querySelector('.cs2-mapart')) return; const n = el.querySelector('.hs-bmap-n')?.textContent?.trim();
          if (n) el.insertAdjacentHTML('afterbegin', `<div class="v84-bmap-art">${window.CS2MapArt.banner(n, { h: 54 })}</div>`);
        });
      }
      if (page === 'team') {
        const name = root.querySelector('h1')?.textContent?.trim(); let T = null;
        try { T = H.stats().T?.[name]; } catch (e) {}
        root.querySelectorAll('.pt-kpis > div').forEach(cell => {
          const lab = cell.querySelector('small, span, dt'), val = cell.querySelector('b, strong, dd');
          if (!lab || !val || val.textContent.trim() !== '—') return;
          if (/неделю/i.test(lab.textContent) && T) { lab.textContent = 'Матчи W–L'; val.textContent = `${T.matchW}–${T.matches - T.matchW}`; }
          else if (/сезон/i.test(lab.textContent) && T) { lab.textContent = 'Винрейт карт'; val.textContent = T.maps ? Math.round(T.mw / T.maps * 100) + '%' : '—'; }
        });
      }
    } catch (e) { console.warn('[v84 layout]', e); }
  });
  // v84: анимация входа — только при смене страницы/раздела, не при живых перерисовках
  (function () { let last = ''; (H.AFTER || []).push(page => { try { const key = page + '|' + (H.S.arg || ''); if (key === last) return; last = key; const el = document.getElementById('hs-page'); if (!el) return; el.classList.remove('v84-enter'); void el.offsetWidth; el.classList.add('v84-enter'); clearTimeout(el.__v84e); el.__v84e = setTimeout(() => el.classList.remove('v84-enter'), 700); } catch (e) {} }); })();
})();
