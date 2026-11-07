/* v70 — публичные Pick'Em-публикации Major.
   Генерирует внутриигровые посты редакций, стримеров и игроков по реальным ростерам стадий.
   Хранение и реакции остаются в едином V29News; идентификаторы защищают от повторной публикации. */
(() => {
'use strict';
const News = window.V29News, Pickem = window.V33Pickem;
if (!News || !Pickem || !News.publishPublicPickem) return;
const hash = value => { let h = 2166136261 >>> 0; for (const c of String(value || '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const random01 = seed => ((hash(seed) % 1000000) + 1) / 1000001;
const TEAMS = () => Array.isArray(window.teams) ? window.teams : (typeof teams !== 'undefined' && Array.isArray(teams) ? teams : []);
const findTeam = name => TEAMS().find(t => t?.name === name) || null;
const MEDIA = [
  { id: 'cs2news', name: 'CS2News', short: 'CS2', role: 'Киберспортивное медиа', type: 'media', style: 'balanced', tone: 'редакция делает ставку на стабильность и форму' },
  { id: 'cs3news', name: 'CS3News', short: 'CS3', role: 'Независимая аналитика', type: 'media', style: 'bold', tone: 'аналитики ищут апсеты и переоценивают горячую форму' },
  { id: 'hltv-pickem', name: 'HLTV Pick’Em', short: 'HLTV', role: 'Рейтинг и аналитика', type: 'media', style: 'rating', tone: 'редакция ориентируется на текущую силу и международный рейтинг' },
  { id: 'dust2news', name: 'Dust2 News', short: 'D2', role: 'Турнирные новости', type: 'media', style: 'underdog', tone: 'редакция выделяет команды, способные удивить' },
  { id: 'clutchcast', name: 'ClutchCast', short: 'CC', role: 'Стример · Pick’Em', type: 'streamer', style: 'bold', tone: 'стример любит рискованные выборы и громкие сюрпризы' },
  { id: 'aimframe', name: 'AimFrame', short: 'AF', role: 'Стример · Pick’Em', type: 'streamer', style: 'underdog', tone: 'стример верит в команды с сильной индивидуальной формой' }
];
function allProfiles(roster) {
  const teams = (roster || []).map(findTeam).filter(Boolean);
  const candidates = teams.flatMap(t => (t.players || []).map(p => ({ p, t, score: Number(p.firepower || 0) * .55 + Number(p.form || 100) * .3 + Number(p.tacticalIQ || 0) * .15 })));
  candidates.sort((a, b) => b.score - a.score);
  const selected = [];
  for (const c of candidates) {
    if (selected.length >= 2) break;
    if (selected.some(x => x.p.nick === c.p.nick || x.t.name === c.t.name)) continue;
    selected.push(c);
  }
  return MEDIA.concat(selected.map((x, i) => ({ id: `pro-${hash(x.p.nick).toString(36)}`, name: x.p.nick, short: String(x.p.nick).slice(0, 3).toUpperCase(), role: `Профессиональный игрок · ${x.t.name}`, type: 'pro', style: i === 0 ? 'pro-team' : 'balanced', team: x.t.name, tone: `игрок особенно хорошо знает сильные и слабые стороны ${x.t.name}` })));
}
function scoreTeam(name, profile, phaseKey) {
  const t = findTeam(name) || {}, pts = Number(t.pts) || 500, form = Number(t.form) || 100;
  const players = t.players || [], avg = players.length ? players.reduce((s, p) => s + (Number(p.firepower) || 0), 0) / players.length : 60;
  let score = pts * .72 + form * 1.65 + avg * 1.2;
  if (profile.team && profile.team === name) score += 24;
  const noise = random01(`${phaseKey}|${profile.id}|${name}`) - .5;
  const amplitude = profile.style === 'bold' ? 105 : profile.style === 'underdog' ? 78 : profile.style === 'rating' ? 24 : 42;
  score += noise * amplitude;
  if (profile.style === 'underdog' && pts < 600) score += (600 - pts) * .06;
  return score;
}
function stagePicks(roster, profile, phaseKey) {
  const sorted = roster.slice().sort((a, b) => scoreTeam(b, profile, phaseKey) - scoreTeam(a, profile, phaseKey));
  return { threeZero: sorted.slice(0, 2), advance: sorted.slice(2, 8), zeroThree: sorted.slice(-2).reverse() };
}
function playoffPicks(roster, profile, phaseKey) {
  const sorted = roster.slice().sort((a, b) => scoreTeam(b, profile, phaseKey) - scoreTeam(a, profile, phaseKey));
  const qf = sorted.slice(0, 4), sf = qf.slice(0, 2);
  return { qf, sf, champion: sf[0] || null };
}
function stageLabel(i) { return `Stage ${i}`; }
function publishPhase(ctx, phaseKey, phaseTitle, roster, playoff) {
  if (!Array.isArray(roster) || roster.length < (playoff ? 8 : 10)) return 0;
  let made = 0;
  const profiles = allProfiles(roster);
  // v84: авторы публикуют прогнозы не одновременно, а в течение окна этапа:
  // Stage I (окно ~4 дня) — раз в ~9 часов, следующие этапы — раз в ~2 часа.
  const st = window.seasonState || (typeof seasonState !== 'undefined' ? seasonState : null);
  const nowMs = Number(st?.calendar?.currentMs) || Date.now();
  const openKey = `${ctx.majorId}|${phaseKey}`;
  if (st) { st.v84PubOpen = st.v84PubOpen || {}; if (!st.v84PubOpen[openKey]) st.v84PubOpen[openKey] = nowMs; }
  const openedAt = Number(st?.v84PubOpen?.[openKey]) || nowMs;
  const stepMs = (phaseKey === 'stage-1' ? 9 : 2) * 3600000;
  const order = profiles.slice().sort((a, b) => hash(openKey + a.id) - hash(openKey + b.id));
  for (const profile of profiles) {
    const slot = order.indexOf(profile);
    if (nowMs < openedAt + slot * stepMs) continue;
    const picks = playoff ? playoffPicks(roster, profile, `${ctx.majorId}|${phaseKey}`) : stagePicks(roster, profile, `${ctx.majorId}|${phaseKey}`);
    if (!playoff && (picks.threeZero.length !== 2 || picks.advance.length !== 6 || picks.zeroThree.length !== 2)) continue;
    const id = `pubpickem|${hash(ctx.majorId).toString(36)}|${phaseKey}|${profile.id}`;
    const picksText = playoff ? `${picks.champion || '—'} — чемпион по версии ${profile.name}` : `3:0: ${picks.threeZero.join(', ')}; выход: ${picks.advance.join(', ')}; 0:3: ${picks.zeroThree.join(', ')}.`;
    const title = `${profile.name}: Pick’Em на ${phaseTitle} · ${ctx.title}`;
    const lead = playoff ? `${picksText}. Авторский прогноз на плей-офф ${ctx.title}.` : `${profile.tone}. Главные выборы: ${picks.threeZero.join(' и ')} на 3:0, ${picks.zeroThree.join(' и ')} на 0:3.`;
    const publication = { major: ctx.title, stage: !playoff, phaseKey, phaseTitle, threeZero: picks.threeZero, advance: picks.advance, zeroThree: picks.zeroThree,
      qf: picks.qf, sf: picks.sf, champion: picks.champion, note: `Внутриигровая симуляция публичного Pick’Em. Прогноз основан на рейтинге, форме, силе игроков и редакционном стиле автора (${profile.tone}). Это не реальные заявления указанного медиа или игрока.` };
    const item = News.publishPublicPickem({ id, publisher: { id: profile.id, name: profile.name, short: profile.short, role: profile.role, type: profile.type, team: profile.team || null },
      pickemPublication: publication, season: ctx.season, ts: Math.min(nowMs, openedAt + slot * stepMs + (hash(id) % 3600000)),
      title, lead, body: playoff ? [`По мнению автора, в финал выйдут ${picks.sf.join(' и ') || '—'}.`, picksText] : [`3:0: ${picks.threeZero.join(', ')}.`, `Выйдут: ${picks.advance.join(', ')}.`, `0:3: ${picks.zeroThree.join(', ')}.`],
      tags: [...new Set([...(picks.threeZero || []), ...(picks.advance || []), ...(picks.zeroThree || []), ...(picks.qf || []), ...(profile.team ? [profile.team] : [])])].slice(0, 12).map(v => ({ t: 'team', v })), imp: profile.type === 'media' ? 5 : profile.type === 'pro' ? 4 : 3,
      icon: '🎯' });
    if (item) made++;
  }
  return made;
}
function sync() {
  const ctx = Pickem.publicContext?.();
  if (!ctx || !ctx.unlocked || ctx.completed) return { created: 0, phases: 0 };
  let created = 0, phases = 0;
  Object.entries(ctx.stages || {}).forEach(([i, stage]) => {
    // Publish only while the Pick'Em window is genuinely open: never invent picks
    // after the first result of a stage or retroactively for a completed stage.
    if (stage.completed || stage.started || !Array.isArray(stage.teams) || stage.teams.length < 10) return;
    const n = publishPhase(ctx, `stage-${i}`, stageLabel(i), stage.teams, false);
    if (n) { created += n; phases++; }
  });
  if ((ctx.playoffs || []).length >= 8 && !ctx.playoffsStarted) {
    const n = publishPhase(ctx, 'playoffs', 'Плей-офф', ctx.playoffs, true);
    if (n) { created += n; phases++; }
  }
  return { created, phases };
}
function publishedProfiles() {
  const byId = new Map(MEDIA.map(p => [p.id, { ...p }]));
  (News.publicPickem?.() || []).forEach(item => {
    const p = item?.publisher;
    if (p?.id && !byId.has(p.id)) byId.set(p.id, { ...p });
  });
  return [...byId.values()];
}
window.V70PickemPublications = { profiles: publishedProfiles, sync, stagePicks, playoffPicks, allProfiles };
setTimeout(() => { try { sync(); } catch (e) { console.warn('[v70] Pick’Em publications', e); } }, 7200);
(globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(window.v57BatchCalendarSkip) return; try { sync(); } catch (e) { console.warn('[v70] Pick’Em publications', e); } }, 8000);
console.info('[v70] публичные Pick’Em-публикации подключены к V29News');
})();
