/* v95 — Этап 5 · смена поколений (баланс на 3–5 сезонах).

   Пятисезонный прогон показал: средний возраст основы рос с 23.9 до 28.1 лет, за 5 лет карьеру завершил 31 игрок,
   а игроков до 19 лет в основах почти не осталось. Молодые на сцену попадали только на место завершившего карьеру,
   рынок выбирал по сегодняшнему уровню (ветеран 74 всегда лучше таланта 70 с потенциалом 85), а пул свободных агентов
   урезался до 40 сильнейших — молодые отсеивались первыми.
   Теперь:
     • приток талантов: каждый сезон 'gen.youthPerSeason' игроков 16–19 лет приходят на сцену свободными агентами
       (уровень 66–76, потенциал выше; страна и язык — как у клубов второго-третьего эшелона, чтобы им было куда идти);
     • CS2Gen.ageBonus — клуб вне топ-12 ценит потенциал молодого (до 21 года), ветеран после 30 стоит чуть меньше
       (v30: выбор свободного агента и кандидатов; топ-12 выбирают по уровню «здесь и сейчас»);
     • пул свободных агентов держится по интересу рынка, а не по одному уровню ('gen.faCap');
     • ветераны завершают карьеру чуть раньше (v29), ветеран без клуба — через 2–6 месяцев (v30);
     • игрок, оказавшийся без клуба любым путём (распад, расторжение), получает отметку «без клуба с …» — от неё зависят
       и снижение требований звезды (v84 Stature), и завершение карьеры. */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined' || typeof transferState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => Number(seasonState.calendar && seasonState.calendar.currentMs) || Date.now();
  const season = () => Number(seasonState.currentSeason) || 1;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const seedv = () => { try { return W.CS2SaveProfile ? W.CS2SaveProfile.state().seed : 0; } catch (e) { return 0; } };
  const u = (...k) => (h32(seedv() + '|' + k.join('|')) % 100000) / 100000;
  const pro = () => teams.filter(t => t && !t.isAcademy);
  const ranked = () => pro().slice().sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const rankOf = t => { const i = ranked().indexOf(t); return i < 0 ? 999 : i + 1; };
  const pow = p => (+p.firepower || 0) * .4 + (+p.tacticalIQ || 0) * .25 + (+p.clutch || 0) * .2 + (+p.utility || 0) * .15;
  const lc = s => String(s || '').toLowerCase();
  const journal = (type, e) => { try { W.CS2Journal && W.CS2Journal.log(type, e); } catch (x) {} };
  const news = it => { try { W.V29News && W.V29News.add && W.V29News.add(it); } catch (e) {} };

  function ageBonus(team, p) {
    if (!team || !p || team.isAcademy) return 0;
    const rk = rankOf(team); if (rk <= 12) return 0;
    const age = +p.age || 24, lv = pow(p);
    if (age <= 21) { const pot = Number.isFinite(+p.pot) ? +p.pot : lv; return Math.min(C('gen.youthMax', 3), Math.max(0, pot - lv) * C('gen.youthK', 0.35)) * (rk > 30 ? 1 : 0.6); }
    if (age >= 31) return -C('gen.vetK', 0.35) * (age - 30);
    return 0;
  }

  /* ---------- приток талантов ---------- */
  const SYL = [['ka', 'zy', 'ro', 'me', 'sha', 'vi', 'lu', 'de', 'ny', 'ox', 'ta', 'bo', 'ri', 'jo', 'fe', 'qu', 'xa', 'mo', 'ze', 'il'],
    ['ri', 'nn', 'xo', 'ke', 'la', 'ze', 'mi', 'ty', 'rk', 'vo', 'sk', 'do', 'ni', 'gu', 'ph', 'ly', 'ra', 'se', 'cu', 'ex'], ['', 'x', 'n', '1', 'z', 'k', 'o', 'r', 'y', 's', '0', 'e', 'v', 'a']];
  function taken() {
    const s = new Set();
    teams.forEach(t => (t.players || []).forEach(p => p && s.add(lc(p.nick))));
    (transferState.freeAgents || []).forEach(p => p && s.add(lc(p.nick)));
    (transferState.retired || []).forEach(p => p && s.add(lc(p.nick || p)));
    try { Object.keys(transferState.v88Career || {}).forEach(n => s.add(lc(n))); } catch (e) {}
    return s;
  }
  function nickFor(seed, used) {
    for (let i = 0; i < 80; i++) {
      const h = h32(seed + ':' + i), n = SYL[0][h % 20] + SYL[1][(h >>> 5) % 20] + SYL[2][(h >>> 10) % 14];
      const nick = (h >>> 15) % 3 === 0 ? n.charAt(0).toUpperCase() + n.slice(1) : n;
      if (nick.length >= 3 && !used.has(lc(nick))) { used.add(lc(nick)); return nick; }
    }
    return null;
  }
  function talent(i, used) {
    const s = season(), seed = `gen|${seedv()}|${s}|${i}`, nick = nickFor(seed, used); if (!nick) return null;
    // страна и язык — как у игрока клуба второго-третьего эшелона (там талантам дают шанс)
    const pool = ranked().slice(25), host = pool[h32(seed + 'h') % Math.max(1, pool.length)] || ranked()[0];
    const tpl = (host.players || [])[h32(seed + 'p') % Math.max(1, (host.players || []).length)] || {};
    const roles = ['Rifler', 'Rifler', 'Entry-fragger', 'Support', 'Lurker', 'AWPer', 'IGL'], role = roles[h32(seed + 'r') % roles.length];
    const lv = 66 + u(seed, 'lv') * 10, age = 16 + Math.floor(u(seed, 'age') * 4), j = k => (u(seed, k) - 0.5) * 6;
    const p = { nick, name: nick, country: tpl.country || 'EU', language: tpl.language || 'English', flag: tpl.flag || '', role, age, status: 'FREE AGENT',
      firepower: clamp(Math.round((lv + 3 + j('fp')) * 10) / 10, 60, 92), tacticalIQ: clamp(Math.round((lv - 4 + j('iq') + (role === 'IGL' ? 6 : 0)) * 10) / 10, 60, 92),
      clutch: clamp(Math.round((lv + j('cl')) * 10) / 10, 60, 92), utility: clamp(Math.round((lv - 2 + j('ut')) * 10) / 10, 60, 92),
      form: 100, morale: 88, fatigue: 0, rating: 1.0, v95talent: s, v84FaSince: now(), v30ProOrigin: false };
    p.pot = Math.round(clamp(pow(p) + 8 + u(seed, 'pot') * 14, pow(p), 95) * 10) / 10;
    try { if (typeof createPlayerFromNick === 'function') { const base = createPlayerFromNick({ name: host.name, pts: 500, form: 100 }, nick, i % 5); Object.keys(base).forEach(k => { if (!(k in p)) p[k] = base[k]; }); } } catch (e) {}
    try { if (W.V31 && W.V31.ensurePerson) W.V31.ensurePerson(p); } catch (e) {}
    return p;
  }
  function intake(force) {
    const s = season(); if (!force && seasonState.v95GenSeason === s) return 0;
    seasonState.v95GenSeason = s;
    if (!force && !seasonState.v95GenInit) { seasonState.v95GenInit = 1; return 0; }   // первый запуск в сейве — талантов задним числом не создаём
    const n = Math.round(C('gen.youthPerSeason', 48)), used = taken(), list = [];
    for (let i = 0; i < n; i++) { const p = talent(i, used); if (p) list.push(p); }
    transferState.freeAgents = (transferState.freeAgents || []).concat(list);
    journal('CAREER', { kind: 'youth-intake', players: list.map(p => p.nick), reason: `${list.length} молодых талантов (16–19 лет) пришли на сцену свободными агентами` });
    const best = list.slice().sort((a, b) => b.pot - a.pot).slice(0, 3);
    if (best.length) news({ cat: 'player', icon: '🌱', imp: 4, title: `Новое поколение: ${list.length} талантов ищут первый профессиональный клуб`, lead: `Самые перспективные — ${best.map(p => `${p.nick} (${p.age}, ${p.role})`).join(', ')}.`, body: [], tags: best.map(p => ({ t: 'player', v: p.nick })) });
    try { W.saveTransferState && W.saveTransferState(); } catch (e) {}
    return list.length;
  }
  // отметка «без клуба с …» у каждого свободного агента
  function stamp() { (transferState.freeAgents || []).forEach(p => { if (p && !p.v84FaSince && p.status !== 'BENCH' && !p.reservedFor) p.v84FaSince = now(); }); }
  function tick() { try { stamp(); intake(false); } catch (e) { console.warn('[v95 generations]', e); } }

  W.CS2Gen = { ageBonus, intake, talent, stamp };
  const every = (W.CS2Loop && W.CS2Loop.every) || ((fn, ms) => setInterval(fn, ms));
  every(() => { if (!W.v57BatchCalendarSkip) tick(); }, 6000, 'v95-gen');
  (function hookDaily() {
    const f = W.V30RankSnapshotTick; if (typeof f !== 'function') { setTimeout(hookDaily, 1000); return; }
    if (f.__v95g) return;
    const w = function () { const r = f.apply(this, arguments); tick(); return r; };
    Object.keys(f).forEach(k => { w[k] = f[k]; }); w.__v95g = true; W.V30RankSnapshotTick = w;
  })();
})();
