// Поиск ручных обёрток глобальных функций (кандидаты на CS2.patch): node tools/build/find-wrappers.mjs [--json]
// Обёртка = функция-значение глобала сохраняется (const f = window.X / = X), а затем глобал заменяется (window.X = …, X = …).
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import * as acorn from 'acorn'; import * as walk from 'acorn-walk';
const root = path.resolve(import.meta.dirname, '../..');
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'js/boot/manifest.js'), 'utf8'), ctx);
const G = new Set(['window', 'W', 'w', 'globalThis', 'G', 'root', 'win']);
const out = [];
for (const f of ctx.window.CS2_MANIFEST.js) {
  if (f.startsWith('js/data/') || f === 'js/core/kernel.js') continue;
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  const globalName = n => n && (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && G.has(n.object.name) ? n.property.name : null);
  const caps = [];   // { v, name }
  walk.full(ast, n => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init) { const g = globalName(n.init) || (n.init.type === 'Identifier' && /^[a-z]\w*[A-Z]|^[a-z]{4,}/.test(n.init.name) ? n.init.name : null); if (g) caps.push({ v: n.id.name, name: g }); }
  });
  walk.full(ast, n => {
    if (n.type !== 'AssignmentExpression') return;
    const name = globalName(n.left) || (n.left.type === 'Identifier' ? n.left.name : null);
    if (!name || !caps.some(c => c.name === name)) return;
    out.push({ f, line: n.loc.start.line, name, how: n.left.type === 'Identifier' ? 'bare' : 'window', rhs: n.right.type });
  });
}
if (process.argv.includes('--json')) console.log(JSON.stringify(out));
else { out.forEach(x => console.log(`${x.f}:${x.line}\t${x.name}\t${x.how}\t${x.rhs}`)); console.log(out.length, 'присваиваний,', new Set(out.map(x => x.f + x.name)).size, 'обёрток'); }
