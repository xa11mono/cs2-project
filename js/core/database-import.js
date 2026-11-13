/* v59 · Importer for user roster/player and tournament databases + coach registry */
(() => {
  'use strict';
  const LS_ROSTERS = 'cs2_custom_rosters_v59';
  const LS_TOURNAMENTS = 'cs2_custom_tournaments_v59';
  const $ = id => document.getElementById(id);
  const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const cleanYear = s => String(s || '').replace(/\s*\b(?:19|20)\d{2}\b/g, '').trim();
  const isObject = x => x && typeof x === 'object' && !Array.isArray(x);
  const uniqPush = (target, values) => {
    const seen = new Set((target || []).map(x => norm(x)));
    (values || []).forEach(value => { const v = String(value || '').trim(); const k = norm(v); if (v && k && !seen.has(k)) { target.push(v); seen.add(k); } });
  };
  function status(message, type = 'info') {
    ['v59-import-status', 'v59-import-status-page'].forEach(id => {
      const el = $(id); if (el) { el.textContent = message; el.dataset.state = type; }
    });
  }
  const ASSIGNMENT_NAMES = 'CS2_REAL|CS2_EMDB_2026|CS2_TOURNAMENTS|CS2_ROSTERS|TOUR_DATABASE|TOURNAMENT_DATABASE|TEAM_ROSTER_2026|PLAYER_META_2026|PLAYER_STATUS_2026|DEFAULT_TEAMS|TEAM_REGION_FLAG|COACHES_2026';
  function extractAssignedObjects(raw) {
    const re = new RegExp('(?:(?:export\\s+)?(?:const|let|var)\\s+)?(?:window\\s*\\.\\s*)?(' + ASSIGNMENT_NAMES + ')\\s*=', 'g');
    const found = []; let m;
    while ((m = re.exec(raw))) {
      let i = re.lastIndex;
      while (/\s/.test(raw[i] || '')) i++;
      if (raw[i] !== '{' && raw[i] !== '[') continue;
      const start = i, stack = [];
      let quote = '', lineComment = false, blockComment = false, escaped = false, end = -1;
      for (; i < raw.length; i++) {
        const c = raw[i], n = raw[i + 1];
        if (lineComment) { if (c === '\n') lineComment = false; continue; }
        if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
        if (quote) {
          if (escaped) { escaped = false; continue; }
          if (c === '\\') { escaped = true; continue; }
          if (c === quote) quote = '';
          continue;
        }
        if (c === '/' && n === '/') { lineComment = true; i++; continue; }
        if (c === '/' && n === '*') { blockComment = true; i++; continue; }
        if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
        if (c === '{') stack.push('}');
        else if (c === '[') stack.push(']');
        else if (c === '}' || c === ']') {
          if (stack.pop() !== c) break;
          if (!stack.length) { end = i + 1; break; }
        }
      }
      if (end > start) { found.push({ name: m[1], source: raw.slice(start, end) }); re.lastIndex = end; }
    }
    return found;
  }
  function composeAssignedDatabase(assignments) {
    if (!assignments.length) return null;
    if (assignments.length === 1) {
      const { name, source } = assignments[0];
      const only = normalizeJsObjectLiteral(source);
      if (name === 'TEAM_ROSTER_2026') return { rosters: only };
      if (name === 'PLAYER_META_2026') return { meta: only };
      if (name === 'PLAYER_STATUS_2026') return { playerStatus: only };
      if (name === 'DEFAULT_TEAMS') return { teams: only };
      if (name === 'TEAM_REGION_FLAG') return { teamCountry: only };
      if (name === 'COACHES_2026') return { coaches: only };
      if (name === 'CS2_ROSTERS' && isObject(only) && !('rosters' in only) && !('teams' in only)) return { rosters: only };
      if (name === 'CS2_TOURNAMENTS') return Array.isArray(only) ? { tournaments: only } : normalizePayloadAliases(name, only);
      if (name === 'TOUR_DATABASE' || name === 'TOURNAMENT_DATABASE') return isObject(only) ? only : { tournaments: only };
      return normalizePayloadAliases(name, only);
    }
    const out = {};
    assignments.forEach(({ name, source }) => {
      const value = normalizeJsObjectLiteral(source);
      if (name === 'CS2_REAL' || name === 'CS2_EMDB_2026') {
        if (isObject(value)) Object.assign(out, value);
      } else if (name === 'CS2_ROSTERS') {
        if (isObject(value) && (value.rosters || value.teams || value.meta || value.players)) Object.assign(out, value);
        else out.rosters = value;
      } else if (name === 'CS2_TOURNAMENTS') {
        if (Array.isArray(value)) out.tournaments = value;
        else if (isObject(value)) Object.assign(out, value);
      } else if (name === 'TOUR_DATABASE' || name === 'TOURNAMENT_DATABASE') {
        if (isObject(value)) Object.assign(out, value);
      } else if (name === 'TEAM_ROSTER_2026') out.rosters = value;
      else if (name === 'PLAYER_META_2026') out.meta = value;
      else if (name === 'PLAYER_STATUS_2026') out.playerStatus = value;
      else if (name === 'DEFAULT_TEAMS') out.teams = value;
      else if (name === 'TEAM_REGION_FLAG') out.teamCountry = value;
      else if (name === 'COACHES_2026') out.coaches = value;
    });
    return normalizePayloadAliases('', out);
  }
  function normalizePayloadAliases(name, value) {
    if (!isObject(value)) return value;
    const out = { ...value };
    if (!out.rosters && isObject(out.TEAM_ROSTER_2026)) out.rosters = out.TEAM_ROSTER_2026;
    if (!out.meta && isObject(out.PLAYER_META_2026)) out.meta = out.PLAYER_META_2026;
    if (!out.playerStatus && isObject(out.PLAYER_STATUS_2026)) out.playerStatus = out.PLAYER_STATUS_2026;
    if (!out.teams && Array.isArray(out.DEFAULT_TEAMS)) out.teams = out.DEFAULT_TEAMS;
    if (!out.teamCountry && isObject(out.TEAM_REGION_FLAG)) out.teamCountry = out.TEAM_REGION_FLAG;
    if (!out.coaches && isObject(out.COACHES_2026)) out.coaches = out.COACHES_2026;
    if ((name === 'TOUR_DATABASE' || name === 'TOURNAMENT_DATABASE') && !out.tournaments) return { ...out, ...value };
    return out;
  }
  function normalizeJsObjectLiteral(source) {
    // Only accepts passive object/array literals; no executable code is evaluated.
    let noComments = '', quote = '', escaped = false;
    for (let i = 0; i < source.length; i++) {
      const c = source[i], n = source[i + 1];
      if (quote) { noComments += c; if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === quote) quote = ''; continue; }
      if (c === '"' || c === "'" || c === '`') { quote = c; noComments += c; continue; }
      if (c === '/' && n === '/') { while (i < source.length && source[i] !== '\n') i++; noComments += '\n'; continue; }
      if (c === '/' && n === '*') { i += 2; while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++; i++; continue; }
      noComments += c;
    }
    let strings = '', q = '', esc = false;
    for (let i = 0; i < noComments.length; i++) {
      const c = noComments[i];
      if (!q) {
        if (c === '"') { q = '"'; strings += c; continue; }
        if (c === "'" || c === '`') {
          const quoteChar = c; let raw = '', closed = false;
          for (i++; i < noComments.length; i++) {
            const ch = noComments[i];
            if (ch === '\\' && i + 1 < noComments.length) { raw += ch + noComments[++i]; continue; }
            if (ch === quoteChar) { closed = true; break; }
            raw += ch;
          }
          if (!closed || (quoteChar === '`' && /\$\{/.test(raw))) throw new Error('В JS-базе есть шаблонная строка или незакрытая кавычка. Экспортируй объект в JSON.');
          const decoded = raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\`/g, '`').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
          strings += JSON.stringify(decoded); continue;
        }
        strings += c;
      } else {
        strings += c;
        if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') q = '';
      }
    }
    // Quote bare object keys, normalize harmless JS literal leftovers and trailing commas.
    strings = strings.replace(/([,{]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\bundefined\b/g, 'null')
      .replace(/\bNaN\b|\bInfinity\b/g, 'null');
    return JSON.parse(strings);
  }
  async function readDataFile(file) {
    const raw = await file.text();
    try { return normalizePayloadAliases('', JSON.parse(raw)); } catch (jsonError) {
      const assignments = extractAssignedObjects(raw);
      if (assignments.length) {
        try { return composeAssignedDatabase(assignments); }
        catch (e) { throw new Error(`Не удалось безопасно разобрать JS-базу: ${e.message || e}. Для импорта сохрани объекты как JSON или пришли исходные файлы для адаптации.`); }
      }
      throw new Error('Поддерживаются JSON и JS-файлы с CS2_REAL, CS2_EMDB_2026, TEAM_ROSTER_2026, PLAYER_META_2026, DEFAULT_TEAMS, COACHES_2026 и TOUR_DATABASE. Не удалось найти подходящий объект.');
    }
  }
  function combineImportParts(parts) {
    const out = {};
    const asTeamMap = value => {
      if (isObject(value)) return value;
      if (Array.isArray(value)) return Object.fromEntries(value.filter(x => x && x.name).map(x => [x.name, x]));
      return {};
    };
    const mergeNamedArray = (a, b, getKey) => {
      const map = new Map();
      [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach(item => {
        const key = norm(getKey(item)); if (!key) return;
        map.set(key, item);
      });
      return [...map.values()];
    };
    parts.filter(isObject).forEach(part => Object.entries(part).forEach(([key, value]) => {
      if (key === 'teams') { out.teams = { ...asTeamMap(out.teams), ...asTeamMap(value) }; return; }
      if (['rosters','meta','players','playerStatus','teamCountry','coaches','bench','TEAM_REGION_FLAG','COACHES_2026'].includes(key) && isObject(value)) {
        out[key] = { ...(isObject(out[key]) ? out[key] : {}), ...value }; return;
      }
      if (['newTeams'].includes(key) && Array.isArray(value)) { out[key] = mergeNamedArray(out[key], value, x => x?.name); return; }
      if (['tournaments'].includes(key) && Array.isArray(value)) { out[key] = mergeNamedArray(out[key], value, x => typeof x === 'string' ? x : x?.name); return; }
      if (['reserve','freeAgents','players'].includes(key) && Array.isArray(value)) { out[key] = mergeNamedArray(out[key], value, x => typeof x === 'string' ? x : (Array.isArray(x) ? x[0] : x?.nick || x?.nickname || x?.name)); return; }
      if (Array.isArray(value) && /^(major|majors|elite|s.?tier|stier|regular|tier1|tier-1|tier2|tier-2|tier3|tier-3|academy|academies|bounty|bounties|weak|open|amateur)$/i.test(key)) {
        out[key] = mergeNamedArray(out[key], value, x => typeof x === 'string' ? x : x?.name); return;
      }
      if (isObject(value) && isObject(out[key])) out[key] = { ...out[key], ...value };
      else if (Array.isArray(value) && Array.isArray(out[key])) out[key] = out[key].concat(value);
      else out[key] = value;
    }));
    return normalizePayloadAliases('', out);
  }
  function playerMetaSource(data) {
    const src = data.meta || data.players || data.PLAYER_META_2026 || {};
    const out = Array.isArray(src)
      ? Object.fromEntries(src.filter(x => x && (x.nick || x.nickname || x.name)).map(x => [x.nick || x.nickname || x.name, x]))
      : (isObject(src) ? { ...src } : {});
    // data-real-2026 reserve format: [nickname, ISO country, skill].
    (Array.isArray(data.reserve) ? data.reserve : []).forEach(entry => {
      if (Array.isArray(entry) && entry[0]) out[entry[0]] = { ...(out[entry[0]] || {}), country: entry[1] || out[entry[0]]?.country, skill: entry[2] ?? out[entry[0]]?.skill };
      else if (isObject(entry) && (entry.nick || entry.nickname)) { const nick = entry.nick || entry.nickname; out[nick] = { ...(out[nick] || {}), ...entry }; }
    });
    (Array.isArray(data.freeAgents) ? data.freeAgents : []).forEach(entry => {
      if (isObject(entry) && (entry.nick || entry.nickname)) { const nick = entry.nick || entry.nickname; out[nick] = { ...(out[nick] || {}), ...entry }; }
    });
    const statuses = data.playerStatus || data.PLAYER_STATUS_2026 || {};
    if (isObject(statuses)) Object.entries(statuses).forEach(([nick, status]) => {
      out[nick] = { ...(out[nick] || {}), status: isObject(status) ? (status.status || status.state) : status };
    });
    return out;
  }
  function teamRows(data) {
    const rosters = data.rosters || data.teamsRoster || data.lineups || {};
    const metaTeams = {};
    if (isObject(data.teams)) Object.assign(metaTeams, data.teams);
    const coachMap = data.coaches || data.COACHES_2026 || {};
    if (isObject(coachMap)) Object.entries(coachMap).forEach(([name, coach]) => { metaTeams[name] = { ...(metaTeams[name] || {}), coach }; });
    if (Array.isArray(data.newTeams)) data.newTeams.forEach(x => { if (x?.name) metaTeams[x.name] = { ...(metaTeams[x.name] || {}), ...x }; });
    if (Array.isArray(data.teams)) data.teams.forEach(x => { if (x?.name) metaTeams[x.name] = { ...(metaTeams[x.name] || {}), ...x }; });
    const rows = [];
    const addRoster = (name, roster) => {
      const meta = metaTeams[name] || {};
      const source = isObject(roster) ? roster : {};
      const list = Array.isArray(roster) ? roster : (source.roster || source.players || source.lineup || meta.roster || meta.players || meta.lineup || []);
      if (!Array.isArray(list) || !list.length) return;
      rows.push({ ...meta, ...source, name, roster: list, bench: data.bench?.[name] || source.bench || meta.bench || [] });
    };
    if (isObject(rosters)) Object.entries(rosters).forEach(([name, roster]) => addRoster(name, roster));
    if (Array.isArray(data.teams)) data.teams.forEach(x => { if (x?.name) addRoster(String(x.name), x); });
    else if (isObject(data.teams)) Object.entries(data.teams).forEach(([name, row]) => {
      if (Array.isArray(row) || row?.roster || row?.players || row?.lineup) addRoster(name, row);
    });
    const seen = new Set();
    return rows.filter(row => { const k = norm(row.name); if (!k || seen.has(k)) return false; seen.add(k); return true; }).map(row => {
      const teamCountry = data.teamCountry?.[row.name] || data.TEAM_REGION_FLAG?.[row.name];
      if (!row.country && teamCountry && /^[A-Z]{2}$/.test(String(teamCountry))) row.country = teamCountry;
      else if (!row.flag && teamCountry) row.flag = teamCountry;
      return row;
    });
  }
  function rosterNick(p) { return typeof p === 'string' ? p.trim() : String(p?.nick || p?.nickname || p?.name || p?.id || '').trim(); }
  function updatePlayerMeta(nick, meta) {
    if (!nick || !isObject(meta) || typeof PLAYER_META_2026 === 'undefined') return;
    PLAYER_META_2026[nick] = { ...(PLAYER_META_2026[nick] || {}), ...meta };
  }
  function playerObject(team, nick, index, meta) {
    const existing = (team.players || []).find(p => norm(p.nick) === norm(nick));
    const p = existing ? JSON.parse(JSON.stringify(existing)) : createPlayerFromNick(team, nick, index);
    const m = PLAYER_META_2026[nick] || meta || {};
    if (meta && isObject(meta)) Object.assign(m, meta);
    if (m.realName) p.realName = m.realName;
    if (m.age) p.age = window.cs2MetaAge ? window.cs2MetaAge(Number(m.age)) : Number(m.age);
    if (m.country) { p.country = m.country; if (typeof countryFlag === 'function') p.flag = countryFlag(m.country); }
    if (m.language) p.language = m.language;
    if (m.role && !p.v84roleLocked) p.role = m.role;
    if (m.firepower != null) p.firepower = Number(m.firepower);
    else if (m.skill != null && p.firepower == null) p.firepower = Math.max(60, Math.min(98, Number(m.skill)));
    if (m.tacticalIQ != null) p.tacticalIQ = Number(m.tacticalIQ);
    if (m.clutch != null) p.clutch = Number(m.clutch);
    if (m.utility != null) p.utility = Number(m.utility);
    p.status = index < 5 ? 'STARTER' : (p.status || 'BENCH');
    return p;
  }
  function newImportedTeam(row, roster) {
    const name = String(row.name || row.team || '').trim();
    if (!name || !roster.length) return null;
    const maps = typeof generateMapStats === 'function' ? generateMapStats() : {};
    const mapStats = {};
    (typeof MAP_POOL !== 'undefined' ? MAP_POOL : []).forEach(map => { const wr = Math.round(Number(maps[map]) || 50); mapStats[map] = { wins: Math.round(20 * wr / 100), losses: 20 - Math.round(20 * wr / 100) }; });
    const pts = Number(row.pts ?? row.points ?? row.rating) || 350;
    const t = { name, pts, style: row.style || 'Tactical', maps, mapStats, mapStatsVersion: 2, mapHistory: [], mapPickHistory: {}, history: [], streak: 0, form: 100, fatigue: 0, prevRank: null, lastBootcampSeason: 0,
      trophies: { majors: 0, elite: 0, regular: 0, grandFinalsWon: 0 }, activeModifier: null, seasonStartRank: null, seasonChampionships: 0, players: [], coach: (typeof row.coach === 'string' ? { name: row.coach, flag: row.flag || '🌍' } : (row.coach || { name: '—', flag: row.flag || '🌍' })), playerLayerVersion: typeof PLAYER_LAYER_VERSION !== 'undefined' ? PLAYER_LAYER_VERSION : 2, rosterLastChange: null, tempStandIn: null };
    const full = roster.slice(0, 5).concat(roster.slice(5), Array.isArray(row.bench) ? row.bench : []);
    t.players = full.map((item, i) => { const nick = rosterNick(item); updatePlayerMeta(nick, isObject(item) ? item : null); const p = playerObject(t, nick, i, item); p.status = i < 5 ? 'STARTER' : 'BENCH'; return p; });
    if (row.country) t.country = row.country;
    if (row.flag) t.flag = row.flag;
    if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(t);
    return t;
  }
  function applyRosterDatabase(data, options = {}) {
    if (!isObject(data)) throw new Error('Файл базы составов должен содержать JSON-объект.');
    const rows = teamRows(data).filter(row => String(row.name || row.team || '').trim());
    if (!rows.length) throw new Error('Не найдены составы. Ожидается teams[] или rosters{} с пятёрками игроков.');
    const applyExisting = !!options.applyExisting;
    const addNew = options.addNew !== false;
    const pMeta = playerMetaSource(data);
    Object.entries(pMeta).forEach(([nick, meta]) => updatePlayerMeta(nick, meta));
    const imported = [], created = [], preserved = [], skipped = [];
    rows.forEach(row => {
      const name = String(row.name || row.team).trim();
      const rawRoster = row.roster || row.players || row.lineup || [];
      const roster = Array.isArray(rawRoster) ? rawRoster.filter(x => rosterNick(x)) : [];
      if (roster.length < 5) { skipped.push(`${name}: меньше 5 игроков`); return; }
      const bench = Array.isArray(row.bench) ? row.bench.filter(x => rosterNick(x)) : [];
      const allPeople = roster.slice(0, 5).concat(roster.slice(5), bench);
      const nicks = roster.map(rosterNick);
      TEAM_ROSTER_2026[name] = nicks.slice(0, 5);
      if (row.country && typeof TEAM_REGION_FLAG !== 'undefined') TEAM_REGION_FLAG[name] = typeof countryFlag === 'function' ? countryFlag(row.country) : (row.flag || '🌍');
      let team = teams.find(t => norm(t.name) === norm(name));
      if (!team && addNew) {
        team = newImportedTeam(row, roster);
        if (team) { teams.push(team); created.push(name); if (Array.isArray(DEFAULT_TEAMS) && !DEFAULT_TEAMS.some(x => norm(x.name) === norm(name))) DEFAULT_TEAMS.push({ name, pts: team.pts, style: team.style }); }
      } else if (team && applyExisting) {
        const previous = team.players || [];
        team.players = allPeople.map((entry, i) => {
          const nick = rosterNick(entry); updatePlayerMeta(nick, isObject(entry) ? entry : null);
          const p = playerObject(team, nick, i, entry); p.status = i < 5 ? 'STARTER' : 'BENCH'; return p;
        });
        if (row.coach) team.coach = typeof row.coach === 'string' ? { name: row.coach, flag: row.flag || '🌍' } : { ...row.coach };
        if (row.country) team.country = row.country;
        if (row.pts != null || row.points != null || row.rating != null) team.pts = Number(row.pts ?? row.points ?? row.rating) || team.pts;
        team.rosterSource = 'Imported database'; team.rosterUpdatedAt = data.asOf || new Date().toISOString().slice(0, 10);
        if (typeof ensurePlayerLayer === 'function') ensurePlayerLayer(team);
        imported.push(name);
      }
      if (team && !applyExisting && !created.includes(name)) preserved.push(name);
    });
    if (typeof window.v59EnsureUniqueCoaches === 'function') window.v59EnsureUniqueCoaches();
    if (typeof saveTeams === 'function') saveTeams();
    try { if (typeof renderRating === 'function') renderRating(); } catch (e) {}
    try { window.HS?.invalidate?.(); window.HS?.render?.(); } catch (e) {}
    const normalizedRosters = Object.fromEntries(rows.filter(r => Array.isArray(r.roster || r.players || r.lineup) && (r.roster || r.players || r.lineup).length >= 5).map(r => [String(r.name || r.team).trim(), (r.roster || r.players || r.lineup).map(rosterNick).slice(0, 5)]));
    const relevantNicks = new Set(Object.values(normalizedRosters).flat());
    rows.forEach(r => (Array.isArray(r.bench) ? r.bench : []).forEach(p => { const n = rosterNick(p); if (n) relevantNicks.add(n); }));
    (Array.isArray(data.reserve) ? data.reserve : []).forEach(p => { const n = rosterNick(Array.isArray(p) ? p[0] : p); if (n) relevantNicks.add(n); });
    (Array.isArray(data.freeAgents) ? data.freeAgents : []).forEach(p => { const n = rosterNick(p); if (n) relevantNicks.add(n); });
    const relevantMeta = Object.fromEntries([...relevantNicks].filter(n => pMeta[n]).map(n => [n, pMeta[n]]));
    const normalized = { version: 1, asOf: data.asOf || '', rosters: normalizedRosters, meta: relevantMeta, teams: rows.map(r => ({ name: r.name, pts: r.pts ?? r.points ?? r.rating, country: r.country, style: r.style, coach: r.coach })).filter(r => r.name) };
    try { localStorage.setItem(LS_ROSTERS, JSON.stringify(normalized)); } catch (e) { console.warn('[v59] не удалось сохранить импортированную базу составов', e); }
    return { total: rows.length, imported: imported.length, created: created.length, preserved: preserved.length, skipped };
  }
  function parseTier(value) {
    const s = norm(value).replace(/\s/g, '');
    if (/major|мейдж/.test(s)) return 'major';
    if (/academy|академ/.test(s)) return 'academy';
    if (/tier3|t3/.test(s)) return 'tier3';
    if (/tier2|t2/.test(s)) return 'tier2';
    if (/weak|open|amateur|grassroots|rookie/.test(s)) return 'weak';
    if (/bounty/.test(s)) return 'bounty';
    if (/s.?tier|elite|stier/.test(s)) return 'elite';
    return 'regular';
  }
  function tournamentRows(data) {
    const out = [];
    if (Array.isArray(data.tournaments)) data.tournaments.forEach(x => {
      if (typeof x === 'string') out.push({ name: x, tier: 'regular' });
      else if (isObject(x) && x.name) {
        const tierValue = x.tier || x.level || x.category || x.prestige || (/(?:major|tier|elite|bounty|academy|open|amateur)/i.test(String(x.type || '')) ? x.type : 'regular');
        out.push({ ...x, tier: tierValue });
      }
    });
    const groups = { major: ['major','majors'], elite: ['elite','s-tier','sTier','stier'], regular: ['regular','tier1','tier-1','tier 1','tier1Events'], tier2: ['tier2','tier-2','tier 2'], tier3: ['tier3','tier-3','tier 3'], academy: ['academy','academies'], bounty: ['bounty','bounties'], weak: ['weak','open','amateur'] };
    Object.entries(groups).forEach(([tier, keys]) => keys.forEach(key => {
      const value = data[key];
      if (Array.isArray(value)) value.forEach(x => out.push(typeof x === 'string' ? { name: x, tier } : (isObject(x) && x.name ? { ...x, tier: x.tier || tier } : null)));
    }));
    return out.filter(x => x && x.name);
  }
  function tournamentBucket(tier) { return parseTier(tier); }
  const tournamentMeta = (() => { try { return JSON.parse(localStorage.getItem(LS_TOURNAMENTS) || '{}').meta || {}; } catch (e) { return {}; } })();
  function normalizeFormat(value) {
    const s = norm(value).replace(/\s/g, '');
    if (/double|bo3double|doubleelim/.test(s)) return 'double';
    if (/swiss/.test(s)) return 'swiss';
    if (/gsl|group/.test(s)) return 'gsl';
    if (/bounty/.test(s)) return 'bounty';
    if (/single|elim/.test(s)) return 'single';
    return '';
  }
  function metaForEvent(name) {
    const key = norm(cleanYear(name));
    return tournamentMeta[key] || Object.values(tournamentMeta).find(x => norm(cleanYear(x?.name)) === key) || null;
  }
  function applyMetaFields(target, meta) {
    if (!target || !meta) return;
    const fmt = normalizeFormat(meta.format);
    if (fmt) target.format = fmt;
    const size = Number(meta.size);
    if (size >= 4 && size <= 64) target.size = Math.round(size);
    const prize = Number(meta.prize ?? meta.prizePool);
    if (Number.isFinite(prize) && prize >= 0) target.prize = prize;
    const min = Number(meta.min ?? meta.minRating), max = Number(meta.max ?? meta.maxRating);
    if (Number.isFinite(min) && min > 0) target.min = min;
    if (Number.isFinite(max) && max > 0) target.max = max;
    ['organizer','city','country','region','location','venue'].forEach(k => { if (meta[k] != null) target[k] = meta[k]; });
  }
  function applyImportedTier1Schedule(rows) {
    if (typeof seasonState === 'undefined' || !Array.isArray(seasonState.seasonSchedule)) return 0;
    const source = Array.isArray(rows) ? rows : (() => { try { const saved = JSON.parse(localStorage.getItem(LS_TOURNAMENTS) || 'null'); return saved ? tournamentRows(saved) : []; } catch (e) { return []; } })();
    const pools = { major: [], elite: [], regular: [], bounty: [] };
    source.forEach(row => { const tier = tournamentBucket(row.tier); if (pools[tier]) pools[tier].push(row); });
    const indexes = { major: 0, elite: 0, regular: 0, bounty: 0 };
    const usedNames = new Set();
    const year = 2026 + (Number(seasonState.currentSeason || 1) - 1);
    const currentIndex = Math.max(1, Number(seasonState.tournamentIndex) || 1);
    const active = typeof currentTournament !== 'undefined' && currentTournament && !currentTournament.completed;
    let changed = 0;
    seasonState.seasonSchedule.forEach((step, i) => {
      if (!step || i < currentIndex || (active && i === currentIndex)) return;
      let tier = step.type === 'major' ? 'major' : step.type === 'elite' ? 'elite' : 'regular';
      let pool = pools[tier] || [];
      // Bounty events can use a compatible elite slot without changing the event's tier identity.
      if (tier === 'elite' && pools.bounty.length && (step.format === 'bounty' || /bounty/i.test(step.name || ''))) { tier = 'bounty'; pool = pools.bounty; }
      if (!pool.length) return;
      const start = (Number(seasonState.currentSeason || 1) - 1 + indexes[tier]) % pool.length;
      let row = null;
      for (let n = 0; n < pool.length; n++) {
        const candidate = pool[(start + n) % pool.length];
        const base = cleanYear(candidate.name);
        const candidateName = `${base} ${year}`;
        if (!usedNames.has(norm(candidateName))) { row = candidate; indexes[tier]++; break; }
      }
      if (!row) return;
      const baseName = cleanYear(row.name);
      step.name = `${baseName} ${year}`;
      applyMetaFields(step, row);
      usedNames.add(norm(step.name));
      changed++;
    });
    if (changed && typeof saveSeasonState === 'function') { try { saveSeasonState(); } catch (e) {} }
    return changed;
  }
  function applyMetaToParallelSchedule() {
    if (typeof seasonState === 'undefined' || !Array.isArray(seasonState.parallelSchedule)) return 0;
    let changed = 0;
    seasonState.parallelSchedule.forEach(event => {
      if (!event || event.status !== 'scheduled' || Number(event.startMs) <= Date.now()) return;
      const meta = metaForEvent(event.name); if (!meta) return;
      applyMetaFields(event, meta);
      if (typeof window.v21RebuildParallelEvent === 'function') {
        try { if (window.v21RebuildParallelEvent(event)) changed++; } catch (e) { console.warn('[v59] rebuild parallel event', e); }
      } else changed++;
    });
    return changed;
  }

  function applyTournamentDatabase(data) {
    if (!isObject(data)) throw new Error('Файл базы турниров должен содержать JSON-объект.');
    const rows = tournamentRows(data);
    if (!rows.length) throw new Error('Не найдены турниры. Ожидается tournaments[] или массивы major/elite/regular/tier2/tier3.');
    const buckets = { major: [], elite: [], regular: [], bounty: [], weak: [] };
    const parallel = { tier2: [], tier3: [], academy: [] };
    rows.forEach(row => {
      const bucket = tournamentBucket(row.tier);
      if (bucket === 'tier2' || bucket === 'tier3' || bucket === 'academy') parallel[bucket].push(String(row.name).trim());
      else if (bucket === 'bounty') buckets.bounty.push(String(row.name).trim());
      else if (buckets[bucket]) buckets[bucket].push(String(row.name).trim());
      const k = norm(cleanYear(row.name));
      if (k) tournamentMeta[k] = { ...row, name: String(row.name).trim() };
    });
    Object.entries(buckets).forEach(([k, values]) => { if (Array.isArray(TOUR_DATABASE[k])) uniqPush(TOUR_DATABASE[k], values); });
    try { window.CS2ParallelTournamentPools?.extend?.(parallel); } catch (e) { console.warn('[v59] parallel pools', e); }
    try { localStorage.setItem(LS_TOURNAMENTS, JSON.stringify({ version: 1, tournaments: rows, parallel, meta: tournamentMeta })); } catch (e) { console.warn('[v59] tournament catalog storage', e); }
    const tier1Updated = applyImportedTier1Schedule(rows);
    const parallelUpdated = applyMetaToParallelSchedule();
    try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (e) {}
    try { window.HS?.invalidate?.(); window.HS?.render?.(); } catch (e) {}
    return { total: rows.length, major: buckets.major.length, elite: buckets.elite.length, tier1: buckets.regular.length, tier2: parallel.tier2.length, tier3: parallel.tier3.length, academy: parallel.academy.length, scheduled: tier1Updated + parallelUpdated };
  }
  function applyStoredDatabases() {
    // Inject custom data into the source pools on every boot. Current career rosters are not overwritten here.
    try {
      const savedR = JSON.parse(localStorage.getItem(LS_ROSTERS) || 'null');
      if (savedR?.rosters) Object.entries(savedR.rosters).forEach(([name, roster]) => { if (Array.isArray(roster) && roster.length >= 5) TEAM_ROSTER_2026[name] = roster.slice(0, 5); });
      if (savedR?.meta) Object.entries(savedR.meta).forEach(([nick, meta]) => updatePlayerMeta(nick, meta));
    } catch (e) {}
    try {
      const savedT = JSON.parse(localStorage.getItem(LS_TOURNAMENTS) || 'null');
      if (savedT) {
        const rows = tournamentRows(savedT);
        const b = { major: [], elite: [], regular: [], bounty: [], weak: [] }, p = { tier2: [], tier3: [], academy: [] };
        rows.forEach(r => { const k = tournamentBucket(r.tier); if (p[k]) p[k].push(r.name); else if (b[k]) b[k].push(r.name); });
        Object.entries(b).forEach(([k,v]) => { if (Array.isArray(TOUR_DATABASE[k])) uniqPush(TOUR_DATABASE[k], v); });
        window.CS2ParallelTournamentPools?.extend?.(p);
        if (savedT.meta) Object.assign(tournamentMeta, savedT.meta);
        // Current calendar is left intact except for future, not-yet-started imported events.
      }
    } catch (e) { console.warn('[v59] saved catalog load', e); }
    try { applyImportedTier1Schedule(); applyMetaToParallelSchedule(); } catch (e) { console.warn('[v59] custom schedule restore', e); }
  }
  function downloadTemplate(kind) {
    const templates = {
      rosters: { version: 1, type: 'cs2-rosters', asOf: '2026-11-01', teams: [
        { name: 'Team Spirit', pts: 1020, country: 'RU', style: 'Tactical', coach: { name: 'hally', flag: '🇷🇺' }, roster: [
          { nick: 'sh1ro', realName: 'Dmitry Sokolov', age: 25, country: 'RU', language: 'Russian', role: 'AWPer', skill: 93 }, 'magixx', 'tN1R', 'zont1x', 'donk'
        ] }
      ], players: { sh1ro: { realName: 'Dmitry Sokolov', age: 25, country: 'RU', role: 'AWPer', skill: 93 } } },
      tournaments: { version: 1, type: 'cs2-tournaments', asOf: '2026-11-01', tournaments: [
        { name: 'IEM Katowice', year: 2027, tier: 'S-Tier', organizer: 'ESL', format: 'double', size: 16, prize: 1000000, city: 'Katowice', country: 'PL' },
        { name: 'PGL Major', year: 2027, tier: 'Major', organizer: 'PGL', format: 'swiss', size: 32, prize: 1250000 },
        { name: 'CCT Europe Series', tier: 'Tier-2', organizer: 'CCT', format: 'single', size: 16 },
        { name: 'Entry League', tier: 'Tier-3', organizer: 'Entry League', format: 'swiss', size: 16 }
      ] }
    };
    const blob = new Blob([JSON.stringify(templates[kind], null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = kind === 'rosters' ? 'CS2Manager-rosters-template.json' : 'CS2Manager-tournaments-template.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  async function importFile(kind, selection) {
    const files = selection && typeof selection.text === 'function' ? [selection] : Array.from(selection || []).filter(f => f && typeof f.text === 'function');
    if (!files.length) return;
    try {
      status(files.length === 1 ? `Читаю ${files[0].name}…` : `Объединяю ${files.length} файлов базы…`);
      const parsed = await Promise.all(files.map(readDataFile));
      const data = combineImportParts(parsed);
      const applyExisting = $('v59-apply-rosters-page')?.checked ?? $('v59-apply-rosters')?.checked ?? false;
      const addNew = $('v59-add-teams-page')?.checked ?? $('v59-add-teams')?.checked ?? true;
      const result = kind === 'rosters' ? applyRosterDatabase(data, { applyExisting, addNew }) : applyTournamentDatabase(data);
      const summary = kind === 'rosters'
        ? `База составов (${files.length} файл(ов)): найдено ${result.total}, добавлено новых команд ${result.created}, обновлено существующих ростеров ${result.imported}, оставлено без перезаписи ${result.preserved}. ${result.skipped.length ? 'Пропущено: ' + result.skipped.join('; ') : ''}`
        : `База турниров (${files.length} файл(ов)): ${result.total}. Major ${result.major}, S-Tier ${result.elite}, Tier-1 ${result.tier1}, Tier-2 ${result.tier2}, Tier-3 ${result.tier3}, академии ${result.academy}. Новые названия попадут в генерацию будущих сезонов.`;
      status(summary, 'ok');
    } catch (e) { console.error('[v59 import]', e); status(`Импорт не выполнен: ${e.message || e}`, 'error'); }
  }
  window.v59ImportRosters = file => importFile('rosters', file);
  window.v59ImportTournaments = file => importFile('tournaments', file);
  window.v59DownloadTemplate = downloadTemplate;
  window.CS2_CUSTOM_TOURNAMENT_META = tournamentMeta;

  // Coach uniqueness: keep real assigned staff where possible; resolve duplicated career-generated coaches deterministically.
  const INITIALS = ['A.','B.','C.','D.','E.','F.','I.','J.','K.','L.','M.','N.','O.','P.','R.','S.','T.','V.','Y.','Z.'];
  const SURNAMES = ['Andersson','Berg','Petrov','Ivanov','Kovac','Nielsen','Larsen','Keller','Muller','Schmidt','Novak','Horvat','Popov','Volkov','Smirnov','Morozov','Kuznetsov','Sokolov','Pavlov','Fedorov','Markovic','Jovanovic','Silva','Costa','Santos','Almeida','Ribeiro','Garcia','Lopez','Martinez','Fernandez','Torres','Dubois','Moreau','Laurent','Martin','Bernard','Lefevre','Rossi','Bianchi','Romano','Ricci','Svensson','Lind','Hansen','Johansson','Holm','Virtanen','Korhonen','Laine','Ozdemir','Yilmaz','Kaya','Demir','Chen','Wang','Liu','Zhang','Kim','Park','Tanaka','Sato','Choi','Reyes','Mendoza','Cruz','Johnson','Miller','Wilson','Brown','Taylor','Walker','Young','King','Scott'];
  function hash(s) { let h = 2166136261 >>> 0; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function generatedCoach(team, used) {
    const seed = hash(team.name || 'team');
    for (let i = 0; i < INITIALS.length * SURNAMES.length; i++) {
      const j = (seed + i * 37) % (INITIALS.length * SURNAMES.length);
      const name = `${INITIALS[Math.floor(j / SURNAMES.length)]} ${SURNAMES[j % SURNAMES.length]}`;
      if (!used.has(norm(name))) return { name, flag: (typeof getTeamFlag === 'function' ? getTeamFlag(team.name) : '🌍'), generated: true };
    }
    const suffix = (seed % 9000) + 1000;
    return { name: `Coach ${team.name} ${suffix}`, flag: '🌍', generated: true };
  }
  function ensureUniqueCoaches() {
    if (typeof teams === 'undefined' || !Array.isArray(teams)) return { changed: 0, duplicates: 0 };
    const list = teams.slice().sort((a, b) => {
      const ac = typeof COACHES_2026 !== 'undefined' && COACHES_2026[a.name] ? 1 : 0;
      const bc = typeof COACHES_2026 !== 'undefined' && COACHES_2026[b.name] ? 1 : 0;
      return bc - ac || (Number(b.pts) || 0) - (Number(a.pts) || 0) || String(a.name).localeCompare(String(b.name)); // v84: свободные реальные тренеры — сначала сильным командам
    });
    const used = new Set(), duplicates = new Set(); let changed = 0;
    list.forEach(team => {
      if (!team) return;
      // v99: «без тренера» (v87: name '—', none) — осознанное состояние, а не пропуск; иначе каждый saveTeams
      // заново «чинил» 42 клуба и писал в localStorage ещё ~1 МБ.
      if (team.coach && team.coach.none) return;
      let coach = team.coach && typeof team.coach === 'object' ? team.coach : null;
      const placeholder = !coach || !String(coach.name || '').trim() || /^(?:coach|—|unknown|tbd)$/i.test(String(coach.name).trim());
      let name = placeholder ? '' : String(coach.name).trim();
      if (name && !used.has(norm(name))) { used.add(norm(name)); return; }
      if (name) duplicates.add(norm(name));
      const official = typeof COACHES_2026 !== 'undefined' ? COACHES_2026[team.name] : null;
      if (official?.name && !used.has(norm(official.name))) coach = { ...official };
      else coach = (window.CS2Coaches && window.CS2Coaches.pick(team)) || generatedCoach(team, used);
      team.coach = coach;
      used.add(norm(coach.name)); changed++;
    });
    if (changed) { try { localStorage.setItem('cs2_season_teams_v61', JSON.stringify(teams)); } catch (e) {} }
    return { changed, duplicates: duplicates.size };
  }
  window.v59EnsureUniqueCoaches = ensureUniqueCoaches;
  window.v59CoachAudit = () => { const m = new Map(); (typeof teams !== 'undefined' ? teams : []).forEach(t => { const n = norm(t.coach?.name); if (n) m.set(n, (m.get(n) || 0) + 1); }); return [...m.entries()].filter(x => x[1] > 1); };

  // Fix legacy fallback that referenced an undeclared REGEN_COACH_POOL.
  if (typeof window.generateCoach === 'function' && !window.generateCoach.__v59Safe) {
    const safeGenerateCoach = function (teamName) {
      const official = typeof COACHES_2026 !== 'undefined' ? COACHES_2026[teamName] : null;
      const used = new Set((typeof teams !== 'undefined' ? teams : []).filter(t => t.name !== teamName).map(t => norm(t.coach?.name || '')).filter(Boolean));
      return official && !used.has(norm(official.name)) ? { ...official } : generatedCoach({ name: teamName }, used);
    };
    safeGenerateCoach.__v59Safe = true; window.generateCoach = safeGenerateCoach; try { generateCoach = safeGenerateCoach; } catch (e) {}
  }

  // Apply organizer/format/size metadata to events generated from the imported catalog.
  if (typeof window.generateDynamicSeasonSchedule === 'function' && !window.generateDynamicSeasonSchedule.__v59Meta) {
    const originalSchedule = window.generateDynamicSeasonSchedule;
    const wrappedSchedule = function (...args) {
      const result = originalSchedule.apply(this, args);
      try { applyImportedTier1Schedule(); } catch (e) { console.warn('[v59] custom Tier-1 schedule', e); }
      try { (seasonState.seasonSchedule || []).forEach(step => { if (step) applyMetaFields(step, metaForEvent(step.name)); }); }
      catch (e) { console.warn('[v59] tournament metadata attach', e); }
      return result;
    };
    wrappedSchedule.__v59Meta = true; window.generateDynamicSeasonSchedule = wrappedSchedule; try { generateDynamicSeasonSchedule = wrappedSchedule; } catch (e) {}
  }

  // Restore custom tournament pools and roster baselines before future seasons are generated.
  applyStoredDatabases();
  const coachFix = ensureUniqueCoaches();
  if (coachFix.changed) console.info(`[v59] уникализированы тренеры: ${coachFix.changed}`);

  // Fill a missing/duplicate generated coach on coach changes and newly created teams.
  if (typeof window.maybeTransferCoach === 'function' && !window.maybeTransferCoach.__v59Unique) {
    const old = window.maybeTransferCoach;
    const wrapped = function (...args) { const result = old.apply(this, args); ensureUniqueCoaches(); return result; };
    wrapped.__v59Unique = true; window.maybeTransferCoach = wrapped; try { maybeTransferCoach = wrapped; } catch (e) {}
  }
  if (typeof window.addTeam === 'function' && !window.addTeam.__v59Unique) {
    const old = window.addTeam;
    const wrapped = function (...args) { const result = old.apply(this, args); ensureUniqueCoaches(); return result; };
    wrapped.__v59Unique = true; window.addTeam = wrapped; try { addTeam = wrapped; } catch (e) {}
  }

  // Match portrait files that contain a numeric prefix and a player's real name/nickname.
  // The v31 matcher is patched in-place in that module; this section only exposes an audit hook.
  if (typeof window.saveTeams === 'function' && !window.saveTeams.__v59CoachSafe) {
    const originalSaveTeams = window.saveTeams;
    const wrappedSaveTeams = function (...args) { ensureUniqueCoaches(); return originalSaveTeams.apply(this, args); };
    wrappedSaveTeams.__v59CoachSafe = true; window.saveTeams = wrappedSaveTeams; try { saveTeams = wrappedSaveTeams; } catch (e) {}
  }
  window.v59DataImportInfo = () => ({ rosterDB: !!localStorage.getItem(LS_ROSTERS), tournamentDB: !!localStorage.getItem(LS_TOURNAMENTS), coachDuplicates: window.v59CoachAudit(), tournamentPools: window.CS2ParallelTournamentPools?.list?.() || null });
})();
