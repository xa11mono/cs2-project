/* v126 — обложки новостей: вместо «фон + маленький логотип» — шаблоны под содержание новости.

   Шаблоны (выбираются по рубрике и по тому, что есть в новости; у одной новости — всегда одна и та же обложка):
     pub      — паблик на всю обложку: огромный логотип CS2 NEWS / CS3 NEWS, фирменный цвет, рубрика крупно
     pubwall  — «стена» из логотипов паблика и крупный логотип по центру
     player   — портрет игрока на цвете команды, ник огромными контурными буквами, логотип команды водяным знаком
     team     — логотип команды на весь фон (размытый), чёткий логотип и название
     transfer — откуда → куда: два логотипа в цветах команд, стрелки, портрет; штамп «СЛУХ» / «ОФИЦИАЛЬНО»
     stat     — одна цифра крупно (+108, 14, 72%) на сетке с графиком
     score    — счёт матча между логотипами
     headline — типографика: ключевые слова заголовка крупным шрифтом на фоне рубрики
     calendar — сетка календаря с отмеченными днями и числом турниров
     quote    — интервью: огромные кавычки и короткая цитата, портрет или логотип
     trophy   — награды/Мейджоры/итоги: лучи и кубок турнира (CS2TrophyForge) или лавры
     scene    — фото-сцена (арена, студия…), тонированная в цвет рубрики, со значком рубрики
   Всё — HTML/CSS (css/media/news-covers.css), размеры в единицах контейнера: обложка одинаково читается
   в мини-ленте (≈100 px) и в крупной карточке. */
(function () {
  'use strict';
  const W = window, D = document;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const url = u => `url('${String(u).replace(/'/g, '%27')}')`;
  const abs = p => { try { return new URL(p, D.baseURI).href; } catch (e) { return p; } };

  // цвет рубрики (r,g,b) и подпись
  const CAT = {
    transfer: ['63,169,245', 'Трансфер'], rumor: ['176,94,224', 'Слухи'], roster: ['47,194,138', 'Состав'], academy: ['143,220,90', 'Академия'],
    interview: ['255,179,64', 'Интервью'], player: ['255,179,64', 'Игрок'], ranking: ['25,211,197', 'Рейтинг'], stats: ['25,211,197', 'Статистика'],
    analytics: ['25,211,197', 'Аналитика'], season: ['242,207,134', 'Сезон'], major: ['242,207,134', 'Major'], award: ['242,207,134', 'Награды'],
    legacy: ['242,207,134', 'Наследие'], event: ['255,138,61', 'Анонс'], preview: ['255,138,61', 'Превью'], tournament: ['255,122,26', 'Турнир'],
    match: ['232,69,90', 'Матч'], tier2: ['90,140,255', 'Tier-2'], tier3: ['90,140,255', 'Tier-3'], team: ['255,122,26', 'Клуб'], finance: ['143,220,90', 'Финансы'],
    'pickem-pub': ['255,138,61', "Pick'Em"]
  };
  const catOf = n => CAT[n && n.cat] || ['255,122,26', 'Новости'];
  const SCENES = { transfer: 'office', rumor: 'office', roster: 'bootcamp', academy: 'bootcamp', interview: 'press', player: 'press', award: 'trophy-gold', legacy: 'trophy-gold',
    major: 'trophy-gold', stats: 'stats', analytics: 'stats', ranking: 'stats', season: 'crowd', 'pickem-pub': 'studio', preview: 'studio', event: 'studio' };
  const ARENAS = ['arena-orange', 'arena-blue', 'arena-crimson', 'crowd', 'studio'];
  const sceneUrl = k => abs(`assets/ui/scenes/${k}.webp`);
  const PUB = { cs2news: { c: '255,196,40', ink: '#141006', name: 'CS2 NEWS', logo: 'assets/ui/publishers/cs2news.webp' },
    cs3news: { c: '40,120,255', ink: '#ffffff', name: 'CS3 NEWS', logo: 'assets/ui/publishers/cs3news.webp' } };

  // иконки рубрик (24×24, обводка)
  const ICP = {
    transfer: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>', rumor: '<path d="M4 6h16v10H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
    roster: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14c3 0 6 2 6 5"/>',
    interview: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', ranking: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    stats: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>', down: '<path d="M3 7l6 6 4-4 8 8M15 17h6v-6"/>', flat: '<path d="M3 12h4l3-5 4 10 3-5h4"/>', season: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    award: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM12 14v4M8 21h8M7 6H3c0 3 2 5 4 5M17 6h4c0 3-2 5-4 5"/>', match: '<path d="M4 4l16 16M20 4L4 20"/><circle cx="12" cy="12" r="3"/>',
    event: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3v3H8z"/>', news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>'
  };
  const icOf = cat => ICP[cat] || ICP[{ analytics: 'stats', academy: 'roster', player: 'interview', major: 'award', legacy: 'award', tournament: 'award', preview: 'event', tier2: 'award', tier3: 'award', 'pickem-pub': 'stats' }[cat]] || ICP.news;
  const icon = (cat, tone) => `<svg class="nc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${tone < 0 && /stats|analytics|ranking/.test(cat) ? ICP.down : icOf(cat)}</svg>`;

  // ---------------------------------------------------------------- что есть в новости
  let teamIdx = null, teamAt = 0;
  function teamNames(ctx) {
    if (teamIdx && Date.now() - teamAt < 60000) return teamIdx;
    teamAt = Date.now();
    teamIdx = ((ctx && ctx.teams) || []).map(t => t && t.name).filter(x => x && x.length > 2).sort((a, b) => b.length - a.length);
    return teamIdx;
  }
  // команды по порядку упоминания (теги, затем текст); «меняет FAZE на Falcons» — порядок из текста
  function teamsIn(n, ctx) {
    const txt = String((n.title || '') + ' ¶ ' + (n.lead || '')), found = [];
    const low = txt.toLowerCase();
    teamNames(ctx).forEach(nm => { const i = low.indexOf(nm.toLowerCase()); if (i < 0) return; const pre = low[i - 1], post = low[i + nm.length];
      if (pre && /[a-zа-я0-9]/i.test(pre)) return; if (post && /[a-zа-я0-9]/i.test(post)) return;
      if (found.some(f => f.i <= i && i < f.i + f.n.length)) return; found.push({ n: nm, i }); });
    found.sort((a, b) => a.i - b.i);
    const out = found.map(f => f.n);
    (n.tags || []).forEach(t => { if (t && t.t === 'team' && t.v && !out.includes(t.v)) out.push(t.v); });
    if (n.team && !out.includes(n.team)) out.push(n.team);
    return out.slice(0, 2);
  }
  // тон новости: обложка не должна противоречить тексту (рост на графике у новости о недовольных фанатах)
  const NEG = /недовол|проигра|поражен|кризис|провал|вылет|скандал|конец серии|прерва|прерыва|разочар|уволь|увол[её]н|покида|уход|травм|штраф|дисквал|упал|паден|потерял|потеря|хуже|нельзя|критик|сломал|оборвал|неудач|минус|слаб|отстран|скамей|перестройк|под вопросом|тревог|антирекорд/i;
  const POS = /побед|выигр|титул|чемпион|рекорд|лучш|рост|раст[её]т|взл[её]т|прорыв|звезд|триумф|mvp|трофе|лидир|усилил|вернул|камбэк|первое место|в топ/i;
  function toneOf(n, num) { if (num && num.sign) return num.sign; const t = String(n.title || '') + ' ' + String(n.lead || ''); const neg = NEG.test(t), pos = POS.test(String(n.title || ''));
    return neg && !pos ? -1 : pos && !neg ? 1 : neg ? -1 : 0; }
  const UNIT = /^(дн|ден|турнир|команд|побед|поражен|матч|карт|игрок|очк|мест|раунд|недел|лет|год|сери|титул|момент|трофе|клуб|месяц|январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр|убийств|фраг|мейджор|финал|рекорд|тысяч|млн|сезон|стартов|участник)/i;
  function numberIn(n) {
    const t = String(n.title || '');
    let m = /([+−–-]\s?\d[\d\s]*(?:[.,]\d+)?)(?!\d)/.exec(t.replace(/\b20\d\d\/20\d\d\b/g, ''));
    if (m && /[+−]/.test(m[1])) return { v: m[1].replace(/\s/g, '').replace('-', '−'), sign: m[1][0] === '+' ? 1 : -1, unit: '' };
    if ((m = /(\d+(?:[.,]\d+)?)\s?%/.exec(t))) return { v: m[1] + '%', sign: 0, unit: '' };
    let best = null; const re = /(?:^|[^\d#№])(\d{1,4})(?:\s+([А-Яа-яЁёA-Za-z-]{3,}))?/g;
    // число со словом-единицей по-русски («9 дней», «14 турниров») важнее голого («Season 23»)
    while ((m = re.exec(t))) { const v = +m[1]; if (v >= 1990 && v <= 2099) continue; const w = UNIT.test(m[2] || '') ? m[2] : '', sc = (w ? 1000 : 0) + v; if (!best || sc > best.sc) best = { n: v, w, sc }; }
    if (best && best.n >= 2) return { v: String(best.n), sign: 0, unit: best.w };
    if ((m = /[#№]\s?(\d{1,3})/.exec(t))) return { v: '#' + m[1], sign: 0, unit: '' };
    return null;
  }
  const scoreIn = n => { const m = /(?:^|[\s(])(\d{1,2})(?::|\s?[–-]\s?)(\d{1,2})(?=[\s,.!)]|$)/.exec(String(n.title || '') + ' ¶ ' + String(n.lead || '') + ' '); return m && +m[1] <= 16 && +m[2] <= 16 ? [m[1], m[2]] : null; };
  const STOP = new Set(['и', 'в', 'во', 'на', 'с', 'со', 'к', 'по', 'за', 'из', 'от', 'до', 'для', 'не', 'а', 'но', 'о', 'об', 'у', 'the', 'of', '—', '–', '-']);
  function headWords(n) {
    let t = String(n.title || '').split(/[:!?]/)[0].replace(/[«»"“”]/g, '').replace(/\s+/g, ' ').trim();
    if (t.length < 6) t = String(n.title || '').replace(/[«»"“”:]/g, '').trim();
    const ws = t.split(' ').filter(Boolean);
    let out = [], len = 0;
    for (const w of ws) { if (len + w.length > 34 && out.length >= 2) break; out.push(w); len += w.length + 1; }
    while (out.length > 1 && STOP.has(out[out.length - 1].toLowerCase())) out.pop();
    return out.join(' ');
  }
  function quoteOf(n) {
    const t = String(n.title || ''), i = t.indexOf(':'), qm = /«([^»]{4,})»/.exec(t);
    if (qm) { const ws = qm[1].replace(/[.…]+$/, '').split(/\s+/); return ws.slice(0, 7).join(' ') + (ws.length > 7 ? '…' : ''); }
    let q = i > 0 ? t.slice(i + 1) : String(n.lead || '').split(/[.!?]/)[0];
    q = q.replace(/[«»"“”]/g, '').trim();
    const ws = q.split(/\s+/); return ws.slice(0, 6).join(' ') + (ws.length > 6 ? '…' : '');
  }
  const evName = n => { const m = /((?:IEM|BLAST|PGL|ESL|StarLadder|Perfect World|FISSURE|Thunderpick|BetBoom|CCT|FiRe|DreamHack|EWC)[A-Za-z .'’-]*?(?:Major\s)?20\d\d)/.exec(String(n.title || '') + ' ' + String(n.lead || '')); return m ? m[1].trim() : ''; };

  // ---------------------------------------------------------------- куски разметки
  const bgImg = (u, cls, extra) => `<i class="${cls}" style="background-image:${url(u)}${extra ? ';' + extra : ''}"></i>`;
  const kick = (txt, cls) => `<b class="nc-k${cls ? ' ' + cls : ''}">${esc(txt)}</b>`;
  const pubBadge = p => p ? bgImg(p.logo, 'nc-pubb') : '';
  const stripes = `<i class="nc-stripes"></i>`;
  const tc = (ctx, name) => { try { const c = ctx.tintFor ? ctx.tintFor(name) : null; return c ? c.join(',') : null; } catch (e) { return null; } };
  const logo = (ctx, name) => { try { return name && ctx.logoFor ? ctx.logoFor(name) : null; } catch (e) { return null; } };

  const T = {};
  T.pub = (n, x) => { const p = x.pub, word = x.catName;
    return { a: p.c, html: `<i class="nc-pub-bg"></i>${stripes}${bgImg(p.logo, 'nc-pub-logo')}<span class="nc-pub-tx"><small>${esc(p.name)}</small><b>${esc(word)}</b></span>` +
      (x.photo ? bgImg(x.photo, 'nc-pub-ph') : x.logo1 ? bgImg(x.logo1, 'nc-pub-tl') : '') }; };
  T.pubwall = (n, x) => { const p = x.pub; let wall = ''; for (let i = 0; i < 18; i++) wall += `<i style="background-image:${url(p.logo)}"></i>`;
    return { a: p.c, html: `<i class="nc-pub-bg"></i><span class="nc-wall">${wall}</span>${bgImg(p.logo, 'nc-wall-big')}${kick(x.catName, 'pub')}` }; };
  T.player = (n, x) => {
    const nick = x.nick || '';
    return { a: x.t1c || x.ac, html: `<i class="nc-tbg"></i>${x.logo1 ? bgImg(x.logo1, 'nc-wm') : ''}<span class="nc-nick" data-l="${Math.min(12, nick.length)}">${esc(nick)}</span>` +
      bgImg(x.photo, 'nc-ph') + (x.logo1 ? bgImg(x.logo1, 'nc-ph-l') : '') + `<i class="nc-bar"></i>` };
  };
  T.team = (n, x) => ({ a: x.t1c || x.ac, html: bgImg(x.logo1, 'nc-blur') + `<i class="nc-shine"></i>` + bgImg(x.logo1, 'nc-tlogo') + `<span class="nc-tname">${esc(x.team1)}</span>` });
  T.transfer = (n, x) => {
    const rumor = n.rumor || n.cat === 'rumor', two = x.team2 && x.logo2;
    const L = two ? x.logo1 : null, R = two ? x.logo2 : x.logo1;
    const c1 = two ? (x.t1c || '90,100,120') : '60,66,80', c2 = two ? (x.t2c || '90,100,120') : (x.t1c || '90,100,120');
    return { a: rumor ? '176,94,224' : '63,169,245', html: `<i class="nc-half l" style="--c:${c1}"></i><i class="nc-half r" style="--c:${c2}"></i>` +
      (L ? bgImg(L, 'nc-tr-l') : '') + `<span class="nc-arrows"><i></i><i></i><i></i></span>` + (R ? bgImg(R, 'nc-tr-r') : '') +
      (x.photo ? bgImg(x.photo, two ? 'nc-tr-ph' : 'nc-tr-ph solo') : '') + `<b class="nc-stamp${rumor ? ' rumor' : ''}">${rumor ? 'Слух' : 'Официально'}</b>` };
  };
  T.stat = (n, x) => {
    const v = x.num, up = x.tone > 0, dn = x.tone < 0, h = x.h;
    let pts = [], y = 70; for (let i = 0; i <= 8; i++) { y += ((h >>> (i * 3)) % 21 - 10) * (up || dn ? 1.6 : 1) + (up ? -4.5 : dn ? 4.5 : 0); if (!up && !dn) y = 55 + (y - 55) * .5; y = Math.max(12, Math.min(88, y)); pts.push(`${i * 12.5} ${y.toFixed(1)}`); }
    const col = up ? '61,220,132' : dn ? '255,90,90' : x.ac;
    return { a: col, html: `<i class="nc-grid"></i><svg class="nc-spark" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M${pts.join('L')}" /><path class="ar" d="M${pts.join('L')}L100 100L0 100z"/></svg>` +
      (x.logo1 ? bgImg(x.logo1, 'nc-st-l') : '') + `<span class="nc-num${v.v.length > 4 ? ' long' : ''}">${esc(v.v)}</span>` + (v.unit ? `<span class="nc-unit">${esc(v.unit)}</span>` : kick(x.catName, 'st')) };
  };
  T.score = (n, x) => ({ a: x.ac, html: `<i class="nc-half l" style="--c:${x.t1c || '90,100,120'}"></i><i class="nc-half r" style="--c:${x.t2c || '90,100,120'}"></i>` +
    bgImg(x.logo1, 'nc-sc-l') + bgImg(x.logo2, 'nc-sc-r') + `<span class="nc-score"><b>${esc(x.score[0])}</b><i>:</i><b>${esc(x.score[1])}</b></span>` });
  T.headline = (n, x) => { const w = headWords(n), v = x.h % 3;
    return { a: x.ac, html: `<i class="nc-hl-bg v${v}"></i>${v === 2 ? stripes : '<i class="nc-noise"></i>'}<span class="nc-hl-k">${icon(n.cat, x.tone)}${esc(x.catName)}</span><span class="nc-hl" data-n="${w.length > 22 ? 'l' : 's'}">${esc(w)}</span>` +
      (x.pub ? pubBadge(x.pub) : x.logo1 ? bgImg(x.logo1, 'nc-pubb tl') : '') }; };
  T.calendar = (n, x) => {
    const days = 28, on = new Set(); for (let i = 0; i < 7; i++) on.add((x.h >>> (i * 4)) % days);
    let cells = ''; for (let i = 0; i < days; i++) cells += `<i class="${on.has(i) ? 'on' : ''}"></i>`;
    const v = x.num && !x.num.sign && x.num.unit ? x.num : null, wd = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(d => `<em>${d}</em>`).join('');
    return { a: x.ac, html: `<i class="nc-hl-bg v0"></i><span class="nc-cal"><u></u>${wd}${cells}</span>` + (v ? `<span class="nc-cal-n"><b>${esc(v.v)}</b><small>${esc(v.unit)}</small></span>`
      : `<span class="nc-cal-t"><small>${icon('event')}${esc(x.catName)}</small><b>${esc(headWords(n))}</b></span>`) };
  };
  T.quote = (n, x) => ({ a: x.ac, html: `<i class="nc-hl-bg v1"></i><span class="nc-qm">“</span><span class="nc-q">${esc(quoteOf(n))}</span>` +
    (x.photo ? bgImg(x.photo, 'nc-q-ph') : x.logo1 ? bgImg(x.logo1, 'nc-q-l') : '') + `<i class="nc-bar"></i>` });
  T.trophy = (n, x) => {
    let cup = ''; const ev = evName(n);
    try { if (ev && W.CS2TrophyForge) cup = W.CS2TrophyForge.cup(ev, 1, /major/i.test(ev) ? 'major' : 'regular'); } catch (e) { cup = ''; }
    const side = x.photo ? bgImg(x.photo, 'nc-tp-ph') : x.logo1 ? bgImg(x.logo1, 'nc-tp-l') : '';
    return { a: '242,207,134', html: `<i class="nc-rays"></i>${cup ? `<span class="nc-cup${side ? ' side' : ''}">${cup}</span>` : `<span class="nc-laurel${side ? ' side' : ''}">${LAUREL}</span>`}${side}` };
  };
  T.scene = (n, x) => ({ a: x.ac, html: bgImg(sceneUrl(x.tone < 0 && /stats|analytics|ranking/.test(n.cat) ? ['crowd', 'press'][x.h % 2] : SCENES[n.cat] || ARENAS[x.h % ARENAS.length]), 'nc-scene') + `<i class="nc-grade"></i><span class="nc-tile">${icon(n.cat, x.tone)}</span>` +
    (x.logo1 ? bgImg(x.logo1, 'nc-sc-logo') : '') + (x.pub ? pubBadge(x.pub) : '') });
  const LAUREL = (() => { let s = ''; // венок: две ветви от низа к верху, листья по касательной, звезда в центре
    for (const k of [-1, 1]) for (let i = 0; i < 9; i++) { const th = (252 - i * 17) * Math.PI / 180, x0 = 50 + 32 * Math.cos(th), y = 56 - 32 * Math.sin(th), x = k < 0 ? x0 : 100 - x0;
      const ang = Math.atan2(-Math.cos(th), -Math.sin(th)) * 180 / Math.PI - 90, rot = k < 0 ? ang : -ang, rr = 3.2 - i * .12;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(rr * .55).toFixed(2)}" ry="${(rr * 1.9).toFixed(2)}" transform="rotate(${(rot + k * 28).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)}) translate(${k * 3} 0)"/>`; }
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="currentColor">${s}</g><path d="M40 88Q50 82 60 88" stroke="currentColor" stroke-width="2.4" fill="none"/>` +
      `<path d="M50 34l5 10.6 11.6 1.4-8.6 8 2.3 11.5L50 59.8 39.7 65.5l2.3-11.5-8.6-8L45 44.6z" fill="currentColor"/></svg>`; })();

  // ---------------------------------------------------------------- выбор шаблона
  function cover(n, ctx) {
    if (!n || !n.title) return '';
    ctx = ctx || {};
    const h = h32('cover|' + (n.id || n.title));
    const [ac, catName] = catOf(n);
    let pub = null; try { const s = W.V111News && W.V111News.srcOf(n); if (s && PUB[s.id]) pub = PUB[s.id]; } catch (e) {}
    const ts = teamsIn(n, ctx), pl = ctx.pl;
    // команда игрока — первой (портрет на её цвете)
    if (pl && pl.t && pl.t.name && ts[0] !== pl.t.name && ts.length < 2) ts.unshift(pl.t.name);
    const team1 = ts[0] || ctx.tm || '', team2 = ts[1] || '';
    const x = { h, ac, catName, pub, photo: ctx.photo || null, nick: pl && pl.p ? pl.p.nick : '', team1, team2,
      logo1: logo(ctx, team1), logo2: logo(ctx, team2), t1c: team1 ? tc(ctx, team1) : null, t2c: team2 ? tc(ctx, team2) : null, num: numberIn(n), score: scoreIn(n) };
    x.tone = toneOf(n, x.num);
    const cat = n.cat || '';
    const C = [];   // [шаблон, вес]
    const add = (k, w) => { if (w > 0) C.push([k, w]); };
    if (pub) { add('pub', 5); add('pubwall', 2); }
    if (x.score && x.logo1 && x.logo2) add('score', 14);
    // трансфер — только когда есть «кто/куда»: две команды или игрок + команда, и новость про переход
    const move = cat === 'transfer' || /переход|перейд|покида|подпис|сделк|трансфер|стенд-ин|аренд|присоедин|усилил|в состав|выкуп/i.test(n.title + ' ' + (n.lead || ''));
    if (move && x.logo1 && (x.logo2 || x.photo)) add('transfer', x.logo2 ? 12 : 8);
    if (x.photo) add('player', /interview|player|award|stats|analytics/.test(cat) ? 6 : 4);
    if (/interview|player/.test(cat) && /«[^»]{4,}»/.test(n.title)) add('quote', 7);
    if (x.num && !(x.tone < 0 && x.num.sign > 0) && /ranking|stats|analytics|finance|season|event|tournament|match/.test(cat)) add('stat', x.num.sign ? 16 : /%/.test(x.num.v) ? 12 : 4);
    if (/event|preview|season/.test(cat) && /календар|расписан|сезон|анонс|турнир/i.test(n.title)) add('calendar', 6);
    // кубок — только когда речь о победе/награде (жеребьёвка или старт турнира — не про кубок)
    const won = /чемпион|побед|выигр|титул|зал славы|награ|mvp|итоги|трофе|лучший игрок/i.test(n.title);
    if (x.tone >= 0 && (won || /award|legacy/.test(cat))) add('trophy', evName(n) ? 7 : 3);
    if (x.logo1) add('team', 2);
    add('headline', x.logo1 || x.photo ? 2 : 5);
    add('scene', 2);
    const total = C.reduce((a, c) => a + c[1], 0); let r = h % total, pick = C[C.length - 1][0];
    for (const [k, w] of C) { if (r < w) { pick = k; break; } r -= w; }
    if (ctx.force && T[ctx.force]) pick = ctx.force;   // для галереи/проверки
    let out; try { out = T[pick](n, x); } catch (e) { out = T.headline(n, x); pick = 'headline'; }
    // у паблика на чужих шаблонах — маленький значок в углу
    const badge = pub && !/^pub|headline|scene/.test(pick) ? pubBadge(pub) : '';
    return `<span class="ax-nvis nc nc-${pick}" style="--a:${out.a};--ac:${ac}" data-nc="${pick}">${out.html}${badge}</span>`;
  }

  W.CS2NewsCovers = { cover, templates: Object.keys(T), _test: { toneOf, numberIn, scoreIn, headWords, quoteOf, teamsIn, evName } };
})();
