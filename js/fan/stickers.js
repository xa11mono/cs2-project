/* v84 — капсулы стикеров Мейджора.
   К старту каждого Мейджора Valve выпускает капсулы: стикер турнира, стикеры команд-участниц и автографы
   всех игроков. У каждого Мейджора своя палитра и эмблема (по организатору и городу), у каждого стикера
   четыре исполнения: Paper, Glitter, Holo, Gold. Автограф — подпись ником игрока с росчерком, который
   однозначно задаётся ником, поэтому подпись игрока узнаваема из Мейджора в Мейджор.
   После окончания продаж клубы получают долю выручки (в бюджет организации), выходит новость с итогами. */
(function () {
  'use strict';
  const W = window, H = W.HS;
  const DAY = 864e5;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n2 = v => Math.round(v * 100) / 100;
  let UID = 0;

  // ---------------------------------------------------------------- тема Мейджора
  const HOSTS = [
    { re: /^PGL/i, org: 'PGL', pal: [['#0b1f4d', '#1fb6ff', '#ffffff'], ['#101828', '#00e1c6', '#f5f7ff'], ['#1a0f3a', '#7c5cff', '#ffd23f']] },
    { re: /^IEM|^ESL/i, org: 'IEM', pal: [['#071a3a', '#2f8bff', '#ffffff'], ['#0d1b2a', '#ffb000', '#ffffff'], ['#16213e', '#e94560', '#f5f5f5']] },
    { re: /^BLAST/i, org: 'BLAST', pal: [['#111111', '#ff6a00', '#ffffff'], ['#0a0a0a', '#ffd400', '#ffffff'], ['#1b1b1b', '#00d1ff', '#ffffff']] },
    { re: /^Perfect World/i, org: 'PW', pal: [['#3a0606', '#e8b84a', '#fff4d6'], ['#2b0b0b', '#ff3b3b', '#ffe8a3']] },
    { re: /^StarLadder/i, org: 'SL', pal: [['#1e0b3b', '#b15cff', '#ffd75a'], ['#14082a', '#ff4fa3', '#ffffff']] },
    { re: /^FiRe/i, org: 'FiRe', pal: [['#0d2a4a', '#6cace4', '#ffb347'], ['#102a43', '#f6c343', '#ffffff']] },
    { re: /^Austin|BLAST\.tv/i, org: 'BLAST', pal: [['#0b2545', '#ff7f11', '#ffffff']] }
  ];
  function theme(major) {
    const name = String(major.name || ''), h = h32('theme|' + name);
    const host = HOSTS.find(x => x.re.test(name)) || { org: 'Major', pal: [['#1a1a2e', '#e2b13c', '#ffffff'], ['#0f3057', '#00a8cc', '#ffffff']] };
    const pal = host.pal[h % host.pal.length];
    const city = name.replace(/\b(PGL|IEM|BLAST(\.tv)?|Perfect World|StarLadder|FiRe|ESL One|CS2?|Major|20\d\d)\b/gi, '').replace(/\s+/g, ' ').trim() || 'Major';
    return { org: host.org, bg: pal[0], acc: pal[1], ink: pal[2], shape: ['circle', 'shield', 'hex', 'badge'][(h >>> 4) % 4], city, year: major.year || '', tag: (c2 => c2.length <= 13 ? c2 : c2.split(' ').sort((x, y) => y.length - x.length)[0])(city.replace(/^(Saint|St\.?|San|Sankt)\s+/i, '')).slice(0, 13).toUpperCase() };
  }

  // ---------------------------------------------------------------- исполнения
  const FINISHES = [['paper', 'Paper'], ['glitter', 'Glitter'], ['holo', 'Holo'], ['gold', 'Gold']];
  function Defs() { this.id = 'stk' + (++UID).toString(36) + '_'; this.k = 0; this.d = []; }
  Defs.prototype.add = function (body) { const id = this.id + (this.k++); this.d.push(body.replace('$ID', id)); return id; };
  Defs.prototype.lin = function (stops, x2, y2) { return 'url(#' + this.add(`<linearGradient id="$ID" x1="0" y1="0" x2="${x2 ?? 1}" y2="${y2 ?? 1}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</linearGradient>`) + ')'; };
  Defs.prototype.glitter = function (seed, col) {
    let dots = '', s = seed >>> 0;
    for (let i = 0; i < 26; i++) { s = Math.imul(s ^ (s >>> 13), 1597334677) >>> 0; const x = s % 12, y = (s >>> 8) % 12, r = .3 + ((s >>> 16) % 5) / 9; dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? col : '#c9a400'}" opacity="${.55 + (i % 4) * .12}"/>`; }
    return 'url(#' + this.add(`<pattern id="$ID" width="12" height="12" patternUnits="userSpaceOnUse">${dots}</pattern>`) + ')';
  };
  const HOLO = [[0, '#ff5ea8'], [.2, '#ffd36e'], [.4, '#7dffb2'], [.6, '#6ec8ff'], [.8, '#b18cff'], [1, '#ff5ea8']];
  const GOLD = [[0, '#7a5205'], [.25, '#f7d36a'], [.5, '#fff4c4'], [.75, '#d9a521'], [1, '#6e4a05']];
  const GOLD_INK = [[0, '#5c3a00'], [.35, '#b8860b'], [.55, '#f0c24a'], [.8, '#9a6a00'], [1, '#4d3000']];
  // Заливка «плёнки» поверх рисунка в зависимости от исполнения
  function overlay(D, finish, seed, w, h, clip) {
    if (finish === 'holo') return `<rect x="0" y="0" width="${w}" height="${h}" fill="${D.lin(HOLO, 1, .6)}" opacity=".42" style="mix-blend-mode:screen"${clip}/>`;
    if (finish === 'glitter') return `<rect x="0" y="0" width="${w}" height="${h}" fill="${D.glitter(seed, '#ffd34d')}"${clip}/><rect x="0" y="0" width="${w}" height="${h}" fill="${D.glitter(seed ^ 0x9e37, '#7fd6ff')}" opacity=".8"${clip}/>`;
    if (finish === 'gold') return `<rect x="0" y="0" width="${w}" height="${h}" fill="${D.lin(GOLD, 1, 1)}" opacity=".3" style="mix-blend-mode:overlay"${clip}/>`;
    return '';
  }
  function shapePath(shape, w, h, inset) {
    const i = inset || 0, cx = w / 2, cy = h / 2;
    if (shape === 'circle') return `M${cx} ${i}A${cx - i} ${cy - i} 0 1 1 ${cx - .01} ${i}z`;
    if (shape === 'shield') return `M${i} ${i + 6}Q${cx} ${i - 4} ${w - i} ${i + 6}V${h * .55}Q${w - i} ${h * .85} ${cx} ${h - i}Q${i} ${h * .85} ${i} ${h * .55}z`;
    if (shape === 'hex') { const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; pts.push(`${n2(cx + Math.cos(a) * (cx - i))} ${n2(cy + Math.sin(a) * (cy - i))}`); } return 'M' + pts.join('L') + 'z'; }
    return `M${i + 8} ${i}H${w - i - 8}Q${w - i} ${i} ${w - i} ${i + 8}V${h - i - 8}Q${w - i} ${h - i} ${w - i - 8} ${h - i}H${i + 8}Q${i} ${h - i} ${i} ${h - i - 8}V${i + 8}Q${i} ${i} ${i + 8} ${i}z`;
  }
  function frame(D, th, finish, seed, inner, label) {
    const w = 100, h = 100, cp = D.add(`<clipPath id="$ID"><path d="${shapePath(th.shape, w, h, 5)}"/></clipPath>`);
    const edge = finish === 'gold' ? D.lin(GOLD) : finish === 'holo' ? D.lin(HOLO) : '#ffffff';
    return `<svg class="v84-stk-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}"><defs>${D.d.join('')}</defs>` +
      `<path d="${shapePath(th.shape, w, h, 1.5)}" fill="${edge}" filter="drop-shadow(0 1.5px 1.5px rgba(0,0,0,.45))"/>` +
      `<g clip-path="url(#${cp})">${inner}${overlay(D, finish, seed, w, h, '')}</g></svg>`;
  }
  // defs нужно собрать до сериализации: frame() вызывается последним
  function render(build, th, finish, seed, label) { const D = new Defs(); const inner = build(D); return frame(D, th, finish, seed, inner, label); }

  // ---------------------------------------------------------------- виды стикеров
  // v125.1: логотип ищется и по вариантам названия («Vitality» ↔ «Team Vitality», «Natus Vincere» ↔ «NAVI»),
  // чтобы на стикере был логотип, а не инициалы, если в сохранении команда названа иначе, чем в базе медиа
  const ALIAS = { natusvincere: 'navi', ninjasinpyjamas: 'nip', mousesports: 'mouz', faze: 'faze', fazeclan: 'faze', thieves100: '100thieves' };
  const lnorm = x => String(x || '').toLowerCase().replace(/[^a-z0-9а-я]/g, '').replace(/^team/, '').replace(/(esports?|gaming|club|clan)$/, '');
  let logoIdx = null;
  function logoUrl(team) {
    try {
      const M = W.V31Media; if (!M || !M.url) return '';
      const t = String(team || ''), direct = M.url('team', t) || M.url('team', 'Team ' + t) || M.url('team', t.replace(/^team\s+/i, ''));
      if (direct) return direct;
      if (!logoIdx) { logoIdx = {}; Object.keys(W.CS2_MEDIA?.teams || {}).forEach(n => { const k = lnorm(n); if (k && !logoIdx[k]) logoIdx[k] = n; }); }
      const k = lnorm(t), hit = logoIdx[k] || logoIdx[ALIAS[k] || ''];
      return hit ? (M.url('team', hit) || '') : '';
    } catch (e) { return ''; }
  }
  // v125: художественные стикеры из js/fan/sticker-art.js (рамки с вырубкой, городские символы, шрифты автографов);
  // если генератор не загрузился — рисуем прежним способом
  const ART = () => W.CS2StickerArt;
  const artCtx = () => ({ D: new Defs(), GOLD, HOLO, overlay });
  function viaArt(fn) { try { const A = ART(); return A && typeof A[fn.name] === 'function' ? fn(A) : ''; } catch (e) { return ''; } }
  function eventSticker(major, finish) {
    const art = viaArt(function eventSticker(A) { return A.eventSticker(theme(major), finish, artCtx(), `${major.name} (${finish})`); }); if (art) return art;
    const th = theme(major), seed = h32(major.name + finish), em = (h32('emb|' + major.name) >>> 3) % 3;
    return render(D => {
      const bg = D.add(`<radialGradient id="$ID" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="${th.acc}"/><stop offset=".75" stop-color="${th.bg}"/></radialGradient>`);
      const fg = finish === 'gold' ? D.lin(GOLD) : finish === 'holo' ? D.lin(HOLO, 1, .4) : th.ink;
      const arc = D.add(`<path id="$ID" d="M20 50A30 30 0 0 1 80 50"/>`);
      let emb;
      if (em === 0) emb = `<path d="M36 26H64L61 42C59.5 49 55.5 52 50 52S40.5 49 39 42z" fill="${fg}"/><path d="M36 29C28 29 29 40 38 41M64 29C72 29 71 40 62 41" fill="none" stroke="${fg}" stroke-width="2.2"/><path d="M47 52H53L54 58H46zM41 58H59V62H41z" fill="${fg}"/>`;
      else if (em === 1) emb = `<path d="M50 22L57 38L74 39L61 50L65 66L50 57L35 66L39 50L26 39L43 38z" fill="${fg}"/><circle cx="50" cy="45" r="5" fill="${th.bg}"/>`;
      else emb = `<path d="M32 62V28L50 46L68 28V62H60V44L50 54L40 44V62z" fill="${fg}"/>` + [0, 1, 2, 3, 4].map(i => `<ellipse cx="${n2(26 - i * .6)}" cy="${n2(58 - i * 7)}" rx="1.6" ry="3.4" transform="rotate(${-20 + i * 9} ${n2(26 - i * .6)} ${n2(58 - i * 7)})" fill="${fg}"/><ellipse cx="${n2(74 + i * .6)}" cy="${n2(58 - i * 7)}" rx="1.6" ry="3.4" transform="rotate(${20 - i * 9} ${n2(74 + i * .6)} ${n2(58 - i * 7)})" fill="${fg}"/>`).join('');
      return `<rect width="100" height="100" fill="url(#${bg})"/>` +
        `<circle cx="50" cy="46" r="31" fill="none" stroke="${fg}" stroke-width="1" stroke-dasharray="2 2" opacity=".7"/>` +
        `<text font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="7.2" letter-spacing="1.4" fill="${fg}"><textPath href="#${arc}" startOffset="50%" text-anchor="middle">${esc(th.tag)}</textPath></text>` + emb +
        `<path d="M14 68H86L82 80H18z" fill="${th.bg}" stroke="${fg}" stroke-width=".8"/><text x="50" y="76.8" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="7" letter-spacing="1.6" fill="${fg}">MAJOR ${esc(th.year)}</text>`;
    }, th, finish, seed, `${major.name} (${finish})`);
  }
  function teamSticker(major, team, finish) {
    const art = viaArt(function teamSticker(A) { return A.teamSticker(theme(major), team, logoUrl(team), finish, artCtx(), `${team} — ${major.name} (${finish})`); }); if (art) return art;
    const th = theme(major), seed = h32(team + major.name + finish), url = logoUrl(team);
    return render(D => {
      const bg = finish === 'paper' ? th.ink : D.lin([[0, '#ffffff'], [1, th.ink]], 0, 1);
      const ini = team.replace(/[^A-Za-zА-Яа-я0-9 ]/g, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
      const logo = url ? `<image href="${esc(url)}" x="22" y="10" width="56" height="58" preserveAspectRatio="xMidYMid meet"/>` : `<text x="50" y="54" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="26" fill="${th.bg}">${esc(ini)}</text>`;
      return `<rect width="100" height="100" fill="${bg}"/>${logo}` +
        `<path d="M0 72H100V86H0z" fill="${th.bg}"/><text x="50" y="81.6" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="${team.length > 13 ? 5.4 : team.length > 9 ? 6.6 : 8}" fill="${th.ink}">${esc(team.toUpperCase().slice(0, 18))}</text>`;
    }, th, finish, seed, `${team} — ${major.name} (${finish})`);
  }
  // Подпись: ник рукописным шрифтом, наклон и росчерк из хэша ника (не Мейджора) — подпись игрока постоянна.
  function signature(D, nick, finish, th) {
    const h = h32('sig|' + String(nick).toLowerCase());
    const rot = -14 + (h % 13), skew = -16 + ((h >>> 5) % 10), len = String(nick).length;
    const size = Math.max(13, Math.min(26, 150 / Math.max(4, len)));
    const fonts = ["'Segoe Script','Brush Script MT','Lucida Handwriting',cursive", "'Brush Script MT','Segoe Script',cursive", "'Lucida Handwriting','Segoe Script',cursive"];
    const ink = finish === 'gold' ? D.lin(GOLD_INK, 1, 0) : finish === 'holo' ? D.lin(HOLO, 1, 0) : finish === 'glitter' ? th.acc : '#0e1a33';
    const y = 50, x1 = 50 - len * size * .24, x2 = 50 + len * size * .26;
    const loop = (h >>> 9) % 3;
    const flourish = loop === 0 ? `M${n2(x1)} ${y + 8}C${n2(x1 + 20)} ${y + 15} ${n2(x2 - 10)} ${y + 2} ${n2(x2 + 6)} ${y + 6}`
      : loop === 1 ? `M${n2(x1 - 2)} ${y + 6}Q${50} ${y + 18} ${n2(x2)} ${y + 4}Q${n2(x2 + 8)} ${y} ${n2(x2 - 4)} ${y - 3}`
        : `M${n2(x1 + 4)} ${y + 10}C${n2(x1 - 6)} ${y + 2} ${n2(x1 + 6)} ${y - 6} ${n2(x1 + 12)} ${y + 2}S${n2(x2)} ${y + 12} ${n2(x2 + 4)} ${y + 5}`;
    const dot = (h >>> 12) % 2 ? `<circle cx="${n2(x2 + 6)}" cy="${y - 12}" r="1.6" fill="${ink}"/>` : '';
    return `<g transform="rotate(${rot} 50 ${y}) skewX(${skew})" transform-origin="50 ${y}"><text x="50" y="${y}" text-anchor="middle" font-family="${fonts[h % fonts.length]}" font-style="italic" font-size="${n2(size)}" fill="${ink}" stroke="${ink}" stroke-width=".35">${esc(nick)}</text>` +
      `<path d="${flourish}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>${dot}</g>`;
  }
  function autograph(major, nick, team, finish, tier) {
    const art = viaArt(function autograph(A) { return A.autograph(theme(major), nick, team, logoUrl(team), finish, artCtx(), `Автограф ${nick} — ${major.name} (${finish})`, tier || (major.champion && major.champion === team ? 'champion' : '')); }); if (art) return art;
    const th = theme(major), seed = h32(nick + major.name + finish), url = logoUrl(team);
    return render(D => {
      const card = finish === 'paper' ? '#f7f5ef' : finish === 'gold' ? '#fbf3dc' : '#f3f6ff';
      return `<rect width="100" height="100" fill="${card}"/>` +
        (url ? `<image href="${esc(url)}" x="22" y="18" width="56" height="56" opacity=".16" preserveAspectRatio="xMidYMid meet"/>` : '') +
        signature(D, nick, finish, th) +
        `<path d="M0 74H100V86H0z" fill="${th.bg}"/><text x="50" y="82.4" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="6" letter-spacing=".6" fill="${th.ink}">${esc(th.tag)} ${esc(th.year)}</text>`;
    }, th, finish, seed, `Автограф ${nick} — ${major.name} (${finish})`);
  }

  // ---------------------------------------------------------------- капсулы
  const store = () => { const s = ST(); if (!s) return {}; return (s.v84Stickers = s.v84Stickers || {}); };
  const lineupOf = t => (t?.players || []).filter(p => p && p.nick && p.status !== 'BENCH').slice(0, 5).map(p => p.nick);
  const teamBy = n => (typeof teams !== 'undefined' ? teams : []).find(t => t && t.name === n);
  const yearFromName = n => (String(n).match(/20\d\d/) || [])[0] || '';
  function capsules() {
    const S = store(), out = Object.values(S).filter(c => c && c.name);
    // Прошлые Мейджоры из архива, если капсула не была создана (старые сохранения)
    try {
      const A = H?.archive?.() || {};
      Object.values(A).forEach(s => {
        if (!s || !/major/i.test(String(s.prestige || s.kind || '')) || s.show || !s.champion || s.champion === '—') return;
        if (out.some(c => c.name === s.name)) return;
        const rost = s.rost || {}, tm = Object.keys(rost).filter(k => Array.isArray(rost[k]) && rost[k].length);
        if (tm.length < 4) return;
        out.push({ name: s.name, year: s.year || yearFromName(s.name), season: s.season, at: s.gs || 0, teams: tm.map(t => ({ name: t, players: rost[t].slice(0, 5).map(p => p.nick || p) })), archived: true, champion: s.champion });
      });
    } catch (e) {}
    return out.sort((a, b) => (b.at || 0) - (a.at || 0));
  }
  function ensureCapsule() {
    const ct = typeof currentTournament !== 'undefined' ? currentTournament : null;
    if (!ct || !ct.isMajor || ct.completed || !ct.name) return null;
    const S = store(); if (S[ct.name]) return S[ct.name];
    let tm = (ct.participants || []).map(x => typeof x === 'string' ? x : x?.name).filter(Boolean);
    if (tm.length < 8) return null;
    // v146: порядок команд — Stage III, Stage II, Stage I (капсулы Legends/Challengers/Contenders берут 8/8/остальных):
    // раньше брался порядок участников, и в Legends попадали команды Stage I, а не те, что показаны в Pick'Em
    try {
      const sch = (typeof seasonState !== 'undefined' && seasonState.seasonSchedule) || [], ent = sch.find(e => e && e.name === ct.name);
      const pools = (ent && (W.v45MajorStagePools?.(sch.indexOf(ent)) || ent.v45StagePools)) || null, nm = x => typeof x === 'string' ? x : x?.name;
      if (pools) { const ord = [].concat(pools.stage3 || [], pools.stage2 || [], pools.stage1 || []).map(nm).filter(n => n && tm.includes(n)); tm = ord.concat(tm.filter(n => !ord.includes(n))); }
    } catch (e) {}
    const cap = S[ct.name] = { name: ct.name, year: yearFromName(ct.name) || (2025 + (ct.season || 1)), season: ct.season, at: nowMs(), teams: tm.map(n => ({ name: n, players: lineupOf(teamBy(n)) })) };
    const nPl = cap.teams.reduce((a, t) => a + t.players.length, 0);
    try {
      W.V29News?.add?.({ cat: 'major', icon: '🏷️', imp: 6, title: `Вышли капсулы стикеров ${ct.name}`, lead: `${tm.length} команд, ${nPl} автографов и стикер турнира в четырёх исполнениях: Paper, Glitter, Holo и Gold.`,
        body: ['Половина выручки от продаж стикеров команд и автографов распределяется между клубами и игроками.', 'Продажи открыты до окончания Мейджора; итоги подведут через неделю после финала.'], tags: [] });
    } catch (e) {}
    return cap;
  }
  // Выручка: база по популярности (место в рейтинге) × ажиотаж Мейджора; плюс бонус за глубину прохода.
  function settle(cap) {
    if (!cap || cap.settled) return;
    const A = H?.archive?.() || {}, snap = Object.values(A).find(s => s && s.name === cap.name && s.champion && s.champion !== '—');
    if (!snap) return;
    const end = Number(snap.ge) || 0; if (end && nowMs() < end + 7 * DAY) return;
    const place = {}; (snap.results || []).forEach(r => { place[r.n] = r.p; });
    const rankOf = n => { try { return W.V31?.rankOf?.(n) || 30; } catch (e) { return 30; } };
    const hype = .85 + (h32('hype|' + cap.name) % 40) / 100;
    // v94: база — популярность клуба (v93: болельщики покупают стикеры своей команды), а не место в рейтинге; множитель —
    // стадия, до которой команда дошла: чем дольше команда на Мейджоре, тем больше продаж её стикеров
    const popOf = n => { try { const tt = (typeof teams !== 'undefined' ? teams : []).find(x => x.name === n); return tt && W.CS2Fans ? W.CS2Fans.popularity(tt) : null; } catch (e) { return null; } };
    const CF = (k, d) => { try { return W.CS2Config ? W.CS2Config.get(k, d) : d; } catch (e) { return d; } };
    cap.revenue = cap.teams.map(t => {
      const rk = rankOf(t.name), p = place[t.name] || 32, pop = popOf(t.name);
      const base = pop != null ? CF('econ.stickerBase', 60000) + CF('econ.stickerPop', 2200) * Math.pow(pop, 1.35) : 90000 + 1250000 * Math.pow(Math.max(0, 40 - rk) / 40, 2.2);
      const stage = p === 1 ? 'чемпион' : p === 2 ? 'финал' : p <= 4 ? 'полуфинал' : p <= 8 ? 'плей-офф' : p <= 16 ? 'Stage 3' : p <= 24 ? 'Stage 2' : 'Stage 1';
      const run = { 'чемпион': 2.5, 'финал': 2.0, 'полуфинал': 1.7, 'плей-офф': 1.45, 'Stage 3': 1.25, 'Stage 2': 1.1, 'Stage 1': 1 }[stage];
      return { team: t.name, stage, amt: Math.round(base * run * hype / 1000) * 1000 };
    }).sort((a, b) => b.amt - a.amt);
    cap.settled = nowMs();
    try { cap.revenue.forEach(r => W.V31?.book?.(r.team, r.amt * .5, 'stickers', `Стикеры ${cap.name} (доля клуба, ${r.stage || ''})`)); } catch (e) {}   // v94: отдельная статья
    const total = cap.revenue.reduce((a, r) => a + r.amt, 0), top = cap.revenue.slice(0, 3), m = v => '$' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + ' млн';
    try {
      W.V29News?.add?.({ cat: 'major', icon: '🏷️', imp: 6, title: `Стикеры ${cap.name} принесли командам ${m(total)}`, lead: `Больше всех заработали ${top.map(r => `${r.team} (${m(r.amt)})`).join(', ')}.`,
        body: ['Половина суммы идёт клубу, половина — игрокам состава поровну.', snap.champion ? `Автографы чемпионов (${snap.champion}) в исполнении Gold подорожали сильнее всего.` : ''].filter(Boolean), tags: [] });
    } catch (e) {}
  }
  function tick() {
    try { ensureCapsule(); Object.values(store()).forEach(c => { if (!c.settled) settle(c); }); } catch (e) { console.warn('[v84 stickers]', e); }
  }
  // Ориентировочная цена на рынке
  function price(kind, finish, popular) {
    const base = { event: [.03, .4, 1.6, 9], team: [.03, .25, 1.1, 6], auto: [.03, .2, .9, 4.5] }[kind] || [.03, .2, 1, 5];
    const i = FINISHES.findIndex(f => f[0] === finish);
    return '$' + (base[Math.max(0, i)] * (popular || 1)).toFixed(2);
  }

  // ---------------------------------------------------------------- страницы
  if (H && H.PAGES) {
    H.S.stk = H.S.stk || { major: '', finish: 'holo', view: 'teams' };
    H.PAGES.stickers = function () {
      const list = capsules(), f = H.S.stk;
      if (!list.length) return `<div class="hs-head"><h1>Стикеры Мейджоров</h1></div>` + H.box('Капсулы', H.empty('Капсула выйдет к старту ближайшего Мейджора'));
      const cap = list.find(c => c.name === f.major) || list[0];
      const maj = { name: cap.name, year: cap.year, champion: cap.champion || '' };
      const chips = list.map(c => `<button type="button" class="hs-chip${c === cap ? ' on' : ''}" data-stkmajor="${esc(c.name)}">${esc(c.name)}</button>`).join('');
      const fin = FINISHES.map(([k, l]) => `<button type="button" class="hs-chip${f.finish === k ? ' on' : ''}" data-stkfin="${k}">${l}</button>`).join('');
      const views = [['teams', 'Команды'], ['autos', 'Автографы']].map(([k, l]) => `<button type="button" class="hs-chip${f.view === k ? ' on' : ''}" data-stkview="${k}">${l}</button>`).join('');
      const cell = (svg, title, sub, pr, attrs) => `<div class="v84-stk"${attrs || ''}>${svg}<b>${esc(title)}</b><small>${esc(sub)} · ${pr}</small></div>`;
      let grid = '';
      if (f.view === 'autos') {
        grid = cap.teams.map(t => `<div class="v84-stk-team"><h4>${H.logo ? H.logo(t.name, 18) : ''} ${esc(t.name)}</h4><div class="v84-stk-grid">${t.players.map(nk => cell(autograph(maj, nk, t.name, f.finish), nk, t.name, price('auto', f.finish), ` data-player="${esc(nk)}"`)).join('')}</div></div>`).join('');
      } else {
        grid = `<div class="v84-stk-grid">${cell(eventSticker(maj, f.finish), cap.name, 'Стикер турнира', price('event', f.finish))}${cap.teams.map(t => cell(teamSticker(maj, t.name, f.finish), t.name, 'Команда', price('team', f.finish), ` data-team="${esc(t.name)}"`)).join('')}</div>`;
      }
      const rev = cap.revenue ? H.box('Выручка капсулы', `<table class="hs-tbl"><tbody>${cap.revenue.slice(0, 10).map((r, i) => `<tr><td>${i + 1}</td><td class="l">${esc(r.team)}</td><td>$${(r.amt / 1e6).toFixed(2)} млн</td></tr>`).join('')}</tbody></table>`) : '';
      return `<div class="hs-head"><h1>Стикеры Мейджоров</h1></div><div class="hs-filters v84-stk-bar">${chips}</div><div class="hs-filters v84-stk-bar">${views}<span class="v84-stk-sep"></span>${fin}</div>` +
        `<div class="v84-cols-main">${H.box(`Капсула ${cap.name}`, grid)}${rev}</div>`;
    };
    H.CLICKS.push(['[data-stkmajor]', el => { H.S.stk.major = el.dataset.stkmajor; H.render(); }]);
    H.CLICKS.push(['[data-stkfin]', el => { H.S.stk.finish = el.dataset.stkfin; H.render(); }]);
    H.CLICKS.push(['[data-stkview]', el => { H.S.stk.view = el.dataset.stkview; H.render(); }]);
    try { if (Array.isArray(H.NAV_MORE) && !H.NAV_MORE.some(x => x[0] === 'stickers')) H.NAV_MORE.push(['stickers', 'Стикеры']); } catch (e) {}
    const addMenu = () => { try { const m = document.querySelector('.pt-menu[data-menu="more"]'); if (m && !m.querySelector('[data-nav="stickers"]')) m.insertAdjacentHTML('beforeend', '<button type="button" data-nav="stickers">Стикеры</button>'); } catch (e) {} };
    (H.AFTER || []).push(addMenu); setTimeout(addMenu, 1600);
    // Профиль игрока: его автографы по Мейджорам
    (H.AFTER || []).push(page => {
      if (page !== 'player') return;
      try {
        const root = document.getElementById('hs-page'); if (!root || root.querySelector('.v84-stk-shelf')) return;
        const nick = H.S.arg ? String(H.S.arg).split('/')[0] : ''; if (!nick) return;
        const own = []; capsules().forEach(c => c.teams.forEach(t => { if (t.players.some(p => String(p).toLowerCase() === nick.toLowerCase())) own.push({ c, t }); }));
        if (!own.length) return;
        const html = `<section class="hs-box v84-stk-shelf"><div class="hs-box-h"><h3>Автографы на стикерах Мейджоров</h3></div><div class="v84-stk-row">${own.slice(0, 8).map(({ c, t }) => `<div class="v84-stk sm" title="${esc(c.name)}">${autograph({ name: c.name, year: c.year }, nick, t.name, 'gold')}<small>${esc(c.name)}</small></div>`).join('')}</div></section>`;
        const anchor = root.querySelector('.pl-shelf') || root.querySelector('.hs-phead'); if (anchor) anchor.insertAdjacentHTML('afterend', html);
      } catch (e) { console.warn('[v84 stickers shelf]', e); }
    });
  }
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(() => { tick(); }, 4000);
  W.CS2Stickers = { theme, eventSticker, teamSticker, autograph, capsules, ensureCapsule, settle, tick, FINISHES };
})();
