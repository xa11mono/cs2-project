/* v84 — организаторы Мейджоров. Обычно Мейджоры проводят постоянные хозяева (PGL, IEM, BLAST, Perfect World,
   StarLadder, FiRe), но изредка Valve доверяет турнир новому организатору: CCT, Thunderpick, FISSURE, BetBoom,
   DreamHack, Esports World Cup и другим. Дебют освещается в новостях; после турнира выходят отзывы.
   Удачный дебют вводит организатора в ротацию (он получает Мейджоры чаще), провальный — закрывает дорогу на несколько лет.
   Решения детерминированы и сохраняются: повторная сборка расписания не меняет уже выбранного хозяина. */
(function () {
  'use strict';
  const W = window, DAY = 864e5;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const nowMs = () => Number(ST()?.calendar?.currentMs) || Date.now();
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const u01 = s => (h32(s) % 10000) / 10000;
  const news = it => { try { return W.V29News?.add?.(it); } catch (e) { return null; } };
  const CANDIDATES = [
    { org: 'CCT', cities: ['Warsaw', 'Prague', 'Berlin'] },
    { org: 'Thunderpick', cities: ['Malta', 'Bucharest'] },
    { org: 'FISSURE', cities: ['Belgrade', 'Dubai'] },
    { org: 'BetBoom', cities: ['Belgrade', 'Astana'] },
    { org: 'DreamHack', cities: ['Jönköping', 'Atlanta', 'Stockholm'] },
    { org: 'Esports World Cup', cities: ['Riyadh'] },
    { org: 'Elisa', cities: ['Helsinki'] },
    { org: 'YaLLa Compass', cities: ['Abu Dhabi'] },
    { org: 'Skyesports', cities: ['Mumbai'] },
    { org: 'Tipsport', cities: ['Prague'] }
  ];
  const S = () => { const s = ST(); return s ? (s.v84MajorHosts = s.v84MajorHosts || { picked: {}, orgs: {}, pending: [] }) : null; };
  const orgOfName = n => CANDIDATES.find(c => String(n || '').startsWith(c.org + ' Major'))?.org || null;

  // Выбор хозяина для Мейджора сезона. null — используется обычная ротация постоянных хозяев.
  function pick(season, which) {
    const st = S(); if (!st || season < 2) return null;
    const key = season + '|' + which;
    if (key in st.picked) return st.picked[key];
    const other = st.picked[season + '|' + (which === 'mid' ? 'end' : 'mid')];
    let res = null;
    if (!other) {
      const salt = String(ST()?.v29Salt || '');
      const trusted = CANDIDATES.filter(c => st.orgs[c.org]?.status === 'trusted');
      const fresh = CANDIDATES.filter(c => !st.orgs[c.org] || (st.orgs[c.org].status === 'banned' && season >= (st.orgs[c.org].until || 99)) || st.orgs[c.org].status === 'neutral');
      const r = u01('host|' + key + salt);
      let c = null;
      if (trusted.length && r < .2) c = trusted[h32('t|' + key + salt) % trusted.length];
      else if (fresh.length && r > .86) c = fresh[h32('f|' + key + salt) % fresh.length];
      if (c) {
        res = `${c.org} Major ${c.cities[h32('c|' + key) % c.cities.length]}`;
        const o = st.orgs[c.org] = st.orgs[c.org] || { status: 'debut', majors: 0 };
        st.pending.push({ type: o.status === 'trusted' ? 'return' : 'debut', org: c.org, name: `${res} ${2025 + season}`, season, at: nowMs() });
      }
    }
    st.picked[key] = res;
    return res;
  }

  // Отзывы после турнира: качество организации — из детерминированного «рейтинга» с поправкой на сам турнир.
  function review(snap) {
    const st = S(), org = orgOfName(snap.name); if (!st || !org) return;
    const o = st.orgs[org] = st.orgs[org] || { status: 'debut', majors: 0 };
    if ((o.reviewed || []).includes(snap.id)) return;
    (o.reviewed = o.reviewed || []).push(snap.id); o.majors = (o.majors || 0) + 1;
    const final = (snap.blocks || []).flatMap(b => (b.sections || []).flatMap(s => s.rounds || [])).slice(-1)[0];
    const close = /3[-:]2|2[-:]1/.test(JSON.stringify(final || {})) ? .06 : 0;
    const score = Math.min(1, .3 + u01('rev|' + snap.id + (ST()?.v29Salt || '')) * .62 + close + (o.status === 'trusted' ? .08 : 0));
    const views = (1.1 + score * 1.6).toFixed(1);
    const first = o.majors === 1;
    if (score >= .6) {
      o.status = 'trusted';
      news({ cat: 'major', icon: '🏟️', imp: 7, ev: snap.id, title: first ? `${snap.name}: дебют ${org} в роли организатора Мейджора удался` : `${org} снова провёл Мейджор на высоком уровне`,
        lead: `Полные трибуны, без технических пауз, пик зрителей — ${views} млн. Игроки и команды хвалят организацию.`,
        body: ['«Одна из лучших арен, на которых мы играли. Всё работало как часы» — капитан одной из команд плей-офф.', `По данным инсайдеров, Valve рассматривает ${org} как постоянного кандидата на проведение Мейджоров.`], tags: [] });
    } else if (score >= .45) {
      o.status = 'neutral';
      news({ cat: 'major', icon: '🏟️', imp: 6, ev: snap.id, title: `${snap.name}: организация без провалов, но и без восторга`,
        lead: `Пик зрителей — ${views} млн. Были задержки расписания и вопросы к звуку на арене.`,
        body: ['«Нормально, но до лучших Мейджоров не дотянули» — один из тренеров.', `${org} обещает учесть замечания, если получит ещё один шанс.`], tags: [] });
    } else {
      o.status = 'banned'; o.until = (Number(snap.season) || 1) + 4;
      news({ cat: 'major', icon: '⚠️', imp: 7, ev: snap.id, title: `${snap.name}: команды недовольны организацией`,
        lead: `Технические паузы, перенос матчей и проблемы с арендой арены. Пик зрителей — ${views} млн.`,
        body: ['«Мы ждали больше от Мейджора» — сразу несколько игроков в соцсетях.', `Источники: в ближайшие годы ${org} вряд ли получит новый Мейджор.`], tags: [] });
    }
  }
  function tick() {
    const st = S(); if (!st) return;
    // анонсы (новости не могут выйти до загрузки ленты)
    while (st.pending.length && W.V29News?.add) {
      const p = st.pending.shift();
      news(p.type === 'debut'
        ? { cat: 'major', icon: '🆕', imp: 8, title: `Впервые в истории: ${p.org} проведёт Мейджор`, lead: `Valve доверила ${p.name} новому организатору. Это первый Мейджор ${p.org}.`, body: ['Сообщество разделилось: одни ждут свежих идей, другие сомневаются, справится ли организатор с турниром такого масштаба.', 'Капсула стикеров и Pick\'Em — как на любом Мейджоре.'], tags: [] }
        : { cat: 'major', icon: '🏟️', imp: 7, title: `${p.org} снова получил Мейджор: ${p.name}`, lead: `После удачного дебюта Valve доверила ${p.org} ещё один Мейджор.`, body: ['Организатор обещает сохранить формат и улучшить зрительскую зону.'], tags: [] });
    }
    try {
      const A = W.hubArchiveExport?.() || {};
      Object.values(A).forEach(s => { if (s && s.champion && s.champion !== '—' && /major/i.test(String(s.prestige || s.kind || '')) && orgOfName(s.name)) review(s); });
    } catch (e) {}
  }
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === 'function' ? setInterval : window.setInterval)(f, ms)))(() => { if (!W.v57BatchCalendarSkip) tick(); }, 5000);
  W.CS2MajorHosts = { pick, review, tick, CANDIDATES, state: S };
})();
