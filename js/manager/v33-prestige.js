/* v33 — престиж команды (0–100, 1–5 звёзд).
   Складывается из титулов за всю историю (свежие весят больше: −15% за каждый прошедший сезон) и репутации
   организации. На что влияет:
   • переговоры: агент игрока просит меньше у престижного клуба и больше у непрестижного (±20%);
   • рынок AI: шансы сделки сдвигаются на 0.4% за пункт разницы престижа; звезда не уходит в клуб,
     который на 35+ пунктов менее престижен её нынешнего.
   Показывается в рейтинге команд, на странице команды и в штабе организации. */
(function () {
'use strict';
const H = window.HS;
const W = { major: 18, elite: 9, regular: 5, tier2: 1.5, tier3: 0.6, academy: 0.4 };
let cache = null, cacheKey = '', lastShelfTeam = null;
let fastKey = '';
function table() {
  // v84: быстрый ключ по ревизии архива/реестра — без пересборки списка достижений на каждый вызов.
  try {
    const cur0 = (typeof seasonState !== 'undefined' && seasonState.currentSeason) || 1;
    const fk = `${cur0}|${typeof window.hubArchiveRevision === 'function' ? window.hubArchiveRevision() : ''}|${(window.twAwardsExport?.()?.teamTitles || []).length}|${(typeof teams !== 'undefined' ? teams.length : 0)}`;
    if (cache && fk === fastKey) return cache;
    fastKey = fk;
  } catch (e) {}
  const rows = window.RewardSystem?.getAllTeamEventAchievements({ includeQualifiers: false }) || [];
  const cur = (typeof seasonState !== 'undefined' && seasonState.currentSeason) || 1;
  const key = `${cur}|${rows.map(x => `${x.team}|${x.name}|${x.season}|${x.kind}|${Number(x.ts) || 0}`).sort().join(';')}`;
  if (cache && key === cacheKey) return cache;
  const pts = {};
  rows.forEach(row => {
    const kind = row.kind || 'regular';
    if (kind === 'qual') return;
    const weight = W[kind] || 0;
    if (!weight) return;
    const age = Math.max(0, cur - (Number(row.season) || cur));
    pts[row.team] = (pts[row.team] || 0) + weight * Math.pow(0.85, age);
  });
  cache = pts; cacheKey = key; return pts;
}
function prestige(name) {
  if (!name) return 0;
  const t = typeof teams !== 'undefined' ? teams.find(x => x.name === name) : null;
  const rep = (window.V31 && window.V31.org) ? (+window.V31.org(name).rep || 30) : 30;
  const p = table()[name] || 0;
  // команды без архива (новая игра): стартовый престиж по прошлым трофеям из данных команды
  const hist = ((window.CS2_REAL && window.CS2_REAL.legacy) || {})[name] || 0;   // известность организации до начала игры
  const legacy = hist + (t?.trophies ? (t.trophies.majors || 0) * 10 + (t.trophies.elite || 0) * 4 + (t.trophies.regular || 0) * 2 : 0);
  const v = rep * 0.45 + 55 * (1 - Math.exp(-(p + legacy) / 40));
  return Math.round(Math.max(0, Math.min(100, t?.isAcademy ? v * 0.5 : v)));
}
const stars = v => v >= 80 ? 5 : v >= 60 ? 4 : v >= 40 ? 3 : v >= 20 ? 2 : 1;
const starsHtml = v => `<span class="pr-stars" title="Престиж ${v} из 100">${'★'.repeat(stars(v))}<i>${'★'.repeat(5 - stars(v))}</i></span>`;
// множитель зарплатных требований агента: 0.8 (престиж 100) … 1.2 (престиж 0)
const wageMul = name => 1.2 - prestige(name) / 250;
const oddsAdj = (from, to) => (prestige(to) - prestige(from)) * 0.004;
const refuses = (p, from, to) => { const star = typeof isStarPlayer === 'function' && isStarPlayer(p); return star && prestige(to) < prestige(from) - 35; };
window.V33Prestige = { prestige, stars, starsHtml, wageMul, oddsAdj, refuses };

if (!H) return;
// страница команды: показатель в шапке (колонка в рейтинге — в v30-portal-people.js)
const origTeam = H.PAGES.team;
if (origTeam) H.PAGES.team = arg => {
  const name = String(arg || '').split('/')[0];
  // Every newly opened team gets the complete trophy shelf by default.
  if (lastShelfTeam !== name) { H.S.shelfT = 'all'; lastShelfTeam = name; }
  const html = origTeam(arg), v = prestige(name);
  return shelf(name, html.replace('<div><small>Титулы</small>', `<div><small>Престиж</small><b>${starsHtml(v)} <span class="hs-dim">${v}</span></b></div><div><small>Титулы</small>`));
};
// Полка трофеев прямо в шапке команды: Major первыми, затем свежие; клик — страница турнира
const RANK = { major: 0, elite: 1, regular: 2, tier2: 3, tier3: 4, academy: 5, qual: 6 };
const SHELF_T = k => k === 'honour' ? 'honour' : k === 'major' ? 'major' : k === 'elite' ? 'elite' : k === 'tier2' ? 't2' : k === 'tier3' ? 't3' : k === 'academy' ? 'ac' : k === 'qual' ? 'q' : 't1';
const SHELF_L = { all: 'Все', major: 'Major', elite: 'S-Tier', t1: 'Tier-1', t2: 'Tier-2', t3: 'Tier-3', q: 'Квалификации', ac: 'Академии', honour: 'Особые награды' };
H.SHELF_T = SHELF_T; H.SHELF_L = SHELF_L;
H.CLICKS.push(['[data-shelft]', el => { H.S.shelfT = el.dataset.shelft; const y = window.scrollY; H.render(); window.scrollTo(0, y); }]);
function shelf(name, html) {
  // Объединяем архив и историю команды: часть старых побед присутствует в team.history,
  // даже если снимок турнирной сетки не был записан в архив. Так число трофеев в полоске совпадает с титулами.
  const team = (typeof teams !== 'undefined' ? teams : []).find(t => t.name === name), arch = H.archive(), map = new Map();
  const put = (key, item) => { if (key && !map.has(key)) map.set(key, item); };
  const achievements = window.twTeamAchievements ? window.twTeamAchievements(name, team) : [];
  achievements.forEach(x => {
    const k = x.kind, season = Number(x.season) || 1, id = x.id || '', year = Number(x.year) || H.yearOf(season);
    if (x.marker || ['tier2', 'tier3', 'qual', 'academy'].includes(String(k))) return; // v84: в кабинете наград — только Tier-1 / S-Tier / Major
    const eventName = x.name, key = `event|${eventName}|${season}|${k}`;
    const art = H.trophy(eventName, season, k);
    const markup = id && arch[id]
      ? `<button type="button" class="tm-cup k-${k}${x.marker ? ' is-marker' : ''}" data-event="${H.esc(id)}" data-tip="${H.esc(eventName)} · ${year}">${art}<i>${year}</i></button>`
      : `<span class="tm-cup k-${k}${x.marker ? ' is-marker' : ''} static" title="${H.esc(eventName)} · ${year}">${art}<i>${year}</i></span>`;
    put(key, { s: season, t: x.ts || 0, k, html: markup });
  });
  const extra = (window.V33Awards && window.V33Awards.teamShelfItems) ? window.V33Awards.teamShelfItems(name) : [];
  const all = [...map.values()].concat(extra.map(x => ({ ...x, k: x.k || 'honour' }))).sort((a, b) => (b.s - a.s) || (b.t - a.t));
  if (!all.length) return html;
  const by = { all, major: all.filter(x => SHELF_T(x.k) === 'major'), elite: all.filter(x => SHELF_T(x.k) === 'elite'), t1: all.filter(x => SHELF_T(x.k) === 't1'), t2: all.filter(x => SHELF_T(x.k) === 't2'), t3: all.filter(x => SHELF_T(x.k) === 't3'), q: all.filter(x => SHELF_T(x.k) === 'q'), ac: all.filter(x => SHELF_T(x.k) === 'ac'), honour: all.filter(x => SHELF_T(x.k) === 'honour') };
  const tab = H.S.shelfT || 'all', won = tab === 'all' ? all : (by[tab] || all);
  const tabs = Object.keys(by).filter(k => by[k].length || k === 'all' || k === 't1').length > 1 ? `<div class="tm-shelf-tabs">${Object.entries(SHELF_L).filter(([k]) => by[k].length || k === 'all' || k === 't1').map(([k, l]) => `<button type="button" class="hs-chip${k === tab ? ' on' : ''}" data-shelft="${k}">${l} · ${by[k].length}</button>`).join('')}</div>` : '';
  const items = won.map(x => x.html).join('');
  const bar = `${tabs}<div class="tm-shelf" aria-label="Все награды и отметки команды">${items || '<span class="hs-dim">Трофеев этого уровня нет</span>'}</div>`;
  const i = html.indexOf('</header>');
  return i < 0 ? html + bar : html.slice(0, i + 9) + bar + html.slice(i + 9);
}

console.info('[v33] престиж команд');
})();
