/* v89 — честный рейтинг и бережное отношение к звёздам.

   РЕЙТИНГ (js/competition/vrs.js, js/competition/tiers.js)
   • Значимость фонового турнира (pointsMult: Tier-2 — 0.35, академии — 0.18, Tier-3 — 0.12) теперь входит в вес
     личных встреч. Раньше она записывалась в расписание, но при начислении VRS не использовалась.
   • Личные встречи — лучшие 12 побед и худшие 12 поражений за полгода, а не сумма всех матчей; плюс от побед на
     Tier-2/3, академиях и квалификациях — не больше 40 очков.
   • Статус Tier-1/2/3: пропущенные при перемотке недели больше не заполняются текущим местом; при перемотке замер
     делается каждый игровой день.

   ТРАНСФЕРЫ (js/rosters/market.js, js/rosters/stature.js)
   • Звезда (не только франшиза) не становится «слабым звеном» без явного спада (возраст 32+ со спадом формы или
     форма ≤ 88%).
   • Вес карьеры учитывает скамейку и свободных агентов, историю до 2026 года (даже если она не импортирована)
     и реальный уровень игрока из базы 2026.
   • Академия, свободные агенты, покупка и аренда сравниваются в одном списке; капитана оценивают по тактике.

   ТАКЖЕ (в своих модулях): сигнал «возраст и спад» в v34-roster-ai; призовые квалификаций и категория дивидендов
   (v25-hltv-hub, v31-career-core/ui); план тренировок ИИ по слабейшей карте (v31-career-core); фоновые турниры и
   независимая стартовая база в HLTV World Ranking (v41-career-depth, v21); настоящий Swiss 3/3 с плей-офф (v21).

   Этот файл: разовая миграция старых сохранений и ежедневный замер статуса Tier при перемотке. */
(function () {
  'use strict';
  const W = window;
  if (typeof teams === 'undefined' || typeof seasonState === 'undefined') return;
  const H = () => W.CS2VRSH2H;

  /* ---------- старые сохранения: матчи фоновых турниров — с весом турнира и пометкой «низший тир» ---------- */
  function migrateLedgers() {
    if (seasonState.v89H2H) return 0;
    const h = H(), scale = W.CS2VRSH2HScale; if (!h || typeof scale !== 'function') return 0;
    const evByName = new Map();
    (seasonState.parallelSchedule || []).forEach(ev => { if (ev && ev.name) evByName.set(String(ev.name), ev); });
    let n = 0;
    teams.forEach(t => {
      const ms = t && t.vrsLedger && Array.isArray(t.vrsLedger.matches) ? t.vrsLedger.matches : [];
      ms.forEach(m => {
        if (!m || m.sig != null) return;
        const ev = evByName.get(String(m.eventName || ''));
        if (ev) {
          m.low = h.isLowEvent(ev);
          // записано с весом v88 (квалификация 0.3, иначе 0.4 + 0.6 × вес события); новый вес — не больше pointsMult
          const qual = /qualifier|квалиф|отбор/i.test(m.eventName || '');
          const was = qual ? 0.3 : 0.4 + 0.6 * (Number(m.eventWeight) || 0), now = scale(ev);
          if (m.h2hDelta && was > 0 && now < was - 1e-6) { m.h2hDelta = Math.round(m.h2hDelta * now / was * 10) / 10; n++; }
          m.sig = now;
        } else m.low = h.isLowEntry(m);
      });
    });
    seasonState.v89H2H = 1;
    try { W.CS2VRSModel && W.CS2VRSModel.recalcAll && W.CS2VRSModel.recalcAll(); } catch (e) {}
    try { saveTeams(); saveSeasonState(); } catch (e) {}
    if (n) console.info('[v89] личные встречи фоновых турниров пересчитаны по значимости турнира:', n);
    return n;
  }

  /* ---------- статус Tier: замер и при перемотке (каждый игровой день) ---------- */
  function hookSnapshot() {
    if (typeof window.V30RankSnapshotTick !== 'function') return false; if (window.V30RankSnapshotTick.__v89) return true; CS2.patch('V30RankSnapshotTick', f => function () { const r = f.apply(this, arguments); try { W.CS2Tiers && W.CS2Tiers.weekly && W.CS2Tiers.weekly(); } catch (e) {} return r; }, { id: '__v89' });
    return true;
  }

  try { migrateLedgers(); } catch (e) { console.warn('[v89 h2h]', e); }
  if (!hookSnapshot()) { let k = 0; const iv = setInterval(() => { if (hookSnapshot() || ++k > 30) clearInterval(iv); }, 500); }
  try { W.CS2Stature && W.CS2Stature.reset && W.CS2Stature.reset(); } catch (e) {}
  W.CS2V89 = { migrateLedgers, hookSnapshot };
  console.info('[v89] VRS: вес турнира и лимит личных встреч; звёзды не уходят на скамейку без повода');
})();
