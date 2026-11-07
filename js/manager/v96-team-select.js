/* v96 — Выбор организации: экран, где игрок решает, за какой клуб играть.

   Раньше — сетка из 40 логотипов с номером места: ни состава, ни бюджета, ни того, чего ждёт руководство.
   Теперь экран из двух частей:
     • слева — список всех клубов (поиск, регион, сложность, сортировка), строка: место, логотип, название,
       сила состава, сложность;
     • справа — досье выбранного клуба: шапка (рейтинг, Tier, стиль, стратегия клуба), ключевые цифры, основной состав
       с фото, цель руководства (те же правила, что у контракта v91), сильные стороны и риски, лучшие карты;
       внизу — кнопка «Возглавить клуб».
   Данные — только из игры (рейтинг, бюджет, состав, ДНК и стратегия клуба, популярность, карты); ничего не выдумано.
   Экран один для первого выбора (страницы «Карьеры» без клуба), для страницы «Выбор организации» (#/pick)
   и для смены клуба. Выбор и фильтры живут в H.S.v96, список и досье перерисовываются на месте — без полной
   перерисовки страницы, поэтому прокрутка и фокус не теряются.
   Значения интерфейса — DESIGN.md (раздел v96). */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31;
  if (!H || !V || typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const esc = H.esc, logo = H.logo;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const season = () => Number(seasonState.currentSeason) || 1;
  const nowMs = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const byName = n => teams.find(t => t && t.name === n) || null;
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };

  /* ------------------------------------------------------------ справочники */
  const REGION_L = { EU: 'Европа', AM: 'Америки', AS: 'Азия' };
  const STYLE_L = { Aggressive: 'Агрессивный', Tactical: 'Тактический', Discipline: 'Дисциплинированный', Chaos: 'Хаотичный', Balanced: 'Сбалансированный' };
  // сложность по месту в рейтинге: чем ниже клуб, тем меньше ресурсов и дальше до цели
  const DIFF = [
    { k: 1, l: 'Лёгкая', hint: 'Сильный состав и большой бюджет. От вас ждут титулов.' },
    { k: 2, l: 'Средняя', hint: 'Крепкий состав. Путь в элиту — через турниры Tier-1.' },
    { k: 3, l: 'Высокая', hint: 'Скромные ресурсы, но есть куда расти.' },
    { k: 4, l: 'Вызов', hint: 'Начинать придётся с низов: состав слабее, бюджет меньше.' }
  ];
  const diffOf = rank => rank <= 10 ? DIFF[0] : rank <= 30 ? DIFF[1] : rank <= 70 ? DIFF[2] : DIFF[3];
  const ROLE_S = { 'Entry-Fragger': 'Entry', 'Entry Fragger': 'Entry' };   // длинное название роли не помещается на карточке
const SORTS = [['rank', 'По рейтингу'], ['power', 'По силе состава'], ['budget', 'По бюджету'], ['name', 'По названию']];

  /* ------------------------------------------------------------ данные клуба */
  const starters = t => (t.players || []).filter(p => p && p.status !== 'BENCH').slice(0, 5);
  const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const iglPow = p => (+p.tacticalIQ || 0) * .55 + (+p.utility || 0) * .2 + (+p.clutch || 0) * .15 + (+p.firepower || 0) * .1;
  const ovr = p => Math.round(p.role === 'IGL' ? iglPow(p) : pow(p));
  const avg = (a, f) => a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : 0;
  const money = v => { const a = Math.abs(v), s = v < 0 ? '−' : ''; return a >= 1e6 ? `${s}$${(a / 1e6).toFixed(1)}M` : `${s}$${Math.round(a / 1e3)}K`; };
  const budgetOf = n => { try { return Number(V.org(n).budget) || 0; } catch (e) { return 0; } };
  const regionOf = t => { try { return W.CS2Realism.regionOfTeam(t); } catch (e) { return 'EU'; } };
  const tierOf = n => { try { return W.CS2TeamTier(n) || 0; } catch (e) { return 0; } };
  const popOf = t => { try { return Math.round(W.CS2Fans.popularity(t)); } catch (e) { return null; } };
  const stratOf = t => { try { return W.CS2ClubStrategy.of(t).label; } catch (e) { return ''; } };
  const hasAcademy = n => teams.some(a => a && a.isAcademy && (a.academyParent || a.parentTeam) === n);

  // один проход по клубам: место, сила состава и её место — нужен и списку, и досье
  function table() {
    const rows = H.ranked().filter(t => t && !t.isAcademy).map((t, i) => {
      const st = starters(t), power = avg(st, ovr);
      return { t, name: t.name, rank: i + 1, power, budget: budgetOf(t.name), region: regionOf(t), style: t.style || '' };
    });
    rows.slice().sort((a, b) => b.power - a.power).forEach((r, i) => { r.powerRank = i + 1; });
    return rows;
  }

  /* цель руководства — те же правила, что и у контракта v91 (CS2Board.tourGoal / rankTarget), чтобы обещанное
     на этом экране совпадало с тем, что потом оценивают на странице «Режим игры» */
  function goalsOf(r) {
    const out = []; let tg = null, rT = null;
    try { tg = W.CS2Board.tourGoal(r.rank); rT = W.CS2Board.rankTarget(r.rank); } catch (e) {}
    if (rT != null) out.push(r.rank <= 3 ? { l: 'Рейтинг', v: 'удержаться в топ-3' } : { l: 'Рейтинг', v: `подняться с №${r.rank} на №${rT}` });
    if (tg) out.push({ l: 'Турниры', v: tg.l });
    out.push({ l: 'Финансы', v: `бюджет не ниже ${money(r.budget)}` });
    try { const yo = hasAcademy(r.name) || W.V34Roster.dna(r.name).youth >= .5; if (yo) out.push({ l: 'Молодёжь', v: 'игрок до 21 года в основе' }); } catch (e) {}
    out.push({ l: 'Климат', v: 'мораль основы не падает' });
    const until = season() + (new Date(nowMs()).getMonth() >= 6 ? 2 : 1);
    return { list: out, until };
  }

  // сильные стороны и риски — из состояния клуба; вес решает, что попадёт в тройку
  function insights(r) {
    const t = r.t, st = starters(t), pros = [], cons = [];
    const P = (w, x) => pros.push({ w, x }), K = (w, x) => cons.push({ w, x });
    const sorted = st.slice().sort((a, b) => ovr(b) - ovr(a));
    const star = sorted[0], weak = sorted[sorted.length - 1];
    if (star && ovr(star) >= 92) P(ovr(star) - 80, `Звезда состава — ${star.nick} (${star.role}, ${ovr(star)})`);
    const age = avg(st, p => +p.age || 24);
    if (age && age <= 22.5) P(8, `Молодой состав: средний возраст ${age.toFixed(1)}`);
    if (age >= 27.5) K(8, `Возрастной состав: средний возраст ${age.toFixed(1)}, скоро нужна замена`);
    const exp = st.filter(p => (+p.contractUntil || 99) <= season());
    if (exp.length >= 2) K(6 + exp.length, `Контракты истекают в этом сезоне: ${exp.map(p => p.nick).join(', ')}`);
    if (star && weak && star !== weak && ovr(star) - ovr(weak) >= 12) K(7, `Слабое звено — ${weak.nick} (${ovr(weak)}), отрыв от лидера ${ovr(star) - ovr(weak)}`);
    if (r.budget >= 3e6) P(9, `Большой бюджет — ${money(r.budget)}: хватит на усиление состава`);
    if (r.budget < 6e5) K(9, `Скромный бюджет — ${money(r.budget)}: сильных игроков не купить`);
    try { const ch = V.chemistry(t); if (ch >= .75) P(6, 'Высокая сыгранность: игроки давно вместе'); else if (ch < .45) K(7, 'Низкая сыгранность: состав ещё не притёрся'); } catch (e) {}
    if (hasAcademy(r.name)) P(5, 'Своя академия — источник молодых игроков');
    const pop = popOf(t);
    if (pop != null) { if (pop >= 50) P(7, `Крупная фанатская база: популярность ${pop} из 100`); else if (pop <= 12) K(5, `Клуб мало известен (${pop} из 100): спонсоров привлечь сложнее`); }
    const maps = Object.entries(t.maps || {}).filter(([, v]) => Number.isFinite(+v)).sort((a, b) => b[1] - a[1]);
    if (maps.length) {
      if (maps[0][1] >= 80) P(6, `Сильнейшая карта — ${maps[0][0]} (${Math.round(maps[0][1])})`);
      const lo = maps[maps.length - 1]; if (lo[1] < 62) K(4, `Провал на карте ${lo[0]} (${Math.round(lo[1])}) — её лучше банить`);
    }
    if (r.rank <= 3) K(3, 'Высокие ожидания: любое место ниже топ-3 — повод для критики');
    const top = (a, n) => a.sort((x, y) => y.w - x.w).slice(0, n).map(i => i.x);
    return { pros: top(pros, 3), cons: top(cons, 3) };
  }

  /* ------------------------------------------------------------ состояние */
  const S = () => { const s = H.S.v96 = H.S.v96 || { sel: '', q: '', region: '', diff: 0, sort: 'rank' }; return s; };
  function visible(rows, s) {
    const q = s.q.trim().toLowerCase();
    let L = rows.filter(r => (!s.region || r.region === s.region) && (!s.diff || diffOf(r.rank).k === s.diff) && (!q || r.name.toLowerCase().includes(q)));
    const by = { rank: (a, b) => a.rank - b.rank, power: (a, b) => b.power - a.power || a.rank - b.rank, budget: (a, b) => b.budget - a.budget || a.rank - b.rank, name: (a, b) => a.name.localeCompare(b.name, 'ru') };
    return L.sort(by[s.sort] || by.rank);
  }

  /* ------------------------------------------------------------ разметка */
  const pips = k => `<span class="v96-pips d${k}" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i class="${i <= k ? 'on' : ''}"></i>`).join('')}</span>`;
  const SEARCH_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  function rowHtml(r, sel) {
    const d = diffOf(r.rank), on = r.name === sel;
    return `<button type="button" class="v96-row${on ? ' on' : ''}" data-v96t="${esc(r.name)}" aria-pressed="${on}" aria-label="${esc(`${r.name}, место ${r.rank}, сила состава ${r.power.toFixed(1)}, сложность ${d.l}`)}">
      <span class="n">${r.rank}</span>${logo(r.name, 'md')}
      <span class="nm"><b>${esc(r.name)}</b><small>${esc(REGION_L[r.region] || '')}${r.style ? ' · ' + esc(STYLE_L[r.style] || r.style) : ''}</small></span>
      <span class="pw">${r.power.toFixed(1)}</span><span class="df" title="Сложность: ${esc(d.l)}">${pips(d.k)}</span></button>`;
  }
  function listHtml(rows, s) {
    const L = visible(rows, s);
    return L.length ? L.map(r => rowHtml(r, s.sel)).join('') : '<p class="v96-none">Ни один клуб не подходит под фильтры.</p>';
  }
  const chips = (key, items, cur, label) => `<div class="v96-chips" role="group" aria-label="${label}">${items.map(([v, l]) => `<button type="button" class="v96-chip${String(cur) === String(v) ? ' on' : ''}" data-v96f="${key}|${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;

  function kpi(label, value, sub) { return `<div class="v96-kpi"><small>${label}</small><b>${value}</b><em>${sub}</em></div>`; }

  function playerHtml(p) {
    const fl = H.pFlag ? H.pFlag(p) : '';
    return `<div class="v96-pl"><span class="v96-pl-ph ph">${H.photoHtml ? H.photoHtml(p, true) : ''}</span>
      <span class="v96-pl-role">${esc(ROLE_S[p.role] || p.role || '')}</span>${fl ? `<span class="v96-pl-fl">${fl}</span>` : ''}
      <span class="v96-pl-nm"><b>${esc(p.nick)}</b><small title="Контракт до сезона ${esc(String(p.contractUntil || '—'))}">${esc(String(p.age || '—'))} лет</small></span>
      <span class="v96-pl-ovr" title="Сила игрока">${ovr(p)}</span></div>`;
  }

  function detailHtml(r, s) {
    const t = r.t, d = diffOf(r.rank), st = starters(t), ins = insights(r), g = goalsOf(r), cur = me();
    const switching = !!cur && cur !== r.name, same = cur === r.name;
    const tier = tierOf(r.name), strat = stratOf(t), pop = popOf(t);
    let sp = null; try { sp = V.org(r.name).sponsor; } catch (e) {}
    const age = avg(st, p => +p.age || 24);
    const maps = Object.entries(t.maps || {}).filter(([, v]) => Number.isFinite(+v)).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const subtitle = [`№${r.rank} в мировом рейтинге`, REGION_L[r.region], tier ? `Tier-${tier}` : ''].filter(Boolean).join(' · ');
    const li = (a, cls) => a.length ? `<ul class="v96-ul ${cls}">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="v96-dim">Заметных особенностей нет.</p>';
    const cta = same
      ? `<div class="v96-cta-t"><b>Вы уже возглавляете ${esc(r.name)}</b><small>Откройте штаб организации, чтобы продолжить.</small></div><button type="button" class="v96-go" data-nav="org">Открыть штаб</button>`
      : `<div class="v96-cta-t"><b>${switching ? `Перейти в ${esc(r.name)}` : `Возглавить ${esc(r.name)}`}</b><small>${switching ? `${esc(cur)} перейдёт под управление ИИ, состав и контракты сохранятся.` : `Руководство подпишет с вами контракт до конца сезона ${g.until}.`}</small></div>
         <button type="button" class="v96-go" data-v96go="${esc(r.name)}">${switching ? 'Перейти в клуб' : 'Возглавить клуб'}</button>`;
    return `<div class="v96-hero">
        <div class="v96-hero-logo">${logo(r.name, 'xl')}</div>
        <div class="v96-hero-tx"><h2>${esc(r.name)}</h2><p>${esc(subtitle)}</p>
          <div class="v96-tags">${r.style ? `<span>Стиль: ${esc(STYLE_L[r.style] || r.style)}</span>` : ''}${strat ? `<span>Стратегия: ${esc(strat)}</span>` : ''}${t.coach && t.coach.name ? `<span>Тренер: ${esc(t.coach.name)}</span>` : ''}</div></div>
        <div class="v96-diff d${d.k}"><small>Сложность</small><b>${d.l}</b>${pips(d.k)}<em>${esc(d.hint)}</em></div></div>
      <div class="v96-kpis">
        ${kpi('Рейтинг', `#${r.rank}`, `${Math.round(t.pts || 0)} VRS`)}
        ${kpi('Бюджет', money(r.budget), sp && sp.perSeason ? `спонсор ${money(sp.perSeason)}` : 'без спонсора')}
        ${kpi('Сила состава', r.power.toFixed(1), `№${r.powerRank} из ${table.n}`)}
        ${kpi('Популярность', pop == null ? '—' : String(pop), 'из 100')}
        ${kpi('Возраст', age ? age.toFixed(1) : '—', 'средний')}</div>
      <div class="v96-body">
        <div class="v96-top">
          <section class="v96-sec"><h3>Основной состав</h3><div class="v96-pls">${st.map(playerHtml).join('')}</div></section>
          ${maps.length ? `<section class="v96-sec"><h3>Сильнейшие карты</h3><ul class="v96-maps">${maps.map(([m, v]) => `<li><span>${esc(m)}</span><b>${Math.round(v)}</b><span class="v96-bar"><i style="width:${clamp(+v, 0, 100)}%"></i></span></li>`).join('')}</ul></section>` : '<span></span>'}
        </div>
        <div class="v96-lower">
          <section class="v96-sec"><h3>Цель руководства <small>до конца сезона ${g.until}</small></h3>
            <dl class="v96-goals">${g.list.map(x => `<div><dt>${esc(x.l)}</dt><dd>${esc(x.v)}</dd></div>`).join('')}</dl></section>
          <section class="v96-sec"><h3>Сильные стороны</h3>${li(ins.pros, 'v96-pros')}</section>
          <section class="v96-sec"><h3>Риски</h3>${li(ins.cons, 'v96-cons')}</section>
        </div></div>
      <div class="v96-cta">${cta}<button type="button" class="v96-ghost" data-team="${esc(r.name)}">Страница команды</button></div>`;
  }

  function pageHtml() {
    const s = S(), rows = table(); table.n = rows.length;
    if (!rows.some(r => r.name === s.sel)) s.sel = (rows.find(r => r.name === me()) || rows[0] || {}).name || '';
    const r = rows.find(x => x.name === s.sel);
    const regs = [['', 'Все'], ...Object.entries(REGION_L)];
    const difs = [[0, 'Любая'], ...DIFF.map(d => [d.k, d.l])];
    return `<div class="v96-pick">
      <aside class="v96-list" aria-label="Клубы">
        <div class="v96-filters">
          <div class="v96-qrow"><label class="v96-search">${SEARCH_SVG}<input id="v96-q" type="search" value="${esc(s.q)}" placeholder="Найти клуб" aria-label="Найти клуб" autocomplete="off"></label>
            <select id="v96-sort" aria-label="Порядок списка">${SORTS.map(([k, l]) => `<option value="${k}"${s.sort === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="v96-frow"><span>Регион</span>${chips('region', regs, s.region, 'Регион')}</div>
          <div class="v96-frow"><span>Сложность</span>${chips('diff', difs, s.diff, 'Сложность')}</div>
        </div>
        <div class="v96-cols" aria-hidden="true"><span>№</span><span>Клуб</span><span>Сила</span><span>Сложность</span></div>
        <div class="v96-rows" id="v96-rows">${listHtml(rows, s)}</div>
        <div class="v96-count" id="v96-count">${visible(rows, s).length} из ${rows.length} клубов</div>
      </aside>
      <section class="v96-detail" id="v96-detail" aria-live="polite">${r ? detailHtml(r, s) : '<p class="v96-none">Клубов нет.</p>'}</section></div>`;
  }

  /* ------------------------------------------------------------ обновление на месте */
  const $ = id => document.getElementById(id);
  const tintOf = img => { const src = img && (img.currentSrc || img.src); if (!src) return null; try { return W.CS2_TEAM_TINT && W.CS2_TEAM_TINT[decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() || '')] || null; } catch (e) { return null; } };
  function tintHero() {
    const hero = document.querySelector('#v96-detail .v96-hero'); if (!hero) return;
    const img = hero.querySelector('.hs-logo img'); const v = tintOf(img) || [120, 140, 170];
    hero.style.setProperty('--gs-team', v.join(','));
  }
  function paintDetail(animate) {
    const s = S(), rows = table(); table.n = rows.length; const r = rows.find(x => x.name === s.sel), box = $('v96-detail'); if (!box || !r) return;
    box.innerHTML = detailHtml(r, s); box.scrollTop = 0; tintHero();
    if (animate) { box.classList.remove('v96-swap'); void box.offsetWidth; box.classList.add('v96-swap'); }
  }
  function paintList() {
    const s = S(), rows = table(), box = $('v96-rows'); if (!box) return;
    box.innerHTML = listHtml(rows, s); const c = $('v96-count'); if (c) c.textContent = `${visible(rows, s).length} из ${rows.length} клубов`;
  }
  function select(name, opts) {
    const s = S(); if (!name || s.sel === name) return; s.sel = name;
    document.querySelectorAll('#v96-rows .v96-row').forEach(b => { const on = b.dataset.v96t === name; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    paintDetail(true);
    if (opts && opts.focus) { const b = document.querySelector(`#v96-rows .v96-row[data-v96t="${CSS.escape(name)}"]`); if (b) b.focus({ preventScroll: false }); }
    // узкий экран: список и досье друг под другом — после выбора показываем досье
    if (W.matchMedia && W.matchMedia('(max-width: 1100px)').matches && !(opts && opts.focus)) { const d = $('v96-detail'); if (d) d.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  }
  function start(name) {
    if (!byName(name)) return;
    const first = !me();
    if (W.CS2Control && W.CS2Control.take) W.CS2Control.take(name); else V.setManaged(name);
    try { if (first) V.careerLog(`Начало карьеры в ${name}`); } catch (e) {}
    try { saveSeasonState(); } catch (e) {}
    H.nav ? H.nav('org') : H.render();
  }

  H.CLICKS.push(['[data-v96t]', el => { select(el.dataset.v96t); }]);
  H.CLICKS.push(['[data-v96f]', el => { const [k, v] = el.dataset.v96f.split('|'), s = S(); s[k] = k === 'diff' ? +v : v; document.querySelectorAll(`.v96-chip[data-v96f^="${k}|"]`).forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); paintList(); }]);
  H.CLICKS.push(['[data-v96go]', el => { start(el.dataset.v96go); }]);
  document.addEventListener('input', e => { if (e.target && e.target.id === 'v96-q') { S().q = e.target.value; paintList(); } });
  document.addEventListener('change', e => { if (e.target && e.target.id === 'v96-sort') { S().sort = e.target.value; paintList(); } });
  // стрелки вверх/вниз по списку: фокус и выбор идут вместе
  document.addEventListener('keydown', e => {
    const row = e.target && e.target.closest && e.target.closest('.v96-row'); if (!row || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    const all = [...document.querySelectorAll('#v96-rows .v96-row')], i = all.indexOf(row), nx = all[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (nx) { e.preventDefault(); select(nx.dataset.v96t, { focus: true }); }
  });

  H.PAGES.pick = () => pageHtml();
  if (Array.isArray(H.NAV_GAME) && !H.NAV_GAME.some(x => x[0] === 'pick')) H.NAV_GAME.splice(1, 0, ['pick', 'Выбор организации']);
  H.AFTER.push(() => {
    if (!document.querySelector('#hs-page .v96-pick')) return;
    tintHero();
    const on = document.querySelector('#v96-rows .v96-row.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  });

  W.V96Pick = { html: pageHtml, select, start, table, diffOf, insights, goalsOf };
  console.info('[v96] экран выбора организации');
})();
