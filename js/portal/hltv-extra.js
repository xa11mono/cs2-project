/* v84 — разделы HLTV, которых не хватало:
   • Игрок недели (по матчам за 7 игровых дней) и «Топ-5 моментов» каждого турнира Tier-1;
   • Фэнтези: пятёрка игроков на текущий турнир с бюджетом, очки по реальной статистике, рейтинг с сообществом;
   • Форум: еженедельные треды с опросами и комментариями пользователей сообщества;
   • Рекорды: команды и игроки по всей истории сохранения;
   • Зал славы: ежегодное введение новых членов после церемонии HLTV Awards;
   • Жизнь после карьеры: ветераны становятся тренерами, аналитиками и кастерами. */
(function () {
  'use strict';
  const W = window, H = W.HS; if (!H) return;
  const { esc, box, empty } = H;
  const DAY = 864e5, WEEK = 7 * DAY;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const pick = (seed, a) => a[h32(seed) % a.length];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const news = it => { try { return W.V29News?.add?.(it); } catch (e) { return null; } };
  const P = n => ({ t: 'player', v: n }), T = n => ({ t: 'team', v: n });
  const X = () => { const s = ST(); return s ? (s.v84Extra = s.v84Extra || { potwWeek: 0, potw: [], hl: {}, fan: {}, forum: { week: 0, threads: [], votes: {} }, hof: {}, after: {} }) : null; };
  const T1 = ['major', 'elite', 'regular'];
  const batch = () => !!W.v57BatchCalendarSkip;
  const persona = n => W.CS2Community?.persona?.(n) || { nick: n, cc: '', hue: h32(n) % 360 };
  const ava = (p, s) => W.CS2Community?.avatar ? W.CS2Community.avatar(p, s) : '';
  const USERS = ['dust2lover', 'awp_daddy', 'ecoround', 'anchor_main', 'molotov_mike', 'clutch_or_kick', 'pistol_king', 'smoke_wizard', 'mid_control', 'lurk_enjoyer', 'retake_god', 'eco_frag', 'boost_spot', 'flash_assist', 'ct_sided', 't_sided', 'force_buy', 'last_alive', 'hltv_analyst', 'demo_reviewer', 'utility_lab', 'eco_math', 'map_pool_nerd', 'roundswing', 'kast_enjoyer'];

  // ================================================================ игрок недели
  function potwTick() {
    const x = X(); if (!x || batch()) return;
    const now = nowMs(), wk = Math.floor(now / WEEK); if (x.potwWeek === wk) return;
    x.potwWeek = wk;
    let st; try { st = H.stats(); } catch (e) { return; }
    const ids = new Set((H.allMatches() || []).filter(m => m && m.ts >= now - WEEK && m.ts <= now && T1.concat(['tier2']).includes(m.kind)).map(m => m.id));
    if (!ids.size) return;
    const rows = [];
    Object.values(st.P || {}).forEach(o => {
      const z = H.Z0(); let n = 0, team = o.team;
      (o.matches || []).forEach(pm => { if (ids.has(pm.id)) { Object.keys(z).forEach(k => { z[k] += pm.z[k] || 0; }); n++; team = pm.team; } });
      if (!n) return; const L = H.line(z); if (L.maps >= 4) rows.push({ nick: o.nick, team, L });
    });
    const best = rows.sort((a, b) => b.L.rating - a.L.rating)[0]; if (!best) return;
    x.potw.unshift({ wk, nick: best.nick, team: best.team, rating: +best.L.rating.toFixed(2), maps: best.L.maps, adr: Math.round(best.L.adr) }); if (x.potw.length > 60) x.potw.length = 60;
    news({ cat: 'stats', icon: '⭐', imp: 5, title: `Игрок недели — ${best.nick}`, lead: `${best.nick} (${best.team}) провёл ${best.L.maps} карт с рейтингом ${best.L.rating.toFixed(2)} и ADR ${Math.round(best.L.adr)}.`,
      body: [pick('pw|' + wk, ['Лучший результат среди всех игроков Tier-1 и Tier-2 за последние семь дней.', 'Ни один игрок на этой неделе не приблизился к его цифрам.', 'Стабильность на всех картах: ни одной карты с рейтингом ниже единицы.'])], tags: [P(best.nick), T(best.team)] });
  }

  // ================================================================ топ-5 моментов турнира
  const PLAYS = {
    AWPer: ['4k с AWP на {map}, держа {site} в одиночку', 'ноускоп в упор в решающем раунде на {map}', 'три фрага с AWP на ретейке {site} ({map})', 'эйс с AWP на пистолетном раунде… второй половины на {map}', 'флик через смок в овертайме {map}'],
    Rifler: ['эйс с AK-47 на {map}', 'клатч 1v3 на {site} ({map})', 'спрей-трансфер на четверых в {site} ({map})', 'клатч 1v4 с M4A1-S на {map}', '4k с Deagle на форс-раунде ({map})'],
    Entry: ['вход в {site} на троих на {map}', 'тройка за пять секунд на открытии {map}', 'энтри 4k с Galil на форсе ({map})', 'эйс на пистолетке {map}'],
    IGL: ['клатч 1v2 с дефузом в последнюю секунду ({map})', 'хитрый ниндзя-дефуз на {site} ({map})', 'ретейк 1v3 на {site} ({map})'],
    Support: ['клатч 1v3 с одной HE и пистолетом на {map}', 'ретейк в одиночку после флешки через всю карту ({map})', '3k с UMP на экономическом раунде ({map})'],
    Lurker: ['удар в спину четверым на {map}', 'клатч 1v4 из лурка на {map}', 'тройка в тылу на {site} ({map})']
  };
  const SITES = ['A', 'B', 'мид', 'банан', 'аппсы', 'рампу', 'шорт'];
  const roleKey = r => /awp/i.test(r || '') ? 'AWPer' : /igl/i.test(r || '') ? 'IGL' : /support/i.test(r || '') ? 'Support' : /lurk/i.test(r || '') ? 'Lurker' : /entry/i.test(r || '') ? 'Entry' : 'Rifler';
  function highlightsFor(snap) {
    let st; try { st = H.stats(); } catch (e) { return null; }
    const ms = (H.allMatches() || []).filter(m => m && m.evId === snap.id && Array.isArray(m.mp)); if (!ms.length) return null;
    const rows = [];
    Object.values(st.P || {}).forEach(o => { const e = o.byEv?.[snap.id]; if (!e) return; const L = H.line(e.s); if (L.maps >= 2) rows.push({ nick: o.nick, team: e.team, L, role: o.p?.role }); });
    rows.sort((a, b) => b.L.rating - a.L.rating);
    const top = rows.slice(0, 8), out = [];
    for (let i = 0; i < top.length && out.length < 5; i++) {
      const r = top[i], m = ms.find(z => z.a === r.team || z.b === r.team); if (!m) continue;
      const mp = m.mp[h32(r.nick + snap.id) % m.mp.length], map = mp?.[0] || 'Mirage', opp = m.a === r.team ? m.b : m.a;
      const tpl = pick('hl|' + snap.id + r.nick, PLAYS[roleKey(r.role)]);
      out.push({ nick: r.nick, team: r.team, opp, map, text: tpl.replace('{map}', map).replace('{site}', pick('s|' + r.nick + snap.id, SITES)), stage: m.r || m.round || '' });
    }
    return out.reverse(); // #5 → #1
  }
  function hlTick() {
    const x = X(); if (!x || batch()) return;
    const A = H.archive() || {};
    Object.values(A).forEach(s => {
      if (!s || x.hl[s.id] || s.show || !s.champion || s.champion === '—') return;
      const kind = String(s.prestige || s.kind || '').toLowerCase(); if (!T1.includes(kind)) return;
      if ((Number(s.ge) || 0) < nowMs() - 30 * DAY) { x.hl[s.id] = { old: 1 }; return; } // старые турниры не ворошим
      const list = highlightsFor(s); x.hl[s.id] = { list: list || [], at: nowMs() };
      if (list && list.length >= 3) news({ cat: 'stats', icon: '🎬', imp: 5, ev: s.id, title: `Топ-5 моментов ${s.name}`, lead: `Первое место — ${list[list.length - 1].nick}: ${list[list.length - 1].text} против ${list[list.length - 1].opp}.`,
        body: list.map((p, i) => `#${list.length - i}. ${p.nick} (${p.team}) — ${p.text}, против ${p.opp}.`), tags: list.slice(-2).map(p => P(p.nick)) });
    });
  }
  (H.AFTER || []).push(page => {
    if (page !== 'event') return;
    try {
      const x = X(), id = String(H.S.arg || ''), hl = x?.hl?.[id]?.list; if (!hl || !hl.length) return;
      const root = document.getElementById('hs-page'); if (!root || root.querySelector('.v84-hl')) return;
      const html = box('Топ-5 моментов', `<ol class="v84-hl">${hl.slice().reverse().map(p => `<li><b data-player="${esc(p.nick)}">${esc(p.nick)}</b> <small>${esc(p.team)}</small><span>${esc(p.text)} — против ${esc(p.opp)}</span></li>`).join('')}</ol>`);
      const host = root.querySelector('.hs-box:last-of-type'); if (host) host.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('beforeend', html);
    } catch (e) {}
  });

  // ================================================================ фэнтези
  const BUDGET = 1000000;
  function liveCT() { const ct = typeof currentTournament !== 'undefined' ? currentTournament : null; return ct && ct.name && !ct.completed && (ct.participants || []).length ? ct : null; }
  function fanKey(ct) { return ct.name + '|' + (ct.season || ''); }
  function priced(ct) {
    let st = null; try { st = H.stats(); } catch (e) {}
    const cur = ST()?.currentSeason;
    const out = [];
    (ct.participants || []).map(x => x?.name || x).forEach(tn => {
      const t = H.teamBy ? H.teamBy(tn) : (typeof teams !== 'undefined' ? teams.find(z => z.name === tn) : null);
      (t?.players || []).filter(p => p && p.nick && p.status !== 'BENCH').slice(0, 5).forEach(p => {
        const o = st?.P?.[p.nick], z = o?.bySeason?.[cur] || o?.bySeason?.[cur - 1] || o?.all, L = z ? H.line(z) : null;
        const r = L && L.maps >= 5 ? L.rating : 0.95 + (((+p.firepower || 70) - 70) / 100);
        out.push({ nick: p.nick, team: tn, role: p.role, r: +r.toFixed(2), price: Math.round(clamp(100000 + (r - .85) * 520000, 80000, 340000) / 5000) * 5000 });
      });
    });
    return out.sort((a, b) => b.price - a.price);
  }
  function locked(ct) { return (ct.broadcast?.finished?.length || 0) > 0 || (ct.v84FanLock === true); }
  function scoreFor(snap, nicks) {
    let st; try { st = H.stats(); } catch (e) { return null; }
    const place = {}; (snap.results || []).forEach(r => { place[r.n] = r.p; });
    let total = 0; const per = nicks.map(n => {
      const o = st.P?.[n]; const e = o ? Object.values(o.byEv || {}).find(v => v.id === snap.id || v.name === snap.name) : null;
      if (!e) return { nick: n, pts: 0 };
      const L = H.line(e.s), p = place[e.team] || 16, bonus = p === 1 ? 40 : p === 2 ? 25 : p <= 4 ? 15 : p <= 8 ? 6 : 0;
      const pts = Math.round(L.maps * (L.rating * 20 - 16) + bonus); total += pts; return { nick: n, pts, rating: +L.rating.toFixed(2), maps: L.maps };
    });
    return { total, per };
  }
  function aiSquad(nick, pool) {
    const p = persona(nick), sharp = /analyst|stats/.test(p.style || '');
    const noise = x => (h32(nick + '|' + x.nick) % 1000) / 1000;
    const order = pool.slice().sort((a, b) => sharp ? (b.r + noise(b) * .08) - (a.r + noise(a) * .08) : (b.r * .4 + noise(b)) - (a.r * .4 + noise(a)));
    const pickd = [], cnt = {}; let left = BUDGET;
    for (const x of order) { if (pickd.length >= 5) break; if ((cnt[x.team] || 0) >= 2 || x.price > left - (4 - pickd.length) * 80000) continue; pickd.push(x.nick); cnt[x.team] = (cnt[x.team] || 0) + 1; left -= x.price; }
    return pickd;
  }
  function fanSettle() {
    const x = X(); if (!x) return;
    const A = H.archive() || {};
    Object.entries(x.fan).forEach(([k, f]) => {
      if (f.done) return;
      const snap = Object.values(A).find(s => s && s.name === f.name && s.champion && s.champion !== '—'); if (!snap) return;
      const me = f.mine?.length === 5 ? scoreFor(snap, f.mine) : null;
      const rivals = USERS.slice(0, 10).map(u => ({ u, sc: scoreFor(snap, f.ai?.[u] || []) })).filter(r => r.sc);
      f.result = { me, rivals: rivals.map(r => ({ u: r.u, total: r.sc.total })) }; f.done = nowMs();
      if (me) { const place = 1 + rivals.filter(r => r.sc.total > me.total).length; f.result.place = place;
        news({ cat: 'event', icon: '🧮', imp: 4, title: `Фэнтези ${f.name}: ${me.total} очков, ${place}-е место`, lead: `Лучший в вашей пятёрке — ${me.per.slice().sort((a, b) => b.pts - a.pts)[0].nick}.`, body: [`Состав: ${me.per.map(p => `${p.nick} (${p.pts})`).join(', ')}.`], tags: [] }); }
    });
  }
  H.S.fan = H.S.fan || { sort: 'price' };
  H.PAGES.fantasy = function () {
    const x = X(), ct = liveCT();
    const hist = Object.values(x?.fan || {}).filter(f => f.done && f.result).sort((a, b) => b.done - a.done).slice(0, 6);
    const histHtml = hist.map(f => `<div class="v84-fh"><b>${esc(f.name)}</b><span>${f.result.me ? `${f.result.me.total} очк. · ${f.result.place}-е из ${f.result.rivals.length + 1}` : 'без состава'}</span></div>`).join('');
    if (!ct) return `<div class="hs-head"><h1>Фэнтези</h1></div><div class="v84-cols"><div>${box('Текущий турнир', empty('Фэнтези открывается, когда известен состав участников ближайшего турнира'))}</div><div>${box('История', histHtml || empty('Пока не играли'))}</div></div>`;
    const k = fanKey(ct), f = x.fan[k] || (x.fan[k] = { name: ct.name, mine: [], ai: {} });
    const pool = priced(ct);
    if (!Object.keys(f.ai).length) USERS.slice(0, 10).forEach(u => { f.ai[u] = aiSquad(u, pool); });
    const lock = locked(ct), spent = f.mine.reduce((a, n) => a + (pool.find(p => p.nick === n)?.price || 0), 0), left = BUDGET - spent;
    const cnt = {}; f.mine.forEach(n => { const t = pool.find(p => p.nick === n)?.team; if (t) cnt[t] = (cnt[t] || 0) + 1; });
    const $ = v => '$' + Math.round(v / 1000) + 'K';
    const rows = pool.map(p => { const on = f.mine.includes(p.nick), can = !lock && (on || (f.mine.length < 5 && p.price <= left && (cnt[p.team] || 0) < 2));
      return `<tr class="${on ? 'on' : ''}"><td class="l"><b data-player="${esc(p.nick)}">${esc(p.nick)}</b></td><td class="l">${esc(p.team)}</td><td>${esc(p.role || '')}</td><td>${p.r.toFixed(2)}</td><td>${$(p.price)}</td><td><button type="button" class="hs-chip${on ? ' on' : ''}" data-fan="${esc(p.nick)}"${can ? '' : ' disabled'}>${on ? 'убрать' : 'взять'}</button></td></tr>`; }).join('');
    const mine = f.mine.map(n => { const p = pool.find(z => z.nick === n); return `<div class="v84-fp"><b>${esc(n)}</b><small>${esc(p?.team || '')} · ${p ? $(p.price) : ''}</small></div>`; }).join('') + Array.from({ length: 5 - f.mine.length }, () => '<div class="v84-fp empty">+</div>').join('');
    const rivals = USERS.slice(0, 10).map(u => `<div class="v84-fr" data-user="${esc(u)}">${ava(persona(u), 22)}<b>${esc(u)}</b><small>${(f.ai[u] || []).join(', ')}</small></div>`).join('');
    return `<div class="hs-head"><h1>Фэнтези · ${esc(ct.name)}</h1></div><div class="v84-cols"><div>${box(`Ваша пятёрка · осталось ${$(left)}`, `<div class="v84-fteam">${mine}</div><p class="v84-note">${lock ? 'Составы заблокированы: турнир начался. Очки начислят после финала.' : 'Бюджет $1 000 000, не больше двух игроков из одной команды. Очки: рейтинг за каждую карту и бонус за место команды.'}</p>`)}${box('Игроки турнира', `<table class="hs-tbl hs-stbl v84-ftbl"><thead><tr><th class="l">Игрок</th><th class="l">Команда</th><th>Роль</th><th>Рейтинг</th><th>Цена</th><th></th></tr></thead><tbody>${rows}</tbody></table>`, '', 'flush')}</div>` +
      `<div>${box('Соперники из сообщества', rivals)}${box('История', histHtml || empty('Пока не играли'))}</div></div>`;
  };
  H.CLICKS.push(['[data-fan]', el => {
    const x = X(), ct = liveCT(); if (!x || !ct || locked(ct)) return; const f = x.fan[fanKey(ct)]; if (!f) return;
    const n = el.dataset.fan, i = f.mine.indexOf(n); if (i >= 0) f.mine.splice(i, 1); else if (f.mine.length < 5) f.mine.push(n);
    try { W.saveSeasonState?.(); } catch (e) {} H.render();
  }]);

  // ================================================================ форум
  const CM = {
    a: ['Честно,', 'Как по мне,', 'Смотрю CS с 1.6 и скажу так:', 'Без хейта, но', 'Объективно', 'Посмотрел последние демки —', 'Кто бы что ни говорил,', 'Unpopular opinion:', 'Ставлю косарь, что', 'Если по цифрам,'],
    b: ['{opt} сейчас вне конкуренции', 'за {opt} даже спорить не о чем', '{opt} переоценён, но всё равно лучше остальных', 'всё решит форма к Мейджору, а там {opt}', 'у {opt} нет слабых мест', '{opt} — это стабильность', 'голосую за {opt}, остальные варианты смешные', '{opt} вывезет на характере', 'я бы взял {opt}, но с оговорками', 'дайте {opt} нормальный состав — и увидите'],
    c: ['', ' 😂', '. Спорьте.', ', аргументы в профиле.', '. Год назад я говорил то же самое.', '. Анализ рейтинга это подтверждает.', '. GG WP.', ', а вы как думаете?', '. Только не надо про один турнир.', '. Факты.']
  };
  function forumBuild(wk) {
    const st = ST(), out = [];
    let ranked = []; try { ranked = (H.ranked ? H.ranked() : []).slice(0, 12).map(t => t.name || t); } catch (e) {}
    let tops = []; try { const S = H.stats(), cur = st?.currentSeason; tops = Object.values(S.P || {}).map(o => ({ n: o.nick, z: o.bySeason?.[cur] })).filter(x => x.z && x.z.maps >= 10).map(x => ({ n: x.n, r: H.line(x.z).rating })).sort((a, b) => b.r - a.r).slice(0, 4).map(x => x.n); } catch (e) {}
    const nextMajor = (st?.seasonSchedule || []).slice(Number(st?.tournamentIndex) || 1).find(e => e && e.type === 'major');
    if (tops.length >= 3) out.push({ id: 'goat' + wk, t: 'Кто сейчас лучший игрок мира?', opts: tops });
    if (ranked.length >= 4 && nextMajor) out.push({ id: 'maj' + wk, t: `Кто выиграет ${nextMajor.name}?`, opts: ranked.slice(0, 4) });
    const pool = (typeof MAP_POOL !== 'undefined' && MAP_POOL.length ? MAP_POOL : ['Mirage', 'Inferno', 'Nuke', 'Ancient']).slice(); out.push({ id: 'map' + wk, t: 'Лучшая карта текущего пула?', opts: pool.sort((a, b) => h32(wk + a) - h32(wk + b)).slice(0, 4) });
    if (ranked.length >= 8) { const tm = ranked[4 + h32('igl' + wk) % 4]; out.push({ id: 'igl' + wk, t: `${tm}: пора менять капитана?`, opts: ['Да, давно пора', 'Нет, дайте время', 'Менять надо тренера', 'Проблема в снайпере'] }); }
    const W_ = W.CS2World?.state?.(); const pt = W_?.patches?.[W_.patches.length - 1];
    if (pt && nowMs() - pt.at < 40 * DAY) out.push({ id: 'patch' + pt.at, t: `${pt.name}: как вам изменения?`, opts: ['Отличный патч', 'Valve опять всё сломали', 'Без разницы', 'Посмотрим на Мейджоре'] });
    const tr = (W.V29News?.all() || []).find(n => n.cat === 'transfer' && n.ts > nowMs() - 21 * DAY);
    if (tr) out.push({ id: 'tr' + tr.id, t: `${tr.title} — хороший ход?`, opts: ['Да, усиление', 'Нет, деньги на ветер', 'Рано судить'] });
    return out.map(th => {
      const base = th.opts.map((o, i) => 40 + (h32(th.id + o) % 160) + (th.opts.length - i) * 25);
      const users = USERS.slice().sort((a, b) => h32(th.id + a) - h32(th.id + b)).slice(0, 5 + h32(th.id) % 4);
      const cms = users.map((u, i) => { const o = th.opts[h32(th.id + u) % th.opts.length], x = h32(th.id + u + i);
        return { u, text: (CM.a[x % CM.a.length] + ' ' + CM.b[(x >>> 7) % CM.b.length].replace('{opt}', o) + CM.c[(x >>> 14) % CM.c.length]).trim(), likes: x % 140 }; });
      return Object.assign(th, { base, cms, at: nowMs() - (h32(th.id) % 5) * DAY });
    });
  }
  function forumTick() {
    const x = X(); if (!x || batch()) return;
    const wk = Math.floor(nowMs() / WEEK); if (x.forum.week === wk && x.forum.threads.length) return;
    x.forum.week = wk; x.forum.threads = forumBuild(wk);
  }
  H.PAGES.forum = function () {
    forumTick(); const x = X(), F = x?.forum; if (!F || !F.threads.length) return `<div class="hs-head"><h1>Форум</h1></div>` + box('Треды', empty('Форум оживёт после первых матчей сезона'));
    const thread = th => {
      const my = F.votes[th.id], votes = th.base.map((v, i) => v + (my === i ? 1 : 0)), sum = votes.reduce((a, b) => a + b, 0);
      const opts = th.opts.map((o, i) => { const pc = Math.round(votes[i] / sum * 100); return `<button type="button" class="v84-po${my === i ? ' on' : ''}" data-fvote="${esc(th.id)}|${i}"${my != null ? ' disabled' : ''}><span style="width:${pc}%"></span><b>${esc(o)}</b><em>${my != null ? pc + '%' : ''}</em></button>`; }).join('');
      const cms = th.cms.map(c => `<div class="v84-fc">${ava(persona(c.u), 24)}<div><b data-user="${esc(c.u)}">${esc(c.u)}</b> <small>♥ ${c.likes}</small><p>${esc(c.text)}</p></div></div>`).join('');
      return box(th.t, `<div class="v84-poll">${opts}</div><p class="v84-note">${sum} голосов${my == null ? ' · проголосуйте, чтобы увидеть результаты' : ''}</p><div class="v84-fcs">${cms}</div>`);
    };
    const half = Math.ceil(F.threads.length / 2);
    return `<div class="hs-head"><h1>Форум</h1></div><div class="v84-cols"><div>${F.threads.slice(0, half).map(thread).join('')}</div><div>${F.threads.slice(half).map(thread).join('')}</div></div>`;
  };
  H.CLICKS.push(['[data-fvote]', el => { const x = X(); if (!x) return; const [id, i] = el.dataset.fvote.split('|'); if (x.forum.votes[id] == null) x.forum.votes[id] = +i; H.render(); }]);

  // ================================================================ рекорды
  H.PAGES.records = function () {
    const A = H.archive() || {}, snaps = Object.values(A).filter(s => s && !s.show && s.champion && s.champion !== '—' && T1.includes(String(s.prestige || s.kind || '').toLowerCase()));
    const cnt = (list, key) => { const m = {}; list.forEach(s => { const k = key(s); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const majors = snaps.filter(s => /major/i.test(String(s.prestige || s.kind)));
    const tMaj = cnt(majors, s => s.champion), tAll = cnt(snaps, s => s.champion), tFin = cnt(snaps.flatMap(s => (s.results || []).filter(r => r.p <= 2).map(r => ({ champion: r.n }))), s => s.champion);
    const pTitles = {}, pMaj = {};
    snaps.forEach(s => (s.rost?.[s.champion] || []).forEach(p => { const n = p.nick || p; pTitles[n] = (pTitles[n] || 0) + 1; if (/major/i.test(String(s.prestige || s.kind))) pMaj[n] = (pMaj[n] || 0) + 1; }));
    const srt = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
    let AW = {}; try { AW = H.awards() || {}; } catch (e) {}
    const mvp = Object.entries(AW).map(([n, r]) => [n, (r.mvp || []).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    const no1 = Object.entries(AW).map(([n, r]) => [n, (r.top || []).filter(x => x.r === 1).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    let best = []; try { const S = H.stats(); best = Object.values(S.P || {}).flatMap(o => Object.entries(o.bySeason || {}).map(([s, z]) => ({ n: o.nick, s, L: H.line(z) }))).filter(x => x.L.maps >= 40).sort((a, b) => b.L.rating - a.L.rating).slice(0, 5); } catch (e) {}
    // v84: в рекордах — логотипы команд и портреты игроков
    const pic = (n, attr) => attr === 'data-team' ? `<span class="v84-rec-logo">${H.logo ? H.logo(n, 'sm') : ''}</span>`
      : `<span class="v84-rec-ph ph">${H.photoHtml ? H.photoHtml(H.playerNow?.(n)?.p || { nick: n }) : ''}</span>`;
    const tbl = (rows, unit, attr) => rows.length ? `<div class="v84-rec">${rows.slice(0, 5).map(([n, v], i) => `<button type="button" class="v84-rec-row${i === 0 ? ' top' : ''}" ${attr}="${esc(n)}"><span class="n">${i + 1}</span>${pic(n, attr)}<b>${esc(n)}</b><em>${v}${unit ? ' ' + unit : ''}</em></button>`).join('')}</div>` : empty('Пока нет данных');
    return `<div class="hs-head"><h1>Рекорды</h1></div><div class="v84-grid3">` +
      box('Больше всех Major (команды)', tbl(tMaj, '', 'data-team')) + box('Больше всех титулов Tier-1 (команды)', tbl(tAll, '', 'data-team')) + box('Больше всех финалов', tbl(tFin, '', 'data-team')) +
      box('Больше всех титулов (игроки)', tbl(srt(pTitles), '', 'data-player')) + box('Больше всех Major (игроки)', tbl(srt(pMaj), '', 'data-player')) + box('Больше всех MVP', tbl(mvp, '', 'data-player')) +
      box('№1 в Top-20 года', tbl(no1, 'раз', 'data-player')) +
      box('Лучший рейтинг за сезон (40+ карт)', best.length ? tbl(best.map(x => [x.n, `${x.L.rating.toFixed(2)} · сезон ${x.s}`]), '', 'data-player') : empty('Пока нет данных')) +
      box('Игроки недели', (X()?.potw || []).slice(0, 5).map(p => `<div class="v84-fh"><b data-player="${esc(p.nick)}">${esc(p.nick)}</b><span>${esc(p.team)} · ${p.rating.toFixed(2)} · ${p.maps} карт</span></div>`).join('') || empty('Появится через неделю матчей')) + `</div>`;
  };

  // ================================================================ зал славы и жизнь после карьеры
  function hofTick() {
    const x = X(); if (!x || batch() || typeof H.hallOfFame !== 'function') return;
    const d = new Date(nowMs()); if (d.getMonth() !== 0 || d.getDate() < 10) return;
    const y = d.getFullYear(); if (x.hof['y' + y]) return; x.hof['y' + y] = 1;
    let list = []; try { list = H.hallOfFame(); } catch (e) { return; }
    const fresh = list.filter(p => !p.active && !x.hof[p.nick]); fresh.forEach(p => { x.hof[p.nick] = y; }); // вводят только завершивших карьеру
    if (!fresh.length) return;
    news({ cat: 'season', icon: '🏛️', imp: 7, title: `Зал славы HLTV ${y}: ${fresh.slice(0, 3).map(p => p.nick).join(', ')}${fresh.length > 3 ? ` и ещё ${fresh.length - 3}` : ''}`,
      lead: `После церемонии HLTV Awards в Зал славы введены ${fresh.length} ${fresh.length === 1 ? 'игрок' : 'игроков'}.`,
      body: fresh.slice(0, 6).map(p => `${p.nick}: Major — ${p.maj}, титулов — ${p.ti}, MVP — ${p.mvp}, попаданий в Top-20 — ${p.top}.`), tags: fresh.slice(0, 3).map(p => P(p.nick)) });
  }
  // v84: тренерская карьера — через рынок тренеров (CS2Coaches: реальный клуб, профиль, трансферы); здесь — остальные пути
  const NEXT = [['analyst', 'стал аналитиком HLTV'], ['caster', 'дебютирует как кастер'], ['streamer', 'ушёл в стриминг'], ['analyst', 'присоединился к студии трансляций']];
  function afterTick() {
    const x = X(); if (!x || batch()) return;
    const now = nowMs();
    (W.V29News?.all() || []).slice(0, 120).forEach(n => {
      if (n.cat !== 'player' || !/завершает карьеру/.test(n.title || '') || !n.player || x.after[n.player]) return;
      try { if (W.CS2Coaches?.state()?.pool?.some(c => c.name === n.player) || W.CS2Coaches?.roleOf(n.player)) { x.after[n.player] = { done: 1 }; return; } } catch (e) {}
      const h = h32('after|' + n.player); x.after[n.player] = { at: n.ts + (25 + h % 60) * DAY, kind: NEXT[h % NEXT.length], team: n.team || '' };
    });
    Object.entries(x.after).forEach(([nick, a]) => {
      if (a.done || now < a.at) return; a.done = now;
      // v114: за время ожидания игрок мог стать тренером — тогда новости «стал аналитиком» нет (было расхождение с профилем)
      try { if (W.CS2Coaches?.roleOf?.(nick) || W.CS2Coaches?.state?.()?.pool?.some(c => c.name === nick)) return; } catch (e) {}
      let where = '';
      if (!a.kind || a.kind[0] === 'coach') return; // старые сейвы: тренерство — только через рынок тренеров
      if (a.kind[0] === 'coach') { const tm = (typeof teams !== 'undefined' ? teams : []).filter(t => !t.isAcademy).sort((p, q) => h32(nick + p.name) - h32(nick + q.name))[0]; where = tm ? ` в ${tm.name}` : ''; }
      if (a.kind[0] === 'caster') { const ev = (ST()?.seasonSchedule || []).slice(Number(ST()?.tournamentIndex) || 1).find(Boolean); where = ev ? ` на ${ev.name}` : ''; }
      news({ cat: 'player', icon: a.kind[0] === 'caster' ? '🎙️' : a.kind[0] === 'coach' ? '📋' : a.kind[0] === 'streamer' ? '📺' : '🧠', imp: 5,
        title: `${nick} ${a.kind[1]}${where}`, lead: `Бывший игрок ${a.team || ''} нашёл себя после завершения карьеры.`.replace('  ', ' '),
        body: [pick('ab|' + nick, ['«Без CS я не смог. Теперь смотрю на игру с другой стороны»', '«Опыт никуда не делся — хочу передать его дальше»', '«Сначала думал отдохнуть, но через месяц понял, что скучаю по сцене»'])], tags: [P(nick)] });
    });
  }

  // ================================================================ меню и цикл
  [['fantasy', 'Фэнтези'], ['forum', 'Форум'], ['records', 'Рекорды']].forEach(([k, l]) => { try { if (Array.isArray(H.NAV_MORE) && !H.NAV_MORE.some(x => x[0] === k)) H.NAV_MORE.push([k, l]); } catch (e) {} });
  const addMenu = () => { try { const m = document.querySelector('.pt-menu[data-menu="more"]'); if (!m) return; [['fantasy', 'Фэнтези'], ['forum', 'Форум'], ['records', 'Рекорды']].forEach(([k, l]) => { if (!m.querySelector(`[data-nav="${k}"]`)) m.insertAdjacentHTML('beforeend', `<button type="button" data-nav="${k}">${l}</button>`); }); } catch (e) {} };
  (H.AFTER || []).push(addMenu); setTimeout(addMenu, 1700);
  function tick() { [potwTick, hlTick, fanSettle, forumTick, hofTick, afterTick].forEach(f => { try { f(); } catch (e) { console.warn('[v84 extra]', f.name, e); } }); }
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(tick, 5000);
  W.CS2Extra = { tick, highlightsFor, priced, scoreFor, forumBuild, state: X };
})();
