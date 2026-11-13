// Сборка релиза: node tools/build/build.mjs  →  dist/index.html (открывается так же, из файла)
//
// • Каждый модуль манифеста минифицируется esbuild в dist/<тот же путь>. Глобальные имена не переименовываются —
//   модули общаются через них.
// • Модули НЕ склеиваются в один файл: у отдельных <script> своя семантика, которую склейка меняет — объявления
//   функций и let/const всплывают через границы модулей (typeof для ещё не объявленного let бросает ошибку, поздняя
//   функция затирается ранним присваиванием window.X). Поэтому сборка грузит модули так же, по одному, в порядке
//   манифеста, и ведёт себя 1-в-1 как исходники (карта слоёв CS2.layers() тоже работает).
// • Стили склеиваются в один файл (у CSS склейка семантику не меняет), пути url() пересчитываются от dist/.
// • dist/index.html — та же разметка с <base href="../">: картинки, шрифты, данные берутся из исходных папок.
// Опции: --check (проверить, что всё минифицируется и разбирается, без записи).
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import * as esbuild from 'esbuild';
const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'dist');
const CHECK = process.argv.includes('--check');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const ctx = { window: {} }; vm.runInNewContext(read('js/boot/manifest.js'), ctx);
const M = ctx.window.CS2_MANIFEST;
const t0 = Date.now();

// ---------------------------------------------------------------- JS: минификация по модулю
let inBytes = 0, outBytes = 0;
const js = [];
for (const file of M.js) {
  const src = read(file); inBytes += Buffer.byteLength(src);
  let code;
  try { code = (await esbuild.transform(src, { loader: 'js', minify: true, legalComments: 'none', sourcefile: file })).code; }
  catch (e) { console.error('esbuild:', file, e.message); process.exit(1); }
  try { new vm.Script(code, { filename: file }); } catch (e) { console.error('синтаксис после минификации:', file, e.message); process.exit(1); }
  outBytes += Buffer.byteLength(code);
  js.push({ file, code, dist: 'dist/' + file });
}
// ---------------------------------------------------------------- CSS: один файл
let css = '';
for (const file of M.css) {
  const dir = path.dirname(path.join(root, file));
  let src = read(file);
  src = src.replace(/url\(\s*(['"]?)(?!data:|#|https?:|\/)([^'")]+)\1\s*\)/g, (m, q, u) => {
    const abs = path.resolve(dir, u); return `url(${q}${path.relative(out, abs).split(path.sep).join('/')}${q})`;
  });
  src = (await esbuild.transform(src, { loader: 'css', minify: true, sourcefile: file })).code;
  css += `/* ${file} */\n${src}\n`;
}
if (CHECK) { console.log(`check ok: ${M.js.length} модулей, ${M.css.length} стилей`); process.exit(0); }

// ---------------------------------------------------------------- запись
fs.rmSync(out, { recursive: true, force: true });
js.forEach(x => { const p = path.join(root, x.dist); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, x.code); });
fs.writeFileSync(path.join(out, 'game.css'), css);
fs.writeFileSync(path.join(out, 'manifest.js'),
  `/* создано tools/build/build.mjs из js/boot/manifest.js — не редактировать */\n` +
  `window.CS2_MANIFEST=Object.freeze(${JSON.stringify({ build: M.build, css: ['dist/game.css'], js: js.map(x => x.dist), bundled: true })});\n`);
let html = read('index.html');
html = html.replace('<head>', '<head>\n<base href="../">')
  .replace('<script src="js/boot/manifest.js"></script>', '<script src="dist/manifest.js"></script>');
if (!html.includes('dist/manifest.js')) { console.error('index.html: не найден тег js/boot/manifest.js'); process.exit(1); }
fs.writeFileSync(path.join(out, 'index.html'), html);

const kb = n => Math.round(n / 1024) + ' КБ';
console.log(`dist/: ${M.js.length} модулей (${kb(inBytes)} → ${kb(outBytes)}), ${M.css.length} стилей → game.css (${kb(Buffer.byteLength(css))}), ${Date.now() - t0} мс`);
