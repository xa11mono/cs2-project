// Общие помощники тестов. Состав и порядок модулей живут в js/boot/manifest.js, разметка — в index.html.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..', '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
// Манифест как данные: { build, css: [...], js: [...] }
function manifest() {
  const ctx = { window: {} }; vm.runInNewContext(read('js/boot/manifest.js'), ctx);
  return ctx.window.CS2_MANIFEST;
}
// Текст «страницы»: разметка index.html + список подключаемых файлов (порядок сохранён).
// Проверки вида html.includes('js/core/autosave.js') и html.indexOf(a) < html.indexOf(b) работают как раньше.
function pageSources() {
  const m = manifest();
  return read('index.html') + '\n<!-- manifest build ' + m.build + ' -->\n' + m.css.join('\n') + '\n' + m.js.join('\n') + '\n';
}
module.exports = { root, read, manifest, pageSources };
