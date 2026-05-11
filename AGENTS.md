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

## Pending: портировать в ветку `catalogue`

Изменения ниже внесены в `main` (prod, коммит `735ff59` + доработки) и **ещё не перенесены** в `catalogue`. При переносе адаптировать под React/TSX-архитектуру ветки `catalogue`.

### 1. Telegram — HTML-режим (`server.cjs`)
Оба файла идентичны в обеих ветках — **cherry-pick напрямую**.

- `parse_mode` изменён с `'Markdown'` на `'HTML'`
- Удалена `escapeMarkdown`, добавлена `escapeTg(text)` — экранирует только `&`, `<`, `>`
- `buildTelegramMessage`: убраны эмодзи, заменены на буллеты `•`; жирное форматирование через `<b>`

### 2. Главная — блок «Презентация компании» в секции Philosophy

**`main`:** `index.html` → третий `philosophy-feature` после второго divider'а.  
**`catalogue`:** `src/components/pages/IndexPage.tsx` → добавить аналогичный блок в секцию `<section className="philosophy">` → `div.philosophy-right` после второго `philosophy-divider`.

Структура блока:
```tsx
<div className="philosophy-divider" />
<div
  className="philosophy-feature philosophy-feature--doc"
  data-document-card
  data-document="presentation"
>
  <div className="feature-icon">
    {/* SVG из AGENTS.md ниже */}
  </div>
  <div className="feature-content">
    <h3 className="feature-title">Презентация компании</h3>
    <p className="feature-text">PDF документ</p>
  </div>
  <a
    href="#"
    className="documents-commercial-item-download"
    data-document-request-trigger
    aria-label="Запросить презентацию компании"
  >
    <img src="/arrow-down.svg" alt="" />
  </a>
</div>
```

CSS (в `src/styles/components.css` — уже добавлено в `main`):
```css
.philosophy-feature--doc { align-items: center; cursor: pointer; }
.philosophy-feature--doc .documents-commercial-item-download { flex-shrink: 0; margin-left: auto; }
.philosophy-feature--doc:hover .documents-commercial-item-download img { animation: arrow-nudge 0.5s ease-out; }
```

В `catalogue` нет `#documentRequestModal` на главной — убедиться что `IndexPage.tsx` рендерится на странице где инициализируется `initResourceModals` (или добавить модалку через React portal / shared модалки).

### 3. Каталог — кнопка «Скачать в электронном виде» в hero

**`main`:** `catalog.html` → в `div.catalog-hero-text` после `<p class="catalog-hero-description">`.  
**`catalogue`:** `src/components/catalog-page/hero.tsx` → в `CatalogHeroSection` → `div.catalog-hero-text` после `<p className="catalog-hero-description">`.

```tsx
<a
  href="#"
  className="btn-primary-large"
  data-document-card
  data-document="catalog"
  data-document-request-trigger
>
  Скачать в электронном виде
</a>
```

### 4. Каталог — блок «Не нашли то, что искали?» (documents-commercial, фон #f1f0ea)

**`main`:** `catalog.html` → новая `<section class="documents-commercial">` перед `section.catalog-custom`.  
**`catalogue`:** `src/components/catalog-page/layout.tsx` → новый компонент `CatalogCommercialSection` вставить в `CatalogPageLayout` **между** `catalogue-new-layout` (продуктовой сеткой) и `<FaqSection>`.

```tsx
function CatalogCommercialSection() {
  return (
    <section className="documents-commercial documents-commercial--catalog" style={{ backgroundColor: '#f1f0ea' }}>
      <div className="documents-commercial-content">
        <div className="documents-commercial-left">
          <h2 className="section-title documents-commercial-title">Не нашли то, что искали?</h2>
          <div className="documents-commercial-icon">
            <img src="/catalog-illustration.svg" alt="" />
          </div>
        </div>
        <div className="documents-commercial-right">
          <div className="documents-commercial-list">
            {[
              { id: 'catalog', title: 'Каталог продукции', label: 'Запросить каталог продукции' },
              { id: 'presentation', title: 'Презентация компании', label: 'Запросить презентацию компании' },
            ].map((doc) => (
              <div className="documents-commercial-item" data-document={doc.id} data-document-card key={doc.id}>
                <div className="documents-commercial-item-icon">
                  <img src="/catalog.svg" alt="" />
                </div>
                <div className="documents-commercial-item-content">
                  <h3 className="documents-commercial-item-title">{doc.title}</h3>
                  <p className="documents-commercial-item-type">PDF документ</p>
                </div>
                <a href="#" className="documents-commercial-item-download" data-document-request-trigger aria-label={doc.label}>
                  <img src="/arrow-down.svg" alt="" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

### 5. Каталог — фон секций

**`main`:** `src/styles/components.css` изменения:
- `.catalog-custom { background-color: var(--color-bg-white) }` (было beige)
- `.catalog-faq { background-color: #f1f0ea }` (было white)

**`catalogue`:** `src/styles/catalog-page.css` — добавить:
```css
.catalog-faq { background-color: #f1f0ea; }
```
`CatalogHelpSection` уже белый (класс `documents-help--white`).
FaqSection в `layout.tsx` передать `sectionClassName="catalog-faq"` вместо дефолтного `faq-section`.

### 6. Обработчик кликов для `[data-document-card]` (`src/main.js`)

**`main`:** `src/main.js` (монолитный) — расширены селекторы в document click-делегировании:
```js
// было:
const commercialItem = e.target.closest('.documents-commercial-item[data-document]')
const card = target.closest('.documents-commercial-item')
// стало:
const commercialItem = e.target.closest('.documents-commercial-item[data-document], [data-document-card][data-document]')
const card = target.closest('.documents-commercial-item, [data-document-card]')
// также добавлен [data-document-request-trigger] в certLink
```

**`catalogue`:** `src/resource-modals.js` уже содержит эти расширенные селекторы — **ничего менять не нужно**.

---

## Roadmap (не реализовано в коде)

Планируется **Strapi** (или аналог) как отдельный сервис: админка контента и **динамический каталог** с API. Витрина будет читать публичный API; лиды по-прежнему через существующий `POST /api/submit` в Node. До появления интеграции не добавлять `VITE_STRAPI_*` и не переписывать `catalog.html` под fetch без отдельной задачи.
