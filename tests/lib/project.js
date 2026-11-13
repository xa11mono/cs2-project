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
// Новая игра спрашивает «с нуля / с историей» (js/core/history-legacy.js). Под нагрузкой окно появляется позже
// фиксированной паузы, и тест продолжал без выбора (другое стартовое состояние). Ждём окно или признак, что выбор
// уже сделан/не нужен (сохранённая игра), и выбираем режим.
async function chooseStart(page, mode = 'history', timeout = 25000) {
  const sel = `#v84-legacy-modal [data-lg="${mode}"]`;
  const st = await page.waitForFunction(s => {
    if (document.querySelector(s)) return 'modal';
    try { const ss = window.seasonState; if (ss && (ss.v84LegacyChoice || ss.v84Legacy || (+ss.currentSeason || 1) > 1 || (+ss.tournamentIndex || 1) > 1)) return 'done'; } catch (e) {}
    return false;
  }, sel, { timeout, polling: 200 }).then(h => h.jsonValue()).catch(() => 'timeout');
  if (st === 'modal') { await page.click(sel); await page.waitForTimeout(400); }
  return st;
}
module.exports = { root, read, manifest, pageSources, chooseStart };
