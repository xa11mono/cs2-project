// Однократная миграция v144: ручные обёртки глобальных функций → CS2.patch.
// node tools/build/codemod-patch.mjs [--write] [файлы…]
// Шаблоны (в одном блоке кода):
//  A) const orig = X | window.X;  …  X = function/стрелка (использует orig)   [+ try { X = … } catch {}]
//  B) const orig = X | window.X;  …  window.X = function/стрелка …
// Условия: orig используется только внутри новой функции (и в проверке typeof); X — не let/const верхнего уровня.
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import * as acorn from 'acorn'; import * as walk from 'acorn-walk';
const root = path.resolve(import.meta.dirname, '../..');
const WRITE = process.argv.includes('--write');
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'js/boot/manifest.js'), 'utf8'), ctx);
const order = ctx.window.CS2_MANIFEST.js;
const ri = process.argv.indexOf('--replace'); const REPLACE = ri > 0 ? JSON.parse(process.argv[ri + 1]) : {};
const argFiles = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--replace');
const G = new Set(['window', 'W', 'w', 'globalThis', 'win']);
// глобальные let/const — их нельзя менять через window.X
const lexical = new Set();
for (const f of order) { try { const a = acorn.parse(fs.readFileSync(path.join(root, f), 'utf8'), { ecmaVersion: 'latest' }); a.body.forEach(n => { if (n.type === 'VariableDeclaration' && n.kind !== 'var') n.declarations.forEach(d => d.id.name && lexical.add(d.id.name)); }); } catch (e) {} }
const gname = n => n && (n.type === 'Identifier' ? n.name : (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && G.has(n.object.name) ? n.property.name : null));
let total = 0;
for (const f of (argFiles.length ? argFiles : order)) {
  if (f.startsWith('js/data/') || /kernel\.js$/.test(f)) continue;
  const file = path.join(root, f); let src = fs.readFileSync(file, 'utf8');
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', ranges: true, locations: true }); } catch (e) { continue; }
  const edits = [];
  const refsOf = (name, scopeNode) => { const r = []; walk.full(scopeNode, n => { if (n.type === 'Identifier' && n.name === name) r.push(n); }); return r; };
  walk.full(ast, blockNode => {
    const body = blockNode.type === 'Program' || blockNode.type === 'BlockStatement' ? blockNode.body : null; if (!body) return;
    for (let i = 0; i < body.length; i++) {
      const S = body[i];
      if (S.type !== 'VariableDeclaration' || S.declarations.length !== 1) continue;
      const d = S.declarations[0]; if (d.id.type !== 'Identifier' || !d.init) continue;
      const X = gname(d.init); if (!X || lexical.has(X) || X === d.id.name) continue;
      const orig = d.id.name;
      for (let j = i + 1; j < body.length; j++) {
        const T = body[j];
        if (T.type !== 'ExpressionStatement' || T.expression.type !== 'AssignmentExpression' || T.expression.operator !== '=') continue;
        const a = T.expression; if (gname(a.left) !== X) continue;
        const fn = a.right; if (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression') break;
        // orig используется только в fn (кроме объявления)
        const all = refsOf(orig, blockNode).filter(n => n !== d.id);
        const inside = all.filter(n => n.start >= fn.start && n.end <= fn.end);
        if (inside.length !== all.length) break;          // orig нужен ещё где-то — оставить как есть
        const replace = inside.length === 0;            // полная замена (orig не используется)
        // между объявлением и присваиванием X не переопределяется
        let reassigned = false; for (let k = i + 1; k < j; k++) walk.full(body[k], n => { if (n.type === 'AssignmentExpression' && gname(n.left) === X) reassigned = true; });
        if (reassigned) break;
        const optional = /typeof\s+\w+\s*[!=]==?\s*['"]function['"]/.test(src.slice(fn.start, fn.end)) && new RegExp('typeof\\s+' + orig + '\\b').test(src.slice(fn.start, fn.end));
        // удалить объявление (вместе с переводом строки), заменить присваивание
        let s0 = S.start; while (s0 > 0 && /[ \t]/.test(src[s0 - 1])) s0--; let s1 = S.end; if (src[s1] === '\n') s1++;
        edits.push([s0, s1, '']);
        edits.push([T.start, T.end, `CS2.patch('${X}', ${replace ? '()' : orig} => ${src.slice(fn.start, fn.end)}${optional || replace ? ', { optional: true }' : ''});`]);
        // следом идущие try { X = …; } catch {} — синхронизация привязки, больше не нужна
        const U = body[j + 1];
        if (U && U.type === 'TryStatement' && U.block.body.length === 1 && U.block.body[0].type === 'ExpressionStatement' && U.block.body[0].expression.type === 'AssignmentExpression' && gname(U.block.body[0].expression.left) === X && (!U.handler || !U.handler.body.body.length)) {
          let u0 = U.start; while (u0 > 0 && /[ \t]/.test(src[u0 - 1])) u0--; let u1 = U.end; while (src[u1] === ' ' || src[u1] === '\t') u1++; if (src.slice(u1, u1 + 2) === '//') { while (src[u1] !== '\n' && u1 < src.length) u1++; } if (src[u1] === '\n') u1++;
          edits.push([u0, u1, '']);
        }
        total++; console.log(`${f}: ${X} (${orig})`);
        break;
      }
    }
  });

  // C) const f = W.X; [if (…f…) …return;] const w = function…; w.__флаг = true; [Object.keys(f)…]; W.X = w; [try { X = w } catch {}]
  walk.full(ast, blockNode => {
    const body = blockNode.type === 'Program' || blockNode.type === 'BlockStatement' ? blockNode.body : null; if (!body) return;
    for (let i = 0; i < body.length; i++) {
      const S = body[i];
      if (S.type !== 'VariableDeclaration' || S.declarations.length !== 1) continue;
      const d = S.declarations[0]; if (d.id.type !== 'Identifier' || !d.init) continue;
      const X = gname(d.init); if (!X || lexical.has(X)) continue;
      const F = d.id.name;
      let k = i + 1; const guards = [];
      while (body[k] && body[k].type === 'IfStatement' && !body[k].alternate && new RegExp('\\b' + F + '\\b').test(src.slice(body[k].test.start, body[k].test.end))) { guards.push(body[k]); k++; }
      const Wd = body[k]; let WN = null, fnText = null, fnNode = null;
      if (Wd && Wd.type === 'VariableDeclaration' && Wd.declarations.length === 1 && Wd.declarations[0].id.type === 'Identifier' && Wd.declarations[0].init && /Function/.test(Wd.declarations[0].init.type)) { WN = Wd.declarations[0].id.name; fnNode = Wd.declarations[0].init; }
      else if (Wd && Wd.type === 'FunctionDeclaration') { WN = Wd.id.name; fnNode = Wd; }
      if (!WN) continue;
      fnText = src.slice(fnNode.start, fnNode.end);
      const flags = []; let end = -1, assigned = false, bad = false; k++;
      for (; k < body.length; k++) {
        const T = body[k];
        if (T.type === 'ExpressionStatement') {
          const e = T.expression;
          if (e.type === 'AssignmentExpression' && e.operator === '=' && gname(e.left) === X && e.right.type === 'Identifier' && e.right.name === WN) { assigned = true; end = k; continue; }
          // w.__a = w.__b = true
          let x = e, ok = false, fl = [];
          while (x.type === 'AssignmentExpression' && x.left.type === 'MemberExpression' && !x.left.computed && x.left.object.type === 'Identifier' && x.left.object.name === WN) { fl.push(x.left.property.name); x = x.right; ok = true; }
          if (ok && x.type === 'Literal' && x.value === true) { flags.push(...fl); end = k; continue; }
          // Object.keys(f).forEach(k => { w[k] = f[k]; })
          const t = src.slice(T.start, T.end).replace(/\s+/g, '');
          if (new RegExp('^Object\\.keys\\(' + F + '\\)\\.forEach\\(\\(?(\\w+)\\)?=>\\{?(?:if\\(!\\(\\1in' + WN + '\\)\\))?(?:try\\{)?' + WN + '\\[\\1\\]=' + F + '\\[\\1\\];?(?:\\}catch\\(\\w*\\)\\{\\})?\\}?\\);?$').test(t)) { end = k; continue; }
          break;
        }
        if (T.type === 'TryStatement' && assigned) {
          const t = src.slice(T.block.start, T.block.end);
          if (new RegExp('^\\{\\s*(' + X + '\\s*=\\s*' + WN + '|\\(0,\\s*eval\\)\\([\'"`]' + X + ' = window\\.' + X + '[\'"`]\\));?\\s*\\}$').test(t) && (!T.handler || !T.handler.body.body.length)) { end = k; continue; }
        }
        break;
      }
      if (!assigned || bad) continue;
      // F и WN не используются вне заменяемого диапазона
      const lo = S.start, hi = body[end].end;
      const outside = (name) => { let o = false; walk.full(blockNode, n => { if (n.type === 'Identifier' && n.name === name && (n.start < lo || n.end > hi)) o = true; }); return o; };
      if (outside(F) || outside(WN)) continue;
      if (new RegExp('\\b' + WN + '\\b').test(fnText.slice(fnNode.type === 'FunctionDeclaration' ? ('function ' + WN).length + 1 : 0).replace(/^function\s+\w+/, ''))) continue;   // функция ссылается на себя
      const rest = body.slice(end + 1).length > 0;
      const id = flags[0];
      let out = '';
      for (const guard of guards) {
        const simpleGuard = guard.consequent && guard.consequent.type === 'ReturnStatement' && !guard.consequent.argument;
        const onlyF = src.slice(guard.test.start, guard.test.end).replace(new RegExp("typeof\\s+" + F + "\\s*!==?\\s*['\"]function['\"]", 'g'), '').replace(new RegExp('!' + F + '\\b', 'g'), '').replace(new RegExp('\\b' + F + '\\.' + (id || '@@') + '\\b', 'g'), '').replace(/[|()\s]/g, '') === '';
        if (rest || !simpleGuard || !onlyF) out += src.slice(guard.start, guard.end).replace(new RegExp('\\b' + F + '\\b', 'g'), 'window.' + X) + ' ';
      }
      const guard = guards[0], keepGuard = out.length > 0;
      out += `CS2.patch('${X}', ${F} => ${fnText}${id ? `, { id: '${id}' }` : ''});`;
      flags.slice(1).forEach(fl => { out += ` window.${X}.${fl} = true;`; });
      let s0 = S.start; let s1 = body[end].end; while (src[s1] === ' ' || src[s1] === '\t') s1++; if (src.slice(s1, s1 + 2) === '//') { while (src[s1] !== '\n' && s1 < src.length) s1++; }
      edits.push([s0, s1, out]);
      total++; console.log(`${f}: ${X} [C] id=${id || '-'} guard=${guard ? (keepGuard ? 'kept' : 'dropped') : 'none'}`);
      i = end;
    }
  });

  // D) const p = W.X; if (typeof p === 'function' && !p.__флаг) { const w = function…; w.__флаг = true; W.X = w; [try { X = w }] }
  walk.full(ast, blockNode => {
    const body = blockNode.type === 'Program' || blockNode.type === 'BlockStatement' ? blockNode.body : null; if (!body) return;
    for (let i = 0; i + 1 < body.length; i++) {
      const S = body[i], I = body[i + 1];
      if (S.type !== 'VariableDeclaration' || S.declarations.length !== 1) continue;
      const d = S.declarations[0]; if (d.id.type !== 'Identifier' || !d.init) continue;
      const X = gname(d.init); if (!X || lexical.has(X)) continue;
      const P = d.id.name;
      if (I.type !== 'IfStatement' || I.alternate || I.consequent.type !== 'BlockStatement') continue;
      const inner = I.consequent.body; if (inner.length < 2) continue;
      const Wd = inner[0];
      if (!(Wd.type === 'VariableDeclaration' && Wd.declarations.length === 1 && Wd.declarations[0].id.type === 'Identifier' && Wd.declarations[0].init && /Function/.test(Wd.declarations[0].init.type))) continue;
      const WN = Wd.declarations[0].id.name, fnNode = Wd.declarations[0].init, fnText = src.slice(fnNode.start, fnNode.end);
      const flags = []; let assigned = false, ok = true;
      for (const T of inner.slice(1)) {
        if (T.type === 'ExpressionStatement') {
          const e = T.expression;
          if (e.type === 'AssignmentExpression' && gname(e.left) === X && e.right.type === 'Identifier' && e.right.name === WN) { assigned = true; continue; }
          let x = e, fl = [];
          while (x.type === 'AssignmentExpression' && x.left.type === 'MemberExpression' && !x.left.computed && x.left.object.type === 'Identifier' && x.left.object.name === WN) { fl.push(x.left.property.name); x = x.right; }
          if (fl.length && x.type === 'Literal' && x.value === true) { flags.push(...fl); continue; }
          const t = src.slice(T.start, T.end).replace(/\s+/g, '');
          if (new RegExp('^Object\\.keys\\(' + P + '\\)\\.forEach\\(\\(?(\\w+)\\)?=>\\{?(?:if\\(!\\(\\1in' + WN + '\\)\\))?(?:try\\{)?' + WN + '\\[\\1\\]=' + P + '\\[\\1\\];?(?:\\}catch\\(\\w*\\)\\{\\})?\\}?\\);?$').test(t)) continue;
        }
        if (T.type === 'TryStatement' && assigned && new RegExp('^\\{\\s*(' + X + '\\s*=\\s*' + WN + '|\\(0,\\s*eval\\)\\([\'"`]' + X + ' = window\\.' + X + '[\'"`]\\));?\\s*\\}$').test(src.slice(T.block.start, T.block.end))) continue;
        ok = false; break;
      }
      if (!ok || !assigned) continue;
      const id = flags[0];
      const test = src.slice(I.test.start, I.test.end).replace(new RegExp("typeof\\s+" + P + "\\s*===\\s*['\"]function['\"]", 'g'), '').replace(new RegExp('!' + P + '\\.' + (id || '@@') + '\\b', 'g'), '').replace(/[&()\s]/g, '');
      if (test !== '') continue;                                         // в условии есть что-то ещё — вручную
      let used = false; walk.full(blockNode, n => { if (n.type === 'Identifier' && n.name === P && (n.start < S.start || n.end > I.end)) used = true; });   // w — const внутри if-блока, снаружи не виден
      if (used) continue;
      if (new RegExp('\\b' + WN + '\\b').test(fnText)) continue;
      let out = `CS2.patch('${X}', ${P} => ${fnText}${id ? `, { id: '${id}' }` : ''});`;
      flags.slice(1).forEach(fl => { out += ` window.${X}.${fl} = true;`; });
      edits.push([S.start, I.end, out]);
      total++; console.log(`${f}: ${X} [D] id=${id || '-'}`);
      i++;
    }
  });

  // E) const p = W.X; if (typeof p === 'function' [&& !p.__флаг]) { W.X = function…; [W.X.__флаг = true;] [try { X = W.X }] }
  walk.full(ast, blockNode => {
    const body = blockNode.type === 'Program' || blockNode.type === 'BlockStatement' ? blockNode.body : null; if (!body) return;
    for (let i = 0; i + 1 < body.length; i++) {
      const S = body[i], I = body[i + 1];
      if (S.type !== 'VariableDeclaration' || S.declarations.length !== 1) continue;
      const d = S.declarations[0]; if (d.id.type !== 'Identifier' || !d.init) continue;
      const X = gname(d.init); if (!X || lexical.has(X)) continue;
      const P = d.id.name;
      if (I.type !== 'IfStatement' || I.alternate) continue;
      const inner = I.consequent.type === 'BlockStatement' ? I.consequent.body : [I.consequent];
      const A = inner[0]; if (!A || A.type !== 'ExpressionStatement' || A.expression.type !== 'AssignmentExpression' || gname(A.expression.left) !== X || !/Function/.test(A.expression.right.type)) continue;
      const fnNode = A.expression.right, fnText = src.slice(fnNode.start, fnNode.end);
      const flags = []; let ok = true;
      for (const T of inner.slice(1)) {
        const t = src.slice(T.start, T.end).replace(/\s+/g, '');
        const m = t.match(new RegExp('^(?:window|W)\\.' + X + '\\.(\\w+)=true;?$')); if (m) { flags.push(m[1]); continue; }
        if (T.type === 'TryStatement' && new RegExp('^\\{\\s*' + X + '\\s*=\\s*(?:window|W)\\.' + X + ';?\\s*\\}$').test(src.slice(T.block.start, T.block.end))) continue;
        ok = false; break;
      }
      if (!ok) continue;
      const id = flags[0];
      const test = src.slice(I.test.start, I.test.end).replace(new RegExp("typeof\\s+" + P + "\\s*===\\s*['\"]function['\"]", 'g'), '').replace(new RegExp('!' + P + '\\.' + (id || '@@') + '\\b', 'g'), '').replace(/[&()\s]/g, '');
      if (test !== '') continue;
      let used = false; walk.full(blockNode, n => { if (n.type === 'Identifier' && n.name === P && (n.start < S.start || n.end > I.end)) used = true; });
      if (used) continue;
      edits.push([S.start, I.end, `CS2.patch('${X}', ${P} => ${fnText}${id ? `, { id: '${id}' }` : ''});` + flags.slice(1).map(fl => ` window.${X}.${fl} = true;`).join('')]);
      total++; console.log(`${f}: ${X} [E] id=${id || '-'}`); i++;
    }
  });

  // F) полная замена из списка --replace '{"файл":["X",…]}': X = function…/имя  →  CS2.patch('X', () => …, { optional: true })
  const RL = (REPLACE[f] || []);
  if (RL.length) walk.full(ast, blockNode => {
    const body = blockNode.type === 'Program' || blockNode.type === 'BlockStatement' ? blockNode.body : null;
    const visit = (T, holder, idx) => {
      if (!T || T.type !== 'ExpressionStatement' || T.expression.type !== 'AssignmentExpression' || T.expression.operator !== '=') return;
      const X = gname(T.expression.left); if (!X || !RL.includes(X)) return;
      const r = T.expression.right; if (!(/Function/.test(r.type) || r.type === 'Identifier')) return;
      const rt = src.slice(r.start, r.end);
      const val = /Function/.test(r.type) ? rt : `function () { return ${rt}.apply(this, arguments); }`;
      edits.push([T.start, T.end, `CS2.patch('${X}', () => ${val}, { optional: true });`]);
      total++; console.log(`${f}: ${X} [F]`);
      const U = holder && holder[idx + 1];
      if (U && U.type === 'TryStatement' && /^\{\s*\w+\s*=\s*(?:window\.)?\w+;?\s*\}$/.test(src.slice(U.block.start, U.block.end)) && gname(U.block.body[0]?.expression?.left) === X) {
        let u0 = U.start; while (u0 > 0 && /[ \t]/.test(src[u0 - 1])) u0--; let u1 = U.end; while (src[u1] === ' ' || src[u1] === '\t') u1++; if (src.slice(u1, u1 + 2) === '//') { while (src[u1] !== '\n' && u1 < src.length) u1++; } if (src[u1] === '\n') u1++;
        edits.push([u0, u1, '']);
      }
    };
    if (body) body.forEach((T, i) => visit(T, body, i));
    if (blockNode.type === 'IfStatement' && blockNode.consequent.type === 'ExpressionStatement') visit(blockNode.consequent, null, 0);
  });
  if (!edits.length) continue;
  edits.sort((x, y) => y[0] - x[0]);
  let prev = Infinity; for (const [a, b, t] of edits) { if (b > prev) { console.error('overlap', f); process.exit(1); } src = src.slice(0, a) + t + src.slice(b); prev = a; }
  try { new vm.Script(src, { filename: f }); } catch (e) { console.error('SYNTAX after edit', f, e.message); process.exit(1); }
  if (WRITE) fs.writeFileSync(file, src);
}
console.log('итого', total, WRITE ? '(записано)' : '(пробный прогон)');
