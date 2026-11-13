/* v127 — жетоны Pick'Em, капсулы и коллекция наклеек (режим зрителя и менеджера).

   Жетоны: за каждое выполненное испытание Pick'Em (страница Pick'Em → «Испытание») — +100, за активацию монеты — +50,
   за каждое улучшение монеты Мейджора (серебро, золото, алмаз) — +300. Начисляются один раз (seasonState.v127Inv.claimed).
   Магазин: у каждого Мейджора — капсулы Legends / Challengers / Contenders (стикеры команд своего этапа и стикер турнира)
   и капсула автографов. Открытие — лента-рулетка как в CS2: остановка на выпавшей наклейке, редкость по исполнению
   (Paper — синий, Glitter — фиолетовый, Holo — розовый, Gold — золотой). Всё выпавшее хранится в коллекции. */
(function () {
  'use strict';
  const W = window, H = W.HS; if (!H) return;
  const esc = H.esc, D = document;
  const SS = () => (typeof seasonState !== 'undefined' ? seasonState : null);
  const save = () => { try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {} };
  const inv = () => { const s = SS(); if (!s) return null; const v = s.v127Inv = s.v127Inv || { tokens: 0, claimed: {}, items: [], opened: 0, earned: [] }; v.items = v.items || []; v.claimed = v.claimed || {}; v.earned = v.earned || []; return v; };
  const REWARD = { challenge: 100, coin: 50, upgrade: 300 };
  const PRICE = { legends: 250, challengers: 250, contenders: 200, autographs: 400 };
  const RAR = { paper: ['Paper', '#4b69ff', 'Высшего класса'], glitter: ['Glitter', '#8847ff', 'Примечательного типа'], holo: ['Holo', '#d32ce6', 'Экзотичного вида'], gold: ['Gold', '#eb4b4b', 'Экстраординарного типа'] };
  const FIN = ['paper', 'glitter', 'holo', 'gold'];
  const ODDS = { sticker: [['paper', 70], ['glitter', 20], ['holo', 8], ['gold', 2]], auto: [['paper', 68], ['glitter', 20], ['holo', 9], ['gold', 3]] };
  const plural = (v, a, b, c) => v % 10 === 1 && v % 100 !== 11 ? a : v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 10 || v % 100 >= 20) ? b : c;
  const tok = v => `${v} ${plural(v, 'жетон', 'жетона', 'жетонов')}`;

  // ---------------------------------------------------------------- начисление жетонов
  function sync() {
    const v = inv(); if (!v) return 0;
    let title = ''; try { title = (W.V33Pickem.publicContext() || {}).title || ''; } catch (e) {}
    if (!title) { const s = SS(); title = (s && s.v33Pickem && s.v33Pickem.t) || ''; }
    if (!title || !W.CS2PickemSkin || !W.CS2PickemSkin.challenges) return 0;
    let got = 0;
    W.CS2PickemSkin.challenges(title).forEach((c, i) => {
      const k = `${title}|ch${i}`; if (c.st !== 'done' || v.claimed[k]) return;
      const r = c.ic === 'coin' ? REWARD.coin : REWARD.challenge; v.claimed[k] = 1; v.tokens += r; got += r; v.earned.unshift({ t: c.t, r, m: title, at: Date.now() });
    });
    try { const s = SS(), m = s.v33Pickem && s.v33Pickem.t === title ? s.v33Pickem.major : null, pts = Math.max(0, Number(m && m.earnedPoints) || 0), LV = (W.V35Badges && W.V35Badges.LV) || [];
      LV.forEach((x, i) => { if (!i || pts < x[0]) return; const k = `${title}|lv${i}`; if (v.claimed[k]) return; v.claimed[k] = 1; v.tokens += REWARD.upgrade; got += REWARD.upgrade; v.earned.unshift({ t: `Монета улучшена: ${x[1]}`, r: REWARD.upgrade, m: title, at: Date.now() }); }); } catch (e) {}
    v.earned = v.earned.slice(0, 40);
    if (got) { save(); try { W.V29Toast ? 0 : 0; } catch (e) {} }
    return got;
  }

  // ---------------------------------------------------------------- капсулы
  function majors() { let list = []; try { list = W.CS2Stickers.capsules() || []; } catch (e) {} return list.slice(0, 4); }
  function capsOf(m) {
    const t = (m.teams || []).map(x => x.name);
    return [
      { id: 'legends', n: 'Legends', teams: t.slice(0, 8), kind: 'sticker' },
      { id: 'challengers', n: 'Challengers', teams: t.slice(8, 16), kind: 'sticker' },
      { id: 'contenders', n: 'Contenders', teams: t.slice(16), kind: 'sticker' },
      { id: 'autographs', n: 'Автографы', teams: t.slice(0, 8), kind: 'auto' }
    ].filter(c => c.teams.length);
  }
  const maj = m => ({ name: m.name, year: m.year, champion: m.champion || '' });
  function art(it, m) {
    const S = W.CS2Stickers; if (!S) return '';
    try { const mm = { name: it.m, year: it.y };
      if (it.k === 'event') return S.eventSticker(mm, it.f);
      if (it.k === 'auto') return S.autograph(mm, it.p, it.t, it.f);
      return S.teamSticker(mm, it.t, it.f);
    } catch (e) { return ''; }
  }
  function pick(arr, r) { return arr[Math.floor(r * arr.length) % arr.length]; }
  // всё содержимое капсулы: каждая наклейка во всех четырёх исполнениях (синие Paper, фиолетовые Glitter, розовые Holo, красные Gold)
  function contents(m, cap) {
    const base = [];
    if (cap.kind === 'auto') (m.teams || []).filter(x => cap.teams.includes(x.name)).forEach(x => (x.players || []).forEach(pn => base.push({ k: 'auto', t: x.name, p: String(pn) })));
    else { cap.teams.forEach(t => base.push({ k: 'team', t })); base.push({ k: 'event', t: '' }); }
    const out = []; FIN.forEach(f => base.forEach(b => out.push(Object.assign({ f, m: m.name, y: m.year, c: cap.id }, b))));
    return out;
  }
  function roll(m, cap, list) {
    const odds = ODDS[cap.kind === 'auto' ? 'auto' : 'sticker'], tot = odds.reduce((a, x) => a + x[1], 0);
    let r = Math.random() * tot, f = 'paper'; for (const [k, w] of odds) { if (r < w) { f = k; break; } r -= w; }
    const pool = (list || contents(m, cap)).filter(x => x.f === f);
    return Object.assign({}, pick(pool, Math.random()));
  }
  const cityOf = name => String(name || '').replace(/\b(PGL|IEM|BLAST(\.tv)?|Perfect World|StarLadder|FiRe|ESL( One)?|CS2?|Major|20\d\d)\b/gi, '').replace(/\s+/g, ' ').trim();
  const finTag = f => f === 'paper' ? '' : ` (${RAR[f][0]})`;
  const shortOf = it => it.k === 'event' ? cityOf(it.m) : it.k === 'auto' ? it.p : it.t;
  const nameOf = it => `${it.k === 'auto' ? 'Автограф' : 'Наклейка'} | ${shortOf(it)}${finTag(it.f)}`;
  const fullName = it => `${nameOf(it)} | ${cityOf(it.m)} ${it.y}`;
  // визуал капсулы: «банка» в цветах Мейджора со стикерами команд вокруг
  function capArt(m, cap) {
    let ev = ''; try { ev = W.CS2Stickers.eventSticker(maj(m), cap.id === 'legends' ? 'holo' : cap.id === 'challengers' ? 'glitter' : cap.id === 'autographs' ? 'gold' : 'paper'); } catch (e) {}
    const ring = cap.teams.slice(0, 6).map((n, i, a) => { const ang = i / a.length * Math.PI * 2 - Math.PI / 2; let s = ''; try { s = cap.kind === 'auto' ? '' : W.CS2Stickers.teamSticker(maj(m), n, 'paper'); } catch (e) {}
      return s ? `<span class="cpx-rs" style="left:${(50 + Math.cos(ang) * 36).toFixed(1)}%;top:${(50 + Math.sin(ang) * 33).toFixed(1)}%">${s}</span>` : ''; }).join('');
    return `<span class="cpx-tin ${cap.id}"><i></i><span class="cpx-ev">${ev}</span></span>${ring}${cap.kind === 'auto' ? '<span class="cpx-sig">Autographs</span>' : ''}`;
  }

  // ---------------------------------------------------------------- страница
  H.S.cpx = H.S.cpx || { tab: 'shop', open: null, f: '' };
  function page() {
    sync();
    const v = inv() || { tokens: 0, items: [], earned: [] }, U = H.S.cpx, list = majors();
    const tabs = [['shop', 'Капсулы'], ['inv', `Коллекция · ${v.items.length}`], ['earn', 'Жетоны']].map(([k, l]) => `<button type="button" class="cpx-tab${U.tab === k ? ' on' : ''}" data-cpxtab="${k}">${esc(l)}</button>`).join('');
    const head = `<section class="cpx-head"><div><small>Режим зрителя · награды Pick'Em</small><h1>Капсулы и наклейки</h1><p>Выполняйте испытания Pick'Em, получайте жетоны и открывайте капсулы Мейджоров. Каждая наклейка сохраняется в коллекции.</p></div>
      <div class="cpx-bal"><span class="cpx-coin"></span><div><b>${v.tokens}</b><small>${plural(v.tokens, 'жетон', 'жетона', 'жетонов')}</small></div></div></section><nav class="cpx-tabs">${tabs}</nav>`;
    let body = '';
    if (U.tab === 'inv') {
      const F = U.f, items = v.items.filter(it => !F || it.f === F);
      const cnt = k => v.items.filter(it => it.f === k).length;
      const chips = [['', 'Все', v.items.length]].concat(Object.keys(RAR).map(k => [k, RAR[k][0], cnt(k)])).map(([k, l, n]) => `<button type="button" class="cpx-chip${F === k ? ' on' : ''}" data-cpxf="${k}" style="--rc:${k ? RAR[k][1] : '#8f9cad'}">${esc(l)} <i>${n}</i></button>`).join('');
      body = `<div class="cpx-chips">${chips}</div>` + (items.length ? `<div class="cpx-grid">${items.slice(0, 120).map((it, i) => `<button type="button" class="cpx-card" data-cpxinv="${i}" style="--rc:${RAR[it.f][1]}"><div class="cpx-card-art">${art(it)}</div><b>${esc(shortOf(it))}</b><small>${esc(RAR[it.f][0])} · ${esc(cityOf(it.m))} ${esc(it.y)}</small></button>`).join('')}</div>`
        : `<div class="cpx-empty"><b>Коллекция пуста</b><span>Откройте первую капсулу — наклейка появится здесь.</span><button type="button" class="cpx-btn" data-cpxtab="shop">К капсулам</button></div>`);
    } else if (U.tab === 'earn') {
      let ch = []; let title = ''; try { title = (W.V33Pickem.publicContext() || {}).title || (SS().v33Pickem || {}).t || ''; ch = title ? W.CS2PickemSkin.challenges(title) : []; } catch (e) {}
      body = `<div class="cpx-earn"><section class="cpx-box"><h3>Как получить жетоны${title ? ` · ${esc(title)}` : ''}</h3><ul class="cpx-rules">${ch.map(c => `<li class="${c.st}"><span>${esc(c.t)}</span><b>+${c.ic === 'coin' ? REWARD.coin : REWARD.challenge}</b></li>`).join('') || '<li><span>Испытания появятся, когда откроется Pick\'Em ближайшего Мейджора</span></li>'}
        <li class="bonus"><span>Каждое улучшение монеты Мейджора (Серебро, Золото, Алмаз)</span><b>+${REWARD.upgrade}</b></li></ul><button type="button" class="cpx-btn" data-nav="pickem">Открыть Pick'Em</button></section>
        <section class="cpx-box"><h3>Последние начисления</h3>${v.earned.length ? `<ul class="cpx-log">${v.earned.slice(0, 14).map(e => `<li><span>${esc(e.t)}<small>${esc(e.m)}</small></span><b>+${e.r}</b></li>`).join('')}</ul>` : '<p class="cpx-note">Пока ничего — выполните первое испытание Pick\'Em.</p>'}</section></div>`;
    } else {
      body = list.length ? list.map(m => `<section class="cpx-major"><header><h2>${esc(m.name)}</h2>${m.champion ? `<span>Чемпион: ${esc(m.champion)}</span>` : '<span class="live">Капсулы в продаже</span>'}</header><div class="cpx-caps">${capsOf(m).map(c => {
          const pr = PRICE[c.id], can = v.tokens >= pr;
          return `<div class="cpx-cap" data-cpxopen="${esc(m.name)}|${c.id}" role="button" tabindex="0"><div class="cpx-cap-art">${capArt(m, c)}</div><b>Капсула ${esc(c.n)}</b><small>${c.kind === 'auto' ? 'Автографы игроков' : `${c.teams.length} ${plural(c.teams.length, 'команда', 'команды', 'команд')} + стикер турнира`}</small>
            <button type="button" class="cpx-btn${can ? '' : ' dim'}" data-cpxopen="${esc(m.name)}|${c.id}">Открыть · ${pr}</button></div>`; }).join('')}</div></section>`).join('')
        : `<div class="cpx-empty"><b>Капсул пока нет</b><span>Капсулы выходят к старту Мейджора (раздел «Стикеры»).</span></div>`;
      body += `<p class="cpx-note">Шансы: Paper ${ODDS.sticker[0][1]}% · Glitter ${ODDS.sticker[1][1]}% · Holo ${ODDS.sticker[2][1]}% · Gold ${ODDS.sticker[3][1]}% (у автографов Gold — ${ODDS.auto[3][1]}%).</p>`;
    }
    return `<div class="cpx">${head}${body}${U.open ? overlay(U.open) : ''}</div>`;
  }
  // экран «Открыть капсулу» (как Unlock Container в CS2): капсула на сцене, содержимое, цена; затем лента-рулетка
  const SCN = k => { const f = `assets/ui/scenes/${k || 'arena-blue'}.webp`; try { return new URL(f, D.baseURI).href; } catch (e) { return f; } };
  function overlay(o) {
    if (o.stage === 'inspect') return inspectView(o);
    const m = majors().find(x => x.name === o.mName), cap = m && capsOf(m).find(c => c.id === o.capId); if (!m || !cap) return '';
    const v = inv() || { tokens: 0 }, pr = PRICE[o.capId], can = v.tokens >= pr, list = contents(m, cap), od = ODDS[cap.kind === 'auto' ? 'auto' : 'sticker'];
    const head = `<header class="cpx-u-h"><h2>Открыть капсулу</h2><p>Открыть <b>Капсула ${esc(cap.n)} | ${esc(cityOf(m.name))} ${esc(m.year)}</b></p>${o.stage === 'spin' ? '<small><i>i</i>Эту капсулу можно открыть только один раз</small>' : ''}</header>`;
    const caseArt = `<div class="cpx-u-case">${capArt(m, cap)}</div>`;
    if (o.stage === 'preview') {
      const card = (it, i) => `<button type="button" class="cpx-it" data-cpxins="${i}" style="--rc:${RAR[it.f][1]}"><div class="cpx-it-art">${art(it)}</div><b>${esc(shortOf(it))}</b><small>${esc(RAR[it.f][0])}</small></button>`;
      return `<div class="cpx-ov cpx-u" style="--scn:url('${SCN()}')"><i class="cpx-u-bg"></i>${head}${caseArt}
        <section class="cpx-u-list"><div class="cpx-u-lh"><span>Откройте и получите один из следующих предметов</span><small>${FIN.map((f, k) => `<em style="--rc:${RAR[f][1]}">${RAR[f][0]} ${od[k][1]}%</em>`).join('')}</small></div>
          <div class="cpx-u-grid">${list.map(card).join('')}</div></section>
        <footer class="cpx-u-bar"><span class="cpx-coin"></span><p>Нужно <b>${pr} жетонов</b>, чтобы открыть капсулу и получить один предмет · у вас ${v.tokens}</p><button type="button" class="cpx-u-buy${can ? '' : ' off'}" data-cpxgo ${can ? '' : 'disabled'}>${can ? pr : 'Мало жетонов'}</button><button type="button" class="cpx-u-close" data-cpxclose>Закрыть</button></footer></div>`;
    }
    const cards = o.reel.map(it => `<div class="cpx-rc" style="--rc:${RAR[it.f][1]}"><div>${art(it)}</div></div>`).join('');
    return `<div class="cpx-ov cpx-u spin" style="--scn:url('${SCN()}')"><i class="cpx-u-bg"></i>${head}${caseArt}
      <div class="cpx-reel"><div class="cpx-strip">${cards}</div><i class="cpx-mark"></i></div></div>`;
  }
  // осмотр предмета — как в CS2: заголовок, полоса редкости, стрелки к соседним предметам, крупная наклейка на светлой подложке
  function inspectView(o) {
    const it = o.list[o.i], n = o.list.length, prev = o.list[(o.i - 1 + n) % n], next = o.list[(o.i + 1) % n];
    const side = (x, dir) => n > 1 ? `<button type="button" class="cpx-in-nav ${dir}" data-cpxnav="${dir === 'l' ? -1 : 1}"><span class="cpx-in-ar"></span><small><i style="--rc:${RAR[x.f][1]}"></i>${esc(nameOf(x))}</small></button>` : '';
    const desc = it.k === 'auto' ? `Автограф ${it.p} (${it.t}) с ${cityOf(it.m)} ${it.y}. Наклейку можно нанести на любое оружие, а также поскрести, чтобы она выглядела более поношенной.`
      : it.k === 'event' ? `Памятная наклейка Мейджора ${it.m}. Её можно нанести на любое оружие и поскрести — с каждым разом она выглядит всё более поношенной, пока окончательно не исчезнет.`
        : `Наклейка команды ${it.t} с ${it.m}. Её можно нанести на любое оружие, а также поскрести, чтобы она выглядела более поношенной. Каждый раз она будет выглядеть всё более поношенной, пока окончательно не исчезнет.`;
    const act = o.drop ? `<button type="button" class="cpx-u-buy" data-cpxagain>Открыть ещё · ${PRICE[o.capId]}</button>` : '';
    return `<div class="cpx-ov cpx-in${o.drop ? ' drop' : ''}" style="--scn:url('${SCN('bootcamp')}');--rc:${RAR[it.f][1]}"><i class="cpx-u-bg"></i>
      <header class="cpx-in-h"><small>Осмотр: ${esc(o.title)} <b>${o.i + 1}/${n}</b></small><h2>${esc(nameOf(it))}</h2><i class="cpx-in-line"></i>${o.drop ? `<em>${esc(RAR[it.f][2])} · сохранено в коллекции</em>` : ''}</header>
      ${side(prev, 'l')}${side(next, 'r')}
      <div class="cpx-in-card"><div class="cpx-in-tex"></div><div class="cpx-in-art">${art(it)}</div></div>
      <p class="cpx-in-desc">${esc(desc)}</p>
      <footer class="cpx-in-bar"><span class="cpx-in-ic">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/></svg>'}</span><span class="cpx-in-tag">${esc(fullName(it))}</span>${act}<button type="button" class="cpx-in-close" data-cpxclose>Закрыть</button></footer></div>`;
  }
  function curve(s, box) { const t0 = performance.now(), cs = [...s.children];
    const f = () => { const bx = box.getBoundingClientRect(), mid = bx.left + bx.width / 2;
      cs.forEach(c => { const r = c.getBoundingClientRect(), d = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / (bx.width / 2)); c.style.transform = `scale(${(1.12 - d * .28).toFixed(3)})`; c.style.opacity = (1 - d * .35).toFixed(2); });
      if (performance.now() - t0 < 6800 && D.body.contains(s)) requestAnimationFrame(f); }; f(); }
  function preview(mName, capId) { H.S.cpx.open = { stage: 'preview', mName, capId }; rerender(); }
  function open(mName, capId) {
    const v = inv(), m = majors().find(x => x.name === mName); if (!v || !m) return;
    const cap = capsOf(m).find(c => c.id === capId); if (!cap || v.tokens < PRICE[capId]) return;
    v.tokens -= PRICE[capId]; v.opened = (v.opened || 0) + 1;
    const list = contents(m, cap), win = roll(m, cap, list); win.at = Date.now(); v.items.unshift(win); save();
    const strip = []; for (let i = 0; i < 46; i++) strip.push(i === 40 ? win : roll(m, cap, list));
    H.S.cpx.open = { stage: 'spin', reel: strip, win, m: m.name, cap: cap.n, capId, mName, x: 0, done: false };
    rerender();
    // карточка 170 + отступ 6; линия — в центре окна; остановка в случайном месте выпавшей карточки
    setTimeout(() => { const s = D.querySelector('.cpx-strip'), box = D.querySelector('.cpx-reel'); if (!s || !box) return;
      const CW = 226, x = -Math.round(40 * CW + 14 + Math.random() * (CW - 28) - box.clientWidth / 2); H.S.cpx.open.x = x;
      s.classList.add('go'); s.style.transform = `translateX(${x}px)`; curve(s, box); }, 80);
    setTimeout(() => { const o = H.S.cpx.open; if (!o || o.win !== win) return;
      const idx = list.findIndex(x => x.f === win.f && x.k === win.k && x.t === win.t && (x.p || '') === (win.p || ''));
      H.S.cpx.open = { stage: 'inspect', drop: true, list, i: Math.max(0, idx), title: `Капсула ${cap.n} | ${cityOf(m.name)} ${m.year}`, mName, capId }; rerender(); }, 6900);
  }
  const rerender = () => { const y = W.scrollY; H.render(); W.scrollTo(0, y); D.getElementById('hs-page')?.classList.remove('hs-anim'); };
  H.PAGES.capsules = page;
  H.CLICKS.push(['[data-cpxtab]', el => { H.S.cpx.tab = el.dataset.cpxtab; rerender(); }]);
  H.CLICKS.push(['[data-cpxf]', el => { H.S.cpx.f = el.dataset.cpxf; rerender(); }]);
  H.CLICKS.push(['[data-cpxopen]', el => { const [m, c] = el.dataset.cpxopen.split('|'); preview(m, c); }]);
  H.CLICKS.push(['[data-cpxgo]', () => { const o = H.S.cpx.open; if (o) open(o.mName, o.capId); }]);
  H.CLICKS.push(['[data-cpxagain]', () => { const o = H.S.cpx.open; if (!o) return; H.S.cpx.open = null; open(o.mName, o.capId); }]);
  H.CLICKS.push(['[data-cpxins]', el => { const o = H.S.cpx.open, m = o && majors().find(x => x.name === o.mName), cap = m && capsOf(m).find(c => c.id === o.capId); if (!cap) return;
    H.S.cpx.open = { stage: 'inspect', list: contents(m, cap), i: +el.dataset.cpxins, title: `Капсула ${cap.n} | ${cityOf(m.name)} ${m.year}`, mName: o.mName, capId: o.capId, back: 'preview' }; rerender(); }]);
  H.CLICKS.push(['[data-cpxinv]', el => { const v = inv(); if (!v) return; const F = H.S.cpx.f, list = v.items.filter(it => !F || it.f === F);
    H.S.cpx.open = { stage: 'inspect', list, i: +el.dataset.cpxinv, title: 'Коллекция наклеек' }; rerender(); }]);
  H.CLICKS.push(['[data-cpxnav]', el => { const o = H.S.cpx.open; if (!o || !o.list) return; o.i = (o.i + Number(el.dataset.cpxnav) + o.list.length) % o.list.length; rerender(); }]);
  H.CLICKS.push(['[data-cpxclose]', () => { const o = H.S.cpx.open; if (o && o.back === 'preview') { H.S.cpx.open = { stage: 'preview', mName: o.mName, capId: o.capId }; rerender(); return; } H.S.cpx.open = null; rerender(); }]);
  H.CLICKS.push(['[data-cpxclose-x]', () => { H.S.cpx.open = null; rerender(); }]);
  // пункт меню (боковое меню собирает разделы из старой навигации)
  const addMenu = () => { try { const mm = D.querySelector('.pt-menu[data-menu="more"]'); if (mm && !mm.querySelector('[data-nav="capsules"]')) mm.insertAdjacentHTML('beforeend', '<button type="button" data-nav="capsules">Капсулы</button>'); } catch (e) {} };
  (H.AFTER || []).push(addMenu); setTimeout(addMenu, 1700);
  // окно открытия — поверх всего экрана (внутри страницы fixed привязывается к анимированному контейнеру)
  (H.AFTER || []).push(pg => { D.querySelectorAll('#hs-root > .cpx-ov-host').forEach(n => n.remove()); if (pg !== 'capsules') return;
    const ov = D.querySelector('#hs-page .cpx-ov'), root = D.getElementById('hs-root'); if (!ov || !root) return;
    const host = D.createElement('div'); host.className = 'cpx cpx-ov-host'; root.appendChild(host); host.appendChild(ov); });
  (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => { if (W.v57BatchCalendarSkip) return; try { sync(); } catch (e) {} }, 5000, 'v127-capsules');
  W.CS2Capsules = { sync, inv, REWARD, PRICE, tokens: () => (inv() || {}).tokens || 0 };
})();
