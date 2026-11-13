/* v90 — Этап 0 · передача управления: наблюдатель ↔ менеджер.

   Мир живёт независимо от режима пользователя. Режим — это только то, какой клуб (если есть) ведёт менеджер:
     • наблюдатель — ни одного клуба: всеми организациями управляет ИИ;
     • менеджер — один клуб; остальными управляет тот же ИИ, что и раньше.
   Переключение в любой момент не пересоздаёт мир и не меняет прошлых событий.

   Передача клуба — отдельная операция (CS2Control.take / release; любой вызов V31.setManaged идёт через неё):
     • взял клуб — переговоры ИИ этого клуба о покупке отменяются (решения теперь за менеджером);
     • вернул ИИ (сам, при увольнении или переходе в другой клуб) — ИИ продолжает с того же состава: control.aiGraceDays
       дней без плановых перестроек, тренировки снова планирует тренер; контракты менеджера остаются в силе;
     • история управления хранится отдельно от истории мира (seasonState.v90Control.history) и в журнале (CONTROL).

   Делегирование — три уровня по каждому направлению: «сам» (manual), «советы ИИ» (advise: ИИ предлагает, решает
   менеджер), «ИИ» (auto). Совместимо со старыми флагами V31 (auto = true только на уровне «ИИ»). */
(function () {
  'use strict';
  const W = window, V = W.V31;
  if (!V || typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const DAY = 864e5;
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const byName = n => (typeof teams !== 'undefined' ? teams : []).find(t => t && t.name === n) || null;
  const DIRS = [['training', 'Тренировки'], ['scouting', 'Разведка и подготовка'], ['market', 'Трансферы'], ['finance', 'Финансы и объекты'], ['events', 'События']];
  const LEVELS = [['manual', 'Сам'], ['advise', 'Советы ИИ'], ['auto', 'ИИ']];
  const S = () => { const s = seasonState.v90Control = seasonState.v90Control || {}; s.history = s.history || []; s.levels = s.levels || {}; s.advice = s.advice || {}; return s; };
  const journal = (type, e) => { try { W.CS2Journal && W.CS2Journal.log(type, e); } catch (x) {} };
  const save = () => { try { saveSeasonState(); saveTransferState(); saveTeams(); } catch (e) {} };

  function onTake(name) {
    const s = S(), t = byName(name);
    s.history.push({ team: name, from: now(), s: season(), to: null });
    if (t) t.v90AiGraceUntil = 0;
    // переговоры ИИ этого клуба о покупке — отменяются: решения по составу теперь у менеджера
    const ng = transferState.v30Nego || []; const drop = ng.filter(x => x.to === name);
    if (drop.length) transferState.v30Nego = ng.filter(x => x.to !== name);
    journal('CONTROL', { team: name, action: 'take', cancelledNego: drop.map(x => x.player), levels: Object.fromEntries(DIRS.map(([k]) => [k, level(k)])) });
  }
  function onRelease(name, why) {
    const s = S(), t = byName(name), h = s.history.slice().reverse().find(x => x.team === name && !x.to);
    if (h) { h.to = now(); h.why = why || 'вернул управление ИИ'; }
    const grace = C('control.aiGraceDays', 60) * DAY;
    if (t) t.v90AiGraceUntil = now() + grace;
    try { const o = V.org(name); if (o && o.train) o.train.auto = true; } catch (e) {}   // тренировки снова планирует тренер
    s.advice = {};
    journal('CONTROL', { team: name, action: 'release', reason: why || 'вернул управление ИИ', aiGraceUntil: now() + grace });
  }
  // любое изменение управляемого клуба (выбор в карьере, приглашение другого клуба, увольнение) — через передачу
  (function () {
    const f = V.setManaged; if (typeof f !== 'function' || f.__v90) return;
    const w = function (n) {
      const prev = V.managed(); n = n || '';
      if (prev === n) return f.apply(this, arguments);
      if (prev) onRelease(prev, W.__v90ReleaseWhy || (n ? `переход в ${n}` : 'вернул управление ИИ'));
      const r = f.apply(this, arguments);
      if (n) onTake(n);
      save();
      return r;
    };
    w.__v90 = true; V.setManaged = w;
  })();

  function level(k) {
    if (!V.managed()) return 'auto';
    const s = S(); if (s.levels[k]) return s.levels[k];
    return V.S().auto && V.S().auto[k] ? 'auto' : 'manual';
  }
  function setLevel(k, l) {
    if (!LEVELS.some(x => x[0] === l)) return;
    S().levels[k] = l; V.setAuto(k, l === 'auto');
    if (l === 'advise') refreshAdvice(k);
    save();
  }
  // советы ИИ: тот же расчёт, что ИИ сделал бы сам, — но решение за менеджером
  function recommend(k) {
    const t = byName(V.managed()); if (!t) return null;
    if (k === 'training') { try { return { kind: 'training', plan: V.aiTrainingPlan(t) }; } catch (e) { return null; } }
    if (k === 'market') {
      const D = W.v30MarketDebug; if (!D) return null;
      const w = D.weakLink(t); if (!w) return { kind: 'market', need: null, candidates: [], note: 'явного слабого звена нет — менять состав не нужно' };
      let list = []; try { list = D.candidates(t, w); } catch (e) {}
      return { kind: 'market', need: { out: w.p.nick, role: w.p.role, gap: Math.round(w.gap * 10) / 10 },
        candidates: list.slice(0, 5).map(c => ({ src: c.src, nick: c.p.nick, role: c.p.role, from: c.from ? c.from.name : c.ac ? c.ac.name : c.a ? c.a.name : 'свободный агент', gain: Math.round(c.gain * 10) / 10 })) };
    }
    return null;
  }
  function refreshAdvice(k) { const r = recommend(k); if (r) { r.at = now(); S().advice[k] = r; } return r; }
  // раз в игровую неделю — свежие советы по направлениям на уровне «Советы ИИ»
  let lastWk = -1;
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => {
    try { if (!V.managed()) return; const wk = Math.floor(now() / (7 * DAY)); if (wk === lastWk) return; lastWk = wk;
      DIRS.forEach(([k]) => { if (level(k) === 'advise') refreshAdvice(k); }); } catch (e) {}
  }, 5000, 'v90-advice');

  W.CS2Control = {
    mode: () => (V.managed() ? 'manager' : 'observer'),
    team: () => V.managed(),
    take(name) { if (!byName(name)) return false; V.setManaged(name); try { V.careerLog && V.careerLog(`Управление клубом ${name}`); } catch (e) {} return true; },
    release(why) { const n = V.managed(); if (!n) return false; W.__v90ReleaseWhy = why || 'вернул управление ИИ'; try { V.setManaged(''); } finally { W.__v90ReleaseWhy = null; } return true; },
    level, setLevel, recommend, refreshAdvice, history: () => S().history.slice(), DIRS, LEVELS,
    applyTrainingAdvice() { const a = S().advice.training, t = byName(V.managed()); if (!a || !t) return false; const o = V.org(t.name); o.train = Object.assign({}, a.plan, { auto: false }); save(); return true; }
  };

  /* ------------------------------------------------------------ страницы */
  const H = W.HS; if (!H) return;
  const esc = H.esc, box = H.box, logo = H.logo;
  const fdate = ms => { try { return H.fdate(ms); } catch (e) { return new Date(ms).toLocaleDateString('ru-RU'); } };
  if (Array.isArray(H.NAV_GAME) && !H.NAV_GAME.some(x => x[0] === 'control')) { H.NAV_GAME.splice(1, 0, ['control', 'Режим игры'], ['decisions', 'Решения клубов']); }
  const FOCUS_L = () => { const T = V.TRAIN || {}; return k => (T[k] && T[k].l) || k; };
  H.PAGES.control = function () {
    const me = V.managed(), t = byName(me), s = S();
    const head = `<div class="hs-head"><h1>Режим игры</h1><div class="hs-filters"><span class="hs-sub">${me ? 'Менеджер' : 'Наблюдатель'}</span></div></div>`;
    const modeBox = me
      ? box('Вы — менеджер', `<p class="hs-note">${logo(me, 'sm')} <b>${esc(me)}</b>. Остальными организациями управляет ИИ. Вернуть клуб ИИ можно в любой момент: состав и контракты останутся, ${C('control.aiGraceDays', 60)} дней ИИ не будет перестраивать команду.</p>
          <button type="button" class="hs-btn" data-v90release>Стать наблюдателем</button>`)
      : box('Вы — наблюдатель', `<p class="hs-note">Всеми организациями управляет ИИ. Возьмите любой клуб в его текущем состоянии — мир не пересоздаётся.</p>`);
    // v96: выбор клуба — на отдельном экране (список клубов + досье), здесь только вход в него
    const takeBox = box(me ? 'Перейти в другой клуб' : 'Стать менеджером организации', `<p class="hs-note">${me ? 'Текущий клуб перейдёт под управление ИИ, состав и контракты сохранятся.' : 'Состав, бюджет, цели руководства, сильные стороны и риски каждого клуба — на одном экране.'}</p><button type="button" class="hs-btn" data-nav="pick">Выбрать организацию →</button>`);
    let levels = '', advice = '';
    if (me) {
      levels = box('Делегирование', `<table class="hs-tbl"><tbody>${DIRS.map(([k, l]) => `<tr><td class="l"><b>${l}</b></td><td class="l"><div class="hm-tabs">${LEVELS.map(([lv, ll]) => `<button type="button" class="hm-tab${level(k) === lv ? ' on' : ''}" data-v90lvl="${k}|${lv}">${ll}</button>`).join('')}</div></td></tr>`).join('')}</tbody></table>
        <p class="hs-note">«Сам» — решаете вы. «Советы ИИ» — штаб раз в неделю предлагает решение, применяете вы. «ИИ» — решает штаб.</p>`);
      const a = s.advice, rows = [];
      if (a.training) { const p = a.training.plan; rows.push(`<p><b>Тренировки:</b> ${esc(FOCUS_L()(p.focus))}${p.mapWork ? ' — ' + esc(p.map) : ''}, интенсивность ${esc(p.intensity)} <button type="button" class="hs-btn sm" data-v90applytrain>Применить</button></p>`); }
      if (a.market) { const m = a.market; rows.push(m.need ? `<p><b>Трансферы:</b> слабое звено — ${esc(m.need.out)} (${esc(m.need.role)}, отставание ${m.need.gap}).</p><table class="hs-tbl"><thead><tr><th class="l">Кандидат</th><th class="l">Откуда</th><th>Усиление</th></tr></thead><tbody>${m.candidates.map(c => `<tr><td class="l" data-player="${esc(c.nick)}"><b>${esc(c.nick)}</b> <small>${esc(c.role || '')}</small></td><td class="l">${esc(c.from)}</td><td>+${c.gain}</td></tr>`).join('') || '<tr><td colspan="3">подходящих кандидатов нет</td></tr>'}</tbody></table>` : `<p><b>Трансферы:</b> ${esc(m.note || '')}</p>`); }
      if (rows.length) advice = box('Советы штаба', rows.join(''));
    }
    const hist = s.history.slice().reverse().slice(0, 20).map(h => `<tr><td class="l">${logo(h.team, 'sm')} ${esc(h.team)}</td><td>${fdate(h.from)}</td><td>${h.to ? fdate(h.to) : 'сейчас'}</td><td class="l">${esc(h.why || '')}</td></tr>`).join('');
    const histBox = hist ? box('Ваша история управления', `<table class="hs-tbl"><thead><tr><th class="l">Клуб</th><th>С</th><th>По</th><th class="l">Итог</th></tr></thead><tbody>${hist}</tbody></table>`) : '';
    return head + `<div class="hs-grid2"><div class="hs-col">${modeBox}${levels}${advice}${histBox}</div><div class="hs-col">${takeBox}</div></div>`;
  };
  H.PAGES.decisions = function () {
    const f = H.S.v90j = H.S.v90j || { team: '', type: 'MARKET_DECISION' };
    const all = W.CS2Journal ? W.CS2Journal.list({ type: f.type || null, team: f.team || null, blocks: f.type === 'ROSTER_BLOCK' }) : [];
    const types = [['MARKET_DECISION', 'Решения рынка'], ['ROSTER_CHANGE', 'Изменения составов'], ['ROSTER_BLOCK', 'Отклонённые сделки'], ['CONTROL', 'Передача управления'], ['REPAIR', 'Исправления']];
    const tabs = types.map(([k, l]) => `<button type="button" class="hm-tab${f.type === k ? ' on' : ''}" data-v90jt="${k}">${l}</button>`).join('');
    const row = e => {
      if (e.type === 'MARKET_DECISION') {
        const c = (e.candidates || []).map(x => `${esc(x.nick)} <small>(${esc(x.src)}, +${x.gain}${x.bonus ? `, стратегия ${x.bonus > 0 ? '+' : ''}${x.bonus}` : ''}; ${esc(x.verdict)})</small>`).join('<br>');
        const out = e.outcome ? `${e.outcome.delta > 0 ? '▲' : e.outcome.delta < 0 ? '▼' : '='}${Math.abs(e.outcome.delta || 0)} мест${e.outcome.starter ? '' : ', новичок не в основе'}` : '—';
        return `<tr><td class="l">${fdate(e.ts)}</td><td class="l"><b>${esc(e.team)}</b><br><small>#${e.rankAt} · давление ${e.pressure}${e.strategy ? '<br>' + esc(e.strategy.label) : ''}</small></td><td class="l">${esc(e.need ? `${e.need.out} (${e.need.role}), отставание ${e.need.gap}` : '')}<br><small>${esc(e.reason || '')}</small></td><td class="l">${c || '—'}</td><td class="l">${esc(e.result || '')}</td><td>${out}</td></tr>`;
      }
      if (e.type === 'ROSTER_CHANGE' || e.type === 'ROSTER_BLOCK') return `<tr><td class="l">${fdate(e.ts)}</td><td class="l"><b>${esc(e.team || '')}</b></td><td class="l">${esc(e.kind)} · ${esc(e.actor || '')}</td><td class="l">${esc(e.player || '')}${e.out ? ' вместо ' + esc(e.out) : ''}${e.gain != null ? ` <small>(+${e.gain} / нужно ${e.need})</small>` : ''}</td><td class="l">${esc((e.blocks || e.warnings || []).map(b => b.text).join('; ') || e.reason || '')}</td><td></td></tr>`;
      return `<tr><td class="l">${fdate(e.ts)}</td><td class="l"><b>${esc(e.team || '')}</b></td><td class="l">${esc(e.action || e.type)}</td><td class="l" colspan="3">${esc(e.reason || (e.fixes || []).join('; '))}</td></tr>`;
    };
    const teamsList = [...new Set(all.map(e => e.team).filter(Boolean))].sort();
    return `<div class="hs-head"><h1>Решения клубов</h1><div class="hs-filters"><div class="hm-tabs">${tabs}</div>
      <select class="hs-inp sm" data-v90jteam><option value="">Все клубы</option>${teamsList.map(n => `<option${n === f.team ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
      ${box('Журнал', all.length ? `<div class="pt-scroll x"><table class="hs-tbl"><thead><tr><th class="l">Дата</th><th class="l">Клуб</th><th class="l">Потребность / тип</th><th class="l">Кандидаты / игрок</th><th class="l">Итог</th><th>Через ${C('journal.followupDays', 56)} дн.</th></tr></thead><tbody>${all.slice(0, 120).map(row).join('')}</tbody></table></div>` : '<p class="hs-note">Записей пока нет.</p>', '', 'flush')}`;
  };
  H.CLICKS.push(['[data-v90take]', el => { const n = el.dataset.v90take; if (V.managed() && !confirm(`Передать ${V.managed()} ИИ и перейти в ${n}?`)) return; W.CS2Control.take(n); H.render(); }]);
  H.CLICKS.push(['[data-v90release]', () => { W.CS2Control.release('вернул управление ИИ'); H.render(); }]);
  H.CLICKS.push(['[data-v90lvl]', el => { const [k, l] = el.dataset.v90lvl.split('|'); W.CS2Control.setLevel(k, l); H.render(); }]);
  H.CLICKS.push(['[data-v90applytrain]', () => { W.CS2Control.applyTrainingAdvice(); H.render(); }]);
  H.CLICKS.push(['[data-v90jt]', el => { H.S.v90j = Object.assign(H.S.v90j || {}, { type: el.dataset.v90jt }); H.render(); }]);
  document.addEventListener('change', e => { if (e.target.matches && e.target.matches('#hs-root [data-v90jteam]')) { H.S.v90j = Object.assign(H.S.v90j || {}, { team: e.target.value }); H.render(); } });
  console.info('[v90] режимы «наблюдатель / менеджер» и передача клуба ИИ');
})();
