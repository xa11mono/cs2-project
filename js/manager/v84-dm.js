/* v84 — переписка с игроками (режим карьеры). Личные сообщения игрокам своей команды и игрокам других клубов.
   Каждое сообщение — действие с последствиями, ответ зависит от характера игрока (V31: амбиции, профессионализм,
   лояльность, лидерство, стрессоустойчивость), его формы, роли и веса карьеры:
     • свои игроки: похвалить, поговорить о форме (критика), обсудить роль (капитан/снайпер/рифлер), продлить контракт,
       спросить о самочувствии;
     • чужие игроки: прощупать интерес к переходу — ответ учитывает рейтинг вашей команды, вес карьеры игрока
       (звёзды не идут в слабые клубы) и лояльность; при интересе — кнопка перехода к переговорам.
   Игроки пишут сами: после побед и провалов, при низкой мотивации, при окончании контракта.
   У каждого действия — пауза (неделя игрового времени), чтобы разговоры не превращались в «кнопку морали». */
(function () {
  'use strict';
  const W = window, H = W.HS, V = W.V31; if (!H || !V) return;
  const esc = H.esc, DAY = 864e5;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const S = () => { const s = ST(); return s ? (s.v84DM = s.v84DM || { th: {}, cd: {}, unread: {}, week: 0 }) : null; };
  const me = () => V.managed(), T = () => H.teamBy(me());
  const pick = (k, a) => a[h32(k) % a.length];
  const fmt = ms => new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  function thread(nick) { const s = S(); return s ? (s.th[nick] = s.th[nick] || []) : []; }
  function post(nick, from, text, extra) { const t = thread(nick); t.push(Object.assign({ from, text, ts: nowMs() }, extra || {})); if (t.length > 60) t.splice(0, t.length - 60); if (from === 'p' && H.S.page !== 'dm') { const s = S(); s.unread[nick] = (s.unread[nick] || 0) + 1; } }
  const cdKey = (nick, a) => nick + '|' + a;
  const onCd = (nick, a) => nowMs() - (S()?.cd?.[cdKey(nick, a)] || 0) < 7 * DAY;
  const setCd = (nick, a) => { S().cd[cdKey(nick, a)] = nowMs(); };
  const P = nick => { const x = H.playerNow(nick); if (x?.p) V.ensurePerson(x.p); return x; };
  const rk = name => { try { return V.rankOf(name); } catch (e) { return 50; } };
  // --------------------------------------------------------------- действия
  const ACT_MINE = [['praise', 'Похвалить игру'], ['critic', 'Поговорить о форме'], ['role', 'Обсудить роль'], ['contract', 'Продлить контракт'], ['mood', 'Как самочувствие?']];
  const ACT_OTHER = [['interest', 'Интерес к переходу?'], ['hello', 'Просто написать']];
  function act(nick, a, arg) {
    const x = P(nick); if (!x) return; const p = x.p, pe = p.pers || {}, mine = x.t?.name === me(), k = nick + a + Math.floor(nowMs() / DAY);
    if (onCd(nick, a)) return; setCd(nick, a);
    if (a === 'praise') {
      post(nick, 'me', pick(k + 'm', ['Отличная работа на последних картах. Так держать!', 'Видел твою игру — очень сильно. Команда это чувствует.', 'Хочу сказать спасибо за последние матчи.']));
      const vain = (pe.amb || 10) > 14 && (pe.prof || 10) < 9;
      p.morale = clamp((+p.morale || 85) + (vain ? 2 : 4), 40, 100); p.conf = clamp((+p.conf || 60) + 3, 0, 100);
      post(nick, 'p', vain ? pick(k, ['Спасибо 🙂 Надеюсь, это отразится и в контракте.', 'Приятно. Я знаю, что могу ещё больше.']) : pick(k, ['Спасибо, тренер! Работаем дальше 💪', 'Ценю. Будем держать уровень.', 'Спасибо, это много значит.']));
    } else if (a === 'critic') {
      post(nick, 'me', pick(k + 'm', ['Последние матчи были ниже твоего уровня. Что происходит?', 'Нужно больше от тебя. Давай разберём ошибки.', 'Мне кажется, ты можешь лучше. Поговорим?']));
      const pro = (pe.prof || 10) >= 11, tough = (pe.press || 10) >= 11;
      if (pro) { p.form = clamp((+p.form || 100) + 3, 80, 120); p.morale = clamp((+p.morale || 85) - 1, 40, 100); post(nick, 'p', pick(k, ['Согласен. Пересмотрю демки и добавлю в тренировках.', 'Принял. На следующей неделе будет лучше.', 'Да, сам недоволен. Поработаю над позиционкой.'])); }
      else { p.morale = clamp((+p.morale || 85) - (tough ? 3 : 6), 40, 100); post(nick, 'p', pick(k, ['Я и так выкладываюсь. Давай без давления.', 'Понял… Неприятно, но ладно.', 'Может, проблема не только во мне?'])); }
    } else if (a === 'role') {
      const want = arg || 'IGL', t = x.t; post(nick, 'me', want === 'IGL' ? 'Хочу, чтобы ты взял на себя роль капитана.' : want === 'AWPer' ? 'Предлагаю тебе взять AWP.' : 'Хочу перевести тебя на роль рифлера.');
      const fitIgl = (+p.tacticalIQ || 70) >= 80 && (pe.lead || 10) >= 11, fitAwp = (+p.firepower || 70) >= 82;
      const ok = want === 'IGL' ? fitIgl : want === 'AWPer' ? fitAwp : !/IGL|AWP/i.test(p.role || '') || (pe.loy || 10) >= 10;
      if (!ok) { p.morale = clamp((+p.morale || 85) - 2, 40, 100); post(nick, 'p', want === 'IGL' ? 'Не думаю, что готов вести команду. Пусть звонит тот, у кого это получается лучше.' : want === 'AWPer' ? 'Снайперка — не моё. Я сильнее с винтовкой.' : 'Мне комфортно в моей роли. Давай не будем ломать то, что работает.'); return; }
      const prev = (t.players || []).find(q => q !== p && q.role === want && !/BENCH|RESERVE/.test(q.status || ''));
      if (prev && want !== 'Rifler') prev.role = 'Rifler';
      if (/IGL|AWP/i.test(p.role || '') && want === 'Rifler') { /* роль освободится — fixRoles назначит лучшего */ }
      p.role = want; p.v84roleLocked = 1; if (prev && want !== 'Rifler') prev.v84roleLocked = 1; try { W.V34Roster?.fixRoles?.(t); W.saveTeams?.(); } catch (e) {}
      post(nick, 'p', pick(k, ['Договорились. Попробую — дай мне пару турниров.', 'Хорошо, беру на себя. Посмотрим, как пойдёт.', 'Принято. Сделаю всё, что смогу.']));
      try { W.V29News?.add?.({ cat: 'transfer', icon: '🧠', imp: 4, title: `${t.name}: ${nick} меняет роль — теперь ${want === 'IGL' ? 'капитан' : want === 'AWPer' ? 'снайпер' : 'рифлер'}`, lead: prev ? `${prev.nick} переходит на роль рифлера.` : 'Решение тренерского штаба.', body: [], tags: [{ t: 'player', v: nick }, { t: 'team', v: t.name }] }); } catch (e) {}
    } else if (a === 'contract') {
      const s = ST()?.currentSeason || 1, until = +p.contractUntil || s, yrs = until - s;
      post(nick, 'me', 'Давай обсудим продление контракта.');
      if (yrs >= 3) { post(nick, 'p', 'У меня и так длинный контракт. Вернёмся к этому позже.'); return; }
      const star = W.CS2Stature?.tier?.(p) || 'regular', ambit = (pe.amb || 10) >= 13 && rk(x.t.name) > 8;
      if (ambit && (pe.loy || 10) < 10) { post(nick, 'p', pick(k, ['Честно — хочу посмотреть, что будет летом. Хочу играть за трофеи.', 'Пока не готов. Мне важно видеть амбиции клуба.'])); return; }
      const bonus = Math.round(((+p.salary || 100000) * (star === 'franchise' ? .5 : star === 'star' ? .35 : .2)) / 1000) * 1000;
      if ((V.org(me())?.budget || 0) < bonus) { post(nick, 'p', 'Я готов, но клуб сейчас не может предложить бонус за подпись. Вернёмся, когда будет возможность.'); return; }
      try { V.book(me(), -bonus, 'trans', `Бонус за продление: ${nick}`); } catch (e) {}
      p.contractUntil = until + 2; p.morale = clamp((+p.morale || 85) + 4, 40, 100);
      post(nick, 'p', `Подписываю! Контракт до сезона ${p.contractUntil}. Бонус за подпись — ${V.money(bonus)}.`, { sys: true });
    } else if (a === 'mood') {
      post(nick, 'me', 'Как ты? Как настрой, как самочувствие?');
      const m = +p.morale || 85, f = +p.fatigue || 0;
      post(nick, 'p', m < 60 ? pick(k, ['Если честно, тяжело. Не чувствую доверия.', 'Не лучший период. Нужна поддержка.']) : f > 60 ? 'Устал. Плотный календарь — было бы хорошо немного разгрузиться.' : m > 90 ? 'Всё отлично! Рвусь в бой 🔥' : pick(k, ['Нормально, работаем.', 'Всё хорошо, спасибо что спросил.']));
    } else if (a === 'interest') {
      post(nick, 'me', `Привет! Как смотришь на переход в ${me()}?`);
      const myRank = rk(me()), hisRank = rk(x.t?.name), canJoin = !W.CS2Stature || W.CS2Stature.canJoin(p, T(), x.t);
      const score = (hisRank - myRank) * 1.5 + ((pe.amb || 10) - 10) * (myRank < hisRank ? 1 : -1) - ((pe.loy || 10) - 10) * 1.2 + (canJoin ? 0 : -30);
      if (score > 4) post(nick, 'p', pick(k, ['Интересно. Если клубы договорятся — я открыт.', 'Слышал о вашем проекте. Готов обсудить.']), { cta: 'negotiate' });
      else if (score > -4) post(nick, 'p', pick(k, ['Сейчас сосредоточен на текущей команде. Но не исключаю ничего в будущем.', 'Пока рано. Посмотрим после сезона.']));
      else post(nick, 'p', pick(k, ['Спасибо, но нет. Я там, где хочу быть.', 'Не рассматриваю переход. Удачи вам.']));
    } else if (a === 'hello') {
      post(nick, 'me', 'Привет! Слежу за твоей игрой — впечатляет.');
      post(nick, 'p', pick(k, ['Спасибо! 🙂', 'Приятно слышать, спасибо.', 'Спасибо, стараемся.']));
    }
    try { W.saveSeasonState?.(); } catch (e) {}
  }
  // --------------------------------------------------------------- игроки пишут сами (раз в игровую неделю)
  function weekly() {
    const s = S(), t = T(); if (!s || !t) return; const wk = Math.floor(nowMs() / (7 * DAY)); if (s.week === wk) return; s.week = wk;
    (t.players || []).forEach(p => {
      V.ensurePerson(p); const k = p.nick + wk;
      if ((+p.morale || 85) < 60 && h32(k) % 3 === 0) post(p.nick, 'p', pick(k, ['Тренер, можно поговорить? Чувствую, что теряю место в команде.', 'Мне не нравится, как идут дела. Хочу понять свою роль.', 'Не хватает доверия. Давай обсудим.']));
      const s0 = ST()?.currentSeason || 1; if ((+p.contractUntil || 99) <= s0 && h32(k + 'c') % 4 === 0) post(p.nick, 'p', 'Мой контракт заканчивается. Хотелось бы понимать планы клуба.');
      const last = (t.history || [])[0]; if (last && last.place === 1 && !s.cd['win|' + last.tournament + p.nick] && h32(k + 'w') % 2 === 0) { s.cd['win|' + last.tournament + p.nick] = 1; post(p.nick, 'p', pick(k, [`Мы сделали это! ${last.tournament} наш 🏆`, 'Какой турнир! Спасибо за доверие.', 'Это только начало 💪'])); }
    });
  }
  (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => { if (W.v57BatchCalendarSkip) return; try { weekly(); } catch (e) {} }, 6000);
  // --------------------------------------------------------------- страница
  H.S.dm = H.S.dm || { nick: null, q: '' };
  function page() {
    const t = T(); if (!me() || !t) return `<div class="hs-head"><h1>Переписка</h1></div>${H.box('Нет команды', '<p class="hs-note">Выберите организацию в разделе «Штаб организации», чтобы писать игрокам.</p>')}`;
    const s = S(), st = H.S.dm, mine = (t.players || []).map(p => p.nick);
    const others = Object.keys(s.th).filter(n => !mine.includes(n));
    const q = st.q.trim().toLowerCase(), found = q.length >= 2 ? H.TEAMS().filter(x => x.name !== t.name && !x.isAcademy).flatMap(x => (x.players || []).map(p => ({ p, t: x }))).filter(x => x.p.nick.toLowerCase().includes(q)).slice(0, 8) : [];
    const item = n => { const x = H.playerNow(n), last = (s.th[n] || []).slice(-1)[0], un = s.unread[n] || 0;
      return `<button type="button" class="v84-dm-it${st.nick === n ? ' on' : ''}" data-dmopen="${esc(n)}"><span class="ph">${H.photoHtml(x?.p || { nick: n })}</span><span class="tx"><b>${esc(n)}</b><small>${last ? esc(last.text).slice(0, 48) : esc(x?.t?.name || '')}</small></span>${un ? `<i>${un}</i>` : ''}</button>`; };
    let conv = '<div class="v84-dm-empty">Выберите игрока слева</div>';
    if (st.nick) {
      const x = H.playerNow(st.nick), isMine = mine.includes(st.nick), th = s.th[st.nick] || [];
      const acts = (isMine ? ACT_MINE : ACT_OTHER).map(([k, l]) => k === 'role' ? `<span class="v84-dm-role">${l}: ${[['IGL', 'капитан'], ['AWPer', 'снайпер'], ['Rifler', 'рифлер']].map(([r, rl]) => `<button type="button" class="hs-btn ghost sm" data-dmact="role|${r}" ${onCd(st.nick, 'role') ? 'disabled' : ''}>${rl}</button>`).join('')}</span>` : `<button type="button" class="hs-btn ghost sm" data-dmact="${k}" ${onCd(st.nick, k) ? 'disabled title="Недавно уже обсуждали"' : ''}>${l}</button>`).join('');
      conv = `<header class="v84-dm-h"><span class="ph">${H.photoHtml(x?.p || { nick: st.nick })}</span><div><b data-player="${esc(st.nick)}">${esc(st.nick)}</b><small>${esc(x?.p?.role || '')} · ${esc(x?.t?.name || 'без команды')}${isMine ? ` · мораль ${Math.round(+x?.p?.morale || 0)}` : ''}</small></div></header>
        <div class="v84-dm-log">${th.map(m => `<div class="v84-dm-msg ${m.from === 'me' ? 'me' : 'p'}${m.sys ? ' sys' : ''}"><p>${esc(m.text)}</p><small>${fmt(m.ts)}</small>${m.cta === 'negotiate' ? `<button type="button" class="hs-btn sm" data-ngstart="${esc(st.nick)}" data-ngjump>Начать переговоры</button>` : ''}</div>`).join('') || '<div class="v84-dm-empty">Сообщений пока нет</div>'}</div>
        <div class="v84-dm-acts">${acts}</div>`;
      if (s.unread[st.nick]) { s.unread[st.nick] = 0; }
    }
    return `<div class="hs-head"><h1>Переписка</h1><span class="hs-sub">Личные сообщения игрокам · ${esc(t.name)}</span></div>
      <div class="v84-dm"><aside class="v84-dm-side"><h4>Состав</h4>${mine.map(item).join('')}${others.length ? `<h4>Другие игроки</h4>${others.map(item).join('')}` : ''}
        <h4>Написать игроку</h4><input type="search" class="hs-inp" id="v84-dmq" placeholder="Ник игрока" value="${esc(st.q)}">${found.map(x => `<button type="button" class="v84-dm-it" data-dmopen="${esc(x.p.nick)}"><span class="tx"><b>${esc(x.p.nick)}</b><small>${esc(x.t.name)}</small></span></button>`).join('')}</aside>
        <section class="v84-dm-main">${conv}</section></div>`;
  }
  H.PAGES.dm = page;
  try { if (H.SECTION_OF) H.SECTION_OF.dm = 'game'; } catch (e) {}
  if (Array.isArray(H.NAV_GAME) && !H.NAV_GAME.some(x => x[0] === 'dm')) { const i = H.NAV_GAME.findIndex(x => x[0] === 'inbox'); H.NAV_GAME.splice(i < 0 ? 1 : i + 1, 0, ['dm', 'Переписка']); }
  const addMenu = () => { try { const m = document.querySelector('.pt-menu[data-menu="game"]'); if (!m || m.querySelector('[data-nav="dm"]')) return; const ib = m.querySelector('[data-nav="inbox"]'); const b = '<button type="button" data-nav="dm">Переписка</button>'; ib ? ib.insertAdjacentHTML('afterend', b) : m.insertAdjacentHTML('beforeend', b); } catch (e) {} };
  setTimeout(addMenu, 1700); (H.AFTER || []).push(addMenu);
  H.CLICKS.push(['[data-dmopen]', el => { H.S.dm.nick = el.dataset.dmopen; H.render(); setTimeout(() => { const l = document.querySelector('.v84-dm-log'); if (l) l.scrollTop = l.scrollHeight; }, 0); }]);
  H.CLICKS.push(['[data-dmact]', el => { const [a, arg] = el.dataset.dmact.split('|'); act(H.S.dm.nick, a, arg); H.render(); setTimeout(() => { const l = document.querySelector('.v84-dm-log'); if (l) l.scrollTop = l.scrollHeight; }, 0); }]);
  let qT = null;
  document.addEventListener('input', e => { if (e.target.id !== 'v84-dmq') return; clearTimeout(qT); const v = e.target.value; qT = setTimeout(() => { H.S.dm.q = v; H.render(); const i = document.getElementById('v84-dmq'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 250); });
  // «Написать» в профиле игрока
  (H.AFTER || []).push(pg => { try { if (pg !== 'player' || !me()) return; const head = document.querySelector('#hs-page .hs-pact'); if (!head || head.querySelector('[data-dmto]')) return; const nick = String(H.S.arg || '').split('/')[0]; head.insertAdjacentHTML('afterbegin', `<button type="button" class="hs-btn ghost" data-dmto="${esc(nick)}">✉ Написать</button>`); } catch (e) {} });
  H.CLICKS.push(['[data-dmto]', el => { H.S.dm.nick = el.dataset.dmto; H.nav('dm'); }]);
  W.CS2DM = { act, post, thread, weekly, state: S };
})();
