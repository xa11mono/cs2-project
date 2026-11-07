/* v84 — место проведения турнира: город, страна (флаг) или «Онлайн · регион». Для серий Tier-1 берётся из
   справочника серий (V30Series), для Tier-2/3 и квалификаций — из этого справочника; региональные онлайн-турниры
   показывают регион по составу участников. */
(function () {
  'use strict';
  const W = window;
  const LOC = [
    [/^CIS LAN/i, 'Москва', 'RU', true], [/^BetBoom Dacha/i, 'Белград', 'RS', true], [/^Winline Insight/i, '', 'RU', false], [/^Exort/i, '', 'RU', false],
    [/^Elisa/i, 'Эспоо', 'FI', true], [/^YaLLa Compass/i, 'Абу-Даби', 'AE', true], [/^Tipsport/i, 'Прага', 'CZ', true], [/^LAN Cup Prague/i, 'Прага', 'CZ', true],
    [/^Skyesports/i, 'Мумбаи', 'IN', true], [/^Baltic Masters/i, 'Рига', 'LV', true], [/^Iberian Cup/i, 'Мадрид', 'ES', true], [/^Balkan Showdown/i, 'Белград', 'RS', true],
    [/^Nordic Championship/i, 'Копенгаген', 'DK', true], [/^Polish Championship/i, 'Варшава', 'PL', true], [/^German Pro Series/i, 'Кёльн', 'DE', true], [/^UK Masters/i, 'Лондон', 'GB', true],
    [/^Ukrainian Cup/i, '', 'UA', false], [/^Kazakhstan Open/i, 'Астана', 'KZ', true], [/^Turkish Masters/i, 'Стамбул', 'TR', true], [/^Galaxy Battle/i, '', 'EU', false],
    [/^NODWIN/i, '', 'IN', false], [/^Nordic National League/i, '', 'EU', false], [/^Regional LAN Finals/i, 'Берлин', 'DE', true],
    [/CCT|Challenger League|RES Regional|European Pro League|United21|Online Cup|Rising Series|Future Stars|Grassroots|Entry League|Academy|Qualifier|Квалиф/i, '', 'EU', false],
    [/Esports World Cup/i, 'Эр-Рияд', 'SA', true], [/Nations Cup/i, 'Эр-Рияд', 'SA', true], [/Streamers Battle Europe/i, 'Берлин', 'DE', true], [/Streamers Battle Brasil/i, 'Сан-Паулу', 'BR', true], [/Streamers Battle/i, 'Москва', 'RU', true]
  ];
  const CITY_CC = [[/катовиц|katowice|краков|krak/i, 'PL'], [/кёльн|koln|köln|cologne|гамбург/i, 'DE'], [/копенгаген|copenhagen/i, 'DK'], [/стокгольм|stockholm/i, 'SE'], [/париж|paris/i, 'FR'],
    [/рио|rio|сан-паулу/i, 'BR'], [/даллас|dallas|остин|austin|атланта|atlanta|бостон/i, 'US'], [/чэнду|chengdu|шанха|shanghai|пекин/i, 'CN'], [/мельбурн|melbourne|сидней/i, 'AU'],
    [/будапешт|budapest/i, 'HU'], [/бухарест|bucharest|клуж/i, 'RO'], [/белград|belgrade/i, 'RS'], [/сингапур|singapore/i, 'SG'], [/астана|astana/i, 'KZ'], [/лиссабон|порту|lisbon|porto/i, 'PT'],
    [/буэнос|buenos/i, 'AR'], [/мальт|malta/i, 'MT'], [/лондон|london/i, 'GB'], [/роттердам|rotterdam|амстердам/i, 'NL'], [/дубай|dubai|абу-даби/i, 'AE'], [/эр-рияд|riyadh/i, 'SA'], [/прага|prague/i, 'CZ']];
  const REG = { RU: 'СНГ', UA: 'СНГ', EU: 'Европа', IN: 'Азия' };
  function locationOf(name, ev) {
    const n = String(name || '');
    if (/Qualifier|Квалиф/i.test(n)) { const reg = /Americas|Америк/i.test(n) ? 'Америка' : /Asia|Ази/i.test(n) ? 'Азия' : /Oceania/i.test(n) ? 'Океания' : 'Европа'; return { city: '', cc: null, lan: false, region: reg }; }
    const regionGuess = () => { if (Array.isArray(ev?.v84Region) && ev.v84Region.length) return /RU|UA|KZ|BY/.test(ev.v84Region.join()) ? 'СНГ' : 'регион'; const h = LOC.find(([re]) => re.test(n)); return h && !h[3] ? (REG[h[2]] || 'Европа') : /Asia|Ази/i.test(n) ? 'Азия' : /America|Brazil|Бразил/i.test(n) ? 'Америка' : 'Европа'; };
    const meta = (() => { try { return W.V30Series?.meta?.(n) || null; } catch (e) { return null; } })();
    if (meta && meta.lan === false && !meta.city) return { city: '', cc: null, lan: false, region: regionGuess() };
    if (meta && (meta.city || meta.lan === false)) {
      const cc = (CITY_CC.find(([re]) => re.test(meta.city || '')) || [])[1] || (W.CS2World?.countryOfEvent?.(n)) || null;
      return { city: meta.city || '', cc, lan: meta.lan !== false };
    }
    const hit = LOC.find(([re]) => re.test(n.replace(/\s+20\d\d.*$/, '')) || re.test(n));
    if (hit) {
      let cc = hit[2];
      if (!hit[3] && Array.isArray(ev?.v84Region) && ev.v84Region.length) cc = ev.v84Region[0];
      return { city: hit[1], cc: cc === 'EU' ? null : cc, lan: hit[3], region: hit[3] ? '' : (REG[hit[2]] || (Array.isArray(ev?.v84Region) ? 'регион' : 'Европа')) };
    }
    const cc = W.CS2World?.countryOfEvent?.(n) || null;
    return cc ? { city: '', cc, lan: true } : null;
  }
  W.CS2EventLocation = locationOf;
})();
