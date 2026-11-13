/* v93 — Этап 3 · болельщики и популярность клуба.

   Популярность организации (0–100) складывается из того, что у клуба есть:
     • история — титулы в игре (архив HLTV) и реальные Мейджоры до 2026 года (CS2LegacyHistory);
     • звёзды в составе (вес карьеры CS2Stature);
     • регион (большие фанатские базы СНГ, Европы и Бразилии);
     • текущие результаты (место в рейтинге);
     • медиаотдел клуба (v31);
     • настроение болельщиков — оно меняется от событий и постепенно возвращается к норме (−2% в неделю).
   События: титул (+), провал на турнире Tier-1 (−), уход легенды, франшизы, звезды или игрока, отыгравшего за клуб 2+ сезона
   с трофеями (сильный минус и новость о реакции фанатов), приход звезды (+), свой воспитанник в основе (+).
   Влияние: популярность постепенно подтягивает репутацию организации (v31 rep) — от неё зависят спонсорские контракты.
   Клуб с большой фанатской базой сильнее чувствует продажу легенды.
   Коэффициенты — CS2Config 'fans.*' (design). */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DAY = 864e5, WEEK = 7 * DAY;
  const lc = s => String(s || '').toLowerCase();
  const norm = s => lc(s).replace(/[^a-z0-9]/g, '');
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankOf = t => { const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.indexOf(t); return i < 0 ? 99 : i + 1; };
  const byName = n => teams.find(t => t && t.name === n) || null;
  const news = it => { try { W.V29News && W.V29News.add && W.V29News.add(it); } catch (e) {} };
  const S = () => { const s = seasonState.v93Fans = seasonState.v93Fans || { mood: {}, seenJ: 0, seenA: {}, wk: 0, log: {} }; return s; };
  const REGION = { CIS: 10, EU: 8, BR: 9, SA: 7, AM: 6, NA: 6, AS: 5, OCE: 4, ME: 5 };

  let legacyIx = null;
  function legacyMajors(name) {
    if (!legacyIx) { legacyIx = {}; ((W.CS2LegacyHistory && W.CS2LegacyHistory.MAJORS) || []).forEach(m => { const k = norm(m[2]); legacyIx[k] = (legacyIx[k] || 0) + 1; }); }
    return legacyIx[norm(name)] || 0;
  }
  function titlesAll(name) { let A = {}; try { A = W.hubArchiveExport ? W.hubArchiveExport() : {}; } catch (e) {} return Object.values(A).filter(x => x && !x.show && x.champion === name && /major|elite|regular/i.test(String(x.prestige || x.kind || ''))).length; }
  function parts(t) {
    const st = (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
    const S2 = W.CS2Stature;
    const stars = st.reduce((a, p) => { const tr = S2 ? S2.tier(p) : 'regular'; return a + (tr === 'franchise' ? 8 : tr === 'star' ? 4 : 0); }, 0);
    let region = 'EU'; try { region = (W.CS2Realism && W.CS2Realism.regionOfTeam && W.CS2Realism.regionOfTeam(t)) || 'EU'; } catch (e) {}
    let media = 0; try { media = (W.V31.org(t.name).fac || {}).media || 0; } catch (e) {}
    const rk = rankOf(t);
    return {
      history: Math.min(25, legacyMajors(t.name) * 4 + titlesAll(t.name) * 2),
      stars: Math.min(20, stars),
      region: REGION[region] != null ? REGION[region] : 6,
      results: Math.round(Math.max(0, 25 * (1 - (rk - 1) / 60))),
      media: media * 3,
      mood: Math.round(S().mood[t.name] || 0)
    };
  }
  function popularity(t) { const p = parts(t); return clamp(Math.round(p.history + p.stars + p.region + p.results + p.media + p.mood), 1, 100); }
  const followers = pop => Math.round((5000 + Math.pow(pop, 2.2) * 95) / 1000) * 1000;
  function bump(name, d, why, newsIt) {
    const s = S(); s.mood[name] = clamp((s.mood[name] || 0) + d, -C('fans.moodMax', 30), C('fans.moodMax', 30));
    const lg = s.log[name] = s.log[name] || []; lg.unshift({ ts: now(), d: Math.round(d * 10) / 10, why }); if (lg.length > 12) lg.length = 12;
    if (newsIt) news(newsIt);
  }
  // реакция на изменения составов (журнал Roster Engine) и на титулы
  function react() {
    const s = S(), J = (typeof transferState !== 'undefined' && transferState.v90Journal) || [];
    const fresh = J.filter(e => e && e.type === 'ROSTER_CHANGE' && e.ts > (s.seenJ || 0));
    if (J[0]) s.seenJ = Math.max(s.seenJ || 0, J[0].ts);
    fresh.forEach(e => {
      const t = byName(e.team); if (!t || t.isAcademy) return;
      const big = popularity(t) / 50;   // большая фанатская база реагирует сильнее
      if (e.out && e.kind !== 'standin' && e.kind !== 'loan-return') {
        const out = (typeof transferState !== 'undefined' ? transferState.freeAgents || [] : []).concat(teams.flatMap(x => x.players || [])).find(p => p && p.nick === e.out) || { nick: e.out };
        const tr = W.CS2Stature ? W.CS2Stature.tier(out) : 'regular';
        const L = (transferState.v88Career || {})[e.out] || [], tenure = L.filter(x => x[1] === t.name).length ? (Number(seasonState.currentSeason) || 1) - Math.min(...L.filter(x => x[1] === t.name).map(x => +x[2] || 1)) : 0;
        let legend = false; try { const c = W.CS2Careers && W.CS2Careers.card(e.out); legend = !!(c && c.legend); } catch (x) {}
        if (legend || tr === 'franchise') bump(t.name, -C('fans.legendOut', 10) * big, `ушёл ${e.out}`, { cat: 'roster', icon: '😠', imp: 6, title: `Фанаты ${t.name} не принимают уход ${e.out}`, lead: legend ? 'Легенда клуба покидает основу — болельщики требуют объяснений.' : 'Лицо клуба теряет место в основе.', body: [], tags: [{ t: 'team', v: t.name }, { t: 'player', v: e.out }] });
        else if (tr === 'star' || tenure >= 2) bump(t.name, -C('fans.starOut', 5) * big, `ушёл ${e.out}`);
      }
      if (e.player && e.kind !== 'standin') {
        const inc = teams.flatMap(x => x.players || []).find(p => p && p.nick === e.player) || { nick: e.player };
        const tr = W.CS2Stature ? W.CS2Stature.tier(inc) : 'regular';
        if (tr === 'franchise' || tr === 'star') bump(t.name, C('fans.starIn', 5), `пришёл ${e.player}`);
        if (e.kind === 'academy' || inc.academyGrad === t.name) bump(t.name, C('fans.gradIn', 3), `свой воспитанник ${e.player}`);
      }
    });
    // титулы и провалы
    let A = {}; try { A = W.hubArchiveExport ? W.hubArchiveExport() : {}; } catch (e) {}
    Object.entries(A).forEach(([id, x]) => {
      if (!x || x.show || s.seenA[id] || !/major|elite|regular/i.test(String(x.prestige || x.kind || ''))) return; s.seenA[id] = 1;
      if (x.champion && byName(x.champion)) bump(x.champion, (x.prestige === 'major' ? 2 : 1) * C('fans.title', 6), `титул: ${x.name}`);
      (x.results || []).forEach(r => { const t = byName(r.n); if (t && !t.isAcademy && r.p >= 9 && rankOf(t) <= 10) bump(t.name, -C('fans.flop', 2), `провал: ${x.name}`); });
    });
  }
  // раз в неделю: настроение возвращается к норме, популярность подтягивает репутацию организации
  function weekly() {
    const s = S(), wk = Math.floor(now() / WEEK); if (s.wk === wk) return; const steps = s.wk ? Math.min(12, wk - s.wk) : 1; s.wk = wk;
    Object.keys(s.mood).forEach(k => { s.mood[k] = Math.round(s.mood[k] * Math.pow(1 - C('fans.decay', 0.02), steps) * 100) / 100; });
    if (!W.V31) return;
    // шкалы разные: репутация организации (v31) — 18…90 по уровню клуба, популярность — 1…100; цель репутации = 15 + 1.1 × популярность
    // (без этого репутация маленьких клубов утекала вниз, а с ней и спонсорские деньги — проверка экономики на 2 сезонах)
    pro().forEach(t => { try { const o = W.V31.org(t.name), target = clamp(15 + popularity(t) * 1.1, 0, 100); o.rep = clamp(Math.round((o.rep + (target - o.rep) * C('fans.repPull', 0.05) * steps) * 10) / 10, 0, 100); } catch (e) {} });
  }
  // первичная «база» титулов: только новые титулы двигают настроение (старый архив — уже часть истории)
  (function init() { const s = S(); if (s.init) return; s.init = 1; let A = {}; try { A = W.hubArchiveExport ? W.hubArchiveExport() : {}; } catch (e) {} Object.keys(A).forEach(id => { s.seenA[id] = 1; }); const J = (typeof transferState !== 'undefined' && transferState.v90Journal) || []; s.seenJ = J[0] ? J[0].ts : 0; })();
  W.CS2Fans = { popularity, parts, followers, bump, react, weekly, log: n => (S().log[n] || []).slice(), mood: n => S().mood[n] || 0 };
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { react(); weekly(); } catch (e) { console.warn('[v93 fans]', e); } }, 5000, 'v93-fans');
  (function hookDaily() {
    if (typeof window.V30RankSnapshotTick !== 'function') { setTimeout(hookDaily, 1000); return; } CS2.patch('V30RankSnapshotTick', f => function () { const r = f.apply(this, arguments); try { react(); weekly(); } catch (e) {} return r; }, { id: '__v93f' });
  })();

  // на странице команды
  const H = W.HS;
  if (H && Array.isArray(H.AFTER)) H.AFTER.push(page => {
    if (page !== 'team') return;
    try {
      const root = document.getElementById('hs-page'), name = (H.S && H.S.arg ? decodeURIComponent(String(H.S.arg).split('/')[0]) : '');
      const t = teams.find(x => x.name === name); if (!t || t.isAcademy || root.querySelector('.v93-fans')) return;
      const pop = popularity(t), p = parts(t), lg = S().log[name] || [], m = S().mood[name] || 0;
      const mood = m >= 8 ? 'в восторге' : m >= 3 ? 'довольны' : m <= -8 ? 'возмущены' : m <= -3 ? 'недовольны' : 'спокойны';
      const fl = followers(pop), fmt = fl >= 1e6 ? (fl / 1e6).toFixed(1) + ' млн' : Math.round(fl / 1000) + ' тыс.';
      const html = `<section class="hs-box v93-fans"><header class="hs-box-h"><h3>Болельщики: ${fmt}</h3><span class="hs-sub">популярность ${pop} · болельщики ${mood}</span></header><div class="hs-box-b">
        <p class="hs-note">История ${p.history} · звёзды ${p.stars} · регион ${p.region} · результаты ${p.results} · медиа ${p.media} · настроение ${p.mood > 0 ? '+' : ''}${p.mood}</p>
        ${lg.length ? `<ul>${lg.slice(0, 5).map(x => `<li>${x.d > 0 ? '▲' : '▼'} ${H.esc(x.why)}</li>`).join('')}</ul>` : ''}</div></section>`;
      const anchor = root.querySelector('.v93-era') || root.querySelector('.hs-head') || root.firstElementChild; if (anchor) anchor.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('afterbegin', html);
    } catch (e) {}
  });
})();
