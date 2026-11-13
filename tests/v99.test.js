// v99 · производительность, разговоры с игроками, разведка с погрешностью, скримы, турниры клуба, разбор матча, эфир.
// Запуск: node tests/v99.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const html = require('./lib/project').pageSources();
  ['js/core/perf.js', 'js/career/talks.js', 'js/career/transfers.js', 'js/career/scouting.js', 'js/match/spectator-stats.js', 'css/career/manager.css'].forEach(f => assert(html.includes(f), 'подключён ' + f));
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v99-')), { viewport: { width: 1600, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { try { localStorage.setItem('cs2.ax.mode', 'manager'); } catch (e) {} });   // v100: без окна выбора режима
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3500);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(500); }
  await p.waitForFunction(() => window.V99Talks && window.V99Scout && window.V99Spec && window.HS, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);

  // 1. производительность: тренер «—» не переписывается; большие сохранения объединяются
  const perf = await p.evaluate(async () => {
    const out = {}; out.coach = window.v59EnsureUniqueCoaches().changed;
    const st0 = CS2Saves.stats().written; for (let i = 0; i < 20; i++) { saveTeams(); saveSeasonState(); await new Promise(r => setTimeout(r, 20)); }
    out.writes = CS2Saves.stats().written - st0; CS2Saves.flush();
    return out; });
  assert(perf.coach === 0, 'v59: клубы без тренера не «чинятся» на каждом сохранении: ' + perf.coach);
  assert(perf.writes <= 4, '20 сохранений за 0.4 с → не больше 4 записей: ' + perf.writes);
  pass(`производительность: тренеры не переписываются, 20 сохранений → ${perf.writes} записи`);

  // 2. разговоры
  const talk = await p.evaluate(async () => {
    const n = HS.ranked().filter(t => !t.isAcademy)[11].name; V31.setManaged(n); V31.S(); V31.setAuto('training', true); V31.org(n).budget = 5e6;
    const t = HS.teamBy(n), out = {};
    if (!V98Squad.bench().length) { const f = transferState.freeAgents.find(x => !x.reservedFor && !x.benchFrom); f.status = 'BENCH'; f.benchFrom = t.name; f.reservedFor = t.name; }
    const pl = t.players[1], sub = V98Squad.bench()[0].nick;
    const c = V99Talks.start(pl.nick, 'ill', { sev: 1, what: 'температура' });
    out.opts = (V99Talks.card(c.id).match(/data-v99opt/g) || []).length;
    out.r = V99Talks.answer(c.id, 0);
    out.swapped = !t.players.some(x => x.nick === pl.nick) && t.players.some(x => x.nick === sub);
    seasonState.calendar.currentMs += 6 * 864e5; V99Talks.daily();
    out.back = t.players.some(x => x.nick === pl.nick) && !V99Talks.S().out[pl.nick];
    // ветка «сможешь сыграть?» → второй узел
    const c2 = V99Talks.start(t.players[2].nick, 'ill', { sev: 1, what: 'x' }); V99Talks.answer(c2.id, 2);
    out.node = V99Talks.S().convs.find(x => x.id === c2.id).node; V99Talks.answer(c2.id, 1);
    // все сценарии открываются и отвечаются
    out.bad = Object.keys(V99Talks.SC).filter(k => { try { const cv = V99Talks.start(t.players[3].nick, k, k === 'clashMate' ? { mate: t.players[0].nick } : k === 'visaResult' ? { ok: true } : null); return !V99Talks.answer(cv.id, 0).ok; } catch (e) { return true; } });
    // обещание: не продавать → нарушено, если выставить на рынок
    const c3 = V99Talks.start(t.players[4].nick, 'offer', { club: 'NAVI' }); V99Talks.answer(c3.id, 0); const tr0 = V99Talks.trust(t.players[4].nick);
    t.players[4].v31listed = seasonState.calendar.currentMs + 1; seasonState.calendar.currentMs += 864e5; V99Talks.daily();
    out.broken = V99Talks.S().promises.some(x => x.nick === t.players[4].nick && x.st === 'broken') && V99Talks.trust(t.players[4].nick) < tr0;
    // без ответа 3 дня — разговор истекает
    const c4 = V99Talks.start(t.players[0].nick, 'rest'); seasonState.calendar.currentMs += 4 * 864e5; V99Talks.daily();
    out.expired = V99Talks.S().convs.find(x => x.id === c4.id).st === 'expired';
    return out; });
  assert(talk.opts === 3 && talk.r.ok && talk.r.done, 'разговор: 3 ответа, ответ закрывает разговор ' + JSON.stringify(talk.r));
  assert(talk.swapped && talk.back, 'болезнь: игрок уходит, запасной в основе, через 6 дней возвращение');
  assert(talk.node === 'push', 'ветка «сможешь сыграть?» ведёт на второй узел');
  assert(!talk.bad.length, 'все сценарии открываются и отвечаются: ' + talk.bad.join(','));
  assert(talk.broken, 'нарушенное обещание «не продавать» снижает доверие');
  assert(talk.expired, 'разговор без ответа истекает через 3 дня');
  pass('разговоры: болезнь с заменой и возвращением, ветвление, все сценарии, обещания, истечение срока');

  // окно «Требует решения»: новый разговор открывается сам
  await p.evaluate(() => { const t = HS.teamBy(V31.managed()); V99Talks.start(t.players[1].nick, 'family', { good: true }, true); });
  // в окне может стоять несколько дел (талант академии, события клуба) — откладываем их до разговора;
  // стартовое окно «с нуля / с историей» под нагрузкой появляется позже и блокирует окна решений — закрываем его
  for (let i = 0; i < 40; i++) {
    const st = await p.evaluate(() => {
      const lg = document.querySelector('#v84-legacy-modal [data-lg="history"]'); if (lg && getComputedStyle(document.getElementById('v84-legacy-modal')).display !== 'none') { lg.click(); return 'legacy'; }
      const g = document.getElementById('v96-gate'); if (!g || g.hidden) return 'closed';
      if (g.querySelector('.v99-opt')) return 'talk';
      const l = g.querySelector('[data-v96later]'); if (l) { l.click(); return 'skip'; } return 'other'; });
    if (st === 'talk' || st === 'other') break; await p.waitForTimeout(300);
  }
  const gate = await p.evaluate(() => { const g = document.getElementById('v96-gate'); return g && !g.hidden ? g.querySelectorAll('.v99-opt').length : -1; });
  const gdiag = gate === 3 ? '' : await p.evaluate(() => JSON.stringify({ blockers: V96Windows.blockers().length, open: V96Windows.isOpen(), modals: [...document.querySelectorAll('.modal-backdrop,#v84-legacy-modal,#dice-modal')].filter(m => { const c = getComputedStyle(m); return c.display !== 'none' && c.visibility !== 'hidden'; }).map(m => m.id || m.className), vis: document.visibilityState, convs: (V99Talks.state ? 1 : 0) }));
  assert(gate === 3, 'разговор в окне «Требует решения»: ' + gate + ' ' + gdiag);
  await p.click('#v96-gate .v99-opt'); await p.waitForTimeout(300);
  assert(await p.evaluate(() => !!document.querySelector('#v96-gate .v99-done')), 'после ответа — итог разговора в окне');
  await p.evaluate(() => { const x = document.querySelector('#v96-gate [data-v96next]') || document.querySelector('#v96-gate [data-v96close]'); x && x.click(); });
  pass('окно «Требует решения»: разговор, ответ клавишами/кнопкой, итог');

  // 3. разведка, скримы, турниры, разбор
  const mg = await p.evaluate(async () => {
    const n = V31.managed(), out = {};
    const other = HS.ranked().filter(t => !t.isAcademy && t.name !== n)[3].players[0];
    out.fog = !!V99Scout.fog(other) && /–/.test(V99Scout.fog(other).pot);
    out.send = V99Scout.send(other.nick).ok;
    seasonState.calendar.currentMs += 13 * 864e5;
    for (let i = 0; i < 40 && V99Scout.fog(other) !== null; i++) await new Promise(r => setTimeout(r, 250));   // отчёт приходит на тике игрового цикла
    out.clear = V99Scout.fog(other) === null;
    out.own = V99Scout.fog(HS.teamBy(n).players[0]) === null;
    const pt = V99Scrims.partners()[0].name; const r = V99Scrims.play(pt, 'show'); out.scrim = r.ok || !!r.refused;
    if (r.ok) { const a = calcMapWinProbability(n, pt, 'Mirage'); const L = V99Scout.state().leak[pt]; delete V99Scout.state().leak[pt]; const b = calcMapWinProbability(n, pt, 'Mirage'); V99Scout.state().leak[pt] = L; out.leak = a < b; } else out.leak = true;
    out.twice = !V99Scrims.play(pt, 'hide').ok;
    const up = V99Events.upcoming(), mine = up.find(e => (e.participants || []).includes(n));
    if (mine) { const sz = mine.participants.length; out.decl = V99Events.decline(mine.id).ok && !mine.participants.includes(n) && mine.participants.length === sz; } else out.decl = true;
    return out; });
  assert(mg.fog && mg.send && mg.clear && mg.own, 'разведка: диапазон без отчёта, отчёт скаута снимает погрешность, свои — точно ' + JSON.stringify(mg));
  assert(mg.scrim && mg.leak && mg.twice, 'скримы: раз в неделю, утечка схем снижает шанс против партнёра ' + JSON.stringify(mg));
  assert(mg.decl, 'турниры клуба: отказ освобождает место, поле не уменьшается');
  pass('менеджер: разведка с погрешностью, скримы, отказ от турнира');

  for (const pg of ['desk', 'clubev', 'debrief', 'training', 'scout', 'inbox', 'dm', 'squad']) {
    await p.evaluate(x => { location.hash = '#/' + x; }, pg); await p.waitForTimeout(700);
    const g = await p.$('#v96-gate:not([hidden]) .v96-x'); if (g) { await g.click(); await p.waitForTimeout(200); }
    const bad = await p.evaluate(() => /Не удалось показать страницу/.test(document.getElementById('hs-page').innerHTML) || document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    assert(!bad, 'страница рисуется без ошибок и не шире окна: ' + pg);
  }
  assert(await p.evaluate(() => { location.hash = '#/desk'; return true; }) && (await p.waitForTimeout(700), await p.evaluate(() => !!document.querySelector('.v99-nextbox'))), 'рабочее место: блок «Следующий матч»');
  pass('страницы менеджера v99 рисуются, рабочее место показывает следующий матч');

  // 3б. v99.2: шесть фокусов тренировки; трансфер с правилами при старте, письмами и паузой не ломает «Продолжить»
  const tr = await p.evaluate(async () => {
    const out = { keys: Object.keys(V31.TRAIN), alias: V31.trainKey('eventprep') === 'mental' && V31.trainKey('tside') === 'entry' };
    const n = V31.managed(); V31.org(n).budget = 9e6;
    const star = HS.ranked().filter(t => !t.isAcademy)[0].players.slice().sort((a, b) => V31.pow(b) - V31.pow(a))[0];
    const blocked = V99Transfers.start(star.nick); out.blocked = blocked && blocked.st === 'failed' && blocked.log.length > 1;
    // игрок середины рейтинга, который может общаться с командой (v135: языковое правило блокирует переговоры)
    const me = HS.teamBy(n), fit = x => { try { return typeof teamIdentityFit === 'function' ? teamIdentityFit(me, x) : 1; } catch (e) { return 1; } };
    const sellers = HS.ranked().filter(x => !x.isAcademy && x.name !== n).slice(20, 60);
    const pick = sellers.map(sl => [sl, sl.players.find(x => x.role !== 'AWPer' && x.role !== 'IGL' && fit(x) >= 0.75)]).find(([, x]) => x) || [sellers[5], sellers[5].players[1]];
    const seller = pick[0], pl = pick[1];
    const ng = V99Transfers.start(pl.nick); out.started = ng && ng.st === 'offer';
    const m0 = V99Mail.list().length; V98Squad.queue(ng.id, 'offer', [ng.ask]);
    for (let i = 0; i < 8 && ng.wait; i++) { skipGameCalendarDay(); await new Promise(r => setTimeout(r, 0)); V98Squad.settle(); }
    out.mail = V99Mail.list().length > m0;
    out.pausedByMail = v15IsCalendarPaused();                                  // ответ клуба ставит время на паузу
    if (!v15IsCalendarPaused()) toggleGameCalendarPause();
    const d0 = seasonState.calendar.currentMs;
    for (let i = 0; i < 4 && seasonState.calendar.currentMs === d0; i++) { await new Promise(r => setTimeout(r, 150)); skipGameCalendarDay(); }
    out.skipPaused = seasonState.calendar.currentMs > d0 && v15IsCalendarPaused();
    toggleGameCalendarPause();
    return out; });
  assert(tr.keys.length === 6 && tr.alias, 'тренировки: 6 фокусов, старые ключи сводятся к новым ' + JSON.stringify(tr.keys));
  assert(tr.blocked && tr.started && tr.mail, 'трансфер: запрет с причиной при старте, переговоры, письмо об ответе клуба ' + JSON.stringify(tr));
  assert(tr.pausedByMail && tr.skipPaused, '«Продолжить» сдвигает день и при паузе (ответ клуба ставит паузу) ' + JSON.stringify(tr));
  pass('v99.2: 6 фокусов тренировки, правила трансфера при старте, почта клуба, «Продолжить» на паузе');

  // 4. зритель: прогноз, расчёт очков, таблица игроков
  const sp = await p.evaluate(async () => {
    V31.setManaged(''); const out = {};
    let g = 0; while (!(currentTournament && !currentTournament.completed) && g++ < 60) { skipGameCalendarDay(); await new Promise(r => setTimeout(r, 0)); }
    const up = V99Spec.upcoming(); out.up = up.length;
    if (up[0]) out.pred = V99Spec.predictPair(up[0].a, up[0].b, up[0].a, up[0].ev);
    simulateWholeTournament(); for (let k = 0; k < 300 && !currentTournament.completed; k++) await new Promise(r => setTimeout(r, 30));
    V99Spec.settle(); out.n = V99Spec.S().n;
    return out; });
  assert(sp.up > 0 && sp.pred && sp.n >= 1, 'прогнозы: ставка на ближайший матч и расчёт после матча ' + JSON.stringify(sp));
  pass('зритель: прогноз на матч и расчёт очков аналитика');

  assert(!errs.length, 'ошибки страницы: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
  console.log('v99: все проверки пройдены');
})().catch(e => { console.error(e); process.exit(1); });
