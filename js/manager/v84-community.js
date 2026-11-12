/* v84 — сообщество HLTV: профили комментаторов, аналитиков и стримеров.
   • Любой ник из комментариев открывает профиль (персона строится детерминированно по нику).
   • У каждого — любимая команда, стиль, Pick'Em на каждый Мейджор (с точностью после этапа),
     авторские посты и история комментариев.
   • Стримеры — отдельный тип: площадка, аудитория, ко-стримы Мейджоров, рекорды онлайна,
     участие в Streamers Battle (с приглашёнными про-игроками), новости о правах на каст и контрактах.
   Тексты собираются из частей (вступление × мысль × вывод) с учётом ситуации и стиля автора. */
(function () {
  'use strict';
  const H = window.HS, N = window.V29News; if (!H || !N) return;
  const W = window, { esc, logo, box, empty } = H;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const pick = (arr, seed) => arr[h32(seed) % arr.length];
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const TEAMS = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const ranked = () => TEAMS().filter(t => !t.isAcademy).slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? v[k] : m));
  const store = () => { const s = ST(); if (!s) return { stages: {}, results: {}, news: {} }; s.v84Comm = s.v84Comm || { stages: {}, results: {}, news: {} }; return s.v84Comm; };

  // ------------------------------------------------------------ персоны
  const STYLES = {
    analyst: { l: 'Аналитик', d: 'разбирает демки и статистику' },
    fan: { l: 'Фанат', d: 'болеет за свою команду при любом счёте' },
    hater: { l: 'Критик', d: 'не верит фаворитам и любит апсеты' },
    stats: { l: 'Статистик', d: 'считает рейтинги и тренды' },
    meme: { l: 'Мемолог', d: 'комментирует с юмором' },
    veteran: { l: 'Ветеран сцены', d: 'смотрит CS с 1.6 и сравнивает эпохи' }
  };
  const STYLE_KEYS = Object.keys(STYLES);
  const COUNTRIES = ['RU', 'UA', 'PL', 'DE', 'FR', 'DK', 'SE', 'BR', 'US', 'FI', 'CZ', 'KZ', 'BY', 'PT', 'ES', 'TR', 'MN', 'CN', 'AU', 'NO', 'LV', 'EE', 'RS', 'HU'];
  // Реальные стримеры и кастеры CS-сцены (по просьбе автора игры: в игре используются реальные имена).
  const STREAMERS = [
    { nick: 'Evelone', cc: 'RU', plat: 'Twitch', region: 'CIS', role: 'Стример' }, { nick: 'Buster', cc: 'RU', plat: 'Twitch', region: 'CIS', role: 'Стример' },
    { nick: 'Recrent', cc: 'RU', plat: 'Twitch', region: 'CIS', role: 'Стример' }, { nick: 'StRoGo', cc: 'RU', plat: 'Twitch', region: 'CIS', role: 'Стример' },
    { nick: 'des0ut', cc: 'RU', plat: 'Twitch', region: 'CIS', role: 'Стример' }, { nick: 'ceh9', cc: 'UA', plat: 'Twitch', region: 'CIS', role: 'Стример и кастер' },
    { nick: 'ohnePixel', cc: 'DK', plat: 'Twitch', region: 'EU', role: 'Стример' }, { nick: 'Izak', cc: 'PL', plat: 'Twitch', region: 'EU', role: 'Стример' },
    { nick: 'Pasha Biceps', cc: 'PL', plat: 'Twitch', region: 'EU', role: 'Стример' }, { nick: 'Thorin', cc: 'GB', plat: 'YouTube', region: 'EU', role: 'Аналитик' },
    { nick: 'Anders Blume', cc: 'DK', plat: 'Twitch', region: 'EU', role: 'Кастер' }, { nick: 'HenryG', cc: 'GB', plat: 'Twitch', region: 'EU', role: 'Кастер' },
    { nick: 'SPUNJ', cc: 'GB', plat: 'Twitch', region: 'EU', role: 'Кастер' }, { nick: 'Gaules', cc: 'BR', plat: 'Twitch', region: 'SA', role: 'Стример' },
    { nick: 'Apoka', cc: 'BR', plat: 'Twitch', region: 'SA', role: 'Стример и кастер' }, { nick: 'shroud', cc: 'CA', plat: 'Twitch', region: 'NA', role: 'Стример' },
    { nick: 'summit1g', cc: 'US', plat: 'Twitch', region: 'NA', role: 'Стример' }, { nick: 'tarik', cc: 'US', plat: 'Twitch', region: 'NA', role: 'Стример' },
    { nick: 'launders', cc: 'US', plat: 'Twitch', region: 'NA', role: 'Кастер' }
  ];
  const isStreamer = nick => STREAMERS.some(s => s.nick.toLowerCase() === String(nick || '').toLowerCase());
  function persona(nick, cc) {
    nick = String(nick || 'гость'); const h = h32('persona|' + nick.toLowerCase());
    const sr = STREAMERS.find(s => s.nick.toLowerCase() === nick.toLowerCase());
    const top = ranked().slice(0, 24);
    // любимая команда: если ник похож на название команды или игрока — берём её
    const low = nick.toLowerCase();
    const byName = TEAMS().find(t => low.includes(String(t.name).toLowerCase().replace(/^team\s+/, '').split(' ')[0])) ||
      TEAMS().find(t => (t.players || []).some(p => low.includes(String(p.nick).toLowerCase())));
    // v114: та же любимая команда, что у значка рядом с ником в комментариях (V35Badges.fanTeam), — раньше профиль и комментарии расходились
    let fav = sr ? (byName?.name || '') : '';
    if (!fav && !sr) { try { fav = W.V35Badges && W.V35Badges.fanTeam ? W.V35Badges.fanTeam(nick, false) : ''; } catch (e) {} }
    if (!fav && sr) fav = top[h % Math.max(1, top.length)]?.name || '';
    const style = sr ? (/Аналитик/.test(sr.role) ? 'analyst' : /Кастер/.test(sr.role) ? 'veteran' : 'meme') : /analyst|demo|utility|map_pool|review/.test(low) ? 'analyst' : /stat|kast|math|swing|rating/.test(low) ? 'stats' : STYLE_KEYS[(h >>> 4) % STYLE_KEYS.length];
    return {
      nick, cc: cc || sr?.cc || COUNTRIES[(h >>> 8) % COUNTRIES.length], fav, style, streamer: !!sr, plat: sr?.plat || null, region: sr?.region || null, role: sr?.role || null,
      joined: 2013 + ((h >>> 12) % 13), karma: 120 + ((h >>> 3) % 9000), followers: sr ? 40000 + ((h >>> 5) % 900000) : 0,
      hue: h % 360
    };
  }
  function avatar(p, size) {
    const s = size || 64, ini = String(p.nick).replace(/[^A-Za-zА-Яа-я0-9]/g, '').slice(0, 2).toUpperCase() || '?';
    return `<span class="v84-ava${p.streamer ? ' st' : ''}" style="--h:${p.hue};width:${s}px;height:${s}px;font-size:${Math.round(s * .38)}px">${esc(ini)}${p.streamer ? '<i>LIVE</i>' : ''}</span>`;
  }

  // ------------------------------------------------------------ тексты сообщества
  const POST = {
    result: { a: ['Ну что, итоги {ev}.', 'Пару слов про {ev}.', 'Разбор {ev} от меня.', 'Кто бы мог подумать — {ev} закончился так.'],
      b: { analyst: ['{w} выиграли за счёт пистолеток и дисциплины на CT.', 'Решили карты {w} — их маппул сейчас шире, чем у всех.', 'Ключ к титулу {w} — мид-раунд: решения после первого фрага.'],
        fan: ['{w} — это любовь. Никаких сомнений не было.', 'Я знал, что {w} заберут это, весь турнир на нервах.', 'Плакал на последней карте, без шуток.'],
        hater: ['Не впечатлён: сетка {w} была мягкой.', 'Победа {w} — больше про ошибки соперников, чем про их силу.', 'Посмотрим, как {w} сыграют против настоящих топов.'],
        stats: ['{w}: {maps} в плей-офф и почти идеальная реализация 4в5.', 'По цифрам {w} были лучшими на открывающих дуэлях весь турнир.', 'Средний рейтинг состава {w} — выше всех в сетке.'],
        meme: ['{w} просто нажали «победить» в настройках.', 'Тренер {w} уже ищет место под новый кубок в шкафу.', 'Соперники {w} будут видеть этот финал во сне.'],
        veteran: ['Напоминает великие составы прошлых эпох.', 'Такой контроль карты раньше был только у легенд.', '{w} играют в классический CS — без суеты.'] },
      c: ['Жду следующий ивент.', 'Ваше мнение?', 'Пишите в комментах, если не согласны.', 'Это был хороший турнир.', 'Сохраню этот пост, проверим через месяц.'] },
    transfer: { a: ['Трансфер, о котором все говорят.', 'Обсудим переход {p}.', 'Моё мнение про {p} в {to}.'],
      b: { analyst: ['{p} закрывает позицию, которой у {to} не хватало.', 'Вопрос в ролях: {to} придётся перестраивать дефолты.', 'По статистике это апгрейд, но адаптация займёт время.'],
        fan: ['Наконец-то! {p} — именно тот, кто нужен {to}.', 'Верю в этот состав на все сто.', 'Ждём первый турнир с {p}.'],
        hater: ['Переплатили. {p} не стоит этих денег.', 'Сомнительный ход для {to}.', 'Через полгода {p} будет на скамейке.'],
        stats: ['Рейтинг {p} за полгода — выше среднего по позиции.', 'Цифры {p} на картах {to} пока небольшие, но перспективные.', 'Сравнил: {p} стабильнее предшественника.'],
        meme: ['{p} уже репетирует фото в новой джерси.', 'Сделка века, по мнению мамы {p}.', 'Ставлю на хайлайт-ролик через неделю.'],
        veteran: ['Помню, когда такие трансферы были редкостью.', 'Правильные клубы так и строятся.', 'Опыт решает — посмотрим.'] },
      c: ['Посмотрим.', 'Время покажет.', 'Сохраняю на память.', 'Ставлю лайк этому решению.'] },
    pickem: { a: ['Мой Pick\'Em на {stage}.', 'Делюсь прогнозом на {stage}.', 'Вот как вижу {stage}.'],
      b: { analyst: ['3:0 — {z1} и {z2}: у них лучшие стандарты.', 'Ставлю {z1} на 3:0 — их маппул закрывает любые пики.'],
        fan: ['{fav} на 3:0, без вариантов!', 'Мой выбор — {fav}, всегда.'],
        hater: ['Фавориты посыпятся: {o1} на 0:3 — смелый, но честный пик.', 'Не верю в хайп вокруг {z1}.'],
        stats: ['По рейтингу и форме: {z1}, {z2} на 3:0.', 'Модель даёт {z1} 3:0 с шансом выше трети.'],
        meme: ['Кидал монетку — {z1} на 3:0.', 'Pick\'Em по логотипам: {z1} самый красивый.'],
        veteran: ['Опыт подсказывает: {z1} не подведут.', 'Ставлю на выдержку — {z1} и {z2}.'] },
      c: ['Удачи всем!', 'Соберу алмаз?', 'Пишите свои пики.', 'Отпишусь после этапа.'] }
  };
  function post(kind, p, vars, seed) {
    const T = POST[kind]; const h = h32(kind + '|' + p.nick + '|' + seed);
    return fill([T.a[h % T.a.length], (T.b[p.style] || T.b.analyst)[(h >>> 7) % (T.b[p.style] || T.b.analyst).length], T.c[(h >>> 14) % T.c.length]].join(' '), vars);
  }

  // ------------------------------------------------------------ Pick'Em сообщества
  function syncPickem() {
    try {
      const ctx = W.V33Pickem?.publicContext?.(); if (!ctx || !ctx.unlocked) return;
      const C = store(); const M = C.stages[ctx.majorId] = C.stages[ctx.majorId] || { title: ctx.title, season: ctx.season, st: {} };
      Object.entries(ctx.stages || {}).forEach(([i, s]) => { if (!M.st[i] && Array.isArray(s.teams) && s.teams.length >= 10) M.st[i] = s.teams.slice(); });
      // результаты завершённых этапов
      const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
      if (ct?.isMajor) (ct.majorStages || []).forEach((st, k) => {
        const i = String(k + 1); if (!st?.completed || C.results[ctx.majorId + '|' + i]) return;
        const rows = (st.teams || []).map(t => ({ n: typeof t === 'string' ? t : t.name, w: t.wins || 0, l: t.losses || 0 }));
        C.results[ctx.majorId + '|' + i] = { threeZero: rows.filter(r => r.w === 3 && r.l === 0).map(r => r.n), advance: rows.filter(r => r.w === 3 && r.l > 0).map(r => r.n), zeroThree: rows.filter(r => r.l === 3 && r.w === 0).map(r => r.n) };
      });
    } catch (e) {}
  }
  // Аналитики и статистики опираются на модель силы игры (ту же, что решает матчи), поэтому их
  // прогнозы точнее. Шум зависит от стиля: аналитик — минимальный, мемолог — почти лотерея.
  const NOISE = { analyst: .035, stats: .06, veteran: .09, fan: .16, hater: .18, meme: .3 };
  function modelPicks(p, majorId, stage, roster) {
    const strength = n => { let s = 0, k = 0; roster.forEach(o => { if (o === n) return; try { const q = W.calcMatchOdds?.(n, o, true); if (q) { s += q.p1_win; k++; } } catch (e) {} }); return k ? s / k : .5; };
    const noise = NOISE[p.style] ?? .12;
    const scored = roster.map(n => ({ n, v: strength(n) + ((h32(`${majorId}|${stage}|${p.nick}|${n}`) % 1000) / 1000 - .5) * 2 * noise + (p.style === 'fan' && n === p.fav ? .15 : 0) }))
      .sort((a, b) => b.v - a.v).map(x => x.n);
    return { threeZero: scored.slice(0, 2), advance: scored.slice(2, 8), zeroThree: scored.slice(-2).reverse() };
  }
  function picksOf(p, majorId, stage, roster) {
    if (Array.isArray(roster) && roster.length >= 10) { try { return modelPicks(p, majorId, stage, roster); } catch (e) {} }
    const prof = { id: 'u-' + p.nick, style: { analyst: 'rating', fan: 'pro-team', hater: 'underdog', stats: 'balanced', meme: 'bold', veteran: 'balanced' }[p.style] || 'balanced', team: p.fav };
    try { return W.V70PickemPublications?.stagePicks?.(roster, prof, `${majorId}|stage-${stage}|${p.nick}`) || null; } catch (e) { return null; }
  }
  function pickemHistory(p) {
    const C = store(), out = [];
    Object.entries(C.stages || {}).forEach(([majorId, M]) => {
      Object.entries(M.st || {}).forEach(([i, roster]) => {
        const pk = picksOf(p, majorId, i, roster); if (!pk) return;
        const res = C.results[majorId + '|' + i] || null;
        let hits = null; if (res) hits = pk.threeZero.filter(n => res.threeZero.includes(n)).length + pk.advance.filter(n => res.advance.includes(n) || res.threeZero.includes(n)).length + pk.zeroThree.filter(n => res.zeroThree.includes(n)).length;
        out.push({ title: M.title, stage: i, pk, res, hits });
      });
    });
    return out.reverse();
  }

  // ------------------------------------------------------------ комментарии и посты персоны
  function commentsBy(nick) {
    const out = []; let items = []; try { items = (N.all() || []).slice(0, 160); } catch (e) {}
    for (const it of items) { let cms = []; try { cms = N.comments(it) || []; } catch (e) {} cms.filter(c => c.nick === nick).forEach(c => out.push({ it, c })); if (out.length >= 12) break; }
    // v84: живой профиль — пользователь комментирует и другие новости (по своим интересам, детерминированно по нику)
    if (out.length < 8 && W.V33Fan?.textFor) {
      const fav = persona(nick).fav;
      for (const it of items) {
        if (out.length >= 8) break; if (out.some(x => x.it.id === it.id)) continue;
        const likesTeam = fav && JSON.stringify(it.tags || []).includes(fav);
        if (!likesTeam && h32(nick + '|' + it.id) % 7) continue;
        const r = h32('cm|' + nick + it.id);
        out.push({ it, c: { nick, text: W.V33Fan.textFor(it, nick + it.id), likes: r % 60, mins: 10 + r % 900 } });
      }
    }
    return out;
  }
  function postsBy(p) {
    const out = []; let items = []; try { items = (N.all() || []).slice(0, 220); } catch (e) {}
    items.forEach(it => {
      const h = h32(p.nick + '|' + it.id) % 100, rate = p.streamer ? 9 : 5;
      if (h >= rate) return;
      if (it.cat === 'tournament' && it.team) out.push({ it, text: post('result', p, { ev: it.ev || it.title.replace(/^.*?:\s*/, ''), w: it.team, maps: 'одна отданная карта' }, it.id) });
      else if (it.cat === 'transfer' && it.player) out.push({ it, text: post('transfer', p, { p: it.player, to: it.to || it.team || 'новой команде' }, it.id) });
    });
    return out.slice(0, 10);
  }

  // ------------------------------------------------------------ стримеры: события
  function streamerNews(kind, d) {
    const C = store(); const key = kind + '|' + (d?.name || d?.id || '') ; if (C.news[key]) return; C.news[key] = 1;
    const list = STREAMERS.slice().sort((a, b) => h32(key + a.nick) - h32(key + b.nick));
    const s = list[0], s2 = list[1];
    const P = n => ({ t: 'user', v: n });
    if (kind === 'costream' && d?.name) {
      N.add({ cat: 'event', icon: '📺', imp: 5, id: `v84-cs-${h32(key).toString(36)}`, title: pick([`${s.nick} получил права на ко-стрим ${d.name}`, `${d.name}: ${s.nick} и ${s2.nick} будут кастить турнир`, `Ко-стрим ${d.name} — у ${s.nick}`], key),
        lead: `Организатор выдал права на ретрансляцию: ${s.nick} (${s.plat}) и ${s2.nick} (${s2.plat}) проведут ко-стримы с собственным кастом.`, body: ['Официальная трансляция остаётся у организатора; ко-стримеры показывают игру с задержкой и своим комментарием.'], tags: [], v84Users: [s.nick, s2.nick] });
    } else if (kind === 'record' && d?.name) {
      const peak = 180000 + h32(key) % 900000;
      N.add({ cat: 'event', icon: '📈', imp: 6, id: `v84-rec-${h32(key).toString(36)}`, title: `Рекорд ко-стрима: ${s.nick} собрал ${peak.toLocaleString('ru-RU')} зрителей на финале ${d.name}`,
        lead: `Финал ${d.champ ? `с участием ${d.champ}` : ''} стал самым просматриваемым эфиром канала ${s.nick} на ${s.plat}.`, body: [`Пиковый онлайн — ${peak.toLocaleString('ru-RU')}.`], tags: d.champ ? [{ t: 'team', v: d.champ }] : [], v84Users: [s.nick] });
    } else if (kind === 'monthly') {
      const ev = pick(['contract', 'charity', 'caster', 'collab', 'battle'], key + 'e'), t = ranked()[h32(key) % 12]?.name || 'топ-клуб';
      const texts = {
        contract: [`${s.nick} подписал контракт с ${t} как контент-криэйтор`, `${s.nick} будет снимать закулисье ${t} и вести стримы с игроками клуба.`],
        charity: [`${s.nick} провёл благотворительный марафон`, `За 24 часа эфира собрано ${(20000 + h32(key) % 180000).toLocaleString('ru-RU')} $; к стриму подключались игроки ${t}.`],
        caster: [`${s.nick} дебютирует за аналитическим столом`, `Стример впервые выступит экспертом на официальной трансляции ближайшего турнира Tier-1.`],
        collab: [`${s.nick} и ${s2.nick} сыграют шоу-матч против игроков ${t}`, 'Стримеры соберут свои пятёрки и попробуют обыграть профессионалов.'],
        battle: [`${s.nick} собирает команду на Streamers Battle`, 'В составе — стримеры и два приглашённых про-игрока; имена держатся в секрете.']
      }[ev];
      N.add({ cat: 'event', icon: '🎥', imp: 4, id: `v84-mo-${h32(key).toString(36)}`, title: texts[0], lead: texts[1], body: [], tags: [], v84Users: [s.nick, s2.nick] });
    }
    try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {}
  }
  const wrapH = (type, fn) => { const base = N.H[type]; N.H[type] = d => { if (typeof base === 'function') base(d); try { fn(d || {}); } catch (e) { console.warn('[v84 community]', type, e); } }; };
  wrapH('start', d => { if (d.major || d.elite) streamerNews('costream', d); });
  wrapH('tournament', d => { if (d.major) streamerNews('record', d); });

  // ------------------------------------------------------------ Streamers Battle: стримеры-капитаны для EU/BR
  function streamersFor(region, n) {
    const reg = { eu: 'EU', br: 'SA', cis: 'CIS' }[String(region || '').toLowerCase()] || region;
    let list = STREAMERS.filter(s => s.region === reg && /Стример/.test(s.role));
    if (reg === 'SA') list = list.concat(STREAMERS.filter(s => s.region === 'NA' && /Стример/.test(s.role)));
    list = list.slice(0, n || 4);
    return list.length >= 4 ? list.slice(0, 4) : list.slice(0, 2);
  }

  // ------------------------------------------------------------ страница профиля
  function profilePage(arg) {
    const nick = decodeURIComponent(String(arg || '')); if (!nick) return empty('Профиль не найден');
    // v114: флаг — из комментариев этого пользователя (там страна хранится у каждого комментария)
    let ccC = ''; try { for (const it of (N.all() || []).slice(0, 160)) { const c = (N.comments(it) || []).find(x => x.nick === nick && x.cc); if (c) { ccC = c.cc; break; } } } catch (e) {}
    const p = persona(nick, ccC || undefined), S = STYLES[p.style];
    const pk = pickemHistory(p), posts = postsBy(p), cms = commentsBy(nick);
    let medals = ''; try { const B = W.V35Badges; if (B && B.botItems && !p.streamer) { const it = B.botItems(nick); medals = `<div class="v114-umedals">${it.coins.map(c => `<span class="v35-hci" data-tip="${H.esc(c.tip || '')}">${String(c.html).replace(/width="\d+" height="\d+"/, 'width="34" height="34"')}</span>`).join('')}${(it.badges || []).map(b => B.badgeHtml ? B.badgeHtml(b) : '').join('')}</div>`; } } catch (e) {}
    const acc = pk.filter(x => x.hits != null), accTxt = acc.length ? `${acc.reduce((a, x) => a + x.hits, 0)}/${acc.length * 10}` : '—';
    const tab = H.S.userTab || 'overview';
    const tabs = [['overview', 'Обзор'], ['pickem', `Pick'Em · ${pk.length}`], ['posts', `Посты · ${posts.length}`], ['comments', `Комментарии · ${cms.length}`]].concat(p.streamer ? [['streams', 'Стримы']] : [])
      .map(([k, l]) => `<button type="button" class="hs-chip${tab === k ? ' on' : ''}" data-usertab="${k}">${esc(l)}</button>`).join('');
    const head = `${H.back()}<section class="v84-user-head"><div class="v84-user-ava">${avatar(p, 96)}</div><div class="v84-user-id"><div class="v84-user-role">${p.streamer ? `${esc(p.role || 'Стример')} · ${esc(p.plat)}` : esc(S.l)}</div><h1>${H.flag(p.cc)} ${esc(p.nick)}</h1>${medals}<p>${p.streamer ? `${p.followers.toLocaleString('ru-RU')} подписчиков · регион ${esc(p.region)}` : esc(S.d)}</p>
      <div class="v84-user-kpis"><div><small>На HLTV с</small><b>${p.joined}</b></div><div><small>Карма</small><b>${p.karma.toLocaleString('ru-RU')}</b></div><div><small>Pick'Em</small><b>${accTxt}</b></div><div><small>Болеет за</small><b data-team="${esc(p.fav)}">${p.fav ? logo(p.fav, 'xs') + ' ' + esc(p.fav) : '—'}</b></div></div></div></section>
      <div class="hs-filters v84-user-tabs">${tabs}</div>`;
    let body = '';
    const pkHtml = list => list.map(x => `<div class="v84-pk"><header><b>${esc(x.title)}</b><span>Stage ${esc(x.stage)}${x.hits != null ? ` · угадано <em>${x.hits}/10</em>` : ' · этап идёт'}</span></header>
      ${[['3:0', x.pk.threeZero, x.res?.threeZero], ['3:1 · 3:2', x.pk.advance, x.res ? x.res.advance.concat(x.res.threeZero) : null], ['0:3', x.pk.zeroThree, x.res?.zeroThree]].map(([l, arr, ok]) => `<div class="v84-pk-row"><small>${l}</small><div>${arr.map(n => `<span class="v84-pk-t${ok ? (ok.includes(n) ? ' hit' : ' miss') : ''}" title="${esc(n)}">${logo(n, 'sm')}</span>`).join('')}</div></div>`).join('')}</div>`).join('');
    const postsHtml = list => list.map(x => `<article class="v84-post"><header><small>${H.ndate ? H.ndate(x.it.ts) : ''}</small><button type="button" data-art="${esc(x.it.id)}">${esc(x.it.title)}</button></header><p>${esc(x.text)}</p></article>`).join('');
    const cmHtml = list => list.map(x => `<article class="v84-post"><header><button type="button" data-art="${esc(x.it.id)}">${esc(x.it.title)}</button></header><p>${esc(x.c.text)}</p><small>▲ ${x.c.likes}</small></article>`).join('');
    if (tab === 'pickem') body = box("Pick'Em", pkHtml(pk) || empty('Прогнозов пока нет: они появляются, когда открывается Pick\'Em Мейджора'));
    else if (tab === 'posts') body = box('Посты', postsHtml(posts) || empty('Постов пока нет'));
    else if (tab === 'comments') body = box('Комментарии', cmHtml(cms) || empty('Комментариев не найдено'));
    else if (tab === 'streams' && p.streamer) {
      const battles = Object.values(H.archive() || {}).filter(s => s && /Streamers Battle/i.test(s.name || '') && s.rost && Object.keys(s.rost).some(k => k.includes(p.nick)));
      const ns = (N.all() || []).filter(n => (n.v84Users || []).includes(p.nick)).slice(0, 10);
      body = `<div class="v84-grid2">${box('Streamers Battle', battles.map(s => { const k = Object.keys(s.rost).find(x => x.includes(p.nick)); return `<div class="v84-sb"><b>${esc(s.name)}</b><small>${esc(k)} · ${(s.results || []).find(r => r.n === k)?.p ? 'место ' + (s.results || []).find(r => r.n === k).p : ''}</small><div>${(s.rost[k] || []).map(x => x.club && x.club !== 'Стример' ? `<span data-player="${esc(x.nick)}">${esc(x.nick)} <i>${esc(x.club)}</i></span>` : `<span>${esc(x.nick)}</span>`).join('')}</div></div>`; }).join('') || empty('Ещё не участвовал'))}${box('Новости о стримере', ns.map(n => H.newsRow ? H.newsRow(n) : esc(n.title)).join('') || empty('Новостей пока нет'))}</div>`;
    } else {
      body = `<div class="v84-grid2">${box('Последние посты', postsHtml(posts.slice(0, 4)) || empty('Постов пока нет'))}${box("Pick'Em", pkHtml(pk.slice(0, 2)) || empty('Прогнозов пока нет'))}</div>`;
    }
    return head + `<div class="v84-user-body">${body}</div>`;
  }
  H.PAGES.user = profilePage;
  H.PAGES.community = () => {
    const sts = STREAMERS.map(s => persona(s.nick));
    const fans = Array.from({ length: 18 }, (_, i) => persona(['dust2lover', 'awp_daddy', 'ecoround', 'anchor_main', 'molotov_mike', 'clutch_or_kick', 'pistol_king', 'smoke_wizard', 'mid_control', 'lurk_enjoyer', 'retake_god', 'eco_frag', 'boost_spot', 'flash_assist', 'ct_sided', 't_sided', 'force_buy', 'last_alive'][i]));
    const card = p => `<button type="button" class="v84-ucard" data-user="${esc(p.nick)}">${avatar(p, 44)}<span><b>${H.flag(p.cc)} ${esc(p.nick)}</b><small>${p.streamer ? `${esc(p.plat)} · ${(p.followers / 1000).toFixed(0)}K` : esc(STYLES[p.style].l)}${p.fav ? ' · ' + esc(p.fav) : ''}</small></span></button>`;
    const analysts = ['hltv_analyst', 'demo_reviewer', 'utility_lab', 'eco_math', 'map_pool_nerd', 'stat_padder', 'roundswing', 'kast_enjoyer'].map(n => { const p = persona(n); p.style = /stat|kast|math|swing/.test(n) ? 'stats' : 'analyst'; return p; });
    const all = analysts.concat(fans, sts);
    const board = all.map(p => { const h = pickemHistory(p).filter(x => x.hits != null); return { p, hits: h.reduce((a, x) => a + x.hits, 0), n: h.length }; })
      .filter(x => x.n).sort((a, b) => b.hits / b.n - a.hits / a.n || b.hits - a.hits).slice(0, 12);
    const boardHtml = board.map((x, i) => `<button type="button" class="v84-lb" data-user="${esc(x.p.nick)}"><span class="n">${i + 1}</span>${avatar(x.p, 26)}<b>${esc(x.p.nick)}</b><small>${esc(x.p.streamer ? 'Стример' : STYLES[x.p.style].l)}</small><em>${x.hits}/${x.n * 10}</em></button>`).join('');
    return `<div class="hs-head"><h1>Сообщество</h1></div><div class="v84-cols"><div>${box('Аналитики', `<div class="v84-ugrid">${analysts.map(card).join('')}</div><p class="v84-note">Аналитики строят Pick'Em на модели силы команд — их прогнозы сбываются чаще остальных.</p>`)}${box('Стримеры', `<div class="v84-ugrid">${sts.map(card).join('')}</div>`)}</div>
      <div>${box("Лучшие прогнозисты Pick'Em", boardHtml || empty("Рейтинг появится после первого этапа Мейджора"))}${box('Активные пользователи', `<div class="v84-ugrid">${fans.map(card).join('')}</div>`)}</div></div>`;
  };
  H.CLICKS.push(['[data-user]', el => { H.S.userTab = 'overview'; H.nav('user', el.dataset.user); }]);
  H.CLICKS.push(['[data-usertab]', el => { H.S.userTab = el.dataset.usertab; H.render(); }]);
  try { if (Array.isArray(H.NAV_MORE) && !H.NAV_MORE.some(x => x[0] === 'community')) H.NAV_MORE.push(['community', 'Сообщество']); } catch (e) {}
  const addMenu = () => { try { const m = document.querySelector('.pt-menu[data-menu="more"]'); if (m && !m.querySelector('[data-nav="community"]')) m.insertAdjacentHTML('beforeend', '<button type="button" data-nav="community">Сообщество</button>'); } catch (e) {} };
  (H.AFTER || []).push(addMenu); setTimeout(addMenu, 1500);
  // ники в комментариях и авторы публичных Pick'Em — кликабельны
  (H.AFTER || []).push(() => {
    try {
      document.querySelectorAll('#hs-page .hs-cm:not(.mine) .hs-cm-h b, #hs-page .cm:not(.mine) .cm-h b').forEach(b => { if (b.dataset.user) return; const n = [...b.childNodes].filter(x => x.nodeType === 3).map(x => x.textContent).join(' ').trim().split(/\s+/)[0] || ''; if (n) { b.dataset.user = n; b.classList.add('v84-ulink'); } });
    } catch (e) {}
  });
  try { (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => {
    if (W.v57BatchCalendarSkip) return; syncPickem();
    const m = new Date(nowMs()); const key = m.getFullYear() + '-' + m.getMonth(); const C = store(); if (C.lastMonth !== key) { const first = !C.lastMonth; C.lastMonth = key; if (!first) streamerNews('monthly', { id: key }); }
  }, 5000); } catch (e) {}
  // Pick'Em сообщества фиксируется и во время перемотки (через публикации v70)
  try { const pub = W.V70PickemPublications; if (pub && typeof pub.sync === 'function' && !pub.sync.__v84) { const base = pub.sync; pub.sync = function () { const r = base.apply(this, arguments); syncPickem(); return r; }; pub.sync.__v84 = true; } } catch (e) {}
  W.CS2Community = Object.freeze({ persona, avatar, streamers: () => STREAMERS.slice(), streamersFor, isStreamer, pickemHistory, syncPickem });
})();
