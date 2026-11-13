(() => {
'use strict';
/* =====================================================================
   v30 · Турниры в портале
   • единый список событий: Tier-1 расписание, параллельные Tier-2/3 и академии, архив;
   • страница турнира (#/event/<id>): Обзор · Матчи · Таблицы · Сетка · Команды · Статистика ·
     Призовые · Итоги — только применимые вкладки;
   • сетки по форматам: Single / Double Elimination, Swiss (W–L, выход/вылет), GSL-группы,
     Bounty, стадии Major; живые турниры рисуются из того же снимка, что и архив;
   • «Турниры» (#/events), календарь-таймлайн (#/calendar), «Матчи» (#/matches),
     Match Center (#/match/<id>) для сыгранных, идущих и ожидаемых матчей.
   id события: архивный id · 'cur' (идущий Tier-1) · 'P-<id>' (параллельный) · 'T1:<сезон>:<номер>' (будущий Tier-1).
   ===================================================================== */
const H = window.HS; if (!H) return;
const { esc, logo, trophy, KIND, box, empty, fdate, f1, f2, ratingCls, pFlag } = H;
const DAY = 864e5;
const ST = () => (typeof seasonState !== 'undefined' && seasonState) || {};
const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);
const FMT = { single: 'Single Elimination', double: 'Double Elimination', swiss: 'Swiss + плей-офф', gsl: 'GSL-группы + плей-офф', bounty: 'Bounty Hunt', major: 'Major: 3 Swiss-стадии + плей-офф' };
const PRIZE = { major: 1250000, elite: 500000, regular: 250000, tier2: 50000, tier3: 15000, academy: 25000, qual: 0 };
// доли призового фонда по местам (места 5–8 и 9–16 делят свою долю поровну)
const SPLIT = [[1, .40], [2, .18], [3, .09], [4, .07], [5, .035], [9, .0125]];
const money = v => '$' + Math.round(v).toLocaleString('en-US');
const kindOfStep = t => t === 'major' ? 'major' : t === 'elite' ? 'elite' : 'regular';
const parKind = ev => ev.qual || ev.kind === 'qual' || /qualifier|qualification|квалиф/i.test(ev.name || '') ? 'qual' : ev.kind === 'academy' ? 'academy' : (ev.tier === '2' ? 'tier2' : 'tier3');
const meta = name => { try { return window.V30Series ? window.V30Series.meta(name) : null; } catch (e) { return null; } };

/* ------------------------------------------------------------ реестр событий */
function events() {
  const st = ST(), arch = H.archive(), ct = CT(), act = ct && !ct.completed, idx = Number(st.tournamentIndex) || 1, out = [], seen = new Set();
  const byKey = {}; Object.values(arch).forEach(s => { if (s) byKey[s.name + '|' + s.season] = s; });
  // даты — фактические: завершённый — по архиву, идущий — с реального старта до «сейчас» и дальше, будущие сдвигаются
  // за концом предыдущего (после перемоток и затянувшихся турниров плановые даты из расписания уже не совпадают)
  let prevEnd = 0;
  (st.seasonSchedule || []).forEach((e, i) => {
    if (!e || i === 0) return;
    const snap = byKey[e.name + '|' + st.currentSeason], live = i === idx && act && ct.name === e.name;
    const id = snap ? snap.id : live ? 'cur' : `T1:${st.currentSeason}:${i}`;
    if (snap) seen.add(snap.id);
    const plan0 = e.calendar?.startMs || 0, dur = Math.max(DAY, (e.calendar?.endMs || plan0 + 4 * DAY) - plan0);
    let startMs = plan0, endMs = plan0 + dur;
    if (snap) { startMs = snap.gs || plan0; endMs = Math.max(startMs, snap.ge || startMs + dur); }
    else if (live) { startMs = Number(ct.calendar?.warmupStartAt) || plan0; endMs = Math.max(startMs + dur, H.nowMs()); }
    else if (i > idx || !act) { if (plan0) { startMs = Math.max(plan0, prevEnd); endMs = startMs + dur; } }
    if (plan0) prevEnd = Math.max(prevEnd, endMs);
    out.push({ id, name: e.name, kind: kindOfStep(e.type), tier: '1', startMs, endMs,
      status: snap ? 'done' : live ? 'live' : i < idx ? 'done' : 'scheduled', format: e.format, season: st.currentSeason, champion: snap?.champion, size: snap?.size || e.size || 16, step: i });
  });
  (st.parallelSchedule || []).forEach(ev => {
    const id = 'P-' + ev.id, snap = arch[id], kind = parKind(ev); seen.add(id);
    out.push({ id, name: ev.name, kind, tier: kind === 'qual' ? 'qual' : ev.kind === 'academy' ? 'academy' : ev.tier, startMs: ev.startMs, endMs: ev.endMs || ev.startMs + DAY,
      status: ev.status === 'completed' ? 'done' : ev.status === 'live' ? 'live' : 'scheduled', format: ev.format, season: ev.season, champion: kind === 'qual' ? null : (ev.winner || snap?.champion), size: (ev.participants || []).length || snap?.size || 8, prize: kind === 'qual' ? 0 : ev.prize, par: ev });
  });
  // v35: шоу заранее — шоу-турниры с датами (Streamers Battle, All-Star, Кубок наций) и запланированный шоу-матч идущего турнира
  try { const SH = window.V33Shows; if (SH) [...new Set([SH.calSeason ? SH.calSeason() : st.currentSeason, st.currentSeason])].forEach(ss => SH.SHOWS.forEach(sh => { const id = `SH${ss}-${sh.key}`; if (arch[id] || seen.has(id)) return; seen.add(id); const t = SH.dateOf(sh, ss);
    out.push({ id, name: `${sh.name} ${H.yearOf(ss)}`, kind: sh.kind === 'nations' ? 'nations' : 'show', tier: 'show', startMs: t, endMs: t + (sh.kind === "nations" ? 4.5 * DAY : DAY / 2), status: 'scheduled', season: ss, size: sh.size, format: 'single', prize: sh.kind === 'nations' ? 1500000 : 100000 }); })); } catch (e) {}
  try { const pl = act && (st.v35Show || {})[ct.name + '|' + ct.season]; if (pl && !pl.none && !pl.done) { const stp = (st.seasonSchedule || [])[idx], at = pl.when === 'day' ? pl.at : (Number(stp?.calendar?.endMs) || H.nowMs() + 3 * DAY) - DAY / 2;
    const ttl = (window.V35Show?.TYPES || []).find(x => x[0] === pl.type)?.[1] || 'Шоу-матч';
    out.push({ id: 'SMPLAN', name: `${ttl} · ${ct.name}`, kind: 'show', tier: 'show', startMs: at, endMs: at + DAY / 3, status: 'scheduled', season: st.currentSeason, size: 2, format: 'single', note: pl.when === 'final' ? 'перед гранд-финалом' : '' }); } } catch (e) {}
  Object.values(arch).forEach(s => {
    if (!s || seen.has(s.id)) return;
    const qual = !!s.qual || s.kind === 'qual' || s.prestige === 'qual' || /qualifier|qualification|квалиф/i.test(s.name || '');
    out.push({ id: s.id, name: s.name, kind: qual ? 'qual' : (s.prestige || 'regular'), tier: qual ? 'qual' : s.tier, startMs: s.gs || 0, endMs: s.ge || s.gs || 0, status: 'done', format: s.format, season: s.season, champion: qual ? null : s.champion, size: s.size, archived: true });
  });
  return out;
}
H.events = events;

/* снимок события: архив · живой Tier-1 · живой/будущий параллельный · будущий Tier-1 */
function resolve(id) {
  const arch = H.archive(), st = ST(), ct = CT();
  if (id === 'cur') {
    if (ct && !ct.completed && window.hubSnapshotTier1) return window.hubSnapshotTier1(ct);
    if (ct && ct.hubArchiveId && arch[ct.hubArchiveId]) return arch[ct.hubArchiveId];
    return null;
  }
  if (arch[id]) return arch[id];
  if (/^SH\d+-|^SMPLAN$/.test(id)) { const e = events().find(x => x.id === id); if (e) return { id, name: e.name, prestige: e.kind, season: e.season, year: H.yearOf(e.season), format: 'single', size: e.size, blocks: [], results: [], scheduled: true, startMs: e.startMs, endMs: e.endMs, participants: [] }; } // шоу, которое ещё впереди
  if (ct && ct.hubArchiveId === id && window.hubSnapshotTier1) return window.hubSnapshotTier1(ct);
  if (/^P-/.test(id)) {
    const ev = (st.parallelSchedule || []).find(e => 'P-' + e.id === id); if (!ev) return null;
    if (ev.br && window.hubSnapshotParallel) return window.hubSnapshotParallel(ev);
    return { id, name: ev.name, prestige: parKind(ev), season: ev.season, year: ev.year, format: ev.format, size: (ev.participants || []).length, blocks: [], results: [], scheduled: true, startMs: ev.startMs, endMs: ev.endMs, participants: (ev.participants || []).map(x => typeof x === 'string' ? x : x.name) };
  }
  const m = /^T1:(\d+):(\d+)$/.exec(id);
  if (m) {
    const e = (st.seasonSchedule || [])[+m[2]]; if (!e || +m[1] !== st.currentSeason) return null;
    if (ct && !ct.completed && ct.name === e.name) return window.hubSnapshotTier1(ct);
    const done = Object.values(arch).find(s => s && s.name === e.name && s.season === +m[1]); if (done) return done;
    if (e.type === 'major') {
      const rosterState = window.v45MajorRosterState ? window.v45MajorRosterState(+m[2]) : null;
      const rosterLocked = rosterState ? !!rosterState.locked : !!(e.v45RosterLockedAt && Array.isArray(e.v45Participants) && e.v45Participants.length);
      const frozen = rosterState?.names?.length ? rosterState.names.slice() :
        (rosterLocked && Array.isArray(e.v45Participants) ? e.v45Participants.slice() :
          (window.CS2Realism?.majorInvites?.(teams) || teams.filter(t=>!t.isAcademy).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,32)).map(t => typeof t === 'string' ? t : t.name));
      const objs = frozen.map(n => teams.find(t => t.name === n)).filter(Boolean);
      let pools = null;
      try {
        if (rosterLocked) {
          const fixed = rosterState?.pools || window.v45MajorStagePools?.(+m[2]) || e.v45StagePools || null;
          const names = key => (fixed?.[key] || []).map(x => typeof x === 'string' ? x : x?.name).filter(Boolean);
          let stage3 = names('stage3'), stage2 = names('stage2'), stage1 = names('stage1');
          if (stage3.length !== 8 || stage2.length !== 8 || stage1.length !== 16 || new Set([...stage3,...stage2,...stage1]).size !== 32) {
            stage3 = frozen.slice(0,8); stage2 = frozen.slice(8,16); stage1 = frozen.slice(16,32);
          }
          pools = { stage3, stage2, stage1 };
        } else {
          pools = window.CS2Realism?.majorPools?.(objs) || null;
          if (pools) pools = { stage1:pools.stage1.map(t=>t.name), stage2:pools.stage2.map(t=>t.name), stage3:pools.stage3.map(t=>t.name) };
        }
      } catch(err) {}
      return { id, name: e.name, prestige: 'major', season: st.currentSeason, year: H.yearOf(st.currentSeason), format: e.format, size: frozen.length || 32, blocks: [], results: [], scheduled: true, startMs: e.calendar?.startMs, endMs: e.calendar?.endMs, participants: frozen, majorPreview: true, majorRosterLocked: rosterLocked, majorRosterLockAt: rosterState?.lockAt || ((e.calendar?.startMs||0)-DAY), majorPools: pools };
    }
    if (String(e.format || '').toLowerCase() === 'bounty') {
      const invited = teams.filter(t=>!t.isAcademy).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,28).map(t=>t.name);
      return { id, name: e.name, prestige: kindOfStep(e.type), season: st.currentSeason, year: H.yearOf(st.currentSeason), format: e.format, size: e.size || 32, blocks: [], results: [], scheduled: true, startMs: e.calendar?.startMs, endMs: e.calendar?.endMs, participants: invited, bountyPreview: true, bountySlots: 4 };
    }
    const qi = window.v35QualInfo ? window.v35QualInfo(+m[2]) : null;
    const preview = qi ? (qi.participants || [...qi.invites, ...(qi.qualified||[])]) : [];
    return { id, name: e.name, prestige: kindOfStep(e.type), season: st.currentSeason, year: H.yearOf(st.currentSeason), format: e.format, size: e.size || 16, blocks: [], results: [], scheduled: true, startMs: e.calendar?.startMs, endMs: e.calendar?.endMs, fieldProfile: e.fieldProfile, participants: [...new Set(preview)], invitePreview: qi || null };
  }
  return null;
}
H.resolveEvent = resolve;
// индексы матчей внутри снимка: тот же порядок обхода, что у allMatches → совпадают id «<снимок>~k»
function indexSnap(snap) {
  let k = 0; const list = [];
  (snap.blocks || []).forEach((b, bi) => (b.sections || []).forEach(sec => (sec.rounds || []).forEach(r => (r.ms || []).forEach(m => { k++; if (m) { m.__k = k; m.__id = snap.id + '~' + k; m.__stage = [b.title, sec.title, r.title].filter(Boolean).join(' · '); list.push(m); } }))));
  return list;
}
H.indexSnap = indexSnap;
function findMatch(id) { // «<снимок>~k» → {snap, m}
  const i = String(id).lastIndexOf('~'); if (i < 0) return null;
  const sid = id.slice(0, i), k = +id.slice(i + 1);
  let snap = resolve(sid);
  if (!snap) { const ct = CT(); if (ct?.hubArchiveId === sid) snap = window.hubSnapshotTier1(ct); }
  if (!snap) return null;
  const m = indexSnap(snap).find(x => x.__k === k); return m ? { snap, m } : null;
}
H.findMatch = findMatch;

/* ------------------------------------------------------------ живые матчи эфира */
function liveItem(a, b) {
  const br = CT()?.broadcast; if (!br) return null;
  return (br.active || []).find(i => i?.match && ((i.match.t1 === a && i.match.t2 === b) || (i.match.t1 === b && i.match.t2 === a))) || null;
}
H.liveItem = liveItem;
function liveMatches() { // всё, что сейчас в эфире или ждёт старта в идущих турнирах
  const out = [], ct = CT();
  if (ct && !ct.completed && window.hubSnapshotTier1) {
    const snap = window.hubSnapshotTier1(ct);
    indexSnap(snap).forEach(m => { if (m.a && m.b && !m.w) out.push({ snap, m, live: !!m.lv || !!liveItem(m.a, m.b), at: null }); });
  }
  (ST().parallelSchedule || []).forEach(ev => {
    if (ev.status !== 'live' || !ev.br || !window.hubSnapshotParallel) return;
    const snap = window.hubSnapshotParallel(ev);
    indexSnap(snap).forEach(m => { if (m.a && m.b && !m.w) out.push({ snap, m, live: false, at: m.at || null }); });
  });
  return out;
}
H.liveMatches = liveMatches;

/* ------------------------------------------------------------ элементы сетки */
const sc = (m, side) => { // счёт стороны: BO1 — раунды карты, иначе карты серии
  if (!m.w && !m.s) return '';
  if (m.mp && m.mp.length === 1 && (m.bo === 1 || (m.s && Math.max(...m.s) === 1))) return side === 'a' ? m.mp[0][1] : m.mp[0][2];
  return m.s ? (side === 'a' ? m.s[0] : m.s[1]) : (m.w === m[side] ? 'W' : 'L');
};
function bmatch(m, opts) {
  if (!m) return `<div class="br-m tbd"><div class="br-t"><span class="nm">TBD</span></div><div class="br-t"><span class="nm">TBD</span></div></div>`;
  const it0 = m.a && m.b && !m.w ? liveItem(m.a, m.b) : null, live = !!it0 || (!!m.lv && !!CT()?.broadcast?.running), ls = it0 ? liveSc(m) : null;
  const row = side => { const n = m[side], cls = !n ? 'tbd' : m.w ? (m.w === n ? 'w' : 'l') : '';
    const v = ls ? `${side === 'a' ? ls.a : ls.b}${ls.bo1 ? '' : `<small>${side === 'a' ? ls.ma : ls.mb}</small>`}` : esc(sc(m, side));
    return `<div class="br-t ${cls}">${n ? logo(n, 'xs') : '<span class="hs-logo xs ghost"></span>'}<span class="nm">${n ? esc(n) : 'TBD'}</span><b class="sc${ls ? ' lv' : ''}">${n ? v : ''}</b></div>`; };
  const clickable = m.a && m.b && !m.wo;
  const tag = m.tag ? `<span class="br-tag">${esc(m.tag)}</span>` : '';
  return `<${clickable ? 'button type="button"' : 'div'} class="br-m${live ? ' live' : ''}${m.wo ? ' wo' : ''}"${clickable ? ` data-match="${esc(m.__id)}"` : ''}>${tag}${row('a')}${row('b')}${live ? '<span class="br-live">LIVE</span>' : ''}${m.wo ? '<span class="br-live wo">w/o</span>' : ''}</${clickable ? 'button' : 'div'}>`;
}
function elimTree(rounds, opts) { // Single Elimination с соединителями: каждый раунд вдвое меньше
  const n0 = Math.max(1, ...rounds.map(r => (r.ms || []).length));
  const halving = rounds.every((r, i) => i === 0 || (r.ms || []).length * 2 === (rounds[i - 1].ms || []).length || (r.ms || []).length === (rounds[i - 1].ms || []).length);
  const cols = rounds.map((r, i) => {
    const ms = r.ms || [], pairs = [];
    const next = rounds[i + 1], pairable = halving && next && (next.ms || []).length * 2 === ms.length;
    const straight = halving && next && (next.ms || []).length === ms.length;   // нижняя сетка: раунд с тем же числом матчей
    if (pairable) for (let j = 0; j < ms.length; j += 2) pairs.push(`<div class="br-pair">${bmatch(ms[j])}${bmatch(ms[j + 1])}</div>`);
    else ms.forEach(m => pairs.push(`<div class="br-solo${straight ? ' lk' : ''}">${bmatch(m)}</div>`));
    return `<div class="br-col${i > 0 && halving ? ' in' : ''}"><h5>${esc(r.title || '')}</h5><div class="br-col-b">${pairs.join('')}</div></div>`;
  }).join('');
  return `<div class="br${opts?.cls ? ' ' + opts.cls : ''}" style="--rows:${n0}">${cols}</div>`;
}
function columns(rounds) { // без соединителей (нижняя сетка, группы)
  return `<div class="br flat">${rounds.map(r => `<div class="br-col"><h5>${esc(r.title || '')}</h5><div class="br-col-b">${(r.ms || []).map(m => `<div class="br-solo">${bmatch(m)}</div>`).join('')}</div></div>`).join('')}</div>`;
}
function swissView(b) {
  const rows = (b.standings || []).slice().sort((x, y) => y.w - x.w || x.l - y.l);
  const thr = b.noStatus ? 0 : 3;
  const tbl = `<table class="hs-tbl sw-tbl"><thead><tr><th>#</th><th class="l">Команда</th><th>W–L</th><th class="l">Статус</th></tr></thead><tbody>${rows.map((r, i) => {
    const s = !thr ? '' : r.w >= thr ? '<span class="sw-st q">Выход</span>' : r.l >= thr ? '<span class="sw-st e">Вылет</span>' : '<span class="sw-st">В игре</span>';
    return `<tr data-team="${esc(r.n)}" class="${thr && r.w >= thr ? 'q' : thr && r.l >= thr ? 'e' : ''}"><td class="n">${i + 1}</td><td class="l">${logo(r.n, 'sm')}<b>${esc(r.n)}</b></td><td><b>${r.w}–${r.l}</b></td><td class="l">${s}</td></tr>`; }).join('')}</tbody></table>`;
  const rounds = (b.sections || [])[0]?.rounds || [];
  const grid = thr ? swissGrid(rounds, thr, (b.standings || []).length || 16, (b.standings || []).map(r => r.n).filter(Boolean)) : '';
  return grid ? `${grid}<details class="sw-more"><summary>Таблица W–L</summary>${tbl}</details>`
    : `<div class="sw"><div class="sw-l">${tbl}</div><div class="sw-r">${columns(rounds)}</div></div>`;
}
// Сетка «по счёту», как на Major: колонка = раунд, внутри — группы по текущему счёту (1:0, 0:1 …),
// стрелки — куда уходят победители (зелёная) и проигравшие (красная); итоговые блоки «Выход» и «Вылет».
function swissGrid(rounds, thr, teamCount = 16, allNames = []) {
  // Fixed 16-team Swiss map: every round and score bucket is visible from event start.
  // Empty future matches are visual-only slots; they never enter match simulation or VRS.
  const rec = {}, R = n => rec[n] || (rec[n] = { w: 0, l: 0 });
  const templates = [
    [['0:0', 8]],
    [['1:0', 4], ['0:1', 4]],
    [['2:0', 2], ['1:1', 4], ['0:2', 2]],
    [['2:1', 3], ['1:2', 3]],
    [['2:2', 3]]
  ];
  const actualRounds = Array.isArray(rounds) ? rounds : [];
  (allNames || []).forEach(n => R(n));
  // v84: ожидаемое число команд в итоговых корзинах (3:0, 3:1, 3:2 / 0:3, 1:3, 2:3) — блоки видны с начала этапа.
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  const expectFinish = round => Math.max(0, Math.round(Number(teamCount || 16) * binom(round - 1, thr - 1) / Math.pow(2, round)));
  const is16 = Number(teamCount) >= 14;
  const fallbackTemplates = is16 ? templates : Number(teamCount) >= 7 ? [
    [['0:0', 4]], [['1:0', 2], ['0:1', 2]], [['2:0', 1], ['1:1', 2], ['0:2', 1]],
    [['2:1', 1], ['1:2', 1]], [['2:2', 1]]
  ] : [ [['0:0', Math.max(1, Math.ceil(Number(teamCount || 4) / 2))]], [['1:0', 1], ['0:1', 1]], [['1:1', 1]], [['1:2', 1]], [['2:2', 1]] ];
  const cols = [], done = [];
  for (let i = 0; i < 5; i++) {
    const r = actualRounds[i] || { ms: [] };
    const pools = {};
    (r.ms || []).forEach(m => {
      if (!m) return;
      const a = m.a ? R(m.a) : null, key = a ? `${a.w}:${a.l}` : '?';
      (pools[key] = pools[key] || []).push(m);
    });
    const template = fallbackTemplates[i] || [];
    // Команды, которые уже знают свой счёт, но ещё не получили пару в этом раунде.
    const paired = new Set((r.ms || []).flatMap(m => m ? [m.a, m.b] : []).filter(Boolean));
    const waiting = {};
    if (!(r.ms || []).length || i === actualRounds.length - 1 || i === actualRounds.length) {
      Object.entries(rec).forEach(([n, x]) => {
        if (paired.has(n) || x.w >= thr || x.l >= thr || x.w + x.l !== i) return;
        (waiting[`${x.w}:${x.l}`] = waiting[`${x.w}:${x.l}`] || []).push(n);
      });
    }
    template.forEach(([key, count]) => {
      const list = pools[key] || (pools[key] = []);
      const wait = waiting[key] || [];
      while (list.length < count) list.push({ __pending: true, a: wait.shift() || null, b: wait.shift() || null, w: null });
    });
    const ordered = Object.entries(pools).sort((x, y) => {
      const parse = k => k === '?' ? [-1, -1] : k.split(':').map(Number);
      const [aw, al] = parse(x[0]), [bw, bl] = parse(y[0]);
      return (bw - bl) - (aw - al) || bw - aw;
    });
    cols.push(ordered);
    const fin = [];
    (r.ms || []).forEach(m => {
      if (!m?.w || !m.a || !m.b) return;
      const lo = m.w === m.a ? m.b : m.a;
      R(m.w).w++; R(lo).l++;
      [m.w, lo].forEach(n => { const x = rec[n]; if (x.w === thr || x.l === thr) fin.push({ n, w: x.w, l: x.l }); });
    });
    done.push(fin);
  }
  const chip = (m, side) => {
    const n = m?.[side];
    if (!n) return '<span class="sg-q" aria-label="Неизвестная команда">?</span>';
    const cls = m.w ? (m.w === n ? 'w' : 'l') : '';
    return `<span class="sg-t ${cls}" title="${esc(n)}">${logo(n, 'sm')}</span>`;
  };
  const mrow = m => {
    if (!m || m.__pending || !m.a || !m.b) {
      const side = n => n ? `<span class="sg-t" title="${esc(n)}">${logo(n, 'sm')}</span>` : '<span class="sg-q" aria-label="Соперник определится позже">TBD</span>';
      return `<div class="sg-m sg-pending" aria-label="Пара ещё не сформирована">${side(m?.a)}<span class="sg-vs">vs</span>${side(m?.b)}</div>`;
    }
    const ls = !m.w ? liveSc(m) : null, sa = m.w ? sc(m, 'a') : ls ? ls.a : '', sb = m.w ? sc(m, 'b') : ls ? ls.b : '';
    return `<${m.a && m.b ? `button type="button" data-match="${esc(m.__id)}"` : 'div'} class="sg-m${ls ? ' live' : ''}">${chip(m, 'a')}<span class="sg-vs">${m.w || ls ? `<b class="${m.w === m.a ? 'w' : ''}">${sa}</b>:<b class="${m.w === m.b ? 'w' : ''}">${sb}</b>` : 'vs'}</span>${chip(m, 'b')}</${m.a && m.b ? 'button' : 'div'}>`;
  };
  // v84: итоговые блоки показываются всегда; пустые места — аккуратные слоты, а не «?».
  const box = (list, cls, title, expected = 0) => {
    const slots = Math.max(list.length, expected);
    if (!slots) return '';
    const cells = list.map(x => `<span class="sg-t" data-team="${esc(x.n)}" title="${esc(x.n)}">${logo(x.n, 'sm')}</span>`);
    for (let k = list.length; k < slots; k++) cells.push('<span class="sg-slot" aria-label="Место ещё не определено"></span>');
    return `<div class="sg-end ${cls}"><h6>${title}</h6><div>${cells.join('')}</div></div>`;
  };
  const html = cols.map((pools, i) => {
    const prev = i ? done[i - 1] : [], adv = prev.filter(x => x.w === thr), out = prev.filter(x => x.l === thr);
    const exp = i >= thr ? expectFinish(i) : 0;
    const advT = `${thr}:${i - thr}`, outT = `${i - thr}:${thr}`;
    return `<div class="sg-col">${box(adv, 'adv', `${advT} — выход`, exp)}${pools.map(([k, ms]) => {
      const [w, l] = k.split(':').map(Number);
      const route = k !== '?' && (i < 4) ? '<i class="sg-ar up" aria-hidden="true"></i><i class="sg-ar dn" aria-hidden="true"></i>' : '';
      return `<div class="sg-pool${i >= actualRounds.length ? ' is-pending' : ''}"><h6>${k === '?' ? 'TBD' : k}</h6>${ms.map(mrow).join('')}${route}</div>`;
    }).join('')}${box(out, 'out', `${outT} — вылет`, exp)}</div>`;
  }).join('') + (() => {
    // Итоги последнего раунда (3:2 и 2:3) — отдельная колонка.
    const last = done[cols.length - 1] || [], r5 = cols.length;
    const exp = r5 >= thr ? expectFinish(r5) : 0;
    const adv = last.filter(x => x.w === thr), out = last.filter(x => x.l === thr);
    return exp || adv.length || out.length ? `<div class="sg-col sg-final">${box(adv, 'adv', `${thr}:${r5 - thr} — выход`, exp)}${box(out, 'out', `${r5 - thr}:${thr} — вылет`, exp)}</div>` : '';
  })();
  return `<div class="sg" data-swiss-rounds="6">${html}</div>`;
}
function gslGroup(sec) {
  const ms = (sec.rounds || []).flatMap(r => (r.ms || []).map(m => m && Object.assign(m, { __r: r.title })));
  const names = [...new Set(ms.flatMap(m => m ? [m.a, m.b] : []).filter(Boolean))];
  const rec = {}; names.forEach(n => rec[n] = { w: 0, l: 0 });
  ms.forEach(m => { if (!m?.w) return; const l = m.w === m.a ? m.b : m.a; if (rec[m.w]) rec[m.w].w++; if (rec[l]) rec[l].l++; });
  const st = n => rec[n].w >= 2 ? 'q' : rec[n].l >= 2 ? 'e' : '';
  const tbl = names.sort((a, b) => rec[b].w - rec[a].w || rec[a].l - rec[b].l).map(n => `<div class="gsl-r ${st(n)}" data-team="${esc(n)}">${logo(n, 'xs')}<span>${esc(n)}</span><b>${rec[n].w}–${rec[n].l}</b>${st(n) === 'q' ? '<i>Выход</i>' : st(n) === 'e' ? '<i>Вылет</i>' : ''}</div>`).join('');
  return `<div class="gsl"><h4>${esc(sec.title || 'Группа')}</h4><div class="gsl-tbl">${tbl}</div><div class="gsl-ms">${(sec.rounds || []).map(r => `<div class="gsl-rd"><h5>${esc(r.title)}</h5>${(r.ms || []).map(bmatch).join('')}</div>`).join('')}</div></div>`;
}
function blockView(b) {
  const secs = b.sections || [];
  if (b.standings) return swissView(b);
  const isGsl = secs.length && secs.every(s => /^Группа/.test(s.title || '')) && secs.some(s => (s.rounds || []).length >= 3);
  if (isGsl) return `<div class="gsl-grid">${secs.map(gslGroup).join('')}</div>`;
  const ub = secs.find(s => /Верхняя/.test(s.title || '')), lb = secs.find(s => /Нижняя/.test(s.title || '')), gf = secs.find(s => /Гранд|^Финал$/.test(s.title || ''));
  if (ub && lb) {
    // гранд-финал — в строке верхней сетки, справа от её финала: там есть место, нижняя сетка шире
    const gfHtml = gf ? `<div class="de-gf"><h4>Гранд-финал</h4>${(gf.rounds || []).flatMap(r => r.ms || []).map(bmatch).join('')}</div>` : '';
    return `<div class="de"><div class="de-main"><div class="de-part"><h4>Верхняя сетка</h4><div class="de-up">${elimTree(ub.rounds)}${gfHtml}</div></div><div class="de-part"><h4>Нижняя сетка</h4>${elimTree(lb.rounds, { cls: 'lb' })}</div></div></div>`;
  }
  return secs.map(s => {
    const bronze = /3-е место/.test(s.title || '');
    const head = s.title ? `<h4>${esc(s.title)}</h4>` : '';
    if (bronze) return `<div class="br-bronze">${head}${(s.rounds || []).flatMap(r => r.ms || []).map(bmatch).join('')}</div>`;
    if (/Bounty|Стадия/i.test((b.title || '') + (s.title || ''))) return head + columns(s.rounds || []);
    return head + elimTree(s.rounds || []);
  }).join('');
}

/* ------------------------------------------------------------ страница турнира */
const ETABS = [['overview', 'Обзор'], ['matches', 'Матчи'], ['groups', 'Таблицы'], ['bracket', 'Сетка'], ['teams', 'Команды'], ['stats', 'Статистика'], ['prize', 'Призовые'], ['results', 'Итоги']];
function mvpOf(id) { const A = H.awards(); for (const [nick, r] of Object.entries(A)) { const x = (r.mvp || []).find(q => q.id === id); if (x) return { nick, team: x.team }; } return null; }
function prizeRows(snap) {
  const total = Number(snap.prizePool) || PRIZE[snap.prestige] || 100000, n = snap.size || (snap.results || []).length || 16, out = [];
  const groups = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 8], [9, 16]];
  groups.forEach(([a, b]) => { if (a > n) return; const share = (SPLIT.find(x => x[0] === a) || [0, 0])[1]; const cnt = Math.min(b, n) - a + 1; out.push({ a, b: Math.min(b, n), each: total * share, cnt }); });
  // место 3–4 в форматах без матча за 3-е место делится поровну
  return { total, rows: out };
}
function placeLabel(p, snap) { if (!p) return '—'; return p === 1 ? '1' : String(p); }
function eventHead(snap, ev) {
  const isQual = !!snap.qual || snap.kind === 'qual' || snap.prestige === 'qual' || /qualifier|qualification|квалиф/i.test(snap.name || '');
  const kind = isQual ? 'qual' : (snap.prestige || ev?.kind || 'regular'), mt = meta(snap.name);
  const status = snap.live ? '<span class="hs-live">LIVE</span>' : snap.scheduled ? '<span class="ev-st">Скоро</span>' : '<span class="ev-st done">Завершён</span>';
  const dates = ev?.startMs > 0 ? `${fdate(ev.startMs)} – ${fdate(ev.endMs)} ${new Date(ev.endMs).getFullYear()}` : `сезон ${snap.season} · ${snap.year || H.yearOf(snap.season)}`;
  const facts = [['Даты', dates], ['Формат', FMT[snap.format] || snap.format || '—'], ['Команд', snap.size || (snap.participants || []).length || '—'], ['Призовой фонд', money(Number(snap.prizePool) || PRIZE[kind] || 0)]];
  if (mt?.city) facts.splice(1, 0, ['Место', `${mt.city}${mt.lan === false ? ' · онлайн' : ' · LAN'}`]);
  return `${H.back()}<header class="ev-head k-${kind}"><div class="ev-tr">${trophy(snap.name, snap.season, kind)}</div>
    <div class="ev-id"><div class="ev-k"><span class="hs-kind k-${kind}">${KIND[kind] || ''}</span>${status}${mt?.series ? `<span class="hs-dim">${esc(mt.series)}</span>` : ''}</div><h1>${esc(snap.name)}</h1>
      <dl class="ev-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl></div>
    ${!isQual && snap.champion && snap.champion !== '—' && !snap.live ? `<button type="button" class="ev-champ" data-team="${esc(snap.champion)}"><small>Чемпион</small>${logo(snap.champion, 'lg')}<b>${esc(snap.champion)}</b></button>` : ''}</header>`;
}
function eventPage(id) {
  const snap = resolve(id); const evs = events(); const ev = evs.find(e => e.id === id || (snap && e.id === snap.id) || (id === 'cur' && e.id === 'cur'));
  if (!snap) return H.back() + empty('Сетка этого турнира отсутствует в текущем сохранении. Турниры, завершённые в v54 и новее, сохраняются в отдельной истории и доступны из вкладки «Архив».');
  const ms = indexSnap(snap), st = H.stats();
  const hasGroups = (snap.blocks || []).some(b => b.tab === 'groups'), hasPlay = (snap.blocks || []).some(b => b.tab === 'playoff');
  // v84: у ещё не начавшегося турнира «Обзора» нет — открывается вкладка «Команды»
  const notStarted = !!snap.scheduled && !ms.length;
  const avail = { overview: notStarted ? 0 : 1, matches: ms.length, groups: hasGroups, bracket: hasPlay, teams: 1, stats: !snap.scheduled, prize: 1, results: (snap.results || []).length };
  let tab = H.S.etab && avail[H.S.etab] ? H.S.etab : (notStarted ? 'teams' : 'overview');
  const tabs = `<div class="hs-ptabs">${ETABS.filter(([k]) => avail[k]).map(([k, l]) => `<button type="button" class="hs-ptab${tab === k ? ' on' : ''}" data-etab2="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  const names = snap.participants || (snap.results || []).map(r => r.n) || [];
  if (tab === 'overview') {
    const done = ms.filter(m => m.w && !m.wo).slice(-6).reverse(), next = ms.filter(m => m.a && m.b && !m.w).slice(0, 6);
    const mvp = mvpOf(snap.id), final = ms.filter(m => /Гранд|Финал \(|^Финал|Финал$/.test(m.__stage.split(' · ').pop() || '') && m.w).pop();
    const top = Object.values(st.P).map(o => ({ o, e: o.byEv[snap.id] })).filter(x => x.e && x.e.s.maps >= 2).map(x => ({ ...x, l: H.line(x.e.s) })).sort((a, b) => b.l.rating - a.l.rating).slice(0, 5);
    const news = H.feed().filter(n => n.ev === snap.id || (n.tags || []).some(t => t.t === 'event' && t.v === snap.id)).slice(0, 6);
    // текущая стадия: последний блок, где уже определены пары (плей-офф сменяет группы, как только начинается)
    const started = b => JSON.stringify(b.sections || []).includes('"a":"') || (b.standings || []).length;
    const curBlock = snap.live ? (snap.blocks.filter(started).slice(-1)[0] || snap.blocks.filter(b => b.tab === 'groups').slice(-1)[0]) : null;
    const groupsPreview = curBlock ? `${curBlock.tab === 'playoff' ? `<h4 class="ev-stage-t">${esc(curBlock.title || 'Плей-офф')}</h4>` : ''}${blockView(curBlock)}` : '';
    const left = [
      final ? box('Финал', bmatch(final) + `<p class="hs-note">${esc(final.__stage)}</p>`, '', 'ev-final') : '',
      snap.live && next.length ? box('Ближайшие матчи', next.map(bmatchRow).join(''), '<button type="button" class="hs-more" data-etab2="matches">все →</button>', 'flush') : '',
      done.length ? box('Последние результаты', done.map(bmatchRow).join(''), '<button type="button" class="hs-more" data-etab2="matches">все →</button>', 'flush') : '',
      snap.scheduled ? box(snap.majorPreview ? 'Участники Major' : 'Участники турнира', names.length ? `<div class="ev-teams">${names.map(n => `<button type="button" data-team="${esc(n)}">${logo(n, 'sm')} ${esc(n)}</button>`).join('')}</div><p class="hs-note">${snap.majorPreview ? (snap.majorRosterLocked ? "Полный состав Major зафиксирован на Pick'Em Day; Pick'Em открыт." : "Предварительный состав по текущему рейтингу. Полный список зафиксируется за сутки до начала — в Pick'Em Day.") : snap.bountyPreview ? 'Показаны 28 прямых приглашений по рейтингу; ещё 4 места разыгрываются в Bounty-отборе.' : 'Здесь собраны прямые приглашения и уже прошедшие квалификацию команды. Неопределённые места будут показаны отдельно во вкладке «Команды».'}</p>` : empty('Первые приглашения ещё не сформированы.')) : ''
    ].join('');
    const right = [
      mvp ? box('MVP турнира', `<button type="button" class="ev-mvp" data-player="${esc(mvp.nick)}">${window.TW ? window.TW.medalSvg('mvp') : ''}<span><b>${esc(mvp.nick)}</b><small>${esc(mvp.team || '')}</small></span></button>`) : '',
      top.length ? box('Лучшие игроки', `<table class="hs-tbl"><thead><tr><th class="l">Игрок</th><th>Карт</th><th>Rating 3.0</th></tr></thead><tbody>${top.map(x => `<tr data-player="${esc(x.o.nick)}"><td class="l">${pFlag(x.o.p)} <b>${esc(x.o.nick)}</b><small>${esc(x.e.team)}</small></td><td>${x.l.maps}</td><td><b class="${ratingCls(x.l.rating)}">${f2(x.l.rating)}</b></td></tr>`).join('')}</tbody></table>`, '<button type="button" class="hs-more" data-etab2="stats">все →</button>', 'flush') : '',
      (snap.results || []).length && !snap.live ? box('Итоги', resultsTable(snap, 8), '<button type="button" class="hs-more" data-etab2="results">все →</button>', 'flush') : '',
      news.length ? box('Новости турнира', news.map(n => `<button type="button" class="ev-news" data-art="${esc(n.id)}"><b>${esc(n.title)}</b><small>${H.ndate(n.ts)}</small></button>`).join(''), '', 'flush') : ''
    ].join('');
    // сетка текущей стадии — на всю ширину под шапкой; если правая колонка пуста, левая тоже на всю ширину
    const stage = groupsPreview ? box('Текущая стадия', groupsPreview, '', 'ev-stage') : '';
    body = (right ? `<div class="hs-grid2"><div class="hs-col">${left || empty('Матчи ещё не начались')}</div><div class="hs-col">${right}</div></div>` : `<div class="hs-col">${left || empty('Матчи ещё не начались')}</div>`) + stage;
  } else if (tab === 'matches') {
    const groups = {}; ms.forEach(m => { const g = m.__stage || 'Матчи'; (groups[g] = groups[g] || []).push(m); });
    body = Object.entries(groups).map(([g, list]) => box(esc(g), list.map(bmatchRow).join(''), '', 'flush')).join('');
  } else if (tab === 'groups') {
    body = snap.blocks.filter(b => b.tab === 'groups').map(b => `<section class="ev-block"><h3 class="hs-h3">${esc(b.title)}</h3>${blockView(b)}</section>`).join('');
  } else if (tab === 'bracket') {
    body = snap.blocks.filter(b => b.tab === 'playoff').map(b => `<section class="ev-block"><h3 class="hs-h3">${esc(b.title)}</h3><div class="br-scroll">${blockView(b)}</div></section>`).join('');
  } else if (tab === 'teams') { // единый состав турнира: инвайты + реальные квалификанты + свободные слоты
    const rank = {}; H.ranked().forEach((t, i) => rank[t.name] = i + 1);
    const plc = {}; (snap.results || []).forEach(r => plc[r.n] = r.p);
    const m1 = /^T1:(\d+):(\d+)$/.exec(id), stepI = m1 ? +m1[2] : id === 'cur' ? Number(ST().tournamentIndex) : null;
    const QI = stepI != null && window.v35QualInfo ? window.v35QualInfo(stepI) : null, qWin = {};
    (QI?.quals || []).filter(q => q.stage === 'closed').forEach(q => q.winners.forEach(n => { qWin[n] = q; }));
    const inviteSet = new Set(QI?.invites || []), qualifiedSet = new Set(QI?.qualified || []), atLargeSet = new Set(QI?.atLarge || []);
    const card = (n, tag) => `<button type="button" class="ev-tc" data-team="${esc(n)}">${rank[n] ? `<i class="ev-tc-rk">#${rank[n]}</i>` : ''}${plc[n] ? `<i class="ev-tc-pl">${plc[n] === 1 ? '🏆' : plc[n] + '-е'}</i>` : ''}<b>${esc(n)}</b><span class="ev-tc-logo">${logo(n, 'xl')}</span><small>${esc(tag || 'Участник')}</small></button>`;
    const sub = n => plc[n] ? (plc[n] === 1 ? 'Чемпион' : plc[n] + '-е место') : rank[n] ? '#' + rank[n] + ' в мире' : '';
    let cards = '', note = '';
    if (snap.scheduled && snap.bountyPreview) {
      cards = (snap.participants || []).map(n=>card(n,'Прямое приглашение · рейтинг')).join('');
      const pending = Math.max(0, Number(snap.bountySlots)||4);
      for(let k=0;k<pending;k++) cards += `<div class="ev-tc q"><b>Bounty Qualifier</b><span class="ev-tc-logo"><span class="ev-q">?</span></span><small>Место ${k+1} из ${pending}</small></div>`;
      note = '<p class="hs-note">28 команд получают прямые приглашения, ещё 4 проходят через отдельный Bounty-отбор.</p>';
    } else if (snap.scheduled && snap.majorPreview && snap.majorPools) {
      const pools = snap.majorPools;
      cards = [['Stage I',pools.stage1],['Stage II',pools.stage2],['Stage III',pools.stage3]].map(([label,arr])=>arr.map(n=>card(n,`Состав · ${label}`)).join('')).join('');
      note = `<p class="hs-note">${snap.majorRosterLocked ? 'Состав Major окончательно зафиксирован на Pick\'Em Day.' : 'Это предварительный прогноз по рейтингу. Окончательный состав будет зафиксирован за сутки до начала Major.'}</p>`;
    } else if (QI && (snap.scheduled || snap.invitePreview)) {
      const seen = new Set();
      const add = (n, label) => { if (!n || seen.has(n)) return ''; seen.add(n); return card(n, label); };
      (QI.invites || []).forEach(n => { cards += add(n, 'Прямое приглашение'); });
      (QI.qualified || []).forEach(n => { cards += add(n, qWin[n] ? `Квалифицирована · ${qWin[n].name.split(' — ').pop()}` : 'Победитель квалификации'); });
      (QI.atLarge || []).forEach(n => { cards += add(n, 'Дополнительный слот · рейтинг'); });
      // Если квалификации ещё не завершены, показываем именно оставшиеся места, а не случайные команды.
      const targetSize = Number(snap.size || (ST().seasonSchedule?.[stepI]?.size) || 16);
      const pending = Math.max(0, targetSize - seen.size);
      const pendingQuals = (QI.quals || []).filter(q => q.stage === 'closed');
      let placeholders = 0;
      pendingQuals.forEach(q => {
        const missing = Math.max(0, Number(q.slots||0) - (q.winners||[]).length);
        for(let k=0;k<missing && placeholders<pending;k++,placeholders++) {
          cards += `<button type="button" class="ev-tc q" data-event="${esc(q.id)}"><b>${q.status === 'live' ? 'Место разыгрывается' : 'Место квалификации'}</b><span class="ev-tc-logo"><span class="ev-q">?</span></span><small>${esc(q.name.split(' — ').pop())}</small></button>`;
        }
      });
      while(placeholders<pending){ placeholders++; cards += `<div class="ev-tc q"><b>Квалификационное место</b><span class="ev-tc-logo"><span class="ev-q">?</span></span><small>Победитель ещё не определён</small></div>`; }
      const qCount = (QI.qualified || []).length, inviteCount = (QI.invites || []).length;
      note = `<p class="hs-note">${QI.frozen ? 'Список прямых приглашений зафиксирован.' : 'Прямые приглашения — предварительные по текущему рейтингу.'} Приглашены: ${inviteCount} · прошли квалификации: ${qCount} · ожидают определения: ${placeholders}. ${(QI.quals||[]).length ? 'Квалификации: ' + QI.quals.map(q=>`<button type="button" class="hs-link" data-event="${esc(q.id)}">${esc(q.name.split(' — ').pop())}</button>`).join(' · ') : 'Победители квалификаций появятся по мере завершения отборочных турниров.'}</p>`;
    } else {
      const list = (names.length ? names : Object.keys(snap.rost || {})).slice().sort((a, b) => (plc[a] || 99) - (plc[b] || 99) || (rank[a] || 99) - (rank[b] || 99));
      cards = list.map(n => card(n, qWin[n] ? `Квалифицирована · ${qWin[n].name.split(' — ').pop()}` : inviteSet.has(n) ? 'Прямое приглашение' : qualifiedSet.has(n) ? 'Победитель квалификации' : atLargeSet.has(n) ? 'Дополнительный слот' : sub(n))).join('');
    }
    body = cards ? `<div class="ev-tcs">${cards}</div>${note}` : empty('Участники ещё не определены');
  } else if (tab === 'stats') {
    const rows = Object.values(st.P).map(o => ({ o, e: o.byEv[snap.id] })).filter(x => x.e).map(x => ({ ...x, l: H.line(x.e.s) })).sort((a, b) => b.l.rating - a.l.rating);
    const tr = Object.values(st.T).length ? '' : '';
    body = rows.length ? box('Игроки турнира', `<table class="hs-tbl hs-stbl"><thead><tr><th>#</th><th class="l">Игрок</th><th class="l">Команда</th><th>Карт</th><th>K–D</th><th>+/−</th><th>ADR</th><th>KAST</th><th>Rating 3.0</th></tr></thead><tbody>${rows.map((x, i) => `<tr data-player="${esc(x.o.nick)}"><td class="n">${i + 1}</td><td class="l">${pFlag(x.o.p)} <b>${esc(x.o.nick)}</b></td><td class="l">${logo(x.e.team, 'xs')} ${esc(x.e.team)}</td><td>${x.l.maps}</td><td>${x.l.k}–${x.l.d}</td><td class="${x.l.diff >= 0 ? 'up' : 'dn'}">${x.l.diff > 0 ? '+' : ''}${x.l.diff}</td><td>${f1(x.l.adr)}</td><td>${f1(x.l.kast)}%</td><td><b class="${ratingCls(x.l.rating)}">${f2(x.l.rating)}</b></td></tr>`).join('')}</tbody></table>`, '', 'flush')
      + `<p class="hs-note">Rating 3.0 — внутренний рейтинг игры (см. «Статистика»). Учтены только сыгранные карты со счётом.</p>` : empty('Статистика появится после первых сыгранных карт.');
  } else if (tab === 'prize') {
    const pr = prizeRows(snap), byPlace = {}; (snap.results || []).forEach(r => (byPlace[r.p] = byPlace[r.p] || []).push(r.n));
    const rows = pr.rows.map(r => { const teamsAt = []; for (let p = r.a; p <= r.b; p++) (byPlace[p] || []).forEach(n => teamsAt.push(n));
      return `<tr><td class="l"><b>${r.a === r.b ? r.a : r.a + '–' + r.b}</b></td><td>${money(r.each / Math.max(1, (r.a === 5 ? 4 : r.a === 9 ? 8 : 1)))}</td><td class="l">${teamsAt.map(n => `<button type="button" data-team="${esc(n)}">${logo(n, 'xs')} ${esc(n)}</button>`).join(' ') || '<span class="hs-dim">—</span>'}</td></tr>`; }).join('');
    body = box(`Призовой фонд ${money(pr.total)}`, `<table class="hs-tbl"><thead><tr><th class="l">Место</th><th>Приз команде</th><th class="l">Команды</th></tr></thead><tbody>${rows}</tbody></table>`, '', 'flush')
      + '<p class="hs-note">Фонд задаётся уровнем турнира в игре; доли по местам — стандартная сетка распределения портала.</p>';
  } else if (tab === 'results') {
    body = box('Итоговые места', resultsTable(snap), '', 'flush');
  }
  return eventHead(snap, ev) + tabs + `<div class="hs-ptab-body" data-pg-anchor>${body}</div>`;
}
function resultsTable(snap, limit) {
  const rows = (snap.results || []).slice(0, limit || 99);
  return `<table class="hs-tbl"><thead><tr><th>Место</th><th class="l">Команда</th><th class="l">Этап</th><th>Очки</th></tr></thead><tbody>${rows.map(r => `<tr data-team="${esc(r.n)}"><td class="n">${r.p === 1 ? '<b class="hs-gold">1</b>' : r.p || '—'}</td><td class="l">${logo(r.n, 'sm')}<b>${esc(r.n)}</b></td><td class="l hs-dim">${esc(r.t || '')}</td><td class="${r.d > 0 ? 'up' : r.d < 0 ? 'dn' : ''}">${r.d ? (r.d > 0 ? '+' : '') + Math.round(r.d) : '—'}</td></tr>`).join('')}</tbody></table>`;
}
// Счёт идущего матча относительно m.a: серия (или раунды карты в BO1) и счёт текущей карты.
function liveSc(m) {
  if (!m || !m.a || !m.b || m.w) return null;
  const it = liveItem(m.a, m.b), st = it?.state; if (!st) return null;   // во время вето — счёт серии 0:0 и пометка «вето»
  const f = it.match.t1 === m.a, bo1 = st.mode === 'BO1';
  const ma = f ? st.map1 : st.map2, mb = f ? st.map2 : st.map1, sa = f ? st.series1 : st.series2, sb = f ? st.series2 : st.series1;
  const draft = st.phase === 'map-draft';
  return { a: (bo1 ? ma : sa) || 0, b: (bo1 ? mb : sb) || 0, ma: ma || 0, mb: mb || 0, bo1: bo1 && !draft, map: draft ? 'вето' : (st.maps?.[st.mapIndex] || '') };
}
H.liveSc = liveSc;
// Плановое время матча текущего турнира: из очереди эфира (игровое время слота); если пара известна,
// но ещё не в очереди — оценка по следующему свободному слоту (с пометкой «~»).
function matchBelongsToCurrentTournament(m) {
  const ct = CT(); if (!ct || ct.completed || !m?.a || !m?.b) return false;
  const names = new Set((ct.participants || []).map(x => typeof x === 'string' ? x : x?.name).filter(Boolean));
  if (names.size && names.has(m.a) && names.has(m.b)) return true;
  // Fallback for older saves where participants were not copied to the tournament root.
  return (ct.matches || []).some(x => x && ((x.t1 === m.a && x.t2 === m.b) || (x.t1 === m.b && x.t2 === m.a)));
}
function plannedAt(m) {
  if (!m || !m.a || !m.b || m.w) return null;
  const ct = CT(), br = ct?.broadcast;
  const it = (br?.queue || []).find(i => i?.match && ((i.match.t1 === m.a && i.match.t2 === m.b) || (i.match.t1 === m.b && i.match.t2 === m.a)));
  // `time` is the canonical v42 slot. Prefer it to aliases left by older
  // scheduler versions; all current reflows synchronize the other fields too.
  const t = Number(it?.time || it?.v18PlannedTime || it?.gameScheduledAt);
  const delayedByMs = Math.max(0, Number(it?.delayedByMs) || 0, Number(it?.v19ShiftedByMs) || 0, Number(it?.v18ShiftedByMs) || 0);
  const now = H.nowMs ? H.nowMs() : Date.now();
  // Boolean legacy flags alone are not proof of a real delay. A skipped game
  // day can leave those flags in old saves; require the scheduler's measured shift.
  const delayed = delayedByMs >= 5 * 60000 && t > 0 && t < now - 5 * 60000 && it?.status !== 'done';
  if (t && (t >= now - 5 * 60000 || delayed)) return { ms: t, est: false, delayedByMs, delayed };
  if (t && t < now - 5 * 60000) return null;
  if (!matchBelongsToCurrentTournament(m)) return null;
  try { if (window.v18Forecast) { const F = window.v18Forecast(); for (const [mm, ms] of F) if ((mm.t1 === m.a && mm.t2 === m.b) || (mm.t1 === m.b && mm.t2 === m.a)) return { ms, est: true }; } } catch (e) {} // прогноз по правилам дня
  const cur = Number(br?.v18ScheduleCursor || br?.scheduleCursorGame || ct.calendar?.autoBroadcastAt) || 0;
  return cur ? { ms: Math.max(cur, H.nowMs ? H.nowMs() : cur), est: true } : null;
}
function matchPlannedTime(m) {
  const current = matchBelongsToCurrentTournament(m);
  // Main Tier-1 games use the live broadcast queue; parallel events use their
  // own bracket slots but share the same virtual clock and processing contract.
  if (current) return plannedAt(m);
  if (m?.at) {
    const now=H.nowMs?H.nowMs():Date.now();
    const due=Number(m.resolveAt)||window.CS2ParallelMatchTiming?.dueAt(m)||0;
    if(Number(m.at)<now-5*60000){
      return {ms:due||Number(m.at),est:false,processing:now<(due||0),overdue:!!due&&now>=due};
    }
    return {ms:Number(m.at),est:false};
  }
  return plannedAt(m);
}
function whenTxt(ms, est, delayed) {
  const now = H.nowMs ? H.nowMs() : Date.now(), d = new Date(ms), n = new Date(now);
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(), diff = Math.round((day(d) - day(n)) / 864e5);
  const hm = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const lbl = diff === 0 ? `сегодня, ${hm}` : diff === 1 ? `завтра, ${hm}` : `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${hm}`;
  if (ms < now - 5 * 60000) return delayed ? `задерживается · план ${lbl}` : 'время уточняется';
  return (est ? '~ ' : '') + lbl;
}
H.plannedAt = plannedAt; H.whenTxt = whenTxt; H.swissGrid = (r, t) => swissGrid(r, t);
function bmatchRow(m) { // строка матча из снимка (сетка → список)
  const it0 = m.a && m.b && !m.w ? liveItem(m.a, m.b) : null, live = !!it0 || (!!m.lv && !!CT()?.broadcast?.running), ls = it0 ? liveSc(m) : null;
  const sa = m.w ? sc(m, 'a') : '', sb = m.w ? sc(m, 'b') : '';
  const pa = !live && !m.w ? matchPlannedTime(m) : null;
  const right = live ? '<span class="hs-live">LIVE</span>' : m.w ? '' : pa?.processing ? `<span class="hs-dim mrow-when">Симуляция матча · результат к ${esc(whenTxt(pa.ms,false))}</span>` : pa?.overdue ? '<span class="hs-dim mrow-when">Матч ожидает обработки</span>' : pa ? `<span class="hs-dim mrow-when">${esc(whenTxt(pa.ms, pa.est, pa.delayed))}</span>` : `<span class="hs-dim">${m.a && m.b ? 'время уточняется' : 'ждёт соперника'}</span>`;
  const stage = (m.__stage || '').split(' · ').slice(-1)[0];
  return `<button type="button" class="mrow${live ? ' live' : ''}"${m.a && m.b ? ` data-match="${esc(m.__id)}"` : ''}>
    <span class="mrow-t a ${m.w ? (m.w === m.a ? 'w' : 'l') : ''}">${esc(m.a || 'TBD')}${m.a ? logo(m.a, 'sm') : ''}</span>
    <span class="mrow-s">${m.w ? `<b class="${m.w === m.a ? 'w' : 'l'}">${sa}</b><i>:</i><b class="${m.w === m.b ? 'w' : 'l'}">${sb}</b>` : ls ? `<b class="lv">${ls.a}</b><i>:</i><b class="lv">${ls.b}</b>${ls.bo1 ? '' : `<small class="mrow-ls">${esc(ls.map)} ${ls.ma}:${ls.mb}</small>`}` : '<i>vs</i>'}</span>
    <span class="mrow-t b ${m.w ? (m.w === m.b ? 'w' : 'l') : ''}">${m.b ? logo(m.b, 'sm') : ''}${esc(m.b || 'TBD')}</span>
    <span class="mrow-e">${esc(stage)}</span><span class="mrow-x">${right}</span></button>`;
}
H.bmatchRow = bmatchRow;
H.CLICKS.push(['[data-etab2]', el => { H.S.etab = el.dataset.etab2; H.render(); }]);

/* ------------------------------------------------------------ «Турниры» */
const TIERF = [['all', 'Все'], ['major', 'Major'], ['elite', 'S-Tier'], ['regular', 'Tier-1'], ['tier2', 'Tier-2'], ['tier3', 'Tier-3'], ['academy', 'Академии'], ['qual', 'Квалификации']];
H.S.ev = { tab: 'live', tier: 'all', page: 1, q: '' };
H.S.tmm = H.S.tmm || { page: 1 };
function evRow(e) {
  const mt = meta(e.name);
  return `<tr data-event="${esc(e.id)}" class="${e.status}"><td class="l nowrap">${e.startMs > 0 ? fdate(e.startMs) + ' – ' + fdate(e.endMs) : 'сезон ' + e.season}</td>
    <td class="l"><span class="hs-ev-tr sm">${trophy(e.name, e.season, e.kind)}</span><b>${esc(e.name)}</b>${e.status === 'live' ? ' <span class="hs-live">LIVE</span>' : ''}</td>
    <td class="l"><span class="hs-kind k-${e.kind}">${KIND[e.kind] || ''}</span></td><td class="l hs-dim">${esc(mt?.city || '')}</td><td class="l hs-dim">${esc((FMT[e.format] || e.format || '').replace(' + плей-офф', '+PO'))}</td><td>${e.size || ''}</td>
    <td class="l">${e.champion ? `${logo(e.champion, 'xs')} ${esc(e.champion)}` : '<span class="hs-dim">—</span>'}</td></tr>`;
}
function pager(key, page, pages, total) {
  if (pages <= 1) return '';
  const btn = (p, l, on, dis) => `<button type="button" data-pg="${key}|${p}"${on ? ' class="on"' : ''}${dis ? ' disabled' : ''}>${l}</button>`;
  const nums = []; for (let p = Math.max(1, page - 3); p <= Math.min(pages, page + 3); p++) nums.push(btn(p, p, p === page));
  return `<div class="pt-pager">${btn(page - 1, '‹', false, page <= 1)}${page > 4 ? btn(1, 1) + '<span class="gap">…</span>' : ''}${nums.join('')}${page < pages - 3 ? '<span class="gap">…</span>' + btn(pages, pages) : ''}${btn(page + 1, '›', false, page >= pages)}<span>${total} всего</span></div>`;
}
H.pager = pager;
function paginate(list, key, per) { let o = H.S; (String(key || '').split('.').filter(Boolean)).forEach(k => { if (!o[k] || typeof o[k] !== 'object') o[k] = { page: 1 }; o = o[k]; }); if (!Number.isFinite(+o.page)) o.page = 1; const pages = Math.max(1, Math.ceil((list || []).length / Math.max(1, per || 1))); o.page = Math.min(Math.max(1, +o.page || 1), pages); return { rows: (list || []).slice((o.page - 1) * per, o.page * per), html: pager(key, o.page, pages, (list || []).length) }; }
H.paginate = paginate;
H.PAGES.events = () => {
  const f = H.S.ev, now = H.nowMs(), all = events();
  const tabs = [['live', 'Идут и скоро'], ['done', 'Завершённые'], ['archive', 'Архив сезонов'], ['calendar', 'Календарь']].map(([k, l]) => `<button type="button" class="hs-chip${f.tab === k ? ' on' : ''}" data-evtab="${k}">${l}</button>`).join('');
  const tiers = TIERF.map(([k, l]) => `<button type="button" class="hs-chip${f.tier === k ? ' on' : ''}" data-evtier="${k}">${l}</button>`).join('');
  if (f.tab === 'calendar') return H.PAGES.calendar();
  let list = all.filter(e => f.tier === 'all' || e.kind === f.tier);
  const cur = ST().currentSeason;
  if (f.tab === 'live') list = list.filter(e => e.status === 'live' || (e.status === 'scheduled' && e.season === cur)).sort((a, b) => (a.status === 'live' ? -1 : 0) - (b.status === 'live' ? -1 : 0) || a.startMs - b.startMs);
  else if (f.tab === 'done') list = list.filter(e => e.status === 'done' && e.season === cur).sort((a, b) => b.endMs - a.endMs);
  else list = list.filter(e => e.status === 'done' && e.season !== cur).sort((a, b) => b.season - a.season || b.endMs - a.endMs);
  const live = all.filter(e => e.status === 'live');
  const feature = f.tab === 'live' && live.length ? `<div class="ev-live">${live.slice(0, 4).map(e => `<button type="button" class="ev-livecard" data-event="${esc(e.id)}"><span class="ev-livecard-tr">${trophy(e.name, e.season, e.kind)}</span><span><span class="hs-live">LIVE</span> <span class="hs-kind k-${e.kind}">${KIND[e.kind]}</span><b>${esc(e.name)}</b><small>${fdate(e.startMs)} – ${fdate(e.endMs)} · ${e.size} команд</small></span></button>`).join('')}</div>` : '';
  const pg = paginate(list, 'ev', 40);
  return `<div class="hs-head"><h1>Турниры</h1><div class="hs-filters">${tabs}</div></div>${feature}<div class="hs-filters" style="margin-bottom:12px">${tiers}</div>
    ${box(f.tab === 'live' ? 'Расписание сезона' : f.tab === 'done' ? `Завершённые · сезон ${cur}` : 'Прошлые сезоны', list.length ? `<table class="hs-tbl hs-stbl"><thead><tr><th class="l">Даты</th><th class="l">Турнир</th><th class="l">Уровень</th><th class="l">Место</th><th class="l">Формат</th><th>Команд</th><th class="l">Победитель</th></tr></thead><tbody>${pg.rows.map(evRow).join('')}</tbody></table>${pg.html}` : empty('Нет турниров по этому фильтру'), '', 'flush')}`;
};
H.CLICKS.push(['[data-evtab]', el => { H.S.ev.tab = el.dataset.evtab; H.S.ev.page = 1; if (el.dataset.evtab === 'calendar') return H.nav('calendar'); H.render(); }]);
H.CLICKS.push(['[data-evtier]', el => { H.S.ev.tier = el.dataset.evtier; H.S.ev.page = 1; H.render(); }]);

/* ------------------------------------------------------------ календарь-таймлайн */
H.S.cal = { month: null };
const MN = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
H.PAGES.calendar = () => {
  const cur = ST().currentSeason, now = H.nowMs(), all = events().filter(e => e.season === cur && e.startMs);
  const year = H.yearOf(cur), nowD = new Date(now);
  let mon = H.S.cal.month; if (mon == null) mon = nowD.getFullYear() === year ? nowD.getMonth() : 0;
  const from = new Date(year, mon, 1).getTime(), to = new Date(year, mon + 1, 1).getTime(), days = Math.round((to - from) / DAY);
  const calEvents = all.flatMap(e => {
    if (e.kind !== 'major') return [e];
    const span = Math.max(8 * DAY, (Number(e.endMs) || e.startMs + 7 * DAY) - e.startMs);
    const part = span / 4;
    return [
      { ...e, calTitle: `Pick'Em · ${e.name}`, calTag: "PICK'EM", calType: 'pickem', startMs: e.startMs - (window.CS2_PICKEM_LEAD_DAYS || 4) * DAY, endMs: e.startMs },
      { ...e, calTitle: `${e.name} · Stage I`, calTag: 'STAGE I', calType: 'stage', startMs: e.startMs, endMs: e.startMs + part },
      { ...e, calTitle: `${e.name} · Stage II`, calTag: 'STAGE II', calType: 'stage', startMs: e.startMs + part, endMs: e.startMs + part * 2 },
      { ...e, calTitle: `${e.name} · Stage III`, calTag: 'STAGE III', calType: 'stage', startMs: e.startMs + part * 2, endMs: e.startMs + part * 3 },
      { ...e, calTitle: `${e.name} · Champions Stage`, calTag: 'CHAMPIONS', calType: 'stage', startMs: e.startMs + part * 3, endMs: e.startMs + part * 4 }
    ];
  });
  // v84: HLTV Awards в календаре — обратный отсчёт топ-20 (с 20 декабря) и церемония в начале января.
  try {
    const A = window.CS2Awards, rec = ST().v84Awards || {};
    [year - 1, year].forEach(y => {
      const saved = rec[y], d = saved ? { reveal: saved.revealAt, ceremony: saved.ceremonyAt } : A?.ceremonyDates?.(y, new Date(y, 11, 13).getTime());
      if (!d) return;
      const base = { id: `awards-${y}`, kind: 'major', tier: '1', status: saved?.done ? 'done' : 'scheduled', season: cur };
      calEvents.push({ ...base, calTitle: `HLTV Awards ${y}: топ-20 игроков года`, calTag: 'TOP-20', calType: 'awards', startMs: d.reveal, endMs: d.ceremony });
      calEvents.push({ ...base, calTitle: `HLTV Awards ${y} — церемония: топ-3, игрок года, команда и тренер года`, calTag: 'AWARDS', calType: 'awards', startMs: d.ceremony - DAY / 2, endMs: d.ceremony + DAY / 2 });
    });
  } catch (err) {}
  const inMon = calEvents.filter(e => e.endMs > from && e.startMs < to).sort((a, b) => (a.tier === '1' ? 0 : 1) - (b.tier === '1' ? 0 : 1) || a.startMs - b.startMs);
  const pct = ms => Math.max(0, Math.min(100, (ms - from) / (to - from) * 100));
  const ticks = Array.from({ length: days }, (_, i) => { const d = new Date(year, mon, i + 1); return `<span class="${d.getDay() === 0 || d.getDay() === 6 ? 'we' : ''}${new Date(now).toDateString() === d.toDateString() ? ' today' : ''}">${i + 1}</span>`; }).join('');
  const rows = inMon.map(e => `<div class="cal-row${e.calType ? ' cal-major-' + e.calType : ''}" ${e.calType === 'pickem' ? 'data-nav="pickem"' : e.calType === 'awards' ? 'data-nav="awards"' : `data-event="${esc(e.id)}"`}><div class="cal-n"><span class="hs-kind k-${e.kind}">${esc(e.calTag || KIND[e.kind] || '')}</span><b>${esc(e.calTitle || e.name)}</b></div>
    <div class="cal-track"><i class="cal-bar k-${e.kind} ${e.status}${e.calType ? ' ' + e.calType : ''}" style="left:${pct(e.startMs).toFixed(2)}%;width:${Math.max(1.2, pct(e.endMs) - pct(e.startMs)).toFixed(2)}%" title="${esc(fdate(e.startMs) + ' – ' + fdate(e.endMs))}">${e.calType === 'pickem' ? 'Открыть прогнозы' : (e.champion ? esc(e.champion) : '')}</i></div></div>`).join('');
  const nowLine = now >= from && now < to ? `<i class="cal-now" style="left:${pct(now).toFixed(2)}%"></i>` : '';
  const months = MN.map((m, i) => { const n = calEvents.filter(e => e.endMs > new Date(year, i, 1).getTime() && e.startMs < new Date(year, i + 1, 1).getTime()).length; return `<button type="button" class="hs-chip${i === mon ? ' on' : ''}" data-calmon="${i}">${m.slice(0, 3)} <small>${n}</small></button>`; }).join('');
  const t1 = all.filter(e => e.tier === '1').length, t2 = all.filter(e => e.kind === 'tier2').length, t3 = all.filter(e => e.kind === 'tier3').length, ac = all.filter(e => e.kind === 'academy').length;
  return `<div class="hs-head"><h1>Календарь сезона ${cur} · ${year}</h1><div class="hs-filters"><span class="hs-sub">Tier-1: ${t1} · Tier-2: ${t2} · Tier-3: ${t3} · академии: ${ac}</span></div></div>
    <div class="hs-filters cal-months">${months}</div>
    <section class="hs-box cal"><header class="hs-box-h"><h3>${MN[mon]} ${year}</h3><span class="hs-sub">${inMon.length} событий</span></header>
      <div class="cal-grid"><div class="cal-head"><div class="cal-n"></div><div class="cal-days" style="--d:${days}">${ticks}</div></div>
      <div class="cal-body">${rows || empty('В этом месяце турниров нет')}<div class="cal-nowwrap">${nowLine}</div></div></div></section>`;
};
H.CLICKS.push(['[data-calmon]', el => { H.S.cal.month = +el.dataset.calmon; H.render(); }]);

/* ------------------------------------------------------------ «Матчи» */
H.S.mt = { view: 'live', tier: 'all', q: '', bo: 'all', season: 'all', page: 1 };
const tierOk = (k, f) => f === 'all' || (f === 't1' ? ['major', 'elite', 'regular'].includes(k) : f === 'low' ? ['tier2', 'tier3', 'academy'].includes(k) : k === f);
const boOf = m => m.bo || (m.mp?.length === 1 ? 1 : m.s ? Math.max(...m.s) * 2 - 1 : 3);
H.PAGES.matches = () => {
  const f = H.S.mt, q = f.q.trim().toLowerCase();
  const views = [['live', 'Live и ближайшие'], ['results', 'Результаты']].map(([k, l]) => `<button type="button" class="hs-chip${f.view === k ? ' on' : ''}" data-mtview="${k}">${l}</button>`).join('');
  const tiers = [['all', 'Все'], ['major', 'Major'], ['t1', 'Tier-1+'], ['low', 'Tier-2/3, академии']].map(([k, l]) => `<option value="${k}"${f.tier === k ? ' selected' : ''}>${l}</option>`).join('');
  const bos = [['all', 'Любой формат'], ['1', 'BO1'], ['3', 'BO3'], ['5', 'BO5']].map(([k, l]) => `<option value="${k}"${f.bo === k ? ' selected' : ''}>${l}</option>`).join('');
  const all = H.stats().ms, seasons = [...new Set(all.map(m => m.season))].sort((a, b) => b - a);
  const filters = `<div class="hs-filters mt-f"><input type="search" class="hs-inp" id="pt-mq" placeholder="Команда или турнир" value="${esc(f.q)}"><select class="hs-inp sm" data-mtf="tier">${tiers}</select><select class="hs-inp sm" data-mtf="bo">${bos}</select>
    ${f.view === 'results' ? `<select class="hs-inp sm" data-mtf="season"><option value="all">Все сезоны</option>${seasons.map(s => `<option value="${s}"${String(f.season) === String(s) ? ' selected' : ''}>Сезон ${s}</option>`).join('')}</select>` : ''}</div>`;
  let body;
  if (f.view === 'live') {
    let lm = liveMatches().filter(x => tierOk(x.snap.prestige, f.tier) && (f.bo === 'all' || String(boOf(x.m)) === f.bo));
    if (q) lm = lm.filter(x => (x.m.a + ' ' + x.m.b + ' ' + x.snap.name).toLowerCase().includes(q));
    lm.sort((a, b) => (b.live - a.live) || ((a.at || 0) - (b.at || 0)));
    const groups = []; let cur = null; lm.forEach(x => { if (!cur || cur.id !== x.snap.id) { cur = { id: x.snap.id, snap: x.snap, list: [] }; groups.push(cur); } cur.list.push(x.m); });
    body = groups.map(g => box(`<span class="hs-ev-tr sm">${trophy(g.snap.name, g.snap.season, g.snap.prestige)}</span>${esc(g.snap.name)} <span class="hs-kind k-${g.snap.prestige}">${KIND[g.snap.prestige]}</span>`, g.list.map(bmatchRow).join(''), `<button type="button" class="hs-more" data-event="${esc(g.snap.live && g.snap.tier === '1' ? 'cur' : g.snap.id)}">турнир →</button>`, 'flush')).join('')
      || empty('Сейчас нет идущих матчей. Запустите время в шапке: эфир начнётся по календарю.');
  } else {
    let ms = all.filter(m => tierOk(m.kind, f.tier) && (f.bo === 'all' || String(boOf(m)) === f.bo) && (f.season === 'all' || String(m.season) === String(f.season)));
    if (q) ms = ms.filter(m => (m.a + ' ' + m.b + ' ' + m.ev).toLowerCase().includes(q));
    const pg = paginate(ms, 'mt', 50);
    const groups = []; let cur = null; pg.rows.forEach(m => { if (!cur || cur.id !== m.evId) { cur = { id: m.evId, m, list: [] }; groups.push(cur); } cur.list.push(m); });
    body = (groups.map(g => `<div class="hs-mgroup"><div class="hs-mgroup-h"><span class="hs-ev-tr sm">${trophy(g.m.ev, g.m.season, g.m.kind)}</span><b>${esc(g.m.ev)}</b><span class="hs-kind k-${g.m.kind}">${KIND[g.m.kind]}</span><button type="button" class="hs-more" data-event="${esc(g.id)}">турнир →</button></div>${g.list.map(m => H.matchRow(m)).join('')}</div>`).join('') || empty('Нет матчей по этому фильтру')) + pg.html;
  }
  return `<div class="hs-head"><h1>Матчи</h1><div class="hs-filters">${views}</div></div>${filters}<div data-pg-anchor>${body}</div>`;
};
H.CLICKS.push(['[data-mtview]', el => { H.S.mt.view = el.dataset.mtview; H.S.mt.page = 1; H.render(); }]);
document.addEventListener('change', e => { const el = e.target.closest?.('#hs-root [data-mtf]'); if (!el) return; H.S.mt[el.dataset.mtf] = el.value; H.S.mt.page = 1; H.render(); });
let mqT = null;
document.addEventListener('input', e => { if (e.target.id !== 'pt-mq') return; clearTimeout(mqT); const v = e.target.value; mqT = setTimeout(() => { H.S.mt.q = v; H.S.mt.page = 1; H.render(); const i = document.getElementById('pt-mq'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 250); });

/* ------------------------------------------------------------ Match Center */
const origMatch = H.PAGES.match;
function teamHead(n, side) { const t = H.teamBy(n), rk = t ? H.ranked().indexOf(t) + 1 : 0; return `<button type="button" class="hs-mteam" data-team="${esc(n)}">${logo(n, 'xl')}<b>${esc(n)}</b><small>${rk ? '#' + rk + ' в рейтинге' : ''}</small></button>`; }
function matchCenter(id) {
  const st = H.stats(), done = st.ms.find(x => x.id === id);
  const fm = findMatch(id);
  if (done && (done.w)) {
    let html = origMatch(id);
    const news = H.feed().filter(n => n.match === id || (n.ev === done.evId && n.team && [done.a, done.b].includes(n.team) && n.cat === 'match')).slice(0, 4);
    html = html.replace(/data-event="([^"]*)">сетка турнира →/, 'data-event="$1">страница турнира →');
    if (news.length) html += box('Материалы о матче', news.map(n => `<button type="button" class="ev-news" data-art="${esc(n.id)}"><b>${esc(n.title)}</b><small>${H.ndate(n.ts)}</small></button>`).join(''), '', 'flush');
    return html;
  }
  if (!fm) return H.back() + empty('Матч не найден.');
  const { snap, m } = fm, it = liveItem(m.a, m.b), lst = it?.state;
  let odds = null; try { odds = calcMatchOdds(m.a, m.b, (m.bo || 3) === 1); } catch (e) {}
  const prev = st.ms.filter(x => (x.a === m.a && x.b === m.b) || (x.a === m.b && x.b === m.a));
  const sign = lst && it.match.t1 === m.a ? 1 : -1;
  const s1 = lst ? (sign === 1 ? lst.series1 : lst.series2) : '–', s2 = lst ? (sign === 1 ? lst.series2 : lst.series1) : '–';
  const head = `${H.back()}<div class="hs-mhead">${teamHead(m.a)}<div class="hs-mscore"><div class="hs-mev"><button type="button" data-event="${esc(snap.live && snap.tier === '1' ? 'cur' : snap.id)}">${esc(snap.name)}</button></div>
    <div class="hs-msc">${lst ? `<b>${s1}</b><i>:</i><b>${s2}</b>` : '<i class="vs">vs</i>'}</div><div class="hs-mstage">${esc(m.__stage)} · BO${m.bo || (lst?.mode === 'BO1' ? 1 : lst?.mode === 'BO5' ? 5 : 3)}</div>
    <div>${lst ? '<span class="hs-live">LIVE</span>' : (() => { const pa = matchPlannedTime(m); return pa?.processing ? `<span class="hs-dim">Симуляция матча · результат к ${esc(whenTxt(pa.ms,false))}</span>` : pa?.overdue ? '<span class="hs-dim">Матч ожидает обработки</span>' : pa ? `<span class="hs-dim">Начало: ${esc(whenTxt(pa.ms, pa.est, pa.delayed))}</span>` : '<span class="hs-dim">Время уточняется</span>'; })()}</div></div>${teamHead(m.b)}</div>`;
  let liveHtml = '';
  if (lst) {
    const maps = (lst.maps || []).map((mp, i) => { const r = (lst.mapResults || []).find(x => x.map === mp), curMap = i === lst.mapIndex && !r;
      const a = r ? (r.t1 === m.a ? r.t1Score : r.t2Score) : curMap ? (sign === 1 ? lst.map1 : lst.map2) : '', b = r ? (r.t1 === m.a ? r.t2Score : r.t1Score) : curMap ? (sign === 1 ? lst.map2 : lst.map1) : '';
      return `<div class="hs-mapcard${curMap ? ' on' : ''}${r ? (r.winner === m.a ? ' wa' : ' wb') : ''}"><span class="hs-mapname">${esc(mp)}</span><span class="hs-mapsc">${r || curMap ? `<b>${a}</b> : <b>${b}</b>` : '<span class="hs-dim">—</span>'}</span>${curMap ? '<small>идёт</small>' : ''}</div>`; }).join('');
    const rw = (lst.mapRoundWinners || []).map((w, i) => `<i class="${(w === 1) === (sign === 1) ? 'a' : 'b'}" title="Раунд ${i + 1}"></i>`).join('');
    const strip = s => { const d = document.createElement('div'); d.innerHTML = s; return d.textContent; };
    const feed = (lst.events || []).slice(0, 14).map(e => `<li>${esc(strip(e.html || ''))}</li>`).join('');
    liveHtml = `<div class="hs-maps">${maps}</div>${box('Ход карты', `<div class="mc-rounds">${rw || '<span class="hs-dim">Раунды ещё не сыграны</span>'}</div><div class="mc-leg"><span><i class="a"></i>${esc(m.a)}</span><span><i class="b"></i>${esc(m.b)}</span><span class="hs-dim">${esc(strip(lst.phaseText || ''))}</span></div>`)}
      <div class="hs-grid2"><div class="hs-col">${box('Лента эфира', feed ? `<ul class="mc-feed">${feed}</ul>` : empty('События появятся с первым раундом'))}</div>
      <div class="hs-col">${box('Эфир', `<p class="hs-note">Табло, экономика команд, хайлайты и график карты — в режиме зрителя.</p><button type="button" class="hs-btn" data-watch="${esc(it.id)}">Режим зрителя</button>`)}
      ${(lst.vetoLog || []).length ? box('Пики и баны', `<ol class="mc-veto">${lst.vetoLog.map(v => `<li class="${v.type || ''}">${esc(strip(v.text || ''))}</li>`).join('')}</ol>`) : ''}</div></div>`;
  }
  const roster = n => { const t = H.teamBy(n); return (t?.players || []).slice(0, 5).map(p => `<button type="button" class="mc-p" data-player="${esc(p.nick)}">${pFlag(p)} <b>${esc(p.nick)}</b><small>${esc(p.role || '')}</small></button>`).join(''); };
  const pre = `<div class="hs-grid2"><div class="hs-col">${box('Составы', `<div class="mc-ros"><div>${roster(m.a)}</div><div>${roster(m.b)}</div></div>`)}
    ${box('Личные встречи', prev.length ? prev.slice(0, 6).map(x => H.matchRow(x)).join('') : empty('Раньше не встречались'), '', 'flush')}</div>
    <div class="hs-col">${odds ? box('Шансы', `<div class="mc-odds"><div style="--p:${odds.pct1}%"><i></i></div><div class="mc-odds-l"><span>${esc(m.a)} <b>${odds.pct1}%</b> · ${odds.c1}x</span><span>${odds.c2}x · <b>${odds.pct2}%</b> ${esc(m.b)}</span></div></div><p class="hs-note">Оценка движка игры: рейтинг, уровень игроков, форма и усталость.</p>`) : ''}
    ${!lst ? box('Ваш прогноз', `<p class="hs-note">Прогнозы принимаются до начала матча на странице «Прогнозы».</p><button type="button" class="hs-btn ghost" data-nav="predict">К прогнозам</button>`) : ''}</div></div>`;
  return head + liveHtml + pre;
}
H.PAGES.match = matchCenter;
H.CLICKS.push(['[data-watch]', el => { if (H.spectator) H.spectator.focus(el.dataset.watch); else H.nav('watch'); }]);

H.PAGES.event = eventPage;
console.info('[v30] турниры портала: события, сетки, Match Center');
})();
