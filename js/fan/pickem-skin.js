/* v127 — страница Pick'Em в духе CS2: у каждого Мейджора свой «стол» (цвет, узор, бумага/лак/витраж).

   Раскладка как в игре:
     шапка    — стикер турнира и название крупно;
     «Предметы турнира» — сувенирный набор (кубок турнира), капсулы Legends / Challengers / Contenders
                (стикеры команд этапов), «Автографы чемпионов» (скоро), граффити любимой команды;
     «Испытание Pick'Em» — монета Мейджора, уровень и сколько осталось до улучшения, список испытаний
                (сделать все 10 прогнозов этапа до старта, угадать 5, плей-офф…) с отметками;
     справа  — вкладки этапов, «осталось N дней», команды для выбора, швейцарская сетка, «Прогнозы сохранены»,
                таблица друзей.
   Логика прогнозов остаётся в js/fan/pickem.js: этот слой только перестраивает готовую страницу (клики — те же data-*).
   Темы — по городу Мейджора (Кёльн — витраж, Будапешт — бархат с орнаментом, Остин — пергамент, Шанхай — лак
   с драконьей чешуёй, Париж — ар-деко, Рио — тропики, Катовице — сталь, Копенгаген — волны, Эр-Рияд — звёзды…),
   для остальных — по организатору. */
(function () {
  'use strict';
  const W = window, H = W.HS; if (!H) return;
  const esc = H.esc, D = document;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const SS = () => (typeof seasonState !== 'undefined' ? seasonState : null);
  const CT = () => (typeof currentTournament !== 'undefined' ? currentTournament : null);
  const svgUrl = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

  // ---------------------------------------------------------------- темы
  const P = { // узоры фона (повторяющаяся плитка)
    vitrage: c => `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><g fill='none' stroke='${c}' stroke-width='2'><circle cx='60' cy='60' r='44'/><circle cx='60' cy='60' r='22'/><path d='M60 16v88M16 60h88M29 29l62 62M91 29L29 91'/><circle cx='0' cy='0' r='22'/><circle cx='120' cy='0' r='22'/><circle cx='0' cy='120' r='22'/><circle cx='120' cy='120' r='22'/></g></svg>`,
    ornament: c => `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><g fill='none' stroke='${c}' stroke-width='1.5'><path d='M45 5L85 45L45 85L5 45z'/><path d='M45 22c8 8 8 15 0 23c-8-8-8-15 0-23zM45 68c8-8 8-15 0-23c-8 8-8 15 0 23zM22 45c8-8 15-8 23 0c-8 8-15 8-23 0zM68 45c-8-8-15-8-23 0c8 8 15 8 23 0z'/><circle cx='45' cy='45' r='3'/><circle cx='0' cy='0' r='6'/><circle cx='90' cy='0' r='6'/><circle cx='0' cy='90' r='6'/><circle cx='90' cy='90' r='6'/></g></svg>`,
    flourish: c => `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><g fill='none' stroke='${c}' stroke-width='1.4'><path d='M10 80c20-30 50-30 70 0s50 30 70 0'/><path d='M30 80c10-12 25-12 35 0M95 80c10 12 25 12 35 0'/><circle cx='80' cy='80' r='5'/><path d='M80 20c-6 10-6 20 0 30c6-10 6-20 0-30zM80 140c-6-10-6-20 0-30c6 10 6 20 0 30z'/></g></svg>`,
    scales: c => `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='28'><g fill='none' stroke='${c}' stroke-width='1.6'><path d='M0 28a12 12 0 0 1 24 0a12 12 0 0 1 24 0'/><path d='M-12 14a12 12 0 0 1 24 0a12 12 0 0 1 24 0a12 12 0 0 1 24 0'/></g></svg>`,
    deco: c => `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><g fill='none' stroke='${c}' stroke-width='1.4'><path d='M40 80V40M40 40L10 80M40 40L70 80M40 40L25 80M40 40L55 80'/><path d='M0 40a40 40 0 0 1 80 0'/><path d='M12 40a28 28 0 0 1 56 0'/><path d='M24 40a16 16 0 0 1 32 0'/></g></svg>`,
    leaves: c => `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><g fill='none' stroke='${c}' stroke-width='1.6'><path d='M20 120C40 80 80 60 120 60M40 104c10-14 4-28-10-34M60 92c10-14 6-30-8-36M80 80c12-12 10-28-2-36M100 68c14-8 16-24 6-34'/><path d='M120 140c-20-30-60-40-100-30'/></g></svg>`,
    hexes: c => `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='97'><g fill='none' stroke='${c}' stroke-width='1.4'><path d='M28 0l28 16v33L28 65L0 49V16z'/><path d='M28 65v32M0 16L-28 0M56 16L84 0'/></g></svg>`,
    waves: c => `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><g fill='none' stroke='${c}' stroke-width='1.6'><path d='M0 20q15-14 30 0t30 0t30 0t30 0'/><path d='M0 36q15-14 30 0t30 0t30 0t30 0' opacity='.6'/></g></svg>`,
    stars8: c => `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><g fill='none' stroke='${c}' stroke-width='1.4'><path d='M40 18l6 16 16 6-16 6-6 16-6-16-16-6 16-6z'/><path d='M40 22L58 40L40 58L22 40z'/><path d='M0 0l8 8M80 0l-8 8M0 80l8-8M80 80l-8-8'/></g></svg>`,
    snow: c => `<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70'><g fill='none' stroke='${c}' stroke-width='1.4' stroke-linecap='round'><path d='M35 20v30M22 27.5l26 15M22 42.5l26-15M35 25l-4-4M35 25l4-4M35 45l-4 4M35 45l4 4'/></g></svg>`,
    herring: c => `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><g fill='none' stroke='${c}' stroke-width='1.4'><path d='M0 10l10 10 10-10 10 10 10-10M0 30l10 10 10-10 10 10 10-10'/></g></svg>`,
    bricks: c => `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='30'><g fill='none' stroke='${c}' stroke-width='1.2'><path d='M0 0H60M0 15H60M0 30H60M15 0V15M45 0V15M0 15V30M30 15V30'/></g></svg>`,
    steppe: c => `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='40'><g fill='none' stroke='${c}' stroke-width='1.6' stroke-linecap='round'><path d='M40 30c-8-12-20-10-18-2c1 4 6 4 6 0M40 30c8-12 20-10 18-2c-1 4-6 4-6 0'/><path d='M0 38l10-6 10 6 10-6 10 6 10-6 10 6 10-6 10 6'/></g></svg>`,
    shells: c => `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40'><g fill='none' stroke='${c}' stroke-width='1.4'><path d='M30 38Q10 20 30 4Q50 20 30 38zM30 38Q20 22 30 10M30 38Q40 22 30 10'/></g></svg>`,
    azulejo: c => `<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'><g fill='none' stroke='${c}' stroke-width='1.3'><rect x='0' y='0' width='50' height='50'/><path d='M25 5Q35 25 25 45Q15 25 25 5zM5 25Q25 15 45 25Q25 35 5 25z'/><circle cx='25' cy='25' r='4'/></g></svg>`,
    damask: c => `<svg xmlns='http://www.w3.org/2000/svg' width='70' height='90'><g fill='none' stroke='${c}' stroke-width='1.3'><path d='M35 10c12 12 12 28 0 40c-12-12-12-28 0-40zM35 50c8 10 8 22 0 30c-8-8-8-20 0-30zM20 30c-8 4-10 12-4 16M50 30c8 4 10 12 4 16'/></g></svg>`,
    facets: c => `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><g fill='none' stroke='${c}' stroke-width='1.2'><path d='M30 4L56 30L30 56L4 30z'/><path d='M4 30H56M30 4V56M17 17L43 43M43 17L17 43'/></g></svg>`,
    circuit: c => `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><g fill='none' stroke='${c}' stroke-width='1.3'><path d='M0 15H20L30 25V45H60M40 0V10L50 20H60M10 60V40H20'/><circle cx='30' cy='45' r='2.5'/><circle cx='20' cy='40' r='2.5'/></g></svg>`,
    slash: c => `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'><path d='M0 30L30 0M-8 8L8 -8M22 38L38 22' stroke='${c}' stroke-width='3'/></svg>`,
    clouds: c => `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='50'><g fill='none' stroke='${c}' stroke-width='1.4'><path d='M10 40c0-8 10-10 14-4c2-10 18-10 20 0c6-6 16-2 14 6M50 20c2-6 10-6 12 0c4-4 12-2 10 4'/></g></svg>`,
    pluses: c => `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'><path d='M15 9v12M9 15h12' stroke='${c}' stroke-width='1.6'/></svg>`,
    dots: c => `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='2.2' fill='${c}'/></svg>`,
    rings: c => `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><g fill='none' stroke='${c}' stroke-width='1.2'><circle cx='40' cy='40' r='30'/><circle cx='40' cy='40' r='18'/><circle cx='0' cy='0' r='18'/><circle cx='80' cy='80' r='18'/></g></svg>`,
    grid: c => `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M40 0H0V40' fill='none' stroke='${c}' stroke-width='1'/></svg>`
  };
  // bg — основной цвет стола, bg2 — второй (градиент), pat — узор, pc — цвет узора, acc — акцент, light — светлая тема (пергамент)
  const THEMES = {
    cologne:   { n: 'Витраж',      bg: '#0f2a1b', bg2: '#173f2a', pat: 'vitrage',  pc: '#3d8a5c', po: .22, acc: '#5be38f', glow: '#2fbf6a' },
    budapest:  { n: 'Бархат',      bg: '#24142f', bg2: '#3b2150', pat: 'ornament', pc: '#b48ad9', po: .16, acc: '#d9b0ff', glow: '#9d5ce0' },
    texas:     { n: 'Пергамент',   bg: '#cdb88f', bg2: '#e2d3ae', pat: 'flourish', pc: '#7a5a2e', po: .18, acc: '#566f2f', glow: '#a07a3c', light: true },
    shanghai:  { n: 'Лак',         bg: '#4a0c0c', bg2: '#7a1a12', pat: 'scales',   pc: '#e0a83c', po: .16, acc: '#f2c14e', glow: '#e05a2a' },
    paris:     { n: 'Ар-деко',     bg: '#111a33', bg2: '#1d2b52', pat: 'deco',     pc: '#d8b86a', po: .16, acc: '#f0d38a', glow: '#3a5bd0' },
    rio:       { n: 'Тропики',     bg: '#08332f', bg2: '#0f5145', pat: 'leaves',   pc: '#5fd3a0', po: .18, acc: '#ffd34d', glow: '#1fbf8a' },
    katowice:  { n: 'Сталь',       bg: '#141d29', bg2: '#22344a', pat: 'hexes',    pc: '#5a7da3', po: .22, acc: '#6cc0ff', glow: '#2f7fe0' },
    copenhagen:{ n: 'Гавань',      bg: '#0e2238', bg2: '#173a5e', pat: 'waves',    pc: '#6aa8e0', po: .2,  acc: '#8fd0ff', glow: '#2f8fe0' },
    stockholm: { n: 'Лёд',         bg: '#102131', bg2: '#1c3a52', pat: 'snow',     pc: '#9fd2f5', po: .16, acc: '#bfe6ff', glow: '#4fb0e8' },
    riyadh:    { n: 'Пустыня',     bg: '#0d2a28', bg2: '#16413c', pat: 'stars8',   pc: '#d9b45a', po: .2,  acc: '#e8c26a', glow: '#1f8f7a' },
    berlin:    { n: 'Бетон',       bg: '#1a1b1f', bg2: '#2a2c33', pat: 'grid',     pc: '#5b5f6a', po: .35, acc: '#ff5a4a', glow: '#c0392b' },
    london:    { n: 'Королевский', bg: '#0f1838', bg2: '#1c2a5c', pat: 'herring',  pc: '#c9a95a', po: .14, acc: '#e8c97a', glow: '#3048c0' },
    krakow:    { n: 'Кирпич',      bg: '#2b1310', bg2: '#4a221a', pat: 'bricks',   pc: '#a0573e', po: .25, acc: '#ffb26b', glow: '#c05a30' },
    astana:    { n: 'Степь',       bg: '#0b2a3d', bg2: '#12456a', pat: 'steppe',   pc: '#e8c25a', po: .14, acc: '#ffd45a', glow: '#1f8fd0' },
    sydney:    { n: 'Залив',       bg: '#0b2638', bg2: '#123d5a', pat: 'shells',   pc: '#6ad0f0', po: .2,  acc: '#ffb347', glow: '#1fa0d0' },
    lisbon:    { n: 'Азулежу',     bg: '#0e2350', bg2: '#173a7a', pat: 'azulejo',  pc: '#8fb8ff', po: .2,  acc: '#ffd27a', glow: '#2f6fe0' },
    bucharest: { n: 'Барокко',     bg: '#2a1620', bg2: '#47243a', pat: 'damask',   pc: '#d8a8c0', po: .14, acc: '#ffcf7a', glow: '#b04a80' },
    antwerp:   { n: 'Бриллиант',   bg: '#121a26', bg2: '#22324a', pat: 'facets',   pc: '#9fc8ff', po: .16, acc: '#bfe2ff', glow: '#5a9ae8' }
  };
  const ORG_THEME = [
    [/^PGL/i, { n: 'PGL', bg: '#0b1630', bg2: '#13275a', pat: 'circuit', pc: '#4f8fff', po: .16, acc: '#5fb2ff', glow: '#1f6fe0' }],
    [/^BLAST/i, { n: 'BLAST', bg: '#121214', bg2: '#25202c', pat: 'slash', pc: '#ff6a3a', po: .14, acc: '#ff7a3a', glow: '#ff4a2a' }],
    [/^Perfect World/i, { n: 'PW', bg: '#3a0808', bg2: '#5e1410', pat: 'clouds', pc: '#e8b84a', po: .16, acc: '#f2c14e', glow: '#e04a2a' }],
    [/^StarLadder/i, { n: 'SL', bg: '#1c0b33', bg2: '#331a5c', pat: 'dots', pc: '#c49aff', po: .16, acc: '#ffd75a', glow: '#8a4ae0' }],
    [/^IEM|^ESL/i, { n: 'IEM', bg: '#0f1622', bg2: '#1c2a40', pat: 'pluses', pc: '#4f6c90', po: .3, acc: '#ff9a3c', glow: '#ff7a1a' }]
  ];
  function themeOf(title) {
    let lm = 'generic'; try { lm = W.CS2StickerArt.landmarkOf(title); } catch (e) {}
    if (W.CS2PickemSkin && W.CS2PickemSkin.force) lm = W.CS2PickemSkin.force;   // для проверки тем
    // v128.2: новые города — тема из цветов флага, узор фона — животное-символ города
    const A = W.CS2StickerArt, fp = !THEMES[lm] && A && A.flagPal ? A.flagPal(lm) : null;
    if (fp) { const dark = fp.find(c => c !== '#f4f4f4') || '#22398a', acc = fp.find(c => c !== dark && c !== '#f4f4f4') || '#f2c14e', mx = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
      const T0 = { n: 'Город', bg: mx(dark, '#000000', .72), bg2: mx(dark, '#000000', .5), pat: 'animal', patSvg: A.animalSvg(lm, mx(acc, '#ffffff', .2)), pc: acc, po: .14, acc: mx(acc, '#ffffff', .25), glow: dark };
      if (T0.patSvg) { const yr = parseInt((String(title).match(/20\d\d/) || ['2026'])[0], 10), k = ((yr - 2026) % 8 + 8) % 8; return Object.assign({ key: lm, rot: (k * 23) % 90 }, T0); } }
    const t = THEMES[lm] || (ORG_THEME.find(x => x[0].test(title)) || [0, { n: 'Major', bg: '#141820', bg2: '#22283a', pat: 'rings', pc: '#e2b13c', po: .14, acc: '#f2c14e', glow: '#c08a2a' }])[1];
    // v128: один город в разные годы — разная палитра и наклон узора
    const yr = parseInt((String(title).match(/20\d\d/) || ['2026'])[0], 10), k = ((yr - 2026) % 8 + 8) % 8, hr = W.CS2StickerArt && W.CS2StickerArt.hueRot;
    const T = Object.assign({ key: THEMES[lm] ? lm : 'org', rot: (k * 23) % 90 }, t);
    if (k && hr) ['bg', 'bg2', 'pc', 'acc', 'glow'].forEach(x => { T[x] = hr(T[x], k * 45); });
    return T;
  }

  // ---------------------------------------------------------------- данные
  function majorData(title) { const s = SS(); return s && s.v33Pickem && s.v33Pickem.t === title ? s.v33Pickem.major || {} : {}; }
  const stageNames = ['Stage I', 'Stage II', 'Stage III'];
  function challenges(title) {
    const ctx = (W.V33Pickem && W.V33Pickem.publicContext && W.V33Pickem.publicContext()) || {}, m = majorData(title), out = [];
    const coins = (SS() && SS().v35Prof && SS().v35Prof.coins) || {}, hasCoin = Object.keys(coins).some(k => k.indexOf(title + '|') === 0);
    const total = st => st ? (st.threeZero || []).length + (st.advance || []).length + (st.zeroThree || []).length : 0;
    out.push({ ic: 'coin', t: 'Активируйте монету до конца турнира', st: hasCoin || total((m.stages || {})[1]) > 0 ? 'done' : 'todo' });
    for (let i = 1; i <= 3; i++) {
      const p = (m.stages || {})[i], s = (ctx.stages || {})[i], n = total(p);
      const placeSt = n >= 10 ? 'done' : s && (s.started || s.completed) ? 'fail' : s ? 'todo' : 'lock';
      out.push({ ic: 'cal', t: `Сделайте все 10 прогнозов ${stageNames[i - 1]} до его начала`, st: placeSt, sub: n && n < 10 ? `${n}/10` : '' });
      const pts = p && p.scored ? Number(p.points) || 0 : null;
      out.push({ ic: 'cup', t: `Угадайте 5 исходов ${stageNames[i - 1]}`, st: pts != null && pts >= 5 ? 'done' : pts != null && s && s.completed ? 'fail' : s ? 'todo' : 'lock', sub: pts != null && s && s.completed ? `${pts}/10` : '' });
    }
    const po = m.playoffs || {}, sc = m.scoredPlayoffPicks || {}, poN = (po.qf || []).length + (po.sf || []).length + (po.champion ? 1 : 0);
    const hit = k => Object.keys(sc).filter(x => x.indexOf(k + ':') === 0).map(x => x.slice(k.length + 1)), poOpen = (ctx.playoffs || []).length > 0;
    const qfHit = hit('qf').filter(n => (po.qf || []).includes(n)).length, sfHit = hit('sf').filter(n => (po.sf || []).includes(n)).length, chHit = hit('champion').some(n => n === po.champion);
    const qfDone = hit('qf').length >= 4, sfDone = hit('sf').length >= 2, chDone = hit('champion').length >= 1;
    out.push({ ic: 'cal', t: 'Сделайте все 7 прогнозов плей-офф до его начала', st: poN >= 7 ? 'done' : ctx.playoffsStarted ? 'fail' : poOpen ? 'todo' : 'lock', sub: poN && poN < 7 ? `${poN}/7` : '' });
    out.push({ ic: 'cup', t: 'Угадайте 2 победителей четвертьфиналов', st: qfHit >= 2 ? 'done' : qfDone ? 'fail' : poOpen ? 'todo' : 'lock' });
    out.push({ ic: 'cup', t: 'Угадайте победителя полуфинала', st: sfHit >= 1 ? 'done' : sfDone ? 'fail' : poOpen ? 'todo' : 'lock' });
    out.push({ ic: 'cup', t: 'Угадайте чемпиона Мейджора', st: chHit ? 'done' : chDone ? 'fail' : poOpen ? 'todo' : 'lock' });
    return out;
  }
  const IC = {
    done: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', fail: '<path d="M7 7l10 10M17 7L7 17"/>', lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="1.6"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    cup: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0zM12 13.5v3.5M8.5 20h7M7.5 6H4.5c0 2.6 1.6 4 3.2 4M16.5 6h3c0 2.6-1.6 4-3.2 4"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>', coin: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8.5v7M9.5 10.5h4"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>', saved: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
  };
  const ic = (k, cls) => `<svg class="pkx-i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k] || ''}</svg>`;

  // предметы турнира
  // v146: превью капсулы собирается один раз (кэш) и из четырёх наклеек команд вместо шести: страница Pick'Em держала
  // ~13 тыс. SVG-узлов и открывалась ~0,4 с
  const capCache = new Map();
  function capsuleArt(title, year, teamsList, finish, seed) {
    const ck = [title, finish, seed, teamsList.slice(0, 4).join(',')].join('|'); if (capCache.has(ck)) return capCache.get(ck);
    if (capCache.size > 40) capCache.clear();
    const html = capsuleArtRaw(title, year, teamsList, finish, seed); capCache.set(ck, html); return html;
  }
  function capsuleArtRaw(title, year, teamsList, finish, seed) {
    let ev = '', tm = '';
    try { ev = W.CS2Stickers.eventSticker({ name: title, year }, finish); } catch (e) {}
    const pick = teamsList.slice(0, 4);
    tm = pick.map((n, i) => { const a = (i / Math.max(1, pick.length)) * Math.PI * 2 - Math.PI / 2, x = 50 + Math.cos(a) * 34, y = 50 + Math.sin(a) * 30;
      // v146: на превью — лёгкая наклейка (логотип в белой окантовке, кайма по исполнению) вместо полного SVG (~580 узлов)
      let s = ''; try { const f = ['paper', 'glitter', 'holo', 'gold'][(seed + i) % 4], u = (W.V31Media && W.V31Media.url('team', n)) || ''; s = u ? `<i class="pkx-mini f-${f}"><img src="${esc(u)}" alt="" loading="lazy" decoding="async"></i>` : ''; } catch (e) {}
      return s ? `<span class="pkx-cs" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--r:${((seed >>> i) % 30) - 15}deg">${s}</span>` : ''; }).join('');
    return `<span class="pkx-tin"><i></i>${ev ? `<span class="pkx-ev">${ev}</span>` : ''}</span>${tm}`;
  }
  function stageTeams() {
    const ctx = (W.V33Pickem && W.V33Pickem.publicContext && W.V33Pickem.publicContext()) || {}, st = ctx.stages || {};
    let up = null; try { up = W.V33Pickem.upcomingMajor(); } catch (e) {}
    const pools = up && up.pools ? up.pools : null, nm = a => (a || []).map(t => typeof t === 'string' ? t : t && t.name).filter(Boolean);
    return { legends: st[3] ? st[3].teams.slice(0, 8) : nm(pools && pools.stage3), challengers: st[2] ? st[2].teams.slice(0, 8) : nm(pools && pools.stage2), contenders: st[1] ? st[1].teams : nm(pools && pools.stage1) };
  }
  function items(title, year, th) {
    const T = stageTeams(), city = (title.replace(/\b(PGL|IEM|BLAST(\.tv)?|Perfect World|StarLadder|FiRe|ESL|CS2?|Major|20\d\d)\b/gi, '').trim()) || 'Major';
    // v146: капсулы открываются прямо отсюда (как в CS2): клик по капсуле — экран «Открыть капсулу»; доступны, когда у
    // Мейджора есть набор капсул (с начала Мейджора), автографы — после финала
    let capOK = false, done = false; try { capOK = !!((W.CS2Stickers && W.CS2Stickers.capsules()) || []).some(c => c && c.name === title); } catch (e) {}
    try { const d = W.v131PickemDone && W.v131PickemDone(); done = !!(d && d.name === title); } catch (e) {}
    const card = (cls, art, name, foot) => { const can = capOK && (cls !== 'autographs' || done);
      return `<div class="pkx-item ${cls}${can ? ' can' : ''}"${can ? ` data-pkxcap="${esc(title)}|${cls}" role="button" tabindex="0" title="Открыть капсулу"` : ''}><div class="pkx-item-art">${art}</div><b>${esc(name)}</b>${foot || ''}${can ? '<span class="pkx-open">Открыть</span>' : ''}</div>`; };
    const h = h32(title);
    let fav = ''; try { fav = W.V35Badges && W.V35Badges.fanTeam ? W.V35Badges.fanTeam('', true) : ''; } catch (e) {}
    const favLogo = fav ? H.logo(fav, 'lg') : '';
    return `<div class="pkx-items">
      <div class="pkx-souv"><div class="pkx-souv-art"><i class="pkx-crate"></i></div><b>Сувенирный набор ${esc(city)} ${esc(year)}</b><small>Выдаётся за просмотр завершённого матча турнира</small></div>
      ${card('legends', capsuleArt(title, year, T.legends, 'holo', h), 'Капсула Legends', '<small>Команды Stage III</small>')}
      ${card('challengers', capsuleArt(title, year, T.challengers, 'glitter', h >>> 3), 'Капсула Challengers', '<small>Команды Stage II</small>')}
      ${card('contenders', capsuleArt(title, year, T.contenders, 'paper', h >>> 6), 'Капсула Contenders', '<small>Команды Stage I</small>')}
      ${done ? card('autographs', capsuleArt(title, year, (() => { try { const d = W.v131PickemDone(); return d && d.poRes && d.poRes.champion ? [d.poRes.champion] : []; } catch (e) { return []; } })(), 'gold', h), 'Автографы чемпионов', '<small>Игроки Legends</small>') : card('autographs', capsuleArt(title, year, [], 'gold', h) + '<span class="pkx-q">?</span><span class="pkx-soon">Скоро</span>', 'Автографы чемпионов', '<small>После финала</small>')}
      <div class="pkx-graffiti"><small>Граффити команды</small><div class="pkx-graf-art">${favLogo || '<span class="pkx-q">?</span>'}</div><p>${fav ? `Вы болеете за <b>${esc(fav)}</b> на этом турнире` : 'Выберите любимую команду на время турнира'}</p><button type="button" class="pkx-btn" data-nav="fan">${fav ? 'Сменить команду' : 'Выбрать команду'}</button></div>
    </div>`;
  }
  // таблица друзей: болельщики из комментариев, очки — из их прогнозов (детерминированно), плюс вы
  function board(title, myPts) {
    let nicks = []; try { const N = W.V29News; for (const it of (N.all() || []).slice(0, 80)) for (const c of (N.comments(it) || [])) { if (c.nick && !nicks.includes(c.nick)) nicks.push(c.nick); if (nicks.length >= 12) break; } } catch (e) {}
    const ctx = (W.V33Pickem && W.V33Pickem.publicContext && W.V33Pickem.publicContext()) || {}, done = Object.values(ctx.stages || {}).filter(s => s.completed).length;
    const rows = nicks.slice(0, 4).map(n => ({ n, p: done ? (h32(n + title) % (6 * done + 1)) + done * 2 : 0 })).concat([{ n: 'Вы', p: myPts, me: true }]).sort((a, b) => b.p - a.p);
    return `<div class="pkx-board"><header><b>Таблица друзей</b>${ic('expand')}</header>${rows.map((r, i) => `<div class="${r.me ? 'me' : ''}"><i>${i + 1}</i><span>${esc(r.n)}</span><b>${r.p}</b></div>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------- перестройка страницы
  function skin(root) {
    const grid = root.querySelector('.pk-page-grid'), play = root.querySelector('.pk-play-area'), medal = root.querySelector('.pk-medal-card');
    if (!grid || !play || root.querySelector('.pkx')) return;
    const h1 = root.querySelector('.hs-head h1'), title = h1 ? h1.textContent.replace(/^Pick'?Em\s*·\s*/i, '').trim() : '';
    if (!title) return;
    const year = (title.match(/20\d\d/) || [''])[0], th = themeOf(title), m = majorData(title);
    // монета, уровень, очки
    const art = medal ? medal.querySelector('.pk-medal-art') : null, grade = medal ? (medal.querySelector('.pk-medal-grade') || {}).textContent || '' : '';
    const pts = medal ? Number((medal.querySelector('.pk-medal-points b') || {}).textContent) || 0 : 0;
    const LV = (W.V35Badges && W.V35Badges.LV) || [[0, 'Бронза'], [5, 'Серебро'], [9, 'Золото'], [14, 'Алмаз']];
    let lv = 0; LV.forEach((x, i) => { if (pts >= x[0]) lv = i; }); const next = LV[lv + 1];
    const ch = challenges(title), doneN = ch.filter(x => x.st === 'done').length;
    const RW = (W.CS2Capsules && W.CS2Capsules.REWARD) || { challenge: 100, coin: 50, upgrade: 300 };
    try { W.CS2Capsules && W.CS2Capsules.sync(); } catch (e) {}
    const list = ch.map(x => `<li class="${x.st}">${ic(x.st === 'done' ? 'done' : x.st === 'fail' ? 'fail' : x.st === 'lock' ? 'lock' : x.ic)}<span>${esc(x.t)}</span>${x.sub ? `<em>${esc(x.sub)}</em>` : ''}<u class="pkx-rw">+${x.ic === 'coin' ? RW.coin : RW.challenge}</u></li>`).join('');
    const tokens = W.CS2Capsules ? W.CS2Capsules.tokens() : 0;
    // осталось дней
    // v131: после Мейджора — «Мейджор завершён» и чемпион, а не отсчёт до следующего
    let left = ''; const doneM = W.v131PickemDone && W.v131PickemDone(); if (doneM) left = `Мейджор завершён${doneM.poRes && doneM.poRes.champion ? ' · чемпион ' + doneM.poRes.champion : ''}`;
    // v146: Мейджор уже идёт — пишем текущий этап, а не отсчёт (раньше отсчёт мог указывать на дату другого события и
    // расходиться с кнопкой «Продолжить»: там «Pick'Em: Stage II», а здесь «9 дней до начала Мейджора»)
    else if ((() => { try { const ct = typeof currentTournament !== 'undefined' ? currentTournament : null; return ct && ct.isMajor && !ct.completed; } catch (e) { return false; } })()) { let stg = ''; try { const o = W.V33Pickem.openUnfilled && W.V33Pickem.openUnfilled(); stg = o ? ' · открыт прогноз: ' + o.label : ''; } catch (e) {} left = 'Мейджор идёт' + stg; }
    else try { const up = W.V33Pickem.upcomingMajor(), now = Number(SS().calendar.currentMs) || Date.now(), at = up && up.entry && up.entry.calendar && Number(up.entry.calendar.startMs);
      if (at && at > now && (!up.entry.name || up.entry.name === title)) { const d = Math.ceil((at - now) / 864e5); left = `${d} ${d % 10 === 1 && d % 100 !== 11 ? 'день' : d % 10 >= 2 && d % 10 <= 4 && (d % 100 < 10 || d % 100 >= 20) ? 'дня' : 'дней'} до начала Мейджора`; } } catch (e) {}
    const status = play.querySelector('.pk-bar .pk-st');
    const open = status && status.classList.contains('open');
    // сколько прогнозов сделано на открытой вкладке
    const filled = [...play.querySelectorAll('.pk-box:not(.ro) .pk-slot:not(.empty)')].length, need = [...play.querySelectorAll('.pk-box:not(.ro) .pk-slot')].length;
    const saved = need ? (filled >= need ? `<span class="pkx-saved ok">${ic('saved')}Прогнозы сохранены</span>` : `<span class="pkx-saved">Сделано ${filled}/${need}</span>`) : '';
    const wrap = D.createElement('section');
    wrap.className = `pkx pkx-t-${th.key}${th.light ? ' light' : ''}`;
    wrap.style.cssText = `--pk-bg:${th.bg};--pk-bg2:${th.bg2};--pk-acc:${th.acc};--pk-glow:${th.glow};--pk-pat:${svgUrl(th.patSvg || P[th.pat](th.pc))};--pk-rot:${th.rot || 0}deg;--pk-po:${th.po}`;
    let ev = ''; try { ev = W.CS2Stickers.eventSticker({ name: title, year }, 'holo'); } catch (e) {}
    wrap.innerHTML = `<i class="pkx-tex"></i>
      <header class="pkx-top">${ev ? `<span class="pkx-logo">${ev}</span>` : ''}<h1>${esc(title)}</h1><button type="button" class="pkx-tokens" data-nav="capsules"><span class="cpx-coin"></span><b>${tokens}</b> жетонов · капсулы</button></header>
      <div class="pkx-panel pkx-items-p"><h2>Предметы турнира</h2>${items(title, year, th)}</div>
      <div class="pkx-panel pkx-chal">
        <aside class="pkx-left"><h2>Испытание Pick'Em</h2>
          <div class="pkx-coin">${art ? art.innerHTML : ''}<span class="pkx-lv"><b>${lv + 1}</b></span><p>${next ? `Ещё <b>${Math.max(0, next[0] - pts)}</b> ${Math.max(0, next[0] - pts) === 1 ? 'очко' : 'очк.'} до улучшения монеты (${esc(next[1])}) и <b>+${RW.upgrade}</b> жетонов` : 'Монета улучшена до максимума'} · <span>${esc(grade)}</span></p></div>
          <ul class="pkx-ch">${list}</ul><small class="pkx-ch-n">Выполнено испытаний: ${doneN}/${ch.length}</small></aside>
        <div class="pkx-center"><div class="pkx-timer">${ic('clock')}<span>${left ? esc(left) : open ? 'Прогнозы открыты — сделайте их до начала этапа' : esc(status ? status.textContent : '')}</span></div>${board(title, Number(m.earnedPoints) || pts)}</div>
      </div>`;
    const center = wrap.querySelector('.pkx-center');
    center.appendChild(play);
    if (saved) center.insertAdjacentHTML('beforeend', `<div class="pkx-foot">${saved}</div>`);
    grid.replaceWith(wrap);
    const head = root.querySelector('.hs-head'); if (head) head.classList.add('pkx-hide');
    root.classList.add('pkx-page');
  }
  (H.AFTER || (H.AFTER = [])).push((pg, arg, root) => { if (pg !== 'pickem' || !root) return; try { skin(root); } catch (e) { console.warn('[v127 pickem]', e); } });
  W.CS2PickemSkin = { themeOf, THEMES, skin, challenges, force: '' };
  H.CLICKS.push(['[data-pkxcap]', el => { const [m, c] = el.dataset.pkxcap.split('|'); H.S.cpx = H.S.cpx || { tab: 'shop', open: null, f: '' }; H.S.cpx.tab = 'shop'; H.S.cpx.open = { stage: 'preview', mName: m, capId: c }; H.nav('capsules'); }]);
})();
  
