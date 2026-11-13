/* v91 — профиль клубов сейва: у каждой новой игры свои бюджеты и характеры клубов, но в коридоре, привязанном к
   реальности.

   • Бюджет. У клуба есть класс богатства: богатейшие организации (Falcons — отдельно, выше всех; Vitality, NAVI, Spirit,
     G2, FaZe, Liquid, MOUZ, FURIA, BC.GAME) — всегда богатые, остальные — по уровню на старте. В каждом сейве бюджет
     выпадает случайно внутри коридора своего класса: Falcons в одной игре $6.5 млн, в другой $8.4 млн, но никогда
     $400 тыс. Раньше бюджет считался только по месту в рейтинге: всё ниже 40-го места — ровно $400 тыс.
   • Характер (ДНК, v34). База — реальная история клуба; в каждом сейве — отклонение в ограниченном коридоре: у известных
     клубов узкий (CS2Config 'profile.dnaKnown'), у остальных шире ('profile.dnaOther'). FaZe в одной игре ближе
     к молодёжи, в другой — к опыту, но клуб не превращается в свою противоположность.
   • Случайность закреплена зерном сейва (seasonState.v91Profile.seed): после перезагрузки клубы не меняются. Старые
     сохранения (клубы уже созданы) получают нулевое отклонение — их характеры и бюджеты остаются прежними. */
(function () {
  'use strict';
  const W = window;
  if (typeof seasonState === 'undefined') return;
  const C = (k, d) => (W.CS2Config ? W.CS2Config.get(k, d) : d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const norm = n => String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // класс богатства — по реальному статусу организации
  const ULTRA = ['teamfalcons'];
  const RICH = ['teamvitality', 'navi', 'teamspirit', 'g2', 'faze', 'teamliquid', 'mouz', 'furia', 'bcgame'];
  const RANGES = {   // design: коридоры бюджета на старте игры, $
    ultra: [6000000, 9000000], rich: [3500000, 6500000], top10: [2000000, 4500000], top25: [900000, 2200000], top50: [450000, 1100000], other: [300000, 700000]
  };
  function state() {
    let p = seasonState.v91Profile;
    if (!p) {
      const old = !!(seasonState.v31 && seasonState.v31.orgs && Object.keys(seasonState.v31.orgs).length) || (Number(seasonState.currentSeason) || 1) > 1;
      p = seasonState.v91Profile = { v: 1, seed: old ? 0 : (h32(String(Math.random()) + Date.now()) || 1), at: Date.now(), legacy: old };
      try { saveSeasonState(); } catch (e) {}
    }
    return p;
  }
  const u = (...k) => { const s = state().seed; return (h32(s + '|' + k.join('|')) % 100000) / 100000; };   // 0..1, детерминировано зерном сейва
  function wealthClass(name, rank) {
    const k = norm(name);
    if (ULTRA.includes(k)) return 'ultra';
    if (RICH.includes(k)) return 'rich';
    const r = Number(rank) || 99;
    return r <= 10 ? 'top10' : r <= 25 ? 'top25' : r <= 50 ? 'top50' : 'other';
  }
  // стартовый бюджет клуба в этом сейве (null — оставить прежнюю формулу: старое сохранение)
  function budget(name, rank, isAcademy) {
    if (isAcademy || !state().seed) return null;
    const cls = wealthClass(name, rank), [lo, hi] = RANGES[cls];
    return Math.round((lo + (hi - lo) * u('budget', norm(name))) / 1000) * 1000;
  }
  // характер клуба в этом сейве: база (реальная история или детерминированно по названию) ± коридор
  function dna(name, base, known) {
    if (!base || !state().seed) return base;
    const span = known ? C('profile.dnaKnown', 0.15) : C('profile.dnaOther', 0.25), out = {};
    Object.keys(base).forEach(t => { out[t] = Math.round(clamp(base[t] + (u('dna', norm(name), t) * 2 - 1) * span, 0.05, 0.95) * 100) / 100; });
    return out;
  }
  W.CS2SaveProfile = { state, budget, dna, wealthClass, RANGES };
})();
