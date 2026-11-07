/* v94 — Этап 4 · единая экономика клуба и спонсоры-партнёры.

   ДОХОДЫ И РАСХОДЫ (раз в игровую неделю, вдобавок к v31: спонсор, зарплаты игроков и главного тренера, объекты,
   призовые, поездки v41, продажи игроков, дивиденды владельцам):
     + медиа: трансляции, контент, партнёрские программы — от популярности клуба (v93) и медиаотдела;
     − штаб: аналитик и тренер по нагрузке (v92) — у всех клубов, по шкале уровня клуба;
     − академия: содержание своей академии (зависит от уровня академии);
     − буткемп: сборы перед Мейджором (v84) — дешевле с собственным буткемп-центром.
   Все статьи — в годовой истории финансов отдельными категориями.

   ПРОГНОЗ (CS2Finance.forecast): бюджет на конец сезона и через сезон с учётом сделки (выкуп, разница зарплат) — для
   решений менеджера и ИИ. «Хватит ли денег на следующий сезон» — видно до подписания.

   ИИ ЖИВЁТ ПО СРЕДСТВАМ (CS2Finance.policy): healthy / tight / austerity по прогнозу. В режиме экономии клуб не платит за
   выкуп игроков (Roster Engine: AUSTERITY), выставляет на продажу самого дорогого игрока вне ядра, в межсезонье
   пересматривает завышенные зарплаты до рыночных (мораль игрока падает) и закрывает объекты (v31). Если долг всё же
   превысил порог — владельцы гасят его (один раз в сезон), но репутация организации падает. Раньше долги копились годами.

   СПОНСОРЫ-ПАРТНЁРЫ (CS2Sponsors): у партнёра отрасль и своё требование — место в рейтинге (энергетики, автопроизводители),
   популярность и контент (технологии, одежда), турнирные успехи (периферия), финансовая стабильность (банк). Бонус за
   титул, штраф за невыполнение (после 6 нарушений выплата −20%, после 10 — расторжение). Когда контракт кончается, клуб
   получает 3 предложения: ИИ берёт лучшее для себя, менеджер ведёт переговоры — принять, попросить больше (шанс зависит
   от репутации), подписать дольше со скидкой или отказаться. Без решения за 4 недели принимается лучшее.
   Названия партнёров — вымышленные. Коэффициенты — CS2Config 'econ.*' (design). */
(function () {
  'use strict';
  const W = window, V = W.V31;
  if (!V || typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DAY = 864e5, WEEK = 7 * DAY;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const seedv = () => { try { return W.CS2SaveProfile ? W.CS2SaveProfile.state().seed : 0; } catch (e) { return 0; } };
  const u = (...k) => (h32(seedv() + '|' + k.join('|')) % 100000) / 100000;
  const byName = n => teams.find(t => t && t.name === n) || null;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankOf = t => { const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.indexOf(t); return i < 0 ? 99 : i + 1; };
  const journal = (type, e) => { try { W.CS2Journal && W.CS2Journal.log(type, e); } catch (x) {} };
  const news = it => { try { W.V29News && W.V29News.add && W.V29News.add(it); } catch (e) {} };
  const money = v => { try { return V.money(v); } catch (e) { return '$' + Math.round(v / 1000) + 'k'; } };
  const managed = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const autoFin = () => { try { return V.auto('finance'); } catch (e) { return true; } };
  const tierK = t => { const rk = rankOf(t); return rk <= 10 ? 1.15 : rk <= 30 ? 1 : rk <= 60 ? C('econ.wageMid', 0.7) : C('econ.wageLow', 0.5); };
  const popOf = t => { try { return W.CS2Fans ? W.CS2Fans.popularity(t) : 30; } catch (e) { return 30; } };
  const hasAcademy = t => teams.some(a => a.isAcademy && (a.academyParent || a.parentTeam) === t.name);
  const weeksLeft = () => { const d = new Date(now()); const end = new Date(d.getFullYear(), 11, 31).getTime(); return Math.max(0, (end - now()) / WEEK); };

  /* ---------- статьи сезона ---------- */
  function lines(t) {
    const o = V.org(t.name), fac = o.fac || {};
    const spon = (o.sponsor ? o.sponsor.perSeason || 0 : 0) * (1 + 0.1 * (fac.media || 0));
    const media = Math.round(Math.pow(popOf(t), 1.5) * C('econ.mediaK', 840) * (1 + 0.15 * (fac.media || 0)));
    const wages = V.wageBill(t), upkeep = V.facUpkeep(o);
    let staff = 0; try { if (W.CS2Staff) { const s = W.CS2Staff.of(t); staff = Math.round(((s.analyst.salary || 0) + (s.perf.salary || 0)) * tierK(t)); } } catch (e) {}
    const academy = hasAcademy(t) ? Math.round(C('econ.academyCost', 150000) * (1 + 0.3 * (fac.academy || 0))) : 0;
    // ожидаемые призовые — по прошлому сезону (или по текущему, приведённому к году)
    const h = o.hist || {}, prev = h[season() - 1], cur = h[season()];
    const elapsed = Math.max(1, 52 - weeksLeft());
    const prize = prev ? Math.max(0, prev.prize || 0) : cur ? Math.max(0, (cur.prize || 0)) * 52 / elapsed : 0;
    // стикеры Мейджора (v84, v94: по популярности и стадии) — ожидание по прошлому сезону
    const stickers = prev ? Math.max(0, prev.stickers || 0) : cur ? Math.max(0, cur.stickers || 0) : 0;
    return { spon: Math.round(spon), media, prize: Math.round(prize), stickers: Math.round(stickers), wages, upkeep, staff, academy };
  }
  function forecast(t, opts) {
    opts = opts || {};
    const o = V.org(t.name), L = lines(t), wl = weeksLeft();
    const inc = L.spon + L.media + L.prize + (L.stickers || 0), exp = L.wages + L.upkeep + L.staff + L.academy + (opts.salaryDelta || 0);
    const perWeek = (inc - exp) / 52;
    const now0 = (Number(o.budget) || 0) - (opts.fee || 0) + (opts.income || 0);
    const end = Math.round(now0 + perWeek * wl), next = Math.round(end + (inc - exp));
    return { budget: Math.round(o.budget), after: Math.round(now0), end, next, season: { inc, exp, net: inc - exp }, lines: L, weeksLeft: Math.round(wl) };
  }
  const reserveOf = t => Math.round(V.wageBill(t) * C('econ.reserveShare', 0.25));
  function policy(t) {
    const f = forecast(t);
    return f.end < 0 || f.next < -reserveOf(t) ? 'austerity' : f.end < reserveOf(t) ? 'tight' : 'healthy';
  }

  /* ---------- спонсоры-партнёры ---------- */
  const IND = {
    energy: { l: 'энергетические напитки', k: 1.05, demand: 'rank', sfx: ['Energy', 'Fuel', 'Charge'] },
    tech: { l: 'технологии', k: 1.0, demand: 'content', sfx: ['Systems', 'Labs', 'Tech'] },
    gear: { l: 'игровая периферия', k: 0.95, demand: 'titles', sfx: ['Gear', 'Peripherals', 'Mouse'] },
    bank: { l: 'банк и платежи', k: 1.1, demand: 'stability', sfx: ['Bank', 'Pay', 'Capital'] },
    auto: { l: 'автопроизводитель', k: 1.15, demand: 'rank', sfx: ['Motors', 'Auto'] },
    wear: { l: 'одежда', k: 0.9, demand: 'popularity', sfx: ['Wear', 'Apparel', 'Studio'] }
  };
  const PFX = ['Nord', 'Volt', 'Pixel', 'Apex', 'Iron', 'Lumen', 'Swift', 'Orbit', 'Cobalt', 'Zenit', 'Hyper', 'Polar', 'Vanta', 'Krona', 'Astra'];
  const DEM_L = { rank: r => `место в рейтинге не ниже ${r}`, content: p => `популярность клуба от ${p} (контент с игроками)`, titles: () => 'плей-офф (топ-4) турнира Tier-1 за сезон', stability: () => 'бюджет без долгов', popularity: p => `популярность клуба от ${p}` };
  function baseAmount(t, o) { const rep = clamp((o.rep || 30) / 100, 0, 1); return 300000 + Math.pow(rep, 1.6) * 3800000; }
  function offers(t, o, n) {
    const keys = Object.keys(IND), rk = rankOf(t), pop = popOf(t), out = [];
    for (let i = 0; i < (n || 3); i++) {
      const ind = keys[h32(seedv() + t.name + season() + 'ind' + i) % keys.length], I = IND[ind];
      const amt = Math.round(baseAmount(t, o) * I.k * (0.9 + u('amt', t.name, season(), i) * 0.2) / 1000) * 1000;
      const years = 1 + (h32(t.name + i + season()) % 3);
      const target = I.demand === 'rank' ? clamp(rk + 3, 1, 60) : I.demand === 'content' || I.demand === 'popularity' ? clamp(pop - 5, 5, 90) : null;
      out.push({ id: 'sp' + season() + i + (h32(t.name) % 999), name: PFX[h32(seedv() + t.name + i + season()) % PFX.length] + ' ' + I.sfx[i % I.sfx.length], industry: ind, industryL: I.l, demand: I.demand, target,
        perSeason: amt, until: season() + years - 1, years, bonus: Math.round(amt * 0.15 / 1000) * 1000, penalty: 0.2, strikes: 0, since: now() });
    }
    return out;
  }
  function demandOk(t, sp) {
    const o = V.org(t.name);
    switch (sp.demand) {
      case 'rank': return rankOf(t) <= (sp.target || 30);
      case 'content': case 'popularity': return popOf(t) >= (sp.target || 30);
      case 'stability': return (o.budget || 0) >= 0;
      case 'titles': { const hist = (t.history || []).filter(h => h && h.place > 0 && h.place <= 4 && (h.season === season() || !h.season)); return hist.length > 0 || new Date(now()).getMonth() < 6; }   // до середины сезона — ещё не нарушение
      default: return true;
    }
  }
  const pick = (t, list) => list.slice().sort((a, b) => b.perSeason * (demandOk(t, b) ? 1 : 0.7) - a.perSeason * (demandOk(t, a) ? 1 : 0.7))[0];
  // еженедельно: требования, штрафы, окончание контракта и новые предложения (вместо простого спонсора v31)
  function sponsorWeek(t, o) {
    if (t.isAcademy) return;
    // спонсор из старого сохранения (v31: без отрасли) — становится партнёром на тех же деньгах и сроке
    if (o.sponsor && !o.sponsor.industry) { const old = o.sponsor, x = offers(t, o, 1)[0]; o.sponsor = Object.assign(x, { name: old.name && !/партн|спонсор/i.test(old.name) ? old.name : x.name, perSeason: old.perSeason || x.perSeason, until: old.until || x.until, bonus: old.bonus || x.bonus, strikes: 0, since: now() }); }
    const sp = o.sponsor;
    if (sp && sp.industry) {
      if (demandOk(t, sp)) sp.strikes = Math.max(0, (sp.strikes || 0) - 1); else sp.strikes = (sp.strikes || 0) + 1;
      if (sp.strikes === 6 && !sp.cut) { sp.cut = true; sp.perSeason = Math.round(sp.perSeason * (1 - sp.penalty) / 1000) * 1000; if (t.name === managed()) news({ cat: 'finance', icon: '📉', imp: 5, title: `${sp.name} урезает выплаты ${t.name}`, lead: `Требование партнёра не выполняется: ${DEM_L[sp.demand](sp.target)}. Выплата −${Math.round(sp.penalty * 100)}%.`, body: [], tags: [{ t: 'team', v: t.name }] }); }
    }
    const ended = !sp || (sp.until < season()) || (sp.strikes || 0) >= 10;
    if (!ended) return;
    if (sp && (sp.strikes || 0) >= 10) journal('FINANCE', { team: t.name, action: 'sponsor-terminated', reason: `${sp.name}: требование не выполнялось (${sp.industry ? DEM_L[sp.demand](sp.target) : 'место в рейтинге'})` });
    if (!o.v94offers || !o.v94offers.list || o.v94offers.s !== season()) o.v94offers = { s: season(), at: now(), list: offers(t, o, 3) };
    const user = t.name === managed() && !autoFin();
    if (user && now() - o.v94offers.at < 4 * WEEK) { o.sponsor = null; return; }   // менеджер решает; пока без спонсора
    accept(t, pick(t, o.v94offers.list).id, user ? 'автоматически: решение не принято за 4 недели' : '');
  }
  function accept(t, id, why) {
    const o = V.org(t.name), off = o.v94offers && o.v94offers.list.find(x => x.id === id); if (!off) return false;
    o.sponsor = Object.assign({}, off, { since: now(), strikes: 0, target: off.target != null ? off.target : clamp(rankOf(t) + 3, 1, 60) });
    o.v94offers = null;
    journal('FINANCE', { team: t.name, action: 'sponsor', reason: `${off.name} (${off.industryL}): ${money(off.perSeason)} за сезон до сезона ${off.until}; требование — ${DEM_L[off.demand](off.target)}${why ? '; ' + why : ''}` });
    if (t.name === managed()) { try { V.careerLog(`Спонсор: ${off.name}, ${money(off.perSeason)}/сезон`); } catch (e) {} }
    return true;
  }
  function askMore(t, id) {
    const o = V.org(t.name), off = o.v94offers && o.v94offers.list.find(x => x.id === id); if (!off || off.asked) return { ok: false, why: 'уже торговались' };
    off.asked = true;
    const p = clamp(0.35 + ((o.rep || 30) - 50) / 100, 0.1, 0.8), roll = u('ask', t.name, id, season());
    if (roll < p) { off.perSeason = Math.round(off.perSeason * 1.12 / 1000) * 1000; off.bonus = Math.round(off.perSeason * 0.15 / 1000) * 1000; return { ok: true, why: `${off.name} согласился: ${money(off.perSeason)} за сезон` }; }
    o.v94offers.list = o.v94offers.list.filter(x => x !== off); return { ok: false, why: `${off.name} отозвал предложение` };
  }
  function longer(t, id) { const o = V.org(t.name), off = o.v94offers && o.v94offers.list.find(x => x.id === id); if (!off || off.years >= 4) return false; off.years++; off.until++; off.perSeason = Math.round(off.perSeason * 0.94 / 1000) * 1000; return true; }
  function decline(t, id) { const o = V.org(t.name); if (!o.v94offers) return false; o.v94offers.list = o.v94offers.list.filter(x => x.id !== id); if (!o.v94offers.list.length) o.v94offers = { s: season(), at: now(), list: offers(t, o, 2) }; return true; }

  /* ---------- неделя: доходы и расходы, политика ИИ ---------- */
  function week(t) {
    const o = V.org(t.name); if (t.isAcademy) return;
    const L = lines(t);
    if (L.media) V.book(t.name, L.media / 52, 'media', 'Медиа: трансляции и контент');
    if (L.staff) V.book(t.name, -L.staff / 52, 'staff', 'Штаб: аналитик и тренер по нагрузке');
    if (L.academy) V.book(t.name, -L.academy / 52, 'academy', 'Содержание академии');
    // буткемп перед Мейджором (v84) — разово
    try { const b = W.CS2Manager2 && W.CS2Manager2.state().boot[t.name]; if (b && b.until > now() && !b.v94paid) { b.v94paid = 1; V.book(t.name, -Math.round(C('econ.bootcampCost', 120000) * (1 - 0.2 * ((o.fac || {}).bootcamp || 0))), 'boot', `Буткемп: ${b.where || 'сборы'}`); } } catch (e) {}
    if (t.name === managed() && !autoFin()) return;   // решения менеджера — его
    const pol = policy(t); o.v94policy = pol;
    if (pol === 'austerity') {
      // выставить на продажу самого дорогого игрока вне ядра (раз в 8 недель)
      if (!o.v94listAt || now() - o.v94listAt > 8 * WEEK) {
        const S = W.CS2Stature, cand = (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER') && !(S && S.shielded && S.shielded(p, t))).sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
        if (cand) { cand.v31listed = now(); o.v94listAt = now(); journal('FINANCE', { team: t.name, action: 'list', player: cand.nick, reason: `экономия: выставлен на продажу (зарплата ${money(cand.salary || 0)})` }); }
      }
    }
    // долг сверх порога — владельцы гасят (раз в сезон), репутация падает
    if ((o.budget || 0) < -C('econ.ownerFloor', 400000) && o.v94bailout !== season()) {
      const sum = -o.budget; o.v94bailout = season(); V.book(t.name, sum, 'owner', 'Владельцы погасили долг');
      o.rep = clamp((o.rep || 30) - C('econ.bailoutRep', 5), 0, 100);
      journal('FINANCE', { team: t.name, action: 'bailout', reason: `долг ${money(sum)} погашен владельцами; репутация −${C('econ.bailoutRep', 5)}` });
    }
  }
  // межсезонье: ИИ в режиме экономии пересматривает завышенные зарплаты до рыночных
  function seasonStart() {
    if (seasonState.v94SalarySeason === season()) return; seasonState.v94SalarySeason = season();
    pro().forEach(t => {
      if (t.name === managed() && !autoFin()) return;
      if (policy(t) !== 'austerity') return;
      let saved = 0;
      (t.players || []).forEach(p => { const fair = (() => { try { const q = JSON.parse(JSON.stringify(p)); q.v31sv = 0; delete q.salary; V.ensurePerson(q); return q.salary; } catch (e) { return p.salary; } })();
        if (p.salary > fair * 1.1) { saved += p.salary - fair; p.salary = fair; p.morale = clamp((+p.morale || 85) - 6, 40, 100); } });
      if (saved > 0) journal('FINANCE', { team: t.name, action: 'salary-cut', reason: `зарплаты пересмотрены до рыночных: экономия ${money(saved)} за сезон` });
    });
    // v95: фонд зарплат по средствам. На 5 сезонах зарплаты клубов №31–60 росли с ~$0.49 млн до ~$0.79 млн за сезон
    // (продления по растущему уровню игроков), а доходы — нет: каждый третий клуб уходил в долги. Теперь клуб ИИ в начале
    // сезона держит зарплаты в пределах доли ожидаемых доходов ('econ.wageShare'); урезка — не больше 'econ.wageCutMax'
    // за сезон, игроки недовольны (мораль), запись в журнале.
    pro().forEach(t => {
      if (t.name === managed()) return;
      const L = lines(t), income = L.spon + L.media + L.prize + L.stickers, wages = L.wages;
      const target = C('econ.wageShare', 0.62) * income; if (!(wages > target * 1.05) || wages <= 0) return;
      const k = Math.max(1 - C('econ.wageCutMax', 0.2), target / wages);
      let saved = 0;
      (t.players || []).forEach(p => { if (!p || !(+p.salary > 0)) return; const nv = Math.round(p.salary * k / 1000) * 1000; saved += p.salary - nv; p.salary = nv; p.morale = clamp((+p.morale || 85) - Math.round((1 - k) * 25), 40, 100); });
      if (saved > 0) journal('FINANCE', { team: t.name, action: 'wage-cap', reason: `фонд зарплат приведён к доходам клуба (${Math.round(C('econ.wageShare', 0.62) * 100)}% ожидаемых доходов): −${Math.round((1 - k) * 100)}%, экономия ${money(saved)} за сезон` });
    });
  }
  let lastWk = -1;
  function weekly() {
    const wk = Math.floor(now() / WEEK); if (wk === lastWk) return; const steps = lastWk < 0 ? 1 : clamp(wk - lastWk, 1, 12); lastWk = wk;
    seasonStart();
    for (let i = 0; i < steps; i++) pro().forEach(t => { try { week(t); } catch (e) { console.warn('[v94 economy]', t.name, e); } });
  }
  // спонсорский блок v31 — через партнёров
  W.CS2Sponsors = { week: sponsorWeek, offers, accept, askMore, longer, decline, demandOk, IND, DEM_L };
  W.CS2Finance = { lines, forecast, policy, weekly, seasonStart, reserveOf };
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { if (!W.v57BatchCalendarSkip) weekly(); } catch (e) { console.warn('[v94 economy]', e); } }, 5000, 'v94-economy');
  (function hookDaily() {
    const f = W.V30RankSnapshotTick; if (typeof f !== 'function') { setTimeout(hookDaily, 1000); return; }
    if (f.__v94) return;
    const w = function () { const r = f.apply(this, arguments); try { weekly(); } catch (e) {} return r; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v94 = true; W.V30RankSnapshotTick = w;
  })();

  /* ---------- страница «Финансы»: прогноз, статьи, партнёр, предложения ---------- */
  const H = W.HS; if (!H) return;
  const esc = H.esc;
  function financeBox(t) {
    const f = forecast(t), L = f.lines, o = V.org(t.name), sp = o.sponsor, offs = (o.v94offers && o.v94offers.list) || [];
    const row = (l, v, cls) => `<tr><td class="l">${l}</td><td class="${cls || (v >= 0 ? 'up' : 'dn')}">${money(v)}</td></tr>`;
    const pol = policy(t), polL = { healthy: 'здоровые финансы', tight: 'бюджет на пределе', austerity: 'режим экономии' }[pol];
    const spHtml = sp && sp.industry ? `<p><b>${esc(sp.name)}</b> · ${esc(IND[sp.industry].l)} · ${money(sp.perSeason)} за сезон до сезона ${sp.until}<br><small>Требование: ${esc(DEM_L[sp.demand](sp.target))} — ${demandOk(t, sp) ? '<span class="up">выполняется</span>' : '<span class="dn">не выполняется</span>'} · нарушений ${sp.strikes || 0}/10 · бонус за титул ${money(sp.bonus || 0)}</small></p>` : sp ? `<p><b>${esc(sp.name || 'Спонсор')}</b> · ${money(sp.perSeason || 0)} за сезон</p>` : '<p class="dn">Генерального партнёра нет.</p>';
    const offHtml = offs.length ? `<table class="hs-tbl"><thead><tr><th class="l">Предложение</th><th>За сезон</th><th>Срок</th><th class="l">Требование</th><th></th></tr></thead><tbody>${offs.map(x => `<tr><td class="l"><b>${esc(x.name)}</b><br><small>${esc(x.industryL)}</small></td><td>${money(x.perSeason)}</td><td>${x.years} сез.</td><td class="l"><small>${esc(DEM_L[x.demand](x.target))}</small></td><td><button type="button" class="hs-btn sm" data-v94sp="accept|${x.id}">Принять</button> <button type="button" class="hs-btn sm ghost" data-v94sp="more|${x.id}"${x.asked ? ' disabled' : ''}>Больше</button> <button type="button" class="hs-btn sm ghost" data-v94sp="longer|${x.id}">Дольше</button> <button type="button" class="hs-btn sm ghost" data-v94sp="decline|${x.id}">Отказ</button></td></tr>`).join('')}</tbody></table>` : '';
    return `<div class="hs-grid2"><div class="hs-col">${H.box('Прогноз сезона', `<table class="hs-tbl"><tbody>
        ${row('Спонсор', L.spon)}${row('Медиа (популярность, медиаотдел)', L.media)}${row('Призовые (ожидание по прошлому сезону)', L.prize)}${L.stickers ? row('Стикеры Мейджора (по прошлому сезону)', L.stickers) : ''}
        ${row('Зарплаты игроков и главного тренера', -L.wages)}${row('Штаб (аналитик, тренер по нагрузке)', -L.staff)}${row('Объекты', -L.upkeep)}${L.academy ? row('Академия', -L.academy) : ''}
        <tr><td class="l"><b>Итог сезона</b></td><td class="${f.season.net >= 0 ? 'up' : 'dn'}"><b>${money(f.season.net)}</b></td></tr></tbody></table>
        <p class="hs-note">Бюджет сейчас ${money(f.budget)} → на конец сезона ${money(f.end)} → через сезон ${money(f.next)} · ${polL}.</p>`)}</div>
      <div class="hs-col">${H.box('Генеральный партнёр', spHtml + (offHtml ? '<p><b>Предложения</b></p>' + offHtml : ''))}</div></div>`;
  }
  if (H.PAGES && H.PAGES.finance && !H.PAGES.finance.__v94) {
    const f = H.PAGES.finance; const w = function () { let h = f.apply(this, arguments); try { const t = byName(managed()); if (t) { const fb = financeBox(t); h = h.replace(/(<div class="hs-head">[\s\S]*?<\/div>)/, m => m + fb); } } catch (e) { console.warn('[v94 finance page]', e); } return h; };
    w.__v94 = true; H.PAGES.finance = w;
  }
  H.CLICKS.push(['[data-v94sp]', el => {
    const [a, id] = el.dataset.v94sp.split('|'), t = byName(managed()); if (!t) return;
    if (a === 'accept') accept(t, id, 'решение менеджера');
    else if (a === 'more') { const r = askMore(t, id); alert(r.why); }
    else if (a === 'longer') longer(t, id);
    else if (a === 'decline') decline(t, id);
    try { saveSeasonState(); } catch (e) {} H.render();
  }]);
})();
