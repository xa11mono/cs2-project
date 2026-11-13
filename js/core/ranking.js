/* CS2 Manager — общий рейтинг команд (места по очкам VRS, pts).

   Раньше каждый модуль считал место сам: teams.filter(...).sort((a, b) => b.pts - a.pts) — 96 копий, и в горячих
   местах (рынок, карьера) сортировка 116 команд шла на каждый вызов rankOf — тысячи раз за игровой день перемотки.
   Здесь порядок кешируется и пересчитывается, только когда изменились очки, состав списка или признак академии;
   проверка — один проход по teams без сортировки и выделения памяти. Порядок при равных очках — как у прежних копий
   (стабильная сортировка в порядке массива teams).

   CS2Rank.pro()        — профессиональные команды по местам (новый массив, его можно менять)
   CS2Rank.of(t|имя)    — место команды среди профессиональных (1…N), 0 — если нет
   CS2Rank.all()        — все команды, включая академии, по очкам */
(function () {
  'use strict';
  const W = window;
  const cache = { pro: makeCache(t => t && !t.isAcademy), all: makeCache(t => !!t) };
  function makeCache(keep) { return { keep, ref: null, snap: [], pts: [], acad: [], names: [], order: [], byTeam: new Map(), byName: new Map() }; }
  function list() { try { return typeof teams !== 'undefined' && Array.isArray(teams) ? teams : []; } catch (e) { return []; } }
  function fresh(c, arr) {
    if (c.ref !== arr || c.snap.length !== arr.length) return false;
    for (let i = 0; i < arr.length; i++) {
      const t = arr[i];
      if (t !== c.snap[i] || (t && (t.pts !== c.pts[i] || !!t.isAcademy !== c.acad[i] || t.name !== c.names[i]))) return false;
    }
    return true;
  }
  function ensure(c) {
    const arr = list();
    if (fresh(c, arr)) return c;
    c.ref = arr; c.snap = arr.slice(); c.pts = arr.map(t => t && t.pts); c.acad = arr.map(t => !!(t && t.isAcademy)); c.names = arr.map(t => t && t.name);
    c.order = arr.filter(c.keep).sort((a, b) => b.pts - a.pts);
    c.byTeam = new Map(); c.byName = new Map();
    c.order.forEach((t, i) => { c.byTeam.set(t, i + 1); if (!c.byName.has(t.name)) c.byName.set(t.name, i + 1); });
    return c;
  }
  W.CS2Rank = Object.freeze({
    pro: () => ensure(cache.pro).order.slice(),
    all: () => ensure(cache.all).order.slice(),
    of: x => { const c = ensure(cache.pro); return (typeof x === 'string' ? c.byName.get(x) : c.byTeam.get(x)) || 0; }
  });
})();
