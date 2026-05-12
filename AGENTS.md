# Grassigrosso — правила для агентов и разработчиков

## Новая маркетинговая HTML-страница

1. **Предпочтительно:** `npm run new-page -- <slug> "Заголовок – Grassigrosso"`  
   Создаёт `<slug>.html` из [templates/marketing-page.html](templates/marketing-page.html) и добавляет вход в [vite.config.mjs](vite.config.mjs).

2. **Вручную:** скопировать `templates/marketing-page.html` в корень как `имя.html`.

3. **Обязательно сохранить в `<head>` и в начале `<body>`:**
   - `<style id="vite-critical-css"></style>` (пустой плейсхолдер — Vite подставит CSS при dev/build)
   - блок Яндекс.Метрики (как в шаблоне)
   - `<link rel="stylesheet" href="./src/style.css" />` и preload шрифтов
   - `apple-touch-icon`, `manifest` — как в шаблоне
   - прелоадер `#preloader`, блок `.cookie-banner`

4. **В конце `<body>`:** `<script type="module" src="./src/main.js"></script>`.

5. **Сборка:** если страница создана вручную — добавить ключ в `build.rollupOptions.input` в `vite.config.mjs` (иначе файл не попадёт в `dist`). Затем `npm run build`.

6. **Контент:** правьте только `<main>` (и при необходимости `<title>`, meta/og). Шапка, футер и навигация должны совпадать с шаблоном; при добавлении пункта меню — обновить ссылки в **шапке, мобильном меню и футере** на всех затронутых страницах.

7. **Стили:** дизайн-токены и структура CSS — [README.md](README.md) раздел «Дизайн-система», файл [src/styles/tokens.css](src/styles/tokens.css).

8. **Логика страницы:** входная точка — [src/main.js](src/main.js); page-specific поведение теперь разнесено по модулям в `src/` (`page-interactions.js`, `page-layout.js`, `contact-forms.js`, `resource-modals.js`, `commercial-offer.js`, `contacts-maps.js`, `catalog/*`). Для выбора поведения по странице можно ориентироваться на `document.body.dataset.page` (атрибут `data-page` в шаблоне).

## React / Base UI migration

- В проекте уже используется React island-layer через `data-react-root` и [src/react-entry.tsx](src/react-entry.tsx). Новый UI-слой строим на `@base-ui/react`, локальных компонентах `src/components/ui/*` и CSS Modules.
- `index`, `documents`, `contacts`, `hotels`, `dealers`, legal/service страницы уже имеют React page-layer; при правках этих страниц источником истины считать соответствующие `src/components/pages/*.tsx`, а не legacy HTML-строки.
- `catalog` тоже переведён на React page-layer; его runtime-поведение по-прежнему живёт в `src/catalog/*`, поэтому при правках важно сохранять текущие `id`, `class` и `data-*` hook-атрибуты.
- JSX-структура каталога теперь разнесена по `src/components/catalog-page/*`; при правках hero/filters/cards/toolbar сначала расширять эти локальные компоненты, а не возвращать большой монолитный page-файл.
- Runtime каталога тоже уже разнесён: `src/catalog/catalog-page.js` — только bootstrap, а крупные куски логики живут в отдельных модулях (`catalog-listing-controller.ts`, `catalog-modals-bootstrap.ts`). Не возвращать orchestration обратно в один большой файл.
- Общие полноширинные React-секции для migrated marketing pages теперь живут в `src/components/marketing/shared-page-sections.tsx`; при унификации `contact` / `faq` сначала расширять их, а не копировать ещё один локальный вариант.
- Основной следующий migration-step уже не page rendering, а cleanup оставшегося catalog runtime, прежде всего `src/catalog/catalog-image-modal.ts` и `src/catalog/catalog-filter-dom.ts`.
- Не держать параллельно string-source разметки для страниц, уже переведённых на `src/components/pages/*.tsx`.
- Не возвращать runtime fallback через `dangerouslySetInnerHTML` для уже маршрутизируемых React-страниц; неизвестный `page` должен считаться ошибкой маршрутизации, а не поводом рендерить старый HTML blob.
- React migration меняет слой рендера, но не должна самовольно менять пространственную модель страницы: если legacy страница была полноширинной, не зажимать её в новый container/page-shell без отдельного решения по дизайну.
- Для новых React-страниц **не привязывать JS-поведение к hash-классам CSS Modules**. Интерактивные hook'и задавать через `data-*` атрибуты (`data-faq-item`, `data-document-card`, `data-document-request-trigger` и т.п.).
- Legacy global CSS и старые class selectors допускаются как fallback для ещё не перенесённых зон, но не как новый контракт.
- Для public assets использовать только корневые пути `/...`; `./public/...` в HTML/React считается ошибкой и ломает CI/CD deploy contract.
- Подробный статус и порядок миграции: [docs/ui-migration.md](docs/ui-migration.md).

## SEO

- В HTML используются плейсхолдеры `%%SITE_ORIGIN%%`; при **`npm run build`** подставляется `SITE_URL` из `.env` (см. [.env.example](.env.example), по умолчанию `https://grassigrosso.com`).
- Новая публичная страница: уникальные `meta name="description"` и тексты Open Graph; канонический путь без `.html` (`/slug`). После выкладки добавьте URL в [public/sitemap.xml](public/sitemap.xml).
- В production запросы к `/*.html` отдают **301** на тот же путь без суффикса — реализовано в [nginx.conf](nginx.conf) (primary) и дублировано в [server.cjs](server.cjs) (fallback).

## Маршрутизация email по формам (критично!)

Заявки из форм маршрутизируются на разные почтовые ящики в зависимости от страницы. Логика разделена на две части — **нарушение синхронности ломает доставку**.

### Клиент (`src/contact-forms.js`): `getPageName()`

Определяет значение поля `page`, которое отправляется в `POST /api/submit`. Использует **slug без `.html`** из `window.location.pathname` (после 301-редиректа URL не содержат `.html`).

```js
// slug: 'index' | 'hotels' | 'dealers' | 'catalog' | 'contacts' | ...
const pageNames = {
  index: "Главная страница",
  hotels: 'Страница "Отелям"',
  dealers: 'Страница "Дилерам"',
  catalog: 'Страница "Каталог"',
  contacts: 'Страница "Контакты"',
};
```

Некоторые формы задают `page` напрямую (не через `getPageName()`):

- `'Главная (КП)'` — форма запроса коммерческого предложения
- `'Отелям (каталог)'` — форма запроса каталога на странице отелей
- `'Документы'` — форма запроса документов
- `'Документы (помощь)'` — форма помощи на странице документов

### Сервер (`server.cjs`): `PAGE_EMAIL_ROUTING`

Маппинг значения `page` → адреса получателей. `callback@grassigrosso.com` добавляется в копию ко всем формам автоматически.

| Значение `page`       | Получатель           |
| --------------------- | -------------------- |
| `Главная страница`    | sales@               |
| `Главная (КП)`        | sales@               |
| `Страница "Отелям"`   | hotels@              |
| `Отелям (каталог)`    | hotels@              |
| `Страница "Дилерам"`  | b2b@                 |
| `Страница "Каталог"`  | sales@               |
| `Документы`           | sales@               |
| `Документы (помощь)`  | sales@               |
| `Страница "Контакты"` | sales@               |
| _(любое другое)_      | `MAIL_TO` (fallback) |

### При добавлении новой страницы с формой

1. Добавить slug → название в `getPageName()` в `src/contact-forms.js`
2. Добавить название → email в `PAGE_EMAIL_ROUTING` в `server.cjs`
3. **Ключи должны совпадать точно** — иначе письма уйдут в fallback
4. **Не использовать `.html` в ключах** `getPageName()` — URL чистые после 301-редиректа

## Чего не делать

- Не удалять критический слот прелоадера и не дублировать обходной путь без `vite-critical-css`.
- Не менять ключи в `getPageName()` (`src/contact-forms.js`) без синхронного обновления `PAGE_EMAIL_ROUTING` (`server.cjs`) — иначе email-маршрутизация сломается.
- Не использовать `.html` в ключах `getPageName()` — в production URL чистые (301-редирект убирает суффикс).
- Не внедрять в этот репозиторий отдельную CMS-админку как второй фронтовый бандл — см. roadmap ниже.
- Не возвращать `<picture>` для hero-слайдов #1…#N в [catalog.html](catalog.html) и [src/components/catalog-page/hero.tsx](src/components/catalog-page/hero.tsx) — будет двойная загрузка изображений ещё до React-hydration (см. «Кеш статики, AVIF и hero-слайдер»).
- Не возвращать `preload="metadata"` у `<video>` в hero — на десктопе это качает webm целиком при первом заходе.
- Не убирать `applyMediaResponseHeaders` / `onProxyRes` из `server.cjs` без замены: без них `.avif` отдаётся как `application/octet-stream` и теряется `Cache-Control` для `/uploads/*`.

## Strapi (каталог): медиа, Docker и админка

### Товары и фильтры каталога

- Товары каталога хранятся в Strapi `Product`, а не во фронтовом JS. Статические карточки в [catalog.html](catalog.html) остаются только fallback на случай недоступности Strapi.
- Фронт не обращается к Strapi напрямую. Публичные backend endpoint'ы:
  - `GET /api/catalog/products` → товары из Strapi `GET /api/catalog-feed`
  - `GET /api/catalog/hero-slides` → hero-слайды из Strapi `GET /api/catalog-hero-feed`
  - `GET /api/catalog/filters` → справочники фильтров из Strapi `GET /api/catalog-filter-feed`
- Фильтры должны редактироваться через Strapi-справочники, а не хардкодиться в HTML/JS:
  - `Collection`
  - `Mattress Size`
  - `Firmness Option`
  - `Mattress Type Option`
  - `Load Range Option`
  - `Height Range Option`
  - `Filling Option`
  - `Feature Option`
- В `Product` старые enum-поля оставлены как fallback, но новые изменения должны заполнять relation-поля на справочники. `strapi-catalog/src/index.js` при старте создаёт базовые справочники и backfill'ит существующие товары идемпотентно.
- Slug справочника — это публичный контракт фильтра для фронта (`memoryEffect`, `upTo160`, `classic` и т.п.). Название можно менять в админке, slug менять только осознанно: это влияет на фильтрацию, избранное/шары и совместимость старых данных.
- После изменения схемы/справочников: перезапустить Strapi, проверить `GET /api/catalog/filters`, `GET /api/catalog/products`, затем smoke `/catalog`.
- Автоматическая проверка локального backend proxy: `npm run check:catalog-api` (по умолчанию `http://127.0.0.1:3000`, можно переопределить `CATALOG_API_BASE_URL`).
- Браузерный smoke каталога при запущенных Vite/API/Strapi: `npm run check:catalog-ui` (по умолчанию `http://127.0.0.1:5177`, можно переопределить `CATALOG_UI_BASE_URL`; использует локальный Google Chrome headless).

### Деплой из git (Timeweb и т.п.)

- Медиа каталога лежат в **`strapi-catalog/public/uploads/`** и **входят в репозиторий**: после `git push` образ собирается из clone, `COPY . .` в [Dockerfile](Dockerfile) кладёт те же файлы в контейнер — **`/uploads/…`** начинает отдаваться без ручного rsync.
- Добавили файл в админке локально — **`git add strapi-catalog/public/uploads/`** и коммит вместе с при необходимости обновлённым `database/seed/data.db` (если сидом пользуетесь для первого старта).
- Очень большие ролики при нехватке лимитов git — **Git LFS** или внешнее хранилище (отдельная задача).

### Публичный путь и 404

- Ожидаемый URL: **`https://<хост>/uploads/<имя>`** — [nginx.conf](nginx.conf) и [server.cjs](server.cjs) проксируют на Strapi (`127.0.0.1:1337`). **404** при таком URL = файла нет в `strapi-catalog/public/uploads/` внутри образа (забыли закоммитить или БД ссылается на старое имя).

Опционально для локального Docker без пересборки: bind-mount — [docker-compose.override.example.yml](docker-compose.override.example.yml).

### `strapi develop` и content-types (schema в dist)

- `strapi develop` очищает `strapi-catalog/dist` и компилирует только `.ts` → в `dist/src/api` без доп. шага **нет** `schema.json` у API без своих исходников на TS, из‑за этого не регистрируются `api::product`, `api::mattress-size` и т.д. и падает bootstrap.
- В [strapi-catalog/src/index.js](strapi-catalog/src/index.js) при загрузке модуля вызывается [scripts/prepare-dist.cjs](strapi-catalog/scripts/prepare-dist.cjs) (копирование `src/api`, `components`, `extensions` в `dist/src`), как после полного `strapi build`.

### Локально: редирект на `/admin/auth/register-admin` вместо логина

- При `npm run develop --prefix strapi-catalog` Strapi грузит `config/database.js` из `dist/config/`. Раньше там использовался `__dirname` (= `dist/config`), поэтому путь `.tmp/data.db` разрешался в `dist/.tmp/data.db` — папка `dist/.tmp/` не существовала, Strapi создавал пустую БД и предлагал зарегистрировать первого админа. Кроме того, в watch-режиме `strapi develop` периодически пересобирает и очищает `dist/`, удаляя `dist/.tmp/data.db` прямо в рантайме → SQLite-соединение к удалённому файлу → «attempt to write a readonly database» в крон-задачах.
- **Исправление** уже применено в `config/database.js` (заменено `__dirname` на `process.cwd()`). Теперь `DATABASE_FILENAME=.tmp/data.db` всегда резолвится в `strapi-catalog/.tmp/data.db` независимо от того, откуда загружен конфиг.
- На проде [scripts/start-services.sh](scripts/start-services.sh) при пустом рабочем файле копирует сид **`strapi-catalog/database/seed/data.db`** в `STRAPI_DATABASE_FILENAME` (по умолчанию `/app/data/strapi/data.db`), поэтому на проде всегда есть готовые данные.
- **Если `.tmp/data.db` всё же пустая локально:** `cp strapi-catalog/database/seed/data.db strapi-catalog/.tmp/data.db` — скопирует сид (осторожно: перезапишет локальные изменения).

### Производительность каталога и админки на проде

- Публичные ответы `GET /api/catalog/products`, `/api/catalog/filters`, `/api/catalog/hero-slides` в **production** кэшируются в памяти Node на **45 с** (переменная **`CATALOG_STRAPI_CACHE_TTL_MS`** в корневом **`.env`**, `0` — отключить). Это снижает повторные тяжёлые запросы к SQLite Strapi при заходах на `/catalog`.
- В [nginx.conf](nginx.conf) включён **gzip** для JSON/JS/CSS и ответов прокси — меньше объём при первой загрузке админки и ассетов.
- Если админка «висит» минутами: проверить холодный старт контейнера, лимиты CPU/RAM у хостинга, лог `/tmp/strapi.log`; убедиться, что в production запускается **`strapi start`**, а не `develop`.

#### Кеш статики, AVIF и hero-слайдер

Реализовано в `server.cjs` и контроллерах Strapi. Не откатывать без отдельной задачи.

- **Кеш статики и MIME** ([server.cjs](server.cjs), функция `applyMediaResponseHeaders`):
  - Хешированные ассеты `/assets/*.{js,css,...}` → `Cache-Control: public, max-age=31536000, immutable`.
  - Картинки/видео в корне `public/` и в проксируемых `/uploads/*` → `Cache-Control: public, max-age=2592000` (30 дней).
  - Для `.avif` принудительно ставится `Content-Type: image/avif` (раньше отдавался `application/octet-stream` и WebKit не использовал его как `<source type="image/avif">`).
  - HTML отдаётся с `Cache-Control: no-cache` чтобы свежий деплой был виден сразу.
- **AVIF из Strapi-uploads** — общая утилита [strapi-catalog/src/api/catalog/utils/prefer-avif.js](strapi-catalog/src/api/catalog/utils/prefer-avif.js):
  - Если в `strapi-catalog/public/uploads/` рядом с PNG/JPG лежит `.avif` с тем же базовым именем — feed-эндпоинты подменяют URL на `.avif` автоматически.
  - Подключена в `catalog-hero-feed` (hero images + video poster), `catalog-feed` (`imageUrl` карточек коллекций), `catalog-filter-feed` (`photo` в filter-help сегментах).
  - **Контракт:** чтобы оптимизировать новый медиафайл — положить `<basename>.avif` рядом с оригиналом в `strapi-catalog/public/uploads/`, закоммитить, дальше всё автоматом (URL остаётся `/uploads/<basename>.png` в БД Strapi, замена происходит на лету в контроллере).
  - Путь к `public/` резолвится через `strapi.dirs.app.root` — работает и в `strapi develop`, и в production из `dist/`.
- **Hero-слайдер каталога — без двойной загрузки** ([catalog.html](catalog.html) + [src/components/catalog-page/hero.tsx](src/components/catalog-page/hero.tsx)):
  - В SSR-разметке и в React-island `<picture>` рендерится **только для первого слайда** (`slide.id === 0`) — он отвечает за LCP и работает как fallback если Strapi-feed недоступен.
  - Слайды #1…#N — пустые `<div class="catalog-hero-slide">` контейнеры. После прихода `/api/catalog/hero-slides` функция `applyCatalogHeroFeed` ([src/catalog/catalog-hero.ts](src/catalog/catalog-hero.ts)) атомарно заполняет все слайды через `innerHTML`.
  - Если в SSR-fallback или JSX вернуть `<picture>` для #1…#N — браузер до hydration скачает 3–4 hero AVIF, которые тут же будут затёрты Strapi-feed'ом (двойная загрузка ~200 КБ).
  - Video в hero (`<video preload="none">` в [catalog.html](catalog.html), [src/catalog/catalog-hero.ts](src/catalog/catalog-hero.ts), [src/components/catalog-page/hero.tsx](src/components/catalog-page/hero.tsx)): не качать целиком до клика по слайду. **Не возвращать `preload="metadata"`** — он триггерил полную загрузку webm на десктопе.
- **Префетч feed'а** — `prefetchCatalogHeroFeed()` в `src/catalog-hero-slider.js` стартует XHR на `/api/catalog/hero-slides` ещё до React-hydration; `setupCatalogueNewPageHero()` затем просто `await` существующий промис. Не возвращать `await` блокирующих `preloadImage` внутри `setupCatalogueNewPageHero` — это удерживает init слайдера и видится как тормоза.

**Переменные на Timeweb:** по смыслу совпадают с **корневым `.env`** у вас локально; образец имён — [.env.example](.env.example) (в git только шаблон, не секреты). Файл `strapi-catalog/.env` в образ не попадает ([.dockerignore](.dockerignore)); секреты Strapi для контейнера должны быть **в панели Timeweb с теми же именами**, что в конце `.env.example` (`APP_KEYS`, `JWT_SECRET`, …), иначе `start-services.sh` подставит dev-значения.

### 502 на `POST …/admin/login` и «Unexpected end of JSON input»

- Админка шлёт запросы на тот же хост; в production Node проксирует `/admin` на `STRAPI_URL` (по умолчанию в контейнере `http://127.0.0.1:1337`, см. [scripts/start-services.sh](scripts/start-services.sh)).
- **502** значит, что до Strapi не достучались (процесс не слушает порт, упал при старте, обрыв соединения) или ответ оборвал **внешний** прокси с пустым телом — тогда клиент и падает на `response.json()`.
- Логи Strapi в контейнере: **`/tmp/strapi.log`** (скрипт старта перенаправляет stdout Strapi туда). Если в логе bootstrap виден `[boot] WARNING: Strapi is unavailable…`, поднялся только `server.cjs` — логин в админку будет недоступен.
- Для корректных ссылок в админке за прокси задайте в `.env` **`STRAPI_PUBLIC_URL`** = публичный URL сайта (как у посетителя, без `/admin`). См. [.env.example](.env.example).

### Прочее

- `mc.yandex.ru/... ERR_BLOCKED_BY_CLIENT` — блокировка расширением / браузером, к Strapi и медиа не относится.

## Roadmap (статус на текущий момент)

Интеграция **Strapi** для каталога уже внедрена через backend proxy:

- `GET /api/catalog/products`
- `GET /api/catalog/hero-slides`
- `GET /api/catalog/filters`

Ключевые инварианты:

- фронтенд не ходит в Strapi напрямую (используем backend endpoint'ы);
- публичный контракт форм и `POST /api/submit` не меняется;
- не добавлять обязательные `VITE_STRAPI_*` во фронтовый рантайм без отдельной задачи.
