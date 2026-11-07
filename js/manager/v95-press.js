/* v95 — Этап 5 · пресса и внутренние события клуба.

   ПРЕСС-КОНФЕРЕНЦИИ ПЕРЕД ТУРНИРОМ (менеджер; Центр событий). Вопрос — из положения команды, а не случайный:
     • серия поражений или провал прошлого турнира — «Планируете ли вы менять состав?»: доверяем составу / рассматриваем
       изменения / проблемы в подготовке / не обсуждаем внутренние вопросы;
     • Мейджор — «Какая цель на Мейджор?»: титул / плей-офф / опыт и рост;
     • фаворит (топ-3) — «Вы главные фавориты?».
   Ответ — не кнопка морали: он становится обещанием. Через 8 недель (состав) или после турнира (цель) обещание
   проверяется: выполнено — репутация и болельщики довольны, нарушено — болельщики разочарованы, игроки перестают
   верить словам (мораль), руководство учитывает «слова и дела» в доверии (v91, 'board.wPress').
   После серии из 'press.streak' поражений вопрос о составе задают сразу.

   ВНУТРЕННИЕ СОБЫТИЯ (у всех клубов; у ИИ — его решение, у менеджера — выбор в Центре событий). Возникают из состояния
   людей и организации:
     • недовольство зарплатой — сильный игрок получает меньше 'events.salaryGap' рыночной зарплаты;
     • выгорание — усталость игрока выше 'events.burnout' (много турниров подряд, слабый тренер по нагрузке);
     • разногласия с тренером — команда падает в рейтинге, а у лидера раздевалки сильный характер;
     • споры об игровой системе — новый тактический план ещё не сыгран, а результаты не идут;
     • возвращение после неудачного периода, улучшение отношений в коллективе — хорошие новости тоже бывают.
   Не больше 'events.perWeek' новых событий на клуб в неделю.

   ПОСЛЕДСТВИЯ ТИТУЛА: после Мейджора или турнира Tier-1 — популярность (v93), предложения другим клубам по игрокам
   чемпиона, партнёр увеличивает выплаты (Мейджор), руководство поднимает цель по рейтингу.

   СЛУХИ И ДОСТОВЕРНОСТЬ: у каждого слуха — источник и степень достоверности (переговоры, подтверждённый интерес,
   клуб рассматривает перестройку, игрок недоволен положением, предложение отклонено). Новые слухи — только из
   реальных событий игры: внутренних событий ИИ-клубов и отказов игроков в журнале рынка. */
(function () {
  'use strict';
  const W = window, V = W.V31;
  if (!V || typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DAY = 864e5, WEEK = 7 * DAY;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const seedv = () => { try { return W.CS2SaveProfile ? W.CS2SaveProfile.state().seed : 0; } catch (e) { return 0; } };
  const u = (...k) => (h32(seedv() + '|' + k.join('|')) % 100000) / 100000;
  const byName = n => teams.find(t => t && t.name === n) || null;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const ranked = () => pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const rankOf = n => { const i = ranked().findIndex(t => t.name === n); return i < 0 ? 999 : i + 1; };
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const news = it => { try { return W.V29News && W.V29News.add && W.V29News.add(it); } catch (e) { return null; } };
  const journal = (type, e) => { try { W.CS2Journal && W.CS2Journal.log(type, e); } catch (x) {} };
  const pow = p => { try { return V.pow(p); } catch (e) { return 75; } };
  const starters = t => (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
  const mor = (p, d) => { if (p) p.morale = clamp((+p.morale || 85) + d, 30, 100); };
  const fans = (n, d, why) => { try { W.CS2Fans && W.CS2Fans.bump(n, d, why); } catch (e) {} };
  const rep = (n, d) => { try { const o = V.org(n); o.rep = clamp((o.rep || 30) + d, 0, 100); } catch (e) {} };
  const money = v => { try { return V.money(v); } catch (e) { return '$' + Math.round(v); } };
  const S = () => { const s = seasonState.v95 = seasonState.v95 || {}; s.promises = s.promises || []; s.pressDone = s.pressDone || {}; s.titles = s.titles || {}; s.lowConf = s.lowConf || {}; s.rumorSeen = s.rumorSeen || {}; s.stat = s.stat || {}; return s; };
  const stat = k => { const s = S().stat; s[k] = (s[k] || 0) + 1; };
  const EV = V.EV, raise = V._t && V._t.raise;
  if (!EV || !raise) return;
  const isBig = ct => !!ct && (ct.isMajor || ct.isElite || /major|elite|regular/i.test(String(ct.prestige || '')));
  const recentForm = t => (t.history || []).filter(h => h && h.place > 0 && !h.isBootcamp && !h.isSeasonAward && (h.isMajor || h.isElite)).slice(0, 2);
  const expectPlace = rk => rk <= 3 ? 3 : rk <= 8 ? 5 : rk <= 16 ? 8 : 12;

  /* ============================================================ слова и дела */
  function board(team, ok) {
    try { const k = W.CS2Board && W.CS2Board.contract(team); if (!k || k.status !== 'active') return;
      const p = k.v95press = k.v95press || { v: 0.6, n: 0, ok: 0 }; p.n++; if (ok) p.ok++; p.v = clamp(p.v + (ok ? 0.15 : -0.2), 0, 1); } catch (e) {}
  }
  function promise(team, kind, data) { S().promises.push(Object.assign({ team, kind, ts: now(), s: season(), status: 'open' }, data)); journal('CAREER', { team, kind: 'press-promise', reason: data.text || kind }); }
  function rosterChangedSince(team, ts) {
    try { return (W.CS2Journal.list({ type: 'ROSTER_CHANGE', team }) || []).some(e => e.ts >= ts && e.team === team && !/stand-?in|temp/i.test(e.kind || '')); } catch (e) { return false; }
  }
  function checkPromises() {
    const t0 = now();
    S().promises.forEach(pr => {
      if (pr.status !== 'open') return;
      const t = byName(pr.team); if (!t) { pr.status = 'void'; return; }
      let res = null;
      if (pr.kind === 'trust') { if (rosterChangedSince(pr.team, pr.ts)) res = false; else if (t0 - pr.ts > 8 * WEEK) res = true; }
      else if (pr.kind === 'change') { if (rosterChangedSince(pr.team, pr.ts)) res = true; else if (t0 - pr.ts > 8 * WEEK) res = false; }
      else if (pr.kind === 'place') { const h = (t.history || []).find(x => x && x.tournament === pr.tour); if (h) res = (+h.place || 99) <= pr.target; else if (t0 - pr.ts > 10 * WEEK) pr.status = 'void'; }
      if (res === null) return;
      pr.status = res ? 'kept' : 'broken'; pr.doneAt = t0; stat(res ? 'kept' : 'broken');
      board(pr.team, res);
      if (res) { rep(pr.team, 1.5); fans(pr.team, 2, `обещание выполнено: ${pr.text}`); }
      else { fans(pr.team, -3, `обещание не выполнено: ${pr.text}`); starters(t).forEach(p => mor(p, pr.kind === 'trust' ? -4 : -2)); }
      try { V.careerLog && pr.team === me() && V.careerLog(`Обещание прессе «${pr.text}» — ${res ? 'выполнено' : 'не выполнено'}`); } catch (e) {}
      if (pr.team === me()) news({ cat: 'interview', icon: res ? '✅' : '🗞️', imp: 4, title: res ? `${pr.team} держат слово` : `${pr.team} не сдержали обещание`, lead: `На пресс-конференции было сказано: «${pr.text}». ${res ? 'Так и вышло.' : 'Вышло иначе — болельщики и журналисты это запомнили.'}`, body: [], tags: [{ t: 'team', v: pr.team }] });
    });
    const p = S().promises; if (p.length > 80) p.splice(0, p.length - 80);
  }

  /* ============================================================ пресс-конференции перед турниром */
  EV.prepress = {
    check() {},   // поднимается из tick() — при старте турнира с участием команды менеджера или после серии поражений
    ai: () => 'calm',
    apply(ev, k) {
      const t = byName(ev.team); if (!t) return '';
      const d = ev.data || {}, ps = starters(t), weak = ps.slice().sort((a, b) => pow(a) - pow(b))[0];
      let quote = '';
      if (d.q === 'roster') {
        if (k === 'trust') { promise(t.name, 'trust', { text: 'мы доверяем этому составу' }); ps.forEach(p => mor(p, 3)); quote = '«Мы полностью доверяем этому составу»'; }
        else if (k === 'change') { promise(t.name, 'change', { text: 'мы рассматриваем изменения' }); mor(weak, -6); quote = '«Мы рассматриваем определённые изменения»'; }
        else if (k === 'prep') { try { const o = V.org(t.name); o.v95prepFocus = now(); } catch (e) {} ps.forEach(p => mor(p, 1)); quote = '«Основные проблемы — в подготовке, и это наша ответственность»'; }
        else { fans(t.name, -1, 'отказ от комментариев'); quote = '«Внутренние вопросы мы не обсуждаем»'; }
      } else if (d.q === 'major') {
        const target = k === 'title' ? 1 : k === 'po' ? 8 : 0;
        if (target) promise(t.name, 'place', { tour: d.tour, target, text: k === 'title' ? `цель на ${d.tour} — титул` : `цель на ${d.tour} — плей-офф` });
        if (k === 'title') { rep(t.name, 1); ps.forEach(p => mor(p, (p.pers && p.pers.press >= 12) ? 2 : -2)); quote = '«Мы приехали за трофеем»'; }
        else if (k === 'po') quote = '«Цель — плей-офф, дальше посмотрим»';
        else { ps.forEach(p => mor(p, 2)); quote = '«Для нас это опыт и рост»'; }
      } else if (d.q === 'favourite') {
        if (k === 'yes') { promise(t.name, 'place', { tour: d.tour, target: 2, text: `мы фавориты ${d.tour}` }); rep(t.name, 1); quote = '«Да, мы фавориты и не боимся этого»'; }
        else if (k === 'step') quote = '«Думаем только о первом матче»';
        else { ps.forEach(p => mor(p, (p.pers && p.pers.press <= 8) ? 3 : 0)); quote = '«Фавориты — другие, мы просто работаем»'; }
      } else quote = '«Работаем дальше»';
      stat('press');
      news({ cat: 'interview', icon: '🎤', imp: 4, title: `${t.name}: ${quote}`, lead: `${d.question || 'Пресс-конференция'} — отвечает тренер ${t.name}${d.tour ? ` перед ${d.tour}` : ''}.`, body: [], tags: [{ t: 'team', v: t.name }] });
      return quote;
    }
  };
  function pressQuestion(t, ct, streak) {
    const rk = rankOf(t.name), last = recentForm(t), flop = last.length && (+last[0].place || 0) > expectPlace(rk) + 4;
    if (streak || flop) return { q: 'roster', question: streak ? `Команда проиграла ${-t.streak} матчей подряд. Планируете ли вы менять состав?` : `Команда заняла ${last[0].place}-е место на ${last[0].tournament}. Планируете ли вы менять состав?`,
      options: [{ k: 'trust', l: 'Полностью доверяем текущему составу', d: 'Игроки довольны; если состав всё же изменится — слова разойдутся с делом' }, { k: 'change', l: 'Рассматриваем определённые изменения', d: 'Слабое звено нервничает; руководство ждёт действий' }, { k: 'prep', l: 'Основные проблемы — в подготовке', d: 'Ответственность на штабе' }, { k: 'nocomment', l: 'Не обсуждаем внутренние вопросы', d: 'Болельщики недовольны закрытостью' }] };
    if (ct && ct.isMajor) return { q: 'major', question: `Какая цель на ${ct.name}?`,
      options: [{ k: 'title', l: 'Только титул', d: 'Репутация +; не выиграете — болельщики разочарованы' }, { k: 'po', l: 'Плей-офф', d: 'Обещание: топ-8' }, { k: 'exp', l: 'Опыт и рост', d: 'Без обещаний, давление ниже' }] };
    if (ct && rk <= 3) return { q: 'favourite', question: `Вас называют главными фаворитами ${ct.name}. Согласны?`,
      options: [{ k: 'yes', l: 'Да, мы фавориты', d: 'Обещание: финал' }, { k: 'step', l: 'Думаем о первом матче', d: 'Без обещаний' }, { k: 'under', l: 'Фавориты — другие', d: 'Снимает давление с молодых и нервных' }] };
    return null;
  }
  function pressTick() {
    const name = me(), t = byName(name); if (!t) return;
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null, s = S();
    if (ct && !ct.completed && isBig(ct) && (ct.participants || []).includes(name)) {
      const key = season() + '|' + ct.name;
      if (!s.pressDone[key]) { s.pressDone[key] = now(); const q = pressQuestion(t, ct, false);
        if (q) raise('prepress', name, [], { keySuffix: key, days: C('press.preDays', 3), title: `Пресс-конференция перед ${ct.name}`, text: q.question, options: q.options, data: Object.assign({ tour: ct.name }, q) }); }
    }
    if ((+t.streak || 0) <= -C('press.streak', 4)) {
      const key = 'streak|' + Math.floor(now() / (3 * WEEK));
      if (!s.pressDone[key]) { s.pressDone[key] = now(); const q = pressQuestion(t, null, true); raise('prepress', name, [], { keySuffix: key, days: 4, title: 'Вопросы журналистов после серии поражений', text: q.question, options: q.options, data: q }); }
    }
    const ks = Object.keys(s.pressDone); if (ks.length > 60) ks.slice(0, ks.length - 60).forEach(k => delete s.pressDone[k]);
  }

  /* ============================================================ внутренние события */
  const recentFor = team => { try { return V.S().events.filter(e => e.team === team && now() - e.ts < WEEK && /^(salary|burnout|rift|system)$/.test(e.type)).length; } catch (e) { return 0; } };
  // у ИИ-клубов события редче: разногласия с тренером — самые частые поводы (падение в рейтинге бывает у многих), поэтому реже всех
  const AI_CHANCE = { salary: 0.35, burnout: 0.2, rift: 0.12, system: 0.35 };
  const gate = (t, type) => recentFor(t.name) < C('events.perWeek', 3) && (t.name === me() || u(type, t.name, Math.floor(now() / WEEK)) < (AI_CHANCE[type] || 0.3));
  const rumorAbout = (t, p, kind, text) => {
    if (t.name === me() || rankOf(t.name) > 30) return;
    const key = kind + '|' + t.name + '|' + (p ? p.nick : '') + '|' + season(); if (S().rumorSeen[key]) return; S().rumorSeen[key] = now();
    news({ cat: 'rumor', rumor: true, icon: '🕵️', imp: 3, team: t.name, title: text, lead: `Источник в команде сообщает о внутренних проблемах ${t.name}.`, body: [], rel: { k: 1, l: 'игрок недоволен положением', src: 'источник в команде' }, tags: [{ t: 'team', v: t.name }].concat(p ? [{ t: 'player', v: p.nick }] : []) });
  };
  EV.salary = {
    check(t) {
      const gap = C('events.salaryGap', 0.6);
      const p = starters(t).map(x => V.ensurePerson(x)).filter(x => pow(x) >= 78 && (x.pers.amb || 10) >= 10 && !x.v95salAsk && (+x.salary || 0) < gap * V.salaryOf(x, t)).sort((a, b) => pow(b) - pow(a))[0];
      if (!p || !gate(t, 'salary')) return;
      const market = Math.round(V.salaryOf(p, t) * 0.95 / 1000) * 1000;
      const ev = raise('salary', t.name, [p.nick], { title: `${p.nick} недоволен зарплатой`, text: `${p.nick} получает ${money(p.salary)} за сезон — заметно ниже рынка (${money(market)}). Агент просит пересмотреть контракт.`,
        options: [{ k: 'raise', l: `Поднять до ${money(market)}`, d: 'Мораль +, фонд зарплат растёт' }, { k: 'promise', l: 'Пообещать вернуться к вопросу при продлении', d: 'Мораль немного −' }, { k: 'refuse', l: 'Отказать', d: 'Мораль −; амбициозный игрок может захотеть уйти' }], data: { nick: p.nick, market } });
      if (ev) { p.v95salAsk = now(); stat('salary'); if (ev.status !== 'open' && ev.choice === 'refuse') rumorAbout(t, p, 'salary', `${p.nick} недоволен контрактом в ${t.name}`); }
    },
    ai(ev) { const t = byName(ev.team); let pol = 'healthy'; try { pol = W.CS2Finance.policy(t); } catch (e) {} return pol === 'healthy' ? 'raise' : pol === 'tight' ? 'promise' : 'refuse'; },
    apply(ev, k) {
      const t = byName(ev.team), p = (t && t.players || []).find(x => x.nick === ev.data.nick); if (!p) return 'игрок уже в другой команде';
      if (k === 'raise') { p.salary = ev.data.market; mor(p, 6); return `новая зарплата ${money(p.salary)}`; }
      if (k === 'promise') { mor(p, -2); p.v95salPromise = season(); return 'вопрос отложен до продления'; }
      mor(p, -8); if ((p.pers && p.pers.amb || 10) >= 15) { p.v31listed = now(); return `${p.nick} хочет уйти — выставлен на трансфер`; } return 'мораль снизилась';
    }
  };
  EV.burnout = {
    check(t) {
      const p = starters(t).filter(x => (+x.fatigue || 0) >= C('events.burnout', 85) && !(x.v95burn && now() - x.v95burn < 10 * WEEK)).sort((a, b) => (+b.fatigue || 0) - (+a.fatigue || 0))[0];
      if (!p || !gate(t, 'burnout')) return;
      const ev = raise('burnout', t.name, [p.nick], { keySuffix: Math.floor(now() / (10 * WEEK)), title: `${p.nick}: признаки выгорания`, text: `Тренер по нагрузке докладывает: ${p.nick} давно играет без отдыха, усталость ${Math.round(+p.fatigue || 0)} — среди самых высоких на сцене.`,
        options: [{ k: 'rest', l: 'Неделя отдыха', d: 'Усталость сильно −, форма чуть −' }, { k: 'psych', l: 'Спортивный психолог ($40 000)', d: 'Усталость −, уверенность +' }, { k: 'push', l: 'Играть дальше', d: 'Форма и уверенность падают' }], data: { nick: p.nick } });
      if (ev) { p.v95burn = now(); stat('burnout'); }
    },
    ai(ev) { const t = byName(ev.team); let perf = 60; try { perf = W.CS2Staff.of(t).perf.skill; } catch (e) {} return perf >= 70 ? 'rest' : V.org(ev.team).budget > 300000 ? 'psych' : 'push'; },
    apply(ev, k) {
      const t = byName(ev.team), p = (t && t.players || []).find(x => x.nick === ev.data.nick); if (!p) return '';
      if (k === 'rest') { p.fatigue = Math.max(0, (+p.fatigue || 0) - 45); p.form = clamp((+p.form || 100) - 3, 80, 120); return 'игрок отдохнул'; }
      if (k === 'psych') { V.book(ev.team, -40000, 'staff', 'Спортивный психолог'); p.fatigue = Math.max(0, (+p.fatigue || 0) - 25); p.conf = clamp((+p.conf || 60) + 5, 5, 98); return 'усталость снизилась'; }
      p.form = clamp((+p.form || 100) - 6, 80, 120); p.conf = clamp((+p.conf || 60) - 5, 5, 98); mor(p, -4); return 'форма падает';
    }
  };
  const rankDrop = t => { const r = rankOf(t.name), s0 = +t.seasonStartRank || r; return r - s0; };   // падение с начала сезона
  EV.rift = {
    check(t) {
      const drop = rankDrop(t), st0 = +t.streak || 0;
      if (!t.coach || !((drop >= 10 && st0 <= -2) || st0 <= -5)) return;   // заметный провал, а не обычные колебания
      const p = starters(t).map(x => V.ensurePerson(x)).filter(x => ((x.pers.lead || 10) >= 14 || (+x.age || 24) >= 28) && (x.pers.prof || 10) <= 10).sort((a, b) => (b.pers.lead || 0) - (a.pers.lead || 0))[0];
      if (!p || !gate(t, 'rift')) return;
      const coach = t.coach.name || 'главный тренер';
      const ev = raise('rift', t.name, [p.nick], { keySuffix: season() + '|' + Math.floor(now() / (12 * WEEK)), title: `Разногласия: ${p.nick} и ${coach}`, text: `Команда ${drop >= 10 ? `опустилась на ${drop} мест с начала сезона` : `проиграла ${-st0} матчей подряд`}. ${p.nick} публично не согласен с решениями тренера.`,
        options: [{ k: 'coach', l: 'Поддержать тренера', d: `Мораль ${p.nick} −, авторитет тренера сохранён` }, { k: 'player', l: 'Поддержать игрока', d: 'Сыгранность −, игрок доволен' }, { k: 'talk', l: 'Общая встреча ($15 000)', d: 'Может снять напряжение' }], data: { nick: p.nick, coach } });
      if (ev) { stat('rift'); if (ev.status !== 'open') rumorAbout(t, p, 'rift', `Источники: в ${t.name} ${p.nick} не согласен с тренером`); }
    },
    ai: () => 'coach',
    apply(ev, k) {
      const t = byName(ev.team), p = (t && t.players || []).find(x => x.nick === ev.data.nick); if (!t) return '';
      if (k === 'coach') { mor(p, -8); starters(t).filter(x => x !== p).forEach(x => mor(x, 1)); return 'тренер сохранил авторитет'; }
      if (k === 'player') { mor(p, 5); t.v31chemBonus = Math.max(0, (t.v31chemBonus || 0) - .02); t.v95coachDoubt = now(); return 'авторитет тренера пошатнулся'; }
      V.book(t.name, -15000, 'staff', 'Встреча команды и штаба');
      if (u('talk', ev.id) < 0.6) { mor(p, 2); return 'напряжение снято'; } mor(p, -3); return 'разговор не помог';
    }
  };
  EV.system = {
    check(t) {
      if (!W.CS2Tactics || !t.v92tac || (+t.streak || 0) > -2) return;
      const fresh = Object.entries(t.v92tac.maps || {}).filter(([, x]) => x && (+x.fam || 1) < 0.6);
      if (!fresh.length || !gate(t, 'system')) return;
      const igl = starters(t).find(x => x.role === 'IGL');
      const ev = raise('system', t.name, igl ? [igl.nick] : [], { keySuffix: season() + '|' + Math.floor(now() / (8 * WEEK)), title: `Споры об игровой системе в ${t.name}`, text: `Новый план на ${fresh.map(([m]) => m).slice(0, 2).join(', ')} ещё не сыгран, команда проигрывает. Часть игроков просит вернуться к привычной игре.`,
        options: [{ k: 'stay', l: 'Не менять курс', d: 'Мораль −, план сыгрывается дальше' }, { k: 'revert', l: 'Вернуться к привычной игре', d: 'Сыгранность планов восстановлена' }, { k: 'freedom', l: `Больше свободы капитану${igl ? ' ' + igl.nick : ''}`, d: 'Капитан доволен, остальные — чуть меньше' }], data: { maps: fresh.map(([m]) => m), igl: igl && igl.nick } });
      if (ev) stat('system');
    },
    ai: () => 'stay',
    apply(ev, k) {
      const t = byName(ev.team); if (!t) return '';
      if (k === 'stay') { starters(t).forEach(x => mor(x, -2)); return 'курс сохранён'; }
      if (k === 'revert') { (ev.data.maps || []).forEach(m => { const x = t.v92tac && t.v92tac.maps[m]; if (x) { delete t.v92tac.maps[m]; } }); return 'команда вернулась к привычным планам'; }
      const igl = (t.players || []).find(x => x.nick === ev.data.igl); mor(igl, 6); starters(t).filter(x => x !== igl).forEach(x => mor(x, -1)); return 'капитан получил свободу';
    }
  };
  // хорошие новости — без решения менеджера
  function goodNews() {
    const s = S();
    pro().forEach(t => {
      starters(t).forEach(p => {
        const c = +p.conf || 60, k = p.nick.toLowerCase();
        if (c < 32) s.lowConf[k] = now();
        else if (c >= 60 && s.lowConf[k] && now() - s.lowConf[k] < 16 * WEEK) {
          delete s.lowConf[k]; mor(p, 5); stat('comeback');
          if (rankOf(t.name) <= 40 || t.name === me()) news({ cat: 'team', icon: '🔄', imp: 3, title: `${p.nick} возвращается после неудачного периода`, lead: `Уверенность игрока ${t.name} восстановилась (${Math.round(c)} из 100) — в последних матчах он снова в форме.`, body: [], tags: [{ t: 'team', v: t.name }, { t: 'player', v: p.nick }] });
        } else if (s.lowConf[k] && now() - s.lowConf[k] >= 16 * WEEK) delete s.lowConf[k];
      });
      const key = 'bond|' + t.name + '|' + season();
      if (!s.rumorSeen[key] && (+t.streak || 0) >= 6) {
        let chem = 0; try { chem = V.chemistry(t); } catch (e) {}
        if (chem >= 0.7 || chem >= 70) { s.rumorSeen[key] = now(); t.v31chemBonus = clamp((t.v31chemBonus || 0) + .01, 0, .12); stat('bond');
          if (rankOf(t.name) <= 40 || t.name === me()) news({ cat: 'team', icon: '🤝', imp: 3, title: `В ${t.name} отличная атмосфера`, lead: `${t.streak} побед подряд: игроки говорят, что отношения в коллективе ещё никогда не были такими хорошими.`, body: [], tags: [{ t: 'team', v: t.name }] }); }
      }
    });
    const ks = Object.keys(s.lowConf); if (ks.length > 400) ks.slice(0, ks.length - 300).forEach(k => delete s.lowConf[k]);
    const rs = Object.keys(s.rumorSeen); if (rs.length > 500) rs.slice(0, rs.length - 400).forEach(k => delete s.rumorSeen[k]);
  }

  /* ============================================================ последствия титула */
  function titles() {
    const s = S();
    pro().forEach(t => {
      const h = (t.history || [])[0]; if (!h || +h.place !== 1 || !(h.isMajor || h.isElite)) return;
      const key = (h.season || season()) + '|' + h.tournament; if (s.titles[key]) return; s.titles[key] = t.name; stat('title');
      // предложения по игрокам чемпиона от клубов выше по деньгам
      const star = starters(t).slice().sort((a, b) => pow(b) - pow(a))[0];
      if (t.name === me() && star) {
        const buyer = ranked().filter(b => b.name !== t.name).sort((a, b) => (V.org(b.name).budget || 0) - (V.org(a.name).budget || 0))[0];
        let fee = 1000000; try { fee = Math.round(V.valueOf(star) * 1.3 / 10000) * 10000; } catch (e) {}
        if (buyer && EV.offer) raise('offer', t.name, [star.nick], { keySuffix: 'title|' + key, days: 7, title: `После титула: ${buyer.name} предлагают ${money(fee)} за ${star.nick}`, text: `${star.nick} — один из героев ${h.tournament}. ${buyer.name} готовы заплатить больше рынка.`,
          options: [{ k: 'decline', l: 'Отказать', d: 'Игрок может расстроиться' }, { k: 'accept', l: 'Принять', d: `+${money(fee)} в бюджет, игрок уходит` }, { k: 'counter', l: 'Запросить больше (+30%)', d: 'Клуб может отказаться' }], data: { nick: star.nick, buyer: buyer.name, fee } });
        // руководство поднимает планку
        try { const k = W.CS2Board.contract(t.name); if (k && k.status === 'active' && k.rT > 1) { k.rT = Math.max(1, k.rT - (h.isMajor ? 3 : 1)); journal('BOARD', { team: t.name, action: 'raise-target', reason: `после титула ${h.tournament} цель по рейтингу — №${k.rT}` }); } } catch (e) {}
      }
      if (h.isMajor) {
        try { const o = V.org(t.name), sp = o.sponsor; if (sp && sp.perSeason) { sp.perSeason = Math.round(sp.perSeason * 1.1 / 1000) * 1000;
          news({ cat: 'team', icon: '🤝', imp: 4, title: `${sp.name} увеличивает выплаты ${t.name}`, lead: `После победы на ${h.tournament} партнёр поднял контракт до ${money(sp.perSeason)} за сезон.`, body: [], tags: [{ t: 'team', v: t.name }] }); } } catch (e) {}
      }
    });
    const ks = Object.keys(s.titles); if (ks.length > 120) ks.slice(0, ks.length - 100).forEach(k => delete s.titles[k]);
  }

  /* ============================================================ слухи: источник и достоверность */
  const REL = [{ k: 0, l: 'неподтверждённая информация' }, { k: 1, l: 'клуб рассматривает перестройку' }, { k: 2, l: 'подтверждённый интерес' }, { k: 3, l: 'идут переговоры' }];
  function relOf(it) {
    if (it.rel) return it.rel;
    try {
      const nick = (it.tags || []).find(x => x.t === 'player');
      const nego = nick && (transferState.v30Nego || []).find(n => n && String(n.player).toLowerCase() === String(nick.v).toLowerCase());
      if (nego) return Object.assign({ src: 'агент игрока' }, REL[3]);
      if (it.planKind === 'search') return Object.assign({ src: 'источник в клубе' }, REL[2]);
      if (it.planKind === 'review') return Object.assign({ src: 'источник в клубе' }, REL[1]);
      if (nick && (W.CS2Journal.list({ type: 'MARKET_DECISION' }) || []).slice(0, 60).some(e => JSON.stringify(e).toLowerCase().includes(String(nick.v).toLowerCase()))) return Object.assign({ src: 'источник в клубе' }, REL[2]);
    } catch (e) {}
    return Object.assign({ src: 'инсайдеры' }, REL[0]);
  }
  (function wrapNews() {
    const N = W.V29News; if (!N || !N.add) { setTimeout(wrapNews, 800); return; }
    if (N.add.__v95) return;
    const f = N.add; const w = function (it) { try { if (it && it.rumor && !it.rel) it.rel = relOf(it); } catch (e) {} return f.apply(this, arguments); };
    w.__v95 = true; N.add = w;
  })();
  // отказ игрока в журнале рынка — слух «предложение отклонено» (не чаще одного в неделю)
  function refusalRumor() {
    const s = S(), wk = Math.floor(now() / WEEK); if (s.refWk === wk) return;
    let b = []; try { b = W.CS2Journal.blocks() || []; } catch (e) {}
    const x = b.find(e => e && e.kind === 'refusal' && now() - e.ts < WEEK && e.team && rankOf(e.team) <= 20 && e.player);
    if (!x) return; const key = 'ref|' + x.team + '|' + x.player; if (s.rumorSeen[key]) return; s.rumorSeen[key] = now(); s.refWk = wk;
    news({ cat: 'rumor', rumor: true, icon: '🕵️', imp: 3, team: x.team, title: `${x.player} отказал ${x.team}`, lead: `По данным источников, ${x.team} предлагали контракт ${x.player}, но игрок отказался.`, body: [], rel: { k: 2, l: 'предложение отклонено', src: 'окружение игрока' }, tags: [{ t: 'team', v: x.team }, { t: 'player', v: x.player }] });
  }

  /* ============================================================ такт */
  function tick() { pressTick(); checkPromises(); titles(); }
  let lastWk = -1;
  function weekly() { const wk = Math.floor(now() / WEEK); if (wk === lastWk) return; lastWk = wk; goodNews(); refusalRumor(); }
  W.CS2Press = { tick, weekly, question: pressQuestion, promises: () => S().promises.slice(), stats: () => Object.assign({}, S().stat), relOf, REL };
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { if (!W.v57BatchCalendarSkip) { tick(); weekly(); } } catch (e) { console.warn('[v95 press]', e); } }, 4000, 'v95-press');
  (function hookDaily() {
    const f = W.V30RankSnapshotTick; if (typeof f !== 'function') { setTimeout(hookDaily, 1000); return; }
    if (f.__v95p) return;
    const w = function () { const r = f.apply(this, arguments); try { tick(); weekly(); } catch (e) {} return r; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v95p = true; W.V30RankSnapshotTick = w;
  })();

  /* ============================================================ достоверность на странице статьи */
  const H = W.HS; if (!H) return;
  (H.AFTER || []).push(page => {
    if (page !== 'article') return;
    try {
      const root = document.getElementById('hs-page'); if (!root || root.querySelector('.v95-rel')) return;
      const n = H.findNews && H.findNews(H.S.arg); if (!n || !n.rumor) return;
      const r = n.rel || relOf(n), h1 = root.querySelector('h1'); if (!h1) return;
      const d = document.createElement('div'); d.className = 'v95-rel r' + r.k;
      d.innerHTML = `Достоверность: <b>${H.esc(r.l)}</b> · источник: ${H.esc(r.src || '—')} <span class="v95-dots">${[0, 1, 2, 3].map(i => `<i class="${i <= r.k ? 'on' : ''}"></i>`).join('')}</span>`;
      h1.after(d);
    } catch (e) {}
  });
  try { const st = document.createElement('style'); st.textContent = `.v95-rel{margin:6px 0 10px;font-size:13px;color:var(--hs-mut,#9aa)}.v95-rel b{color:inherit}.v95-dots i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-left:3px;background:#5554}.v95-dots i.on{background:#e8a33d}.v95-rel.r3 .v95-dots i.on{background:#3fb37f}`; document.head.appendChild(st); } catch (e) {}
})();
