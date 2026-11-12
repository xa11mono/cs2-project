(() => {
'use strict';
/* =====================================================================
   v37 · Premium home, tournament editorial bundles and career legacy.
   All generated interviews are explicitly marked as in-universe fiction.
   Existing career saves, team rosters and match records remain additive.
   ===================================================================== */
const H = window.HS, N = window.V29News;
if (!H || !N) return;
const esc = H.esc, KIND = H.KIND || {};
const ST = () => (typeof seasonState !== 'undefined' && seasonState) || null;
const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);
const ARCH = () => { try { return H.archive ? H.archive() || {} : (window.hubArchiveExport?.() || {}); } catch (e) { return {}; } };
// Cached one-pass archive index for old multi-season saves. The hub revision changes
// only when a bracket is archived/imported/updated, so 4s safety polls stay O(1).
let v37ArchiveIndex = null, v37ArchiveIndexRevision = -1;
let v37LastArchivePollRevision = -1, v37LastHallOfFameSignature = '';
function archiveIndex(force = false) {
  const revision = typeof window.hubArchiveRevision === 'function' ? Number(window.hubArchiveRevision()) : null;
  if (!force && v37ArchiveIndex && revision !== null && Number.isFinite(revision) && revision === v37ArchiveIndexRevision) return v37ArchiveIndex;
  const rows = Object.values(ARCH()).filter(Boolean), bySeason = new Map();
  rows.forEach(s => { const k = Number(s?.season) || 0; if (!bySeason.has(k)) bySeason.set(k, []); bySeason.get(k).push(s); });
  v37ArchiveIndex = { rows, bySeason }; v37ArchiveIndexRevision = revision ?? -1;
  return v37ArchiveIndex;
}
window.addEventListener('cs2:archive-ready', () => { v37ArchiveIndex = null; v37ArchiveIndexRevision = -1; v37PollArchives?.(true); });
const yearOf = s => { try { return Number(H.yearOf(s)) || 2026 + ((Number(s) || 1) - 1); } catch (e) { return 2026 + ((Number(s) || 1) - 1); } };
const now = () => { try { return H.nowMs ? H.nowMs() : Date.now(); } catch (e) { return Date.now(); } };
const save = () => { try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {} try { if (typeof saveTeams === 'function') saveTeams(); } catch (e) {} };
const currentState = () => {
  const s = ST(); if (!s) return null;
  if (!s.v37Legacy || typeof s.v37Legacy !== 'object') s.v37Legacy = {};
  const v = s.v37Legacy;
  v.eras = v.eras && typeof v.eras === 'object' ? v.eras : {};
  v.graduates = v.graduates && typeof v.graduates === 'object' ? v.graduates : {};
  v.retired = v.retired && typeof v.retired === 'object' ? v.retired : {};
  v.processed = v.processed && typeof v.processed === 'object' ? v.processed : {};
  v.storyKeys = v.storyKeys && typeof v.storyKeys === 'object' ? v.storyKeys : {};
  return v;
};

// Новые рубрики доступны и в фильтрах, и в редакционных карточках.
Object.assign(N.CATS, {
  award: N.CATS.award || { l: 'Награды', ic: '🏅' },
  interview: { l: 'Интервью', ic: '🎙️' },
  legacy: { l: 'Наследие', ic: '🏛️' },
  academy: N.CATS.academy || { l: 'Академия', ic: '🎓' }
});

function newsTags(team, player, eventId) {
  const a = [];
  if (team && N.T) a.push(N.T(team));
  if (player && N.P) a.push(N.P(player));
  if (eventId && N.E) a.push(N.E(eventId));
  return a;
}
function addStory(key, item) {
  const v = currentState(); if (!v || v.storyKeys[key]) return null;
  const prior = (N.all?.() || []).find(x => x.id === item.id || (x.title === item.title && (x.season || 0) === (item.season || ST()?.currentSeason || 1)));
  if (prior) { v.storyKeys[key] = 1; save(); return prior; }
  v.storyKeys[key] = 1;
  const out = N.add(item);
  if (!out) delete v.storyKeys[key];
  save();
  return out;
}
function fmtKind(k) { return ({ major: 'MAJOR', elite: 'S-TIER', regular: 'TIER 1', tier2: 'TIER 2', tier3: 'TIER 3', academy: 'ACADEMY', show: 'SHOW' })[k] || KIND[k] || String(k || 'TOURNAMENT').toUpperCase(); }
function money(n) { n = Number(n); return n > 0 ? '$' + Math.round(n).toLocaleString('en-US') : ''; }
function trophyArt(name, season, kind) { try { return H.trophy(name, season || 1, kind || 'regular'); } catch (e) { return '<span class="v37-trophy-fallback">🏆</span>'; } }
function statFor(nick, evId) {
  try { const p = H.stats().P[nick], z = p?.byEv?.[evId]; return z ? H.line(z.s || z) : null; } catch (e) { return null; }
}
function bestEventPlayer(snap) {
  const stats = (() => { try { return H.stats().P || {}; } catch (e) { return {}; } })();
  let best = null;
  Object.values(stats).forEach(p => {
    const z = p.byEv?.[snap.id]; if (!z) return;
    const l = (() => { try { return H.line(z.s || z); } catch (e) { return null; } })();
    if (!l || l.maps < 3) return;
    if (!best || l.rating > best.rating) best = { nick: p.nick, team: z.team || p.team || '', rating: l.rating, maps: l.maps, kd: l.kd, adr: l.adr };
  });
  return best;
}
function formalMvp(snap) {
  try { return N.mvpOf(snap.id); } catch (e) { return null; }
}
function makeTournamentBundle(snap) {
  if (!snap || !snap.id || !snap.champion || snap.champion === '—') return;
  const v = currentState(); if (!v || v.processed[snap.id]) return;
  const kind = snap.prestige || 'regular', champion = snap.champion;
  const runner = (snap.results || []).find(x => x.p === 2)?.n || '';
  const mvp = formalMvp(snap), performer = mvp || bestEventPlayer(snap);
  const player = performer?.nick || '';
  const isOfficialMvp = !!mvp;
  const baseTags = newsTags(champion, player, snap.id);
  const yr = snap.year || yearOf(snap.season);
  const group = String(snap.id);
  const stat = performer && statFor(player, snap.id);
  const statText = stat ? `Rating 3.0 ${Number(stat.rating).toFixed(2)} на ${stat.maps} картах; K/D ${Number(stat.kd).toFixed(2)}.` : (performer?.rating ? `Rating 3.0 ${performer.rating.toFixed(2)} на ${performer.maps} картах.` : '');

  if (player) {
    addStory(`event:${group}:star`, {
      cat: isOfficialMvp ? 'award' : 'player', icon: isOfficialMvp ? '🏅' : '📊',
      id: `v37-${group}-star`, v37Group: group, ev: snap.id, team: performer.team || champion, player,
      title: isOfficialMvp ? `${player} — MVP турнира ${snap.name}` : `${player} — самый результативный игрок ${snap.name}`,
      lead: isOfficialMvp ? `${player} получил награду MVP после победы ${champion} на ${snap.name}. ${statText}` : `${player} показал лучшую доступную статистику среди игроков с достаточной выборкой на ${snap.name}. ${statText}`,
      body: [isOfficialMvp ? 'Награда MVP зафиксирована в игровой истории турнира.' : 'Это статистический лидер турнира по данным симуляции, а не отдельная официальная награда MVP.', `Команда чемпиона: ${champion}.`, runner ? `Финалист: ${runner}.` : '', statText].filter(Boolean),
      tags: baseTags, imp: isOfficialMvp ? 9 : 7, img: { name: snap.name, season: snap.season, kind }
    });
  }
  addStory(`event:${group}:final`, {
    cat: kind === 'major' ? 'major' : 'tournament', icon: '🏆',
    id: `v37-${group}-final`, v37Group: group, ev: snap.id, team: champion,
    title: `Итоги ${snap.name}: путь ${champion} к титулу`,
    lead: `${champion} завершили ${snap.name} на первом месте${runner ? `; ${runner} заняли вторую строчку` : ''}.`,
    body: [`Турнир категории ${fmtKind(kind)} · ${snap.size || '—'} команд · ${yr} год.`, snap.format ? `Формат: ${snap.format}.` : '', runner ? `Второе место — ${runner}.` : '', `Результат сохранён в истории турниров и организации ${champion}.`].filter(Boolean),
    tags: newsTags(champion, '', snap.id), imp: kind === 'major' ? 10 : kind === 'elite' ? 8 : 6,
    img: { name: snap.name, season: snap.season, kind }
  });
  // v84: интервью после турнира публикует единая редакция (v84-newsroom.js).
  v.processed[snap.id] = 1;
  save();
  checkDynasty(snap);
  checkGraduateMilestones(snap);
  checkSuccessors(snap);
}

function rosterFor(snap, team) {
  const r = snap?.rost?.[team];
  if (Array.isArray(r)) return r.map(x => typeof x === 'string' ? x : x?.nick).filter(Boolean);
  return []; // не подменяем исторический ростер сегодняшним составом
}
function playerTitles(nick, team) {
  const A = ARCH(); let major = 0, t1 = 0;
  Object.values(A).forEach(s => {
    if (!s || !s.champion || !['major','elite','regular'].includes(s.prestige)) return;
    if (!rosterFor(s, s.champion).includes(nick)) return;
    if (s.prestige === 'major') major++;
    t1++;
  });
  return { major, t1 };
}
function checkDynasty(snap) {
  const v = currentState(); if (!v) return;
  const team = snap.champion, season = Number(snap.season) || 1;
  const eligible = Object.values(ARCH()).filter(s => s && s.champion === team && ['major','elite','regular'].includes(s.prestige) && Number(s.season) <= season && Number(s.season) >= season - 3);
  const majors = eligible.filter(s => s.prestige === 'major').length;
  const tier1 = eligible.length;
  if (!(majors >= 2 || tier1 >= 4 || (majors >= 1 && tier1 >= 3))) return;
  const existing = v.eras[team];
  if (existing && existing.active && existing.startSeason <= season) {
    existing.endSeason = Math.max(existing.endSeason || season, season);
    existing.majors = majors; existing.tier1 = tier1;
    return;
  }
  const era = v.eras[team] = { team, startSeason: Math.max(1, season - 3), endSeason: season, majors, tier1, active: true, createdYear: snap.year || yearOf(season) };
  addStory(`era:${team}:${era.startSeason}:${season}`, {
    cat: 'legacy', icon: '👑', team, ev: snap.id, v37Group: `era-${team}-${season}`,
    title: `Начало большой эпохи: ${team} вошли в историю CS2`,
    lead: (() => { const pl = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; };   // v112: склонения, без «0 титула Major»
      const t1 = `${tier1} ${pl(tier1, 'победу', 'победы', 'побед')} на турнирах Tier-1`;
      return `${team} ${majors ? `выиграли ${majors} ${pl(majors, 'Мейджор', 'Мейджора', 'Мейджоров')} и одержали ${t1}` : `одержали ${t1}`} за последние четыре сезона.`; })(),
    body: [`Внутриигровая отметка эпохи: сезон ${era.startSeason}–${season}.`, 'Дальнейшая задача — удержать состав, развивать молодых игроков и доказать, что это не короткий пик формы.'],
    tags: newsTags(team, '', snap.id), imp: 9
  });
}
function checkGraduateMilestones(snap) {
  const v = currentState(); if (!v) return;
  Object.entries(v.graduates).forEach(([nick, g]) => {
    if (!g || g.breakout) return;
    const winningTeam = snap.champion;
    const onChampionRoster = rosterFor(snap, winningTeam).includes(nick);
    const team = onChampionRoster ? winningTeam : (g.team || winningTeam);
    const mvp = formalMvp(snap)?.nick === nick;
    const majorWin = snap.prestige === 'major' && onChampionRoster;
    const titles = playerTitles(nick, team);
    if (!(mvp || majorWin || titles.t1 >= 2)) return;
    g.breakout = true; g.breakoutYear = snap.year || yearOf(snap.season); g.breakoutTeam = team;
    const mentorTxt = g.mentor ? ` Его наставником в этой сюжетной линии стал бывший игрок ${g.mentor}.` : '';
    addStory(`graduate:${nick}:breakout`, {
      cat: 'academy', icon: '🌱', team, player: nick, ev: snap.id,
      title: `${nick}: воспитанник академии выходит на большую сцену`,
      lead: `${nick} превратил продвижение из академии в заметный результат${mentorTxt}`,
      body: [`Выпускник академии ${g.academy || 'клубной системы'} закрепился на профессиональном уровне.`, majorWin ? `Игрок оказался в составе победителя ${snap.name}.` : '', mvp ? `В истории турнира зафиксирован MVP ${snap.name}.` : (!majorWin && titles.t1 >= 2 ? `В архиве карьеры зафиксировано ${titles.t1} победных кампаний Tier-1 с участием игрока.` : ''), `Сюжет карьеры обновлён: ${g.breakoutYear}.`].filter(Boolean),
      tags: newsTags(team, nick, snap.id), imp: 8
    });
  });
}
function checkSuccessors(snap) {
  const v = currentState(); if (!v) return;
  Object.entries(v.retired).forEach(([oldNick, r]) => {
    if (!r || r.successorStory || !r.rep || r.rep === oldNick) return;
    const member = rosterFor(snap, snap.champion).includes(r.rep);
    const mvp = formalMvp(snap)?.nick === r.rep;
    const majorWin = snap.prestige === 'major' && member;
    const titles = playerTitles(r.rep, r.team);
    if (!member || !(mvp || majorWin || titles.t1 >= 2)) return;
    r.successorStory = true; r.successorYear = snap.year || yearOf(snap.season);
    addStory(`successor:${oldNick}:${r.rep}`, {
      cat: 'legacy', icon: '♜', team: snap.champion, player: r.rep, ev: snap.id,
      title: `Преемник ${oldNick}: ${r.rep} продолжает историю клуба`,
      lead: `${r.rep} добился большого результата после ухода ${oldNick}; в истории клуба это теперь отдельная линия наследия.`,
      body: [`Ветеран ${oldNick} завершил карьеру в ${r.team || snap.champion}.`, `${r.rep} был указан как его преемник при завершении карьеры.`, majorWin ? `Теперь ${r.rep} входит в состав победителя Major ${snap.name}.` : mvp ? `На ${snap.name} ${r.rep} получил MVP.` : `${r.rep} уже участвовал как минимум в двух победных кампаниях Tier-1.`],
      tags: newsTags(snap.champion, r.rep, snap.id), imp: 9
    });
  });
}

// Карьерные события обогащаем мягко: исходные обработчики и их новости остаются.
if (N.H) {
  const basePromotion = N.H.promotion;
  N.H.promotion = d => {
    if (basePromotion) basePromotion(d);
    try {
      const v = currentState(); if (!v || !d?.player) return;
      const mentor = Object.values(v.retired).find(r => r && r.team === d.to && r.mentor && !r.mentorAssigned);
      const g = v.graduates[d.player] = v.graduates[d.player] || {};
      Object.assign(g, { academy: d.from || `${d.to} Academy`, team: d.to, season: d.season || ST()?.currentSeason || 1, year: yearOf(d.season || ST()?.currentSeason || 1), promoted: true });
      if (mentor) { g.mentor = mentor.player; mentor.mentorAssigned = d.player; }
      addStory(`academy-promotion:${d.player}:${g.season}`, {
        cat: 'academy', icon: '🎓', team: d.to, player: d.player,
        title: `${d.player} получает шанс в основе ${d.to}`,
        lead: `${d.player} поднялся из ${d.from || 'академической системы'} в главную команду.`,
        body: [`Тренерский штаб даёт молодому игроку возможность закрепиться в стартовом составе.`, d.out ? `${d.out} переходит в запас.` : '', mentor ? `В этой истории рядом с молодым игроком появляется наставник ${mentor.player}, бывший игрок клуба.` : '', 'Следующий этап — доказать уровень на официальных турнирах.'].filter(Boolean),
        tags: newsTags(d.to, d.player), imp: 6
      });
      save();
    } catch (e) { console.warn('[v37] promotion story', e); }
  };
  const baseRetire = N.H.retire;
  N.H.retire = d => {
    if (baseRetire) baseRetire(d);
    try {
      const v = currentState(); if (!v || !d?.player) return;
      const milestones = playerTitles(d.player, d.team);
      let mvpCount = 0; try { const q = window.RewardSystem?.getPlayerAwards?.(d.player) || window.twAwardsExport?.().p?.[d.player]; mvpCount = q?.mvp?.length || 0; } catch (e) {}
      const mentor = milestones.major >= 1 || milestones.t1 >= 3 || mvpCount >= 1;
      v.retired[d.player] = { player: d.player, team: d.team, year: yearOf(ST()?.currentSeason || 1), age: d.age, rep: d.rep || '', mentor, legacy: milestones, mvpCount };
      addStory(`retire-legacy:${d.player}`, {
        cat: 'legacy', icon: '🏛️', team: d.team, player: d.player,
        title: mentor ? `${d.player} завершает карьеру и начинает новую главу` : `${d.player} завершает профессиональную карьеру`,
        lead: `${d.player} уходит из профессиональной сцены в возрасте ${d.age || '—'} лет.`,
        body: [d.rep ? `В качестве преемника в ростере указан ${d.rep}.` : 'Клубу предстоит найти нового игрока на эту позицию.', mentor ? 'В дальнейшем ветеран может вернуться в систему клуба как наставник молодых игроков; эта линия будет связана с будущими выпускниками академии.' : 'История игрока сохранена в хронике клуба.', `Титулы Tier-1 в доступном архиве: ${milestones.t1}; Major: ${milestones.major}.`],
        tags: newsTags(d.team, d.player), imp: mentor ? 8 : 6
      });
      save();
    } catch (e) { console.warn('[v37] retire story', e); }
  };
  const baseBreakout = N.H.breakout;
  N.H.breakout = d => {
    if (baseBreakout) baseBreakout(d);
    try {
      const g = currentState()?.graduates?.[d?.player];
      if (g && !g.breakout) addStory(`graduate:breakout-event:${d.player}`, { cat: 'academy', icon: '🚀', team: d.team, player: d.player,
        title: `${d.player} — прорыв после академии`, lead: `Молодой игрок ${d.team} быстро адаптируется к уровню главной сцены.`,
        body: ['Тренерский штаб рассчитывает, что игрок закрепится в основе и станет частью долгосрочного проекта.'], tags: newsTags(d.team, d.player), imp: 6 });
    } catch (e) {}
  };
  const baseSeasonEnd = N.H['season-end'];
  N.H['season-end'] = d => {
    if (baseSeasonEnd) baseSeasonEnd(d);
    try { recordSeasonHonours(Number(d?.season) || Number(ST()?.currentSeason) - 1); } catch (e) { console.warn('[v37] year awards', e); }
  };
}

function recordSeasonHonours(season) {
  const v = currentState(); if (!v || !season) return;
  // v84: сезоны, обработанные CS2Awards, имеют одну «Команду года» — старые генераторы не трогают их.
  if (window.CS2Awards && (ST()?.v84Awards?.[yearOf(season)] || (ST()?.hallOfFame || []).some(h => Number(h.season) === Number(season) && h.v84))) return;
  const st = ST(), year = yearOf(season), hof = (st?.hallOfFame || []).find(x => Number(x.season) === Number(season));
  if (!window.CS2Awards && hof?.champion && hof.champion !== '—') {
    if (!(window.RewardSystem?.getTeamAwards(hof.champion) || []).some(x => x.type === 'team-season' && Number(x.season) === Number(season))) {
      window.RewardSystem?.addTeamAward({ type: 'team-season', team: hof.champion, season, year: hof.year || year, score: Number(hof.scorePts) || 0, scorePts: Number(hof.scorePts) || 0, createdAt: now() });
    }
    if (!v.storyKeys[`award:team-season:${season}`]) addStory(`award:team-season:${season}`, { cat: 'award', icon: '🏅', team: hof.champion,
      title: `${hof.champion} — команда сезона ${hof.year || year}`,
      lead: `${hof.champion} получила титул «Команда сезона» по итогам сезона ${season}.`,
      body: [`Награда сохранена в истории клуба за ${hof.year || year} год.`, `Очки по итогам сезона: ${Number(hof.scorePts) || 0}.`, hof.risingStar ? `Самый заметный подъём: ${hof.risingStar}.` : ''],
      tags: newsTags(hof.champion), imp: 8 });
  }
  const all = (archiveIndex().bySeason.get(Number(season)) || []).filter(s => { const k = window.RewardSystem?.classifyEvent(s.prestige || s.kind, s.name, s.tier, s) || s.prestige; return s.champion && s.champion !== '—' && ['major','elite','regular','tier2','tier3','academy'].includes(k); }).map(s => ({ ...s, prestige: window.RewardSystem?.classifyEvent(s.prestige || s.kind, s.name, s.tier, s) || s.prestige }));
  const yearKey = `team-year:${year}`;
  if (all.length >= 2) {
    const mult = { major: 12, elite: 8, regular: 6, tier2: 3, tier3: 1.6, academy: 1.2 };
    const placePts = p => ({ 1: 1, 2: .52, 3: .31, 4: .2, 5: .14, 6: .12, 7: .1, 8: .08 }[p] || (p <= 16 ? .035 : 0));
    const scores = {};
    all.forEach(s => {
      const w = mult[s.prestige] || 1;
      (s.results || []).forEach(r => { if (!r?.n || !r.p) return; scores[r.n] = (scores[r.n] || 0) + w * placePts(Number(r.p)); });
      if (!(s.results || []).length && s.champion) scores[s.champion] = (scores[s.champion] || 0) + w;
    });
    const winner = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
    if (winner) {
      let record = (window.RewardSystem?.getTeamAwards() || []).find(x => x.type === 'team-year' && Number(x.year) === Number(year));
      if (!record) { record = { type: 'team-year', team: winner[0], season, year, score: Number(winner[1].toFixed(2)), scorePts: Number(winner[1].toFixed(2)), events: all.length, createdAt: now() }; window.RewardSystem?.addTeamAward(record); }
      if (!v.storyKeys[yearKey]) addStory(yearKey, { cat: 'award', icon: '👑', team: record.team,
        title: `${record.team} — команда ${year} года`,
        lead: `${record.team} набрала наибольший результат по совокупности выступлений на турнирах сезона.`,
        body: [`Учтено турниров: ${record.events || all.length}.`, `Модель награды учитывает категорию турнира и итоговое место: Major и S-Tier имеют наибольший вес, Tier-2 и Tier-3 также дают шанс попасть в гонку.`, `Итоговый рейтинг награды: ${Number(record.score || 0).toFixed(2)}.`],
        tags: newsTags(record.team), imp: 9 });
    }
  }
  save();
}

// При загрузке сейва дополняем уже существующий Зал славы и не публикуем архивные новости пачкой.
function syncSeasonHonours() {
  const s = ST(); if (!s) return;
  (s.hallOfFame || []).slice(0, 10).forEach(h => { if (h?.season) recordSeasonHonours(Number(h.season)); });
}
const bootAt = Date.now();
let firstArchivePass = true;
function pollArchives(force = false) {
  if (Date.now() - bootAt < 7000) return; // новости v29 могут кратко подавляться при восстановлении сейва
  try {
    const v = currentState(); if (!v) return;
    const revision = typeof window.hubArchiveRevision === 'function' ? Number(window.hubArchiveRevision()) : null;
    const hofSignature = (ST()?.hallOfFame || []).slice(0, 10).map(h => `${h?.season || 0}:${h?.champion || ''}:${h?.year || 0}`).join('|');
    if (!force && revision !== null && revision === v37LastArchivePollRevision && hofSignature === v37LastHallOfFameSignature) return;
    const cache = archiveIndex(force), rows = cache.rows;
    const list = rows.filter(s => {
      const kind = window.RewardSystem?.classifyEvent(s?.prestige || s?.kind, s?.name, s?.tier, s) || s?.prestige;
      return s && s.id && s.champion && s.champion !== '—' && !s.live && !s.scheduled && ['major','elite','regular','tier2','tier3','academy'].includes(kind);
    });
    let pending = list.filter(s => !v.processed[s.id]);
    if (firstArchivePass) {
      firstArchivePass = false;
      // На старом сохранении формируем редакционный пакет только для двух последних турниров.
      pending.sort((a,b) => Number(a.ge || a.ts || 0) - Number(b.ge || b.ts || 0));
      pending.slice(0, Math.max(0, pending.length - 2)).forEach(s => { v.processed[s.id] = 1; });
      pending = pending.slice(-2);
    }
    pending.forEach(s => makeTournamentBundle(s));
    if (revision === null || revision !== v37LastArchivePollRevision || hofSignature !== v37LastHallOfFameSignature) syncSeasonHonours();
    v37LastArchivePollRevision = revision ?? cache.rows.length;
    v37LastHallOfFameSignature = hofSignature;
  } catch (e) { console.warn('[v37] archive scan', e); }
}
window.v37PollArchives = pollArchives;
setTimeout(() => pollArchives(true), 7200);
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(!window.v57BatchCalendarSkip && !document.hidden) pollArchives(false); }, 4000);

// Командные награды теперь входят в V33Awards из общего реестра RewardSystem.

function teamHonoursHtml(name) {
  const v = currentState(); if (!v) return '';
  const era = v.eras[name];
  // Командные награды года/сезона уже входят в общую полку RewardSystem.
  // Здесь оставляем только организационное наследие — второй копии наград не создаём.
  const eraHtml = era ? `<div class="v37-era-card"><span class="v37-era-mark">LEGACY</span><div><b>Эпоха ${esc(name)}</b><small>Сезоны ${era.startSeason}–${era.endSeason} · ${era.majors} Major · ${era.tier1} титулов Tier-1</small></div><span class="v37-era-crown">♛</span></div>` : '';
  return eraHtml ? `<section class="v37-team-legacy">${eraHtml}</section>` : '';
}
if (H.PAGES.team) {
  const oldTeamPage = H.PAGES.team;
  H.PAGES.team = arg => {
    const html = oldTeamPage(arg), name = String(arg || '').split('/')[0], extra = teamHonoursHtml(name);
    if (!extra) return html;
    return html.replace('<div class="hs-ptab-body"', `${H.box('Награды и наследие', extra, '', 'flush')}<div class="hs-ptab-body"`);
  };
}
if (H.PAGES.awards) {
  const oldAwardsPage = H.PAGES.awards;
  H.PAGES.awards = arg => {
    const html = oldAwardsPage(arg);
    if (H.S.aw?.tab && H.S.aw.tab !== 'year') return html;
    const v = currentState(); if (!v) return html;
    const rows = (window.RewardSystem?.getTeamAwards() || []).slice().sort((a,b) => b.year-a.year || b.season-a.season).map(x => `<button type="button" class="v37-award-list-row" data-team="${esc(x.team)}"><span class="v37-award-list-art">${window.TW?.awardSvg ? window.TW.awardSvg(x.type === 'team-season' ? 'teamseason' : 'team', x.year) : '🏆'}</span><span><b>${x.type === 'team-year' ? 'Команда года' : 'Команда сезона'} · ${x.year}</b><small>${esc(x.team)} · сезон ${x.season}</small></span><i>${x.year}</i></button>`).join('');
    if (!rows) return html;
    return html + H.box('Командные награды · архив', `<div class="v37-award-list">${rows}</div>`, '', 'flush v37-award-box');
  };
}

/* ----------------------------- новая главная */
function storyVisual(n) {
  const M = window.V31Media;
  try {
    if (n.player && M) { const u = M.url('player', n.player); if (u) return `<img src="${esc(u)}" alt="" loading="lazy">`; }
    if (n.team && M) { const u = M.url('team', n.team); if (u) return `<img class="v37-story-teamlogo" src="${esc(u)}" alt="" loading="lazy">`; } // v88: логотип — целиком, не как фото
  } catch (e) {}
  if (n.img) return trophyArt(n.img.name, n.img.season, n.img.kind);
  if (n.team) return `<span class="v37-story-logo">${H.logo(n.team, 'sm')}</span>`;
  return `<span class="v37-story-glyph">${window.CS2Glyph ? window.CS2Glyph(n) : esc(n.icon || '✦')}</span>`;
}
function articleCard(n, cls) {
  const c = N.CATS[n.cat] || { l: 'Материал' };
  return `<button type="button" class="v37-story-card ${cls || ''}" data-art="${esc(n.id)}"><span class="v37-story-media">${storyVisual(n)}</span><span class="v37-story-text"><span class="v37-story-meta"><i>${esc(c.l)}</i><time>${esc(H.ndate(n.ts))}</time></span><b>${esc(n.title)}</b><small>${esc(n.lead || '')}</small></span><span class="v37-story-arrow">↗</span></button>`;
}
function activeOrLatestEvent() {
  const ct = CT();
  if (ct && !ct.completed) {
    let snap = null; try { snap = window.hubSnapshotTier1 ? window.hubSnapshotTier1(ct) : null; } catch (e) {}
    if (snap) return { type: 'live', snap, id: 'cur', ct };
  }
  // v84: главный блок — только Tier-1/S-Tier/Major (не шоу-матчи и не Tier-3 открытые кубки).
  const T1K = ['major', 'elite', 'regular'];
  const isShow = s => s.showMatch || s.show || /^SM-/.test(String(s.id || '')) || ['show', 'nations'].includes(String(s.prestige || ''));
  const A = Object.values(ARCH()).filter(s => s && s.id && s.champion && s.champion !== '—' && !s.live && !s.scheduled && ((!isShow(s) && T1K.includes(String(s.prestige || ''))) || String(s.prestige || '') === 'nations'))  // v84: Кубок наций — в главном блоке, как Tier-1
    .sort((a,b) => Number(b.ge || b.ts || 0) - Number(a.ge || a.ts || 0));
  const nowT = Number(ST()?.calendar?.currentMs) || Date.now();
  const soon = (H.events?.() || []).filter(e => e.status === 'scheduled' && T1K.includes(e.kind) && (e.startMs || 0) - nowT < 10 * 864e5).sort((a,b) => (a.startMs || 0) - (b.startMs || 0))[0];
  if (A.length && (!soon || nowT - Number(A[0].ge || A[0].ts || 0) < 5 * 864e5)) return { type: 'done', snap: A[0], id: A[0].id };
  const upcoming = soon || (H.events?.() || []).filter(e => e.status === 'scheduled' && T1K.includes(e.kind)).sort((a,b) => (a.startMs || 0) - (b.startMs || 0))[0];
  if (upcoming) return { type: 'upcoming', ev: upcoming, id: upcoming.id };
  return null;
}
function stageFor(snap, ct) {
  try {
    const rows = (H.liveMatches?.() || []).filter(x => x.snap?.id === snap.id || (ct && x.snap?.name === ct.name));
    const live = rows.find(x => x.live);
    if (live?.m?.__stage) return live.m.__stage.split(' · ').pop();
    const next = rows.find(x => !x.m?.w && x.m?.a && x.m?.b);
    if (next?.m?.__stage) return next.m.__stage.split(' · ').pop();
  } catch (e) {}
  return ct?.completed ? 'Турнир завершён' : 'Турнирная стадия';
}
function premiumHero() {
  const pick = activeOrLatestEvent();
  if (pick?.type === 'upcoming') {
    const e = pick.ev, kind = e.kind || 'regular';
    return `<section class="v37-premium-hero v37-upcoming" data-event="${esc(e.id)}"><div class="v37-hero-ambient"></div><div class="v37-hero-art">${trophyArt(e.name, e.season, kind)}</div><div class="v37-hero-copy"><div class="v37-kicker"><span class="v37-live-pill">СЛЕДУЮЩИЙ ТУРНИР</span><span class="v37-tier-pill k-${esc(kind)}">${fmtKind(kind)}</span></div><div class="v37-eyebrow">КАЛЕНДАРЬ · ${e.season ? yearOf(e.season) : 'СЕЗОН'}</div><h1>${esc(e.name)}</h1><p class="v37-hero-desc">${e.size || '—'} команд · ${esc(e.format || 'Формат будет объявлен')} · старт ${e.startMs ? esc(H.fdate(e.startMs)) : 'по календарю'}</p><div class="v37-hero-actions"><button type="button" class="v37-primary-action" data-event="${esc(e.id)}">Открыть турнир <span>↗</span></button><button type="button" class="v37-quiet-action" data-nav="calendar">Календарь</button></div></div></section>`;
  }
  if (pick?.snap) {
    const s = pick.snap, completed = pick.type === 'done', kind = s.prestige || 'regular';
    const champion = completed ? s.champion : '';
    const runner = completed ? ((s.results || []).find(x => x.p === 2)?.n || '') : '';
    const mvp = completed ? formalMvp(s) : null;
    const event = (H.events?.() || []).find(e => e.id === pick.id || (e.name === s.name && e.season === s.season));
    const prize = Number(s.prize || event?.prize || pick.ct?.prizePool || 0);
    const stage = completed ? 'ИТОГИ ТУРНИРА' : stageFor(s, pick.ct);
    const meta1 = completed ? (s.size || '—') + ' команд' : (s.size || pick.ct?.participants?.length || '—') + ' команд';
    const meta2 = s.format || pick.ct?.formatChoice || 'Турнирная сетка';
    return `<section class="v37-premium-hero v37-event-hero ${completed ? 'is-complete' : 'is-live'}" data-event="${esc(pick.id)}"><div class="v37-hero-ambient"></div><div class="v37-hero-art">${trophyArt(s.name, s.season, kind)}<span class="v37-art-orbit"></span><span class="v37-art-base">${esc(fmtKind(kind))}</span></div><div class="v37-hero-copy"><div class="v37-kicker">${completed ? '<span class="v37-finished-pill">ЗАВЕРШЁН</span>' : '<span class="v37-live-pill"><i></i> LIVE</span>'}<span class="v37-tier-pill k-${esc(kind)}">${fmtKind(kind)}</span></div><div class="v37-eyebrow">${esc(stage)} · ${s.year || yearOf(s.season)}</div><h1>${esc(s.name)}</h1><p class="v37-hero-desc">${completed ? `${esc(champion)} — чемпионы${runner ? ` · ${esc(runner)} — финалисты` : ''}` : `${esc(stageFor(s, pick.ct))} · турнир продолжается`}</p><div class="v37-hero-metrics"><span><b>${esc(meta1)}</b><small>УЧАСТНИКИ</small></span><span><b>${esc(meta2)}</b><small>ФОРМАТ</small></span><span><b>${prize ? money(prize) : (completed ? 'завершён' : 'идёт')}</b><small>${prize ? 'ПРИЗОВОЙ ФОНД' : 'СТАТУС'}</small></span></div>${completed && mvp ? `<div class="v37-mvp-chip"><span>🏅</span><span><small>MVP турнира</small><b>${esc(mvp.nick)}</b></span></div>` : ''}<div class="v37-hero-actions"><button type="button" class="v37-primary-action" data-event="${esc(pick.id)}">${completed ? 'Смотреть итоги' : 'Открыть турнир'} <span>↗</span></button>${completed && mvp ? `<button type="button" class="v37-quiet-action" data-player="${esc(mvp.nick)}">Профиль MVP</button>` : `<button type="button" class="v37-quiet-action" data-nav="matches">Матчи</button>`}</div></div></section>`;
  }
  const fallback = (H.feed?.() || []).filter(n => !n.legacy).slice(0,1)[0];
  if (fallback) return `<section class="v37-premium-hero v37-fallback" data-art="${esc(fallback.id)}"><div class="v37-hero-ambient"></div><div class="v37-hero-art"><span class="v37-story-glyph">${window.CS2Glyph ? window.CS2Glyph(fallback) : esc(fallback.icon || '✦')}</span></div><div class="v37-hero-copy"><div class="v37-kicker"><span class="v37-live-pill">ГЛАВНОЕ</span></div><h1>${esc(fallback.title)}</h1><p class="v37-hero-desc">${esc(fallback.lead || '')}</p><div class="v37-hero-actions"><button type="button" class="v37-primary-action" data-art="${esc(fallback.id)}">Читать материал <span>↗</span></button></div></div></section>`;
  return `<section class="v37-premium-hero v37-fallback"><div class="v37-hero-ambient"></div><div class="v37-hero-art"><span class="v37-story-glyph">🏆</span></div><div class="v37-hero-copy"><div class="v37-kicker"><span class="v37-tier-pill">СЕЗОН</span></div><h1>Сезон ещё не начался</h1><p class="v37-hero-desc">Первый турнир стартует по календарю. Новости появятся после первых матчей.</p><div class="v37-hero-actions"><button type="button" class="v37-primary-action" data-nav="calendar">Открыть календарь <span>↗</span></button><button type="button" class="v37-quiet-action" data-nav="ranking">Рейтинг команд</button></div></div></section>`;
}
function seasonProgressLine() {
  try {
    const st = ST(), sched = (st?.seasonSchedule || []).slice(1).filter(Boolean), idx = Number(st?.tournamentIndex) || 1;
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    const done = Math.max(0, idx - 1 + (ct?.completed ? 1 : 0));
    const next = sched[ct && !ct.completed ? idx : (ct?.completed ? idx : idx - 1)];
    return `Tier-1: сыграно ${Math.min(done, sched.length)} из ${sched.length}${next?.name ? ` · далее ${next.name}` : ''}`;
  } catch (e) { return 'Календарь сезона'; }
}
function topStories() {
  // v84: главные истории — по важности за последние дни, без рядовых итогов квалификаций и Tier-3.
  const all = (H.feed?.() || []).filter(n => !n.legacy);
  const latest = Number(all[0]?.ts) || 0;
  const minor = n => /qualifier|квалиф/i.test(String(n.title || '')) || (n.cat === 'tier2' && (Number(n.imp) || 0) < 5) || n.cat === 'pickem-pub';
  const feed = all.filter(n => !minor(n) && latest - (Number(n.ts) || 0) < 7 * 864e5).sort((a, b) => (Number(b.imp) || 0) - (Number(a.imp) || 0) || (b.ts || 0) - (a.ts || 0)).slice(0, 20)
    .concat(all.filter(n => !minor(n)).slice(0, 14));
  const chosen = [], used = new Set();
  for (const n of feed) {
    if (chosen.length >= 3) break;
    const k = n.v37Group ? `g:${n.v37Group}` : `id:${n.id}`;
    if (used.has(k)) continue;
    used.add(k); chosen.push(n);
  }
  return chosen;
}
function eventBundle() {
  const all = (H.feed?.() || []).filter(n => !n.legacy);
  const pick = activeOrLatestEvent();
  const eventId = pick?.snap?.id || pick?.ev?.id || pick?.ct?.id || pick?.id;
  // Home editorial strip is scoped to one exact event ID. Never mix finals from different tournaments.
  let scoped = eventId ? all.filter(n => String(n.ev || '') === String(eventId) || (n.tags || []).some(t => t.t === 'event' && String(t.v) === String(eventId))) : [];
  // If the event registry id differs from the archival news id, choose the newest package and keep it intact.
  if (!scoped.length && !eventId) {
    const seed = all.find(n => n.v37Group && /-(?:star|final|interview)$/.test(n.id || ''));
    if (seed) scoped = all.filter(n => String(n.v37Group) === String(seed.v37Group));
  }
  const seen = new Set();
  return scoped.filter(n => {
    const isBundle = /-(?:star|final|interview)$/.test(n.id || '') || ['award','interview','tournament'].includes(n.cat);
    if (!isBundle) return false;
    const key = n.v37Group ? `${n.v37Group}:${n.cat}` : n.id;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b) => Number(b.ts || 0) - Number(a.ts || 0)).slice(0,3);
}
function premiumTop() {
  const stories = topStories(), editorial = eventBundle();
  const rail = stories.map((n,i) => articleCard(n, `v37-rail-${i+1}`)).join('') || `<div class="v37-empty-rail"><span>✦</span><b>Истории появляются по ходу сезона</b><small>Итоги турниров, награды, трансферы и новые таланты.</small></div>`;
  const strip = editorial.map(n => articleCard(n, 'v37-editorial-card')).join('');
  return `<div class="v37-home-top"><div class="v37-home-layout"><div class="v37-feature-col">${premiumHero()}<div class="v37-feature-foot"><span><i class="v37-foot-dot"></i> СЕЗОН ${esc(String(yearOf(ST()?.currentSeason || 1)))}</span><b>${esc(seasonProgressLine())}</b><button type="button" data-nav="events">Все турниры <span>→</span></button></div></div><aside class="v37-news-rail"><div class="v37-rail-head"><div><h2>Главные истории</h2></div><button type="button" data-nav="news">Все новости ↗</button></div>${rail}</aside></div>${strip ? `<section class="v37-editorial"><div class="v37-editorial-head"><div><h2>После финала</h2></div></div><div class="v37-editorial-grid">${strip}</div></section>` : ''}</div>`;
}
const oldHome = H.PAGES.home;
if (oldHome) H.PAGES.home = arg => {
  let html = oldHome(arg);
  // v34's legacy live-final banner is redundant: the new feature card covers the same event.
  html = html.replace(/<section class="fb [\s\S]*?<\/section>/, '');
  const start = html.indexOf('<div class="hm-top">'), end = html.indexOf('<div class="hs-grid2 hm-grid">', start);
  if (start >= 0 && end > start) html = html.slice(0, start) + premiumTop() + html.slice(end);
  else html = premiumTop() + html;
  return html;
};

console.info('[v37] премиальная главная, редакционные пакеты турниров и наследие карьеры');
})();
