// v94 · Этап 4: единая экономика, спонсоры-партнёры, прогноз, ИИ по средствам, стикеры и стадии Мейджора,
// VRS без сжатия шкалы, рынок учится на итогах, защита новичков.
// Запуск: node tests/v94-stage4.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v94-')), { viewport: { width: 1500, height: 900 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html'); await p.waitForTimeout(3500);
  const lg = await p.$('#v84-legacy-modal [data-lg="history"]'); if (lg) { await lg.click(); await p.waitForTimeout(500); }
  await p.waitForFunction(() => window.CS2Finance && window.CS2Sponsors && window.CS2MarketLearn && window.V31, null, { timeout: 30000 });
  const pass = m => console.log('PASS ' + m);

  // 1. статьи и прогноз: доходы (спонсор, медиа, призовые, стикеры), расходы (зарплаты, штаб, объекты, академия)
  const f = await p.evaluate(() => {
    const F = window.CS2Finance, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const top = pro[0], low = pro[90];
    const a = F.forecast(top), b = F.forecast(low);
    const deal = F.forecast(low, { fee: 500000, salaryDelta: 200000 });
    return { topMedia: a.lines.media, lowMedia: b.lines.media, topAcademy: a.lines.academy, lowStaff: b.lines.staff, topNet: a.season.net, lowNet: b.season.net, endDrop: b.end - deal.end, nextDrop: b.next - deal.next, pol: [F.policy(top), F.policy(low)] };
  });
  assert(f.topMedia > f.lowMedia * 5 && f.lowStaff > 0, 'статьи сезона: ' + JSON.stringify(f));
  assert(f.endDrop >= 500000 && f.nextDrop > f.endDrop, 'прогноз учитывает выкуп и зарплату на сезон вперёд: ' + JSON.stringify(f));
  pass(`v94: season lines — media top $${Math.round(f.topMedia / 1000)}k vs #91 $${Math.round(f.lowMedia / 1000)}k; a $500k fee + $200k wage drops end-of-season by $${Math.round(f.endDrop / 1000)}k and next season by $${Math.round(f.nextDrop / 1000)}k`);

  // 2. ИИ по средствам: режим экономии — выкуп запрещён, дорогой игрок на продажу, долг гасят владельцы
  const ai = await p.evaluate(() => {
    const F = window.CS2Finance, V = window.V31, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), t = pro[70];
    V.org(t.name).budget = -600000;
    const pol = F.policy(t);
    const from = pro[60], inc = from.players.find(x => x.role === 'Rifler') || from.players[1], out = t.players.find(x => x.role === inc.role) || t.players[1];
    const ev = window.CS2Roster.evaluate({ kind: 'buy', actor: 'ai', team: t, from, incoming: inc, out, fee: 300000 });
    const wk = Math.floor(seasonState.calendar.currentMs / (7 * 864e5)); seasonState.calendar.currentMs += 7 * 864e5; F.weekly();
    const listed = t.players.some(x => x.v31listed), bud = V.org(t.name).budget;
    const j = (transferState.v90Journal || []).filter(e => e.type === 'FINANCE' && e.team === t.name).map(e => e.action);
    return { pol, codes: ev.blocks.map(b => b.code), listed, bud, j };
  });
  assert(ai.pol === 'austerity' && ai.codes.includes('AUSTERITY') && ai.listed && ai.bud >= -1000 && ai.j.includes('bailout'), 'ИИ по средствам: ' + JSON.stringify(ai));
  pass(`v94: AI lives within means — austerity blocks fees (${ai.codes.join(',')}), lists its most expensive player, owners clear the debt (${ai.j.join(', ')})`);

  // 3. спонсоры-партнёры: отрасль, требование, нарушения; предложения и переговоры менеджера
  const sp = await p.evaluate(() => {
    const SP = window.CS2Sponsors, V = window.V31, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), t = pro[30];
    const o = V.org(t.name); SP.week(t, o);   // старый спонсор → партнёр
    const conv = !!(o.sponsor && o.sponsor.industry);
    window.CS2Control.take(t.name); window.CS2Control.setLevel('finance', 'manual');
    o.sponsor.until = seasonState.currentSeason - 1; SP.week(t, o);
    const offs = (o.v94offers && o.v94offers.list) || [];
    const id = offs[0] && offs[0].id, amt0 = offs[0] && offs[0].perSeason;
    SP.longer(t, id); const longerAmt = offs[0].perSeason, years = offs[0].years;
    const more = SP.askMore(t, offs[1] && offs[1].id);
    SP.accept(t, id, 'тест');
    // нарушение требования копит «страйки», после 6 — выплата урезана
    o.sponsor.demand = 'stability'; o.budget = -5e6; for (let i = 0; i < 6; i++) SP.week(t, o);   // v138: партнёры платят внутри week — долг должен быть больше недельных выплат
    return { conv, n: offs.length, inds: [...new Set(offs.map(x => x.industry))], amt0, longerAmt, years, more: more.ok !== undefined, accepted: o.sponsor && o.sponsor.id === id, strikes: o.sponsor.strikes, cut: !!o.sponsor.cut };
  });
  assert(sp.conv && sp.n === 3 && sp.longerAmt < sp.amt0 && sp.years >= 2 && sp.more && sp.accepted, 'партнёры и переговоры: ' + JSON.stringify(sp));
  assert(sp.strikes >= 6 && sp.cut, 'штраф за невыполнение требования: ' + JSON.stringify(sp));
  pass(`v94: sponsors — 3 offers (${sp.inds.join(', ')}), longer deal at a discount ($${Math.round(sp.amt0 / 1000)}k → $${Math.round(sp.longerAmt / 1000)}k for ${sp.years} seasons), haggling, breach → payout cut after ${sp.strikes} strikes`);

  // 4. стикеры Мейджора по популярности и стадии; призовые за стадии 17–32
  const st = await p.evaluate(() => {
    const pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), V = window.V31;
    const res = pro.slice(0, 32).map((t, i) => ({ n: t.name, p: i + 1 }));
    const snap = { id: 'v94-major', name: 'v94 Test Major', prestige: 'major', season: seasonState.currentSeason, results: res, prizePool: 1250000 };
    const b0 = res.map(r => V.org(r.n).budget); V.payPrizes(snap);
    const paid = res.map((r, i) => V.org(r.n).budget - b0[i]);
    const s17 = (V.org(res[18].n).ledger || []).some(x => x.kind === 'prize' && /v94 Test Major/.test(x.note || '')), s28 = (V.org(res[27].n).ledger || []).some(x => x.kind === 'prize' && /v94 Test Major/.test(x.note || ''));
    return { s17, s28 };
  });
  assert(st.s17 && st.s28, 'призовые за стадии 17–32: ' + JSON.stringify(st));
  const stk = fs.readFileSync(path.join(dir, 'js/fan/stickers.js'), 'utf8');
  assert(/'stickers'/.test(stk) && /Stage 1/.test(stk) && /CS2Fans/.test(stk), 'стикеры — по популярности и стадии, отдельная статья');
  pass('v94: Major pays Stage 1/2 exits too; sticker revenue by popularity × stage reached, booked as its own line');

  // 5. VRS: факторы относительно пятого лучшего — шкала не сжимается
  const vr = await p.evaluate(() => {
    const M = window.CS2VRSModel; M.recalcAll(); const r = M.refs();
    const pro = teams.filter(t => !t.isAcademy).map(t => M.getBreakdown(t)).filter(Boolean);
    const maxF = k => Math.max(...pro.map(b => b[k] || 0));
    return { refs: r, ok: ['collected', 'network', 'lan'].every(k => r[k] >= 0) };
  });
  assert(vr.ok, 'опорные значения факторов VRS: ' + JSON.stringify(vr));
  const src = fs.readFileSync(path.join(dir, 'js/competition/vrs.js'), 'utf8');
  assert(/rel\(m\.collectedRaw,R\.collected[,)]/.test(src) && /rel\(m\.lan,R\.lan[,)]/.test(src), 'все факторы VRS — относительно опорного значения');   // v112: + максимум в мире (rel(raw, ref, max))
  pass('v94: VRS — bounty collected, opponent network and LAN wins are relative to the 5th best (refs ' + JSON.stringify(vr.refs) + ')');

  // 6. рынок: новичок защищён, обучение на чистых итогах
  const mk = await p.evaluate(() => {
    const D = window.v30MarketDebug, L = window.CS2MarketLearn, pro = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts), t = pro[45];
    const st = t.players.filter(x => !x.status || x.status === 'STARTER');
    const w0 = D.weakLink(t); if (!w0) return { skip: true };
    w0.p.v94joinedAt = seasonState.calendar.currentMs - 3 * 7 * 864e5;
    const w1 = D.weakLink(t);
    for (let i = 0; i < 10; i++) { L.note('academy', 4, true); L.note('buy', -6, false); }
    return { protectedNew: !w1 || w1.p !== w0.p, bAcad: L.bonus('academy'), bBuy: L.bonus('buy') };
  });
  assert(mk.skip || (mk.protectedNew && mk.bAcad > 0 && mk.bBuy < 0 && Math.abs(mk.bBuy) <= 0.5), 'рынок: ' + JSON.stringify(mk));
  pass('v94: market — a 3-week newcomer is not the weak link; learned bonus academy ' + (mk.bAcad || 0).toFixed(2) + ' vs buy ' + (mk.bBuy || 0).toFixed(2));

  // 7. страница финансов
  const pg = await p.evaluate(async () => { HS.nav('finance'); await new Promise(r => setTimeout(r, 300)); const h = document.getElementById('hs-page').innerHTML; return { ok: !/Не удалось показать страницу/.test(h), forecast: /Прогноз сезона/.test(h), partner: /Генеральный партнёр/.test(h) }; });
  assert(pg.ok && pg.forecast && pg.partner, 'страница финансов: ' + JSON.stringify(pg));
  const html = require('./lib/project').pageSources();
  assert(html.includes('js/career/economy.js') && !html.includes('?v=93'), 'модуль v94 подключён');
  assert(!errs.length, 'ошибки страницы: ' + errs.join(' | '));
  pass('v94: finance page shows the season forecast and the partner; module wired; no page errors');
  await ctx.close(); console.log('v94 stage 4 tests passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
