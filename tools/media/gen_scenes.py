"""v100: процедурные фоны сцен для интерфейса (свои, без сторонних фото).

Рисует 10 сцен в стиле assets/ui/arena.webp: арены разных цветов, кубок под прожектором, студия эфира,
пресс-зона, буткемп, трибуны, офис ночью, аналитика. Результат — assets/ui/scenes/*.webp.
Запуск: python3 tools/media/gen_scenes.py
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

W, H = 1200, 600
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'ui', 'scenes')


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def base(top, bottom):
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=lerp(top, bottom, y / H))
    return im.convert('RGBA')


def layer():
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))


def comp(im, lay, blur=0):
    if blur:
        lay = lay.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(im, lay)


def glow(im, cx, cy, rx, ry, color, alpha, blur=60):
    l = layer()
    ImageDraw.Draw(l).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color + (alpha,))
    return comp(im, l, blur)


def beams(im, xs, color, alpha=70, spread=70, length=None, blur=18, top=-20):
    l = layer()
    d = ImageDraw.Draw(l)
    length = length or H * 0.95
    for x, ang in xs:
        a = math.radians(ang)
        ex, ey = x + math.sin(a) * length, top + math.cos(a) * length
        px, py = math.cos(a) * spread, -math.sin(a) * spread
        d.polygon([(x - 6, top), (x + 6, top), (ex + px, ey + py), (ex - px, ey - py)], fill=color + (alpha,))
    return comp(im, l, blur)


def screen(im, box, color, alpha=200, grid=True, blur=10):
    l = layer()
    d = ImageDraw.Draw(l)
    d.rectangle(box, fill=color + (alpha,))
    if grid:
        x0, y0, x1, y1 = box
        for x in range(x0, x1, 14):
            d.line([(x, y0), (x, y1)], fill=(0, 0, 0, 40))
        for y in range(y0, y1, 14):
            d.line([(x0, y), (x1, y)], fill=(0, 0, 0, 40))
    im = comp(im, l, blur)
    return glow(im, (box[0] + box[2]) // 2, (box[1] + box[3]) // 2, (box[2] - box[0]) // 1.6, (box[3] - box[1]), color, 60, 70)


def bokeh(im, rnd, n, colors, rmin=3, rmax=11, ymax=0.75, blur=2):
    l = layer()
    d = ImageDraw.Draw(l)
    for _ in range(n):
        x, y, r = rnd.uniform(0, W), rnd.uniform(0, H * ymax), rnd.uniform(rmin, rmax)
        c = rnd.choice(colors)
        d.ellipse([x - r, y - r, x + r, y + r], fill=c + (int(rnd.uniform(40, 130)),))
    return comp(im, l, blur)


def crowd(im, rnd, y0, color=(8, 9, 12), rows=3, phones=40, phone_c=(255, 255, 255)):
    l = layer()
    d = ImageDraw.Draw(l)
    d.rectangle([0, y0 + 30, W, H], fill=color + (255,))
    for row in range(rows):
        yy = y0 + row * 26
        x = -10
        while x < W + 20:
            r = rnd.uniform(11, 17)
            d.ellipse([x - r, yy - r, x + r, yy + r], fill=color + (255,))
            d.rounded_rectangle([x - r * 1.7, yy + r * 0.6, x + r * 1.7, yy + r * 3.4], radius=int(r), fill=color + (255,))
            x += rnd.uniform(26, 38)
    for _ in range(phones):
        x, y = rnd.uniform(0, W), rnd.uniform(y0, H - 10)
        d.ellipse([x - 1.6, y - 1.6, x + 1.6, y + 1.6], fill=phone_c + (int(rnd.uniform(120, 230)),))
    return comp(im, l, 0.6)


def vignette(im, k=0.75):
    l = layer()
    d = ImageDraw.Draw(l)
    for i in range(40):
        t = i / 40
        d.rectangle([int(W * t * 0.18), int(H * t * 0.18), int(W - W * t * 0.18), int(H - H * t * 0.18)], outline=(0, 0, 0, int(255 * k * (1 - t) ** 2 / 6)), width=int(W * 0.0045) + 1)
    return comp(im, l, 30)


def silhouette_desk(im, y, color=(6, 7, 9)):
    l = layer()
    d = ImageDraw.Draw(l)
    d.polygon([(W * .18, y), (W * .82, y), (W * .9, y + 70), (W * .1, y + 70)], fill=color + (255,))
    d.rectangle([0, y + 70, W, H], fill=color + (255,))
    for cx in (W * .32, W * .44, W * .56, W * .68):
        d.ellipse([cx - 22, y - 70, cx + 22, y - 26], fill=color + (255,))
        d.rounded_rectangle([cx - 46, y - 34, cx + 46, y + 10], radius=26, fill=color + (255,))
    return comp(im, l, 0.8)


def scene(key):
    rnd = random.Random(key)
    if key == 'arena-orange':
        im = base((26, 20, 22), (8, 9, 12))
        im = beams(im, [(320, 18), (520, -8), (690, 8), (880, -14), (1040, 6)], (255, 170, 110), 55)
        im = screen(im, (380, 230, 820, 420), (255, 136, 70), 210)
        im = screen(im, (110, 250, 290, 380), (70, 110, 200), 150)
        im = screen(im, (910, 250, 1090, 380), (70, 110, 200), 150)
        im = bokeh(im, rnd, 70, [(255, 180, 110), (150, 170, 230)])
        im = crowd(im, rnd, 470)
    elif key == 'arena-blue':
        im = base((10, 16, 30), (5, 7, 12))
        im = beams(im, [(240, 22), (460, 4), (740, -4), (960, -20)], (120, 170, 255), 60)
        im = screen(im, (300, 200, 900, 410), (60, 120, 255), 200)
        im = bokeh(im, rnd, 80, [(140, 190, 255), (255, 255, 255)])
        im = crowd(im, rnd, 480, phone_c=(170, 210, 255))
    elif key == 'arena-crimson':
        im = base((30, 8, 12), (7, 5, 7))
        im = beams(im, [(200, 26), (420, 10), (600, 0), (780, -10), (1000, -26)], (255, 80, 90), 60, spread=90)
        im = screen(im, (440, 220, 760, 400), (255, 60, 70), 210)
        im = glow(im, 600, 560, 520, 120, (255, 60, 70), 70, 80)
        im = bokeh(im, rnd, 60, [(255, 120, 120), (255, 210, 160)])
        im = crowd(im, rnd, 470)
    elif key == 'trophy-gold':
        im = base((16, 13, 10), (5, 5, 6))
        im = beams(im, [(600, 0)], (255, 210, 130), 90, spread=190, length=520, blur=28)
        im = glow(im, 600, 470, 260, 60, (255, 200, 110), 120, 40)
        l = layer(); d = ImageDraw.Draw(l)
        d.ellipse([480, 450, 720, 495], fill=(20, 16, 12, 255)); d.rectangle([520, 470, 680, 600], fill=(14, 12, 10, 255))
        im = comp(im, l, 1)
        im = bokeh(im, rnd, 90, [(255, 210, 130), (255, 240, 200)], rmax=7, ymax=0.9)
    elif key == 'studio':
        im = base((20, 12, 30), (6, 6, 10))
        for i, c in enumerate([(150, 90, 255), (60, 200, 220), (150, 90, 255)]):
            im = screen(im, (150 + i * 320, 150, 410 + i * 320, 320), c, 190)
        im = beams(im, [(150, 20), (1050, -20)], (200, 160, 255), 40)
        im = bokeh(im, rnd, 50, [(190, 150, 255), (120, 230, 240)])
        im = silhouette_desk(im, 430)
    elif key == 'press':
        im = base((24, 24, 28), (10, 10, 12))
        l = layer(); d = ImageDraw.Draw(l)
        for y in range(40, 420, 70):
            for x in range(40 + (y // 70 % 2) * 60, W, 120):
                d.rounded_rectangle([x, y, x + 70, y + 34], radius=6, fill=(255, 255, 255, 18))
        im = comp(im, l, 1.5)
        im = glow(im, 600, 260, 420, 220, (255, 245, 230), 60, 90)
        l = layer(); d = ImageDraw.Draw(l)
        d.rectangle([0, 470, W, H], fill=(8, 8, 10, 255))
        for cx in (430, 520, 600, 680, 770):
            d.line([(cx, 470), (cx + rnd.uniform(-30, 30), 395)], fill=(12, 12, 14, 255), width=6)
            d.rounded_rectangle([cx - 13 + rnd.uniform(-30, 30), 370, cx + 13, 405], radius=12, fill=(14, 14, 16, 255))
        im = comp(im, l, 0.6)
        im = bokeh(im, rnd, 30, [(255, 255, 255)], rmax=5)
    elif key == 'bootcamp':
        im = base((8, 18, 20), (4, 7, 8))
        l = layer(); d = ImageDraw.Draw(l)
        for i in range(6):
            x = 70 + i * 185
            d.rounded_rectangle([x, 250, x + 150, 345], radius=6, fill=(40, 210, 200, 210))
        im = comp(im, l, 6)
        im = glow(im, 600, 300, 600, 90, (40, 210, 200), 70, 60)
        l = layer(); d = ImageDraw.Draw(l)
        d.rectangle([0, 380, W, H], fill=(5, 8, 9, 255))
        for i in range(6):
            x = 145 + i * 185
            d.ellipse([x - 26, 330, x + 26, 382], fill=(5, 8, 9, 255)); d.rounded_rectangle([x - 55, 370, x + 55, 520], radius=30, fill=(5, 8, 9, 255))
        im = comp(im, l, 0.8)
        im = bokeh(im, rnd, 40, [(90, 230, 220)], rmax=6, ymax=0.5)
    elif key == 'crowd':
        im = base((26, 10, 26), (8, 6, 10))
        im = beams(im, [(150, 30), (380, 12), (820, -12), (1050, -30)], (255, 120, 200), 60, spread=80)
        im = glow(im, 600, 120, 500, 140, (255, 140, 60), 80, 90)
        l = layer(); d = ImageDraw.Draw(l)
        for _ in range(120):
            x, y = rnd.uniform(0, W), rnd.uniform(0, H * .7)
            c = rnd.choice([(255, 200, 80), (255, 120, 200), (120, 220, 255), (255, 255, 255)])
            d.rectangle([x, y, x + rnd.uniform(4, 9), y + rnd.uniform(2, 5)], fill=c + (int(rnd.uniform(120, 230)),))
        im = comp(im, l, 0.6)
        im = crowd(im, rnd, 360, rows=6, phones=120)
    elif key == 'office':
        im = base((10, 14, 24), (6, 7, 10))
        l = layer(); d = ImageDraw.Draw(l)
        for x in range(0, W, 300):
            d.rectangle([x + 20, 40, x + 280, 420], fill=(30, 40, 70, 160))
        im = comp(im, l, 2)
        im = bokeh(im, rnd, 160, [(255, 190, 110), (255, 230, 170), (120, 160, 255)], rmin=2, rmax=9, ymax=0.7, blur=3)
        l = layer(); d = ImageDraw.Draw(l)
        for x in range(0, W, 300):
            d.rectangle([x + 10, 30, x + 20, 430], fill=(5, 6, 9, 255)); d.rectangle([x + 280, 30, x + 290, 430], fill=(5, 6, 9, 255))
        d.rectangle([0, 420, W, H], fill=(7, 8, 11, 255)); d.polygon([(200, 470), (1000, 470), (1100, 600), (100, 600)], fill=(12, 12, 15, 255))
        im = comp(im, l, 0.8)
        im = glow(im, 600, 470, 300, 30, (255, 170, 90), 70, 30)
    else:  # stats
        im = base((8, 14, 20), (4, 6, 9))
        l = layer(); d = ImageDraw.Draw(l)
        for x in range(0, W, 40):
            d.line([(x, 0), (x, H)], fill=(80, 200, 255, 14))
        for y in range(0, H, 40):
            d.line([(0, y), (W, y)], fill=(80, 200, 255, 14))
        pts = [(x, 380 - 140 * math.sin(x / 190) * math.exp(-x / 2400) - x * 0.12) for x in range(0, W + 1, 20)]
        d.line(pts, fill=(255, 150, 70, 230), width=5)
        for i in range(14):
            x = 80 + i * 78; h = rnd.uniform(40, 200)
            d.rectangle([x, 520 - h, x + 36, 520], fill=(60, 190, 255, 60))
        im = comp(im, l, 1.2)
        im = glow(im, 900, 200, 380, 160, (255, 140, 60), 50, 90)
        im = glow(im, 260, 420, 380, 160, (60, 180, 255), 50, 90)
    return vignette(im).convert('RGB')


KEYS = ['arena-orange', 'arena-blue', 'arena-crimson', 'trophy-gold', 'studio', 'press', 'bootcamp', 'crowd', 'office', 'stats']

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for k in KEYS:
        scene(k).save(os.path.join(OUT, k + '.webp'), 'WEBP', quality=72, method=6)
        print(k)
