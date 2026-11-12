/* v84 — история карьер до 2026 года. При новой игре можно начать «с нуля» или «с историей»: тогда игроки
   получают реальные достижения прошлых лет — титулы Мейджоров (с составами чемпионов) и награду «Игрок года HLTV» (#1).
   Ветераны (karrigan, apEX, device…) больше не выглядят новичками без единого кубка, а легенды, завершившие
   карьеру (GeT_RiGhT, olofmeister, s1mple…), сразу попадают в Зал славы. Данные — только проверенные факты. */
(function () {
  'use strict';
  const W = window, H = W.HS;
  const ST = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
  const MAJORS = [
    ['DreamHack Winter Major 2013', 2013, 'fnatic', ['JW', 'flusha', 'pronax', 'schneider', 'Devilwalk']],
    ['EMS One Katowice Major 2014', 2014, 'Virtus.pro', ['NEO', 'TaZ', 'pashaBiceps', 'Snax', 'byali']],
    ['ESL One Cologne Major 2014', 2014, 'Ninjas in Pyjamas', ['GeT_RiGhT', 'f0rest', 'friberg', 'Xizt', 'Fifflaren']],
    ['DreamHack Winter Major 2014', 2014, 'Team LDLC', ['kennyS', 'shox', 'Happy', 'NBK', 'SmithZz']],
    ['ESL One Katowice Major 2015', 2015, 'fnatic', ['olofmeister', 'flusha', 'JW', 'KRiMZ', 'pronax']],
    ['ESL One Cologne Major 2015', 2015, 'fnatic', ['olofmeister', 'flusha', 'JW', 'KRiMZ', 'pronax']],
    ['DreamHack Cluj-Napoca Major 2015', 2015, 'Team EnVyUs', ['Happy', 'kennyS', 'apEX', 'NBK', 'DEVIL']],
    ['MLG Columbus Major 2016', 2016, 'Luminosity', ['FalleN', 'fer', 'coldzera', 'TACO', 'fnx']],
    ['ESL One Cologne Major 2016', 2016, 'SK Gaming', ['FalleN', 'fer', 'coldzera', 'TACO', 'fox']],
    ['ELEAGUE Major Atlanta 2017', 2017, 'Astralis', ['device', 'dupreeh', 'Xyp9x', 'gla1ve', 'Kjaerbye']],
    ['PGL Major Kraków 2017', 2017, 'Gambit', ['Zeus', 'Hobbit', 'mou', 'Dosia', 'AdreN']],
    ['ELEAGUE Major Boston 2018', 2018, 'Cloud9', ['Skadoodle', 'Stewie2K', 'tarik', 'RUSH', 'autimatic']],
    ['FACEIT Major London 2018', 2018, 'Astralis', ['device', 'dupreeh', 'Xyp9x', 'gla1ve', 'Magisk']],
    ['IEM Katowice Major 2019', 2019, 'Astralis', ['device', 'dupreeh', 'Xyp9x', 'gla1ve', 'Magisk']],
    ['StarLadder Major Berlin 2019', 2019, 'Astralis', ['device', 'dupreeh', 'Xyp9x', 'gla1ve', 'Magisk']],
    ['PGL Major Stockholm 2021', 2021, 'NAVI', ['s1mple', 'electronic', 'Perfecto', 'b1t', 'Boombl4']],
    ['PGL Major Antwerp 2022', 2022, 'FaZe', ['karrigan', 'rain', 'broky', 'Twistzz', 'ropz']],
    ['IEM Rio Major 2022', 2022, 'Outsiders', ['Jame', 'qikert', 'FL1T', 'fame', 'n0rb3r7']],
    ['BLAST.tv Paris Major 2023', 2023, 'Team Vitality', ['apEX', 'ZywOo', 'dupreeh', 'Magisk', 'Spinx']],
    ['PGL Major Copenhagen 2024', 2024, 'NAVI', ['Aleksib', 'iM', 'b1t', 'jL', 'w0nderful']],
    ['Perfect World Shanghai Major 2024', 2024, 'Team Spirit', ['chopper', 'donk', 'zont1x', 'sh1ro', 'magixx']],
    ['BLAST.tv Austin Major 2025', 2025, 'Team Vitality', ['apEX', 'ZywOo', 'flameZ', 'mezii', 'ropz']]
  ];
  // Крупные турниры S-Tier (кроме Мейджоров) — только те, где победитель и состав известны точно
  const ELITE = [
    ['ESL One Cologne 2018', 2018, 'NAVI', ['s1mple', 'electronic', 'Zeus', 'Edward', 'flamie']],
    ['ESL One Cologne 2019', 2019, 'Team Liquid', ['NAF', 'Twistzz', 'EliGE', 'nitr0', 'Stewie2K']],
    ['IEM Katowice 2020', 2020, 'NAVI', ['s1mple', 'electronic', 'flamie', 'Boombl4', 'Perfecto']],
    ['IEM Katowice 2021', 2021, 'Gambit', ['Ax1Le', 'Hobbit', 'interz', 'sh1ro', 'nafany']],
    ['IEM Katowice 2022', 2022, 'FaZe', ['karrigan', 'rain', 'Twistzz', 'broky', 'ropz']],
    ['IEM Cologne 2022', 2022, 'FaZe', ['karrigan', 'rain', 'Twistzz', 'broky', 'ropz']],
    ['IEM Katowice 2023', 2023, 'G2', ['huNter-', 'NiKo', 'm0NESY', 'HooXi', 'jks']],
    ['IEM Cologne 2023', 2023, 'FaZe', ['karrigan', 'rain', 'ropz', 'broky', 'frozen']],
    ['IEM Katowice 2024', 2024, 'Team Spirit', ['chopper', 'donk', 'zont1x', 'sh1ro', 'magixx']],
    ['IEM Katowice 2025', 2025, 'Team Vitality', ['apEX', 'ZywOo', 'flameZ', 'mezii', 'ropz']]
  ];
  const POTY = [[2013, 'GeT_RiGhT'], [2014, 'GeT_RiGhT'], [2015, 'olofmeister'], [2016, 'coldzera'], [2017, 'coldzera'], [2018, 's1mple'],
    [2019, 'ZywOo'], [2020, 'ZywOo'], [2021, 's1mple'], [2022, 's1mple'], [2023, 'ZywOo'], [2024, 'donk']];
  const CC = {'Edward': 'UA', 'flamie': 'RU', 'NAF': 'CA', 'EliGE': 'US', 'nitr0': 'US', 'Ax1Le': 'RU', 'interz': 'RU', 'nafany': 'RU', 'huNter-': 'BA', 'NiKo': 'BA', 'm0NESY': 'RU', 'HooXi': 'DK', 'jks': 'AU', 'frozen': 'SK', 'JW': 'SE', 'flusha': 'SE', 'pronax': 'SE', 'schneider': 'DE', 'Devilwalk': 'SE', 'NEO': 'PL', 'TaZ': 'PL', 'pashaBiceps': 'PL', 'Snax': 'PL', 'byali': 'PL', 'GeT_RiGhT': 'SE', 'f0rest': 'SE', 'friberg': 'SE', 'Xizt': 'SE', 'Fifflaren': 'SE', 'kennyS': 'FR', 'shox': 'FR', 'Happy': 'FR', 'NBK': 'FR', 'SmithZz': 'FR', 'olofmeister': 'SE', 'KRiMZ': 'SE', 'apEX': 'FR', 'DEVIL': 'FR', 'FalleN': 'BR', 'fer': 'BR', 'coldzera': 'BR', 'TACO': 'BR', 'fnx': 'BR', 'fox': 'PT', 'device': 'DK', 'dupreeh': 'DK', 'Xyp9x': 'DK', 'gla1ve': 'DK', 'Kjaerbye': 'DK', 'Magisk': 'DK', 'Zeus': 'UA', 'Hobbit': 'KZ', 'mou': 'KZ', 'Dosia': 'RU', 'AdreN': 'KZ', 'Skadoodle': 'US', 'Stewie2K': 'US', 'tarik': 'US', 'RUSH': 'US', 'autimatic': 'US', 's1mple': 'UA', 'electronic': 'RU', 'Perfecto': 'RU', 'b1t': 'UA', 'Boombl4': 'RU', 'karrigan': 'DK', 'rain': 'NO', 'broky': 'LV', 'Twistzz': 'CA', 'ropz': 'EE', 'Jame': 'RU', 'qikert': 'KZ', 'FL1T': 'RU', 'fame': 'RU', 'n0rb3r7': 'RU', 'ZywOo': 'FR', 'Spinx': 'IL', 'Aleksib': 'FI', 'iM': 'RO', 'jL': 'LT', 'w0nderful': 'UA', 'chopper': 'RU', 'donk': 'RU', 'zont1x': 'UA', 'sh1ro': 'RU', 'magixx': 'RU', 'flameZ': 'IL', 'mezii': 'GB'};
  W.CS2LegacyHistory = { MAJORS, ELITE, POTY };   // v89: для веса карьеры (CS2Stature), даже если история не импортирована
  const MVP = [['BLAST.tv Paris Major 2023', 2023, 'ZywOo', 'Team Vitality'], ['PGL Major Copenhagen 2024', 2024, 'jL', 'NAVI']];
  // название команды в базе игры (если есть) — чтобы клик по команде вёл на её страницу
  const teamName = n => { try { const k = String(n).toLowerCase().replace(/[^a-z0-9]/g, ''); const t = (typeof teams !== 'undefined' ? teams : []).find(x => String(x.name).toLowerCase().replace(/[^a-z0-9]/g, '') === k || (k === 'ninjasinpyjamas' && /^nip$/i.test(x.name))); return t ? t.name : n; } catch (e) { return n; } };

  function importLegacy() {
    const R = W.RewardSystem, st = ST(); if (!R || !st) return 0;
    let n = 0;
    MAJORS.forEach(([name, y, team, roster]) => {
      const tn = teamName(team), id = 'HIST-' + name.replace(/\s+/g, '-');
      roster.forEach(nick => { if (R.addPlayerEventAchievement(nick, { id, a: null, n: name, s: 1, y, k: 'major', team: tn, legacy: true, cc: CC[nick] || '' })) n++; });
    });
    ELITE.forEach(([name, y, team, roster]) => {
      const tn = teamName(team), id = 'HIST-' + name.replace(/\s+/g, '-');
      roster.forEach(nick => { if (R.addPlayerEventAchievement(nick, { id, a: null, n: name, s: 1, y, k: 'elite', team: tn, legacy: true, cc: CC[nick] || '' })) n++; });
    });
    POTY.forEach(([y, nick]) => {
      try { if (R.addPlayerYearAward(nick, { type: 'poty', y, s: 1, legacy: true })) n++; } catch (e) {}
      try { R.addPlayerTop20?.(nick, { y, r: 1, s: 1, legacy: true }); } catch (e) {}
    });
    MVP.forEach(([name, y, nick, team]) => { try { if (R.addPlayerMvp(nick, { id: 'HIST-MVP-' + y + '-' + nick, n: name, s: 1, y, k: 'major', team: teamName(team), legacy: true })) n++; } catch (e) {} });
    st.v84Legacy = { at: Date.now(), n, v: 2 };
    try { W.saveSeasonState?.(); } catch (e) {}
    try { W.HS?.invalidate?.(); W.HS?.render?.(); } catch (e) {}
    try { W.V29News?.add?.({ cat: 'season', icon: '🏛️', imp: 6, title: 'История CS до 2026 года загружена', lead: `Игроки получили реальные достижения прошлых лет: ${MAJORS.length} Мейджоров, ${ELITE.length} крупных турниров S-Tier (IEM Katowice, IEM/ESL One Cologne) и награды «Игрок года HLTV».`, body: ['Легенды, завершившие карьеру, — в Зале славы; ветераны сцены — с кубками прошлых лет в профилях.'], tags: [] }); } catch (e) {}
    return n;
  }

  // Окно выбора при новой игре: только в самом начале первого сезона и только один раз.
  function isFreshStart() {
    const st = ST(); if (!st || st.v84LegacyChoice || st.v84Legacy) return false;
    // v84: новая игра определяется по самому сохранению: первый сезон и ещё не сыгран ни один турнир основного
    // календаря. Архив турниров и дата не учитываются — после сброса они могли остаться от прошлой игры.
    const done = (st.seasonSchedule || []).filter(e => e && (e.status === 'completed' || e.done || e.finished)).length;
    return (Number(st.currentSeason) || 1) === 1 && (Number(st.tournamentIndex) || 1) <= 1 && done === 0;
  }
  function choose(mode) {
    const st = ST(); if (!st) return;
    st.v84LegacyChoice = mode;
    if (mode === 'history') importLegacy();
    try { W.saveSeasonState?.(); } catch (e) {}
    document.getElementById('v84-legacy-modal')?.remove();
  }
  function showModal(force) {
    if ((!force && !isFreshStart()) || document.getElementById('v84-legacy-modal')) return;
    if (force && ST()?.v84Legacy) { try { W.HS?.nav?.('players'); } catch (e) {} return; }
    const box = document.createElement('div'); box.id = 'v84-legacy-modal';
    box.innerHTML = `<div class="v84-lg-card" role="dialog" aria-modal="true" aria-labelledby="v84-lg-h">
      <h2 id="v84-lg-h">Как начать карьеру?</h2>
      <p>Новая игра стартует в январе 2026 года. Можно начать с чистого листа или перенести реальную историю CS: титулы Мейджоров 2013–2025, IEM Katowice и Cologne, награды «Игрок года HLTV».</p>
      <div class="v84-lg-opts">
        <button type="button" data-lg="history"><b>С историей карьер</b><small>Ветераны — с кубками прошлых лет, легенды — в Зале славы. Рекомендуется.</small></button>
        <button type="button" data-lg="zero"><b>С нуля</b><small>У всех игроков пустые профили, история начинается в 2026 году.</small></button>
      </div>${force ? '<button type="button" class="v84-lg-close" data-lg="close">Закрыть</button>' : ''}</div>`;
    box.addEventListener('click', e => { const b = e.target.closest('[data-lg]'); if (!b) return; if (b.dataset.lg === 'close') box.remove(); else choose(b.dataset.lg); });
    document.body.appendChild(box);
  }
  setTimeout(() => showModal(false), 1800);   // v131: игра стартует быстрее (загрузка из IndexedDB) — окно выбора раньше
  // пункт в меню «Игра»: окно выбора можно открыть вручную (например, если сохранение старое)
  const addGameItem = () => { try { const m = document.querySelector('.pt-menu[data-menu="game"]'); if (m && !m.querySelector('[data-lg-open]')) m.insertAdjacentHTML('beforeend', '<button type="button" data-lg-open>История CS до 2026</button>'); } catch (e) {} };
  setTimeout(addGameItem, 1600); if (H) (H.AFTER || []).push(addGameItem);
  document.addEventListener('click', e => { if (e.target.closest?.('[data-lg-open]')) { e.preventDefault(); e.stopPropagation(); showModal(true); } }, true);
  // Для уже идущих сохранений — кнопка в Зале славы
  if (H) (H.AFTER || []).push(page => {
    try {
      const st = ST(); if (page !== 'players' || H.S.pl?.tab !== 'hof' || !st || st.v84Legacy) return;
      const root = document.getElementById('hs-page'); if (!root || root.querySelector('.v84-lg-inline')) return;
      root.insertAdjacentHTML('beforeend', `<div class="v84-lg-inline hs-box"><p>Перенести реальную историю CS до 2026 года (титулы Мейджоров 2013–2025, «Игрок года HLTV») в профили игроков?</p><button type="button" class="hs-chip on" data-lg-import>Перенести историю</button></div>`);
      root.querySelector('[data-lg-import]').addEventListener('click', () => { const s = ST(); if (s) s.v84LegacyChoice = 'history'; importLegacy(); });
    } catch (e) {}
  });
  // уже перенесённая история старой версии (только Мейджоры) дополняется турнирами S-Tier
  setTimeout(() => { const st = ST(); if (st?.v84Legacy && st.v84Legacy.v !== 2) importLegacy(); }, 5000);
  W.CS2Legacy = { importLegacy, MAJORS, ELITE, POTY, choose, isFreshStart, showModal };
})();
