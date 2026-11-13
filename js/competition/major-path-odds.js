/* v35 — «Путь на мейджор» и линия букмекеров на мейджор.
   Приглашения — как в setupMajorTournament: в момент старта берётся единый список из региональных квот; 8 команд → Stage 3,
   следующие 8 → Stage 2, ещё 16 → Stage 1. Глобальное место само по себе не является общим порогом. Страница показывает только попадание: текущую раскладку и шансы на
   каждую стадию приглашения (Монте-Карло, RUNS прогонов: оставшиеся до мейджора турниры Tier-1 проигрываются по реальным
   изменениям очков команды за её прошлые турниры — t.history[].delta: результаты матчей + бонус за место).
   Шансы пройти по самому мейджору — в новостях «Букмекеры»: при старте и после каждой стадии / раунда плей-офф,
   пересчёт от фактического состояния (кто прошёл, какие пары) по шансам матчей игры (calcMatchOdds). */
(function () {
'use strict';
const H = window.HS; if (!H) return;
const RUNS = 5000, POOL = 10;
const esc = H.esc;
const pct = v => v >= 0.9995 ? '99.9%+' : v >= 0.995 ? '99.5%+' : v < 0.005 ? '<1%' : Math.round(v * 100) + '%';

// Каноническая сортировка Major Path.
// Сначала формируем НЕПРЕРЫВНЫЕ группы по наиболее вероятной стадии: Stage 3 → 2 → 1.
// Внутри группы — по суммарному шансу любого приглашения (s3+s2+s1), по убыванию.
// Сумма стадий — источник истины для общего шанса; поле in используется только
// как fallback для старых/неполных сохранённых результатов.
const probability = v => {
  if (typeof v === 'string' && /%$/.test(v.trim())) { const n = Number.parseFloat(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n / 100)) : 0; }
  const n = Number(v); if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
};
function inviteProbability(row) {
  const sum = probability(row?.s3) + probability(row?.s2) + probability(row?.s1);
  return sum > 0 ? Math.min(1, sum) : probability(row?.in);
}
function probabilityStage(row) {
  const s3 = probability(row?.s3), s2 = probability(row?.s2), s1 = probability(row?.s1);
  if (s3 >= s2 && s3 >= s1) return 3; // при равенстве приоритет у более высокой стадии
  if (s2 >= s1) return 2;
  return 1;
}
function compareProbabilityRows(a, b, stage) {
  // Внутри одной стадии команды всегда идут от большего общего шанса к меньшему.
  const byInvite = inviteProbability(b) - inviteProbability(a);
  if (Math.abs(byInvite) > 1e-12) return byInvite;
  const byMainStage = probability(b?.[`s${stage}`]) - probability(a?.[`s${stage}`]);
  if (Math.abs(byMainStage) > 1e-12) return byMainStage;
  for (const key of ['s3', 's2', 's1']) {
    const diff = probability(b?.[key]) - probability(a?.[key]);
    if (Math.abs(diff) > 1e-12) return diff;
  }
  const rankA = Number.isFinite(Number(a?.rank)) ? Number(a.rank) : Number.MAX_SAFE_INTEGER;
  const rankB = Number.isFinite(Number(b?.rank)) ? Number(b.rank) : Number.MAX_SAFE_INTEGER;
  return rankA - rankB || String(a?.name || '').localeCompare(String(b?.name || ''));
}
function probabilityBuckets(rows) {
  const buckets = { 3: [], 2: [], 1: [] };
  (Array.isArray(rows) ? rows : []).forEach(row => {
    if (!row || inviteProbability(row) <= 0) return;
    buckets[probabilityStage(row)].push(row);
  });
  [3, 2, 1].forEach(stage => buckets[stage].sort((a, b) => compareProbabilityRows(a, b, stage)));
  return buckets;
}
function sortProbabilityRows(rows) {
  const buckets = probabilityBuckets(rows);
  return [3, 2, 1].flatMap(stage => buckets[stage]);
}

function nextMajor() {
  const st = seasonState, idx = Number(st.tournamentIndex) || 1, sch = st.seasonSchedule || [];
  for (let i = idx; i < sch.length; i++) {
    const e = sch[i]; if (!e || e.type !== 'major') continue;
    const before = [];
    for (let j = idx; j < i; j++) { const x = sch[j]; if (!x) continue; if (j === idx && currentTournament && currentTournament.name === x.name && currentTournament.completed) continue; before.push(x); }
    const majorStart = Number(e.calendar?.startMs) || Infinity;
    const now = Number(st.calendar?.currentMs) || Date.now();
    const parallelBefore = (st.parallelSchedule || []).filter(x => x && (x.season == null || Number(x.season) === Number(st.currentSeason)) &&
      x.status !== 'completed' && x.status !== 'cancelled' && Number(x.startMs) < majorStart &&
      Array.isArray(x.participants) && x.participants.length > 0);
    return { i, e, before, parallelBefore, now };
  }
  return null;
}
// изменения очков команды за её последние турниры; мало истории — берём у соседей по рейтингу
function deltaPools(order) {
  const own = order.map(t => (t.history || []).filter(h => Number.isFinite(h.delta)).slice(0, POOL).map(h => h.delta));
  return order.map((t, i) => {
    if (own[i].length >= 3) return own[i];
    const near = []; for (let d = 1; d <= 6 && near.length < POOL; d++) [i - d, i + d].forEach(k => { if (own[k] && own[k].length) near.push(...own[k].slice(0, 3)); });
    return near.length ? near : [0];
  });
}

// Текущая квота — полезный prior для прогноза, но не жёсткий фильтр.
// Профиль строится по тем же региональным слотам, что и реальная раздача приглашений.
function buildQuotaPositionProfile(order) {
  const quotaFallback = { EU: 18, AM: 9, AS: 5 };
  const regionFn = window.CS2Realism?.regionOfTeam || (t => {
    const r = String(t?.region || '').toUpperCase();
    return ['EU','AM','AS'].includes(r) ? r : 'EU';
  });
  const groups = { EU: [], AM: [], AS: [] };
  (Array.isArray(order) ? order : []).forEach(t => {
    const r = regionFn(t);
    (groups[r] || groups.EU).push(t);
  });
  Object.values(groups).forEach(list => list.sort((a,b) => (Number(b.pts)||0) - (Number(a.pts)||0) || String(a.name||'').localeCompare(String(b.name||''))));

  // Число мест по региону берётся из фактического результата общего раскладчика.
  // Это важно, если регион недобрал кандидатов и свободные места перешли другим регионам.
  const seatsByRegion = { EU: 0, AM: 0, AS: 0 };
  let pools = null;
  try { pools = window.CS2Realism?.majorPools?.(order); } catch (e) {}
  if (pools) {
    ['stage3','stage2','stage1'].forEach(k => (pools[k] || []).forEach(item => {
      const name = typeof item === 'string' ? item : item?.name;
      const team = order.find(t => t?.name === name);
      if (!team) return;
      const r = regionFn(team);
      if (Object.prototype.hasOwnProperty.call(seatsByRegion, r)) seatsByRegion[r]++;
    }));
  }
  Object.keys(seatsByRegion).forEach(r => {
    if (!seatsByRegion[r]) seatsByRegion[r] = Math.min(quotaFallback[r], groups[r].length);
  });

  const profile = new Map();
  Object.entries(groups).forEach(([region, list]) => {
    const seats = Math.min(list.length, Math.max(0, Number(seatsByRegion[region]) || 0));
    const cutoff = seats > 0 ? Number(list[seats - 1]?.pts) || 0 : (Number(list[0]?.pts) || 0);
    list.forEach((team, index) => {
      const place = index + 1;
      // Плюс — внутри границы, минус — за ней. Место важнее очковой разницы,
      // но большой запас/отставание в очках также влияет на prior.
      const rankMargin = seats + 0.5 - place;
      const rankSignal = Math.max(-2, Math.min(2, rankMargin / 2.2));
      const pointSignal = Math.max(-2.5, Math.min(2.5, ((Number(team.pts) || 0) - cutoff) / 18));
      const score = Math.max(-2, Math.min(2, 0.72 * rankSignal + 0.28 * pointSignal));
      profile.set(team.name, { region, place, seats, cutoffPoints: cutoff, rankMargin, pointMargin: (Number(team.pts)||0)-cutoff, score, inQuota: place <= seats });
    });
  });
  return profile;
}

function quotaAdjustmentLambda(futureEvents) {
  const n = Math.max(0, Number(futureEvents) || 0);
  // Чем ближе фиксация инвайтов, тем весомее текущая квота.
  // Значение остаётся ненулевым и при длинном горизонте, но не заменяет симуляцию будущих турниров.
  return 0.95 + 0.85 / (1 + n / 3);
}

// Перевзвешивает командные шансы с учётом региональной границы и затем
// балансирует матрицу: суммы Stage 3/2/1 остаются равны исходным 8/8/16
// (или фактическому числу слотов в конкретном сохранении), а сумма стадий
// одной команды никогда не превышает 100%.
function calibrateStageProbabilities(rows, quotaProfile, futureEvents) {
  const keys = ['s3', 's2', 's1'];
  const source = Array.isArray(rows) ? rows : [];
  const lambda = quotaAdjustmentLambda(futureEvents);
  const rowRegions = source.map(row => {
    const q = quotaProfile instanceof Map ? quotaProfile.get(row?.name) : quotaProfile?.[row?.name];
    return String(q?.region || 'EU').toUpperCase();
  });
  const regionRows = new Map();
  rowRegions.forEach((region, index) => {
    if (!regionRows.has(region)) regionRows.set(region, []);
    regionRows.get(region).push(index);
  });
  // Сохраняем не только глобальные 8/8/16, но и ожидаемое распределение
  // слотов по каждой паре регион + стадия (например, EU/Stage 2 и AM/Stage 2).
  const constraints = [];
  regionRows.forEach((indices, region) => keys.forEach((key, col) => {
    const target = indices.reduce((sum, i) => sum + probability(source[i]?.[key]), 0);
    constraints.push({ region, indices, col, target });
  }));
  const base = source.map(row => {
    const q = quotaProfile instanceof Map ? quotaProfile.get(row?.name) : quotaProfile?.[row?.name];
    const score = Math.max(-5, Math.min(5, Number(q?.score) || 0));
    const factor = Math.exp(Math.max(-8, Math.min(8, lambda * score)));
    return keys.map(k => probability(row?.[k]) * factor);
  });
  const matrix = base.map(row => row.slice());
  // Итеративное пропорциональное масштабирование с ограничением суммы строки <= 1.
  for (let iter = 0; iter < 800; iter++) {
    constraints.forEach(({ indices, col, target }) => {
      const sum = indices.reduce((total, i) => total + matrix[i][col], 0);
      if (target <= 1e-12) { indices.forEach(i => { matrix[i][col] = 0; }); }
      else if (sum > 1e-12) {
        const scale = target / sum;
        indices.forEach(i => { matrix[i][col] *= scale; });
      }
    });
    matrix.forEach(row => {
      const total = row.reduce((a,b) => a+b, 0);
      if (total > 1) { row.forEach((v,i) => { row[i] = v / total; }); }
    });
    const maxConstraintError = constraints.reduce((max, c) => Math.max(max, Math.abs(c.indices.reduce((sum,i)=>sum+matrix[i][c.col],0)-c.target)), 0);
    const maxRowOverflow = matrix.reduce((max,row)=>Math.max(max,row.reduce((a,b)=>a+b,0)-1),0);
    if (maxConstraintError < 1e-9 && maxRowOverflow < 1e-9) break;
  }
  return source.map((row, i) => {
    const out = { ...row };
    keys.forEach((k, j) => { out[k] = Math.max(0, Math.min(1, matrix[i][j])); });
    out.in = keys.reduce((sum,k)=>sum+out[k],0);
    const q = quotaProfile instanceof Map ? quotaProfile.get(row?.name) : quotaProfile?.[row?.name];
    out.quotaInNow = !!q?.inQuota;
    out.quotaPlace = Number(q?.place) || null;
    out.quotaSeats = Number(q?.seats) || 0;
    return out;
  });
}
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }

// движок мейджора: швейцарка (3 победы — проход, 3 поражения — вылет) и плей-офф на выбывание
function engine(r) {
  const pc = new Map();
  const p = (a, b) => { const k = a + '|' + b; if (!pc.has(k)) { let v = 0.5; try { const o = calcMatchOdds(a, b, false); if (o) v = o.pct1 / 100; } catch (e) {} pc.set(k, v); pc.set(b + '|' + a, 1 - v); } return pc.get(k); };
  const swiss = (field, W0, L0) => {
    const W = {}, L = {}, seen = new Set();
    field.forEach(n => { W[n] = W0?.[n] || 0; L[n] = L0?.[n] || 0; });
    const adv = field.filter(n => W[n] >= 3);
    for (let round = 0; round < 5; round++) {
      const live = field.filter(n => W[n] < 3 && L[n] < 3); if (live.length < 2) break;
      const groups = {}; live.forEach(n => { (groups[W[n] + ':' + L[n]] = groups[W[n] + ':' + L[n]] || []).push(n); });
      // Swiss-пары формируются строго внутри одинакового счёта W–L.
      Object.keys(groups).sort((a,b)=>{const [aw,al]=a.split(':').map(Number),[bw,bl]=b.split(':').map(Number);return bw-aw||al-bl;}).forEach(k=>{
        const g = shuffle(groups[k].slice(), r);
        for (let i = 0; i + 1 < g.length; i += 2) {
          const a = g[i], b = g[i + 1], aw = r() < p(a, b);
          seen.add(a + '|' + b); seen.add(b + '|' + a);
          W[aw ? a : b]++; L[aw ? b : a]++;
          if (W[a] === 3) adv.push(a); if (W[b] === 3) adv.push(b);
        }
      });
    }
    return [...new Set(adv)].slice(0, 8);
  };
  const ko = list => { const out = []; for (let i = 0; i + 1 < list.length; i += 2) out.push(r() < p(list[i], list[i + 1]) ? list[i] : list[i + 1]); return out; };
  return { p, swiss, ko };
}

/* ---------------------------------------------------------------- шансы на приглашение (страница) */
function simulateInvites() {
  const nm = nextMajor(); if (!nm) return null;
  const order = [...teams].filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const names = order.map(t => t.name), pools = deltaPools(order), N = names.length;
  const quotaProfile = buildQuotaPositionProfile(order);
  const teamPool = new Map(names.map((n, i) => [n, pools[i]]));
  const cnt = {}; names.forEach(n => { cnt[n] = { s3: 0, s2: 0, s1: 0, in: 0 }; });
  // Детерминированный seed: одна и та же база/расписание даёт одинаковый прогноз до изменения данных.
  const seedText = [nm.e.name, nm.e.calendar?.startMs || 0, ...order.map(t => `${t.name}:${Number(t.pts)||0}`),
    ...nm.before.map(e => `T1:${e.name}:${e.calendar?.startMs || 0}:${e.size || 0}`),
    ...nm.parallelBefore.map(e => `P:${e.id || e.name}:${e.startMs || 0}:${(e.participants || []).map(x => typeof x === 'string' ? x : x?.name).join(',')}`)].join('|');
  let seed = 2166136261; for (let i = 0; i < seedText.length; i++) { seed ^= seedText.charCodeAt(i); seed = Math.imul(seed, 16777619); }
  const r = rng(seed >>> 0);
  const events = [
    ...nm.before.map(ev => ({ ev, type: 'major', at: Number(ev.calendar?.startMs) || 0 })),
    ...nm.parallelBefore.map(ev => ({ ev, type: 'parallel', at: Number(ev.startMs) || 0 }))
  ].sort((a, b) => a.at - b.at);
  for (let run = 0; run < RUNS; run++) {
    const pts = {}; order.forEach(t => { pts[t.name] = t.pts || 0; });
    events.forEach(({ ev, type }) => {
      let field;
      if (type === 'major') {
        const size = Math.min(N, Number(ev.size) || 16);
        field = names.slice().sort((a, b) => pts[b] - pts[a]).slice(0, size);
      } else {
        field = (ev.participants || []).map(x => typeof x === 'string' ? x : x?.name).filter(n => n && Object.prototype.hasOwnProperty.call(pts, n));
      }
      const tier = String(ev.tier || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const weight = type === 'major' ? 1 : ev.qual ? 0.12 : tier === '2' || tier === 'tier2' ? 0.52 : tier === '3' || tier === 'tier3' ? 0.27 : 0.38;
      field.forEach(n => {
        const pool = teamPool.get(n) || [0];
        const delta = pool[Math.floor(r() * pool.length)];
        pts[n] = Math.max(50, Math.min(2000, pts[n] + delta * weight));
      });
    });
    // Forecast uncertainty at the invite cutoff: teams 2–5 points apart should
    // not be presented as mathematically certain before the roster is frozen.
    // The perturbation is small and is not applied to the actual invite routine.
    order.forEach(t => {
      const hist = (t.history || []).filter(h => Number.isFinite(Number(h.delta))).slice(0, 8).map(h => Number(h.delta) || 0);
      const avgAbs = hist.length ? hist.reduce((a,b)=>a+Math.abs(b),0)/hist.length : 8;
      const mean = hist.length ? hist.reduce((a,b)=>a+b,0)/hist.length : 0;
      const variance = hist.length ? hist.reduce((a,b)=>a + Math.pow(b-mean,2),0)/hist.length : 64;
      const historicalVol = Math.sqrt(Math.max(0, variance));
      // A team three points below a regional cutoff is not a certain outsider:
      // allow realistic ranking movement even when no future event is scheduled.
      const sigma = Math.max(12, Math.min(28, 12 + avgAbs * 0.28 + historicalVol * 0.18 + Math.sqrt(events.length) * 1.25));
      const noise = (r()+r()+r()+r()+r()+r()-3) * sigma * 1.05;
      pts[t.name] = Math.max(50, Math.min(2000, pts[t.name] + noise));
    });
    let top, P = null;
    try { if (window.CS2Realism && window.CS2Realism.poolsByName) P = window.CS2Realism.poolsByName(names, pts); } catch (e) {} // v40: региональные слоты
    if (P) { P.s3.forEach(n => cnt[n].s3++); P.s2.forEach(n => cnt[n].s2++); P.s1.forEach(n => cnt[n].s1++); top = [...P.s3, ...P.s2, ...P.s1]; top.forEach(n => cnt[n].in++); }
    else { top = names.slice().sort((a, b) => pts[b] - pts[a]).slice(0, 32);
    top.slice(0, 8).forEach(n => cnt[n].s3++); top.slice(8, 16).forEach(n => cnt[n].s2++); top.slice(16, 32).forEach(n => cnt[n].s1++); top.forEach(n => cnt[n].in++); }
  }
  const rawRows = names.map((n, i) => { const c = cnt[n], o = { name: n, rank: i + 1, pts: order[i].pts || 0 }; Object.keys(c).forEach(k => { o[k] = c[k] / RUNS; }); return o; });
  const effectiveFutureEvents = nm.before.length + nm.parallelBefore.reduce((sum, ev) => {
    const tier = String(ev?.tier || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return sum + (ev?.qual ? 0.15 : tier === '2' || tier === 'tier2' ? 0.35 : tier === '3' || tier === 'tier3' ? 0.22 : 0.3);
  }, 0);
  const rows = calibrateStageProbabilities(rawRows, quotaProfile, effectiveFutureEvents);
  return { nm, rows, quotaProfile, effectiveFutureEvents, quotaAdjustmentLambda: quotaAdjustmentLambda(effectiveFutureEvents) };
}
let cache = null, cacheKey = '';
function data() {
  const nm = nextMajor(), ss = seasonState || {}, day = Math.floor((Number(ss.calendar?.currentMs) || 0) / 86400000);
  const teamSig = [...teams].filter(t => !t.isAcademy).map(t => `${t.name}:${Number(t.pts)||0}:${t.region||''}:${t.country||''}:${(t.players||[]).slice(0,5).map(p=>`${p?.nick||''}.${p?.country||p?.cc||''}`).join(',')}:${(t.history||[]).slice(0,8).map(h=>Number(h.delta)||0).join(',')}`).sort().join(';');
  const tier1Sig = (ss.seasonSchedule || []).slice(Number(ss.tournamentIndex)||1, nm?.i ?? 0).map(e => `${e?.name}:${e?.calendar?.startMs||0}:${e?.size||0}`).join(';');
  const parallelSig = (ss.parallelSchedule || []).filter(e => e && e.status !== 'completed').map(e => `${e.id||e.name}:${e.status}:${e.startMs||0}:${(e.participants||[]).map(x=>typeof x==='string'?x:x?.name).join(',')}`).sort().join(';');
  const key = [ss.currentSeason, ss.tournamentIndex, day, nm?.e?.name, nm?.e?.calendar?.startMs, currentTournament?.name, currentTournament?.completed, teamSig, tier1Sig, parallelSig].join('|');
  if (key !== cacheKey) { cache = simulateInvites(); cacheKey = key; }
  return cache;
}
function normalizePoolNames(p) {
  if (!p) return null;
  const names = key => (p?.[key] || []).map(nm).filter(Boolean);
  const out = { stage3:names('stage3'), stage2:names('stage2'), stage1:names('stage1') };
  const flat = [...out.stage3,...out.stage2,...out.stage1];
  return out.stage3.length===8 && out.stage2.length===8 && out.stage1.length===16 && new Set(flat).size===32 ? out : null;
}
function frozenPoolsFor(entry, index) {
  if (!entry || !entry.v45RosterLockedAt) return null;
  let saved = normalizePoolNames(entry.v45StagePools);
  if (!saved) { try { saved = normalizePoolNames(window.v45MajorStagePools?.(index)); } catch(e) {} }
  const roster = Array.isArray(entry.v45Participants) ? entry.v45Participants.map(nm).filter(Boolean).slice(0,32) : [];
  const rosterSet = new Set(roster);
  const matchesRoster = p => !!p && roster.length===32 && rosterSet.size===32 && [...p.stage3,...p.stage2,...p.stage1].every(n=>rosterSet.has(n));
  if (matchesRoster(saved)) return saved;
  if (roster.length===32 && rosterSet.size===32) {
    // Legacy v45Participants were written in canonical Stage 3 → 2 → 1 order.
    // Do not recompute their stage from today's VRS: that would move teams after lock.
    const canonical = { stage3:roster.slice(0,8), stage2:roster.slice(8,16), stage1:roster.slice(16,32) };
    entry.v45StagePools = canonical;
    try { saveSeasonState(); } catch(e) {}
    return canonical;
  }
  return saved;
}
function poolsFromCurrentTeams() {
  try {
    const p = normalizePoolNames(window.CS2Realism?.majorPools?.([...teams].filter(t=>!t.isAcademy)));
    if (p) return p;
  } catch(e) {}
  const invited = [...teams].filter(t=>!t.isAcademy).sort((a,b)=>(Number(b.pts)||0)-(Number(a.pts)||0)).slice(0,32).map(t=>t.name);
  if (invited.length!==32) return null;
  return { stage3:invited.slice(0,8), stage2:invited.slice(8,16), stage1:invited.slice(16,32) };
}
function currentStageMap(rows, entry, index) {
  const out = new Map();
  // Current VRS quota is an informational snapshot, separate from the forecast.
  // Stage details remain in the map for the tooltip; the table shows only in/out status.
  const fixed = frozenPoolsFor(entry, index);
  const pools = fixed || poolsFromCurrentTeams();
  if (pools) {
    pools.stage3.forEach(n => out.set(n, ['s3', 'Сейчас проходит в Stage 3 · 8 прямых приглашений по квотам']));
    pools.stage2.forEach(n => out.set(n, ['s2', 'Сейчас проходит в Stage 2 · 8 прямых приглашений по квотам']));
    pools.stage1.forEach(n => out.set(n, ['s1', 'Сейчас проходит в Stage 1 · 16 прямых приглашений по квотам']));
  }
  return out;
}
function currentQuotaStatus(stageMap, teamName) {
  const current = stageMap instanceof Map ? stageMap.get(teamName) : null;
  if (current) return {
    className: 'current-in',
    label: 'В квоте',
    title: `${current[1]}. Это текущий срез VRS, а не прогноз будущей стадии.`
  };
  return {
    className: 'out',
    label: 'Вне квоты',
    title: 'Сейчас команда находится за пределами 32 прямых приглашений по региональным квотам. Вероятность будущего приглашения показана отдельно.'
  };
}

const col = v => `<span class="mp-p" style="color:hsl(${Math.round(v * 120)} 70% 58%)">${pct(v)}</span>`; // от красного (0%) к зелёному (100%)
const nm = x => typeof x === 'string' ? x : x?.name;

function closestBox(order) {
  const ranked = (order || [...teams].filter(t => !t.isAcademy).sort((a,b)=>(b.pts||0)-(a.pts||0))).slice();
  const regionFn = window.CS2Realism?.regionOfTeam || (() => 'EU');
  const quota = { EU: 18, AM: 9, AS: 5 };
  const grouped = { EU: [], AM: [], AS: [] };
  ranked.forEach(t => { const r = regionFn(t); (grouped[r] || grouped.EU).push(t); });
  Object.values(grouped).forEach(a => a.sort((x,y)=>(Number(y.pts)||0)-(Number(x.pts)||0)));
  const candidates = [];
  Object.entries(grouped).forEach(([region, list]) => {
    const seats = quota[region] || 0;
    if (!seats || list.length <= seats) return;
    const cutoff = Number(list[seats - 1]?.pts) || 0;
    list.slice(seats, seats + 3).forEach((t, i) => candidates.push({ t, region, place: seats + i + 1, gap: Math.max(0, cutoff - (Number(t.pts)||0)) }));
  });
  candidates.sort((a,b)=>a.gap-b.gap || a.region.localeCompare(b.region) || a.place-b.place);
  const rows = candidates.slice(0, 12).map(({t,region,place,gap})=>{
    const world = ranked.findIndex(x=>x.name===t.name)+1;
    return `<tr data-team="${esc(t.name)}"><td class="n">${world || '—'}</td><td class="l">${H.logo(t.name,'xs')}<b>${esc(t.name)}</b></td><td>${region}</td><td>#${place}</td><td>${Number(t.pts)||0}</td><td>${gap ? `−${gap}` : '0'}</td></tr>`;
  }).join('');
  if (!rows) return '';
  return H.box('Ближе всего к региональному слоту', `<p class="hs-note">Показаны следующие команды после региональной квоты: EU — 18 мест, AM — 9, AS — 5. «До слота» — сколько очков не хватает до последней команды, проходящей из своего региона. Общий мировой #32 не является единым порогом для всех регионов.</p><div class="mp-wrap"><table class="hs-tbl mp-tbl"><thead><tr><th>Мир #</th><th class="l">Команда</th><th>Регион</th><th>Рег. место</th><th>Очки</th><th>До слота</th></tr></thead><tbody>${rows}</tbody></table></div>`, '', 'flush');
}

function page() {
  const ct = currentTournament;
  if (ct && ct.isMajor && !ct.completed && ct.majorPools) { // мейджор уже идёт — приглашения разосланы
    const pools = normalizePoolNames(ct.majorPools) || frozenPoolsFor((seasonState.seasonSchedule||[]).find(e=>e?.type==='major'&&e.name===ct.name), (seasonState.seasonSchedule||[]).findIndex(e=>e?.type==='major'&&e.name===ct.name)) || ct.majorPools;
    const list = (t, l) => H.box(t, `<div class="mp-inv">${l.map(nm).map(n => `<button type="button" data-team="${esc(n)}">${H.logo(n, 'sm')}<span>${esc(n)}</span></button>`).join('')}</div>`);
    return `<div class="hs-head"><h1>Путь на мейджор</h1><div class="hs-filters"><span class="hs-sub">${esc(ct.name)} идёт · шансы букмекеров — в новостях</span></div></div>
      <div class="hs-grid3">${list('Stage 3 · 8 приглашений по квотам', pools.stage3 || [])}${list('Stage 2 · 8 приглашений по квотам', pools.stage2 || [])}${list('Stage 1 · 16 приглашений по квотам', pools.stage1 || [])}</div>${closestBox()}`;
  }
  const d = data();
  if (!d) return `<div class="hs-head"><h1>Путь на мейджор</h1></div>${H.box('Мейджор', H.empty('В этом сезоне мейджоров больше нет. Шансы появятся с новым сезоном.'))}`;
  const left = d.nm.before.length, when = d.nm.e.calendar?.startMs ? H.fdate(d.nm.e.calendar.startMs) : '';
  const fixedPools = frozenPoolsFor(d.nm.e, d.nm.i);
  if (fixedPools) {
    const poolCard = (title, names, cls) => H.box(title, `<div class="mp-inv ${cls}">${names.map((name, i) => { const t=teams.find(x=>x.name===name); return `<button type="button" data-team="${esc(name)}"><span class="mp-seed">${i+1}</span>${H.logo(name,'sm')}<span>${esc(name)}</span>${t?`<small>${Number(t.pts)||0} VRS</small>`:''}</button>`; }).join('')}</div>`);
    return `<div class="hs-head"><h1>Путь на мейджор</h1><div class="hs-filters"><span class="hs-sub">${esc(d.nm.e.name)} · состав зафиксирован · старт ${when || 'по календарю'}</span></div></div>
      ${H.box('Состав Major подтверждён', '<p class="hs-note">Состав зафиксирован на Pick’Em Day. Команды и стадии больше не меняются из-за последующих обновлений VRS.</p>')}
      <div class="hs-grid3">${poolCard('Stage 3 · 8 команд',fixedPools.stage3,'s3')}${poolCard('Stage 2 · 8 команд',fixedPools.stage2,'s2')}${poolCard('Stage 1 · 16 команд',fixedPools.stage1,'s1')}</div>`;
  }
  const visibleRows = d.rows.filter(x => inviteProbability(x) > 0);
  const rows = sortProbabilityRows(visibleRows);
  const buckets = probabilityBuckets(visibleRows);
  const stageMap = currentStageMap(d.rows, d.nm.e, d.nm.i);
  // Global rank and Major regional slots are different dimensions. Show the
  // region-specific standing next to the world rank so a #32/#33 boundary is
  // not mistaken for a single worldwide cutoff.
  const regionFn = window.CS2Realism?.regionOfTeam || (() => 'EU');
  const regionGroups = { EU: [], AM: [], AS: [] };
  [...teams].filter(t => !t.isAcademy).forEach(t => { const r = regionFn(t); (regionGroups[r] || regionGroups.EU).push(t); });
  Object.values(regionGroups).forEach(a => a.sort((x,y)=>(Number(y.pts)||0)-(Number(x.pts)||0)));
  const regionPlace = new Map(), regionGap = new Map();
  const quotaByRegion = { EU:18, AM:9, AS:5 };
  Object.entries(regionGroups).forEach(([r,a]) => {
    const seats = quotaByRegion[r] || 0, cutoff = Number(a[seats-1]?.pts) || 0;
    a.forEach((t,i)=>{
      regionPlace.set(t.name, `${r} · #${i+1}`);
      const diff = Math.round((Number(t.pts)||0) - cutoff);
      regionGap.set(t.name, i < seats ? 'в квоте' : (diff < 0 ? `−${Math.abs(diff)} очк.` : 'на границе'));
    });
  });
  const renderProbabilityRow = x => {
    const current = currentQuotaStatus(stageMap, x.name);
    const primary = probabilityStage(x), invite = inviteProbability(x);
    return `<tr data-team="${esc(x.name)}" data-current-quota="${current.className === 'current-in' ? 'in' : 'out'}" data-forecast-stage="${primary}" data-invite-probability="${invite.toFixed(6)}"><td class="n">${x.rank}</td><td class="l">${H.logo(x.name, 'xs')}<b>${esc(x.name)}</b></td><td>${x.pts}</td><td>${regionPlace.get(x.name) || '—'}</td><td>${regionGap.get(x.name) || '—'}</td><td class="l"><span class="mp-z ${current.className}" title="${esc(current.title)}">${current.label}</span></td><td><span class="mp-z s${primary}">Stage ${primary}</span></td>
      <td>${col(probability(x.s3))}</td><td>${col(probability(x.s2))}</td><td>${col(probability(x.s1))}</td><td title="Шанс откалиброван по текущему месту относительно региональной квоты и очковому отрыву от границы; влияние уменьшается при большом числе будущих турниров.">${col(invite)}</td></tr>`;
  };
  // Каждая стадия выводится единым последовательным блоком; между блоками нет пустых строк.
  const stageSections = [3, 2, 1].map(stage => {
    const group = buckets[stage]; if (!group.length) return '';
    const title = `Stage ${stage} · ${group.length} команд · внутри по шансу приглашения ↓`;
    return `<tr class="mp-stage-divider mp-stage-divider-s${stage}" data-stage-divider="${stage}"><td colspan="11">${title}</td></tr>${group.map(renderProbabilityRow).join('')}`;
  }).join('');
  const tbl = `<table class="hs-tbl mp-tbl"><thead><tr><th class="n">Мир #</th><th class="l">Команда</th><th>Очки</th><th>Регион / место</th><th>До региональной квоты</th><th class="l">Статус квоты сейчас</th><th>Наиболее вероятная стадия</th><th>Шанс Stage 3</th><th>Шанс Stage 2</th><th>Шанс Stage 1</th><th>Шанс приглашения</th></tr></thead><tbody>${stageSections}</tbody></table>`;
  return `<div class="hs-head"><h1>Путь на мейджор</h1><div class="hs-filters"><span class="hs-sub">${esc(d.nm.e.name)}${when ? ' · старт ~' + when : ''} · до него турниров Tier-1: ${left}</span></div></div>
    ${H.box('Как попадают на мейджор', `<p class="hs-note"><b>Сначала наиболее вероятная стадия, затем общий шанс приглашения.</b> Таблица разбита на непрерывные группы Stage 3, Stage 2 и Stage 1. Группа определяется по самой вероятной стадии: например, 98% на Stage 3 и 2% на Stage 2 — это группа Stage 3. Внутри каждой группы команды отсортированы по общему шансу приглашения (сумма Stage 3 + Stage 2 + Stage 1) по убыванию: 99% выше 72%. Мировой VRS и очки не меняют порядок. Квоты раздельные: EU — 18 мест, AM — 9, AS — 5; единого мирового порога нет. «Статус квоты сейчас» — моментальный срез VRS: «В квоте» означает, что команда сегодня попадает в один из 32 прямых региональных слотов, «Вне квоты» — что пока не попадает. При наведении на статус «В квоте» видна текущая стадия по распределению слотов. «Наиболее вероятная стадия» — отдельный прогноз по ${RUNS} симуляциям оставшихся турниров Tier-1. Поэтому эти данные могут различаться: это не конфликт расчёта, а сравнение сегодняшнего рейтинга с прогнозом на дату фиксации инвайтов. Вероятности Stage 3/2/1 учитывают исторические изменения VRS. Итог дополнительно калибруется по текущему региональному порогу: место внутри квоты даёт преимущество, нахождение за границей — понижающий фактор, который зависит от числа мест до границы и отрыва в очках. Чем больше будущих турниров до фиксации, тем слабее влияние текущего посева. После калибровки сохраняются исходные суммарные места каждой стадии (Stage 3/2/1), а шанс одной команды не может превышать 100%.</p>`)}
    ${H.box('Шансы на приглашение', `<div class="mp-wrap">${tbl}</div>`, '', 'flush')}${closestBox([...teams].filter(t=>!t.isAcademy).sort((a,b)=>(b.pts||0)-(a.pts||0)))}`;
}
H.PAGES.majorpath = page;
if (H.SECTION_OF) H.SECTION_OF.majorpath = 'events';

/* ---------------------------------------------------------------- линия букмекеров по ходу мейджора */
// фаза = что уже сыграно; шансы — от фактического состояния
function phaseOf(ct) {
  const S = ct.majorStages || [];
  if (S[0] && !S[0].completed && !(S[0].rounds || []).some(r => r.some(m => m.winner))) return { key: 'start', title: 'перед стартом', stage: 1 };
  if (S[0]?.completed && S[1] && !S[1].completed && !(S[1].rounds || []).some(r => r.some(m => m.winner))) return { key: 's1', title: 'после Stage 1', stage: 2 };
  if (S[1]?.completed && S[2] && !S[2].completed && !(S[2].rounds || []).some(r => r.some(m => m.winner))) return { key: 's2', title: 'после Stage 2', stage: 3 };
  if (S[2]?.completed && Array.isArray(ct.upperRounds) && ct.upperRounds.length) {
    const U = ct.upperRounds;
    for (let i = 0; i < U.length; i++) {
      const ms = U[i] || [], ready = ms.length && ms.every(m => m.t1 && m.t2), started = ms.some(m => m.winner);
      if (ready && !started) return { key: 'po' + i, title: ['перед плей-офф', 'перед полуфиналами', 'перед финалом'][i] || 'перед финалом', ko: ms.map(m => [m.t1, m.t2]) };
    }
  }
  return null;
}
function simMajor(ct, ph) {
  const r = rng((Date.now() % 1e9) + 7), E = engine(r), P = ct.majorPools || {}, cnt = {};
  const add = (n, k) => { (cnt[n] = cnt[n] || { po: 0, f: 0, w: 0, alive: 1 })[k]++; };
  const s2 = (P.stage2 || []).map(nm), s3 = (P.stage3 || []).map(nm), S = ct.majorStages || [];
  for (let run = 0; run < RUNS; run++) {
    let br;
    if (ph.ko) { br = ph.ko.flat(); }
    else {
      let field = (S[ph.stage - 1]?.teams || []).map(t => t.name);
      for (let st = ph.stage; st <= 3; st++) {
        const adv = E.swiss(field);
        field = st === 1 ? adv.concat(s2.filter(n => !adv.includes(n))).slice(0, 16) : st === 2 ? adv.concat(s3.filter(n => !adv.includes(n))).slice(0, 16) : adv;
      }
      br = shuffle(field, r);
    }
    br.forEach(n => add(n, 'po'));
    while (br.length > 2) br = E.ko(br);
    br.forEach(n => add(n, 'f')); br = E.ko(br); br.forEach(n => add(n, 'w'));
  }
  return Object.entries(cnt).map(([n, c]) => ({ n, po: c.po / RUNS, f: c.f / RUNS, w: c.w / RUNS })).sort((a, b) => b.w - a.w || b.f - a.f || b.po - a.po);
}
// три букмекерские линии: своя маржа и небольшое расхождение в оценке
const BOOKS = [['BetLine', 1.06, 0.03], ['OddsHub', 1.08, 0.05], ['Koef.pro', 1.05, 0.04]];
const coef = (p, margin, noise) => p <= 0.002 ? '—' : Math.max(1.01, 1 / Math.min(0.97, p * margin * (1 + noise))).toFixed(2);
function postOdds(ct, ph) {
  const N = window.V29News; if (!N?.add) return;
  const rows = simMajor(ct, ph); if (!rows.length) return;
  const seed = H.hash ? H.hash(ct.name + ph.key) : 1, jitter = (i, j) => (((seed >> ((i * 3 + j) % 24)) & 15) / 15 - 0.5) * 2;
  const fav = rows[0], top = rows.slice(0, ph.ko ? rows.length : 10);
  const line = (x, i) => `${x.n}: чемпион ${pct(x.w)} (${BOOKS.map(([b, m, s], j) => `${b} ${coef(x.w, m, s * jitter(i, j))}`).join(' · ')})${ph.ko ? '' : ` · плей-офф ${pct(x.po)}`} · финал ${pct(x.f)}`;
  N.add({ cat: 'major', icon: '📈', imp: 7, title: `Букмекеры о ${ct.name} ${ph.title}: фаворит — ${fav.n}`,
    lead: `${fav.n} — главный претендент на титул (${pct(fav.w)}, коэффициент от ${coef(fav.w, BOOKS[2][1], 0)}).`,
    body: [`Линия обновлена ${ph.title}. Шансы — по результатам уже сыгранных матчей и силе команд.`, ...top.map(line), 'Коэффициенты — у трёх букмекеров с разной маржой; ставки на матчи — в разделе «Ставки».'],
    tags: top.slice(0, 8).map(x => N.T(x.n)) });
}
function tickMajorOdds(){
  try {
    const ct = currentTournament, N = window.V29News;
    if (!ct || !ct.isMajor || ct.completed || !ct.majorPools || !N?.add) return false;
    let changed = false;
    if (!ct.v35InvNews) { // приглашения
      ct.v35InvNews = true; changed = true;
      const P = ct.majorPools, s3 = (P.stage3 || []).map(nm), s2 = (P.stage2 || []).map(nm), s1 = (P.stage1 || []).map(nm);
      N.add({ cat: 'major', icon: '✉️', imp: 8, title: `Приглашения на ${ct.name} разосланы`, lead: `${s3.slice(0, 3).join(', ')} и ещё пять команд сразу стартуют в Stage 3.`,
        body: [`Stage 3 (8 приглашений по региональным квотам): ${s3.join(', ')}.`, `Stage 2 (8 приглашений по региональным квотам): ${s2.join(', ')}.`, `Stage 1 (16 приглашений по региональным квотам): ${s1.join(', ')}.`],
        tags: s3.concat(s2, s1).map(n => N.T(n)) });
    }
    const ph = phaseOf(ct); if (!ph) return changed;
    ct.v35Odds = ct.v35Odds || {};
    if (ct.v35Odds[ph.key]) return changed;
    ct.v35Odds[ph.key] = true; postOdds(ct, ph); return true;
  } catch (e) { console.warn('[v35] major odds', e); return false; }
}
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(!window.v57BatchCalendarSkip) tickMajorOdds(); }, 2000);
window.V35Major = { simulateInvites, simMajor, phaseOf, probabilityStage, inviteProbability, probabilityBuckets, sortProbabilityRows, currentQuotaStatus, buildQuotaPositionProfile, quotaAdjustmentLambda, calibrateStageProbabilities, tick: tickMajorOdds };
console.info('[v35] путь на мейджор');
})();
