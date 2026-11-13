
(() => {
  'use strict';

  const V18_WARMUP_MIN = 15;          // после создания сетки до первого матча
  const V18_BO1_SLOT_MIN = 105;       // плановый интервал между слотами BO1
  const V18_BO3_SLOT_MIN = 165;       // плановый интервал между слотами BO3
  const V18_BO5_SLOT_MIN = 240;       // плановый интервал между слотами BO5
  const V18_DELAY_TOLERANCE_MIN = 0;  // матч стартует сразу, если его слот уже прошёл

  const nowGame = () => {
    try {
      if (typeof v15EnsureCalendar === 'function') return Number(v15EnsureCalendar().currentMs) || Date.now();
    } catch (e) {}
    try { return Number(seasonState?.calendar?.currentMs) || Date.now(); } catch (e) { return Date.now(); }
  };
  const cal = () => {
    try {
      if (typeof v15EnsureCalendar === 'function') return v15EnsureCalendar();
    } catch (e) {}
    if (!seasonState.calendar || typeof seasonState.calendar !== 'object') seasonState.calendar = {};
    return seasonState.calendar;
  };
  const isCalendarPaused = () => !!cal().paused;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function modeSlotMin(match) {
    const mode = typeof getBroadcastMode === 'function' ? getBroadcastMode(match) : 'BO3';
    if (mode === 'BO1') return V18_BO1_SLOT_MIN;
    if (mode === 'BO5') return V18_BO5_SLOT_MIN;
    return V18_BO3_SLOT_MIN;
  }

  function ensureTournamentWarmup(t) {
    if (!t) return;
    const c = cal();
    if (!t.calendar || typeof t.calendar !== 'object') {
      t.calendar = {
        plannedStartMs: nowGame(),
        nextMatchAt: 0,
        tournamentDay: 0,
        matchSlot: 0,
        durationDays: 2,
        startTime: '15:30'
      };
    }
    if (!Number(t.calendar.warmupStartAt)) t.calendar.warmupStartAt = nowGame();
    if (!Number(t.calendar.autoBroadcastAt)) {
      t.calendar.autoBroadcastAt = Math.max(nowGame(), Number(t.calendar.warmupStartAt) || nowGame()) + V18_WARMUP_MIN * 60000;
    }
    if (!Number(t.calendar.nextMatchAt) || Number(t.calendar.nextMatchAt) < Number(t.calendar.autoBroadcastAt)) {
      t.calendar.nextMatchAt = Number(t.calendar.autoBroadcastAt);
    }
    if (t.calendar.broadcastAutoStartPending === undefined) t.calendar.broadcastAutoStartPending = true;
    if (!t.calendar.gameScheduleVersion) t.calendar.gameScheduleVersion = 18;
    if (!t.calendar.firstMatchPlannedAt) t.calendar.firstMatchPlannedAt = Number(t.calendar.autoBroadcastAt);
    if (!Number.isFinite(Number(t.calendar.actualStartAt))) t.calendar.actualStartAt = 0;
    c.nextMatchAt = Number(t.calendar.nextMatchAt) || c.nextMatchAt;
  }

  function tournamentIsActive() {
    try { return !!(typeof currentTournament !== 'undefined' && currentTournament && !currentTournament.completed); }
    catch (e) { return false; }
  }

  function broadcastIsRunning() {
    try { return !!currentTournament?.broadcast?.running; } catch (e) { return false; }
  }

  function setTourStatus(text) {
    const el = document.getElementById('tour-status');
    if (el) el.innerText = text;
  }

  function renderWarmupStatus() {
    if (!tournamentIsActive()) return;
    const t = currentTournament;
    const c = cal();
    ensureTournamentWarmup(t);
    if (!broadcastIsRunning() && t.calendar.broadcastAutoStartPending) {
      const delta = Number(t.calendar.autoBroadcastAt) - Number(c.currentMs || nowGame());
      const total = Math.max(0, Math.ceil(delta / 60000));
      const h = Math.floor(total / 60);
      const m = total % 60;
      const left = h > 0 ? `${h}ч ${m}м` : `${m}м`;
      setTourStatus(`⏳ Сетка готова • первый матч через ${left}`);
    }
  }

  // 1) После генерации турнира НЕ стартуем эфир мгновенно.
  CS2.patch('createTournament', priorCreate => function(...args) {
      const result = priorCreate.apply(this, args);
      if (currentTournament && !currentTournament.completed) {
        ensureTournamentWarmup(currentTournament);
        currentTournament.broadcast = currentTournament.broadcast || {
          running:false, paused:false, queue:[], active:[], finished:[], clock:0, timerIds:[]
        };
        currentTournament.broadcast.v18GameSchedule = true;
        currentTournament.broadcast.v18ScheduleCursor = Number(currentTournament.calendar.autoBroadcastAt);
        currentTournament.broadcast.v18AutoStartPending = true;
        setTourStatus(`⏳ Сетка готова • разминка 15 игровых минут`);
        try { if (typeof v15RenderCalendar === 'function') v15RenderCalendar(); } catch (e) {}
        try { saveSeasonState(); } catch (e) {}
      }
      return result;
    }, { id: '__v18Wrapped' });

  // Раскладка матчей по игровым дням (одно место; вызывается при сборке очереди и после любых сдвигов).
  // Как на IEM Kraków 2026: групповой этап — до 6 серий в день (3 окна по 2 параллельных матча) с 13:00;
  // плей-офф (с четвертьфинала) — 2 серии в день по очереди с 16:00. Позже 21:00 серия не начинается — переносится на следующий день.
  const V18_DAY = { groupFirstMin: 13 * 60, playoffFirstMin: 16 * 60, lastStartMin: 21 * 60, groupCap: 6, playoffCap: 2 };
  const V18_PLAYOFF_STAGE = /Четвертьфинал|Полуфинал|Финал|Гранд-финал|Champions Stage/; // «1/8 финала» и ранние раунды нижней сетки — как группы
  function v18FitDays(b, startAt) {
    if (!b || !Array.isArray(b.queue)) return;
    if (startAt == null) startAt = Number(currentTournament?.calendar?.autoBroadcastAt) || 0;
    const items = b.queue.filter(q => q.status !== 'live' && q.status !== 'done')
      .sort((x, y) => ((Number(x.time) || Infinity) - (Number(y.time) || Infinity)) || ((Number(x.batchId) || 0) - (Number(y.batchId) || 0)));
    if (!items.length) return;
    const groupMode = !items.every(q => V18_PLAYOFF_STAGE.test(q.stage || ''));
    const cap = groupMode ? V18_DAY.groupCap : V18_DAY.playoffCap, firstMin = groupMode ? V18_DAY.groupFirstMin : V18_DAY.playoffFirstMin;
    const dayOf = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const per = {};
    [...(b.finished || []), ...(b.active || [])].forEach(q => { const t = Number(q.actualStartAt || q.time); if (t) per[dayOf(t)] = (per[dayOf(t)] || 0) + 1; });
    const fit = (ms, n) => {
      for (let k = 0; k < 120; k++) {
        const d0 = dayOf(ms);
        if (ms < d0 + firstMin * 60000) ms = d0 + firstMin * 60000;
        if (ms > d0 + V18_DAY.lastStartMin * 60000 || (per[d0] || 0) + n > cap) { ms = d0 + 86400000; continue; }
        return ms;
      }
      return ms;
    };
    let cursor = Math.max(nowGame(), Number(startAt) || 0);
    (b.active || []).forEach(q => { cursor = Math.max(cursor, (Number(q.actualStartAt || q.time) || cursor) + modeSlotMin(q.match) * 60000); });
    // группы: пары параллельных матчей (batchId); плей-офф — по одной серии в окне
    const batches = [];
    items.forEach(q => { const last = batches[batches.length - 1]; if (groupMode && last && last[0].batchId === q.batchId && last.length < 2) last.push(q); else batches.push([q]); });
    const base = Math.min(...items.map(q => Number(q.batchId) || 1));
    batches.forEach((bt, i) => {
      const n = bt.length, want = fit(cursor, n), own = Number(bt[0].time) || 0;
      // сегодняшнее время сохраняем (и наступившее — матч стартует сейчас, а не уезжает на «следующие 10 минут»);
      // перенос, накопившийся с прошлых дней, сбрасываем
      const now = nowGame(), keep = own && dayOf(own) === dayOf(want) && (own > want || (own <= now && !(b.active || []).length));
      const slot = keep ? (own > want ? fit(own, n) : own) : want;
      bt.forEach(q => { q.batchId = base + i; q.time = slot; q.v18PlannedTime = slot; q.gameScheduledAt = slot; });
      per[dayOf(slot)] = (per[dayOf(slot)] || 0) + n;
      cursor = slot + Math.max(...bt.map(q => modeSlotMin(q.match))) * 60000;
    });
    b.nextBatchId = Math.max(Number(b.nextBatchId) || 1, base + batches.length);
    b.v18ScheduleCursor = cursor;
    b.scheduleCursorGame = cursor;
    if (currentTournament?.calendar) currentTournament.calendar.nextMatchAt = Number(batches[0][0].time) || currentTournament.calendar.nextMatchAt;
  }
  window.v18FitDays = v18FitDays;
  // прогноз времени для матчей, которых ещё нет в очереди эфира: те же правила дня, продолжая после очереди
  window.v18Forecast = () => {
    const b = currentTournament?.broadcast, out = new Map(); if (!currentTournament || currentTournament.completed) return out;
    const open = (window.V35Bets?.open?.() || []), inQ = new Set((b?.queue || []).map(q => q.match)), act = new Set((b?.active || []).map(q => q.match));
    const rest = open.filter(x => !inQ.has(x.m) && !act.has(x.m)); if (!rest.length) return out;
    const groupMode = !rest.every(x => V18_PLAYOFF_STAGE.test(x.stage || '')), cap = groupMode ? V18_DAY.groupCap : V18_DAY.playoffCap, firstMin = groupMode ? V18_DAY.groupFirstMin : V18_DAY.playoffFirstMin;
    const dayOf = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }, per = {};
    [...(b?.finished || []), ...(b?.active || []), ...(b?.queue || [])].forEach(q => { const t = Number(q.time || q.actualStartAt); if (t) per[dayOf(t)] = (per[dayOf(t)] || 0) + 1; });
    let cursor = Math.max(nowGame(), Number(b?.v18ScheduleCursor) || 0);
    for (let i = 0; i < rest.length; i += groupMode ? 2 : 1) {
      const n = groupMode ? Math.min(2, rest.length - i) : 1; let ms = cursor;
      for (let k = 0; k < 120; k++) { const d0 = dayOf(ms); if (ms < d0 + firstMin * 60000) ms = d0 + firstMin * 60000; if (ms > d0 + V18_DAY.lastStartMin * 60000 || (per[d0] || 0) + n > cap) { ms = d0 + 86400000; continue; } break; }
      per[dayOf(ms)] = (per[dayOf(ms)] || 0) + n;
      for (let j = 0; j < n; j++) out.set(rest[i + j].m, ms);
      cursor = ms + modeSlotMin(rest[i].m) * 60000;
    }
    return out;
  };
  window.v18DayCap = list => (list.length && list.every(q => V18_PLAYOFF_STAGE.test(q.stage || '')) ? V18_DAY.playoffCap : V18_DAY.groupCap);

  // 2) Очередь эфира переводим на ИГРОВОЕ время, а не Date.now().
  CS2.patch('buildBroadcastQueue', priorBuildQueue => function(...args) {
      const b = currentTournament?.broadcast;
      const result = priorBuildQueue.apply(this, args);
      if (!b || !currentTournament) return result;
      ensureTournamentWarmup(currentTournament);
      b.v18GameSchedule = true;
      if (!Number(b.v18ScheduleCursor)) {
        b.v18ScheduleCursor = Number(currentTournament.calendar.autoBroadcastAt) || nowGame();
      }
      const queue = Array.isArray(b.queue) ? b.queue : [];
      const start = Number(currentTournament.calendar?.autoBroadcastAt) || nowGame(); // не раньше конца разминки
      // новые матчи встают в конец очереди; время по дням назначает v18FitDays
      queue.filter(item => !Number(item.v18PlannedTime)).forEach(item => { item.time = 0; item.v18ScheduleVersion = 18; });
      v18FitDays(b, start);
      return result;
    }, { id: '__v18Wrapped' });

  // 3) Следующий слот не стартует раньше назначенного игрового времени.
  // Если слот уже прошёл из-за затянувшейся серии, ВСЕ будущие матчи сдвигаются вперёд на задержку.
  CS2.patch('scheduleNextBroadcastBatch', priorScheduleBatch => function(...args) {
      const b = currentTournament?.broadcast;
      if (!b || !b.running) return priorScheduleBatch.apply(this, args);
      if (b.paused || isCalendarPaused()) {
        try { renderBroadcastPanel(); } catch (e) {}
        return;
      }
      try { buildBroadcastQueue(); } catch (e) { console.warn('[v18] queue build', e); }
      if (Array.isArray(b.active) && b.active.length) return;
      const queue = Array.isArray(b.queue) ? b.queue : [];
      if (!queue.length) {
        try { renderBroadcastPanel(); } catch (e) {}
        return priorScheduleBatch.apply(this, args);
      }
      const ordered = queue.slice().sort((a,b2) => Number(a.time||0) - Number(b2.time||0));
      const first = ordered[0];
      const gameNow = nowGame();
      const planned = Number(first.time) || gameNow;
      if (planned > gameNow + V18_DELAY_TOLERANCE_MIN*60000) {
        try { renderBroadcastPanel(); } catch (e) {}
        return;
      }
      const delay = Math.max(0, gameNow - planned);
      if (delay > 0) {
        queue.forEach(item => {
          if (Number(item.time) >= planned) {
            item.time = Number(item.time) + delay;
            item.v18ShiftedByMs = (Number(item.v18ShiftedByMs)||0) + delay;
          }
        });
      }
      const result = priorScheduleBatch.apply(this, args);
      renderWarmupStatus();
      return result;
    }, { id: '__v18Wrapped' });

  // 4) При запуске матча показываем реальное игровое время старта и фиксируем задержку.
  CS2.patch('launchBroadcastMatch', priorLaunch => function(item, ...args) {
      const gameNow = nowGame();
      if (item) {
        item.plannedTime = Number(item.v18PlannedTime || item.time || gameNow);
        item.actualStartAt = gameNow;
        item.delayedByMs = Math.max(0, gameNow - item.plannedTime);
        // Сама строка расписания теперь показывает ФАКТИЧЕСКОЕ игровое время старта.
        item.time = gameNow;
        if (currentTournament?.calendar) currentTournament.calendar.lastActualMatchStartAt = gameNow;
      }
      const result = priorLaunch.apply(this, [item, ...args]);
      try { renderBroadcastPanel(); } catch (e) {}
      return result;
    }, { id: '__v18Wrapped' });

  // 5) Календарная пауза = полная пауза матчей. Таймеры эфира больше не живут отдельно от календаря.
  CS2.patch('toggleGameCalendarPause', priorToggleCalendarPause => function(...args) {
      priorToggleCalendarPause.apply(this, args);
      const paused = isCalendarPaused();
      const b = currentTournament?.broadcast;
      if (b?.running) {
        if (paused && !b.paused) {
          if (typeof toggleTournamentBroadcastPause === 'function') toggleTournamentBroadcastPause();
        } else if (!paused && b.paused) {
          if (typeof toggleTournamentBroadcastPause === 'function') toggleTournamentBroadcastPause();
        }
      }
      try { v15RenderCalendar(); } catch (e) {}
      renderWarmupStatus();
    }, { id: '__v18Wrapped' });

  // 6) Автоматический старт эфира через 15 игровых минут после генерации сетки.
  function v18AutoStartBroadcastIfDue() {
    if (!tournamentIsActive() || broadcastIsRunning()) return false;
    const t = currentTournament;
    ensureTournamentWarmup(t);
    if (!t.calendar.broadcastAutoStartPending) return false;
    if (isCalendarPaused()) return false;
    const cNow = nowGame();
    if (cNow < Number(t.calendar.autoBroadcastAt)) {
      renderWarmupStatus();
      return false;
    }
    t.calendar.broadcastAutoStartPending = false;
    t.calendar.actualStartAt = cNow;
    try {
      if (typeof startTVBroadcastMode === 'function') startTVBroadcastMode();
      if (t.broadcast) {
        t.broadcast.v18AutoStartPending = false;
        t.broadcast.v18GameSchedule = true;
        t.broadcast.v18ScheduleCursor = cNow;
      }
      setTourStatus('🔴 Турнирный эфир автоматически запущен • по 2 матча одновременно');
      try { saveSeasonState(); } catch (e) {}
      try { v15RenderCalendar(); } catch (e) {}
      return true;
    } catch (e) {
      console.error('[v18] auto broadcast start failed', e);
      t.calendar.broadcastAutoStartPending = true;
      setTourStatus(`⚠️ Не удалось запустить эфир: ${e?.message || 'ошибка'}`);
      return false;
    }
  }

  // Ручной запуск эфира отменяет отложенный автозапуск.
  CS2.patch('startTVBroadcastMode', priorStart => function(...args) {
      if (currentTournament?.calendar) {
        currentTournament.calendar.broadcastAutoStartPending = false;
        // Ручная кнопка «Запустить эфир» должна запускать сразу, не ждать 15-минутную разминку.
        currentTournament.calendar.autoBroadcastAt = nowGame();
      }
      const result = priorStart.apply(this, args);
      if (currentTournament?.broadcast && isCalendarPaused() && !currentTournament.broadcast.paused) {
        try { toggleTournamentBroadcastPause(); } catch (e) {}
      }
      return result;
    }, { id: '__v18Wrapped' });

  // Остановка эфира должна реально выключать автозапуск, чтобы Stop не запускал эфир обратно.
  CS2.patch('stopTournamentBroadcast', priorStop => function(...args) {
      if (currentTournament?.calendar) currentTournament.calendar.broadcastAutoStartPending = false;
      return priorStop.apply(this, args);
    }, { id: '__v18Wrapped' });


  // 8) Render календаря: для активного турнира показываем разминку/следующий слот в игровом времени.
  CS2.patch('v15RenderCalendar', priorRenderCalendar => function(...args) {
      const result = priorRenderCalendar.apply(this, args);
      try {
        const t = currentTournament;
        const box = document.getElementById('calendar-next-event');
        if (t && !t.completed && box) {
          ensureTournamentWarmup(t);
          const cNow = nowGame();
          if (t.calendar.broadcastAutoStartPending && !t.broadcast?.running) {
            const delta = Math.max(0, Number(t.calendar.autoBroadcastAt) - cNow);
            const mins = Math.ceil(delta/60000);
            box.innerHTML = `🏆 <b>${esc(t.name)}</b><br>Сетка сформирована • первый матч в <b>${v15FormatDateTime(Number(t.calendar.autoBroadcastAt))}</b> • через <b>${mins}м</b><br><span style="color:var(--text-muted);">Разминка перед первым матчем: ${V18_WARMUP_MIN} игровых минут</span>`;
          } else if (t.broadcast?.running) {
            const b = t.broadcast;
            const active = (b.active||[]).length;
            const future = (b.queue||[]).filter(x=>Number(x.time)>cNow).sort((a,b2)=>Number(a.time)-Number(b2.time));
            const next = future[0];
            const label = next ? `Следующий слот: <b>${v15FormatDateTime(Number(next.time))}</b> • через ${Math.max(0,Math.ceil((Number(next.time)-cNow)/60000))}м` : (active ? 'Все запланированные слоты текущего этапа уже выданы' : 'Ждём следующую игру');
            box.innerHTML = `🏆 <b>${esc(t.name)}</b><br>${label}<br><span style="color:var(--text-muted);">Сейчас в эфире: ${active} • расписание сдвигается, если серия затянулась</span>`;
          }
        }
      } catch (e) {}
      return result;
    }, { id: '__v18Wrapped' });

  // 9) Рендер расписания: game-time + индикатор задержки.
  CS2.patch('renderBroadcastPanel', priorRenderBroadcast => function(...args) {
      const result = priorRenderBroadcast.apply(this, args);
      try {
        const b = currentTournament?.broadcast;
        const schedule = document.getElementById('broadcast-schedule-list');
        if (!b || !schedule) return result;
        schedule.querySelectorAll('.schedule-row[data-schedule-id]').forEach(row => {
          const id = row.dataset.scheduleId;
          const item = [...(b.active||[]), ...(b.queue||[]), ...(b.finished||[])].find(x => x.id === id);
          if (!item) return;
          const timeEl = row.querySelector('.schedule-time');
          if (timeEl && item.status !== 'done') {
            const planned = Number(item.plannedTime || item.v18PlannedTime || item.time || 0);
            const actual = Number(item.actualStartAt || 0);
            if (item.status === 'live' && actual) {
              timeEl.textContent = new Date(actual).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
            } else if (planned) {
              timeEl.textContent = new Date(planned).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
            }
          }
          if (item.delayedByMs > 0 && item.status !== 'done') {
            const status = row.querySelector('.schedule-status');
            if (status && !status.textContent.includes('+' )) {
              const mins = Math.round(item.delayedByMs/60000);
              status.innerHTML += ` <span style="color:var(--gold);">(+${mins}м)</span>`;
            }
          }
        });
      } catch (e) {}
      return result;
    }, { id: '__v18Wrapped' });

  // 10) The shared v63 dispatcher owns recurring Tier-1 broadcast maintenance.
  window.CS2SimulationTasks = window.CS2SimulationTasks || {};
  window.CS2SimulationTasks.v18Broadcast = () => {
    try {
      if (!tournamentIsActive()) return;
      if (v18AutoStartBroadcastIfDue()) return;
      const b = currentTournament?.broadcast;
      // Recovery guard: do not let a stopped, non-manual broadcast strand pending matches.
      if ((!b || !b.running) && !b?.manualStop && !isCalendarPaused() && !currentTournament.calendar?.broadcastAutoStartPending
          && typeof isStepSimRunning !== 'undefined' && !isStepSimRunning && !isFastSimRunning
          && typeof getBroadcastPlayableMatches === 'function' && getBroadcastPlayableMatches().length && typeof startTVBroadcastMode === 'function') {
        console.info('[v18] эфир турнира был остановлен — запускаю эфир снова');
        startTVBroadcastMode();
        return;
      }
      if (b?.running && isCalendarPaused()) {
        if (!b.paused && typeof toggleTournamentBroadcastPause === 'function') toggleTournamentBroadcastPause();
        return;
      }
      if (b?.running && !b.paused && !isCalendarPaused() && (!b.active || b.active.length === 0)) scheduleNextBroadcastBatch();
      renderWarmupStatus();
    } catch (e) {}
  };
  window.CS2SimulationTasks.v18Cleanup = () => {
    try {
      if (currentTournament?.completed) {
        currentTournament.calendar = currentTournament.calendar || {};
        currentTournament.calendar.broadcastAutoStartPending = false;
      }
    } catch (e) {}
  };

  setTimeout(() => {
    try {
      if (currentTournament && !currentTournament.completed) {
        ensureTournamentWarmup(currentTournament);
        if (currentTournament.broadcast?.running && isCalendarPaused() && !currentTournament.broadcast.paused) {
          toggleTournamentBroadcastPause();
        }
        v18AutoStartBroadcastIfDue();
        if (!currentTournament.broadcast?.running) renderWarmupStatus();
      }
    } catch (e) {}
  }, 300);
})();
