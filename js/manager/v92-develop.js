/* v92 — Этап 2 · единая модель развития игроков.

   Раньше развитие было двумя несвязанными системами: годовое старение v29 (случайно ±3 по одной общей возрастной кривой,
   без потенциала, характера, тренера и базы — 19-летний мог перерасти собственный потолок) и еженедельные тренировки v31.
   Теперь годовое изменение характеристик считает одна модель:
     • возраст и профиль развития игрока: «рано раскрывается» (пик ~23), «обычный» (~25), «поздно раскрывается» (~27) —
       у каждого игрока свой, закреплён зерном сейва;
     • потенциал (p.pot, v31): рост ограничен оставшимся запасом до потенциала;
     • профессионализм (характер, v31): быстрее растёт, медленнее стареет;
     • тренерский штаб и тренировочная база (CS2Staff, если есть): умножают рост; молодых — тренер по молодёжи;
     • возраст меняет игрока по-разному: после пика первой падает стрельба и клатчи, а тактика и утилити растут с опытом
       до ~33 лет;
     • редкие события: прорыв молодого игрока, затяжной спад.
   Еженедельные тренировки (v31) остаются отдельным вкладом и тоже упираются в потенциал.
   Каждое годовое изменение записывается в p.v92dev с причинами — вкладка «Развитие» в профиле игрока.
   Все коэффициенты — CS2Config 'dev.*' (design). */
(function () {
  'use strict';
  const W = window;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const seed = () => { try { return W.CS2SaveProfile ? W.CS2SaveProfile.state().seed : 0; } catch (e) { return 0; } };
  const u = (...k) => (h32(seed() + '|' + k.join('|')) % 100000) / 100000;
  const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const pers = p => { try { if (W.V31 && W.V31.ensurePerson) W.V31.ensurePerson(p); } catch (e) {} return p.pers || { prof: 10 }; };

  // профиль развития игрока: когда пик и как стареет
  function profile(p) {
    const x = u('bloom', String(p.nick).toLowerCase());
    const bloom = x < 0.22 ? 'early' : x > 0.8 ? 'late' : 'normal';
    const peak = bloom === 'early' ? 23 : bloom === 'late' ? 27 : 25;
    const real = C('dev.realizeMin', 0.25) + (1.1 - C('dev.realizeMin', 0.25)) * u('real', String(p.nick).toLowerCase());
    return { bloom, peak, real: Math.round(real * 100) / 100, label: bloom === 'early' ? 'рано раскрывается' : bloom === 'late' ? 'поздно раскрывается' : 'обычное развитие' };
  }
  // множитель от штаба и базы: тренировки (все), работа с молодёжью (до 21)
  function staffMul(team, p) {
    let m = 1;
    try { if (W.CS2Staff && team) m *= W.CS2Staff.devMul(team, p); } catch (e) {}
    try { if (W.V31 && team && !team.isAcademy) m *= 1 + 0.06 * ((W.V31.org(team.name).fac || {}).training || 0); } catch (e) {}
    return m;
  }
  // годовое изменение характеристик (без записи) — для симуляции и тестов
  function delta(p, team, season, ctx) {
    ctx = ctx || {};
    const age = +p.age || 24, pr = profile(p), prof = (pers(p).prof || 10), why = [];
    const profK = 0.75 + prof / 38;                       // 0.78 … 1.25
    const room = Math.max(0, (Number(p.pot) || pow(p) + 4) - pow(p));
    const noise = (k, a) => (u(k, p.nick, season) * 2 - 1) * a;
    let fp = 0, iq = 0, cl = 0, ut = 0;
    if (age < pr.peak) {
      // реализация таланта: потенциал раскрывают не все — у каждого игрока своя доля (закреплена на всю карьеру)
      const real = C('dev.realizeMin', 0.25) + (1.1 - C('dev.realizeMin', 0.25)) * u('real', String(p.nick).toLowerCase());
      const g = Math.min(room, (C('dev.growBase', 0.9) + C('dev.growPerYear', 0.45) * (pr.peak - age)) * profK * staffMul(team, p) * real * (0.6 + u('g', p.nick, season) * 0.8));
      fp += g; cl += g * 0.7; iq += g * 0.5; ut += g * 0.5;
      why.push(`рост до пика (${pr.label}, пик ~${pr.peak})`);
      if (room > 0.5 && room < 2) why.push('почти достиг потенциала');
      if (room <= 0.5) why.push('потенциал исчерпан');
    } else if (age <= pr.peak + C('dev.plateau', 3)) {
      fp += noise('pf', 0.6) - C('dev.plateauDrift', 0.2); cl += noise('pc', 0.5) - C('dev.plateauDrift', 0.2); iq += C('dev.expIq', 0.15) + noise('pi', 0.3); ut += C('dev.expUt', 0.1);
      why.push('пик карьеры');
    } else {
      const yrs = age - pr.peak - C('dev.plateau', 3), dec = (C('dev.declineBase', 0.8) + C('dev.declinePerYear', 0.45) * (yrs - 1)) * (1.35 - profK * 0.45) * (0.75 + u('d', p.nick, season) * 0.5);
      fp -= dec; cl -= dec * 0.7;
      iq += age <= 33 ? 0.35 : -dec * 0.25; ut += age <= 33 ? 0.2 : -dec * 0.2;
      why.push(`возраст: спад реакции (−${r1(dec)})`);
      if (age <= 33) why.push('опыт: тактика растёт');
      if (prof >= 15) why.push('профессионализм замедляет спад');
    }
    // редкие события
    const ev = u('ev', p.nick, season);
    if (age <= 23 && room >= 3 && ev > 1 - C('dev.breakoutChance', 0.03)) { const b = Math.min(room, 2.5); fp += b; cl += b * 0.6; why.push('прорыв сезона'); ctx.breakout = true; }
    else if (age > 24 && ev < C('dev.slumpChance', 0.03)) { fp -= 1.8; cl -= 1; why.push('затяжной спад'); }
    // потенциал: рост не выводит игрока за потенциал (с запасом на прорыв)
    const cap = (Number(p.pot) || 99) + 0.5, after = { firepower: (+p.firepower || 70) + fp, tacticalIQ: (+p.tacticalIQ || 70) + iq, clutch: (+p.clutch || 70) + cl, utility: (+p.utility || 70) + ut };
    const over = pow(after) - cap;
    if (over > 0 && (fp > 0 || iq > 0)) { const k = clamp(1 - over / Math.max(0.1, fp * .4 + iq * .25 + cl * .2 + ut * .15), 0, 1); fp *= fp > 0 ? k : 1; iq *= iq > 0 ? k : 1; cl *= cl > 0 ? k : 1; ut *= ut > 0 ? k : 1; why.push('упёрся в потенциал'); }
    return { age, d: { firepower: r1(fp), tacticalIQ: r1(iq), clutch: r1(cl), utility: r1(ut) }, why, profile: pr.bloom };
  }
  // применить годовое развитие: возраст +1, характеристики, запись в историю развития
  function annual(p, team, season) {
    p.age = (+p.age || 24) + 1;
    const r = delta(p, team, season);
    const lim = { firepower: [60, 99], tacticalIQ: [60, 99], clutch: [60, 98], utility: [60, 99] };
    Object.entries(r.d).forEach(([k, v]) => { p[k] = clamp(r1((+p[k] || 70) + v), lim[k][0], lim[k][1]); });
    p.v92dev = p.v92dev || [];
    p.v92dev.unshift({ s: season, age: p.age, team: team ? team.name : '', d: r.d, pow: r1(pow(p)), why: r.why });
    if (p.v92dev.length > 10) p.v92dev.length = 10;
    return r;
  }
  // прогон модели на копиях игроков — для калибровки и тестов (ничего не меняет)
  function simulate(players, seasons, teamOf) {
    const clones = players.map(p => JSON.parse(JSON.stringify(p)));
    const out = [];
    for (let s = 1; s <= seasons; s++) {
      clones.forEach((c, i) => { const before = pow(c); annual(c, teamOf ? teamOf(players[i]) : null, 1000 + s); out.push({ s, i, age: c.age, d: pow(c) - before, pot: +c.pot || null, pow: pow(c) }); });
    }
    return { rows: out, clones };
  }
  // сколько дают еженедельные тренировки в этой фазе карьеры: до пика — растут, на пике — держат уровень, после — тормозят спад
  function trainK(p) {
    const age = +p.age || 24, pr = profile(p);
    return age < pr.peak ? C('dev.trainPre', 1) : age <= pr.peak + C('dev.plateau', 3) ? C('dev.trainPeak', 0.25) : C('dev.trainLate', 0.1);
  }
  W.CS2Develop = { profile, delta, annual, simulate, pow, trainK };

  // вкладка «Развитие» в профиле игрока
  const H = W.HS;
  if (H && Array.isArray(H.AFTER)) H.AFTER.push(page => {
    if (page !== 'player') return;
    try {
      const root = document.getElementById('hs-page'); if (!root || root.querySelector('.v92-dev')) return;
      const nick = H.S.arg ? decodeURIComponent(String(H.S.arg).split('/')[0]) : '';
      const all = (typeof teams !== 'undefined' ? teams : []).flatMap(t => (t.players || []).map(p => ({ p, t }))).concat((typeof transferState !== 'undefined' ? transferState.freeAgents || [] : []).map(p => ({ p, t: null })));
      const x = all.find(y => y.p && y.p.nick === nick); if (!x) return;
      const p = x.p, pr = profile(p), log = p.v92dev || [], pot = Number(p.pot);
      const sg = v => (v > 0 ? '+' : '') + v;
      const rows = log.map(e => `<tr><td>сезон ${e.s}</td><td>${e.age}</td><td>${sg(e.d.firepower)}</td><td>${sg(e.d.tacticalIQ)}</td><td>${sg(e.d.clutch)}</td><td>${sg(e.d.utility)}</td><td class="l"><small>${H.esc(e.why.join('; '))}</small></td></tr>`).join('');
      const tr = p.v31tg ? `<p class="hs-note">Тренировки в этом сезоне: +${(+p.v31tg.sum || 0).toFixed(2)} (предел +3 за сезон).</p>` : '';
      const html = `<section class="hs-box v92-dev"><header class="hs-box-h"><h3>Развитие</h3><span class="hs-sub">${H.esc(pr.label)} · пик ~${pr.peak} лет${Number.isFinite(pot) ? ` · потенциал ${pot.toFixed(0)} (сейчас ${pow(p).toFixed(1)})` : ''}</span></header><div class="hs-box-b">
        ${rows ? `<table class="hs-tbl"><thead><tr><th>Сезон</th><th>Возраст</th><th>Огонь</th><th>Тактика</th><th>Клатч</th><th>Утилити</th><th class="l">Почему</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="hs-note">Годовых изменений ещё не было — они считаются в конце сезона.</p>'}${tr}</div></section>`;
      const anchor = root.querySelector('.hs-box:last-of-type') || root.lastElementChild; if (anchor) anchor.insertAdjacentHTML('afterend', html);
    } catch (e) {}
  });
})();
