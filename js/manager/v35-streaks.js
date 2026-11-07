/* v36 — Hall of Fame: серии считаются только на Major/S-Tier/Tier-1; один лучший результат на команду.
   Считается по завершённым матчам из архива от старых к новым; у серии — длина, сезон и год,
   турниры, состав (кто играл больше всего матчей серии), идёт ли она сейчас. В список попадают серии от MIN матчей. */
(function () {
'use strict';
const H = window.HS; if (!H) return;
const MIN = 5, TOP = 15, esc = H.esc;
let cache = null, cacheKey = '';
function streaks() {
  const seen = new Set();
  const ms = H.stats().ms.filter(m => {
    if (!m || !m.w || !m.a || !m.b || m.live || !['major', 'elite', 'regular'].includes(m.kind)) return false;
    if (String(m.evId || '').startsWith('P-') || /qualifier|квалиф|showmatch|show match|academy|junior|nxt/i.test(String(m.ev || ''))) return false;
    const a = H.teamBy(m.a), b = H.teamBy(m.b);
    if (a?.isAcademy || b?.isAcademy || /academy|junior|nxt/i.test(`${m.a} ${m.b}`)) return false;
    const id = `${m.ev}|${m.season}|${m.stage}|${[m.a, m.b].sort().join('|')}|${m.w}|${Array.isArray(m.s) ? m.s.join(':') : ''}`; if (seen.has(id)) return false; seen.add(id); return true;
  }); // только Major / S-Tier / Tier-1; Tier-2/3 и академии исключены
  const key = ms.map(m => `${m.id}|${m.kind}|${m.w}|${m.ts}`).join('~');
  if (cache && key === cacheKey) return cache;
  const run = {}, out = [];
  const close = (team, cur) => { if (cur && cur.n >= MIN) out.push({ team, ...cur }); };
  ms.slice().sort((x, y) => x.ts - y.ts).forEach(m => {
    [m.a, m.b].forEach(team => {
      const won = m.w === team;
      if (!won) { close(team, run[team]); run[team] = null; return; }
      const r = run[team] || (run[team] = { n: 0, from: m, to: m, evs: [], who: {} });
      r.n++; r.to = m;
      if (!r.evs.includes(m.ev)) r.evs.push(m.ev);
      (H.rosterOf(m, team) || []).forEach(p => { if (p?.nick) r.who[p.nick] = (r.who[p.nick] || 0) + 1; });
    });
  });
  Object.entries(run).forEach(([team, r]) => { if (r) close(team, { ...r, live: true }); });
  out.sort((a, b) => b.n - a.n || (b.to.ts - a.to.ts));
  // На команду показываем одну лучшую серию: старый рекорд не дублирует текущую серию той же длины.
  const best = new Map();
  out.forEach(x => { const k = String(x.team || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase(); const old = best.get(k); if (!old || x.n > old.n || (x.n === old.n && (x.to.ts || 0) > (old.to.ts || 0))) best.set(k, x); });
  cache = [...best.values()].sort((a, b) => b.n - a.n || (b.to.ts - a.to.ts)).slice(0, TOP)
    .map(x => ({ ...x, roster: Object.entries(x.who).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n) }));
  cacheKey = key;
  return cache;
}
function box() {
  const list = streaks();
  const medal = i => i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1;
  const years = x => { const a = x.from.year || H.yearOf(x.from.season), b = x.to.year || H.yearOf(x.to.season); return a === b ? String(a) : `${a}–${b}`; };
  const rows = list.map((x, i) => `<tr data-team="${esc(x.team)}"><td class="n">${medal(i)}</td><td class="l">${H.logo(x.team, 'sm')} <b>${esc(x.team)}</b>${x.live ? ' <span class="hs-live">ИДЁТ</span>' : ''}</td>
    <td><b class="st-n">${x.n}</b></td><td class="l">${years(x)} <small class="hs-dim">· сезон ${x.from.season === x.to.season ? x.from.season : x.from.season + '–' + x.to.season}</small></td>
    <td class="l st-ev">${x.evs.slice(0, 3).map(esc).join(', ')}${x.evs.length > 3 ? ` <small class="hs-dim">+${x.evs.length - 3}</small>` : ''}</td>
    <td class="l st-ro">${x.roster.map(esc).join(', ')}</td></tr>`).join('');
  return H.box('Самые длинные серии побед', list.length ? `<div class="mp-wrap"><table class="hs-tbl hs-stbl st-tbl"><thead><tr><th>#</th><th class="l">Команда</th><th>Побед подряд</th><th class="l">Когда</th><th class="l">Турниры</th><th class="l">Состав</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : H.empty(`Пока ни одна команда не выиграла ${MIN} матчей подряд`), '', 'flush');
}
const orig = H.PAGES.awards;
H.PAGES.awards = arg => {
  const html = orig(arg);
  if (H.S.aw?.tab !== 'hof') return html;
  // Отдельная полноширинная секция после Hall of Fame, а не вставка внутрь шапки/колонки.
  return html + `<div class="st-full">${box()}</div>`;
};
window.V35Streaks = { streaks };
console.info('[v35] серии побед в зале славы');
})();
