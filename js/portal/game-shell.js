/* v87 — «игровая оболочка» портала.
   Портал HLTV остаётся содержимым, но вокруг него теперь интерфейс менеджерской игры:
   боковое меню с иконками (вместо полосы вкладок), шапка экрана со стрелками ‹ ›, названием экрана,
   часами и большой кнопкой «Продолжить» (это прежняя кнопка пропуска дня — те же id, та же логика).
   Меню строится из скрытой старой навигации (.pt-tabs), поэтому пункты, которые модули добавляют в «Ещё»
   или в папки, появляются и здесь без правок модулей. Никакие игровые данные не меняются. */
(function () {
  'use strict';
  const H = window.HS; if (!H) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>'),
    news: svg('<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M7.5 9h6M7.5 12.5h6M7.5 16h4"/>'),
    matches: svg('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>'),
    events: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20h7M9.5 17h5"/>'),
    calendar: svg('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2"/>'),
    ranking: svg('<path d="M4 20V13h4.5v7M9.75 20V8h4.5v12M15.5 20v-9.5H20V20"/><path d="M3 20h18"/>'),
    players: svg('<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    teams: svg('<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5a6 6 0 0 1 12 0"/><circle cx="16.8" cy="9.5" r="2.6"/><path d="M15.5 14.3a5 5 0 0 1 5.5 5.2"/>'),
    transfers: svg('<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>'),
    stats: svg('<path d="M4 4v16h16"/><path d="m7.5 14.5 3.5-4 3 2.5 5-6"/>'),
    major: svg('<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'),
    history: svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5V9H8"/><path d="M12 7.5V12l3 2"/>'),
    community: svg('<path d="M4 5.5h12v8.5H9l-4 3.5V14H4z"/><path d="M16 9h4v8h-1.5v2.8L15 17h-4.5"/>'),
    more: svg('<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>'),
    game: svg('<path d="M7 9.5h3M8.5 8v3"/><circle cx="15.5" cy="9.5" r=".9"/><circle cx="17.5" cy="12" r=".9"/><path d="M6.5 5.5h11a4 4 0 0 1 4 4.6l-.9 6.2a2.5 2.5 0 0 1-4.3 1.3L14 15h-4l-2.3 2.6a2.5 2.5 0 0 1-4.3-1.3l-.9-6.2a4 4 0 0 1 4-4.6z"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>'),
    watch: svg('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m10.5 9 3.5 2-3.5 2z"/>'),
    chev: svg('<path d="m9 6 6 6-6 6"/>'),
    back: svg('<path d="m15 5-7 7 7 7"/>'),
    fwd: svg('<path d="m9 5 7 7-7 7"/>'),
    rail: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 4.5v15"/>'),
    scale: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><path d="M9 9h6v6H9z"/>'),
    cont: svg('<path d="M5 5.5v13l8-6.5zM13 5.5v13l7-6.5z" fill="currentColor" stroke="none"/>')
  };
  // ключ страницы → иконка верхнего уровня; ключ папки → иконка папки
  const ICON_OF = { home: 'home', news: 'news', matches: 'matches', events: 'events', ranking: 'ranking', players: 'players', teams: 'teams', transfers: 'transfers', stats: 'stats', calendar: 'calendar', watch: 'watch', season: 'game', manage: 'game', settings: 'settings' };
  const GRP_ICON = { major: 'major', more: 'more', 'grp-history': 'history', 'grp-community': 'community', game: 'game' };
  // страницы-сущности → раздел меню
  const SECTION_OF = { article: 'news', match: 'matches', event: 'events', player: 'players', team: 'teams', calendar: 'events', hof: 'awards', manage: 'season', sim: 'season' };
  const TITLE_OF = { pick: 'Выбор организации', article: 'Новости', match: 'Матч', event: 'Турнир', player: 'Профиль игрока', team: 'Команда', sim: 'Симулятор', watch: 'Режим зрителя' };
  const OPEN_KEY = 'cs2.gs.open', RAIL_KEY = 'cs2.gs.rail';
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  let openGroups = new Set(store.get(OPEN_KEY, ['game']));
  let model = [], modelSig = '';

  /* ---------- модель меню из старой навигации ---------- */
  const label = b => (b.childNodes.length ? [...b.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && n.tagName !== 'svg' && !n.classList?.contains('gs-ic'))).map(n => n.textContent).join('') : b.textContent).replace(/\s+/g, ' ').trim();
  function readModel() {
    const root = $('hs-root'); const tabs = root && root.querySelector('.pt-tabs'); if (!tabs) return null;
    const out = [];
    [...tabs.children].forEach(el => {
      if (el.matches('.hs-tab[data-nav]')) { if (!el.hidden) out.push({ k: el.dataset.nav, l: label(el) }); return; }
      if (el.matches('.pt-dd')) {
        const btn = el.querySelector('.pt-dd-btn'); const id = btn?.dataset.dd || el.dataset.grp || 'grp';
        const items = [...el.querySelectorAll('.pt-menu [data-nav]')].filter(b => !b.hidden).map(b => ({ k: b.dataset.nav, l: label(b) }));
        if (items.length) out.push({ g: id, l: label(btn), items });
      }
    });
    const game = root.querySelector('.pt-menu[data-menu="game"]');
    if (game) {
      const seen = new Set(['settings']);
      const items = [...game.querySelectorAll('[data-nav]')].filter(b => !b.hidden).map(b => ({ k: b.dataset.nav, l: label(b) })).filter(x => !seen.has(x.k) && seen.add(x.k));
      if (!seen.has('watch')) items.unshift({ k: 'watch', l: 'Режим зрителя' });
      out.unshift({ g: 'game', l: 'Карьера', items, career: true });
    }
    return out;
  }
  const pageNow = () => H.S.page || 'home';
  const sectionNow = () => SECTION_OF[pageNow()] || pageNow();
  function isOn(k) { const p = pageNow(); return k === p || k === sectionNow(); }

  /* ---------- боковое меню ---------- */
  function item(x, sub) {
    const ic = sub ? '' : `<span class="gs-ic">${IC[ICON_OF[x.k]] || IC.more}</span>`;
    return `<button type="button" class="gs-it${sub ? ' sub' : ''}${isOn(x.k) ? ' on' : ''}" data-nav="${esc(x.k)}" title="${esc(x.l)}"${isOn(x.k) ? ' aria-current="page"' : ''}>${ic}<span class="gs-lb">${esc(x.l)}</span></button>`;
  }
  function group(g) {
    const active = g.items.some(x => isOn(x.k));
    const open = active || openGroups.has(g.g);
    return `<div class="gs-grp${open ? ' open' : ''}${active ? ' on' : ''}" data-gs-grp="${esc(g.g)}">
      <button type="button" class="gs-it gs-gh" data-gs-tog="${esc(g.g)}" aria-expanded="${open}" title="${esc(g.l)}"><span class="gs-ic">${IC[GRP_ICON[g.g]] || IC.more}</span><span class="gs-lb">${esc(g.l)}</span><span class="gs-chev">${IC.chev}</span></button>
      <div class="gs-sub" role="group" aria-label="${esc(g.l)}">${g.items.map(x => item(x, true)).join('')}</div></div>`;
  }
  function seasonLine() {
    try {
      const ss = typeof seasonState !== 'undefined' ? seasonState : null;
      const n = ss?.currentSeason || 1, y = H.yearOf ? H.yearOf(n) : 2025 + n;
      return `Сезон ${n} · ${y}`;
    } catch (e) { return 'Сезон'; }
  }
  function renderSide() {
    const root = $('hs-root'); if (!root) return;
    let side = $('gs-side');
    if (!side) {
      side = document.createElement('aside'); side.id = 'gs-side'; side.className = 'gs-side'; side.setAttribute('aria-label', 'Разделы игры');
      root.prepend(side);
      side.addEventListener('click', e => {
        const t = e.target.closest('[data-gs-tog]');
        if (t && document.documentElement.classList.contains('gs-railed') && !side.classList.contains('gs-peek')) {
          e.stopPropagation(); const g = t.closest('.gs-grp'); g.classList.add('open'); t.setAttribute('aria-expanded', true); side.classList.add('gs-peek');
          g.querySelector('.gs-sub [data-nav]')?.focus({ preventScroll: true }); g.scrollIntoView({ block: 'nearest' }); return; }
        if (t) { e.stopPropagation(); const k = t.dataset.gsTog; const g = t.closest('.gs-grp'); const was = g.classList.contains('open');
          if (g.classList.contains('on') && was) return; // папку с открытой страницей не сворачиваем
          g.classList.toggle('open', !was); t.setAttribute('aria-expanded', !was);
          if (was) openGroups.delete(k); else openGroups.add(k); store.set(OPEN_KEY, [...openGroups]);
          return; }
        if (e.target.closest('[data-gs-rail]')) { e.stopPropagation(); userRail = !userRail; store.set(RAIL_KEY, userRail); side.classList.remove('gs-peek'); applyRail(); return; }
        if (e.target.closest('[data-gs-scale]')) { e.stopPropagation(); const i = SCALES.indexOf(scaleMode); scaleMode = SCALES[(i + 1) % SCALES.length]; store.set(SCALE_KEY, scaleMode); applyScale(); modelSig = ''; renderSide(); return; }
        if (e.target.closest('[data-nav]')) side.classList.remove('gs-peek');
      });
      document.addEventListener('mousedown', e => { if (!e.target.closest('#gs-side')) side.classList.remove('gs-peek'); });
    }
    const m = readModel(); if (!m) return;
    model = m;
    const career = m.filter(x => x.career), portal = m.filter(x => !x.career);
    const club = managed();
    const brand = club
      ? `<button type="button" class="gs-mark club" data-nav="org" aria-label="Штаб организации ${esc(club)}">${H.logo ? H.logo(club, 'md') : ''}</button><div class="gs-who"><small>Менеджер · ${esc(seasonLine())}</small><b>${esc(club)}</b></div>`
      : `<button type="button" class="gs-mark" data-nav="home" aria-label="Главная"><b>HLTV</b></button><div class="gs-who"><small>CS2 Manager</small><b>${esc(seasonLine())}</b></div>`;
    const body = `<div class="gs-brand">${brand}</div>
      <nav class="gs-nav" aria-label="Разделы">${career.map(group).join('')}<div class="gs-cap">Портал HLTV</div>${portal.map(x => x.g ? group(x) : item(x)).join('')}</nav>
      <div class="gs-foot">${item({ k: 'settings', l: 'Настройки' })}<button type="button" class="gs-railbtn gs-scalebtn" data-gs-scale aria-label="Масштаб интерфейса: ${esc(scaleLabel())}" title="Масштаб интерфейса: ${esc(scaleLabel())} — нажмите, чтобы сменить">${IC.scale}<b>${esc(scaleShort())}</b></button><button type="button" class="gs-railbtn" data-gs-rail aria-label="Свернуть или развернуть меню" title="Свернуть / развернуть меню">${IC.rail}</button></div>`;
    const sig = body.replace(/\s+/g, ' ');
    if (sig !== modelSig) { side.innerHTML = body; modelSig = sig; }
  }

  /* ---------- шапка экрана ---------- */
  function titleFor() {
    const p = pageNow(), sec = sectionNow();
    let t = TITLE_OF[p];
    if (!t) {
      for (const x of model) {
        if (x.k === p || x.k === sec) { t = x.l; break; }
        const hit = x.items?.find(i => i.k === p) || x.items?.find(i => i.k === sec);
        if (hit) { t = hit.l; break; }
      }
    }
    if (document.querySelector('#hs-page .v96-pick')) t = 'Выбор организации';   // v96: любая страница «Карьеры» без клуба показывает экран выбора
    if (!t) { const h = document.querySelector('#hs-page h1'); t = h ? h.textContent.trim() : 'CS2 Manager'; }
    let crumb = '';
    if (['team', 'player', 'event', 'match', 'article'].includes(p)) {
      const h = document.querySelector('#hs-page h1');
      if (h) { const c = h.cloneNode(true); c.querySelectorAll('button,.hs-chip,small,i').forEach(n => n.remove()); crumb = c.textContent.replace(/\s+/g, ' ').trim(); }
      if (!crumb) crumb = H.S.arg || '';
      if (p === 'match') { const n = document.querySelector('#hs-page .mx-head, #hs-page .hs-mhead'); if (!h && n) crumb = ''; }
    }
    return { t, crumb: crumb && crumb !== t ? crumb : '' };
  }
  function mountTop() {
    const root = $('hs-root'); const inn = root && root.querySelector('.pt-top-in'); if (!inn) return false;
    if (!$('gs-title')) {
      const lead = document.createElement('div'); lead.className = 'gs-lead';
      lead.innerHTML = `<div class="gs-hist"><button type="button" class="gs-hb" data-gs-hist="-1" aria-label="Назад" title="Назад">${IC.back}</button><button type="button" class="gs-hb" data-gs-hist="1" aria-label="Вперёд" title="Вперёд">${IC.fwd}</button></div><div class="gs-title"><h1 id="gs-title">Главная</h1><span id="gs-crumb"></span></div>`;
      inn.prepend(lead);
      lead.addEventListener('click', e => { const b = e.target.closest('[data-gs-hist]'); if (!b) return; e.stopPropagation(); if (b.dataset.gsHist === '-1') history.back(); else history.forward(); });
    }
    // марка уходит в боковое меню
    inn.querySelector('.pt-brand')?.setAttribute('hidden', '');
    // «Продолжить»: прежняя кнопка пропуска, часы слева от неё
    const skip = $('pt-skip'), time = inn.querySelector('.pt-time'), clock = inn.querySelector('.pt-clock');
    if (skip && !skip.querySelector('.gs-cont')) {
      skip.classList.add('gs-continue');
      skip.insertAdjacentHTML('afterbegin', `<span class="gs-cont"><b>Продолжить</b></span>`);
      const l = $('pt-skip-l'); if (l) skip.querySelector('.gs-cont').appendChild(l);
      skip.setAttribute('title', 'Продолжить: перейти к следующему событию календаря');
    }
    if (time && clock && clock.nextElementSibling !== skip && skip) time.insertBefore(clock, skip);
    return true;
  }
  function paintTop() {
    const tt = $('gs-title'); if (!tt) return;
    const { t, crumb } = titleFor();
    if (tt.textContent !== t) tt.textContent = t;
    const c = $('gs-crumb'); if (c && c.textContent !== crumb) c.textContent = crumb;
    document.title = `${crumb || t} — CS2 Manager`;
    // заголовок страницы, повторяющий название экрана, прячем (фильтры справа остаются)
    const h1 = document.querySelector('#hs-page .hs-head > h1');
    if (h1) h1.classList.toggle('gs-dup', h1.textContent.trim().toLowerCase() === t.toLowerCase());
  }
  const managed = () => { try { return (window.V31 && window.V31.managed && window.V31.managed()) || ''; } catch (e) { return ''; } };

  /* ---------- состояние игрока: форма, мораль, свежесть ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function moodOf(p) {
    const form = +p.form || 100, mor = +p.morale || 70, fat = +p.fatigue || 0;
    const f = form >= 108 ? ['В ударе', 'up'] : form >= 97 ? ['Стабилен', 'ok'] : ['Спад', 'dn'];
    const m = mor >= 80 ? ['Доволен', 'up'] : mor >= 55 ? ['Спокоен', 'ok'] : ['Недоволен', 'dn'];
    const t = fat >= 60 ? ['Устал', 'dn'] : fat >= 35 ? ['Утомлён', 'ok'] : null;
    return { form, mor, fresh: clamp(100 - fat, 0, 100), chips: [f, m, t].filter(Boolean) };
  }
  const chip = ([l, c]) => `<span class="gs-st ${c}">${esc(l)}</span>`;
  function ring(v, pct, label, cls) {
    const r = 26, C = 2 * Math.PI * r, k = clamp(pct, 0, 1);
    return `<div class="gs-ring ${cls}"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="tr"/><circle cx="32" cy="32" r="${r}" class="br" stroke-dasharray="${(C * k).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><b>${Math.round(v)}</b><small>${label}</small></div>`;
  }
  const lvl = v => v >= .75 ? 'hi' : v >= .45 ? 'mid' : 'lo';
  function ringsFor(p) {
    const s = moodOf(p), fp = (s.form - 70) / 50, mp = s.mor / 100, fr = s.fresh / 100;
    return `<div class="gs-rings" role="group" aria-label="Состояние игрока">${ring(s.form, fp, 'Форма', lvl(fp))}${ring(s.mor, mp, 'Мораль', lvl(mp))}${ring(s.fresh, fr, 'Свежесть', lvl(fr))}</div>`;
  }
  function staffCard(p) {
    const s = moodOf(p);
    const fl = H.pFlag ? H.pFlag(p) : '';
    return `<button type="button" class="tm-p gs-card" data-player="${esc(p.nick)}"><span class="gs-role">${esc(p.role || '')}</span>${fl ? `<span class="gs-flag">${fl}</span>` : ''}
      <span class="ph">${H.photoHtml ? H.photoHtml(p, true) : ''}</span><span class="nm"><b>${esc(p.nick)}</b></span><small>${esc(p.realName || '')}</small>
      <span class="gs-sts">${s.chips.slice(0, 2).map(chip).join('')}</span></button>`;
  }

  /* ---------- цвет команды из логотипа (для подложек карточек) ---------- */
  const tint = new Map();
  function teamTint(img, cb) {
    const src = img && img.currentSrc || img?.src; if (!src) return;
    if (tint.has(src)) return cb(tint.get(src));
    // заранее посчитанные цвета (assets/ui/team-tint.js) — canvas при запуске из файла недоступен
    const pre = window.CS2_TEAM_TINT && window.CS2_TEAM_TINT[decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() || '')];
    if (pre) { tint.set(src, pre); return cb(pre); }
    const go = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, 24, 24); const d = x.getImageData(0, 0, 24, 24).data;
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3] / 255; if (a < .5) continue;
          const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); const sat = mx ? (mx - mn) / mx : 0;
          const k = a * (.15 + sat * sat * 3) * (mx > 30 ? 1 : .1); r += d[i] * k; g += d[i + 1] * k; b += d[i + 2] * k; w += k;
        }
        const v = w ? [r / w, g / w, b / w].map(Math.round) : [120, 140, 170];
        tint.set(src, v); cb(v);
      } catch (e) {}
    };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
  }
  const setTint = (el, v) => el.style.setProperty('--gs-team', `${v[0]},${v[1]},${v[2]}`);

  /* ---------- экраны ---------- */
  function decorate(page) {
    const pg = $('hs-page'); if (!pg) return;
    pg.dataset.gsPage = page;
    // Команда: цвет из логотипа на шапку и карточки состава
    if (page === 'team') {
      const logo = pg.querySelector('.hs-thead .hs-logo img, .tm-head .hs-logo img, header .hs-logo img');
      const host = pg.querySelector('.hs-thead, .tm-head') || pg;
      if (logo) teamTint(logo, v => { setTint(pg, v); });
      host.classList.add('gs-team-head');
      pg.querySelectorAll('.tm-roster .tm-p').forEach(card => {
        if (card.querySelector('.gs-role')) return;
        const small = card.querySelector('small'); const role = small ? small.textContent.split('·')[0].trim() : '';
        if (role) card.insertAdjacentHTML('afterbegin', `<span class="gs-role">${esc(role)}</span>`);
      });
    }
    // Команда ↔ академия: связь видна на странице обеих команд
    if (page === 'team' && H.S.arg && !pg.querySelector('.gs-acad')) {
      const all = (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
      const me = all.find(t => t.name === H.S.arg);
      // у части академий в базе нет academyParent — восстанавливаем по названию (Vitality Academy → Team Vitality)
      const ACAD = { 'G2 Ares': 'G2', 'Aurora YB': 'Aurora', 'NAVI Junior': 'NAVI', 'Falcons Force': 'Team Falcons', 'fnatic Rising': 'fnatic', 'MOUZ NXT': 'MOUZ', 'Astralis Talent': 'Astralis' };
      const parentOf = t => { if (!t) return null; if (t.academyParent) return t.academyParent; if (ACAD[t.name]) return ACAD[t.name];
        const stem = t.name.replace(/\s+(Academy|Junior|YB|Youth|Talent|NXT|Rising|Force|Ares)$/i, '').toLowerCase(); if (stem === t.name.toLowerCase()) return null;
        const hit = all.find(x => !x.isAcademy && x !== t && (x.name.toLowerCase() === stem || x.name.toLowerCase() === 'team ' + stem)); return hit ? hit.name : null; };
      const isAcad = t => !!t && (t.isAcademy || !!ACAD[t.name]);
      const other = me ? (isAcad(me) ? all.find(t => t.name === parentOf(me)) : all.find(t => isAcad(t) && parentOf(t) === me.name)) : null;
      const anchor = pg.querySelector('.tm-roster') || pg.querySelector('.tm-head');
      if (me && other && anchor) {
        const rank = (H.ranked ? H.ranked() : []).findIndex(t => t.name === other.name);
        const faces = (other.players || []).slice(0, 5).map(p => { const u = window.V31Media && window.V31Media.url('player', p.nick); return `<span class="gs-acad-p" title="${esc(p.nick)}">${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : `<b>${esc(p.nick.slice(0, 2))}</b>`}<small>${esc(p.nick)}</small></span>`; }).join('');
        const label = isAcad(me) ? 'Основная команда' : 'Академия клуба';
        const note = isAcad(me) ? 'Лучшие игроки академии переходят в основу' : 'Резерв: отсюда клуб берёт замены в основной состав';
        anchor.insertAdjacentHTML('afterend', `<button type="button" class="gs-acad" data-team="${esc(other.name)}"><span class="gs-acad-k">${label}</span>${H.logo ? H.logo(other.name, 'lg') : ''}<span class="gs-acad-id"><b>${esc(other.name)}</b><small>${rank >= 0 ? `#${rank + 1} в рейтинге · ` : ''}${note}</small></span><span class="gs-acad-ps">${faces || '<small class="hs-dim">состав не собран</small>'}</span><span class="gs-acad-go">${IC.chev}</span></button>`);
        const lg = pg.querySelector('.gs-acad .hs-logo img'); if (lg) teamTint(lg, v => setTint(pg.querySelector('.gs-acad'), v));
      }
    }
    // Игрок: цвет команды на подложку фото
    if (page === 'player') {
      const logo = pg.querySelector('.hs-pteam .hs-logo img');
      if (logo) teamTint(logo, v => setTint(pg, v));
      const ph = pg.querySelector('.hs-phead'); if (ph && logo && !ph.querySelector('.gs-pwm')) ph.insertAdjacentHTML('afterbegin', `<span class="gs-pwm" aria-hidden="true" style="background-image:url('${esc(logo.getAttribute('src'))}')"></span>`);
    }
    // Рейтинг: фото пятёрки справа, как на HLTV
    if (page === 'ranking') {
      pg.querySelectorAll('.hs-rankrow').forEach(row => {
        if (row.querySelector('.gs-lineup')) return;
        const nicks = [...row.querySelectorAll('.hs-roster [data-player]')].map(b => b.dataset.player).slice(0, 5);
        const urls = nicks.map(n => (window.V31Media && window.V31Media.url('player', n)) || null);
        if (!urls.some(Boolean)) return;
        row.insertAdjacentHTML('beforeend', `<span class="gs-lineup" aria-hidden="true">${urls.map(u => u ? `<img src="${esc(u)}" alt="" loading="lazy" decoding="async">` : '<i></i>').join('')}</span>`);
        const lg = row.querySelector('.hs-logo img'); if (lg) teamTint(lg, v => setTint(row, v));
      });
    }
    // Игрок: кольца состояния (форма, мораль, свежесть)
    if (page === 'player' && H.S.arg && H.playerNow) {
      const ph = pg.querySelector('.hs-phead'), hit = H.playerNow(H.S.arg);
      if (ph && hit && hit.p && !ph.querySelector('.gs-rings')) {
        const act = ph.querySelector('.hs-pact');
        if (act) act.insertAdjacentHTML('beforebegin', ringsFor(hit.p)); else ph.insertAdjacentHTML('beforeend', ringsFor(hit.p));
      }
    }
    // Штаб организации: карточки состава, как экран «Team Staff»
    if (page === 'org' && managed() && H.teamBy && !pg.querySelector('.gs-staff')) {
      const club = managed(), t = H.teamBy(club), ps = (t && t.players || []).filter(p => p && p.status !== 'BENCH').slice(0, 5);
      const head = pg.querySelector('.hs-head');
      const at = pg.querySelector(':scope > .pt-kpis') || head;
      if (ps.length && at) {
        at.insertAdjacentHTML('afterend', `<section class="gs-staffbox"><div class="gs-sh"><h3>Основной состав</h3><button type="button" class="hs-link" data-team="${esc(club)}">страница команды →</button></div><div class="tm-roster gs-staff">${ps.map(staffCard).join('')}</div></section>`);
        const lg = head.querySelector('.hs-logo img') || document.querySelector('#gs-side .gs-mark img');
        if (lg) teamTint(lg, v => setTint(pg, v));
      }
    }
    if (page === 'awards' || page === 'hof') { sortChamps(pg); pg.querySelectorAll('.gs-ty .hs-logo img').forEach(lg => teamTint(lg, v => setTint(lg.closest('.gs-ty'), v))); }
    // Архив: витрина сезона — кубки Major / S-Tier / Tier-1 из таблицы архива на постаментах
    if (page === 'archive' && !pg.querySelector('.gs-arch')) {
      const rows = [...pg.querySelectorAll('table.hs-stbl tbody tr')].map((tr, i) => ({ tr, i, r: rankOf(tr) })).filter(x => x.r <= 2).sort((a, b) => a.r - b.r || a.i - b.i).slice(0, 12);
      const grid = pg.querySelector('.hs-grid2');
      if (rows.length && grid) {
        const cards = rows.map(({ tr }) => {
          const svg = tr.querySelector('.hs-ev-tr svg'), name = tr.querySelector('td b')?.textContent || '', kind = tr.querySelector('.hs-kind')?.outerHTML || '';
          const champ = tr.cells[3] ? tr.cells[3].innerHTML : '';
          return `<button type="button" class="tc-item gs-case"${tr.dataset.event ? ` data-event="${esc(tr.dataset.event)}"` : ''}><span class="tc-tr">${svg ? svg.outerHTML : ''}</span><b title="${esc(name)}">${esc(name)}</b><small class="gs-case-ch">${champ}</small><small>${kind}</small></button>`;
        }).join('');
        grid.insertAdjacentHTML('beforebegin', `<section class="gs-arch"><div class="gs-sh"><h3>Витрина сезона</h3><span class="hs-dim">Major, S-Tier и Tier-1 — нажмите, чтобы открыть сетку</span></div><div class="tc-grid">${cards}</div></section>`);
      }
    }
    // Матчи: на широком экране блоки турниров встают в две колонки, а не растягиваются в одну
    if (page === 'matches') { const box = pg.querySelector('section.hs-box .mrow')?.closest('section.hs-box'); const host = box?.parentElement; if (host && host !== pg && host.querySelectorAll(':scope > section.hs-box').length > 1) host.classList.add('gs-mgrid'); }
    // Выбор организации: карточки клубов окрашены цветом логотипа
    pg.querySelectorAll('.cr-pickt').forEach(b => { if (b.dataset.gsT) return; b.dataset.gsT = 1; const lg = b.querySelector('.hs-logo img'); if (lg) teamTint(lg, v => setTint(b, v)); });
    // аватар игрока в строках таблиц (игроки, статистика, трансферы, карьера)
    if (!['player', 'team', 'match'].includes(page)) {
      pg.querySelectorAll('table.hs-tbl tbody tr').forEach(tr => {
        if (tr.querySelector('.gs-ava')) return;
        // строка одного игрока: сама строка-ссылка или ровно одна ссылка на игрока (в таблице команд их пять — там аватары не нужны)
        const links = tr.querySelectorAll('[data-player]');
        const a = tr.matches('[data-player]') ? tr : (links.length === 1 ? links[0] : null); if (!a) return;
        const u = window.V31Media && window.V31Media.url('player', a.dataset.player); if (!u) return;
        // ячейка с ником: та, где флаг/жирный ник; иначе сам элемент-ссылка
        const cell = a === tr ? [...tr.cells].find(td => td.querySelector('b') && td.textContent.includes(a.dataset.player)) : a;
        if (!cell) return;
        // ставим перед флагом, но на уровне ячейки: флаг бывает в обёртке фиксированной ширины (.fl)
        let at = cell.querySelector('.flg') || cell.firstChild;
        while (at && at.parentNode && at.parentNode !== cell && at.parentNode !== a) at = at.parentNode;
        const html = `<span class="gs-ava"><img src="${esc(u)}" alt="" loading="lazy" decoding="async"></span>`;
        if (at && at.nodeType === 1) at.insertAdjacentHTML('beforebegin', html); else cell.insertAdjacentHTML('afterbegin', html);
      });
    }
  }

  function after(page) {
    try { $('gs-side')?.classList.remove('gs-peek'); if ($('hs-root') && !$('hs-root').style.zoom && scaleNow() !== 1) applyScale(); mountTop(); renderSide(); paintTop(); decorate(page); } catch (e) { console.warn('[v87 shell]', e); }
  }
  /* ---------- Награды: Зал славы как зал, а не таблица ---------- */
  const TIER_RANK = { major: 0, elite: 1, regular: 2, academy: 3, tier2: 4, tier3: 5, qual: 6 };
  function hofHtml() {
    const list = (H.hallOfFame ? H.hallOfFame() : []) || [], A = H.awards ? H.awards() : {};
    const ind = (typeof seasonState !== 'undefined' && seasonState?.v84Extra?.hof) || {};
    const teamsY = ((typeof seasonState !== 'undefined' && seasonState?.hallOfFame) || []).slice().sort((a, b) => b.season - a.season);
    const pOf = nick => { const now = H.playerNow ? H.playerNow(nick) : null; const r = A[nick] || {}; return { now, p: now?.p || { nick, country: (r.ti || []).find(t => t.cc)?.cc || '' }, r }; };
    const score = x => x.maj * 10 + x.ti * 3 + x.mvp * 2 + x.top;
    const hasPh = nick => { try { return !!((window.V31Media && window.V31Media.url('player', nick)) || pOf(nick).p.photo && !/^https?:/.test(pOf(nick).p.photo)); } catch (e) { return false; } };
    // нет фотографии — бронзовый медальон с инициалами вместо серого силуэта
    const face = (x, p) => hasPh(x.nick) ? (H.photoHtml ? H.photoHtml(p, true) : '') : `<span class="gs-medal"><b>${esc(x.nick.replace(/[^A-Za-zА-Яа-я0-9]/g, '').slice(0, 2).toUpperCase())}</b></span>`;
    const members = list.filter(x => !x.active).sort((a, b) => score(b) - score(a)), future = list.filter(x => x.active).sort((a, b) => score(b) - score(a));
    const cupsOf = r => (r.ti || []).filter(t => ['major', 'elite', 'regular'].includes(t.k) && !t.nations).sort((a, b) => (TIER_RANK[a.k] - TIER_RANK[b.k]) || (b.s || 0) - (a.s || 0)).slice(0, 4);
    const plaque = (x, fut) => {
      const { now, p, r } = pOf(x.nick), cups = cupsOf(r), teams = [...new Set((r.ti || []).map(t => t.team).filter(Boolean))].slice(0, 3);
      const st = (v, l) => `<div><b>${v}</b><small>${l}</small></div>`;
      return `<button type="button" class="gs-plq${fut ? ' fut' : ''}" data-player="${esc(x.nick)}">
        <span class="gs-plq-rib">${fut ? 'Ещё играет' : ind[x.nick] ? 'Введён · ' + esc(ind[x.nick]) : 'Член Зала славы'}</span>
        <span class="gs-plq-ph">${face(x, p)}</span>
        <span class="gs-plq-id"><b>${H.pFlag ? H.pFlag(p) : ''} ${esc(x.nick)}</b><small>${esc(p.realName || (fut ? (now?.t?.name || 'свободный агент') : 'завершил карьеру'))}</small></span>
        <span class="gs-plq-st">${st(x.maj, 'Major')}${st(x.ti, 'Титулы')}${st(x.mvp, 'MVP')}${st(x.top, 'Top-20')}</span>
        ${cups.length ? `<span class="gs-plq-cups">${cups.map(t => `<i title="${esc(t.n)}${t.team ? ' · ' + esc(t.team) : ''}">${H.trophy ? H.trophy(t.n, t.s, t.k) : ''}</i>`).join('')}</span>` : ''}
        ${teams.length ? `<span class="gs-plq-tm">${teams.map(tn => `<i title="${esc(tn)}">${H.logo ? H.logo(tn, 'xs') : ''}</i>`).join('')}</span>` : ''}
      </button>`;
    };
    const lead = list.filter(x => hasPh(x.nick)).sort((a, b) => (a.active - b.active) || score(b) - score(a)).slice(0, 3);
    const heroP = lead.map((x, i) => { const { p } = pOf(x.nick); return `<button type="button" class="gs-hh-p p${i}" data-player="${esc(x.nick)}"><span class="ph">${H.photoHtml ? H.photoHtml(p, true) : ''}</span><b>${esc(x.nick)}</b><small>${x.maj} × Major</small></button>`; }).join('');
    const majTotal = members.reduce((n, x) => n + x.maj, 0);
    const hero = `<section class="gs-hh"><div class="gs-hh-t"><span class="gs-hh-k">HLTV · Hall of Fame</span><h2>Зал славы</h2>
      <p>Легенды Counter-Strike. Вводят по итогам HLTV Awards после завершения карьеры: 2+ Major, 3+ попаданий в Top-20 или 5+ MVP.</p>
      <div class="gs-hh-n"><div><b>${members.length}</b><small>легенд в зале</small></div><div><b>${future.length}</b><small>будущих легенд</small></div><div><b>${majTotal}</b><small>Major на всех</small></div><div><b>${teamsY.length}</b><small>команд года</small></div></div></div>
      <div class="gs-hh-ps">${heroP}<i class="gs-hh-plinth"></i></div></section>`;
    const sec = (t, sub, inner) => `<section class="gs-hsec"><div class="gs-sh"><h3>${t}</h3>${sub ? `<span class="hs-dim">${sub}</span>` : ''}</div>${inner}</section>`;
    const teamCards = teamsY.map(h => `<button type="button" class="gs-ty" data-team="${esc(h.champion)}"><span class="gs-ty-aw">${window.TW ? window.TW.awardSvg('team', h.year || (H.yearOf ? H.yearOf(h.season) : '')) : ''}</span>${H.logo ? H.logo(h.champion, 'lg') : ''}<b>${esc(h.champion)}</b><small>Команда года · ${h.year || (H.yearOf ? H.yearOf(h.season) : '')}</small></button>`).join('');
    return hero
      + sec('Легенды', members.length ? `${members.length} в зале` : '', members.length ? `<div class="gs-plqs">${members.map(x => plaque(x)).join('')}</div>` : `<div class="hs-empty">Пока никто из легенд не завершил карьеру — первые плиты появятся после церемонии HLTV Awards.</div>`)
      + (future.length ? sec('Будущие легенды', 'уже прошли по критериям, ещё играют', `<div class="gs-plqs fut">${future.map(x => plaque(x, true)).join('')}</div>`) : '')
      + sec('Команды года', '', teamCards ? `<div class="gs-tys">${teamCards}</div>` : '<div class="hs-empty">Сезоны ещё не завершены</div>');
  }
  if (H.PAGES && H.PAGES.awards) {
    const origAwards = H.PAGES.awards;
    H.PAGES.awards = function () {
      const html = origAwards.apply(this, arguments);
      if (H.S.aw?.tab !== 'hof') return html;
      const i = html.indexOf('</div></div>');
      return (i > 0 ? html.slice(0, i + 12) : '') + `<div class="gs-hof">${hofHtml()}</div>`;
    };
  }
  // «Чемпионы по годам»: внутри года — Major, S-Tier, Tier-1, академии, Tier-2, Tier-3, квалификации
  const TEXT_RANK = [[/major/i, 0], [/s-?tier/i, 1], [/tier-?1/i, 2], [/академ/i, 3], [/tier-?2/i, 4], [/tier-?3/i, 5], [/квалиф/i, 6]];
  const rankOf = el => { const k = el.querySelector('.hs-kind'); const m = k && /k-([a-z0-9]+)/.exec(k.className); if (m && TIER_RANK[m[1]] != null) return TIER_RANK[m[1]];
    const txt = (k ? k.textContent : '') + ' ' + el.textContent; for (const [re, r] of TEXT_RANK) if (re.test(txt)) return r; return 9; };
  function sortChamps(pg) {
    // Кабинет: серии Major и S-Tier — первыми, квалификации — в конце
    if (H.S.aw?.tab === 'cabinet') { const secs = [...pg.querySelectorAll('.tc-series')]; if (secs.length > 1) { const host = secs[0].parentNode;
      secs.map((sc, i) => ({ sc, i, r: Math.min(...[...sc.querySelectorAll('.tc-item, .tc-grid > *')].map(rankOf).concat(9)) })).sort((a, b) => a.r - b.r || a.i - b.i).forEach(x => host.appendChild(x.sc)); } }
    if (H.S.aw?.tab !== 'champs') return;
    pg.querySelectorAll('table.hs-stbl tbody').forEach(tb => {
      const rank = rankOf;
      const rows = [...tb.rows].map((tr, i) => ({ tr, i, r: rank(tr) }));
      rows.sort((a, b) => a.r - b.r || a.i - b.i).forEach(x => tb.appendChild(x.tr));
    });
  }

  /* масштаб интерфейса, как в играх: макет рассчитан на 1920 px; на экране шире (или при уменьшенном масштабе браузера)
     интерфейс увеличивается целиком, а не растягивается — строки и колонки не разъезжаются. */
  const SCALE_KEY = 'cs2.gs.scale', SCALES = ['auto', 0.9, 1, 1.1, 1.25, 1.4];
  let scaleMode = store.get(SCALE_KEY, 'auto'); if (!SCALES.includes(scaleMode)) scaleMode = 'auto';
  function scaleNow() { return scaleMode === 'auto' ? Math.min(1.6, Math.max(1, window.innerWidth / 1920)) : scaleMode; }
  function scaleLabel() { return scaleMode === 'auto' ? `авто (${Math.round(scaleNow() * 100)}%)` : Math.round(scaleMode * 100) + '%'; }
  function scaleShort() { return scaleMode === 'auto' ? 'A' : Math.round(scaleMode * 100); }
  // масштаб — на корне портала, а не на всём документе: подсказки, тосты и окна живут в <body> и позиционируются
  // по экранным координатам элемента — при zoom на <html> они уезжали тем дальше, чем правее элемент.
  function applyScale() { const z = Math.round(scaleNow() * 1000) / 1000; document.documentElement.style.zoom = ''; const r = $('hs-root'); if (r) r.style.zoom = z === 1 ? '' : String(z); document.documentElement.style.setProperty('--gs-zoom', z); }
  applyScale(); window.addEventListener('resize', () => { if (scaleMode === 'auto') applyScale(); });
  (H.AFTER || []).push(after);
  let userRail = !!store.get(RAIL_KEY, false);
  const narrow = window.matchMedia ? window.matchMedia('(max-width:1100px)') : { matches: false };
  function applyRail() { document.documentElement.classList.toggle('gs-railed', userRail || narrow.matches); }
  applyRail(); try { narrow.addEventListener('change', applyRail); } catch (e) {}
  document.documentElement.classList.add('gs-shell');
  // модули дописывают меню с задержкой — сверяем модель несколько раз и затем раз в несколько секунд
  [0, 400, 1500, 4000].forEach(t => setTimeout(() => after(pageNow()), t));
  setInterval(() => { try { renderSide(); paintTop(); } catch (e) {} }, 3000);
  window.addEventListener('popstate', () => setTimeout(() => { renderSide(); paintTop(); }, 0));
  window.CS2Shell = { refresh: () => after(pageNow()), IC };
})();
