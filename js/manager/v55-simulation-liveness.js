(() => {
  'use strict';

  // v55: long-simulation stability. Repairs lost stage transitions from older
  // saves, prevents empty Swiss rounds from stranding a tournament, and keeps
  // the multi-season calendar/parallel circuit in sync.
  const log = (...args) => console.warn('[v55 tournament recovery]', ...args);

  function rebuildSwissStandings(state) {
    if (!state || !Array.isArray(state.teams) || !Array.isArray(state.rounds)) return false;
    const byName = new Map(state.teams.map(team => [team.name, team]));
    state.teams.forEach(team => {
      team.wins = 0;
      team.losses = 0;
      team.diff = 0;
      team.playedAgainst = [];
    });
    state.rounds.forEach(round => (Array.isArray(round) ? round : []).forEach(match => {
      if (!match?.t1 || !match?.t2) return;
      const a = byName.get(match.t1), b = byName.get(match.t2);
      if (!a || !b) return;
      if (!a.playedAgainst.includes(b.name)) a.playedAgainst.push(b.name);
      if (!b.playedAgainst.includes(a.name)) b.playedAgainst.push(a.name);
      if (match.winner !== a.name && match.winner !== b.name) return;
      const winner = match.winner === a.name ? a : b;
      const loser = winner === a ? b : a;
      winner.wins += 1;
      winner.diff += 2;
      loser.losses += 1;
      loser.diff -= 2;
    }));
    return true;
  }

  function trimEmptyTail(rounds) {
    let changed = false;
    while (rounds.length && (!Array.isArray(rounds[rounds.length - 1]) || rounds[rounds.length - 1].length === 0)) {
      rounds.pop();
      changed = true;
    }
    return changed;
  }

  function repairRegularSwiss(t) {
    const sw = t?.swiss;
    if (!sw || !Array.isArray(sw.rounds)) return false;
    let changed = rebuildSwissStandings(sw) || false;
    if (trimEmptyTail(sw.rounds)) changed = true;

    const firstOpen = sw.rounds.findIndex(round =>
      Array.isArray(round) && round.some(m => m && m.t1 && m.t2 && !m.winner));
    if (firstOpen >= 0) {
      const wanted = firstOpen + 1;
      if (Number(sw.currentRound) !== wanted) { sw.currentRound = wanted; changed = true; }
      return changed;
    }

    const allRoundsDone = sw.rounds.every(round => Array.isArray(round) && round.every(m => m?.winner));
    if (!allRoundsDone) return changed;

    const active = sw.teams.filter(team => team.wins < 3 && team.losses < 3);
    if (sw.rounds.length >= 5 && active.length === 0) {
      if (typeof finalizeSwissStage === 'function') {
        try { finalizeSwissStage(); return true; } catch (e) { log('Swiss finalize failed', e); }
      }
      return changed;
    }
    if (sw.rounds.length < 5 && active.length >= 2 && active.length % 2 === 0 && typeof generateSwissRound === 'function') {
      sw.currentRound = sw.rounds.length + 1;
      try {
        const before = sw.rounds.length;
        generateSwissRound(sw.currentRound);
        if (sw.rounds.length > before) return true;
      } catch (e) { log('Swiss next-round rebuild failed', e); }
    }
    return changed;
  }

  function rebuildMajorStandings(stage) {
    if (!stage || !Array.isArray(stage.teams) || !Array.isArray(stage.rounds)) return false;
    const byName = new Map(stage.teams.map(team => [team.name, team]));
    stage.teams.forEach(team => {
      team.wins = 0;
      team.losses = 0;
      team.diff = 0;
      team.playedAgainst = [];
    });
    stage.rounds.forEach(round => (Array.isArray(round) ? round : []).forEach(match => {
      if (!match?.t1 || !match?.t2) return;
      const a = byName.get(match.t1), b = byName.get(match.t2);
      if (!a || !b) return;
      if (!a.playedAgainst.includes(b.name)) a.playedAgainst.push(b.name);
      if (!b.playedAgainst.includes(a.name)) b.playedAgainst.push(a.name);
      if (match.winner !== a.name && match.winner !== b.name) return;
      const winner = match.winner === a.name ? a : b;
      const loser = winner === a ? b : a;
      winner.wins += 1;
      winner.diff += 2;
      loser.losses += 1;
      loser.diff -= 2;
    }));
  }

  function repairMajor(t) {
    const stages = t?.majorStages;
    if (!Array.isArray(stages)) return false;
    let changed = false;

    for (let i = 0; i < 3; i++) {
      const stageNo = i + 1;
      const st = stages[i];

      // A stage can be marked complete just before its successor/playoff is
      // created. Re-running its idempotent transition completes that hand-off.
      if (st?.completed) {
        const missingSuccessor = stageNo < 3 ? !stages[stageNo] : !(Array.isArray(t.upperRounds) && t.upperRounds.length);
        if (missingSuccessor && typeof finalizeMajorStage === 'function') {
          try { finalizeMajorStage(stageNo); changed = true; } catch (e) { log(`Major Stage ${stageNo} hand-off failed`, e); }
        }
        continue;
      }
      if (!st) continue;

      rebuildMajorStandings(st);
      if (trimEmptyTail(st.rounds)) changed = true;

      const firstOpen = st.rounds.findIndex(round =>
        Array.isArray(round) && round.some(m => m && m.t1 && m.t2 && !m.winner));
      if (firstOpen >= 0) {
        const wanted = firstOpen + 1;
        if (Number(st.currentRound) !== wanted) { st.currentRound = wanted; changed = true; }
        return changed;
      }

      const allRoundsDone = st.rounds.every(round => Array.isArray(round) && round.every(m => m?.winner));
      if (!allRoundsDone) return changed;

      const active = st.teams.filter(team => team.wins < 3 && team.losses < 3);
      const settled = st.teams.every(team => team.wins >= 3 || team.losses >= 3);
      if (settled || (st.rounds.length >= 5 && active.length === 0)) {
        if (typeof finalizeMajorStage === 'function') {
          try { finalizeMajorStage(stageNo); return true; } catch (e) { log(`Major Stage ${stageNo} finalize failed`, e); }
        }
        return changed;
      }
      if (st.rounds.length < 5 && active.length >= 2 && active.length % 2 === 0 && typeof generateMajorSwissRound === 'function') {
        st.currentRound = st.rounds.length + 1;
        try {
          const before = st.rounds.length;
          generateMajorSwissRound(st);
          if (st.rounds.length > before) return true;
        } catch (e) { log(`Major Stage ${stageNo} round rebuild failed`, e); }
      }
      return changed;
    }

    // Recover the final Major playoff if Stage 3 was completed but the process
    // was interrupted before the bracket was attached to the tournament.
    const stage3 = stages[2];
    if (stage3?.completed && (!Array.isArray(t.upperRounds) || !t.upperRounds.length)) {
      try {
        const adv = stage3.teams.filter(team => team.wins >= 3);
        const byName = new Map((typeof teams !== 'undefined' ? teams : []).map(team => [team.name, team]));
        const playoff = adv.slice().sort((a,b) => (a.losses-b.losses) || ((a.seed||99)-(b.seed||99)))
          .map(team => byName.get(team.name)).filter(Boolean);
        if (playoff.length === 8 && typeof setupBracketTournament === 'function') {
          t.seedFromOrder = true; t.formatChoice = 'single'; t.size = 8; t.hasLowerBracket = false;
          setupBracketTournament(playoff, 'single');
          changed = true;
        }
      } catch (e) { log('Major playoff reconstruction failed', e); }
    }
    return changed;
  }

  function repairBracketHandoffs(t) {
    if (!t || !Array.isArray(t.upperRounds) || !t.upperRounds.length) return false;
    let changed = false;
    const fill = (match, slot, value) => {
      if (match && value && !match[slot]) { match[slot] = value; changed = true; }
    };
    const lower = Array.isArray(t.lowerRounds) ? t.lowerRounds : [];

    // Recreate every winner/loser hand-off from the recorded match result.
    // This mirrors resolveUpperMatch()/resolveLowerMatch(), so a partially saved
    // double-elimination bracket can continue instead of leaving empty slots.
    t.upperRounds.forEach((round, r) => (round || []).forEach((m, idx) => {
      if (!m?.winner || !m.t1 || !m.t2) return;
      const loser = m.winner === m.t1 ? m.t2 : m.t1;
      if (r < t.upperRounds.length - 1) {
        const target = t.upperRounds[r + 1]?.[Math.floor(idx / 2)];
        fill(target, idx % 2 === 0 ? 't1' : 't2', m.winner);
      }
      if (t.hasLowerBracket) {
        if (t.size === 16) {
          if (r === 0) fill(lower[0]?.[Math.floor(idx / 2)], idx % 2 === 0 ? 't1' : 't2', loser);
          else if (r === 1) fill(lower[1]?.[idx], 't2', loser);
          else if (r === 2) fill(lower[3]?.[idx], 't2', loser);
        } else if (t.size === 8) {
          if (r === 0) fill(lower[0]?.[Math.floor(idx / 2)], idx % 2 === 0 ? 't1' : 't2', loser);
          else if (r === 1) fill(lower[1]?.[idx], 't2', loser);
        }
        if (r === t.upperRounds.length - 1) {
          fill(t.grandFinal, 't1', m.winner);
          fill(lower[lower.length - 1]?.[0], 't2', loser);
        }
      } else if (t.bronzeMatch && r === t.upperRounds.length - 2) {
        fill(t.bronzeMatch, idx === 0 ? 't1' : 't2', loser);
      }
    }));

    if (t.hasLowerBracket) {
      lower.forEach((round, r) => (round || []).forEach((m, idx) => {
        if (!m?.winner || !m.t1 || !m.t2) return;
        const loser = m.winner === m.t1 ? m.t2 : m.t1;
        if (t.size === 16) {
          if (r === 0) fill(lower[1]?.[idx], 't1', m.winner);
          else if (r === 1) fill(lower[2]?.[Math.floor(idx / 2)], idx % 2 === 0 ? 't1' : 't2', m.winner);
          else if (r === 2) fill(lower[3]?.[idx], 't1', m.winner);
          else if (r === 3) fill(lower[4]?.[0], idx === 0 ? 't1' : 't2', m.winner);
          else if (r === 4) fill(lower[5]?.[0], 't1', m.winner);
        } else if (t.size === 8) {
          if (r === 0) fill(lower[1]?.[idx], 't1', m.winner);
          else if (r === 1) fill(lower[2]?.[0], idx === 0 ? 't1' : 't2', m.winner);
          else if (r === 2) fill(lower[3]?.[0], 't1', m.winner);
        }
        if (r === lower.length - 1) {
          fill(t.grandFinal, 't2', m.winner);
          t.placements = t.placements || {};
          if (!t.placements[loser]) { t.placements[loser] = { place: 3, title: '3 место' }; changed = true; }
        } else {
          t.placements = t.placements || {};
          if (!t.placements[loser]) { t.placements[loser] = { place: 6, title: 'Вылет из нижней сетки' }; changed = true; }
        }
      }));
      const upperFinal = t.upperRounds.at(-1)?.[0];
      const lowerFinal = lower.at(-1)?.[0];
      if (upperFinal?.winner) fill(t.grandFinal, 't1', upperFinal.winner);
      if (lowerFinal?.winner) fill(t.grandFinal, 't2', lowerFinal.winner);
    }

    try {
      if (!t.completed && typeof checkTournamentCompletion === 'function') {
        const final = t.hasLowerBracket ? t.grandFinal : t.upperRounds.at(-1)?.[0];
        if (final?.winner) { checkTournamentCompletion(); changed = true; }
      }
    } catch (e) { log('Bracket completion check failed', e); }
    return changed;
  }

  function repairGSL(t) {
    const groups = t?.gsl?.groups;
    if (!Array.isArray(groups)) return false;
    let changed = false;
    const fill = (match, slot, value) => {
      if (match && value && !match[slot]) { match[slot] = value; changed = true; }
    };
    groups.forEach((g, index) => {
      const m = g?.matches || {};
      const loserOf = match => match?.winner && match.t1 && match.t2 ? (match.winner === match.t1 ? match.t2 : match.t1) : null;
      // Opening match results are authoritative; restore the 1–0 and 0–1 matches.
      if (m.opening1?.winner) {
        fill(m.winners, 't1', m.opening1.winner);
        fill(m.losers, 't1', loserOf(m.opening1));
      }
      if (m.opening2?.winner) {
        fill(m.winners, 't2', m.opening2.winner);
        fill(m.losers, 't2', loserOf(m.opening2));
      }
      if (m.winners?.winner) fill(m.decider, 't1', loserOf(m.winners));
      if (m.losers?.winner) fill(m.decider, 't2', m.losers.winner);

      const qualified = [m.winners?.winner, m.decider?.winner].filter(Boolean);
      const uniqueQualified = [...new Set(qualified)].slice(0, 2);
      if (JSON.stringify(g.qualified || []) !== JSON.stringify(uniqueQualified)) {
        g.qualified = uniqueQualified; changed = true;
      }
      const eliminated = [loserOf(m.losers), loserOf(m.decider)].filter(Boolean);
      const uniqueEliminated = [...new Set(eliminated)];
      if (JSON.stringify(g.eliminated || []) !== JSON.stringify(uniqueEliminated)) {
        g.eliminated = uniqueEliminated; changed = true;
      }
      uniqueEliminated.forEach(name => {
        t.placements = t.placements || {};
        if (!t.placements[name]) {
          t.placements[name] = { place: 12, title: `GSL Вылет (Группа ${String.fromCharCode(65 + index)})` };
          changed = true;
        }
      });
    });
    const allDone = groups.length === 4 && groups.every(g => {
      const m = g?.matches || {};
      return ['opening1','opening2','winners','losers','decider'].every(k => !!m[k]?.winner) && (g.qualified || []).length === 2;
    });
    if (allDone && typeof finalizeGSLStage === 'function') {
      try { if (finalizeGSLStage()) changed = true; } catch (e) { log('GSL playoff hand-off failed', e); }
    }
    return changed;
  }

  function repairBounty(t) {
    const b = t?.bounty;
    if (!b || !Array.isArray(b.stage1) || !Array.isArray(b.stage2)) return false;
    let changed = false;
    b.stage1.forEach((m, index) => {
      if (!m?.winner || !b.stage2[Math.floor(index / 2)]) return;
      const target = b.stage2[Math.floor(index / 2)];
      const slot = index % 2 === 0 ? 't1' : 't2';
      if (!target[slot]) { target[slot] = m.winner; changed = true; }
      const loser = m.winner === m.t1 ? m.t2 : m.t1;
      if (loser && !t.placements?.[loser]) {
        t.placements = t.placements || {};
        t.placements[loser] = { place: 17, title: 'Вылет в Стадии 1 Bounty' };
        changed = true;
      }
    });
    if (!b.lanStageStarted && b.stage2.length === 8 && b.stage2.every(m => m?.winner && m.t1 && m.t2)) {
      const names = b.stage2.map(m => m.winner);
      const roster = names.map(name => (typeof teams !== 'undefined' ? teams.find(team => team.name === name) : null)).filter(Boolean);
      if (roster.length === 8 && typeof setupBracketTournament === 'function') {
        try {
          if (typeof window.hubCaptureGroupStages === 'function') window.hubCaptureGroupStages();
          b.lanStageStarted = true;
          t.size = 8; t.formatChoice = 'single'; t.bounty = null;
          setupBracketTournament(roster, 'single');
          changed = true;
        } catch (e) { log('Bounty LAN stage recovery failed', e); }
      }
    }
    return changed;
  }

  window.v55RepairTournamentProgress = function() {
    const t = typeof currentTournament !== 'undefined' ? currentTournament : null;
    if (!t || t.completed) return false;
    let changed = false;
    try {
      if (t.isMajor && Array.isArray(t.majorStages)) changed = repairMajor(t) || changed;
      else if (t.formatChoice === 'swiss' && t.swiss) changed = repairRegularSwiss(t) || changed;
      else if (t.formatChoice === 'gsl' && t.gsl?.groups) changed = repairGSL(t) || changed;
      else if (t.formatChoice === 'bounty' && t.bounty) changed = repairBounty(t) || changed;
      changed = repairBracketHandoffs(t) || changed;
      if (typeof saveSeasonState === 'function' && changed) saveSeasonState();
      if (changed && typeof renderTournament === 'function') renderTournament();
    } catch (e) { log('progress repair failed', e); }
    return changed;
  };

  window.v55TournamentHealth = function() {
    const t = typeof currentTournament !== 'undefined' ? currentTournament : null;
    let playable = [];
    try { playable = typeof getBroadcastPlayableMatches === 'function' ? getBroadcastPlayableMatches() : []; } catch (e) {}
    let fallback = null;
    try { fallback = typeof getNextPlayableMatch === 'function' ? getNextPlayableMatch() : null; } catch (e) {}
    return {
      season: Number(seasonState?.currentSeason) || 1,
      tournamentIndex: Number(seasonState?.tournamentIndex) || 1,
      tournament: t?.name || null,
      completed: !!t?.completed,
      playableMatches: playable.length,
      fallbackMatch: fallback?.match ? `${fallback.match.t1} vs ${fallback.match.t2}` : null,
      swissRound: Number(t?.swiss?.currentRound) || null,
      majorStages: (t?.majorStages || []).map(s => s ? { round: s.currentRound, rounds: s.rounds?.length, completed: !!s.completed, unresolved: (s.rounds || []).flat().filter(m => m && !m.winner).length } : null),
      broadcast: t?.broadcast ? { running: !!t.broadcast.running, queued: t.broadcast.queue?.length || 0, active: t.broadcast.active?.length || 0 } : null
    };
  };

  // Rebuild the correct multi-year scene after legacy saves or an interrupted
  // season rollover. Do not reset progress when a valid 15-slot schedule exists.
  window.v55EnsureSeasonPlan = function() {
    try {
      const schedule = seasonState?.seasonSchedule;
      if (typeof window.v21GenerateTier1Schedule !== 'function') return false;
      if (!Array.isArray(schedule) || schedule.length !== 15 || !Array.isArray(seasonState.parallelSchedule) || !seasonState.parallelSchedule.some(e => Number(e.season) === Number(seasonState.currentSeason))) {
        window.v21GenerateTier1Schedule(false);
        return true;
      }
    } catch (e) { log('season calendar repair failed', e); }
    return false;
  };

  try { window.v55EnsureSeasonPlan(); } catch (e) {}
  try { window.v55RepairTournamentProgress(); } catch (e) {}
  console.info('[v55] long-simulation liveness and multi-season recovery enabled');
})();
