/* v99 — режим зрителя.

   1. «Игроки на карте» в эфире: убийства, смерти, ассисты, урон за раунд, хедшоты, первые убийства — из той же
      микросимуляции раундов (V34Round), что и на странице матча; раньше в «Режиме зрителя» таблицы не было.
   2. Экран «нет сигнала» во время идущего турнира: кнопка «Запустить эфир» (раньше она была только в старом
      симуляторе, и зритель видел «нет сигнала», хотя турнир шёл).
   3. Матч любимой команды (или клуба менеджера): уведомление за игровые сутки и в момент старта эфира; при старте
      время ставится на паузу (настройка на странице эфира), в уведомлении — «Смотреть». Раньше приходил только
      итог матча.
   4. Прогнозы и репутация аналитика: прогноз на матч в эфире (до 4-го раунда первой карты). Верный прогноз —
      очки, тем больше, чем меньше был шанс; серия верных — бонус. Уровни: Новичок → Аналитик форума →
      Колумнист (ваши угаданные апсеты выходят колонкой в новостях) → Эксперт студии (инсайды: какие клубы
      на самом деле ищут игроков) → Легенда аналитики.
   Состояние — seasonState.v99Spec. API — window.V99Spec. */
(function () {
  'use strict';
  const W = window, H = W.HS;
  if (!H || typeof seasonState === 'undefined') return;
  const esc = H.esc, DAY = 864e5;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);
  const fdate = ms => { try { return H.fdate(ms); } catch (e) { return new Date(ms).toLocaleDateString('ru-RU'); } };
  const me = () => { try { return W.V31 && W.V31.managed() || ''; } catch (e) { return ''; } };
  const fav = () => { try { return (W.CS2Watch && W.CS2Watch.favTeam()) || me(); } catch (e) { return me(); } };
  const S = () => { const s = seasonState.v99Spec = seasonState.v99Spec || {}; s.pred = s.pred || {}; s.hist = s.hist || []; s.pts = +s.pts || 0; s.streak = +s.streak || 0; s.best = +s.best || 0; s.n = +s.n || 0; s.ok = +s.ok || 0; s.alerted = s.alerted || {}; if (s.autoPause == null) s.autoPause = true; return s; };
  const save = () => { try { W.saveSeasonState && W.saveSeasonState(); } catch (e) {} };
  const toast = html => { try { W.v29Toast && W.v29Toast(html); } catch (e) {} };

  /* ------------------------------------------------------------ 1. игроки на карте */
  function board(f) {
    const L = W.V34Round && W.V34Round.live(f.id), st = f.state; if (!L || !st) return '';
    // новая карта ещё без раундов — показываем прошлую, пока не сыгран первый раунд
    const cur = L.maps[st.mapIndex], M = cur && Object.keys(cur.board || {}).length ? cur : L.maps[(st.mapIndex || 0) - 1]; if (!M) return '';
    const rounds = M.rounds.filter(Boolean).length || 1, m = f.match;
    const rows = Object.values(M.board).map(b => ({ b, adr: b.dmg / rounds, diff: b.k - b.d }));
    if (!rows.length) return '';
    const top = rows.slice().sort((a, b) => (b.b.k * 2 + b.b.a + b.adr / 30) - (a.b.k * 2 + a.b.a + a.adr / 30))[0];
    const grp = (side, name) => { const r = rows.filter(x => x.b.team === side).sort((a, b) => b.b.k - a.b.k || b.adr - a.adr); return `<tr class="tm"><td class="l" colspan="7">${H.logo(name, 'xs')} ${esc(name)}</td></tr>` + r.map(x => `<tr><td class="l${x === top ? ' hi' : ''}">${esc(x.b.nick)}${x === top ? ' ★' : ''}</td><td>${x.b.k}-${x.b.d}</td><td class="${x.diff > 0 ? 'hi' : ''}">${x.diff > 0 ? '+' : ''}${x.diff}</td><td>${x.b.a}</td><td>${x.adr.toFixed(0)}</td><td>${x.b.k ? Math.round(x.b.hs / x.b.k * 100) : 0}%</td><td>${x.b.fk}</td></tr>`).join(''); };
    return `<div class="v99-scroll"><table class="v99-sb"><thead><tr><th class="l">Игрок</th><th>У-С</th><th>+/−</th><th>А</th><th>Урон/р</th><th>HS</th><th>1-е</th></tr></thead><tbody>${grp(1, m.t1)}${grp(2, m.t2)}</tbody></table></div><p class="hs-note">${esc(M.map || '')}, ${rounds} р. ★ — лучший игрок карты.</p>`;
  }

  /* ------------------------------------------------------------ 4. прогнозы и репутация */
  const LEVELS = [[0, 'Новичок'], [60, 'Аналитик форума'], [180, 'Колумнист'], [400, 'Эксперт студии'], [800, 'Легенда аналитики']];
  const levelOf = p => { let i = 0; LEVELS.forEach((l, k) => { if (p >= l[0]) i = k; }); return i; };
  const keyOf = f => `${f.match.t1}|${f.match.t2}|${CT() ? CT().name : ''}`;
  function canPredict(f) { const st = f && f.state; return !!st && (st.mapIndex || 0) === 0 && (st.round || 0) <= 5 && !(st.series1 || st.series2); }
  const pairKey = (a, b, ev) => `${a}|${b}|${ev || ''}`;
  function predictPair(a, b, pick, ev) {
    const s = S(), k = pairKey(a, b, ev); if (s.pred[k] || (pick !== a && pick !== b)) return false;
    let p = .5; try { const q = W.calcMatchOdds(a, b, false); if (q) p = pick === a ? q.p1_win : 1 - q.p1_win; } catch (e) {}
    s.pred[k] = { a, b, pick, p: Math.round(p * 100) / 100, ts: now(), real: Date.now(), ev: ev || '' };
    save(); return true;
  }
  function predict(f, pick) { if (!canPredict(f)) return false; return predictPair(f.match.t1, f.match.t2, pick, CT() ? CT().name : ''); }
  function upcoming() {
    let lm = []; try { lm = H.liveMatches ? H.liveMatches() : []; } catch (e) {}
    return lm.filter(x => x.m && x.m.a && x.m.b && !x.live).sort((a, b) => (a.snap && a.snap.tier === '1' ? -1 : 0) - (b.snap && b.snap.tier === '1' ? -1 : 0) || (a.at || 0) - (b.at || 0)).slice(0, 4)
      .map(x => ({ a: x.m.a, b: x.m.b, ev: (x.snap && x.snap.name) || '' }));
  }
  function settle() {
    const s = S(), open = Object.entries(s.pred); if (!open.length) return;
    let ms = []; try { ms = H.allMatches(); } catch (e) { return; }
    open.forEach(([k, pr]) => {
      const m = ms.find(x => x && x.w && ((x.a === pr.a && x.b === pr.b) || (x.a === pr.b && x.b === pr.a)) && (+x.ts || 0) >= pr.ts - DAY);
      if (!m) { if (now() - pr.ts > 10 * DAY) delete s.pred[k]; return; }
      delete s.pred[k]; s.n++;
      const ok = m.w === pr.pick, before = levelOf(s.pts);
      let pts = 0;
      if (ok) { s.ok++; s.streak++; s.best = Math.max(s.best, s.streak); pts = Math.round(10 * clamp(.5 / Math.max(.08, pr.p), .6, 4)) + (s.streak >= 3 ? 5 : 0); }
      else s.streak = 0;
      s.pts += pts;
      s.hist.unshift({ ts: now(), a: pr.a, b: pr.b, pick: pr.pick, w: m.w, p: pr.p, pts, ok }); if (s.hist.length > 40) s.hist.length = 40;
      toast(`<div class="v29-toast-ic">${ok ? '🎯' : '✗'}</div><div class="v29-toast-t"><small>Прогноз ${ok ? 'сбылся' : 'не сбылся'}</small><b>${esc(pr.a)} — ${esc(pr.b)}: ${esc(m.w)}${ok ? ` · +${pts}` : ''}</b></div>`);
      if (ok && pr.p < .4 && levelOf(s.pts) >= 2) { try { W.V29News && W.V29News.add({ cat: 'match', icon: '🎙️', imp: 4, title: `Колонка аналитика: апсет ${m.w} был предсказуем`, lead: `Наш колумнист заранее ставил на ${m.w} (шансы ~${Math.round(pr.p * 100)}%) в матче ${pr.a} — ${pr.b}.`, body: [`Серия верных прогнозов: ${s.streak}.`], tags: [{ t: 'team', v: m.w }] }); } catch (e) {} }
      const after = levelOf(s.pts); if (after > before) toast(`<div class="v29-toast-ic">⭐</div><div class="v29-toast-t"><small>Новый уровень аналитика</small><b>${esc(LEVELS[after][1])}</b></div>`);
    });
    save();
  }
  function insiders() {
    const R = W.V34Roster; if (!R || !R.st) return [];
    const out = [];
    H.ranked().filter(t => !t.isAcademy).slice(0, 40).forEach(t => { try { const x = R.st(t.name); if (x && /UNDER_REVIEW|TRANSFER_SEARCH|NEGOTIATION/.test(x.state)) { const sig = (x.signals || []).find(g => g && g.players && g.players.length); out.push({ team: t.name, state: R.SL ? R.SL[x.state] : x.state, who: sig ? sig.players.slice(0, 2).join(', ') : '' }); } } catch (e) {} });
    return out.slice(0, 6);
  }
  function repBox() {
    const s = S(), lv = levelOf(s.pts), nx = LEVELS[lv + 1];
    const acc = s.n ? Math.round(s.ok / s.n * 100) : 0;
    const prog = nx ? Math.round((s.pts - LEVELS[lv][0]) / (nx[0] - LEVELS[lv][0]) * 100) : 100;
    const ins = lv >= 3 ? insiders() : [];
    const unlock = lv < 2 ? 'С уровня «Колумнист» ваши угаданные апсеты выходят колонкой в новостях.' : lv < 3 ? 'С уровня «Эксперт студии» открываются инсайды о реальных поисках клубов.' : '';
    return H.box(`Репутация аналитика`, `<dl class="v99-kv"><dt>Уровень</dt><dd><b>${esc(LEVELS[lv][1])}</b></dd><dt>Очки</dt><dd>${s.pts}${nx ? ` / ${nx[0]}` : ''}</dd><dt>Точность</dt><dd>${acc}% (${s.ok} из ${s.n})</dd><dt>Серия</dt><dd>${s.streak} · рекорд ${s.best}</dd></dl>
      <span class="v99-tbar" style="width:100%;margin:10px 0 4px;display:block"><i style="width:${prog}%"></i></span>
      ${unlock ? `<p class="hs-note">${esc(unlock)}</p>` : ''}
      ${ins.length ? `<h4 class="v96-ph sub">Инсайды</h4><ul class="v99-list">${ins.map(x => `<li><b>🔒</b><span><a data-team="${esc(x.team)}">${esc(x.team)}</a>: ${esc(x.state)}${x.who ? ` — под вопросом ${esc(x.who)}` : ''}</span></li>`).join('')}</ul>` : ''}`, '', 'v99-rep');
  }
  function predBox(f) {
    const s = S(), k = keyOf(f), pr = s.pred[k], m = f.match;
    let q = null; try { q = W.calcMatchOdds(m.t1, m.t2, false); } catch (e) {}
    const pct = q ? [Math.round(q.p1_win * 100), 100 - Math.round(q.p1_win * 100)] : [50, 50];
    const pot = p => Math.round(10 * clamp(.5 / Math.max(.08, p / 100), .6, 4));
    const body = pr ? `<p>Ваш прогноз: <b>${esc(pr.pick)}</b> (шансы ~${Math.round(pr.p * 100)}%). Очки — после матча.</p>`
      : canPredict(f) ? `<div class="v99-actions"><button type="button" class="hs-btn ghost sm" data-v99pred="${esc(m.t1)}">${esc(m.t1)} · ${pct[0]}% · +${pot(pct[0])}</button><button type="button" class="hs-btn ghost sm" data-v99pred="${esc(m.t2)}">${esc(m.t2)} · ${pct[1]}% · +${pot(pct[1])}</button></div><p class="hs-note">Прогноз принимается до 6-го раунда первой карты.</p>`
        : '<p class="hs-note">Прогнозы на этот матч закрыты — дождитесь следующего.</p>';
    const up = upcoming().filter(x => !(x.a === m.t1 && x.b === m.t2)).map(x => { const k = pairKey(x.a, x.b, x.ev), done = s.pred[k];
      let pc = 50; try { const q2 = W.calcMatchOdds(x.a, x.b, false); if (q2) pc = Math.round(q2.p1_win * 100); } catch (e) {}
      return `<li><span>${esc(x.a)} — ${esc(x.b)}</span>${done ? `<b class="v99-chip">${esc(done.pick)}</b>` : `<span class="v99-actions"><button type="button" class="hs-btn ghost sm" data-v99pp="${esc(x.a)}|${esc(x.b)}|${esc(x.ev)}|a">${esc(x.a)} · +${pot(pc)}</button><button type="button" class="hs-btn ghost sm" data-v99pp="${esc(x.a)}|${esc(x.b)}|${esc(x.ev)}|b">${esc(x.b)} · +${pot(100 - pc)}</button></span>`}</li>`; }).join('');
    return H.box('Ваш прогноз', body + (up ? `<h4 class="v96-ph sub">Ближайшие матчи</h4><ul class="v99-list v99-uplist">${up}</ul>` : ''), '', 'v99-pred');
  }
  H.CLICKS.push(['[data-v99pred]', el => { const f = H.spectator && H.spectator.direct(); if (f && predict(f, el.dataset.v99pred)) H.render(); }]);
  H.CLICKS.push(['[data-v99pp]', el => { const [a, b, ev, w] = el.dataset.v99pp.split('|'); if (predictPair(a, b, w === 'a' ? a : b, ev)) H.render(); }]);

  /* ------------------------------------------------------------ 3. уведомления о матче */
  const isRunningSkip = () => { const l = document.getElementById('pt-skip-l'); return !!l && /Пропуск|К матчу/.test(l.textContent || ''); };
  function pauseTime() {
    try { if (isRunningSkip()) { const b = document.getElementById('pt-skip'); if (b) b.click(); } } catch (e) {}
    try { if (W.v15IsCalendarPaused && !W.v15IsCalendarPaused() && W.toggleGameCalendarPause) W.toggleGameCalendarPause(); } catch (e) {}
  }
  function alertTick() {
    const ft = fav(); if (!ft) return; const s = S();
    // эфир стартовал
    const b = CT() && CT().broadcast, act = (b && b.active) || [];
    act.forEach(it => {
      const m = it.match; if (!m || (m.t1 !== ft && m.t2 !== ft)) return;
      const k = 'live|' + it.id + '|' + (CT() ? CT().name : ''); if (s.alerted[k]) return; s.alerted[k] = now();
      const opp = m.t1 === ft ? m.t2 : m.t1, mine = ft === me();
      if (s.autoPause && H.S.page !== 'watch') pauseTime();
      toast(`<div class="v29-toast-ic">📺</div><div class="v29-toast-t"><small>${mine ? 'Ваш матч начался' : 'Матч вашей команды в эфире'}</small><b>${esc(ft)} — ${esc(opp)}</b><button type="button" class="hs-btn sm" data-v99watch="${esc(it.id)}">Смотреть</button></div>`);
    });
    // за игровые сутки
    let lm = []; try { lm = H.liveMatches ? H.liveMatches() : []; } catch (e) {}
    lm.forEach(x => { const m = x.m; if (!m || x.live || (m.a !== ft && m.b !== ft) || !x.at) return; const left = x.at - now(); if (left <= 0 || left > DAY) return;
      const k = 'pre|' + m.a + '|' + m.b + '|' + Math.floor(x.at / DAY); if (s.alerted[k]) return; s.alerted[k] = now();
      const opp = m.a === ft ? m.b : m.a, hrs = Math.max(1, Math.round(left / 36e5));
      toast(`<div class="v29-toast-ic">⏰</div><div class="v29-toast-t"><small>Скоро матч ${esc(ft)}</small><b>через ~${hrs} ч: ${esc(ft)} — ${esc(opp)}</b><span>${esc((x.snap && x.snap.name) || '')}</span></div>`); });
    const ks = Object.keys(s.alerted); if (ks.length > 300) ks.slice(0, ks.length - 200).forEach(k => delete s.alerted[k]);
  }
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-v99watch]'); if (!b) return; e.preventDefault(); try { H.spectator.focus(b.dataset.v99watch); } catch (er) { H.nav('watch'); } });
  H.CLICKS.push(['[data-v99ap]', el => { S().autoPause = !S().autoPause; save(); H.render(); }]);
  H.CLICKS.push(['[data-v99tv]', () => { try { W.startTVBroadcastMode(); } catch (e) {} setTimeout(() => { try { H.render(); } catch (e) {} }, 400); }]);

  /* ------------------------------------------------------------ вставки в «Режим зрителя» */
  (H.AFTER || []).push((pg, arg, root) => {
    if (pg !== 'watch' || !root) return;
    try {
      const ct = CT(), running = ct && !ct.completed, b = ct && ct.broadcast;
      const off = root.querySelector('.v97-off');
      if (off && running && !(b && b.running)) { const act = off.querySelector('.v97-off-act'); if (act && !act.querySelector('[data-v99tv]')) act.insertAdjacentHTML('afterbegin', '<button type="button" class="hs-btn" data-v99tv>📺 Запустить эфир</button>'); const h2 = off.querySelector('h2'); if (h2) h2.textContent = 'Турнир идёт — эфир не запущен'; }
      const f = H.spectator && H.spectator.direct();
      const g = root.querySelectorAll('.hs-grid2 > .hs-col');
      const cols = [root.querySelector('.v97-stage-main') || g[0], root.querySelector('.v97-stage-side') || g[1]].filter(Boolean);   // v97 перекладывает эфир в main/side
      if (f && cols.length >= 2) {
        if (!root.querySelector('.v99-board')) { const tb = board(f); if (tb) { const firstBox = cols[0].querySelector('.hs-box'); const html = H.box('Игроки на карте', tb, '', 'v99-board'); if (firstBox) firstBox.insertAdjacentHTML('afterend', html); else cols[0].insertAdjacentHTML('afterbegin', html); } }
        if (!root.querySelector('.v99-pred')) cols[1].insertAdjacentHTML('afterbegin', predBox(f));
      }
      const side = cols[1] || root;
      if (!root.querySelector('.v99-rep')) (cols[1] ? side.insertAdjacentHTML('beforeend', repBox()) : root.insertAdjacentHTML('beforeend', repBox()));
      const s = S(), ft = fav();
      if (!root.querySelector('.v99-ap')) root.insertAdjacentHTML('beforeend', `<p class="hs-note v99-ap">${ft ? `Матчи «${esc(ft)}»: уведомление за сутки и при старте эфира. ` : 'Отметьте любимую команду («★ Моя команда» на её странице) — и вы не пропустите её матчи. '}<button type="button" class="hs-btn ghost sm" data-v99ap>${s.autoPause ? 'Пауза при старте: вкл.' : 'Пауза при старте: выкл.'}</button></p>`);
    } catch (e) { console.warn('[v99 spectator]', e); }
  });

  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => { if (W.v57BatchCalendarSkip) return; try { alertTick(); } catch (e) {} try { settle(); } catch (e) {} }, 1500, 'v99-spectator');

  W.V99Spec = { S, predict, predictPair, upcoming, settle, alertTick, insiders, levelOf, LEVELS, board };
})();
