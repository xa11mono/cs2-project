/* v84 — «кузница» трофеев.
   1) Кубки Tier-1 / S-Tier / Major: у каждого организатора свои силуэты (по мотивам реальных
      трофеев HLTV), силуэт одного организатора никогда не используется другим.
        IEM ........... гравированная стеклянная тарелка; IEM Cologne/Katowice — чаша из колец
        ESL Pro League  витая чёрная колонна с золотой лентой
        BLAST ......... треугольник с внутренним вырезом (золото/серебро/синий/фиолетовый/чёрный)
        PGL ........... «коготь» из трёх изогнутых лезвий на постаменте
        Major ......... большой двуручный кубок с лентой MAJOR
        DreamHack ..... Masters — серебряный кубок с ручками; Open — стеклянный блок
        StarLadder .... гранёная звезда на колонне
        Thunderpick ... золотая спираль со сферой
        Perfect World / CS Asia — стеклянная сфера в чаше
        EWC ........... хрустальный обелиск в золотой раме
        FISSURE ....... факел
        BetBoom ....... кристалл в лапках
        CCT ........... вертикальное кольцо с камнем
        прочие ........ классический кубок, медальон-монета или «чек» (как у части Tier-1)
   2) Личные и командные награды года — у каждой свой силуэт.
   3) Tier-2 / Tier-3 / квалификации — не кубки: розетки, нашивки, вымпелы, билеты.
   Все SVG детерминированы: один и тот же турнир+сезон всегда даёт одинаковый трофей. */
(function () {
  'use strict';
  let UID = 0;
  const n = v => Math.round(v * 100) / 100;
  function hash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const METAL = {
    gold:   ['#6b4508', '#b77d16', '#f2c64b', '#fff2b8', '#d9a22b', '#7a500c'],
    pale:   ['#6f5a2c', '#b89a52', '#e9d59a', '#fffbe6', '#cdb376', '#7b6535'],
    silver: ['#4a525c', '#9aa4af', '#dfe5ec', '#ffffff', '#b8c1cb', '#59626d'],
    chrome: ['#2b3138', '#7d8894', '#e9eef4', '#ffffff', '#8f9aa6', '#353c45'],
    rose:   ['#6a3a33', '#b9776a', '#f1c3b6', '#fff0ea', '#cf9686', '#76443b'],
    bronze: ['#4f2f14', '#9a6430', '#d9a066', '#ffe1bf', '#b77b43', '#5e3a19'],
    black:  ['#050607', '#1b2026', '#3b434d', '#6d7782', '#262c33', '#08090b'],
    copper: ['#5a2810', '#a5542a', '#e88c58', '#ffd2b4', '#c06a3a', '#64301a'],
    // анодированные и градиентные покрытия — для разнообразия на длинной дистанции
    cobalt:  ['#0b1f4d', '#1f4fb5', '#5f95ff', '#d5e6ff', '#3a6fd8', '#10285e'],
    violet:  ['#2a1150', '#5b2fb0', '#a47bff', '#efe4ff', '#7a4fd8', '#331866'],
    emerald: ['#06301f', '#11795a', '#3fd3a0', '#d9fff0', '#1fa57a', '#0a3d29'],
    gunmetal:['#15181c', '#3f464f', '#8b96a3', '#dfe6ee', '#5a636e', '#1c2026'],
    ruby:    ['#3d0710', '#9b1730', '#ef4a63', '#ffd9df', '#c42742', '#4d0a16'],
    holo:    ['#2b1b5e', '#3c7bd8', '#59e0e6', '#ffffff', '#d66bd8', '#4a1f6b'],
    blackgold:['#050607', '#2a2414', '#c9a24a', '#fff0b8', '#5c4a1c', '#0b0a07']
  };
  // Допустимые покрытия по организатору: силуэт фиксирован, отделка меняется по сезонам.
  const FINISH = {
    Major: ['gold', 'gold', 'gold', 'blackgold'],
    'IEM-big': ['silver', 'chrome', 'silver', 'chrome', 'gunmetal'],
    IEM: ['silver', 'chrome', 'silver', 'chrome', 'gunmetal'],
    EPL: ['gold', 'pale', 'rose', 'blackgold', 'chrome'],
    BLAST: ['gold', 'silver', 'cobalt', 'violet', 'black', 'holo', 'pale', 'gunmetal'],
    PGL: ['chrome', 'silver', 'rose', 'cobalt', 'violet', 'gunmetal'],
    DHM: ['silver', 'chrome', 'rose', 'gunmetal'],
    SL: ['gold', 'silver', 'rose', 'ruby', 'black'],
    Thunderpick: ['gold', 'pale', 'blackgold', 'cobalt'],
    PW: ['gold', 'silver', 'chrome', 'emerald'],
    FISSURE: ['copper', 'chrome', 'gold', 'violet'],
    BetBoom: ['chrome', 'gold', 'emerald', 'gunmetal'],
    CCT: ['silver', 'chrome', 'gold', 'cobalt', 'black'],
    EWC: ['gold', 'gold', 'pale', 'blackgold'],
    Nations: ['gold', 'silver', 'pale', 'chrome', 'blackgold'],
    FiRe: ['gold', 'pale', 'blackgold'],
    custom: ['silver', 'gold', 'chrome', 'rose', 'bronze', 'cobalt', 'emerald', 'gunmetal', 'ruby', 'black']
  };
  const GLASS_POOL = ['ice', 'blue', 'violet', 'cyan', 'mint', 'amber', 'smoke', 'pink', 'ruby'];
  const GLASS = {
    ice: '#bfe6ff', blue: '#4f8fff', violet: '#a77bff', cyan: '#4fd8e8', mint: '#5be0ad',
    ruby: '#ff5d6c', amber: '#ffb347', smoke: '#7c8796', pink: '#ff7ad9'
  };
  function mix(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const x = p(a), y = p(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  function Ctx() { this.id = 'tf' + (++UID).toString(36) + '_'; this.k = 0; this.defs = []; this.memo = {}; }
  Ctx.prototype.grad = function (key, x1, y1, x2, y2, stops, radial) {
    if (this.memo[key]) return this.memo[key];
    const id = this.id + (this.k++);
    const st = stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('');
    this.defs.push(radial ? `<radialGradient id="${id}" cx="${x1}" cy="${y1}" r="${x2}">${st}</radialGradient>` : `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st}</linearGradient>`);
    return (this.memo[key] = `url(#${id})`);
  };
  Ctx.prototype.mH = function (m) { const c = METAL[m] || METAL.silver; return this.grad('h' + m, 0, 0, 1, 0, [[0, c[0]], [.15, c[1]], [.35, c[2]], [.47, c[3]], [.62, c[4]], [1, c[5]]]); };
  Ctx.prototype.mV = function (m) { const c = METAL[m] || METAL.silver; return this.grad('v' + m, 0, 0, 0, 1, [[0, c[3]], [.3, c[2]], [.7, c[1]], [1, c[0]]]); };
  Ctx.prototype.mR = function (m) { const c = METAL[m] || METAL.silver; return this.grad('r' + m, .35, .3, .75, 0, [[0, c[3]], [.3, c[2]], [.75, c[4]], [1, c[5]]], true); };
  const gc = t => GLASS[t] || (/^#[0-9a-f]{6}$/i.test(String(t)) ? t : GLASS.ice);
  Ctx.prototype.gl = function (t) { const c = gc(t); return this.grad('g' + c, 0, 0, 1, 1, [[0, '#ffffff', .9], [.35, mix(c, '#ffffff', .45), .6], [.7, c, .55], [1, mix(c, '#000000', .45), .85]]); };
  Ctx.prototype.glR = function (t) { const c = gc(t); return this.grad('gr' + c, .38, .32, .7, 0, [[0, '#ffffff', .95], [.3, mix(c, '#ffffff', .4), .75], [.8, c, .6], [1, mix(c, '#000000', .5), .9]], true); };
  Ctx.prototype.flat = function (c, key) { c = /^#[0-9a-f]{6}$/i.test(String(c)) ? c : '#2f6fe0'; return this.grad('f' + (key || c), 0, 0, 0, 1, [[0, mix(c, '#ffffff', .35)], [.5, c], [1, mix(c, '#000000', .4)]]); };
  Ctx.prototype.shadow = function () { return this.grad('sh', .5, .5, .5, 0, [[0, '#000', .55], [1, '#000', 0]], true); };
  Ctx.prototype.svg = function (body, vb, cls, label) {
    return `<svg class="tw-svg ${cls || ''}" viewBox="${vb || '5 1 54 71'}" xmlns="http://www.w3.org/2000/svg"${label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}><defs>${this.defs.join('')}</defs>${body}</svg>`;
  };
  const shine = (d, w) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${w || 1}" stroke-linecap="round"/>`;
  const txt = (x, y, s, size, fill, extra) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="${size}" letter-spacing=".3" fill="${fill}"${extra || ''}>${esc(s)}</text>`;

  // ---------------------------------------------------------------- постаменты
  function pedestal(c, kind, metal, w, label) {
    w = w || 26;
    const x = 32 - w / 2;
    let s = `<ellipse cx="32" cy="69.6" rx="${n(w * .62)}" ry="1.9" fill="${c.shadow()}"/>`;
    if (kind === 'wood') {
      s += `<rect x="${n(x)}" y="61" width="${w}" height="8.2" rx=".8" fill="${c.flat('#5a3418', 'wood')}"/>` +
        `<rect x="${n(x + 2)}" y="57.6" width="${w - 4}" height="3.8" rx=".6" fill="${c.flat('#7a4a24', 'wood2')}"/>`;
    } else if (kind === 'round') {
      s += `<path d="M${n(x)} 61v6.2a${n(w / 2)} 2.2 0 0 0 ${w} 0V61z" fill="${c.mH('black')}"/><ellipse cx="32" cy="61" rx="${n(w / 2)}" ry="2.2" fill="${c.mV('black')}"/>`;
    } else if (kind === 'slab') {
      s += `<path d="M${n(x)} 69L${n(x + 2.5)} 57.5H${n(x + w - 2.5)}L${n(x + w)} 69z" fill="${c.mV('black')}"/>`;
    } else {
      s += `<rect x="${n(x)}" y="63" width="${w}" height="6.2" rx=".6" fill="${c.mV('black')}"/><rect x="${n(x + w * .14)}" y="58.4" width="${n(w * .72)}" height="4.8" rx=".5" fill="${c.mV('black')}"/>`;
    }
    s += `<rect x="${n(32 - w * .24)}" y="${kind === 'round' ? 63.6 : 64.6}" width="${n(w * .48)}" height="2.6" rx=".4" fill="${c.mH(metal || 'gold')}"/>`;
    if (label) s += txt(32, kind === 'round' ? 65.7 : 66.7, label, 1.9, '#1a1205');
    s += shine(`M${n(x + 1)} ${kind === 'slab' ? 69 : 63.3}H${n(x + w - 1)}`, .4);
    return s;
  }

  // ---------------------------------------------------------------- организаторы
  const D = {};
  // диск без подставки: крупнее и по центру кадра, с мягкой тенью
  const bareDisc = (c, body, cy) => `<ellipse cx="32" cy="67" rx="17" ry="2" fill="${c.shadow()}"/><g transform="translate(32 36) scale(1.2) translate(-32 -${cy})">${body}</g>`;
  D.iemPlate = (c, o) => { // стеклянная гравированная тарелка IEM
    const g = o.glass, cy = 31, R = 23.5;
    let s = (o.bare ? '' : pedestal(c, 'slab', o.metal, 20) +
      `<path d="M28 52L26 58H38L36 52z" fill="${c.mH('chrome')}"/>`) +
      `<circle cx="32" cy="${cy}" r="${R + 1.2}" fill="${c.mH('chrome')}"/>` +
      `<circle cx="32" cy="${cy}" r="${R}" fill="${c.glR(g)}"/>`;
    [19.5, 15.5, 11.8].forEach((r, i) => { s += `<circle cx="32" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity="${.35 - i * .07}" stroke-width=".55" stroke-dasharray="${i === 0 ? '1.4 .9' : i === 1 ? '3 1' : 'none'}"/>`; });
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; s += `<line x1="${n(32 + Math.cos(a) * 20.6)}" y1="${n(cy + Math.sin(a) * 20.6)}" x2="${n(32 + Math.cos(a) * 22.6)}" y2="${n(cy + Math.sin(a) * 22.6)}" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>`; }
    s += `<circle cx="32" cy="${cy - 2.8}" r="3.2" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".9"/>` + txt(32, cy + 3.4, 'INTEL EXTREME', 2.2, '#fff', ' fill-opacity=".9"') + txt(32, cy + 6.6, 'MASTERS', 2.4, '#fff', ' fill-opacity=".9"');
    if (o.sub) s += txt(32, cy + 10, o.sub, 1.9, '#fff', ' fill-opacity=".75"');
    s += shine(`M15 ${cy - 8}A19 19 0 0 1 27 ${cy - 19}`, 1.4);
    return o.bare ? bareDisc(c, s, cy) : s;
  };
  D.ringChalice = (c, o) => { // IEM Cologne: стопка колец над круглой чашей, тонкая ножка, чёрная база
    const m = o.metal || 'silver';
    let s = `<ellipse cx="32" cy="69.6" rx="15" ry="1.9" fill="${c.shadow()}"/>` +
      `<path d="M21 69.2V62.6C21 61.4 25.5 60.6 32 60.6S43 61.4 43 62.6V69.2z" fill="${c.mH('black')}"/><ellipse cx="32" cy="62.6" rx="11" ry="1.6" fill="${c.mV('black')}"/>` +
      `<path d="M27 60.6C29.5 57.5 30.8 53 30.9 47H33.1C33.2 53 34.5 57.5 37 60.6z" fill="${c.mH(m)}"/>` +
      `<path d="M15.5 33C15.5 42 22.5 48 32 48S48.5 42 48.5 33z" fill="${c.mH(m)}"/><ellipse cx="32" cy="41" rx="7" ry="2.2" fill="#fff" fill-opacity=".25"/>`;
    const rows = 8;
    for (let i = 0; i < rows; i++) {
      const y = 4 + i * 3.6, w = 25 + i * .9;
      s += `<path d="M${n(32 - w / 2)} ${n(y)}h${n(w)}v3.3h${n(-w)}z" fill="${c.mH(m)}"/>` +
        `<path d="M${n(32 - w / 2)} ${n(y + 3.3)}h${n(w)}" stroke="${o.tint ? gc(o.tint) : '#000'}" stroke-opacity="${o.tint ? .8 : .35}" stroke-width=".6"/>`;
    }
    s += `<circle cx="44" cy="30" r="1.6" fill="${c.mV('black')}"/>` + shine('M18.5 5V32', 1);
    return s;
  };
  D.eplSpire = (c, o) => { // витая колонна ESL Pro League
    let s = pedestal(c, 'round', o.metal, 18) +
      `<path d="M25 58C22 44 25 30 29 16C30.5 10 34 6 38 3C37 14 40 28 39 40C38.5 47 39 53 39 58z" fill="${c.mH(o.body || 'black')}"/>` +
      `<path d="M27.5 57C30 50 36 46 36.8 38C35 32 31 30 30.2 22C31 15 34 9 36.6 5C33.8 12 32.6 18 33.6 24C35 31 38.6 34 37.6 42C36.6 50 31 53 29.8 57z" fill="${c.mH(o.metal)}"/>` +
      txt(33.5, 30, 'ESL', 2.4, '#fff') + txt(33.5, 33.4, 'PRO', 2.6, '#fff') + txt(33.5, 36.6, 'LEAGUE', 1.9, '#fff') +
      shine('M28.6 50C27.4 40 28.6 28 31 18', .8);
    return s;
  };
  D.blastTri = (c, o) => { // треугольник BLAST
    const fill = o.glass ? c.gl(o.glass) : c.mH(o.metal), edge = o.glass ? c.mH('chrome') : c.mV(o.metal);
    const big = o.big ? 1.08 : 1, top = 6 / big, L = 32 - 25 * big, R = 32 + 25 * big, B = 64;
    let s = `<ellipse cx="32" cy="68.8" rx="22" ry="2" fill="${c.shadow()}"/>` +
      `<path d="M32 ${n(top)}L${n(R)} ${B}H${n(L)}z" fill="${fill}" stroke="${edge}" stroke-width="1.2"/>` +
      `<path d="M32 ${n(top + 22)}L${n(32 + 10.5)} ${B - 8}H${n(32 - 10.5)}z" fill="#0b0d12" fill-opacity=".85"/>` +
      `<path d="M${n(32 - 7)} ${n(top + 14)}L${n(32 + 6)} ${n(top + 9)}" stroke="#0b0d12" stroke-opacity=".7" stroke-width="2.2"/>`;
    if (o.stripes) for (let i = 1; i < 9; i++) s += `<path d="M${n(L + i * 5.6)} ${B}L${n(L + i * 5.6 + 9)} ${n(B - 16)}" stroke="#000" stroke-opacity=".22" stroke-width="1.1"/>`;
    s += shine(`M${n(32 - 2)} ${n(top + 5)}L${n(L + 6)} ${B - 3}`, 1);
    return s;
  };
  D.pglClaw = (c, o) => { // коготь PGL
    const m = o.metal, g = o.glass;
    let s = pedestal(c, 'step', 'silver', 22, 'PGL') +
      `<path d="M30 58C26 50 22 40 20 28C19 22 21 15 25 11C24 20 27 30 31 38z" fill="${c.mH(m)}"/>` +
      `<path d="M34 58C38 50 42 40 44 28C45 22 43 15 39 11C40 20 37 30 33 38z" fill="${c.mH(m)}"/>` +
      `<path d="M29.5 58C30 44 30 26 32 6C34 26 34 44 34.5 58z" fill="${g ? c.gl(g) : c.mV(m)}" stroke="${c.mH('chrome')}" stroke-width=".6"/>` +
      `<path d="M23 34C27 38 37 38 41 34" fill="none" stroke="${c.mV(m)}" stroke-width="1.4"/>` +
      shine('M22 26C22 20 23 15 25 12', .8);
    return s;
  };
  D.majorCup = (c, o) => { // Major — главный трофей сезона: насыщенное золото, сияние, лавры, массивный постамент
    const m = o.metal || 'gold', acc = o.accent || '#b8202e';
    const halo = c.grad('mjhalo', .5, .38, .55, 0, [[0, '#ffe9a0', .55], [.45, '#ffcc4d', .18], [1, '#ffcc4d', 0]], true);
    const deep = c.grad('mjdeep' + m, 0, 0, 1, 0, m === 'blackgold'
      ? [[0, '#0b0a07'], [.3, '#3a2c0e'], [.48, '#f6d36b'], [.55, '#fff3c4'], [.7, '#8a6516'], [1, '#120e05']]
      : [[0, '#5a3604'], [.14, '#a86a0c'], [.32, '#f5c542'], [.44, '#fff6cf'], [.56, '#ffd75a'], [.78, '#b97a10'], [1, '#4d2e03']]);
    const rim = c.grad('mjrim', 0, 0, 0, 1, [[0, '#fffbe6'], [.5, '#ffd24d'], [1, '#9a6408']]);
    let s = `<ellipse cx="32" cy="27" rx="27" ry="25" fill="${halo}"/>`;
    // постамент: чёрный мрамор в два яруса + золотая табличка
    s += `<ellipse cx="32" cy="70" rx="21" ry="2" fill="${c.shadow()}"/>` +
      `<path d="M10 69.4L12 62.6H52L54 69.4z" fill="${c.mV('black')}"/><path d="M12 62.6H52" stroke="${rim}" stroke-width=".8"/>` +
      `<path d="M16 62.6L17.5 56.8H46.5L48 62.6z" fill="${c.mH('black')}"/><path d="M17.5 56.8H46.5" stroke="${rim}" stroke-width=".7"/>` +
      `<rect x="22" y="64.2" width="20" height="3.6" rx=".5" fill="${rim}"/>` + txt(32, 67, "CS2 MAJOR", 2.4, "#2a1a02");
    // ножка с кольцами
    s += `<path d="M27.5 56.8L29 46H35L36.5 56.8z" fill="${deep}"/><ellipse cx="32" cy="46" rx="6.6" ry="1.6" fill="${rim}"/><ellipse cx="32" cy="51" rx="4.2" ry="1.1" fill="${rim}"/>`;
    // ручки
    s += `<path d="M15 13C3 11 3 33 17 35" fill="none" stroke="${deep}" stroke-width="3.2" stroke-linecap="round"/><path d="M49 13C61 11 61 33 47 35" fill="none" stroke="${deep}" stroke-width="3.2" stroke-linecap="round"/>`;
    // чаша
    s += `<path d="M12 8H52L48.5 29C46.5 39 39.5 44.5 32 44.5S17.5 39 15.5 29z" fill="${deep}"/>` +
      `<ellipse cx="32" cy="8" rx="20" ry="2.8" fill="${rim}"/><ellipse cx="32" cy="8" rx="17.6" ry="1.7" fill="#2a1a02" fill-opacity=".55"/>`;
    // лента с надписью и звезда-медальон
    s += `<path d="M14.6 19.5H49.4L48.6 25.4H15.4z" fill="${c.flat(acc, 'mja' + acc)}"/><path d="M14.6 19.5H49.4M15.4 25.4H48.6" stroke="${rim}" stroke-width=".7"/>` + txt(32, 24.2, 'MAJOR', 4.2, '#fff', ' letter-spacing="1.2"');
    s += `<circle cx="32" cy="33.5" r="5.2" fill="${rim}"/><circle cx="32" cy="33.5" r="4.2" fill="${c.grad('mjgem', .4, .35, .7, 0, [[0, '#fff'], [.35, '#ffe27a'], [1, '#b8790c']], true)}"/>` +
      `<path d="M32 30.2l1.1 2.2 2.4.3-1.8 1.7.4 2.4-2.1-1.1-2.1 1.1.4-2.4-1.8-1.7 2.4-.3z" fill="#7a4a04"/>`;
    // лавровые ветви по бокам чаши
    for (const k of [-1, 1]) for (let i = 0; i < 4; i++) { const x = 32 + k * (11.5 - i * 1.2), y = 38.5 - i * 4.2; s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="1.3" ry="2.6" transform="rotate(${k * (35 + i * 8)} ${n(x)} ${n(y)})" fill="${rim}" opacity=".9"/>`; }
    // блики
    s += shine('M16.5 11C16.5 22 19 31 23.5 37.5', 1.4) + shine('M45 12C45 20 44 26 42 31', .6) + `<circle cx="20" cy="13" r="1.1" fill="#fff" opacity=".9"/>`;
    return s;
  };
  D.mastersCup = (c, o) => { // DreamHack Masters
    const m = o.metal;
    let s = pedestal(c, 'round', m, 24) +
      `<path d="M18 12C9 12 9 27 20 30" fill="none" stroke="${c.mH(m)}" stroke-width="2.4"/><path d="M46 12C55 12 55 27 44 30" fill="none" stroke="${c.mH(m)}" stroke-width="2.4"/>` +
      `<path d="M17 8H47L44 26C42 34 37 37 32 37S22 34 20 26z" fill="${c.mH(m)}"/>` +
      `<path d="M19 14H45" stroke="#000" stroke-opacity=".25" stroke-width="5"/>` + txt(32, 15.8, 'MASTERS', 3.2, '#fff') +
      `<path d="M30 37L28.4 46H35.6L34 37z" fill="${c.mH(m)}"/><ellipse cx="32" cy="46" rx="6" ry="1.6" fill="${c.mV(m)}"/><path d="M27 47L25 58.4H39L37 47z" fill="${c.mH(m)}"/>` +
      shine('M20 10C20 20 22 28 26 33', 1);
    return s;
  };
  D.glassBlock = (c, o) => { // DreamHack Open: стеклянный блок
    let s = pedestal(c, 'slab', 'chrome', 24) +
      `<path d="M21 10H43V57.5H21z" fill="${c.gl(o.glass || 'ice')}" stroke="${c.mH('chrome')}" stroke-width=".8"/>` +
      `<path d="M43 10L46 12V56L43 57.5z" fill="${c.gl('smoke')}"/>` +
      `<rect x="24" y="15" width="16" height="7" fill="#11161d" fill-opacity=".75"/>` + txt(32, 20.4, 'OPEN', 4.4, '#fff') +
      `<path d="M25 27H39M25 30H37M25 33H39M25 36H34" stroke="#fff" stroke-opacity=".35" stroke-width=".6"/>` + shine('M22.5 12V54', 1.1);
    return s;
  };
  D.slStar = (c, o) => { // StarLadder
    const m = o.metal, g = o.glass || 'ruby';
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7.4 : 16.5; pts.push(`${n(32 + Math.cos(a) * r)} ${n(22 + Math.sin(a) * r)}`); }
    let s = pedestal(c, 'step', m, 22) + `<path d="M29 36L28 58.4H36L35 36z" fill="${c.mH(m)}"/>` +
      `<path d="M${pts.join('L')}z" fill="${c.gl(g)}" stroke="${c.mV(m)}" stroke-width="1.4"/>`;
    for (let i = 0; i < 10; i += 2) { const a = -Math.PI / 2 + i * Math.PI / 5; s += `<path d="M32 22L${n(32 + Math.cos(a) * 16.5)} ${n(22 + Math.sin(a) * 16.5)}" stroke="#fff" stroke-opacity=".45" stroke-width=".6"/>`; }
    return s;
  };
  D.thunderSwirl = (c, o) => { // Thunderpick World
    const m = o.metal;
    let s = pedestal(c, 'step', 'black', 22, 'WORLD') +
      `<path d="M26 58C25 50 38 47 37 40C36 33 24 34 25 26C26 19 38 18 40 10" fill="none" stroke="${c.mH(m)}" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M39 58C40 50 27 47 28 40C29 33 41 33 40 26" fill="none" stroke="${c.gl(o.glass || 'blue')}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<circle cx="40.5" cy="8.5" r="4" fill="${c.mR(m)}"/>` + shine('M24.5 30C24 24 27 21 31 19', .8);
    return s;
  };
  D.orbBowl = (c, o) => { // Perfect World / CS Asia
    const m = o.metal;
    return pedestal(c, 'round', m, 22) + `<path d="M29 44L28 58.4H36L35 44z" fill="${c.mH(m)}"/>` +
      `<path d="M15 30C15 42 22 46 32 46S49 42 49 30z" fill="${c.mH(m)}"/>` +
      `<circle cx="32" cy="22" r="14" fill="${c.glR(o.glass || 'blue')}"/>` +
      `<path d="M18.5 22H45.5M32 8V36M22 12C27 17 27 27 22 32M42 12C37 17 37 27 42 32" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".6"/>` +
      `<ellipse cx="32" cy="30" rx="17" ry="2.2" fill="${c.mV(m)}"/>` + shine('M22 15A12 12 0 0 1 30 9.4', 1.2);
  };
  D.ewcObelisk = (c, o) => { // Esports World Cup
    let s = pedestal(c, 'block', 'gold', 22, 'EWC') +
      `<path d="M32 3L41 14V57.5H23V14z" fill="${c.gl(o.glass || 'amber')}" stroke="${c.mH('gold')}" stroke-width="1.3"/>` +
      `<path d="M32 3V57.5" stroke="${c.mH('gold')}" stroke-width=".7"/><path d="M23 14H41M23 30H41" stroke="${c.mH('gold')}" stroke-width=".8"/>` +
      `<path d="M27.5 20L32 16L36.5 20L32 24z" fill="${c.mV('gold')}"/>` + shine('M25 15V54', .9);
    return s;
  };
  D.ewcPlate = (c, o) => { // EWC: золотая тарелка с гравировкой-«солнцем»
    const m = o.metal || 'gold', cy = 30;
    let s = (o.bare ? '' : pedestal(c, 'block', m, 22, 'EWC') + `<path d="M28.5 50L27 57.5H37L35.5 50z" fill="${c.mH(m)}"/>`) +
      `<circle cx="32" cy="${cy}" r="24" fill="${c.mR(m)}"/><circle cx="32" cy="${cy}" r="20.5" fill="${o.glass ? c.glR(o.glass) : c.mR(o.inner || 'blackgold')}"/>`;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; s += `<path d="M${n(32 + Math.cos(a) * 6)} ${n(cy + Math.sin(a) * 6)}L${n(32 + Math.cos(a + .1) * 17.5)} ${n(cy + Math.sin(a + .1) * 17.5)}" stroke="${c.mH(m)}" stroke-width="${i % 2 ? .5 : 1}" stroke-opacity=".85"/>`; }
    s += `<circle cx="32" cy="${cy}" r="5.6" fill="${c.mR(m)}"/><path d="M29 ${cy + 2.2}L32 ${cy - 3}L35 ${cy + 2.2}z" fill="#3a2a06"/>` +
      `<circle cx="32" cy="${cy}" r="22.3" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".5" stroke-dasharray="1.2 .8"/>` + shine(`M14 ${cy - 6}A19 19 0 0 1 26 ${cy - 19}`, 1.3);
    return o.bare ? bareDisc(c, s, cy) : s;
  };
  D.ewcCup = (c, o) => { // EWC: высокий кубок-кубок с гранёной чашей
    const m = o.metal || 'gold';
    return pedestal(c, 'block', 'gold', 24, 'EWC') +
      `<path d="M27 57.5L29 42H35L37 57.5z" fill="${c.mH(m)}"/><ellipse cx="32" cy="42" rx="6" ry="1.4" fill="${c.mV(m)}"/>` +
      `<path d="M16 6H48L44 26C42 34 37.5 38.5 32 38.5S22 34 20 26z" fill="${c.mH(m)}"/>` +
      `<path d="M24 6L26.5 34M40 6L37.5 34M32 6V38.5" stroke="#000" stroke-opacity=".22" stroke-width=".7"/>` +
      `<ellipse cx="32" cy="6" rx="16" ry="2.2" fill="${c.mV(m)}"/>` +
      `<path d="M26 16H38L36.6 24H27.4z" fill="${o.glass ? c.gl(o.glass) : c.mV('black')}" stroke="${c.mH('pale')}" stroke-width=".5"/>` + txt(32, 21.6, 'EWC', 2.6, '#fff') +
      `<path d="M16 10C8 10 9 24 19 25M48 10C56 10 55 24 45 25" fill="none" stroke="${c.mH(m)}" stroke-width="1.8"/>` + shine('M19 9C19.5 19 22 28 26 33', 1);
  };
  D.fireFlame = (c, o) => { // FiReLEAGUE: золотое пламя в кольце с бело-голубой лентой
    const m = o.metal || 'gold', acc = o.accent || '#6cace4';
    return pedestal(c, 'step', m, 24, 'FiRe') +
      `<path d="M28.5 57.5L29.5 46H34.5L35.5 57.5z" fill="${c.mH(m)}"/><ellipse cx="32" cy="46" rx="7" ry="1.5" fill="${c.mV(m)}"/>` +
      `<circle cx="32" cy="27" r="17.5" fill="none" stroke="${c.mH(m)}" stroke-width="2.6"/>` +
      `<path d="M32 4C38 13 46 18 43.5 30C42 38 37.5 44 32 44S22 38 20.5 30C19 20 26.5 17 27.5 9C30 13 31 13 32 4z" fill="${c.mH(m)}"/>` +
      `<path d="M32 17C35 22 39 25 37.6 32C36.8 36 34.6 38.6 32 38.6S27 36 26.4 32C25.6 27 29.6 24.6 32 17z" fill="${c.grad('ffin', 0, 0, 0, 1, [[0, '#fff6c8'], [.45, '#ffb238'], [1, '#e0451b']])}"/>` +
      `<path d="M14.5 34H49.5" stroke="${c.flat(acc, 'fac' + acc)}" stroke-width="2.4"/><path d="M14.5 34H49.5" stroke="#fff" stroke-width=".8"/>` +
      shine('M24 14C22 20 22 28 25 35', 1.1);
  };
  D.nationsGlobe = (c, o) => { // eSports Nations Cup: глобус в лавровом венке
    const m = o.metal || 'gold', g = o.glass || 'blue';
    let s = pedestal(c, o.base || 'block', m, 24, 'NATIONS') +
      `<path d="M28 57.5L29.6 44H34.4L36 57.5z" fill="${c.mH(m)}"/>` +
      `<circle cx="32" cy="25" r="15" fill="${c.glR(g)}"/>` +
      `<path d="M17 25H47M32 10V40M20 16H44M20 34H44" stroke="#fff" stroke-opacity=".35" stroke-width=".5" fill="none"/>` +
      `<ellipse cx="32" cy="25" rx="7" ry="15" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".5"/>` +
      `<ellipse cx="32" cy="25" rx="18" ry="5" fill="none" stroke="${c.mH(m)}" stroke-width="1.6" transform="rotate(-18 32 25)"/>`;
    for (const k of [-1, 1]) for (let i = 0; i < 6; i++) { const a = (200 - i * 22) * Math.PI / 180, x = 32 + k * Math.abs(Math.cos(a)) * 19.5, y = 30 - Math.sin(a) * 15 + 4; s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="1.3" ry="2.8" transform="rotate(${k * (-20 + i * 22)} ${n(x)} ${n(y)})" fill="${c.mV(m)}"/>`; }
    s += `<path d="M24 44.5H40L38 41H26z" fill="${c.mV(m)}"/>` + shine('M21 18A13 13 0 0 1 28 11.5', 1.2);
    return s;
  };
  D.nationsCup = (c, o) => { // Кубок наций: золотая чаша с медальоном-глобусом и венцом звёзд стран-участниц
    const m = o.metal || 'gold', g = o.glass || 'blue';
    let s = pedestal(c, 'step', m, 24, 'NATIONS') +
      `<path d="M28 58.4L29.4 44H34.6L36 58.4z" fill="${c.mH(m)}"/><ellipse cx="32" cy="44.5" rx="6.5" ry="1.5" fill="${c.mV(m)}"/>` +
      `<path d="M16 13C7 12 7 28 18 30M48 13C57 12 57 28 46 30" fill="none" stroke="${c.mH(m)}" stroke-width="2.4"/>` +
      `<path d="M14 9H50L46.5 29C44.5 38 38.5 43 32 43S19.5 38 17.5 29z" fill="${c.mH(m)}"/><ellipse cx="32" cy="9" rx="18" ry="2.4" fill="${c.mV(m)}"/>` +
      `<circle cx="32" cy="24" r="8.2" fill="${c.glR(g)}" stroke="${c.mV('pale')}" stroke-width=".8"/>` +
      `<path d="M23.8 24H40.2M32 15.8V32.2" stroke="#fff" stroke-opacity=".4" stroke-width=".5"/><ellipse cx="32" cy="24" rx="3.8" ry="8.2" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".5"/>`;
    for (let i = 0; i < 12; i++) { const a = Math.PI * (0.08 + i * 0.07), x = 32 - Math.cos(a) * 13, y = 24 - Math.sin(a) * 9.5 + 1; s += glyph('star', n(x), n(y), 1.05, '#fff6cf'); }
    return s + shine('M18 12C18 22 21 31 26 38', 1.1);
  };
  D.nationsShield = (c, o) => { // вариант Кубка наций: щит-кубок с картой
    const m = o.metal || 'silver', g = o.glass || 'cyan';
    return pedestal(c, 'round', m, 22, 'NATIONS') + `<path d="M29 57.5L30 45H34L35 57.5z" fill="${c.mH(m)}"/>` +
      `<path d="M14 6H50V24C50 36 42 43 32 46C22 43 14 36 14 24z" fill="${c.mH(m)}"/>` +
      `<path d="M17.5 9.5H46.5V24C46.5 34 40 39.5 32 42.2C24 39.5 17.5 34 17.5 24z" fill="${c.gl(g)}"/>` +
      `<circle cx="32" cy="23" r="9" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/><path d="M23 23H41M32 14V32" stroke="#fff" stroke-opacity=".45" stroke-width=".5"/>` +
      `<ellipse cx="32" cy="23" rx="4.2" ry="9" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".5"/>` + txt(32, 38.5, 'ENC', 2.6, '#fff') + shine('M19 11V26', .9);
  };
  // ---- v84: дополнительные силуэты организаторов (у каждого турнира серии — своя постоянная форма)
  D.iemClassic = (c, o) => { // IEM: классический серебряный кубок с крышкой и двумя большими ручками
    const m = o.metal || 'silver';
    let s = `<ellipse cx="32" cy="69.6" rx="16" ry="1.9" fill="${c.shadow()}"/>` +
      `<path d="M20 69.2V64.6C20 63 24 62 32 62S44 63 44 64.6V69.2z" fill="${c.mH('black')}"/><ellipse cx="32" cy="64.6" rx="12" ry="1.8" fill="${c.mV('black')}"/>` +
      `<path d="M23 62V59.4C23 58.2 27 57.4 32 57.4S41 58.2 41 59.4V62z" fill="${c.mH('black')}"/>` +
      `<path d="M27.5 57.4C28.5 54 30.5 52 30.6 47H33.4C33.5 52 35.5 54 36.5 57.4z" fill="${c.mH(m)}"/><ellipse cx="32" cy="50.5" rx="2.6" ry="1" fill="${c.mV(m)}"/>` +
      // большие ручки: от края чаши до её низа
      `<path d="M19.5 16C9 15 6.5 22 8.5 31C10 37 15 41 22 42" fill="none" stroke="${c.mH(m)}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="M44.5 16C55 15 57.5 22 55.5 31C54 37 49 41 42 42" fill="none" stroke="${c.mH(m)}" stroke-width="2.4" stroke-linecap="round"/>` +
      // чаша-тюльпан
      `<path d="M18.5 15H45.5L44 27C43 37 39 44 32 46.5C25 44 21 37 20 27z" fill="${c.mH(m)}"/>` +
      `<ellipse cx="32" cy="15" rx="13.5" ry="1.9" fill="${c.mV(m)}"/>` +
      // крышка с куполом и шишечкой
      `<path d="M21 14.6C21 10.6 26 8.4 32 8.4S43 10.6 43 14.6z" fill="${c.mH(m)}"/><path d="M27 8.8C27 6.4 29 5 32 5S37 6.4 37 8.8z" fill="${c.mV(m)}"/><circle cx="32" cy="4.4" r="1.6" fill="${c.mR(m)}"/>` +
      // гравировка: эмблема и строки победителей
      `<circle cx="32" cy="20.5" r="2.4" fill="none" stroke="#000" stroke-opacity=".35" stroke-width=".5"/>` +
      `<path d="M25 25.5H39M24.5 28H39.5M25 31H31M33 31H39M25.5 34H31M33 34H38.5M27 37H37" stroke="#000" stroke-opacity=".22" stroke-width=".5"/>` +
      shine('M21.5 17C21.5 28 24 38 29 44', 1.2);
    return s;
  };
  D.spodekChalice = (c, o) => { // IEM Katowice: чаша-«тарелка» как крыша Сподека, на тонкой ножке
    const m = o.metal;
    return pedestal(c, 'round', m, 24) + `<path d="M30 58.4L30.8 34H33.2L34 58.4z" fill="${c.mH(m)}"/><ellipse cx="32" cy="46" rx="4.4" ry="1.3" fill="${c.mV(m)}"/>` +
      `<path d="M8 22C14 30 50 30 56 22L52 19C44 24 20 24 12 19z" fill="${c.mH(m)}"/>` +
      `<path d="M12 19C20 24 44 24 52 19C46 9 38 5 32 5S18 9 12 19z" fill="${o.glass ? c.gl(o.glass) : c.mV(m)}" stroke="${c.mH('chrome')}" stroke-width=".6"/>` +
      `<path d="M16 17L48 17M20 12H44M32 5V24" stroke="#fff" stroke-opacity=".35" stroke-width=".5"/>` + `<ellipse cx="32" cy="29" rx="5" ry="1.6" fill="${c.mV(m)}"/>` + shine('M15 18C19 11 25 7.5 31 6.5', 1.1);
  };
  D.iemStar = (c, o) => { // IEM: гранёная стеклянная звезда на хромированной стойке
    const m = o.metal, g = o.glass || 'ice', p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 8 : 18; p.push(`${n(32 + Math.cos(a) * r)} ${n(24 + Math.sin(a) * r)}`); }
    return pedestal(c, 'slab', m, 20) + `<path d="M29.5 58L30.5 38H33.5L34.5 58z" fill="${c.mH(m)}"/>` +
      `<path d="M${p.join('L')}z" fill="${c.gl(g)}" stroke="${c.mH(m)}" stroke-width="1"/>` +
      `<path d="M32 6V42M14.9 18.4L49.1 29.6M49.1 18.4L14.9 29.6" stroke="#fff" stroke-opacity=".3" stroke-width=".5"/>` + txt(32, 26, 'IEM', 3.2, '#fff');
  };
  D.iemTower = (c, o) => { // IEM: башня из стеклянных колец
    const m = o.metal, g = o.glass || 'blue';
    let s = pedestal(c, 'slab', m, 22) + `<path d="M29 58L29.6 10H34.4L35 58z" fill="${c.mH(m)}"/>`;
    [[12, 13], [20, 11], [28, 9.5], [36, 8], [44, 6.5]].forEach(([y, r]) => { s += `<ellipse cx="32" cy="${y}" rx="${r}" ry="2.6" fill="${c.gl(g)}" stroke="${c.mH(m)}" stroke-width=".7"/>`; });
    return s + `<circle cx="32" cy="6" r="2.6" fill="${c.glR(g)}"/>` + shine('M23 12H27', .8);
  };
  D.blastShard = (c, o) => { // BLAST Final: треугольник, расколотый на три грани
    const fill = o.glass ? c.gl(o.glass) : c.mH(o.metal), edge = c.mV(o.metal || 'gold');
    return `<ellipse cx="32" cy="68.8" rx="22" ry="2" fill="${c.shadow()}"/>` +
      `<path d="M32 4L30 30L9 64H30z" fill="${fill}" stroke="${edge}" stroke-width="1"/><path d="M33.5 4L35.5 30L56 64H35z" fill="${fill}" stroke="${edge}" stroke-width="1" opacity=".9"/>` +
      `<path d="M31.5 34H34L33.5 64H31.8z" fill="#0b0d12" fill-opacity=".85"/><path d="M14 64H50" stroke="${edge}" stroke-width="2"/>` + shine('M31 8L11 62', 1);
  };
  D.eplHelix = (c, o) => { // ESL Pro League (нечётные сезоны): строгая гранёная стеклянная колонна в металлической оправе
    const m = o.metal, g = { black: 'smoke', gunmetal: 'smoke', cobalt: 'blue', violet: 'violet', silver: 'ice' }[o.body] || 'ice';
    return pedestal(c, 'round', m, 20) +
      `<path d="M27 57L28.5 46H35.5L37 57z" fill="${c.mH(m)}"/><ellipse cx="32" cy="46" rx="6.4" ry="1.5" fill="${c.mV(m)}"/>` +
      `<path d="M27.5 46L26.5 13H37.5L36.5 46z" fill="${c.gl(g)}" stroke="${c.mH(m)}" stroke-width=".7"/>` +
      `<path d="M29.4 13.5V45.5M34.6 13.5V45.5" stroke="#fff" stroke-opacity=".22" stroke-width=".45"/>` +
      `<path d="M25.6 13H38.4L36.6 9H27.4z" fill="${c.mH(m)}"/><path d="M27.4 9L32 3.5L36.6 9z" fill="${c.mV(m)}"/>` +
      `<rect x="26.6" y="20" width="10.8" height="1.4" fill="${c.mH(m)}"/>` +
      `<rect x="27.6" y="37.6" width="8.8" height="3.8" rx=".5" fill="${c.mV('black')}" stroke="${c.mH(m)}" stroke-width=".3"/>` + txt(32, 40.6, 'EPL', 2.4, '#fff', ' letter-spacing=".5"') +
      shine('M28.4 15V44', .7);
  };
  D.pglCrown = (c, o) => { // PGL: корона-кубок с когтями по краю
    const m = o.metal, g = o.glass || 'blue';
    return pedestal(c, 'step', 'silver', 22, 'PGL') + `<path d="M29 58.4L30 40H34L35 58.4z" fill="${c.mH(m)}"/>` +
      `<path d="M14 10L19 18L24 8L29 18L32 6L35 18L40 8L45 18L50 10L47 30C45 37 39 41 32 41S19 37 17 30z" fill="${c.mH(m)}"/>` +
      `<path d="M20 24H44L42.5 30C41 34 37 36.5 32 36.5S23 34 21.5 30z" fill="${c.gl(g)}"/>` + shine('M18 14C18 22 20 30 24 35', 1);
  };
  D.cctFlag = (c, o) => { // CCT: стяг-вымпел на стойке
    const m = o.metal, acc = o.accent || '#2f6fe0';
    return pedestal(c, 'slab', m, 22) + `<path d="M24 58V4H26.4V58z" fill="${c.mH(m)}"/><circle cx="25.2" cy="4" r="2" fill="${c.mR(m)}"/>` +
      `<path d="M26.4 7H48L43 17L48 27H26.4z" fill="${c.flat(acc, 'cctf' + acc)}" stroke="${c.mV(m)}" stroke-width=".6"/>` + txt(36, 19, 'CCT', 4.4, '#fff') +
      `<path d="M26.4 7H48" stroke="#fff" stroke-opacity=".5" stroke-width=".6"/>`;
  };
  D.boltSpire = (c, o) => { // Thunderpick: стойка-молния
    const m = o.metal, g = o.glass || 'cyan';
    return pedestal(c, 'block', m, 22) + `<path d="M36 3L20 33H31L25 58H31L46 24H35L42 3z" fill="${c.mH(m)}" stroke="${c.mV(m)}" stroke-width=".6"/>` +
      `<path d="M37 7L25 30H33L29 48L41 27H33L38 7z" fill="${c.gl(g)}" fill-opacity=".85"/>`;
  };
  D.torch = (c, o) => { // FISSURE
    const m = o.metal;
    return pedestal(c, 'round', 'black', 20) +
      `<path d="M28 58.4L26.5 30H37.5L36 58.4z" fill="${c.mH(m)}"/><path d="M24 28H40L38.5 32H25.5z" fill="${c.mV(m)}"/>` +
      `<path d="M32 4C36 12 42 15 40 23C39 27 35 28.5 32 28.5S25 27 24 23C22.5 17 28 15 28.5 10C30 13 31 13 32 4z" fill="${c.grad('flm', 0, 0, 0, 1, [[0, '#ffe36e'], [.45, '#ff7a1a'], [1, '#c4161c']])}"/>` +
      `<path d="M32 13C34 18 37 20 35.5 24.5C34.6 26.5 33.4 27 32 27S29 26 28.6 24C28 21 31 19 32 13z" fill="#fff3b0" fill-opacity=".85"/>` +
      `<path d="M26.6 38H37.4M26.9 46H37.1" stroke="${c.flat(o.accent || '#7a3fd0', 'tacc')}" stroke-width="1.6"/>`;
  };
  D.gemClaw = (c, o) => { // BetBoom
    const m = o.metal, g = o.glass || 'mint';
    return pedestal(c, 'step', m, 22) + `<path d="M29.5 40L28 58.4H36L34.5 40z" fill="${c.mH(m)}"/>` +
      `<path d="M32 5L44 18L32 41L20 18z" fill="${c.gl(g)}" stroke="${c.mH('chrome')}" stroke-width=".6"/><path d="M20 18H44M32 5L27 18L32 41L37 18z" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>` +
      `<path d="M22 30L27 40H24zM42 30L37 40H40z" fill="${c.mV(m)}"/>`;
  };
  D.hoop = (c, o) => { // CCT
    const m = o.metal;
    return pedestal(c, 'slab', m, 22) + `<path d="M29 44L28 57.5H36L35 44z" fill="${c.mH(m)}"/>` +
      `<circle cx="32" cy="25" r="17" fill="none" stroke="${c.mH(m)}" stroke-width="5"/><circle cx="32" cy="25" r="17" fill="none" stroke="#000" stroke-opacity=".2" stroke-width=".5"/>` +
      `<path d="M32 15L38 25L32 35L26 25z" fill="${c.gl(o.glass || 'blue')}"/>` + shine('M18 18A15 15 0 0 1 27 9.5', 1.1);
  };
  D.classicCup = (c, o) => { // прочие организаторы Tier-1
    const m = o.metal;
    return pedestal(c, o.base || 'step', m, 26) +
      `<path d="M19 13C10 12 10 28 21 30" fill="none" stroke="${c.mH(m)}" stroke-width="2"/><path d="M45 13C54 12 54 28 43 30" fill="none" stroke="${c.mH(m)}" stroke-width="2"/>` +
      `<path d="M18 9H46L43 27C41 35 37 38 32 38S23 35 21 27z" fill="${c.mH(m)}"/><ellipse cx="32" cy="9" rx="14" ry="1.9" fill="${c.mV(m)}"/>` +
      `<path d="M29.5 38L28.6 47H35.4L34.5 38z" fill="${c.mH(m)}"/><path d="M25 47H39L40.5 58.4H23.5z" fill="${c.mH(m)}"/>` +
      `<circle cx="32" cy="21" r="4.5" fill="${c.flat(o.accent || '#2f6fe0', 'ca' + (o.accent || ''))}" stroke="${c.mV('pale')}" stroke-width=".8"/>` + shine('M21 11C21 20 23 28 27 33', 1);
  };
  D.medallion = (c, o) => { // медальон-монета
    const m = o.metal, cy = 30;
    let s = `<ellipse cx="32" cy="66" rx="16" ry="2" fill="${c.shadow()}"/><path d="M27 52L25 64H39L37 52z" fill="${c.mV('black')}"/>` +
      `<circle cx="32" cy="${cy}" r="23" fill="${c.mR(m)}"/><circle cx="32" cy="${cy}" r="19" fill="${c.flat(o.accent || '#2f6fe0', 'ma' + (o.accent || ''))}"/>` +
      `<circle cx="32" cy="${cy}" r="14" fill="${c.mR(m)}"/>`;
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; s += `<line x1="${n(32 + Math.cos(a) * 19.6)}" y1="${n(cy + Math.sin(a) * 19.6)}" x2="${n(32 + Math.cos(a) * 22.4)}" y2="${n(cy + Math.sin(a) * 22.4)}" stroke="#fff" stroke-opacity=".5" stroke-width=".6"/>`; }
    s += txt(32, cy + 2, o.label || 'CUP', o.label && o.label.length > 5 ? 3.4 : 4.6, '#3b2604');
    return s;
  };
  D.coin = (c, o) => { // монета: просто круг, без подставки — гурт, кольцо гравировки, название и год
    const m = o.metal, cy = 36, acc = o.accent || '#2f6fe0';
    let s = `<ellipse cx="32" cy="66" rx="18" ry="2" fill="${c.shadow()}"/>` +
      `<circle cx="32" cy="${cy}" r="27" fill="${c.mR(m)}"/><circle cx="32" cy="${cy}" r="27" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".6"/>`;
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; s += `<line x1="${n(32 + Math.cos(a) * 25.4)}" y1="${n(cy + Math.sin(a) * 25.4)}" x2="${n(32 + Math.cos(a) * 26.8)}" y2="${n(cy + Math.sin(a) * 26.8)}" stroke="#000" stroke-opacity=".28" stroke-width=".5"/>`; }
    s += `<circle cx="32" cy="${cy}" r="22.5" fill="${c.mV(m)}"/><circle cx="32" cy="${cy}" r="22.5" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".6"/>` +
      `<circle cx="32" cy="${cy}" r="18.5" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".5" stroke-dasharray="1.4 1"/>` +
      `<circle cx="32" cy="${cy - 4}" r="8" fill="${c.flat(acc, 'cn' + acc)}" stroke="${c.mH('pale')}" stroke-width=".8"/>` +
      `<path d="M32 ${cy - 9.5}l1.7 3.5 3.8.5-2.8 2.6.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z" fill="#fff" fill-opacity=".92"/>` +
      txt(32, cy + 9, o.label || 'CHAMPION', (o.label || '').length > 6 ? 3.6 : 4.4, '#2a1a02', ' fill-opacity=".85"') +
      (o.year ? txt(32, cy + 14.5, o.year, 3.4, '#2a1a02', ' fill-opacity=".7"') : '') +
      shine(`M12 ${cy - 8}A21 21 0 0 1 24 ${cy - 21}`, 1.4);
    return s;
  };
  D.cheque = (c, o) => { // «чек» вместо кубка
    return `<ellipse cx="32" cy="64" rx="25" ry="2" fill="${c.shadow()}"/>` +
      `<g transform="rotate(-8 32 36)"><rect x="5" y="22" width="54" height="28" rx="1.5" fill="#f4f1e6" stroke="#b9b29a" stroke-width=".8"/>` +
      `<rect x="5" y="22" width="54" height="6" fill="${c.flat(o.accent || '#1f9e6e', 'chq' + (o.accent || ''))}"/>` + txt(32, 26.6, o.label || 'CHAMPION', 3.2, '#fff') +
      `<path d="M9 36H34M9 41H28" stroke="#9a937c" stroke-width=".7"/><rect x="38" y="33" width="17" height="7" fill="#fff" stroke="#9a937c" stroke-width=".6"/>` +
      txt(46.5, 38.4, o.prize || '$', 3.6, '#2b2b2b') + `<path d="M36 46C40 43 44 48 49 44" fill="none" stroke="#2c4a8a" stroke-width=".8"/></g>`;
  };

  // ---------------------------------------------------------------- выбор дизайна
  const ORGS = [
    { key: 'Major', re: /\bmajor\b/i, pick: (r) => ({ d: 'majorCup', metal: 'gold', accent: ['#b8202e', '#1f4fb5', '#6b2fb3', '#0f8a6a'][r % 4] }) },
    { key: 'IEM-big', re: /^IEM\s+(?:Cologne|Katowice|Krak)|^ESL One/i, pick: (r) => iemPool(r) },
    { key: 'IEM', re: /^IEM\b|^Intel Extreme/i, pick: (r, name) => Object.assign(iemPool(r), { sub: (String(name).replace(/^IEM\s+/i, '').replace(/\s*\(.*\)/, '').replace(/\s+20\d\d$/, '').toUpperCase()).slice(0, 14) }) },
    { key: 'EPL', re: /^ESL Pro League|^EPL\b/i, pick: (r, name) => ({ d: (Number((String(name).match(/season\s+(\d+)/i) || [])[1]) || 0) % 2 ? 'eplHelix' : 'eplSpire', metal: ['gold', 'pale', 'gold', 'rose'][r % 4] }) },
    { key: 'BLAST', re: /^BLAST/i, pick: (r, name) => /spring final|fall final/i.test(name) ? { d: 'blastTri', metal: ['gold', 'silver', 'pale'][r % 3], big: true } : /world final/i.test(name)
      ? { d: 'blastTri', metal: 'gold', big: true }
      : [{ d: 'blastTri', metal: 'gold', stripes: true }, { d: 'blastTri', metal: 'silver', stripes: true }, { d: 'blastTri', glass: 'blue' }, { d: 'blastTri', glass: 'violet' }, { d: 'blastTri', metal: 'black' }, { d: 'blastTri', metal: 'pale' }][r % 6] },
    { key: 'PGL', re: /^PGL/i, pick: (r, name) => [{ metal: 'chrome', glass: 'blue' }, { metal: 'silver', glass: 'ice' }, { metal: 'rose', glass: 'pink' }, { metal: 'chrome', glass: 'violet' }].map(x => ({ d: /major/i.test(name) || series(name) % 2 ? 'pglClaw' : 'pglCrown', ...x }))[r % 4] },
    { key: 'DHM', re: /^DreamHack Masters/i, pick: (r) => ({ d: 'mastersCup', metal: ['silver', 'chrome', 'rose'][r % 3] }) },
    { key: 'DH', re: /^DreamHack/i, pick: (r) => ({ d: 'glassBlock', glass: ['ice', 'smoke', 'amber'][r % 3] }) },
    { key: 'SL', re: /^StarLadder|^StarSeries/i, pick: (r) => ({ d: 'slStar', metal: ['gold', 'silver', 'rose'][r % 3], glass: ['ruby', 'ice', 'amber'][r % 3] }) },
    { key: 'Thunderpick', re: /^Thunderpick/i, pick: (r) => ({ d: r % 3 === 2 ? 'boltSpire' : 'thunderSwirl', metal: 'gold', glass: ['blue', 'cyan'][r % 2] }) },
    { key: 'PW', re: /^Perfect World|^CS Asia/i, pick: (r) => ({ d: 'orbBowl', metal: ['gold', 'silver', 'chrome'][r % 3], glass: ['blue', 'cyan', 'ice'][r % 3] }) },
    { key: 'EWC', re: /^Esports World Cup|^EWC\b/i, pick: (r) => [{ d: 'ewcObelisk', glass: 'amber' }, { d: 'ewcPlate', metal: 'gold' }, { d: 'ewcCup', metal: 'gold' }, { d: 'ewcPlate', metal: 'pale', glass: 'amber', bare: true }, { d: 'ewcCup', metal: 'gold', glass: 'ice' }, { d: 'ewcPlate', metal: 'gold', bare: true }, { d: 'ewcObelisk', glass: 'ice' }][(r >>> 2) % 7] },
    { key: 'Nations', re: /nations cup|national cup|кубок наций/i, pick: (r) => [{ d: 'nationsGlobe', metal: 'gold', glass: 'blue' }, { d: 'nationsCup', metal: 'gold', glass: 'blue' }, { d: 'nationsGlobe', metal: 'pale', glass: 'cyan', base: 'round' }, { d: 'nationsCup', metal: 'pale', glass: 'cyan' }][(r >>> 3) % 4] },
    { key: 'FiRe', re: /^FiRe\b|fireleague/i, pick: (r) => ({ d: 'fireFlame', metal: 'gold', accent: ['#6cace4', '#e0533b', '#6cace4'][r % 3] }) },
    { key: 'FISSURE', re: /^FISSURE/i, pick: (r) => ({ d: 'torch', metal: ['copper', 'chrome', 'gold'][r % 3], accent: ['#7a3fd0', '#d23b3b', '#e08a1f'][r % 3] }) },
    { key: 'BetBoom', re: /^BetBoom|^Dacha/i, pick: (r) => ({ d: 'gemClaw', metal: ['chrome', 'gold'][r % 2], glass: ['mint', 'cyan', 'ice'][r % 3] }) },
    { key: 'CCT', re: /^CCT\b/i, pick: (r) => ({ d: r % 2 ? 'cctFlag' : 'hoop', metal: ['silver', 'chrome', 'gold'][r % 3], glass: ['blue', 'cyan'][r % 2], accent: ['#2f6fe0', '#1f9e6e', '#d23b3b', '#7a3fd0'][(r >>> 3) % 4] }) }
  ];
  const series = name => hash('series|' + String(name || '').replace(/\s*(?:season\s+\d+|20\d\d)\s*/ig, ' ').trim().toLowerCase());
  // v84: у всех турниров IEM (Katowice, Cologne, Kraków, Chengdu, Rio, Melbourne…) общий пул кубков:
  // классический кубок с крышкой и ручками, кубок-«кольца» (как в Кёльне), монета без подставки, стеклянная тарелка на стойке.
  const iemPool = r => [
    { d: 'iemClassic', metal: 'silver' }, { d: 'ringChalice', metal: 'silver' }, { d: 'iemPlate', metal: 'chrome', glass: 'ice', bare: true },
    { d: 'iemClassic', metal: 'chrome' }, { d: 'ringChalice', metal: 'chrome', tint: 'violet' }, { d: 'iemPlate', metal: 'chrome', glass: 'smoke' },
    { d: 'iemClassic', metal: 'silver' }, { d: 'ringChalice', metal: 'silver', tint: 'blue' }, { d: 'iemPlate', metal: 'chrome', glass: 'blue', bare: true }
  ][r % 9];
  function orgOf(name) { return ORGS.find(o => o.re.test(String(name || ''))) || null; }
  function genericSpec(name, r) {
    // Неизвестный организатор: стиль закреплён за самим брендом (первые слова названия),
    // поэтому разные бренды получают разные сочетания формы/цвета, а один бренд — узнаваем.
    const brand = String(name || '').replace(/\s+20\d\d.*$/, '').split(/\s+/).slice(0, 2).join(' ').toUpperCase();
    const b = hash('brand|' + brand);
    const forms = ['classicCup', 'coin', 'medallion', 'cheque', 'coin'];
    const accents = ['#2f6fe0', '#1f9e6e', '#d23b3b', '#e08a1f', '#0fa3b8', '#7a3fd0'];
    const d = forms[b % forms.length];
    return { d, metal: ['silver', 'gold', 'chrome', 'rose', 'bronze'][(b >>> 3) % 5], accent: accents[(b >>> 5) % accents.length], base: ['step', 'round', 'slab'][r % 3],
      label: brand.split(' ')[0].slice(0, 8), year: (String(name).match(/20\d\d/) || [''])[0], prize: '$' + ((r % 4) + 1) * 50 + 'K' };
  }
  function cupSpec(name, season, kind) {
    const r = hash('cup|' + name + '|' + season);
    // v84: кубок Мейджора тоже следует стилю организатора (PGL — «коготь», IEM — чаша, BLAST — треугольник…),
    // но в «главном» исполнении: золото, ореол и лента MAJOR. Без узнаваемого организатора — классический кубок Мейджора.
    const hostOrg = ORGS.slice(1).find(o => o.re.test(String(name || '').replace(/\bmajor\b/ig, '').trim()) || o.re.test(String(name || '')));
    const isMajor = /major/i.test(kind);
    const org = isMajor ? (hostOrg || ORGS[0]) : orgOf(name);
    const spec = org ? org.pick(r, name) : genericSpec(name, r);
    spec.kind = kind; spec.org = org ? org.key : 'custom';
    if (isMajor && hostOrg) { spec.major = true; spec.big = true; }
    // Отделка по сезону: тот же организатор — тот же силуэт, но разные покрытия из его пула.
    const pool = FINISH[spec.org] || FINISH.custom, v = hash('finish|' + name + '|' + season);
    // v84: Мейджор хоста — тот же пул форм и отделок организатора (не обязательно золото); отличие — лента MAJOR и сияние.
    if (spec.major) {
      // примерно половина Мейджоров — в золоте (основной цвет главного трофея), остальные — в отделке хозяина
      const golden = (v >>> 3) % 2 === 0;
      spec.metal = golden ? ['gold', 'gold', 'blackgold', 'pale'][v % 4] : pool[v % pool.length];
      if (golden && spec.org === 'BLAST') spec.glass = null; // золотой треугольник BLAST — металлом, не стеклом
      if (spec.glass) spec.glass = golden ? ['amber', 'amber', 'ice'][(v >>> 5) % 3] : ['amber', 'ice', 'blue', 'violet', 'smoke'][(v >>> 5) % 5];
      return spec;
    }
    if (spec.metal && !(spec.org === 'BLAST' && spec.glass)) spec.metal = pool[v % pool.length];
    if (spec.glass && !/^IEM|^Nations/.test(spec.org) && (spec.org === 'BLAST' || (v >>> 4) % 3 === 0)) spec.glass = GLASS_POOL[(v >>> 7) % GLASS_POOL.length];
    if (spec.org === 'EPL') spec.body = ['black', 'gunmetal', 'cobalt', 'black', 'silver', 'violet'][(v >>> 5) % 6];
    if (spec.org === 'BLAST' && /world final/i.test(name)) { spec.metal = ['gold', 'pale', 'blackgold'][v % 3]; spec.glass = null; }
    if (spec.org === 'IEM-big' && (v >>> 9) % 2) spec.tint = GLASS_POOL[(v >>> 11) % GLASS_POOL.length];
    return spec;
  }
  function cup(name, season, kind) {
    const spec = cupSpec(name, season, kind || 'regular');
    const c = new Ctx();
    let body = (D[spec.d] || D.classicCup)(c, spec);
    if (spec.major && spec.d !== 'majorCup') {
      // ореол позади и золотая лента MAJOR поверх постамента
      const halo = c.grad('mjhalo2', .5, .4, .55, 0, [[0, '#ffe9a0', .5], [.5, '#ffcc4d', .14], [1, '#ffcc4d', 0]], true);
      body = `<ellipse cx="32" cy="30" rx="29" ry="27" fill="${halo}"/>` + body +
        `<path d="M15 51.5H49L47.5 56.5H16.5z" fill="${c.flat('#b8202e', 'mjrib')}" stroke="#ffd75a" stroke-width=".7"/>` + txt(32, 55.4, 'MAJOR', 3.6, '#fff', ' letter-spacing="1.2"');
    }
    // v84: генератор вариаций — тот же силуэт организатора, но каждый год немного другой экземпляр:
    // пропорции, лента на ножке, лавровые ветви, искры, камень-вставка, бирка с годом.
    const v = hash('var|' + name + '|' + season), pick = (k, n) => (v >>> k) % n;
    // круглые трофеи (монета, медальон, диск без подставки) не растягиваются: пропорции меняются только у кубков
    const round = ['coin', 'medallion', 'cheque'].includes(spec.d) || !!spec.bare || /coin|disc|medal/i.test(String(spec.d || ''));
    const sx = round ? 1 : .93 + pick(2, 15) / 100, sy = round ? 1 : .95 + pick(6, 11) / 100;
    const accents = ['#b8202e', '#1f4fb5', '#1f9e6e', '#7a3fd0', '#e08a1f', '#0fa3b8', '#c2185b'];
    const acc = spec.accent || accents[pick(9, accents.length)];
    let back = '', front = '';
    const orn = spec.major || spec.bare || ['coin', 'cheque', 'medallion'].includes(spec.d) ? [] : (pick(12, 3) === 0 ? ['laurel'] : []); // v84: из украшений — только лавровый венок; без искр и мелких деталей
    if (orn.includes('laurel')) for (const k of [-1, 1]) for (let i = 0; i < 4; i++) { const x = 32 + k * (13 - i * 1.6), y = 60 - i * 3.6; back += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="1.2" ry="2.6" transform="rotate(${k * (40 - i * 10)} ${n(x)} ${n(y)})" fill="${c.mV(spec.metal === 'gold' ? 'gold' : 'pale')}" opacity=".95"/>`; }
    if (orn.includes('ribbon')) front += `<path d="M30 47L25 56L28 55.4L29.4 58L32 48.5L34.6 58L36 55.4L39 56L34 47z" fill="${c.flat(acc, 'rb' + acc)}" opacity=".95"/><circle cx="32" cy="47" r="1.6" fill="${c.flat(acc, 'rb' + acc)}" stroke="#fff" stroke-opacity=".5" stroke-width=".3"/>`;
    if (orn.includes('spark')) [[12, 14, 1.8], [53, 22, 1.4], [15, 36, 1.1], [50, 8, 1.2]].slice(0, 2 + pick(16, 3)).forEach(([x, y, r]) => { front += `<path d="M${x} ${n(y - r * 2)}L${n(x + r * .5)} ${n(y - r * .5)}L${n(x + r * 2)} ${y}L${n(x + r * .5)} ${n(y + r * .5)}L${x} ${n(y + r * 2)}L${n(x - r * .5)} ${n(y + r * .5)}L${n(x - r * 2)} ${y}L${n(x - r * .5)} ${n(y - r * .5)}z" fill="#fff8d8" opacity=".9"/>`; });
    if (orn.includes('gem')) front += `<circle cx="32" cy="64.6" r="1.9" fill="${c.glR(GLASS_POOL[pick(18, GLASS_POOL.length)])}" stroke="${c.mV('pale')}" stroke-width=".4"/>`;
    if (orn.includes('tag')) { const yy = String(2025 + (Number(season) || 1)).slice(-2); front += `<rect x="45" y="60.5" width="9" height="5" rx="1" fill="${c.flat(acc, 'tg' + acc)}" transform="rotate(-8 49.5 63)"/>` + `<text x="49.5" y="64.3" text-anchor="middle" font-family="Arial" font-weight="900" font-size="3" fill="#fff" transform="rotate(-8 49.5 63)">'${yy}</text>`; }
    if (spec.org === 'Nations') { // Кубок наций: золотое сияние, как у Мейджора, но без ленты MAJOR
      const halo = c.grad('nchalo', .5, .4, .55, 0, [[0, '#ffe9a0', .5], [.5, '#ffcc4d', .14], [1, '#ffcc4d', 0]], true);
      back = `<ellipse cx="32" cy="30" rx="29" ry="27" fill="${halo}"/>` + back;
    }
    const scale = spec.kind === 'regular' ? .94 : 1;
    const shaped = `<g transform="translate(32 70) scale(${n(sx * scale)} ${n(sy * scale)}) translate(-32 -70)">${back}${body}${front}</g>`;
    return c.svg(shaped, null, `tw-cup tw-org-${spec.org}`);
  }

  // ---------------------------------------------------------------- награды года
  // Семейство статуэток в духе церемонии наград: у каждой номинации свой силуэт трофея
  // и своя гамма; роль обозначена небольшой гравировкой, а не формой целиком.
  const AWARDS = {
    poty:        { f: 'crystalTall', m: 'gold',   g: 'amber',  e: 'star' },
    team:        { f: 'teamFive',    m: 'gold',   g: 'amber',  e: 'crown' },
    teamseason:  { f: 'teamFive',    m: 'gold',   g: 'amber',  e: 'crown' },
    hall:        { f: 'grandCup',    m: 'pale',   g: 'amber',  e: 'laurel' },
    awper:       { f: 'blade',       m: 'chrome', g: 'cyan',   e: 'cross' },
    rifler:      { f: 'hexColumn',   m: 'bronze', g: 'amber',  e: 'chev' },
    entry:       { f: 'wedge',       m: 'chrome', g: 'ruby',   e: 'bolt' },
    igl:         { f: 'crownStand',  m: 'pale',   g: 'violet', e: 'crown' },
    captain:     { f: 'crownStand',  m: 'pale',   g: 'violet', e: 'crown' },
    rookie:      { f: 'goblet',      m: 'silver', g: 'mint',   e: 'leaf' },
    youngstar:   { f: 'starRing',    m: 'silver', g: 'cyan',   e: 'star' },
    clutch:      { f: 'gem',         m: 'silver', g: 'blue',   e: 'diamond' },
    support:     { f: 'shield',      m: 'silver', g: 'mint',   e: 'plus' },
    defender:    { f: 'shield',      m: 'chrome', g: 'blue',   e: 'chev' },
    breakout:    { f: 'splitObelisk',m: 'copper', g: 'amber',  e: 'arrow' },
    mostimproved:{ f: 'stepPyramid', m: 'rose',   g: 'ruby',   e: 'arrow' },
    lurker:      { f: 'monolith',    m: 'black',  g: 'violet', e: 'eye' },
    anchor:      { f: 'disc',        m: 'chrome', g: 'ice',    e: 'dot' },
    utility:     { f: 'orb',         m: 'silver', g: 'mint',   e: 'ring' },
    coach:       { f: 'laurelCup',   m: 'pale',   g: 'violet', e: 'laurel' },
    analyst:     { f: 'disc',        m: 'silver', g: 'cyan',   e: 'ring' }
  };
  // гравировка-эмблема (центр cx,cy, размер r)
  function glyph(kind, cx, cy, r, fill) {
    const f = fill || '#fff', o = ` fill="${f}" fill-opacity=".9"`;
    const st = (w) => ` fill="none" stroke="${f}" stroke-opacity=".9" stroke-width="${w || r * .22}" stroke-linecap="round" stroke-linejoin="round"`;
    switch (kind) {
      case 'star': { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .42 : r; p.push(`${n(cx + Math.cos(a) * q)} ${n(cy + Math.sin(a) * q)}`); } return `<path d="M${p.join('L')}z"${o}/>`; }
      case 'crown': return `<path d="M${n(cx - r)} ${n(cy + r * .6)}L${n(cx - r)} ${n(cy - r * .5)}L${n(cx - r * .45)} ${n(cy)}L${cx} ${n(cy - r)}L${n(cx + r * .45)} ${n(cy)}L${n(cx + r)} ${n(cy - r * .5)}L${n(cx + r)} ${n(cy + r * .6)}z"${o}/>`;
      case 'cross': return `<circle cx="${cx}" cy="${cy}" r="${n(r * .7)}"${st(r * .16)}/><path d="M${cx} ${n(cy - r)}V${n(cy - r * .3)}M${cx} ${n(cy + r * .3)}V${n(cy + r)}M${n(cx - r)} ${cy}H${n(cx - r * .3)}M${n(cx + r * .3)} ${cy}H${n(cx + r)}"${st(r * .16)}/>`;
      case 'chev': return `<path d="M${n(cx - r)} ${n(cy + r * .1)}L${cx} ${n(cy - r * .7)}L${n(cx + r)} ${n(cy + r * .1)}M${n(cx - r)} ${n(cy + r * .8)}L${cx} ${cy}L${n(cx + r)} ${n(cy + r * .8)}"${st()}/>`;
      case 'bolt': return `<path d="M${n(cx + r * .3)} ${n(cy - r)}L${n(cx - r * .6)} ${n(cy + r * .15)}H${n(cx)}L${n(cx - r * .3)} ${n(cy + r)}L${n(cx + r * .6)} ${n(cy - r * .15)}H${cx}z"${o}/>`;
      case 'leaf': return `<path d="M${cx} ${n(cy + r)}C${n(cx - r * 1.1)} ${n(cy + r * .2)} ${n(cx - r * .6)} ${n(cy - r)} ${cx} ${n(cy - r)}C${n(cx + r * .6)} ${n(cy - r)} ${n(cx + r * 1.1)} ${n(cy + r * .2)} ${cx} ${n(cy + r)}z"${o}/><path d="M${cx} ${n(cy + r)}V${n(cy - r * .5)}" stroke="#000" stroke-opacity=".25" stroke-width=".5"/>`;
      case 'diamond': return `<path d="M${n(cx - r)} ${n(cy - r * .3)}L${n(cx - r * .5)} ${n(cy - r)}H${n(cx + r * .5)}L${n(cx + r)} ${n(cy - r * .3)}L${cx} ${n(cy + r)}z"${o}/>`;
      case 'plus': return `<path d="M${cx} ${n(cy - r)}V${n(cy + r)}M${n(cx - r)} ${cy}H${n(cx + r)}"${st(r * .38)}/>`;
      case 'arrow': return `<path d="M${cx} ${n(cy - r)}L${n(cx + r)} ${cy}H${n(cx + r * .4)}V${n(cy + r)}H${n(cx - r * .4)}V${cy}H${n(cx - r)}z"${o}/>`;
      case 'eye': return `<path d="M${n(cx - r)} ${cy}Q${cx} ${n(cy - r * .9)} ${n(cx + r)} ${cy}Q${cx} ${n(cy + r * .9)} ${n(cx - r)} ${cy}z"${st(r * .14)}/><circle cx="${cx}" cy="${cy}" r="${n(r * .32)}"${o}/>`;
      case 'ring': return `<circle cx="${cx}" cy="${cy}" r="${n(r * .75)}"${st(r * .2)}/><circle cx="${cx}" cy="${cy}" r="${n(r * .22)}"${o}/>`;
      case 'laurel': return `<path d="M${n(cx - r * .2)} ${n(cy + r)}C${n(cx - r * 1.2)} ${n(cy + r * .3)} ${n(cx - r)} ${n(cy - r * .7)} ${n(cx - r * .4)} ${n(cy - r)}M${n(cx + r * .2)} ${n(cy + r)}C${n(cx + r * 1.2)} ${n(cy + r * .3)} ${n(cx + r)} ${n(cy - r * .7)} ${n(cx + r * .4)} ${n(cy - r)}"${st(r * .2)}/>`;
      default: return `<circle cx="${cx}" cy="${cy}" r="${n(r * .45)}"${o}/>`;
    }
  }
  const F = {};
  F.crystalTall = (c, a) => `<path d="M26 57.6L24 22L32 3L40 22L38 57.6z" fill="${c.gl(a.g)}" stroke="${c.mH(a.m)}" stroke-width="1.3"/>` +
    `<path d="M32 3V57.6M24 22H40" stroke="#fff" stroke-opacity=".35" stroke-width=".5"/><path d="M24 22L32 30L40 22" fill="none" stroke="${c.mH(a.m)}" stroke-width=".8"/>` +
    `<rect x="24.5" y="44" width="15" height="3" fill="${c.mH(a.m)}"/>` + glyph(a.e, 32, 37, 4.2) + shine('M26.5 24L29 52', .8);
  F.grandCup = (c, a) => `<path d="M17 15C6 14 7 32 19 33M47 15C58 14 57 32 45 33" fill="none" stroke="${c.mH(a.m)}" stroke-width="2.6"/>` +
    `<path d="M15 11H49L46 30C44 38 38 42 32 42S20 38 18 30z" fill="${c.mH(a.m)}"/><ellipse cx="32" cy="11" rx="17" ry="2.2" fill="${c.mV(a.m)}"/>` +
    `<path d="M22 11Q32 1 42 11" fill="${c.mH(a.m)}"/><circle cx="32" cy="4" r="2.2" fill="${c.glR(a.g)}"/>` +
    `<path d="M29 42L28 49H36L35 42z" fill="${c.mH(a.m)}"/><path d="M24 49H40L42 58.4H22z" fill="${c.mH(a.m)}"/>` +
    `<circle cx="32" cy="24" r="6.5" fill="${c.flat('#7a1420', 'gcr')}" stroke="${c.mV('pale')}" stroke-width=".8"/>` + glyph(a.e, 32, 24.4, 4) + shine('M19 13C19 23 21 31 25 36', 1.1);
  F.blade = (c, a) => `<path d="M30 57.6L28.5 30L33 2L36 30L34.5 57.6z" fill="${c.gl(a.g)}" stroke="${c.mH(a.m)}" stroke-width="1"/>` +
    `<path d="M22 34H42L40 38H24z" fill="${c.mH(a.m)}"/><circle cx="32" cy="46" r="4.6" fill="${c.mR(a.m)}"/>` + glyph(a.e, 32, 46, 3.4, '#0e2733') + shine('M31 8L30 28', .7);
  F.hexColumn = (c, a) => `<path d="M24 57.6V14L32 8L40 14V57.6z" fill="${c.mH(a.m)}"/><path d="M32 8V57.6" stroke="#000" stroke-opacity=".18" stroke-width="5"/>` +
    `<path d="M22 14L32 6L42 14L32 18z" fill="${c.mV(a.m)}"/><rect x="25.5" y="24" width="13" height="16" rx="1" fill="${c.gl(a.g)}"/>` + glyph(a.e, 32, 32, 4.4) + `<path d="M24 46H40M24 50H40" stroke="#000" stroke-opacity=".25" stroke-width=".8"/>`;
  F.wedge = (c, a) => `<path d="M24 57.6L22 18L42 4L40 57.6z" fill="${c.gl(a.g)}" stroke="${c.mH(a.m)}" stroke-width="1.2"/>` +
    `<path d="M22 18L40 26L42 4" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".6"/><rect x="22.5" y="46" width="18" height="3" fill="${c.mH(a.m)}"/>` + glyph(a.e, 31.5, 34, 5.2) + shine('M24 22L25.5 52', .8);
  F.crownStand = (c, a) => `<path d="M27 57.6L28 32H36L37 57.6z" fill="${c.mH('black')}"/><path d="M22 32H42L40 36H24z" fill="${c.mH(a.m)}"/>` +
    `<path d="M18 30L16 10L24 18L32 5L40 18L48 10L46 30z" fill="${c.mH(a.m)}" stroke="${c.mV(a.m)}" stroke-width=".6"/>` +
    `<circle cx="16" cy="9.5" r="1.8" fill="${c.glR(a.g)}"/><circle cx="32" cy="4.4" r="2.1" fill="${c.glR(a.g)}"/><circle cx="48" cy="9.5" r="1.8" fill="${c.glR(a.g)}"/>` +
    `<path d="M18 24H46" stroke="${c.gl(a.g)}" stroke-width="3"/>` + glyph('dot', 32, 46, 3, '#c9b37a');
  F.goblet = (c, a) => `<path d="M19 8H45L42 22C40 29 36 32 32 32S24 29 22 22z" fill="${c.mH(a.m)}"/><ellipse cx="32" cy="8" rx="13" ry="1.8" fill="${c.mV(a.m)}"/>` +
    `<path d="M31 32L30.4 50H33.6L33 32z" fill="${c.mH(a.m)}"/><ellipse cx="32" cy="41" rx="3.2" ry="1.2" fill="${c.mV(a.m)}"/><path d="M25 50H39L41 58.4H23z" fill="${c.mH(a.m)}"/>` +
    `<circle cx="32" cy="19" r="5.6" fill="${c.gl(a.g)}"/>` + glyph(a.e, 32, 19, 3.8) + shine('M22 10C22 18 24 25 27 29', .9);
  F.starRing = (c, a) => `<path d="M29.5 57.6L30 42H34L34.5 57.6z" fill="${c.mH(a.m)}"/><circle cx="32" cy="24" r="17" fill="none" stroke="${c.mH(a.m)}" stroke-width="3.4"/>` +
    `<circle cx="32" cy="24" r="13.6" fill="${c.gl(a.g)}" fill-opacity=".85"/>` + glyph('star', 32, 24.6, 10.5, '#fff6cf') + shine('M19 16A15 15 0 0 1 27 9', 1);
  F.gem = (c, a) => `<path d="M29.5 57.6L28 38H36L34.5 57.6z" fill="${c.mH(a.m)}"/><path d="M24 38H40L38 41H26z" fill="${c.mV(a.m)}"/>` +
    `<path d="M18 16L25 7H39L46 16L32 37z" fill="${c.gl(a.g)}" stroke="${c.mH('chrome')}" stroke-width=".7"/><path d="M18 16H46M25 7L28.5 16L32 37L35.5 16L39 7" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>`;
  F.shield = (c, a) => `<path d="M29.5 57.6L29 44H35L34.5 57.6z" fill="${c.mH(a.m)}"/><path d="M32 4L47 9V23C47 33 40.5 40.5 32 44C23.5 40.5 17 33 17 23V9z" fill="${c.mH(a.m)}"/>` +
    `<path d="M32 8L43.5 12V23C43.5 30.5 38.8 36.6 32 40C25.2 36.6 20.5 30.5 20.5 23V12z" fill="${c.gl(a.g)}"/>` + glyph(a.e, 32, 23, 7);
  F.splitObelisk = (c, a) => `<path d="M23 57.6L24 18L30 6V57.6z" fill="${c.mH(a.m)}"/><path d="M34 57.6V10L40 20L41 57.6z" fill="${c.mH(a.m)}"/>` +
    `<path d="M30 6L32 3L34 10V57.6H30z" fill="${c.gl(a.g)}"/>` + glyph(a.e, 32, 36, 4.2) + shine('M25 22V54', .8);
  F.stepPyramid = (c, a) => `<path d="M16 57.6H48V50H16zM19 50H45V42H19zM22 42H42V34H22zM25 34H39V26H25z" fill="${c.mH(a.m)}"/>` +
    `<path d="M16 50H48M19 42H45M22 34H42" stroke="#000" stroke-opacity=".3" stroke-width=".6"/><path d="M27 26L32 8L37 26z" fill="${c.gl(a.g)}" stroke="${c.mH(a.m)}" stroke-width=".7"/>` + glyph(a.e, 32, 20, 3.2);
  F.monolith = (c, a) => `<path d="M22 57.6V8L42 4V57.6z" fill="${c.mH('black')}" stroke="${c.mH('silver')}" stroke-width=".8"/>` +
    `<path d="M24.5 54V10L39.5 7V54z" fill="${c.gl(a.g)}" fill-opacity=".55"/>` + glyph(a.e, 32, 26, 6) + `<path d="M25 44H39" stroke="${c.mH('silver')}" stroke-width=".8"/>` + shine('M24 12V52', .7);
  F.disc = (c, a) => `<path d="M28 57.6L29 46H35L36 57.6z" fill="${c.mH(a.m)}"/><circle cx="32" cy="26" r="20" fill="${c.mH(a.m)}"/><circle cx="32" cy="26" r="16.6" fill="${c.glR(a.g)}"/>` +
    `<circle cx="32" cy="26" r="12" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".5" stroke-dasharray="1.2 .9"/>` + glyph(a.e, 32, 26, 7) + shine('M17 18A17 17 0 0 1 26 10', 1.1);
  F.orb = (c, a) => `<path d="M24 57.6L28 38H36L40 57.6z" fill="${c.mH(a.m)}"/><path d="M22 38H42" stroke="${c.mH(a.m)}" stroke-width="2"/>` +
    `<circle cx="32" cy="22" r="15" fill="${c.glR(a.g)}"/><ellipse cx="32" cy="22" rx="15" ry="4.5" fill="none" stroke="${c.mH(a.m)}" stroke-width="1.2"/>` + glyph(a.e, 32, 22, 5);
  F.laurelCup = (c, a) => {
    let s = `<path d="M20 12H44L41 27C39 33 36 35 32 35S25 33 23 27z" fill="${c.mH(a.m)}"/><ellipse cx="32" cy="12" rx="12" ry="1.7" fill="${c.mV(a.m)}"/>` +
      `<path d="M30.5 35L30 48H34L33.5 35z" fill="${c.mH(a.m)}"/><path d="M24 48H40L42 58.4H22z" fill="${c.mH(a.m)}"/>`;
    for (const k of [-1, 1]) for (let i = 0; i < 5; i++) { const y = 34 - i * 6, x = 32 + k * (14 - i * .4); s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="1.8" ry="3.6" transform="rotate(${k * (25 + i * 6)} ${n(x)} ${n(y)})" fill="${c.gl(a.g)}"/>`; }
    return s + glyph(a.e, 32, 22, 5);
  };
  F.teamFive = (c, a) => { // Команда года: пять клинков-игроков вырастают из общей золотой чаши-основания, ядро из стекла, звезда наверху
    let s = `<ellipse cx="32" cy="27" rx="25" ry="24" fill="${c.grad('tyhalo', .5, .45, .5, 0, [[0, '#ffe9a0', .4], [1, '#ffcc4d', 0]], true)}"/>`;
    // клинки сходятся вниз к центру и уходят в чашу: нижние концы спрятаны под ней
    const blades = [[-14, 20, -6], [-7.5, 11, -3], [0, 5, 0], [7.5, 11, 3], [14, 20, 6]];
    blades.forEach(([dx, top, lean]) => {
      const x = 32 + dx, bx = 32 + dx * .45;
      s += `<path d="M${n(bx - 2.4)} 50L${n(x - 2.3)} ${top + 7}L${n(x)} ${top}L${n(x + 2.3)} ${top + 7}L${n(bx + 2.4)} 50z" fill="${c.mH(a.m)}" stroke="${c.mV(a.m)}" stroke-width=".4"/>` +
        `<path d="M${n(x)} ${top + 1}L${n(bx)} 49" stroke="#fff" stroke-opacity=".35" stroke-width=".5"/>`;
    });
    s += `<path d="M26 50C26 39 28.5 31 32 27C35.5 31 38 39 38 50z" fill="${c.gl(a.g)}" stroke="${c.mH(a.m)}" stroke-width=".9"/>` +
      glyph('crown', 32, 41, 3, '#fff6cf') +
      // чаша-основание: в неё вставлены все пять клинков
      `<path d="M17 46.5H47L44.5 55.5C43.5 57 41 57.6 38 57.6H26C23 57.6 20.5 57 19.5 55.5z" fill="${c.mH(a.m)}"/>` +
      `<ellipse cx="32" cy="46.5" rx="15" ry="2" fill="${c.mV(a.m)}"/><ellipse cx="32" cy="46.5" rx="12.5" ry="1.1" fill="#3a2604" fill-opacity=".45"/>` +
      `<rect x="25" y="49.6" width="14" height="5" rx=".6" fill="${c.flat('#7a1420', 'tyrib')}" stroke="${c.mV('pale')}" stroke-width=".4"/>` + txt(32, 53.3, 'TEAM', 3.1, '#fff', ' letter-spacing=".8"') +
      glyph('star', 32, 3.4, 3.2, '#fff3c4') + shine('M18.5 47.5L20.5 55', .7);
    return s;
  };
  function award(type, year) {
    const a = AWARDS[type] || AWARDS.poty, fn = F[a.f] || F.crystalTall, c = new Ctx();
    const ys = String(Number(year) || '').slice(-2);
    const base = `<ellipse cx="32" cy="69.6" rx="17" ry="1.9" fill="${c.shadow()}"/>` +
      `<path d="M17 69.2L18.5 61H45.5L47 69.2z" fill="${c.mV('black')}"/><rect x="20" y="57.6" width="24" height="3.8" rx=".6" fill="${c.mV('black')}"/>` +
      `<path d="M20 57.9H44" stroke="#fff" stroke-opacity=".25" stroke-width=".5"/>` +
      `<rect x="24" y="63" width="16" height="4" rx=".5" fill="${c.mH(a.m === 'black' ? 'silver' : a.m)}"/>` + (ys ? txt(32, 66.1, "'" + ys, 3, '#1a1205') : '');
    return c.svg(base + fn(c, a), null, 'tw-award-svg', `${type} ${year || ''}`);
  }
  const A = AWARDS;

  // ---------------------------------------------------------------- отметки Tier-2/3/квалификаций
  function marker(name, season, kind) {
    if (kind === 'show') { // шоу-события: микрофон-звезда, без кубка
      const c = new Ctx();
      const b = `<circle cx="32" cy="32" r="22" fill="${c.flat('#6b2fb3', 'shw')}" stroke="#d6b8ff" stroke-width="1.4"/><path d="M32 16l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.9-5.7 8.1-1.2z" fill="#ffe27a"/>` +
        `<rect x="18" y="50" width="28" height="9" rx="3" fill="#2a1a45" stroke="#d6b8ff" stroke-width=".8"/>` + txt(32, 56.8, 'SHOW', 5, '#ffe27a');
      return c.svg(b, '0 0 64 72', 'tw-placeholder tw-placeholder-show', 'Шоу-событие');
    }
    const k = ['tier2', 'tier3', 'qual'].includes(kind) ? kind : 'tier3';
    const r = hash(`mk|${k}|${name}|${season}`), v = r % 3, c = new Ctx();
    const pal = { tier2: ['#c18a42', '#73502b', '#ffe0a5'], tier3: ['#7e91a8', '#46586d', '#d1dbe7'], qual: ['#42b7df', '#245c9e', '#bcecff'] }[k];
    const [mid, dark, light] = pal;
    const ini = (String(name || '').match(/\b[A-Z0-9]/g) || ['?']).slice(0, 3).join('');
    let s = '';
    if (k === 'tier2') {
      if (v === 0) { // розетка с лентами
        s = `<path d="M24 40L19 64L26 59L30 66L32 44zM40 40L45 64L38 59L34 66L32 44z" fill="${c.flat(dark, 't2r')}"/>`;
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; s += `<circle cx="${n(32 + Math.cos(a) * 15)}" cy="${n(28 + Math.sin(a) * 15)}" r="4.2" fill="${c.flat(mid, 't2m')}"/>`; }
        s += `<circle cx="32" cy="28" r="13" fill="${c.flat(dark, 't2r')}" stroke="${light}" stroke-width="1"/>` + txt(32, 26.5, 'TIER 2', 2.6, light) + txt(32, 32.5, ini, 4.4, '#fff');
      } else if (v === 1) { // вымпел
        s = `<path d="M17 8V66" stroke="${c.mH('silver')}" stroke-width="1.8"/><path d="M18 9H50L42 26L50 43H18z" fill="${c.flat(mid, 't2m')}" stroke="${light}" stroke-width="1"/>` +
          `<path d="M18 15H44" stroke="${dark}" stroke-width="2"/>` + txt(30, 31, ini, 6, '#fff') + txt(30, 38, 'TIER 2', 2.6, light);
      } else { // медальон на ленте
        s = `<path d="M22 4L32 30L42 4z" fill="${c.flat(dark, 't2r')}"/><path d="M26 4L32 22L38 4" fill="${c.flat(mid, 't2m')}"/>` +
          `<circle cx="32" cy="42" r="15" fill="${c.mR('bronze')}"/><circle cx="32" cy="42" r="11" fill="none" stroke="${light}" stroke-opacity=".7" stroke-width=".8"/>` + txt(32, 44.6, ini, 6, '#3a2208');
      }
    } else if (k === 'tier3') {
      if (v === 0) { // шестигранная нашивка
        s = `<path d="M32 9l19 11v22L32 53 13 42V20z" fill="${c.flat(dark, 't3d')}" stroke="${light}" stroke-width="1.6"/><path d="M32 14l14 8v16l-14 8-14-8V22z" fill="${c.flat(mid, 't3m')}"/>` +
          txt(32, 32.6, ini, 6, '#fff') + txt(32, 39, 'TIER 3', 2.6, light);
      } else if (v === 1) { // шеврон-патч
        s = `<path d="M10 14H54V40L32 56L10 40z" fill="${c.flat(dark, 't3d')}" stroke="${light}" stroke-width="1.4" stroke-dasharray="2 1.2"/><path d="M16 22L32 32L48 22V30L32 40L16 30z" fill="${c.flat(mid, 't3m')}"/>` +
          txt(32, 20.5, ini, 4.4, '#fff');
      } else { // значок-пин
        s = `<circle cx="32" cy="30" r="20" fill="${c.flat(dark, 't3d')}" stroke="${light}" stroke-width="1.4"/><circle cx="32" cy="30" r="14" fill="${c.flat(mid, 't3m')}"/>` +
          `<path d="M28 50H36L34 60H30z" fill="${c.mH('chrome')}"/>` + txt(32, 33, ini, 6, '#fff');
      }
    } else {
      if (v === 0) { // билет
        s = `<path d="M9 18h46a3 3 0 0 1 3 3v7a5 5 0 0 0 0 10v7a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-7a5 5 0 0 0 0-10v-7a3 3 0 0 1 3-3z" fill="${c.flat(mid, 'qm')}" stroke="${light}" stroke-width="1.4"/>` +
          `<path d="M44 20v26" stroke="${light}" stroke-width="1.2" stroke-dasharray="2 1.6"/>` + txt(25, 32, 'QUALIFIED', 4.2, '#fff') + txt(25, 38.5, ini, 3.4, light);
      } else if (v === 1) { // штамп
        s = `<circle cx="32" cy="34" r="22" fill="none" stroke="${mid}" stroke-width="2.4"/><circle cx="32" cy="34" r="17.5" fill="none" stroke="${mid}" stroke-width="1"/>` +
          `<g transform="rotate(-14 32 34)"><rect x="9" y="28" width="46" height="11" fill="${c.flat(dark, 'qd')}"/>` + txt(32, 36.2, 'QUALIFIED', 5, '#fff') + '</g>' + txt(32, 22, ini, 3.6, mid);
      } else { // пропуск-стрела
        s = `<path d="M8 22H40L54 34L40 46H8z" fill="${c.flat(mid, 'qm')}" stroke="${light}" stroke-width="1.3"/><circle cx="15" cy="34" r="3" fill="${c.flat(dark, 'qd')}"/>` +
          txt(32, 33, 'PASS', 5, '#fff') + txt(32, 39.5, ini, 3.2, light);
      }
    }
    const label = k === 'qual' ? 'Квалификация' : k === 'tier2' ? 'Tier-2 результат' : 'Tier-3 результат';
    return c.svg(s, '0 0 64 72', `tw-placeholder tw-placeholder-${k}`, label);
  }

  window.CS2TrophyForge = Object.freeze({ cup, cupSpec, award, marker, organizers: ORGS.map(o => o.key), awardTypes: Object.keys(AWARDS) });
})();
