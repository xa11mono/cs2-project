/* v84 — Кубок наций как событие уровня Мейджора для стран.
   • Страница сборной (по клику на сборную): флаг, составы и места по годам, игроки, поддержка болельщиков.
   • Страница «Кубок наций» (папка Major): страна-хозяйка, отсчёт до старта, любимая сборная, реакции-поддержка
     (как на больших турнирах в соцсетях — выбираешь эмодзи для своей сборной), рейтинг поддержки, чемпионы прошлых лет,
     голосование болельщиков за страну-хозяйку следующего турнира.
   • Страна-хозяйка меняется каждый год: 2026 — Эр-Рияд; дальше — по итогам голосования (ваш голос весит как
     заметная доля аудитории, но решают все болельщики). Место проведения показывается на странице турнира. */
(function () {
  'use strict';
  const W = window, H = W.HS; if (!H) return;
  const esc = H.esc, DAY = 864e5;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const SH = () => W.V33Shows || {};
  const NATION = () => SH().NATION || {}, BY_NAME = () => SH().NAT_BY_NAME || {};
  const S = () => { const s = ST(); return s ? (s.v84Nations = s.v84Nations || { fav: null, react: {}, hosts: { 2026: 'riyadh' }, vote: {} }) : null; };
  const HOSTS = { riyadh: ['Эр-Рияд', 'SA'], saopaulo: ['Сан-Паулу', 'BR'], la: ['Лос-Анджелес', 'US'], paris: ['Париж', 'FR'], seoul: ['Сеул', 'KR'], berlin: ['Берлин', 'DE'],
    copenhagen: ['Копенгаген', 'DK'], warsaw: ['Варшава', 'PL'], shanghai: ['Шанхай', 'CN'], istanbul: ['Стамбул', 'TR'], astana: ['Астана', 'KZ'], sydney: ['Сидней', 'AU'], kyiv: ['Киев', 'UA'], stockholm: ['Стокгольм', 'SE'] };
  const EMO = ['🔥', '❤️', '👏', '💪', '🏆'];
  const encDate = y => { const sh = (SH().SHOWS || []).find(x => x.kind === 'nations'); return sh ? new Date(y, sh.m, sh.d, 18).getTime() : new Date(y, 11, 6, 18).getTime(); };
  const curYear = () => new Date(nowMs()).getFullYear();
  // кандидаты на следующий год: три города, без двух последних хозяев
  function candidates(y) {
    const st = S(), last = [st?.hosts?.[y - 1], st?.hosts?.[y - 2]];
    return Object.keys(HOSTS).filter(k => !last.includes(k)).sort((a, b) => h32(y + a) - h32(y + b)).slice(0, 3);
  }
  function botVotes(y) { return candidates(y).map(k => ({ k, v: 800 + h32('vote' + y + k) % 2400 })); }
  function hostFor(y) {
    const st = S(); y = Number(y) || curYear();
    if (st?.hosts?.[y]) { const [city, cc] = HOSTS[st.hosts[y]] || HOSTS.riyadh; return { key: st.hosts[y], city, cc, decided: true }; }
    const tally = botVotes(y); const my = st?.vote?.[y]; tally.forEach(t => { if (t.k === my) t.v += 900; });
    const best = tally.sort((a, b) => b.v - a.v)[0]; const [city, cc] = HOSTS[best.k];
    return { key: best.k, city, cc, decided: false };
  }
  // голосование за следующий год закрывается в день финала текущего Кубка
  function settle() {
    const st = S(); if (!st) return; const y = curYear();
    if (!st.hosts[y]) st.hosts[y] = hostFor(y).key;
    if (nowMs() > encDate(y) + 5 * DAY && !st.hosts[y + 1]) {
      const h = hostFor(y + 1); st.hosts[y + 1] = h.key;
      try { W.V29News?.add?.({ cat: 'tournament', icon: '🌍', imp: 6, title: `eSports Nations Cup ${y + 1} пройдёт в городе ${h.city}`, lead: `Болельщики выбрали страну-хозяйку следующего Кубка наций. ${st.vote?.[y + 1] ? (st.vote[y + 1] === h.key ? 'Ваш голос оказался на стороне большинства.' : 'Ваш кандидат уступил.') : ''}`, body: ['Хозяева получают полный зал и поддержку трибун для своей сборной.'], tags: [] }); } catch (e) {}
    }
  }
  // место проведения для страницы турнира
  try { CS2.patch('CS2EventLocation', L => function (name, ev) { const m = /Nations Cup\D*(\d{4})/i.exec(String(name || '')); if (m) { const h = hostFor(+m[1]); return { city: h.city, cc: h.cc, lan: true }; } return L.apply(this, arguments); }, { id: '__v84n' }); } catch (e) {}
  // поддержка: боты — по силе «фанбазы» страны (число про-игроков и их уровень), плюс ваш выбор
  function fanBase(cc) { let n = 0; (typeof teams !== 'undefined' ? teams : []).forEach(t => (t.players || []).forEach(p => { if (p && p.country === cc) n += t.isAcademy ? 1 : 3; })); return n; }
  function reactions(cc, y) {
    const st = S(), base = fanBase(cc), out = EMO.map((e, i) => ({ e, n: Math.round(base * (40 + h32(cc + y + e) % 90) / (1 + i * .35)) }));
    const mine = st?.react?.[y + '|' + cc]; if (mine) { const x = out.find(o => o.e === mine); if (x) x.n += 1; }
    return { list: out, total: out.reduce((a, x) => a + x.n, 0), mine };
  }
  // история сборной по архиву турниров
  function history(name) {
    const A = H.archive(); return Object.values(A).filter(s => s && s.prestige === 'nations' && s.rost && s.rost[name]).sort((a, b) => (b.year || 0) - (a.year || 0))
      .map(s => ({ id: s.id, year: s.year, live: !!s.live, place: (s.results || []).find(r => r.n === name)?.p || null, champ: s.champion === name, roster: s.rost[name] }));
  }
  const placeTxt = p => p === 1 ? '🏆 Чемпион' : p === 2 ? '🥈 Финал' : p === 3 ? 'Полуфинал' : p === 5 ? 'Четвертьфинал' : p === 9 ? '1/8 финала' : p === 17 ? 'Отборочный раунд' : '—';
  function reactBar(cc, y) {
    const R = reactions(cc, y);
    return `<div class="v84-nreact">${R.list.map(x => `<button type="button" class="${R.mine === x.e ? 'on' : ''}" data-nreact="${esc(cc)}|${y}|${x.e}">${x.e} <b>${x.n.toLocaleString('ru-RU')}</b></button>`).join('')}</div>`;
  }
  function nationPage(name) {
    const cc = BY_NAME()[name], st = S(), y = curYear(), hist = history(name), fav = st?.fav === cc;
    const titles = hist.filter(h => h.champ).length, best = hist.filter(h => h.place).sort((a, b) => a.place - b.place)[0];
    const squad = (ST()?.v33Shows?.encSquads?.[Math.max(1, y - 2025)] || []).find(n => n.cc === cc);
    const rows = hist.map(h => `<tr data-event="${esc(h.id)}"><td class="l">${h.year}</td><td class="l">${h.live ? 'идёт' : placeTxt(h.place)}</td><td class="l">${h.roster.map(p => `<button type="button" class="hs-link" data-player="${esc(p.nick)}">${esc(p.nick)}</button> <small class="hs-dim">${esc(p.club || '')}</small>`).join(', ')}</td></tr>`).join('');
    return `${H.back()}<header class="tm-head v84-nhead">${H.logo(name, 'xl')}<div class="tm-id"><div class="tm-k"><span class="hs-kind k-major">Сборная</span> <span class="hs-dim">eSports Nations Cup</span></div><h1>${esc(name)}</h1>
      <div class="pt-kpis in"><div><small>Титулов</small><b>${titles}</b></div><div><small>Лучший результат</small><b>${best ? placeTxt(best.place) : '—'}</b></div><div><small>Участий</small><b>${hist.length}</b></div><div><small>Болельщиков</small><b>${reactions(cc, y).total.toLocaleString('ru-RU')}</b></div></div>
      <div class="v84-nfav"><button type="button" class="hs-btn ${fav ? '' : 'ghost'} sm" data-nfav="${esc(cc)}">${fav ? '★ Моя сборная' : '☆ Болеть за сборную'}</button></div></div></header>
      ${H.box('Поддержать сборную', reactBar(cc, y) + '<p class="hs-note">Выберите реакцию — она добавится к поддержке болельщиков. Одна реакция на сборную в год.</p>')}
      ${squad ? H.box(`Состав на Кубок наций ${y}`, `<p class="v84-npad">Капитан — <b>${esc(squad.capt)}</b>. ${squad.nicks.map(n => `<button type="button" class="hs-link" data-player="${esc(n)}">${esc(n)}</button>`).join(', ')}${squad.snub ? ` · без вызова: ${esc(squad.snub)}` : ''}</p>`) : ''}
      ${H.box('История выступлений', rows ? `<table class="hs-tbl hs-stbl"><thead><tr><th class="l">Год</th><th class="l">Результат</th><th class="l">Состав</th></tr></thead><tbody>${rows}</tbody></table>` : H.empty('Сборная ещё не играла на Кубке наций'), '', 'flush')}`;
  }
  // страница турнира сборных
  function hubPage() {
    settle();
    const st = S(), y = curYear(), at = encDate(y), done = nowMs() > at + 5 * DAY, Y = done ? y + 1 : y, h = hostFor(Y), days = Math.ceil((encDate(Y) - nowMs()) / DAY);
    const N = NATION(), cands = (() => { try { return SH().nationCandidates?.(Math.max(1, Y - 2025)) || []; } catch (e) { return []; } })();
    const favCc = st?.fav, fav = favCc ? N[favCc] : null;
    const support = cands.map(n => ({ n, r: reactions(n.cc, Y) })).sort((a, b) => b.r.total - a.r.total);
    const past = Object.values(H.archive()).filter(s => s && s.prestige === 'nations' && !s.live && s.champion && s.champion !== '—').sort((a, b) => (b.year || 0) - (a.year || 0));
    const vy = Y + 1, vcands = candidates(vy), myv = st?.vote?.[vy];
    const tally = botVotes(vy).map(t => ({ ...t, v: t.v + (t.k === myv ? 900 : 0) })), tv = tally.reduce((a, x) => a + x.v, 0);
    return `<div class="hs-head"><h1>eSports Nations Cup ${Y}</h1><span class="hs-sub">Главный турнир сборных года · ${esc(h.city)} ${H.flag ? H.flag(h.cc) : ''} · ${days > 0 ? `старт через ${days} дн.` : 'идёт сейчас'}</span></div>
      <div class="v84-ngrid">
        ${H.box('Моя сборная', fav ? `<div class="v84-nmine">${H.logo(fav, 'lg')}<div><b data-team="${esc(fav)}">${esc(fav)}</b><small>${reactions(favCc, Y).total.toLocaleString('ru-RU')} болельщиков</small>${reactBar(favCc, Y)}</div></div>` : '<p class="v84-npad">Выберите сборную, за которую болеете, — её флаг появится здесь, а матчи будут выделены.</p>')}
        ${H.box(`Где пройдёт Кубок наций ${vy}?`, `<div class="v84-nvote">${vcands.map(k => { const t = tally.find(x => x.k === k), pct = Math.round(t.v / tv * 100); return `<button type="button" class="${myv === k ? 'on' : ''}" data-nvote="${vy}|${k}"><span>${H.flag ? H.flag(HOSTS[k][1]) : ''} ${esc(HOSTS[k][0])}</span><i style="width:${pct}%"></i><b>${pct}%</b></button>`; }).join('')}</div><p class="hs-note">Голосование закрывается после финала Кубка ${Y}.</p>`)}
      </div>
      ${H.box('Сборные и поддержка болельщиков', `<div class="v84-nlist">${support.map(({ n, r }) => `<div class="v84-nrow${n.cc === favCc ? ' fav' : ''}"><button type="button" class="v84-nname" data-team="${esc(n.name)}">${H.logo(n.name, 'sm')} <b>${esc(n.name)}</b></button><small class="hs-dim">${n.ranked.slice(0, 5).map(x => esc(x.p.nick)).join(', ')}</small><span class="v84-ntot">${r.total.toLocaleString('ru-RU')}</span><button type="button" class="hs-btn ghost sm" data-nfav="${esc(n.cc)}">${n.cc === favCc ? '★' : '☆'}</button></div>`).join('') || H.empty('Сборные будут известны ближе к турниру')}</div>`, '', 'flush')}
      ${H.box('Чемпионы', past.length ? `<table class="hs-tbl hs-stbl"><tbody>${past.map(s => `<tr data-event="${esc(s.id)}"><td class="l">${s.year}</td><td class="l">${H.logo(s.champion, 'sm')} <b>${esc(s.champion)}</b></td><td class="l hs-dim">${esc(hostFor(s.year).city)}</td></tr>`).join('')}</tbody></table>` : H.empty('Первый Кубок наций — в декабре'), '', 'flush')}`;
  }
  H.PAGES.nations = hubPage;
  const origTeam = H.PAGES.team;
  H.PAGES.team = arg => { const name = String(arg || '').split('/')[0]; if (!H.teamBy(name) && BY_NAME()[name]) return nationPage(name); return origTeam(arg); };
  try { if (H.SECTION_OF) H.SECTION_OF.nations = 'major'; } catch (e) {}
  if (Array.isArray(H.NAV_MORE) && !H.NAV_MORE.some(x => x[0] === 'nations')) H.NAV_MORE.push(['nations', 'Кубок наций']);
  H.CLICKS.push(['[data-nfav]', el => { const st = S(); if (!st) return; st.fav = st.fav === el.dataset.nfav ? null : el.dataset.nfav; try { W.saveSeasonState?.(); } catch (e) {} H.render(); }]);
  H.CLICKS.push(['[data-nreact]', el => { const st = S(); if (!st) return; const [cc, y, e] = el.dataset.nreact.split('|'); const k = y + '|' + cc; st.react[k] = st.react[k] === e ? null : e; try { W.saveSeasonState?.(); } catch (er) {} H.render(); }]);
  H.CLICKS.push(['[data-nvote]', el => { const st = S(); if (!st) return; const [y, k] = el.dataset.nvote.split('|'); if (st.hosts[+y]) return; st.vote[+y] = k; try { W.saveSeasonState?.(); } catch (e) {} H.render(); }]);
  // любимая сборная — подсветка на странице Кубка наций в архиве
  (H.AFTER || []).push(page => {
    try { const st = S(); if (!st?.fav || page !== 'event') return; const fav = NATION()[st.fav]; if (!fav) return;
      document.querySelectorAll('#hs-page [data-team]').forEach(el => { if (el.dataset.team === fav) el.classList.add('v84-favnat'); }); } catch (e) {}
  });
  (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => { try { settle(); } catch (e) {} }, 9000);
  W.CS2Nations = { hostFor, candidates, reactions, history, settle, HOSTS };
})();
