(() => {
'use strict';
/* =====================================================================
   v30 · Игровая часть портала (бывшая оболочка v27)
   Портал HLTV (v27-hltv-site.js) — основной интерфейс. Здесь:
   • страница «Симулятор» (#/sim): старое приложение (.app-layout) целиком, без дублей —
     рейтинг, зал славы, архив, сейвы и добавление команды убраны из постоянного показа;
   • «Управление турнирами» (#/manage): тот же экран с открытой панелью создания турнира;
   • «Сезон и карьера» (#/season), «Настройки и сохранения» (#/settings);
   • старые окна (профиль команды, окно турнира, карточка игрока, календарь, модалка
     параллельного турнира, выдвижные настройки) перенаправлены на страницы портала.
   ===================================================================== */
const $ = id => document.getElementById(id);
const HS = window.HS; if (!HS) { console.warn('[v30 ui] портал не загружен'); return; }
const { esc, box, empty, logo, trophy, KIND } = HS;

function moveCss() { // слой портала — последним в <head>, сильнее стилей, которые старые модули добавляют на лету
  ['v27-ui.css', 'v30-portal.css'].forEach(f => { const l = document.querySelector(`link[href*="${f}"]`); if (l) document.head.appendChild(l); });
}

/* ---------- 1. Старое приложение → страница «Симулятор» ---------- */
let hosted = false;
function hostGame() {
  if (hosted) return; const app = document.querySelector('.app-layout'), host = $('pt-game'); if (!app || !host) return;
  hosted = true; document.body.classList.add('ui27', 'ui30');
  host.appendChild(app);
  const side = app.querySelector('.sidebar'), cal = $('game-calendar-panel');
  // слева: время, турниры сейчас, эфир. Остальное из сайдбара живёт на страницах портала
  const sw = $('v21-tournament-switcher'), bc = $('broadcast-panel');
  if (side && cal) { if (sw) cal.after(sw); if (bc) (sw || cal).after(bc); }
  ['.rating-panel', '.legacy-save-panel', '.analytics-bar'].forEach(s => document.querySelectorAll(s).forEach(n => n.classList.add('pt-retired')));
  const hofPanel = $('hall-of-fame')?.closest('.panel'); if (hofPanel) hofPanel.classList.add('pt-retired');
  const addRow = $('new-team-name')?.closest('.row'); if (addRow) { addRow.id = 'pt-addteam-row'; $('pt-stash').appendChild(addRow); }
  $('hltv-hub-backdrop')?.classList.add('pt-retired');
}
function simHead(manage) {
  const ct = typeof currentTournament !== 'undefined' ? currentTournament : null, active = ct && !ct.completed;
  const st = (typeof seasonState !== 'undefined' && seasonState) || {}, nx = (st.seasonSchedule || [])[st.tournamentIndex];
  const kind = ct ? (ct.isMajor ? 'major' : ct.isElite ? 'elite' : 'regular') : (nx?.type === 'major' ? 'major' : nx?.type === 'elite' ? 'elite' : 'regular');
  const title = active ? ct.name : (nx?.name || 'Межсезонье');
  return `<div class="pt-simhead"><span class="pt-simhead-tr">${trophy(title, active ? ct.season : st.currentSeason, kind)}</span>
    <div class="pt-simhead-t"><small>${active ? '<span class="hs-live">LIVE</span> Идёт турнир' : 'Следующий турнир'} · <span class="hs-kind k-${kind}">${KIND[kind]}</span></small><h1>${esc(title)}</h1></div>
    <div class="pt-simhead-a">${active ? `<button type="button" class="hs-btn ghost" data-event="cur">Страница турнира</button>` : ''}
      <button type="button" class="hs-btn ghost" data-nav="calendar">Календарь</button>
      ${manage ? '' : '<button type="button" class="hs-btn ghost" data-nav="manage">Создать турнир вручную</button>'}</div></div>`;
}
HS.PAGES.sim = () => { hostGame(); return simHead(false); };
HS.PAGES.manage = () => { hostGame(); return simHead(true); };
HS.AFTER.push(page => {
  hostGame();
  const on = page === 'sim' || page === 'manage', host = $('pt-game'); if (!host) return;
  host.hidden = !on;
  if (page === 'manage') { const c = document.querySelector('.controls'); if (c && !c.classList.contains('v22-create-open') && typeof window.v22ToggleCreate === 'function') window.v22ToggleCreate(); }
  if (on) { try { if (typeof renderTournament === 'function') renderTournament(); } catch (e) {} }
});

/* ---------- 2. Сезон и карьера ---------- */
HS.PAGES.season = () => {
  const st = (typeof seasonState !== 'undefined' && seasonState) || {}, idx = Number(st.tournamentIndex) || 1;
  const ct = typeof currentTournament !== 'undefined' ? currentTournament : null, act = ct && !ct.completed;
  const arch = HS.archive(), byName = {}; Object.values(arch).forEach(s => { if (s && s.season === st.currentSeason) byName[s.name] = s; });
  const rows = (st.seasonSchedule || []).map((e, i) => {
    if (!e || i === 0) return '';
    const kind = e.type === 'major' ? 'major' : e.type === 'elite' ? 'elite' : 'regular', done = i < idx, live = i === idx && act, snap = byName[e.name];
    const d = e.calendar?.startMs ? HS.fdate(e.calendar.startMs) : '—';
    return `<tr class="${live ? 'live' : done ? 'done' : ''}" ${snap ? `data-event="${esc(snap.id)}"` : live ? 'data-event="cur"' : `data-event="T1:${st.currentSeason}:${i}"`}>
      <td class="n">${i}</td><td class="l">${d}</td><td class="l"><span class="hs-ev-tr sm">${trophy(e.name, st.currentSeason, kind)}</span><b>${esc(e.name)}</b></td><td class="l"><span class="hs-kind k-${kind}">${KIND[kind]}</span></td>
      <td class="l">${esc(({ single: 'Single Elim', double: 'Double Elim', swiss: 'Swiss', gsl: 'GSL', bounty: 'Bounty' })[e.format] || e.format || '')}</td>
      <td class="l">${live ? '<span class="hs-live">LIVE</span>' : snap ? `${logo(snap.champion, 'sm')} ${esc(snap.champion)}` : done ? '—' : '<span class="hs-dim">впереди</span>'}</td></tr>`;
  }).join('');
  const dash = id => esc(($(id)?.textContent || '—').trim());
  const hof = (st.hallOfFame || []).slice().sort((a, b) => b.season - a.season).map(h => `<tr data-team="${esc(h.champion)}"><td class="l">Сезон ${h.season} · ${h.year || HS.yearOf(h.season)}</td><td class="l">${logo(h.champion, 'sm')} <b>${esc(h.champion)}</b></td><td>${h.scorePts ?? ''}</td></tr>`).join('');
  const two = st.v29TwoMajors?.[st.currentSeason];
  return `<div class="hs-head"><h1>Сезон ${st.currentSeason || 1} · ${HS.yearOf(st.currentSeason)}</h1><div class="hs-filters"><span class="hs-sub">Турнир ${Math.min(idx, (st.seasonSchedule || []).length - 1)} из ${(st.seasonSchedule || []).length - 1}${two ? ' · в этом сезоне два Major' : ''}</span></div></div>
    <div class="pt-kpis"><div><small>Доминант сезона</small><b>${dash('dash-dominant')}</b></div><div><small>Эпохи</small><b>${dash('dash-era')}</b></div><div><small>Карта меты</small><b>${dash('dash-map')}</b></div><div><small>Апсеты сезона</small><b>${dash('dash-money')}</b></div><div><small>Pick'Em</small><b>${esc(($('pickem-trophy-display')?.textContent || '—').trim())}</b></div></div>
    <div class="hs-grid2"><div class="hs-col">${box('Расписание Tier-1', `<table class="hs-tbl hs-stbl click"><thead><tr><th>#</th><th class="l">Старт</th><th class="l">Турнир</th><th class="l">Уровень</th><th class="l">Формат</th><th class="l">Победитель</th></tr></thead><tbody>${rows}</tbody></table>`, '<button type="button" class="hs-more" data-nav="calendar">весь календарь →</button>', 'flush')}</div>
    <div class="hs-col">${box('Чемпионы сезонов', hof ? `<table class="hs-tbl hs-stbl click"><tbody>${hof}</tbody></table>` : empty('Первый сезон ещё не завершён'), '', 'flush')}
      ${box('Игра', `<div class="pt-actions"><button type="button" class="hs-btn" data-nav="watch">Режим зрителя</button><button type="button" class="hs-btn ghost" data-nav="predict">Мои прогнозы</button><button type="button" class="hs-btn ghost" data-nav="settings">Сохранения</button></div>`)}</div></div>`;
};

/* ---------- 3. Настройки и сохранения ---------- */
HS.PAGES.settings = () => {
  const used = typeof window.v29StorageUsage === 'function' ? window.v29StorageUsage() : 0;
  const teamsRows = HS.ranked().map((t, i) => `<tr><td class="n">${i + 1}</td><td class="l"><button type="button" data-team="${esc(t.name)}">${logo(t.name, 'sm')} ${esc(t.name)}</button>${t.isAcademy ? ' <span class="hs-kind k-academy">Академия</span>' : ''}</td><td>${Math.round(t.pts || 0)}</td>
    <td class="r"><button type="button" class="hs-btn sm ghost" data-set="pts" data-name="${esc(t.name)}">Очки</button> <button type="button" class="hs-btn sm quiet danger" data-set="del" data-name="${esc(t.name)}">Удалить</button></td></tr>`).join('');
  return `<div class="hs-head"><h1>Настройки и сохранения</h1></div>
    <div class="hs-grid2"><div class="hs-col">
      ${box('Сейв и автосохранение', `<div class="pt-actions"><button type="button" class="hs-btn" data-set="export">Экспорт в файл</button>
        <label class="hs-btn ghost pt-file">Загрузить сейв<input type="file" accept=".json,application/json" data-set="import" hidden></label></div>
        <div class="v59-portal-actions"><button type="button" class="hs-btn ghost" onclick="v56ChooseAutosaveFolder()"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Выбрать папку для автосейва</button><button type="button" class="hs-btn ghost" onclick="v56EnableAutosave()">Разрешить доступ</button><button type="button" class="hs-btn ghost" onclick="v56AutosaveNow()">Сохранить сейчас</button><button type="button" class="hs-btn ghost" onclick="v56RestoreAutosave()">Загрузить автосейв</button></div>
        <div id="v56-autosave-status" class="v59-portal-status" role="status">Автосейв не подключён — выберите папку</div>
        <p class="hs-note">Полная автокопия сохраняется внутри браузера. В Chrome/Edge можно дополнительно выбрать папку для записи CS2Manager-Autosave.json и резервной копии; в других браузерах используйте «Экспорт в файл» для отдельной копии. Хранилище браузера занято: ~${(used / 1e6).toFixed(2)} млн символов из ~5.</p>`)}
      ${box('Импорт баз составов и турниров', `<div class="v59-portal-import-grid"><div><b>База команд / составов</b><p class="hs-note">Можно выделить сразу несколько JSON/JS-файлов: составы, игроки, тренеры, страны и рейтинги.</p><button type="button" class="hs-btn ghost" onclick="document.getElementById('v59-roster-file-page').click()"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Импортировать составы</button><input id="v59-roster-file-page" type="file" accept=".json,.js,application/json,text/javascript" multiple hidden onchange="v59ImportRosters(this.files);this.value=''"></div>
          <div><b>База турниров</b><p class="hs-note">Можно выделить несколько JSON/JS-файлов: Major, S-Tier, Tier-1/2/3, академии и метаданные.</p><button type="button" class="hs-btn ghost" onclick="document.getElementById('v59-tournament-file-page').click()"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Импортировать турниры</button><input id="v59-tournament-file-page" type="file" accept=".json,.js,application/json,text/javascript" multiple hidden onchange="v59ImportTournaments(this.files);this.value=''"></div></div>
          <label class="v59-page-check"><input id="v59-apply-rosters-page" type="checkbox"> Обновить текущие пятёрки существующих команд</label><label class="v59-page-check"><input id="v59-add-teams-page" type="checkbox" checked> Добавлять новые команды</label>
          <div class="v59-portal-actions"><button type="button" class="hs-btn quiet" onclick="v59DownloadTemplate('rosters')">Шаблон составов</button><button type="button" class="hs-btn quiet" onclick="v59DownloadTemplate('tournaments')">Шаблон турниров</button></div>
          <div id="v59-import-status-page" class="v59-portal-status" role="status">Можно выбрать готовые JS/JSON-базы из папки проекта или свой файл.</div>
          <p class="hs-note">Можно выбрать несколько файлов за один раз. Без первой галочки действующие составы не перезаписываются. Импортированные турниры добавляются в пул будущих сезонов; текущую карьеру он не перестраивает.</p>`)}
      ${box('База команд', `<div id="pt-addteam-host" class="pt-addteam"></div><div class="pt-scroll"><table class="hs-tbl hs-stbl"><thead><tr><th>#</th><th class="l">Команда</th><th>Очки</th><th></th></tr></thead><tbody>${teamsRows}</tbody></table></div>`, '', 'flush')}
    </div><div class="hs-col">
      ${box('Очистка', `<div class="pt-actions col"><button type="button" class="hs-btn ghost" data-set="clean">Очистить пустые записи истории</button>
        <button type="button" class="hs-btn ghost warn" data-set="clear">Очистить историю турниров</button>
        <button type="button" class="hs-btn ghost danger" data-set="reset">Сбросить всё к исходному</button></div>
        <p class="hs-note">Очистка истории удаляет архив сеток, титулы и награды игроков. Сброс возвращает исходные команды и начинает с первого сезона. Оба действия спрашивают подтверждение.</p>`)}
    </div></div>`;
};
HS.AFTER.push(page => { if (page !== 'settings') return; const row = $('pt-addteam-row'), host = $('pt-addteam-host'); if (row && host) { row.setAttribute('data-mounted', ''); host.appendChild(row); } });
HS.CLICKS.push(['[data-set]', el => {
  const k = el.dataset.set, n = el.dataset.name;
  if (k === 'import') return;     // обрабатывает change
  if (k === 'export' && typeof exportData === 'function') exportData();
  if (k === 'clean' && typeof cleanZeroHistory === 'function') cleanZeroHistory();
  if (k === 'clear' && typeof clearHistoryOnly === 'function') clearHistoryOnly();
  if (k === 'reset' && typeof resetToDefault === 'function') resetToDefault();
  if (k === 'pts' && typeof editPts === 'function') { editPts(n); try { saveTeams(); } catch (e) {} }
  if (k === 'del' && typeof deleteTeam === 'function') { deleteTeam(n); try { saveTeams(); } catch (e) {} }
  HS.invalidate(); HS.render();
}]);
document.addEventListener('change', e => { if (e.target.matches?.('[data-set="import"]') && typeof importData === 'function') { importData(e); setTimeout(() => { HS.invalidate(); HS.render(); }, 600); } });
// добавление команды: старый addTeam, затем перерисовать страницу
HS.CLICKS.push(['#pt-addteam-row button', () => { try { addTeam(); saveTeams(); } catch (e) { console.warn(e); } HS.render(); }]);

/* ---------- 4. Старые окна → страницы портала ---------- */
function redirect(name, fn) { window[name] = fn; }
function legacy() {
  redirect('showHistory', team => { if (team) HS.nav('team', team); });
  redirect('hubOpenTournament', id => { if (id) HS.nav('event', id); });
  redirect('hubOpenPlayer', (team, nick) => { if (nick) HS.nav('player', nick); });
  redirect('v22OpenCalendar', () => HS.nav('calendar'));
  redirect('toggleSettingsMenu', () => HS.nav('settings'));
  const v21 = window.v21OpenTournament;
  window.v21OpenTournament = (id, silent) => { if (silent) return; if (id === 'main') return HS.nav('event', 'cur'); HS.nav('event', 'P-' + id); };
  window.ui27Go = where => HS.nav(({ bracket: 'watch', calendar: 'calendar', hltv: 'home', settings: 'settings' })[where] || 'home');
  window.__v21OpenLegacy = v21;
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
  if (document.querySelector('#dice-modal[style*="flex"]')) return;
  if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') { e.preventDefault(); HS.nav('home'); }
  if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') { e.preventDefault(); HS.nav('watch'); }
});

function boot() { legacy(); moveCss(); setTimeout(moveCss, 800); setTimeout(moveCss, 2500); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
window.addEventListener('load', () => { moveCss(); legacy(); setTimeout(legacy, 50); });
})();
