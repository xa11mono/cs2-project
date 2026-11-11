/* v98 — управление составом и сделки по времени.

   1) Страница «Состав» (#/squad): пятёрка и скамейка клуба менеджера. Роль любого игрока меняется списком
      (капитан и снайпер — по одному на команду: прежний владелец роли становится рифлером), игроков основы и скамейки
      можно менять местами, запасного — отпустить. Купленный игрок больше не «съедает» прежнего молча: тот остаётся
      на скамейке клуба, пока менеджер сам его не отпустит (раньше через два рыночных тика уходил в свободные агенты).
   2) Переговоры идут по игровому времени: клуб отвечает на предложение, агент — на условия, контракт регистрируется
      не мгновенно. Пока ответа нет, повторно отправить нельзя; запрос можно отозвать. Логика самих ответов прежняя
      (V31Nego.offer / terms / sign) — меняется только момент, когда они происходят.
   3) Тренировки: шесть основных упражнений с иконками, остальные — под «Все упражнения».
   Значения интерфейса — DESIGN.md (раздел v98), стили — css/v98-squad.css. */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31, N = W.V31Nego;
  if (!H || !V || typeof seasonState === 'undefined' || typeof transferState === 'undefined') return;
  const esc = H.esc, DAY = 864e5;
  const $ = id => document.getElementById(id);
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const team = () => H.teamBy(me());
  const save = () => { try { saveTeams(); } catch (e) {} try { saveSeasonState(); } catch (e) {} try { if (typeof saveTransferState === 'function') saveTransferState(); } catch (e) {} };
  const fdate = ms => { try { return H.fdate(ms); } catch (e) { return new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); } };
  const money = v => '$' + Math.round(v || 0).toLocaleString('en-US');
  const lc = s => String(s || '').toLowerCase();
  const pow = p => { try { return V.pow(p); } catch (e) { return 0; } };
  const hash = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

  /* ============================================================ состав */
  const ROLES = [['IGL', 'Капитан (IGL)'], ['AWPer', 'Снайпер (AWP)'], ['Entry-fragger', 'Энтри'], ['Rifler', 'Рифлер'], ['Support', 'Поддержка'], ['Lurker', 'Люркер']];
  const UNIQUE = { IGL: 1, AWPer: 1 };
  const roleL = r => (ROLES.find(x => x[0] === r) || [r, r || '—'])[1];
  const fa = () => (transferState.freeAgents = transferState.freeAgents || []);
  const benchOf = name => fa().filter(p => p && (p.benchFrom === name || p.reservedFor === name) && !(H.teamBy(name).players || []).some(q => lc(q.nick) === lc(p.nick)));
  const starters = t => (t.players || []).filter(p => p && p.nick);

  // скамейка клуба менеджера не распускается сама: снимаем её с таймера «скамейка → свободный агент» и закрепляем за клубом
  function keepBench() {
    const name = me(); if (!name) return;
    try { const m = transferState; if (Array.isArray(m.v30Bench)) m.v30Bench = m.v30Bench.filter(b => b.team !== name); } catch (e) {}
    benchOf(name).forEach(p => { p.status = 'BENCH'; p.benchFrom = name; p.reservedFor = name; });
  }
  function setRole(nick, role) {
    const t = team(); if (!t) return { ok: false, why: 'Нет клуба' };
    const p = starters(t).find(x => x.nick === nick) || benchOf(t.name).find(x => x.nick === nick); if (!p) return { ok: false, why: 'Игрок не найден' };
    if (!ROLES.some(r => r[0] === role)) return { ok: false, why: 'Неизвестная роль' };
    if (p.role === role) return { ok: true, note: '' };
    let note = '';
    if (UNIQUE[role] && starters(t).includes(p)) {
      const prev = starters(t).find(x => x !== p && x.role === role);
      if (prev) { prev.role = 'Rifler'; prev.v98role = 'Rifler'; note = `${prev.nick} теперь рифлер`; }
    }
    const was = p.role; p.role = role; p.v98role = role;
    if (role === 'IGL' || was === 'IGL') { try { V.careerLog(`Капитан: ${role === 'IGL' ? p.nick : 'роль снята с ' + p.nick}`); } catch (e) {} }
    save(); return { ok: true, note };
  }
  // поменять местами игрока основы и запасного
  function swap(outNick, inNick) {
    const t = team(); if (!t) return { ok: false, why: 'Нет клуба' };
    const out = starters(t).find(x => x.nick === outNick), inc = benchOf(t.name).find(x => x.nick === inNick);
    if (!out || !inc) return { ok: false, why: 'Игрок не найден' };
    const i = fa().indexOf(inc); if (i < 0) return { ok: false, why: 'Запасной недоступен' };
    fa().splice(i, 1);
    const np = JSON.parse(JSON.stringify(inc)); Object.assign(np, { status: 'STARTER', v31team: t.name, v31since: now() }); delete np.benchFrom; delete np.reservedFor;
    // единственные роли: новичок не может продублировать капитана или снайпера — берёт роль ушедшего либо становится рифлером
    if (UNIQUE[np.role] && starters(t).some(x => x !== out && x.role === np.role)) np.role = UNIQUE[out.role] ? out.role : 'Rifler';
    t.players[t.players.indexOf(out)] = np;
    Object.assign(out, { status: 'BENCH', benchFrom: t.name, reservedFor: t.name }); fa().push(out);
    try { V.ensurePerson(np); V.careerLog(`Замена: ${np.nick} в основе, ${out.nick} на скамейке`); } catch (e) {}
    try { W.v29Emit && W.v29Emit('bench', { player: out.nick, role: out.role, from: t.name, to: 'Скамейка', reason: `решение менеджера: в основу возвращён ${np.nick}` }); } catch (e) {}
    keepBench(); save(); return { ok: true };
  }
  function release(nick) {
    const t = team(), p = t && benchOf(t.name).find(x => x.nick === nick); if (!p) return { ok: false, why: 'Игрок не найден' };
    p.status = 'FREE AGENT'; delete p.benchFrom; delete p.reservedFor; p.v84FaSince = now(); p.v84FaTeam = t.name;
    try { V.careerLog(`${p.nick} отпущен из клуба`); W.v29Emit && W.v29Emit('release', { player: p.nick, role: p.role, from: t.name, to: 'Свободный агент', reason: 'решение менеджера' }); } catch (e) {}
    save(); return { ok: true };
  }
  // роль, выбранная менеджером, не откатывается чужими модулями
  function guardRoles() { const t = team(); if (!t) return; starters(t).forEach(p => { if (p.v98role && p.role !== p.v98role && ROLES.some(r => r[0] === p.v98role)) p.role = p.v98role; }); }

  const ATTR = [['firepower', 'Огонь'], ['tacticalIQ', 'Тактика'], ['clutch', 'Клатч'], ['utility', 'Гранаты']];
  const face = p => `<span class="v98-face ph">${H.photoHtml ? H.photoHtml(p, true) : ''}</span>`;
  const bars = p => `<span class="v98-attrs">${ATTR.map(([k, l]) => { const v = Math.round(+p[k] || 0); return `<span title="${l}: ${v}"><small>${l}</small><i><b style="width:${Math.max(4, Math.min(100, (v - 40) / 60 * 100))}%"></b></i><em>${v}</em></span>`; }).join('')}</span>`;
  function problems(t) {
    const s = starters(t), out = [];
    if (s.length < 5) out.push(`В основе ${s.length} из 5 игроков — подпишите игрока или верните запасного.`);
    if (!s.some(p => p.role === 'IGL')) out.push('В основе нет капитана: назначьте IGL — без него падает тактика команды.');
    if (!s.some(p => p.role === 'AWPer')) out.push('В основе нет снайпера.');
    return out;
  }
  H.PAGES.squad = function () {
    const t = team(); if (!me() || !t) return W.V96Pick ? W.V96Pick.html() : '';
    keepBench(); guardRoles();
    const s = starters(t), b = benchOf(t.name), msg = H.S.v98msg || ''; H.S.v98msg = '';
    const roleSel = p => `<select class="hs-inp sm" data-v98role="${esc(p.nick)}" aria-label="Роль ${esc(p.nick)}">${ROLES.map(([k, l]) => `<option value="${k}"${p.role === k ? ' selected' : ''}>${l}</option>`).join('')}${ROLES.some(r => r[0] === p.role) ? '' : `<option selected>${esc(p.role || '—')}</option>`}</select>`;
    const row = p => { V.ensurePerson(p);
      return `<li class="v98-row${p.role === 'IGL' ? ' cap' : ''}"><button type="button" class="v98-who" data-player="${esc(p.nick)}">${face(p)}<span><b>${H.pFlag ? H.pFlag(p) : ''} ${esc(p.nick)}</b><small>${esc(String(p.age || '—'))} лет · сила ${pow(p).toFixed(1)}${p.role === 'IGL' ? ' · капитан' : ''}</small></span></button>
        ${bars(p)}${roleSel(p)}
        ${b.length ? `<select class="hs-inp sm v98-swap" data-v98out="${esc(p.nick)}" aria-label="Заменить ${esc(p.nick)}"><option value="">На скамейку…</option>${b.map(q => `<option value="${esc(q.nick)}">вместо него — ${esc(q.nick)}</option>`).join('')}</select>` : '<span class="v98-nosub" title="Скамейка пуста: посадить игрока можно, когда есть замена">нет замены</span>'}</li>`; };
    const brow = p => { V.ensurePerson(p);
      return `<li class="v98-row bench"><button type="button" class="v98-who" data-player="${esc(p.nick)}">${face(p)}<span><b>${H.pFlag ? H.pFlag(p) : ''} ${esc(p.nick)}</b><small>${esc(roleL(p.role))} · ${esc(String(p.age || '—'))} лет · сила ${pow(p).toFixed(1)}</small></span></button>
        ${bars(p)}
        <select class="hs-inp sm v98-swap" data-v98in="${esc(p.nick)}" aria-label="Вернуть ${esc(p.nick)} в основу"><option value="">В основу…</option>${s.map(q => `<option value="${esc(q.nick)}">вместо ${esc(q.nick)} (${esc(roleL(q.role))})</option>`).join('')}</select>
        <button type="button" class="hs-btn sm ghost" data-v98rel="${esc(p.nick)}">Отпустить</button></li>`; };
    const pr = problems(t);
    return `<div class="hs-head"><h1>Состав</h1><div class="hs-filters"><span class="hs-sub">${esc(t.name)} · основа ${s.length}/5 · скамейка ${b.length}</span></div></div>
      <div class="v98-squad">${pr.map(x => `<p class="v98-warn">${esc(x)}</p>`).join('')}${msg ? `<p class="v98-ok" role="status">${esc(msg)}</p>` : ''}
        <section class="v98-box"><h3>Основа</h3><ul class="v98-list">${s.map(row).join('')}</ul></section>
        <section class="v98-box"><h3>Скамейка <small>${b.length}</small></h3>${b.length ? `<ul class="v98-list">${b.map(brow).join('')}</ul>` : '<div class="v96-empty"><p>На скамейке никого. Игрок, которого заменил новичок, остаётся здесь — вы решаете, вернуть его или отпустить.</p></div>'}</section>
        <p class="hs-note">Капитан и снайпер — по одному на команду: если назначить вторую такую роль, прежний игрок станет рифлером. Замена сбрасывает сыгранность вошедшего игрока.</p></div>`;
  };
  if (Array.isArray(H.NAV_GAME) && !H.NAV_GAME.some(x => x[0] === 'squad')) { const i = H.NAV_GAME.findIndex(x => x[0] === 'training'); H.NAV_GAME.splice(i >= 0 ? i : 1, 0, ['squad', 'Состав']); }
  // пункт в скрытом меню «Игра», из которого оболочка строит боковое меню
  function navItem() { const m = document.querySelector('#hs-root .pt-menu[data-menu="game"]'); if (!m || m.querySelector('[data-nav="squad"]')) return; const b = document.createElement('button'); b.type = 'button'; b.dataset.nav = 'squad'; b.textContent = 'Состав'; const ref = m.querySelector('[data-nav="training"]'); m.insertBefore(b, ref || null); }
  document.addEventListener('change', e => {
    const t = e.target; if (!t || !t.matches || !t.closest('#hs-root')) return;
    if (t.matches('[data-v98role]')) { const r = setRole(t.dataset.v98role, t.value); H.S.v98msg = r.ok ? `${t.dataset.v98role}: ${roleL(t.value)}${r.note ? ' · ' + r.note : ''}` : (r.why || ''); H.render(); }
    else if (t.matches('[data-v98out]') && t.value) { const r = swap(t.dataset.v98out, t.value); H.S.v98msg = r.ok ? `${t.value} в основе, ${t.dataset.v98out} на скамейке` : (r.why || ''); H.render(); }
    else if (t.matches('[data-v98in]') && t.value) { const r = swap(t.value, t.dataset.v98in); H.S.v98msg = r.ok ? `${t.dataset.v98in} в основе, ${t.value} на скамейке` : (r.why || ''); H.render(); }
  });
  H.CLICKS.push(['[data-v98rel]', el => { if (!confirm(`Отпустить ${el.dataset.v98rel}? Игрок станет свободным агентом, вернуть его можно будет только новыми переговорами.`)) return; const r = release(el.dataset.v98rel); H.S.v98msg = r.ok ? `${el.dataset.v98rel} отпущен` : (r.why || ''); H.render(); }]);

  /* ============================================================ переговоры по времени */
  // сроки ответа в игровых днях: клуб думает дольше при дорогом игроке, агент отвечает быстрее, регистрация контракта — 2–3 дня
  // v99.2: по ходу сезона клуб отвечает дольше (3–6 дней), в межсезонье — 2–4; диапазон виден менеджеру, точный день — нет
  const RANGE = n => (W.V99Transfers && W.V99Transfers.offerRange(n)) || [2, 4];
  const WAIT = { offer: n => { const r = RANGE(n); return r[0] + hash('o' + n.nick + n.rounds) % (r[1] - r[0] + 1); }, terms: n => 1 + hash('t' + n.nick + (n.tries || 0)) % 2, sign: n => 2 + hash('s' + n.nick) % 2 };
  const WAIT_L = { offer: 'Клуб рассматривает предложение', terms: 'Агент обсуждает условия с игроком', sign: 'Контракт регистрируется' };
  const negs = () => { try { return N.negs(); } catch (e) { return []; } };
  function queue(id, kind, args) {
    const n = negs().find(x => x.id === id); if (!n || n.wait) return false;
    if ((kind === 'offer' && n.st !== 'offer') || (kind === 'terms' && n.st !== 'terms') || (kind === 'sign' && n.st !== 'ready')) return false;
    const days = WAIT[kind](n);
    n.wait = { kind, args, since: now(), due: now() + days * DAY };
    const rg = RANGE(n);
    n.log.push(kind === 'offer' ? `Предложение ${money(args[0])} отправлено. Клуб ответит ориентировочно через ${rg[0]}–${rg[1]} дн. (${fdate(n.wait.since + rg[0] * DAY)} — ${fdate(n.wait.since + rg[1] * DAY)}).`
      : kind === 'terms' ? `Условия (${money(args[0])} за сезон, ${args[1]} сез.) переданы агенту. Ответ — до ${fdate(n.wait.due)}.`
        : `Документы поданы. Игрок присоединится ${fdate(n.wait.due)}.`);
    save(); return true;
  }
  function settle() {
    if (!N) return 0; let done = 0;
    negs().forEach(n => {
      const w = n.wait; if (!w || now() < w.due) return;
      // v99.2: регистрация не проходит, пока клуб играет турнир (ростер-лок) — переносится на день после турнира
      if (w.kind === 'sign' && W.V99Transfers) { const lock = W.V99Transfers.lockUntil(n); if (lock > now()) { w.due = lock; if (!w.locked) { w.locked = 1; n.log.push(`Регистрация перенесена: идёт турнир, состав заморожен. Игрок присоединится ${fdate(lock)}.`); try { W.V99Transfers.mail(n, 'lock'); } catch (e) {} } return; } }
      delete n.wait;
      const st0 = n.st;
      try { if (w.kind === 'offer') N.offer(n.id, w.args[0]); else if (w.kind === 'terms') N.terms(n.id, w.args[0], w.args[1]); else { N.sign(n.id); if (n.st === 'signed') keepBench(); } } catch (e) { console.warn('[v98 nego]', e); }
      done++;
      try { V.careerLog && w.kind === 'sign' && n.st === 'signed' && V.careerLog(`Трансфер завершён: ${n.nick}`); } catch (e) {}
      try { W.V99Transfers && W.V99Transfers.settled(n, w, st0); } catch (e) { console.warn('[v99 transfers]', e); }
    });
    if (done) { save(); if (H.S.page === 'negotiate' || H.S.page === 'squad' || H.S.page === 'desk') { try { H.render(); } catch (e) {} } }
    return done;
  }
  function recall(id) { const n = negs().find(x => x.id === id); if (!n || !n.wait) return; n.log.push(n.wait.kind === 'sign' ? 'Регистрация контракта остановлена.' : 'Запрос отозван.'); delete n.wait; save(); }
  if (N) {
    // прежние обработчики кнопок отправляли ответ мгновенно — заменяем их постановкой в очередь
    const swapClick = (sel, fn) => { const i = H.CLICKS.findIndex(x => x[0] === sel); if (i >= 0) H.CLICKS[i] = [sel, fn]; else H.CLICKS.push([sel, fn]); };
    const q = s => document.querySelector('#hs-root ' + s);
    swapClick('[data-ngoffer]', el => { const v = +(q('[data-ngamt]') || {}).value || 0; const o = V.org(me()); if (v > o.budget + 300000) { N.offer(el.dataset.ngoffer, v); } else queue(el.dataset.ngoffer, 'offer', [v]); H.render(); });
    swapClick('[data-ngterms]', el => { queue(el.dataset.ngterms, 'terms', [+(q('[data-ngsal]') || {}).value || 0, +(q('[data-ngyrs]') || {}).value || 2]); H.render(); });
    swapClick('[data-ngsign]', el => { queue(el.dataset.ngsign, 'sign', []); H.render(); });
    H.CLICKS.push(['[data-v98recall]', el => { recall(el.dataset.v98recall); H.render(); }]);
    const old = H.PAGES.negotiate;
    const w = function () {
      let html = old.apply(this, arguments);
      try {
        const n = negs().find(x => x.id === H.S.ng) || negs().find(x => !['signed', 'failed'].includes(x.st));
        if (n && n.wait) {
          const t = document.createElement('template'); t.innerHTML = html;
          const log = t.content.querySelector('.ng-log'); if (log) {
            const box = log.parentNode; [...box.querySelectorAll('.cr-row, [data-ngsign], .hs-note')].forEach(x => x.remove());
            const total = Math.max(1, n.wait.due - n.wait.since), pct = Math.max(3, Math.min(100, (now() - n.wait.since) / total * 100)), left = Math.max(0, Math.ceil((n.wait.due - now()) / DAY));
            const d = document.createElement('div'); d.className = 'v98-wait'; d.setAttribute('role', 'status');
            d.innerHTML = `<b>${WAIT_L[n.wait.kind]}</b><span>${left <= 0 ? 'ответ сегодня' : left === 1 ? 'остался 1 день' : 'осталось ' + left + ' дн.'} · до ${esc(fdate(n.wait.due))}</span><i><em style="width:${pct.toFixed(0)}%"></em></i>
              <small>Время идёт по календарю: нажмите «Продолжить» или запустите время в шапке.</small><button type="button" class="hs-btn sm ghost" data-v98recall="${esc(n.id)}">${n.wait.kind === 'sign' ? 'Остановить регистрацию' : 'Отозвать'}</button>`;
            log.after(d);
            const st = box.querySelector('.ng-st'); if (st) st.textContent = 'Ждём ответа';
            const d2 = document.createElement('div'); d2.appendChild(t.content); html = d2.innerHTML;
          }
        }
      } catch (e) { console.warn('[v98 nego ui]', e); }
      return html;
    };
    Object.keys(old).forEach(k => { w[k] = old[k]; }); H.PAGES.negotiate = w;
  }

  /* ============================================================ тренировки: шесть основных упражнений с иконками */
  const MAIN = ['entry', 'utility', 'comm', 'mapcontrol', 'mental', 'recovery'];
  function trainUi() {
    document.querySelectorAll('.v96-tfs').forEach(box => {
      const all = [...box.querySelectorAll('.v96-tf')]; if (!all.length) return;
      all.forEach(b => { const k = b.dataset.v96tf, extra = !MAIN.includes(k); if (b.classList.contains('v98-x') !== extra) b.classList.toggle('v98-x', extra); });
      const open = !!H.S.v98all || all.some(b => b.classList.contains('v98-x') && b.classList.contains('on'));
      if (box.classList.contains('v98-all') !== open) box.classList.toggle('v98-all', open);
      const n = all.filter(b => b.classList.contains('v98-x')).length;
      let more = box.parentNode.querySelector(':scope > .v98-more');
      if (!more && n) { more = document.createElement('button'); more.type = 'button'; more.className = 'v98-more'; more.dataset.v98more = '1'; box.after(more); }
      if (more) { const tx = open ? 'Только основные' : `Все упражнения · ещё ${n}`; if (more.textContent !== tx) more.textContent = tx; more.setAttribute('aria-expanded', String(open)); }
    });
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-v98more]'); if (!b) return; e.preventDefault(); e.stopPropagation(); H.S.v98all = !H.S.v98all; trainUi(); }, true);

  /* ============================================================ цикл */
  if (H.AFTER) H.AFTER.push(() => { navItem(); trainUi(); });
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { if (!me()) return; settle(); keepBench(); guardRoles(); } catch (e) {} }, 1500, 'v98-squad');
  setInterval(() => { try { navItem(); trainUi(); } catch (e) {} }, 600);
  navItem();

  W.V98Squad = { setRole, swap, release, bench: () => benchOf(me()), queue, settle, recall, ROLES };
  console.info('[v98] состав: роли, скамейка, сделки по времени');
})();
