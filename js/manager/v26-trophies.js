(() => {
'use strict';
/* =====================================================================
   v56 · Разнообразные кубки и награды
   1) TW — генератор кубков в SVG. У организатора сохраняется фирменная палитра и мотив, но силуэт выбирается
      отдельно для каждого турнира: кубок, щит, монета, эмблема, призма и др.
      Варианты включают синие, красные, градиентные и металлические награды.
   2) Медаль MVP (со счётчиком), плашка «топ-20 года», статуэтки
      «лучший рифлер / снайпер / IGL / новичок года», корона «команда года».
   3) Учёт наград игроков (отдельный ключ localStorage) и вывод:
      полоса трофеев у команды и у игрока, подсказка с крупным кубком.
   Хуки: оборачивает window.hubArchiveTier1, window.hubArchiveParallel,
   finalizeTournamentRating, window.showHistory, window.hubOpenPlayer.
   ===================================================================== */

/* ------------------------------------------------------------ числа */
function hash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function rngOf(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const jit = (r, v, p) => v * (1 + (r() * 2 - 1) * p);
const n = v => Math.round(v * 100) / 100;
function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function rgb2hex(c) { return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lighten = (c, t) => mix(c, '#ffffff', t), darken = (c, t) => mix(c, '#000000', t);

/* ------------------------------------------------------- материалы */
// 6 тонов «цилиндра»: тень · полутон · свет · блик · полутон · тень
const METALS = {
  gold:     ['#3d2706', '#9c6d1b', '#e9c25a', '#fff3c4', '#cf9a33', '#5c3d0c'],
  palegold: ['#4a3a14', '#a8913f', '#eadc93', '#fffbe3', '#c9b25c', '#6a5520'],
  silver:   ['#2f343a', '#848d97', '#d7dde3', '#ffffff', '#a9b2bb', '#4a525b'],
  chrome:   ['#1d2733', '#6c8197', '#c9dbec', '#f7fbff', '#8ea7bf', '#2f3e4e'],
  bronze:   ['#3a1d0b', '#93532a', '#e0a06a', '#ffe0c2', '#b06a36', '#552a12'],
  rose:     ['#43231d', '#a8695b', '#efb7a6', '#fff0ea', '#c4806f', '#62342b'],
  gunmetal: ['#0b0d10', '#33383f', '#7d8590', '#d7dce2', '#4a5058', '#15181c'],
  copper:   ['#3a1608', '#9a4a22', '#e58a55', '#ffd3b4', '#b85d2c', '#57220d']
};
const GLASS = {
  ice:    '#cfe9ff', blue:  '#4f9dff', violet: '#9a7bff', smoke: '#8d9aad',
  amber:  '#ffc75a', mint:  '#4fe0b0', ruby:   '#ff5a6e', cyan:  '#3fd6ff'
};
const ENAMEL = ['#d23b3b', '#2f6fe0', '#1f9e6e', '#7a3fd0', '#e08a1f', '#0fa3b8', '#e2e2e2', '#111418'];
const BASEMAT = {
  black:  ['#3a3f47', '#17191d', '#08090b'],
  wood:   ['#8a5a34', '#53301a', '#26140a'],
  marble: ['#f4f5f7', '#c6cbd1', '#868d95'],
  navy:   ['#33476b', '#1a2740', '#0a1222'],
  stone:  ['#8d8a84', '#57544f', '#2c2a27']
};

/* ------------------------------------------------- сборщик <defs> */
let UID = 0;
function Defs() { this.id = 'tw' + (++UID).toString(36) + '_'; this.k = 0; this.out = []; this.cache = {}; }
Defs.prototype.lg = function (key, x1, y1, x2, y2, stops) {
  if (this.cache[key]) return this.cache[key];
  const id = this.id + 'g' + (this.k++);
  this.out.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('') + '</linearGradient>');
  return (this.cache[key] = `url(#${id})`);
};
Defs.prototype.rg = function (key, cx, cy, r, stops) {
  if (this.cache[key]) return this.cache[key];
  const id = this.id + 'g' + (this.k++);
  this.out.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">` +
    stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('') + '</radialGradient>');
  return (this.cache[key] = `url(#${id})`);
};
Defs.prototype.clip = function (d) { const id = this.id + 'c' + (this.k++); this.out.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return `url(#${id})`; };
// металл вдоль (цилиндр), сверху вниз (плоскость), шаром
Defs.prototype.mH = function (m) { const c = METALS[m] || METALS.silver; return this.lg('mH' + m, 0, 0, 1, 0, [[0, c[0]], [.16, c[1]], [.36, c[2]], [.46, c[3]], [.62, c[4]], [1, c[5]]]); };
Defs.prototype.mD = function (m) { const c = METALS[m] || METALS.silver; return this.lg('mD' + m, 0, 0, 1, 0, [[0, c[5]], [.4, c[1]], [.75, c[4]], [1, c[0]]]); };
Defs.prototype.mV = function (m) { const c = METALS[m] || METALS.silver; return this.lg('mV' + m, 0, 0, 0, 1, [[0, c[3]], [.35, c[2]], [1, c[1]]]); };
Defs.prototype.mR = function (m) { const c = METALS[m] || METALS.silver; return this.rg('mR' + m, .36, .3, .78, [[0, c[3]], [.25, c[2]], [.7, c[4]], [1, c[5]]]); };
Defs.prototype.glassA = function (t) { return this.lg('gA' + t, 0, 0, 1, 1, [[0, lighten(t, .75), .92], [.45, t, .55], [1, darken(t, .25), .75]]); };
Defs.prototype.glassB = function (t) { return this.lg('gB' + t, 1, 0, 0, 1, [[0, darken(t, .15), .85], [.55, darken(t, .35), .6], [1, darken(t, .55), .85]]); };
Defs.prototype.glassR = function (t) { return this.rg('gR' + t, .35, .3, .8, [[0, '#ffffff', .95], [.25, lighten(t, .5), .75], [.75, t, .55], [1, darken(t, .45), .9]]); };
Defs.prototype.base = function (mat) { const c = BASEMAT[mat] || BASEMAT.black; return this.lg('b' + mat, 0, 0, 0, 1, [[0, c[0]], [.25, c[1]], [1, c[2]]]); };
Defs.prototype.baseH = function (mat) { const c = BASEMAT[mat] || BASEMAT.black; return this.lg('bH' + mat, 0, 0, 1, 0, [[0, c[2]], [.3, c[1]], [.45, c[0]], [.7, c[1]], [1, c[2]]]); };
Defs.prototype.enamel = function (c) { return this.lg('e' + c, 0, 0, 0, 1, [[0, lighten(c, .35)], [.5, c], [1, darken(c, .35)]]); };
Defs.prototype.shadow = function () { return this.rg('sh', .5, .5, .5, [[0, '#000', .55], [1, '#000', 0]]); };
Defs.prototype.svg = function (body, vb, extra) {
  return `<svg class="tw-svg" viewBox="${vb || '5 1 54 71'}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"${extra || ''}><defs>${this.out.join('')}</defs>${body}</svg>`;
};

/* ------------------------------------------------- значки (24×24) */
const ICONS = {
  star: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z',
  chevron: 'M3 6l9 6 9-6v5l-9 6-9-6z M3 14l9 6 9-6',
  cross: 'M4 4l16 16 M20 4L4 20',
  crosshair: 'M12 3v6 M12 15v6 M3 12h6 M15 12h6 M12 7a5 5 0 1 0 .01 0',
  scope: 'M12 4a8 8 0 1 0 .01 0 M12 1v6 M12 17v6 M1 12h6 M17 12h6',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z',
  sprout: 'M12 22V11 M12 12C12 7 8 4 3 4c0 5 4 8 9 8 M12 14c0-4 3-7 8-7 0 4-3 7-8 7',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  laurel: 'M7 20c-3-3-4-8-2-13 M17 20c3-3 4-8 2-13 M5 10l2 1 M4 14l2.5.5 M19 10l-2 1 M20 14l-2.5.5',
  diamond: 'M12 2l7 10-7 10-7-10z',
  shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z M8 12l2.5 2.5L16 9',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  grenade: 'M9 4h6v3H9z M7 8h10l2 4-2 9H7l-2-9z M10 12l1 2-1 2 M14 12l-1 2 1 2',
  flame: 'M13 2c1 5-4 6-2 11 1-2 3-3 4-5 4 5 3 12-3 14-5 1-9-3-8-8 1-4 5-6 6-12 1 2 2 3 3 4z',
  globe: 'M12 2a10 10 0 1 0 .01 0 M2 12h20 M12 2c3 3 3 17 0 20 M12 2c-3 3-3 17 0 20'
};
function icon(name, x, y, s, attrs) {
  const k = s / 24;
  return `<path d="${ICONS[name] || ICONS.star}" transform="translate(${n(x - s / 2)} ${n(y - s / 2)}) scale(${n(k)})" ${attrs}/>`;
}
function starPts(cx, cy, R, r, k) {
  const p = []; k = k || 5;
  for (let i = 0; i < k * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / k, rr = i % 2 ? r : R; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return p;
}
// объёмная звезда: каждый луч — светлая и тёмная половина
function bevelStar(d, metal, cx, cy, R, r) {
  const p = starPts(cx, cy, R, r), lt = d.mV(metal), dk = d.mD(metal);
  let s = '';
  for (let i = 0; i < 10; i++) {
    const a = p[i], b = p[(i + 1) % 10];
    s += `<path d="M${n(cx)} ${n(cy)}L${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}Z" fill="${i % 2 ? dk : lt}"/>`;
  }
  return s;
}

/* -------------------------------------------------------- подставка */
// возвращает {svg, top} — top: y, на котором стоит кубок
function drawBase(d, sp) {
  const b = sp.base, cx = 32, mat = b.mat, bw = b.w;
  // Некоторые награды — самостоятельные монеты и эмблемы без пьедестала.
  if (b.type === 'none') return { svg: '', top: 66 };
  let s = `<ellipse cx="32" cy="70" rx="${n(bw * .62)}" ry="1.8" fill="${d.shadow()}"/>`;
  const plaque = (y, w) => `<rect x="${n(cx - w / 2)}" y="${n(y)}" width="${n(w)}" height="2.6" rx=".4" fill="${d.mH(sp.plaque)}"/>`;
  if (b.type === 'round') {
    s += `<path d="M${n(cx - bw / 2)} 61v6.2a${n(bw / 2)} 2 0 0 0 ${n(bw)} 0V61z" fill="${d.baseH(mat)}"/>` +
      `<ellipse cx="32" cy="61" rx="${n(bw / 2)}" ry="2" fill="${d.base(mat)}"/>` +
      `<ellipse cx="32" cy="61" rx="${n(bw / 2 - .4)}" ry="1.6" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".5"/>` +
      `<path d="M${n(cx - bw / 2)} 63.4a${n(bw / 2)} 2 0 0 0 ${n(bw)} 0" fill="none" stroke="${d.mH(sp.plaque)}" stroke-width=".9"/>`;
    return { svg: s, top: 60.5 };
  }
  if (b.type === 'slab') {
    s += `<path d="M${n(cx - bw / 2)} 69L${n(cx - bw / 2 + 2)} 58H${n(cx + bw / 2 - 2)}L${n(cx + bw / 2)} 69z" fill="${d.base(mat)}"/>` +
      `<path d="M${n(cx - bw / 2 + 2)} 58H${n(cx + bw / 2 - 2)}" stroke="#fff" stroke-opacity=".28" stroke-width=".6"/>` + plaque(63.2, bw * .42);
    return { svg: s, top: 58 };
  }
  if (b.type === 'block') {
    s += `<rect x="${n(cx - bw / 2)}" y="56" width="${n(bw)}" height="13" rx="1" fill="${d.base(mat)}"/>` +
      `<rect x="${n(cx - bw / 2)}" y="56" width="${n(bw)}" height="13" rx="1" fill="${d.baseH(mat)}" opacity=".35"/>` +
      `<path d="M${n(cx - bw / 2 + 1)} 56.4H${n(cx + bw / 2 - 1)}" stroke="#fff" stroke-opacity=".3" stroke-width=".6"/>` + plaque(61.6, bw * .5);
    return { svg: s, top: 56 };
  }
  // step — две ступени
  s += `<rect x="${n(cx - bw / 2)}" y="63" width="${n(bw)}" height="6.2" rx=".6" fill="${d.base(mat)}"/>` +
    `<rect x="${n(cx - bw * .37)}" y="58.4" width="${n(bw * .74)}" height="4.8" rx=".5" fill="${d.base(mat)}"/>` +
    `<path d="M${n(cx - bw / 2 + .6)} 63.3H${n(cx + bw / 2 - .6)}M${n(cx - bw * .37 + .5)} 58.7H${n(cx + bw * .37 - .5)}" stroke="#fff" stroke-opacity=".25" stroke-width=".55"/>` +
    plaque(64.8, bw * .44);
  return { svg: s, top: 58.4 };
}

/* ---------------------------------------------------------- формы */
const ARCH = {};

ARCH.cup = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, W = jit(r, sp.big ? 33 : 29, .1), D = jit(r, sp.big ? 21 : 18, .12);
  const stemH = jit(r, sp.big ? 7 : 9, .25), fw = W * jit(r, .56, .12);
  const by = top - 3.2 - stemH - D, bb = by + D;
  let s = '';
  // ручки — позади чаши
  const hw = jit(r, 7, .25), hs = d.mH(m);
  if (sp.handles === 'loop') {
    s += `<path d="M${n(cx - W / 2 + 1.2)} ${n(by + D * .12)}C${n(cx - W / 2 - hw)} ${n(by + D * .02)} ${n(cx - W / 2 - hw)} ${n(by + D * .72)} ${n(cx - W * .2)} ${n(by + D * .82)}" fill="none" stroke="${hs}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="M${n(cx + W / 2 - 1.2)} ${n(by + D * .12)}C${n(cx + W / 2 + hw)} ${n(by + D * .02)} ${n(cx + W / 2 + hw)} ${n(by + D * .72)} ${n(cx + W * .2)} ${n(by + D * .82)}" fill="none" stroke="${d.mD(m)}" stroke-width="2.4" stroke-linecap="round"/>`;
  } else if (sp.handles === 'wing') {
    s += `<path d="M${n(cx - W / 2 + 1)} ${n(by + D * .1)}C${n(cx - W / 2 - hw * 1.3)} ${n(by - D * .25)} ${n(cx - W / 2 - hw * .6)} ${n(by + D * .6)} ${n(cx - W * .22)} ${n(by + D * .7)}L${n(cx - W * .3)} ${n(by + D * .45)}C${n(cx - W / 2 - hw * .2)} ${n(by + D * .4)} ${n(cx - W / 2 - hw * .5)} ${n(by + D * .05)} ${n(cx - W / 2 + 1)} ${n(by + D * .25)}z" fill="${hs}"/>` +
      `<path d="M${n(cx + W / 2 - 1)} ${n(by + D * .1)}C${n(cx + W / 2 + hw * 1.3)} ${n(by - D * .25)} ${n(cx + W / 2 + hw * .6)} ${n(by + D * .6)} ${n(cx + W * .22)} ${n(by + D * .7)}L${n(cx + W * .3)} ${n(by + D * .45)}C${n(cx + W / 2 + hw * .2)} ${n(by + D * .4)} ${n(cx + W / 2 + hw * .5)} ${n(by + D * .05)} ${n(cx + W / 2 - 1)} ${n(by + D * .25)}z" fill="${d.mD(m)}"/>`;
  } else if (sp.handles === 'angular') {
    s += `<path d="M${n(cx - W / 2 + 1)} ${n(by + D * .15)}H${n(cx - W / 2 - hw * .8)}V${n(by + D * .5)}L${n(cx - W * .25)} ${n(by + D * .8)}" fill="none" stroke="${hs}" stroke-width="2.1" stroke-linejoin="round"/>` +
      `<path d="M${n(cx + W / 2 - 1)} ${n(by + D * .15)}H${n(cx + W / 2 + hw * .8)}V${n(by + D * .5)}L${n(cx + W * .25)} ${n(by + D * .8)}" fill="none" stroke="${d.mD(m)}" stroke-width="2.1" stroke-linejoin="round"/>`;
  }
  // ножка и стопа
  s += `<path d="M${n(cx - fw / 2)} ${n(top)}H${n(cx + fw / 2)}L${n(cx + fw * .16)} ${n(top - 3.2)}H${n(cx - fw * .16)}z" fill="${d.mH(m)}"/>` +
    `<ellipse cx="${cx}" cy="${n(top)}" rx="${n(fw / 2)}" ry=".9" fill="${d.mD(m)}"/>` +
    `<rect x="${n(cx - 1.7)}" y="${n(bb - .5)}" width="3.4" height="${n(stemH + 1)}" fill="${d.mH(m)}"/>` +
    `<ellipse cx="${cx}" cy="${n(bb + stemH * .5)}" rx="${n(jit(r, 3.4, .2))}" ry="1.5" fill="${d.mH(m)}"/>`;
  // чаша
  const bowl = `M${n(cx - W / 2)} ${n(by)}C${n(cx - W / 2)} ${n(by + D * .78)} ${n(cx - W * .2)} ${n(bb)} ${n(cx - W * .11)} ${n(bb)}H${n(cx + W * .11)}C${n(cx + W * .2)} ${n(bb)} ${n(cx + W / 2)} ${n(by + D * .78)} ${n(cx + W / 2)} ${n(by)}z`;
  s += `<path d="${bowl}" fill="${d.mH(m)}"/>`;
  if (sp.band) {
    const cl = d.clip(bowl);
    s += `<g clip-path="${cl}"><rect x="0" y="${n(by + D * .3)}" width="64" height="${n(D * .15)}" fill="${sp.bandMetal ? d.mH(sp.bandMetal) : d.enamel(sp.accent)}"/>` +
      `<rect x="0" y="${n(by + D * .3)}" width="64" height=".5" fill="#fff" opacity=".35"/></g>`;
  }
  if (sp.emblem) s += `<g opacity=".9">${icon(sp.emblem, cx, by + D * .55, D * .42, `fill="${d.mD(sp.metal2 || m)}" stroke="${METALS[m][3]}" stroke-width=".6" stroke-opacity=".6"`)}</g>`;
  // блик
  s += `<path d="M${n(cx - W * .33)} ${n(by + 1.6)}C${n(cx - W * .32)} ${n(by + D * .55)} ${n(cx - W * .22)} ${n(by + D * .8)} ${n(cx - W * .13)} ${n(by + D * .9)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.1" stroke-linecap="round"/>`;
  // край и крышка
  s += `<ellipse cx="${cx}" cy="${n(by)}" rx="${n(W / 2)}" ry="${n(W * .075)}" fill="${d.mD(m)}"/>` +
    `<ellipse cx="${cx}" cy="${n(by + .25)}" rx="${n(W / 2 - 1.1)}" ry="${n(W * .055)}" fill="${darken(METALS[m][1], .35)}"/>`;
  if (sp.lid) {
    const lw = W * .43;
    s += `<path d="M${n(cx - lw)} ${n(by)}A${n(lw)} ${n(lw * .62)} 0 0 1 ${n(cx + lw)} ${n(by)}z" fill="${d.mR(m)}"/>` +
      `<rect x="${n(cx - .9)}" y="${n(by - lw * .62 - 2.5)}" width="1.8" height="3" fill="${d.mH(m)}"/>`;
    const fy = by - lw * .62 - 4.2;
    s += sp.finial === 'star' ? bevelStar(d, sp.metal2 || m, cx, fy, 3.6, 1.5) : `<circle cx="${cx}" cy="${n(fy + .8)}" r="2.2" fill="${d.mR(sp.metal2 || m)}"/>`;
  }
  return s;
};

ARCH.chalice = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, W = jit(r, 22, .14), D = jit(r, 17, .15), stemH = jit(r, 15, .2), fw = jit(r, 20, .15);
  const bb = top - 4 - stemH, by = bb - D;
  let s = `<path d="M${n(cx - fw / 2)} ${n(top)}Q${cx} ${n(top - 9)} ${n(cx + fw / 2)} ${n(top)}z" fill="${d.mH(m)}"/>` +
    `<ellipse cx="${cx}" cy="${n(top)}" rx="${n(fw / 2)}" ry=".9" fill="${d.mD(m)}"/>` +
    `<rect x="${n(cx - 1.3)}" y="${n(bb - .5)}" width="2.6" height="${n(stemH + 1)}" fill="${d.mH(m)}"/>`;
  const knots = sp.variant === 'twin' ? [.3, .7] : [.45];
  knots.forEach(k => { s += `<ellipse cx="${cx}" cy="${n(bb + stemH * k)}" rx="${n(jit(r, 3.6, .2))}" ry="1.9" fill="${d.mR(m)}"/>`; });
  const bowl = `M${n(cx - W / 2)} ${n(by)}H${n(cx + W / 2)}C${n(cx + W / 2 - 1)} ${n(by + D * .62)} ${n(cx + 3.2)} ${n(bb)} ${n(cx + 1.4)} ${n(bb)}H${n(cx - 1.4)}C${n(cx - 3.2)} ${n(bb)} ${n(cx - W / 2 + 1)} ${n(by + D * .62)} ${n(cx - W / 2)} ${n(by)}z`;
  s += `<path d="${bowl}" fill="${d.mH(m)}"/>`;
  const cl = d.clip(bowl), fac = sp.facets;
  if (fac) { s += `<g clip-path="${cl}" stroke="#000" stroke-opacity=".22" stroke-width=".5">`; for (let i = 1; i < fac; i++) { const x = cx - W / 2 + W * i / fac; s += `<path d="M${n(x)} ${n(by)}L${n(cx + (x - cx) * .12)} ${n(bb)}"/>`; } s += '</g>'; }
  if (sp.band) s += `<g clip-path="${cl}"><rect x="0" y="${n(by + 2.2)}" width="64" height="2.2" fill="${d.mH(sp.metal2 || 'gold')}"/></g>`;
  s += `<path d="M${n(cx - W * .3)} ${n(by + 1.5)}L${n(cx - 2.2)} ${n(bb - 1)}" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/>` +
    `<ellipse cx="${cx}" cy="${n(by)}" rx="${n(W / 2)}" ry="${n(W * .08)}" fill="${d.mD(m)}"/>` +
    `<ellipse cx="${cx}" cy="${n(by + .2)}" rx="${n(W / 2 - 1)}" ry="${n(W * .055)}" fill="${darken(METALS[m][1], .4)}"/>`;
  // камень на ножке
  const gy = bb + stemH * knots[0];
  s += `<circle cx="${cx}" cy="${n(gy)}" r="1.6" fill="${d.glassR(sp.gem)}"/><circle cx="${n(cx - .5)}" cy="${n(gy - .5)}" r=".45" fill="#fff" opacity=".9"/>`;
  return s;
};

ARCH.prism = (d, r, sp, top) => {
  const cx = 32, t = sp.glass, edge = 'stroke="#fff" stroke-opacity=".6" stroke-width=".55" stroke-linejoin="round"';
  const frame = sp.frame ? `stroke="${d.mH(sp.frame)}" stroke-width="1.1" stroke-linejoin="round" fill="none"` : '';
  const shard = (ax, ay, w, yb, k) => {
    const bl = ax - w * (1 + k), br = ax + w * (1 - k * .4), rx = ax + w * .18;
    const f1 = `M${n(ax)} ${n(ay)}L${n(bl)} ${n(yb)}H${n(rx)}z`, f2 = `M${n(ax)} ${n(ay)}L${n(rx)} ${n(yb)}H${n(br)}z`;
    return `<path d="${f1}" fill="${d.glassA(t)}" ${edge}/><path d="${f2}" fill="${d.glassB(t)}" ${edge}/>` +
      `<path d="M${n(ax - .6)} ${n(ay + 4)}L${n(ax - w * .45)} ${n(yb - 2)}" stroke="#fff" stroke-opacity=".75" stroke-width=".7"/>` +
      (frame ? `<path d="M${n(ax)} ${n(ay)}L${n(bl)} ${n(yb)}H${n(br)}z" ${frame}/>` : '');
  };
  let s = '';
  if (sp.variant === 'twin') {
    s += shard(cx - 6, jit(r, 16, .15), 8, top, .1) + shard(cx + 3, jit(r, 6, .2), 11.5, top, .05);
  } else if (sp.variant === 'trio') {
    s += shard(cx - 9, jit(r, 22, .12), 6.5, top, .15) + shard(cx + 9, jit(r, 20, .12), 6.5, top, -.2) + shard(cx, jit(r, 7, .2), 9, top, 0);
  } else if (sp.variant === 'inv') {
    const yt = jit(r, 11, .15), w = jit(r, 14, .12), yp = top - 9;
    s += `<rect x="${n(cx - 1.3)}" y="${n(yp)}" width="2.6" height="${n(top - yp)}" fill="${d.mH(sp.frame || 'silver')}"/>` +
      `<path d="M${n(cx - w)} ${n(yt)}H${n(cx + 3)}L${cx} ${n(yp)}z" fill="${d.glassA(t)}" ${edge}/>` +
      `<path d="M${n(cx + 3)} ${n(yt)}H${n(cx + w)}L${cx} ${n(yp)}z" fill="${d.glassB(t)}" ${edge}/>` +
      `<path d="M${n(cx - w)} ${n(yt)}L${n(cx - w + 4)} ${n(yt - 3)}H${n(cx + w + 2)}L${n(cx + w)} ${n(yt)}z" fill="${lighten(t, .6)}" fill-opacity=".8" ${edge}/>` +
      (frame ? `<path d="M${n(cx - w)} ${n(yt)}H${n(cx + w)}L${cx} ${n(yp)}z" ${frame}/>` : '');
  } else {
    s += shard(cx + jit(r, 0, 1) * 0, jit(r, 5, .3), jit(r, 13, .1), top, .05);
  }
  if (sp.core) s += `<g opacity=".85">${icon('diamond', cx + (sp.variant === 'twin' ? 3 : 0), top - 18, 7, `fill="${d.glassR(sp.coreTint)}" stroke="#fff" stroke-width=".8" stroke-opacity=".7"`)}</g>`;
  return s;
};

ARCH.spire = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, w = jit(r, 8.5, .15), ay = jit(r, 5, .4), yb = top - .3, mid = cx + w * .12;
  const one = (x, ww, ay2, mm) => `<path d="M${n(x)} ${n(ay2)}L${n(x - ww)} ${n(yb)}H${n(x + ww * .12)}z" fill="${d.mV(mm)}"/>` +
    `<path d="M${n(x)} ${n(ay2)}L${n(x + ww * .12)} ${n(yb)}H${n(x + ww)}z" fill="${d.mD(mm)}"/>` +
    `<path d="M${n(x)} ${n(ay2)}L${n(x + ww * .12)} ${n(yb)}" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/>`;
  let s = '';
  if (sp.variant === 'twin') s += one(cx - 7, w * .7, ay + 12, sp.metal2 || m) + one(cx + 2, w, ay, m);
  else s += one(cx, w, ay, m);
  if (sp.ring) {
    const ry = ay + (yb - ay) * .58, rw = w * 1.35;
    s += `<ellipse cx="${n(mid)}" cy="${n(ry)}" rx="${n(rw)}" ry="2.2" fill="none" stroke="${d.mH(sp.metal2 || 'gold')}" stroke-width="1.6"/>`;
  }
  if (sp.engr) for (let i = 1; i <= 3; i++) { const y = yb - i * 4; const hw = w * (y - ay) / (yb - ay); s += `<path d="M${n(cx - hw)} ${n(y)}H${n(cx + hw)}" stroke="#000" stroke-opacity=".25" stroke-width=".5"/>`; }
  if (sp.gemTop) s += `<circle cx="${cx}" cy="${n(ay - 1.5)}" r="2.2" fill="${d.glassR(sp.gem)}"/>`;
  return s;
};

ARCH.orb = (d, r, sp, top) => {
  const cx = 32, R = jit(r, 13, .1), cy = top - 7 - R, m = sp.metal;
  let s = `<rect x="${n(cx - 1.6)}" y="${n(cy + R * .6)}" width="3.2" height="${n(top - cy - R * .6)}" fill="${d.mH(m)}"/>` +
    `<path d="M${n(cx - 7)} ${n(top - 1)}Q${cx} ${n(top - 6)} ${n(cx + 7)} ${n(top - 1)}z" fill="${d.mH(m)}"/>`;
  const sphere = sp.glassOrb ? d.glassR(sp.glass) : d.mR(m);
  s += `<circle cx="${cx}" cy="${n(cy)}" r="${n(R)}" fill="${sphere}"/>`;
  if (sp.globe) {
    const st = `fill="none" stroke="${sp.glassOrb ? '#fff' : '#000'}" stroke-opacity="${sp.glassOrb ? .45 : .28}" stroke-width=".55"`;
    s += `<ellipse cx="${cx}" cy="${n(cy)}" rx="${n(R * .45)}" ry="${n(R)}" ${st}/><ellipse cx="${cx}" cy="${n(cy)}" rx="${n(R)}" ry="${n(R * .32)}" ${st}/>` +
      `<path d="M${cx} ${n(cy - R)}V${n(cy + R)}" ${st}/>`;
  }
  if (sp.ring) s += `<ellipse cx="${cx}" cy="${n(cy)}" rx="${n(R * 1.38)}" ry="${n(R * .34)}" transform="rotate(-16 ${cx} ${n(cy)})" fill="none" stroke="${d.mH(sp.metal2 || 'gold')}" stroke-width="1.5"/>`;
  // «ладони» держателя
  s += `<path d="M${n(cx - R * .7)} ${n(cy + R * .72)}Q${cx} ${n(cy + R * 1.25)} ${n(cx + R * .7)} ${n(cy + R * .72)}" fill="none" stroke="${d.mH(m)}" stroke-width="1.6"/>` +
    `<ellipse cx="${n(cx - R * .38)}" cy="${n(cy - R * .42)}" rx="${n(R * .22)}" ry="${n(R * .13)}" transform="rotate(-35 ${n(cx - R * .38)} ${n(cy - R * .42)})" fill="#fff" opacity=".55"/>`;
  return s;
};

ARCH.star = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, colH = jit(r, 15, .2), R = jit(r, 12, .1), cy = top - colH - R * .55;
  let s = `<path d="M${n(cx - 4.5)} ${n(top)}H${n(cx + 4.5)}L${n(cx + 2.6)} ${n(top - colH)}H${n(cx - 2.6)}z" fill="${d.mH(sp.metal2 || m)}"/>` +
    `<path d="M${n(cx - 4.5)} ${n(top - 3)}H${n(cx + 4.5)}" stroke="#000" stroke-opacity=".3" stroke-width=".6"/>`;
  if (sp.ring) s += `<circle cx="${cx}" cy="${n(cy)}" r="${n(R * 1.18)}" fill="none" stroke="${d.mH(sp.metal2 || m)}" stroke-width="1.5"/>`;
  s += bevelStar(d, m, cx, cy, R, R * jit(r, .42, .1));
  if (sp.gem) s += `<circle cx="${cx}" cy="${n(cy)}" r="2" fill="${d.glassR(sp.gem)}"/>`;
  return s;
};

ARCH.shield = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, w = jit(r, 13, .1), y0 = jit(r, 12, .2), y1 = top - 8;
  const sh = `M${n(cx - w)} ${n(y0)}H${n(cx + w)}V${n(y0 + (y1 - y0) * .42)}C${n(cx + w)} ${n(y1 - 6)} ${n(cx + 5)} ${n(y1 - 2)} ${cx} ${n(y1)}C${n(cx - 5)} ${n(y1 - 2)} ${n(cx - w)} ${n(y1 - 6)} ${n(cx - w)} ${n(y0 + (y1 - y0) * .42)}z`;
  let s = `<path d="M${n(cx - 5)} ${n(top)}H${n(cx + 5)}L${n(cx + 2)} ${n(y1 - 2)}H${n(cx - 2)}z" fill="${d.mH(m)}"/>` +
    `<path d="${sh}" fill="${d.mH(m)}"/>`;
  const cl = d.clip(sh);
  s += `<g clip-path="${cl}"><rect x="${cx}" y="0" width="32" height="72" fill="#000" opacity=".16"/>` +
    (sp.field ? `<path d="M${n(cx - w)} ${n(y0 + 6)}L${cx} ${n(y0 + 14)}L${n(cx + w)} ${n(y0 + 6)}V${n(y0 + 11)}L${cx} ${n(y0 + 19)}L${n(cx - w)} ${n(y0 + 11)}z" fill="${d.enamel(sp.accent)}"/>` : '') + '</g>';
  s += `<path d="${sh}" fill="none" stroke="${d.mV(sp.metal2 || m)}" stroke-width="1.4"/>` +
    `<path d="${sh}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".45" transform="translate(${cx} ${n((y0 + y1) / 2)}) scale(.82) translate(${-cx} ${n(-(y0 + y1) / 2)})"/>`;
  s += icon(sp.emblem || 'star', cx, y0 + (y1 - y0) * .45, 10, `fill="${d.mV(sp.metal2 || m)}" stroke="#000" stroke-opacity=".3" stroke-width=".6"`);
  return s;
};

ARCH.plate = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, R = jit(r, 15.5, .08), cy = top - 2 - R;
  let s = `<path d="M${n(cx - 6)} ${n(top)}L${n(cx - 2)} ${n(cy + R * .4)}H${n(cx + 2)}L${n(cx + 6)} ${n(top)}z" fill="${d.mD('gunmetal')}"/>` +
    `<circle cx="${cx}" cy="${n(cy)}" r="${n(R)}" fill="${d.mR(m)}"/>` +
    `<circle cx="${cx}" cy="${n(cy)}" r="${n(R - .8)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".5"/>`;
  (sp.rings || [.78, .55]).forEach(k => { s += `<circle cx="${cx}" cy="${n(cy)}" r="${n(R * k)}" fill="none" stroke="#000" stroke-opacity=".28" stroke-width=".6"/><circle cx="${cx}" cy="${n(cy + .5)}" r="${n(R * k)}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width=".4"/>`; });
  if (sp.center === 'enamel') s += `<circle cx="${cx}" cy="${n(cy)}" r="${n(R * .36)}" fill="${d.enamel(sp.accent)}"/>`;
  s += icon(sp.emblem || 'star', cx, cy, R * .55, `fill="${d.mV(sp.metal2 || m)}" stroke="#000" stroke-opacity=".3" stroke-width=".7"`);
  if (sp.dots) for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; s += `<circle cx="${n(cx + Math.cos(a) * R * .89)}" cy="${n(cy + Math.sin(a) * R * .89)}" r=".55" fill="${METALS[m][3]}" opacity=".8"/>`; }
  return s;
};

ARCH.flame = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, yb = top;
  const rib = (x0, amp, h, w, mm, dark) => {
    const p = `M${n(x0 - w)} ${n(yb)}C${n(x0 - w - amp * .2)} ${n(yb - h * .4)} ${n(x0 + amp * 1.2)} ${n(yb - h * .62)} ${n(x0 + amp)} ${n(yb - h)}C${n(x0 + amp * .55)} ${n(yb - h * .6)} ${n(x0 + w + amp * .15)} ${n(yb - h * .4)} ${n(x0 + w)} ${n(yb)}z`;
    return `<path d="${p}" fill="${dark ? d.mD(mm) : d.mH(mm)}"/>`;
  };
  if (sp.variant === 'bolt') {
    const h = jit(r, 48, .1), w = jit(r, 9, .15), y = yb - h;
    const p = `M${n(cx + w * .2)} ${n(y)}L${n(cx - w)} ${n(y + h * .55)}H${n(cx - w * .05)}L${n(cx - w * .6)} ${n(yb)}L${n(cx + w)} ${n(y + h * .4)}H${n(cx + w * .05)}z`;
    return `<path d="${p}" fill="${d.mH(m)}"/><path d="M${n(cx + w * .2)} ${n(y)}L${n(cx - w)} ${n(y + h * .55)}" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>` +
      `<path d="${p}" fill="none" stroke="${d.mD(m)}" stroke-width=".6"/>`;
  }
  return rib(cx - 5, -jit(r, 6, .3), jit(r, 36, .12), 3.4, sp.metal2 || m, true) +
    rib(cx + 5, jit(r, 7, .3), jit(r, 40, .12), 3.4, sp.metal2 || m, true) +
    rib(cx, jit(r, 3, .8), jit(r, 52, .08), 4.6, m, false) +
    `<path d="M${n(cx - 1.5)} ${n(yb - 4)}C${n(cx - 2)} ${n(yb - 20)} ${cx} ${n(yb - 34)} ${n(cx + 1)} ${n(yb - 44)}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".8"/>`;
};

ARCH.ingot = (d, r, sp, top) => {
  const m = sp.metal;
  const bar = (x, y, w) => {
    const h = 5.2, dpt = 3, k = 2.2;
    return `<path d="M${n(x + k)} ${n(y - h)}H${n(x + w - k)}L${n(x + w - k + dpt)} ${n(y - h - dpt)}H${n(x + k + dpt)}z" fill="${d.mV(m)}"/>` +
      `<path d="M${n(x)} ${n(y)}H${n(x + w)}L${n(x + w - k)} ${n(y - h)}H${n(x + k)}z" fill="${d.mH(m)}"/>` +
      `<path d="M${n(x + w)} ${n(y)}L${n(x + w + dpt)} ${n(y - dpt)}L${n(x + w - k + dpt)} ${n(y - h - dpt)}L${n(x + w - k)} ${n(y - h)}z" fill="${d.mD(m)}"/>` +
      `<rect x="${n(x + w * .32)}" y="${n(y - h * .7)}" width="${n(w * .36)}" height="1.3" fill="#000" opacity=".22"/>`;
  };
  const w = jit(r, 17, .08);
  let s = bar(32 - w - 1.5, top, w) + bar(32 + 1.5, top, w) + bar(32 - w / 2 + 1, top - 5.6, w);
  if (sp.variant === 'tall') s += bar(32 - w / 2 - 1, top - 11.2, w) + (sp.gem ? '' : '');
  if (sp.coin) s += `<ellipse cx="${n(32 + w * .9)}" cy="${n(top - 9)}" rx="4.4" ry="4.4" fill="${d.mR(sp.metal2 || m)}"/>` + bevelStar(d, sp.metal2 || m, 32 + w * .9, top - 9, 2.6, 1.1);
  return s;
};

ARCH.crown = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, v = sp.velvet || '#8e1f2c';
  const cush = `M${n(cx - 17)} ${n(top - 1)}C${n(cx - 19)} ${n(top - 9)} ${n(cx + 19)} ${n(top - 9)} ${n(cx + 17)} ${n(top - 1)}C${n(cx + 10)} ${n(top + 1)} ${n(cx - 10)} ${n(top + 1)} ${n(cx - 17)} ${n(top - 1)}z`;
  let s = `<path d="${cush}" fill="${d.rg('vel' + v, .45, .3, .8, [[0, lighten(v, .35)], [.6, v], [1, darken(v, .5)]])}"/>` +
    `<circle cx="${n(cx - 17)}" cy="${n(top - 1)}" r="1.4" fill="${d.mR('gold')}"/><circle cx="${n(cx + 17)}" cy="${n(top - 1)}" r="1.4" fill="${d.mR('gold')}"/>`;
  const by = top - 6.5, bh = 5.5, w = jit(r, 13, .08), ph = jit(r, 13, .15);
  const pts = sp.points || 5;
  let crown = `M${n(cx - w)} ${n(by)}`;
  for (let i = 0; i <= pts * 2; i++) {
    const x = cx - w + (2 * w) * i / (pts * 2), y = i % 2 ? by - bh - ph * .45 : by - bh - ph;
    crown += `L${n(x)} ${n(y)}`;
  }
  crown += `L${n(cx + w)} ${n(by)}z`;
  s += `<path d="${crown}" fill="${d.mH(m)}"/>` +
    `<rect x="${n(cx - w)}" y="${n(by - bh)}" width="${n(2 * w)}" height="${n(bh)}" fill="${d.mH(m)}"/>` +
    `<path d="M${n(cx - w)} ${n(by - bh)}H${n(cx + w)}" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>`;
  for (let i = 0; i <= pts * 2; i += 2) {
    const x = cx - w + (2 * w) * i / (pts * 2);
    s += `<circle cx="${n(x)}" cy="${n(by - bh - ph)}" r="1.3" fill="${d.mR(sp.metal2 || 'palegold')}"/>`;
  }
  [-.55, 0, .55].forEach((k, i) => { const g = i === 1 ? sp.gem : sp.gem2; s += `<circle cx="${n(cx + w * k)}" cy="${n(by - bh / 2)}" r="${i === 1 ? 1.9 : 1.3}" fill="${d.glassR(g)}"/>`; });
  return s;
};

ARCH.award = (d, r, sp, top) => { // личная награда: стеклянная пластина с гравировкой на подставке
  const cx = 32, t = sp.glass, w = 12, y0 = jit(r, 7, .1), y1 = top - .5;
  const plate = `M${n(cx - w)} ${n(y0 + 3)}Q${n(cx - w)} ${n(y0)} ${n(cx - w + 3)} ${n(y0)}H${n(cx + w - 3)}Q${n(cx + w)} ${n(y0)} ${n(cx + w)} ${n(y0 + 3)}V${n(y1)}H${n(cx - w)}z`;
  let s = `<path d="${plate}" fill="${d.glassA(t)}" stroke="#fff" stroke-opacity=".55" stroke-width=".6"/>` +
    `<path d="M${n(cx + w * .25)} ${n(y0)}H${n(cx + w - 3)}Q${n(cx + w)} ${n(y0)} ${n(cx + w)} ${n(y0 + 3)}V${n(y1)}H${n(cx + w * .25)}z" fill="${d.glassB(t)}" opacity=".7"/>` +
    `<path d="M${n(cx - w + 2)} ${n(y0 + 4)}L${n(cx - w + 2)} ${n(y1 - 3)}" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/>`;
  s += icon(sp.emblem || 'star', cx, y0 + 16, 17, `fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`);
  s += `<rect x="${n(cx - 7)}" y="${n(y0 + 30)}" width="14" height="1.1" fill="#fff" opacity=".55"/><rect x="${n(cx - 5)}" y="${n(y0 + 33.5)}" width="10" height=".9" fill="#fff" opacity=".4"/>`;
  return s;
};


/* v30: новые силуэты — широкая чаша, обелиск, геометрический многогранник, щит-корона академий */
ARCH.bowl = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, W = jit(r, sp.big ? 42 : 38, .06), D = jit(r, 11, .15), stem = jit(r, 6, .2), by = top - 3 - stem - D;
  let s = `<path d="M${n(cx - 6)} ${n(top)}H${n(cx + 6)}L${n(cx + 2)} ${n(top - 3)}H${n(cx - 2)}z" fill="${d.mH(m)}"/>` +
    `<rect x="${n(cx - 1.6)}" y="${n(by + D - .5)}" width="3.2" height="${n(stem + 1)}" fill="${d.mH(m)}"/>`;
  s += `<path d="M${n(cx - W / 2)} ${n(by)}Q${n(cx - W * .42)} ${n(by + D)} ${cx} ${n(by + D)}Q${n(cx + W * .42)} ${n(by + D)} ${n(cx + W / 2)} ${n(by)}z" fill="${d.mH(m)}"/>` +
    `<ellipse cx="${cx}" cy="${n(by)}" rx="${n(W / 2)}" ry="${n(D * .26)}" fill="${d.mD(m)}"/>` +
    `<ellipse cx="${cx}" cy="${n(by)}" rx="${n(W / 2 - 1.4)}" ry="${n(D * .2)}" fill="#000" opacity=".28"/>`;
  if (sp.band) s += `<path d="M${n(cx - W * .36)} ${n(by + D * .45)}Q${cx} ${n(by + D * .7)} ${n(cx + W * .36)} ${n(by + D * .45)}" fill="none" stroke="${d.enamel(sp.accent)}" stroke-width="1.6"/>`;
  if (sp.engr) for (let i = -2; i <= 2; i++) s += `<path d="M${n(cx + i * W * .14)} ${n(by + D * .2)}v${n(D * .45)}" stroke="#fff" stroke-opacity=".18" stroke-width=".5"/>`;
  if (sp.emblem) s += bevelStar(d, sp.metal2 || m, cx, by + D * .55, 2.6, 1.1);
  return s;
};
ARCH.obelisk = (d, r, sp, top) => {
  const cx = 32, m = sp.metal, H = jit(r, sp.big ? 44 : 38, .08), w = jit(r, 8, .12), y0 = top - 2;
  let s = `<path d="M${n(cx - w)} ${n(y0)}L${n(cx - w * .55)} ${n(y0 - H)}L${cx} ${n(y0 - H - 6)}L${n(cx + w * .55)} ${n(y0 - H)}L${n(cx + w)} ${n(y0)}z" fill="${d.mH(m)}"/>` +
    `<path d="M${cx} ${n(y0 - H - 6)}L${n(cx + w * .55)} ${n(y0 - H)}L${n(cx + w)} ${n(y0)}H${cx}z" fill="${d.mD(m)}" opacity=".55"/>`;
  const bands = sp.facets ? 3 : 2;
  for (let i = 1; i <= bands; i++) { const y = y0 - H * i / (bands + 1), k = 1 - (i / (bands + 1)) * .45; s += `<rect x="${n(cx - w * k)}" y="${n(y)}" width="${n(w * k * 2)}" height="1.4" fill="${d.mH(sp.bandMetal || sp.metal2 || 'gold')}"/>`; }
  if (sp.gemTop) s += `<circle cx="${cx}" cy="${n(y0 - H - 2.5)}" r="1.8" fill="${d.glassR(sp.gem)}"/>`;
  if (sp.emblem) s += bevelStar(d, sp.metal2 || m, cx, y0 - H * .3, 3, 1.3);
  return s;
};
ARCH.poly = (d, r, sp, top) => { // геометрический многогранник (стекло или металл) на шпиле
  const cx = 32, R = jit(r, 12.5, .08), cy = top - 9 - R, g = sp.glass, glass = !!sp.glassOrb || sp.variant === 'glass';
  let s = `<path d="M${n(cx - 2)} ${n(top)}H${n(cx + 2)}L${n(cx + 1)} ${n(cy + R * .8)}H${n(cx - 1)}z" fill="${d.mH(sp.metal)}"/>` +
    `<path d="M${n(cx - 7)} ${n(top)}H${n(cx + 7)}L${n(cx + 4)} ${n(top - 2.5)}H${n(cx - 4)}z" fill="${d.mH(sp.metal)}"/>`;
  const pts = [[0, -1], [.87, -.5], [.87, .5], [0, 1], [-.87, .5], [-.87, -.5]].map(([x, y]) => [cx + x * R, cy + y * R]);
  const P = i => `${n(pts[i % 6][0])} ${n(pts[i % 6][1])}`;
  const fA = glass ? d.glassA(g) : d.mV(sp.metal), fB = glass ? d.glassB(g) : d.mD(sp.metal);
  for (let i = 0; i < 6; i++) s += `<path d="M${cx} ${n(cy)}L${P(i)}L${P(i + 1)}z" fill="${i % 2 ? fA : fB}" ${glass ? 'opacity=".92"' : ''}/>`;
  s += `<path d="M${P(0)}L${P(1)}L${P(2)}L${P(3)}L${P(4)}L${P(5)}z" fill="none" stroke="${d.mH(sp.frame || sp.metal2 || 'silver')}" stroke-width="1"/>`;
  if (sp.core) s += `<circle cx="${cx}" cy="${n(cy)}" r="${n(R * .28)}" fill="${d.glassR(sp.coreTint)}"/>`;
  return s;
};
ARCH.crest = (d, r, sp, top) => { // академическая награда: щит с лавровой дугой
  const cx = 32, m = sp.metal, W = jit(r, 20, .08), H = jit(r, 24, .08), y = top - 4;
  let s = `<rect x="${n(cx - 1.5)}" y="${n(y - 4)}" width="3" height="4" fill="${d.mH(m)}"/>` +
    `<path d="M${n(cx - W / 2)} ${n(y - 4 - H)}H${n(cx + W / 2)}V${n(y - 4 - H * .45)}Q${n(cx + W / 2)} ${n(y - 6)} ${cx} ${n(y - 4)}Q${n(cx - W / 2)} ${n(y - 6)} ${n(cx - W / 2)} ${n(y - 4 - H * .45)}z" fill="${d.enamel(sp.accent)}" stroke="${d.mH(m)}" stroke-width="1.6"/>`;
  for (let i = 0; i < 5; i++) { const a = Math.PI * (.62 + i * .09), rr = W * .78; s += `<ellipse cx="${n(cx + Math.cos(a) * rr)}" cy="${n(y - 4 - H * .5 + Math.sin(a) * rr * .5)}" rx="2.2" ry=".9" transform="rotate(${n(a * 57 - 60)} ${n(cx + Math.cos(a) * rr)} ${n(y - 4 - H * .5 + Math.sin(a) * rr * .5)})" fill="${d.mH(m)}"/>`;
    const b = Math.PI * (.38 - i * .09); s += `<ellipse cx="${n(cx + Math.cos(b) * rr)}" cy="${n(y - 4 - H * .5 + Math.sin(b) * rr * .5)}" rx="2.2" ry=".9" transform="rotate(${n(b * 57 + 60)} ${n(cx + Math.cos(b) * rr)} ${n(y - 4 - H * .5 + Math.sin(b) * rr * .5)})" fill="${d.mH(m)}"/>`; }
  s += bevelStar(d, sp.metal2 || 'gold', cx, y - 4 - H * .55, 4.2, 1.8);
  return s;
};

/* v33: ещё восемь форм */
ARCH.regal = (d, r, sp, top) => { // корона на подушке-постаменте (v33; «crown» занят наградой «Команда года»)
  const cx = 32, m = sp.metal, W = jit(r, sp.big ? 34 : 30, .06), H = jit(r, 15, .12), y = top - 8;
  let s = `<path d="M${n(cx - 8)} ${n(top)}H${n(cx + 8)}L${n(cx + 5)} ${n(top - 3)}H${n(cx - 5)}z" fill="${d.mH(m)}"/>` +
    `<ellipse cx="${cx}" cy="${n(top - 5.2)}" rx="${n(W * .42)}" ry="3.2" fill="${d.enamel(sp.accent)}"/>`;
  const pk = 5, pts = [];
  for (let i = 0; i <= pk * 2; i++) { const x = cx - W / 2 + W * i / (pk * 2), up = i % 2 === 0; pts.push(`${n(x)} ${n(up ? y - H - (i === pk ? 4 : 0) : y - H * .45)}`); }
  s += `<path d="M${n(cx - W / 2)} ${n(y)}L${pts.join('L')}L${n(cx + W / 2)} ${n(y)}z" fill="${d.mH(m)}"/>` +
    `<path d="M${cx} ${n(y)}L${pts.slice(pk).join('L')}L${n(cx + W / 2)} ${n(y)}z" fill="${d.mD(m)}" opacity=".45"/>` +
    `<rect x="${n(cx - W / 2)}" y="${n(y - 3.4)}" width="${n(W)}" height="3.4" fill="${d.mD(m)}"/>`;
  for (let i = 0; i <= pk * 2; i += 2) { const x = cx - W / 2 + W * i / (pk * 2); s += `<circle cx="${n(x)}" cy="${n(y - H - (i === pk ? 4 : 0) - 1)}" r="${i === pk ? 2 : 1.4}" fill="${i === pk ? d.glassR(sp.gem) : d.mR(sp.metal2 || m)}"/>`; }
  for (let i = -2; i <= 2; i++) s += `<circle cx="${n(cx + i * W * .18)}" cy="${n(y - 1.7)}" r="1" fill="${d.glassR(i % 2 ? sp.gem2 : sp.gem)}"/>`;
  return s;
};
ARCH.globe = (d, r, sp, top) => { // глобус с меридианами на ножке
  const cx = 32, m = sp.metal, R = jit(r, sp.big ? 15 : 13, .06), cy = top - 7 - R;
  let s = `<path d="M${n(cx - 7)} ${n(top)}H${n(cx + 7)}L${n(cx + 2.2)} ${n(top - 5)}H${n(cx - 2.2)}z" fill="${d.mH(m)}"/>` +
    `<circle cx="${cx}" cy="${n(cy)}" r="${n(R)}" fill="${sp.glassOrb ? d.glassR(sp.glass) : d.mR(m)}"/>`;
  for (const k of [.35, .7]) s += `<ellipse cx="${cx}" cy="${n(cy)}" rx="${n(R * k)}" ry="${n(R)}" fill="none" stroke="${d.mD(sp.metal2 || m)}" stroke-width=".7" opacity=".8"/>`;
  for (const k of [-.5, 0, .5]) s += `<ellipse cx="${cx}" cy="${n(cy + R * k)}" rx="${n(R * Math.sqrt(1 - k * k))}" ry="${n(R * .18)}" fill="none" stroke="${d.mD(sp.metal2 || m)}" stroke-width=".7" opacity=".8"/>`;
  s += `<path d="M${n(cx - R - 2.5)} ${n(cy + 3)}A${n(R + 2.5)} ${n(R + 2.5)} 0 0 0 ${n(cx + R + 2.5)} ${n(cy + 3)}" fill="none" stroke="${d.mH(sp.frame || sp.metal2 || 'gold')}" stroke-width="1.6"/>` +
    `<ellipse cx="${n(cx - R * .35)}" cy="${n(cy - R * .4)}" rx="${n(R * .3)}" ry="${n(R * .16)}" transform="rotate(-30 ${n(cx - R * .35)} ${n(cy - R * .4)})" fill="#fff" opacity=".35"/>`;
  return s;
};
ARCH.laurel = (d, r, sp, top) => { // лавровый венок вокруг звезды
  const cx = 32, m = sp.metal, R = jit(r, 14, .06), cy = top - 6 - R;
  let s = `<rect x="${n(cx - 1.5)}" y="${n(cy + R - 1)}" width="3" height="${n(top - cy - R + 1)}" fill="${d.mH(m)}"/>` +
    `<path d="M${n(cx - 6)} ${n(top)}H${n(cx + 6)}L${n(cx + 3)} ${n(top - 2.5)}H${n(cx - 3)}z" fill="${d.mH(m)}"/>`;
  for (let side of [-1, 1]) for (let i = 0; i < 8; i++) {
    const a = Math.PI / 2 + side * (0.35 + i * 0.32), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="3" ry="1.2" transform="rotate(${n(a * 57.3 + side * 55)} ${n(x)} ${n(y)})" fill="${i % 2 ? d.mH(m) : d.mD(m)}"/>`;
  }
  s += bevelStar(d, sp.metal2 || m, cx, cy, R * .55, R * .23);
  return s;
};
ARCH.column = (d, r, sp, top) => { // колонна с капителью и сферой
  const cx = 32, m = sp.metal, H = jit(r, sp.big ? 30 : 26, .08), w = jit(r, 5.2, .1), y0 = top - 1.5;
  let s = `<rect x="${n(cx - w - 2)}" y="${n(y0 - 2.4)}" width="${n(w * 2 + 4)}" height="2.4" fill="${d.mD(m)}"/>` +
    `<rect x="${n(cx - w)}" y="${n(y0 - 2.4 - H)}" width="${n(w * 2)}" height="${n(H)}" fill="${d.mH(m)}"/>`;
  for (let i = -2; i <= 2; i++) s += `<path d="M${n(cx + i * w * .38)} ${n(y0 - 2.4 - H + 1)}v${n(H - 2)}" stroke="${d.mD(m)}" stroke-width=".7" opacity=".7"/>`;
  s += `<rect x="${n(cx - w - 2.4)}" y="${n(y0 - 5 - H)}" width="${n(w * 2 + 4.8)}" height="2.8" rx=".6" fill="${d.mD(m)}"/>` +
    `<circle cx="${cx}" cy="${n(y0 - 5 - H - 6)}" r="6" fill="${sp.glassOrb ? d.glassR(sp.glass) : d.mR(sp.metal2 || m)}"/>`;
  if (sp.emblem) s += bevelStar(d, sp.metal2 || m, cx, y0 - 2.4 - H * .5, 3.2, 1.3);
  return s;
};
ARCH.wings = (d, r, sp, top) => { // крылья, поднятые над сферой
  const cx = 32, m = sp.metal, W = jit(r, sp.big ? 21 : 18, .08), cy = top - 14;
  let s = `<path d="M${n(cx - 6)} ${n(top)}H${n(cx + 6)}L${n(cx + 2)} ${n(top - 4)}H${n(cx - 2)}z" fill="${d.mH(m)}"/>` +
    `<rect x="${n(cx - 1.2)}" y="${n(cy)}" width="2.4" height="${n(top - cy - 3.5)}" fill="${d.mH(m)}"/>`;
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const len = W * (1 - i * .14), ang = (-70 + i * 16) * Math.PI / 180, x2 = cx + side * Math.cos(ang) * len, y2 = cy + Math.sin(ang) * len;
    s += `<path d="M${cx} ${n(cy)}Q${n(cx + side * len * .55)} ${n(cy + Math.sin(ang) * len * .3 - 3)} ${n(x2)} ${n(y2)}L${n(x2 - side * 2.2)} ${n(y2 + 2.6)}Q${n(cx + side * len * .45)} ${n(cy + 1)} ${cx} ${n(cy + 2)}z" fill="${side < 0 ? d.mH(m) : d.mD(m)}" opacity="${1 - i * .1}"/>`;
  }
  s += `<circle cx="${cx}" cy="${n(cy)}" r="3.6" fill="${d.glassR(sp.gem)}"/>`;
  return s;
};
ARCH.hoop = (d, r, sp, top) => { // вертикальное кольцо с камнем
  const cx = 32, m = sp.metal, R = jit(r, 14, .07), cy = top - 5 - R, t = jit(r, 4.2, .15);
  let s = `<path d="M${n(cx - 8)} ${n(top)}H${n(cx + 8)}L${n(cx + 4)} ${n(top - 4)}H${n(cx - 4)}z" fill="${d.mH(m)}"/>` +
    `<circle cx="${cx}" cy="${n(cy)}" r="${n(R)}" fill="none" stroke="${d.mD(m)}" stroke-width="${n(t + 1)}"/>` +
    `<circle cx="${cx}" cy="${n(cy)}" r="${n(R)}" fill="none" stroke="${d.mH(m)}" stroke-width="${n(t)}"/>` +
    `<path d="M${n(cx - R * .7)} ${n(cy - R * .7)}A${n(R)} ${n(R)} 0 0 1 ${n(cx + R * .2)} ${n(cy - R)}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1"/>`;
  s += sp.gemTop || sp.core ? `<circle cx="${cx}" cy="${n(cy)}" r="${n(R * .42)}" fill="${d.glassR(sp.coreTint || sp.gem)}"/>` : bevelStar(d, sp.metal2 || m, cx, cy, R * .5, R * .2);
  return s;
};
ARCH.helix = (d, r, sp, top) => { // закрученный шпиль из двух лент
  const cx = 32, m = sp.metal, H = jit(r, sp.big ? 46 : 40, .06), y0 = top - 2, w = jit(r, 7, .1), turns = 2.2;
  let s = `<path d="M${n(cx - 6)} ${n(top)}H${n(cx + 6)}L${n(cx + 3)} ${n(top - 2.5)}H${n(cx - 3)}z" fill="${d.mH(m)}"/>`;
  for (const ph of [0, Math.PI]) {
    let path = ''; for (let i = 0; i <= 40; i++) { const k = i / 40, a = ph + k * turns * Math.PI * 2, x = cx + Math.sin(a) * w * (1 - k * .75), y = y0 - k * H; path += (i ? 'L' : 'M') + n(x) + ' ' + n(y); }
    s += `<path d="${path}" fill="none" stroke="${ph ? d.mD(m) : d.mH(m)}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  s += `<circle cx="${cx}" cy="${n(y0 - H - 2)}" r="2.6" fill="${d.glassR(sp.gem)}"/>`;
  return s;
};
ARCH.gem = (d, r, sp, top) => { // огранённый камень в лапках
  const cx = 32, W = jit(r, sp.big ? 26 : 23, .06), Hc = W * .32, Hp = W * .62, gy = top - 6 - Hp, g = sp.glass, m = sp.metal;
  let s = `<path d="M${n(cx - 7)} ${n(top)}H${n(cx + 7)}L${n(cx + 3)} ${n(top - 4)}H${n(cx - 3)}z" fill="${d.mH(m)}"/>`;
  const L = cx - W / 2, Rt = cx + W / 2, T = gy - Hc, B = gy + Hp;
  const facets = [[`${n(L)} ${n(gy)}`, `${n(cx - W * .25)} ${n(T)}`, `${n(cx)} ${n(gy)}`], [`${n(cx)} ${n(gy)}`, `${n(cx - W * .25)} ${n(T)}`, `${n(cx + W * .25)} ${n(T)}`], [`${n(cx)} ${n(gy)}`, `${n(cx + W * .25)} ${n(T)}`, `${n(Rt)} ${n(gy)}`],
    [`${n(L)} ${n(gy)}`, `${n(cx)} ${n(gy)}`, `${n(cx)} ${n(B)}`], [`${n(cx)} ${n(gy)}`, `${n(Rt)} ${n(gy)}`, `${n(cx)} ${n(B)}`]];
  facets.forEach((f, i) => { s += `<path d="M${f.join('L')}z" fill="${i % 2 ? d.glassA(g) : d.glassB(g)}" opacity=".95"/>`; });
  s += `<path d="M${n(L)} ${n(gy)}L${n(cx - W * .25)} ${n(T)}H${n(cx + W * .25)}L${n(Rt)} ${n(gy)}L${n(cx)} ${n(B)}z" fill="none" stroke="${d.mH(sp.frame || 'silver')}" stroke-width=".9"/>`;
  for (const k of [-1, 1]) s += `<path d="M${n(cx + k * 3)} ${n(top - 4)}L${n(cx + k * W * .3)} ${n(gy + Hp * .45)}" stroke="${d.mH(m)}" stroke-width="1.6"/>`;
  return s;
};

/* ------------------------------------------- серии турниров (формы) */
// Форма серии — по названию (без логотипов и надписей брендов). Металл и детали — по сезону.
const FAMILIES = [
  // Major: узнаваемая форма по организатору; внутри серии чашки близкие, но каждый розыгрыш отличается деталями.
  [/^PGL.*major/i,                         { arch: ['spire', 'obelisk'], metals: ['gold', 'palegold'], variants: ['single', 'twin'], big: true }],
  [/^(?:BLAST(?:\.tv)?\s+).*major/i,    { arch: ['prism'], glass: ['ice', 'blue', 'violet'], frame: ['gold', 'silver'], variants: ['single', 'twin', 'trio'], big: true }],
  [/^(?:IEM|Intel Extreme).*major/i,        { arch: ['chalice', 'cup'], metals: ['gold', 'palegold'], handles: ['angular', 'wing'], big: true }],
  [/^Perfect World.*major|^CS Asia.*major/i,{ arch: ['orb', 'bowl'], metals: ['gold', 'palegold'], glass: ['blue', 'cyan'], big: true }],
  [/^StarLadder.*major/i,                   { arch: ['star', 'column'], metals: ['gold', 'palegold'], emblem: 'star', big: true }],
  [/^ESL.*major/i,                          { arch: ['shield', 'plate'], metals: ['gold', 'palegold'], emblem: 'laurel', big: true }],
  // Внутри организатора: одна визуальная семья, но индивидуальная отделка для каждого турнира.
  [/^BLAST/i,                               { arch: ['prism'], glass: ['ice', 'blue', 'violet', 'smoke', 'cyan'], frame: ['silver', 'chrome', 'gold'], variants: ['single', 'twin', 'inv', 'trio'] }],
  [/^PGL/i,                                 { arch: ['spire', 'obelisk'], metals: ['chrome', 'silver', 'gunmetal', 'gold'], variants: ['single', 'twin'] }],
  [/^IEM|^ESL/i,                            { arch: ['chalice', 'cup', 'shield'], metals: ['silver', 'chrome', 'gold'], handles: ['none', 'angular', 'wing'] }],
  [/^StarLadder|^StarSeries/i,              { arch: ['star', 'column'], metals: ['gold', 'silver', 'rose'], emblem: 'star' }],
  [/^Perfect World|^CS Asia/i,              { arch: ['orb', 'bowl'], metals: ['silver', 'gold', 'chrome'], glass: ['blue', 'ice', 'cyan'] }],
  // v33: шоу-турниры, сборные, Grand Slam и новые формы для серий
  [/grand slam/i,                              { arch: ['ingot'], metals: ['gold'], variants: ['tall'], big: true }],
  [/nations|national cup|сборн/i,              { arch: ['globe', 'laurel'], metals: ['gold', 'palegold'], glass: ['blue', 'cyan'], big: true }],
  [/streamer|стример|showmatch|all-?star|шоу/i, { arch: ['regal', 'wings', 'hoop'], metals: ['gold', 'rose', 'chrome'] }],
  [/kazakhstan|baltic|balkan/i,                { arch: ['laurel', 'column'], metals: ['silver', 'gold', 'bronze'] }],
  [/skyesports|united21|thunderpick regional|pinnacle/i, { arch: ['helix', 'gem', 'hoop'], metals: ['chrome', 'silver', 'gold'], glass: ['violet', 'cyan', 'ruby'] }],
  [/esl pro league playoffs|playoffs/i,        { arch: ['column', 'shield'], metals: ['silver', 'gold'] }],
  [/fissure|playground/i,                      { arch: ['flame', 'helix'], metals: ['copper', 'gold', 'rose'], variants: ['flame'] }],
  [/regional lan finals|lan finals/i,          { arch: ['globe', 'gem'], metals: ['silver', 'chrome'], glass: ['blue', 'mint'] }],
  [/future stars|rookie clash|prospects|rising/i, { arch: ['wings', 'laurel', 'star'], metals: ['bronze', 'silver', 'copper'], small: true }],
  // v30: серии расширенного календаря (идут раньше общих правил)
  [/championship finals/i,                     { arch: ['obelisk'], metals: ['gold', 'palegold'], big: true, emblem: 'star' }],
  [/esports world cup|ewc/i,                   { arch: ['poly'], glass: ['amber', 'ice'], frame: ['gold'], variants: ['glass'], big: true }],
  [/cs asia|asia championships|chengdu/i,       { arch: ['bowl'], metals: ['gold', 'rose', 'palegold'] }],
  [/elisa|nordic/i,                            { arch: ['bowl'], metals: ['silver', 'chrome'] }],
  [/yalla|compass/i,                           { arch: ['poly'], glass: ['amber', 'mint'], frame: ['gold', 'silver'], variants: ['glass'] }],
  [/tipsport|prague|czech/i,                   { arch: ['bowl', 'plate'], metals: ['silver', 'gunmetal'] }],
  [/\bres\b|regional european|latin american series/i, { arch: ['obelisk'], metals: ['chrome', 'silver', 'gunmetal'] }],
  [/challenger league|esl challenger/i,        { arch: ['shield'], metals: ['chrome', 'gunmetal'] }],
  [/pgl masters/i,                             { arch: ['obelisk', 'spire'], metals: ['chrome', 'gold'] }],
  [/qualifier|квалиф/i,                        { arch: ['plate'], metals: ['bronze', 'gunmetal'], small: true }],
  [/online cup|weekly|cup series|lan cup/i,    { arch: ['star', 'cup'], metals: ['bronze', 'copper', 'silver'], small: true }],
  [/championship$|national|чемпионат|polish|brazilian|german pro|uk masters|ukrainian cup|kazakhstan|turkish masters|iberian|baltic|balkan/i, { arch: ['bowl', 'crest', 'shield'], metals: ['silver', 'bronze', 'gold'] }],
  [/\b(?:academy|young talents|prodigy|junior|nxt|ares|youth)\b/i, { arch: ['crest', 'star'], metals: ['bronze', 'silver', 'copper'], small: true }],
  [/major/i,                                   { arch: ['cup'], metals: ['gold', 'gold', 'palegold'], big: true, emblem: 'star', handles: ['loop', 'wing'] }],
  [/blast/i,                                   { arch: ['prism'], glass: ['ice', 'blue', 'violet', 'smoke', 'cyan'], frame: ['silver', 'chrome', 'gold', null], variants: ['single', 'twin', 'inv', 'trio'] }],
  [/\biem\b|intel extreme/i,                   { arch: ['chalice', 'cup'], metals: ['silver', 'chrome', 'gold'], handles: ['none', 'angular'] }],
  [/esl|epl|pro league/i,                      { arch: ['shield', 'plate'], metals: ['silver', 'gunmetal', 'gold', 'chrome'] }],
  [/pgl/i,                                     { arch: ['spire'], metals: ['chrome', 'silver', 'gunmetal', 'gold'], variants: ['single', 'twin'] }],
  [/starladder|starseries|i-league/i,         { arch: ['star'], metals: ['gold', 'silver', 'rose'] }],
  [/dreamhack/i,                               { arch: ['chalice'], metals: ['silver', 'rose', 'gold'] }],
  [/thunderpick|thunder|storm|volt/i,          { arch: ['flame'], metals: ['gold', 'chrome', 'silver'], variants: ['bolt'] }],
  [/fissure|fire|blaze|inferno|flame/i,        { arch: ['flame'], metals: ['copper', 'gold', 'bronze', 'rose'], variants: ['flame'] }],
  [/cct|world|global|continental|cup of nations|perfect world/i, { arch: ['orb'], metals: ['silver', 'gold', 'chrome'], glass: ['blue', 'ice', 'cyan'] }],
  [/betboom|dacha|mountain|peak|summit/i,      { arch: ['prism'], glass: ['mint', 'ice', 'cyan', 'smoke'], frame: ['gold', 'silver'], variants: ['twin', 'trio'] }],
  [/elisa|nordic|plate|masters/i,              { arch: ['plate'], metals: ['silver', 'chrome', 'palegold'] }],
  [/bounty|roobet|cash|money|bet\b|stake/i,    { arch: ['ingot'], metals: ['gold', 'palegold'], variants: ['flat', 'tall'] }],
  [/\b(?:academy|junior|nxt|ares|youth|rookie)\b/i,    { arch: ['cup', 'chalice', 'star'], metals: ['bronze', 'silver', 'copper'], small: true }],
  [/rookie|open|amateur|novice|underground|grassroots|entry|rising|future|prospects|young/i, { arch: ['cup', 'star', 'shield'], metals: ['bronze', 'copper', 'silver'] }]
];

// Самостоятельная медаль/монета без классического кубкового постамента.
ARCH.coin = (d, r, sp, top) => {
  const cx = 32, cy = top - 25.5, R = jit(r, 18.5, .045), m = sp.metal;
  let s = `<circle cx="${cx}" cy="${n(cy)}" r="${n(R + 2.3)}" fill="${d.mD('gunmetal')}"/>` +
    `<circle cx="${cx}" cy="${n(cy)}" r="${n(R + 1.5)}" fill="${d.mH(sp.metal2 || m)}"/>` +
    `<circle cx="${cx}" cy="${n(cy)}" r="${n(R)}" fill="${d.mR(m)}"/>` +
    `<circle cx="${cx}" cy="${n(cy)}" r="${n(R - 2.4)}" fill="${d.enamel(sp.accent)}" stroke="${d.mV(sp.metal2 || m)}" stroke-width=".9"/>` +
    `<circle cx="${cx}" cy="${n(cy)}" r="${n(R - 5.2)}" fill="none" stroke="#fff" stroke-opacity=".36" stroke-width=".65"/>`;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, x1 = cx + Math.cos(a) * (R - 1.1), y1 = cy + Math.sin(a) * (R - 1.1);
    const x2 = cx + Math.cos(a) * (R + .7), y2 = cy + Math.sin(a) * (R + .7);
    s += `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="#fff" stroke-opacity=".65" stroke-width=".7"/>`;
  }
  s += icon(sp.emblem || 'star', cx, cy, 16, `fill="${d.mV(sp.metal2 || m)}" stroke="${d.mD(m)}" stroke-width=".8"`);
  if (sp.orgText) s += `<text x="32" y="${n(cy + R - 5.1)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="3.5" font-weight="900" letter-spacing=".35" fill="#fff" stroke="#000" stroke-opacity=".3" stroke-width=".25" paint-order="stroke">${sp.orgText}</text>`;
  s += `<path d="M${n(cx - 10)} ${n(cy - 12)}Q${cx} ${n(cy - 19)} ${n(cx + 7)} ${n(cy - 12)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1" stroke-linecap="round"/>`;
  return s;
};

// Лаконичная эмблема организатора: небольшой знак с фирменным цветом вместо ещё одного кубка.
ARCH.logo = (d, r, sp, top) => {
  const cx = 32, cy = top - 26, m = sp.metal, w = jit(r, 18.5, .05), h = jit(r, 20, .05);
  const path = `M${cx} ${n(cy - h)}L${n(cx + w)} ${n(cy - 5)}L${n(cx + w * .72)} ${n(cy + h * .72)}L${cx} ${n(cy + h)}L${n(cx - w * .72)} ${n(cy + h * .72)}L${n(cx - w)} ${n(cy - 5)}z`;
  let s = `<path d="${path}" fill="${d.mD('gunmetal')}" transform="translate(0 1.8)"/>` +
    `<path d="${path}" fill="${d.enamel(sp.accent)}" stroke="${d.mH(m)}" stroke-width="2"/>` +
    `<path d="${path}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".7" transform="translate(0 0) scale(.86) translate(5.1 5.2)"/>` +
    icon(sp.emblem || 'diamond', cx, cy - 1.5, 19, `fill="${d.mV(sp.metal2 || m)}" stroke="${d.mD(m)}" stroke-width=".8"`);
  if (sp.orgText) s += `<text x="32" y="${n(cy + h * .72)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="4.1" font-weight="900" letter-spacing=".4" fill="#fff" stroke="#17202b" stroke-opacity=".65" stroke-width=".35" paint-order="stroke">${sp.orgText}</text>`;
  s += `<path d="M${cx - 8} ${n(cy - h + 5)}L${cx} ${n(cy - h + 1)}L${cx + 8} ${n(cy - h + 5)}" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="1.2"/>`;
  return s;
};

const ARCH_ALL = ['cup', 'chalice', 'spire', 'orb', 'star', 'shield', 'plate', 'prism', 'flame', 'bowl', 'obelisk', 'poly', 'regal', 'globe', 'laurel', 'column', 'wings', 'hoop', 'helix', 'gem'];
const TIER = { major: { scale: 1, metals: null }, elite: { scale: .97 }, regular: { scale: .93 }, tier2: { scale: .87, demote: true }, tier3: { scale: .8, demote: true }, academy: { scale: .76, demote: true } };
function familyKey(name) {
  return String(name || '').toLowerCase().replace(/\b(19|20)\d\d\b/g, ' ').replace(/\bseason\s*\d+|\bs\d+\b|\bсезон\s*\d+/g, ' ')
    .replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim();
}
function specFor(name, season, kind) {
  kind = kind || 'regular';
  const fkey = familyKey(name);
  const low = ['tier2', 'tier3', 'academy'].includes(kind) || /\b(?:open|closed) qualifier|квалиф/i.test(String(name || ''));
  const lowFam = kind === 'tier2'
    ? { arch: ['shield', 'plate', 'laurel', 'crest'], metals: ['silver', 'chrome', 'gunmetal', 'bronze'], glass: ['smoke', 'violet', 'mint'] }
    : kind === 'academy'
      ? { arch: ['crest', 'laurel', 'star'], metals: ['bronze', 'copper', 'gunmetal'], glass: ['mint', 'smoke', 'cyan'], small: true }
      : { arch: ['star', 'crest', 'plate', 'shield'], metals: ['bronze', 'copper', 'gunmetal', 'silver'], glass: ['smoke', 'violet', 'ruby'] };
  const fam = low ? lowFam : (FAMILIES.find(([re]) => re.test(name || '')) || [0, null])[1];
  const rawName = String(name || '');
  // The organizer is identified independently of tournament tier. Qualification and lower-tier
  // awards still use the organizer's visual language, but a separate non-cup badge silhouette.
  const orgKey = (/^(?:IEM|ESL)\b|^Intel Extreme/i.test(rawName) ? 'ESL-IEM'
      : /^BLAST/i.test(rawName) ? 'BLAST'
      : /^PGL/i.test(rawName) ? 'PGL'
      : /^StarLadder|^StarSeries/i.test(rawName) ? 'StarLadder'
      : /^(?:Perfect World|CS Asia)/i.test(rawName) ? 'Perfect-World'
      : /^(?:Esports World Cup|EWC)\b/i.test(rawName) ? 'EWC'
      : /^Thunderpick/i.test(rawName) ? 'Thunderpick'
      : /^FISSURE/i.test(rawName) ? 'FISSURE'
      : /^BetBoom|^Dacha/i.test(rawName) ? 'BetBoom'
      : /^CCT\b/i.test(rawName) ? 'CCT'
      : /^RES\b/i.test(rawName) ? 'RES'
      : /^DreamHack/i.test(rawName) ? 'DreamHack'
      : (fkey.split(' ').filter(Boolean).slice(0, 2).join('-').toUpperCase() || fkey));
  const r = rngOf(hash('inst|' + name + '|' + season + '|' + kind));
  const ORGANIZER_STYLES = {
    // Organizer silhouettes are intentionally disjoint: variations are allowed inside one brand,
    // but an ESL cup cannot accidentally turn into a BLAST/PGL/StarLadder cup.
    BLAST: { arches: ['prism', 'poly', 'wings'], lowArches: ['prism', 'poly'], metals: ['chrome', 'silver', 'gunmetal'], glass: ['blue', 'ice', 'violet', 'cyan'], accents: ['#2f6fe0', '#0fa3b8', '#7a3fd0'], emblem: 'bolt', label: 'BLAST', majorMetals: ['chrome', 'silver', 'gold'] },
    PGL: { arches: ['spire', 'obelisk', 'ingot'], lowArches: ['spire', 'obelisk'], metals: ['gunmetal', 'chrome', 'silver', 'bronze'], glass: ['ruby', 'smoke', 'amber'], accents: ['#b52e34', '#d23b3b', '#e08a1f'], emblem: 'diamond', label: 'PGL', majorMetals: ['gold', 'palegold', 'chrome'] },
    'ESL-IEM': { arches: ['chalice', 'cup', 'coin', 'shield', 'plate'], lowArches: ['coin', 'shield', 'plate'], metals: ['gold', 'palegold', 'silver', 'chrome', 'rose'], glass: ['blue', 'amber', 'ice', 'mint'], accents: ['#2f6fe0', '#e08a1f', '#0fa3b8'], emblem: 'globe', label: /^IEM/i.test(rawName) ? 'IEM' : 'ESL', majorMetals: ['gold', 'palegold', 'rose'] },
    StarLadder: { arches: ['star', 'laurel'], lowArches: ['star', 'laurel'], metals: ['gold', 'rose', 'silver'], glass: ['ruby', 'violet', 'amber'], accents: ['#d23b3b', '#7a3fd0', '#e08a1f'], emblem: 'star', label: 'SL', majorMetals: ['gold', 'palegold', 'rose'] },
    'Perfect-World': { arches: ['orb', 'globe'], lowArches: ['orb', 'globe'], metals: ['silver', 'chrome', 'copper'], glass: ['blue', 'cyan', 'ice'], accents: ['#0fa3b8', '#2f6fe0', '#7a3fd0'], emblem: 'globe', label: 'PW', majorMetals: ['gold', 'silver', 'chrome'] },
    EWC: { arches: ['column'], lowArches: ['column'], metals: ['gold', 'palegold', 'chrome'], glass: ['amber', 'ice'], accents: ['#e08a1f', '#c99d41'], emblem: 'crown', label: 'EWC', majorMetals: ['gold', 'palegold'] },
    Thunderpick: { arches: ['flame'], lowArches: ['flame'], metals: ['copper', 'bronze', 'gold'], glass: ['amber', 'ruby'], accents: ['#e07824', '#d23b3b'], emblem: 'flame', label: 'THUNDER', majorMetals: ['gold', 'copper'] },
    FISSURE: { arches: ['regal'], lowArches: ['regal'], metals: ['rose', 'copper', 'bronze'], glass: ['violet', 'ruby'], accents: ['#7a3fd0', '#d23b3b'], emblem: 'flame', label: 'FISSURE', majorMetals: ['rose', 'gold'] },
    BetBoom: { arches: ['gem'], lowArches: ['gem'], metals: ['chrome', 'silver', 'gold'], glass: ['mint', 'cyan', 'ice'], accents: ['#1f9e6e', '#0fa3b8'], emblem: 'diamond', label: 'BETBOOM', majorMetals: ['gold', 'chrome'] },
    CCT: { arches: ['hoop'], lowArches: ['hoop'], metals: ['silver', 'chrome', 'gunmetal'], glass: ['blue', 'smoke', 'cyan'], accents: ['#2f6fe0', '#0fa3b8'], emblem: 'crosshair', label: 'CCT', majorMetals: ['silver', 'gold'] },
    RES: { arches: ['helix'], lowArches: ['helix'], metals: ['silver', 'gunmetal', 'rose'], glass: ['violet', 'cyan', 'ruby'], accents: ['#7a3fd0', '#0fa3b8'], emblem: 'bolt', label: 'RES', majorMetals: ['silver', 'gold'] },
    DreamHack: { arches: ['bowl'], lowArches: ['wings'], metals: ['silver', 'rose', 'gold'], glass: ['ice', 'blue', 'amber'], accents: ['#2f6fe0', '#e08a1f'], emblem: 'star', label: 'DREAMHACK', majorMetals: ['gold', 'silver'] }
  };
  function customStyle(key) {
    const h = hash('brand-color|' + key) % 360;
    const hueHex = (hue, sat, light) => {
      const c = (1 - Math.abs(2 * light - 1)) * sat, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m = light - c / 2;
      const z = hue < 60 ? [c,x,0] : hue < 120 ? [x,c,0] : hue < 180 ? [0,c,x] : hue < 240 ? [0,x,c] : hue < 300 ? [x,0,c] : [c,0,x];
      return '#' + z.map(v => Math.round((v + m) * 255).toString(16).padStart(2,'0')).join('');
    };
    const arch = ARCH_ALL[hash('brand-shape|' + key) % ARCH_ALL.length];
    const lowArchPool = ['prism','poly','spire','obelisk','ingot','coin','shield','plate','star','laurel','orb','globe','column','flame','regal','gem','hoop','helix','wings'];
    const lowArch = lowArchPool[hash('brand-low-shape|' + key) % lowArchPool.length];
    const metalNames = ['chrome','silver','gunmetal','bronze','copper','rose','gold'];
    const glassNames = Object.keys(GLASS);
    return { arches: [arch], lowArches: [lowArch], metals: [metalNames[hash('brand-metal|' + key) % metalNames.length], metalNames[(hash(key + '|metal2') + 3) % metalNames.length]],
      glass: [glassNames[hash('brand-glass|' + key) % glassNames.length], glassNames[(hash(key + '|glass2') + 3) % glassNames.length]],
      accents: [hueHex(h, .72, .48), hueHex((h + 34) % 360, .68, .56)], emblem: ['diamond','bolt','globe','laurel','star','crosshair'][hash('brand-emblem|' + key) % 6],
      label: String(key).replace(/[^A-Z0-9]/gi,'').slice(0,8).toUpperCase() || 'OPEN', majorMetals: ['gold','silver','chrome'] };
  }
  const style = ORGANIZER_STYLES[orgKey] || customStyle(orgKey);

  // Архитектура награды теперь выбирается на каждый турнир/сезон отдельно.
  // Организатор сохраняет палитру и мотив, но не один и тот же силуэт на десятки турниров.
  const fallback = fam?.arch || [ARCH_ALL[hash(fkey) % ARCH_ALL.length]];
  const shapePool = low
    ? (style.lowArches || ['shield', 'plate', 'coin', 'laurel', 'star'])
    : style
      ? style.arches
      : kind === 'major'
        ? [...fallback, 'coin']
        : [...fallback, 'coin', 'shield', 'plate', 'logo', 'laurel'];
  const uniqueShapes = [...new Set(shapePool)];
  const arch = pick(r, uniqueShapes);
  const tier = TIER[kind] || TIER.regular;

  const defaultMetals = low
    ? (kind === 'academy' ? ['bronze', 'copper', 'gunmetal', 'rose'] : ['silver', 'chrome', 'gunmetal', 'bronze', 'copper', 'rose'])
    : ['gold', 'silver', 'chrome', 'bronze', 'rose', 'copper', 'gunmetal'];
  const metalPool = (style?.metals || fam?.metals || defaultMetals).slice();
  if (!metalPool.length) metalPool.push(...defaultMetals);
  let metal = pick(r, metalPool);
  if (kind === 'major') metal = pick(r, style?.majorMetals || ['gold', 'gold', 'palegold', 'rose']);
  if (tier.demote && (metal === 'gold' || metal === 'palegold')) metal = pick(r, ['silver', 'chrome', 'rose', 'bronze']);
  const glassPool = style?.glass || fam?.glass || Object.keys(GLASS);
  const glassName = pick(r, glassPool);
  const glass = GLASS[glassName] || GLASS.blue;
  const accentPool = style?.accents || ENAMEL;
  const accent = pick(r, accentPool);
  const orgText = style?.label || (/^PGL/i.test(name) ? 'PGL' : /^BLAST/i.test(name) ? 'BLAST' : /^(?:IEM|ESL)\b/i.test(name) ? 'ESL' : /^StarLadder|^StarSeries/i.test(name) ? 'SL' : /^(?:Perfect World|CS Asia)/i.test(name) ? 'PW' : (String(name || '').match(/[A-ZА-Я0-9]/g) || []).slice(0, 4).join(''));
  const flip = p => r() < p;
  const famFlag = (k, p) => (hash(fkey + k + '|' + season) % 100) / 100 < p;
  const isFreeForm = arch === 'coin' || arch === 'logo';
  const baseType = isFreeForm ? 'none' : pick(r, arch === 'prism' || arch === 'spire' ? ['block', 'slab', 'step'] : ['step', 'round', 'slab', 'block']);
  const baseMat = pick(r, ['black', 'black', 'wood', 'marble', 'navy', 'stone']);
  const sp = {
    arch, kind, metal, glass, organizer: orgKey, variant: pick(r, style?.variants || fam?.variants || ['single', 'twin', 'inv', 'trio']),
    metal2: pick(r, ['gold', 'silver', 'palegold', 'chrome', 'rose', metal]),
    accent, gem: GLASS[pick(r, ['ruby', 'blue', 'mint', 'amber', 'violet', 'cyan'])],
    gem2: GLASS[pick(r, ['ruby', 'blue', 'mint', 'amber'])],
    frame: style?.frames ? pick(r, style.frames) : fam?.frame ? pick(r, fam.frame) : (flip(.42) ? pick(r, ['silver', 'chrome', 'gold']) : null),
    big: !low && (!!fam?.big || kind === 'major'),
    handles: arch === 'cup' || arch === 'chalice' ? pick(r, fam?.handles || ['loop', 'wing', 'angular']) : null,
    lid: famFlag('lid', .45) !== flip(.2), finial: pick(r, ['ball', 'star']),
    band: famFlag('band', .5) !== flip(.25), bandMetal: flip(.5) ? pick(r, ['gold', 'silver', 'gunmetal', 'rose']) : null,
    emblem: fam?.emblem || style?.emblem || (arch === 'shield' || arch === 'plate' || arch === 'coin' || arch === 'logo' ? pick(r, ['star', 'chevron', 'laurel', 'diamond', 'crown', 'bolt', 'globe']) : (flip(.3) ? pick(r, ['star', 'diamond']) : null)),
    facets: flip(.5) ? 6 + Math.floor(r() * 4) : 0,
    ring: flip(.7), engr: flip(.5), gemTop: flip(.35), globe: flip(.5),
    glassOrb: flip(.35), field: flip(.7), center: flip(.5) ? 'enamel' : 'metal',
    rings: [[.78, .55], [.82, .6, .4], [.7]][Math.floor(r() * 3)], dots: flip(.45),
    core: arch === 'prism' && flip(.45), coreTint: GLASS[pick(r, ['amber', 'ruby', 'mint', 'blue'])], coin: flip(.5),
    orgText,
    plaque: low ? pick(r, ['gunmetal', 'bronze', 'silver']) : pick(r, ['gold', 'silver', 'palegold', 'rose']),
    base: { type: baseType, mat: baseMat, w: jit(r, arch === 'cup' || arch === 'crown' ? 30 : 26, .12) },
    scale: (tier.scale || .93) * (fam?.small ? .94 : 1), star: kind === 'major'
  };
  if (arch === 'cup' && kind === 'major') sp.handles = sp.handles || 'loop';
  return sp;
}
function render(sp) {
  const d = new Defs(), r = rngOf(hash(JSON.stringify([sp.arch, sp.metal, sp.variant, sp.base.w, sp.accent, sp.seed || 0])));
  const b = drawBase(d, sp);
  const body = (ARCH[sp.arch] || ARCH.cup)(d, r, sp, b.top);
  const k = sp.scale || 1;
  const g = k === 1 ? body : `<g transform="translate(32 ${n(b.top)}) scale(${n(k)}) translate(-32 ${n(-b.top)})">${body}</g>`;
  return d.svg(b.svg + g);
}

/* ------------------------------------------------- медали и плашки */
function medalSvg(kind) { if (kind !== 'evp' && window.CS2TrophyForge && window.CS2TrophyForge.mvpMedal) return window.CS2TrophyForge.mvpMedal(); // v110: реалистичная медаль MVP
  // MVP / EVP в духе HLTV: круглая медаль — золотой обод, эмалевое кольцо с делениями, центр с надписью
  const evp = kind === 'evp', ring = evp ? ['#9aa7b8', '#5b6778'] : ['#2f6fd6', '#183f86'], core = evp ? ['#eef2f7', '#aab4c2'] : ['#ffe08a', '#d39a22'];
  let ticks = '';
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, r1 = 21.5, r2 = i % 3 ? 23.5 : 25; ticks += `<line x1="${n(32 + Math.cos(a) * r1)}" y1="${n(32 + Math.sin(a) * r1)}" x2="${n(32 + Math.cos(a) * r2)}" y2="${n(32 + Math.sin(a) * r2)}" stroke="#fff" stroke-opacity="${i % 3 ? .35 : .7}" stroke-width="${i % 3 ? .6 : 1}"/>`; }
  const id = 'md' + (evp ? 'e' : 'm') + (++UID).toString(36);
  return `<svg class="tw-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>` +
    `<linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".5" stop-color="#d6a23a"/><stop offset="1" stop-color="#8a5a12"/></linearGradient>` +
    `<radialGradient id="${id}b" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="${ring[0]}"/><stop offset="1" stop-color="${ring[1]}"/></radialGradient>` +
    `<radialGradient id="${id}c" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="${core[0]}"/><stop offset="1" stop-color="${core[1]}"/></radialGradient></defs>` +
    `<circle cx="32" cy="32" r="30" fill="url(#${id}r)"/><circle cx="32" cy="32" r="27" fill="url(#${id}b)"/>${ticks}` +
    `<circle cx="32" cy="32" r="16" fill="url(#${id}r)"/><circle cx="32" cy="32" r="14.2" fill="url(#${id}c)"/>` +
    `<text x="32" y="36" text-anchor="middle" font-family="Inter,Arial,Helvetica,sans-serif" font-weight="900" font-size="10" fill="${evp ? '#3b4656' : '#6b3f05'}">${evp ? 'EVP' : 'MVP'}</text>` +
    `<path d="M14 22a20 20 0 0 1 14-10" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/></svg>`;
}
// Grand Slam — золотой слиток: объёмный брусок в лёгком ракурсе, скошенные грани, блики, без надписей
function goldBarSvg(year) {
  if (window.CS2TrophyForge && window.CS2TrophyForge.goldBar) return window.CS2TrophyForge.goldBar({ year }); // v102: векторный слиток
  const u = 'gb' + (++UID).toString(36);
  return (`<svg class="tw-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>` +
    `<radialGradient id="gbG" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#ffd76a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="gbTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8cf"/><stop offset=".35" stop-color="#ffe27a"/><stop offset=".7" stop-color="#f4bd2c"/><stop offset="1" stop-color="#d99614"/></linearGradient>` +
    `<linearGradient id="gbFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c33a"/><stop offset=".5" stop-color="#e2a019"/><stop offset="1" stop-color="#a86a06"/></linearGradient>` +
    `<linearGradient id="gbSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c98a0d"/><stop offset="1" stop-color="#8a5503"/></linearGradient>` +
    `<linearGradient id="gbEdge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
    `<circle cx="32" cy="34" r="27" fill="url(#gbG)"/>` +
    `<ellipse cx="32" cy="47.5" rx="21" ry="3.2" fill="#000" opacity=".45"/>` +
    // передняя грань (трапеция), правая боковая, верх (скошенный)
    `<path d="M9 34L13 45H48L52 34z" fill="url(#gbFront)"/>` +
    `<path d="M52 34L48 45L55 40L57 30z" fill="url(#gbSide)"/>` +
    `<path d="M9 34L19 24H51L57 30L52 34z" fill="url(#gbFront)" opacity=".9"/>` +
    `<path d="M15 31L21 26H49L53 30L49 32H18z" fill="url(#gbTop)"/>` +
    `<path d="M15 31L18 32H49L53 30" fill="none" stroke="#a86a06" stroke-opacity=".5" stroke-width=".6"/>` +
    `<path d="M21 26H49" stroke="url(#gbEdge)" stroke-width="1.2"/>` +
    `<path d="M10 34H52" stroke="#fff3b8" stroke-opacity=".75" stroke-width=".8"/>` +
    `<path d="M22 28.4l18 0" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round"/>` +
    `<path d="M14 38H30" stroke="#fff" stroke-opacity=".25" stroke-width="1.2" stroke-linecap="round"/>` +
    `<path d="M44 21l1.2 2.6 2.6 1.2-2.6 1.2L44 28.6l-1.2-2.6-2.6-1.2 2.6-1.2z" fill="#fff" opacity=".9"/></svg>`).replace(/gb(G|Top|Front|Side|Edge)\b/g, u + '$1');
}
function top20Svg(rank, year) { // плашка «топ-20 года» (v109: значок со звездой и годом из генератора)
  if (window.CS2TrophyForge && window.CS2TrophyForge.rankBadge) return window.CS2TrophyForge.rankBadge(rank, year);
  const d = new Defs(), c = rank <= 1 ? ['#ffd45a', '#d6901d', '#8a5208'] : rank === 2 ? ['#eef2f6', '#a7b1bd', '#5d6773'] : rank === 3 ? ['#f0b98a', '#b86f35', '#6e3a14'] : rank <= 10 ? ['#ffa15a', '#e0631f', '#8c3208'] : ['#f2a56c', '#c9662e', '#7a3814']; // 1 — золото, 2 — серебро, 3 — бронза
  const p = 'M20 5h24l14 14v26L44 59H20L6 45V19z';
  return d.svg(`<path d="${p}" fill="${d.lg('t20', 0, 0, 0, 1, [[0, c[0]], [.55, c[1]], [1, c[2]]])}"/>` +
    `<path d="${p}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.2" transform="translate(32 32) scale(.86) translate(-32 -32)"/>` +
    `<path d="M20 5h24l14 14H6z" fill="#fff" opacity=".14"/>` +
    `<text x="32" y="19" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="6" letter-spacing=".5" fill="#fff" fill-opacity=".9">TOP 20</text>` +
    `<text x="32" y="${rank >= 10 ? 46 : 47}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="${rank >= 10 ? 23 : 27}" fill="#fff" stroke="${c[2]}" stroke-width=".8" paint-order="stroke">${rank}</text>`, '0 0 64 64');
}
const AWARD_DEF = {
  poty:   { title: 'Игрок года',            emblem: 'star',      glass: 'amber' },
  rifler: { title: 'Лучший рифлер года',    emblem: 'crosshair', glass: 'ice' },
  awper:  { title: 'Лучший снайпер года',   emblem: 'scope',     glass: 'cyan' },
  igl:    { title: 'Лучший капитан года',   emblem: 'crown',     glass: 'violet' },
  rookie: { title: 'Новичок года',          emblem: 'sprout',    glass: 'mint' },
  team:   { title: 'Команда года',          emblem: 'crown' },
  coach:  { title: 'Тренер года',           emblem: 'laurel',    glass: 'violet' },
  entry:  { title: 'Лучший энтри-фраггер',  emblem: 'bolt',      glass: 'ruby' },
  clutch: { title: 'Мастер клатчей',        emblem: 'diamond',   glass: 'blue' },
  support:{ title: 'Лучший саппорт',        emblem: 'cross',     glass: 'mint' },
  breakout:{ title: 'Прорыв года',          emblem: 'chevron',   glass: 'amber' },
  teamseason:{ title: 'Команда сезона',       emblem: 'laurel',    glass: 'amber' },
  anchor:{ title: 'Лучший якорь года',        emblem: 'shield',    glass: 'ice' },
  lurker:{ title: 'Лучший люркер года',       emblem: 'eye',       glass: 'violet' },
  utility:{ title: 'Мастер utility',          emblem: 'grenade',   glass: 'mint' },
  youngstar:{ title: 'Молодая звезда года',   emblem: 'sprout',    glass: 'cyan' },
  mostimproved:{ title: 'Самый прогрессирующий игрок', emblem: 'flame', glass: 'ruby' },
  defender:{ title: 'Лучший защитник года',   emblem: 'shield',    glass: 'blue' },
  captain:{ title: 'Капитан года',            emblem: 'crown',     glass: 'violet' },
  analyst:{ title: 'Аналитик года',           emblem: 'globe',     glass: 'ice' },
  hall:{ title: 'Зал славы',                 emblem: 'laurel',    glass: 'amber' }
};
function awardSvg(type, year) {
  if (window.CS2TrophyForge) return window.CS2TrophyForge.award(type, year);
  const a = AWARD_DEF[type] || AWARD_DEF.poty;
  const palette = {
    poty: ['#f9d36b','#a86a17','#fff4c9','#7f4d12'],
    awper: ['#bfeaff','#478ebc','#f4fcff','#1d557e'],
    rifler: ['#e8b17a','#98532b','#fff0d9','#623117'],
    igl: ['#d3c5ff','#7d64c8','#f5f0ff','#443078'],
    rookie: ['#a6f4d1','#278f73','#edfff7','#145b4b'],
    entry: ['#ffb5bd','#b13c51','#fff0f1','#641b2b'],
    clutch: ['#a8d7ff','#477ac2','#eff8ff','#1b477d'],
    support: ['#b3f2dc','#3d9c7c','#effff9','#175a47'],
    breakout: ['#ffd19a','#bb762c','#fff5e6','#6d3f12'],
    anchor: ['#c7e2f2','#547c9d','#f1fbff','#294b67'],
    lurker: ['#d7c7ff','#7657b4','#f7f2ff','#422c74'],
    utility: ['#a9efc9','#388e63','#effff5','#145337'],
    youngstar: ['#a8e8ff','#3f8bb4','#f0fbff','#1c506e'],
    mostimproved: ['#ffb29d','#bc4d35','#fff0ea','#6a2417'],
    defender: ['#b9d7ee','#527da5','#f0f8ff','#294b6d'],
    captain: ['#d7c8ff','#745bb7','#f7f2ff','#3e2a70'],
    analyst: ['#b9e6ef','#458b9c','#effcff','#205360'],
    hall: ['#f8d980','#a57721','#fff8dc','#5e4214'],
    team: ['#f6d77b','#a56d1b','#fff7d9','#62420f'],
    teamseason: ['#f4cb73','#9a641d','#fff1c3','#593a10'],
    coach: ['#d5c7ff','#735bb5','#f5f0ff','#3d2b6b']
  };
  const c = palette[type] || palette.poty;
  const id = 'aw' + (++UID).toString(36) + '_';
  const yearText = String(Number(year) || new Date().getFullYear());
  const yearShort = yearText.length >= 4 ? yearText.slice(-2) : yearText;
  const esc = x => String(x).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const gold = `url(#${id}gold)`, dark = `url(#${id}dark)`, crystal = `url(#${id}crystal)`, base = `url(#${id}base)`;
  let emblem = '';
  if (type === 'awper') {
    // Precision medallion: abstract rings and a faceted diamond, not a weapon.
    emblem = `<circle cx="32" cy="22" r="10.5" fill="none" stroke="${gold}" stroke-width="2"/><circle cx="32" cy="22" r="6.7" fill="${dark}" stroke="${crystal}" stroke-width="1.6"/><path d="M32 10V15 M32 29V34 M20 22H25 M39 22H44 M24 14L27.5 17.5 M36.5 26.5L40 30 M40 14L36.5 17.5 M27.5 26.5L24 30" stroke="${gold}" stroke-width="1.25" stroke-linecap="round"/><path d="M32 16L37 22L32 28L27 22Z" fill="${crystal}" stroke="${gold}" stroke-width=".9"/><circle cx="32" cy="22" r="1.5" fill="#fff"/>`;
  } else if (type === 'poty') {
    emblem = `<path d="M32 12L35.2 18.6L42.5 19.5L37.2 24.4L38.6 31.4L32 27.8L25.4 31.4L26.8 24.4L21.5 19.5L28.8 18.6Z" fill="${gold}" stroke="${dark}" stroke-width=".8"/><path d="M32 14.8L34.2 19.7L39.4 20.2L35.5 23.8L36.5 28.8L32 26.2L27.5 28.8L28.5 23.8L24.6 20.2L29.8 19.7Z" fill="${crystal}"/><path d="M32 15V29 M24 20L40 26 M40 20L24 26" stroke="#fff" stroke-opacity=".55" stroke-width=".7"/>`;
  } else if (type === 'rookie' || type === 'youngstar') {
    emblem = `<path d="M32 31V16" stroke="${gold}" stroke-width="1.7" stroke-linecap="round"/><path d="M32 22C22 22 19 16 20 11C27 11 32 15 32 22Z" fill="${crystal}" stroke="${gold}" stroke-width=".9"/><path d="M32 20C32 12 38 9 45 10C45 17 40 22 32 23Z" fill="${gold}" stroke="${dark}" stroke-width=".9"/>`;
  } else if (type === 'igl' || type === 'captain') {
    emblem = `<path d="M22 17L27 21L32 13L37 21L42 17L40 29H24Z" fill="${gold}" stroke="${dark}" stroke-width=".9"/><path d="M26 30H38" stroke="${crystal}" stroke-width="1.5" stroke-linecap="round"/><circle cx="22" cy="16" r="1.6" fill="${crystal}"/><circle cx="32" cy="11.5" r="2" fill="${crystal}"/><circle cx="42" cy="16" r="1.6" fill="${crystal}"/>`;
  } else if (type === 'team' || type === 'teamseason' || type === 'hall' || type === 'coach') {
    emblem = `<path d="M32 12L35 18L42 19L37 24L38.5 31L32 27.5L25.5 31L27 24L22 19L29 18Z" fill="${gold}" stroke="${dark}" stroke-width=".8"/><path d="M32 15V28 M26 20L38 26 M38 20L26 26" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>`;
  } else {
    emblem = `<path d="M32 13L36 19L43 20L38 25L39 32L32 28L25 32L26 25L21 20L28 19Z" fill="${gold}" stroke="${dark}" stroke-width=".8"/><path d="M25 34Q32 38 39 34" fill="none" stroke="${crystal}" stroke-width="1.2"/>`;
  }
  return `<svg class="tw-svg tw-award-svg" viewBox="0 0 64 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(a.title)} ${esc(yearText)}" data-award="${esc(type)}"><defs>
    <linearGradient id="${id}gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[2]}"/><stop offset=".24" stop-color="${c[0]}"/><stop offset=".52" stop-color="${c[1]}"/><stop offset=".76" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[3]}"/></linearGradient>
    <linearGradient id="${id}dark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#111820"/><stop offset=".48" stop-color="#384451"/><stop offset="1" stop-color="#090d12"/></linearGradient>
    <linearGradient id="${id}crystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${c[2]}"/><stop offset=".65" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[3]}"/></linearGradient>
    <linearGradient id="${id}base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#77818d"/><stop offset=".18" stop-color="#252c35"/><stop offset="1" stop-color="#07090c"/></linearGradient>
  </defs>
  <ellipse cx="32" cy="73" rx="21" ry="3" fill="#000" opacity=".38"/>
  <!-- Traditional cup handles and flared bowl -->
  <path d="M19 15C7 10 6 28 19 33L23 29C15 26 14 19 19 19Z" fill="${dark}" stroke="${gold}" stroke-width="1.7"/>
  <path d="M45 15C57 10 58 28 45 33L41 29C49 26 50 19 45 19Z" fill="${dark}" stroke="${gold}" stroke-width="1.7"/>
  <path d="M16 10Q32 5 48 10L44 28Q42 37 35 41H29Q22 37 20 28Z" fill="${gold}" stroke="${dark}" stroke-width="1.4"/>
  <path d="M20 12Q32 8 44 12L41 27Q39 34 32 37Q25 34 23 27Z" fill="${dark}" stroke="${crystal}" stroke-opacity=".75" stroke-width=".85"/>
  <path d="M18 11Q32 7 46 11" fill="none" stroke="#fff" stroke-opacity=".72" stroke-width="1.1"/>
  <path d="M21 14Q20 24 25 32" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>
  <path d="M43 14Q44 24 39 32" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1"/>
  ${emblem}
  <path d="M27 40H37L39 51H25Z" fill="${dark}" stroke="${gold}" stroke-width="1.1"/>
  <path d="M29 41H35L36 50H28Z" fill="${crystal}" opacity=".65"/>
  <path d="M21 51H43L47 56H17Z" fill="${gold}" stroke="${dark}" stroke-width="1"/>
  <path d="M15 56H49L52 68H12Z" fill="${base}" stroke="#87929d" stroke-opacity=".6" stroke-width=".9"/>
  <path d="M18 58H46L47 61H17Z" fill="${gold}" opacity=".95"/>
  <rect x="21" y="62" width="22" height="4.2" rx=".7" fill="#10161d" stroke="${gold}" stroke-width=".65"/>
  <text x="32" y="65.1" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="3.7" font-weight="900" letter-spacing=".55" fill="${c[2]}">${esc(yearShort)}</text>
  <path d="M15 68.5H49" stroke="#fff" stroke-opacity=".28" stroke-width=".55"/>
  </svg>`;
}

const CACHE = new Map();
// у каждой копии SVG — свои id градиентов: иначе при скрытой первой копии Chrome не рисует заливку в остальных
function uniq(svg) { const m = /id="(tw[0-9a-z]+_)/.exec(svg); if (!m) return svg; const fresh = 'tw' + (++UID).toString(36) + '_'; return svg.split(m[1]).join(fresh); }
const NO_CUP_KINDS = new Set(['tier2', 'tier3', 'qual']);
const isQualifierName = value => /qualifier|qualification|квалиф|квалификац/i.test(String(value || ''));
const isQualifierRecord = value => {
  const raw = String(value?.kind || value?.prestige || value?.k || value?.tier || '').toLowerCase().replace(/[-_\s]/g, '');
  return !!(value?.qual || value?.isQualifier || value?.isQualifyingEvent) || ['qual', 'qualifier', 'qualification'].includes(raw) || isQualifierName(value?.n || value?.name || value?.tournament || '') || /-Q-/i.test(String(value?.id || value?.a || value?.archiveId || ''));
};
const TITLE_KIND = new Set(['major', 'elite', 'regular', 'tier2', 'tier3', 'academy', 'qual']);
const isCupKind = kind => !NO_CUP_KINDS.has(String(kind || '').toLowerCase());
const isSTierEventName = value => /^(?:Thunderpick World Championship|FISSURE Playground|Esports World Cup|IEM\b|BLAST Premier|PGL\b|StarLadder StarSeries|CS Asia Championships)/i.test(String(value || '').replace(/\s+20\d{2}$/, ''));
function normalizeTitleKind(value, name, tier, metadata) {
  const raw = String(value || '').toLowerCase().replace(/[-_\s]/g, '');
  const nm = String(name || '');
  const tr = String(tier ?? '').toLowerCase().replace(/[-_\s]/g, '');
  // Qualifier identity wins over legacy/default tier metadata. Some older event
  // objects only carried `qual: true` or a `-Q-` ID and had no qualifier name.
  // v84: шоу-матч — не турнир и не титул, даже если в названии есть «ESL Pro League».
  if (raw === 'show' || raw === 'nations' || metadata?.showMatch === true || metadata?.show === true || /^SM-/.test(String(metadata?.id || metadata?.a || '')) || /^Шоу-матч\b/i.test(nm)) return (raw === 'nations' || /nations cup/i.test(nm)) ? 'nations' : 'show';
  if (metadata && isQualifierRecord(metadata) || ['qual', 'qualifier', 'qualification'].includes(raw) || isQualifierName(nm)) return 'qual';
  if (raw === 'major' || /\bmajor\b/i.test(nm)) return 'major';
  // v84: «academy» из старого снимка принимаем только для реально академических событий —
  // раньше подстрока «ares» в «Bucharest» превращала PGL Masters Bucharest в турнир академий.
  const academyName = /\b(?:academy|junior|nxt|ares|young talents|prodigy)\b|академ/i.test(nm);
  const champ = String(metadata?.champion || metadata?.winner || '');
  let champAcademy = false;
  try { champAcademy = !!(champ && Array.isArray(teams) && teams.find(t => t.name === champ)?.isAcademy) || /\b(?:academy|nxt|junior)\b/i.test(champ); } catch (e) {}
  if (academyName || (raw === 'academy' && (!nm || champAcademy))) return 'academy';
  // «academy» из старого снимка у неакадемического события: определяем уровень по названию организатора.
  if (raw === 'academy') return isSTierEventName(nm) ? 'elite' : (tr === '2' || /^(?:PGL|IEM|BLAST|ESL|StarLadder|Thunderpick|FISSURE|CCT|Esports World Cup)/i.test(nm) ? (isSTierEventName(nm) ? 'elite' : 'tier2') : 'tier3');
  // An explicit Tier-1 event label in the name is stronger than stale metadata.
  if (/\btier[- ]?1\b/i.test(nm)) return 'regular';
  // Source tier and canonical Tier-2/3 labels override stale generic cup prestige
  // (including legacy `regular`/`elite` labels copied from the organiser).
  if (tr === '2' || tr === 'tier2' || raw === 'tier2' || raw === '2') return 'tier2';
  if (tr === '3' || tr === 'tier3' || raw === 'tier3' || raw === '3') return 'tier3';
  // A known S-Tier organiser or explicit elite prestige remains elite at
  // generic tier=1, but never overrides an actual tier 2/3 value.
  if (raw === 'elite' || raw === 'stier' || isSTierEventName(nm)) return 'elite';
  if (raw === 'regular' || raw === 'tier1' || raw === '1' || tr === '1' || tr === 'tier1') return 'regular';
  return TITLE_KIND.has(raw) ? raw : 'regular';
}
window.twNormalizeTitleKind = normalizeTitleKind;
window.twIsCupKind = kind => isCupKind(kind);
window.twIsPlaceholderKind = kind => NO_CUP_KINDS.has(String(kind || '').toLowerCase());
window.twAchievementVisual = (name, season, kind) => trophySvg(name, season, kind);

function placeholderSvg(name, season, kind) {
  if (window.CS2TrophyForge) return window.CS2TrophyForge.marker(name, season, kind);
  const k = NO_CUP_KINDS.has(kind) ? kind : 'tier3';
  const seed = hash(`${k}|${name}|${season}`), variant = seed % 3;
  const palettes = {
    qual: [['#245c9e', '#42b7df', '#bcecff'], ['#285e82', '#51a9c7', '#d8f4ff'], ['#344d92', '#7b8fe0', '#e0e6ff']],
    tier2: [['#73502b', '#c18a42', '#ffe0a5'], ['#765b38', '#d1a45e', '#fff0c8'], ['#684b38', '#b87b56', '#f7d0aa']],
    tier3: [['#46586d', '#7e91a8', '#d1dbe7'], ['#4d596c', '#9a8f79', '#e1d6be'], ['#455e5d', '#73a59a', '#d6f0e9']]
  };
  const [dark, mid, light] = palettes[k][variant];
  const emblem = variant === 0 ? 'M32 22l8 8-8 8-8-8z' : variant === 1 ? 'M32 21l9 5v9l-9 5-9-5v-9z' : 'M32 21l10 10-10 10-10-10z';
  let body = '';
  if (k === 'qual') {
    body = `<path d="M13 17h38a4 4 0 0 1 4 4v7a5 5 0 0 0 0 10v7a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4v-7a5 5 0 0 0 0-10v-7a4 4 0 0 1 4-4z" fill="${mid}" stroke="${light}" stroke-width="1.6"/><path d="M32 19v30" stroke="${light}" stroke-width="1.5" stroke-dasharray="2.5 2.5" opacity=".9"/><path d="M21 29h6m-6 6h6m10-6h6m-6 6h6" stroke="${dark}" stroke-width="2" stroke-linecap="round"/><path d="M35 41l3 3 6-7" fill="none" stroke="${light}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (k === 'tier2') {
    body = `<path d="M32 12l7 8 10-1-1 10 7 7-9 5-2 10-12-3-12 3-2-10-9-5 7-7-1-10 10 1z" fill="${dark}" stroke="${light}" stroke-width="1.6"/><path d="${emblem}" fill="${mid}" stroke="${light}" stroke-width="1.6"/><path d="M24 49l-3 15 11-5 11 5-3-15" fill="${mid}" stroke="${light}" stroke-width="1.2"/><path d="M32 25l2.3 4.7 5.2.7-3.8 3.5.9 5.1-4.6-2.5-4.6 2.5.9-5.1-3.8-3.5 5.2-.7z" fill="${light}"/>`;
  } else {
    body = `<path d="M32 9l19 11v22L32 53 13 42V20z" fill="${dark}" stroke="${light}" stroke-width="1.7"/><path d="M32 14l14 8v16l-14 8-14-8V22z" fill="${mid}" stroke="${light}" stroke-opacity=".8" stroke-width="1.2"/><path d="${emblem}" fill="${light}" stroke="${dark}" stroke-width="1.3"/><path d="M23 56h18M27 61h10" stroke="${mid}" stroke-width="3" stroke-linecap="round"/>`;
  }
  return `<svg class="tw-svg tw-placeholder tw-placeholder-${k}" viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${k === 'qual' ? 'Квалификация' : k === 'tier2' ? 'Tier-2 результат' : 'Tier-3 результат'}"><path d="M8 7h48v58H8z" rx="7" fill="#141b25" stroke="${mid}" stroke-opacity=".35"/><path d="M11 10h42" stroke="${light}" stroke-opacity=".2"/>${body}<text x="32" y="69" text-anchor="middle" font-size="5" font-family="Arial,sans-serif" font-weight="900" letter-spacing=".9" fill="${light}" opacity=".95">${k === 'qual' ? 'QUAL' : k.toUpperCase()}</text></svg>`;
}
function trophySvg(name, season, kind) {
  const k = normalizeTitleKind(kind, name);
  const F = window.CS2TrophyForge;
  // v84: Tier-2/3, квалификации и академии — отметки результата, а не кубки.
  if (F && k === 'nations') return F.cup(name, season, 'nations');
  if (F && k === 'show') return F.marker(name, season, 'show');
  if (F && (NO_CUP_KINDS.has(k) || k === 'academy')) return F.marker(name, season, k === 'academy' ? 'tier3' : k);
  if (NO_CUP_KINDS.has(k)) return placeholderSvg(name, season, k);
  if (F) {
    const fk = name + '|' + season + '|' + k + '|v84-forge';
    if (!CACHE.has(fk)) { if (CACHE.size > 600) CACHE.clear(); CACHE.set(fk, F.cup(name, season, k)); }
    const svg = CACHE.get(fk), m = /id="(tf[0-9a-z]+_)/.exec(svg);
    return m ? svg.split(m[1]).join('tf' + (++UID).toString(36) + 'c_') : svg; // fresh gradient ids per copy
  }
  const key = name + '|' + season + '|' + k + '|v70-organizer-design';
  if (!CACHE.has(key)) { if (CACHE.size > 600) CACHE.clear(); CACHE.set(key, render(specFor(name, season, k))); }
  return uniq(CACHE.get(key));
}
window.TW = { trophySvg, placeholderSvg, isCupKind, specFor, render, medalSvg, goldBarSvg, top20Svg, awardSvg, AWARD_DEF, familyKey };

/* =====================================================================
   Ниже — встраивание в игру (если это не отдельная галерея)
   ===================================================================== */
if (typeof window.showHistory !== 'function' || typeof teams === 'undefined') return;

const AW_KEY = 'cs2_player_awards_v1';
let AW = (() => { try { const o = JSON.parse(localStorage.getItem(AW_KEY) || '{}'); return o && o.p ? o : { v: 3, p: {}, seasons: [], teamAwards: [], teamTitles: [] }; } catch (e) { return { v: 3, p: {}, seasons: [], teamAwards: [], teamTitles: [] }; } })();
AW.teamAwards = Array.isArray(AW.teamAwards) ? AW.teamAwards : [];
AW.teamTitles = Array.isArray(AW.teamTitles) ? AW.teamTitles : [];
AW.p = AW.p && typeof AW.p === 'object' ? AW.p : {};
AW.v = Math.max(3, Number(AW.v) || 1);
// v36: чистим старые неверные MVP-медали Tier-2/3 и академий; MVP даётся только за Major/S-Tier/Tier-1.
let cleanedLowMvp = false;
Object.values(AW.p || {}).forEach(rec => {
  const before = (rec.mvp || []).length; rec.mvp = (rec.mvp || []).filter(a => ['major', 'elite', 'regular'].includes(String(a.k || '').toLowerCase()));
  if (rec.mvp.length !== before) cleanedLowMvp = true;
  const r = (rec.aw || []).filter(a => a.type === 'rookie'); if (r.length > 1) { const first = r.reduce((a, b) => ((a.s || 0) <= (b.s || 0) ? a : b)); rec.aw = rec.aw.filter(a => a.type !== 'rookie' || a === first); }
});
let awTimer = null;
function awSave() { clearTimeout(awTimer); awTimer = setTimeout(() => { try { localStorage.setItem(AW_KEY, JSON.stringify(AW)); } catch (e) { console.warn('[trophies] не сохранено', e); } }, 250); }
if (cleanedLowMvp) awSave();
window.addEventListener('beforeunload', () => { if (awTimer) { clearTimeout(awTimer); try { localStorage.setItem(AW_KEY, JSON.stringify(AW)); } catch (e) {} } });
const P = nick => {
  const rec = AW.p[nick] || (AW.p[nick] = { mvp: [], ti: [], top: [], aw: [] });
  rec.mvp = Array.isArray(rec.mvp) ? rec.mvp : []; rec.ti = Array.isArray(rec.ti) ? rec.ti : [];
  rec.top = Array.isArray(rec.top) ? rec.top : []; rec.aw = Array.isArray(rec.aw) ? rec.aw : [];
  return rec;
};
window.twAwardsExport = () => AW;
window.twAwardsImport = o => { if (o && o.p) { AW = o; AW.p = AW.p && typeof AW.p === 'object' ? AW.p : {}; AW.teamAwards = Array.isArray(AW.teamAwards) ? AW.teamAwards : []; AW.teamTitles = Array.isArray(AW.teamTitles) ? AW.teamTitles : []; AW.seasons = Array.isArray(AW.seasons) ? AW.seasons : []; AW.v = Math.max(3, Number(AW.v) || 1); awSave(); } };
window.twAddTeamAward = a => { if (!a || !a.team || !a.type || !a.year) return false; AW.teamAwards = Array.isArray(AW.teamAwards) ? AW.teamAwards : []; const id = a.id || `${a.type}|${a.team}|${a.year}`; if (AW.teamAwards.some(x => x.id === id)) return false; AW.teamAwards.unshift({ ...a, id, title: a.title || (AWARD_DEF[a.type]?.title || a.type) }); AW.teamAwards = AW.teamAwards.slice(0, 200); awSave(); return true; };
window.twAwardsClear = () => { clearTimeout(awTimer); awTimer = null; AW = { v: 3, p: {}, seasons: [], teamAwards: [], teamTitles: [] }; try { localStorage.removeItem(AW_KEY); } catch (e) {} }; // отложенная запись тоже отменяется — иначе при перезагрузке награды записались бы обратно

const esc2 = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ovr = p => Math.round(W.CS2Power ? W.CS2Power.overall(p) : (+p.firepower || 0) * .40 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .20 + (+p.utility || 0) * .15);
const yearOf = s => 2026 + ((+s || 1) - 1);
const KIND_LABEL = { major: 'Major', elite: 'S-Tier', regular: 'Tier-1', tier2: 'Tier-2', tier3: 'Tier-3', academy: 'Академии', qual: 'Квалификация' };
function rememberTeamTitle(ev) {
  // v62 registry owns all writes; this function remains as an old-save fallback.
  if (window.RewardSystem?.addTeamEventAchievement) return window.RewardSystem.addTeamEventAchievement(ev);
  const team = String(ev?.champion || ev?.team || '').trim(), name = String(ev?.name || ev?.n || '').trim();
  if (!team || !name || team === '—') return false;
  AW.teamTitles = Array.isArray(AW.teamTitles) ? AW.teamTitles : [];
  const season = Math.max(1, Number(ev.season ?? ev.s) || 1), archiveId = String(ev.archiveId || ev.a || ev.id || '');
  const id = archiveId || `legacy|${team}|${name}|${season}`;
  const kind = normalizeTitleKind(ev.kind || ev.k || ev.prestige, name, ev.tier, ev);
  // Стабильная личность титула — команда + турнир + сезон. Архивный ID может появиться позже.
  let row = AW.teamTitles.find(x => String(x.id || '') === id)
    || AW.teamTitles.find(x => x.team === team && x.n === name && Number(x.s) === season);
  if (row) {
    let changed = false;
    if (row.k !== kind) { row.k = kind; changed = true; }
    if (archiveId && row.a !== archiveId) { row.a = archiveId; changed = true; }
    if (archiveId && row.id !== archiveId) { row.id = archiveId; changed = true; }
    if (!row.y) { row.y = Number(ev.year ?? ev.y) || yearOf(season); changed = true; }
    return changed;
  }
  AW.teamTitles.unshift({ id, n: name, s: season, y: Number(ev.year ?? ev.y) || yearOf(season), k: kind, team, a: archiveId || null, ts: Number(ev.ts) || Date.now() });
  return true;
}
// Existing low-tier/qualifier records remain in the award ledger as result markers.
// The common renderer below guarantees they never become cup-shaped trophies.

// Перед выдачей наград фиксируем составы участников в архиве. Раньше эта работа
// выполнялась внешней v27-обёрткой ПОСЛЕ awardTournament, из-за чего MVP считался
// по текущим составам клубов, а не по ростерам завершившегося турнира.
function captureEventRosters(id, participantNames) {
  try {
    const snap = window.hubArchiveExport?.()?.[id];
    if (!snap) return;
    const rost = snap.rost && typeof snap.rost === 'object' ? snap.rost : (snap.rost = {});
    let changed = false;
    (participantNames || []).forEach(value => {
      const name = typeof value === 'string' ? value : value?.name;
      if (!name || (Array.isArray(rost[name]) && rost[name].length >= 5)) return;
      const team = teams.find(x => x.name === name);
      if (!team) return;
      try { if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(team); } catch (e) {}
      const players = Array.isArray(team.players) ? team.players : [];
      const starters = players.filter(p => p && p.nick && (!p.status || p.status === 'STARTER'));
      const lineup = (starters.length >= 5 ? starters : players.filter(p => p && p.nick)).slice(0, 5);
      if (!lineup.length) return;
      rost[name] = lineup.map(p => ({ nick: p.nick, role: p.role, firepower: +p.firepower || 0,
        clutch: +p.clutch || 0, utility: +p.utility || 0, tacticalIQ: +p.tacticalIQ || 0,
        country: p.country || '', flag: p.flag || '', age: p.age || null }));
      changed = true;
    });
    if (changed) window.hubArchivePersist?.(id);
  } catch (e) { console.warn('[trophies] не удалось зафиксировать ростеры турнира', e); }
}

function eventSnapshot(id) {
  try { return window.HS?.archive?.()?.[id] || window.hubArchiveExport?.()?.[id] || null; } catch (e) { return null; }
}

// Из сетки берём именно участников решающего финала, а не просто топ-2 по рейтингу.
// В double elimination игнорируем финалы верхней/нижней сетки и берём Grand Final.
function finalInfoForEvent(id, champion) {
  const snap = eventSnapshot(id);
  if (!snap) return { teams: [champion], match: null };
  const found = [];
  (snap.blocks || []).forEach(block => (block.sections || []).forEach(section => {
    const rounds = section.rounds || [];
    rounds.forEach((round, ri) => (round.ms || []).forEach(match => {
      if (!match?.a || !match?.b || !match?.w) return;
      const label = [block.title, section.title, round.title].filter(Boolean).join(' ');
      const excluded = /верхн|нижн|upper|lower|bronze|за\s*3|3-е\s*мест|third\s*place/i.test(label);
      if (excluded) return;
      const grand = /grand[\s-]*final|гранд[\s-]*финал/i.test(label);
      const earlierPlayoffRound = /semi[\s-]*final|quarter[\s-]*final|полуфинал|четвертьфинал/i.test(label);
      const final = !earlierPlayoffRound && /(?:^|[\s-])final(?:$|[\s(])|(?:^|[\s-])финал(?:$|[\s(])/i.test(label);
      const playoff = block.tab === 'playoff' && ri === rounds.length - 1;
      if (!grand && !final && !playoff) return;
      if (match.w !== champion && match.a !== champion && match.b !== champion) return;
      found.push({ match, rank: grand ? 4 : final ? 3 : 2 });
    }));
  }));
  found.sort((a, b) => b.rank - a.rank);
  const decisive = found.find(x => x.match.w === champion) || found[0];
  if (decisive) return { teams: [...new Set([decisive.match.a, decisive.match.b])], match: decisive.match };

  // Резерв для старых архивов, где раунд финала не был подписан, но места 1/2 есть.
  const results = Array.isArray(snap.results) ? snap.results : [];
  const first = results.find(x => Number(x?.p) === 1)?.n || snap.champion || champion;
  const second = results.find(x => Number(x?.p) === 2)?.n;
  return { teams: [...new Set([first, second].filter(Boolean))], match: null };
}

function eventPlayerRows(id, preparedStats = null) {
  try {
    const H = window.HS;
    if (!H?.stats) return [];
    if (!preparedStats) H.invalidate?.();
    const all = preparedStats || H.stats()?.P || {};
    return Object.values(all).map(player => {
      const event = player?.byEv?.[id];
      if (!event?.team || !event.s) return null;
      const line = H.line(event.s);
      if (!line || !Number.isFinite(Number(line.rating))) return null;
      return { nick: player.nick, team: event.team, line };
    }).filter(Boolean);
  } catch (e) { return []; }
}

function mvpPerformanceScore(line) {
  // Rating 3.0 — главный показатель; ADR, KAST, K/D, Impact, клатчи и объём
  // карт помогают разделить близкие результаты, но не перевешивают рейтинг.
  return Number(line.rating || 0) * 100
    + (Number(line.kpr || 0) - 0.65) * 12
    + (Number(line.adr || 0) - 70) * 0.12
    + (Number(line.kast || 0) - 65) * 0.10
    + (Number(line.kd || 0) - 1) * 4
    + (Number(line.impact || 0) - 1) * 4
    + Math.min(8, Number(line.clW || 0)) * 0.35
    + Math.min(12, Number(line.maps || 0)) * 0.15;
}

function removeInvalidEventMvp(id, finalists, rows, forceRecompute = false) {
  const raw = window.twAwardsExport?.() || AW;
  const next = { ...raw, p: { ...(raw.p || {}) } };
  const statsByNick = new Map(rows.map(x => [x.nick, x]));
  let changed = false, valid = false;
  Object.entries(next.p).forEach(([nick, old]) => {
    const rec = { ...(old || {}) }, list = Array.isArray(rec.mvp) ? rec.mvp.slice() : [];
    const keep = [];
    list.forEach(row => {
      const sameEvent = String(row?.id || '') === String(id) || String(row?.a || '') === String(id);
      if (!sameEvent) { keep.push(row); return; }
      if (forceRecompute) { changed = true; return; }
      const actual = statsByNick.get(nick);
      const actualTeam = actual?.team || row.team || '';
      // Нет статистики события, игрок не набрал минимальную выборку или команда
      // не играла в финале — старая медаль недостоверна.
      if (!actual || Number(actual.line.maps) < 3 || !finalists.includes(actualTeam)) { changed = true; return; }
      const fixed = row.team === actualTeam ? row : { ...row, team: actualTeam };
      if (fixed !== row) changed = true;
      keep.push(fixed); valid = true;
    });
    if (keep.length !== list.length || keep.some((x, i) => x !== list[i])) rec.mvp = keep;
    if (JSON.stringify(rec) !== JSON.stringify(old || {})) next.p[nick] = rec;
  });
  if (changed) {
    if (window.twAwardsImport) window.twAwardsImport(next);
    else { AW = next; awSave(); }
  }
  return valid;
}

// победа в турнире: запись результата всем игрокам состава; MVP — только для главных уровней
function awardTournament(ev) {
  if (!ev || !ev.champion || ev.champion === '—') return;
  ev = { ...ev, kind: normalizeTitleKind(ev.kind || ev.prestige, ev.name, ev.tier, ev) };
  if (ev.kind === 'show' || ev.kind === 'nations') return;
  const localOnly = ev.local === true || ev.isLocal === true || /(?:weekly|open cup|national league|regional league|2nd division|division 2|local cup)/i.test(String(ev.name || ''));
  if (localOnly) return;
  const titleChanged = rememberTeamTitle(ev);
  const t = teams.find(x => x.name === ev.champion);
  if (!t) { if (titleChanged) awSave(); return; }
  try { if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(t); } catch (e) {}
  const id = ev.archiveId || (ev.name + '|' + ev.season);
  let archivedPlayers = [];
  try { archivedPlayers = window.HS?.archive?.()?.[id]?.rost?.[t.name] || []; } catch (e) {}
  // v84: без архивного состава победу игрокам не записываем — нынешний состав мог смениться после турнира
  // (MVP при этом считается как раньше — по статистике турнира).
  const sourcePlayers = archivedPlayers.length ? archivedPlayers : (ev.__live ? (t.players || []) : []);
  const players = sourcePlayers.filter(p => p && p.nick && (!p.status || p.status === 'STARTER'));
  const roster = players.length >= 5 ? players : sourcePlayers;
  roster.forEach(p => {
    if (!p || !p.nick) return;
    const achievement = { id, n: ev.name, s: ev.season, y: yearOf(ev.season), k: ev.kind, team: t.name, a: ev.archiveId || null };
    if (window.RewardSystem?.addPlayerEventAchievement) window.RewardSystem.addPlayerEventAchievement(p.nick, achievement);
    else {
      const rec = P(p.nick);
      if (!rec.ti.some(x => x.id === id)) rec.ti.unshift(achievement);
    }
  });
  // MVP-медали — только за Major, S-Tier и Tier-1. Tier-2, Tier-3 и квалификации
  // сохраняют отдельную отметку результата, но никогда не создают кубок/MVP.
  if (!['major', 'elite', 'regular'].includes(String(ev.kind || ''))) { if (titleChanged || roster.length) awSave(); return; }

  const finalInfo = finalInfoForEvent(id, t.name);
  const finalists = finalInfo.teams.includes(t.name) ? finalInfo.teams : [t.name];
  const rows = eventPlayerRows(id, ev.__statsData || null);
  if (removeInvalidEventMvp(id, finalists, rows, ev.__recomputeMvp === true)) { awSave(); return; }

  // В MVP участвуют только игроки команд, реально дошедших до финала,
  // с достаточной выборкой по картам. Рандомная подмена рейтинга на OVR удалена.
  const eligible = rows.filter(x => finalists.includes(x.team) && x.line.maps >= 3)
    .map(x => ({ ...x, score: mvpPerformanceScore(x.line) }));
  const champions = eligible.filter(x => x.team === t.name).sort((a, b) => b.score - a.score || b.line.rating - a.line.rating || b.line.maps - a.line.maps);
  const runnerUp = finalists.find(name => name !== t.name);
  const runners = runnerUp ? eligible.filter(x => x.team === runnerUp)
    .sort((a, b) => b.score - a.score || b.line.rating - a.line.rating || b.line.maps - a.line.maps) : [];
  const bestChampion = champions[0] || null;
  const secondChampion = champions[1] || null;
  let best = bestChampion;

  // Исключение для проигравшего финалиста крайне редкое: Rating 3.0 >= 1.30,
  // минимум 3 карты, преимущество >= 0.12 над лидером чемпиона, нет явного MVP
  // у чемпиона и финальная серия закончилась со счётом 2:1 / 3:2.
  const losingStar = runners[0] || null;
  const finalScore = finalInfo.match?.s;
  const finalMaps = Array.isArray(finalInfo.match?.mp) ? finalInfo.match.mp : [];
  // Для BO1 счёт серии всегда 1:0, поэтому близость определяем по раундам карты.
  // Для BO3/BO5 — по счёту карт (2:1 или 3:2).
  const isBo1 = Number(finalInfo.match?.bo) === 1 || finalMaps.length === 1;
  const closeFinal = isBo1
    ? finalMaps.length === 1 && Math.abs(Number(finalMaps[0]?.[1]) - Number(finalMaps[0]?.[2])) <= 5
    : Array.isArray(finalScore) && finalScore.length === 2
      && Math.abs(Number(finalScore[0]) - Number(finalScore[1])) <= 1;
  // Исключение для проигравшего финалиста допустимо только при достаточной
  // выборке игроков чемпиона: иначе нельзя надёжно утверждать, что у чемпиона
  // не было своего лидера.
  const noClearChampionLeader = champions.length >= 3 && !!bestChampion && !!secondChampion
    && bestChampion.line.rating - secondChampion.line.rating < 0.08;
  if (bestChampion && losingStar && closeFinal && noClearChampionLeader
      && losingStar.line.rating >= 1.30
      && losingStar.line.rating - bestChampion.line.rating >= 0.12) best = losingStar;

  if (best) {
    const mvp = { id, n: ev.name, s: ev.season, y: yearOf(ev.season), k: ev.kind,
      team: best.team, finalists: finalists.slice(), rating: Number(best.line.rating.toFixed(3)), maps: best.line.maps };
    if (window.RewardSystem?.addPlayerMvp) window.RewardSystem.addPlayerMvp(best.nick, mvp);
    else P(best.nick).mvp.unshift(mvp);
  }
  // v84: EVP — лучшие игроки турнира после MVP (не только финалисты), как у HLTV.
  try {
    if (window.RewardSystem?.addPlayerEvp && ev.__recomputeMvp !== true) {
      const evpCount = ev.kind === 'major' ? 5 : 3;
      rows.filter(x => x.line.maps >= 3 && Number(x.line.rating) >= 1.10 && (!best || x.nick !== best.nick))
        .map(x => ({ ...x, score: mvpPerformanceScore(x.line) })).sort((a, b) => b.score - a.score).slice(0, evpCount)
        .forEach(x => window.RewardSystem.addPlayerEvp(x.nick, { id, n: ev.name, s: ev.season, y: yearOf(ev.season), k: ev.kind, team: x.team, rating: Number(x.line.rating.toFixed(3)), maps: x.line.maps }));
    }
  } catch (e) { console.warn('[trophies] EVP', e); }
  awSave();
}

// При первом запуске после обновления пересчитываем уже сохранённые MVP-медали.
// Это исправляет неверные награды в старых сейвах, а не только в новых турнирах.
// Статистику строим один раз на весь проход, чтобы не пересобирать большую историю
// отдельно для каждого турнира.
function reconcileExistingMvpAwards() {
  try {
    const raw = window.twAwardsExport?.() || AW;
    const ids = new Set();
    Object.values(raw.p || {}).forEach(rec => (rec?.mvp || []).forEach(row => {
      const id = String(row?.a || row?.id || '');
      if (id) ids.add(id);
    }));
    if (!ids.size || !window.HS?.stats) return 0;
    const snapshots = window.hubArchiveExport?.() || {};
    const events = [...ids].map(id => {
      const snap = snapshots[id];
      const finalists = snap ? finalInfoForEvent(id, snap.champion).teams : [];
      return { id, snap, finalists };
    }).filter(x => x.snap && x.snap.champion && x.snap.champion !== '—'
      && ['major', 'elite', 'regular'].includes(normalizeTitleKind(x.snap.prestige || x.snap.kind, x.snap.name, x.snap.tier, x.snap))
      // Старый архив без снимков обоих финалистов нельзя достоверно пересчитать:
      // HS.stats в таком случае подставил бы нынешние клубные составы.
      && x.finalists.length === 2 && x.finalists.every(name => Array.isArray(x.snap.rost?.[name]) && x.snap.rost[name].length >= 5));
    if (!events.length) return 0;
    window.HS.invalidate?.();
    const statsData = window.HS.stats()?.P || {};
    let checked = 0;
    events.forEach(({ id, snap }) => {
      const kind = normalizeTitleKind(snap.prestige || snap.kind, snap.name, snap.tier, snap);
      awardTournament({ name: snap.name, season: snap.season, year: snap.year, kind,
        champion: snap.champion, archiveId: id, __recomputeMvp: true, __statsData: statsData });
      checked++;
    });
    if (checked) {
      console.info(`[trophies] пересчитаны MVP старых турниров: ${checked}`);
      try { window.hltvSiteReset?.(); } catch (e) {}
    }
    return checked;
  } catch (e) {
    console.warn('[trophies] не удалось перепроверить старые MVP', e);
    return 0;
  }
}

// v33: Rating 3.0 (формула HLTV: KAST, KPR, DPR, Impact, ADR) из статистики архива портала
function statOf(nick, season, evId) {
  // v131: без принудительного сброса кэша — HS.stats() сам подхватывает новые турниры по ревизии архива (сброс = полная пересборка по всему архиву на каждый вызов)
  try { const H = window.HS; if (!H || !H.stats) return null; const o = H.stats().P[nick]; if (!o) return null;
    const src = evId ? o.byEv[evId]?.s : season != null ? o.bySeason[season] : o.all; return src && src.maps ? H.line(src) : null; } catch (e) { return null; }
}
// Старый генератор сезонных наград удалён: годовой Top-20 и персональные
// награды формирует только V36Fixes, а запись выполняет RewardSystem.

/* ---- хуки движка ---- */
const origT1 = window.hubArchiveTier1;
window.hubArchiveTier1 = function (ct) {
  const r = origT1 ? origT1.apply(this, arguments) : undefined;
  try {
    captureEventRosters(ct?.hubArchiveId, ct?.participants);
    const champ = Object.entries(ct?.placements || {}).find(([, p]) => p.place === 1)?.[0];
    awardTournament({ name: ct.name, season: ct.season, kind: ct.isMajor ? 'major' : ct.isElite ? 'elite' : 'regular', champion: champ, archiveId: ct.hubArchiveId });
  } catch (e) { console.warn('[trophies] tier1', e); }
  return r;
};
const origPar = window.hubArchiveParallel;
window.hubArchiveParallel = function (ev) {
  const r = origPar ? origPar.apply(this, arguments) : undefined;
  try {
    const archiveId = 'P-' + ev.id;
    captureEventRosters(archiveId, ev?.participants);
    const kind = normalizeTitleKind(ev.kind, ev.name, ev.tier, ev);
    if (kind === 'qual') {
      const slots = Math.max(1, Number(ev.qual?.slots) || 1);
      const advancing = [...new Set((ev.placements || []).slice(0, slots).filter(Boolean))];
      advancing.forEach(team => awardTournament({ name: ev.name, season: ev.season, year: ev.year, tier: 'qual', kind: 'qual', qual: ev.qual || true,
        champion: team, archiveId }));
    } else {
      awardTournament({ name: ev.name, season: ev.season, year: ev.year, tier: ev.tier, kind,
        champion: ev.winner || (ev.placements || [])[0], archiveId });
    }
  } catch (e) { console.warn('[trophies] parallel', e); }
  return r;
};
if (typeof finalizeTournamentRating === 'function') {
  const origFin = finalizeTournamentRating;
  // Индивидуальные награды теперь считаются отдельным годовым календарным циклом (см. v36-fixes.js),
  // поэтому окончание сезона летом не запускает Top-20 и номинации.
  finalizeTournamentRating = function () { return origFin.apply(this, arguments); }; // eslint-disable-line no-global-assign
}

// База архива загружается из IndexedDB асинхронно. Ждём её готовности и только
// затем сверяем старые MVP, когда уже зарегистрированы HS и единый RewardSystem.
// v131: скрипты могут запускаться уже после события load — тогда сразу
((fn) => { if (document.readyState === 'complete') setTimeout(fn, 0); else window.addEventListener('load', fn); })(() => {
  const ready = window.hubArchiveReady;
  Promise.resolve(ready).catch(() => false).then(() => {
    setTimeout(() => reconcileExistingMvpAwards(), 0);
  });
}, { once: true });

/* ---- полоса трофеев ---- */
let tipEl = null;
function tip() { return tipEl || (tipEl = Object.assign(document.body.appendChild(document.createElement('div')), { className: 'tw-tip', role: 'tooltip' })); }
function showTip(anchor, html) {
  const el = tip(); el.innerHTML = html; el.classList.add('on');
  const rc = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  const x = Math.max(8, Math.min(innerWidth - w - 8, rc.left + rc.width / 2 - w / 2));
  let y = rc.top - h - 10; if (y < 8) y = rc.bottom + 10;
  el.style.left = x + 'px'; el.style.top = y + 'px';
}
function hideTip() { tipEl?.classList.remove('on'); }

const LISTS = { t: [], p: [] };
function tileHtml(it, i, ns) {
  const badge = it.count > 1 ? `<span class="tw-b cnt">${it.count}</span>` : it.star ? '<span class="tw-b star">★</span>' : it.yr ? `<span class="tw-b yr">'${String(it.yr).slice(-2)}</span>` : '';
  return `<button type="button" class="tw-tile${it.open ? '' : ' static'}${it.kind ? ' k-' + it.kind : ''}" data-tw="${ns}${i}" aria-label="${esc2(it.title)}" style="flex:0 0 164px;width:164px;height:174px;min-width:164px;"><span class="tw-img" style="width:154px;height:166px;">${it.svg}</span>${badge}</button>`;
}
function stripHtml(items, empty, ns) {
  LISTS[ns] = items;
  if (!items.length) return `<div class="tw-empty">${empty}</div>`;
  return items.map((it, i) => tileHtml(it, i, ns)).join('');
}
const itemOf = el => { const k = el.dataset.tw || ''; return (LISTS[k[0]] || [])[+k.slice(1)]; };
function archive() { try { return window.hubArchiveExport ? window.hubArchiveExport() : {}; } catch (e) { return {}; } }
function kindOf(h, snap) {
  if (snap) return normalizeTitleKind(snap.prestige || snap.kind || h?.kind || h?.k, snap.name || h?.tournament || h?.n, snap.tier ?? h?.tier, snap);
  if (h?.isMajor) return 'major';
  if (h?.isElite) return 'elite';
  if (h?.kind || h?.k || h?.qual || isQualifierRecord(h)) return normalizeTitleKind(h.kind || h.k || 'qual', h.tournament || h.n, h.tier, h);
  if (/Фоновый/.test(h?.placeTitle || '')) return /Academy|Junior|NXT|Ares|Академ/i.test(h?.tournament || '') ? 'academy' : (h?.fieldProfile === 'medium' ? 'tier2' : 'tier3');
  return normalizeTitleKind('', h?.tournament || h?.n, h?.tier);
}
// Qualification is an advancement result, not a championship. Keep a marker
// for every team that actually passed the qualifier; never invent a winner.
function qualifiedTeams(snap) {
  if (!snap || normalizeTitleKind(snap.prestige || snap.kind, snap.name, snap.tier, snap) !== 'qual') return [];
  const clean = list => [...new Set((Array.isArray(list) ? list : []).map(x => typeof x === 'string' ? x : x?.team || x?.n || x?.name).filter(x => typeof x === 'string' && x.trim()))];
  let names = clean(snap.qualified);
  if (!names.length) names = clean((snap.results || []).filter(r => /qualif|прошл|допущ/i.test(String(r?.t || r?.label || ''))));
  if (!names.length) {
    const slots = Math.max(0, Number(snap.qual?.slots || snap.qualSlots || snap.qualificationSlots) || 0);
    if (slots) names = clean((snap.results || []).slice().sort((a,b) => (Number(a?.p)||999) - (Number(b?.p)||999)).filter(r => (Number(r?.p)||999) <= slots));
  }
  return names;
}
function teamAchievementRows(teamName, teamObj) {
  if (!teamName) return [];
  const arch = archive(), rows = new Map();
  const add = (name, season, kind, id, extra = {}) => {
    if (!name) return;
    const k = normalizeTitleKind(kind, name, extra.tier, extra.meta || extra);
    const s = Math.max(1, Number(season) || 1), key = `${teamName}|${name}|${s}`;
    const prior = rows.get(key);
    const row = { team: teamName, name, season: s, year: Number(extra.year) || yearOf(s), kind: k,
      id: id && arch[id] ? String(id) : '', place: Number(extra.place) || null, marker: !isCupKind(k),
      snapshot: extra.snapshot || (id ? arch[id] : null), history: extra.history || null, ts: Number(extra.ts) || 0 };
    const rank = x => x.snapshot ? 3 : x.history ? 2 : 1;
    if (!prior || rank(row) > rank(prior)) rows.set(key, row);
  };
  (AW.teamTitles || []).forEach(x => {
    if (!x || x.team !== teamName || !x.n) return;
    const id = String(x.a || x.id || ''), snap = id && arch[id] ? arch[id] : null;
    const k = normalizeTitleKind(x.k, x.n, snap?.tier, snap || x);
    if (k === 'qual' && snap && !qualifiedTeams(snap).includes(teamName)) return;
    add(x.n, x.s, k, id, { year: x.y, ts: x.ts, tier: snap?.tier, meta: snap || x, snapshot: snap });
  });
  ((teamObj && teamObj.history) || teams.find(t => t.name === teamName)?.history || []).forEach(h => {
    if (!h || h.isBootcamp || h.isSeasonAward || !h.tournament) return;
    const snap = h.archiveId ? arch[h.archiveId] : null, kind = kindOf(h, snap);
    if (kind === 'qual') {
      const qualified = snap ? qualifiedTeams(snap).includes(teamName) : Number(h.place) === 1;
      if (qualified) add(h.tournament, h.season, kind, h.archiveId, { place: h.place, tier: snap?.tier, meta: snap || h, snapshot: snap, history: h, year: snap?.year, ts: snap?.ts });
      return;
    }
    if (Number(h.place) !== 1) return;
    add(h.tournament, h.season, kind, h.archiveId, { place: h.place, tier: snap?.tier ?? h.tier, meta: snap || h, snapshot: snap, history: h, year: snap?.year, ts: snap?.ts });
  });
  Object.values(arch).forEach(snap => {
    if (!snap || !snap.name || ['show', 'nations'].includes(String(snap.prestige || snap.kind || '').toLowerCase())) return;
    const kind = normalizeTitleKind(snap.prestige || snap.kind, snap.name, snap.tier, snap);
    const isTeamAchievement = kind === 'qual' ? qualifiedTeams(snap).includes(teamName) : snap.champion === teamName;
    if (!isTeamAchievement) return;
    add(snap.name, snap.season, kind, snap.id, { year: snap.year, tier: snap.tier, meta: snap, snapshot: snap, ts: snap.ge || snap.gs || snap.ts });
  });
  return [...rows.values()].sort((a,b) => b.season - a.season || b.ts - a.ts || a.name.localeCompare(b.name));
}
function playerAchievementRows(nick, teamObj) {
  if (!nick) return [];
  const rec = AW.p[nick] || { ti: [] }, arch = archive(), rows = new Map();
  const add = (x, source, snapshot) => {
    if (!x) return;
    const name = String(x.n || x.name || x.tournament || '').trim();
    if (!name) return;
    const season = Math.max(1, Number(x.s ?? x.season) || 1);
    const kind = normalizeTitleKind(x.k || x.kind || x.prestige, name, snapshot?.tier ?? x.tier, snapshot || x);
    const team = String(x.team || x.champion || '').trim();
    const key = `${team}|${name}|${season}`;
    const row = { id: String(x.a || x.id || snapshot?.id || ''), a: String(x.a || x.id || snapshot?.id || '') || null,
      n: name, name, s: season, season, y: Number(x.y || x.year || snapshot?.year) || yearOf(season), year: Number(x.y || x.year || snapshot?.year) || yearOf(season),
      k: kind, kind, team, qual: kind === 'qual', marker: !isCupKind(kind), snapshot: snapshot || null,
      h: x.h || x.history || null, ts: Number(x.ts || snapshot?.ge || snapshot?.gs || snapshot?.ts) || 0, _source: source };
    const previous = rows.get(key);
    const rank = value => value.snapshot ? 4 : value._source === 'archive' ? 3 : value._source === 'history' ? 2 : 1;
    if (!previous || rank(row) > rank(previous)) rows.set(key, row);
  };
  // v84: титул засчитывается игроку, только если он был в составе победившей команды на том турнире.
  // Раньше новичку клуба доставались все прошлые кубки команды (из team.history и ошибочных записей журнала).
  const inRoster = (snap, team) => { const r = snap?.rost?.[team]; return !Array.isArray(r) || r.length < 5 ? null : r.some(q => q && (q.nick || q) === nick); };
  (rec.ti || []).forEach(x => {
    const id = String(x?.a || x?.id || ''), snap = id ? arch[id] : null;
    if (snap && x?.team && inRoster(snap, x.team) === false) return;
    add(x, 'ledger', snap);
  });
  if (teamObj) (teamObj.history || []).forEach(h => {
    if (!h || h.isBootcamp || h.isSeasonAward || Number(h.place) !== 1 || !h.tournament) return;
    const snap = h.archiveId ? arch[h.archiveId] : null;
    const kind = kindOf(h, snap);
    if (kind === 'qual' && snap && !qualifiedTeams(snap).includes(teamObj.name)) return;
    if (inRoster(snap, teamObj.name) !== true) return; // без подтверждённого состава — не приписываем игроку
    add({ n: h.tournament, s: h.season, y: snap?.year, k: kind, team: teamObj.name, a: h.archiveId,
      h, ts: snap?.ge || snap?.gs || snap?.ts }, 'history', snap);
  });
  Object.values(arch).forEach(snap => {
    if (!snap || !snap.name || ['show', 'nations'].includes(String(snap.prestige || snap.kind || '').toLowerCase())) return;
    const kind = normalizeTitleKind(snap.prestige || snap.kind, snap.name, snap.tier, snap);
    if (kind === 'qual') {
      qualifiedTeams(snap).forEach(teamName => {
        const roster = snap.rost?.[teamName] || [];
        if (roster.some(q => q && q.nick === nick)) add({ n: snap.name, s: snap.season, y: snap.year, k: kind, team: teamName, a: snap.id, ts: snap.ge || snap.gs || snap.ts }, 'archive', snap);
      });
      return;
    }
    const teamName = String(snap.champion || '');
    if (!teamName || teamName === '—') return;
    const roster = snap.rost?.[teamName] || [];
    if (roster.some(q => q && q.nick === nick)) add({ n: snap.name, s: snap.season, y: snap.year, k: kind, team: teamName, a: snap.id, ts: snap.ge || snap.gs || snap.ts }, 'archive', snap);
  });
  return [...rows.values()].map(({ _source, ...row }) => row)
    .sort((a, b) => b.season - a.season || b.ts - a.ts || a.name.localeCompare(b.name));
}
window.twQualifiedTeams = qualifiedTeams;
window.twTeamAchievements = teamAchievementRows;
window.twPlayerAchievements = playerAchievementRows;
// Миграция: восстанавливаем командные титулы из уже сохранённых личных наград,
// team.history и доступного архива. После этого очистка старых сеток не удалит кубки.
function migrateTeamTitleLedger() {
  let changed = false; const arch = archive();
  (teams || []).forEach(t => (t.history || []).forEach(h => {
    if (h.place !== 1 || h.isBootcamp || h.isSeasonAward || !h.tournament) return;
    const snap = h.archiveId ? arch[h.archiveId] : null;
    changed = rememberTeamTitle({ champion: t.name, name: h.tournament, season: h.season, year: snap?.year, kind: kindOf(h, snap), tier: snap?.tier ?? h.tier, qual: !!snap?.qual || !!h.qual, archiveId: h.archiveId || '' }) || changed;
  }));
  Object.values(arch).forEach(snap => {
    if (!snap || !snap.champion || snap.champion === '—' || !snap.name || ['show', 'nations'].includes(String(snap.prestige || snap.kind || '').toLowerCase())) return;
    changed = rememberTeamTitle({ champion: snap.champion, name: snap.name, season: snap.season, year: snap.year, kind: snap.prestige || snap.kind, tier: snap.tier, qual: !!snap.qual, archiveId: snap.id }) || changed;
  });
  Object.values(AW.p || {}).forEach(rec => (rec?.ti || []).forEach(x => {
    if (!x?.team || !x.n) return;
    const savedId = String(x.a || x.id || '');
    changed = rememberTeamTitle({ champion: x.team, name: x.n, season: x.s, year: x.y, kind: x.k, qual: !!x.qual, archiveId: savedId && !savedId.includes('|') ? savedId : '' }) || changed;
  }));
  // Схлопываем дубликаты, которые могли накопиться в старых сохранениях
  // при миграции с ID истории на ID архива.
  const uniqueTitles = new Map();
  (AW.teamTitles || []).forEach(x => {
    if (!x || !x.team || !x.n) return;
    const key = `${x.team}|${x.n}|${Math.max(1, Number(x.s) || 1)}`;
    const prior = uniqueTitles.get(key);
    if (!prior) { uniqueTitles.set(key, x); return; }
    const priorHasArchive = !!(prior.a && arch[prior.a]), nextHasArchive = !!(x.a && arch[x.a]);
    if ((!priorHasArchive && nextHasArchive) || (!prior.a && x.a)) {
      if (x.a) prior.a = x.a;
      if (x.id) prior.id = x.id;
      if (x.y) prior.y = x.y;
      prior.k = normalizeTitleKind(x.k, x.n, arch[x.a]?.tier, x);
    }
    if (!prior.y && x.y) prior.y = x.y;
    if (prior.k !== normalizeTitleKind(prior.k, prior.n, arch[prior.a]?.tier, prior)) prior.k = normalizeTitleKind(prior.k, prior.n, arch[prior.a]?.tier, prior);
    changed = true;
  });
  if (uniqueTitles.size !== (AW.teamTitles || []).length) changed = true;
  AW.teamTitles = [...uniqueTitles.values()];
  const titleById = new Map(); AW.teamTitles.forEach(x => { if (x?.id) titleById.set(String(x.id), x); if (x?.a) titleById.set(String(x.a), x); });
  Object.values(AW.p || {}).forEach(rec => (rec?.ti || []).forEach(x => {
    const ledger = titleById.get(String(x.a || x.id || ''));
    const kind = normalizeTitleKind(ledger?.k || x.k, x.n, x.a ? arch[x.a]?.tier : null, x);
    if (x.k !== kind) { x.k = kind; changed = true; }
  }));
  if (changed) awSave();
}
migrateTeamTitleLedger();
function teamItems(t) {
  const arch = archive(), out = [], seen = new Set();
  const teamAwards = (window.RewardSystem?.getTeamSpecialAwards(t.name)
    || window.RewardSystem?.getTeamAwards(t.name)
    || (AW.teamAwards || []).filter(a => a.team === t.name)).filter(a => a.type !== 'grand-slam');
  (seasonState?.hallOfFame || []).forEach(h => {
    if (h.champion !== t.name) return;
    // HOF остаётся историей сезона, но после миграции это уже не вторая копия
    // награды: карточку рисует канонический реестр team-season.
    if (teamAwards.some(a => a.type === 'team-season' && Number(a.season) === Number(h.season))) return;
    const id = `hof|${h.season}|${h.champion}`; if (seen.has(id)) return; seen.add(id);
    out.push({ svg: awardSvg('team', h.year || yearOf(h.season)), yr: h.year || yearOf(h.season), title: `Команда года · сезон ${h.season}`,
      sub: `${h.year || yearOf(h.season)} · ${h.scorePts ?? '—'} pts`, big: () => awardSvg('team', h.year || yearOf(h.season)), s: h.season, order: 3 });
  });
  teamAwards.forEach(a => {
    const yr = Number(a.year) || yearOf(a.season), key = a.id || `${a.type}|${a.team}|${yr}`;
    if (seen.has(key)) return; seen.add(key);
    out.push({ svg: awardSvg(a.type, yr), yr, title: `${a.title || (AWARD_DEF[a.type]?.title || a.type)} · ${yr}`,
      sub: `${yr} · ${a.scorePts != null ? Math.round(a.scorePts) + ' очков сезона' : 'командная награда'}`,
      big: () => awardSvg(a.type, yr), s: Number(a.season) || Math.max(1, yr - 2025), order: 6 });
  });
  const pushCup = (name, season, kind, id, snap, hist) => {
    // Один титул может прийти из реестра, team.history и архива с разными ID.
    const dedupe = `${t.name}|${String(name || '').trim()}|${Math.max(1, Number(season) || 1)}`;
    if (seen.has(dedupe)) return; seen.add(dedupe);
    const openId = id && arch[id] ? id : null;
    out.push({ svg: trophySvg(name, season, kind), star: kind === 'major', kind, title: name,
      sub: `Сезон ${season} (${yearOf(season)}) · ${KIND_LABEL[kind] || ''}`, open: !!openId, a: openId,
      h: hist || { tournament: name, season, placeTitle: '1 место' }, team: t.name,
      big: () => trophySvg(name, season, kind), s: season, order: kind === 'major' ? 2 : 1 });
  };
  (window.RewardSystem?.getTeamEventAchievements(t.name, t) || teamAchievementRows(t.name, t)).forEach(x => {
    pushCup(x.name, x.season, x.kind, x.id, x.snapshot, x.history);
  });
  out.sort((a, b) => (b.s || 0) - (a.s || 0) || b.order - a.order);
  return out;
}
function playerItems(p, t) {
  const rec = window.RewardSystem?.getPlayerAwards(p.nick) || AW.p[p.nick] || { mvp: [], ti: [], top: [], aw: [] }, out = [], arch = archive();
  rec.mvp = (rec.mvp || []).filter(x => ['major', 'elite', 'regular'].includes(String(x.k || '').toLowerCase()));
  rec.aw = rec.aw || []; rec.top = rec.top || []; rec.ti = rec.ti || [];
  if (rec.mvp.length) out.push({ svg: medalSvg('mvp'), count: rec.mvp.length, title: `MVP турниров: ${rec.mvp.length}`,
    sub: rec.mvp.slice(0, 6).map(x => `${x.n} (${x.y})`).join('<br>') + (rec.mvp.length > 6 ? '<br>…' : ''), big: () => medalSvg('mvp'), s: 1e9 });
  rec.aw.forEach(a => out.push({ svg: awardSvg(a.type, a.y), yr: a.y, title: (AWARD_DEF[a.type] || {}).title || a.type, sub: `${a.y} · ${esc2(a.team || '')}`, big: () => awardSvg(a.type, a.y), s: a.s, order: 5 }));
  rec.top.forEach(x => out.push({ svg: top20Svg(x.r, x.y), yr: x.y, title: `Топ-20 игроков ${x.y}: #${x.r}${x.mvpCount ? ` · ${x.mvpCount} MVP` : ''}`, sub: `${x.mvpCount ? `${x.mvpCount} MVP · ` : ''}${esc2(x.team || '')}`, big: () => top20Svg(x.r), s: x.s, order: 4 }));
  const titles = window.RewardSystem?.getPlayerEventAchievements(p.nick, t) || playerAchievementRows(p.nick, t);
  titles.forEach(x => out.push({ svg: trophySvg(x.n, x.s, x.k), star: x.k === 'major', kind: x.k, title: x.n,
    sub: `Сезон ${x.s} (${x.y || yearOf(x.s)}) · ${KIND_LABEL[x.k] || ''} · ${esc2(x.team || '')}`,
    open: !!(x.a && arch[x.a]), a: x.a && arch[x.a] ? x.a : null, h: x.h || { tournament: x.n, season: x.s, placeTitle: '1 место' }, team: x.team,
    big: () => trophySvg(x.n, x.s, x.k), s: x.s, order: x.k === 'major' ? 2 : 1 }));
  const head = out[0]?.count ? [out.shift()] : [];
  out.sort((a, b) => (b.s || 0) - (a.s || 0) || (b.order || 0) - (a.order || 0));
  return { items: head.concat(out), rec, titles };
}
function wireStrip(el) {
  if (!el || el._tw) return; el._tw = true;
  el.addEventListener('wheel', e => { if (el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
}
const tipFor = el => {
  const it = itemOf(el); if (!it) return;
  showTip(el, `<div class="tw-tip-img">${it.big ? it.big() : it.svg}</div><div class="tw-tip-txt"><b>${esc2(it.title)}</b>${it.sub ? `<small>${it.sub}</small>` : ''}` +
    (it.open ? `<small class="tw-tip-hint">${it.a && archive()[it.a] ? 'Нажмите — откроется сетка турнира' : 'Сетка турнира не сохранена'}</small>` : '') + '</div>');
};
document.addEventListener('mouseover', e => { const el = e.target.closest?.('.tw-tile'); if (el) tipFor(el); });
document.addEventListener('mouseout', e => { if (e.target.closest?.('.tw-tile')) hideTip(); });
document.addEventListener('focusin', e => { const el = e.target.closest?.('.tw-tile'); if (el) tipFor(el); });
document.addEventListener('focusout', e => { if (e.target.closest?.('.tw-tile')) hideTip(); });
document.addEventListener('click', e => {
  const el = e.target.closest?.('.tw-tile'); if (!el) return;
  const it = itemOf(el); if (!it || !it.open) return;
  hideTip(); if (typeof window.hubOpenTournament === 'function') window.hubOpenTournament(it.a, it.team, it.h);
});

/* ---- профиль команды ---- */
const origShow = window.showHistory;
window.showHistory = function (teamName) {
  const res = origShow.apply(this, arguments);
  try {
    const box = document.getElementById('trophy-cabinet'), t = teamName ? teams.find(x => x.name === teamName) : null;
    if (box && t) {
      box.classList.add('tw-strip', 'tw-team-strip-v28');
      box.style.setProperty('display', 'flex', 'important');
      box.style.setProperty('flex-wrap', 'nowrap', 'important');
      box.style.setProperty('min-height', '184px', 'important');
      box.style.setProperty('height', '184px', 'important');
      box.style.setProperty('overflow-x', 'auto', 'important');
      box.innerHTML = stripHtml(teamItems(t), 'Побед в турнирах пока нет. Кубок появляется за 1 место.', 't');
      box.scrollLeft = 0; wireStrip(box);
    }
  } catch (e) { console.warn('[trophies] team', e); }
  return res;
};

/* ---- окно игрока ---- */
function decoratePlayer(teamName, nick) {
  const ov = document.getElementById('hl-player-overlay'); const win = ov?.firstElementChild; if (!win) return;
  const t = teams.find(x => x.name === teamName) || null; const p = t?.players?.find(x => x.nick === nick) || (typeof transferState !== 'undefined' ? (transferState.freeAgents || []).find(x => x.nick === nick) : null) || (window.HS?.stats?.().P?.[nick]?.p || null); if (!p) return;
  const { items, rec, titles } = playerItems(p, t);
  const majors = titles.filter(x => x.k === 'major').length, majorMvp = rec.mvp.filter(x => x.k === 'major').length;
  const best = rec.top.reduce((m, x) => Math.min(m, x.r), 99);
  const chips = [
    majors ? `<span class="tw-chip gold"><b>${majors}</b> x Major winner</span>` : '',
    majorMvp ? `<span class="tw-chip slate"><b>${majorMvp}</b> x Major MVP</span>` : '',
    rec.mvp.length ? `<span class="tw-chip slate"><b>${rec.mvp.length}</b> x MVP</span>` : '',
    best < 99 ? `<span class="tw-chip orange">Топ-20: лучшее <b>#${best}</b></span>` : ''
  ].join('');
  win.querySelector('.tw-pl-ach')?.remove();
  const html = `<div class="tw-pl-ach"><div class="tw-ach-head"><span>Достижения игрока</span><span class="tw-chips">${chips || '<span class="tw-none">пока нет</span>'}</span></div>` +
    `<div class="tw-strip tw-pl-strip">${stripHtml(items, 'Трофеев пока нет — они появятся за победы в турнирах, MVP и места в топ-20 года.', 'p')}</div></div>`;
  const anchor = win.querySelector('.hl-pl-top');
  if (anchor) anchor.insertAdjacentHTML('afterend', html); else win.querySelector('.hl-win-body')?.insertAdjacentHTML('afterbegin', html);
  wireStrip(win.querySelector('.tw-pl-strip'));
}
document.addEventListener('click', e => { // срабатывает после обработчика хаба (он зарегистрирован раньше)
  const c = e.target.closest?.('.hl-pcard[data-nick], .hl-mate[data-mate]'); if (!c) return;
  const team = c.dataset.team, nick = c.dataset.nick || c.dataset.mate;
  try { decoratePlayer(team, nick); } catch (err) { console.warn('[trophies] player', err); }
});
if (typeof window.hubOpenPlayer === 'function') {
  const origOP = window.hubOpenPlayer;
  window.hubOpenPlayer = function (team, nick) { const r = origOP.apply(this, arguments); try { decoratePlayer(team, nick); } catch (e) {} return r; };
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
window.twDebug = { awardTournament, finalInfoForEvent, eventPlayerRows, mvpPerformanceScore, reconcileExistingMvpAwards }; // диагностика MVP; годовые награды формируются единым V36/RewardSystem
})();
