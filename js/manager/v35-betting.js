/* v35 — Букмекер: ставки на матчи текущего турнира Tier-1.
   Рынки: исход серии, точный счёт серии, тотал карт, фора по картам, победа на 1-й карте (для BO1 — только исход).
   Вероятности — из шансов игры на серию (calcMatchOdds): из них выводится шанс взять карту q (BO3: p = q²(3−2q),
   BO5: p = q³(10−15q+6q²)), из q — точный счёт, тотал и фора. Коэффициент = 1 / (вероятность × маржа 6%).
   Купон: одинары (каждая выбранная ставка отдельно) или экспресс (2+ разных матча, коэффициенты перемножаются).
   Ставка привязана к матчу через его постоянный id (broadcastMatchKey) и рассчитывается по broadcastResult после
   окончания серии; матч не сыгран, а турнир закончился — возврат. Баланс и ставки — в seasonState.v35Bet (в сейве). */
(function () {
'use strict';
const H = window.HS; if (!H) return;
const esc = H.esc, MARGIN = 1.06, START = 10000;
const ST = () => { const s = seasonState; if (!s.v35Bet) s.v35Bet = { bal: START, bets: [], seq: 0, bonusDay: '' }; return s.v35Bet; };
const save = () => { try { saveSeasonState(); } catch (e) {} };
const money = v => Math.round(v).toLocaleString('ru-RU') + ' ₽';
const coef = p => Math.max(1.01, Math.min(50, 1 / Math.max(0.02, p * MARGIN)));
const f2 = v => v.toFixed(2);

function modeOf(m) { try { return getBroadcastMode(m); } catch (e) { return m.isBO1 ? 'BO1' : m.isBO5 ? 'BO5' : 'BO3'; } }
function seriesP(m) { let p = 0.5; try { const o = calcMatchOdds(m.t1, m.t2, !!m.isBO1); if (o) p = o.pct1 / 100; } catch (e) {} return Math.min(0.97, Math.max(0.03, p)); }
function mapQ(p, mode) { // шанс взять карту по шансу на серию (бисекция)
  if (mode === 'BO1') return p;
  const f = mode === 'BO5' ? q => q * q * q * (10 - 15 * q + 6 * q * q) : q => q * q * (3 - 2 * q);
  let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (f(mid) < p) lo = mid; else hi = mid; } return (lo + hi) / 2;
}
// рынки матча: [{g: группа, id, label, p}]
function markets(m) {
  const mode = modeOf(m), p = seriesP(m), q = mapQ(p, mode), r = 1 - q, A = m.t1, B = m.t2, out = [];
  const add = (g, id, label, pr) => out.push({ g, id, label, p: pr });
  add('Исход', 'w1', A, p); add('Исход', 'w2', B, 1 - p);
  if (mode === 'BO3') {
    const s = { '2:0': q * q, '2:1': 2 * q * q * r, '1:2': 2 * q * r * r, '0:2': r * r };
    Object.entries(s).forEach(([k, v]) => add('Точный счёт', 'cs' + k, k, v));
    add('Тотал карт', 'tu2.5', 'Больше 2.5', s['2:1'] + s['1:2']); add('Тотал карт', 'td2.5', 'Меньше 2.5', s['2:0'] + s['0:2']);
    add('Фора по картам', 'h1-1.5', `${A} −1.5`, s['2:0']); add('Фора по картам', 'h2+1.5', `${B} +1.5`, 1 - s['2:0']);
    add('Фора по картам', 'h2-1.5', `${B} −1.5`, s['0:2']); add('Фора по картам', 'h1+1.5', `${A} +1.5`, 1 - s['0:2']);
  } else if (mode === 'BO5') {
    const s = { '3:0': q ** 3, '3:1': 3 * q ** 3 * r, '3:2': 6 * q ** 3 * r * r, '2:3': 6 * r ** 3 * q * q, '1:3': 3 * r ** 3 * q, '0:3': r ** 3 };
    Object.entries(s).forEach(([k, v]) => add('Точный счёт', 'cs' + k, k, v));
    add('Тотал карт', 'tu3.5', 'Больше 3.5', s['3:1'] + s['3:2'] + s['2:3'] + s['1:3']); add('Тотал карт', 'td3.5', 'Меньше 3.5', s['3:0'] + s['0:3']);
    add('Тотал карт', 'tu4.5', 'Больше 4.5', s['3:2'] + s['2:3']); add('Тотал карт', 'td4.5', 'Меньше 4.5', 1 - s['3:2'] - s['2:3']);
    add('Фора по картам', 'h1-1.5', `${A} −1.5`, s['3:0'] + s['3:1']); add('Фора по картам', 'h2+1.5', `${B} +1.5`, 1 - s['3:0'] - s['3:1']);
  }
  if (mode !== 'BO1') { add('1-я карта', 'm1', A, q); add('1-я карта', 'm2', B, r); }
  return out.map(x => ({ ...x, c: coef(x.p) }));
}
// исход рынка по результату серии
function outcome(id, res, A) {
  const s1 = +res.series1, s2 = +res.series2, maps = res.maps || [], total = s1 + s2;
  if (id === 'w1') return s1 > s2; if (id === 'w2') return s2 > s1;
  if (id.startsWith('cs')) return id.slice(2) === `${s1}:${s2}`;
  if (id.startsWith('tu')) return total > parseFloat(id.slice(2)); if (id.startsWith('td')) return total < parseFloat(id.slice(2));
  if (id.startsWith('h1') || id.startsWith('h2')) { const hc = parseFloat(id.slice(2)); return id[1] === '1' ? s1 + hc > s2 : s2 + hc > s1; }
  if (id === 'm1' || id === 'm2') { const w = maps[0]?.winner; return id === 'm1' ? w === A : w && w !== A; }
  return false;
}

/* ------------------------------------------------------------ матчи и расчёт */
function allOf(ct) { // все матчи турнира во всех форматах
  const out = [], push = (m, stage) => { if (m && !out.some(x => x.m === m)) out.push({ m, stage }); };
  try { if (typeof getBroadcastPlayableMatches === 'function') getBroadcastPlayableMatches().forEach(x => push(x.match, x.stage)); } catch (e) {}
  (ct.upperRounds || []).forEach(r => (r || []).forEach(m => push(m, 'Плей-офф'))); (ct.lowerRounds || []).forEach(r => (r || []).forEach(m => push(m, 'Нижняя сетка')));
  push(ct.grandFinal, 'Гранд-финал'); push(ct.bronzeMatch, 'За 3-е место');
  (ct.swiss?.rounds || []).forEach((r, i) => r.forEach(m => push(m, `Swiss · раунд ${i + 1}`)));
  (ct.majorStages || []).forEach((st, si) => (st?.rounds || []).forEach((r, i) => r.forEach(m => push(m, `Stage ${si + 1} · раунд ${i + 1}`))));
  (ct.gsl?.groups || []).forEach((g, gi) => Object.values(g.matches || {}).forEach(m => push(m, `Группа ${String.fromCharCode(65 + gi)}`)));
  (ct.bounty?.stage1 || []).forEach(m => push(m, 'Bounty · стадия 1')); (ct.bounty?.stage2 || []).forEach(m => push(m, 'Bounty · стадия 2'));
  return out;
}
function open() { const ct = currentTournament; if (!ct || ct.completed) return []; return allOf(ct).filter(x => x.m.t1 && x.m.t2 && !x.m.winner && x.m.broadcastStatus !== 'live'); }
function byKey(key) { const ct = currentTournament; if (!ct) return null; const x = allOf(ct).find(y => y.m._broadcastId === key); return x ? x.m : null; }
function settle() {
  const S = ST(); let changed = false;
  S.bets.filter(b => b.st === 'open').forEach(b => {
    let lost = false, pending = false, voided = 0;
    b.legs.forEach(l => {
      if (l.res) { if (l.res === 'L') lost = true; if (l.res === 'V') voided++; return; }
      const m = byKey(l.key), res = m && m.winner ? (m.broadcastResult || null) : null;
      if (res && Number.isFinite(+res.series1)) { l.res = outcome(l.id, res, l.t1) ? 'W' : 'L'; l.score = `${res.series1}:${res.series2}`; if (l.res === 'L') lost = true; changed = true; }
      else if (m && m.winner) { l.res = 'V'; voided++; changed = true; } // результат без деталей — возврат
      else if (!m && (!currentTournament || currentTournament.name !== l.ev || currentTournament.completed)) { l.res = 'V'; voided++; changed = true; }
      else pending = true;
    });
    if (lost) { b.st = 'lost'; b.win = 0; changed = true; }
    else if (!pending) { const k = b.legs.filter(l => l.res === 'W').reduce((s, l) => s * l.c, 1); b.st = voided === b.legs.length ? 'void' : 'won'; b.win = Math.round(b.stake * (voided === b.legs.length ? 1 : k)); S.bal += b.win; b.doneAt = H.nowMs(); changed = true; }
  });
  if (changed) save();
  return changed;
}

/* ------------------------------------------------------------ купон */
H.S.bet = H.S.bet || { slip: [], mode: 'single', stake: 500, tab: 'open', err: '' };
function toggleLeg(key, id) {
  const B = H.S.bet, m = byKey(key), ms = m && markets(m).find(x => x.id === id); if (!ms) return;
  const i = B.slip.findIndex(l => l.key === key && l.id === id);
  if (i >= 0) B.slip.splice(i, 1);
  else { B.slip = B.slip.filter(l => !(l.key === key && B.mode === 'express')); B.slip.push({ key, id, label: ms.label, g: ms.g, c: +f2(ms.c), t1: m.t1, t2: m.t2, ev: currentTournament?.name || '' }); }
  B.err = '';
}
function place() {
  const B = H.S.bet, S = ST(), stake = Math.floor(+B.stake || 0); B.err = '';
  const legs = B.slip.filter(l => { const m = byKey(l.key); return m && !m.winner && m.broadcastStatus !== 'live'; });
  if (!legs.length) { B.err = 'Купон пуст или матчи уже начались'; return; }
  if (stake < 10) { B.err = 'Минимальная ставка — 10 ₽'; return; }
  const n = B.mode === 'express' ? 1 : legs.length;
  if (B.mode === 'express' && (legs.length < 2 || new Set(legs.map(l => l.key)).size !== legs.length)) { B.err = 'Экспресс — от 2 событий из разных матчей'; return; }
  if (stake * n > S.bal) { B.err = `Не хватает средств: нужно ${money(stake * n)}`; return; }
  const mk = ls => ({ id: 'b' + (++S.seq), at: H.nowMs(), stake, st: 'open', legs: ls.map(l => ({ ...l })), k: ls.reduce((s, l) => s * l.c, 1), ev: currentTournament?.name || '' });
  if (B.mode === 'express') S.bets.unshift(mk(legs)); else legs.forEach(l => S.bets.unshift(mk([l])));
  S.bal -= stake * n; if (S.bets.length > 300) S.bets.length = 300;
  B.slip = []; save();
}

/* ------------------------------------------------------------ страница */
function page() {
  settle();
  const S = ST(), B = H.S.bet, list = open().slice(0, 12), sel = new Set(B.slip.map(l => l.key + '|' + l.id));
  // строка матча: время/стадия, команды, П1/П2; остальные рынки — по клику «+N», карточками по группам
  const ev = list.map(({ m, stage }) => {
    const key = broadcastMatchKey(m), mk = markets(m), groups = [...new Set(mk.map(x => x.g))].filter(g => g !== 'Исход'), opened = B.openKey === key;
    let pa = null; try { pa = H.plannedAt ? H.plannedAt({ a: m.t1, b: m.t2 }) : null; } catch (e) {}
    const ob = x => `<button type="button" class="bt-o${sel.has(key + '|' + x.id) ? ' on' : ''}" data-bet="${esc(key)}|${x.id}"><span>${esc(x.label)}</span><b>${f2(x.c)}</b></button>`;
    const w1 = mk.find(x => x.id === 'w1'), w2 = mk.find(x => x.id === 'w2');
    const pill = x => `<button type="button" class="bt-k${sel.has(key + '|' + x.id) ? ' on' : ''}" data-bet="${esc(key)}|${x.id}">${f2(x.c)}</button>`;
    return `<div class="bt-ev${opened ? ' open' : ''}"><div class="bt-row"><div class="bt-when"><b>${pa ? esc(H.whenTxt(pa.ms, pa.est)).replace(/^~ /, '') : '—'}</b><small>${esc(stage || '')} · ${modeOf(m)}</small></div>
      <div class="bt-teams"><span>${H.logo(m.t1, 'sm')}<b>${esc(m.t1)}</b></span><span>${H.logo(m.t2, 'sm')}<b>${esc(m.t2)}</b></span></div>
      <div class="bt-main"><small>П1</small>${pill(w1)}<small>П2</small>${pill(w2)}</div>
      ${groups.length ? `<button type="button" class="bt-more" data-betopen="${esc(key)}">${opened ? 'Свернуть' : '+' + (mk.length - 2)}</button>` : '<span></span>'}</div>
      ${opened ? `<div class="bt-mk">${groups.map(g => `<div class="bt-card"><h5>${esc(g)}</h5><div class="bt-os">${mk.filter(x => x.g === g).map(ob).join('')}</div></div>`).join('')}</div>` : ''}</div>`;
  }).join('');
  const k = B.slip.reduce((s, l) => s * l.c, 1), n = B.mode === 'express' ? 1 : B.slip.length, stake = Math.floor(+B.stake || 0);
  const win = B.mode === 'express' ? stake * k : B.slip.reduce((s, l) => s + stake * l.c, 0);
  const slip = `<div class="bt-bal">Баланс <b>${money(S.bal)}</b>${S.bal < 100 ? ' <button type="button" class="hs-btn sm" data-betbonus>Бонус 1 000 ₽</button>' : ''}</div>
    <div class="hm-tabs bt-modes"><button type="button" class="hm-tab${B.mode === 'single' ? ' on' : ''}" data-betmode="single">Одинары</button><button type="button" class="hm-tab${B.mode === 'express' ? ' on' : ''}" data-betmode="express">Экспресс</button></div>
    ${B.slip.length ? B.slip.map((l, i) => `<div class="bt-leg"><div><small class="hs-dim">${esc(l.t1)} — ${esc(l.t2)} · ${esc(l.g)}</small><b>${esc(l.label)}</b></div><b>${f2(l.c)}</b><button type="button" class="bt-x" data-betdel="${i}" aria-label="Убрать">×</button></div>`).join('') : '<p class="hs-note">Нажмите на коэффициент, чтобы добавить событие в купон.</p>'}
    ${B.slip.length ? `<div class="bt-sum">${B.mode === 'express' ? `<span>Коэффициент <b>${f2(k)}</b></span>` : `<span>Ставок: <b>${n}</b></span>`}<label>Сумма${B.mode === 'single' && n > 1 ? ' каждой' : ''} <input type="number" min="10" step="10" value="${stake}" data-betstake></label>
      <span>Возможный выигрыш <b>${money(win)}</b></span>${[100, 500, 1000, 5000].map(v => `<button type="button" class="hs-chip" data-betquick="${v}">${v}</button>`).join('')}</div>
      <button type="button" class="hs-btn" data-betplace>Сделать ставку · ${money(stake * n)}</button>` : ''}${B.err ? `<p class="dn">${esc(B.err)}</p>` : ''}`;
  const mine = S.bets.filter(b => B.tab === 'open' ? b.st === 'open' : b.st !== 'open').slice(0, 40);
  const done = S.bets.filter(b => b.st !== 'open' && b.st !== 'void'), staked = done.reduce((s, b) => s + b.stake, 0), got = done.reduce((s, b) => s + (b.win || 0), 0);
  const stl = { open: 'ждёт', won: 'выигрыш', lost: 'проигрыш', void: 'возврат' };
  const hist = `<div class="hs-filters" style="margin-bottom:8px"><button type="button" class="hs-chip${B.tab === 'open' ? ' on' : ''}" data-bettab="open">Активные · ${S.bets.filter(b => b.st === 'open').length}</button><button type="button" class="hs-chip${B.tab === 'done' ? ' on' : ''}" data-bettab="done">Рассчитанные</button>
    <span class="hs-sub">Поставлено ${money(staked)} · выплачено ${money(got)} · ROI ${staked ? Math.round((got - staked) / staked * 100) : 0}%</span></div>
    ${mine.length ? mine.map(b => `<div class="bt-bet ${b.st}"><div class="bt-bet-h"><b>${b.legs.length > 1 ? `Экспресс ×${b.legs.length}` : 'Одинар'}</b><span>${money(b.stake)} × ${f2(b.k)}</span><span class="bt-st">${stl[b.st]}${b.st === 'won' || b.st === 'void' ? ' · ' + money(b.win) : ''}</span></div>
      ${b.legs.map(l => `<div class="bt-bl ${l.res || ''}"><small>${esc(l.t1)} — ${esc(l.t2)}${l.score ? ' · ' + l.score : ''}</small><span>${esc(l.g)}: <b>${esc(l.label)}</b> · ${f2(l.c)}</span></div>`).join('')}</div>`).join('') : H.empty(B.tab === 'open' ? 'Активных ставок нет' : 'Рассчитанных ставок пока нет')}`;
  return `<div class="hs-head"><h1>Ставки</h1><div class="hs-filters"><span class="hs-sub">${esc(currentTournament && !currentTournament.completed ? currentTournament.name : 'Нет идущего турнира Tier-1')} · маржа букмекера ${Math.round((MARGIN - 1) * 100)}%</span></div></div>
    <div class="bt-grid"><div class="bt-col">${H.box('Линия', ev || H.empty('Нет матчей, открытых для ставок. Линия появится, когда пары будут известны.'), '', 'bt-line')}</div>
    <div class="bt-col">${H.box('Купон', slip)}${H.box('Мои ставки', hist)}</div></div>`;
}
H.PAGES.betting = page;
if (H.SECTION_OF) H.SECTION_OF.betting = 'news';
const rr = () => { const y = window.scrollY; H.render(); window.scrollTo(0, y); };
H.CLICKS.push(['[data-bet]', el => { const [key, id] = el.dataset.bet.split('|'); toggleLeg(key, id); rr(); }]);
H.CLICKS.push(['[data-betopen]', el => { H.S.bet.openKey = H.S.bet.openKey === el.dataset.betopen ? null : el.dataset.betopen; rr(); }]);
H.CLICKS.push(['[data-betdel]', el => { H.S.bet.slip.splice(+el.dataset.betdel, 1); rr(); }]);
H.CLICKS.push(['[data-betmode]', el => { H.S.bet.mode = el.dataset.betmode; H.S.bet.err = ''; rr(); }]);
H.CLICKS.push(['[data-bettab]', el => { H.S.bet.tab = el.dataset.bettab; rr(); }]);
H.CLICKS.push(['[data-betquick]', el => { H.S.bet.stake = +el.dataset.betquick; rr(); }]);
H.CLICKS.push(['[data-betplace]', () => { place(); rr(); }]);
H.CLICKS.push(['[data-betbonus]', () => { const S = ST(), d = new Date(H.nowMs()).toDateString(); if (S.bal < 100 && S.bonusDay !== d) { S.bal += 1000; S.bonusDay = d; save(); } else H.S.bet.err = 'Бонус — раз в игровой день'; rr(); }]);
document.addEventListener('change', e => { if (e.target.matches?.('[data-betstake]')) { H.S.bet.stake = Math.max(0, Math.floor(+e.target.value || 0)); rr(); } });
// расчёт ставок идёт и когда страница закрыта
function syncBetSettlement(){ try { if(seasonState?.v35Bet?.bets?.some(b=>b.st==='open') && settle() && H.S.page==='betting' && !window.v57BatchCalendarSkip) rr(); } catch(e){} }
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; syncBetSettlement(); }, 3000);
window.V35Bets = { open, markets, outcome, settle, sync: syncBetSettlement, place, toggleLeg, state: ST };
console.info('[v35] ставки');
})();
