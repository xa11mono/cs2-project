# Медиатека CS2 Manager — инструменты

Фото игроков, логотипы команд и турниров лежат в `assets/media/` и описаны в `media-manifest.json`
(для игры — копия `media-manifest.js`, потому что страница, открытая из файла, не может прочитать JSON).
Свои картинки игрок может добавить и в самой игре (Настройки → Медиатека, хранятся в IndexedDB браузера).

## Скачать недостающее на своём компьютере

Нужны Node.js 18+ и интернет. Из папки проекта:

```bash
npm install --no-save playwright
```

```bash
npx playwright install chromium
```

```bash
node tools/media/autofill.mjs --check
```

```bash
PANDASCORE_TOKEN=ваш_токен node tools/media/autofill.mjs
```

В Windows PowerShell:

```powershell
$env:PANDASCORE_TOKEN="ваш_токен"; node tools/media/autofill.mjs
```

Токен PandaScore (бесплатный план, https://app.pandascore.co) читается только из переменной окружения и никуда
не записывается. Без него PandaScore пропускается, работают остальные источники.

`--check` делает по одному запросу к каждому хосту (api.pandascore.co, cdn.pandascore.co, www.hltv.org, img-cdn.hltv.org, liquipedia.net,
commons.wikimedia.org, upload.wikimedia.org, www.thesportsdb.com) и пишет, кто доступен. Основной запуск идёт по очереди
PandaScore → HLTV → Liquipedia → Wikimedia Commons → TheSportsDB, не чаще одного запроса в 2 секунды на сайт, и в конце сам
вызывает `process.mjs` (обрезка по силуэту, центрирование, WebP 256×256 для фото и 256×256 для логотипов).

Заменить уже имеющиеся фото и логотипы актуальными с HLTV (запись меняется, только если HLTV нашёл
того же игрока с той же страной):

```bash
node tools/media/autofill.mjs --refresh --sources hltv
```

Если картинки уже скачаны вручную — положите их в папку (`players/ник.png`, `teams/Название.png`
или `players-ник.png`) и подключите её первым источником:

```bash
node tools/media/autofill.mjs --from-dir ~/Downloads/cs2-media
```

Полезные флаги: `--only players|teams|tournaments`, `--limit 50`, `--dry-run` (только поиск и
сопоставление, без скачивания), `--retry-missing`, `--no-process`, `--delay 3000`.

## Как это устроено

| Файл | Что делает |
|---|---|
| `lib/sources.mjs` | Адаптеры: PandaScore (`/csgo/players`, `/csgo/teams`, `/csgo/leagues`: image_url, страна, команда, внешний ID), HLTV, Liquipedia, Commons (только логотипы), TheSportsDB (только раздел ESports), локальная папка |
| `lib/match.mjs` | Сопоставление: точный ник + страна (чужая страна — отказ), псевдонимы команд, заглушки отбрасываются |
| `lib/queue.mjs` | Очередь `.autofill-queue.json`: состояния, повтор с паузой, без повторных одинаковых запросов |
| `lib/store.mjs` | Проверка файла (тип, размер, мин. 48 px, SVG без скриптов), SHA-1-дубликаты, `.raw`, атомарная запись manifest |
| `lib/net.mjs` | Честный User-Agent, пауза на хост, разбор отказов: шлюз среды / антибот / 403 / 429 / сеть |
| `process.mjs` | Обработка `.raw` в Chromium (Playwright) |
| `import_liga.py` | Разовый импорт из репозитория playliga/mods |

Защиту сайтов инструменты не обходят: при антибот-проверке, 403 или 429 источник отключается до конца
запуска, причина пишется в очередь, а сущность остаётся в работе на следующий запуск.

Проверка конвейера без интернета (локальный тестовый сервер и сгенерированные изображения):

```bash
NODE_PATH=$(npm root -g) node tests/media-pipeline.test.mjs
```

## Логотипы команд с Liquipedia (Python)

Нужен Python 3.9+ и `pip install requests pillow`. Из папки игры:

```bash
python tools/media/liquipedia_logos.py
```

Скрипт берёт все команды игры (`tools/media/teams-all.json` и манифест), находит страницу команды на Liquipedia
через официальный API, выбирает логотип для тёмной темы (darkmode → allmode → lightmode; значок без надписи,
если есть), обрезает поля, сохраняет WebP 256×256 в `assets/media/teams/` и обновляет манифест.
Старые файлы копируются в `assets/media/teams/_backup/`. Лимит Liquipedia — 1 запрос в 2 секунды, ответы
кэшируются в `tools/media/.lpcache/`, поэтому повторный запуск быстрый.

Флаги: `--missing-only` (только без логотипа), `--teams "NAVI,FAZE"`, `--dry-run`, `--light`,
`--contact you@example.com` (контакт в User-Agent — Liquipedia просит его указывать).
Не нашлась команда — допишите название её страницы на Liquipedia в словарь `ALIAS` в начале скрипта.

Логотип берётся прямо из инфобокса страницы команды (`imagedark` для тёмной темы), поэтому находится, даже если
файл называется иначе, чем команда (у FUT Esports — «Futbolist 2021 darkmode.png»). Команд, которых на Liquipedia
нет, можно взять с HLTV через ваш Chrome — так же, как работал прежний парсер:

```bash
chrome --remote-debugging-port=9222
pip install playwright
python tools/media/liquipedia_logos.py --missing-only --hltv
```
Ссылки на страницы команд HLTV берутся из `tools/media/hltv-team-urls.json` (собраны из CSV составов), остальные — поиском по HLTV.
