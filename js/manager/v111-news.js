/* v111 — источники новостей и карточка «HLTV Top 20».

   1. Источники. Часть новостей публикуют паблики — CS2 NEWS и CS3 NEWS (логотипы — assets/ui/publishers).
      Официальное (итоги турниров, сезон, анонсы, рейтинг, награды) — в основном HLTV; трансферы, слухи, интервью,
      матчи и статистика — HLTV ≈45%, CS2 NEWS ≈30%, CS3 NEWS ≈25%. Источник выбирается один раз (по id новости) и
      хранится в новости (it.src). Видно в ленте, на «Главной», в статье и в уведомлении.
   2. Карточка игрока года. Статьи «Топ-20 игроков ГГГГ: №N — ник» и «HLTV Awards ГГГГ: ник — лучший игрок года»
      получают карточку в духе HLTV Top 20: имя, команда, награды MVP и EVP за год, командные места (1/2/3),
      личная статистика полосами относительно среднего по топ-игрокам, заметные показатели с местом среди игроков
      года, портрет на фоне цвета команды и крупное «#N». */
(function () {
  'use strict';
  const W = window, H = W.HS, N = W.V29News;
  if (!H || !N) return;
  const esc = H.esc;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };

  /* ------------------------------------------------------------ 1. источники */
  const SRC = {
    hltv: { id: 'hltv', name: 'HLTV', logo: '' },
    cs2news: { id: 'cs2news', name: 'CS2 NEWS', logo: 'assets/ui/publishers/cs2news.webp' },
    cs3news: { id: 'cs3news', name: 'CS3 NEWS', logo: 'assets/ui/publishers/cs3news.webp' }
  };
  const OFFICIAL = /^(tournament|season|preview|ranking|award|major|tier2|pickem-pub)$/;
  function srcOf(it) {
    if (!it) return SRC.hltv;
    if (it.src && SRC[it.src]) return SRC[it.src];
    if (it.publisher && SRC[it.publisher.id]) { it.src = it.publisher.id; return SRC[it.src]; }
    const r = h32('src|' + (it.id || it.title)) % 100;
    let id = 'hltv';
    if (OFFICIAL.test(String(it.cat || ''))) id = r < 88 ? 'hltv' : r < 95 ? 'cs2news' : 'cs3news';
    else id = r < 45 ? 'hltv' : r < 75 ? 'cs2news' : 'cs3news';
    if (it.rumor && id === 'hltv' && r % 2) id = 'cs3news';   // слухи чаще у пабликов
    it.src = id;
    return SRC[id];
  }
  const chip = (s, noLogo) => `<span class="v111-src v111-src-${s.id}${noLogo ? ' bare' : ''}" title="Источник: ${esc(s.name)}">${noLogo ? '' : s.logo ? `<img src="${esc(s.logo)}" alt="" width="16" height="16" loading="lazy" decoding="async">` : '<i>H</i>'}<b>${esc(s.name)}</b></span>`;
  // v111.1: у новостей пабликов логотип паблика стоит на превью на месте логотипа команды (подпись — без логотипа)
  const BOX = '.v37-story-media, .nl-img, .hs-news-img, .hs-top-img, [class*="story-img"]';
  const pubImg = (s, px, cls) => `<img class="v111-pub${cls ? ' ' + cls : ''}" src="${esc(s.logo)}" alt="${esc(s.name)}" width="${px}" height="${px}" loading="lazy" decoding="async">`;
  function thumbLogo(el, s) {
    const box = el.querySelector(BOX); if (!box || !box.dataset.axs || box.dataset.v111pub) return;   // ждём, пока v100 оформит превью
    box.dataset.v111pub = s.id;
    const vis = box.querySelector('.ax-nvis');
    if (vis && vis.classList.contains('pl')) { const l = vis.querySelector('.ax-nvis-l'); if (l) l.remove(); vis.insertAdjacentHTML('beforeend', pubImg(s, 22, 'ax-nvis-l')); }
    else if (vis) { vis.innerHTML = pubImg(s, 48); vis.classList.add('v111-pubvis'); }
    else { box.classList.add('ax-has-vis'); box.insertAdjacentHTML('beforeend', `<span class="ax-nvis tm v111-pubvis">${pubImg(s, 48)}</span>`); }
  }
  function decorate(root) {
    (root || document).querySelectorAll('[data-art]:not([data-v111src])').forEach(el => {
      el.setAttribute('data-v111src', '1');
      const it = N.get ? N.get(el.dataset.art) : null; if (!it) return;
      const s = srcOf(it); if (s.id === 'hltv') return;   // HLTV — по умолчанию, без значка в ленте
      el.setAttribute('data-v111pub', s.id);
      // v112: подпись — в строку рубрики; <b> внутри логотипа (инициалы .hs-logo) хостом быть не может — иначе значок попадал в логотип и сдвигал его
      const host = el.querySelector('.nl-k, .hs-news-k, .ax-nw-k, .v84-spot-tx small') || [...el.querySelectorAll('h4, b')].find(x => !x.closest('.hs-logo, .v84-spot-logo, .ax-nvis'));
      const thumb = !!el.querySelector(BOX);
      if (host) { if (host.matches('h4, b')) host.insertAdjacentHTML('beforebegin', `<div class="v111-src-row">${chip(s, thumb)}</div>`); else host.insertAdjacentHTML('afterbegin', chip(s, thumb)); }
    });
    (root || document).querySelectorAll('[data-v111pub]').forEach(el => { try { thumbLogo(el, SRC[el.getAttribute('data-v111pub')]); } catch (e) {} });
    // v112: новости «Топ-20 игроков» / «HLTV Awards» выделяются в ленте — золотая рамка и значок места на превью
    (root || document).querySelectorAll('[data-art]:not([data-v112t20])').forEach(el => {
      el.setAttribute('data-v112t20', '1');
      const it = N.get ? N.get(el.dataset.art) : null, d = it && cardData(it); if (!d) return;
      el.classList.add('v112-t20row');
      const box = el.querySelector(BOX);
      let badge = ''; try { badge = W.TW && W.TW.top20Svg ? W.TW.top20Svg(d.r, d.year) : ''; } catch (e) {}
      if (box && badge) { box.classList.add('v112-t20box'); box.insertAdjacentHTML('beforeend', `<span class="v112-t20badge" title="HLTV Top 20 · №${d.r}">${badge}</span>`); }
      const k = el.querySelector('.nl-k, .hs-news-k, .ax-nw-k'); if (k && !k.querySelector('.v112-t20tag')) k.insertAdjacentHTML('afterbegin', `<span class="v112-t20tag">HLTV TOP 20 · №${d.r}</span>`);
    });
  }
  // уведомление о новости подписывает v29-news (V111News.srcOf)

  /* ------------------------------------------------------------ 2. карточка «HLTV Top 20» */
  const TOP_RE = /Топ-20 игроков (\d{4}): №(\d+) — (.+)$/, AW_RE = /^HLTV Awards (\d{4}): (.+?) — лучший игрок года/, BEST_RE = /^Лучший игрок (\d{4}) года — (.+?)!?$/;
  function cardData(it) {
    let m = TOP_RE.exec(it.title || ''), year, r, nick;
    if (m) { year = +m[1]; r = +m[2]; nick = m[3].trim(); }
    else if ((m = AW_RE.exec(it.title || ''))) { year = +m[1]; r = 1; nick = m[2].trim(); }
    else if ((m = BEST_RE.exec(it.title || ''))) { year = +m[1]; r = 1; nick = m[2].trim(); }   // v112: так v33 называет №1
    else return null;
    return { year, r, nick };
  }
  const pct = v => (v * 100).toFixed(1) + '%';
  function yearLines(year) {
    let st = null; try { st = H.stats(); } catch (e) { return []; }
    const out = [];
    Object.entries(st.P || {}).forEach(([nick, o]) => { const src = o.byYear && o.byYear[year]; if (!src) return; let L = null; try { L = H.line(src); } catch (e) {} if (L && L.maps >= 8) out.push({ nick, L }); });
    return out;
  }
  function rankIn(list, nick, f) { const s = list.slice().sort((a, b) => f(b.L) - f(a.L)); const i = s.findIndex(x => x.nick === nick); return i < 0 ? null : i + 1; }
  function card(it) {
    const d = cardData(it); if (!d) return '';
    const now = H.playerNow ? H.playerNow(d.nick) : null, p = now && now.p, teamName = (now && now.t && now.t.name) || (p && p.v31team) || '';
    const list = yearLines(d.year), me = list.find(x => x.nick === d.nick), L = me && me.L;
    const top = list.slice().sort((a, b) => b.L.rating - a.L.rating).slice(0, 20);
    const avg = k => top.length ? top.reduce((a, x) => a + (+x.L[k] || 0), 0) / top.length : 0;
    // награды за год
    const aw = (W.RewardSystem && W.RewardSystem.getPlayerAwards && W.RewardSystem.getPlayerAwards(d.nick)) || (W.twAwardsExport && (W.twAwardsExport().p || {})[d.nick]) || {};
    const mvp = (aw.mvp || []).filter(x => +x.y === d.year).map(x => x.n);
    let evp = []; try { const raw = W.RewardSystem && W.RewardSystem.getPlayerAwards ? W.RewardSystem.getPlayerAwards(d.nick) : null; evp = ((raw && raw.evp) || aw.evp || []).filter(x => +x.y === d.year).map(x => x.n); } catch (e) {}
    // командные места за год (Tier-1 и Мейджоры)
    const places = { 1: [], 2: [], 3: [] };
    const t = teamName && H.teamBy(teamName);
    ((t && t.history) || []).forEach(h => { if (!h || h.isSeasonAward) return; const y = H.yearOf ? H.yearOf(h.season) : 2025 + (+h.season || 1); if (y !== d.year || !(h.isMajor || h.isElite)) return; const pl = +h.place; if (pl >= 1 && pl <= 3) places[pl].push(h.tournament); });
    (aw.ti || []).filter(x => +x.y === d.year).forEach(x => { if (!places[1].includes(x.n)) places[1].push(x.n); });
    // личная статистика
    const bars = L ? [
      ['Убийства за раунд', L.kpr, avg('kpr'), L.kpr.toFixed(2), 1.2],
      ['Выживаемость', 1 - L.dpr, 1 - avg('dpr'), pct(1 - L.dpr), 1],
      ['Урон за раунд', L.adr, avg('adr'), L.adr.toFixed(1), 130],
      ['Мульти-киллы', (L.k2 + L.k3 + L.k4 + L.k5) / Math.max(1, L.R), (top.reduce((a, x) => a + (x.L.k2 + x.L.k3 + x.L.k4 + x.L.k5) / Math.max(1, x.L.R), 0) / Math.max(1, top.length)), pct((L.k2 + L.k3 + L.k4 + L.k5) / Math.max(1, L.R)), .4],
      ['KAST', L.kast / 100, avg('kast') / 100, L.kast.toFixed(1) + '%', 1],
      ['Импакт', L.impact, avg('impact'), L.impact.toFixed(2), 1.8],
      ['Рейтинг 3.0', L.rating, avg('rating'), L.rating.toFixed(2), 1.6]
    ] : [];
    const barHtml = bars.map(([l, v, a, txt, max], i) => `<div class="v111-bar${i === bars.length - 1 ? ' main' : ''}"><span>${esc(l)}</span><i><u style="width:${Math.min(100, v / max * 100).toFixed(1)}%"></u><em style="left:${Math.min(100, a / max * 100).toFixed(1)}%" title="среднее по топ-20"></em></i><b>${esc(txt)}</b></div>`).join('');
    // заметные показатели: место среди игроков года (≥8 карт)
    const notes = L ? [
      [L.rating.toFixed(2) + ' рейтинг', rankIn(list, d.nick, x => x.rating)],
      [L.adr.toFixed(1) + ' урона за раунд', rankIn(list, d.nick, x => x.adr)],
      [L.kast.toFixed(1) + '% KAST', rankIn(list, d.nick, x => x.kast)],
      [L.kpr.toFixed(2) + ' убийств за раунд', rankIn(list, d.nick, x => x.kpr)],
      [L.impact.toFixed(2) + ' импакт', rankIn(list, d.nick, x => x.impact)],
      [(L.diff > 0 ? '+' : '') + L.diff + ' разница убийств', rankIn(list, d.nick, x => x.diff)],
      [pct(L.okpr) + ' раундов с первым убийством', rankIn(list, d.nick, x => x.okpr)],
      [L.clW + ' выигранных клатчей', rankIn(list, d.nick, x => x.clW)],
      [L.maps + ' карт за год', rankIn(list, d.nick, x => x.maps)],
      [pct(L.wr / 100) + ' побед на картах', rankIn(list, d.nick, x => x.wr)]
    ].filter(x => x[1]) : [];
    let photo = ''; try { photo = (W.V31Media && (W.V31Media.full ? W.V31Media.full(d.nick) : null)) || (p && (W.V31Media && W.V31Media.url('player', d.nick) || p.photo)) || ''; } catch (e) {}
    let tint = [255, 190, 90]; try { const u = W.V31Media && W.V31Media.url('team', teamName); const f = u && String(u).split('/').pop(); if (f && W.CS2_TEAM_TINT && W.CS2_TEAM_TINT[f]) tint = W.CS2_TEAM_TINT[f]; } catch (e) {}
    const age = p && p.age ? `${p.age} ${p.age % 10 === 1 && p.age % 100 !== 11 ? 'год' : (p.age % 10 >= 2 && p.age % 10 <= 4 && (p.age % 100 < 10 || p.age % 100 >= 20)) ? 'года' : 'лет'}` : '';
    const list2 = (arr, empty) => arr.length ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="v111-none">${empty}</p>`;
    return `<section class="v111-t20" style="--tr:${tint[0]};--tg:${tint[1]};--tb:${tint[2]}">
      <div class="v111-t20-l">
        <h2 class="v111-t20-n">${esc(d.nick)}</h2>
        <p class="v111-t20-s">${p && H.pFlag ? H.pFlag(p) : ''} ${esc((p && p.realName) || '')}${age ? ' · ' + esc(age) : ''}${teamName ? ' · ' + esc(teamName) : ''}</p>
        <div class="v111-t20-two"><div class="v111-t20-box"><h4>Награды MVP</h4>${list2(mvp, 'нет за год')}</div><div class="v111-t20-box"><h4>Награды EVP</h4>${list2(evp, 'нет за год')}</div></div>
        <div class="v111-t20-box"><h4>Командные достижения</h4><div class="v111-t20-pl">${[1, 2, 3].map(k => `<div><span class="v111-pn p${k}">${k}</span><b>${['', 'Первое место', 'Второе место', 'Третье место'][k]}</b>${list2(places[k], '—')}</div>`).join('')}</div></div>
        ${barHtml ? `<div class="v111-t20-box"><h4>Личная статистика <small>· отметка — среднее по топ-20</small></h4>${barHtml}</div>` : ''}
        ${notes.length ? `<div class="v111-t20-box"><h4>Заметные показатели</h4><ul class="v111-t20-notes">${notes.map(([t, r]) => `<li>${esc(t)} <b class="${r <= 3 ? 'hi' : ''}">(#${r})</b></li>`).join('')}</ul></div>` : ''}
      </div>
      <div class="v111-t20-r">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy" decoding="async">` : ''}<div class="v111-t20-rank"><b>#${d.r}</b><small>HLTV TOP 20 / ${d.year}</small></div></div>
    </section>`;
  }

  (H.AFTER || []).push((pg, arg, root) => {
    if (!root) return;
    try {
      decorate(root);
      if (pg === 'article') {
        const it = N.get ? N.get(String(arg || H.S.arg || '')) : null; if (!it) return;
        const s = srcOf(it), k = root.querySelector('.hs-news-k');
        if (k && !k.querySelector('.v111-src')) k.insertAdjacentHTML('afterbegin', chip(s));
        if (!root.querySelector('.v111-t20')) { const html = card(it); if (html) { const lead = root.querySelector('.hs-art-lead'); if (lead) { lead.insertAdjacentHTML('afterend', html); root.querySelector('.hs-article')?.classList.add('v111-has-card'); } } }
      }
    } catch (e) { console.warn('[v111 news]', e); }
  });
  // «Главная» и мини-лента перерисовываются частями — подписи источников догоняем дешёвым тиком
  const every = (W.CS2Loop && W.CS2Loop.every) || ((f, ms) => setInterval(f, ms));
  every(() => { try { decorate(document.getElementById('hs-page')); } catch (e) {} }, 1500, 'v111-news');

  W.V111News = { srcOf, SRC, card, cardData };
})();
