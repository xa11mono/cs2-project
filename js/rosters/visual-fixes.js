/* v39 visual/roster hotfixes. Idempotent and safe for unrelated user transfers. */
(() => {
  'use strict';
  const norm = v => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const allTeams = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
  const findTeam = () => allTeams().find(t => /falcons/i.test(String(t?.name || '')));
  const isBench = p => ['BENCH','RESERVE'].includes(String(p?.status || '').toUpperCase());
  const findPlayer = (nick, target) => {
    const key = norm(nick);
    const local = (target?.players || []).find(p => norm(p?.nick) === key);
    if (local) return local;
    for (const t of allTeams()) {
      const p = (t.players || []).find(x => norm(x?.nick) === key);
      if (p) return p;
    }
    const free = (typeof transferState !== 'undefined' && transferState) ? transferState.freeAgents : null;
    const found = Array.isArray(free) ? free.find(p => norm(p?.nick) === key) : null;
    if (found) return found;
    try { if (typeof createPlayerFromNick === 'function') return createPlayerFromNick(target, nick, (target?.players || []).length); } catch (_) {}
    const meta = window.CS2_EMDB_2026?.players?.[nick] || {};
    return { nick, realName: meta.realName || '', age: meta.age || 20, country: meta.country || '', nationality: meta.nationality || '', photo: meta.photo || '', role: meta.role || 'Rifler', firepower: meta.skill || 75, tacticalIQ: meta.skill || 75, clutch: meta.skill || 75, utility: meta.skill || 75, flag: meta.country || '🌍' };
  };
  function fixFalconsRoster() {
    const t = findTeam();
    if (!t || !Array.isArray(t.players)) return false;
    const active = t.players.filter(p => p?.nick && !isBench(p));
    const hasKyxsan = active.some(p => norm(p.nick) === 'kyxsan');
    const iglCount = active.filter(p => /^(igl|in.?game leader)$/i.test(String(p.role || '').trim())).length;
    const state = (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
    // v84: проверяем при каждой загрузке — импорт ростеров мог снова вернуть kyxsan (флаг «уже исправлено» больше не блокирует)
    if (state?.v39FalconsRosterFixed && !hasKyxsan) return true;
    // Do not overwrite a manually changed Falcons roster unless the imported conflict is present.
    if (!hasKyxsan && iglCount < 2) return false;

    const desired = [
      ['karrigan', 'IGL'],
      ['NiKo', 'Rifler'],
      ['TeSeS', 'Support'],
      ['m0NESY', 'AWPer'],
      ['kyousuke', 'Rifler']
    ];
    const chosen = desired.map(([nick, role], idx) => {
      const p = findPlayer(nick, t) || {};
      p.nick = nick;
      p.role = role;
      p.status = 'STARTER';
      const meta = window.CS2_EMDB_2026?.players?.[nick];
      if (meta) {
        if (meta.realName) p.realName = meta.realName;
        if (meta.age) p.age = window.cs2MetaAge ? window.cs2MetaAge(meta.age) : meta.age;
        if (meta.country) { p.country = meta.country; p.flag = meta.country; }
        if (meta.nationality) p.nationality = meta.nationality;
        if (meta.photo) p.photo = meta.photo;
        if (meta.potential) p.potential = meta.potential;
      }
      return p;
    });
    const starterKeys = new Set(chosen.map(p => norm(p.nick)));
    // If a saved NiKo/player object was found on another roster, move that exact object rather than duplicate it.
    for (const other of allTeams()) {
      if (other === t || !Array.isArray(other.players)) continue;
      other.players = other.players.filter(p => !starterKeys.has(norm(p?.nick)));
    }
    const bench = t.players.filter(p => p?.nick && isBench(p) && !starterKeys.has(norm(p.nick)));
    t.players = [...chosen, ...bench];
    t.rosterSource = 'V39_FALCONS_CORRECTED';
    t.rosterUpdatedAt = '2026-10-31';
    t.rosterLastChange = t.rosterLastChange || 'V39 EMDB roster correction';

    // Do not leave a player assigned to Falcons simultaneously in the free-agent pool.
    if (typeof transferState !== 'undefined' && transferState && Array.isArray(transferState.freeAgents)) {
      transferState.freeAgents = transferState.freeAgents.filter(p => !starterKeys.has(norm(p?.nick)));
    }
    if (state) state.v39FalconsRosterFixed = true;
    try { if (typeof saveTeams === 'function') saveTeams(); } catch (_) {}
    try { if (typeof saveTransferState === 'function') saveTransferState(); } catch (_) {}
    try { if (typeof saveSeasonState === 'function') saveSeasonState(); } catch (_) {}
    console.info('[v39] corrected Team Falcons roster: karrigan / NiKo / TeSeS / m0NESY / kyousuke; kyxsan removed.');
    return true;
  }
  window.CS2V39Fixes = { fixFalconsRoster };
  // Some saves load transfer/team state after the manager bootstrap; retry safely.
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (fixFalconsRoster() || tries >= 12) clearInterval(timer);
  }, 350);
  // v84: поздние проверки — импорт сохранения/базы может прийти позже первых секунд
  [8000, 20000, 45000].forEach(ms => setTimeout(() => { try { fixFalconsRoster(); } catch (e) {} }, ms));
})();
