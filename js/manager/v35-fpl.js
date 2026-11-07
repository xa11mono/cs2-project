/* v35 — FPL (FACEIT Pro League): онлайн-лига про-игроков, сезон — игровой месяц. На рейтинг команд и награды не влияет.
   Каждый игровой день ~120 сильнейших игроков сцены играют 0–3 матча: шанс победы — по силе игрока против среднего
   лобби, ELO ±(20–30), K/D и рейтинг — по силе с разбросом. Страница «FPL» (Ещё → FPL): таблица месяца, призовые топ-10,
   победители прошлых месяцев. В конце месяца — новость «X — №1 FPL в …». */
(function () {
'use strict';
const H = window.HS; if (!H) return;
const esc = H.esc, MON = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const MONN = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const PRIZE = [10000, 6000, 4000, 2500, 2000, 1500, 1200, 1000, 800, 600];
const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const rng = seed => { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
const ST = () => { const s = seasonState; if (!s.v35Fpl) s.v35Fpl = { month: '', day: '', P: {}, hist: [] }; if (!s.v35Fpl.E) s.v35Fpl.E = {}; return s.v35Fpl; };
// ELO FPL — на сезон FPL (месяц), в начале сезона сбрасывается к стартовому по силе игрока (топ ~4000)
const eloOf = (F, p) => F.E[p.nick] || (F.E[p.nick] = Math.round(1800 + Math.max(0, pow(p) - 50) * 48));
const nowD = () => new Date(Number(seasonState.calendar?.currentMs) || Date.now());
const mKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
function roster(r) { // ~100 сильнейших + в этот день заходят ~40 игроков Tier-2/3
  const all = (typeof teams !== 'undefined' ? teams : []).filter(t => !t.isAcademy).flatMap(t => (t.players || []).slice(0, 5).map(p => ({ p, team: t.name }))).sort((a, b) => pow(b.p) - pow(a.p));
  return all.slice(0, 100).concat(all.slice(100).filter(() => !r || r() < .12));
}
function closeMonth(F) {
  const rows = Object.entries(F.P).filter(([, x]) => x.m >= 10).sort((a, b) => b[1].elo - a[1].elo); if (!rows.length) return;
  const [y, m] = F.month.split('-').map(Number), top = rows.slice(0, 10).map(([nick, x], i) => ({ nick, team: x.team, elo: x.elo, m: x.m, w: x.w, prize: PRIZE[i] }));
  F.hist.unshift({ month: F.month, top }); if (F.hist.length > 36) F.hist.length = 36;
  const N = window.V29News; if (N?.add) N.add({ cat: 'stats', icon: '🟧', imp: 4, title: `${top[0].nick} — №1 FPL в ${MON[m - 1]}`, lead: `${top[0].nick} (${top[0].team}) закончил месяц на первой строчке FACEIT Pro League с ${top[0].elo} ELO и забирает $${PRIZE[0].toLocaleString('en-US')}.`,
    body: [`Топ-3: ${top.slice(0, 3).map((x, i) => `${i + 1}. ${x.nick} (${x.team}) — ${x.elo} ELO, ${x.m} матчей, ${Math.round(x.w / x.m * 100)}% побед`).join('; ')}.`, 'FPL — онлайн-лига про-игроков; на рейтинг команд не влияет.'], tags: top.slice(0, 3).map(x => N.P(x.nick)) });
}
function simDay(F, dateStr) {
  const r = rng(h32('fpl|' + dateStr + (seasonState.v29Salt || ''))), pl = roster(r); if (!pl.length) return;
  const avg = pl.reduce((s, x) => s + pow(x.p), 0) / pl.length;
  pl.forEach(x => {
    const o = F.P[x.p.nick] || (F.P[x.p.nick] = { elo: eloOf(F, x.p), max: eloOf(F, x.p), m: 0, w: 0, k: 0, d: 0, rt: 0, team: x.team, cc: x.p.country || '' }); o.team = x.team; o.cc = x.p.country || o.cc;
    const games = Math.floor(r() * 4 * (0.4 + (h32(x.p.nick) % 7) / 10)); // кто-то гриндит, кто-то редко заходит
    for (let g = 0; g < games; g++) {
      const pw = 1 / (1 + Math.exp(-(pow(x.p) - avg) / 6)), win = r() < pw, k = Math.max(5, Math.round(14 + (pow(x.p) - avg) * .5 + (r() - .5) * 14)), d = Math.max(5, Math.round(16 - (pow(x.p) - avg) * .3 + (r() - .5) * 10));
      o.m++; if (win) o.w++; o.k += k; o.d += d; o.rt += Math.max(.4, Math.min(2.2, 1 + (k - d) / 30 + (win ? .06 : -.06)));
      o.elo = Math.max(800, o.elo + Math.round(50 * (win ? 1 - pw : -pw) + (r() - .5) * 4)); F.E[x.p.nick] = o.elo; o.max = Math.max(o.max || 0, o.elo); // по ожиданию: фавориту за победу мало, за поражение много
    }
  });
}
function tick() {
  if (typeof seasonState === 'undefined' || !seasonState.calendar) return;
  const F = ST(), d = nowD(), mk = mKey(d), ds = d.toDateString();
  if (!F.month) { F.month = mk; F.day = ds; return; }
  if (F.day === ds) return;
  // Полный календарный catch-up: быстрая перемотка не должна терять дни FPL.
  let cur = new Date(F.day); let guard = 0; while (cur.toDateString() !== ds && guard++ < 5000) {
    cur = new Date(cur.getTime() + 864e5);
    if (mKey(cur) !== F.month) { closeMonth(F); F.month = mKey(cur); F.P = {}; F.E = {}; } // новый сезон FPL: таблица и ELO сбрасываются
    simDay(F, cur.toDateString());
  }
  F.day = ds; try { saveSeasonState(); } catch (e) {}
}
function page() {
  tick();
  const F = ST(), rows = Object.entries(F.P).filter(([, x]) => x.m > 0).sort((a, b) => b[1].elo - a[1].elo), [y, m] = (F.month || mKey(nowD())).split('-').map(Number);
  const fi = window.V35Icons ? window.V35Icons.svg('faceit', 22) : '';
  const tbl = rows.length ? `<table class="hs-tbl hs-stbl"><thead><tr><th>#</th><th class="l">Игрок</th><th class="l">Команда</th><th>ELO</th><th>Макс.</th><th>Матчей</th><th>Победы</th><th>K/D</th><th>Рейтинг</th><th>Приз</th></tr></thead><tbody>${rows.slice(0, 50).map(([nick, x], i) => `<tr data-player="${esc(nick)}"><td class="n"><b>${i + 1}</b></td><td class="l">${x.cc ? H.flag(x.cc) : ''} <b>${esc(nick)}</b></td><td class="l">${H.logo(x.team, 'xs')} ${esc(x.team)}</td><td><b class="fpl-elo">${x.elo}</b></td><td>${x.max || x.elo}</td><td>${x.m}</td><td>${Math.round(x.w / x.m * 100)}%</td><td>${(x.k / Math.max(1, x.d)).toFixed(2)}</td><td>${(x.rt / x.m).toFixed(2)}</td><td>${PRIZE[i] ? '$' + PRIZE[i].toLocaleString('en-US') : '—'}</td></tr>`).join('')}</tbody></table>` : H.empty('Месяц только начался — матчи FPL появятся с ближайшим игровым днём.');
  const hist = F.hist.length ? F.hist.map(hm => { const [yy, mm] = hm.month.split('-').map(Number); return `<button type="button" class="ev-news" data-player="${esc(hm.top[0].nick)}"><b>${MONN[mm - 1]} ${yy}: ${esc(hm.top[0].nick)}</b><small>${hm.top[0].elo} ELO · ${esc(hm.top[0].team)} · 2-й ${esc(hm.top[1]?.nick || '—')}, 3-й ${esc(hm.top[2]?.nick || '—')}</small></button>`; }).join('') : H.empty('Первый месяц ещё идёт');
  return `<div class="hs-head"><h1>${fi} FACEIT Pro League</h1><div class="hs-filters"><span class="hs-sub">${MONN[m - 1]} ${y} · онлайн-лига про-игроков · на рейтинг команд не влияет</span></div></div>
    <div class="hs-grid2 fpl-grid"><div class="hs-col">${H.box(`Таблица месяца · ${MONN[m - 1]}`, tbl, '', 'flush')}</div><div class="hs-col">${H.box('Победители месяцев', hist, '', 'flush')}
      ${H.box('Как устроено', '<p class="hs-note">Каждый игровой день сильнейшие игроки сцены (и часть игроков Tier-2/3) играют матчи FPL: победа — около +25 ELO FACEIT, поражение — около −25. сезон FPL — календарный месяц: в начале сезона таблица и ELO сбрасываются; в конце десятка лучших получает призовые и награды «№1 FPL» / «Топ-3 FPL» в профиль.</p>')}</div></div>`;
}
H.PAGES.fpl = page;
const ord = n => n === 1 ? '№1' : n + '-е';
if (H.PAGES.player) { const orig = H.PAGES.player;
  H.PAGES.player = arg => { let html = orig(arg); const nick = String(arg || '').split('/')[0], F = ST(), I = window.V35Icons;
    const aw = F.hist.flatMap(hm => hm.top.slice(0, 3).map((x, i) => x.nick === nick ? { i, hm } : null).filter(Boolean));
    const chips = (F.E[nick] ? `<span class="hs-chip static fpl-chip" data-tip="ELO FACEIT">${I ? I.svg('faceit', 13) : ''} ${F.E[nick]}</span>` : '') +
      // v84: награды FPL — одной плашкой (подробности во всплывающей подсказке), чтобы шапка не превращалась в ленту
      (aw.length ? (() => { const wins = aw.filter(x => x.i === 0).length, list = aw.map(({ i, hm }) => { const [y, m] = hm.month.split('-').map(Number); return `${i === 0 ? '№1' : ord(i + 1)} · ${MONN[m - 1]} ${y}`; }).join('; ');
        return `<span class="hs-chip static fpl-chip${wins ? ' gold' : ''}" data-tip="FPL: ${esc(list)}">${I ? I.svg('faceit', 12) : ''} FPL: ${wins ? `${wins}× №1, ` : ''}${aw.length}× топ-3</span>`; })() : '');
    return chips ? html.replace('<div class="hs-pchips">', '<div class="hs-pchips">' + chips) : html; };
}
if (H.PAGES.home) { const orig = H.PAGES.home;
  H.PAGES.home = arg => { const html = orig(arg), F = ST(), rows = Object.entries(F.P).filter(([, x]) => x.m > 0).sort((a, b) => b[1].elo - a[1].elo).slice(0, 5);
    if (!rows.length) return html; const [y, m] = F.month.split('-').map(Number);
    const box = H.box(`FPL · ${MONN[m - 1]}`, rows.map(([nick, x], i) => `<button type="button" class="hm-rk" data-player="${esc(nick)}"><span class="n">${i + 1}</span>${x.cc ? H.flag(x.cc) : ''}<span class="nm">${esc(nick)}</span><b class="fpl-elo">${x.elo}</b></button>`).join(''), '<button type="button" class="hs-more" data-nav="fpl">вся таблица →</button>', 'flush');
    const i = html.lastIndexOf('<div class="hs-col">'); return i < 0 ? html : html.slice(0, i + 20) + box + html.slice(i + 20); };
}
if (H.SECTION_OF) H.SECTION_OF.fpl = 'news';
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; try { tick(); } catch (e) { console.warn('[v35 fpl]', e); } }, 3000);
window.V35Fpl = { tick, state: ST };
console.info('[v35] FPL');
})();
