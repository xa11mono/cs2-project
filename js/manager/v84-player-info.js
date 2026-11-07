/* v84 — сводка карьеры в профиле игрока (как на HLTV): призовые, места в Top-20 по годам и плашки достижений
   (Major winner, Major MVP, MVP, Игрок года, Кубок наций). Призовые — доля игрока (1/5 состава) от призовых
   команды за место на каждом турнире, где он был в заявке; стенд-ины и шоу-матчи не считаются. */
(function () {
  'use strict';
  const W = window, H = W.HS; if (!H) return;
  const esc = H.esc;
  // доля призового фонда за место (типичная сетка Tier-1)
  const SHARE = p => p === 1 ? .4 : p === 2 ? .18 : p <= 4 ? .08 : p <= 8 ? .035 : p <= 16 ? .0125 : 0;
  let memo = { k: '', v: null };
  function prizeIndex() {
    const A = H.archive(), k = Object.keys(A).length; if (memo.k === k && memo.v) return memo.v;
    const out = {};
    Object.values(A).forEach(s => {
      if (!s || s.live || !s.rost || !Array.isArray(s.results) || !s.results.length || (s.show && s.prestige !== 'nations')) return;
      const total = Number(s.prize) || (W.CS2Realism?.prizeFor?.(s.name, s.prestige) || 0); if (!total) return;
      s.results.forEach(r => { const ros = (s.rost[r.n] || []).filter(p => p && !(p.isStandIn || /STAND/i.test(p.status || ''))); if (!ros.length) return;
        const each = total * SHARE(Number(r.p) || 99) / Math.max(5, ros.length); ros.forEach(p => { out[p.nick] = (out[p.nick] || 0) + each; }); });
    });
    memo = { k, v: out }; return out;
  }
  function block(nick) {
    let rec = {}; try { rec = W.RewardSystem?.getPlayerAwards?.(nick) || {}; } catch (e) {}
    const prize = Math.round(prizeIndex()[nick] || 0);
    const top = (rec.top || []).slice().sort((a, b) => (a.y || 0) - (b.y || 0)).map(x => `<span>#${x.r} <small>('${String(x.y).slice(-2)})</small></span>`).join(', ');
    const ti = rec.ti || [], kind = x => String(x.k || x.kind || '');
    const majors = ti.filter(x => /major/i.test(kind(x))).length, nations = ti.filter(x => /nations/i.test(kind(x))).length;
    const mvpMajor = (rec.mvp || []).filter(x => /major/i.test(kind(x))).length, mvpOther = (rec.mvp || []).length - mvpMajor;
    const poty = (rec.aw || []).filter(x => x.type === 'poty').length;
    const chips = [majors && `<span class="v84-ach gold">${majors} x Major winner</span>`, mvpMajor && `<span class="v84-ach steel">${mvpMajor} x Major MVP</span>`,
      poty && `<span class="v84-ach gold">${poty} x Игрок года</span>`, mvpOther && `<span class="v84-ach steel">${mvpOther} x MVP</span>`, nations && `<span class="v84-ach nat">${nations} x Кубок наций</span>`].filter(Boolean).join('');
    if (!prize && !top && !chips) return '';
    return `<section class="hs-box v84-pinfo"><div class="v84-pi-row"><span>Призовые <small title="Доля игрока от призовых команды за места на турнирах">(?)</small></span><b>$${prize.toLocaleString('en-US')}</b></div>
      ${top ? `<div class="v84-pi-row"><span>Top 20</span><b class="v84-pi-top">${top}</b></div>` : ''}
      ${chips ? `<div class="v84-pi-row"><span>Достижения</span><div class="v84-pi-ach">${chips}</div></div>` : ''}</section>`;
  }
  // v84: всё — плашками в строке слева под ником (как остальные достижения), без отдельной панели
  function chipsHtml(nick) {
    let rec = {}; try { rec = W.RewardSystem?.getPlayerAwards?.(nick) || {}; } catch (e) {}
    const prize = Math.round(prizeIndex()[nick] || 0), kind = x => String(x.k || x.kind || '');
    const top = (rec.top || []).slice().sort((a, b) => (a.y || 0) - (b.y || 0));
    const mvpMajor = (rec.mvp || []).filter(x => /major/i.test(kind(x))).length, poty = (rec.aw || []).filter(x => x.type === 'poty').length;
    const nations = (rec.ti || []).filter(x => /nations/i.test(kind(x))).length;
    return [prize && `<span class="hs-chip static v84-c-prize" data-tip="Доля игрока от призовых команды за места на турнирах">$${prize.toLocaleString('en-US')}</span>`,
      poty && `<span class="hs-chip gold">${poty} x Игрок года</span>`,
      mvpMajor && `<span class="hs-chip static v84-c-steel">${mvpMajor} x Major MVP</span>`,
      nations && `<span class="hs-chip gold">${nations} x Кубок наций</span>`,
      top.length && `<span class="hs-chip static v84-c-top">Top 20: ${top.map(x => `#${x.r} <small>('${String(x.y).slice(-2)})</small>`).join(', ')}</span>`].filter(Boolean).join('');
  }
  (H.AFTER || []).push(page => {
    try {
      if (page !== 'player') return; const root = document.getElementById('hs-page'); if (!root) return;
      const chips = root.querySelector('.hs-phead .hs-pchips'); if (!chips || chips.querySelector('.v84-c-mark')) return;
      const nick = String(H.S.arg || '').split('/')[0], html = chipsHtml(nick);
      chips.querySelectorAll('.hs-chip.orange').forEach(el => { if (/Топ-20/.test(el.textContent)) el.parentNode.removeChild(el); }); // «лучшее #N» заменяет полная строка Top 20
      chips.insertAdjacentHTML('beforeend', '<i class="v84-c-mark" hidden></i>' + html);
    } catch (e) {}
  });
  W.CS2PlayerInfo = { block, chipsHtml, prizeIndex };
})();
