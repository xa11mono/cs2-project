"""
HLTV demo downloader.

Открывает настоящий браузер (свой Chromium/Chrome или твой Brave через порт 9222),
ищет на HLTV матчи с демками на нужных картах за нужные годы и по уровню (звёздам),
и скачивает демки в выбранную папку. Один и тот же матч никогда не качается дважды,
даже если в Bo3 сыграно две нужные карты (история хранится в downloaded.json).

Запуск без аргументов -> программа сама спросит всё в консоли:
    python hltv_demos.py

Или сразу аргументами:
    python hltv_demos.py --maps mirage,inferno --years 2023-2024 --tiers 1,2 --out D:\\demos
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import zipfile
from datetime import datetime

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

BASE = "https://www.hltv.org"


class LimitReached(Exception):
    pass

DEBUG_PORT = 9222
STATE_FILE = "downloaded.json"
PROFILE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "browser_profile")

# Название карты, как его пишет HLTV на странице матча -> код для фильтра /results
MAPS = {
    "mirage": "de_mirage",
    "inferno": "de_inferno",
    "nuke": "de_nuke",
    "ancient": "de_ancient",
    "anubis": "de_anubis",
    "dust2": "de_dust2",
    "vertigo": "de_vertigo",
    "overpass": "de_overpass",
    "train": "de_train",
    "cache": "de_cache",
    "cobblestone": "de_cbble",
}
MAP_ALIASES = {"d2": "dust2", "dust 2": "dust2", "de_dust2": "dust2", "cbble": "cobblestone"}

# Уровень турнира -> сколько звёзд у матча на HLTV (звёзды ставятся по рейтингу команд)
TIERS = {
    1: (3, 5),  # tier-1: 3-5 звёзд (топ-команды, крупные турниры)
    2: (1, 2),  # tier-2: 1-2 звезды
    3: (0, 0),  # tier-3: 0 звёзд
}


# ----------------------------------------------------------------- утилиты

def clean(text):
    return " ".join((text or "").split()).strip()


def sanitize_filename(name: str) -> str:
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    return re.sub(r"\s+", " ", name).strip()[:150]


def normalize_map(name: str) -> str:
    n = clean(name).lower()
    n = MAP_ALIASES.get(n, n)
    if n.startswith("de_"):
        n = n[3:]
    return n.replace(" ", "")


def parse_years(text: str):
    years = set()
    for part in re.split(r"[,\s]+", text.strip()):
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            years.update(range(int(a), int(b) + 1))
        else:
            years.add(int(part))
    return sorted(years)


def parse_tiers(text: str):
    tiers = sorted({int(t) for t in re.split(r"[,\s]+", text.strip()) if t})
    bad = [t for t in tiers if t not in TIERS]
    if bad:
        raise ValueError(f"Неизвестный tier: {bad}. Допустимо: 1, 2, 3")
    return tiers


def stars_allowed(stars: int, tiers) -> bool:
    return any(lo <= stars <= hi for lo, hi in (TIERS[t] for t in tiers))


def load_state(out_dir):
    path = os.path.join(out_dir, STATE_FILE)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"matches": {}}


def save_state(out_dir, state):
    path = os.path.join(out_dir, STATE_FILE)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


# ----------------------------------------------------------------- браузер

def wait_for_cloudflare(page, max_wait=180):
    """Если HLTV показал проверку Cloudflare - ждём, пока ты пройдёшь её в окне браузера."""
    start = time.time()
    warned = False
    while True:
        try:
            title = (page.title() or "").lower()
        except Exception:
            title = ""
        if "just a moment" not in title and "attention required" not in title and "момент" not in title:
            return True
        if not warned:
            print("  [!] Cloudflare-проверка. Пройди её в окне браузера, я подожду...")
            warned = True
        if time.time() - start > max_wait:
            print("  [-] Не дождался прохождения Cloudflare.")
            return False
        time.sleep(2)


def open_page(page, url, settle=1.5):
    for attempt in range(3):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            if not wait_for_cloudflare(page):
                return None
            time.sleep(settle)
            return BeautifulSoup(page.content(), "html.parser")
        except PWTimeout:
            print(f"  [-] Таймаут загрузки ({attempt + 1}/3): {url}")
            time.sleep(3)
        except Exception as e:
            print(f"  [-] Ошибка загрузки ({attempt + 1}/3): {e}")
            time.sleep(3)
    return None


def start_browser(p, args):
    """Возвращает (context, page, close_fn)."""
    if args.cdp:
        print(f"[*] Подключение к открытому браузеру (порт {DEBUG_PORT})...")
        browser = p.chromium.connect_over_cdp(f"http://localhost:{DEBUG_PORT}")
        context = browser.contexts[0]
        page = context.new_page()
        return context, page, lambda: page.close()

    print("[*] Запускаю браузер...")
    launch_kwargs = dict(
        user_data_dir=PROFILE_DIR,
        headless=False,
        accept_downloads=True,
        viewport=None,
        args=["--start-maximized", "--disable-blink-features=AutomationControlled"],
    )
    context = None
    for channel in ("chrome", "msedge", None):  # сначала установленный Chrome, потом Edge, потом Chromium Playwright
        try:
            kw = dict(launch_kwargs)
            if channel:
                kw["channel"] = channel
            context = p.chromium.launch_persistent_context(**kw)
            print(f"  [+] Браузер: {channel or 'chromium (playwright)'}")
            break
        except Exception:
            continue
    if context is None:
        raise RuntimeError("Не удалось запустить браузер. Выполни: python -m playwright install chromium")
    page = context.pages[0] if context.pages else context.new_page()
    return context, page, lambda: context.close()


# ----------------------------------------------------------------- парсинг HLTV

def results_url(year, map_code, offset):
    return (f"{BASE}/results?startDate={year}-01-01&endDate={year}-12-31"
            f"&map={map_code}&content=demo&offset={offset}")


def parse_results_page(soup):
    """Список матчей со страницы /results: id, url, stars, команды, турнир."""
    out = []
    for con in soup.select("div.result-con"):
        a = con.select_one("a[href*='/matches/']")
        if not a:
            continue
        m = re.match(r"^/matches/(\d+)/", a.get("href", ""))
        if not m:
            continue
        stars = len(con.select(".stars i"))
        teams = [clean(t.text) for t in con.select(".team-cell .team")]
        event = con.select_one(".event-name")
        out.append({
            "id": m.group(1),
            "url": BASE + a["href"],
            "stars": stars,
            "teams": teams,
            "event": clean(event.text) if event else "",
        })
    return out


def parse_match_page(soup):
    """Карты, которые реально сыграны, ссылка на демку, турнир, дата."""
    played = []
    for holder in soup.select("div.mapholder"):
        name_el = holder.select_one(".mapname")
        if not name_el:
            continue
        name = normalize_map(name_el.text)
        scores = [clean(s.text) for s in holder.select(".results-team-score")]
        if holder.select_one(".optional") or not scores or all(s in ("", "-") for s in scores):
            continue  # карта не игралась (decider не понадобился)
        played.append(name)

    demo = soup.select_one("a[data-demo-link]")
    demo_link = demo.get("data-demo-link") if demo else None
    if demo_link and demo_link.startswith("/"):
        demo_link = BASE + demo_link

    event_el = soup.select_one(".timeAndEvent .event a, .event.text-ellipsis a")
    event_href = event_el.get("href", "") if event_el else ""
    em = re.match(r"^/events/(\d+)/", event_href)

    date = ""
    date_el = soup.select_one(".timeAndEvent .date[data-unix]")
    if date_el:
        try:
            date = datetime.fromtimestamp(int(date_el["data-unix"]) / 1000).strftime("%Y-%m-%d")
        except Exception:
            pass

    teams = [clean(t.text) for t in soup.select(".teamsBox .teamName")][:2]
    return {
        "maps": played,
        "demo_link": demo_link,
        "event": clean(event_el.text) if event_el else "",
        "event_id": em.group(1) if em else "",
        "date": date,
        "teams": teams,
    }


# ----------------------------------------------------------------- скачивание

def download_demo(page, match_url, target_dir, timeout_s=600):
    """Жмёт кнопку GOTV Demo в браузере и сохраняет файл. Возвращает путь или None."""
    selector = "a[data-demo-link]"
    try:
        page.wait_for_selector(selector, timeout=15000)
    except PWTimeout:
        return None
    try:
        with page.expect_download(timeout=timeout_s * 1000) as dl_info:
            page.click(selector)
        dl = dl_info.value
        name = sanitize_filename(dl.suggested_filename or "demo.rar")
        path = os.path.join(target_dir, name)
        base, ext = os.path.splitext(path)
        i = 1
        while os.path.exists(path):
            path = f"{base} ({i}){ext}"
            i += 1
        dl.save_as(path)
        if dl.failure():
            print(f"  [-] Ошибка скачивания: {dl.failure()}")
            return None
        return path
    except PWTimeout:
        print("  [-] Скачивание не началось / не закончилось вовремя.")
    except Exception as e:
        print(f"  [-] Ошибка скачивания: {e}")
    finally:
        # HLTV иногда открывает рекламную вкладку - закрываем лишнее
        for extra in page.context.pages:
            if extra is not page and extra.url.startswith("http") and "hltv.org" not in extra.url:
                try:
                    extra.close()
                except Exception:
                    pass
    return None


def find_7z():
    for c in ("7z", "7za", r"C:\Program Files\7-Zip\7z.exe", r"C:\Program Files (x86)\7-Zip\7z.exe"):
        if shutil.which(c) or os.path.exists(c):
            return shutil.which(c) or c
    return None


def extract_maps(archive, wanted_maps, dest_dir, prefix):
    """Достаёт из архива только .dem нужных карт. Возвращает список файлов или None, если не смог."""
    wanted = set(wanted_maps)
    out = []

    def is_wanted(member):
        low = os.path.basename(member).lower()
        return low.endswith(".dem") and any(m in low.replace("_", "").replace("-", "") for m in wanted)

    def target_for(member):
        return os.path.join(dest_dir, sanitize_filename(f"{prefix} - {os.path.basename(member)}"))

    if zipfile.is_zipfile(archive):
        with zipfile.ZipFile(archive) as z:
            for member in z.namelist():
                if is_wanted(member):
                    t = target_for(member)
                    with z.open(member) as src, open(t, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    out.append(t)
        return out

    seven = find_7z()
    if seven:
        listing = subprocess.run([seven, "l", "-slt", archive], capture_output=True, text=True, errors="ignore")
        members = [l[7:].strip() for l in listing.stdout.splitlines() if l.startswith("Path = ")][1:]
        tmp = os.path.join(dest_dir, "_tmp_extract")
        os.makedirs(tmp, exist_ok=True)
        for member in members:
            if is_wanted(member):
                subprocess.run([seven, "e", "-y", f"-o{tmp}", archive, member], capture_output=True)
                src = os.path.join(tmp, os.path.basename(member))
                if os.path.exists(src):
                    t = target_for(member)
                    shutil.move(src, t)
                    out.append(t)
        shutil.rmtree(tmp, ignore_errors=True)
        return out

    try:
        import rarfile  # pip install rarfile (+ нужен UnRAR в PATH)
        with rarfile.RarFile(archive) as r:
            for member in r.namelist():
                if is_wanted(member):
                    t = target_for(member)
                    with r.open(member) as src, open(t, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    out.append(t)
        return out
    except Exception:
        return None


# ----------------------------------------------------------------- ввод

def ask(prompt, default=""):
    val = input(f"{prompt}" + (f" [{default}]" if default else "") + ": ").strip()
    return val or default


def get_settings():
    ap = argparse.ArgumentParser(description="Скачивание демок с HLTV по картам, годам и уровню турниров")
    ap.add_argument("--maps", help="карты через запятую: mirage,inferno,...")
    ap.add_argument("--years", help="годы: 2024 или 2022-2024 или 2021,2023")
    ap.add_argument("--tiers", help="уровни через запятую: 1,2,3 (1=3-5★, 2=1-2★, 3=0★)")
    ap.add_argument("--out", help="папка для демок")
    ap.add_argument("--limit", type=int, help="максимум новых матчей за запуск (0 = без лимита)")
    ap.add_argument("--per-event", type=int, help="максимум матчей с одного турнира (0 = без лимита)")
    ap.add_argument("--extract", choices=["yes", "no"], help="вытащить из архива только .dem нужных карт")
    ap.add_argument("--cdp", action="store_true", help="подключиться к уже открытому Brave/Chrome на порту 9222")
    args = ap.parse_args()

    print("=" * 60)
    print(" HLTV демки: карты / годы / tier")
    print("=" * 60)
    print(" Карты:", ", ".join(MAPS))
    if not args.maps:
        args.maps = ask("Какие карты (через запятую)", "mirage")
    if not args.years:
        args.years = ask("Какие годы (2024, 2022-2024, 2021,2023)", str(datetime.now().year))
    if not args.tiers:
        print(" Tier: 1 = 3-5★ (топ), 2 = 1-2★, 3 = 0★")
        args.tiers = ask("Какие tier (через запятую)", "1")
    if not args.out:
        args.out = ask("Папка для демок", os.path.abspath("hltv_demos"))
    if args.limit is None:
        args.limit = int(ask("Сколько матчей скачать максимум (0 = все)", "20"))
    if args.per_event is None:
        args.per_event = int(ask("Максимум матчей с одного турнира (0 = без лимита)", "0"))
    if args.extract is None:
        args.extract = ask("Вытаскивать из архива только нужные карты? (yes/no)", "yes").lower()

    args.maps = [normalize_map(m) for m in args.maps.split(",") if m.strip()]
    unknown = [m for m in args.maps if m not in MAPS]
    if unknown:
        sys.exit(f"[-] Неизвестные карты: {unknown}. Доступно: {', '.join(MAPS)}")
    args.years = parse_years(args.years)
    args.tiers = parse_tiers(args.tiers)
    args.extract = args.extract.startswith("y") or args.extract.startswith("д")
    return args


# ----------------------------------------------------------------- main

def main():
    args = get_settings()
    os.makedirs(args.out, exist_ok=True)
    state = load_state(args.out)
    done = state["matches"]

    print(f"\n[*] Карты: {args.maps} | Годы: {args.years} | Tier: {args.tiers} | Папка: {args.out}")
    print(f"[*] Уже скачано раньше: {len(done)} матчей (они будут пропущены)\n")

    per_event = {}
    for info in done.values():
        if info.get("event_id"):
            per_event[info["event_id"]] = per_event.get(info["event_id"], 0) + 1

    downloaded_now = 0
    seen_now = set()

    with sync_playwright() as p:
        try:
            context, page, close = start_browser(p, args)
        except Exception as e:
            sys.exit(f"[-] {e}\nДля --cdp запусти Brave с флагом --remote-debugging-port={DEBUG_PORT}")
        page.set_default_timeout(45000)

        try:
            for year in args.years:
                for map_name in args.maps:
                    offset = 0
                    while True:
                        if args.limit and downloaded_now >= args.limit:
                            raise LimitReached
                        url = results_url(year, MAPS[map_name], offset)
                        print(f"[*] {year} / {map_name} / страница {offset // 100 + 1}")
                        soup = open_page(page, url, settle=2.0)
                        if soup is None:
                            break
                        rows = parse_results_page(soup)
                        if not rows:
                            break
                        for row in rows:
                            if args.limit and downloaded_now >= args.limit:
                                raise LimitReached
                            mid = row["id"]
                            if mid in done or mid in seen_now:
                                continue
                            seen_now.add(mid)
                            if not stars_allowed(row["stars"], args.tiers):
                                continue

                            title = " vs ".join(row["teams"]) or mid
                            print(f"  -> {title} | {row['event']} | {row['stars']}★")
                            msoup = open_page(page, row["url"])
                            if msoup is None:
                                continue
                            info = parse_match_page(msoup)
                            wanted = [m for m in info["maps"] if m in args.maps]
                            if not wanted:
                                print("     нужная карта не сыграна - пропуск")
                                continue
                            if not info["demo_link"]:
                                print("     демки нет - пропуск")
                                continue
                            ev = info["event_id"]
                            if args.per_event and ev and per_event.get(ev, 0) >= args.per_event:
                                print("     лимит матчей с этого турнира - пропуск")
                                continue

                            year_dir = os.path.join(args.out, str(year))
                            os.makedirs(year_dir, exist_ok=True)
                            print(f"     скачиваю (карты: {', '.join(wanted)})...")
                            archive = download_demo(page, row["url"], year_dir)
                            if not archive:
                                continue

                            files = [archive]
                            if args.extract:
                                prefix = sanitize_filename(f"{info['date']} {title} {info['event']}")
                                extracted = extract_maps(archive, wanted, year_dir, prefix)
                                if extracted:
                                    os.remove(archive)
                                    files = extracted
                                elif extracted is None:
                                    print("     [!] Не смог распаковать (поставь 7-Zip) - оставил архив целиком")

                            done[mid] = {
                                "url": row["url"],
                                "teams": info["teams"] or row["teams"],
                                "event": info["event"] or row["event"],
                                "event_id": ev,
                                "date": info["date"],
                                "stars": row["stars"],
                                "maps": wanted,
                                "files": [os.path.basename(f) for f in files],
                            }
                            if ev:
                                per_event[ev] = per_event.get(ev, 0) + 1
                            save_state(args.out, state)
                            downloaded_now += 1
                            print(f"     [+] готово ({downloaded_now}): {', '.join(os.path.basename(f) for f in files)}")
                            time.sleep(2)

                        if len(rows) < 100:
                            break
                        offset += 100
        except LimitReached:
            print("\n[*] Достигнут лимит матчей.")
        except KeyboardInterrupt:
            print("\n[*] Остановлено пользователем.")
        finally:
            save_state(args.out, state)
            try:
                close()
            except Exception:
                pass

    print("\n" + "=" * 50)
    print(f"[✓] Скачано новых матчей: {downloaded_now}")
    print(f"[✓] Папка: {os.path.abspath(args.out)}")


if __name__ == "__main__":
    main()
