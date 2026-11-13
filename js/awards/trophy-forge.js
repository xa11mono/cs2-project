/* v84 — «кузница» трофеев.
   1) Кубки Tier-1 / S-Tier / Major: у каждого организатора свои силуэты (по мотивам реальных
      трофеев HLTV), силуэт одного организатора никогда не используется другим.
        IEM ........... гравированная стеклянная тарелка; IEM Cologne/Katowice — чаша из колец
        ESL Pro League  витая чёрная колонна с золотой лентой
        BLAST ......... треугольник с внутренним вырезом (золото/серебро/синий/фиолетовый/чёрный)
        PGL ........... «коготь» из трёх изогнутых лезвий; синий кубок в золотой ажурной решётке
        Major ......... своего кубка нет: форма хоста + лента MAJOR и сияние
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
    gold:   ['#5e4210', '#a67c2c', '#dcb560', '#f8e8b8', '#c49a46', '#6e4e16'],
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
    blackgold:['#050607', '#2a2414', '#c9a24a', '#fff0b8', '#5c4a1c', '#0b0a07'],
    // v104: «благородные» серые металлы
    titanium:['#24272b', '#666c73', '#bfc4c9', '#f2f4f6', '#90969d', '#33373c'],
    steel:   ['#1f242a', '#5d6670', '#b4bdc7', '#eef2f6', '#86909b', '#2c3238'],
    iron:    ['#161617', '#4a4a4d', '#97979b', '#dcdcdf', '#6c6c70', '#232325'],
    teal:    ['#04302b', '#0e7a6f', '#3fd6c4', '#d9fffa', '#1fa596', '#0a3d37'],
    white:   ['#8a8f96', '#c9cdd2', '#eef0f2', '#ffffff', '#dfe2e6', '#a3a8ae'],
    // v131: приглушённые «тёмные» металлы для IEM: чёрный титан и воронёная сталь
    blacktitan: ['#0c0d0f', '#2a2d32', '#5b6068', '#b4bac2', '#3d4249', '#141518'],
    bluesteel:  ['#11161c', '#3a4552', '#7b8a9a', '#d3dce6', '#55636f', '#1a2129']
  };
  // Допустимые покрытия по организатору: силуэт фиксирован, отделка меняется по сезонам.
  const FINISH = {
    'IEM-big': ['silver', 'titanium', 'steel', 'chrome', 'blacktitan', 'iron', 'titanium', 'bluesteel', 'gunmetal', 'gold', 'silver', 'blacktitan'],
    IEM: ['silver', 'titanium', 'steel', 'chrome', 'blacktitan', 'iron', 'titanium', 'bluesteel', 'gunmetal', 'gold', 'silver', 'steel'],
    EPL: ['gold', 'pale', 'rose', 'chrome'],
    BLAST: ['gold', 'silver', 'chrome', 'pale', 'gold', 'rose', 'titanium'],
    PGL: ['gold', 'chrome', 'silver', 'gold', 'rose', 'pale', 'titanium', 'blacktitan', 'gunmetal'],
    DHM: ['silver', 'chrome', 'rose', 'titanium'],
    SL: ['gold', 'silver', 'rose', 'pale', 'chrome'],
    Thunderpick: ['gold', 'pale', 'gold', 'silver', 'blacktitan'],
    PW: ['gold', 'silver', 'chrome', 'pale', 'blacktitan', 'gunmetal'],
    FISSURE: ['gold', 'chrome', 'gold', 'pale', 'blacktitan'],
    BetBoom: ['chrome', 'gold', 'pale', 'titanium'],
    CCT: ['silver', 'chrome', 'gold', 'titanium'],
    ENC: ['silver', 'chrome', 'silver', 'gold'],
    CAC: ['silver', 'chrome', 'gold', 'titanium', 'rose', 'blacktitan', 'bluesteel'],
    XSE: ['pale', 'gold', 'silver', 'chrome', 'rose', 'blacktitan', 'gunmetal'],
    EWC: ['silver', 'chrome', 'pale', 'gold', 'blacktitan'],
    Nations: ['gold', 'silver', 'pale', 'chrome'],
    FiRe: ['gold', 'pale', 'chrome'],
    custom: ['silver', 'gold', 'chrome', 'rose', 'bronze', 'pale', 'titanium']
  };
  const GLASS_POOL = ['ice', 'blue', 'violet', 'cyan', 'green', 'amber', 'red', 'navy'];
  const GLASS = {
    ice: '#bfe6ff', blue: '#4f8fff', violet: '#a77bff', cyan: '#4fd8e8', mint: '#5be0ad',
    ruby: '#ff5d6c', amber: '#ffb347', smoke: '#7c8796', pink: '#ff7ad9',
    // v102: цвета флагов и пар
    sky: '#00b5d6', red: '#d8262e', green: '#13a05a', navy: '#25408f', yellow: '#ffd21f', orange: '#ff7a1a', white: '#eef3f8'
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
  // v97: металл с «студийным» отражением — тёмные кромки, широкий блик, резкая линия горизонта, отражённый свет справа
  Ctx.prototype.mH = function (m) { const c = METAL[m] || METAL.silver;
    // v102: без почти чёрной полосы посередине и чёрных краёв — тени мягкие, в тон металла
    const edge = mix(c[1], c[0], .4), dip = mix(c[1], c[4], .35);
    return this.grad('h' + m, 0, 0, 1, 0, [[0, edge], [.08, c[1]], [.2, c[2]], [.29, c[3]], [.36, c[2]], [.5, c[4]], [.6, dip], [.72, c[4]], [.86, c[2]], [.94, c[1]], [1, edge]]); };
  // объём: сверху свет, снизу тень — накладывается поверх формы тем же контуром
  Ctx.prototype.ao = function () { return this.grad('ao', 0, 0, 0, 1, [[0, '#fff', .2], [.28, '#fff', 0], [.6, '#000', 0], [1, '#000', .26]]); };
  Ctx.prototype.warm = function () { return this.grad('warm', 0, 0, 0, 1, [[0, '#ff8a1f', 0], [.7, '#ff8a1f', 0], [1, '#ff8a1f', .22]]); };   // тёплый отсвет сцены снизу
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

  // v97: объёмная деталь — металл + затенение + тёплый отсвет сцены
  const vol = (c, d, fill, extra) => `<path d="${d}" fill="${fill}"${extra || ''}/><path d="${d}" fill="${c.ao()}"/><path d="${d}" fill="${c.warm()}"/>`;
  // край чаши: светлый обод и тёмное нутро
  const lip = (c, y, rx, m, ry) => { ry = ry || n(rx * .15); return `<ellipse cx="32" cy="${y}" rx="${rx}" ry="${ry}" fill="${c.mV(m)}"/><ellipse cx="32" cy="${n(y + ry * .12)}" rx="${n(rx - 1.3)}" ry="${n(ry * .62)}" fill="${c.grad('lipin', 0, 0, 0, 1, [[0, '#000', .78], [1, '#000', .35]])}"/>`; };
  // ручка: тёмная подложка, металл, тонкий блик
  const handle = (c, d, m, w) => `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="${n((w || 2.4) + .9)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c.mV(m)}" stroke-width="${w || 2.4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="${n((w || 2.4) * .22)}" stroke-linecap="round"/>`;
  // ножка с «яблоком» и расклёшенной стопой: от y0 (низ чаши) до y1 (верх постамента)
  const stem = (c, m, y0, y1, w0, wf) => { const k = y0 + (y1 - y0) * .34, hw = w0 / 2, f = wf / 2;
    return vol(c, `M${n(32 - hw)} ${y0}C${n(32 - hw * .7)} ${n(k - 2)} ${n(32 - hw * .7)} ${n(k + 2)} ${n(32 - hw * .85)} ${n(k + 3)}C${n(32 - hw)} ${n(y1 - 4)} ${n(32 - f * .7)} ${n(y1 - 1.6)} ${n(32 - f)} ${y1}H${n(32 + f)}C${n(32 + f * .7)} ${n(y1 - 1.6)} ${n(32 + hw)} ${n(y1 - 4)} ${n(32 + hw * .85)} ${n(k + 3)}C${n(32 + hw * .7)} ${n(k + 2)} ${n(32 + hw * .7)} ${n(k - 2)} ${n(32 + hw)} ${y0}z`, c.mH(m)) +
      `<ellipse cx="32" cy="${n(k)}" rx="${n(hw * 1.75)}" ry="${n(hw * .62)}" fill="${c.mH(m)}"/><ellipse cx="32" cy="${n(k - hw * .2)}" rx="${n(hw * 1.5)}" ry="${n(hw * .28)}" fill="#fff" fill-opacity=".35"/>` +
      `<ellipse cx="32" cy="${y1}" rx="${n(f)}" ry="${n(f * .16)}" fill="${c.mV(m)}"/>`; };

  // ---------------------------------------------------------------- постаменты
  function pedestal(c, kind, metal, w, label) {
    w = w || 26;
    const x = 32 - w / 2, lac = c.grad('lac', 0, 0, 1, 0, [[0, '#050608'], [.18, '#1c2128'], [.3, '#4a535e'], [.36, '#20252c'], [.62, '#0b0d10'], [.86, '#262c34'], [1, '#050608']]);
    const top = c.grad('lactop', 0, 0, 0, 1, [[0, '#5d6772'], [1, '#191d23']]);
    let s = `<ellipse cx="32" cy="69.7" rx="${n(w * .7)}" ry="2.1" fill="${c.shadow()}"/>`;
    if (kind === 'wood') {
      const wd = c.grad('wood', 0, 0, 1, 0, [[0, '#2b1608'], [.2, '#6b3f1c'], [.34, '#8d5a2c'], [.5, '#5a3418'], [.8, '#7a4a24'], [1, '#2b1608']]);
      s += `<path d="M${n(x)} 61.4h${w}v7.8h${-w}z" fill="${wd}"/><path d="M${n(x)} 61.4h${w}l-1.6-3.6h${n(-(w - 3.2))}z" fill="${c.flat('#8d5a2c', 'wood2')}"/>`;
    } else if (kind === 'round') {
      s += `<path d="M${n(x)} 61.2v6.2a${n(w / 2)} 2.3 0 0 0 ${w} 0V61.2z" fill="${lac}"/><ellipse cx="32" cy="61.2" rx="${n(w / 2)}" ry="2.3" fill="${top}"/><ellipse cx="32" cy="61.2" rx="${n(w / 2 - 1.4)}" ry="1.5" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".3"/>`;
    } else if (kind === 'slab') {
      s += `<path d="M${n(x)} 69.2L${n(x + 2.6)} 58.6H${n(x + w - 2.6)}L${n(x + w)} 69.2z" fill="${lac}"/><path d="M${n(x + 2.6)} 58.6H${n(x + w - 2.6)}l-1.4-1.3H${n(x + 4)}z" fill="${top}"/>`;
    } else {
      s += `<path d="M${n(x)} 63.2h${w}v6h${-w}z" fill="${lac}"/><path d="M${n(x)} 63.2h${w}l-1.2-1.1H${n(x + 1.2)}z" fill="${top}"/>` +
        `<path d="M${n(x + w * .14)} 58.8h${n(w * .72)}v3.4h${n(-w * .72)}z" fill="${lac}"/><path d="M${n(x + w * .14)} 58.8h${n(w * .72)}l-1-1H${n(x + w * .14 + 1)}z" fill="${top}"/>`;
    }
    const py = kind === 'round' ? 63.5 : 64.5;
    s += `<rect x="${n(32 - w * .25)}" y="${py}" width="${n(w * .5)}" height="2.9" rx=".35" fill="${c.mV(metal || 'gold')}" stroke="#000" stroke-opacity=".5" stroke-width=".2"/>`;
    if (label) s += txt(32, py + 2.15, label, 1.9, '#1a1205');
    else s += `<path d="M${n(32 - w * .17)} ${py + 1}h${n(w * .34)}M${n(32 - w * .12)} ${py + 1.9}h${n(w * .24)}" stroke="#000" stroke-opacity=".4" stroke-width=".3"/>`;
    return s;
  }

  // ---------------------------------------------------------------- организаторы
  const D = {};
  // диск без подставки: крупнее и по центру кадра, с мягкой тенью
  const bareDisc = (c, body, cy) => `<ellipse cx="32" cy="67" rx="17" ry="2" fill="${c.shadow()}"/><g transform="translate(32 36) scale(1.2) translate(-32 -${cy})">${body}</g>`;
  D.eplSpire = (c, o) => { // витая колонна ESL Pro League
    let s = pedestal(c, 'round', o.metal, 18) +
      vol(c, 'M25 58C22 44 25 30 29 16C30.5 10 34 6 38 3C37 14 40 28 39 40C38.5 47 39 53 39 58z', c.mH(o.body || 'black')) +
      `<path d="M27.5 57C30 50 36 46 36.8 38C35 32 31 30 30.2 22C31 15 34 9 36.6 5C33.8 12 32.6 18 33.6 24C35 31 38.6 34 37.6 42C36.6 50 31 53 29.8 57z" fill="${c.mH(o.metal)}"/>` +
      txt(33.5, 30, 'ESL', 2.4, '#fff') + txt(33.5, 33.4, 'PRO', 2.6, '#fff') + txt(33.5, 36.6, 'LEAGUE', 1.9, '#fff') +
      shine('M28.6 50C27.4 40 28.6 28 31 18', .8);
    return s;
  };
  D.pglClaw = (c, o) => { // PGL: три изогнутых «лепестка» вокруг стеклянного клинка
    const m = o.metal, g = o.glass;
    const Lb = 'M30.4 58.6C23 50 16.4 39 18.6 25C19.8 17.6 23.6 11.4 28.4 7C25 16 24.8 26 27.6 35C29.6 42 31 50 31.6 58.6z';
    const Rb = 'M33.6 58.6C41 50 47.6 39 45.4 25C44.2 17.6 40.4 11.4 35.6 7C39 16 39.2 26 36.4 35C34.4 42 33 50 32.4 58.6z';
    return pglBase(c) +
      vol(c, Lb, c.mH(m)) + vol(c, Rb, c.mH(m)) +
      `<path d="M29.2 58.6C28.4 42 29.4 22 32 3C34.6 22 35.6 42 34.8 58.6z" fill="${g ? c.gl(g) : c.mV(m)}" stroke="${c.mH('chrome')}" stroke-width=".5"/><path d="M32 6V56" stroke="#fff" stroke-opacity=".45" stroke-width=".4"/>` +
      `<ellipse cx="32" cy="52.6" rx="5.6" ry="1.5" fill="${c.mH(m)}"/><ellipse cx="32" cy="52.2" rx="4.6" ry=".7" fill="#fff" fill-opacity=".35"/>` +
      shine('M20.6 27C21 20 23.2 14.4 26.2 10.4', .9) + shine('M43.4 27C43 20 40.8 14.4 37.8 10.4', .5);
  };
  D.mastersCup = (c, o) => { // DreamHack Masters: широкая чаша с гравированным поясом, ручки-скобы
    const m = o.metal, bowl = 'M16.5 8H47.5C47.5 20 43.5 32 34.6 37H29.4C20.5 32 16.5 20 16.5 8z';
    return pedestal(c, 'round', m, 24) + stem(c, m, 36.8, 58.8, 5, 15) +
      handle(c, 'M17 11C7.5 10 7 25 20 29.5', m, 2.6) + handle(c, 'M47 11C56.5 10 57 25 44 29.5', m, 2.6) +
      vol(c, bowl, c.mH(m)) + lip(c, 8, 15.5, m) +
      `<path d="M17.2 13.2Q32 17.4 46.8 13.2L46 18.6Q32 22.6 18 18.6z" fill="#06080b" fill-opacity=".62"/><path d="M17.2 13.2Q32 17.4 46.8 13.2M18 18.6Q32 22.6 46 18.6" fill="none" stroke="${c.mV(m)}" stroke-width=".4"/>` +
      txt(32, 19.4, 'MASTERS', 3, '#fff', ' fill-opacity=".92"') +
      `<path d="M24 26.5H40M25.4 29.4H38.6M27.4 32.2H36.6" stroke="#000" stroke-opacity=".22" stroke-width=".45"/>` +
      shine('M19.4 10.5C19.6 20 22 28.6 27 34', 1.1);
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
  // v102: векторные модели трофеев (2D-рендеры моделей пользователя → слои по яркости, без сглаживания, все мелкие детали).
  // Слой r:'m' — металл (уровни 0…n от тёмного к светлому), r:'a' — второй цвет (стекло/зазоры).
  // В документе каждая модель хранится один раз как <symbol>; трофей ссылается на неё через <use>
  // и задаёт цвета CSS-переменными (--m0…, --a0…). Без DOM (Node, тесты) модель встраивается целиком.
  const ARTS = window.CS2_TROPHY_ARTS || {};   // данные — js/data/trophy-arts.js
  // v103: цвет слоя = его яркость на рендере, перенесённая на палитру выбранного металла/стекла.
  // Так пропадают цветные отсветы рендера (синий/розовый свет), а отделки остаются честными.
  const lumHex = (h) => { const x = parseInt(String(h).slice(1), 16); return ((x >> 16 & 255) * .299 + (x >> 8 & 255) * .587 + (x & 255) * .114) / 255; };
  const MSTOPS = {
    gold:   ['#1e1406', '#4a3410', '#7d5a1e', '#ad8436', '#d2ad5f', '#ecd394', '#fff5d6'],
    pale:   ['#1d1a14', '#4a4232', '#7c705a', '#ab9e82', '#d3c8ad', '#efe8d6', '#ffffff'],
    silver: ['#0e1013', '#2b3037', '#525a65', '#808a97', '#b0b9c4', '#dce2e8', '#ffffff'],
    chrome: ['#07090c', '#1f252d', '#46505c', '#7a8696', '#b3becb', '#e3e9ef', '#ffffff'],
    rose:   ['#1d0f0c', '#4a2a22', '#7d4c3e', '#ad7563', '#d4a08c', '#efcbbb', '#fff2ec'],
    bronze: ['#170d05', '#3d2410', '#6b4422', '#99663a', '#c08c5c', '#e2b993', '#fbe7d2'],
    titanium: ['#0d0e10', '#2a2d31', '#4d5258', '#787e85', '#a7adb3', '#d5d9dd', '#f8f9fa'],
    steel:  ['#0b0d10', '#262a30', '#474d55', '#6f7781', '#9ca4ae', '#cdd3da', '#f3f5f7'],
    iron:   ['#0a0a0a', '#1f1f20', '#3a3a3c', '#5a5a5d', '#808084', '#acacb0', '#dcdcdf'],
    black:  ['#030304', '#0b0c0e', '#16181b', '#24272b', '#3a3e44', '#6a7079', '#c3c8cf'],
    // v105: сочные анодированные металлы и голограмма (для всех, кроме IEM)
    ruby:   ['#16030a', '#4a0716', '#8d1027', '#c8203d', '#ef5b73', '#ffc2cc', '#fff4f6'],
    teal:   ['#021614', '#06403b', '#0c7a70', '#17b3a4', '#5fe0d2', '#c4fff7', '#ffffff'],
    cobalt: ['#040a1f', '#0b1f55', '#1a3f9c', '#2f6fe0', '#78a8ff', '#d3e3ff', '#ffffff'],
    violet: ['#0f0520', '#2c0f5c', '#5221a8', '#7d4fe0', '#ae8cff', '#e4d8ff', '#ffffff'],
    emerald:['#021309', '#063d22', '#0c7a45', '#17b36a', '#5fe0a3', '#c4ffe2', '#ffffff'],
    holo:   ['#120a2e', '#2e2a8a', '#2f74d6', '#2fd0c8', '#b6f0ff', '#f6c6ff', '#ffffff'],
    white:  ['#2e3136', '#6d727a', '#a9aeb5', '#d3d7dc', '#ebedf0', '#f7f8f9', '#ffffff']
  };
  const KSTOPS = ['#06070a', '#14171c', '#262b33', '#3e4550', '#626b78', '#98a1ad', '#e6eaef'];
  function metalStops(m) {
    if (m === 'blackgold') m = 'gold';
    if (MSTOPS[m]) return MSTOPS[m];
    const c = (METAL[m] || METAL.silver).slice().sort((x, y) => lumHex(x) - lumHex(y));
    return [mix(c[0], '#000000', .6)].concat(c, [mix(c[c.length - 1], '#ffffff', .6)]);
  }
  const glassStops = (g) => { const h = gc(g); return [mix(h, '#000000', .88), mix(h, '#000000', .68), mix(h, '#000000', .46), mix(h, '#000000', .24), mix(h, '#000000', .06), mix(h, '#ffffff', .32), mix(h, '#ffffff', .78)]; };
  function sampleStops(st, t) { t = Math.max(0, Math.min(1, t)); const q = t * (st.length - 1), i = Math.min(st.length - 2, Math.floor(q)); return mix(st[i], st[i + 1], q - i); }
  function artBody(key, ramps) {
    const A = ARTS[key]; let s = '';
    for (const L of A.layers) { const fb = A.cols[L.r][L.l];
      s += `<path d="${L.d}" fill="${ramps ? (ramps[L.r][L.l] || fb) : `var(--${L.r}${L.l},${fb})`}" fill-rule="evenodd"/>`; }
    return s;
  }
  function artSymbol(key) {
    try {
      if (typeof document === 'undefined' || !document.body) return null;
      const id = 'cs2Art3_' + key;
      if (document.getElementById(id)) return id;
      const holder = document.createElement('div');
      holder.setAttribute('aria-hidden', 'true');
      holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><symbol id="${id}" viewBox="5 1 54 71">${artBody(key, null)}</symbol></svg>`;
      document.body.appendChild(holder);
      return id;
    } catch (e) { return null; }
  }
  function artRamps(key, o) {
    const A = ARTS[key], out = {}, def = A.def || {};
    if (def.nativeAll) return Object.assign({}, A.cols); // цвета как на рендере (значки Top-20)
    for (const role of Object.keys(A.cols)) {
      const Ls = A.cols[role].map(lumHex);
      if (def.native && role === 'm') { out.m = A.cols.m; continue; } // ESL Pro League: золото как на оригинале
      if (def.native && role === 'k') { // корпус: оригинальный чёрный, вариации — лёгкий оттенок чёрного
        const tint = EPL_TINT[o.body || 'black'];
        if (tint && tint.m) { const st2 = metalStops(tint.m); out.k = A.cols.k.map(x => sampleStops(st2, .3 + .7 * lumHex(x) * 1.6)); }
        else out.k = A.cols.k.map(x => tint ? mix(x, tint, .38) : x);
        continue; }
      if (role === 'f') { out.f = A.cols.f; continue; }
      let st;
      const m2 = o.metal2 && (METAL[o.metal2] || MSTOPS[o.metal2]) ? o.metal2 : null;
      if (role === 'm') {
        st = metalStops(METAL[o.metal] || MSTOPS[o.metal] ? o.metal : (def.m || 'gold'));
        // двухцветность: тёмные уровни (внутренняя часть, углубления, полосы) — вторым металлом
        if (m2 && def.split) { const st2 = metalStops(m2); out.m = Ls.map((L, i) => sampleStops(i < def.split ? st2 : st, L)); continue; }
        // канты: самые светлые уровни (рёбра, обод) — вторым металлом
        if (m2 && def.splitTop) { const st2 = metalStops(m2); out.m = Ls.map((L, i) => i >= def.splitTop ? sampleStops(st2, .38 + .42 * L) : sampleStops(st, L)); continue; }
      } else if (role === 'a') st = glassStops(o.glass || o.second || def.a || 'blue');
      else if (role === 'g') st = metalStops(o.metal2 || def.g || 'gold');   // второй металл (ленты/канты)
      else if (role === 'p') st = metalStops(o.metal3 || def.p || 'rose');   // третий металл (розовые вставки)
      else if (def.kMetal) { const stm = metalStops(METAL[o.metal] || MSTOPS[o.metal] ? o.metal : (def.m || 'gold')); out.k = Ls.map(L => sampleStops(stm, .22 + .55 * L)); continue; } // тёмные пятна — тенью того же металла
      else if (def.kdark) { const BK = ['#0b0b0c', '#141415', '#1c1c1e', '#262628', '#38383b', '#5e5e63', '#a9a9b0']; out.k = A.cols.k.map((x, i) => sampleStops(BK, i / Math.max(1, A.cols.k.length - 1))); continue; } // чёрный камень
      else if (def.kb) { const BL = ['#15171c', '#20232a', '#2e333b', '#4a505a', '#7f8793', '#cfd5dd']; out.k = A.cols.k.map((x, i) => sampleStops(BL, .08 + .92 * i / Math.max(1, A.cols.k.length - 1))); continue; } // чёрный лак: читается на тёмном фоне
      else st = m2 && m2 !== 'black' ? metalStops(m2) : KSTOPS; // корпус/подставка: чёрный по умолчанию, иначе второй металл (белый, титан…)
      const strk = role === 'm' ? def.mstretch : role === 'a' ? def.astretch : null;
      if (strk && role !== 'f') { const lo = Math.min(...Ls), hi = Math.max(...Ls);
        const st2 = role === 'm' ? metalStops(METAL[o.metal] || MSTOPS[o.metal] ? o.metal : (def.m || 'gold')) : glassStops(o.glass || o.second || def.a || 'blue');
        out[role] = Ls.map((L, i) => { const t = strk[0] + (strk[1] - strk[0]) * Math.pow((L - lo) / Math.max(.01, hi - lo), strk[2] || 1);
          return role === 'm' && def.rimSecond && o.second && !o.glass && i >= def.rimSecond ? mix(sampleStops(glassStops(o.second), .35 + .5 * t), sampleStops(st2, t), .35) : sampleStops(st2, t); });
        continue; } // у металлического BLAST светлые канты-рёбра — в цвете вставки // растяжка яркости: тёмный рендер не даёт тусклый металл
      if (def.aboost && role === 'a') { const lo = Math.min(...Ls), hi = Math.max(...Ls); out.a = Ls.map(L => sampleStops(st, .32 + .62 * (L - lo) / Math.max(.01, hi - lo))); continue; }
      out[role] = Ls.map(L => sampleStops(st, L));
    }
    return out;
  }
  function art(c, key, o, scale) {
    const r = artRamps(key, o), A = ARTS[key], sm = A.def && A.def.smooth;
    const id = sm ? null : artSymbol(key);
    let body;
    if (sm) { // ровные грани: силуэт — плавным градиентом по палитре металла, поверх — только снятые с рендера светлые рёбра
      const st = metalStops(METAL[o.metal] || MSTOPS[o.metal] ? o.metal : (A.def.m || 'silver'));
      const g = c.grad('sm' + key + (o.metal || ''), 0, 0, 1, 1, sm.g.map(q => [q[0], sampleStops(st, q[1])]));
      body = '';
      for (const L of A.layers) { if (L.l !== 0 && L.l < sm.keep) continue;
        body += `<path d="${L.d}" fill="${L.l === 0 ? g : r[L.r][L.l]}" fill-rule="evenodd"/>`; }
    } else if (id) {
      const vars = Object.keys(r).map(role => r[role].map((x, i) => `--${role}${i}:${x}`).join(';')).join(';');
      body = `<use href="#${id}" x="5" y="1" width="54" height="71" style="${vars}"/>`;
    } else body = artBody(key, r);
    // v126: обрезка снизу — на рендере под моделью была тень пола, она перекрашивалась в цвет металла
    if (A.def && A.def.clipY) { const cid = c.id + (c.k++);
      c.defs.push(`<clipPath id="${cid}" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="64" height="${A.def.clipY}"/></clipPath>`);
      body = `<g clip-path="url(#${cid})">${body}</g>`; }
    if (scale) body = `<g transform="translate(${scale[1]} ${scale[2]}) scale(${scale[0]}) translate(-32 -36)">${body}</g>`;
    return { body, r };
  }
  // процедурная надпись: подгоняет ширину строки под табличку
  function fitTxt(x, y, str, size, maxW, fill, extra) {
    str = String(str || ''); const est = str.length * size * .6;
    const fit = est > maxW ? ` textLength="${n(maxW)}" lengthAdjust="spacingAndGlyphs"` : '';
    return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${size}" fill="${fill}"${fit}${extra || ''}>${esc(str)}</text>`;
  }
  const escLogo = (cx, cy, r, ring, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ring}" stroke-width="${n(r * .22)}"/>` +
    `<path d="M${n(cx - r * .55)} ${n(cy + r * .25)}L${n(cx + r * .25)} ${n(cy - r * .55)}M${n(cx - r * .3)} ${n(cy + r * .55)}L${n(cx + r * .55)} ${n(cy - r * .3)}" stroke="${fill}" stroke-width="${n(r * .2)}" stroke-linecap="round"/>`;
  const shadowUnder = (c, rx) => `<ellipse cx="32" cy="70" rx="${rx || 16}" ry="1.6" fill="${c.shadow()}"/>`;

  // v124: металлический отблеск для векторных кубков — контрастные блики-полосы по силуэту, свет сверху, тень снизу
  function sheen(c, key) { // рельефный блик по форме: свет падает на скосы краёв каждой детали (а не полосы поверх)
    if (c.memo.sheenF) return c.memo.sheenF; const id = c.id + (c.k++);
    c.defs.push(`<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation=".45" result="b"/>` +
      `<feSpecularLighting in="b" surfaceScale="2.6" specularConstant="1.15" specularExponent="22" lighting-color="#ffffff" result="s"><feDistantLight azimuth="235" elevation="42"/></feSpecularLighting>` +
      `<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k2="1" k3=".85"/></filter>`);
    return (c.memo.sheenF = `url(#${id})`);
  }
  // v126: «решётка» PGL — насыщенный цвет (металл и стекло) и студийный блик по форме:
  // узкие точечные блики на гранях + мягкие вертикальные отражения софтбоксов, обрезанные по силуэту кубка
  function latticeFx(c) {
    if (c.memo.latF) return c.memo.latF; const id = c.id + (c.k++);
    c.defs.push(`<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">` +
      `<feColorMatrix in="SourceGraphic" type="saturate" values="1.45" result="sat"/>` +
      `<feComponentTransfer in="sat" result="con"><feFuncR type="linear" slope="1.08" intercept="-.03"/><feFuncG type="linear" slope="1.08" intercept="-.03"/><feFuncB type="linear" slope="1.08" intercept="-.03"/></feComponentTransfer>` +
      `<feGaussianBlur in="SourceAlpha" stdDeviation=".35" result="b"/>` +
      `<feSpecularLighting in="b" surfaceScale="2" specularConstant=".95" specularExponent="38" lighting-color="#fffaf0" result="s"><feDistantLight azimuth="240" elevation="48"/></feSpecularLighting>` +
      `<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feComposite in="con" in2="s2" operator="arithmetic" k2="1" k3=".55"/></filter>`);
    return (c.memo.latF = `url(#${id})`);
  }
  function latticeGlare(c, body) { // отражения софтбоксов: вертикальные полосы, изгибаются вместе с кубком (маска — сам кубок)
    const mid = c.id + (c.k++), g1 = c.id + (c.k++), g2 = c.id + (c.k++), gv = c.id + (c.k++);
    c.defs.push(`<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="72"><g filter="url(#${gv}b)">${body}</g></mask>` +
      `<filter id="${gv}b" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>` +
      `<linearGradient id="${g1}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".5"/><stop offset=".6" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="${g2}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset=".78" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<mask id="${gv}" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="72"><rect x="0" y="0" width="64" height="72" fill="url(#${g2})"/></mask>`);
    // полосы идут по оси кубка (слегка сужаются к ножке): широкая слева, узкая справа, тонкий контровой свет по правому краю
    return `<g mask="url(#${mid})" style="mix-blend-mode:screen"><g mask="url(#${gv})">` +
      `<path d="M22.4 4C21.6 14 21.6 26 25.2 37L28.2 44.5L29.6 44C27.2 34 26.6 22 27.4 4z" fill="url(#${g1})" opacity=".75"/>` +
      `<path d="M37.6 6C38.6 14 38.4 24 35.4 34L34.6 34.2C36.6 24 36.8 14 36.4 6z" fill="#fff" opacity=".32"/>` +
      `<path d="M42.4 9C43.6 17 43.4 24 41 31.5L40.4 31.4C42.4 24 42.6 17 41.6 9z" fill="#fff" opacity=".22"/></g></g>`;
  }
  D.pglLattice = (c, o) => { const body = art(c, 'pglLattice', o).body;
    return shadowUnder(c, 16) + `<g filter="${latticeFx(c)}">${body}</g>` + latticeGlare(c, body); };
  D.xseTower = (c, o) => shadowUnder(c, 17) + art(c, 'xseTower', o).body;
  D.ringChalice = (c, o) => shadowUnder(c, 14) + art(c, 'iemRings', o).body;
  D.iemClassic = (c, o) => { // двуручный кубок IEM с процедурной гравировкой (белые надписи, без рамки): «IEM DALLAS / 2027»
    const sh = ' stroke="#000" stroke-opacity=".35" stroke-width=".25" paint-order="stroke"';
    const A = art(c, 'iemCup', o), m = A.r.m;
    // v126: на рендере у чаши по бокам (над кольцом) были «выкушены» края — достраиваем их под моделью
    const fill = c.grad('iemPatch' + (o.metal || ''), 0, 0, 1, 0, [[0, m[6]], [.12, m[3]], [1, m[2]]]);
    const fillR = c.grad('iemPatchR' + (o.metal || ''), 1, 0, 0, 0, [[0, m[6]], [.12, m[3]], [1, m[2]]]);
    const patch = `<path d="M20.1 30.1L20.35 31.2L20.6 32.2L20.85 33.2L21.1 34.2L21.3 35.2L21.4 35.7H24.5V30.1z" fill="${fill}"/>` +
      `<path d="M43.3 30.1L43.05 31.2L42.85 32.2L42.6 33.2L42.4 34.2L42.2 35.2L42.1 35.7H39.5V30.1z" fill="${fillR}"/>`;
    return shadowUnder(c, 15) + patch + A.body + escLogo(32, 16.2, 1.6, '#fff', '#fff') +
      fitTxt(32, 21, o.title || 'IEM', 2.1, 14, '#fff', sh) + fitTxt(32, 24.1, o.year || '', 2, 8, '#fff', sh) +
      fitTxt(32, 26.9, 'CHAMPIONS', 1.3, 10.5, '#fff', sh + ' letter-spacing=".3"');
  };
  D.iemPlate = (c, o) => { // тарелка IEM — только без подставки; в центре белые надписи турнира
    const { body } = art(c, 'iemDisc', o);
    return `<ellipse cx="32" cy="64" rx="18" ry="2" fill="${c.shadow()}"/>` + body + escLogo(32, 29.4, 2.6, '#fff', '#fff') +
      fitTxt(32, 36.6, o.title || 'IEM', 3, 24, '#fff') + fitTxt(32, 40.4, o.year || '', 2.6, 12, '#fff') +
      fitTxt(32, 43.6, 'ESL', 1.8, 8, '#fff', ' fill-opacity=".8" letter-spacing=".4"');
  };
  D.cacCup = (c, o) => { // CS Asia Championships: гранёная серебряная чаша; «CAC» на чаше и название турнира на основании
    return shadowUnder(c, 18) + art(c, 'cacCup', o).body + fitTxt(32.4, 9.4, 'CAC', 4.2, 12, '#fff', ' letter-spacing=".3" stroke="#000" stroke-opacity=".3" stroke-width=".3" paint-order="stroke"') +
      fitTxt(31, 68.5, o.title || 'CS ASIA CHAMPIONSHIPS', 1.9, 24, '#fff', ' stroke="#000" stroke-opacity=".45" stroke-width=".3" paint-order="stroke"');
  };
  D.eplTower = (c, o) => { // ESL Pro League: чёрная гранёная колонна с золотыми лентами и короной-звездой; белые надписи лиги и сезона
    const season = (String(o.title || '').match(/SEASON\s+(\d+)/) || [])[1];
    return shadowUnder(c, 15) + art(c, 'eplTower', o).body + escLogo(27.2, 25.2, .85, '#fff', '#fff') +
      fitTxt(30.8, 26, 'ESL', 2.6, 5.2, '#fff') + fitTxt(29.8, 32, 'PRO', 6, 7.1, '#fff') + fitTxt(29.9, 34.5, 'LEAGUE', 2.5, 6.2, '#fff') +
      fitTxt(29.9, 36.9, season ? 'SEASON ' + season : (o.year || ''), 1.6, 6.6, '#fff', ' fill-opacity=".85"');
  };
  D.stubCup = (c, o) => { // v131: заглушка — контур кубка пунктиром, название организатора и год; модель появится позже
    const cup = 'M20 9H44L43 22C42 30 37 34 34.5 35V44H38.5L40 49H24L25.5 44H29.5V35C27 34 22 30 21 22Z';
    return `<ellipse cx="32" cy="66.6" rx="17" ry="1.8" fill="${c.shadow()}"/>` +
      `<rect x="13" y="51" width="38" height="14.5" rx="2.4" fill="#141922" stroke="#5c6878" stroke-width=".8"/>` +
      `<path d="${cup}" fill="#1b222d" fill-opacity=".85" stroke="#8d9aab" stroke-width="1.1" stroke-dasharray="2.2 1.6" stroke-linejoin="round"/>` +
      `<path d="M20.5 12C14 12 13.5 21 21.6 24.5M43.5 12C50 12 50.5 21 42.4 24.5" fill="none" stroke="#8d9aab" stroke-width="1.1" stroke-dasharray="2.2 1.6"/>` +
      txt(32, 25, '?', 9, '#8d9aab') +
      fitTxt(32, 57.6, o.label || 'TROPHY', 3.4, 33, '#d6dde6', ' letter-spacing=".3"') + fitTxt(32, 62.6, o.year || '', 2.6, 14, '#8d9aab', ' letter-spacing=".5"');
  };
  D.blastTri = (c, o) => { // BLAST: гладкий гранёный треугольник (золото/металл) или серебряный «карбоновый»
    const smooth = o.carbon ? false : (o.smooth || ['gold', 'pale', 'blackgold', 'rose', 'bronze'].includes(o.metal) || o.big || !o.metal);
    if (smooth) return `<ellipse cx="32" cy="66.3" rx="27" ry="1.5" fill="${c.shadow()}"/>` + art(c, 'blastGlass', Object.assign({}, o, { metal: o.metal || 'chrome' })).body;
    return shadowUnder(c, 23) + art(c, 'blastCarbon', o).body;
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
      vol(c, 'M28.6 58.6C28.4 48 27.6 38 26.4 31H37.6C36.4 38 35.6 48 35.4 58.6z', c.mH(m)) + vol(c, 'M23.4 27.4H40.6L38.6 32.4H25.4z', c.mH(m)) + `<ellipse cx="32" cy="27.4" rx="8.6" ry="1.3" fill="${c.mV(m)}"/>` +
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
  D.classicCup = (c, o) => { // прочие организаторы Tier-1: чаша-тюльпан на ножке, две ручки, медальон
    const m = o.metal, bowl = 'M18 9C18 21 21.5 31.5 29.6 36.6H34.4C42.5 31.5 46 21 46 9z';
    return pedestal(c, o.base || 'step', m, 26) + stem(c, m, 36.4, 58.6, 4.6, 15) +
      handle(c, 'M18.4 12.5C9 10.5 7.5 23 20.6 28.5', m, 2.2) + handle(c, 'M45.6 12.5C55 10.5 56.5 23 43.4 28.5', m, 2.2) +
      vol(c, bowl, c.mH(m)) + lip(c, 9, 14, m) +
      `<path d="M18.8 15.6Q32 19.4 45.2 15.6M19.8 19.4Q32 23 44.2 19.4" fill="none" stroke="#000" stroke-opacity=".28" stroke-width=".45"/>` +
      `<circle cx="32" cy="26" r="4.3" fill="${c.mV(m)}" stroke="#000" stroke-opacity=".35" stroke-width=".3"/><circle cx="32" cy="26" r="3.3" fill="${c.flat(o.accent || '#2f6fe0', 'ca' + (o.accent || ''))}"/><path d="M29.8 24.6A2.6 2.6 0 0 1 33 23.5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".5" stroke-linecap="round"/>` +
      shine('M21 11.5C21 20 23.2 28 27.4 33.4', 1.1) + shine('M43.6 12C43.4 18 42.4 23 40.6 27', .5);
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
  // ================================================================ v97 — «ателье»: силуэты ближе к настоящим трофеям сцены
  // Это не копии: взят узнаваемый характер формы (витая чёрная колонна, гравированный диск, гранёная чаша,
  // акриловый осколок, кристалл), пропорции и детали свои; логотипов и надписей организаторов нет.
  const P = pts => 'M' + pts.map(p => `${n(p[0])} ${n(p[1])}`).join('L') + 'z';
  D.eplSpire = (c, o) => { // витая чёрная колонна, обвитая лентой металла
    const m = o.metal || 'gold', body = o.body || 'black';
    const col = 'M25.4 58.6C23.8 46 25.4 33 28 22C29.8 14.4 32.6 8 37.2 3.2C37.8 12 39.6 22 39.8 33C40 43 39.2 51 38.6 58.6z';
    const r1 = 'M24.9 51C29.2 48 36.6 44 39.6 36.6C39.9 39.8 39.8 43 39.5 46C35.6 51.2 30 54.4 25.3 56.6z';
    const r2 = 'M26.6 27.4C30.4 25.6 36 21 38.2 13.6C38.8 16.8 39.2 20 39.5 23.6C36.2 29.4 30.6 32.6 25.9 34z';
    const tip = 'M37.2 3.2C36.4 6.6 34.2 10 31.4 12.8C33.8 12.2 36.4 10.6 37.9 8.6z';
    return `<ellipse cx="32" cy="69.6" rx="13" ry="1.9" fill="${c.shadow()}"/>` +
      `<path d="M21.5 63v4.4a10.5 2.1 0 0 0 21 0V63z" fill="${c.mH('black')}"/><ellipse cx="32" cy="63" rx="10.5" ry="2.1" fill="${c.mV('black')}"/>` +
      `<path d="M24.6 58.6v3.6a7.4 1.6 0 0 0 14.8 0v-3.6z" fill="${c.mH(m)}"/><ellipse cx="32" cy="58.6" rx="7.4" ry="1.6" fill="${c.mV(m)}"/>` +
      vol(c, col, c.mH(body)) +
      `<path d="M29.6 55C28.2 44 29.4 31 31.8 20" stroke="#fff" stroke-opacity=".28" stroke-width="1.1" stroke-linecap="round" fill="none"/>` +
      [r1, r2, tip].map(d => `<path d="${d}" fill="#000" fill-opacity=".5" transform="translate(.5 .9)"/><path d="${d}" fill="${c.mH(m)}"/><path d="${d}" fill="${c.ao()}"/>`).join('') +
      `<circle cx="33.4" cy="40.6" r="2.7" fill="none" stroke="${c.mV(m)}" stroke-width=".7"/><path d="M32 41.6L33.4 39l1.4 2.6z" fill="${c.mV(m)}"/>` +
      shine('M26.4 52.6C30 50.4 35.6 46.4 38.4 41.4', .6) + shine('M28 28.6C31.2 26.8 35.4 23 37.4 18', .6);
  };
  D.thunderSwirl = (c, o) => { // витой золотой ствол, на вершине — стеклянная молния
    const m = o.metal || 'gold', g = o.glass || 'blue';
    const a = 'M27 58.6C24.6 50 37.6 46.6 37 39.6C36.4 33 25.6 32.6 26.4 25.4C27 20 34 18.4 35.4 13.6C37.2 19.4 31.4 21.6 31.6 25.8C32 31.4 42.6 32.4 42.4 40C42.2 48 31.6 50.4 33 58.6z';
    const b = 'M37 58.6C38.6 52.4 29.4 50 28.8 43.4C28.4 38.6 33.2 36.6 35.6 34C33.6 38.4 33.2 40.6 34.6 43.6C36.6 47.8 43.4 51.6 41 58.6z';
    const bolt = 'M36.6 2.4L27.8 15.2H32.6L29.6 24.6L40.4 10.8H35.2z';
    return pedestal(c, 'step', 'black', 22, 'WORLD') +
      `<path d="${b}" fill="${c.mV(m)}"/><path d="${b}" fill="#000" fill-opacity=".28"/>` + vol(c, a, c.mH(m)) +
      `<path d="${bolt}" fill="#000" fill-opacity=".45" transform="translate(.8 .8)"/><path d="${bolt}" fill="${c.gl(g)}" stroke="${c.mH('chrome')}" stroke-width=".5" stroke-linejoin="round"/>` +
      `<path d="M35.6 4.4L29.6 13.6" stroke="#fff" stroke-opacity=".7" stroke-width=".6" stroke-linecap="round"/>` + shine('M27.6 29C27 25.6 29.6 23.2 32.4 21', .8) + shine('M29.6 55C28.4 51 33 48.6 36 46', .7);
  };
  D.ewcCup = (c, o) => { // гранёная чаша-«корона» на ножке-песочных часах
    const m = o.metal || 'gold';
    const bowl = [[15.5, 5], [24, 10.5], [32, 6.5], [40, 10.5], [48.5, 5], [42.4, 29], [32, 37.5], [21.6, 29]];
    const fac = (pts, f, op) => `<path d="${P(pts)}" fill="${f}"/>${op ? `<path d="${P(pts)}" fill="#000" fill-opacity="${op}"/>` : ''}`;
    return pedestal(c, 'block', m, 24, o.label || 'EWC') +
      `<path d="M27.4 37.5H36.6L34 45.6L38.2 57.8H25.8L30 45.6z" fill="${c.mH(m)}"/><path d="M30 45.6H34" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>` +
      fac([bowl[0], bowl[1], [26.4, 30.4], bowl[7]], c.mV(m), .12) + fac([bowl[1], bowl[2], [32, 37.5], [26.4, 30.4]], c.mH(m)) +
      fac([bowl[2], bowl[3], [37.6, 30.4], [32, 37.5]], c.mH(m), .22) + fac([bowl[3], bowl[4], bowl[5], [37.6, 30.4]], c.mV(m), .38) +
      fac([bowl[7], [26.4, 30.4], [32, 37.5]], c.mH(m), .3) + fac([[37.6, 30.4], bowl[5], [32, 37.5]], c.mH(m), .5) +
      `<path d="${P(bowl)}" fill="none" stroke="${c.mV(m)}" stroke-width=".5" stroke-linejoin="round"/>` +
      `<path d="M28.2 17.5H35.8L34.8 24H29.2z" fill="${o.glass ? c.gl(o.glass) : c.mV('black')}" stroke="${c.mH('pale')}" stroke-width=".45"/>` +
      shine('M17.4 7.6L22.6 27.4', 1) + shine('M24.6 11.6L27.4 28.6', .5);
  };
  D.shardAward = (c, o) => { // акриловый «осколок» с металлическим клинком внутри
    const g = o.glass || 'ice', m = o.metal || 'chrome', acc = o.accent || '#2f6fe0';
    const slab = P([[21.5, 58.6], [18.6, 21], [33.5, 5], [45.6, 15.4], [42.5, 58.6]]), side = P([[45.6, 15.4], [48.2, 18], [45, 58.6], [42.5, 58.6]]);
    const blade = P([[27.2, 55], [25.6, 25.4], [33.4, 13.6], [37, 30], [33.6, 55]]);
    return pedestal(c, 'slab', m, 26, o.label) +
      `<path d="${side}" fill="${c.gl('smoke')}"/><path d="${slab}" fill="${c.gl(g)}" stroke="${c.mH('chrome')}" stroke-width=".6" stroke-linejoin="round"/>` +
      `<path d="${blade}" fill="${c.mH(m)}"/><path d="${blade}" fill="${c.ao()}"/>` +
      `<path d="M33.4 13.6L37 30L33.6 55" fill="none" stroke="${c.flat(acc, 'sh' + acc)}" stroke-width="1.1" stroke-linejoin="round"/>` +
      `<path d="M38.6 40H41.4M38.6 43H41.2M38.6 46H40.6" stroke="#fff" stroke-opacity=".5" stroke-width=".55"/>` +
      shine('M20.4 23.4L22.6 55', 1) + shine('M33.2 6.8L21 20.2', .6);
  };
  D.crystalPrism = (c, o) => { // гранёный кристалл на двухъярусном постаменте
    const g = o.glass || 'ice', m = o.metal || 'chrome';
    const fx = (pts, f, op) => `<path d="${P(pts)}" fill="${f}"${op ? ` fill-opacity="${op}"` : ''}/>`;
    return pedestal(c, 'step', m, 22, o.label) +
      `<path d="M26.4 52H37.6L36.4 58.8H27.6z" fill="${c.mH(m)}"/>` +
      fx([[32, 4], [42.6, 13], [42.6, 43.4], [32, 52.4], [21.4, 43.4], [21.4, 13]], c.gl(g)) +
      fx([[32, 4], [42.6, 13], [32, 19.6]], c.glR(g)) + fx([[32, 19.6], [42.6, 13], [42.6, 43.4], [32, 52.4]], '#000', .2) +
      fx([[21.4, 13], [32, 19.6], [32, 52.4], [21.4, 43.4]], '#fff', .12) +
      `<path d="M32 4L21.4 13V43.4L32 52.4L42.6 43.4V13zM21.4 13L32 19.6L42.6 13M32 19.6V52.4" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".5" stroke-linejoin="round"/>` +
      `<path d="M27.4 30.6H36.6M28.6 33.6H35.4" stroke="#fff" stroke-opacity=".55" stroke-width=".6"/>` + shine('M23.4 15.6V41.6', 1.1);
  };

  // v131: используются только новые кубки — векторные модели (art: iemCup, iemRings, iemDisc, eplTower, blastGlass/blastCarbon,
  // pglLattice, pglPlaque, pglCrown2, PGL prism/Major, cacCup, xseTower, ewcDisc, fissureCrystal, thunderCup, pwCrystal, encSpire/encTwist)
  // и их разновидности (металл, стекло/вставки, цвета флага). Старые нарисованные вручную силуэты больше не выбираются.
  // У серии — свой «фирменный» силуэт из пула организатора; примерно раз в три сезона — другой силуэт того же пула.
  const formOf = (pool, name, season) => {
    const s = series(name), v = hash('form|' + name + '|' + season);
    return pool.length < 2 || v % 3 ? pool[s % pool.length] : pool[(s + 1 + (v >>> 3) % (pool.length - 1)) % pool.length];
  };
  // у организатора нет своей модели кубка — заглушка (силуэт-контур с названием организатора), пока модель не нарисована
  const stubSpec = (label) => (r, name) => ({ d: 'stubCup', stub: true, label: label || String(name || '').replace(/\s+20\d\d.*$/, '').split(/\s+/).slice(0, 2).join(' ').toUpperCase() });
  // v131: IEM — по кругу чаша-«кольца», двуручный кубок и монета (у каждой серии свой стартовый вариант), металлы — по сезону
  const iemPick = (r, name, season) => {
    const k = (series(name) + (Number(season) || 1)) % 3;
    if (k === 0) return { d: 'ringChalice', metal: ['silver', 'chrome', 'silver'][r % 3] };
    if (k === 1) return { d: 'iemClassic', metal: ['silver', 'chrome'][r % 2] };
    return { d: 'iemPlate', metal: 'chrome', glass: ['ice', 'smoke', 'blue'][(r >>> 4) % 3], bare: true };
  };
  // v131: расцветки PGL — благородные и «брутальные» тёмные металлы, без розового и голубого
  const PGL_PAL = [{ metal: 'gold', glass: 'blue' }, { metal: 'silver', glass: 'red' }, { metal: 'blacktitan', glass: 'red' }, { metal: 'gunmetal', glass: 'amber' },
    { metal: 'chrome', glass: 'violet' }, { metal: 'gold', glass: 'red' }, { metal: 'blacktitan', glass: 'amber' }, { metal: 'titanium', glass: 'blue' },
    { metal: 'bluesteel', glass: 'red' }, { metal: 'blackgold', glass: 'amber' }, { metal: 'silver', glass: 'navy' }, { metal: 'blacktitan', glass: 'blue' }];
  // палитра Мейджоров PGL: без «детских» цветов (розовый, голубой, мятный)
  const PGL_MJ = [['gold', 'mono'], ['blacktitan', 'red'], ['blacktitan', 'amber'], ['gunmetal', 'red'], ['silver', 'red'], ['gold', 'red'], ['blackgold', 'amber'],
    ['blacktitan', 'violet'], ['bluesteel', 'red'], ['gunmetal', 'amber'], ['titanium', 'amber'], ['blacktitan', 'mono'], ['gold', 'navy'], ['silver', 'blue']];
  const ORGS = [
    { key: 'IEM-big', re: /^IEM\s+(?:Cologne|Katowice|Krak)|^ESL One/i, pick: (r, name, season) => iemPick(r, name, season) },
    { key: 'IEM', re: /^IEM\b|^Intel Extreme/i, pick: (r, name, season) => Object.assign(iemPick(r, name, season), { sub: (String(name).replace(/^IEM\s+/i, '').replace(/\s*\(.*\)/, '').replace(/\s+20\d\d$/, '').toUpperCase()).slice(0, 14) }) },
    { key: 'EPL', re: /^ESL Pro League|^EPL\b/i, pick: (r) => ({ d: 'eplTower', metal: ['gold', 'pale', 'gold', 'rose'][r % 4] }) },
    // v112: BLAST — в основном яркое цветное стекло (синий, фиолетовый, бирюзовый, красный, зелёный, янтарный, розовый); металл — реже
    { key: 'BLAST', re: /^BLAST/i, pick: (r, name) => /spring final|fall final/i.test(name) ? [{ d: 'blastTri', glass: 'blue', big: true }, { d: 'blastTri', glass: 'violet', big: true }, { d: 'blastTri', metal: 'gold', big: true }, { d: 'blastTri', glass: 'red', big: true }][r % 4] : /world final/i.test(name)
      ? { d: 'blastTri', metal: 'gold', big: true }
      : [{ d: 'blastTri', glass: 'blue' }, { d: 'blastTri', glass: 'violet' }, { d: 'blastTri', glass: 'cyan' }, { d: 'blastTri', metal: 'gold', stripes: true }, { d: 'blastTri', glass: 'red' }, { d: 'blastTri', glass: 'green' }, { d: 'blastTri', metal: 'silver', stripes: true }, { d: 'blastTri', glass: 'amber' }, { d: 'blastTri', glass: 'pink' }][r % 9] },
    // v131: PGL — Мейджор: в основном щит MAJOR или призма (чередуются по сезонам), иногда — «пламя»; обычные турниры
    // (Bucharest, Astana, Wallachia…): «пламя-решётка» разных расцветок, реже — похожая «корона-пламя»
    { key: 'PGL', re: /^PGL/i, pick: (r, name, season) => {
      const v = hash('pglform|' + name + '|' + season), major = /major/i.test(name);
      const d = major ? (v % 4 === 0 ? (v >>> 3) % 3 ? 'pglLattice' : 'pglCrown2' : ['pglMajor', 'pglPrism'][(series(name) + (Number(season) || 1)) % 2])
        : (v % 10 < 7 ? 'pglLattice' : 'pglCrown2');
      return Object.assign({ d }, PGL_PAL[r % PGL_PAL.length]);
    } },
    { key: 'DHM', re: /^DreamHack Masters/i, pick: stubSpec('DREAMHACK') },
    { key: 'DH', re: /^DreamHack/i, pick: stubSpec('DREAMHACK') },
    { key: 'SL', re: /^StarLadder|^StarSeries/i, pick: stubSpec('STARLADDER') },
    { key: 'Thunderpick', re: /^Thunderpick/i, pick: (r) => ({ d: 'thunderSwirl', metal: ['gold', 'pale', 'silver', 'rose'][r % 4], glass: ['blue', 'cyan', 'violet'][(r >>> 2) % 3] }) },
    { key: 'CAC', re: /^CS Asia|^CAC\b/i, pick: (r) => ({ d: 'cacCup', metal: ['silver', 'chrome', 'silver', 'gold'][r % 4] }) }, // v102: CS Asia Championships — своя гранёная чаша
    { key: 'PW', re: /^Perfect World/i, pick: (r) => ({ d: 'orbBowl', metal: ['gold', 'silver', 'chrome'][r % 3], glass: ['blue', 'cyan', 'ice', 'violet', 'ruby'][(r >>> 2) % 5] }) },
    { key: 'EWC', re: /^Esports World Cup|^EWC\b/i, pick: (r) => ({ d: 'ewcPlate', metal: ['silver', 'chrome', 'pale', 'gold'][r % 4], bare: true }) },
    { key: 'ENC', re: /^ENC\b|esports nations cup/i, pick: (r, name) => ({ d: series(name) % 2 ? 'encTwist' : 'encSpire', metal: ['silver', 'silver', 'chrome', 'gold'][r % 4], metal2: ['gold', 'gold', 'rose', 'silver'][r % 4], glass: ['violet', 'violet', 'blue', 'red'][(r >>> 2) % 4] }) }, // v107: Esports Nations Cup
    { key: 'Nations', re: /nations cup|national cup|кубок наций/i, pick: (r, name) => ({ d: series(name) % 2 ? 'encTwist' : 'encSpire', metal: ['gold', 'silver', 'gold', 'chrome'][r % 4], metal2: ['silver', 'gold', 'rose', 'gold'][r % 4], glass: ['blue', 'violet', 'red', 'cyan'][(r >>> 2) % 4] }) },
    { key: 'FiRe', re: /^FiRe\b|fireleague/i, pick: stubSpec('FIRE') },
    { key: 'FISSURE', re: /^FISSURE/i, pick: (r) => ({ d: 'fissure', metal: ['gold', 'pale', 'gold', 'chrome'][r % 4], glass: ['cyan', 'blue', 'cyan', 'violet'][r % 4] }) },
    { key: 'BetBoom', re: /^BetBoom|^Dacha/i, pick: stubSpec('BETBOOM') },
    { key: 'XSE', re: /^XSE\b/i, pick: (r) => ({ d: 'xseTower', metal: ['pale', 'gold', 'silver', 'chrome'][r % 4] }) }, // v102: китайский организатор XSE — гранёная башня на ступенчатой подставке
    { key: 'CCT', re: /^CCT\b/i, pick: stubSpec('CCT') }
  ];
  const series = name => hash('series|' + String(name || '').replace(/\s*(?:season\s+\d+|20\d\d)\s*/ig, ' ').trim().toLowerCase());
  // v84: у всех турниров IEM (Katowice, Cologne, Kraków, Chengdu, Rio, Melbourne…) общий пул отделок.
  const iemPool = r => [
    { d: 'iemClassic', metal: 'silver' }, { d: 'ringChalice', metal: 'silver' }, { d: 'iemPlate', metal: 'chrome', glass: 'ice', bare: true },
    { d: 'iemClassic', metal: 'chrome' }, { d: 'ringChalice', metal: 'chrome', tint: 'violet' }, { d: 'iemPlate', metal: 'chrome', glass: 'smoke', bare: true },
    { d: 'iemClassic', metal: 'silver' }, { d: 'ringChalice', metal: 'silver', tint: 'blue' }, { d: 'iemPlate', metal: 'chrome', glass: 'blue', bare: true }
  ][r % 9];

  // v102: двухцветные отделки. Основа (металл) + второй цвет (стекло, вставки, кольца, тело колонны, акценты).
  // 1) Если в названии турнира есть город/страна — берутся цвета флага (PGL Astana → золото + голубой Казахстана).
  // 2) Иначе — одна из гармоничных пар; металл пары или фирменная отделка организатора — по сезону.
  const PLACES = [
    // v112: у каждого города своё сочетание [металл, камень/стекло, лента — цвет флага]
    [/astana|almaty|kazakh/i, 'gold', 'sky', 'sky'],
    [/moscow|moskva|st\.? ?petersburg|kazan|russia/i, 'silver', 'red', 'red'],
    [/cluj/i, 'pale', 'navy', 'blue'],
    [/bucharest|wallachia|romania/i, 'gold', 'amber', 'navy'],
    [/copenhagen|herning|aarhus|odense|denmark/i, 'chrome', 'ice', 'red'],
    [/stockholm|malm[öo]|j[öo]nk[öo]ping|gothenburg|sweden/i, 'gold', 'blue', 'blue'],
    [/antwerp|brussels|belgium/i, 'titanium', 'yellow', 'red'],
    [/belgrade|serbia/i, 'rose', 'navy', 'red'],
    [/katowice|krak[óo]w|warsaw|wroc|poland/i, 'pale', 'red', 'red'],
    [/arlington|austin|dallas|atlanta|boston|new york|los angeles|las vegas|chicago|texas|usa\b/i, 'silver', 'navy', 'navy'],
    [/\brio\b|s[ãa]o paulo|brazil|brasil/i, 'gold', 'green', 'green'],
    [/riyadh|jeddah|saudi/i, 'chrome', 'green', 'green'],
    [/lisbon|porto|portugal/i, 'rose', 'green', 'red'],
    [/budapest|hungary/i, 'titanium', 'red', 'green'],
    [/cologne|k[öo]ln|berlin|hamburg|hannover|germany/i, 'gold', 'red', 'red'],
    [/shanghai|beijing|shenzhen|china/i, 'gold', 'red', 'red'], [/chengdu/i, 'silver', 'amber', 'red'],
    [/paris|marseille|lyon|france/i, 'pale', 'ice', 'navy'],
    [/london|birmingham|manchester|\buk\b|england/i, 'titanium', 'navy', 'red'],
    [/melbourne|sydney|brisbane|australia/i, 'gold', 'mint', 'green'],
    [/valencia|madrid|barcelona|bilbao|spain/i, 'rose', 'amber', 'red'],
    [/kyiv|kiev|ukraine/i, 'pale', 'blue', 'yellow'],
    [/montreal|toronto|canada/i, 'rose', 'red', 'red'],
    [/abu dhabi|dubai|uae/i, 'pale', 'green', 'green'],
    [/istanbul|turkey|t[üu]rkiye/i, 'chrome', 'red', 'red'],
    [/malta/i, 'silver', 'white', 'red'], [/singapore/i, 'titanium', 'red', 'red'], [/tokyo|osaka|japan/i, 'chrome', 'white', 'red'],
    [/seoul|busan|korea/i, 'chrome', 'navy', 'navy'], [/mexico|monterrey/i, 'titanium', 'green', 'green'],
    [/buenos aires|argentina/i, 'silver', 'sky'], [/helsinki|finland/i, 'chrome', 'blue', 'blue'],
    [/oslo|norway/i, 'silver', 'navy', 'red'], [/amsterdam|rotterdam|utrecht|netherlands/i, 'silver', 'orange'],
    [/prague|czech/i, 'pale', 'navy', 'red'], [/bangkok|thailand/i, 'gold', 'navy'], [/mumbai|delhi|india/i, 'gold', 'orange']
  ];
  // v106: сочетания [металл корпуса (только благородные), цвет вставок/стекла/внутренней части, металл кантов (необязательно)]
  const DUOS = [
    ['gold', 'red', null], ['gold', 'blue', null], ['gold', 'cyan', null], ['silver', 'red', 'gold'], ['silver', 'blue', null],
    ['chrome', 'cyan', null], ['pale', 'amber', null], ['rose', 'violet', null], ['gold', 'green', null], ['titanium', 'amber', 'gold'],
    ['silver', 'ice', null], ['bronze', 'red', null], ['white', 'blue', 'gold'], ['chrome', 'red', null], ['gold', 'navy', null], ['white', 'red', 'gold'],
    // v131: брутальные тёмные металлы
    ['blacktitan', 'red', 'gold'], ['blacktitan', 'cyan', null], ['gunmetal', 'amber', null], ['bluesteel', 'ice', null], ['blacktitan', 'amber', null]
  ];
  // ESL Pro League: оригинальная расцветка (золото + чёрный); меняется только оттенок чёрного корпуса
  // корпус: оригинальный чёрный или нейтральные оттенки (графит, серый, титан, серебро, белый)
  const VIVID = [['ruby', 'yellow'], ['holo', 'violet'], ['cobalt', 'cyan'], ['teal', 'amber'], ['emerald', 'yellow'], ['violet', 'pink'], ['ruby', 'white'], ['holo', 'cyan']];
  const EPL_TINT = { black: null, graphite: '#4a5058', smoke: '#6b7079', titanium: { m: 'titanium' }, silver: { m: 'silver' }, white: { m: 'white' } };
  const EPL_BODIES = ['black', 'black', 'graphite', 'smoke', 'titanium', 'silver', 'white', 'black'];
  // металл для «тела» (колонны EPL и т.п.) из второго цвета: анодированная отделка в тон
  function anod(key) {
    const hex = GLASS[key] || key, k = 'an' + key;
    if (!METAL[k]) METAL[k] = [mix(hex, '#000000', .78), mix(hex, '#000000', .42), mix(hex, '#ffffff', .25), mix(hex, '#ffffff', .8), hex, mix(hex, '#000000', .65)];
    return k;
  }
  function placeOf(name) { const p = PLACES.find(x => x[0].test(String(name || ''))); return p ? { metal: p[1], second: p[2], ribbon: p[3] || p[2] } : null; }
  function applyDuo(spec, name, season, keepMetal) {
    const v = hash('duo|' + name + '|' + season), place = placeOf(name);
    const D3 = DUOS[v % DUOS.length], pair = place || { metal: D3[0], second: D3[1], metal2: D3[2] };
    const greyOrg = spec.org === 'IEM' || spec.org === 'IEM-big'; // IEM — серые металлы, золото редко; металл не перекрашиваем
    const blastGlass = spec.org === 'BLAST' && spec.glass && !spec.metal;   // v112: стеклянный BLAST остаётся цветным стеклом
    if (blastGlass) { spec.accent = GLASS[spec.glass]; spec.second = spec.glass; spec.place = !!place; if (place) spec.ribbon = place.ribbon; return spec; }
    if (!keepMetal && !greyOrg && (place || (v >>> 7) % 2 === 0)) { spec.metal = pair.metal; if (pair.metal2) spec.metal2 = pair.metal2; }

    // v131: кубки с цветами города меняют расцветку по сезонам, сохраняя основной цвет города:
    // 1-й — классика города, 2-й — тёмный «брутальный» металл, 3-й — второй цвет флага во вставках, 4-й — оружейная сталь / чёрное золото
    let sec = pair.second;
    if (place) {
      const k = ((Number(season) || 1) + (hash('cityrot|' + String(name).replace(/\s*20\d\d.*$/, '')) % 4)) % 4;
      if (k === 1 && !keepMetal && !greyOrg) spec.metal = ['blacktitan', 'gunmetal', 'blacktitan', 'bluesteel'][(v >>> 12) % 4];
      else if (k === 2 && place.ribbon && place.ribbon !== place.second) sec = place.ribbon;
      else if (k === 3 && !keepMetal && !greyOrg) spec.metal = ['blackgold', 'gunmetal', 'titanium'][(v >>> 12) % 3];
    }
    if (spec.glass && !(spec.org === 'BLAST' && !spec.metal)) spec.glass = sec;
    spec.accent = GLASS[sec];
    if (spec.tint || spec.org === 'IEM-big' || spec.org === 'IEM') spec.tint = sec;
    if (spec.org === 'EPL') { spec.metal = 'gold'; spec.metal2 = null; spec.body = EPL_BODIES[(v >>> 4) % EPL_BODIES.length]; }
    spec.place = !!place; spec.second = sec; if (place) spec.ribbon = place.ribbon;
    // BLAST, CS Asia Championships, XSE — можно и сочные анодированные металлы / голограмму
    if (['BLAST', 'CAC', 'XSE'].includes(spec.org) && (spec.org === 'BLAST' ? (v >>> 11) % 3 !== 0 : !place && (v >>> 11) % 3 === 0)) {   // v112: BLAST — чаще яркие анодированные металлы
      const V2 = VIVID[(v >>> 13) % VIVID.length]; spec.metal = V2[0]; spec.metal2 = null; spec.second = V2[1]; if (spec.glass) spec.glass = V2[1]; spec.accent = GLASS[V2[1]];
    }
    return spec;
  }
  const MAJOR_HOSTS = ['PGL', 'IEM-big', 'BLAST', 'PW'];
  function orgOf(name) { return ORGS.find(o => o.re.test(String(name || ''))) || null; }
  function genericSpec(name) {
    // v131: неизвестный организатор — заглушка до появления его модели кубка
    return Object.assign(stubSpec()(0, name), { year: (String(name).match(/20\d\d/) || [''])[0] });
  }
  // v131: IEM (чаша-«кольца», двуручный кубок, монета) — только приглушённые металлы, без ярких цветных вставок,
  // даже на Мейджоре и в городе с яркими цветами флага
  const PRISM_METALS = new Set(['silver', 'chrome', 'gold', 'pale', 'titanium', 'steel', 'gunmetal', 'blacktitan', 'bluesteel', 'blackgold', 'iron']);
  const IEM_METALS = new Set(['silver', 'chrome', 'titanium', 'steel', 'iron', 'gunmetal', 'blacktitan', 'bluesteel', 'gold', 'pale', 'blackgold', 'white']);
  function cupSpec(name, season, kind) {
    const spec = cupSpecRaw(name, season, kind);
    // v131: призма PGL на бетонной основе — не перекрашивается в яркие цвета, только благородные и тёмные металлы
    if (spec.d === 'pglPrism' && !PRISM_METALS.has(spec.metal)) spec.metal = ['blacktitan', 'silver', 'gold', 'gunmetal', 'chrome', 'blackgold'][hash('prism|' + name + '|' + season) % 6];
    if (spec.d === 'pglPrism' && ['pink', 'ice', 'sky', 'mint', 'cyan', 'white'].includes(spec.glass)) spec.glass = spec.second = ['red', 'amber', 'blue'][hash('prismg|' + name + '|' + season) % 3];
    if (spec.org === 'IEM' || spec.org === 'IEM-big') {
      if (!IEM_METALS.has(spec.metal)) spec.metal = FINISH.IEM[hash('iemm|' + name + '|' + season) % FINISH.IEM.length];
      spec.metal2 = null; spec.tint = null;
      if (spec.glass) spec.glass = ['smoke', 'ice', 'smoke'][hash('iemg|' + name + '|' + season) % 3];
      spec.second = 'smoke'; spec.accent = GLASS.smoke;
    }
    return spec;
  }
  function cupSpecRaw(name, season, kind) {
    const r = hash('cup|' + name + '|' + season);
    // v102: отдельного кубка Мейджора нет. Мейджор всегда берёт форму из пула организатора-хоста
    // (PGL, IEM, BLAST, StarLadder, Perfect World…) и получает ленту MAJOR и сияние.
    // Если хост в названии не распознан — хост выбирается детерминированно из организаторов Мейджоров.
    const isMajor = /major/i.test(kind) || /\bmajor\b/i.test(String(name || ''));
    const bare = String(name || '').replace(/\bmajor\b/ig, '').trim();
    let org = isMajor ? (ORGS.find(o => o.re.test(bare) || o.re.test(String(name || ''))) || null) : orgOf(name);
    // v112: Мейджор любого узнанного организатора (StarLadder, FiRe…) — с кубком этого организатора, а не случайного хоста (часто BLAST)
    if (isMajor && !org) org = ORGS.find(o => o.key === MAJOR_HOSTS[hash('mjhost|' + name + '|' + season) % MAJOR_HOSTS.length]);
    const spec = org ? org.pick(r, name, Number(season) || 1) : genericSpec(name, r);
    spec.kind = kind; spec.org = org ? org.key : 'custom';
    // v102: процедурные надписи на трофее: «IEM DALLAS» + год (из названия или 2025 + сезон)
    spec.year = (String(name || '').match(/20\d\d/) || [String(2025 + (Number(season) || 1))])[0];
    spec.title = String(name || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\b20\d\d\b/g, '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 26);
    if (spec.stub) { if (isMajor) { spec.major = true; spec.big = true; } return spec; }   // v131: заглушка — без отделок
    if (isMajor) { spec.major = true; spec.big = true; }
    // Отделка по сезону: тот же организатор — тот же силуэт, но разные покрытия из его пула.
    const pool = FINISH[spec.org] || FINISH.custom, v = hash('finish|' + name + '|' + season);
    // v84: Мейджор хоста — тот же пул форм и отделок организатора (не обязательно золото); отличие — лента MAJOR и сияние.
    if (spec.major) {
      // v111: отделка Мейджора — разные благородные металлы (золото — один из вариантов) со сдержанными вставками; IEM — обычные металлы
      const grey = spec.org === 'IEM' || spec.org === 'IEM-big';
      // v112: палитра Мейджоров шире — классические металлы и яркие анодированные; 'mono' — одноцветный кубок
      // (внутренняя часть PGL того же цвета, что и внешняя), иначе — двухцветный (металл + вставка другого цвета)
      const MJ = grey ? [['silver'], ['chrome'], ['gold'], ['blacktitan'], ['titanium'], ['blackgold'], ['steel'], ['gunmetal'], ['bluesteel'], ['silver']]
        : [['gold', 'mono'], ['silver', 'blue'], ['ruby', 'mono'], ['cobalt', 'mono'], ['emerald', 'mono'], ['violet', 'mono'], ['teal', 'mono'], ['gold', 'red'],
           ['chrome', 'violet'], ['rose', 'mono'], ['holo', 'mono'], ['blackgold', 'amber'], ['silver', 'red'], ['cobalt', 'amber'], ['ruby', 'amber'], ['emerald', 'yellow'], ['pale', 'navy'], ['silver', 'mono'],
           ['blacktitan', 'mono'], ['blacktitan', 'red'], ['blacktitan', 'cyan'], ['gunmetal', 'amber'], ['bluesteel', 'ice']];   // v131: чёрные «брутальные» Мейджоры
      const MONO = { gold: 'amber', pale: 'amber', silver: 'ice', chrome: 'ice', ruby: 'ruby', cobalt: 'blue', emerald: 'mint', violet: 'violet', teal: 'cyan', rose: 'pink', holo: 'cyan', blackgold: 'amber', titanium: 'smoke', blacktitan: 'amber', gunmetal: 'red', bluesteel: 'ice' };
      const MJP = spec.org === 'PGL' ? PGL_MJ : MJ, fRaw = MJP[hash('mjpal|' + name + '|' + season) % MJP.length];
      const f = fRaw[1] === 'mono' ? [fRaw[0], MONO[fRaw[0]] || 'amber'] : fRaw;
      const golden = f[0] === 'gold' || f[0] === 'pale';
      spec.metal = f[0];
      if (spec.org === 'BLAST' && golden) spec.glass = null; // золотой треугольник BLAST — металлом
      if (spec.glass) spec.glass = f[1] || (grey ? null : ['amber', 'ice', 'blue'][(v >>> 5) % 3]);
      if (f[1]) spec.second = f[1];
      if (spec.d === 'pglLattice' || spec.d === 'pglCrown2' || spec.d === 'pglPrism') spec.glass = spec.second = f[1] || ['blue', 'red', 'violet', 'amber'][(v >>> 5) % 4];
      if (placeOf(name) && !grey && spec.org !== 'PGL' && (v >>> 9) % 3 === 0) applyDuo(spec, name, season, false); // v112: цвета флага города — лишь иногда, а не каждый раз (Austin больше не всегда синий)
      if (spec.org === 'BLAST') {   // v112: Мейджор BLAST — яркий анодированный металл, свой в каждом сезоне
        // v131: Мейджор BLAST — гладкий или карбоновый треугольник. Карбоновый — разных расцветок;
        // гладкий — то яркий переливающийся (голограмма, анодированные цвета), то обычный благородный металл
        const hv = hash('mjcol|' + name + '|' + season), carbon = hv % 5 < 2;
        const CARB = ['silver', 'ruby', 'cobalt', 'emerald', 'violet', 'teal', 'gold', 'copper', 'gunmetal', 'holo', 'blacktitan'];
        const VIVM = ['holo', 'ruby', 'cobalt', 'emerald', 'violet', 'teal', 'copper'], PLAIN = ['gold', 'silver', 'chrome', 'pale', 'rose', 'titanium', 'blackgold', 'blacktitan'];
        spec.metal = carbon ? CARB[(hv >>> 4) % CARB.length] : ((hv >>> 4) % 2 ? VIVM[(hv >>> 8) % VIVM.length] : PLAIN[(hv >>> 8) % PLAIN.length]);
        spec.glass = null; spec.metal2 = null; spec.smooth = !carbon; spec.carbon = carbon; spec.stripes = carbon;
      }
      if (spec.d === 'orbBowl') { // кристалл Perfect World: цвет кристалла — от отделки, цвет страны остаётся на ленте
        const PWG = { gold: 'amber', pale: 'amber', silver: 'blue', chrome: 'ice', rose: 'pink', titanium: 'violet', ruby: 'ruby', cobalt: 'blue', emerald: 'mint', violet: 'violet', teal: 'cyan', holo: 'cyan', blackgold: 'amber' };
        spec.ribbon = spec.ribbon || spec.second; void PWG; const PWP = ['blue', 'violet', 'ruby', 'mint', 'amber', 'cyan', 'pink']; spec.glass = PWP[hash('pwglass|' + name + '|' + season) % PWP.length];   // v112: свой цвет кристалла в каждом сезоне (Шанхай больше не всегда синий)
      }
      if (!spec.second) spec.second = grey ? 'navy' : 'red';
      return spec;
    }
    // v112: BLAST — яркие анодированные цвета (как у настоящих трофеев BLAST): бирюза, изумруд, рубин, кобальт, голограмма,
    // фиолетовый, реже золото/медь; гладкий или «карбоновый» в полоску. Бледных серебряных и прозрачных больше нет.
    if (spec.org === 'BLAST' && !/world final/i.test(name)) {
      // у каждой серии BLAST в сезоне — свой цвет (без повторов внутри сезона), каждый сезон палитра сдвигается
      const BR = ['ruby', 'copper', 'gold', 'emerald', 'teal', 'holo', 'cobalt', 'violet'];   // 8 разных оттенков по кругу
      const SERIES = [/bounty season 1|bounty spring/i, /bounty season 2|bounty fall/i, /rivals spring/i, /rivals fall/i, /spring final/i, /fall final/i];
      const CITIES = ['copenhagen', 'lisbon', 'rotterdam', 'london', 'porto', 'paris', 'madrid', 'austin', 'hong kong', 'singapore'];
      let si = SERIES.findIndex(re => re.test(name));
      if (si < 0 && /open/i.test(name)) { const c = CITIES.findIndex(x => name.toLowerCase().includes(x)); si = 6 + (c >= 0 ? c : hash('blastcity|' + name) % 10); }
      if (si < 0) si = hash('blastser|' + name.replace(/\s*20\d\d.*$/, '')) % 16;
      const ci = (si * 3 + (Number(season) || 1) * 5) % BR.length;   // ×3 взаимно просто с 8: соседние серии сезона — разные цвета
      spec.metal = BR[ci]; spec.metal2 = null; spec.glass = null;
      const smooth = ((si + (Number(season) || 1)) % 3) === 0 || /final/i.test(name); spec.smooth = smooth; spec.stripes = !smooth;
      // v131: и гладкий, и карбоновый треугольник примерно в половине сезонов — благородным или тёмным металлом,
      // в остальных — ярким анодированным (у соседних серий сезона цвета по-прежнему разные)
      if (hash('blplain|' + name + '|' + season) % 2 === 0) spec.metal = ['gold', 'silver', 'chrome', 'pale', 'rose', 'titanium', 'blacktitan', 'blackgold', 'gunmetal', 'bluesteel'][hash('blpm|' + name + '|' + season) % 10];
      if (!smooth) spec.carbon = true;
      const SEC = { teal: 'amber', emerald: 'yellow', ruby: 'white', cobalt: 'cyan', holo: 'violet', violet: 'pink', gold: 'red', copper: 'cyan', blackgold: 'amber', rose: 'pink' };
      spec.second = SEC[spec.metal] || 'amber'; spec.accent = GLASS[spec.second] || '#ffb347';
      const pl = placeOf(name); spec.place = !!pl; if (pl) spec.ribbon = pl.ribbon;
      return spec;
    }
    if (spec.metal && !(spec.org === 'BLAST' && spec.glass)) spec.metal = pool[v % pool.length];
    const BLAST_BRIGHT = ['blue', 'violet', 'cyan', 'red', 'green', 'amber', 'pink'];   // v112: у BLAST — только яркие стёкла
    if (spec.glass && spec.org === 'BLAST') spec.glass = BLAST_BRIGHT[(v >>> 7) % BLAST_BRIGHT.length];
    else if (spec.glass && !/^IEM|^Nations/.test(spec.org) && (v >>> 4) % 3 === 0) spec.glass = GLASS_POOL[(v >>> 7) % GLASS_POOL.length];
    if (spec.org === 'BLAST' && /world final/i.test(name)) { spec.metal = ['gold', 'pale', 'gold'][v % 3]; spec.glass = null; }
    if (spec.org === 'IEM-big' && (v >>> 9) % 2) spec.tint = GLASS_POOL[(v >>> 11) % GLASS_POOL.length];
    if (spec.org !== 'Nations' && (spec.org !== 'ENC' || placeOf(name))) applyDuo(spec, name, season, false); // ENC — фирменная палитра (фиолетовый)
    return spec;
  }
  function cup(name, season, kind) {
    const spec = cupSpec(name, season, kind || 'regular');
    const c = new Ctx();
    let body = (D[spec.d] || D.classicCup)(c, spec);
    // v84: генератор вариаций — тот же силуэт организатора, но каждый год немного другой экземпляр:
    // пропорции, лента на ножке, лавровые ветви, искры, камень-вставка, бирка с годом.
    const v = hash('var|' + name + '|' + season), pick = (k, n) => (v >>> k) % n;
    // круглые трофеи (монета, медальон, диск без подставки) не растягиваются: пропорции меняются только у кубков
    const round = ['coin', 'medallion', 'cheque'].includes(spec.d) || !!spec.bare || /coin|disc|medal/i.test(String(spec.d || ''));
    const sx = 1, sy = 1; // v102: без растяжения — силуэты больше не сужаются и не сплющиваются от сезона к сезону
    void round;
    const accents = ['#b8202e', '#1f4fb5', '#1f9e6e', '#7a3fd0', '#e08a1f', '#0fa3b8', '#c2185b'];
    const acc = spec.accent || accents[pick(9, accents.length)];
    let back = '', front = '';
    const orn = spec.major || spec.bare || spec.stub || ARTS[spec.d] || ['iemClassic', 'ringChalice', 'iemPlate', 'blastTri', 'xseTower', 'cacCup', 'eplTower', 'ewcPlate', 'fissure', 'thunderSwirl', 'orbBowl', 'pglCrown2', 'pglPrism', 'pglMajor', 'pglPlaque', 'encSpire', 'encTwist'].includes(spec.d) || ['coin', 'cheque', 'medallion'].includes(spec.d) ? [] : (pick(12, 3) === 0 ? ['laurel'] : []);
    // v102: у кубков без цветных вставок второй цвет пары/флага показывается лентой-бантом на ножке
    const NEEDS_RIBBON = ['mastersCup', 'ewcCup', 'cctChevron', 'classicCup', 'wingCup', 'spire', 'glassBlock'];
    if (spec.second && !spec.major && !spec.bare && NEEDS_RIBBON.includes(spec.d)) orn.push('ribbon'); // v84: из украшений — только лавровый венок; без искр и мелких деталей
    if (orn.includes('laurel')) for (const k of [-1, 1]) for (let i = 0; i < 4; i++) { const x = 32 + k * (13 - i * 1.6), y = 60 - i * 3.6; back += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="1.2" ry="2.6" transform="rotate(${k * (40 - i * 10)} ${n(x)} ${n(y)})" fill="${c.mV(spec.metal === 'gold' ? 'gold' : 'pale')}" opacity=".95"/>`; }
    if (orn.includes('ribbon')) front += `<path d="M30 47L25 56L28 55.4L29.4 58L32 48.5L34.6 58L36 55.4L39 56L34 47z" fill="${c.flat(acc, 'rb' + acc)}" opacity=".95"/><circle cx="32" cy="47" r="1.6" fill="${c.flat(acc, 'rb' + acc)}" stroke="#fff" stroke-opacity=".5" stroke-width=".3"/>`;
    if (orn.includes('spark')) [[12, 14, 1.8], [53, 22, 1.4], [15, 36, 1.1], [50, 8, 1.2]].slice(0, 2 + pick(16, 3)).forEach(([x, y, r]) => { front += `<path d="M${x} ${n(y - r * 2)}L${n(x + r * .5)} ${n(y - r * .5)}L${n(x + r * 2)} ${y}L${n(x + r * .5)} ${n(y + r * .5)}L${x} ${n(y + r * 2)}L${n(x - r * .5)} ${n(y + r * .5)}L${n(x - r * 2)} ${y}L${n(x - r * .5)} ${n(y - r * .5)}z" fill="#fff8d8" opacity=".9"/>`; });
    if (orn.includes('gem')) front += `<circle cx="32" cy="64.6" r="1.9" fill="${c.glR(GLASS_POOL[pick(18, GLASS_POOL.length)])}" stroke="${c.mV('pale')}" stroke-width=".4"/>`;
    if (orn.includes('tag')) { const yy = String(2025 + (Number(season) || 1)).slice(-2); front += `<rect x="45" y="60.5" width="9" height="5" rx="1" fill="${c.flat(acc, 'tg' + acc)}" transform="rotate(-8 49.5 63)"/>` + `<text x="49.5" y="64.3" text-anchor="middle" font-family="Arial" font-weight="900" font-size="3" fill="#fff" transform="rotate(-8 49.5 63)">'${yy}</text>`; }
    if (spec.org === 'Nations') { // Кубок наций: золотое сияние, как у Мейджора, но без ленты MAJOR
      const halo = c.grad('nchalo', .5, .4, .55, 0, [[0, '#ffe9a0', .5], [.45, '#ffcc4d', .14], [.92, '#ffcc4d', 0]], true);
      back = `<ellipse cx="32" cy="31" rx="26.5" ry="29" fill="${halo}"/>` + back;
    }
    const scale = spec.kind === 'regular' ? .94 : 1;
    const shaped = `<g transform="translate(32 70) scale(${n(sx * scale)} ${n(sy * scale)}) translate(-32 -70)">${back}${body}${front}</g>`;
    const out = spec.major ? majorDress(c, shaped, Object.assign({}, spec, { majorStyle: 'glowSash' })) : shaped;
    return c.svg(out, null, `tw-cup tw-org-${spec.org}`);
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
  // v108: индивидуальные награды игроков — статуэтка солдата на колонне из чёрного камня (по рендерам пользователя),
  // табличка с процедурной надписью: значок оружия, название награды, год
  const STATUE_PLATE = {"statueHelmet": [27.54, 47.61, 37.45, 67.12], "statueBeret": [28.51, 45.34, 37.38, 63.66]};
  const PLAYER_AWARDS = {
    mvp: ['MVP', 'MAJOR'], poty: ['PLAYER', 'OF THE YEAR'], awper: ['SNIPER', 'OF THE YEAR'], rifler: ['RIFLER', 'OF THE YEAR'],
    entry: ['ENTRY', 'OF THE YEAR'], igl: ['IGL', 'OF THE YEAR'], captain: ['CAPTAIN', 'OF THE YEAR'], rookie: ['ROOKIE', 'OF THE YEAR'],
    youngstar: ['YOUNG STAR', 'OF THE YEAR'], clutch: ['CLUTCH', 'MASTER'], support: ['SUPPORT', 'OF THE YEAR'], defender: ['DEFENDER', 'OF THE YEAR'],
    breakout: ['BREAKOUT', 'OF THE YEAR'], mostimproved: ['MOST', 'IMPROVED'], lurker: ['LURKER', 'OF THE YEAR'], anchor: ['ANCHOR', 'OF THE YEAR'], utility: ['UTILITY', 'MASTER'],
    team: ['TEAM', 'OF THE YEAR'], teamseason: ['TEAM', 'OF THE SEASON'],   // v112: «Команда года» — такая же статуэтка, как у игрока года
    coach: ['COACH', 'OF THE YEAR'], analyst: ['ANALYST', 'OF THE YEAR'], hall: ['HALL', 'OF FAME']   // v131: и у тренера — статуэтка, а не старый кубок
  };
  // v131: разновидности статуэток — у каждой номинации своё сочетание металлов [фигура, основание/табличка];
  // главные награды (игрок года, MVP, команда года, зал славы) — классическое золото
  const STATUE_METAL = {
    poty: ['gold', 'silver'], mvp: ['gold', 'silver'], team: ['gold', 'silver'], teamseason: ['pale', 'silver'], hall: ['blackgold', 'gold'],
    awper: ['chrome', 'gold'], rifler: ['pale', 'titanium'], entry: ['rose', 'silver'], igl: ['titanium', 'gold'], captain: ['titanium', 'gold'],
    rookie: ['silver', 'pale'], youngstar: ['steel', 'gold'], clutch: ['cobalt', 'silver'], support: ['emerald', 'silver'], defender: ['steel', 'pale'],
    breakout: ['copper', 'silver'], mostimproved: ['bronze', 'pale'], lurker: ['violet', 'silver'], anchor: ['gunmetal', 'gold'], utility: ['teal', 'silver'],
    coach: ['silver', 'gold'], analyst: ['white', 'gold']
  };
  // силуэты оружия для таблички (в единицах ширины 1)
  const RIFLE_ICON = 'M0 .42H.18L.2 .36H.62L.66 .3H.72L.74 .36H1V.44H.78L.74 .5H.62L.58 .62H.5L.52 .5H.36L.3 .7H.2L.24 .5H.16L.04 .56H0z';
  const AWP_ICON = 'M0 .44H.14L.16 .38H.3V.32H.52V.38H1V.45H.56L.52 .5H.42L.38 .66H.3L.33 .5H.2L.06 .56H0zM.33 .32V.26H.5V.32z';
  const CROWN_ICON = 'M.02 .66L.08 .2L.3 .44L.5 .06L.7 .44L.92 .2L.98 .66zM.04 .72H.96V.82H.04z';
  function statueAward(type, year, o) {
    o = o || {};
    const c = new Ctx(), lines = PLAYER_AWARDS[type] || PLAYER_AWARDS.poty;
    const key = o.model || (type === 'team' || type === 'teamseason' ? 'statueHelmet' : hash('st|' + type) % 2 ? 'statueBeret' : 'statueHelmet');
    const sm = STATUE_METAL[type] || STATUE_METAL.poty, metal = o.metal || sm[0], metal3 = o.metal3 || sm[1];
    const { body } = art(c, key, { metal, metal3 });
    const [x0, y0, x1, y1] = STATUE_PLATE[key], w = x1 - x0, cx = n((x0 + x1) / 2), gold = sampleStops(metalStops(['gold', 'pale', 'blackgold', 'bronze', 'copper', 'rose'].includes(metal) ? metal : 'gold'), .78);
    const team = type === 'team' || type === 'teamseason';
    const icon = type === 'awper' ? AWP_ICON : (team || type === 'coach' || type === 'hall' || type === 'analyst') ? CROWN_ICON : RIFLE_ICON, iw = w * (team ? .42 : .62);
    let t = `<g transform="translate(${n(+cx - iw / 2)} ${n(y0 + (y1 - y0) * .02)}) scale(${n(iw)})"><path d="${icon}" fill="${gold}"/></g>`;
    const ly = (k) => n(y0 + (y1 - y0) * k);
    t += fitTxt(cx, ly(.4), 'HLTV', w * .22, w * .8, gold) + fitTxt(cx, ly(.55), lines[0], w * .2, w * .86, gold) +
      `<path d="M${n(x0 + w * .2)} ${ly(.62)}H${n(x1 - w * .2)}" stroke="${gold}" stroke-width=".25"/>` +
      fitTxt(cx, ly(.74), lines[1], w * .13, w * .86, gold) + fitTxt(cx, ly(.9), year ? String(year) : '', w * .17, w * .6, gold);
    return c.svg(`<ellipse cx="32" cy="70.4" rx="18" ry="1.8" fill="${c.shadow()}"/>` + body + t, null, 'tw-award-svg', `${type} ${year || ''}`);
  }
  function award(type, year) {
    if (PLAYER_AWARDS[type]) return statueAward(type, year);
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


  /* ---------- v101: новые силуэты ---------- */
  // фирменная подставка PGL: широкая плита с крупной табличкой — одинаковая у всех кубков PGL
  function pglBase(c) {
    const lac = c.grad('pgllac', 0, 0, 1, 0, [[0, '#050608'], [.25, '#2a3038'], [.5, '#0d0f12'], [.8, '#2a3038'], [1, '#050608']]);
    return `<ellipse cx="32" cy="69.7" rx="19" ry="2.1" fill="${c.shadow()}"/><path d="M14 69.2L16 60.4H48L50 69.2z" fill="${lac}"/><path d="M16 60.4H48L46.6 58.6H17.4z" fill="${c.mV('chrome')}"/>` +
      `<rect x="21.5" y="62.3" width="21" height="5" rx=".8" fill="${c.mH('chrome')}" stroke="#000" stroke-opacity=".5" stroke-width=".25"/>` + txt(32, 66.1, 'PGL', 3.9, '#0b0d10', ' letter-spacing="1.4"');
  }
  D.nationsStars = (c, o) => { // Кубок наций: сфера на тонкой колонне под аркой из звёзд стран
    const m = o.metal || 'gold', g = o.glass || 'blue';
    let s = pedestal(c, 'block', m, 24, 'NATIONS') +
      vol(c, 'M29.6 58.4C30.2 50 30.6 42 30.8 34H33.2C33.4 42 33.8 50 34.4 58.4z', c.mH(m)) +
      `<ellipse cx="32" cy="34" rx="4.6" ry="1.2" fill="${c.mV(m)}"/><path d="M27.4 34Q32 37.4 36.6 34" fill="none" stroke="${c.mH(m)}" stroke-width="1"/>` +
      `<circle cx="32" cy="25.4" r="8.4" fill="${c.glR(g)}" stroke="${c.mV(m)}" stroke-width=".7"/>` +
      `<ellipse cx="32" cy="25.4" rx="3.8" ry="8.4" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".45"/><path d="M23.6 25.4H40.4M25 21H39M25 29.8H39" stroke="#fff" stroke-opacity=".3" stroke-width=".4"/>` +
      `<path d="M14.6 33.6A17.6 17.6 0 0 1 49.4 33.6" fill="none" stroke="${c.mH(m)}" stroke-width="2.2" stroke-linecap="round"/><path d="M15.6 32.4A16.4 16.4 0 0 1 48.4 32.4" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".4"/>`;
    for (let i = 0; i < 9; i++) { const a = Math.PI * (1 - i / 8), x = 32 + Math.cos(a) * 17.6, y = 33.6 - Math.sin(a) * 17.6; s += glyph('star', n(x), n(y), i === 4 ? 2.6 : 1.7, '#fff3c4'); }
    return s + shine('M26.6 20A7 7 0 0 1 30.4 17.4', .9);
  };
  D.fissure = (c, o) => { // FISSURE: две грани, расколотые светящейся трещиной
    const m = o.metal || 'chrome', acc = o.accent || '#7a3fd0';
    const L = 'M30.6 58.4L20.4 27L26.6 4.4L30.9 25.4z', R = 'M33.4 58.4L43.6 28.4L37.6 8L33.1 26.6z';
    const glow = c.grad('fsg' + acc, 0, 0, 0, 1, [[0, '#ffffff'], [.35, acc], [1, acc, .2]]);
    return pedestal(c, 'round', 'black', 22, 'FISSURE') +
      `<path d="M30.9 25.4L32 2.5L33.1 26.6L32 58.4z" fill="${glow}"/><path d="M32 6V56" stroke="#fff" stroke-opacity=".7" stroke-width=".4"/>` +
      vol(c, L, c.mH(m)) + vol(c, R, c.mH(m)) + `<path d="M26.6 4.4L24.4 28L30.6 58.4" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".45"/><path d="M37.6 8L39.6 29L33.4 58.4" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".45"/>` +
      shine('M23 26L26 8', .8);
  };
  D.cctChevron = (c, o) => { // CCT: три шеврона «вверх» на колонне
    const m = o.metal || 'silver';
    let s = pedestal(c, 'slab', m, 22, 'CCT') + stem(c, m, 41, 58.4, 4, 10);
    [[37, 14], [27, 11.5], [17, 9]].forEach(([y, w], i) => { const d = `M${32 - w} ${y + 5}L32 ${y}L${32 + w} ${y + 5}V${y + 9}L32 ${y + 4}L${32 - w} ${y + 9}z`; s += vol(c, d, c.mH(m)) + `<path d="M${32 - w} ${y + 5}L32 ${y}L${32 + w} ${y + 5}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".4"/>`; });
    return s + `<path d="M32 4L35.6 10L32 15.4L28.4 10z" fill="${c.gl(o.glass || 'blue')}" stroke="${c.mV(m)}" stroke-width=".4"/>`;
  };
  D.cctPortal = (c, o) => { // CCT: арка-портал с диском внутри
    const m = o.metal || 'silver', d = 'M18 58.4V24A14 14 0 0 1 46 24V58.4H40.4V24A8.4 8.4 0 0 0 23.6 24V58.4z';
    return pedestal(c, 'slab', m, 32, 'CCT') + vol(c, d, c.mH(m)) + `<path d="M19.6 56V24A12.4 12.4 0 0 1 32 11.6" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".6"/>` +
      `<circle cx="32" cy="27" r="5.6" fill="${c.glR(o.glass || 'cyan')}" stroke="${c.mV(m)}" stroke-width=".6"/><path d="M32 32.6V58.4" stroke="${c.mH(m)}" stroke-width="1.4"/>`;
  };
  D.bbBurst = (c, o) => { // BetBoom: «взрыв» — лучистая звезда со сферой в центре
    const m = o.metal || 'chrome';
    const p = []; for (let i = 0; i < 24; i++) { const a = -Math.PI / 2 + i * Math.PI / 12, r = i % 2 ? 9.6 : (i % 4 ? 15 : 17.6); p.push(`${n(32 + Math.cos(a) * r)} ${n(23 + Math.sin(a) * r)}`); }
    return pedestal(c, 'step', m, 22, 'BOOM') + stem(c, m, 38, 58.4, 4, 11) +
      vol(c, 'M' + p.join('L') + 'z', c.mH(m)) + `<circle cx="32" cy="23" r="10.4" fill="none" stroke="#000" stroke-opacity=".3" stroke-width=".4"/>` +
      `<circle cx="32" cy="23" r="7.2" fill="${c.glR(o.glass || 'mint')}" stroke="${c.mV(m)}" stroke-width=".7"/>` + shine('M27.6 19A5.4 5.4 0 0 1 31 17.4', .8);
  };
  // новые организаторы (впервые в карьере)
  D.wingCup = (c, o) => {
    const m = o.metal || 'silver', W1 = 'M23 15C15 9 9 12 7.4 19C11 17.4 14.4 18 16.4 20C12.6 21 10.4 24 10.6 27.6C14.4 25 18.4 24.6 23.4 24.4z';
    return pedestal(c, o.base || 'step', m, 22, o.label) + stem(c, m, 36, 58.4, 4, 11) +
      vol(c, W1, c.mH(m)) + `<g transform="matrix(-1 0 0 1 64 0)">${vol(c, W1, c.mH(m))}</g>` +
      vol(c, 'M21.6 11H42.4L40 27C38.6 33 35.6 36.4 32 36.4S25.4 33 24 27z', c.mH(m)) + `<ellipse cx="32" cy="11" rx="10.4" ry="1.7" fill="${c.mV(m)}"/>` + shine('M24.6 14C25 22 26.6 29 29 33', 1);
  };
  D.spire = (c, o) => {
    const m = o.metal || 'silver';
    return pedestal(c, o.base || 'step', m, 20, o.label) + vol(c, 'M32 2.6L38.4 40L34.4 58.4H29.6L25.6 40z', c.mH(m)) +
      `<path d="M32 2.6L32 58.4M25.6 40H38.4" stroke="#000" stroke-opacity=".28" stroke-width=".45"/><path d="M32 2.6L27.6 40" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/>` +
      `<ellipse cx="32" cy="40" rx="7.4" ry="1.6" fill="${c.mV(m)}"/><path d="M30 14L32 9L34 14L32 26z" fill="${c.gl(o.glass || 'ice')}"/>`;
  };
  D.ringStack = (c, o) => {
    const m = o.metal || 'silver';
    let s = pedestal(c, o.base || 'round', m, 22, o.label) + `<path d="M30.4 58.4V10H33.6V58.4z" fill="${c.mH(m)}"/>`;
    [[50, 12], [40, 10.4], [30, 8.6], [20, 6.6]].forEach(([y, rx]) => { s += `<ellipse cx="32" cy="${y}" rx="${rx}" ry="${n(rx * .3)}" fill="none" stroke="${c.mH(m)}" stroke-width="2.4"/><ellipse cx="32" cy="${y - .6}" rx="${rx}" ry="${n(rx * .3)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".4"/>`; });
    return s + `<circle cx="32" cy="8" r="4" fill="${c.glR(o.glass || 'blue')}" stroke="${c.mV(m)}" stroke-width=".5"/>`;
  };
  D.arcGate = (c, o) => {
    const m = o.metal || 'silver', A = 'M30.6 58.4C20 48 15 32 22 8C21 26 25 42 32.6 52z';
    return pedestal(c, o.base || 'slab', m, 24, o.label) + vol(c, A, c.mH(m)) + `<g transform="matrix(-1 0 0 1 64 0)">${vol(c, A, c.mH(m))}</g>` +
      glyph('star', 32, 24, 5.6, '#fff4cc') + `<circle cx="32" cy="24" r="8.4" fill="none" stroke="${c.mV(m)}" stroke-width=".7"/>`;
  };
  D.prismCrown = (c, o) => {
    const m = o.metal || 'silver';
    return pedestal(c, o.base || 'step', m, 22, o.label) + `<path d="M24 58.4V22L32 18L40 22V58.4L32 62z" fill="${c.gl(o.glass || 'ice')}" stroke="${c.mV(m)}" stroke-width=".5"/><path d="M32 18V62M24 22L32 26L40 22" stroke="#fff" stroke-opacity=".45" stroke-width=".4" fill="none"/>` +
      vol(c, 'M22.4 20L22 9L26.4 14L32 5L37.6 14L42 9L41.6 20Q32 23 22.4 20z', c.mH(m)) + `<circle cx="32" cy="5" r="1.4" fill="${c.mR(m)}"/>`;
  };


  // ===== v103: новые векторные модели (EWC, FISSURE, Thunderpick, PGL, Perfect World) и Grand Slam =====
  const SH = ' stroke="#000" stroke-opacity=".4" stroke-width=".3" paint-order="stroke"';
  // короткое имя турнира без названия организатора и года: «PERFECT WORLD SHANGHAI 2026» → «SHANGHAI»
  function shortOf(title, orgRe, fb) { const t = String(title || '').replace(orgRe, '').replace(/\b20\d\d\b/g, '').replace(/\s+/g, ' ').trim(); return t || fb; }
  D.ewcPlate = (c, o) => { // EWC: гранёный хрустальный диск с треугольником; белые надписи
    return `<ellipse cx="32" cy="64" rx="18" ry="2" fill="${c.shadow()}"/>` + art(c, 'ewcDisc', o).body +
      fitTxt(31.9, 44.7, 'EWC', 3.6, 11, '#fff', ' font-style="italic" letter-spacing=".2"' + SH) +
      fitTxt(31.9, 47.6, 'COUNTER-STRIKE 2', 1.45, 12.3, '#fff', SH) + fitTxt(31.9, 50, o.year || '', 1.3, 6, '#fff', ' fill-opacity=".85"' + SH);
  };
  D.fissure = (c, o) => { // FISSURE: бирюзово-синий кристалл с золотыми коронами; надпись турнира на основании
    return shadowUnder(c, 19) + art(c, 'fissureCrystal', o).body +
      fitTxt(40.9, 66.9, shortOf(o.title, /^FISSURE\s*/i, 'FISSURE'), 3.6, 10, '#fff', SH);
  };
  D.thunderSwirl = (c, o) => { // Thunderpick: витая золотая чаша, кольцо и стеклянная молния; надписи на подставке
    return shadowUnder(c, 15) + art(c, 'thunderCup', o).body +
      fitTxt(32.2, 59.9, 'THUNDERPICK', 1.6, 12.5, '#fff', ' font-style="italic"') + fitTxt(32.2, 63.3, 'WORLD', 3.6, 13.5, '#fff') +
      fitTxt(32.2, 65.2, 'CHAMPIONSHIP', 1.5, 12.5, '#fff') + fitTxt(32.2, 67.5, o.year || '', 1.7, 6, '#fff');
  };
  const PW_LOGO = 'M0.725 0.000L0.547 0.000L0.430 0.293L0.526 0.491zM0.448 0.000L0.270 0.000L0.150 0.296L0.249 0.491zM0.000 0.000L0.096 0.185L0.169 0.000z';
  D.orbBowl = (c, o) => { // Perfect World: гранёный кристалл; логотип PW (оранжевые штрихи), город и год — процедурно
    const city = shortOf(o.title, /^(PERFECT WORLD|PW)\s*(MAJOR)?\s*/i, 'PERFECT WORLD');
    return shadowUnder(c, 15) + art(c, 'pwCrystal', o).body +
      `<g transform="translate(29.6 8) scale(4.9)"><path d="${PW_LOGO}" fill="#f39320"/></g>` +
      fitTxt(32, 13, city, 1.55, 8.4, '#fff') + fitTxt(32, 14.9, o.year || '', 1.35, 5, '#f39320');
  };
  D.pglCrown2 = (c, o) => shadowUnder(c, 15) + art(c, 'pglCrown2', o).body; // PGL: старая «корона-пламя» (заменена на pglFlame)
  // v120: PGL — серебряно-синее «пламя» (замена старой короны), гранёная призма с жёлтой вставкой, золото-чёрный щит Major
  // v121: новые кубки PGL — реалистичные рендеры пользователя (слои WebP), перекраска фильтрами:
  // металл → по яркости в палитру выбранного металла, стекло/вставка → в палитру выбранного цвета; надписи турнира — процедурные
  const PGL_IMG = {"prism_m": "assets/ui/trophies/pgl-prism_m.webp", "prism_a": "assets/ui/trophies/pgl-prism_a.webp", "major_m": "assets/ui/trophies/pgl-major_m.webp", "major_k": "assets/ui/trophies/pgl-major_k.webp"};
  function toneFilter(c, key, stops) { // яркость пикселя → цвет из палитры (блики и тени рендера сохраняются)
    if (c.memo['tf' + key]) return c.memo['tf' + key];
    const id = c.id + (c.k++), ch = (k) => stops.map(h => (parseInt(h.slice(1 + k * 2, 3 + k * 2), 16) / 255).toFixed(3)).join(' ');
    c.defs.push(`<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="${ch(0)}"/><feFuncG type="table" tableValues="${ch(1)}"/><feFuncB type="table" tableValues="${ch(2)}"/></feComponentTransfer></filter>`);
    return (c.memo['tf' + key] = `url(#${id})`);
  }
  const pglLayer = (c, key, box, filt) => `<image href="${PGL_IMG[key]}" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" preserveAspectRatio="none"${filt ? ` filter="${filt}"` : ''}/>`;
  const fitBox = (w, h) => { const H = 68, W = H * w / h; return [n(32 - W / 2), 2, n(W), H]; };
  const metalTone = (c, o, native) => { const m = o.metal || native; if (!m || m === native || (native === 'silver' && m === 'chrome')) return null; return toneFilter(c, 'm' + m, metalStops(m)); };
  const WARM = ['amber', 'yellow', 'orange', 'gold'], WARM_M = ['gold', 'pale', 'bronze', 'copper'];
  const glassTone = (c, o, native) => { let g = o.glass || o.second || native; if (WARM.includes(g) && WARM_M.includes(o.metal)) g = native === 'yellow' ? 'blue' : native; // золото с жёлтым стеклом сливается
    if (!g || g === native) return null; return toneFilter(c, 'g' + g, glassStops(g)); };
  const pglShort = (o) => String(o.title || '').replace(/\bPGL\b|\bMAJOR\b|\bCS2?\b/g, '').replace(/\s+/g, ' ').trim() || 'PGL';
  D.pglPrism = (c, o) => { const bx = fitBox(300, 632), k = 68 / 790, x0 = 32 - 375 * k / 2, t = o.major ? 'MAJOR' : pglShort(o).split(' ')[0];
    return shadowUnder(c, 16) + pglLayer(c, 'prism_m', bx, metalTone(c, o, 'silver')) + pglLayer(c, 'prism_a', bx, glassTone(c, o, 'yellow')) +
      fitTxt(n(x0 + 188 * k), n(2 + 57 * k), t, 1.5, 9.4, '#1d2b4f', ' letter-spacing=".1"') + fitTxt(n(x0 + 188 * k), n(2 + 67.5 * k), 'PGL', .62, 2, '#1d2b4f'); };
  D.pglMajor = (c, o) => { const bx = fitBox(400, 568), k = 68 / 810, x0 = 32 - 570 * k / 2, yy = String(o.year || '').slice(-2);
    const g = sampleStops(metalStops(o.metal || 'gold'), .82), city = pglShort(o) + (yy ? "'" + yy : '');
    return shadowUnder(c, 18) + pglLayer(c, 'major_k', bx, null) + pglLayer(c, 'major_m', bx, metalTone(c, o, 'gold')) +
      fitTxt(n(x0 + 316 * k), n(2 + 184.5 * k), city, 1.75, n(168 * k), g, ' letter-spacing=".08"'); };
  D.pglPlaque = (c, o) => shadowUnder(c, 21) + art(c, 'pglPlaque', o).body; // PGL: буквы PGL и рельеф оружия на постаменте
  // Grand Slam — реалистичный слиток с рендера пользователя (WebP, фон убран)
  const GOLDBAR_IMG = 'assets/ui/trophies/goldbar.webp';
  function goldBar() {
    const c = new Ctx();
    return c.svg(`<image href="${GOLDBAR_IMG}" x="1" y="11.54" width="62" height="40.92" preserveAspectRatio="none"/>`, '0 0 64 64', 'tw-goldbar');
  }
  // MVP — реалистичная медаль HLTV с рендера пользователя
  const MVP_IMG = 'assets/ui/trophies/mvp.webp';
  function mvpMedal() {
    const c = new Ctx();
    return c.svg(`<image href="${MVP_IMG}" x="-0.46" y="1" width="64.92" height="62" preserveAspectRatio="none"/>`, '0 0 64 64', 'tw-mvp');
  }


  // ENC (Esports Nations Cup): детали и грани — с рендера; материал назначен целым граням по цветовой карте пользователя
  // (серебро m, золото g, кристалл a, розовое золото p, чёрная основа k). Надписи процедурные.
  const ENC_MAP = {"encSpire": [17.564, 1.0, 0.05809, 17, 9], "encTwist": [18.099, 1.0, 0.05804, 0, 13]};
  const encP = (key, x, y) => { const mp = ENC_MAP[key]; return [n(mp[0] + (x - mp[3]) * mp[2]), n(mp[1] + (y - mp[4]) * mp[2])]; };
  const starPath = (cx, cy, r) => `M${n(cx)} ${n(cy - r)}L${n(cx + r * .22)} ${n(cy - r * .22)}L${n(cx + r)} ${n(cy)}L${n(cx + r * .22)} ${n(cy + r * .22)}L${n(cx)} ${n(cy + r)}L${n(cx - r * .22)} ${n(cy + r * .22)}L${n(cx - r)} ${n(cy)}L${n(cx - r * .22)} ${n(cy - r * .22)}z`;
  const encStar = (cx, cy, r, col) => `<path d="${starPath(cx, cy, r)}" fill="${col}"/><path d="${starPath(cx, cy, r * .42)}" fill="#fff" fill-opacity=".9"/>`;
  D.encSpire = (c, o) => {
    const { body } = art(c, 'encSpire', o), gold = sampleStops(metalStops(o.metal2 || 'gold'), .72);
    const [ex, ey] = encP('encSpire', 286, 431), [sx, sy] = encP('encSpire', 281, 466), [bx, by] = encP('encSpire', 287, 1080), [cx2, cy2] = encP('encSpire', 287, 1106), [wx, wy] = encP('encSpire', 287, 1180);
    return shadowUnder(c, 17) + body + fitTxt(ex, ey, 'ENC', 3.2, 7, '#fff', ' font-style="italic"' + SH) + encStar(+sx, +sy, 1.5, gold) +
      fitTxt(bx, by, 'ESPORTS NATIONS CUP', 1.05, 10.5, '#fff', SH) + fitTxt(cx2, cy2, 'CS2', 1.3, 3, '#fff', ' font-style="italic"' + SH) +
      fitTxt(wx, wy, o.year ? 'WORLD CHAMPION ' + o.year : 'WORLD CHAMPION', 1.2, 12.5, gold, SH);
  };
  D.encTwist = (c, o) => {
    const { body } = art(c, 'encTwist', o);
    const [s1x, s1y] = encP('encTwist', 266, 268), [ex, ey] = encP('encTwist', 266, 337), [s2x, s2y] = encP('encTwist', 266, 374);
    const [bx, by] = encP('encTwist', 265, 1093), [tx, ty] = encP('encTwist', 265, 1118), [cx2, cy2] = encP('encTwist', 265, 1146);
    return shadowUnder(c, 17) + body + encStar(+s1x, +s1y, 1.9, '#fff') + fitTxt(ex, ey, 'ENC', 3.4, 7.2, '#fff', ' font-style="italic"' + SH) + encStar(+s2x, +s2y, 1.5, '#fff') +
      fitTxt(bx, by, 'ENC', 2, 5, '#fff', ' font-style="italic"' + SH) + fitTxt(tx, ty, 'ESPORTS NATIONS CUP', 1.05, 9.5, '#fff', SH) +
      fitTxt(cx2, cy2, o.year ? 'CS2 \u00b7 ' + o.year : 'CS2', 1.3, 6, '#fff', ' font-style="italic"' + SH);
  };

  // v109: значок HLTV Top-20 — гексаграмма с синими гранями, металлический ромб с местом, табличка с годом сверху.
  // №1 золото, №2 серебро с синей каймой со звёздами, №3 шампань, 4–20 медь. Всё процедурно и с чёткими гранями.
  // цифры значков — контуры Inter Display Black (SIL OFL), встроены вектором: не зависят от шрифтов у игрока
  const DIGF = {"cap":1514,"g":{"0":{"d":"M698 -24C1111 -24 1356 267 1356 744C1356 1222 1111 1514 698 1514C285 1514 40 1221 40 744C40 268 285 -24 698 -24ZM698 296C533 296 432 466 432 744C432 1023 533 1194 698 1194C863 1194 964 1023 964 744C964 466 863 296 698 296Z","adv":1396,"b":[40,-24,1356,1514]},"1":{"d":"M766 1490H398L32 1266V922L364 1125H366V0H766Z","adv":846,"b":[32,0,766,1490]},"2":{"d":"M75 0H1219V322H639V324L880 520C1078 681 1215 816 1215 1039C1215 1335 975 1514 645 1514C284 1514 60 1299 60 952H441C441 1107 523 1194 644 1194C755 1194 829 1122 829 1016C829 887 718 809 635 742L75 290Z","adv":1291,"b":[60,0,1219,1514]},"3":{"d":"M654 -24C1019 -24 1266 165 1266 420C1266 598 1146 756 922 779V782C1091 802 1220 918 1220 1100C1220 1343 988 1514 658 1514C294 1514 78 1305 78 1032H466C466 1139 548 1214 658 1214C763 1214 839 1145 839 1050C839 953 760 896 626 896H482V616H626C765 616 854 551 854 451C854 354 771 286 652 286C520 286 440 371 440 512H50C50 234 228 -24 654 -24Z","adv":1306,"b":[50,-24,1266,1514]},"4":{"d":"M64 288H792V0H1182V288H1348V594H1182V1490H671L64 602ZM792 594H439V596L791 1118H792Z","adv":1414,"b":[64,0,1348,1490]},"5":{"d":"M627 -24C989 -24 1225 200 1225 512C1225 795 975 1017 710 1017C600 1017 507 985 446 925H444L463 1166H1133V1490H99L57 600H429C452 674 527 724 630 724C750 724 835 631 835 500C835 370 752 282 630 282C510 282 420 366 420 480H35C55 166 283 -24 627 -24Z","adv":1265,"b":[35,-24,1225,1490]},"6":{"d":"M686 -24C1034 -24 1282 186 1282 498C1282 789 1062 1000 758 1000C609 1000 498 950 420 838H418C418 1069 498 1210 673 1210C786 1210 863 1150 880 1056H1262C1237 1311 1017 1514 688 1514C282 1514 40 1210 40 728C40 254 279 -24 686 -24ZM682 288C563 288 476 376 476 498C476 620 563 708 682 708C803 708 890 620 890 498C890 376 803 288 682 288Z","adv":1322,"b":[40,-24,1282,1514]},"7":{"d":"M142 0H558L1146 1166V1490H40V1152H726V1150Z","adv":1186,"b":[40,0,1146,1490]},"8":{"d":"M656 -24C1029 -24 1274 146 1274 404C1274 608 1125 739 884 772C1099 804 1228 920 1228 1106C1228 1355 1005 1514 656 1514C315 1514 86 1350 86 1106C86 920 216 803 430 772C189 739 40 608 40 404C40 146 284 -24 656 -24ZM656 254C542 254 460 330 460 436C460 541 542 616 656 616C771 616 854 541 854 436C854 331 770 254 656 254ZM656 907C550 907 482 969 482 1066C482 1163 550 1225 656 1225C763 1225 832 1163 832 1066C832 969 763 907 656 907Z","adv":1314,"b":[40,-24,1274,1514]},"9":{"d":"M634 -24C1040 -24 1282 280 1282 762C1282 1236 1043 1514 636 1514C288 1514 40 1304 40 992C40 701 260 490 564 490C713 490 824 540 902 652H904C904 421 824 280 649 280C536 280 459 340 442 434H60C85 179 305 -24 634 -24ZM640 782C519 782 432 870 432 992C432 1114 519 1202 640 1202C759 1202 846 1114 846 992C846 870 759 782 640 782Z","adv":1322,"b":[40,-24,1282,1514]}}};
  // значки Top-20: сам значок — очищенный рендер пользователя (WebP, без цифр), год и место — векторные цифры
  // Inter Display Black, центровка по реальным границам начертания, одна высота для всех; широкие числа сужаются по горизонтали
  const BADGE_IMG = {"gold": "assets/ui/trophies/badge-gold.webp", "silver": "assets/ui/trophies/badge-silver.webp", "champ": "assets/ui/trophies/badge-champ.webp", "copper": "assets/ui/trophies/badge-copper.webp"};
  const BADGE_POS = {"gold": {"img": [3.04, 1, 57.92, 62], "year": [32, 16.54], "num": [32, 35.45]}, "silver": {"img": [3.12, 1, 57.76, 62], "year": [32, 16.7], "num": [32, 36.0]}, "champ": {"img": [3.68, 1, 56.64, 62], "year": [32, 16.46], "num": [32, 35.87]}, "copper": {"img": [3.29, 1, 57.42, 62], "year": [32, 16.38], "num": [32, 35.94]}};
  // квадратные тяжёлые цифры как на рендере (сетка 8×11, скруглённые углы, узкие прорези); [путь, левый край, правый край]
  const SQD = {
    0: ['M1.5 0H6.5Q8 0 8 1.5V9.5Q8 11 6.5 11H1.5Q0 11 0 9.5V1.5Q0 0 1.5 0zM3.1 2.9V8.1H4.9V2.9z', 0, 8],
    1: ['M.6 2.6L3.9 0H6.9V11H3.9V3.9L.6 5.4z', 2.1, 6.9], // оптический центр: палочка, а не флажок
    2: ['M.3 0H6.5Q8 0 8 1.5V4.6Q8 5.6 7 6.1L3.9 7.9H8V11H0V7.6Q0 6.6 1 6.1L4.9 4.1V3H.3z', 0, 8],
    3: ['M0 0H6.5Q8 0 8 1.5V4.3L7.2 5.5L8 6.7V9.5Q8 11 6.5 11H0V8H4.9V7H1.4V4H4.9V3H0z', 0, 8],
    4: ['M0 0H3.1V5H4.8V2.4H7.7V5H8.4V8H7.7V11H4.8V8H0z', 0, 8.4],
    5: ['M8 0V3H3.1V4H6.5Q8 4 8 5.5V9.5Q8 11 6.5 11H0V8H4.9V7H0V0z', 0, 8],
    6: ['M8 0V3H3.1V4H6.5Q8 4 8 5.5V9.5Q8 11 6.5 11H1.5Q0 11 0 9.5V1.5Q0 0 1.5 0zM3.1 6.7V8.3H4.9V6.7z', 0, 8],
    7: ['M0 0H8V3L5.2 11H2L4.8 3H0z', 0, 8],
    8: ['M1.5 0H6.5Q8 0 8 1.5V4.3L7.3 5.5L8 6.7V9.5Q8 11 6.5 11H1.5Q0 11 0 9.5V6.7L.7 5.5L0 4.3V1.5Q0 0 1.5 0zM3.1 2.6V4.2H4.9V2.6zM3.1 6.8V8.4H4.9V6.8z', 0, 8],
    9: ['M0 11V8H4.9V7H1.5Q0 7 0 5.5V1.5Q0 0 1.5 0H6.5Q8 0 8 1.5V9.5Q8 11 6.5 11zM3.1 2.7V4.3H4.9V2.7z', 0, 8]
  };
  function fontNum(str, cx, cy, capH, col, maxW) {
    str = String(str).replace(/[^0-9]/g, '');
    const GAP = str.length > 1 && capH > 10 ? 1.0 : 1.4, k = capH / 11; let x = 0, d = '', ink0 = null, ink1 = 0;
    for (const ch of str) { const G = SQD[ch]; d += `<path d="${G[0]}" transform="translate(${n(x)} 0)"/>`;
      if (ink0 === null) ink0 = x + G[1]; ink1 = x + G[2]; x += G[2] + GAP; }
    const inkW = (ink1 - ink0) * k, kx = maxW && inkW > maxW ? k * maxW / inkW : k;
    const thick = kx < k ? n(.9 * (1 - kx / k) / (kx / k)) : 0; // сужение не истончает штрихи: компенсируем обводкой в цвет цифры
    const left = cx - (ink0 + ink1) / 2 * kx, top = cy - capH / 2;
    const g = (dy, extra) => `<g transform="translate(${n(left)} ${n(top + dy)}) scale(${kx.toFixed(4)} ${k.toFixed(4)})" fill-rule="evenodd" ${extra}>${d}</g>`;
    return g(capH * .045, `fill="#fff" fill-opacity=".42"${thick ? ` stroke="#fff" stroke-opacity=".42" stroke-width="${thick}" stroke-linejoin="round"` : ''}`) +                         // светлая кромка снизу — как на рендере
      (thick ? g(0, `fill="${col}" stroke="${col}" stroke-width="${thick}" stroke-linejoin="round"`) : '') + g(0, `fill="${col}" stroke="#000" stroke-opacity=".6" stroke-width="${(.35 / k).toFixed(2)}" stroke-linejoin="round"`) +
      g(-capH * .02, `fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".22" stroke-linejoin="round"`);  // блик по верхней кромке
  }
  function rankBadge(rank, year) {
    rank = Math.max(1, Math.min(99, Number(rank) || 20));
    const K = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'champ' : 'copper', T = BADGE_POS[K], I = T.img;
    const c = new Ctx(), yr = year ? String(year).slice(0, 4) : '';
    const img = `<image href="${BADGE_IMG[K]}" x="${I[0]}" y="${I[1]}" width="${I[2]}" height="${I[3]}" preserveAspectRatio="none"/>`;
    return c.svg(img + (yr ? fontNum(yr, T.year[0], T.year[1], 6.9, '#141414', 22) : fitTxt(T.year[0], T.year[1] + 2, 'TOP 20', 5.6, 22, '#151515', ' font-weight="900"')) +
      (rank > 9 ? fontNum(rank, T.num[0], T.num[1] - .3, 16, '#141414', 19.5) : fontNum(rank, T.num[0], T.num[1], 20.7, '#141414')), '0 0 64 64', 'tw-top20');
  }

  // v111: оформление Мейджора — варианты вместо плоской красной ленты
  function majorDress(c, body, o) {
    const st = o.majorStyle || 'glowSash', yr = o.year || '', city = o.city || '';
    const G = (t) => sampleStops(metalStops('gold'), t);
    const gold = c.grad('mjg', 0, 0, 0, 1, [[0, G(.95)], [.45, G(.75)], [.55, G(.6)], [1, G(.85)]]);
    const halo = (a) => `<ellipse cx="32" cy="32" rx="27" ry="30" fill="${c.grad('mjh' + a, .5, .42, .55, 0, [[0, '#fff3c4', a], [.5, '#ffcc4d', a * .25], [.95, '#ffcc4d', 0]], true)}"/>`;
    const rays = () => { let r = ''; for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + i * Math.PI / 8, x = 32 + Math.cos(a) * 30, y = 30 + Math.sin(a) * 30, b = a + .06, x2 = 32 + Math.cos(b) * 30, y2 = 30 + Math.sin(b) * 30; r += `<path d="M32 30L${n(x)} ${n(y)}L${n(x2)} ${n(y2)}z" fill="#ffe9a0" fill-opacity="${i % 2 ? .05 : .1}"/>`; } return r; };
    const spark = (x, y, r) => `<path d="M${x} ${n(y - r)}L${n(x + r * .22)} ${n(y - r * .22)}L${n(x + r)} ${y}L${n(x + r * .22)} ${n(y + r * .22)}L${x} ${n(y + r)}L${n(x - r * .22)} ${n(y + r * .22)}L${n(x - r)} ${y}L${n(x - r * .22)} ${n(y - r * .22)}z" fill="#fff8dc"/>`;
    const star5 = (cx, cy, r, f) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .42 : r; p.push(n(cx + Math.cos(a) * q) + ' ' + n(cy + Math.sin(a) * q)); } return `<path d="M${p.join('L')}z" fill="${f}"/>`; };
    if (st === 'plate') { // гравированная табличка на основании: чёрная эмаль, золотая рамка, MAJOR + год
      const plate = `<rect x="19" y="62" width="26" height="8.6" rx="1.2" fill="${gold}"/><rect x="19.8" y="62.8" width="24.4" height="7" rx=".8" fill="#0f1114"/>` +
        `<path d="M20.4 63.3H43.6" stroke="#fff" stroke-opacity=".12" stroke-width=".3"/>` +
        fitTxt(32, 66.3, 'MAJOR', 3, 18, G(.9), ' letter-spacing="1.4"') + fitTxt(32, 69.3, (city ? city.toUpperCase() + ' ' : '') + (yr || 'CHAMPIONS'), 1.6, 20, G(.75), ' letter-spacing=".5"');
      return halo(.35) + `<g transform="translate(0 -3.5)">${body}</g>` + plate;
    }
    if (st === 'laurel') { // золотой лавровый венок вокруг основания + звезда-корона над кубком
      let l = ''; for (const k of [-1, 1]) for (let i = 0; i < 8; i++) { const t = i / 7, a = (200 - t * 115) * Math.PI / 180, R = 25, x = 32 + k * Math.cos(a) * R * -1, y = 44 - Math.sin(a) * R * .95;
        l += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="1.4" ry="3.2" fill="${gold}" transform="rotate(${n(k * (t * 70 - 10))} ${n(x)} ${n(y)})" stroke="${G(.35)}" stroke-width=".25"/>`; }
      l += `<path d="M${n(32 - 25 * .94)} ${n(44 + 8.6)}Q32 72 ${n(32 + 25 * .94)} ${n(44 + 8.6)}" fill="none" stroke="${gold}" stroke-width=".9"/>`;
      return halo(.3) + l + body + star5(32, 3.4, 2.6, gold) + `<path d="M24 66.5H40" stroke="${gold}" stroke-width=".4"/>` + fitTxt(32, 70.4, 'MAJOR' + (yr ? ' ' + yr : ''), 2.6, 20, G(.9), ' letter-spacing="1.2"');
    }
    if (st === 'glowSash') { // v113: сияние с лучами и искрами + прямая аккуратная лента в цвете хозяина/вставок
      const rc = o.ribbon || o.second || 'red', col = gc(rc), dk = mix(col, '#000000', .5), lt = mix(col, '#ffffff', .22);
      const band = c.grad('mjb' + rc, 0, 0, 0, 1, [[0, lt], [.45, col], [1, dk]]);
      const y = 60, h = 4.4, x0 = 17, x1 = 47;
      const rb = `<path d="M${x0 - 4} ${y + 1}H${x0 + 1}V${y + h + 1}H${x0 - 4}L${x0 - 2.4} ${y + h / 2 + 1}z" fill="${dk}"/>` +
        `<path d="M${x1 + 4} ${y + 1}H${x1 - 1}V${y + h + 1}H${x1 + 4}L${x1 + 2.4} ${y + h / 2 + 1}z" fill="${dk}"/>` +
        `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" fill="${band}"/>` +
        `<path d="M${x0} ${y + .35}H${x1}M${x0} ${y + h - .35}H${x1}" stroke="${G(.9)}" stroke-width=".35"/>`;
      return rays() + halo(.45) + body + spark(13, 14, 2.2) + spark(52, 10, 1.6) + spark(9, 34, 1.2) + rb +
        fitTxt(32, y + h / 2 + 1.05, 'MAJOR' + (yr ? ' · ' + yr : ''), 2.7, x1 - x0 - 3, '#fff', ' letter-spacing="1.2"');
    }
    if (st === 'sash') { // атласная лента-перевязь цветов хозяина турнира, лежащая по диагонали перед основанием
      const col = gc(o.second || 'red'), dk = mix(col, '#000000', .45), lt = mix(col, '#ffffff', .25);
      const sash = c.grad('mjs', 0, 0, 1, 1, [[0, dk], [.3, col], [.5, lt], [.7, col], [1, dk]]);
      const rb = `<path d="M8 56L12 50L56 60L52 66z" fill="${sash}"/><path d="M8 56L3 60L7 61L5 65L12 61zM56 60L61 56L57 55L59 51L52 55z" fill="${dk}"/>` +
        `<path d="M12 50.6L56 60.6M8.6 55.6L52.6 65.6" stroke="${gold}" stroke-width=".5"/>`;
      return halo(.32) + body + rb + `<g transform="rotate(12.8 32 58)">` + fitTxt(32, 59.4, 'MAJOR' + (yr ? ' · ' + yr : ''), 3, 30, '#fff', ' letter-spacing="1.4"') + '</g>';
    }
    const cityYr = (city ? city.toUpperCase() + ' ' : '') + (yr || '');
    const shrink = (k, cy) => `<g transform="translate(32 ${cy}) scale(${k}) translate(-32 -36)">${body}</g>`;
    const host = gc(o.second || 'amber');
    if (st === 'spotlight') { // прожектор сверху (Spotlight Card): конус света, пятно на полу, пылинки, гравировка на «сцене»
      const cone = c.grad('mjsp', 0, 0, 0, 1, [[0, '#fff6d8', .55], [.7, '#ffe6a0', .12], [1, '#ffe6a0', 0]]);
      const pool = c.grad('mjpl', .5, .5, .5, 0, [[0, '#ffefb8', .55], [1, '#ffefb8', 0]], true);
      let dust = ''; for (let i = 0; i < 14; i++) { const h = hash('d' + i); dust += `<circle cx="${n(20 + (h % 240) / 10)}" cy="${n(4 + (h >>> 8) % 560 / 10)}" r="${n(.18 + (h >>> 16) % 4 / 20)}" fill="#fff" fill-opacity="${n(.25 + (h >>> 20) % 5 / 10)}"/>`; }
      return `<path d="M27 -2H37L56 70H8z" fill="${cone}"/><ellipse cx="32" cy="66.5" rx="22" ry="3.4" fill="${pool}"/>` + dust + body +
        fitTxt(32, 70.6, 'MAJOR' + (cityYr ? ' · ' + cityYr : ''), 1.9, 34, G(.9), ' letter-spacing="1.1"');
    }
    if (st === 'glass') { // стеклянная плашка (glassmorphism) с градиентной рамкой в цветах хозяина
      const bd = c.grad('mjgb', 0, 0, 1, 1, [[0, '#ffffff', .85], [.5, host, .9], [1, G(.9), .9]]);
      return halo(.28) + shrink(.84, 30.5) +
        `<rect x="14" y="58.5" width="36" height="11.5" rx="3" fill="#ffffff" fill-opacity=".1" stroke="${bd}" stroke-width=".7"/>` +
        `<rect x="14.6" y="59.1" width="34.8" height="4" rx="2.4" fill="#ffffff" fill-opacity=".1"/>` +
        fitTxt(32, 64.4, 'MAJOR', 3.6, 22, '#fff', ' letter-spacing="2"') + fitTxt(32, 68.3, cityYr || 'CHAMPIONS', 1.7, 30, mix(host, '#ffffff', .55), ' letter-spacing=".8"');
    }
    if (st === 'orbit') { // орбита из жидкого металла (Radial Orbital / Liquid Metal): кольцо вокруг кубка, задняя половина — за ним
      const ring = c.grad('mjor', 0, 0, 1, 0, [[0, G(.35)], [.25, G(1)], [.5, G(.55)], [.75, G(.95)], [1, G(.35)]]);
      const back = `<path d="M5 40A27 7.5 0 0 1 59 40" fill="none" stroke="${ring}" stroke-width="1.6" stroke-opacity=".75"/>`;
      const front = `<path d="M5 40A27 7.5 0 0 0 59 40" fill="none" stroke="${ring}" stroke-width="2.2"/>` + star5(14, 45.6, 1.6, G(.95)) + star5(32, 47.5, 2.2, G(1)) + star5(50, 45.6, 1.6, G(.95));
      return halo(.3) + back + body + front + fitTxt(32, 69.8, 'MAJOR' + (yr ? ' ' + yr : ''), 2.6, 22, G(.9), ' letter-spacing="1.6"');
    }
    if (st === 'shimmer') { // живой блик (shimmer): полоса света раз в несколько секунд проходит по кубку; рамка-уголки
      const mid = c.id + 'mjm', gid = c.id + 'mjsh';
      c.defs.push(`<mask id="${mid}" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="72"><g>${body}</g></mask>` +
        `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
      const corner = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 6}V${y}H${x + sx * 6}" fill="none" stroke="${G(.9)}" stroke-width=".8" transform="translate(${x * 0} 0)"/>`;
      return halo(.3) + body + `<g mask="url(#${mid})"><rect x="-20" y="-5" width="14" height="82" fill="url(#${gid})" transform="skewX(-18)"><animate attributeName="x" values="-30;80;80" keyTimes="0;.35;1" dur="4.5s" repeatCount="indefinite"/></rect></g>` +
        corner(4, 4, 1, 1) + corner(60, 4, -1, 1) + corner(4, 68, 1, -1) + corner(60, 68, -1, -1) +
        fitTxt(32, 70.4, 'MAJOR' + (cityYr ? ' · ' + cityYr : ''), 1.9, 40, G(.9), ' letter-spacing="1.2"');
    }
    if (st === 'neon') { // неоновая шестигранная рамка в цвете хозяина + неоновая надпись сверху
      const fid = c.id + 'mjn';
      c.defs.push(`<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
      const hex = 'M32 2.5L58 16.5V56L32 70L6 56V16.5z', nc = mix(host, '#ffffff', .25);
      return `<path d="${hex}" fill="${host}" fill-opacity=".08"/><path d="${hex}" fill="none" stroke="${nc}" stroke-width=".9" filter="url(#${fid})"/>` + shrink(.78, 38) +
        `<g filter="url(#${fid})">` + fitTxt(32, 10.4, 'MAJOR', 3.6, 18, nc, ' letter-spacing="2"') + '</g>' + fitTxt(32, 66.2, cityYr, 1.7, 22, mix(host, '#ffffff', .6), ' letter-spacing=".8"');
    }
    if (st === 'arc') { // дуга из звёзд и надпись по дуге «MAJOR CHAMPIONS», город и год под основанием
      const pid = c.id + 'mja'; c.defs.push(`<path id="${pid}" d="M9 24A23 17 0 0 1 55 24"/>`);
      let sts = ''; for (let i = 0; i < 7; i++) { const a = Math.PI * 1.08 + (i + .5) / 7 * Math.PI * .84, r = i === 3 ? 1.9 : 1.2; sts += star5(n(32 + Math.cos(a) * 27), n(26 + Math.sin(a) * 21.5), r, G(.95)); }
      return halo(.3) + sts + `<text font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="2.9" letter-spacing="1.3" fill="${G(.92)}"><textPath href="#${pid}" startOffset="50%" text-anchor="middle">MAJOR CHAMPIONS</textPath></text>` +
        shrink(.74, 42) + fitTxt(32, 70.4, cityYr, 2, 26, G(.85), ' letter-spacing="1"');
    }
    // seal: сияние, лучи, искры и золотая печать-медальон в углу
    const seal = `<g transform="translate(50 56)"><circle r="7.2" fill="${gold}"/><circle r="6" fill="#7a0f1d" stroke="${G(.95)}" stroke-width=".5"/>` +
      star5(0, -2.6, 1.6, G(.95)) + fitTxt(0, 1.4, 'MAJOR', 2.2, 10, '#fff', ' letter-spacing=".4"') + fitTxt(0, 3.9, yr || 'CS2', 1.6, 8, G(.9)) + '</g>';
    return rays() + halo(.45) + body + spark(13, 14, 2.2) + spark(52, 10, 1.6) + spark(9, 34, 1.2) + seal;
  }
  // v102: отрисовка заданной формы и отделки (для галерей и превью): draw({ d:'pglLattice', metal:'gold', second:'sky', title:'PGL ASTANA', year:'2027', major:false })
  function draw(spec) {
    const c = new Ctx(), o = Object.assign({}, spec);
    if (o.second && o.glass === undefined) o.glass = o.second;
    if (o.second) o.accent = gc(o.second);
    let body = (D[o.d] || D.classicCup)(c, o);
    if (o.major) body = majorDress(c, body, o);
    return c.svg(body, null, 'tw-cup tw-org-' + (o.org || 'custom'));
  }
  window.CS2TrophyForge = Object.freeze({ cup, cupSpec, draw, goldBar, mvpMedal, award, statueAward, rankBadge, marker, organizers: ORGS.map(o => o.key), awardTypes: Object.keys(AWARDS) });
})();
