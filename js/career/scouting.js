/* v99 — режим менеджера: разведка с погрешностью, скримы, выбор турниров, разбор матча, следующий матч.

   1. Разведка с погрешностью (V99Scout). Потенциал и «реализация таланта» чужого игрока менеджер видит диапазоном.
      Знание об игроке складывается из скаутского отдела, сыгранных при нас карт игрока и отчёта скаута.
      Отчёт заказывается в профиле игрока («Отправить скаута»): $5 000, 12/10/8/6 игровых дней по уровню отдела,
      одновременно 1 + уровень отдела заданий; отчёт действует 150 дней. Свои игроки и наблюдатель — точные значения.
   2. Скримы (V99Scrims) — раз в игровую неделю на странице «Тренировки»: партнёр и подход.
      «Свои схемы» — сыгранность планов на двух картах +12%, но партнёр 28 дней знает ваши схемы (−0.6% к раунду в
      матче с ним). «Скрыть схемы» — практика двух карт, без утечки. «На разведку» — 28 дней +0.4% к раунду против
      партнёра. Сильный клуб может отказаться. Скрим добавляет усталость и меняет уверенность по итогу.
   3. Турниры клуба (страница «Турниры клуба»): отказаться от Tier-2/3 (место отдаётся следующей команде, репутация −1)
      или подать заявку (принимают по рейтингу; вы заменяете самую слабую команду поля). Tier-1 — по приглашениям,
      показан статус.
   4. Разбор матча: после каждой серии вашей команды — факторы: подготовка к сопернику, планы на картах и их
      сыгранность, план вето, усталость, сыгранность состава, отсутствующие игроки, скримы, расклад сил.
      Последний разбор — на «Рабочем месте», все — на странице «Разбор матчей».
   5. «Рабочее место»: блок «Следующий матч» (соперник, турнир, когда) — раньше его не было. */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31;
  if (!H || !V || typeof seasonState === 'undefined' || typeof teams === 'undefined') return;
  const esc = H.esc, DAY = 864e5, WEEK = 7 * DAY;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const u01 = k => (h32(k) % 100000) / 100000;
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const team = () => H.teamBy(me());
  const fdate = ms => { try { return H.fdate(ms); } catch (e) { return new Date(ms).toLocaleDateString('ru-RU'); } };
  const money = n => { try { return V.money(n); } catch (e) { return '$' + Math.round(n); } };
  const rank = n => { try { return V.rankOf(n); } catch (e) { return 50; } };
  const save = () => { try { W.saveSeasonState && W.saveSeasonState(); } catch (e) {} };
  const toast = (title, text) => { try { W.v29Toast && W.v29Toast(`<div class="v29-toast-ic">📋</div><div class="v29-toast-t"><small>${esc(title)}</small><b>${esc(text)}</b></div>`); } catch (e) {} };
  const log = t => { try { V.careerLog(t); } catch (e) {} };
  const S = () => { const s = seasonState.v99Mgr = seasonState.v99Mgr || {}; s.rep = s.rep || {}; s.tasks = s.tasks || []; s.scrim = s.scrim || { wk: -1, hist: [] }; s.leak = s.leak || {}; s.intel = s.intel || {}; s.ev = s.ev || { declined: {}, applied: {} }; s.deb = s.deb || { list: [], seen: {}, init: false }; return s; };
  const starters = t => (t && t.players || []).filter(p => p && !/BENCH|RESERVE/.test(p.status || ''));
  const scoutLvl = () => { try { return V.org(me()).fac.scouting || 0; } catch (e) { return 0; } };

  /* ================================================================ 1. разведка с погрешностью */
  function isMine(nick) { const t = team(); if (!t) return false; if ((t.players || []).some(p => p && p.nick === nick)) return true; try { return ((W.V98Squad && W.V98Squad.bench()) || []).some(p => p.nick === nick); } catch (e) { return false; } }
  function mapsSeen(nick) { try { const st = H.stats(); const o = st && st.P && st.P[nick]; return o && o.matches ? o.matches.length : 0; } catch (e) { return 0; } }
  function knowledge(nick) {
    if (!me()) return 1;
    if (isMine(nick)) return 1;
    const r = S().rep[nick]; if (r && r.until > now()) return 1;
    return clamp(.15 + .12 * scoutLvl() + Math.min(.3, mapsSeen(nick) * .015), 0, .9);
  }
  function fog(p) {
    if (!p || !me()) return null;
    const k = knowledge(p.nick); if (k >= .95) return null;
    const err = Math.round((1 - k) * 14) + 1, pot = +p.pot || 0;
    const off = (u01('v99pot' + p.nick + me()) - .5) * err;
    const lo = Math.round(clamp(pot + off - err / 2, 50, 99)), hi = Math.round(clamp(pot + off + err / 2, 50, 99));
    let real = '?'; try { const pr = W.CS2Develop && W.CS2Develop.profile(p); if (pr && k >= .35) { const rr = Math.round(pr.real * 100), e2 = Math.round((1 - k) * 40); real = `${clamp(rr - e2, 20, 110)}–${clamp(rr + e2, 20, 110)}%`; } } catch (e) {}
    return { pot: lo === hi ? String(lo) : `${lo}–${hi}`, real, k, err };
  }
  // характер (1–20): при слабом знании — диапазон
  function trait(p, k) {
    if (!p || !p.pers || !me()) return null;
    const kn = knowledge(p.nick); if (kn >= .6) return null;
    const v = +p.pers[k] || 10, err = Math.round((1 - kn) * 8), off = Math.round((u01('v99tr' + k + p.nick + me()) - .5) * err);
    const lo = clamp(v + off - Math.ceil(err / 2), 1, 20), hi = clamp(v + off + Math.ceil(err / 2), 1, 20);
    return { lo, hi, mid: (lo + hi) / 2, txt: lo === hi ? String(lo) : `${lo}–${hi}` };
  }
  function task(nick) { return S().tasks.find(x => x.nick === nick && x.st === 'open'); }
  function capacity() { return 1 + scoutLvl(); }
  function sendScout(nick) {
    if (!me() || isMine(nick)) return { ok: false, why: 'Это ваш игрок' };
    if (task(nick)) return { ok: false, why: 'Скаут уже работает' };
    if (S().tasks.filter(x => x.st === 'open').length >= capacity()) return { ok: false, why: `Все скауты заняты (${capacity()} задания одновременно — уровень скаутского отдела)` };
    try { if ((V.org(me()).budget || 0) < 5000) return { ok: false, why: 'Не хватает бюджета' }; V.book(me(), -5000, 'fac', `Скаутский отчёт: ${nick}`); } catch (e) {}
    const days = 12 - 2 * scoutLvl();
    S().tasks.push({ nick, st: 'open', start: now(), due: now() + days * DAY });
    log(`Скаут отправлен смотреть ${nick} (${days} дн.)`); save();
    return { ok: true, days };
  }
  function scoutTick() {
    const s = S();
    s.tasks.forEach(x => { if (x.st === 'open' && x.due <= now()) { x.st = 'done'; s.rep[x.nick] = { at: now(), until: now() + 150 * DAY }; log(`Готов отчёт скаута: ${x.nick}`); if (W.V99Mail) W.V99Mail.add({ team: me(), icon: '🔎', from: 'Скаутский отдел', title: `Отчёт по ${x.nick} готов`, text: 'Потенциал и характер теперь известны точно.', nav: 'player/' + encodeURIComponent(x.nick), btn: 'Профиль игрока' }); else toast('Отчёт скаута', `${x.nick}: потенциал и характер известны точно`); } });
    if (s.tasks.length > 40) s.tasks = s.tasks.filter(x => x.st === 'open').concat(s.tasks.filter(x => x.st !== 'open').slice(-20));
  }
  H.CLICKS.push(['[data-v99scout]', el => { const r = sendScout(el.dataset.v99scout); if (!r.ok) alert(r.why); H.render(); }]);

  /* ================================================================ 2. скримы */
  const SCRIM_MODES = {
    show: ['Свои схемы', 'Сыгранность планов на двух картах +12%. Партнёр 28 дней знает ваши схемы: −0.6% к раунду в матче с ним'],
    hide: ['Скрыть схемы, отработать карты', 'Практика двух карт, утечки нет'],
    intel: ['На разведку', '28 дней +0.4% к раунду против партнёра; немного раскроетесь сами']
  };
  const wkNo = () => Math.floor(now() / WEEK);
  function partners() {
    const t = team(); if (!t) return [];
    const r = rank(t.name), list = H.ranked().filter(x => !x.isAcademy && x.name !== t.name);
    return list.map(x => ({ name: x.name, r: rank(x.name) })).filter(x => Math.abs(x.r - r) <= 10).sort((a, b) => Math.abs(a.r - r) - Math.abs(b.r - r)).slice(0, 8);
  }
  function bestMaps(t) {
    const tac = (t.v92tac && t.v92tac.maps) || {}, pool = typeof MAP_POOL !== 'undefined' ? MAP_POOL : Object.keys(tac);
    return pool.slice().sort((a, b) => ((tac[a] && tac[a].fam) || 1) - ((tac[b] && tac[b].fam) || 1)).slice(0, 2);   // меньше всего сыгранные
  }
  function playScrim(partner, mode) {
    const t = team(), s = S(); if (!t) return { ok: false, why: 'Нет клуба' };
    if (s.scrim.wk === wkNo()) return { ok: false, why: 'Скримы на этой неделе уже сыграны' };
    if (!SCRIM_MODES[mode]) return { ok: false, why: 'Выберите подход' };
    const pt = H.teamBy(partner); if (!pt) return { ok: false, why: 'Выберите партнёра' };
    const myR = rank(t.name), pr = rank(partner);
    if (pr < myR - 6 && u01('scr' + partner + wkNo()) < .5) { s.scrim = Object.assign(s.scrim, { wk: wkNo(), refused: partner }); save(); return { ok: false, refused: true, why: `${partner} отказались: «на этой неделе тренируемся с командами своего уровня»` }; }
    const maps = bestMaps(t), res = {};
    if (mode === 'show') { maps.forEach(m => { try { const p = W.CS2Tactics.plan(t, m); p.fam = Math.round(Math.min(1, p.fam + .12) * 100) / 100; } catch (e) {} }); s.leak[partner] = { until: now() + 28 * DAY, k: .006 }; }
    if (mode === 'hide') { t.v31map = t.v31map || {}; maps.forEach(m => { t.v31map[m] = clamp((t.v31map[m] || 0) + .6, 0, 10); }); }
    if (mode === 'intel') { s.intel[partner] = { until: now() + 28 * DAY, k: .004 }; s.leak[partner] = { until: now() + 28 * DAY, k: .002 }; }
    // итог скрима: по силе команд
    const pa = +t.pts || 500, pb = +pt.pts || 500, pw = clamp(.5 + (pa - pb) / 2400, .2, .8);
    let w = 0, l = 0; for (let i = 0; i < 3; i++) { if (u01('scrm' + partner + wkNo() + i) < pw) w++; else l++; }
    starters(t).forEach(p => { p.fatigue = clamp((+p.fatigue || 0) + 3, 0, 100); p.conf = clamp((+p.conf || 60) + (w > l ? 2 : -2), 5, 98); });
    const entry = { wk: wkNo(), ts: now(), partner, mode, maps, w, l };
    s.scrim = { wk: wkNo(), hist: [entry].concat(s.scrim.hist || []).slice(0, 12) };
    log(`Скримы с ${partner} (${SCRIM_MODES[mode][0].toLowerCase()}): ${w}:${l} по картам`);
    try { W.saveTeams && W.saveTeams(); } catch (e) {} save();
    return { ok: true, entry };
  }
  // влияние на матч: утечка схем и разведка — поправка к раунду на карте против партнёра
  (function wrap() {
    if (typeof window.calcMapWinProbability !== 'function') { setTimeout(wrap, 1000); return; } CS2.patch('calcMapWinProbability', f => function (t1, t2, map) {
      let p = f.apply(this, arguments);
      try { const m = me(); if (m && (t1 === m || t2 === m)) { const opp = t1 === m ? t2 : t1, s = S(); let d = 0; const lk = s.leak[opp], it = s.intel[opp]; if (lk && lk.until > now()) d -= lk.k; if (it && it.until > now()) d += it.k; if (d) p = clamp(p + (t1 === m ? d : -d), .25, .75); } } catch (e) {}
      return p;
    }, { id: '__v99' });
  })();
  H.S.v99scr = H.S.v99scr || { partner: '', mode: 'hide', msg: '' };
  function scrimPanel() {
    const s = S(), st = H.S.v99scr, done = s.scrim.wk === wkNo(), last = (s.scrim.hist || [])[0];
    const ps = partners(); if (!st.partner && ps[0]) st.partner = ps[0].name;
    const modes = Object.entries(SCRIM_MODES).map(([k, [l, d]]) => `<button type="button" class="v99-tf${st.mode === k ? ' on' : ''}" data-v99smode="${k}" aria-pressed="${st.mode === k}"${done ? ' disabled' : ''}><b>${esc(l)}</b><small>${esc(d)}</small></button>`).join('');
    const sel = `<select data-v99spart${done ? ' disabled' : ''}>${ps.map(x => `<option value="${esc(x.name)}"${st.partner === x.name ? ' selected' : ''}>#${x.r} ${esc(x.name)}</option>`).join('')}</select>`;
    const leaks = Object.entries(s.leak).filter(([, v]) => v.until > now()).map(([n, v]) => `<span class="v99-chip bad">${esc(n)} знает схемы до ${esc(fdate(v.until))}</span>`).join(' ');
    const intel = Object.entries(s.intel).filter(([, v]) => v.until > now()).map(([n, v]) => `<span class="v99-chip ok">разведка: ${esc(n)} до ${esc(fdate(v.until))}</span>`).join(' ');
    const hist = (s.scrim.hist || []).slice(0, 5).map(e => `<li><b>${e.w}:${e.l}</b><span>${esc(e.partner)} · ${esc(SCRIM_MODES[e.mode] ? SCRIM_MODES[e.mode][0] : '')}${e.maps && e.maps.length ? ' · ' + esc(e.maps.join(', ')) : ''}</span></li>`).join('');
    return `<section class="v96-panel wide v99-scrims"><h3 class="v96-ph">Скримы недели</h3>
      <div class="v96-train"><section><h4>Подход</h4><div class="v99-tfs">${modes}</div></section>
      <section><h4>Партнёр по скримам</h4><label class="v96-map"><span>Команда (±10 мест в рейтинге)</span>${sel}</label>
        <p class="v96-sum">${done ? (last && last.wk === wkNo() ? `Сыграно: <b>${esc(last.partner)}</b> ${last.w}:${last.l} по картам` : `Отказ: ${esc(s.scrim.refused || '')}`) : 'Скримы — раз в игровую неделю. Усталость +3 игрокам основы.'}</p>
        ${done ? '' : '<button type="button" class="v96-go" data-v99scrim>Сыграть скримы</button>'}
        ${st.msg ? `<p class="v96-note">${esc(st.msg)}</p>` : ''}
        ${leaks || intel ? `<p class="v99-actions">${leaks} ${intel}</p>` : ''}
        ${hist ? `<h4>Последние скримы</h4><ul class="v99-list">${hist}</ul>` : ''}</section></div></section>`;
  }
  H.CLICKS.push(['[data-v99smode]', el => { H.S.v99scr.mode = el.dataset.v99smode; H.render(); }]);
  H.CLICKS.push(['[data-v99scrim]', () => { const st = H.S.v99scr, r = playScrim(st.partner, st.mode); st.msg = r.ok ? `Скримы сыграны: ${r.entry.w}:${r.entry.l}` : r.why; H.render(); }]);
  document.addEventListener('change', e => { if (e.target && e.target.matches && e.target.matches('[data-v99spart]')) { H.S.v99scr.partner = e.target.value; } });

  /* ================================================================ 3. турниры клуба */
  const names = a => (a || []).map(x => typeof x === 'string' ? x : x && x.name).filter(Boolean);
  function overlaps(a0, a1, b0, b1) { return a0 < b1 && b0 < a1; }
  function myEvents() {
    const m = me(), out = [];
    (seasonState.parallelSchedule || []).forEach(e => { if (e && e.status !== 'completed' && names(e.participants).includes(m)) out.push({ id: e.id, s: +e.startMs, e: +e.endMs || +e.startMs + 3 * DAY }); });
    (seasonState.seasonSchedule || []).forEach(st => { if (!st) return; const a = +(st.calendar && st.calendar.startMs) || 0, b = +(st && st.calendar && st.calendar.endMs) || a + 8 * DAY; const inv = names((st.v35Roster && st.v35Roster.participants) || st.v45Participants || st.v35Invites || []); if (a && inv.includes(m)) out.push({ id: 'T1-' + st.name, s: a, e: b }); });
    return out;
  }
  function busyFor(ev) { const a = +ev.startMs, b = +ev.endMs || a + 3 * DAY; return myEvents().find(x => x.id !== ev.id && overlaps(a, b, x.s, x.e)); }
  const tierL = e => e.tier === '2' ? 'Tier-2' : e.tier === '3' ? 'Tier-3' : (e.tier ? 'Tier-' + e.tier : 'Tier-2/3');
  function upcomingParallel() { const t0 = now(); return (seasonState.parallelSchedule || []).filter(e => e && !e.qual && e.kind !== 'academy' && e.status === 'scheduled' && +e.startMs > t0 + DAY && e.season === seasonState.currentSeason).sort((a, b) => a.startMs - b.startMs).slice(0, 24); }
  function rebuild(ev) { try { if (W.v22BuildBracketRef) W.v22BuildBracketRef(ev); } catch (e) { console.warn('[v99 events]', e); } }
  function decline(id) {
    const ev = (seasonState.parallelSchedule || []).find(e => e.id === id), m = me(); if (!ev || !m) return { ok: false, why: 'Турнир не найден' };
    if (ev.status !== 'scheduled' || +ev.startMs <= now()) return { ok: false, why: 'Турнир уже начался' };
    const list = names(ev.participants); if (!list.includes(m)) return { ok: false, why: 'Вы не участвуете' };
    const busy = new Set(); (seasonState.parallelSchedule || []).forEach(o => { if (o !== ev && o.status !== 'completed' && overlaps(+ev.startMs, +ev.endMs || +ev.startMs + 3 * DAY, +o.startMs, +o.endMs || +o.startMs + 3 * DAY)) names(o.participants).forEach(n => busy.add(n)); });
    const repl = H.ranked().filter(t => !t.isAcademy && t.name !== m && !list.includes(t.name) && !busy.has(t.name) && rank(t.name) > 12).sort((a, b) => Math.abs(rank(a.name) - rank(m)) - Math.abs(rank(b.name) - rank(m)))[0];
    ev.participants = list.filter(n => n !== m).concat(repl ? [repl.name] : []);
    rebuild(ev);
    S().ev.declined[id] = now();
    try { const o = V.org(m); o.rep = clamp((o.rep || 50) - 1, 0, 100); } catch (e) {}
    log(`Отказ от участия: ${ev.name}${repl ? ` (место отдано ${repl.name})` : ''}`);
    try { W.V29News && W.V29News.add({ cat: 'tournament', icon: '✋', imp: 3, title: `${m} отказались от участия в ${ev.name}`, lead: repl ? `Место в сетке получает ${repl.name}.` : 'Организаторы ищут замену.', body: [], tags: [{ t: 'team', v: m }] }); } catch (e) {}
    try { W.saveSeasonState && W.saveSeasonState(); } catch (e) {}
    return { ok: true, repl: repl ? repl.name : '' };
  }
  function apply(id) {
    const ev = (seasonState.parallelSchedule || []).find(e => e.id === id), m = me(); if (!ev || !m) return { ok: false, why: 'Турнир не найден' };
    if (ev.status !== 'scheduled' || +ev.startMs <= now() + DAY) return { ok: false, why: 'Регистрация закрыта' };
    const list = names(ev.participants); if (list.includes(m)) return { ok: false, why: 'Вы уже участвуете' };
    if (!list.length) return { ok: false, why: 'Поле турнира ещё не сформировано — заявки примут позже' };
    if (S().ev.applied[id]) return { ok: false, why: 'Заявка уже рассмотрена' };
    const b = busyFor(ev); if (b) return { ok: false, why: 'В эти даты вы играете другой турнир' };
    const ranks = list.map(rank).sort((a, b2) => a - b2), myR = rank(m), median = ranks[Math.floor(ranks.length / 2)], worst = ranks[ranks.length - 1];
    S().ev.applied[id] = now();
    const accepted = myR <= median || (myR <= worst + 5 && u01('app' + id + m) < .6);
    if (!accepted) { log(`Заявка на ${ev.name} отклонена`); try { W.V99Mail && W.V99Mail.add({ team: m, icon: '⛔', from: ev.name, title: `Заявка на ${ev.name} отклонена`, text: `Поле сильнее: ваше место #${myR}, худшее в поле #${worst}.`, nav: 'clubev', btn: 'Турниры клуба' }); } catch (e) {} save(); return { ok: false, why: `Организаторы отказали: поле сильнее (ваше место #${myR}, худшее в поле #${worst})` }; }
    const weakest = list.slice().sort((a, b2) => rank(b2) - rank(a))[0];
    ev.participants = list.filter(n => n !== weakest).concat([m]);
    S().ev.joined = S().ev.joined || {}; S().ev.joined[id] = now();   // v114: заявка принята — клуб остаётся в поле
    rebuild(ev);
    log(`Заявка принята: ${ev.name} (вместо ${weakest})`); try { W.V99Mail && W.V99Mail.add({ team: m, icon: '📝', from: ev.name, title: `Вы в сетке ${ev.name}`, text: `Старт ${fdate(+ev.startMs)}.`, nav: 'clubev', btn: 'Турниры клуба' }); } catch (e) {}
    try { W.V29News && W.V29News.add({ cat: 'tournament', icon: '📝', imp: 3, title: `${m} сыграют на ${ev.name}`, lead: `Клуб подал заявку и занял место ${weakest}.`, body: [], tags: [{ t: 'team', v: m }] }); } catch (e) {}
    try { W.saveSeasonState && W.saveSeasonState(); } catch (e) {}
    return { ok: true, out: weakest };
  }
  /* v114: регистрация на Tier-2/3 — по заявке клуба, а не автоматически. Раньше планировщик вписывал клуб менеджера в поле
     наравне с ИИ («Ближайший турнир — Galaxy Battle», хотя заявки не было), и оставалось только отказываться (−1 репутации).
     Теперь клуб без заявки из поля убирается (место — команде близкого уровня, без штрафа), а в почту приходит приглашение. */
  function optInSweep() {
    const m = me(); if (!m) return 0;
    const s = S(); s.ev.joined = s.ev.joined || {}; s.ev.invited = s.ev.invited || {};
    let n = 0; const fresh = [];
    (seasonState.parallelSchedule || []).forEach(ev => {
      if (!ev || ev.qual || ev.kind === 'academy' || ev.status !== 'scheduled' || !(+ev.startMs > now() + DAY)) return;
      const list = names(ev.participants);
      if (list.includes(m) && !s.ev.joined[ev.id]) {
        const busy = new Set(); (seasonState.parallelSchedule || []).forEach(o => { if (o !== ev && o.status !== 'completed' && overlaps(+ev.startMs, +ev.endMs || +ev.startMs + 3 * DAY, +o.startMs, +o.endMs || +o.startMs + 3 * DAY)) names(o.participants).forEach(x => busy.add(x)); });
        const repl = H.ranked().filter(t => !t.isAcademy && t.name !== m && !list.includes(t.name) && !busy.has(t.name)).sort((a, b) => Math.abs(rank(a.name) - rank(m)) - Math.abs(rank(b.name) - rank(m)))[0];
        ev.participants = list.filter(x => x !== m).concat(repl ? [repl.name] : []); rebuild(ev); n++;
      }
      // приглашение — за 3 недели до старта, если клуб подходит полю по уровню; одно письмо на все новые
      if (!s.ev.invited[ev.id] && !s.ev.joined[ev.id] && !s.ev.declined[ev.id] && +ev.startMs - now() <= 21 * DAY && names(ev.participants).length) {
        const rk = names(ev.participants).map(rank).sort((a, b) => a - b), worst = rk[rk.length - 1] || 999;
        if (rank(m) <= worst + 5) { s.ev.invited[ev.id] = now(); fresh.push(ev); }
      }
    });
    if (fresh.length) { try { W.V99Mail && W.V99Mail.add({ team: m, icon: '📨', info: true, from: 'Организаторы турниров', title: fresh.length === 1 ? `Открыта регистрация: ${fresh[0].name}` : `Открыта регистрация на ${fresh.length} турнира`, text: fresh.map(e => `${e.name} — старт ${fdate(+e.startMs)}`).join('; ') + '. Подайте заявку, если хотите сыграть.', nav: 'clubev', btn: 'Турниры клуба' }); } catch (e) {} }
    if (n) { try { W.saveSeasonState && W.saveSeasonState(); } catch (e) {} }
    return n;
  }
  const everyOpt = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  everyOpt(() => { try { optInSweep(); } catch (e) {} }, 3000, 'v114-optin');
  W.V114OptIn = optInSweep;
  H.S.v99ev = H.S.v99ev || { msg: '' };
  function pageEvents() {
    const t = team(); if (!t) return W.V96Pick ? W.V96Pick.html() : '<div class="hs-empty">Выберите клуб</div>';
    const m = t.name, s = S(), t0 = now();
    const t1 = (seasonState.seasonSchedule || []).filter(st => st && (+(st.calendar && st.calendar.startMs) || 0) > t0).slice(0, 8).map(st => {
      const inv = names((st.v35Roster && st.v35Roster.participants) || st.v45Participants || st.v35Invites || []);
      const status = inv.includes(m) ? '<span class="v99-chip ok">приглашены</span>' : inv.length ? '<span class="v99-chip">нет приглашения</span>' : '<span class="v99-chip">приглашения позже</span>';
      return `<tr><td class="l"><b>${esc(st.name)}</b><br><small>${st.type === 'major' ? 'Major' : 'Tier-1'}</small></td><td class="l">${esc(fdate(+st.calendar.startMs))}</td><td class="l">${status}</td><td class="l"><small>${st.type === 'major' ? 'Путь через отборы — «Путь на Мейджор»' : 'Приглашение по рейтингу VRS'}</small></td></tr>`; }).join('');
    const rows = upcomingParallel().map(e => {
      const list = names(e.participants), inIt = list.includes(m), busy = busyFor(e), dec = s.ev.declined[e.id], app = s.ev.applied[e.id];
      let act = '';
      if (inIt) act = `<button type="button" class="hs-btn ghost sm" data-v99decl="${esc(e.id)}">Отказаться</button>`;
      else if (dec) act = '<span class="v99-chip">отказались</span>';
      else if (!list.length) act = '<span class="v99-chip">поле позже</span>';
      else if (busy) act = '<span class="v99-chip warn">пересекается</span>';
      else if (app) act = '<span class="v99-chip bad">отказано</span>';
      else act = `<button type="button" class="hs-btn sm" data-v99apply="${esc(e.id)}">Подать заявку</button>`;
      const ranks = list.map(rank).sort((a, b) => a - b);
      return `<tr class="${inIt ? 'on' : ''}"><td class="l"><b>${esc(e.name)}</b><br><small>${esc(tierL(e))} · ${esc(e.format || '')}</small></td><td class="l">${esc(fdate(+e.startMs))}</td><td class="l">${inIt ? '<span class="v99-chip ok">участвуем</span>' : ''} ${list.length ? `<small>${list.length} команд · #${ranks[0]}–#${ranks[ranks.length - 1]}</small>` : ''}</td><td class="l">${act}</td></tr>`; }).join('');
    const fat = Math.round(starters(t).reduce((a, p) => a + (+p.fatigue || 0), 0) / Math.max(1, starters(t).length));
    return `<div class="hs-head"><h1>Турниры клуба</h1><span class="hs-sub">${esc(m)} · рейтинг #${rank(m)} · средняя усталость основы ${fat}</span></div>
      <div class="v99-page">${H.S.v99ev.msg ? `<div class="v96-status ${/принят|Отказ от|отказались/.test(H.S.v99ev.msg) ? 'ok' : 'warn'}"><b>${esc(H.S.v99ev.msg)}</b></div>` : ''}
      ${H.box('Региональные турниры (Tier-2/3)', rows ? `<div class="v99-scroll"><table class="v99-tbl"><thead><tr><th class="l">Турнир</th><th class="l">Старт</th><th class="l">Поле</th><th class="l"></th></tr></thead><tbody>${rows}</tbody></table></div>` : H.empty('Ближайших региональных турниров нет'))}
      <p class="hs-note">Отказ освобождает даты для отдыха и тренировок, но стоит очков VRS, призовых и −1 к репутации. Заявку принимают, если вы сильнее середины поля; на грани — по решению организатора.</p>
      ${H.box('Tier-1 и Мейджоры', t1 ? `<div class="v99-scroll"><table class="v99-tbl"><thead><tr><th class="l">Турнир</th><th class="l">Старт</th><th class="l">Статус</th><th class="l">Как попасть</th></tr></thead><tbody>${t1}</tbody></table></div>` : H.empty('В этом сезоне Tier-1 турниров больше нет'))}</div>`;
  }
  H.PAGES.clubev = pageEvents;
  H.CLICKS.push(['[data-v99decl]', el => { const e = (seasonState.parallelSchedule || []).find(x => x.id === el.dataset.v99decl); if (!confirm(`Отказаться от участия в ${e ? e.name : 'турнире'}? Вернуться будет нельзя.`)) return; const r = decline(el.dataset.v99decl); H.S.v99ev.msg = r.ok ? `Отказ от участия принят${r.repl ? ` — место отдано ${r.repl}` : ''}` : r.why; H.render(); }]);
  H.CLICKS.push(['[data-v99apply]', el => { const r = apply(el.dataset.v99apply); H.S.v99ev.msg = r.ok ? `Заявка принята — вы заменили ${r.out}` : r.why; H.render(); }]);

  /* ================================================================ 4. разбор матча */
  function factors(m, opp, mine) {
    const t = team(), o = H.teamBy(opp), f = [], org = (() => { try { return V.org(me()); } catch (e) { return {}; } })();
    if (!t || !o) return f;
    // расклад сил
    try { const q = W.calcMatchOdds(me(), opp, false); if (q) { const p = Math.round(q.p1_win * 100); f.push({ s: 0, t: `Перед матчем шансы ~${p}% — ${p >= 60 ? 'вы были фаворитом' : p <= 40 ? 'вы были андердогом' : 'равный матч'}.` }); } } catch (e) {}
    // подготовка
    const pr = org.prep; if (pr && pr.opp === opp && now() - (pr.ts || 0) < 21 * DAY) f.push({ s: 1, t: `Подготовка к сопернику (${Math.round((pr.quality || 0) * 100)}%)${pr.maps && pr.maps.length ? ': заготовки на ' + pr.maps.join(', ') : ''}.` }); else f.push({ s: -1, t: 'Без подготовки к этому сопернику — «Разведка и подготовка» даёт заготовки на карты.' });
    // карты: тактика и сыгранность планов
    (m.mp || []).forEach(([map, a, b]) => {
      if (+a + +b === 0) return;
      const my = m.a === me() ? [+a, +b] : [+b, +a];
      try { const T = W.CS2Tactics; const d = T.mapMod(t, o, map) - T.mapMod(o, t, map), pl = T.plan(t, map), po = T.plan(o, map);
        const fam = Math.round((pl.fam || 1) * 100);
        const txt = `${map} ${my[0]}:${my[1]} — ваш план «${T.T_L[pl.t]} / ${T.CT_L[pl.ct]}» против «${T.T_L[po.t]} / ${T.CT_L[po.ct]}»: ${d > .0005 ? 'план сыграл в плюс' : d < -.0005 ? 'соперник переиграл схемами' : 'схемы на равных'}${fam < 70 ? `, план сыгран лишь на ${fam}%` : ''}.`;
        f.push({ s: d > .0005 ? 1 : d < -.0005 ? -1 : 0, t: txt }); } catch (e) { f.push({ s: my[0] > my[1] ? 1 : -1, t: `${map} ${my[0]}:${my[1]}` }); }
    });
    // вето
    try { const vp = (seasonState.v84Veto || {})[me()]; if (vp) { const played = (m.mp || []).map(x => x[0]); if (vp.ban && played.includes(vp.ban)) f.push({ s: -1, t: `Пермабан ${vp.ban} не сработал — карта всё равно сыграна.` }); const hit = (vp.prio || []).filter(x => played.includes(x)); f.push(hit.length ? { s: 1, t: `План вето: сыграли свои карты (${hit.join(', ')}).` } : { s: -1, t: 'План вето: ни одна приоритетная карта не попала в серию.' }); } } catch (e) {}
    // усталость, сыгранность, форма
    const st = starters(t), fat = st.reduce((a, p) => a + (+p.fatigue || 0), 0) / Math.max(1, st.length);
    if (fat >= 55) f.push({ s: -1, t: `Усталость основы ${Math.round(fat)} — команда играла не в полную силу.` }); else if (fat <= 25) f.push({ s: 1, t: 'Команда свежая — усталость низкая.' });
    try { const ch = V.chemistry(t); if (ch < .45) f.push({ s: -1, t: `Сыгранность состава ${Math.round(ch * 100)}% — новичкам нужно время.` }); else if (ch > .75) f.push({ s: 1, t: `Высокая сыгранность (${Math.round(ch * 100)}%).` }); } catch (e) {}
    try { const out = W.V99Talks && W.V99Talks.S().out; const absent = out ? Object.values(out).filter(r => r.team === me()) : []; if (absent.length) f.push({ s: -1, t: `Без ${absent.map(r => r.nick).join(', ')} (${absent.map(r => r.reason).join(', ')}).` }); } catch (e) {}
    const s = S(); if (s.leak[opp] && s.leak[opp].until > now()) f.push({ s: -1, t: `${opp} знали ваши схемы по скримам.` }); if (s.intel[opp] && s.intel[opp].until > now()) f.push({ s: 1, t: `Разведка на скримах против ${opp} помогла.` });
    return f;
  }
  function debTick() {
    const m = me(); if (!m) return; const d = S().deb;
    let ms = []; try { ms = H.allMatches(); } catch (e) { return; }
    const mine = ms.filter(x => x && x.w && (x.a === m || x.b === m));
    if (!d.init || d.team !== m) { mine.forEach(x => { d.seen[x.id] = 1; }); d.init = true; d.team = m; return; }
    mine.filter(x => !d.seen[x.id]).slice(0, 3).forEach(x => {
      d.seen[x.id] = 1;
      const opp = x.a === m ? x.b : x.a, win = x.w === m, sc = Array.isArray(x.s) ? (x.a === m ? x.s : x.s.slice().reverse()) : [0, 0];
      const rep = { id: x.id, ts: now(), opp, ev: x.ev || '', stage: x.stage || '', win, sc, mp: x.mp || [], f: factors(x, opp, m) };
      d.list.unshift(rep); if (d.list.length > 30) d.list.length = 30;
      toast('Разбор матча готов', `${m} ${sc[0]}:${sc[1]} ${opp}`);
    });
    const keys = Object.keys(d.seen); if (keys.length > 400) keys.slice(0, keys.length - 300).forEach(k => delete d.seen[k]);
  }
  function debCard(r, full) {
    const pos = r.f.filter(x => x.s > 0).length, neg = r.f.filter(x => x.s < 0).length;
    const verdict = r.win ? (neg > pos ? 'Победа вопреки: проблем было больше, чем плюсов.' : 'Победа по делу: решения штаба сработали.') : (pos > neg ? 'Поражение при хорошей подготовке — соперник сыграл сильнее.' : 'Поражение объяснимо: список ниже — что исправить.');
    const li = r.f.slice(0, full ? 20 : 5).map(x => `<li class="${x.s > 0 ? 'good' : x.s < 0 ? 'bad' : 'mid'}"><b>${x.s > 0 ? '+' : x.s < 0 ? '−' : '·'}</b><span>${esc(x.t)}</span></li>`).join('');
    return `<div class="v99-deb"><p><b>${esc(me())} ${r.sc[0]}:${r.sc[1]} ${esc(r.opp)}</b> <span class="v99-chip ${r.win ? 'ok' : 'bad'}">${r.win ? 'победа' : 'поражение'}</span> <small class="hs-note">${esc(r.ev)}${r.stage ? ' · ' + esc(r.stage) : ''} · ${esc(fdate(r.ts))}</small></p>
      <p class="hs-note">${esc(verdict)}</p><ul class="v99-list">${li}</ul></div>`;
  }
  H.PAGES.debrief = () => {
    const t = team(); if (!t) return W.V96Pick ? W.V96Pick.html() : '';
    const l = S().deb.list;
    return `<div class="hs-head"><h1>Разбор матчей</h1><span class="hs-sub">${esc(t.name)} · последние ${l.length}</span></div><div class="v99-page">${l.length ? l.map(r => H.box(`${esc(r.opp)} · ${r.sc[0]}:${r.sc[1]}`, debCard(r, true))).join('') : H.box('Пока пусто', H.empty('Разбор появится после первой серии вашей команды'))}</div>`;
  };

  /* ================================================================ 5. следующий матч */
  function nextMatch() {
    const m = me(); if (!m) return null;
    try { const lm = (H.liveMatches ? H.liveMatches() : []).filter(x => x.m && (x.m.a === m || x.m.b === m)); if (lm.length) { const x = lm.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || (a.at || 0) - (b.at || 0))[0]; return { opp: x.m.a === m ? x.m.b : x.m.a, ev: x.snap && x.snap.name, live: x.live, at: x.at, stage: x.m.__stage || x.m.stage || '' }; } } catch (e) {}
    return null;
  }

  /* ================================================================ вставки в страницы */
  (H.AFTER || []).push((pg, arg, root) => {
    if (!root || !me()) return;
    try {
      if (pg === 'player') {
        const nick = decodeURIComponent(String(H.S.arg || '').split('/')[0]); if (!nick || isMine(nick)) return;
        const head = root.querySelector('.hs-pact'); if (head && !head.querySelector('[data-v99scout],.v99-scoutst')) {
          const r = S().rep[nick], tk = task(nick);
          head.insertAdjacentHTML('afterbegin', r && r.until > now() ? `<span class="v99-chip ok v99-scoutst" title="Отчёт скаута действует до ${esc(fdate(r.until))}">отчёт скаута</span>` : tk ? `<span class="v99-chip warn v99-scoutst">скаут: ещё ${Math.max(1, Math.ceil((tk.due - now()) / DAY))} дн.</span>` : `<button type="button" class="hs-btn ghost" data-v99scout="${esc(nick)}" title="$5 000 · ${12 - 2 * scoutLvl()} дн.">🔎 Отправить скаута</button>`);
        }
      }
      if (pg === 'scout') {
        if (root.querySelector('.v99-scoutbox')) return;
        const s = S(), open = s.tasks.filter(x => x.st === 'open'), reps = Object.entries(s.rep).filter(([, v]) => v.until > now()).sort((a, b) => b[1].at - a[1].at).slice(0, 10);
        const html = `<section class="hs-box v99-scoutbox"><header class="hs-box-h"><h3>Скаутские задания · ${open.length}/${capacity()}</h3></header><div class="hs-box-b">
          ${open.length ? `<ul class="v99-list">${open.map(x => `<li><b>🔎</b><span><a data-player="${esc(x.nick)}">${esc(x.nick)}</a> — отчёт ${esc(fdate(x.due))}</span></li>`).join('')}</ul>` : '<p class="hs-note">Свободные скауты есть. Откройте профиль игрока другого клуба и нажмите «Отправить скаута» ($5 000).</p>'}
          ${reps.length ? `<h4 class="v96-ph sub">Готовые отчёты</h4><ul class="v99-list">${reps.map(([n, v]) => `<li><b>✓</b><span><a data-player="${esc(n)}">${esc(n)}</a> · до ${esc(fdate(v.until))}</span></li>`).join('')}</ul>` : ''}
          <p class="hs-note">Без отчёта потенциал и реализация таланта чужих игроков видны диапазоном: чем сильнее скаутский отдел и чем больше карт игрока вы видели, тем он уже.</p></div></section>`;
        const anchor = root.querySelector('.hs-box:last-of-type'); if (anchor) anchor.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('beforeend', html);
      }
      if (pg === 'training') {
        if (root.querySelector('.v99-scrims')) return;
        const first = root.querySelector('.v96-panel.wide'); if (first) first.insertAdjacentHTML('afterend', scrimPanel());
      }
      if (pg === 'desk') {
        const dash = root.querySelector('.ax-dash'), lastD = S().deb.list[0];
        if (dash) {   // v101: «Главная» v100 — разбор последнего матча карточкой дашборда
          if (lastD && !dash.querySelector('.ax-deb')) dash.insertAdjacentHTML('beforeend', `<section class="ax-card ax-deb v99-debbox"><header class="ax-h"><h3>Разбор последнего матча</h3><button type="button" class="ax-link" data-nav="debrief">все разборы</button></header>${debCard(lastD, false)}</section>`);
          return;
        }
        if (root.querySelector('.v99-nextbox')) return;
        const nm = nextMatch(), last = S().deb.list[0];
        const next = nm ? `<div class="v99-next">${H.logo(me(), 'md')}<b>${esc(me())}</b><span class="vs">VS</span><b data-team="${esc(nm.opp)}">${esc(nm.opp)}</b>${H.logo(nm.opp, 'md')}<div><small>${esc(nm.ev || '')}${nm.stage ? ' · ' + esc(nm.stage) : ''}</small><small>${nm.live ? '<span class="hs-live">LIVE</span> идёт сейчас' : nm.at ? esc(fdate(nm.at)) : 'по расписанию турнира'} · соперник #${rank(nm.opp)}</small></div><span class="v99-actions"><button type="button" class="hs-btn ghost sm" data-nav="scout">Подготовка</button><button type="button" class="hs-btn ghost sm" data-nav="tactics">Тактика</button></span></div>` : '<p class="hs-note">Ближайшего матча в сетках нет. Расписание — в «Турнирах клуба».</p>';
        const html = `<section class="hs-box v99-nextbox"><header class="hs-box-h"><h3>Следующий матч</h3><button type="button" class="hs-more" data-nav="clubev">турниры клуба →</button></header><div class="hs-box-b">${next}</div></section>
          ${last ? `<section class="hs-box v99-debbox"><header class="hs-box-h"><h3>Разбор последнего матча</h3><button type="button" class="hs-more" data-nav="debrief">все разборы →</button></header><div class="hs-box-b">${debCard(last, false)}</div></section>` : ''}`;
        const kp = root.querySelector('.pt-kpis'); if (kp) kp.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('afterbegin', html);
      }
    } catch (e) { console.warn('[v99 manager]', e); }
  });

  // меню «Карьера»
  const addNav = (k, l, after) => { if (Array.isArray(H.NAV_GAME) && !H.NAV_GAME.some(x => x[0] === k)) { const i = H.NAV_GAME.findIndex(x => x[0] === after); H.NAV_GAME.splice(i < 0 ? H.NAV_GAME.length : i + 1, 0, [k, l]); } try { if (H.SECTION_OF) H.SECTION_OF[k] = 'game'; } catch (e) {} };
  addNav('clubev', 'Турниры клуба', 'negotiate'); addNav('debrief', 'Разбор матчей', 'tactics');
  const addMenu = () => { try { const m = document.querySelector('.pt-menu[data-menu="game"]'); if (!m) return; [['clubev', 'Турниры клуба'], ['debrief', 'Разбор матчей']].forEach(([k, l]) => { if (!m.querySelector(`[data-nav="${k}"]`)) m.insertAdjacentHTML('beforeend', `<button type="button" data-nav="${k}">${l}</button>`); }); } catch (e) {} };
  setTimeout(addMenu, 1800); (H.AFTER || []).push(addMenu);

  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => { if (!me()) return; try { scoutTick(); } catch (e) {} try { if (!W.v57BatchCalendarSkip) debTick(); } catch (e) { console.warn('[v99 debrief]', e); } }, 2000, 'v99-manager');

  W.V99Scout = { knowledge, fog, trait, send: sendScout, task, capacity, state: S };
  W.V99Scrims = { play: playScrim, partners, MODES: SCRIM_MODES };
  W.V99Events = { decline, apply, upcoming: upcomingParallel, busyFor };
  W.V99Debrief = { tick: debTick, factors, list: () => S().deb.list, nextMatch };
})();
