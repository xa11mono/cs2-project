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
// Ядро CS2 (js/core/kernel.js) для тестов, которые запускают отдельные модули в vm-песочнице.
// В браузере window и глобальный объект — одно и то же; в песочнице это обычно разные объекты ({ window: {...}, глобалы }).
// Помощник повторяет браузерную семантику CS2.patch: база — window[имя] или глобал песочницы, после расширения
// глобальная привязка песочницы указывает на новый слой (как привязка function-объявления в браузере).
function attachKernel(sandbox) {
  const win = sandbox.window || sandbox;
  const kctx = vm.createContext({ window: win, document: { currentScript: null }, console: { warn() {}, error() {}, info() {} }, performance: { now: () => Date.now() } });
  vm.runInContext(read('js/core/kernel.js'), kctx, { filename: 'js/core/kernel.js' });
  const K = win.CS2;
  const sync = name => { if (win !== sandbox && Object.prototype.hasOwnProperty.call(sandbox, name)) sandbox[name] = win[name]; };
  sandbox.CS2 = Object.assign(Object.create(K), {
    patch(name, factory, opts) {
      if (win !== sandbox && typeof win[name] !== 'function' && typeof sandbox[name] === 'function') win[name] = sandbox[name];
      const r = K.patch(name, factory, opts); sync(name); return r;
    },
    swap(name, temp, fn) {
      const prevW = win[name], prevG = sandbox[name]; win[name] = temp; if (win !== sandbox && name in sandbox) sandbox[name] = temp;
      try { return fn(); } finally { win[name] = prevW; if (win !== sandbox && name in sandbox) sandbox[name] = prevG; }
    }
  });
  return sandbox;
}
module.exports = { root, read, manifest, pageSources, chooseStart, attachKernel };
