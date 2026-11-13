/* v84 — режим зрителя: за чем следить и за кого болеть.
   • Главная: «Громкие новости» — крупные карточки о популярных командах (топ-10, легендарные клубы, ваша команда)
     и о стримерах; такие новости выделены и в ленте. «Матч дня» — самый интересный из ближайших матчей
     (сила соперников, стадия, соперничество, ваша команда). «Моя лента» — любимая команда и игрок.
   • Итоги недели — новость каждую игровую неделю (чемпионы, сенсации, игрок недели, трансферы, кто в форме).
   • Соперничества — пары с частыми встречами на Tier-1 и дерби одной страны; страница «Соперничества» и H2H двух команд.
   • «В шаге от рекорда» — новости, когда серия побед команды приближается к рекорду сохранения.
   • Прогнозы аналитиков перед каждым турниром Tier-1; ваш прогноз на чемпиона любого турнира Tier-1 (очки, таблица сезона).
   • Онлайн турниров и рекорды просмотров. • Эпохи — история сцены по годам. • Карточки игроков (коллекция, еженедельный набор). */
(function () {
  'use strict';
  const W = window, H = W.HS, N = W.V29News; if (!H || !N) return;
  const esc = H.esc, DAY = 864e5, WEEK = 7 * DAY;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const pick = (k, a) => a[h32(k) % a.length];
  const batch = () => !!W.v57BatchCalendarSkip;
  const S = () => { const s = ST(); if (!s) return null; const o = s.v84Watch = s.v84Watch || {}; ['views', 'evPick', 'seen', 'cards'].forEach(k => { o[k] = o[k] || {}; }); o.pickPts = o.pickPts || {}; return o; };
  const T1 = ['major', 'elite', 'regular'];
  const ranked = () => H.ranked().filter(t => !t.isAcademy);
  const rankOf = n => { const i = ranked().findIndex(t => t.name === n); return i < 0 ? 99 : i + 1; };
  // v99: менеджер, не отметивший любимую команду, видит в «Моей ленте» свой клуб
  // v112: любимая команда — та же, что «☆ Стать фанатом» на странице команды (профиль фаната v33), отдельной отметки нет
  const favTeam = () => (W.V33Fan && W.V33Fan.prof && W.V33Fan.prof.team) || S()?.favTeam || (typeof teams !== 'undefined' ? teams.find(t => t.isFan)?.name : '') || (() => { try { return W.V31?.managed?.() || ''; } catch (e) { return ''; } })() || '';
  const favPlayer = () => S()?.favPlayer || '';
  const legend = n => { try { return !!W.CS2Legend?.(n); } catch (e) { return false; } };
  const popular = n => !!n && (rankOf(n) <= 10 || legend(n) || n === favTeam());
  const streamerNicks = () => { try { return new Set((W.CS2Community?.streamers() || []).map(s => s.nick)); } catch (e) { return new Set(); } };
  const news = it => { try { N.add(it); } catch (e) {} };
  const T1ms = () => { try { return H.stats().ms.filter(m => m && m.w && m.a && m.b && !m.live && T1.includes(m.kind)); } catch (e) { return []; } };

  // ------------------------------------------------------------ громкие новости
  function spotKind(n) {
    if (!n) return null;
    const tags = n.tags || [], teamsIn = tags.filter(t => t.t === 'team').map(t => t.v).concat(n.team ? [n.team] : []);
    const sn = streamerNicks();
    if (n.cat === 'community' || n.streamer || tags.some(t => sn.has(t.v)) || /стример|Streamers Battle/i.test(n.title || '')) return 'streamer';
    if ((n.imp || 0) >= 6 && teamsIn.some(popular)) return 'top';
    if ((n.imp || 0) >= 8) return 'top';
    return null;
  }
  const spotTeam = n => (n.tags || []).filter(t => t.t === 'team').map(t => t.v).concat(n.team ? [n.team] : []).find(popular) || n.team || '';
  function spotlight(exclude) {
    const now = nowMs();
    const list = N.all().filter(n => n && now - n.ts < 10 * DAY && n.ts <= now && !(exclude && exclude.has(n.id)) && spotKind(n)).sort((a, b) => ((b.imp || 0) - (a.imp || 0)) || b.ts - a.ts);
    const top = list.filter(n => spotKind(n) === 'top').slice(0, 3), str = list.filter(n => spotKind(n) === 'streamer').slice(0, 1);
    return top.concat(str).slice(0, 4);
  }
  function spotCard(n) {
    const k = spotKind(n), tm = spotTeam(n), c = N.CATS?.[n.cat] || { l: 'Новости' };
    // v114: «👑 Легендарный клуб» — только у новостей о наследии/эпохах, а не у любой новости с легендарной командой
    const lg = legend(tm) && (n.cat === 'legacy' || /эпох|наследи|легенд|в истори/i.test(String(n.title || '')));
    return `<button type="button" class="v84-spot ${k}${lg ? ' legend' : ''}${tm && tm === favTeam() ? ' mine' : ''}" data-art="${esc(n.id)}">
      <span class="v84-spot-logo">${tm ? H.logo(tm, 'lg') : `<span class="v84-spot-ic">${esc(n.icon || '🎙️')}</span>`}</span>
      <span class="v84-spot-tx"><small>${k === 'streamer' ? '🎥 Стримеры' : tm === favTeam() && tm ? '★ Ваша команда' : lg ? '👑 Легендарный клуб' : '🔥 Громко'} · ${esc(c.l)}</small><b>${esc(n.title)}</b><span>${esc(n.lead || '')}</span></span></button>`;
  }

  // ------------------------------------------------------------ матч дня
  const STAGE_W = s => /финал/i.test(s) && !/полу|четверт|1\/8/i.test(s) ? 30 : /полуфинал/i.test(s) ? 20 : /четвертьфинал|плей-офф|Stage 3/i.test(s) ? 12 : /Stage 2/i.test(s) ? 6 : 0;
  function rivalryOf(a, b) {
    const ms = T1ms().filter(m => (m.a === a && m.b === b) || (m.a === b && m.b === a));
    const fa = typeof getTeamFlag === 'function' ? getTeamFlag(a) : '', fb = typeof getTeamFlag === 'function' ? getTeamFlag(b) : '';
    const derby = !!fa && fa === fb && !['🇪🇺', '🌍', '🌐'].includes(fa) && rankOf(a) <= 30 && rankOf(b) <= 30; // дерби — одна страна, не «Европа»
    return { n: ms.length, aw: ms.filter(m => m.w === a).length, bw: ms.filter(m => m.w === b).length, derby, hot: ms.length >= 4 || derby };
  }
  function matchOfDay() {
    let up = []; try { up = N.upcoming() || []; } catch (e) {}
    const sc = x => { const a = x.m.t1, b = x.m.t2, ra = rankOf(a), rb = rankOf(b); const r = rivalryOf(a, b);
      return 60 - Math.min(ra, rb) - Math.max(ra, rb) / 2 + STAGE_W(String(x.stage || '')) + (r.hot ? 12 : 0) + ([a, b].includes(favTeam()) ? 25 : 0) + (legend(a) || legend(b) ? 5 : 0); };
    const best = up.filter(x => x && x.m && x.m.t1 && x.m.t2).sort((p, q) => sc(q) - sc(p))[0];
    return best ? { ...best, rv: rivalryOf(best.m.t1, best.m.t2) } : null;
  }
  function modHtml() {
    const x = matchOfDay(); if (!x) return '';
    const { m, stage, rv } = x; let odds = null; try { odds = W.calcMatchOdds?.(m.t1, m.t2); } catch (e) {}
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    return `<section class="hs-box v84-mod"><header class="hs-box-h"><h3>⭐ Матч дня</h3><span class="hs-sub">${esc(ct?.name || '')} · ${esc(stage || '')}</span></header>
      <div class="v84-mod-b"><button type="button" class="v84-mod-t" data-team="${esc(m.t1)}">${H.logo(m.t1, 'lg')}<b>${esc(m.t1)}</b><small>#${rankOf(m.t1)}${odds ? ` · ${odds.pct1}%` : ''}</small></button>
        <div class="v84-mod-vs"><b>VS</b>${rv.derby ? '<span class="v84-tag derby">Дерби</span>' : rv.n >= 4 ? '<span class="v84-tag rival">Соперничество</span>' : ''}${rv.n ? `<small>Личные встречи: ${rv.aw}–${rv.bw}</small>` : '<small>Первая встреча на Tier-1</small>'}<button type="button" class="hs-btn sm" data-nav="watch">Смотреть эфир</button></div>
        <button type="button" class="v84-mod-t" data-team="${esc(m.t2)}">${H.logo(m.t2, 'lg')}<b>${esc(m.t2)}</b><small>#${rankOf(m.t2)}${odds ? ` · ${odds.pct2}%` : ''}</small></button></div></section>`;
  }

  // ------------------------------------------------------------ моя лента
  function myFeedHtml() {
    const ft = favTeam(), fp = favPlayer(); if (!ft && !fp) return `<section class="hs-box v84-my"><header class="hs-box-h"><h3>Моя лента</h3></header><p class="v84-pad hs-note">Отметьте любимую команду («☆ Стать фанатом» на странице команды) и игрока («★ Следить» в профиле) — здесь появятся их новости и ближайшие матчи.</p></section>`;
    const inTitle = (n, x) => x && String(n.title || '').includes(x);   // v112: и упоминания в заголовке
    const items = N.all().filter(n => (n.tags || []).some(t => t.v === ft || t.v === fp) || n.team === ft || n.player === fp || inTitle(n, ft) || inTitle(n, fp)).slice(0, 6);
    let next = null; try { next = (N.upcoming() || []).find(x => x.m && (x.m.t1 === ft || x.m.t2 === ft)); } catch (e) {}
    return `<section class="hs-box v84-my"><header class="hs-box-h"><h3>Моя лента</h3><span class="hs-sub">${ft ? `${H.logo(ft, 'xs')} ${esc(ft)}` : ''}${fp ? ` · ${esc(fp)}` : ''}</span></header>
      ${next ? `<div class="v84-my-next">Следующий матч: <b>${esc(next.m.t1)}</b> vs <b>${esc(next.m.t2)}</b> <small>${esc(next.stage || '')}</small></div>` : ''}
      ${items.map(n => `<button type="button" class="v84-my-n" data-art="${esc(n.id)}"><small>${esc(H.ndate ? H.ndate(n.ts) : '')}</small><b>${esc(n.title)}</b></button>`).join('') || '<p class="v84-pad hs-dim">Новостей пока нет</p>'}</section>`;
  }

  // ------------------------------------------------------------ итоги недели
  function weekly() {
    const o = S(); if (!o || batch()) return; const wk = Math.floor(nowMs() / WEEK); if (o.week === wk) return; const first = !o.week; o.week = wk; if (first) return;
    const now = nowMs(), from = now - WEEK, A = H.archive();
    const champs = Object.values(A).filter(s => s && !s.show && !s.live && s.champion && s.champion !== '—' && (s.ge || 0) >= from && (s.ge || 0) <= now && T1.includes(s.prestige)).map(s => `${s.champion} — ${s.name}`);
    const ms = T1ms().filter(m => m.ts >= from && m.ts <= now);
    const upset = ms.map(m => { const l = m.w === m.a ? m.b : m.a; return { m, l, d: rankOf(m.w) - rankOf(l) }; }).sort((a, b) => b.d - a.d)[0];
    const form = ranked().slice(0, 30).map(t => ({ t, s: Number(t.streak) || 0 })).sort((a, b) => b.s - a.s);
    const tr = (typeof transferState !== 'undefined' ? transferState.v30Moves || [] : []).filter(m => (m.ts || 0) >= from && /transfer|signing|buyout/.test(m.type || ''));
    if (!champs.length && !ms.length && !tr.length) return;
    const body = [];
    if (champs.length) body.push(`Чемпионы недели: ${champs.join('; ')}.`);
    if (upset && upset.d >= 8) body.push(`Сенсация недели: ${upset.m.w} (#${rankOf(upset.m.w)}) обыграли ${upset.l} (#${rankOf(upset.l)})${Array.isArray(upset.m.s) ? ` — ${upset.m.s.join(':')}` : ''}.`);
    try { const pw = (W.CS2Extra?.state?.()?.potw || [])[0]; if (pw && pw.nick) body.push(`Игрок недели: ${pw.nick}${pw.team ? ` (${pw.team})` : ''}.`); } catch (e) {}
    if (form[0] && form[0].s >= 3) body.push(`В форме: ${form.slice(0, 3).filter(x => x.s >= 3).map(x => `${x.t.name} (${x.s} побед подряд)`).join(', ')}.`);
    const cold = form.slice().reverse().filter(x => x.s <= -3).slice(0, 2); if (cold.length) body.push(`Кризис: ${cold.map(x => `${x.t.name} (${-x.s} поражений подряд)`).join(', ')}.`);
    if (tr.length) body.push(`Трансферы недели: ${tr.slice(0, 4).map(m => `${m.player} → ${m.to}`).join(', ')}${tr.length > 4 ? ` и ещё ${tr.length - 4}` : ''}.`);
    news({ cat: 'stats', icon: '🗞️', imp: 5, title: `Итоги недели: ${champs[0] ? champs[0].split(' — ')[0] + ' с трофеем' : upset && upset.d >= 8 ? 'сенсация ' + upset.m.w : 'главное за семь дней'}`, lead: 'Коротко о главном: результаты, сенсации, форма команд и трансферы.', body, tags: [], digest: true });
  }

  // ------------------------------------------------------------ рекорды: в шаге от рекорда
  function recordWatch() {
    const o = S(); if (!o || batch()) return;
    let list = []; try { list = W.V35Streaks?.streaks?.() || []; } catch (e) {}
    if (!list.length) return;
    const rec = list.filter(x => !x.live)[0] || list[0], cur = list.filter(x => x.live).sort((a, b) => b.n - a.n)[0];
    if (!rec || !cur || cur.team === rec.team) return;
    const gap = rec.n - cur.n, key = 'rw|' + cur.team + '|' + cur.n;
    if (gap >= 1 && gap <= 2 && !o.seen[key]) { o.seen[key] = 1; news({ cat: 'stats', icon: '📈', imp: 6, title: `${cur.team} в ${gap === 1 ? 'одной победе' : 'двух победах'} от рекорда`, lead: `Серия ${cur.team} — ${cur.n} побед подряд на Tier-1. Рекорд — ${rec.n} (${rec.team}).`, body: ['Следующий матч может войти в историю.'], tags: [{ t: 'team', v: cur.team }] }); }
    if (gap < 0 && !o.seen['rb|' + cur.team + '|' + rec.n]) { o.seen['rb|' + cur.team + '|' + rec.n] = 1; news({ cat: 'stats', icon: '🏅', imp: 8, title: `Рекорд! ${cur.team} — ${cur.n} побед подряд`, lead: `Прежний рекорд (${rec.n}) принадлежал ${rec.team}.`, body: [], tags: [{ t: 'team', v: cur.team }] }); }
  }

  // ------------------------------------------------------------ прогнозы аналитиков, онлайн, ваш прогноз на чемпиона
  const ANALYSTS = ['HLTV Analytics', 'Аналитик HLTV', 'Редакция HLTV', 'Обозреватель HLTV'];
  function tourneyTick() {
    const o = S(); if (!o) return; const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    if (ct && ct.name && !ct.completed && !o.seen['pre|' + ct.name] && (ct.isMajor || ct.isElite || /Tier-1|S-Tier/i.test(ct.tier || '') || ct.prestige)) {
      o.seen['pre|' + ct.name] = 1;
      const part = (ct.teams || ct.participants || []).map(t => typeof t === 'string' ? t : t?.name).filter(Boolean);
      const fav = (part.length ? part : ranked().map(t => t.name)).slice().sort((a, b) => rankOf(a) - rankOf(b));
      const dark = fav.slice(4, 12).sort((a, b) => h32(ct.name + a) - h32(ct.name + b))[0];
      if (fav.length >= 3 && !batch()) news({ cat: 'preview', icon: '🔮', imp: 5, title: `Прогнозы аналитиков на ${ct.name}`, lead: `Фаворит большинства — ${fav[0]}. Тёмная лошадка — ${dark || fav[3] || fav[2]}.`,
        body: ANALYSTS.slice(0, 3).map((a, i) => `${a}: ${pick(ct.name + a, [`чемпион — ${fav[i % 3]}`, `ставлю на ${fav[(i + 1) % 3]} — у них лучший маппул`, `${fav[0]} — фаворит, но ${dark || fav[2]} удивит`])}.`), tags: fav.slice(0, 2).map(v => ({ t: 'team', v })) });
    }
    // завершённые турниры: онлайн, рекорды, итоги прогнозов на чемпиона
    const A = H.archive();
    Object.values(A).filter(s => s && !s.live && s.champion && s.champion !== '—' && T1.includes(s.prestige) && !o.views[s.id]).forEach(s => {
      const parts = (s.results || []).slice(0, 8).map(r => r.n), pop = parts.reduce((a, n) => a + (rankOf(n) <= 5 ? 90 : rankOf(n) <= 10 ? 55 : 25) + (legend(n) ? 40 : 0), 0);
      const base = s.prestige === 'major' ? 1100 : s.prestige === 'elite' ? 650 : 380, v = Math.round((base + pop * 1.6) * (0.9 + (h32(s.id) % 30) / 100)) * 1000;
      const prev = Object.values(o.views).reduce((a, x) => Math.max(a, x.v || 0), 0);
      o.views[s.id] = { v, name: s.name, y: s.year, final: (s.results || []).slice(0, 2).map(r => r.n).join(' — ') };
      if (prev && v > prev && !batch()) news({ cat: 'stats', icon: '📺', imp: 6, title: `Рекорд онлайна: ${s.name} — ${(v / 1e6).toFixed(2)} млн зрителей`, lead: `Пик пришёлся на финал ${o.views[s.id].final}.`, body: [`Прежний рекорд — ${(prev / 1e6).toFixed(2)} млн.`], tags: [] });
      const my = o.evPick[s.name]; if (my && !my.done) { my.done = 1; const ok = my.team === s.champion; const y = s.year || new Date(nowMs()).getFullYear(); o.pickPts[y] = (o.pickPts[y] || 0) + (ok ? (s.prestige === 'major' ? 5 : 3) : 0); my.ok = ok; }
    });
  }
  function evPickBox(ev) {
    const o = S(); if (!o || !ev) return '';
    const name = ev.name, mine = o.evPick[name], part = (ev.teams || []).map(t => typeof t === 'string' ? t : t?.name).filter(Boolean);
    if (!part.length || ev.completed) return mine ? `<p class="v84-pad">Ваш прогноз: <b>${esc(mine.team)}</b>${mine.done ? (mine.ok ? ' ✅' : ' ❌') : ''}</p>` : '';
    const locked = (ev.matchesPlayed || 0) > 0 || (ev.startedAt && nowMs() - ev.startedAt > DAY);
    return `<div class="v84-evpick">${part.slice().sort((a, b) => rankOf(a) - rankOf(b)).map(t => `<button type="button" class="${mine?.team === t ? 'on' : ''}" data-evpick="${esc(name)}|${esc(t)}" ${locked && mine ? 'disabled' : ''}>${H.logo(t, 'xs')} ${esc(t)}</button>`).join('')}</div><p class="hs-note">Угадали чемпиона — 3 очка (Major — 5). Таблица — на странице «Соперничества и прогнозы».</p>`;
  }

  // ------------------------------------------------------------ страницы: соперничества и H2H, эпохи, карточки
  function rivalries() {
    const pairs = {}; T1ms().forEach(m => { const k = [m.a, m.b].sort().join('|'); (pairs[k] = pairs[k] || []).push(m); });
    return Object.entries(pairs).map(([k, ms]) => { const [a, b] = k.split('|'); return { a, b, n: ms.length, aw: ms.filter(m => m.w === a).length, bw: ms.filter(m => m.w === b).length, last: ms.slice().sort((x, y) => y.ts - x.ts)[0], derby: rivalryOf(a, b).derby }; })
      .filter(x => x.n >= 3).sort((p, q) => q.n - p.n).slice(0, 30);
  }
  H.PAGES.rivalries = () => {
    const list = rivalries(), o = S(), y = new Date(nowMs()).getFullYear(), pts = o?.pickPts || {};
    const myPicks = Object.entries(o?.evPick || {}).slice(-12).reverse();
    return `<div class="hs-head"><h1>Соперничества и прогнозы</h1><span class="hs-sub">Частые встречи на Tier-1, дерби и ваши прогнозы на чемпионов</span></div>
      <div class="hs-grid2"><div class="hs-col">${H.box('Главные противостояния', list.length ? `<table class="hs-tbl hs-stbl"><thead><tr><th class="l">Пара</th><th>Матчей</th><th>Счёт</th><th class="l">Последний</th><th></th></tr></thead><tbody>${list.map(x => `<tr><td class="l">${H.logo(x.a, 'xs')} <b>${esc(x.a)}</b> — ${H.logo(x.b, 'xs')} <b>${esc(x.b)}</b>${x.derby ? ' <span class="v84-tag derby">дерби</span>' : ''}</td><td>${x.n}</td><td>${x.aw}:${x.bw}</td><td class="l hs-dim">${esc(x.last?.ev || '')}</td><td><button type="button" class="hs-btn ghost sm" data-h2h="${esc(x.a)}|${esc(x.b)}">H2H</button></td></tr>`).join('')}</tbody></table>` : H.empty('Соперничества появятся после нескольких турниров Tier-1'), '', 'flush')}</div>
      <div class="hs-col">${H.box('Ваши прогнозы на чемпионов', `<div class="v84-pad"><b>${pts[y] || 0}</b> очков в ${y}${pts[y - 1] ? ` · ${pts[y - 1]} в ${y - 1}` : ''}</div>${myPicks.map(([ev, p]) => `<div class="v84-pk-row"><span>${esc(ev)}</span><b>${esc(p.team)}</b>${p.done ? (p.ok ? '✅' : '❌') : '<small>ждём</small>'}</div>`).join('') || '<p class="v84-pad hs-dim">Сделайте прогноз на странице турнира Tier-1.</p>'}`)}
      ${H.box('Рекорды онлайна', Object.values(o?.views || {}).sort((a, b) => b.v - a.v).slice(0, 8).map((x, i) => `<div class="v84-pk-row"><span>${i + 1}. ${esc(x.name)}</span><b>${(x.v / 1e6).toFixed(2)} млн</b></div>`).join('') || '<p class="v84-pad hs-dim">Данные появятся после турниров.</p>')}</div></div>`;
  };
  H.PAGES.h2h = arg => {
    const [a, b] = String(arg || '').split('|'); if (!a || !b) return H.empty('Выберите две команды');
    const ms = T1ms().concat((() => { try { return H.stats().ms.filter(m => m && m.w && !T1.includes(m.kind)); } catch (e) { return []; } })()).filter(m => (m.a === a && m.b === b) || (m.a === b && m.b === a)).sort((x, y) => y.ts - x.ts);
    const aw = ms.filter(m => m.w === a).length, bw = ms.length - aw;
    const maps = {}; ms.forEach(m => (m.maps || m.mp || []).forEach(mp => { const n = mp.map || mp[0]; if (!n) return; const r = maps[n] = maps[n] || { a: 0, b: 0 }; const wa = mp.w ? mp.w === a : (m.a === a ? mp[1] > mp[2] : mp[2] > mp[1]); wa ? r.a++ : r.b++; }));
    return `${H.back()}<div class="hs-head"><h1>${esc(a)} vs ${esc(b)}</h1><span class="hs-sub">Личные встречи за всё время сохранения</span></div>
      <section class="hs-box v84-h2h"><button type="button" data-team="${esc(a)}">${H.logo(a, 'xl')}<b>${esc(a)}</b><i>${aw}</i></button><div><small>Матчей</small><b>${ms.length}</b></div><button type="button" data-team="${esc(b)}">${H.logo(b, 'xl')}<b>${esc(b)}</b><i>${bw}</i></button></section>
      ${Object.keys(maps).length ? H.box('По картам', `<table class="hs-tbl hs-stbl"><tbody>${Object.entries(maps).map(([k, r]) => `<tr><td class="l">${esc(k)}</td><td>${r.a}</td><td>:</td><td>${r.b}</td></tr>`).join('')}</tbody></table>`, '', 'flush') : ''}
      ${H.box('Матчи', ms.length ? `<table class="hs-tbl hs-stbl"><tbody>${ms.slice(0, 30).map(m => `<tr data-match="${esc(m.id || '')}"><td class="l hs-dim">${esc(H.fdate ? H.fdate(m.ts) : '')}</td><td class="l">${esc(m.ev || '')}</td><td class="l"><b>${esc(m.w)}</b></td><td>${Array.isArray(m.s) ? m.s.join(':') : ''}</td></tr>`).join('')}</tbody></table>` : H.empty('Команды ещё не встречались'), '', 'flush')}`;
  };
  H.PAGES.eras = () => {
    const A = Object.values(H.archive()).filter(s => s && !s.show && !s.live && s.champion && s.champion !== '—' && T1.includes(s.prestige));
    const byY = {}; A.forEach(s => { const y = s.year || 0; const r = byY[y] = byY[y] || { titles: {}, majors: [] }; r.titles[s.champion] = (r.titles[s.champion] || 0) + (s.prestige === 'major' ? 3 : s.prestige === 'elite' ? 2 : 1); if (s.prestige === 'major') r.majors.push(`${s.champion} — ${s.name}`); });
    let poty = {}; try { Object.entries(W.RewardSystem?.getAllPlayerAwards?.() || {}).forEach(([nick, r]) => (r.aw || []).forEach(a => { if (a.type === 'poty') poty[a.y] = nick; })); } catch (e) {}
    if (ST()?.v84Legacy && W.CS2Legacy?.MAJORS) W.CS2Legacy.MAJORS.forEach(([name, y, team]) => { const r = byY[y] = byY[y] || { titles: {}, majors: [], legacy: true }; r.titles[team] = (r.titles[team] || 0) + 3; r.majors.push(`${team} — ${name}`); });
    const years = Object.keys(byY).map(Number).filter(Boolean).sort((a, b) => b - a);
    return `<div class="hs-head"><h1>Эпохи</h1><span class="hs-sub">Кто правил сценой: доминирующие команды, Мейджоры и игроки года по годам</span></div>
      <div class="v84-eras">${years.map(y => { const r = byY[y], dom = Object.entries(r.titles).sort((a, b) => b[1] - a[1]); return `<article class="v84-era"><div class="v84-era-y">${y}</div><div class="v84-era-b">${dom[0] ? `<button type="button" class="v84-era-dom" data-team="${esc(dom[0][0])}">${H.logo(dom[0][0], 'lg')}<span><small>Команда года</small><b>${esc(dom[0][0])}</b></span></button>` : ''}
        <div class="v84-era-l">${r.majors.map(m => `<span>🏆 ${esc(m)}</span>`).join('')}${poty[y] ? `<span>⭐ Игрок года: <button type="button" class="hs-link" data-player="${esc(poty[y])}">${esc(poty[y])}</button></span>` : ''}${dom.slice(1, 4).length ? `<span class="hs-dim">Также: ${dom.slice(1, 4).map(d => esc(d[0])).join(', ')}</span>` : ''}</div></div></article>`; }).join('') || H.empty('История начнётся после первых турниров')}</div>`;
  };
  // карточки игроков: рейтинг 50–99 по уровню и форме; редкость — по весу карьеры; еженедельный набор из трёх карт
  function cardOf(p, team) {
    const pow = (+p.firepower || 70) * .4 + (+p.tacticalIQ || 70) * .25 + (+p.clutch || 70) * .2 + (+p.utility || 70) * .15;
    const ovr = Math.max(50, Math.min(99, Math.round(W.CS2Power ? W.CS2Power.current(p) : pow + ((+p.form || 100) - 100) * .15)));
    const tier = W.CS2Stature?.tier?.(p) || 'regular', rar = tier === 'franchise' ? 'icon' : ovr >= 88 ? 'gold' : ovr >= 82 ? 'silver' : 'bronze';
    return { nick: p.nick, team, ovr, rar, role: p.role || '', cc: p.country || '' };
  }
  const cardHtml = c => `<div class="v84-card ${c.rar}"><div class="v84-card-o">${c.ovr}<small>${esc(c.role.slice(0, 3).toUpperCase())}</small></div><div class="v84-card-ph">${H.photoHtml({ nick: c.nick })}</div><b>${esc(c.nick)}</b><small>${c.cc ? H.flag(c.cc) : ''} ${esc(c.team)}</small></div>`;
  function weeklyPack() {
    const o = S(); if (!o) return; const wk = Math.floor(nowMs() / WEEK); if (o.cards.week === wk) return; o.cards.week = wk; o.cards.have = o.cards.have || {};
    const pool = ranked().slice(0, 40).flatMap(t => (t.players || []).map(p => ({ p, t: t.name })));
    if (!pool.length) return; const got = [];
    // v84: в коллекции хранится сама карточка (рейтинг, команда, редкость на момент получения) — она не исчезает,
    // если игрок сменил команду, ушёл на скамейку или его команда выпала из топ-40
    for (let i = 0; i < 3; i++) { const x = pool[h32('pack' + wk + i) % pool.length], card = cardOf(x.p, x.t), prev = o.cards.have[x.p.nick];
      const n = (typeof prev === 'number' ? prev : prev?.n || 0) + 1, best = prev && typeof prev === 'object' && prev.card && prev.card.ovr > card.ovr ? prev.card : card;
      o.cards.have[x.p.nick] = { n, card: Object.assign({}, best, { got: nowMs() }) }; got.push(Object.assign({}, card)); }
    o.cards.last = got; o.cards.lastWk = wk; try { W.saveSeasonState?.(); } catch (e) {}
  }
  H.PAGES.cards = () => {
    weeklyPack(); const o = S(), have = o?.cards?.have || {};
    const all = ranked().slice(0, 40).flatMap(t => (t.players || []).map(p => cardOf(p, t.name))).sort((a, b) => b.ovr - a.ovr);
    // старые сохранения: в коллекции были только ники — восстанавливаем карточку (из текущих составов или по профилю игрока)
    Object.keys(have).forEach(nick => { const v = have[nick]; if (v && typeof v === 'object' && v.card) return;
      const now = all.find(c => c.nick === nick) || (() => { const x = H.playerNow?.(nick); return x?.p ? cardOf(x.p, x.t?.name || 'свободный агент') : { nick, team: '', ovr: 75, rar: 'bronze', role: '', cc: '' }; })();
      have[nick] = { n: typeof v === 'number' ? v : 1, card: now }; });
    const mine = Object.values(have).map(v => v.card).filter(Boolean).sort((a, b) => b.ovr - a.ovr);
    const last = (o?.cards?.last || []).map(x => typeof x === 'string' ? (have[x]?.card || all.find(c => c.nick === x)) : x).filter(Boolean);
    return `<div class="hs-head"><h1>Карточки игроков</h1><span class="hs-sub">Рейтинг карточки меняется с формой игрока. Каждую игровую неделю — набор из трёх карт. Собрано: ${mine.length} из ${all.length}</span></div>
      ${last.length ? H.box('Набор этой недели', `<div class="v84-cards">${last.map(cardHtml).join('')}</div>`) : ''}
      ${H.box('Моя коллекция', mine.length ? `<div class="v84-cards">${mine.map(cardHtml).join('')}</div>` : H.empty('Коллекция пуста'))}
      ${H.box('Лучшие карточки сейчас', `<div class="v84-cards">${all.slice(0, 20).map(c => `<div class="${have[c.nick] ? '' : 'v84-card-lock'}">${cardHtml(c)}</div>`).join('')}</div>`)}`;
  };

  // ------------------------------------------------------------ подключение к страницам
  const origHome = H.PAGES.home;
  H.PAGES.home = arg => {
    let html = origHome(arg);
    const shown = new Set([...html.matchAll(/data-art="([^"]+)"/g)].map(m => m[1])); // без повторов с «Главными историями»
    const sp = spotlight(shown), mod = modHtml(), my = myFeedHtml();
    const spots = sp.length ? `<section class="v84-spots"><header><h3>Громкие новости</h3><span class="hs-sub">Топ-команды, легендарные клубы, ваша команда и стримеры</span></header><div class="v84-spots-g${sp.length % 2 ? ' odd' : ''}">${sp.map(spotCard).join('')}</div></section>` : '';
    const row = `<div class="v84-home-row${mod ? '' : ' one'}">${mod}<div class="v84-my-slot">${my}</div></div>`;
    // «Громкие новости» — в колонку под главным баннером (там было пустое место), иначе — над лентой
    const f = html.indexOf('<div class="v37-feature-foot"'), fe = f >= 0 ? html.indexOf('</div>', f) : -1;
    if (spots && fe > 0) html = html.slice(0, fe + 6) + spots + html.slice(fe + 6);
    else if (spots) { const j = html.indexOf('<div class="hs-grid2 hm-grid">'); html = j >= 0 ? html.slice(0, j) + spots + html.slice(j) : html + spots; }
    const i = html.indexOf('<div class="hs-grid2 hm-grid">'); return i >= 0 ? html.slice(0, i) + row + html.slice(i) : html + row;
  };
  // выделение громких новостей в лентах; «Моя лента» — в правую колонку под «Главные истории» (без пустоты справа)
  (H.AFTER || []).push(page => {
    try { if (page === 'home') { const rail = document.querySelector('#hs-page .v37-news-rail'), my = document.querySelector('#hs-page .v84-my-slot .v84-my');
      if (rail && my) { rail.appendChild(my); my.classList.add('in-rail'); const row = document.querySelector('#hs-page .v84-home-row'); if (row && !row.querySelector('.v84-mod')) row.remove(); else if (row) row.classList.add('one'); } } } catch (e) {}
    try {
      // v112: раньше здесь стоял return для всех страниц, кроме «Главной» и «Новостей», и кнопка «☆ Следить» в профиле игрока не появлялась
      if (['home', 'news'].includes(page)) document.querySelectorAll('#hs-page [data-art]:not(.v84-spot)').forEach(el => { const n = H.findNews?.(el.dataset.art); const k = spotKind(n); if (k) el.classList.add('v84-spotrow', 'v84-spotrow-' + k); });
    } catch (e) {}
    try {
      if (page === 'team' && !document.querySelector('#hs-page [data-fanof]')) { const head = document.querySelector('#hs-page .tm-head .tm-id'); const name = document.querySelector('#hs-page h1')?.textContent?.trim();
        if (head && name && H.teamBy(name) && !head.querySelector('[data-favteam]')) head.insertAdjacentHTML('beforeend', `<button type="button" class="hs-btn ${favTeam() === name ? '' : 'ghost'} sm v84-favbtn" data-favteam="${esc(name)}">${favTeam() === name ? '★ Моя команда' : '☆ Моя команда'}</button>`); }
      if (page === 'player') { const act = document.querySelector('#hs-page .hs-pact'), nick = String(H.S.arg || '').split('/')[0];
        if (act && !act.querySelector('[data-favpl]')) act.insertAdjacentHTML('afterbegin', `<button type="button" class="hs-btn ghost" data-favpl="${esc(nick)}">${favPlayer() === nick ? '★ Слежу' : '☆ Следить'}</button>`); }
      if (page === 'event') { const ct = typeof currentTournament !== 'undefined' ? currentTournament : null, h1 = document.querySelector('#hs-page h1')?.textContent || '';
        if (ct && ct.name && h1.includes(ct.name) && !ct.completed && !document.querySelector('.v84-evpick-box')) { const html = evPickBox(ct); if (html) document.querySelector('#hs-page .hs-ptabs, #hs-page .ev-tabs, #hs-page h1')?.insertAdjacentHTML('afterend', `<section class="hs-box v84-evpick-box"><header class="hs-box-h"><h3>Ваш прогноз на чемпиона</h3></header>${html}</section>`); } }
    } catch (e) {}
  });
  H.CLICKS.push(['[data-favteam]', el => { const o = S(); if (!o) return; o.favTeam = o.favTeam === el.dataset.favteam ? '' : el.dataset.favteam; try { (typeof teams !== 'undefined' ? teams : []).forEach(t => { t.isFan = t.name === o.favTeam; }); W.saveSeasonState?.(); } catch (e) {} H.render(); }]);
  H.CLICKS.push(['[data-favpl]', el => { const o = S(); if (!o) return; o.favPlayer = o.favPlayer === el.dataset.favpl ? '' : el.dataset.favpl; try { W.saveSeasonState?.(); } catch (e) {} H.render(); }]);
  H.CLICKS.push(['[data-evpick]', el => { const o = S(); if (!o) return; const [ev, t] = el.dataset.evpick.split('|'); if (o.evPick[ev]?.done) return; o.evPick[ev] = { team: t, at: nowMs() }; try { W.saveSeasonState?.(); } catch (e) {} H.render(); }]);
  H.CLICKS.push(['[data-h2h]', el => { H.nav('h2h', el.dataset.h2h); }]);
  // навигация: «Соперничества», «Эпохи», «Карточки»
  try { const G = W.CS2Nav?.GROUPS; if (G) { const hist = G.find(g => g[0] === 'history'), com = G.find(g => g[0] === 'community');
    if (hist && !hist[2].some(x => x[0] === 'eras')) hist[2].push(['eras', 'Эпохи'], ['rivalries', 'Соперничества']);
    if (com && !com[2].some(x => x[0] === 'cards')) com[2].push(['cards', 'Карточки игроков']); } } catch (e) {}
  try { Object.assign(H.SECTION_OF || {}, { eras: 'history', rivalries: 'history', h2h: 'history', cards: 'community' }); } catch (e) {}
  // уведомления по любимой команде
  let lastFavMs = 0;
  function favTick() { const ft = favTeam(); if (!ft || batch()) return; const m = T1ms().filter(x => (x.a === ft || x.b === ft) && x.ts > lastFavMs).sort((a, b) => b.ts - a.ts)[0]; if (!m) return; if (!lastFavMs) { lastFavMs = m.ts; return; } lastFavMs = m.ts;
    try { W.v29Toast?.(`<div class="v29-toast-ic">${m.w === ft ? '✅' : '❌'}</div><div class="v29-toast-t"><small>Моя команда</small><b>${esc(m.a)} ${Array.isArray(m.s) ? m.s.join(':') : ''} ${esc(m.b)}</b><span>${esc(m.ev || '')}</span></div>`); } catch (e) {} }
  (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => { [weekly, recordWatch, tourneyTick, favTick].forEach(f => { try { f(); } catch (e) {} }); }, 5000);
  W.CS2Watch = { spotlight, spotKind, matchOfDay, rivalries, rivalryOf, cardOf, state: S, favTeam, favPlayer };
})();
