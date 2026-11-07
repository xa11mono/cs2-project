/* v35 — новости-обсуждения: споры, критика, слухи. Только вокруг игровых событий (результаты, рейтинг, форма) —
   без выдуманных обвинений реальным людям. Поводы проверяются после каждого завершённого турнира Tier-1:
   спор «кто игрок года» (с опросом), волна критики после провала команды из топ-5 (и иногда — ответ игрока),
   слухи о напряжении в команде после серии поражений, спор о №1, когда у лидеров почти равные очки. */
(function () {
'use strict';
const H = window.HS; if (!H) return;
const N = () => window.V29News;
const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const pk = (arr, seed) => arr[h32(seed) % arr.length];
const f2 = v => Number(v).toFixed(2);
const st = () => { const s = seasonState; s.v35Drama = s.v35Drama || { seen: [], once: {} }; return s.v35Drama; };
const once = k => { const D = st(); if (D.once[k]) return false; D.once[k] = 1; return true; };

function playerOfYear(season, evId) {
  const S = H.stats(), rows = Object.values(S.P).map(o => ({ o, l: o.bySeason[season] ? H.line(o.bySeason[season]) : null })).filter(x => x.l && x.l.maps >= 12).sort((a, b) => b.l.rating - a.l.rating);
  if (rows.length < 3 || !once('poty|' + season + '|' + Math.floor(rows[0].l.maps / 25))) return;
  const [a, b, c] = rows, gap = a.l.rating - b.l.rating, T = N().T, P = N().P;
  N().add({ cat: 'analytics', icon: '🗣', imp: 6, title: pk([`Спор недели: ${a.o.nick} или ${b.o.nick} — кто игрок года?`, `Гонка за №1 игроков: ${a.o.nick} против ${b.o.nick}`, `Сообщество раскололось: кто лучший игрок ${H.yearOf(season)}?`], evId + 'p'),
    lead: gap < 0.04 ? `Разница в рейтинге — ${f2(gap)}: ${a.o.nick} и ${b.o.nick} идут ноздря в ноздрю, а ${c.o.nick} дышит в спину.` : `${a.o.nick} лидирует с отрывом ${f2(gap)}, но фанаты ${b.o.nick} уверены, что главное ещё впереди.`,
    body: [`${a.o.nick} (${a.o.team}): Rating 3.0 ${f2(a.l.rating)}, ${a.l.maps} карт.`, `${b.o.nick} (${b.o.team}): ${f2(b.l.rating)}, ${b.l.maps} карт.`, `${c.o.nick} (${c.o.team}): ${f2(c.l.rating)}, ${c.l.maps} карт.`,
      pk(['Одни считают, что рейтинг решает всё, другие напоминают про трофеи и большие матчи.', 'В комментариях — горячо: «цифры не врут» против «покажите мне его в плей-офф».', 'Аналитики сходятся в одном: до конца сезона всё может перевернуться.'], evId + 'pb')],
    tags: [P(a.o.nick), P(b.o.nick), P(c.o.nick)], poll: { q: 'Кто станет игроком года?', opts: [a.o.nick, b.o.nick, c.o.nick], base: { [a.o.nick]: 40 + h32(evId) % 30, [b.o.nick]: 30 + h32(evId + 1) % 30, [c.o.nick]: 10 + h32(evId + 2) % 20 } } });
}
function backlash(snap) {
  const rank = {}; H.ranked().forEach((t, i) => { rank[t.name] = i + 1; });
  const res = snap.results || [], S = H.stats();
  res.filter(r => rank[r.n] && rank[r.n] <= 5 && r.p > 8).slice(0, 1).forEach(r => {
    if (!once('hate|' + snap.id + '|' + r.n)) return;
    const pl = Object.values(S.P).map(o => ({ o, e: o.byEv[snap.id] })).filter(x => x.e && x.e.team === r.n).map(x => ({ nick: x.o.nick, l: H.line(x.e.s) })).sort((a, b) => a.l.rating - b.l.rating);
    const w = pl[0], T = N().T, P = N().P;
    N().add({ cat: 'analytics', icon: '🔥', imp: 5, title: pk([`Волна критики: фанаты ${r.n} требуют перемен`, `${r.n} под огнём после провала на ${snap.name}`, `«Так дальше нельзя»: болельщики ${r.n} недовольны`], snap.id + r.n),
      lead: `${r.n} (#${rank[r.n]} в мире) закончили ${snap.name} лишь на ${r.p}-м месте${w ? `, а больше всего вопросов — к ${w.nick} (${f2(w.l.rating)})` : ''}.`,
      body: [pk(['В соцсетях обсуждают, не пора ли менять роли в команде.', 'Часть фанатов требует замены, другие призывают не паниковать после одного турнира.', 'Эксперты спорят: кризис формы или просто неудачный турнир?'], snap.id + 'b1'),
        w ? `${w.nick}: ${w.l.k}–${w.l.d}, ADR ${w.l.adr.toFixed(1)} за турнир.` : ''].filter(Boolean), tags: [T(r.n)].concat(w ? [P(w.nick)] : []), team: r.n });
    if (w && h32(snap.id + w.nick) % 2 === 0 && once('reply|' + snap.id + '|' + w.nick))
      N().add({ cat: 'player', icon: '💬', imp: 4, title: pk([`${w.nick} ответил критикам`, `${w.nick}: «Я знаю, что могу лучше»`, `${w.nick} о провале: «Слышу всё, что пишут»`], snap.id + w.nick),
        lead: pk([`Игрок ${r.n} признал, что турнир не получился, и пообещал вернуться сильнее.`, `«Критика — часть работы. Мы разберём ошибки и поедем на следующий турнир злее», — сказал ${w.nick}.`, `${w.nick} попросил фанатов поддержать команду: «Один турнир ничего не решает».`], snap.id + 'rl'), body: [], tags: [P(w.nick), T(r.n)], player: w.nick });
  });
}
function tension() {
  const S = H.stats(); H.ranked().slice(0, 20).forEach((t, i) => {
    const f = S.T[t.name]?.form || []; if (f.slice(0, 4).join('') !== 'LLLL') return;
    // v86: слух о напряжении — только если клуб действительно что-то планирует (оценка состава, поиск игрока, переговоры)
    const plan = window.CS2TeamPlan ? window.CS2TeamPlan(t.name) : null; if (!plan || window.CS2RumorTruth?.hasOpen(t.name)) return;
    if (!once('tension|' + t.name + '|' + seasonState.currentSeason + '|' + Math.floor((S.T[t.name].matches || 0) / 12))) return;
    N().add({ cat: 'rumor', rumor: true, teamRumor: true, team: t.name, planKind: plan.kind, icon: '🕵️', imp: 4, title: pk([`Слухи: в ${t.name} растёт напряжение`, `Источники: в ${t.name} спорят о ролях`, `${t.name} на грани перестройки?`], t.name + seasonState.currentSeason),
      lead: (window.CS2Phrases ? window.CS2Phrases.line('rumor', { team: t.name }, t.name + '|' + (seasonState?.calendar?.currentMs || '')) : `По данным источников, внутри ${t.name} обсуждают перестановки.`),
      body: ['Официально клуб ситуацию не комментирует.', pk(['Тренерский штаб, как говорят, готовит изменения в тактике, а не в составе.', 'Ближайший турнир покажет, были ли это рабочие споры или начало перестройки.'], t.name)], tags: [N().T(t.name)], team: t.name });
  });
}
function number1() {
  const r = H.ranked().filter(t => !t.isAcademy); if (r.length < 2) return;
  const a = r[0], b = r[1], gap = (a.pts || 0) - (b.pts || 0); if (gap > 25) return;
  if (!once('no1|' + a.name + '|' + b.name + '|' + Math.floor((a.pts || 0) / 40))) return;
  N().add({ cat: 'ranking', icon: '⚖️', imp: 5, title: pk([`Кто на самом деле №1: ${a.name} или ${b.name}?`, `${gap} очков между лидерами: спор о первой строчке`], a.name + b.name + a.pts),
    lead: `${a.name} формально впереди (${a.pts}), но ${b.name} отстают всего на ${gap} — и их фанаты уверены, что рейтинг врёт.`, body: ['Следующий большой турнир может поменять лидера.'], tags: [N().T(a.name), N().T(b.name)] });
}
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => {
  try {
    if (!N()?.add || typeof seasonState === 'undefined') return;
    // v84: архив проверяется только при изменении его ревизии, а не каждые 4 секунды.
    const rev = typeof window.hubArchiveRevision === 'function' ? Number(window.hubArchiveRevision()) : null;
    if (rev !== null && rev === lastDramaRev) return;
    lastDramaRev = rev;
    const D = st();
    const done = Object.values(H.archive()).filter(s => s && ['major', 'elite', 'regular'].includes(s.prestige) && s.season === seasonState.currentSeason);
    if (!D.init) { D.init = 1; done.forEach(s => D.seen.push(s.id)); return; } // в идущем сейве — не выпускаем всё прошлое разом
    done.filter(s => !D.seen.includes(s.id)).forEach(s => { D.seen.push(s.id); backlash(s); playerOfYear(s.season, s.id); number1(); tension(); });
    if (D.seen.length > 200) D.seen = D.seen.slice(-200);
  } catch (e) { console.warn('[v35] drama', e); }
}, 4000);
let lastDramaRev = null;
console.info('[v35] новости-обсуждения');
})();
