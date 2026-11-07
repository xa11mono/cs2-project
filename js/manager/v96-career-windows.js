/* v96 — окна карьеры: «Требует решения», план тренировок, центр событий.

   Проблема: «Продолжить» (и пропуск N дней) пролистывали события клуба — решение принималось само по таймеру,
   игрок часто даже не видел, что оно было. Теперь:
     • перед пропуском дня/периода, если у менеджерского клуба есть нерешённые события или не утверждён план
       тренировок на неделю, открывается окно «Требует решения»: события и тренировка решаются прямо в нём, по одному;
       когда всё решено (или отложено) — пропуск продолжается;
     • если событие появилось само (во время пропуска или хода времени), календарь останавливается и окно открывается
       сразу — так важное событие не проскакивает;
     • на «Продолжить» висит счётчик нерешённого.
   «Позже» откладывает событие: оно не блокирует «Продолжить» до последних двух дней срока; крестик/Esc — отмена
   (пропуск не выполняется). Решения проходят через прежний движок V31.resolve — игровая логика не менялась.
   Те же карточки событий и панель тренировки используются на страницах «Центр событий» и «Тренировки».
   Значения интерфейса — DESIGN.md (раздел v96). */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31;
  if (!H || !V || typeof seasonState === 'undefined' || typeof teams === 'undefined') return;
  const esc = H.esc, logo = H.logo, DAY = 864e5;
  const $ = id => document.getElementById(id);
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const team = () => H.teamBy(me());
  const weekNo = () => Math.floor(now() / DAY / 7);
  const S = () => { const s = seasonState.v96 = seasonState.v96 || {}; s.trainWeek = s.trainWeek == null ? -1 : s.trainWeek; s.seen = s.seen || {}; s.later = s.later || {}; return s; };
  const save = () => { try { saveSeasonState(); } catch (e) {} try { saveTeams(); } catch (e) {} };
  const fdate = ms => { try { return H.fdate(ms); } catch (e) { return new Date(ms).toLocaleDateString('ru-RU'); } };

  /* ------------------------------------------------------------ события */
  const TYPE_L = { unhappy: 'Игрок', confidence: 'Игрок', captain: 'Команда', veteran: 'Игрок', clash: 'Конфликт', sponsor: 'Спонсор', crisis: 'Финансы', youth: 'Академия', salary: 'Контракт', burnout: 'Здоровье', rift: 'Команда', system: 'Тактика', prepress: 'Пресса' };
  const events = () => (V.S().events || []).filter(e => e.team === me() && e.status === 'open').sort((a, b) => a.until - b.until);
  const left = ev => Math.max(0, Math.ceil((ev.until - now()) / DAY));
  const leftTxt = ev => { const d = left(ev); return d <= 0 ? 'последний день' : d === 1 ? 'остался 1 день' : `осталось ${d} дн.`; };

  function actorsHtml(ev) {
    const ps = (ev.actors || []).map(n => { try { const h = H.playerNow(n); return h && h.p; } catch (e) { return null; } }).filter(Boolean).slice(0, 3);
    if (!ps.length) return '';
    return `<div class="v96-act">${ps.map(p => `<span class="v96-actor"><span class="v96-actor-ph ph">${H.photoHtml ? H.photoHtml(p, true) : ''}</span><b>${esc(p.nick)}</b><small>${esc(p.role || '')} · ${esc(String(p.age || '—'))} лет</small></span>`).join('')}</div>`;
  }
  // карточка события; inline — на странице «Центр событий», иначе — в окне
  function eventCard(ev, o) {
    o = o || {};
    const urgent = left(ev) <= 2;
    return `<article class="v96-ev${o.inline ? ' inline' : ''}" data-v96-ev="${esc(ev.id)}">
      <header class="v96-ev-h"><span class="v96-kind">${esc(TYPE_L[ev.type] || 'Событие')}</span>
        <span class="v96-due${urgent ? ' hot' : ''}" title="Решить до ${esc(fdate(ev.until))}">${urgent ? 'Срочно · ' : ''}${esc(leftTxt(ev))}</span></header>
      <h3>${esc(ev.title)}</h3>${actorsHtml(ev)}<p class="v96-ev-t">${esc(ev.text)}</p>
      <div class="v96-opts">${ev.options.map((x, i) => `<button type="button" class="v96-opt" data-v96ev="${esc(ev.id)}|${esc(x.k)}"><i>${i + 1}</i><span><b>${esc(x.l)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}</span></button>`).join('')}</div></article>`;
  }

  /* ------------------------------------------------------------ тренировки */
  const TRAIN = () => V.TRAIN || {};
  const INT_L = { low: ['Лёгкая', 'Рост навыков ×0.6, усталость −4: команда отдыхает'], normal: ['Обычная', 'Рост навыков ×1, усталость +2'], high: ['Интенсивная', 'Рост навыков ×1.45, усталость +9: сила в матчах падает'] };
  const curPlan = () => { const o = V.org(me()); return o.train || V.aiTrainingPlan(team()); };
  const recPlan = () => { try { return V.aiTrainingPlan(team()); } catch (e) { return null; } };
  const needTraining = () => { try { return !V.auto('training') && S().trainWeek !== weekNo(); } catch (e) { return false; } };
  const mapsList = () => (typeof MAP_POOL !== 'undefined' ? MAP_POOL : []);
  function setTrain(patch) { const o = V.org(me()); o.train = Object.assign({}, o.train || V.aiTrainingPlan(team()), patch, { auto: false }); save(); }

  function trainingPanel(o) {
    o = o || {};
    const tr = curPlan(), rec = recPlan(), T = TRAIN(), dis = V.auto('training');
    const usesMap = !!(T[tr.focus] && T[tr.focus].map);
    const done = S().trainWeek === weekNo();
    const focus = Object.entries(T).map(([k, x]) => `<button type="button" class="v96-tf${tr.focus === k ? ' on' : ''}" data-v96tf="${k}" aria-pressed="${tr.focus === k}"${dis ? ' disabled' : ''}><b>${esc(x.l)}</b><small>${esc(x.hint)}</small>${rec && rec.focus === k ? '<em>рекомендует ассистент</em>' : ''}</button>`).join('');
    const ints = Object.keys(INT_L).map(k => `<button type="button" class="v96-ti${tr.intensity === k ? ' on' : ''}" data-v96ti="${k}" aria-pressed="${tr.intensity === k}"${dis ? ' disabled' : ''}><b>${INT_L[k][0]}</b><small>${INT_L[k][1]}</small></button>`).join('');
    const t = T[tr.focus] || {};
    const eff = [t.attrs ? 'навыки: ' + Object.keys(t.attrs).map(a => ({ firepower: 'огонь', tacticalIQ: 'тактика', clutch: 'клатч', utility: 'утилити' }[a] || a)).join(', ') : '', t.chem ? 'сыгранность' : '', t.map ? 'карта' : '', t.conf ? 'уверенность' : ''].filter(Boolean).join(' · ');
    return `<div class="v96-train${o.compact ? ' compact' : ''}">
      <section><h4>Фокус недели</h4><div class="v96-tfs">${focus}</div></section>
      <section><h4>Интенсивность</h4><div class="v96-tis">${ints}</div>
        <label class="v96-map${usesMap ? '' : ' off'}"><span>Карта для практики</span><select data-v96tm${dis || !usesMap ? ' disabled' : ''}>${mapsList().map(m => `<option${tr.map === m ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
        <p class="v96-sum"><b>${esc(t.l || '—')}</b> · ${esc(INT_L[tr.intensity] ? INT_L[tr.intensity][0].toLowerCase() : '')}${eff ? ` · ${esc(eff)}` : ''}</p>
        ${o.confirm ? `<button type="button" class="v96-go" data-v96trok>${done ? 'План утверждён — изменить' : 'Утвердить план'}</button>` : ''}
        ${dis ? '<p class="v96-note">Тренировки выбирает ИИ (Режим игры → Делегирование).</p>' : ''}</section></div>`;
  }

  /* ------------------------------------------------------------ окно */
  let gate = null, pausedByMe = false;
  const deferredOk = ev => !S().later[ev.id] || left(ev) <= 2;
  const blockers = () => {
    const out = events().filter(deferredOk).map(e => ({ k: 'ev', id: e.id }));
    if (needTraining()) out.push({ k: 'train' });
    return out;
  };
  const isRunning = () => { const l = $('pt-skip-l'); return !!l && /Пропуск|К матчу/.test(l.textContent || ''); };
  const modalOpen = () => [...document.querySelectorAll('.modal-backdrop,#v84-legacy-modal,#dice-modal')].some(m => { const c = getComputedStyle(m); return c.display !== 'none' && c.visibility !== 'hidden'; });

  function open(then) {
    if (gate) return;
    gate = { then: then || null, queue: blockers(), i: 0, result: null };
    if (!gate.queue.length) { gate = null; if (then) then(); return; }
    gate.queue.forEach(it => { if (it.k === 'ev') S().seen[it.id] = 1; });
    let root = $('v96-gate'); if (!root) { root = document.createElement('div'); root.id = 'v96-gate'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Требует решения'); document.body.appendChild(root); }
    root.hidden = false; paint();
    setTimeout(() => { const b = root.querySelector('.v96-opt,.v96-tf.on,.v96-go'); if (b) b.focus(); }, 30);
  }
  function close(proceed) {
    const g = gate; gate = null; const root = $('v96-gate'); if (root) root.hidden = true;
    if (pausedByMe) { pausedByMe = false; try { if (W.toggleGameCalendarPause && W.v15IsCalendarPaused && W.v15IsCalendarPaused()) W.toggleGameCalendarPause(); } catch (e) {} }
    save(); try { H.render(); } catch (e) {}
    if (proceed && g && g.then) setTimeout(g.then, 30);
  }
  function current() {
    while (gate && gate.i < gate.queue.length) {
      const it = gate.queue[gate.i];
      if (it.k === 'ev') { if (gate.result) return { it }; const ev = events().find(e => e.id === it.id); if (ev) return { it, ev }; gate.i++; continue; }
      return { it };
    }
    return null;
  }
  function next() { gate.i++; gate.result = null; if (!current()) return close(true); paint(); focusFirst(); }
  function focusFirst() { setTimeout(() => { const r = $('v96-gate'), b = r && r.querySelector('.v96-opt,.v96-tf.on,.v96-go'); if (b) b.focus(); }, 30); }

  function paint() {
    const root = $('v96-gate'); if (!root || !gate) return;
    const cur = current(); if (!cur) return close(true);
    const n = gate.queue.length, club = me(), last = gate.i >= n - 1;
    const steps = gate.queue.map((_, i) => `<i class="${i < gate.i ? 'done' : i === gate.i ? 'on' : ''}"></i>`).join('');
    let body, foot;
    if (gate.result) {
      body = `<div class="v96-res"><span class="v96-kind ok">Решение принято</span><h3>${esc(gate.result.title)}</h3><p class="v96-ev-t">${esc(gate.result.text)}</p></div>`;
      foot = `<span></span><button type="button" class="v96-go" data-v96next>${last ? (gate.then ? 'Продолжить игру' : 'Готово') : 'Дальше'}</button>`;
    } else if (cur.it.k === 'ev') {
      body = eventCard(cur.ev);
      foot = `<small class="v96-hint">Клавиши 1–${cur.ev.options.length} — выбрать вариант</small><button type="button" class="v96-later" data-v96later="${esc(cur.ev.id)}">Решить позже</button>`;
    } else {
      body = `<article class="v96-ev"><header class="v96-ev-h"><span class="v96-kind">Тренировка</span><span class="v96-due">неделя ${weekNo() % 100}</span></header><h3>План тренировок на неделю</h3><p class="v96-ev-t">Выберите фокус и интенсивность. Эффект применяется раз в игровую неделю; план действует, пока вы его не измените.</p>${trainingPanel({ compact: true })}</article>`;
      foot = `<small class="v96-hint">Рекомендация ассистента помечена в списке</small><span class="v96-foot-b"><button type="button" class="v96-later" data-v96trkeep>Оставить как есть</button><button type="button" class="v96-go" data-v96trok>Утвердить план</button></span>`;
    }
    root.innerHTML = `<div class="v96-back" data-v96close></div><div class="v96-win">
      <header class="v96-win-h"><span class="v96-win-logo">${logo(club, 'lg')}</span><div class="v96-win-t"><h2>Требует решения</h2><small>${esc(club)} · ${esc(fdate(now()))}</small></div>
        ${n > 1 ? `<span class="v96-steps" aria-label="Шаг ${gate.i + 1} из ${n}">${steps}<b>${gate.i + 1} / ${n}</b></span>` : ''}
        <button type="button" class="v96-x" data-v96close aria-label="Отмена: не продолжать">✕</button></header>
      <div class="v96-win-b">${body}</div><footer class="v96-win-f">${foot}</footer></div>`;
  }

  /* ------------------------------------------------------------ действия */
  function decide(id, k) {
    const ev = events().find(e => e.id === id), r = V.resolve(id, k); if (!r.ok) { alert(r.why || 'Не удалось'); return false; }
    const opt = ev && ev.options.find(o => o.k === k);
    save();
    if (gate) { gate.result = { title: ev ? ev.title : '', text: `${opt ? opt.l : ''}${r.res ? ' — ' + r.res : ''}` }; paint(); focusFirst(); }
    return true;
  }
  H.CLICKS.push(['[data-v96ev]', el => {
    const [id, k] = el.dataset.v96ev.split('|');
    if (gate) { decide(id, k); return; }
    // страница «Центр событий»: решение на месте, карточка уступает место следующей
    const r = V.resolve(id, k); if (!r.ok) alert(r.why || 'Не удалось'); save(); H.render();
  }]);
  H.CLICKS.push(['[data-v96tf]', el => { setTrain({ focus: el.dataset.v96tf }); refreshTrain(); }]);
  H.CLICKS.push(['[data-v96ti]', el => { setTrain({ intensity: el.dataset.v96ti }); refreshTrain(); }]);
  H.CLICKS.push(['[data-v96trok]', () => { S().trainWeek = weekNo(); save(); if (gate) next(); else H.render(); }]);
  document.addEventListener('change', e => { if (e.target && e.target.matches && e.target.matches('[data-v96tm]')) { setTrain({ map: e.target.value }); refreshTrain(); } });
  function refreshTrain() { if (gate) { const b = $('v96-gate').querySelector('.v96-win-b'), sc = b ? b.scrollTop : 0; paint(); const nb = $('v96-gate').querySelector('.v96-win-b'); if (nb) nb.scrollTop = sc; } else H.render(); }

  // обработчики окна — на самом окне, а не через H.CLICKS: окно лежит вне #hs-root
  document.addEventListener('click', e => {
    const root = $('v96-gate'); if (!root || root.hidden || !root.contains(e.target)) return;
    const t = e.target;
    let el;
    if ((el = t.closest('[data-v96ev]'))) { const [id, k] = el.dataset.v96ev.split('|'); decide(id, k); return; }
    if ((el = t.closest('[data-v96tf]'))) { setTrain({ focus: el.dataset.v96tf }); refreshTrain(); return; }
    if ((el = t.closest('[data-v96ti]'))) { setTrain({ intensity: el.dataset.v96ti }); refreshTrain(); return; }
    if (t.closest('[data-v96trok]')) { S().trainWeek = weekNo(); save(); next(); return; }
    if (t.closest('[data-v96trkeep]')) { S().trainWeek = weekNo(); save(); next(); return; }
    if ((el = t.closest('[data-v96later]'))) { S().later[el.dataset.v96later] = 1; next(); return; }
    if (t.closest('[data-v96next]')) { next(); return; }
    if (t.closest('[data-v96close]')) { close(false); return; }
  });
  document.addEventListener('change', e => { const root = $('v96-gate'); if (root && !root.hidden && e.target.matches && e.target.matches('[data-v96tm]')) { setTrain({ map: e.target.value }); refreshTrain(); } });
  document.addEventListener('keydown', e => {
    const root = $('v96-gate'); if (!gate || !root || root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(false); return; }
    if (e.key === 'Tab') { const f = [...root.querySelectorAll('button:not([disabled]),select:not([disabled])')].filter(x => x.offsetParent); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } else if (!root.contains(document.activeElement)) { e.preventDefault(); a.focus(); } return; }
    if (/^[1-9]$/.test(e.key) && !gate.result && !/SELECT|INPUT/.test((document.activeElement || {}).tagName || '')) { const b = root.querySelectorAll('.v96-opt')[+e.key - 1]; if (b) { e.preventDefault(); b.click(); } }
  });

  /* ------------------------------------------------------------ «Продолжить» не пролистывает решения */
  let bypass = false;
  W.addEventListener('click', e => {
    if (bypass || !me()) return;
    const el = e.target && e.target.closest && e.target.closest('#pt-skip,[data-skipn],[data-skipt1]'); if (!el) return;
    if (el.id === 'pt-skip' && isRunning()) return;                                // во время пропуска кнопка — «Стоп»
    if (gate) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!blockers().length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    document.querySelectorAll('.pt-dd.open').forEach(x => x.classList.remove('open'));
    open(() => { bypass = true; try { el.click(); } finally { bypass = false; } });
  }, true);

  // событие появилось само (ход времени, пропуск): останавливаем время и показываем окно
  setInterval(() => {
    const c = $('pt-skip'); const n = me() ? blockers().length : 0;
    if (c) { if (n) c.setAttribute('data-pending', n > 9 ? '9+' : String(n)); else c.removeAttribute('data-pending'); }
    if (!me() || gate || document.visibilityState === 'hidden') return;
    const fresh = events().filter(ev => !S().seen[ev.id] && deferredOk(ev));
    if (!fresh.length || modalOpen()) return;
    if (isRunning()) { const b = $('pt-skip'); if (b) b.click(); }
    try { if (W.v15IsCalendarPaused && !W.v15IsCalendarPaused() && W.toggleGameCalendarPause) { W.toggleGameCalendarPause(); pausedByMe = true; } } catch (e) {}
    open(null);
  }, 700);

  /* ------------------------------------------------------------ страницы */
  const gateOrPick = fn => arg => (me() && team()) ? fn(arg) : (W.V96Pick ? W.V96Pick.html() : '');
  H.PAGES.inbox = gateOrPick(() => {
    const c = V.S(), list = c.events.filter(e => e.team === me()), open_ = events(), done = list.filter(e => e.status !== 'open').slice(0, 30);
    const hist = done.map(e => { const ch = (e.options.find(o => o.k === e.choice) || {}).l || '—'; return `<li><time>${esc(H.ndate ? H.ndate(e.ts) : fdate(e.ts))}</time><b>${esc(e.title)}</b><span>${esc(ch)}${e.status === 'expired' ? ' · срок истёк, решение принято автоматически' : ''}${e.result ? `<small>${esc(e.result)}</small>` : ''}</span></li>`; }).join('');
    return `<div class="v96-page"><div class="v96-cols2">
      <section class="v96-panel"><h3 class="v96-ph">Требуют решения <b>${open_.length}</b></h3>
        ${open_.length ? open_.map(e => eventCard(e, { inline: true })).join('') : '<div class="v96-empty"><b>Всё решено</b><p>События появляются из состояния команды: результатов, характера игроков, финансов и спонсора. Время остановится само, когда появится новое.</p></div>'}</section>
      <section class="v96-panel"><h3 class="v96-ph">Принятые решения</h3>${hist ? `<ul class="v96-hist">${hist}</ul>` : '<div class="v96-empty"><p>История пуста.</p></div>'}</section></div></div>`;
  });
  H.PAGES.training = gateOrPick(() => {
    const t = team(), o = V.org(t.name), season = Number(seasonState.currentSeason) || 1;
    const rows = (t.players || []).filter(p => p && p.status !== 'BENCH').slice(0, 5).map(p => { V.ensurePerson(p); const g = p.v31tg && p.v31tg.s === season ? p.v31tg.sum : 0, fat = Math.round(+p.fatigue || 0);
      return `<tr data-player="${esc(p.nick)}"><td class="l"><span class="v96-nm">${H.pFlag ? H.pFlag(p) : ''}<b>${esc(p.nick)}</b><small>${esc(p.role || '')}</small></span></td><td>${Math.round(+p.firepower)}</td><td>${Math.round(+p.tacticalIQ)}</td><td>${Math.round(+p.clutch)}</td><td>${Math.round(+p.utility)}</td>
        <td><span class="v96-bar ${fat >= 60 ? 'hi' : ''}"><i style="width:${Math.min(100, fat)}%"></i></span><small>${fat}</small></td><td class="l"><span class="v96-bar gain"><i style="width:${Math.min(100, g / 3 * 100)}%"></i></span><small>+${g.toFixed(2)}</small></td></tr>`; }).join('');
    const chem = Math.round(V.chemistry(t) * 100);
    const mp = Object.entries(t.v31map || {}).filter(([, v]) => v > .2).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const done = S().trainWeek === weekNo();
    return `<div class="v96-page"><div class="v96-status ${done ? 'ok' : 'warn'}"><b>${done ? 'План недели утверждён' : 'План недели ещё не утверждён'}</b><span>${done ? 'Эффект применится в конце игровой недели.' : 'Выберите фокус и нажмите «Утвердить план» — иначе «Продолжить» напомнит об этом.'}</span></div>
      <section class="v96-panel wide"><h3 class="v96-ph">План тренировок</h3>${trainingPanel({ confirm: true })}</section>
      <div class="v96-cols2 even"><section class="v96-panel"><h3 class="v96-ph">Игроки</h3><table class="v96-tbl"><thead><tr><th class="l">Игрок</th><th>Огонь</th><th>Такт.</th><th>Клатч</th><th>Утил.</th><th>Усталость</th><th class="l">Рост за сезон</th></tr></thead><tbody>${rows}</tbody></table></section>
        <section class="v96-panel"><h3 class="v96-ph">Сыгранность</h3><div class="v96-chem"><b>${chem}%</b><span class="v96-bar big"><i style="width:${chem}%"></i></span></div>
          <p class="v96-note">Время вместе (до ~8 месяцев), коммуникация и лидерство. Новичок обнуляет свою часть.</p>
          <h3 class="v96-ph sub">Практика карт</h3>${mp.length ? mp.map(([m, v]) => `<div class="v96-map-r"><span>${esc(m)}</span><span class="v96-bar"><i style="width:${Math.min(100, v * 10)}%"></i></span><b>+${v.toFixed(1)}</b></div>`).join('') : '<p class="v96-note">Нет натренированных карт.</p>'}</section></div></div>`;
  });

  W.V96Windows = { open, blockers, events, eventCard, trainingPanel, needTraining, state: S };
  console.info('[v96] окна карьеры: решения перед «Продолжить», тренировки, события');
})();
