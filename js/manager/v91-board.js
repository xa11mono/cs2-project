/* v91 — Этап 1 · контракт с руководством.

   Раньше совет директоров (v84) смотрел только на места на турнирах Tier-1 относительно ожидания по рейтингу.
   Теперь, когда менеджер берёт клуб (CS2Control), он подписывает контракт: срок и цели, рассчитанные из положения клуба
   в момент подписания. Работу оценивают по пяти направлениям (веса — CS2Config 'board.w*'):
     • рейтинг — прогресс относительно места при подписании, а не абсолютное место: подъём с 35-го на 12-е —
       выполненная цель, даже без трофея;
     • турниры — цель по уровню клуба: плей-офф Мейджора (топ-5), плей-офф Tier-1 (топ-15), выход на Tier-1 (топ-30),
       плей-офф любого турнира (остальные);
     • финансы — бюджет относительно бюджета при подписании и отсутствие долгов;
     • молодёжь — для клубов с академией или ставкой на молодёжь: воспитанник или игрок до 21 года в основе;
     • климат в команде — средняя мораль основы.
   Доверие = взвешенная оценка × 100. Ниже 'board.warnConf' — предупреждение; ниже 'board.fireConf' после 40% срока
   контракта и двух плохих оценок подряд — увольнение (клуб возвращается ИИ, приходят предложения клубов ниже). В конце
   срока — продление с новыми целями или расставание. При высоком доверии — предложения от клубов выше.
   Оценки после каждого турнира Tier-1 и в конце сезона хранятся в истории контракта. Заменяет решение об увольнении
   совета директоров v84 (окно предложений работы остаётся тем же). */
(function () {
  'use strict';
  const W = window, V = W.V31;
  if (!V || typeof seasonState === 'undefined' || typeof teams === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DAY = 864e5;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const byName = n => teams.find(t => t && t.name === n) || null;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankOf = n => { const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.findIndex(t => t.name === n); return i < 0 ? 999 : i + 1; };
  const S = () => { const s = seasonState.v91Board = seasonState.v91Board || {}; return s; };
  const news = it => { try { W.V29News && W.V29News.add && W.V29News.add(it); } catch (e) {} };
  const journal = (type, e) => { try { W.CS2Journal && W.CS2Journal.log(type, e); } catch (x) {} };
  const budget = n => { try { return Number(V.org(n).budget) || 0; } catch (e) { return 0; } };
  const T1 = /major|elite|regular|s-?tier|tier-?1/i;
  const isT1 = h => !!h && (h.isMajor || T1.test(String(h.prestige || h.kind || h.tier || '')) || /major|iem|blast|esl pro|pgl|cologne|katowice/i.test(String(h.tournament || '')));

  function tourGoal(r0) {
    if (r0 <= 5) return { k: 'majorPO', l: 'плей-офф Мейджора (топ-8)', ok: h => h.isMajor || /major/i.test(h.tournament || '') ? h.place <= 8 : false };
    if (r0 <= 15) return { k: 't1PO', l: 'плей-офф турнира Tier-1 (топ-8)', ok: h => isT1(h) && h.place <= 8 };
    if (r0 <= 30) return { k: 't1', l: 'выход на турнир Tier-1', ok: h => isT1(h) };
    return { k: 'po', l: 'плей-офф любого турнира (топ-4)', ok: h => h.place <= 4 };
  }
  function create(name, renew) {
    const t = byName(name); if (!t) return null;
    const r0 = rankOf(name), b0 = budget(name);
    const hasYouth = teams.some(a => a.isAcademy && (a.academyParent || a.parentTeam) === name) || (() => { try { return W.V34Roster.dna(name).youth >= .5; } catch (e) { return false; } })();
    const rT = rankTarget(r0, name);
    const k = {
      team: name, from: now(), s0: season(), until: season() + (renew ? 1 : (new Date(now()).getMonth() >= 6 ? 2 : 1)),
      r0, rT, b0, youth: hasYouth, goal: tourGoal(r0).k, reviews: [], bad: 0, warned: false, status: 'active',
      starters0: (t.players || []).map(p => p && p.nick).filter(Boolean), hist0: (t.history || []).length
    };
    S()[name] = k;
    journal('BOARD', { team: name, action: renew ? 'renew' : 'contract', reason: `цели: место ${rT === 3 && r0 <= 3 ? 'в топ-3' : '№' + rT + ' (сейчас №' + r0 + ')'}, ${tourGoal(r0).l}, бюджет не ниже ${Math.round(b0 / 1e3)}k${hasYouth ? ', воспитанник в основе' : ''}; до конца сезона ${k.until}` });
    return k;
  }
  function parts(k) {
    const t = byName(k.team); if (!t) return null;
    const r = rankOf(k.team), out = {};
    // рейтинг — прогресс от места при подписании
    if (k.r0 <= 3) out.rank = { v: r <= 3 ? 1 : clamp(1 - (r - 3) / 7, 0, 1), t: `№${r} (цель — топ-3)` };
    else if (k.rT >= k.r0) { out.rank = { v: r <= k.rT ? clamp(0.75 + 0.25 * (k.rT - r) / Math.max(1, k.rT), 0, 1) : clamp(0.75 - (r - k.rT) / 15, 0, 1), t: `№${r} (цель — удержаться не ниже №${k.rT})` }; }   // v139: цель «удержаться»
    else { const prog = (k.r0 - r) / Math.max(1, k.r0 - k.rT); out.rank = { v: clamp(0.5 + 0.5 * prog, 0, 1), t: `№${k.r0} → №${r} (цель №${k.rT})` }; }
    // турниры
    // турниры после подписания: история клуба хранится «новые сначала», при подписании запомнена её длина
    const g = tourGoal(k.r0), n0 = k.hist0 != null ? k.hist0 : (k.hist0 = (t.history || []).length);
    const fresh = (t.history || []).slice(0, Math.max(0, (t.history || []).length - n0)).filter(h => h && h.place > 0 && !h.isBootcamp && !h.isSeasonAward);
    const done = fresh.some(h => g.ok(h));
    out.tour = { v: done ? 1 : fresh.some(isT1) ? 0.35 : 0.5, t: `${g.l}: ${done ? 'выполнено' : fresh.length ? 'пока нет' : 'турниров ещё не было'}` };
    // финансы
    const b = budget(k.team);
    out.fin = { v: b < 0 ? 0 : k.b0 <= 0 ? 1 : clamp(0.4 + 0.6 * b / k.b0, 0, 1), t: `бюджет ${Math.round(b / 1e3)}k (при подписании ${Math.round(k.b0 / 1e3)}k)` };
    // молодёжь
    if (k.youth) {
      const st = (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
      const got = st.some(p => p.academyGrad === k.team || ((+p.age || 25) <= 21 && !k.starters0.includes(p.nick)));
      const share = (season() - k.s0 + 1) / Math.max(1, k.until - k.s0 + 1);
      out.youth = { v: got ? 1 : share > 0.75 ? 0.2 : 0.5, t: got ? 'воспитанник/молодой игрок в основе' : 'молодой игрок ещё не в основе' };
    }
    // климат
    const st = (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
    const m = st.length ? st.reduce((a, p) => a + (+p.morale || 85), 0) / st.length : 85;
    out.harm = { v: clamp((m - 55) / 35, 0, 1), t: `мораль основы ${Math.round(m)}` };
    // v95: слова и дела — обещания на пресс-конференциях (выполненные и нарушенные)
    if (k.v95press && k.v95press.n) out.press = { v: clamp(k.v95press.v, 0, 1), t: `обещания прессе: выполнено ${k.v95press.ok || 0} из ${k.v95press.n}` };
    return out;
  }
  function score(k) {
    const p = parts(k); if (!p) return null;
    const w = { rank: C('board.wRank', .35), tour: C('board.wTour', .25), fin: C('board.wFin', .2), youth: k.youth ? C('board.wYouth', .1) : 0, harm: C('board.wHarm', .1), press: p.press ? C('board.wPress', .1) : 0 };
    const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
    const v = Object.keys(w).reduce((a, x) => a + (p[x] ? p[x].v * w[x] : 0), 0) / sum;
    return { conf: Math.round(v * 100), parts: p, w };
  }
  function offers(team, up) {
    const rk = rankOf(team); const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)).filter(t => t.name !== team && t.name !== V.managed());
    const pick = up ? l.filter((t, i) => i + 1 < rk).slice(-6) : l.filter((t, i) => Math.abs(i + 1 - rk - 6) <= 8);
    const o = W.CS2Manager2 && W.CS2Manager2.state ? W.CS2Manager2.state() : null;
    const list = pick.slice(0, 3).map(t => t.name); if (o) o.offers = list; return list;
  }
  function review(k, why) {
    const s = score(k); if (!s) return;
    k.reviews.unshift({ ts: now(), why, conf: s.conf, parts: Object.fromEntries(Object.entries(s.parts).map(([x, v]) => [x, Math.round(v.v * 100)])) });
    if (k.reviews.length > 30) k.reviews.length = 30;
    k.bad = s.conf < C('board.fireConf', 25) ? k.bad + 1 : 0;
    journal('BOARD', { team: k.team, action: 'review', reason: `${why}: доверие ${s.conf}% — ${Object.values(s.parts).map(x => x.t).join('; ')}` });
  }
  function fire(k, why) {
    k.status = 'fired';
    news({ cat: 'season', icon: '🚪', imp: 8, title: `${k.team} расстаётся с менеджером`, lead: why, body: ['Предложения от других клубов — в разделе «Штаб организации».'], tags: [{ t: 'team', v: k.team }] });
    offers(k.team, false);
    try { V.careerLog && V.careerLog(`Уволен из ${k.team}: ${why}`); } catch (e) {}
    if (W.CS2Control) W.CS2Control.release(`уволен советом директоров: ${why}`); else V.setManaged('');
  }
  // вызывается регулярно: контракт, оценки после турниров Tier-1 и в конце сезона, предупреждения, увольнение
  function tick() {
    const team = V.managed(); if (!team) return;
    let k = S()[team];
    if (!k || k.status !== 'active') k = create(team, false);
    if (!k) return;
    const t = byName(team);
    // новый турнир Tier-1 в истории — оценка
    const top = (t.history || [])[0], key = top && (top.tournament + '|' + (top.season || ''));
    if (top && top.place > 0 && isT1(top) && key !== k.lastEv) { k.lastEv = key; if (k.hist0 != null) review(k, `после ${top.tournament} (${top.place}-е место)`); }
    if (k.lastSeason == null) k.lastSeason = season();
    if (season() !== k.lastSeason) { k.lastSeason = season(); review(k, `итоги сезона ${season() - 1}`); }
    const s = score(k); if (!s) return;
    k.conf = s.conf;
    const elapsed = (now() - k.from) / DAY, total = Math.max(120, (k.until - k.s0 + 1) * 330);
    if (s.conf < C('board.warnConf', 40) && !k.warned && k.reviews.length) { k.warned = true; news({ cat: 'season', icon: '⚠️', imp: 6, title: `Совет директоров ${team} недоволен`, lead: `Доверие — ${s.conf}%. ${Object.values(s.parts).filter(x => x.v < .4).map(x => x.t).join('; ') || ''}`, body: [], tags: [{ t: 'team', v: team }] }); }
    if (s.conf >= C('board.warnConf', 40) + 10) k.warned = false;
    if (k.bad >= 2 && elapsed >= total * 0.4) return fire(k, `доверие ${s.conf}%: ${Object.values(s.parts).filter(x => x.v < .4).map(x => x.t).join('; ')}`);
    // конец контракта
    if (season() > k.until) {
      if (s.conf >= C('board.renewConf', 55)) { k.status = 'done'; create(team, true); news({ cat: 'season', icon: '🤝', imp: 6, title: `${team} продлевает контракт с менеджером`, lead: `Доверие совета — ${s.conf}%. Новые цели — в разделе «Режим игры».`, body: [], tags: [{ t: 'team', v: team }] }); }
      else return fire(k, `контракт истёк, доверие ${s.conf}% — совет не продлевает`);
    }
    const mk = Math.floor(now() / (30 * DAY));
    if (s.conf >= C('board.offerConf', 85) && k.offerMonth !== mk) { k.offerMonth = mk; offers(team, true); }
  }
  function box() {
    const H = W.HS, team = V.managed(), k = team && S()[team]; if (!H || !k) return '';
    const s = score(k); if (!s) return '';
    const bar = v => `<span class="cr-bar"><i style="width:${Math.round(v * 100)}%"></i></span>`;
    const L = { rank: 'Рейтинг', tour: 'Турниры', fin: 'Финансы', youth: 'Молодёжь', harm: 'Климат в команде', press: 'Слова и дела' };
    const rows = Object.entries(s.parts).map(([x, p]) => `<tr><td class="l"><b>${L[x]}</b> <small>${Math.round(s.w[x] * 100)}%</small></td><td>${bar(p.v)}</td><td class="l"><small>${H.esc(p.t)}</small></td></tr>`).join('');
    const o = W.CS2Manager2 && W.CS2Manager2.state ? W.CS2Manager2.state() : null, off = ((o && o.offers) || []).filter(n => n !== team);
    return `<section class="hs-box v84-board v91-board"><header class="hs-box-h"><h3>Контракт с руководством</h3><span class="hs-sub">до конца сезона ${k.until} · доверие ${s.conf}%</span></header><div class="hs-box-b">
      <table class="hs-tbl"><tbody>${rows}</tbody></table>
      <p class="hs-note">${s.conf >= 70 ? 'Совет доволен работой.' : s.conf >= C('board.warnConf', 40) ? 'Совет ждёт прогресса.' : 'Ваша должность под угрозой.'} Оценки — после каждого турнира Tier-1 и в конце сезона.</p>
      ${k.reviews.length ? `<details><summary>История оценок (${k.reviews.length})</summary><ul>${k.reviews.slice(0, 10).map(r => `<li>${H.esc(r.why)} — ${r.conf}%</li>`).join('')}</ul></details>` : ''}
      ${off.length ? `<div class="v84-offers"><small>Предложения работы:</small>${off.map(n => `<button type="button" class="hs-btn ghost sm" data-joboffer="${H.esc(n)}">${H.logo(n, 'xs')} ${H.esc(n)} (#${rankOf(n)})</button>`).join('')}</div>` : ''}</div></section>`;
  }
  // v139: цели по уровню клуба (ориентиры реальной сцены): топ-3 — остаться в топ-3; 4–10 — в топ-10; 11–30 — удержаться
  // в топ-30; 31–60 — войти/удержаться в топ-50; ниже — удержаться в топ-80. Раньше всем — «подняться на четверть»
  // (с №77 на №58 за сезон), и слабые клубы увольняли за невыполнимую цель.
  const rankTarget = (r0, name) => { try { if (name && (C('concept.clubs', []) || []).includes(name)) return Math.max(r0 + 10, 80); } catch (e) {}
    return r0 <= 3 ? 3 : r0 <= 10 ? 10 : r0 <= 30 ? 30 : r0 <= 60 ? 50 : 80; };
  // tourGoal и rankTarget нужны экрану выбора организации (v96): он показывает цели руководства по тем же правилам
  W.CS2Board = { tick, score, parts, create, review, box, state: S, contract: n => S()[n || V.managed()] || null, tourGoal, rankTarget };
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { tick(); } catch (e) { console.warn('[v91 board]', e); } }, 4000, 'v91-board');
  // контракт — на странице «Режим игры»
  const H = W.HS;
  if (H && H.PAGES && H.PAGES.control && !H.PAGES.control.__v91) {
    const f = H.PAGES.control; const w = function () { let h = f.apply(this, arguments); try { if (V.managed()) { tick(); h = h.replace('<div class="hs-grid2"><div class="hs-col">', '<div class="hs-grid2"><div class="hs-col">' + box()); } } catch (e) {} return h; };
    w.__v91 = true; H.PAGES.control = w;
  }
})();
