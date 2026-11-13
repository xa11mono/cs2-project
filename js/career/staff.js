/* v92 — Этап 2 · тренерский штаб.

   Раньше у клуба был один тренер с общим рейтингом и стилем (v84), который давал прибавку к силе команды. Теперь штаб —
   три роли, у каждой свой понятный канал влияния (не «+5% ко всему»):
     • главный тренер — навыки «тренировочный процесс» (скорость развития игроков), «тактика» (поправка к раунду против
       тактики соперника), «работа с молодёжью» (развитие игроков до 21 года), «работа с людьми» (мораль); и игровой
       стиль: агрессивный, структурный или сбалансированный. Навыки выводятся из профиля тренера v84 (рейтинг и стиль):
       сильный аналитик не становится автоматически сильным главным тренером;
     • аналитик — точность разведки соперника: от неё зависит качество подготовки (v31 prep) и то, насколько верны выводы
       в отчёте (слабый аналитик ошибается в процентах побед соперника на картах);
     • тренер по нагрузке — дополнительное восстановление усталости игроков каждую неделю.
   Совместимость стиля главного тренера с игрой команды видна ДО найма. Несовместимый тренер первые недели (адаптация)
   ослабляет команду; дальше остаётся небольшой минус, пока стили не совпадают.
   Менеджер нанимает штаб на странице «Штаб» (кандидаты обновляются раз в месяц, главные тренеры — с рынка тренеров v84);
   у ИИ-клубов аналитик и тренер по нагрузке — по уровню и богатству клуба (их зарплаты — в прежних расходах клуба),
   главный тренер — как раньше. Зарплаты нанятых менеджером аналитика и тренера по нагрузке списываются раз в неделю.
   Коэффициенты — CS2Config 'staff.*' (design). */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DAY = 864e5, WEEK = 7 * DAY;
  const lc = s => String(s || '').toLowerCase();
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const seed = () => { try { return W.CS2SaveProfile ? W.CS2SaveProfile.state().seed : 0; } catch (e) { return 0; } };
  const u = (...k) => (h32(seed() + '|' + k.join('|')) % 100000) / 100000;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankOf = t => { const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.indexOf(t); return i < 0 ? 99 : i + 1; };
  const byName = n => teams.find(t => t && t.name === n) || null;
  const PACE_L = { aggressive: 'агрессивный', structured: 'структурный', balanced: 'сбалансированный' };
  const STYLE_L = { Aggressive: 'агрессивная', Discipline: 'дисциплинированная', Tactical: 'тактическая', Chaos: 'хаотичная' };
  const COMPAT = { aggressive: { Aggressive: 1, Chaos: .8, Tactical: .5, Discipline: .3 }, structured: { Discipline: 1, Tactical: .9, Aggressive: .4, Chaos: .3 }, balanced: { Aggressive: .75, Chaos: .7, Tactical: .8, Discipline: .8 } };

  /* ---------- главный тренер: навыки из профиля v84 ---------- */
  function coachProfile(c) { try { return W.CS2Manager2 && W.CS2Manager2.coachProfile ? W.CS2Manager2.coachProfile(c) : { style: 'Тактик', rating: 70 }; } catch (e) { return { style: 'Тактик', rating: 70 }; } }
  function headOf(t) {
    const c = t && t.coach; const pr = coachProfile(c), R = pr.rating, S = pr.style;
    const j = k => Math.round((u('head', c && c.name, k) * 2 - 1) * 4);
    const sk = {
      training: clamp(R + (S === 'Наставник молодёжи' ? 2 : S === 'Мотиватор' ? -2 : 0) + j('tr'), 45, 96),
      tactics: clamp(R + (S === 'Тактик' ? 6 : S === 'Аналитик' ? 3 : S === 'Мотиватор' ? -4 : -2) + j('ta'), 45, 96),
      youth: clamp(R + (S === 'Наставник молодёжи' ? 10 : -4) + j('yo'), 45, 96),
      people: clamp(R + (S === 'Мотиватор' ? 8 : S === 'Аналитик' ? -3 : 0) + j('pe'), 45, 96)
    };
    const pace = (c && c.pace) || (S === 'Мотиватор' ? 'aggressive' : S === 'Тактик' || S === 'Аналитик' ? 'structured' : 'balanced');
    return { name: c && c.name || '—', style: S, rating: R, pace, skills: sk, since: (c && c.v92since) || 0 };
  }
  /* ---------- аналитик и тренер по нагрузке ---------- */
  const SYL_A = ['Ar', 'Bel', 'Cor', 'Dan', 'Eli', 'Fro', 'Gre', 'Hav', 'Ivo', 'Jen', 'Kos', 'Lun', 'Mik', 'Nor', 'Oli', 'Pav', 'Rus', 'Sten', 'Tor', 'Vik'];
  const SYL_B = ['ak', 'en', 'is', 'or', 'ov', 'sen', 'son', 'ta', 'us', 'lin', 'mar', 'ek'];
  const genName = (...k) => SYL_A[h32(seed() + 'n1' + k.join()) % SYL_A.length] + SYL_B[h32(seed() + 'n2' + k.join()) % SYL_B.length] + ' ' + String.fromCharCode(65 + h32(seed() + 'n3' + k.join()) % 26) + '.';
  function wealthBase(t) {
    let cls = 'other'; try { cls = W.CS2SaveProfile ? W.CS2SaveProfile.wealthClass(t.name, rankOf(t)) : 'other'; } catch (e) {}
    return { ultra: [76, 92], rich: [72, 90], top10: [66, 86], top25: [60, 80], top50: [54, 74], other: [45, 68] }[cls] || [45, 68];
  }
  function support(t) {
    if (!t.v92staff) {
      const [lo, hi] = wealthBase(t);
      const mk = role => ({ name: genName(t.name, role), skill: Math.round(lo + (hi - lo) * u(role, t.name)), since: 0, salary: 0 });
      t.v92staff = { analyst: mk('analyst'), perf: mk('perf') };
      ['analyst', 'perf'].forEach(r => { t.v92staff[r].salary = salaryOf(t.v92staff[r].skill); });
    }
    return t.v92staff;
  }
  const salaryOf = sk => Math.round((40000 + Math.pow(Math.max(0, sk - 40) / 55, 2) * 260000) / 1000) * 1000;
  function staffOf(t) { return t ? { head: headOf(t), analyst: support(t).analyst, perf: support(t).perf } : null; }

  /* ---------- влияние ---------- */
  // развитие игрока: тренировочный процесс главного тренера; для молодых — работа с молодёжью
  function devMul(t, p) {
    if (!t) return 1;
    const h = headOf(t).skills, k = x => (x - 70) / 26;   // 70 — середина: множитель 1
    let m = 1 + C('staff.devK', 0.15) * k(h.training);
    if ((+p.age || 25) <= 21) m *= 1 + C('staff.youthK', 0.15) * k(h.youth);
    return clamp(m, 0.75, 1.3);
  }
  // совместимость стиля тренера с игрой команды (0..1)
  function compat(t, pace) { const st = t.style || 'Tactical'; return (COMPAT[pace || headOf(t).pace] || COMPAT.balanced)[st] ?? .7; }
  // поправка к раунду от штаба: тактика тренера против тактики тренера соперника; несовместимый стиль — минус
  function roundMod(t, opp) {
    if (!t) return 0;
    const h = headOf(t), ho = opp ? headOf(opp) : null;
    let m = ho ? clamp((h.skills.tactics - ho.skills.tactics) / 40, -1, 1) * C('staff.tacticsK', 0.004) : 0;
    const cp = compat(t, h.pace);
    if (cp < 0.6) {
      const weeks = h.since ? (now() - h.since) / WEEK : 99, adapt = clamp(1 - weeks / C('staff.adaptWeeks', 8), 0, 1);
      m -= ((0.6 - cp) / 0.3) * (C('staff.misfitK', 0.002) + adapt * C('staff.adaptK', 0.004));
    }
    return m;
  }
  // точность разведки: аналитик и аналитический отдел; слабый аналитик ошибается в выводах
  function wrapScout() {
    const V = W.V31; if (!V || typeof V.scout !== 'function' || V.scout.__v92) return !!(V && V.scout && V.scout.__v92);
    const f = V.scout;
    const w = function (teamName, oppName) {
      const r = f.apply(this, arguments); if (!r) return r;
      const t = byName(teamName); if (!t) return r;
      const an = support(t).analyst.skill, acc = clamp(0.55 + 0.45 * (an - 45) / 50, 0.5, 1);
      r.quality = Math.round(clamp(r.quality * (0.75 + 0.5 * (an - 45) / 50), 0.05, 0.98) * 100) / 100;
      r.analyst = { name: support(t).analyst.name, skill: an, accuracy: Math.round(acc * 100) };
      // ошибка в выводах: проценты побед соперника на картах искажены тем сильнее, чем слабее аналитик (стабильно для пары)
      Object.entries(r.maps || {}).forEach(([m, x]) => {
        if (!x || !x.n) return; const err = (u('scout', teamName, oppName, m) * 2 - 1) * (1 - acc) * 0.5;
        x.wShown = clamp(Math.round((x.w / x.n + err) * 100) / 100, 0, 1); x.err = Math.round(Math.abs(err) * 100);
      });
      return r;
    };
    w.__v92 = true; V.scout = w; return true;
  }
  if (!wrapScout()) setTimeout(wrapScout, 1500);
  // восстановление: раз в игровую неделю тренер по нагрузке снимает часть усталости
  let lastWk = -1;
  function weekly() {
    const wk = Math.floor(now() / WEEK); if (wk === lastWk) return; lastWk = wk;
    teams.forEach(t => {
      if (!t || !Array.isArray(t.players)) return;
      const pf = support(t).perf.skill, rec = clamp((pf - 45) / 50, 0, 1) * C('staff.recoveryPerWeek', 3);
      if (rec <= 0) return;
      t.players.forEach(p => { if (p) p.fatigue = clamp((+p.fatigue || 0) - rec, 0, 85); });
    });
  }
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { weekly(); } catch (e) {} }, 5000, 'v92-staff');

  /* ---------- найм (клуб менеджера) ---------- */
  function market(t) {
    if (!t) return null;
    const mo = Math.floor(now() / (30 * DAY)), key = t.name + '|' + mo;
    const st = seasonState.v92StaffMarket = seasonState.v92StaffMarket || {};
    if (st.key !== key) {
      // главные тренеры — свободные тренеры с рынка v84 (реальные и бывшие игроки)
      let pool = []; try { pool = ((W.CS2Coaches && W.CS2Coaches.state && W.CS2Coaches.state().pool) || []).filter(c => c && c.at <= now()).slice(0, 40); } catch (e) {}
      const used = new Set(teams.map(x => lc(x.coach && x.coach.name)));
      const heads = pool.filter(c => !used.has(lc(c.name))).sort((a, b) => coachProfile({ name: b.name }).rating - coachProfile({ name: a.name }).rating).slice(0, 6)
        .map(c => { const paces = ['aggressive', 'structured', 'balanced'], pace = paces[h32(seed() + c.name) % 3]; const pr = coachProfile({ name: c.name }); return { name: c.name, flag: c.flag || '🌍', exPlayer: c.from === 'player', pace, rating: pr.rating, style: pr.style, fee: Math.round(pr.rating * pr.rating * 40 / 1000) * 1000, salary: salaryOf(pr.rating) * 2 }; });
      const sup = role => Array.from({ length: 5 }, (_, i) => { const sk = Math.round(48 + u('mk', role, mo, i) * 46); return { name: genName('mk', role, mo, i), skill: sk, salary: salaryOf(sk), fee: Math.round(salaryOf(sk) * 0.5 / 1000) * 1000 }; }).sort((a, b) => b.skill - a.skill);
      seasonState.v92StaffMarket = { key, head: heads, analyst: sup('analyst'), perf: sup('perf') };
    }
    return seasonState.v92StaffMarket;
  }
  function hire(t, role, i) {
    const mk = market(t); const c = mk && mk[role] && mk[role][i]; if (!c) return { ok: false, why: 'кандидат недоступен' };
    let budget = 0; try { budget = Number(W.V31.org(t.name).budget) || 0; } catch (e) {}
    if (budget - c.fee < 0) return { ok: false, why: 'не хватает бюджета на подписание' };
    try { W.V31.book(t.name, -c.fee, 'trans', `Штаб: ${c.name} (${role === 'head' ? 'главный тренер' : role === 'analyst' ? 'аналитик' : 'тренер по нагрузке'})`); } catch (e) {}
    if (role === 'head') {
      const old = t.coach;
      try { const o = W.CS2Coaches.state(); const j = o.pool.findIndex(x => lc(x.name) === lc(c.name)); if (j >= 0) o.pool.splice(j, 1); if (old && old.name) W.CS2Coaches.release(old, t.name); } catch (e) {}
      t.coach = { name: c.name, flag: c.flag, pace: c.pace, v92since: now(), changedAtSeason: seasonState.currentSeason, exPlayer: c.exPlayer || undefined };
      try { W.v29Emit && W.v29Emit('coach', { team: t.name, from: old && old.name || '—', to: c.name, reason: `решение менеджера: ${PACE_L[c.pace]} стиль` }); } catch (e) {}
    } else {
      support(t)[role] = { name: c.name, skill: c.skill, salary: c.salary, since: now() };
    }
    mk[role].splice(i, 1);
    try { W.CS2Journal && W.CS2Journal.log('STAFF', { team: t.name, action: 'hire', reason: `${role}: ${c.name}` }); } catch (e) {}
    try { saveTeams(); saveSeasonState(); } catch (e) {}
    return { ok: true };
  }
  // зарплаты штаба — раз в неделю из бюджета (аналитик и тренер по нагрузке; главный тренер уже в фонде зарплат v31)
  let payWk = -1;
  every(() => {
    try {
      const wk = Math.floor(now() / WEEK); if (wk === payWk || !W.V31) return; payWk = wk;
      // только клуб менеджера: у ИИ-клубов аналитик и тренер по нагрузке входят в прежние расходы клуба (долгая симуляция:
      // с зарплатами штаба у всех клубов через год 35 из 116 были в долгах)
      if (W.CS2Finance) return;   // v94: штаб оплачивают все клубы в единой экономике (CS2Finance)
      const me = W.V31.managed && W.V31.managed(), t = me && byName(me); if (!t) return;
      const s = support(t), sum = (s.analyst.salary || 0) + (s.perf.salary || 0); if (sum > 0) W.V31.book(t.name, -Math.round(sum / 52), 'wage', 'Штаб: аналитик и тренер по нагрузке');
    } catch (e) {}
  }, 6000, 'v92-staff-pay');

  W.CS2Staff = { of: staffOf, head: headOf, devMul, roundMod, compat, market, hire, recover: () => { lastWk = -1; weekly(); }, PACE_L, STYLE_L };

  /* ---------- страница «Штаб» ---------- */
  const H = W.HS; if (!H) return;
  if (Array.isArray(H.NAV_GAME) && !H.NAV_GAME.some(x => x[0] === 'staff')) { const i = H.NAV_GAME.findIndex(x => x[0] === 'training'); H.NAV_GAME.splice(i >= 0 ? i + 1 : 1, 0, ['staff', 'Штаб']); }
  const esc = H.esc, box = H.box;
  const bar = v => `<span class="cr-bar"><i style="width:${clamp(v, 0, 100)}%"></i></span>`;
  H.PAGES.staff = function () {
    const me = W.V31 && W.V31.managed && W.V31.managed(), t = byName(me);
    if (!t) return `<div class="hs-head"><h1>Штаб</h1></div>${box('Нет клуба', '<p class="hs-note">Штабом управляет менеджер клуба — возьмите клуб на странице «Режим игры».</p>')}`;
    const s = staffOf(t), h = s.head, cp = compat(t, h.pace), mk = market(t);
    const cur = `<table class="hs-tbl"><tbody>
      <tr><td class="l"><b>Главный тренер</b><br><small>${esc(h.name)} · ${esc(h.style)} · ${PACE_L[h.pace]} стиль</small></td><td class="l"><small>Тренировки ${h.skills.training} ${bar(h.skills.training)}<br>Тактика ${h.skills.tactics} ${bar(h.skills.tactics)}<br>Молодёжь ${h.skills.youth} ${bar(h.skills.youth)}<br>Работа с людьми ${h.skills.people} ${bar(h.skills.people)}</small></td></tr>
      <tr><td class="l"><b>Аналитик</b><br><small>${esc(s.analyst.name)}</small></td><td class="l"><small>Точность разведки ${s.analyst.skill} ${bar(s.analyst.skill)}</small></td></tr>
      <tr><td class="l"><b>Тренер по нагрузке</b><br><small>${esc(s.perf.name)}</small></td><td class="l"><small>Восстановление ${s.perf.skill} ${bar(s.perf.skill)}</small></td></tr></tbody></table>
      <p class="hs-note">Игра команды — ${STYLE_L[t.style] || 'тактическая'}; стиль тренера — ${PACE_L[h.pace]}: совместимость ${Math.round(cp * 100)}%${cp < .6 ? ' — команда играет хуже, пока стили не сойдутся' : ''}. Развитие игроков ×${devMul(t, { age: 25 }).toFixed(2)}, молодых ×${devMul(t, { age: 19 }).toFixed(2)}.</p>`;
    const headRows = (mk.head || []).map((c, i) => { const c2 = compat(t, c.pace); return `<tr><td class="l"><b>${esc(c.name)}</b>${c.exPlayer ? ' <small>бывший игрок</small>' : ''}<br><small>${esc(c.style)} · ${PACE_L[c.pace]}</small></td><td>${c.rating}</td><td class="${c2 < .6 ? 'dn' : ''}">${Math.round(c2 * 100)}%</td><td>$${Math.round(c.fee / 1000)}k</td><td><button type="button" class="hs-btn sm" data-v92hire="head|${i}">Нанять</button></td></tr>`; }).join('');
    const supRows = role => (mk[role] || []).map((c, i) => `<tr><td class="l"><b>${esc(c.name)}</b></td><td>${c.skill}</td><td>$${Math.round(c.salary / 1000)}k/сезон</td><td>$${Math.round(c.fee / 1000)}k</td><td><button type="button" class="hs-btn sm" data-v92hire="${role}|${i}">Нанять</button></td></tr>`).join('');
    return `<div class="hs-head"><h1>Штаб</h1><div class="hs-filters"><span class="hs-sub">${esc(t.name)}</span></div></div>
      <div class="hs-grid2"><div class="hs-col">${box('Текущий штаб', cur)}</div><div class="hs-col">
      ${box('Главные тренеры на рынке', headRows ? `<table class="hs-tbl"><thead><tr><th class="l">Тренер</th><th>Уровень</th><th>Совместимость</th><th>Подписание</th><th></th></tr></thead><tbody>${headRows}</tbody></table>` : '<p class="hs-note">Свободных тренеров сейчас нет.</p>')}
      ${box('Аналитики', `<table class="hs-tbl"><thead><tr><th class="l">Имя</th><th>Навык</th><th>Зарплата</th><th>Подписание</th><th></th></tr></thead><tbody>${supRows('analyst')}</tbody></table>`)}
      ${box('Тренеры по нагрузке', `<table class="hs-tbl"><thead><tr><th class="l">Имя</th><th>Навык</th><th>Зарплата</th><th>Подписание</th><th></th></tr></thead><tbody>${supRows('perf')}</tbody></table>`)}
      </div></div>`;
  };
  H.CLICKS.push(['[data-v92hire]', el => { const [role, i] = el.dataset.v92hire.split('|'); const t = byName(W.V31.managed()); const r = hire(t, role, +i); if (!r.ok) alert(r.why); H.render(); }]);
})();
