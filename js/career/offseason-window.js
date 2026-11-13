/* v84 — менеджерская глубина и живой мир вокруг составов.
   1) Трансферное окно межсезонья (1 декабря — 20 января): открытие окна, ежедневная лента слухов из реальных
      переговоров рынка, трекер сделок на странице трансферов, «день дедлайна» и итоговая новость.
   2) Тренер и сыгранность в силе команды: у тренера стиль (тактик / мотиватор / аналитик / наставник молодёжи)
      и уровень; сыгранность (время вместе) — бонус или штраф новому составу. Всё через CS2StrengthMods.
   3) Пресс-конференции после матчей вашей команды (в «Центре событий»): ответ меняет мораль и репутацию.
   4) Совет директоров: ожидание на сезон по рейтингу команды, доверие после каждого турнира Tier-1;
      при провале — предупреждение и увольнение; при успехе — предложения от более сильных клубов.
   5) Предложения других клубов по вашим игрокам и ультиматумы звёзд (в «Центре событий» и в переписке).
   6) Наставничество: ветеран берёт шефство над молодым игроком (+ рост молодого, + сыгранность).
   7) Буткемпы перед Мейджором: команды топ-16 уезжают на сборы (новость и бонус на время Мейджора).
   8) Ротация маппула раз в год (июль): одна карта выходит, другая возвращается; статистика карт команд дополняется.
   9) Организаторы: новые лиги и задержки выплат призовых (с последующей выплатой). */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31; if (!H) return;
  const esc = H.esc, DAY = 864e5, WEEK = 7 * DAY;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const pick = (k, a) => a[h32(k) % a.length];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const batch = () => !!W.v57BatchCalendarSkip;
  const news = it => { try { W.V29News?.add?.(it); } catch (e) {} };
  const S = () => { const s = ST(); if (!s) return null; const o = s.v84Mgr = s.v84Mgr || {}; ['win', 'seen', 'boot', 'mentor', 'board', 'press', 'org'].forEach(k => { o[k] = o[k] || {}; }); return o; };
  const TS = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const ranked = () => TS().filter(t => !t.isAcademy).sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const rankOf = n => { const i = ranked().findIndex(t => t.name === n); return i < 0 ? 99 : i + 1; };
  const me = () => { try { return V?.managed?.() || ''; } catch (e) { return ''; } };
  const pow = p => (+p.firepower || 70) * .4 + (+p.tacticalIQ || 70) * .25 + (+p.clutch || 70) * .2 + (+p.utility || 70) * .15;
  const moves = () => (typeof transferState !== 'undefined' ? transferState.v30Moves || [] : []);

  // ====================================================== 1) трансферное окно
  const winOf = ms => { const d = new Date(ms), y = d.getMonth() === 11 ? d.getFullYear() : d.getFullYear() - 1; return { y, open: new Date(y, 11, 1).getTime(), close: new Date(y + 1, 0, 20, 23).getTime() }; };
  function windowTick() {
    const o = S(); if (!o) return; const now = nowMs(), w = winOf(now), k = String(w.y), st = o.win[k] = o.win[k] || {};
    const inWin = now >= w.open && now <= w.close;
    if (inWin && !st.opened) { st.opened = 1; news({ cat: 'transfer', icon: '🪟', imp: 7, title: `Трансферное окно открыто: межсезонье ${w.y}/${w.y + 1}`, lead: 'До 20 января клубы перестраивают составы. Слухи, подтверждённые сделки и день дедлайна — на странице «Трансферы».', body: [], tags: [] }); }
    if (!inWin) return;
    // лента слухов: раз в 3 дня — из реальных переговоров рынка
    const day = Math.floor(now / DAY); if (st.rumorDay && day - st.rumorDay < 3) return; st.rumorDay = day;
    const nego = (typeof transferState !== 'undefined' ? transferState.v30Nego || [] : []).filter(n => n && !st['r|' + n.player]);
    const n = nego.sort((a, b) => rankOf(a.to) - rankOf(b.to))[0];
    if (n && !batch()) { st['r|' + n.player] = 1; news({ cat: 'rumor', nego: n.id, icon: '🗣️', imp: 6, rumor: true, title: pick(n.player + w.y, [`Источники: ${n.player} близок к переходу в ${n.to}`, `${n.to} ведут переговоры по ${n.player}`, `Инсайд: ${n.from} готовы отпустить ${n.player}`]), lead: `По данным инсайдеров, ${n.to} и ${n.from} обсуждают условия. Шансы сделки — ${Math.round((n.odds || .5) * 100)}%.`, body: [n.why ? `Причина: ${n.why}.` : ''], tags: [{ t: 'player', v: n.player }, { t: 'team', v: n.to }], player: n.player, team: n.to }); }
    if (now > w.close - DAY && !st.deadline) {
      st.deadline = 1; const deals = moves().filter(m => (m.ts || 0) >= w.open && /transfer|signing|buyout|promotion/.test(m.type || ''));
      news({ cat: 'transfer', icon: '⏰', imp: 8, title: `День дедлайна: межсезонье ${w.y}/${w.y + 1} закрывается`, lead: `За окно — ${deals.length} сделок. Главные: ${deals.slice(0, 5).map(m => `${m.player} → ${m.to}`).join(', ') || 'без громких переходов'}.`,
        body: [`Самые активные клубы: ${Object.entries(deals.reduce((a, m) => (a[m.to] = (a[m.to] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${t} (${n})`).join(', ') || '—'}.`], tags: [] });
    }
  }
  function windowBox() {
    const now = nowMs(), w = winOf(now), inWin = now >= w.open && now <= w.close;
    const nextOpen = inWin ? null : (now < w.open ? w.open : winOf(now + 340 * DAY).open);
    const deals = moves().filter(m => (m.ts || 0) >= (inWin ? w.open : now - 30 * DAY) && /transfer|signing|buyout|promotion/.test(m.type || ''));
    const nego = (typeof transferState !== 'undefined' ? transferState.v30Nego || [] : []);
    return `<section class="hs-box v84-window"><header class="hs-box-h"><h3>🪟 Трансферное окно</h3><span class="hs-sub">${inWin ? `открыто · до дедлайна ${Math.max(0, Math.ceil((w.close - now) / DAY))} дн.` : `закрыто · откроется ${new Date(nextOpen).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`}</span></header>
      <div class="v84-win-g"><div><small>Сделок ${inWin ? 'в окне' : 'за 30 дней'}</small><b>${deals.length}</b></div><div><small>Идут переговоры</small><b>${nego.length}</b></div><div><small>Главная сделка</small><b>${esc(deals[0] ? `${deals[0].player} → ${deals[0].to}` : '—')}</b></div></div>
      ${nego.length ? `<div class="v84-win-r">${nego.slice(0, 6).map(n => `<span><b>${esc(n.player)}</b> ${esc(n.from)} → ${esc(n.to)} <i>${Math.round((n.odds || .5) * 100)}%</i></span>`).join('')}</div>` : ''}</section>`;
  }

  // ====================================================== 2) тренер и сыгранность
  const COACH_STYLE = ['Тактик', 'Мотиватор', 'Аналитик', 'Наставник молодёжи'];
  const ELITE_COACH = { zonic: 92, hally: 88, sycrone: 86, XTQZZZ: 88, B1ad3: 87, sidde: 82, sAw: 80, 'enkay J': 80, maaRaa: 79, flashie: 78, kassad: 85, ruggah: 80, Lucid: 78, innersh1ne: 76, dastan: 77 };
  function coachProfile(c) {
    if (!c || !c.name) return { style: 'Тактик', rating: 70 };
    const h = h32('coach|' + c.name), style = c.style || COACH_STYLE[h % 4];
    const rating = c.rating || ELITE_COACH[c.name] || (c.exPlayer ? 72 + h % 12 : c.generated || /^[A-Z]\. /.test(c.name) ? 62 + h % 10 : 66 + h % 14);
    return { style, rating };
  }
  function chemOf(t) { try { return V?.chemistry ? V.chemistry(t) : .5; } catch (e) { return .5; } }
  function bootBonus(t) { const o = S(), b = o?.boot?.[t.name]; return b && nowMs() < b.until ? 8 : 0; }
  (function wrapMods() {
    const base = W.CS2StrengthMods; if (base && base.__v84m) return;
    const w = function (t) {
      let v = 0; try { v = base ? Number(base(t)) || 0 : 0; } catch (e) {}
      if (!t || t.isAcademy) return v;
      const cp = coachProfile(t.coach), ch = chemOf(t);
      v += (cp.rating - 75) * .7;                                        // уровень тренера: −9…+12
      v += (ch - .5) * 30 * (cp.style === 'Мотиватор' ? 1.2 : 1);        // сыгранность: −15…+15
      v += bootBonus(t);
      return v;
    };
    w.__v84m = true; W.CS2StrengthMods = w;
  })();
  // наставник молодёжи у тренера — молодые растут быстрее; наставничество ветерана — тоже
  function growthWeek() {
    const o = S(); if (!o) return; const wk = Math.floor(nowMs() / WEEK); if (o.growWk === wk) return; o.growWk = wk;
    TS().forEach(t => {
      const youthCoach = coachProfile(t.coach).style === 'Наставник молодёжи';
      (t.players || []).forEach(p => { if ((+p.age || 25) > 21) return; let g = youthCoach && !W.CS2Staff ? .05 : 0; if (o.mentor[p.nick] && (t.players || []).some(q => q.nick === o.mentor[p.nick])) g += .06;
        // v92: работа с молодёжью — навык тренера в штабе (CS2Staff); наставничество — в общем потолке тренировок (+3 за сезон) и до потенциала
        if (g && W.CS2Develop) { const s = (typeof seasonState !== 'undefined' && seasonState.currentSeason) || 1, tg = p.v31tg && p.v31tg.s === s ? p.v31tg : (p.v31tg = { s, sum: 0 }); const room = clamp(((+p.pot || 90) - W.CS2Develop.pow(p)) / 30, 0, 1); g = Math.min(g * room, Math.max(0, 3 - tg.sum)); tg.sum += g * 1.8; }
        if (g) { p.firepower = clamp((+p.firepower || 70) + g, 60, 99); p.tacticalIQ = clamp((+p.tacticalIQ || 70) + g * .8, 60, 99); } });
    });
  }

  // ====================================================== 3) пресс-конференции, 5) предложения и ультиматумы — через «Центр событий»
  const EVR = V?.EV, raise = V?._t?.raise;
  if (EVR && raise) {
    EVR.press = {
      check(t) { if (t.name !== me()) return; const o = S(), m = (t.history || []).find(h => h && h.tournament && isT1(h.tournament)); if (!m || o.press[m.tournament] || nowMs() - (Number(m.ts || m.at) || nowMs()) > 10 * DAY) return; o.press[m.tournament] = 1;
        const good = (+m.place || 9) <= 2;
        raise('press', t.name, [], { keySuffix: m.tournament, days: 4, title: `Пресс-конференция после ${m.tournament}`, text: good ? `Команда заняла ${m.place}-е место. Журналисты спрашивают о секрете успеха.` : `Команда заняла ${m.place}-е место. Вопрос в лоб: «Что пошло не так?»`,
          options: good ? [{ k: 'team', l: 'Заслуга всей команды', d: 'Мораль +, сыгранность +' }, { k: 'star', l: 'Выделить лучшего игрока', d: 'Звезда довольна, остальные — чуть меньше' }, { k: 'bold', l: '«Мы только начинаем»', d: 'Репутация +, давление растёт' }]
            : [{ k: 'calm', l: 'Спокойно: «Разберём ошибки»', d: 'Без последствий' }, { k: 'blame', l: 'Указать на слабое звено', d: 'Его мораль −, остальным — встряска' }, { k: 'fans', l: 'Извиниться перед фанатами', d: 'Репутация +, мораль −' }], data: { good } }); },
      ai: () => 'calm',
      apply(ev, k) { const t = H.teamBy(ev.team); if (!t) return ''; const ps = t.players || [], org = V.org(t.name), best = ps.slice().sort((a, b) => pow(b) - pow(a))[0], worst = ps.slice().sort((a, b) => pow(a) - pow(b))[0];
        const mor = (p, d) => { if (p) p.morale = clamp((+p.morale || 85) + d, 40, 100); };
        let quote = '';
        if (k === 'team') { ps.forEach(p => mor(p, 3)); t.v31chemBonus = clamp((t.v31chemBonus || 0) + .01, 0, .12); quote = '«Это заслуга всех пятерых и штаба»'; }
        else if (k === 'star') { mor(best, 6); ps.filter(p => p !== best).forEach(p => mor(p, -1)); quote = `«${best?.nick} сегодня был на другом уровне»`; }
        else if (k === 'bold') { org.rep = clamp((org.rep || 50) + 3, 0, 100); quote = '«Мы только начинаем. Следующий турнир — наш»'; }
        else if (k === 'blame') { mor(worst, -8); ps.filter(p => p !== worst).forEach(p => { p.form = clamp((+p.form || 100) + 2, 80, 120); }); quote = `«От ${worst?.nick} мы ждём большего»`; }
        else if (k === 'fans') { org.rep = clamp((org.rep || 50) + 2, 0, 100); ps.forEach(p => mor(p, -2)); quote = '«Простите нас. Мы вернёмся сильнее»'; }
        else quote = '«Разберём ошибки и будем работать»';
        news({ cat: 'interview', icon: '🎤', imp: 4, title: `Тренер ${t.name}: ${quote}`, lead: `Пресс-конференция ${t.name} после турнира.`, body: [], tags: [{ t: 'team', v: t.name }] });
        return quote; }
    };
    EVR.offer = {
      check(t) { if (t.name !== me()) return; const rk = rankOf(t.name); const p = (t.players || []).filter(p => pow(p) >= 82).sort((a, b) => pow(b) - pow(a))[0]; if (!p) return;
        const buyer = ranked().slice(0, Math.max(3, rk - 1)).filter(b => b.name !== t.name).sort((a, b) => h32(p.nick + a.name) - h32(p.nick + b.name))[0]; if (!buyer) return;
        if (h32('off|' + p.nick + Math.floor(nowMs() / (30 * DAY))) % 5) return; // примерно раз в несколько месяцев на игрока
        let fee = 800000; try { fee = Math.round((V.valueOf(p) || 800000) * 1.15 / 10000) * 10000; } catch (e) {}
        raise('offer', t.name, [p.nick], { keySuffix: Math.floor(nowMs() / (30 * DAY)), days: 7, title: `${buyer.name} предлагают ${V.money(fee)} за ${p.nick}`, text: `Спортивный директор ${buyer.name} прислал официальное предложение. ${p.nick} знает об интересе.`,
          options: [{ k: 'decline', l: 'Отказать', d: 'Игрок может расстроиться' }, { k: 'accept', l: 'Принять', d: `+${V.money(fee)} в бюджет, игрок уходит` }, { k: 'counter', l: 'Запросить больше (+30%)', d: 'Клуб может отказаться' }], data: { nick: p.nick, buyer: buyer.name, fee } }); },
      ai: () => 'decline',
      apply(ev, k) { const t = H.teamBy(ev.team), b = H.teamBy(ev.data.buyer), p = (t?.players || []).find(x => x.nick === ev.data.nick); if (!t || !b || !p) return 'предложение больше не актуально';
        const deal = fee => { W.__v31UserDeal = true; let ok = false; try { ok = W.applyPlayerTransfer(t, b, p, `продажа за ${V.money(fee)}`); } finally { W.__v31UserDeal = false; } if (ok) { V.book(t.name, fee, 'trans', `Продажа ${p.nick}`); V.book(b.name, -fee, 'trans', `Покупка ${p.nick}`); } return ok ? `${p.nick} продан за ${V.money(fee)}` : 'сделка сорвалась'; };
        if (k === 'accept') return deal(ev.data.fee);
        if (k === 'counter') return h32(ev.id) % 2 ? deal(Math.round(ev.data.fee * 1.3)) : `${ev.data.buyer} отказались повышать предложение`;
        p.morale = clamp((+p.morale || 85) - ((p.pers?.amb || 10) >= 14 ? 6 : 1), 40, 100); return 'предложение отклонено'; }
    };
    EVR.ultimatum = {
      check(t) { if (t.name !== me()) return; const s = ST()?.currentSeason || 1, rk = rankOf(t.name);
        const p = (t.players || []).map(x => { try { return V.ensurePerson(x); } catch (e) { return x; } }).find(x => (+x.contractUntil || 99) <= s + 0 && (x.pers?.amb || 10) >= 13 && pow(x) >= 84 && rk > 6); if (!p) return;
        raise('ultimatum', t.name, [p.nick], { days: 10, title: `Ультиматум: ${p.nick} требует решения`, text: `«Продлевайте со мной контракт на моих условиях или я ухожу летом свободным агентом». Контракт истекает в этом сезоне.`,
          options: [{ k: 'pay', l: 'Принять условия (+40% зарплаты)', d: 'Контракт на 2 сезона' }, { k: 'sell', l: 'Выставить на трансфер', d: 'Получить деньги сейчас' }, { k: 'wait', l: 'Не реагировать', d: 'Риск потерять бесплатно' }], data: { nick: p.nick } }); },
      ai: () => 'pay',
      apply(ev, k) { const t = H.teamBy(ev.team), p = (t?.players || []).find(x => x.nick === ev.data.nick); if (!p) return '';
        if (k === 'pay') { p.salary = Math.round((+p.salary || 150000) * 1.4 / 1000) * 1000; p.contractUntil = (ST()?.currentSeason || 1) + 2; p.morale = clamp((+p.morale || 85) + 6, 40, 100); return `контракт до сезона ${p.contractUntil}`; }
        if (k === 'sell') { p.v84Listed = nowMs(); p.morale = clamp((+p.morale || 85) - 3, 40, 100); return 'игрок выставлен на трансфер'; }
        p.morale = clamp((+p.morale || 85) - 8, 40, 100); return 'игрок недоволен'; }
    };
  }

  // ====================================================== 4) совет директоров
  // только основные турниры Tier-1/S-Tier/Major (без квалификаций, Tier-2/3 и академий)
  function isT1(name) { if (!name || /qualif|квалиф/i.test(name)) return false; const s = Object.values(H.archive()).find(x => x && x.name === name); return !!s && ['major', 'elite', 'regular'].includes(s.prestige); }
  function boardExpect(rk) { return rk <= 3 ? 2 : rk <= 8 ? 4 : rk <= 16 ? 8 : 12; } // ожидаемое среднее место на Tier-1
  function boardTick() {
    if (W.CS2Board) return;   // v91: решения совета — контракт с руководством (js/career/board.js)
    const o = S(), team = me(); if (!o || !team) return; const B = o.board[team] = o.board[team] || { conf: 60, exp: boardExpect(rankOf(team)), seen: {}, warned: 0, season: ST()?.currentSeason };
    if (B.season !== ST()?.currentSeason) { B.season = ST()?.currentSeason; B.exp = boardExpect(rankOf(team)); B.conf = Math.round(B.conf * .6 + 60 * .4); }
    const t = H.teamBy(team); (t?.history || []).slice(0, 4).forEach(h => {
      if (!h || !h.tournament || B.seen[h.tournament] || !(h.place > 0) || !isT1(h.tournament)) return; B.seen[h.tournament] = 1;
      const d = clamp((B.exp - h.place) * 2.2, -14, 12) + (h.place === 1 ? 8 : 0); B.conf = clamp(B.conf + d, 0, 100);
    });
    if (B.conf < 30 && !B.warned) { B.warned = 1; news({ cat: 'season', icon: '⚠️', imp: 6, title: `Совет директоров ${team} недоволен`, lead: `Доверие к тренерскому штабу — ${Math.round(B.conf)}%. Следующие турниры решат судьбу менеджера.`, body: [], tags: [{ t: 'team', v: team }] }); try { W.v29Toast?.(`<div class="v29-toast-ic">⚠️</div><div class="v29-toast-t"><small>Совет директоров</small><b>Доверие ${Math.round(B.conf)}%</b><span>Нужны результаты</span></div>`); } catch (e) {} }
    if (B.conf >= 40) B.warned = 0;
    if (B.conf < 12) { // увольнение
      news({ cat: 'season', icon: '🚪', imp: 8, title: `${team} расстаётся с менеджером`, lead: 'Совет директоров принял решение: результаты не соответствуют ожиданиям.', body: ['Предложения от других клубов — в разделе «Штаб организации».'], tags: [{ t: 'team', v: team }] });
      o.offers = jobOffers(team, false); try { V.careerLog?.(`Уволен из ${team}`); V.setManaged(''); } catch (e) {} delete o.board[team];
    }
    // предложения от сильных клубов за успех
    const wk = Math.floor(nowMs() / (30 * DAY)); if (B.conf >= 85 && o.offerWk !== wk) { o.offerWk = wk; o.offers = jobOffers(team, true); if (o.offers.length) try { W.v29Toast?.(`<div class="v29-toast-ic">💼</div><div class="v29-toast-t"><small>Предложение работы</small><b>${esc(o.offers[0])} хотят видеть вас менеджером</b><span>Раздел «Штаб организации»</span></div>`); } catch (e) {} }
  }
  function jobOffers(from, up) { const rk = rankOf(from); return ranked().filter(t => t.name !== from).filter(t => up ? rankOf(t.name) < rk : Math.abs(rankOf(t.name) - rk - 6) <= 8).sort((a, b) => h32(from + a.name) - h32(from + b.name)).slice(0, 3).map(t => t.name); }
  function boardBox() {
    if (W.CS2Board) { try { W.CS2Board.tick(); } catch (e) {} return W.CS2Board.box(); }   // v91
    const o = S(), team = me(); const B = team ? o?.board?.[team] : null;
    const offers = (o?.offers || []).filter(n => n !== team);
    const conf = B ? Math.round(B.conf) : null;
    return `<section class="hs-box v84-board"><header class="hs-box-h"><h3>Совет директоров</h3>${B ? `<span class="hs-sub">ожидание: в среднем топ-${B.exp} на турнирах Tier-1</span>` : ''}</header>
      ${B ? `<div class="v84-board-b"><div class="v84-conf"><i style="width:${conf}%;background:${conf >= 60 ? '#3ecf8e' : conf >= 30 ? '#ffb02e' : '#ff5c5c'}"></i></div><b>${conf}%</b><small>${conf >= 70 ? 'Совет доволен работой' : conf >= 40 ? 'Совет ждёт прогресса' : 'Ваша должность под угрозой'}</small></div>` : ''}
      ${offers.length ? `<div class="v84-offers"><small>Предложения работы:</small>${offers.map(n => `<button type="button" class="hs-btn ghost sm" data-joboffer="${esc(n)}">${H.logo(n, 'xs')} ${esc(n)} (#${rankOf(n)})</button>`).join('')}</div>` : ''}</section>`;
  }
  H.CLICKS.push(['[data-joboffer]', el => { const n = el.dataset.joboffer; if (!confirm(`Перейти в ${n}?`)) return; try { V.setManaged(n); V.careerLog?.(`Новый клуб: ${n}`); } catch (e) {} const o = S(); o.offers = []; news({ cat: 'season', icon: '🤝', imp: 7, title: `${n} назначили нового менеджера`, lead: 'Клуб рассчитывает на быстрый прогресс.', body: [], tags: [{ t: 'team', v: n }] }); try { W.saveSeasonState?.(); } catch (e) {} H.render(); }]);

  // ====================================================== 6) наставничество (в переписке)
  try {
    const DM = W.CS2DM; if (DM && !DM.__v84mentor) { DM.__v84mentor = true;
      (H.AFTER || []).push(page => { try { if (page !== 'dm') return; const nick = H.S.dm?.nick, t = H.teamBy(me()); if (!nick || !t) return; const p = (t.players || []).find(x => x.nick === nick); if (!p || (+p.age || 25) < 27) return;
        const acts = document.querySelector('#hs-page .v84-dm-acts'); if (!acts || acts.querySelector('[data-mentor]')) return;
        const young = (t.players || []).filter(x => (+x.age || 25) <= 21);
        young.forEach(y => acts.insertAdjacentHTML('beforeend', `<button type="button" class="hs-btn ghost sm" data-mentor="${esc(nick)}|${esc(y.nick)}">${S().mentor[y.nick] === nick ? '✓ ' : ''}Наставник для ${esc(y.nick)}</button>`)); } catch (e) {} });
      H.CLICKS.push(['[data-mentor]', el => { const [v, y] = el.dataset.mentor.split('|'), o = S(); if (o.mentor[y] === v) return; o.mentor[y] = v; DM.post(v, 'me', `Возьмёшь шефство над ${y}? Помоги ему с коммуникацией и позиционкой.`); DM.post(v, 'p', pick(v + y, [`Конечно. ${y} — талант, помогу.`, 'Без проблем, займусь.', 'Хорошо. Будем разбирать демки вместе.'])); try { const t = H.teamBy(me()); t.v31chemBonus = clamp((t.v31chemBonus || 0) + .01, 0, .12); W.saveSeasonState?.(); } catch (e) {} H.render(); }]);
    }
  } catch (e) {}

  // ====================================================== 7) буткемпы перед Мейджором
  const CAMPS = [['Белград', 'RS'], ['Копенгаген', 'DK'], ['Варшава', 'PL'], ['Стамбул', 'TR'], ['Дубай', 'AE'], ['Бухарест', 'RO'], ['Кёльн', 'DE']];
  function bootTick() {
    const o = S(); if (!o) return; let cal = []; try { cal = H.calendarEvents?.() || []; } catch (e) {}
    const major = cal.find(e => e && (e.kind === 'major' || /major/i.test(String(e.prestige || ''))) && !/qualif|квалиф|RMR/i.test(e.name || '') && Number(e.startMs || 0) > nowMs() && Number(e.startMs) - nowMs() < 10 * DAY);
    if (!major || o.seen['boot|' + major.name]) return; o.seen['boot|' + major.name] = 1;
    const list = ranked().slice(0, 16), start = Number(major.startMs);
    list.forEach(t => { o.boot[t.name] = { until: start + 12 * DAY, where: CAMPS[h32(t.name + major.name) % CAMPS.length][0] }; });
    if (!batch()) news({ cat: 'preview', icon: '🏕️', imp: 5, title: `Перед ${major.name}: команды уехали на буткемпы`, lead: list.slice(0, 6).map(t => `${t.name} — ${o.boot[t.name].where}`).join(', ') + '.', body: ['Сборы дают прибавку в сыгранности на время Мейджора.'], tags: list.slice(0, 2).map(t => ({ t: 'team', v: t.name })) });
  }

  // ====================================================== 8) ротация маппула (июль)
  const RESERVE = ['Overpass', 'Vertigo', 'Train', 'Tuscan', 'Cobblestone', 'Season'];
  function getPool() { try { return typeof MAP_POOL !== 'undefined' ? MAP_POOL : null; } catch (e) { return null; } }
  function applyPool(list) {
    const P = getPool(); if (!P || !Array.isArray(list) || list.length !== P.length) return;
    P.splice(0, P.length, ...list); try { if (W.CS2Realism?.ACTIVE_DUTY) W.CS2Realism.ACTIVE_DUTY.splice(0, W.CS2Realism.ACTIVE_DUTY.length, ...list); } catch (e) {}
    TS().forEach(t => ['maps', 'mapStrength'].forEach(k => { const m = t[k]; if (!m || typeof m !== 'object') return; list.forEach(n => { if (!Number.isFinite(Number(m[n]))) { const v = Object.values(m).map(Number).filter(Number.isFinite); m[n] = Math.round(clamp((v.length ? v.reduce((a, b) => a + b, 0) / v.length : 60) - 4 + (h32(t.name + n) % 8), 40, 95)); } }); if (t.mapStats && !t.mapStats[list[list.length - 1]]) list.forEach(n => { if (!t.mapStats[n]) t.mapStats[n] = { games: 0, wins: 0, losses: 0 }; }); }));
  }
  function mapTick() {
    const o = S(); if (!o) return; if (o.pool && !o.poolApplied) { o.poolApplied = 1; applyPool(o.pool); }
    const d = new Date(nowMs()), y = d.getFullYear(), P = getPool(); if (!P || y < 2027 || d.getMonth() !== 6 || o.seen['map|' + y]) return; o.seen['map|' + y] = 1;
    const cand = P.filter(m => !['Mirage', 'Inferno', 'Dust II'].includes(m)), out = cand[h32('out' + y) % cand.length], inn = RESERVE.filter(m => !P.includes(m))[h32('in' + y) % RESERVE.filter(m => !P.includes(m)).length];
    if (!out || !inn) return; const list = P.map(m => m === out ? inn : m); o.pool = list; applyPool(list);
    news({ cat: 'season', icon: '🗺️', imp: 7, title: `Обновление маппула: ${inn} возвращается, ${out} уходит`, lead: `Valve обновила Active Duty. Новый пул: ${list.join(', ')}.`, body: [`Командам, сильным на ${out}, придётся перестраиваться; ${inn} — шанс для тех, кто готовил её в практике.`], tags: [] });
  }

  // ====================================================== 9) организаторы
  const NEW_LEAGUES = ['Thunderpick World Championship', 'Fragadelphia', 'Galaxy Battle Masters', 'Perfect World Arena', 'YaLLa Compass Invitational'];
  function orgTick() {
    const o = S(); if (!o) return; const d = new Date(nowMs()), y = d.getFullYear(), m = d.getMonth();
    if (m === 3 && !o.org['lg' + y] && h32('lg' + y) % 3 === 0) { o.org['lg' + y] = 1; const n = NEW_LEAGUES[h32('lgn' + y) % NEW_LEAGUES.length]; news({ cat: 'tournament', icon: '🆕', imp: 5, title: `Анонс: ${n} ${y + 1} — новый турнир в календаре`, lead: 'Организатор обещает призовой фонд уровня Tier-1 и приглашения топ-команд.', body: ['Сцена встречает новичка осторожно: многие помнят турниры, которые не выплатили призовые.'], tags: [] }); }
    // задержка выплат: раз в год у одного турнира Tier-2 — деньги приходят через 2 месяца
    if (m === 8 && !o.org['late' + y] && h32('late' + y) % 2 === 0) {
      o.org['late' + y] = 1; const s = Object.values(H.archive()).filter(x => x && !x.show && x.prestige === 'tier2' && x.champion && x.year === y).sort((a, b) => (b.ge || 0) - (a.ge || 0))[0]; if (!s) return;
      o.org.pending = { name: s.name, team: s.champion, sum: 40000 + h32(s.id) % 60000, at: nowMs() + 60 * DAY };
      try { V?.book?.(s.champion, -o.org.pending.sum, 'prize', `Задержка выплаты ${s.name}`); } catch (e) {}
      news({ cat: 'tournament', icon: '💸', imp: 5, title: `Организатор ${s.name} задерживает выплату призовых`, lead: `${s.champion} не получили $${o.org.pending.sum.toLocaleString('en-US')}. Организатор обещает рассчитаться в течение двух месяцев.`, body: [], tags: [{ t: 'team', v: s.champion }] });
    }
    const pd = o.org.pending; if (pd && nowMs() > pd.at) { try { V?.book?.(pd.team, pd.sum, 'prize', `Выплата ${pd.name}`); } catch (e) {} news({ cat: 'tournament', icon: '✅', imp: 4, title: `${pd.name}: призовые выплачены`, lead: `${pd.team} наконец получили свои деньги.`, body: [], tags: [{ t: 'team', v: pd.team }] }); o.org.pending = null; }
  }

  // ====================================================== подключение к страницам
  (H.AFTER || []).push(page => {
    try {
      const root = document.getElementById('hs-page'); if (!root) return;
      if (page === 'transfers' && !root.querySelector('.v84-window')) { const h = root.querySelector('.hs-head'); h ? h.insertAdjacentHTML('afterend', windowBox()) : root.insertAdjacentHTML('afterbegin', windowBox()); }
      if (page === 'org' && !root.querySelector('.v84-board')) { const h = root.querySelector('.hs-head'); h ? h.insertAdjacentHTML('afterend', boardBox()) : root.insertAdjacentHTML('afterbegin', boardBox()); }
      if (page === 'team') { const name = root.querySelector('h1')?.textContent?.trim(), t = H.teamBy(name); const k = root.querySelector('.tm-k');
        if (t && k && !k.querySelector('.v84-coachst')) { const cp = coachProfile(t.coach), ch = Math.round(chemOf(t) * 100); k.insertAdjacentHTML('beforeend', ` <span class="v84-coachst" title="Стиль и уровень тренера; сыгранность — время вместе, коммуникация и лидер">${esc(cp.style)} · ${cp.rating} · сыгранность ${ch}%${bootBonus(t) ? ' · буткемп' : ''}</span>`); } }
    } catch (e) {}
  });
  if (!V?.org) { /* без карьерного ядра — только мир */ }
  (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => { [windowTick, growthWeek, boardTick, bootTick, mapTick, orgTick].forEach(f => { try { f(); } catch (e) { console.warn('[v84 mgr]', f.name, e); } }); }, 5000);
  W.CS2Manager2 = { coachProfile, windowBox, boardBox, state: S, applyPool };
})();
