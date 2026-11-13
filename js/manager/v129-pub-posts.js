/* v129 — паблики в стиле Telegram-каналов.
   Страница «Паблики» (#/pubs): каналы CS2 NEWS и CS3 NEWS. Каждый пост — квадратная карточка-инфографика,
   подпись в стиле канала, реакции с числами, просмотры, подпись админа и время, комментарии.
   Карточки собираются из данных игры:
     CS2 NEWS (тёмно-синий, жёлтый акцент): пики карт матча, история встреч (таблица и серия с портретами),
       топ-5 игроков турнира по рейтингу и по клатчам, худшие/лучшие турниры звезды, статистика команды за сезон,
       «когда участники выигрывали трофей», цитата/заголовок с портретом.
     CS3 NEWS (чёрный, голубой акцент): результат матча со счётом по картам, статистика игрока за матч, «Факт»,
       «Дайджест новостей», сетка плей-офф, цитата на фото.
   Новости пабликов из ленты (src = cs2news / cs3news) тоже становятся постами со своей карточкой. */
(function () {
  'use strict';
  const W = window, H = W.HS;
  if (!H || !H.PAGES) return;
  const esc = H.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const DAY = 864e5;
  const now = () => { try { return H.nowMs ? H.nowMs() : Date.now(); } catch (e) { return Date.now(); } };

  /* ------------------------------------------------------------ медиа */
  const media = (k, n) => { try { return (W.V31Media && W.V31Media.url(k, n)) || ''; } catch (e) { return ''; } };
  const full = n => { try { return (W.V31Media && W.V31Media.full && W.V31Media.full(n)) || media('player', n) || ''; } catch (e) { return ''; } };
  const tint = name => { const u = media('team', name), f = u && String(u).split('/').pop(), t = f && W.CS2_TEAM_TINT && W.CS2_TEAM_TINT[f]; return t || [120, 130, 150]; };
  const rgb = name => tint(name).join(',');
  const short = n => String(n || '').replace(/^Team\s+/i, '').replace(/\s+(Esports|Gaming|Clan|Club)$/i, '').trim();
  const U = s => esc(String(s || '').toUpperCase());
  const img = (u, cls) => u ? `<i class="${cls}" style="background-image:url('${esc(u)}')"></i>` : `<i class="${cls} none"></i>`;
  const tlogo = (name, cls) => img(media('team', name), cls || 'pp-tl');
  const flagOf = nick => { try { const x = H.playerNow(nick); return x && x.p && H.pFlag ? H.pFlag(x.p) : ''; } catch (e) { return ''; } };
  const teamOfNick = nick => { try { const x = H.playerNow(nick); return (x && x.t && x.t.name) || ''; } catch (e) { return ''; } };
  const MONTHS = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
  const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const dshort = ts => { const d = new Date(ts); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const dlong = ts => { const d = new Date(ts); return `${d.getDate()} ${MONTHS_G[d.getMonth()]}`; };
  const hhmm = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const k = n % 10; return n > 10 && n < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
  const kfmt = v => v >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1).replace('.0', '') + 'K' : String(v);

  /* ------------------------------------------------------------ каналы */
  const CH = {
    cs2news: { id: 'cs2news', name: 'CS2 NEWS', handle: 'CS2NEWS', subs: 185412, logo: 'assets/ui/publishers/cs2news.webp', theme: 'y', admins: ['kexx', 'Sm0ke', 'Rudik', 'Panda'], tag: '#CS2NEWS' },
    cs3news: { id: 'cs3news', name: 'CS3NEWS | Counter-Strike 2', handle: 'CS3NEWS', subs: 132870, logo: 'assets/ui/publishers/cs3news.webp', theme: 'b', admins: ['Mint', 'Bergamot', 'Lexa_ph', 'tapok'], tag: '#CS3NEWS' },
    hltv: { id: 'hltv', name: 'HLTV.org', handle: 'HLTV', subs: 412308, verified: true, theme: 'h', admins: ['HLTV.org'], tag: '#HLTV',
      logo: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2d6da3"/><rect x="4" y="4" width="56" height="56" rx="11" fill="#1f4f7a"/><text x="32" y="40" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="19" fill="#fff" letter-spacing="-1">HLTV</text><rect x="14" y="45" width="36" height="3" rx="1.5" fill="#7fc1ff"/></svg>') },
    insider: { id: 'insider', name: 'CS Инсайды 🕵️', handle: 'CSINSIDE', subs: 96540, theme: 'i', admins: ['источник', 'insider_k', 'Мышь'], tag: '#ИНСАЙД',
      logo: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3d5a"/><stop offset="1" stop-color="#7a0f2a"/></linearGradient></defs><rect width="64" height="64" rx="32" fill="url(#g)"/><circle cx="24" cy="30" r="7" fill="#111"/><circle cx="40" cy="30" r="7" fill="#111"/><path d="M17 30h30" stroke="#111" stroke-width="3"/><path d="M14 22q18-12 36 0" stroke="#111" stroke-width="5" fill="none"/><path d="M24 44q8 5 16 0" stroke="#111" stroke-width="3" fill="none"/></svg>') }
  };
  const svgLogo = (bg, fg, txt, fs) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${bg}"/><text x="32" y="${fs > 20 ? 41 : 39}" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="${fs}" fill="${fg}">${txt}</text></svg>`);
  Object.assign(CH, {
    frag: { id: 'frag', name: 'FragNews | Аналитика CS', handle: 'FRAGNEWS', subs: 74210, theme: 'b', admins: ['stat_guy', 'Нейрон', 'ADR_enjoyer'], tag: '#FRAG', logo: svgLogo('#ff7a1a', '#111', 'FN', 26) },
    chron: { id: 'chron', name: 'Кибер Хроника', handle: 'CYBERCHRON', subs: 158930, theme: 'h', admins: ['Редакция', 'А. Соколов', 'М. Ким'], tag: '#ХРОНИКА', logo: svgLogo('#6b4bd6', '#fff', 'КХ', 24) },
    eco: { id: 'eco', name: 'Эко-раунд 💸', handle: 'ECOROUND', subs: 211400, theme: 'y', admins: ['мемолог', 'тильтер', 'бабушка_AWP'], tag: '#ЭКО', logo: svgLogo('#1fae5b', '#fff', '$', 34) }
  });
  CH.insider.name = 'CS Insider 🕵️'; CH.insider.handle = 'CSINSIDER';
  const CH_ORDER = ['hltv', 'chron', 'cs2news', 'cs3news', 'frag', 'insider', 'eco'];
  // источники в ленте новостей (v111): у каждого портала — свой значок
  try { const SRC = W.V111News && W.V111News.SRC; if (SRC) ['frag', 'chron', 'eco', 'insider'].forEach(k => { SRC[k] = SRC[k] || { id: k, name: CH[k].name.replace(/\s*[🕵️💸]+/gu, '').trim(), logo: CH[k].logo }; }); } catch (e) {}
  const brand = ch => `<span class="pp-brand"><img src="${esc(CH[ch].logo)}" alt="" loading="lazy" decoding="async"><b>${esc(CH[ch].handle)}</b></span>`;
  const corners = '<i class="pp-cn tl"></i><i class="pp-cn tr"></i><i class="pp-cn bl"></i><i class="pp-cn br"></i>';
  // .pp-cq — контейнер для единиц cqw (ширина карточки); у самой карточки могут быть отступы
  const card = (ch, cls, inner, foot) => `<div class="pp-cq"><div class="pp-card pp-${CH[ch].theme} ${cls}">${inner}${foot === false ? '' : `<footer class="pp-foot"><span>${esc(foot || '')}</span>${brand(ch)}<span>T.ME/${esc(CH[ch].handle)}</span></footer>`}</div></div>`;

  /* ------------------------------------------------------------ плитки карт (свои рисунки: в игре нет скриншотов карт) */
  const MAPS = {
    mirage: ['#e9c58e', '#b98b52', '#7fb6e6', s => `<rect x="0" y="0" width="100" height="70" fill="url(#sky)"/><path d="M0 26H46V130H0z" fill="#d7ab6a"/><path d="M8 130V70Q8 52 24 52Q40 52 40 70V130z" fill="#8a5a2c"/><path d="M12 130V72Q12 58 24 58Q36 58 36 72V130z" fill="#5c3818"/>${[30, 38, 46, 54, 62].map(y => `<path d="M0 ${y}H46" stroke="#b98b52" stroke-width=".5"/>`).join('')}<path d="M78 130V70" stroke="#6b4a2a" stroke-width="2.4"/><path d="M78 70Q66 62 58 68M78 70Q90 60 98 66M78 70Q70 56 62 54M78 70Q86 54 94 52M78 70Q78 58 76 50" stroke="#3f7a3a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M0 108H100V130H0z" fill="#c9a06a"/>`],
    inferno: ['#d9784a', '#9b4a2a', '#9ec6e8', s => `<rect width="100" height="60" fill="url(#sky)"/><path d="M0 34H100V130H0z" fill="#e8dcc8"/><path d="M10 34V20H30V34M62 34V12H72V34" fill="#e0d2bc"/><path d="M62 12L67 4L72 12z" fill="#b5522e"/>${[14, 38, 62, 86].map(x => `<path d="M${x - 9} 92V64Q${x - 9} 52 ${x} 52Q${x + 9} 52 ${x + 9} 64V92z" fill="#c8562e"/>`).join('')}<path d="M0 92H100V130H0z" fill="#a6643e"/><path d="M30 118Q30 104 50 104Q70 104 70 118z" fill="#8c8c86"/><path d="M46 104V88H54V104z" fill="#b8b4a8"/><circle cx="50" cy="86" r="3" fill="#cfcabe"/>`],
    nuke: ['#c6d7e6', '#6a8aa6', '#a8cdee', s => `<rect width="100" height="70" fill="url(#sky)"/><path d="M14 70V40Q14 26 30 26Q46 26 46 40V70z" fill="#eef2f4"/><path d="M54 70V34Q54 22 68 22Q82 22 82 34V70z" fill="#e4eaee"/><path d="M0 64H100V130H0z" fill="#9fb1bf"/><path d="M0 64H100V74H0z" fill="#d23a2a"/>${[10, 30, 50, 70, 90].map(x => `<rect x="${x - 6}" y="84" width="12" height="18" fill="#56738c"/>`).join('')}<path d="M0 112H100V130H0z" fill="#6e7c86"/>`],
    ancient: ['#7fae6a', '#3f6a3a', '#a9d3c8', s => `<rect width="100" height="70" fill="url(#sky)"/><path d="M0 50Q20 30 40 46Q60 26 100 44V130H0z" fill="#3f7a46"/><path d="M26 130V78H74V130z" fill="#a39a82"/><path d="M32 78V66H68V78zM38 66V56H62V66z" fill="#b5ad96"/><path d="M42 130V100Q42 92 50 92Q58 92 58 100V130z" fill="#2d2a22"/>${[28, 40, 60, 72].map(x => `<path d="M${x} 84v40" stroke="#8a8270" stroke-width="1.4"/>`).join('')}<path d="M0 120H100V130H0z" fill="#5c7a3a"/>`],
    anubis: ['#d8b878', '#2f8f9a', '#9ad2e6', s => `<rect width="100" height="70" fill="url(#sky)"/><path d="M60 70L80 34L100 70z" fill="#d6b06a"/><path d="M0 60H100V130H0z" fill="#cfae74"/>${[12, 30, 48].map(x => `<rect x="${x}" y="40" width="8" height="54" fill="#e4c88e"/><rect x="${x - 2}" y="36" width="12" height="5" fill="#b8925a"/>`).join('')}<path d="M0 98H100V130H0z" fill="#2f8f9a"/><path d="M0 104Q10 100 20 104T40 104T60 104T80 104T100 104" stroke="#8fd6dc" stroke-width="1" fill="none"/>`],
    overpass: ['#9fb0a2', '#5e6e62', '#bcd6e8', s => `<rect width="100" height="70" fill="url(#sky)"/>${[10, 26, 84].map(x => `<circle cx="${x}" cy="56" r="12" fill="#5f8a4e"/>`).join('')}<path d="M0 40H100V50H0z" fill="#a8aaa6"/><path d="M20 50V130H30V50zM70 50V130H80V50z" fill="#8f918c"/><path d="M0 100H100V130H0z" fill="#7c7f7a"/><path d="M0 108H100" stroke="#e8d23a" stroke-width="1.2" stroke-dasharray="6 4"/>`],
    dust2: ['#e3c48a', '#a8824a', '#8fc0ea', s => `<rect width="100" height="70" fill="url(#sky)"/><path d="M0 30H100V130H0z" fill="#d9b77a"/><path d="M30 130V60H70V130z" fill="#a37b45"/><path d="M33 130V64H49V130zM51 130V64H67V130z" fill="#6b8a9a"/><path d="M0 110H100V130H0z" fill="#c4a066"/>`],
    train: ['#a8a69a', '#5a5a52', '#b9cfe0', s => `<rect width="100" height="70" fill="url(#sky)"/><path d="M0 46H100V130H0z" fill="#8c8a80"/><rect x="6" y="56" width="56" height="34" rx="3" fill="#2f6a8e"/><rect x="66" y="56" width="40" height="34" rx="3" fill="#b5452e"/>${[12, 24, 36, 48].map(x => `<rect x="${x}" y="62" width="8" height="10" fill="#cfe2ee"/>`).join('')}<path d="M0 104H100M0 116H100" stroke="#3a3a36" stroke-width="2"/>${[6, 18, 30, 42, 54, 66, 78, 90].map(x => `<path d="M${x} 100v20" stroke="#6b5a46" stroke-width="2"/>`).join('')}`],
    vertigo: ['#9fbfe0', '#4a6a8e', '#8fc2f0', s => `<rect width="100" height="130" fill="url(#sky)"/><path d="M10 130V30H48V130z" fill="#c8ccd0"/>${[38, 50, 62, 74, 86, 98, 110].map(y => `<path d="M10 ${y}H48" stroke="#9aa0a6"/>`).join('')}<path d="M56 130V50H96V130z" fill="#a6abb0"/><path d="M56 50L96 90M96 50L56 90M56 90L96 130M96 90L56 130" stroke="#e0a43a" stroke-width="1.6"/>`],
    cache: ['#a9b2aa', '#5a645c', '#c3d4e2', s => `<rect width="100" height="70" fill="url(#sky)"/><path d="M0 30H100V130H0z" fill="#b9bdb6"/>${[36, 48, 60].map(y => `<path d="M0 ${y}H100" stroke="#9aa09a"/>`).join('')}<rect x="4" y="70" width="44" height="40" fill="#b5352a"/><rect x="52" y="78" width="44" height="32" fill="#3f7a4a"/>${[10, 18, 26, 34, 42].map(x => `<path d="M${x} 72v36" stroke="#8a2a20"/>`).join('')}<path d="M0 110H100V130H0z" fill="#6c706a"/>`],
    dust: ['#e3c48a', '#a8824a', '#8fc0ea', null]
  };
  let SKY = 0;
  function mapArt(name) {
    const k = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^dustii$/, 'dust2'), M = MAPS[k] || MAPS.mirage;
    const id = 'ppsky' + (++SKY);
    return `<svg class="pp-mapart" viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${M[2]}"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>${(M[3] || MAPS.dust2[3])().split('url(#sky)').join(`url(#${id})`)}</svg>`;
  }

  /* ------------------------------------------------------------ данные */
  const TIERW = { major: 6, elite: 5, regular: 4, tier2: 2, tier3: 1, qual: 0, academy: 0 };
  function matches() { try { return (H.allMatches() || []).filter(m => m && m.a && m.b && m.w && Array.isArray(m.s)); } catch (e) { return []; } }
  function bigMatches() { const ms = matches(); const top = Math.max(0, ...ms.map(m => TIERW[m.kind] || 0)); return ms.filter(m => (TIERW[m.kind] || 0) >= Math.min(top, 4) && (m.mp || []).length); }
  let STATS = null, STATS_AT = 0;
  const stats = () => { if (!STATS || Date.now() - STATS_AT > 20000) { try { STATS = H.stats(); } catch (e) { STATS = { P: {} }; } STATS_AT = Date.now(); } return STATS; };
  const line = z => { try { return z ? H.line(z) : null; } catch (e) { return null; } };
  const evById = () => { const o = {}; try { (H.events() || []).forEach(e => { o[e.id] = e; o[e.name] = e; }); } catch (e) {} return o; };
  const rankOf = name => { try { const i = H.ranked().findIndex(t => (t.name || t) === name); return i < 0 ? null : i + 1; } catch (e) { return null; } };
  const rosterOf = name => { try { const t = H.teamBy(name); return ((t && t.players) || []).slice(0, 5).map(p => p.nick); } catch (e) { return []; } };
  function pickTeams(m) { // кто выбрал карты: первая — проигравший жеребьёвку (по хэшу), вторая — другой, третья — десайдер
    const n = (m.mp || []).length, first = h32(m.id) % 2 ? m.a : m.b, second = first === m.a ? m.b : m.a;
    return (m.mp || []).map((x, i) => n === 1 ? null : i === n - 1 && n % 2 ? null : i % 2 ? second : first);
  }
  function statIndex() { // матчи и турниры, по которым есть статистика игроков (в т.ч. уже ушедшие из ленты матчей)
    const P = stats().P || {}, ms = new Map(), ev = new Map();
    for (const n in P) { (P[n].matches || []).forEach(x => { if (!ms.has(x.id)) ms.set(x.id, { id: x.id, a: x.team, b: x.opp, w: x.won ? x.team : x.opp, s: x.s, ts: x.ts, ev: x.ev, kind: x.kind, mp: [], stage: '' }); });
      Object.entries(P[n].byEv || {}).forEach(([k, e]) => { const o = ev.get(k); if (!o) ev.set(k, { id: k, name: e.name, kind: e.kind, ts: e.ts || 0 }); else if ((e.ts || 0) > o.ts) o.ts = e.ts; }); }
    return { ms, ev }; }
  function bestInMatch(m) { // лучший игрок матча по рейтингу
    const P = stats().P || {}; let best = null;
    for (const nick in P) { const o = P[nick]; if (!o || !o.matches) continue; const r = o.matches.find(x => x.id === m.id); if (!r) continue; const L = line(r.z); if (!L || L.rating == null) continue;
      if (!best || L.rating > best.L.rating) best = { nick, team: r.team, L, z: r.z }; }
    return best;
  }
  function eventTop(evId, key, n) {
    const P = stats().P || {}, out = [];
    for (const nick in P) { const e = P[nick] && P[nick].byEv && P[nick].byEv[evId]; if (!e) continue; const L = line(e.s); if (!L || !L.maps || L.maps < 2) continue; out.push({ nick, team: e.team, L }); }
    return out.sort((a, b) => (b.L[key] || 0) - (a.L[key] || 0)).slice(0, n || 5);
  }

  function yearTop(year, key, n, minMaps) {
    const P = stats().P || {}, out = [];
    for (const nick in P) { const e = P[nick] && P[nick].byYear && P[nick].byYear[year]; if (!e) continue; const L = line(e); if (!L || !L.maps || L.maps < (minMaps || 8)) continue; out.push({ nick, team: P[nick].team || teamOfNick(nick), L }); }
    return out.sort((a, b) => (b.L[key] || 0) - (a.L[key] || 0)).slice(0, n || 5);
  }

  /* ------------------------------------------------------------ шаблоны CS2 NEWS */
  const T = {};
  T.veto = (ch, m) => {
    const picks = pickTeams(m), maps = (m.mp || []).slice(0, 3);
    const tiles = maps.map((x, i) => `<div class="pp-map">${mapArt(x[0])}<i class="pp-map-sh"></i>${picks[i] ? `<span class="pp-map-l">${tlogo(picks[i])}</span>` : ''}<b class="pp-map-n">${U(x[0])}</b><em class="pp-chip${picks[i] ? '' : ' w'}">${picks[i] ? 'PICK' : 'DECIDER'}</em></div>`).join('');
    return card(ch, 'pp-veto', `${corners}<i class="pp-wm">MAPS</i><h3 class="pp-vs"><b>${U(short(m.a))}</b><span><em>vs</em> <b>${U(short(m.b))}</b></span></h3><p class="pp-ev">${U(m.ev)}</p><div class="pp-maps n${maps.length}">${tiles}</div>`, stageShort(m.stage));
  };
  const stageShort = s => { s = String(s || '').split(' · ').pop(); return s.toUpperCase(); };
  T.h2h = (ch, A, B, list) => {
    const byY = {}; list.slice().sort((x, y) => x.ts - y.ts).forEach(m => { const y = m.gameYear || m.year; (byY[y] = byY[y] || []).push(m); });
    const rows = []; Object.keys(byY).sort().forEach(y => { const ms = byY[y], wa = ms.filter(m => m.w === A).length; rows.push(`<div class="pp-yr">${y}: ${wa}-${ms.length - wa}</div>`);
      ms.forEach(m => { const sa = m.a === A ? m.s[0] : m.s[1], sb = m.a === A ? m.s[1] : m.s[0]; rows.push(`<div class="pp-row"><span class="pp-rn r">${esc(short(A))}</span>${tlogo(A)}<b class="${sa > sb ? 'w' : ''}">${sa}</b><i>|</i><b class="${sb > sa ? 'w' : ''}">${sb}</b>${tlogo(B)}<span class="pp-rn">${esc(short(B))}</span></div>`); }); });
    const two = rows.length > 11, half = Math.ceil(rows.length / 2);
    const cols = two ? `<div class="pp-col">${rows.slice(0, half).join('')}</div><div class="pp-col">${rows.slice(half).join('')}</div>` : `<div class="pp-col one">${rows.join('')}</div>`;
    return card(ch, 'pp-h2h', `${corners}<i class="pp-wm">H2H</i><h3 class="pp-title">ИСТОРИЯ ВСТРЕЧ<br><span class="y">${U(short(A))} VS ${U(short(B))}</span></h3><div class="pp-cols${two ? ' two' : ''}">${cols}</div>`, `${short(A)} vs ${short(B)}`);
  };
  T.series = (ch, A, B, list) => {
    const pa = rosterOf(A)[0], pb = rosterOf(B)[0], ra = rankOf(A), rb = rankOf(B);
    const rows = list.slice(0, 5).map(m => { const sa = m.a === A ? m.s[0] : m.s[1], sb = m.a === A ? m.s[1] : m.s[0];
      return `<div class="pp-ser"><i class="pp-ser-a"></i>${tlogo(A, 'pp-tl pp-ser-l')}<span class="pp-ser-s"><b>${sa}</b><i></i><b>${sb}</b><small>${U(m.ev)}</small></span>${tlogo(B, 'pp-tl pp-ser-l')}<i class="pp-ser-b"></i></div>`; }).join('');
    return card(ch, 'pp-series', `<i class="pp-ser-bg" style="--ca:${rgb(A)};--cb:${rgb(B)}"></i>${img(full(pa), 'pp-ser-pa')}${img(full(pb), 'pp-ser-pb')}<h3 class="pp-title">ИСТОРИЯ ВСТРЕЧ</h3><p class="pp-sub">${esc(short(A))} vs. ${esc(short(B))} latest H2H series</p><div class="pp-sers">${rows}</div>` +
      `<div class="pp-ser-n a">${tlogo(A)}<b>${esc(short(A))}</b>${ra ? `<small>World Ranking #${ra}</small>` : ''}</div><div class="pp-ser-n b">${tlogo(B)}<b>${esc(short(B))}</b>${rb ? `<small>World Ranking #${rb}</small>` : ''}</div>`, false);
  };
  T.top5 = (ch, list, title, sub, val, unit) => {
    const cols = list.map((x, i) => `<div class="pp-t5${i ? '' : ' first'}"><span class="pp-t5-ph">${img(full(x.nick), 'pp-t5-img')}</span><b class="pp-t5-n">${esc(x.nick)}</b><span class="pp-t5-m">${tlogo(x.team || teamOfNick(x.nick))}<u class="pp-t5-d"></u><span class="pp-flagc">${flagOf(x.nick)}</span></span><strong>${esc(val(x))}</strong><small>${esc(unit(x))}</small></div>`).join('');
    return card(ch, 'pp-top5', `${corners}<h3 class="pp-title cond">${U(title)}</h3><p class="pp-sub y it">${U(sub)}</p><div class="pp-t5s">${cols}</div>`, '');
  };
  T.worst = (ch, nick, rows, best) => {
    const list = rows.map(r => `<div class="pp-wr"><span class="pp-wr-v${r.mark ? ' y' : ''}">${r.v}</span><span class="pp-wr-e"><small>${esc(dshort(r.ts).toUpperCase())}</small><b>${U(r.ev)}</b></span></div>`).join('');
    return card(ch, 'pp-worst', `${corners}<i class="pp-wm">STATS</i><h3 class="pp-title">${best ? 'ЛУЧШИЕ' : 'ХУДШИЕ'} ТУРНИРЫ<br><span class="y">В КАРЬЕРЕ ${U(nick)}</span></h3><div class="pp-wr-h"><span>RATING</span><span>ДАТА — ТУРНИР</span></div><div class="pp-wrs">${list}</div>${img(full(nick), 'pp-wr-ph')}`, `СТАТИСТИКА ${nick}`);
  };
  T.teamstats = (ch, team, year, S) => {
    const ros = rosterOf(team), mid = Math.floor(ros.length / 2), order = ros.slice();
    const ph = order.map((n, i) => img(full(n), `pp-ts-ph p${i}${i === mid ? ' mid' : ''}`)).join('');
    const tiles = S.map(([v, l]) => `<div class="pp-ts-t"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
    return card(ch, 'pp-tstats', `<i class="pp-side-tx l">T.ME // ${esc(CH[ch].handle)}</i><i class="pp-side-tx r">T.ME // ${esc(CH[ch].handle)}</i><h3 class="pp-title">СТАТИСТИКА ${U(short(team))}</h3><p class="pp-ribbon">СЕЗОН ${year} ГОДА</p><div class="pp-ts-band" style="--c:${rgb(team)}">${ph}</div><div class="pp-ts-g">${tiles}</div>`, false);
  };
  T.since = (ch, list, evName) => {
    const tiles = list.slice(0, 6).map(x => `<div class="pp-sn"><small>${U(short(x.team))}</small>${tlogo(x.team, 'pp-tl pp-sn-l')}<b>${x.days}</b><span>${plural(x.days, 'ДЕНЬ', 'ДНЯ', 'ДНЕЙ')} НАЗАД</span><em>${U(x.ev)}</em></div>`).join('');
    return card(ch, 'pp-since', `${corners}<i class="pp-waves"></i><h3 class="pp-title dark cond">КОГДА УЧАСТНИКИ ${U(evName)}<br>ВЫИГРЫВАЛИ ТРОФЕЙ?</h3><div class="pp-sns n${Math.min(6, list.length)}">${tiles}</div>`, `КОЛ-ВО ДНЕЙ НА ${dshort(now()).toUpperCase()}`);
  };
  T.quote = (ch, n, nick, text, sub) => {
    const len = text.length, sz = len > 150 ? 's' : len > 90 ? 'm' : 'l';
    return card(ch, 'pp-quote', `<div class="pp-q-l"><i class="pp-q-stripe"></i>${img(full(nick), 'pp-q-ph')}</div><div class="pp-q-r"><span class="pp-q-h">T.ME // ${esc(CH[ch].handle)}</span><b class="pp-q-m">❞❝</b><p class="pp-q-t ${sz}">${U(text)}</p><p class="pp-q-s">${U(sub)}</p></div><span class="pp-q-brand">${brand(ch)}</span>`, false);
  };
  T.headline = (ch, n, nick, team) => {
    const t = String(n.title || ''), sz = t.length > 90 ? 's' : t.length > 55 ? 'm' : 'l';
    const vis = nick ? img(full(nick), 'pp-hl-ph') : team ? `<span class="pp-hl-logo">${tlogo(team)}</span>` : '';
    const cat = (H.NCATS && H.NCATS()[n.cat] || {}).l || 'Новости';
    return card(ch, 'pp-head', `${corners}<i class="pp-wm pp-hl-wm">${U(cat.split(' ')[0])}</i><i class="pp-hl-bg"${team ? ` style="--c:${rgb(team)}"` : ''}></i>${vis}<span class="pp-kick">${esc((H.NCATS && H.NCATS()[n.cat] || {}).l || 'Новости')}</span><h3 class="pp-hl ${sz}">${U(t)}</h3>`, n.cat === 'rumor' || n.rumor ? 'СЛУХИ' : 'НОВОСТИ');
  };

  /* ------------------------------------------------------------ шаблоны CS3 NEWS */
  const ticker = ch => `<div class="pp-tick">${Array.from({ length: 6 }, () => `<span>${esc(CH[ch].handle)}</span><span>|</span><span>HLTV.SIM</span><span>×</span>`).join('')}</div>`;
  const barcode = '<i class="pp-bar"></i>';
  const cs3foot = (ch, label) => `<footer class="pp-foot3">${barcode}<span class="pp-mid">${esc(CH[ch].handle)}</span><em>${esc(label)}</em></footer>`;
  const scene = k => `assets/ui/scenes/${k}.webp`;
  // v129.3: фоны карточек — градиенты и узоры в цвете команды/канала (без фото-сцен)
  const CH_RGB = { y: '255,196,40', b: '64,150,255', h: '45,109,163', i: '220,50,80' };
  const bgCss = (seed, c) => { c = c || '70,90,150'; switch (h32('bg|' + seed) % 6) {
    case 0: return `radial-gradient(120% 90% at 80% 100%,rgba(${c},.7),transparent 62%),linear-gradient(135deg,#171a24,#0c0e13)`;
    case 1: return `repeating-linear-gradient(115deg,rgba(${c},.16) 0 7px,transparent 7px 16px),linear-gradient(160deg,rgba(${c},.55),#101218 72%)`;
    case 2: return `radial-gradient(rgba(255,255,255,.13) 1px,transparent 1.5px) 0 0/9px 9px,radial-gradient(90% 80% at 50% 100%,rgba(${c},.7),transparent 70%),#111319`;
    case 3: return `linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55)),linear-gradient(135deg,rgb(${c}),rgba(${c},.55))`;
    case 4: return `linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px) 0 0/14px 14px,linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px) 0 0/14px 14px,radial-gradient(80% 70% at 30% 40%,rgba(${c},.55),transparent 70%),#0f1117`;
    default: return `linear-gradient(115deg,rgba(${c},.85) 0 42%,rgba(${c},.25) 42% 46%,#13151c 46%)`; } };
  const bgStyle = (seed, team, ch) => `background:${bgCss(seed, team ? rgb(team) : CH_RGB[(CH[ch] || {}).theme])}`;
  T.result = (ch, m) => {
    const W2 = m.w, L2 = m.w === m.a ? m.b : m.a, ros = rosterOf(W2).slice(0, 3), picks = pickTeams(m);
    const sa = m.s[0], sb = m.s[1], bo = m.bo || (Math.max(sa, sb) === 3 ? 5 : Math.max(sa, sb) === 2 ? 3 : 1);
    const maps = (m.mp || []).map((x, i) => `<div class="pp-rm"><span class="pp-rm-s">${x[1]}:${x[2]}</span><span class="pp-rm-a">${mapArt(x[0])}</span><b>${U(x[0])}</b>${picks[i] ? `<span class="pp-rm-p">${tlogo(picks[i])}</span>` : ''}</div>`).join('');
    const hero = `<div class="pp-hero"><i class="pp-hero-bg" style="${bgStyle(m.id, W2, ch)}"></i>${ros.map((n, i) => img(full(n), `pp-hero-p p${i}`)).join('')}<i class="pp-hero-fade"></i><span class="pp-pill">${U(m.ev)}</span></div>`;
    return card(ch, 'pp-result', `${ticker(ch)}${hero}<span class="pp-stage">${U(stageShort(m.stage))}.</span><div class="pp-rs"><span class="pp-rs-t">${tlogo(m.a, 'pp-tl big')}${corners}</span><b class="pp-rs-sc">${sa} - ${sb}</b><span class="pp-rs-t">${tlogo(m.b, 'pp-tl big')}${corners}</span></div>` +
      `<div class="pp-rs-n"><b>${U(short(m.a))}</b><em>BO${bo}</em><b>${U(short(m.b))}</b></div><div class="pp-rms n${(m.mp || []).length}">${maps}</div>${cs3foot(ch, 'РЕЗУЛЬТАТ')}`, false);
  };
  T.pstat = (ch, m, b) => {
    const L = b.L, opp = b.team === m.a ? m.b : m.a, map = (m.mp || []).length === 1 ? ' ON ' + U(m.mp[0][0]) : '';
    const swing = ((L.rating - 1) * 7.5 + (L.diff || 0) * .25);
    const boxes = [['RATING', L.rating.toFixed(2)], ['ADR', L.adr.toFixed(1)], ['KAST', L.kast.toFixed(1) + '%'], ['KPR', L.kpr.toFixed(2)]];
    if (Math.abs(swing) > .5) boxes[2] = ['SWING', (swing > 0 ? '+' : '') + swing.toFixed(2) + '%'];
    return card(ch, 'pp-pstat', `${ticker(ch)}<i class="pp-ps-bg"></i>${img(full(b.nick), 'pp-ps-ph')}<span class="pp-ps-tag">СТАТИСТИКА</span><span class="pp-ps-top">${brand(ch)}</span><span class="pp-ps-logo">${tlogo(b.team)}${corners}</span><div class="pp-ps-n"><b>${U(b.nick)}</b><small>VS ${U(short(opp))}${map}</small></div>` +
      `<div class="pp-ps-st">${boxes.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div>`, false);
  };
  T.fact = (ch, text, nick, team, mini) => {
    const t = String(text || ''), sz = t.length > 95 ? 's' : t.length > 48 ? 'm' : 'l';
    const bg = `<i class="pp-f-bg" style="${bgStyle(t, team, ch)}"></i>`;
    const vis = nick ? img(full(nick), 'pp-f-ph') : team ? `<span class="pp-f-logo">${tlogo(team)}</span>` : '';
    return card(ch, 'pp-fact' + (mini ? ' mini' : ''), `${mini ? '' : ticker(ch)}<div class="pp-f-top">${bg}${vis}<i class="pp-f-fade"></i><span class="pp-f-brand">${brand(ch)}</span><i class="pp-hot">🔥</i></div><div class="pp-f-band"><span class="pp-box">ФАКТ</span><h3 class="${sz}">${U(t)}</h3></div>${cs3foot(ch, 'ФАКТ')}`, false);
  };
  T.digest = (ch, factText, nick, team, ts) => `<div class="pp-cq"><div class="pp-card pp-b pp-digest">${img(full(nick), 'pp-dg-ph')}<i class="pp-dg-fade"></i><span class="pp-f-brand">${brand(ch)}</span><i class="pp-bolt">⚡</i><div class="pp-dg-mini">${T.fact(ch, factText, nick, team, true)}</div><div class="pp-dg-b"><span class="pp-box">ДАЙДЖЕСТ</span><b>НОВОСТЕЙ</b><em>${U(dlong(ts))}</em></div>${cs3foot(ch, 'НОВОСТИ')}</div></div>`;
  T.bracket = (ch, ev, rounds) => {
    const col = (r, i) => `<div class="pp-bk-c c${i}"><span class="pp-bk-h">${U(r.title)}</span>${r.ms.map(m => `<div class="pp-bk-m">${[m.a, m.b].map((t, j) => `<div class="pp-bk-t${m.w === t ? ' w' : m.w ? ' l' : ''}">${tlogo(t)}<b>${U(short(t))}</b><em>${m.s ? m.s[j] : ''}</em></div>`).join('')}</div>`).join('')}</div>`;
    return card(ch, 'pp-bracket', `${ticker(ch)}<i class="pp-trophy">🏆</i><div class="pp-bk-top"><span class="pp-bk-box">СЕТКА PLAY-OFF</span><h3>${U(ev)}</h3></div><div class="pp-bk n${rounds.length}">${rounds.map(col).join('')}</div>${cs3foot(ch, 'СЕТКА')}`, false);
  };
  T.quote2 = (ch, n, nick, text) => {
    const len = text.length, sz = len > 140 ? 's' : len > 80 ? 'm' : 'l';
    return card(ch, 'pp-quote2', `${ticker(ch)}<i class="pp-q2-bg" style="${bgStyle(text, teamOfNick(nick), ch)}"></i>${img(full(nick), 'pp-q2-ph')}<i class="pp-q2-fade"></i><span class="pp-f-brand">${brand(ch)}</span><i class="pp-hot">🔥</i><b class="pp-q2-m">“”</b><p class="pp-q2-t ${sz}">${U(text)}</p><span class="pp-q2-n">${U(nick)}</span>${cs3foot(ch, 'ЦИТАТА')}`, false);
  };

  /* ------------------------------------------------------------ v129.1: шаблоны по образцам пабликов */
  const SC = ['arena-orange', 'crowd', 'arena-crimson', 'studio', 'arena-blue', 'press'];
  const verified = ch => CH[ch].verified ? '<i class="pp-ver" title="Подтверждённый канал">✓</i>' : '';
  const sizeOf = (t, a, b) => t.length > a ? 's' : t.length > b ? 'm' : 'l';
  // новость: фото сверху, плашка рубрики на стыке, крупный заголовок на светлой ленте
  T.news3 = (ch, title, label, nick, team) => {
    const t = String(title || ''), ros = team && !nick ? rosterOf(team).slice(0, 3) : [];
    const vis = nick ? img(full(nick), 'pp-n3-ph') : ros.length >= 3 ? ros.map((n, i) => img(full(n), `pp-n3-tri p${i}`)).join('') : team ? `<span class="pp-f-logo">${tlogo(team)}</span>` : `<i class="pp-n3-wm">${U(label)}</i>${ch === 'hltv' ? '<i class="pp-n3-big">HLTV</i>' : ''}`;
    return card(ch, 'pp-news3', `${ticker(ch)}<div class="pp-n3-top"><i class="pp-f-bg" style="${bgStyle(t, team || teamOfNick(nick), ch)}"></i>${vis}<i class="pp-n3-fade"></i><span class="pp-n3-brand">${brand(ch)}${verified(ch)}</span></div>` +
      `<div class="pp-n3-band"><span class="pp-n3-lab">${U(label)}</span><h3 class="${sizeOf(t, 50, 32)}">${U(t)}</h3></div>${cs3foot(ch, label)}`, false);
  };
  // факт: заголовок сверху на тёмном, плашка «ФАКТ», снизу — состав команды на сцене
  T.factTop = (ch, text, team, nicks) => {
    const t = String(text || ''), ros = (nicks && nicks.length ? nicks : rosterOf(team)).slice(0, 3);
    return card(ch, 'pp-facttop', `${ticker(ch)}<div class="pp-ft-h"><span class="pp-ft-src">${esc(CH[ch].handle)}</span><h3 class="${sizeOf(t, 110, 70)}">${U(t)}</h3></div><span class="pp-ft-lab">ФАКТ</span>` +
      `<div class="pp-ft-ph"><i class="pp-f-bg" style="${bgStyle(t + 'f', team, ch)}"></i>${[1, 0, 2].map(i => ros[i] ? img(full(ros[i]), `pp-ft-p p${i}`) : '').join('')}<i class="pp-ft-fade"></i><span class="pp-ft-b l">${brand(ch)}</span><span class="pp-ft-b r">${tlogo(team)}</span></div>`, false);
  };
  // статистика за карту: фото, голубая плашка с подзаголовком, три плитки
  T.stat3 = (ch, nick, sub, vals) => card(ch, 'pp-stat3', `${ticker(ch)}<div class="pp-s3-top"><i class="pp-f-bg" style="${bgStyle(nick + sub, teamOfNick(nick), ch)}"></i>${img(full(nick), 'pp-s3-ph')}<i class="pp-n3-fade"></i><span class="pp-n3-brand">${brand(ch)}${verified(ch)}</span><i class="pp-hot pp-ico-st">📊</i></div>` +
    `<div class="pp-s3-band"><b>СТАТИСТИКА</b><span>${U(sub)}</span></div><div class="pp-s3-g">${vals.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>${cs3foot(ch, 'СТАТИСТИКА')}`, false);
  // убийства / смерти: портрет в центре, два больших бокса, счёт карты с логотипами
  T.kd = (ch, nick, team, opp, k, d, sub, sa, sb) => card(ch, 'pp-kd', `${ticker(ch)}<i class="pp-kd-cross l"></i><i class="pp-kd-cross r"></i>${img(full(nick), 'pp-kd-ph')}<i class="pp-kd-fade"></i>` +
    `<div class="pp-kd-box l"><b>${k}</b><span>УБИЙСТВА</span></div><div class="pp-kd-box r"><b>${d}</b><span>СМЕРТИ</span></div><span class="pp-kd-logo">${tlogo(team)}<i class="h tl"></i><i class="h tr"></i><i class="h bl"></i><i class="h br"></i></span>` +
    `<div class="pp-kd-n"><b>${U(nick)}</b><small>${U(sub)}</small></div><div class="pp-kd-sc">${tlogo(team)}<b>${sa}-${sb}</b>${tlogo(opp)}</div>${cs3foot(ch, 'СТАТИСТИКА')}`, false);
  // цитата с именем: фото, полоски и имя на плашке, заголовок на голубой ленте
  T.quoteName = (ch, text, name, nick, team) => {
    const t = String(text || '');
    const vis = nick ? img(full(nick), 'pp-qn-ph') : team ? `<span class="pp-f-logo">${tlogo(team)}</span>` : SPY;
    return card(ch, 'pp-qname', `${ticker(ch)}<i class="pp-f-bg pp-qn-bg" style="${bgStyle(t + 'q', team || teamOfNick(nick), ch)}"></i>${vis}<i class="pp-qn-fade"></i><span class="pp-n3-brand l">${brand(ch)}${verified(ch)}</span><i class="pp-hot">🔥</i>` +
      `<div class="pp-qn-nm"><i class="pp-qn-bars"><u></u><u></u><u></u><u></u></i><b>${U(name)}</b><i class="pp-qn-sl"></i><i class="pp-qn-sl"></i></div><div class="pp-qn-band"><h3 class="${sizeOf(t, 90, 56)}">${U(t)}</h3></div>${cs3foot(ch, 'ЦИТАТА')}`, false);
  };
  const SPY = `<svg class="pp-spy" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="ppspy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f38"/><stop offset="1" stop-color="#0c0d10"/></linearGradient></defs><path d="M50 18c-11 0-19 8-19 19 0 7 3 12 7 16-12 4-22 13-24 30h72c-2-17-12-26-24-30 4-4 7-9 7-16 0-11-8-19-19-19z" fill="url(#ppspy)" stroke="rgba(255,255,255,.18)" stroke-width=".6"/><path d="M28 30q22-16 44 0l-3 4H31z" fill="#0b0c0f"/><path d="M33 31q17-6 34 0" stroke="rgba(255,61,90,.7)" stroke-width="1"/><text x="50" y="49" text-anchor="middle" font-family="Golos Text,Arial" font-weight="900" font-size="15" fill="#ff3d5a">?</text></svg>`;
  // дайджест дня (CS2 NEWS): жёлтая дата, панель с логотипами/портретом и репликой, «ДАЙДЖЕСТ НОВОСТЕЙ»
  const ddmm = ts => { const d = new Date(ts); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; };
  T.digest2 = (ch, ts, vis, bubble) => card(ch, 'pp-dg2', `<i class="pp-dg2-tex"></i>${corners}<div class="pp-dg2-date">${ddmm(ts)}</div><div class="pp-dg2-mid">${vis}${bubble ? `<span class="pp-bub">${U(bubble)}</span>` : ''}</div><h3 class="pp-dg2-t">ДАЙДЖЕСТ НОВОСТЕЙ</h3><span class="pp-dg2-brand">${brand(ch)}</span><i class="pp-dg2-bar"></i>`, false);
  const dgVisTeams = (a, b) => `<span class="pp-dg2-tl">${tlogo(a)}</span><span class="pp-dg2-tl r">${tlogo(b)}</span>`;
  const dgVisNick = nick => img(full(nick), 'pp-dg2-ph');
  // расписание дня: портрет — логотип — время — логотип — портрет
  T.schedule = (ch, ev, stage, date, bo, rows) => card(ch, 'pp-sched n' + rows.length, `${corners}<h3 class="pp-title">${U(ev)}</h3><p class="pp-sc-sub"><b>${U(stage)}</b><i>|</i><b>${esc(date)}</b><i>|</i><b>BO${bo}</b></p>` +
    `<div class="pp-sc-rows">${rows.map(r => `<div class="pp-sc-r">${img(full(r.pa), 'pp-sc-pa')}<span class="pp-sc-t">${tlogo(r.a)}<small>${U(short(r.a))}</small></span><span class="pp-sc-time"><b>${esc(r.time)}</b><small>МСК</small></span><span class="pp-sc-t">${tlogo(r.b)}<small>${U(short(r.b))}</small></span>${img(full(r.pb), 'pp-sc-pb')}</div>`).join('')}</div>`, ev);
  // топ-7 строками: большой заголовок, портрет лидера, строки с аватаром, логотипом, ником, пометкой и числом
  T.top7 = (ch, sub, rows, foot) => card(ch, 'pp-top7', `${corners}<div class="pp-t7-h"><b>ТОП-${rows.length}</b><span>${U(sub)}</span></div>${img(full(rows[0].nick), 'pp-t7-ph')}<div class="pp-t7-rows">${rows.map((r, i) =>
    `<div class="pp-t7-r${i ? '' : ' first'}">${img(media('player', r.nick) || full(r.nick), 'pp-t7-av')}${tlogo(r.team, 'pp-tl pp-t7-l')}<span class="pp-t7-n"><b>${esc(r.nick)}</b><small>${esc(r.note || '')}</small></span><strong>${esc(r.v)}</strong></div>`).join('')}</div>`, foot || '');
  // факт CS2 NEWS: портрет, жёлтая плашка, узкий крупный текст
  T.fact2 = (ch, text, nick, team) => { const t = String(text || '');
    return card(ch, 'pp-fact2', `<i class="pp-side-tx l">T.ME // ${esc(CH[ch].handle)}</i><i class="pp-side-tx r">T.ME // ${esc(CH[ch].handle)}</i><div class="pp-f2-ph"${team ? ` style="--c:${rgb(team)}"` : ''}>${nick ? img(full(nick), 'pp-f2-img') : team ? `<span class="pp-f-logo">${tlogo(team)}</span>` : ''}<span class="pp-f2-brand">${brand(ch)}</span><i class="pp-f2-cross"></i></div><span class="pp-f2-lab">ФАКТ</span><h3 class="pp-f2-t ${sizeOf(t, 150, 95)}">${U(t)}</h3>`, false); };

  // сводная статистика игроков по картам последних матчей (из mapLines — есть и для идущих турниров)
  function aggLines(BM) {
    const A = {};
    BM.slice(0, 36).forEach(m => (m.mp || []).forEach((x, i) => { let r = null; try { r = H.mapLines(m.id, i, x[0], x[1], x[2], m.a, m.b, H.rosterOf(m, m.a), H.rosterOf(m, m.b)); } catch (e) {} if (!r) return;
      (r.A || []).concat(r.B || []).forEach(z => { if (!z || !z.nick) return; const o = A[z.nick] || (A[z.nick] = { nick: z.nick, team: z.team, maps: 0, R: 0, k: 0, d: 0, dmg: 0, rt: 0, best: 0, clW: 0 });
        o.maps++; o.R += z.R; o.k += z.k; o.d += z.d; o.dmg += z.adr * z.R; o.rt += z.rating * z.R; o.clW += z.clW || 0; if (z.adr > o.best) { o.best = z.adr; o.bestMap = x[0]; } }); }));
    return Object.values(A).filter(o => o.maps >= 3).map(o => Object.assign(o, { adr: o.dmg / o.R, rating: o.rt / o.R, kd: o.k / Math.max(1, o.d) }));
  }
  function mapBest(m, i) { // лучший игрок карты (для идущих матчей статистика тоже есть)
    try { const x = m.mp[i]; if (!x || !H.mapLines) return null; const r = H.mapLines(m.id, i, x[0], x[1], x[2], m.a, m.b, H.rosterOf(m, m.a), H.rosterOf(m, m.b));
      return (r.A || []).concat(r.B || []).filter(z => z && z.nick).sort((a, b) => b.rating - a.rating)[0] || null; } catch (e) { return null; }
  }
  const ORD = ['ПЕРВОЙ', 'ВТОРОЙ', 'ТРЕТЬЕЙ', 'ЧЕТВЁРТОЙ', 'ПЯТОЙ'];
  function morePosts(BM, ALL, T0) {
    const out = [], recent = BM.slice(0, 14);
    recent.forEach((m, i) => {
      const n = (m.mp || []).length; if (!n) return;
      // К/Д лучшего на первой карте — ответом на пост с результатом
      const b0 = i < 8 ? mapBest(m, 0) : null;
      if (b0 && b0.rating >= 1.2) { const opp = b0.team === m.a ? m.b : m.a, x = m.mp[0], own = b0.team === m.a ? x[1] : x[2], th = b0.team === m.a ? x[2] : x[1], K = Math.round(b0.k), D = Math.round(b0.d);
        out.push({ id: 'kd-' + m.id, ch: 'cs3news', ts: m.ts + 9e5, imp: 5, tone: K > D * 2 ? 1 : 0, reply: 'r-' + m.id, html: T.kd('cs3news', b0.nick, b0.team, opp, K, D, `VS. ${short(opp)} на ${x[0]}`, own, th),
          cap: para(`${K - D >= 10 ? '🥶' : '🔥'} <b>${esc(b0.nick)} — ${K}/${D} на ${esc(x[0])} против ${esc(short(opp))}</b>`) + para(`Рейтинг ${b0.rating.toFixed(2)}, ${b0.adr.toFixed(1)} ADR. ${K - D >= 10 ? 'Это был не матч, а тренировка на ботах.' : 'Тащил как мог.'}`) }); }
      // статистика за вторую (или решающую) карту — у HLTV и CS3NEWS по очереди
      const mi = n >= 2 ? (n === 3 ? 2 : 1) : -1, b1 = mi >= 0 && i < 10 ? mapBest(m, mi) : null;
      if (b1 && b1.rating >= 1.25) { const opp = b1.team === m.a ? m.b : m.a, ch = i % 2 ? 'hltv' : 'cs3news', K = Math.round(b1.k), D = Math.round(b1.d);
        out.push({ id: 's3-' + m.id, ch, ts: m.ts + 14e5, imp: 5, tone: 1, reply: ch === 'cs3news' ? 'r-' + m.id : null, html: T.stat3(ch, b1.nick, `${b1.nick} на ${ORD[mi].toLowerCase()} карте vs. ${short(opp)}`, [[b1.rating.toFixed(2), 'RATING'], [b1.adr.toFixed(1), 'ADR'], [`${K}-${D}`, 'K/D']]),
          cap: para(`📊 <b>${esc(b1.nick)} на ${esc(m.mp[mi][0])}</b>`) + para(`${b1.rating.toFixed(2)} рейтинга, ${b1.adr.toFixed(1)} ADR и ${K}-${D} по убийствам — ${ch === 'hltv' ? 'лучший игрок карты' : 'красавчик, что сказать'}.`) }); }
    });
    // серии побед → «Факт» с заголовком сверху
    const teams = [...new Set(recent.flatMap(m => [m.a, m.b]))], seenT = new Set();
    teams.forEach(t => { if (seenT.size >= 2) return; const ms = ALL.filter(m => m.a === t || m.b === t).sort((a, b) => b.ts - a.ts); let k = 0; while (k < ms.length && ms[k].w === t) k++;
      if (k >= 4 && rosterOf(t).length >= 3) { seenT.add(t); const last = ms[0], opp = last.a === t ? last.b : last.a;
        out.push({ id: 'st-' + t + k, ch: 'cs3news', ts: last.ts + 2e5, imp: 6, tone: 1, html: T.factTop('cs3news', `${short(t)} выиграли ${k} ${plural(k, 'матч', 'матча', 'матчей')} подряд — последним пал ${short(opp)} (${Math.max(...last.s)}:${Math.min(...last.s)})`, t),
          cap: para(`📈 <b>${esc(short(t))}: ${k} ${plural(k, 'победа', 'победы', 'побед')} подряд</b>`) + para('Кто их остановит? Пишите в комментариях 👇') }); } });
    // опрос про-игроков о фаворите турнира
    try { const ev = recent[0] && recent[0].ev, cand = [...new Set(BM.filter(m => m.ev === ev).flatMap(m => [m.a, m.b]))].slice(0, 6);
      if (ev && cand.length >= 3) { const voters = []; cand.forEach(t => rosterOf(t).slice(0, 2).forEach(n => voters.push([n, t]))); const lines = voters.slice(0, 7).map(([n, t], i) => { const pick = cand[(h32(n + ev) % cand.length)], self = pick === t; return `▸ <b>${esc(n)}</b>: ${self ? 'ну, конечно, мы 😎' : esc(short(pick))}`; });
        const fav = cand[h32(ev) % cand.length];
        out.push({ id: 'pl-' + ev, ch: 'cs3news', ts: (recent[recent.length - 1] || recent[0]).ts - 3e5, imp: 5, tone: 0, html: T.news3('cs3news', `Кто выиграет ${ev}? — отвечают про-игроки`, 'Опрос', rosterOf(fav)[0], fav),
          cap: para(`🗳 <b>Спросили у игроков, кто заберёт ${esc(ev)}</b>`) + `<blockquote class="pp-bq">${lines.join('<br>')}</blockquote>` + para('А вы за кого?') }); } } catch (e) {}
    // топ-7 по урону за раунд и по рейтингу (CS2 NEWS)
    try { const ag = aggLines(BM), ev = recent[0] && recent[0].ev;
      [['adr', 'по среднему урону за раунд', o => o.adr.toFixed(1), o => `Лучшая карта: ${o.bestMap} · ${Math.round(o.best)}`, '📈'], ['rating', 'по рейтингу 3.0 за последние матчи', o => o.rating.toFixed(2), o => `${o.maps} ${plural(o.maps, 'карта', 'карты', 'карт')} · K/D ${o.kd.toFixed(2)}`, '👑']].forEach(([k, sub, val, note, em], j) => {
        const rows = ag.slice().sort((a, b) => b[k] - a[k]).slice(0, 7); if (rows.length < 7) return;
        out.push({ id: 't7-' + k + '-' + rows.map(r => r.nick).join('.').slice(0, 60), ch: 'cs2news', ts: (recent[0] ? recent[0].ts : T0) - (j + 1) * 54e5, imp: 5, tone: 1,
          html: T.top7('cs2news', sub, rows.map(r => ({ nick: r.nick, team: r.team, v: val(r), note: note(r) })), ev ? ev.toUpperCase() : ''),
          cap: para(`${em} <b>${esc(rows[0].nick)} — ${k === 'adr' ? 'больше всех урона за раунд' : 'самый высокий рейтинг'} в последних матчах</b>`) + `<blockquote class="pp-bq">${rows.map((r, i) => `${i + 1}. <b>${esc(r.nick)}</b> (${esc(short(r.team))}) — ${val(r)}`).join('<br>')}</blockquote>` }); }); } catch (e) {}
    // расписание ближайших матчей (CS2 NEWS)
    try { const L = (H.liveMatches ? H.liveMatches() : []).filter(x => x && x.m && !x.live).map(x => { let at = null; try { const r = H.plannedAt ? H.plannedAt(x.m) : null; at = r && (r.ms || r.at || (typeof r === 'number' ? r : null)); } catch (e) {} return { m: x.m, ev: (x.snap && x.snap.name) || '', at }; })
        .filter(x => x.at && x.at > T0).sort((a, b) => a.at - b.at);
      if (L.length) { const ev = L[0].ev, day = new Date(L[0].at).toDateString(), rows = L.filter(x => x.ev === ev && new Date(x.at).toDateString() === day).slice(0, 3);
        const stage = String(rows[0].m.stage || rows[0].m.rt || rows[0].m.round || 'Матчи дня').split(' · ').pop();
        const R = rows.map(x => ({ a: x.m.a, b: x.m.b, pa: rosterOf(x.m.a)[0], pb: rosterOf(x.m.b)[0], time: hhmm(x.at) }));
        out.push({ id: 'sc-' + ev + day, ch: 'cs2news', ts: T0 - 2 * 36e5, imp: 6, tone: 0, html: T.schedule('cs2news', ev, stage, dlong(rows[0].at).toUpperCase(), rows[0].m.bo || 3, R),
          cap: para(`🗓 <b>Матчи дня — ${esc(ev)}</b>`) + para(R.map(r => `${r.time} — ${esc(short(r.a))} vs ${esc(short(r.b))}`).join('<br>')) + para('Ставьте прогнозы в Pick\'Em 👀') }); } } catch (e) {}
    return out;
  }
  // дайджест дня: пять главных новостей одного игрового дня
  const DG_PHR = ['Мы — один человек?', '10 лямов? Мало.', 'Это вообще законно?', 'Кто следующий?', 'Ну и денёк…', 'Мы ещё вернёмся', 'Что происходит?', 'Без комментариев'];
  const DG_EM = { transfer: '🔄', rumor: '👀', tournament: '🏆', major: '⭐', ranking: '📈', stats: '📊', interview: '🎙', player: '👤', season: '📜', tier2: '🌱', preview: '🗓' };
  function digestPosts(feed) {
    const out = [], byDay = {};
    feed.filter(n => n && n.ts && !n.pp && !n.digestOf).slice(0, 160).forEach(n => { const d = new Date(n.ts).toDateString(); (byDay[d] = byDay[d] || []).push(n); });
    Object.entries(byDay).slice(0, 4).forEach(([d, L]) => {
      if (L.length < 4) return; const top = L.slice().sort((a, b) => (b.imp || 0) - (a.imp || 0)).slice(0, 5), lead = top[0], tags = lead.tags || [];
      const tms = tags.filter(t => t.t === 'team').map(t => t.v), nick = (tags.find(t => t.t === 'player') || {}).v;
      const vis = tms.length >= 2 ? dgVisTeams(tms[0], tms[1]) : nick ? dgVisNick(nick) : tms[0] ? dgVisTeams(tms[0], tms[0]) : '';
      const ts = Math.max(...L.map(n => n.ts)) + 6e4;
      out.push({ id: 'dg2-' + d, ch: 'cs2news', ts, imp: 6, tone: 0, html: T.digest2('cs2news', ts, vis, DG_PHR[h32(d) % DG_PHR.length]),
        cap: para(`🗞 <b>${['Дайджест дня', 'Коротко о главном', 'Что вы пропустили', 'Дайджестенко Дайджест Дайджестович'][h32(d + 'c') % 4]}:</b>`) +
          `<blockquote class="pp-bq dg">${top.map(n => `<span class="pp-dash"></span> ${DG_EM[n.cat] || '⚡'} <a data-art-open="${esc(n.id)}">${esc(n.title)}</a>`).join('<br><br>')}</blockquote>` + para('<span class="pp-tag">#дайджест</span>') });
    });
    return out;
  }

  /* ------------------------------------------------------------ подписи, реакции, просмотры */
  const RE = { pos: ['❤️', '🔥', '👍', '🏆', '😍', '🎉'], neg: ['🤡', '🤣', '💔', '🗿', '😢', '🙈'], mix: ['❤️', '🤣', '🔥', '🤡', '👍', '🗿', '🍓'] };
  function reactions(id, tone, views) {
    const h = h32('re|' + id), set = RE[tone > 0 ? 'pos' : tone < 0 ? 'neg' : 'mix'], n = 3 + h % 5;
    const total = Math.round(views * (.006 + (h % 13) / 1000)); let left = total; const out = [];
    for (let i = 0; i < Math.min(n, set.length); i++) { const share = i === n - 1 ? left : Math.round(left * (.42 + ((h >>> (i * 3)) % 20) / 100)); left = Math.max(0, left - share); out.push([set[(i + (h >>> 8)) % set.length], Math.max(1, share)]); }
    const seen = new Set(); return out.filter(r => !seen.has(r[0]) && seen.add(r[0])).sort((a, b) => b[1] - a[1]);
  }
  const MY_KEY = 'cs2_pp_react_v1';
  const myReacts = () => { try { return JSON.parse(localStorage.getItem(MY_KEY) || '{}'); } catch (e) { return {}; } };
  function viewsOf(p) { const ch = CH[p.ch], age = Math.max(0, now() - p.ts), grow = Math.min(1, .35 + age / (2 * DAY)), h = h32('v|' + p.id);
    return Math.round(ch.subs * (.16 + (h % 30) / 100) * grow * (1 + (p.imp || 4) / 20)); }
  const para = s => `<p>${s}</p>`;

  /* ------------------------------------------------------------ сборка постов */
  function newsPosts() {
    const out = []; let feed = []; try { feed = H.feed() || []; } catch (e) {}
    feed.slice(0, 260).forEach(n => {
      if (n.pp) return;   // наш же опубликованный пост
      let s = null; try { s = W.V111News ? W.V111News.srcOf(n) : null; } catch (e) {}
      const ch = CH[n.src] ? n.src : s && CH[s.id] ? s.id : 'hltv';
      const tags = n.tags || [], nick = (tags.find(t => t.t === 'player') || {}).v || '', team = (tags.find(t => t.t === 'team') || {}).v || '';
      let q = /«([^»]{24,220})»/.exec(String(n.title) + ' ' + String(n.lead || '')), tone = toneOf(n);
      if (q && q[1].trim().split(/\s+/).length < 5) q = null;   // «выигранных клатчей» — не цитата
      let html; const r = h32('tpl|' + n.id) % 100, label = LABEL[n.cat] || (n.rumor ? 'Слухи' : 'Новости');
      if (ch === 'eco') html = nick || team ? T.fact2('cs2news', n.title, nick, team) : T.news3('cs3news', n.title, 'Мемы', '', '');
      else if (ch === 'frag') html = nick ? T.stat3ish ? T.stat3ish(ch, n) : T.news3(ch, n.title, label, nick, team) : T.news3(ch, n.title, label, nick, team);
      else if (ch === 'chron') html = T.news3(ch, n.title, label, nick, team);
      else if (ch === 'cs2news') html = q && nick ? T.quote(ch, n, nick, q[1], String(n.title).replace(/«[^»]*»/, '').replace(/[:—–-]\s*$/, '').trim() || n.lead || '') : (nick || team) && r % 2 ? T.fact2(ch, n.lead && n.lead.length < 170 && n.lead.length > n.title.length ? n.lead : n.title, nick, team) : T.headline(ch, n, nick, team);
      else if (q && (nick || team)) html = r % 2 || !nick ? T.quoteName(ch, n.title.replace(/«[^»]*»/, '').replace(/[:—–-]\s*$/, '').trim() || q[1], nick || short(team), nick, team) : T.quote2(ch, n, nick, q[1]);
      else if (ch === 'insider') html = T.quoteName(ch, n.title, n.confirmed ? 'Подтвердилось' : n.denied ? 'Опровергнуто' : 'Источник', nick, team);
      else if (ch === 'cs3news' && team && !nick && r < 30) html = T.factTop(ch, n.title, team);
      else if (ch === 'cs3news' && r >= 80) html = T.fact(ch, n.title, nick, team);
      else html = T.news3(ch, n.title, label, nick, team);
      const em = n.cat === 'transfer' ? '🔄' : n.cat === 'rumor' || n.rumor ? '👀' : n.cat === 'interview' || q ? '🎙' : tone < 0 ? '😬' : tone > 0 ? '🔥' : '⚡️';
      const cap = voiceCap(ch, n, nick, team);
      out.push({ id: 'n-' + n.id, ch, ts: n.ts, imp: n.imp, tone, html, cap: n.rumor && (n.confirmed || n.denied) ? cap + para(n.confirmed ? '✅ Информация подтвердилась.' : '❌ Клуб опроверг.') : cap, art: n.id, edited: r % 7 === 0, nid: n.id });
    });
    return out;
  }
  const LABEL = { transfer: 'Трансфер', rumor: 'Слухи', interview: 'Интервью', player: 'Игроки', ranking: 'Рейтинг', stats: 'Статистика', analytics: 'Аналитика', tournament: 'Турнир', major: 'Мейджор', season: 'Сезон', preview: 'Анонс', event: 'Новости', award: 'Награды', tier2: 'Турнир', academy: 'Академии', 'pickem-pub': "Pick'Em", finance: 'Финансы' };
  const VOICE = {
    hltv: { em: () => '', tail: ['Подробнее — на HLTV.org.', 'Следите за обновлениями на HLTV.org.', ''] },
    chron: { em: () => '📰', pre: ['Официально.', 'Главное к этому часу.', 'Хроника дня.'], tail: ['Читать полностью ›', 'Мы продолжаем следить за ситуацией.', ''] },
    cs2news: { em: n => n.cat === 'transfer' ? '🔄' : n.rumor || n.cat === 'rumor' ? '👀' : '⚡️', tail: ['Ваше мнение? 👇', 'Ну что, верим?', 'Жёстко.', 'Кто бы мог подумать 🤔', ''] },
    cs3news: { em: () => '❗️', tail: ['', 'Подписывайтесь, чтобы не пропустить.', 'Пишите в комментариях 👇'] },
    frag: { em: () => '📊', pre: ['Разбор:', 'В цифрах:', 'Что говорит статистика:'], tail: ['Цифры не врут.', 'Полная статистика — в профиле игрока.', ''] },
    insider: { em: () => '🕵️', pre: ['По нашей информации,', 'Источники сообщают:', 'Инсайд:'], tail: ['Ждём официального подтверждения.', 'Информация может измениться.', 'Следите за каналом.'] },
    eco: { em: () => ['😂', '🤡', '💀', '🗿'][Math.floor(Math.random() * 1e-9)], pre: ['Ну что, народ,', 'Мы просто оставим это здесь:', 'Тем временем:'], tail: ['Это вообще законно?', 'Ставим лайк, если тоже в шоке.', 'Ждём мемы в комментах.', ''] }
  };
  const pickOf = (arr, key) => arr && arr.length ? arr[h32(key) % arr.length] : '';
  const STREAM_PHR = ['скоро всё узнаете 👀', 'без комментариев', 'не я это решаю', 'посмотрим после мейджора', 'я бы не верил всему, что пишут', 'всё будет хорошо, честно', 'пусть менеджер отвечает'];
  function voiceCap(ch, n, nick, team) {
    const V = VOICE[ch] || VOICE.cs2news, k = 'v|' + n.id, pre = pickOf(V.pre, k + 'p'), tail = pickOf(V.tail, k + 't');
    const em = ch === 'eco' ? ['😂', '🤡', '💀', '🗿'][h32(k) % 4] : V.em(n);
    let c = para(`${em ? em + ' ' : ''}<b>${esc(n.title)}</b>`) + (n.lead ? para(`${pre ? esc(pre) + ' ' : ''}${esc(pre ? n.lead.charAt(0).toLowerCase() + n.lead.slice(1) : n.lead)}`) : '');
    if (ch === 'chron' || ch === 'hltv') (n.body || []).slice(0, 1).forEach(b => { c += para(esc(b)); });
    // слух «от игрока»: намёк в стриме
    if ((n.rumor || n.cat === 'rumor') && team && (ch === 'insider' || ch === 'eco' || ch === 'cs3news')) { const pl = rosterOf(team)[h32(k + 's') % 5]; if (pl) c += `<blockquote class="pp-bq">💬 <b>${esc(pl)}</b> на стриме: «${esc(pickOf(STREAM_PHR, k + 'q'))}»</blockquote>`; }
    if (tail) c += para(esc(tail));
    return c + para(`<a data-art-open="${esc(n.id)}">${ch === 'hltv' ? 'Читать на HLTV.org ›' : 'Открыть новость ›'}</a>`);
  }
  const NEG = /проигра|поражен|кризис|провал|вылет|скандал|уход|покида|травм|разочар|худш|катастроф|0-13|0:13/i, POS = /побед|выигр|чемпион|рекорд|лучш|mvp|трофе|камбэк|титул/i;
  const toneOf = n => { const t = n.title + ' ' + (n.lead || ''); return NEG.test(t) ? -1 : POS.test(t) ? 1 : 0; };

  function dataPosts() {
    const out = [], BM = bigMatches(), T0 = now(), EV = evById();
    if (!BM.length) return out;
    const recent = BM.slice(0, 40);
    // 1. результаты и статистика игрока (CS3)
    const SI = statIndex();
    recent.filter(m => (m.mp || []).length >= 1).slice(0, 10).forEach((m, i) => {
      const winS = Math.max(...m.s), loseS = Math.min(...m.s), L2 = m.w === m.a ? m.b : m.a;
      const maps = (m.mp || []).map(x => `▪️ ${esc(x[0])} — ${x[1]}:${x[2]}`).join('<br>');
      out.push({ id: 'r-' + m.id, ch: 'cs3news', ts: m.ts + 6e5, imp: 6, tone: 0, html: T.result('cs3news', m),
        cap: para(`${winS - loseS >= 2 ? '💪' : '😮‍💨'} <b>${esc(short(m.w))} ${loseS ? 'дожимают' : 'уверенно проходят'} ${esc(short(L2))} — ${winS}:${loseS}</b>`) + para(maps) + para(`${esc(m.ev)} · ${esc(String(m.stage || '').split(' · ').pop())}`) });
    });
    const topK = Math.max(0, ...[...SI.ms.values()].map(m => TIERW[m.kind] || 0));
    [...SI.ms.values()].filter(m => (TIERW[m.kind] || 0) >= Math.min(topK, 4)).sort((a, b) => b.ts - a.ts).slice(0, 14).map(m => ({ m: Object.assign({}, BM.find(x => x.id === m.id) || m), b: bestInMatch(m) })).filter(x => x.b && x.b.L.rating >= 1.12).slice(0, 2).forEach(({ m, b }) => {
      if (true) out.push({ id: 'ps-' + m.id, ch: 'cs3news', ts: m.ts + 18e5, imp: 5, tone: 1, html: T.pstat('cs3news', m, b),
        cap: para(`📊 <b>${esc(b.nick)} против ${esc(short(b.team === m.a ? m.b : m.a))}</b>`) + para(`Рейтинг ${b.L.rating.toFixed(2)}, ${b.L.adr.toFixed(1)} ADR, ${Math.round(b.L.kpr * b.L.R)} убийств. ${b.L.rating >= 1.6 ? 'Просто снёс соперника в одиночку.' : 'Лучший на сервере.'}`) });
    });
    // 2. пики карт (CS2)
    const bo3 = recent.filter(m => (m.mp || []).length === 3);
    bo3.slice(0, 4).forEach(m => out.push({ id: 'v-' + m.id, ch: 'cs2news', ts: m.ts - 36e5, imp: 5, tone: 0, html: T.veto('cs2news', m),
      cap: para(`🗺 <b>Пики карт: ${esc(short(m.a))} vs ${esc(short(m.b))}</b>`) + para(m.mp.map((x, i) => `${i + 1}. ${esc(x[0])}${i === 2 ? ' (десайдер)' : ''}`).join('<br>')) + para(`${esc(m.ev)} · ${esc(String(m.stage || '').split(' · ').pop())}`) }));
    // 3. история встреч (CS2)
    const ALL = matches(), pairDone = new Set();
    recent.slice(0, 12).forEach(m => {
      const key = [m.a, m.b].sort().join('|'); if (pairDone.has(key) || pairDone.size >= 3) return;
      const list = ALL.filter(x => (x.a === m.a && x.b === m.b) || (x.a === m.b && x.b === m.a));
      if (list.length < 3) return; pairDone.add(key);
      const A = m.a, B = m.b, wa = list.filter(x => x.w === A).length, many = list.length > 5;
      out.push({ id: 'h-' + key + list.length, ch: 'cs2news', ts: m.ts - 72e5, imp: 5, tone: 0, html: many ? T.h2h('cs2news', A, B, list) : T.series('cs2news', A, B, list.slice().sort((x, y) => y.ts - x.ts)),
        cap: para(`⚔️ <b>${esc(short(A))} vs ${esc(short(B))}: история встреч</b>`) + para(`Личные встречи — ${wa}:${list.length - wa}${wa !== list.length - wa ? ` в пользу ${esc(short(wa > list.length - wa ? A : B))}` : ', паритет'}. Последняя: ${esc(short(list[0].w))} ${Math.max(...list[0].s)}:${Math.min(...list[0].s)}.`) });
    });
    // 4. топ-5 турнира по рейтингу и по клатчам (CS2)
    const evL = [...SI.ev.values()].sort((a, b) => (TIERW[b.kind] || 0) - (TIERW[a.kind] || 0) || b.ts - a.ts)[0], evM = evL ? { evId: evL.id, ev: evL.name, ts: evL.ts || T0 - DAY } : null, lastEv = evM && evM.evId;
    if (lastEv) {
      let top = eventTop(lastEv, 'rating', 5), name = evM.ev, yr = new Date(T0).getFullYear();
      if (top.length < 5) { top = yearTop(yr, 'rating', 5, 8); if (top.length < 5) top = yearTop(yr, 'rating', 5, 3); name = `сезоне ${yr}`; }
      if (top.length === 5) out.push({ id: 't5-' + lastEv + top[0].nick, ch: 'cs2news', ts: evM.ts + 9e5, imp: 6, tone: 1, html: T.top5('cs2news', top, 'Топ-5 лучших игроков', `по рейтингу 3.0 на ${name}`, x => x.L.rating.toFixed(2), () => 'RATING 3.0'),
        cap: para(`👑 <b>Лучшие игроки ${esc(name)} по рейтингу</b>`) + para(top.map((x, i) => `${i + 1}. ${esc(x.nick)} (${esc(short(x.team))}) — ${x.L.rating.toFixed(2)}`).join('<br>')) });
      let cl = eventTop(lastEv, 'clW', 5); if (cl.length < 5) cl = yearTop(yr, 'clW', 5, 3);
      if (cl.length === 5 && cl[0].L.clW >= 3) out.push({ id: 'cl-' + lastEv + cl[0].nick, ch: 'cs2news', ts: evM.ts + 27e5, imp: 4, tone: 1, html: T.top5('cs2news', cl, 'Топ-5 по клатчам', `лучшие клатчеры ${name}`, x => String(x.L.clW), x => plural(x.L.clW, 'клатч', 'клатча', 'клатчей').toUpperCase()),
        cap: para(`🧊 <b>Кто вытаскивал раунды 1vsX на ${esc(name)}</b>`) + para(cl.map((x, i) => `${i + 1}. ${esc(x.nick)} — ${x.L.clW} из ${x.L.clA}`).join('<br>')) });
    }
    // 5. худшие/лучшие турниры звезды (CS2)
    try {
      const P = stats().P || {}, star = top5star(P);
      if (star) { const evs = Object.entries(P[star].byEv || {}).map(([id, e]) => ({ id, e, L: line(e.s), E: EV[id] })).filter(x => x.L && x.L.maps >= 3 && x.L.rating != null);
        if (evs.length >= 4) { const worst = h32(star + evs.length) % 2 === 0;
          const rows = evs.sort((a, b) => worst ? a.L.rating - b.L.rating : b.L.rating - a.L.rating).slice(0, 6).map((x, i) => ({ v: x.L.rating.toFixed(2), ts: (x.E && x.E.endMs) || x.e.ts || T0, ev: x.e.name || (x.E && x.E.name) || x.id, mark: x.id === lastEv }));
          out.push({ id: 'w-' + star + evs.length, ch: 'cs2news', ts: T0 - 5 * 36e5, imp: 5, tone: worst ? -1 : 1, html: T.worst('cs2news', star, rows, !worst),
            cap: para(`${worst ? '📉' : '📈'} <b>${worst ? 'Худшие' : 'Лучшие'} турниры ${esc(star)} в карьере</b>`) + para(rows.map(r => `${r.v} — ${esc(r.ev)}`).join('<br>')) + para(worst ? 'Даже у лучших бывают такие недели.' : 'Вот это стабильность.') }); } }
    } catch (e) {}
    // 6. статистика команды за сезон (CS2)
    try {
      const team = (recent.find(m => (TIERW[m.kind] || 0) >= 4) || recent[0]).w, year = new Date(T0).getFullYear();
      const ms = ALL.filter(m => (m.a === team || m.b === team) && (m.gameYear || m.year) === year);
      let maps = 0, mw = 0; ms.forEach(m => (m.mp || []).forEach(x => { maps++; const mine = m.a === team ? x[1] > x[2] : x[2] > x[1]; if (mine) mw++; }));
      const evs = new Set(ms.map(m => m.evId)), po = new Set(ms.filter(m => /плей-офф|playoff|сетка|финал/i.test(m.stage)).map(m => m.evId)), fin = ms.filter(m => /(^|· )(гранд-)?финал$/i.test(String(m.stage).trim())).length;
      let troph = 0; try { troph = (H.events() || []).filter(e => e.status === 'done' && e.champion === team && new Date(e.endMs).getFullYear() === year).length; } catch (e) {}
      if (maps >= 8 && rosterOf(team).length >= 4) out.push({ id: 'ts-' + team + maps, ch: 'cs2news', ts: T0 - 9 * 36e5, imp: 4, tone: mw / maps >= .55 ? 1 : mw / maps < .45 ? -1 : 0,
        html: T.teamstats('cs2news', team, year, [[maps, 'КАРТ'], [Math.round(mw / maps * 100) + '%', 'ВИНРЕЙТ'], [evs.size, plural(evs.size, 'ТУРНИР', 'ТУРНИРА', 'ТУРНИРОВ')], [po.size, 'ПЛЕЙ-ОФФ'], [fin, plural(fin, 'ФИНАЛ', 'ФИНАЛА', 'ФИНАЛОВ')], [troph, troph === 1 ? 'ТРОФЕЙ' : 'ТРОФЕЕВ']]),
        cap: para(`📋 <b>${esc(short(team))} в ${year}: цифры сезона</b>`) + para(`${maps} карт, ${Math.round(mw / maps * 100)}% побед, ${troph ? `${troph} ${plural(troph, 'трофей', 'трофея', 'трофеев')}` : 'пока без трофеев'}.`) });
    } catch (e) {}
    // 7. «когда участники выигрывали трофей» (CS2)
    try {
      const evName = recent[0].ev, teams = [...new Set(BM.filter(m => m.evId === recent[0].evId).flatMap(m => [m.a, m.b]))];
      const done = (H.events() || []).filter(e => e.status === 'done' && e.champion && e.endMs && (e.tier === '1' || e.kind === 'major' || e.kind === 'elite' || e.kind === 'regular'));
      const endOf = name => { const e = EV[name]; return e && e.status === 'done' && e.endMs ? e.endMs : 0; };
      const list = teams.map(t => { const e = done.filter(x => x.champion === t).sort((a, b) => b.endMs - a.endMs)[0]; let best = e ? { team: t, ts: e.endMs, ev: e.name } : null;
        try { ((H.teamBy(t) || {}).history || []).forEach(h => { if (!h || +h.place !== 1 || !(h.isMajor || h.isElite || h.fieldProfile === 'elite' || h.fieldProfile === 'major')) return; const ts = endOf(h.tournament); if (ts && (!best || ts > best.ts)) best = { team: t, ts, ev: h.tournament }; }); } catch (x) {}
        return best ? { team: t, days: Math.max(0, Math.round((T0 - best.ts) / DAY)), ev: best.ev } : null; }).filter(Boolean).sort((a, b) => a.days - b.days);
      if (list.length >= 3) out.push({ id: 'sn-' + recent[0].evId + list.length, ch: 'cs2news', ts: recent[recent.length > 6 ? 6 : recent.length - 1].ts - 6e5, imp: 4, tone: 0, html: T.since('cs2news', list, evName),
        cap: para(`⏳ <b>Когда участники ${esc(evName)} последний раз брали трофей</b>`) + para(list.slice(0, 6).map(x => `${esc(short(x.team))} — ${x.days} ${plural(x.days, 'день', 'дня', 'дней')} назад (${esc(x.ev)})`).join('<br>')) });
    } catch (e) {}
    // 8. сетка плей-офф (CS3)
    try {
      const evId = (recent.find(m => /плей-офф|play-?off|финал/i.test(m.stage)) || {}).evId;
      if (evId) { const ms = ALL.filter(m => m.evId === evId && /плей-офф|play-?off|финал/i.test(m.stage)).sort((a, b) => a.ts - b.ts), R = [];
        ms.forEach(m => { const t = String(m.stage).split(' · ').pop(); let r = R.find(x => x.title === t); if (!r) R.push(r = { title: t, ms: [] }); r.ms.push(m); });
        const rounds = R.filter(r => r.ms.length <= 4).slice(-3);
        if (rounds.length >= 2) out.push({ id: 'bk-' + evId + ms.length, ch: 'cs3news', ts: ms[ms.length - 1].ts + 12e5, imp: 5, tone: 0, html: T.bracket('cs3news', ms[0].ev, rounds),
          cap: para(`🏆 <b>Сетка плей-офф ${esc(ms[0].ev)}</b>`) + para(rounds.map(r => `${esc(r.title)}: ${r.ms.map(m => `${esc(short(m.a))} ${m.s[0]}:${m.s[1]} ${esc(short(m.b))}`).join(', ')}`).join('<br>')) }); }
    } catch (e) {}
    // 9. факт и дайджест (CS3)
    try {
      const sweep = recent.find(m => (m.mp || []).some(x => Math.min(x[1], x[2]) <= 2 && Math.max(x[1], x[2]) >= 13));
      if (sweep) { const x = sweep.mp.find(y => Math.min(y[1], y[2]) <= 2), win = x[1] > x[2] ? sweep.a : sweep.b, lose = win === sweep.a ? sweep.b : sweep.a, sc = `${Math.max(x[1], x[2])}-${Math.min(x[1], x[2])}`;
        const text = `${short(lose)} проиграли карту ${x[0]} со счётом ${Math.min(x[1], x[2])}-${Math.max(x[1], x[2])} против ${short(win)}`;
        const nick = rosterOf(win)[h32(sweep.id) % 5] || '';
        out.push({ id: 'f-' + sweep.id, ch: 'cs3news', ts: sweep.ts + 3e5, imp: 6, tone: -1, html: T.fact('cs3news', text, nick, win), cap: para(`🤯 <b>${esc(short(win))} разгромили ${esc(short(lose))} на ${esc(x[0])} — ${sc}</b>`) + para(`${esc(sweep.ev)}. Такие карты запоминаются надолго.`) });
        out.push({ id: 'dg-' + sweep.id, ch: 'cs3news', ts: sweep.ts + 20 * 36e5, imp: 5, tone: 0, html: T.digest('cs3news', text, rosterOf(lose)[0] || nick, lose, sweep.ts + 20 * 36e5),
          cap: para(`📰 <b>Дайджест новостей — ${dlong(sweep.ts + 20 * 36e5)}</b>`) + para(`Главное за день: ${esc(text)}. Листайте ленту, чтобы ничего не пропустить.`) }); }
    } catch (e) {}
    return out;
  }
  function top5star(P) { // звезда с наибольшим числом турниров среди топ-игроков
    let best = null, bc = 0; for (const n in P) { const c = Object.keys(P[n].byEv || {}).length, L = line(P[n].all); if (!L || L.rating == null || L.rating < 1.08) continue; const sc = c + L.rating * 2; if (sc > bc) { bc = sc; best = n; } } return best;
  }

  let CACHE = null, CACHE_K = '';
  function posts() {
    let k = ''; try { k = matches().length + '|' + (H.feed() || []).length; } catch (e) {}
    if (CACHE && CACHE_K === k) return CACHE;
    let list = [], T1 = now(); try { const D = dataPosts().sort((x, y) => y.ts - x.ts); let k = 0;
      // у идущих турниров время матча — плановое окончание (в «будущем»): такие посты ставим в прошлое по порядку
      try { D.push(...morePosts(bigMatches(), matches(), T1)); D.sort((x, y) => y.ts - x.ts); } catch (e) { console.warn('[v129 pubs] more', e); }
      D.forEach(p => { if (p.ts > T1 - 3e5) p.ts = T1 - (++k) * 23 * 6e4 - (h32(p.id) % 9) * 6e4; }); list = list.concat(D); } catch (e) { console.warn('[v129 pubs] data', e); }
    try { list = list.concat(newsPosts()); } catch (e) { console.warn('[v129 pubs] news', e); }
    try { list = list.concat(digestPosts(H.feed() || [])); } catch (e) { console.warn('[v129 pubs] digest', e); }
    const T0 = now(); list = list.filter(p => p.ts && p.ts <= T0 + 60e3).sort((a, b) => a.ts - b.ts);
    list.forEach(p => { p.views = viewsOf(p); p.re = reactions(p.id, p.tone, p.views); p.cm = Math.round(p.views * (.002 + (h32('c' + p.id) % 9) / 1000)); p.adm = CH[p.ch].admins[h32('a' + p.id) % CH[p.ch].admins.length]; });
    CACHE = list; CACHE_K = k; return list;
  }

  /* ------------------------------------------------------------ посты пабликов внутри обычных новостей
     • посты из данных (результаты, статистика, дайджесты…) публикуются в ленту новостей как новости своего канала;
     • превью таких новостей и новостей пабликов — карточка поста;
     • в статье — сообщение канала как в Telegram: карточка, подпись, реакции, просмотры, комментарии;
     • на «Новостях» сверху — закреплённые сообщения пабликов. */
  const strip = h => String(h || '').replace(/<br>|<\/p>|<\/blockquote>/g, '\n').replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ').trim();
  const CAT_OF = { r: 'tournament', bk: 'tournament', v: 'preview', sc: 'preview', pl: 'preview', dg2: 'season', dg: 'season', f: 'stats', st: 'stats', kd: 'stats', s3: 'stats', ps: 'stats', t5: 'stats', cl: 'stats', t7: 'stats', w: 'stats', ts: 'stats', sn: 'stats', h: 'stats' };
  let INDEX = null, INDEX_AT = 0;
  const index = () => { if (!INDEX || Date.now() - INDEX_AT > 4000) { INDEX = {}; posts().forEach(p => { INDEX[p.id] = p; }); INDEX_AT = Date.now(); } return INDEX; };
  function postFor(n) { // пост, соответствующий новости
    if (!n) return null; const I = index();
    if (n.pp && I[n.pp]) return I[n.pp];
    if (I['n-' + n.id]) return I['n-' + n.id];
    if (n.pp && n.ppHtml) { const ch = CH[n.ppCh] ? n.ppCh : 'cs2news', p = { id: n.pp, ch, ts: n.ts, imp: n.imp, tone: 0, html: n.ppHtml, cap: n.ppCap || para(`<b>${esc(n.title)}</b>`), art: n.id };
      p.views = viewsOf(p); p.re = reactions(p.id, 0, p.views); p.cm = Math.round(p.views * .004); p.adm = CH[ch].admins[h32('a' + p.id) % CH[ch].admins.length]; return p; }
    if (n.pp) { const ch = CH[n.src] ? n.src : 'cs2news'; const p = { id: n.pp, ch, ts: n.ts, imp: n.imp, tone: 0, html: T.news3(ch === 'cs2news' ? 'cs3news' : ch, n.title, (H.NCATS && H.NCATS()[n.cat] || {}).l || 'Новости', '', ''), cap: para(`<b>${esc(n.title)}</b>`) + (n.lead ? para(esc(n.lead)) : '') };
      p.views = viewsOf(p); p.re = reactions(p.id, 0, p.views); p.cm = Math.round(p.views * .004); p.adm = CH[ch].admins[0]; return p; }
    return null;
  }
  /* ---------- источники: у каждой новости свой портал (по рубрике, детерминированно) */
  const SRC_W = {
    rumor: [['insider', 40], ['cs3news', 15], ['cs2news', 15], ['eco', 15], ['frag', 15]],
    transfer: [['hltv', 28], ['insider', 18], ['cs2news', 20], ['cs3news', 14], ['chron', 20]],
    stats: [['frag', 34], ['hltv', 26], ['cs2news', 20], ['cs3news', 10], ['eco', 10]], analytics: [['frag', 45], ['hltv', 25], ['chron', 15], ['cs2news', 15]], ranking: [['hltv', 40], ['frag', 30], ['chron', 30]],
    tournament: [['hltv', 40], ['chron', 25], ['cs3news', 15], ['cs2news', 12], ['eco', 8]], major: [['hltv', 40], ['chron', 30], ['cs2news', 15], ['cs3news', 15]], season: [['chron', 50], ['hltv', 50]],
    preview: [['hltv', 35], ['chron', 30], ['cs2news', 20], ['cs3news', 15]], tier2: [['chron', 40], ['hltv', 40], ['frag', 20]],
    interview: [['cs2news', 25], ['cs3news', 25], ['hltv', 20], ['eco', 15], ['chron', 15]], player: [['cs2news', 22], ['cs3news', 22], ['frag', 20], ['eco', 16], ['hltv', 20]], team: [['cs2news', 25], ['cs3news', 20], ['eco', 25], ['insider', 15], ['chron', 15]],
    _: [['hltv', 30], ['cs2news', 18], ['cs3news', 16], ['chron', 14], ['frag', 10], ['eco', 12]]
  };
  function regSources() { try { const SRC = W.V111News && W.V111News.SRC; if (SRC) ['frag', 'chron', 'eco', 'insider'].forEach(k => { if (!SRC[k]) SRC[k] = { id: k, name: CH[k].name.replace(/\s*(🕵️|💸)/gu, '').trim(), logo: CH[k].logo }; }); return !!SRC; } catch (e) { return false; } }
  function assignSources() {
    const N = W.V29News; if (!N || !N.all || !regSources()) return;
    N.all().forEach(it => { if (!it || it.ppSrc || it.pp || it.publisher || it.cat === 'pickem-pub') return;
      const L = SRC_W[it.rumor ? 'rumor' : it.cat] || SRC_W._, tot = L.reduce((a, x) => a + x[1], 0); let r = h32('src2|' + it.id) % tot, pick = L[0][0];
      for (const [k, w] of L) { if (r < w) { pick = k; break; } r -= w; }
      it.src = pick; it.ppSrc = 1; });
  }
  /* ---------- чистка ленты: однотипные новости одного дня — разными словами; противоречия одной команды — остаётся свежая */
  const REPH = [
    [/^В (.+) отличная атмосфера$/, ['$1: в раздевалке полная идиллия', 'Игроки $1 — о химии внутри состава', '$1 на волне: «мы как семья»', 'Что происходит в $1? Только хорошее']],
    [/^(.+) возвращается после неудачного периода$/, ['$1 снова в форме', 'Камбэк $1: уверенность вернулась', '$1 нашёл свою игру', 'Возвращение $1 — разбираем, что изменилось']],
    [/^Обновление VRS: (.+)$/, ['VRS: $1', 'Рейтинг VRS обновлён — $1', 'Кто вырос в VRS: $1']],
    [/^Мета месяца: (.+)$/, ['Карта месяца: $1', 'Пул карт в этом месяце: $1', 'Мета-отчёт: $1']],
    [/^(.+) — самый результативный игрок (.+)$/, ['Лучший по цифрам на $2 — $1', '$1 забрал статистику $2', '$2: никто не играл лучше $1']]
  ];
  const POSI = /отличная атмосфер|побед подряд|не могут проиграть|без поражений|на волне|идиллия/i, NEGI = /поражени[йя] подряд|не могут выиграть|кризис|проиграли \d+ (матч|карт)|чёрная полоса|черная полоса/i;
  function curate() {
    const N = W.V29News; if (!N || !N.all) return; const L = N.all(); let changed = false;
    // 1) перефразировать повторяющиеся шаблоны внутри одного дня
    const seen = {};
    L.slice().sort((a, b) => a.ts - b.ts).forEach(it => { if (!it || !it.title || it.ppRe) return;
      for (const [re, vars] of REPH) { if (!re.test(it.title)) continue; const d = new Date(it.ts).toDateString(), key = d + '|' + re.source;
        seen[key] = (seen[key] || 0) + 1;
        if (seen[key] > 1) { it.title = it.title.replace(re, vars[(h32(it.id) + seen[key]) % vars.length]); it.ppRe = 1; changed = true; } break; } });
    // 2) противоречия: про одну команду в пределах 2 дней «на волне» и «в кризисе» — старую убираем
    const teamOf = it => ((it.tags || []).find(t => t.t === 'team') || {}).v || (/^В (.+) отличная/.exec(it.title) || [])[1] || '';
    for (let i = L.length - 1; i >= 0; i--) { const a = L[i]; if (!a || !a.title) continue; const ta = teamOf(a); if (!ta) continue; const pa = POSI.test(a.title + ' ' + (a.lead || '')), na = NEGI.test(a.title + ' ' + (a.lead || '')); if (!pa && !na) continue;
      const newer = L.find(b => b !== a && b.ts > a.ts && b.ts - a.ts < 2 * DAY && teamOf(b) === ta && (pa ? NEGI : POSI).test(b.title + ' ' + (b.lead || '')));
      if (newer) { L.splice(i, 1); changed = true; } }
    if (changed) { CACHE = null; INDEX = null; }
  }

  // публикация постов из данных как новостей
  let PUB_BUSY = false;
  function publish() {
    const N = W.V29News; if (PUB_BUSY || !N || !N.add || !N.get) return; PUB_BUSY = true;
    try {
      const T1 = now(), fresh = posts().filter(p => !p.id.startsWith('n-') && !N.get('pp-' + p.id) && p.ts > T1 - 4 * DAY).sort((a, b) => a.ts - b.ts).slice(-24);
      fresh.forEach(p => {
        const lines = strip(p.cap).split(/\n+/).map(x => x.trim()).filter(Boolean), title = lines[0].replace(/^[^\p{L}\p{N}«"]+/u, '').replace(/:$/, '').trim();
        if (!title) return;
        N.add({ id: 'pp-' + p.id, pp: p.id, src: p.ch === 'insider' ? 'hltv' : p.ch, cat: CAT_OF[p.id.split('-')[0]] || 'stats', title, lead: lines[1] || '', body: lines.slice(2), tags: [], imp: Math.min(5, p.imp || 4), ts: p.ts, icon: '📰', ppHtml: p.html, ppCap: p.cap, ppCh: p.ch });
      });
    } catch (e) { console.warn('[v129 pubs] publish', e); }
    PUB_BUSY = false;
  }
  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  setTimeout(() => { const run = () => { try { assignSources(); curate(); } catch (e) {} publish(); }; run(); every(run, 6000, 'v129-pubs'); }, 9000);
  try { assignSources(); } catch (e) {}

  // сообщение канала (как в Telegram)
  const bubble = (p, opts) => {
    if (!p) return ''; opts = opts || {};
    const mine = myReacts()[p.id], c = CH[p.ch], I = index(), rp = p.reply && I[p.reply];
    const stars = (h32('st' + p.id) % 3 === 0) ? 1 + h32('sn' + p.id) % 9 : 0, re = (stars ? [['⭐', stars]] : []).concat(p.re || []);
    return `<article class="pp-post in${opts.cls ? ' ' + opts.cls : ''}" data-pp="${esc(p.id)}" style="--pc:${c.theme === 'y' ? '255,210,31' : c.theme === 'h' ? '74,153,224' : c.theme === 'i' ? '255,61,90' : '106,179,243'}">` +
      `<header class="pp-ph-h"><img src="${esc(c.logo)}" alt=""><b>${esc(c.name)}</b>${c.verified ? '<i class="pp-ver s">✓</i>' : ''}${opts.pin ? '<span class="pp-pin">📌</span>' : ''}</header>` +
      (rp ? `<div class="pp-reply"${rp.art ? ` data-art-open="${esc(rp.art)}"` : ''}><i></i><span><b>${esc(CH[rp.ch].name)}</b><small>${esc(strip(rp.cap).replace(/\n/g, ' ').slice(0, 70))}</small></span></div>` : '') +
      `<div class="pp-ph"${opts.open ? ` data-art-open="${esc(opts.open)}"` : ''}>${p.html}</div><div class="pp-cap">${p.cap}</div>` +
      `<div class="pp-reacts">${re.map(([e, n]) => `<button type="button" class="pp-re${mine === e ? ' on' : ''}${e === '⭐' ? ' star' : ''}" data-ppre="${esc(p.id)}|${e}">${e}<b>${kfmt(n + (mine === e ? 1 : 0))}</b></button>`).join('')}</div>` +
      `<div class="pp-meta"><span class="pp-views">👁 ${kfmt(p.views || 0)}</span><span>${esc(p.adm || '')}${p.edited ? ', изменено' : ''} ${hhmm(p.ts)}</span></div>` +
      cmPreview(p) +
      `<div class="pp-cm"${opts.open ? ` data-art-open="${esc(opts.open)}"` : ''}><span class="pp-cm-av">${['🙂', '😎', '🤓'].map(x => `<i>${x}</i>`).join('')}</span>${p.cm || 0} ${plural(p.cm || 0, 'комментарий', 'комментария', 'комментариев')}<i>›</i></div></article>`;
  };
  function cmPreview(p) { // два свежих комментария болельщиков (из системы комментариев новостей)
    try { const N = W.V29News, it = N && N.get && N.get(p.nid || p.art || ('pp-' + p.id)); if (!it || !N.comments) return '';
      const C = N.comments(it).slice(0, 2); if (!C.length) return '';
      return `<div class="pp-cmp">${C.map(c => `<div><b>${esc(c.nick || 'аноним')}</b><span>${esc(String(c.text || '').slice(0, 120))}</span>${c.likes ? `<em>♥ ${c.likes}</em>` : ''}</div>`).join('')}</div>`; } catch (e) { return ''; }
  }
  const artIdOf = p => { const N = W.V29News; if (!p) return ''; if (p.art) return p.art; return N && N.get && N.get('pp-' + p.id) ? 'pp-' + p.id : ''; };
  function pinned() { // закреп: последний дайджест + самый свежий важный пост из данных
    const L = posts(), dg = L.filter(p => p.id.startsWith('dg2-')).pop(), hot = L.filter(p => !p.id.startsWith('n-') && !p.id.startsWith('dg2-') && (p.imp || 0) >= 6).pop();
    return [dg, hot].filter(Boolean);
  }
  H.CLICKS.push(['[data-ppre]', el => { const [id, e] = el.dataset.ppre.split('|'), m = myReacts(); if (m[id] === e) delete m[id]; else m[id] = e; try { localStorage.setItem(MY_KEY, JSON.stringify(m)); } catch (x) {}
    // перерисовываем только реакции этого сообщения, без перерисовки страницы
    const art = el.closest('.pp-post'), p = index()[id] || null; if (!art) return;
    art.querySelectorAll('.pp-re').forEach(b => { const [, ee] = b.dataset.ppre.split('|'), num = b.querySelector('b'); const base = +(b.dataset.base || (b.dataset.base = String(parseK(num.textContent) - (b.classList.contains('on') ? 1 : 0))));
      const on = m[id] === ee; b.classList.toggle('on', on); num.textContent = kfmt(base + (on ? 1 : 0)); if (on && ee === e) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } }); }]);
  const parseK = t => { t = String(t || '').trim(); const v = parseFloat(t); return /K$/.test(t) ? Math.round(v * 1e3) : /M$/.test(t) ? Math.round(v * 1e6) : v || 0; };
  H.CLICKS.push(['[data-art-open]', el => { if (W.hltvSiteOpenArticle) W.hltvSiteOpenArticle(el.dataset.artOpen); }]);
  const BOX = '.v37-story-media, .nl-img, .hs-news-img, .hs-top-img, [class*="story-img"]';
  // превью новости = карточка поста. Свой элемент рядом со старым превью (старое прячем): другие модули перерисовывают
  // содержимое своих превью, поэтому внутрь не встраиваемся.
  const pcOf = ch => CH[ch].theme === 'y' ? '255,210,31' : CH[ch].theme === 'h' ? '74,153,224' : CH[ch].theme === 'i' ? '255,61,90' : '106,179,243';
  // компактное превью: фон-узор, портрет строго в рамке, логотип команды, значок канала, рубрика
  const PH_RE = /assets\/media\/players\/[^'")]+/, TL_RE = /assets\/media\/teams\/[^'")]+/;
  function thumbHtml(it, p) {
    const tags = it.tags || [], nick = (tags.find(t => t.t === 'player') || {}).v || '', team = (tags.find(t => t.t === 'team') || {}).v || (nick ? teamOfNick(nick) : '');
    const ph = nick ? full(nick) : ((p.html.match(PH_RE) || [])[0] || ''), tl = team ? media('team', team) : ((p.html.match(TL_RE) || [])[0] || '');
    const tf = tl && String(tl).split('/').pop(), tc = tf && W.CS2_TEAM_TINT && W.CS2_TEAM_TINT[tf] ? W.CS2_TEAM_TINT[tf].join(',') : CH_RGB[CH[p.ch].theme];
    const cat = ((H.NCATS && H.NCATS()[it.cat]) || {}).l || 'Новости';
    const num = (/(\d{1,2}[:\-–]\d{1,2})|(\d\.\d{2})|([+−-]\d{1,3})|(#\d{1,2})/.exec(it.title || '') || [])[0] || '';
    return `<span class="ppt" style="background:${bgCss(it.id, tc)}">` +
      (ph ? `<i class="ppt-ph" style="background-image:url('${esc(ph)}')"></i>` : tl ? `<i class="ppt-big" style="background-image:url('${esc(tl)}')"></i>` : `<b class="ppt-word">${U(cat)}</b>`) +
      (ph && tl ? `<i class="ppt-tl" style="background-image:url('${esc(tl)}')"></i>` : '') + (num && !ph ? `<b class="ppt-num">${esc(num)}</b>` : '') +
      `<img class="ppt-ch" src="${esc(CH[p.ch].logo)}" alt=""><em class="ppt-k">${U(cat)}</em></span>`;
  }
  function decorate(root) {
    const N = W.V29News; if (!N || !N.get) return;
    root.querySelectorAll('[data-art]').forEach(el => {
      if (el.closest('.pp-post, .pp-pins')) return;
      const box = el.querySelector(BOX); if (!box) return;
      const it = N.get(el.dataset.art); if (!it) return;
      const p = postFor(it); if (!p) return;
      let w = el.querySelector('.pp-thw');
      if (!w || w.dataset.pp !== p.id) { if (w) w.remove(); box.insertAdjacentHTML('beforeend', `<span class="pp-thw" data-pp="${esc(p.id)}" style="--pc:${pcOf(p.ch)};display:block!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;z-index:6!important;margin:0!important;padding:0!important;transform:none!important;opacity:1!important">${thumbHtml(it, p)}</span>`); }
      box.classList.add('pp-thbox'); el.classList.add('ppn-row');
    });
  }
  // если основной модуль перерисовал превью и выкинул карточку — вернуть
  if ('MutationObserver' in W) { let pend = false; new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; try { const r = document.getElementById('hs-page'); if (r && r.querySelector('.pp-thbox:not(:has(.pp-thw))')) decorate(r); } catch (e) {} }); }).observe(document.documentElement, { childList: true, subtree: true }); }
  (H.AFTER || []).push((pg, arg, root) => {
    if (!root) return;
    try {
      decorate(root); setTimeout(() => { try { decorate(root); } catch (e) {} }, 250); setTimeout(() => { try { decorate(root); } catch (e) {} }, 900);
      if (pg === 'article') {
        const N = W.V29News, it = (N && N.get && N.get(String(arg || ''))) || (H.findNews ? H.findNews(String(arg || '')) : null), p = postFor(it);
        if (p && !root.querySelector('.pp-art')) { const host = root.querySelector('.hs-art-lead') || root.querySelector('h1');
          if (host) { host.insertAdjacentHTML(host.matches('h1') ? 'afterend' : 'beforebegin', `<div class="pp-art"><div class="pp-art-k">Пост канала <b>${esc(CH[p.ch].name)}</b></div>${bubble(p)}</div>`); root.querySelector('.hs-article')?.classList.add('pp-has-post'); } }
      }
      if (pg === 'home' && !root.querySelector('.pp-pins')) {
        const P = pinned().concat(posts().filter(p => !p.id.startsWith('n-') && !p.id.startsWith('dg2-')).slice(-2).reverse()).filter((p, i, A) => A.findIndex(x => x.id === p.id) === i).slice(0, 2);
        const nb = root.querySelector('.hm-news'); if (P.length && nb) nb.insertAdjacentHTML('beforebegin', `<section class="pp-pins home"><header><span>📌</span><b>Паблики</b><small>закреплённые сообщения</small><button type="button" class="hs-more" data-nav="news">все новости →</button></header><div class="pp-pin-g n${P.length}">${P.map(p => bubble(p, { pin: true, open: artIdOf(p) })).join('')}</div></section>`);
      }
      if (pg === 'news' && !root.querySelector('.pp-pins')) {
        const f = H.S.news || {}; if ((f.page || 1) > 1 || (f.cat && f.cat !== 'all') || f.q) return;
        const P = pinned(); if (!P.length) return;
        const col = root.querySelector('[data-pg-anchor]'); if (!col) return;
        col.insertAdjacentHTML('afterbegin', `<section class="pp-pins"><header><span>📌</span><b>Закреплено в пабликах</b><small>${P.length} ${plural(P.length, 'сообщение', 'сообщения', 'сообщений')}</small></header><div class="pp-pin-g n${P.length}">${P.map(p => bubble(p, { pin: true, open: artIdOf(p) })).join('')}</div></section>`);
      }
    } catch (e) { console.warn('[v129 pubs]', e); }
  });
  every(() => { try { const r = document.getElementById('hs-page'); if (r) decorate(r); } catch (e) {} }, 1600, 'v129-thumbs');

  W.CS2PubPosts = { posts, T, mapArt, CH, _reset: () => { CACHE = null; }, _dbg: { statIndex, eventTop, bestInMatch, dataPosts }, bubble, postFor, publish, pinned };
})();
