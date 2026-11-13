/* v84 — собственные баннеры карт (без сторонних изображений): палитра и силуэт каждой карты. */
(function () {
  'use strict';
  let UID = 0;
  const THEMES = {
    'Mirage':   { sky: ['#f6c98a', '#d9824a'], ground: '#7a4a2a', ink: '#4a2a17', motif: 'palace' },
    'Inferno':  { sky: ['#f4a46b', '#b8452e'], ground: '#6b2d1d', ink: '#3d1710', motif: 'bell' },
    'Nuke':     { sky: ['#9fd3d8', '#4f7f8f'], ground: '#2c3e48', ink: '#1a262d', motif: 'tower' },
    'Dust II':  { sky: ['#f8dfa0', '#d1a253'], ground: '#8a6a34', ink: '#5a4219', motif: 'arch' },
    'Ancient':  { sky: ['#a9d6a0', '#3f7a4a'], ground: '#25432b', ink: '#16291a', motif: 'pyramid' },
    'Anubis':   { sky: ['#8fe0d8', '#2f8f9a'], ground: '#7a6331', ink: '#3f3216', motif: 'obelisk' },
    'Cache':    { sky: ['#cfd6dc', '#7d8a95'], ground: '#4b5560', ink: '#2a3138', motif: 'containers' },
    'Train':    { sky: ['#c9d3e0', '#6c7d93'], ground: '#3a4250', ink: '#222833', motif: 'train' },
    'Overpass': { sky: ['#b7dcf2', '#5d93bf'], ground: '#3e5a46', ink: '#22362a', motif: 'bridge' },
    'Vertigo':  { sky: ['#bfe2ff', '#5b8fd6'], ground: '#40546f', ink: '#253246', motif: 'skyscraper' }
  };
  const M = {
    palace: i => `<path d="M40 90V52h30v-8h20v8h30v38z" fill="${i}"/><path d="M58 90V68a6 6 0 0 1 12 0v22M92 90V68a6 6 0 0 1 12 0v22" fill="#000" opacity=".25"/><path d="M76 44a4 6 0 0 1 8 0" fill="${i}"/><rect x="180" y="58" width="60" height="32" fill="${i}"/><path d="M186 90V72a5 5 0 0 1 10 0v18M214 90V72a5 5 0 0 1 10 0v18" fill="#000" opacity=".25"/>`,
    bell: i => `<rect x="70" y="30" width="18" height="60" fill="${i}"/><path d="M66 30l13-14 13 14z" fill="${i}"/><rect x="75" y="40" width="8" height="10" fill="#000" opacity=".3"/><path d="M120 90V62l22-12 22 12v28zM190 90V66l18-10 18 10v24z" fill="${i}"/>`,
    tower: i => `<path d="M60 90C66 70 66 50 58 30h40c-8 20-8 40-2 60z" fill="${i}"/><ellipse cx="78" cy="30" rx="20" ry="4" fill="${i}"/><rect x="150" y="56" width="90" height="34" fill="${i}"/><circle cx="200" cy="72" r="7" fill="#f6d34a" opacity=".85"/><path d="M200 66v12M194 72h12" stroke="${i}" stroke-width="2"/>`,
    arch: i => `<path d="M50 90V44h60v46h-14V66a16 16 0 0 0-32 0v24z" fill="${i}"/><rect x="150" y="34" width="22" height="56" fill="${i}"/><path d="M146 34h30l-15-12z" fill="${i}"/><rect x="190" y="60" width="50" height="30" fill="${i}"/>`,
    pyramid: i => `<path d="M40 90l14-10h60l14 10zM56 80l12-10h36l12 10zM70 70l10-10h16l10 10zM82 60h12l-6-10z" fill="${i}"/><path d="M170 90c4-30 20-40 30-40s20 18 24 40z" fill="${i}" opacity=".8"/>`,
    obelisk: i => `<path d="M64 90l4-58 6-8 6 8 4 58z" fill="${i}"/><path d="M110 90V58h70v32z" fill="${i}"/><path d="M116 58h58l-29-18z" fill="${i}"/><path d="M122 90V66M134 90V66M146 90V66M158 90V66M170 90V66" stroke="#000" stroke-opacity=".25" stroke-width="3"/>`,
    containers: i => `<rect x="40" y="62" width="56" height="28" fill="${i}"/><rect x="60" y="40" width="56" height="22" fill="#c7642a"/><rect x="104" y="62" width="56" height="28" fill="#3d6a8a"/><path d="M44 66v20M52 66v20M60 66v20M68 66v20M76 66v20M84 66v20" stroke="#000" stroke-opacity=".2"/><circle cx="210" cy="50" r="26" fill="none" stroke="${i}" stroke-width="3"/><path d="M210 24v52M184 50h52M192 32l36 36M228 32l-36 36" stroke="${i}" stroke-width="1.5"/><path d="M200 90l10-14 10 14" fill="${i}"/>`,
    train: i => `<rect x="30" y="58" width="80" height="26" rx="3" fill="${i}"/><rect x="116" y="58" width="80" height="26" rx="3" fill="#7d2f2a"/><circle cx="48" cy="86" r="4" fill="#111"/><circle cx="92" cy="86" r="4" fill="#111"/><circle cx="134" cy="86" r="4" fill="#111"/><circle cx="178" cy="86" r="4" fill="#111"/>`,
    bridge: i => `<path d="M20 60h280v8H20z" fill="${i}"/><path d="M60 68v22M140 68v22M220 68v22" stroke="${i}" stroke-width="8"/>`,
    skyscraper: i => `<rect x="70" y="10" width="50" height="80" fill="${i}"/><path d="M76 18h38M76 28h38M76 38h38M76 48h38M76 58h38M76 68h38" stroke="#000" stroke-opacity=".25"/><path d="M160 30l30-14 30 14" fill="none" stroke="${i}" stroke-width="3"/><path d="M190 16v74" stroke="${i}" stroke-width="3"/>`
  };
  function ctBias(map) { try { const e = window.CS2Realism?.ctEdge?.(map) || 0; return e; } catch (e) { return 0; } }
  function banner(map, opts) {
    opts = opts || {};
    const t = THEMES[map] || { sky: ['#9aa7b6', '#4f5d6e'], ground: '#2f3945', ink: '#1d242c', motif: 'containers' };
    const id = 'mp' + (++UID).toString(36);
    const e = ctBias(map), side = Math.abs(e) < .005 ? 'баланс сторон' : (e > 0 ? `CT +${Math.round(e * 100)}%` : `T +${Math.round(-e * 100)}%`);
    const h = opts.h || 90;
    return `<svg class="cs2-mapart" viewBox="0 0 320 90" preserveAspectRatio="xMinYMid slice" style="height:${h}px" role="img" aria-label="${map}">` +
      `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.sky[0]}"/><stop offset="1" stop-color="${t.sky[1]}"/></linearGradient>` +
      `<linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d1117" stop-opacity=".85"/><stop offset=".55" stop-color="#0d1117" stop-opacity=".15"/><stop offset="1" stop-color="#0d1117" stop-opacity="0"/></linearGradient></defs>` +
      `<rect width="320" height="90" fill="url(#${id}s)"/><circle cx="270" cy="22" r="14" fill="#fff" opacity=".35"/>` +
      `<g transform="translate(60 0)">${(M[t.motif] || M.containers)(t.ink)}</g><rect y="84" width="320" height="6" fill="${t.ground}"/>` +
      `<rect width="320" height="90" fill="url(#${id}f)"/>` +
      `<text x="14" y="40" font-family="Inter,Arial,sans-serif" font-weight="900" font-size="22" fill="#fff">${map}</text>` +
      `<text x="14" y="60" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="11" fill="#fff" fill-opacity=".8">${side}</text></svg>`;
  }
  window.CS2MapArt = Object.freeze({ banner, themes: Object.keys(THEMES), ctBias });
})();
