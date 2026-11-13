/* v95 — Этап 5 · рабочее место менеджера.

   Новая страница «Рабочее место» (первый пункт меню «Игра»; в режиме менеджера — сводка и на главной):
     • Моя организация: место в рейтинге и изменение с начала сезона, бюджет и прогноз на конец сезона, форма и мораль
       состава, следующий матч / турнир.
     • Требуют решения: открытые события (сроки), предложения спонсоров, истекающие контракты, план тренировок и
       подготовка к сопернику, предупреждения руководства, обещания прессе — каждое ведёт на свою страницу.
     • Последний результат: последняя серия команды.
     • В сезоне: доверие руководства и цели, требование партнёра, путь к ближайшему Мейджору (v95-major-path).
     • Разделы: Обзор, Состав, Рынок, Тактика, Тренировки, Штаб, Академия, Финансы, Скаутинг, Календарь, Мир CS2, Новости.
   Профиль игрока: к вкладкам «Обзор / Статистика / Карты / Матчи / Турниры / Достижения / Карьера» добавлены «Развитие»,
   «Контракт» и «Характер» (данные v31/v92). Игровые данные не меняются. */
(function () {
  'use strict';
  const W = window, V = W.V31, H = W.HS;
  if (!V || !H || typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const esc = H.esc, box = H.box, logo = H.logo || (() => '');
  const DAY = 864e5;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const byName = n => teams.find(t => t && t.name === n) || null;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankOf = n => { const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.findIndex(t => t.name === n); return i < 0 ? 999 : i + 1; };
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const money = v => { try { return V.money(v); } catch (e) { return '$' + Math.round(v); } };
  const fdate = ms => ms ? new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—';
  const starters = t => (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
  const avg = (a, f) => a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : 0;

  function nextEvent(name) {
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null, t0 = now();
    if (ct && !ct.completed && (ct.participants || []).includes(name)) return { name: ct.name, live: true };
    const out = [];
    (seasonState.seasonSchedule || []).forEach((st, i) => {
      const start = Number(st && st.calendar && st.calendar.startMs) || 0; if (!start || start < t0) return;
      const inv = (st.v35Roster && st.v35Roster.participants) || st.v45Participants || (st.v95Major && st.v95Major.direct) || st.v35Invites || [];
      if (inv.includes(name)) out.push({ name: st.name, start });
    });
    (seasonState.parallelSchedule || []).forEach(e => { if (e && e.status !== 'completed' && (e.participants || []).includes(name) && (e.startMs || 0) >= t0 - 3 * DAY) out.push({ name: e.name, start: e.startMs, live: e.status === 'live' }); });   // v99: идущий отбор — «идёт», а не прошедшая дата
    out.sort((a, b) => a.start - b.start);
    return out[0] || null;
  }
  function lastSeries(t) {
    const h = t.mapHistory || []; if (!h.length) return null;
    const a = h[0], maps = h.filter((x, i) => i < 7 && x.tournament === a.tournament && x.opponent === a.opponent && x.round === a.round);
    const w = maps.filter(x => x.result === 'W').length, l = maps.length - w;
    return { opp: a.opponent, tour: a.tournament, round: a.round, w, l, maps: maps.map(x => `${x.map} ${x.score || x.result}`).reverse() };
  }
  function todo(t) {
    const items = [], o = V.org(t.name), c = V.S();
    (c.events || []).filter(e => e.team === t.name && e.status === 'open').forEach(e => items.push({ l: e.title, d: `ответить до ${fdate(e.until)}`, nav: 'inbox', urgent: e.until - now() < 3 * DAY }));
    const offs = (o.v94offers && o.v94offers.list) || []; if (offs.length) items.push({ l: `Предложения спонсоров: ${offs.length}`, d: 'контракт с партнёром заканчивается', nav: 'finance', urgent: true });
    const exp = (t.players || []).filter(p => p && (+p.contractUntil || 99) <= season()); if (exp.length) items.push({ l: `Контракты истекают в этом сезоне: ${exp.map(p => p.nick).join(', ')}`, d: 'продление — на странице игрока или в переговорах', nav: 'team', arg: t.name });
    if (!o.train || o.train.auto) items.push({ l: 'План тренировок не утверждён', d: o.train && o.train.auto ? 'действует план ассистента' : 'фокус и интенсивность', nav: 'training' });
    const ne = nextEvent(t.name), ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    if (ne && ne.live && ct && !(o.prep && now() - (o.prep.ts || 0) < 10 * DAY)) items.push({ l: 'Подготовка к сопернику не проведена', d: `идёт ${ct.name}`, nav: 'scout', urgent: true });
    try { const k = W.CS2Board.contract(t.name); if (k && k.status === 'active' && k.warned) items.push({ l: 'Предупреждение руководства', d: 'доверие ниже порога', nav: 'control', urgent: true }); } catch (e) {}
    try { (W.CS2Press.promises() || []).filter(p => p.team === t.name && p.status === 'open').forEach(p => items.push({ l: `Обещание прессе: «${p.text}»`, d: p.kind === 'place' ? `проверка — после ${p.tour}` : `проверка — до ${fdate(p.ts + 56 * DAY)}`, nav: 'career' })); } catch (e) {}
    const listed = (t.players || []).filter(p => p && (p.v31listed || p.v84Listed)); if (listed.length) items.push({ l: `На трансфере: ${listed.map(p => p.nick).join(', ')}`, d: 'ждём предложения', nav: 'transfers' });
    return items;
  }
  const SECTIONS = [['org', 'Обзор', 'Состояние организации'], ['team', 'Состав', 'Игроки, роли, контракты'], ['transfers', 'Рынок', 'Трансферы и переговоры'], ['tactics', 'Тактика', 'Стратегии и карты'],
    ['training', 'Тренировки', 'Развитие игроков'], ['staff', 'Штаб', 'Тренеры и специалисты'], ['academy', 'Академия', 'Молодёжная команда'], ['finance', 'Финансы', 'Доходы и расходы'],
    ['scout', 'Скаутинг', 'Поиск игроков и соперники'], ['calendar', 'Календарь', 'Турниры и подготовка'], ['ranking', 'Мир CS2', 'Рейтинги и команды'], ['news', 'Новости', 'События и история']];
  function kpis(t) {
    const rk = rankOf(t.name), s0 = +t.seasonStartRank || rk, d = s0 - rk, o = V.org(t.name), ps = starters(t);
    let fc = null; try { fc = W.CS2Finance.forecast(t); } catch (e) {}
    const form = avg(ps, p => +p.form || 100), morale = avg(ps, p => +p.morale || 85);
    const fl = form >= 104 && morale >= 82 ? 'отличная' : form >= 98 && morale >= 72 ? 'хорошая' : form >= 92 ? 'средняя' : 'плохая';
    const ne = nextEvent(t.name);
    return `<div class="pt-kpis v95-kpis">
      <div><small>Рейтинг VRS</small><b>#${rk}</b><em class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '▲ ' + d : d < 0 ? '▼ ' + -d : '='} с начала сезона</em></div>
      <div><small>Бюджет</small><b class="${o.budget < 0 ? 'dn' : ''}">${money(o.budget)}</b><em>${fc ? `к концу сезона ${money(fc.end)}` : ''}</em></div>
      <div><small>Форма состава</small><b>${fl}</b><em>форма ${Math.round(form)} · мораль ${Math.round(morale)}</em></div>
      <div><small>Следующий турнир</small><b>${ne ? (ne.live ? 'идёт' : fdate(ne.start)) : '—'}</b><em>${ne ? esc(ne.name) : 'нет приглашений'}</em></div></div>`;
  }
  function deskPage() {
    const name = me(), t = byName(name);
    if (!t) return `<div class="hs-head"><h1>Рабочее место</h1></div>${box('Режим наблюдателя', `<p class="hs-note">Рабочее место — для режима менеджера. Возьмите клуб под управление на странице «Режим игры».</p><button type="button" class="hs-btn" data-nav="control">Режим игры →</button>`)}`;
    const items = todo(t), ls = lastSeries(t), o = V.org(t.name);
    let bs = null, k = null; try { k = W.CS2Board.contract(t.name); bs = k ? W.CS2Board.score(k) : null; } catch (e) {}
    let mp = null; try { mp = W.CS2MajorPath.teamPath(t.name); } catch (e) {}
    const sp = o.sponsor; let spOk = null; try { spOk = sp && sp.industry ? W.CS2Sponsors.demandOk(t, sp) : null; } catch (e) {}
    const todoHtml = items.length ? `<ul class="v95-todo">${items.map(x => `<li class="${x.urgent ? 'urg' : ''}"><button type="button" data-nav="${x.nav}"${x.arg ? ` data-arg="${esc(x.arg)}"` : ''}><b>${esc(x.l)}</b><small>${esc(x.d || '')}</small></button></li>`).join('')}</ul>` : '<p class="hs-note">Сейчас ничего не требует вашего решения.</p>';
    const lastHtml = ls ? `<div class="v95-last"><b>${esc(t.name)}</b> <span class="${ls.w > ls.l ? 'up' : 'dn'}">${ls.w} : ${ls.l}</span> <b>${esc(ls.opp)}</b><small>${esc(ls.tour)}${ls.round ? ' — ' + esc(ls.round) : ''}</small><small>${ls.maps.map(esc).join(' · ')}</small></div>` : '<p class="hs-note">Матчей ещё не было.</p>';
    const kv = (l, v, cls) => `<div><span>${l}</span><b class="${cls || ''}">${v}</b></div>`;
    const seasonHtml = `<div class="v95-kv">
      ${bs ? kv('Доверие руководства', bs.conf + '%', bs.conf >= 50 ? 'up' : 'dn') + kv('Цель по рейтингу', '№' + k.rT) : kv('Контракт с руководством', 'не подписан')}
      ${sp ? kv('Партнёр ' + esc(sp.name), spOk === false ? 'требование не выполняется' : 'требование выполняется', spOk === false ? 'dn' : 'up') : ''}
      ${mp ? kv(esc(mp.major), esc(mp.text)) : ''}
      ${kv('Репутация организации', Math.round(o.rep || 0))}</div>`;
    const secHtml = `<div class="v95-sec">${SECTIONS.map(([k2, l, d]) => `<button type="button" data-nav="${k2}"${k2 === 'team' ? ` data-arg="${esc(t.name)}"` : ''}><b>${l}</b><small>${d}</small></button>`).join('')}</div>`;
    return `<div class="hs-head"><h1>${logo(t.name, 'md')} Рабочее место · ${esc(t.name)}</h1><div class="hs-filters"><span class="hs-sub">Сезон ${season()} · ${fdate(now())}</span></div></div>
      ${kpis(t)}
      <div class="hs-grid2"><div class="hs-col">${box(`Требуют решения · ${items.length}`, todoHtml)}${box('Последний результат', lastHtml)}</div>
      <div class="hs-col">${box('В сезоне', seasonHtml)}${box('Разделы', secHtml)}</div></div>`;
  }
  H.PAGES.desk = deskPage;
  if (Array.isArray(H.NAV_GAME) && !H.NAV_GAME.some(x => x[0] === 'desk')) H.NAV_GAME.unshift(['desk', 'Рабочее место']);
  // сводка на главной в режиме менеджера
  (H.AFTER || []).push(page => {
    if (page !== 'home' || !me()) return;
    try {
      const root = document.getElementById('hs-page'), t = byName(me()); if (!root || !t || root.querySelector('.v95-home')) return;
      const n = todo(t).length, d = document.createElement('div'); d.className = 'v95-home';
      d.innerHTML = box(`${esc(t.name)} · рабочее место`, `${kpis(t)}<p class="hs-note">${n ? `Требуют решения: ${n}.` : 'Решений не требуется.'} <button type="button" class="hs-more" data-nav="desk">открыть рабочее место →</button></p>`);
      root.prepend(d);
    } catch (e) {}
  });

  /* ---------- профиль игрока: вкладки и новые блоки ---------- */
  function findPlayer(nick) {
    const k = String(nick).toLowerCase();
    for (const t of teams) { const p = (t.players || []).find(x => x && String(x.nick).toLowerCase() === k); if (p) return { p, t }; }
    const p = (typeof transferState !== 'undefined' ? transferState.freeAgents || [] : []).find(x => x && String(x.nick).toLowerCase() === k);
    return p ? { p, t: null } : null;
  }
  function extraBoxes(p, t) {
    V.ensurePerson(p);
    let pr = null; try { pr = W.CS2Develop.profile(p); } catch (e) {}
    const lv = V.pow(p), pot = +p.pot || lv;
    const fg = W.V99Scout && W.V99Scout.fog(p);   // v99: менеджер видит чужого игрока с погрешностью скаута
    const dev = `<table class="hs-tbl"><tbody><tr><td class="l">Уровень сейчас</td><td><b>${lv.toFixed(1)}</b></td></tr><tr><td class="l">Потенциал (оценка)</td><td>${fg ? `<span class="v99-range">${fg.pot}</span><span class="v99-fog">±${Math.round(fg.err / 2)}</span>` : pot.toFixed(1)}</td></tr>
      ${pr ? `<tr><td class="l">Тип развития</td><td>${esc(pr.label)}, пик около ${pr.peak} лет</td></tr><tr><td class="l">Реализация потенциала</td><td>${fg ? (fg.real === '?' ? '<span class="v99-fog">неизвестно — нужен отчёт скаута</span>' : `<span class="v99-range">${fg.real}</span>`) : Math.round(pr.real * 100) + '%'}</td></tr>` : ''}
      <tr><td class="l">Возраст</td><td>${p.age || '—'}</td></tr><tr><td class="l">Уверенность</td><td>${Math.round(+p.conf || 60)} / 100</td></tr></tbody></table>
      <p class="hs-note">${(+p.age || 24) < (pr ? pr.peak : 25) ? 'Игрок ещё растёт: тренировки и игровое время важнее всего.' : (+p.age || 24) <= (pr ? pr.peak : 25) + 3 ? 'Пиковые годы: уровень держится, рост — от тренировок и штаба.' : 'После пика: опыт помогает, но скорость и реакция понемногу уходят.'}</p>`;
    let market = 0; try { market = V.salaryOf(p, t); } catch (e) {}
    let value = 0; try { value = V.valueOf(p); } catch (e) {}
    const con = `<table class="hs-tbl"><tbody><tr><td class="l">Клуб</td><td>${t ? esc(t.name) : 'свободный агент'}</td></tr><tr><td class="l">Зарплата за сезон</td><td>${money(+p.salary || 0)}</td></tr>
      <tr><td class="l">Рыночная зарплата</td><td>${money(market)}${market && (+p.salary || 0) < market * 0.6 ? ' <span class="dn">— недоплачивают</span>' : ''}</td></tr><tr><td class="l">Контракт до сезона</td><td>${p.contractUntil || '—'}${(+p.contractUntil || 99) <= season() ? ' <span class="dn">истекает</span>' : ''}</td></tr>
      <tr><td class="l">Оценка стоимости</td><td>${money(value)}</td></tr><tr><td class="l">Мораль</td><td>${Math.round(+p.morale || 85)}</td></tr></tbody></table>`;
    const TL = V.TRAIT_L || {}, bar = v => `<span class="v95-bar"><i style="width:${Math.round(v / 20 * 100)}%"></i></span>`;
    const chr = `<table class="hs-tbl"><tbody>${Object.keys(TL).map(k => { const tf = W.V99Scout && W.V99Scout.trait(p, k); return `<tr><td class="l">${esc(TL[k])}</td><td>${bar(tf ? tf.mid : (+p.pers[k] || 10))} ${tf ? tf.txt : (+p.pers[k] || 10)}</td></tr>`; }).join('')}</tbody></table>
      <p class="hs-note">Характер влияет на события в клубе: амбициозные просят больше денег и трофеев, лидеры спорят с тренером, стрессоустойчивые лучше держат давление прессы.</p>`;
    return [box('Развитие', dev, '', 'v95-x v95-dev'), box('Контракт', con, '', 'v95-x v95-con'), box('Характер', chr, '', 'v95-x v95-chr')];
  }
  // вкладки «Развитие», «Контракт», «Характер» — в общей полосе вкладок профиля (v27: Обзор, Статистика, Карты…)
  const XT = [['v95dev', 'Развитие', 0], ['v95con', 'Контракт', 1], ['v95chr', 'Характер', 2]];
  (H.AFTER || []).push(page => {
    if (page !== 'player') return;
    try {
      const root = document.getElementById('hs-page'), bar = root && root.querySelector('.hs-ptabs'); if (!bar || bar.querySelector('[data-ptab^="v95"]')) return;
      const nick = H.S.arg ? decodeURIComponent(String(H.S.arg).split('/')[0]) : ''; const f = nick && findPlayer(nick); if (!f) return;
      const cmp = bar.querySelector('[data-ptab="compare"]'), tab = H.S.ptab || 'overview';
      XT.forEach(([k, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hs-ptab' + (tab === k ? ' on' : ''); b.dataset.ptab = k; b.textContent = l; if (cmp) bar.insertBefore(b, cmp); else bar.appendChild(b); });
      const x = XT.find(z => z[0] === tab); if (!x) return;
      bar.querySelectorAll('.hs-ptab').forEach(b => b.classList.toggle('on', b.dataset.ptab === tab));
      const html = extraBoxes(f.p, f.t)[x[2]], body = root.querySelector('.hs-ptab-body');
      if (body) body.innerHTML = html; else bar.insertAdjacentHTML('afterend', `<div class="hs-ptab-body">${html}</div>`);
    } catch (e) { console.warn('[v95 dossier]', e); }
  });
  W.CS2Desk = { page: deskPage, todo, nextEvent, lastSeries };
  try { const st = document.createElement('style'); st.textContent = `.v95-kpis em{display:block;font-style:normal;font-size:12px;opacity:.75}.v95-kpis em.up,.v95-last .up{color:#3fb37f}.v95-kpis em.dn,.v95-last .dn{color:#e5574f}
.v95-todo{list-style:none;margin:0;padding:0}.v95-todo li button{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;background:none;border:0;border-left:3px solid #5556;padding:6px 10px;margin:4px 0;color:inherit;cursor:pointer}.v95-todo li.urg button{border-left-color:#e8a33d}.v95-todo small{opacity:.7}
.v95-last{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline}.v95-last span{font-size:20px;font-weight:700}.v95-last small{flex-basis:100%;opacity:.7}
.v95-sec{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}.v95-sec button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:8px 10px;background:#ffffff0d;border:1px solid #ffffff1a;border-radius:6px;color:inherit;cursor:pointer}.v95-sec small{opacity:.7}
.v95-kv>div{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #ffffff12}.v95-kv>div span{opacity:.8}.v95-kv>div b{text-align:right}.v95-kv b.up{color:#3fb37f}.v95-kv b.dn{color:#e5574f}
.v95-tabs{margin:8px 0 12px;flex-wrap:wrap}.v95-bar{display:inline-block;width:90px;height:6px;background:#5553;border-radius:3px;vertical-align:middle}.v95-bar i{display:block;height:100%;background:#e8a33d;border-radius:3px}`; document.head.appendChild(st); } catch (e) {}
})();
