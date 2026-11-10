// v99 regression: параллельные турниры Tier-1 (другие операторы в одни даты с основным календарём), выбор команд «куда
// ехать», отборы параллельных турниров, выбор и регистрация менеджера, без пересечения составов, архив как S-Tier.
// Запуск: node tests/v99-tour-choice.test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const assert = (v, m) => { if (!v) throw new Error(m); };
(async () => {
  const dir = path.resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-v99-')), { viewport: { width: 1600, height: 1000 } });
  const p = ctx.pages()[0] || await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + dir + '/index.html');
  for (let i = 0; i < 16; i++) { await p.waitForTimeout(500); const lg = await p.$('#v84-legacy-modal [data-lg="zero"]'); if (lg) { await lg.click(); await p.waitForTimeout(400); break; } }
  await p.waitForFunction(() => window.CS2TourChoice && window.CS2InviteList && window.CS2InviteList.__v99 && seasonState.v88Seed, null, { timeout: 40000 });
  const pass = m => console.log('PASS ' + m);

  // 1. календарь по квотам: 2 Major, ESL — 3 IEM + ESL Pro League, BLAST — 3, другие операторы — 4 параллельных
  const cal = await p.evaluate(() => {
    const sc = seasonState.seasonSchedule.slice(1), org = n => /IEM|ESL/i.test(n) ? 'ESL' : /BLAST/i.test(n) ? 'BLAST' : /Major/i.test(n) ? 'Valve' : 'other';
    const cnt = {}; sc.forEach(s => { const o = s.type === 'major' ? 'Valve' : org(s.name); cnt[o] = (cnt[o] || 0) + 1; });
    const iem = sc.filter(s => s.type !== 'major' && /^IEM/.test(s.name)).length, epl = sc.filter(s => /ESL Pro League/.test(s.name)).length;
    const par = CS2TourChoice.windows().filter(w => w.info).map(w => ({ main: w.st.name, type: w.st.type, par: w.info.name, org: w.info.org, start: w.info.start, mainStart: w.start }));
    return { n: sc.length, cnt, iem, epl, par, from: seasonState.v99CalFrom };
  });
  assert(cal.from === 1 && cal.n === 9 && cal.cnt.Valve === 2 && cal.iem === 3 && cal.epl === 1 && cal.cnt.BLAST === 3 && !cal.cnt.other, 'квоты операторов в основном календаре: ' + JSON.stringify(cal.cnt) + ' IEM ' + cal.iem + ' EPL ' + cal.epl);
  assert(cal.par.length === 4 && new Set(cal.par.map(x => x.org)).size === 4 && cal.par.every(x => x.type !== 'major' && x.org !== 'BLAST' && x.start === x.mainStart), 'четыре параллельных турнира других операторов в те же даты: ' + JSON.stringify(cal.par));
  pass('v99: season = 2 Majors + 3 IEM + ESL Pro League + 3 BLAST; parallel ' + cal.par.map(x => x.par.replace(/ \d{4}$/, '') + ' (vs ' + x.main.replace(/ \d{4}$/, '') + ')').join(', '));

  // 2. решение окна: часть приглашённых выбирает параллельный турнир, причины есть
  const dec = await p.evaluate(() => { CS2Control.take('Team Spirit'); seasonState.v98AutoMatches = true; const i = CS2TourChoice.windows().find(w => w.info).i; CS2TourChoice.decide(i); const x = seasonState.seasonSchedule[i].v99; return { i, n: Object.keys(x.choices).length, par: Object.values(x.choices).filter(c => c === 'par').length, away: x.away.length, why: Object.values(x.why).flat().length, parInv: x.parInv.length }; });
  assert(dec.n >= 6 && dec.par >= 1 && dec.par < dec.n && dec.away === dec.par && dec.parInv === 12, 'выбор команд: ' + JSON.stringify(dec));
  pass(`v99: window ${dec.i} — ${dec.par} of ${dec.n} double-invited teams chose the parallel event; 12 invites`);

  // 3. менеджер: выбор турнира и регистрация на отбор
  const mg = await p.evaluate(i => {
    const C = CS2TourChoice, ev = () => (seasonState.parallelSchedule || []).find(e => e.id === seasonState.seasonSchedule[i].v99.parId);
    C.choose(i, 'par'); const par = { away: seasonState.seasonSchedule[i].v99.away.includes('Team Spirit'), inPar: ev().participants.includes('Team Spirit') };
    C.choose(i, 'main'); const main = { away: seasonState.seasonSchedule[i].v99.away.includes('Team Spirit'), inPar: ev().participants.includes('Team Spirit') };
    const t = teams.filter(x => !x.isAcademy).sort((a, b) => b.pts - a.pts)[30].name; CS2Control.take(t);
    const j = C.windows().filter(w => w.info)[1].i;
    const before = C.excluded(j, t, 'qual'); C.register('M:' + j, true); const after = C.excluded(j, t, 'qual');
    return { par, main, before, after, t };
  }, dec.i);
  assert(mg.par.away && mg.par.inPar && !mg.main.away && !mg.main.inPar, 'выбор менеджера меняет поле: ' + JSON.stringify(mg));
  assert(mg.before === true && mg.after === false, 'без регистрации клуб менеджера не попадает в отбор: ' + JSON.stringify(mg));
  pass(`v99: manager choice moves the club between events; ${mg.t} enters qualifiers only after registration`);

  // 4. сезон до конца марта: параллельный турнир сыгран, в архиве — S-Tier с составами, пересечений с основным нет
  await p.evaluate(() => CS2Control.take('Team Spirit'));
  const run = await p.evaluate(async () => {
    const hide = () => document.querySelectorAll('#v96-gate,#pickem-modal').forEach(x => { x.hidden = true; x.style.display = 'none'; });
    for (let k = 0; k < 16 && seasonState.calendar.currentMs < Date.UTC(2026, 3, 5); k++) { if (v15IsCalendarPaused()) toggleGameCalendarPause(); await window.v33SkipDays(7); hide(); }
    const w = CS2TourChoice.windows(); const sc = seasonState.seasonSchedule, i = CS2TourChoice.PAR.length && Object.entries(CS2TourChoice.state().slots || {}).find(([k]) => k === 'blastopen');
    const step = sc[CS2TourChoice.windows().length ? Object.values(CS2TourChoice.state().slots || {})[0] : 2] || sc[2], A = hubArchiveExport();
    const main = Object.values(A).find(s => s.name === step.name && !s.qual), par = A['P-' + step.v99.parId];
    const mp = main ? (main.results || []).map(r => r.n) : [], pp = par ? (par.results || []).map(r => r.n) : [];
    return { date: new Date(seasonState.calendar.currentMs).toISOString().slice(0, 10), main: !!main, par: par ? { kind: par.kind, tier: par.tier, champ: par.champion, rost: Object.keys(par.rost || {}).length, n: pp.length } : null, both: mp.filter(n => pp.includes(n)) };
  });
  assert(run.main && run.par && run.par.kind === 'elite' && run.par.tier === '1' && run.par.rost === 16 && run.par.n === 16, 'параллельный турнир сыгран и в архиве как S-Tier: ' + JSON.stringify(run));
  assert(run.both.length === 0, 'ни одна команда не играла в двух турнирах одновременно: ' + JSON.stringify(run.both));
  pass(`v99: parallel event played (champion ${run.par.champ}), archived as S-Tier with 16 rosters; no team in both events`);

  // 4b. отказ: усталые составы пропускают турнир (вероятность ~70% на команду — нагружаем пять команд), места получают следующие
  const sk = await p.evaluate(() => {
    const P = CS2TourChoice.PARTNERS, r = teams.filter(t => !t.isAcademy).sort((a, b) => b.pts - a.pts);
    const tired = r.slice(1, 30).filter(x => !P.ESL.includes(x.name) && !P.BLAST.includes(x.name) && x.name !== V31.managed()).slice(0, 5);
    tired.forEach(t => t.players.forEach(p => { p.fatigue = 70; }));
    const i = seasonState.seasonSchedule.findIndex((s, k) => k > 0 && s && s.type !== 'major' && !s.v99 && s.calendar && s.calendar.startMs > seasonState.calendar.currentMs + 3 * 864e5 && !/ESL Pro League|IEM/.test(s.name));
    if (i < 0) return { none: true };
    CS2TourChoice.decide(i); const x = seasonState.seasonSchedule[i].v99, inv = CS2InviteList(12, seasonState.seasonSchedule[i]);
    const invited = tired.filter(t => x.mainInv.includes(t.name) || (x.parPriority || []).slice(0, 12).includes(t.name)).map(t => t.name);
    const skipped = invited.filter(n => x.choices[n] === 'none');
    return { step: seasonState.seasonSchedule[i].name, invited, skipped, why: skipped.map(n => x.why[n][0]), leaked: skipped.filter(n => inv.includes(n)), n: inv.length };
  });
  assert(sk.none || !sk.invited.length || (sk.skipped.length >= 1 && !sk.leaked.length && sk.n === 12), 'отказ от турнира из-за усталости: ' + JSON.stringify(sk));
  pass(`v99: tired rosters at ${sk.step} — skipped: ${(sk.skipped || []).map((n, k) => n + ' (' + sk.why[k] + ')').join(', ') || '—'}; invites refilled to ${sk.n}`);

  // 5. страница «Выбор турниров»
  await p.evaluate(() => HS.nav('tchoice')); await p.waitForTimeout(600);
  const pg = await p.evaluate(() => ({ wins: document.querySelectorAll('#hs-page .v99-win').length, clash: document.querySelectorAll('#hs-page .v99-win.clash').length, menu: !!document.querySelector('#hs-root .pt-menu[data-menu="game"] [data-nav="tchoice"]') }));
  assert(pg.wins >= 5 && pg.clash >= 2 && pg.menu, 'страница выбора турниров: ' + JSON.stringify(pg));
  pass(`v99: «Выбор турниров» page — ${pg.wins} windows, ${pg.clash} with two events`);

  assert(!errs.length, 'ошибки на странице: ' + errs.join(' | '));
  pass('v99: no page errors');
  await ctx.close();
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
