/* v84 — навигация портала по папкам. Основные разделы остаются вкладками; остальное — в выпадающих группах,
   как «Major». Модули по-прежнему добавляют свои пункты в «Ещё» — здесь они переносятся в свою группу
   (оригинальные кнопки скрываются, а не удаляются, чтобы модули не добавляли их повторно). */
(function () {
  'use strict';
  const H = window.HS; if (!H) return;
  const GROUPS = [
    ['history', 'История', [['awards', 'Награды'], ['archive', 'Архив'], ['hof', 'Зал славы'], ['records', 'Рекорды']]],
    ['community', 'Сообщество', [['community', 'Сообщество'], ['forum', 'Форум'], ['fantasy', 'Фэнтези'], ['predict', 'Прогнозы и опросы'], ['betting', 'Ставки'], ['fpl', 'FPL'], ['fan', 'Профиль фаната']]]
  ];
  const MAJOR_EXTRA = [['stickers', 'Стикеры'], ['nations', 'Кубок наций']];
  const grouped = new Set(GROUPS.flatMap(g => g[2].map(x => x[0])).concat(MAJOR_EXTRA.map(x => x[0])));
  const chev = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  function apply() {
    const tabs = document.querySelector('#hs-root .pt-tabs'); if (!tabs) return;
    const major = tabs.querySelector('.pt-dd.pt-major'), more = tabs.querySelector('.pt-menu[data-menu="more"]')?.closest('.pt-dd');
    // папки после «Major»
    let anchor = major || more;
    GROUPS.forEach(([key, label, items]) => {
      let dd = tabs.querySelector(`.pt-dd[data-grp="${key}"]`);
      if (!dd) {
        dd = document.createElement('div'); dd.className = 'pt-dd pt-grp'; dd.dataset.grp = key;
        dd.innerHTML = `<button type="button" class="hs-tab pt-dd-btn" data-dd="grp-${key}" aria-haspopup="true">${label} ${chev}</button><div class="pt-menu" data-menu="grp-${key}">${items.map(([k, l]) => `<button type="button" data-nav="${k}">${l}</button>`).join('')}</div>`;
        if (anchor && anchor.nextSibling) tabs.insertBefore(dd, anchor.nextSibling); else tabs.appendChild(dd);
      }
      anchor = dd;
      dd.classList.toggle('on', items.some(([k]) => k === H.S.page));
    });
    // «Стикеры» — в папку Major
    const mm = major?.querySelector('.pt-menu');
    if (mm) MAJOR_EXTRA.forEach(([k, l]) => { if (!mm.querySelector(`[data-nav="${k}"]`)) mm.insertAdjacentHTML('beforeend', `<button type="button" data-nav="${k}">${l}</button>`); });
    // «Ещё» — в конец, после папок
    if (more && anchor && more !== anchor && anchor.nextSibling !== more) tabs.insertBefore(more, anchor.nextSibling);
    // скрываем перенесённые пункты в «Ещё» и вкладки Награды/Архив
    more?.querySelectorAll('.pt-menu [data-nav]').forEach(b => { b.hidden = grouped.has(b.dataset.nav); });
    tabs.querySelectorAll(':scope > .hs-tab[data-nav="awards"], :scope > .hs-tab[data-nav="archive"]').forEach(b => { b.hidden = true; });
  }
  (H.AFTER || []).push(apply);
  setTimeout(apply, 0); setTimeout(apply, 1800); setTimeout(apply, 4000);
  window.CS2Nav = { apply, GROUPS };
})();
