/* v99 — календарь по квотам операторов, параллельные турниры Tier-1 и выбор, куда ехать.

   КАЛЕНДАРЬ (v29-core: SLOTS_V99; новая игра — сразу, старые сейвы — со следующего сезона)
   Основной календарь — 9 турниров: Valve — 2 Major (июнь, декабрь); ESL — 3 IEM (Katowice + два с ротацией городов) и
   один полный сезон ESL Pro League; BLAST — Bounty, Open, Rivals. Турниры других операторов идут ОДНОВРЕМЕННО с основными
   (те же даты): PGL (с BLAST Bounty), FISSURE Playground (с BLAST Open), Esports World Cup (с BLAST Rivals), StarLadder
   (с третьим IEM). Итого 13 турниров за сезон. Это полноценные турниры S-Tier: кубок, очки VRS, HLTV World Ranking,
   призовые, составы в архиве (титулы игроков и статистика). Разыгрываются движком параллельных турниров (v21).
   Поле параллельного турнира: 16 команд — 12 приглашений и 4 места через закрытый отбор (за 12 дней до старта).
   В сезонах со старым календарём (14 турниров) — прежний набор параллельных, включая BLAST Open и BLAST Rivals.

   ВЫБОР: КУДА ЕХАТЬ — И ЕХАТЬ ЛИ ВООБЩЕ
   Обязательных турниров нет — нужны очки VRS. За 24 дня до турнира каждая приглашённая команда решает:
   • если турниров два — какой выбрать: призовые (с убывающей отдачей), престиж оператора, партнёрство с организатором
     (партнёр ESL или BLAST приглашается всегда и предпочитает своего оператора), гонка за Grand Slam (IEM/ESL Pro League),
     сила поля (команде середины топа слабее поле — больше шансов на титул и очки VRS), регион, характер клуба;
   • отказаться: усталость состава, плотный график (3+ турнира за 35 дней), подготовка к более важному турниру, который
     начинается в течение двух недель (Major, IEM, ESL Pro League при шансе на Grand Slam). Партнёр организатора
     отказывается вдвое реже; от Major и от IEM/ESL при шансе на Grand Slam не отказываются. Освободившееся приглашение
     получает следующая команда. О заметных выборах и отказах — новости.

   МЕНЕДЖЕР (страница «Выбор турниров», меню «Карьера»)
   • Все турниры сезона: даты, призовые, кто едет (логотипы участников), кто отказался и почему, партнёрство, Grand Slam.
   • «Едем сюда», «Пропустить турнир» — до старта отборов основного турнира / до старта параллельного.
   • Нет приглашения — «Регистрация на отбор»: без регистрации клуб менеджера в отборы не попадает. Если менеджер не
     выбрал турнир к сроку, выбирает ассистент — напоминание в задачах главного окна.
   Хранение: seasonState.v99 { season, made, reg, mine, slots }, у шага календаря — step.v99 { choices, why, away, mainInv,
   parPriority, parInv, parId }. */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31;
  if (!H || typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const esc = H.esc, logo = H.logo || (() => ''), DAY = 864e5;
  const DECIDE_DAYS = 24, QUAL_DAYS = 12, INV = 12;
  const $ = id => document.getElementById(id);
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const me = () => { try { return (V && V.managed()) || ''; } catch (e) { return ''; } };
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const ranked = () => pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const byName = n => teams.find(t => t && t.name === n) || null;
  const sched = () => seasonState.seasonSchedule || [];
  const fdate = ms => ms ? new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—';
  const money = v => v >= 1e6 ? '$' + (Math.round(v / 1e5) / 10).toString().replace('.', ',') + 'M' : '$' + Math.round(v / 1000) + 'k';
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const news = it => { try { W.V29News && W.V29News.add && W.V29News.add(it); } catch (e) {} };
  const save = () => { try { saveSeasonState(); } catch (e) {} };
  const S = () => {
    const s = seasonState.v99 = seasonState.v99 || {};
    if (s.season !== season()) { s.season = season(); s.made = {}; s.reg = {}; s.mine = {}; }
    s.made = s.made || {}; s.reg = s.reg || {}; s.mine = s.mine || {};
    return s;
  };

  /* ------------------------------------------------------------ параллельные турниры сезона */
  // slots — основные турниры (номер 1–14), с которыми параллельный может совпасть по датам: берётся первый, у которого
  // другой оператор (BLAST Rivals не ставится на одни даты с BLAST Bounty) и который не Major
  // v99-календарь (2 Major, 3 IEM, ESL Pro League, BLAST Bounty/Open/Rivals): другие операторы — параллельно
  // (target — какой основной турнир, rot — названия по сезонам); old — только в сезонах со старым календарём (14 слотов)
  const PAR = [
    { key: 'pgl', org: 'PGL', rot: ['PGL Astana', 'PGL Bucharest', 'PGL Cluj-Napoca'], target: /^BLAST Bounty/i, slots: [4, 9, 7], kind: 'elite', format: 'single', city: 'Астана', region: 'AS' },
    { key: 'fissure', org: 'FISSURE', base: 'FISSURE Playground', target: /^BLAST Open/i, slots: [5, 6, 4], kind: 'elite', format: 'double', city: 'Белград', region: 'EU' },
    { key: 'ewc', org: 'EWC', base: 'Esports World Cup', target: /^BLAST Rivals/i, slots: [10, 9], kind: 'elite', format: 'single', city: 'Эр-Рияд', region: 'ME' },
    { key: 'starladder', org: 'StarLadder', rot: ['StarLadder StarSeries Budapest', 'StarLadder Budapest Masters'], target: 8, slots: [11, 6, 12], kind: 'elite', format: 'double', city: 'Будапешт', region: 'EU' },
    { key: 'blastopen', org: 'BLAST', base: 'BLAST Open Lisbon', old: true, slots: [3, 9, 6], kind: 'elite', format: 'single', city: 'Лиссабон', region: 'EU' },
    { key: 'rivals', org: 'BLAST', base: 'BLAST Rivals', old: true, slots: [12, 6, 13, 9], kind: 'regular', format: 'single', city: 'Гонконг', region: 'AS' }
  ];
  const newCal = () => { try { return !!(W.CS2V99Calendar && W.CS2V99Calendar(season())); } catch (e) { return false; } };
  const baseOf = d => d.rot ? d.rot[h32('v99par|' + d.key + '|' + season()) % d.rot.length] : d.base;
  // партнёры операторов (долгосрочные контракты): приглашаются всегда и предпочитают своего оператора
  const PARTNERS = {
    ESL: ['Team Vitality', 'NAVI', 'G2', 'FAZE', 'Team Liquid', 'MOUZ', 'Team Spirit', 'Team Falcons', 'FURIA', 'Astralis', 'NIP', 'fnatic'],
    BLAST: ['Team Vitality', 'NAVI', 'FAZE', 'Team Liquid', 'Astralis', 'G2', 'HEROIC', 'MOUZ', 'Team Falcons', 'The Mongolz', 'Aurora']
  };
  const orgOf = name => { const n = String(name || ''); return /IEM|ESL|Intel/i.test(n) ? 'ESL' : /BLAST/i.test(n) ? 'BLAST' : /PGL/i.test(n) ? 'PGL' : /StarLadder|StarSeries/i.test(n) ? 'StarLadder' : /FISSURE/i.test(n) ? 'FISSURE' : /Esports World Cup/i.test(n) ? 'EWC' : /CCT/i.test(n) ? 'CCT' : /Thunderpick/i.test(n) ? 'Thunderpick' : /Major/i.test(n) ? 'Valve' : '—'; };
  const isPartner = (team, org) => (PARTNERS[org] || []).includes(team);
  const prizeOf = (name, kind) => { try { return W.CS2Realism.prizeFor(name, kind); } catch (e) { return kind === 'major' ? 1250000 : kind === 'elite' ? 500000 : 250000; } };
  const regionOf = t => { try { const r = W.v35Region ? W.v35Region(t) : 'EU'; return r === 'AM' ? 'AM' : r === 'AS' ? 'AS' : 'EU'; } catch (e) { return 'EU'; } };
  const parId = d => `T1-${season()}-${d.key}`;
  const parEvent = d => (seasonState.parallelSchedule || []).find(e => e && e.id === parId(d)) || null;
  const qualId = d => `T1Q-${season()}-${d.key}`;
  const qualEvent = d => (seasonState.parallelSchedule || []).find(e => e && e.id === qualId(d)) || null;
  // номер основного турнира, с которым совпадает параллельный (выбирается один раз за сезон)
  function slotOf(d) {
    const s = S(); s.slots = s.slots || {};
    // привязка запоминается вместе с «подписью» календаря: при загрузке новой игры расписание сначала строится по старому
    // шаблону (14 турниров) и лишь потом переписывается — привязка к старому шаблону не должна оставаться
    const sig = sched().length + ':' + sched().slice(1).map(x => x && x.name).join('|');
    if (s.slotsSig !== sig) { if (!Object.values(sched()).some(x => x && x.v99)) s.slots = {}; s.slotsSig = sig; }
    if (s.slots[d.key] != null) return s.slots[d.key];
    const used = new Set(Object.values(s.slots)), nc = newCal();
    sched().forEach((st, i) => { if (st && st.v99) { used.add(i); if (st.v99.parId === parId(d)) { s.slots[d.key] = i; } } });
    if (s.slots[d.key] != null) return s.slots[d.key];
    if (nc && d.old) return null;
    const ok = i => { const st = sched()[i]; return st && st.calendar && st.type !== 'major' && orgOf(st.name) !== d.org && !used.has(i); };
    let pick = null;
    if (nc) { const sc = sched(); pick = typeof d.target === 'number' ? (ok(d.target) ? d.target : null) : (sc.findIndex((st, i) => i > 0 && st && d.target.test(String(st.name || '')) && ok(i))); if (pick < 0) pick = null; }
    else pick = d.slots.find(ok);
    if (pick == null) return null;
    if (sched().length > 10) s.slots[d.key] = pick;   // расписание сезона уже построено — запоминаем
    return pick;
  }
  // окно уже решено — привязка из решения (не зависит от названий и пересчёта слотов)
  function parDef(i) {
    const x = sched()[i] && sched()[i].v99;
    if (x) return x.parId ? (PAR.find(d => parId(d) === x.parId) || null) : null;
    return PAR.find(d => slotOf(d) === i) || null;
  }
  function parInfo(d) {
    const slot = slotOf(d); if (slot == null) return null;
    const st = sched()[slot]; if (!st || !st.calendar) return null;
    const start = Number(st.calendar.startMs) || 0, dur = Math.max(4, Math.min(7, Number(st.calendar.durationDays) || 5));
    const y = 2026 + season() - 1;
    const base = baseOf(d), CITY = { 'PGL Bucharest': 'Бухарест', 'PGL Cluj-Napoca': 'Клуж-Напока', 'PGL Astana': 'Астана' };
    return { d, name: `${base} ${y}`, start, end: start + dur * DAY, prize: prizeOf(`${base} ${y}`, d.kind), kind: d.kind, org: d.org, city: CITY[base] || d.city, region: base === 'PGL Astana' ? 'AS' : d.region, slot };
  }

  /* ------------------------------------------------------------ ценность турнира для команды */
  function gsProgress(team) { try { const r = W.V33Awards.race(); const row = (r.rows || []).find(x => x.team === team); return row ? row.n : 0; } catch (e) { return 0; } }
  const isGS = name => /\biem\b|intel|esl pro league/i.test(String(name || ''));
  function avgRank(list) { const r = ranked(); const xs = list.map(n => r.findIndex(t => t.name === n) + 1).filter(x => x > 0); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 20; }
  function valueOf(ev, team, rank, fieldAvg) {
    const why = [];
    // призовые — с убывающей отдачей ($1M → 6, $500k → 4.2): разница фондов не перевешивает всё остальное
    let v = 6 * Math.sqrt(ev.prize / 1e6); why.push(['призовые', 0]);
    if (ev.kind === 'major') v += 2;
    if (isPartner(team, ev.org)) { v += 5; why.push(['партнёр организатора', 5]); }
    if (isGS(ev.name)) { const g = gsProgress(team); const b = g >= 2 ? 14 : g === 1 ? 4 : 0; if (b) { v += b; why.push([g >= 2 ? 'шанс на Grand Slam' : 'гонка за Grand Slam', b]); } }
    // престиж оператора и серии
    v += ({ ESL: 2, BLAST: 1.5, EWC: 1.5, PGL: 1, Valve: 3, StarLadder: 0.5, FISSURE: 0.5 })[ev.org] || 0;
    // сила поля: шанс на титул и очки VRS растёт с отрывом от среднего участника, но с насыщением — топ-команде оба
    // поля «по силам», команде середины топа слабое поле даёт заметно больше
    const chance = 1 / (1 + Math.exp(-(fieldAvg - rank) / 3)), f = 4 * chance; v += f; if (chance > 0.75 && rank > 4) why.push(['слабее поле — больше шансов на титул и очки VRS', f]);
    const t = byName(team); if (t && regionOf(t) === ev.region) { v += 1.5; why.push(['свой регион', 1.5]); }
    v += ((h32(team + '|' + ev.name) % 300) / 100) - 1.5;   // характер клуба
    why.sort((a, b) => b[1] - a[1]);
    return { v, why: why.filter(x => x[0] !== 'призовые').map(x => x[0]) };
  }

  /* ------------------------------------------------------------ списки приглашений */
  let origInvite = null;
  function mainInvitesRaw(st, n) {
    try { if (origInvite) return origInvite(n, st) || []; } catch (e) {}
    return ranked().slice(0, n).map(t => t.name);
  }
  function parPriority(ev) {
    const sc = t => (t.pts || 0) + (isPartner(t.name, ev.org) ? 90 : 0) + (regionOf(t) === ev.region ? 20 : 0);
    return ranked().slice(0, 45).sort((a, b) => sc(b) - sc(a)).map(t => t.name);
  }
  const mainEvent = (i, st) => ({ name: st.name, prize: prizeOf(st.name, st.type), kind: st.type, org: orgOf(st.name), region: /Dallas|Americas|Rio/i.test(st.name) ? 'AM' : /Chengdu|Singapore|Shanghai|Astana|Asia/i.test(st.name) ? 'AS' : 'EU' });

  /* ------------------------------------------------------------ решение окна */
  /* отказ от турнира: усталость состава, плотный график, подготовка к более важному турниру вскоре после этого.
     Решение детерминировано (зерно — команда и турнир): «склонность» отказаться против порога; партнёр организатора
     отказывается вдвое реже, от Major и от IEM/ESL Pro League при шансе на Grand Slam не отказываются. */
  function recentEvents(team, days) {
    let A = {}; try { A = W.hubArchiveExport ? W.hubArchiveExport() : {}; } catch (e) {}
    const from = now() - days * DAY;
    return Object.values(A).filter(x => x && !x.show && !x.qual && x.prestige !== 'qual' && (+x.ge || +x.gs || 0) >= from && (x.results || []).some(r => r && r.n === team)).length;
  }
  function nextBig(i, endMs, team) {
    const sc = sched();
    for (let j = i + 1; j < sc.length; j++) {
      const st = sc[j]; if (!st || !st.calendar) continue;
      const st0 = +st.calendar.startMs || 0; if (st0 - endMs > 14 * DAY) break;
      if (st0 < endMs) continue;
      if (st.type === 'major' || (isGS(st.name) && gsProgress(team) >= 1) || (/^IEM/i.test(st.name) && st.type === 'elite')) return st;
    }
    return null;
  }
  function skipReason(team, ev, i, endMs) {
    if (ev.kind === 'major') return null;
    if (isGS(ev.name) && gsProgress(team) >= 1) return null;
    const t = byName(team); if (!t) return null;
    const st = (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
    const fat = st.length ? st.reduce((a, p) => a + (+p.fatigue || 0), 0) / st.length : 0;
    const k = isPartner(team, ev.org) ? 0.5 : 1, roll = (h32('skip|' + team + '|' + ev.name) % 1000) / 1000;
    if (fat >= 45 && roll < 0.7 * k) return 'усталость состава';
    if (recentEvents(team, 35) >= 3 && roll < 0.5 * k) return 'плотный график';
    const big = nextBig(i, endMs, team);
    if (big && !isGS(ev.name) && roll < 0.45 * k) return 'подготовка к ' + String(big.name).replace(/\s+\d{4}$/, '');
    return null;
  }
  function decide(i) {
    const st = sched()[i]; if (!st || st.type === 'major' || !st.calendar) return false;
    const d = parDef(i), info = d ? parInfo(d) : null;
    const r = ranked(), rankOf = n => r.findIndex(t => t.name === n) + 1 || 99;
    const mainInv = mainInvitesRaw(st, INV);
    const pp = info ? parPriority(info) : [], parInv = pp.slice(0, INV);
    // ожидаемое поле параллельного турнира: в основном большинство приглашённых остаётся в основном — оценка по тем,
    // кто приглашён в параллельный, но не в основной (70%), и по всем приглашённым (30%)
    const mEv = mainEvent(i, st), mAvg = avgRank(mainInv), pAvg = info ? 0.7 * avgRank(pp.filter(n => !mainInv.includes(n)).slice(0, INV)) + 0.3 * avgRank(parInv) : 0;
    const choices = {}, why = {}, mgr = me(), mine = S().mine[i];
    const mEnd = +st.calendar.endMs || (+st.calendar.startMs + 7 * DAY);
    mainInv.concat(parInv.filter(n => !mainInv.includes(n))).forEach(n => {
      if (n === mgr && mine) { choices[n] = mine; why[n] = ['решение менеджера']; return; }
      const inM = mainInv.includes(n), inP = parInv.includes(n);
      let c = inM ? 'main' : 'par', w = [];
      if (inM && inP) { const a = valueOf(mEv, n, rankOf(n), mAvg), b = valueOf(info, n, rankOf(n), pAvg); c = b.v > a.v ? 'par' : 'main'; w = (b.v > a.v ? b : a).why; }
      const ev = c === 'main' ? mEv : info, skip = skipReason(n, ev, i, c === 'main' ? mEnd : info.end);
      if (skip) { c = 'none'; w = [skip]; }
      if (!w.length) w = [c === 'par' ? 'призовые и престиж' : 'престиж серии'];
      choices[n] = c; why[n] = n === mgr ? ['решил ассистент: ' + (w[0] || (c === 'none' ? 'пропуск' : 'выгоднее'))] : w;
    });
    st.v99 = { at: now(), parId: d ? parId(d) : null, mainInv, parPriority: pp, choices, why, mAvg, pAvg, solo: !d };
    apply(i);
    S().made[i] = true;
    announce(i);
    return true;
  }
  // пересчёт поля по выборам (вызывается и при смене решения менеджером до срока)
  function apply(i) {
    const st = sched()[i], d = parDef(i), x = st && st.v99; if (!x) return;
    const mgr = me(), c = x.choices;
    if (mgr && S().mine[i]) c[mgr] = S().mine[i];
    const mainGoing = x.mainInv.filter(n => c[n] !== 'par' && c[n] !== 'none');
    const away = x.mainInv.filter(n => c[n] === 'par' || c[n] === 'none');
    if (mgr && (S().mine[i] === 'par' || S().mine[i] === 'none') && !away.includes(mgr)) away.push(mgr);
    x.away = away;
    if (!d) return;
    const info = parInfo(d);
    const parInv = x.parPriority.filter(n => !mainGoing.includes(n) && c[n] !== 'none' && !(n === mgr && S().mine[i] && S().mine[i] !== 'par')).slice(0, INV);
    x.parInv = parInv;
    ensurePar(info, parInv);
  }
  // параллельный турнир и его отбор — в расписании фоновых турниров
  function ensurePar(info, invites) {
    const S0 = seasonState; S0.parallelSchedule = S0.parallelSchedule || [];
    let ev = parEvent(info.d), q = qualEvent(info.d);
    const locked = ev && ev.status !== 'scheduled';
    if (!q) {
      const qs = Math.max(now() + DAY, info.start - QUAL_DAYS * DAY);
      q = { id: qualId(info.d), season: season(), year: 2026 + season() - 1, tier: '2', kind: 'tier2', name: `${info.name} Closed Qualifier`, fieldProfile: 'medium', startMs: qs, endMs: qs + 3 * DAY, prize: 20000, size: 16, pointsMult: 0.3, participants: [], format: 'single', status: 'scheduled', currentRound: 0, matches: [], results: [], standings: [], winner: null, nextRoundAt: qs, academyOnly: false, fieldVersion: 5, v99q: info.d.key, organizer: info.org, region: 'EU' };
      S0.parallelSchedule.push(q);
    }
    if (q.status === 'scheduled') {
      const used = new Set(invites); const mainStep = sched()[info.slot], mainGo = new Set(((mainStep && mainStep.v99 && mainStep.v99.mainInv) || []).filter(n => !(mainStep.v99.away || []).includes(n)));
      const mgr = me(), regOk = mgr && S().reg['P:' + info.d.key];
      let pool = ranked().map(t => t.name).filter(n => !used.has(n) && !mainGo.has(n) && n !== mgr);
      const list = (regOk && !used.has(mgr) ? [mgr] : []).concat(pool.slice(0, 16)).slice(0, 16);
      if (JSON.stringify(list) !== JSON.stringify(q.participants || [])) { q.participants = list; delete q.br; }
    }
    if (!ev) {
      ev = { id: parId(info.d), season: season(), year: 2026 + season() - 1, tier: '1', kind: info.kind, name: info.name, fieldProfile: 'elite', startMs: info.start, endMs: info.end, prize: info.prize, size: 16, participants: [], format: info.d.format, status: 'scheduled', currentRound: 0, matches: [], results: [], standings: [], winner: null, nextRoundAt: info.start, academyOnly: false, fieldVersion: 5, v99: info.d.key, organizer: info.org, city: info.city, region: info.region, location: info.city };
      S0.parallelSchedule.push(ev); S0.parallelSchedule.sort((a, b) => a.startMs - b.startMs);
    }
    if (!locked) {
      // 12 приглашений + 4 из отбора; пока отбор не сыгран — лучшие из его участников (предварительно)
      const qTop = q.status === 'completed' ? (q.placements || []).slice(0, 4) : (q.participants || []).slice().sort((a, b) => (byName(b)?.pts || 0) - (byName(a)?.pts || 0)).slice(0, 4);
      const field = invites.concat(qTop.filter(n => !invites.includes(n))).slice(0, 16);
      if (JSON.stringify(field) !== JSON.stringify(ev.participants || [])) { ev.participants = field; delete ev.br; ev.v99Final = q.status === 'completed'; }
    }
    return ev;
  }
  function announce(i) {
    const st = sched()[i], x = st && st.v99; if (!x) return;
    const r = ranked(), d = parDef(i), info = d ? parInfo(d) : null;
    const skips = Object.keys(x.choices).filter(n => x.choices[n] === 'none' && n !== me() && (r.findIndex(t => t.name === n) + 1) <= 12);
    if (skips.length) news({ cat: 'tournament', icon: '🛌', imp: 5, title: `${skips.slice(0, 3).join(', ')} пропуска${skips.length > 1 ? 'ют' : 'ет'} ${st.name}${info ? ' и ' + info.name : ''}`, lead: 'Отказ от приглашения: место получает следующая команда.', body: skips.slice(0, 4).map(n => `${n}: ${(x.why[n] || ['решение клуба']).join(', ')}.`), tags: skips.slice(0, 3).map(n => ({ t: 'team', v: n })) });
    if (!info) return;
    const movers = x.mainInv.filter(n => x.choices[n] === 'par' && n !== me() && (r.findIndex(t => t.name === n) + 1) <= 12);
    const gsStay = x.mainInv.filter(n => x.choices[n] === 'main' && (x.why[n] || []).some(w => /Grand Slam/.test(w)));
    if (movers.length) news({ cat: 'tournament', icon: '🧭', imp: 6, title: `${movers.slice(0, 3).join(', ')} выбирают ${info.name}`, lead: `Турниры идут одновременно: ${movers.length > 1 ? 'клубы предпочли' : 'клуб предпочёл'} ${info.name} вместо ${st.name}.`, body: movers.slice(0, 4).map(n => `${n}: ${(x.why[n] || ['так выгоднее']).join(', ')}.`), tags: movers.slice(0, 3).map(n => ({ t: 'team', v: n })) });
    gsStay.forEach(n => news({ cat: 'tournament', icon: '🥇', imp: 6, title: `${n} едут на ${st.name}: на кону Grand Slam`, lead: `Две победы в сериях IEM и ESL Pro League — ${n} не упускают шанс и пропускают ${info.name}.`, body: [], tags: [{ t: 'team', v: n }] }));
  }

  /* ------------------------------------------------------------ для v21: кого не пускать в отбор/добор основного турнира */
  function excluded(step, name, kind) {
    const st = sched()[step]; if (!st) return false;
    if (st.v99 && (st.v99.away || []).includes(name)) return true;
    // команда уже в составе параллельного турнира этого окна или в его отборе — в основной не попадает
    const d = parDef(step);
    if (d) { const ev = parEvent(d), q = qualEvent(d); if ((ev && (ev.participants || []).includes(name)) || (q && (q.participants || []).includes(name))) return true; }
    const mgr = me(); if (!mgr || name !== mgr) return false;
    const mine = S().mine[step]; if (mine === 'par' || mine === 'none') return true;
    if (kind === 'qual' || kind === 'atlarge') return !S().reg['M:' + step];
    return false;
  }
  W.CS2TourChoice = { excluded, decide, apply, PAR, PARTNERS, valueOf, windows: () => windows(), state: S };
  (function hookInvites(n) {
    const f = W.CS2InviteList; if (typeof f !== 'function') { if (n < 40) setTimeout(() => hookInvites(n + 1), 500); return; }
    if (f.__v99) return; origInvite = f;
    const w = function (k, st) {
      // с запасом: в окне с параллельным турниром до 32 команд заняты в нём и в его отборе
      const list = f.call(this, (Number(k) || 12) + 60, st) || [];
      if (!st) return list.slice(0, k);
      const i = sched().indexOf(st);
      return list.filter(n => !(i > 0 && excluded(i, n, 'invite'))).slice(0, k);
    };
    w.__v99 = true; W.CS2InviteList = w; try { if (W.CS2Tiers) W.CS2Tiers.inviteList = w; } catch (e) {}
  })(0);

  /* ------------------------------------------------------------ архив: составы участников (титулы игроков, статистика) */
  (function hookArchive(n) {
    const f = W.hubArchiveParallel; if (typeof f !== 'function') { if (n < 40) setTimeout(() => hookArchive(n + 1), 500); return; }
    if (f.__v99) return;
    const w = function (ev) {
      const r = f.apply(this, arguments);
      try {
        if (ev && ev.v99) {
          const id = 'P-' + ev.id, snap = W.hubArchiveGet ? W.hubArchiveGet(id) : null;
          if (snap) {
            const rost = snap.rost && typeof snap.rost === 'object' ? snap.rost : (snap.rost = {});
            (ev.participants || []).forEach(nm => { const t = byName(nm); if (!t || (rost[nm] && rost[nm].length >= 5)) return;
              const st = (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER')).slice(0, 5);
              rost[nm] = st.map(p => ({ nick: p.nick, role: p.role, firepower: +p.firepower || 0, clutch: +p.clutch || 0, utility: +p.utility || 0, tacticalIQ: +p.tacticalIQ || 0, country: p.country || '', flag: p.flag || '', age: p.age || null })); });
            snap.city = ev.city; snap.organizer = ev.organizer;
            W.hubArchivePersist && W.hubArchivePersist(id);
          }
        }
      } catch (e) { console.warn('[v99 archive]', e); }
      return r;
    };
    w.__v99 = true; W.hubArchiveParallel = w;
  })(0);

  // даты основного турнира двигает раскладка календаря (конец предыдущего турнира + отдых) — параллельный турнир и его
  // отбор, пока не начались, идут за ним: турниры должны совпадать по датам
  function align(d, info) {
    const t0 = now(), ev = parEvent(d), q = qualEvent(d), target = info.start;
    if (!target || target <= t0) return;
    if (ev && ev.status === 'scheduled' && Math.abs((+ev.startMs || 0) - target) > 3600e3) {
      const dur = (+ev.endMs || target) - (+ev.startMs || target) || 5 * DAY;
      ev.startMs = target; ev.endMs = target + dur; ev.nextRoundAt = target; delete ev.br;
    }
    const qs = Math.max(t0 + DAY, target - QUAL_DAYS * DAY);
    if (q && q.status === 'scheduled' && +q.startMs > t0 && Math.abs((+q.startMs || 0) - qs) > 3600e3) { q.startMs = qs; q.endMs = qs + 3 * DAY; q.nextRoundAt = qs; delete q.br; }
  }
  /* ------------------------------------------------------------ ежедневный ход */
  function tick() {
    const t0 = now(), s = S();
    // окна без параллельного турнира: отказы (усталость, график, подготовка) — тоже за 24 дня
    sched().forEach((st, i) => {
      if (!i || !st || st.type === 'major' || !st.calendar || s.made[i] || st.v99 || parDef(i)) return;
      const start = +st.calendar.startMs || 0; if (start > t0 && start - t0 <= DECIDE_DAYS * DAY) decide(i);
    });
    PAR.forEach(d => {
      const info = parInfo(d); if (!info || !info.start) return;
      const i = info.slot, st = sched()[i]; if (!st || st.type === 'major') return;
      if (info.start <= t0 && !st.v99) return;                                   // окно прошло до v99
      if (!s.made[i] && info.start - t0 <= DECIDE_DAYS * DAY && info.start > t0) decide(i);
      else if (st.v99) {
        align(d, info);
        // отбор параллельного турнира завершён — финальный состав
        const q = qualEvent(d), ev = parEvent(d);
        if (q && q.status === 'completed' && ev && ev.status === 'scheduled' && !ev.v99Final) apply(i);
      }
    });
  }
  (function hookDaily() {
    const f = W.V30RankSnapshotTick; if (typeof f !== 'function') { setTimeout(hookDaily, 1000); return; }
    if (f.__v99) return;
    const w = function () { const r = f.apply(this, arguments); try { tick(); } catch (e) { console.warn('[v99 tick]', e); } return r; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v99 = true; W.V30RankSnapshotTick = w;
  })();
  setTimeout(() => { try { tick(); } catch (e) {} }, 3000);

  /* ------------------------------------------------------------ окна сезона (для страницы и главного окна) */
  function qualsOfMain(i) { return (seasonState.parallelSchedule || []).filter(e => e && e.qual && e.qual.step === i && e.season === season()); }
  function windows() {
    const t0 = now(), out = [];
    sched().forEach((st, i) => {
      if (!st || !st.calendar || !i) return;
      const start = Number(st.calendar.startMs) || 0, end = Number(st.calendar.endMs) || start;
      if (end < t0 - DAY) return;
      const d = parDef(i), info = d ? parInfo(d) : null;
      const qs = qualsOfMain(i), mainLocked = !!st.v35Roster || qs.some(q => q.status !== 'scheduled') || start <= t0;
      const parEv = d ? parEvent(d) : null, q = d ? qualEvent(d) : null;
      out.push({ i, st, start, end, info, d, mainLocked, parLocked: !!(parEv && parEv.status !== 'scheduled') || (info && info.start <= t0), parEv, q, quals: qs });
    });
    return out;
  }
  function myStatus(w) {
    const mgr = me(), x = w.st.v99, t = byName(mgr); if (!mgr || !t) return null;
    let mainInv;
    if (x) mainInv = x.mainInv.includes(mgr); else { try { const L = mainInvitesRaw(w.st, INV); mainInv = L.includes(mgr); } catch (e) { mainInv = false; } }
    if (Array.isArray(w.st.v35Roster && w.st.v35Roster.invites)) mainInv = w.st.v35Roster.invites.includes(mgr) || mainInv;
    let parInv = false; if (w.info) parInv = x ? (x.parPriority || []).slice(0, INV).includes(mgr) : parPriority(w.info).slice(0, INV).includes(mgr);
    const inMain = !!(w.st.v35Roster && (w.st.v35Roster.participants || []).includes(mgr));
    const inPar = !!(w.parEv && (w.parEv.participants || []).includes(mgr));
    return { mainInv, parInv, inMain, inPar, mine: S().mine[w.i] || null, regM: !!S().reg['M:' + w.i], regP: w.d ? !!S().reg['P:' + w.d.key] : false };
  }
  W.CS2TourChoice.myStatus = myStatus;
  // задачи для главного окна
  W.CS2TourChoice.tasks = function () {
    const out = [], t0 = now();
    windows().forEach(w => {
      const m = myStatus(w); if (!m) return;
      if (w.start - t0 > 60 * DAY) return;
      if (m.mine === 'none') return;
      if (w.info && !w.mainLocked && m.mainInv && m.parInv && !m.mine) out.push({ l: `Выберите турнир: ${w.st.name} или ${w.info.name}`, d: `решение до ${fdate(Math.min(w.start - 18 * DAY, w.info.start - QUAL_DAYS * DAY))}, иначе выберет ассистент`, nav: 'tchoice', urgent: w.start - t0 < 30 * DAY });
      else if (!m.mainInv && !m.regM && !w.mainLocked && w.st.type !== 'major' && !(m.parInv && m.mine === 'par')) out.push({ l: `Регистрация на отбор: ${w.st.name}`, d: `без приглашения — только через отбор (регистрация до ${fdate(w.start - 18 * DAY)})`, nav: 'tchoice' });
    });
    return out.slice(0, 3);
  };

  /* ------------------------------------------------------------ действия менеджера */
  function choose(i, what) {
    const s = S(); s.mine[i] = what;
    const st = sched()[i];
    if (st && st.v99) { if (me()) st.v99.choices[me()] = what; apply(i); }
    save(); try { H.render(); } catch (e) {}
  }
  function register(key, on) { const s = S(); if (on) s.reg[key] = true; else delete s.reg[key]; const m = /^P:(.+)$/.exec(key); if (m) { const d = PAR.find(x => x.key === m[1]), sl = d ? slotOf(d) : null; if (sl != null && sched()[sl] && sched()[sl].v99) apply(sl); } save(); try { H.render(); } catch (e) {} }
  W.CS2TourChoice.choose = choose; W.CS2TourChoice.register = register;
  H.CLICKS.push(['[data-v99go]', el => { const [i, w] = el.dataset.v99go.split('|'); choose(+i, w); }]);
  H.CLICKS.push(['[data-v99reg]', el => { register(el.dataset.v99reg, el.dataset.on === '1'); }]);

  /* ------------------------------------------------------------ страница «Выбор турниров» */
  const KIND_L = { major: 'Major', elite: 'S-Tier', regular: 'Tier-1' };
  function fieldOf(w, which) {
    const x = w.st.v99;
    // кто едет: зафиксированный состав; после решений клубов — приглашённые без отказавшихся и уехавших на параллельный
    if (which === 'main') {
      if (w.st.v35Roster) return w.st.v35Roster.participants || [];
      // после решений: приглашения с учётом отказов (освободившиеся места получают следующие по списку)
      if (x) { try { return (W.CS2InviteList(INV, w.st) || []).slice(0, INV); } catch (e) { return x.mainInv.filter(n => !(x.away || []).includes(n)); } }
      return mainInvitesRaw(w.st, INV);
    }
    if (w.parEv) return w.parEv.participants || []; return x ? (x.parInv || []) : (w.info ? parPriority(w.info).slice(0, INV) : []);
  }
  function optCard(w, which) {
    const isMain = which === 'main', mgr = me(), m = myStatus(w) || {};
    const name = isMain ? w.st.name : w.info.name, kind = isMain ? w.st.type : w.info.kind, org = isMain ? orgOf(w.st.name) : w.info.org;
    const prize = isMain ? prizeOf(w.st.name, w.st.type) : w.info.prize, start = isMain ? w.start : w.info.start, end = isMain ? w.end : w.info.end;
    const field = fieldOf(w, which), avg = avgRank(field), locked = isMain ? w.mainLocked : w.parLocked;
    const inv = isMain ? m.mainInv : m.parInv, chosen = m.mine ? m.mine === which : (isMain ? m.inMain : m.inPar);
    const partner = mgr && isPartner(mgr, org);
    const gs = isMain && isGS(name) && mgr ? gsProgress(mgr) : 0;
    const regKey = isMain ? 'M:' + w.i : 'P:' + (w.d && w.d.key), reg = isMain ? m.regM : m.regP;
    const lines = [];
    if (mgr) {
      if (inv) lines.push(`<li class="ok">✓ Приглашение${partner ? ' · партнёр организатора' : ''}</li>`);
      else if (kind === 'major') lines.push('<li>Путь на Major — через отборы Valve (страница «Путь на Major»)</li>');
      else lines.push(`<li class="${reg ? 'ok' : 'warn'}">${reg ? '✓ Клуб зарегистрирован на отбор' : 'Нет приглашения — только через отбор'}</li>`);
      if (gs) lines.push(`<li class="gs">🥇 Grand Slam: ${gs} из 3${gs >= 2 ? ' — победа принесёт Grand Slam и $1 000 000' : ''}</li>`);
      if (!isMain && w.q) lines.push(`<li>Отбор: ${fdate(w.q.startMs)} · 4 места</li>`);
    }
    const x = w.st.v99;
    const refused = x ? Object.entries(x.choices).filter(([n, c]) => c === 'none' && n !== mgr && (isMain ? x.mainInv.includes(n) : !x.mainInv.includes(n))).map(([n]) => [n, (x.why[n] || ['решение клуба'])[0]]) : [];
    const others = x ? Object.entries(x.choices).filter(([n, c]) => n !== mgr && c === which && (ranked().findIndex(t => t.name === n) + 1) <= 16).map(([n]) => n) : [];
    let btn = '';
    if (mgr && kind !== 'major') {
      if (locked) btn = `<span class="v99-lock">${chosen ? 'Клуб участвует' : 'Состав зафиксирован'}</span>`;
      else if (inv && m.mine === 'none') btn = `<span class="v99-lock">Клуб пропускает это окно</span><button type="button" class="v98-btn sm" data-v99go="${w.i}|${which}">${w.info ? 'Едем сюда' : 'Всё-таки едем'}</button>`;
      else if (inv) btn = (w.info ? (chosen && m.mine ? '<span class="v99-chosen">Выбран</span>' : `<button type="button" class="v98-btn ${chosen ? '' : 'v98-primary'} sm" data-v99go="${w.i}|${which}">Едем сюда</button>`) : '<span class="v99-chosen">Клуб едет</span>')
        + `<button type="button" class="v98-btn ghost sm" data-v99go="${w.i}|none" title="Отдых, тренировки, подготовка к следующему турниру">Пропустить турнир</button>`;
      else btn = `<button type="button" class="v98-btn sm ${reg ? 'ghost' : ''}" data-v99reg="${regKey}" data-on="${reg ? '0' : '1'}">${reg ? 'Отменить регистрацию' : 'Регистрация на отбор'}</button>`;
    }
    return `<div class="v99-opt${chosen ? ' on' : ''}">
      <header><span class="v99-org">${esc(org)}</span><span class="hs-kind k-${esc(kind)}">${esc(KIND_L[kind] || kind)}</span></header>
      <h4>${esc(name)}</h4><p class="v99-meta">${fdate(start)} – ${fdate(end)} · ${money(prize)}${!isMain && w.info.city ? ' · ' + esc(w.info.city) : ''}</p>
      <p class="v99-meta">${(isMain ? (w.st.v99 || w.st.v35Roster) : w.parEv) ? 'Поле' : 'Поле (прогноз до решения клубов)'}: ${field.length ? `${field.length} команд, средняя позиция №${avg.toFixed(0)}` : 'формируется'}</p>
      <div class="v99-field">${field.slice(0, 16).map(n => `<span title="${esc(n)}" data-team="${esc(n)}">${logo(n, 'xs')}</span>`).join('')}${which === 'main' && !w.st.v35Roster && x && field.length < 16 && w.st.type !== 'major' ? `<small class="v99-meta">+${16 - field.length} ${w.quals.length ? 'через отборы' : 'по приглашениям'}</small>` : ''}</div>
      ${refused.length ? `<p class="v99-meta v99-ref">Отказались: ${refused.slice(0, 5).map(([n, r]) => `${esc(n)} (${esc(r)})`).join(', ')}</p>` : ''}
      ${lines.length ? `<ul class="v99-st">${lines.join('')}</ul>` : ''}
      ${others.length ? `<p class="v99-meta">Выбрали: ${others.slice(0, 5).map(esc).join(', ')}</p>` : ''}
      <footer>${btn}</footer></div>`;
  }
  function page() {
    const ws = windows(), mgr = me();
    const head = `<div class="hs-head"><h1>Выбор турниров</h1><div class="hs-filters"><span class="hs-sub">Сезон ${season()} · обязательных турниров нет — нужны очки VRS</span></div></div>`;
    const note = `<p class="hs-note">Когда два турнира идут одновременно, каждая команда выбирает один: призовые, партнёрство с организатором (партнёры ESL и BLAST приглашаются всегда), гонка за Grand Slam (IEM и ESL Pro League), сила поля — в слабом поле больше шансов на титул и очки VRS. Без приглашения — регистрация на отбор (закрывается со стартом отбора). ${mgr ? 'Если не выбрать турнир к сроку, решит ассистент.' : 'Возглавьте клуб, чтобы выбирать турниры.'}</p>`;
    const cards = ws.map(w => `<section class="v99-win${w.info ? ' clash' : ''}"><header><b>${fdate(w.start)}</b><span>${w.info ? 'Два турнира одновременно' : (w.st.type === 'major' ? 'Major' : 'Турнир')}</span></header>
      <div class="v99-opts">${optCard(w, 'main')}${w.info ? optCard(w, 'par') : ''}</div></section>`).join('');
    return head + note + (cards || '<p class="hs-note">До конца сезона турниров нет.</p>');
  }
  H.PAGES.tchoice = page;
  try { if (H.TITLES) H.TITLES.tchoice = 'Выбор турниров'; } catch (e) {}
  (function addMenu(n) {
    const menu = document.querySelector('#hs-root .pt-menu[data-menu="game"]');
    if (!menu) { if (n < 40) setTimeout(() => addMenu(n + 1), 500); return; }
    if (!menu.querySelector('[data-nav="tchoice"]')) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.nav = 'tchoice'; b.textContent = 'Выбор турниров';
      const hub = menu.querySelector('[data-nav="hub"]'); if (hub && hub.nextSibling) menu.insertBefore(b, hub.nextSibling); else menu.appendChild(b);
    }
    try { W.CS2Shell && W.CS2Shell.refresh(); } catch (e) {}
  })(0);
})();
