(() => {
  'use strict';

  // v42: реалистичный календарь турниров и стабильная раскладка матчей.
  const DAY = 86400000;
  const GROUP = { first: 13 * 60, last: 21 * 60, cap: 6, gap: 170 }; // 10-минутная сетка v19/v20 требует небольшого буфера
  const PLAYOFF = { first: 16 * 60, last: 21 * 60, cap: 2, gap: 180 };
  const EXPECTED_SWISS = [8, 8, 8, 6, 3];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function gameNow() {
    try { return Number(seasonState?.calendar?.currentMs) || Date.now(); } catch (e) { return Date.now(); }
  }
  function sod(ms) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function slotDuration(match) {
    try {
      const mode = typeof getBroadcastMode === 'function' ? getBroadcastMode(match) : (match?.isBO1 ? 'BO1' : match?.isBO5 ? 'BO5' : 'BO3');
      return mode === 'BO1' ? 105 : mode === 'BO5' ? 240 : 165;
    } catch (e) { return 165; }
  }
  function isPlayoffStage(stage) {
    // 1/8 финала и ранние раунды lower bracket идут групповыми волнами.
    // Финалом считаем отдельную стадию «Финал», а не окончание слова «финала» в «1/8 финала».
    const label = String(stage || '').trim();
    if (/1\s*\/\s*8\s+финала/i.test(label)) return false;
    return /четвертьфинал|полуфинал|гранд.?финал|(?:^|[\s•])финал(?:\s|$)|за\s*3-е\s*место|champions\s*stage/i.test(label);
  }

  // v84: темп сезона. Базовые лимиты (6 групповых / 2 плей-офф серии в день) действуют,
  // пока турнир укладывается в свои даты. Если оставшиеся матчи не помещаются до
  // дедлайна (плановое окончание, но не позже дня перед стартом следующего Tier-1),
  // игровой день начинается раньше и вмещает больше серий — как на реальных ивентах
  // с двумя сценами. Это единственное место, где решается дневная вместимость.
  let paceMemo = { key: '', g: GROUP.cap, p: PLAYOFF.cap };
  function deadlineOf(t) {
    try {
      const S = seasonState, idx = Number(S.tournamentIndex) || 1, sched = S.seasonSchedule || [];
      const own = sched[idx]?.calendar || t.calendar || {};
      const start = Number(own.startMs) || Number(t.calendar?.startMs) || gameNow();
      let end = Number(own.endMs) || (start + Math.max(4, Number(own.durationDays) || 5) * DAY);
      const next = Number(sched[idx + 1]?.calendar?.startMs) || 0;
      if (next) end = Math.min(Math.max(end, start + 3 * DAY), next - DAY);
      return end;
    } catch (e) { return gameNow() + 5 * DAY; }
  }
  function pace() {
    const t = typeof currentTournament !== 'undefined' ? currentTournament : null;
    if (!t || t.completed) return { g: GROUP.cap, p: PLAYOFF.cap };
    const hourKey = `${t.name}|${Math.floor(gameNow() / 3600000)}|${(t.broadcast?.finished || []).length}`;
    if (paceMemo.key === hourKey) return paceMemo;
    let G = 0, P = 0;
    try { remainingStages(t).forEach(s => { if (s.kind === 'playoff') P += s.count; else G += s.count; }); } catch (e) {}
    const daysLeft = Math.max(1, Math.floor((deadlineOf(t) - sod(gameNow())) / DAY) + 1);
    let g = GROUP.cap, p = PLAYOFF.cap;
    const need = () => Math.ceil(G / g) + Math.ceil(P / p);
    while (need() > daysLeft && (g < 8 || p < 4)) { if (p < 4 && Math.ceil(P / p) >= Math.ceil(G / g)) p++; else if (g < 8) g += 2; else p++; }
    paceMemo = { key: hourKey, g, p, G, P, daysLeft };
    return paceMemo;
  }
  function capOf(kind) { const x = pace(); return kind === 'playoff' ? x.p : x.g; }
  function firstOf(kind) {
    const cap = capOf(kind);
    if (kind === 'playoff') return Math.min(PLAYOFF.first, PLAYOFF.last - (cap - 1) * PLAYOFF.gap);
    return cap > GROUP.cap ? 11 * 60 : GROUP.first;
  }
  window.CS2SeasonPacing = Object.freeze({ pace, capOf, firstOf, deadlineOf });

  function nextSlot(cursor, kind, count, perDay) {
    const cfg = kind === 'playoff' ? PLAYOFF : GROUP;
    const cap = capOf(kind), firstMin = firstOf(kind);
    let ms = Math.max(Number(cursor) || gameNow(), gameNow());
    for (let guard = 0; guard < 400; guard++) {
      const day = sod(ms), first = day + firstMin * 60000, last = day + cfg.last * 60000;
      if (ms < first) ms = first;
      const used = Number(perDay[day] || 0);
      if (ms > last || used + count > cap) {
        ms = day + DAY + firstMin * 60000;
        continue;
      }
      return ms;
    }
    return ms;
  }

  function planUnits(items, cursor, perDay, startingBatch) {
    const units = [];
    const grouped = new Map();
    items.forEach((item, index) => {
      const kind = isPlayoffStage(item.stage) ? 'playoff' : 'group';
      const hasBatch = item.batchId != null && item.batchId !== '' && Number.isFinite(Number(item.batchId)) && Number(item.batchId) > 0;
      const key = kind === 'playoff'
        ? `playoff:${index}`
        : `group:${hasBatch ? item.batchId : `new-${index}`}`;
      if (!grouped.has(key)) grouped.set(key, { kind, items: [] });
      grouped.get(key).items.push(item);
    });
    grouped.forEach(unit => {
      if (unit.kind === 'playoff' && unit.items.length > 1) {
        unit.items.forEach(item => units.push({ kind: 'playoff', items: [item] }));
      } else {
        // Не больше двух параллельных матчей в групповой волне.
        for (let i = 0; i < unit.items.length; i += 2) units.push({ kind: unit.kind, items: unit.items.slice(i, i + 2) });
      }
    });

    let batch = Number(startingBatch) || 1;
    units.forEach(unit => {
      const n = unit.items.length, at = nextSlot(cursor, unit.kind, n, perDay);
      const day = sod(at);
      perDay[day] = (perDay[day] || 0) + n;
      const sharedBatch = batch++;
      unit.items.forEach(item => {
        item.batchId = sharedBatch;
        item.time = at;
        item.v18PlannedTime = at;
        item.gameScheduledAt = at;
        // Never leave a stale `plannedTime` alias behind after a replan.
        if (item.status !== 'live') item.plannedTime = at;
        item.v42ScheduleVersion = 1;
        item.v42LastPlannedTime = at;
      });
      const minGap = unit.kind === 'playoff' ? PLAYOFF.gap : GROUP.gap;
      const gap = Math.max(...unit.items.map(x => slotDuration(x.match)));
      cursor = at + Math.max(minGap, gap) * 60000;
    });
    return { cursor, nextBatch: batch };
  }

  function itemStart(item) {
    return Number(item?.actualStartAt || item?.time || item?.v18PlannedTime || 0);
  }
  function existingUsage(b, omit = new Set()) {
    const per = {}, times = [];
    [...(b?.finished || []), ...(b?.active || []), ...(b?.queue || [])].forEach(item => {
      if (!item || omit.has(item)) return;
      const at = itemStart(item);
      if (!at) return;
      const day = sod(at);
      per[day] = (per[day] || 0) + 1;
      times.push(at);
    });
    return { per, times };
  }

  function replanNewQueueItems(b, items, resetFromNow = false) {
    if (!b || !items?.length) return;
    const omit = new Set(items);
    const used = existingUsage(b, omit);
    const maxExisting = used.times.length ? Math.max(...used.times) : 0;
    const now = gameNow();
    const savedCursor = Number(b.v18ScheduleCursor) || 0;
    // Старые версии могли записать сюда системные часы вместо игровых.
    // Для новой волны используем курсор только если он находится в разумном
    // диапазоне текущего игрового расписания.
    const validSavedCursor = !resetFromNow && savedCursor >= now - DAY && savedCursor <= now + 14 * DAY ? savedCursor : 0;
    let cursor = Math.max(now, maxExisting ? maxExisting + Math.max(GROUP.gap, PLAYOFF.gap) * 60000 : 0, validSavedCursor);
    // v84: между стадиями Major — день отдыха (и окно Pick'Em): первый раунд Stage 2/3
    // и плей-офф Major не начинаются в день окончания предыдущей стадии.
    try {
      const newStage = items.some(x => /Major Stage [23] • R1\b/.test(String(x.stage || '')) || (currentTournament?.isMajor && /Четвертьфинал/.test(String(x.stage || '')) && !(b.finished || []).some(f => /Четвертьфинал/.test(String(f.stage || '')))));
      if (newStage && maxExisting) cursor = Math.max(cursor, sod(maxExisting) + DAY + GROUP.first * 60000);
    } catch (e) {}
    const maxBatch = Math.max(Number(b.nextBatchId) || 1,
      ...[...(b.queue || []), ...(b.active || []), ...(b.finished || [])].map(x => Number(x.batchId) || 0), 1);
    const ordered = items.slice().sort((a, c) =>
      (Number(a.batchId) || 0) - (Number(c.batchId) || 0));
    const result = planUnits(ordered, cursor, used.per, maxBatch);
    b.nextBatchId = Math.max(Number(b.nextBatchId) || 1, result.nextBatch);
    b.v18ScheduleCursor = result.cursor;
    b.scheduleCursorGame = result.cursor;
    const first = (b.queue || []).filter(x => x.status !== 'done').sort((a, c) => Number(a.time) - Number(c.time))[0];
    if (first && currentTournament?.calendar) currentTournament.calendar.nextMatchAt = Number(first.time) || gameNow();
  }

  function repairSavedQueue(b) {
    if (!b || !Array.isArray(b.queue) || !b.queue.length) return;
    const pending = b.queue.filter(x => x && x.status !== 'live' && x.status !== 'done');
    if (!pending.length || pending.every(x => Number(x.v42ScheduleVersion) === 1)) return;
    // Сейвы до v42 получали неправильное расписание: один раз пересобираем
    // только будущую очередь, не трогая уже сыгранные/активные матчи.
    pending.forEach(x => { x.v42ScheduleVersion = 0; });
    replanNewQueueItems(b, pending);
  }

  // Замена глобального v18 fit: существующие слоты не сдвигаются без причины.
  window.v18FitDays = function (b) {
    if (!b || !Array.isArray(b.queue)) return;
    repairSavedQueue(b);
    const pending = b.queue.filter(x => x && x.status !== 'live' && x.status !== 'done');
    // v20 may move the whole queue after a match runs long. Reflow it from the
    // current game clock so shifted matches still respect daily limits and stages.
    const externallyShifted = pending.some(x => Number(x.v42ScheduleVersion) === 1 &&
      Math.abs((Number(x.time) || 0) - (Number(x.v42LastPlannedTime) || 0)) > 60000);
    // A day skip can move the virtual clock beyond saved slots without changing
    // the slot timestamp. Those matches are overdue, not genuinely delayed:
    // rebuild the remaining queue from the current game day and clear stale delay labels.
    const now = gameNow();
    const overdue = pending.some(x => {
      const at = Number(x.time || x.v18PlannedTime || x.v42LastPlannedTime) || 0;
      return at > 0 && at < now - 5 * 60000;
    });
    if (externallyShifted || overdue) {
      pending.forEach(x => {
        x.v42ScheduleVersion = 0;
        // A virtual-day skip is not a real match delay. Clear stale delay
        // markers before writing new future slots so the calendar cannot keep
        // showing "задерживается" for matches that were simply skipped over.
        if (overdue) {
          x.delayedByMs = 0;
          x.v19ShiftedByMs = 0;
          x.delayed = false;
          x.isDelayed = false;
          x.late = false;
        }
      });
      replanNewQueueItems(b, pending, true);
      if (overdue) pending.forEach(x => { x.originalPlannedTime = Number(x.time) || now; x.delayedByMs = 0; });
      return;
    }
    const unplanned = pending.filter(x => Number(x.v42ScheduleVersion) !== 1);
    if (unplanned.length) replanNewQueueItems(b, unplanned);
  };

  // При каждом построении очереди назначаем даты только новым матчам.
  const priorBuildQueue = window.buildBroadcastQueue;
  if (typeof priorBuildQueue === 'function' && !priorBuildQueue.__v42) {
    const wrapped = function (...args) {
      const b = currentTournament?.broadcast;
      const before = new Set([...(b?.queue || []), ...(b?.active || []), ...(b?.finished || [])]);
      const result = priorBuildQueue.apply(this, args);
      try {
        const after = currentTournament?.broadcast;
        if (!after) return result;
        const added = (after.queue || []).filter(x => x && !before.has(x));
        if (added.length) replanNewQueueItems(after, added);
        repairSavedQueue(after);
      } catch (e) { console.warn('[v42] schedule queue', e); }
      try { if (typeof renderBroadcastPanel === 'function') renderBroadcastPanel(); } catch (e) {}
      return result;
    };
    wrapped.__v42 = true;
    window.buildBroadcastQueue = wrapped;
    try { buildBroadcastQueue = wrapped; } catch (e) {}
  }

  // ---- Оценка оставшейся длительности всего турнира, включая ещё не созданный плей-офф ----
  const pendingRound = round => Array.isArray(round) ? round.filter(m => m && !m.winner).length : 0;
  function roundStage(roundIndex, total) {
    const fromEnd = total - 1 - roundIndex;
    if (fromEnd === 0) return 'Финал';
    if (fromEnd === 1) return 'Полуфинал';
    if (fromEnd === 2) return 'Четвертьфинал';
    if (fromEnd === 3) return '1/8 финала';
    return `Раунд ${roundIndex + 1}`;
  }
  function bracketRounds(t) {
    const stages = [];
    const up = t.upperRounds || [], low = t.lowerRounds || [];
    const addRound = (rounds, index, kind) => {
      const n = pendingRound(rounds[index]);
      if (n) stages.push({ count: n, kind });
    };
    if (t.hasLowerBracket) {
      // Тот же порядок, что и getBroadcastPlayableMatches() в основном движке.
      // Lower bracket не должен ошибочно прогнозироваться целиком после upper bracket.
      const sequence = (Number(t.size) === 16) ? [
        { t: 'U', r: 0 }, { t: 'L', r: 0 }, { t: 'L', r: 1 }, { t: 'U', r: 1 },
        { t: 'L', r: 2 }, { t: 'L', r: 3 }, { t: 'U', r: 2 }, { t: 'L', r: 4 },
        { t: 'U', r: 3 }, { t: 'L', r: 5 }
      ] : [
        { t: 'U', r: 0 }, { t: 'L', r: 0 }, { t: 'L', r: 1 },
        { t: 'U', r: 1 }, { t: 'L', r: 2 }, { t: 'U', r: 2 }, { t: 'L', r: 3 }
      ];
      sequence.forEach(step => {
        const rounds = step.t === 'U' ? up : low;
        const kind = step.t === 'U' && isPlayoffStage(roundStage(step.r, up.length)) ? 'playoff' : 'group';
        addRound(rounds, step.r, kind);
      });
      if (t.grandFinal && !t.grandFinal.winner) stages.push({ count: 1, kind: 'playoff' });
      return stages;
    }
    // В single elimination матч за третье место проводится после полуфиналов,
    // но до финала — повторяем этот порядок при расчёте даты окончания.
    for (let i = 0; i < Math.max(0, up.length - 1); i++) {
      addRound(up, i, isPlayoffStage(roundStage(i, up.length)) ? 'playoff' : 'group');
    }
    if (t.bronzeMatch && !t.bronzeMatch.winner) stages.push({ count: 1, kind: 'playoff' });
    if (up.length) addRound(up, up.length - 1, 'playoff');
    return stages;
  }
  function expectedSwissRounds(teamCount) {
    const n = Math.max(2, Number(teamCount) || 16);
    if (n >= 14) return EXPECTED_SWISS;
    if (n >= 7) return [4, 4, 4, 2, 1];
    return Array.from({ length: 5 }, (_, i) => {
      const divisor = 2 ** Math.min(i + 1, 3);
      return Math.max(1, Math.ceil(n / divisor));
    });
  }
  function swissStages(swiss) {
    const rounds = swiss?.rounds || [], current = Math.max(1, Number(swiss?.currentRound) || rounds.length || 1);
    const expected = expectedSwissRounds(swiss?.teams?.length);
    const out = [];
    for (let r = current - 1; r < 5; r++) {
      const actual = rounds[r];
      const count = actual ? pendingRound(actual) : (expected[r] || 0);
      if (count) out.push({ count, kind: 'group' });
    }
    return out;
  }
  function majorSwissStages(t) {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const st = t.majorStages?.[i];
      if (st?.completed) continue;
      // Каждая стадия Major состоит из 16 команд: 8 прошедших дальше + 8 приглашённых.
      const expected = expectedSwissRounds(st?.teams?.length || 16);
      if (!st) {
        expected.forEach(n => out.push({ count: n, kind: 'group' }));
        continue;
      }
      const current = Math.max(1, Number(st.currentRound) || 1);
      for (let r = current - 1; r < 5; r++) {
        const count = st.rounds?.[r] ? pendingRound(st.rounds[r]) : (expected[r] || 0);
        if (count) out.push({ count, kind: 'group' });
      }
    }
    return out;
  }
  function gslStages(gsl) {
    const groups = gsl?.groups || [];
    const keys = [['opening1', 'opening2'], ['winners', 'losers'], ['decider']];
    const out = [];
    keys.forEach(row => {
      const count = groups.reduce((sum, g) => sum + row.reduce((n, key) => n + (g.matches?.[key] && !g.matches[key].winner ? 1 : 0), 0), 0);
      if (count) out.push({ count, kind: 'group' });
    });
    return out;
  }
  function bountyStages(bounty) {
    const out = [];
    const a = pendingRound(bounty?.stage1), b = pendingRound(bounty?.stage2);
    if (a) out.push({ count: a, kind: 'group' });
    if (b) out.push({ count: b, kind: 'group' });
    return out;
  }
  function remainingStages(t) {
    if (!t) return [];
    if (t.isMajor && Array.isArray(t.majorStages)) {
      const majorPending = majorSwissStages(t);
      if (majorPending.length) return majorPending.concat(bracketRounds(t).length ? bracketRounds(t) : [
        { count: 4, kind: 'playoff' }, { count: 2, kind: 'playoff' }, { count: 1, kind: 'playoff' }
      ]);
      return bracketRounds(t);
    }
    if (t.formatChoice === 'swiss' && t.swiss) {
      return swissStages(t.swiss).concat(bracketRounds(t).length ? bracketRounds(t) : [
        { count: 4, kind: 'playoff' }, { count: 2, kind: 'playoff' }, { count: 1, kind: 'playoff' }
      ]);
    }
    if (t.formatChoice === 'gsl' && t.gsl) {
      const playoffs = bracketRounds(t);
      return gslStages(t.gsl).concat(playoffs.length ? playoffs : [
        { count: 4, kind: 'playoff' }, { count: 2, kind: 'playoff' }, { count: 1, kind: 'playoff' }
      ]);
    }
    if (t.formatChoice === 'bounty' && t.bounty) {
      const playoffs = bracketRounds(t);
      return bountyStages(t.bounty).concat(playoffs.length ? playoffs : [
        { count: 4, kind: 'playoff' }, { count: 2, kind: 'playoff' }, { count: 1, kind: 'playoff' }
      ]);
    }
    return bracketRounds(t);
  }

  function simulateStagePlan(stages, startAt) {
    let cursor = Math.max(Number(startAt) || gameNow(), gameNow());
    const perDay = {};
    for (const stage of stages) {
      const kind = stage.kind === 'playoff' ? 'playoff' : 'group';
      const cfg = kind === 'playoff' ? PLAYOFF : GROUP;
      let remaining = Math.max(0, Number(stage.count) || 0);
      while (remaining > 0) {
        const n = kind === 'playoff' ? 1 : Math.min(2, remaining);
        const at = nextSlot(cursor, kind, n, perDay);
        perDay[sod(at)] = (perDay[sod(at)] || 0) + n;
        remaining -= n;
        cursor = at + (kind === 'playoff' ? PLAYOFF.gap : GROUP.gap) * 60000;
      }
    }
    return cursor ? cursor + 45 * 60000 : 0;
  }
  function forecastEnd(t) {
    if (!t || t.completed) return 0;
    const stages = remainingStages(t);
    if (!stages.length) {
      const c = Number(t.calendar?.plannedStartMs) || gameNow();
      return Math.max(c + DAY, gameNow() + DAY);
    }
    return simulateStagePlan(stages, gameNow());
  }
  window.v42TournamentForecastEnd = forecastEnd;

  function updateTournamentWindow() {
    const t = currentTournament;
    if (!t || t.completed) return;
    const forecast = forecastEnd(t);
    if (!forecast) return;
    t.calendar = t.calendar || {};
    t.calendar.expectedEndMs = forecast;
    const step = (seasonState?.seasonSchedule || [])[Number(t.tourIndex ?? seasonState?.tournamentIndex) || 1];
    if (step?.calendar && Number(step.calendar.startMs)) {
      const start = Number(t.calendar.warmupStartAt || t.calendar.plannedStartMs || step.calendar.startMs);
      const days = Math.max(Number(step.calendar.durationDays) || 1, Math.ceil((forecast - start) / DAY));
      step.calendar.durationDays = days;
      step.calendar.endMs = Math.max(Number(step.calendar.endMs) || 0, forecast);
      t.calendar.expectedDurationDays = days;
    }
    t.calendar.expectedEndLabel = new Date(forecast).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
  }

  // Calendar preview: current round is visible immediately, even before TV broadcast starts.
  function calendarMatches() {
    const t = currentTournament;
    if (!t || t.completed) return [];
    const b = t.broadcast || {};
    const out = [], seen = new Set();
    const add = (item, at, status, preview = false) => {
      const m = item?.match || item;
      if (!m || seen.has(m)) return;
      seen.add(m);
      out.push({ at: Number(at) || gameNow(), stage: item?.stage || m.stage || 'Матч', a: m.t1 || 'TBD', b: m.t2 || 'TBD', status, preview });
    };
    [...(b.finished || [])].forEach(x => add(x, x.actualStartAt || x.time || x.doneAt, 'done'));
    [...(b.active || [])].forEach(x => add(x, x.actualStartAt || x.time, 'live'));
    [...(b.queue || [])].forEach(x => add(x, x.time || x.v18PlannedTime, 'scheduled'));
    let playable = [];
    try { playable = typeof getBroadcastPlayableMatches === 'function' ? getBroadcastPlayableMatches() : []; } catch (e) {}
    const missing = playable.filter(x => x?.match && !seen.has(x.match));
    if (missing.length) {
      let cursor = Math.max(gameNow(), Number(t.calendar?.autoBroadcastAt) || gameNow(),
        ...out.map(x => x.at + GROUP.gap * 60000));
      // Уже сыгранные и стоящие в очереди матчи учитываются в дневном лимите,
      // чтобы предварительные слоты не добавляли сверх шести групповых или двух playoff-серий.
      const per = {};
      out.forEach(x => { const day = sod(x.at); per[day] = (per[day] || 0) + 1; });
      const units = [];
      for (let i = 0; i < missing.length; ) {
        const kind = isPlayoffStage(missing[i].stage) ? 'playoff' : 'group';
        const n = kind === 'playoff' ? 1 : Math.min(2, missing.length - i);
        const batch = missing.slice(i, i + n);
        if (kind === 'playoff' && batch.some(x => !isPlayoffStage(x.stage))) batch.splice(1);
        units.push({ kind, batch }); i += batch.length;
      }
      units.forEach(unit => {
        const at = nextSlot(cursor, unit.kind, unit.batch.length, per);
        per[sod(at)] = (per[sod(at)] || 0) + unit.batch.length;
        unit.batch.forEach(x => add(x, at, 'scheduled', true));
        cursor = at + (unit.kind === 'playoff' ? Math.max(PLAYOFF.gap, ...unit.batch.map(x => slotDuration(x.match))) : Math.max(GROUP.gap, ...unit.batch.map(x => slotDuration(x.match)))) * 60000;
      });
    }
    return out.sort((a, b) => Number(a.at) - Number(b.at));
  }
  window.v42CalendarMatches = calendarMatches;

  // Hook into the game clock, tournament creation, and match completion to refresh the estimate.
  const priorRender = window.v15RenderCalendar;
  if (typeof priorRender === 'function' && !priorRender.__v42) {
    const wrapped = function (...args) {
      const result = priorRender.apply(this, args);
      try { updateTournamentWindow(); } catch (e) { console.warn('[v42] calendar forecast', e); }
      return result;
    };
    wrapped.__v42 = true;
    window.v15RenderCalendar = wrapped;
  }
  const priorCreate = window.createTournament;
  if (typeof priorCreate === 'function' && !priorCreate.__v42) {
    const wrapped = function (...args) {
      const result = priorCreate.apply(this, args);
      try {
        if (currentTournament && !currentTournament.completed) {
          currentTournament.calendar = currentTournament.calendar || {};
          currentTournament.calendar.plannedStartMs = Number(currentTournament.calendar.plannedStartMs) || gameNow();
          updateTournamentWindow();
          if (typeof window.v15RenderCalendar === 'function') window.v15RenderCalendar();
        }
      } catch (e) { console.warn('[v42] create refresh', e); }
      return result;
    };
    wrapped.__v42 = true;
    window.createTournament = wrapped;
    try { createTournament = wrapped; } catch (e) {}
  }

  const priorStartBroadcast = window.startTVBroadcastMode;
  if (typeof priorStartBroadcast === 'function' && !priorStartBroadcast.__v42) {
    const wrapped = function (...args) {
      const result = priorStartBroadcast.apply(this, args);
      try { repairSavedQueue(currentTournament?.broadcast); updateTournamentWindow(); } catch (e) {}
      try { if (typeof v15RenderCalendar === 'function') v15RenderCalendar(); } catch (e) {}
      return result;
    };
    wrapped.__v42 = true;
    window.startTVBroadcastMode = wrapped;
    try { startTVBroadcastMode = wrapped; } catch (e) {}
  }

  // Older saves get their pending queue repaired once at boot.
  try { repairSavedQueue(currentTournament?.broadcast); updateTournamentWindow(); } catch (e) {}
  window.CS2SimulationTasks = window.CS2SimulationTasks || {};
  window.CS2SimulationTasks.v42QueueWindow = () => {
    try {
      if (currentTournament && !currentTournament.completed) updateTournamentWindow();
      // v22 updates its calendar UI independently; the selected date remains untouched.
    } catch (e) {}
  };
  console.info('[v42] calendar prediction + stage-aware match schedule enabled');
  // Пакетный пропуск дней использует ту же дневную вместимость.
  window.v18DayCap = list => {
    const playoff = Array.isArray(list) && list.length && list.every(q => isPlayoffStage(q.stage || ''));
    return playoff ? capOf('playoff') : capOf('group');
  };
})();
