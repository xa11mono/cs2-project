/* v85 — движение и мелкие улучшения интерфейса портала.
   • CS2Glyph(news) — линейный SVG-значок рубрики вместо эмодзи (правило DESIGN.md: без эмодзи в заголовках/ленте).
   • При смене страницы: числа в плитках «перекатываются» к значению, блоки ниже экрана проявляются при прокрутке,
     картинки проявляются по загрузке. Живые обновления (каждые 2,5 с) ничего не анимируют.
   • Индикатор раздела пересчитывается после загрузки шрифтов и изменения размера окна.
   • Фоновая вкладка: бесконечные CSS-анимации на паузе.
   Всё отключается при prefers-reduced-motion. Модуль ничего не пишет в сохранение. */
(function () {
  'use strict';
  const W = window, D = document, H = W.HS;
  const reduce = () => W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- значки рубрик ---------------- */
  const P = {
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
    bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    scroll: '<path d="M8 3h11v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2h10v2a3 3 0 0 0 3 3"/><path d="M8 3a3 3 0 0 0-3 3v9M11 8h5M11 12h5"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4 3-7 8-7 0 5-3 7-8 7zM12 14c0-3-2-6-7-6 0 4 2 6 7 6z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    brain: '<path d="M12 4v16M8 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h4M16 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-4"/>',
    bench: '<path d="M3 10h18M5 10V7h14v3M5 10l-1 8M19 10l1 8M7 14h10"/>',
    out: '<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 17l-5-5 5-5M5 12h11"/>',
    cap: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
    mega: '<path d="M3 10v4h4l7 5V5L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    flame: '<path d="M12 21c4 0 7-3 7-7 0-5-5-7-5-11-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 8 0 4 3 7 7 7z"/>',
    match: '<path d="M4 4l7 7M20 4l-7 7M8 20l-4-4 3-3 4 4zM16 20l4-4-3-3-4 4"/>',
    back: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'
  };
  const EMOJI = { '🏆': 'trophy', '⭐': 'star', '★': 'star', '✦': 'star', '⇄': 'swap', '↔': 'swap', '↩': 'back', '🕵️': 'eye', '🕵': 'eye', '📈': 'chart', '📊': 'bars',
    '📜': 'scroll', '🌱': 'sprout', '👤': 'user', '🎙️': 'mic', '🎙': 'mic', '🔎': 'search', '🎯': 'target', '🧠': 'brain', '🪑': 'bench', '📤': 'out', '🎓': 'cap',
    '🖊': 'pen', '📣': 'mega', '🔧': 'wrench', '🔥': 'flame', '⚔️': 'match', '⚔': 'match' };
  const CAT = { tournament: ['trophy', '#f5c04a'], major: ['star', '#fbbf24'], transfer: ['swap', '#5aa9ff'], roster: ['swap', '#5aa9ff'], rumor: ['eye', '#a98bf5'],
    ranking: ['chart', '#34d399'], season: ['scroll', '#ff9f43'], tier2: ['sprout', '#2fd4d4'], academy: ['cap', '#58c58a'], player: ['user', '#9db8ff'],
    interview: ['mic', '#ff8a8a'], stats: ['bars', '#2fd4d4'], analytics: ['bars', '#2fd4d4'], preview: ['search', '#9db8ff'], 'pickem-pub': ['target', '#ff7a3d'],
    match: ['match', '#ff7a3d'], event: ['mega', '#ff9f43'], coach: ['brain', '#a98bf5'] };
  const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.news}</svg>`;
  const escTxt = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function glyph(n) {
    n = n || {};
    const ic = String(n.icon || '').trim(), cat = CAT[n.cat] || ['news', '#8a97ad'];
    // короткий текстовый значок («5» — пять карт, «#» — веха) остаётся текстом в фирменном моноширинном
    if (/^[0-9A-Za-z#+%]{1,3}$/.test(ic)) return `<span class="cs2-gl txt" style="--gc:${cat[1]}">${escTxt(ic)}</span>`;
    const k = EMOJI[ic] || EMOJI[ic.replace(/️/g, '')] || cat[0];
    const color = ic === '🧠' ? CAT.coach[1] : cat[1];
    return `<span class="cs2-gl" style="--gc:${color}">${svg(k)}</span>`;
  }
  W.CS2Glyph = glyph;

  /* ---------------- числа ---------------- */
  const NUM = /^([#+\-−]?)(\d{1,3}(?:[  ]?\d{3})*|\d+)([.,]\d+)?(\s?(?:%|pts|очк\.?)?)$/;
  function countUp(el) {
    if (el.__v85c || el.children.length) return;
    const txt = el.textContent.trim(), m = txt.match(NUM); if (!m) return;
    const intPart = m[2].replace(/[  ]/g, ''), dec = m[3] ? m[3].length - 1 : 0, sep = m[3] ? m[3][0] : '.';
    const target = parseFloat(intPart + (m[3] ? '.' + m[3].slice(1) : '')); if (!isFinite(target) || target === 0) return;
    const grouped = /[  ]/.test(m[2]);
    const fmt = v => { let s = dec ? v.toFixed(dec) : String(Math.round(v)); if (grouped) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); if (dec && sep === ',') s = s.replace('.', ','); return m[1] + s + m[4]; };
    el.__v85c = 1; el.classList.add('v85-count');
    const t0 = performance.now(), dur = Math.min(900, 380 + Math.log10(Math.abs(target) + 1) * 160);
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(target * e); if (k < 1) requestAnimationFrame(step); else el.textContent = txt; };
    el.textContent = fmt(0); requestAnimationFrame(step);
  }

  /* ---------------- проявление при прокрутке ---------------- */
  let io = null;
  function reveal(pg) {
    if (!('IntersectionObserver' in W)) return;
    if (!io) io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; const el = e.target; io.unobserve(el); el.classList.add('v85-on');
      setTimeout(() => el.classList.remove('v85-rv', 'v85-on'), 520);
    }), { rootMargin: '0px 0px -6% 0px' });
    const vh = W.innerHeight, list = [];
    pg.querySelectorAll(':scope > .hs-box, :scope > section, :scope .hs-col > .hs-box, :scope .hs-side > .hs-box, :scope > .hs-grid2 > * > .hs-box').forEach(el => {
      const r = el.getBoundingClientRect(); if (r.top > vh + 8 && r.height < 4000) list.push(el);
    });
    list.forEach(el => { el.classList.add('v85-rv'); io.observe(el); });
    // страховка: что бы ни случилось с наблюдателем, через 4 с всё видно
    setTimeout(() => list.forEach(el => { if (el.classList.contains('v85-rv') && !el.classList.contains('v85-on')) { el.classList.remove('v85-rv'); try { io.unobserve(el); } catch (e) {} } }), 4000);
  }

  /* ---------------- картинки ---------------- */
  function images(pg) {
    pg.querySelectorAll('img').forEach(img => {
      if (img.complete || img.__v85i) return; img.__v85i = 1; img.classList.add('v85-ld');
      const done = () => { img.classList.remove('v85-ld'); if (!reduce()) img.classList.add('v85-in'); };
      img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true });
    });
  }

  /* ---------------- хук после рендера ---------------- */
  let lastKey = '';
  function after(page, arg, pg) {
    pg = pg || D.getElementById('hs-page'); if (!pg) return;
    images(pg);
    const key = page + '|' + (arg == null ? '' : arg);
    if (key === lastKey) return;            // мягкое обновление той же страницы — без анимации
    lastKey = key;
    try { W.hltvPlaceInk && W.hltvPlaceInk(); } catch (e) {}
    if (reduce()) return;
    requestAnimationFrame(() => {
      const vh = W.innerHeight;
      pg.querySelectorAll('.pt-kpis b, .hs-ptile b, .v37-kpis b, .v84-win-g b, .hs-stats-n b, .ev-kpi b').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) countUp(el); });
      reveal(pg);
    });
  }
  if (H && H.AFTER) H.AFTER.push(after);

  /* ---------------- индикатор раздела ---------------- */
  // Разделы, переехавшие в папки (v84-nav), больше не «принадлежат» старым вкладкам: «Путь на Major» — в папке Major,
  // Награды/Архив/Ставки/FPL — в «Истории» и «Сообществе». Полоска встаёт под папку, а не под Турниры/Новости.
  if (H && H.SECTION_OF) {
    H.SECTION_OF.majorpath = 'major';
    try { (W.CS2Nav && W.CS2Nav.GROUPS || []).forEach(g => g[2].forEach(([k]) => { H.SECTION_OF[k] = 'grp:' + g[0]; })); } catch (e) {}
  }
  const ink = () => { try { W.hltvPlaceInk && W.hltvPlaceInk(); } catch (e) {} };
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(() => setTimeout(ink, 30));
  let rz = 0; W.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(ink); }, { passive: true });
  setTimeout(ink, 2000);

  /* ---------------- фоновая вкладка ---------------- */
  const vis = () => D.documentElement.classList.toggle('v85-hidden', D.hidden);
  D.addEventListener('visibilitychange', vis); vis();

  W.CS2Motion = { glyph, countUp, reveal, after };
})();
