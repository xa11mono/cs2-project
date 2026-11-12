/* v114 — матч-день менеджера.

   Раньше о своём матче менеджер узнавал из итога («мы выиграли 2:0»): уведомления были только всплывающими, и при
   перемотке дней их не было видно. Теперь матч встроен в окно «Требует решения» (оно ставит время на паузу и
   останавливает перемотку):
     • накануне — «Завтра в 18:00 матч с X»: разведка соперника (автоматически, по кнопке или всегда), тренировка;
     • в день матча — «Сегодня в 18:00»: промотать к матчу или заняться делами;
     • за 10 минут до начала — «Матч начинается»: смотреть или пропустить (время уходит вперёд, итог придёт сам).
   В меню перемотки — «До моего следующего матча». Состояние — seasonState.v114md. */
(function () {
  'use strict';
  const W = window, H = W.HS, DAY = 864e5, MIN = 6e4;
  if (!H || typeof seasonState === 'undefined') return;
  const esc = H.esc;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const me = () => { try { return W.V31 && W.V31.managed ? W.V31.managed() : ''; } catch (e) { return ''; } };
  const S = () => { const s = seasonState.v114md = seasonState.v114md || {}; s.done = s.done || {}; s.seen = s.seen || {}; return s; };
  const save = () => { try { W.saveSeasonState && W.saveSeasonState(); } catch (e) {} };
  const names = a => (a || []).map(x => typeof x === 'string' ? x : x && (x.name || x.team)).filter(Boolean);
  const dayNo = ms => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY; };
  const hm = ms => { const d = new Date(ms); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
  const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);

  /* ------------------------------------------------------------ ближайший матч клуба */
  function myNext() {
    const m = me(); if (!m) return null;
    const out = [], ct = CT();
    if (ct && !ct.completed) {
      const b = ct.broadcast || {};
      (b.active || []).forEach(it => { const x = it.match; if (x && (x.t1 === m || x.t2 === m)) out.push({ at: now(), live: true, opp: x.t1 === m ? x.t2 : x.t1, ev: ct.name, main: true, id: it.id }); });
      (b.queue || []).forEach(q => { const x = q.match; if (x && (x.t1 === m || x.t2 === m) && +q.time && q.status !== 'done') out.push({ at: +q.time, opp: x.t1 === m ? x.t2 : x.t1, ev: ct.name, main: true, id: q.id }); });
      if (!out.length && names(ct.participants).includes(m) && +(ct.calendar && ct.calendar.autoBroadcastAt)) out.push({ at: +ct.calendar.autoBroadcastAt, opp: '', ev: ct.name, main: true, start: true });
    }
    (seasonState.parallelSchedule || []).forEach(ev => {
      if (!ev || ev.status === 'completed' || !names(ev.participants).includes(m)) return;
      const mine = ((ev.br && ev.br.matches) || []).filter(x => x && !x.w && (x.t1 === m || x.t2 === m) && +x.at);
      if (mine.length) mine.forEach(x => out.push({ at: +x.at, opp: x.t1 === m ? x.t2 : x.t1, ev: ev.name, evId: ev.id }));
      else if (ev.status === 'scheduled' && +ev.startMs) out.push({ at: +ev.startMs, opp: '', ev: ev.name, evId: ev.id, start: true });
    });
    const t0 = now();
    const list = out.filter(x => x.live || x.at >= t0 - 30 * MIN).sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || a.at - b.at);
    const n = list[0]; if (!n) return null;
    n.key = `${n.ev}|${n.opp || 'start'}|${Math.floor(n.at / MIN)}`;
    return n;
  }
  function phaseOf(n) {
    if (!n) return null;
    const dt = n.at - now();
    if (n.live || dt <= 10 * MIN) return n.start ? null : 'soon';
    if (dayNo(n.at) === dayNo(now())) return 'today';
    if (dayNo(n.at) === dayNo(now()) + 1) return 'tomorrow';
    return null;
  }
  const idOf = (ph, n) => `md|${ph}|${n.key}`;
  function current() { const n = myNext(), ph = phaseOf(n); return ph ? { n, ph, id: idOf(ph, n) } : null; }

  /* ------------------------------------------------------------ действия */
  function autoScout(n) {
    if (!n || !n.opp) return null;
    try { const p = W.V31.setPrep(me(), { opp: n.opp, maps: [] }); return p; } catch (e) { return null; }
  }
  function advanceTo(ms) {
    const mins = Math.floor((ms - now()) / MIN); if (mins <= 0) return;
    try { if (typeof W.v15AdvanceMinutes === 'function') W.v15AdvanceMinutes(mins, 'матч-день'); else seasonState.calendar.currentMs += mins * MIN; seasonState.calendar.lastWallMs = Date.now(); } catch (e) {}
  }
  const closeGate = () => setTimeout(() => { const x = document.querySelector('#v96-gate [data-v96close]'); if (x) x.click(); }, 0);
  function act(id, a) {
    const s = S(), c = current(); const n = c && c.id === id ? c.n : null;
    s.done[id] = { a, at: now() };
    if (a === 'scout' && n) { const p = autoScout(n); s.res = p ? `Разведка ${n.opp} проведена: качество отчёта ${Math.round((p.quality || 0) * 100)}%.` : 'Нет данных для разведки.'; }
    else if (a === 'always' && n) { s.autoScout = true; const p = autoScout(n); s.res = `Разведка соперника теперь проводится автоматически накануне матча.${p ? ` ${n.opp}: качество ${Math.round((p.quality || 0) * 100)}%.` : ''}`; }
    else if (a === 'train') { s.res = ''; closeGate(); setTimeout(() => H.nav('training'), 30); }
    else if (a === 'goto' && n) { s.res = ''; closeGate(); setTimeout(() => { advanceTo(n.at - 10 * MIN); try { H.render(); } catch (e) {} }, 60); }
    else if (a === 'watch' && n) { s.res = ''; closeGate(); setTimeout(() => { if (n.main) { try { if (CT() && CT().broadcast && !CT().broadcast.running && W.startTVBroadcastMode) W.startTVBroadcastMode(); } catch (e) {} try { n.id ? H.spectator.focus(n.id) : H.nav('watch'); } catch (e) { H.nav('watch'); } } else H.nav('event', n.evId); }, 60); }
    else if (a === 'skip' && n) { s.res = ''; closeGate(); setTimeout(() => { advanceTo(Math.max(now(), n.at) + 80 * MIN); try { H.render(); } catch (e) {} }, 60); }
    else s.res = '';
    save();
  }
  function opt(id, a, i, l, d) { return `<button type="button" class="v96-opt" data-v114md="${esc(id)}|${a}"><i>${i}</i><span><b>${esc(l)}</b>${d ? `<small>${esc(d)}</small>` : ''}</span></button>`; }
  function card(id) {
    const c = current(), s = S();
    if (s.done[id]) return `<article class="v96-ev"><header class="v96-ev-h"><span class="v96-kind ok">Матч-день</span></header><h3>Готово</h3><p class="v96-ev-t">${esc(s.res || 'Принято.')}</p><div class="v96-opts"><button type="button" class="v96-go" data-v96next>Дальше</button></div></article>`;
    if (!c || c.id !== id) return `<article class="v96-ev"><h3>Матч уже сыгран или перенесён</h3><div class="v96-opts"><button type="button" class="v96-go" data-v96next>Дальше</button></div></article>`;
    const { n, ph } = c, vs = n.opp ? `${me()} — ${n.opp}` : n.ev, when = hm(n.at);
    const head = `<header class="v96-ev-h"><span class="v96-kind">Матч-день</span><span class="v96-due${ph === 'soon' ? ' hot' : ''}">${ph === 'tomorrow' ? 'завтра · ' + when : ph === 'today' ? 'сегодня · ' + when : 'сейчас'}</span></header>`;
    let o = '', h3 = '', p = '';
    let prep = null; try { prep = W.V31.org(me()).prep; } catch (e) {}
    const prepOk = prep && n.opp && prep.opp === n.opp && now() - (prep.ts || 0) < 10 * DAY;
    if (ph === 'tomorrow') {
      h3 = n.start ? `Завтра стартует ${n.ev}` : `Завтра в ${when} — матч с ${n.opp}`;
      p = `${n.ev}. ${prepOk ? 'Подготовка к сопернику уже проведена.' : n.opp ? 'Подготовка к сопернику ещё не проведена — разведка даёт план на карты и бонус в матче.' : 'Соперник определится по жеребьёвке.'}`;
      if (n.opp && !prepOk) o += opt(id, 'scout', 1, 'Провести разведку соперника', 'отчёт аналитиков и план на карты') + opt(id, 'always', 2, 'Всегда делать разведку автоматически', 'накануне каждого матча');
      o += opt(id, 'train', o ? 3 : 1, 'Открыть тренировки', 'нагрузка перед матчем') + opt(id, 'ok', o ? 4 : 2, 'Понятно', 'продолжить');
    } else if (ph === 'today') {
      h3 = n.start ? `Сегодня стартует ${n.ev}` : `Сегодня в ${when} — матч с ${n.opp}`;
      p = `${n.ev}. До начала — ${Math.max(1, Math.round((n.at - now()) / 36e5))} ч.`;
      if (n.opp && !prepOk) o += opt(id, 'scout', 1, 'Провести разведку', 'пока есть время');
      o += opt(id, 'goto', o ? 2 : 1, 'Промотать к матчу', 'часы — за 10 минут до начала') + opt(id, 'ok', o ? 3 : 2, 'Позже — есть дела', 'напомню за 10 минут до начала');
    } else {
      h3 = `Матч начинается: ${vs}`;
      p = `${n.ev}${n.live ? ' · уже в эфире' : ` · в ${when}`}. Смотреть матч или узнать итог? В эфире своего матча — тактические тайм-ауты и решение в перерыве; планы на карты — на странице «Тактика».`;
      o += opt(id, 'watch', 1, 'Смотреть', n.main ? 'эфир матча' : 'страница турнира') + opt(id, 'skip', 2, 'Пропустить', 'время уйдёт вперёд, итог придёт в почту и новости');
    }
    return `<article class="v96-ev v114-md">${head}<h3>${esc(h3)}</h3><p class="v96-ev-t">${esc(p)}</p><div class="v96-opts">${o}</div></article>`;
  }
  // автоматическая разведка накануне (если включена)
  function autoTick() {
    const s = S(); if (!s.autoScout) return; const c = current(); if (!c || c.ph !== 'tomorrow' || !c.n.opp) return;
    const k = 'auto|' + c.n.key; if (s.done[k]) return; s.done[k] = { a: 'auto', at: now() };
    let prep = null; try { prep = W.V31.org(me()).prep; } catch (e) {}
    if (!(prep && prep.opp === c.n.opp && now() - (prep.ts || 0) < 10 * DAY)) autoScout(c.n);
    save();
  }

  if (W.V96Windows && W.V96Windows.addProvider) W.V96Windows.addProvider({
    key: 'matchday',
    items: () => { try { autoTick(); const c = current(); return c && !S().done[c.id] ? [c.id] : []; } catch (e) { return []; } },
    fresh: () => { try { const c = current(); return c && !S().done[c.id] && !S().seen[c.id] ? [c.id] : []; } catch (e) { return []; } },
    card: id => card(id),
    seen: id => { S().seen[id] = now(); },
    later: id => { S().done[id] = { a: 'later', at: now() }; save(); },
    click: t => { const el = t.closest && t.closest('[data-v114md]'); if (!el) return false; const v = el.dataset.v114md, i = v.lastIndexOf('|'); act(v.slice(0, i), v.slice(i + 1)); return true; }
  });

  /* ------------------------------------------------------------ «До моего следующего матча» в меню перемотки */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let running = false;
  async function skipToMine() {
    if (running || !me()) return; running = true;
    try {
      for (let g = 0; g < 60; g++) {
        const n = myNext();
        if (n && (n.live || n.at - now() <= 10 * MIN)) break;
        if (n && n.at - now() <= 3 * DAY) { advanceTo(n.at - 10 * MIN); break; }
        W.skipGameCalendarDay(); await sleep(300);
        if (document.querySelector('#v96-gate:not([hidden])')) break;   // окно решений остановило перемотку
      }
    } catch (e) { console.warn('[v114 matchday]', e); }
    running = false; save(); try { H.render(); } catch (e) {}
  }
  function mount() {
    const menu = document.querySelector('#pt-skipdd .pt-menu'); if (!menu || menu.querySelector('[data-v114mine]')) return;
    if (!me()) return;
    menu.insertAdjacentHTML('afterbegin', '<button type="button" data-v114mine>До моего следующего матча</button>');
  }
  document.addEventListener('click', e => { if (!e.target.closest || !e.target.closest('[data-v114mine]')) return; e.preventDefault(); e.stopPropagation(); document.querySelectorAll('.pt-dd.open').forEach(x => x.classList.remove('open')); skipToMine(); }, true);
  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => { try { mount(); } catch (e) {} }, 1500, 'v114-md-mount');
  W.V114Matchday = { myNext, current, skipToMine, state: S };
})();
