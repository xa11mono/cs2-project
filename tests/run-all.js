// Прогон всех тестов параллельно: node tests/run-all.js [-j N] [фильтр]
// Каждый *.test.js запускается отдельным процессом (браузерные тесты поднимают свой Chromium),
// итог — таблица PASS/FAIL и логи упавших тестов в tests/.logs/.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const args = process.argv.slice(2);
let jobs = Math.max(1, Math.min(4, os.cpus().length - 1)), filter = '';
for (let i = 0; i < args.length; i++) { if (args[i] === '-j') jobs = Math.max(1, +args[++i] || 1); else filter = args[i]; }
const dir = __dirname, logDir = path.join(dir, '.logs');
fs.mkdirSync(logDir, { recursive: true });
const files = fs.readdirSync(dir).filter(f => /\.test\.(js|mjs)$/.test(f) && f.includes(filter)).sort();
const env = { ...process.env };
try { const g = require('child_process').execSync('npm root -g', { encoding: 'utf8' }).trim(); env.NODE_PATH = [env.NODE_PATH, g].filter(Boolean).join(path.delimiter); } catch (e) {}
const results = []; let next = 0, running = 0; const t0 = Date.now();
function run(file) {
  return new Promise(resolve => {
    const s = Date.now(), out = [];
    const ch = spawn(process.execPath, [path.join(dir, file)], { cwd: path.join(dir, '..'), env });
    ch.stdout.on('data', d => out.push(d)); ch.stderr.on('data', d => out.push(d));
    const kill = setTimeout(() => { out.push(Buffer.from('\nTIMEOUT 15 min')); ch.kill('SIGKILL'); }, 15 * 60e3);
    ch.on('close', code => {
      clearTimeout(kill);
      const log = Buffer.concat(out).toString('utf8'), ok = code === 0;
      fs.writeFileSync(path.join(logDir, file + '.log'), log);
      const why = ok ? '' : (log.split('\n').find(l => /FAIL|Error|assert/i.test(l)) || '').trim().slice(0, 160);
      results.push({ file, ok, sec: Math.round((Date.now() - s) / 1000), why });
      console.log(`${ok ? 'PASS' : 'FAIL'} ${String(Math.round((Date.now() - s) / 1000)).padStart(4)}s ${file}${why ? '  — ' + why : ''}`);
      resolve();
    });
  });
}
(async function pump() {
  await new Promise(done => {
    const step = () => {
      if (next >= files.length && !running) return done();
      while (running < jobs && next < files.length) { running++; run(files[next++]).then(() => { running--; step(); }); }
    };
    step();
  });
  const fail = results.filter(r => !r.ok);
  console.log(`\n${results.length - fail.length}/${results.length} passed in ${Math.round((Date.now() - t0) / 1000)}s` + (fail.length ? `; failed: ${fail.map(r => r.file).join(', ')} (logs: tests/.logs/)` : ''));
  process.exit(fail.length ? 1 : 0);
})();
