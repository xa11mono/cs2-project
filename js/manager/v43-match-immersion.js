/* v43 — матчевый эфир, осмысленные тайм-ауты и редкие технические паузы.
   Работает поверх текущей пошаговой симуляции v34; совместим с сохранениями v41/v42. */
(() => {
  'use strict';
  const H = window.HS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const hash = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const seeded = s => (hash(s) % 1000000) / 1000000;
  const teamName = (m, side) => side === 1 ? m?.t1 : m?.t2;
  const speed = () => { try { return clamp(Number(tvPlaybackSpeed) || 1, .5, 2); } catch (e) { return 1; } };
  const mapName = st => st?.maps?.[st.mapIndex] || 'карта';
  const countPauses = (st, team) => (st?.pauseHistory || []).filter(x => x.team === team && x.mapIndex === st.mapIndex).length;

  /* ---------------- Три разных типа остановок ---------------- */
  function triggerSmartPause(item, now) {
    const st = item?.state, m = item?.match;
    if (!st || !m || st.finished || st.phase !== 'playing' || !st.round || st.round < 4) return false;

    // Технические неполадки: независимы от тактического лимита и не дают бонусов.
    // 0.25% на каждый подходящий раунд, максимум 1 за BO1/BO3 и 2 за BO5.
    st.v43Tech = st.v43Tech || { total: 0, maps: {}, lastRound: 0, lastMapIndex: -1 };
    const tech = st.v43Tech;
    const techCap = st.mode === 'BO5' ? 2 : 1;
    const mapKey = String(st.mapIndex);
    const mapUsed = !!tech.maps[mapKey];
    const matchPointPressure = Math.max(Number(st.map1) || 0, Number(st.map2) || 0) >= 12;
    const enoughGap = tech.lastMapIndex !== st.mapIndex || st.round - (tech.lastRound || 0) >= 5;
    const eligibleTech = !mapUsed && tech.total < techCap && !matchPointPressure && st.round >= 4 && enoughGap;
    const techRoll = seeded(`${item.id}|${st.mapIndex}|${st.round}|technical`);
    if (eligibleTech && techRoll < .0025) {
      const reasonRoll = seeded(`${item.id}|${st.mapIndex}|${st.round}|technical-reason`);
      const reasons = [
        ['Проверка сервера', 'Организаторы проверяют стабильность сервера'],
        ['Проблема с соединением', 'Техническая команда восстанавливает сетевое соединение'],
        ['Проверка оборудования', 'Команда заменяет неисправное оборудование']
      ];
      const reason = reasons[Math.floor(reasonRoll * reasons.length)];
      const duration = clamp(Math.round((3800 + reasonRoll * 1500) / speed()), 2400, 5500);
      tech.total++;
      tech.maps[mapKey] = true;
      tech.lastRound = st.round;
      tech.lastMapIndex = st.mapIndex;
      st.technicalPauseHistory = st.technicalPauseHistory || [];
      st.technicalPauseHistory.unshift({ round: st.round, mapIndex: st.mapIndex, reason: reason[0], duration, at: now });
      st.pauseReason = 'Техническая пауза';
      st.pauseKind = 'technical';
      st.pauseTeam = null;
      st.phase = 'technical-pause';
      st.phaseUntil = now + duration;
      st.phaseText = `🛠 ТЕХНИЧЕСКАЯ ПАУЗА • ${reason[0]}`;
      try { window.addBroadcastEvent?.(st, `🛠 <strong>Техническая пауза.</strong> ${reason[1]}. Тактические тайм-ауты не расходуются.`, 'technical'); } catch (e) {}
      return true;
    }

    // Автоматическая тактика ИИ: максимум одна пауза на команду за половину.
    // Управляемой пользователем команде оставляем решение за человеком.
    const managed = (() => { try { return window.V31?.managed?.() || ''; } catch (e) { return ''; } })();
    const half = st.overtime ? 2 + (Number(st.overtimeStage) || 1) : (st.round <= 12 ? 1 : 2);
    const recent = (st.mapRoundWinners || []).slice(-5);
    const candidates = [1, 2].map(side => {
      const name = teamName(m, side);
      const left = side === 1 ? Number(st.t1Pauses) || 0 : Number(st.t2Pauses) || 0;
      const alreadyPaused = (st.pauseHistory || []).some(x => x.team === name && x.mapIndex === st.mapIndex && (x.half || ((Number(x.round) || 1) <= 12 ? 1 : 2)) === half);
      if (!left || alreadyPaused || (managed && managed === name)) return null;
      if (st.round >= 10 && st.round <= 12) return null;
      const trend = window.getBroadcastTeamTrend?.(st, side, 6) || { losses: 0, streak: 0 };
      const losses5 = recent.filter(x => x !== side).length;
      const scoreDiff = side === 1 ? (st.map1 || 0) - (st.map2 || 0) : (st.map2 || 0) - (st.map1 || 0);
      const badRun = trend.streak >= 3;
      const underPressure = losses5 >= 4 && scoreDiff <= -2;
      if (!badRun && !underPressure) return null;
      let chance = trend.streak >= 4 ? .32 : trend.streak >= 3 ? .20 : .14;
      if (scoreDiff <= -3) chance += .07;
      if (losses5 >= 4) chance += .04;
      return { side, name, chance: Math.min(.38, chance), scoreDiff, streak: trend.streak };
    }).filter(Boolean);
    if (!candidates.length) return false;
    candidates.sort((a, b) => b.chance - a.chance || a.scoreDiff - b.scoreDiff);
    const pick = candidates[0];
    const roll = seeded(`${item.id}|${st.mapIndex}|${st.round}|tactical|${pick.side}`);
    if (roll >= pick.chance) return false;

    if (pick.side === 1) st.t1Pauses--; else st.t2Pauses--;
    st.pauseTeam = pick.name;
    st.pauseReason = 'Тактический тайм-аут';
    st.pauseKind = 'tactical';
    st.phase = 'tactical-pause';
    st.phaseUntil = now + clamp(Math.round(4700 / speed()), 2400, 5400);
    st.phaseText = `⏸ ТАКТИЧЕСКИЙ ТАЙМ-АУТ • ${pick.name}`;
    st.pauseHistory = st.pauseHistory || [];
    st.pauseHistory.unshift({ team: pick.name, side: pick.side, round: st.round, half, mapIndex: st.mapIndex, at: now, automatic: true, kind: 'tactical' });
    try { window.addBroadcastEvent?.(st, `🧠 <strong>${pick.name}</strong> берут тактический тайм-аут после ${pick.streak || 0} поражений подряд. Ищут ответ на игру соперника.`, 'tactic'); } catch (e) {}
    return true;
  }

  const oldPauseTrigger = window.maybeTriggerBroadcastTacticalPause;
  if (typeof oldPauseTrigger === 'function' && !oldPauseTrigger.__v43) {
    const wrapped = function (item, now) { return triggerSmartPause(item, Number(now) || Date.now()); };
    wrapped.__v43 = true;
    window.maybeTriggerBroadcastTacticalPause = wrapped;
    try { maybeTriggerBroadcastTacticalPause = wrapped; } catch (e) {}
  }

  // Переопределяем только тайминг остановки. Логика выбора пост-паузной тактики v31/v34 остаётся прежней.
  const oldAdvance = window.broadcastAdvancePhase;
  if (typeof oldAdvance === 'function' && !oldAdvance.__v43) {
    const wrapped = function (item, now) {
      const st = item?.state, current = Number(now) || Date.now();
      if (st?.phase === 'technical-pause') {
        if (st.phaseUntil && current < st.phaseUntil) return false;
        st.phase = 'playing'; st.phaseUntil = 0; st.pauseReason = null; st.pauseKind = null; st.pauseTeam = null;
        st.lastRoundAt = current;
        st.phaseText = st.overtime ? `🔥 Овертайм • ${st.map1}:${st.map2}` : `Карта ${st.mapIndex + 1} • ${st.map1}:${st.map2}`;
        try { window.addBroadcastEvent?.(st, '▶️ Техническая пауза завершена. Матч продолжается без изменения экономики и тактических бонусов.', 'technical'); } catch (e) {}
        return true;
      }
      if (st?.phase === 'tactical-pause' && st.phaseUntil && current < st.phaseUntil) return false;
      return oldAdvance.apply(this, arguments);
    };
    wrapped.__v43 = true;
    window.broadcastAdvancePhase = wrapped;
    try { broadcastAdvancePhase = wrapped; } catch (e) {}
  }

  /* ---------------- Разбор раунда ---------------- */
  const WHY = { elimination: 'все соперники выбиты', bomb: 'бомба взорвалась', defuse: 'бомба обезврежена', time: 'время вышло' };
  function stepOf(e, m) {
    const n = teamName(m, e.team);
    if (e.type === 'kill') return { icon: e.hs ? '🎯' : '✕', team: e.team, time: e.t, text: `${e.by} убирает ${e.target} • ${e.weapon}${e.hs ? ' • HS' : ''}`, sub: `${e.loc || 'позиция неизвестна'}${e.assist ? ` • ассист ${e.assist}` : ''}${e.entry ? ' • первый фраг' : ''}` };
    if (e.type === 'plant') return { icon: '💣', team: e.team, time: e.t, text: `${e.by || n} устанавливает бомбу`, sub: e.loc || 'точка' };
    if (e.type === 'retake') return { icon: '↻', team: e.team, time: e.t, text: `${n} начинают ретейк`, sub: e.n || '' };
    if (e.type === 'defuse') return { icon: '✂️', team: e.team, time: e.t, text: `${e.by || n} обезвреживает бомбу`, sub: e.kit ? 'с defuse kit' : 'без defuse kit' };
    if (e.type === 'explode') return { icon: '💥', team: e.team, time: e.t, text: 'Бомба взрывается', sub: e.loc || '' };
    if (e.type === 'save') return { icon: '🛡️', team: e.team, time: e.t, text: `${e.by || n} сохраняет оружие`, sub: 'команда отказывается от безнадёжного ретейка' };
    if (e.type === 'smoke') return { icon: '☁️', team: e.team, time: e.t, text: `${e.by || n} закрывает позицию дымом`, sub: e.loc || '' };
    if (e.type === 'flash') return { icon: '✦', team: e.team, time: e.t, text: `${e.by || n} даёт флешку`, sub: e.loc || '' };
    if (e.type === 'molotov') return { icon: '🔥', team: e.team, time: e.t, text: `${e.by || n} выжигает позицию`, sub: e.loc || '' };
    if (e.type === 'time') return { icon: '⏱', team: 0, time: e.t, text: 'Время раунда истекло', sub: '' };
    return null;
  }
  function makeStory(item, rec, M) {
    const st = item.state, m = item.match, kills = (rec.events || []).filter(e => e.type === 'kill');
    const winner = teamName(m, rec.winner), loser = teamName(m, rec.winner === 1 ? 2 : 1);
    const buy = st.roundBuys?.[rec.r] || {}, wb = rec.winner === 1 ? buy.t1 : buy.t2, lb = rec.winner === 1 ? buy.t2 : buy.t1;
    const weak = new Set(['eco', 'deagle', 'pistol', 'save']), strong = new Set(['full', 'half', 'hero', 'force']);
    const upset = weak.has(wb?.type) && strong.has(lb?.type) && rec.r > 2;
    const defuse = (rec.events || []).find(e => e.type === 'defuse');
    const plant = (rec.events || []).find(e => e.type === 'plant');
    const entry = kills.find(e => e.entry) || kills[0];
    let headline = rec.hl?.label ? `${rec.hl.icon || '⭐'} ${rec.hl.label}` : '';
    if (!headline && upset) headline = '💸 Экономический апсет';
    if (!headline && defuse) headline = '✂️ Защита дожимает ретейк';
    if (!headline && rec.reason === 'bomb') headline = '💣 Бомба решает раунд';
    if (!headline && rec.reason === 'time') headline = '⏱ Время на стороне защиты';
    if (!headline && kills.length >= 4) headline = '🔥 Массовая перестрелка';
    if (!headline) headline = kills.length ? '⚔️ Раунд решён в дуэлях' : '🧠 Тактический раунд';
    const pieces = [];
    if (entry) pieces.push(`Открывающий фраг: ${entry.by} (${entry.weapon}) убирает ${entry.target} на ${entry.loc || 'позиции'}${entry.hs ? ' выстрелом в голову' : ''}.`);
    if (plant) pieces.push(`${teamName(m, plant.team)} успевают поставить бомбу на ${plant.loc || 'точке'}.`);
    if (defuse) pieces.push(`${defuse.by} успевает обезвредить C4${defuse.kit ? ' с набором' : ''}.`);
    else if (rec.reason === 'bomb') pieces.push('CT не успевают остановить взрыв.');
    else if (rec.reason === 'elimination') pieces.push('Раунд заканчивается полным уничтожением одной из сторон.');
    else if (rec.reason === 'time') pieces.push('Атакующая сторона не успевает завершить выход.');
    if (upset) pieces.push(`${winner} выигрывают раунд на ${wb.type.toUpperCase()} против ${lb.type.toUpperCase()} соперника.`);
    const mvpText = rec.mvp || 'не определён';
    const steps = (rec.events || []).filter(e => !['start', 'end', 'trade-try'].includes(e.type)).map(e => stepOf(e, m)).filter(Boolean).sort((a, b) => (Number(b.time) || 0) - (Number(a.time) || 0)).slice(0, 6);
    const recent = (M?.rounds || []).filter(Boolean).slice(-6);
    const top = Object.values(M?.board || {}).sort((a, b) => (b.k + b.a * .45 + b.fk * .4) - (a.k + a.a * .45 + a.fk * .4)).slice(0, 3).map(p => ({ nick: p.nick, team: p.team, k: p.k, d: p.d, a: p.a, adr: Math.round((p.dmg || 0) / Math.max(1, p.rounds || 1)) }));
    return {
      round: rec.r, map: M?.map || mapName(st), winner, winnerSide: rec.winner, loser, headline,
      summary: pieces.join(' ') || `${winner} забирают раунд ${rec.r}.`, mvp: mvpText,
      plan: rec.plan || 'Стандартный выход', side1: rec.side1, kills: kills.length,
      steps, recent, top, upset, reason: rec.reason, at: Date.now()
    };
  }
  function storyOf(item) {
    const st = item?.state, m = item?.match;
    if (!st || !m || !window.V34Round?.live) return null;
    const live = window.V34Round.live(item.id), M = live?.maps?.[st.mapIndex];
    const rec = M?.rounds?.filter(Boolean).slice(-1)[0];
    if (!rec) return null;
    if (st.v43LastRound?.mapIndex === st.mapIndex && st.v43LastRound?.round === rec.r) return st.v43LastRound;
    const story = makeStory(item, rec, M);
    st.v43LastRound = Object.assign({ mapIndex: st.mapIndex }, story);
    return st.v43LastRound;
  }
  function storyMarkup(item, compact = false) {
    const st = item?.state, m = item?.match, story = storyOf(item);
    if (!st || !m) return '';
    const recent = story?.recent || [];
    const chips = recent.map(r => `<span class="v43-round-chip ${r.winner === 1 ? 'a' : 'b'}" title="Раунд ${r.r}: ${esc(teamName(m, r.winner))}">${r.r}<b>${r.winner === 1 ? '●' : '○'}</b></span>`).join('');
    const steps = (story?.steps || []).map(s => `<div class="v43-step ${s.team === 1 ? 'a' : s.team === 2 ? 'b' : ''}"><span class="v43-step-icon">${s.icon}</span><span class="v43-step-main"><b>${esc(s.text)}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</span><time>${Math.floor((Number(s.time) || 0) / 60)}:${String(Math.max(0, Math.floor(Number(s.time) || 0) % 60)).padStart(2, '0')}</time></div>`).join('');
    const top = (story?.top || []).map(p => `<span class="v43-impact ${p.team === 1 ? 'a' : 'b'}"><b>${esc(p.nick)}</b><small>${p.k}/${p.d}/${p.a} · ${Math.round(Number(p.adr) || 0)} ADR</small></span>`).join('');
    const pauses = `<span>⏱ Тайм-ауты: ${esc(m.t1)} — ${Number(st.t1Pauses) || 0}, ${esc(m.t2)} — ${Number(st.t2Pauses) || 0}</span><span>🛠 Тех. паузы: ${(st.technicalPauseHistory || []).length}</span>`;
    if (!story) return `<section class="v43-story ${compact ? 'compact' : ''}"><div class="v43-story-head"><span>🎙️ ПОДГОТОВКА К ЭФИРУ</span><b>${esc(mapName(st))}</b></div><p>Команды изучают первые раунды. Тактика, индивидуальные качества игроков и экономика влияют на развитие каждой серии.</p><div class="v43-pause-line">${pauses}</div></section>`;
    return `<section class="v43-story ${compact ? 'compact' : ''}" aria-live="polite">
      <div class="v43-story-head"><span>🎬 РАЗБОР РАУНДА ${story.round}</span><b>${esc(story.map)} · ${esc(st.map1 || 0)}:${esc(st.map2 || 0)}</b></div>
      <div class="v43-story-title">${esc(story.headline)}</div>
      <p class="v43-story-summary">${esc(story.summary)}</p>
      <div class="v43-story-plan"><span>План атаки:</span> ${esc(story.plan)}</div>
      ${steps ? `<div class="v43-story-steps">${steps}</div>` : ''}
      <div class="v43-story-bottom"><span>⭐ MVP раунда: <b>${esc(story.mvp)}</b></span><span>Победитель: <b>${esc(story.winner)}</b></span></div>
      ${chips ? `<div class="v43-round-strip"><span>Последние раунды</span>${chips}</div>` : ''}
      ${top ? `<div class="v43-impact-row"><span>Влияние на карте</span>${top}</div>` : ''}
      <div class="v43-pause-line">${pauses}</div>
    </section>`;
  }

  // После каждого разыгранного раунда формируем отдельную сюжетную сводку, не меняя исход матча.
  const V34 = window.V34Round;
  if (V34?.play && !V34.play.__v43) {
    const originalPlay = V34.play;
    const wrappedPlay = function (item, prob) {
      const winner = originalPlay.apply(this, arguments);
      try {
        const live = V34.live(item.id), M = live?.maps?.[item.state.mapIndex], rec = M?.rounds?.[item.state.round - 1];
        if (rec) {
          const story = makeStory(item, rec, M);
          item.state.v43LastRound = Object.assign({ mapIndex: item.state.mapIndex }, story);
          item.state.v43StoryHistory = (item.state.v43StoryHistory || []).concat([item.state.v43LastRound]).slice(-12);
          const m = item.match;
          const narrative = `${story.headline}: ${story.summary} MVP — ${story.mvp}.`;
          window.addBroadcastEvent?.(item.state, `🎬 <strong>Раунд ${story.round}.</strong> ${esc(narrative)}`, 'round-story');
          renderMatchStory(item);
        }
      } catch (e) { console.warn('[v43 story]', e); }
      return winner;
    };
    wrappedPlay.__v43 = true;
    V34.play = wrappedPlay;
  }

  /* ---------------- UI: разбор в окне матча ---------------- */
  function ensurePanel() {
    let panel = document.getElementById('v43-round-story-panel');
    if (panel) return panel;
    const ticker = document.getElementById('match-live-ticker');
    if (!ticker?.parentNode) return null;
    panel = document.createElement('div');
    panel.id = 'v43-round-story-panel';
    panel.className = 'v43-story-host';
    ticker.parentNode.insertBefore(panel, ticker);
    return panel;
  }
  function renderPauseMeta(item) {
    const st = item?.state, m = item?.match;
    const panel = document.getElementById('tactical-pause-panel');
    if (!st || !m || !panel) return;
    let meta = document.getElementById('v43-pause-meta');
    if (!meta) { meta = document.createElement('div'); meta.id = 'v43-pause-meta'; meta.className = 'v43-pause-meta'; panel.insertAdjacentElement('afterend', meta); }
    const techCount = (st.technicalPauseHistory || []).length;
    const current = st.phase === 'technical-pause' ? `🛠 ${esc(st.phaseText || 'Техническая пауза')}` : st.phase === 'tactical-pause' ? `🧠 ${esc(st.pauseTeam || 'Команда')} обсуждают план` : '';
    const lastTactic = st.lastPauseTactic?.tactic ? `Последнее решение: ${esc(st.lastPauseTactic.tactic)}` : 'Решение после тайм-аута влияет на следующие 2–3 раунда';
    meta.innerHTML = `${current ? `<b class="v43-pause-current">${current}</b>` : ''}<span>Тактические: ${esc(m.t1)} — ${Number(st.t1Pauses) || 0} · ${esc(m.t2)} — ${Number(st.t2Pauses) || 0} осталось</span><span>Технические остановки: ${techCount} · не расходуют тайм-ауты</span><small>${lastTactic}</small>`;
  }
  function renderMatchStory(item) {
    const panel = ensurePanel();
    if (!panel) return;
    panel.innerHTML = storyMarkup(item);
    renderPauseMeta(item);
  }
  const oldRender = window.broadcastRenderDetail;
  if (typeof oldRender === 'function' && !oldRender.__v43) {
    const wrapped = function (item) {
      const result = oldRender.apply(this, arguments);
      try {
        renderMatchStory(item);
        const banner = document.getElementById('live-match-state-banner');
        if (banner && item?.state?.phase === 'technical-pause') {
          banner.className = 'match-broadcast-state v43-technical';
          banner.innerText = item.state.phaseText || '🛠 ТЕХНИЧЕСКАЯ ПАУЗА';
        }
      } catch (e) { console.warn('[v43 render]', e); }
      return result;
    };
    wrapped.__v43 = true;
    window.broadcastRenderDetail = wrapped;
    try { broadcastRenderDetail = wrapped; } catch (e) {}
  }

  /* ---------------- Match Center и режим зрителя ---------------- */
  if (H?.PAGES?.match && !H.PAGES.match.__v43) {
    const oldMatchPage = H.PAGES.match;
    const wrapped = function (id) {
      let html = oldMatchPage.apply(this, arguments);
      try {
        const fm = H.findMatch?.(id), m = fm?.m;
        const item = m ? H.liveItem?.(m.a, m.b) : null;
        if (item?.state && /<div class="mx-grid">/.test(html)) html = html.replace('<div class="mx-grid">', `${storyMarkup(item, true)}<div class="mx-grid">`);
      } catch (e) {}
      return html;
    };
    wrapped.__v43 = true;
    H.PAGES.match = wrapped;
  }
  if (H?.PAGES?.watch && !H.PAGES.watch.__v43) {
    const oldWatchPage = H.PAGES.watch;
    const wrapped = function () {
      let html = oldWatchPage.apply(this, arguments);
      try {
        const item = H.spectator?.direct?.();
        if (item?.state && /<div class="hs-grid2">/.test(html)) html = html.replace('<div class="hs-grid2">', `${storyMarkup(item, true)}<div class="hs-grid2">`);
      } catch (e) {}
      return html;
    };
    wrapped.__v43 = true;
    H.PAGES.watch = wrapped;
  }

  // Синхронно обновляем плашки после ручного тайм-аута тренера.
  const oldPauseButtons = window.updatePauseButtonsUI;
  if (typeof oldPauseButtons === 'function' && !oldPauseButtons.__v43) {
    const wrapped = function () {
      const result = oldPauseButtons.apply(this, arguments);
      try {
        const item = H?.spectator?.direct?.();
        if (item) renderPauseMeta(item);
      } catch (e) {}
      return result;
    };
    wrapped.__v43 = true; window.updatePauseButtonsUI = wrapped;
    try { updatePauseButtonsUI = wrapped; } catch (e) {}
  }

  window.CS2MatchImmersion = {
    version: 43,
    buildStory: item => storyOf(item),
    render: renderMatchStory,
    triggerSmartPause,
    technicalPauseChancePerRound: .0025,
    technicalPauseCaps: { BO1: 1, BO3: 1, BO5: 2 },
    autoTacticalPausePolicy: 'one per team per half; trigger on 3+ consecutive losses or 4 of last 5 losses while behind'
  };
  console.info('[v43] match immersion, tactical and technical pauses enabled');
})();
