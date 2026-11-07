/* v84 — «живой мир»: всё, что сдвигает силу команды помимо состава, проходит через один хук
   window.CS2StrengthMods(team) в v29 strength(). Источники:
     • патчи Valve — меняют вес ролей (AWP, энтри, саппорт…), эффект максимален в первые недели и
       уходит по мере адаптации команд;
     • форма игроков — «горячая» и «холодная» полоса каждого игрока (недельное случайное блуждание
       с возвратом к нулю, подталкивается результатами команды);
     • домашняя публика — LAN в стране, откуда большинство игроков состава;
   а также визовые проблемы перед турнирами в США, Китае и Австралии (через штатный стенд-ин). */
(function () {
  'use strict';
  const W = window, H = W.HS, DAY = 864e5;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const rnd = seed => ((h32(seed) % 10000) / 10000);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const teamList = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const news = it => { try { W.V29News?.add?.(it); } catch (e) {} };
  const P = n => ({ t: 'player', v: n }), T = n => ({ t: 'team', v: n });
  const W_ = () => { const s = ST(); return s ? (s.v84World = s.v84World || { patches: [], form: {}, formWeek: 0, homeNews: {}, visa: {}, lastStart: '' }) : null; };

  // ---------------------------------------------------------------- патчи
  const ROLE = r => /awp/i.test(r || '') ? 'AWPer' : /igl/i.test(r || '') ? 'IGL' : /support/i.test(r || '') ? 'Support' : /lurk/i.test(r || '') ? 'Lurker' : /entry/i.test(r || '') ? 'Entry' : 'Rifler';
  const PATCHES = [
    { t: 'Нерф AWP: замедление после выстрела и цена $5000', fx: { AWPer: -1 }, note: 'Снайперам сложнее держать агрессивные позиции, выигрывают команды с сильными райфлерами.' },
    { t: 'Бафф AWP: быстрее переключение на пистолет', fx: { AWPer: 1 }, note: 'Снайперская игра снова в моде: команды с топ-AWPer получают преимущество.' },
    { t: 'Molotov и инферно: меньше время горения', fx: { Support: -1, Rifler: .5 }, note: 'Раскидка теряет часть силы, выше ценятся дуэли.' },
    { t: 'Smoke-гранаты: дым рассеивается от HE быстрее', fx: { Support: .5, IGL: .5 }, note: 'Структурная игра и утилити становятся важнее индивидуального скилла.' },
    { t: 'M4A1-S: магазин 25 → 20, AK-47 без изменений', fx: { Rifler: -.5, Entry: .5 }, note: 'Сторона атаки усиливается, энтри-фраггеры чувствуют себя увереннее.' },
    { t: 'Экономика: бонус за проигрыш снижен', fx: { IGL: 1 }, note: 'Решения по экономике на вес золота: выигрывают команды с опытным капитаном.' },
    { t: 'Desert Eagle: точнее первый выстрел', fx: { Entry: .5, Lurker: .5 }, note: 'Форсы на дигле стали опаснее, ценятся игроки, которые сами создают тайминги.' },
    { t: 'Изменение тиктрейта сабтика и hitbox головы', fx: { Rifler: .5, AWPer: .5 }, note: 'Механика решает чуть больше: звёздные стрелки довольны.' }
  ];
  function patchMod(t, now) {
    const w = W_(); if (!w || !w.patches.length) return 0;
    const cur = w.patches[w.patches.length - 1], age = (now - cur.at) / DAY;
    if (age < 0) return 0;
    const fade = clamp(1 - age / 50, 0, 1); if (!fade) return 0;
    const fx = PATCHES[cur.i]?.fx || {};
    let s = 0;
    (t.players || []).slice(0, 5).forEach(p => {
      const k = fx[ROLE(p.role)] || 0; if (!k) return;
      const lvl = ((+p.firepower || 70) * .5 + (+p.tacticalIQ || 70) * .3 + (+p.utility || 70) * .2 - 70) / 15; // выше уровень — сильнее эффект
      s += k * (6 + clamp(lvl, -1, 2) * 3);
    });
    return s * fade;
  }
  function patchTick(now) {
    const w = W_(); if (!w) return;
    const last = w.patches[w.patches.length - 1];
    const gap = last ? (75 + Math.floor(rnd('gap|' + last.at) * 45)) * DAY : 40 * DAY;
    if (!w.patchAnchor) w.patchAnchor = now;
    const anchor = last ? last.at : w.patchAnchor;
    if (now < anchor + gap) return;
    const i = Math.floor(rnd('patch|' + now) * PATCHES.length) % PATCHES.length;
    if (last && last.i === i) return;
    const d = new Date(now), name = `Обновление CS2 от ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
    w.patches.push({ at: now, i, name }); if (w.patches.length > 24) w.patches.shift();
    // кто выиграл и кто проиграл от патча — по составам топ-30
    const scored = teamList().filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0)).slice(0, 30).map(t => ({ t: t.name, v: patchMod(t, now) })).sort((a, b) => b.v - a.v);
    const up = scored.filter(x => x.v > 2).slice(0, 3), dn = scored.filter(x => x.v < -2).slice(-3).reverse();
    news({ cat: 'event', icon: '🛠️', imp: 7, title: `${name}: ${PATCHES[i].t}`, lead: PATCHES[i].note,
      body: [up.length ? `Выигрывают от патча: ${up.map(x => x.t).join(', ')}.` : '', dn.length ? `Под ударом: ${dn.map(x => x.t).join(', ')}.` : '', 'Аналитики ждут, что к концу второго месяца команды адаптируются и эффект сойдёт на нет.'].filter(Boolean),
      tags: up.slice(0, 2).map(x => T(x.t)) });
  }

  // ---------------------------------------------------------------- форма игроков
  const WEEK = 7 * DAY;
  function formTick(now) {
    const w = W_(); if (!w) return;
    const wk = Math.floor(now / WEEK); if (w.formWeek === wk) return;
    const first = !w.formWeek; w.formWeek = wk;
    const hot = [];
    teamList().forEach(t => {
      const tf = clamp(((Number(t.form) || 100) - 100) / 10, -1.5, 1.5);
      (t.players || []).forEach(p => {
        if (!p || !p.nick) return;
        const k = p.nick, prev = Number(w.form[k]) || 0;
        const noise = (rnd('f|' + k + '|' + wk) - .5) * 5;
        const v = clamp(prev * .72 + noise + tf * 1.1, -10, 10);
        w.form[k] = Math.round(v * 10) / 10;
        if (!first && v >= 7.5 && prev < 7.5 && !t.isAcademy && (t.pts || 0) > 700) hot.push({ p: k, t: t.name, v });
      });
    });
    const top = hot.sort((a, b) => b.v - a.v)[0];
    if (top) news({ cat: 'player', icon: '🔥', imp: 4, title: `${top.p} в огненной форме`, lead: `Последние недели ${top.p} (${top.t}) выдаёт лучшие цифры в карьере: стабильно выигрывает дуэли и закрывает раунды.`, body: ['Тренеры соперников уже готовят против него отдельные антистраты.'], tags: [P(top.p), T(top.t)] });
  }
  const formOf = nick => Number(W_()?.form?.[nick]) || 0;
  const formMod = t => (t.players || []).slice(0, 5).reduce((a, p) => a + formOf(p.nick), 0) * 1.1;

  // ---------------------------------------------------------------- домашняя публика
  const CITY = [[/katowice|krak[oó]w|warsaw|wroc/i, 'PL'], [/cologne|k[oö]ln|hamburg|berlin/i, 'DE'], [/copenhagen|herning|aarhus/i, 'DK'], [/stockholm|j[oö]nk[oö]ping|malm[oö]/i, 'SE'],
    [/paris|marseille/i, 'FR'], [/rio|s[aã]o paulo|curitiba/i, 'BR'], [/austin|dallas|atlanta|boston|new york|los angeles|las vegas|arlington/i, 'US'], [/shanghai|chengdu|beijing|shenzhen/i, 'CN'],
    [/melbourne|sydney/i, 'AU'], [/budapest/i, 'HU'], [/bucharest/i, 'RO'], [/belgrade/i, 'RS'], [/kyiv|kiev/i, 'UA'], [/riyadh/i, 'SA'], [/buenos aires/i, 'AR'], [/lisbon|porto/i, 'PT'],
    [/antwerp|brussels/i, 'BE'], [/rotterdam|amsterdam|utrecht/i, 'NL'], [/singapore/i, 'SG'], [/astana|almaty/i, 'KZ'], [/moscow|saint petersburg/i, 'RU'], [/prague/i, 'CZ'], [/bratislava/i, 'SK'], [/valencia|madrid|barcelona/i, 'ES'], [/istanbul/i, 'TR'], [/helsinki/i, 'FI'], [/oslo/i, 'NO']];
  const countryOfEvent = name => (CITY.find(([re]) => re.test(String(name || ''))) || [])[1] || null;
  function nationOf(t) {
    const c = {}; (t.players || []).slice(0, 5).forEach(p => { if (p?.country) c[p.country] = (c[p.country] || 0) + 1; });
    const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return best && best[1] >= 3 ? best[0] : null;
  }
  function liveEvent() { const ct = typeof currentTournament !== 'undefined' ? currentTournament : null; return ct && !ct.completed ? ct : null; }
  function crowdMod(t) {
    const ct = liveEvent(); if (!ct) return 0;
    const cc = countryOfEvent(ct.name); if (!cc) return 0;
    if (!(ct.participants || []).some(x => (x?.name || x) === t.name)) return 0;
    return nationOf(t) === cc ? 14 : 0;
  }

  // ---------------------------------------------------------------- визы
  const VISA = { US: ['RU', 'UA', 'BY', 'KZ', 'UZ', 'MN', 'TR', 'BR', 'IL', 'BA', 'RS'], CN: ['UA', 'IL', 'BA', 'XK'], AU: ['RU', 'BY', 'KZ', 'MN', 'UZ'] };
  function startTick() {
    const w = W_(), ct = liveEvent(); if (!w || !ct || !ct.name) return;
    const key = ct.name + '|' + (ct.season || ''); if (w.lastStart === key) return; w.lastStart = key;
    const cc = countryOfEvent(ct.name);
    const parts = (ct.participants || []).map(x => x?.name || x).map(n => teamList().find(t => t.name === n)).filter(Boolean);
    // домашняя публика
    if (cc) {
      const home = parts.filter(t => nationOf(t) === cc).slice(0, 2);
      if (home.length) news({ cat: 'tournament', icon: '🏟️', imp: 5, title: `${ct.name}: ${home.map(t => t.name).join(' и ')} играют дома`, lead: `Арена ждёт своих: ${home.map(t => t.name).join(', ')} получат поддержку домашней публики.`, body: ['На LAN-турнирах в своей стране команды традиционно выступают увереннее: трибуны давят на соперника в решающих раундах.'], tags: home.map(t => T(t.name)) });
    }
    // визы
    const risky = cc && VISA[cc];
    if (!risky || typeof W.applyTemporaryStandIn !== 'function' && typeof applyTemporaryStandIn !== 'function') return;
    const fn = W.applyTemporaryStandIn || applyTemporaryStandIn;
    parts.forEach(t => {
      if (t.tempStandIn) return;
      const bad = (t.players || []).slice(0, 5).filter(p => risky.includes(p.country));
      if (!bad.length || rnd('visa|' + key + '|' + t.name) > .07) return;
      const victim = bad[0];
      try {
        fn(t, `проблемы с визой (${victim.nick})`);
        news({ cat: 'transfer', icon: '🛂', imp: 6, title: `${victim.nick} не успел получить визу на ${ct.name}`, lead: `${t.name} сыграет турнир со стенд-ином: документы ${victim.nick} не одобрили к вылету.`, body: ['Клуб подал апелляцию, но к первому матчу игрок не успевает.'], tags: [P(victim.nick), T(t.name)] });
      } catch (e) {}
    });
  }

  // ---------------------------------------------------------------- хук силы (кэш на игровой день)
  let cacheDay = -1, cache = new Map();
  W.CS2StrengthMods = function (t) {
    if (!t) return 0;
    const now = nowMs(), d = Math.floor(now / DAY);
    if (d !== cacheDay) { cacheDay = d; cache = new Map(); }
    const k = t.name; if (cache.has(k)) return cache.get(k);
    const v = patchMod(t, now) + formMod(t) + crowdMod(t);
    cache.set(k, v); return v;
  };
  W.CS2World = { patchMod, formOf, crowdMod, countryOfEvent, nationOf, PATCHES, state: W_, breakdown: t => ({ patch: patchMod(t, nowMs()), form: formMod(t), crowd: crowdMod(t) }) };
  function tick() { try { const now = nowMs(); patchTick(now); formTick(now); startTick(); } catch (e) { console.warn('[v84 world]', e); } }
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(tick, 3000);

  // ---------------------------------------------------------------- отображение в профиле игрока
  if (H) (H.AFTER || []).push(page => {
    if (page !== 'player') return;
    try {
      const root = document.getElementById('hs-page'), head = root?.querySelector('.hs-phead'); if (!head || head.querySelector('.v84-form')) return;
      const nick = H.S.arg ? String(H.S.arg).split('/')[0] : ''; const f = formOf(nick);
      const lab = f >= 6 ? ['🔥 Огненная форма', 'hot'] : f >= 2.5 ? ['▲ На подъёме', 'up'] : f <= -6 ? ['❄ Глубокий спад', 'cold'] : f <= -2.5 ? ['▼ Спад', 'down'] : ['• Стабильная форма', 'mid'];
      const h1 = head.querySelector('h1'); if (h1) h1.insertAdjacentHTML('afterend', `<span class="v84-form v84-form-${lab[1]}" title="Форма за последние недели: ${f > 0 ? '+' : ''}${f.toFixed(1)}">${lab[0]}</span>`);
    } catch (e) {}
  });
})();
