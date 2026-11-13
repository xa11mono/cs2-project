/* v114 — единый расчёт индивидуальной силы игрока.
   Overall = постоянные четыре навыка; роль, форма, мораль, усталость и потенциал — отдельные проекции.
   Ролевые веса — проектные параметры в CS2Config, а не подтверждённая статистикой истина.
   Модуль не переписывает навыки и не мигрирует старые значения. */
(function () {
  'use strict';
  const W = window;
  const KEYS = ['firepower', 'tacticalIQ', 'clutch', 'utility'];
  const DEFAULTS = { firepower: .40, tacticalIQ: .25, clutch: .20, utility: .15 };
  const ROLES = ['IGL', 'AWPer', 'Entry-fragger', 'Rifler', 'Support', 'Lurker'];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const num = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const cfg = (key, fallback) => {
    try { return W.CS2Config ? num(W.CS2Config.get(key, fallback), fallback) : fallback; }
    catch (_) { return fallback; }
  };
  const round1 = n => Math.round(n * 10) / 10;
  function weights(role) {
    const out = {};
    KEYS.forEach(k => { out[k] = role ? cfg('power.role.' + role + '.' + k, DEFAULTS[k]) : cfg('power.base.' + k, DEFAULTS[k]); });
    if (role === 'IGL') out.leadership = cfg('power.role.IGL.leadership', .15);
    return out;
  }
  function weighted(p, w) {
    let sum = 0, total = 0;
    Object.entries(w).forEach(([k, v]) => {
      const value = k === 'leadership'
        ? clamp((num(p?.pers?.lead, 10) - 1) / 18 * 100, 0, 100)
        : clamp(num(p?.[k], 0), 0, 100);
      if (v > 0) { sum += value * v; total += v; }
    });
    return total > 0 ? sum / total : 0;
  }
  function base(p) { return round1(weighted(p, weights(null))); }
  function role(p, requestedRole) {
    const r = ROLES.includes(requestedRole || p?.role) ? (requestedRole || p.role) : 'Rifler';
    return round1(weighted(p, weights(r)));
  }
  function current(p, context) {
    if (!p) return 0;
    const ctx = context || {};
    const form = clamp(num(ctx.form, num(p.form, 100)), 50, 150);
    const morale = clamp(num(ctx.morale, num(p.morale, 80)), 0, 100);
    const fatigue = clamp(num(ctx.fatigue, num(p.fatigue, 0)), 0, 100);
    const confidence = clamp(num(ctx.confidence, num(p.conf, 60)), 0, 100);
    const delta = (form - 100) * cfg('power.current.form', .15)
      + (morale - 80) * cfg('power.current.morale', .10)
      - fatigue * cfg('power.current.fatigue', .08)
      + (confidence - 60) * cfg('power.current.confidence', .05);
    return round1(clamp(base(p) + clamp(delta, -5, 5), 0, 100));
  }
  function potential(p) {
    if (!p) return null;
    const raw = p.pot != null && p.pot !== '' && Number.isFinite(Number(p.pot)) ? Number(p.pot) : Number(p.potential);
    if (!Number.isFinite(raw)) return null;
    return round1(clamp(Math.max(base(p), raw), 0, 100));
  }
  function team(t) {
    const ps = (t?.players || []).filter(p => p && p.nick && (!p.status || !['BENCH', 'RESERVE'].includes(String(p.status).toUpperCase()))).slice(0, 5);
    if (!ps.length) return { count: 0, power: 0, currentPower: 0, roleCoverage: 0, roles: {} };
    const avg = fn => ps.reduce((s, p) => s + fn(p), 0) / ps.length;
    const roles = Object.fromEntries(ROLES.map(r => [r, ps.filter(p => p.role === r).length]));
    const needed = ['IGL', 'AWPer', 'Entry-fragger', 'Support', 'Lurker'];
    const roleCoverage = needed.reduce((n, r) => n + (roles[r] > 0 ? 1 : 0), 0) / needed.length * 100;
    return {
      count: ps.length,
      power: round1(avg(base)),
      currentPower: round1(avg(current)),
      roleCoverage: Math.round(roleCoverage),
      roles
    };
  }
  function diagnostics(p) {
    if (!p) return null;
    const b = base(p), w = weights(null);
    const parts = Object.fromEntries(KEYS.map(k => [k, round1(clamp(num(p[k], 0), 0, 100) * w[k])]));
    return {
      overall: b, role: role(p), roleName: ROLES.includes(p.role) ? p.role : 'Rifler',
      current: current(p), potential: potential(p), weights: w, contributions: parts,
      state: { form: num(p.form, 100), morale: num(p.morale, 80), fatigue: num(p.fatigue, 0), confidence: num(p.conf, 60) }
    };
  }
  // наш v114: сохраняем инструменты v101 (тренд стоимости, разовая калибровка ориентиров для новой игры, выравнивание
  // стартового VRS) — модель силы не откалибрована, и без ориентиров в новой игре капитаны снова становятся «лучшими стрелками»
  const prev = W.CS2Power || {};
  const api = Object.freeze({
    trend: prev.trend, recalibrate: prev.recalibrate, reseed: prev.reseed, target: prev.target, ANCHOR: prev.ANCHOR,
    version: 1, base, overall: base, pow: base, role, current, potential, team, diagnostics,
    weights, ROLES: Object.freeze(ROLES.slice()), KEYS: Object.freeze(KEYS.slice())
  });
  W.CS2Power = api;
  // Совместимость с v31 и старыми экранами: V.pow теперь указывает на тот же источник.
  try { if (W.V31) W.V31.pow = base; } catch (_) {}
  console.info('[v114] единая модель силы игроков подключена');
})();
