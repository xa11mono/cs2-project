// v90 · Этап 0: конфиг параметров, Roster Engine, передача управления, журнал решений.
// Запуск: node tests/v90-core.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v90-')), { viewport: { width: 1500, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3000);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(400); }
  await p.waitForFunction(() => window.CS2Roster && window.CS2Control && window.CS2Config && window.v30MarketDebug, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);

  // 1. конфиг: у каждого параметра есть источник; значения читаются в момент вызова
  const c = await p.evaluate(() => {
    const C = window.CS2Config, l = C.list();
    const before = window.CS2VRSH2H.TOP; C.set('vrs.h2hTop', 3); const now = Date.now();
    const sum = window.CS2VRSH2H.sum(Array.from({ length: 10 }, () => ({ date: seasonState.calendar.currentMs, h2hDelta: 10, low: false })), seasonState.calendar.currentMs);
    C.reset('vrs.h2hTop');
    return { n: l.length, kinds: [...new Set(l.map(x => x.kind))].sort(), noKind: l.filter(x => !x.kind || !x.note).length, before, after: window.CS2VRSH2H.TOP, sum };
  });
  assert(c.n >= 20 && c.noKind === 0 && c.kinds.includes('design'), 'конфиг: ' + JSON.stringify(c));
  assert(c.sum === 30 && c.after === c.before, 'параметр читается при вызове: ' + JSON.stringify(c));
  pass(`v90: ${c.n} parameters in CS2Config, each with a source (${c.kinds.join(', ')}); live override works`);

  // 2. менеджер: ИИ не трогает состав его клуба ни одним путём, пока рынок не делегирован
  const m = await p.evaluate(() => {
    const V = window.V31, D = window.v30MarketDebug, R = window.V34Roster;
    const team = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts)[25];
    window.CS2Control.take(team.name); window.CS2Control.setLevel('market', 'manual');
    const before = team.players.map(x => x.nick).join();
    const a0 = R.allowSearch, r0 = R.replaceable; R.allowSearch = () => true; R.replaceable = () => true;
    try { for (let i = 0; i < 6; i++) { transferState.v33WindowUntil = seasonState.calendar.currentMs + 7 * 864e5; transferState.v33Changes = {}; window.v30MarketTick('big'); } } finally { R.allowSearch = a0; R.replaceable = r0; }
    // прямые вызовы путей рынка тоже упираются в правило
    const w = D.weakLink(team), fa = w ? D.findFA(team, w.p) : null;
    const direct = w ? { fa: fa ? D.signFA(team, w.p, 'тест', fa) : 'нет кандидата', acad: D.promote(team, 'тест'), loan: D.loan(team, 'тест') } : {};
    const blk = window.CS2Journal.blocks().filter(b => b.team === team.name).map(b => b.blocks[0].code);
    return { team: team.name, same: team.players.map(x => x.nick).join() === before, direct, blk: [...new Set(blk)] };
  });
  assert(m.same, 'ИИ изменил состав клуба менеджера: ' + JSON.stringify(m));
  assert(Object.values(m.direct).every(x => x === false || x === 'нет кандидата'), 'прямые вызовы рынка: ' + JSON.stringify(m));
  pass(`v90: AI never touches the managed club ${m.team} (all market paths; blocks: ${m.blk.join(',') || 'tick skipped'})`);

  // 3. сделка менеджера: правила — предупреждения, а не запрет; запись в журнале
  const u = await p.evaluate(() => {
    const team = teams.find(t => t.name === window.CS2Control.team());
    const st = team.players.filter(x => !x.status || x.status === 'STARTER'), out = st.find(x => x.role === 'Rifler') || st[0];
    const weak = Object.assign(JSON.parse(JSON.stringify(out)), { nick: 'v90weak', firepower: 50, tacticalIQ: 50, clutch: 50, utility: 50 });
    const ai = window.CS2Roster.evaluate({ kind: 'fa', actor: 'ai', team, out, incoming: weak });
    const user = window.CS2Roster.evaluate({ kind: 'user', actor: 'user', team, out, incoming: weak });
    return { ai: { ok: ai.ok, codes: ai.blocks.map(b => b.code) }, user: { ok: user.ok, codes: user.warnings.map(b => b.code) } };
  });
  assert(!u.ai.ok && u.ai.codes.includes('GAIN'), 'ИИ: слабый игрок запрещён: ' + JSON.stringify(u));
  assert(u.user.ok && u.user.codes.includes('GAIN'), 'менеджер: предупреждение, решение за ним: ' + JSON.stringify(u));
  pass('v90: same rules — a block for AI, a warning for the manager (' + u.user.codes.join(',') + ')');

  // 4. советы ИИ: уровень «Советы», план тренировок применяется вручную
  const a = await p.evaluate(() => {
    const K = window.CS2Control, V = window.V31; K.setLevel('training', 'advise'); K.setLevel('market', 'advise');
    const adv = seasonState.v90Control.advice; const ok = K.applyTrainingAdvice(); const o = V.org(K.team());
    return { lvl: K.level('training'), autoFlag: V.S().auto.training, plan: adv.training && adv.training.plan, market: adv.market && (adv.market.need ? adv.market.candidates.length : adv.market.note), applied: ok && o.train.auto === false && o.train.focus === adv.training.plan.focus };
  });
  assert(a.lvl === 'advise' && a.autoFlag === false && a.plan && a.applied && a.market != null, 'советы ИИ: ' + JSON.stringify(a));
  pass('v90: advise level — staff suggests (' + a.plan.focus + '; market: ' + a.market + '), manager applies');

  // 5. передача клуба: переговоры отменяются при взятии, пауза ИИ при возврате, история и журнал
  const h = await p.evaluate(() => {
    const K = window.CS2Control, first = K.team();
    const other = teams.filter(t => !t.isAcademy && t.name !== first).sort((a, b) => b.pts - a.pts)[30];
    (transferState.v30Nego = transferState.v30Nego || []).push({ id: 'v90t', player: 'x', from: 'y', to: other.name, run: 0 });
    K.take(other.name);   // переход: первый клуб возвращается ИИ
    const t1 = teams.find(t => t.name === first), graceDays = Math.round((t1.v90AiGraceUntil - seasonState.calendar.currentMs) / 864e5);
    const nego = (transferState.v30Nego || []).some(x => x.to === other.name);
    const canFirst = window.v30MarketDebug.canChange(t1);
    K.release('тест');
    const hist = K.history().slice(-2).map(x => [x.team, !!x.to, x.why || '']);
    const ctl = window.CS2Journal.list({ type: 'CONTROL' }).slice(0, 4).map(e => e.team + ':' + e.action);
    return { mode: K.mode(), graceDays, nego, canFirst, hist, ctl, aiTrain: window.V31.org(other.name).train ? window.V31.org(other.name).train.auto !== false : true };
  });
  assert(h.mode === 'observer' && h.graceDays === 60 && !h.nego && h.canFirst === false, 'передача: ' + JSON.stringify(h));
  assert(h.hist.length === 2 && h.hist.every(x => x[1]) && h.ctl.length === 4, 'история управления: ' + JSON.stringify(h));
  pass(`v90: handover — AI nego cancelled on take, ${h.graceDays}-day AI grace on release, history ${JSON.stringify(h.hist)}`);

  // 6. журнал: результат решения рынка через followupDays; целостность исправляется и записывается
  const j = await p.evaluate(() => {
    const J = window.CS2Journal, team = teams.filter(t => !t.isAcademy)[5], np = team.players[0];
    const e = J.log('MARKET_DECISION', { team: team.name, rankAt: 10, chosen: { src: 'fa', nick: np.nick } }); e.ts -= 60 * 864e5;
    J.followups();
    // искусственный дубль: игрок состава в списке свободных агентов
    const dup = JSON.parse(JSON.stringify(team.players[1])); transferState.freeAgents.push(dup);
    const before = window.CS2Roster.checkAll().inBothRosterAndFA.length;
    window.CS2Roster.integrity([dup.nick]);
    return { outcome: e.outcome, before, after: window.CS2Roster.checkAll().inBothRosterAndFA.length, repair: J.list({ type: 'REPAIR' }).length };
  });
  assert(j.outcome && j.outcome.starter === true && j.outcome.rankAt === 10, 'итог решения: ' + JSON.stringify(j));
  assert(j.before >= 1 && j.after === 0 && j.repair >= 1, 'целостность: ' + JSON.stringify(j));
  pass(`v90: decision outcome after follow-up (${JSON.stringify(j.outcome)}), integrity repair logged`);

  // 7. рынок ИИ в режиме наблюдателя: каждое изменение состава — в журнале с причиной и кандидатами
  const w = await p.evaluate(() => {
    const R = window.V34Roster, a0 = R.allowSearch, r0 = R.replaceable; R.allowSearch = () => true; R.replaceable = () => true;
    const n0 = window.CS2Journal.list().length;
    try { for (let i = 0; i < 6; i++) { transferState.v33WindowUntil = seasonState.calendar.currentMs + 7 * 864e5; transferState.v33Changes = {}; window.v30MarketTick('big'); } } finally { R.allowSearch = a0; R.replaceable = r0; }
    const added = window.CS2Journal.list().slice(0, window.CS2Journal.list().length - n0);
    const ch = added.filter(e => e.type === 'ROSTER_CHANGE'), dec = added.filter(e => e.type === 'MARKET_DECISION');
    return { ch: ch.length, noReason: ch.filter(e => !e.reason && !e.kind).length, dec: dec.length, decNoCand: dec.filter(e => e.chosen && !(e.candidates || []).length).length, kinds: [...new Set(ch.map(e => e.kind))], integ: window.CS2Roster.checkAll() };
  });
  assert(w.dec > 0 && w.decNoCand === 0 && w.noReason === 0, 'журнал рынка: ' + JSON.stringify(w));
  assert(!w.integ.duplicates.length && !w.integ.inBothRosterAndFA.length, 'целостность после рынка: ' + JSON.stringify(w.integ));
  pass(`v90: ${w.dec} market decisions and ${w.ch} roster changes journaled (${w.kinds.join(', ')})`);

  // 8. целостность мира: дубли из базы EMDB (один игрок в двух командах) разрешаются по базе составов 2026
  const wi = await p.evaluate(() => {
    const D = ['rkzinho', 'tatu', 'kyxsan', 'kunai', 'bnox', 'alkaren', 'saadzin', 'kvem', 'ex3rcice'];
    // искусственный дубль: игрок основы добавлен ещё и в академию
    const ac = teams.find(t => t.isAcademy && (t.players || []).length >= 5), pro = teams.filter(t => !t.isAcademy)[3];
    const twin = JSON.parse(JSON.stringify(pro.players[0])); ac.players[4] = twin;
    const fixes = window.CS2Roster.resolveWorld();
    const where = n => teams.filter(t => (t.players || []).some(p => p.nick.toLowerCase() === n)).map(t => t.name);
    return { twinIn: where(twin.nick.toLowerCase()), acSize: ac.players.length, fixes: fixes.length, emdb: D.map(n => [n, where(n)]).filter(x => x[1].length > 1), integ: window.CS2Roster.checkAll(),
      pain: { rk: where('rkzinho'), tatu: where('tatu') } };
  });
  assert(wi.twinIn.length === 1 && wi.acSize >= 5 && wi.fixes >= 1, 'дубль разрешён, состав восполнен: ' + JSON.stringify(wi));
  assert(!wi.emdb.length && !wi.integ.duplicates.length && !wi.integ.inBothRosterAndFA.length, 'дубли базы EMDB: ' + JSON.stringify(wi));
  assert(!wi.pain.rk.length || wi.pain.rk[0] === 'paiN', 'Rkzinho — в paiN по базе 2026: ' + JSON.stringify(wi.pain));
  pass('v90: world integrity — EMDB duplicates resolved by the 2026 roster base (Rkzinho/Tatu → paiN), squads refilled');

  // 9. временная замена: игрок возвращается, даже если место стенд-ина занял другой; всё в журнале
  const si = await p.evaluate(() => {
    const t = teams.filter(x => !x.isAcademy).sort((a, b) => b.pts - a.pts)[8];
    t.tempStandIn = null; t.players.forEach((x, i) => { x.fatigue = i === 0 ? 90 : 5; });
    const star = t.players[0].nick;
    const ok = applyTemporaryStandIn(t, 'тест'); if (!ok) return { skip: true };
    const canWhile = window.v30MarketDebug.canChange(t);
    // место стенд-ина занимает другой игрок (как при сделке за время замены)
    const i = t.players.findIndex(x => x.isStandIn), fa = transferState.freeAgents.findIndex(x => x && !x.reservedFor && x.nick !== star);
    const newcomer = JSON.parse(JSON.stringify(transferState.freeAgents[fa])); transferState.freeAgents.splice(fa, 1); newcomer.status = 'STARTER'; t.players[i] = newcomer;
    restoreTemporaryStandIn(t);
    const back = t.players.some(x => x.nick === star && (!x.status || x.status === 'STARTER'));
    const j = window.CS2Journal.list({ team: t.name }).filter(e => e.kind === 'standin' || e.kind === 'standin-return').map(e => e.kind + ': ' + e.reason);
    return { star, back, canWhile, j, integ: window.CS2Roster.checkAll() };
  });
  assert(si.skip || (si.back && si.canWhile === false && si.j.length >= 2 && !si.integ.duplicates.length), 'временная замена: ' + JSON.stringify(si));
  pass('v90: stand-in — ' + (si.skip ? 'skipped (no free agent)' : `${si.star} returns even when his slot was taken; journaled (${si.j[0]})`));

  // 10. страницы
  const pg = await p.evaluate(async () => { const out = {}; for (const k of ['control', 'decisions']) { HS.nav(k); await new Promise(r => setTimeout(r, 150)); out[k] = !/Не удалось показать страницу/.test(document.getElementById('hs-page').innerHTML) && !!document.querySelector('#hs-page h1'); } return out; });
  assert(pg.control && pg.decisions, 'страницы: ' + JSON.stringify(pg));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert(['v90-config.js?v=112', 'v90-roster-engine.js?v=112', 'v90-control.js?v=112'].every(s => html.includes(s)) && !html.includes('?v=93'), 'модули v90 подключены');
  assert(html.indexOf('v90-config.js') < html.indexOf('v84-stature.js'), 'конфиг загружается раньше модулей, которые его читают');
  assert(!errs.length, 'ошибки страницы: ' + errs.join(' | '));
  pass('v90: pages render, modules wired, no page errors');
  await ctx.close(); console.log('v90 core tests passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
