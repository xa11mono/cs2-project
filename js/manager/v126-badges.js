/* v126 — значки профиля: большая коллекция с уровнями престижа (вместо эмодзи-кружков v35).

   Пять уровней — пять форм, чтобы престиж читался с первого взгляда, даже в 18 px:
     0 Обычный     — эмалевый пин в бронзовом ободе
     1 Редкий      — серебряный щит с эмалью
     2 Эпический   — золотой орден-звезда с лентами
     3 Легендарный — голографический кристалл-шестигранник
     4 Мифический  — лавровый венок, тёмный медальон, рубин и лента с числом
   Линейки: выслуга на форуме, комментарии, лайки, посты, серия прогнозов, монеты Pick'Em (коллекция, золото,
   алмазы), сезонные награды (активист, ставочник, лучший комментарий), фанат клуба, «первопроходец», «ночная смена».
   У пользователя — по реальным данным сохранения; у болельщиков-ботов — детерминированно по нику и данным профиля.
   Профиль пользователя показывает и закрытые значки (серые) с условием получения. */
(function () {
  'use strict';
  const W = window, H = W.HS, B = W.V35Badges;
  if (!H || !B) return;
  const esc = H.esc;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const n2 = v => Math.round(v * 100) / 100;
  const mix = (a, b, t) => { const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = p(a), C = p(b); return '#' + A.map((v, i) => Math.round(v + (C[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const kfmt = v => v >= 10000 ? Math.round(v / 1000) + 'K' : v >= 1000 ? (v / 1000).toFixed(1).replace('.0', '') + 'K' : String(v);
  const pl = (v, a, b, c) => v % 10 === 1 && v % 100 !== 11 ? a : v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 10 || v % 100 >= 20) ? b : c;
  const DISP = "font-family:'StkBebas','Golos Text',Impact,sans-serif";

  // ---------------------------------------------------------------- иконки (сетка 24, обводка)
  const ICON = {
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3v3H8z" fill="currentColor"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9s10 4 10 9"/>',
    chat: '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    pen: '<path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M13.5 7l3.5 3.5"/>',
    orb: '<circle cx="12" cy="10.5" r="6.5"/><path d="M8.5 9a3.6 3.6 0 0 1 3-2.6M7 21h10M8.5 21l1-3.4h5l1 3.4"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    coins: '<ellipse cx="9" cy="7" rx="5" ry="2.2"/><path d="M4 7v4c0 1.2 2.2 2.2 5 2.2S14 12.2 14 11V7"/><ellipse cx="15" cy="14" rx="5" ry="2.2"/><path d="M10 14v4c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2v-4"/>',
    gem: '<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M9.5 4L12 9l2.5-5M12 9v11M7.5 9L12 20M16.5 9L12 20"/>',
    medal: '<path d="M8 3l4 6 4-6"/><circle cx="12" cy="14.5" r="5.5"/><path d="M12 11.6l.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2z" fill="currentColor"/>',
    flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.6 3-5.4 3.6-9.3 2.3 1.4 3.4 3.4 3.3 5.4 1-.6 1.6-1.6 1.8-2.9 2.3 1.9 4.3 4.3 4.3 6.8 0 3.6-2.5 6.2-6.5 6.2z"/><path d="M12 21c-1.6 0-2.7-1-2.7-2.6 0-1.5 1.4-2.4 1.8-4 1.6 1 3.6 2.4 3.6 4 0 1.6-1.1 2.6-2.7 2.6z"/>',
    crown: '<path d="M3.5 8l4 4 4.5-6.5 4.5 6.5 4-4-1.6 10.5H5.1z"/><path d="M5.5 21h13"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    bolt: '<path d="M13.5 2.5L5 13.5h6l-1 8 8.5-11h-6z"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/><path d="M16 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor"/>',
    megaphone: '<path d="M4 10v4h3l7 4.5v-13L7 10z"/><path d="M17.5 9a4 4 0 0 1 0 6M7 14l1.5 5.5"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 9.5h5v5h-5zM9 2.5v3.5M15 2.5v3.5M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
    shield: '<path d="M12 3l7.5 2.8v5.6c0 4.6-3.2 8.2-7.5 9.6-4.3-1.4-7.5-5-7.5-9.6V5.8z"/>'
  };

  // ---------------------------------------------------------------- рисование значка
  let UID = 0;
  const TIER = [
    { n: 'Обычный', c: '#c88a55' }, { n: 'Редкий', c: '#b9c6d6' }, { n: 'Эпический', c: '#f2c14e' }, { n: 'Легендарный', c: '#c58bff' }, { n: 'Мифический', c: '#ff5a6e' }
  ];
  const METAL = {
    bronze: ['#3b1f0c', '#7a4520', '#c4824a', '#f2c08a', '#fff0d8'],
    silver: ['#2a3038', '#5d6772', '#a9b4c0', '#e3e9ef', '#ffffff'],
    gold: ['#3c2803', '#8a5e0c', '#d39d26', '#f7d77a', '#fff6d2']
  };
  function art(def, size, opts) {
    opts = opts || {};
    const P = 'bd' + (++UID).toString(36) + '_', defs = [];
    const id = k => P + k;
    const lin = (k, stops, x1, y1, x2, y2) => { defs.push(`<linearGradient id="${id(k)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</linearGradient>`); return `url(#${id(k)})`; };
    const rad = (k, stops, cx, cy, r) => { defs.push(`<radialGradient id="${id(k)}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</radialGradient>`); return `url(#${id(k)})`; };
    const t = def.tier, col = def.color || '#4fa3e0', label = def.label != null ? String(def.label) : '';
    const metal = (m, k) => { const M = METAL[m]; return lin(k, [[0, M[3]], [.25, M[2]], [.5, M[4]], [.72, M[1]], [1, M[3]]], 0, 0, 1, 1); };
    const enamel = (k, c) => rad(k, [[0, mix(c, '#ffffff', .35)], [.6, c], [1, mix(c, '#000000', .55)]], .4, .32, .75);
    const icon = (cx, cy, s, color, sw) => `<g transform="translate(${n2(cx - s / 2)} ${n2(cy - s / 2)}) scale(${n2(s / 24)})" fill="none" stroke="${color}" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" style="color:${color}">${ICON[def.icon] || ICON.star}</g>`;
    const iconDeep = (cx, cy, s, color) => icon(cx, cy + .9, s, 'rgba(0,0,0,.45)', 2.4) + icon(cx, cy, s, color, 2.1);
    const gloss = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${lin('gl', [[0, '#fff', .55], [1, '#fff', 0]], 0, 0, 0, 1)}"/>`;
    // табличка с числом: тёмная плашка, светлая цифра — читается на любом фоне
    const plate = (y, metalFill) => { if (!label) return ''; const w = Math.max(16, label.length * 5.6 + 8);
      return `<rect x="${n2(32 - w / 2)}" y="${y}" width="${n2(w)}" height="11" rx="3" fill="#0d0f14" stroke="${metalFill}" stroke-width="1.2"/>` +
        `<text x="32" y="${y + 8.9}" text-anchor="middle" font-size="10.5" letter-spacing=".4" fill="#fff" style="${DISP}">${esc(label)}</text>`; };
    let body = '';
    if (t === 0) { // пин
      const rim = metal('bronze', 'rim');
      body = `<circle cx="32" cy="32" r="28" fill="${rim}"/><circle cx="32" cy="32" r="28" fill="none" stroke="#2a1608" stroke-width="1"/>` +
        `<circle cx="32" cy="32" r="22.5" fill="${enamel('en', col)}" stroke="#2a1608" stroke-width="1"/>` +
        `<circle cx="32" cy="32" r="20.5" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width=".8"/>` +
        iconDeep(32, label ? 28.5 : 32, 21, '#ffffff') + gloss(32, 20, 15, 7) + plate(46, rim);
    } else if (t === 1) { // щит
      const rim = metal('silver', 'rim'), sh = 'M32 3L57 11.5V30C57 45.5 46.5 55.5 32 61C17.5 55.5 7 45.5 7 30V11.5Z', inner = 'M32 8.5L52 15.4V30.2C52 42.6 43.6 50.8 32 55.4C20.4 50.8 12 42.6 12 30.2V15.4Z';
      body = `<path d="${sh}" fill="${rim}" stroke="#1d232b" stroke-width="1"/><path d="${inner}" fill="${enamel('en', col)}" stroke="#1d232b" stroke-width=".8"/>` +
        `<clipPath id="${id('cl')}"><path d="${inner}"/></clipPath><g clip-path="url(#${id('cl')})"><path d="M0 22L64 2V12L0 32z" fill="#fff" opacity=".13"/><path d="M0 50L64 30V34L0 54z" fill="#fff" opacity=".08"/></g>` +
        [[14, 15], [50, 15]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${METAL.silver[4]}" stroke="#1d232b" stroke-width=".4"/>`).join('') +
        iconDeep(32, label ? 27 : 30.5, 21, '#ffffff') + plate(41.5, rim);
    } else if (t === 2) { // орден-звезда
      const g = metal('gold', 'rim'); let star = '';
      for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + i * Math.PI / 8, r = i % 2 ? 21 : 30.5; star += (i ? 'L' : 'M') + n2(32 + Math.cos(a) * r) + ' ' + n2(30 + Math.sin(a) * r); }
      let rays = ''; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4; rays += `<path d="M32 30L${n2(32 + Math.cos(a) * 29)} ${n2(30 + Math.sin(a) * 29)}" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>`; }
      body = `<path d="M22 44L16 62L24 58L28 63L32 46z" fill="${mix(col, '#000000', .25)}"/><path d="M42 44L48 62L40 58L36 63L32 46z" fill="${mix(col, '#000000', .4)}"/>` +
        `<path d="${star}z" fill="${g}" stroke="#4a3006" stroke-width=".9"/>${rays}` +
        `<circle cx="32" cy="30" r="17" fill="${g}" stroke="#4a3006" stroke-width=".8"/><circle cx="32" cy="30" r="14.2" fill="${enamel('en', col)}" stroke="#4a3006" stroke-width=".7"/>` +
        iconDeep(32, 30, 16.5, METAL.gold[4]) + gloss(32, 21, 11, 5) + (label ? plate(47, g) : '');
    } else if (t === 3) { // кристалл
      const holo = lin('ho', [[0, '#ffb3e6'], [.2, '#9fe8ff'], [.4, '#fff3b0'], [.6, '#c7a8ff'], [.8, '#a8ffd8'], [1, '#ffb3e6']], 0, 0, 1, 1);
      const hex = r => { let p = ''; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; p += (i ? 'L' : 'M') + n2(32 + Math.cos(a) * r) + ' ' + n2(32 + Math.sin(a) * r); } return p + 'z'; };
      let fac = ''; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; fac += `<path d="M${n2(32 + Math.cos(a) * 21)} ${n2(32 + Math.sin(a) * 21)}L${n2(32 + Math.cos(a) * 30)} ${n2(32 + Math.sin(a) * 30)}" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/>`; }
      const deep = rad('dp', [[0, mix(col, '#ffffff', .15)], [.7, mix(col, '#0b0d14', .45)], [1, '#0b0d14']], .5, .38, .7);
      body = `<path d="${hex(30)}" fill="${holo}" stroke="#2b2350" stroke-width="1"/>${fac}<path d="${hex(30)}" fill="${lin('sh', [[0, '#fff', .45], [.5, '#fff', 0], [1, '#000', .25]], 0, 0, 0, 1)}"/>` +
        `<path d="${hex(21)}" fill="${deep}" stroke="#fff" stroke-opacity=".85" stroke-width="1"/>` +
        iconDeep(32, label ? 28.5 : 32, 17, '#ffffff') +
        [[13, 12, 2.2], [52, 49, 1.8], [50, 13, 1.3]].map(([x, y, r]) => `<path d="M${x} ${y - r * 2}Q${x} ${y} ${x + r * 2} ${y}Q${x} ${y} ${x} ${y + r * 2}Q${x} ${y} ${x - r * 2} ${y}Q${x} ${y} ${x} ${y - r * 2}z" fill="#fff"/>`).join('') +
        plate(42, '#c7a8ff');
    } else { // мифический: венок
      const g = metal('gold', 'rim'); let leaves = '';
      for (const k of [-1, 1]) { let stem = '';
        for (let i = 0; i < 10; i++) { const th = (252 - i * 15.5) * Math.PI / 180, x0 = 32 + 25 * Math.cos(th), y = 31 - 25 * Math.sin(th), x = k < 0 ? x0 : 64 - x0;
          stem += (i ? 'L' : 'M') + n2(x) + ' ' + n2(y);
          const ang = Math.atan2(-Math.cos(th), -Math.sin(th)) * 180 / Math.PI - 90, rot = (k < 0 ? ang : -ang) + k * 38, sz = 1 - i * .035;
          leaves += `<ellipse cx="${n2(x + k * -2.2)}" cy="${n2(y)}" rx="${n2(2.5 * sz)}" ry="${n2(5.6 * sz)}" transform="rotate(${n2(rot)} ${n2(x)} ${n2(y)})" fill="${g}" stroke="#4a3006" stroke-width=".5"/>` +
            `<ellipse cx="${n2(x + k * 2.4)}" cy="${n2(y + 1)}" rx="${n2(2.2 * sz)}" ry="${n2(4.8 * sz)}" transform="rotate(${n2(rot - k * 70)} ${n2(x)} ${n2(y)})" fill="${g}" stroke="#4a3006" stroke-width=".5"/>`; }
        leaves = `<path d="${stem}" fill="none" stroke="#8a5e0c" stroke-width="1.2"/>` + leaves; }
      const deep = rad('dp', [[0, mix(col, '#ffffff', .1)], [.65, mix(col, '#000000', .55)], [1, '#07080b']], .5, .35, .75);
      body = leaves + `<circle cx="32" cy="30" r="18.5" fill="${g}" stroke="#4a3006" stroke-width=".9"/><circle cx="32" cy="30" r="15.6" fill="${deep}" stroke="#4a3006" stroke-width=".7"/>` +
        `<circle cx="32" cy="30" r="13.8" fill="none" stroke="${METAL.gold[3]}" stroke-width=".5" stroke-dasharray="1 1.2"/>` +
        iconDeep(32, 29.5, 15, METAL.gold[3]) +
        `<path d="M29 9.2L32 5.2L35 9.2L32 13.4z" fill="${rad('gm', [[0, '#ffd0d6'], [.5, '#ff2d4b'], [1, '#6e0016']], .4, .3, .7)}" stroke="#4a3006" stroke-width=".6"/>` + gloss(32, 22, 11, 5) +
        (label ? `<path d="M12 48H52L49 53L52 58H12L15 53z" fill="${lin('rb', [[0, '#8e0f22'], [.5, '#d9283f'], [1, '#8e0f22']], 0, 0, 1, 0)}" stroke="#3a0610" stroke-width=".8"/>` +
          `<text x="32" y="56.6" text-anchor="middle" font-size="9.5" letter-spacing=".6" fill="#fff4d6" style="${DISP}">${esc(label)}</text>` : '');
    }
    const locked = opts.locked;
    return `<svg class="v126-bdg-svg t${t}${locked ? ' locked' : ''}" viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs.join('')}</defs>${body}</svg>`;
  }

  // ---------------------------------------------------------------- каталог: линейки с порогами
  // каждый порог — [значение, уровень, название]; значок показывает высший достигнутый, следующий — как цель
  const LINES = [
    { k: 'years', icon: 'hourglass', color: '#3f8fe0', name: 'Выслуга', unit: v => v + (v % 10 === 1 && v % 100 !== 11 ? ' год' : v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 10 || v % 100 >= 20) ? ' года' : ' лет') + ' на форуме',
      steps: [[1, 0, 'Свой человек'], [3, 1, 'Завсегдатай'], [5, 2, 'Ветеран форума'], [8, 3, 'Старожил'], [12, 4, 'Хранитель форума']], label: v => String(v) },
    { k: 'comments', icon: 'chat', color: '#2fb27a', name: 'Комментарии', unit: v => kfmt(v) + ' ' + pl(v, 'комментарий', 'комментария', 'комментариев'),
      steps: [[10, 0, 'Голос трибун'], [50, 1, 'Завсегдатай обсуждений'], [200, 2, 'Голос форума'], [500, 3, 'Трибун'], [1000, 4, 'Легенда форума']], label: v => kfmt(v) },
    { k: 'likes', icon: 'heart', color: '#e9476a', name: 'Лайки', unit: v => kfmt(v) + ' ' + pl(v, 'лайк получен', 'лайка получено', 'лайков получено'),
      steps: [[50, 0, 'Есть контакт'], [300, 1, 'Любимец ветки'], [1500, 2, 'Любимец публики'], [6000, 3, 'Звезда форума'], [20000, 4, 'Икона сообщества']], label: v => kfmt(v) },
    { k: 'posts', icon: 'pen', color: '#f0a23a', name: 'Посты', unit: v => v + ' ' + pl(v, 'пост', 'поста', 'постов'),
      steps: [[3, 0, 'Автор'], [15, 1, 'Колумнист'], [50, 2, 'Обозреватель'], [150, 3, 'Главный редактор']], label: v => String(v) },
    { k: 'streak', icon: 'orb', color: '#8b6cf0', name: 'Прогнозы', unit: v => v + ' ' + pl(v, 'прогноз', 'прогноза', 'прогнозов') + ' подряд',
      steps: [[3, 0, 'Чуйка'], [5, 1, 'Оракул'], [8, 2, 'Провидец'], [12, 3, 'Нострадамус'], [20, 4, 'Всевидящее око']], label: v => String(v) },
    { k: 'coins', icon: 'coins', color: '#ff8a1f', name: "Pick'Em", unit: v => v + ' ' + pl(v, 'монета', 'монеты', 'монет') + " Pick'Em",
      steps: [[1, 0, "Дебют в Pick'Em"], [3, 1, 'Коллекционер'], [6, 2, 'Хранитель монет'], [10, 3, 'Нумизмат Мейджоров']], label: v => String(v) },
    { k: 'gold', icon: 'medal', color: '#d99a1e', name: 'Золото', unit: v => v + ' ' + pl(v, 'золотая монета', 'золотые монеты', 'золотых монет'),
      steps: [[1, 2, "Золотой Pick'Em"], [3, 3, 'Золотой фонд']], label: v => String(v) },
    { k: 'diamond', icon: 'gem', color: '#43c6e8', name: 'Алмаз', unit: v => v + ' ' + pl(v, 'алмазная монета', 'алмазные монеты', 'алмазных монет'),
      steps: [[1, 3, "Алмазный Pick'Em"], [3, 4, 'Ясновидец']], label: v => String(v) }
  ];
  const SPECIAL = {   // разовые и сезонные
    since: (y) => ({ id: 'since', tier: 0, icon: 'calendar', color: '#4f8fd6', t: `На сайте с ${y}`, d: 'Дата регистрации', label: "'" + String(y).slice(-2) }),
    active: (y) => ({ id: 'active' + y, tier: 1, icon: 'megaphone', color: '#2fb27a', t: `Активист сезона ${y}`, d: '15+ комментариев за сезон', label: String(y) }),
    bettor: (y) => ({ id: 'bettor' + y, tier: 2, icon: 'chip', color: '#e0a21f', t: `Ставочник года ${y}`, d: '15+ ставок и плюс по итогам года', label: String(y) }),
    top: (y) => ({ id: 'top' + y, tier: 2, icon: 'star', color: '#e9476a', t: `Лучший комментарий ${y}`, d: 'Самый залайканный комментарий года', label: String(y) }),
    first: () => ({ id: 'first', tier: 0, icon: 'bolt', color: '#f5c518', t: 'Первопроходец', d: 'Первым прокомментировал громкую новость' }),
    night: () => ({ id: 'night', tier: 1, icon: 'moon', color: '#5161d6', t: 'Ночная смена', d: 'Не пропускает ночные матчи' }),
    hot: (n) => ({ id: 'hot', tier: n >= 30 ? 2 : 1, icon: 'flame', color: '#ff5a1f', t: `На связи ${n} дней`, d: 'Заходит на форум каждый день', label: String(n) }),
    fan: (team, years) => ({ id: 'fan', tier: years >= 5 ? 2 : years >= 2 ? 1 : 0, icon: 'shield', color: teamColor(team), t: `Фанат ${team}`, d: years ? `Болеет ${years} ${years < 5 ? 'года' : 'лет'}` : 'Любимая команда', team }),
    crown: (y) => ({ id: 'crown' + y, tier: 4, icon: 'crown', color: '#b0182c', t: `Король Pick'Em ${y}`, d: "Лучший результат Pick'Em за год", label: String(y) })
  };
  function teamColor(team) { try { const u = W.V31Media && W.V31Media.url('team', team), f = u && String(u).split('/').pop(), c = f && W.CS2_TEAM_TINT && W.CS2_TEAM_TINT[f];
    if (c && Math.max(...c) - Math.min(...c) > 50) return '#' + c.map(x => Math.round(x).toString(16).padStart(2, '0')).join(''); } catch (e) {} return '#e07a2a'; }

  function fromStats(S) {
    const out = [], locked = [];
    LINES.forEach(L => {
      if ((S.skip || []).includes(L.k)) return;
      const v = Math.max(0, Math.floor(Number(S[L.k]) || 0)); let got = null, next = null;
      L.steps.forEach(st => { if (v >= st[0]) got = st; else if (!next) next = st; });
      if (got) out.push({ id: L.k, tier: got[1], icon: L.icon, color: L.color, t: got[2], d: L.unit(v), label: L.label(v), line: L.name, next: next ? `${next[2]} — ${L.unit(next[0])}` : '' });
      if (next && S.withLocked) locked.push({ id: L.k + '-next', tier: next[1], icon: L.icon, color: L.color, t: next[2], d: `Нужно: ${L.unit(next[0])} (сейчас ${L.label(v)})`, label: L.label(next[0]), line: L.name, locked: true, prog: Math.min(1, v / next[0]) });
    });
    return { out, locked };
  }
  const html = (b, size, cls) => `<span class="v126-bdg${cls ? ' ' + cls : ''}${b.locked ? ' locked' : ''}" data-tip="${esc(b.t + (b.d ? ' · ' + b.d : '') + (b.locked ? '' : ' · ' + TIER[b.tier].n))}" style="--tc:${TIER[b.tier].c}">${b.html || art(b, size, { locked: b.locked })}</span>`;

  // ---------------------------------------------------------------- данные пользователя и ботов
  const SS = () => (typeof seasonState !== 'undefined' ? seasonState : null);
  const yearNow = () => { try { return H.yearOf((SS() && SS().currentSeason) || 1); } catch (e) { return 2026; } };
  const lvOf = pts => { let k = 0; (B.LV || []).forEach((x, i) => { if ((Number(pts) || 0) >= x[0]) k = i; }); return k; };
  function myStats(withLocked) {
    const s = SS(), P = s && s.v35Prof || { coins: {}, badges: [] }, y = yearNow();
    let mine = [], likes = 0; try { const pr = W.V33Comments && W.V33Comments.prof ? W.V33Comments.prof() : null; mine = (pr && pr.mine) || (W.V33Comments && W.V33Comments.mine ? W.V33Comments.mine() : []) || []; likes = mine.reduce((a, c) => a + (Number(c.likes) || 0) + (Number(c.myLikes) || 0), 0); } catch (e) {}
    const f = (W.V29News && W.V29News.fan && W.V29News.fan()) || {};
    const coins = Object.values(P.coins || {}).map(c => lvOf(c.pts));
    return { withLocked, skip: ['posts'], years: y - (P.since || y), comments: mine.length, likes, posts: 0, streak: f.best || 0, coins: coins.length, gold: coins.filter(l => l >= 2).length, diamond: coins.filter(l => l >= 3).length, since: P.since || y, seasonal: P.badges || [] };
  }
  function itemsFor(S, team) {
    const { out, locked } = fromStats(S);
    const list = [SPECIAL.since(S.since)].concat(out);
    (S.seasonal || []).forEach(b => { if (SPECIAL[b.type]) list.push(SPECIAL[b.type](b.y)); });
    (S.extra || []).forEach(b => list.push(b));
    if (team) list.push(SPECIAL.fan(team, S.fanYears || 0));
    list.sort((a, b) => b.tier - a.tier);
    return { badges: list, locked };
  }
  function botStats(nick, extra) {
    extra = extra || {};
    const h = h32('bdg|' + nick), y = yearNow(), joined = Number(extra.joined) || Math.max(2012, y - (h % 14)), years = Math.max(0, y - joined);
    const act = ((h >>> 4) % 100) / 100;   // насколько активен человек (0…1), у большинства — средне
    const lvl = Math.pow(act, 2.2);
    const comments = Math.round((extra.comments || 0) * 12 + years * 15 * lvl + lvl * 480);
    const likes = Math.round((Number(extra.karma) || comments * 4) * .5);
    const majors = Math.min(12, Math.round(years * .8 * (.3 + act)));
    const gold = Math.round(majors * ((h >>> 13) % 40) / 100), diamond = (h >>> 17) % 23 === 0 ? 1 + (h >>> 21) % 3 : 0;
    const extraB = [];
    if (h % 7 === 0) extraB.push(SPECIAL.first()); if (h % 9 === 2) extraB.push(SPECIAL.night()); if (h % 5 === 1) extraB.push(SPECIAL.hot(7 + h % 60));
    if (h % 31 === 0) extraB.push(SPECIAL.crown(y - 1 - h % 3));
    const seasonal = []; if (h % 11 === 0) seasonal.push({ type: 'active', y: y - 1 }); if (h % 17 === 0) seasonal.push({ type: 'top', y: y - 1 }); if (h % 19 === 0) seasonal.push({ type: 'bettor', y: y - 1 });
    return { years, since: joined, comments, likes, posts: Number(extra.posts) || Math.round(lvl * 60), streak: (h >>> 25) % 9 + (lvl > .5 ? 5 : 0), coins: majors, gold, diamond, seasonal, extra: extraB, fanYears: Math.min(years, 1 + h % 9) };
  }

  // ---------------------------------------------------------------- встраивание
  const origBot = B.botItems, origMy = B.myItems;
  B.botItems = function (nick, extra) {
    const it = origBot ? origBot.call(B, nick) : { coins: [], badges: [] };
    let team = ''; try { team = B.fanTeam ? B.fanTeam(nick, false) : ''; } catch (e) {}
    const x = itemsFor(botStats(nick, extra), team);
    return Object.assign({}, it, { badges: x.badges.slice(0, 7), allBadges: x.badges });
  };
  B.myItems = function () {
    const it = origMy ? origMy.call(B) : { coins: [], badges: [] };
    let team = ''; try { team = B.fanTeam ? B.fanTeam('', true) : ''; } catch (e) {}
    const x = itemsFor(myStats(true), team);
    return Object.assign({}, it, { badges: x.badges, locked: x.locked });
  };
  B.badgeHtml = (b, sm) => (b && b.tier != null ? html(b, sm ? 18 : 30, sm ? 'sm' : '') : '');
  B.badgeArt = art;
  // профиль пользователя: ряд значков под ником + витрина «Значки» с закрытыми целями
  const origFan = H.PAGES.fan;
  if (origFan) H.PAGES.fan = arg => {
    let page = origFan(arg);
    try {
      const it = B.myItems();
      const row = `<span class="v126-bdg-row">${it.badges.slice(0, 8).map(b => html(b, 34)).join('')}</span>`;
      page = page.replace(/<span class="v35-bdg[^"]*"[^>]*>[^<]*<\/span>/g, '');   // старые эмодзи-значки v35
      page = page.includes('<p class="hs-dim">') ? page.replace('<p class="hs-dim">', row + '<p class="hs-dim">') : page.replace('</h1>', '</h1>' + row);
      const card = b => `<div class="v126-bdg-card${b.locked ? ' locked' : ''}" style="--tc:${TIER[b.tier].c}">${html(b, 64)}<div><b>${esc(b.t)}</b><small>${esc(b.d || '')}</small>` +
        `${b.locked ? `<i class="v126-prog"><u style="width:${Math.round((b.prog || 0) * 100)}%"></u></i>` : `<em>${TIER[b.tier].n}${b.line ? ' · ' + esc(b.line) : ''}</em>`}</div></div>`;
      const shelf = (H.box ? H.box : (t, x) => `<section class="hs-box"><h3>${t}</h3>${x}</section>`)(`Значки · ${it.badges.length}`,
        `<div class="v126-bdg-grid">${it.badges.map(card).join('')}</div>${it.locked.length ? `<h4 class="v126-bdg-h">Следующие цели</h4><div class="v126-bdg-grid">${it.locked.map(card).join('')}</div>` : ''}` +
        `<p class="v126-bdg-legend">${TIER.map(t => `<span style="--tc:${t.c}">${t.n}</span>`).join('')}</p>`);
      page = page.replace('<div class="hs-grid2">', shelf + '<div class="hs-grid2">');
    } catch (e) { console.warn('[v126 badges]', e); }
    return page;
  };
  W.CS2Badges = { art, LINES, SPECIAL, TIER, fromStats, botStats, itemsFor, myStats };
})();
