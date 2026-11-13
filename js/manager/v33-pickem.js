/* v33 — Pick'Em на Major (#/pickem): этапы Stage I–III и плей-офф.
   Слева — команды этапа, в центре — реальная швейцарская сетка этапа, справа — ячейки прогноза:
   3:0 (2 команды), 3:1/3:2 — выход (6), 0:3 (2); в плей-офф — победители ¼ (4), ½ (2) и чемпион.
   Stage I открывается в день фиксации состава (за сутки до Major); Stage II/III и плей-офф —
   после формирования участников соответствующего этапа и до первого результата. Хранятся в currentPickem.major (по нему считает
   очки движок) и в seasonState.v33Pickem — чтобы пережить перезагрузку. */
(function () {
'use strict';
const H = window.HS; if (!H) return;
const { esc, logo, box, empty } = H;
const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);
const SS = () => (typeof seasonState !== 'undefined' ? seasonState : null);
function gameNow() { const s=SS()||{}; return Number(s.calendar?.currentMs)||Date.now(); }
function upcomingMajor() {
  const s = SS(); if (!s) return null;
  const idx = Number(s.tournamentIndex) || 1;
  const entry = (s.seasonSchedule || []).find((e,i) => e && e.type === 'major' && i >= idx);
  if (!entry) return null;
  // The old v45Participants field could have been written 42 days early. It is only
  // authoritative after the explicit Pick'Em Day roster lock marker exists.
  try { window.v45LockMajorRoster?.((s.seasonSchedule||[]).indexOf(entry), gameNow()); } catch(e) {}
  const locked = !!(entry.v45RosterLockedAt && Array.isArray(entry.v45Participants) && entry.v45Participants.length);
  let names = locked ? entry.v45Participants.slice() : [];
  let pools = null;
  try {
    if (locked) {
      // Once locked, stage membership is immutable. Do not call majorPools() against
      // today's VRS: it can re-seed the already announced Major after points change.
      const frozen = window.v45MajorStagePools?.((s.seasonSchedule||[]).indexOf(entry)) || entry.v45StagePools || null;
      if (frozen) {
        const obj = key => (frozen[key] || []).map(n => teams.find(t=>t.name===(typeof n==='string'?n:n?.name))).filter(Boolean);
        pools = { stage3:obj('stage3'), stage2:obj('stage2'), stage1:obj('stage1') };
        names = [...pools.stage3,...pools.stage2,...pools.stage1].map(t=>t.name);
      } else {
        // Migrate legacy locked rosters whose v45StagePools field is missing.
        names = entry.v45Participants.slice();
        pools = { stage3:names.slice(0,8).map(n=>teams.find(t=>t.name===n)).filter(Boolean),
          stage2:names.slice(8,16).map(n=>teams.find(t=>t.name===n)).filter(Boolean),
          stage1:names.slice(16,32).map(n=>teams.find(t=>t.name===n)).filter(Boolean) };
      }
    } else {
      names = (window.CS2Realism?.majorInvites?.(teams) || teams.filter(t=>!t.isAcademy).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,32)).map(t=>typeof t==='string'?t:t.name);
      const objs = names.map(n=>teams.find(t=>t.name===n)).filter(Boolean);
      pools = window.CS2Realism?.majorPools?.(objs) || null;
    }
  } catch(e) {}
  const stage1Names = pools?.stage1?.map(t=>typeof t==='string'?t:t.name) || names.slice(-16);
  const lockAt = Number(entry.calendar?.startMs) ? Number(entry.calendar.startMs)-(window.CS2_PICKEM_LEAD_DAYS||4)*86400000 : 0;
  return { entry, names, pools, locked, lockAt, stage1: { teams: stage1Names.map(name=>({name,wins:0,losses:0})), rounds:[], completed:false, __preview:true } };
}
let previewState = null;
function ensurePreviewPickem() {
  const s = SS(), nx = upcomingMajor(); if (!s || !nx) return null;
  if (s.v33Pickem?.t === nx.entry.name && s.v33Pickem.major) previewState = s.v33Pickem.major;
  else previewState = { t: nx.entry.name, stages:{}, playoffs:{qf:[],sf:[],champion:null}, earnedPoints: 0 };
  s.v33Pickem = { t:nx.entry.name, major:previewState };
  return previewState;
}
const ST_CATS = [['threeZero', '3:0', 2, 'adv'], ['advance', '3:1 · 3:2 — выход', 6, 'adv'], ['zeroThree', '0:3', 2, 'out']];
const PO_CATS = [['qf', 'Победители ¼ финала', 4, 'adv'], ['sf', 'Победители ½ финала', 2, 'adv'], ['champion', 'Чемпион', 1, 'gold']];
const UI = { tab: '1', cat: 'threeZero', manual: false, lastDone: -1 };
// v131: после завершения Мейджора Pick'Em остаётся открытым ещё ~1,5 месяца (pickem.afterDays): можно посмотреть все
// свои прогнозы по стадиям и плей-офф с итогами и потратить жетоны. Снимок фиксируется в момент завершения
// (seasonState.v131PickemDone), потому что currentTournament вскоре переключается на следующий турнир.
const DAYMS = 864e5;
const afterDays = () => (window.CS2Config ? window.CS2Config.get('pickem.afterDays', 45) : 45);
function doneSnap() {
  const s = SS(), d = s && s.v131PickemDone; if (!d) return null;
  const ct = CT(); if (ct?.isMajor && !ct.completed) return null;
  if (gameNow() - (Number(d.at) || 0) > afterDays() * DAYMS) return null;
  const nx = upcomingMajor(); if (nx && nx.locked && nx.entry.name !== d.name) return null;   // открылся Pick'Em следующего Мейджора
  return d;
}
function captureDone() {
  const ct = CT(), s = SS(); if (!s || !ct?.isMajor || !ct.completed || !Array.isArray(ct.majorStages)) return;
  const season = ct.season || s.currentSeason || 1, prev = s.v131PickemDone;
  if (prev && prev.name === ct.name && prev.season === season) return;
  const picks = (typeof currentPickem !== 'undefined' && currentPickem.major && currentPickem.major.t === ct.name) ? currentPickem.major : (s.v33Pickem?.t === ct.name ? s.v33Pickem.major : null);
  const sp = (picks && picks.scoredPlayoffPicks) || {}, poRes = { qf: [], sf: [], champion: null };
  Object.keys(sp).forEach(k => { const i = k.indexOf(':'), kind = k.slice(0, i), n = k.slice(i + 1); if (kind === 'qf') poRes.qf.push(n); else if (kind === 'sf') poRes.sf.push(n); else if (kind === 'champion') poRes.champion = n; });
  if (!poRes.champion && ct.champion) poRes.champion = ct.champion;
  const st3 = ct.majorStages[2];
  s.v131PickemDone = { name: ct.name, season, at: gameNow(),
    stages: ct.majorStages.map(st => st ? { teams: (st.teams || []).map(t => ({ name: t.name, wins: t.wins, losses: t.losses })), rounds: JSON.parse(JSON.stringify(st.rounds || [])), completed: true } : null),
    poRoster: st3 ? (st3.teams || []).filter(t => t.wins >= 3).map(t => t.name) : [], poRes,
    picks: JSON.parse(JSON.stringify({ stages: (picks && picks.stages) || {}, playoffs: (picks && picks.playoffs) || { qf: [], sf: [], champion: null }, earnedPoints: (picks && picks.earnedPoints) || 0 })) };
  try { saveSeasonState(); } catch (e) {}
}
window.v131PickemDone = () => doneSnap();
let categoryManual = false;

// Кнопка Pick'Em появляется только в день фиксации состава (Pick'Em Day) и
// остаётся доступной до завершения Major. В обычное время её нет в навигации.
function pickemNavAvailable() {
  const ct = CT();
  if (ct?.isMajor && !ct.completed) return true;
  try { captureDone(); if (doneSnap()) return true; } catch (e) {}   // v131: ещё ~1,5 месяца после Мейджора
  const s = SS(); if (!s) return false;
  const idx = Number(s.tournamentIndex) || 1;
  const schedule = s.seasonSchedule || [];
  const entryIndex = schedule.findIndex((e, i) => e && e.type === 'major' && i >= idx && e.name !== ct?.name);
  if (entryIndex < 0) return false;
  const entry = schedule[entryIndex];
  if (!entry.v45RosterLockedAt) {
    try { window.v45LockMajorRoster?.(entryIndex, gameNow()); } catch (e) {}
  }
  return !!(entry.v45RosterLockedAt && Array.isArray(entry.v45Participants) && entry.v45Participants.length);
}

// Совместимый сезонный рейтинг для комментариев; в интерфейсе Pick'Em используется только медаль Major.
const RANKS = [[0, 'Зритель', '#7d8794'], [3, 'Знаток', '#4fa3e0'], [6, 'Аналитик', '#3ecf8e'], [12, 'Эксперт', '#f5a524'], [18, 'Оракул', '#c084fc'], [26, 'Легенда Pick’Em', '#ff5c7a']];
const rankOf = pts => { let r = RANKS[0]; RANKS.forEach(x => { if (pts >= x[0]) r = x; }); const i = RANKS.indexOf(r); return { name: r[1], color: r[2], next: RANKS[i + 1] ? RANKS[i + 1][0] : null, nextName: RANKS[i + 1]?.[1] }; };
function publicContext() {
  const ct = CT(), s = SS() || {};
  const liveMajor = !!(ct && ct.isMajor && !ct.completed), nx = liveMajor ? null : upcomingMajor();
  const title = liveMajor ? ct.name : nx?.entry?.name;
  if (!title) return null;
  const unlocked = liveMajor || !!nx?.locked;
  if (!unlocked) return { title, season: nx?.entry?.season || s.currentSeason || 1, majorId: `${title}|${nx?.entry?.season || s.currentSeason || 1}`, unlocked: false, stages: {}, playoffs: [] };
  const stages = {};
  for (let i = 1; i <= 3; i++) {
    const st = stageOf(i);
    if (!st || !Array.isArray(st.teams) || !st.teams.length) continue;
    stages[i] = { teams: st.teams.map(t => typeof t === 'string' ? t : t?.name).filter(Boolean), completed: !!st.completed, started: started(st) };
  }
  const playoffs = poRoster();
  return { title, season: liveMajor ? (ct.season || s.currentSeason || 1) : (nx?.entry?.season || s.currentSeason || 1),
    majorId: `${title}|${liveMajor ? (ct.season || s.currentSeason || 1) : (nx?.entry?.season || s.currentSeason || 1)}`,
    unlocked: true, live: liveMajor, stages, playoffs, playoffsStarted: poStarted(), completed: !!ct?.completed };
}
// v84: какой этап Pick'Em сейчас открыт и ещё не заполнен (для остановки перемотки).
function openUnfilled() {
  try {
    const ct = CT();
    if (ct?.isMajor && !ct.completed) {
      for (let i = 1; i <= 3; i++) {
        if (!pickemCanEditStage(i)) continue;
        const p = stagePicks(i), n = (p.threeZero || []).length + (p.advance || []).length + (p.zeroThree || []).length;
        if (n < 10) return { key: `${ct.name}|S${i}`, label: `Stage ${['I', 'II', 'III'][i - 1]}`, major: ct.name };
      }
      if (pickemCanEditPlayoffs() && (poPicks().qf || []).length < 4) return { key: `${ct.name}|PO`, label: 'плей-офф', major: ct.name };
      return null;
    }
    const nx = upcomingMajor();
    if (nx?.locked) { const p = stagePicks(1), n = (p.threeZero || []).length + (p.advance || []).length + (p.zeroThree || []).length; if (n < 10) return { key: `${nx.entry.name}|S1`, label: 'Stage I', major: nx.entry.name }; }
  } catch (e) {}
  return null;
}
window.V33Pickem = { openUnfilled, rankOf, isAvailable: pickemNavAvailable, canPick: () => pickemCanEdit(), canPickStage: i => pickemCanEditStage(Number(i)), canPickPlayoffs: () => pickemCanEditPlayoffs(), upcomingMajor: () => upcomingMajor(), publicContext,
  sync: () => syncAfterCalendarAdvance(), refresh: () => { selectNextOpenStage(); if (/^(pickem|majorpath)$/.test(H.S.page)) rer(); window.hltvSiteRefreshPickemNav?.(); } }; // v99: не перерисовывать чужие страницы после каждого игрового дня

// v84: прогнозы и очки принадлежат конкретному Major. Объект прошлого Major больше не
// переносится в следующий (раньше медаль нового Major стартовала с уровня предыдущего).
function freshMajorPicks(name) { return { t: name, stages: {}, playoffs: { qf: [], sf: [], champion: null }, earnedPoints: 0, scoredPlayoffPicks: {} }; }
function liveMajorPicks(ct) {
  if (typeof currentPickem === 'undefined') return null;
  const s = SS(), cur = currentPickem.major;
  if (cur && (cur.t === ct.name || (!cur.t && s?.v33Pickem?.t === ct.name && s.v33Pickem.major === cur))) { cur.t = ct.name; return cur; }
  const saved = s?.v33Pickem?.t === ct.name ? s.v33Pickem.major : null;
  // Превью-прогноз Stage I, сделанный до старта, относится к этому же Major.
  currentPickem.major = saved ? Object.assign(saved, { t: ct.name }) : freshMajorPicks(ct.name);
  if (!Number.isFinite(Number(currentPickem.major.earnedPoints))) currentPickem.major.earnedPoints = 0;
  currentPickem.major.scoredPlayoffPicks = currentPickem.major.scoredPlayoffPicks || {};
  return currentPickem.major;
}
window.v84MajorPickemFor = ct => (ct?.isMajor ? liveMajorPicks(ct) : null);
function restore() { // после перезагрузки вернуть пики идущего или ближайшего Major
  const s = SS(), ct = CT(); if (!s) return;
  if (ct?.isMajor && !ct.completed) liveMajorPicks(ct);
  else ensurePreviewPickem();
}
function selectNextOpenStage() {
  const ct = CT(); if (!ct?.isMajor || ct.completed || UI.tab === 'po') return;
  // v131: игрок сам открыл вкладку (например, завершённую Stage I — посмотреть свои пики) — не перекидываем,
  // пока не завершится ещё одна стадия
  const doneN = (ct.majorStages || []).filter(x => x && x.completed).length;
  if (doneN !== UI.lastDone) { UI.lastDone = doneN; UI.manual = false; }
  if (UI.manual) return;
  const current = Number(UI.tab) || 1, active = stageOf(current);
  if (active && !active.completed) return;
  for (let i = 1; i <= 3; i++) {
    const st = stageOf(i);
    if (st && !st.completed) { UI.tab = String(i); UI.cat = 'threeZero'; categoryManual = false; return; }
  }
  if (stageOf(3)?.completed && poRoster().length) { UI.tab = 'po'; UI.cat = 'qf'; categoryManual = false; }
}
function normalizePickCategory() {
  if (categoryManual || UI.tab === 'po') return;
  const p = stagePicks(Number(UI.tab) || 1);
  if (UI.cat === 'threeZero' && (p.threeZero || []).length >= 2) UI.cat = (p.zeroThree || []).length >= 2 ? 'advance' : 'zeroThree';
  if (UI.cat === 'zeroThree' && (p.zeroThree || []).length >= 2) UI.cat = 'advance';
}
function syncAfterCalendarAdvance() {
  try { captureDone(); } catch (e) {}
  restore();
  const ct = CT();
  if (ct?.isMajor && !ct.completed && typeof currentPickem !== 'undefined') {
    liveMajorPicks(ct);
    for (let i = 1; i <= 3; i++) {
      const st = stageOf(i), pick = currentPickem.major.stages?.[i];
      if (st?.completed && pick && !pick.scored && typeof scoreMajorStagePickem === 'function') scoreMajorStagePickem(i);
    }
    selectNextOpenStage();
  }
  categoryManual = false;
  normalizePickCategory();
  persist();
}
function persist() {
  const s = SS(), ct = CT(); if (!s) return;
  if (ct?.isMajor && !ct.completed && typeof currentPickem !== 'undefined') s.v33Pickem = { t: ct.name, major: currentPickem.major };
  else { const nx = upcomingMajor(), m = previewState || ensurePreviewPickem(); if (nx && m) s.v33Pickem = { t: nx.entry.name, major: m }; }
  try { saveSeasonState(); } catch (e) {}
}
const major = () => {
  const ct = CT();
  { const d = !(ct?.isMajor && !ct.completed) && doneSnap(); if (d) return d.picks; }
  if (ct?.isMajor && !ct.completed && typeof currentPickem !== 'undefined') { return liveMajorPicks(ct); }
  return ensurePreviewPickem();
};
const stageOf = i => {
  const ct = CT();
  if (ct?.isMajor && !ct.completed) return ct.majorStages?.[i - 1] || null;
  { const d = doneSnap(); if (d) return d.stages[i - 1] || null; }
  return i === 1 ? upcomingMajor()?.stage1 || null : null;
};
const started = st => (st?.rounds || []).some(r => (r || []).some(m => m && m.winner));
function stagePicks(i) { const m = major(); const p = m.stages[i] || (m.stages[i] = { threeZero: [], advance: [], zeroThree: [] }); return p; }
function poPicks() { const m = major(); m.playoffs = m.playoffs || { qf: [], sf: [], champion: null }; return m.playoffs; }
function poRoster() { { const ct = CT(), d = !(ct?.isMajor && !ct.completed) && doneSnap(); if (d) return d.poRoster || []; } const st = stageOf(3); return st?.completed ? st.teams.filter(t => t.wins >= 3).map(t => t.name) : []; }
const poStarted = () => { const ct = CT(); if (!(ct?.isMajor && !ct.completed) && doneSnap()) return true; return !!ct && (ct.matches || []).some(m => m && !m.isSwiss && m.winner && /четверть|quarter|¼/i.test(String(m.stage || m.round || ''))); };
function pickemCanEditStage(i) {
  const ct=CT();
  if(ct?.isMajor && !ct.completed) {
    // Каждый этап, включая Stage I, открыт после фиксации состава и до первого результата.
    const st=stageOf(i);
    return !!st && !st.completed && !started(st);
  }
  const nx=upcomingMajor();
  // До дня фиксации участников прогнозы закрыты; до старта можно заполнить только Stage I.
  return i===1 && !!nx?.locked;
}
function pickemCanEditPlayoffs() {
  const ct=CT();
  return !!(ct?.isMajor && !ct.completed && poRoster().length>0 && !poStarted());
}
function pickemCanEdit() {
  return UI.tab==='po' ? pickemCanEditPlayoffs() : pickemCanEditStage(Number(UI.tab));
}

function toSnapRounds(st) { return (st.rounds || []).map((r, i) => ({ title: `Раунд ${i + 1}`, ms: (r || []).map(m => ({ a: m.t1, b: m.t2, w: m.winner || null, s: m.score ? String(m.score).match(/\d+/g)?.map(Number) : null, mp: [] })) })); }

function majorMedalPanel(title, season) {
  const live = CT();
  if (live?.isMajor && !live.completed && live.name === title) { try { window.V35Badges?.trackCoin?.(); } catch (e) {} }
  const s = SS() || {}, profile = s.v35Prof || {}, coins = profile.coins || {};
  const key = `${title}|${season || s.currentSeason || 1}`;
  const coin = coins[key] || null;
  const majorData = s.v33Pickem?.t === title ? s.v33Pickem.major : null;
  const explicitPoints = Number(majorData?.earnedPoints);
  const stagedPoints = Object.values(majorData?.stages || {}).reduce((sum, st) => sum + Math.max(0, Number(st?.points) || 0), 0);
  const legacyPoints = coin ? Math.max(0, (Number(s.pickemScore) || 0) - (Number(coin.base) || 0)) : 0;
  const points = Math.max(0, Number.isFinite(explicitPoints) ? explicitPoints : stagedPoints, Number(coin?.pts) || 0, legacyPoints);
  const lvList = window.V35Badges?.LV || [[0, 'Бронза'], [5, 'Серебро'], [9, 'Золото'], [14, 'Алмаз']];
  let level = 0; lvList.forEach((x, i) => { if (points >= x[0]) level = i; });
  const next = lvList[level + 1], prevPts = Number(lvList[level]?.[0]) || 0;
  const progress = next ? Math.max(0, Math.min(100, (points - prevPts) / Math.max(1, next[0] - prevPts) * 100)) : 100;
  const year = typeof H.yearOf === 'function' ? H.yearOf(season || s.currentSeason || 1) : new Date().getFullYear();
  const medal = window.V35Badges?.coinSvg ? window.V35Badges.coinSvg(title, year, level, 152) : `<div class="pk-medal-fallback">${['🥉','🥈','🥇','💎'][level]}</div>`;
  const nextInfo = next ? `До уровня «${esc(next[1])}» осталось <b>${Math.max(0, next[0] - points)}</b> очк.` : 'Максимальный уровень медали достигнут';
  return `<aside class="pk-medal-card" aria-label="Медаль Major">
    <div class="pk-medal-kicker">НАГРАДА MAJOR</div>
    <h3>Медаль за Pick’Em</h3>
    <div class="pk-medal-art">${medal}</div>
    <div class="pk-medal-grade">${esc(lvList[level][1])}</div>
    <div class="pk-medal-points"><b>${points}</b><span>очков за этот Major</span></div>
    <div class="pk-medal-progress"><div><span>Прогресс до следующего уровня</span><b>${next ? `${points}/${next[0]}` : 'MAX'}</b></div><i><span style="width:${progress.toFixed(1)}%"></span></i></div>
    <p>${nextInfo}</p>
    <small>Бронза → Серебро (5) → Золото (9) → голографический Алмаз (14)</small>
  </aside>`;
}

function pPickem(arg) {
  restore();
  selectNextOpenStage();
  normalizePickCategory();
  const ct = CT(), s = SS() || {};
  const liveMajor = !!(ct && ct.isMajor && !ct.completed), D = liveMajor ? null : doneSnap(), nx = liveMajor || D ? null : upcomingMajor();
  const title = liveMajor ? ct.name : D ? D.name : nx?.entry?.name;
  if (!title) return `<div class="hs-head"><h1>Pick'Em Major</h1><span class="pk-head-note">Медаль Major появится после открытия прогнозов</span></div>${box('Прогнозы на Major', empty('Ближайшего Major в этом сезоне нет.'))}`;
  if (!liveMajor && !D && UI.tab !== '1') { UI.tab = '1'; UI.cat = 'threeZero'; }
  const pickemDay = nx?.lockAt ? H.fdate(nx.lockAt) : '';
  const preBanner = liveMajor ? '' : D ? `<div class="pk-bar"><span class="pk-st done">Мейджор завершён · Pick'Em открыт до ${H.fdate((Number(D.at) || 0) + afterDays() * DAYMS)}: смотрите свои прогнозы по стадиям и тратьте жетоны</span></div>` : (nx?.locked
    ? `<div class="pk-bar"><span class="pk-st open">Состав Major зафиксирован · Pick'Em открыт с ${pickemDay || "дня Pick'Em"}</span></div>`
    : `<div class="pk-bar"><span class="pk-st lock">Состав участников ещё предварительный. Pick'Em откроется после фиксации состава · ${pickemDay || 'за сутки до старта'}</span></div>`);
  const tabs = [1, 2, 3].map(i => { const st = stageOf(i); return `<button type="button" class="pk-tab${UI.tab === String(i) ? ' on' : ''}${st ? '' : ' off'}" data-pktab="${i}" ${st ? '' : 'disabled'}>${st?.completed ? '✓ ' : ''}Stage ${'I'.repeat(i)}</button>`; }).join('') +
    `<button type="button" class="pk-tab${UI.tab === 'po' ? ' on' : ''}${poRoster().length ? '' : ' off'}" data-pktab="po" ${poRoster().length ? '' : 'disabled'}>Плей-офф</button>`;
  let body = '';
  if (UI.tab === 'po') {
    const ros = poRoster(), p = poPicks(), lock = !!D || poStarted() || (!liveMajor && !nx?.locked);
    const cand = { qf: ros, sf: p.qf, champion: p.sf };
    if (!(UI.cat in cand)) UI.cat = 'qf';
    const all = { qf: p.qf, sf: p.sf, champion: p.champion ? [p.champion] : [] };
    // v131: после Мейджора — с отметками угадано/нет
    const poRes = D ? { qf: D.poRes.qf || [], sf: D.poRes.sf || [], champion: D.poRes.champion ? [D.poRes.champion] : [] } : null;
    body = layout(D ? ros : cand[UI.cat], PO_CATS, all, lock, 'po', poRes);
  } else {
    const i = +UI.tab, st = stageOf(i); if (!st) { UI.tab = '1'; return pPickem(arg); }
    if (!ST_CATS.some(c => c[0] === UI.cat)) UI.cat = 'threeZero';
    const p = stagePicks(i), lock = liveMajor ? (started(st) || st.completed) : D ? true : !nx?.locked;
    const res = st.completed ? { threeZero: st.teams.filter(t => t.wins === 3 && t.losses === 0).map(t => t.name), advance: st.teams.filter(t => t.wins >= 3).map(t => t.name), zeroThree: st.teams.filter(t => t.wins === 0 && t.losses === 3).map(t => t.name) } : null;
    body = layout(st.teams.map(t => t.name), ST_CATS, p, lock, String(i), res, st);
  }
  const majorSeason = liveMajor ? (ct.season || s.currentSeason || 1) : D ? D.season : (nx?.entry?.season || s.currentSeason || 1);
  const medalPanel = majorMedalPanel(title, majorSeason);
  return `<div class="hs-head"><h1>Pick'Em · ${esc(title)}</h1><span class="pk-head-note">Прогнозы Major · награда сверху</span></div>
    <div class="pk-page-grid"><section class="pk-play-area">${preBanner}<div class="pk-tabs">${tabs}</div>${body}</section>${medalPanel}</div>`;
}
// Швейцарская сетка Pick'Em как на Major: все пять раундов сразу (неизвестные пары — «? vs ?»),
// ячейки прогноза встроены в сетку: 3:0 и 0:3 — в 4-й колонке, «3:1 · 3:2 — выход» — в 5-й.
const POOL_N = { '0:0': 8, '1:0': 4, '0:1': 4, '2:0': 2, '1:1': 4, '0:2': 2, '2:1': 3, '1:2': 3, '2:2': 3 };
const COLS = [['0:0'], ['1:0', '0:1'], ['2:0', '1:1', '0:2'], ['@threeZero', '2:1', '1:2', '@zeroThree'], ['@advance', '2:2', '@out']];
function pools(st) {
  const rec = {}, R = n => rec[n] || (rec[n] = { w: 0, l: 0 }), out = {};
  (st?.rounds || []).forEach(r => {
    (r || []).forEach(m => { if (!m || !m.t1) return; const a = R(m.t1), k = `${a.w}:${a.l}`; (out[k] = out[k] || []).push(m); });
    (r || []).forEach(m => { if (!m?.winner) return; const lo = m.winner === m.t1 ? m.t2 : m.t1; R(m.winner).w++; R(lo).l++; });
  });
  return { out, rec };
}
const lg = n => `<span class="pk-lg" title="${esc(n)}">${logo(n, 'sm')}</span>`;
function mrow(m) {
  if (!m) return `<div class="pk-m pending"><span class="pk-q">TBD</span><i>vs</i><span class="pk-q">TBD</span></div>`;
  const w = m.winner, cls = n => w ? (w === n ? ' w' : ' l') : '';
  return `<div class="pk-m${w ? ' done' : ''}"><span class="pk-c${cls(m.t1)}">${lg(m.t1)}</span><i>${w && m.score ? esc(String(m.score).replace(/^Сч[её]т:\s*/, '').replace(/\s/g, '')) : 'vs'}</i><span class="pk-c${cls(m.t2)}">${lg(m.t2)}</span></div>`;
}
function layout(roster, cats, picks, lock, scope, res, st) {
  const placed = new Set(cats.flatMap(([k]) => picks[k] || []));
  const list = roster.map(n => `<button type="button" class="pk-team${placed.has(n) ? ' used' : ''}" data-pkteam="${esc(n)}" ${lock ? 'disabled' : ''} title="${esc(n)}">${logo(n, 'sm')}</button>`).join('');
  const pickBox = k => { const c = cats.find(x => x[0] === k); if (!c) return ''; const [, label, max, cls] = c, arr = picks[k] || [], ok = res ? res[k] : null;
    // v84: без «?» — пустой слот открытого этапа «+», закрытого — пунктир; у сыгранного этапа
    // в пустые места бледно подставляются фактические итоги.
    const actualFill = lock && ok ? ok.filter(x => !arr.includes(x)) : [];
    const cells = Array.from({ length: max }, (_, j) => { const n = arr[j];
      if (!n) {
        if (lock) { const a = actualFill[j - arr.length]; return a ? `<span class="pk-slot actual" title="Фактически: ${esc(a)} (без вашего прогноза)">${logo(a, 'sm')}</span>` : '<span class="pk-slot empty locked" aria-label="Прогноз не сделан"></span>'; }
        return `<button type="button" class="pk-slot empty" data-pkcat="${k}" aria-label="Выбрать категорию ${esc(label)}" title="Выбрать ${esc(label)}">+</button>`;
      }
      const mark = ok ? (ok.includes(n) ? ' hit' : ' miss') : '';
      return `<button type="button" class="pk-slot${mark}" data-pkdrop="${esc(k)}|${esc(n)}" ${lock ? 'disabled' : ''} title="${esc(n)}">${logo(n, 'sm')}</button>`; }).join('');
    return `<div class="pk-box ${cls}${UI.cat === k && !lock ? ' on' : ''}" data-pkcat="${k}" role="button" tabindex="0"><h6>${label}<i>${arr.length}/${max}</i></h6><div class="pk-cells">${cells}</div></div>`; };
  const catNav = `<div class="pk-cat-nav" aria-label="Категории Pick’em">${cats.map(([k, label, max]) => `<button type="button" class="hs-btn ghost sm pk-cat-btn${UI.cat === k && !lock ? ' on' : ''}" data-pkcat="${k}" ${lock ? 'disabled' : ''} aria-pressed="${UI.cat === k}"><span>${label}</span><b>${(picks[k] || []).length}/${max}</b></button>`).join('')}</div>`;
  let board = '';
  if (st) {
    const { out, rec } = pools(st);
    const elim = Object.entries(rec).filter(([, x]) => x.l === 3 && x.w > 0).map(([n]) => n);
    board = `<div class="pk-board">${COLS.map((col, ci) => `<div class="pk-col">${col.map(k => {
      if (k === '@out') return `<div class="pk-box out ro"><h6>2:3 · 1:3 — вылет</h6><div class="pk-cells">${elim.length ? elim.map(n => `<span class="pk-slot">${logo(n, 'sm')}</span>`).join('') : Array.from({ length: 6 }, () => '<span class="pk-slot empty locked" aria-label="Ещё не определено"></span>').join('')}</div></div>`;
      if (k[0] === '@') return pickBox(k.slice(1));
      const ms = (out[k] || []).slice(); while (ms.length < (POOL_N[k] || 0)) ms.push(null);
      return `<div class="pk-pool"><h6>${k}</h6>${ms.map(mrow).join('')}${ci < COLS.length - 1 ? '<i class="pk-ar up"></i><i class="pk-ar dn"></i>' : ''}</div>`; }).join('')}</div>`).join('')}</div>`;
  } else board = `<div class="pk-po">${cats.map(([k]) => pickBox(k)).join('')}</div>`;
  const score = res ? cats.reduce((s, [k]) => s + (picks[k] || []).filter(n => res[k].includes(n)).length, 0) : null;
  const status = lock ? (res ? `<span class="pk-st done">Этап завершён · угадано ${score}</span>` : `<span class="pk-st lock">${!CT()?.isMajor && !upcomingMajor()?.locked ? 'Пики ещё закрыты: ожидается фиксация полного состава' : 'Пики закрыты: этап начался'}</span>`) : `<span class="pk-st open">Выберите категорию сверху — можно начать с 0:3 · пики сохраняются сразу</span>`;
  const rulesNote = st ? `<p class="pk-rules-note">Доступны прогнозы 3:0 (2 команды), выход 3:1/3:2 (6 команд) и 0:3 (2 команды). Счёты 1:3 и 2:3 — результаты выбывания, а не отдельные слоты Pick’em.</p>` : '';
  return `<div class="pk-bar">${status}${lock ? '' : `<button type="button" class="hs-btn ghost sm" data-pkclear>Очистить</button>`}</div>
    ${rulesNote}${lock ? '' : catNav}<div class="pk"><aside class="pk-list"><small>Команды этапа</small><div>${list}</div></aside><div class="pk-main">${board}</div></div>`;
}
function curPicks() { if (UI.tab === 'po') { const p = poPicks(); return { get: k => k === 'champion' ? (p.champion ? [p.champion] : []) : p[k], set: (k, v) => { if (k === 'champion') p.champion = v[0] || null; else p[k] = v; } }; }
  const p = stagePicks(+UI.tab); return { get: k => p[k], set: (k, v) => { p[k] = v; } }; }
const maxOf = k => ([...ST_CATS, ...PO_CATS].find(c => c[0] === k) || [0, 0, 1])[2];
function addTeam(n) {
  if (!pickemCanEdit()) return;
  const c = curPicks(), k = UI.cat, arr = (c.get(k) || []).slice();
  if (arr.includes(n)) return;
  if (UI.tab !== 'po') ['threeZero', 'advance', 'zeroThree'].forEach(x => { if (x !== k) c.set(x, (c.get(x) || []).filter(y => y !== n)); });
  if (arr.length >= maxOf(k)) arr.shift();
  arr.push(n); c.set(k, arr);
  if (UI.tab !== 'po' && arr.length >= maxOf(k)) {
    if (k === 'threeZero') UI.cat = 'zeroThree';
    else if (k === 'zeroThree') UI.cat = 'advance';
    categoryManual = false;
  }
  if (UI.tab === 'po') { const p = poPicks(); p.sf = p.sf.filter(x => p.qf.includes(x)); if (p.champion && !p.sf.includes(p.champion)) p.champion = null; }
  persist();
}
function autoFill() {
  if (!pickemCanEdit()) return;
  const strength = n => { const t = H.teamBy(n); return (t?.pts || 0) * ((t?.form || 100) / 100); };
  if (UI.tab === 'po') { const ros = poRoster().slice().sort((a, b) => strength(b) - strength(a)), p = poPicks(); p.qf = ros.slice(0, 4); p.sf = p.qf.slice(0, 2); p.champion = p.sf[0] || null; }
  else { const st = stageOf(+UI.tab), ros = st.teams.map(t => t.name).sort((a, b) => strength(b) - strength(a)), p = stagePicks(+UI.tab); p.threeZero = ros.slice(0, 2); p.advance = ros.slice(2, 8); p.zeroThree = ros.slice(-2); }
  categoryManual = false;
  persist();
}
const rer = () => { const y = window.scrollY; H.render(); window.scrollTo(0, y); document.getElementById('hs-page')?.classList.remove('hs-anim'); };
H.PAGES.pickem = pPickem;
// v131: снимок завершённого Мейджора — по таймеру и во время перемотки (через публикации Pick'Em)
try { (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => { try { captureDone(); } catch (e) {} }, 3000); } catch (e) {}
setTimeout(() => { try { const pub = window.V70PickemPublications; if (pub && typeof pub.sync === 'function' && !pub.sync.__v131) { const b = pub.sync; pub.sync = function () { try { captureDone(); } catch (e) {} return b.apply(this, arguments); }; pub.sync.__v131 = true; } } catch (e) {} }, 2000);
// Pick'Em находится в раскрывающемся разделе Major верхней навигации.
H.SECTION_OF.pickem = 'major';
H.CLICKS.push(['[data-pktab]', el => { UI.manual = true; UI.tab = el.dataset.pktab; UI.cat = UI.tab === 'po' ? 'qf' : 'threeZero'; categoryManual = false; normalizePickCategory(); rer(); }]);
H.CLICKS.push(['[data-pkteam]', el => { addTeam(el.dataset.pkteam); rer(); }]);
H.CLICKS.push(['[data-pkdrop]', el => { if (!pickemCanEdit()) return; const [k, n] = el.dataset.pkdrop.split('|'); const c = curPicks(); c.set(k, (c.get(k) || []).filter(x => x !== n)); if (UI.tab === 'po') { const p = poPicks(); p.sf = p.sf.filter(x => p.qf.includes(x)); if (p.champion && !p.sf.includes(p.champion)) p.champion = null; } UI.cat = k; categoryManual = true; persist(); rer(); }]);
H.CLICKS.push(['[data-pkcat]', el => { UI.cat = el.dataset.pkcat; categoryManual = true; rer(); }]);   // ячейка — после клика по команде в ячейке
H.CLICKS.push(['[data-pkauto]', () => { if (!pickemCanEdit()) return; autoFill(); rer(); }]);
H.CLICKS.push(['[data-pkclear]', () => { if (!pickemCanEdit()) return; if (UI.tab === 'po') { const p = poPicks(); p.qf = []; p.sf = []; p.champion = null; } else { const p = stagePicks(+UI.tab); p.threeZero = []; p.advance = []; p.zeroThree = []; } UI.cat = UI.tab === 'po' ? 'qf' : 'threeZero'; categoryManual = false; persist(); rer(); }]);
setTimeout(() => { restore(); window.hltvSiteRefreshPickemNav?.(); }, 1500);
if (typeof setInterval === 'function') (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; try { window.hltvSiteRefreshPickemNav?.(); } catch (e) {} }, 3000);
console.info("[v33] Pick'Em Major");
})();
