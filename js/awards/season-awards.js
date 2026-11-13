/* v53 — индивидуальные награды HLTV выдаются при завершении сезона;
   итоги и выходы в плей-офф остаются в новостях, без блокирующих alert(). */
(function () {
'use strict';
const N = window.V29News;
const H = window.HS;
const handlers = N && N.H;
const SS = () => (typeof seasonState !== 'undefined' && seasonState) || null;
const save = () => { try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {} };

function entriesForYear(year, playerRecords) {
  const rows = [];
  const source = playerRecords?.p || playerRecords || window.RewardSystem?.getAllPlayerAwards?.() || {};
  Object.entries(source).forEach(([nick, rec]) => {
    (rec?.aw || []).forEach(a => {
      if (Number(a?.y) !== Number(year)) return;
      const type = String(a.type || '');
      const label = window.TW?.AWARD_DEF?.[type]?.title || type;
      rows.push({ nick, team: a.team || rec.team || '', type, label });
    });
  });
  const order = ['poty','awper','rifler','igl','entry','clutch','support','rookie','breakout','mostimproved','lurker','anchor','utility','youngstar'];
  return rows.sort((a,b) => order.indexOf(a.type) - order.indexOf(b.type));
}

function publishForSeason(data) {
  if (window.CS2Awards) return false; // v84: церемонию проводит единый движок наград
  const st = SS();
  if (!st || !H || !N?.add || !window.V36Fixes?.generateYearAwards) return false;
  const season = Math.max(1, Number(data?.season) || Number(st.currentSeason) - 1 || 1);
  const year = Number(data?.year) || (typeof H.yearOf === 'function' ? H.yearOf(season) : 2026 + season - 1);
  st.v53AwardNews = st.v53AwardNews || {};
  if (st.v53AwardNews[year]) return false;

  // At this point v29's season-end event fires after the final tournament has
  // been archived, so yearRows() sees the complete season including its last event.
  try { H.invalidate?.(); } catch (e) {}
  try { window.V36Fixes.generateYearAwards(year); } catch (e) { console.warn('[v53] generateYearAwards', e); return false; }

  const playerRecords = window.RewardSystem?.getAllPlayerAwards?.()
    || (window.twAwardsExport?.() || {}).p || {};
  const awards = entriesForYear(year, playerRecords);
  if (!awards.length) return false;

  // Legacy countdown news is replaced by one complete ceremony story at season end.
  if (st.v33T20 && Number(st.v33T20.y) === year) st.v33T20.next = 0;
  const top = Object.entries(playerRecords).flatMap(([nick, rec]) => (rec?.top || [])
    .filter(x => Number(x?.y) === year)
    .map(x => ({ nick, team: x.team || rec.team || '', rank: Number(x.r) || 99 })))
    .sort((a,b) => a.rank - b.rank).slice(0, 20);
  const top3 = top.filter(x => x.rank <= 3);
  const body = awards.map(x => `${x.label}: ${x.nick}${x.team ? ` (${x.team})` : ''}.`);
  if (top3.length) body.unshift(`Топ-3 HLTV: ${top3.map(x => `#${x.rank} ${x.nick} (${x.team || '—'})`).join(' · ')}.`);
  body.push('Награды рассчитаны по статистике завершённых турниров Major, S-Tier и Tier-1 за календарный год.');
  const tags = [];
  awards.slice(0, 12).forEach(x => { if (N.P) tags.push(N.P(x.nick)); if (x.team && N.T) tags.push(N.T(x.team)); });
  const poty = awards.find(x => x.type === 'poty');
  N.add({
    cat: 'award', icon: '🏆', imp: 10,
    title: `HLTV Awards ${year}: объявлены все обладатели наград`,
    lead: `Сезон ${season} завершён — опубликованы индивидуальные награды года, включая лучшего игрока, снайпера, рифлера и капитана.`,
    body, tags, player: poty?.nick || '', team: poty?.team || data?.champion || ''
  });
  st.v53AwardNews[year] = true;
  save();
  return { year, awards: awards.length, top: top.length };
}

if (handlers) {
  const baseSeasonEnd = handlers['season-end'];
  handlers['season-end'] = data => {
    if (typeof baseSeasonEnd === 'function') {
      try { baseSeasonEnd(data); } catch (e) { console.warn('[v53] previous season-end handler', e); }
    }
    try { publishForSeason(data || {}); } catch (e) { console.warn('[v53] season awards', e); }
  };
}
window.V53SeasonAwards = { publishForSeason, entriesForYear };
console.info('[v53] сезонные награды и неблокирующие итоги активны');
})();
