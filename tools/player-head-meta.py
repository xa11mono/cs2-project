# Для каждого выреза: макушка (y0), высота головы (hh), центр головы (cx) — в долях кадра.
import os, sys, json
import numpy as np
from PIL import Image

def head(a):
    m = a > 128
    if not m.any(): return None
    ys = np.where(m.any(1))[0]; y0 = int(ys[0])
    ws = np.zeros(m.shape[0]); cx = np.zeros(m.shape[0])
    for y in ys:
        xs = np.where(m[y])[0]; ws[y] = xs[-1] - xs[0] + 1; cx[y] = (xs[-1] + xs[0]) / 2
    sm = np.convolve(ws, np.ones(5) / 5, mode='same')
    top = min(len(sm) - 8, y0 + int(m.shape[0] * .62))
    ymax = None
    for y in range(y0 + 6, top):
        if sm[y] > 0 and sm[y] >= sm[max(y0, y - 4):y].max(initial=0) and sm[y] > sm[y + 1:y + 9].max():
            ymax = y; break
    hh = None; hw = sm[y0:y0 + max(10, m.shape[0] // 7)].max()
    if ymax is not None:
        hw = sm[ymax]
        for y in range(ymax + 1, min(len(sm), top + 40)):
            if sm[y] > hw * 1.35:
                hh = ymax + int(np.argmin(sm[ymax:y])) - y0; break
    est = hw * 1.3
    if not hh or hh < est * .8 or hh > est * 1.7: hh = est
    c = cx[y0:y0 + max(4, int(hh * .5))]; c = c[c > 0]
    return y0, hh, (c.mean() if len(c) else m.shape[1] / 2)

def meta(path):
    im = Image.open(path)
    if im.mode != 'RGBA': return None
    a = np.array(im.getchannel('A')); r = head(a)
    if not r: return None
    h, w = a.shape; y0, hh, cx = r
    return [round(y0 / h, 4), round(hh / h, 4), round(cx / w, 4), round(w / h, 4)]

if __name__ == '__main__':
    src = sys.argv[1]; out = {}
    for f in sorted(os.listdir(src)):
        if f.lower().endswith(('.webp', '.png')):
            m = meta(os.path.join(src, f))
            if m: out[f] = m
    json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'))
    print(len(out))
