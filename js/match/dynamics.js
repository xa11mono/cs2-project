/* v44 — динамика матча: форма, психология, ошибки, адаптация, тренер и комментаторы.
   Слой работает поверх v34/v43: использует события реальных раундов и сохраняет состояние внутри broadcast state. */
(() => {
  'use strict';
  const H = window.HS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const teamName = (m, side) => side === 1 ? m?.t1 : m?.t2;
  const teamList = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : (Array.isArray(window.teams) ? window.teams : []);
  const teamData = name => teamList().find(t => t?.name === name) || null;
  const avg = (values, fallback = 65) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : fallback;
  const mapLabel = st => st?.maps?.[st.mapIndex] || 'карта';
  const streakOf = (arr, side) => {
    let n = 0;
    for (let i = arr.length - 1; i >= 0 && arr[i] === side; i--) n++;
    return n;
  };
  const recentWins = (arr, side, count = 5) => arr.slice(-count).filter(x => x === side).length;

  function ensure(item) {
    const st = item?.state;
    if (!st) return null;
    if (!st.v44Dynamics || typeof st.v44Dynamics !== 'object') {
      st.v44Dynamics = {
        version: 44, mapIndex: st.mapIndex || 0, rounds: [], comments: [],
        sides: {
          1: { momentum: 0, pressure: 0, activePlan: null, read: null, lastCoachRound: -99, mistakeUntil: 0, mistakes: 0, attacks: [], lastMood: 'Ровная игра' },
          2: { momentum: 0, pressure: 0, activePlan: null, read: null, lastCoachRound: -99, mistakeUntil: 0, mistakes: 0, attacks: [], lastMood: 'Ровная игра' }
        }
      };
    }
    const d = st.v44Dynamics;
    d.sides = d.sides || {};
    [1, 2].forEach(side => {
      d.sides[side] = Object.assign({ momentum: 0, pressure: 0, activePlan: null, read: null, lastCoachRound: -99, mistakeUntil: 0, mistakes: 0, attacks: [], lastMood: 'Ровная игра' }, d.sides[side] || {});
      d.sides[side].attacks = Array.isArray(d.sides[side].attacks) ? d.sides[side].attacks : [];
    });
    d.rounds = Array.isArray(d.rounds) ? d.rounds : [];
    d.comments = Array.isArray(d.comments) ? d.comments : [];
    if (Number(d.mapIndex) !== Number(st.mapIndex || 0)) {
      d.mapIndex = Number(st.mapIndex || 0);
      d.rounds = [];
      d.sides[1].momentum *= .32; d.sides[2].momentum *= .32;
      [1, 2].forEach(side => {
        const s = d.sides[side];
        s.pressure *= .4; s.activePlan = null; s.read = null; s.attacks = []; s.mistakeUntil = 0; s.lastCoachRound = -99;
      });
      addComment(item, `Новая карта — ${mapLabel(st)}. Команды начинают с чистого тактического листа, но инерция серии ещё ощущается.`, 'map');
    }
    return d;
  }

  function composure(team) {
    const players = (teamData(team)?.players || []).slice(0, 5);
    return avg(players.map(p => (Number(p?.tacticalIQ ?? 62) + Number(p?.clutch ?? 60)) / 2), 62);
  }
  function pressureFor(item, side, score1, score2, rounds) {
    const own = side === 1 ? score1 : score2;
    const opp = side === 1 ? score2 : score1;
    const lossStreak = streakOf(rounds, side === 1 ? 2 : 1);
    const deficit = Math.max(0, opp - own);
    let raw = Math.min(.34, deficit * .075) + Math.min(.34, lossStreak * .085);
    if (opp >= 12 && own <= 10) raw += .19;
    if (item?.state?.overtime && Math.abs(own - opp) <= 1) raw += .09;
    const calm = clamp(composure(teamName(item?.match, side)) / 100, .35, .95);
    return clamp(raw * (1.2 - calm * .48), 0, 1);
  }
  function planMod(sideState, round) {
    const plan = sideState?.activePlan;
    if (!plan || Number(plan.roundsLeft) <= 0 || Number(plan.startedRound) >= round) return 0;
    return clamp(Number(plan.boost) || 0, 0, .016);
  }
  function readMod(sideState, round) {
    const read = sideState?.read;
    if (!read || Number(read.untilRound) < round) return 0;
    return clamp(Number(read.boost) || 0, 0, .015);
  }
  function sideModifier(item, side, d, score1, score2, rounds, round) {
    const s = d.sides[side];
    const pressure = pressureFor(item, side, score1, score2, rounds);
    s.pressure = pressure;
    const momentum = clamp(Number(s.momentum) || 0, -1.3, 1.3);
    const momentumBoost = momentum * .0065;
    const pressurePenalty = pressure * .0125;
    const errorPenalty = Number(s.mistakeUntil) >= round ? .006 : 0;
    return clamp(momentumBoost - pressurePenalty + planMod(s, round) + readMod(s, round) - errorPenalty, -.022, .022);
  }
  function addComment(item, text, type = 'commentary') {
    const st = item?.state;
    if (!st || !text) return;
    const d = st.v44Dynamics || (st.v44Dynamics = { comments: [] });
    d.comments = Array.isArray(d.comments) ? d.comments : [];
    const r = Number(st.round) || 0;
    const last = d.comments[d.comments.length - 1];
    if (last && last.round === r && last.text === text) return;
    const line = { round: r, mapIndex: Number(st.mapIndex) || 0, text: String(text), type, at: Date.now() };
    d.comments.push(line);
    d.comments = d.comments.slice(-16);
    const speaker = type === 'coach' ? 'Тренер' : type === 'analysis' ? 'Аналитик' : type === 'mistake' ? 'Разбор ошибки' : 'Комментатор';
    const icon = type === 'coach' ? '🧠' : type === 'analysis' ? '📊' : type === 'mistake' ? '⚠️' : '🎙️';
    try { window.addBroadcastEvent?.(st, `${icon} <strong>${esc(speaker)}:</strong> ${esc(text)}`, type === 'coach' ? 'coach-reaction' : type === 'analysis' ? 'commentary-analysis' : 'commentary'); } catch (e) {}
  }

  function inferLane(rec) {
    const plant = (rec?.events || []).find(e => e.type === 'plant');
    const opener = (rec?.events || []).find(e => e.type === 'kill' && e.entry) || (rec?.events || []).find(e => e.type === 'kill');
    const raw = String(plant?.loc || opener?.loc || '').toLowerCase();
    if (/\b(a|a site|palace|ramp|long a|pit|heaven|ticket|a main)\b/.test(raw)) return { lane: 'A', loc: plant?.loc || opener?.loc || '' };
    if (/\b(b|b site|apps|banana|tunnel|market|construction|b main|cave)\b/.test(raw)) return { lane: 'B', loc: plant?.loc || opener?.loc || '' };
    if (/mid|window|connector|bridge|outside|donut/i.test(raw)) return { lane: 'MID', loc: plant?.loc || opener?.loc || '' };
    return null;
  }
  function readAttackPattern(item, rec, d) {
    const attacker = rec?.side1 === 'T' ? 1 : 2;
    const defender = attacker === 1 ? 2 : 1;
    const lane = inferLane(rec);
    if (!lane) return null;
    const attacks = d.sides[attacker].attacks;
    attacks.push({ round: rec.r, lane: lane.lane, loc: lane.loc });
    d.sides[attacker].attacks = attacks.slice(-6);
    const recent = attacks.slice(-4);
    const same = recent.filter(x => x.lane === lane.lane).length;
    if (recent.length >= 3 && same >= 3) {
      const def = d.sides[defender];
      const last = def.read;
      if (!last || last.lane !== lane.lane || rec.r - (last.startedRound || 0) >= 4) {
        def.read = { lane: lane.lane, startedRound: rec.r, untilRound: rec.r + 3, boost: .012, text: `Соперник часто выходит на ${lane.lane === 'MID' ? 'мид' : lane.lane}` };
        const coach = teamData(teamName(item.match, defender))?.coach?.name;
        addComment(item, `${coach && !/^(coach|—)$/i.test(coach) ? `${coach} и штаб ` : 'Штаб '}прочитали повторяющийся маршрут: ${teamName(item.match, defender)} усиливают ${lane.lane === 'MID' ? 'мид' : `точку ${lane.lane}`} и готовят встречный контакт.`, 'coach');
        return { attacker, defender, lane: lane.lane };
      }
    }
    return null;
  }

  function choosePlan(item, side, reason, round) {
    const d = item.state.v44Dynamics, ss = d.sides[side], name = teamName(item.match, side), team = teamData(name);
    const style = team?.style || 'Tactical';
    const plans = {
      Aggressive: { style: 'Discipline', label: 'Сбросить темп и перейти на игру от разменов', boost: .0105, detail: 'снижают количество одиночных пиков и держатся ближе друг к другу' },
      Discipline: { style: 'Tactical', label: 'Сменить тайминг и рисунок выхода', boost: .011, detail: 'меняют скорость раунда и заставляют соперника гадать о точке атаки' },
      Tactical: { style: 'Aggressive', label: 'Ускорить темп и забрать пространство', boost: .012, detail: 'ищут ранний контакт, чтобы не дать сопернику закрепиться' },
      Chaos: { style: 'Tactical', label: 'Стабилизировать игру и читать соперника', boost: .0095, detail: 'возвращаются к контролю карты и более понятным разменам' }
    };
    const selected = plans[style] || plans.Tactical;
    ss.activePlan = { style: selected.style, fromStyle: style, label: selected.label, startedRound: round, roundsLeft: 2, boost: selected.boost, wins: 0, played: 0 };
    ss.lastCoachRound = round;
    const coach = team?.coach?.name;
    const head = coach && !/^(coach|—)$/i.test(coach) ? `${coach}: ` : '';
    addComment(item, `${head}${reason}. Тренер меняет стиль ${style} → ${selected.style}: ${selected.detail}. План «${selected.label}» повлияет на следующие два раунда.`, 'coach');
  }

  function mistakeFromRound(item, rec, M) {
    const events = rec?.events || [];
    const failedTrade = events.find(e => e.type === 'trade-try' && !e.trade);
    if (failedTrade) {
      const team = M?.board?.[failedTrade.by]?.team;
      if (team === 1 || team === 2) {
        const ss = item.state.v44Dynamics.sides[team];
        ss.mistakes = (ss.mistakes || 0) + 1;
        ss.mistakeUntil = Number(rec.r) + 1;
        addComment(item, `${failedTrade.by} пошёл разменивать, но не получил поддержку. Это стоило команде темпа — тренеру придётся поправить дистанции между игроками.`, 'mistake');
      }
      return;
    }
    const opener = events.find(e => e.type === 'kill' && e.entry);
    if (opener && rec.winner !== opener.team) {
      const ss = item.state.v44Dynamics.sides[opener.team];
      ss.mistakes = (ss.mistakes || 0) + 1;
      ss.mistakeUntil = Number(rec.r) + 1;
      addComment(item, `${opener.by} открыл раунд в пользу своей команды, но преимущество не конвертировали в победу. Слишком рано отдали пространство после первого фрага.`, 'mistake');
    }
  }

  function commentatorLine(item, rec, context) {
    const m = item.match, d = item.state.v44Dynamics;
    const winner = rec.winner, loser = winner === 1 ? 2 : 1;
    const team = teamName(m, winner), other = teamName(m, loser);
    const kills = (rec.events || []).filter(e => e.type === 'kill');
    const plant = (rec.events || []).find(e => e.type === 'plant');
    const defuse = (rec.events || []).find(e => e.type === 'defuse');
    const trade = (rec.events || []).find(e => e.type === 'trade-try' && !e.trade);
    const buy = item.state.roundBuys?.[rec.r] || {};
    const weak = new Set(['eco', 'deagle', 'pistol', 'save']);
    const strong = new Set(['full', 'half', 'hero', 'force']);
    const winnerBuy = winner === 1 ? buy.t1?.type : buy.t2?.type;
    const loserBuy = winner === 1 ? buy.t2?.type : buy.t1?.type;
    if (rec.hl?.label && /клатч|эйс|4 убийства/i.test(rec.hl.label)) return `${rec.hl.icon || '🔥'} ${rec.hl.label}! ${team} вытаскивают раунд на индивидуальном классе.`;
    if (weak.has(winnerBuy) && strong.has(loserBuy)) return `Экономика перевернула раунд: ${team} забирают его на ${String(winnerBuy).toUpperCase()} против ${String(loserBuy).toUpperCase()} соперника.`;
    if (defuse) return `Какой ретейк! ${defuse.by || team} успевает обезвредить бомбу — ${team} вырывают раунд у самой точки.`;
    if (rec.reason === 'bomb') return `Бомба делает своё дело. ${team} не оставляют сопернику времени на спасение раунда.`;
    if (trade) return `Неудачный размен — и ${other} теряют контроль над ситуацией. ${team} наказывают за разрыв между игроками.`;
    if ((d.sides[loser]?.pressure || 0) >= .62) return `${other} сейчас под серьёзным психологическим давлением. Ошибки в решениях становятся дороже, а ${team} чувствуют момент.`;
    if (context?.adapted) return `Тактическая дуэль продолжается: штаб ${team} заметил повторяющийся маршрут и подготовил встречный ответ.`;
    const streak = streakOf(d.rounds, winner);
    if (streak >= 4) return `${team} уже забрали ${streak} раунда подряд. Сопернику срочно нужен ответ, иначе карта может ускользнуть.`;
    if (context?.comeback) return `Камбэк набирает обороты: ${team} сокращают отставание и заставляют ${other} нервничать.`;
    if (rec.hl?.label) return `${rec.hl.icon || '⭐'} ${rec.hl.label} — ключевой эпизод раунда. ${team} забирают важное очко.`;
    if (kills.length >= 4) return `На сервере жарко: ${kills.length} фрагов за раунд. ${team} оказываются сильнее в решающей перестрелке.`;
    if (plant) return `${team} грамотно доводят раунд до пост-планта и закрывают его.`;
    if (item.state.overtime) return `Каждый раунд на вес золота: ${team} выдерживают давление овертайма.`;
    return `${team} забирают раунд ${rec.r}. ${kills.length ? `В перестрелках было ${kills.length} фрагов` : 'обошлось без затяжной перестрелки'} — серия продолжается.`;
  }

  function analystLine(item, rec, context) {
    const d = item.state.v44Dynamics, m = item.match;
    const pressure = [1, 2].map(side => ({ side, value: d.sides[side]?.pressure || 0 })).sort((a, b) => b.value - a.value)[0];
    const winner = teamName(m, rec.winner), loserSide = rec.winner === 1 ? 2 : 1;
    const loser = teamName(m, loserSide);
    const streak = streakOf(d.rounds, rec.winner);
    if (context?.adapted) return `Аналитика: ${teamName(m, context.adapted.defender)} уже распознают повторяющиеся выходы на ${context.adapted.lane === 'MID' ? 'мид' : context.adapted.lane}. Следующий раунд покажет, успеет ли атака поменять рисунок.`;
    if (pressure.value >= .62) return `Аналитика: главный фактор сейчас — давление на ${teamName(m, pressure.side)}. При такой ситуации особенно важны хладнокровие и качество разменов.`;
    if (context?.comeback) return `Аналитика: ${winner} вернулись в игру после отставания в три раунда. Инициатива начинает переходить к ним.`;
    if (streak >= 4) return `Аналитика: серия ${winner} уже достигла ${streak} раундов. ${loser} нужно менять темп или экономику, иначе соперник закрепит преимущество.`;
    const buy = item.state.roundBuys?.[rec.r] || {};
    const winnerBuy = rec.winner === 1 ? buy.t1?.type : buy.t2?.type;
    const loserBuy = rec.winner === 1 ? buy.t2?.type : buy.t1?.type;
    if (['eco', 'deagle', 'pistol', 'save'].includes(winnerBuy) && ['full', 'half', 'hero', 'force'].includes(loserBuy)) return `Аналитика: ${winner} ломают экономический сценарий. После такого эко-апсета следующая закупка соперника может стать решающей.`;
    return null;
  }

  function moodFor(s) {
    if ((s.pressure || 0) >= .62) return 'Под серьёзным давлением';
    if ((s.momentum || 0) >= .75) return 'На кураже';
    if ((s.momentum || 0) >= .28) return 'Поймали ритм';
    if ((s.momentum || 0) <= -.75) return 'Потеряли инициативу';
    if ((s.momentum || 0) <= -.28) return 'Ищут ответ';
    return 'Ровная игра';
  }

  function processRound(item, rec, M) {
    const st = item.state, m = item.match, d = ensure(item);
    if (!d || !rec || d.lastProcessedRound === `${st.mapIndex}:${rec.r}`) return;
    d.lastProcessedRound = `${st.mapIndex}:${rec.r}`;
    const round = Number(rec.r) || Number(st.round) || 0;
    const oldScore1 = Number(st.map1) || 0, oldScore2 = Number(st.map2) || 0;
    const score1 = oldScore1 + (rec.winner === 1 ? 1 : 0);
    const score2 = oldScore2 + (rec.winner === 2 ? 1 : 0);

    [1, 2].forEach(side => {
      const ss = d.sides[side];
      if (ss.activePlan && ss.activePlan.roundsLeft > 0 && round > ss.activePlan.startedRound) {
        ss.activePlan.played++;
        if (rec.winner === side) ss.activePlan.wins++;
        ss.activePlan.roundsLeft--;
        if (ss.activePlan.roundsLeft <= 0) {
          const p = ss.activePlan;
          if (p.played > 0) addComment(item, `${teamName(m, side)}: план тренера ${p.wins > 0 ? 'принёс результат' : 'не сработал'} — ${p.wins}/${p.played} раундов после корректировки.`, 'coach');
          ss.activePlan = null;
        }
      }
      if (ss.read && round > ss.read.startedRound && round >= ss.read.untilRound) ss.read = null;
      ss.momentum = clamp((Number(ss.momentum) || 0) * .72 + (rec.winner === side ? .42 : -.42), -1.25, 1.25);
    });
    d.rounds.push(rec.winner);
    d.rounds = d.rounds.slice(-24);
    d.sides[1].pressure = pressureFor(item, 1, score1, score2, d.rounds);
    d.sides[2].pressure = pressureFor(item, 2, score1, score2, d.rounds);

    mistakeFromRound(item, rec, M);
    const adapted = readAttackPattern(item, rec, d);
    const diff1 = score1 - score2, diff2 = -diff1;
    const scoreDiff = side => side === 1 ? diff1 : diff2;
    [1, 2].forEach(side => {
      const ss = d.sides[side];
      const behind = scoreDiff(side) <= -3;
      if (!ss.activePlan && round - (ss.lastCoachRound || -99) >= 3 && (streakOf(d.rounds, side === 1 ? 2 : 1) >= 3 || (behind && recentWins(d.rounds, side === 1 ? 2 : 1, 5) >= 4))) {
        choosePlan(item, side, streakOf(d.rounds, side === 1 ? 2 : 1) >= 3 ? `После ${streakOf(d.rounds, side === 1 ? 2 : 1)} поражений подряд` : 'Команда заметно отстаёт', round);
      }
    });

    const comeback = (() => {
      const wasBehind = rec.winner === 1 ? oldScore1 <= oldScore2 - 3 : oldScore2 <= oldScore1 - 3;
      return wasBehind && streakOf(d.rounds, rec.winner) >= 2;
    })();
    const line = commentatorLine(item, rec, { comeback, adapted });
    addComment(item, line, 'commentary');
    const analysis = analystLine(item, rec, { comeback, adapted });
    if (analysis) addComment(item, analysis, 'analysis');
    [1, 2].forEach(side => {
      const ss = d.sides[side];
      ss.lastMood = moodFor(ss);
    });
    d.lastRound = round;
    d.lastScore = [score1, score2];
  }

  function prepareRound(item, prob) {
    const st = item?.state, m = item?.match;
    if (!st || !m) return { prob, modifier: 0 };
    const d = ensure(item), round = Number(st.round) || 1;
    const rounds = d.rounds.slice(-8);
    const p1 = sideModifier(item, 1, d, Number(st.map1) || 0, Number(st.map2) || 0, rounds, round);
    const p2 = sideModifier(item, 2, d, Number(st.map1) || 0, Number(st.map2) || 0, rounds, round);
    const raw = p1 - p2;
    const modifier = clamp(raw, -.03, .03);
    const adjusted = clamp((Number(prob) || .5) + modifier, .06, .94);
    d.lastModifier = { round, side1: p1, side2: p2, net: modifier, base: Number(prob) || .5, adjusted };
    return { prob: adjusted, modifier };
  }

  function sideMarkup(item, side) {
    const st = item.state, d = st.v44Dynamics, ss = d.sides[side], name = teamName(item.match, side);
    const mood = moodFor(ss);
    const momentumPct = Math.round((clamp((ss.momentum || 0) + 1.25, 0, 2.5) / 2.5) * 100);
    const pressurePct = Math.round(clamp(ss.pressure || 0, 0, 1) * 100);
    const streak = streakOf(d.rounds, side);
    const mistakes = Math.max(0, Number(ss.mistakes) || 0);
    const recentForm = d.rounds.slice(-5).map(w => w === side ? 'W' : 'L').join(' ');
    const coachName = teamData(name)?.coach?.name;
    const coachLabel = coachName && !/^(coach|—)$/i.test(coachName) ? coachName : 'тренерский штаб';
    const plan = ss.activePlan?.label || ss.read?.text || 'План не менялся';
    const planTag = ss.activePlan ? `ПЛАН ТРЕНЕРА · ${ss.activePlan.roundsLeft} РАУНДА` : ss.read ? 'АДАПТАЦИЯ СОПЕРНИКА' : 'ТАКТИКА';
    const streakLabel = streak ? `${streak} ${streak === 1 ? 'победа' : streak < 5 ? 'победы' : 'побед'} подряд` : 'серия не началась';
    return `<article class="v44-team-state ${side === 1 ? 'a' : 'b'}">
      <div class="v44-team-head"><b>${esc(name)}</b><span>${esc(mood)}</span></div>
      <div class="v44-team-meta"><span>🔥 ${esc(streakLabel)}</span><span>⚠ Ошибки: ${mistakes}</span></div>
      <div class="v44-meter-label"><span>Импульс (50% — нейтрально)</span><b>${momentumPct}%</b></div><div class="v44-meter"><i class="momentum" style="width:${momentumPct}%"></i></div>
      <div class="v44-meter-label"><span>Психологическое давление</span><b>${pressurePct}%</b></div><div class="v44-meter"><i class="pressure" style="width:${pressurePct}%"></i></div>
      <div class="v44-plan"><small>${planTag}</small><span>${esc(plan)}</span><em>${esc(coachLabel)}${recentForm ? ` · Форма: ${recentForm}` : ''}</em></div>
    </article>`;
  }
  function dynamicsMarkup(item, compact = false) {
    const st = item?.state, m = item?.match;
    if (!st || !m) return '';
    const d = ensure(item);
    const comments = (d.comments || []).slice(-6).reverse();
    const feed = comments.length ? comments.map(c => `<div class="v44-comment ${esc(c.type)}"><small>${c.type === 'coach' ? '🧠 ШТАБ' : c.type === 'mistake' ? '⚠ ОШИБКА' : c.type === 'analysis' ? '📊 АНАЛИТИК' : '🎙 КОММЕНТАТОР'} · РАУНД ${c.round || '—'}</small><span>${esc(c.text)}</span></div>`).join('') : '<div class="v44-comment-empty">После первых раундов здесь появятся реплики комментаторов и решения тренеров.</div>';
    const header = compact ? '🎙️ ДИНАМИКА МАТЧА' : '🎙️ КОММЕНТАТОРСКАЯ И ТАКТИЧЕСКИЙ ШТАБ';
    return `<section class="v44-dynamics ${compact ? 'compact' : ''}" aria-live="polite">
      <div class="v44-dynamics-head"><b>${header}</b><span>${esc(mapLabel(st))} · форма и давление</span></div>
      <div class="v44-team-grid">${sideMarkup(item, 1)}${sideMarkup(item, 2)}</div>
      <div class="v44-feed-head">ПОСЛЕДНИЕ РЕАКЦИИ</div><div class="v44-comment-feed">${feed}</div>
      <div class="v44-footnote">Импульс 50% — нейтральная отметка. План тренера меняет стиль микросимуляции на два раунда; влияние формы и давления на шанс раунда ограничено ±3 п.п.</div>
    </section>`;
  }

  function render(item) {
    const st = item?.state;
    if (!st) return;
    ensure(item);
    if (typeof document === 'undefined') return;
    let panel = document.getElementById('v44-match-dynamics');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'v44-match-dynamics';
      panel.className = 'v44-dynamics-host';
      const story = document.getElementById('v43-round-story-panel');
      const ticker = document.getElementById('match-live-ticker');
      if (story?.parentNode) story.insertAdjacentElement('afterend', panel);
      else if (ticker?.parentNode) ticker.parentNode.insertBefore(panel, ticker);
      else return;
    }
    panel.innerHTML = dynamicsMarkup(item, false);
  }

  // Встраиваем динамические модификаторы непосредственно перед микросимуляцией каждого раунда.
  const V34 = window.V34Round;
  if (V34?.play && !V34.play.__v44) {
    const originalPlay = V34.play;
    const wrapped = function (item, prob) {
      const adjusted = prepareRound(item, prob);
      const winner = originalPlay.call(this, item, adjusted.prob);
      try {
        const live = V34.live?.(item.id);
        const M = live?.maps?.[item.state.mapIndex];
        const rec = M?.rounds?.[Number(item.state.round) - 1];
        if (rec) processRound(item, rec, M);
        render(item);
      } catch (e) { console.warn('[v44 dynamics]', e); }
      return winner;
    };
    wrapped.__v44 = true;
    V34.play = wrapped;
  }

  // Обновляем динамику после штатной отрисовки live-матча.
  CS2.patch('broadcastRenderDetail', oldRender => function (item) {
      const result = oldRender.apply(this, arguments);
      try { render(item); } catch (e) { console.warn('[v44 render]', e); }
      return result;
    }, { id: '__v44' });

  if (H?.PAGES?.match && !H.PAGES.match.__v44) {
    const old = H.PAGES.match;
    const wrapped = function (id) {
      let html = old.apply(this, arguments);
      try {
        const found = H.findMatch?.(id), m = found?.m;
        const item = m ? H.liveItem?.(m.a, m.b) : null;
        if (item?.state && html.includes('<div class="mx-grid">')) html = html.replace('<div class="mx-grid">', `${dynamicsMarkup(item, true)}<div class="mx-grid">`);
      } catch (e) {}
      return html;
    };
    wrapped.__v44 = true; H.PAGES.match = wrapped;
  }
  if (H?.PAGES?.watch && !H.PAGES.watch.__v44) {
    const old = H.PAGES.watch;
    const wrapped = function () {
      let html = old.apply(this, arguments);
      try {
        const item = H.spectator?.direct?.();
        if (item?.state && html.includes('<div class="hs-grid2">')) html = html.replace('<div class="hs-grid2">', `${dynamicsMarkup(item, true)}<div class="hs-grid2">`);
      } catch (e) {}
      return html;
    };
    wrapped.__v44 = true; H.PAGES.watch = wrapped;
  }

  window.CS2MatchDynamics = {
    version: 44, ensure, prepareRound, processRound, render, buildMarkup: dynamicsMarkup,
    inferLane, pressureFor,
    maxProbabilityModifier: .03,
    features: ['win-streaks', 'momentum', 'psychological-pressure', 'player-mistakes', 'opponent-adaptation', 'coach-plans', 'two-voice-commentary']
  };
  console.info('[v44] match dynamics, coach reactions and commentator layer enabled');
})();
