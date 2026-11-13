/* v93 — Этап 3 · карьера игрока и её завершение.

   КАРТОЧКА КАРЬЕРЫ (профиль игрока, блок «Карьера»): статус (легенда / франшиза / звезда / основной игрок / молодой
   талант / ветеран), сезоны на профессиональном уровне, клубы (летопись v88), пик уровня и сезон пика, лучший сезон
   по развитию (v92), Мейджоры, титулы, MVP, переходы; у завершивших карьеру — сезон, возраст и путь после игры.

   ЗАВЕРШЕНИЕ КАРЬЕРЫ — не один путь «на пенсию», и не по жёсткому возрастному порогу:
     • ветеран без клуба, который ещё на уровне, уходит доигрывать в Tier-2: клуб ниже 35-го места берёт его, если он
       усиливает позицию (правила Roster Engine), — в трансферные окна;
     • завершивший карьеру становится тренером (решение рынка тренеров v84: капитаны и игроки с сильной тактикой —
       чаще), тренером академии своего клуба (опытный игрок, у клуба есть академия), аналитиком (сильная тактика —
       реальный бывший игрок появляется среди кандидатов в аналитики на рынке штаба v92, а ИИ-клуб со слабым
       аналитиком нанимает его в межсезонье) — или уходит со сцены.
   Запись о завершении — seasonState.v93Retired: сезон, возраст, последний клуб, путь, пик, трофеи. Легенды поколения
   (Мейджоры, MVP, игрок года) помечаются отдельно и попадают в новости. */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined' || typeof transferState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DAY = 864e5, WEEK = 7 * DAY;
  const lc = s => String(s || '').toLowerCase();
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const byName = n => teams.find(t => t && t.name === n) || null;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankOf = t => { const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.indexOf(t); return i < 0 ? 999 : i + 1; };
  const news = it => { try { W.V29News && W.V29News.add && W.V29News.add(it); } catch (e) {} };
  const journal = (type, e) => { try { W.CS2Journal && W.CS2Journal.log(type, e); } catch (x) {} };
  const R = () => { const s = seasonState.v93Retired = seasonState.v93Retired || {}; return s; };
  const awardsOf = nick => { try { return (W.RewardSystem.getAllPlayerAwards() || {})[nick] || {}; } catch (e) { return {}; } };
  function trophies(nick) {
    const r = awardsOf(nick), ti = (r.ti || []).filter(t => t && !t.nations && t.k !== 'nations');
    return { majors: ti.filter(t => /major/i.test(String(t.k || t.kind || ''))).length, titles: ti.filter(t => /major|elite|regular/i.test(String(t.k || t.kind || ''))).length,
      mvp: (r.mvp || []).length, poty: (r.aw || []).filter(a => a.type === 'poty').length, top20: (r.top || []).length };
  }
  const isLegend = tr => tr.majors >= 2 || tr.poty >= 1 || (tr.majors >= 1 && tr.mvp >= 1) || tr.titles >= 6;

  /* ---------- пик уровня ---------- */
  function markPeak(p) { if (!p || !p.nick) return; const v = Math.round(pow(p) * 10) / 10; if (!p.v93peak || v > p.v93peak.pow) p.v93peak = { pow: v, s: season(), age: +p.age || null }; }

  /* ---------- завершение карьеры: путь после игры ---------- */
  const ageOfMove = m => +m.age || parseInt(String(m.reason || ''), 10) || null;   // журнал переходов хранит возраст в причине («34 лет»)
  function pathFor(m) {
    const nick = m.player, iq = +m.iq || 0, age = ageOfMove(m) || 33, igl = /IGL/i.test(m.role || '');
    // тренер — решение рынка тренеров v84 (у него своя вероятность: капитаны 70%, тактика 80+ — 45%, остальные — 22%)
    let coach = false; try { coach = !!(W.CS2Coaches && W.CS2Coaches.becomesCoach && W.CS2Coaches.becomesCoach(m)); } catch (e) {}
    if (coach) return { key: 'coach', label: 'тренер' };
    const t = byName(m.from || m.team), ac = t && teams.find(a => a.isAcademy && (a.academyParent || a.parentTeam) === t.name);
    const r = (h32('v93path|' + lc(nick)) % 1000) / 1000;
    const acFree = ac && !(ac.coach && ac.coach.exPlayer && ac.coach.changedAtSeason === season());   // место тренера академии ещё не занято бывшим игроком в этом сезоне
    if (acFree && age >= 31 && r < C('career.academyCoach', 0.35)) return { key: 'academy', label: `тренер академии ${ac.name}`, academy: ac.name };
    if ((iq >= 76 || igl) && r < C('career.analyst', 0.6)) return { key: 'analyst', label: 'аналитик' };
    return { key: 'retired', label: 'ушёл со сцены' };
  }
  function analystSkill(m) { return clamp(Math.round(48 + ((+m.iq || 70) - 70) * 1.6 + (/IGL/i.test(m.role || '') ? 6 : 0)), 50, 92); }
  function onRetire(m) {
    const key = lc(m.player); if (!key || R()[key]) return;
    const path = pathFor(m), tr = trophies(m.player), lastTeam = m.from || m.team || '';
    const rec = { nick: m.player, season: season(), ts: Number(m.ts) || now(), age: ageOfMove(m), lastTeam, role: m.role || '', path: path.key, pathLabel: path.label, trophies: tr, legend: isLegend(tr), fa: !!m.fa };
    R()[key] = rec;
    if (path.key === 'analyst') { const pool = seasonState.v93StaffPool = seasonState.v93StaffPool || { analyst: [] }; pool.analyst.push({ name: m.player, skill: analystSkill(m), exPlayer: true, at: rec.ts + 30 * DAY }); }
    if (path.key === 'academy') { const ac = byName(path.academy); if (ac) { ac.coach = { name: m.player, flag: ac.coach && ac.coach.flag || '🌍', exPlayer: true, changedAtSeason: season() }; rec.academy = ac.name; } }
    journal('CAREER', { player: m.player, team: lastTeam, action: 'retire', reason: `${rec.age || '?'} лет · ${path.label}${rec.legend ? ' · легенда поколения' : ''}` });
    if (rec.legend) news({ cat: 'season', icon: '🏛️', imp: 7, title: `${m.player} завершает карьеру — легенда поколения`, lead: `${tr.majors ? tr.majors + ' Major · ' : ''}${tr.titles} титулов${tr.mvp ? ' · ' + tr.mvp + ' MVP' : ''}. Дальше — ${path.label}.`, body: [], tags: [{ t: 'player', v: m.player }] });
    else if (path.key !== 'retired') news({ cat: 'roster', icon: '🎓', imp: 4, title: `${m.player} после карьеры — ${path.label}`, lead: `${rec.age || ''} лет, последний клуб — ${lastTeam || '—'}.`, body: [], tags: [{ t: 'player', v: m.player }] });
  }
  function scanRetirements() {
    const moves = transferState.v30Moves || [];
    for (let i = 0; i < Math.min(moves.length, 200); i++) { const m = moves[i]; if (m && m.type === 'retire' && m.player && !R()[lc(m.player)]) onRetire(m); }
  }
  // межсезонье: ИИ-клуб со слабым аналитиком нанимает бывшего игрока из пула
  function hireAnalysts() {
    const pool = seasonState.v93StaffPool && seasonState.v93StaffPool.analyst; if (!pool || !pool.length || !W.CS2Staff) return;
    const s = season(); if (seasonState.v93AnalystSeason === s) return; seasonState.v93AnalystSeason = s;
    const me = W.V31 && W.V31.managed && W.V31.managed();
    pro().filter(t => t.name !== me).sort((a, b) => (b.pts || 0) - (a.pts || 0)).forEach(t => {
      const cur = W.CS2Staff.of(t).analyst, i = pool.findIndex(x => x.at <= now() && x.skill >= cur.skill + 8); if (i < 0) return;
      const x = pool.splice(i, 1)[0]; t.v92staff.analyst = { name: x.name, skill: x.skill, salary: 0, since: now(), exPlayer: true };
      journal('STAFF', { team: t.name, action: 'hire', reason: `аналитик ${x.name} (бывший игрок)` });
    });
  }

  /* ---------- ветеран без клуба уходит доигрывать в Tier-2 ---------- */
  function windowOpen() { const m = new Date(now()).getMonth(); return [0, 1, 5, 6, 7, 11].includes(m); }
  let vetWk = -1;
  function veteransToTier2() {
    const wk = Math.floor(now() / WEEK); if (wk === vetWk || !windowOpen()) return 0; vetWk = wk;
    const D = W.v30MarketDebug, RE = W.CS2Roster; if (!D || !RE) return 0;
    const me = W.V31 && W.V31.managed && W.V31.managed();
    const fa = (transferState.freeAgents || []).filter(p => p && p.nick && (+p.age || 25) >= C('career.vetAge', 30) && p.v84FaSince && now() - p.v84FaSince >= C('career.vetWaitDays', 30) * DAY && !p.reservedFor && pow(p) >= C('career.vetMinLevel', 72))
      .sort((a, b) => pow(b) - pow(a));
    let n = 0;
    for (const p of fa) {
      if (n >= C('career.vetPerWeek', 2)) break;
      const clubs = pro().filter(t => t.name !== me && rankOf(t) >= C('career.tier2From', 35) && !t.tempStandIn);
      let best = null;
      clubs.forEach(t => { const w = D.weakLink(t); if (!w || !(w.p.role === p.role || (!['AWPer', 'IGL'].includes(w.p.role) && !['AWPer', 'IGL'].includes(p.role)))) return;
        const g = RE.coreGain(p, w.p); if (g < RE.needGain(t, w.p)) return; if (W.CS2Expect && !W.CS2Expect.evaluate(p, null, t, { out: w.p }).accept) return;
        if (!best || g > best.g) best = { t, w, g }; });
      if (!best) continue;
      const idx = transferState.freeAgents.indexOf(p);
      const ok = D.signFA(best.t, best.w.p, `опытный игрок: ${p.nick} (${p.age}) продолжает карьеру`, { src: 'fa', p, idx, score: best.g, gain: best.g });
      if (ok) { n++; journal('CAREER', { player: p.nick, team: best.t.name, action: 'tier2', reason: `${p.age} лет: продолжает карьеру в ${best.t.name} (№${rankOf(best.t)})` }); }
    }
    return n;
  }

  /* ---------- карточка карьеры ---------- */
  function card(nick) {
    const key = lc(nick), all = teams.flatMap(t => (t.players || []).map(p => ({ p, t }))).concat((transferState.freeAgents || []).map(p => ({ p, t: null })));
    const x = all.find(y => y.p && lc(y.p.nick) === key) || null, p = x && x.p, ret = R()[key] || null;
    const L = (transferState.v88Career || {})[nick] || [], clubs = [...new Set(L.map(e => e[1]).filter(Boolean))];
    const firstS = L.length ? Math.min(...L.map(e => +e[2] || season())) : season();
    const tr = trophies(nick), tier = p && W.CS2Stature ? W.CS2Stature.tier(p) : 'regular', age = p ? +p.age || 25 : ret && ret.age;
    const dev = (p && p.v92dev) || [], best = dev.slice().sort((a, b) => (b.pow || 0) - (a.pow || 0))[0] || null;
    const legend = (ret && ret.legend) || isLegend(tr);
    const status = ret ? 'завершил карьеру' : legend ? 'легенда' : tier === 'franchise' ? 'франшиза' : tier === 'star' ? 'звезда' : age <= 21 ? 'молодой талант' : age >= 31 ? 'ветеран' : 'основной игрок';
    return { nick, status, legend, active: !ret, team: x && x.t ? x.t.name : null, seasons: (ret ? ret.season : season()) - firstS + 1, clubs, transfers: Math.max(0, L.length - 1),
      peak: p && p.v93peak || null, best: best ? { s: best.s, pow: best.pow } : null, trophies: tr, retired: ret };
  }
  W.CS2Careers = { card, onRetire, scan: scanRetirements, veteransToTier2, hireAnalysts, retired: () => Object.values(R()), markPeak, pathFor };

  // штаб v92: бывшие игроки — среди кандидатов в аналитики
  (function () {
    const S = W.CS2Staff; if (!S || !S.market || S.market.__v93) return;
    const f = S.market;
    S.market = function (t) {
      const mk = f.apply(this, arguments); if (!mk || mk.v93) return mk;
      const pool = (seasonState.v93StaffPool && seasonState.v93StaffPool.analyst) || [];
      pool.filter(x => x.at <= now()).slice(0, 2).forEach(x => { const sal = Math.round((40000 + Math.pow(Math.max(0, x.skill - 40) / 55, 2) * 260000) / 1000) * 1000; mk.analyst.unshift({ name: x.name + ' (бывший игрок)', skill: x.skill, salary: sal, fee: Math.round(sal * 0.5 / 1000) * 1000, exPlayer: true }); });
      mk.v93 = true; return mk;
    };
    S.market.__v93 = true;
  })();

  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => {
    try { scanRetirements(); } catch (e) { console.warn('[v93 careers]', e); }
    try { if (!W.v57BatchCalendarSkip) { veteransToTier2(); hireAnalysts(); } } catch (e) { console.warn('[v93 careers]', e); }
    try { teams.forEach(t => (t.players || []).forEach(markPeak)); } catch (e) {}
  }, 5000, 'v93-careers');
  // при перемотке — каждый игровой день (снимок рейтинга)
  (function hookDaily() {
    const f = W.V30RankSnapshotTick; if (typeof f !== 'function') { setTimeout(hookDaily, 1000); return; }
    if (f.__v93c) return;
    const w = function () { const r = f.apply(this, arguments); try { scanRetirements(); veteransToTier2(); hireAnalysts(); } catch (e) {} return r; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v93c = true; W.V30RankSnapshotTick = w;
  })();

  /* ---------- блок «Карьера» в профиле игрока ---------- */
  const H = W.HS;
  if (H && Array.isArray(H.AFTER)) H.AFTER.push(page => {
    if (page !== 'player') return;
    try {
      const root = document.getElementById('hs-page'); if (!root || root.querySelector('.v93-career')) return;
      const nick = H.S.arg ? decodeURIComponent(String(H.S.arg).split('/')[0]) : ''; if (!nick) return;
      const c = card(nick), tr = c.trophies, esc = H.esc;
      const stat = (v, l) => `<div><small>${l}</small><b>${v}</b></div>`;
      const html = `<section class="hs-box v93-career"><header class="hs-box-h"><h3>Карьера</h3><span class="hs-sub">${esc(c.status)}${c.legend && c.status !== 'легенда' ? ' · легенда поколения' : ''}</span></header><div class="hs-box-b">
        <div class="pt-kpis">${stat(c.seasons, 'Сезонов в профи')}${stat(c.clubs.length, 'Клубов')}${stat(c.transfers, 'Переходов')}${stat(tr.majors, 'Major')}${stat(tr.titles, 'Титулов')}${stat(tr.mvp, 'MVP')}${c.peak ? stat(c.peak.pow.toFixed(1), `Пик (сезон ${c.peak.s})`) : ''}${c.best ? stat(c.best.pow.toFixed(1), `Лучший сезон: ${c.best.s}`) : ''}</div>
        ${c.clubs.length ? `<p class="hs-note">Клубы: ${c.clubs.map(esc).join(' → ')}</p>` : ''}
        ${c.retired ? `<p class="hs-note">Завершил карьеру в сезоне ${c.retired.season}${c.retired.age ? ` в ${c.retired.age} лет` : ''}${c.retired.lastTeam ? `, последний клуб — ${esc(c.retired.lastTeam)}` : ''}. После игры — ${esc(c.retired.pathLabel)}.</p>` : ''}</div></section>`;
      const head = root.querySelector('.hs-phead') || root.querySelector('.hs-head'); if (head) head.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('afterbegin', html);
    } catch (e) {}
  });
})();
