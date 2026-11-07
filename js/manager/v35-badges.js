/* v35 — медали и значки профилей (у вас и у болельщиков в комментариях).
   Монета Pick'Em мейджора — как билет Pick'Em в CS2: выдаётся на старте мейджора и растёт по очкам угаданного
   на этом мейджоре: бронза → серебро (5) → золото (9) → голографический алмаз (14). Дизайн монеты генерируется из
   названия мейджора (форма, гравировка, эмблема, камень) — монеты разных мейджоров похожи, но не одинаковы.
   Значки: «На сайте с …», «Оракул» (серия угаданных прогнозов), «Активист сезона», «Ставочник года», «Ветеран»;
   сезонные награды выдаются при смене сезона (1 января). У болельщиков-ботов набор детерминирован по нику. */
(function () {
'use strict';
const H = window.HS; if (!H) return;
const esc = H.esc;
const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const SS = () => (typeof seasonState !== 'undefined' ? seasonState : null);
// v84: четыре уровня — бронза, серебро, золото и голографический алмаз (переливается)
const LV = [[0, 'Бронза', ['#f0b27a', '#a0522d', '#5e2f12']], [5, 'Серебро', ['#f4f6f8', '#a9b3bd', '#5c6670']], [9, 'Золото', ['#ffe8a3', '#e0a91f', '#7a5408']],
  [14, 'Алмаз', ['#f4f7fc', '#b9c6da', '#3d4b66']]];
const lvOf = pts => { let k = 0; pts = Number(pts) || 0; LV.forEach((x, i) => { if (pts >= x[0]) k = i; }); return k; };

/* ---------------------------------------------------------------- монета мейджора (SVG) */
const ORG = [[/IEM|Intel/i, '#ff8a1f', 'IEM'], [/PGL/i, '#4c9dff', 'PGL'], [/BLAST/i, '#ff4655', 'BLAST'], [/StarLadder/i, '#f5d90a', 'STARLADDER'], [/Perfect World/i, '#ff5c7a', 'PW'], [/ESL/i, '#ffd400', 'ESL']];
// подпись на монете: город/серия мейджора (без слов организатора, «Major», года)
function coinTag(name) {
  const org = ORG.find(o => o[0].test(name)), rest = String(name).replace(/\b(19|20)\d\d\b/g, '').replace(/\b(IEM|Intel Extreme Masters|PGL|BLAST|StarLadder|Perfect World|ESL|Major|CS2|Counter-Strike)\b/gi, '').replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return { color: org ? org[1] : '#9aa5b1', org: org ? org[2] : 'MAJOR', city: (rest[0] || (org ? org[2] : 'MAJOR')).toUpperCase().slice(0, 10) };
}
function coinSvg(name, year, lv, size = 56) {
  lv = Math.max(0, Math.min(LV.length - 1, Number(lv) || 0)); const holo = lv === LV.length - 1;
  const h = h32(name), [, , c] = LV[lv], id = 'c' + h.toString(36) + lv, tg = coinTag(name);
  const shape = h % 3, notches = 8 + (h >> 3) % 9, emblem = (Math.imul(h, 2654435761) >>> 24) % 8, pattern = (h >>> 17) % 3, hue = (Math.imul(h, 40503) >>> 7) % 360, tilt = (h >> 11) % 360;
  const rim = shape === 0 ? `<circle cx="32" cy="32" r="29"/>` : shape === 1 ? `<polygon points="${Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + i * Math.PI / 4; return (32 + 29.5 * Math.cos(a)).toFixed(1) + ',' + (32 + 29.5 * Math.sin(a)).toFixed(1); }).join(' ')}"/>`
    : `<path d="M32 3 L57 13 V33 C57 48 45 58 32 61 C19 58 7 48 7 33 V13 Z"/>`;
  const ticks = Array.from({ length: notches }, (_, i) => { const a = (tilt + i * 360 / notches) * Math.PI / 180; return `<line x1="${(32 + 22 * Math.cos(a)).toFixed(1)}" y1="${(32 + 22 * Math.sin(a)).toFixed(1)}" x2="${(32 + 25.5 * Math.cos(a)).toFixed(1)}" y2="${(32 + 25.5 * Math.sin(a)).toFixed(1)}"/>`; }).join('');
  const star = (cx, cy, R) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * .45 : R; p.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1)); } return `<polygon points="${p.join(' ')}"/>`; };
  const emb = [star(32, 30, 11), `<path d="M32 18 L43 30 L32 44 L21 30 Z"/><path d="M32 24 L37 30 L32 37 L27 30 Z" fill="${c[2]}"/>`,
    `<path d="M22 40 C18 30 22 22 28 19 M42 40 C46 30 42 22 36 19" fill="none" stroke-width="2.4"/><circle cx="32" cy="29" r="6"/>`,
    `<path d="M20 38 L32 18 L44 38 Z"/><path d="M26 38 L32 28 L38 38 Z" fill="${c[0]}"/>`,
    `<text x="32" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="900">${esc(tg.city[0] || 'M')}</text>`,
    `<path d="M22 20 L42 40 M42 20 L22 40" fill="none" stroke-width="5" stroke-linecap="round"/>`,
    `<circle cx="32" cy="30" r="7"/>${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${(32 + 10 * Math.cos(a)).toFixed(1)}" y1="${(30 + 10 * Math.sin(a)).toFixed(1)}" x2="${(32 + 14 * Math.cos(a)).toFixed(1)}" y2="${(30 + 14 * Math.sin(a)).toFixed(1)}" stroke-width="2.4"/>`; }).join('')}`,
    `<polygon points="${Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + i * Math.PI / 3; return (32 + 12 * Math.cos(a)).toFixed(1) + ',' + (30 + 12 * Math.sin(a)).toFixed(1); }).join(' ')}"/>`][emblem];
  const gem = holo ? `<path d="M32 5 L36 9 L32 13 L28 9 Z" fill="#fff" stroke="#c9b8ff" stroke-width=".8"/>` : '';
  return `<svg class="v35-coin${holo ? ' holo' : ''}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><defs>${holo ? `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7fc"/><stop offset=".35" stop-color="#cdd8ea"/><stop offset=".55" stop-color="#e9eef7"/><stop offset=".8" stop-color="#9fb0cc"/><stop offset="1" stop-color="#7d8fae"/><animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="12s" repeatCount="indefinite"/></linearGradient>` : `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>`}</defs>
    <g fill="url(#${id})" stroke="${tg.color}" stroke-width="2.4">${rim}</g><circle cx="32" cy="30" r="19" fill="hsl(${hue} 70% 55%)" opacity=".16"/><g fill="none" stroke="${c[2]}" stroke-width="1.2" opacity=".75">${shape === 2 ? '' : '<circle cx="32" cy="32" r="21"/>'}${pattern === 0 ? ticks : pattern === 1 ? ticks.replace(/<line x1="([\d.]+)" y1="([\d.]+)"[^>]*>/g, '<circle cx="$1" cy="$2" r="1.1" fill="' + c[2] + '"/>') : '<circle cx="32" cy="32" r="24.5"/>'}</g>
    <g fill="${c[2]}" fill-opacity=".85" stroke="${c[0]}" stroke-width="1" transform="translate(32 25) scale(.78) translate(-32 -30)">${emb}</g>
    <rect x="5" y="40" width="54" height="13" rx="2.5" fill="${c[2]}" stroke="${tg.color}" stroke-width="1"/><text x="32" y="49.3" text-anchor="middle" font-family="Arial,sans-serif" font-size="${tg.city.length > 8 ? 5.4 : 6.6}" font-weight="800" fill="#fff" letter-spacing=".2">${esc(tg.city)} '${esc(String(year).slice(-2))}</text>${gem}</svg>`; // лента с названием — поверх деталей монеты
}
/* ---------------------------------------------------------------- значки */
const BADGE = {
  since: (y) => ({ t: `На сайте с ${y}`, ic: '📅', c: '#4fa3e0' }), vet: (n) => ({ t: `Ветеран форума · ${n} ${n < 5 ? 'года' : 'лет'}`, ic: '🎖', c: '#e0a91f' }),
  oracle: (n) => ({ t: `Оракул: ${n} прогнозов подряд`, ic: '🔮', c: '#c084fc' }), active: (y) => ({ t: `Активист сезона ${y}`, ic: '💬', c: '#3ecf8e' }),
  bettor: (y) => ({ t: `Ставочник года ${y}`, ic: '💰', c: '#f5a524' }), top: (y) => ({ t: `Лучший комментарий ${y}`, ic: '⭐', c: '#ff5c7a' })
};
const badgeHtml = (b, sm) => `<span class="v35-bdg${sm ? ' sm' : ''}" style="--bc:${b.c}" data-tip="${esc(b.t)}">${b.ic}</span>`;
const yearNow = () => H.yearOf(SS()?.currentSeason || 1);
const majors = () => Object.values(H.archive()).filter(s => s && s.prestige === 'major').sort((a, b) => (a.season - b.season) || ((a.ge || 0) - (b.ge || 0)));

/* ---------------------------------------------------------------- данные игрока */
function me() {
  const s = SS(); if (!s) return null;
  s.v35Prof = s.v35Prof || { coins: {}, badges: [], since: yearNow() };
  return s.v35Prof;
}
// Монета текущего Major получает только очки этого события. В v54 они
// записываются в v33Pickem.major.earnedPoints; старые сохранения мигрируют
// по уже начисленным очкам стадий и прежней базе монеты.
function pickemEventPoints(major) {
  if (!major || typeof major !== 'object') return 0;
  const explicit = Number(major.earnedPoints);
  const staged = Object.values(major.stages || {}).reduce((sum, stage) => sum + Math.max(0, Number(stage?.points) || 0), 0);
  return Math.max(0, Number.isFinite(explicit) ? explicit : 0, staged);
}
function trackCoin() {
  const s = SS(), P = me(), ct = typeof currentTournament !== 'undefined' ? currentTournament : null; if (!s || !P) return;
  if (ct && ct.isMajor) {
    const k = ct.name + '|' + ct.season;
    const savedMajor = s.v33Pickem?.t === ct.name ? s.v33Pickem.major : null;
    const major = (typeof window.v84MajorPickemFor === 'function' ? window.v84MajorPickemFor(ct) : null) || savedMajor;
    const eventPts = pickemEventPoints(major);
    let c = P.coins[k];
    if (!c) {
      c = P.coins[k] = { name: ct.name, season: ct.season, year: H.yearOf(ct.season), base: Math.max(0, (Number(s.pickemScore) || 0) - eventPts), pts: eventPts };
    } else {
      c.name = ct.name; c.season = ct.season; c.year = c.year || H.yearOf(ct.season);
      const legacyDelta = Math.max(0, (Number(s.pickemScore) || 0) - (Number(c.base) || 0));
      c.pts = Math.max(eventPts, Number(c.pts) || 0, legacyDelta);
    }
  }
}
// сезонные награды — при смене сезона (1 января)
function seasonAwards() {
  const s = SS(), P = me(); if (!s || !P) return;
  const prev = (s.currentSeason || 1) - 1; if (prev < 1 || P.awarded === prev) return;
  const y = H.yearOf(prev), add = (type) => { if (!P.badges.some(b => b.type === type && b.y === y)) P.badges.push({ type, y }); };
  try { const mine = (window.V33Comments?.mine?.() || []).filter(c => c.season === prev); if (mine.length >= 15) add('active'); } catch (e) {}
  try { const bets = (s.v35Bet?.bets || []).filter(b => b.st !== 'open' && b.st !== 'void'), st = bets.reduce((a, b) => a + b.stake, 0), got = bets.reduce((a, b) => a + (b.win || 0), 0);
    if (bets.length >= 15 && got > st * 1.1) add('bettor'); } catch (e) {}
  P.awarded = prev; try { saveSeasonState(); } catch (e) {}
}
function myItems() {
  const P = me(); if (!P) return { coins: [], badges: [] };
  const coins = Object.values(P.coins).sort((a, b) => b.season - a.season).map(c => { const lv = lvOf(c.pts); return { name: c.name, pts: c.pts, html: coinSvg(c.name, c.year, lv, 72), tip: `${c.name} · монета Pick'Em: ${LV[lv][1]} (${c.pts} очк.)${LV[lv + 1] ? ` · до «${LV[lv + 1][1]}» — ${LV[lv + 1][0] - c.pts}` : ''}`, lv }; });
  const f = window.V29News?.fan?.() || {}, yrs = yearNow() - (P.since || yearNow());
  const badges = [BADGE.since(P.since || yearNow())];
  if (yrs >= 3) badges.push(BADGE.vet(yrs)); if ((f.best || 0) >= 5) badges.push(BADGE.oracle(f.best));
  (P.badges || []).forEach(b => BADGE[b.type] && badges.push(BADGE[b.type](b.y)));
  return { coins, badges };
}
// у болельщиков-ботов — по нику: год регистрации, монеты прошлых мейджоров, редкие сезонные значки
function botItems(nick) {
  const h = h32(nick), y = yearNow(), since = Math.max(2012, y - (h % 14));
  const coins = majors().filter((m, i) => ((h >> (i % 20)) & 3) !== 0).slice(-3).map((m, i) => { const v = (h >>> (4 + i * 4)) & 15, lv = v >= 15 ? 3 : v >= 12 ? 2 : v >= 7 ? 1 : 0; /* алмаз у болельщиков — редкость */ return { html: coinSvg(m.name, m.year || H.yearOf(m.season), lv, 20), tip: `${m.name} · ${LV[lv][1]}`, lv }; });
  const badges = [BADGE.since(since)]; if (y - since >= 6) badges.push(BADGE.vet(y - since));
  if (h % 11 === 0) badges.push(BADGE.oracle(5 + h % 7)); if (h % 17 === 0) badges.push(BADGE.top(y - 1)); if (h % 19 === 0) badges.push(BADGE.bettor(y - 1));
  return { coins, badges };
}
// у комментаторов — любимая команда (у ботов — по нику, примерно у двух третей) и лучшая монета
function fanTeam(nick, mine) {
  if (mine) { try { return JSON.parse(localStorage.getItem('cs2_fan_profile') || '{}').team || window.V33Comments?.prof?.()?.team || ''; } catch (e) { return ''; } }
  const list = H.ranked().filter(t => !t.isAcademy).slice(0, 40), i = h32('fan|' + nick) % 60; return list[i] ? list[i].name : '';
}
function mini(nick, mine, team) {
  const it = mine ? myItems() : botItems(nick), coin = it.coins.slice().sort((a, b) => b.lv - a.lv)[0], t = team !== undefined ? team : fanTeam(nick, mine);
  return `<span class="v35-mini">${t ? `<span class="v35-ft" data-tip="Фанат ${esc(t)}">${H.logo(t, 'xs')}</span>` : ''}${coin ? `<span class="v35-mc" data-tip="${esc(coin.tip)}">${coin.html.replace(/width="\d+" height="\d+"/, 'width="18" height="18"')}</span>` : ''}</span>`;
}
function shelf() {
  const it = myItems();
  return H.box('Медали и значки', `<div class="v35-shelf">${it.coins.length ? it.coins.map(c => `<span class="v35-ci" data-tip="${esc(c.tip)}">${c.html}<b>${esc(c.name)}</b><small>${LV[c.lv][1]} · ${c.pts} очк.</small></span>`).join('') : '<p class="hs-note">Монета Pick\'Em выдаётся на старте мейджора: угадывайте стадии и плей-офф, чтобы поднять её от бронзы до алмаза.</p>'}</div>
    <div class="v35-bdgs">${it.badges.map(b => `<span class="v35-bl">${badgeHtml(b)}<span>${esc(b.t)}</span></span>`).join('')}</div>
    <p class="hs-note">Уровни монеты за мейджор: ${LV.map(x => `${x[1]} — ${x[0]}+`).join(' · ')} очков Pick'Em. Сезонные значки («Активист сезона», «Ставочник года») выдаются 1 января.</p>`);
}
// шапка: вместо звания — монета текущего (или последнего) мейджора
function headerHtml() {
  const P = me(); const c = P ? Object.values(P.coins).sort((a, b) => b.season - a.season)[0] : null;
  return c ? `${coinSvg(c.name, c.year, lvOf(c.pts), 16)} Pick'Em: ${LV[lvOf(c.pts)][1]} · ${c.pts}` : `Pick'Em: нет монеты`;
}
function header() {
  const el = document.getElementById('pickem-trophy-display'); if (!el) return;
  const P = me(); if (!P) return;
  const c = Object.values(P.coins).sort((a, b) => b.season - a.season || 0)[0];
  const txt = c ? `Pick'Em: ${LV[lvOf(c.pts)][1]} · ${c.pts}` : `Pick'Em: нет монеты`;
  if (el.textContent.trim() !== txt || !el.querySelector('svg') === !!c) el.innerHTML = (c ? coinSvg(c.name, c.year, lvOf(c.pts), 16) + ' ' : '') + esc(txt); // старый код пишет звание текстом — перерисовываем
}
const origFan = H.PAGES.fan;
if (origFan) H.PAGES.fan = arg => {
  let html = origFan(arg); const it = myItems(), P = me();
  const row = `<span class="v35-hc">${it.coins.map(c => `<span class="v35-hci" data-tip="${esc(c.tip)}">${c.html.replace(/width="\d+" height="\d+"/, 'width="34" height="34"')}</span>`).join('')}${it.badges.slice(1).map(b => badgeHtml(b)).join('')}</span>`;
  html = html.replace('</h1>', '</h1>' + row);
  html = html.replace('<p class="hs-dim">', `<p class="hs-dim"><span class="v35-since" data-tip="Дата регистрации на сайте">📅 на сайте с ${P?.since || yearNow()}</span> · `);
  return html;
};
function refreshBadges(){ try { trackCoin(); seasonAwards(); header(); } catch(e){} }
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; refreshBadges(); }, 1500);
window.V35Badges = { coinSvg, mini, myItems, botItems, LV, headerHtml, trackCoin, refresh: refreshBadges };
try { trackCoin(); } catch (e) {}
console.info('[v35] медали и значки');
})();
