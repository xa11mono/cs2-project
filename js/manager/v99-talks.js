/* v99 — разговоры с игроками (режим менеджера).

   Игроки своей команды сами пишут менеджеру — о болезни, семье, визе, травме, усталости, предложении другого клуба,
   конфликте с партнёром, стриминге, тоске по дому, учёбе, игровом времени. Разговор — не одна кнопка: на реплику
   игрока менеджер выбирает ответ, игрок отвечает по характеру (V31: амбиции, профессионализм, лояльность,
   стрессоустойчивость, коммуникация) и доверию к менеджеру, разговор может пойти дальше.

   Последствия настоящие:
     • пропуск матчей: игрок уходит из основы на N игровых дней; место занимает запасной клуба (V98Squad.swap),
       а если скамейки нет — временная замена из свободных агентов (applyTemporaryStandIn); по возвращении всё
       возвращается назад; если замены нет — игрок играет, но с потерей формы;
     • мораль, уверенность, форма, усталость, сыгранность, деньги клуба;
     • доверие к менеджеру (0–100) — от него зависит, расскажет ли игрок о проблеме сам и как примет решение;
     • обещания (место в основе, не продавать, отдых) проверяются по времени; нарушенное обещание бьёт по доверию;
     • отложенные последствия: виза может не прийти, болезнь — затянуться, травма — обостриться.

   Разговор ждёт ответа 3 игровых дня. Новый разговор останавливает время и открывается в окне «Требует решения»
   (v96), его же можно вести в «Переписке» и в «Центре событий». Менеджер может и сам начать разговор на
   четыре темы. Состояние — seasonState.v99Talk. Публичное API — window.V99Talks. */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31;
  if (!H || !V || typeof seasonState === 'undefined') return;
  const esc = H.esc, DAY = 864e5;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const u01 = k => (h32(k) % 100000) / 100000;
  const pick = (k, a) => a[h32(k) % a.length];
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const team = () => H.teamBy(me());
  const fdate = ms => { try { return H.fdate(ms); } catch (e) { return new Date(ms).toLocaleDateString('ru-RU'); } };
  const dayNo = () => Math.floor(now() / DAY);
  const weekNo = () => Math.floor(now() / DAY / 7);
  const money = n => { try { return V.money(n); } catch (e) { return '$' + Math.round(n).toLocaleString('en-US'); } };
  const save = () => { try { W.saveSeasonState && W.saveSeasonState(); } catch (e) {} try { W.saveTeams && W.saveTeams(); } catch (e) {} };

  function S() {
    const s = seasonState.v99Talk = seasonState.v99Talk || {};
    s.trust = s.trust || {}; s.convs = s.convs || []; s.out = s.out || {}; s.promises = s.promises || [];
    s.follow = s.follow || []; s.seen = s.seen || {}; s.later = s.later || {}; s.cd = s.cd || {};
    s.seq = s.seq || 0; s.week = s.week == null ? -1 : s.week; s.day = s.day == null ? -1 : s.day;
    return s;
  }
  const starters = t => (t && t.players || []).filter(p => p && !/BENCH|RESERVE/.test(p.status || ''));
  const P = nick => { const t = team(); const p = t && (t.players || []).find(x => x && x.nick === nick); if (p) V.ensurePerson(p); return p || null; };
  const pers = p => (p && p.pers) || { amb: 10, prof: 10, loy: 10, lead: 10, press: 10, comm: 10 };

  /* ------------------------------------------------------------ доверие */
  function trustOf(nick) {
    const s = S(); if (s.trust[nick] == null) { const p = P(nick), pe = pers(p); s.trust[nick] = clamp(Math.round(48 + (pe.loy - 10) * 1.5 + (pe.prof - 10)), 25, 70); }
    return s.trust[nick];
  }
  function trust(nick, d) { const s = S(); s.trust[nick] = clamp(Math.round(trustOf(nick) + d), 0, 100); return s.trust[nick]; }
  const trustWord = v => v >= 75 ? 'полное' : v >= 58 ? 'высокое' : v >= 40 ? 'среднее' : v >= 22 ? 'низкое' : 'нет доверия';

  /* ------------------------------------------------------------ эффекты */
  const mor = (p, d) => { p.morale = clamp((+p.morale || 85) + d, 30, 100); };
  const conf = (p, d) => { p.conf = clamp((+p.conf || 60) + d, 5, 98); };
  const form = (p, d) => { p.form = clamp((+p.form || 100) + d, 75, 120); };
  const fat = (p, d) => { p.fatigue = clamp((+p.fatigue || 0) + d, 0, 100); };
  const chem = d => { const t = team(); if (t) t.v31chemBonus = clamp((t.v31chemBonus || 0) + d, -.06, .12); };
  function cost(n, label) { try { V.book(me(), -Math.abs(n), 'fac', label); } catch (e) {} }
  const canPay = n => { try { return (V.org(me()).budget || 0) >= n; } catch (e) { return true; } };
  function news(title, lead, imp) { try { W.V29News && W.V29News.add({ cat: 'player', icon: '🩺', imp: imp || 3, title, lead: lead || '', body: [], tags: [{ t: 'team', v: me() }] }); } catch (e) {} }

  /* ------------------------------------------------------------ отсутствие игрока */
  const isOut = nick => { const o = S().out[nick]; return !!(o && o.until > now()); };
  function out(p, days, reason, kind) {
    const t = team(); if (!t || !p) return '';
    const s = S(); if (s.out[p.nick]) { s.out[p.nick].until = Math.max(s.out[p.nick].until, now() + days * DAY); return `пропустит ещё ${days} дн.`; }
    const rec = { nick: p.nick, team: t.name, from: now(), until: now() + days * DAY, reason, kind: kind || 'other', mode: 'none', before: starters(t).map(x => x.nick) };
    // 1) запасной клуба
    let bench = []; try { bench = (W.V98Squad && W.V98Squad.bench()) || []; } catch (e) {}
    const sub = bench.filter(b => !isOut(b.nick)).sort((a, b) => (V.pow(b) || 0) - (V.pow(a) || 0))[0];
    if (sub && W.V98Squad) { const r = W.V98Squad.swap(p.nick, sub.nick); if (r && r.ok) { rec.mode = 'bench'; rec.sub = sub.nick; } }
    // 2) временная замена из свободных агентов
    if (rec.mode === 'none' && typeof W.applyTemporaryStandIn === 'function' && !t.tempStandIn) {
      const keep = +p.fatigue || 0; p.fatigue = 999;   // штатная замена выбирает самого уставшего — указываем на нужного
      let ok = false; try { ok = W.applyTemporaryStandIn(t, reason); } catch (e) {}
      const fix = q => { if (q && q.nick === p.nick) q.fatigue = keep; };
      p.fatigue = keep; if (t.tempStandIn) fix(t.tempStandIn.original); (transferState.freeAgents || []).forEach(fix);
      if (ok) { rec.mode = 'standin'; const si = (t.players || []).find(x => x && x.isStandIn); rec.sub = si ? si.nick : ''; }
    }
    // 3) замены нет — играет через силу
    if (rec.mode === 'none') { form(p, -10); fat(p, 12); }
    s.out[p.nick] = rec;
    try { V.careerLog(`${p.nick}: ${reason} — ${days} дн.${rec.sub ? `, замена ${rec.sub}` : ', замены нет'}`); } catch (e) {}
    if (days >= 3) news(`${t.name}: ${p.nick} пропустит ближайшие матчи`, `${reason[0].toUpperCase() + reason.slice(1)}. ${rec.sub ? `Место в составе займёт ${rec.sub}.` : 'Замены нет — игрок выйдет, но не в лучшей форме.'}`, days >= 7 ? 5 : 3);
    return rec.mode === 'none' ? `замены нет — ${p.nick} сыграет не в форме` : `${days} дн. без игры, замена — ${rec.sub || 'стенд-ин'}`;
  }
  function comeBack(rec) {
    const t = H.teamBy(rec.team); const s = S(); delete s.out[rec.nick];
    if (!t) return;
    try {
      if (rec.mode === 'bench' && W.V98Squad && rec.team === me()) {
        const inMain = starters(t).some(x => x.nick === rec.sub), onBench = (W.V98Squad.bench() || []).some(x => x.nick === rec.nick);
        if (inMain && onBench) W.V98Squad.swap(rec.sub, rec.nick);
      } else if (rec.mode === 'standin' && t.tempStandIn && t.tempStandIn.original && t.tempStandIn.original.nick === rec.nick) {
        W.restoreTemporaryStandIn(t);
      }
    } catch (e) { console.warn('[v99 talks] возвращение', e); }
    // v133: страховка возвращения. Когда отсутствия накладываются (один заболел — его заменил запасной, следом уехал
    // другой) или временную замену сняли раньше (конец турнира), игрок после возвращения оставался в запасе, а замена —
    // в основе (так tN1R навсегда потерял место в Spirit). Теперь: если вернувшийся не в пятёрке, а в ней тот, кто пришёл
    // за время отсутствия, — меняем их местами; временного игрока из свободных агентов отпускаем.
    try {
      if (rec.team === me() && W.V98Squad && !starters(t).some(x => x.nick === rec.nick) && (W.V98Squad.bench() || []).some(x => x.nick === rec.nick)) {
        const st = starters(t), was = rec.before || [];
        const cand = st.find(x => x.nick === rec.sub) || st.filter(x => !was.includes(x.nick) && !isOut(x.nick))[0];
        if (cand) { const r = W.V98Squad.swap(cand.nick, rec.nick); if (r && r.ok && cand.isStandIn && W.V98Squad.release) { try { W.V98Squad.release(cand.nick); } catch (e) {} } }
      }
    } catch (e) { console.warn('[v133 talks] страховка возвращения', e); }
    const p = (t.players || []).find(x => x && x.nick === rec.nick);
    if (p && rec.team === me()) { post(rec.nick, 'p', pick(rec.nick + rec.until, ['Я вернулся и готов играть 💪', 'Снова в строю. Спасибо, что дали время.', 'Всё, я в порядке. Включаюсь в тренировки.']), true); }
  }

  /* ------------------------------------------------------------ обещания */
  const PROM_L = { starter: 'место в основе', nosell: 'не продавать', rest: 'отдых после турнира', raise: 'повышение зарплаты' };
  function promise(nick, kind, days, text) { S().promises.push({ nick, kind, team: me(), since: now(), due: now() + days * DAY, text: text || PROM_L[kind], st: 'open' }); return `обещание: ${text || PROM_L[kind]}`; }
  function checkPromises() {
    const s = S(), t = team();
    s.promises.forEach(pr => {
      if (pr.st !== 'open') return;
      const p = t && (t.players || []).concat(transferState.freeAgents || []).find(x => x && x.nick === pr.nick);
      const gone = !t || pr.team !== me() || !p;
      if (pr.kind === 'nosell') {
        const sold = gone || (p && p.v31listed && p.v31listed > pr.since) || (p && p.status === 'FREE AGENT');
        if (sold) return breakP(pr, 'обещал не продавать — и выставил на рынок');
        if (now() >= pr.due) return keepP(pr);
      } else if (pr.kind === 'starter') {
        if (gone) { pr.st = 'void'; return; }
        if (starters(t).some(x => x.nick === pr.nick)) return keepP(pr);
        if (now() >= pr.due) return breakP(pr, 'обещал место в основе — и не дал');
      } else if (pr.kind === 'rest') {
        if (gone) { pr.st = 'void'; return; }
        const plan = (V.org(me()) || {}).train;
        if (plan && plan.intensity === 'low' && now() > pr.since + DAY) return keepP(pr);
        if (now() >= pr.due) return breakP(pr, 'обещал разгрузить — нагрузка осталась прежней');
      } else if (pr.kind === 'raise') {
        if (gone) { pr.st = 'void'; return; }
        if (now() >= pr.due) { if (p.salary && pr.base && p.salary >= pr.base * 1.1) return keepP(pr); return breakP(pr, 'обещал повысить зарплату — не повысил'); }
        if (p.salary && pr.base && p.salary >= pr.base * 1.1) return keepP(pr);
      }
    });
    if (s.promises.length > 60) s.promises = s.promises.filter(x => x.st === 'open').concat(s.promises.filter(x => x.st !== 'open').slice(-30));
  }
  function keepP(pr) { pr.st = 'kept'; pr.at = now(); trust(pr.nick, +8); const p = P(pr.nick); if (p) mor(p, 4); post(pr.nick, 'p', pick(pr.nick + pr.kind, ['Ты сдержал слово. Это ценно.', 'Спасибо — я помню, что ты обещал. И ты сделал.', 'Слово держишь. Уважаю.']), true); }
  function breakP(pr, why) { pr.st = 'broken'; pr.at = now(); trust(pr.nick, -18); const p = P(pr.nick); if (p) { mor(p, -8); if (p.pers) p.pers.loy = clamp(p.pers.loy - 2, 1, 20); } post(pr.nick, 'p', pick(pr.nick + pr.kind + 'b', ['Ты обещал. Я тебе поверил — зря, видимо.', 'Мы же договаривались… Неприятно.', 'Больше не буду принимать обещания всерьёз.']), true); try { V.careerLog(`Нарушено обещание ${pr.nick}: ${why}`); } catch (e) {} }

  /* ------------------------------------------------------------ сценарии
     node: { say(c) -> реплика игрока, opts: [{ l, d, me(c) -> реплика менеджера, ok(c) -> bool, run(c) -> { reply, next, res } }] }
     c = { p, t, d (данные разговора), pe (характер), tr (доверие), conv } */
  const ill = (c, days, why) => out(c.p, days, why || 'болезнь', 'ill');
  const SC = {};

  SC.ill = {
    tag: 'Здоровье', title: c => `${c.p.nick} заболел`,
    weight: (p, t) => isOut(p.nick) ? 0 : 1.1,
    init: (p, k) => ({ sev: u01(k + 's') < .3 ? 2 : 1, what: pick(k, ['температура 38,5, всё ломит', 'отравился, всю ночь плохо', 'простыл — горло и температура', 'сильная мигрень и слабость']) }),
    timeout: c => ({ res: ill(c, c.d.sev === 2 ? 6 : 4, 'болезнь'), trust: -4, text: 'Не дождавшись ответа, игрок остался дома.' }),
    nodes: {
      start: { say: c => pick(c.conv.id, [`Тренер, я заболел: ${c.d.what}. ${c.d.sev === 2 ? 'Кажется, это надолго.' : 'Думаю, пару дней.'}`, `Привет. Плохие новости — ${c.d.what}. Не знаю, смогу ли играть.`]),
        opts: [
          { l: 'Лечись, пропусти матчи', d: 'Восстановится полностью, замена — из запаса или стенд-ин', me: () => 'Здоровье важнее. Лечись спокойно, мы справимся.',
            run: c => { trust(c.p.nick, 6); mor(c.p, 3); return { reply: 'Спасибо. Постараюсь вернуться быстрее.', res: ill(c, c.d.sev === 2 ? 6 : 4) }; } },
          { l: 'Пришлём врача клуба ($15 000)', d: 'Вернётся вдвое быстрее', ok: () => canPay(15000), me: () => 'Сейчас пришлю нашего врача. Делай всё, что он скажет.',
            run: c => { cost(15000, `Врач: ${c.p.nick}`); trust(c.p.nick, 8); mor(c.p, 4); return { reply: 'Ого, спасибо! Так точно быстрее.', res: ill(c, c.d.sev === 2 ? 3 : 2) }; } },
          { l: 'Сможешь сыграть? Матчи важные', d: 'Ответ зависит от характера и доверия', me: () => 'Понимаю, что тяжело. Но матчи важные — сможешь выйти?', run: c => ({ next: 'push' }) }
        ] },
      push: { say: c => (c.pe.prof >= 12 || c.pe.press >= 13) && c.tr >= 35 ? 'Если очень нужно — выйду. Но буду не в лучшей форме.' : 'Честно — я еле стою на ногах. Боюсь подвести команду.',
        opts: [
          { l: 'Выходи, потом отдохнёшь', d: 'Форма −8, усталость +15, может стать хуже', me: () => 'Спасибо. Сыграешь — и сразу отдыхать.',
            run: c => { form(c.p, -8); fat(c.p, 15); trust(c.p.nick, c.pe.prof >= 12 ? 0 : -6);
              if (u01(c.conv.id + 'worse') < (c.d.sev === 2 ? .55 : .25)) follow(c.p.nick, 'illWorse', 2, {});
              return { reply: c.pe.prof >= 12 ? 'Хорошо. Выложусь, сколько смогу.' : 'Ладно… попробую.', res: 'играет больным: форма −8' }; } },
          { l: 'Ладно, лечись', d: 'Пропустит матчи', me: () => 'Хорошо, не рискуем. Лечись.', run: c => { trust(c.p.nick, 3); return { reply: 'Спасибо, что понял.', res: ill(c, c.d.sev === 2 ? 6 : 4) }; } },
          { l: 'Настаиваю: ты нужен команде', d: 'Доверие −12, мораль −8', me: () => 'Мне нужен результат. Ты играешь.',
            run: c => { trust(c.p.nick, -12); mor(c.p, -8); form(c.p, -10); fat(c.p, 18); follow(c.p.nick, 'illWorse', 2, {}); return { reply: 'Понял. Выйду.', res: 'играет через силу, мораль −8' }; } }
        ] }
    }
  };
  SC.illWorse = { tag: 'Здоровье', follow: true, title: c => `${c.p.nick}: стало хуже`, weight: () => 0,
    nodes: { start: { say: () => 'Стало хуже — врач говорит, нужна неделя постельного режима.', opts: [
      { l: 'Конечно, восстанавливайся', me: () => 'Без вариантов — лечись.', run: c => ({ reply: 'Прости, что так вышло.', res: ill(c, 7, 'осложнение после болезни') }) }] } } };

  SC.family = {
    tag: 'Личное', title: c => c.d.good ? `${c.p.nick}: в семье пополнение` : `${c.p.nick}: семейные обстоятельства`,
    weight: (p, t) => isOut(p.nick) ? 0 : ((+p.age || 22) >= 22 ? .7 : .35),
    init: (p, k) => ({ good: (+p.age || 22) >= 24 && u01(k + 'g') < .45, what: pick(k + 'w', ['заболела мама', 'отец попал в больницу', 'бабушка в тяжёлом состоянии', 'дома серьёзные проблемы']) }),
    timeout: c => ({ res: out(c.p, 4, 'уехал по семейным обстоятельствам', 'family'), trust: -10, text: 'Не получив ответа, игрок уехал домой сам.' }),
    nodes: {
      start: { say: c => c.d.good ? 'Тренер! У меня родился сын 🙏 Можно слетать домой на несколько дней?' : `Мне нужно домой: ${c.d.what}. Я не могу сейчас думать об игре.`,
        opts: [
          { l: 'Конечно, лети', d: 'Пропустит ~4 дня, доверие сильно растёт', me: c => c.d.good ? 'Поздравляю! Лети к семье, это важнее всего.' : 'Лети, семья важнее. Держись.',
            run: c => { trust(c.p.nick, 12); mor(c.p, c.d.good ? 10 : 4); return { reply: c.d.good ? 'Спасибо огромное! Вернусь заряженным!' : 'Спасибо. Я этого не забуду.', res: out(c.p, c.d.good ? 4 : 5, c.d.good ? 'рождение ребёнка' : 'семейные обстоятельства', 'family') }; } },
          { l: 'Оплатим перелёт семье сюда ($8 000)', d: 'Без пропуска, мораль растёт', ok: () => canPay(8000), me: () => 'Давай привезём твоих сюда за счёт клуба — будешь рядом и не пропустишь матчи.',
            run: c => { cost(8000, `Перелёт семьи ${c.p.nick}`); const good = c.d.good || c.pe.loy >= 11; trust(c.p.nick, good ? 8 : 2); mor(c.p, good ? 6 : 0); if (!good) form(c.p, -4);
              return { reply: good ? 'Это отличный вариант, спасибо!' : 'Спасибо… но мне правда нужно быть там. Ладно, попробуем так.', res: good ? 'семья рядом, матчи без пропусков' : 'остался, но мысли дома: форма −4' }; } },
          { l: 'После турнира', d: 'Доверие −8, форма −5', me: () => 'Понимаю. Но сейчас турнир — давай после него.',
            run: c => { trust(c.p.nick, -8); mor(c.p, -6); form(c.p, -5); return { reply: c.pe.loy >= 13 ? 'Хорошо… Команда для меня тоже семья.' : 'Ясно. Буду играть, раз так.', res: 'остался: мораль −6, форма −5' }; } }
        ] }
    }
  };

  const VISA_RISK = /^(RU|UA|BY|KZ|UZ|KG|MN|CN|BR|AR|CL|UY|PE|CO|TR|IL|IN|ID|PH|VN|ZA|EG|RS|BA|MK|AL|XK)$/i;
  const natOf = p => String(p.nationality || p.country || p.flag || '').slice(0, 2).toUpperCase();
  SC.visa = {
    tag: 'Документы', title: c => `${c.p.nick}: проблема с визой`,
    weight: (p, t) => isOut(p.nick) || !VISA_RISK.test(natOf(p)) ? 0 : .7,
    init: () => ({}),
    timeout: c => { follow(c.p.nick, 'visaResult', 5, { ok: u01(c.conv.id + 'v') < .5 }); return { res: 'заявление подано обычным порядком', trust: -3 }; },
    nodes: {
      start: { say: () => 'В посольстве завернули мои документы на визу для следующего турнира — не хватает справки. Подавать заново долго.',
        opts: [
          { l: 'Ускоренное оформление ($9 000)', d: '90% — виза будет вовремя', ok: () => canPay(9000), me: () => 'Подключим визовое агентство, оплатим срочное оформление.',
            run: c => { cost(9000, `Срочная виза ${c.p.nick}`); trust(c.p.nick, 5); follow(c.p.nick, 'visaResult', 4, { ok: u01(c.conv.id + 'v') < .9 }); return { reply: 'Отлично, отправляю всё агентству.', res: 'срочное оформление' }; } },
          { l: 'Подать заново обычным порядком', d: '55% — успеет', me: () => 'Собери справку и подавай заново, клуб даст письмо.',
            run: c => { follow(c.p.nick, 'visaResult', 6, { ok: u01(c.conv.id + 'v') < .55 }); return { reply: 'Хорошо, завтра же подам.', res: 'обычная подача' }; } },
          { l: 'Сразу готовим замену', d: 'Игрок пропустит ~10 дней, без риска', me: () => 'Не будем рисковать: на этот турнир возьмём замену, а визу оформишь спокойно.',
            run: c => { trust(c.p.nick, -2); mor(c.p, -3); return { reply: 'Обидно, но понимаю.', res: out(c.p, 10, 'нет визы на турнир', 'visa') }; } }
        ] }
    }
  };
  SC.visaResult = { tag: 'Документы', follow: true, title: c => c.d.ok ? `${c.p.nick}: виза получена` : `${c.p.nick}: в визе отказали`, weight: () => 0,
    nodes: { start: { say: c => c.d.ok ? 'Виза пришла! Еду на турнир 🎉' : 'Отказ… Визу не дали, на турнир я не попадаю.', opts: [
      { l: c => c.d.ok ? 'Отлично!' : 'Ничего, найдём замену', me: c => c.d.ok ? 'Супер, готовимся.' : 'Не переживай, это не твоя вина.', run: c => c.d.ok ? (mor(c.p, 3), { reply: '💪', res: 'виза получена' }) : { reply: 'Спасибо за поддержку.', res: out(c.p, 10, 'отказ в визе', 'visa') } }] } } };

  SC.injury = {
    tag: 'Здоровье', title: c => `${c.p.nick}: ${c.d.part}`,
    weight: (p, t) => isOut(p.nick) ? 0 : .45 + ((+p.fatigue || 0) > 60 ? .5 : 0),
    init: (p, k) => ({ part: pick(k, ['болит запястье', 'защемило спину', 'боль в плече', 'тянет кисть']) }),
    timeout: c => { form(c.p, -4); if (u01(c.conv.id + 'x') < .4) follow(c.p.nick, 'injuryWorse', 5, {}); return { res: 'играет с болью', trust: -6 }; },
    nodes: {
      start: { say: c => `После тренировок ${c.d.part}. Терплю, но в клатчах рука уже не та.`,
        opts: [
          { l: 'Физиотерапия, неделя отдыха', d: 'Пропуск ~7 дней, проблема уйдёт', me: () => 'Не терпи. Неделя физиотерапии — и вернёшься здоровым.',
            run: c => { trust(c.p.nick, 6); fat(c.p, -25); return { reply: 'Да, так правильнее.', res: out(c.p, 7, 'травма: ' + c.d.part, 'injury') }; } },
          { l: 'Обезболивающие и играть', d: 'Форма −4, 35% — обострение', me: () => 'Попей обезболивающее, доиграем турнир — потом лечиться.',
            run: c => { form(c.p, -4); trust(c.p.nick, -4); if (u01(c.conv.id + 'x') < .35) follow(c.p.nick, 'injuryWorse', 6, {}); return { reply: c.pe.press >= 12 ? 'Окей, выдержу.' : 'Ладно… надеюсь, не станет хуже.', res: 'играет с болью' }; } },
          { l: 'Снизим нагрузку на тренировках', d: 'Усталость −20, обещание разгрузить', me: () => 'Убираем у тебя лишние часы практики, будешь играть только официальные матчи.',
            run: c => { fat(c.p, -20); trust(c.p.nick, 3); return { reply: 'Спасибо, это поможет.', res: promise(c.p.nick, 'rest', 10, 'разгрузить на тренировках') }; } }
        ] }
    }
  };
  SC.injuryWorse = { tag: 'Здоровье', follow: true, title: c => `${c.p.nick}: травма обострилась`, weight: () => 0,
    nodes: { start: { say: () => 'Всё, рука не слушается. Врач запретил играть минимум две недели.', opts: [
      { l: 'Лечись', me: () => 'Восстанавливайся, без спешки.', run: c => ({ reply: 'Надо было сразу лечиться…', res: out(c.p, 14, 'обострение травмы', 'injury') }) }] } } };

  SC.rest = {
    tag: 'Нагрузка', title: c => `${c.p.nick} просит отдыха`,
    weight: (p, t) => isOut(p.nick) || (+p.fatigue || 0) < 55 ? 0 : 1.2,
    timeout: c => ({ res: 'просьба осталась без ответа', trust: -6 }),
    nodes: {
      start: { say: c => `Я выжат. Усталость ${Math.round(+c.p.fatigue || 0)}, плохо сплю. Можно пару выходных?`,
        opts: [
          { l: 'Два выходных', d: 'Усталость −30, пропуск 2 дня', me: () => 'Бери два дня. Никаких демок и FPL.',
            run: c => { fat(c.p, -30); mor(c.p, 5); trust(c.p.nick, 6); return { reply: 'Спасибо! Вернусь свежим.', res: out(c.p, 2, 'выходные', 'rest') }; } },
          { l: 'Отдохнёшь после турнира', d: 'Обещание: лёгкая неделя в течение 14 дней', me: () => 'Дотерпи до конца турнира — потом устроим лёгкую неделю.',
            run: c => { trust(c.p.nick, 1); return { reply: 'Ловлю на слове.', res: promise(c.p.nick, 'rest', 14) }; } },
          { l: 'Сейчас не время', d: 'Мораль −6, доверие −6', me: () => 'Сейчас не время отдыхать. Соберись.',
            run: c => { mor(c.p, -6); trust(c.p.nick, -6); return { reply: c.pe.prof >= 13 ? 'Понял. Буду работать.' : 'Ну да, конечно…', res: 'отказано: мораль −6' }; } }
        ] }
    }
  };

  SC.offer = {
    tag: 'Карьера', title: c => `${c.p.nick}: интерес от ${c.d.club}`,
    weight: (p, t) => { const pe = pers(p), r = rank(t.name); return pe.amb >= 12 && (V.pow(p) || 0) >= 82 ? (r > 6 ? .9 : .4) : 0; },
    init: (p, k) => { const t = team(), r = rank(t.name); const better = H.ranked().filter(x => !x.isAcademy && x.name !== t.name).slice(0, Math.max(3, r - 2)); const cl = better[h32(k) % Math.max(1, better.length)]; return { club: cl ? cl.name : 'топ-клуба' }; },
    timeout: c => { mor(c.p, -4); return { res: 'вопрос завис', trust: -5 }; },
    nodes: {
      start: { say: c => `Мой агент говорит, что мной интересуется ${c.d.club}. Хотел, чтобы ты узнал от меня, а не из слухов.`,
        opts: [
          { l: 'Ты ключевой. Не продадим', d: 'Обещание: не продавать 60 дней', me: () => 'Ты — основа команды. Мы тебя не продаём.',
            run: c => { trust(c.p.nick, 6); mor(c.p, c.pe.amb >= 15 && rank(me()) > 8 ? -2 : 5); return { reply: c.pe.loy >= 11 ? 'Это то, что я хотел услышать.' : 'Хорошо. Но я хочу видеть, что клуб растёт.', res: promise(c.p.nick, 'nosell', 60) }; } },
          { l: 'Обсудим повышение зарплаты', d: '+15% к зарплате, лояльность растёт', ok: c => canPay(Math.round((+c.p.salary || 100000) * .15)), me: () => 'Давай я покажу, что ценю тебя: повышаем зарплату.',
            run: c => { const base = +c.p.salary || 100000; c.p.salary = Math.round(base * 1.15 / 1000) * 1000; cost(Math.round(base * .15 / 2), `Повышение зарплаты ${c.p.nick}`); mor(c.p, 7); trust(c.p.nick, 5); if (c.p.pers) c.p.pers.loy = clamp(c.p.pers.loy + 2, 1, 20);
              return { reply: 'Спасибо, это серьёзный шаг. Я остаюсь.', res: `зарплата ${money(c.p.salary)}` }; } },
          { l: 'Если хочешь — отпустим', d: 'Игрок выставлен на рынок', me: () => 'Не держу. Если хочешь перейти — мы выставим тебя на трансфер.',
            run: c => { c.p.v31listed = now(); mor(c.p, c.pe.amb >= 14 ? 6 : -4); trust(c.p.nick, c.pe.amb >= 14 ? 4 : -6);
              return { reply: c.pe.amb >= 14 ? 'Честно. Спасибо, что не держишь.' : 'Вот как… Я думал, ты будешь бороться за меня.', res: 'выставлен на трансфер' }; } },
          { l: 'Сосредоточься на игре', d: 'Без решения', me: () => 'Сейчас главное — игра. Остальное потом.',
            run: c => { mor(c.p, c.pe.amb >= 14 ? -5 : -1); return { reply: 'Ладно.', res: 'без решения' }; } }
        ] }
    }
  };

  SC.clash = {
    tag: 'Команда', title: c => `${c.p.nick} жалуется на ${c.d.mate}`,
    weight: (p, t) => { const m = mateFor(p, t); return m && pers(p).comm <= 11 ? .7 : 0; },
    init: p => ({ mate: (mateFor(p, team()) || {}).nick || '' }),
    timeout: c => { chem(-.02); return { res: 'конфликт тлеет: сыгранность −2%', trust: -4 }; },
    nodes: {
      start: { say: c => `С ${c.d.mate} не получается — в войсе он перебивает и срывается на всех. Это уже мешает в раундах.`,
        opts: [
          { l: 'Поговорю с ним', d: 'Отдельный разговор с партнёром', me: c => `Понял. Поговорю с ${c.d.mate} лично.`,
            run: c => { trust(c.p.nick, 4); const mp = P(c.d.mate); if (mp) startConv(mp, 'clashMate', { mate: c.p.nick }, true); return { reply: 'Спасибо, что не отмахнулся.', res: `разговор с ${c.d.mate}` }; } },
          { l: 'Общая встреча с психологом ($20 000)', d: 'Коммуникация обоих +2, сыгранность +2%', ok: () => canPay(20000), me: () => 'Соберёмся втроём со спортивным психологом и разберём.',
            run: c => { cost(20000, 'Встреча с психологом'); [c.p, P(c.d.mate)].forEach(x => { if (x && x.pers) x.pers.comm = clamp(x.pers.comm + 2, 1, 20); }); chem(.02); trust(c.p.nick, 5); return { reply: 'Хорошая идея.', res: 'коммуникация улучшилась' }; } },
          { l: 'Разбирайтесь сами', d: 'Сыгранность −3%', me: () => 'Вы взрослые люди — договоритесь.',
            run: c => { chem(-.03); trust(c.p.nick, -5); mor(c.p, -3); return { reply: 'Ясно.', res: 'сыгранность −3%' }; } }
        ] }
    }
  };
  SC.clashMate = { tag: 'Команда', follow: true, title: c => `Разговор с ${c.p.nick}`, weight: () => 0, opener: c => `${c.p.nick}, есть разговор. ${c.d.mate} жалуется на атмосферу в войсе.`,
    nodes: { start: { say: c => c.pe.comm >= 11 || c.pe.prof >= 13 ? 'Да, бывает, завожусь. Я поработаю над этим.' : `${c.d.mate} сам не слушает колл! Почему виноват я?`,
      opts: [
        { l: 'Спокойно объяснить', d: 'Профессионал согласится, эмоциональный — частично', me: () => 'Никто не виноват один. Но в войсе нужен порядок — это просьба всей команды.',
          run: c => { const ok = c.pe.prof >= 10 || c.tr >= 50; if (ok && c.p.pers) c.p.pers.comm = clamp(c.p.pers.comm + 2, 1, 20); chem(ok ? .02 : 0); trust(c.p.nick, ok ? 3 : -2); return { reply: ok ? 'Хорошо, понял. Буду держать себя в руках.' : 'Посмотрим…', res: ok ? 'коммуникация +2' : 'без изменений' }; } },
        { l: 'Жёстко: ещё раз — штраф', d: 'Дисциплина, но мораль −6', me: () => 'Ещё один срыв в войсе — штраф.',
          run: c => { if (c.p.pers) c.p.pers.comm = clamp(c.p.pers.comm + 1, 1, 20); mor(c.p, -6); trust(c.p.nick, -6); return { reply: 'Понял.', res: 'дисциплина, мораль −6' }; } }
      ] } } };

  SC.stream = {
    tag: 'Медиа', title: c => `${c.p.nick}: стрим-контракт`,
    weight: (p, t) => (V.pow(p) || 0) >= 80 && (+p.age || 22) <= 30 ? .5 : 0,
    timeout: c => ({ res: 'без ответа — стримит как раньше', trust: -2 }),
    nodes: {
      start: { say: () => 'Мне предложили контракт со стриминговой платформой — стримы по вечерам, хорошие деньги. Ты не против?',
        opts: [
          { l: 'Разрешить', d: 'Мораль +6, усталость +10, репутация клуба +2', me: () => 'Стримь, но тренировки — в приоритете.',
            run: c => { mor(c.p, 6); fat(c.p, 10); trust(c.p.nick, 4); try { const o = V.org(me()); o.rep = clamp((o.rep || 50) + 2, 0, 100); } catch (e) {} return { reply: 'Спасибо! Тренировки не пострадают.', res: 'стримит: репутация +2' }; } },
          { l: 'Только в межсезонье', d: 'Компромисс', me: () => 'Давай в межсезонье. Сейчас — турниры.', run: c => { mor(c.p, c.pe.amb >= 14 ? -2 : 1); return { reply: 'Ладно, справедливо.', res: 'договорились о межсезонье' }; } },
          { l: 'Запретить', d: 'Мораль −5', me: () => 'Нет. Сейчас никаких отвлечений.', run: c => { mor(c.p, -5); trust(c.p.nick, -3); return { reply: 'Жаль. Ну ладно.', res: 'отказ: мораль −5' }; } }
        ] }
    }
  };

  SC.homesick = {
    tag: 'Личное', title: c => `${c.p.nick} скучает по дому`,
    weight: (p, t) => { if (isOut(p.nick)) return 0; const n = natOf(p); const same = starters(t).filter(x => natOf(x) === n).length; return n && same <= 1 ? .8 : 0; },
    timeout: c => { mor(c.p, -4); return { res: 'игрок замкнулся', trust: -3 }; },
    nodes: {
      start: { say: () => 'Если честно, тяжело. Я тут один, по-английски весь день, семья далеко. Иногда не хочется даже на тренировку.',
        opts: [
          { l: 'Оплатим визит семьи ($10 000)', d: 'Мораль +8, доверие +6', ok: () => canPay(10000), me: () => 'Давай привезём к тебе семью на пару недель, клуб оплатит.',
            run: c => { cost(10000, `Визит семьи ${c.p.nick}`); mor(c.p, 8); trust(c.p.nick, 6); return { reply: 'Серьёзно? Спасибо огромное!', res: 'семья приедет' }; } },
          { l: 'Съезди домой на неделю', d: 'Усталость −25, пропуск ~6 дней', me: () => 'Съезди домой, перезагрузись.', run: c => { fat(c.p, -25); mor(c.p, 6); trust(c.p.nick, 5); return { reply: 'Спасибо, мне это нужно.', res: out(c.p, 6, 'отпуск дома', 'rest') }; } },
          { l: 'Поговорим чаще, держись', d: 'Помогает надёжным, но не всем', me: () => 'Ты не один. Пиши мне в любое время — будем на связи.',
            run: c => { const ok = c.tr >= 50 || c.pe.press >= 12; mor(c.p, ok ? 4 : -2); trust(c.p.nick, ok ? 4 : 0); return { reply: ok ? 'Спасибо. Уже легче.' : 'Ок…', res: ok ? 'мораль +4' : 'не помогло' }; } }
        ] }
    }
  };

  SC.exams = {
    tag: 'Личное', title: c => `${c.p.nick}: экзамены`,
    weight: (p, t) => (+p.age || 22) <= 20 && !isOut(p.nick) ? .6 : 0,
    timeout: c => ({ res: 'уехал сдавать сам', trust: -3, after: c2 => out(c2.p, 2, 'экзамены', 'other') }),
    nodes: {
      start: { say: () => 'У меня сессия в университете. Два экзамена на следующей неделе — родители очень просят сдать.',
        opts: [
          { l: 'Отпустить на два дня', d: 'Пропуск 2 дня, мораль +5', me: () => 'Учёба важна. Езжай, сдавай.', run: c => { mor(c.p, 5); trust(c.p.nick, 6); return { reply: 'Спасибо! Родители будут рады.', res: out(c.p, 2, 'экзамены', 'other') }; } },
          { l: 'Готовься онлайн по вечерам', d: 'Без пропуска, усталость +12', me: () => 'Давай совмещать: по вечерам готовься, экзамены сдашь онлайн.', run: c => { fat(c.p, 12); return { reply: 'Тяжело будет, но попробую.', res: 'усталость +12' }; } },
          { l: 'Сначала карьера', d: 'Мораль −6, доверие −5', me: () => 'Ты профессиональный игрок. Сейчас — турниры.', run: c => { mor(c.p, -6); trust(c.p.nick, -5); return { reply: 'Понятно…', res: 'мораль −6' }; } }
        ] }
    }
  };

  SC.minutes = {
    tag: 'Карьера', title: c => `${c.p.nick} хочет играть`,
    bench: true, weight: () => 1,
    timeout: c => { mor(c.p, -5); return { res: 'вопрос проигнорирован', trust: -6 }; },
    nodes: {
      start: { say: () => 'Я давно сижу на скамейке. Хочу понимать, есть ли у меня шанс в основе — или мне искать клуб.',
        opts: [
          { l: 'Обещаю место в основе в течение месяца', d: 'Обещание — проверится через 30 дней', me: () => 'Шанс будет. В течение месяца ты выйдешь в основе.', run: c => { mor(c.p, 8); trust(c.p.nick, 4); return { reply: 'Ловлю на слове!', res: promise(c.p.nick, 'starter', 30) }; } },
          { l: 'Работай — шанс придёт', d: 'Мораль −2', me: () => 'Покажи на тренировках — и шанс придёт.', run: c => { mor(c.p, c.pe.prof >= 12 ? 2 : -4); return { reply: c.pe.prof >= 12 ? 'Буду работать.' : 'Я уже работаю…', res: 'без обещаний' }; } },
          { l: 'Можешь искать клуб', d: 'Игрок отпущен в свободные агенты', me: () => 'Честно: в ближайшее время места нет. Можешь искать клуб — отпустим.',
            run: c => { trust(c.p.nick, 3); try { W.V98Squad && W.V98Squad.release(c.p.nick); } catch (e) {} return { reply: 'Спасибо за честность.', res: 'отпущен' }; } }
        ] }
    }
  };

  SC.birthday = {
    tag: 'Команда', title: c => `${c.p.nick}: ${c.d.what}`,
    weight: () => .25, init: (p, k) => ({ what: pick(k, ['день рождения', '100-я карта за клуб', 'годовщина в команде']) }),
    timeout: () => ({ res: 'никто не поздравил', trust: -2 }),
    nodes: {
      start: { say: c => c.d.what === 'день рождения' ? 'Кстати, у меня сегодня день рождения 🎂' : `Сегодня у меня ${c.d.what} 🙂`,
        opts: [
          { l: 'Поздравить', d: 'Мораль +3', me: () => 'Поздравляю! Отличный повод — так держать!', run: c => { mor(c.p, 3); trust(c.p.nick, 2); return { reply: 'Спасибо 🙌', res: 'мораль +3' }; } },
          { l: 'Торт и ужин для команды ($2 000)', d: 'Мораль всей команды +2, сыгранность +1%', ok: () => canPay(2000), me: () => 'Вечером ужин всей командой — за счёт клуба!',
            run: c => { cost(2000, 'Ужин команды'); starters(c.t).forEach(x => mor(x, 2)); chem(.01); trust(c.p.nick, 3); return { reply: 'Вот это да! Спасибо!', res: 'команда довольна' }; } }
        ] }
    }
  };

  /* ---------- разговоры, которые начинает менеджер */
  SC.mHonest = { tag: 'Разговор', manager: true, title: c => `Разговор с ${c.p.nick}`, opener: () => 'Как ты на самом деле? Без формальностей.', weight: () => 0,
    nodes: { start: { say: c => honestReply(c), opts: [
      { l: 'Спасибо за честность', me: () => 'Спасибо, что говоришь как есть. Я на твоей стороне.', run: c => { trust(c.p.nick, 3); mor(c.p, 2); const hid = hiddenIssue(c); if (hid) { startConv(c.p, hid, null, true); return { reply: 'Раз уж зашла речь — есть одна вещь…', res: 'игрок рассказал о проблеме' }; } return { reply: '👍', res: 'доверие +3' }; } },
      { l: 'Нужно больше от тебя', me: () => 'Понял. Но мне нужно больше от тебя на сервере.', run: c => { const ok = c.pe.prof >= 12; form(c.p, ok ? 2 : 0); mor(c.p, ok ? -1 : -5); trust(c.p.nick, ok ? 0 : -4); return { reply: ok ? 'Справедливо.' : 'Я только что сказал, как мне…', res: ok ? 'форма +2' : 'мораль −5' }; } }
    ] } } };
  SC.mFuture = { tag: 'Разговор', manager: true, title: c => `Будущее ${c.p.nick} в клубе`, opener: () => 'Хочу поговорить о твоём будущем в клубе.', weight: () => 0,
    nodes: { start: { say: c => { const r = rank(me()); return c.pe.amb >= 14 && r > 8 ? 'Скажу прямо: я хочу трофеев. Пока не вижу, как мы их выиграем.' : c.pe.loy >= 13 ? 'Я хочу остаться здесь надолго.' : 'Многое зависит от того, куда идёт команда.'; },
      opts: [
        { l: 'Строим команду вокруг тебя', d: 'Обещание: не продавать 90 дней', me: () => 'Мы строим команду вокруг тебя. Продавать не будем.', run: c => { trust(c.p.nick, 4); mor(c.p, 5); return { reply: 'Это мотивирует.', res: promise(c.p.nick, 'nosell', 90) }; } },
        { l: 'Обещаю повышение в межсезонье', d: 'Обещание: зарплата +10% за 120 дней', me: () => 'В межсезонье пересмотрим твой контракт в большую сторону.', run: c => { mor(c.p, 5); trust(c.p.nick, 2); S().promises.push({ nick: c.p.nick, kind: 'raise', team: me(), since: now(), due: now() + 120 * DAY, base: +c.p.salary || 0, text: PROM_L.raise, st: 'open' }); return { reply: 'Договорились.', res: 'обещание: повышение зарплаты' }; } },
        { l: 'Всё решат результаты', me: () => 'Честно — всё решат результаты, твои и команды.', run: c => { mor(c.p, c.pe.prof >= 12 ? 1 : -3); return { reply: 'Понятно.', res: 'без обещаний' }; } }
      ] } } };
  SC.mForm = { tag: 'Разговор', manager: true, title: c => `Форма ${c.p.nick}`, opener: () => 'Давай разберём твою игру в последних матчах.', weight: () => 0,
    nodes: { start: { say: c => formReason(c).text, opts: [
      { l: 'Что поможет?', me: () => 'Что тебе поможет вернуться на уровень?', run: c => ({ next: 'fix' }) },
      { l: 'Мне нужен результат', d: 'Давление: профессионалам помогает', me: () => 'Причины понимаю. Но мне нужен результат уже на следующем турнире.', run: c => { const ok = c.pe.prof >= 12 || c.pe.press >= 13; form(c.p, ok ? 4 : -2); mor(c.p, ok ? 0 : -5); conf(c.p, ok ? 2 : -4); return { reply: ok ? 'Будет результат.' : 'Давление мне не помогает…', res: ok ? 'форма +4' : 'уверенность −4' }; } }
    ] },
      fix: { say: c => formReason(c).ask, opts: [
        { l: c => formReason(c).fixL, d: c => formReason(c).fixD, me: () => 'Договорились, так и сделаем.', run: c => formReason(c).fix(c) },
        { l: 'Не сейчас', me: () => 'Сейчас не получится, но я тебя услышал.', run: c => { trust(c.p.nick, -3); return { reply: 'Ок.', res: 'без изменений' }; } }
      ] } } };
  SC.mTeam = { tag: 'Разговор', manager: true, title: c => `Атмосфера в команде — ${c.p.nick}`, opener: () => 'Как тебе атмосфера в команде? Что слышно?', weight: () => 0,
    nodes: { start: { say: c => { const m = mateFor(c.p, c.t); return m && c.tr >= 40 ? `Если честно — с ${m.nick} тяжело в войсе. Остальное нормально.` : (V.chemistry ? (V.chemistry(c.t) >= .6 ? 'Всё хорошо, понимаем друг друга с полуслова.' : 'Пока не сыграны — нужно больше времени вместе.') : 'Нормально.'); },
      opts: [
        { l: 'Буткемп-выходные для команды ($25 000)', d: 'Сыгранность +3%, мораль всех +3', ok: () => canPay(25000), me: () => 'Устроим командные выходные — без компьютеров.', run: c => { cost(25000, 'Командные выходные'); chem(.03); starters(c.t).forEach(x => mor(x, 3)); return { reply: 'Ребята будут рады!', res: 'сыгранность +3%' }; } },
        { l: 'Спасибо, учту', me: () => 'Спасибо, что рассказал.', run: c => { trust(c.p.nick, 2); return { reply: '👍', res: 'доверие +2' }; } }
      ] } } };

  const MANAGER_TOPICS = [['mHonest', 'Как ты на самом деле?'], ['mForm', 'Разбор формы'], ['mFuture', 'Будущее в клубе'], ['mTeam', 'Атмосфера в команде']];

  /* ---------- вспомогательные реплики */
  function rank(n) { try { return V.rankOf(n); } catch (e) { return 30; } }
  function mateFor(p, t) { return starters(t).filter(x => x !== p && x.nick !== p.nick).map(x => (V.ensurePerson(x), x)).filter(x => pers(x).comm <= 9 || (pers(x).amb >= 14 && pers(p).amb >= 14)).sort((a, b) => pers(a).comm - pers(b).comm)[0] || null; }
  function hiddenIssue(c) { if (c.tr < 45) return null; if ((+c.p.fatigue || 0) >= 55) return 'rest'; if (SC.homesick.weight(c.p, c.t) > 0 && (+c.p.morale || 85) < 75) return 'homesick'; if (mateFor(c.p, c.t) && pers(c.p).comm <= 11) return 'clash'; return null; }
  function honestReply(c) {
    const f = +c.p.fatigue || 0, m = +c.p.morale || 85;
    if (c.tr < 30) return 'Всё нормально. (По голосу — не нормально, но говорить он не хочет.)';
    if (f >= 60) return 'Если честно — очень устал. Сплю плохо, руки к вечеру ватные.';
    if (m < 60) return 'Тяжело. Не чувствую, что мне здесь доверяют.';
    if ((+c.p.conf || 60) < 40) return 'После последних матчей сомневаюсь в себе. В клатчах начинаю думать лишнее.';
    return m > 90 ? 'Отлично! Настрой боевой.' : 'В целом нормально. Работаем.';
  }
  function formReason(c) {
    const f = +c.p.fatigue || 0, cf = +c.p.conf || 60;
    if (f >= 50) return { text: 'Я просто выжат: календарь плотный, к концу дня реакция не та.', ask: 'Мне бы пару дней без нагрузки.', fixL: 'Неделя облегчённых тренировок', fixD: 'Обещание: лёгкая неделя, усталость −15', fix: c2 => { fat(c2.p, -15); trust(c2.p.nick, 3); return { reply: 'Спасибо, это то, что нужно.', res: promise(c2.p.nick, 'rest', 10) }; } };
    if (cf < 45) return { text: 'Потерял уверенность. Начинаю сомневаться в каждом пике.', ask: 'Может, поработать с психологом?', fixL: 'Психолог ($30 000)', fixD: 'Уверенность +12', fix: c2 => { if (!canPay(30000)) return { reply: 'Понимаю, денег нет…', res: 'не хватило бюджета' }; cost(30000, `Психолог: ${c2.p.nick}`); conf(c2.p, 12); trust(c2.p.nick, 4); return { reply: 'Да, думаю, поможет.', res: 'уверенность +12' }; } };
    if (c.p.role === 'IGL' || c.p.role === 'AWPer') return { text: 'Роль съедает меня: думаю за всех и не успеваю стрелять сам.', ask: 'Может, разделить ответственность в раундах?', fixL: 'Разгрузить в коллах', fixD: 'Огонь игрока +1, сыгранность −1%', fix: c2 => { c2.p.firepower = Math.min(99, (+c2.p.firepower || 70) + 1); chem(-.01); trust(c2.p.nick, 3); return { reply: 'Попробуем. Спасибо.', res: 'огонь +1' }; } };
    return { text: 'Не знаю… Вроде всё делаю, но не залетает.', ask: 'Хочу больше индивидуальной практики.', fixL: 'Индивидуальный план (аим-тренер)', fixD: 'Форма +4, усталость +6', fix: c2 => { form(c2.p, 4); fat(c2.p, 6); return { reply: 'Отлично, начну завтра.', res: 'форма +4' }; } };
  }

  /* ------------------------------------------------------------ движок разговора */
  function ctx(conv) {
    const t = H.teamBy(conv.team) || team(); const p = (t && (t.players || []).concat(transferState.freeAgents || []).find(x => x && x.nick === conv.nick)) || null;
    if (p) V.ensurePerson(p);
    return { conv, p, t, d: conv.data || {}, pe: pers(p), tr: trustOf(conv.nick) };
  }
  const val = (f, c) => typeof f === 'function' ? f(c) : f;
  function post(nick, from, text, sys) {
    try { W.CS2DM && W.CS2DM.post(nick, from, text, sys ? { sys: true } : null); } catch (e) {}
  }
  function startConv(p, key, data, immediate) {
    const sc = SC[key], t = team(); if (!sc || !p || !t) return null;
    const s = S(); const id = 'c' + (++s.seq).toString(36) + '-' + dayNo();
    const conv = { id, nick: p.nick, team: t.name, key, node: 'start', st: 'open', ts: now(), until: now() + 3 * DAY, data: data || (sc.init ? sc.init(p, id + p.nick) : {}), log: [] };
    s.convs.unshift(conv); if (s.convs.length > 80) s.convs.length = 80;
    const c = ctx(conv);
    if (sc.opener) { const o = val(sc.opener, c); conv.log.push({ f: 'me', x: o }); post(p.nick, 'me', o); }
    const say = val(sc.nodes.start.say, c); conv.log.push({ f: 'p', x: say }); post(p.nick, 'p', say);
    if (immediate || sc.manager) s.seen[id] = 1;
    try { V.careerLog(`Разговор: ${val(sc.title, c)}`); } catch (e) {}
    return conv;
  }
  const optsOf = (conv, c) => { const sc = SC[conv.key], nd = sc && sc.nodes[conv.node]; return nd ? nd.opts.filter(o => !o.ok || o.ok(c)) : []; };
  function answer(id, i) {
    const s = S(), conv = s.convs.find(x => x.id === id); if (!conv || conv.st !== 'open') return { ok: false };
    const c = ctx(conv); if (!c.p) { conv.st = 'void'; return { ok: false, why: 'игрока уже нет в клубе' }; }
    const o = optsOf(conv, c)[i]; if (!o) return { ok: false };
    const say = val(o.me, c); if (say) { conv.log.push({ f: 'me', x: say }); post(conv.nick, 'me', say); }
    let r = {}; try { r = o.run(c) || {}; } catch (e) { console.warn('[v99 talks]', e); }
    if (r.reply) { conv.log.push({ f: 'p', x: r.reply }); post(conv.nick, 'p', r.reply); }
    if (r.next) { conv.node = r.next; const c2 = ctx(conv); const nx = val(SC[conv.key].nodes[r.next].say, c2); conv.log.push({ f: 'p', x: nx }); post(conv.nick, 'p', nx); }
    else { conv.st = 'done'; conv.res = r.res || ''; conv.doneAt = now(); if (r.res) { conv.log.push({ f: 'sys', x: r.res }); post(conv.nick, 'p', '— ' + r.res, true); } try { V.careerLog(`${val(SC[conv.key].title, c)} → ${val(o.l, c)}${r.res ? ': ' + r.res : ''}`); } catch (e) {} }
    save();
    return { ok: true, done: conv.st === 'done', res: r.res };
  }
  function expire(conv) {
    const sc = SC[conv.key], c = ctx(conv); conv.st = 'expired'; conv.doneAt = now();
    if (!c.p || !sc) return;
    let r = {}; try { r = sc.timeout ? sc.timeout(c) || {} : {}; } catch (e) {}
    trust(conv.nick, r.trust == null ? -5 : r.trust); mor(c.p, -3);
    if (r.after) { try { r.res = r.after(c); } catch (e) {} }
    conv.res = (r.text ? r.text + ' ' : 'Без ответа. ') + (r.res || ''); conv.log.push({ f: 'sys', x: conv.res });
    post(conv.nick, 'p', pick(conv.id, ['Ты так и не ответил…', 'Ладно, понял — тебе не до меня.', 'Жаль, что не нашлось времени ответить.']));
  }
  function follow(nick, key, days, data) { S().follow.push({ nick, key, due: now() + days * DAY, data: data || {}, team: me() }); }

  /* ------------------------------------------------------------ ход времени */
  function daily() {
    const t = team(), s = S(); if (!t) return;
    const d = dayNo(); if (s.day === d) return; s.day = d;
    // возвращение игроков
    Object.values(s.out).forEach(rec => { if (rec.until <= now()) comeBack(rec); });
    // разговоры с истёкшим сроком
    s.convs.forEach(cv => { if (cv.st === 'open' && cv.team === me() && now() > cv.until) expire(cv); });
    // отложенные последствия
    const due = s.follow.filter(f => f.due <= now()); s.follow = s.follow.filter(f => f.due > now());
    due.forEach(f => { if (f.team !== me()) return; const p = P(f.nick); if (p) startConv(p, f.key, f.data); });
    checkPromises();
    weekly();
  }
  function weekly() {
    const t = team(), s = S(); if (!t) return;
    const w = weekNo(); if (s.week === w) return;
    if (s.week === -1) { s.week = w; return; }                    // первая неделя после взятия клуба — без обращений
    s.week = w;
    const open = s.convs.filter(c => c.st === 'open' && c.team === me()).length; if (open >= 2) return;
    const k = 'w' + w + t.name;
    if (u01(k) > .55) return;                                     // примерно каждую вторую неделю
    const cand = [];
    starters(t).forEach(p => { V.ensurePerson(p); Object.keys(SC).forEach(key => { const sc = SC[key]; if (sc.follow || sc.manager || sc.bench) return; if (s.cd[p.nick + key] && now() - s.cd[p.nick + key] < 75 * DAY) return; const wt = sc.weight(p, t) || 0; if (wt > 0) cand.push({ p, key, wt }); }); });
    let bench = []; try { bench = (W.V98Squad && W.V98Squad.bench()) || []; } catch (e) {}
    bench.forEach(p => { if (s.cd[p.nick + 'minutes'] && now() - s.cd[p.nick + 'minutes'] < 45 * DAY) return; cand.push({ p, key: 'minutes', wt: 1.2, bench: true }); });
    if (!cand.length) return;
    const sum = cand.reduce((a, x) => a + x.wt, 0); let r = u01(k + 'pick') * sum, ch = cand[0];
    for (const x of cand) { r -= x.wt; if (r <= 0) { ch = x; break; } }
    s.cd[ch.p.nick + ch.key] = now();
    if (ch.bench) { V.ensurePerson(ch.p); startBench(ch.p); } else startConv(ch.p, ch.key);
  }
  // запасной не в t.players — разговор ведётся по нику
  function startBench(p) {
    const t = team(), s = S(); const id = 'c' + (++s.seq).toString(36) + '-' + dayNo();
    const conv = { id, nick: p.nick, team: t.name, key: 'minutes', node: 'start', st: 'open', ts: now(), until: now() + 3 * DAY, data: {}, log: [] };
    s.convs.unshift(conv); const say = val(SC.minutes.nodes.start.say, ctx(conv)); conv.log.push({ f: 'p', x: say }); post(p.nick, 'p', say);
  }

  /* ------------------------------------------------------------ интерфейс */
  const openConvs = () => S().convs.filter(c => c.st === 'open' && c.team === me());
  const pending = () => openConvs().filter(c => !S().later[c.id] || c.until - now() <= 2 * DAY).map(c => c.id);
  const fresh = () => openConvs().filter(c => !S().seen[c.id]).map(c => c.id);
  function leftTxt(c) { const d = Math.max(0, Math.ceil((c.until - now()) / DAY)); return d <= 0 ? 'последний день' : d === 1 ? 'ответить за 1 день' : `ответить за ${d} дн.`; }
  function trustMeter(nick) { const v = trustOf(nick); return `<span class="v99-trust" title="Доверие к менеджеру: ${v} из 100"><small>доверие</small><span class="v99-tbar"><i style="width:${v}%"></i></span><b>${esc(trustWord(v))}</b></span>`; }
  function card(id, o) {
    o = o || {};
    const conv = S().convs.find(x => x.id === id); if (!conv) return '';
    const c = ctx(conv), sc = SC[conv.key] || {}, p = c.p || { nick: conv.nick };
    const outRec = S().out[conv.nick];
    const log = conv.log.map(m => m.f === 'sys' ? `<p class="v99-sys">${esc(m.x)}</p>` : `<div class="v99-msg ${m.f === 'me' ? 'me' : 'p'}"><p>${esc(m.x)}</p></div>`).join('');
    const opts = conv.st === 'open' ? optsOf(conv, c).map((x, i) => `<button type="button" class="v96-opt v99-opt" data-v99opt="${esc(conv.id)}|${i}"><i>${i + 1}</i><span><b>${esc(val(x.l, c))}</b>${x.d ? `<small>${esc(val(x.d, c))}</small>` : ''}</span></button>`).join('') : '';
    const doneFoot = conv.st !== 'open' ? `<div class="v99-done"><span>${conv.st === 'expired' ? 'Срок ответа истёк' : 'Разговор завершён'}${conv.res ? ' · ' + esc(conv.res) : ''}</span>${o.gate ? '<button type="button" class="v96-go" data-v96next>Дальше</button>' : ''}</div>` : '';
    return `<article class="v96-ev v99-talk${o.inline ? ' inline' : ''}" data-v99conv="${esc(conv.id)}">
      <header class="v96-ev-h"><span class="v96-kind">${esc(sc.tag || 'Разговор')}</span>${conv.st === 'open' ? `<span class="v96-due${conv.until - now() <= 2 * DAY ? ' hot' : ''}">${esc(leftTxt(conv))}</span>` : ''}</header>
      <div class="v99-who"><span class="v99-ph ph">${H.photoHtml ? H.photoHtml(p, true) : ''}</span><span class="v99-wt"><b data-player="${esc(conv.nick)}">${esc(conv.nick)}</b><small>${esc(p.role || '')}${outRec ? ` · вне игры до ${esc(fdate(outRec.until))}` : ''}</small></span>${trustMeter(conv.nick)}</div>
      <h3>${esc(val(sc.title, c) || '')}</h3>
      <div class="v99-log">${log}</div>
      ${opts ? `<div class="v96-opts">${opts}</div>` : ''}${doneFoot}</article>`;
  }
  // окно «Требует решения» (v96)
  if (W.V96Windows && W.V96Windows.addProvider) W.V96Windows.addProvider({
    key: 'talk', items: pending, fresh,
    card: (id, o) => card(id, o),
    seen: id => { S().seen[id] = 1; },
    later: id => { S().later[id] = 1; save(); },
    click: t => { const el = t.closest && t.closest('[data-v99opt]'); if (!el) return false; const [id, i] = el.dataset.v99opt.split('|'); answer(id, +i); return true; }
  });
  // клики на страницах портала
  H.CLICKS.push(['[data-v99opt]', el => { const [id, i] = el.dataset.v99opt.split('|'); answer(id, +i); H.render(); scrollLog(); }]);
  H.CLICKS.push(['[data-v99start]', el => { const [nick, key] = el.dataset.v99start.split('|'); const p = P(nick); if (!p) return; if (S().cd['m' + nick + key] && now() - S().cd['m' + nick + key] < 7 * DAY) return; S().cd['m' + nick + key] = now(); startConv(p, key, null, true); save(); H.render(); scrollLog(); }]);
  function scrollLog() { setTimeout(() => { const l = document.querySelector('#hs-page .v84-dm-log'); if (l) l.scrollTop = l.scrollHeight; }, 0); }

  // «Переписка»: варианты ответа активного разговора и темы для разговора
  (H.AFTER || []).push(pg => { setTimeout(() => { W.__v111InboxOpen = pg === 'inbox'; }, 0); });   // v111: повторная отрисовка «Центра» ≠ открытие
  (H.AFTER || []).push((pg, arg, root) => {
    if (pg === 'dm') {
      const nick = H.S.dm && H.S.dm.nick, box = root.querySelector('.v84-dm-acts'); if (!nick || !box || !me()) return;
      const t = team(), mine = t && (starters(t).some(x => x.nick === nick) || ((W.V98Squad && W.V98Squad.bench()) || []).some(x => x.nick === nick));
      const conv = openConvs().find(c => c.nick === nick);
      if (conv) { const c = ctx(conv); box.insertAdjacentHTML('beforebegin', `<div class="v99-dmopts"><h4>${esc(val(SC[conv.key].title, c))} · ${esc(leftTxt(conv))}</h4><div class="v96-opts">${optsOf(conv, c).map((x, i) => `<button type="button" class="v96-opt v99-opt" data-v99opt="${esc(conv.id)}|${i}"><i>${i + 1}</i><span><b>${esc(val(x.l, c))}</b>${x.d ? `<small>${esc(val(x.d, c))}</small>` : ''}</span></button>`).join('')}</div></div>`); }
      if (mine && !conv) {
        const cd = k => S().cd['m' + nick + k] && now() - S().cd['m' + nick + k] < 7 * DAY;
        box.insertAdjacentHTML('afterbegin', `<span class="v99-topics"><small>Начать разговор:</small>${MANAGER_TOPICS.map(([k, l]) => `<button type="button" class="hs-btn ghost sm" data-v99start="${esc(nick)}|${k}"${cd(k) ? ' disabled title="Не чаще раза в неделю"' : ''}>${esc(l)}</button>`).join('')}</span>`);
      }
      const hdr = root.querySelector('.v84-dm-h small'); if (hdr && mine && !hdr.querySelector('.v99-trust')) hdr.insertAdjacentHTML('beforeend', ' · ' + trustMeter(nick));
    }
    if (pg === 'inbox' && me()) {
      const col = root.querySelector('.v96-panel'); if (!col) return;
      const list = openConvs(); const train = W.V96Windows && W.V96Windows.needTraining && W.V96Windows.needTraining();
      const h = col.querySelector('.v96-ph b'); if (h) h.textContent = String((+h.textContent || 0) + list.length + (train ? 1 : 0));
      let html = list.map(c => card(c.id, { inline: true })).join('');
      if (train) html += `<article class="v96-ev inline"><header class="v96-ev-h"><span class="v96-kind">Тренировка</span></header><h3>План тренировок на неделю не утверждён</h3><p class="v96-ev-t">Без утверждённого плана «Продолжить» откроет окно с выбором.</p><div class="v96-opts"><button type="button" class="v96-opt" data-nav="training"><i>→</i><span><b>Открыть тренировки</b></span></button></div></article>`;
      if (html) { const empty = col.querySelector('.v96-empty'); if (empty && (list.length || train)) empty.remove(); col.querySelector('.v96-ph').insertAdjacentHTML('afterend', html); }
      // история разговоров
      const done = S().convs.filter(c => c.team === me() && c.st !== 'open').slice(0, 12);
      const hist = root.querySelectorAll('.v96-panel')[1];
      // v101: открытый «Центр событий» = всё просмотрено (счётчик в меню и колокольчике сбрасывается)
      // v111: только при открытии страницы — разговор, пришедший пока «Центр» открыт, всё равно поднимает окно решения
      if (!W.__v111InboxOpen) try { list.forEach(c => { S().seen[c.id] = 1; }); const V9 = W.V96Windows; if (V9) { const st = V9.state(); V9.events().forEach(e => { st.seen[e.id] = 1; }); } setTimeout(() => { try { if (W.V99Mail) W.V99Mail.unread().forEach(m => { m.read = true; }); } catch (e) {} }, 0); } catch (e) {}   // письма — после отрисовки, чтобы новые были видны выделенными
      if (hist && done.length) hist.insertAdjacentHTML('beforeend', `<h3 class="v96-ph sub">Разговоры с игроками</h3><ul class="v96-hist">${done.map(c => `<li><time>${esc(fdate(c.doneAt || c.ts))}</time><b>${esc(c.nick)} · ${esc(val(SC[c.key].title, ctx(c)) || '')}</b><span>${esc(c.res || '')}</span></li>`).join('')}</ul>`);
    }
    if (pg === 'squad' && me()) {
      const s = S();
      root.querySelectorAll('.v98-row .v98-who[data-player]').forEach(b => { const rec = s.out[b.dataset.player] || Object.values(s.out).find(r => r.sub === b.dataset.player); if (!rec || b.querySelector('.v99-out')) return;
        const self = rec.nick === b.dataset.player; b.querySelector('small') && b.querySelector('small').insertAdjacentHTML('beforeend', self ? ` · <span class="v99-out">вне игры до ${esc(fdate(rec.until))}: ${esc(rec.reason)}</span>` : ` · <span class="v99-out sub">заменяет ${esc(rec.nick)}</span>`); });
      const open = s.promises.filter(x => x.st === 'open' && x.team === me());
      const host = root.querySelector('.v98-note') || root.querySelector('#hs-page > div') || root;
      if (open.length && !root.querySelector('.v99-prom')) {
        const html = `<section class="hs-box v99-prom"><header class="hs-box-h"><h3>Обещания игрокам</h3></header><div class="hs-box-b"><ul class="v99-plist">${open.map(x => `<li><b>${esc(x.nick)}</b><span>${esc(x.text)}</span><small>до ${esc(fdate(x.due))}</small></li>`).join('')}</ul></div></section>`;
        (root.querySelector('.hs-box:last-of-type') || host).insertAdjacentHTML('afterend', html);
      }
    }
  });

  // ход времени: раз в игровой день (дёшево — проверка номера дня)
  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => { try { if (me()) daily(); } catch (e) { console.warn('[v99 talks]', e); } }, 700, 'v99-talks');
  // и сразу после «Продолжить» по дням
  ['skipGameCalendarDay'].forEach(n => { const f = W[n]; if (typeof f !== 'function' || f.__v99t) return; const w = function () { const r = f.apply(this, arguments); try { if (me()) daily(); } catch (e) {} return r; }; Object.keys(f).forEach(k => { try { w[k] = f[k]; } catch (e) {} }); w.__v99t = true; W[n] = w; try { (0, eval)(`${n} = window.${n}`); } catch (e) {} });

  W.V99Talks = { S, SC, start: (nick, key, data, incoming) => { const p = P(nick); return p ? startConv(p, key, data, !incoming) : null; }, answer, card, open: openConvs, pending, trust: trustOf, isOut, out: (nick, days, reason) => out(P(nick), days, reason), daily, weekly, expire, MANAGER_TOPICS };
})();
