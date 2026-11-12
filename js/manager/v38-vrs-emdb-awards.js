/* v38 · Valve-inspired Regional Standings + verified EMDB roster migration helpers.
   This is an in-game approximation of the public VRS model, not Valve's production scorer. */
(() => {
  'use strict';
  const vrsNow = () => { try { return Number(seasonState.calendar?.currentMs) || Date.now(); } catch (e) { return Date.now(); } }; // v40: возраст результатов — по игровому календарю
  const DAY = 86400000, SIX_MONTHS = 180 * DAY;
  // Match results only change the two participating teams' ledgers. The global
  // Bounty-Offered reference depends on earnings, so cache it by game day and
  // earnings revision instead of rebuilding it for every match.
  let earningsRevision = 0;
  let lastGlobalRecalcDay = -1, lastGlobalRecalcTeamsRef = null, lastGlobalRecalcTeamsLength = -1, fullRecalcCount = 0;
  let offeredReferenceCache = { raw:null, length:-1, day:-1, revision:-1, value:1 };
  function invalidateOfferedReference(){ earningsRevision++; offeredReferenceCache.raw=null; }
  function offeredReferenceForLiveTeams(now=vrsNow()){
    const raw=rawTeams(), day=Math.floor(Number(now||0)/DAY);
    const c=offeredReferenceCache;
    if(c.raw===raw && c.length===raw.length && c.day===day && c.revision===earningsRevision) return c.value;
    const values=[];
    for(const t of raw){ if(isTeamRecord(t)){ const v=recentEarnings(t,now); if(v>0) values.push(v); } }
    values.sort((a,b)=>b-a);
    const value=values.length>=5?values[4]:(values[0]||1);
    offeredReferenceCache={raw,length:raw.length,day,revision:earningsRevision,value};
    return value;
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
  // v84: временный стенд-ин не меняет состав для VRS — в ключе состава остаётся заменённый игрок.
  const activePlayers = t => {
    const list = (Array.isArray(t?.players) ? t.players : []).filter(p => p && p.nick && !['BENCH','RESERVE'].includes(String(p.status || '').toUpperCase()));
    const orig = t?.tempStandIn?.original;
    const core = list.filter(p => !(p.isStandIn || String(p.status || '').toUpperCase() === 'STAND-IN'));
    if (orig && orig.nick && !core.some(p => p.nick === orig.nick)) core.push(orig);
    return (core.length >= 3 ? core : list).slice(0,5);
  };
  const rosterKey = t => activePlayers(t).map(p => String(p.nick).trim().toLowerCase()).sort().join('|');
  const rawTeams = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const isTeamRecord = t => !!t && typeof t === 'object' && !Array.isArray(t) && typeof t.name === 'string' && !!t.name.trim();
  const teamNameKey = value => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const liveTeams = () => rawTeams().filter(isTeamRecord);
  const resolveTeam = ref => {
    if (isTeamRecord(ref)) return ref;
    if (typeof ref !== 'string' || !ref.trim()) return null;
    const key = teamNameKey(ref);
    return liveTeams().find(t => teamNameKey(t.name) === key) || null;
  };
  const ageWeight = (stamp, now) => {
    const days = Math.max(0, (now - (Number(stamp) || now)) / DAY);
    return days <= 30 ? 1 : days >= 180 ? 0 : (180 - days) / 150;
  };
  const eventPool = ev => Math.max(0, Number(ev?.prizePool ?? ev?.prize ?? ev?.prizeMoney) || 0);
  // v101: вес события ограничен его уровнем (pointsMult: Tier-2 — 0.35, академии — 0.18, Tier-3 — 0.12, открытые
  // отборы — 0.12, закрытые — 0.3; прочие отборы — не выше 0.25). Раньше уровень учитывался только в личных встречах, а
  // «сила побеждённых», «сеть соперников» и «победы на LAN» брали вес из призового фонда: десяток побед на LAN Tier-2
  // давал тот же максимум, что победы на Tier-1, и команды без призовых (100 Thieves: $4k против $160k у MOUZ)
  // поднимались в топ-10.
  const tierCap = ev => {
    const m = Number(ev?.pointsMult); if (Number.isFinite(m) && m > 0 && m < 1) return m;
    if (ev && (ev.qual || ev.isQualifier || /qualifier|квалиф|отбор/i.test(String(ev.name || ev.tournament || '')))) return 0.25;
    const tier = String(ev?.tier ?? ''), kind = String(ev?.kind || '');
    if (tier === '3' || /tier3/i.test(kind)) return 0.12;
    if (/academy/i.test(kind)) return 0.18;
    if (tier === '2' || /tier2/i.test(kind)) return 0.35;
    return 1;
  };
  const eventWeight = ev => {
    const cap = tierCap(ev);
    const explicit = Number(ev?.vrsEventWeight ?? ev?.eventWeight);
    if (Number.isFinite(explicit) && explicit > 0) return clamp(Math.min(explicit, cap), 0, 1);
    const pool = eventPool(ev);
    // Valve publishes an Event Weight per match/event but does not publish
    // the complete event-weight calculator. Use a continuous prize-pool proxy
    // when the game event has no manually specified VRS weight.
    if (!pool) return 0;
    return clamp(Math.min(Math.sqrt(Math.min(pool, 1000000) / 1000000), cap), 0.02, 1);
  };
  // v101: уже записанные результаты старых сохранений — тот же предел (у записи фонового турнира есть sig = значимость)
  function migrateLedgerWeights() {
    try {
      if (typeof seasonState === 'undefined' || !seasonState || seasonState.v101VrsW) return;
      rawTeams().forEach(t => (t?.vrsLedger?.matches || []).forEach(x => { if (x && x.low && Number(x.sig) > 0 && Number(x.sig) < 1 && Number(x.eventWeight) > Number(x.sig)) x.eventWeight = Number(x.sig); }));
      seasonState.v101VrsW = 1;
    } catch (e) {}
    try {   // v113: старые сохранения — одна запись на матч (раньше на карту)
      if (typeof seasonState === 'undefined' || !seasonState || seasonState.v113VrsDedup) return;
      rawTeams().forEach(t => { const l = t && t.vrsLedger; if (!l || !Array.isArray(l.matches)) return;
        const out = [], at = new Map();
        l.matches.forEach(x => { if (!x) return; const k = Number(x.date) + '|' + x.opponent + '|' + (x.eventName || ''); if (at.has(k)) out[at.get(k)] = x; else { at.set(k, out.length); out.push(x); } });
        l.matches = out; });
      seasonState.v113VrsDedup = 1;
    } catch (e) {}
  }
  const isLan = ev => {
    if (ev?.isLAN === true || ev?.lan === true || ev?.offline === true) return true;
    if (ev?.isLAN === false || ev?.lan === false || ev?.online === true) return false;
    const n = String(ev?.name || ev?.tournament || '');
    if (/online|qualifier|cct|united21|esea|faceit/i.test(n)) return false;
    return /major|iem|esl pro|pgl|blast|col[oö]gne|katowice|krak[oó]w|cluj|bucharest|dallas|rio|chengdu|astana/i.test(n);
  };
  const recentEarnings = (t, now = vrsNow()) => {
    const l = t?.vrsLedger;
    return (l?.earnings || []).filter(x => ageWeight(x.date, now) > 0)
      .map(x => ({ ...x, weighted: Math.max(0, Number(x.amount) || 0) * ageWeight(x.date, now) }))
      .sort((a,b) => b.weighted - a.weighted).slice(0,10).reduce((s,x) => s + x.weighted, 0);
  };
  const opponentNetwork = (t, now = vrsNow()) => {
    const ids = new Set();
    (t?.vrsLedger?.matches || []).forEach(m => {
      if (m.won && ageWeight(m.date, now) > 0 && m.opponent) ids.add(String(m.opponent));
    });
    return clamp(ids.size / 20, 0, 1);
  };
  function ensureTeam(t) {
    t = resolveTeam(t);
    if (!t) return null; // legacy string/malformed entries are resolved or safely ignored
    const key = rosterKey(t);
    if (!t.vrsLedger || Number(t.vrsLedger.version) !== 1) {
      t.vrsLedger = { version:1, rosterKey:key, basePts:clamp(t.pts || 500,400,2000), matches:[], earnings:[], startedAt:vrsNow() };
      return t.vrsLedger;
    }
    if (key && t.vrsLedger.rosterKey && key !== t.vrsLedger.rosterKey) {
      const old = String(t.vrsLedger.rosterKey).split('|').filter(Boolean);
      const next = key.split('|').filter(Boolean);
      const overlap = next.filter(n => old.includes(n)).length;
      const current = clamp(t.pts || t.vrsLedger.basePts || 500,400,2000);
      // Game approximation: three of five retained keeps partial roster continuity.
    // Valve's published active-player threshold is match-participation based.
      // v84: правило Valve — очки и результаты принадлежат ядру состава. Если осталось 3 из 5,
      // история матчей и призовых сохраняется (раньше она стиралась при любой замене, и команда
      // проваливалась на 15–20 мест, а потом так же резко возвращалась). Новый состав (<3) начинает с нуля.
      if (overlap >= 3) {
        t.vrsLedger.rosterKey = key;
        t.vrsRosterChange = { at:vrsNow(), retained:overlap, rule:'3-of-5 continuity: результаты сохранены' };
      } else {
        const newBase = Math.round(400 + (current - 400) * 0.35);
        t.vrsLedger = { version:1, rosterKey:key, basePts:newBase, matches:[], earnings:[], startedAt:vrsNow() };
        invalidateOfferedReference();
        t.pts = newBase; t.vrsShown = newBase; t.vrsShownAt = vrsNow();
        t.vrsRosterChange = { at:vrsNow(), retained:overlap, rule:'новый состав: результаты обнулены' };
      }
    }
    t.vrsLedger.matches = Array.isArray(t.vrsLedger.matches) ? t.vrsLedger.matches : [];
    t.vrsLedger.earnings = Array.isArray(t.vrsLedger.earnings) ? t.vrsLedger.earnings : [];
    return t.vrsLedger;
  }
  function cloneTeam(t) {
    const l = t?.vrsLedger || { version:1, rosterKey:rosterKey(t), basePts:clamp(t?.pts || 500,400,2000), matches:[], earnings:[] };
    return { ...t, vrsLedger:{ ...l, matches:(l.matches || []).map(x => ({...x})), earnings:(l.earnings || []).map(x => ({...x})) } };
  }
  function metricsFor(t, now) {
    const l = t?.vrsLedger || { matches:[], earnings:[] };
    const earnings = (l.earnings || []).filter(x => ageWeight(x.date, now) > 0)
      // v113: призовые взвешены уровнем турнира (Tier-1 = 1, Tier-2 ≈ 0.35, Tier-3/отборы ≈ 0.12–0.3, не ниже 0.15). Раньше
      // деньги Tier-2 шли в «призовые» как деньги Tier-1: серия титулов United21/ESL Challenger поднимала клуб в топ-10.
      .map(x => Math.max(0,Number(x.amount)||0) * ageWeight(x.date, now) * clamp(x.eventWeight ?? 1, 0.15, 1)).sort((a,b)=>b-a).slice(0,10);
    const matches = (l.matches || []).filter(x => ageWeight(x.date, now) > 0);
    const bounty = matches.filter(x => x.won).map(x => Math.max(0,Number(x.oppBounty)||0) * ageWeight(x.date,now) * clamp(x.eventWeight ?? 0,0,1)).sort((a,b)=>b-a).slice(0,10);
    const network = matches.filter(x => x.won).map(x => Math.max(0,Number(x.network)||0) * ageWeight(x.date,now) * clamp(x.eventWeight ?? 0,0,1)).sort((a,b)=>b-a).slice(0,10);
    const lan = matches.filter(x => x.won && x.isLAN).map(x => ageWeight(x.date,now) * clamp(x.eventWeight ?? 0,0,1)).sort((a,b)=>b-a).slice(0,10); // v84: LAN-победы взвешены значимостью события, как у Valve
    const h2h = h2hSum(matches, now);
    return {
      offeredRaw:earnings.reduce((a,b)=>a+b,0),
      collectedRaw:bounty.reduce((a,b)=>a+b,0)/10,
      network:network.reduce((a,b)=>a+b,0)/10,
      lan:lan.reduce((a,b)=>a+b,0)/10,
      h2h:clamp(h2h,-250,250),
      // v88: вес результатов растёт со временем (полгода истории), а не с числом матчей. Раньше команды Tier-2,
      // сыгравшие много матчей квалификаций, за 1–2 месяца переходили на «результатную» шкалу очков и обгоняли
      // топ-команды, ещё стоявшие на стартовых очках, — отсюда +20…+40 мест за сезон.
      evidence:Number(l.startedAt) > 0 ? clamp((now-Number(l.startedAt))/SIX_MONTHS,0,1) : Math.max(
        Math.min((l.earnings||[]).filter(x=>ageWeight(x.date,now)>0).length/14,1),
        Math.min(matches.filter(x=>x.won && (Number(x.oppBounty)>0 || Number(x.network)>0)).length/14,1),
        Math.min(matches.filter(x=>x.won && x.isLAN).length/14,1)
      )
    };
  }
  /* v89: личные встречи — не сумма всех матчей за полгода, а ограниченный набор самых значимых результатов:
     лучшие H2H_TOP побед и худшие H2H_TOP поражений (с учётом давности), а суммарный плюс от побед на турнирах
     Tier-2/3, академий и квалификаций — не больше LOW_TIER_CAP. Серия на Tier-3 помогает, но не заменяет
     результаты против сильных соперников, и число сыгранных матчей само по себе рейтинг не поднимает. */
  const CF = (k, d) => { try { return window.CS2Config ? window.CS2Config.get(k, d) : d; } catch (e) { return d; } };
  const H2H_TOP_D = 12, LOW_TIER_CAP_D = 40;   // v90: значения — из CS2Config ('vrs.h2hTop', 'vrs.lowTierCap')
  const isLowEntry = x => x && (x.low === true || (x.low == null && !x.isLAN && (Number(x.eventWeight) || 0) < 0.3));
  function h2hSum(matches, now) {
    const pos = [], neg = [];
    (matches || []).forEach(x => { const v = (Number(x && x.h2hDelta) || 0) * ageWeight(x && x.date, now); if (v > 0) pos.push({ v, low: isLowEntry(x) }); else if (v < 0) neg.push(v); });
    pos.sort((a, b) => b.v - a.v); neg.sort((a, b) => a - b);
    let hi = 0, lo = 0;
    const top = CF('vrs.h2hTop', H2H_TOP_D);
    pos.slice(0, top).forEach(x => { if (x.low) lo += x.v; else hi += x.v; });
    return hi + Math.min(lo, CF('vrs.lowTierCap', LOW_TIER_CAP_D)) + neg.slice(0, top).reduce((a, b) => a + b, 0);
  }
  function refFifth(rows, key) {
    const v = rows.map(x => Math.max(0,Number(x[key])||0)).filter(x => x > 0).sort((a,b)=>b-a);
    return v.length >= 5 ? v[4] : (v[0] || 1);
  }
  // v94: крутизна кривой (vrs.curveK). При 1 (как было) команда с 30% результата пятой лучшей получала 66% балла, с 10% —
  // 50%: почти любая команда с результатами набирала высокий итог, и через 2 сезона клуб №75 оказывался 7-м. При 3: 30% → 39%,
  // 10% → 25%, 1% → 14% — шкала очков за результаты снова от ~600 до ~1900, как стартовая.
  function curve(raw, ref) {
    if (!(raw > 0) || !(ref > 0)) return 0;
    const ratio = raw / ref, k = (window.CS2Config ? window.CS2Config.get('vrs.curveK', 3) : 3);
    return 1 / (1 + k * Math.abs(Math.log10(Math.max(0.000001, ratio))));
  }
  // v84: модель Valve — стартовые очки 400 + 1600 × среднее четырёх факторов, затем поправка
  // личных встреч. До v84 очки были «якорем» посева ± 30, и рейтинг почти не реагировал на результаты.
  // Посев сохраняет вес, пока у команды мало результатов за 6 месяцев (evidence 0..1).
  // v94: все четыре фактора — относительно пятого лучшего значения в мире (как «призовые» и как у Valve). Раньше
  // «сила побеждённых», «сеть соперников» и «победы на LAN» шли в абсолютных единицах (у большинства команд ~0.03), итог
  // определяли одни призовые, и через полгода (когда стартовые очки полностью заменяются результатами) шкала сжималась:
  // 3DMAX с 797 очками оказывался 9-м. Опорные значения обновляются при полном пересчёте (recalcAll).
  let lastRefs = { collected: 0, network: 0, lan: 0 };
  /* v112: выше пятого лучшего значения фактор больше не упирается в 1.0. Раньше пятёрка-семёрка лидеров по каждому
     фактору получала одинаковый максимум (итог ~1950–2000 у 5–7 команд), порядок решали личные встречи (±100), и команда
     без титулов после удачных двух месяцев выходила в топ-4 (G2 №4, MIBR и Aurora №1). Теперь ниже пятого — прежняя
     кривая (×0.85), выше — линейно 0.85…1.0 до лучшего значения в мире: призовые и крупные победы разделяют элиту. */
  const TOP_SHARE = 0.85;
  function relTop(raw, ref, max) {
    if (!(ref > 0) || !(raw > 0)) return 0;
    if (raw <= ref || !(max > ref)) return TOP_SHARE * curve(Math.min(raw, ref), ref);
    return TOP_SHARE + (1 - TOP_SHARE) * clamp((raw - ref) / (max - ref), 0, 1);
  }
  const rel = (raw, ref, max) => relTop(raw, ref, max);
  const refMax = (rows, key) => Math.max(0, ...rows.map(x => Math.max(0, Number(x[key]) || 0)));
  function scoreOneTeam(team, now, offeredRef, knownMetrics=null, refs=null){
    const m=knownMetrics || metricsFor(team,now), R=refs || lastRefs;
    const factors=[relTop(m.offeredRaw,offeredRef,R.offeredMax),rel(m.collectedRaw,R.collected,R.collectedMax),rel(m.network,R.network,R.networkMax),rel(m.lan,R.lan,R.lanMax)];
    const average=factors.reduce((a,b)=>a+b,0)/4;
    const seed=clamp(team.vrsLedger?.basePts ?? team.pts ?? 500,400,2000);
    const coverage=clamp(m.evidence,0,1);
    const resultPts=400+1600*average;
    const startPts=clamp(seed*(1-coverage)+resultPts*coverage,400,2000);
    const hc=CF('vrs.h2hClamp2',120), h2h=clamp(m.h2h,-hc,hc);   // v113: ±120 (было ±200 — личные встречи перетасовывали лидеров)
    const evidenceOffset=startPts-seed;
    const pts=Math.round(clamp(startPts+h2h,400,2000));
    return {pts,startPts,factors,components:{offered:m.offeredRaw,collected:m.collectedRaw,network:m.network,lan:m.lan,h2h:Math.round(h2h),coverage,average:Number(average.toFixed(4)),seedPts:seed,resultPts:Math.round(resultPts),evidenceOffset:Number(evidenceOffset.toFixed(1))}};
  }
  // v84: опубликованные очки догоняют расчётные плавно (постоянная времени ~10 игровых дней), как еженедельные
  // публикации Valve: один турнир сдвигает команду, но не бросает её на 15–20 мест за неделю и обратно.
  const VRS_TAU_DAYS = 10;
  /* v112: публикация рейтинга — 4 раза за сезон (~раз в три месяца), синхронно с Мейджорами: начало сезона, за 10 недель
     до каждого Мейджора (по этой публикации — приглашения и посев) и сразу после каждого Мейджора. Между публикациями
     очки считаются как раньше (vrsShown/vrsTarget, видны в разборе очков), но опубликованные t.pts — таблица, приглашения,
     посев, сила в матче — не меняются. */
  const PUB_BEFORE = 70 * DAY;
  let pubCache = { key: '', dates: [] };
  function pubDates() {
    let st = null; try { st = seasonState; } catch (e) {}
    const sch = (st && st.seasonSchedule) || [];
    const majors = sch.filter(e => e && /major/i.test(e.name || '') && !/qualif|отбор|rmr/i.test(e.name || '') && e.calendar && e.calendar.startMs);
    // v113: ключ — с датами Мейджоров (календарь сдвигает их по ходу сезона; раньше даты публикаций устаревали)
    const key = (st && st.currentSeason) + '|' + sch.length + '|' + majors.map(e => e.calendar.startMs + ':' + (e.calendar.endMs || '')).join(',');
    if (pubCache.key === key && pubCache.dates.length) return pubCache.dates;
    const starts = sch.map(e => Number(e && e.calendar && e.calendar.startMs)).filter(x => x > 0);
    const out = [];
    if (starts.length) {
      const first = Math.min(...starts), y = new Date(first).getUTCFullYear();
      out.push(Date.UTC(y, 0, 1));
      majors.forEach(e => {
        const a = Number(e.calendar.startMs), b = Number(e.calendar.endMs) || a + 14 * DAY;
        out.push(a - PUB_BEFORE, b + DAY);
      });
    }
    pubCache = { key, dates: out.sort((a, b) => a - b) };
    return pubCache.dates;
  }
  // момент последней публикации на дату now (без расписания — начало календарного квартала)
  function pubAt(now) {
    now = Number(now) || 0;
    let at = null; pubDates().forEach(d => { if (d <= now) at = d; });
    if (at == null) { const d = new Date(now); at = Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1); }
    return at;
  }
  function nextPub(now) { now = Number(now) || 0; const d = pubDates().find(x => x > now); if (d) return d; const q = new Date(now); return Date.UTC(q.getUTCFullYear(), Math.floor(q.getUTCMonth() / 3) * 3 + 3, 1); }
  function publish(t, r, now) {
    if (!t || !r) return;
    t.vrsTarget = r.pts; t.vrsBreakdown = r.components;
    let shown = Number(t.vrsShown), at = Number(t.vrsShownAt);
    if (!Number.isFinite(shown) || !Number.isFinite(at)) { shown = r.pts; at = now; } // первая публикация — сразу расчётные очки
    const dt = Math.max(0, (Number(now) || 0) - at) / DAY;
    if (dt >= 1) { shown += (r.pts - shown) * (1 - Math.exp(-dt / VRS_TAU_DAYS)); at = now; }
    t.vrsShown = shown; t.vrsShownAt = at;
    const pa = pubAt(now);
    if (window.CS2VRSLivePts || !Number.isFinite(Number(t.pts)) || t.vrsPubAt == null) { t.pts = Math.round(clamp(shown, 400, 2000)); t.vrsPubAt = pa; }
    else if (pa > Number(t.vrsPubAt) || pa < Number(t.vrsPubAt) - 200 * DAY) {   // новая публикация (или сохранение «из будущего»)   // v113: публикация сдвигает очки на 65% пути к расчётным — без скачков на 8–10 мест за раз
      const prev = Number(t.pts), blend = CF('vrs.pubBlend', 0.65);
      t.pts = Math.round(clamp(prev + (shown - prev) * blend, 400, 2000)); t.vrsPubAt = pa;
    }
  }
  function computeScores(list, now = vrsNow()) {
    const safeList=[...new Set((Array.isArray(list)?list:[]).map(resolveTeam).filter(Boolean))];
    const rows=safeList.map(t=>({team:t,m:metricsFor(t,now)}));
    const offeredRef=refFifth(rows.map(x=>x.m),'offeredRaw');
    const ms=rows.map(x=>x.m), refs={ collected:refFifth(ms,'collectedRaw'), network:refFifth(ms,'network'), lan:refFifth(ms,'lan'), offeredMax:refMax(ms,'offeredRaw'), collectedMax:refMax(ms,'collectedRaw'), networkMax:refMax(ms,'network'), lanMax:refMax(ms,'lan') };
    const result=new Map();
    rows.forEach(({team,m})=>result.set(team.name,scoreOneTeam(team,now,offeredRef,m,refs)));
    result.refs=refs;
    return result;
  }
  function recalcAll(list = liveTeams(), now=vrsNow()) {
    migrateLedgerWeights();
    const safeList = [...new Set((Array.isArray(list) ? list : []).map(resolveTeam).filter(Boolean))];
    safeList.forEach(ensureTeam);
    const scores = computeScores(safeList,now);
    if (scores.refs) lastRefs = scores.refs;   // v94: опорные значения факторов — те же, что в полном пересчёте (превью и пошаговый счёт совпадают)
    safeList.forEach(t => publish(t, scores.get(t.name), now));
    const raw=rawTeams();
    lastGlobalRecalcDay=Math.floor(Number(now||0)/DAY);
    lastGlobalRecalcTeamsRef=raw;
    lastGlobalRecalcTeamsLength=raw.length;
    fullRecalcCount++;
    return scores;
  }
  function addEntry(t, entry) {
    if (!entry) return;
    const l=ensureTeam(t); if (!l) return;
    // v113: одна запись на матч, а не на карту. Раньше BO3 2:0 давал две «победы», и победы, LAN и «сила побеждённых»
    // считались вдвое у команд, игравших много BO3 (отборы, стадии Мейджора). Следующая карта того же матча (тот же день,
    // соперник и турнир) заменяет предыдущую — остаётся решающая карта, её выигрывает победитель матча.
    const i=l.matches.findIndex(x=>x && Number(x.date)===Number(entry.date) && x.opponent===entry.opponent && (x.eventName||'')===(entry.eventName||''));
    if (i>=0) l.matches[i]={...entry}; else l.matches.push({...entry});
    const cutoff=vrsNow()-SIX_MONTHS;
    l.matches=l.matches.filter(x=>Number(x.date||0)>=cutoff);
  }
  // v88: личные встречи весят по значимости турнира. Раньше каждая победа давала до 24 очков независимо от события,
  // и команды Tier-2/3, сыгравшие десятки матчей квалификаций, поднимались на 20+ мест за пару отборов.
  const isQual = ev => !!(ev && (ev.qual || ev.isQualifier)) || /qualifier|квалиф|отбор/i.test(String(ev?.name || ev?.tournament || ''));
  // v89: у фоновых турниров есть собственная значимость (pointsMult: Tier-2 — 0.35, академии — 0.18, Tier-3 — 0.12,
  // открытые отборы — 0.12, закрытые — 0.3). Раньше она нигде не учитывалась, и победа на Tier-3 с фондом $15 000
  // давала почти столько же, сколько на Tier-2 (+5.7 против +6.4 при равных соперниках).
  const pointsMult = ev => { const m = Number(ev?.pointsMult); return Number.isFinite(m) && m > 0 && m < 1 ? m : 0; };
  const h2hScale = ev => { const base = isQual(ev) ? CF('vrs.qualScale', 0.3) : 0.4 + 0.6 * eventWeight(ev), m = pointsMult(ev); return m ? Math.min(base, m) : base; };
  const isLowEvent = ev => !!pointsMult(ev) || isQual(ev) || /^(2|3)$/.test(String(ev?.tier ?? '')) || /tier[23]|academy/i.test(String(ev?.kind || ''));
  window.CS2VRSH2HScale = h2hScale;
  window.CS2VRSH2H = { sum: h2hSum, isLowEntry, isLowEvent, pointsMult, get TOP() { return CF('vrs.h2hTop', H2H_TOP_D); }, get LOW_CAP() { return CF('vrs.lowTierCap', LOW_TIER_CAP_D); } };
  function makeEntriesWithReference(winner, loser, ev, h2hWin, h2hLose, offeredRef, now=vrsNow()){
    const ew=eventWeight(ev), lan=isLan(ev), hs=h2hScale(ev);
    h2hWin=Math.round(h2hWin*hs*10)/10; h2hLose=Math.round(h2hLose*hs*10)/10;
    const bounty=curve(Math.min(recentEarnings(loser,now),offeredRef),offeredRef);
    const network=opponentNetwork(loser,now);
    const low=isLowEvent(ev);
    const winnerEntry={date:now,opponent:loser.name,won:true,h2hDelta:h2hWin,oppBounty:bounty,network,eventWeight:ew,isLAN:lan,eventName:String(ev?.name||''),low,sig:hs};
    const loserEntry={date:now,opponent:winner.name,won:false,h2hDelta:-h2hLose,oppBounty:0,network:0,eventWeight:ew,isLAN:false,eventName:String(ev?.name||''),low,sig:hs};
    return {winnerEntry,loserEntry,bounty,network,eventWeight:ew,isLAN:lan};
  }
  function makeEntries(winner, loser, ev, h2hWin, h2hLose, referenceTeams = liveTeams(), now = vrsNow()) {
    const offeredValues=(referenceTeams||[]).map(t=>recentEarnings(t,now));
    const offeredRef=offeredValues.filter(x=>x>0).sort((a,b)=>b-a)[4] || Math.max(1,...offeredValues);
    return makeEntriesWithReference(winner,loser,ev,h2hWin,h2hLose,offeredRef,now);
  }
  function applyPending(clones, pending) {
    (pending || []).forEach(r => {
      const w=clones.find(t=>t.name===r.winner), l=clones.find(t=>t.name===r.loser);
      if(w && r.winnerEntry) w.vrsLedger.matches.push({...r.winnerEntry});
      if(l && r.loserEntry) l.vrsLedger.matches.push({...r.loserEntry});
    });
  }
  function delta(self, opp, ev = {}) {
    self = resolveTeam(self); opp = resolveTeam(opp);
    if (!self || !opp) return {before:0,win:0,lose:0,afterWin:0,afterLoss:0};
    const original = liveTeams();
    original.forEach(ensureTeam);
    // A tournament preview includes already completed rounds which have not yet been committed.
    let beforeList = original.map(cloneTeam);
    applyPending(beforeList, ev?.vrsResults || []);
    const before = computeScores(beforeList);
    const selfBefore = before.get(self.name), oppBefore = before.get(opp.name);
    const a = selfBefore?.pts ?? clamp(self.pts||500,400,2000);
    const b = oppBefore?.pts ?? clamp(opp.pts||500,400,2000);
    const startA = selfBefore?.startPts ?? a, startB = oppBefore?.startPts ?? b;
    const headToHead = (own, other) => {
      const expected=1/(1+Math.pow(10,(other-own)/400));
      // v84: K=24 — личные встречи заметно двигают рейтинг, как Glicko-поправка Valve.
      const K=CF('vrs.h2hK',24);
      return { expected, win:Math.max(1,Math.round(K*(1-expected))), lose:Math.max(1,Math.round(K*expected)) };
    };
    const selfH2H=headToHead(startA,startB), oppH2H=headToHead(startB,startA);
    const expected=selfH2H.expected, h2hWin=selfH2H.win, h2hLose=selfH2H.lose;
    const selfBase = beforeList.find(t=>t.name===self.name) || self;
    const oppBase = beforeList.find(t=>t.name===opp.name) || opp;
    const entries = makeEntries(selfBase,oppBase,ev,selfH2H.win,oppH2H.lose,beforeList);
    const reverse=makeEntries(oppBase,selfBase,ev,oppH2H.win,selfH2H.lose,beforeList);
    // A single match preview displays the separate head-to-head adjustment.
    // The four tournament factors are recalculated at event completion from
    // prize earnings, opponent strength/network and LAN results.
    const hs=h2hScale(ev), sc=x=>Math.max(1,Math.round(x*hs)); const win=sc(selfH2H.win), selfLoss=sc(selfH2H.lose), opponentWin=sc(oppH2H.win), opponentLoss=sc(oppH2H.lose); // v88: как в записанных матчах
    return {
      before:a, win, lose:selfLoss, opponentWin, opponentLose:opponentLoss,
      afterWin:a+win, afterLoss:a-selfLoss, expected,
      components:{h2hWin,h2hLose,opponentWin,opponentLose:opponentLoss,bounty:entries.bounty,network:entries.network,eventWeight:entries.eventWeight,isLAN:entries.isLAN,startingA:Number(startA.toFixed(1)),startingB:Number(startB.toFixed(1))},
      winEntry:entries.winnerEntry, opponentLossEntry:entries.loserEntry,
      lossEntry:reverse.loserEntry, opponentWinEntry:reverse.winnerEntry
    };
  }
  function payoutFor(pool, place, fieldSize) {
    if (!(pool>0) || !(place>0) || place>(fieldSize||16)) return 0;
    // Match the game's published career prize split: 1st 40%, 2nd 18%,
    // 3rd 9%, 4th 7%, 5–8th 3.5% each, 9–16th 1.25% each.
    const shares={1:.40,2:.18,3:.09,4:.07,5:.035,6:.035,7:.035,8:.035};
    const share=shares[place] ?? (place<=16?.0125:0);
    return Math.round(pool*share);
  }
  function addEarning(t, ev, place, fieldSize) {
    const pool=eventPool(ev), amount=payoutFor(pool,place,fieldSize);
    if(!amount) return 0;
    const l=ensureTeam(t), id=String(ev?.id||ev?.name||'event')+'|'+String(ev?.season||'')+'|'+String(ev?.completedAt||vrsNow());
    if(!l.earnings.some(x=>x.id===id)){
      l.earnings.push({id,date:Number(ev?.completedAt)||vrsNow(),amount,eventName:String(ev?.name||'Tournament'),prizePool:pool,eventWeight:eventWeight(ev)});
      invalidateOfferedReference();
    }
    l.earnings=l.earnings.filter(x=>Number(x.date||0)>=vrsNow()-SIX_MONTHS);
    return amount;
  }
  function commitMainTournament(ev, list = liveTeams()) {
    if (!ev) return {ok:false};
    if (ev.vrsCommittedAt) return {ok:true,alreadyCommitted:true};
    if (!(ev.vrsResults || []).length && Object.values(ev.pendingDeltas || {}).some(x => Number(x) !== 0)) return {ok:false};
    const participants=Array.isArray(ev.participants)?ev.participants:[];
    (ev.vrsResults||[]).forEach(r=>{
      const w=list.find(t=>t.name===r.winner), l=list.find(t=>t.name===r.loser);
      if(w && r.winnerEntry) addEntry(w,r.winnerEntry);
      if(l && r.loserEntry) addEntry(l,r.loserEntry);
    });
    participants.forEach(name=>{
      const t=list.find(x=>x.name===name), pl=ev.placements?.[name];
      if(t && pl) addEarning(t,ev,Number(pl.place)||99,participants.length);
    });
    ev.vrsCommittedAt=vrsNow();
    recalcAll(list);
    const deltas={}; list.forEach(t=>{ if(participants.includes(t.name)) deltas[t.name]=Math.round(t.pts-(Number(t.vrsLedger?.basePts)||t.pts)); });
    return {ok:true,deltas};
  }
  function applyMatch(a,b,winner,ev,match) {
    a=resolveTeam(a); b=resolveTeam(b);
    if(!a||!b) return null;
    // Main-event previews can carry uncommitted event-local rounds. Keep the
    // exact legacy path for that uncommon case; background matches use the
    // incremental path below and never rescore the complete league per match.
    if(Array.isArray(ev?.vrsResults) && ev.vrsResults.length){
      const da=delta(a,b,ev), db=delta(b,a,ev), direction=winner===a.name?da:db;
      const w=winner===a.name?a:b, l=winner===a.name?b:a;
      addEntry(w,direction.winEntry); addEntry(l,direction.opponentLossEntry);
      recalcAll();
      const result={a:{team:a.name,win:da.win,lose:da.lose},b:{team:b.name,win:db.win,lose:db.lose},winner,appliedAt:vrsNow()};
      if(match) match.vrs=result;
      return result;
    }
    ensureTeam(a); ensureTeam(b);
    const now=vrsNow(), offeredRef=offeredReferenceForLiveTeams(now);
    const beforeA=scoreOneTeam(a,now,offeredRef), beforeB=scoreOneTeam(b,now,offeredRef);
    const headToHead=(own,other)=>{
      const expected=1/(1+Math.pow(10,(other-own)/400)), K=CF('vrs.h2hK',24);
      return {expected,win:Math.max(1,Math.round(K*(1-expected))),lose:Math.max(1,Math.round(K*expected))};
    };
    const ha=headToHead(beforeA.startPts,beforeB.startPts), hb=headToHead(beforeB.startPts,beforeA.startPts);
    const ab=makeEntriesWithReference(a,b,ev,ha.win,hb.lose,offeredRef,now);
    const ba=makeEntriesWithReference(b,a,ev,hb.win,ha.lose,offeredRef,now);
    const winA=winner===a.name, winningSide=winA?ab:ba;
    const winningTeam=winA?a:b, losingTeam=winA?b:a;
    addEntry(winningTeam,winningSide.winnerEntry);
    addEntry(losingTeam,winningSide.loserEntry);
    // A background result changes only these two ledgers. Bounty-Offered's
    // global reference is unchanged until a tournament prize is committed.
    const afterA=scoreOneTeam(a,now,offeredRef), afterB=scoreOneTeam(b,now,offeredRef);
    publish(a, afterA, now); publish(b, afterB, now);
    // Age weights change with virtual time. Refresh the rest of the league once
    // on a new game day (or after team-array replacement), not once per match.
    const raw=rawTeams(), day=Math.floor(now/DAY);
    if(day!==lastGlobalRecalcDay || raw!==lastGlobalRecalcTeamsRef || raw.length!==lastGlobalRecalcTeamsLength){
      recalcAll(liveTeams(),now);
    }
    const hs=h2hScale(ev), sc=x=>Math.max(1,Math.round(x*hs)); // v88: отчёт — с весом турнира, как в превью
    const result={a:{team:a.name,win:sc(ha.win),lose:sc(ha.lose)},b:{team:b.name,win:sc(hb.win),lose:sc(hb.lose)},winner,appliedAt:now};
    if(match) match.vrs=result;
    return result;
  }
  function recordParallelFinish(ev, order, list = liveTeams()) {
    if(!ev || ev.vrsPrizeRecorded) return {};
    const names=Array.isArray(order)?order:[];
    const changes={};
    names.forEach((name,i)=>{
      const t=list.find(x=>x.name===name); if(!t) return;
      const before=Number(t.pts)||500; addEarning(t,ev,i+1,names.length); changes[name]=before;
    });
    recalcAll(list);
    Object.keys(changes).forEach(name=>{const t=list.find(x=>x.name===name);changes[name]=t?Math.round(t.pts-changes[name]):0;});
    ev.vrsPrizeRecorded=vrsNow();
    return changes;
  }
  liveTeams().forEach(ensureTeam);
  recalcAll();
  window.CS2VRSPub = { at: pubAt, next: nextPub, dates: pubDates };
  window.CS2VRSModel = {
    version:2, name:'Valve-inspired VRS', factors:['Bounty Offered','Bounty Collected','Opponent Network','LAN Wins','Head-to-head'],
    delta, recalcAll, ensureTeam, commitMainTournament, applyMatch, recordParallelFinish,
    getBreakdown(team){const resolved=resolveTeam(team);return computeScores(liveTeams()).get(resolved?.name)?.components || resolved?.vrsBreakdown || null;},
    audit(){const raw=rawTeams();return {validTeams:liveTeams().length,invalidEntries:raw.filter(t=>!isTeamRecord(t)).map(t=>typeof t==='string'?t:String(t)),invalidCount:raw.filter(t=>!isTeamRecord(t)).length,fullRecalcCount,lastGlobalRecalcDay,offeredReferenceRevision:earningsRevision};},
    ageWeight, eventWeight, refs: () => Object.assign({}, lastRefs)
  };

  // Add all imported EMDB rosters without duplicating existing organisations or overwriting career teams.
  function importMissingEmdbTeams() {
    const E=window.CS2_EMDB_2026; if(!E || typeof teams==='undefined' || !Array.isArray(teams)) return;
    const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    let added=0;
    Object.entries(E.rosters||{}).forEach(([name,roster],idx)=>{
      if(!Array.isArray(roster)||roster.length<5) return;
      if(teams.some(t=>norm(t.name)===norm(name))) return;
      const meta=E.teams?.[name]||{};
      const maps=typeof generateMapStats==='function'?generateMapStats():{};
      const mapStats={};
      (typeof MAP_POOL!=='undefined'?MAP_POOL:[]).forEach(m=>{const wr=Math.round(Number(maps[m])||50);mapStats[m]={wins:Math.round(20*wr/100),losses:20-Math.round(20*wr/100)};});
      const team={name,pts:Math.max(260,420-idx*2),style:'Tactical',maps,mapStats,mapStatsVersion:2,mapHistory:[],mapPickHistory:{},history:[],streak:0,form:100,fatigue:0,prevRank:null,lastBootcampSeason:0,trophies:{majors:0,elite:0,regular:0,grandFinalsWon:0},activeModifier:null,seasonStartRank:null,seasonChampionships:0,players:[],coach:{name:'coach',flag:'🌍'},playerLayerVersion:1,rosterLastChange:null,tempStandIn:null,rosterSource:'EMDB',rosterUpdatedAt:E.asOf||'2026-10-31'};
      team.players=roster.slice(0,5).map((nick,i)=>typeof createPlayerFromNick==='function'?createPlayerFromNick(team,nick,i):{nick,status:'STARTER'});
      if(meta.photo){team.logo=meta.photo;team.photo=meta.photo;}
      if(meta.country) team.country=meta.country;
      if(/academy|\byb\b/i.test(name)) team.isAcademy=true;
      teams.push(team); if(typeof ensurePlayerLayer==='function') ensurePlayerLayer(team); added++;
    });
    if(added && typeof saveTeams==='function') { try{saveTeams();}catch(e){} }
    if(added) { recalcAll(); console.info('[v38] imported additional EMDB organisations:',added); }
  }
  importMissingEmdbTeams();
  if(typeof saveTeams==='function') { try{saveTeams();}catch(e){} }
  console.info('[v38] Valve-inspired VRS model active; incremental match scoring and daily decay refresh enabled; EMDB roster import checked');
})();
