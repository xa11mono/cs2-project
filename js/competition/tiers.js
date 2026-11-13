/* v84 — статус уровня команды (Tier-1 / Tier-2 / Tier-3) с инерцией.
   Раньше уровень определялся мгновенным местом в VRS: фоновые турниры Tier-2 брали места 11–40, поэтому любая
   команда, просевшая на неделю (например, лидер Азии The Mongolz), сразу отправлялась на Tier-2.
   Теперь у каждой команды есть статус, который меняется только при устойчивых результатах:
   • Tier-1 получают: топ-24 VRS три недели подряд, или титул Tier-1/S-Tier/Major за последние 60 дней;
   • Tier-1 теряют: восемь недель подряд вне топ-36 и без титулов Tier-1 за полгода; партнёры организаторов
     (долгосрочные контракты ESL/BLAST) сохраняют статус, пока остаются в топ-50;
   • Tier-2 ↔ Tier-3 — аналогично (топ-56 три недели / вне топ-80 восемь недель).
   Статус решает всё: приглашения на Tier-1 (CS2InviteList), состав фоновых турниров Tier-2/3 (команды Tier-1 туда не
   попадают, кроме квалификаций), региональные кубки. Повышения и потери статуса — в новостях и на странице команды. */
(function () {
  'use strict';
  const W = window, DAY = 864e5, WEEK = 7 * DAY;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const PARTNERS = ['Team Vitality', 'G2', 'NAVI', 'FAZE', 'FaZe', 'MOUZ', 'Team Liquid', 'Astralis', 'NIP', 'fnatic', 'Complexity', 'ENCE', 'Team Spirit', 'Team Falcons', 'FURIA', 'HEROIC', 'Virtus.pro', 'BIG'];
  const CFG = { t1In: 24, t1Out: 36, t1PartnerOut: 50, t2In: 56, t2Out: 80, upWeeks: 3, downWeeks: 8, titleKeep: 180 * DAY, titleIn: 60 * DAY };
  const ranked = () => (typeof teams !== 'undefined' ? teams : []).filter(t => t && !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const S = () => { const s = ST(); return s ? (s.v84Tier = s.v84Tier || { v: 1, week: 0, teams: {} }) : null; };
  // v84: общий индекс титулов (команда → последний титул Tier-1/S-Tier/Major): строится один раз при изменении
  // архива (проверка не чаще раза в 10 с). Раньше архив копировался и просматривался для каждой команды каждую неделю.
  let IX = null, ixAt = 0, ixN = -1;
  const norm = n => String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  W.CS2TitleIndex = function () {
    const now = Date.now(); if (IX && now - ixAt < 10000) return IX; ixAt = now;
    let A = {}; try { A = W.hubArchiveExport?.() || {}; } catch (e) {}
    const keys = Object.keys(A); if (IX && keys.length === ixN) return IX; ixN = keys.length;
    const lastMs = {}, lastYear = {};
    keys.forEach(id => { const x = A[id]; if (!x || x.show || !x.champion || x.champion === '—' || !/major|elite|regular/i.test(String(x.prestige || x.kind || ''))) return;
      const ms = Number(x.ge || x.gs || x.ts) || 0, k = norm(x.champion); if (ms > (lastMs[k] || 0)) lastMs[k] = ms; const y = Number(x.year) || 0; if (y > (lastYear[k] || 0)) lastYear[k] = y; });
    return (IX = { lastMs, lastYear });
  };
  function lastTitleMs(name) { try { return W.CS2TitleIndex().lastMs[norm(name)] || 0; } catch (e) { return 0; } }
  const byRank = r => r <= CFG.t1In ? 1 : r <= CFG.t2In ? 2 : 3;
  // v84: статус считается по истории мест (по одному замеру на игровую неделю, до 12 недель), а не накопительными
  // счётчиками. v89: пропущенные при перемотке недели — «нет данных» (null), а не копии текущего места; при перемотке
  // замер делается каждый игровой день (js/competition/fair-rating.js), так что недели не пропадают.
  // Проверка здравого смысла: команда из топ-12 рейтинга — всегда Tier-1, партнёр лиг в топ-20 — тоже.
  function init() {
    const st = S(); if (!st) return;
    if (st.v !== 2) { st.v = 2; st.week = 0; Object.values(st.teams).forEach(r => { r.r = []; }); }
    if (Object.keys(st.teams).length) return;
    ranked().forEach((t, i) => { const r = i + 1, tier = (PARTNERS.includes(t.name) && r <= CFG.t1PartnerOut) ? 1 : byRank(r); st.teams[t.name] = { t: tier, since: nowMs(), r: [] }; });
  }
  function news(it) { try { W.V29News?.add?.(it); } catch (e) {} }
  function decide(t, r, rec, now) {
    const partner = PARTNERS.includes(t.name), lt = lastTitleMs(t.name), h = rec.r;
    // v89: пропущенные недели хранятся как null («не наблюдали») — они не считаются подтверждённой стабильностью.
    // Повышение — только по k реально замеренным неделям подряд; понижение — если замеров хотя бы 60% и все вне порога.
    const last = k => h.slice(0, k).filter(x => x != null), max = a => Math.max(...a), min = a => Math.min(...a);
    const upOk = (k, thr) => { const o = last(k); return h.length >= k && o.length === k && max(o) <= thr; };
    const downOk = (k, thr) => { const o = last(k); return h.length >= k && o.length >= Math.ceil(k * 0.6) && min(o) > thr; };
    if (r <= 12 || (partner && r <= 20) || now - lt < CFG.titleIn) return 1;
    if (rec.t === 1) {
      const out = partner ? CFG.t1PartnerOut : CFG.t1Out;
      return (downOk(CFG.downWeeks, out) && now - lt > CFG.titleKeep) ? 2 : 1;
    }
    if (upOk(CFG.upWeeks, CFG.t1In)) return 1;
    if (rec.t === 2) return downOk(CFG.downWeeks, CFG.t2Out) ? 3 : 2;
    return upOk(CFG.upWeeks, CFG.t2In) ? 2 : 3;
  }
  function weekly() {
    const st = S(); if (!st) return; init();
    const wk = Math.floor(nowMs() / WEEK); if (st.week === wk) return;
    const steps = st.week ? Math.max(1, Math.min(12, wk - st.week)) : 1; st.week = wk;
    const now = nowMs();
    ranked().forEach((t, i) => {
      const r = i + 1, rec = st.teams[t.name] || (st.teams[t.name] = { t: byRank(r), since: now, r: [] });
      // v89: текущее место — один замер; остальные пропущенные недели — «нет данных», а не копии текущего места
      rec.r = rec.r || []; for (let k = 1; k < steps; k++) rec.r.unshift(null); rec.r.unshift(r); if (rec.r.length > 12) rec.r.length = 12;
      const nt = decide(t, r, rec, now); if (nt === rec.t) return;
      const from = rec.t; rec.t = nt; rec.since = now;
      if (nt === 1) news({ cat: 'ranking', icon: '📈', imp: 5, title: `${t.name} получает статус Tier-1`, lead: `Устойчивое место в топ-${CFG.t1In} рейтинга или титул Tier-1: команда будет получать прямые приглашения.`, body: [], tags: [{ t: 'team', v: t.name }] });
      else if (from === 1) news({ cat: 'ranking', icon: '📉', imp: 5, title: `${t.name} теряет статус Tier-1`, lead: `Два месяца вне топ-${CFG.t1Out} рейтинга и без титулов: команда больше не получает прямых приглашений на турниры Tier-1.`, body: ['Путь назад — через квалификации и стабильные результаты на Tier-2.'], tags: [{ t: 'team', v: t.name }] });
    });
  }
  function tierOf(name) {
    const st = S(); if (!st) return 0; init();
    const i = ranked().findIndex(t => t.name === name), r = i + 1;
    const rec = st.teams[name];
    // мгновенная проверка здравого смысла: топ-12 (партнёр — топ-20) никогда не ниже Tier-1
    if (i >= 0 && (r <= 12 || (PARTNERS.includes(name) && r <= 20))) return 1;
    if (rec) return rec.t;
    return i < 0 ? 3 : byRank(r);
  }
  // Приглашения на Tier-1: только команды статуса Tier-1; порядок — VRS + недавние титулы; регионы представлены
  function inviteList(n) {
    init();
    const now = nowMs(), R = W.CS2Realism?.regionOfTeam || (() => 'EU');
    const score = t => (Number(t.pts) || 0) + (now - lastTitleMs(t.name) < 365 * DAY ? 80 : 0) + (PARTNERS.includes(t.name) ? 60 : 0); // партнёры лиг (долгосрочные контракты) — приглашаются в приоритете
    const sc = new Map(); ranked().forEach(t => sc.set(t.name, score(t)));
    const t1 = ranked().filter(t => tierOf(t.name) === 1).sort((a, b) => sc.get(b.name) - sc.get(a.name));
    let list = t1.slice(0, n);
    // представители регионов: лучшая команда Азии и две лучшие команды Америк со статусом Tier-1
    const ensure = (region, k) => { t1.filter(t => R(t) === region).slice(0, k).forEach(t => { if (!list.includes(t)) { const drop = list.slice().reverse().find(x => R(x) === 'EU'); if (drop) list[list.indexOf(drop)] = t; } }); };
    ensure('AS', 1); ensure('AM', 2);
    if (list.length < n) ranked().forEach(t => { if (list.length < n && !list.includes(t)) list.push(t); });
    return list.map(t => t.name);
  }
  W.CS2TeamTier = tierOf;
  W.CS2InviteList = inviteList;
  W.CS2Tiers = { tierOf, inviteList, weekly, init, PARTNERS, CFG, state: S };
  setTimeout(() => { try { init(); } catch (e) {} }, 2500);
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(() => { try { weekly(); } catch (e) {} }, 5000);
  // перемотка: недельный шаг тоже проходит
  try { const R = W.V34Roster; if (R && typeof R.syncClock === 'function' && !R.syncClock.__v84tier) { const b = R.syncClock; R.syncClock = function () { const r = b.apply(this, arguments); try { weekly(); } catch (e) {} return r; }; R.syncClock.__v84tier = true; } } catch (e) {}

  // статус на странице команды
  const H = W.HS;
  if (H) (H.AFTER || []).push(page => {
    if (page !== 'team') return;
    try {
      const root = document.getElementById('hs-page'), k = root?.querySelector('.tm-k'); if (!k || k.querySelector('.v84-tier')) return;
      const name = H.S && H.S.arg ? decodeURIComponent(String(H.S.arg).split('/')[0]) : root.querySelector('h1')?.textContent?.trim(); if (!H.teamBy?.(name)) return;   // v93: название — из адреса (в заголовке ещё кнопка «Стать фанатом») // сборные и прочие «не клубы» — без статуса
      const st = S(), rec = st?.teams?.[name]; const t = tierOf(name);
      const since = rec?.since ? new Date(rec.since).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }) : '';
      k.insertAdjacentHTML('beforeend', ` <span class="v84-tier t${t}" title="Статус меняется только при устойчивых результатах">Tier-${t}${since ? ' · с ' + since : ''}${PARTNERS.includes(name) && t === 1 ? ' · партнёр лиг' : ''}</span>`);
    } catch (e) {}
  });
})();
