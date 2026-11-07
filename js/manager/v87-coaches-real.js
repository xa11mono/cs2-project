/* v87 — только реальные тренеры.
   Раньше, когда на рынке не было свободного тренера, игра придумывала имя («E. Chen», «K. Taylor»), а тренерами
   становились и выдуманные игроки после завершения карьеры. Теперь:
     • у команды либо реальный тренер (официальный состав штаба, известный свободный тренер, реальный ветеран
       сцены после завершения карьеры), либо «—» — без тренера;
     • выдуманные тренеры на старте и в старых сохранениях снимаются;
     • в пул тренеров попадают только реальные игроки; клуб без тренера раз в неделю пробует нанять реального. */
(function () {
  'use strict';
  const W = window, lc = s => String(s || '').toLowerCase();
  const NONE = () => ({ name: '—', flag: '', none: true, generated: true });
  // реальные тренеры без клуба на старте сезона — дополнение к списку v84
  const EXTRA_REAL = [['HUNDEN', 'DK'], ['Hooch', 'RU'], ['Bubzkji', 'DK'], ['tonyblack', 'RU'], ['Sonic', 'ZA'], ['dephh', 'GB'], ['Zeus', 'UA'], ['kuben', 'PL']];
  const ccFlag = cc => /^[A-Z]{2}$/.test(cc || '') ? String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0))) : '🌍';
  const official = () => (typeof COACHES_2026 !== 'undefined' && COACHES_2026) || {};
  function realPerson(name) {
    const n = String(name || ''); if (!n || n === '—') return false;
    if (Object.values(official()).some(c => lc(c && c.name || c) === lc(n))) return true;
    if (EXTRA_REAL.some(([x]) => lc(x) === lc(n))) return true;
    try { if (W.V33Reserve && W.V33Reserve.isReal(n)) return true; } catch (e) {}
    try { if (typeof PLAYER_META_2026 !== 'undefined' && PLAYER_META_2026[n]) return true; } catch (e) {}
    return !!(W.CS2_EMDB_2026 && W.CS2_EMDB_2026.players && W.CS2_EMDB_2026.players[n]);
  }
  const fakeCoach = c => !!c && !c.none && (c.generated || /^[A-Z]\. [A-Z][a-z]+$|^Coach /.test(String(c.name || '')));
  function sweep() {
    if (typeof teams === 'undefined' || !Array.isArray(teams) || !W.CS2Coaches) return;
    const st = W.CS2Coaches.state && W.CS2Coaches.state();
    if (st) {
      if (!st.v87extra) { st.v87extra = 1; const used = new Set(teams.map(t => lc(t.coach && t.coach.name)));
        EXTRA_REAL.forEach(([n, cc]) => { if (!used.has(lc(n)) && !st.pool.some(x => lc(x.name) === lc(n))) st.pool.push({ name: n, flag: ccFlag(cc), cc, from: 'real', at: 0 }); }); }
      // выдуманные игроки, завершившие карьеру, не становятся тренерами
      st.pool = (st.pool || []).filter(x => x && (x.from === 'real' || realPerson(x.name)));
    }
    let n = 0;
    teams.forEach(t => { if (fakeCoach(t.coach)) { t.coach = NONE(); n++; } });
    if (n) { try { localStorage.setItem('cs2_season_teams_v61', JSON.stringify(teams)); } catch (e) {} }
  }
  function install() {
    if (!W.CS2Coaches || W.CS2Coaches.__v87) return !!W.CS2Coaches;
    const pick = W.CS2Coaches.pick;
    // уникализация тренеров (v59) берёт W.CS2Coaches.pick(team) || выдуманное имя — пустой пул теперь даёт «без тренера»
    W.CS2Coaches.pick = function (team) { sweep(); return pick.call(this, team) || NONE(); };
    W.CS2Coaches.__v87 = true;
    const gen = function (teamName) { const o = official()[teamName]; return o ? { ...(typeof o === 'string' ? { name: o, flag: '🌍' } : o) } : NONE(); };
    gen.__v59Safe = true; W.generateCoach = gen; try { generateCoach = gen; } catch (e) {}
    return true;
  }
  const t = setInterval(() => { if (install()) { clearInterval(t); sweep(); } }, 500);
  (globalThis.CS2Loop?.every || ((f, ms) => setInterval(f, ms)))(() => { try { sweep(); } catch (e) {} }, 2000);
  W.CS2RealCoaches = { sweep, realPerson };
})();
