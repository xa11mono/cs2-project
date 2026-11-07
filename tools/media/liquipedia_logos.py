#!/usr/bin/env python3
"""
Логотипы команд CS2 Manager с Liquipedia.

Берёт все команды игры (tools/media/teams-all.json + media-manifest.json), находит страницу команды на
Liquipedia через официальный MediaWiki API, выбирает логотип для тёмной темы (darkmode → allmode → lightmode,
самый свежий год), скачивает, обрезает пустые поля, вписывает в квадрат 256×256 с полями 8% и сохраняет WebP
в assets/media/teams/. Манифест медиатеки (media-manifest.json и media-manifest.js) обновляется сам.

Правила Liquipedia API (https://liquipedia.net/api-terms-of-use): сжатие gzip, понятный User-Agent с контактом,
не чаще 1 запроса в 2 секунды. Скрипт соблюдает их и кэширует ответы в tools/media/.lpcache/.

Установка:   pip install requests pillow
Запуск из папки игры:
    python tools/media/liquipedia_logos.py                     # все команды, заменить логотипы
    python tools/media/liquipedia_logos.py --missing-only      # только команды без логотипа
    python tools/media/liquipedia_logos.py --teams "NAVI,FAZE" # выбранные команды
    python tools/media/liquipedia_logos.py --dry-run           # только найти и показать, ничего не скачивать
    python tools/media/liquipedia_logos.py --light             # логотипы для светлой темы
    python tools/media/liquipedia_logos.py --missing-only --hltv  # чего нет на Liquipedia — взять с HLTV
        (Chrome должен быть запущен с --remote-debugging-port=9222, нужен pip install playwright)
Старые файлы перед заменой копируются в assets/media/teams/_backup/.
Отчёт: tools/media/liquipedia_logos_report.csv (что найдено, какой файл, что не нашлось).
"""
import argparse, csv, hashlib, io, json, os, re, shutil, sys, time, unicodedata

try:
    import requests
    from PIL import Image
except ImportError:
    sys.exit('Нужны библиотеки: pip install requests pillow')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MEDIA = os.path.join(ROOT, 'assets', 'media')
TEAMS_DIR = os.path.join(MEDIA, 'teams')
MANIFEST = os.path.join(MEDIA, 'media-manifest.json')
TEAMS_LIST = os.path.join(os.path.dirname(__file__), 'teams-all.json')
CACHE = os.path.join(os.path.dirname(__file__), '.lpcache')
REPORT = os.path.join(os.path.dirname(__file__), 'liquipedia_logos_report.csv')
API = 'https://liquipedia.net/counterstrike/api.php'
DELAY = 2.1  # секунды между запросами (требование Liquipedia — не чаще 1 в 2 с)
SIZE, PAD = 256, 0.08

# Названия в игре → страницы Liquipedia (там, где они отличаются). Остальные ищутся сами.
ALIAS = {
    'NAVI': 'Natus Vincere', 'NAVI Junior': 'Natus Vincere Junior', 'FAZE': 'FaZe Clan', 'G2': 'G2 Esports', 'G2 Ares': 'G2 Ares',
    'NIP': 'Ninjas in Pyjamas', 'The Mongolz': 'The MongolZ', 'BETBOOM': 'BetBoom Team', 'paiN': 'paiN Gaming', 'paiN Academy': 'paiN Academy',
    'Aurora': 'Aurora Gaming', 'Aurora YB': 'Aurora Young Blud', 'FUT': 'FUT Esports', 'Legacy': 'Legacy', '9z': '9z Team', 'BC.GAME': 'BC.Game Esports',
    'Sangal': 'Sangal Esports', 'Bounty Hunters': 'Bounty Hunters Esports', 'CYBERSHOKE': 'CYBERSHOKE Esports', 'Rebels': 'Rebels Gaming',
    'Lynn Vision': 'Lynn Vision Gaming', 'Imperial': 'Imperial Esports', 'fnatic': 'Fnatic', 'fnatic Rising': 'Fnatic Rising', 'Luminosity': 'Luminosity Gaming',
    'Inner Circle': 'Inner Circle Esports', '1win': '1WIN', 'Sashi': 'Sashi Esport', 'Nemiga': 'Nemiga Gaming', 'Wildcard': 'Wildcard Gaming',
    'BBL': 'BBL Esports', 'Betclic': 'Betclic Apogee Esports', 'Spirit Academy': 'Team Spirit Academy', 'Vitality Academy': 'Team Vitality Academy',
    'Falcons Force': 'Falcons Force', 'MOUZ NXT': 'MOUZ NXT', 'Astralis Talent': 'Astralis Talent', 'HEROIC Academy': 'HEROIC Academy',
    'FURIA Academy': 'FURIA Academy', 'BIG Academy': 'BIG Academy', 'Passion UA': 'Passion UA', 'Eternal Fire': 'Eternal Fire', 'Keyd Stars': 'Keyd Stars',
    'Party Astronauts': 'Party Astronauts', 'Marca Registrada': 'Marca Registrada', 'Change The Game': 'Change The Game', 'KRÜ': 'KRÜ Esports',
    'Chinggis Warriors': 'Chinggis Warriors', 'Rare Atom': 'Rare Atom', 'Last Bullet': 'Last Bullet', 'Deep Cross': 'Deep Cross Gaming',
    'Just Swing': 'Just Swing', 'Nuclear TiGeRES': 'Nuclear TigeRES', 'TYLOO': 'TYLOO', 'MIBR': 'MIBR', 'NRG': 'NRG Esports', 'OG': 'OG',
    'Without a Roof': 'Without a Roof', 'WW Team': 'WW Team (Russian team)', 'BESTIA': 'BESTIA', 'QUAZAR': 'QUAZAR', 'Galorys': 'Galorys', 'magic': 'Magic (Russian team)',
}

SUB = re.compile(r'academy|junior|youth|female|women|fe(?=\d|$)|talent|nxt|rising|ares|force|youngblud|yb|ladies')
sess = requests.Session()
_last = [0.0]


def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', s)


def slug(name):
    return norm(name) or hashlib.md5(name.encode()).hexdigest()[:10]


def wait():
    d = DELAY - (time.time() - _last[0])
    if d > 0:
        time.sleep(d)
    _last[0] = time.time()


def api(params):
    """Запрос к API с кэшем на диске (повторный запуск почти не ходит в сеть)."""
    params = dict(params, format='json', formatversion=2)
    key = hashlib.sha1(json.dumps(params, sort_keys=True).encode()).hexdigest()
    path = os.path.join(CACHE, key + '.json')
    if os.path.exists(path):
        return json.load(open(path, encoding='utf-8'))
    for attempt in range(4):
        wait()
        r = sess.get(API, params=params, timeout=30)
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(30 * (attempt + 1)); continue
        r.raise_for_status()
        j = r.json()
        os.makedirs(CACHE, exist_ok=True)
        json.dump(j, open(path, 'w', encoding='utf-8'))
        return j
    raise RuntimeError('Liquipedia не отвечает')


CONTENT = {}  # вики-текст страниц команд (из одного запроса на пачку вариантов названия)
INFOBOX = re.compile(r'\{\{\s*Infobox[ _]team', re.I)


def contents(titles):
    """Вики-текст нескольких страниц одним запросом; возвращает {запрошенное название: итоговая страница} для страниц с инфобоксом команды."""
    titles = [t for t in dict.fromkeys(titles) if t and '|' not in t][:50]
    if not titles:
        return {}
    j = api({'action': 'query', 'titles': '|'.join(titles), 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'redirects': 1})
    q = j.get('query', {})
    hop = {}
    for x in q.get('normalized', []) + q.get('redirects', []):
        hop[x['from']] = x['to']
    ok = set()
    for pg in q.get('pages', []):
        if pg.get('missing'):
            continue
        rv = (pg.get('revisions') or [{}])[0]
        text = rv.get('slots', {}).get('main', {}).get('content', '') or rv.get('content', '')
        if INFOBOX.search(text):
            CONTENT[pg['title']] = text; ok.add(pg['title'])
    out = {}
    for t in titles:
        r = t
        for _ in range(3):
            r = hop.get(r, r)
        if r in ok:
            out[t] = r
    return out


def resolve(name):
    """Название в игре → страница команды на Liquipedia (страница обязана содержать «Infobox team»).
    1) псевдоним и типовые варианты названия одним запросом; 2) поиск по заголовкам и по началу заголовка."""
    base = re.sub(r'\s+(Esports?|Gaming|Team|Club)$', '', name, flags=re.I)
    variants = [ALIAS.get(name), name, name.title() if name.isupper() else None, name.capitalize(),
                f'{base} Esports', f'{base} Gaming', f'{base} Team', f'Team {base}', f'{base} (team)', f'{base} Esport', f'{base} eSports', f'{base} Club',
                name.replace(' ', ''), re.sub(r'([a-z])([A-Z])', r'\1 \2', name)]
    found = contents([v for v in variants if v])
    for v in variants:
        if v and v in found:
            return found[v]
    n = norm(name)
    cands = []
    for params in ({'list': 'search', 'srsearch': f'intitle:"{name}"', 'srlimit': 10, 'srnamespace': 0},
                   {'list': 'prefixsearch', 'pssearch': name, 'pslimit': 10, 'psnamespace': 0}):
        j = api(dict(params, action='query'))
        q = j.get('query', {})
        cands += [x['title'] for x in q.get('search', []) + q.get('prefixsearch', [])]
    cands = [t for t in dict.fromkeys(cands) if '/' not in t and (n in norm(t) or norm(re.sub(r'\s*\(.*\)$', '', t)) in n)]
    found = contents(cands)
    for t in cands:
        if t in found:
            return found[t]
    return None


def infobox_files(text, light=False):
    """Файлы логотипа из инфобокса в порядке предпочтения; для «full»-логотипа сначала пробуем значок без надписи."""
    vals = {}
    for k, v in re.findall(r'\|\s*(imagedark|imagelight|image|logodark|logo)\s*=\s*([^\n|}]+)', text, re.I):
        v = v.strip()
        if v and not v.lower().startswith('{{') and k.lower() not in vals:
            vals[k.lower()] = v
    order = ['image', 'imagelight', 'logo', 'imagedark', 'logodark'] if light else ['imagedark', 'logodark', 'image', 'logo', 'imagelight']
    out = []
    for k in order:
        f = vals.get(k)
        if not f:
            continue
        icon = re.sub(r'\s+full(?=\s|\.)', '', f, flags=re.I)
        modes = ['darkmode', 'allmode', 'lightmode'] if not light else ['lightmode', 'allmode', 'darkmode']
        icons = [re.sub(r'(dark|all|light)mode', m, icon, flags=re.I) for m in modes] if icon != f else []
        # значок светлой темы на тёмном фоне не читается — он идёт после исходного файла
        for x in icons[:2] + [f] + icons[2:]:
            if x not in out:
                out.append(x)
    return out


def file_urls(files):
    if not files:
        return {}
    j = api({'action': 'query', 'titles': '|'.join('File:' + f for f in files[:50]), 'prop': 'imageinfo', 'iiprop': 'url|mime'})
    q = j.get('query', {})
    norm_map = {x['to']: x['from'] for x in q.get('normalized', [])}
    out = {}
    for pg in q.get('pages', []):
        info = (pg.get('imageinfo') or [{}])[0]
        if info.get('url'):
            asked = norm_map.get(pg['title'], pg['title'])
            out[asked.replace('File:', '')] = info['url']; out[pg['title'].replace('File:', '')] = info['url']
    return out


def pick_logo(title, light=False):
    """Логотип команды — из инфобокса страницы (imagedark для тёмной темы); запасной путь — по именам файлов на странице."""
    text = CONTENT.get(title)
    if text is None:
        contents([title]); text = CONTENT.get(title, '')
    files = infobox_files(text, light)
    urls = file_urls(files)
    for f in files:
        if f in urls or f.replace('_', ' ') in urls:
            return f, urls.get(f) or urls.get(f.replace('_', ' '))
    return pick_by_name(title, light)


def pick_by_name(title, light=False):
    """Запасной путь: файл на странице, в имени которого есть название команды и пометка темы."""
    j = api({'action': 'query', 'titles': title, 'prop': 'images|pageimages', 'imlimit': 'max', 'piprop': 'original'})
    page = (j.get('query', {}).get('pages') or [{}])[0]
    files = [i['title'] for i in page.get('images', [])]
    tn = norm(re.sub(r'\s*\(.*\)$', '', title))
    prefer = ['lightmode', 'allmode', 'darkmode'] if light else ['darkmode', 'allmode', 'lightmode']

    def score(f):
        base = norm(f.replace('File:', ''))
        if tn not in base:
            return None
        mode = next((i for i, m in enumerate(prefer) if m in base), None)
        if mode is None:
            if 'logo' not in base:
                return None
            mode = 3
        years = [int(y) for y in re.findall(r'(?:19|20)\d\d', f)]
        rest = re.sub(r'(?:19|20)\d\d|darkmode|lightmode|allmode|logo|full|icon|std|png|svg|webp|jpg', '', base.replace(tn, '', 1))
        sub = 0 if SUB.search(tn) else len(SUB.findall(base.replace(tn, '', 1)))
        return (sub, len(rest), 'full' in base, mode, -(max(years) if years else 0))
    cands = sorted((s, f) for f in files if (s := score(f)) is not None)
    if cands:
        f = cands[0][1].replace('File:', '')
        u = file_urls([f])
        if u.get(f):
            return f, u[f]
    orig = page.get('original', {}).get('source')
    return ('pageimage', orig) if orig else (None, None)


def download(url):
    wait()
    r = sess.get(url, timeout=60)
    r.raise_for_status()
    if 'svg' in r.headers.get('content-type', '') or url.lower().endswith('.svg'):
        try:
            import cairosvg
            return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=r.content, output_width=1024))).convert('RGBA')
        except ImportError:
            raise RuntimeError('SVG: установите cairosvg (pip install cairosvg)')
    return Image.open(io.BytesIO(r.content)).convert('RGBA')


def square(im):
    """Обрезка по видимому содержимому → квадрат с полями 8% → 256×256."""
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox() or im.getbbox()
    if box:
        im = im.crop(box)
    w, h = im.size
    side = int(max(w, h) / (1 - 2 * PAD))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


HLTV_URLS = os.path.join(os.path.dirname(__file__), 'hltv-team-urls.json')


def hltv_logos(names, man, light=False):
    """Запасной источник — HLTV через ваш открытый Chrome (как в исходном парсере): Cloudflare HLTV не пускает
    обычные запросы, а вкладка браузера проходит. Запустите Chrome с --remote-debugging-port=9222.
    Ссылка на команду — из hltv-team-urls.json (собрано из ваших CSV), иначе поиск по HLTV."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('HLTV: нужен playwright (pip install playwright)'); return {}
    known = json.load(open(HLTV_URLS, encoding='utf-8')) if os.path.exists(HLTV_URLS) else {}
    got = {}
    with sync_playwright() as p:
        try:
            br = p.chromium.connect_over_cdp('http://localhost:9222')
        except Exception as e:
            print(f'HLTV: нет браузера на порту 9222 ({e}). Запустите Chrome: chrome --remote-debugging-port=9222'); return {}
        ctx = br.contexts[0] if br.contexts else br.new_context()
        page = ctx.new_page()
        for name in names:
            try:
                url = known.get(name)
                if not url:
                    page.goto('https://www.hltv.org/search?query=' + requests.utils.quote(name), wait_until='domcontentloaded', timeout=30000); time.sleep(2.5)
                    links = page.eval_on_selector_all("a[href^='/team/']", "els => els.map(a => [a.getAttribute('href'), a.textContent.trim()])")
                    best = next((h for h, t in links if norm(t) == norm(name)), None) or next((h for h, t in links if norm(name) in norm(t)), None)
                    url = 'https://www.hltv.org' + best if best else None
                if not url:
                    print(f'HLTV · {name}: команда не найдена'); continue
                page.goto(url, wait_until='domcontentloaded', timeout=30000); time.sleep(2.5)
                srcs = page.eval_on_selector_all('.profile-team-logo-container img, img.teamlogo',
                    "els => els.map(i => [i.getAttribute('src') || '', i.className || ''])")
                srcs = [(u if u.startswith('http') else 'https://www.hltv.org' + u, c) for u, c in srcs if u]
                if not srcs:
                    print(f'HLTV · {name}: логотипа на странице нет'); continue
                pick = [u for u, c in srcs if ('day-only' in c) == light and ('night-only' in c) != light] or [u for u, c in srcs]
                r = page.request.get(pick[0])
                if not r.ok:
                    print(f'HLTV · {name}: не скачалось ({r.status})'); continue
                body = r.body()
                if pick[0].lower().split('?')[0].endswith('.svg'):
                    import cairosvg
                    im = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=body, output_width=1024))).convert('RGBA')
                else:
                    im = Image.open(io.BytesIO(body)).convert('RGBA')
                got[name] = (square(im), pick[0], url)
                print(f'HLTV · {name}: ✓')
            except Exception as e:
                print(f'HLTV · {name}: ошибка — {e}')
            time.sleep(1.5)
        page.close()
    return got


def team_names(man):
    names = []
    if os.path.exists(TEAMS_LIST):
        names += json.load(open(TEAMS_LIST, encoding='utf-8'))
    names += list((man.get('teams') or {}).keys())
    out, seen = [], set()
    for n in names:
        if n not in seen:
            seen.add(n); out.append(n)
    return out


def save_manifest(man):
    json.dump(man, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(MEDIA, 'media-manifest.js'), 'w', encoding='utf-8').write(
        '/* создано tools/media — не редактировать вручную */\nwindow.CS2_MEDIA = ' + json.dumps(man, ensure_ascii=False) + ';\n')


def main():
    ap = argparse.ArgumentParser(description='Логотипы команд с Liquipedia')
    ap.add_argument('--teams', help='список через запятую (по умолчанию — все команды игры)')
    ap.add_argument('--missing-only', action='store_true', help='только команды без логотипа с Liquipedia/HLTV')
    ap.add_argument('--dry-run', action='store_true', help='найти и показать, ничего не скачивать')
    ap.add_argument('--light', action='store_true', help='логотипы для светлой темы (по умолчанию — для тёмной)')
    ap.add_argument('--hltv', action='store_true', help='не найденные на Liquipedia — взять с HLTV через Chrome на порту 9222 (нужен playwright)')
    ap.add_argument('--contact', default=os.environ.get('LIQUIPEDIA_CONTACT', 'cs2-manager-fan-project'),
                    help='контакт для User-Agent (email или ссылка) — Liquipedia просит его указывать')
    a = ap.parse_args()
    sess.headers.update({'User-Agent': f'CS2Manager-LogoFetcher/1.2 ({a.contact})', 'Accept-Encoding': 'gzip'})

    man = json.load(open(MANIFEST, encoding='utf-8'))
    man.setdefault('teams', {})
    names = [n.strip() for n in a.teams.split(',')] if a.teams else team_names(man)
    if a.missing_only:
        # «нет логотипа» = нет файла или он не с Liquipedia/HLTV (старые логотипы из модов LIGA тоже обновляются)
        names = [n for n in names if not (man['teams'].get(n) and os.path.exists(os.path.join(ROOT, man['teams'][n]['file']))
                                          and re.match(r'(liquipedia|hltv):', man['teams'][n].get('src', '')))]
    os.makedirs(TEAMS_DIR, exist_ok=True)
    backup = os.path.join(TEAMS_DIR, '_backup')
    rows, ok = [], 0
    print(f'Команд: {len(names)} · ~{len(names) * 3 * DELAY / 60:.0f} мин (лимит Liquipedia — 1 запрос в 2 с, ответы кэшируются)')

    for i, name in enumerate(names, 1):
        tag = f'[{i}/{len(names)}] {name}'
        try:
            title = resolve(name)
            if not title:
                print(f'{tag}: страница команды не найдена'); rows.append([name, '', '', '', 'не найдена']); continue
            fname, url = pick_logo(title, a.light)
            if not url:
                print(f'{tag}: {title} — логотипа нет'); rows.append([name, title, '', '', 'нет логотипа']); continue
            if a.dry_run:
                print(f'{tag}: {title} → {fname}'); rows.append([name, title, fname, url, 'найден']); continue
            im = square(download(url))
            old = man['teams'].get(name, {}).get('file')
            rel = old if old and old.endswith('.webp') else f'assets/media/teams/{slug(name)}.webp'
            dst = os.path.join(ROOT, rel)
            if os.path.exists(dst):
                os.makedirs(backup, exist_ok=True)
                shutil.copy2(dst, os.path.join(backup, os.path.basename(dst)))
            im.save(dst, 'WEBP', quality=90, method=6)
            man['teams'][name] = {'file': rel, 'src': f'liquipedia:{fname}', 'match': title, 'page': f'https://liquipedia.net/counterstrike/{title.replace(" ", "_")}'}
            save_manifest(man)  # после каждой команды — прерванный запуск ничего не теряет
            ok += 1
            print(f'{tag}: {title} → {fname} ✓'); rows.append([name, title, fname, url, 'сохранён'])
        except Exception as e:
            print(f'{tag}: ошибка — {e}'); rows.append([name, '', '', '', f'ошибка: {e}'])

    miss0 = [r[0] for r in rows if r[4] not in ('сохранён', 'найден')]
    if a.hltv and miss0 and not a.dry_run:
        print(f'\nHLTV: ищу {len(miss0)} команд…')
        for name, (im, src, url) in hltv_logos(miss0, man, a.light).items():
            old = man['teams'].get(name, {}).get('file')
            rel = old if old and old.endswith('.webp') else f'assets/media/teams/{slug(name)}.webp'
            dst = os.path.join(ROOT, rel)
            if os.path.exists(dst):
                os.makedirs(backup, exist_ok=True); shutil.copy2(dst, os.path.join(backup, os.path.basename(dst)))
            im.save(dst, 'WEBP', quality=90, method=6)
            man['teams'][name] = {'file': rel, 'src': 'hltv:' + src, 'match': name, 'page': url}
            save_manifest(man); ok += 1
            for r in rows:
                if r[0] == name: r[1:] = [url, src, src, 'сохранён (HLTV)']
    # отчёт дополняется: строки этого запуска заменяют прежние строки тех же команд
    old = []
    if os.path.exists(REPORT):
        with open(REPORT, encoding='utf-8-sig') as f:
            old = [r for r in list(csv.reader(f, delimiter=';'))[1:] if r and r[0] not in {x[0] for x in rows}]
    with open(REPORT, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f, delimiter=';'); w.writerow(['Команда в игре', 'Страница Liquipedia', 'Файл', 'URL', 'Итог']); w.writerows(old + rows)
    miss = [r[0] for r in rows if r[4] not in ('сохранён', 'найден')]
    print(f'\nГотово: {ok} логотипов сохранено' + (f', не нашлось {len(miss)}: {", ".join(miss)}' if miss else '') + f'\nОтчёт: {REPORT}')
    if miss:
        print('Для ненайденных допишите название страницы Liquipedia в словарь ALIAS в начале скрипта и запустите с --teams "…".')


if __name__ == '__main__':
    main()
