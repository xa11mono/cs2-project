/* v34 — флаги стран, нарисованные SVG. Эмодзи флагов Windows не показывает (вместо флага видно «GB»),
   поэтому все флаги в игре — картинки из этого модуля. ~75 стран; для неизвестного кода — аккуратная плашка
   с буквами. V34Flags.uri(code) — data-URI для <img>, V34Flags.html(code, cls) — готовый <img>. */
(function () {
'use strict';
const W = 60, Hh = 40;
const hs = cols => cols.map((c, i) => `<rect x="0" y="${(Hh / cols.length * i).toFixed(2)}" width="${W}" height="${(Hh / cols.length + .1).toFixed(2)}" fill="${c}"/>`).join('');
const vs = cols => cols.map((c, i) => `<rect x="${(W / cols.length * i).toFixed(2)}" y="0" width="${(W / cols.length + .1).toFixed(2)}" height="${Hh}" fill="${c}"/>`).join('');
const nordic = (bg, cr, inner) => `<rect width="${W}" height="${Hh}" fill="${bg}"/><rect x="16" y="0" width="${inner ? 9 : 7}" height="${Hh}" fill="${cr}"/><rect x="0" y="${inner ? 15.5 : 16.5}" width="${W}" height="${inner ? 9 : 7}" fill="${cr}"/>` + (inner ? `<rect x="18" y="0" width="5" height="${Hh}" fill="${inner}"/><rect x="0" y="17.5" width="${W}" height="5" fill="${inner}"/>` : '');
const star = (cx, cy, R, fill) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * .4 : R; p.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`); } return `<polygon points="${p.join(' ')}" fill="${fill}"/>`; };
const FLAGS = {
  RU: () => hs(['#fff', '#0039a6', '#d52b1e']), UA: () => hs(['#0057b7', '#ffd700']), BY: () => hs(['#c8313e', '#c8313e', '#4aa657']) + `<rect width="6" height="${Hh}" fill="#fff"/>`,
  KZ: () => `<rect width="${W}" height="${Hh}" fill="#00afca"/><circle cx="30" cy="18" r="7" fill="#fec50c"/><path d="M22 30q8 4 16 0" stroke="#fec50c" stroke-width="2" fill="none"/>`,
  DK: () => nordic('#c8102e', '#fff'), SE: () => nordic('#006aa7', '#fecc00'), NO: () => nordic('#ba0c2f', '#fff', '#00205b'), FI: () => nordic('#fff', '#002f6c'),
  FR: () => vs(['#0055a4', '#fff', '#ef4135']), DE: () => hs(['#000', '#dd0000', '#ffce00']), PL: () => hs(['#fff', '#dc143c']), CZ: () => hs(['#fff', '#d7141a']) + `<path d="M0 0L28 20L0 40z" fill="#11457e"/>`,
  SK: () => hs(['#fff', '#0b4ea2', '#ee1c25']) + `<path d="M10 9h14v14q0 7-7 10q-7-3-7-10z" fill="#fff"/><path d="M11 10h12v13q0 6-6 9q-6-3-6-9z" fill="#ee1c25"/><path d="M16 13h2v14h-2zM13 17h8v2h-8z" fill="#fff"/>`,
  HU: () => hs(['#ce2939', '#fff', '#477050']), RO: () => vs(['#002b7f', '#fcd116', '#ce1126']), BG: () => hs(['#fff', '#00966e', '#d62612']), RS: () => hs(['#c6363c', '#0c4076', '#fff']),
  BA: () => `<rect width="${W}" height="${Hh}" fill="#002395"/><path d="M16 0h28v40z" fill="#fecb00"/>` + [0, 1, 2, 3, 4, 5, 6].map(i => star(12 + i * 4.6, 2 + i * 5.6, 2.2, '#fff')).join(''),
  GB: () => `<rect width="${W}" height="${Hh}" fill="#012169"/><path d="M0 0L60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" stroke-width="3"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="12"/><path d="M30 0v40M0 20h60" stroke="#c8102e" stroke-width="7"/>`,
  NL: () => hs(['#ae1c28', '#fff', '#21468b']), BE: () => vs(['#000', '#fae042', '#ed2939']), PT: () => `<rect width="${W}" height="${Hh}" fill="#da291c"/><rect width="24" height="${Hh}" fill="#046a38"/><circle cx="24" cy="20" r="7" fill="#ffe900"/><circle cx="24" cy="20" r="4.5" fill="#da291c"/>`,
  ES: () => hs(['#aa151b', '#f1bf00', '#f1bf00', '#aa151b']), TR: () => `<rect width="${W}" height="${Hh}" fill="#e30a17"/><circle cx="22" cy="20" r="10" fill="#fff"/><circle cx="25" cy="20" r="8" fill="#e30a17"/>${star(35, 20, 5, '#fff')}`,
  IL: () => `<rect width="${W}" height="${Hh}" fill="#fff"/><rect y="4" width="${W}" height="5" fill="#0038b8"/><rect y="31" width="${W}" height="5" fill="#0038b8"/><path d="M30 12l7 12h-14zM30 28l-7-12h14z" fill="none" stroke="#0038b8" stroke-width="1.6"/>`,
  BR: () => `<rect width="${W}" height="${Hh}" fill="#009c3b"/><path d="M30 4L56 20L30 36L4 20z" fill="#ffdf00"/><circle cx="30" cy="20" r="9" fill="#002776"/><path d="M21 19q9-4 18 2" stroke="#fff" stroke-width="1.4" fill="none"/>`,
  AR: () => hs(['#74acdf', '#fff', '#74acdf']) + `<circle cx="30" cy="20" r="4" fill="#f6b40e"/>`, CL: () => `<rect width="${W}" height="${Hh}" fill="#fff"/><rect y="20" width="${W}" height="20" fill="#d52b1e"/><rect width="20" height="20" fill="#0039a6"/>${star(10, 10, 5, '#fff')}`,
  US: () => Array.from({ length: 13 }, (_, i) => `<rect y="${(i * Hh / 13).toFixed(2)}" width="${W}" height="${(Hh / 13 + .1).toFixed(2)}" fill="${i % 2 ? '#fff' : '#b22234'}"/>`).join('') + `<rect width="26" height="21.5" fill="#3c3b6e"/>` + Array.from({ length: 12 }, (_, i) => `<circle cx="${3.5 + (i % 4) * 6.3}" cy="${3.5 + Math.floor(i / 4) * 6.5}" r="1.1" fill="#fff"/>`).join(''),
  CA: () => vs(['#d52b1e', '#fff', '#fff', '#d52b1e']) + `<path d="M30 9l2 5 3-1-1 6 3-1-6 8-6-8 3 1-1-6 3 1z" fill="#d52b1e"/><rect x="29.3" y="26" width="1.4" height="5" fill="#d52b1e"/>`,
  AU: () => `<rect width="${W}" height="${Hh}" fill="#012169"/>${star(15, 30, 4, '#fff')}${star(45, 12, 2.4, '#fff')}${star(40, 22, 2.4, '#fff')}${star(50, 24, 2.2, '#fff')}${star(45, 33, 2.4, '#fff')}<path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.5"/>`,
  MN: () => vs(['#c4272f', '#015197', '#c4272f']) + `<circle cx="10" cy="14" r="3" fill="#f9cf02"/><rect x="7" y="19" width="6" height="12" fill="#f9cf02"/>`,
  CN: () => `<rect width="${W}" height="${Hh}" fill="#ee1c25"/>${star(11, 11, 6, '#ffff00')}${star(21, 4.5, 2, '#ffff00')}${star(24, 9, 2, '#ffff00')}${star(24, 15, 2, '#ffff00')}${star(21, 19, 2, '#ffff00')}`,
  LV: () => hs(['#9e3039', '#9e3039', '#fff', '#9e3039', '#9e3039']), LT: () => hs(['#fdb913', '#006a44', '#c1272d']), EE: () => hs(['#0072ce', '#000', '#fff']),
  MK: () => `<rect width="${W}" height="${Hh}" fill="#d20000"/><path d="M30 20L0 0h10zM30 20L60 0H50zM30 20L0 40h10zM30 20L60 40H50zM30 20L0 16v8zM30 20L60 16v8zM30 20L26 0h8zM30 20L26 40h8z" fill="#ffe600"/><circle cx="30" cy="20" r="6" fill="#ffe600" stroke="#d20000" stroke-width="1.2"/>`,
  ME: () => `<rect width="${W}" height="${Hh}" fill="#c40308"/><rect x="2" y="2" width="56" height="36" fill="none" stroke="#d3ae3b" stroke-width="2"/><circle cx="30" cy="20" r="7" fill="#d3ae3b"/>`,
  XK: () => `<rect width="${W}" height="${Hh}" fill="#244aa5"/><path d="M22 18l8-6 6 4 2 8-6 6-8-2z" fill="#d0a650"/>` + [0, 1, 2, 3, 4, 5].map(i => star(16 + i * 5.6, 8 - Math.sin(i / 5 * Math.PI) * 3, 1.8, '#fff')).join(''),
  ZA: () => `<rect width="${W}" height="${Hh}" fill="#fff"/><rect width="${W}" height="13" fill="#e03c31"/><rect y="27" width="${W}" height="13" fill="#001489"/><path d="M0 0L26 20L0 40z" fill="#fff"/><path d="M0 4L21 20L0 36z" fill="#000"/><path d="M0 6l18 14L0 34" stroke="#ffb612" stroke-width="2.5" fill="none"/><path d="M24 20H60" stroke="#007749" stroke-width="9"/><path d="M0 0L28 20L0 40" stroke="#007749" stroke-width="6" fill="none"/>`
};

const disc = (cx, cy, r, f) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"/>`;
const crescent = (cx, cy, r, f, bg) => disc(cx, cy, r, f) + disc(cx + r * .35, cy, r * .82, bg);
Object.assign(FLAGS, {
  AT: () => hs(['#ed2939', '#fff', '#ed2939']), IT: () => vs(['#009246', '#fff', '#ce2b37']), IE: () => vs(['#169b62', '#fff', '#ff883e']),
  CH: () => `<rect width="${W}" height="${Hh}" fill="#d52b1e"/><rect x="26" y="9" width="8" height="22" fill="#fff"/><rect x="19" y="16" width="22" height="8" fill="#fff"/>`,
  GR: () => Array.from({ length: 9 }, (_, i) => `<rect y="${(i * Hh / 9).toFixed(2)}" width="${W}" height="${(Hh / 9 + .1).toFixed(2)}" fill="${i % 2 ? '#fff' : '#0d5eaf'}"/>`).join('') + `<rect width="22" height="22.2" fill="#0d5eaf"/><rect x="9" width="4" height="22.2" fill="#fff"/><rect y="9" width="22" height="4" fill="#fff"/>`,
  SI: () => hs(['#fff', '#005ce6', '#ed1c24']) + `<path d="M12 8h10v8q0 6-5 8q-5-2-5-8z" fill="#005ce6" stroke="#ed1c24" stroke-width="1"/>`,
  HR: () => hs(['#ff0000', '#fff', '#171796']) + `<rect x="24" y="10" width="12" height="14" fill="#fff" stroke="#ff0000" stroke-width="1"/><path d="M24 10h4v4h-4zM32 10h4v4h-4zM28 14h4v4h-4zM24 18h4v4h-4zM32 18h4v4h-4z" fill="#ff0000"/>`,
  AZ: () => hs(['#00b5e2', '#ef3340', '#509e2f']) + crescent(28, 20, 5, '#fff', '#ef3340'),
  CO: () => hs(['#fcd116', '#fcd116', '#003893', '#ce1126']), GT: () => vs(['#4997d0', '#fff', '#4997d0']) + disc(30, 20, 5, '#6c9a3c'),
  HK: () => `<rect width="${W}" height="${Hh}" fill="#de2910"/>` + [0, 1, 2, 3, 4].map(i => { const a = i * 72 * Math.PI / 180; return `<ellipse cx="${(30 + Math.cos(a) * 6).toFixed(1)}" cy="${(20 + Math.sin(a) * 6).toFixed(1)}" rx="5" ry="2.6" transform="rotate(${i * 72 + 30} ${(30 + Math.cos(a) * 6).toFixed(1)} ${(20 + Math.sin(a) * 6).toFixed(1)})" fill="#fff"/>`; }).join(''),
  ID: () => hs(['#ff0000', '#fff']), MC: () => hs(['#ce1126', '#fff']),
  IQ: () => hs(['#ce1126', '#fff', '#000']) + `<path d="M22 20h16" stroke="#007a3d" stroke-width="2.5" stroke-dasharray="3 2"/>`,
  JO: () => hs(['#000', '#fff', '#007a3d']) + `<path d="M0 0L26 20L0 40z" fill="#ce1126"/>` + star(9, 20, 3, '#fff'),
  KR: () => `<rect width="${W}" height="${Hh}" fill="#fff"/><path d="M22 20a8 8 0 0 1 16 0z" fill="#cd2e3a"/><path d="M22 20a8 8 0 0 0 16 0z" fill="#0047a0"/>` + ['M8 9l6-4', 'M46 31l6-4', 'M8 31l6 4', 'M46 9l6 4'].map(d => `<path d="${d}" stroke="#000" stroke-width="3"/>`).join(''),
  LB: () => hs(['#ed1c24', '#fff', '#fff', '#ed1c24']) + `<path d="M30 11l8 12H22z" fill="#00a651"/><rect x="29" y="23" width="2" height="5" fill="#00a651"/>`,
  MX: () => vs(['#006847', '#fff', '#ce1126']) + disc(30, 20, 4, '#9b6a3a'),
  NZ: () => `<rect width="${W}" height="${Hh}" fill="#012169"/>${star(44, 12, 2.6, '#cc142b')}${star(50, 21, 2.4, '#cc142b')}${star(39, 22, 2.4, '#cc142b')}${star(44, 32, 2.6, '#cc142b')}<path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.5"/>`,
  PH: () => hs(['#0038a8', '#ce1126']) + `<path d="M0 0L26 20L0 40z" fill="#fff"/>` + disc(9, 20, 3.5, '#fcd116'),
  PK: () => `<rect width="${W}" height="${Hh}" fill="#01411c"/><rect width="15" height="${Hh}" fill="#fff"/>` + crescent(36, 20, 9, '#fff', '#01411c') + star(41, 15, 3, '#fff'),
  SA: () => `<rect width="${W}" height="${Hh}" fill="#006c35"/><path d="M16 16h28" stroke="#fff" stroke-width="2.5"/><path d="M18 26h22l3-2" stroke="#fff" stroke-width="1.6" fill="none"/>`,
  SG: () => hs(['#ef3340', '#fff']) + crescent(11, 10, 6, '#fff', '#ef3340') + [0, 1, 2, 3, 4].map(i => star(16 + Math.cos(i * 1.256 - 1.57) * 4, 10 + Math.sin(i * 1.256 - 1.57) * 4, 1.2, '#fff')).join(''),
  SY: () => hs(['#ce1126', '#fff', '#000']) + star(23, 20, 3.5, '#007a3d') + star(37, 20, 3.5, '#007a3d'),
  TH: () => hs(['#a51931', '#f4f5f8', '#2d2a4a', '#2d2a4a', '#f4f5f8', '#a51931']),
  UY: () => Array.from({ length: 9 }, (_, i) => `<rect y="${(i * Hh / 9).toFixed(2)}" width="${W}" height="${(Hh / 9 + .1).toFixed(2)}" fill="${i % 2 ? '#0038a8' : '#fff'}"/>`).join('') + `<rect width="22" height="22.2" fill="#fff"/>` + disc(11, 11, 6, '#fcd116'),
  UZ: () => hs(['#0099b5', '#fff', '#1eb53a']) + `<rect y="12.8" width="${W}" height="1" fill="#ce1126"/><rect y="26.2" width="${W}" height="1" fill="#ce1126"/>` + crescent(9, 6.5, 4, '#fff', '#0099b5'),
  IS: () => nordic('#02529c', '#fff', '#dc1e35'), KG: () => `<rect width="${W}" height="${Hh}" fill="#e8112d"/>` + disc(30, 20, 9, '#ffef00') + disc(30, 20, 5, '#e8112d'),
  AM: () => hs(['#d90012', '#0033a0', '#f2a800']), MD: () => vs(['#0046ae', '#ffd200', '#cc092f']),
  GE: () => `<rect width="${W}" height="${Hh}" fill="#fff"/><rect x="26" width="8" height="${Hh}" fill="#ff0000"/><rect y="16" width="${W}" height="8" fill="#ff0000"/>` + [[13, 8], [47, 8], [13, 32], [47, 32]].map(([x, y]) => `<path d="M${x - 3} ${y}h6M${x} ${y - 3}v6" stroke="#ff0000" stroke-width="2"/>`).join(''),
  VN: () => `<rect width="${W}" height="${Hh}" fill="#da251d"/>${star(30, 20, 9, '#ffff00')}`,
  MY: () => Array.from({ length: 14 }, (_, i) => `<rect y="${(i * Hh / 14).toFixed(2)}" width="${W}" height="${(Hh / 14 + .1).toFixed(2)}" fill="${i % 2 ? '#fff' : '#cc0001'}"/>`).join('') + `<rect width="30" height="22.9" fill="#010066"/>` + crescent(11, 11.5, 6, '#fc0', '#010066') + star(21, 11.5, 4, '#fc0'),
  JP: () => `<rect width="${W}" height="${Hh}" fill="#fff"/>` + disc(30, 20, 10, '#bc002d'),
  IN: () => hs(['#ff9933', '#fff', '#138808']) + `<circle cx="30" cy="20" r="4.5" fill="none" stroke="#000080" stroke-width="1"/>`,
  PE: () => vs(['#d91023', '#fff', '#d91023']), VE: () => hs(['#ffcc00', '#00247d', '#cf142b']) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => star(18 + i * 3.5, 22 - Math.sin(i / 7 * Math.PI) * 5, 1.1, '#fff')).join(''),
  EU: () => `<rect width="${W}" height="${Hh}" fill="#003399"/>` + Array.from({ length: 12 }, (_, i) => star(30 + Math.cos(i * Math.PI / 6) * 11, 20 + Math.sin(i * Math.PI / 6) * 11, 2, '#ffcc00')).join('')
});


// v39: дополнительный набор национальных флагов, встречающихся в EMDB 2026.
Object.assign(FLAGS, {
  AE: () => `<rect width="${W}" height="${Hh}" fill="#fff"/><rect y="0" width="${W}" height="13.34" fill="#009739"/><rect y="26.66" width="${W}" height="13.34" fill="#000"/><rect width="13" height="${Hh}" fill="#ff0000"/>`,
  AF: () => vs(['#000','#d32011','#007a36']) + `<circle cx="30" cy="20" r="7" fill="#fff" opacity=".9"/><path d="M25 24h10M27 16v7M33 16v7" stroke="#333" stroke-width="1.6"/>`,
  AG: () => `<rect width="${W}" height="${Hh}" fill="#ce1126"/><path d="M0 0h60L30 26z" fill="#fff"/><path d="M0 0h60L30 22z" fill="#0072c6"/><path d="M0 0h60L30 18z" fill="#000"/><path d="M8 40h44L30 12z" fill="#ce1126"/><circle cx="30" cy="8" r="5" fill="#fcd116"/>`,
  AL: () => `<rect width="${W}" height="${Hh}" fill="#e41e20"/><path d="M14 15l8-7 8 6 8-6 8 7-5 2 3 9-8-3-6 7-6-7-8 3 3-9z" fill="#111"/><path d="M30 12v20M18 18l-4 8M42 18l4 8" stroke="#111" stroke-width="2"/>`,
  AO: () => hs(['#cc092f','#000']) + `<circle cx="30" cy="20" r="10" fill="none" stroke="#ffcd00" stroke-width="2"/><path d="M22 27l15-14M22 14l15 13" stroke="#ffcd00" stroke-width="2"/><circle cx="30" cy="20" r="3" fill="#ffcd00"/>`,
  BD: () => `<rect width="${W}" height="${Hh}" fill="#006a4e"/><circle cx="27" cy="20" r="11" fill="#f42a41"/>`,
  BH: () => `<rect width="${W}" height="${Hh}" fill="#ce1126"/><path d="M0 0h24l-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4H0z" fill="#fff"/>`,
  BN: () => `<rect width="${W}" height="${Hh}" fill="#f7e017"/><path d="M0 0L60 40" stroke="#fff" stroke-width="12"/><path d="M0 0L60 40" stroke="#000" stroke-width="7"/><path d="M30 13l8 5v9l-8 5-8-5v-9z" fill="#d7141a" stroke="#fff" stroke-width="1"/>`,
  BT: () => hs(['#ff4e12','#ffcc00']) + `<path d="M18 24q10-18 24-4l-6 4 6 5-10 1-4 5-3-6-8-2z" fill="#fff" stroke="#eee" stroke-width="1"/>`,
  CF: () => hs(['#003082','#fff','#289728','#ffce00']) + `<rect x="27" width="6" height="${Hh}" fill="#d21034"/>`,
  CI: () => vs(['#f77f00','#fff','#009e60']),
  CR: () => hs(['#002b7f','#fff','#ce1126','#ce1126','#fff','#002b7f']),
  CU: () => hs(['#002a8f','#fff','#002a8f','#fff','#002a8f']) + `<path d="M0 0L27 20L0 40z" fill="#cf142b"/>${star(10,20,5,'#fff')}`,
  CY: () => `<rect width="${W}" height="${Hh}" fill="#fff"/><path d="M19 14q11-12 23-3l-6 8 5 6-14 2-7-5z" fill="#c58b25"/><path d="M20 28q9-4 19 0" stroke="#3e8b45" stroke-width="2" fill="none"/>`,
  DO: () => `<rect width="${W}" height="${Hh}" fill="#002d62"/><path d="M30 0h30v20H30zM0 20h30v20H0z" fill="#ce1126"/><rect x="24" y="0" width="12" height="${Hh}" fill="#fff"/><rect y="14" width="${W}" height="12" fill="#fff"/><rect x="27" y="17" width="6" height="6" fill="#fff"/>`,
  DZ: () => vs(['#006233','#fff']) + crescent(30,20,8,'#d21034','#fff') + star(38,16,3.5,'#d21034'),
  EG: () => hs(['#ce1126','#fff','#000']) + `<circle cx="30" cy="20" r="5" fill="#c09300"/><path d="M24 20h12M27 16l3 8 3-8" stroke="#c09300" stroke-width="1.5" fill="none"/>`,
  FJ: () => `<rect width="${W}" height="${Hh}" fill="#68bfe5"/><rect width="27" height="20" fill="#012169"/><path d="M0 0L27 20M27 0L0 20" stroke="#fff" stroke-width="4"/><path d="M13.5 0v20M0 10h27" stroke="#c8102e" stroke-width="2.5"/><path d="M38 14l7 0 3 8-7 3-6-4z" fill="#fff"/>`,
  FO: () => nordic('#fff','#0065bd','#ed1c24'),
  GH: () => hs(['#ce1126','#fcd116','#006b3f']) + star(30,20,6,'#000'),
  GL: () => `<rect width="${W}" height="20" fill="#fff"/><rect y="20" width="${W}" height="20" fill="#d00c33"/><circle cx="23" cy="20" r="10" fill="#d00c33"/><circle cx="23" cy="20" r="10" fill="#fff"/><path d="M23 10a10 10 0 0 1 0 20z" fill="#d00c33"/>`,
  HT: () => hs(['#00209f','#d21034']) + `<rect x="21" y="12" width="18" height="16" fill="#fff"/><path d="M24 15h12v10H24z" fill="#007a3d"/><path d="M30 16l3 4-3 4-3-4z" fill="#fcd116"/>`,
  IR: () => hs(['#239f40','#fff','#da0000']) + `<path d="M23 17h14M23 20h14M23 23h14" stroke="#c8102e" stroke-width="1.3"/>`,
  JM: () => `<rect width="${W}" height="${Hh}" fill="#009b3a"/><path d="M0 0L60 40M60 0L0 40" stroke="#fed100" stroke-width="12"/><path d="M0 0L60 40M60 0L0 40" stroke="#000" stroke-width="5"/>`,
  KH: () => hs(['#032ea1','#e00025','#032ea1']) + `<path d="M18 26h24l-3-6h-3v-5h-4v5h-4v-5h-4v5h-3zM22 26v-8h16v8" fill="#fff"/><path d="M26 18l4-7 4 7" stroke="#fff" stroke-width="2" fill="none"/>`,
  LA: () => hs(['#ce1126','#002868','#ce1126']) + `<circle cx="30" cy="20" r="8" fill="#fff"/>`,
  LK: () => `<rect width="${W}" height="${Hh}" fill="#ffb700"/><rect x="3" y="3" width="54" height="34" fill="#8d153a"/><rect x="4" y="4" width="7" height="32" fill="#00534e"/><rect x="12" y="4" width="5" height="32" fill="#ff8c00"/><path d="M28 12l8 7-4 8-7-3z" fill="#ffcf00"/>`,
  LU: () => hs(['#ed2939','#fff','#00a1de']),
  MA: () => `<rect width="${W}" height="${Hh}" fill="#c1272d"/>${star(30,20,8,'#006233')}`,
  MM: () => hs(['#fecb00','#34b233','#ea2839']) + star(30,20,9,'#fff'),
  MO: () => `<rect width="${W}" height="${Hh}" fill="#00785e"/><circle cx="30" cy="20" r="10" fill="#fff"/><path d="M22 25q8-15 16 0M30 10v18M20 20h20" stroke="#00785e" stroke-width="1.5" fill="none"/>`,
  MT: () => vs(['#fff','#cf142b']) + `<rect x="10" y="7" width="10" height="10" fill="#ccc" stroke="#888" stroke-width=".5"/><path d="M15 9v6M12 12h6" stroke="#fff" stroke-width="2"/>`,
  MV: () => `<rect width="${W}" height="${Hh}" fill="#d21034"/><rect x="13" y="6" width="34" height="28" fill="#007e3a"/><circle cx="31" cy="20" r="8" fill="#fff"/><circle cx="35" cy="17" r="7" fill="#007e3a"/>`,
  NG: () => vs(['#008751','#fff','#008751']),
  NI: () => hs(['#0067c6','#fff','#0067c6']) + `<circle cx="30" cy="20" r="4" fill="#c9a227"/><path d="M25 24h10" stroke="#c9a227" stroke-width="1.5"/>`,
  NP: () => `<rect width="${W}" height="${Hh}" fill="#fff"/><path d="M6 38V2h37L24 18h19L6 40z" fill="#003893" stroke="#dc143c" stroke-width="3"/><circle cx="16" cy="12" r="4" fill="#fff"/><path d="M16 24l-4 7h8z" fill="#fff"/>`,
  OM: () => `<rect width="${W}" height="${Hh}" fill="#fff"/><rect x="0" y="0" width="14" height="${Hh}" fill="#db161b"/><rect x="14" y="0" width="46" height="13.3" fill="#fff"/><rect x="14" y="13.3" width="46" height="13.4" fill="#db161b"/><rect x="14" y="26.7" width="46" height="13.3" fill="#008000"/>`,
  PY: () => hs(['#d52b1e','#fff','#0038a8']) + `<circle cx="30" cy="20" r="5" fill="none" stroke="#d2a93a" stroke-width="1.5"/><circle cx="30" cy="20" r="2" fill="#d2a93a"/>`,
  QA: () => `<rect width="${W}" height="${Hh}" fill="#8a1538"/><path d="M0 0h19l-5 4 5 4-5 4 5 4-5 4 5 4-5 4 5 4-5 4 5 4H0z" fill="#fff"/>`,
  SV: () => hs(['#0047ab','#fff','#0047ab']) + `<path d="M25 16h10l-2 8h-6z" fill="#e5b347"/><circle cx="30" cy="19" r="2" fill="#00843d"/>`,
  TJ: () => hs(['#d71920','#fff','#006600']) + `<path d="M22 25h16l-3-7h-10z" fill="#d5b335"/><circle cx="30" cy="14" r="3" fill="#d5b335"/>`,
  TL: () => hs(['#d21034','#ffc726']) + `<path d="M0 0L31 20L0 40z" fill="#000"/><path d="M0 0L22 20L0 40z" fill="#fff"/>${star(9,20,4,'#000')}`,
  TM: () => `<rect width="${W}" height="${Hh}" fill="#009739"/><rect x="10" y="0" width="13" height="40" fill="#d22630"/><path d="M12 5h9M12 12h9M12 19h9M12 26h9M12 33h9" stroke="#e8c66a" stroke-width="1.5"/><circle cx="40" cy="20" r="9" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M36 12q7 8 0 16" stroke="#fff" stroke-width="1.5" fill="none"/>`,
  TN: () => `<rect width="${W}" height="${Hh}" fill="#e70013"/><circle cx="30" cy="20" r="11" fill="#fff"/><circle cx="28" cy="20" r="6" fill="#e70013"/><circle cx="31" cy="20" r="5" fill="#fff"/>${star(34,20,3.5,'#e70013')}`,
  TT: () => `<rect width="${W}" height="${Hh}" fill="#ce1126"/><path d="M0 0L60 40" stroke="#fff" stroke-width="13"/><path d="M0 0L60 40" stroke="#000" stroke-width="8"/>`,
  TW: () => `<rect width="${W}" height="${Hh}" fill="#fe0000"/><rect width="27" height="20" fill="#000095"/><circle cx="13.5" cy="10" r="6" fill="#fff"/><circle cx="13.5" cy="10" r="2.8" fill="#000095"/>`,
  UG: () => hs(['#000','#fcdc04','#d90000','#000','#fcdc04','#d90000']) + `<circle cx="30" cy="20" r="6" fill="#fff"/><path d="M28 16l4 2-1 6-3-1z" fill="#d90000"/>`,
  YE: () => hs(['#ce1126','#fff','#000']),
  ZW: () => hs(['#006400','#ffd200','#d40000','#000','#d40000','#ffd200','#006400']) + `<path d="M0 0L20 20L0 40z" fill="#fff"/>${star(7,20,4,'#d40000')}`
});

const cache = {};
function svg(c, rounded = 3) {
  const body = FLAGS[c] ? FLAGS[c]() : `<rect width="${W}" height="${Hh}" fill="#3a4658"/><text x="30" y="27" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#e8edf3" text-anchor="middle">${String(c || '?').slice(0, 2)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}"><defs><clipPath id="f"><rect width="${W}" height="${Hh}" rx="${rounded}"/></clipPath><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient></defs><g clip-path="url(#f)">${body}<rect width="${W}" height="${Hh}" fill="url(#g)"/></g><rect x=".4" y=".4" width="${W - .8}" height="${Hh - .8}" rx="${rounded}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width=".8"/></svg>`;
}
const uri = c => cache[c] || (cache[c] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(c)));
const NAMES = { RU: 'Россия', UA: 'Украина', BY: 'Беларусь', KZ: 'Казахстан', DK: 'Дания', SE: 'Швеция', NO: 'Норвегия', FI: 'Финляндия', FR: 'Франция', DE: 'Германия', PL: 'Польша', CZ: 'Чехия', SK: 'Словакия', HU: 'Венгрия', RO: 'Румыния', BG: 'Болгария', RS: 'Сербия', BA: 'Босния', GB: 'Великобритания', NL: 'Нидерланды', BE: 'Бельгия', PT: 'Португалия', ES: 'Испания', TR: 'Турция', IL: 'Израиль', BR: 'Бразилия', AR: 'Аргентина', CL: 'Чили', US: 'США', CA: 'Канада', AU: 'Австралия', MN: 'Монголия', CN: 'Китай', LV: 'Латвия', LT: 'Литва', EE: 'Эстония', MK: 'Сев. Македония', ME: 'Черногория', XK: 'Косово', ZA: 'ЮАР', AT: 'Австрия', IT: 'Италия', IE: 'Ирландия', CH: 'Швейцария', GR: 'Греция', SI: 'Словения', HR: 'Хорватия', AZ: 'Азербайджан', CO: 'Колумбия', GT: 'Гватемала', HK: 'Гонконг', ID: 'Индонезия', IQ: 'Ирак', JO: 'Иордания', KR: 'Корея', LB: 'Ливан', MX: 'Мексика', NZ: 'Новая Зеландия', PH: 'Филиппины', PK: 'Пакистан', SA: 'Саудовская Аравия', SG: 'Сингапур', SY: 'Сирия', TH: 'Таиланд', UY: 'Уругвай', UZ: 'Узбекистан', IS: 'Исландия', KG: 'Киргизия', AM: 'Армения', MD: 'Молдова', GE: 'Грузия', VN: 'Вьетнам', MY: 'Малайзия', JP: 'Япония', IN: 'Индия', PE: 'Перу', VE: 'Венесуэла', EU: 'Европа' };
Object.assign(NAMES, {
 AE:'ОАЭ', AF:'Афганистан', AG:'Антигуа и Барбуда', AL:'Албания', AO:'Ангола', BD:'Бангладеш', BH:'Бахрейн', BN:'Бруней', BT:'Бутан',
 CF:'ЦАР', CI:'Кот-д’Ивуар', CR:'Коста-Рика', CU:'Куба', CY:'Кипр', DO:'Доминиканская Республика', DZ:'Алжир', EG:'Египет', FJ:'Фиджи', FO:'Фарерские острова',
 GH:'Гана', GL:'Гренландия', HT:'Гаити', IR:'Иран', JM:'Ямайка', KH:'Камбоджа', LA:'Лаос', LK:'Шри-Ланка', LU:'Люксембург', MA:'Марокко', MM:'Мьянма',
 MO:'Макао', MT:'Мальта', MV:'Мальдивы', NG:'Нигерия', NI:'Никарагуа', NP:'Непал', OM:'Оман', PY:'Парагвай', QA:'Катар', SV:'Сальвадор', TJ:'Таджикистан',
 TL:'Восточный Тимор', TM:'Туркменистан', TN:'Тунис', TT:'Тринидад и Тобаго', TW:'Тайвань', UG:'Уганда', YE:'Йемен', ZW:'Зимбабве'
});
const html = (c, cls) => /^[A-Z]{2}$/.test(c || '') ? `<img class="flg${cls ? ' ' + cls : ''}" src="${uri(c)}" alt="${c}" title="${NAMES[c] || c}">` : '';
window.V34Flags = { svg, uri, html, NAMES, has: c => !!FLAGS[c] };
})();
