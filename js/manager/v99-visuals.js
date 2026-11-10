/* v99 — схемы и диаграммы вместо текста. Только данные игры, ничего не выдумывается:
     • «Состав»: профиль команды — диаграмма четырёх навыков (среднее основы против среднего топ-10 рейтинга).
     • «Тактика»: круг «кто кого бьёт» — строится из CS2Tactics.M, той же матрицы, по которой считает матч;
       на узлах — сколько ваших карт играет этот план.
     • «Финансы»: полосы у строк прогноза сезона (доходы вправо, расходы влево).
     • «Тренировки»: эффект выбранного плана значками (что растёт, что падает) — из V31.TRAIN и интенсивности.
   Стили — css/v99-visuals.css, значения — DESIGN.md (раздел v99). */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31; if (!H || !V) return;
  const esc = H.esc, n = v => Math.round(v * 10) / 10;
  const me = () => { try { return V.managed() || ''; } catch (e) { return ''; } };
  const team = () => H.teamBy(me());
  const wrap = (key, fn) => { const old = H.PAGES[key]; if (typeof old !== 'function' || old.__v99) return; const w = function () { const html = old.apply(this, arguments); try { return fn(html) || html; } catch (e) { console.warn('[v99]', key, e); return html; } }; Object.keys(old).forEach(k => { w[k] = old[k]; }); w.__v99 = true; H.PAGES[key] = w; };
  const parse = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };
  const out = frag => { const d = document.createElement('div'); d.appendChild(frag); return d.innerHTML; };

  /* ------------------------------------------------------------ состав: профиль команды */
  const AX = [['firepower', 'Огонь'], ['tacticalIQ', 'Тактика'], ['clutch', 'Клатч'], ['utility', 'Гранаты']];
  const avg = (ps, k) => ps.length ? ps.reduce((s, p) => s + (+p[k] || 0), 0) / ps.length : 0;
  function radar(mine, ref) {
    const CX = 150, CY = 112, R = 76, lo = 70, hi = 100, pt = (i, v) => { const a = -Math.PI / 2 + i * Math.PI / 2, r = R * Math.max(.04, Math.min(1, (v - lo) / (hi - lo))); return [n(CX + Math.cos(a) * r), n(CY + Math.sin(a) * r)]; };
    const poly = vals => vals.map((v, i) => pt(i, v).join(',')).join(' ');
    const grid = [80, 90, 100].map(v => `<polygon points="${poly([v, v, v, v])}" class="g"/>`).join('') + AX.map((_, i) => { const p = pt(i, hi); return `<line x1="${CX}" y1="${CY}" x2="${p[0]}" y2="${p[1]}" class="g"/>`; }).join('') +
      [80, 90, 100].map(v => `<text x="${CX + 4}" y="${n(CY - R * (v - lo) / (hi - lo) + 11)}" class="t">${v}</text>`).join('');
    const lab = AX.map(([, l], i) => { const a = -Math.PI / 2 + i * Math.PI / 2, x = CX + Math.cos(a) * (R + 10), y = CY + Math.sin(a) * (R + 14); return `<text x="${n(x)}" y="${n(y + 4)}" text-anchor="${i === 1 ? 'start' : i === 3 ? 'end' : 'middle'}">${l}</text>`; }).join('');
    const dots = mine.map((v, i) => { const p = pt(i, v); return `<circle cx="${p[0]}" cy="${p[1]}" r="3" class="d"/>`; }).join('');
    return `<svg class="v99-radar" viewBox="0 0 300 224" role="img" aria-label="Навыки основы: ${AX.map(([, l], i) => l + ' ' + Math.round(mine[i])).join(', ')}">${grid}<polygon points="${poly(ref)}" class="r"/><polygon points="${poly(mine)}" class="m"/>${dots}${lab}</svg>`;
  }
  wrap('squad', html => {
    const t = team(); if (!t) return;
    const r = parse(html), host = r.querySelector('.v98-squad'); if (!host) return;
    const s = (t.players || []).filter(p => p && p.nick), top = H.ranked().filter(x => !x.isAcademy).slice(0, 10).flatMap(x => x.players || []);
    const mine = AX.map(([k]) => avg(s, k)), ref = AX.map(([k]) => avg(top, k));
    let chem = null; try { chem = Math.round(V.chemistry(t) * 100); } catch (e) {}
    const age = avg(s, 'age'), rows = AX.map(([, l], i) => { const d = mine[i] - ref[i]; return `<tr><th scope="row">${l}</th><td>${Math.round(mine[i])}</td><td class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲ +' : '▼ −'}${Math.abs(d).toFixed(1)}</td></tr>`; }).join('');
    const sec = document.createElement('section'); sec.className = 'v98-box v99-profile';
    sec.innerHTML = `<h3>Профиль команды</h3><div class="v99-prof">${radar(mine, ref)}
      <div class="v99-prof-t"><table><thead><tr><th>Навык</th><th>Основа</th><th>к топ-10</th></tr></thead><tbody>${rows}</tbody></table>
        <p class="v99-leg"><span><i class="m"></i>ваша основа</span><span><i class="r"></i>среднее топ-10 рейтинга</span></p></div>
      <div class="v99-kpi">${chem == null ? '' : `<div><small>Сыгранность</small><b>${chem}%</b><i><em style="width:${chem}%"></em></i></div>`}
        <div><small>Средний возраст</small><b>${age ? age.toFixed(1) : '—'}</b></div><div><small>Роли в основе</small><b class="v99-roles">${['IGL', 'AWPer'].map(k => `<span class="${s.some(p => p.role === k) ? 'ok' : 'no'}">${k === 'IGL' ? 'капитан' : 'снайпер'} ${s.some(p => p.role === k) ? '✓' : '—'}</span>`).join('')}</b></div></div></div>`;
    const first = host.querySelector('.v98-box'); if (first) host.insertBefore(sec, first); else host.appendChild(sec);
    return out(r);
  });

  /* ------------------------------------------------------------ тактика: круг «кто кого бьёт» */
  wrap('tactics', html => {
    const T = W.CS2Tactics, t = team(); if (!T || !T.M || !t) return;
    const r = parse(html), old = r.querySelector('.v97-rps'); if (!old) return;
    // цепочка: атака бьёт оборону (M = 1), эта оборона бьёт следующую атаку (M = −1) …
    const tk = Object.keys(T.T_L).filter(k => k !== 'default'), ck = Object.keys(T.CT_L).filter(k => k !== 'default'), ring = [];
    let cur = tk[0];
    for (let i = 0; i < tk.length && cur; i++) { const ct = ck.find(c => (T.M[cur] || {})[c] === 1); if (!ct) break; ring.push({ side: 't', k: cur, l: T.T_L[cur] }, { side: 'ct', k: ct, l: T.CT_L[ct] }); cur = tk.find(x => (T.M[x] || {})[ct] === -1 && !ring.some(q => q.side === 't' && q.k === x)); }
    if (ring.length < 4) return;
    const maps = (typeof MAP_POOL !== 'undefined' ? MAP_POOL : []), use = { t: {}, ct: {} };
    maps.forEach(m => { try { const p = T.plan(t, m); use.t[p.t] = (use.t[p.t] || 0) + 1; use.ct[p.ct] = (use.ct[p.ct] || 0) + 1; } catch (e) {} });
    const CX = 210, CY = 176, R = 104, N = ring.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / N;
    let g = '';
    ring.forEach((_, i) => { const a0 = ang(i), a1 = ang(i + 1), pad = .3;
      const p0 = [CX + Math.cos(a0 + pad) * R, CY + Math.sin(a0 + pad) * R], p1 = [CX + Math.cos(a1 - pad) * R, CY + Math.sin(a1 - pad) * R];
      g += `<path d="M${n(p0[0])} ${n(p0[1])}A${R} ${R} 0 0 1 ${n(p1[0])} ${n(p1[1])}" class="arc" marker-end="url(#v99ar)"/>`; });
    ring.forEach((x, i) => { const a = ang(i), px = CX + Math.cos(a) * R, py = CY + Math.sin(a) * R, cnt = use[x.side][x.k] || 0, words = x.l.split(' ');
      const cs = Math.cos(a), sn = Math.sin(a), side = Math.abs(cs) > .3, lx = side ? px + Math.sign(cs) * 32 : px, ly = side ? py - (words.length - 1) * 6.5 + 4 : sn < 0 ? py - 32 - (words.length - 1) * 13 : py + 42;
      g += `<g class="nd ${x.side}${cnt ? ' on' : ''}">${x.side === 't' ? `<rect x="${n(px - 21)}" y="${n(py - 21)}" width="42" height="42" rx="8"/>` : `<circle cx="${n(px)}" cy="${n(py)}" r="22"/>`}<text x="${n(px)}" y="${n(py + 4.5)}" class="s">${x.side === 't' ? 'T' : 'CT'}</text>
        <text y="${n(ly)}" class="l" text-anchor="${side ? (cs > 0 ? 'start' : 'end') : 'middle'}">${words.map((w, j) => `<tspan x="${n(lx)}" dy="${j ? 13 : 0}">${esc(w)}</tspan>`).join('')}</text>
        ${cnt ? `<g class="cn"><circle cx="${n(px + 19)}" cy="${n(py - 19)}" r="9"/><text x="${n(px + 19)}" y="${n(py - 15)}">${cnt}</text></g>` : ''}</g>`; });
    const fig = document.createElement('aside'); fig.className = 'v97-rps v99-ring';
    fig.innerHTML = `<h4>Кто кого бьёт</h4><svg viewBox="0 0 420 352" role="img" aria-label="${esc(ring.map((x, i) => `${x.l} бьёт: ${ring[(i + 1) % N].l}`).join('; '))}"><defs><marker id="v99ar" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z"/></marker></defs>${g}<text x="${CX}" y="${CY - 3}" class="mid">стрелка —</text><text x="${CX}" y="${CY + 13}" class="mid">«бьёт»</text></svg>
      <p class="v99-leg"><span><i class="sq"></i>атака (T)</span><span><i class="ci"></i>оборона (CT)</span><span><b>3</b> — на скольких ваших картах</span></p>`;
    old.replaceWith(fig);
    const note = r.querySelector('.hs-box-b > .hs-note'); if (note) note.classList.add('v99-fine');
    return out(r);
  });

  /* ------------------------------------------------------------ финансы: полосы у строк прогноза */
  wrap('finance', html => {
    if (!me()) return;
    const r = parse(html), box = [...r.querySelectorAll('.hs-box')].find(b => /Прогноз сезона/.test((b.querySelector('.hs-box-h h3') || {}).textContent || '')), tbl = box && box.querySelector('.hs-tbl'); if (!tbl) return;
    const rows = [...tbl.querySelectorAll('tr')].map(tr => { const td = tr.querySelectorAll('td'); if (td.length < 2) return null; const tx = td[td.length - 1].textContent.replace(/\s/g, ''), v = (/[−-]/.test(tx) ? -1 : 1) * (+tx.replace(/[^0-9.]/g, '') || 0); return { tr, v, total: !!td[0].querySelector('b') }; }).filter(Boolean);
    const max = Math.max(1, ...rows.filter(x => !x.total).map(x => Math.abs(x.v)));
    rows.forEach(x => { const td = document.createElement('td'); td.className = 'v99-barc';
      td.innerHTML = `<span class="v99-div${x.total ? ' tot' : ''}" aria-hidden="true"><i class="${x.v < 0 ? 'neg' : 'pos'}" style="width:${x.v ? Math.max(1.5, Math.min(50, Math.abs(x.v) / max * 50)).toFixed(1) : 0}%"></i></span>`;
      x.tr.insertBefore(td, x.tr.lastElementChild); });
    tbl.classList.add('v99-fin');
    return out(r);
  });

  /* ------------------------------------------------------------ тренировки: эффект плана значками */
  const A_L = { firepower: 'Огонь', tacticalIQ: 'Тактика', clutch: 'Клатч', utility: 'Гранаты' };
  function effect() {
    const t = team(); if (!t) return '';
    let tr; try { const o = V.org(t.name); tr = o.train || V.aiTrainingPlan(t); } catch (e) { return ''; }
    const f = (V.TRAIN || {})[tr.focus] || {}, k = ((V.INTENS || {})[tr.intensity] || { k: 1, fat: 2 }), chips = [];
    Object.keys(f.attrs || {}).forEach(a => chips.push(['up', A_L[a] || a]));
    if (f.chem) chips.push(['up', 'Сыгранность']);
    if (f.map) chips.push(['up', 'Карта ' + (tr.map || '')]);
    if (f.conf) chips.push(['up', 'Уверенность']);
    if (tr.focus === 'recovery') chips.push(['up', 'Свежесть']);
    if (k.fat > 0) chips.push(['dn', `Усталость +${k.fat}`]); else if (k.fat < 0) chips.push(['up', `Отдых ${k.fat}`]);
    return `<div class="v99-fx" aria-label="Эффект плана"><small>Эффект недели · рост ×${k.k}</small><div>${chips.map(([c, l]) => `<span class="${c}"><i>${c === 'up' ? '▲' : '▼'}</i>${esc(l)}</span>`).join('')}</div></div>`;
  }
  function trainFx() {
    document.querySelectorAll('.v96-train').forEach(tr => { const sum = tr.querySelector('.v96-sum'); if (!sum) return; const html = effect(); let fx = tr.querySelector('.v99-fx');
      if (!fx) { const d = document.createElement('div'); d.innerHTML = html; fx = d.firstElementChild; if (fx) sum.after(fx); }
      else if (fx.outerHTML !== html) { const d = document.createElement('div'); d.innerHTML = html; if (d.firstElementChild) fx.replaceWith(d.firstElementChild); } });
  }
  if (H.AFTER) H.AFTER.push(trainFx);
  setInterval(() => { try { if (me()) trainFx(); } catch (e) {} }, 700);
  console.info('[v99] схемы и диаграммы');
})();
