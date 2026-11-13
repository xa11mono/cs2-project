/* v95 — Этап 5 · путь к Мейджору: допуск, отборы и стадии.

   Раньше все 32 участника Мейджора определялись одним списком VRS за 4 дня до старта — путь для команд из третьего-
   четвёртого десятка рейтинга был закрыт, если они не были в топ-32 на нужный день.
   Теперь сезонный путь к каждому Мейджору:
     1. Объявление приглашений (за 'major.qualDays' дней): 'major.direct' (24) прямых приглашений по VRS с региональными
        квотами — 8 в Stage 3, 8 в Stage 2, 8 в Stage 1. Список фиксируется в этот день.
     2. Региональные отборы на оставшиеся 8 мест Stage 1 (Европа 4, Америки 2, Азия 2):
        открытые (за 18 дней: Европа — 16 команд, Америки — 8) → закрытые (за 9 дней, 8 команд: посев по рейтингу региона
        + победители открытого). Играются в календаре как обычные турниры (тот же движок, что у отборов Tier-1), со своим
        призовым фондом и весом VRS квалификации.
     3. Основной этап: Stage 1 → 2 → 3 (швейцарская система, 3 победы — проход, 3 поражения — вылет), плей-офф, финал.
   Участники фиксируются в Pick'Em Day (за 4 дня): приглашённые + победители закрытых отборов; если отбор не успел
   завершиться (старое сохранение) — место получает следующая по VRS команда (at-large), это видно на странице.
   Победители отборов всегда начинают со Stage 1.
   Последствия стадий: призовые (v94: и за Stage 1–2), стикеры (v94: по стадии), репутация организации за выход через
   отбор ('major.repQual') и за стадию основного этапа (v31: плей-офф, полуфинал, финал), очки VRS — через матчи.
   Все решения — в журнале (TOURNAMENT). */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const DAY = 864e5;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const RN = { EU: 'Europe', AM: 'Americas', AS: 'Asia' }, RN_RU = { EU: 'Европа', AM: 'Америки', AS: 'Азия' };
  const byName = n => teams.find(t => t && t.name === n) || null;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const ranked = () => pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const region = t => { try { return (W.v35Region ? W.v35Region(t) : W.CS2Realism && W.CS2Realism.regionOfTeam(t)) || 'EU'; } catch (e) { return 'EU'; } };
  const news = it => { try { W.V29News && W.V29News.add && W.V29News.add(it); } catch (e) {} };
  const journal = (type, e) => { try { W.CS2Journal && W.CS2Journal.log(type, e); } catch (x) {} };
  const nm = t => typeof t === 'string' ? t : t && t.name;
  const split = n => { const eu = Math.ceil(n / 2), rest = n - eu, am = Math.ceil(rest / 2); return { EU: eu, AM: am, AS: rest - am }; };
  const sch = () => seasonState.seasonSchedule || [];
  const quals = i => (seasonState.parallelSchedule || []).filter(e => e && e.qual && e.qual.step === i && e.season === season());
  const R0 = W.CS2Realism || {};
  const origInvites = R0.majorInvites, origPools = R0.majorPools;

  function qualEvent(st, i, r, stage, startMs, slots, feeds) {
    const size = stage === 'open' ? (r === 'EU' ? 16 : 8) : 8;
    return { id: `S${season()}-Q-${i}-${r}-${stage}`, season: season(), year: 2026 + season() - 1, tier: stage === 'open' ? '3' : '2', kind: 'qual',
      name: `${st.name} — ${RN[r]} ${stage === 'open' ? 'Open' : 'Closed'} Qualifier`, fieldProfile: 'weak', startMs, endMs: startMs + 2 * DAY,
      prize: stage === 'open' ? C('major.prizeOpen', 10000) : C('major.prizeClosed', 40000), pointsMult: stage === 'open' ? 0.12 : 0.3,
      participants: [], format: 'single', status: 'scheduled', currentRound: 0, matches: [], results: [], standings: [], winner: null,
      nextRoundAt: startMs, academyOnly: false, initialized: false, completedAt: 0, size, v95Major: true,
      qual: { step: i, main: st.name, region: r, stage, slots, feeds: feeds || null } };
  }
  // прямые приглашения: тот же отбор по VRS с региональными квотами, что и раньше для всех 32 мест
  function directList() {
    const n = Math.max(16, Math.min(32, C('major.direct', 24)));
    let all = null;
    try { all = origInvites ? origInvites.call(R0, teams) : null; } catch (e) {}
    const names = (all || ranked().slice(0, 32)).map(nm).filter(Boolean);
    const top16 = names.slice(0, 16), rest = names.slice(16).map(byName).filter(Boolean).sort((a, b) => (b.pts || 0) - (a.pts || 0)).map(t => t.name);
    return top16.concat(rest).slice(0, n);
  }
  // 1–2: объявление приглашений и отборов
  function ensure() {
    const t = now(), S = seasonState; S.parallelSchedule = S.parallelSchedule || [];
    let ch = false;
    sch().forEach((st, i) => {
      if (!st || st.type !== 'major' || st.v95Major || i < (Number(S.tournamentIndex) || 0)) return;
      const start = Number(st.calendar && st.calendar.startMs); if (!start || start - t > C('major.qualDays', 30) * DAY) return;
      if (st.v45RosterLockedAt) { st.v95Major = { skipped: 'locked' }; return; }
      if (start - t < 19 * DAY) { st.v95Major = { skipped: 'late', at: t }; ch = true; return; }   // отборы не успеют пройти в свои даты — старый порядок (VRS)
      const direct = directList(), slots = split(32 - direct.length);
      st.v35Invites = direct.slice();
      st.v95Major = { at: t, direct, slots, qualified: [], atLarge: [] };
      const at = (d, h) => { const x = new Date(start - d * DAY); x.setHours(h, 0, 0, 0); return x.getTime(); };
      ['EU', 'AM', 'AS'].forEach(r => {
        if (!slots[r]) return;
        const closed = qualEvent(st, i, r, 'closed', at(9, 13), slots[r]);
        if (r !== 'AS') S.parallelSchedule.push(qualEvent(st, i, r, 'open', at(18, 12), 2, closed.id));
        S.parallelSchedule.push(closed);
      });
      S.parallelSchedule.sort((a, b) => a.startMs - b.startMs);
      const reg = r => direct.filter(n => { const x = byName(n); return x && region(x) === r; }).length;
      news({ cat: 'event', icon: '✉️', imp: 6, title: `${st.name}: объявлены приглашения`, lead: `${direct.length} команд получили прямые приглашения по рейтингу VRS. Ещё ${32 - direct.length} мест Stage 1 разыграют региональные отборы.`,
        body: [`Stage 3: ${direct.slice(0, 8).join(', ')}.`, `Stage 2: ${direct.slice(8, 16).join(', ')}.`, `Stage 1: ${direct.slice(16).join(', ')}.`,
          `Отборы: ${['EU', 'AM', 'AS'].filter(r => slots[r]).map(r => `${RN_RU[r]} — ${slots[r]} ${slots[r] === 1 ? 'место' : 'места'}`).join(', ')}. По регионам среди приглашённых: Европа ${reg('EU')}, Америки ${reg('AM')}, Азия ${reg('AS')}.`],
        tags: direct.slice(0, 8).map(v => ({ t: 'team', v })) });
      journal('TOURNAMENT', { kind: 'major-invites', team: st.name, players: [], reason: `${st.name}: прямые приглашения — ${direct.length}, отборы — ${JSON.stringify(slots)}`, invites: direct });
      ch = true;
    });
    if (ch) { try { W.saveSeasonState && W.saveSeasonState(); } catch (e) {} }
    return ch;
  }
  // ближайший Мейджор с объявленными приглашениями (ещё не сыгран)
  function lockingStep() {
    const t = now(), idx = Number(seasonState.tournamentIndex) || 0;
    let best = null;
    sch().forEach((st, i) => { if (!st || st.type !== 'major' || !st.v95Major || !st.v95Major.direct || i < idx - 1 || st.v95Major.done) return;
      const start = Number(st.calendar && st.calendar.startMs) || 0; if (start + 12 * DAY < t) return;
      if (!best || start < best.start) best = { st, i, start }; });
    return best;
  }
  const lockAt = L => L.start - (W.CS2_PICKEM_LEAD_DAYS || 4) * DAY;
  function participants(st, i) {
    const M = st.v95Major, used = new Set(), out = [];
    M.direct.forEach(n => { if (byName(n) && !byName(n).isAcademy && !used.has(n)) { used.add(n); out.push(n); } });
    const qualified = [];
    quals(i).filter(q => q.qual.stage === 'closed' && q.status === 'completed').forEach(q => (q.placements || []).slice(0, q.qual.slots).forEach(n => { if (n && byName(n) && !used.has(n)) { used.add(n); out.push(n); qualified.push(n); } }));
    const atLarge = [];
    ranked().forEach(t => { if (out.length < 32 && !used.has(t.name)) { used.add(t.name); out.push(t.name); atLarge.push(t.name); } });
    return { names: out.slice(0, 32), qualified, atLarge };
  }
  // 3: Pick'Em Day — состав фиксируется с победителями отборов
  function invitesWrap(all) {
    const L = lockingStep();
    if (!L || !L.st.v95Major.direct) return origInvites.apply(R0, arguments);
    const M = L.st.v95Major, p = participants(L.st, L.i);
    if (!M.lockedAt && now() >= lockAt(L)) {   // до Pick'Em Day — только предварительный список (приглашённые + уже известные победители)
      M.lockedAt = now(); M.qualified = p.qualified; M.atLarge = p.atLarge;
      p.qualified.forEach(n => { try { const o = W.V31 && W.V31.org(n); if (o) o.rep = Math.max(0, Math.min(100, (o.rep || 30) + C('major.repQual', 1))); } catch (e) {} });
      if (p.qualified.length) news({ cat: 'event', icon: '🎟️', imp: 6, title: `${L.st.name}: определились победители отборов`, lead: `Через региональные отборы на Мейджор прошли ${p.qualified.join(', ')}. Они начнут со Stage 1.`,
        body: p.atLarge.length ? [`Отборы не успели определить ${p.atLarge.length} ${p.atLarge.length === 1 ? 'место' : 'места'} — их получили следующие по рейтингу VRS: ${p.atLarge.join(', ')}.`] : [], tags: p.qualified.map(v => ({ t: 'team', v })) });
      journal('TOURNAMENT', { kind: 'major-qualified', team: L.st.name, players: [], reason: `${L.st.name}: через отборы — ${p.qualified.join(', ') || 'никто'}${p.atLarge.length ? `; по рейтингу — ${p.atLarge.join(', ')}` : ''}`, qualified: p.qualified, atLarge: p.atLarge, quals: quals(L.i).map(q => `${q.qual.region}-${q.qual.stage}:${q.status}:${new Date(q.startMs).toISOString().slice(0, 10)}`) });
    }
    return p.names.map(byName).filter(Boolean);
  }
  // победители отборов всегда в Stage 1 (региональные квоты Stage 2/3 не поднимают их выше приглашённых)
  function poolsWrap(all32) {
    const pools = origPools.apply(R0, arguments);
    try {
      const L = lockingStep(); if (!L || !pools) return pools;
      const M = L.st.v95Major, q = new Set((M.qualified || []).concat(M.atLarge || []));
      if (!q.size) return pools;
      ['stage3', 'stage2'].forEach(k => {
        (pools[k] || []).slice().forEach(x => {
          if (!q.has(nm(x))) return;
          const cand = (pools.stage1 || []).filter(y => !q.has(nm(y))).sort((a, b) => ((byName(nm(b)) || {}).pts || 0) - ((byName(nm(a)) || {}).pts || 0))[0];
          if (!cand) return;
          const a = pools[k].indexOf(x), b = pools.stage1.indexOf(cand);
          pools[k][a] = cand; pools.stage1[b] = x;
        });
      });
    } catch (e) { console.warn('[v95 major pools]', e); }
    return pools;
  }
  if (origInvites && !origInvites.__v95) { const f = function () { return invitesWrap.apply(this, arguments); }; f.__v95 = true; R0.majorInvites = f; }
  if (origPools && !origPools.__v95) { const f = function () { return poolsWrap.apply(this, arguments); }; f.__v95 = true; R0.majorPools = f; }

  function info(i) {
    const st = sch()[i]; if (!st || st.type !== 'major') return null;
    const M = st.v95Major || null;
    return { name: st.name, start: Number(st.calendar && st.calendar.startMs) || 0, M, quals: quals(i).map(q => ({ id: q.id, name: q.name, region: q.qual.region, stage: q.qual.stage, slots: q.qual.slots, status: q.status, startMs: q.startMs, participants: (q.participants || []).slice(), winners: q.status === 'completed' ? (q.placements || []).slice(0, q.qual.slots) : [] })) };
  }
  function next() { const idx = Number(seasonState.tournamentIndex) || 0; const i = sch().findIndex((st, k) => st && st.type === 'major' && k >= idx); return i < 0 ? null : info(i); }
  // путь команды к ближайшему Мейджору — для рабочего места менеджера
  function teamPath(name) {
    const x = next(); if (!x) return null;
    const M = x.M;
    if (!M || !M.direct) {
      let pos = -1; try { pos = (origInvites ? origInvites.call(R0, teams) : ranked().slice(0, 32)).map(nm).indexOf(name); } catch (e) {}
      return { major: x.name, start: x.start, state: 'forecast', text: pos < 0 ? 'вне топ-32 прогноза приглашений' : `прогноз: ${pos < 8 ? 'Stage 3' : pos < 16 ? 'Stage 2' : pos < 24 ? 'Stage 1 (приглашение)' : 'граница приглашений — отбор'}` };
    }
    const di = M.direct.indexOf(name);
    if (di >= 0) return { major: x.name, start: x.start, state: 'invited', text: `приглашение в ${di < 8 ? 'Stage 3' : di < 16 ? 'Stage 2' : 'Stage 1'}` };
    if ((M.qualified || []).includes(name)) return { major: x.name, start: x.start, state: 'qualified', text: 'прошли через отбор — Stage 1' };
    const q = x.quals.find(q => q.participants.includes(name) && q.status !== 'completed') || x.quals.filter(q => q.participants.includes(name)).slice(-1)[0];
    if (q) return { major: x.name, start: x.start, state: q.status === 'completed' ? (q.winners.includes(name) ? (q.stage === 'open' ? 'open-won' : 'qualified') : 'out') : 'qual', text: `${RN_RU[q.region]}, ${q.stage === 'open' ? 'открытый' : 'закрытый'} отбор: ${q.status === 'completed' ? (q.winners.includes(name) ? 'проход' : 'выбыли') : 'идёт / впереди'}` };
    return { major: x.name, start: x.start, state: 'none', text: 'не приглашены; отборы — по рейтингу региона' };
  }
  W.CS2MajorPath = { ensure, info, next, teamPath, participants: i => participants(sch()[i], i), directList };

  // ежедневно (перемотка тоже) и по таймеру
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { if (!W.v57BatchCalendarSkip) ensure(); } catch (e) { console.warn('[v95 major path]', e); } }, 5000, 'v95-major');
  (function hookDaily() {
    if (typeof window.V30RankSnapshotTick !== 'function') { setTimeout(hookDaily, 1000); return; } CS2.patch('V30RankSnapshotTick', f => function () { const r = f.apply(this, arguments); try { ensure(); } catch (e) {} return r; }, { id: '__v95m' });
  })();
  // отборы создаются и в момент проверки квалификаций (перед созданием турниров)
  if (typeof W.v45EnsureQuals === 'function' && !W.v45EnsureQuals.__v95) { CS2.patch('v45EnsureQuals', f => function () { try { ensure(); } catch (e) {} return f.apply(this, arguments); }, { id: '__v95' });}

  /* ---------- страница «Путь на Мейджор»: приглашения и отборы ---------- */
  const H = W.HS; if (!H) return;
  const esc = H.esc;
  function box() {
    const x = next(); if (!x) return '';
    const M = x.M, d = ms => ms ? new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—';
    if (!M || !M.direct) {
      const at = x.start - C('major.qualDays', 30) * DAY;
      return H.box(`Путь к ${x.name}`, `<p class="hs-note">${M && M.skipped ? 'Для этого Мейджора отборы не проводятся (сохранение загружено слишком близко к старту): все 32 места — по рейтингу VRS.' : `Приглашения объявят ${d(at)}: ${C('major.direct', 24)} команд по VRS (8 — Stage 3, 8 — Stage 2, остальные — Stage 1), ещё ${32 - C('major.direct', 24)} мест Stage 1 — через региональные отборы.`}</p>`);
    }
    const qrow = q => `<tr><td class="l">${esc(RN_RU[q.region])} · ${q.stage === 'open' ? 'открытый' : 'закрытый'}</td><td>${d(q.startMs)}</td><td>${q.slots}</td><td class="l">${q.status === 'completed' ? q.winners.map(esc).join(', ') : q.participants.length ? `${q.participants.length} команд` : 'посев за день до старта'}</td></tr>`;
    return H.box(`Путь к ${x.name}`, `<p class="hs-note">Приглашения объявлены ${d(M.at)} по VRS. Stage 3: ${M.direct.slice(0, 8).map(esc).join(', ')}. Stage 2: ${M.direct.slice(8, 16).map(esc).join(', ')}. Stage 1: ${M.direct.slice(16).map(esc).join(', ')}.</p>
      <table class="hs-tbl"><thead><tr><th class="l">Отбор</th><th>Старт</th><th>Мест</th><th class="l">Итог</th></tr></thead><tbody>${x.quals.map(qrow).join('')}</tbody></table>
      ${M.lockedAt ? `<p class="hs-note">Через отборы: ${(M.qualified || []).map(esc).join(', ') || '—'}${(M.atLarge || []).length ? ` · по рейтингу (отбор не завершён): ${M.atLarge.map(esc).join(', ')}` : ''}.</p>` : ''}`);
  }
  (H.AFTER || []).push(page => {
    if (page !== 'majorpath') return;
    try { const root = document.getElementById('hs-page'); if (!root || root.querySelector('.v95-mp')) return; const head = root.querySelector('.hs-head'); const div = document.createElement('div'); div.className = 'v95-mp'; div.innerHTML = box(); if (head) head.after(div); else root.prepend(div); } catch (e) { console.warn('[v95 major page]', e); }
  });
  W.CS2MajorPath.box = box;
})();
