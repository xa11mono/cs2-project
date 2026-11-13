/* v84 — редакция: интервью, медиадень, разбор финала, «цифра недели».
   Подключается к той же шине событий V29News (H.start / H.tournament), поэтому новости
   датируются моментом события и не дублируют существующие сюжеты. Все тексты выбираются
   детерминированно по событию: повторная обработка не создаёт копий. */
(function () {
  'use strict';
  const N = window.V29News; if (!N || !N.H) return;
  const W = window;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const pick = (arr, seed) => arr[h32(seed) % arr.length];
  const TEAMS = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const teamBy = n => TEAMS().find(t => t.name === n);
  const T = n => N.T ? N.T(n) : { t: 'team', v: n }, P = n => N.P ? N.P(n) : { t: 'player', v: n };
  const role = (team, r) => (teamBy(team)?.players || []).find(p => p.role === r)?.nick || null;
  const star = team => (teamBy(team)?.players || []).slice().sort((a, b) => (b.firepower || 0) - (a.firepower || 0))[0]?.nick || null;
  const coach = team => { const c = teamBy(team)?.coach; return typeof c === 'string' ? c : c?.name || null; };
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

  // ------------------------------------------------------------ интервью чемпиона
  const Q_CHAMP = {
    sweep: ['Мы были готовы к каждой карте. Когда всё работает — это видно по счёту.', 'Сегодня всё сложилось: подготовка, коммуникация, уверенность.', 'Без отданных карт в финале — это лучшее, что мы когда-либо играли.'],
    comeback: ['После первой карты мы просто сказали друг другу: играем свою игру. И это сработало.', 'Проиграли старт — не запаниковали. Это и отличает чемпионов.', 'Я горжусь тем, как ребята вернулись после проигранной карты.'],
    close: ['Это был нервный финал, решали буквально пара раундов.', 'Овертаймы, клатчи — именно за такие финалы мы любим CS.', 'Соперник заставил нас показать максимум. Респект им.'],
    first: ['Первый трофей — это особое чувство. Мы долго к нему шли.', 'Мечта сбылась. Это только начало.', 'Наконец-то! Столько финалов, и вот — мы чемпионы.'],
    repeat: ['Защитить титул сложнее, чем выиграть его впервые.', 'Мы не собираемся останавливаться.', 'Каждый турнир — новый вызов, и мы снова справились.']
  };
  const Q_LOSER = ['Обидно, но мы покажем, что это не случайность.', 'Нам не хватило деталей. Вернёмся сильнее.', 'Поздравляем соперника — сегодня они были лучше.', 'Мы проанализируем каждый раунд финала.'];
  const Q_MVP = ['Я просто делал свою работу — команда создавала мне пространство.', 'Индивидуальная награда приятна, но важнее всего — трофей.', 'Моя форма — заслуга всего штаба и тиммейтов.', 'Не думал о статистике, думал о победе.'];

  function finalType(d) {
    const maps = d.finalMaps || [];
    const champWins = maps.filter(m => m.w === d.champ).length, lost = maps.length - champWins;
    if (maps.some(m => m.ot) || maps.some(m => Math.abs((m.a || 0) - (m.b || 0)) <= 2)) return 'close';
    if (lost === 0 && maps.length >= 2) return 'sweep';
    if (maps.length && maps[0].w && maps[0].w !== d.champ) return 'comeback';
    return 'close';
  }
  const PH = (kind, vars, seed) => (W.CS2Phrases ? W.CS2Phrases.line(kind, vars, seed) : '');
  const headline = q => { const first = String(q || '').split(/(?<=[.!?])\s/)[0] || ''; return first.length > 70 ? first.slice(0, 67) + '…' : first; };
  function championInterview(d) {
    if (!d?.champ || !d.name) return;
    const igl = role(d.champ, 'IGL') || star(d.champ), mvp = N.mvpOf ? N.mvpOf(d.id) : null;
    const rank = Number(d.champRankBefore) || 0;
    const kind = d.firstTitle ? 'champ_first' : d.streak >= 2 ? 'champ_repeat' : rank > 8 ? 'champ_underdog' : { sweep: 'champ_sweep', comeback: 'champ_comeback', close: 'champ_close' }[finalType(d)] || 'champ_close';
    const seed = d.id || d.name, vars = { team: d.champ, opp: d.second || 'соперник', streak: d.streak || 2, rank: rank || '—' };
    const q1 = PH(kind, vars, seed + 'q1') || pick(Q_CHAMP.close, seed);
    const quotes = [`«${q1}» — ${igl || 'капитан'} (${d.champ}).`];
    if (mvp?.nick && mvp.nick !== igl) {
      const age = Number((teamBy(mvp.team)?.players || []).find(p => p.nick === mvp.nick)?.age) || 0;
      quotes.push(`«${PH(age && age <= 20 ? 'mvp_young' : 'mvp', { age, team: d.champ }, seed + 'mvp')}» — ${mvp.nick}, MVP турнира.`);
    }
    const c = coach(d.champ); if (c) quotes.push(`Тренер ${c}: «${PH('coach_title', vars, seed + 'c')}»`);
    N.add({ cat: 'interview', icon: '🎙️', imp: d.major ? 8 : 6, team: d.champ, player: igl || '', ev: d.id || undefined,
      id: `v84-int-${h32(seed + '|champ').toString(36)}`,
      title: `${igl || d.champ}: «${headline(q1)}»`,
      lead: `После победы на ${d.name} мы поговорили с игроками и тренером ${d.champ}.`,
      body: quotes, tags: [T(d.champ)].concat(igl ? [P(igl)] : []).concat(mvp?.nick ? [P(mvp.nick)] : []) });
    if (d.second) {
      const who = role(d.second, 'IGL') || star(d.second);
      const lost = (d.finalMaps || []).filter(m => m.w === d.second).length;
      const q = PH(lost === 0 ? 'runner_swept' : 'runner_close', { team: d.second, opp: d.champ }, seed + 'l');
      if (who) N.add({ cat: 'interview', icon: '🎙️', imp: 4, team: d.second, player: who, id: `v84-int-${h32(seed + '|second').toString(36)}`,
        title: `${who} (${d.second}): «${headline(q)}»`, lead: `Финалист ${d.name} оценивает свой турнир.`,
        body: [`«${q}»`], tags: [T(d.second), P(who)] });
    }
  }
  // ------------------------------------------------------------ разбор финала по картам
  function finalBreakdown(d) {
    const maps = d.finalMaps || []; if (!maps.length || !d.champ) return;
    const lines = maps.map((m, i) => `Карта ${i + 1} — ${m.map}: ${d.finalT1 || ''} ${m.a}:${m.b} ${d.finalT2 || ''}${m.ot ? ' (овертайм)' : ''} — ${m.w}.`);
    const decisive = maps[maps.length - 1];
    N.add({ cat: 'analytics', icon: '🧭', imp: 5, team: d.champ, id: `v84-brk-${h32((d.id || d.name) + '|brk').toString(36)}`,
      title: `Разбор финала ${d.name}: как ${d.champ} забрали трофей`,
      lead: `${d.champ} — ${d.second || 'финалист'} ${d.finalScore || ''}. Решающей стала ${decisive?.map || 'последняя карта'}.`,
      body: lines.concat(d.mapsLost === 0 ? ['Чемпион не отдал ни одной карты за весь плей-офф.'] : []), tags: [T(d.champ)].concat(d.second ? [T(d.second)] : []) });
  }
  // ------------------------------------------------------------ медиадень
  function mediaDay(d) {
    if (!d?.name || !Array.isArray(d.participants) || d.participants.length < 4) return;
    // Только для турнира, который действительно стартует сейчас (не задним числом после перемотки).
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    if (!ct || ct.completed || ct.name !== d.name) return;
    const ranked = d.participants.map(n => typeof n === 'string' ? n : n?.name).filter(Boolean).map(n => teamBy(n)).filter(Boolean)
      .sort((a, b) => (b.pts || 0) - (a.pts || 0));
    const fav = ranked[0], under = ranked[ranked.length - 1 - (h32(d.name) % Math.max(1, Math.min(4, ranked.length - 1)))];
    if (!fav) return;
    const fq = pick(['Мы приехали только за трофеем.', 'Давление фаворита? Мы к нему привыкли.', 'Главное — не недооценить никого в группе.', 'Подготовка была лучшей за сезон.'], d.name + 'f');
    const uq = pick(['Нам нечего терять — будем играть смело.', 'Хотим доказать, что заслужили место здесь.', 'Каждая карта против топов — шанс показать себя.', 'Мы изучили фаворитов и знаем, где их ловить.'], d.name + 'u');
    const fs = star(fav.name), us = under ? star(under.name) : null;
    N.add({ cat: 'interview', icon: '🎤', imp: d.major ? 7 : 5, team: fav.name, id: `v84-media-${h32(d.name + '|' + d.season).toString(36)}`,
      title: `Медиадень ${d.name}: фавориты и андердоги`,
      lead: `Перед стартом ${d.name} игроки ответили на вопросы журналистов.`,
      body: [`${fs || fav.name} (${fav.name}): «${fq}»`].concat(under && under !== fav ? [`${us || under.name} (${under.name}): «${uq}»`] : []),
      tags: [T(fav.name)].concat(under ? [T(under.name)] : []) });
  }
  // ------------------------------------------------------------ подключение к шине
  const baseTournament = N.H.tournament;
  N.H.tournament = d => {
    if (typeof baseTournament === 'function') baseTournament(d);
    try { championInterview(d); finalBreakdown(d); } catch (e) { console.warn('[v84 newsroom] tournament', e); }
  };
  const baseStart = N.H.start;
  N.H.start = d => {
    if (typeof baseStart === 'function') baseStart(d);
    try { mediaDay(d); } catch (e) { console.warn('[v84 newsroom] start', e); }
  };

  // ------------------------------------------------------------ «цифра недели»
  function weeklyNumber() {
    const st = typeof seasonState !== 'undefined' ? seasonState : null; if (!st || !W.HS?.stats) return;
    const now = Number(st.calendar?.currentMs) || Date.now(), wk = Math.floor(now / (7 * 86400000));
    if (st.v84WeeklyNumber === wk) return; st.v84WeeklyNumber = wk;
    let S; try { S = W.HS.stats(); } catch (e) { return; }
    const year = new Date(now).getFullYear();
    const rows = Object.values(S.P || {}).map(o => { const z = o.byYear?.[year]; if (!z || z.maps < 8) return null; const L = W.HS.line(z); return { nick: o.nick, team: o.team, L }; }).filter(Boolean);
    if (rows.length < 5) return;
    const kinds = [
      ['rating', 'Rating 3.0', r => r.L.rating, v => v.toFixed(2)],
      ['adr', 'ADR', r => r.L.adr, v => v.toFixed(1)],
      ['kast', 'KAST', r => r.L.kast, v => v.toFixed(1) + '%'],
      ['clutch', 'выигранных клатчей', r => r.L.clW || 0, v => String(Math.round(v))]
    ];
    const k = kinds[wk % kinds.length], best = rows.slice().sort((a, b) => k[2](b) - k[2](a))[0];
    N.add({ cat: 'stats', icon: '🔢', imp: 4, player: best.nick, team: best.team, id: `v84-num-${wk}`,
      title: `Цифра недели: ${k[3](k[2](best))} — ${k[1]} у ${best.nick}`,
      lead: `${best.nick} (${best.team || 'без команды'}) — лидер года по показателю «${k[1]}» среди игроков с 8+ картами на Tier-1.`,
      body: rows.slice().sort((a, b) => k[2](b) - k[2](a)).slice(1, 5).map((r, i) => `${i + 2}. ${r.nick} — ${k[3](k[2](r))}`),
      tags: [P(best.nick)].concat(best.team ? [T(best.team)] : []), ts: now });
    try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {}
  }
  try { (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if (!W.v57BatchCalendarSkip) weeklyNumber(); }, 6000); } catch (e) {}

  // ============================================================ большой пул ситуативных новостей
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const memo = () => { const s = ST(); if (!s) return {}; s.v84News = s.v84News || { cap: {}, streak: {}, ptsSnap: null, month: -1 }; return s.v84News; };
  function capOk(key, max) { const m = memo(); m.cap[key] = (m.cap[key] || 0) + 1; if (Object.keys(m.cap).length > 400) m.cap = {}; return m.cap[key] <= max; }
  const rankOf = n => { const r = TEAMS().filter(t => !t.isAcademy).slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = r.findIndex(t => t.name === n); return i < 0 ? 99 : i + 1; };
  const V = (arr, seed, vars) => fill(pick(arr, seed), vars);

  const TPL = {
    upset: { t: ['Сенсация: {w} обыгрывают {l}', '{w} шокируют {l} на {ev}', 'Апсет дня: {w} сильнее {l}', '{l} споткнулись о {w}', 'Никто не ставил на {w} — а они обыграли {l}'],
      l: ['Букмекеры давали {w} лишь {p}% — итог {sc}.', 'Аутсайдер с шансами {p}% забирает серию {sc} у №{lr} мира.', '{w} (№{wr}) переиграли {l} (№{lr}) со счётом {sc}.'] },
    comeback: { t: ['Камбэк: {w} отыгрываются против {l}', '{w} проиграли первую карту, но забрали серию', 'Характер {w}: разворот серии против {l}'],
      l: ['После поражения на {m1} {w} выиграли {rest} и закрыли серию {sc}.', 'Первая карта ушла {l}, но дальше игру диктовали {w} — {sc}.'] },
    ot: { t: ['Овертайм-триллер: {w} — {l} на {map}', '{map}: {s} после овертайма', 'Нервы на пределе: {w} дожимают {l} в овертайме'],
      l: ['Карта {map} закончилась со счётом {s} — {w} оказались хладнокровнее.', '{w} и {l} сыграли {rr} на {map}.'] },
    dblot: { t: ['{rr} на {map}: самая длинная карта турнира', '{otn} на {map}: {w} — {l} {s}'],
      l: ['Карта {map} потребовала нескольких овертаймов: {s} в пользу {w}.'] },
    stomp: { t: ['Разгром: {w} — {l} {s} на {map}', '{w} не оставили шансов {l} на {map}', '{l} провалили {map}: {s}'],
      l: ['{w} отдали всего {lr2} на {map}.', 'Один из самых односторонних результатов турнира: {s}.'] },
    bagel: { t: ['13:0! {w} всухую разбирают {l} на {map}', 'Бублик на {map}: {w} — {l} 13:0'],
      l: ['Редкий случай на профессиональной сцене: ни одного раунда для {l} на {map}.'] },
    favOut: { t: ['№{lr} мира {l} покидают {ev}', '{l} вылетают с {ev}', 'Ранний вылет фаворита: {l} завершают выступление'],
      l: ['Последний матч — {sc} против {w}.', '{w} поставили точку в турнире для {l}: {sc}.'] },
    winStreak: { t: ['{w}: {n} побед подряд', 'Серия {w} продолжается — уже {n} матчей без поражений', 'Кто остановит {w}? {n} побед подряд'],
      l: ['Последней жертвой стали {l} ({sc}).'] },
    loseStreak: { t: ['Кризис в {l}: {n} поражений подряд', '{l} не могут выиграть уже {n} матчей', 'Чёрная полоса {l} затянулась'],
      l: ['Очередное поражение — от {w} ({sc}). Вопросы к составу и тренерскому штабу звучат всё громче.'] },
    streakEnd: { t: ['{w} прерывают серию {l} из {n} побед', 'Конец серии: {l} проиграли впервые за {n} матчей'],
      l: ['{w} выиграли {sc} и остановили {l}.'] }
  };
  function matchStory(w, l, m, isBO1) {
    if (!w || !l || !m) return;
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    const ev = ct?.name || 'турнире', key = (ct?.name || '') + '|' + (m.stage || m.round || '') + '|' + w + '|' + l;
    const br = m.broadcastResult || {}, maps = Array.isArray(br.maps) ? br.maps : [];
    const sW = br.t1 === w ? br.series1 : br.series2, sL = br.t1 === w ? br.series2 : br.series1;
    const sc = Number.isFinite(sW) ? `${sW}:${sL}` : (m.score || '').replace('Счет: ', '');
    const wr = rankOf(w), lr = rankOf(l);
    const vars = { w, l, ev, sc, wr, lr };
    const tags = [T(w), T(l)];
    let p = 50; try { const o = W.calcMatchOdds?.(w, l, !!isBO1); if (o) p = Math.round(o.p1_win * 100); } catch (e) {}
    const add = (kind, extraVars, imp, cat) => {
      const tpl = TPL[kind], v = Object.assign({}, vars, extraVars || {});
      N.add({ cat: cat || 'match', icon: { upset: '⚡', comeback: '🔄', ot: '⏱️', dblot: '⏱️', stomp: '💥', bagel: '🍩', favOut: '🚪', winStreak: '🔥', loseStreak: '🧊', streakEnd: '⛔' }[kind] || '🎮',
        imp: imp || 5, team: w, id: `v84-m-${kind}-${h32(key + kind).toString(36)}`, title: V(tpl.t, key + kind + 't', v), lead: V(tpl.l, key + kind + 'l', v), tags });
    };
    // 1) апсет — по шансам до матча и разнице в рейтинге
    if (p <= 34 && lr <= 15 && wr > lr + 4 && capOk(`upset|${ev}`, 3)) {
      add('upset', { p }, p <= 22 ? 8 : 6);
      try { const it = (N.all ? N.all() : []).find(x => x.id === `v84-m-upset-${h32(key + 'upset').toString(36)}`); if (it && W.CS2Phrases) {
        const ws = role(w, 'IGL') || star(w), ls = role(l, 'IGL') || star(l);
        it.body = (it.body || []).concat([ws ? `«${PH('upset_win', { team: w, opp: l }, key + 'uw')}» — ${ws} (${w}).` : '', ls ? `«${PH('upset_loss', { team: l, opp: w }, key + 'ul')}» — ${ls} (${l}).` : ''].filter(Boolean)); } } catch (e) {}
    }
    // 2) камбэк в серии
    if (maps.length >= 3 && maps[0]?.winner === l && capOk(`cb|${ev}`, 2)) add('comeback', { m1: maps[0].map, rest: maps.slice(1).filter(x => x.winner === w).map(x => x.map).join(' и ') }, 5);
    // 3) карты: овертаймы и разгромы
    maps.forEach((x, i) => {
      const a = Number(x.t1Score), b = Number(x.t2Score); if (!Number.isFinite(a) || !Number.isFinite(b)) return;
      const hi = Math.max(a, b), lo = Math.min(a, b), mw = x.winner, ml = mw === w ? l : w, s = `${hi}:${lo}`;
      const pl = (k, a1, a2, a5) => (N.plural ? N.plural(k, a1, a2, a5) : a5);
      const otCount = Math.max(1, Math.ceil((hi - 13) / 3));
      const mv = { map: x.map, s, r: a + b, rr: `${a + b} ${pl(a + b, 'раунд', 'раунда', 'раундов')}`, otn: otCount === 2 ? 'Два овертайма' : otCount === 3 ? 'Три овертайма' : `${otCount} овертаймов`, lr2: `${lo} ${pl(lo, 'раунд', 'раунда', 'раундов')}`, w: mw, l: ml };
      if (hi >= 19 && capOk(`dblot|${ev}`, 1)) add('dblot', mv, 6);
      else if (x.overtime && capOk(`ot|${ev}`, 2)) add('ot', mv, 4);
      if (hi === 13 && lo === 0 && capOk(`bagel|${ev}`, 1)) add('bagel', mv, 6);
      else if (hi === 13 && lo <= 2 && capOk(`stomp|${ev}`, 1)) add('stomp', mv, 4);
    });
    // 4) серии побед/поражений
    const M = memo();
    const prevW = M.streak[w] || 0, prevL = M.streak[l] || 0;
    if (prevL >= 6) add('streakEnd', { n: prevL, w, l }, 6);
    M.streak[w] = prevW >= 0 ? prevW + 1 : 1;
    M.streak[l] = prevL <= 0 ? prevL - 1 : -1;
    if ([6, 10, 15, 20].includes(M.streak[w])) add('winStreak', { n: M.streak[w] }, 6, 'analytics');
    if ([-5, -8, -12].includes(M.streak[l])) add('loseStreak', { n: -M.streak[l] }, 5, 'analytics');
    // 5) вылет фаворита (топ-3) — когда команда больше не играет в турнире
    try {
      if (lr <= 3 && ct && !ct.completed && ct.placements?.[l] && capOk(`favout|${ev}`, 2)) add('favOut', {}, 7);
    } catch (e) {}
  }
  const baseAcc = W.accumulateMatchRating;
  if (typeof baseAcc === 'function' && !baseAcc.__v84) {
    const wrapped = function (w, l, isBO1, m) {
      const r = baseAcc.apply(this, arguments);
      try { matchStory(w, l, m, isBO1); } catch (e) { console.warn('[v84 newsroom] match', e); }
      return r;
    };
    wrapped.__v84 = true; W.accumulateMatchRating = wrapped;
  }

  // ------------------------------------------------------------ реакции на рынок
  const wrapH = (type, fn) => { const base = N.H[type]; N.H[type] = d => { if (typeof base === 'function') base(d); try { fn(d || {}); } catch (e) { console.warn('[v84 newsroom]', type, e); } }; };
  wrapH('transfer', d => {
    if (!d.player || !d.to || h32(d.player + d.to) % 3 === 0) return;
    const who = role(d.to, 'IGL') || star(d.to); if (!who || who === d.player) return;
    N.add({ cat: 'interview', icon: '💬', imp: 4, team: d.to, player: d.player, id: `v84-tr-${h32(d.player + '|' + d.to).toString(36)}`,
      title: V([`${who} о новичке {p}: «{q}»`, `В {to} прокомментировали приход {p}`, `{p} в {to}: первые слова капитана`], d.player, { p: d.player, to: d.to, q: pick(['Он закрывает именно ту роль, которой нам не хватало', 'Мы давно следили за его игрой', 'С ним у нас больше вариантов в тактике', 'Он голодный до побед — это главное'], d.player + 'q') }),
      lead: `${d.player} переходит из ${d.from || 'другой команды'} в ${d.to}${d.role ? ` на позицию ${d.role}` : ''}.`,
      body: [`«${pick(['Он закрывает именно ту роль, которой нам не хватало.', 'Мы давно следили за его игрой.', 'С ним у нас больше вариантов в тактике.', 'Он голодный до побед — это главное.'], d.player + 'q')}» — ${who}.`, `«${PH('signing', { team: d.to }, d.player + d.to)}» — ${d.player}.`], tags: [P(d.player), T(d.to)] });
  });
  wrapH('bench', d => {
    if (!d.player || !d.from || h32(d.player + 'b') % 2) return;
    N.add({ cat: 'interview', icon: '🪑', imp: 3, player: d.player, team: d.from, id: `v84-bn-${h32(d.player + '|' + d.from + '|' + nowMs()).toString(36)}`,
      title: `${d.player} об уходе на скамейку ${d.from}`, lead: `${d.player} прокомментировал решение клуба.`,
      body: [`«${PH('benched', { team: d.from }, d.player + d.from)}»`], tags: [P(d.player), T(d.from)] });
  });
  wrapH('coach', d => {
    if (!d.team || !d.to) return;
    N.add({ cat: 'interview', icon: '🧠', imp: 4, team: d.team, id: `v84-co-${h32(d.team + d.to).toString(36)}`,
      title: `Новый тренер ${d.team} ${d.to}: первые задачи`, lead: `${d.to} рассказал, с чего начнёт работу в ${d.team}.`,
      body: [`«${pick(['Сначала — коммуникация и роли. Тактика придёт следом.', 'Нам нужно вернуть уверенность на своих картах.', 'Я хочу, чтобы команда играла смелее в середине раунда.', 'Расширим маппул — сейчас он слишком узкий.'], d.team + d.to)}»`], tags: [T(d.team)] });
  });
  wrapH('retire', d => {
    if (!d.player) return;
    N.add({ cat: 'player', icon: '🎖️', imp: 5, player: d.player, team: d.team, id: `v84-rt-${h32(d.player).toString(36)}`,
      title: V(['Сцена прощается с {p}', '{p}: итоги карьеры', 'Коллеги о завершении карьеры {p}'], d.player, { p: d.player }),
      lead: `${d.player}${d.age ? ` (${d.age})` : ''} завершает карьеру. Вспоминаем ключевые моменты.`,
      body: [`«${pick(['Играть против него всегда было тяжело.', 'Один из самых умных игроков, с кем я играл.', 'Сцена станет беднее без него.'], d.player + 'r')}» — коллеги по сцене.`], tags: [P(d.player)].concat(d.team ? [T(d.team)] : []) });
  });
  wrapH('window-close', d => {
    const moves = (W.__v29WindowState?.moves) || [];
    if (moves.length < 2) return;
    const inc = {}; moves.forEach(m => { inc[m.to] = (inc[m.to] || 0) + 1; });
    const top = Object.entries(inc).sort((a, b) => b[1] - a[1])[0];
    N.add({ cat: 'analytics', icon: '📊', imp: 5, id: `v84-wc-${h32(String(nowMs())).toString(36)}`,
      title: `Итоги окна: самым активным стал ${top[0]}`, lead: `${top[0]} провели ${top[1]} ${top[1] === 1 ? 'сделку' : 'сделки'}. Всего переходов — ${moves.length}.`,
      body: moves.slice(0, 8).map(m => `• ${m.player}: ${m.from} → ${m.to}`), tags: [T(top[0])] });
  });
  wrapH('roster-lock', d => {
    if (!d.major) return;
    N.add({ cat: 'major', icon: '🗂️', imp: 5, id: `v84-rl-${h32(d.major).toString(36)}`, title: `${d.major}: составы участников`, lead: 'Ростер-лок пройден — заявки зафиксированы до конца Major.',
      body: TEAMS().filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0)).slice(0, 8).map(t => `${t.name}: ${(t.players || []).slice(0, 5).map(p => p.nick).join(', ')}`), tags: [] });
  });

  // ------------------------------------------------------------ еженедельно: движение в рейтинге, ежемесячно: мета карт
  function weeklyRanking() {
    const m = memo(), list = TEAMS().filter(t => !t.isAcademy);
    const snap = {}; list.forEach(t => { snap[t.name] = Number(t.pts) || 0; });
    const prev = m.ptsSnap; m.ptsSnap = snap;
    if (!prev) return;
    const deltas = list.map(t => ({ n: t.name, d: (snap[t.name] || 0) - (prev[t.name] ?? snap[t.name]) })).filter(x => Math.abs(x.d) >= 15).sort((a, b) => b.d - a.d);
    if (!deltas.length) return;
    const up = deltas[0], down = deltas[deltas.length - 1];
    N.add({ cat: 'ranking', icon: '📈', imp: 4, team: up.n, id: `v84-wr-${Math.floor(nowMs() / 6048e5)}`,
      title: `Обновление VRS: ${up.n} ${up.d > 0 ? '+' : ''}${Math.round(up.d)}${down && down.d < 0 ? `, ${down.n} ${Math.round(down.d)}` : ''}`,
      lead: `Новая публикация рейтинга VRS (выходит 4 раза за сезон) — главные изменения с прошлой публикации.`,
      body: deltas.slice(0, 5).map(x => `${x.n}: ${x.d > 0 ? '+' : ''}${Math.round(x.d)} (сейчас №${rankOf(x.n)})`).concat(down && down.d < 0 ? [`Сильнее всех потерял: ${down.n} (${Math.round(down.d)}).`] : []),
      tags: [T(up.n)].concat(down && down.d < 0 ? [T(down.n)] : []), ts: nowMs() });
  }
  function monthlyMeta() {
    const m = memo(), mon = new Date(nowMs()).getMonth(); if (m.month === mon) return; const first = m.month < 0; m.month = mon; if (first) return;
    let S; try { S = W.HS.stats(); } catch (e) { return; }
    const rows = Object.values(S.M || {}).sort((a, b) => b.n - a.n); if (rows.length < 3) return;
    const ot = rows.slice().sort((a, b) => b.ot / b.n - a.ot / a.n)[0];
    N.add({ cat: 'stats', icon: '🗺️', imp: 4, id: `v84-meta-${new Date(nowMs()).getFullYear()}-${mon}`,
      title: `Мета месяца: ${rows[0].map} — самая популярная карта`, lead: `${rows[0].map} сыграна ${rows[0].n} раз; реже всего выбирают ${rows[rows.length - 1].map}.`,
      body: rows.map(x => `${x.map}: ${x.n} карт, в среднем ${(x.rounds / x.n).toFixed(1)} раунда`).concat([`Больше всего овертаймов — на ${ot.map} (${Math.round(ot.ot / ot.n * 100)}%).`]), tags: [], ts: nowMs() });
  }
  try { (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => {
    if (W.v57BatchCalendarSkip) return;
    const m = memo(), wk = Math.floor(nowMs() / 6048e5);
    if (m.week !== wk) { m.week = wk; weeklyRanking(); }
    monthlyMeta();
  }, 7000); } catch (e) {}
  W.V84Newsroom = Object.freeze({ championInterview, finalBreakdown, mediaDay, weeklyNumber, matchStory, weeklyRanking, monthlyMeta });
})();
