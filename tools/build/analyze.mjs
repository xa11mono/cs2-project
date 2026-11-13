// Анализ слоёв: порядок загрузки, глобальные объявления, переопределения.
import fs from 'fs'; import path from 'path'; import * as acorn from 'acorn'; import * as walk from 'acorn-walk';
const root = path.resolve(import.meta.dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script[^>]*?(?:data-cs2src|src)="([^"?]+)[^"]*"/g)].map(m => m[1]);
const decl = new Map(); // name -> [{file, kind}]
const assigns = new Map();
const add = (m, n, v) => { if (!m.has(n)) m.set(n, []); m.get(n).push(v); };
let errors = 0;
for (const f of order) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true }); } catch (e) { console.log('PARSE', f, e.message); errors++; continue; }
  for (const n of ast.body) {
    if (n.type === 'FunctionDeclaration') add(decl, n.id.name, { f, k: 'function' });
    else if (n.type === 'ClassDeclaration') add(decl, n.id.name, { f, k: 'class' });
    else if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier') add(decl, d.id.name, { f, k: n.kind });
  }
  walk.simple(ast, { AssignmentExpression(a) {
    const l = a.left; let name = null;
    if (l.type === 'MemberExpression' && !l.computed && l.object.type === 'Identifier' && ['window', 'W', 'w', 'globalThis', 'root', 'G'].includes(l.object.name)) name = l.property.name;
    if (name) add(assigns, name, f);
  } });
}
const lex = [...decl].filter(([n, a]) => a.length > 1 && a.some(x => x.k === 'let' || x.k === 'const' || x.k === 'class'));
console.log('files', order.length, 'parse errors', errors);
console.log('\n# lexical collisions (blocks concatenation):', lex.length); lex.forEach(([n, a]) => console.log(' ', n, a.map(x => x.k + '@' + path.basename(x.f)).join(', ')));
const fdup = [...decl].filter(([n, a]) => a.length > 1 && !lex.find(x => x[0] === n));
console.log('\n# duplicate top-level functions/vars:', fdup.length); fdup.forEach(([n, a]) => console.log(' ', n, a.map(x => x.k + '@' + path.basename(x.f)).join(', ')));
const topNames = new Set(decl.keys());
const patched = [...assigns].filter(([n]) => topNames.has(n)).map(([n, fs_]) => [n, [...new Set(fs_)].filter(f => !decl.get(n).some(d => d.f === f))]).filter(x => x[1].length).sort((a, b) => b[1].length - a[1].length);
console.log('\n# globals declared in one layer and re-assigned via window.X in others:', patched.length);
patched.forEach(([n, f]) => console.log(' ', String(f.length).padStart(2), n, '<-', f.map(x => path.basename(x)).join(', ')));
console.log('\n# total window.X assigned names:', assigns.size, ' top-level decls:', decl.size);
