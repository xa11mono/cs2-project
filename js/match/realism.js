/* v40 — реализм CS2: экономика раундов, стороны CT/T, калибровка карты↔раунда, сила команды отдельно от VRS,
   региональные приглашения на Major, миграция пула карт (Cache вместо Train).
   Значения перекоса сторон по картам — приближённые (игровая настройка), не официальная статистика. */
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rngOf = seed => { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const T_ = () => { try { return typeof teams !== 'undefined' ? teams : []; } catch (e) { return []; } };

  /* ---------------- Стороны ---------------- */
  // Отклонение шанса CT-стороны от 50% на раунд (приближённо)
  const CT_EDGE = { Nuke: 0.040, Ancient: 0.020, Inferno: 0.010, Mirage: 0.000, 'Dust II': -0.010, Cache: 0.000, Anubis: -0.030, Train: 0.045, Overpass: 0.020 };
  const ctEdge = map => Number(CT_EDGE[map]) || 0;
  const sideAdj = (map, side) => (side === 'CT' ? 1 : -1) * ctEdge(map);
  const flip = s => (s === 'CT' ? 'T' : 'CT');
  const sideAt = (round, start1) => {
    if (round <= 12) return start1;
    if (round <= 24) return flip(start1);
    return Math.floor((round - 25) / 3) % 2 ? start1 : flip(start1);
  };
  // Карту выбрала одна команда — сторону выбирает соперник; решающая карта — нож (случайно)
  function chooseStartSide(map, t1, t2, pickedBy, rng) {
    rng = rng || Math.random;
    const e = ctEdge(map);
    const wantsCT = rng() < clamp(0.5 + e * 8, 0.2, 0.8);
    if (pickedBy && pickedBy === t1) return wantsCT ? 'T' : 'CT';   // выбирает команда 2
    if (pickedBy && pickedBy === t2) return wantsCT ? 'CT' : 'T';   // выбирает команда 1
    return rng() < 0.5 ? 'CT' : 'T';
  }
  function t1StartSide(st, m) {
    st.startSides = st.startSides || {};
    const i = st.mapIndex || 0;
    if (!st.startSides[i]) st.startSides[i] = chooseStartSide(st.maps?.[i], m.t1, m.t2, (st.vetoPickedBy || [])[i]);
    return st.startSides[i];
  }
  const t1SideAt = (st, m, round) => sideAt(round, t1StartSide(st, m));

  /* ---------------- Экономика и симуляция карты ---------------- */
  const LOADOUT = { pistol: 650, eco: 700, force: 2600, half: 3500, full: 4750 };
  const power = v => (v >= 4500 ? 1 : 0.28 + 0.72 * Math.pow(v / 4500, 0.9));
  const newEcon = () => ({ money: 800, gear: 0, ctr: 1 });
  function decide(e, round, ot, own, opp) {
    const total = e.money + e.gear;
    if (!ot && (round === 1 || round === 13)) return 'pistol';
    if (ot) return total >= 4900 ? 'full' : (total >= 2700 ? 'force' : 'eco');
    if (total >= 4900) return 'full';
    if ((round === 12 || round === 24 || (opp >= 11 && opp > own)) && total >= 2200) return total >= 3700 ? 'half' : 'force';
    if (total >= 3700) return 'half';
    if (total >= 2700 && e.ctr >= 2) return 'force';
    return 'eco';
  }
  function buy(e, type) {
    const tg = LOADOUT[type], need = Math.max(0, tg - e.gear), pay = Math.min(e.money, need);
    e.money -= pay; e.gear = Math.min(Math.max(e.gear, tg), e.gear + pay);
  }
  function settle(e, won, side, rng) {
    if (won) { e.money += 3250 + 200; e.gear = Math.round(e.gear * 0.78); e.ctr = Math.max(0, e.ctr - 1); }
    else {
      let b = 1400 + 500 * Math.min(e.ctr, 4) + 120;           // бонус за проигрыш + награды за убийства
      if (side === 'T' && rng() < 0.45) b += 800;              // бомба установлена
      e.money += b; e.gear = Math.round(e.gear * 0.08); e.ctr = Math.min(4, e.ctr + 1);
    }
    e.money = Math.min(16000, e.money);
  }
  const BUY_K = 0.20;
  function simulateMap(p0, o) {
    o = o || {};
    const rng = o.rng || Math.random, map = o.map || null, d = ctEdge(map);
    const start1 = o.start1 || (rng() < 0.5 ? 'CT' : 'T');
    const E = [newEcon(), newEcon()];
    let m1 = 0, m2 = 0, round = 0, ot = false, target = 13;
    const rounds = [], buys = { full: 0, half: 0, force: 0, eco: 0, pistol: 0 };
    const resetHalf = () => E.forEach(e => { e.money = 800; e.gear = 0; e.ctr = 1; });
    const resetOT = () => E.forEach(e => { e.money = 12500; e.gear = 0; e.ctr = 0; }); // v84: стартовые деньги овертайма в CS2 — $12 500
    for (;;) {
      round++;
      const side1 = sideAt(round, start1), side2 = flip(side1);
      const b1 = decide(E[0], round, ot, m1, m2), b2 = decide(E[1], round, ot, m2, m1);
      buy(E[0], b1); buy(E[1], b2); buys[b1]++; buys[b2]++;
      const pw1 = b1 === 'pistol' ? 0.75 : power(E[0].gear), pw2 = b2 === 'pistol' ? 0.75 : power(E[1].gear);
      const p = clamp(p0 + (pw1 - pw2) * BUY_K + (side1 === 'CT' ? d : -d), 0.06, 0.94);
      const w = rng() < p ? 1 : 2;
      if (w === 1) m1++; else m2++;
      rounds.push(w);
      settle(E[0], w === 1, side1, rng); settle(E[1], w === 2, side2, rng);
      if (!ot && round === 12) resetHalf();
      if (!ot && m1 === 12 && m2 === 12) { ot = true; target = 16; resetOT(); }
      else if (ot && m1 === 15 && m2 === 15) { target = 19; resetOT(); }
      else if (ot && m1 === 18 && m2 === 18) { target = 22; resetOT(); }
      if (((m1 >= target || m2 >= target) && Math.abs(m1 - m2) >= 2) || (ot && (m1 >= target || m2 >= target))) break;
    }
    return { m1, m2, rounds, overtime: ot, start1, buys };
  }

  // Калибровка «шанс раунда → шанс карты» по новой экономике (заменяет старую жёсткую таблицу v29)
  let RT = null;
  function getRT() {
    if (RT) return RT;
    const rng = rngOf(40404), out = [];
    for (let i = 0; i <= 20; i++) {
      const q = +(0.30 + i * 0.02).toFixed(2); let w = 0; const N = 2500;
      for (let k = 0; k < N; k++) { const r = simulateMap(q, { rng, start1: rng() < 0.5 ? 'CT' : 'T' }); if (r.m1 > r.m2) w++; }
      out.push([q, Math.min(0.995, Math.max(0.005, w / N))]);
    }
    for (let i = 1; i < out.length; i++) out[i][1] = Math.max(out[i][1], out[i - 1][1] + 1e-4);
    return (RT = out);
  }

  /* ---------------- Сила команды отдельно от VRS ---------------- */
  function matchStrength(t) {
    if (!t) return 0;
    if (!Number.isFinite(Number(t.matchStrength))) t.matchStrength = Number(t.pts) || 600;
    return Number(t.matchStrength);
  }
  function updateStrength(rate) {
    try {
      const list = T_().filter(t => t && Array.isArray(t.players) && t.players.length >= 5);
      if (list.length < 6) return;
      list.forEach(t => { try { if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(t); } catch (e) {} matchStrength(t); });
      const pw = t => Number(t.playerLayer?.power) || 84;
      const byPower = list.slice().sort((a, b) => pw(b) - pw(a));
      const vals = list.map(t => t.matchStrength).sort((a, b) => b - a);
      byPower.forEach((t, i) => { t.matchStrength += clamp(rate * (vals[i] - t.matchStrength), -25, 25); });
    } catch (e) { console.warn('[v40] updateStrength', e); }
  }

  /* ---------------- Регионы и приглашения на Major ---------------- */
  const AM = new Set(['US', 'CA', 'BR', 'AR', 'CL', 'MX', 'CO', 'UY', 'PE', 'VE', 'BO', 'EC', 'PY', 'GT', 'CR', 'PA', 'DO', 'CU', 'PR']);
  const AS = new Set(['CN', 'MN', 'JP', 'KR', 'IN', 'PK', 'PH', 'ID', 'MY', 'SG', 'TH', 'VN', 'HK', 'TW', 'AU', 'NZ', 'KZ', 'UZ', 'JO', 'AE', 'SA', 'IL', 'TR', 'KG']);
  function regionOfCountry(c) { c = String(c || '').toUpperCase(); return AM.has(c) ? 'AM' : (AS.has(c) ? 'AS' : 'EU'); }
  function normalizeRegion(value) {
    const v = String(value || '').trim().toUpperCase();
    if (['EU','EUROPE','EMEA'].includes(v)) return 'EU';
    if (['AM','AMER','AMERICAS','AMERICA','NA','NORTH AMERICA','SOUTH AMERICA'].includes(v)) return 'AM';
    if (['AS','ASIA','APAC','OCEANIA'].includes(v)) return 'AS';
    return '';
  }
  function regionOfTeam(t) {
    if (!t) return 'EU';
    // Explicit team/league region wins over a mixed-nationality roster. This is
    // also the source used by qualifier seeding, so qualifiers and Major slots
    // cannot disagree for the same team after a roster update.
    const explicit = normalizeRegion(t.region) || normalizeRegion((window.CS2_REAL?.newTeams || []).find(d => d.name === t.name)?.region);
    if (explicit) return explicit;
    const cnt = { EU: 0, AM: 0, AS: 0 };
    (t.players || []).slice(0, 5).forEach(p => {
      let c = p.country || p.cc; try { c = c || window.CS2_EMDB_2026?.players?.[p.nick]?.country; } catch (e) {}
      if (c) cnt[regionOfCountry(c)]++;
    });
    const best = Object.entries(cnt).sort((a, b) => b[1] - a[1] || ['EU','AM','AS'].indexOf(a[0]) - ['EU','AM','AS'].indexOf(b[0]))[0];
    if (best && best[1] > 0) return best[0];
    return regionOfCountry(t.country);
  }
  const QUOTA = [{ EU: 6, AM: 2, AS: 0 }, { EU: 6, AM: 1, AS: 1 }, { EU: 6, AM: 6, AS: 4 }]; // Stage 3, Stage 2, Stage 1 (по схеме Valve: 18/9/5)
  const SIZE = [8, 8, 16];
  let lastPools = null;
  function buildPools(cand) {
    const sorted = cand.slice().sort((a, b) => (Number(b.pts) || 0) - (Number(a.pts) || 0));
    const by = { EU: [], AM: [], AS: [] };
    sorted.forEach(t => by[regionOfTeam(t)].push(t));
    const used = new Set(), pools = [[], [], []];
    for (let s = 0; s < 3; s++) ['EU', 'AM', 'AS'].forEach(r => {
      let n = QUOTA[s][r];
      for (const t of by[r]) { if (!n) break; if (used.has(t)) continue; used.add(t); pools[s].push(t); n--; }
    });
    for (let s = 0; s < 3; s++) for (const t of sorted) { if (pools[s].length >= SIZE[s]) break; if (!used.has(t)) { used.add(t); pools[s].push(t); } }
    const byPts = (a, b) => (Number(b.pts) || 0) - (Number(a.pts) || 0);
    return { stage3: pools[0].sort(byPts), stage2: pools[1].sort(byPts), stage1: pools[2].sort(byPts) };
  }
  // Для страницы «Путь на Major» (Монте-Карло): кэш привязан к региону и
  // составу команды, а не только к таймеру — смена игроков обновляет регион сразу.
  const regCache = new Map();
  function regionByName(n) {
    const t = T_().find(x => x && x.name === n);
    if (!t) return 'EU';
    const sig = [t.region || '', t.country || '', ...(t.players || []).slice(0,5).map(p => `${p?.country || p?.cc || ''}:${p?.nick || ''}`)].join('|');
    const cached = regCache.get(n);
    if (!cached || cached.sig !== sig) regCache.set(n, { sig, region: regionOfTeam(t) });
    return regCache.get(n).region;
  }
  function poolsByName(names, pts) {
    const sorted = names.slice().sort((a, b) => (pts[b] || 0) - (pts[a] || 0));
    const by = { EU: [], AM: [], AS: [] };
    sorted.forEach(n => by[regionByName(n)].push(n));
    const used = new Set(), pools = [[], [], []];
    for (let s = 0; s < 3; s++) ['EU', 'AM', 'AS'].forEach(r => {
      let k = QUOTA[s][r];
      for (const n of by[r]) { if (!k) break; if (used.has(n)) continue; used.add(n); pools[s].push(n); k--; }
    });
    for (let s = 0; s < 3; s++) for (const n of sorted) { if (pools[s].length >= SIZE[s]) break; if (!used.has(n)) { used.add(n); pools[s].push(n); } }
    return { s3: pools[0], s2: pools[1], s1: pools[2] };
  }
  function majorInvites(all) {
    const cand = (all || []).filter(t => t && !t.isAcademy);
    // Never silently insert academies into a Major when a legacy save has a
    // short professional pool; missing professional teams are migrated by the roster layer.
    lastPools = buildPools(cand);
    return [...lastPools.stage3, ...lastPools.stage2, ...lastPools.stage1];
  }
  function majorPools(all32) {
    // Always derive stages from the exact supplied roster snapshot. Reusing a
    // module-global lastPools cache allowed an earlier preview/roster to leak
    // into a different Major and produce contradictory Stage 2/3 labels.
    return buildPools((all32 || []).filter(t => t && !t.isAcademy));
  }

  /* ---------------- Миграция пула карт ---------------- */
  function migrateMaps() {
    try {
      T_().forEach(t => {
        if (!t) return;
        ['maps', 'mapStrength'].forEach(k => {
          const o = t[k]; if (!o || typeof o !== 'object' || Number.isFinite(Number(o.Cache))) return;
          const vals = Object.values(o).map(Number).filter(Number.isFinite);
          const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 60;
          o.Cache = Math.round(clamp((Number.isFinite(Number(o.Train)) ? Number(o.Train) : avg) + (Math.random() * 6 - 3), 40, 95)); // история Train не стирается
        });
        if (t.mapStats && typeof t.mapStats === 'object' && !t.mapStats.Cache) t.mapStats.Cache = { games: 0, wins: 0, losses: 0 };
      });
    } catch (e) { console.warn('[v40] migrateMaps', e); }
  }

  /* ---------------- Призовые по событиям ---------------- */
  // Приближённые реальные фонды (USD). Порядок важен: первое совпадение побеждает.
  const PRIZE_RULES = [
    [/Major/i, 1250000], [/IEM Cologne/i, 1250000], [/Esports World Cup/i, 1250000],
    [/IEM Katowice|IEM Krak|Intel Extreme/i, 1000000], [/ESL Pro League/i, 1000000], [/Thunderpick World/i, 1000000],
    [/BLAST Premier World Final|BLAST.*World Final/i, 1000000], [/\bIEM\b/i, 1000000],
    [/PGL Masters|PGL Bucharest|PGL Astana|\bPGL\b/i, 625000],
    [/BLAST Premier|BLAST Rivals|BLAST Open|BLAST Bounty|\bBLAST\b/i, 500000],
    [/StarLadder|StarSeries/i, 500000], [/CS Asia/i, 500000], [/FISSURE/i, 400000],
    [/Elisa Masters|CCT|Skyesports|Betboom|BetBoom|Games Clash|Perfect World/i, 250000]
  ];
  function prizeFor(name, kind) {
    const n = String(name || '');
    if (kind === 'major') return 1250000;
    for (const [re, v] of PRIZE_RULES) if (re.test(n)) return v;
    return kind === 'elite' ? 500000 : 250000;
  }

  /* ---------------- Подключение ---------------- */
  const api = {
    version: 40, ctEdge, sideAdj, sideAt, chooseStartSide, t1StartSide, t1SideAt, simulateMap, getRT,
    matchStrength, updateStrength, prizeFor, regionOfTeam, normalizeRegion, majorInvites, majorPools, poolsByName, migrateMaps, rngOf,
    ACTIVE_DUTY: ['Ancient', 'Anubis', 'Cache', 'Dust II', 'Inferno', 'Mirage', 'Nuke']
  };
  window.CS2Realism = api;
  try {
    CS2.patch('finalizeTournamentRating', f => function () { const r = f.apply(this, arguments); updateStrength(0.06); migrateMaps(); return r; }, { id: '__v40' });
  } catch (e) { console.warn('[v40] hook', e); }
  if (typeof document !== 'undefined') setTimeout(migrateMaps, 2000);
  // v84: сила в матчах следует за уровнем состава каждую игровую неделю, а не только после турниров Tier-1
  // (раньше сильный новый состав Tier-2 догонял свой уровень больше года, а ослабевший топ-состав столько же
  // держался наверху). За неделю — 4% разрыва (до ±18 очков): серьёзная смена уровня отражается за 2–4 месяца.
  try {
    const every = globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms));
    every(() => { try { const st = typeof seasonState !== 'undefined' ? seasonState : null; if (!st) return;
      const wk = Math.floor((Number(st.calendar?.currentMs) || Date.now()) / (7 * 864e5)); if (st.v84StrWeek === wk) return;
      const n = st.v84StrWeek ? Math.min(8, Math.max(1, wk - st.v84StrWeek)) : 1; st.v84StrWeek = wk;
      for (let i = 0; i < n; i++) updateStrengthWeekly();
    } catch (e) {} }, 4000);
  } catch (e) {}
  function updateStrengthWeekly() {
    const list = T_().filter(t => t && Array.isArray(t.players) && t.players.length >= 5); if (list.length < 6) return;
    list.forEach(t => { try { if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(t); } catch (e) {} matchStrength(t); });
    const pw = t => Number(t.playerLayer?.power) || 84;
    const byPower = list.slice().sort((a, b) => pw(b) - pw(a)), vals = list.map(t => t.matchStrength).sort((a, b) => b - a);
    byPower.forEach((t, i) => { t.matchStrength += clamp(0.04 * (vals[i] - t.matchStrength), -18, 18); });
  }
})();
