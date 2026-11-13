/* v84 — «вес» игрока на сцене (stature). Единая мера для всех решений о составах.
   Раньше ИИ составов смотрел только на атрибуты относительно своей пятёрки: в суперкоманде звезда в спаде формы
   становилась «слабым звеном» и садилась на скамейку, а потом уходила в команду из топ-50 — даже двукратный
   игрок года и чемпион Мейджоров. Теперь у игрока есть вес карьеры:
     Мейджор — 3, титул S-Tier/Tier-1 — 1, игрок года — 5, место в топ-20 (топ-5 — 2, остальные — 1),
     MVP — 1, плюс текущий уровень: топ-10 игроков мира по силе — +6, топ-25 — +3.
   Ступени:
     • франшиза (≥ 10, до 31 года) — клуб не скамеит и не продаёт игрока по своей инициативе, контракт продлевается;
       перейти может только в клуб из топ-10 мирового рейтинга;
     • звезда (≥ 5) — переходит только в клуб из топ-20 и не уходит в команду ниже его нынешней;
   Исключения: сделки самого менеджера и клубы в долгах. */
(function () {
  'use strict';
  const W = window;
  const pow = p => (+p.firepower || 70) * .4 + (+p.tacticalIQ || 70) * .25 + (+p.clutch || 70) * .2 + (+p.utility || 70) * .15;
  const TS = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  let AW = null, awAt = 0, PR = null, prAt = 0;
  function awards() {
    const now = Date.now(); if (AW && now - awAt < 20000) return AW; awAt = now;
    try { AW = W.RewardSystem?.getAllPlayerAwards?.() || {}; } catch (e) { AW = {}; }
    return AW;
  }
  function powerRanks() {
    const now = Date.now(); if (PR && now - prAt < 20000) return PR; prAt = now;
    // v89: скамейка и свободные агенты тоже в списке. Раньше игрок, посаженный на скамейку, выпадал из расчёта
    // текущей силы, терял баллы за неё и мог перестать считаться звездой — после чего его отпускали без клуба.
    const seen = new Set(), all = [];
    const add = p => { if (p && p.nick && !seen.has(p.nick)) { seen.add(p.nick); all.push(p); } };
    TS().filter(t => t && !t.isAcademy).forEach(t => (t.players || []).forEach(add));
    (typeof transferState !== 'undefined' ? transferState.freeAgents || [] : []).forEach(add);
    PR = new Map(); all.sort((a, b) => pow(b) - pow(a)).forEach((p, i) => PR.set(p.nick, i + 1));
    return PR;
  }
  // v89: карьера до 2026 года. Если история не импортирована при создании игры (режим «с нуля»), клубы всё равно
  // знают, кто выигрывал Мейджоры и становился игроком года: эти заслуги учитываются в весе карьеры (но не в профиле).
  let LG = null;
  function legacyScore(nick) {
    if (!LG) {
      const H = W.CS2LegacyHistory; if (!H) return 0;
      LG = new Map(); const add = (n, v) => LG.set(n, (LG.get(n) || 0) + v);
      (H.MAJORS || []).forEach(x => (x[3] || []).forEach(n => add(n, 3)));
      (H.ELITE || []).forEach(x => (x[3] || []).forEach(n => add(n, 1)));
      (H.POTY || []).forEach(x => add(x[1], 5 + 2));   // награда + место №1 в топ-20 года
    }
    return LG.get(nick) || 0;
  }
  // v89: репутация — реальный уровень игрока из базы 2026 (не меняется от того, в составе он или на скамейке)
  function reputation(nick) {
    const sk = Number(W.CS2_REAL && W.CS2_REAL.meta && W.CS2_REAL.meta[nick] && W.CS2_REAL.meta[nick].skill) || 0;
    return sk >= 92 ? 3 : sk >= 89 ? 2 : sk >= 86 ? 1 : 0;
  }
  function score(p) {
    if (!p || !p.nick) return 0;
    const r = awards()[p.nick] || {}; let s = 0;
    const hasLegacy = (r.ti || []).some(x => x && x.legacy) || (r.aw || []).some(x => x && x.legacy);
    if (!hasLegacy) s += legacyScore(p.nick);
    s += reputation(p.nick);
    (r.ti || []).forEach(x => { const k = String(x.kind || x.k || x.prestige || x.n || ''); if (/major/i.test(k)) s += 3; else if (/elite|s-tier|regular|tier-?1/i.test(k)) s += 1; });
    (r.aw || []).forEach(x => { if (x.type === 'poty') s += 5; });
    (r.top || []).forEach(x => { s += (+x.r || 99) <= 5 ? 2 : 1; });
    s += (r.mvp || []).length;
    const pr = powerRanks().get(p.nick); if (pr && pr <= 10) s += 6; else if (pr && pr <= 25) s += 3;
    return s;
  }
  const age = p => Number(p?.age) || 25;
  // ступени — относительные: франшиза — 12 игроков мира с наибольшим весом (и вес ≥ 8), звезда — следующие до 30-го (вес ≥ 5)
  let SR = null, srAt = 0;
  function standing() {
    const now = Date.now(); if (SR && now - srAt < 20000) return SR; srAt = now;
    const all = TS().filter(t => t && !t.isAcademy).flatMap(t => t.players || []).filter(p => p && p.nick)
      .concat((typeof transferState !== 'undefined' ? transferState.freeAgents || [] : []).filter(p => p && p.nick));
    const sc = all.map(p => [p.nick, score(p)]).sort((a, b) => b[1] - a[1]);
    SR = new Map(); sc.forEach(([n, v], i) => { if (!SR.has(n)) SR.set(n, { i: i + 1, v }); });
    return SR;
  }
  const tierOf = p => { const r = p && standing().get(p.nick); if (!r) return 'regular';
    return r.i <= 12 && r.v >= 8 && age(p) <= 31 ? 'franchise' : r.i <= 30 && r.v >= 5 && age(p) <= 33 ? 'star' : 'regular'; };
  const rankOf = t => { if (!t || t.isAcademy) return 999; const l = TS().filter(x => !x.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.indexOf(t); return i < 0 ? 999 : i + 1; };
  const inDebt = t => { try { return Number(W.V31?.org?.(t.name)?.budget) < 0; } catch (e) { return false; } };
  // клуб сам не убирает такого игрока из состава (скамейка, продажа, «слабое звено»)
  const protectedIn = (p, team) => !!p && !W.__v31UserDeal && tierOf(p) === 'franchise' && !(team && inDebt(team));
  // v89: реальная причина расстаться со звездой — возраст со спадом формы или затяжной спад, а не то, что она оказалась
  // слабейшей в пятёрке по одному из текущих показателей.
  const CF = (k, d) => { try { return W.CS2Config ? W.CS2Config.get(k, d) : d; } catch (e) { return d; } };
  const declining = p => { const a = age(p), f = +p.form || 100; return (a >= CF('stature.declineAge', 32) && f < CF('stature.declineForm', 96)) || f <= CF('stature.slumpForm', 88); };
  // клуб сам не убирает игрока из основы: франшиза — никогда, звезда — пока нет явного спада
  const shielded = (p, team) => {
    if (!p || W.__v31UserDeal || (team && inDebt(team))) return false;
    const tr = tierOf(p); return tr === 'franchise' || (tr === 'star' && !declining(p));
  };
  // может ли игрок перейти/подписаться в команду (по своему весу)
  function canJoin(p, toTeam, fromTeam) {
    if (!p || !toTeam || W.__v31UserDeal) return true;
    if (toTeam.isAcademy) return age(p) <= 21;
    const tier = tierOf(p), rt = rankOf(toTeam), rf = fromTeam ? rankOf(fromTeam) : 999;
    // v95: свободный агент без клуба со временем снижает требования (s1mple после распада BC.GAME больше года ждал
    // приглашения из топ-10): +2 места рейтинга за каждый месяц без клуба для франшизы, +3 — для звезды
    let months = 0;
    try { if (!fromTeam && p.v84FaSince) months = Math.max(0, ((Number(seasonState.calendar.currentMs) || Date.now()) - p.v84FaSince) / (30 * 864e5)); } catch (e) {}
    if (tier === 'franchise') return rt <= Math.min(30, 10 + Math.floor(months * 2)) || (rf < 999 && rt < rf);
    if (tier === 'star') return rt <= Math.min(40, 20 + Math.floor(months * 3)) || (rf < 999 && rt < rf);
    return true;
  }
  W.CS2Stature = { score, tier: tierOf, protectedIn, shielded, declining, canJoin, rankOf, pow, reset() { AW = PR = SR = null; awAt = prAt = srAt = 0; } };
})();
