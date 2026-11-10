/* v97 — «Командный центр и эфир»: дизайн окон менеджера и режима зрителя.

   Механика игры не меняется: модуль только перекладывает то, что уже считают другие модули.
     • Боковое меню «Карьера» короткое (v98): у менеджера — рабочее место, события, состав, тренировки, тактика,
       переговоры, финансы; у наблюдателя — эфир, сезон, выбор организации; остальное под «Ещё». Счётчик нерешённых
       событий и метка LIVE на «Режиме зрителя».
     • Режим зрителя: табло эфира в цветах команд (счёт серии делениями, шансы на карту внутри табло),
       порядок блоков «ход карты → разбор раунда → динамика → лента»; когда эфира нет — экран ожидания
       с ближайшим турниром и повторами.
     • «Тренерский штаб» (бывш. «Штаб»): карточки тренеров с навыками, рынок — на всю ширину
       (раньше кнопка «Нанять» уезжала за край узкой колонки).
     • «Тактика»: таблица «что чем бьётся» из той же матрицы, по которой считает матч (CS2Tactics.M).
     • Страницы карьеры получают общий заголовок; у страницы — атрибут data-pg для точечных стилей.
   Значения интерфейса — DESIGN.md (раздел v97), стили — css/v97-design.css. */
(function () {
  'use strict';
  const W = window, H = W.HS; if (!H || !H.PAGES) return;
  const esc = H.esc || (s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const $ = id => document.getElementById(id);
  const DAY = 864e5;
  const SS = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);
  const now = () => Number(SS() && SS().calendar && SS().calendar.currentMs) || Date.now();
  const me = () => { try { return (W.V31 && W.V31.managed && W.V31.managed()) || ''; } catch (e) { return ''; } };
  const fdate = ms => { try { return H.fdate(ms); } catch (e) { return new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); } };
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    tv: svg('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m10.5 9 3.5 2-3.5 2z"/>'),
    play: svg('<path d="M7 5v14l11-7z" fill="currentColor" stroke="none"/>'),
    cal: svg('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'),
    list: svg('<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>')
  };
  // копия обёртки сохраняет метки прежних слоёв (v43/v44 проверяют их, чтобы не обернуть страницу второй раз)
  const wrap = (key, fn) => { const old = H.PAGES[key]; if (typeof old !== 'function' || old.__v97) return; const w = function () { const html = old.apply(this, arguments); try { return fn(html, arguments[0]); } catch (e) { console.warn('[v97]', key, e); return html; } }; Object.keys(old).forEach(k => { w[k] = old[k]; }); w.__v97 = true; H.PAGES[key] = w; };
  const parse = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };
  const out = frag => { const d = document.createElement('div'); d.appendChild(frag); return d.innerHTML; };

  /* ------------------------------------------------------------ цвет команды по логотипу */
  const tint = name => {
    try {
      const m = /src="([^"]+)"/.exec(H.logo(name, 'lg') || ''); if (!m) return null;
      const file = decodeURIComponent(m[1].split(/[?#]/)[0].split('/').pop() || '');
      const c = W.CS2_TEAM_TINT && W.CS2_TEAM_TINT[file]; if (!c) return null;
      // очень тёмные и очень светлые логотипы дают грязную подложку — приводим к рабочей яркости
      let [r, g, b] = c; const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn < 24) return null;                         // серый логотип — нейтральная подложка
      if (mx < 110) { const k = 110 / Math.max(1, mx); r = Math.min(255, r * k); g = Math.min(255, g * k); b = Math.min(255, b * k); }
      return [Math.round(r), Math.round(g), Math.round(b)].join(',');
    } catch (e) { return null; }
  };

  /* ============================================================ режим зрителя */
  const NEED = { BO1: 1, BO3: 2, BO5: 3 };
  function pips(won, need) { return `<span class="v97-pips" aria-label="Карт выиграно: ${won} из ${need}">${Array.from({ length: need }, (_, i) => `<i class="${i < won ? 'on' : ''}"></i>`).join('')}</span>`; }

  function stageLive(root) {
    const board = root.querySelector('.sp-board'); if (!board) return false;
    const f = H.spectator && H.spectator.direct ? H.spectator.direct() : null, st = f && f.state, m = f && f.match;
    // цвета команд и серия
    if (m) {
      const a = tint(m.t1), b = tint(m.t2);
      if (a) board.style.setProperty('--v97-a', a); if (b) board.style.setProperty('--v97-b', b);
      const need = NEED[st.mode] || 2, teams = board.querySelectorAll('.sp-team');
      [st.series1 || 0, st.series2 || 0].forEach((won, i) => { const nm = teams[i] && teams[i].querySelector(':scope > b'); if (nm && !teams[i].querySelector('.v97-pips')) nm.insertAdjacentHTML('afterend', pips(won, need)); });
      // карты серии: сыгранные со счётом, текущая, оставшиеся
      const res = st.mapResults || [], maps = st.maps || [];
      if (maps.length > 1) {
        const chips = maps.map((mp, i) => { const r = res[i]; const cls = r ? (r.t1Score > r.t2Score ? 'a' : 'b') : i === st.mapIndex ? 'now' : 'next';
          return `<span class="v97-mapchip ${cls}"><b>${esc(mp)}</b>${r ? `<i>${r.t1Score}:${r.t2Score}</i>` : i === st.mapIndex ? '<i>идёт</i>' : ''}</span>`; }).join('');
        board.querySelector('.sp-mid').insertAdjacentHTML('beforeend', `<div class="v97-maps">${chips}</div>`);
      }
    }
    board.classList.add('v97-board');
    const grid = root.querySelector('.hs-grid2'), cols = grid ? grid.querySelectorAll(':scope > .hs-col') : [];
    if (!grid || cols.length < 2) return true;
    const boxes = c => [...c.querySelectorAll(':scope > .hs-box')];
    const byTitle = (list, re) => list.find(b => re.test((b.querySelector('.hs-box-h h3') || {}).textContent || ''));
    const L = boxes(cols[0]), R = boxes(cols[1]);
    const flow = byTitle(L, /Ход карты/), feed = byTitle(L, /Лента эфира/), odds = byTitle(R, /Шансы/);
    // шансы на карту — в табло
    const bar = odds && odds.querySelector('.mc-odds');
    if (bar) { const w = document.createElement('div'); w.className = 'v97-odds'; w.innerHTML = '<small>Шансы на карту</small>'; w.appendChild(bar); board.appendChild(w); odds.remove(); }
    else if (odds) odds.classList.add('v97-quiet');
    const story = root.querySelector('.v43-story'), dyn = root.querySelector('.v44-dynamics');
    const stage = document.createElement('div'); stage.className = 'v97-stage';
    const main = document.createElement('div'); main.className = 'v97-stage-main';
    const side = document.createElement('div'); side.className = 'v97-stage-side';
    [flow, story, dyn, feed].forEach(n => { if (n) main.appendChild(n); });
    [...L, ...R].forEach(n => { if (n && n.parentNode && !main.contains(n)) side.appendChild(n); });
    if (odds && odds.parentNode) side.prepend(odds);
    stage.appendChild(main); stage.appendChild(side);
    grid.replaceWith(stage);
    return true;
  }

  function nextMain() {
    const s = SS(), t0 = now(); let best = null;
    try { (s.seasonSchedule || []).forEach(st => { const a = Number(st && st.calendar && st.calendar.startMs) || 0; if (!a || a < t0 - DAY || st.completed) return; if (!best || a < best.at) best = { name: st.name || st.title || 'Турнир', at: a }; }); } catch (e) {}
    return best;
  }
  function stageOff(root) {
    const boxes = [...root.children].filter(n => n.classList && n.classList.contains('hs-box')); if (!boxes.length) return;
    const ct = CT(), running = ct && !ct.completed, paused = !!(W.v15IsCalendarPaused && W.v15IsCalendarPaused());
    const nx = running ? null : nextMain();
    const days = nx ? Math.max(0, Math.round((nx.at - now()) / DAY)) : 0;
    const line = running ? `<dt>Идёт турнир</dt><dd><b>${esc(ct.name)}</b><span>ближайший матч выйдет в эфир по расписанию</span></dd>`
      : nx ? `<dt>Ближайший турнир</dt><dd><b>${esc(nx.name)}</b><span>${esc(fdate(nx.at))} · ${days <= 0 ? 'сегодня' : days === 1 ? 'завтра' : 'через ' + days + ' дн.'}</span></dd>`
        : `<dt>Календарь</dt><dd><b>Расписание сезона пусто</b><span>турниры появятся с началом сезона</span></dd>`;
    const off = document.createElement('section'); off.className = 'v97-off';
    off.innerHTML = `<div class="v97-off-screen" aria-hidden="true">${IC.tv}<span>нет сигнала</span></div>
      <div class="v97-off-tx"><h2>Эфир начнётся сам</h2>
        <p>Трансляция включается, когда по календарю стартует матч основного турнира. Режиссёр держит в кадре самый напряжённый матч — или выберите матч сами в списке «Другие матчи в эфире».</p>
        <dl class="v97-off-next">${line}</dl>
        <div class="v97-off-act">${paused ? `<button type="button" class="hs-btn" data-v97run>${IC.play}Запустить время</button>` : '<span class="v97-running"><i></i>Время идёт</span>'}
          <button type="button" class="hs-btn ghost" data-nav="matches">${IC.list}Расписание матчей</button><button type="button" class="hs-btn ghost" data-nav="calendar">${IC.cal}Календарь сезона</button></div></div>`;
    boxes[0].replaceWith(off);
    if (boxes[1]) boxes[1].classList.add('v97-reps');
  }
  wrap('watch', html => { const r = parse(html); if (!stageLive(r)) stageOff(r); return out(r); });
  H.CLICKS && H.CLICKS.push(['[data-v97run]', () => { try { if (W.v15IsCalendarPaused && W.v15IsCalendarPaused() && W.toggleGameCalendarPause) W.toggleGameCalendarPause(); } catch (e) {} setTimeout(() => { try { H.render(); } catch (e) {} }, 60); }]);

  /* ============================================================ тренерский штаб */
  const initials = n => String(n || '?').replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
  const meter = (label, v, hint) => `<div class="v97-meter"><span>${esc(label)}</span><span class="v97-track"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span><b>${Math.round(v)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
  wrap('staff', html => {
    const St = W.CS2Staff, name = me(), t = name && H.teamBy(name); if (!St || !t) return html;
    const r = parse(html), cols = r.querySelectorAll('.hs-grid2 > .hs-col'); if (cols.length < 2) return html;
    const s = St.of(t), h = s.head, cp = St.compat(t, h.pace), market = [...cols[1].querySelectorAll(':scope > .hs-box')];
    const note = cols[0].querySelector('.hs-note');
    const cpTxt = cp >= .8 ? 'стили совпадают' : cp >= .6 ? 'стили совместимы' : 'стили расходятся: команда играет хуже';
    const page = document.createElement('div'); page.className = 'v97-staff';
    page.innerHTML = `<section class="v97-coach"><header><span class="v97-ini" aria-hidden="true">${esc(initials(h.name))}</span>
          <div><small>Главный тренер</small><h2>${esc(h.name)}</h2><p><span class="v97-tag">${esc(h.style)}</span><span class="v97-tag">${esc(St.PACE_L[h.pace] || '')} стиль</span></p></div>
          <div class="v97-fit ${cp < .6 ? 'dn' : cp >= .8 ? 'up' : ''}"><b>${Math.round(cp * 100)}%</b><small>совместимость</small><em>${cpTxt}</em></div></header>
        <div class="v97-meters">${meter('Тренировки', h.skills.training, 'рост навыков')}${meter('Тактика', h.skills.tactics, 'планы на картах')}${meter('Молодёжь', h.skills.youth, 'развитие до 21 года')}${meter('Работа с людьми', h.skills.people, 'мораль и конфликты')}</div></section>
      <section class="v97-aide"><span class="v97-ini sm" aria-hidden="true">${esc(initials(s.analyst.name))}</span><div><small>Аналитик</small><h3>${esc(s.analyst.name)}</h3></div>${meter('Точность разведки', s.analyst.skill, 'планы соперника и подготовка к матчу')}</section>
      <section class="v97-aide"><span class="v97-ini sm" aria-hidden="true">${esc(initials(s.perf.name))}</span><div><small>Тренер по нагрузке</small><h3>${esc(s.perf.name)}</h3></div>${meter('Восстановление', s.perf.skill, 'усталость между матчами')}</section>`;
    const mk = document.createElement('div'); mk.className = 'v97-market';
    market.forEach((b, i) => { b.classList.add('flush'); if (!i) b.classList.add('v97-wide'); mk.appendChild(b); });
    const head = r.querySelector('.hs-head'); const h1 = head && head.querySelector('h1'); if (h1) h1.textContent = 'Тренерский штаб';
    const grid = r.querySelector('.hs-grid2'); grid.replaceWith(page);
    if (note) { note.classList.add('v97-lede'); page.after(note); note.after(mk); } else page.after(mk);
    const cap = document.createElement('h2'); cap.className = 'v97-sec'; cap.textContent = 'Рынок специалистов'; mk.before(cap);
    return out(r);
  });

  /* ============================================================ тактика: что чем бьётся */
  wrap('tactics', html => {
    const T = W.CS2Tactics; if (!T || !T.M || !me()) return html;
    const r = parse(html), box = r.querySelector('.hs-box .hs-box-b'), tbl = box && box.querySelector('.hs-tbl'); if (!tbl) return html;
    const rows = Object.keys(T.CT_L).map(ct => {
      const vs = Object.keys(T.T_L).map(t => ({ t, v: (T.M[t] || T.M.default || {})[ct] || 0 }));
      const beats = vs.filter(x => x.v < 0).sort((a, b) => a.v - b.v).map(x => T.T_L[x.t]), loses = vs.filter(x => x.v > 0).sort((a, b) => b.v - a.v).map(x => T.T_L[x.t]);
      if (!beats.length && !loses.length) return '';
      return `<tr><th scope="row">${esc(T.CT_L[ct])}</th><td class="up">${beats.length ? '▲ ' + beats.map(esc).join(', ') : '—'}</td><td class="dn">${loses.length ? '▼ ' + loses.map(esc).join(', ') : '—'}</td></tr>`; }).join('');
    if (rows) {
      const leg = document.createElement('aside'); leg.className = 'v97-rps';
      leg.innerHTML = `<h4>Что чем бьётся</h4><table><thead><tr><th>Оборона (CT)</th><th>сильна против атаки</th><th>уступает атаке</th></tr></thead><tbody>${rows}</tbody></table>`;
      const wrapEl = document.createElement('div'); wrapEl.className = 'v97-tac'; tbl.replaceWith(wrapEl);
      const sc = document.createElement('div'); sc.className = 'v97-tac-t'; sc.appendChild(tbl); wrapEl.appendChild(sc); wrapEl.appendChild(leg);
    }
    return out(r);
  });

  /* ============================================================ режим игры: два режима рядом */
  wrap('control', html => {
    const r = parse(html), grid = r.querySelector('.hs-grid2'); if (!grid) return html;
    const club = me(), boxes = [...grid.querySelectorAll('.hs-box')], title = b => ((b.querySelector('.hs-box-h h3') || {}).textContent || '').trim();
    const modeBox = boxes.find(b => /^Вы — /.test(title(b))), takeBox = boxes.find(b => /Перейти в другой клуб|Стать менеджером организации/.test(title(b)));
    if (!modeBox || !takeBox) return html;
    const grace = (() => { try { return W.CS2Config ? W.CS2Config.get('control.aiGraceDays') : 60; } catch (e) { return 60; } })() || 60;
    const sec = document.createElement('section'); sec.className = 'v97-modes'; sec.setAttribute('aria-label', 'Режим игры');
    sec.innerHTML = `<article class="v97-mode${club ? '' : ' on'}"><header><span class="v97-mode-ic">${IC.tv}</span><h3>Наблюдатель</h3>${club ? '' : '<span class="v97-now">сейчас</span>'}</header>
        <p>Всеми организациями управляет ИИ. Вы смотрите эфир, следите за рейтингом и трансферами, делаете прогнозы.</p>
        <footer>${club ? `<button type="button" class="hs-btn ghost" data-v90release>Стать наблюдателем</button><small>Состав и контракты останутся; ${esc(String(grace))} дней ИИ не будет перестраивать команду.</small>` : `<button type="button" class="hs-btn ghost" data-nav="watch">${IC.play}Открыть эфир</button>`}</footer></article>
      <article class="v97-mode${club ? ' on' : ''}"><header><span class="v97-mode-ic">${club ? H.logo(club, 'md') : IC.list}</span><h3>Менеджер${club ? ' · ' + esc(club) : ''}</h3>${club ? '<span class="v97-now">сейчас</span>' : ''}</header>
        <p>Вы ведёте один клуб: состав, тренировки, тактика, трансферы и финансы. Остальными управляет ИИ; мир не пересоздаётся.</p>
        <footer>${club ? `<button type="button" class="hs-btn ghost" data-nav="pick">Сменить клуб</button><small>Текущий клуб перейдёт под управление ИИ, состав и контракты сохранятся.</small>` : `<button type="button" class="hs-btn" data-nav="pick">Выбрать организацию</button><small>Состав, бюджет, цели руководства, сильные стороны и риски каждого клуба — на одном экране.</small>`}</footer></article>`;
    modeBox.remove(); takeBox.remove();
    grid.before(sec);
    const cols = grid.querySelectorAll(':scope > .hs-col');
    if (cols[1] && !cols[1].children.length) { cols[1].remove(); grid.classList.add('v97-one'); }
    if (cols[0] && !cols[0].children.length) grid.remove();
    return out(r);
  });

  /* ============================================================ боковое меню */
  // название пункта «Штаб» путалось со «Штабом организации»
  function relabel() { const b = document.querySelector('#hs-root .pt-menu[data-menu="game"] [data-nav="staff"]'); if (b && b.textContent.trim() === 'Штаб') b.textContent = 'Тренерский штаб'; }
  // v98: короткое меню — то, чем менеджер пользуется каждый день; остальное под «Ещё»
  const MAIN_M = ['desk', 'inbox', 'squad', 'training', 'tactics', 'negotiate', 'finance'];
  const MAIN_S = ['watch', 'season', 'pick'];
  const CLUB_ONLY = { desk: 1, org: 1, inbox: 1, dm: 1, squad: 1, training: 1, tactics: 1, staff: 1, scout: 1, negotiate: 1, academy: 1, finance: 1, career: 1 };
  const MORE_KEY = 'cs2.v97.more';
  let moreOpen = false; try { moreOpen = localStorage.getItem(MORE_KEY) === '1'; } catch (e) {}
  function groupSide() {
    const sub = document.querySelector('#gs-side .gs-grp[data-gs-grp="game"] .gs-sub'); if (!sub) return;
    const mode = me() ? 'm' : 's';
    if (sub.dataset.v97 !== mode) {
      const btn = {}; [...sub.querySelectorAll('[data-nav]')].forEach(b => { btn[b.dataset.nav] = b; });
      const main = (mode === 'm' ? MAIN_M : MAIN_S).filter(k => btn[k]), rest = Object.keys(btn).filter(k => !main.includes(k));
      const frag = document.createDocumentFragment();
      main.forEach(k => { btn[k].classList.remove('v97-dim'); frag.appendChild(btn[k]); });
      if (rest.length) {
        const tg = document.createElement('button'); tg.type = 'button'; tg.className = 'gs-it sub v97-moretg'; tg.dataset.v97more = '1'; tg.innerHTML = `<span class="gs-lb">Ещё</span><i>${rest.length}</i>`;
        const box = document.createElement('div'); box.className = 'v97-more';
        rest.sort((a, b) => (mode === 's' ? (CLUB_ONLY[a] ? 1 : 0) - (CLUB_ONLY[b] ? 1 : 0) : 0)).forEach(k => { btn[k].classList.toggle('v97-dim', mode === 's' && !!CLUB_ONLY[k]); box.appendChild(btn[k]); });
        frag.appendChild(tg); frag.appendChild(box);
      }
      sub.textContent = ''; sub.appendChild(frag); sub.dataset.v97 = mode;
    }
    const box = sub.querySelector('.v97-more'), tg = sub.querySelector('.v97-moretg');
    if (box && tg) { const open = moreOpen || !!box.querySelector('.gs-it.on'); if (box.classList.contains('open') !== open) box.classList.toggle('open', open); tg.setAttribute('aria-expanded', String(open)); }
    badges();
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-v97more]'); if (!b) return; e.preventDefault(); e.stopPropagation(); moreOpen = !moreOpen; try { localStorage.setItem(MORE_KEY, moreOpen ? '1' : '0'); } catch (e2) {} groupSide(); }, true);
  function badges() {
    const side = $('gs-side'); if (!side) return;
    let n = 0; try { n = me() && W.V96Windows ? W.V96Windows.events().length : 0; } catch (e) {}
    const inbox = side.querySelector('.gs-it[data-nav="inbox"]');
    if (inbox) { let b = inbox.querySelector('.v97-badge'); if (n) { if (!b) { b = document.createElement('i'); b.className = 'v97-badge'; inbox.appendChild(b); } const tx = n > 9 ? '9+' : String(n); if (b.textContent !== tx) b.textContent = tx; b.setAttribute('aria-label', 'нерешённых событий: ' + n); } else if (b) b.remove(); }
    let live = false; try { live = ((CT() && CT().broadcast && CT().broadcast.active) || []).some(i => i && i.match && i.state && !i.state.finished); } catch (e) {}
    const watch = side.querySelector('.gs-it[data-nav="watch"]');
    if (watch) { let b = watch.querySelector('.v97-livetag'); if (live && !b) { b = document.createElement('i'); b.className = 'v97-livetag'; b.textContent = 'LIVE'; watch.appendChild(b); } else if (!live && b) b.remove(); }
  }

  /* ============================================================ общий заголовок страниц карьеры */
  const CAREER = { squad: 1, desk: 1, org: 1, inbox: 1, dm: 1, training: 1, tactics: 1, staff: 1, scout: 1, negotiate: 1, academy: 1, finance: 1, career: 1, control: 1, decisions: 1 };
  function after(page, arg, pg) {
    pg = pg || $('hs-page'); if (!pg) return;
    pg.dataset.pg = page || 'home';
    document.documentElement.dataset.v97Mode = me() ? 'manager' : 'spectator';
    if (CAREER[page] && me() && !pg.querySelector('.v96-pick') && !pg.querySelector(':scope > .hs-head, :scope > * > .hs-head')) {
      const t = ($('gs-title') || {}).textContent || '';
      const h = document.createElement('div'); h.className = 'hs-head v97-head';
      h.innerHTML = `<h1 class="gs-dup">${esc(t || 'Карьера')}</h1><div class="hs-filters"><span class="hs-sub">${esc(me())}</span></div>`;
      pg.prepend(h);
    }
    relabel(); groupSide();
  }
  if (H.AFTER) H.AFTER.push(after);
  relabel();
  [0, 500, 1600, 4200].forEach(t => setTimeout(() => { try { relabel(); if (W.CS2Shell && t) W.CS2Shell.refresh(); groupSide(); } catch (e) {} }, t));
  setInterval(() => { try { if (!document.hidden) groupSide(); } catch (e) {} }, 900);

  W.V97Design = { groupSide, tint, refresh: () => after(H.S && H.S.page) };
  console.info('[v97] дизайн: окна менеджера и режим зрителя');
})();
