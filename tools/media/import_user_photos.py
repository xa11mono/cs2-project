#!/usr/bin/env python3
"""Импорт пользовательских фото игроков в assets/media/players.

  python3 tools/media/import_user_photos.py <папка с квадратными фото> [<папка с вырезами>]

Квадратные фото:  «NN_Команда_Имя 'ник' Фамилия.webp» (200×200, с фоном) — фон убирается (rembg, модель u2net; другая — REMBG_MODEL=…).
Вырезы:           «Команда_ник.webp» (прозрачный фон) — идут в players/full как есть; чёрные силуэты-заглушки пропускаются.
Для каждого ника пишет миниатюру players/<файл>.webp (256×256) и вырез players/full/<файл>.webp, обновляет
media-manifest.json/.js (src = "user") и player-heads.js. Игроки, которых нет в папках, остаются с прежними фото.
"""
import glob, io, json, os, re, sys, datetime
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PL = os.path.join(ROOT, 'assets', 'media', 'players')
slug = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
MODEL = os.environ.get('REMBG_MODEL', 'u2net')
CACHE = os.environ.get('PHOTO_CACHE') or os.path.join(ROOT, 'tools', 'media', '.cache', 'cutouts'); os.makedirs(CACHE, exist_ok=True)

def trim(im):                                   # обрезать пустые поля сверху и по бокам (низ оставляем — плечи уходят за кадр)
    a = np.array(im.getchannel('A')) > 24
    if not a.any(): return im
    ys, xs = np.where(a.any(1))[0], np.where(a.any(0))[0]
    return im.crop((int(xs[0]), int(ys[0]), int(xs[-1]) + 1, im.height))

def thumb(cut):                                 # квадрат «голова и плечи» от макушки
    c = trim(cut); s = min(c.width, c.height); x = (c.width - s) // 2
    return c.crop((x, 0, x + s, s)).resize((256, 256), Image.LANCZOS)

def is_silhouette(im):
    a = np.array(im); m = a[..., 3] > 128
    return m.sum() == 0 or a[..., :3][m].mean() < 12

def main():
    sq_dir = sys.argv[1]; cut_dir = sys.argv[2] if len(sys.argv) > 2 else None
    man_path = os.path.join(ROOT, 'assets', 'media', 'media-manifest.json')
    man = json.load(open(man_path, encoding='utf8')); players = man['players']
    by_lc = {k.lower(): k for k in players}
    squares, cuts = {}, {}
    for f in sorted(glob.glob(os.path.join(sq_dir, '*.webp'))):
        m = re.search(r"'([^']+)'", os.path.basename(f))
        if m: squares[m.group(1)] = f
    if cut_dir:
        for f in sorted(glob.glob(os.path.join(cut_dir, '*.webp'))):
            b = os.path.splitext(os.path.basename(f))[0]
            if '_' in b: cuts[b.split('_', 1)[1]] = f
    session = None; done = skipped = 0
    for nick in sorted(set(squares) | set(cuts), key=str.lower):
        full = small = None
        cf = cuts.get(nick) or next((v for k, v in cuts.items() if k.lower() == nick.lower()), None)
        sf = squares.get(nick) or next((v for k, v in squares.items() if k.lower() == nick.lower()), None)
        if cf:
            im = Image.open(cf).convert('RGBA')
            if not is_silhouette(im): full = trim(im)
        if sf:
            cached = os.path.join(CACHE, slug(nick) + '.png')          # вырезанный фон кэшируется: повторный запуск быстрый
            if os.path.exists(cached): cut = Image.open(cached).convert('RGBA')
            else:
                from rembg import remove, new_session
                session = session or new_session(MODEL)
                cut = remove(Image.open(sf).convert('RGB'), session=session, post_process_mask=True).convert('RGBA'); cut.save(cached)
            small = thumb(cut)
            if full is None: full = trim(cut)
        if full is None: skipped += 1; continue
        if small is None: small = thumb(full)
        if full.height < 400: full = full.resize((round(full.width * 420 / full.height), 420), Image.LANCZOS)
        key = by_lc.get(nick.lower(), nick); name = slug(nick) or 'p' + str(abs(hash(nick)) % 10 ** 6)
        prev = players.get(key)
        if prev and os.path.basename(prev['file']) != name + '.webp' and sum(1 for v in players.values() if v['file'] == prev['file']) == 1: name = os.path.splitext(os.path.basename(prev['file']))[0]
        small.save(os.path.join(PL, name + '.webp'), 'WEBP', quality=88, method=6)
        full.save(os.path.join(PL, 'full', name + '.webp'), 'WEBP', quality=88, method=6)
        players[key] = {'file': f'assets/media/players/{name}.webp', 'src': 'user', 'match': nick, 'full': f'assets/media/players/full/{name}.webp'}
        by_lc[nick.lower()] = key; done += 1
    if not any(s.get('id') == 'user' for s in man['sources']): man['sources'].append({'id': 'user', 'name': 'фото игроков, добавленные владельцем проекта', 'url': '', 'license': 'материалы правообладателей'})
    man['generated'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    man['players'] = dict(sorted(players.items(), key=lambda kv: kv[0].lower()))
    json.dump(man, open(man_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    open(os.path.join(ROOT, 'assets', 'media', 'media-manifest.js'), 'w', encoding='utf8').write('/* создано tools/media — не редактировать вручную */\nwindow.CS2_MEDIA = ' + json.dumps(man, ensure_ascii=False) + ';\n')
    print(f'импортировано: {done}, пропущено (силуэты-заглушки): {skipped}')

if __name__ == '__main__':
    main()
