/* v100 «Арена» — новая визуальная оболочка CS2 Manager.

   Что делает (игровые данные не меняются, только интерфейс):
     • Боковое меню по режиму: менеджер — клуб (Главная, Состав, Трансферы, Тактика, Тренировки, Календарь,
       Соревнования, Финансы, Организация, Входящие) + «Мир CS2»; зритель — эфир, матчи, турниры, прогнозы.
       Всё остальное — в одной папке «Ещё». Сверху — крупный логотип клуба, снизу — карточка следующего матча.
     • Шапка: колокольчик с числом дел, карточка менеджера/аналитика, бюджет. Непонятная плашка «Tier-1: 1/14 …»
       убрана в подсказку часов; у скорости и «Продолжить» — понятные подсказки.
     • «Главная» менеджера (страница desk) — дашборд: герой с составом, следующий матч, обзор клуба с графиком
       рейтинга, последние результаты, новости с картинками, задачи, ближайшие события.
     • «Состав»: карточки игроков с формой, моралью, усталостью и сроком контракта (UX №8).
     • «Рынок»: фильтры «по карману», «свободные», роль, возраст (UX №9).
     • «Финансы»: одна итоговая цифра, «до сезона 3 · 2028» (UX №10); «контракт не подписан» — кнопка (UX №11).
     • Уведомления — снизу слева, сами скрываются через 6 с (UX №20). Первый запуск спрашивает режим (UX №1).
       На телефоне меню выдвигается (UX №21).
   Подключается последним, после всех модулей. */
(function () {
  'use strict';
  const W = window, D = document, H = W.HS, V = W.V31;
  if (!H || !V) return;
  const $ = id => D.getElementById(id);
  const esc = H.esc;
  const DAY = 864e5;
  const RM = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const ST = () => (typeof seasonState !== 'undefined' ? seasonState : null);
  const TEAMS = () => (typeof teams !== 'undefined' && Array.isArray(teams) ? teams : []);
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const now = () => Number(ST() && ST().calendar && ST().calendar.currentMs) || Date.now();
  const season = () => Number(ST() && ST().currentSeason) || 1;
  const yearOf = s => { try { return H.yearOf(s); } catch (e) { return 2025 + s; } };
  const team = n => TEAMS().find(t => t && t.name === n) || null;
  const pro = () => TEAMS().filter(t => t && !t.isAcademy);
  const rankOf = n => { const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.findIndex(t => t.name === n); return i < 0 ? 0 : i + 1; };
  const starters = t => (t && t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
  const pow = p => { try { return V.pow(p); } catch (e) { return ((+p.firepower || 0) + (+p.tacticalIQ || 0) + (+p.clutch || 0) + (+p.utility || 0)) / 4; } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const money = v => { try { return V.money(v); } catch (e) { return '$' + Math.round(v).toLocaleString('en-US'); } };
  const short = v => { const a = Math.abs(v), s = v < 0 ? '−' : ''; return a >= 1e6 ? `${s}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M` : a >= 1e3 ? `${s}$${Math.round(a / 1e3)}K` : `${s}$${Math.round(a)}`; };
  const fdate = ms => ms ? new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '') : '—';
  const ftime = ms => ms ? new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
  const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
  const media = (kind, n) => { try { return (W.V31Media && W.V31Media.url(kind, n)) || null; } catch (e) { return null; } };
  const tint = n => { const u = media('team', n), k = u && u.split('/').pop(), c = k && W.CS2_TEAM_TINT && W.CS2_TEAM_TINT[k]; return c && (Math.max(...c) - Math.min(...c)) > 60 ? c : [255, 122, 26]; };   // бесцветные логотипы (белые/серые) — в тёплый акцент, иначе фон сереет
  const rgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const photo = p => { try { return H.photoOf(p); } catch (e) { return null; } };

  /* ---------- иконки (линейные, 24×24) ---------- */
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    home: svg('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>'),
    squad: svg('<circle cx="9" cy="8" r="3.3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.6 14a5 5 0 0 1 5.4 5"/>'),
    transfer: svg('<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>'),
    tactics: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m7.5 7.5 3 3m0-3-3 3"/><circle cx="16" cy="16" r="1.8"/><path d="M9 16.5c3 0 5-2.5 5.5-6.5"/><path d="m12.8 11.3 1.7-1.6 1.6 1.7"/>'),
    training: svg('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
    calendar: svg('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M8 13.5h2M12 13.5h2M8 16.5h2"/>'),
    trophy: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20h7M9.5 17h5"/>'),
    finance: svg('<circle cx="12" cy="12" r="8.5"/><path d="M14.7 9.3c-.5-.9-1.5-1.4-2.7-1.4-1.5 0-2.7.8-2.7 2s1.2 1.7 2.7 2 2.7.9 2.7 2.1-1.2 2.1-2.7 2.1c-1.3 0-2.3-.5-2.8-1.5M12 6v1.9M12 16.1V18"/>'),
    org: svg('<path d="M4 20V7.5L12 4l8 3.5V20"/><path d="M9.5 20v-4h5v4M8 10h2M14 10h2M8 13.5h2M14 13.5h2M3 20h18"/>'),
    inbox: svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.6 6.6 8.4 6.4 8.4-6.4"/>'),
    news: svg('<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M7.5 9h6M7.5 12.5h6M7.5 16h4"/>'),
    matches: svg('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>'),
    events: svg('<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'),
    ranking: svg('<path d="M4 20v-7h4.5v7M9.75 20V8h4.5v12M15.5 20v-9.5H20V20"/><path d="M3 20h18"/>'),
    players: svg('<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    teams: svg('<path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    watch: svg('<rect x="3" y="5" width="18" height="12" rx="2.5"/><path d="M8 21h8M12 17v4"/><path d="m10.5 9 3.5 2-3.5 2z"/>'),
    predict: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.8 12h2.6M18.6 12h2.6M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'),
    more: svg('<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>'),
    chev: svg('<path d="m9 6 6 6-6 6"/>'),
    bell: svg('<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.6 2H4.4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    wallet: svg('<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M16 15h2"/><path d="M6 6V5a1.5 1.5 0 0 1 1.9-1.4L17 6"/>'),
    crown: svg('<path d="m3 8.5 4.5 4L12 5.5l4.5 7 4.5-4-2 10.5H5z"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    check: svg('<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.3 4.6-4.8"/>'),
    dot: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    up: svg('<path d="m6 15 6-6 6 6"/>'),
    chart: svg('<path d="M4 19V5M4 19h16"/><path d="m7.5 15 3.5-4 3 2.5 5-6.5"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    coffee: svg('<path d="M4.5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 10.5h1.5a2.5 2.5 0 0 1 0 5h-1.6M8 3.5c0 1 1 1.3 1 2.5M11.5 3.5c0 1 1 1.3 1 2.5"/>'),
    mic: svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>'),
    eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    flag: svg('<path d="M5 21V4.5M5 4.5h11l-2 4 2 4H5"/>'),
    history: svg('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5V9H8"/><path d="M12 7.5V12l3 2"/>'),
    community: svg('<path d="M4 5.5h12v8.5H9l-4 3.5V14H4z"/><path d="M16 9h4v8h-1.5v2.8L15 17h-4.5"/>')
  };

  /* ---------- общий вид команды ---------- */
  function logoImg(name, px, cls) {
    const u = media('team', name);
    if (u) return `<img class="ax-logo ${cls || ''}" src="${esc(u)}" alt="" width="${px}" height="${px}" loading="lazy" decoding="async">`;
    return `<span class="ax-logo ax-logo-f ${cls || ''}" style="--s:${px}px">${H.logo ? H.logo(name, 'md') : ''}</span>`;
  }
  const flagOf = p => { try { return H.pFlag(p) || ''; } catch (e) { return ''; } };

  /* ================================================================ БОКОВОЕ МЕНЮ */
  // v100.2: в меню только «входы» в разделы; страницы, которые открываются вкладками внутри раздела, в меню не дублируются
  const MANAGER = [
    ['desk', 'Главная', 'home'], ['career', 'Менеджер', 'crown'], ['squad', 'Команда', 'squad'], ['negotiate', 'Трансферы', 'transfer'],
    ['clubev', 'Соревнования', 'trophy'], ['calendar', 'Календарь', 'calendar'], ['org', 'Организация', 'org']
  ];
  const WORLD_M = [['home', 'Портал HLTV', 'news'], ['matches', 'Матчи', 'matches'], ['events', 'Турниры', 'events'], ['pickem', "Pick'Em", 'predict'], ['ranking', 'Рейтинг', 'ranking'], ['players', 'Игроки', 'players'], ['teams', 'Команды', 'teams'], ['watch', 'Эфир', 'watch']];
  const SPECTATOR = [
    ['home', 'Главная', 'home'], ['watch', 'Эфир', 'watch'], ['matches', 'Матчи', 'matches'], ['events', 'Турниры', 'events'],
    ['calendar', 'Календарь', 'calendar'], ['ranking', 'Рейтинг', 'ranking'], ['news', 'Новости', 'news'], ['pickem', "Pick'Em", 'predict'], ['predict', 'Прогнозы', 'predict'],
    ['players', 'Игроки', 'players'], ['teams', 'Команды', 'teams'], ['transfers', 'Трансферы', 'transfer']
  ];
  // вкладки внутри разделов — не показываем в меню (раздел подсвечивается сам)
  const TAB_PAGES = new Set(['training', 'tactics', 'staff', 'academy', 'finance', 'control', 'manage', 'pick', 'inbox', 'dm', 'debrief', 'decisions', 'scout', 'season', 'settings', 'gs', 'veto', 'desk']);
  const GROUPS = [
    ['hist', 'История', 'history', ['majorpath', 'majors', 'awards', 'hof', 'records', 'eras', 'rivalries', 'archive', 'nations', 'stats']],
    ['comm', 'Фан-зона', 'community', ['news', 'transfers', 'predict', 'community', 'forum', 'fantasy', 'fpl', 'betting', 'cards', 'stickers', 'fan']]
  ];
  const labelOf = b => { const c = b.cloneNode(true); c.querySelectorAll('i,b,small,.gs-badge,svg').forEach(n => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
  function allNav() {   // все разделы, которые модули зарегистрировали в старой навигации
    const out = new Map(), root = $('hs-root'); if (!root) return out;
    root.querySelectorAll('.pt-tabs [data-nav], .pt-menu [data-nav]').forEach(b => { const k = b.dataset.nav; if (!k || b.hidden || out.has(k)) return; const l = labelOf(b); if (l) out.set(k, l); });
    return out;
  }
  const has = k => !!(H.PAGES && H.PAGES[k]);
  const pageNow = () => (H.S && H.S.page) || 'home';
  const openGrp = new Set(store.get('cs2.ax.grp', []));

  // v101: счётчик — то, что требует действия: нерешённые события, разговоры без ответа, непрочитанные письма (письма
  // становятся прочитанными в «Центре событий»). Постоянные дела «Рабочего места» (план тренировок, контракт) в счёт не
  // входят — раньше из-за них число не сбрасывалось никогда. Колокольчик и «Главная» показывают одно число.
  function freshCount() {
    let n = 0;
    try { const V9 = W.V96Windows; if (V9) n += V9.events().length; } catch (e) {}          // нерешённые события (решили — ушли из счёта)
    try { const T = W.V99Talks; if (T) n += T.open().length; } catch (e) {}                  // разговоры без ответа
    try { if (W.V99Mail) n += W.V99Mail.unread().length; } catch (e) {}
    return n;
  }
  function badgeFor(k) {
    try { if (!me()) return 0; if (k === 'desk') return freshCount(); } catch (e) {}
    return 0;
  }
  function activeKey(list) {
    const p = pageNow(), keys = list.map(x => x[0]);
    if (keys.includes(p)) return p;
    const sec = H.SECTION_OF && H.SECTION_OF[p];
    if (sec && keys.includes(sec)) return sec;
    const tabs = [...D.querySelectorAll('#hs-page .v99-tabs [data-nav]')].map(b => b.dataset.nav);
    return tabs.find(k => keys.includes(k)) || (p === 'team' && me() && H.S.arg === me() ? 'squad' : '');
  }
  function it(x, on, sub) {
    const [k, l, ic] = x, n = sub ? 0 : badgeFor(k);
    return `<button type="button" class="gs-it ax-it${sub ? ' sub' : ''}${on ? ' on' : ''}" data-nav="${esc(k)}"${k === 'squad' || (k === 'team' && me()) ? '' : ''} title="${esc(l)}"${on ? ' aria-current="page"' : ''}>
      ${sub ? '' : `<span class="gs-ic">${IC[ic] || IC.more}</span>`}<span class="gs-lb">${esc(l)}</span>${n ? `<span class="ax-badge">${n > 9 ? '9+' : n}</span>` : ''}</button>`;
  }
  function nextMatch(name) {
    if (!name) return null;
    try {
      const lm = (H.liveMatches ? H.liveMatches() : []).filter(x => x && x.m && (x.m.a === name || x.m.b === name) && !x.m.w);
      if (lm.length) {
        lm.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || (a.at || 0) - (b.at || 0));
        const x = lm[0], ev = x.ev || (x.snap && x.snap.name) || '';
        return { opp: x.m.a === name ? x.m.b : x.m.a, ev, stage: x.stage || x.round || '', at: x.at || 0, live: !!x.live };
      }
    } catch (e) {}
    try { const e = W.CS2Desk && W.CS2Desk.nextEvent(name); if (e) return { opp: '', ev: e.name, at: e.start || 0, live: !!e.live, event: true }; } catch (e) {}
    return null;
  }
  const inDays = at => { if (!at) return ''; const d = Math.ceil((at - now()) / DAY); return d <= 0 ? 'сегодня' : d === 1 ? 'завтра' : `через ${d} ${plural(d, 'день', 'дня', 'дней')}`; };

  function sideHtml() {
    const club = me(), map = allNav();
    const list = (club ? MANAGER : SPECTATOR).filter(x => has(x[0]) || map.has(x[0]));
    const world = club ? WORLD_M.filter(x => has(x[0]) || map.has(x[0])) : [];
    const used = new Set([...list, ...world].map(x => x[0]));
    const MGR_ONLY = new Set(['org', 'squad', 'negotiate', 'clubev', 'career', 'finance', 'training', 'tactics', 'staff', 'academy', 'desk']);
    const avail = [...map.entries()].filter(([k]) => !used.has(k) && !TAB_PAGES.has(k) && (club || !MGR_ONLY.has(k)));
    if (club && map.has('transfers')) map.set('transfers', 'Трансферы мира');
    const placed = new Set();
    const groups = GROUPS.map(([gk, gl, gi, keys]) => [gk, gl, gi, keys.filter(k => map.has(k) && !used.has(k)).map(k => (placed.add(k), [k, map.get(k), 'more']))]);
    const rest = avail.filter(([k]) => !placed.has(k)).map(([k, l]) => [k, l, 'more']);
    if (rest.length) groups[1][3].push(...rest);
    const more = groups.flatMap(g => g[3]);
    const on = activeKey(list.concat(world, more));
        const s = season(), y = yearOf(s);
    let brand;
    if (club) {
      const t = team(club), c = tint(club), rk = rankOf(club);
      brand = `<button type="button" class="ax-club" data-nav="team" data-arg="${esc(club)}" style="--tc:${rgb(c, 1)};--tc2:${rgb(c, .22)}" title="Профиль клуба">
        <span class="ax-club-logo">${logoImg(club, 76)}</span><b class="ax-club-name">${esc(club)}</b>
        <small>${rk ? `#${rk} в мире · ` : ''}Сезон ${s} · ${y}</small></button>`;
      void t;
    } else {
      brand = `<button type="button" class="ax-club ax-club-spec" data-nav="home" title="Главная"><span class="ax-mark">CS2<i>MANAGER</i></span><small>Режим зрителя · ${y}</small></button>`;
    }
    const nm = club ? nextMatch(club) : null;
    const widget = club ? (nm ? `<button type="button" class="ax-next" data-nav="${nm.opp ? 'clubev' : 'calendar'}">
        <span class="ax-next-t"><small>${nm.live ? '<i class="ax-live">LIVE</i> идёт сейчас' : esc(nm.event ? 'Ближайший турнир' : 'Следующий матч')}</small>
        <b>${nm.live ? '' : esc(inDays(nm.at))}</b><span>${nm.opp ? 'vs ' + esc(nm.opp) : esc(nm.ev)}</span></span>
        ${nm.opp ? logoImg(nm.opp, 40) : `<span class="ax-next-ic">${IC.trophy}</span>`}</button>` : '')
      : `<button type="button" class="ax-cta" data-nav="pick"><span>${IC.crown}</span><b>Возглавить клуб</b><small>Начать карьеру менеджера</small></button>`;
    return `<div class="ax-side-in">
      <div class="ax-brand">${brand}</div>
      <nav class="gs-nav ax-nav" aria-label="Разделы">
        ${list.map(x => it(x, x[0] === on)).join('')}
        ${world.length ? `<div class="gs-cap ax-cap">Мир CS2</div>${world.map(x => it(x, x[0] === on)).join('')}` : ''}
        ${groups.filter(g => g[3].length).map(([gk, gl, gi, items]) => { const gOn = items.some(x => x[0] === on), open = gOn || openGrp.has(gk);
          return `<div class="ax-grp${open ? ' open' : ''}${gOn ? ' on' : ''}"><button type="button" class="gs-it ax-it ax-gh" data-ax-tog="${gk}" aria-expanded="${open}"><span class="gs-ic">${IC[gi]}</span><span class="gs-lb">${gl}</span><span class="ax-chev">${IC.chev}</span></button>
          <div class="ax-sub">${items.map(x => it(x, x[0] === on, true)).join('')}</div></div>`; }).join('')}
      </nav>
      ${widget ? `<div class="ax-widget">${widget}</div>` : ''}
      <div class="gs-foot ax-foot">${it(['settings', 'Настройки', 'settings'], on === 'settings' || pageNow() === 'settings')}
        <button type="button" class="gs-railbtn ax-sndbtn${SND.on ? '' : ' off'}" data-ax-snd aria-label="Звуки интерфейса" title="Звуки интерфейса: ${SND.on ? 'вкл' : 'выкл'}">${SND.on ? svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>') : svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>')}</button>
        <button type="button" class="gs-railbtn gs-scalebtn" data-gs-scale aria-label="Масштаб интерфейса" title="Масштаб интерфейса — нажмите, чтобы сменить">${svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')}</button>
        <button type="button" class="gs-railbtn" data-gs-rail aria-label="Свернуть или развернуть меню" title="Свернуть / развернуть меню">${svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9 4.5v15"/>')}</button></div>
    </div>`;
  }
  let sideSig = '';
  function renderSide(force) {
    const side = $('gs-side'); if (!side) return;
    const html = sideHtml(), sig = html.replace(/\s+/g, ' ');
    if (!force && sig === sideSig && side.querySelector('.ax-side-in')) return;
    sideSig = sig; side.classList.add('ax-side'); side.innerHTML = html;
    const onEl = side.querySelector('.ax-sub .ax-it.on'); if (onEl) requestAnimationFrame(() => onEl.scrollIntoView({ block: 'nearest' }));
  }
  function bindSide() {
    const side = $('gs-side'); if (!side || side.dataset.ax) return !!side;
    side.dataset.ax = '1';
    new MutationObserver(() => { if (!side.querySelector('.ax-side-in')) renderSide(true); }).observe(side, { childList: true });
    side.addEventListener('click', e => {
      const t = e.target.closest('[data-ax-tog]');
      // v101: в узком режиме (рельс) папка раскрывает меню поверх контента — иначе подменю пряталось в колонке 72 px
      if (t && D.documentElement.classList.contains('gs-railed') && !side.classList.contains('gs-peek')) { e.stopPropagation(); const g = t.closest('.ax-grp'); g.classList.add('open'); t.setAttribute('aria-expanded', true); side.classList.add('gs-peek'); return; }
      if (t) { e.stopPropagation(); const g = t.closest('.ax-grp'); if (g.classList.contains('on') && g.classList.contains('open')) return; const o = !g.classList.contains('open'); g.classList.toggle('open', o); t.setAttribute('aria-expanded', o); if (o) openGrp.add(t.dataset.axTog); else openGrp.delete(t.dataset.axTog); store.set('cs2.ax.grp', [...openGrp]); return; }
      if (e.target.closest('[data-ax-snd]')) { e.stopPropagation(); SND.toggle(); renderSide(true); return; }
      if (e.target.closest('[data-nav]')) { D.documentElement.classList.remove('ax-drawer'); side.classList.remove('gs-peek'); }
    });
    renderSide(true);
    return true;
  }

  /* ================================================================ ШАПКА */
  function topHtml() {
    const club = me();
    if (club) {
      const t = team(club), o = (() => { try { return V.org(club); } catch (e) { return {}; } })();
      const n = badgeFor('desk'), rep = Math.round(+o.rep || 0), b = +o.budget || 0;
      return `<button type="button" class="ax-bell" data-nav="inbox" title="Центр событий${n ? ': ' + n + ' ' + plural(n, 'дело', 'дела', 'дел') : ' — всё решено'}" aria-label="Центр событий">${IC.bell}${n ? `<i>${n > 9 ? '9+' : n}</i>` : ''}</button>
        <button type="button" class="ax-me" data-nav="career" title="Карьера менеджера · репутация организации ${rep}/100">
          <span class="ax-ava">${t ? logoImg(club, 26) : IC.players}</span><span class="ax-me-t"><b>Менеджер</b><small>Репутация ${rep}</small><i style="--p:${clamp(rep, 0, 100)}%"></i></span>${IC.chev}</button>
        <button type="button" class="ax-money${b < 0 ? ' neg' : ''}" data-nav="finance" title="Бюджет клуба: ${esc(money(b))}">${IC.wallet}<b>${esc(short(b))}</b></button>`;
    }
    let lv = '', pts = 0, pct = 0;
    try { const s = W.V99Spec.S(); pts = +s.pts || 0; const L = W.V99Spec.LEVELS || []; const i = W.V99Spec.levelOf(pts); const cur = L[i] || {}, nx = L[i + 1]; lv = cur.l || cur.name || cur.t || ('Уровень ' + (i + 1)); pct = nx ? clamp((pts - (cur.p || cur.pts || 0)) / ((nx.p || nx.pts || 1) - (cur.p || cur.pts || 0)) * 100, 0, 100) : 100; } catch (e) {}
    return `<button type="button" class="ax-bell" data-nav="predict" title="Прогнозы и опросы" aria-label="Прогнозы">${IC.predict}</button>
      <button type="button" class="ax-me" data-nav="watch" title="Репутация аналитика"><span class="ax-ava">${IC.mic}</span><span class="ax-me-t"><b>Аналитик</b><small>${esc(lv || 'Новичок')} · ${pts} очк.</small><i style="--p:${pct}%"></i></span>${IC.chev}</button>
      <button type="button" class="ax-money ax-pick" data-nav="pick" title="Возглавить клуб">${IC.crown}<b>Карьера</b></button>`;
  }
  let topSig = '';
  function paintTop() {
    const inn = D.querySelector('#hs-root .pt-top-in'); if (!inn) return;
    let box = $('ax-top');
    if (!box) {
      box = D.createElement('div'); box.id = 'ax-top'; box.className = 'ax-top';
      const time = inn.querySelector('.pt-time'); inn.insertBefore(box, time ? time.nextSibling : null);
      const lead = inn.querySelector('.gs-lead');
      if (lead && !lead.querySelector('.ax-burger')) lead.insertAdjacentHTML('afterbegin', `<button type="button" class="ax-burger" aria-label="Меню" title="Меню">${IC.menu}</button>`);
      inn.addEventListener('click', e => { if (e.target.closest('.ax-burger')) { e.stopPropagation(); const o = D.documentElement.classList.toggle('ax-drawer'); const sd = $('gs-side'); if (sd) sd.classList.toggle('gs-peek', o); } });
    }
    const html = topHtml(); if (html !== topSig) { box.innerHTML = html; topSig = html; }
    // UX №2: вместо непонятной плашки — подсказка у часов; понятные подписи у скорости и «Продолжить»
    const ss = $('pt-season'), clock = inn.querySelector('.pt-clock');
    if (ss && clock) { const tip = ss.textContent.replace(/\s+/g, ' ').replace('T2/3', 'Tier-2/3').replace(/Tier-1:\s*(\d+)\s*\/\s*(\d+)/, 'Tier-1: сыграно $1 из $2').trim(); if (clock.title !== tip) clock.title = tip; }
    inn.querySelectorAll('.pt-speed button, [data-speed]').forEach(b => { if (!b.title) { const v = (b.textContent || '').trim(); b.title = v === '1x' ? 'Обычная скорость' : `Скорость ${v}: день проходит быстрее`; } });
    const sk = $('pt-skip'); if (sk && !sk.dataset.axTip) { sk.dataset.axTip = 1; sk.title = 'Продолжить — время идёт до следующего события: матча, решения или нового дня. Стрелка справа — выбрать, до чего перемотать.'; }
    const ps = $('pt-pause'); if (ps && !ps.title) ps.title = 'Пауза / пуск времени';
    const tt = $('gs-title'); if (tt && pageNow() === 'desk' && me() && tt.textContent !== 'Главная') { tt.textContent = 'Главная'; D.title = `${me()} — CS2 Manager`; }
  }

  /* ================================================================ ГЛАВНАЯ МЕНЕДЖЕРА */
  const MOTTO = { Tactical: 'Каждый раунд — по плану.', Aggressive: 'Давление с первой секунды.', Discipline: 'Дисциплина сильнее таланта.', Chaos: 'Непредсказуемость — наше оружие.' };
  function series(t, n) {
    const h = (t && t.mapHistory) || [], out = [];
    for (let i = 0; i < h.length && out.length < n; i++) {
      const a = h[i]; if (!a) continue;
      const last = out[out.length - 1];
      if (last && last.tour === a.tournament && last.opp === a.opponent && last.round === a.round) { if (a.result === 'W') last.w++; else last.l++; last.maps.push(a.map); continue; }
      out.push({ opp: a.opponent, tour: a.tournament, round: a.round, w: a.result === 'W' ? 1 : 0, l: a.result === 'W' ? 0 : 1, maps: [a.map], ts: a.ts || a.date || 0 });
    }
    return out;
  }
  function rankSeries(name) {
    let snaps = []; try { snaps = H.rankStore().snaps || []; } catch (e) {}
    const pts = snaps.map(s => { const i = (s.n || []).indexOf(name); return i < 0 ? null : { v: s.p && s.p[i] != null ? +s.p[i] : null, r: i + 1, ts: s.ts }; }).filter(Boolean);
    const t = team(name); if (t) pts.push({ v: +t.pts || 0, r: rankOf(name), ts: now() });
    return pts.slice(-24);
  }
  function chartSvg(vals, w, h) {
    const v = vals.filter(x => x != null && isFinite(x));
    if (v.length < 2) v.unshift(v[0] != null ? v[0] * 0.985 : 0);
    const mn = Math.min(...v), mx = Math.max(...v), pad = (mx - mn) * 0.15 || 1, lo = mn - pad, hi = mx + pad;
    const X = i => (i / (v.length - 1)) * w, Y = x => h - ((x - lo) / (hi - lo)) * h;
    const pts = v.map((x, i) => [X(i), Y(x)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const grid = [0.25, 0.5, 0.75].map(f => `<line x1="0" x2="${w}" y1="${(h * f).toFixed(1)}" y2="${(h * f).toFixed(1)}"/>`).join('');
    return `<svg class="ax-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="axg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ax-acc)" stop-opacity=".35"/><stop offset="1" stop-color="var(--ax-acc)" stop-opacity="0"/></linearGradient></defs>
      <g class="ax-grid">${grid}</g><path class="ax-area" d="${d} L${w} ${h} L0 ${h} Z" fill="url(#axg)"/><path class="ax-line" d="${d}" pathLength="1"/>
      ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 4 : 2.6}"${i === pts.length - 1 ? ' class="last"' : ''}/>`).join('')}</svg>`;
  }
  function newsThumb(n) {
    const v = newsVisual(n);
    return `<span class="ax-thumb ax-scened${v.html ? ' ax-has-vis' : ' ic'}" style="--scene:url('${SC(v.scene)}')">${v.html || IC.news}</span>`;
  }
  function findPlayer(nick) {
    const k = String(nick || '').toLowerCase(); if (!k) return null;
    for (const t of TEAMS()) { const p = (t.players || []).find(x => x && String(x.nick).toLowerCase() === k); if (p) return { p, t }; }
    return null;
  }
  const count = (v, fmt) => `<b class="ax-num" data-ax-count="${v}" data-ax-fmt="${fmt || ''}">${fmt === 'money' ? esc(short(v)) : fmt === 'k' ? esc(fmtK(v)) : Math.round(v)}</b>`;
  const fmtK = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v));

  function deskPage(orig) {
    const name = me(), t = team(name);
    if (!t) return orig ? orig() : '';
    const c = tint(name), rk = rankOf(name), s0 = +t.seasonStartRank || rk, dRank = s0 - rk;
    const o = (() => { try { return V.org(name); } catch (e) { return {}; } })();
    let fc = null; try { fc = W.CS2Finance.forecast(t); } catch (e) {}
    let pop = 0, fans = 0; try { pop = W.CS2Fans.popularity(t); fans = Math.round((5000 + Math.pow(pop, 2.2) * 95) / 1000) * 1000; } catch (e) {}
    const ps = starters(t).slice().sort((a, b) => pow(b) - pow(a)), order = [3, 1, 0, 2, 4].map(i => ps[i]).filter(Boolean);
    const nm = nextMatch(name), res = series(t, 5), todo = (() => { try { return W.CS2Desk.todo(t); } catch (e) { return []; } })();
    const motto = MOTTO[t.style] || 'Играем за титулы.';

    // герой
    const hero = `<section class="ax-card ax-hero" style="--tc:${rgb(c, 1)};--tc2:${rgb(c, .35)};--tc3:${rgb(c, .12)};--scene:url('${SC(sceneByTint(c))}')">
      <div class="ax-hero-bg" aria-hidden="true"></div>
      <div class="ax-hero-mark" aria-hidden="true">${logoImg(name, 360)}</div>
      <div class="ax-hero-squad" aria-hidden="true">${order.map((p, i) => { const u = photo(p); return u ? `<img class="ax-hp p${i}" src="${esc(u)}" alt="" style="--i:${i}" loading="lazy" decoding="async">` : ''; }).join('')}</div>
      <div class="ax-hero-t">
        ${rk ? `<span class="ax-pill${rk <= 3 ? ' gold' : ''}">${rk <= 3 ? IC.crown : IC.ranking}#${rk} в мировом рейтинге</span>` : ''}
        <h2 class="ax-hero-name">${esc(name)}</h2>
        <p class="ax-hero-sub">${esc(motto)}</p>
        <div class="ax-hero-act"><button type="button" class="ax-btn ghost" data-team="${esc(name)}">Профиль клуба ${IC.arrow}</button><button type="button" class="ax-btn ghost" data-nav="squad">Состав</button></div>
      </div></section>`;

    // следующий матч
    const nextBody = nm && nm.opp ? `<div class="ax-vs">
        <button type="button" class="ax-vs-t" data-team="${esc(name)}">${logoImg(name, 64)}<b>${esc(name)}</b></button>
        <span class="ax-vs-x">VS</span>
        <button type="button" class="ax-vs-t" data-team="${esc(nm.opp)}">${logoImg(nm.opp, 64)}<b>${esc(nm.opp)}</b></button></div>
        <div class="ax-vs-ev">${nm.live ? '<i class="ax-live">LIVE</i>' : `<span>${esc(fdate(nm.at))}${nm.at ? ' · ' + esc(ftime(nm.at)) : ''}</span>`}<b>${esc(nm.ev || '')}</b>${nm.stage ? `<small>${esc(nm.stage)}</small>` : ''}</div>
        <button type="button" class="ax-btn primary wide" data-nav="${nm.live ? 'watch' : 'tactics'}">${nm.live ? 'Смотреть' : 'Подготовка к матчу'} ${IC.arrow}</button>`
      : nm ? `<div class="ax-evcard"><span class="ax-evcard-ic">${IC.trophy}</span><small>${nm.live ? 'Турнир идёт' : 'Ближайший турнир'}</small><b>${esc(nm.ev)}</b>
          <span class="ax-count-big">${nm.live ? '<i class="ax-live">LIVE</i>' : `${Math.max(0, Math.ceil((nm.at - now()) / DAY))}<small>${plural(Math.max(0, Math.ceil((nm.at - now()) / DAY)), 'день', 'дня', 'дней')}</small>`}</span>
          <em>${nm.at ? esc(fdate(nm.at)) : ''}</em></div><button type="button" class="ax-btn primary wide" data-nav="clubev">Соревнования клуба ${IC.arrow}</button>`
      : `<div class="ax-empty">${IC.calendar}<b>Матчей пока нет</b><span>Выберите турниры для участия.</span></div><button type="button" class="ax-btn primary wide" data-nav="clubev">Соревнования ${IC.arrow}</button>`;
    const next = `<section class="ax-card ax-next-card v99-nextbox" style="--scene:url('${SC(nm && nm.opp ? 'arena-crimson' : 'trophy-gold')}')"><header class="ax-h"><h3>${nm && nm.opp ? 'Следующий матч' : 'Впереди'}</h3>${nm && nm.at && !nm.live ? `<span class="ax-h-meta">${esc(inDays(nm.at))}</span>` : ''}</header>${nextBody}</section>`;

    // обзор клуба
    const rs = rankSeries(name), vals = rs.map(x => x.v != null ? x.v : 100 - x.r);
    let board = ''; try { const k = W.CS2Board.contract(name), bs = k ? W.CS2Board.score(k) : null; board = bs ? `<div class="ax-goal"><span>Доверие руководства</span><b class="${bs.conf >= 50 ? 'up' : 'dn'}">${bs.conf}%</b><i style="--p:${clamp(bs.conf, 0, 100)}%"></i><small>цель — топ-${k.rT}</small></div>` : `<div class="ax-goal"><span>Контракт с руководством</span><button type="button" class="ax-link" data-nav="control">подписать ${IC.arrow}</button></div>`; } catch (e) {}
    const overview = `<section class="ax-card ax-overview"><header class="ax-h"><h3><span class="ax-h-ic">${IC.chart}</span>Обзор клуба</h3><button type="button" class="ax-link" data-nav="ranking">рейтинг ${IC.arrow}</button></header>
      <div class="ax-ov">
        <div class="ax-ov-col">
          <div class="ax-stat"><small>Мировой рейтинг</small><div><span class="ax-big">#${count(rk)}</span>${dRank ? `<em class="${dRank > 0 ? 'up' : 'dn'}">${dRank > 0 ? '▲' : '▼'} ${Math.abs(dRank)}</em>` : '<em>=</em>'}</div></div>
          <div class="ax-stat"><small>Фанаты</small><div><span class="ax-big">${count(fans, 'k')}</span><em class="mute">${pop}/100</em></div></div>
        </div>
        <div class="ax-ov-chart">${chartSvg(vals, 420, 150)}<div class="ax-chart-cap"><span>VRS-очки</span><b>${Math.round(+t.pts || 0)}</b></div></div>
        <div class="ax-ov-col">
          <div class="ax-stat"><small>Бюджет</small><div><span class="ax-big">${count(+o.budget || 0, 'money')}</span></div>${fc ? `<em class="${fc.season.net >= 0 ? 'up' : 'dn'}">${fc.season.net >= 0 ? '▲ +' : '▼ '}${esc(short(fc.season.net))} за сезон</em>` : ''}</div>
          <div class="ax-stat"><small>К концу сезона</small><div><span class="ax-big sm">${fc ? count(fc.end, 'money') : '—'}</span></div></div>
          ${board}
        </div>
      </div></section>`;

    // последние результаты
    const results = `<section class="ax-card ax-results${res.length ? '' : ' ax-scene-bg'}" style="--scene:url('${SC('crowd')}')"><header class="ax-h"><h3><span class="ax-h-ic">${IC.trophy}</span>Последние матчи</h3>${res.length ? `<span class="ax-h-meta">${res.filter(r => r.w > r.l).length} / ${res.length}</span>` : ''}</header>
      ${res.length ? `<ul class="ax-res">${res.map(r => { const win = r.w > r.l; return `<li><button type="button" data-team="${esc(r.opp)}">${logoImg(r.opp, 28)}<span class="ax-res-n">vs ${esc(r.opp)}<small>${esc(r.tour || '')}</small></span><b>${r.w} : ${r.l}</b><i class="ax-wl ${win ? 'w' : 'l'}">${win ? 'W' : 'L'}</i></button></li>`; }).join('')}</ul>`
        : `<div class="ax-empty">${IC.matches}<b>Сыгранных матчей нет</b><span>Результаты появятся после первой серии.</span></div>`}</section>`;

    // новости
    let feed = []; try { feed = H.feed() || []; } catch (e) {}
    const mineN = feed.filter(n => n && (n.team === name || (n.tags || []).some(x => x.v === name || (x.t === 'player' && t.players.some(p => p && p.nick === x.v)))));
    const top = mineN.concat(feed.filter(n => n && (n.imp || 0) >= 5 && !mineN.includes(n))).slice(0, 3);
    const news = `<section class="ax-card ax-news"><header class="ax-h"><h3><span class="ax-h-ic">${IC.news}</span>Новости</h3><button type="button" class="ax-link" data-nav="news">все ${IC.arrow}</button></header>
      ${top.length ? `<div class="ax-news-l">${top.map(n => `<article class="ax-nw" data-art="${esc(n.id)}" tabindex="0">${newsThumb(n)}<div><b>${esc(n.title)}</b>${n.lead ? `<p>${esc(n.lead)}</p>` : ''}<small>${esc(fdate(n.ts))}</small></div></article>`).join('')}</div>`
        : `<div class="ax-empty">${IC.news}<b>Новостей пока нет</b></div>`}</section>`;

    // задачи
    const tasks = `<section class="ax-card ax-tasks"><header class="ax-h"><h3><span class="ax-h-ic">${IC.check}</span>Задачи</h3>${todo.length ? `<span class="ax-new">${todo.length} ${plural(todo.length, 'новая', 'новые', 'новых')}</span>` : ''}</header>
      ${todo.length ? `<ul class="ax-todo">${todo.slice(0, 5).map(x => `<li><button type="button" data-nav="${esc(x.nav)}"${x.arg ? ` data-arg="${esc(x.arg)}"` : ''} class="${x.urgent ? 'urg' : ''}"><span class="ax-todo-ic">${IC.dot}</span><span><b>${esc(x.l)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}</span>${IC.chev}</button></li>`).join('')}</ul>`
        : `<div class="ax-empty ok sm">${IC.check}<b>Всё решено</b><span>Можно продолжать сезон.</span></div>`}
      ${todo.length < 3 ? `<div class="ax-quick"><small>Быстрые действия</small><div>${[['training', 'Тренировки', 'training'], ['tactics', 'Тактика', 'tactics'], ['scout', 'Скаутинг', 'eye'], ['negotiate', 'Рынок', 'transfer']].filter(x => has(x[0])).map(([k, l, ic]) => `<button type="button" data-nav="${k}">${IC[ic]}<span>${l}</span></button>`).join('')}</div></div>` : ''}</section>`;

    // календарь
    let cal = []; try { cal = (H.calendarEvents() || []).filter(e => e && e.status !== 'completed' && (e.endMs || e.startMs || 0) >= now() - DAY).sort((a, b) => (a.startMs || 0) - (b.startMs || 0)); } catch (e) {}
    const mineEv = nm && nm.ev ? nm.ev : '';
    cal = cal.filter(e => e.kind !== 'qual' || String(e.name).includes(mineEv.split(' — ')[0] || '§')).slice(0, 4);
    const KI = { qual: 'flag', awards: 'crown', top20: 'crown', major: 'trophy', elite: 'events', tier1: 'events', tier2: 'trophy', tier3: 'trophy', academy: 'squad' };
    const calendar = `<section class="ax-card ax-cal"><header class="ax-h"><h3><span class="ax-h-ic">${IC.calendar}</span>Календарь</h3><button type="button" class="ax-link" data-nav="calendar">открыть ${IC.arrow}</button></header>
      ${cal.length ? `<ul class="ax-cal-l">${cal.map(e => { const live = e.status === 'live' || (e.startMs <= now() && e.endMs >= now()); const mine = mineEv && String(e.name) === mineEv; return `<li class="${mine ? 'mine' : ''}"><span class="ax-cal-d">${live ? '<i class="ax-live">LIVE</i>' : `<b>${new Date(e.startMs).getDate()}</b><small>${esc(new Date(e.startMs).toLocaleDateString('ru-RU', { month: 'short' }).replace('.', ''))}</small>`}</span><span class="ax-cal-ic">${IC[KI[e.kind]] || IC.trophy}</span><span class="ax-cal-n"><b>${esc(e.name)}</b><small>${esc(tierL(e))}</small></span>${mine ? `<span class="ax-cal-me">${logoImg(name, 20)}</span>` : ''}</li>`; }).join('')}</ul>`
        : `<div class="ax-empty">${IC.coffee}<b>Свободные дни</b><span>Время для тренировок.</span></div>`}</section>`;

    return `<div class="ax-dash">${hero}${next}${overview}${results}${news}${tasks}${calendar}</div>`;
  }
  const TIER_L = { qual: 'Квалификация', tier1: 'Tier-1', '1': 'Tier-1', tier2: 'Tier-2', '2': 'Tier-2', tier3: 'Tier-3', '3': 'Tier-3', major: 'Major', elite: 'S-Tier', academy: 'Академии', awards: 'Награды', top20: 'Топ-20' };
  const tierL = e => TIER_L[e.kind] || TIER_L[e.tier] || (e.format ? String(e.format) : '');

  /* ================================================================ СОСТАВ: карточки игроков (UX №8) */
  const bar = (v, cls, label, txt, tip) => `<div class="ax-bar ${cls || ''}"${tip ? ` title="${esc(tip)}"` : ''}><span>${label}</span><i><u style="--p:${clamp(v, 0, 100)}%"></u></i><b>${txt}</b></div>`;
  function squadCards(root) {
    const name = me(), t = team(name); if (!t || root.querySelector('.ax-squad')) return;
    const ps = starters(t); if (!ps.length) return;
    const c = tint(name), s = season();
    const cards = ps.map((p, i) => {
      const u = photo(p), lv = pow(p), form = +p.form || 100, mor = +p.morale || 85, fat = +p.fatigue || 0, cu = +p.contractUntil || 0;
      const fl = form >= 106 ? 'отличная' : form >= 99 ? 'хорошая' : form >= 92 ? 'средняя' : 'низкая';
      const ft = fat < 20 ? 'низкая' : fat < 35 ? 'средняя' : fat < 55 ? 'высокая' : 'критическая';
      return `<button type="button" class="ax-pc" data-player="${esc(p.nick)}" style="--tc:${rgb(c, .2)};--i:${i}">
        <span class="ax-pc-top"><span class="ax-pc-flag">${flagOf(p)}</span><span class="ax-pc-role">${esc(p.role || '')}</span></span>
        ${u ? `<img src="${esc(u)}" alt="" loading="lazy" decoding="async">` : `<span class="ax-pc-ph">${IC.players}</span>`}
        <span class="ax-pc-id"><b>${esc(p.nick)}</b><small>${p.age ? p.age + ' ' + plural(p.age, 'год', 'года', 'лет') : ''}</small><em class="${lv >= 90 ? 'hi' : lv >= 80 ? 'mid' : ''}">${Math.round(lv)}</em></span>
        <span class="ax-pc-bars">
          ${bar((form - 70) / 50 * 100, form >= 99 ? 'g' : form >= 92 ? 'y' : 'r', 'Форма', Math.round(form), 'Форма: ' + fl)}
          ${bar(mor, mor >= 75 ? 'g' : mor >= 55 ? 'y' : 'r', 'Мораль', Math.round(mor))}
          ${bar(fat / 85 * 100, fat < 20 ? 'g' : fat < 35 ? 'y' : 'r', 'Усталость', ft, 'Усталость: ' + Math.round(fat) + ' из 85. Выше 35 — игрок хуже играет и чаще травмируется')}
        </span>
        <span class="ax-pc-k${cu && cu <= s ? ' dn' : ''}" title="Контракт действует до конца сезона ${cu || '—'}">${IC.clock}Контракт до ${cu ? yearOf(cu) : '—'}${cu && cu <= s ? ' · истекает' : ''}</span></button>`;
    }).join('');
    const avgAge = ps.reduce((a, p) => a + (+p.age || 0), 0) / ps.length;
    const wage = (t.players || []).reduce((a, p) => a + (+p.salary || 0), 0);
    const avgLv = ps.reduce((a, p) => a + pow(p), 0) / ps.length;
    const html = `<div class="ax-squad"><div class="ax-squad-cards">${cards}</div>
      <aside class="ax-card ax-squad-sum"><header class="ax-h"><h3>Команда</h3></header>
        <div class="ax-ss"><small>Сила состава</small><b>${avgLv.toFixed(1)}</b><em>#${rankOf(name)} в мире</em></div>
        <div class="ax-ss2"><div><small>Средний возраст</small><b>${avgAge.toFixed(1)}</b></div><div><small>Зарплаты</small><b>${esc(short(wage))}</b></div></div>
        <div class="ax-ss-act"><button type="button" class="ax-btn ghost" data-nav="training">${IC.training}Тренировки</button><button type="button" class="ax-btn ghost" data-nav="negotiate">${IC.transfer}Рынок</button></div></aside></div>`;
    const tabs = root.querySelector('.v99-tabs'), head = root.querySelector('.hs-head');
    const anchor = head || tabs;
    if (anchor) anchor.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('afterbegin', html);
  }

  /* ================================================================ РЫНОК: фильтры (UX №9) */
  const MF = { mode: 'all', role: '', age: '', sort: '' };
  function marketFilters(root) {
    const boxes = [...root.querySelectorAll('.hs-box')];
    const box = boxes.find(b => /Рынок/.test((b.querySelector('.hs-box-h h3, .hs-box-h') || {}).textContent || '') && b.querySelector('tbody tr'));
    if (!box) return;
    const tb = box.querySelector('tbody'); if (!tb) return;
    const heads = [...box.querySelectorAll('thead th')].map(th => th.textContent.trim().toLowerCase());
    const col = re => heads.findIndex(h => re.test(h));
    const ci = { team: col(/команда|клуб/), age: col(/возраст/), price: col(/выкуп|цена|стоим/) };
    const rows = [...tb.querySelectorAll('tr')];
    const budget = (() => { try { return +V.org(me()).budget || 0; } catch (e) { return 0; } })();
    const roles = new Set();
    const data = rows.map(tr => {
      const td = tr.children, first = td[0] ? td[0].textContent : '';
      const role = ((td[0] && (td[0].querySelector('small,em,.role,span:last-child') || {}).textContent) || '').trim();
      const R = /AWP/i.test(first) ? 'AWPer' : /IGL/i.test(first) ? 'IGL' : /Entry/i.test(first) ? 'Entry' : /Support/i.test(first) ? 'Support' : /Lurk/i.test(first) ? 'Lurker' : /Rifl/i.test(first) ? 'Rifler' : role;
      if (R) roles.add(R);
      const teamTxt = ci.team >= 0 && td[ci.team] ? td[ci.team].textContent.trim() : '';
      const age = ci.age >= 0 && td[ci.age] ? parseInt(td[ci.age].textContent, 10) || 0 : 0;
      const price = ci.price >= 0 && td[ci.price] ? +td[ci.price].textContent.replace(/[^\d]/g, '') || 0 : 0;
      return { tr, role: R, free: !teamTxt || /свобод|free|—/i.test(teamTxt), age, price };
    });
    function apply() {
      let shown = 0;
      const arr = data.slice();
      if (MF.sort === 'price') arr.sort((a, b) => a.price - b.price); else if (MF.sort === 'age') arr.sort((a, b) => a.age - b.age);
      if (MF.sort) arr.forEach(d => tb.appendChild(d.tr));
      arr.forEach(d => {
        let ok = true;
        if (MF.mode === 'afford') ok = d.price <= budget;
        if (MF.mode === 'free') ok = d.free;
        if (ok && MF.role) ok = d.role === MF.role;
        if (ok && MF.age === 'y') ok = d.age && d.age <= 21; else if (ok && MF.age === 'm') ok = d.age >= 22 && d.age <= 27; else if (ok && MF.age === 'o') ok = d.age >= 28;
        d.tr.hidden = !ok; if (ok) shown++;
      });
      const cnt = box.querySelector('.ax-mf-n'); if (cnt) cnt.textContent = `${shown} из ${data.length}`;
      const em = box.querySelector('.ax-mf-empty'); if (em) em.hidden = shown > 0;
    }
    if (!box.querySelector('.ax-mf')) {
      const chip = (k, v, l) => `<button type="button" class="ax-chip${MF[k] === v ? ' on' : ''}" data-mf="${k}" data-v="${v}">${l}</button>`;
      const sel = (k, opts) => `<select class="ax-sel" data-mfs="${k}">${opts.map(([v, l]) => `<option value="${v}"${MF[k] === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
      const bar2 = D.createElement('div'); bar2.className = 'ax-mf';
      bar2.innerHTML = `<div class="ax-mf-g">${chip('mode', 'all', 'Все')}${chip('mode', 'afford', `По карману · ${esc(short(budget))}`)}${chip('mode', 'free', 'Свободные агенты')}</div>
        <div class="ax-mf-g">${sel('role', [['', 'Любая роль']].concat([...roles].sort().map(r => [r, r])))}${sel('age', [['', 'Любой возраст'], ['y', 'до 21'], ['m', '22–27'], ['o', '28+']])}${sel('sort', [['', 'По уровню'], ['price', 'Сначала дешёвые'], ['age', 'Сначала молодые']])}<span class="ax-mf-n"></span></div>`;
      const h = box.querySelector('.hs-box-h'); (h || box).insertAdjacentElement(h ? 'afterend' : 'afterbegin', bar2);
      const em = D.createElement('div'); em.className = 'ax-empty ax-mf-empty'; em.hidden = true; em.innerHTML = `${IC.transfer}<b>Никого не нашли</b><span>Смягчите фильтры.</span>`; tb.closest('table').insertAdjacentElement('afterend', em);
      bar2.addEventListener('click', e => { const b = e.target.closest('[data-mf]'); if (!b) return; MF[b.dataset.mf] = b.dataset.v; bar2.querySelectorAll(`[data-mf="${b.dataset.mf}"]`).forEach(x => x.classList.toggle('on', x === b)); apply(); });
      bar2.addEventListener('change', e => { const s = e.target.closest('[data-mfs]'); if (!s) return; MF[s.dataset.mfs] = s.value; apply(); });
    }
    apply();
  }

  /* ================================================================ СЦЕНЫ: свои фоны для новостей и карточек (tools/media/gen_scenes.py) */
  const SC = k => { try { return new URL(`assets/ui/scenes/${k}.webp`, D.baseURI).href; } catch (e) { return `assets/ui/scenes/${k}.webp`; } };   // абсолютный адрес: url() в CSS-переменной иначе считается от папки css/
  const ARENAS = ['arena-orange', 'arena-blue', 'arena-crimson'];
  const CAT_SCENE = { transfer: 'office', rumor: 'office', roster: 'bootcamp', academy: 'bootcamp', interview: 'press', player: 'press', award: 'trophy-gold', legacy: 'trophy-gold', major: 'trophy-gold',
    stats: 'stats', analytics: 'stats', ranking: 'stats', season: 'crowd', 'pickem-pub': 'studio', preview: 'studio', tier2: 'arena-blue', tier3: 'arena-blue' };
  const hashStr = x => { let h = 0; for (const ch of String(x || '')) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const sceneFor = n => (n && CAT_SCENE[n.cat]) || ARENAS[hashStr(n && (n.id || n.title)) % ARENAS.length];
  const sceneByTint = c => { const [r, g, b] = c; return b > r + 20 ? 'arena-blue' : r > 200 && g < 90 ? 'arena-crimson' : 'arena-orange'; };
  // кто в новости: игрок (портрет), команда (логотип) — по тегам, полю team и упоминаниям в заголовке
  let nickIdx = null, nickAt = 0;
  function nickMap() {
    if (nickIdx && Date.now() - nickAt < 60000) return nickIdx;
    nickIdx = new Map(); nickAt = Date.now();
    TEAMS().forEach(t => (t.players || []).forEach(p => { if (p && p.nick && String(p.nick).length >= 3) nickIdx.set(String(p.nick).toLowerCase(), { p, t }); }));
    return nickIdx;
  }
  function newsWho(n) {
    if (!n) return {};
    const tags = n.tags || [];
    let pl = null, tm = n.team || (tags.find(x => x.t === 'team') || {}).v || '';
    // v113: игрок из заголовка важнее первого тега (у «HLTV Awards» в тегах вся тройка — на превью был не №1)
    const pts = tags.filter(x => x.t === 'player'), pt = pts.find(x => String(n.title || '').includes(x.v)) || (n.player && pts.find(x => x.v === n.player)) || pts[0]; if (pt) pl = findPlayer(pt.v);
    if (!pl) { const words = String((n.title || '') + ' ' + (n.lead || '')).split(/[\s«»"',.:;!?()—–-]+/); const m = nickMap(); for (const w of words) { const f = m.get(w.toLowerCase()); if (f) { pl = f; break; } } }
    if (!tm) { const tt = TEAMS().find(t => t && t.name && t.name.length > 2 && String(n.title || '').includes(t.name)); if (tt) tm = tt.name; }
    if (pl && !tm && pl.t) tm = pl.t.name;
    return { pl, tm };
  }
  function newsVisual(n) {
    const { pl, tm } = newsWho(n), u = pl ? photo(pl.p) : null, c = tm ? tint(tm) : [255, 122, 26];
    const scene = tm ? sceneByTint(c) : sceneFor(n);
    if (u) return { scene, html: `<span class="ax-nvis pl" style="--tc:${rgb(c, .55)}"><img src="${esc(u)}" alt="" loading="lazy" decoding="async">${tm && media('team', tm) ? logoImg(tm, 22, 'ax-nvis-l') : ''}</span>` };
    if (tm && media('team', tm)) return { scene, html: `<span class="ax-nvis tm" style="--tc:${rgb(c, .5)}">${logoImg(tm, 48)}</span>` };
    return { scene: sceneFor(n), html: '' };
  }
  function decorScenes(root) {
    root.querySelectorAll('[data-art]').forEach(el => {
      const box = el.querySelector('.v37-story-media, .nl-img, .hs-news-img, .hs-top-img, [class*="story-img"]'); if (!box || box.dataset.axs) return;
      let n = null; try { n = H.findNews(el.dataset.art); } catch (e) {}
      const v = newsVisual(n || { id: el.dataset.art });
      box.dataset.axs = 1; box.classList.add('ax-scened'); box.style.setProperty('--scene', `url("${SC(v.scene)}")`);
      if (v.html) { box.classList.add('ax-has-vis'); box.insertAdjacentHTML('beforeend', v.html); }
    });
  }

  // выбор клуба: «Возглавить клуб» дублируется в шапке карточки — видна без прокрутки на любом экране
  function takeButton(root) {
    const d = root.querySelector('#v96-detail'); if (!d) return;
    const go = d.querySelector('.v96-cta [data-v96go]'), hero = d.querySelector('.v96-hero'); if (!go || !hero) return;
    const label = go.textContent.trim() || 'Возглавить клуб';   // v101: при смене клуба — «Перейти в клуб», как на основной кнопке
    const ex = hero.querySelector('.ax-take'); if (ex && ex.dataset.team === go.dataset.v96go && ex.textContent.trim() === label) return; if (ex) ex.remove();
    hero.insertAdjacentHTML('beforeend', `<div class="ax-take" data-team="${esc(go.dataset.v96go)}"><button type="button" class="v96-go" data-v96go="${esc(go.dataset.v96go)}">${esc(label)}</button></div>`);
  }
  let takeObs = null;
  function watchTake() { const r = $('hs-page'); if (!r || takeObs) return; takeObs = new MutationObserver(() => { if (pageNow() === 'pick' || r.querySelector('#v96-detail')) takeButton(r); }); takeObs.observe(r, { childList: true, subtree: true }); }
  /* ================================================================ ПЛИТКИ ВЫБОРА: иконка в плашке + силуэт на фоне */
  const BARS = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${[[4, 14, 6], [10, 10, 10], [16, 5, 15]].map(([x, y, h], i) => `<rect x="${x}" y="${y}" width="4.2" height="${h}" rx="1.4" fill="currentColor" opacity="${i < n ? 1 : .28}"/>`).join('')}</svg>`;
  const TILE_IC = {
    'v96ti:low': BARS(1), 'v96ti:normal': BARS(2), 'v96ti:high': BARS(3),
    'v99smode:show': IC.tactics, 'v99smode:hide': svg('<path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z"/><path d="M9.5 12.5h5"/>'), 'v99smode:intel': IC.eye
  };
  function decorTiles(scope) {
    (scope || D).querySelectorAll('.v96-tf:not(.ax-tile), .v96-ti:not(.ax-tile), .v99-tf:not(.ax-tile)').forEach(b => {
      let ic = '', wm = '';
      if (b.dataset.v96tf) { ic = '<i></i>'; wm = '<i></i>'; }
      else { const k = b.dataset.v96ti ? 'v96ti:' + b.dataset.v96ti : b.dataset.v99smode ? 'v99smode:' + b.dataset.v99smode : ''; ic = TILE_IC[k] || IC.training; wm = ic; }
      b.classList.add('ax-tile');
      b.insertAdjacentHTML('afterbegin', `<span class="ax-tic" aria-hidden="true">${ic}</span><span class="ax-twm" aria-hidden="true">${wm}</span>`);
    });
  }

  /* ================================================================ KPI-плитки: иконка и цвет по смыслу */
  const KPI_RULES = [
    [/^уровень/i, 'crown', 'violet'], [/очки|балл/i, 'events', 'gold'], [/точност|угадан/i, 'predict', 'green'], [/серия|подряд/i, 'flag', 'orange'],
    [/рейтинг|место|vrs/i, 'ranking', 'gold'], [/бюджет|баланс|деньг|спонсор|доход/i, 'wallet', 'green'], [/зарплат|расход|объект/i, 'finance', 'red'],
    [/репутац|престиж|популяр|фанат/i, 'crown', 'violet'], [/сыгран|форма/i, 'squad', 'orange'], [/уверен|мораль|довер/i, 'check', 'blue'],
    [/турнир|кубок|титул/i, 'trophy', 'gold'], [/возраст/i, 'clock', 'blue'], [/сила|уровень/i, 'chart', 'orange']
  ];
  function decorKpis(root) {
    root.querySelectorAll('.pt-kpis > div:not(.ax-kpi)').forEach(d => {
      const l = (d.querySelector('small') || {}).textContent || ''; const r = KPI_RULES.find(x => x[0].test(l)) || [0, 'chart', 'orange'];
      d.classList.add('ax-kpi', 'tone-' + r[2]); d.insertAdjacentHTML('afterbegin', `<span class="ax-kpi-ic" aria-hidden="true">${IC[r[1]]}</span><span class="ax-kpi-wm" aria-hidden="true">${IC[r[1]]}</span>`);
    });
  }
  // короткие списки «название — значение» (dl) → плитки
  function decorKv(root) {
    root.querySelectorAll('dl.v99-kv:not(.ax-done)').forEach(dl => {
      const dts = [...dl.querySelectorAll('dt')]; if (dts.length < 2 || dts.length > 6) return;
      dl.classList.add('ax-done');
      const tiles = dts.map(dt => { const dd = dt.nextElementSibling, l = dt.textContent.trim(), r = KPI_RULES.find(x => x[0].test(l)) || [0, 'chart', 'orange'];
        return `<div class="ax-kpi tone-${r[2]}"><span class="ax-kpi-ic" aria-hidden="true">${IC[r[1]]}</span><span class="ax-kpi-wm" aria-hidden="true">${IC[r[1]]}</span><small>${esc(l)}</small><b>${dd ? dd.innerHTML : ''}</b></div>`; }).join('');
      dl.insertAdjacentHTML('beforebegin', `<div class="ax-kvt">${tiles}</div>`); dl.hidden = true;
    });
  }
  // полосы-шкалы: цвет по значению (зелёный — хорошо, жёлтый — средне, красный — плохо)
  function colorBars(root) {
    root.querySelectorAll('.cr-bar > i, .v97-track > i').forEach(i => {
      const w = parseFloat(i.style.width); if (!isFinite(w)) return;
      i.classList.remove('lv-hi', 'lv-mid', 'lv-lo'); i.classList.add(w >= 75 ? 'lv-hi' : w >= 45 ? 'lv-mid' : 'lv-lo');
    });
  }
  // шкалы штаба — мини-плитки с иконкой (как плитки тренировок)
  const METER_IC = [[/трениров/i, 'training'], [/тактик/i, 'tactics'], [/молод/i, 'squad'], [/люд|морал/i, 'players'], [/развед|анали/i, 'eye'], [/восстан|нагруз/i, 'clock'], [/медиа|пресс/i, 'mic']];
  function decorMeters(root) {
    root.querySelectorAll('.v97-meter:not(.ax-meter)').forEach(m => {
      const l = (m.querySelector('span') || {}).textContent || '', ic = (METER_IC.find(x => x[0].test(l)) || [0, 'chart'])[1];
      const w = parseFloat((m.querySelector('.v97-track > i') || { style: {} }).style.width) || 0;
      m.classList.add('ax-meter', w >= 75 ? 'tone-green' : w >= 45 ? 'tone-gold' : 'tone-red');
      m.insertAdjacentHTML('afterbegin', `<span class="ax-kpi-ic ax-mic" aria-hidden="true">${IC[ic]}</span>`);
    });
  }
  // герой «Портала»: компактнее + полоса фаворитов
  function homeHero(root) {
    const hero = root.querySelector('.v37-premium-hero'); if (!hero || hero.querySelector('.ax-hstrip')) return;
    const h1 = hero.querySelector('h1'), name = h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : '';
    const st = ST(), ev = st && (st.seasonSchedule || []).find(e => e && e.name === name);
    let list = ev ? ((ev.v35Roster && ev.v35Roster.participants) || ev.v45Participants || ev.v35Invites || []) : [];
    if (!list.length) list = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)).slice(0, 8).map(t => t.name);
    list = list.slice().sort((a, b) => (rankOf(a) || 999) - (rankOf(b) || 999)).slice(0, 8);
    const start = ev && ev.calendar && ev.calendar.startMs, days = start ? Math.ceil((start - now()) / DAY) : null;
    const prize = ev && (ev.prizePool || ev.prize);
    const chips = [days != null && days > 0 ? `<span class="ax-hchip">${IC.clock}<b>${days}</b> ${plural(days, 'день', 'дня', 'дней')}</span>` : '', prize ? `<span class="ax-hchip gold">${IC.trophy}<b>${esc(short(+prize))}</b> призовые</span>` : '', `<span class="ax-hchip">${IC.teams}<b>${(ev && ev.size) || list.length}</b> команд</span>`].join('');
    const html = `<div class="ax-hstrip"><div class="ax-hchips">${chips}</div>${list.length ? `<div class="ax-fav"><small>Фавориты</small><div class="ax-stack">${list.map((n, i) => `<button type="button" class="ax-stack-it" data-team="${esc(n)}" title="${esc(n)} · #${rankOf(n) || '—'}" style="--i:${i}">${logoImg(n, 30)}</button>`).join('')}</div></div>` : ''}</div>`;
    const copy = hero.querySelector('.v37-hero-copy'); (copy || hero).insertAdjacentHTML('beforeend', html);
    hero.classList.add('ax-hero-compact');
  }

  /* ================================================================ ФИНАНСЫ и текстовые правки (UX №10, №11) */
  function financeFix(root) {
    root.querySelectorAll('.pt-kpis > div, .hs-kpis > div').forEach(d => {
      const sm = d.querySelector('small'); if (!sm) return;
      if (/Без призовых за сезон/.test(sm.textContent)) d.remove();
    });
    root.querySelectorAll('td, th').forEach(td => {
      if (td.children.length) { const b = td.querySelector('b'); if (b && /^Итог сезона$/.test(b.textContent.trim())) b.textContent = 'Итог сезона · прогноз'; return; }
      const tx = td.textContent.trim();
      if (tx === 'Итог сезона') td.textContent = 'Итог сезона · прогноз';
    });
    root.querySelectorAll('thead th').forEach(th => { if (th.textContent.trim() === 'Итог' && !th.dataset.ax) { th.dataset.ax = 1; th.title = 'Фактический итог сыгранной части сезона'; } });
  }
  // «До сезона 3» → «2028 · сезон 3» во всех таблицах контрактов
  function contractYears(root) {
    root.querySelectorAll('table').forEach(tbl => {
      const ths = [...tbl.querySelectorAll('thead th')]; const i = ths.findIndex(th => /до сезона|контракт до/i.test(th.textContent)); if (i < 0) return;
      ths[i].textContent = 'Контракт до';
      tbl.querySelectorAll('tbody tr').forEach(tr => { const td = tr.children[i]; if (!td || td.dataset.ax) return; const n = parseInt(td.textContent, 10); if (n > 0 && n < 50) { td.dataset.ax = 1; td.innerHTML = `${yearOf(n)} <small class="ax-mute">сезон ${n}</small>`; } });
    });
  }
  function boardFix(root) {
    root.querySelectorAll('.v95-kv > div, .hs-kv > div, tr').forEach(r => {
      if (r.dataset.axb || !/Контракт с руководством/.test(r.textContent) || !/не подписан/.test(r.textContent)) return;
      r.dataset.axb = 1; const b = r.querySelector('b, td:last-child'); if (b) b.insertAdjacentHTML('beforeend', ` <button type="button" class="ax-link" data-nav="control">подписать →</button>`);
    });
  }

  /* ================================================================ УВЕДОМЛЕНИЯ (UX №20) */
  function bindToasts() {
    const host = $('v29-toasts'); if (!host || host.dataset.ax) return;
    host.dataset.ax = 1;
    const arm = el => {
      if (el.dataset.ax) return; el.dataset.ax = 1;
      let left = 6000, t0 = Date.now(), tm = null;
      const go = () => { el.classList.add('ax-out'); setTimeout(() => { const x = el.querySelector('.v29-toast-x'); if (x && el.isConnected) x.click(); if (el.isConnected) el.remove(); }, 260); };
      const start = () => { t0 = Date.now(); tm = setTimeout(go, left); };
      el.addEventListener('mouseenter', () => { clearTimeout(tm); left -= Date.now() - t0; });
      el.addEventListener('mouseleave', () => { left = Math.max(1500, left); start(); });
      el.style.setProperty('--life', left + 'ms');
      start();
      if (host.dataset.axReady) SND.play('notify');
    };
    host.querySelectorAll('.v29-toast').forEach(arm); setTimeout(() => { host.dataset.axReady = 1; }, 4000);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('v29-toast')) arm(n); }))).observe(host, { childList: true });
  }

  /* ================================================================ ПЕРВЫЙ ЗАПУСК: режим (UX №1) */
  function modeOverlay() {
    if ($('ax-mode') || me() || store.get('cs2.ax.mode', '') || navigator.webdriver) return;   // v101: автотесты (webdriver) — без окна первого запуска, оно перекрывало клики
    const box = D.createElement('div'); box.id = 'ax-mode';
    const club = 'Team Spirit', c = tint(club);
    box.innerHTML = `<div class="ax-mode-card" role="dialog" aria-modal="true" aria-labelledby="ax-mode-h">
      <h2 id="ax-mode-h">Как будете играть?</h2>
      <div class="ax-mode-opts">
        <button type="button" data-mode="manager" style="--tc:${rgb(c, .5)}"><span class="ax-mode-art">${logoImg(club, 96)}</span><b>Возглавить клуб</b><small>Состав, трансферы, тактика и бюджет. Цели от руководства.</small><i>Рекомендуется</i></button>
        <button type="button" data-mode="watch"><span class="ax-mode-art" style="background-image:url('${SC('studio')}')">${IC.watch}</span><b>Смотреть сцену</b><small>Эфиры матчей, прогнозы и репутация аналитика.</small></button>
      </div><p class="ax-mode-note">Режим можно сменить в любой момент в меню.</p></div>`;
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-mode]'); if (!b) return;
      store.set('cs2.ax.mode', b.dataset.mode); box.classList.add('ax-out');
      setTimeout(() => box.remove(), 220);
      try { H.nav(b.dataset.mode === 'manager' ? 'pick' : 'watch'); } catch (err) {}
    });
    D.body.appendChild(box);
  }
  D.addEventListener('click', e => { if (e.target.closest('#v84-legacy-modal [data-lg="history"], #v84-legacy-modal [data-lg="zero"]')) setTimeout(modeOverlay, 450); }, true);
  setTimeout(() => { if (!$('v84-legacy-modal')) { const st = ST(); if (st && !st.v84LegacyChoice) return; } }, 5000);

  /* ================================================================ ДВИЖЕНИЕ */
  function countUp(root) {
    if (RM) return;
    root.querySelectorAll('[data-ax-count]').forEach(el => {
      const to = +el.dataset.axCount, fmt = el.dataset.axFmt; if (!isFinite(to)) return;
      const t0 = performance.now(), dur = 900;
      const f = tm => { const k = Math.min(1, (tm - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = to * e; el.textContent = fmt === 'money' ? short(v) : fmt === 'k' ? fmtK(v) : Math.round(v); if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
  }
  // «прожектор» под курсором на карточках
  D.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.ax-card, .hs-box, .ax-pc'); if (!c) return;
    const r = c.getBoundingClientRect(), k = c.offsetWidth ? r.width / c.offsetWidth : 1; c.style.setProperty('--mx', ((e.clientX - r.left) / k).toFixed(1) + 'px'); c.style.setProperty('--my', ((e.clientY - r.top) / k).toFixed(1) + 'px');
  }, { passive: true });

  /* ================================================================ ДИАГРАММЫ: кольца и «пончики» (SVG) */
  const PAL = ['#ff8a2a', '#c9a24a', '#6f93c2', '#8e80b8', '#5fa883', '#c56a73', '#4fb3b0'];
  function donut(segs, { size = 150, th = 16, center = '', sub = '' } = {}) {
    const tot = segs.reduce((a, x) => a + Math.max(0, x.v), 0) || 1, r = (size - th) / 2, C = 2 * Math.PI * r, gap = segs.length > 1 ? 3 : 0;
    let off = 0;
    const arcs = segs.map((x, i) => { const len = Math.max(0, x.v) / tot * C, dash = Math.max(0, len - gap);
      const el = `<circle class="ax-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${x.c || PAL[i % PAL.length]}" stroke-width="${th}" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-off}" style="--len:${dash};--i:${i}"><title>${esc(x.l)}: ${esc(x.t || String(x.v))}</title></circle>`; off += len; return el; }).join('');
    return `<div class="ax-donut" style="--s:${size}px"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="${th}"/><g transform="rotate(-90 ${size / 2} ${size / 2})">${arcs}</g></svg><div class="ax-donut-c"><b>${center}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
  }
  const legend = segs => `<ul class="ax-legend">${segs.map((x, i) => `<li><i style="background:${x.c || PAL[i % PAL.length]}"></i><span>${esc(x.l)}</span><b>${esc(x.t || String(x.v))}</b></li>`).join('')}</ul>`;
  const ring = (pct, label, c, sub) => `<div class="ax-ring">${donut([{ v: clamp(pct, 0, 100), c: c || '#ff8a2a', l: label, t: Math.round(pct) + '%' }, { v: 100 - clamp(pct, 0, 100), c: 'transparent', l: '' }], { size: 72, th: 7, center: Math.round(pct) + (sub === '' ? '' : '%') })}<span>${esc(label)}</span></div>`;
  const lvC = v => v >= 75 ? '#5fa883' : v >= 45 ? '#c9a24a' : '#c56a73';

  function chartsFinance(root) {
    if (root.querySelector('.ax-fin-charts')) return;
    const t = team(me()); if (!t) return; let fc = null; try { fc = W.CS2Finance.forecast(t); } catch (e) {} if (!fc) return;
    const L = fc.lines || {};
    const inc = [['Спонсор', L.spon], ['Медиа', L.media], ['Призовые', L.prize], ['Стикеры', L.stickers]].filter(x => x[1] > 0).map(([l, v], i) => ({ l, v, t: short(v), c: ['#5fa883', '#4fb3b0', '#c9a24a', '#8e80b8'][i] }));
    const exp = [['Зарплаты', L.wages], ['Объекты', L.upkeep], ['Штаб', L.staff], ['Академия', L.academy]].filter(x => x[1] > 0).map(([l, v], i) => ({ l, v, t: short(v), c: ['#c56a73', '#d98a4a', '#8e80b8', '#6f93c2'][i] }));
    const html = `<section class="ax-card ax-fin-charts"><header class="ax-h"><h3><span class="ax-h-ic">${IC.finance}</span>Структура сезона</h3><span class="ax-h-meta">прогноз</span></header>
      <div class="ax-fin-g"><div class="ax-fin-d">${donut(inc, { size: 124, th: 13, center: short(fc.season.inc), sub: 'доходы' })}${legend(inc)}</div><div class="ax-fin-d">${donut(exp, { size: 124, th: 13, center: short(fc.season.exp), sub: 'расходы' })}${legend(exp)}</div></div>
      <div class="ax-fin-net ${fc.season.net >= 0 ? 'up' : 'dn'}"><span>Итог сезона</span><b>${fc.season.net >= 0 ? '+' : ''}${esc(short(fc.season.net))}</b></div></section>`;
    const partner = [...root.querySelectorAll('.hs-box')].find(b => /Генеральный партн/i.test(b.textContent));
    if (partner) partner.insertAdjacentHTML('afterend', html); else { const g = root.querySelector('.hs-grid2 .hs-col:last-child'); if (g) g.insertAdjacentHTML('beforeend', html); }
  }
  // «Прогноз сезона»: траектория бюджета — заполняет колонку до высоты соседней
  function budgetPath(root) {
    const box = [...root.querySelectorAll('.hs-box')].find(b => /Прогноз сезона/.test((b.querySelector('.hs-box-h') || {}).textContent || '')); if (!box || box.querySelector('.ax-bpath')) return;
    const t = team(me()); let fc = null; try { fc = W.CS2Finance.forecast(t); } catch (e) {} if (!fc) return;
    const pts = [['Сейчас', fc.budget], ['Конец сезона', fc.end], ['Через сезон', fc.next]], vs = pts.map(x => x[1]), mx = Math.max(...vs), mn = Math.min(...vs), rg = mx - mn || 1;
    const bars = pts.map(([l, v], i) => { const h = 38 + (v - mn) / rg * 62, d = i ? v - pts[i - 1][1] : 0;
      return `<div class="ax-bp-c"><span class="ax-bp-v">${esc(short(v))}${i ? `<em class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${esc(short(Math.abs(d)))}</em>` : ''}</span><i class="${v < 0 ? 'neg' : ''}" style="--h:${h}%;--i:${i}"></i><small>${l}</small></div>`; }).join('');
    const b = box.querySelector('.hs-box-b') || box;
    b.insertAdjacentHTML('beforeend', `<div class="ax-bpath"><div class="ax-bp-h"><span>${IC.chart}Траектория бюджета</span><b class="${fc.next >= fc.budget ? 'up' : 'dn'}">${fc.next >= fc.budget ? 'растёт' : 'снижается'}</b></div><div class="ax-bp-g">${bars}</div></div>`);
    box.classList.add('ax-fill');
  }
  function chartsBoard(root) {
    const box = [...root.querySelectorAll('.hs-box')].find(b => /Контракт с руководством/.test((b.querySelector('.hs-box-h') || {}).textContent || '')); if (!box || box.querySelector('.ax-board')) return;
    const rows = [...box.querySelectorAll('tr')].map(tr => { const w = parseFloat(((tr.querySelector('.cr-bar > i') || {}).style || {}).width); const m = /(.+?)\s+(\d+)%/.exec(((tr.children[0] || {}).textContent || '').trim()); return m && isFinite(w) ? { l: m[1].trim(), v: +m[2], s: w } : null; }).filter(Boolean);
    if (rows.length < 2) return;
    const conf = +((/доверие\s+(\d+)%/i.exec(box.textContent) || [])[1] || 0);
    const segs = rows.map(r => ({ l: r.l, v: r.v, t: `вес ${r.v}% · ${Math.round(r.s)}%`, c: lvC(r.s) }));
    const tbl = box.querySelector('table'); if (!tbl) return;
    const wrap = D.createElement('div'); wrap.className = 'ax-board';
    wrap.innerHTML = `<div class="ax-board-d">${donut(segs, { size: 170, th: 18, center: conf ? conf + '%' : '—', sub: 'доверие' })}<small>Доли — вес цели, цвет — насколько выполнена</small></div>`;
    tbl.parentNode.insertBefore(wrap, tbl); wrap.appendChild(tbl);
  }
  function chartsSquad(root) {
    const sum = root.querySelector('.ax-squad-sum'); if (!sum || sum.querySelector('.ax-rings')) return;
    const ps = starters(team(me())); if (!ps.length) return;
    const av = f => ps.reduce((a, p) => a + f(p), 0) / ps.length;
    const form = clamp((av(p => +p.form || 100) - 70) / 50 * 100, 0, 100), mor = av(p => +p.morale || 85), fat = av(p => +p.fatigue || 0) / 85 * 100;
    sum.querySelector('.ax-ss2').insertAdjacentHTML('afterend', `<div class="ax-rings">${ring(form, 'Форма', lvC(form))}${ring(mor, 'Мораль', lvC(mor))}${ring(100 - fat, 'Свежесть', lvC(100 - fat))}</div>`);
  }
  function chartsSpectator(root) {
    const box = [...root.querySelectorAll('.hs-box')].find(b => /Репутация аналитика/.test(b.textContent)); if (!box || box.querySelector('.ax-rings')) return;
    let S0 = {}; try { S0 = W.V99Spec.S(); } catch (e) {}
    const acc = S0.n ? (S0.ok || 0) / S0.n * 100 : 0, kv = box.querySelector('.ax-kvt'); if (!kv) return;
    kv.insertAdjacentHTML('beforebegin', `<div class="ax-rings wide">${ring(acc, 'Точность прогнозов', lvC(acc))}${ring(clamp((S0.pts || 0) / 60 * 100, 0, 100), 'До следующего уровня', '#ff8a2a')}${ring(clamp((S0.streak || 0) * 10, 0, 100), 'Серия', '#8e80b8', '')}</div>`);
  }

  /* ================================================================ ЗВУКИ: короткие тактильные, синтез WebAudio (без файлов) */
  const SND = (() => {
    let ctx = null, out = null, noiseBuf = null;
    let on = store.get('cs2.ax.snd', true), vol = store.get('cs2.ax.vol', 0.55);
    const init = () => {
      if (ctx) return ctx;
      const AC = W.AudioContext || W.webkitAudioContext; if (!AC) return null;
      ctx = new AC(); out = ctx.createGain(); out.gain.value = vol;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      out.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return ctx;
    };
    const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
    function tone(f, { type = 'sine', t = 0, a = 0.004, peak = 0.25, dec = 0.12, to = null } = {}) {
      const c = ctx, t0 = c.currentTime + t, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + a + dec);
      env(g, t0, a, peak, dec); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + a + dec + 0.05);
    }
    function noise({ t = 0, a = 0.002, peak = 0.2, dec = 0.03, type = 'bandpass', f = 3000, q = 1.2, to = null } = {}) {
      const c = ctx, t0 = c.currentTime + t, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
      s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q; if (to) fl.frequency.exponentialRampToValueAtTime(to, t0 + a + dec);
      env(g, t0, a, peak, dec); s.connect(fl); fl.connect(g); g.connect(out); s.start(t0); s.stop(t0 + a + dec + 0.05);
    }
    const FX = {
      tick: () => { noise({ f: 3800, q: 2, peak: 0.12, dec: 0.018 }); tone(1900, { peak: 0.05, dec: 0.025 }); },                       // обычная кнопка
      pop: () => { tone(520, { to: 880, peak: 0.16, dec: 0.07 }); noise({ f: 2400, peak: 0.05, dec: 0.02 }); },                        // меню, вкладки
      select: () => { tone(660, { type: 'triangle', peak: 0.16, dec: 0.08 }); tone(990, { type: 'triangle', t: 0.045, peak: 0.13, dec: 0.12 }); },   // выбор плитки
      confirm: () => { tone(440, { type: 'triangle', peak: 0.14, dec: 0.08 }); tone(660, { type: 'triangle', t: 0.06, peak: 0.14, dec: 0.1 }); tone(880, { t: 0.12, peak: 0.1, dec: 0.22 }); },
      advance: () => { noise({ type: 'lowpass', f: 300, to: 2600, q: 0.8, peak: 0.16, a: 0.02, dec: 0.24 }); tone(220, { to: 330, peak: 0.06, dec: 0.2 }); },   // «Продолжить»
      notify: () => { tone(1318, { peak: 0.12, dec: 0.5 }); tone(1975, { t: 0.01, peak: 0.05, dec: 0.35 }); tone(988, { t: 0.11, peak: 0.08, dec: 0.45 }); },   // уведомление
      toggle: () => { tone(760, { type: 'square', peak: 0.04, dec: 0.03 }); noise({ f: 5000, peak: 0.06, dec: 0.012 }); },
      back: () => { tone(700, { to: 420, peak: 0.12, dec: 0.08 }); }
    };
    let last = 0;
    function play(k) {
      if (!on || RM && k === 'advance') return; const now2 = performance.now(); if (now2 - last < 35) return; last = now2;
      try { if (!init()) return; if (ctx.state === 'suspended') ctx.resume(); (FX[k] || FX.tick)(); } catch (e) {}
    }
    return {
      play, get on() { return on; },
      toggle() { on = !on; store.set('cs2.ax.snd', on); if (on) play('confirm'); return on; },
      setVol(v) { vol = clamp(v, 0, 1); store.set('cs2.ax.vol', vol); if (out) out.gain.value = vol; }
    };
  })();
  // что как звучит
  D.addEventListener('click', e => {
    const t = e.target.closest('button, [role="button"], a, [data-nav], [data-art], [data-team], [data-player], select, input[type=checkbox]'); if (!t || t.disabled) return;
    if (t.closest('[data-ax-snd]')) return;
    if (t.id === 'pt-skip' || t.closest('#pt-skip')) return SND.play('advance');
    if (t.matches('.ax-tile, .v96-tf, .v96-ti, .v99-tf, .v96-opt, .ax-chip, .hs-chip, [aria-pressed]')) return SND.play('select');
    if (t.matches('input[type=checkbox], .v41-rank-tab, .pt-speed button, [data-speed], [data-calendar-speed]')) return SND.play('toggle');
    if (t.matches('.hs-btn:not(.ghost), .v96-go, .ax-btn.primary, button.primary, .ax-cta')) return SND.play('confirm');
    if (t.matches('[data-gs-hist="-1"], .hs-back, .v29-toast-x, [aria-label="Закрыть"]')) return SND.play('back');
    if (t.closest('#gs-side') || t.matches('.v99-tab, .hs-ptab, .hs-tab, [data-ax-tog]')) return SND.play('pop');
    SND.play('tick');
  }, true);

  /* ================================================================ ПОДКЛЮЧЕНИЕ */
  const origDesk = H.PAGES.desk;
  H.PAGES.desk = function () { try { return deskPage(origDesk); } catch (e) { console.warn('[v100 desk]', e); return origDesk ? origDesk() : ''; } };

  let lastKey = '';
  (H.AFTER || []).push((pg, arg, root) => {
    if (!root) return;
    const key = pg + '|' + (arg || '');
    const entered = key !== lastKey; lastKey = key;
    D.documentElement.dataset.axPage = pg;
    D.documentElement.classList.toggle('ax-mgr', !!me());
    try {
      if (pg === 'squad' && me()) squadCards(root);
      if (pg === 'negotiate' || pg === 'transfers') marketFilters(root);
      if (pg === 'finance') financeFix(root);
      contractYears(root); boardFix(root); decorTiles(root); decorKpis(root); decorKv(root); decorScenes(root); colorBars(root); decorMeters(root);
      if (pg === 'home') homeHero(root);
      takeButton(root);
      if (pg === 'finance' && me()) { chartsFinance(root); budgetPath(root); }
      if (pg === 'org' || pg === 'control') chartsBoard(root);
      if (pg === 'squad') chartsSquad(root);
      if (pg === 'watch') chartsSpectator(root);
      if (entered) {
        root.classList.add('ax-enter'); setTimeout(() => root.classList.remove('ax-enter'), 900);
        if (pg === 'desk') countUp(root);
      }
    } catch (e) { console.warn('[v100 after]', e); }
    renderSide(); paintTop();
  });

  function guardTitle() {   // v87 перерисовывает заголовок; на «Главной» менеджера держим «Главная»
    const tt = $('gs-title'); if (!tt || tt.dataset.ax) return; tt.dataset.ax = 1;
    new MutationObserver(() => { if (pageNow() === 'desk' && me() && tt.textContent !== 'Главная') tt.textContent = 'Главная'; }).observe(tt, { childList: true, characterData: true, subtree: true });
  }
  function boot() {
    D.documentElement.classList.add('ax-on');
    if (!bindSide() || !D.querySelector('#hs-root .pt-top-in')) { setTimeout(boot, 400); return; }
    paintTop(); bindToasts(); guardTitle(); watchTake();
    if (pageNow() === 'desk') try { H.render(); } catch (e) {}
  }
  boot();
  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  // v101: окно «Требует решения» перерисовывается целиком (выбор плитки, ответ) — плитки оформляем сразу при изменении,
  // а не раз в 1.5 с (раньше старый вид мелькал до следующего тика)
  let gateObs = null;
  function bindGate() { const g = $('v96-gate'); if (!g || gateObs) return; gateObs = new MutationObserver(() => { try { decorTiles(g); } catch (e) {} }); gateObs.observe(g, { childList: true, subtree: true }); decorTiles(g); }
  every(() => { try { renderSide(); paintTop(); bindToasts(); bindGate(); } catch (e) {} }, 1500, 'v100-arena');
  D.addEventListener('keydown', e => { if (e.key === 'Escape') D.documentElement.classList.remove('ax-drawer'); });
  D.addEventListener('click', e => { if (D.documentElement.classList.contains('ax-drawer') && !e.target.closest('#gs-side, .ax-burger')) D.documentElement.classList.remove('ax-drawer'); });

  W.CS2Arena = { renderSide, paintTop, nextMatch, deskPage, IC, sound: SND };
})();
