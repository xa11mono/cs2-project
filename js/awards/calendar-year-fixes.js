/* v36 fixes: calendar-year awards, robust trophy/stat presentation and reset-adjacent UI fixes. */
(function () {
'use strict';
const H = window.HS;
const SS = () => (typeof seasonState !== 'undefined' ? seasonState : null);
const T1 = new Set(['major', 'elite', 'regular']);

/* Calendar-year awards: statistics use archived match dates and only Major/S-Tier/Tier-1.
   Annual MVPs are part of the ranking, not just profile decorations. */
const YEAR_RANKING_VERSION = 2;
// v84: «Новичок года» — только для тех, кто не играл в топ-30 командах на старте 2026 (donk, m0NESY и др. — не новички)
function wasEstablishedPro(nick) {
  try {
    const R = typeof TEAM_ROSTER_2026 !== 'undefined' ? TEAM_ROSTER_2026 : null; if (!R) return false;
    const st = typeof seasonState !== 'undefined' ? seasonState : null;
    if (st && !st.v84EstablishedPros) {
      const acad = new Set(Object.keys(window.V21AcademyParent || {}));
      const top = (typeof teams !== 'undefined' ? teams : []).filter(t => t && !t.isAcademy && !acad.has(t.name)).sort((a, b) => (b.pts || 0) - (a.pts || 0)).slice(0, 30).map(t => t.name);
      st.v84EstablishedPros = [...new Set(top.flatMap(n => (R[n] || []).map(x => String(x?.nick || x).toLowerCase())))];
    }
    return (st?.v84EstablishedPros || []).includes(String(nick).toLowerCase());
  } catch (e) { return false; }
}
const YEAR_AWARD_TYPES = ['poty','awper','igl','rifler','entry','clutch','support','rookie','breakout','mostimproved','lurker','anchor','utility','youngstar'];
function yearMvpInfo(year) {
  const source = window.RewardSystem?.getAllPlayerAwards?.()
    || (window.twAwardsExport ? (window.twAwardsExport().p || {}) : {});
  const result = {};
  Object.entries(source || {}).forEach(([nick, rec]) => {
    const seen = new Set();
    let count = 0, points = 0, major = 0;
    (rec?.mvp || []).forEach(row => {
      const rowYear = Number(row?.y ?? row?.year) || (Number(row?.s ?? row?.season) && H?.yearOf ? Number(H.yearOf(Number(row.s ?? row.season))) : 0);
      if (rowYear !== Number(year)) return;
      const id = String(row.id || `${row.n || row.name || 'mvp'}|${row.s || row.season || rowYear}`);
      if (seen.has(id)) return;
      seen.add(id);
      const kind = String(row.k || row.kind || row.prestige || '').toLowerCase();
      if (kind && !['major','elite','regular'].includes(kind)) return;
      count++;
      if (kind === 'major') { points += 14; major++; }
      else if (kind === 'elite') points += 11;
      else points += 9; // Tier-1 / older records without an explicit kind.
    });
    // v84: EVP тоже учитываются в рейтинге года (вес ниже, чем у MVP).
    let evpCount = 0, evpPoints = 0; const seenE = new Set();
    (rec?.evp || []).forEach(row => {
      const rowYear = Number(row?.y ?? row?.year) || 0; if (rowYear !== Number(year)) return;
      const id = String(row.id || `${row.n}|${row.s}`); if (seenE.has(id)) return; seenE.add(id);
      const kind = String(row.k || '').toLowerCase(); if (kind && !['major','elite','regular'].includes(kind)) return;
      evpCount++; evpPoints += kind === 'major' ? 5 : kind === 'elite' ? 4 : 3;
    });
    if (count || evpCount) result[nick] = { count, points: points + evpPoints, major, evpCount, evpPoints };
  });
  return result;
}
function yearRows(year) {
  if (!H) return [];
  try { H.invalidate(); } catch (e) {}
  const mvp = yearMvpInfo(year);
  const stats = H.stats(), raw = Object.values(stats.P || {});
  const rows = raw.map(o => {
    const sums = o.byYear && (o.byYear[year] || o.byYear[String(year)]);
    if (!sums || !sums.maps) return null;
    const L = H.line(sums), match = (o.matches || []).find(m => Number(m.gameYear || m.year || (m.season && H.yearOf(m.season))) === Number(year) && T1.has(m.kind));
    const p = o.p || {}, award = mvp[o.nick] || { count: 0, points: 0, major: 0 };
    return { nick: o.nick, p, team: match?.team || o.team || '—', L, mvpCount: award.count, mvpPoints: award.points, evpCount: award.evpCount || 0, majorMvpCount: award.major, baseScore: L.rating * 100 + Math.min(30, L.maps) * .12, score: 0 };
  }).filter(Boolean);
  const maxMaps = Math.max(0, ...rows.map(x => x.L.maps));
  rows.forEach(x => {
    if (x.L.maps < Math.max(6, maxMaps * .30)) x.baseScore -= 45;
    x.score = x.baseScore + x.mvpPoints;
  });
  return rows.sort((a, b) => b.score - a.score || b.mvpCount - a.mvpCount || b.L.rating - a.L.rating || b.L.maps - a.L.maps || a.nick.localeCompare(b.nick));
}

// v84: расчёт отделён от записи — церемония (CS2Awards) фиксирует результат в конце сезона,
// а публикует его позже (обратный отсчёт топ-20 и церемония в начале января).
function computeYearAwards(year) {
  if (!H) return null;
  const db = window.twAwardsExport ? window.twAwardsExport() : {};
  const playerDb = window.RewardSystem?.getAllPlayerAwards?.() || db.p || {};
  const rows = yearRows(year);
  if (!rows.length) return null;
  const top = rows.slice(0, 20).map((x, i) => ({ nick: x.nick, r: i + 1, team: x.team, mvpCount: x.mvpCount, evpCount: x.evpCount || 0, mvpPoints: x.mvpPoints, rating: x.L.rating }));
  const seasonNo = Math.max(1, Number(year) - 2025);
  const qualifiers = rows.filter(x => x.L.maps >= Math.max(6, rows[0].L.maps * .30));
  // MVPs влияют на общий Top-20 и POTY, но не подменяют профильные критерии
  // (лучший снайпер, IGL, саппорт и т.д.).
  const choose = (predicate, metric = x => x.baseScore) => qualifiers.filter(predicate).sort((a, b) => metric(b) - metric(a) || b.L.maps - a.L.maps)[0] || null;
  const roleOf = x => [x.p?.role, x.p?.roles, x.p?.primaryRole, x.p?.position].flat().filter(Boolean).join(' ').toLowerCase();
  const winners = [
    ['poty', rows[0]],
    // Старые сохранения используют сразу несколько обозначений роли снайпера (AWP/AWPer/Sniper).
    ['awper', choose(x => /awp|snip|снайпер/.test(roleOf(x)))],
    ['igl', choose(x => /igl|in.?game.?leader|captain|капитан/.test(roleOf(x)))],
    ['rifler', choose(x => /rifler|rifle|lurker|рифлер/.test(roleOf(x)))],
    ['entry', choose(x => /entry|энтри/.test(roleOf(x)), x => x.L.okpr - x.L.dpr * .25 + x.L.impact * .15)],
    ['clutch', choose(() => true, x => x.L.clA ? x.L.clW / x.L.clA * 100 + x.L.clW * .15 : 0)],
    ['support', choose(x => /support|саппорт/.test(roleOf(x)), x => x.L.kast + x.L.apr * 10)],
    ['rookie', choose(x => Number(x.p.age || 99) <= 21 && !wasEstablishedPro(x.nick) && !(playerDb[x.nick]?.aw || []).some(a => a.type === 'rookie' && Number(a.y) !== Number(year)), x => x.L.rating * 100 + x.L.maps)],
    ['breakout', choose(x => { const prev = H.stats().P[x.nick]?.byYear?.[year - 1]; return !!prev && prev.maps >= 6; }, x => { const prev = H.line(H.stats().P[x.nick].byYear[year - 1]); return x.L.rating - prev.rating; })],
    ['mostimproved', choose(x => { const prev = H.stats().P[x.nick]?.byYear?.[year - 1]; return !!prev && prev.maps >= 6; }, x => { const prev = H.line(H.stats().P[x.nick].byYear[year - 1]); return x.L.rating - prev.rating; })],
    ['lurker', choose(x => /lurker|люркер/.test(roleOf(x)))],
    ['anchor', choose(x => /anchor|defender|якор|защитник/.test(roleOf(x)), x => x.L.kast - x.L.dpr * 5 + x.L.rating * 3)],
    ['utility', choose(() => true, x => x.L.apr * 12 + x.L.kast * .25 + x.L.adr * .05)],
    ['youngstar', choose(x => Number(x.p.age || 99) <= 21, x => x.L.rating * 100 + x.L.maps)]
  ];
  const announcements = [];
  const awardRows = [];
  winners.forEach(([type, row]) => {
    if (!row) return;
    awardRows.push({ nick: row.nick, type, y: year, s: seasonNo, team: row.team });
    announcements.push({ label: (window.TW?.AWARD_DEF?.[type]?.title || type), nick: row.nick, team: row.team });
  });
  return { top, awardRows, announcements, seasonNo };
}
function commitYearAwards(year, computed, force) {
  if (!computed || !window.twAwardsExport || !window.twAwardsImport) return null;
  const st = SS(); if (!st) return null;
  const db = window.twAwardsExport();
  const calendarYears = window.RewardSystem?.getCalendarYears?.() || (Array.isArray(db.calendarYears) ? db.calendarYears : []);
  const alreadyCommitted = calendarYears.map(Number).includes(Number(year));
  const savedRankingVersion = window.RewardSystem?.getYearRankingVersion?.(year) || 0;
  if (!force && alreadyCommitted && savedRankingVersion >= YEAR_RANKING_VERSION) return null;
  const { top, awardRows, announcements, seasonNo } = computed;
  if (window.RewardSystem?.commitPlayerYearAwards) {
    if (!window.RewardSystem.commitPlayerYearAwards(year, top, awardRows, {
      rebuild: alreadyCommitted, rankingVersion: YEAR_RANKING_VERSION, replaceTypes: YEAR_AWARD_TYPES
    })) return null;
  } else {
    // Совместимость для окружений без v62 (например, старых импортированных сборок).
    Object.values(db.p || {}).forEach(rec => {
      rec.top = (rec.top || []).filter(z => Number(z.y ?? z.year) !== Number(year));
      rec.aw = (rec.aw || []).filter(a => !(Number(a.y ?? a.year) === Number(year) && YEAR_AWARD_TYPES.includes(a.type)));
    });
    top.forEach(x => {
      const rec = db.p[x.nick] || (db.p[x.nick] = { mvp: [], ti: [], top: [], aw: [] });
      rec.top.unshift({ r: x.r, y: year, s: seasonNo, team: x.team, mvpCount: x.mvpCount, mvpPoints: x.mvpPoints, rating: x.rating });
    });
    awardRows.forEach(x => {
      const rec = db.p[x.nick] || (db.p[x.nick] = { mvp: [], ti: [], top: [], aw: [] });
      rec.aw = (rec.aw || []).filter(a => !(a.type === x.type && Number(a.y ?? a.year) === Number(year)));
      rec.aw.unshift({ type: x.type, y: year, s: seasonNo, team: x.team });
    });
    db.calendarYears = [...new Set([...calendarYears.map(Number), Number(year)])];
    db.yearRankingVersions = { ...(db.yearRankingVersions || {}), [year]: YEAR_RANKING_VERSION };
    window.twAwardsImport(db);
  }
  try { saveSeasonState(); } catch (e) {}
  return { top, announcements };
}
function generateYearAwards(year) {
  const db = window.twAwardsExport ? window.twAwardsExport() : {};
  const calendarYears = window.RewardSystem?.getCalendarYears?.() || (Array.isArray(db.calendarYears) ? db.calendarYears : []);
  if (calendarYears.map(Number).includes(Number(year)) && (window.RewardSystem?.getYearRankingVersion?.(year) || 0) >= YEAR_RANKING_VERSION) return null;
  return commitYearAwards(year, computeYearAwards(year));
}
function tickCalendarAwards() {
  // v53: индивидуальные награды выдаются только при фактическом завершении сезона,
  // а не по фиксированной дате 14 декабря. Событие season-end обрабатывает v53.
  return false;
}

if (H) {
  // The route aliases used to overwrite the selected tab on every render, so
  // clicking another Hall-of-Fame tab appeared to do nothing.
  H.PAGES.hof = () => { if (!H.S.aw?.tab || H.S.aw.tab === 'year') H.S.aw.tab = 'hof'; return H.PAGES.awards(); };
  H.PAGES.majors = () => { if (!H.S.aw?.tab || H.S.aw.tab === 'year') H.S.aw.tab = 'majors'; return H.PAGES.awards(); };
  // Capture awards subtabs before other delegated handlers; every tab remains responsive.
  document.addEventListener('click', e => {
    const b = e.target.closest?.('#hs-root [data-awtab]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    H.S.aw = H.S.aw || {}; H.S.aw.tab = b.dataset.awtab;
    if (H.S.page !== 'awards' && typeof H.nav === 'function') H.nav('awards');
    else H.render();
  }, true);
}
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; try { tickCalendarAwards(); } catch (e) { console.warn('[v36 calendar awards]', e); } }, 2500);
window.V36Fixes = { yearRows, yearMvpInfo, computeYearAwards, commitYearAwards, generateYearAwards, tickCalendarAwards, YEAR_RANKING_VERSION };
console.info('[v36] календарные награды и исправления интерфейса загружены');
})();
