/* v93 — Этап 3 · эпохи организаций.

   У каждой организации своя эпоха, и она вытекает из истории, а не назначается сценарием:
     • доминирование — 2+ титула Tier-1/S-Tier/Major за полгода или 12 из 13 последних недель в топ-2 рейтинга;
     • возвращение на вершину — сейчас топ-5, а полгода–год назад клуб большую часть времени был вне топ-10;
     • кризис — падение на 15+ мест за полгода (и сейчас вне топ-15);
     • перестройка — 3+ изменения состава за полгода (журнал Roster Engine);
     • эпоха молодёжи — средний возраст основы 22.5 и меньше;
     • стабильность — всё остальное.
   Новая эпоха засчитывается, если держится 2 недели подряд. История эпох хранится (seasonState.v93Eras.hist) и видна на
   странице команды; начало доминирования, кризиса, возвращения и конец доминирования — в новостях.
   Пороги — CS2Config 'era.*' (design). */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const DAY = 864e5, WEEK = 7 * DAY;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const ranked = () => pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const news = it => { try { W.V29News && W.V29News.add && W.V29News.add(it); } catch (e) {} };
  const L = { dominance: 'доминирование', return: 'возвращение на вершину', crisis: 'кризис', rebuild: 'перестройка', youth: 'эпоха молодёжи', stable: 'стабильность' };
  const S = () => { const s = seasonState.v93Eras = seasonState.v93Eras || { wk: 0, ranks: {}, cur: {}, cand: {}, hist: {} }; return s; };

  function titlesSince(name, ms) {
    let A = {}; try { A = W.hubArchiveExport ? W.hubArchiveExport() : {}; } catch (e) {}
    return Object.values(A).filter(x => x && !x.show && x.champion === name && /major|elite|regular/i.test(String(x.prestige || x.kind || '')) && (Number(x.ge || x.ts || x.gs) || 0) >= ms).length;
  }
  function changesSince(name, ms) {
    const J = (typeof transferState !== 'undefined' && transferState.v90Journal) || [];
    return J.filter(e => e && e.type === 'ROSTER_CHANGE' && e.team === name && e.ts >= ms && ['fa', 'buy', 'academy', 'loan', 'user', 'retire-replacement', 'loan-buyout'].includes(e.kind)).length;
  }
  function judge(t, rk, hist) {
    const half = now() - 182 * DAY, h = hist || [];
    const st = (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
    const avgAge = st.length ? st.reduce((a, p) => a + (+p.age || 25), 0) / st.length : 25;
    const titles = titlesSince(t.name, half);
    if (titles >= C('era.domTitles', 2) || (h.length >= 13 && h.slice(0, 13).filter(r => r <= 2).length >= 12)) return { key: 'dominance', why: titles >= 2 ? `${titles} титула за полгода` : 'три месяца в топ-2' };
    const old = h.slice(26, 52);
    if (rk <= 5 && old.length >= 13 && old.filter(r => r > 10).length >= old.length * 0.6) return { key: 'return', why: `топ-${rk} после долгого периода вне топ-10` };
    const was = h[25];
    if (was && rk - was >= C('era.crisisDrop', 15) && rk > 15) return { key: 'crisis', why: `№${was} → №${rk} за полгода` };
    const ch = changesSince(t.name, half);
    if (ch >= C('era.rebuildChanges', 3)) return { key: 'rebuild', why: `${ch} изменений состава за полгода` };
    if (avgAge <= C('era.youthAge', 22.5)) return { key: 'youth', why: `средний возраст основы ${avgAge.toFixed(1)}` };
    return { key: 'stable', why: '' };
  }
  function weekly(force) {
    const s = S(), wk = Math.floor(now() / WEEK); if (!force && s.wk === wk) return 0; s.wk = wk;
    let n = 0;
    ranked().forEach((t, i) => {
      const rk = i + 1, h = s.ranks[t.name] = s.ranks[t.name] || []; h.unshift(rk); if (h.length > 52) h.length = 52;
      const j = judge(t, rk, h), cur = s.cur[t.name];
      if (!cur) { s.cur[t.name] = { key: j.key, since: now(), why: j.why }; (s.hist[t.name] = s.hist[t.name] || []).unshift({ key: j.key, from: now(), why: j.why }); return; }
      if (j.key === cur.key) { s.cand[t.name] = null; return; }
      const c = s.cand[t.name];
      if (!c || c.key !== j.key) { s.cand[t.name] = { key: j.key, n: 1, why: j.why }; return; }
      // эпоха держится вторую неделю — засчитываем
      const hist = s.hist[t.name] = s.hist[t.name] || [];
      if (hist[0]) hist[0].to = now();
      hist.unshift({ key: j.key, from: now(), why: j.why }); if (hist.length > 20) hist.length = 20;
      const prev = cur.key; s.cur[t.name] = { key: j.key, since: now(), why: j.why }; s.cand[t.name] = null; n++;
      if (j.key === 'dominance') news({ cat: 'ranking', icon: '👑', imp: 7, title: `Эпоха ${t.name}`, lead: `${j.why}: соперники ищут ответ.`, body: [], tags: [{ t: 'team', v: t.name }] });
      else if (prev === 'dominance') news({ cat: 'ranking', icon: '🌅', imp: 6, title: `Конец эпохи ${t.name}`, lead: `Доминирование закончилось: теперь — ${L[j.key]}.`, body: [], tags: [{ t: 'team', v: t.name }] });
      else if (j.key === 'crisis') news({ cat: 'ranking', icon: '📉', imp: 5, title: `${t.name} в кризисе`, lead: j.why, body: [], tags: [{ t: 'team', v: t.name }] });
      else if (j.key === 'return') news({ cat: 'ranking', icon: '🔁', imp: 6, title: `${t.name} возвращается на вершину`, lead: j.why, body: [], tags: [{ t: 'team', v: t.name }] });
    });
    return n;
  }
  W.CS2Eras = { weekly, of: name => S().cur[name] || null, history: name => (S().hist[name] || []).slice(), judge, LABELS: L };
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { if (!W.v57BatchCalendarSkip) weekly(); } catch (e) { console.warn('[v93 eras]', e); } }, 5000, 'v93-eras');
  (function hookDaily() {
    const f = W.V30RankSnapshotTick; if (typeof f !== 'function') { setTimeout(hookDaily, 1000); return; }
    if (f.__v93e) return;
    const w = function () { const r = f.apply(this, arguments); try { weekly(); } catch (e) {} return r; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v93e = true; W.V30RankSnapshotTick = w;
  })();

  // эпоха на странице команды
  const H = W.HS, SHOWN = new Set(['dominance', 'return', 'crisis']);
  if (H && Array.isArray(H.AFTER)) H.AFTER.push(page => {
    if (page !== 'team') return;
    try {
      // название — из адреса страницы: в заголовке рядом с ним кнопка «☆ Стать фанатом»
      const root = document.getElementById('hs-page'), name = (H.S && H.S.arg ? decodeURIComponent(String(H.S.arg).split('/')[0]) : '');
      const t = teams.find(x => x.name === name); if (!t || t.isAcademy || root.querySelector('.v93-era')) return;
      // v97: блок эпохи — только когда она есть: доминирование, возвращение на вершину или кризис. «Стабильность»,
      // «перестройка» и «молодёжь» — не эпоха; раньше блок «Эпоха: …» висел в профиле каждой команды всегда.
      const cur = S().cur[name], hist = (S().hist[name] || []).filter(x => SHOWN.has(x.key)); if (!cur || !SHOWN.has(cur.key)) return;
      const f = ms => { try { return H.fdate(ms); } catch (e) { return new Date(ms).toLocaleDateString('ru-RU'); } };
      const html = `<section class="hs-box v93-era"><header class="hs-box-h"><h3>Эпоха: ${H.esc(L[cur.key])}</h3><span class="hs-sub">с ${f(cur.since)}${cur.why ? ' · ' + H.esc(cur.why) : ''}</span></header>
        ${hist.length > 1 ? `<div class="hs-box-b"><ul>${hist.filter(x => x.from !== cur.since).slice(0, 7).map(x => `<li>${H.esc(L[x.key])} — ${f(x.from)}${x.to ? '–' + f(x.to) : ''}${x.why ? ' · ' + H.esc(x.why) : ''}</li>`).join('')}</ul></div>` : ''}</section>`;
      const head = root.querySelector('.hs-head') || root.firstElementChild; if (head) head.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('afterbegin', html);
    } catch (e) {}
  });
})();
