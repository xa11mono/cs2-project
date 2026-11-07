/* v91 — Этап 1 · стратегии клубов.

   У каждой организации есть характер — «ДНК» из v34 (терпение, жажда трофеев, ставка на молодёжь, финансовая
   осторожность, зависимость от звёзд, склонность к перестройкам, стабильность; у известных клубов — по их реальной
   истории). Стратегия — это то, как клуб с таким характером действует в своей ТЕКУЩЕЙ ситуации. Она не задана навечно:
   меняется с результатами, бюджетом, возрастом и контрактами состава.
     • keep      — сохранение состава: результаты в норме, менять нечего;
     • planned   — плановая перестройка: стареющий состав или истекающие контракты — замена заранее;
     • crisis    — кризисная перестройка: серьёзный спад результатов;
     • youth     — развитие молодых: клуб делает ставку на академию и молодых игроков (характер или бюджет);
     • champion  — покупка чемпионского состава: богатый амбициозный клуб в топе усиливается звёздами.
   Стратегия не отменяет правил Roster Engine (усиление позиции, роль, язык, защита звёзд): она меняет только, КОГО из
   прошедших проверки кандидатов клуб предпочтёт — поправка ограничена CS2Config 'club.maxBonus'. И записывается в
   журнал решений рядом с выбором. */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const rankOf = t => { const l = pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)); const i = l.indexOf(t); return i < 0 ? 999 : i + 1; };
  const starters = t => (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
  const season = () => Number(seasonState.currentSeason) || 1;
  const dnaOf = t => { try { return W.V34Roster.dna(t.name); } catch (e) { return { patience: .5, trophies: .5, youth: .5, frugal: .5, stars: .5, rebuild: .5, stability: .5 }; } };
  const budgetOf = t => { try { return Number(W.V31.org(t.name).budget); } catch (e) { return NaN; } };
  const pressureOf = t => { try { return W.v30MarketDebug.pressure(t); } catch (e) { return 1; } };
  const L = { keep: 'сохранение состава', planned: 'плановая перестройка', crisis: 'кризисная перестройка', youth: 'развитие молодых', champion: 'покупка чемпионского состава' };

  function of(t) {
    if (!t || t.isAcademy) return { key: 'youth', label: L.youth, why: 'академия' };
    const d = dnaOf(t), rk = rankOf(t), pr = pressureOf(t), b = budgetOf(t);
    const st = starters(t), old = st.filter(p => (+p.age || 25) >= 31).length, exp = st.filter(p => (+p.contractUntil || 99) <= season()).length;
    const drop = Number(t.seasonStartRank) ? rk - t.seasonStartRank : 0;
    const flops = (t.history || []).filter(h => h && h.place > 0 && !h.isBootcamp && !h.isSeasonAward).slice(0, 3).filter(h => h.place >= 9).length;
    const hasAcademy = teams.some(a => a.isAcademy && (a.academyParent || a.parentTeam) === t.name);
    if (pr >= C('club.crisisPressure', 1.4) && (drop >= C('club.crisisDrop', 8) || flops >= 2))
      return { key: 'crisis', label: L.crisis, why: `давление ${pr.toFixed(2)}, ${drop > 0 ? 'минус ' + drop + ' мест с начала сезона' : flops + ' провальных турнира подряд'}` };
    if (rk <= C('club.championRank', 8) && d.trophies >= .6 && Number.isFinite(b) && b >= C('club.championBudget', 2500000))
      return { key: 'champion', label: L.champion, why: `топ-${rk}, бюджет $${Math.round(b / 1e5) / 10}M, жажда трофеев ${Math.round(d.trophies * 100)}%` };
    // у половины клубов бюджет — стартовые $400k, поэтому бюджет сам по себе стратегию не задаёт (он учитывается в выборе: дорогой выкуп)
    if ((d.youth >= .65 && hasAcademy) || d.youth >= C('club.youthDna', .8))
      return { key: 'youth', label: L.youth, why: `ставка на молодёжь ${Math.round(d.youth * 100)}%${hasAcademy ? ', своя академия' : ''}` };
    if (old >= 2 || exp >= 2)
      return { key: 'planned', label: L.planned, why: [old >= 2 ? `${old} игрока 31+` : '', exp >= 2 ? `${exp} контракта истекают` : ''].filter(Boolean).join(', ') };
    return { key: 'keep', label: L.keep, why: 'результаты в норме' };
  }
  // поправка к выбору среди кандидатов, уже прошедших проверки (усиление ≥ порога и т. д.)
  function bonus(t, c, strat) {
    const s = strat || of(t), d = dnaOf(t), p = c.p || {}, age = +p.age || 25, max = C('club.maxBonus', 1.5);
    const tier = (() => { try { return W.CS2Stature.tier(p); } catch (e) { return 'regular'; } })();
    let v = 0; const why = [];
    const add = (x, w) => { v += x; why.push(w); };
    if (s.key === 'youth') { if (c.src === 'academy') add(1, 'своя академия'); else if (c.src === 'loan') add(.5, 'молодой игрок в аренду'); if (age <= 21 && c.src !== 'academy') add(.5, 'молодой'); if (c.src === 'buy') add(-.5, 'дорогой выкуп'); }
    if (s.key === 'champion') { if (tier === 'star' || tier === 'franchise') add(1, 'звезда'); if (c.src === 'academy' || c.src === 'loan') add(-.5, 'нужен готовый игрок'); }
    if (s.key === 'crisis') { if (age >= 24 && age <= 30) add(.5, 'опытный игрок'); if (age <= 20) add(-.5, 'нет времени ждать'); }
    if (s.key === 'planned') { if (age <= 25) add(.5, 'на годы вперёд'); if (age >= 30) add(-.5, 'стареет'); }
    if (c.src === 'buy' && (d.frugal >= .7 || budgetOf(t) < C('club.youthBudget', 600000))) add(-.5, d.frugal >= .7 ? 'финансовая осторожность' : 'небольшой бюджет');
    if (d.stars >= .7 && (tier === 'star' || tier === 'franchise')) add(.5, 'клуб любит звёзд');
    return { v: clamp(v, -max, max), why };
  }
  // дополнительный порог для «сохранения состава»: стабильному клубу нужно заметнее усиление
  function extraNeed(t, strat) { const s = strat || of(t), d = dnaOf(t); return s.key === 'keep' ? C('club.keepExtraNeed', 0.5) * (0.5 + d.stability) : 0; }
  W.CS2ClubStrategy = { of, bonus, extraNeed, LABELS: L };

  // стратегия — на странице команды рядом с «ДНК»
  const H = W.HS;
  if (H && Array.isArray(H.AFTER)) H.AFTER.push(page => {
    if (page !== 'team') return;
    try {
      // v93: название — из адреса страницы (в заголовке рядом с ним кнопка «☆ Стать фанатом» — раньше отметка не показывалась)
      const root = document.getElementById('hs-page'), name = (H.S && H.S.arg ? decodeURIComponent(String(H.S.arg).split('/')[0]) : '');
      const t = teams.find(x => x.name === name); if (!t || t.isAcademy || root.querySelector('.v91-strat')) return;
      const s = of(t), k = root.querySelector('.tm-k') || root.querySelector('.hs-head');
      if (k) k.insertAdjacentHTML('beforeend', ` <span class="v91-strat" title="${H.esc(s.why)}">Стратегия: ${H.esc(s.label)}</span>`);
    } catch (e) {}
  });
})();
