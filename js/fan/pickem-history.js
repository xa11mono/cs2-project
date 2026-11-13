/* v84 — история своих Pick'Em. После каждой завершённой стадии Мейджора прогноз и фактические итоги
   сохраняются (seasonState.v84PickemHist) и выходит новость «Pick'Em: итоги Stage …» — что угадано, кто 3:0,
   кто прошёл дальше и кто вылетел 0:3 (полная швейцарская сетка — на странице турнира, вкладка «Таблицы»).
   На странице Pick'Em — блок «Мои прошлые Pick'Em» по всем Мейджорам с разбором каждой стадии. */
(function () {
  'use strict';
  const W = window, H = W.HS;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);
  const store = () => { const s = ST(); return s ? (s.v84PickemHist = s.v84PickemHist || {}) : {}; };
  const STAGE = ['Stage I', 'Stage II', 'Stage III'];
  function resultsOf(st) {
    const T = st.teams || [];
    return { threeZero: T.filter(t => t.wins === 3 && t.losses === 0).map(t => t.name), advance: T.filter(t => t.wins >= 3).map(t => t.name), zeroThree: T.filter(t => t.wins === 0 && t.losses === 3).map(t => t.name) };
  }
  function tick() {
    const ct = CT(); if (!ct || !ct.isMajor || !Array.isArray(ct.majorStages)) return;
    const picks = W.v84MajorPickemFor?.(ct); if (!picks) return;
    const H_ = store(), rec = H_[ct.name] = H_[ct.name] || { name: ct.name, season: ct.season, stages: {}, id: ct.hubArchiveId || null };
    ct.majorStages.forEach((st, idx) => {
      const i = idx + 1; if (!st?.completed || rec.stages[i]) return;
      const p = picks.stages?.[i] || { threeZero: [], advance: [], zeroThree: [] }, res = resultsOf(st);
      const hit = { threeZero: (p.threeZero || []).filter(n => res.threeZero.includes(n)), advance: (p.advance || []).filter(n => res.advance.includes(n) || res.threeZero.includes(n)), zeroThree: (p.zeroThree || []).filter(n => res.zeroThree.includes(n)) };
      const made = (p.threeZero || []).length + (p.advance || []).length + (p.zeroThree || []).length, hits = hit.threeZero.length + hit.advance.length + hit.zeroThree.length;
      rec.stages[i] = { picks: JSON.parse(JSON.stringify(p)), res, hit, hits, made, at: Number(ST()?.calendar?.currentMs) || Date.now() };
      try {
        const N = W.V29News, list = a => a.length ? a.join(', ') : '—';
        N?.add?.({ cat: 'major', icon: '🎯', imp: 6, ev: ct.hubArchiveId || null,
          title: `Pick'Em ${ct.name}: итоги ${STAGE[idx]} — ${made ? `вы угадали ${hits} из ${made}` : 'прогноз не был сделан'}`,
          lead: `3:0 — ${list(res.threeZero)}. Вылетели 0:3 — ${list(res.zeroThree)}.`,
          body: [`Прошли дальше: ${list(res.advance)}.`,
            made ? `Ваш прогноз 3:0: ${list(p.threeZero || [])} (угадано ${hit.threeZero.length}). Выход: ${list(p.advance || [])} (угадано ${hit.advance.length}). 0:3: ${list(p.zeroThree || [])} (угадано ${hit.zeroThree.length}).` : 'В следующей стадии не забудьте заполнить Pick\'Em до первого матча.',
            'Полная швейцарская сетка со счетами всех матчей — на странице турнира, вкладка «Таблицы».'], tags: [] });
      } catch (e) {}
    });
  }
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(() => { try { tick(); } catch (e) {} }, 4000);
  // во время перемотки — через публикации Pick'Em
  try { const pub = W.V70PickemPublications; if (pub && typeof pub.sync === 'function' && !pub.sync.__v84hist) { const base = pub.sync; pub.sync = function () { const r = base.apply(this, arguments); try { tick(); } catch (e) {} return r; }; pub.sync.__v84hist = true; } } catch (e) {}

  if (!H) return;
  const { esc } = H;
  const chip = (n, ok) => `<span class="v84-pkh-t ${ok === true ? 'ok' : ok === false ? 'no' : ''}" title="${esc(n)}">${H.logo ? H.logo(n, 'xs') : ''}${esc(n)}</span>`;
  function historyHtml() {
    const all = Object.values(store()).filter(r => Object.keys(r.stages || {}).length).sort((a, b) => (b.season || 0) - (a.season || 0));
    if (!all.length) return '';
    return H.box("Мои прошлые Pick'Em", all.map(r => `<div class="v84-pkh"><h4>${esc(r.name)}${r.id ? ` <button type="button" class="hs-more" data-event="${esc(r.id)}">сетка →</button>` : ''}</h4>
      ${Object.entries(r.stages).map(([i, s]) => `<div class="v84-pkh-st"><b>${STAGE[i - 1] || 'Stage ' + i}</b><em>${s.made ? `${s.hits}/${s.made}` : 'без прогноза'}</em>
        <div><small>3:0</small>${(s.picks.threeZero || []).map(n => chip(n, s.res.threeZero.includes(n))).join('') || '<i>—</i>'}</div>
        <div><small>Выход</small>${(s.picks.advance || []).map(n => chip(n, s.res.advance.includes(n) || s.res.threeZero.includes(n))).join('') || '<i>—</i>'}</div>
        <div><small>0:3</small>${(s.picks.zeroThree || []).map(n => chip(n, s.res.zeroThree.includes(n))).join('') || '<i>—</i>'}</div></div>`).join('')}</div>`).join(''));
  }
  const base = H.PAGES.pickem;
  if (typeof base === 'function') H.PAGES.pickem = function () { const html = base.apply(this, arguments); try { return html + historyHtml(); } catch (e) { return html; } };
  W.CS2PickemHistory = { tick, store };
})();
