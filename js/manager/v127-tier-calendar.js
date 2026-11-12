/* v127 — «Календарь Tier-1» в стиле HLTV: 12 месяцев сезона сеткой 4×3, в карточке месяца — турниры
   с логотипом организатора и датами, LIVE у идущего, Мейджор подсвечен, «Показать все» для длинных месяцев,
   фильтр региона (Все / Европа / Америка / Азия). Логотипы: webp из assets/media/events (если файл есть),
   иначе — встроенный SVG-значок организатора. Прежний календарь по дням остаётся вторым видом. */
(function () {
  'use strict';
  const W = window, H = W.HS; if (!H || !H.PAGES || !H.PAGES.calendar) return;
  const esc = H.esc || (x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : {};
  const DAY = 864e5, SHOW = 4;
  const MN = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  H.S.tcal = H.S.tcal || { region: 'all', expand: false };
  H.S.cal = H.S.cal || { month: null };

  /* ---------------------------------------------------------------- логотипы */
  const FILE = 'assets/media/events/';
  const svg = (body, vb) => `<svg viewBox="${vb || '0 0 20 20'}" aria-hidden="true">${body}</svg>`;
  const SVG = {
    pgl: svg('<path d="M1.4 15V5H5.6Q7.4 5 7.4 7.6Q7.4 10.4 5.6 10.4H1.4M13.4 6.4Q12.6 5 10.8 5Q8.2 5 8.2 10Q8.2 15 10.8 15Q13.4 15 13.4 11.6V10.6H10.8M14.6 5V15H19" fill="none" stroke="#ff1f2d" stroke-width="2.2" stroke-linejoin="miter"/>'),
    iem: svg('<circle cx="10" cy="10" r="9" fill="#0d0d0d" stroke="#fff" stroke-width=".9"/><path d="M5.6 13.6L12.4 5.2M8 15L14.6 6.8M10.6 15.6L15.4 9.6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>'),
    rivals: svg('<path d="M10 2L18.6 17H1.4z" fill="#ff8a1e"/><path d="M10 7.6L14 14.6H6z" fill="#14161b"/><path d="M10 2L11.6 4.8L8.4 10.4L6.8 7.6z" fill="#ffb15c"/>'),
    blast: svg('<path d="M10 2L18.6 17H1.4z" fill="#ff4655"/><path d="M10 7.6L14 14.6H6z" fill="#14161b"/>'),
    thunder: svg('<path d="M10 17.4C6 14.6 2 11.6 2 7.6C2 5 4 3.2 6.2 3.2C7.8 3.2 9.2 4.2 10 5.6C10.8 4.2 12.2 3.2 13.8 3.2C16 3.2 18 5 18 7.6C18 11.6 14 14.6 10 17.4z" fill="none" stroke="#e9f6ff" stroke-width="1.6"/><path d="M10.8 6.4L8 10.6H10.4L9.2 14.4L12.4 9.6H10z" fill="#4cc3ff"/>'),
    ewc: svg('<g transform="skewX(-10) translate(1.6 0)" fill="none" stroke="#f2f2f2" stroke-width="1.7" stroke-linejoin="round"><path d="M5.6 5.6H1.4V14.4H5.6M1.4 10H5"/><path d="M6.4 5.6L7.8 14.4L9.6 9L11.4 14.4L12.8 5.6"/><path d="M18 6.6Q17.2 5.6 16 5.6Q13.8 5.6 13.8 10Q13.8 14.4 16 14.4Q17.2 14.4 18 13.4"/></g>'),
    starladder: svg('<path d="M10 1.6L12.4 7.4L18.6 7.8L13.8 11.8L15.4 17.8L10 14.4L4.6 17.8L6.2 11.8L1.4 7.8L7.6 7.4z" fill="#e8141c"/>'),
    nations: svg('<circle cx="10" cy="10" r="7.4" fill="#0f3b2e" stroke="#3ee0a1" stroke-width="1.3"/><path d="M2.6 10H17.4M10 2.6C6.6 5.6 6.6 14.4 10 17.4M10 2.6C13.4 5.6 13.4 14.4 10 17.4M4 6.2H16M4 13.8H16" fill="none" stroke="#3ee0a1" stroke-width=".9"/><path d="M10 7.2L10.9 9.1L13 9.2L11.4 10.5L11.9 12.6L10 11.4L8.1 12.6L8.6 10.5L7 9.2L9.1 9.1z" fill="#ffd35a"/>'),
    hltv: svg('<rect x="1" y="1" width="18" height="18" rx="3" fill="#f2a76a"/><path d="M4.4 15.2C7.6 11.6 11.4 8.4 15.8 5.2C12.6 8.8 9.4 12.2 6 15.6z" fill="#fff"/><path d="M15.8 5.2L13.4 6.2L14.8 7.6z" fill="#fff"/><circle cx="5.2" cy="5.6" r=".8" fill="#fff" opacity=".9"/><circle cx="8.4" cy="4" r=".5" fill="#fff" opacity=".8"/><circle cx="3.8" cy="9" r=".5" fill="#fff" opacity=".8"/>'),
    pw: svg('<circle cx="10" cy="10" r="8.6" fill="#b5121b"/><path d="M6.4 14V6H10.2C12 6 13.2 7 13.2 8.6S12 11.2 10.2 11.2H6.4" fill="none" stroke="#ffd36a" stroke-width="1.7"/>'),
    fire: svg('<path d="M10 1.8C11 5 14.8 6.4 14.8 11A4.8 4.8 0 0 1 5.2 11C5.2 8.6 6.6 7.4 7.4 6C7.6 7.8 8.6 8.4 9.2 8.6C8.8 6 9.4 3.6 10 1.8z" fill="#ff5a1f"/><path d="M10 9C10.8 10.6 12.2 11.2 12.2 12.8A2.2 2.2 0 0 1 7.8 12.8C7.8 11.6 9 10.8 10 9z" fill="#ffd35a"/>'),
    cct: svg('<rect x="2" y="2" width="16" height="16" rx="3" fill="#5a2de0"/><text x="10" y="13.2" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="6.4" font-weight="900" fill="#fff" style="font-family:Arial Black,Arial,sans-serif">CCT</text>'),
    stake: svg('<rect x="2" y="2" width="16" height="16" rx="3" fill="#0f212e"/><text x="10" y="13" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="9" font-style="italic" font-weight="900" fill="#fff" style="font-family:Arial Black,Arial,sans-serif">S</text>')
  };
  // [шаблон названия, файл webp или null, SVG-значок]
  const ORG = [
    [/^ESL Pro League|^EPL\b/i, 'eslpl.webp', 'iem'],
    [/^BLAST Bounty/i, 'blastbounty.webp', 'blast'],
    [/^BLAST Open/i, 'blastopen.webp', 'blast'],
    [/^BLAST Rivals/i, 'blastrivals.webp', 'rivals'],
    [/^BLAST/i, 'blastrivals.webp', 'rivals'],
    [/^FISSURE/i, 'fissure.webp', null],
    [/^PGL/i, 'pgl.webp', 'pgl'],
    [/^IEM|^Intel Extreme|^ESL\b/i, 'iem.webp', 'iem'],
    [/Thunderpick/i, 'thunderpick.webp', 'thunder'],
    [/Nations Cup|Кубок наций/i, 'nations.webp', 'nations'],
    [/Esports World Cup|^EWC/i, 'ewc.webp', 'ewc'],
    [/StarLadder|StarSeries/i, 'starladder.webp', 'starladder'],
    [/HLTV/i, null, 'hltv'],
    [/Perfect World/i, null, 'pw'],
    [/^FiRe/i, null, 'fire'],
    [/^CCT/i, null, 'cct'],
    [/^Stake/i, null, 'stake']
  ];
  // какие webp реально лежат в папке (остальные — SVG; положите файл и добавьте имя сюда)
  const HAVE = new Set(['eslpl.webp', 'blastbounty.webp', 'blastopen.webp', 'blastrivals.webp', 'fissure.webp']);
  function initials(name) {
    const w = String(name).replace(/\s+20\d\d.*$/, '').split(/\s+/).filter(Boolean), t = (w[0] || '?').slice(0, 2).toUpperCase();
    let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return svg(`<rect x="2" y="2" width="16" height="16" rx="4" fill="hsl(${h % 360} 45% 32%)"/><text x="10" y="13.4" text-anchor="middle" font-family="Arial,sans-serif" font-size="7.4" font-weight="800" fill="#fff" style="font-family:Arial,sans-serif">${esc(t)}</text>`);
  }
  function logo(name) {
    const o = ORG.find(x => x[0].test(String(name || '')));
    if (o && o[1] && HAVE.has(o[1])) return `<img src="${FILE}${o[1]}" alt="" loading="lazy">`;
    if (o && o[2]) return SVG[o[2]];
    return initials(name);
  }

  /* ---------------------------------------------------------------- регион */
  const EU = /^(PL|DE|DK|SE|FR|HU|RO|RS|PT|GB|NL|MT|CZ|ES|IT|FI|NO|AT|CH|BE|LV|LT|EE|UA|BG|GR|HR|SI|SK|IE|TR|RU|BY)$/;
  const AM = /^(US|CA|BR|AR|MX|CL|CO|PE|UY)$/;
  function regionOf(name) {
    let loc = null; try { loc = W.CS2EventLocation ? W.CS2EventLocation(name) : null; } catch (e) {}
    const cc = loc && loc.cc, r = loc && loc.region;
    if (cc) return EU.test(cc) ? 'eu' : AM.test(cc) ? 'am' : 'as';
    if (r) return /Амер/i.test(r) ? 'am' : /Ази|Океан/i.test(r) ? 'as' : 'eu';
    return /Americas|Dallas|Austin|Atlanta|Rio|Paulo|Buenos/i.test(name) ? 'am' : /Asia|Singapore|Shanghai|Chengdu|Beijing|Riyadh|Esports World Cup|Astana|Melbourne|Sydney/i.test(name) ? 'as' : 'eu';
  }

  /* ---------------------------------------------------------------- данные */
  const shortName = n => String(n || '')
    .replace(/ESL Pro League Season\s*/i, 'EPL S').replace(/\s*\([^)]*\)/g, '').replace(/Intel Extreme Masters/i, 'IEM')
    .replace(/\s+20(\d\d)\b/, " '$1").replace(/\s+/g, ' ').trim();
  function items(year, cur) {
    let list = [];
    try { list = H.events().filter(e => e && e.startMs && (e.tier === '1' || e.kind === 'major' || e.kind === 'nations') && e.season === cur); } catch (e) {}
    const out = [];
    list.forEach(e => {
      const base = { id: e.id, name: e.name, short: shortName(e.name), startMs: e.startMs, endMs: e.endMs || e.startMs, live: e.status === 'live', done: e.status === 'done', major: e.kind === 'major', champion: e.champion || '' };
      if (!base.major) return out.push(base);
      // Мейджор, как на HLTV: Stage 1 и Stage 2 — отдельными строками, дальше (Stage 3 и плей-офф) — под именем Мейджора.
      // Деление — то же, что в календаре по дням: четверти общей длительности.
      const span = Math.max(8 * DAY, base.endMs - base.startMs), part = span / 4, s0 = base.startMs, end = s0 + span;
      const now = H.nowMs(), stage = (a, b) => ({ live: !base.done && now >= a && now < b, done: base.done || now >= b });
      const org = (/^(\S+)\s/.exec(base.short) || [])[1], tag = org && /major/i.test(base.short) ? `${org} Major` : base.short.replace(/\s'\d\d$/, '');
      out.push({ ...base, short: `${tag} Stage 1`, name: `${base.name} · Stage 1`, startMs: s0, endMs: s0 + part, ...stage(s0, s0 + part), champion: '' });
      out.push({ ...base, short: `${tag} Stage 2`, name: `${base.name} · Stage 2`, startMs: s0 + part, endMs: s0 + part * 2, ...stage(s0 + part, s0 + part * 2), champion: '' });
      out.push({ ...base, startMs: s0 + part * 2, endMs: end, ...stage(s0 + part * 2, end) });
    });
    // HLTV Awards: церемония в начале года
    try {
      const A = W.CS2Awards, rec = ST().v84Awards || {};
      [year - 1, year].forEach(y => {
        const s = rec[y], d = s ? { reveal: s.revealAt, ceremony: s.ceremonyAt } : A?.ceremonyDates?.(y, new Date(y, 11, 13).getTime());
        if (!d || !d.ceremony || new Date(d.reveal || d.ceremony).getFullYear() !== year && new Date(d.ceremony).getFullYear() !== year) return;
        const st = new Date(d.ceremony).getFullYear() === year ? d.ceremony : d.reveal;
        out.push({ nav: 'awards', name: `HLTV Awards ${y}`, short: 'HLTV Awards', startMs: st, endMs: d.ceremony, done: !!s?.done, live: false, major: false });
      });
    } catch (e) {}
    return out.sort((a, b) => a.startMs - b.startMs);
  }
  const dd = ms => new Date(ms).getDate();
  function dates(e) {
    const a = new Date(e.startMs), b = new Date(Math.max(e.startMs, e.endMs - 1));
    const sameMon = a.getMonth() === b.getMonth();
    if (sameMon && a.getDate() === b.getDate()) return String(a.getDate());
    return `${dd(e.startMs)}–${dd(b.getTime())}${sameMon ? '' : ' ' + MN[b.getMonth()].slice(0, 3).toLowerCase()}`;
  }

  /* ---------------------------------------------------------------- страница */
  function grid() {
    const st = ST(), cur = st.currentSeason || 1, year = H.yearOf(cur), now = H.nowMs(), f = H.S.tcal;
    const all = items(year, cur).filter(e => f.region === 'all' || e.nav === 'awards' || regionOf(e.name) === f.region);
    const nowD = new Date(now), curMon = nowD.getFullYear() === year ? nowD.getMonth() : -1;
    const chip = (on, attr, label) => `<button type="button" class="hs-chip${on ? ' on' : ''}" ${attr}>${label}</button>`;
    const regions = [['all', 'Все регионы'], ['eu', 'Европа'], ['am', 'Америка'], ['as', 'Азия']].map(([k, l]) => chip(f.region === k, `data-tcreg="${k}"`, l)).join('');
    const views = chip(true, 'data-tcview="year"', 'Год') + chip(false, 'data-tcview="days"', 'По дням');
    let total = 0;
    const months = MN.map((m, i) => {
      // турнир, захватывающий два месяца, виден в обоих (в следующем — с пометкой «продолжение»)
      const m0 = new Date(year, i, 1).getTime(), m1 = new Date(year, i + 1, 1).getTime();
      const list = all.filter(e => e.startMs < m1 && Math.max(e.startMs + 1, e.endMs) > m0).map(e => e.startMs < m0 ? { ...e, cont: true } : e);
      total += list.filter(e => !e.cont).length;
      const shown = f.expand ? list : list.slice(0, SHOW);
      const rows = shown.map(e => {
        const attr = e.nav ? `data-nav="${e.nav}"` : `data-event="${esc(e.id)}"`;
        const tip = `${e.name} · ${new Date(e.startMs).toLocaleDateString('ru-RU')} – ${new Date(e.endMs).toLocaleDateString('ru-RU')}${e.champion ? ' · чемпион: ' + e.champion : ''}`;
        return `<button type="button" class="ttc-ev${e.major ? ' major' : ''}${e.done ? ' done' : ''}${e.live ? ' live' : ''}${e.cont ? ' cont' : ''}" ${attr} title="${esc(tip)}">` +
          `<span class="ttc-logo">${logo(e.name)}</span><span class="ttc-name">${esc(e.short)}</span>` +
          (e.live ? '<span class="hs-live">LIVE</span>' : `<span class="ttc-date">${dates(e)}</span>`) + '</button>';
      }).join('');
      const more = !f.expand && list.length > SHOW ? `<button type="button" class="hs-chip ttc-more" data-tcexp="1">Показать все · ${list.length}</button>` : '';
      const body = list.length ? rows + more : `<div class="ttc-empty"><b>:(</b><span>Турниров пока нет</span></div>`;
      return `<section class="hs-box ttc-mon${i === curMon ? ' now' : ''}${curMon > i ? ' past' : ''}"><header class="hs-box-h"><h3>${m}</h3>` +
        `${i === curMon ? '<span class="ttc-now">сейчас</span>' : `<span class="hs-sub">${list.length || ''}</span>`}</header><div class="hs-box-b ttc-list">${body}</div></section>`;
    }).join('');
    const less = f.expand ? `<div class="hs-filters ttc-foot">${chip(false, 'data-tcexp="0"', 'Свернуть')}</div>` : '';
    return `<div class="hs-head"><h1>Календарь Tier-1 · ${year}</h1><div class="hs-filters">${views}</div></div>` +
      `<div class="hs-filters ttc-regs">${regions}<span class="hs-sub">${total} турниров · Мейджоры выделены золотом</span></div>` +
      `<div class="ttc-grid">${months}</div>${less}`;
  }
  const orig = H.PAGES.calendar;
  H.PAGES.calendar = function () {
    if (H.S.tcal.view === 'days') {
      const html = orig.apply(this, arguments);
      const sw = `<div class="hs-filters ttc-days-sw"><button type="button" class="hs-chip" data-tcview="year">Год</button><button type="button" class="hs-chip on" data-tcview="days">По дням</button></div>`;
      return html.replace('<div class="hs-filters cal-months">', sw + '<div class="hs-filters cal-months">');
    }
    return grid();
  };
  H.CLICKS.push(['[data-tcreg]', el => { H.S.tcal.region = el.dataset.tcreg; H.render(); }]);
  H.CLICKS.push(['[data-tcexp]', el => { H.S.tcal.expand = el.dataset.tcexp === '1'; H.render(); }]);
  H.CLICKS.push(['[data-tcview]', el => { H.S.tcal.view = el.dataset.tcview; H.render(); }]);
  W.V127TierCalendar = { logo, regionOf, shortName };
})();
