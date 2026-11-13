/* v88 — «по делу»: трансферы без беспричинных замен, понятные причины ухода, честная динамика рейтинга за сезон,
   ровная пятёрка фото в рейтинге.

   ТРАНСФЕРЫ
   • ИИ-клуб не меняет игрока на более слабого: новичок должен быть заметно сильнее того, кто уходит из состава
     (капитана сравнивают по тактике). Лидера команды (звезда, франшиза, лучший игрок состава) не убирают ради
     «усиления» — только если пришедший явно сильнее.
   • «Звезда уходит из гранда» (раньше — после каждого Major с шансом 60%, без всякого повода) теперь случается,
     только если у игрока истекает контракт или клуб провалил сезон, и не чаще одного раза за окно.
   • Команда, у которой купили игрока, берёт лучшего доступного свободного агента той же роли и языка,
     а не первого попавшегося.
   • Причина ухода — конкретная: истекающий контракт, возраст и спад формы, уровень ниже партнёров (с цифрами),
     длительный спад, а не «освободили место».

   РЕЙТИНГ
   • «Динамика за сезон» считается от снимка рейтинга на начало сезона без академий (раньше команда, добавленная
     в игру по ходу сезона, получала стартовое место «последнее + 1» — отсюда ▲82).

   ФОТО
   • В строке рейтинга все пять фото стоят на одной линии макушки и в одном масштабе (assets/media/player-heads.js;
     для своих фото из медиатеки положение головы считается в браузере). Нет фото — силуэт, а не пустое место. */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof transferState === 'undefined' || typeof seasonState === 'undefined') return;
  const lc = s => String(s || '').toLowerCase();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UNIQUE = ['AWPer', 'IGL'];
  const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const iglPow = p => (+p.tacticalIQ || 0) * .55 + (+p.utility || 0) * .2 + (+p.clutch || 0) * .15 + (+p.firepower || 0) * .1;
  const val = (p, role) => ((role || p.role) === 'IGL' ? iglPow(p) : pow(p));
  const season = () => Number(seasonState.currentSeason) || 1;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const ranked = () => pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const rankOf = t => ranked().indexOf(t) + 1 || 99;
  const starters = t => (t.players || []).filter(p => p && (!p.status || p.status === 'STARTER'));
  const managed = () => { try { return (W.V31 && W.V31.managed && W.V31.managed()) || ''; } catch (e) { return ''; } };
  const tierOf = p => { try { return W.CS2Stature ? W.CS2Stature.tier(p) : 'regular'; } catch (e) { return 'regular'; } };
  const rnd = Math.random;

  /* ------------------------------------------------------------ причины */
  function recent(t, n) { return (t.history || []).filter(h => h && !h.isBootcamp && !h.isSeasonAward && h.place > 0).slice(0, n || 3); }
  // игрок — лидер команды: звезда/франшиза или лучший по уровню игры в своём составе
  function isLeader(p, t) {
    if (!p) return false;
    const tr = tierOf(p); if (tr === 'franchise' || tr === 'star') return true;
    const st = starters(t); if (!st.length) return false;
    return st.every(x => x === p || pow(x) <= pow(p));
  }
  // конкретная причина, по которой игрок теряет место в составе
  function outWhy(t, out, incoming) {
    if (!out) return '';
    const parts = [];
    const st = starters(t).filter(x => x !== out);
    const role = out.role === 'IGL' ? 'IGL' : null;
    const mine = val(out, role), avg = st.length ? st.reduce((s, x) => s + val(x, role), 0) / st.length : mine;
    const age = +out.age || 25, form = Math.round(+out.form || 100);
    const exp = (+out.contractUntil || 99) <= season();
    if (exp) parts.push('контракт истекает, клуб не стал его продлевать');
    if (age >= 31 && form < 100) parts.push(`возраст (${age}) и спад формы (${form}%)`);
    else if (form <= 92) parts.push(`затяжной спад: форма ${form}%`);
    if (avg - mine >= 2.5) parts.push(role ? `слабее как капитан: тактика ${Math.round(+out.tacticalIQ || 0)} — ниже, чем у партнёров` : `уровень игры ниже партнёров (${mine.toFixed(0)} против ${avg.toFixed(0)} в среднем)`);
    if (incoming && val(incoming, out.role) - mine >= 2) parts.push(`${incoming.nick} сильнее на позиции ${out.role || 'стрелка'}`);
    const bad = recent(t, 2).filter(h => h.place >= 9);
    if (!parts.length && bad.length >= 2) parts.push(`после неудачных выступлений (${bad.map(h => h.tournament).slice(0, 2).join(', ')})`);
    if (!parts.length && incoming) parts.push(`${incoming.nick} подходит под стиль команды лучше`);
    return parts.slice(0, 2).join('; ');
  }
  // причина покупки — с точки зрения клуба
  function inWhy(to, incoming, out, base) {
    const g = out ? val(incoming, out.role) - val(out) : 0;
    const what = out ? `замена ${out.nick}${g >= 2 ? ` — заметное усиление позиции ${out.role || 'стрелка'}` : ''}` : 'усиление состава';
    const b = String(base || '').trim();
    if (!b || /^усиление состава$|^необходимость усиления$/i.test(b)) return what;
    return /замена /.test(b) ? b : `${what}; ${b}`;
  }
  W.CS2OutWhy = outWhy;
  W.CS2OutFor = (t, p) => outFor(t, p);   // v90: кого заменит входящий игрок — для Roster Engine
  W.CS2InWhy = inWhy;

  /* ------------------------------------------------------------ кто уходит из покупающей команды (как в v28) */
  function outFor(toTeam, incoming) {
    const st = starters(toTeam);
    if (UNIQUE.includes(incoming.role)) { const same = st.find(p => p.role === incoming.role); if (same) return same; }
    const same = st.filter(p => p.role === incoming.role).sort((a, b) => pow(a) - pow(b))[0];
    if (same) return same;
    return st.filter(p => !UNIQUE.includes(p.role)).sort((a, b) => pow(a) - pow(b))[0] || null;
  }

  /* ------------------------------------------------------------ сторож сделок ИИ */
  const EXODUS = 'ради роли лидера и крупного контракта';
  CS2.patch('applyPlayerTransfer', f => function (fromTeam, toTeam, player, reason) {
      if (!fromTeam || !toTeam || !player) return f.apply(this, arguments);
      const user = !!W.__v31UserDeal || fromTeam.name === managed() || toTeam.name === managed();
      const out = outFor(toTeam, player);
      if (!user) {
        // «звезда уходит из гранда» — только с поводом
        if (reason === EXODUS) {
          const exp = (+player.contractUntil || 99) <= season();
          const flop = recent(fromTeam, 3).filter(h => h.place >= 9).length >= 2;
          const k = 'v88Exodus' + season() + '|' + (seasonState.tournamentIndex || 0);
          if ((!exp && !flop) || seasonState[k] || (W.CS2Stature && W.CS2Stature.protectedIn(player, fromTeam)) || rnd() > 0.35) return false;
          seasonState[k] = 1;
          reason = exp ? `контракт ${player.nick} с ${fromTeam.name} истекал, игрок выбрал роль лидера в новой команде` : `после провального сезона ${fromTeam.name} ${player.nick} попросил о переходе`;
        }
        // покупающая команда не меняет игрока на более слабого и не убирает лидера ради «усиления»
        if (out && !toTeam.isAcademy) {
          const gain = val(player, out.role) - val(out);
          const need = W.CS2Roster ? W.CS2Roster.needGain(toTeam, out) : isLeader(out, toTeam) ? 4 : (+out.age || 25) >= 32 ? 0.5 : 1.5;   // v90: порог — из Roster Engine / CS2Config
          if (gain < need) return false;
          if (W.CS2Stature && W.CS2Stature.protectedIn(out, toTeam) && gain < ((W.CS2Config && W.CS2Config.get('roster.needShielded', 6)) || 6)) return false;
        }
      }
      const why = out && !user ? outWhy(toTeam, out, player) : '';
      const prevWhy = W.__v88OutWhy; W.__v88OutWhy = why;
      const nr = user ? reason : inWhy(toTeam, player, out, reason);
      try { return f.apply(this, [fromTeam, toTeam, player, nr]); }
      finally { W.__v88OutWhy = prevWhy; }
    }, { id: '__v88' });

  /* ------------------------------------------------------------ замена у продавшей команды — лучший доступный */
  (function () {
    const onRoster = nick => teams.some(t => (t.players || []).some(p => lc(p.nick) === lc(nick)));
    CS2.patch('findCompatibleFreeAgent', f => function (team, outPlayer) {
      try {
        if (!team || team.isAcademy || !outPlayer || typeof teamIdentityFit !== 'function') return f.apply(this, arguments);
        if (typeof ensureFreeAgentPool === 'function') ensureFreeAgentPool();
        const others = (team.players || []).filter(p => p !== outPlayer && lc(p.nick) !== lc(outPlayer.nick)).map(p => p.role);
        const need = UNIQUE.find(r => !others.includes(r)) || null;
        let best = null, bs = -1e9;
        (transferState.freeAgents || []).forEach((p, idx) => {
          if (!p || p.reservedFor || p.onLoan || onRoster(p.nick)) return;
          if (p.benchFrom === team.name) return;
          const fit = teamIdentityFit(team, p); if (fit < 0.55) return;
          if (UNIQUE.includes(p.role) && others.includes(p.role)) return;
          if (W.CS2Stature && !W.CS2Stature.canJoin(p, team, null)) return;
          const roleFit = p.role === outPlayer.role ? 6 : (need && p.role === need ? 8 : 0);
          const sc = val(p, outPlayer.role) + roleFit + fit * 4 + Math.min(4, ((+p.form || 100) - 100) * .1);
          if (sc > bs) { bs = sc; best = { p, idx }; }
        });
        // нужен игрок, которого не стыдно поставить в состав: иначе — прежний подбор (он создаст игрока под роль)
        if (best && val(best.p, outPlayer.role) >= val(outPlayer) - 14) return best;
      } catch (e) { console.warn('[v88 FA]', e); }
      return f.apply(this, arguments);
    }, { id: '__v88', ifExists: true });
  })();

  /* ------------------------------------------------------------ динамика рейтинга за сезон */
  function syncSeasonStart() {
    const list = ranked(); if (list.length < 5) return;
    const s = season();
    let snap = seasonState.v88Start;
    if (!snap || snap.s !== s) {
      // новый сезон (или старое сохранение): стартовые места по сохранённым данным, без академий и «последнее + 1»
      const n = list.length, cur = new Map(list.map((t, i) => [t, i + 1]));
      const raw = t => { const v = Number(t.seasonStartRank) || 0; return v > 0 && v <= n ? v : cur.get(t) + 0.5; };
      const order = list.slice().sort((a, b) => raw(a) - raw(b) || cur.get(a) - cur.get(b));
      snap = { s, r: {} }; order.forEach((t, i) => { snap.r[t.name] = i + 1; });
      seasonState.v88Start = snap;
    }
    list.forEach((t, i) => {
      if (snap.r[t.name] == null) snap.r[t.name] = i + 1;          // команда появилась по ходу сезона — динамика с текущего места
      t.seasonStartRank = snap.r[t.name];
    });
    teams.forEach(t => { if (t && t.isAcademy) t.seasonStartRank = null; });
  }
  W.CS2SeasonStartSync = syncSeasonStart;

  /* ------------------------------------------------------------ фото пятёрки в рейтинге */
  const HEADS = W.CS2_HEADS || {};
  const BOX_W = 60, BOX_H = 64, HEAD_H = 21, TOP = 5;
  const metaCache = new Map();
  const base = u => decodeURIComponent(String(u || '').split(/[?#]/)[0].split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '');
  // положение головы по альфа-каналу (для своих фото из медиатеки — blob:, canvas доступен)
  function measure(img) {
    try {
      const h = 160, w = Math.max(8, Math.round(img.naturalWidth / img.naturalHeight * h));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data, ws = new Float32Array(h), cx = new Float32Array(h);
      let opaque = 0, y0 = -1;
      for (let y = 0; y < h; y++) {
        let a = -1, b = -1;
        for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 128) { if (a < 0) a = x; b = x; opaque++; }
        if (a >= 0) { ws[y] = b - a + 1; cx[y] = (a + b) / 2; if (y0 < 0) y0 = y; }
      }
      if (y0 < 0 || opaque > w * h * 0.93) return null;                 // фото с фоном — оставляем как есть
      const sm = y => (ws[Math.max(0, y - 2)] + ws[Math.max(0, y - 1)] + ws[y] + ws[Math.min(h - 1, y + 1)] + ws[Math.min(h - 1, y + 2)]) / 5;
      let ymax = -1;
      for (let y = y0 + 3; y < Math.min(h - 6, y0 + h * .62); y++) {
        let ok = sm(y) > 0; for (let k = 1; k <= 4 && ok; k++) ok = sm(y) >= sm(y - k) && sm(y) > sm(y + k);
        if (ok) { ymax = y; break; }
      }
      let hw = 0; for (let y = y0; y < Math.min(h, y0 + h / 7); y++) hw = Math.max(hw, sm(y));
      let hh = 0;
      if (ymax > 0) {
        hw = sm(ymax);
        for (let y = ymax + 1; y < h; y++) if (sm(y) > hw * 1.35) { let m = ymax; for (let k = ymax; k < y; k++) if (sm(k) < sm(m)) m = k; hh = m - y0; break; }
      }
      const est = hw * 1.3; if (!hh || hh < est * .8 || hh > est * 1.7) hh = est;
      let sx = 0, n = 0; for (let y = y0; y < y0 + Math.max(3, hh * .5) && y < h; y++) if (cx[y]) { sx += cx[y]; n++; }
      return [Math.min(.2, y0 / h), Math.min(.42, Math.max(.24, hh / h)), Math.min(.7, Math.max(.3, (n ? sx / n : w / 2) / w)), w / h];
    } catch (e) { return null; }
  }
  function place(el, m) {
    const dh = HEAD_H / m[1], dw = dh * m[3];
    el.style.width = dw.toFixed(1) + 'px'; el.style.height = dh.toFixed(1) + 'px';
    el.style.left = (BOX_W / 2 - m[2] * dw).toFixed(1) + 'px'; el.style.top = (TOP - m[0] * dh).toFixed(1) + 'px';
    el.classList.add('v88-placed');
  }
  function faceFor(nick) {
    const M = W.V31Media; if (!M) return null;
    const own = M.list ? M.list().find(x => x.kind === 'player' && lc(x.name) === lc(nick)) : null;
    if (own) return { url: own.url, meta: metaCache.get(own.url) || null, own: true };
    const full = M.full ? M.full(nick) : null;
    if (full) { const m = HEADS[base(full)]; return { url: full, meta: m || null }; }
    const u = M.url('player', nick); return u ? { url: u, meta: HEADS[base(u)] || null } : null;
  }
  const SIL = '<svg viewBox="0 0 60 64" aria-hidden="true"><circle cx="30" cy="17" r="10"/><path d="M8 64c0-15 9-24 22-24s22 9 22 24z"/></svg>';
  function lineupHtml(nicks) {
    return nicks.map(n => {
      const f = faceFor(n);
      if (!f) return `<span class="v88-face none" title="${esc(n)}">${SIL}</span>`;
      const st = f.meta ? (() => { const dh = HEAD_H / f.meta[1], dw = dh * f.meta[3]; return ` style="width:${dw.toFixed(1)}px;height:${dh.toFixed(1)}px;left:${(BOX_W / 2 - f.meta[2] * dw).toFixed(1)}px;top:${(TOP - f.meta[0] * dh).toFixed(1)}px"`; })() : '';
      return `<span class="v88-face" title="${esc(n)}"><img src="${esc(f.url)}" alt="" decoding="async"${st}${f.meta ? ' class="v88-placed"' : ` data-v88own="${f.own ? 1 : 0}"`}></span>`;
    }).join('');
  }
  function fixLineups(root) {
    (root || document).querySelectorAll('#hs-root .hs-rankrow').forEach(row => {
      if (row.querySelector('.gs-lineup.v88')) return;
      const nicks = [...row.querySelectorAll('.hs-roster [data-player]')].map(b => b.dataset.player).slice(0, 5);
      if (!nicks.length) return;
      const old = row.querySelector('.gs-lineup'); if (old) old.remove();
      row.insertAdjacentHTML('beforeend', `<span class="gs-lineup v88" aria-hidden="true">${lineupHtml(nicks)}</span>`);
      row.querySelectorAll('.gs-lineup.v88 img:not(.v88-placed)').forEach(img => {
        const go = () => { const m = img.dataset.v88own === '1' ? measure(img) : null; if (m) { metaCache.set(img.getAttribute('src'), m); place(img, m); } else img.classList.add('v88-free'); };
        if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
      });
    });
  }
  W.CS2RankLineup = { fixLineups, measure, faceFor };

  /* ------------------------------------------------------------ летопись команд игрока
     История в профиле раньше строилась только по турнирам и журналу переходов (последние 500 записей). Команда, за
     которую игрок не успел сыграть турнир (стартовый клуб, скамейка), из истории пропадала. Летопись хранит каждую
     смену клуба навсегда: transferState.v88Career[ник] = [[время, команда, сезон, 'bench'?], …]. */
  const NOT_TEAM = /^(свободный агент|скамейка|академия \/ fa|free agent|fa|—|-|)$/i;
  const calNow = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  function ledger() { if (!transferState.v88Career || typeof transferState.v88Career !== 'object') transferState.v88Career = {}; return transferState.v88Career; }
  function note(nick, team, ts, bench) {
    if (!nick || !team || NOT_TEAM.test(String(team).trim())) return;
    const L = ledger(), k = String(nick), a = L[k] || (L[k] = []), last = a[a.length - 1];
    if (last && last[1] === team) { if (!bench && last[3]) last.length = 3; return; }
    a.push(bench ? [ts || calNow(), team, season(), 'bench'] : [ts || calNow(), team, season()]);
    if (a.length > 40) a.splice(0, a.length - 40);
  }
  W.CS2CareerNote = m => {
    if (!m || !m.player) return;
    const ts = Number(m.ts) || calNow();
    if (m.type === 'bench') { note(m.player, m.from, ts - 1, false); note(m.player, m.from, ts, true); return; }
    if (m.type === 'retire' || m.type === 'coach' || m.type === 'extension') return;
    if (m.type === 'release') { note(m.player, m.from, ts - 1); return; }
    if (m.type === 'standin' || m.type === 'loan-return') { if (m.type === 'loan-return') note(m.player, m.to, ts); return; }
    if (m.from && m.from !== m.to) note(m.player, m.from, ts - 1);   // откуда пришёл — если ещё не записано
    note(m.player, m.to, ts);
  };
  function seedLedger() {
    const L = ledger(), t0 = Number(seasonState.v88CareerSeeded) || 0; if (t0) return;
    // старт: текущие клубы всех игроков; скамейка — клуб, за которым игрок числится
    const ts = calNow();
    (transferState.v30Moves || []).slice().reverse().forEach(m => { try { W.CS2CareerNote(m); } catch (e) {} });   // что ещё осталось в журнале
    teams.forEach(t => (t.players || []).forEach(p => { if (p && p.nick && !(L[p.nick] || []).length) note(p.nick, t.name, ts, p.status === 'BENCH'); }));
    (transferState.freeAgents || []).forEach(p => { const tm = p && (p.reservedFor || p.benchFrom); if (tm && !(L[p.nick] || []).length) note(p.nick, tm, ts, true); });
    seasonState.v88CareerSeeded = ts;
  }
  // игроки, появившиеся позже (запас из базы EMDB, новые команды, игроки резерва) — записываются при первом появлении
  function topUpLedger() {
    const L = ledger(), ts = calNow();
    teams.forEach(t => (t.players || []).forEach(p => { if (p && p.nick && !L[p.nick]) note(p.nick, t.name, ts, p.status === 'BENCH'); }));
    (transferState.freeAgents || []).forEach(p => { const tm = p && (p.reservedFor || p.benchFrom); if (tm && !L[p.nick]) note(p.nick, tm, ts, true); });
  }
  // история в профиле: турнирные отрезки + клубы из летописи, где игрок не сыграл ни одного турнира
  function hookCareer() {
    const H = W.HS; if (!H || typeof H.careerOf !== 'function' || H.careerOf.__v88) return !!(H && H.careerOf && H.careerOf.__v88);
    const orig = H.careerOf;
    const arch = () => { try { return Object.values(H.archive() || {}); } catch (e) { return []; } };
    const w = function (nick) {
      const st = orig.apply(this, arguments) || [];
      const L = (ledger()[nick] || []).filter(x => x && x[1]); if (!L.length) return st;
      // время каждого турнирного отрезка — по архиву
      const evs = arch().filter(s => s && s.rost).map(s => ({ ts: Number(s.ts) || 0, name: s.name, team: Object.keys(s.rost).find(t => (s.rost[t] || []).some(p => p.nick === nick)) })).filter(x => x.team);
      st.forEach(s => { const e = evs.filter(x => x.team === s.team && (x.name === s.firstEv || x.name === s.lastEv)).map(x => x.ts).filter(Boolean); s.at = e.length ? Math.min(...e) : null; });
      const out = st.slice();
      L.forEach((x, i) => {
        const from = x[0], to = (L[i + 1] || [])[0] || Infinity;
        const played = evs.some(e => e.team === x[1] && e.ts >= from - 864e5 && e.ts < to);
        if (played || out.some(s => s.team === x[1] && s.current && i === L.length - 1)) return;
        if (out.some(s => s.team === x[1] && s.at != null && s.at >= from - 864e5 && s.at < to)) return;
        out.push({ team: x[1], from: x[2] || season(), to: x[2] || season(), events: 0, titles: 0, at: from, bench: x[3] === 'bench', v88: true });
      });
      // порядок по времени; отрезки без времени (из архива без ts) — на своих местах относительно соседей
      let lastAt = 0; out.forEach(s => { if (s.at == null) s.at = lastAt + 1; lastAt = s.at; });
      out.sort((a, b) => a.at - b.at);
      for (let i = 1; i < out.length; i++) if (out[i].team === out[i - 1].team) { const a = out[i - 1], b = out[i]; a.to = b.to; a.events += b.events; a.titles += b.titles; a.current = a.current || b.current; a.bench = a.bench && b.bench; out.splice(i, 1); i--; }
      const lastTeam = out.length && out[out.length - 1];
      out.forEach(s => { if (s !== lastTeam) delete s.current; });
      return out;
    };
    w.__v88 = true; H.careerOf = w;
    return true;
  }
  /* ------------------------------------------------------------ VRS: старые матчи квалификаций — с новым весом */
  function migrateH2H() {
    if (seasonState.v88H2H) return;
    const sc = W.CS2VRSH2HScale; if (typeof sc !== 'function') return;
    let n = 0;
    teams.forEach(t => (t.vrsLedger && Array.isArray(t.vrsLedger.matches) ? t.vrsLedger.matches : []).forEach(m => {
      if (!m || !m.h2hDelta) return;
      const k = sc({ name: m.eventName, prizePool: 0 }) ; // вес события по имени; у квалификаций — 0.3
      const f = /qualifier|квалиф|отбор/i.test(m.eventName || '') ? k : Math.max(k, 0.4 + 0.6 * (Number(m.eventWeight) || 0));
      if (f < 0.999) { m.h2hDelta = Math.round(m.h2hDelta * f * 10) / 10; n++; }
    }));
    seasonState.v88H2H = 1;
    if (n) { try { W.CS2VRSModel && W.CS2VRSModel.recalcAll && W.CS2VRSModel.recalcAll(); } catch (e) {} try { saveTeams(); saveSeasonState(); } catch (e) {} console.info('[v88] личные встречи в VRS пересчитаны по весу турниров:', n); }
  }

  /* ------------------------------------------------------------ VRS: вес результатов по времени (старые сохранения) */
  function migrateCoverage() {
    if (seasonState.v88Coverage) return;
    const now = calNow(); let n = 0;
    teams.forEach(t => { const l = t && t.vrsLedger; if (!l || Number(l.startedAt) > 0) return;
      const ds = [].concat(l.matches || [], l.earnings || []).map(x => Number(x && x.date) || 0).filter(Boolean);
      l.startedAt = ds.length ? Math.min(now, ...ds) : now; n++; });
    seasonState.v88Coverage = 1;
    if (n) { try { W.CS2VRSModel && W.CS2VRSModel.recalcAll && W.CS2VRSModel.recalcAll(); } catch (e) {} try { saveTeams(); saveSeasonState(); } catch (e) {} }
  }

  /* ------------------------------------------------------------ новая игра: стартовые очки по рейтингу HLTV
     Стартовые очки раньше шли от ~1000 у лидера, а с 20-го по 60-е место различались на единицы (514–570), в случайном
     порядке (fnatic — 55-е, NRG — 47-е). Очки по результатам к концу сезона — до ~1950. Теперь старт — порядок
     HLTV из базы составов 2026 и та же шкала, что у очков по результатам. */
  const SEED = [[1, 1960], [5, 1740], [10, 1600], [15, 1450], [20, 1320], [25, 1170], [30, 960], [40, 800], [60, 690], [80, 575], [100, 465], [120, 405]];
  const seedPts = r => { for (let i = 1; i < SEED.length; i++) { const [r1, p1] = SEED[i - 1], [r2, p2] = SEED[i]; if (r <= r2) return Math.round(p1 + (p2 - p1) * (Math.max(r, r1) - r1) / (r2 - r1)); } return 400; };
  W.CS2SeedPts = seedPts;
  function seedFreshGame() {
    if (seasonState.v88Seed || season() !== 1 || !seasonState.v87Rosters2026) return false;
    const d = new Date(calNow()); if (d.getUTCFullYear() !== 2026 || d.getUTCMonth() > 0) { seasonState.v88Seed = 'skip'; return false; }   // только в самом начале новой игры
    const order = Object.keys((W.CS2_ROSTERS_2026 && W.CS2_ROSTERS_2026.teams) || {});
    const list = pro(), byName = new Map(list.map(t => [lc(t.name), t]));
    const ranked1 = order.map(n => byName.get(lc(n))).filter(Boolean);
    const rest = list.filter(t => !ranked1.includes(t)).sort((a, b) => (b.pts || 0) - (a.pts || 0));
    const now = calNow();
    ranked1.concat(rest).forEach((t, i) => {
      const pts = seedPts(i + 1);
      t.pts = pts; t.vrsShown = pts; t.vrsShownAt = now; t.vrsTarget = pts;
      try { W.CS2VRSModel && W.CS2VRSModel.ensureTeam(t); } catch (e) {}
      if (t.vrsLedger) { t.vrsLedger.basePts = pts; t.vrsLedger.startedAt = now; }
    });
    seasonState.v88Seed = now; delete seasonState.v88Start;
    teams.forEach(t => { if (t) t.seasonStartRank = null; });
    try { syncSeasonStart(); } catch (e) {}
    try { saveTeams(); saveSeasonState(); } catch (e) {}
    try { W.HS && W.HS.render && W.HS.render(); } catch (e) {}
    console.info('[v88] стартовые очки рейтинга — по порядку HLTV 2026');
    return true;
  }
  W.CS2SeedFreshGame = seedFreshGame;

  /* ------------------------------------------------------------ подключение */
  try { seedLedger(); } catch (e) { console.warn('[v88 career seed]', e); }
  try { migrateH2H(); } catch (e) { console.warn('[v88 h2h]', e); }
  try { migrateCoverage(); } catch (e) { console.warn('[v88 coverage]', e); }
  try { seedFreshGame(); } catch (e) { console.warn('[v88 seed]', e); }
  { let n = 0; const iv = setInterval(() => { let done = false; try { done = !!seasonState.v88Seed || seedFreshGame(); } catch (e) { done = true; } if (done || ++n > 60) clearInterval(iv); }, 2000); }
  if (!hookCareer()) { let n = 0; const iv = setInterval(() => { if (hookCareer() || ++n > 30) clearInterval(iv); }, 500); }
  try { syncSeasonStart(); } catch (e) { console.warn('[v88 season start]', e); }
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { try { syncSeasonStart(); } catch (e) {} try { topUpLedger(); } catch (e) {} }, 3000, 'v88-season-start');
  const mo = new MutationObserver(() => { if (document.querySelector('#hs-root .hs-rankrow')) fixLineups(); });
  const start = () => { const r = document.getElementById('hs-root') || document.body; mo.observe(r, { childList: true, subtree: true }); fixLineups(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  console.info('[v88] сделки по делу, динамика сезона, ровные фото в рейтинге');
})();
