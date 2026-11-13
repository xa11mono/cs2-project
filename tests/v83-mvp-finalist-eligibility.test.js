// v83 regression: event MVP must come from an actual finalist; runner-up exception is rare.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'js/awards/trophies.js'), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

const eventId = 'major-test';
const makeLine = (rating, maps = 6) => ({
  rating, maps, kpr: 0.72, adr: 82, kast: 73, kd: 1.25, impact: 1.12, clW: 3
});
const match = (a, b, w, s, mp, extra = {}) => ({ a, b, w, s, mp, ...extra });
const baseSnap = (finalScore = [2, 1], finalMp = [['Mirage', 13, 9], ['Nuke', 10, 13], ['Inferno', 13, 11]]) => ({
  id: eventId, champion: 'Alpha',
  results: [{ n: 'Alpha', p: 1 }, { n: 'Beta', p: 2 }, { n: 'Gamma', p: 3 }, { n: 'Delta', p: 4 }],
  blocks: [{ tab: 'playoff', title: 'Плей-офф', sections: [{ title: null, rounds: [
    { title: 'Четвертьфиналы', ms: [match('Alpha', 'Delta', 'Alpha', [2, 0], [['Mirage', 13, 8], ['Nuke', 13, 9]])] },
    { title: 'Полуфиналы', ms: [match('Alpha', 'Gamma', 'Alpha', [2, 0], [['Mirage', 13, 8], ['Nuke', 13, 9]])] },
    { title: 'Финал (BO3)', ms: [match('Alpha', 'Beta', 'Alpha', finalScore, finalMp)] }
  ] }] }]
});
function buildEnv({ lines, initialAwards = {}, archiveRosters = true, rewardRegistry = false }) {
  const snap = baseSnap();
  const archive = { [eventId]: snap };
  let stored = JSON.stringify({ v: 3, p: initialAwards, seasons: [], teamAwards: [], teamTitles: [] });
  const localStorage = {
    getItem: () => stored,
    setItem: (_key, value) => { stored = value; },
    removeItem: () => { stored = null; }
  };
  const players = (prefix) => Array.from({ length: 5 }, (_, i) => ({
    nick: `${prefix}${i + 1}`, status: 'STARTER', role: 'Rifler', firepower: 90, tacticalIQ: 90, clutch: 90, utility: 90
  }));
  const teams = ['Alpha', 'Beta', 'Gamma', 'Delta'].map(name => ({ name, players: players(name[0]) }));
  // Startup reconciliation only trusts archived event lineups, never today's club rosters.
  if (archiveRosters) snap.rost = Object.fromEntries(teams.map(team => [team.name, team.players.map(p => ({ ...p }))]));
  const statPlayers = {};
  Object.entries(lines).forEach(([nick, value]) => {
    statPlayers[nick] = { nick, byEv: { [eventId]: { team: value.team, s: makeLine(value.rating, value.maps ?? 6) } } };
  });
  const window = {
    showHistory() {},
    addEventListener() {},
    dispatchEvent() {},
    hubArchiveExport: () => archive,
    hubArchivePersist() {},
    hubArchiveTier1() { return true; },
    HS: { archive: () => archive, invalidate() {}, stats: () => ({ P: statPlayers }), line: value => value }
  };
  const document = { addEventListener() {}, getElementById() { return null; } };
  const sandbox = {
    window, document, teams, localStorage, console, Date, Math,
    setTimeout: () => 1, clearTimeout() {},
    showHistory() {},
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init?.detail; }
  };
  require('./lib/project').attachKernel(sandbox);   // v144: модули расширяют функции через CS2.patch
  vm.runInNewContext(source, sandbox, { filename: 'js/awards/trophies.js' });
  if (rewardRegistry) {
    const registrySource = fs.readFileSync(path.join(__dirname, '..', 'js/awards/reward-registry.js'), 'utf8');
    vm.runInNewContext(registrySource, sandbox, { filename: 'js/awards/reward-registry.js' });
  }
  return { window, archive, teams, getAwards: () => window.twAwardsExport() };
}
function award(env) {
  env.window.twDebug.awardTournament({ name: 'Major Test', season: 1, kind: 'major', champion: 'Alpha', archiveId: eventId });
  return env.getAwards().p;
}

// A semifinalist with an absurd rating must not be eligible; final is Alpha vs Beta.
{
  const env = buildEnv({ lines: {
    A1: { team: 'Alpha', rating: 1.22 }, A2: { team: 'Alpha', rating: 1.17 }, A3: { team: 'Alpha', rating: 1.13 },
    B1: { team: 'Beta', rating: 1.16 }, G1: { team: 'Gamma', rating: 2.25 }
  }});
  const finalists = env.window.twDebug.finalInfoForEvent(eventId, 'Alpha').teams;
  assert(finalists.length === 2 && finalists.includes('Alpha') && finalists.includes('Beta') && !finalists.includes('Gamma'),
    'semifinal label must not be mistaken for the final');
  const awards = award(env);
  assert(awards.G1?.mvp?.length !== 1, 'semifinalist Gamma must not receive MVP even with a 2.25 rating');
  assert(awards.A1?.mvp?.[0]?.team === 'Alpha', 'the champion should receive MVP when no runner-up exception applies');
}

// Double-elimination finals use the Grand Final, not the upper/lower bracket finals.
{
  const env = buildEnv({ lines: {
    A1: { team: 'Alpha', rating: 1.20 }, A2: { team: 'Alpha', rating: 1.16 }, A3: { team: 'Alpha', rating: 1.12 },
    B1: { team: 'Beta', rating: 1.15 }, G1: { team: 'Gamma', rating: 2.10 }, D1: { team: 'Delta', rating: 1.05 }
  }});
  env.archive[eventId].blocks = [{ tab: 'playoff', title: 'Плей-офф', sections: [
    { title: 'Верхняя сетка', rounds: [{ title: 'Финал верхней сетки', ms: [match('Alpha', 'Delta', 'Alpha', [2, 0], [['Mirage', 13, 8], ['Nuke', 13, 7]])] }] },
    { title: 'Нижняя сетка', rounds: [{ title: 'Финал нижней сетки', ms: [match('Beta', 'Gamma', 'Beta', [2, 1], [['Mirage', 13, 8], ['Nuke', 8, 13], ['Inferno', 13, 9]])] }] },
    { title: 'Гранд-финал', rounds: [{ title: 'Гранд-финал (BO5)', ms: [match('Alpha', 'Beta', 'Alpha', [3, 2], [['Mirage', 13, 9], ['Nuke', 8, 13], ['Inferno', 13, 10], ['Ancient', 10, 13], ['Dust2', 13, 11]])] }] }
  ] }];
  const finalists = env.window.twDebug.finalInfoForEvent(eventId, 'Alpha').teams;
  assert(finalists.length === 2 && finalists.includes('Alpha') && finalists.includes('Beta') && !finalists.includes('Gamma') && !finalists.includes('Delta'),
    'double-elimination MVP eligibility must use the Grand Final pair, not upper/lower finals');
}

// The archive hook must snapshot tournament rosters before it calculates MVP.
{
  const env = buildEnv({ archiveRosters: false, lines: {
    A1: { team: 'Alpha', rating: 1.22 }, A2: { team: 'Alpha', rating: 1.17 }, A3: { team: 'Alpha', rating: 1.13 },
    B1: { team: 'Beta', rating: 1.16 }, G1: { team: 'Gamma', rating: 2.25 }
  }});
  env.window.hubArchiveTier1({ hubArchiveId: eventId, name: 'Major Test', season: 1, isMajor: true,
    participants: ['Alpha', 'Beta', 'Gamma', 'Delta'], placements: { Alpha: { place: 1 } } });
  assert(env.archive[eventId].rost?.Alpha?.length === 5 && env.archive[eventId].rost?.Beta?.length === 5,
    'the pre-award archive hook must store the participating lineups');
  const awards = env.getAwards().p;
  assert(awards.A1?.mvp?.[0]?.team === 'Alpha' && !awards.G1?.mvp?.length,
    'MVP calculation must use the newly snapshotted event rosters, not current club fallback');
}

// Runner-up can win only with an exceptional rating, no clear champion leader and a close BO3.
{
  const env = buildEnv({ lines: {
    A1: { team: 'Alpha', rating: 1.16 }, A2: { team: 'Alpha', rating: 1.13 }, A3: { team: 'Alpha', rating: 1.11 },
    B1: { team: 'Beta', rating: 1.34 }
  }});
  const awards = award(env);
  assert(awards.B1?.mvp?.[0]?.team === 'Beta', 'exceptional runner-up should win MVP in a close final without a clear champion leader');
}

// The same runner-up performance does not qualify when the champion wins the BO3 2:0.
{
  const env = buildEnv({ lines: {
    A1: { team: 'Alpha', rating: 1.16 }, A2: { team: 'Alpha', rating: 1.13 }, A3: { team: 'Alpha', rating: 1.11 },
    B1: { team: 'Beta', rating: 1.34 }
  }});
  env.archive[eventId] = baseSnap([2, 0], [['Mirage', 13, 7], ['Nuke', 13, 8]]);
  const awards = award(env);
  assert(awards.A1?.mvp?.[0]?.team === 'Alpha' && !awards.B1?.mvp?.length,
    'runner-up exception must be rejected after a decisive 2:0 final');
}

// BO1 closeness is based on round score, not the meaningless 1:0 series score.
{
  const env = buildEnv({ lines: {
    A1: { team: 'Alpha', rating: 1.16 }, A2: { team: 'Alpha', rating: 1.13 }, A3: { team: 'Alpha', rating: 1.11 },
    B1: { team: 'Beta', rating: 1.34 }
  }});
  env.archive[eventId] = baseSnap([1, 0], [['Mirage', 13, 4]],);
  env.archive[eventId].blocks[0].sections[0].rounds[2].title = 'Финал (BO1)';
  env.archive[eventId].blocks[0].sections[0].rounds[2].ms[0].bo = 1;
  const awards = award(env);
  assert(awards.A1?.mvp?.[0]?.team === 'Alpha' && !awards.B1?.mvp?.length,
    'a 13:4 BO1 final must not count as close merely because the series score is 1:0');
}

// Legacy medal for a non-finalist is removed before a new valid winner is recorded.
{
  const env = buildEnv({
    lines: {
      A1: { team: 'Alpha', rating: 1.21 }, A2: { team: 'Alpha', rating: 1.16 }, A3: { team: 'Alpha', rating: 1.12 },
      B1: { team: 'Beta', rating: 1.10 }, G1: { team: 'Gamma', rating: 1.95 }
    },
    initialAwards: { G1: { mvp: [{ id: eventId, n: 'Major Test', k: 'major', team: 'Gamma' }], ti: [], top: [], aw: [] } },
    rewardRegistry: true
  });
  const checked = env.window.twDebug.reconcileExistingMvpAwards();
  const awards = env.getAwards().p;
  assert(checked === 1, 'existing archived MVP should be included in startup reconciliation');
  assert(!awards.G1?.mvp?.some(x => x.id === eventId), 'legacy MVP for a non-finalist must be removed');
  assert(awards.A1?.mvp?.some(x => x.id === eventId), 'valid champion MVP should be assigned after invalid legacy medal is removed');
}

// Legacy event without historical finalist lineups is left untouched rather than guessed from current clubs.
{
  const env = buildEnv({
    archiveRosters: false,
    lines: { A1: { team: 'Alpha', rating: 1.22 }, G1: { team: 'Gamma', rating: 1.95 } },
    initialAwards: { G1: { mvp: [{ id: eventId, n: 'Major Test', k: 'major', team: 'Gamma' }], ti: [], top: [], aw: [] } },
    rewardRegistry: true
  });
  const checked = env.window.twDebug.reconcileExistingMvpAwards();
  assert(checked === 0 && env.getAwards().p.G1?.mvp?.some(x => x.id === eventId),
    'legacy archive without reliable roster snapshots must be skipped, not re-scored with current rosters');
}

// Startup reconciliation also replaces a finalist medal that no longer meets the runner-up exception.
{
  const env = buildEnv({
    lines: {
      A1: { team: 'Alpha', rating: 1.23 }, A2: { team: 'Alpha', rating: 1.16 }, A3: { team: 'Alpha', rating: 1.12 },
      B1: { team: 'Beta', rating: 1.28 }
    },
    initialAwards: { B1: { mvp: [{ id: eventId, n: 'Major Test', k: 'major', team: 'Beta' }], ti: [], top: [], aw: [] } }
  });
  env.window.twDebug.reconcileExistingMvpAwards();
  const awards = env.getAwards().p;
  assert(!awards.B1?.mvp?.some(x => x.id === eventId) && awards.A1?.mvp?.some(x => x.id === eventId),
    'old runner-up MVP must be recalculated when it does not meet the exceptional-rating rule');
}

// Missing event statistics must not trigger the former random OVR fallback.
{
  const env = buildEnv({ lines: {} });
  const awards = award(env);
  assert(!Object.values(awards).some(x => (x.mvp || []).some(a => a.id === eventId)),
    'no event-level performance sample means no MVP; OVR/random fallback must stay disabled');
}

console.log('v83 MVP finalist-eligibility tests passed');
