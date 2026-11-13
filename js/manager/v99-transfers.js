/* v99.2 — трансфер менеджера как процесс, с теми же правилами, что и у ИИ, и почта клуба.

   Раньше: переговоры шли по времени (v98), но правила сделки проверялись только при подписании — после всех дней
   ожидания приходило общее «не удалось закрыть». Межсезонье и середина сезона ничем не отличались, ответы клуба и
   агента были видны только на странице «Переговоры».

   Теперь:
   • Правила — при старте переговоров, с причиной: игрок на правах аренды, академия, «вес карьеры» (звезда не идёт в
     клуб ниже своего уровня — та же проверка CS2Stature, что у ИИ), клуб не продаёт ключевого игрока, у продавца нет
     замены под роль среди свободных агентов, некого вывести из вашего состава под эту роль. Нарушение — переговоры
     не начинаются, причина в журнале сделки.
   • Окно: межсезонье 1 декабря — 20 января. Вне окна — «выкуп контракта по ходу сезона»: клуб просит на 25% больше и
     отвечает дольше (3–6 игровых дней вместо 2–4). Тот же коэффициент действует для покупок ИИ по ходу сезона.
   • Сроки: клуб — диапазон дат, агент — 1–2 дня, регистрация — 2–3 дня. Если ваш клуб или продавец в это время играет
     турнир, регистрация переносится на день после турнира (состав заморожен).
   • Каждый ответ (клуб, агент, регистрация, перенос) — письмо в «Почте клуба» (Рабочее место → События и Обзор),
     уведомление «Открыть переговоры» и пауза времени. После согласия клуба о переговорах может узнать пресса (слух).
   API: window.V99Transfers, window.V99Mail. */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31;
  if (!H || !V || typeof seasonState === 'undefined') return;
  const esc = H.esc, DAY = 864e5;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const team = () => H.teamBy(me());
  const money = n => { try { return V.money(n); } catch (e) { return '$' + Math.round(n); } };
  const fdate = ms => { try { return H.fdate(ms); } catch (e) { return new Date(ms).toLocaleDateString('ru-RU'); } };
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const N = () => W.V31Nego;
  const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);
  const names = a => (a || []).map(x => typeof x === 'string' ? x : x && x.name).filter(Boolean);

  /* ------------------------------------------------------------ окно */
  function windowOf(ms) { const d = new Date(ms), y = d.getMonth() === 11 ? d.getFullYear() : d.getFullYear() - 1; return { open: new Date(y, 11, 1).getTime(), close: new Date(y + 1, 0, 20, 23).getTime() }; }
  const inWindow = (ms = now()) => { const w = windowOf(ms); return ms >= w.open && ms <= w.close; };
  const MID_MUL = 1.25;
  function offerRange(n) { return n && n.v99mid ? [3, 6] : [2, 4]; }

  /* ------------------------------------------------------------ почта клуба */
  const MS = () => { const s = seasonState.v99Mail = seasonState.v99Mail || { list: [], seq: 0 }; return s; };
  function mailAdd(m) {
    const s = MS(); const it = Object.assign({ id: 'm' + (++s.seq), ts: now(), read: false }, m);
    s.list.unshift(it); if (s.list.length > 50) s.list.length = 50;
    try { W.v29Toast && W.v29Toast(`<div class="v29-toast-ic">${it.icon || '✉'}</div><div class="v29-toast-t"><small>Почта клуба · ${esc(it.from || '')}</small><b>${esc(it.title)}</b>${it.nav ? `<button type="button" class="hs-btn sm" data-v99mail="${esc(it.id)}">${esc(it.btn || 'Открыть')}</button>` : ''}</div>`); } catch (e) {}
    return it;
  }
  const unread = () => MS().list.filter(x => !x.read && x.team === me());
  function openMail(id) { const it = MS().list.find(x => x.id === id); if (!it) return; it.read = true; if (it.ng) H.S.ng = it.ng; if (it.nav) { const [pg, ...rest] = String(it.nav).split('/'); if (rest.length) H.nav(pg, decodeURIComponent(rest.join('/'))); else H.nav(pg); } }
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-v99mail]'); if (!b) return; e.preventDefault(); openMail(b.dataset.v99mail); try { H.render(); } catch (er) {} });
  function mailList(limit) {
    const l = MS().list.filter(x => x.team === me()).slice(0, limit || 12);
    if (!l.length) return '<p class="hs-note">Писем нет. Здесь появятся ответы клубов и агентов, отчёты скаутов, решения организаторов.</p>';
    return `<ul class="v99-mail">${l.map(x => `<li class="${x.read ? '' : 'new'}"><button type="button" data-v99mail="${esc(x.id)}"><span class="ic">${x.icon || '✉'}</span><span class="tx"><b>${esc(x.title)}</b><small>${esc(x.from || '')} · ${esc(fdate(x.ts))}</small>${x.text ? `<em>${esc(x.text)}</em>` : ''}</span></button></li>`).join('')}</ul>`;
  }
  function pauseTime() {
    if (W.v57BatchCalendarSkip) return;
    try { const l = document.getElementById('pt-skip-l'); if (l && /Пропуск|К матчу/.test(l.textContent || '')) { const b = document.getElementById('pt-skip'); if (b) b.click(); } } catch (e) {}
    try { if (W.v15IsCalendarPaused && !W.v15IsCalendarPaused() && W.toggleGameCalendarPause) W.toggleGameCalendarPause(); } catch (e) {}
  }

  /* ------------------------------------------------------------ правила сделки */
  function findP(nick) { for (const t of H.TEAMS()) { const p = (t.players || []).find(x => x && x.nick === nick); if (p) return { p, t }; } const fa = (transferState.freeAgents || []).find(x => x && x.nick === nick); return fa ? { p: fa, t: null } : null; }
  const UNIQUE = ['AWPer', 'IGL'];
  function outFor(t, p) { const st = (t.players || []).filter(q => q && (!q.status || q.status === 'STARTER')); const same = st.filter(q => q.role === p.role).sort((a, b) => V.pow(a) - V.pow(b))[0]; return same || st.filter(q => !UNIQUE.includes(q.role)).sort((a, b) => V.pow(a) - V.pow(b))[0] || null; }
  function rules(nick) {
    const t = team(), x = findP(nick), out = { ok: true, blocks: [], notes: [], mid: !inWindow() };
    if (!t || !x) { out.ok = false; out.blocks.push('Игрок не найден'); return out; }
    const p = x.p, from = x.t; V.ensurePerson(p);
    if (from && from.name === t.name) { out.ok = false; out.blocks.push('Это ваш игрок'); return out; }
    if (p.onLoan) out.blocks.push('Игрок в аренде — до её окончания переход невозможен.');
    if (t.isAcademy && (+p.age || 25) > 21) out.blocks.push('В академию переходят только игроки до 21 года.');
    try { if (W.CS2Stature && !W.CS2Stature.canJoin(p, t, from)) out.blocks.push(`Агент: ${p.nick} не рассматривает клуб вашего уровня — игроки его статуса идут только в команды выше в рейтинге.`); } catch (e) {}
    // v133: те же правила решения игрока, что и для клубов ИИ (престиж, амбиции, преданность клубу, язык, лидерство, роль)
    try {
      if (W.CS2Expect && !t.isAcademy) {
        const ev = W.CS2Expect.evaluate(p, from, t, { out: outFor(t, p) });
        ev.reasons.filter(r => r.code !== 'PLAYER_LEVEL').forEach(r => out.blocks.push(`Агент: ${r.text}.`));
      }
    } catch (e) {}
    if (from) {
      try { if (W.CS2Stature && W.CS2Stature.protectedIn(p, from) && !p.v31listed) out.blocks.push(`${from.name} не продают ${p.nick}: игрок — лицо клуба.`); } catch (e) {}
      try { if (typeof W.findCompatibleFreeAgent === 'function' && !W.findCompatibleFreeAgent(from, p)) out.blocks.push(`${from.name} не отпустят игрока: на рынке нет замены на роль ${p.role || 'игрока'}.`); } catch (e) {}
      const o = outFor(t, p); if (!o) out.blocks.push(`В вашем составе некого вывести под роль ${p.role}: капитан и снайпер — по одному.`); else out.notes.push(`При переходе ${o.nick} уйдёт на скамейку.`);
      out.notes.push(out.mid ? `Сейчас не межсезонье: это выкуп контракта по ходу сезона — клуб просит на 25% больше и отвечает дольше (3–6 дней).` : 'Межсезонье: обычная цена, клуб отвечает за 2–4 дня.');
    }
    const lk = lockUntil({ from: from ? from.name : null });
    if (lk > now()) out.notes.push(`Сейчас идёт турнир — регистрация контракта пройдёт после него (не раньше ${fdate(lk)}).`);
    out.ok = !out.blocks.length;
    return out;
  }
  // до какого времени состав заморожен: ваш клуб или продавец играют в идущем турнире
  function lockUntil(n) {
    let until = 0; const clubs = [me(), n && n.from].filter(Boolean);
    const ct = CT();
    try { if (ct && !ct.completed && names(ct.participants).some(c => clubs.includes(c))) { const e = +(ct.calendar && ct.calendar.endMs) || 0; until = Math.max(until, e ? e + DAY : now() + 2 * DAY); } } catch (e) {}
    (seasonState.parallelSchedule || []).forEach(ev => { if (ev && ev.status === 'live' && names(ev.participants).some(c => clubs.includes(c))) until = Math.max(until, (+ev.endMs || now() + DAY) + DAY); });
    return until;
  }

  /* ------------------------------------------------------------ старт переговоров с проверкой */
  function start(nick) {
    const r = rules(nick), x = findP(nick);
    if (!r.ok) {
      const n = { id: 'ng' + Date.now().toString(36), nick, from: x && x.t ? x.t.name : null, st: 'failed', rounds: 0, log: ['Переговоры не начались:'].concat(r.blocks), ts: Date.now() };
      N().negs().unshift(n); H.S.ng = n.id; return n;
    }
    const before = N().negs()[0];
    N().startNeg(nick);
    const n = N().negs()[0]; if (!n || n === before) return null;
    if (n.st === 'failed') return n;
    if (r.mid && n.ask) { n.ask = Math.round(n.ask * MID_MUL / 1000) * 1000; n.v99mid = 1; n.log[n.log.length - 1] = `${n.from} готовы обсуждать выкуп контракта по ходу сезона. Ориентир — около ${money(n.ask)}.`; }
    r.notes.forEach(t => n.log.push('ℹ ' + t));
    return n;
  }
  // кнопка «Переговоры» в списке рынка и в профиле
  (function swap() {
    const i = H.CLICKS.findIndex(c => c[0] === '[data-ngstart]');
    const fn = el => { start(el.dataset.ngstart); if (el.hasAttribute('data-ngjump') || H.S.page !== 'negotiate') H.nav('negotiate'); else H.render(); };
    if (i >= 0) H.CLICKS[i] = ['[data-ngstart]', fn]; else H.CLICKS.push(['[data-ngstart]', fn]);
  })();

  /* ------------------------------------------------------------ ответы → почта, пауза, слух */
  function mail(n, kind) {
    const t = me(); if (!t) return;
    const last = n.log[n.log.length - 1] || '';
    const M = {
      offer: () => n.st === 'terms' ? { icon: '✅', from: n.from, title: `${n.from} принимают предложение по ${n.nick}`, text: 'Дальше — условия игрока с его агентом.' }
        : n.st === 'failed' ? { icon: '⛔', from: n.from, title: `${n.from} прекратили переговоры по ${n.nick}`, text: last }
          : { icon: '↩', from: n.from, title: `${n.from}: встречное предложение по ${n.nick}`, text: last },
      terms: () => n.st === 'ready' ? { icon: '✍', from: 'Агент игрока', title: `${n.nick} согласен на условия`, text: 'Осталось подать документы на регистрацию.' }
        : n.st === 'failed' ? { icon: '⛔', from: 'Агент игрока', title: `${n.nick} выбрал другое предложение`, text: last } : { icon: '↩', from: 'Агент игрока', title: `Агент ${n.nick} просит больше`, text: last },
      sign: () => n.st === 'signed' ? { icon: '🤝', from: 'Регистрация', title: `${n.nick} — игрок ${t}`, text: 'Контракт зарегистрирован.' } : { icon: '⚠', from: 'Регистрация', title: `Переход ${n.nick} не состоялся`, text: last },
      lock: () => ({ icon: '🔒', from: 'Регистрация', title: `Регистрация ${n.nick} перенесена`, text: last })
    };
    const m = (M[kind] || M.offer)();
    mailAdd(Object.assign({ team: t, nav: 'negotiate', ng: n.id, btn: 'Открыть переговоры' }, m));
  }
  function settled(n, w, st0) {
    mail(n, w.kind);
    pauseTime();
    // после согласия клуба о сделке узнаёт пресса — слух с источником (может и не случиться)
    if (w.kind === 'offer' && n.st === 'terms' && h32('leak' + n.id) % 2 === 0) {
      try { W.V29News && W.V29News.add({ cat: 'rumor', rumor: true, icon: '🗣️', imp: 5, title: `Источники: ${me()} договорились с ${n.from} о выкупе ${n.nick}`, lead: `Клубы согласовали сумму; теперь всё зависит от условий контракта игрока.`, body: [], tags: [{ t: 'team', v: me() }, { t: 'team', v: n.from }] }); } catch (e) {}
    }
    // подпись не прошла — точная причина вместо общей фразы
    if (w.kind === 'sign' && n.st !== 'signed') { const r = rules(n.nick); if (!r.ok) { n.st = 'failed'; n.log.push('Причина: ' + r.blocks.join(' ')); } }
  }

  /* ------------------------------------------------------------ ИИ: тот же коэффициент выкупа по ходу сезона */
  (function aiFee() {
    const f = W.applyPlayerTransfer; if (typeof f !== 'function' || f.__v99fee) return;
    // сумму сделки ИИ считает v31 по valueOf; по ходу сезона умножаем через __v31UserDeal не трогая сделки менеджера
    const w = function (fromTeam, toTeam, player) {
      if (W.__v31UserDeal || !fromTeam || !toTeam || !player || inWindow()) return f.apply(this, arguments);
      let fee = 0; try { fee = Math.round(V.valueOf(player) * (player.v31listed ? .8 : 1) * MID_MUL / 1000) * 1000; } catch (e) {}
      if (fee) { try { if ((V.org(toTeam.name).budget || 0) - fee < -300000) return false; } catch (e) {} }
      const prev = W.__v99FeeMul; W.__v99FeeMul = MID_MUL;
      try { return f.apply(this, arguments); } finally { W.__v99FeeMul = prev; }
    };
    Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__v99fee = true;
    W.applyPlayerTransfer = w; try { (0, eval)('applyPlayerTransfer = window.applyPlayerTransfer'); } catch (e) {}
  })();

  /* ------------------------------------------------------------ интерфейс */
  (H.AFTER || []).push((pg, arg, root) => {
    if (!root || !me()) return;
    try {
      if (pg === 'negotiate') {
        const n = N().negs().find(x => x.id === H.S.ng) || N().negs().find(x => !['signed', 'failed'].includes(x.st));
        const head = root.querySelector('.hs-head .hs-sub');
        if (head && !head.querySelector('.v99-win')) head.insertAdjacentHTML('beforeend', ` · <span class="v99-chip ${inWindow() ? 'ok' : 'warn'} v99-win">${inWindow() ? 'межсезонье: обычные цены' : 'по ходу сезона: выкуп +25%, ответ 3–6 дн.'}</span>`);
        if (n && n.st === 'failed' && n.log[0] === 'Переговоры не начались:') { const st = root.querySelector('.ng-st'); if (st) st.textContent = 'Не начались'; }
      }
      if (pg === 'inbox') {
        if (root.querySelector('.v99-mailbox')) return;
        const col = root.querySelectorAll('.v96-panel')[1] || root.querySelector('.v96-panel');
        const u = unread().length;
        const html = `<section class="v96-panel v99-mailbox"><h3 class="v96-ph">Почта клуба${u ? ` <b>${u}</b>` : ''}</h3>${mailList(15)}</section>`;
        if (col) col.insertAdjacentHTML('beforebegin', html); else root.insertAdjacentHTML('beforeend', html);
      }
      if (pg === 'desk') {
        if (root.querySelector('.v99-maildesk')) return;
        const l = MS().list.filter(x => x.team === me()); if (!l.length) return;
        const dash = root.querySelector('.ax-dash');
        if (dash) {   // v101: «Главная» v100 — карточка дашборда (раньше блок без ширины ломал сетку)
          dash.insertAdjacentHTML('beforeend', `<section class="ax-card ax-mail v99-maildesk"><header class="ax-h"><h3>Почта клуба</h3>${unread().length ? `<span class="ax-new">${unread().length} новых</span>` : ''}<button type="button" class="ax-link" data-nav="inbox">вся почта</button></header>${mailList(4)}</section>`);
          return;
        }
        const html = `<section class="hs-box v99-maildesk"><header class="hs-box-h"><h3>Почта клуба${unread().length ? ` · ${unread().length} новых` : ''}</h3><button type="button" class="hs-more" data-nav="inbox">вся почта →</button></header><div class="hs-box-b">${mailList(3)}</div></section>`;
        const nb = root.querySelector('.v99-nextbox'); if (nb) nb.insertAdjacentHTML('afterend', html); else { const kp = root.querySelector('.pt-kpis'); if (kp) kp.insertAdjacentHTML('afterend', html); }
      }
    } catch (e) { console.warn('[v99 transfers]', e); }
  });

  // «Продолжить» при паузе ничего не делал (skipGameCalendarDay выходил сразу) — после паузы от уведомления кнопка
  // казалась сломанной. Теперь день сдвигается, а часы остаются на паузе.
  (function skipWhilePaused() {
    const f = W.skipGameCalendarDay; if (typeof f !== 'function' || f.__v99pause) return;
    const w = function () {
      let paused = false; try { paused = !!(W.v15IsCalendarPaused && W.v15IsCalendarPaused()); } catch (e) {}
      if (!paused || typeof W.toggleGameCalendarPause !== 'function') return f.apply(this, arguments);
      W.toggleGameCalendarPause();
      try { return f.apply(this, arguments); } finally { try { if (!W.v15IsCalendarPaused()) W.toggleGameCalendarPause(); } catch (e) {} }
    };
    Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__v99pause = true;
    W.skipGameCalendarDay = w; try { (0, eval)('skipGameCalendarDay = window.skipGameCalendarDay'); } catch (e) {}
  })();

  W.V99Mail = { add: mailAdd, list: () => MS().list, unread, open: openMail };
  W.V99Transfers = { rules, start, offerRange, lockUntil, inWindow, settled, mail, MID_MUL };
})();
