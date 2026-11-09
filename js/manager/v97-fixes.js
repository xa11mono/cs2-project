/* v97 — правки по отзыву игрока.

   1. УРОВЕНЬ ИГРОКОВ (пересчёт один раз на сохранение)
      Стартовые характеристики наполовину брались из случайного числа, зависящего от силы команды: у игроков сильных клубов
      уровень завышался (magixx — 93.3, сильнее donk — 93.1; alex666 — 89.8, на уровне звёзд топ-5). Теперь уровень каждого
      известного игрока приводится к его реальной силе: таблица REAL ниже (известные игроки, шкала базы EMDB 0–100), для
      остальных — уровень из базы EMDB. Форма атрибутов сохраняется: у капитана тактика почти не меняется, сдвигаются
      стрельба, клатчи и утилити. Потенциал сдвигается вместе с уровнем.

   2. КУДА ГОТОВ ПЕРЕЙТИ ИГРОК (CS2Stature.canJoin — через него проходят все пути составов: покупка, свободные агенты,
      замены, амбиции, академия)
      • Раньше ограничение было только у 30 игроков с наградами («франшиза»/«звезда»), а сильный игрок без титулов
        (уровень топ-50 мира) мог уйти в клуб №60. Теперь планка — по уровню игрока среди всех игроков мира:
        топ-10 → клуб не ниже 8-го места, топ-25 → 12-го, топ-50 → 20-го, топ-100 → 32-го, топ-175 → 50-го.
        Свободный агент со временем снижает требования (+3 места за месяц без клуба).
      • Ядро топ-клуба: один из трёх сильнейших игроков команды из топ-6 (без спада, моложе 31) уходит только в клуб выше.
        Так Vitality не отдаёт ropz в клуб ниже — ему нет смысла уходить из топ-команды.
      • Переход в клуб выше рейтингом разрешён всегда.

   3. ОПЫТ ДЛЯ ТОП-КЛУБА
      Клуб из топ-10 не берёт капитана без опыта (Falcons после ухода karrigan брали alex666 — сильного, но без опыта
      турниров такого уровня). Опыт: возраст, число турниров Tier-1/S-Tier/Major в архиве, вес карьеры (CS2Stature), уровень нынешнего клуба.
      Капитану топ-5 нужно 6 из 10, топ-10 — 5; остальным игрокам топ-5 — 2 (если игрок не из топ-30 мира по уровню и не
      свой воспитанник).

   4. ИГРОК ИЗ АКАДЕМИИ В ОСНОВЕ
      После повышения из академии игрок играет слабее, чем в академии: уровень соперников, давление, страх ошибки.
      Временный спад стрельбы и клатчей на 1.5–4 пункта (см. CS2AcademyStepUp), который уходит за 10 недель.

   5. ИСТОРИЯ ПОЗИЦИЙ В РЕЙТИНГЕ
      Недельные снимки мирового рейтинга (топ-60) хранятся всё время игры (seasonState.v97Rank, ~8 КБ за год).
      В «Рейтинг → История позиций» и на странице команды — позиция за месяц, год, конкретный сезон и всё время: лучшая, худшая,
      средняя, недель в топ-10 и на первом месте. */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const DAY = 864e5, WEEK = 7 * DAY;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;
  const lc = s => String(s || '').toLowerCase();
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankList = () => pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const save = () => { try { saveTeams(); saveTransferState(); saveSeasonState(); } catch (e) {} };

  /* ------------------------------------------------------------ 1. уровень игроков */
  // Реальная сила известных игроков (шкала базы EMDB). Там, где база явно ошибается (magixx 93, alex666 91, dziugss 93,
  // xKacpersky 93, Tauson 93), — исправлено вручную. Остальные — по базе EMDB.
  const REAL = {
    donk: 99, ZywOo: 99, m0NESY: 98,
    sh1ro: 95, ropz: 95, NiKo: 94, frozen: 94, kyousuke: 94,
    XANTARES: 93, flameZ: 93, molodoy: 93, KSCERATO: 93, torzsi: 93, w0nderful: 93,
    Spinx: 92, b1t: 92, iM: 92, Twistzz: 92, Jimpphat: 92, yuurih: 92, '910': 92, Techno: 92, makazze: 92, zont1x: 92,
    mezii: 91, YEKINDAR: 91, xertioN: 91, Wicadia: 91, woxic: 91, MATYS: 91, HeavyGod: 91, Staehr: 91, s1mple: 91, Senzu: 91, mzinho: 91, zweih: 91,
    r1nkle: 90, Jame: 90, SunPayus: 90, REZ: 90, EliGE: 90, TeSeS: 90, S1ren: 90,
    dziugss: 89, dem0n: 89, xiELO: 89, tN1R: 89, PR: 89, xelex: 89, KaiR0N: 89, 'KaiR0N-': 89, stavn: 89, phzy: 89, cmtry: 89, dumau: 89, latto: 89, huNter: 89, 'huNter-': 89,
    // капитаны: сила капитана — в тактике, а не в цифрах
    magixx: 86, alex666: 86, karrigan: 86, apEX: 85, FalleN: 84, Aleksib: 86, kyxsan: 86, bLitz: 87, Boombl4: 84, HObbit: 85,
    Krabeni: 86, siuhy: 85, MisteM: 85, Chr1zN: 86, nafany: 84, s1n: 85, JT: 85, tabseN: 87, rain: 86, Magisk: 87, biguzera: 85,
    xKacpersky: 87, Tauson: 88, Mercury: 87, LNZ: 86, arT: 84, max: 84, nitr0: 83, fear: 85, sFade8: 83, twist: 84
  };
  const REAL_LC = new Map(Object.entries(REAL).map(([k, v]) => [lc(k), v]));
  const emdbSkill = nick => { const E = W.CS2_EMDB_2026 && W.CS2_EMDB_2026.players; if (!E) return null; const m = E[nick] || null; return m && Number(m.skill) >= 50 ? Number(m.skill) : null; };
  const realSkill = nick => REAL_LC.get(lc(nick)) || emdbSkill(nick);
  const targetPow = sk => clamp(18.5 + 0.78 * sk, 62, 96);
  // цель по уровню: известный игрок — по таблице REAL; остальные — наполовину по базе EMDB (её шкала грубая: у 160 игроков
  // стоит 91, включая давно ушедших со сцены), наполовину по текущему уровню, и не выше 90.5 (уровень звёзд — только у REAL)
  function targetFor(p) {
    const real = REAL_LC.get(lc(p.nick)); if (real) return targetPow(real);
    const sk = emdbSkill(p.nick); if (sk == null) return null;
    const cur = pow(p), t = cur * 0.5 + targetPow(sk - 2) * 0.5;
    return cur > 90.5 ? Math.min(t, cur) : Math.min(t, 90.5);
  }
  function recalibrate(p) {
    const tgt = targetFor(p); if (tgt == null) return false;
    const before = pow(p), delta = tgt - before;
    if (Math.abs(delta) < 0.3) { p.v97sk = 1; return false; }
    const igl = p.role === 'IGL';
    // у капитана тактика сдвигается на 40% дельты, остальные атрибуты — на 120%: итог по уровню — ровно дельта
    const dIq = igl ? delta * 0.4 : delta, dOther = igl ? delta * 1.2 : delta;
    p.firepower = r1(clamp((+p.firepower || 70) + dOther, 55, 99));
    p.clutch = r1(clamp((+p.clutch || 70) + dOther, 55, 99));
    p.utility = r1(clamp((+p.utility || 70) + dOther, 55, 99));
    p.tacticalIQ = r1(clamp((+p.tacticalIQ || 70) + dIq, 55, 99));
    const rest = tgt - pow(p); if (Math.abs(rest) > 0.2) p.firepower = r1(clamp(p.firepower + rest / 0.4, 55, 99));
    if (Number.isFinite(+p.pot) && +p.pot > 0) p.pot = r1(clamp(Math.max(pow(p), +p.pot + (pow(p) - before)), 0, 99));
    p.v97sk = 1;
    return true;
  }
  function recalibrateWorld() {
    if (seasonState.v97Skill) return 0;
    let n = 0;
    teams.forEach(t => (t.players || []).forEach(p => { if (p && p.nick && !p.v97sk && recalibrate(p)) n++; }));
    (transferState.freeAgents || []).forEach(p => { if (p && p.nick && !p.v97sk && recalibrate(p)) n++; });
    seasonState.v97Skill = 1;
    try { W.CS2Stature && W.CS2Stature.reset && W.CS2Stature.reset(); } catch (e) {}
    save();
    return n;
  }

  /* ------------------------------------------------------------ 2–3. куда готов перейти игрок, опыт */
  let PR = null, prAt = 0;
  function powerRank(nick) {
    const t = Date.now(); if (!PR || t - prAt > 15000) {
      prAt = t; const seen = new Set(), all = [];
      pro().forEach(x => (x.players || []).forEach(p => { if (p && p.nick && !seen.has(lc(p.nick))) { seen.add(lc(p.nick)); all.push(p); } }));
      (transferState.freeAgents || []).forEach(p => { if (p && p.nick && !seen.has(lc(p.nick))) { seen.add(lc(p.nick)); all.push(p); } });
      PR = new Map(); all.sort((a, b) => pow(b) - pow(a)).forEach((p, i) => PR.set(lc(p.nick), i + 1));
    }
    return PR.get(lc(nick)) || 999;
  }
  // места в рейтинге: кэш на 2 с (сортировка 116 команд на каждый вызов canJoin обходилась дорого)
  let RK = null, rkAt = 0;
  const rankOf = t => { if (!t || t.isAcademy) return 999; const tn = Date.now(); if (!RK || tn - rkAt > 2000) { rkAt = tn; RK = new Map(rankList().map((x, i) => [x, i + 1])); } return RK.get(t) || 999; };
  // минимальный уровень клуба (место в рейтинге), куда пойдёт игрок такого уровня
  const capFor = pr => pr <= 10 ? 8 : pr <= 25 ? 12 : pr <= 50 ? 20 : pr <= 100 ? 32 : pr <= 175 ? 50 : 999;
  // турниры высшего уровня в архиве по игрокам
  let T1 = null, t1Key = '', t1At = 0;
  function t1Events(nick) {
    const tn = Date.now(); if (T1 && tn - t1At < 10000) return T1.get(lc(nick)) || 0;   // кэш: canJoin вызывается тысячи раз за тик рынка
    t1At = tn;
    let A = {}; try { A = W.hubArchiveExport ? W.hubArchiveExport() : {}; } catch (e) {}
    const key = Object.keys(A).length; if (!T1 || t1Key !== key) {
      t1Key = key; T1 = new Map();
      Object.values(A).forEach(s => { if (!s || s.show || !s.rost || !/major|elite|regular/i.test(String(s.prestige || s.kind || ''))) return;
        Object.values(s.rost).forEach(list => (list || []).forEach(p => { if (p && p.nick) T1.set(lc(p.nick), (T1.get(lc(p.nick)) || 0) + 1); })); });
    }
    return T1.get(lc(nick)) || 0;
  }
  // опыт 0–10: возраст (до 4), турниры Tier-1/S-Tier/Major в архиве (до 4), вес карьеры (до 3), уровень нынешнего
  // (или последнего) клуба (до 3) — в начале игры архив пуст, и игрок клуба из топ-10 опытнее игрока клуба №60
  function experience(p, team) {
    if (!p) return 0;
    const age = +p.age || 22, ev = t1Events(p.nick);
    let st = 0; try { st = W.CS2Stature ? W.CS2Stature.score(p) : 0; } catch (e) {}
    const club = team && !team.isAcademy ? team : teams.find(t => t && !t.isAcademy && t.name === (p.v30LastProTeam || p.v84FaTeam || p.benchFrom || ''));
    const rk = club ? rankOf(club) : 999, clubP = rk <= 5 ? 3 : rk <= 10 ? 2.5 : rk <= 20 ? 2 : rk <= 30 ? 1 : 0;
    const ageP = clamp((age - 19) * 0.45, 0, 4), evP = clamp(ev / 5, 0, 4), stP = clamp(st / 3, 0, 3);
    return r1(clamp(ageP + evP + stP + clubP, 0, 10));
  }
  const declining = p => { try { return !!(W.CS2Stature && W.CS2Stature.declining(p)); } catch (e) { return false; } };
  const isStarter = p => !p.status || p.status === 'STARTER';
  function coreOf(team, p) {
    if (!team || team.isAcademy || !p || !isStarter(p) || declining(p) || (+p.age || 25) >= 31) return false;
    const top3 = (team.players || []).filter(isStarter).sort((a, b) => pow(b) - pow(a)).slice(0, 3);
    return top3.some(x => lc(x.nick) === lc(p.nick));
  }
  // причина отказа (или null) — используется и в canJoin, и в подсказках
  function refusal(p, toTeam, fromTeam) {
    if (!p || !toTeam || toTeam.isAcademy || W.__v31UserDeal) return null;
    const rt = rankOf(toTeam), rf = fromTeam ? rankOf(fromTeam) : 999;
    // клуб: опыт для топ-10
    if (rt <= 10) {
      const exp = experience(p, fromTeam), igl = p.role === 'IGL';
      // не-капитан: от топ-5 — 2 из 10 (≈ 23–24 года или пара турниров высшего уровня); свои воспитанники — без порога
      // (их переход и так считается со скидкой на адаптацию, CS2AcademyStepUp)
      const own = fromTeam && fromTeam.isAcademy;
      const need = igl ? (rt <= 5 ? 6 : 5) : (rt <= 5 && !own && powerRank(p.nick) > 30 ? 2 : 0);
      if (need && exp < need) return { code: 'EXPERIENCE', text: `${p.nick}: мало опыта для клуба №${rt} (${exp} из ${need})` };
    }
    if (fromTeam && rt < rf) return null;                    // в клуб выше — всегда
    // ядро топ-клуба не уходит вниз
    if (fromTeam && !fromTeam.isAcademy && rf <= 6 && coreOf(fromTeam, p)) return { code: 'CORE', text: `${p.nick} — ядро ${fromTeam.name} (№${rf}): уходит только в клуб выше` };
    // планка по уровню игрока
    let cap = capFor(powerRank(p.nick));
    if (!fromTeam && p.v84FaSince) { const months = Math.max(0, (now() - p.v84FaSince) / (30 * DAY)); cap += Math.floor(months * 3); }
    if (!isStarter(p) && fromTeam) cap += 10;                // запасной соглашается на клуб пониже
    if ((+p.age || 25) >= 32) cap += 15;                     // ветеран — тоже
    if (rt > cap && !(fromTeam && rt <= rf + 2)) return { code: 'LEVEL', text: `${p.nick} (№${powerRank(p.nick)} по уровню) не пойдёт в клуб №${rt}` };
    return null;
  }
  function hookCanJoin() {
    const S = W.CS2Stature; if (!S || typeof S.canJoin !== 'function') return false; if (S.canJoin.__v97) return true;
    const orig = S.canJoin;
    const w = function (p, toTeam, fromTeam) {
      if (!orig.apply(this, arguments)) return false;
      try { const r = refusal(p, toTeam, fromTeam || null); if (r) { w.last = r; return false; } } catch (e) {}
      return true;
    };
    w.__v97 = true; S.canJoin = w;
    return true;
  }
  W.CS2Experience = { score: experience, t1Events, refusal, powerRank, coreOf, realSkill, targetPow, targetFor };

  /* ------------------------------------------------------------ 4. игрок из академии в основе */
  function stepUpTick() {
    const ts = transferState, mv = ts.v30Moves || [], doneSet = ts.v97StepDone = ts.v97StepDone || {};
    let changed = false;
    mv.forEach(m => {
      if (!m || m.type !== 'promotion' || !m.player || !m.to) return;
      const k = m.player + '|' + m.to + '|' + (m.ts || 0); if (doneSet[k]) return; doneSet[k] = 1;
      const t = teams.find(x => x.name === m.to); if (!t || t.isAcademy) return;
      const p = (t.players || []).find(x => lc(x.nick) === lc(m.player)); if (!p || p.v97step) return;
      const d = W.CS2AcademyStepUp ? W.CS2AcademyStepUp(t, p) : 2.5;
      p.firepower = r1(clamp((+p.firepower || 70) - d, 50, 99)); p.clutch = r1(clamp((+p.clutch || 70) - d, 50, 99));
      p.v97step = { d, left: d, at: now(), wk: Math.floor(now() / WEEK) };
      changed = true;
    });
    // спад уходит за 10 недель
    const wk = Math.floor(now() / WEEK);
    teams.forEach(t => (t.players || []).forEach(p => {
      const s = p && p.v97step; if (!s || s.left <= 0 || wk <= s.wk) return;
      const back = Math.min(s.left, (s.d / 10) * (wk - s.wk)); s.left = r1(s.left - back); s.wk = wk;
      p.firepower = r1(clamp((+p.firepower || 70) + back, 50, 99)); p.clutch = r1(clamp((+p.clutch || 70) + back, 50, 99));
      if (s.left <= 0.05) delete p.v97step;
      changed = true;
    }));
    const keys = Object.keys(doneSet); if (keys.length > 600) keys.slice(0, keys.length - 400).forEach(k => delete doneSet[k]);
    return changed;
  }

  /* ------------------------------------------------------------ 5. история позиций */
  const TOPN = 60;
  const RS = () => { const s = seasonState.v97Rank = seasonState.v97Rank || { names: [], w: [] }; return s; };
  function idxOf(name) { const s = RS(); let i = s.names.indexOf(name); if (i < 0) { s.names.push(name); i = s.names.length - 1; } return i; }
  function rankSnap(force) {
    const s = RS(), t = now(), last = s.w[s.w.length - 1];
    if (!force && last && t - last.ts < WEEK && t >= last.ts) return false;
    const r = rankList().slice(0, TOPN).map(x => idxOf(x.name));
    s.w.push({ ts: t, s: Number(seasonState.currentSeason) || 1, r });
    return true;
  }
  // перенос старых снимков (v30Rank: последние 60 + итог каждого сезона) при первом запуске
  function seedHistory() {
    const s = RS(); if (s.seeded) return; s.seeded = 1;
    const old = (seasonState.v30Rank && seasonState.v30Rank.snaps) || [];
    let lastTs = -Infinity;
    old.slice().sort((a, b) => a.ts - b.ts).forEach(x => { if (!x || !Array.isArray(x.n) || x.ts - lastTs < 6 * DAY) return; lastTs = x.ts; s.w.push({ ts: x.ts, s: x.s || 1, r: x.n.filter(n => { const tm = teams.find(t => t.name === n); return !tm || !tm.isAcademy; }).slice(0, TOPN).map(idxOf) }); });
    rankSnap(true);
  }
  function periods() {
    const cur = Number(seasonState.currentSeason) || 1, out = [['month', 'Месяц'], ['year', 'Год']];
    for (let s = cur; s >= 1; s--) out.push(['season:' + s, `Сезон ${s} (${2025 + s})`]);
    out.push(['all', 'Всё время']);
    return out;
  }
  function inPeriod(per) {
    const s = RS(), t = now();
    if (per === 'month') return s.w.filter(x => x.ts >= t - 30 * DAY);
    if (per === 'year') return s.w.filter(x => x.ts >= t - 365 * DAY);
    if (/^season:/.test(per)) { const n = +per.split(':')[1]; return s.w.filter(x => x.s === n); }
    return s.w.slice();
  }
  function summary(name, per) {
    const s = RS(), i = s.names.indexOf(name), list = inPeriod(per);
    if (!list.length) return null;
    const pos = list.map(x => { const k = i < 0 ? -1 : x.r.indexOf(i); return k < 0 ? null : k + 1; });
    const known = pos.filter(v => v != null);
    const team = teams.find(x => x.name === name), cur = team ? rankOf(team) : null;
    return { weeks: list.length, cur, best: known.length ? Math.min(...known) : null, worst: known.length === pos.length && known.length ? Math.max(...known) : null, out: pos.length - known.length,
      avg: known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length * 10) / 10 : null, top10: known.filter(v => v <= 10).length, first: known.filter(v => v === 1).length, pos, list };
  }
  W.CS2RankHistory = { snap: rankSnap, summary, periods, inPeriod, state: RS };

  const H = W.HS;
  if (H) {
    const esc = H.esc, logo = H.logo, box = H.box, empty = H.empty;
    H.S.v97rp = H.S.v97rp || { per: 'year' };
    const posTxt = v => v == null ? '—' : '#' + v;
    const worstTxt = x => x.worst != null ? '#' + x.worst : (x.out ? `вне топ-${TOPN}` : '—');
    const chips = (cur, attr) => periods().map(([k, l]) => `<button type="button" class="hs-chip${cur === k ? ' on' : ''}" ${attr}="${k}">${esc(l)}</button>`).join('');
    // график позиций за период
    function chart(name, per) {
      const x = summary(name, per); if (!x || x.pos.filter(v => v != null).length < 2) return empty('За этот период снимков рейтинга пока мало');
      const vals = x.pos.map(v => v == null ? TOPN + 1 : v), Wd = 640, Hh = 170, pl = 30, pr = 10, pt = 10, pb = 22, lo = 1, hi = Math.max(10, ...vals) + 1;
      const X = i => pl + (vals.length > 1 ? i * (Wd - pl - pr) / (vals.length - 1) : 0), Y = v => pt + (v - lo) / (hi - lo) * (Hh - pt - pb);
      const path = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
      const grid = [1, 5, 10, 20, 30, 60].filter(v => v < hi).map(v => `<line class="cg" x1="${pl}" x2="${Wd - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="cy" x="${pl - 6}" y="${(Y(v) + 3).toFixed(1)}">#${v}</text>`).join('');
      const seasons = []; x.list.forEach((w, i) => { if (!i || x.list[i - 1].s !== w.s) seasons.push(`<text class="cy" x="${X(i).toFixed(1)}" y="${Hh - 4}" text-anchor="start">С${w.s}</text>`); });
      const step = Math.max(1, Math.ceil(vals.length / 60));
      return `<svg class="hs-chart" viewBox="0 0 ${Wd} ${Hh}">${grid}${seasons.join('')}<path class="cline" d="${path}"/>${vals.map((v, i) => i % step && i !== vals.length - 1 ? '' : `<circle class="cdot up" cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3" data-tip="${v > TOPN ? 'вне топ-' + TOPN : '#' + v} · ${H.fdate(x.list[i].ts)}"/>`).join('')}</svg>`;
    }
    // страница команды: «Позиция в рейтинге» — с периодом
    H.rankChartV97 = name => {
      const per = H.S.v97rp.per, x = summary(name, per);
      const kp = x ? `<div class="pt-kpis in"><div><small>Сейчас</small><b>${posTxt(x.cur)}</b></div><div><small>Лучшая</small><b>${posTxt(x.best)}</b></div><div><small>Худшая</small><b>${worstTxt(x)}</b></div><div><small>Средняя</small><b>${x.avg != null ? '#' + x.avg : '—'}</b></div><div><small>Недель в топ-10</small><b>${x.top10}/${x.weeks}</b></div><div><small>Недель №1</small><b>${x.first}</b></div></div>` : '';
      return `<div class="v97-rk-per">${chips(per, 'data-v97rp')}</div>${kp}${chart(name, per)}`;
    };
    H.CLICKS.push(['[data-v97rp]', el => { H.S.v97rp.per = el.dataset.v97rp; H.render(); }]);
    // «Рейтинг → История позиций»: отдельная вкладка рядом с HLTV World Ranking и VRS
    function historyBlock() {
      const per = H.S.v97rp.per, list = inPeriod(per), s = RS();
      const names = new Set(); list.forEach(w => w.r.forEach(i => names.add(s.names[i])));
      const score = x => x.avg + x.out * TOPN / Math.max(1, x.weeks);
      const rows = [...names].map(n => ({ n, x: summary(n, per) })).filter(r => r.x && r.x.best != null && teams.some(t => t.name === r.n))
        .sort((a, b) => score(a.x) - score(b.x)).slice(0, 40);
      const label = (periods().find(p => p[0] === per) || [0, ''])[1];
      const tbl = rows.length ? `<table class="hs-tbl hs-stbl v97-rk-tbl"><thead><tr><th>#</th><th class="l">Команда</th><th>Сейчас</th><th>Средняя</th><th>Лучшая</th><th>Худшая</th><th>Недель в топ-10</th><th>Недель №1</th></tr></thead><tbody>${rows.map((r, i) => `<tr data-team="${esc(r.n)}"><td class="n">${i + 1}</td><td class="l">${logo(r.n, 'xs')} <b>${esc(r.n)}</b></td><td>${posTxt(r.x.cur)}</td><td><b>${r.x.avg != null ? '#' + r.x.avg : '—'}</b></td><td class="best">${posTxt(r.x.best)}</td><td class="worst">${worstTxt(r.x)}</td><td>${r.x.top10}/${r.x.weeks}</td><td>${r.x.first || '—'}</td></tr>`).join('')}</tbody></table>` : empty('За этот период снимков рейтинга нет');
      return `<div class="hs-head"><h1>История позиций</h1></div><div class="v97-rk-per">${chips(per, 'data-v97rp')}</div>` + box(`Позиции за период: ${esc(label)}`, tbl, `<span class="hs-sub">${list.length} недельных снимков</span>`, 'flush')
        + `<p class="hs-note">Порядок — по средней позиции за период (недели вне топ-${TOPN} считаются как ${TOPN}-е место). Снимки мирового рейтинга — раз в игровую неделю, хранятся всё время игры. Позиция конкретной команды за период — на её странице, блок «Позиция в рейтинге».</p>`;
    }
    H.S.v97rkHist = false;
    // клик по вкладкам HLTV/VRS — выходим из истории (до обработчика v41)
    document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#hs-root [data-v41-rank-mode]')) H.S.v97rkHist = false; }, true);
    H.CLICKS.push(['[data-v97-rank-hist]', () => { H.S.v97rkHist = true; H.render(); }]);
    if (Array.isArray(H.AFTER)) H.AFTER.push(page => {
      if (page !== 'ranking') { H.S.v97rkHist = false; return; }
      try {
        const root = document.getElementById('hs-page'), tabs = root && root.querySelector('.v41-rank-tabs'); if (!tabs) return;
        if (!tabs.querySelector('[data-v97-rank-hist]')) tabs.insertAdjacentHTML('beforeend', `<button type="button" class="v41-rank-tab" data-v97-rank-hist role="tab" aria-selected="false"><span class="v41-rank-tab-mark">◷</span> История позиций</button>`);
        if (!H.S.v97rkHist) return;
        tabs.querySelectorAll('.v41-rank-tab').forEach(b => { const on = b.hasAttribute('data-v97-rank-hist'); b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
        const content = root.querySelector('.v41-ranking-content'); if (content) content.innerHTML = historyBlock();
      } catch (e) { console.warn('[v97 rank history]', e); }
    });
  }

  /* ------------------------------------------------------------ запуск */
  function daily() { try { recalibrateWorld(); } catch (e) {} try { rankSnap(false); } catch (e) {} try { stepUpTick(); } catch (e) { console.warn('[v97 step]', e); } }
  (function hookDaily() {
    const f = W.V30RankSnapshotTick; if (typeof f !== 'function') { setTimeout(hookDaily, 1000); return; }
    if (f.__v97) return;
    const w = function () { const r = f.apply(this, arguments); daily(); return r; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v97 = true; W.V30RankSnapshotTick = w;
  })();
  (function boot(n) {
    if (!hookCanJoin() && n < 40) { setTimeout(() => boot(n + 1), 500); return; }
    try { const k = recalibrateWorld(); if (k) console.info('[v97] уровень пересчитан у', k, 'игроков'); } catch (e) { console.warn('[v97 skill]', e); }
    try { seedHistory(); } catch (e) {}
  })(0);
  W.CS2V97 = { recalibrate, recalibrateWorld, stepUpTick, rankSnap, REAL };
})();
