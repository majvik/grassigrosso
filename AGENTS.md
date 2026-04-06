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
- В production запросы к `/*.html` отдают **301** на тот же путь без суффикса — см. [server.cjs](server.cjs).

## Чего не делать

- Не удалять критический слот прелоадера и не дублировать обходной путь без `vite-critical-css`.
- Не внедрять в этот репозиторий отдельную CMS-админку как второй фронтовый бандл — см. roadmap ниже.

## Roadmap (не реализовано в коде)

Планируется **Strapi** (или аналог) как отдельный сервис: админка контента и **динамический каталог** с API. Витрина будет читать публичный API; лиды по-прежнему через существующий `POST /api/submit` в Node. До появления интеграции не добавлять `VITE_STRAPI_*` и не переписывать `catalog.html` под fetch без отдельной задачи.
