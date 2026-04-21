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

8. **Логика страницы:** при необходимости JS — [src/main.js](src/main.js); можно ориентироваться на `document.body.dataset.page` (атрибут `data-page` в шаблоне).

## SEO

- В HTML используются плейсхолдеры `%%SITE_ORIGIN%%`; при **`npm run build`** подставляется `SITE_URL` из `.env` (см. [.env.example](.env.example), по умолчанию `https://grassigrosso.com`).
- Новая публичная страница: уникальные `meta name="description"` и тексты Open Graph; канонический путь без `.html` (`/slug`). После выкладки добавьте URL в [public/sitemap.xml](public/sitemap.xml).
- В production запросы к `/*.html` отдают **301** на тот же путь без суффикса — реализовано в [nginx.conf](nginx.conf) (primary) и дублировано в [server.cjs](server.cjs) (fallback).

## Маршрутизация email по формам (критично!)

Заявки из форм маршрутизируются на разные почтовые ящики в зависимости от страницы. Логика разделена на две части — **нарушение синхронности ломает доставку**.

### Клиент (`src/main.js`): `getPageName()`

Определяет значение поля `page`, которое отправляется в `POST /api/submit`. Использует **slug без `.html`** из `window.location.pathname` (после 301-редиректа URL не содержат `.html`).

```js
// slug: 'index' | 'hotels' | 'dealers' | 'contacts' | ...
const pageNames = {
  'index':    'Главная страница',
  'hotels':   'Страница "Отелям"',
  'dealers':  'Страница "Дилерам"',
  'contacts': 'Страница "Контакты"'
}
```

Некоторые формы задают `page` напрямую (не через `getPageName()`):
- `'Главная (КП)'` — форма запроса коммерческого предложения
- `'Отелям (каталог)'` — форма запроса каталога на странице отелей
- `'Документы'` — форма запроса документов
- `'Документы (помощь)'` — форма помощи на странице документов

### Сервер (`server.cjs`): `PAGE_EMAIL_ROUTING`

Маппинг значения `page` → адреса получателей. `callback@grassigrosso.com` добавляется в копию ко всем формам автоматически.

| Значение `page` | Получатель |
|---|---|
| `Главная страница` | sales@ |
| `Главная (КП)` | sales@ |
| `Страница "Отелям"` | hotels@ |
| `Отелям (каталог)` | hotels@ |
| `Страница "Дилерам"` | b2b@ |
| `Документы` | sales@ |
| `Документы (помощь)` | sales@ |
| `Страница "Контакты"` | sales@ |
| *(любое другое)* | `MAIL_TO` (fallback) |

### При добавлении новой страницы с формой

1. Добавить slug → название в `getPageName()` в `src/main.js`
2. Добавить название → email в `PAGE_EMAIL_ROUTING` в `server.cjs`
3. **Ключи должны совпадать точно** — иначе письма уйдут в fallback
4. **Не использовать `.html` в ключах** `getPageName()` — URL чистые после 301-редиректа

## Чего не делать

- Не удалять критический слот прелоадера и не дублировать обходной путь без `vite-critical-css`.
- Не менять ключи в `getPageName()` (`src/main.js`) без синхронного обновления `PAGE_EMAIL_ROUTING` (`server.cjs`) — иначе email-маршрутизация сломается.
- Не использовать `.html` в ключах `getPageName()` — в production URL чистые (301-редирект убирает суффикс).
- Не внедрять в этот репозиторий отдельную CMS-админку как второй фронтовый бандл — см. roadmap ниже.

## Strapi (каталог): медиа, Docker и админка

### Деплой из git (Timeweb и т.п.)

- Медиа каталога лежат в **`strapi-catalog/public/uploads/`** и **входят в репозиторий**: после `git push` образ собирается из clone, `COPY . .` в [Dockerfile](Dockerfile) кладёт те же файлы в контейнер — **`/uploads/…`** начинает отдаваться без ручного rsync.
- Добавили файл в админке локально — **`git add strapi-catalog/public/uploads/`** и коммит вместе с при необходимости обновлённым `database/seed/data.db` (если сидом пользуетесь для первого старта).
- Очень большие ролики при нехватке лимитов git — **Git LFS** или внешнее хранилище (отдельная задача).

### Публичный путь и 404

- Ожидаемый URL: **`https://<хост>/uploads/<имя>`** — [nginx.conf](nginx.conf) и [server.cjs](server.cjs) проксируют на Strapi (`127.0.0.1:1337`). **404** при таком URL = файла нет в `strapi-catalog/public/uploads/` внутри образа (забыли закоммитить или БД ссылается на старое имя).

Опционально для локального Docker без пересборки: bind-mount — [docker-compose.override.example.yml](docker-compose.override.example.yml).

**Переменные на Timeweb:** по смыслу дублируется **корневой** `.env` (см. [.env.example](.env.example)). Файл `strapi-catalog/.env` в образ не попадает ([.dockerignore](.dockerignore)); секреты Strapi для контейнера должны быть **в панели Timeweb с теми же именами**, что в примере в конце `.env.example` (`APP_KEYS`, `JWT_SECRET`, …), иначе `start-services.sh` подставит dev-значения.

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

Ключевые инварианты:
- фронтенд не ходит в Strapi напрямую (используем backend endpoint'ы);
- публичный контракт форм и `POST /api/submit` не меняется;
- не добавлять обязательные `VITE_STRAPI_*` во фронтовый рантайм без отдельной задачи.
