// Статический анализ модулей: node tools/build/analyze.mjs [--md]
//
// • проверяет, что каждый модуль манифеста разбирается (синтаксис);
// • глобальные объявления верхнего уровня и конфликты let/const/class между модулями;
// • какие глобальные функции объявлены в одном модуле и расширены/заменены в других (через window.X = … или CS2.patch);
// • --md: записывает карту в docs/LAYERS.md (что трогает каждую функцию — смотреть перед правкой).
// В игре то же самое видно точнее: CS2.layers() / CS2.chain('имя') в консоли браузера.
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import * as acorn from 'acorn'; import * as walk from 'acorn-walk';
const root = path.resolve(import.meta.dirname, '../..');
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'js/boot/manifest.js'), 'utf8'), ctx);
const order = ctx.window.CS2_MANIFEST.js;
const decl = new Map(), touch = new Map();
const add = (m, n, v) => { if (!m.has(n)) m.set(n, []); m.get(n).push(v); };
let errors = 0, adhoc = 0, patches = 0;
const GLOBAL_OBJ = new Set(['window', 'W', 'w', 'globalThis', 'G', 'root']);
for (const f of order) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true }); } catch (e) { console.log('PARSE', f, e.message); errors++; continue; }
  for (const n of ast.body) {
    if (n.type === 'FunctionDeclaration') add(decl, n.id.name, { f, k: 'function' });
    else if (n.type === 'ClassDeclaration') add(decl, n.id.name, { f, k: 'class' });
    else if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier') add(decl, d.id.name, { f, k: n.kind });
  }
  walk.simple(ast, {
    AssignmentExpression(a) {
      const l = a.left;
      if (l.type === 'MemberExpression' && !l.computed && l.object.type === 'Identifier' && GLOBAL_OBJ.has(l.object.name) && /Function/.test(a.right.type)) { add(touch, l.property.name, { f, how: 'window.X =' }); adhoc++; }
      else if (l.type === 'MemberExpression' && !l.computed && l.object.type === 'Identifier' && GLOBAL_OBJ.has(l.object.name) && a.right.type === 'Identifier') add(touch, l.property.name, { f, how: 'window.X =' });
    },
    CallExpression(c) {
      const cal = c.callee;
      if (cal.type === 'MemberExpression' && cal.object.type === 'Identifier' && cal.object.name === 'CS2' && cal.property.name === 'patch' && c.arguments[0] && c.arguments[0].type === 'Literal') { add(touch, c.arguments[0].value, { f, how: 'CS2.patch' }); patches++; }
    }
  });
}
const lex = [...decl].filter(([, a]) => a.length > 1 && a.some(x => x.k === 'let' || x.k === 'const' || x.k === 'class'));
const owners = new Map([...decl].map(([n, a]) => [n, a[0].f]));
const layered = [...touch].map(([n, a]) => [n, [...new Map(a.filter(x => x.f !== owners.get(n)).map(x => [x.f, x])).values()]])
  .filter(([n, a]) => owners.has(n) && a.length).sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]));
console.log(`модулей ${order.length}, ошибок разбора ${errors}, глобальных объявлений ${decl.size}`);
console.log(`конфликтов let/const/class между модулями: ${lex.length}`); lex.forEach(([n, a]) => console.log('  ', n, a.map(x => x.k + '@' + x.f).join(', ')));
console.log(`функций, расширяемых другими модулями: ${layered.length}; расширений через CS2.patch: ${patches}, ручных window.X = function: ${adhoc}`);
layered.slice(0, 15).forEach(([n, a]) => console.log(`  ${String(a.length).padStart(2)} ${n}`));
if (process.argv.includes('--md')) {
  const md = [`# Карта слоёв`, '', `Создано \`node tools/build/analyze.mjs --md\` — не редактировать вручную. Порядок загрузки — \`js/boot/manifest.js\`.`, '',
    `Каждая строка — глобальная функция, которую расширяют модули кроме объявившего. Перед правкой функции посмотрите, кто стоит над ней:`,
    `верхний слой срабатывает первым. В игре: \`CS2.chain('имя')\` в консоли браузера.`, '',
    `Модулей: ${order.length}. Расширений через \`CS2.patch\`: ${patches}; ручных \`window.X = function\`: ${adhoc} (переводить на CS2.patch при правке модуля).`, '',
    '| Функция | Объявлена | Расширяют (в порядке загрузки) |', '| --- | --- | --- |',
    ...layered.map(([n, a]) => `| \`${n}\` | ${owners.get(n)} | ${a.sort((x, y) => order.indexOf(x.f) - order.indexOf(y.f)).map(x => x.f.replace(/^js\//, '') + (x.how === 'CS2.patch' ? ' ✓' : '')).join(' → ')} |`), ''];
  fs.writeFileSync(path.join(root, 'docs/LAYERS.md'), md.join('\n'));
  console.log('записано docs/LAYERS.md');
}
process.exit(errors || lex.length ? 1 : 0);
