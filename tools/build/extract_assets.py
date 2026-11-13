#!/usr/bin/env python3
"""Вынос встроенных данных из кода (однократная миграция v144; повторный запуск ничего не меняет).

1. js/fan/sticker-art.js: шрифты стикеров (base64 WOFF внутри JS, ~2.4 МБ) -> fonts/stickers/<Имя>.woff;
   браузер скачивает шрифт только когда он реально нужен (@font-face с url()).
2. js/awards/trophy-forge.js: контуры кубков ARTS (~3.1 МБ) -> js/data/trophy-arts.js (данные отдельно от кода)
   с упрощением БЕЗ потерь: удаляются повторяющиеся точки и точки, лежащие на прямой между соседями
   (многоугольник и заливка не меняются ни на пиксель — координаты не округляются).
   Встроенные картинки (webp base64) -> assets/ui/trophies/*.webp.
"""
import base64, json, os, re, sys
from fractions import Fraction
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
P = lambda *a: os.path.join(ROOT, *a)

def js_object(line, name):
    i = line.index('{'); j = line.rindex('}')
    return line[:i], json.loads(line[i:j + 1]), line[j + 1:]

# ------------------------------------------------------------------ шрифты стикеров
def fonts():
    path = P('js/fan/sticker-art.js'); src = open(path, encoding='utf8').read()
    m = re.search(r'^  const FONTS = (\{.*\});$', src, re.M)
    if not m: print('sticker fonts: already extracted'); return
    data = json.loads(m.group(1)); os.makedirs(P('fonts/stickers'), exist_ok=True)
    for name, b64 in data.items():
        open(P('fonts/stickers', name + '.woff'), 'wb').write(base64.b64decode(b64))
    names = json.dumps(sorted(data.keys()), ensure_ascii=False)
    src = src.replace(m.group(0), "  // шрифты лежат файлами в fonts/stickers/<имя>.woff (Google Fonts, SIL OFL) — браузер грузит их только по необходимости\n  const FONTS = " + names + ";", 1)
    src = src.replace("Object.keys(FONTS).map(f => `@font-face{font-family:'${f}';src:url(data:font/woff;base64,${FONTS[f]}) format('woff');font-display:swap}`)",
                      "FONTS.map(f => `@font-face{font-family:'${f}';src:url(fonts/stickers/${f}.woff) format('woff');font-display:swap}`)", 1)
    assert 'data:font/woff' not in src
    open(path, 'w', encoding='utf8').write(src); print('sticker fonts:', len(data), 'files')

# ------------------------------------------------------------------ контуры кубков
TOK = re.compile(r'([MLz])|(-?\d*\.?\d+)')
def simplify(d):
    out = []; cmd = None; nums = []; rings = []; cur = []
    for c, n in TOK.findall(d):
        if c:
            cmd = c
            if c == 'M':
                if cur: rings.append((cur, False))
                cur = []
            elif c == 'z':
                rings.append((cur, True)); cur = []
        else:
            nums.append(n)
            if len(nums) == 2: cur.append((nums[0], nums[1])); nums = []
    if cur: rings.append((cur, False))
    res = []
    for pts, closed in rings:
        q = []
        for p in pts:
            if q and q[-1] == p: continue
            q.append(p)
        f = [(Fraction(x), Fraction(y)) for x, y in q]
        keep = [q[0]] if q else []; kf = [f[0]] if f else []
        for i in range(1, len(q) - 1):
            a, b, c = kf[-1], f[i], f[i + 1]
            if (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) == 0 and \
               min(a[0], c[0]) <= b[0] <= max(a[0], c[0]) and min(a[1], c[1]) <= b[1] <= max(a[1], c[1]):
                continue   # точка на отрезке между соседями
            keep.append(q[i]); kf.append(b)
        if len(q) > 1: keep.append(q[-1])
        if not keep: continue
        # относительные команды: h/v для осевых шагов (их в обведённых контурах большинство), l — для прочих;
        # разности считаются точно (Fraction), поэтому вершины совпадают с исходными
        kf = [(Fraction(x), Fraction(y)) for x, y in keep]
        s = 'M' + num(kf[0][0]) + ' ' + num(kf[0][1])
        for (ax, ay), (bx, by) in zip(kf, kf[1:]):
            dx, dy = bx - ax, by - ay
            if dy == 0: s += 'h' + num(dx)
            elif dx == 0: s += 'v' + num(dy)
            else: ny = num(dy); s += 'l' + num(dx) + ('' if ny[0] == '-' else ' ') + ny
        res.append(s + ('z' if closed else ''))
    return ''.join(res)

def num(f):
    # точная десятичная запись дроби со знаменателем 2^a*5^b, без ведущего нуля: 0.4 -> .4, -0.4 -> -.4
    sign = '-' if f < 0 else ''; f = abs(f); ip = f.numerator // f.denominator; r = f - ip; digits = ''
    while r and len(digits) < 12: r *= 10; d = r.numerator // r.denominator; digits += str(d); r -= d
    t = (str(ip) if ip or not digits else '') + ('.' + digits if digits else '')
    return sign + (t or '0')

def trophies():
    path = P('js/awards/trophy-forge.js'); lines = open(path, encoding='utf8').read().split('\n')
    changed = False
    for k, line in enumerate(lines):
        if line.startswith('  const ARTS = {'):
            _, arts, _ = js_object(line, 'ARTS')
            before = sum(len(L['d']) for a in arts.values() for L in a['layers'])
            for a in arts.values():
                for L in a['layers']: L['d'] = simplify(L['d'])
            after = sum(len(L['d']) for a in arts.values() for L in a['layers'])
            open(P('js/data/trophy-arts.js'), 'w', encoding='utf8').write(
                '/* Контуры кубков для js/awards/trophy-forge.js (создано tools/build/extract_assets.py).\n'
                '   Слои силуэтов по мотивам трофеев HLTV: d — контур (M/L/z), r/l — роль и уровень цвета; cols — исходные цвета. */\n'
                'window.CS2_TROPHY_ARTS = ' + json.dumps(arts, ensure_ascii=False, separators=(',', ':')) + ';\n')
            lines[k] = '  const ARTS = window.CS2_TROPHY_ARTS || {};   // данные — js/data/trophy-arts.js'
            print('trophy arts: paths %d -> %d chars (%.0f%%)' % (before, after, 100 * after / before)); changed = True
        for name in ('PGL_IMG', 'BADGE_IMG', 'GOLDBAR_IMG', 'MVP_IMG'):
            if not line.startswith('  const %s = ' % name) or 'data:image/webp;base64,' not in line: continue
            os.makedirs(P('assets/ui/trophies'), exist_ok=True)
            def save(key, uri):
                fn = 'assets/ui/trophies/%s.webp' % key
                open(P(fn), 'wb').write(base64.b64decode(uri.split(',', 1)[1])); return fn
            pre = name.split('_')[0].lower()
            if '{' in line:
                head, obj, tail = js_object(line, name)
                obj = {kk: save(pre + '-' + kk, v) for kk, v in obj.items()}
                lines[k] = head + json.dumps(obj, ensure_ascii=False) + tail
            else:
                uri = re.search(r"'(data:image/webp;base64,[^']+)'", line).group(1)
                lines[k] = line.replace(uri, save(pre, uri))
            print('trophy image:', name); changed = True
    if changed: open(path, 'w', encoding='utf8').write('\n'.join(lines))
    else: print('trophies: already extracted')

def recompact():
    # повторное упрощение уже вынесенных контуров (абсолютные M/L/z) — для старого формата данных
    path = P('js/data/trophy-arts.js'); src = open(path, encoding='utf8').read()
    i = src.index('window.CS2_TROPHY_ARTS = ') + len('window.CS2_TROPHY_ARTS = '); j = src.rindex(';')
    arts = json.loads(src[i:j])
    if any(c in L['d'] for a in arts.values() for L in a['layers'] for c in 'hvl'): print('trophy arts: already relative'); return
    b = sum(len(L['d']) for a in arts.values() for L in a['layers'])
    for a in arts.values():
        for L in a['layers']: L['d'] = simplify(L['d'])
    a2 = sum(len(L['d']) for a in arts.values() for L in a['layers'])
    open(path, 'w', encoding='utf8').write(src[:i] + json.dumps(arts, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('trophy arts: %d -> %d chars' % (b, a2))

if __name__ == '__main__':
    fonts(); trophies(); recompact()
