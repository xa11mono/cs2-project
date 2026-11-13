/* v114 — художественные стикеры Мейджора: детальные рамки (вырубка, двойной кант, фон с узором), городские
   символы (Кёльнский собор, «Сподек» Катовице, Эйфелева башня…), пул каллиграфических шрифтов для автографов
   и акцидентных шрифтов для турнирных стикеров. Все шрифты — Google Fonts, лицензия SIL OFL, встроены (WOFF,
   латиница) и подключаются один раз через @font-face. */
(function () {
  'use strict';
  const W = window;
  // шрифты лежат файлами в fonts/stickers/<имя>.woff (Google Fonts, SIL OFL) — браузер грузит их только по необходимости
  const FONTS = ["StkAlex", "StkAllison", "StkAllura", "StkAnton", "StkArchitect", "StkArizonia", "StkAurore", "StkBebas", "StkBirthstone", "StkBlackOps", "StkCaveat", "StkCaveatBrush", "StkCedar", "StkCinzel", "StkComing", "StkCorinthia", "StkDafoe", "StkDancing", "StkEphesis", "StkFinger", "StkFraktur", "StkGloria", "StkGochi", "StkGrace", "StkGreatVibes", "StkHaviland", "StkHerr", "StkImperial", "StkIndie", "StkItalianno", "StkJustHand", "StkKalam", "StkKaushan", "StkKing", "StkKnewave", "StkLobster", "StkMansalva", "StkMarck", "StkMarker", "StkMeddon", "StkMetal", "StkMonoton", "StkMonsieur", "StkNanum", "StkNothing", "StkOleo", "StkPacifico", "StkParis", "StkPatrick", "StkPinyon", "StkPirata", "StkRainbow", "StkReenie", "StkRighteous", "StkRockSalt", "StkRusso", "StkRye", "StkSacramento", "StkSaint", "StkSancreek", "StkSchoolbell", "StkSedgwick", "StkShadows", "StkSpray", "StkSwanky", "StkTangerine", "StkVibes", "StkWindSong", "StkYester", "StkZeyada"];
  const n2 = v => Math.round(v * 100) / 100;
  const h32 = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function ensureFonts() {
    try {
      if (typeof document === 'undefined' || document.getElementById('cs2-stk-fonts')) return;
      const css = FONTS.map(f => `@font-face{font-family:'${f}';src:url(fonts/stickers/${f}.woff) format('woff');font-display:swap}`).join('');
      const st = document.createElement('style'); st.id = 'cs2-stk-fonts'; st.textContent = css; (document.head || document.documentElement).appendChild(st);
    } catch (e) {}
  }
  ensureFonts();
  const mix = (a, b, t) => { const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

  // ---------------------------------------------------------------- шрифты
  // подписи: у каждого игрока свой почерк (по нику) — шрифт, наклон, росчерк
  const SIG = [
    ['StkDancing', 1, .0], ['StkVibes', 1.25, .02], ['StkPacifico', .82, .06], ['StkCaveat', 1.05, .0], ['StkKaushan', .9, .04],
    ['StkAllura', 1.3, .02], ['StkSacramento', 1.35, .0], ['StkMarck', 1.05, .02], ['StkAlex', 1.3, .02], ['StkParis', 1.15, .02],
    ['StkDafoe', 1.15, .04], ['StkLobster', .9, .04], ['StkArizonia', 1.25, .02], ['StkCaveatBrush', 1.05, .0], ['StkCedar', 1.1, .02],
    ['StkGochi', 1.0, .0], ['StkHerr', 1.6, .04], ['StkIndie', 1.0, .0], ['StkItalianno', 1.4, .02], ['StkKalam', .95, .0], ['StkAurore', 1.15, .02],
    ['StkKing', 1.05, .0], ['StkMeddon', .9, .02], ['StkMonsieur', 1.5, .04], ['StkSaint', 1.35, .02], ['StkNanum', 1.25, .0], ['StkNothing', 1.05, .02],
    ['StkReenie', 1.25, .0], ['StkSedgwick', 1.0, .02], ['StkShadows', 1.05, .0], ['StkYester', 1.1, .04], ['StkZeyada', 1.2, .02],
    ['StkGreatVibes', 1.25, .02], ['StkTangerine', 1.6, .02], ['StkAllison', 1.6, .02], ['StkBirthstone', 1.2, .02], ['StkCorinthia', 1.55, .02],
    ['StkHaviland', 1.5, .03], ['StkPinyon', 1.1, .02], ['StkWindSong', 1.0, .02], ['StkEphesis', 1.35, .02], ['StkImperial', 1.25, .02],
    ['StkMansalva', 1.05, 0], ['StkFinger', .82, 0], ['StkGrace', 1.1, 0], ['StkGloria', .9, 0], ['StkPatrick', 1.05, 0], ['StkArchitect', .9, 0],
    ['StkRainbow', 1.05, 0], ['StkSwanky', 1.0, 0], ['StkKnewave', .9, .02], ['StkSpray', .9, 0], ['StkComing', .9, 0], ['StkJustHand', 1.45, 0],
    ['StkMarker', .9, 0], ['StkRockSalt', .78, 0], ['StkSchoolbell', 1.05, 0]
  ];
  // турнирные стикеры: заголовки и подписи
  const DISPLAY = ['StkAnton', 'StkBebas', 'StkRusso', 'StkBlackOps', 'StkRighteous', 'StkCinzel'];

  // ---------------------------------------------------------------- городские символы (поле 100×100, низ на y≈66)
  // каждый: (f — основная заливка, d — тень/детали, l — блик) → svg
  const L = {
    cologne: (f, d, l) => { // Кёльнский собор: две готические башни, неф, мост Гогенцоллернов
      let s = '';
      for (const x of [36, 64]) {
        s += `<path d="M${x - 7} 66V34L${x - 5} 31V27L${x} 8L${x + 5} 27V31L${x + 7} 34V66z" fill="${f}"/>`;
        s += `<path d="M${x} 8L${x + 5} 27V31L${x + 7} 34V66H${x}z" fill="${d}" opacity=".45"/>`;
        for (let k = 0; k < 4; k++) s += `<path d="M${x - 3} ${40 + k * 6}V${37 + k * 6}Q${x - 1.5} ${35 + k * 6} ${x} ${37 + k * 6}V${40 + k * 6}z" fill="${d}"/><path d="M${x + 1} ${40 + k * 6}V${37 + k * 6}Q${x + 2.5} ${35 + k * 6} ${x + 4} ${37 + k * 6}V${40 + k * 6}z" fill="${d}"/>`;
        s += `<path d="M${x - 5} 27H${x + 5}M${x - 6.5} 33H${x + 6.5}" stroke="${l}" stroke-width=".7"/>`;
        for (const dx of [-6.5, 6.5]) s += `<path d="M${x + dx - 1} 34L${x + dx} 29L${x + dx + 1} 34z" fill="${f}"/>`;
      }
      s += `<path d="M43 66V44L50 38L57 44V66z" fill="${f}"/><circle cx="50" cy="48" r="3.4" fill="${d}"/><circle cx="50" cy="48" r="1.6" fill="${l}" opacity=".7"/>`;
      s += `<path d="M10 66Q22 56 34 66M66 66Q78 56 90 66" fill="none" stroke="${f}" stroke-width="2"/>`;
      return s;
    },
    katowice: (f, d, l) => // «Сподек»: летающая тарелка на опорах
      `<path d="M30 66L40 49H60L70 66H64L56 52H44L36 66z" fill="${d}"/>` +
      `<path d="M14 45Q50 26 86 45Q50 56 14 45z" fill="${f}"/><path d="M14 45Q50 56 86 45Q50 60 14 45z" fill="${d}"/>` +
      `<path d="M30 39Q50 24 70 39" fill="none" stroke="${l}" stroke-width="1"/>` + [22, 31, 41, 50, 59, 69, 78].map(x => `<path d="M${x} ${45 - Math.sin((x - 14) / 72 * Math.PI) * 9.5}V${46 + Math.sin((x - 14) / 72 * Math.PI) * 3}" stroke="${d}" stroke-width=".7"/>`).join(''),
    stockholm: (f, d, l) => { // «Тре Крунур» + шар «Глобен»
      const crown = (cx, cy, k) => `<path d="M${cx - 7 * k} ${cy}L${cx - 8 * k} ${cy - 8 * k}L${cx - 4 * k} ${cy - 4 * k}L${cx} ${cy - 10 * k}L${cx + 4 * k} ${cy - 4 * k}L${cx + 8 * k} ${cy - 8 * k}L${cx + 7 * k} ${cy}z" fill="${f}"/><rect x="${cx - 7 * k}" y="${cy}" width="${14 * k}" height="${2.4 * k}" fill="${d}"/>` + [-8, 0, 8].map(dx => `<circle cx="${cx + dx * k}" cy="${cy - (dx ? 8 : 10) * k}" r="${1.2 * k}" fill="${l}"/>`).join('');
      return `<circle cx="50" cy="56" r="13" fill="${d}"/><path d="M37 56H63M50 43V66M39 49Q50 53 61 49M39 62Q50 58 61 62" stroke="${f}" stroke-width=".6" fill="none" opacity=".7"/><rect x="30" y="64" width="40" height="2.4" fill="${f}"/>` +
        crown(50, 26, 1.1) + crown(34, 40, .9) + crown(66, 40, .9);
    },
    copenhagen: (f, d, l) => { // Нюхавн: ряд домов со щипцами и мачты лодок
      const C = ['#f4b942', '#d9534f', '#5bc0de', '#f0ad4e', '#8fbc5a', '#e8735c'];
      let s = ''; const xs = [14, 26, 37, 49, 61, 73];
      xs.forEach((x, i) => { const w = 11, top = 32 + (i % 3) * 3; s += `<path d="M${x} 62V${top + 6}L${x + w / 2} ${top}L${x + w} ${top + 6}V62z" fill="${/^#/.test(f) ? mix(C[i], f, .25) : C[i]}" stroke="${d}" stroke-width=".5"/>`;
        for (let r = 0; r < 3; r++) s += `<rect x="${x + 2}" y="${top + 9 + r * 6}" width="2.4" height="3" fill="${d}" opacity=".6"/><rect x="${x + 6.6}" y="${top + 9 + r * 6}" width="2.4" height="3" fill="${d}" opacity=".6"/>`; });
      s += `<path d="M10 62H90V66H10z" fill="${d}"/><path d="M22 66V44M22 46L29 60H22M58 66V40M58 42L66 60H58" stroke="${l}" stroke-width=".8" fill="${l}" fill-opacity=".25"/>`;
      return s;
    },
    paris: (f, d, l) => // Эйфелева башня
      `<path d="M50 6L52 20L54 34L57 44H63L68 66H59Q50 52 41 66H32L37 44H43L46 34L48 20z" fill="${f}"/>` +
      `<path d="M50 6L52 20L54 34L57 44H63L68 66H59Q55 58 50 56z" fill="${d}" opacity=".45"/>` +
      `<path d="M44.6 34H55.4M38 44H62" stroke="${l}" stroke-width="1"/><path d="M46 36L54 44M54 36L46 44M47 22L53 32M53 22L47 32" stroke="${d}" stroke-width=".5"/>` +
      `<rect x="49.3" y="2" width="1.4" height="5" fill="${f}"/>`,
    rio: (f, d, l) => // Сахарная Голова и канатная дорога
      `<path d="M8 66Q16 46 24 48Q30 50 34 66z" fill="${d}"/><path d="M36 66Q44 18 60 22Q74 26 78 66z" fill="${f}"/>` +
      `<path d="M60 22Q74 26 78 66H64Q66 40 60 22z" fill="${d}" opacity=".4"/><path d="M22 48L60 22" stroke="${l}" stroke-width=".6"/><rect x="38" y="33" width="4" height="3" rx=".6" fill="${l}"/>` +
      `<path d="M6 66H94" stroke="${l}" stroke-width=".8" opacity=".6"/><path d="M10 69Q30 66 50 69T90 69" stroke="${l}" stroke-width=".6" fill="none" opacity=".5"/>`,
    texas: (f, d, l) => { // Капитолий Остина + звезда-одиночка
      const st = (cx, cy, r) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .4 : r; p.push(n2(cx + Math.cos(a) * q) + ' ' + n2(cy + Math.sin(a) * q)); } return 'M' + p.join('L') + 'z'; };
      return `<path d="${st(50, 14, 7)}" fill="${l}"/><path d="M47 22H53V26H47z" fill="${f}"/><path d="M38 40Q38 26 50 26Q62 26 62 40z" fill="${f}"/><path d="M50 26Q62 26 62 40H50z" fill="${d}" opacity=".4"/>` +
        `<path d="M34 40H66V46H34z" fill="${d}"/>` + [36, 41, 46, 51, 56, 61].map(x => `<rect x="${x}" y="46" width="2.2" height="10" fill="${f}"/>`).join('') +
        `<path d="M16 56H84V66H16z" fill="${f}"/><path d="M16 56H84" stroke="${l}" stroke-width=".8"/>` + [20, 28, 68, 76].map(x => `<rect x="${x}" y="58.5" width="3" height="5" fill="${d}"/>`).join('');
    },
    shanghai: (f, d, l) => // Восточная жемчужина и силуэт Луцзяцзуя
      `<path d="M14 66V46H20V40H24V66zM68 66V30L72 26L76 30V66zM80 66V44H88V66z" fill="${d}"/>` +
      `<path d="M49 6H51V66H49z" fill="${f}"/><path d="M43 66L48 30H52L57 66z" fill="${d}"/><circle cx="50" cy="44" r="7" fill="${f}"/><circle cx="50" cy="24" r="4.4" fill="${f}"/><circle cx="50" cy="12" r="1.8" fill="${f}"/>` +
      `<circle cx="47.6" cy="41.6" r="2" fill="${l}" opacity=".8"/><circle cx="48.6" cy="22.6" r="1.2" fill="${l}" opacity=".8"/><path d="M8 66H92" stroke="${l}" stroke-width=".8"/>`,
    budapest: (f, d, l) => { // Здание парламента: купол и шпили
      let s = `<path d="M12 66V50H88V66z" fill="${f}"/><path d="M40 50Q40 36 50 34Q60 36 60 50z" fill="${f}"/><path d="M49 34L50 20L51 34z" fill="${f}"/>`;
      for (let x = 14; x <= 86; x += 6) s += `<path d="M${x - 1} 50L${x} 44L${x + 1} 50z" fill="${f}"/><rect x="${x - .8}" y="54" width="1.6" height="6" fill="${d}"/>`;
      s += `<path d="M30 50V40L32 36L34 40V50zM66 50V40L68 36L70 40V50z" fill="${f}"/><path d="M8 66H92" stroke="${l}" stroke-width=".9"/><path d="M12 69Q50 66 88 69" stroke="${l}" stroke-width=".5" opacity=".5" fill="none"/>`;
      return s;
    },
    astana: (f, d, l) => // Байтерек: шар на «древе»
      `<path d="M47 66L48 36L44 30H56L52 36L53 66z" fill="${f}"/><path d="M44 30Q38 26 41 22M56 30Q62 26 59 22M46 30Q42 22 46 18M54 30Q58 22 54 18" stroke="${f}" stroke-width="1.6" fill="none"/>` +
      `<circle cx="50" cy="20" r="8" fill="#e8b84a"/><circle cx="47.5" cy="17.5" r="3" fill="#fff4c4" opacity=".75"/><path d="M38 66H62L58 62H42z" fill="${d}"/>`,
    berlin: (f, d, l) => // Бранденбургские ворота с квадригой
      `<path d="M18 66V40H82V66H76V44H72V66H66V44H62V66H56V44H52V66H48V44H44V66H38V44H34V66H28V44H24V66z" fill="${f}"/>` +
      `<path d="M16 40H84V35H16zM28 35L50 28L72 35z" fill="${d}"/><path d="M45 28L46 22H54L55 28z" fill="${f}"/><path d="M47 22L50 17L53 22z" fill="${l}"/>`,
    london: (f, d, l) => // Биг-Бен
      `<path d="M42 66V28H58V66z" fill="${f}"/><path d="M50 28H58V66H50z" fill="${d}" opacity=".4"/><path d="M41 28H59L56 20H44z" fill="${d}"/><path d="M44 20L50 6L56 20z" fill="${f}"/>` +
      `<circle cx="50" cy="35" r="5" fill="#fff4d6"/><circle cx="50" cy="35" r="5" fill="none" stroke="${d}" stroke-width=".8"/><path d="M50 35V32M50 35L52.2 36.2" stroke="${d}" stroke-width=".7"/>` +
      [44, 47, 50, 53].map(x => `<rect x="${x}" y="44" width="1.4" height="18" fill="${d}" opacity=".5"/>`).join(''),
    antwerp: (f, d, l) => // огранённый бриллиант
      `<path d="M28 34L38 22H62L72 34L50 64z" fill="${f}"/><path d="M28 34H72M38 22L44 34L50 22L56 34L62 22M44 34L50 64L56 34" stroke="${d}" stroke-width=".7" fill="none"/>` +
      `<path d="M38 22L44 34H28z" fill="${l}" opacity=".55"/><path d="M56 34L72 34L50 64z" fill="${d}" opacity=".35"/>` +
      [[24, 22], [76, 26], [50, 14]].map(([x, y]) => `<path d="M${x} ${y - 3}L${x + .8} ${y - .8}L${x + 3} ${y}L${x + .8} ${y + .8}L${x} ${y + 3}L${x - .8} ${y + .8}L${x - 3} ${y}L${x - .8} ${y - .8}z" fill="${l}"/>`).join(''),
    bucharest: (f, d, l) => // Триумфальная арка
      `<path d="M24 66V32H76V66H58V50Q50 40 42 50V66z" fill="${f}"/><path d="M22 32H78V26H22z" fill="${d}"/><path d="M30 26V20H70V26z" fill="${f}"/>` +
      `<path d="M28 36H72" stroke="${l}" stroke-width=".7"/><rect x="28" y="40" width="8" height="18" fill="${d}" opacity=".35"/><rect x="64" y="40" width="8" height="18" fill="${d}" opacity=".35"/>`,
    krakow: (f, d, l) => // Мариацкий костёл: две разные башни
      `<path d="M30 66V30H42V66z" fill="${f}"/><path d="M29 30L36 10L43 30z" fill="${d}"/><path d="M33 22L36 14L39 22" stroke="${l}" stroke-width=".6" fill="none"/>` +
      `<path d="M56 66V36H66V66z" fill="${f}"/><path d="M55 36Q61 26 67 36z" fill="${d}"/><path d="M42 66V44L49 38L56 44V66z" fill="${f}"/><circle cx="49" cy="48" r="2.6" fill="${d}"/>` +
      [33, 37, 59, 62].map(x => `<rect x="${x}" y="40" width="1.6" height="12" fill="${d}" opacity=".5"/>`).join(''),
    riyadh: (f, d, l) => // Королевский центр — башня с аркой
      `<path d="M40 66L42 14Q50 6 58 14L60 66z" fill="${f}"/><path d="M45 30Q50 18 55 30V40H45z" fill="${d}"/><path d="M50 8Q58 6 58 14L60 66H50z" fill="${d}" opacity=".35"/>` +
      `<path d="M14 66V52H24V66zM76 66V48H86V66z" fill="${d}"/><path d="M8 66H92" stroke="${l}" stroke-width=".8"/>`,
    lisbon: (f, d, l) => // Башня Белен
      `<path d="M38 66V34H62V66z" fill="${f}"/><path d="M42 34V22H58V34z" fill="${f}"/><path d="M40 22H60V19H40z" fill="${d}"/>` + [40, 45, 50, 55].map(x => `<rect x="${x}" y="15" width="3" height="4" fill="${f}"/>`).join('') +
      `<path d="M46 42Q50 38 54 42V50H46z" fill="${d}"/><path d="M34 66H66" stroke="${l}" stroke-width="1"/><path d="M12 68Q30 64 50 68T88 68" stroke="${l}" stroke-width=".6" fill="none" opacity=".6"/>`,
    sydney: (f, d, l) => // Сиднейская опера — паруса
      `<path d="M18 62Q30 30 42 62zM36 62Q50 22 64 62zM58 62Q70 34 82 62z" fill="${f}"/><path d="M42 62Q50 30 64 62z" fill="${d}" opacity=".35"/><path d="M12 62H88V66H12z" fill="${d}"/>`,
    generic: (f, d, l, h) => { // абстрактный горизонт города (у каждого города свой)
      let s = '', x = 12, k = h || 1;
      while (x < 88) { k = Math.imul(k ^ (k >>> 13), 1597334677) >>> 0; const w = 5 + k % 7, hgt = 12 + (k >>> 8) % 30; s += `<rect x="${x}" y="${66 - hgt}" width="${w}" height="${hgt}" fill="${(k >>> 4) % 3 ? f : d}"/>`;
        for (let yy = 66 - hgt + 3; yy < 62; yy += 4) if ((k >>> (yy % 16)) & 1) s += `<rect x="${x + 1.2}" y="${yy}" width="1.2" height="1.6" fill="${l}" opacity=".7"/>`; x += w + 1; }
      return s + `<path d="M8 66H92" stroke="${l}" stroke-width=".8"/>`;
    }
  };
  // v128.2: новые города Мейджоров — Россия, СНГ, Восточная Европа, Китай, Япония, Корея и остальной мир.
  // Основные символы-здания (та же сетка: земля y=66, x≈20…80).
  const NEW_CITY = [
    [/moscow|moskva|москв/i, 'moscow'], [/petersburg|петербург/i, 'petersburg'], [/kyiv|kiev|киев/i, 'kyiv'], [/almaty/i, 'almaty'], [/tashkent/i, 'tashkent'], [/baku/i, 'baku'],
    [/warsaw/i, 'warsaw'], [/prague|praha/i, 'prague'], [/belgrade/i, 'belgrade'], [/sofia/i, 'sofia'], [/beijing/i, 'beijing'], [/chengdu/i, 'chengdu'], [/hangzhou/i, 'hangzhou'],
    [/tokyo/i, 'tokyo'], [/osaka/i, 'osaka'], [/seoul|busan/i, 'seoul'], [/singapore/i, 'singapore'], [/buenos aires/i, 'buenosaires'], [/madrid|barcelona/i, 'madrid'],
    [/mumbai|delhi/i, 'mumbai'], [/istanbul/i, 'istanbul'], [/toronto|montreal/i, 'toronto'],
    [/minsk/i, 'minsk'], [/tbilisi/i, 'tbilisi'], [/yerevan/i, 'yerevan'], [/bishkek/i, 'bishkek'], [/kazan/i, 'kazan']
  ];
  const CITY = NEW_CITY.concat([
    [/cologne|k[öo]ln/i, 'cologne'], [/katowice/i, 'katowice'], [/stockholm|malm|j[öo]nk/i, 'stockholm'], [/copenhagen|herning|aarhus/i, 'copenhagen'],
    [/paris|lyon|marseille/i, 'paris'], [/\brio\b|s[ãa]o paulo/i, 'rio'], [/austin|dallas|arlington|texas|houston/i, 'texas'], [/shanghai|chengdu|beijing|shenzhen/i, 'shanghai'],
    [/budapest/i, 'budapest'], [/astana|almaty/i, 'astana'], [/berlin|hamburg|hannover/i, 'berlin'], [/london|birmingham|manchester/i, 'london'],
    [/antwerp|brussels/i, 'antwerp'], [/bucharest|cluj|wallachia/i, 'bucharest'], [/krak[óo]w|warsaw|wroc/i, 'krakow'], [/riyadh|jeddah|abu dhabi|dubai/i, 'riyadh'],
    [/lisbon|porto/i, 'lisbon'], [/sydney|melbourne|brisbane/i, 'sydney']
  ]);
  const landmarkOf = city => (CITY.find(c => c[0].test(String(city || ''))) || [0, 'generic'])[1];

  // ---------------------------------------------------------------- форма, вырубка, узоры
  function shapePath(shape, inset) {
    const i = inset || 0, c = 50;
    if (shape === 'circle') return `M50 ${i}A${c - i} ${c - i} 0 1 1 49.99 ${i}z`;
    if (shape === 'shield') return `M${i + 4} ${i + 8}Q50 ${i - 3} ${96 - i} ${i + 8}V${54}Q${96 - i} ${86 - i * .6} 50 ${100 - i}Q${4 + i} ${86 - i * .6} ${4 + i} 54z`;
    if (shape === 'hex') { const p = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; p.push(n2(50 + Math.cos(a) * (50 - i)) + ' ' + n2(50 + Math.sin(a) * (50 - i))); } return 'M' + p.join('L') + 'z'; }
    if (shape === 'ticket') { const r = 7; return `M${i + 9} ${i + 3}H${91 - i}Q${97 - i} ${i + 3} ${97 - i} ${i + 9}V43A${r} ${r} 0 0 0 ${97 - i} 57V${91 - i}Q${97 - i} ${97 - i} ${91 - i} ${97 - i}H${i + 9}Q${i + 3} ${97 - i} ${i + 3} ${91 - i}V57A${r} ${r} 0 0 0 ${i + 3} 43V${i + 9}Q${i + 3} ${i + 3} ${i + 9} ${i + 3}z`; }
    if (shape === 'burst') { const p = []; for (let k = 0; k < 32; k++) { const a = -Math.PI / 2 + k * Math.PI / 16, r = (k % 2 ? 44 : 50) - i; p.push(n2(50 + Math.cos(a) * r) + ' ' + n2(50 + Math.sin(a) * r)); } return 'M' + p.join('L') + 'z'; }
    return `M${i + 10} ${i}H${90 - i}Q${100 - i} ${i} ${100 - i} ${i + 10}V${90 - i}Q${100 - i} ${100 - i} ${90 - i} ${100 - i}H${i + 10}Q${i} ${100 - i} ${i} ${90 - i}V${i + 10}Q${i} ${i} ${i + 10} ${i}z`;
  }
  function pattern(D, kind, col, seed) {
    if (kind === 'rays') { let s = ''; for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, b = a + Math.PI / 24; s += `<path d="M50 46L${n2(50 + Math.cos(a) * 90)} ${n2(46 + Math.sin(a) * 90)}L${n2(50 + Math.cos(b) * 90)} ${n2(46 + Math.sin(b) * 90)}z" fill="${col}"/>`; } return `<g opacity=".14">${s}</g>`; }
    if (kind === 'dots') return `<rect width="100" height="100" fill="url(#${D.add(`<pattern id="$ID" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r=".9" fill="${col}" opacity=".22"/></pattern>`)})"/>`;
    if (kind === 'stripes') return `<rect width="100" height="100" fill="url(#${D.add(`<pattern id="$ID" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="3" height="6" fill="${col}" opacity=".12"/></pattern>`)})"/>`;
    if (kind === 'grid') return `<rect width="100" height="100" fill="url(#${D.add(`<pattern id="$ID" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="${col}" stroke-width=".4" opacity=".25"/></pattern>`)})"/>`;
    if (kind === 'waves') { let s = ''; for (let y = 6; y < 100; y += 7) s += `<path d="M0 ${y}Q12.5 ${y - 3} 25 ${y}T50 ${y}T75 ${y}T100 ${y}" fill="none" stroke="${col}" stroke-width=".6"/>`; return `<g opacity=".18">${s}</g>`; }
    // stars
    let s = '', k = seed >>> 0; for (let i = 0; i < 22; i++) { k = Math.imul(k ^ (k >>> 13), 1597334677) >>> 0; const x = k % 100, y = (k >>> 8) % 100, r = .5 + ((k >>> 16) % 5) / 5; s += `<path d="M${x} ${n2(y - r * 2)}L${n2(x + r * .5)} ${n2(y - r * .5)}L${n2(x + r * 2)} ${y}L${n2(x + r * .5)} ${n2(y + r * .5)}L${x} ${n2(y + r * 2)}L${n2(x - r * .5)} ${n2(y + r * .5)}L${n2(x - r * 2)} ${y}L${n2(x - r * .5)} ${n2(y - r * .5)}z" fill="${col}"/>`; }
    return `<g opacity=".35">${s}</g>`;
  }
  // готовая рамка: белая вырубка с тенью, цветной кант, внутренний тонкий кант, фон
  function frame(D, shape, edgeFill, accent, inner, overlayHtml, label) {
    const cp = D.add(`<clipPath id="$ID"><path d="${shapePath(shape, 5.2)}"/></clipPath>`);
    const sh = D.add(`<filter id="$ID" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#000" flood-opacity=".5"/></filter>`);
    return `<svg class="v84-stk-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}"><defs>${D.d.join('')}</defs>` +
      `<path d="${shapePath(shape, 1)}" fill="${edgeFill}" filter="url(#${sh})"/>` +
      `<path d="${shapePath(shape, 3.4)}" fill="${accent}"/>` +
      `<g clip-path="url(#${cp})">${inner}<g opacity="${/pattern/.test(overlayHtml) || /url\(#[^)]*\)"[^>]*><\/rect><rect/.test(overlayHtml) ? .45 : 1}">${overlayHtml}</g></g>` +
      `<path d="${shapePath(shape, 6.4)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".5"/></svg>`;
  }
  function banner(D, y, text, fill, ink, font, edge) {
    const fold = mix(fill, '#000000', .45);
    return `<path d="M8 ${y + 2}H18V${y + 11}H8L11 ${y + 6.5}z" fill="${fold}"/><path d="M92 ${y + 2}H82V${y + 11}H92L89 ${y + 6.5}z" fill="${fold}"/>` +
      `<path d="M15 ${y}H85V${y + 10}H15z" fill="${fill}" stroke="${edge}" stroke-width=".6"/><path d="M15 ${y + .9}H85" stroke="#fff" stroke-opacity=".3" stroke-width=".5"/>` +
      `<text x="50" y="${y + 7.9}" text-anchor="middle" font-family="${font}" font-size="8" letter-spacing=".6" fill="${ink}" textLength="${Math.min(64, text.length * 5.4)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`;
  }

  // ---------------------------------------------------------------- стикеры
  const ov = (ctx, D, finish, h) => { const o = ctx.overlay(D, finish, h, 100, 100, ''); return finish === 'glitter' ? `<g opacity=".42">${o}</g>` : o; };
  // th: { org, bg, acc, ink, city, year, tag }, finish: paper|glitter|holo|gold, ctx: { D, GOLD, HOLO, overlay }
  function goldish(c) { const m = /^#([0-9a-f]{6})$/i.exec(c || ''); if (!m) return false; const v = parseInt(m[1], 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255; return r > 150 && g > 100 && b < 110 && r - b > 90 && r >= g; }
  function eventSticker(th, finish, ctx, label) {
    if (finish !== 'gold' && goldish(th.acc)) th = Object.assign({}, th, { acc: ['#e23d4b', '#2f8cff', '#19c39a', '#ff7a1a'][h32('pa|' + th.city) % 4] });
    th = edTheme(th);
    const D = ctx.D, h = h32('ev|' + th.city + th.year + th.org), hc = h32('evc|' + th.city), yr = edYear(th);
    // форма и узор зависят от года выпуска: соседние Мейджоры одного города никогда не совпадают
    const shape = ['circle', 'shield', 'hex', 'badge', 'burst', 'ticket'][(hc + yr) % 6], font = DISPLAY[(hc + yr * 5) % DISPLAY.length];
    const metal = finish === 'gold' ? D.lin(ctx.GOLD) : finish === 'holo' ? D.lin(ctx.HOLO, 1, .5) : null;
    const fg = metal || th.ink, acc = metal || th.acc;
    const bg = D.add(`<radialGradient id="$ID" cx=".5" cy=".38" r=".78"><stop offset="0" stop-color="${mix(th.acc, th.bg, .25)}"/><stop offset=".55" stop-color="${th.bg}"/><stop offset="1" stop-color="${mix(th.bg, '#000000', .55)}"/></radialGradient>`);
    const lm = landmarkOf(th.city);
    const lf = metal || D.lin([[0, mix(th.ink, '#ffffff', .2)], [1, mix(th.acc, th.ink, .35)]], 0, 1), ld = mix(th.bg, '#000000', .35), ll = finish === 'gold' ? '#fff4c4' : mix(th.acc, '#ffffff', .5);
    const glow = D.add(`<radialGradient id="$ID" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${th.acc}" stop-opacity=".55"/><stop offset="1" stop-color="${th.acc}" stop-opacity="0"/></radialGradient>`);
    const arc = D.add(`<path id="$ID" d="M16 50A34 34 0 0 1 84 50"/>`);
    const inner = `<rect width="100" height="100" fill="url(#${bg})"/>` + pattern(D, ['rays', 'dots', 'stripes', 'grid', 'waves', 'stars'][((hc >>> 8) + yr * 7) % 6], th.ink, h) +
      `<ellipse cx="50" cy="44" rx="34" ry="28" fill="url(#${glow})"/>` +
      `<text font-family="${font}" font-size="8.4" letter-spacing="1.6" fill="${fg}"><textPath href="#${arc}" startOffset="50%" text-anchor="middle">${esc(th.tag)}</textPath></text>` +
      `<g transform="translate(9 13.5) scale(.82)">${symbolFor(lm, th)(lf, ld, ll, h)}</g>` +
      `<path d="M14 61H86" stroke="${acc}" stroke-width=".6" opacity=".8"/>` +
      banner(D, /hex|shield/.test(shape) ? 62.5 : 64, 'MAJOR ' + (th.year || ''), finish === 'gold' ? mix('#6e4a05', th.bg, .3) : th.acc, finish === 'paper' ? th.bg : '#fff', font, finish === 'gold' ? '#f7d36a' : '#ffffff') +
      `<text x="50" y="${/hex|shield/.test(shape) ? 81.4 : 84.6}" text-anchor="middle" font-family="StkBebas,Arial" font-size="${/hex|shield/.test(shape) ? 4.6 : 5.6}" letter-spacing="2.2" fill="${fg}" opacity=".9">${esc(th.org)} · CS2</text>`;
    const f = F(D);
    // исполнение меняет материал всего стикера: Gold — золотой рельеф, Holo — радужная фольга, Glitter — блёстки
    const full = maskOf(D, '<rect width="100" height="100" fill="#fff"/>');
    const body = finish === 'gold' ? `<g filter="url(#${f.emb})"><g filter="url(#${f.gold})">${inner}</g></g>`
      : finish === 'holo' ? inner + holoLayer(D, ctx, full, .58)
        : finish === 'glitter' ? `<g filter="url(#${f.glit})">${inner}</g><rect width="100" height="100" fill="${glitterFill(D, th.acc, h)}" opacity=".38" style="mix-blend-mode:hard-light"/>` + sparkleLayer(D, h, full, .55) : inner;
    return frame(D, shape, finish === 'gold' ? D.lin(ctx.GOLD) : finish === 'holo' ? D.lin(ctx.HOLO) : finish === 'glitter' ? glitterFill(D, '#d9d9d9', h ^ 77) : '#ffffff', finish === 'gold' ? D.lin(ctx.GOLD, 0, 1) : acc, body, '', label);
  }
  function teamColors(team) { const P = [['#c8102e', '#111111'], ['#0033a0', '#ffd100'], ['#111111', '#f2c94c'], ['#00843d', '#ffffff'], ['#5b2c83', '#f5a623'], ['#e4572e', '#1b1b3a'], ['#0b6e99', '#e0f2ff'], ['#222831', '#00adb5'], ['#7a0019', '#ffcc33'], ['#1d3557', '#e63946'], ['#ff6b00', '#141414'], ['#2b2d42', '#8d99ae']]; return P[h32('tc|' + team) % P.length]; }

  // ---------------------------------------------------------------- логотипы: точное центрирование по содержимому
  // LOGO_BOX[файл] = [x0, y0, x1, y1 (доли картинки), ширина/высота, яркость] — заранее посчитано по прозрачности
  const LOGO_BOX = {"3dmax":[0.191,0.078,0.809,0.922,1.0,0.31,"#e50f13"],"sangal":[0.145,0.082,0.855,0.922,1.0,0.2,"#750d09"],"fokus":[0.188,0.078,0.809,0.922,1.0,0.37,"#e52528"],"aether":[0.168,0.172,0.781,0.828,1.0,0.47,""],"furiaacademy":[0.09,0.078,0.91,0.922,1.0,0.41,""],"passionua":[0.266,0.082,0.734,0.918,1.0,0.68,"#016efb"],"eruption":[0.215,0.078,0.785,0.922,1.0,1.0,""],"magic":[0.082,0.254,0.918,0.742,1.0,0.53,"#9331b3"],"teamfalcons":[0.152,0.078,0.848,0.922,1.0,0.49,"#01bf6e"],"virtuspro":[0.078,0.09,0.922,0.91,1.0,0.67,"#e54c06"],"mouz":[0.102,0.078,0.898,0.922,1.0,0.3,"#fe0000"],"ruby":[0.109,0.078,0.891,0.922,1.0,0.2,"#d50509"],"100thieves":[0.078,0.168,0.918,0.832,1.0,0.67,"#f33534"],"pain":[0.078,0.219,0.922,0.781,1.0,0.94,"#fe0000"],"astralistalent":[0.078,0.141,0.922,0.859,1.0,0.3,"#fd0000"],"rareatom":[0.078,0.113,0.922,0.883,1.0,0.47,"#ab4fc7"],"aurora":[0.078,0.078,0.922,0.922,1.0,0.56,"#0ec7bb"],"aurorayb":[0.238,0.078,0.762,0.922,1.0,0.56,"#0ec7bb"],"ur":[0.117,0.078,0.883,0.918,1.0,0.41,"#094677"],"gun5":[0.078,0.105,0.922,0.891,1.0,0.86,"#a77b40"],"johnnyspeeds":[0.078,0.137,0.922,0.863,1.0,0.35,"#087be2"],"nexvoid":[0.082,0.078,0.914,0.922,1.0,0.67,"#8d62f0"],"teamliquid":[0.129,0.078,0.871,0.922,1.0,0.7,"#2d3854"],"partizan":[0.141,0.078,0.859,0.922,1.0,0.99,""],"lynnvision":[0.078,0.215,0.922,0.785,1.0,0.37,"#916a24"],"b8":[0.148,0.078,0.852,0.922,1.0,1.0,""],"kolesie":[0.039,0.125,0.961,0.875,1.0,0.5,"#1e9fb9"],"sashi":[0.188,0.082,0.812,0.922,1.0,0.64,"#7b3031"],"rebels":[0.078,0.223,0.922,0.777,1.0,0.35,"#fe0f25"],"mibr":[0.078,0.332,0.922,0.668,1.0,0.83,""],"9ine":[0.078,0.078,0.922,0.922,1.0,0.77,""],"teamvitality":[0.152,0.078,0.848,0.918,1.0,0.89,"#fefe00"],"wildcard":[0.145,0.082,0.855,0.918,1.0,0.56,"#f4263b"],"cybershoke":[0.133,0.078,0.867,0.922,1.0,1.0,""],"justswing":[0.043,0.066,0.957,0.93,1.0,0.3,"#2210de"],"chinggiswarriors":[0.078,0.078,0.922,0.922,1.0,0.4,"#f62535"],"kr":[0.102,0.078,0.898,0.922,1.0,0.42,"#fe1890"],"eyeballers":[0.199,0.078,0.801,0.922,1.0,0.35,"#e21f25"],"shinden":[0.078,0.109,0.922,0.887,1.0,0.6,""],"themongolz":[0.152,0.078,0.848,0.922,1.0,1.0,""],"g2":[0.129,0.078,0.867,0.922,1.0,1.0,""],"m80":[0.129,0.078,0.871,0.922,1.0,0.55,"#ceee06"],"iberiansoul":[0.188,0.078,0.812,0.918,1.0,0.57,""],"spiritacademy":[0.078,0.164,0.922,0.836,1.0,1.0,""],"withoutaroof":[0.078,0.281,0.922,0.715,1.0,1.0,""],"bcgame":[0.145,0.078,0.855,0.922,1.0,0.67,"#2fee86"],"tyloo":[0.078,0.121,0.922,0.879,1.0,0.36,"#a9352f"],"nrg":[0.078,0.395,0.922,0.605,1.0,1.0,""],"navi":[0.078,0.129,0.922,0.871,1.0,0.54,"#e8dc08"],"bestia":[0.145,0.078,0.855,0.922,1.0,1.0,""],"gamehunters":[0.039,0.078,0.961,0.922,1.0,0.27,"#06b188"],"marcaregistrada":[0.133,0.039,0.867,0.961,1.0,0.99,"#df1717"],"ecstatic":[0.078,0.078,0.922,0.922,1.0,0.55,"#a18b59"],"navijunior":[0.082,0.078,0.918,0.922,1.0,0.48,"#eade08"],"astralis":[0.152,0.082,0.848,0.922,1.0,0.3,"#fe0000"],"luminosity":[0.078,0.078,0.922,0.922,1.0,0.62,"#3fb2d0"],"gamerlegion":[0.086,0.082,0.914,0.922,1.0,0.57,""],"partyastronauts":[0.078,0.164,0.922,0.836,1.0,0.46,"#46adb8"],"walczaki":[0.078,0.281,0.914,0.719,1.0,0.96,""],"genone":[0.152,0.078,0.848,0.922,1.0,0.58,"#fe0371"],"vitalityacademy":[0.078,0.105,0.922,0.895,1.0,0.89,"#fefe00"],"sinners":[0.172,0.078,0.828,0.922,1.0,0.59,"#d14346"],"boss":[0.078,0.32,0.922,0.68,1.0,0.27,"#a48427"],"brute":[0.152,0.078,0.848,0.918,1.0,1.0,""],"k27":[0.082,0.348,0.918,0.652,1.0,0.18,"#ad1226"],"yawara":[0.078,0.297,0.922,0.703,1.0,1.0,""],"hotu":[0.078,0.078,0.922,0.922,1.0,1.0,""],"heroic":[0.078,0.297,0.922,0.703,1.0,0.78,"#f91413"],"bbl":[0.078,0.164,0.918,0.836,1.0,0.6,"#cd9a03"],"galorys":[0.277,0.078,0.723,0.922,1.0,0.36,"#5061a2"],"big":[0.207,0.078,0.793,0.922,1.0,1.0,""],"innercircle":[0.137,0.078,0.863,0.922,1.0,0.46,"#fe3555"],"1win":[0.078,0.289,0.922,0.711,1.0,0.61,""],"fut":[0.277,0.078,0.723,0.918,1.0,0.98,"#f5193a"],"9pandas":[0.152,0.078,0.848,0.918,1.0,0.63,"#72d00e"],"eclot":[0.078,0.152,0.922,0.848,1.0,0.32,"#ea092a"],"mouznxt":[0.102,0.078,0.898,0.922,1.0,1.0,""],"alliance":[0.078,0.199,0.922,0.801,1.0,0.6,"#44d72c"],"nexus":[0.176,0.078,0.824,0.922,1.0,0.39,"#c21e22"],"bigacademy":[0.207,0.078,0.793,0.922,1.0,1.0,""],"basementboys":[0.078,0.285,0.922,0.715,1.0,0.73,"#01fc74"],"parivision":[0.078,0.125,0.922,0.871,1.0,0.54,"#00c8b2"],"leo":[0.215,0.078,0.785,0.922,1.0,0.43,"#973033"],"eternalfire":[0.078,0.277,0.922,0.723,1.0,0.58,"#93835e"],"vantage":[0.039,0.148,0.961,0.848,1.0,0.68,"#01fed4"],"nip":[0.078,0.078,0.922,0.922,1.0,0.84,"#dafe00"],"falconsforce":[0.152,0.078,0.848,0.922,1.0,0.49,"#01bf6e"],"deepcross":[0.039,0.344,0.961,0.656,1.0,0.66,"#0564cd"],"legion":[0.277,0.078,0.723,0.922,1.0,0.48,"#c93e1a"],"heroicacademy":[0.078,0.129,0.922,0.871,1.0,0.49,"#9f1e31"],"xdm":[0.086,0.039,0.914,0.961,1.0,0.42,"#4e647d"],"og":[0.191,0.078,0.809,0.922,1.0,0.61,"#0c6c64"],"favbet":[0.082,0.207,0.922,0.793,1.0,0.71,"#fb2d81"],"phantom":[0.148,0.078,0.852,0.922,1.0,1.0,""],"jijiehao":[0.078,0.098,0.922,0.902,1.0,0.28,"#ab1c23"],"furia":[0.078,0.09,0.922,0.91,1.0,0.25,""],"fnatic":[0.078,0.227,0.922,0.773,1.0,0.51,"#fe5900"],"lastbullet":[0.102,0.039,0.898,0.961,1.0,0.23,"#32652b"],"arcred":[0.09,0.078,0.91,0.918,1.0,1.0,""],"wwteam-2024":[0.078,0.227,0.922,0.77,1.0,0.38,"#e70201"],"bountyhunters":[0.188,0.078,0.812,0.922,1.0,0.96,"#fedb00"],"nemesis":[0.078,0.422,0.922,0.578,1.0,0.17,""],"misa":[0.078,0.082,0.922,0.922,1.0,0.73,"#e7c66c"],"oddik":[0.078,0.082,0.922,0.918,1.0,0.85,"#eff031"],"morningstar":[0.109,0.082,0.891,0.918,1.0,0.69,"#e80012"],"betclic":[0.078,0.102,0.922,0.898,1.0,0.68,"#e40013"],"faze":[0.078,0.219,0.922,0.777,1.0,0.54,"#e20c33"],"chickencoop":[0.113,0.078,0.887,0.922,1.0,0.63,""],"betboom":[0.078,0.125,0.922,0.875,1.0,0.5,"#fe4655"],"teamspirit":[0.137,0.082,0.863,0.922,1.0,1.0,""],"imperial":[0.164,0.078,0.832,0.922,1.0,0.59,"#00e973"],"cphwolves":[0.078,0.078,0.922,0.918,1.0,0.32,"#d5a534"],"saw":[0.078,0.152,0.922,0.848,1.0,0.78,""],"quazar":[0.078,0.078,0.922,0.922,1.0,0.51,"#ce0336"],"nemiga":[0.078,0.078,0.922,0.918,1.0,0.46,"#d22729"],"nucleartigeres":[0.078,0.195,0.922,0.805,1.0,0.72,"#e75223"],"keydstars":[0.156,0.078,0.844,0.922,1.0,0.2,"#4b1a74"],"painacademy":[0.078,0.219,0.922,0.781,1.0,0.97,"#ef2a48"],"fluxo":[0.078,0.078,0.922,0.922,1.0,1.0,""],"9z":[0.078,0.145,0.922,0.852,1.0,0.73,"#7337fb"],"might":[0.098,0.039,0.898,0.961,1.0,0.37,"#273452"],"lag":[0.082,0.234,0.922,0.766,1.0,0.99,"#f8f90f"],"elevate":[0.078,0.078,0.922,0.922,1.0,0.5,"#d72027"],"500":[0.078,0.078,0.922,0.922,1.0,0.24,"#d65a73"],"monte":[0.211,0.086,0.793,0.91,1.0,0.45,"#33acc8"],"fnaticrising":[0.078,0.227,0.922,0.773,1.0,0.51,"#fe5900"],"changethegame":[0.078,0.082,0.918,0.918,1.0,0.64,""],"legacy":[0.082,0.078,0.918,0.922,1.0,0.76,"#fcc800"],"g2ares":[0.078,0.336,0.922,0.664,1.0,0.74,""],"metizport":[0.145,0.078,0.855,0.922,1.0,1.0,""]};
  function logoBox(logo) { const m = String(logo || '').match(/([a-z0-9_-]+)\.(webp|png|svg|jpg)/i); return (m && LOGO_BOX[m[1].toLowerCase()]) || [0, 0, 1, 1, 1, .5]; }
  // ставит <image> так, чтобы видимая часть логотипа вписалась в квадрат size×size с центром (cx, cy)
  function logoPlace(logo, cx, cy, size) {
    const b = logoBox(logo), cw = (b[2] - b[0]) * b[4], ch = b[3] - b[1], k = size / Math.max(cw, ch);
    const W = b[4] * k, Hh = k, x = cx - (b[0] * b[4] + cw / 2) * k, y = cy - (b[1] + ch / 2) * k;
    return { x: n2(x), y: n2(y), w: n2(W), h: n2(Hh), light: b[5] > .72 };
  }

  // ---------------------------------------------------------------- материалы исполнений
  function F(D) {
    if (D._f) return D._f;
    const gold = D.add(`<filter id="$ID" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues=".22 .52 .82 .98 1"/><feFuncG type="table" tableValues=".13 .34 .62 .84 .97"/><feFuncB type="table" tableValues=".02 .05 .16 .42 .78"/></feComponentTransfer></filter>`);
    const emb = D.add(`<filter id="$ID" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation=".6" result="b"/><feSpecularLighting in="b" surfaceScale="2.2" specularConstant=".9" specularExponent="18" lighting-color="#fff6d0" result="s"><feDistantLight azimuth="235" elevation="48"/></feSpecularLighting><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k2="1" k3=".7"/></filter>`);
    const cut = D.add(`<filter id="$ID" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="11" result="d0"/><feMorphology in="d0" operator="erode" radius="8.6" result="d1"/><feGaussianBlur in="d1" stdDeviation=".5"/><feComponentTransfer result="d"><feFuncA type="linear" slope="6" intercept="-2.4"/></feComponentTransfer><feFlood flood-color="#f2f2f0"/><feComposite in2="d" operator="in" result="w"/><feDropShadow in="w" dx="0" dy="1.1" stdDeviation=".9" flood-color="#000" flood-opacity=".45" result="ws"/><feMerge><feMergeNode in="ws"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
    // толстая двойная обводка логотипа (тёмная + белая): логотип читается на любом фоне и сохраняет детали
    const ring = D.add(`<filter id="$ID" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.1" result="a"/><feMorphology in="SourceAlpha" operator="dilate" radius="2.8" result="b"/><feFlood flood-color="#141414"/><feComposite in2="a" operator="in" result="ka"/><feFlood flood-color="#ffffff"/><feComposite in2="b" operator="in" result="wb"/><feMerge><feMergeNode in="wb"/><feMergeNode in="ka"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
    const ringL = D.add(`<filter id="$ID" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="a"/><feMorphology in="SourceAlpha" operator="dilate" radius="3.4" result="b"/><feFlood flood-color="#1a1d22"/><feComposite in2="a" operator="in" result="ka"/><feFlood flood-color="#ffffff"/><feComposite in2="b" operator="in" result="wb"/><feMerge><feMergeNode in="wb"/><feMergeNode in="ka"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
    const glit = D.add(`<filter id="$ID" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="1.35"/><feComponentTransfer><feFuncR type="linear" slope="1.08"/><feFuncG type="linear" slope="1.08"/><feFuncB type="linear" slope="1.08"/></feComponentTransfer></filter>`);
    return (D._f = { gold, emb, cut, ring, ringL, glit });
  }
  function glitterFill(D, col, seed) {
    let dots = '', k = seed >>> 0;
    for (let i = 0; i < 48; i++) { k = Math.imul(k ^ (k >>> 13), 1597334677) >>> 0; const x = k % 10, y = (k >>> 8) % 10, r = .22 + ((k >>> 16) % 5) / 13;
      dots += `<circle cx="${x}" cy="${y}" r="${n2(r)}" fill="${i % 4 === 0 ? '#ffffff' : i % 4 === 1 ? mix(col, '#ffffff', .5) : i % 4 === 2 ? mix(col, '#000000', .3) : mix(col, '#ffffff', .2)}"/>`; }
    return 'url(#' + D.add(`<pattern id="$ID" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${col}"/>${dots}</pattern>`) + ')';
  }
  // слой блёсток поверх всего содержимого (по его форме): крупная искристая крошка + звёздочки-вспышки
  function sparkleLayer(D, seed, shapeMaskId, op) {
    let s = '', k = seed >>> 0;
    for (let i = 0; i < 70; i++) { k = Math.imul(k ^ (k >>> 13), 1597334677) >>> 0; const x = k % 100, y = (k >>> 8) % 100, r = .35 + ((k >>> 16) % 6) / 9;
      s += i % 9 === 0 ? `<path d="M${x} ${n2(y - r * 2.6)}L${n2(x + r * .5)} ${n2(y - r * .5)}L${n2(x + r * 2.6)} ${y}L${n2(x + r * .5)} ${n2(y + r * .5)}L${x} ${n2(y + r * 2.6)}L${n2(x - r * .5)} ${n2(y + r * .5)}L${n2(x - r * 2.6)} ${y}L${n2(x - r * .5)} ${n2(y - r * .5)}z" fill="#fff"/>`
        : `<circle cx="${x}" cy="${y}" r="${n2(r * .7)}" fill="#fff" opacity="${n2(.35 + (i % 4) * .15)}"/>`; }
    const grain = 'url(#' + D.add(`<pattern id="$ID" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx=".7" cy=".8" r=".45" fill="#fff" opacity=".5"/><circle cx="2.2" cy="2.1" r=".35" fill="#000" opacity=".35"/></pattern>`) + ')';
    let gd = '', q = seed ^ 0x9e37;
    for (let i = 0; i < 90; i++) { q = Math.imul(q ^ (q >>> 13), 1597334677) >>> 0; gd += `<circle cx="${(q % 80) / 10}" cy="${((q >>> 8) % 80) / 10}" r="${n2(.35 + ((q >>> 16) % 5) * .11)}" fill="${['#ffffff', '#000000', '#bcd9ff', '#000000', '#ffe2a0', '#ffffff', '#ffffff'][i % 7]}" opacity="${['.95', '.38', '.8', '.22', '.8', '.6', '.85'][i % 7]}"/>`; }
    const tex = 'url(#' + D.add(`<pattern id="$ID" width="8" height="8" patternUnits="userSpaceOnUse">${gd}</pattern>`) + ')';
    return `<g mask="url(#${shapeMaskId})" opacity="${op || 1}"><rect x="-10" y="-10" width="120" height="120" fill="${tex}"/></g><g mask="url(#${shapeMaskId})" style="mix-blend-mode:overlay"><rect width="100" height="100" fill="${grain}"/></g><g mask="url(#${shapeMaskId})"><g class="stk-glint">${s}</g></g>`;
  }
  // голограмма, зависящая от угла обзора: широкий радужный слой, сдвигаемый CSS-переменными --hx/--hy (наклон при осмотре)
  function holoLayer(D, ctx, maskId, strength) {
    const g = D.add(`<linearGradient id="$ID" x1="0" y1="0" x2="1" y2=".35" spreadMethod="reflect"><stop offset="0" stop-color="#ff5ea8"/><stop offset=".17" stop-color="#ffd23f"/><stop offset=".34" stop-color="#5dffb0"/><stop offset=".5" stop-color="#3ec9ff"/><stop offset=".67" stop-color="#9b6bff"/><stop offset=".84" stop-color="#ff5ea8"/><stop offset="1" stop-color="#ffd23f"/></linearGradient>`);
    const sh = D.add(`<linearGradient id="$ID" x1="0" y1="0" x2="1" y2="1"><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
    return `<g mask="url(#${maskId})"><g class="stk-holo"><rect x="-100" y="-100" width="300" height="300" fill="url(#${g})" opacity="${strength || .6}" style="mix-blend-mode:color-dodge"/><rect x="-100" y="-100" width="300" height="300" fill="url(#${sh})" opacity=".55" style="mix-blend-mode:soft-light"/></g></g>`;
  }
  const maskOf = (D, content) => D.add(`<mask id="$ID" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120" style="mask-type:alpha">${content}</mask>`);
  function mat(D, ctx, finish, col, seed) {
    if (finish === 'gold') return D.lin(ctx.GOLD, .8, 1);
    if (finish === 'holo') return D.lin(ctx.HOLO, 1, .7);
    if (finish === 'glitter') return glitterFill(D, col, seed);
    return col;
  }
  function logoImg(logo, p) { return `<image href="${esc(logo)}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" preserveAspectRatio="none"/>`; }
  // логотип в материале исполнения, с толстой обводкой
  function logoIn(D, ctx, finish, logo, cx, cy, size, seed, ringOn) {
    const f = F(D), p = logoPlace(logo, cx, cy, size), img = logoImg(logo, p);
    let core;
    if (finish === 'gold') core = `<g filter="url(#${f.emb})"><g filter="url(#${f.gold})">${img}</g></g>`;
    else if (finish === 'glitter') { const m = maskOf(D, img); core = `<g filter="url(#${f.glit})">${img}</g>` + sparkleLayer(D, seed, m); }
    else if (finish === 'holo') { const m = maskOf(D, img); core = img + holoLayer(D, ctx, m, .62); }
    else core = img;
    return ringOn === false ? core : `<g filter="url(#${p.light ? f.ringL : f.ring})">${img}</g>${core}`;
  }

  // ---------------------------------------------------------------- стиль Мейджора: орнамент + надпись города
  // v128: у каждого города — свой мотив, который больше нигде не встречается; новые города получают свободный мотив из запаса
  const MSTYLE = [
    [/cologne|k[öo]ln/i, 'vitrage'], [/katowice/i, 'hexcut'], [/stockholm|malm|j[öo]nk/i, 'snow'], [/copenhagen|herning|aarhus/i, 'nordic'],
    [/paris|lyon|marseille/i, 'baroque'], [/\brio\b|s[ãa]o paulo/i, 'tropic'], [/austin/i, 'horns'], [/dallas|arlington|fort worth/i, 'chevron'],
    [/shanghai/i, 'deco'], [/budapest/i, 'folk'], [/astana/i, 'zigzag'], [/almaty/i, 'sunray'], [/berlin|hamburg|hannover/i, 'gears'],
    [/london|birmingham|manchester/i, 'laurel'], [/antwerp|brussels/i, 'compass'], [/bucharest|cluj|wallachia/i, 'petals'], [/krak[óo]w|warsaw|wroc/i, 'crown'],
    [/riyadh/i, 'arabesque'], [/abu dhabi|dubai|doha/i, 'domes'], [/jeddah|muscat/i, 'mashrabiya'], [/lisbon|porto/i, 'lattice'], [/sydney|melbourne|brisbane/i, 'shells'],
    [/shenzhen/i, 'ziggurat'], [/new york|las vegas|chicago/i, 'skyline'],
    [/moscow|moskva/i, 'khokhloma'], [/petersburg/i, 'gzhel'], [/kyiv|kiev/i, 'vyshyvanka'], [/minsk/i, 'rushnyk'], [/tashkent|samarkand/i, 'ikat'], [/baku/i, 'buta'],
    [/tbilisi/i, 'vine'], [/yerevan/i, 'arevakhach'], [/bishkek/i, 'koshkar'], [/kazan/i, 'tatar'],
    [/moscow|petersburg|kyiv|kiev|tashkent|baku|warsaw|prague|praha|belgrade|sofia|beijing|chengdu|hangzhou|tokyo|osaka|seoul|busan|singapore|buenos aires|madrid|barcelona|mumbai|delhi|istanbul|toronto|montreal/i, 'emblem']
  ];
  const SPARE = ['mountains', 'skyline', 'ziggurat', 'sunray', 'chevron', 'mashrabiya', 'domes'];
  const motifReg = (() => { try { return JSON.parse(localStorage.getItem('cs2_motif_reg_v1') || '{}'); } catch (e) { return {}; } })();
  function spareFor(city) {
    const k = String(city || '').toLowerCase().trim(); if (motifReg[k]) return motifReg[k];
    const taken = new Set(Object.values(motifReg)), base = h32('sty|' + k);
    let m = SPARE[base % SPARE.length]; for (let i = 0; i < SPARE.length; i++) { const c = SPARE[(base + i) % SPARE.length]; if (!taken.has(c)) { m = c; break; } }
    motifReg[k] = m; try { localStorage.setItem('cs2_motif_reg_v1', JSON.stringify(motifReg)); } catch (e) {} return m;
  }
  // номер выпуска: один и тот же город в разные годы — разная форма, фон, узор, палитра
  const edYear = th => { const y = parseInt(th && th.year, 10); return isFinite(y) ? y : 2026; };
  function hueRot(hex, deg) { const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m || !deg) return hex; let v = parseInt(m[1], 16), r = (v >> 16) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return hex; let hh = 0; const sat = d / (1 - Math.abs(2 * l - 1));
    hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh = (hh * 60 + deg + 720) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), mm = l - c / 2, [R, G, B] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [R, G, B].map(q => Math.round((q + mm) * 255).toString(16).padStart(2, '0')).join(''); }
  const edHue = th => { const k = edYear(th) - 2026; return ((k % 8) + 8) % 8 * 45; };   // 8 разных палитр подряд
  function edTheme(th) { const d = edHue(th); return d ? Object.assign({}, th, { bg: hueRot(th.bg, d), acc: hueRot(th.acc, d) }) : th; }
  const STYLE_FONT = { emblem: 'StkRighteous', snow: 'StkCinzel', chevron: 'StkRye', zigzag: 'StkRusso', sunray: 'StkCinzel', gears: 'StkBlackOps', compass: 'StkCinzel', petals: 'StkOleo', crown: 'StkFraktur', domes: 'StkCinzel', mashrabiya: 'StkCinzel', lattice: 'StkPirata', shells: 'StkRighteous', ziggurat: 'StkRusso', mountains: 'StkAnton', folk: 'StkFraktur', horns: 'StkRye', tropic: 'StkOleo', baroque: 'StkPirata', nordic: 'StkCinzel', deco: 'StkCinzel', hexcut: 'StkRusso', arabesque: 'StkCinzel', skyline: 'StkRighteous', vitrage: 'StkPirata', laurel: 'StkSancreek' };
  function styleOf(th) { const m = MSTYLE.find(x => x[0].test(th.city || '')); return m ? m[1] : spareFor(th.city); }
  // палитра орнамента для Paper (у каждого стиля своя), для других исполнений — материал
  const STYLE_COLS = { emblem: ['#e8c26a', '#2f6fe0', '#ffffff', '#d8263e'], snow: ['#dff1ff', '#8ec9f0', '#ffffff', '#4a8fc8'], chevron: ['#d64545', '#f4ead2', '#2c4a7a', '#ffd34d'], zigzag: ['#f2c14e', '#2f8fd6', '#ffffff', '#b8892f'], sunray: ['#ffcf5a', '#e07a2a', '#fff3c4'],
    gears: ['#c9ced6', '#6b7480', '#ff5a4a'], compass: ['#bfe2ff', '#6fa8e0', '#ffffff', '#2d5a8c'], petals: ['#ff8fb1', '#e0457a', '#ffd6e4', '#7bc96f'], crown: ['#f2c14e', '#c0392b', '#fff1c4'],
    domes: ['#e8c26a', '#1d6b5e', '#f4ead2'], mashrabiya: ['#c9a25a', '#3b2a1a', '#f4ead2'], lattice: ['#2f6fe0', '#ffffff', '#8fb8ff', '#f2c14e'], shells: ['#ffffff', '#ffb347', '#3fb6e8'], ziggurat: ['#f2d27a', '#b8892f', '#222'], mountains: ['#9fd0c0', '#3d7a6a', '#ffffff', '#ffcf5a'], folk: ['#e94f6a', '#3fbf74', '#ffb340', '#4a8ee8', '#b05ee0'], horns: ['#f1e2c0', '#b98a4e', '#5a3a1e', '#d9b36c'], tropic: ['#2fae5f', '#1e7a44', '#8fdc5a', '#ffb347'],
    baroque: ['#e8d6a8', '#b8975a', '#6e5733'], nordic: ['#cfe6ff', '#6ea8e8', '#ffffff'], deco: ['#f2d27a', '#b8892f', '#222'], hexcut: ['#9aa3ae', '#5c6570', '#e6e9ec'], arabesque: ['#d9b45a', '#1d6b5e', '#f4ead2', '#9c7426'], skyline: ['#3fa9f5', '#1b3f73', '#e8f4ff', '#ffc65c'], vitrage: ['#2fa58a', '#d8dcd9', '#1d6f8c', '#8fdcc1'], laurel: ['#d9c17a', '#8a7330'] };
  // v128: подложка-мотив меняется от выпуска к выпуску: мотив города → символ города водяным знаком → чистая подложка
  function ornament(D, ctx, th, finish, seed, area) {
    const v = ((edYear(th) - 2026) % 3 + 3) % 3, lm = landmarkOf(th.city);
    if (v === 0 || lm === 'generic') return ornamentMotif(D, ctx, th, finish, seed, area);
    if (v === 2) return '';
    const alts = (ALT[lm] || []).concat(AN[lm] ? [AN[lm]] : [], SIGN[lm] ? [SIGN[lm]] : []), fn = alts.length ? alts[(edYear(th) >> 1) % alts.length] : (LX[lm] || L[lm] || LN[lm] || L.generic);
    const f = finish === 'paper' ? mix(th.acc, '#ffffff', .25) : mat(D, ctx, finish, th.acc, seed + 5), dd = mix(th.acc, '#000000', .45), ll = mix(th.acc, '#ffffff', .7);
    return `<g transform="translate(50 36) scale(1.18) translate(-50 -40)" opacity=".85">${fn(f, dd, ll, seed)}</g>`;
  }
  function ornamentMotif(D, ctx, th, finish, seed, area) {
    const st = styleOf(th), C0 = STYLE_COLS[st] || STYLE_COLS.laurel, off = ((edYear(th) - 2026) % C0.length + C0.length) % C0.length, C = C0.slice(off).concat(C0.slice(0, off));
    const col = (i) => finish === 'paper' ? C[i % C.length] : mat(D, ctx, finish, C[i % C.length], seed + i);
    const mir = (edYear(th) % 2) ? '' : ' transform="translate(100 0) scale(-1 1)"';   // чётные годы — зеркально
    const dk = finish === 'gold' ? '#6e4a05' : '#222';
    let s = '';
    if (FOLK[st]) { // v128.3: народный узор кольцом вокруг логотипа (у каждого города свой)
      const cl = D.add(`<clipPath id="$ID"><path d="M50 0A38 38 0 1 1 49.99 0zM50 12A26 26 0 1 0 50.01 12z" fill-rule="evenodd" clip-rule="evenodd"/></clipPath>`), PC = STYLE_COLS[st];
      const cc = (i) => finish === 'paper' ? PC[i % PC.length] : mat(D, ctx, finish, PC[i % PC.length], seed + i);
      s = `<g${mir}><g clip-path="url(#${cl})">${FOLK[st](cc, 8, -2, 84, 82)}</g></g><circle cx="50" cy="38" r="38" fill="none" stroke="${cc(1)}" stroke-width="1.6"/><circle cx="50" cy="38" r="26" fill="none" stroke="${cc(1)}" stroke-width="1.2"/>`;
    } else if (st === 'folk') { // народные цветы венком сверху и по бокам
      const flower = (x, y, r, c) => { let p = ''; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; p += `<ellipse cx="${n2(x + Math.cos(a) * r * .9)}" cy="${n2(y + Math.sin(a) * r * .9)}" rx="${n2(r * .62)}" ry="${n2(r * .38)}" transform="rotate(${n2(a * 180 / Math.PI)} ${n2(x + Math.cos(a) * r * .9)} ${n2(y + Math.sin(a) * r * .9)})" fill="${c}"/>`; } return p + `<circle cx="${x}" cy="${y}" r="${n2(r * .45)}" fill="${finish === 'paper' ? '#ffd23f' : c}" stroke="${dk}" stroke-width=".3"/>`; };
      const leaf = (x, y, a, c) => `<path d="M0 0Q4 -3 9 0Q4 3 0 0z" fill="${c}" transform="translate(${x} ${y}) rotate(${a})"/>`;
      const P = [[14, 46, 5], [12, 30, 4.4], [20, 16, 5], [34, 8, 4.4], [50, 5, 5.6], [66, 8, 4.4], [80, 16, 5], [88, 30, 4.4], [86, 46, 5]];
      P.forEach(([x, y, r], i) => { s += leaf(x, y, -40 + i * 12, col(1)) + leaf(x, y, 140 + i * 12, col(1)); });
      P.forEach(([x, y, r], i) => { s += flower(x, y, r, col([0, 2, 3, 4][i % 4])); });
    } else if (st === 'horns') { // рога лонгхорна над надписью и звёзды
      s = `<path d="M50 66Q38 62 26 64Q12 66 4 56Q14 60 24 58Q36 56 46 60zM50 66Q62 62 74 64Q88 66 96 56Q86 60 76 58Q64 56 54 60z" fill="${col(0)}" stroke="${dk}" stroke-width=".5"/><path d="M44 58Q50 54 56 58L54 66H46z" fill="${col(1)}" stroke="${dk}" stroke-width=".4"/>`;
      for (const [x, y] of [[25, 15], [75, 15], [50, 7]]) s += `<path d="M${x} ${y - 4}l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="${col(3)}" stroke="${dk}" stroke-width=".3"/>`;
    } else if (st === 'tropic') { // пальмовые листья плотно обнимают логотип снизу и по бокам
      const palm = (x, y, a, c, k) => { let p = `<g transform="translate(${x} ${y}) rotate(${a}) scale(${k})"><path d="M0 0Q2 -12 0 -24" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`; for (let i = 0; i < 7; i++) { const sd = i % 2 ? 1 : -1, yy = -5 - i * 2.8; p += `<path d="M0 ${yy}Q${sd * 8} ${yy - 5} ${sd * 13} ${yy + 1}Q${sd * 7} ${yy + 1.4} 0 ${yy + 2.6}z" fill="${c}" stroke="${dk}" stroke-width=".35"/>`; } return p + '</g>'; };
      s = palm(30, 70, -48, col(1), 1.05) + palm(70, 70, 48, col(1), 1.05) + palm(26, 66, -20, col(0), 1.15) + palm(74, 66, 20, col(0), 1.15) +
        `<circle cx="27" cy="44" r="3.2" fill="${col(3)}" stroke="${dk}" stroke-width=".4"/><circle cx="73" cy="46" r="2.6" fill="${col(3)}" stroke="${dk}" stroke-width=".4"/>`;
    } else if (st === 'baroque') { // филигранные завитки по углам
      const sw = (x, y, sx, sy) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="${col(0)}" stroke-width="1.5" stroke-linecap="round"><path d="M0 0C8 -2 12 6 6 10C2 12 0 8 3 6"/><path d="M0 0C-2 8 6 12 10 6"/><path d="M6 10C10 16 18 14 20 10"/></g><g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="${col(1)}"><circle cx="20" cy="10" r="1.3"/><circle cx="3" cy="6" r=".9"/></g>`;
      s = sw(17, 12, 1, 1) + sw(83, 12, -1, 1) + sw(17, 68, 1, -1) + sw(83, 68, -1, -1) + `<path d="M30 4Q50 -1 70 4" stroke="${col(0)}" stroke-width="1.2" fill="none"/><circle cx="50" cy="2.6" r="1.6" fill="${col(1)}"/>`;
    } else if (st === 'nordic') { // волны и северные звёзды
      for (let i = 0; i < 3; i++) s += `<path d="M6 ${66 - i * 3}Q17 ${62 - i * 3} 28 ${66 - i * 3}T50 ${66 - i * 3}T72 ${66 - i * 3}T94 ${66 - i * 3}" fill="none" stroke="${col(i % 2)}" stroke-width="1.1" opacity="${1 - i * .25}"/>`;
      for (const [x, y, r] of [[24, 16, 3], [76, 18, 2.4], [32, 8, 1.6], [68, 9, 1.8]]) s += `<path d="M${x} ${y - r * 2}L${x + r * .4} ${y - r * .4}L${x + r * 2} ${y}L${x + r * .4} ${y + r * .4}L${x} ${y + r * 2}L${x - r * .4} ${y + r * .4}L${x - r * 2} ${y}L${x - r * .4} ${y - r * .4}z" fill="${col(2)}" stroke="${dk}" stroke-width=".25"/>`;
    } else if (st === 'arabesque' || st === 'domes' || st === 'mashrabiya') { // восточные мотивы: звезда-розетка (Эр-Рияд), купола с минаретами, резная арка-машрабия — у каждого города свой
      const v = st === 'arabesque' ? 0 : st === 'domes' ? 1 : 2;
      if (v === 0) { const sq = (r, a0) => Array.from({ length: 4 }, (_, k) => { const a = a0 + k * Math.PI / 2; return `${n2(50 + Math.cos(a) * r)} ${n2(38 + Math.sin(a) * r)}`; }).join('L');
        s = `<path d="M${sq(34, Math.PI / 4)}zM${sq(34, 0)}z" fill="${col(1)}" stroke="${col(0)}" stroke-width="1.6" stroke-linejoin="round" fill-rule="nonzero"/><path d="M${sq(27, Math.PI / 4)}zM${sq(27, 0)}z" fill="none" stroke="${col(2)}" stroke-width=".7"/>` +
          Array.from({ length: 8 }, (_, k) => { const a = k * Math.PI / 4; return `<circle cx="${n2(50 + Math.cos(a) * 34)}" cy="${n2(38 + Math.sin(a) * 34)}" r="1.8" fill="${col(0)}" stroke="${dk}" stroke-width=".3"/>`; }).join('');
      } else if (v === 1) { const dome = (x, y, r) => `<path d="M${n2(x - r)} ${y}Q${n2(x - r)} ${n2(y - r * 1.1)} ${x} ${n2(y - r * 1.6)}Q${n2(x + r)} ${n2(y - r * 1.1)} ${n2(x + r)} ${y}z" fill="${col(1)}" stroke="${col(0)}" stroke-width="1.1"/><path d="M${x} ${n2(y - r * 1.6)}V${n2(y - r * 1.6 - 3)}" stroke="${col(0)}" stroke-width=".9"/><circle cx="${x}" cy="${n2(y - r * 1.6 - 3.6)}" r=".9" fill="${col(0)}"/>`;
        const mina = (x) => `<path d="M${x - 2.2} 70V22H${x + 2.2}V70z" fill="${col(2)}" stroke="${col(0)}" stroke-width=".8"/><path d="M${x - 2.6} 22L${x} 13L${x + 2.6} 22z" fill="${col(1)}" stroke="${col(0)}" stroke-width=".8"/><path d="M${x - 3.2} 34H${x + 3.2}M${x - 3.2} 48H${x + 3.2}" stroke="${col(0)}" stroke-width="1.1"/><path d="M${x + .6} 9.6A1.6 1.6 0 1 1 ${x - .8} 11.4A1.2 1.2 0 1 0 ${x + .6} 9.6z" fill="${col(0)}"/>`;
        s = mina(17) + mina(83) + dome(32, 66, 9) + dome(68, 66, 9) + dome(50, 62, 20) + `<path d="M20 66H80V72H20z" fill="${col(2)}" stroke="${col(0)}" stroke-width=".9"/>`;
      } else { const lid = D.add(`<clipPath id="$ID"><path d="M20 74V36Q20 12 50 3Q80 12 80 36V74z"/></clipPath>`); let lat = '';
        for (let k = -8; k <= 8; k++) lat += `<path d="M${50 + k * 7} 0L${50 + k * 7 + 40} 80M${50 + k * 7} 0L${50 + k * 7 - 40} 80"/>`;
        s = `<path d="M20 74V36Q20 12 50 3Q80 12 80 36V74z" fill="${col(1)}"/><g clip-path="url(#${lid})" fill="none" stroke="${col(0)}" stroke-width=".8" opacity=".85">${lat}</g><path d="M20 74V36Q20 12 50 3Q80 12 80 36V74z" fill="none" stroke="${col(0)}" stroke-width="2.2"/><path d="M24 74V37Q24 16 50 8Q76 16 76 37V74" fill="none" stroke="${col(2)}" stroke-width=".7"/>`; }
    } else if (st === 'skyline') { // силуэт небоскрёбов, в центре — самая высокая башня-шпиль
      const T = [[12, 40, 7], [20, 30, 6], [27, 46, 6], [34, 24, 5], [62, 26, 5], [68, 44, 6], [75, 30, 6], [82, 38, 7]]; let tw = '';
      for (const [x, hh, w] of T) { tw += `<path d="M${x} 72V${72 - hh}H${x + w}V72z" fill="${col(1)}" stroke="${col(0)}" stroke-width=".7"/>`; for (let yy = 72 - hh + 3; yy < 70; yy += 4) tw += `<path d="M${x + 1.4} ${yy}H${x + w - 1.4}" stroke="${col(2)}" stroke-width=".7" stroke-dasharray="1 .9" opacity=".8"/>`; }
      s = `<circle cx="50" cy="30" r="27" fill="${col(3)}" opacity="${finish === 'paper' ? .9 : 1}"/>` + tw + `<path d="M50 1L52 26L55 40L57 72H43L45 40L48 26z" fill="${col(1)}" stroke="${col(0)}" stroke-width=".8"/><path d="M8 72H92" stroke="${col(0)}" stroke-width="2"/>`;
    } else if (st === 'sunray') { // ар-деко: солнце из лучей по кругу
      let r = ''; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; r += `<path d="M50 38L${n2(50 + Math.cos(a - .06) * 36)} ${n2(38 + Math.sin(a - .06) * 36)}L${n2(50 + Math.cos(a + .06) * 36)} ${n2(38 + Math.sin(a + .06) * 36)}z"/>`; }
      s = `<g fill="${col(0)}">${r}</g><circle cx="50" cy="38" r="26" fill="none" stroke="${col(1)}" stroke-width="1.4"/>`;
    } else if (st === 'ziggurat') { // ар-деко: ступенчатый зиккурат
      s = `<path d="M14 72V60H22V50H30V40H38V30H62V40H70V50H78V60H86V72z" fill="${col(0)}" stroke="${col(1)}" stroke-width="1.2"/><path d="M26 72V62H34V52H42V42H58V52H66V62H74V72" fill="none" stroke="${col(2)}" stroke-width=".7"/>`;
    } else if (st === 'deco') { // ар-деко: веер лучей и ступенчатые уголки
      let r = ''; for (let k = 0; k < 11; k++) { const a = Math.PI + (k + .5) / 11 * Math.PI; r += `<path d="M50 40L${n2(50 + Math.cos(a - .05) * 48)} ${n2(40 + Math.sin(a - .05) * 44)}L${n2(50 + Math.cos(a + .05) * 48)} ${n2(40 + Math.sin(a + .05) * 44)}z"/>`; }
      s = `<g fill="${col(0)}" opacity=".85">${r}</g><path d="M16 70V62H20V58H24V54M84 70V62H80V58H76V54" stroke="${col(1)}" stroke-width="1.4" fill="none"/>`;
    } else if (st === 'hexcut') { // плоский гранёный шестиугольник-значок с заклёпками (без «куба»)
      const hx = (r, cy) => `M${n2(50 - r)} ${cy}L${n2(50 - r / 2)} ${n2(cy - r * .87)}H${n2(50 + r / 2)}L${n2(50 + r)} ${cy}L${n2(50 + r / 2)} ${n2(cy + r * .87)}H${n2(50 - r / 2)}z`;
      s = `<path d="${hx(42, 40)}" fill="${col(1)}" stroke="${dk}" stroke-width=".6"/><path d="${hx(37, 40)}" fill="${finish === 'paper' ? mix(th.bg, '#000000', .2) : col(0)}" stroke="${col(2)}" stroke-width=".8"/>`;
      for (const [x, y] of [[29, 9], [71, 9], [29, 71], [71, 71], [10, 40], [90, 40]]) s += `<circle cx="${x}" cy="${y}" r="1.5" fill="${col(2)}" stroke="${dk}" stroke-width=".35"/>`;
    } else if (st === 'vitrage') { // витраж-роза (Кёльнский собор): стёкла, свинцовые перемычки, кольцо медальонов
      const G = finish === 'paper' ? ['#2fa58a', '#8fdcc1', '#1d6f8c', '#c9efe0', '#5bbf8f'].map(c => hueRot(c, edHue(th))) : null, gc = (i) => G ? G[(i + edYear(th)) % G.length] : col(i);
      const R = 34, cy = 40; let p = '';
      for (let k = 0; k < 12; k++) { const a0 = k / 12 * Math.PI * 2, a1 = (k + 1) / 12 * Math.PI * 2;
        p += `<path d="M50 ${cy}L${n2(50 + Math.cos(a0) * 26)} ${n2(cy + Math.sin(a0) * 26)}A26 26 0 0 1 ${n2(50 + Math.cos(a1) * 26)} ${n2(cy + Math.sin(a1) * 26)}z" fill="${gc(k)}"/>`;
        const am = (a0 + a1) / 2; p += `<circle cx="${n2(50 + Math.cos(am) * 30)}" cy="${n2(cy + Math.sin(am) * 30)}" r="3.4" fill="${gc(k + 2)}" stroke="#20302c" stroke-width=".9"/>`; }
      s = `<circle cx="50" cy="${cy}" r="${R}" fill="#20302c"/>` + p + `<g fill="none" stroke="#20302c" stroke-width="1"><circle cx="50" cy="${cy}" r="26"/><circle cx="50" cy="${cy}" r="12"/>${Array.from({ length: 12 }, (_, k) => { const a = k / 12 * Math.PI * 2; return `<path d="M50 ${cy}L${n2(50 + Math.cos(a) * 26)} ${n2(cy + Math.sin(a) * 26)}"/>`; }).join('')}</g><circle cx="50" cy="${cy}" r="${R}" fill="none" stroke="${finish === 'paper' ? '#d8dcd9' : col(1)}" stroke-width="1.6"/>`;
    } else if (st === 'emblem') { // знак города (своё животное) четырежды вокруг логотипа и кольцо из цветов флага
      const lm2 = landmarkOf(th.city), pal = FLAG_PAL[FLAG_OF[lm2]] || C, an2 = AN[lm2];
      for (let k = 0; k < pal.length; k++) { const a0 = -Math.PI + k / pal.length * Math.PI * 2, a1 = a0 + Math.PI * 2 / pal.length;
        s += `<path d="M${n2(50 + Math.cos(a0) * 38)} ${n2(38 + Math.sin(a0) * 36)}A38 36 0 0 1 ${n2(50 + Math.cos(a1) * 38)} ${n2(38 + Math.sin(a1) * 36)}" stroke="${finish === 'paper' ? pal[k] : col(k)}" stroke-width="4" fill="none"/>`; }
      s += `<ellipse cx="50" cy="38" rx="38" ry="36" fill="none" stroke="${dk}" stroke-width=".5"/><ellipse cx="50" cy="38" rx="41" ry="39" fill="none" stroke="${dk}" stroke-width=".5"/>`;
      if (an2) for (const [x, y, sc] of [[16, 16, .26], [84, 16, .26], [14, 58, .22], [86, 58, .22]]) s += `<g transform="translate(${x} ${y}) scale(${x > 50 ? -sc : sc} ${sc}) translate(-50 -40)">${an2(finish === 'paper' ? pal[0] === '#f4f4f4' ? pal[1] : pal[0] : col(0), dk, '#ffffff', seed)}</g>`;
    } else if (st === 'snow') { // снежинки и ледяной венок
      const flake = (x, y, r) => { let p = ''; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, X = n2(x + Math.cos(a) * r), Y = n2(y + Math.sin(a) * r), bx = x + Math.cos(a) * r * .55, by = y + Math.sin(a) * r * .55;
        p += `<path d="M${x} ${y}L${X} ${Y}M${n2(bx)} ${n2(by)}L${n2(bx + Math.cos(a + .7) * r * .3)} ${n2(by + Math.sin(a + .7) * r * .3)}M${n2(bx)} ${n2(by)}L${n2(bx + Math.cos(a - .7) * r * .3)} ${n2(by + Math.sin(a - .7) * r * .3)}"/>`; } return p; };
      s = `<g fill="none" stroke="${col(1)}" stroke-width="1.3" stroke-linecap="round">${flake(16, 22, 8)}${flake(84, 24, 7)}${flake(22, 58, 6)}${flake(80, 58, 6.5)}${flake(50, 6, 4.5)}</g>` +
        `<circle cx="50" cy="38" r="35" fill="none" stroke="${col(0)}" stroke-width="1.4" stroke-dasharray="1.5 3"/>`;
    } else if (st === 'petals') { // кольцо лепестков
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, x = 50 + Math.cos(a) * 36, y = 39 + Math.sin(a) * 33; s += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="3.6" ry="7.4" transform="rotate(${n2(a * 180 / Math.PI + 90)} ${n2(x)} ${n2(y)})" fill="${col(k % 2)}" stroke="${dk}" stroke-width=".35"/>`; }
      for (let k = 0; k < 16; k++) { const a = (k + .5) / 16 * Math.PI * 2; s += `<circle cx="${n2(50 + Math.cos(a) * 30)}" cy="${n2(39 + Math.sin(a) * 27.5)}" r="1.3" fill="${col(3)}"/>`; }
    } else if (st === 'chevron') { // шевроны по бокам и звезда-одиночка
      for (let i = 0; i < 4; i++) { const y = 24 + i * 9; s += `<path d="M4 ${y}L14 ${y + 6}L4 ${y + 12}V${y + 8}L9 ${y + 6}L4 ${y + 4}zM96 ${y}L86 ${y + 6}L96 ${y + 12}V${y + 8}L91 ${y + 6}L96 ${y + 4}z" fill="${col(i % 2 ? 2 : 0)}" stroke="${dk}" stroke-width=".3"/>`; }
      s += `<path d="M50 0l3.5 7.4 8 .9-6 5.5 1.7 8L50 17.7 42.8 21.8l1.7-8-6-5.5 8-.9z" fill="${col(3)}" stroke="${dk}" stroke-width=".5"/>`;
    } else if (st === 'compass') { // огранённая восьмиконечная звезда за логотипом
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 30 : 42, a1 = a - Math.PI / 8, a2 = a + Math.PI / 8;
        s += `<path d="M50 38L${n2(50 + Math.cos(a1) * 12)} ${n2(38 + Math.sin(a1) * 12)}L${n2(50 + Math.cos(a) * r)} ${n2(38 + Math.sin(a) * r)}z" fill="${col(0)}" stroke="${dk}" stroke-width=".3"/><path d="M50 38L${n2(50 + Math.cos(a) * r)} ${n2(38 + Math.sin(a) * r)}L${n2(50 + Math.cos(a2) * 12)} ${n2(38 + Math.sin(a2) * 12)}z" fill="${col(1)}" stroke="${dk}" stroke-width=".3"/>`; }
    } else if (st === 'lattice') { // плитка-азулежу: четырёхлистники в квадратах
      const cl = D.add(`<clipPath id="$ID"><circle cx="50" cy="38" r="38"/></clipPath>`); let t = '';
      for (let y = 0; y < 80; y += 12) for (let x = 2; x < 100; x += 12) t += `<rect x="${x}" y="${y}" width="12" height="12" fill="${col(1)}" stroke="${col(0)}" stroke-width=".6"/><path d="M${x + 6} ${y + 1.5}Q${x + 9} ${y + 6} ${x + 6} ${y + 10.5}Q${x + 3} ${y + 6} ${x + 6} ${y + 1.5}zM${x + 1.5} ${y + 6}Q${x + 6} ${y + 3} ${x + 10.5} ${y + 6}Q${x + 6} ${y + 9} ${x + 1.5} ${y + 6}z" fill="${col(0)}"/><circle cx="${x + 6}" cy="${y + 6}" r="1.2" fill="${col(3)}"/>`;
      s = `<g clip-path="url(#${cl})">${t}</g><circle cx="50" cy="38" r="38" fill="none" stroke="${col(0)}" stroke-width="2"/>`;
    } else if (st === 'gears') { // шестерни по бокам
      const gear = (x, y, r, n, c) => { let p = ''; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; p += `<rect x="${n2(x - 2)}" y="${n2(y - r - 3)}" width="4" height="5" transform="rotate(${n2(a * 180 / Math.PI)} ${x} ${y})" fill="${c}"/>`; }
        return p + `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${dk}" stroke-width=".5"/><circle cx="${x}" cy="${y}" r="${n2(r * .4)}" fill="${finish === 'paper' ? '#fff' : col(2)}" stroke="${dk}" stroke-width=".5"/>`; };
      s = gear(14, 30, 11, 10, col(0)) + gear(86, 46, 12, 11, col(1)) + gear(70, 8, 6, 8, col(2));
    } else if (st === 'crown') { // корона над логотипом и звёзды
      s = `<path d="M30 14L36 2L43 10L50 0L57 10L64 2L70 14L68 20H32z" fill="${col(0)}" stroke="${dk}" stroke-width=".6"/><path d="M32 17H68" stroke="${col(2)}" stroke-width="1"/>` +
        [36, 50, 64].map(x => `<circle cx="${x}" cy="${x === 50 ? 2 : 4}" r="1.8" fill="${col(1)}" stroke="${dk}" stroke-width=".3"/>`).join('') +
        [[12, 40], [88, 40], [18, 62], [82, 62]].map(([x, y]) => `<path d="M${x} ${y - 4}l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="${col(0)}" stroke="${dk}" stroke-width=".3"/>`).join('');
    } else if (st === 'zigzag') { // степной орнамент: завитки «бараньи рога» сверху и зигзаг снизу
      const horn = (x, sx) => `<path d="M${x} 16c${sx * 6} -10 ${sx * 18} -8 ${sx * 16} 2c${sx * -1} 5 ${sx * -7} 5 ${sx * -7} 0" fill="none" stroke="${col(0)}" stroke-width="2.2" stroke-linecap="round"/>`;
      s = horn(50, -1) + horn(50, 1) + horn(28, -1) + horn(72, 1) + `<path d="M8 70L14 64L20 70L26 64L32 70L38 64L44 70L50 64L56 70L62 64L68 70L74 64L80 70L86 64L92 70" fill="none" stroke="${col(1)}" stroke-width="2"/>`;
    } else if (st === 'shells') { // паруса-раковины веером за логотипом
      for (let k = 0; k < 5; k++) { const a = -70 + k * 35; s += `<path d="M50 66Q${n2(50 + Math.sin(a * Math.PI / 180) * 30)} 20 ${n2(50 + Math.sin(a * Math.PI / 180) * 46)} ${n2(38 - Math.cos(a * Math.PI / 180) * 30)}Q${n2(50 + Math.sin(a * Math.PI / 180) * 20)} 40 50 66z" fill="${col(k % 2)}" stroke="${dk}" stroke-width=".5"/>`; }
      s += `<path d="M6 70Q28 64 50 70T94 70" fill="none" stroke="${col(2)}" stroke-width="2"/>`;
    } else if (st === 'mountains') { // горная гряда и солнце
      s = `<circle cx="50" cy="26" r="14" fill="${col(3)}"/><path d="M4 70L22 38L32 52L50 22L66 48L76 36L96 70z" fill="${col(1)}" stroke="${dk}" stroke-width=".6"/><path d="M50 22L44 33L50 30L55 34zM22 38L18 45L23 43L26 46z" fill="${col(2)}"/>`;
    } else { // laurel
      for (const k of [-1, 1]) for (let i = 0; i < 9; i++) { const t = i / 8, a = (210 - t * 125) * Math.PI / 180, x = 50 - k * Math.cos(a) * 38, yy = 42 - Math.sin(a) * 34;
        s += `<ellipse cx="${n2(x)}" cy="${n2(yy)}" rx="2" ry="4.6" transform="rotate(${n2(k * (t * 75 - 15))} ${n2(x)} ${n2(yy)})" fill="${col(i % 2)}" stroke="${dk}" stroke-width=".3"/>`; }
    }
    return `<g${mir}>${s}</g>`;
  }
  // надпись Мейджора: город шрифтом стиля + год. Раскладка разная: снизу/сверху, ровно/наискосок/дугой, крупно/мелко
  function layoutOf(key) {
    const h = h32('lay|' + key), v = h % 9, j = ((h >>> 8) % 7 - 3);
    return [
      { y: 82, rot: 0, k: 1 }, { y: 81, rot: -7 + j * .5, k: .95 }, { y: 82, rot: 6 + j * .4, k: .9 },
      { y: 19, rot: -5 + j * .6, k: .9, top: 1 }, { y: 80, arc: 1, k: 1 }, { y: 86, rot: -9, k: .72, x: 60 },
      { y: 82, rot: 0, k: 1.1 }, { y: 20, arc: -1, k: .95, top: 1 }, { y: 84, rot: 3 + j * .5, k: .8, x: 44 }
    ][v];
  }
  function wordmark(D, ctx, th, finish, lay, seed) {
    const st = styleOf(th), font = STYLE_FONT[st], city = String(th.city || th.tag || 'MAJOR');
    const cap = st === 'folk' || st === 'baroque' || st === 'tropic' || st === 'vitrage' ? city.charAt(0).toUpperCase() + city.slice(1).toLowerCase() : city.toUpperCase();
    const fill = finish === 'paper' ? th.acc : mat(D, ctx, finish, th.acc, seed + 9), edge = finish === 'gold' ? '#4d3300' : '#141414';
    const len = Math.max(4, cap.length), fs = Math.min(15, 76 / (len * .55)), w = Math.min(74, len * fs * .56), y = lay.y, cx = lay.x || 50;
    let main;
    if (lay.arc) {
      const a = D.add(`<path id="$ID" d="${lay.arc > 0 ? `M8 ${y - 9}Q50 ${y + 9} 92 ${y - 9}` : `M8 ${y + 9}Q50 ${y - 9} 92 ${y + 9}`}"/>`);
      const fa = Math.min(fs * .95, 80 / (len * .8)), t = (stroke, sw) => `<text font-family="${font},serif" font-size="${n2(fa)}" fill="${stroke ? 'none' : fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : ''}><textPath href="#${a}" startOffset="50%" text-anchor="middle">${esc(cap)}</textPath></text>`;
      main = t('#ffffff', 3.4) + t(edge, 1.6) + t(null);
    } else {
      const t = (stroke, sw) => `<text x="${cx}" y="${y}" text-anchor="middle" font-family="${font},serif" font-size="${n2(fs)}" textLength="${n2(w)}" lengthAdjust="spacingAndGlyphs" fill="${stroke ? 'none' : fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : ''}>${esc(cap)}</text>`;
      main = t('#ffffff', 3.4) + t(edge, 1.6) + t(null);
    }
    const yy = lay.top ? (lay.arc ? y - 5 : y - fs * .82) : lay.arc ? y + 4 : y + fs * .48, half = lay.arc ? 30 : w / 2;
    const sub = `<text x="${n2(cx + half - 2)}" y="${n2(yy)}" text-anchor="end" font-family="${font},serif" font-size="${n2(fs * .42)}" fill="${fill}" stroke="${edge}" stroke-width=".5" paint-order="stroke">${esc(th.year || '')}</text>` +
      `<text x="${n2(cx - half + 2)}" y="${n2(yy)}" font-family="StkBebas,Arial" font-size="${n2(fs * .32)}" letter-spacing=".6" fill="${edge}" stroke="#fff" stroke-width=".8" paint-order="stroke">${esc(th.org)}</text>`;
    return `<g transform="translate(${cx} ${y}) rotate(${lay.rot || 0}) scale(${lay.k}) translate(${-cx} ${-y})">${main}${sub}</g>`;
  }
  // всё содержимое уменьшается до безопасной зоны, чтобы с белой высечкой ничего не выходило за край
  // v128: подложка выпуска — у каждого года своя форма и цвет, поэтому стикеры одного города разных лет не совпадают
  function backdrop(D, ctx, th, finish, seed) {
    const yr = edYear(th), shape = ['circle', 'hex', 'shield', 'burst', 'badge', 'ticket'][(h32('bd|' + th.city) + yr) % 6];
    const c = finish === 'paper' ? mix(th.acc, '#ffffff', .62) : mat(D, ctx, finish, mix(th.acc, '#ffffff', .3), seed + 31);
    return `<g transform="translate(50 40) scale(.84) translate(-50 -50)" opacity="${finish === 'paper' ? .9 : .7}"><path d="${shapePath(shape, 3)}" fill="${c}"/><path d="${shapePath(shape, 6)}" fill="none" stroke="${mix(th.acc, '#000000', .2)}" stroke-width="1.2" stroke-dasharray="${yr % 2 ? '0' : '2 1.6'}"/></g>`;
  }
  const SAFE = (s) => `<g transform="translate(50 50) scale(.86) translate(-50 -50)">${s}</g>`;

  // ---------------------------------------------------------------- стикер команды: логотип + орнамент Мейджора + надпись города
  function teamSticker(th, team, logo, finish, ctx, label) {
    th = edTheme(th);
    const D = ctx.D, h = h32('tm|' + team + th.city), [c1] = teamColors(team), f = F(D), centred = /hexcut|vitrage|deco|sunray|ziggurat|compass|lattice|petals/.test(styleOf(th));
    let lay = layoutOf('t' + team + th.city + th.year);
    // у центрированных подложек (шестиугольник, витраж, веер) надпись не идёт наверх — логотип остаётся ровно в центре фигуры
    if (centred && lay.top) lay = layoutOf('t2' + team + th.city + th.year).top ? { y: 82, rot: -5, k: .95 } : layoutOf('t2' + team + th.city + th.year);
    const dy = lay.top ? 10 : 0;
    const ini = String(team).replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase() || 'T';
    const big = styleOf(th) === 'vitrage' ? 46 : lay.top ? 48 : lay.k < .85 ? 60 : 56;
    const mark = logo ? logoIn(D, ctx, finish, logo, 50, 38 + dy, big, h)
      : `<text x="50" y="${50 + dy}" text-anchor="middle" font-family="${DISPLAY[(h >>> 3) % 4]}" font-size="30" fill="${mat(D, ctx, finish, c1, h)}" stroke="#141414" stroke-width="1.6" paint-order="stroke" filter="url(#${f.ring})">${esc(ini)}</text>`;
    const body = `<g filter="url(#${f.cut})">${SAFE(backdrop(D, ctx, th, finish, h) + ornament(D, ctx, th, finish, h) + mark + wordmark(D, ctx, th, finish, lay, h))}</g>`;
    return `<svg class="v84-stk-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}"><defs>${D.d.join('')}</defs>${body}</svg>`;
  }

  // ---------------------------------------------------------------- рисунки от руки и детали CS (поле −5…5, рисуются штрихом и/или заливкой)
  // [путь штриха, путь заливки, толщина]
  const DOOD = {
    sstar: ['M0 -5L1.4 -1.6L5 -1.4L2.2 1L3.2 4.8L0 2.6L-3.2 4.8L-2.2 1L-5 -1.4L-1.4 -1.6Z M3.6 -4.4l.8 1.6 1.6.3', '', 1],
    star: ['', 'M0 -5L1.4 -1.6L5 -1.4L2.2 1L3.2 4.8L0 2.6L-3.2 4.8L-2.2 1L-5 -1.4L-1.4 -1.6Z', 0],
    hatchHeart: ['M0 4.5C-6 0 -4.5 -5.4 0 -2C4.5 -5.4 6 0 0 4.5Z M-3.4 -2.4L1.2 2.2M-1.8 -3.2L2.6 1.2M.6 -2.4L3.6 .4M-4 -.4L-.6 3', '', .8],
    heart: ['', 'M0 4.5C-6 0 -4.5 -5.4 0 -2C4.5 -5.4 6 0 0 4.5Z', 0],
    heart2: ['M0 4.5C-6 0 -4.5 -5.4 0 -2C4.5 -5.4 6 0 0 4.5Z M0 3.2C-4.4 0 -3.4 -3.8 0 -1', '', .9],
    zig: ['M-4 -4.4H3.4L-3 -.6H3.6L-2.6 3.2H4', '', 1.2],
    arrow: ['M-4.4 4.4Q-3.6 -3 4 -4.2M1 -5.4L4.2 -4.2L2.4 -1.2', '', 1.1],
    arrowX: ['M-5 5L4 -4M.4 -4.6H4.4V-.6M-3.2 1.4L-1.4 3.2M-4.6 2.8L-2.8 4.6', '', 1.1],
    sparkle: ['', 'M0 -5Q.6 -.6 5 0Q.6 .6 0 5Q-.6 .6 -5 0Q-.6 -.6 0 -5Z', 0],
    sparkles: ['M-1 -5Q-.6 -1.6 2.4 -1Q-.6 -.4 -1 3Q-1.4 -.4 -4.4 -1Q-1.4 -1.6 -1 -5Z M3.4 1.6Q3.6 3.2 5 3.4Q3.6 3.6 3.4 5Q3.2 3.6 1.8 3.4Q3.2 3.2 3.4 1.6Z', '', .8],
    burst: ['M-2.4 -4.2L-1.4 -2.2M2.4 -4.2L1.4 -2.2M-4.6 0H-2.4M4.6 0H2.4M-2.6 4.2L-1.4 2.4M2.6 4.2L1.4 2.4', '', 1.1],
    excl: ['M0 -5V1.4M0 4.2h.01', '', 1.8],
    quest: ['M-2.4 -2.6Q-2.2 -5 .2 -5Q2.8 -5 2.6 -2.6Q2.4 -1 0 .2V1.6M0 4.2h.01', '', 1.4],
    bubble: ['M-5 -1Q-5 -4.6 0 -4.6Q5 -4.6 5 -1Q5 2.6 0 2.6L-3.2 4.8L-2.4 2.2Q-5 1.4 -5 -1Z M-2.2 -1h.01M0 -1h.01M2.2 -1h.01', '', 1],
    warn: ['M0 -4.6L4.8 4H-4.8Z M0 -1.4V1.4M0 2.8h.01', '', 1],
    play: ['M0 -4.8A4.8 4.8 0 1 1 -.1 -4.8M-.4 -3.6A3.6 3.6 0 1 0 0 -3.6', 'M-1.2 -1.8L1.8 0L-1.2 1.8Z', .9],
    xmark: ['M-4 -4L4 4M4 -4L-4 4', '', 1.8],
    gcrown: ['M-5 3.4L-5 -3.6L-2.4 .2L0 -4.8L2.4 .2L5 -3.6L5 3.4Z M-5 -4.8h.01M0 -6h.01M5 -4.8h.01', '', 1.1],
    crown: ['', 'M-4.6 3L-5 -3.4L-2.2 -.4L0 -4.6L2.2 -.4L5 -3.4L4.6 3Z', 0],
    loop: ['M-5 1.6C-3.6 -4 -.6 4 0 -.4C.6 -4.6 -2.6 -3.6 -1 -.4C.6 3 3.6 2 5 -2', '', 1],
    spiral: ['M0 0Q1.4 -1 .8 -2Q-.6 -3.4 -2.2 -1.6Q-3.6 .4 -1.6 2.4Q.8 4.4 3.4 2Q5.6 -.6 3.6 -3.6', '', 1],
    wave: ['M-5 -1Q-3.6 -3.4 -2.2 -1T.6 -1T3.4 -1T5.6 -1M-5 2Q-3.6 -.4 -2.2 2T.6 2T3.4 2', '', .9],
    bolt: ['M1.4 -5L-2.6 .6H.6L-1.4 5L3 -1H-.2Z', '', 1],
    flame: ['', 'M0 4.4C-4.4 4.4 -4.4 -1 -.6 -5C-.6 -1.6 1.8 -1.6 1.4 -4C4.8 -.6 3.8 4.4 0 4.4Z', 0],
    drop: ['', 'M0 -5Q3.6 0 0 3.2Q-3.6 0 0 -5Z', 0],
    halo: ['M-4.8 0A4.8 1.6 0 1 0 4.8 0A4.8 1.6 0 1 0 -4.8 0', '', 1],
    smile: ['M0 -4.2A4.2 4.2 0 1 1 -.1 -4.2M-2 .8Q0 2.8 2 .8M-1.4 -1.2h.01M1.4 -1.2h.01', '', 1],
    skull: ['', 'M-3.6 -.4Q-3.6 -4.8 0 -4.8Q3.6 -4.8 3.6 -.4V1.6H2V3.6H-2V1.6H-3.6Z', 0],
    wing: ['', 'M5 1C2 -5 -4 -5 -6 -2C-3 -2.6 -2 -1 -4 .4C-1 -.4 0 1 -1.6 2.4C1.4 1.6 3 2.6 5 1Z', 0],
    // CS: прицелы, гранаты, бомба, нож, пуля, хедшот
    cross: ['M0 -5V-1.6M0 1.6V5M-5 0H-1.6M1.6 0H5M0 0h.01', '', 1],
    crossT: ['M0 1.6V5M-5 0H-1.6M1.6 0H5M0 0h.01', '', 1],
    crossC: ['M0 -3.4A3.4 3.4 0 1 1 -.1 -3.4M0 -5.6V-2M0 2V5.6M-5.6 0H-2M2 0H5.6', '', .8],
    scope: ['M0 -4.6A4.6 4.6 0 1 1 -.1 -4.6M0 -4.6V4.6M-4.6 0H4.6', '', .7],
    dotC: ['M0 -3A3 3 0 1 1 -.1 -3', 'M-.9 0A.9 .9 0 1 0 .9 0A.9 .9 0 1 0 -.9 0', .9],
    nade: ['M1 -2.6Q3.6 -3 3 -.4M-2 -4.4A1 1 0 1 1 -2.1 -4.4', 'M-3.2 1A3.2 3.4 0 1 0 3.2 1A3.2 3.4 0 1 0 -3.2 1ZM-1.4 -3H1.4V-1.8H-1.4Z', .7],
    molly: ['', 'M-1 -2V-3.6H1V-2L2.4 0V5H-2.4V0ZM0 -4Q-1.8 -5.4 0 -7.4Q1.8 -5.4 0 -4Z', 0],
    c4: ['M-4.6 -2.8h9.2v5.6h-9.2zM-2.8 -1h.01M-1.2 -1h.01M.4 -1h.01M-2.8 .9h.01M-1.2 .9h.01M.4 .9h.01M2.6 -2.8Q4.2 -5.4 .8 -5.2', '', .9],
    bullet: ['', 'M-1.5 5V-1.4Q-1.5 -4.8 0 -5.4Q1.5 -4.8 1.5 -1.4V5Z', 0],
    knife: ['M-4.8 4.6L-1.6 1.4', 'M-1.6 1.4Q1.8 -3 5 -4.6Q3.8 -.8 .2 2.6Z', 1.4],
    hs: ['M0 -3.4A3.4 3.4 0 1 1 -.1 -3.4M0 -5.6V-2M0 2V5.6M-5.6 0H-2M2 0H5.6', 'M-1.6 -.4Q-1.6 -2.2 0 -2.2Q1.6 -2.2 1.6 -.4V.6H.9V1.6H-.9V.6H-1.6Z', .7]
  };
  const DK = Object.keys(DOOD), CSD = ['cross', 'crossT', 'crossC', 'scope', 'dotC', 'nade', 'molly', 'c4', 'bullet', 'knife', 'hs'];
  const TAGS = ['HS', 'ACE', 'GG', 'EZ', '1v5', '#1', 'GL HF', 'WP', '4K', 'MVP', '1TAP', 'CLUTCH'];

  // эффекты букв
  const LFX = ['bigFirst', 'wingFirst', 'crownMid', 'circleLast', 'tailLast', 'loopFirst', 'starDot', 'caps', 'spaced', 'crossLast', 'none'];
  // почерк: шрифт закреплён за игроком (иногда меняется); росчерк, наклон, рисунки и эффекты — свои на каждом Мейджоре
  function handOf(nick, major) {
    const base = h32('sig|' + String(nick).toLowerCase()), m = h32('maj|' + nick + '|' + major), m2 = h32('maj2|' + major + '|' + nick);
    const swap = m % 10 < 3;
    const pick = (k) => (k % 3 === 0 ? CSD[(k >>> 4) % CSD.length] : DK[(k >>> 4) % DK.length]);
    const nd = 1 + (m2 % 2);
    const dood = []; for (let i = 0; i < nd; i++) dood.push(pick(h32('dd' + i + '|' + m2)));
    if ((base >>> 3) % 3 === 0) dood[0] = pick(base); // «фирменный» рисунок игрока, но не всегда
    return {
      font: SIG[(swap ? base + 1 + (m >>> 3) % (SIG.length - 1) : base) % SIG.length],
      flourish: (m >>> 5) % 18, rot: -13 + (m >>> 9) % 17, slant: ((m >>> 12) % 7 - 3) * 2, dood,
      slots: [(m2 >>> 6) % 6, (m2 >>> 9) % 6, (m2 >>> 12) % 6],
      tag: (m2 >>> 15) % 5 === 0 ? ((base >>> 7) % 4 === 0 ? String(10 + base % 90) : TAGS[(m2 >>> 18) % TAGS.length]) : null,
      ink: [0, 0, 0, 1, 1, 2, 2, 3, 3, 0][h32('ink|' + nick + '|' + major) % 10],
      abbr: -1, // v128: ник всегда целиком, без сокращений
      lfx: LFX[(base >>> 4) % 5 === 0 ? (m >>> 18) % LFX.length : (base >>> 8) % LFX.length], lfx2: (m >>> 20) % 3 === 0 ? LFX[(m >>> 22) % 7] : null
    };
  }
  function signature(D, nick, finish, ctx, th, col, major, tcol) {
    const hd = handOf(nick, major || th.city + th.year), Fn = hd.font, seed = h32('ink|' + nick + major);
    let txt = String(nick);
    // иногда игрок расписывается сокращённо: kyousuke → ksk / Kyo / k.e
    if (hd.abbr >= 0) { const L = txt.replace(/[^A-Za-z0-9]/g, ''), cons = L[0] + L.slice(1).replace(/[aeiouy0-9]/gi, '');
      txt = hd.abbr === 0 ? cons.slice(0, 3).toLowerCase() : hd.abbr === 1 ? L[0].toUpperCase() + L.slice(1, 3).toLowerCase() : L[0] + '.' + L[L.length - 1]; }
    if (hd.lfx === 'caps') txt = txt.toUpperCase();
    const len = Math.max(3, txt.length), size = Math.max(13, Math.min(30, 165 / len)) * Fn[1] * (hd.lfx === 'caps' ? .85 : 1);
    const y = 42;
    // цвет чернил: чёрный, белый с чёрным контуром, цвет команды (ярко или бледно)
    const tc = tcol || col || '#3a7bd5', paperInk = [col || '#151515', '#ffffff', tc, mix(tc, '#ffffff', .45)][hd.ink];
    const ug = (stops, x1, y1, x2, y2) => 'url(#' + D.add(`<linearGradient id="$ID" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(q => `<stop offset="${q[0]}" stop-color="${q[1]}"/>`).join('')}</linearGradient>`) + ')';
    // градиент в координатах стикера: тонкие прямые штрихи (росчерки) тоже окрашиваются, а не пропадают
    const ink = finish === 'gold' ? ug(ctx.GOLD, 30, 18, 62, 66) : finish === 'holo' ? ug(ctx.HOLO, 10, 30, 90, 50) : finish === 'glitter' ? glitterFill(D, hd.ink === 1 ? '#e6e6e6' : hd.ink >= 2 ? tc : (col || th.acc), seed) : (paperInk || '#151515');
    const edge = finish === 'gold' ? '#4d3300' : '#ffffff', edge2 = '#141414';
    const w = Math.min(76, len * size * .46), x1 = 50 - w / 2, x2 = 50 + w / 2, R = (a, b) => n2(a + (seed >>> 3) % 7 * (b - a) / 6);
    // 18 видов росчерка (часть — без росчерка вовсе)
    const FL = [
      '', '', '',
      `M${n2(x1 - 2)} ${y + 7}C${n2(x1 + w * .3)} ${y + 14} ${n2(x2 - w * .2)} ${y + 3} ${n2(x2 + 5)} ${y + 5}`,
      `M${n2(x1)} ${y + 6}Q50 ${y + 15} ${n2(x2)} ${y + 4}Q${n2(x2 + 7)} ${y + 1} ${n2(x2 - 3)} ${y - 4}`,
      `M${n2(x1 + 3)} ${y + 9}C${n2(x1 - 6)} ${y + 1} ${n2(x1 + 5)} ${y - 6} ${n2(x1 + 11)} ${y + 2}S${n2(x2)} ${y + 12} ${n2(x2 + 4)} ${y + 5}`,
      `M${n2(x1 + 6)} ${y + 8}H${n2(x2 + 2)}M${n2(x1 + 10)} ${y + 10.6}H${n2(x2 - 4)}`,
      `M${n2(x1 - 3)} ${y - 2}C${n2(x1 - 8)} ${y + 12} ${n2(x2 + 8)} ${y + 13} ${n2(x2 + 2)} ${y - 6}`,
      `M${n2(x1 + 4)} ${y + 8}L${n2(x1 + 4 + w * .15)} ${y + 5}L${n2(x1 + 4 + w * .3)} ${y + 9}L${n2(x1 + 4 + w * .45)} ${y + 5}L${n2(x1 + 4 + w * .6)} ${y + 9}L${n2(x1 + 4 + w * .75)} ${y + 5}`,
      `M${n2(x1)} ${y + 7}Q${n2(x1 + w * .12)} ${y + 3} ${n2(x1 + w * .25)} ${y + 7}T${n2(x1 + w * .5)} ${y + 7}T${n2(x1 + w * .75)} ${y + 7}T${n2(x2)} ${y + 7}`,
      `M${n2(x1 + 2)} ${y + 6}C${n2(x1 + w * .5)} ${y + 12} ${n2(x2 - 4)} ${y + 12} ${n2(x2 - 2)} ${y + 6}C${n2(x2)} ${y + 2} ${n2(x2 - 8)} ${y + 2} ${n2(x2 - 6)} ${y + 8}Q${n2(x2 - 4)} ${y + 12} ${n2(x2 + 4)} ${y + 10}`,
      `M${n2(x1 + w * .1)} ${y + 6}L${n2(x2 - w * .1)} ${y + 6}`,
      `M${n2(x2 - 2)} ${y - 1}C${n2(x2 + 9)} ${y - 4} ${n2(x2 + 7)} ${y + 12} ${n2(x1 + w * .35)} ${y + 12}Q${n2(x1)} ${y + 12} ${n2(x1 - 2)} ${y + 9}`,
      `M${n2(x1 - 2)} ${y + 9}Q50 ${y + 4} ${n2(x2 + 2)} ${y + 9}M${n2(x1 + 4)} ${y + 12}Q50 ${y + 7.4} ${n2(x2 - 4)} ${y + 12}`,
      `M${n2(x1)} ${y + 8}H${n2(x1 + w * .18)}M${n2(x1 + w * .28)} ${y + 8}H${n2(x1 + w * .46)}M${n2(x1 + w * .56)} ${y + 8}H${n2(x1 + w * .74)}M${n2(x1 + w * .84)} ${y + 8}H${n2(x2)}`,
      `M${n2(x1 + 2)} ${y + 8}L${n2(x2 - 6)} ${y + 8}L${n2(x2 - 9)} ${y + 5.4}M${n2(x2 - 6)} ${y + 8}L${n2(x2 - 9)} ${y + 10.6}`,
      `M${n2(x1)} ${y + 5}C${n2(x1 + 8)} ${y + 13} ${n2(x1 + 16)} ${y + 1} ${n2(x1 + 22)} ${y + 9}S${n2(x2 - 4)} ${y + 6} ${n2(x2 + 3)} ${y + 2}`,
      `M${n2(x1 - 3)} ${y + 3}Q${n2(x1 - 6)} ${y + 11} ${n2(x1 + 6)} ${y + 10}L${R(x2 - 10, x2 + 2)} ${y + 9}`
    ];
    const fl = FL[hd.flourish], sw = hd.flourish === 6 || hd.flourish === 13 ? 1.1 : 1.5;
    let spans = esc(txt);
    const big = hd.lfx === 'bigFirst' || hd.lfx === 'loopFirst';
    if (big) spans = `<tspan font-size="${n2(size * 1.5)}" dy="${n2(size * .12)}">${esc(txt[0])}</tspan><tspan dy="${n2(-size * .12)}">${esc(txt.slice(1))}</tspan>`;
    const ls = hd.lfx === 'spaced' ? ` letter-spacing="${n2(size * .12)}"` : '';
    const t = (stroke, sw2) => `<text x="50" y="${y}" text-anchor="middle" font-family="${Fn[0]},cursive" font-size="${n2(size)}"${ls} fill="${stroke ? 'none' : ink}"${stroke ? ` stroke="${stroke}" stroke-width="${sw2}" stroke-linejoin="round"` : ''} textLength="${n2(w)}" lengthAdjust="spacingAndGlyphs" transform="skewX(${n2(-Fn[2] * 100 + hd.slant)})" transform-origin="50 ${y}">${spans}</text>`;
    const p = (d, stroke, sw2) => d ? `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw2}" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    // рисунок: белая обводка, тёмный контур, цвет чернил
    const dd = (name, x, yy, s, r) => {
      const [sp, fp, lw] = DOOD[name], tr = `translate(${n2(x)} ${n2(yy)}) rotate(${r || 0}) scale(${s})`;
      const L = (c, add) => `${sp ? `<path d="${sp}" fill="none" stroke="${c}" stroke-width="${n2(lw + add)}" stroke-linecap="round" stroke-linejoin="round"/>` : ''}${fp ? `<path d="${fp}" fill="${c}" stroke="${c}" stroke-width="${n2(add)}" stroke-linejoin="round"/>` : ''}`;
      return `<g transform="${tr}">${L(edge, 2.6 / s)}${L(edge2, 1.3 / s)}${L(ink, .01)}</g>`;
    };
    const fx = [];
    const apply = (k) => {
      if (k === 'wingFirst') fx.push(['dd', 'wing', x1 + 1, y - size * .55, .9]);
      else if (k === 'crownMid') fx.push(['dd', seed % 2 ? 'crown' : 'gcrown', 50 + (h32(nick) % 9 - 4) * 2, y - size * .78, .75]);
      else if (k === 'starDot') fx.push(['dd', seed % 2 ? 'star' : 'sparkle', x1 + w * .62, y - size * .82, .55]);
      else if (k === 'crossLast') fx.push(['dd', 'crossC', x2 - 2, y - size * .3, .9]);
      else if (k === 'circleLast') fx.push(['path', `M${n2(x2 - 3)} ${n2(y - size * .62)}a${n2(size * .42)} ${n2(size * .42)} 0 1 1 -.1 0`]);
      else if (k === 'tailLast') fx.push(['path', `M${n2(x2 - 2)} ${y - 1}C${n2(x2 + 8)} ${y - 4} ${n2(x2 + 6)} ${y + 11} ${n2(x1 + w * .4)} ${y + 11}`]);
      else if (k === 'loopFirst') fx.push(['path', `M${n2(x1 + 2)} ${n2(y - size * .9)}C${n2(x1 - 10)} ${n2(y - size * .6)} ${n2(x1 - 5)} ${y + 8} ${n2(x1 + 6)} ${y + 4}`]);
    };
    apply(hd.lfx); if (hd.lfx2) apply(hd.lfx2);
    let under = '', over = '';
    for (const e of fx) if (e[0] === 'path') { under += p(e[1], edge, 4) + p(e[1], edge2, 2.4); over += p(e[1], ink, 1.3); } else over += dd(e[1], e[2], e[3], e[4]);
    // рисунки держатся рядом с подписью (у концов и над ней), не больше двух украшений всего
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    const SL = [[x2 + 2, y - size * .42], [x2 - 3, y - size * .92], [x1 - 2, y - size * .5], [x2 + 1, y + 5], [50 + w * .15, y - size * .98], [x1 + 2, y + 6]];
    const busy = fx.length + (hd.tag ? 1 : 0), room = Math.max(busy ? 1 : 1, 2 - busy);
    const used = new Set(), ks = cl(size / 28, .55, 1);
    hd.dood.slice(0, room).forEach((nm, i) => { let sl = hd.slots[i]; while (used.has(sl)) sl = (sl + 1) % 6; used.add(sl);
      const sc = ks * (.6 + ((seed >>> (i * 3)) % 3) * .08); over += dd(nm, cl(SL[sl][0], 10, 90), cl(SL[sl][1], 12, 62), sc, ((seed >>> (i * 5)) % 31) - 15); });
    if (hd.tag && fx.length < 2) { const tx = cl(x1 + w * .25, 18, 82), ty = cl(y + 9, 12, 66);
      over += `<text x="${n2(tx)}" y="${n2(ty)}" text-anchor="middle" font-family="${Fn[0]},cursive" font-size="${n2(size * .42)}" fill="${ink}" stroke="${edge}" stroke-width="2.2" paint-order="stroke" transform="rotate(${-12 + seed % 20} ${n2(tx)} ${n2(ty)})">${esc(hd.tag)}</text>`; }
    return `<g transform="rotate(${hd.rot} 50 ${y})">${t(edge, 3.4)}${p(fl, edge, sw + 3.2)}${under}${t(edge2, 1.6)}${p(fl, edge2, sw + 1.2)}${t(null)}${p(fl, ink, sw)}${over}</g>`;
  }

  // ---------------------------------------------------------------- автограф: орнамент Мейджора, логотип команды с обводкой, подпись, надпись города.
  // Одинаков для всех стадий. Чемпионский автограф — всегда золотой, с кубком и плашкой CHAMPION.
  function autograph(th, nick, team, logo, finish, ctx, label, tier) {
    th = edTheme(th);
    const D = ctx.D, h = h32('au|' + nick + th.city), [c1] = teamColors(team), f = F(D);
    const champ = tier === 'champion';
    if (champ) finish = 'gold';
    let lay = layoutOf('a' + nick + th.city + th.year);
    if (/hexcut|vitrage|deco|sunray|ziggurat|compass|lattice|petals/.test(styleOf(th)) && lay.top) lay = { y: 82, rot: 4, k: .92 };
    if (champ) lay = { y: 89, rot: 0, k: .82 }; // у чемпиона надпись всегда ровно внизу, под плашкой CHAMPION
    const dy = lay.top ? 12 : 0;
    let back = backdrop(D, ctx, th, finish, h) + ornament(D, ctx, th, finish, h);
    if (champ) {
      const g = D.lin(ctx.GOLD, .8, 1), dk = '#6e4a05';
      back += `<g transform="translate(50 2) scale(.55)"><path d="M-12 2H12L11 13Q10 21 0 22Q-10 21 -11 13z" fill="${g}" stroke="${dk}" stroke-width=".6"/><path d="M-12 4Q-20 4 -18 11Q-16 15 -10 14M12 4Q20 4 18 11Q16 15 10 14" fill="none" stroke="${g}" stroke-width="2"/><path d="M-2.4 22H2.4L3.4 28H-3.4zM-7 28H7V31.6H-7z" fill="${g}" stroke="${dk}" stroke-width=".5"/></g>`;
    }
    const lg = logo ? logoIn(D, ctx, finish, logo, 50, (champ ? 40 : 37) + dy, champ ? 44 : styleOf(th) === 'vitrage' ? 44 : 52, h)
      : `<path d="M50 ${14 + dy}L74 ${23 + dy}V${40 + dy}Q74 ${55 + dy} 50 ${63 + dy}Q26 ${55 + dy} 26 ${40 + dy}V${23 + dy}z" fill="${mat(D, ctx, finish, c1, h)}" stroke="#fff" stroke-width="2.4"/>`;
    const tcl = (logo && logoBox(logo)[6]) || c1;
    const sig = signature(D, nick, finish, ctx, th, finish === 'glitter' ? mix(tcl, '#000000', .25) : '#141414', th.city + th.year, tcl);
    const plate = champ ? `<path d="M24 70H76L73 76.6H27z" fill="${D.lin(ctx.GOLD, 0, 1)}" stroke="#6e4a05" stroke-width=".5"/><text x="50" y="75.2" text-anchor="middle" font-family="StkCinzel,serif" font-size="4.8" letter-spacing="1.2" fill="#3d2a00">CHAMPION</text>` : '';
    const body = `<g filter="url(#${f.cut})">${SAFE(back + lg + `<g transform="translate(0 ${(champ ? 3 : 2) + dy})">${sig}</g>` + plate + wordmark(D, ctx, th, finish, lay, h))}</g>`;
    return `<svg class="v84-stk-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}"><defs>${D.d.join('')}</defs>${body}</svg>`;
  }

  // ---------------------------------------------------------------- монета Pick'Em Мейджора (как в CS2): металлический обод с надписями
  // «CS2 MAJOR» и «ГОРОД ГОД», звёзды и гравировка по бокам, эмалевый диск цвета города с узором и рельефным символом города.
  // Уровни: 0 бронза, 1 серебро, 2 золото, 3 алмаз (радужный). Всё процедурно от города и года.
  // v126: детальные символы городов для монет Мейджора (поле 100×100, низ на y=66; по ширине — в пределах x≈20…80,
  // чтобы всё помещалось во внутренний круг). f — металл, d — тени/проёмы, l — блики и кромки. Стикеры используют L.
  const pt = (pts) => 'M' + pts.map(p => n2(p[0]) + ' ' + n2(p[1])).join('L') + 'z';
  const lancet = (cx, top, bot, w, fill) => `<path d="M${n2(cx - w)} ${bot}V${n2(top + w)}Q${n2(cx - w)} ${top} ${cx} ${n2(top - w * .7)}Q${n2(cx + w)} ${top} ${n2(cx + w)} ${n2(top + w)}V${bot}z" fill="${fill}"/>`;
  const LX = {
    cologne: (f, d, l) => { // Кёльнский собор: башни с ажурными шпилями, краббы, стрельчатые окна, роза и портал
      let s = '';
      for (const x of [36, 64]) {
        s += `<path d="M${x - 6.4} 66V38H${x + 6.4}V66z" fill="${f}"/><path d="M${x} 38H${x + 6.4}V66H${x}z" fill="${d}" opacity=".32"/>`;
        s += `<path d="M${x - 4.8} 38V27.6H${x + 4.8}V38z" fill="${f}"/><path d="M${x} 27.6H${x + 4.8}V38H${x}z" fill="${d}" opacity=".32"/>`;
        s += `<path d="M${x - 4.2} 27.8L${x} 5.5L${x + 4.2} 27.8z" fill="${f}"/><path d="M${x} 5.5L${x + 4.2} 27.8H${x}z" fill="${d}" opacity=".38"/>`;
        // ажур шпиля: горизонтальные пояса и краббы по рёбрам
        for (let i = 1; i < 7; i++) { const t = i / 7, y = 27.8 - 22.3 * t, w = 4.2 * (1 - t);
          s += `<path d="M${n2(x - w * .85)} ${n2(y)}H${n2(x + w * .85)}" stroke="${d}" stroke-width=".3" opacity=".75"/>` +
            `<path d="M${n2(x - w)} ${n2(y)}l-.9 -1.1M${n2(x + w)} ${n2(y)}l.9 -1.1" stroke="${f}" stroke-width=".55" stroke-linecap="round"/>`; }
        s += `<path d="M${x} 9V27M${x - 2} 20L${x} 14L${x + 2} 20" stroke="${l}" stroke-width=".25" fill="none" opacity=".7"/>`;
        s += `<path d="M${x} 5.8V2M${x - 1.1} 3.3H${x + 1.1}" stroke="${l}" stroke-width=".55"/>`;
        // пинакли на углах ярусов
        for (const dx of [-6.4, 6.4]) s += `<path d="M${n2(x + dx - 1.2)} 38.2L${n2(x + dx)} 31L${n2(x + dx + 1.2)} 38.2z" fill="${f}"/><path d="M${n2(x + dx)} 31V29.6" stroke="${f}" stroke-width=".4"/>`;
        for (const dx of [-4.8, 4.8]) s += `<path d="M${n2(x + dx - .9)} 27.8L${n2(x + dx)} 22.6L${n2(x + dx + .9)} 27.8z" fill="${f}"/>`;
        s += `<path d="M${x - 6.8} 38.2H${x + 6.8}M${x - 6.6} 50.4H${x + 6.6}M${x - 5.2} 27.8H${x + 5.2}" stroke="${l}" stroke-width=".55"/>`;
        // контрфорсы
        s += `<path d="M${x - 6.4} 66V40M${x + 6.4} 66V40M${x} 66V52" stroke="${d}" stroke-width=".35" opacity=".6"/>`;
        // стрельчатые окна с импостами
        s += lancet(x - 2.5, 41, 48.6, 1.25, d) + lancet(x + 2.5, 41, 48.6, 1.25, d) + lancet(x - 2.5, 53, 62, 1.25, d) + lancet(x + 2.5, 53, 62, 1.25, d) + lancet(x, 30.2, 36.6, 1.5, d);
        s += `<path d="M${x - 2.5} 42.2V48.6M${x + 2.5} 42.2V48.6M${x - 2.5} 54.2V62M${x + 2.5} 54.2V62M${x} 31.2V36.6M${x - 3.6} 45H${x - 1.4}M${x + 1.4} 45H${x + 3.6}" stroke="${l}" stroke-width=".22" opacity=".8"/>`;
      }
      // фасад между башнями: щипец, роза, портал
      s += `<path d="M42.4 66V44.4L50 35.4L57.6 44.4V66z" fill="${f}"/><path d="M50 35.4L57.6 44.4V66H50z" fill="${d}" opacity=".28"/>`;
      s += `<path d="M49.1 36.2L50 30.4L50.9 36.2z" fill="${f}"/><path d="M42.4 44.4L50 35.4L57.6 44.4" stroke="${l}" stroke-width=".5" fill="none"/>`;
      s += `<circle cx="50" cy="46.6" r="3.9" fill="${d}"/><circle cx="50" cy="46.6" r="3.9" fill="none" stroke="${l}" stroke-width=".45"/>`;
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; s += `<path d="M50 46.6L${n2(50 + Math.cos(a) * 3.6)} ${n2(46.6 + Math.sin(a) * 3.6)}" stroke="${l}" stroke-width=".25"/>`; }
      s += `<circle cx="50" cy="46.6" r=".9" fill="${l}"/>`;
      s += `<path d="M45.8 66V58.2Q45.8 53 50 51.6Q54.2 53 54.2 58.2V66z" fill="${d}"/><path d="M47.2 66V58.8Q47.2 55 50 54Q52.8 55 52.8 58.8V66M50 54V66" fill="none" stroke="${l}" stroke-width=".3"/>`;
      s += `<path d="M26 66H74V67.8H26z" fill="${f}"/><path d="M26 66H74" stroke="${l}" stroke-width=".5"/>`;
      return s;
    },
    texas: (f, d, l) => { // Капитолий Техаса: звезда, богиня на фонаре, рёбра купола, барабан с колоннами, портик, крылья
      const star = (cx, cy, r) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .4 : r; p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return pt(p); };
      let s = `<path d="${star(50, 6.6, 4.4)}" fill="${l}"/><path d="${star(50, 6.6, 4.4)}" fill="none" stroke="${d}" stroke-width=".3"/>`;
      s += `<path d="M49.4 11.6H50.6V14.6H49.4z" fill="${f}"/><path d="M48 18Q48 14.8 50 14.4Q52 14.8 52 18z" fill="${f}"/>`;
      s += `<path d="M47.6 18H52.4V24H47.6z" fill="${f}"/>` + [48.5, 50, 51.5].map(x => `<rect x="${x - .35}" y="19" width=".7" height="4" fill="${d}"/>`).join('');
      s += `<path d="M38.6 39Q38.6 25.6 50 24Q61.4 25.6 61.4 39z" fill="${f}"/><path d="M50 24Q61.4 25.6 61.4 39H50z" fill="${d}" opacity=".3"/>`;
      for (const k of [-8.5, -5, -1.7, 1.7, 5, 8.5]) s += `<path d="M50 24.2Q${n2(50 + k * .9)} 28 ${n2(50 + k * 1.3)} 39" stroke="${d}" stroke-width=".3" fill="none" opacity=".8"/>`;
      s += `<path d="M41 33Q50 31 59 33" stroke="${l}" stroke-width=".3" fill="none"/>` + [43, 46.5, 50, 53.5, 57].map(x => `<circle cx="${x}" cy="${n2(31.4 + Math.abs(x - 50) * .12)}" r=".5" fill="${d}"/>`).join('');
      s += `<path d="M37 39H63V40.6H37z" fill="${l}"/><path d="M38 40.6H62V46.4H38z" fill="${f}"/>`;
      for (let x = 39.2; x < 61.5; x += 2.2) s += `<rect x="${n2(x)}" y="41.2" width="1.1" height="4.6" fill="${d}" opacity=".8"/>`;
      s += `<path d="M35.6 46.4H64.4V48.4H35.6z" fill="${d}"/>`;
      // крылья
      for (const [x0, x1] of [[21, 39.4], [60.6, 79]]) {
        s += `<path d="M${x0} 66V52.4H${x1}V66z" fill="${f}"/><path d="M${x0 - .6} 52.4H${x1 + .6}V50.8H${x0 - .6}z" fill="${d}"/><path d="M${x0 - .6} 50.8H${x1 + .6}" stroke="${l}" stroke-width=".4"/>`;
        for (let x = x0 + 1.4; x < x1 - 1; x += 3) s += `<path d="M${n2(x)} 59.2V55.6Q${n2(x + .7)} 54.6 ${n2(x + 1.4)} 55.6V59.2z" fill="${d}"/><rect x="${n2(x)}" y="61" width="1.4" height="2.6" fill="${d}"/>`;
        s += `<path d="M${x0} 60.2H${x1}" stroke="${l}" stroke-width=".3" opacity=".7"/>`;
      }
      // центральный корпус и портик
      s += `<path d="M39.4 66V48.4H60.6V66z" fill="${f}"/><path d="M40.4 53.6L50 49.2L59.6 53.6z" fill="${f}"/><path d="M40.4 53.6L50 49.2L59.6 53.6z" fill="none" stroke="${l}" stroke-width=".45"/><circle cx="50" cy="51.8" r=".8" fill="${d}"/>`;
      s += `<path d="M40.8 53.6H59.2V62.6H40.8z" fill="${d}"/>` + [41.6, 44.6, 47.6, 50.6, 53.6, 56.6].map(x => `<rect x="${x}" y="53.8" width="1.8" height="8.8" fill="${f}"/><rect x="${x}" y="53.8" width=".5" height="8.8" fill="${l}" opacity=".6"/>`).join('');
      s += `<path d="M42 62.6H58V63.8H42zM43 63.8H57V65H43zM44 65H56V66H44z" fill="${f}"/><path d="M42 62.6H58M43 63.8H57M44 65H56" stroke="${l}" stroke-width=".25"/>`;
      s += `<path d="M18 66H82V67.8H18z" fill="${f}"/><path d="M18 66H82" stroke="${l}" stroke-width=".5"/>`;
      return s;
    },
    copenhagen: (f, d, l) => { // Нюхавн: дома с разными фронтонами, окна в рамах, двери, мачты лодок в канале
      let s = ''; const xs = [19.5, 30, 40.5, 51, 61.5, 72], w = 10;
      xs.forEach((x, i) => { const top = 33 + [2, 0, 4, 1, 3, 0][i], g = i % 3, cx = x + w / 2;
        const shape = g === 0 ? `M${x} 66V${top + 6}L${cx} ${top}L${x + w} ${top + 6}V66z` // щипец
          : g === 1 ? `M${x} 66V${top + 6}H${x + 1.6}V${top + 4}H${x + 3.2}V${top + 2}H${x + 4}V${top}H${x + 6}V${top + 2}H${x + 6.8}V${top + 4}H${x + 8.4}V${top + 6}H${x + w}V66z` // ступенчатый
          : `M${x} 66V${top + 6}Q${x + 1.4} ${top + 6} ${x + 2.2} ${top + 3.6}Q${cx} ${top - 1} ${x + 7.8} ${top + 3.6}Q${x + 8.6} ${top + 6} ${x + w} ${top + 6}V66z`; // барочный
        s += `<path d="${shape}" fill="${f}"/><path d="${shape}" fill="${d}" opacity="${[0, .18, .08, .25, .12, .2][i]}"/><path d="${shape}" fill="none" stroke="${d}" stroke-width=".4"/>`;
        s += `<circle cx="${cx}" cy="${top + 4.2}" r=".9" fill="${d}"/>`;
        for (let r = 0; r < 3; r++) for (const wx of [x + 1.6, x + 4.3, x + 7]) s += `<rect x="${n2(wx)}" y="${top + 8.4 + r * 5.6}" width="1.5" height="2.8" fill="${d}"/><path d="M${n2(wx)} ${top + 9.8 + r * 5.6}h1.5M${n2(wx + .75)} ${top + 8.4 + r * 5.6}v2.8" stroke="${l}" stroke-width=".2"/>`;
        s += `<path d="M${cx - 1.2} 66V62.6Q${cx} 61.4 ${cx + 1.2} 62.6V66z" fill="${d}"/>`;
        s += `<path d="M${x} ${top + 6.6}H${x + w}M${x} 60.6H${x + w}" stroke="${l}" stroke-width=".3" opacity=".7"/>`;
      });
      s += `<path d="M18 66H82V67.6H18z" fill="${f}"/>`;
      // мачты и такелаж лодок
      for (const [x, h] of [[27, 30], [57.5, 26], [70, 38]]) s += `<path d="M${x} 68V${h}M${x} ${h + 1}L${x + 6} 66M${x} ${h + 1}L${x - 4.5} 66M${x - 2.6} ${h + 9}H${x + 3}" stroke="${l}" stroke-width=".35" fill="none" opacity=".85"/>` +
        `<path d="M${x} ${h + 2}L${x + 5} 64H${x}z" fill="${l}" opacity=".22"/>`;
      return s;
    },
    budapest: (f, d, l) => { // Парламент: рёбристый купол со шпилем, башенки, ряд пинаклей, аркады
      let s = `<path d="M20 66V50.6H80V66z" fill="${f}"/><path d="M50 50.6H80V66H50z" fill="${d}" opacity=".18"/>`;
      s += `<path d="M19.4 50.6H80.6" stroke="${l}" stroke-width=".5"/>`;
      for (let x = 21.2; x <= 79; x += 2.6) s += `<path d="M${n2(x - .9)} 50.6L${n2(x)} 45.6L${n2(x + .9)} 50.6z" fill="${f}"/>`;
      for (let x = 22; x < 78; x += 2.6) s += `<path d="M${n2(x)} 57.4V54Q${n2(x + .6)} 53 ${n2(x + 1.2)} 54V57.4z" fill="${d}"/><rect x="${n2(x)}" y="59.6" width="1.2" height="3.6" fill="${d}"/>`;
      s += `<path d="M20 58.4H80" stroke="${l}" stroke-width=".3" opacity=".7"/>`;
      // центральный ризалит, барабан и купол
      s += `<path d="M39 66V44.4H61V66z" fill="${f}"/><path d="M38.4 44.4H61.6" stroke="${l}" stroke-width=".5"/>`;
      for (let x = 40.4; x < 60; x += 2.8) s += `<path d="M${n2(x)} 54V48.6Q${n2(x + .7)} 47.4 ${n2(x + 1.4)} 48.6V54z" fill="${d}"/>`;
      s += `<path d="M44.6 66V60Q50 55.6 55.4 60V66z" fill="${d}"/>`;
      s += `<path d="M41.4 44.4V40.6H58.6V44.4z" fill="${f}"/>` + [42.6, 45, 47.4, 49.8, 52.2, 54.6, 57].map(x => `<rect x="${x}" y="41.2" width=".9" height="2.8" fill="${d}"/>`).join('');
      s += `<path d="M41.4 40.6Q41.4 29.4 50 27.6Q58.6 29.4 58.6 40.6z" fill="${f}"/><path d="M50 27.6Q58.6 29.4 58.6 40.6H50z" fill="${d}" opacity=".3"/>`;
      for (const k of [-6, -3, 0, 3, 6]) s += `<path d="M50 27.8Q${n2(50 + k * .8)} 32 ${n2(50 + k * 1.3)} 40.6" stroke="${d}" stroke-width=".3" fill="none"/>`;
      s += `<path d="M48.6 27.8L50 12L51.4 27.8z" fill="${f}"/><path d="M50 12L51.4 27.8H50z" fill="${d}" opacity=".35"/><path d="M50 12V9.4" stroke="${l}" stroke-width=".5"/>`;
      for (const x of [41.4, 58.6]) s += `<path d="M${n2(x - .8)} 40.8L${x} 33L${n2(x + .8)} 40.8z" fill="${f}"/>`;
      // боковые башенки
      for (const x of [29, 71]) s += `<path d="M${x - 2} 50.6V40H${x + 2}V50.6z" fill="${f}"/><path d="M${x - 2.2} 40L${x} 30.6L${x + 2.2} 40z" fill="${f}"/><path d="M${x} 40L${x + 2.2} 40L${x} 30.6z" fill="${d}" opacity=".35"/>` +
        `<rect x="${x - .5}" y="42.6" width="1" height="3.4" fill="${d}"/>`;
      s += `<path d="M18 66H82V67.8H18z" fill="${f}"/>`;
      return s;
    },
    rio: (f, d, l) => { // Корковаду с Христом, Урка и Сахарная Голова, канатная дорога, парусник
      let s = `<path d="M18 66Q22 44 28 40Q31 38 34 42Q38 50 40 66z" fill="${d}" opacity=".55"/>`;
      s += `<path d="M28.4 40.2V36.4M26.8 37.6H30" stroke="${l}" stroke-width=".6"/>`;
      s += `<path d="M30 66Q34 50 40 48Q45 47 48 54Q50 58 51 66z" fill="${f}"/><path d="M40 48Q45 47 48 54Q50 58 51 66H44Q44 54 40 48z" fill="${d}" opacity=".35"/>`;
      s += `<path d="M46 66Q50 30 60 21.4Q67 17.6 72 26Q78 38 80 66z" fill="${f}"/><path d="M60 21.4Q67 17.6 72 26Q78 38 80 66H68Q70 40 60 21.4z" fill="${d}" opacity=".35"/>`;
      // рельеф скалы: прожилки и лес у подножия
      for (const [a, b, c2] of [[56, 30, 52], [61, 25, 60], [66, 24, 68], [71, 30, 75]]) s += `<path d="M${a} ${b}Q${n2((a + c2) / 2 - 1)} ${n2((b + 64) / 2)} ${c2} 64" stroke="${d}" stroke-width=".35" fill="none" opacity=".7"/>`;
      s += `<path d="M58 23Q62 21 66 21.6" stroke="${l}" stroke-width=".5" fill="none"/>`;
      for (let i = 0; i < 26; i++) { const x = 47 + (i * 37 % 33), y = 60 + (i * 13 % 6); s += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(.7 + (i % 3) * .25)}" fill="${d}" opacity=".55"/>`; }
      // канатная дорога
      s += `<path d="M40.4 48L60 21.6" stroke="${l}" stroke-width=".35"/><path d="M40.6 49L60.2 22.6" stroke="${l}" stroke-width=".2" opacity=".6"/>`;
      s += `<rect x="47.6" y="37.2" width="3.2" height="2.4" rx=".5" fill="${l}"/><path d="M49.2 37.2V35.4" stroke="${l}" stroke-width=".3"/><rect x="48" y="37.8" width="2.4" height=".9" fill="${d}"/>`;
      // парусник
      s += `<path d="M30 64.6H37L36 66H31z" fill="${f}"/><path d="M33.4 64.6V56L37 64.2zM33 64.4V58.4L30.4 64.2z" fill="${l}" opacity=".85"/>`;
      s += `<path d="M18 66H82V67.6H18z" fill="${f}"/>`;
      return s;
    },
    shanghai: (f, d, l) => { // Восточная жемчужина (ножки, сферы с поясами), Шанхайская башня, «открывашка», Цзинь Мао
      let s = '';
      // дальние башни
      s += `<path d="M62 66V14Q64 8 66 7Q68 9 69 14L70.6 66z" fill="${d}"/><path d="M64.4 14Q66 30 64 66M66.8 9Q68 30 67.6 66" stroke="${l}" stroke-width=".25" fill="none" opacity=".6"/>`;
      for (let y = 16; y < 64; y += 3) s += `<path d="M${n2(62.4 + (y - 16) * .005)} ${y}H70.2" stroke="${f}" stroke-width=".18" opacity=".45"/>`;
      s += `<path d="M72 66V22L78 20V66z" fill="${f}"/><path d="M73.6 24.6H76.4V27.4H73.6z" fill="${d}"/><path d="M75 20.6V66" stroke="${d}" stroke-width=".25" opacity=".5"/>`;
      s += `<path d="M54 66V34L55 31.6H56L56.6 28H57.6L58.2 31.6H59.2L60.2 34V66z" fill="${f}"/>` + [38, 44, 50, 56].map(y => `<path d="M54 ${y}H60.2" stroke="${d}" stroke-width=".35"/>`).join('') + `<path d="M57.1 28V24" stroke="${f}" stroke-width=".4"/>`;
      s += `<path d="M21 66V50H26V46H29V66zM30.4 66V54H34.6V66z" fill="${d}"/>`;
      // Восточная жемчужина
      s += `<path d="M33.6 66L38.4 50.6H40.2L36.2 66zM46.4 66L41.6 50.6H39.8L43.8 66z" fill="${f}"/><path d="M39.2 66V50.6H40.8V66z" fill="${d}"/>`;
      s += `<circle cx="40" cy="45.4" r="7" fill="${f}"/><path d="M40 38.4A7 7 0 0 1 40 52.4z" fill="${d}" opacity=".3"/><path d="M33.2 44Q40 46.6 46.8 44M33.4 47.4Q40 49.6 46.6 47.4" stroke="${d}" stroke-width=".45" fill="none"/>`;
      s += `<circle cx="37.4" cy="42.8" r="2" fill="${l}" opacity=".7"/>`;
      s += `<path d="M38 38.6V26.8H39.2V38.6zM40.8 38.6V26.8H42V38.6z" fill="${f}"/><path d="M38.2 32.6H41.8" stroke="${f}" stroke-width=".6"/>`;
      s += `<circle cx="40" cy="23.4" r="4.2" fill="${f}"/><path d="M40 19.2A4.2 4.2 0 0 1 40 27.6z" fill="${d}" opacity=".3"/><path d="M36 22.8Q40 24.4 44 22.8" stroke="${d}" stroke-width=".4" fill="none"/><circle cx="38.6" cy="21.8" r="1.1" fill="${l}" opacity=".7"/>`;
      s += `<path d="M39.5 19.4V14.4H40.5V19.4z" fill="${f}"/><circle cx="40" cy="12.6" r="1.8" fill="${f}"/><path d="M40 10.8V3.6" stroke="${f}" stroke-width=".5"/>`;
      s += `<path d="M18 66H82V67.6H18z" fill="${f}"/>`;
      return s;
    },
    paris: (f, d, l) => { // Эйфелева башня: решётка-раскосы, платформы, арка, антенна
      let s = `<path d="M50 5L51.6 19L53.6 33L56.8 43.2H62.4L68.6 66H59.4Q50 51.4 40.6 66H31.4L37.6 43.2H43.2L46.4 33L48.4 19z" fill="${f}"/>`;
      s += `<path d="M50 5L51.6 19L53.6 33L56.8 43.2H62.4L68.6 66H59.4Q55 57.6 50 56z" fill="${d}" opacity=".35"/>`;
      s += `<path d="M44.2 33H55.8V34.8H44.2zM36.4 43.2H63.6V45.4H36.4zM47.6 19H52.4V20.4H47.6z" fill="${l}"/>`;
      // раскосы
      const X = (y0, y1, xl0, xl1, xr0, xr1, n) => { let r = ''; for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, ya = y0 + (y1 - y0) * t0, yb = y0 + (y1 - y0) * t1;
        const la = xl0 + (xl1 - xl0) * t0, lb = xl0 + (xl1 - xl0) * t1, ra = xr0 + (xr1 - xr0) * t0, rb = xr0 + (xr1 - xr0) * t1;
        r += `<path d="M${n2(la)} ${n2(ya)}L${n2(rb)} ${n2(yb)}M${n2(ra)} ${n2(ya)}L${n2(lb)} ${n2(yb)}" stroke="${d}" stroke-width=".3"/>`; } return r; };
      s += X(20.4, 33, 48.4, 46.6, 51.6, 53.4, 4) + X(34.8, 43.2, 46.2, 44, 53.8, 56, 3);
      s += X(45.4, 60, 38, 34, 44, 46, 4) + X(45.4, 60, 56, 54, 62, 66, 4);
      s += `<path d="M42 66Q50 53.6 58 66" stroke="${l}" stroke-width=".4" fill="none"/><path d="M50 5V1.6" stroke="${f}" stroke-width=".6"/>`;
      s += `<path d="M24 66H76V67.6H24z" fill="${f}"/>` + [27, 72].map(x => `<path d="M${x} 66V60.4M${x - 1.6} 60.4H${x + 1.6}" stroke="${l}" stroke-width=".4"/>`).join('');
      return s;
    },
    riyadh: (f, d, l) => { // Kingdom Centre: парабола с мостом наверху, сетка фасада; Аль-Файсалия с шаром
      let s = `<path d="M24 66V38.4L26.4 22L28.8 38.4V66z" fill="${d}"/><circle cx="26.4" cy="33.6" r="2.4" fill="${f}"/><path d="M26.4 22V18" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M41 66L42.4 18Q50 4.6 57.6 18L59 66z" fill="${f}"/><path d="M50 8Q55.4 10 57.6 18L59 66H50z" fill="${d}" opacity=".3"/>`;
      s += `<path d="M45.2 34Q46 17 50 14.6Q54 17 54.8 34z" fill="${d}"/><path d="M45.6 25H54.4V26.6H45.6z" fill="${f}"/><path d="M45.6 25H54.4" stroke="${l}" stroke-width=".3"/>`;
      for (let y = 36; y < 65; y += 2.4) s += `<path d="M${n2(41.6 - (y - 36) * .03)} ${y}H${n2(58.4 + (y - 36) * .03)}" stroke="${d}" stroke-width=".22" opacity=".7"/>`;
      for (const x of [44.6, 47.3, 50, 52.7, 55.4]) s += `<path d="M${x} 34V66" stroke="${d}" stroke-width=".18" opacity=".6"/>`;
      s += `<path d="M42.6 18.4Q50 6 57.4 18.4" stroke="${l}" stroke-width=".45" fill="none"/>`;
      s += `<path d="M62 66V52H68V48H72V66zM73 66V56H79V66zM32 66V54H38V66z" fill="${d}"/>` + [63.4, 65.6, 74.4, 76.6, 33.4, 35.6].map(x => `<rect x="${x}" y="57" width="1" height="1.4" fill="${l}" opacity=".7"/>`).join('');
      s += `<path d="M18 66H82V67.6H18z" fill="${f}"/>`;
      return s;
    },
    katowice: (f, d, l) => { // «Сподек»: рёбра крыши, остеклённый пояс, наклонные опоры; за ним шахтный копёр — символ Силезии
      let s = `<path d="M68 66V36H70.6V66zM75.4 66V36H78V66z" fill="${d}"/><path d="M68 36L73 26L78 36" stroke="${d}" stroke-width="1" fill="none"/><path d="M68.6 40L77.4 48M77.4 40L68.6 48" stroke="${d}" stroke-width=".45"/>` +
        `<circle cx="73" cy="26" r="2" fill="none" stroke="${d}" stroke-width=".7"/><path d="M66.6 36H79.4" stroke="${d}" stroke-width=".8"/>`;
      s += `<path d="M32 66L37.6 50.6H41L36.6 66zM68 66L62.4 50.6H59L63.4 66z" fill="${f}"/><path d="M40 66L42.4 51H57.6L60 66z" fill="${d}"/>` +
        [44, 47, 50, 53, 56].map(x => `<path d="M${x} 52V66" stroke="${l}" stroke-width=".22" opacity=".6"/>`).join('');
      s += `<path d="M22 46Q50 30 78 46Q50 56 22 46z" fill="${f}"/><path d="M50 34.6Q68 38 78 46Q60 52 50 51.4z" fill="${d}" opacity=".25"/>`;
      s += `<path d="M22 46Q50 56 78 46L77.4 48Q50 58.4 22.6 48z" fill="${d}"/><path d="M23 47.2Q50 57 77 47.2" stroke="${l}" stroke-width=".3" fill="none" stroke-dasharray=".6 .9"/>`;
      for (let i = 0; i <= 12; i++) { const x = 24 + i * 4.33; s += `<path d="M50 36.2Q${n2((50 + x) / 2)} ${n2(37 + Math.abs(x - 50) * .05)} ${n2(x)} ${n2(46 + 4.6 * Math.sin((x - 22) / 56 * Math.PI))}" stroke="${d}" stroke-width=".25" fill="none" opacity=".7"/>`; }
      s += `<ellipse cx="50" cy="36.4" rx="5" ry="1.2" fill="${l}" opacity=".85"/><path d="M30 41Q50 30.6 70 41" stroke="${l}" stroke-width=".6" fill="none"/>`;
      s += `<path d="M18 66H82V67.6H18z" fill="${f}"/>`;
      return s;
    }
  };

  let CUID = 0;
  const COIN_METAL = [
    ['#2a1608', '#5e3517', '#9a5d2c', '#d39a5f', '#f6cf9c', '#b97b43'],
    ['#22262b', '#4f5761', '#8b949e', '#c9d0d7', '#f7f9fb', '#a7b0ba'],
    ['#3a2604', '#7a5408', '#c08a1a', '#ecc251', '#fff0b0', '#d9a632'],
    ['#4a4f63', '#8a93b8', '#c9d4f0', '#eef2ff', '#ffffff', '#b8c4e8']
  ];
  // v128.1: запасные символы городов, детализация на уровне основных (LX): светотень гранями, окна, фермы, фактура.
  // Поле 100×100, земля на y=66, по ширине x≈20…80. f — металл, d — тени/проёмы, l — блики и кромки. Вода и отражение — у монеты.
  const ground = (f, l) => `<path d="M18 66H82V67.8H18z" fill="${f}"/><path d="M18 66H82" stroke="${l}" stroke-width=".5"/>`;
  const shadeR = (d, path, op) => `<path d="${path}" fill="${d}" opacity="${op || .3}"/>`;
  const arcWin = (x, y, w, h, d, l) => `<path d="M${n2(x)} ${n2(y + h)}V${n2(y + w / 2)}Q${n2(x)} ${n2(y)} ${n2(x + w / 2)} ${n2(y)}Q${n2(x + w)} ${n2(y)} ${n2(x + w)} ${n2(y + w / 2)}V${n2(y + h)}z" fill="${d}"/><path d="M${n2(x + w / 2)} ${n2(y + .4)}V${n2(y + h)}" stroke="${l}" stroke-width=".22" opacity=".8"/>`;
  const sqWin = (x, y, w, h, d) => `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${d}"/>`;
  const gridWin = (x0, y0, x1, y1, sx, sy, w, h, d) => { let s = ''; for (let y = y0; y <= y1; y += sy) for (let x = x0; x <= x1; x += sx) s += sqWin(x, y, w, h, d); return s; };
  const truss = (pts, d, sw) => { let s = ''; for (let i = 0; i + 1 < pts.length; i++) s += `<path d="M${n2(pts[i][0])} ${n2(pts[i][1])}L${n2(pts[i + 1][2])} ${n2(pts[i + 1][3])}" stroke="${d}" stroke-width="${sw}"/>`; return s; };
  const tree = (x, y, r, f, d) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/><circle cx="${n2(x + r * .35)}" cy="${n2(y + r * .2)}" r="${n2(r * .7)}" fill="${d}" opacity=".3"/><path d="M${x} ${n2(y + r)}V66" stroke="${f}" stroke-width=".8"/>`;
  const ALT = {
    cologne: [
      (f, d, l) => { // мост Гогенцоллернов: три лучковые фермы с раскосами, мостовые башни, поезд
        let s = '';
        for (const [x0, x1] of [[23, 41], [41, 59], [59, 77]]) {
          const cx = (x0 + x1) / 2, top = 30, arc = t => [x0 + (x1 - x0) * t, 50 - Math.sin(t * Math.PI) * (50 - top)], inn = t => [x0 + (x1 - x0) * t, 50 - Math.sin(t * Math.PI) * (50 - top - 5)];
          s += `<path d="M${x0} 50Q${cx} ${2 * top - 50} ${x1} 50" fill="none" stroke="${f}" stroke-width="2.2"/><path d="M${x0 + 1} 50Q${cx} ${2 * top - 40} ${x1 - 1} 50" fill="none" stroke="${f}" stroke-width="1"/>`;
          for (let k = 0; k < 8; k++) { const a = arc(k / 8), b = inn((k + 1) / 8), c = arc((k + 1) / 8); s += `<path d="M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}L${n2(c[0])} ${n2(c[1])}" fill="none" stroke="${d}" stroke-width=".45"/>`; }
          for (let k = 1; k < 8; k++) { const b = inn(k / 8); s += `<path d="M${n2(b[0])} ${n2(b[1])}V50" stroke="${f}" stroke-width=".55"/>`; }
          s += `<path d="M${x0 + 2} 49Q${cx} ${2 * top - 48} ${x1 - 2} 49" fill="none" stroke="${l}" stroke-width=".35" opacity=".8"/>`;
        }
        s += `<path d="M18 50H82V54H18z" fill="${f}"/><path d="M18 50H82" stroke="${l}" stroke-width=".5"/><path d="M18 52.4H82" stroke="${d}" stroke-width=".4" stroke-dasharray="1 .8"/>`;
        // поезд на мосту
        s += `<path d="M30 49V45.6Q30 44.6 31 44.6H44V49zM45 49V44.6H58V49zM59 49V44.6H70Q72 44.6 72 46.6V49z" fill="${f}"/>` + [32, 35, 38, 41, 47, 50, 53, 56, 61, 64, 67].map(x => `<rect x="${x}" y="45.4" width="1.8" height="1.5" fill="${d}"/>`).join('');
        // мостовые башни с зубцами и порталом
        for (const x of [19, 77]) { s += `<path d="M${x - 4} 66V38H${x + 4}V66z" fill="${f}"/>${shadeR(d, `M${x} 38H${x + 4}V66H${x}z`)}` +
          [-3, -1, 1, 3].map(k => `<rect x="${x + k - .7}" y="35.6" width="1.4" height="2.4" fill="${f}"/>`).join('') + arcWin(x - 1.6, 41, 3.2, 5, d, l) + arcWin(x - 2.2, 56, 4.4, 10, d, l) +
          `<path d="M${x - 4.4} 38H${x + 4.4}M${x - 4.4} 52H${x + 4.4}" stroke="${l}" stroke-width=".45"/>`; }
        for (const x of [41, 59]) s += `<path d="M${x - 2.6} 66V54H${x + 2.6}V66z" fill="${f}"/>${shadeR(d, `M${x} 54H${x + 2.6}V66H${x}z`)}<path d="M${x - 3} 54H${x + 3}" stroke="${l}" stroke-width=".4"/>`;
        return s + ground(f, l);
      },
      (f, d, l) => { // Кранхойзер: три дома-«крана» со стеклянными фасадами, консоли с подкосами, набережная с деревьями
        let s = '';
        for (const [x, h] of [[22, 0], [41, -2], [60, 1]]) {
          const top = 26 + h;
          s += `<path d="M${x} 66V${top + 12}H${x + 5}V${top}H${x + 19}V${top + 9}H${x + 9}V66z" fill="${f}"/>`;
          s += shadeR(d, `M${x + 5} ${top}H${x + 19}V${top + 9}H${x + 5}z`, .22) + shadeR(d, `M${x + 6} ${top + 9}H${x + 9}V66H${x + 6}z`, .35);
          s += gridWin(x + .8, top + 14, x + 6.5, 63, 1.9, 2.4, 1.2, 1.5, d);
          for (let yy = top + 1.4; yy < top + 8.5; yy += 2) s += `<path d="M${x + 5.6} ${n2(yy)}H${x + 18.4}" stroke="${d}" stroke-width=".7"/>`;
          for (let xx = x + 7; xx < x + 19; xx += 2.4) s += `<path d="M${n2(xx)} ${top + .6}V${top + 8.6}" stroke="${l}" stroke-width=".2" opacity=".7"/>`;
          s += `<path d="M${x + 9} ${top + 9}L${x + 15} ${top + 9}L${x + 9} ${top + 17}z" fill="${d}" opacity=".45"/><path d="M${x + 9} ${top + 17}L${x + 15} ${top + 9}" stroke="${f}" stroke-width="1"/>`;
          s += `<path d="M${x} ${top + 12}H${x + 5}V${top}H${x + 19}" fill="none" stroke="${l}" stroke-width=".45"/>`;
        }
        s += `<path d="M18 63H82V66H18z" fill="${f}"/><path d="M18 63H82" stroke="${l}" stroke-width=".4"/>` + [31, 52, 71, 79].map(x => tree(x, 60, 2.2, f, d)).join('');
        return s + ground(f, l);
      }
    ],
    texas: [
      (f, d, l) => { // Пеннибэкер-бридж: ферменная арка над каньоном, слоистые скалы, можжевельник
        let s = `<path d="M18 52Q22 47 28 48L32 54V66H18z" fill="${f}"/><path d="M82 51Q78 46 72 47L68 54V66H82z" fill="${f}"/>`;
        for (let y = 52; y < 66; y += 3.2) s += `<path d="M18 ${y}Q24 ${y - 1} 31 ${y + .6}M69 ${y + .4}Q76 ${y - 1} 82 ${y}" stroke="${d}" stroke-width=".55" fill="none"/>`;
        const A = t => [30 + 40 * t, 54 - Math.sin(t * Math.PI) * 30], B = t => [30 + 40 * t, 54 - Math.sin(t * Math.PI) * 24];
        s += `<path d="M30 54Q50 -6 70 54" fill="none" stroke="${f}" stroke-width="2.4"/><path d="M31 54Q50 6 69 54" fill="none" stroke="${f}" stroke-width="1.3"/>`;
        for (let k = 0; k < 12; k++) { const a = A(k / 12), b = B((k + 1) / 12), c = A((k + 1) / 12); s += `<path d="M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}L${n2(c[0])} ${n2(c[1])}" fill="none" stroke="${d}" stroke-width=".45"/>`; }
        for (let k = 1; k < 12; k++) { const b = B(k / 12); if (b[1] < 44) s += `<path d="M${n2(b[0])} ${n2(b[1])}V44" stroke="${f}" stroke-width=".5"/>`; }
        s += `<path d="M20 44H80V47H20z" fill="${f}"/><path d="M20 44H80" stroke="${l}" stroke-width=".5"/><path d="M20 45.6H80" stroke="${d}" stroke-width=".35" stroke-dasharray="1 .7"/>`;
        s += `<path d="M32 53Q50 0 68 53" fill="none" stroke="${l}" stroke-width=".35"/>`;
        for (const [x, y, r] of [[21, 47, 2.2], [25, 46, 1.8], [77, 45.6, 2.3], [73, 46, 1.7]]) s += tree(x, y, r, f, d);
        return s + `<path d="M32 66Q50 60 68 66" fill="${d}" opacity=".35"/>` + ground(f, l);
      },
      (f, d, l) => { // печать «одинокой звезды»: гранёная звезда, двойной кант, ветви дуба и оливы
        let s = `<circle cx="50" cy="36" r="24" fill="none" stroke="${f}" stroke-width="2.6"/><circle cx="50" cy="36" r="21" fill="none" stroke="${l}" stroke-width=".5"/><circle cx="50" cy="36" r="19.4" fill="none" stroke="${f}" stroke-width=".8" stroke-dasharray="1.2 1"/>`;
        for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5, a1 = a - Math.PI / 5, a2 = a + Math.PI / 5, P = (r, aa) => `${n2(50 + Math.cos(aa) * r)} ${n2(36 + Math.sin(aa) * r)}`;
          s += `<path d="M50 36L${P(6.6, a1)}L${P(16, a)}z" fill="${f}"/><path d="M50 36L${P(16, a)}L${P(6.6, a2)}z" fill="${d}" opacity=".55"/><path d="M50 36L${P(16, a)}" stroke="${l}" stroke-width=".3"/>`; }
        const branch = (sx) => { let p = `<path d="M50 62Q${50 + sx * 20} 58 ${50 + sx * 25} 40" fill="none" stroke="${f}" stroke-width="1.1"/>`;
          for (let i = 0; i < 7; i++) { const t = i / 7, x = 50 + sx * (4 + t * 21), y = 61 - t * t * 20 - t * 2; p += `<ellipse cx="${n2(x + sx * 1.6)}" cy="${n2(y - 1.4)}" rx="1.3" ry="3" transform="rotate(${n2(sx * (30 + t * 40))} ${n2(x + sx * 1.6)} ${n2(y - 1.4)})" fill="${f}"/><ellipse cx="${n2(x - sx * .8)}" cy="${n2(y + 1.6)}" rx="1.1" ry="2.6" transform="rotate(${n2(sx * (100 + t * 30))} ${n2(x - sx * .8)} ${n2(y + 1.6)})" fill="${f}"/>`; } return p; };
        s += branch(-1) + branch(1) + `<path d="M46 62H54L52 65H48z" fill="${f}"/>`;
        for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; s += `<path d="M${n2(50 + Math.cos(a) * 24.6)} ${n2(36 + Math.sin(a) * 24.6)}L${n2(50 + Math.cos(a) * 27)} ${n2(36 + Math.sin(a) * 27)}" stroke="${f}" stroke-width=".7"/>`; }
        return s + ground(f, l);
      }
    ],
    copenhagen: [
      (f, d, l) => { // Русалочка: фигура на валунах, волосы, хвост с чешуёй и плавником
        let s = `<path d="M24 66Q26 56 34 54Q40 50 48 54Q52 50 60 51Q70 52 74 58Q78 62 78 66z" fill="${f}"/>`;
        s += shadeR(d, 'M48 54Q52 50 60 51Q70 52 74 58Q78 62 78 66H54Q56 60 48 54z', .35) + `<path d="M34 54Q38 60 36 66M60 51Q58 58 62 66M48 54Q47 59 50 62" stroke="${d}" stroke-width=".55" fill="none"/>`;
        s += `<path d="M52 52Q48 46 47 38Q46 30 50 27Q54 26 55 30Q56 34 54 37Q56 42 55 47Q58 50 64 49Q69 48 70 44Q71 41 68 40Q72 39 73 43Q73 50 66 52Q58 54 52 52z" fill="${f}"/>`;
        s += shadeR(d, 'M55 30Q56 34 54 37Q56 42 55 47Q58 50 64 49Q69 48 70 44Q71 41 68 40Q72 39 73 43Q73 50 66 52Q58 54 54 52z', .3);
        for (let i = 0; i < 6; i++) s += `<path d="M${56 + i * 2} ${50.6 - i * .2}a1.1 1.1 0 0 1 2.2 0" fill="none" stroke="${l}" stroke-width=".3"/>`;
        s += `<circle cx="51" cy="23.8" r="3.6" fill="${f}"/><path d="M48 22Q47 30 49 36M50 21Q49 28 51 33M54 22Q55 26 54 29" fill="none" stroke="${d}" stroke-width=".5"/><path d="M49.5 22.5Q51 21 53 22" stroke="${l}" stroke-width=".35" fill="none"/>`;
        s += `<path d="M48 36Q44 40 46 46" fill="none" stroke="${f}" stroke-width="1.6" stroke-linecap="round"/><path d="M48.5 38Q50 39 51.6 38" stroke="${l}" stroke-width=".3"/>`;
        return s + ground(f, l);
      },
      (f, d, l) => { // Круглая башня: кирпичная кладка, обсерватория с куполом, арочные окна, церковь Троицы
        let s = `<path d="M54 66V34L64 26L74 34V66z" fill="${f}"/>${shadeR(d, 'M64 26L74 34V66H64z', .3)}` + arcWin(58.4, 44, 3, 8, d, l) + arcWin(67, 44, 3, 8, d, l) + arcWin(62.8, 34, 2.4, 6, d, l);
        s += `<path d="M30 66V26Q42 23 54 26V66z" fill="${f}"/>${shadeR(d, 'M42 24.4Q54 25 54 26V66H42z', .28)}`;
        for (let y = 28; y < 66; y += 1.8) s += `<path d="M30 ${n2(y)}H54" stroke="${d}" stroke-width=".18" opacity=".55"/>`;
        for (const y of [30, 41, 52]) for (const x of [33, 39.6, 46.2]) s += arcWin(x, y, 3, 6.4, d, l);
        s += `<path d="M28.6 26H55.4V22.6H28.6z" fill="${f}"/>` + Array.from({ length: 13 }, (_, i) => `<rect x="${n2(29 + i * 2)}" y="19.4" width=".6" height="3.2" fill="${f}"/>`).join('') + `<path d="M28.6 19.4H55.4" stroke="${f}" stroke-width=".7"/>`;
        s += `<path d="M36 19.4Q36 11 42 10Q48 11 48 19.4z" fill="${f}"/>${shadeR(d, 'M42 10Q48 11 48 19.4H42z', .3)}<path d="M38 15H46M42 10V19.4" stroke="${l}" stroke-width=".3"/><path d="M42 10V7" stroke="${f}" stroke-width=".8"/>`;
        return s + `<path d="M38.6 66V59Q42 55 45.4 59V66z" fill="${d}"/>` + ground(f, l);
      }
    ],
    budapest: [
      (f, d, l) => { // Цепной мост: башни-триумфальные арки, двойные цепи с подвесками, львы, Будайская крепость
        let s = `<path d="M18 40Q22 34 28 36H40Q44 30 52 32H64Q70 28 78 33L82 40V46H18z" fill="${d}" opacity=".35"/>`;
        for (const x of [33, 67]) {
          s += `<path d="M${x - 7} 62V26H${x + 7}V62z" fill="${f}"/>${shadeR(d, `M${x} 26H${x + 7}V62H${x}z`, .28)}`;
          s += `<path d="M${x - 3.6} 62V44Q${x} 38 ${x + 3.6} 44V62z" fill="${d}"/><path d="M${x - 8} 26H${x + 8}V23H${x - 8}z" fill="${f}"/><path d="M${x - 8} 23H${x + 8}" stroke="${l}" stroke-width=".5"/>`;
          s += `<path d="M${x - 6} 30H${x + 6}M${x - 7} 36H${x + 7}" stroke="${l}" stroke-width=".4"/>` + [-4.5, 4.5].map(k => `<rect x="${n2(x + k - .9)}" y="38" width="1.8" height="22" fill="${d}" opacity=".35"/>`).join('');
          s += `<path d="M${x - 4} 23L${x} 19L${x + 4} 23z" fill="${f}"/>`;
        }
        const chain = (o) => `<path d="M14 ${46 + o}Q22 ${46 + o} 26 ${27 + o}M40 ${27 + o}Q50 ${44 + o} 60 ${27 + o}M74 ${27 + o}Q78 ${46 + o} 86 ${46 + o}" fill="none" stroke="${f}" stroke-width="1"/>`;
        s += chain(0) + chain(1.6);
        for (let x = 42; x < 59; x += 2) { const y = 27 + 17 * (1 - Math.pow((x - 50) / 10, 2)); s += `<path d="M${x} ${n2(y + 1)}V48" stroke="${f}" stroke-width=".35"/>`; }
        s += `<path d="M14 48H86V51H14z" fill="${f}"/><path d="M14 48H86" stroke="${l}" stroke-width=".4"/><path d="M14 49.6H86" stroke="${d}" stroke-width=".3" stroke-dasharray=".8 .6"/>`;
        for (const x of [21, 79]) s += `<path d="M${x - 3} 48V46Q${x - 3} 44 ${x - 1} 43.6L${x} 42L${x + 1} 43.4Q${x + 3} 44 ${x + 3} 46V48z" fill="${f}"/>`;
        return s + `<path d="M24 66V58H76V66z" fill="${f}" opacity=".6"/>` + ground(f, l);
      },
      (f, d, l) => { // Рыбацкий бастион: башенки с черепичными шатрами, аркада, лестница, шпиль собора Матьяша
        let s = `<path d="M60 40V20L63 6L66 20V40z" fill="${f}"/>${shadeR(d, 'M63 6L66 20V40H63z', .3)}`;
        for (let y = 10; y < 20; y += 1.6) s += `<path d="M${n2(63 - (y - 6) * .2)} ${n2(y)}H${n2(63 + (y - 6) * .2)}" stroke="${d}" stroke-width=".3"/>`;
        s += arcWin(61.8, 24, 2.4, 6, d, l);
        s += `<path d="M18 66V46H82V66z" fill="${f}"/>${shadeR(d, 'M18 58H82V66H18z', .15)}`;
        for (let x = 20; x < 80; x += 5) s += arcWin(x, 50, 3.4, 7, d, l);
        s += `<path d="M36 66L44 60H56L64 66z" fill="${d}" opacity=".5"/>` + [61, 62.6, 64.2].map(y => `<path d="M${n2(44 - (y - 60) * 1.3)} ${y}H${n2(56 + (y - 60) * 1.3)}" stroke="${l}" stroke-width=".3"/>`).join('');
        for (const [x, h, w] of [[22, 16, 3.4], [33, 22, 4], [44, 28, 4.6], [55, 22, 4], [74, 18, 3.6]]) {
          const b = 46 - h * .45; s += `<path d="M${x - w} 46V${n2(b)}H${x + w}V46z" fill="${f}"/>` + arcWin(x - 1, b + 2, 2, 4, d, l) +
            `<path d="M${n2(x - w - 1)} ${n2(b)}L${x} ${46 - h}L${n2(x + w + 1)} ${n2(b)}z" fill="${f}"/>${shadeR(d, `M${x} ${46 - h}L${n2(x + w + 1)} ${n2(b)}H${x}z`, .35)}`;
          for (let k = 1; k < 4; k++) { const y = 46 - h + (h * .55) * k / 4, ww = (w + 1) * k / 4; s += `<path d="M${n2(x - ww)} ${n2(y)}H${n2(x + ww)}" stroke="${d}" stroke-width=".3"/>`; }
          s += `<path d="M${x} ${46 - h}V${44 - h}" stroke="${f}" stroke-width=".6"/>`;
        }
        return s + `<path d="M18 46H82" stroke="${l}" stroke-width=".5"/>` + ground(f, l);
      }
    ],
    rio: [
      (f, d, l) => { // Христос-Искупитель: складки одеяния, нимб из лучей, часовня-пьедестал, гора с лесом
        let s = `<path d="M20 66Q28 54 38 50Q44 47 50 47Q58 47 64 50Q74 55 80 66z" fill="${f}"/>${shadeR(d, 'M50 47Q58 47 64 50Q74 55 80 66H50z', .35)}`;
        for (let i = 0; i < 22; i++) { const x = 24 + (i * 37 % 54), y = 56 + (i * 13 % 9); s += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(.8 + (i % 3) * .3)}" fill="${d}" opacity=".5"/>`; }
        for (let k = 0; k < 16; k++) { const a = -Math.PI + k / 15 * Math.PI; s += `<path d="M${n2(50 + Math.cos(a) * 9)} ${n2(16 + Math.sin(a) * 9)}L${n2(50 + Math.cos(a) * 15)} ${n2(16 + Math.sin(a) * 15)}" stroke="${l}" stroke-width=".35" opacity=".7"/>`; }
        s += `<path d="M45 47V43H55V47zM46.6 43V40H53.4V43z" fill="${f}"/>${shadeR(d, 'M50 40H53.4V43H55V47H50z', .3)}<path d="M48.6 47V44.4H51.4V47z" fill="${d}"/>`;
        s += `<path d="M47 40L46 26Q46 24 47 23.4L50 22.6L53 23.4Q54 24 54 26L53 40z" fill="${f}"/>${shadeR(d, 'M50 22.6L53 23.4Q54 24 54 26L53 40H50z', .3)}`;
        s += `<path d="M47.4 27L48 39M50 25V40M52.6 27L52 39" stroke="${d}" stroke-width=".35"/>`;
        s += `<path d="M47 23.4Q38 23.2 26 24.4L25 26.8Q38 26.4 47.2 27zM53 23.4Q62 23.2 74 24.4L75 26.8Q62 26.4 52.8 27z" fill="${f}"/>`;
        s += `<path d="M28 25.4Q38 25 46 25.6M54 25.6Q62 25 72 25.4" stroke="${l}" stroke-width=".3"/><path d="M30 26.6Q38 27.6 46 27.6M54 27.6Q62 27.6 70 26.6" stroke="${d}" stroke-width=".35"/>`;
        s += `<circle cx="50" cy="19.6" r="2.6" fill="${f}"/><path d="M49 18.6Q50 17.8 51 18.6" stroke="${l}" stroke-width=".3" fill="none"/>`;
        return s + ground(f, l);
      },
      (f, d, l) => { // Маракана: чаша в ракурсе, кольцевая кровля, рёбра фасада, поле с разметкой, прожекторы
        let s = `<path d="M18 50Q18 40 50 38Q82 40 82 50V60Q82 66 50 66Q18 66 18 60z" fill="${f}"/>${shadeR(d, 'M50 38Q82 40 82 50V60Q82 66 50 66z', .25)}`;
        for (let k = 0; k <= 30; k++) { const t = k / 30, x = 18 + t * 64, yb = 60 + Math.sin(t * Math.PI) * 6; s += `<path d="M${n2(x)} ${n2(50 + Math.sin(t * Math.PI) * 3)}V${n2(yb)}" stroke="${d}" stroke-width="${k % 3 ? .3 : .6}"/>`; }
        s += `<ellipse cx="50" cy="45" rx="31" ry="7.6" fill="${f}"/><ellipse cx="50" cy="45" rx="31" ry="7.6" fill="none" stroke="${l}" stroke-width=".5"/>`;
        s += `<ellipse cx="50" cy="45.4" rx="24" ry="5.4" fill="${d}"/>`;
        for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; s += `<path d="M${n2(50 + Math.cos(a) * 24)} ${n2(45.4 + Math.sin(a) * 5.4)}L${n2(50 + Math.cos(a) * 30.6)} ${n2(45 + Math.sin(a) * 7.4)}" stroke="${f}" stroke-width=".3" opacity=".7"/>`; }
        s += `<ellipse cx="50" cy="45.8" rx="16" ry="3.4" fill="${l}" opacity=".55"/><path d="M50 42.4V49.2" stroke="${d}" stroke-width=".3"/><ellipse cx="50" cy="45.8" rx="2.4" ry=".9" fill="none" stroke="${d}" stroke-width=".3"/>`;
        for (const x of [22, 78]) s += `<path d="M${x} 50V30" stroke="${f}" stroke-width=".9"/><path d="M${x - 2.4} 28H${x + 2.4}V31H${x - 2.4}z" fill="${f}"/><path d="M${x - 1.6} 29.5H${x + 1.6}" stroke="${l}" stroke-width=".7"/>`;
        return s + `<path d="M18 50Q18 40 50 38Q82 40 82 50" fill="none" stroke="${l}" stroke-width=".4"/>` + ground(f, l);
      }
    ],
    paris: [
      (f, d, l) => { // Триумфальная арка: аттик с фризом, карнизы, барельефы, кессоны свода, боковые проёмы
        let s = `<path d="M24 66V24H76V66H60V48Q50 36 40 48V66z" fill="${f}"/>${shadeR(d, 'M50 24H76V66H60V48Q55 42 50 41z', .25)}`;
        s += `<path d="M22 24H78V17H22z" fill="${f}"/><path d="M22 17H78M22 24H78" stroke="${l}" stroke-width=".55"/>` + Array.from({ length: 27 }, (_, i) => `<circle cx="${n2(23.2 + i * 2.06)}" cy="20.5" r=".45" fill="${d}"/>`).join('');
        s += `<path d="M21 15.4H79V17H21z" fill="${f}"/><path d="M24 29H76M24 31H76" stroke="${l}" stroke-width=".35"/><path d="M24 30H76" stroke="${d}" stroke-width=".5"/>`;
        s += `<path d="M40 48Q50 36 60 48" fill="none" stroke="${l}" stroke-width=".5"/>` + [0, 1, 2, 3].map(k => `<path d="M${41 + k * .2} ${n2(49 - k * 2.4)}Q50 ${n2(38 - k * 2.2)} ${59 - k * .2} ${n2(49 - k * 2.4)}" fill="none" stroke="${d}" stroke-width=".35"/>`).join('');
        for (const x of [27, 64]) { s += `<rect x="${x}" y="34" width="9" height="12" fill="${d}" opacity=".4"/><path d="M${x + 2} 45L${x + 3} 37L${x + 5} 39L${x + 6.6} 36L${x + 7.4} 45" stroke="${l}" stroke-width=".4" fill="none"/>`;
          s += arcWin(x + 2.4, 50, 4.2, 9, d, l) + `<rect x="${x - .6}" y="32" width="10.2" height="1" fill="${l}" opacity=".6"/>`; }
        s += `<path d="M24 66V24M76 66V24" stroke="${l}" stroke-width=".4"/><path d="M38 66V48M62 66V48" stroke="${d}" stroke-width=".6"/>`;
        return s + `<path d="M50 41V36" stroke="${l}" stroke-width=".4"/>` + ground(f, l);
      },
      (f, d, l) => { // пирамида Лувра: стеклянная решётка, малые пирамиды, фонтаны, крылья дворца с мансардами
        let s = '';
        for (const [x0, x1] of [[18, 36], [64, 82]]) { s += `<path d="M${x0} 50V40L${x0 + 2} 36H${x1 - 2}L${x1} 40V50z" fill="${f}" opacity=".75"/>` + gridWin(x0 + 1, 41.4, x1 - 2.6, 47, 2.6, 3.4, 1.2, 2.2, d) +
          `<path d="M${x0 + 2} 36H${x1 - 2}" stroke="${l}" stroke-width=".4"/>` + [x0 + 4, x1 - 6].map(x => `<rect x="${x}" y="37" width="1.6" height="1.6" fill="${d}"/>`).join(''); }
        s += `<path d="M50 14L77 60H23z" fill="${f}"/>${shadeR(d, 'M50 14L77 60H50z', .3)}`;
        for (let k = 1; k < 9; k++) { const y = 14 + k * 5.1, w = (y - 14) * .587; s += `<path d="M${n2(50 - w)} ${n2(y)}H${n2(50 + w)}" stroke="${l}" stroke-width=".3"/>`; }
        for (let k = -6; k <= 6; k++) s += `<path d="M50 14L${n2(50 + k * 4.5)} 60" stroke="${l}" stroke-width=".25"/>`;
        for (let k = 1; k < 9; k++) { const y = 14 + k * 5.1; s += `<path d="M${n2(50 - (y - 14) * .587)} ${n2(y)}L50 ${n2(y + 5.1)}L${n2(50 + (y - 14) * .587)} ${n2(y)}" stroke="${d}" stroke-width=".2" fill="none" opacity=".6"/>`; }
        s += `<path d="M44 60V55Q50 52 56 55V60z" fill="${d}"/>`;
        for (const x of [27, 73]) s += `<path d="M${x} 54L${x + 4} 61H${x - 4}z" fill="${f}"/>${shadeR(d, `M${x} 54L${x + 4} 61H${x}z`, .3)}`;
        s += `<path d="M18 61H82V64H18z" fill="${f}" opacity=".7"/><path d="M20 62.4H40M60 62.4H80" stroke="${l}" stroke-width=".4" stroke-dasharray="1.5 1"/>`;
        return s + ground(f, l);
      }
    ],
    shanghai: [
      (f, d, l) => { // Шанхайская башня (спираль с вырезом), рядом Цзинь Мао и «открывашка»
        let s = `<path d="M24 66V30L26 26L28 22L30 26L32 30V66z" fill="${f}" opacity=".85"/>` + [34, 40, 46, 52, 58].map(y => `<path d="M24 ${y}H32" stroke="${d}" stroke-width=".4"/>`).join('') + `<path d="M28 22V14" stroke="${f}" stroke-width=".6"/>`;
        s += `<path d="M66 66V20L74 18V66z" fill="${f}" opacity=".85"/><path d="M68.6 22.6H71.6V26.4H68.6z" fill="${d}"/>` + Array.from({ length: 10 }, (_, i) => `<path d="M66 ${30 + i * 3.6}H74" stroke="${d}" stroke-width=".25"/>`).join('');
        s += `<path d="M40 66Q38 44 43 22Q46 10 50 5Q55 9 58 20Q61 36 60 66z" fill="${f}"/>`;
        s += `<path d="M50 5Q55 9 58 20Q61 36 60 66H54Q57 40 50 5z" fill="${d}" opacity=".32"/>`;
        for (let y = 10; y < 65; y += 2.6) { const w0 = 40.4 + Math.pow((y - 5) / 61, 1.4) * -2 + (66 - y) * .05, w1 = 59.6 - (66 - y) * .03; s += `<path d="M${n2(Math.max(w0, 43 - (y - 22) * -.1))} ${n2(y)}Q50 ${n2(y + 1.2)} ${n2(Math.min(w1, 55 + (y - 5) * .08))} ${n2(y - .8)}" fill="none" stroke="${l}" stroke-width=".25" opacity=".75"/>`; }
        s += `<path d="M50 5Q48 30 52 66" fill="none" stroke="${d}" stroke-width=".6"/><path d="M47 14Q45 30 46 50" fill="none" stroke="${l}" stroke-width=".4"/>`;
        return s + ground(f, l);
      },
      (f, d, l) => { // чайный дом Юйюань: многоярусные крыши с загнутыми углами, решётчатые окна, зигзагообразный мост
        let s = '';
        [[36, 50], [28, 36], [18, 23]].forEach(([w, y], i) => {
          s += `<path d="M${50 - w / 2 + 2} ${y + 13}V${y + 3}H${50 + w / 2 - 2}V${y + 13}z" fill="${f}"/>${shadeR(d, `M50 ${y + 3}H${50 + w / 2 - 2}V${y + 13}H50z`, .25)}`;
          for (let x = 50 - w / 2 + 4; x < 50 + w / 2 - 4; x += 4) s += `<rect x="${n2(x)}" y="${y + 5}" width="2.6" height="${i ? 5 : 6}" fill="${d}"/><path d="M${n2(x)} ${y + 7.4}h2.6M${n2(x + 1.3)} ${y + 5}v${i ? 5 : 6}" stroke="${l}" stroke-width=".2"/>`;
          s += `<path d="M${50 - w / 2 - 6} ${y + 1}Q${50 - w / 2 - 2} ${y + 3.4} ${50 - w / 2 + 4} ${y + 3}H${50 + w / 2 - 4}Q${50 + w / 2 + 2} ${y + 3.4} ${50 + w / 2 + 6} ${y + 1}L${50 + w / 2 + 3} ${y + 1.4}Q${50 + w / 4} ${y - 5} 50 ${y - 5.4}Q${50 - w / 4} ${y - 5} ${50 - w / 2 - 3} ${y + 1.4}z" fill="${f}"/>`;
          s += `<path d="M${50 - w / 2 - 3} ${y + 1.4}Q${50 - w / 4} ${y - 5} 50 ${y - 5.4}" stroke="${l}" stroke-width=".4" fill="none"/>`;
          for (let k = -3; k <= 3; k++) s += `<path d="M${n2(50 + k * w / 7)} ${n2(y - 4.6 + Math.abs(k) * .6)}L${n2(50 + k * w / 6.2)} ${n2(y + 2.8)}" stroke="${d}" stroke-width=".25"/>`;
        });
        s += `<path d="M50 17.6V11M48 13.4H52" stroke="${f}" stroke-width=".9"/><circle cx="50" cy="10.4" r=".9" fill="${f}"/>`;
        s += `<path d="M18 62H34L40 59H56L62 62H82" fill="none" stroke="${f}" stroke-width="1.2"/>` + [22, 28, 34, 44, 52, 66, 74].map(x => `<path d="M${x} ${x < 36 || x > 60 ? 62 : 59}V66" stroke="${f}" stroke-width=".5"/>`).join('');
        return s + ground(f, l);
      }
    ],
    riyadh: [
      (f, d, l) => { // Аль-Файсалия: четырёхгранная игла, золотой шар-ресторан с сеткой, шпиль
        let s = `<path d="M38 66L47 30H53L62 66z" fill="${f}"/>${shadeR(d, 'M50 30H53L62 66H50z', .3)}`;
        for (let y = 34; y < 66; y += 2.4) { const w = 3 + (y - 30) * .33; s += `<path d="M${n2(50 - w)} ${n2(y)}H${n2(50 + w)}" stroke="${d}" stroke-width=".25" opacity=".8"/>`; }
        s += `<path d="M50 30V66" stroke="${l}" stroke-width=".35"/><path d="M43 50L50 38L57 50" stroke="${l}" stroke-width=".3" fill="none"/>`;
        s += `<circle cx="50" cy="24" r="6.6" fill="${f}"/><circle cx="50" cy="24" r="6.6" fill="none" stroke="${d}" stroke-width=".4"/>`;
        for (let k = -2; k <= 2; k++) s += `<ellipse cx="50" cy="24" rx="${n2(Math.abs(Math.cos(k * .55)) * 6.6)}" ry="6.6" fill="none" stroke="${d}" stroke-width=".25"/><path d="M${n2(50 - Math.sqrt(43.6 - (k * 2.4) ** 2))} ${n2(24 + k * 2.4)}H${n2(50 + Math.sqrt(43.6 - (k * 2.4) ** 2))}" stroke="${d}" stroke-width=".25"/>`;
        s += `<circle cx="47.6" cy="21.4" r="2" fill="${l}" opacity=".6"/><path d="M50 17.4V5" stroke="${f}" stroke-width="1"/><path d="M50 9V5" stroke="${l}" stroke-width=".4"/>`;
        s += `<path d="M22 66V54H34V66zM66 66V50H80V66z" fill="${f}" opacity=".7"/>` + gridWin(23.4, 56, 32, 63, 3, 3.4, 1.4, 1.8, d) + gridWin(67.4, 52, 78, 63, 3, 3.4, 1.4, 1.8, d);
        return s + ground(f, l);
      },
      (f, d, l) => { // крепость Масмак: глинобитные башни с треугольными зубцами, резные ворота, пальмы
        let s = '';
        for (const [x, w, h] of [[24, 7, 34], [76, 7, 34]]) { s += `<path d="M${x - w} 66L${x - w + 1.4} ${66 - h}H${x + w - 1.4}L${x + w} 66z" fill="${f}"/>${shadeR(d, `M${x} ${66 - h}H${x + w - 1.4}L${x + w} 66H${x}z`, .3)}`;
          for (let k = -2; k <= 2; k++) s += `<path d="M${x + k * 2.4 - 1.2} ${66 - h}L${x + k * 2.4} ${63 - h}L${x + k * 2.4 + 1.2} ${66 - h}z" fill="${f}"/>`;
          for (const y of [42, 50]) s += `<path d="M${x - 1.6} ${y + 3}V${y}L${x} ${y - 1.4}L${x + 1.6} ${y}V${y + 3}z" fill="${d}"/>`;
          s += `<path d="M${x - w + 1.6} 40H${x + w - 1.6}" stroke="${d}" stroke-width=".4" stroke-dasharray="1 1"/>`; }
        s += `<path d="M31 66V40H69V66z" fill="${f}"/>${shadeR(d, 'M50 40H69V66H50z', .2)}` + Array.from({ length: 16 }, (_, i) => `<path d="M${n2(31.2 + i * 2.4)} 40L${n2(32.4 + i * 2.4)} 37.4L${n2(33.6 + i * 2.4)} 40z" fill="${f}"/>`).join('');
        s += `<path d="M44 66V52Q50 46 56 52V66z" fill="${d}"/><path d="M45.6 66V53.4Q50 49 54.4 53.4V66M50 50V66" stroke="${l}" stroke-width=".35" fill="none"/>` + [56, 59, 62].map(y => `<path d="M46 ${y}H54" stroke="${l}" stroke-width=".25"/>`).join('');
        for (const x of [36, 64]) s += `<path d="M${x - 1.2} 50V46H${x + 1.2}V50z" fill="${d}"/>`;
        s += `<path d="M31 44H69" stroke="${d}" stroke-width=".5"/>`;
        const palm = (x, h) => { let p = `<path d="M${x} 66Q${x - 1.4} ${66 - h / 2} ${x + 1} ${66 - h}" stroke="${f}" stroke-width="1.6" fill="none"/>`;
          for (let k = 0; k < 7; k++) { const a = (-160 + k * 23) * Math.PI / 180; p += `<path d="M${x + 1} ${66 - h}q${n2(Math.cos(a) * 6)} ${n2(Math.sin(a) * 5 - 2)} ${n2(Math.cos(a) * 9)} ${n2(Math.sin(a) * 3 + 3)}" stroke="${f}" stroke-width="1.1" fill="none"/>`; } return p; };
        return s + palm(18, 26) + palm(83, 22) + ground(f, l);
      }
    ],
    katowice: [
      (f, d, l) => { // шахтный копёр: решётчатые ноги с раскосами, два шкива со спицами, машинный зал с трубой
        let s = '';
        const leg = (x0, x1) => { let p = `<path d="M${x0} 66L${x1} 22" stroke="${f}" stroke-width="1.8"/>`; return p; };
        s += leg(36, 46) + leg(52, 47.6) + leg(64, 54) + `<path d="M46 22H54" stroke="${f}" stroke-width="1.8"/>`;
        for (let y = 26; y < 64; y += 6) { const xl = 36 + (66 - y) / 44 * 10, xr = 64 - (66 - y) / 44 * 10, xl2 = 36 + (66 - y - 6) / 44 * 10, xr2 = 64 - (66 - y - 6) / 44 * 10;
          s += `<path d="M${n2(xl)} ${y}H${n2(xr)}M${n2(xl)} ${y}L${n2(xr2)} ${y - 6}M${n2(xr)} ${y}L${n2(xl2)} ${y - 6}" stroke="${f}" stroke-width=".6"/>`; }
        for (const [x, y, r] of [[45, 18, 6.4], [56, 21, 5.4]]) { s += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${f}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="1.2" fill="${f}"/>`;
          for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; s += `<path d="M${x} ${y}L${n2(x + Math.cos(a) * r)} ${n2(y + Math.sin(a) * r)}" stroke="${f}" stroke-width=".45"/>`; }
          s += `<path d="M${n2(x - r + 1)} ${n2(y - 2)}A${r - 1} ${r - 1} 0 0 1 ${n2(x)} ${n2(y - r + 1)}" stroke="${l}" stroke-width=".4" fill="none"/>`; }
        s += `<path d="M66 66V46H82V66z" fill="${f}"/>${shadeR(d, 'M74 46H82V66H74z', .25)}<path d="M64.6 46L74 40L83.4 46z" fill="${f}"/>` + [68, 72, 76].map(x => arcWin(x, 50, 2.4, 6, d, l)).join('') + `<path d="M77 40V28H80V43" fill="${f}"/><path d="M76.6 28H80.4" stroke="${l}" stroke-width=".5"/>`;
        s += `<path d="M18 66V54H30V66z" fill="${f}" opacity=".7"/><path d="M17 54L24 50L31 54z" fill="${f}" opacity=".7"/>`;
        return s + ground(f, l);
      },
      (f, d, l) => { // шахтёрский знак: скрещённые молоты с древками, лампа-«карбидка», венок
        let s = '';
        for (const sx of [-1, 1]) { const x0 = 50 - sx * 22, x1 = 50 + sx * 12;
          s += `<path d="M${x0} 60L${x1} 22" stroke="${f}" stroke-width="2.6" stroke-linecap="round"/><path d="M${x0 + sx * .6} 59L${x1 + sx * .6} 22.4" stroke="${l}" stroke-width=".4"/>`;
          s += `<g transform="rotate(${sx * 41} ${x1} 22)"><path d="M${x1 - 7} 18H${x1 + 7}L${x1 + 8} 22L${x1 + 7} 26H${x1 - 7}L${x1 - 8} 22z" fill="${f}"/><path d="M${x1} 18H${x1 + 7}L${x1 + 8} 22L${x1 + 7} 26H${x1}z" fill="${d}" opacity=".3"/><path d="M${x1 - 7} 18.6H${x1 + 7}" stroke="${l}" stroke-width=".4"/></g>`; }
        s += `<path d="M43 40H57V52Q57 58 50 58Q43 58 43 52z" fill="${f}"/>${shadeR(d, 'M50 40H57V52Q57 58 50 58z', .3)}<path d="M45 40Q50 32 55 40" fill="none" stroke="${f}" stroke-width="1.4"/>`;
        s += `<circle cx="50" cy="48" r="3.6" fill="${l}" opacity=".85"/><circle cx="50" cy="48" r="3.6" fill="none" stroke="${d}" stroke-width=".5"/><path d="M43 44H57M43 54H57" stroke="${d}" stroke-width=".4"/>`;
        for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) { const t = i / 6, x = 50 + sx * (8 + t * 18), y = 64 - t * t * 10; s += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="1.2" ry="2.8" transform="rotate(${n2(sx * (60 + t * 30))} ${n2(x)} ${n2(y)})" fill="${f}"/>`; }
        return s + ground(f, l);
      }
    ],
    stockholm: [
      (f, d, l) => { // корабль «Васа»: корпус с орудийными портами, резная корма, три мачты с такелажем
        let s = `<path d="M20 50H74L80 42H84L80 60Q60 64 30 62Q22 58 20 50z" fill="${f}"/>${shadeR(d, 'M20 56H82L80 60Q60 64 30 62Q22 58 20 56z', .35)}`;
        for (const y of [52.4, 56.6]) for (let x = 26; x < 76; x += 4) s += sqWin(x, y, 1.8, 1.6, d);
        s += `<path d="M20 50H74M22 54.6H78" stroke="${l}" stroke-width=".4"/><path d="M70 50V38H80V44" fill="${f}"/>` + [72, 75, 78].map(x => sqWin(x - .6, 40, 1.4, 2.6, d)).join('') + `<path d="M70 38H80" stroke="${l}" stroke-width=".5"/>`;
        s += `<path d="M20 50L12 44" stroke="${f}" stroke-width="1.2"/>`;
        for (const [x, top] of [[30, 22], [46, 10], [62, 16]]) { s += `<path d="M${x} 50V${top}" stroke="${f}" stroke-width="1.2"/>`;
          for (const y of [top + 6, top + 16, top + 26].filter(y => y < 48)) s += `<path d="M${x - 7} ${y}H${x + 7}" stroke="${f}" stroke-width=".8"/><path d="M${x - 6} ${y + .8}Q${x} ${y + 3} ${x + 6} ${y + .8}" fill="${l}" opacity=".7"/>`;
          s += `<path d="M${x} ${top}L${x - 10} 50M${x} ${top}L${x + 10} 50" stroke="${l}" stroke-width=".22" opacity=".8"/><path d="M${x} ${top}l4 1.4-4 1.4z" fill="${f}"/>`; }
        return s + `<path d="M12 44L30 22L46 10L62 16L80 38" stroke="${l}" stroke-width=".22" fill="none" opacity=".7"/>`;
      }
    ],
    london: [
      (f, d, l) => { // Тауэрский мост: готические башни с башенками, верхние галереи-фермы, цепи, разводные пролёты
        let s = '';
        for (const x of [34, 66]) {
          s += `<path d="M${x - 7} 66V24H${x + 7}V66z" fill="${f}"/>${shadeR(d, `M${x} 24H${x + 7}V66H${x}z`, .28)}`;
          for (const y of [28, 36, 54]) s += arcWin(x - 4, y, 2.6, 5.6, d, l) + arcWin(x + 1.4, y, 2.6, 5.6, d, l);
          s += `<path d="M${x - 7} 24L${x} 12L${x + 7} 24z" fill="${f}"/>${shadeR(d, `M${x} 12L${x + 7} 24H${x}z`, .35)}`;
          for (const dx of [-7, 7]) s += `<path d="M${x + dx - 1.4} 24V18H${x + dx + 1.4}V24z" fill="${f}"/><path d="M${x + dx - 1.6} 18L${x + dx} 13L${x + dx + 1.6} 18z" fill="${f}"/>`;
          s += `<path d="M${x} 12V9" stroke="${f}" stroke-width=".6"/><path d="M${x - 7} 34H${x + 7}M${x - 7} 46H${x + 7}" stroke="${l}" stroke-width=".4"/>`;
        }
        s += `<path d="M41 26H59V29H41zM41 31H59V33H41z" fill="${f}"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M${41 + i * 3} 29L${44 + i * 3} 31M${44 + i * 3} 29L${41 + i * 3} 31" stroke="${d}" stroke-width=".3"/>`).join('');
        s += `<path d="M14 46Q22 46 27 28M73 28Q78 46 86 46" fill="none" stroke="${f}" stroke-width="1.2"/><path d="M14 47Q22 47 27 30M73 30Q78 47 86 47" fill="none" stroke="${l}" stroke-width=".3"/>`;
        s += `<path d="M14 48H41L50 46L59 48H86V51H14z" fill="${f}"/><path d="M41 48L50 46L59 48" stroke="${l}" stroke-width=".45" fill="none"/>`;
        return s + ground(f, l);
      }
    ],
    berlin: [
      (f, d, l) => { // Телебашня: шар с поясом окон и гранями, ствол с кольцами, антенна с полосами, павильон с изломанной кровлей
        let s = `<path d="M47 66L48.4 32H51.6L53 66z" fill="${f}"/>${shadeR(d, 'M50 32H51.6L53 66H50z', .3)}` + [40, 48, 56].map(y => `<path d="M48 ${y}H52" stroke="${l}" stroke-width=".4"/>`).join('');
        s += `<circle cx="50" cy="26" r="8" fill="${f}"/>${shadeR(d, 'M50 18A8 8 0 0 1 50 34z', .3)}`;
        for (let k = 1; k < 8; k++) { const x = 42 + k * 2; s += `<path d="M${x} ${n2(26 - Math.sqrt(64 - (x - 50) ** 2))}V${n2(26 + Math.sqrt(64 - (x - 50) ** 2))}" stroke="${d}" stroke-width=".22"/>`; }
        s += `<path d="M42.2 25H57.8V28H42.2z" fill="${d}"/>` + Array.from({ length: 8 }, (_, i) => `<rect x="${n2(42.8 + i * 1.9)}" y="25.6" width="1.2" height="1.8" fill="${l}" opacity=".8"/>`).join('');
        s += `<circle cx="47" cy="22" r="2" fill="${l}" opacity=".55"/><path d="M48.8 18.4L49.2 14H50.8L51.2 18.4z" fill="${f}"/><path d="M50 14V3" stroke="${f}" stroke-width=".9"/>` + [5, 8, 11].map(y => `<path d="M49.4 ${y}H50.6" stroke="${d}" stroke-width=".9"/>`).join('');
        s += `<path d="M28 66V58L34 54L40 58L46 54V66zM54 66V54L60 58L66 54L72 58V66z" fill="${f}" opacity=".8"/>` + gridWin(30, 60, 42, 63, 3, 4, 1.4, 2, d) + gridWin(56, 60, 70, 63, 3, 4, 1.4, 2, d);
        return s + ground(f, l);
      }
    ],
    krakow: [
      (f, d, l) => { // Суконные ряды на фоне Мариацкого костёла: аттик с маскаронами, аркада, главный проезд
        let s = `<path d="M58 40V18L60 14V10L62 6L64 10V14L66 18V40z" fill="${f}" opacity=".7"/><path d="M70 40V20H76V40z" fill="${f}" opacity=".7"/><path d="M69 20L73 12L77 20z" fill="${f}" opacity=".7"/>`;
        s += `<path d="M18 66V40H82V66z" fill="${f}"/>${shadeR(d, 'M18 58H82V66H18z', .15)}`;
        for (let x = 20; x < 80; x += 5.6) s += `<path d="M${n2(x)} 66V56Q${n2(x + 2.2)} 52 ${n2(x + 4.4)} 56V66z" fill="${d}"/><path d="M${n2(x - .3)} 55.6H${n2(x + 4.7)}" stroke="${l}" stroke-width=".25"/>`;
        s += gridWin(20.6, 44, 79, 48, 4.2, 6, 1.6, 3.4, d) + `<path d="M18 40H82M18 50H82" stroke="${l}" stroke-width=".4"/>`;
        for (let x = 19; x <= 81; x += 4.4) s += `<path d="M${n2(x - 1.6)} 40V37Q${n2(x)} 33 ${n2(x + 1.6)} 37V40z" fill="${f}"/><circle cx="${n2(x)}" cy="38" r=".5" fill="${d}"/>`;
        s += `<path d="M43 66V48Q50 42 57 48V66z" fill="${d}"/><path d="M42 40V30H58V40z" fill="${f}"/><path d="M41 30L50 22L59 30z" fill="${f}"/>${shadeR(d, 'M50 22L59 30H50z', .3)}<circle cx="50" cy="34.6" r="2.2" fill="${d}"/>`;
        return s + ground(f, l);
      }
    ],
    astana: [
      (f, d, l) => { // «Хан Шатыр»: шатёр-сетка из тросов, наклонная мачта, стеклянный цоколь
        let s = `<path d="M20 66Q30 54 40 30Q45 18 52 6Q56 20 62 34Q70 52 80 66z" fill="${f}"/>${shadeR(d, 'M52 6Q56 20 62 34Q70 52 80 66H52z', .3)}`;
        for (let k = -6; k <= 6; k++) s += `<path d="M52 7Q${n2(52 + k * 2)} 36 ${n2(50 + k * 4.6)} 66" stroke="${l}" stroke-width=".3" fill="none" opacity=".75"/>`;
        for (let y = 16; y < 66; y += 5) { const w = (y - 6) * .5; s += `<path d="M${n2(51 - w)} ${y}Q51 ${y + 2} ${n2(52 + w * .95)} ${y}" stroke="${d}" stroke-width=".3" fill="none"/>`; }
        s += `<path d="M52 6L53 0" stroke="${f}" stroke-width=".9"/><path d="M22 66V60H78V66z" fill="${d}" opacity=".5"/>` + Array.from({ length: 14 }, (_, i) => `<path d="M${24 + i * 4} 60V66" stroke="${l}" stroke-width=".3"/>`).join('');
        return s + ground(f, l);
      }
    ],
    antwerp: [
      (f, d, l) => { // центральный вокзал: купол с рёбрами и часами, угловые башенки, арочные окна, стеклянный дебаркадер
        let s = `<path d="M18 66V44H82V66z" fill="${f}"/>${shadeR(d, 'M50 44H82V66H50z', .22)}`;
        s += `<path d="M34 44Q34 22 50 16Q66 22 66 44z" fill="${f}"/>${shadeR(d, 'M50 16Q66 22 66 44H50z', .3)}`;
        for (const k of [-12, -6, 0, 6, 12]) s += `<path d="M50 16.4Q${n2(50 + k * .8)} 28 ${n2(50 + k * 1.3)} 44" stroke="${d}" stroke-width=".35" fill="none"/>`;
        s += `<circle cx="50" cy="32" r="4.4" fill="${l}" opacity=".85"/><circle cx="50" cy="32" r="4.4" fill="none" stroke="${d}" stroke-width=".6"/><path d="M50 32V29M50 32L52.2 33" stroke="${d}" stroke-width=".5"/>`;
        s += `<path d="M48 16L50 9L52 16z" fill="${f}"/><path d="M50 9V6" stroke="${f}" stroke-width=".6"/>`;
        for (const x of [24, 76]) s += `<path d="M${x - 4} 44V30H${x + 4}V44z" fill="${f}"/><path d="M${x - 4.6} 30L${x} 22L${x + 4.6} 30z" fill="${f}"/>${shadeR(d, `M${x} 22L${x + 4.6} 30H${x}z`, .35)}` + arcWin(x - 1.2, 33, 2.4, 6, d, l);
        for (const x of [21, 28, 35, 59, 66, 73]) s += arcWin(x, 50, 4, 9, d, l);
        s += `<path d="M42 66V52Q50 44 58 52V66z" fill="${d}"/><path d="M42 52Q50 44 58 52" stroke="${l}" stroke-width=".45" fill="none"/>` + [44, 47, 50, 53, 56].map(x => `<path d="M${x} 52V66" stroke="${l}" stroke-width=".25"/>`).join('');
        return s + `<path d="M18 44H82" stroke="${l}" stroke-width=".5"/>` + ground(f, l);
      }
    ],
    bucharest: [
      (f, d, l) => { // Дворец парламента: ярусы с колоннадами, центральный портик с фронтоном, ряды окон
        let s = `<path d="M18 66V48H82V66zM24 48V38H76V48zM32 38V30H68V38z" fill="${f}"/>${shadeR(d, 'M50 30H68V38H76V48H82V66H50z', .2)}`;
        s += gridWin(19.6, 51, 80, 63, 3.2, 4, 1.6, 2.6, d) + gridWin(25.6, 40.4, 74.4, 45, 3.2, 4, 1.6, 2.6, d) + gridWin(33.6, 32, 66.4, 35, 3.2, 4, 1.6, 2.6, d);
        for (const y of [48, 38, 30]) s += `<path d="M${18 + (48 - y) * .7} ${y}H${82 - (48 - y) * .7}" stroke="${l}" stroke-width=".5"/>`;
        s += `<path d="M40 66V44H60V66z" fill="${f}"/>` + [41.4, 44.4, 47.4, 50.4, 53.4, 56.4].map(x => `<rect x="${x}" y="46" width="1.6" height="18" fill="${d}" opacity=".55"/><rect x="${x}" y="46" width=".5" height="18" fill="${l}" opacity=".6"/>`).join('');
        s += `<path d="M38.6 44L50 36L61.4 44z" fill="${f}"/><path d="M38.6 44L50 36L61.4 44" fill="none" stroke="${l}" stroke-width=".5"/><circle cx="50" cy="41" r="1.2" fill="${d}"/>`;
        s += `<path d="M44 30V24H56V30z" fill="${f}"/><path d="M46 24V20H54V24z" fill="${f}"/><path d="M50 20V15M48.4 16.4H51.6" stroke="${f}" stroke-width=".7"/>`;
        return s + ground(f, l);
      }
    ],
    lisbon: [
      (f, d, l) => { // трамвай 28 на подъёме: окна, двери, пантограф, рельсы, дома с черепицей
        let s = '';
        for (const [x, w, h] of [[18, 12, 26], [62, 10, 30], [72, 10, 22]]) { s += `<path d="M${x} 66V${66 - h}H${x + w}V66z" fill="${f}" opacity=".55"/><path d="M${x - 1} ${66 - h}L${x + w / 2} ${62 - h}L${x + w + 1} ${66 - h}z" fill="${f}" opacity=".55"/>` + gridWin(x + 1.6, 68 - h, x + w - 3, 62, 3.4, 5, 1.6, 2.6, d); }
        s += `<path d="M18 66L82 58" stroke="${f}" stroke-width="1"/><path d="M18 64L82 56" stroke="${f}" stroke-width=".5"/>`;
        s += `<g transform="rotate(-7 50 50)"><path d="M28 60V40Q28 37 31 37H69Q72 37 72 40V60z" fill="${f}"/>${shadeR(d, 'M28 52H72V60H28z', .35)}<path d="M27 37H73V34.6Q50 31 27 34.6z" fill="${f}"/>` +
          [30.6, 37, 43.4, 56.6, 63].map(x => `<rect x="${x}" y="40" width="5" height="7" rx=".6" fill="${d}"/><path d="M${x} 43.4H${x + 5}" stroke="${l}" stroke-width=".25"/>`).join('') +
          `<rect x="49.8" y="40" width="5" height="18" fill="${d}"/><path d="M52.3 40V58" stroke="${l}" stroke-width=".3"/><path d="M28 49H72" stroke="${l}" stroke-width=".4"/>` +
          `<rect x="66" y="50.6" width="4.4" height="3" fill="${l}" opacity=".85"/><path d="M48 33L44 24H58" stroke="${f}" stroke-width=".7" fill="none"/>` +
          `<circle cx="35" cy="61" r="2.4" fill="${d}"/><circle cx="65" cy="61" r="2.4" fill="${d}"/><circle cx="35" cy="61" r=".8" fill="${l}"/><circle cx="65" cy="61" r=".8" fill="${l}"/></g>`;
        return s + `<path d="M18 66L82 58" stroke="${l}" stroke-width=".3"/>`;
      }
    ],
    sydney: [
      (f, d, l) => { // мост Харбор-Бридж: двойная ферменная арка, гранитные пилоны, флаги
        let s = '';
        const A = t => [24 + 52 * t, 48 - Math.sin(t * Math.PI) * 30], B = t => [24 + 52 * t, 48 - Math.sin(t * Math.PI) * 21];
        s += `<path d="M24 48Q50 -12 76 48" fill="none" stroke="${f}" stroke-width="2.2"/><path d="M24 48Q50 6 76 48" fill="none" stroke="${f}" stroke-width="1.4"/>`;
        for (let k = 0; k < 14; k++) { const a = A(k / 14), b = B((k + 1) / 14), c = A((k + 1) / 14), bb = B(k / 14);
          s += `<path d="M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}L${n2(c[0])} ${n2(c[1])}M${n2(bb[0])} ${n2(bb[1])}L${n2(a[0])} ${n2(a[1])}" fill="none" stroke="${d}" stroke-width=".4"/>`; }
        for (let k = 2; k < 13; k++) { const b = B(k / 14); if (b[1] < 44) s += `<path d="M${n2(b[0])} ${n2(b[1])}V44" stroke="${f}" stroke-width=".45"/>`; }
        s += `<path d="M14 44H86V47H14z" fill="${f}"/><path d="M14 44H86" stroke="${l}" stroke-width=".45"/><path d="M14 45.6H86" stroke="${d}" stroke-width=".3" stroke-dasharray="1 .7"/>`;
        for (const x of [20, 80]) { s += `<path d="M${x - 5} 66V36H${x + 5}V66z" fill="${f}"/>${shadeR(d, `M${x} 36H${x + 5}V66H${x}z`, .28)}` + [40, 48, 56].map(y => `<path d="M${x - 5} ${y}H${x + 5}" stroke="${d}" stroke-width=".3"/>`).join('') + arcWin(x - 2, 50, 4, 12, d, l) + `<path d="M${x - 5.6} 36H${x + 5.6}" stroke="${l}" stroke-width=".5"/>`; }
        s += `<path d="M50 18V12" stroke="${f}" stroke-width=".5"/><path d="M50 12h3.4v2H50z" fill="${f}"/>`;
        return s + ground(f, l);
      }
    ]
  };
  const onion = (cx, by, w, h, f, d, l, stripes) => { // луковичный купол с полосами
    let s = `<path d="M${n2(cx - w)} ${by}Q${n2(cx - w * 1.25)} ${n2(by - h * .55)} ${cx} ${n2(by - h)}Q${n2(cx + w * 1.25)} ${n2(by - h * .55)} ${n2(cx + w)} ${by}z" fill="${f}"/>`;
    if (stripes) for (let k = -2; k <= 2; k++) s += `<path d="M${n2(cx + k * w * .4)} ${by}Q${n2(cx + k * w * .55)} ${n2(by - h * .6)} ${cx} ${n2(by - h)}" stroke="${d}" stroke-width=".45" fill="none"/>`;
    return s + `<path d="M${n2(cx + w * .1)} ${by}Q${n2(cx + w * 1.2)} ${n2(by - h * .55)} ${cx} ${n2(by - h)}" fill="${d}" opacity=".28"/><path d="M${n2(cx - w * .5)} ${n2(by - h * .3)}Q${n2(cx - w * .7)} ${n2(by - h * .6)} ${n2(cx - w * .2)} ${n2(by - h * .85)}" stroke="${l}" stroke-width=".4" fill="none"/>` +
      `<path d="M${cx} ${n2(by - h)}V${n2(by - h - 3)}M${n2(cx - 1.2)} ${n2(by - h - 2)}H${n2(cx + 1.2)}" stroke="${f}" stroke-width=".6"/>`;
  };
  const drum = (cx, top, bot, w, f, d, l) => `<path d="M${n2(cx - w)} ${bot}V${top}H${n2(cx + w)}V${bot}z" fill="${f}"/>${shadeR(d, `M${cx} ${top}H${n2(cx + w)}V${bot}H${cx}z`, .28)}` + arcWin(cx - w * .35, top + (bot - top) * .25, w * .7, (bot - top) * .55, d, l);
  const pagodaRoof = (cx, y, w, f, d, l) => `<path d="M${n2(cx - w - 5)} ${y}Q${n2(cx - w)} ${y + 2} ${n2(cx - w + 3)} ${y + 1.6}H${n2(cx + w - 3)}Q${n2(cx + w)} ${y + 2} ${n2(cx + w + 5)} ${y}L${n2(cx + w + 2)} ${y + .4}Q${cx} ${y - 6} ${n2(cx - w - 2)} ${y + .4}z" fill="${f}"/><path d="M${n2(cx - w - 2)} ${y + .4}Q${cx} ${y - 6} ${n2(cx + w + 2)} ${y + .4}" stroke="${l}" stroke-width=".4" fill="none"/>` +
    Array.from({ length: 7 }, (_, k) => `<path d="M${n2(cx - w + k * w / 3)} ${n2(y - 3.6 + Math.abs(k - 3) * .5)}L${n2(cx - w * 1.1 + k * w * .37)} ${y + 1.4}" stroke="${d}" stroke-width=".25"/>`).join('');
  const LN = {
    moscow: (f, d, l) => { // собор Василия Блаженного: девять луковиц с полосами, шатёр, галерея
      let s = `<path d="M20 66V48H80V66z" fill="${f}"/>${shadeR(d, 'M50 48H80V66H50z', .2)}`;
      for (let x = 22; x < 79; x += 4.6) s += arcWin(x, 54, 2.8, 7, d, l);
      s += `<path d="M46 48V22L50 8L54 22V48z" fill="${f}"/>${shadeR(d, 'M50 8L54 22V48H50z', .3)}` + [24, 30, 36, 42].map(y => `<path d="M${n2(46 + (48 - y) * 0)} ${y}H54" stroke="${d}" stroke-width=".35"/>`).join('') + `<path d="M48.6 14L50 8L51.4 14" stroke="${l}" stroke-width=".3" fill="none"/>`;
      for (const [x, b, w, h] of [[30, 42, 5.4, 12], [70, 42, 5.4, 12], [38, 34, 4.6, 10], [62, 34, 4.6, 10], [24, 48, 4, 8], [76, 48, 4, 8]]) s += drum(x, b, 48, w * .75, f, d, l) + onion(x, b, w, h, f, d, l, true);
      return s + `<path d="M45 66V58Q50 53 55 58V66z" fill="${d}"/>` + ground(f, l);
    },
    petersburg: (f, d, l) => { // Петропавловский шпиль и разведённый Дворцовый мост
      let s = `<path d="M44 52V34H56V52z" fill="${f}"/>${shadeR(d, 'M50 34H56V52H50z', .3)}<path d="M45 34V26H55V34z" fill="${f}"/><path d="M47 26L50 3L53 26z" fill="${f}"/>${shadeR(d, 'M50 3L53 26H50z', .35)}` + arcWin(48, 38, 4, 8, d, l) + `<path d="M50 3V0" stroke="${f}" stroke-width=".5"/><path d="M49 1.4L51 2.6" stroke="${f}" stroke-width=".9"/>`;
      s += `<path d="M18 52H40V55H18zM60 52H82V55H60z" fill="${f}"/>`;
      s += `<path d="M40 55L46 32L48 33L42 55z" fill="${f}"/><path d="M60 55L54 32L52 33L58 55z" fill="${f}"/>` + [0, 1, 2, 3].map(k => `<path d="M${n2(40.6 + k * 1.5)} ${n2(53 - k * 5.4)}L${n2(42.4 + k * 1.5)} ${n2(53.4 - k * 5.4)}M${n2(59.4 - k * 1.5)} ${n2(53 - k * 5.4)}L${n2(57.6 - k * 1.5)} ${n2(53.4 - k * 5.4)}" stroke="${d}" stroke-width=".6"/>`).join('');
      for (const x of [24, 32, 68, 76]) s += `<path d="M${x - 3} 66V55H${x + 3}V66z" fill="${f}"/><path d="M${x - 3} 55Q${x} 59 ${x + 3} 55" fill="${d}" opacity=".4"/>`;
      s += [22, 28, 34, 66, 72, 78].map(x => `<path d="M${x} 52V48M${x - .8} 48H${x + .8}" stroke="${f}" stroke-width=".6"/><circle cx="${x}" cy="47.4" r=".7" fill="${l}"/>`).join('');
      return s + ground(f, l);
    },
    kyiv: (f, d, l) => { // Великая Лаврская колокольня и золотые купола
      let s = '';
      for (const [w, t, b] of [[9, 46, 66], [7.4, 34, 46], [6, 24, 34], [4.6, 16, 24]]) s += `<path d="M${50 - w} ${b}V${t}H${50 + w}V${b}z" fill="${f}"/>${shadeR(d, `M50 ${t}H${50 + w}V${b}H50z`, .28)}<path d="M${50 - w - .8} ${t}H${50 + w + .8}" stroke="${l}" stroke-width=".5"/>` + [-w * .5, w * .5 - 2].map(dx => arcWin(50 + dx - .2, t + 2, 2.2, (b - t) * .6, d, l)).join('') + [-w + .6, w - 1.4].map(dx => `<rect x="${n2(50 + dx)}" y="${t + 1}" width=".8" height="${b - t - 2}" fill="${l}" opacity=".5"/>`).join('');
      s += onion(50, 16, 4.6, 9, f, d, l, false);
      for (const x of [26, 74]) s += drum(x, 50, 66, 5, f, d, l) + onion(x, 50, 6, 10, f, d, l, false);
      return s + ground(f, l);
    },
    almaty: (f, d, l) => { // телебашня Кок-Тобе на фоне снежных пиков Заилийского Алатау
      let s = `<path d="M18 52L30 30L38 42L50 22L62 40L70 28L82 52z" fill="${f}" opacity=".6"/><path d="M30 30L26 37L31 35L34 38zM50 22L45 31L50 29L54 33zM70 28L66 35L71 33L74 37z" fill="${l}"/>`;
      s += `<path d="M18 66Q30 52 44 56Q56 50 66 54Q76 52 82 60V66z" fill="${f}"/>${shadeR(d, 'M56 50Q66 54 76 52Q80 56 82 60V66H56z', .25)}`;
      s += `<path d="M58 54L60 12L62 54z" fill="${f}"/><path d="M57 54L60 12M63 54L60 12" stroke="${l}" stroke-width=".3"/>` + [20, 26, 32, 38, 44, 50].map(y => `<path d="M${n2(59.6 - (y - 12) * .04)} ${y}H${n2(60.4 + (y - 12) * .04)}" stroke="${d}" stroke-width=".9"/>`).join('');
      for (let x = 22; x < 54; x += 5) s += `<circle cx="${x}" cy="${n2(60 - Math.sin((x - 18) / 30) * 3)}" r="1.6" fill="${d}" opacity=".5"/>`;
      return s + ground(f, l);
    },
    tashkent: (f, d, l) => { // медресе: портал-пештак с арочной нишей, бирюзовые купола, минареты
      let s = '';
      for (const x of [22, 78]) s += `<path d="M${x - 3} 66L${x - 2.4} 22H${x + 2.4}L${x + 3} 66z" fill="${f}"/>${shadeR(d, `M${x} 22H${x + 2.4}L${x + 3} 66H${x}z`, .3)}<path d="M${x - 3.6} 22H${x + 3.6}V19H${x - 3.6}z" fill="${f}"/>` + onion(x, 19, 3, 5, f, d, l, false) + [30, 40, 50].map(y => `<path d="M${x - 2.6} ${y}H${x + 2.6}" stroke="${d}" stroke-width=".6" stroke-dasharray=".8 .5"/>`).join('');
      for (const x of [33, 67]) s += `<path d="M${x - 7} 66V46H${x + 7}V66z" fill="${f}"/>` + arcWin(x - 3, 50, 6, 12, d, l) + `<path d="M${x - 6} 46Q${x - 6} 36 ${x} 34Q${x + 6} 36 ${x + 6} 46z" fill="${f}"/><path d="M${x - 6} 46Q${x - 6} 36 ${x} 34" stroke="${l}" stroke-width=".4" fill="none"/>` + [-3, 0, 3].map(k => `<path d="M${x + k} 46Q${x + k * .6} 40 ${x} 34" stroke="${d}" stroke-width=".3" fill="none"/>`).join('');
      s += `<path d="M38 66V22H62V66z" fill="${f}"/>${shadeR(d, 'M50 22H62V66H50z', .2)}<path d="M42 66V38Q42 30 50 27Q58 30 58 38V66z" fill="${d}"/>`;
      for (let y = 30; y < 64; y += 3) s += `<path d="M43 ${y}H57" stroke="${f}" stroke-width=".25" opacity=".5"/>`;
      s += `<path d="M38 22H62M39.4 24H60.6V66M39.4 24V66" stroke="${l}" stroke-width=".4" fill="none"/>` + Array.from({ length: 8 }, (_, i) => `<path d="M${40 + i * 2.6} 22.6l1.3 1.3-1.3 1.3-1.3-1.3z" fill="${d}"/>`).join('');
      return s + ground(f, l);
    },
    baku: (f, d, l) => { // «Пламенные башни»: три стеклянные башни-языка огня
      let s = '';
      for (const [x, h, w] of [[34, 30, 9], [50, 12, 10], [66, 24, 9]]) {
        s += `<path d="M${x - w} 66Q${x - w - 2} ${h + 26} ${x - 2} ${h + 4}Q${x} ${h} ${x + 2} ${h + 2}Q${x + w + 1} ${h + 24} ${x + w} 66z" fill="${f}"/>${shadeR(d, `M${x + 2} ${h + 2}Q${x + w + 1} ${h + 24} ${x + w} 66H${x + 1}Q${x + 3} ${h + 30} ${x + 2} ${h + 2}z`, .3)}`;
        for (let y = h + 6; y < 66; y += 3) { const t = (y - h) / (66 - h), ww = w * Math.min(1, t * 1.5); s += `<path d="M${n2(x - ww)} ${y}Q${x} ${n2(y - 1)} ${n2(x + ww)} ${y}" stroke="${l}" stroke-width=".22" fill="none" opacity=".75"/>`; }
        s += `<path d="M${x - 2} ${h + 4}Q${x - w * .6} ${h + 26} ${x - w * .7} 64" stroke="${l}" stroke-width=".4" fill="none"/>`;
      }
      return s + ground(f, l);
    },
    warsaw: (f, d, l) => { // Дворец культуры и науки: ступенчатая высотка со шпилем, колонна Сигизмунда
      let s = `<path d="M30 66V48H70V66z" fill="${f}"/><path d="M36 48V36H64V48zM41 36V26H59V36zM44.6 26V18H55.4V26zM47 18V12H53V18z" fill="${f}"/>${shadeR(d, 'M50 12H53V18H55.4V26H59V36H64V48H70V66H50z', .25)}`;
      s += gridWin(32, 52, 67, 63, 3, 4, 1.4, 2.4, d) + gridWin(38, 38, 62, 45, 2.6, 3.6, 1.2, 2, d) + gridWin(42.6, 28, 57, 33, 2.4, 3.4, 1.1, 2, d) + gridWin(46.2, 20, 53, 23, 2.2, 3, 1, 1.8, d);
      for (const [x0, x1, y] of [[30, 70, 48], [36, 64, 36], [41, 59, 26], [44.6, 55.4, 18]]) s += Array.from({ length: Math.round((x1 - x0) / 3) + 1 }, (_, i) => `<path d="M${n2(x0 + i * 3 - .6)} ${y}V${y - 1.6}H${n2(x0 + i * 3 + .6)}V${y}" fill="${f}"/>`).join('') + `<path d="M${x0} ${y}H${x1}" stroke="${l}" stroke-width=".4"/>`;
      s += `<path d="M48.6 12L50 1L51.4 12z" fill="${f}"/>`;
      s += `<path d="M22 66V30H24V66z" fill="${f}"/><path d="M20.6 30H25.4V28H20.6z" fill="${f}"/><path d="M23 28V22M21 24L25 25" stroke="${f}" stroke-width="1"/><circle cx="23" cy="21" r="1.2" fill="${f}"/>`;
      return s + ground(f, l);
    },
    prague: (f, d, l) => { // Староместская мостовая башня и Карлов мост со статуями
      let s = `<path d="M38 66V30H62V66z" fill="${f}"/>${shadeR(d, 'M50 30H62V66H50z', .25)}<path d="M43 66V54Q50 46 57 54V66z" fill="${d}"/>`;
      s += `<path d="M36 30L50 6L64 30z" fill="${f}"/>${shadeR(d, 'M50 6L64 30H50z', .35)}` + [12, 18, 24].map(y => `<path d="M${n2(50 - (y - 6) * .58)} ${y}H${n2(50 + (y - 6) * .58)}" stroke="${d}" stroke-width=".35"/>`).join('');
      for (const x of [38, 62]) s += `<path d="M${x - 2} 30V22H${x + 2}V30z" fill="${f}"/><path d="M${x - 2.4} 22L${x} 15L${x + 2.4} 22z" fill="${f}"/>`;
      s += arcWin(41, 36, 3, 7, d, l) + arcWin(48.5, 34, 3, 9, d, l) + arcWin(56, 36, 3, 7, d, l) + `<path d="M38 44H62" stroke="${l}" stroke-width=".5"/><path d="M40 46H60V50H40z" fill="${d}" opacity=".35"/>`;
      s += `<path d="M18 56H38M62 56H82" stroke="${f}" stroke-width="2"/>` + [[18, 30], [62, 74], [70, 82]].map(([a, b]) => `<path d="M${a} 66V60Q${(a + b) / 2} 56 ${b} 60V66" fill="${d}" opacity=".4"/>`).join('');
      for (const x of [24, 32, 68, 76]) s += `<path d="M${x - 1} 55V50H${x + 1}V55z" fill="${f}"/><circle cx="${x}" cy="49" r="1" fill="${f}"/><path d="M${x + 1} 51L${x + 2.6} 48" stroke="${f}" stroke-width=".5"/>`;
      return s + ground(f, l);
    },
    belgrade: (f, d, l) => { // памятник «Победитель» на колонне над крепостью Калемегдан
      let s = `<path d="M18 66V52H38V48H44V52H56V48H62V52H82V66z" fill="${f}"/>${shadeR(d, 'M18 60H82V66H18z', .2)}` + Array.from({ length: 11 }, (_, i) => `<rect x="${18.6 + i * 6}" y="49.6" width="2" height="2.4" fill="${f}"/>`).join('') + [26, 70].map(x => arcWin(x, 56, 4, 10, d, l)).join('');
      s += `<path d="M46 52V20H54V52z" fill="${f}"/>${shadeR(d, 'M50 20H54V52H50z', .3)}` + [26, 32, 38, 44].map(y => `<path d="M46 ${y}H54" stroke="${d}" stroke-width=".3"/>`).join('') + `<path d="M44.6 20H55.4V17H44.6z" fill="${f}"/>`;
      s += `<path d="M49 17V8Q49 6 50 5.4Q51 6 51 8V17z" fill="${f}"/><circle cx="50" cy="4" r="1.4" fill="${f}"/><path d="M51 9L56 4M51 9L46.4 12" stroke="${f}" stroke-width=".9"/><path d="M56 4L57.6 2.4" stroke="${f}" stroke-width=".5"/><circle cx="46" cy="12.6" r="1" fill="${f}"/>`;
      return s + ground(f, l);
    },
    sofia: (f, d, l) => { // собор Александра Невского: золотой центральный купол, полукупола, колокольня
      let s = `<path d="M20 66V46H80V66z" fill="${f}"/>${shadeR(d, 'M50 46H80V66H50z', .2)}`;
      for (let x = 22; x < 79; x += 5.4) s += arcWin(x, 52, 3, 9, d, l);
      for (const x of [32, 68]) s += `<path d="M${x - 8} 46Q${x - 8} 36 ${x} 34Q${x + 8} 36 ${x + 8} 46z" fill="${f}"/>${shadeR(d, `M${x} 34Q${x + 8} 36 ${x + 8} 46H${x}z`, .3)}<path d="M${x} 34V31" stroke="${f}" stroke-width=".6"/>`;
      s += `<path d="M40 46V32H60V46z" fill="${f}"/>` + [42.6, 46.6, 50.6, 54.6].map(x => arcWin(x, 35, 2.4, 7, d, l)).join('') + `<path d="M40 32Q40 18 50 15Q60 18 60 32z" fill="${f}"/>${shadeR(d, 'M50 15Q60 18 60 32H50z', .3)}` + [-6, -3, 0, 3, 6].map(k => `<path d="M50 15.2Q${50 + k * .8} 22 ${50 + k * 1.5} 32" stroke="${d}" stroke-width=".3" fill="none"/>`).join('') + `<path d="M50 15V9M48 11H52" stroke="${f}" stroke-width=".8"/>`;
      s += `<path d="M72 46V22H78V46z" fill="${f}"/>` + onion(75, 22, 3.4, 7, f, d, l, false) + arcWin(73.8, 28, 2.4, 6, d, l);
      return s + ground(f, l);
    },
    beijing: (f, d, l) => { // Храм Неба: трёхъярусная круглая кровля, мраморные террасы с балюстрадой
      let s = '';
      for (const [w, y] of [[30, 60], [26, 56], [22, 52]]) s += `<path d="M${50 - w} ${y + 4}V${y}H${50 + w}V${y + 4}z" fill="${f}"/>` + Array.from({ length: Math.round(w / 2) }, (_, i) => `<path d="M${n2(50 - w + 1 + i * 4)} ${y}V${y - 1.6}" stroke="${f}" stroke-width=".5"/>`).join('') + `<path d="M${50 - w} ${y - 1.6}H${50 + w}" stroke="${f}" stroke-width=".4"/>`;
      s += `<path d="M34 52V46H66V52z" fill="${f}"/>` + gridWin(36, 47.4, 63, 50, 2.6, 4, 1.4, 3, d);
      for (const [w, y, h] of [[24, 46, 7], [19, 36, 6], [14, 27, 6]]) { s += `<path d="M${50 - w} ${y}Q50 ${y - h * 1.6} ${50 + w} ${y}z" fill="${f}"/>${shadeR(d, `M50 ${y - h * .8}Q${50 + w * .6} ${y - h * .5} ${50 + w} ${y}H50z`, .3)}` + Array.from({ length: 9 }, (_, i) => `<path d="M${n2(50 - w + i * w / 4)} ${y}Q${n2(50 - w * .5 + i * w / 8)} ${n2(y - h * .7)} 50 ${n2(y - h * .78)}" stroke="${d}" stroke-width=".25" fill="none"/>`).join('') + `<path d="M${50 - w} ${y}H${50 + w}" stroke="${l}" stroke-width=".5"/>`;
        if (y > 30) s += `<path d="M${50 - w * .72} ${y}V${y + 4.6}H${50 + w * .72}V${y}" fill="${f}"/>` + gridWin(50 - w * .66, y + 1, 50 + w * .6, y + 2, 2.4, 3, 1.2, 2.6, d); }
      return s + `<path d="M50 21.6V16" stroke="${f}" stroke-width=".8"/><circle cx="50" cy="15" r="1.6" fill="${f}"/>` + ground(f, l);
    },
    chengdu: (f, d, l) => { // мост Аньшунь с крытой галереей и пагодой на реке
      let s = `<path d="M18 52H82V55H18z" fill="${f}"/>` + [[20, 36], [36, 64], [64, 80]].map(([a, b]) => `<path d="M${a} 66V57Q${(a + b) / 2} 50 ${b} 57V66" fill="${d}" opacity=".45"/><path d="M${a} 57Q${(a + b) / 2} 50 ${b} 57" stroke="${l}" stroke-width=".45" fill="none"/>`).join('');
      s += `<path d="M22 52V44H78V52z" fill="${f}"/>` + Array.from({ length: 14 }, (_, i) => `<path d="M${23 + i * 4} 52V45" stroke="${d}" stroke-width=".6"/>`).join('') + pagodaRoof(50, 44, 28, f, d, l);
      s += `<path d="M42 40V30H58V40z" fill="${f}"/>` + gridWin(44, 32, 56, 36, 3.6, 4, 2, 4, d) + pagodaRoof(50, 30, 10, f, d, l) + `<path d="M50 24V20" stroke="${f}" stroke-width=".7"/>`;
      return s + ground(f, l);
    },
    hangzhou: (f, d, l) => { // пагода Лэйфэн над Западным озером, мост-арка
      let s = '';
      for (let k = 0; k < 5; k++) { const w = 13 - k * 2, y = 60 - k * 9; s += `<path d="M${50 - w} ${y + 6}V${y}H${50 + w}V${y + 6}z" fill="${f}"/>${shadeR(d, `M50 ${y}H${50 + w}V${y + 6}H50z`, .25)}` + [-w * .55, -1, w * .55 - 2].map(dx => arcWin(50 + dx, y + 1.4, 2, 4.2, d, l)).join('') + pagodaRoof(50, y, w, f, d, l); }
      s += `<path d="M48.6 15V8L50 4L51.4 8V15z" fill="${f}"/>`;
      s += `<path d="M18 66Q26 58 34 66" fill="none" stroke="${f}" stroke-width="1.6"/><path d="M66 66Q74 58 82 66" fill="none" stroke="${f}" stroke-width="1.6"/>`;
      return s + ground(f, l);
    },
    tokyo: (f, d, l) => { // Токийская телебашня: решётчатая ферма, две обзорные площадки, гора Фудзи
      let s = `<path d="M18 66L36 38Q38 36 40 37L44 40L50 36L56 40L60 37Q62 36 64 38L82 66z" fill="${f}" opacity=".45"/><path d="M36 38L33 44L37 42L40 45L44 40Z" fill="${l}" opacity=".8"/>`;
      s += `<path d="M38 66L48 18H52L62 66H57L50 30L43 66z" fill="${f}"/>`;
      for (let y = 24; y < 64; y += 4) { const w = 2 + (y - 18) * .26, w2 = 2 + (y + 4 - 18) * .26; s += `<path d="M${n2(50 - w)} ${y}L${n2(50 + w2)} ${y + 4}M${n2(50 + w)} ${y}L${n2(50 - w2)} ${y + 4}" stroke="${f}" stroke-width=".5"/>`; }
      s += `<path d="M42 44H58V47H42zM45.4 28H54.6V31H45.4z" fill="${f}"/><path d="M42 44H58M45.4 28H54.6" stroke="${l}" stroke-width=".4"/>` + gridWin(43, 45, 56.5, 45, 2, 1, 1.2, 1.2, d);
      s += `<path d="M48.6 18L49.4 6H50.6L51.4 18z" fill="${f}"/><path d="M50 6V2" stroke="${f}" stroke-width=".6"/>` + [10, 14].map(y => `<path d="M49 ${y}H51" stroke="${d}" stroke-width=".8"/>`).join('');
      return s + ground(f, l);
    },
    osaka: (f, d, l) => { // замок Осака: каменный цоколь, пять ярусов с загнутыми крышами, сятихоко
      let s = `<path d="M24 66L28 50H72L76 66z" fill="${f}"/>${shadeR(d, 'M50 50H72L76 66H50z', .22)}`;
      for (let y = 53; y < 66; y += 3) s += Array.from({ length: 9 }, (_, i) => `<path d="M${n2(26 + i * 6 + (y % 2) * 3)} ${y}h4" stroke="${d}" stroke-width=".3"/>`).join('');
      const tiers = [[18, 50, 7], [15, 43, 6], [12, 37, 5.6], [9.6, 31.4, 5], [7.4, 26.4, 4.6]];
      for (const [w, y, h] of tiers) { s += `<path d="M${50 - w} ${y}V${y - h + 1}H${50 + w}V${y}z" fill="${f}"/>` + gridWin(50 - w + 1.6, y - h + 2, 50 + w - 2, y - 2, 3, 3, 1.4, 1.6, d) +
        `<path d="M${50 - w - 4} ${y - h + 1.4}Q${50 - w} ${y - h + 2} ${50 - w + 2} ${y - h + 1.4}L50 ${y - h - 2}L${50 + w - 2} ${y - h + 1.4}Q${50 + w} ${y - h + 2} ${50 + w + 4} ${y - h + 1.4}L${50 + w} ${y - h - .2}L50 ${y - h - 3}L${50 - w} ${y - h - .2}z" fill="${f}"/>` +
        `<path d="M${50 - w - 4} ${y - h + 1.4}L50 ${y - h - 2}L${50 + w + 4} ${y - h + 1.4}" stroke="${l}" stroke-width=".4" fill="none"/>`; }
      s += `<path d="M44.6 22.4Q43.4 19 45 18.4M55.4 22.4Q56.6 19 55 18.4" stroke="${f}" stroke-width="1" fill="none"/>`;
      return s + ground(f, l);
    },
    seoul: (f, d, l) => { // ворота Намдэмун: каменное основание с аркой, двухъярусная кровля ханок; башня Намсан на горе
      let s = `<path d="M62 40Q70 30 80 38V66H62z" fill="${f}" opacity=".45"/><path d="M71 32V10H73V32z" fill="${f}" opacity=".7"/><path d="M69.6 18H74.4V22H69.6z" fill="${f}" opacity=".7"/>`;
      s += `<path d="M22 66V46H70V66z" fill="${f}"/>${shadeR(d, 'M46 46H70V66H46z', .22)}<path d="M38 66V56Q46 48 54 56V66z" fill="${d}"/>`;
      for (let y = 49; y < 66; y += 3.4) s += Array.from({ length: 8 }, (_, i) => `<path d="M${n2(23 + i * 6 + (Math.round(y) % 2) * 3)} ${n2(y)}h4.6" stroke="${d}" stroke-width=".3"/>`).join('');
      s += `<path d="M28 46V38H64V46z" fill="${f}"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${30 + i * 4} 46V39" stroke="${d}" stroke-width=".6"/>`).join('');
      s += pagodaRoof(46, 38, 20, f, d, l) + `<path d="M32 33V28H60V33z" fill="${f}"/>` + Array.from({ length: 7 }, (_, i) => `<path d="M${34 + i * 4} 33V28.6" stroke="${d}" stroke-width=".5"/>`).join('') + pagodaRoof(46, 28, 16, f, d, l);
      return s + ground(f, l);
    },
    singapore: (f, d, l) => { // Марина-Бэй-Сэндс: три башни и «корабль» на крыше, «Супердеревья»
      let s = '';
      for (const x of [34, 48, 62]) s += `<path d="M${x} 66V26H${x + 8}V66z" fill="${f}"/>${shadeR(d, `M${x + 4} 26H${x + 8}V66H${x + 4}z`, .3)}` + Array.from({ length: 13 }, (_, i) => `<path d="M${x} ${29 + i * 3}H${x + 8}" stroke="${d}" stroke-width=".25"/>`).join('') + `<path d="M${x + 4} 26V66" stroke="${l}" stroke-width=".3"/>`;
      s += `<path d="M30 22H74Q78 22 80 20V23Q76 26 72 26H30z" fill="${f}"/><path d="M30 22H74Q78 22 80 20" stroke="${l}" stroke-width=".5" fill="none"/>` + Array.from({ length: 10 }, (_, i) => `<circle cx="${33 + i * 4}" cy="23.8" r=".6" fill="${d}"/>`).join('');
      for (const [x, h] of [[22, 16], [26, 12]]) { s += `<path d="M${x - .6} 66L${x - 1.6} ${66 - h}H${x + 1.6}L${x + .6} 66z" fill="${f}"/>`; for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI; s += `<path d="M${x} ${66 - h}L${n2(x + Math.cos(a) * 5)} ${n2(66 - h + Math.sin(a) * 4)}" stroke="${f}" stroke-width=".5"/>`; } }
      return s + ground(f, l);
    },
    buenosaires: (f, d, l) => { // Обелиск на проспекте 9 июля, разметка, деревья-жакаранды
      let s = `<path d="M18 66L44 58H56L82 66z" fill="${d}" opacity=".35"/><path d="M30 66L48 58M70 66L52 58M50 66V59" stroke="${l}" stroke-width=".4" stroke-dasharray="1.5 1"/>`;
      s += `<path d="M45 58L47.6 14L50 8L52.4 14L55 58z" fill="${f}"/>${shadeR(d, 'M50 8L52.4 14L55 58H50z', .32)}<path d="M50 8V58" stroke="${l}" stroke-width=".3"/><rect x="48.8" y="18" width="2.4" height="3" fill="${d}"/>`;
      s += `<path d="M42 58H58V61H42z" fill="${f}"/>`;
      for (const [x, r] of [[24, 4.6], [32, 3.8], [68, 3.8], [76, 4.6]]) s += tree(x, 54, r, f, d) + Array.from({ length: 5 }, (_, i) => `<circle cx="${n2(x - r * .6 + i * r * .3)}" cy="${n2(52 + (i % 2) * 2)}" r=".6" fill="${l}"/>`).join('');
      return s + ground(f, l);
    },
    madrid: (f, d, l) => { // здание «Метрополис»: колонны, купол с крылатой Победой
      let s = `<path d="M34 66V36H66V66z" fill="${f}"/>${shadeR(d, 'M50 36H66V66H50z', .22)}` + [37, 42, 47, 52, 57, 62].map(x => `<rect x="${x}" y="42" width="1.6" height="22" fill="${d}" opacity=".45"/><rect x="${x}" y="42" width=".5" height="22" fill="${l}" opacity=".6"/>`).join('');
      s += `<path d="M33 42H67V39H33z" fill="${f}"/><path d="M33 39H67" stroke="${l}" stroke-width=".5"/>` + gridWin(36, 37, 63, 37, 3, 2, 1.4, 1.2, d);
      s += `<path d="M38 36V32H62V36z" fill="${f}"/><path d="M40 32Q40 20 50 18Q60 20 60 32z" fill="${f}"/>${shadeR(d, 'M50 18Q60 20 60 32H50z', .3)}` + [-6, -3, 0, 3, 6].map(k => `<path d="M50 18.4Q${50 + k * .7} 24 ${50 + k * 1.5} 32" stroke="${d}" stroke-width=".3" fill="none"/>`).join('');
      s += `<path d="M50 18V14" stroke="${f}" stroke-width="1"/><path d="M49 14V8Q50 6.6 51 8V14z" fill="${f}"/><path d="M49 9Q44 6 41 2Q46 4 49 7zM51 9Q56 6 59 2Q54 4 51 7z" fill="${f}"/><circle cx="50" cy="6" r=".9" fill="${f}"/>`;
      for (const x of [22, 78]) s += `<path d="M${x - 5} 66V44H${x + 5}V66z" fill="${f}" opacity=".7"/>` + gridWin(x - 3.8, 46, x + 3, 62, 2.6, 3.6, 1.2, 2, d);
      return s + ground(f, l);
    },
    mumbai: (f, d, l) => { // Ворота Индии: центральная арка, четыре башенки, резные решётки джали
      let s = `<path d="M26 66V30H74V66H60V46Q50 36 40 46V66z" fill="${f}"/>${shadeR(d, 'M50 30H74V66H60V46Q55 40 50 39z', .24)}`;
      s += `<path d="M40 46Q50 36 60 46" fill="none" stroke="${l}" stroke-width=".5"/>` + [1, 2].map(k => `<path d="M${40 + k} ${46 - k * .2}Q50 ${36 + k * 1.8} ${60 - k} ${46 - k * .2}" stroke="${d}" stroke-width=".3" fill="none"/>`).join('');
      for (const x of [28, 64]) s += arcWin(x + 1, 34, 6, 9, d, l) + arcWin(x + 2, 50, 4, 10, d, l) + Array.from({ length: 4 }, (_, i) => `<path d="M${x + 1 + i * 2} 36V43" stroke="${l}" stroke-width=".25"/>`).join('');
      s += `<path d="M24 30H76V27H24z" fill="${f}"/>` + Array.from({ length: 17 }, (_, i) => `<path d="M${25 + i * 3} 27V25.6" stroke="${f}" stroke-width=".9"/>`).join('');
      for (const x of [27, 40, 60, 73]) s += `<path d="M${x - 2.4} 26V20H${x + 2.4}V26z" fill="${f}"/>` + onion(x, 20, 2.8, 5, f, d, l, false);
      s += `<path d="M44 30Q44 24 50 22Q56 24 56 30z" fill="${f}"/>`;
      return s + ground(f, l);
    },
    istanbul: (f, d, l) => { // Голубая мечеть: каскад куполов, шесть минаретов с балконами
      let s = '';
      for (const x of [20, 28, 72, 80]) s += `<path d="M${x - 1.4} 66V22H${x + 1.4}V66z" fill="${f}"/><path d="M${x - 1.6} 22L${x} 12L${x + 1.6} 22z" fill="${f}"/>` + [32, 44].map(y => `<path d="M${x - 2.4} ${y}H${x + 2.4}" stroke="${f}" stroke-width="1.2"/>`).join('') + `<path d="M${x} 12V9" stroke="${f}" stroke-width=".5"/>`;
      s += `<path d="M30 66V50H70V66z" fill="${f}"/>` + Array.from({ length: 8 }, (_, i) => arcWin(31.4 + i * 4.8, 54, 2.6, 8, d, l)).join('');
      for (const [x, w, y] of [[36, 6, 50], [64, 6, 50], [42, 7, 44], [58, 7, 44]]) s += `<path d="M${x - w} ${y}Q${x - w} ${y - w * .9} ${x} ${y - w}Q${x + w} ${y - w * .9} ${x + w} ${y}z" fill="${f}"/>${shadeR(d, `M${x} ${y - w}Q${x + w} ${y - w * .9} ${x + w} ${y}H${x}z`, .3)}<path d="M${x} ${y - w}V${y - w - 2}" stroke="${f}" stroke-width=".5"/>`;
      s += `<path d="M38 44V40H62V44z" fill="${f}"/><path d="M38 40Q38 26 50 24Q62 26 62 40z" fill="${f}"/>${shadeR(d, 'M50 24Q62 26 62 40H50z', .3)}` + Array.from({ length: 9 }, (_, i) => `<path d="M${n2(39.6 + i * 2.6)} 40V38.4" stroke="${d}" stroke-width=".5"/>`).join('') + `<path d="M50 24V19" stroke="${f}" stroke-width=".7"/><path d="M51 17.6A1.6 1.6 0 1 1 49.4 19.4A1.2 1.2 0 1 0 51 17.6z" fill="${f}"/>`;
      return s + ground(f, l);
    },
    toronto: (f, d, l) => { // Си-Эн Тауэр: бетонный ствол, «кольцо» Скайпод, антенна; небоскрёбы
      let s = '';
      for (const [x, w, h] of [[22, 8, 22], [30, 6, 30], [62, 7, 26], [70, 9, 18]]) s += `<path d="M${x} 66V${66 - h}H${x + w}V66z" fill="${f}" opacity=".7"/>` + gridWin(x + 1, 68 - h, x + w - 2, 63, 2.4, 3, 1.2, 1.8, d);
      s += `<path d="M45 66L48.4 30H51.6L55 66z" fill="${f}"/>${shadeR(d, 'M50 30H51.6L55 66H50z', .3)}<path d="M47 66L49.4 34M53 66L50.6 34" stroke="${l}" stroke-width=".3"/>`;
      s += `<path d="M43 30Q43 25 50 24.6Q57 25 57 30Q57 33 50 33.4Q43 33 43 30z" fill="${f}"/><path d="M43 29.4H57" stroke="${d}" stroke-width="1.2"/>` + Array.from({ length: 6 }, (_, i) => `<rect x="${44 + i * 2.2}" y="28.8" width="1.2" height="1.2" fill="${l}"/>`).join('');
      s += `<path d="M48.6 24.6L49.2 18H50.8L51.4 24.6z" fill="${f}"/><path d="M50 18V4" stroke="${f}" stroke-width=".9"/>` + [8, 12].map(y => `<path d="M49.3 ${y}H50.7" stroke="${d}" stroke-width=".8"/>`).join('');
      return s + ground(f, l);
    }
  };
  // v128.2: животные и геральдические знаки городов — у каждого города свой, нигде больше не повторяется.
  // Рисунки в поле 100×100: силуэт f, детали d, блики l. «Герб» — тот же знак в щите с короной и лентой.
  const feather = (x, y, len, ang, f, d) => `<path d="M${x} ${y}q${n2(Math.cos(ang) * len * .5)} ${n2(Math.sin(ang) * len * .5 - 1.4)} ${n2(Math.cos(ang) * len)} ${n2(Math.sin(ang) * len)}q${n2(-Math.cos(ang) * len * .4)} ${n2(-Math.sin(ang) * len * .4 + 1.4)} ${n2(-Math.cos(ang) * len)} ${n2(-Math.sin(ang) * len)}z" fill="${f}" stroke="${d}" stroke-width=".3"/>`;
  const wing = (cx, cy, sx, n, len, f, d, l, spread) => { let s = ''; for (let i = 0; i < n; i++) { const a = (sx > 0 ? 0 : Math.PI) + sx * (-(spread || 1.25) + i * (spread || 1.25) * 1.5 / n) * -1; s += feather(cx, cy, len - i * 1.1, (sx > 0 ? -1 : 1) * (-1.35 + i * .2) + (sx > 0 ? 0 : Math.PI), f, d); } return s; };
  const eye = (x, y, r, d, l) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${d}"/><circle cx="${n2(x - r * .3)}" cy="${n2(y - r * .3)}" r="${n2(r * .35)}" fill="${l}"/>`;
  const fur = (x, y, n, len, ang, d) => Array.from({ length: n }, (_, i) => `<path d="M${n2(x + i * 1.6)} ${n2(y + (i % 2) * .8)}l${n2(Math.cos(ang) * len)} ${n2(Math.sin(ang) * len)}" stroke="${d}" stroke-width=".35"/>`).join('');
  const AN = {
    cologne: (f, d, l) => { // геральдический орёл: раскрытые крылья из перьев, голова в профиль, хвост веером
      let s = wing(44, 30, -1, 7, 18, f, d, l) + wing(56, 30, 1, 7, 18, f, d, l);
      s += `<path d="M44 26Q50 20 56 26L57 44Q50 50 43 44z" fill="${f}" stroke="${d}" stroke-width=".4"/>` + [30, 34, 38, 42].map(y => `<path d="M45 ${y}Q50 ${y + 2} 55 ${y}" stroke="${d}" stroke-width=".35" fill="none"/>`).join('');
      s += `<path d="M48 24Q48 16 53 15Q57 15 58 18L61 19L57.6 21Q56 24 53 25z" fill="${f}" stroke="${d}" stroke-width=".4"/>` + eye(54.6, 18.4, .9, d, l) + `<path d="M58 18L61 19L57.6 21" fill="${d}" opacity=".4"/>`;
      for (let k = -3; k <= 3; k++) s += feather(50, 47, 12 - Math.abs(k), Math.PI / 2 + k * .16, f, d);
      s += `<path d="M45 46L41 54M41 54l-2 1.4M41 54l-.4 2.4M41 54l1.6 1.8M55 46L59 54M59 54l2 1.4M59 54l.4 2.4M59 54l-1.6 1.8" stroke="${f}" stroke-width="1.2" stroke-linecap="round"/>`;
      return s;
    },
    berlin: (f, d, l) => { // берлинский медведь: стоит на задних лапах, когти, язык
      let s = `<path d="M40 64L42 50Q36 44 38 36L32 30Q30 26 34 26L42 30Q44 22 50 20Q52 14 56 14Q59 13 60 16L64 17Q66 19 63 21L60 22Q62 28 60 34L66 30Q70 30 68 34L62 40Q62 48 58 52L60 64H55L53 54H47L45 64z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M56 14.4Q55 11 57.4 11.6" stroke="${f}" stroke-width="1.6" fill="none"/>` + eye(58.6, 16.4, .8, d, l) + `<path d="M63.6 18.6Q66 20 64.8 21" stroke="${d}" stroke-width=".6" fill="none"/>`;
      s += `<path d="M32 26l-1.6-1.6M33 25.4l-1-2.2M34.4 25.6l-.2-2.4M68 31l1.8-1M68.6 32l2-.2M68.2 33.2l1.8.8" stroke="${f}" stroke-width=".7" stroke-linecap="round"/>`;
      s += fur(44, 34, 7, 2.6, 1.2, d) + fur(46, 42, 6, 2.4, 1.3, d) + `<path d="M50 26Q46 32 48 40Q50 46 54 48" stroke="${l}" stroke-width=".4" fill="none"/>`;
      return s;
    },
    budapest: (f, d, l) => { // птица Турул: крылья подняты, меч в когтях
      let s = wing(46, 34, -1, 8, 20, f, d, l, 1.6) + wing(54, 34, 1, 8, 20, f, d, l, 1.6);
      s += `<path d="M45 30Q50 26 55 30L54 48Q50 52 46 48z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M47 22Q50 18 54 20L58 22L54 24Q52 28 48 28z" fill="${f}" stroke="${d}" stroke-width=".4"/>` + eye(51.4, 22, .8, d, l);
      for (let k = -2; k <= 2; k++) s += feather(50, 49, 9, Math.PI / 2 + k * .2, f, d);
      s += `<path d="M28 58L72 58" stroke="${f}" stroke-width="1.4"/><path d="M70 56L74 58L70 60z" fill="${f}"/><path d="M30 55V61" stroke="${f}" stroke-width="1.6"/><path d="M46 49L44 57M54 49L56 57" stroke="${f}" stroke-width="1"/>`;
      return s;
    },
    paris: (f, d, l) => { // галльский петух: гребень, бородка, пышный хвост
      let s = `<path d="M34 50Q32 36 42 32Q46 22 52 20Q56 20 57 24L62 26L57 28Q58 34 54 40Q62 42 66 50Q62 60 50 60Q38 60 34 50z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M52 20Q50 14 53 15Q54 12 56 15Q58 13 58.6 17Q60 17 58 20z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M57 28Q58 32 56 33Q55 30 55.6 28" fill="${f}" stroke="${d}" stroke-width=".3"/>` + eye(54.6, 23.4, .8, d, l);
      for (let k = 0; k < 6; k++) s += `<path d="M38 46Q${n2(22 - k * 1.5)} ${n2(40 - k * 5)} ${n2(26 + k * 2)} ${n2(18 - k * 1.5)}Q${n2(30 - k)} ${n2(34 - k * 3)} ${n2(40 - k * .4)} ${n2(42 - k * .6)}" fill="${f}" stroke="${d}" stroke-width=".35"/>`;
      s += `<path d="M42 44Q50 48 58 46M44 50Q50 54 58 52" stroke="${d}" stroke-width=".4" fill="none"/><path d="M46 60L44 66M54 60L56 66M42 66H47M52 66H58" stroke="${f}" stroke-width="1.1"/>`;
      return s;
    },
    london: (f, d, l) => { // лев «пассант гардант»: идёт, голова к зрителю, грива, хвост с кистью
      let s = `<path d="M28 44Q30 38 38 38H56Q62 34 64 38Q66 44 64 50L66 62H62L60 52H40L38 62H34L34 52Q28 50 28 44z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<circle cx="64" cy="34" r="9" fill="${f}" stroke="${d}" stroke-width=".45"/>` + Array.from({ length: 12 }, (_, k) => { const a = k / 12 * Math.PI * 2; return `<path d="M${n2(64 + Math.cos(a) * 6)} ${n2(34 + Math.sin(a) * 6)}Q${n2(64 + Math.cos(a + .2) * 9)} ${n2(34 + Math.sin(a + .2) * 9)} ${n2(64 + Math.cos(a + .3) * 10.4)} ${n2(34 + Math.sin(a + .3) * 10.4)}" stroke="${d}" stroke-width=".4" fill="none"/>`; }).join('');
      s += `<circle cx="64" cy="34.6" r="5" fill="${f}" stroke="${d}" stroke-width=".4"/>` + eye(62.2, 33.6, .6, d, l) + eye(65.8, 33.6, .6, d, l) + `<path d="M63 36.6Q64 37.6 65 36.6M64 35.6V36.6" stroke="${d}" stroke-width=".4" fill="none"/>`;
      s += `<path d="M28 44Q20 40 22 30Q23 26 26 27" stroke="${f}" stroke-width="1.4" fill="none"/><path d="M26 27l-2.6-2.4M26 27l-.8-3.4M26 27l1.2-3" stroke="${f}" stroke-width="1"/>`;
      s += `<path d="M38 52L36 46M48 52V46" stroke="${d}" stroke-width=".4"/><path d="M33 62H39M61 62H67" stroke="${f}" stroke-width="1.2"/>`;
      return s;
    },
    rio: (f, d, l) => { // тукан на ветке: огромный клюв, перо, тропические листья
      let s = `<path d="M22 54Q50 50 80 56" stroke="${f}" stroke-width="2" fill="none"/>` + [[30, 52, -.6], [66, 54, .5], [74, 55, -.4]].map(([x, y, a]) => `<path d="M${x} ${y}q${n2(Math.cos(a) * 6)} -6 ${n2(Math.cos(a) * 10)} -4q-4 3 -${n2(Math.abs(Math.cos(a)) * 10)} 4z" fill="${f}" stroke="${d}" stroke-width=".3"/>`).join('');
      s += `<path d="M42 52Q38 40 44 30Q48 24 54 26Q58 30 56 40Q56 48 50 54z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M42 52L36 64L44 56z" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M53 27Q66 24 76 30Q68 34 55 33z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M56 29Q66 27 74 30.4" stroke="${l}" stroke-width=".5" fill="none"/><path d="M55 31Q65 32 74 31" stroke="${d}" stroke-width=".4" fill="none"/>`;
      s += eye(51, 29, 1, d, l) + `<path d="M46 34Q50 38 54 34Q52 42 46 40z" fill="${l}" opacity=".6"/>` + [40, 44, 48].map(y => `<path d="M44 ${y}Q49 ${y + 2} 54 ${y}" stroke="${d}" stroke-width=".35" fill="none"/>`).join('');
      return s;
    },
    texas: (f, d, l) => { // лонгхорн в профиль: бык целиком, рога размахом, мускулы
      let s = `<path d="M26 44Q28 36 38 36H58Q62 32 66 34L70 40Q71 44 68 46L66 48Q64 52 60 52L58 64H55L54 54H40L38 64H35L34 54Q28 52 26 44z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M64 34Q56 28 46 30Q54 32 62 36zM68 34Q76 26 86 28Q78 30 70 36z" fill="${f}" stroke="${d}" stroke-width=".4"/>` + eye(66, 39, .8, d, l) + `<path d="M69 43.6Q70.4 44.4 69.6 45.2" stroke="${d}" stroke-width=".4" fill="none"/>`;
      s += `<path d="M26 44Q20 46 20 54" stroke="${f}" stroke-width="1" fill="none"/><path d="M19 54l-1 2.4M20 54l.2 2.6M21 54l1.2 2.2" stroke="${f}" stroke-width=".7"/>`;
      s += `<path d="M40 40Q46 46 42 52M54 40Q50 46 54 52M60 40Q58 44 60 48" stroke="${d}" stroke-width=".4" fill="none"/><path d="M34 64H39M54 64H59" stroke="${f}" stroke-width="1.2"/><path d="M30 42Q44 38 58 40" stroke="${l}" stroke-width=".4" fill="none"/>`;
      return s;
    },
    shanghai: (f, d, l) => { // китайский дракон: тело-волна с чешуёй, гребень, усы, лапы с когтями, жемчужина
      let s = `<path d="M22 50Q28 34 38 40Q46 46 52 36Q58 26 68 30Q76 34 72 42Q68 48 60 46" fill="none" stroke="${f}" stroke-width="7" stroke-linecap="round"/>`;
      s += `<path d="M22 50Q28 34 38 40Q46 46 52 36Q58 26 68 30Q76 34 72 42Q68 48 60 46" fill="none" stroke="${d}" stroke-width=".6" stroke-dasharray="1.6 1.2"/>`;
      for (let k = 0; k < 14; k++) { const t = k / 13, x = 22 + t * 50, y = 50 - Math.sin(t * Math.PI * 2.2) * 9 - 6; s += `<path d="M${n2(x)} ${n2(y - 3)}l1.4 -3 1.4 3z" fill="${f}"/>`; }
      s += `<path d="M58 46Q52 44 52 50Q54 54 60 52L66 50Q70 48 68 45z" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M60 46Q62 40 66 40Q70 41 70 46Q68 50 64 50z" fill="${f}"/><path d="M52 50Q46 54 40 52M52 51Q48 58 42 60" stroke="${f}" stroke-width=".6" fill="none"/>` + eye(55, 47, .9, d, l);
      s += `<path d="M58 44Q60 38 64 36M56 44Q56 38 58 34" stroke="${f}" stroke-width=".9" fill="none"/>`;
      for (const [x, y] of [[32, 47], [46, 44], [64, 38]]) s += `<path d="M${x} ${y}l-2 5M${x} ${y}l-3.4 4M${x} ${y}l-.4 5.2" stroke="${f}" stroke-width=".8" stroke-linecap="round"/>`;
      s += `<circle cx="40" cy="60" r="3" fill="${l}" opacity=".8"/><circle cx="40" cy="60" r="3" fill="none" stroke="${f}" stroke-width=".6"/>`;
      return s;
    },
    riyadh: (f, d, l) => { // сокол на перчатке сокольничего: колпачок, перья спины, путы
      let s = `<path d="M40 56Q38 40 46 30Q50 26 54 28Q58 32 58 40Q60 50 56 58z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M47 30Q48 22 53 21Q57 21 58 25L60 27L57 28Q56 31 52 31z" fill="${f}" stroke="${d}" stroke-width=".4"/>` + eye(54.6, 24.6, .8, d, l) + `<path d="M53 21Q55 18 54 16" stroke="${f}" stroke-width=".6" fill="none"/>`;
      for (let k = 0; k < 5; k++) s += `<path d="M${46 + k * .4} ${36 + k * 4}Q${50 + k * .4} ${38 + k * 4} ${55 - k * .2} ${35 + k * 4}" stroke="${d}" stroke-width=".4" fill="none"/>`;
      s += `<path d="M44 56L42 66L50 62L56 66L56 56" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M30 62Q36 56 46 58H62Q68 60 66 64H34z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M36 60H62" stroke="${l}" stroke-width=".4"/><path d="M48 58V54M52 58V54" stroke="${f}" stroke-width=".9"/>`;
      return s;
    },
    stockholm: (f, d, l) => { // лось: ветвистые лопатообразные рога, горбатый загривок, борода
      let s = `<path d="M22 48Q24 40 34 40H52Q58 36 62 38Q66 42 66 48L64 52Q60 54 58 52L56 64H53L52 54H36L35 64H32L31 54Q24 54 22 48z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M58 38Q62 34 70 38Q74 40 72 44L66 46Q62 44 58 42z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M66 46Q66 52 64 52" stroke="${f}" stroke-width="1.2"/>` + eye(66, 40, .7, d, l);
      for (const [x, sx] of [[62, -1], [66, 1]]) s += `<path d="M${x} 36Q${x + sx * 4} 30 ${x + sx * 10} 30Q${x + sx * 12} 24 ${x + sx * 8} 22Q${x + sx * 10} 26 ${x + sx * 6} 28Q${x + sx * 6} 24 ${x + sx * 3} 22Q${x + sx * 4} 28 ${x} 32z" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M30 40Q40 36 52 40" stroke="${l}" stroke-width=".45" fill="none"/>` + fur(38, 42, 6, 2.4, 1.4, d) + `<path d="M31 64H36M52 64H57" stroke="${f}" stroke-width="1.2"/>`;
      return s;
    },
    copenhagen: (f, d, l) => { // лебедь на воде: изогнутая шея, сложенные крылья из перьев
      let s = `<path d="M26 56Q26 46 38 44Q50 42 60 48Q66 52 72 50Q70 58 60 60H32Q26 60 26 56z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      for (let k = 0; k < 6; k++) s += feather(40 + k * 3, 50 - k * .4, 12 - k, -.25 - k * .06, f, d);
      s += `<path d="M34 48Q30 36 34 26Q38 18 44 20Q48 22 46 26Q42 22 39 27Q36 34 40 46" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M46 25L51 27L46 27.6z" fill="${d}"/>` + eye(43.6, 23.6, .7, d, l);
      s += `<path d="M24 62Q36 59 50 62T78 62" stroke="${l}" stroke-width=".5" fill="none"/>`;
      return s;
    },
    krakow: (f, d, l) => { // Вавельский дракон: перепончатые крылья, огонь из пасти, хвост с остриём
      let s = `<path d="M30 56Q30 46 40 44Q50 42 56 46L62 38Q66 34 70 36L74 38L70 40Q70 46 64 50Q60 58 50 58H38Q30 60 30 56z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M44 44L36 24L42 30L46 20L48 30L54 22L52 40z" fill="${f}" stroke="${d}" stroke-width=".4"/>` + [[36, 24, 44, 42], [46, 20, 47, 40], [54, 22, 50, 41]].map(([a, b, c, e]) => `<path d="M${a} ${b}L${c} ${e}" stroke="${d}" stroke-width=".4"/>`).join('');
      s += eye(68.6, 37.6, .7, d, l) + `<path d="M74 38Q80 34 84 36Q80 38 84 40Q78 40 74 39z" fill="${l}" opacity=".9"/>`;
      s += `<path d="M30 56Q20 56 20 48Q20 44 24 44" stroke="${f}" stroke-width="1.6" fill="none"/><path d="M24 44L22 40L27 42z" fill="${f}"/>`;
      s += `<path d="M38 58L36 66M46 58L46 66M54 56L56 66" stroke="${f}" stroke-width="1.4"/>` + Array.from({ length: 6 }, (_, i) => `<path d="M${40 + i * 3} 46l1.2-2.4 1.2 2.4" fill="${f}"/>`).join('');
      return s;
    },
    astana: (f, d, l) => { // снежный барс: длинное тело, пятна-розетки, пушистый хвост кольцом
      let s = `<path d="M24 50Q26 42 36 42H56Q60 36 66 36Q72 38 72 44Q72 48 68 50L66 64H62L61 54H40L38 64H34L33 54Q26 54 24 50z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M24 50Q14 48 16 38Q18 30 26 32Q20 36 22 42Q24 46 28 46" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M64 36L65 32L67 35M69 36L71 33L71 37" fill="${f}" stroke="${d}" stroke-width=".35"/>` + eye(67, 40.4, .7, d, l) + `<path d="M70.4 44.6Q71.4 45 72 44.2" stroke="${d}" stroke-width=".4" fill="none"/>`;
      for (const [x, y] of [[34, 46], [40, 44], [46, 48], [52, 45], [58, 48], [38, 50], [50, 51], [20, 38], [17, 42]]) s += `<circle cx="${x}" cy="${y}" r="1.3" fill="none" stroke="${d}" stroke-width=".55"/><circle cx="${x}" cy="${y}" r=".4" fill="${d}"/>`;
      return s + `<path d="M33 64H38M61 64H66" stroke="${f}" stroke-width="1.2"/>`;
    },
    almaty: (f, d, l) => { // яблоко апорт: лист, черенок, блик, долька
      let s = `<path d="M50 24Q40 18 32 26Q24 36 30 50Q36 62 46 60Q50 58 54 60Q64 62 70 50Q76 36 68 26Q60 18 50 24z" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      s += shadeR(d, 'M50 24Q60 18 68 26Q76 36 70 50Q64 62 54 60Q50 58 50 58z', .25) + `<path d="M36 30Q32 38 34 46" stroke="${l}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>`;
      s += `<path d="M50 24Q50 18 52 14" stroke="${f}" stroke-width="1.4" fill="none"/><path d="M52 18Q60 12 66 16Q60 22 52 20z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M53 19Q59 16 64 16.4" stroke="${d}" stroke-width=".35" fill="none"/>`;
      s += `<path d="M58 36Q64 40 62 48" stroke="${d}" stroke-width=".4" fill="none" stroke-dasharray="1 1"/>` + [[44, 40], [56, 46], [42, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".5" fill="${l}"/>`).join('');
      return s;
    },
    antwerp: (f, d, l) => { // рука Брабо над огранённым бриллиантом
      let s = `<path d="M34 50L40 42H60L66 50L50 66z" fill="${f}" stroke="${d}" stroke-width=".5"/><path d="M34 50H66M40 42L44 50L50 42L56 50L60 42M44 50L50 66L56 50" stroke="${d}" stroke-width=".4" fill="none"/>${shadeR(d, 'M50 42L60 42L66 50L50 66z', .2)}<path d="M42 44L46 48" stroke="${l}" stroke-width=".6"/>`;
      s += `<path d="M42 36V22Q42 20 44 20Q46 20 46 22V30V16Q46 14 48 14Q50 14 50 16V30V14Q50 12 52 12Q54 12 54 14V30V18Q54 16 56 16Q58 16 58 18V34Q58 40 54 40H46Q42 40 40 36L36 30Q35 28 37 27Q39 27 40 29z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M46 26V30M50 25V30M54 26V30M44 36Q50 38 56 36" stroke="${d}" stroke-width=".35" fill="none"/><path d="M48 16V24" stroke="${l}" stroke-width=".35"/>`;
      return s;
    },
    bucharest: (f, d, l) => { // дакийский драко: волчья голова с оскалом и змеиное тело-вымпел
      let s = `<path d="M50 36Q60 30 70 36Q78 42 76 50Q72 56 64 52Q58 48 50 54Q42 60 34 54Q28 50 30 44" fill="none" stroke="${f}" stroke-width="5" stroke-linecap="round"/><path d="M50 36Q60 30 70 36Q78 42 76 50Q72 56 64 52Q58 48 50 54Q42 60 34 54Q28 50 30 44" fill="none" stroke="${d}" stroke-width=".5" stroke-dasharray="2 1.4"/>`;
      s += `<path d="M30 44Q24 40 24 34L20 30L26 30L28 26Q32 22 38 24Q44 26 46 32Q48 38 42 40Q38 44 30 44z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M28 26L27 20L31 24" fill="${f}" stroke="${d}" stroke-width=".35"/>`;
      s += eye(31, 29.6, .8, d, l) + `<path d="M20 30L24 34L22 31M24 34l1-1.4M25.6 35l.8-1.6" stroke="${l}" stroke-width=".45" fill="none"/><path d="M36 28Q40 30 42 36" stroke="${d}" stroke-width=".35" fill="none"/>`;
      s += `<path d="M76 50L82 48M76 51L82 54" stroke="${f}" stroke-width=".9"/><path d="M50 54L50 66" stroke="${f}" stroke-width="1.2"/>`;
      return s;
    },
    lisbon: (f, d, l) => { // три ласточки в полёте с раздвоенными хвостами
      let s = '';
      for (const [x, y, k] of [[32, 30, 1], [56, 22, .8], [60, 46, .9]]) s += `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 0Q8 -6 18 -4Q10 -2 6 2Q14 2 20 8Q10 8 4 4L-6 12L-4 4L-12 6L-4 0Q-8 -4 -4 -6Q-2 -2 0 0z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M-4 0Q-1 -2 1 0" stroke="${l}" stroke-width=".4" fill="none"/>${eye(-3, -2.4, .5, d, l)}<path d="M2 -1Q8 -4 14 -4M2 2Q8 4 16 7" stroke="${d}" stroke-width=".35" fill="none"/></g>`;
      return s;
    },
    sydney: (f, d, l) => { // кенгуру: стоит на хвосте, сумка с детёнышем
      let s = `<path d="M44 64L46 56Q38 54 38 44Q38 34 46 30L48 24Q48 20 52 20L56 16L57 21Q60 22 60 26L64 28L60 30Q56 32 56 36Q60 44 58 52L66 60Q74 64 82 62Q74 66 62 64L56 60L54 64z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += eye(56, 24.6, .7, d, l) + `<path d="M53 20L52 15L55 18" fill="${f}" stroke="${d}" stroke-width=".35"/><path d="M52 36L48 42M53 37L50 43" stroke="${f}" stroke-width="1"/>`;
      s += `<path d="M42 46Q46 52 52 50" stroke="${d}" stroke-width=".5" fill="none"/><circle cx="46" cy="47" r="2.4" fill="${f}" stroke="${d}" stroke-width=".35"/><path d="M45 45L44 42.6L46.4 44.4" fill="${f}"/>` + eye(46.6, 46.6, .4, d, l);
      return s + `<path d="M40 40Q42 34 46 32" stroke="${l}" stroke-width=".4" fill="none"/>`;
    },
    moscow: (f, d, l) => { // жар-птица: хохолок, огненный хвост из длинных перьев с «глазками»
      let s = '';
      for (let k = 0; k < 7; k++) { const a = -.2 + k * .22, x2 = 30 - Math.cos(a) * 4, y2 = 52 + Math.sin(a) * 4; s += `<path d="M44 46Q${n2(30 + k * 2)} ${n2(56 + k * 2)} ${n2(18 + k * 1.4)} ${n2(40 + k * 4)}Q${n2(26 + k)} ${n2(50 + k * 2)} 44 48z" fill="${f}" stroke="${d}" stroke-width=".35"/><circle cx="${n2(21 + k * 1.4)}" cy="${n2(42.6 + k * 4)}" r="1.4" fill="${l}" stroke="${d}" stroke-width=".3"/>`; }
      s += `<path d="M42 48Q42 36 52 34Q60 32 62 26Q64 22 66 24L70 25L66 27Q66 36 60 42Q54 50 46 50z" fill="${f}" stroke="${d}" stroke-width=".45"/>` + eye(65, 25.4, .7, d, l);
      s += [[64, 22, -1.2], [65.4, 22, -1.5], [66.6, 22.4, -1.9]].map(([x, y, a]) => `<path d="M${x} ${y}l${n2(Math.cos(a) * 5)} ${n2(Math.sin(a) * 5)}" stroke="${f}" stroke-width=".7"/><circle cx="${n2(x + Math.cos(a) * 5.6)}" cy="${n2(y + Math.sin(a) * 5.6)}" r=".9" fill="${f}"/>`).join('');
      s += wing(52, 40, 1, 6, 14, f, d, l, 1.1) + `<path d="M50 50L48 58M54 48L56 58" stroke="${f}" stroke-width=".9"/>`;
      return s;
    },
    petersburg: (f, d, l) => { // грифон Банковского моста: крылья вверх, львиное тело, орлиная голова
      let s = `<path d="M30 60Q28 50 36 46H54Q58 40 58 34Q58 26 64 24Q68 24 70 28L74 30L70 32Q68 38 64 42Q66 50 62 54L64 64H60L58 56H42L40 64H36L35 56Q30 56 30 60z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += eye(66, 28, .8, d, l) + `<path d="M70 28L74 30L70 32" fill="${d}" opacity=".45"/>`;
      s += wing(54, 40, -1, 8, 22, f, d, l, 1.5);
      s += `<path d="M30 58Q22 58 22 50Q24 46 28 48" stroke="${f}" stroke-width="1.2" fill="none"/><path d="M36 64H41M59 64H64" stroke="${f}" stroke-width="1.2"/>` + fur(40, 48, 7, 2.4, 1.3, d);
      return s;
    },
    kyiv: (f, d, l) => { // подсолнух: два ряда лепестков, семечки спиралью, листья
      let s = `<path d="M50 50V66" stroke="${f}" stroke-width="1.8"/><path d="M50 58Q40 52 34 56Q40 62 50 60zM50 62Q60 56 66 60Q60 66 50 64z" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, r = k % 2 ? 15 : 17; s += `<ellipse cx="${n2(50 + Math.cos(a) * r * .72)}" cy="${n2(32 + Math.sin(a) * r * .72)}" rx="2.4" ry="${n2(r * .32)}" transform="rotate(${n2(a * 180 / Math.PI + 90)} ${n2(50 + Math.cos(a) * r * .72)} ${n2(32 + Math.sin(a) * r * .72)})" fill="${f}" stroke="${d}" stroke-width=".35"/>`; }
      s += `<circle cx="50" cy="32" r="8.4" fill="${d}"/>`;
      for (let i = 1; i < 60; i++) { const a = i * 2.39996, r = Math.sqrt(i) * 1.04; s += `<circle cx="${n2(50 + Math.cos(a) * r)}" cy="${n2(32 + Math.sin(a) * r)}" r=".45" fill="${l}"/>`; }
      return s;
    },
    tashkent: (f, d, l) => { // верблюд каравана: два горба, попона с кистями, вьюк
      let s = `<path d="M26 46Q28 40 34 40Q38 30 44 38Q48 30 54 38L60 40Q62 32 66 26Q68 22 72 24L74 26L71 28Q70 34 68 42Q66 48 62 50L62 64H59L58 54H40L38 64H35L34 52Q28 52 26 46z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += eye(70.4, 25.6, .6, d, l) + `<path d="M38 44H58L56 50H40z" fill="${d}" opacity=".45"/>` + [41, 45, 49, 53].map(x => `<path d="M${x} 50V53" stroke="${l}" stroke-width=".5"/><circle cx="${x}" cy="53.4" r=".6" fill="${l}"/>`).join('');
      s += `<path d="M26 46Q22 50 23 56" stroke="${f}" stroke-width=".8" fill="none"/><path d="M35 64H39M58 64H62" stroke="${f}" stroke-width="1.2"/><path d="M38 44L41 47L44 44L47 47L50 44L53 47L56 44" stroke="${l}" stroke-width=".35" fill="none"/>`;
      return s;
    },
    baku: (f, d, l) => { // огненный узел-бута: пламя из трёх языков в капле
      let s = `<path d="M50 64Q32 62 32 46Q32 34 44 24Q50 18 48 10Q60 18 62 30Q70 38 68 48Q66 62 50 64z" fill="${f}" stroke="${d}" stroke-width=".5"/>${shadeR(d, 'M50 64Q66 62 68 48Q70 38 62 30Q60 22 54 16Q58 30 56 44Q54 56 50 64z', .25)}`;
      s += `<path d="M50 58Q40 56 40 46Q40 38 46 32Q50 28 50 22Q56 30 56 36Q62 42 60 48Q58 58 50 58z" fill="${l}" opacity=".55"/><path d="M50 52Q45 50 46 44Q47 40 50 36Q53 42 54 44Q55 50 50 52z" fill="${f}"/>`;
      for (let k = 0; k < 7; k++) s += `<path d="M${36 + k * 4} ${60 - Math.abs(k - 3) * 2}Q${38 + k * 4} ${56 - Math.abs(k - 3) * 2} ${36 + k * 4 + 1} ${52 - Math.abs(k - 3) * 2.4}" stroke="${d}" stroke-width=".3" fill="none" opacity=".6"/>`;
      return s;
    },
    prague: (f, d, l) => { // чешский лев с двумя хвостами, в короне, встаёт на дыбы
      let s = `<path d="M40 64L42 52Q36 48 36 40Q36 34 40 30L36 22Q34 18 38 18L44 24Q48 22 52 24L58 20Q62 18 62 22L58 28Q60 34 56 40L60 44Q64 48 60 52L54 50L56 64H52L50 54H46L44 64z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M42 18L43 13L45 16L47 12L49 16L51 13L52 18z" fill="${f}" stroke="${d}" stroke-width=".35"/>` + eye(45, 24, .7, d, l) + `<path d="M40 26Q38 28 40 30" stroke="${d}" stroke-width=".4" fill="none"/>`;
      s += `<path d="M56 46Q66 40 68 30Q66 26 70 24M56 48Q70 46 74 36Q74 32 78 32" stroke="${f}" stroke-width="1.2" fill="none"/><path d="M70 24l-1-2.4M70 24l1.6-2M78 32l.4-2.6M78 32l2-1.4" stroke="${f}" stroke-width=".8"/>`;
      s += fur(40, 32, 6, 3, 1.2, d) + `<path d="M36 22l-2-1.6M37 21l-1-2.4M60 21l2-1.4M61 22l2.4-.4" stroke="${f}" stroke-width=".7"/>`;
      return s;
    },
    belgrade: (f, d, l) => { // двуглавый белый орёл с крестом на груди
      let s = wing(44, 32, -1, 7, 17, f, d, l, 1.4) + wing(56, 32, 1, 7, 17, f, d, l, 1.4);
      s += `<path d="M44 28Q50 24 56 28L56 46Q50 52 44 46z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M44 30L41 22Q42 18 45 18L46 26M56 30L59 22Q58 18 55 18L54 26" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M44 18Q40 16 38 19L42 20M56 18Q60 16 62 19L58 20" fill="${f}" stroke="${d}" stroke-width=".35"/>` + eye(43.6, 19.4, .5, d, l) + eye(56.4, 19.4, .5, d, l);
      s += `<path d="M46 32H54V44Q50 46 46 44z" fill="${d}" opacity=".5"/><path d="M50 33V43M47 37H53" stroke="${l}" stroke-width="1"/>`;
      for (let k = -2; k <= 2; k++) s += feather(50, 49, 9, Math.PI / 2 + k * .2, f, d);
      return s;
    },
    warsaw: (f, d, l) => { // варшавская Сирена: поднятый меч, круглый щит, рыбий хвост в волнах
      let s = `<path d="M44 40Q40 50 46 56Q54 62 66 58Q74 55 76 48Q72 52 66 52Q58 52 54 46Q52 42 52 38z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      for (let i = 0; i < 6; i++) s += `<path d="M${50 + i * 3.4} ${47 + i * .9}q1.6 2.2 3.4 0" stroke="${d}" stroke-width=".35" fill="none"/>`;
      s += `<path d="M76 48L82 42L80 49L84 52L76 51z" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M45 40Q43 32 45 26Q48 22 52 26Q54 32 52 40z" fill="${f}" stroke="${d}" stroke-width=".45"/><circle cx="48.5" cy="20" r="4" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M45 18Q42 22 43 30M46 17Q44 24 46 30" stroke="${d}" stroke-width=".35" fill="none"/><circle cx="49.8" cy="19.4" r=".5" fill="${d}"/>`;
      s += `<path d="M52 27L60 20L61 21L54 29z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M60 20L72 6L73.4 7.2L61.4 21.4z" fill="${l}" stroke="${d}" stroke-width=".4"/><path d="M58 18L63 23" stroke="${d}" stroke-width="1.1"/>`;
      s += `<circle cx="40" cy="33" r="7" fill="${f}" stroke="${d}" stroke-width=".6"/><circle cx="40" cy="33" r="4.6" fill="none" stroke="${d}" stroke-width=".4"/><circle cx="40" cy="33" r="1.3" fill="${l}"/>`;
      s += `<path d="M24 62Q30 58 36 62T48 62T60 62T72 62T84 62M18 66Q24 62 30 66T42 66T54 66T66 66T78 66" stroke="${f}" stroke-width="1.1" fill="none"/>`;
      return s;
    },
    sofia: (f, d, l) => { // болгарская роза: бутон, слои лепестков, листья и шипы, капля росы
      let s = `<path d="M50 44Q48 56 50 66" stroke="${f}" stroke-width="1.6" fill="none"/><path d="M49 52Q40 48 34 52Q40 58 49 56zM51 58Q60 54 66 58Q60 64 51 62z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M49 54L36 52M51 60L64 58" stroke="${d}" stroke-width=".3"/><path d="M50 50l-1.6-1M50 62l1.6-.6" stroke="${f}" stroke-width=".7"/>`;
      for (const [rx, ry, y, k] of [[17, 14, 30, 0], [13, 11, 28, 1], [9, 8, 26, 2], [5, 5, 24, 3]]) s += `<path d="M${50 - rx} ${y + 4}Q${50 - rx} ${y - ry} 50 ${y - ry}Q${50 + rx} ${y - ry} ${50 + rx} ${y + 4}Q${50 + rx * .6} ${y + ry * .9} 50 ${y + ry}Q${50 - rx * .6} ${y + ry * .9} ${50 - rx} ${y + 4}z" fill="${f}" stroke="${d}" stroke-width="${.5 - k * .05}"/>`;
      s += `<path d="M47 24Q50 20 53 24" stroke="${d}" stroke-width=".5" fill="none"/><circle cx="40" cy="30" r="1.1" fill="${l}"/>`;
      return s;
    },
    beijing: (f, d, l) => { // лев-хранитель (ши): курчавая грива, шар под лапой, постамент
      let s = `<path d="M30 66V58H70V66z" fill="${f}"/><path d="M30 58H70" stroke="${l}" stroke-width=".5"/>` + gridWin(33, 61, 66, 61, 6, 1, 3, 2, `${d}`);
      s += `<path d="M36 58L38 44Q36 36 42 32Q40 24 46 20Q54 16 60 22Q64 28 60 34Q64 40 62 48L64 58H58L56 48H46L44 58z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      for (const [x, y] of [[44, 22], [48, 19], [53, 18.6], [57, 21], [59, 26], [43, 27], [42, 32]]) s += `<path d="M${x} ${y}a1.6 1.6 0 1 1 1.6 1.6" stroke="${d}" stroke-width=".4" fill="none"/>`;
      s += eye(52, 27, .9, d, l) + eye(56, 27.6, .7, d, l) + `<path d="M51 31Q54 33 57 31" stroke="${d}" stroke-width=".5" fill="none"/>`;
      s += `<circle cx="66" cy="54" r="4" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M62.4 52Q66 56 69.6 52M63 56.6Q66 53 69 56.6" stroke="${d}" stroke-width=".35" fill="none"/><path d="M60 46L64 50" stroke="${f}" stroke-width="2"/>`;
      return s;
    },
    chengdu: (f, d, l) => { // панда с побегом бамбука
      let s = `<path d="M30 62Q28 48 36 42Q32 36 36 30Q42 24 50 24Q58 24 64 30Q68 36 64 42Q72 48 70 62z" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      s += `<circle cx="38" cy="27" r="4" fill="${d}"/><circle cx="62" cy="27" r="4" fill="${d}"/><path d="M42 33Q44 30 47 34Q46 38 43 37z" fill="${d}"/><path d="M58 33Q56 30 53 34Q54 38 57 37z" fill="${d}"/>` + eye(45, 34.4, .6, l, f) + eye(55, 34.4, .6, l, f);
      s += `<path d="M48 39Q50 41 52 39Q50 38 48 39z" fill="${d}"/><path d="M50 40V42M47.6 42.6Q50 44 52.4 42.6" stroke="${d}" stroke-width=".45" fill="none"/>`;
      s += `<path d="M30 50Q34 56 42 56Q40 50 34 46zM70 50Q66 56 58 56Q60 50 66 46z" fill="${d}"/><path d="M34 62H44M56 62H66" stroke="${d}" stroke-width="2.4"/>`;
      s += `<path d="M64 60L74 18" stroke="${f}" stroke-width="1.6"/>` + [26, 36, 46].map(y => `<path d="M${n2(64 + (60 - y) * .235 - 1.2)} ${y}H${n2(64 + (60 - y) * .235 + 1.2)}" stroke="${d}" stroke-width=".6"/>`).join('') + `<path d="M72 26Q80 22 82 26Q78 28 72 27zM70 34Q62 30 60 34Q64 36 70 35z" fill="${f}" stroke="${d}" stroke-width=".35"/>`;
      return s;
    },
    hangzhou: (f, d, l) => { // два карпа кои по кругу инь-ян, лотос
      let s = '';
      for (const [rot] of [[0], [180]]) s += `<g transform="rotate(${rot} 50 38)"><path d="M50 18Q66 20 68 34Q66 30 60 30Q54 32 52 40Q50 46 44 46Q50 40 48 32Q46 24 50 18z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M44 46L38 52L42 44L36 44z" fill="${f}" stroke="${d}" stroke-width=".35"/>${eye(60, 24, .8, d, l)}` +
        Array.from({ length: 5 }, (_, i) => `<path d="M${54 - i * 1.6} ${28 + i * 3}a1.4 1.4 0 0 1 2.4 1" stroke="${d}" stroke-width=".35" fill="none"/>`).join('') + `<path d="M64 26Q68 24 70 26" stroke="${f}" stroke-width=".5" fill="none"/></g>`;
      s += `<circle cx="50" cy="38" r="24" fill="none" stroke="${f}" stroke-width=".8" stroke-dasharray="2 1.5"/>`;
      for (let k = 0; k < 5; k++) s += `<path d="M50 66Q${42 + k * 4} ${58} 50 ${56 + Math.abs(k - 2)}" fill="${f}" stroke="${d}" stroke-width=".3"/>`;
      return s;
    },
    tokyo: (f, d, l) => { // японский журавль: распахнутые крылья, красная шапочка, длинные ноги
      let s = wing(48, 36, -1, 9, 22, f, d, l, 1.3) + wing(54, 36, 1, 9, 20, f, d, l, 1.1);
      s += `<path d="M44 40Q48 32 56 34Q60 38 58 44Q54 48 46 46z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M56 34Q60 24 62 16Q64 12 67 14L74 16L67 17Q64 22 60 36" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<circle cx="65.6" cy="13" r="1.4" fill="${l}"/>` + eye(66, 15, .5, d, l) + `<path d="M62 22Q61 28 60 34" stroke="${d}" stroke-width=".6" fill="none"/>`;
      s += `<path d="M44 46Q38 48 36 52L42 50zM46 46L42 54" fill="${d}" stroke="${d}" stroke-width=".4"/><path d="M50 47L48 66M54 46L56 66M46 66H50M54 66H58" stroke="${f}" stroke-width=".8"/>`;
      return s;
    },
    osaka: (f, d, l) => { // манэки-нэко: поднятая лапа, колокольчик, монета кобан
      let s = `<path d="M34 64Q30 52 36 46Q32 40 34 32L32 22L40 28Q46 26 52 26L58 22V30Q62 38 60 46Q66 52 64 64z" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      s += `<path d="M58 30Q62 20 66 14Q70 12 70 16Q68 22 64 30Q62 34 60 36z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M66 14l1-2M68 14l1.4-1.4M69.4 15.4l1.6-.6" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M38 36Q40 34 42 36M48 36Q50 34 52 36" stroke="${d}" stroke-width=".7" fill="none"/><path d="M44 39L45 40.4L46 39" stroke="${d}" stroke-width=".5" fill="none"/><path d="M36 40H30M36 41.6L30 43M54 40H60M54 41.6L60 43" stroke="${d}" stroke-width=".35"/>`;
      s += `<path d="M36 46Q45 50 56 46" stroke="${l}" stroke-width="1.4" fill="none"/><circle cx="45.6" cy="49" r="2.2" fill="${l}" stroke="${d}" stroke-width=".4"/><path d="M45.6 50.2V51.2" stroke="${d}" stroke-width=".4"/>`;
      s += `<ellipse cx="45" cy="57" rx="6" ry="4" fill="${l}" stroke="${d}" stroke-width=".45"/><path d="M41 57H49M45 54V60" stroke="${d}" stroke-width=".35"/>`;
      return s;
    },
    seoul: (f, d, l) => { // тигр: полосы, мощные лапы, хвост дугой
      let s = `<path d="M22 50Q24 40 34 40H54Q58 34 64 34Q72 36 72 44Q72 50 66 52L66 64H62L61 54H40L38 64H34L33 54Q24 54 22 50z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M22 50Q14 46 16 34Q18 30 20 32Q18 40 24 44" stroke="${f}" stroke-width="2" fill="none"/>` + [36, 40].map(y => `<path d="M${15.6 + (y - 34) * .2} ${y}l2.4 .6" stroke="${d}" stroke-width=".8"/>`).join('');
      s += `<path d="M62 34L63 30L66 33M68 35L70 31L70 36" fill="${f}" stroke="${d}" stroke-width=".35"/>` + eye(66, 39.4, .7, d, l) + `<path d="M70 44Q71 46 69.6 46.4M66 46.4Q68 47.6 70 46.6" stroke="${d}" stroke-width=".4" fill="none"/>`;
      for (const x of [32, 37, 42, 47, 52, 57]) s += `<path d="M${x} 40Q${x - 2} 45 ${x + 1} 50" stroke="${d}" stroke-width="1" fill="none"/>`;
      s += `<path d="M62 37L64 41M66 36.4L66.4 40M70 38L68.6 41" stroke="${d}" stroke-width=".7"/><path d="M33 64H38M61 64H66" stroke="${f}" stroke-width="1.2"/>`;
      return s;
    },
    singapore: (f, d, l) => { // Мерлион: голова льва с гривой, рыбий хвост с чешуёй, струя воды
      let s = `<path d="M44 66Q38 56 42 46Q46 38 46 32Q44 22 52 18Q60 16 64 22Q68 30 62 36Q58 42 60 50Q64 58 58 66z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      for (let k = 0; k < 9; k++) { const a = -2.4 + k * .4; s += `<path d="M${n2(56 + Math.cos(a) * 8)} ${n2(25 + Math.sin(a) * 8)}q${n2(Math.cos(a) * 3)} ${n2(Math.sin(a) * 3)} ${n2(Math.cos(a + .3) * 4)} ${n2(Math.sin(a + .3) * 4)}" stroke="${d}" stroke-width=".45" fill="none"/>`; }
      s += eye(60, 24, .8, d, l) + `<path d="M64 28Q66 30 64 31" stroke="${d}" stroke-width=".5" fill="none"/>`;
      for (let y = 42; y < 64; y += 3.4) s += Array.from({ length: 3 }, (_, i) => `<path d="M${n2(46 + i * 4 - (y % 2))} ${y}a2 2 0 0 0 4 0" stroke="${d}" stroke-width=".35" fill="none"/>`).join('');
      s += `<path d="M64 30Q74 30 80 44Q82 52 78 60" stroke="${l}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M66 31Q75 34 79 46" stroke="${l}" stroke-width=".5" fill="none" stroke-dasharray="1 1"/>`;
      return s;
    },
    buenosaires: (f, d, l) => { // «Майское солнце»: лицо, чередование прямых и волнистых лучей
      let s = '';
      for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2, x1 = 50 + Math.cos(a) * 12, y1 = 38 + Math.sin(a) * 12, x2 = 50 + Math.cos(a) * 26, y2 = 38 + Math.sin(a) * 26;
        s += k % 2 ? `<path d="M${n2(x1)} ${n2(y1)}Q${n2(50 + Math.cos(a + .08) * 17)} ${n2(38 + Math.sin(a + .08) * 17)} ${n2(50 + Math.cos(a) * 19)} ${n2(38 + Math.sin(a) * 19)}T${n2(x2)} ${n2(y2)}" stroke="${f}" stroke-width="1.1" fill="none"/>` : `<path d="M${n2(50 + Math.cos(a - .05) * 12)} ${n2(38 + Math.sin(a - .05) * 12)}L${n2(x2)} ${n2(y2)}L${n2(50 + Math.cos(a + .05) * 12)} ${n2(38 + Math.sin(a + .05) * 12)}z" fill="${f}"/>`; }
      s += `<circle cx="50" cy="38" r="11" fill="${f}" stroke="${d}" stroke-width=".5"/>` + eye(46, 36, .9, d, l) + eye(54, 36, .9, d, l) + `<path d="M44 33.6Q46 32.4 48 33.6M52 33.6Q54 32.4 56 33.6" stroke="${d}" stroke-width=".45" fill="none"/>`;
      s += `<path d="M50 36V41Q49 42 50.6 42" stroke="${d}" stroke-width=".45" fill="none"/><path d="M46.4 44Q50 46.4 53.6 44" stroke="${d}" stroke-width=".6" fill="none"/>`;
      return s;
    },
    madrid: (f, d, l) => { // бык: мощный загривок, рога вперёд, копыто бьёт землю
      let s = `<path d="M24 48Q22 40 30 36Q38 30 50 34Q58 30 64 34L70 38Q72 42 70 46L66 50L64 64H60L58 54H40L38 64H34L32 54Q24 54 24 48z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M66 36Q70 28 76 28Q72 30 70 36zM64 34Q64 28 68 26Q66 30 66 34z" fill="${f}" stroke="${d}" stroke-width=".35"/>` + eye(66.6, 40, .7, d, l) + `<path d="M70 45l1 1.4" stroke="${d}" stroke-width=".5"/>`;
      s += `<path d="M24 48Q18 50 18 58" stroke="${f}" stroke-width=".9" fill="none"/><path d="M17 58l-1 2.4M18 58l.2 2.6M19 58l1.2 2.2" stroke="${f}" stroke-width=".7"/>`;
      s += `<path d="M30 40Q40 34 50 36M38 44Q42 50 40 54M56 40Q54 46 58 50" stroke="${d}" stroke-width=".4" fill="none"/><path d="M33 64H38M59 62L63 64" stroke="${f}" stroke-width="1.2"/><path d="M60 64Q62 62 66 64" stroke="${d}" stroke-width=".4" fill="none"/>`;
      return s;
    },
    mumbai: (f, d, l) => { // слон с поднятым хоботом и праздничной попоной
      let s = `<path d="M26 48Q24 36 36 32Q48 28 58 32Q64 28 70 32Q74 38 72 46Q74 52 78 50Q80 42 82 40Q84 44 80 54Q76 58 70 54L68 64H63L62 56H40L38 64H33L32 54Q26 54 26 48z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M62 34Q56 36 58 46Q62 48 66 44Q68 38 62 34z" fill="${f}" stroke="${d}" stroke-width=".4"/>` + eye(68, 38, .7, d, l) + `<path d="M70 46Q72 50 70 52" stroke="${l}" stroke-width=".7" fill="none"/>`;
      s += `<path d="M36 34H56V46L46 50L36 46z" fill="${d}" opacity=".45"/><path d="M36 46L46 50L56 46" stroke="${l}" stroke-width=".5" fill="none"/>` + [40, 46, 52].map(x => `<circle cx="${x}" cy="40" r="1.4" fill="${l}"/>`).join('');
      s += `<path d="M26 48Q22 50 22 56" stroke="${f}" stroke-width=".8" fill="none"/><path d="M33 64H38M63 64H68" stroke="${f}" stroke-width="1.2"/>`;
      return s;
    },
    istanbul: (f, d, l) => { // тюльпан: лепестки-клинки, стебель с листьями, полумесяц со звездой
      let s = `<path d="M50 40Q48 54 50 66" stroke="${f}" stroke-width="1.6" fill="none"/><path d="M49 52Q36 46 32 34Q42 40 49 48zM51 58Q64 52 68 40Q58 46 51 54z" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M50 40Q38 36 40 20Q44 26 46 18Q50 26 50 14Q50 26 54 18Q56 26 60 20Q62 36 50 40z" fill="${f}" stroke="${d}" stroke-width=".5"/>${shadeR(d, 'M50 14Q50 26 54 18Q56 26 60 20Q62 36 50 40z', .25)}<path d="M44 24Q46 32 50 36" stroke="${l}" stroke-width=".45" fill="none"/>`;
      s += `<path d="M30 16A8 8 0 1 0 36 28A6.4 6.4 0 1 1 30 16z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M38 20l.8 1.8 2 .2-1.5 1.3.5 2-1.8-1-1.8 1 .5-2-1.5-1.3 2-.2z" fill="${f}"/>`;
      return s;
    },
    toronto: (f, d, l) => { // бобр на плотине: плоский хвост с сеткой, резцы, лапы
      let s = `<path d="M28 60H72L70 66H30z" fill="${f}"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${30 + i * 5} 60L${33 + i * 5} 66" stroke="${d}" stroke-width=".5"/>`).join('');
      s += `<path d="M34 58Q30 46 40 40Q48 34 58 38Q64 32 70 36Q74 42 70 46Q66 50 66 58z" fill="${f}" stroke="${d}" stroke-width=".45"/>` + eye(66, 39, .8, d, l) + `<path d="M64 34L65 31L67 34" fill="${f}" stroke="${d}" stroke-width=".35"/><path d="M71 44H73V46.6H71z" fill="${l}" stroke="${d}" stroke-width=".3"/>`;
      s += `<path d="M34 54Q24 52 20 58Q22 64 30 62z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M22 57L30 61M24 55L32 60M21 60L28 56M24 62L31 56" stroke="${d}" stroke-width=".3"/>`;
      s += fur(42, 44, 8, 2.4, 1.4, d) + `<path d="M60 52l2 4M64 52l1 4" stroke="${f}" stroke-width="1.2"/>`;
      return s;
    }
  };
  // герб: щит с полем, знак внутри, корона, лента. Цвета — металл (как у остальных символов)
  function crestOf(fn) {
    return (f, d, l, h) => `<path d="M30 14H70V38Q70 56 50 64Q30 56 30 38z" fill="${d}" opacity=".55"/><path d="M30 14H70V38Q70 56 50 64Q30 56 30 38z" fill="none" stroke="${f}" stroke-width="2"/>` +
      `<path d="M33 17H67V38Q67 53 50 60.6Q33 53 33 38z" fill="none" stroke="${l}" stroke-width=".4"/><g transform="translate(50 39) scale(.5) translate(-50 -40)">${fn(f, d, l, h)}</g>` +
      `<path d="M36 14L38 6L43 10L50 4L57 10L62 6L64 14z" fill="${f}"/><path d="M36 14H64" stroke="${l}" stroke-width=".6"/>` + [38, 50, 62].map(x => `<circle cx="${x}" cy="${x === 50 ? 4 : 6}" r="1.2" fill="${l}"/>`).join('') +
      `<path d="M22 60H78L74 64L78 68H22L26 64z" fill="${f}"/><path d="M26 64H74" stroke="${d}" stroke-width=".4"/>`;
  }
  // символ выпуска: 2026 — основной, дальше по кругу запасные (у каждого города свои)
  function symbolFor(lm, th) {
    const all = [LX[lm] || L[lm] || LN[lm] || L.generic].concat(SIGN[lm] ? [SIGN[lm]] : [], ALT[lm] || [], AN[lm] ? [AN[lm], crestOf(AN[lm])] : [], SIGN[lm] ? [crestOf(SIGN[lm])] : []), k = ((edYear(th) - 2026) % all.length + all.length) % all.length;
    return all[k];
  }
  const ENAMEL = { emblem: ['#2350a8', '#a8243a'], snow: ['#3f8fd0', '#5aa8e0'], chevron: ['#2c4a7a', '#b32d3a'], zigzag: ['#1f8fd0', '#c99a2a'], sunray: ['#d0782a', '#b8432a'], gears: ['#4a525e', '#a8322a'], compass: ['#2d5a8c', '#3a7ab0'], petals: ['#c0386e', '#8e3fd0'], crown: ['#a8243a', '#c99a2a'],
    domes: ['#1d6b5e', '#2f5a9c'], mashrabiya: ['#6e4a20', '#1d5a6b'], lattice: ['#1f4fb0', '#2f7ad0'], shells: ['#1f8fc0', '#e08a2a'], ziggurat: ['#2a3f6e', '#8a2a3a'], mountains: ['#2f7a6a', '#3a6ab0'], horns: ['#19b5a5', '#0f8a9e'], folk: ['#8e3fd0', '#b04cc8'], nordic: ['#2f78d6', '#3fa0e8'], baroque: ['#b3203a', '#2747a8'], tropic: ['#17a35a', '#0f8a6e'],
    deco: ['#1d2f6e', '#a8243a'], arabesque: ['#0f7d63', '#1f6fa8'], skyline: ['#2f8fe0', '#d24a2a'], hexcut: ['#3f6c99', '#5a4fb0'], laurel: ['#a8243a', '#1f7a6e'], vitrage: ['#2fa58a', '#2f78d6'] };
  // ---------------------------------------------------------------- v128.3: знаки-символы городов (как звезда Техаса)
  const starP = (cx, cy, R, r, n, a0) => { n = n || 5; a0 = a0 == null ? -Math.PI / 2 : a0; const p = []; for (let k = 0; k < n * 2; k++) { const a = a0 + k * Math.PI / n, q = k % 2 ? r : R; p.push(n2(cx + Math.cos(a) * q) + ' ' + n2(cy + Math.sin(a) * q)); } return 'M' + p.join('L') + 'z'; };
  const polar = (cx, cy, r, a) => n2(cx + Math.cos(a) * r) + ' ' + n2(cy + Math.sin(a) * r);
  const mirrorX = s => `<g transform="translate(100 0) scale(-1 1)">${s}</g>`;
  const SIGN = {
    moscow: (f, d, l) => { // рубиновая звезда Кремля на шатре башни: огранённые лучи, двойная рамка
      const cx = 50, cy = 29, R = 21, r = 8.6;
      let s = `<path d="M43 66L46 50H54L57 66z" fill="${f}" stroke="${d}" stroke-width=".4"/>${shadeR(d, 'M50 50H54L57 66H50z', .3)}<path d="M45 58H55M44 62H56" stroke="${d}" stroke-width=".35"/><circle cx="50" cy="${cy + 18}" r="2.4" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="${starP(cx, cy, R + 3.2, r + 1.4)}" fill="${f}" stroke="${d}" stroke-width=".6"/><path d="${starP(cx, cy, R, r)}" fill="${d}" opacity=".55"/>`;
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; s += `<path d="M${cx} ${cy}L${polar(cx, cy, R, a)}L${polar(cx, cy, r, a + Math.PI / 5)}z" fill="${l}" opacity=".5"/>`; }
      return s + `<path d="${starP(cx, cy, R - 5, r - 2.4)}" fill="none" stroke="${l}" stroke-width=".45" opacity=".8"/>`;
    },
    petersburg: (f, d, l) => { // кораблик на шпиле Адмиралтейства
      let s = `<path d="M49.3 66L49.6 40H50.4L50.7 66z" fill="${f}"/><circle cx="50" cy="40" r="2" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M46.6 66L48.4 50H51.6L53.4 66z" fill="${f}" stroke="${d}" stroke-width=".35"/>`;
      s += `<path d="M24 30H74L70 36Q50 40 30 36z" fill="${f}" stroke="${d}" stroke-width=".5"/><path d="M27 32.4H71" stroke="${d}" stroke-width=".35"/>` + [32, 38, 44, 50, 56, 62, 68].map(x => `<circle cx="${x}" cy="34" r=".7" fill="${d}"/>`).join('');
      s += `<path d="M72 30L82 25L75 31z" fill="${f}" stroke="${d}" stroke-width=".35"/><path d="M24 30Q21 26 22 22L27 30z" fill="${f}" stroke="${d}" stroke-width=".35"/>`;
      for (const [x, t] of [[37, 12], [50, 6], [63, 12]]) { s += `<path d="M${x} 30V${t}" stroke="${f}" stroke-width=".9"/>`;
        for (const [y0, w] of [[t + 3, 5], [t + 10, 7]]) if (y0 + 6 < 30) s += `<path d="M${x - w} ${y0}Q${x} ${y0 - 1.5} ${x + w} ${y0}Q${x + w + 1} ${y0 + 3} ${x + w} ${y0 + 6}Q${x} ${y0 + 4.6} ${x - w} ${y0 + 6}Q${x - w + 1} ${y0 + 3} ${x - w} ${y0}z" fill="${f}" stroke="${d}" stroke-width=".35"/>`;
        s += `<path d="M${x} ${t}L${x + 6} ${t + 1.3}L${x} ${t + 2.6}z" fill="${l}"/>`; }
      return s;
    },
    kyiv: (f, d, l) => { // гроздь калины: ягоды с бликами, трёхлопастные листья, веточка
      let s = `<path d="M50 44Q50 38 46 32M50 40Q58 38 64 36" stroke="${f}" stroke-width="1.4" fill="none"/>`;
      const leaf = (x, y, a, k) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${k})"><path d="M0 0Q-2 -6 -9 -8Q-7 -11 -3 -11Q-3 -16 0 -19Q3 -16 3 -11Q7 -11 9 -8Q2 -6 0 0z" fill="${f}" stroke="${d}" stroke-width=".5"/><path d="M0 -1V-17M0 -6L-7 -8.6M0 -6L7 -8.6" stroke="${d}" stroke-width=".35" fill="none"/></g>`;
      s += leaf(45, 32, -30, 1.15) + leaf(64, 36, 55, 1);
      const B = []; for (let k = 0; k < 9; k++) { const t = Math.PI * (.12 + k * .095); B.push([50 + Math.cos(t) * 17, 44 + Math.sin(t) * 15]); } for (let k = 0; k < 6; k++) { const t = Math.PI * (.2 + k * .12); B.push([50 + Math.cos(t) * 9, 44 + Math.sin(t) * 8]); }
      for (const [x, y] of B) s += `<path d="M50 44Q${n2((50 + x) / 2)} ${n2(Math.min(y, 48))} ${n2(x)} ${n2(y - 1)}" stroke="${f}" stroke-width=".45" fill="none"/>`;
      for (const [x, y] of B) s += `<circle cx="${x}" cy="${y - 1}" r="3" fill="${f}" stroke="${d}" stroke-width=".45"/><circle cx="${x - 1}" cy="${y - 2}" r=".9" fill="${l}"/><circle cx="${x + .6}" cy="${y + .6}" r=".35" fill="${d}"/>`;
      return s;
    },
    minsk: (f, d, l) => { // василёк: венчик из воронковидных цветков с зубчиками, корзинка, стебель
      const cx = 50, cy = 30; let s = `<path d="M50 50Q49 58 50 66" stroke="${f}" stroke-width="1.4" fill="none"/><path d="M50 60Q40 58 34 50Q43 54 50 58zM50 63Q60 60 66 53Q58 58 50 61z" fill="${f}" stroke="${d}" stroke-width=".35"/>`;
      for (let k = 0; k < 11; k++) { const a = k / 11 * 360 - 90;
        s += `<g transform="translate(${cx} ${cy}) rotate(${n2(a)})"><path d="M5 -1.4L15.5 -4.6L17 -6.4L18.2 -3.8L19.8 -4.4L19.4 -1.6L21 0L19.4 1.6L19.8 4.4L18.2 3.8L17 6.4L15.5 4.6L5 1.4z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M6 0H18" stroke="${d}" stroke-width=".3"/><path d="M8 -1.2L15 -3.4" stroke="${l}" stroke-width=".3" opacity=".7"/></g>`; }
      s += `<circle cx="${cx}" cy="${cy}" r="6.4" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; s += `<circle cx="${n2(cx + Math.cos(a) * 3.8)}" cy="${n2(cy + Math.sin(a) * 3.8)}" r=".9" fill="${d}"/>`; }
      return s + `<circle cx="${cx}" cy="${cy}" r="1.4" fill="${l}"/>`;
    },
    almaty: (f, d, l) => { // шанырак: кольцо купола юрты, перекрещенные дуги-кульдреуиши, уыки-лучи, бараньи рога снизу
      const cx = 50, cy = 32; let s = '';
      for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; s += `<path d="M${polar(cx, cy, 18, a)}L${polar(cx, cy, k % 2 ? 24 : 27, a)}" stroke="${f}" stroke-width="1.2" stroke-linecap="round"/>`; }
      s += `<circle cx="${cx}" cy="${cy}" r="19" fill="${f}" stroke="${d}" stroke-width=".6"/><circle cx="${cx}" cy="${cy}" r="15.4" fill="${d}" opacity=".55"/>`;
      for (const o of [-6, 0, 6]) { const hw = Math.sqrt(15.4 * 15.4 - o * o);
        for (const [w, c] of [[2.6, d], [1.5, f]]) s += `<path d="M${n2(cx - hw)} ${cy + o}Q${cx} ${cy + o - 5} ${n2(cx + hw)} ${cy + o}M${cx + o} ${n2(cy - hw)}Q${cx + o + 5} ${cy} ${cx + o} ${n2(cy + hw)}" stroke="${c}" stroke-width="${w}" fill="none"/>`; }
      s += `<circle cx="${cx}" cy="${cy}" r="19" fill="none" stroke="${l}" stroke-width=".4" opacity=".7"/>`;
      const horn = `<path d="M50 64Q50 56 42 56Q36 56 36 60Q36 63 39 63Q41 63 41 61" stroke="${f}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
      return s + horn + mirrorX(horn);
    },
    astana: (f, d, l) => { // солнце с 32 лучами и парящий степной орёл (как на флаге)
      const cx = 50, cy = 22; let s = '';
      for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2; s += `<path d="M${polar(cx, cy, 10.4, a - .06)}L${polar(cx, cy, k % 2 ? 14.5 : 17, a)}L${polar(cx, cy, 10.4, a + .06)}z" fill="${f}"/>`; }
      s += `<circle cx="${cx}" cy="${cy}" r="9.6" fill="${f}" stroke="${d}" stroke-width=".5"/><circle cx="${cx}" cy="${cy}" r="6.6" fill="none" stroke="${l}" stroke-width=".4"/>`;
      const wing = (sd) => { let w = `<path d="M${50 + sd * 2} 44Q${50 + sd * 16} 31 ${50 + sd * 32} 40Q${50 + sd * 16} 40 ${50 + sd * 2} 49z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
        for (let i = 0; i < 8; i++) { const t = i / 7, x = 50 + sd * (8 + t * 22), y = 45 + t * 1.5 - Math.sin(t * Math.PI) * 2; w += `<ellipse cx="${n2(x)}" cy="${n2(y + 3)}" rx="1.7" ry="${n2(5 + t * 2)}" transform="rotate(${n2(sd * (14 + t * 30))} ${n2(x)} ${n2(y + 3)})" fill="${f}" stroke="${d}" stroke-width=".35"/>`; }
        return w; };
      s += wing(-1) + wing(1) + `<path d="M50 41Q46.6 45 47.6 53L45 62L50 58.6L55 62L52.4 53Q53.4 45 50 41z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M50 41Q47 38 49.6 35.6L53.4 37L51.4 38.4z" fill="${f}" stroke="${d}" stroke-width=".4"/><circle cx="50.4" cy="37.4" r=".5" fill="${d}"/>`;
      return s + `<path d="M48.6 47L50 52L51.4 47" stroke="${d}" stroke-width=".3" fill="none"/>`;
    },
    tashkent: (f, d, l) => { // полумесяц и двенадцать звёзд флага Узбекистана, ветвь хлопка
      let s = `<path d="M36 12A15 15 0 1 0 36 42A17 17 0 0 1 36 12z" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      for (let r = 0; r < 3; r++) for (let j = 0; j < 3 + r; j++) s += `<path d="${starP(72 - j * 6.2, 16 + r * 8.6, 2.8, 1.15)}" fill="${f}" stroke="${d}" stroke-width=".3"/>`;
      s += `<path d="M28 62Q50 50 72 62" stroke="${f}" stroke-width="1.2" fill="none"/>`;
      for (const [x, y] of [[34, 56], [50, 51], [66, 56]]) { s += `<path d="M${x - 3} ${y + 3}L${x} ${y + 1}L${x + 3} ${y + 3}L${x + 1.6} ${y + 5}H${x - 1.6}z" fill="${d}"/>`;
        for (const [dx, dy] of [[-2.2, -1], [2.2, -1], [0, -3.2], [0, 1]]) s += `<circle cx="${n2(x + dx)}" cy="${n2(y + dy)}" r="2.7" fill="${l}" stroke="${d}" stroke-width=".35"/>`; }
      return s;
    },
    baku: (f, d, l) => { // бута — огненный «огурец» с вложенными контурами и бисером
      const B = 'M50 64C30 64 24 42 36 30C44 23 56 22 58 10C68 20 74 36 68 50C64 59 57 64 50 64z';
      let s = `<path d="${B}" fill="${f}" stroke="${d}" stroke-width=".6"/><g transform="translate(50 46) scale(.74) translate(-50 -46)"><path d="${B}" fill="none" stroke="${d}" stroke-width=".8"/></g><g transform="translate(50 49) scale(.46) translate(-50 -46)"><path d="${B}" fill="${d}" opacity=".5"/></g>`;
      for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; s += `<circle cx="${n2(49 + Math.cos(a) * 15)}" cy="${n2(49 + Math.sin(a) * 11)}" r=".75" fill="${l}"/>`; }
      for (const k of [-1, 0, 1]) s += `<path d="M${50 + k * 3} 56Q${48 + k * 3} 50 ${50 + k * 3} ${45 - Math.abs(k) * 2}Q${52 + k * 3} 50 ${50 + k * 3} 56z" fill="${l}" opacity=".85"/>`;
      return s;
    },
    tbilisi: (f, d, l) => { // болнисский крест с расширенными концами в венке виноградной лозы
      let s = '';
      for (const sd of [-1, 1]) { s += `<g transform="translate(${50} 0) scale(${sd} 1) translate(-50 0)"><path d="M50 66Q30 64 25 44Q24 34 30 26" stroke="${f}" stroke-width="1.3" fill="none"/>`;
        for (const [x, y] of [[26, 48], [29, 32]]) s += `<path d="M${x} ${y}Q${x - 6} ${y - 4} ${x - 6} ${y + 2}Q${x - 3} ${y + 5} ${x} ${y}z" fill="${f}" stroke="${d}" stroke-width=".3"/>`;
        for (const [i, j] of [[0, 0], [-1, 1], [1, 1], [-2, 2], [0, 2], [2, 2], [-1, 3], [1, 3], [0, 4]]) s += `<circle cx="${32 + i * 1.6}" cy="${56 + j * 1.6}" r="1.05" fill="${f}" stroke="${d}" stroke-width=".25"/>`;
        s += '</g>'; }
      const arm = `<path d="M-3 -3L-9 -22Q0 -18 9 -22L3 -3z" fill="${f}" stroke="${d}" stroke-width=".5"/><path d="M-1.6 -6L-5.6 -19Q0 -16.6 5.6 -19L1.6 -6" fill="none" stroke="${l}" stroke-width=".4"/><circle cx="-9" cy="-22" r="1" fill="${f}"/><circle cx="9" cy="-22" r="1" fill="${f}"/>`;
      s += `<g transform="translate(50 38)">${[0, 90, 180, 270].map(a => `<g transform="rotate(${a})">${arm}</g>`).join('')}<circle r="3.6" fill="${f}" stroke="${d}" stroke-width=".5"/><circle r="1.4" fill="${l}"/></g>`;
      return s;
    },
    yerevan: (f, d, l) => { // гранат: корона-чашечка, вскрытый бок с зёрнами, листья
      let s = `<path d="M44 23Q34 12 25 16Q33 24 44 25zM56 23Q66 12 75 16Q67 24 56 25z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M44 23Q36 18 28 17M56 23Q64 18 72 17" stroke="${d}" stroke-width=".3" fill="none"/>`;
      s += `<path d="M50 24C36 24 28 34 28 45C28 57 38 65 50 65C62 65 72 57 72 45C72 34 64 24 50 24z" fill="${f}" stroke="${d}" stroke-width=".55"/>${shadeR(d, 'M50 24C64 24 72 34 72 45C72 57 62 65 50 65C58 58 62 46 50 24z', .22)}`;
      s += `<path d="M44 26L42 16L46 20L48 13L50 19L52 13L54 20L58 16L56 26z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      s += `<path d="M48 40Q60 34 68 40Q70 52 60 59Q50 54 48 40z" fill="${d}" opacity=".7"/>`;
      for (let i = 0; i < 16; i++) { const x = 52 + (i % 4) * 4 + (Math.floor(i / 4) % 2) * 2, y = 42 + Math.floor(i / 4) * 4; s += `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="1.8" fill="${f}"/><circle cx="${x - .5}" cy="${y - .6}" r=".45" fill="${l}"/>`; }
      return s + `<path d="M34 36Q36 30 42 28" stroke="${l}" stroke-width="1" fill="none" opacity=".7" stroke-linecap="round"/>`;
    },
    bishkek: (f, d, l) => { // ак-калпак: высокая войлочная шапка, разрезные отвороты, вышивка, кисточка
      let s = `<path d="M33 56Q35 32 50 13Q65 32 67 56z" fill="${f}" stroke="${d}" stroke-width=".55"/>${shadeR(d, 'M50 13Q65 32 67 56H50z', .25)}`;
      s += `<path d="M42 44Q50 38 58 44M44 34Q50 29 56 34M46.6 25Q50 22 53.4 25" stroke="${d}" stroke-width=".45" fill="none"/>`;
      for (const y of [44, 34]) s += `<path d="M48 ${y - 4}q2 -2.4 4 0" stroke="${d}" stroke-width=".35" fill="none"/>`;
      s += `<path d="M28 58L33 46L50 50V60zM72 58L67 46L50 50V60z" fill="${d}" stroke="${f}" stroke-width=".7"/><path d="M50 50V60" stroke="${f}" stroke-width=".8"/>`;
      s += `<path d="M31 55Q38 50 48 52M69 55Q62 50 52 52" stroke="${f}" stroke-width=".35" fill="none" stroke-dasharray="1 .8"/>`;
      return s + `<path d="M50 13Q53 9 51.6 5" stroke="${f}" stroke-width=".8" fill="none"/><ellipse cx="51.4" cy="4.4" rx="1.4" ry="2" fill="${f}"/><path d="M26 61H74" stroke="${f}" stroke-width="1"/>`;
    },
    kazan: (f, d, l) => { // Казанская шапка: золотой венец с арками-кокошниками, самоцветы, меховая опушка
      let s = `<path d="M30 50V36Q30 25 50 21Q70 25 70 36V50z" fill="${f}" stroke="${d}" stroke-width=".55"/>${shadeR(d, 'M50 21Q70 25 70 36V50H50z', .22)}`;
      for (const x of [34, 42, 50, 58, 66]) s += `<path d="M${x - 4} 50V43Q${x - 4} 37 ${x} 35Q${x + 4} 37 ${x + 4} 43V50" stroke="${d}" stroke-width=".45" fill="none"/><circle cx="${x}" cy="44.6" r="1.6" fill="${d}"/><circle cx="${x - .5}" cy="44" r=".5" fill="${l}"/>`;
      s += `<path d="M34 32Q50 24 66 32" stroke="${d}" stroke-width=".4" fill="none"/>` + [38, 44, 50, 56, 62].map(x => `<circle cx="${x}" cy="${x === 50 ? 28 : x === 44 || x === 56 ? 28.8 : 30.4}" r=".8" fill="${l}"/>`).join('');
      s += `<rect x="27" y="50" width="46" height="10" rx="4" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      for (let x = 29; x < 72; x += 1.6) s += `<path d="M${x} 51.4l.6 7" stroke="${d}" stroke-width=".3" opacity=".6"/>`;
      return s + `<path d="M50 21V15" stroke="${f}" stroke-width="1"/><circle cx="50" cy="13" r="2.8" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M50 10.2V6M48.4 7.6H51.6" stroke="${f}" stroke-width=".8"/><circle cx="49" cy="12.2" r=".7" fill="${l}"/>`;
    },
    cologne: (f, d, l) => { // герб Кёльна: три короны волхвов и одиннадцать огоньков
      let s = `<path d="M28 12H72V40Q72 58 50 66Q28 58 28 40z" fill="${f}" stroke="${d}" stroke-width=".6"/><path d="M28 12H72V30H28z" fill="${d}" opacity=".5"/><path d="M31 15H69V40Q69 55 50 62.6Q31 55 31 40z" fill="none" stroke="${l}" stroke-width=".35" opacity=".7"/>`;
      for (const x of [37, 50, 63]) s += `<path d="M${x - 5} 27V21.4L${x - 3.4} 23.6L${x - 1.8} 18.6L${x} 22.4L${x + 1.8} 18.6L${x + 3.4} 23.6L${x + 5} 21.4V27z" fill="${f}" stroke="${d}" stroke-width=".35"/>` + [-5, -1.8, 1.8, 5].map(k => `<circle cx="${x + k}" cy="${Math.abs(k) > 3 ? 21 : 18.2}" r=".55" fill="${l}"/>`).join('');
      const fl = (x, y) => `<path d="M${x} ${y - 3.6}Q${x + 2.4} ${y} ${x} ${y + 2.6}Q${x - 2.4} ${y} ${x} ${y - 3.6}z" fill="${d}"/>`;
      for (const x of [35, 45, 55, 65]) s += fl(x, 35); for (const x of [38, 46, 54, 62]) s += fl(x, 44); for (const x of [42, 50, 58]) s += fl(x, 53);
      return s;
    },
    paris: (f, d, l) => { // королевская лилия (флёр-де-лис)
      const side = `<path d="M53 40C58 31 67 25 73 29C79 34 75 44 68 42C72 38 70 33 66 35C62 37 58 42 56 44z" fill="${f}" stroke="${d}" stroke-width=".5"/><path d="M47 45Q40 48 37 58Q42 54 47.6 52z" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      return side + mirrorX(side) + `<path d="M50 9C57 18 59 29 52.4 41H47.6C41 29 43 18 50 9z" fill="${f}" stroke="${d}" stroke-width=".55"/><path d="M50 13V38" stroke="${d}" stroke-width=".4"/><path d="M48 15Q45 24 48.4 36" stroke="${l}" stroke-width=".45" fill="none" opacity=".8"/>` +
        `<rect x="39" y="40" width="22" height="5" rx="1.4" fill="${f}" stroke="${d}" stroke-width=".5"/><path d="M41 42.5H59" stroke="${d}" stroke-width=".3"/><path d="M47.6 45L47 56Q50 60 53 56L52.4 45z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
    },
    london: (f, d, l) => { // роза Тюдоров: два ряда лепестков, чашелистики, тычинки
      const cx = 50, cy = 36; let s = '';
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k + .5) * 2 * Math.PI / 5; s += `<path d="M${polar(cx, cy, 10, a - .22)}L${polar(cx, cy, 28, a)}L${polar(cx, cy, 10, a + .22)}z" fill="${f}" stroke="${d}" stroke-width=".4"/>`; }
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; s += `<circle cx="${n2(cx + Math.cos(a) * 12.5)}" cy="${n2(cy + Math.sin(a) * 12.5)}" r="11" fill="${f}" stroke="${d}" stroke-width=".55"/>`; }
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; s += `<path d="M${polar(cx, cy, 21.6, a - .3)}Q${polar(cx, cy, 20, a)} ${polar(cx, cy, 21.6, a + .3)}" stroke="${d}" stroke-width=".4" fill="none"/>`; }
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k + .5) * 2 * Math.PI / 5; s += `<circle cx="${n2(cx + Math.cos(a) * 6.4)}" cy="${n2(cy + Math.sin(a) * 6.4)}" r="6.6" fill="${l}" fill-opacity=".35" stroke="${d}" stroke-width=".45"/>`; }
      s += `<circle cx="${cx}" cy="${cy}" r="4.2" fill="${d}" opacity=".55"/>`;
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; s += `<circle cx="${n2(cx + Math.cos(a) * 2.6)}" cy="${n2(cy + Math.sin(a) * 2.6)}" r=".7" fill="${l}"/>`; }
      return s;
    },
    stockholm: (f, d, l) => { // далекарлийская лошадка с росписью-«куррбитсом»
      let s = `<path d="M30 40Q23 42 23 52Q26 47 31 47z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M30 62V48Q28 44 30 40L34 34Q36 31 40 31H58L62 22Q64 16 70 16L74 18L79 26L75 28L71 24.4L68.6 34Q70.6 40 70.6 46V62H64.4V50H36.4V62z" fill="${f}" stroke="${d}" stroke-width=".55"/>${shadeR(d, 'M36.4 50H64.4V62H70.6V46Q70.6 40 68.6 34L66 50z', .25)}`;
      s += `<path d="M40 31H58L56 37Q49 41 42 37z" fill="${d}" opacity=".5"/><path d="M41 37Q44 45 49 38Q52 45 57 37" stroke="${l}" stroke-width=".7" fill="none"/><circle cx="45" cy="42" r=".9" fill="${l}"/><circle cx="53" cy="42" r=".9" fill="${l}"/>`;
      s += `<path d="M61.4 24Q64 28 66 32M60.6 27Q62.6 31 64.4 34" stroke="${d}" stroke-width=".9" stroke-dasharray="1 1" fill="none"/><circle cx="71.6" cy="20.4" r=".8" fill="${d}"/><path d="M69 24.4Q72 26 75 26" stroke="${l}" stroke-width=".5" fill="none"/>`;
      return s + `<rect x="24" y="62" width="52" height="4" rx="1" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
    },
    budapest: (f, d, l) => { // Святая корона Венгрии: купол с эмалевыми пластинами, наклонённый крест, подвески
      let s = `<path d="M30 52Q30 30 50 26Q70 30 70 52z" fill="${f}" stroke="${d}" stroke-width=".55"/>${shadeR(d, 'M50 26Q70 30 70 52H50z', .2)}<path d="M50 26V52M32 44Q50 36 68 44" stroke="${d}" stroke-width="1.6" fill="none"/><path d="M50 26V52M32 44Q50 36 68 44" stroke="${l}" stroke-width=".4" fill="none"/>`;
      for (const [x, y] of [[40, 34], [60, 34], [39, 47], [61, 47]]) s += `<rect x="${x - 3}" y="${y - 3}" width="6" height="5" rx=".6" fill="${d}" opacity=".55"/><circle cx="${x}" cy="${y - .5}" r="1.2" fill="${l}" opacity=".8"/>`;
      s += `<rect x="29" y="52" width="42" height="8" rx="1" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      for (let i = 0; i < 7; i++) { const x = 32.6 + i * 5.8; s += i % 2 ? `<circle cx="${x}" cy="56" r="1.6" fill="${d}"/><circle cx="${x - .4}" cy="55.5" r=".5" fill="${l}"/>` : `<rect x="${x - 1.8}" y="54" width="3.6" height="4" fill="${d}" opacity=".7"/>`; }
      for (const x of [30, 33, 67, 70]) s += `<path d="M${x} 60V66" stroke="${f}" stroke-width=".5" stroke-dasharray=".8 .5"/><path d="M${x} 66l-1 1.6h2z" fill="${f}"/>`;
      return s + `<circle cx="50" cy="24" r="2.6" fill="${f}" stroke="${d}" stroke-width=".4"/><g transform="rotate(-14 50 22)"><path d="M48.8 22V8.6H51.2V22zM45 12H55V14.4H45z" fill="${f}" stroke="${d}" stroke-width=".35"/></g>`;
    },
    riyadh: (f, d, l) => { // пальма и скрещённые сабли
      let s = '';
      const sword = `<path d="M30 63Q52 60 74 43Q58 61 32 66z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M33 64.6Q52 61 72 45" stroke="${l}" stroke-width=".35" fill="none"/><path d="M30.4 60.4L32.6 67.6" stroke="${f}" stroke-width="1.8"/><path d="M28 65L24.6 66.4" stroke="${f}" stroke-width="1.6" stroke-linecap="round"/>`;
      s += sword + mirrorX(sword);
      s += `<path d="M48.6 58Q49 44 49.4 28H50.6Q51 44 51.4 58z" fill="${f}" stroke="${d}" stroke-width=".4"/>` + [32, 37, 42, 47, 52].map(y => `<path d="M48.8 ${y}l2.4 1.6" stroke="${d}" stroke-width=".35"/>`).join('');
      for (const a of [-172, -146, -120, -96, -74, -50, -24, -4]) s += `<g transform="translate(50 27) rotate(${a})"><path d="M0 0Q10 -4.6 20 2Q10 .6 0 1.4z" fill="${f}" stroke="${d}" stroke-width=".35"/>${[4, 8, 12, 16].map(x => `<path d="M${x} ${-x * .14}l1.4 2.6" stroke="${d}" stroke-width=".25"/>`).join('')}</g>`;
      return s + `<circle cx="47" cy="30" r="1.3" fill="${f}" stroke="${d}" stroke-width=".3"/><circle cx="53" cy="30" r="1.3" fill="${f}" stroke="${d}" stroke-width=".3"/>`;
    },
    krakow: (f, d, l) => { // труба хейнала со стягом и стрела, оборвавшая сигнал
      let s = `<g transform="translate(24 22) rotate(32)"><path d="M0 -1.1H40V1.1H0z" fill="${f}" stroke="${d}" stroke-width=".35"/><path d="M40 -1.2L53 -7.6Q54.4 0 53 7.6L40 1.2z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M53 -7.6Q54.4 0 53 7.6" stroke="${l}" stroke-width=".5" fill="none"/><path d="M-3 -1.8H0V1.8H-3z" fill="${f}"/>` +
        `<path d="M10 1.2H32V15L28 12.4L24 15L20 12.4L16 15L12 12.4L10 15z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M17 4L20 2.6L23 4L25 3L24 7L21 9L18 7L16 6z" fill="${d}" opacity=".6"/><path d="M13 3.4H29" stroke="${d}" stroke-width=".3"/></g>`;
      s += `<path d="M74 20L36 60" stroke="${f}" stroke-width="1"/><path d="M36 60L37.4 54.4L41.6 58.6z" fill="${f}" stroke="${d}" stroke-width=".3"/><path d="M74 20L78 14L76.6 21.4zM72 22L76 16L74.6 23.4z" fill="${f}" stroke="${d}" stroke-width=".3"/>`;
      return s;
    },
    tokyo: (f, d, l) => { // ветка сакуры: пятилепестковые цветки с надрезом, тычинки, бутон
      const fl = (cx, cy, R, rot) => { let p = ''; for (let k = 0; k < 5; k++) p += `<g transform="translate(${cx} ${cy}) rotate(${rot + k * 72})"><path d="M0 0C-${n2(R * .5)} -${n2(R * .35)} -${n2(R * .55)} -${n2(R * .9)} -${n2(R * .2)} -${R}L0 -${n2(R * .84)}L${n2(R * .2)} -${R}C${n2(R * .55)} -${n2(R * .9)} ${n2(R * .5)} -${n2(R * .35)} 0 0z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M0 -2V-${n2(R * .55)}" stroke="${d}" stroke-width=".3"/><circle cx="0" cy="-${n2(R * .5)}" r=".7" fill="${d}"/></g>`;
        return p + `<circle cx="${cx}" cy="${cy}" r="${n2(R * .16)}" fill="${l}" stroke="${d}" stroke-width=".3"/>`; };
      return `<path d="M14 62Q34 56 48 40Q62 26 86 24M62 30Q70 36 74 44" stroke="${f}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14 62Q34 56 48 40" stroke="${d}" stroke-width=".4" fill="none"/>` +
        fl(44, 36, 17, 8) + fl(74, 46, 8, -20) + fl(78, 20, 7, 30) + `<ellipse cx="22" cy="56" rx="2.6" ry="3.6" transform="rotate(-40 22 56)" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
    },
    seoul: (f, d, l) => { // тхэгык и четыре триграммы
      const cx = 50, cy = 37, R = 15; let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${d}" opacity=".75"/><path d="M${cx - R} ${cy}A${R} ${R} 0 0 1 ${cx + R} ${cy}A${R / 2} ${R / 2} 0 0 1 ${cx} ${cy}A${R / 2} ${R / 2} 0 0 0 ${cx - R} ${cy}z" fill="${f}"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${f}" stroke-width="1.2"/>`;
      const tri = (ang, bars) => { let t = ''; bars.forEach((b, i) => { const y = (i - 1) * 3.2; t += b ? `<rect x="-6" y="${y - .9}" width="12" height="1.8" fill="${f}"/>` : `<rect x="-6" y="${y - .9}" width="5.2" height="1.8" fill="${f}"/><rect x=".8" y="${y - .9}" width="5.2" height="1.8" fill="${f}"/>`; });
        return `<g transform="translate(${polar(cx, cy, 25, ang * Math.PI / 180).replace(' ', ' ')}) rotate(${ang + 90})">${t}</g>`; };
      return s + tri(-135, [1, 1, 1]) + tri(-45, [0, 1, 0]) + tri(135, [1, 0, 1]) + tri(45, [0, 0, 0]);
    },
    toronto: (f, d, l) => { // кленовый лист
      return `<path d="M50 10L54 21L58.4 19L56.4 34L64.6 25.6L66.6 30L74.6 28L72.4 36L77 38L64.6 46.6L66.4 50.6L52.2 48.4L52.6 60H47.4L47.8 48.4L33.6 50.6L35.4 46.6L23 38L27.6 36L25.4 28L33.4 30L35.4 25.6L43.6 34L41.6 19L46 21z" fill="${f}" stroke="${d}" stroke-width=".6"/>` +
        `<path d="M50 14V56M50 42L36 30M50 42L64 30M50 48L32 42M50 48L68 42" stroke="${d}" stroke-width=".4" fill="none"/>${shadeR(d, 'M50 10L54 21L58.4 19L56.4 34L64.6 25.6L66.6 30L74.6 28L72.4 36L77 38L64.6 46.6L66.4 50.6L52.2 48.4L52.6 60H50z', .2)}<path d="M26 66H74" stroke="${f}" stroke-width="1"/>`;
    },
    mumbai: (f, d, l) => { // лотос: три ряда лепестков над водой
      const pet = (a, h, w) => `<g transform="translate(50 56) rotate(${a})"><path d="M0 0Q-${w} -${n2(h * .5)} 0 -${h}Q${w} -${n2(h * .5)} 0 0z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M0 -2V-${n2(h * .85)}" stroke="${d}" stroke-width=".3"/><path d="M-${n2(w * .35)} -${n2(h * .3)}Q-${n2(w * .5)} -${n2(h * .55)} -1 -${n2(h * .8)}" stroke="${l}" stroke-width=".35" fill="none" opacity=".7"/></g>`;
      return [-82, 82].map(a => pet(a, 18, 6)).join('') + [-56, -28, 28, 56].map(a => pet(a, 25, 7.6)).join('') + [-14, 14].map(a => pet(a, 28, 8)).join('') + pet(0, 34, 9) +
        `<path d="M24 60Q37 56 50 60T76 60M28 64Q39 61 50 64T72 64" stroke="${f}" stroke-width=".9" fill="none"/>`;
    },
    lisbon: (f, d, l) => { // каравелла с крестами Ордена Христа на парусах
      const cross = (x, y, r) => `<path d="M${x - r * .35} ${y - r}H${x + r * .35}L${x + r * .2} ${y - r * .2}L${x + r} ${y - r * .35}V${y + r * .35}L${x + r * .2} ${y + r * .2}L${x + r * .35} ${y + r}H${x - r * .35}L${x - r * .2} ${y + r * .2}L${x - r} ${y + r * .35}V${y - r * .35}L${x - r * .2} ${y - r * .2}z" fill="${d}"/>`;
      let s = `<path d="M22 46H78L72 57Q50 60 28 57z" fill="${f}" stroke="${d}" stroke-width=".55"/><path d="M22 46L20 40H32V46M78 46L80 41H70V46" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M26 51H74" stroke="${d}" stroke-width=".35"/>` + [32, 40, 48, 56, 64].map(x => `<rect x="${x}" y="48" width="2" height="1.6" fill="${d}"/>`).join('');
      for (const [x, t, w] of [[40, 10, 9], [60, 16, 7]]) s += `<path d="M${x} 46V${t}" stroke="${f}" stroke-width="1"/><path d="M${x - w} ${t + 4}Q${x} ${t + 2} ${x + w} ${t + 4}Q${x + w + 1.6} ${t + 15} ${x + w} ${t + 25}Q${x} ${t + 23} ${x - w} ${t + 25}Q${x - w + 1.6} ${t + 15} ${x - w} ${t + 4}z" fill="${f}" stroke="${d}" stroke-width=".45"/>` + cross(x, t + 14, w * .55) + `<path d="M${x} ${t}L${x + 7} ${t + 1.6}L${x} ${t + 3}z" fill="${l}"/>`;
      return s + `<path d="M18 61Q26 58 34 61T50 61T66 61T82 61M24 65Q31 62 38 65T52 65T66 65T78 65" stroke="${f}" stroke-width=".9" fill="none"/>`;
    },
    rio: (f, d, l) => { // Южный Крест: пять звёзд, небесная лента
      let s = `<path d="M18 46Q50 28 82 46" stroke="${f}" stroke-width="5" fill="none" opacity=".55"/><path d="M18 46Q50 28 82 46" stroke="${d}" stroke-width=".4" fill="none" stroke-dasharray="2 1.2"/>`;
      for (const [x, y, R] of [[50, 14, 6], [50, 58, 7.4], [32, 35, 6], [67, 31, 5.2], [59, 45, 3.2]]) s += `<path d="${starP(x, y, R, R * .42)}" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="${starP(x, y, R * .5, R * .2)}" fill="${l}" opacity=".6"/>`;
      return s;
    },
    shanghai: (f, d, l) => { // белая магнолия — цветок города
      const pet = (a, h, w, op) => `<g transform="translate(50 56) rotate(${a})"><path d="M0 0Q-${w} -${n2(h * .55)} -${n2(w * .3)} -${h}Q0 -${n2(h * 1.04)} ${n2(w * .3)} -${h}Q${w} -${n2(h * .55)} 0 0z" fill="${f}" stroke="${d}" stroke-width=".5"/>${op ? `<path d="M0 0Q${w} -${n2(h * .55)} ${n2(w * .3)} -${h}Q0 -${n2(h * .5)} 0 0z" fill="${d}" opacity=".22"/>` : ''}<path d="M-${n2(w * .4)} -${n2(h * .3)}Q-${n2(w * .55)} -${n2(h * .6)} -${n2(w * .2)} -${n2(h * .9)}" stroke="${l}" stroke-width=".4" fill="none" opacity=".7"/></g>`;
      return `<path d="M50 56Q48 62 40 66M44 63Q34 60 30 64" stroke="${f}" stroke-width="1.6" fill="none"/><ellipse cx="30" cy="62" rx="2" ry="3.4" transform="rotate(50 30 62)" fill="${f}" stroke="${d}" stroke-width=".4"/>` +
        pet(-34, 30, 9, 1) + pet(34, 30, 9, 1) + pet(0, 40, 10, 1) + pet(-14, 28, 11, 0) + pet(14, 28, 11, 1);
    }
  };

  // ---------------------------------------------------------------- v128.3: новые города СНГ — здания и животные
  Object.assign(LN, {
    minsk: (f, d, l) => { // Национальная библиотека — гранёный «алмаз» на стилобате
      let s = `<path d="M22 66V58H78V66z" fill="${f}"/>${shadeR(d, 'M50 58H78V66H50z', .25)}` + [26, 34, 42, 54, 62, 70].map(x => sqWin(x, 60.4, 4, 3.4, d)).join('');
      const P = { t: [50, 10], tl: [38, 15], tr: [62, 15], ml: [29, 27], mr: [71, 27], ll: [29, 43], lr: [71, 43], bl: [38, 55], br: [62, 55], b: [50, 58], c1: [43, 24], c2: [57, 24], c3: [43, 46], c4: [57, 46] };
      const poly = (ks, op) => `<path d="M${ks.map(k => P[k].join(' ')).join('L')}z" fill="${f}" stroke="${d}" stroke-width=".45"/>` + (op ? `<path d="M${ks.map(k => P[k].join(' ')).join('L')}z" fill="${d}" opacity="${op}"/>` : '');
      s += poly(['tl', 't', 'tr', 'c2', 'c1']) + poly(['tl', 'c1', 'ml'], .15) + poly(['tr', 'mr', 'c2'], .35) + poly(['ml', 'c1', 'c3', 'll'], .2) + poly(['c1', 'c2', 'c4', 'c3']) + poly(['c2', 'mr', 'lr', 'c4'], .4) + poly(['ll', 'c3', 'bl'], .25) + poly(['c4', 'lr', 'br'], .45) + poly(['c3', 'c4', 'br', 'b', 'bl'], .3);
      for (let y = 26; y < 45; y += 2.6) s += `<path d="M44 ${y}H56" stroke="${l}" stroke-width=".35" opacity=".8"/>`;
      for (let y = 30; y < 43; y += 3) s += `<path d="M59 ${y}L69 ${y + 1}" stroke="${l}" stroke-width=".3" opacity=".5"/>`;
      return s + `<path d="M48 10V6M50 10V4M52 10V6" stroke="${f}" stroke-width=".5"/>` + ground(f, l);
    },
    tbilisi: (f, d, l) => { // собор Цминда Самеба: конический барабан с куполом, апсиды, колокольня
      let s = `<path d="M24 66V46H76V66z" fill="${f}"/>${shadeR(d, 'M50 46H76V66H50z', .22)}` + [27, 33, 39, 57, 63, 69].map(x => arcWin(x, 52, 3, 9, d, l)).join('');
      s += `<path d="M24 46L30 40H70L76 46z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M38 40V30H62V40z" fill="${f}"/>${shadeR(d, 'M50 30H62V40H50z', .25)}` + [40, 46, 52, 58].map(x => arcWin(x, 32, 2.4, 6, d, l)).join('');
      s += `<path d="M38 30L42 26H58L62 30z" fill="${f}" stroke="${d}" stroke-width=".35"/><path d="M43 26V16H57V26z" fill="${f}"/>${shadeR(d, 'M50 16H57V26H50z', .25)}` + [44.6, 48.6, 52.6].map(x => arcWin(x, 18, 2, 6, d, l)).join('');
      s += `<path d="M42 16Q42 8 50 6Q58 8 58 16z" fill="${f}" stroke="${d}" stroke-width=".4"/>${shadeR(d, 'M50 6Q58 8 58 16H50z', .3)}<path d="M50 6V1.6M48.4 3.4H51.6" stroke="${f}" stroke-width=".7"/>`;
      s += `<path d="M44 66V58Q44 54 50 54Q56 54 56 58V66z" fill="${d}"/><path d="M78 66V40H84V66z" fill="${f}"/><path d="M78 40L81 33L84 40z" fill="${f}"/>` + arcWin(79.6, 44, 2.8, 7, d, l);
      return s + ground(f, l);
    },
    yerevan: (f, d, l) => { // Каскад на фоне двуглавого Арарата
      let s = `<path d="M8 50L30 22L40 32L46 28L58 44L64 38L80 50z" fill="${f}" opacity=".55"/><path d="M24 30L30 22L36 28L32 27L29 30L27 28z M42 30L46 28L50 33L47 32L45 34z" fill="${l}"/>`;
      for (let i = 0; i < 6; i++) { const y = 66 - i * 4.4, w = 30 - i * 3.4; s += `<path d="M${n2(50 - w)} ${y}V${n2(y - 4.4)}H${n2(50 + w)}V${y}z" fill="${f}" stroke="${d}" stroke-width=".35"/>${shadeR(d, `M50 ${y}V${n2(y - 4.4)}H${n2(50 + w)}V${y}z`, .2)}` + [-1, 1].map(k => `<path d="M${n2(50 + k * (w - 4))} ${n2(y - 3.4)}h${k * 2.6}v2.4h${-k * 2.6}z" fill="${d}"/>`).join(''); }
      s += `<path d="M47 66V40H53V66" fill="${d}" opacity=".5"/>` + Array.from({ length: 11 }, (_, i) => `<path d="M47 ${n2(64 - i * 2.4)}H53" stroke="${l}" stroke-width=".3"/>`).join('');
      return s + `<path d="M46 39.6V30H54V39.6z" fill="${f}" stroke="${d}" stroke-width=".35"/><path d="M50 30V22M48 24H52" stroke="${f}" stroke-width=".6"/>` + ground(f, l);
    },
    bishkek: (f, d, l) => { // юрта на фоне снежного хребта Ала-Тоо
      let s = `<path d="M8 46L22 26L30 34L42 18L54 32L62 24L78 40L92 46z" fill="${f}" opacity=".5"/><path d="M18 31L22 26L26 30L23 29zM38 23L42 18L47 24L43 22.6zM58 28L62 24L66 28L62 27z" fill="${l}"/>`;
      s += `<path d="M24 66V48Q24 44 28 43L50 34L72 43Q76 44 76 48V66z" fill="${f}" stroke="${d}" stroke-width=".5"/>${shadeR(d, 'M50 34L72 43Q76 44 76 48V66H50z', .2)}<path d="M50 34L28 43M50 34L72 43" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M24 49Q50 45 76 49" stroke="${d}" stroke-width="2.2" fill="none"/><path d="M24 49Q50 45 76 49" stroke="${l}" stroke-width=".5" stroke-dasharray="1.6 1.4" fill="none"/>`;
      for (let k = -4; k <= 4; k++) s += `<path d="M${50 + k * 5} 36.6L${50 + k * 6.2} 46" stroke="${d}" stroke-width=".3"/>`;
      s += `<path d="M44 66V54Q44 51 50 51Q56 51 56 54V66z" fill="${d}"/><path d="M46 56H54M46 60H54" stroke="${l}" stroke-width=".35" opacity=".6"/><circle cx="50" cy="34.4" r="2.2" fill="${f}" stroke="${d}" stroke-width=".35"/>`;
      return s + `<path d="M28 58q3 -3 6 0t6 0M60 58q3 -3 6 0t6 0" stroke="${d}" stroke-width=".4" fill="none"/>` + ground(f, l);
    },
    kazan: (f, d, l) => { // мечеть Кул-Шариф: купол-«шапка», четыре высоких минарета с шатрами
      let s = `<path d="M30 66V44H70V66z" fill="${f}"/>${shadeR(d, 'M50 44H70V66H50z', .22)}` + [33, 39, 45, 51, 57, 63].map(x => arcWin(x, 50, 3.2, 10, d, l)).join('');
      s += `<path d="M38 44V36H62V44z" fill="${f}"/>` + [40, 45, 50, 55].map(x => arcWin(x, 37.4, 2.6, 5, d, l)).join('');
      s += `<path d="M36 36Q36 20 50 16Q64 20 64 36z" fill="${f}" stroke="${d}" stroke-width=".45"/>${shadeR(d, 'M50 16Q64 20 64 36H50z', .3)}` + [40, 45, 50, 55, 60].map(x => `<path d="M${x} 36Q${x + (x - 50) * .1} 25 50 16.4" stroke="${d}" stroke-width=".3" fill="none"/>`).join('') + `<path d="M37 31Q50 28 63 31" stroke="${l}" stroke-width=".5" fill="none"/>`;
      s += `<path d="M50 16V9" stroke="${f}" stroke-width=".7"/><path d="M51.4 6.6A2.2 2.2 0 1 1 49.2 9.6A1.6 1.6 0 1 0 51.4 6.6z" fill="${f}"/>`;
      for (const x of [22, 30, 70, 78]) { const t = x === 22 || x === 78 ? 18 : 12; s += `<path d="M${x - 2} 66V${t + 6}H${x + 2}V66z" fill="${f}" stroke="${d}" stroke-width=".3"/><path d="M${x - 2.8} ${t + 6}H${x + 2.8}M${x - 2.6} ${t + 22}H${x + 2.6}M${x - 2.6} ${t + 36}H${x + 2.6}" stroke="${f}" stroke-width="1.2"/><path d="M${x - 2.4} ${t + 6}L${x} ${t - 2}L${x + 2.4} ${t + 6}z" fill="${f}" stroke="${d}" stroke-width=".3"/><path d="M${x} ${t - 2}V${t - 5}" stroke="${f}" stroke-width=".5"/>`; }
      return s + ground(f, l);
    }
  });
  Object.assign(AN, {
    minsk: (f, d, l) => { // зубр: мощный горб, борода, короткие рога
      let s = `<path d="M24 50Q22 40 30 34Q40 26 52 30Q58 22 66 26Q72 30 74 38L78 46Q78 50 74 50L70 48L68 56L70 66H65L62 54Q54 56 44 54L40 66H35L34 54Q28 56 24 50z" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      s += `<path d="M24 50Q20 52 20 58" stroke="${f}" stroke-width="1.4" fill="none"/><path d="M20 58l-1 3 2-1 1 2" stroke="${f}" stroke-width=".8" fill="none"/>`;
      s += `<path d="M66 26Q64 20 68 18Q67 22 70 25zM72 30Q78 26 80 30Q76 30 74 33z" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M70 48Q68 54 66 56Q72 54 74 50" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += fur(46, 30, 14, 3.4, 1.6, d) + fur(58, 34, 10, 3, 1.4, d) + `<circle cx="72" cy="36" r=".9" fill="${d}"/><path d="M77 44l1.6 .6" stroke="${d}" stroke-width=".5"/>`;
      return s + `<path d="M34 54L36 66M62 54L64 66" stroke="${d}" stroke-width=".3"/>`;
    },
    tbilisi: (f, d, l) => { // фазан из легенды об основании города: длинный хвост, хохолок
      let s = `<path d="M44 46Q30 52 10 64Q28 58 44 52Q30 58 16 66Q32 62 46 54z" fill="${f}" stroke="${d}" stroke-width=".45"/>`;
      for (let i = 0; i < 6; i++) s += `<path d="M${40 - i * 4.6} ${49 + i * 2.4}l1 2.6" stroke="${d}" stroke-width=".35"/>`;
      s += `<path d="M44 52Q42 40 50 34Q56 30 60 32Q64 26 62 20Q66 18 68 22Q70 28 66 36Q66 46 58 52Q52 56 44 52z" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      s += `<path d="M48 44Q54 38 60 42Q56 48 48 48z" fill="${d}" opacity=".35"/>` + [0, 1, 2].map(i => `<path d="M${50 + i * 3} ${42 - i}q1.4 1.6 2.8 0" stroke="${d}" stroke-width=".35" fill="none"/>`).join('');
      s += `<path d="M62 20Q64 14 60 12M64 19Q68 14 66 11" stroke="${f}" stroke-width=".7" fill="none"/><path d="M68 22L72 23L68 24.6z" fill="${f}"/><circle cx="65.4" cy="22.6" r="1.6" fill="${d}" opacity=".5"/><circle cx="65.6" cy="22.4" r=".6" fill="${l}"/>`;
      return s + `<path d="M52 54L50 64M56 53L57 64M48 64H53M54 64H59" stroke="${f}" stroke-width=".8"/>`;
    },
    yerevan: (f, d, l) => { // сидящий коронованный лев со скипетром (герб Еревана)
      let s = `<path d="M38 66Q34 56 38 46Q36 36 42 30Q46 22 54 24Q62 26 62 34Q66 40 64 50L66 66H58L58 56Q52 58 48 56L48 66z" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      s += `<path d="M42 30Q38 24 42 20Q44 16 50 17Q56 16 60 22Q64 28 62 34Q58 32 54 34Q48 32 42 30z" fill="${f}" stroke="${d}" stroke-width=".45"/>` + fur(50, 22, 10, 3, 1.4, d);
      s += `<circle cx="56" cy="27" r=".8" fill="${d}"/><path d="M58 30Q60 31 61 30" stroke="${d}" stroke-width=".4" fill="none"/><path d="M45 17L44 11L47 14L50 9L53 14L56 11L55 17z" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      s += `<path d="M38 60Q28 60 26 52Q24 46 28 44Q27 50 32 54Q36 56 38 56" stroke="${f}" stroke-width="1.6" fill="none"/><path d="M28 44l-2 -2.4 1 3.2" fill="${f}"/>`;
      s += `<path d="M62 44L72 20" stroke="${f}" stroke-width="1.2"/><circle cx="72.6" cy="18.6" r="2" fill="${f}" stroke="${d}" stroke-width=".4"/><path d="M60 42Q64 40 66 44Q63 46 60 45z" fill="${f}" stroke="${d}" stroke-width=".4"/>`;
      return s;
    },
    bishkek: (f, d, l) => { // архар (баран Марко Поло): огромные закрученные рога
      let s = `<path d="M26 48Q24 38 34 36Q46 34 58 36Q64 30 70 32L76 40Q76 44 72 44L68 44Q66 50 64 52L66 66H61L58 54Q48 56 38 54L36 66H31L32 52Q26 52 26 48z" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      s += `<path d="M66 32Q62 18 52 20Q44 22 46 30Q48 36 54 34Q58 32 56 28Q54 26 52 28" stroke="${f}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M66 32Q62 18 52 20Q44 22 46 30Q48 36 54 34Q58 32 56 28" stroke="${d}" stroke-width=".4" fill="none" stroke-dasharray=".6 1.2"/>`;
      s += `<circle cx="70" cy="36" r=".9" fill="${d}"/><path d="M74 42l2 .4" stroke="${d}" stroke-width=".5"/><path d="M40 36Q48 40 58 37" stroke="${l}" stroke-width=".45" fill="none" opacity=".7"/><path d="M26 46Q22 46 22 50" stroke="${f}" stroke-width="1.2" fill="none"/>`;
      return s + `<path d="M32 52L31 66M38 54L36 66" stroke="${d}" stroke-width=".3"/>`;
    },
    kazan: (f, d, l) => { // Зилант: коронованный крылатый змей с закрученным хвостом
      let s = `<path d="M40 50Q30 52 26 60Q24 66 32 66Q38 66 36 60Q34 56 40 56" stroke="${f}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 66L28 68L31 63" fill="${f}"/>`;
      s += `<path d="M40 56Q38 46 46 40Q52 36 56 30Q58 24 62 22Q68 22 70 26L72 30L66 30Q62 32 62 38Q62 48 54 54Q48 58 40 56z" fill="${f}" stroke="${d}" stroke-width=".5"/>`;
      s += `<path d="M50 40Q40 24 26 22Q32 28 30 32Q36 30 38 36Q42 34 46 42z" fill="${f}" stroke="${d}" stroke-width=".45"/><path d="M48 39Q38 28 28 24M47 41Q40 32 32 31M46 42Q42 36 38 36" stroke="${d}" stroke-width=".3" fill="none"/>`;
      s += `<path d="M48 54L46 62M46 62l-2 1M46 62l1 1.6M56 50L58 60M58 60l-2 1M58 60l1.6 1" stroke="${f}" stroke-width="1" fill="none"/>`;
      s += `<path d="M60 22L59 16L62 19L64 14L66 19L69 16L68 22z" fill="${f}" stroke="${d}" stroke-width=".35"/><circle cx="66" cy="25" r=".8" fill="${d}"/><path d="M72 30L76 31.4L73 32" stroke="${f}" stroke-width=".5" fill="none"/>`;
      return s + [0, 1, 2, 3].map(i => `<path d="M${46 + i * 3} ${50 - i * 3}q1.6 1.4 3 0" stroke="${d}" stroke-width=".3" fill="none"/>`).join('');
    }
  });

  // ---------------------------------------------------------------- v128.3: народные узоры (фон монеты и кольцо наклейки), у каждого города свой
  // c(i) — цвет i (Paper — свои краски, иначе материал), x0,y0,w,h — область
  const FOLK = {
    khokhloma: (c, x0, y0, w, h) => { // хохлома: золотые завитки-травка, красные ягоды, листья на чёрном
      let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c(2)}"/>`;
      for (let y = y0 + 6, r = 0; y < y0 + h + 6; y += 13, r++) { let p = `M${x0 - 4} ${y}`; for (let x = x0 - 4; x < x0 + w + 8; x += 8) p += `Q${x + 4} ${y + ((x / 8 + r) % 2 ? -5 : 5)} ${x + 8} ${y}`;
        s += `<path d="${p}" stroke="${c(0)}" stroke-width="1" fill="none"/>`;
        for (let x = x0 - 4, i = 0; x < x0 + w + 8; x += 8, i++) { const cy = y + ((i + r) % 2 ? -3.6 : 3.6), cx = x + 4;
          if ((i + r) % 3 === 0) s += [[0, 0], [2.2, 1.2], [-2, 1.4]].map(([dx, dy]) => `<circle cx="${n2(cx + dx)}" cy="${n2(cy + dy)}" r="1.6" fill="${c(1)}"/><circle cx="${n2(cx + dx - .5)}" cy="${n2(cy + dy - .5)}" r=".45" fill="${c(0)}"/>`).join('');
          else if ((i + r) % 3 === 1) s += `<path d="M${cx} ${cy}q2.6 -3 5 -.6q-2.4 2.6 -5 .6z" fill="${c(3)}"/><path d="M${cx} ${cy}q-2.6 -3 -5 -.6q2.4 2.6 5 .6z" fill="${c(0)}"/>`;
          else s += `<path d="M${cx - 2} ${cy}q2 -3 4 0q-1 2 -2 1" stroke="${c(0)}" stroke-width=".6" fill="none"/>`; } }
      return s;
    },
    gzhel: (c, x0, y0, w, h) => { // гжель: кобальтовые розаны с мазками-лепестками на белом
      let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c(0)}"/>`;
      for (let y = y0 + 6, r = 0; y < y0 + h + 6; y += 12, r++) for (let x = x0 + (r % 2 ? 6 : 0); x < x0 + w + 6; x += 12) {
        for (let k = 0; k < 6; k++) s += `<path d="M${x} ${y}m0 -1.2q-2.4 -3 0 -5q2.4 2 0 5z" transform="rotate(${k * 60} ${x} ${y})" fill="${c(1)}"/>`;
        s += `<circle cx="${x}" cy="${y}" r="1.2" fill="${c(2)}"/>`;
        s += `<path d="M${x + 6} ${y}l1 -1 1 1 -1 1z" fill="${c(2)}"/><circle cx="${x + 6}" cy="${y - 4}" r=".5" fill="${c(1)}"/>`; }
      return s;
    },
    vyshyvanka: (c, x0, y0, w, h) => { // вышиванка: крестиком — ромбы в ромбах, красное и чёрное на льне
      const u = 1.6; let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c(0)}"/>`;
      for (let j = 0; j * u < h; j++) for (let i = 0; i * u < w; i++) { const dx = Math.abs((i % 14) - 7), dy = Math.abs((j % 14) - 7), m = dx + dy;
        const col = m === 6 || m === 3 ? c(1) : m === 0 || (m === 7 && (dx === 0 || dy === 0)) ? c(2) : null; if (!col) continue;
        const x = x0 + i * u, y = y0 + j * u; s += `<path d="M${n2(x + .2)} ${n2(y + .2)}l${u - .4} ${u - .4}M${n2(x + u - .2)} ${n2(y + .2)}l${-(u - .4)} ${u - .4}" stroke="${col}" stroke-width=".55"/>`; }
      return s;
    },
    rushnyk: (c, x0, y0, w, h) => { // белорусский рушник: ступенчатые восьмиконечные звёзды-«ружы» и полосы-зигзаги
      const u = 1.4; let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c(0)}"/>`;
      for (let j = 0; j * u < h; j++) for (let i = 0; i * u < w; i++) { const ti = i % 16, tj = j % 18; let on = false, col = c(1);
        if (tj < 15) { const dx = Math.abs(ti - 8), dy = Math.abs(tj - 7), m = dx + dy; on = (m <= 6 && m !== 3 && !(dx > 4 || dy > 4)) || (dx === 0 && dy <= 7) || (dy === 0 && dx <= 7); if (m <= 1) col = c(2); }
        else on = tj === 16 && (ti % 4 === 0 || ti % 4 === 1) || tj === 15 && ti % 4 === 2 || tj === 17 && ti % 4 === 3;
        if (on) s += `<rect x="${n2(x0 + i * u)}" y="${n2(y0 + j * u)}" width="${u}" height="${u}" fill="${col}"/>`; }
      return s;
    },
    ikat: (c, x0, y0, w, h) => { // узбекский икат: полосы с «размытыми» ступенчатыми ромбами
      let s = ''; const cw = 10;
      for (let k = 0, x = x0; x < x0 + w; x += cw, k++) { s += `<rect x="${x}" y="${y0}" width="${cw}" height="${h}" fill="${c(k % 2 ? 2 : 4)}"/>`;
        for (let y = y0 - 6 + (k % 2) * 7; y < y0 + h + 7; y += 14) { const cx = x + cw / 2, cy = y + 7; let p = '';
          for (let t = 0; t <= 14; t++) { const yy = y + t, ww = (7 - Math.abs(t - 7)) * .72 + ((t % 2) ? .8 : 0); p += (t ? 'L' : 'M') + n2(cx - ww) + ' ' + yy; }
          for (let t = 14; t >= 0; t--) { const yy = y + t, ww = (7 - Math.abs(t - 7)) * .72 + ((t % 2) ? 0 : .8); p += 'L' + n2(cx + ww) + ' ' + yy; }
          s += `<path d="${p}z" fill="${c(k % 3 === 0 ? 0 : 1)}"/><path d="M${cx} ${cy - 3}L${cx + 1.8} ${cy}L${cx} ${cy + 3}L${cx - 1.8} ${cy}z" fill="${c(3)}"/>`; } }
      return s;
    },
    buta: (c, x0, y0, w, h) => { // ковёр с бутами: «огурцы» в шахматном порядке, точки, цветочки
      const B = 'M0 5C-4 5 -5.4 1 -3 -1.4C-1.4 -2.8 1 -3 1.4 -6C3 -4 4.4 -1 3 2C2 4 1 5 0 5z'; let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c(0)}"/>`;
      for (let y = y0 + 6, r = 0; y < y0 + h + 6; y += 11, r++) for (let x = x0 + (r % 2 ? 6 : 0); x < x0 + w + 6; x += 12) {
        s += `<g transform="translate(${x} ${y}) rotate(${r % 2 ? 180 : 0}) scale(1.05)"><path d="${B}" fill="${c(1)}" stroke="${c(3)}" stroke-width=".4"/><path d="${B}" transform="scale(.5) translate(0 1.6)" fill="${c(2)}"/></g>`;
        s += `<g transform="translate(${x + 6} ${y})">${[0, 90, 180, 270].map(a => `<ellipse cx="0" cy="-1.3" rx=".7" ry="1.2" transform="rotate(${a})" fill="${c(3)}"/>`).join('')}<circle r=".5" fill="${c(1)}"/></g>`; }
      return s;
    },
    vine: (c, x0, y0, w, h) => { // грузинская лоза: волнистые побеги, трёхлопастные листья, грозди
      let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c(0)}"/>`;
      for (let y = y0 + 6, r = 0; y < y0 + h + 6; y += 14, r++) { let p = `M${x0 - 6} ${y}`; for (let x = x0 - 6; x < x0 + w + 12; x += 12) p += `Q${x + 6} ${y + ((x / 12 + r) % 2 ? -6 : 6)} ${x + 12} ${y}`;
        s += `<path d="${p}" stroke="${c(1)}" stroke-width="1.1" fill="none"/>`;
        for (let x = x0 - 6, i = 0; x < x0 + w + 12; x += 12, i++) { const cx = x + 6, cy = y + ((i + r) % 2 ? -3 : 3), up = (i + r) % 2 ? -1 : 1;
          if (i % 2) s += [[0, 0], [-1.3, 1], [1.3, 1], [-2.6, 2], [0, 2], [2.6, 2], [-1.3, 3], [1.3, 3], [0, 4]].map(([dx, dy]) => `<circle cx="${n2(cx + dx)}" cy="${n2(cy + up * (dy + 1))}" r=".85" fill="${c(2)}"/>`).join('');
          else s += [[-1.8, 0], [1.8, 0], [0, -1.8]].map(([dx, dy]) => `<circle cx="${n2(cx + dx)}" cy="${n2(cy - up * (dy + 2))}" r="1.9" fill="${c(1)}"/>`).join('') + `<path d="M${cx} ${cy}q1.4 -${up * 1} 2 -${up * 2.6}" stroke="${c(3)}" stroke-width=".4" fill="none"/>`; } }
      return s;
    },
    arevakhach: (c, x0, y0, w, h) => { // армянский знак вечности: розетки из закрученных лучей
      const ros = (x, y, n, R, col) => Array.from({ length: n }, (_, k) => `<path d="M0 0Q${n2(R * .5)} -${n2(R * .2)} ${n2(R * .7)} -${n2(R * .62)}Q${n2(R * .82)} -${R} ${n2(R * .46)} -${R}Q${n2(R * .2)} -${n2(R * .92)} ${n2(R * .34)} -${n2(R * .66)}" transform="translate(${x} ${y}) rotate(${k * 360 / n})" stroke="${col}" stroke-width="${n2(R * .13)}" fill="none" stroke-linecap="round"/>`).join('');
      let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c(1)}"/>`;
      for (let y = y0 + 8, r = 0; y < y0 + h + 9; y += 17, r++) for (let x = x0 + (r % 2 ? 9 : 0); x < x0 + w + 9; x += 18) s += ros(x, y, 8, 6.6, c(0)) + `<circle cx="${x}" cy="${y}" r="1.2" fill="${c(2)}"/>` + ros(x + 9, y, 4, 3, c(2));
      return s;
    },
    koshkar: (c, x0, y0, w, h) => { // киргизский шырдак: «бараньи рога» (кочкор-мүйүз) с белой окантовкой
      const H = 'M0 4V-1Q0 -5 -4 -5Q-7 -5 -7 -2Q-7 .4 -4.6 .4Q-3 .4 -3 -1.2M0 -1Q0 -5 4 -5Q7 -5 7 -2Q7 .4 4.6 .4Q3 .4 3 -1.2';
      let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c(0)}"/>`;
      for (let y = y0 + 7, r = 0; y < y0 + h + 7; y += 12, r++) for (let x = x0 + (r % 2 ? 8 : 0); x < x0 + w + 8; x += 16) {
        const t = `translate(${x} ${y}) rotate(${r % 2 ? 180 : 0})`; s += `<path d="${H}" transform="${t}" stroke="${c(3)}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="${H}" transform="${t}" stroke="${c(1)}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`; }
      return s;
    },
    tatar: (c, x0, y0, w, h) => { // татарский орнамент: тюльпаны на изогнутых стеблях с листьями
      let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${c(0)}"/>`;
      for (let y = y0 + 6, r = 0; y < y0 + h + 8; y += 14, r++) for (let x = x0 + (r % 2 ? 7 : 0); x < x0 + w + 7; x += 14) {
        s += `<path d="M${x} ${y + 6}Q${x - 1.6} ${y + 2} ${x} ${y - 1}" stroke="${c(1)}" stroke-width=".7" fill="none"/><path d="M${x} ${y + 5}q-4 -1 -5 -4q3.4 .6 5 3zM${x} ${y + 3.4}q4 -1 5 -4q-3.4 .6 -5 3z" fill="${c(1)}"/>`;
        s += `<path d="M${x - 2.8} ${y - 1}Q${x - 3.4} ${y - 5} ${x - 1.6} ${y - 6.6}L${x} ${y - 4.4}L${x + 1.6} ${y - 6.6}Q${x + 3.4} ${y - 5} ${x + 2.8} ${y - 1}Q${x} ${y + .6} ${x - 2.8} ${y - 1}z" fill="${c(2)}"/><path d="M${x} ${y - 4.4}V${y - .4}" stroke="${c(3)}" stroke-width=".45"/><circle cx="${x + 7}" cy="${y + 1}" r=".7" fill="${c(3)}"/>`; }
      return s;
    }
  };
  Object.assign(STYLE_FONT, { khokhloma: 'StkPirata', gzhel: 'StkCinzel', vyshyvanka: 'StkRusso', rushnyk: 'StkAnton', ikat: 'StkOleo', buta: 'StkCinzel', vine: 'StkSancreek', arevakhach: 'StkFraktur', koshkar: 'StkRye', tatar: 'StkRighteous' });
  Object.assign(STYLE_COLS, { khokhloma: ['#e8b23a', '#c8261e', '#1d1410', '#6a9a2a'], gzhel: ['#f4f6fb', '#1f4fb0', '#7aa0e0'], vyshyvanka: ['#f4efe4', '#c8261e', '#1d1d1d'], rushnyk: ['#f4f0e6', '#c42a22', '#7a1410'],
    ikat: ['#f2c14e', '#d8263e', '#1ea0d8', '#ffffff', '#3a1f6e'], buta: ['#8a1a24', '#f2c14e', '#1d3f6e', '#f4ead2'], vine: ['#4a1430', '#8fbf4a', '#c88ad8', '#f4ead2'], arevakhach: ['#f2a03a', '#7a1420', '#f2d27a', '#1d3f6e'],
    koshkar: ['#c8202e', '#f2c14e', '#1d1d1d', '#f4ead2'], tatar: ['#1f7a4a', '#f4f0e6', '#d8263e', '#f2c14e'] });
  Object.assign(ENAMEL, { khokhloma: ['#a8241c', '#1d1410'], gzhel: ['#1f4fb0', '#2f6fd0'], vyshyvanka: ['#a8241c', '#2a2a2a'], rushnyk: ['#a8241c', '#2f7a3a'], ikat: ['#1e8ac8', '#6a2a8e'], buta: ['#8a1a24', '#1d3f6e'],
    vine: ['#6a1a40', '#3f7a2a'], arevakhach: ['#c8501e', '#1d3f8e'], koshkar: ['#c8202e', '#d89a1e'], tatar: ['#1f7a4a', '#c8202e'] });

  // флаги стран городов — для стеклянных фонов медалей (x, y в поле 0…100)
  const FLAG_OF = { minsk: 'by', tbilisi: 'ge', yerevan: 'am', bishkek: 'kg', kazan: 'tt', cologne: 'de', berlin: 'de', rio: 'br', paris: 'fr', texas: 'us', copenhagen: 'dk', budapest: 'hu', shanghai: 'cn', riyadh: 'sa', katowice: 'pl', krakow: 'pl', stockholm: 'se', london: 'gb', astana: 'kz', antwerp: 'be', bucharest: 'ro', lisbon: 'pt', sydney: 'au', moscow: 'ru', petersburg: 'ru', kyiv: 'ua', almaty: 'kz', tashkent: 'uz', baku: 'az', warsaw: 'pl', prague: 'cz', belgrade: 'rs', sofia: 'bg',
    beijing: 'cn', chengdu: 'cn', hangzhou: 'cn', tokyo: 'jp', osaka: 'jp', seoul: 'kr', singapore: 'sg', buenosaires: 'ar', madrid: 'es', mumbai: 'in', istanbul: 'tr', toronto: 'ca' };
  const FLAG_PAL = { by: ['#c8262e', '#2f8a3a', '#f4f4f4'], ge: ['#f4f4f4', '#d8262e'], am: ['#d8263e', '#1f3fa8', '#f2a81e'], kg: ['#e0283a', '#f7d117'], tt: ['#1f8a4a', '#f4f4f4', '#d8263e'], de: ['#2a2a2e', '#d8262e', '#f2c200'], br: ['#1f9d55', '#f7d117', '#1f4aa8', '#ffffff'], fr: ['#2350a8', '#f4f4f4', '#e0383e'], us: ['#c8283a', '#f4f4f4', '#24438f'], dk: ['#d0283a', '#f4f4f4'], hu: ['#d0343c', '#f4f4f4', '#3a8a4a'],
    cn: ['#d82a20', '#f7d117'], sa: ['#127a45', '#f4f4f4'], pl: ['#f4f4f4', '#d8263e'], se: ['#1d5fa8', '#f7d117'], gb: ['#22398a', '#f4f4f4', '#d0283a'], kz: ['#14a8c8', '#f7c933'], be: ['#2a2a2e', '#f7d117', '#e0383e'], ro: ['#2350a8', '#f7d117', '#d8263e'], pt: ['#14743a', '#d82a2a', '#f7d117'], au: ['#22398a', '#f4f4f4', '#d0283a'],
    ru: ['#f4f4f4', '#1f4fb0', '#d8263e'], ua: ['#1f5fc8', '#f7d117'], uz: ['#1ea0d8', '#f4f4f4', '#2fae4a', '#d8263e'], az: ['#1ea0d8', '#d8263e', '#2fae4a'], cz: ['#f4f4f4', '#d8263e', '#1d4fa0'], rs: ['#c8283a', '#1f3f8a', '#f4f4f4'],
    bg: ['#f4f4f4', '#14935a', '#d8263e'], jp: ['#f4f4f4', '#d0263a'], kr: ['#f4f4f4', '#d0263a', '#1f4fa8', '#222'], sg: ['#e0283a', '#f4f4f4'], ar: ['#74acdf', '#f4f4f4', '#f6b40e'], es: ['#c8283a', '#f7c31a'],
    in: ['#ff9933', '#f4f4f4', '#138808', '#1f2f8a'], tr: ['#e0283a', '#f4f4f4'], ca: ['#e0283a', '#f4f4f4'] };
  const FLAGS = {
    by: (x, y) => x < 22 ? ((Math.abs(((y * 1.3) % 10) - 5) + Math.abs(x - 11) * .7) < 4 ? FLAG_PAL.by[0] : FLAG_PAL.by[2]) : FLAG_PAL.by[y < 64 ? 0 : 1],
    ge: (x, y) => { const big = Math.abs(x - 50) < 6 || Math.abs(y - 50) < 6, sm = [[28, 28], [72, 28], [28, 72], [72, 72]].some(([a, b]) => (Math.abs(x - a) < 6 && Math.abs(y - b) < 1.8) || (Math.abs(y - b) < 6 && Math.abs(x - a) < 1.8)); return big || sm ? FLAG_PAL.ge[1] : FLAG_PAL.ge[0]; },
    am: (x, y) => FLAG_PAL.am[y < 39 ? 0 : y < 61 ? 1 : 2], tt: (x, y) => FLAG_PAL.tt[y < 46 ? 0 : y < 54 ? 1 : 2],
    kg: (x, y) => { const r = Math.hypot(x - 50, y - 50), a = Math.atan2(y - 50, x - 50); return r < 12 || (r < 22 && Math.cos(a * 40) > .2) ? FLAG_PAL.kg[1] : FLAG_PAL.kg[0]; },
    de: (x, y) => FLAG_PAL.de[y < 39 ? 0 : y < 61 ? 1 : 2], hu: (x, y) => FLAG_PAL.hu[y < 39 ? 0 : y < 61 ? 1 : 2], pl: (x, y) => FLAG_PAL.pl[y < 50 ? 0 : 1],
    fr: (x, y) => FLAG_PAL.fr[x < 39 ? 0 : x < 61 ? 1 : 2], be: (x, y) => FLAG_PAL.be[x < 39 ? 0 : x < 61 ? 1 : 2], ro: (x, y) => FLAG_PAL.ro[x < 39 ? 0 : x < 61 ? 1 : 2], pt: (x, y) => FLAG_PAL.pt[x < 42 ? 0 : 1],
    br: (x, y) => { const dx = x - 50, dy = y - 50; return dx * dx + dy * dy < 140 ? FLAG_PAL.br[2] : Math.abs(dx) / 34 + Math.abs(dy) / 24 < 1 ? FLAG_PAL.br[1] : FLAG_PAL.br[0]; },
    us: (x, y) => x < 48 && y < 48 ? FLAG_PAL.us[2] : FLAG_PAL.us[Math.floor((y - 15) / 5.4) % 2],
    dk: (x, y) => (Math.abs(x - 43) < 5 || Math.abs(y - 50) < 5) ? FLAG_PAL.dk[1] : FLAG_PAL.dk[0], se: (x, y) => (Math.abs(x - 43) < 5 || Math.abs(y - 50) < 5) ? FLAG_PAL.se[1] : FLAG_PAL.se[0],
    gb: (x, y) => (Math.abs(x - 50) < 4 || Math.abs(y - 50) < 4) ? FLAG_PAL.gb[2] : (Math.abs(x - 50) < 7 || Math.abs(y - 50) < 7 || Math.abs((x - 50) - (y - 50)) < 4 || Math.abs((x - 50) + (y - 50)) < 4) ? FLAG_PAL.gb[1] : FLAG_PAL.gb[0],
    cn: (x, y) => { const dx = x - 34, dy = y - 34; return dx * dx + dy * dy < 90 ? FLAG_PAL.cn[1] : FLAG_PAL.cn[0]; },
    sa: (x, y) => Math.abs(y - 62) < 2.6 && x > 28 && x < 72 ? FLAG_PAL.sa[1] : FLAG_PAL.sa[0],
    kz: (x, y) => { const dx = x - 50, dy = y - 44; return dx * dx + dy * dy < 120 ? FLAG_PAL.kz[1] : FLAG_PAL.kz[0]; },
    ru: (x, y) => FLAG_PAL.ru[y < 39 ? 0 : y < 61 ? 1 : 2], ua: (x, y) => FLAG_PAL.ua[y < 50 ? 0 : 1], az: (x, y) => FLAG_PAL.az[y < 39 ? 0 : y < 61 ? 1 : 2], bg: (x, y) => FLAG_PAL.bg[y < 39 ? 0 : y < 61 ? 1 : 2],
    uz: (x, y) => Math.abs(y - 39) < 1.4 || Math.abs(y - 61) < 1.4 ? FLAG_PAL.uz[3] : FLAG_PAL.uz[y < 39 ? 0 : y < 61 ? 1 : 2], rs: (x, y) => FLAG_PAL.rs[y < 39 ? 0 : y < 61 ? 1 : 2],
    cz: (x, y) => x - 15 < (50 - Math.abs(y - 50)) * .9 ? FLAG_PAL.cz[2] : FLAG_PAL.cz[y < 50 ? 0 : 1], es: (x, y) => FLAG_PAL.es[y < 33 || y > 67 ? 0 : 1],
    jp: (x, y) => (x - 50) ** 2 + (y - 50) ** 2 < 200 ? FLAG_PAL.jp[1] : FLAG_PAL.jp[0], kr: (x, y) => { const r = (x - 50) ** 2 + (y - 50) ** 2; return r < 160 ? FLAG_PAL.kr[y < 50 ? 1 : 2] : (Math.abs((x - 50) - (y - 50)) < 4 || Math.abs((x - 50) + (y - 50)) < 4) && r > 500 ? FLAG_PAL.kr[3] : FLAG_PAL.kr[0]; },
    sg: (x, y) => FLAG_PAL.sg[y < 50 ? 0 : 1], ar: (x, y) => (x - 50) ** 2 + (y - 50) ** 2 < 50 ? FLAG_PAL.ar[2] : FLAG_PAL.ar[y < 39 || y > 61 ? 0 : 1],
    in: (x, y) => (x - 50) ** 2 + (y - 50) ** 2 < 40 ? FLAG_PAL.in[3] : FLAG_PAL.in[y < 39 ? 0 : y < 61 ? 1 : 2], tr: (x, y) => { const a = (x - 44) ** 2 + (y - 50) ** 2, b = (x - 48) ** 2 + (y - 50) ** 2; return (a < 150 && b > 100) || (x - 60) ** 2 + (y - 50) ** 2 < 14 ? FLAG_PAL.tr[1] : FLAG_PAL.tr[0]; },
    ca: (x, y) => x < 32 || x > 68 ? FLAG_PAL.ca[0] : (Math.abs(x - 50) < 9 - Math.abs(y - 48) * .4 && y > 36 && y < 62) ? FLAG_PAL.ca[0] : FLAG_PAL.ca[1],
    au: (x, y) => x < 48 && y < 48 ? FLAG_PAL.au[(Math.abs(x - 31) < 3 || Math.abs(y - 31) < 3) ? 2 : (Math.abs(x - 31) < 5.5 || Math.abs(y - 31) < 5.5) ? 1 : 0] : FLAG_PAL.au[0]
  };
  function coin(th, lv, size, opts) {
    lv = Math.max(0, Math.min(3, Number(lv) || 0)); size = size || 64; opts = opts || {};
    const P = 'cn' + (++CUID).toString(36) + '_', defs = [], add = (s) => { const id = P + defs.length; defs.push(s.replace('$ID', id)); return id; };
    const lin = (stops, x1, y1, x2, y2) => 'url(#' + add(`<linearGradient id="$ID" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(q => `<stop offset="${q[0]}" stop-color="${q[1]}"${q[2] != null ? ` stop-opacity="${q[2]}"` : ''}/>`).join('')}</linearGradient>`) + ')';
    const city = String(th.city || 'MAJOR').toUpperCase(), year = String(th.year || ''), st = styleOf(th), h = h32('coin|' + city + year);
    const M = COIN_METAL[lv], holo = lv === 3;
    const font = ['StkCinzel', 'StkRusso', 'StkBebas', 'StkRighteous', 'StkCinzel', 'StkAnton'][h % 6];
    // металл: холодные/тёплые блики по диагонали; у алмаза — радужная фольга
    const rimG = holo ? lin([[0, '#ffd1f0'], [.2, '#c9f2ff'], [.4, '#fff6c9'], [.6, '#d9c9ff'], [.8, '#c9ffe6'], [1, '#ffd1f0']], 0, 0, 1, 1)
      : lin([[0, M[4]], [.18, M[3]], [.42, M[1]], [.6, M[3]], [.78, M[4]], [1, M[2]]], 0, 0, 1, 1);
    const bandG = holo ? lin([[0, '#eef2ff'], [.3, '#c9d4f0'], [.55, '#ffffff'], [.8, '#b8c4e8'], [1, '#e8eeff']], 0, 0, 1, 1)
      : lin([[0, M[3]], [.35, M[2]], [.55, M[4]], [.75, M[2]], [1, M[1]]], .1, 0, .9, 1);
    const emb = add(`<filter id="$ID" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation=".7" result="b"/><feSpecularLighting in="b" surfaceScale="2.4" specularConstant="1" specularExponent="16" lighting-color="#ffffff" result="s"><feDistantLight azimuth="230" elevation="46"/></feSpecularLighting><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feOffset in="SourceAlpha" dx=".5" dy=".7" result="o"/><feComposite in="SourceAlpha" in2="o" operator="out" result="edge"/><feFlood flood-color="#000" flood-opacity=".35"/><feComposite in2="edge" operator="in" result="dk"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="dk"/></feMerge><feComposite in2="s2" operator="arithmetic" k2="1" k3=".75"/></filter>`);
    const sh = add(`<filter id="$ID" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#000" flood-opacity=".5"/></filter>`);
    // эмаль
    const fpE = st === 'emblem' ? (FLAG_PAL[FLAG_OF[landmarkOf(th.city)]] || []).filter(c => c !== '#f4f4f4') : [], ec = fpE.length ? [mix(fpE[0], '#000000', .15), mix(fpE[fpE.length > 1 ? 1 : 0], '#000000', .25)] : ENAMEL[st] || ENAMEL.laurel, e1 = hueRot(ec[edYear(th) % 2], edHue(th) / 3), e2 = mix(e1, '#000000', .45), e0 = holo ? mix(e1, '#ffffff', .45) : mix(e1, '#ffffff', .22);
    const enG = 'url(#' + add(`<radialGradient id="$ID" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="${e0}"/><stop offset=".6" stop-color="${e1}"/><stop offset="1" stop-color="${e2}"/></radialGradient>`) + ')';
    const clip = add(`<clipPath id="$ID"><circle cx="50" cy="50" r="31.5"/></clipPath>`);
    // v128.1: фон медали меняется по выпускам: свой узор → стеклянный флаг страны → мозаика → витраж-роза в цветах флага → другой узор
    const ek = ((edYear(th) - 2026) % 5 + 5) % 5, base4 = h32('cpv|' + city) % 4;
    const pv = ek === 0 ? (st === 'vitrage' ? 4 : base4) : ek === 1 ? 5 : ek === 2 ? 6 : ek === 3 ? 7 : FOLK[st] ? 8 : (base4 + 2) % 4, lc = mix(e1, '#ffffff', .45);
    let pat = '';
    if (pv === 0) { // филигрань: завитки-«огурцы»
      for (let y = 16; y < 86; y += 10) for (let x = 16 + ((y / 10) % 2) * 5; x < 86; x += 10) pat += `<path d="M${x} ${y}c2.6-2.6 6-.6 4.4 2.2c-1 1.6-3.2 1.2-3-.4" fill="none" stroke="${lc}" stroke-width=".55" opacity=".55"/>`;
    } else if (pv === 1) { // сетка-ромбы с точками
      for (let k = -60; k < 160; k += 6) pat += `<path d="M${k} 0L${k + 100} 100M${k} 100L${k + 100} 0" stroke="${lc}" stroke-width=".35" opacity=".45"/>`;
      for (let y = 18; y < 84; y += 6) for (let x = 18 + (y % 12 ? 3 : 0); x < 84; x += 6) pat += `<circle cx="${x}" cy="${y}" r=".45" fill="${lc}" opacity=".55"/>`;
    } else if (pv === 2) { // лучи солнца
      for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; pat += `<path d="M50 50L${n2(50 + Math.cos(a) * 40)} ${n2(50 + Math.sin(a) * 40)}" stroke="${lc}" stroke-width="${k % 2 ? .4 : .9}" opacity=".4"/>`; }
    } else if (pv === 3) { // чешуя / волны
      for (let y = 14; y < 90; y += 4) for (let x = 14 + (y % 8 ? 2.5 : 0); x < 90; x += 5) pat += `<path d="M${x - 2.5} ${y}a2.5 2.5 0 0 1 5 0" fill="none" stroke="${lc}" stroke-width=".4" opacity=".5"/>`;
    } else if (pv === 5 || pv === 6) { // стеклянная мозаика: флаг страны (5) или переливы эмали (6) из треугольных стёкол в свинцовых перемычках
      const fl = FLAGS[FLAG_OF[landmarkOf(th.city)]], P2 = [], step = 6.4, jit = (a, b, k) => ((h32('ms|' + city + a + '|' + b + k) % 1000) / 1000 - .5) * step * .55;
      for (let r = 0; r <= 11; r++) { P2[r] = []; for (let c = 0; c <= 11; c++) { const x = 15 + c * step, y = 15 + r * step; P2[r][c] = [x + (c && c < 11 ? jit(r, c, 'x') : 0), y + (r && r < 11 ? jit(r, c, 'y') : 0)]; } }
      const colAt = (x, y, k) => { let c = pv === 5 && fl ? fl(x, y) : hueRot(e1, ((h32('mh|' + city + k) % 60) - 30)); const v = (h32('ml|' + k + city) % 100) / 100;
        return v < .33 ? mix(c, '#ffffff', .22) : v < .66 ? c : mix(c, '#000000', .22); };
      for (let r = 0; r < 11; r++) for (let c = 0; c < 11; c++) { const a = P2[r][c], b = P2[r][c + 1], cc = P2[r + 1][c + 1], dd = P2[r + 1][c], k = r * 11 + c;
        for (const [T, kk] of [[[a, b, cc], k + 'a'], [[a, cc, dd], k + 'b']]) { const mx = (T[0][0] + T[1][0] + T[2][0]) / 3, my = (T[0][1] + T[1][1] + T[2][1]) / 3;
          pat += `<path d="M${T.map(p => n2(p[0]) + ' ' + n2(p[1])).join('L')}z" fill="${colAt(mx, my, kk)}" stroke="#3a4048" stroke-width=".55" stroke-linejoin="round"/>`; } }
      pat += `<circle cx="50" cy="50" r="32" fill="url(#${add(`<linearGradient id="$ID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>`)})"/>`;
    } else if (pv === 8) { // v128.3: народный узор города во весь фон (хохлома, гжель, рушник, икат…)
      const PC = STYLE_COLS[st]; pat = `<g opacity=".92">${FOLK[st](i => PC[i % PC.length], 15, 15, 70, 70)}</g>`;
    } else if (pv === 7) { // витраж-роза в цветах флага города: лепестки, медальоны, свинцовые переплёты
      const fl = FLAGS[FLAG_OF[landmarkOf(th.city)]], pal = fl ? FLAG_PAL[FLAG_OF[landmarkOf(th.city)]] : [e1, mix(e1, '#ffffff', .4), hueRot(e1, 40), hueRot(e1, -40)];
      const n = 10 + edYear(th) % 3 * 2;
      for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, am = (a0 + a1) / 2, P2 = (r, a) => `${n2(50 + Math.cos(a) * r)} ${n2(50 + Math.sin(a) * r)}`;
        pat += `<path d="M50 50L${P2(32, a0)}A32 32 0 0 1 ${P2(32, a1)}z" fill="${mix(pal[k % pal.length], '#ffffff', .12)}" stroke="#3a4048" stroke-width=".7"/>`;
        pat += `<path d="M${P2(12, a0)}Q${P2(24, am - .05)} ${P2(29, am)}Q${P2(24, am + .05)} ${P2(12, a1)}" fill="${mix(pal[(k + 1) % pal.length], '#ffffff', .3)}" stroke="#3a4048" stroke-width=".6"/>`;
        pat += `<circle cx="${n2(50 + Math.cos(am) * 27)}" cy="${n2(50 + Math.sin(am) * 27)}" r="2.2" fill="${pal[(k + 2) % pal.length]}" stroke="#3a4048" stroke-width=".5"/>`; }
      pat += `<circle cx="50" cy="50" r="12" fill="${mix(pal[0], '#ffffff', .2)}" stroke="#3a4048" stroke-width=".7"/><circle cx="50" cy="50" r="6" fill="${pal[1 % pal.length]}" stroke="#3a4048" stroke-width=".6"/>`;
    } else { // витраж: цветные стёкла в свинцовых перемычках
      const G = ['#9fd8ff', '#ffb3d9', '#bff2d9', '#d9c9ff', '#fff2b3', '#7fc8f0', '#f0a0c8'].map(c => hueRot(c, edHue(th) * 1.5)), nr = 3 + edYear(th) % 3;
      for (let r = 0; r < nr + 1; r++) { const r0 = 31.5 - r * (31.5 / (nr + 1)), r1 = r0 - 31.5 / (nr + 1), n = 8 + (nr - r) * (3 + edYear(th) % 3);
        for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2 + r * .3, a1 = (k + 1) / n * Math.PI * 2 + r * .3, P2 = (rr, a) => `${n2(50 + Math.cos(a) * rr)} ${n2(50 + Math.sin(a) * rr)}`;
          pat += `<path d="M${P2(r0, a0)}A${r0} ${r0} 0 0 1 ${P2(r0, a1)}L${P2(Math.max(0, r1), a1)}A${Math.max(0, r1)} ${Math.max(0, r1)} 0 0 0 ${P2(Math.max(0, r1), a0)}z" fill="${G[(k + r * 3 + h) % G.length]}" stroke="#4a5560" stroke-width=".7"/>`; } }
    }
    const enamel = `<g clip-path="url(#${clip})"><circle cx="50" cy="50" r="32" fill="${enG}"/>${pat}<circle cx="50" cy="50" r="32" fill="url(#${add(`<radialGradient id="$ID" cx=".35" cy=".25" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`)})"/></g>`;
    // символ города рельефным металлом
    const lm = st === 'horns' && (edYear(th) % 4) === 1 ? 'skull' : landmarkOf(th.city);
    const lf = holo ? lin([[0, '#ffffff'], [.5, '#d7defa'], [1, '#9aa6cc']], 0, 0, .6, 1) : lin([[0, M[4]], [.45, M[3]], [1, M[1]]], 0, 0, .5, 1), ld = M[1], ll = M[4];
    const skull = `<path d="M50 30C40 30 37 37 38 44C39 50 44 52 45 56L47 66H53L55 56C56 52 61 50 62 44C63 37 60 30 50 30z" fill="${lf}" stroke="${ld}" stroke-width=".6"/><path d="M38 38C30 38 18 34 10 26C16 36 26 42 38 43zM62 38C70 38 82 34 90 26C84 36 74 42 62 43z" fill="${lf}" stroke="${ld}" stroke-width=".6"/><path d="M44 42l3 3-3 2zM56 42l-3 3 3 2z" fill="${ld}"/><path d="M48 58H52M48.5 61H51.5" stroke="${ld}" stroke-width=".7"/>`;
    const ch = (k) => (holo ? ['#1d2340', '#4a5684', '#8c9bcb', '#cfd9f5', '#f4f7ff'] : M.slice(0, 5)).map(x => (parseInt(x.slice(1 + k * 2, 3 + k * 2), 16) / 255).toFixed(3)).join(' ');
    const tone = add(`<filter id="$ID" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="${ch(0)}"/><feFuncG type="table" tableValues="${ch(1)}"/><feFuncB type="table" tableValues="${ch(2)}"/></feComponentTransfer></filter>`);
    // v126: символ — детальная версия (LX), всегда внутри внутреннего круга (клип), с гравировкой, отражением в воде,
    // сиянием за ним и дальним силуэтом города; по краю диска — жемчужный поясок
    const art = lm === 'skull' ? skull : symbolFor(lm, th)(lf, ld, ll, h), skullLm = lm === 'skull';
    const T = skullLm ? 'translate(50 50) scale(.76) translate(-50 -46)' : 'translate(50 51) scale(.74) translate(-50 -38)', gy = 71.7;
    const wm = add(`<filter id="$ID" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>`);
    const hm = add(`<mask id="$ID" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><g filter="url(#${wm})"><g transform="${T}">${art}</g></g></mask>`);
    const hp = add(`<pattern id="$ID" patternUnits="userSpaceOnUse" width="1" height="1" patternTransform="rotate(62)"><path d="M0 .25H1" stroke="#000" stroke-width=".2"/></pattern>`);
    const sym = `<g filter="url(#${tone})"><g transform="${T}">${art}</g><rect x="15" y="15" width="70" height="70" fill="url(#${hp})" mask="url(#${hm})" opacity=".2"/></g>`;
    const glow = `<circle cx="50" cy="${skullLm ? 48 : gy - 15}" r="27" fill="url(#${add(`<radialGradient id="$ID"><stop offset="0" stop-color="#fff" stop-opacity="${holo ? .5 : .38}"/><stop offset=".55" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`)})"/>`;
    const far = skullLm || st === 'vitrage' ? '' : `<g opacity=".3" transform="translate(50 ${gy}) scale(.74 .42) translate(-50 -66)">${L.generic(e2, mix(e2, '#000000', .3), lc, h ^ 0x9e37)}</g>`;
    let ripple = ''; for (let i = 0; i < 6; i++) { const w = 24 - i * 1.6 + ((h >>> i) % 5); ripple += `<path d="M${n2(50 - w)} ${n2(gy + 1.5 + i * 1.65)}H${n2(50 + w)}" stroke="${lc}" stroke-width=".32" opacity="${n2(.55 - i * .06)}" stroke-dasharray="${3 + i} 1.2 ${6 - i * .5} 1.6"/>`; }
    const wg = add(`<linearGradient id="$ID" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${e2}"/><stop offset="1" stop-color="${mix(e2, '#000000', .45)}"/></linearGradient>`);
    const fadeG = add(`<linearGradient id="$ID" gradientUnits="userSpaceOnUse" x1="0" y1="${gy}" x2="0" y2="${gy + 9}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>`);
    const fadeM = add(`<mask id="$ID" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect x="0" y="${gy}" width="100" height="20" fill="url(#${fadeG})"/></mask>`);
    const water = skullLm ? '' : `<rect x="16" y="${gy}" width="68" height="14" fill="url(#${wg})"/>` +
      `<g mask="url(#${fadeM})" opacity=".32"><g transform="translate(0 ${n2(gy * 2 + 1.2)}) scale(1 -1)"><g filter="url(#${tone})"><g transform="${T}">${art}</g></g></g></g>` + ripple;
    const twinkle = [[29, 33, .9], [72, 27, .75], [69, 39, .55], [33, 46, .5]].map(([x, y, r]) => `<path d="M${x} ${n2(y - r * 2)}Q${x} ${y} ${n2(x + r * 2)} ${y}Q${x} ${y} ${x} ${n2(y + r * 2)}Q${x} ${y} ${n2(x - r * 2)} ${y}Q${x} ${y} ${x} ${n2(y - r * 2)}z" fill="#fff" opacity=".75"/>`).join('');
    const beads = Array.from({ length: 64 }, (_, i) => { const a = i / 64 * Math.PI * 2; return `<circle cx="${n2(50 + Math.cos(a) * 32.4)}" cy="${n2(50 + Math.sin(a) * 32.4)}" r=".46"/>`; }).join('');
    const scene = `<g clip-path="url(#${clip})">${glow}${far}${skullLm ? '' : twinkle}${water}<g filter="url(#${emb})">${sym}</g></g>`;
    // надписи по дуге и гравировка обода
    const rT = 39.2, top = add(`<path id="$ID" d="M${50 - rT} 50A${rT} ${rT} 0 0 1 ${50 + rT} 50"/>`), bot = add(`<path id="$ID" d="M${50 - rT} 50A${rT} ${rT} 0 0 0 ${50 + rT} 50"/>`);
    const ink = holo ? '#5a6488' : M[0], hi = holo ? '#ffffff' : M[4], fs = font === 'StkCinzel' ? 8 : 9;
    const arcTxt = (path, t, ls) => `<text font-family="${font},serif" font-size="${fs}" letter-spacing="${ls}" dominant-baseline="central" text-anchor="middle"><textPath href="#${path}" startOffset="50%" fill="${hi}" opacity=".7" dy=".5">${esc(t)}</textPath></text>` +
      `<text font-family="${font},serif" font-size="${fs}" letter-spacing="${ls}" dominant-baseline="central" text-anchor="middle" fill="${ink}"><textPath href="#${path}" startOffset="50%">${esc(t)}</textPath></text>`;
    const cityTxt = (city + ' ' + year).trim(), lsB = cityTxt.length > 12 ? .4 : 1.4;
    const orn = (h >>> 13) % 3; let side = '';
    for (const k of [-1, 1]) {
      const cx = 50 + k * rT, cy = 50;
      side += `<path d="M${cx} ${cy - 2.6}l.8 1.7 1.8.2-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.2z" fill="${ink}"/>`;
      for (const s of [-1, 1]) { const a0 = Math.PI + (k > 0 ? Math.PI : 0) + s * .22;
        for (let i = 0; i < 4; i++) { const a = (k > 0 ? 0 : Math.PI) + s * (.2 + i * .1), x = 50 + Math.cos(a) * rT, y = 50 + Math.sin(a) * rT * 1;
          side += orn === 0 ? `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="1.9" ry=".8" transform="rotate(${n2(a * 180 / Math.PI + 90 + s * 35)} ${n2(x)} ${n2(y)})" fill="${ink}" opacity=".85"/>`
            : orn === 1 ? `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(.9 - i * .12)}" fill="${ink}" opacity=".85"/>`
            : `<path d="M${n2(x - 1.1)} ${n2(y)}h2.2" stroke="${ink}" stroke-width=".7" transform="rotate(${n2(a * 180 / Math.PI)} ${n2(x)} ${n2(y)})"/>`; } void a0; }
    }
    const knurl = Array.from({ length: 90 }, (_, i) => { const a = i / 90 * Math.PI * 2; return `<path d="M${n2(50 + Math.cos(a) * 46.6)} ${n2(50 + Math.sin(a) * 46.6)}L${n2(50 + Math.cos(a) * 48.6)} ${n2(50 + Math.sin(a) * 48.6)}"/>`; }).join('');
    const sparkle = holo ? `<g fill="#fff">${[[30, 24, 1.6], [70, 30, 1.2], [62, 74, 1.4]].map(([x, y, r]) => `<path d="M${x} ${y - r * 2}Q${x} ${y} ${x + r * 2} ${y}Q${x} ${y} ${x} ${y + r * 2}Q${x} ${y} ${x - r * 2} ${y}Q${x} ${y} ${x} ${y - r * 2}z"/>`).join('')}</g>` : '';
    const body = `<g filter="url(#${sh})"><circle cx="50" cy="50" r="48.6" fill="${rimG}"/></g>` +
      `<g fill="none" stroke="${M[1]}" stroke-width=".5" opacity=".6">${knurl}</g>` +
      `<circle cx="50" cy="50" r="46.2" fill="${bandG}" stroke="${M[1]}" stroke-width=".5"/>` +
      `<g filter="url(#${emb})">${arcTxt(top, opts.top || 'CS2 MAJOR', 1.6)}${arcTxt(bot, cityTxt, lsB)}${side}</g>` +
      `<circle cx="50" cy="50" r="33.4" fill="${rimG}" stroke="${M[0]}" stroke-width=".4"/>${enamel}${scene}<circle cx="50" cy="50" r="31.6" fill="none" stroke="${M[0]}" stroke-width=".6" opacity=".7"/>` +
      `<g fill="${holo ? '#ffffff' : M[4]}" stroke="${holo ? '#8a93b8' : M[1]}" stroke-width=".18">${beads}</g>${sparkle}` +
      `<path d="M14 30A40 40 0 0 1 40 10" stroke="#fff" stroke-opacity=".45" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    return `<svg class="v35-coin cs2-coin${holo ? ' holo' : ''}" viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs.join('')}</defs>${body}</svg>`;
  }

  // ---------------------------------------------------------------- осмотр стикера: крупно, наклон за мышью, голограмма и блёстки меняются с углом
  function inspect(svgHtml, title) {
    try {
      const old = document.getElementById('stk-inspect'); if (old) old.remove();
      const o = document.createElement('div'); o.id = 'stk-inspect';
      o.innerHTML = `<div class="stk-insp-card"><div class="stk-insp-t">${esc(title || '')}</div><div class="stk-insp-stage"><div class="stk-insp-tilt">${svgHtml}</div></div><div class="stk-insp-h">Двигайте мышью, чтобы осмотреть · Esc — закрыть</div></div>`;
      document.body.appendChild(o);
      const tilt = o.querySelector('.stk-insp-tilt');
      const move = (e) => { const r = tilt.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        tilt.style.transform = `rotateY(${n2(x * 26)}deg) rotateX(${n2(-y * 26)}deg)`; tilt.style.setProperty('--hx', n2(x * 70) + 'px'); tilt.style.setProperty('--hy', n2(y * 70) + 'px'); tilt.style.setProperty('--ga', n2(.35 + Math.abs(x + y) * .9)); };
      o.addEventListener('mousemove', move);
      const close = () => { o.remove(); document.removeEventListener('keydown', esc2); };
      const esc2 = (e) => { if (e.key === 'Escape') close(); };
      o.addEventListener('click', (e) => { if (e.target === o) close(); }); document.addEventListener('keydown', esc2);
    } catch (e) {}
  }
  function installUi() {
    try {
      if (typeof document === 'undefined' || document.getElementById('cs2-stk-ui')) return;
      const st = document.createElement('style'); st.id = 'cs2-stk-ui';
      // v131: в сетке стикеры статичны — бесконечные анимации голограммы и блика у каждого из десятков сложных SVG
      // (градиенты, маски, размытие) перерисовывали всю страницу каждый кадр и роняли FPS. Голограмма двигается
      // только у стикера под курсором (вслед за мышью) и в окне осмотра; карточки за экраном не рисуются.
      st.textContent = `.v84-stk-svg .stk-holo{transform:translate(var(--hx,0px),var(--hy,0px));transition:transform .12s linear}
@keyframes stkHolo{from{transform:translate(-30px,-18px)}to{transform:translate(30px,18px)}}
.v84-stk-svg .stk-glint{opacity:var(--ga,.6);transition:opacity .15s}
.v84-stk:hover .v84-stk-svg .stk-glint{animation:stkGlint 2.4s steps(3) infinite}
#stk-inspect .stk-glint{animation:none}
.v84-stk-grid>.v84-stk{content-visibility:auto;contain-intrinsic-size:118px 150px;contain:layout paint}
.v84-stk-team{content-visibility:auto;contain-intrinsic-size:auto 420px}
@keyframes stkGlint{0%{opacity:.35}50%{opacity:.85}100%{opacity:.5}}
#stk-inspect{position:fixed;inset:0;z-index:99999;background:radial-gradient(ellipse at 50% 40%,#2a3442,#0b0e13 75%);display:flex;align-items:center;justify-content:center}
#stk-inspect .stk-insp-card{text-align:center;color:#dfe5ee;font-family:Arial,sans-serif}
#stk-inspect .stk-insp-t{font-size:22px;font-weight:700;margin-bottom:14px}
#stk-inspect .stk-insp-stage{perspective:900px;background:linear-gradient(160deg,#a3a9b0,#6c7279);border-radius:14px;padding:28px}
#stk-inspect .stk-insp-tilt{transition:transform .08s linear;transform-style:preserve-3d}
#stk-inspect .stk-insp-tilt svg{width:min(56vh,460px);height:min(56vh,460px);display:block}
#stk-inspect .stk-insp-h{margin-top:12px;font-size:13px;color:#9aa4b2}
.v84-stk .v84-stk-svg{cursor:zoom-in}`;
      (document.head || document.documentElement).appendChild(st);
      // клик по самому стикеру — осмотр (клик по подписи под ним работает как раньше)
      document.addEventListener('click', (e) => {
        const svg = e.target && e.target.closest && e.target.closest('.v84-stk .v84-stk-svg');
        if (!svg) return; e.stopPropagation(); e.preventDefault();
        const cell = svg.closest('.v84-stk'), t = cell ? [cell.querySelector('b')?.textContent, cell.querySelector('small')?.textContent].filter(Boolean).join(' · ') : '';
        inspect(svg.outerHTML, t);
      }, true);
      // наведение: голограмма двигается вслед за мышью
      document.addEventListener('mousemove', (e) => {
        const svg = e.target && e.target.closest && e.target.closest('.v84-stk-svg'); if (!svg || svg.closest('#stk-inspect')) return;
        const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        svg.style.setProperty('--hx', n2(x * 60) + 'px'); svg.style.setProperty('--hy', n2(y * 60) + 'px'); svg.style.setProperty('--ga', n2(.35 + Math.abs(x + y) * .9));
      }, { passive: true });
    } catch (e) {}
  }
  installUi();
  // v125.1: CSS игры (`* {font-family…}`, `body.ui27 * {…}`) перебивает атрибут font-family у SVG-текста —
  // переносим шрифт в style (он сильнее правил без !important); textPath/tspan наследуют шрифт своего <text>
  function fontsInline(svg) {
    return String(svg || '').replace(/<(text|textPath|tspan)\b([^>]*?)(\/?)>/g, (m, tag, attrs, sc) => {
      const f = /\sfont-family="([^"]*)"/.exec(attrs);
      const ff = f ? f[1] : 'inherit';
      let a = f ? attrs.replace(f[0], '') : attrs;
      a = /\sstyle="/.test(a) ? a.replace(/\sstyle="/, ` style="font-family:${ff};`) : a + ` style="font-family:${ff}"`;
      return `<${tag}${a}${sc}>`;
    });
  }
  const inl = fn => function () { ensureFonts(); return fontsInline(fn.apply(this, arguments)); };
  W.CS2StickerArt = { styleOf, MSTYLE, hueRot, folkStyles: () => Object.keys(FOLK), symbolCount: lm => ({ sign: !!SIGN[lm],  alt: (ALT[lm] || []).length, animal: !!AN[lm] }), _raw: (lm, kind) => (kind === 'an' ? AN[lm] : kind === 'ln' ? LN[lm] : kind === 'sg' ? SIGN[lm] : crestOf(AN[lm]))('#d9a73a', '#5a3a10', '#fff6d0', 1), flagPal: lm => FLAG_PAL[FLAG_OF[lm]] || null, animalSvg: (lm, c) => AN[lm] ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80' width='110' height='88'>${AN[lm](c, c, c, 1).replace(/"/g, "'")}</svg>` : '', ensureFonts, eventSticker: inl(eventSticker), teamSticker: inl(teamSticker), autograph: inl(autograph), coin: inl(coin), fontsInline, landmarkOf, inspect, styleOf, SIG, DISPLAY };
})();
