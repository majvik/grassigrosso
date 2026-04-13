# Grassi Grosso: актуальное описание архитектуры (по коду)

Дата фиксации: 04.04.2026  
Источник: фактический код проекта (не `*.md` документация). Чеклист новых страниц и краткий roadmap CMS — [AGENTS.md](AGENTS.md).

## 1) Коротко для менеджмента

Проект построен как быстрый маркетинговый сайт с несколькими страницами и единым backend API для обработки заявок из форм.

- Витрина: статические страницы (`index`, `hotels`, `dealers`, `catalog`, `documents`, `contacts`) + служебные (`privacy`, `terms`, `cookies`, `404`, `unsubscribe`)
- Логика интерфейса: единый JS-модуль (`src/main.js`) с UX-функциями, анимациями (GSAP, Lenis), обработкой всех типов форм
- Backend: Node.js + Express (`server.cjs`) + модули `lib/` (антиспам, CORS, БД), который:
  - принимает данные форм
  - проверяет антиспам (honeypot, лимиты по IP и длине полей)
  - валидирует (name, phone, email – обязательные) и сохраняет каждую заявку в SQLite (`data/leads.db`) до попытки отправки
  - отправляет заявки в Telegram и Email, обновляет статус в БД
  - отправляет пользователю подтверждающее письмо (best-effort, не блокирует основной ответ)
  - при недоступности каналов – retry с экспоненциальным backoff из SQLite
  - обрабатывает запросы на отписку (`GET /api/unsubscribe`) с HMAC-верификацией
  - в production раздаёт `dist`, в dev проксирует на Vite
- Деплой: Docker-контейнер (multi-stage) + `docker-compose.yml` с именованным volume для `/app/data`; healthcheck `/health`; при необходимости – CI/CD и реверс-прокси (`nginx.conf` для Timeweb Cloud)

Ключевая характеристика решения: простота, быстрый запуск, минимум инфраструктуры.  
Подходит для текущей стадии продукта и быстрого вывода маркетинговых изменений.

## 2) Архитектура на уровне компонентов

### Frontend слой

- Технологии: Vite 7 + Vanilla JS + CSS + статические HTML
- Модель: Multi Page Application (MPA) с общим JS/CSS ядром
- Страницы (входы в `vite.config.mjs`):
  - Основные: `index.html`, `hotels.html`, `dealers.html`, `catalog.html`, `documents.html`, `contacts.html`
  - Служебные: `privacy.html`, `terms.html`, `cookies.html`, `404.html`, `unsubscribe.html`
- JS-ядро (`src/main.js` на всех страницах):
  - анимации (GSAP, Lenis smooth scroll на десктопе), география/карта, preloader (шрифты + hero-медиа)
  - модальные окна, cookie-баннер, формы: контактные (`.contact-form`), коммерческое предложение, запрос каталога, запрос документов
  - все формы отправляют в `POST /api/submit` (URL задаётся через `VITE_API_URL`)
  - lazy-подгрузка карт (Yandex Maps API key через `VITE_YANDEX_MAPS_API_KEY` при сборке)
- Стили: точка входа `src/style.css` подключает `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components.css`. Для первого кадра прелоадера содержимое `src/critical-preloader.css` встраивается в HTML внутрь `<style id="vite-critical-css">` на этапе dev/build плагином `grassigrosso-critical-preloader` в `vite.config.mjs` (только если в странице есть этот пустой плейсхолдер).
- Новая маркетинговая страница: шаблон [templates/marketing-page.html](templates/marketing-page.html); автоматизация `npm run new-page -- <slug> "Заголовок – Grassigrosso"` ([scripts/new-page.mjs](scripts/new-page.mjs)) создаёт `<slug>.html` в корне и добавляет ключ в `build.rollupOptions.input` в `vite.config.mjs`. Подробный чеклист — [AGENTS.md](AGENTS.md).

### Backend слой

- Технологии: Express (`server.cjs`), вспомогательные модули в `lib/`:
  - `lib/db.cjs` – SQLite через `better-sqlite3` (WAL mode), таблица `leads` со статусами `pending`/`delivered`/`failed`, CRUD-функции, миграция из legacy JSON-очереди
  - `lib/anti-spam.cjs` – honeypot (поля `website`/`url`/`homepage`), лимит отправок по IP за окно, минимальный интервал между отправками, блокировка с `Retry-After`, лимиты длины полей (имя, телефон, email, комментарий)
  - `lib/cors-config.cjs` – белый список origins (`CORS_ALLOWED_ORIGINS`), методы GET/POST/OPTIONS
  - `lib/confirmation-email.cjs` – HTML-шаблон подтверждающего письма (inline CSS, Nunito с fallback), генерация/верификация HMAC-токенов для ссылки отписки
- Функции сервера:
  - API заявок: `POST /api/submit` (после антиспам-проверки и валидации name/phone/email)
  - Подтверждение пользователю: после записи заявки отправляется HTML-письмо на `lead.email` (best-effort, ошибки логируются, не блокируют ответ)
  - Отписка: `GET /api/unsubscribe?email=...&token=...` – проверка HMAC-подписи, уведомление на sales/office/callback, редирект на `unsubscribe.html`
  - сервисные: `GET /health` (статус, размер очереди, наличие каналов), в non-production: `/api/test`, `/api/get-chat-id`, `GET /api/smtp-diag`
  - в production раздаёт `dist` (статику + fallback по пути и `*.html`, 404 → `404.html` или `index.html`)
  - в dev проксирует не-API запросы на Vite (localhost:5173)

### Слой данных

- SQLite (`data/leads.db`) через `better-sqlite3`:
  - Каждая заявка записывается в БД сразу при получении (status=pending), до попытки доставки
  - При успешной доставке – status=delivered с указанием канала и времени
  - При неудаче – retry с экспоненциальным backoff, состояние хранится в SQLite
  - Полный лог всех заявок с историей попыток и ошибок
  - WAL mode для устойчивости к крашам, busy_timeout для конкурентных запросов
- БД расположена на Docker volume (`grassigrosso-data:/app/data`) и переживает редеплои контейнера
- При первом запуске: автоматическая миграция из legacy `delivery-queue.json` в SQLite (файл переименовывается в `.bak`)

### Интеграционный слой

- Telegram Bot API (уведомления о лидах)
- SMTP через `nodemailer` (отправка лидов по email) с маршрутизацией по страницам. `callback@grassigrosso.com` всегда в копии. Контракт клиент–сервер:
  - **Клиент** (`src/main.js`): `getPageName()` определяет slug из `window.location.pathname` **без `.html`** (после 301-редиректа URL чистые) и маппит его на человекочитаемое название страницы, которое отправляется в `POST /api/submit` как поле `page`. Некоторые формы задают `page` хардкодом (`'Главная (КП)'`, `'Отелям (каталог)'`, `'Документы'`, `'Документы (помощь)'`).
  - **Сервер** (`server.cjs`): `PAGE_EMAIL_ROUTING` маппит значение `page` → email-адреса получателей:

  | `page` | Получатель |
  |---|---|
  | `Главная страница` | sales@ + callback@ |
  | `Главная (КП)` | sales@ + callback@ |
  | `Страница "Отелям"` | hotels@ + callback@ |
  | `Отелям (каталог)` | hotels@ + callback@ |
  | `Страница "Дилерам"` | b2b@ + callback@ |
  | `Документы` / `Документы (помощь)` | sales@ + callback@ |
  | `Страница "Контакты"` | sales@ + callback@ |
  | *(прочее)* | MAIL_TO + callback@ |

  - **Критично**: ключи в `getPageName()` и `PAGE_EMAIL_ROUTING` должны совпадать точно. При добавлении страницы с формой — обновить оба файла. Подробный чеклист — [AGENTS.md](AGENTS.md).
- Подтверждающее письмо пользователю (`lib/confirmation-email.cjs`):
  - HTML-письмо с inline CSS, шрифт Nunito (Google Fonts) с fallback на Arial/Helvetica
  - Логотип: PNG-версия (`public/email-logo.png`), hosted по URL сайта
  - HMAC-подписанная ссылка отписки (секрет из `UNSUBSCRIBE_SECRET` или `BOT_TOKEN`)
  - При клике на отписку: уведомление на sales@ и callback@ + редирект на `unsubscribe.html`
- Retry-очередь из SQLite (фоновый воркер каждые 15 с) для гарантированной доставки
- Диагностический endpoint SMTP: `GET /api/smtp-diag`

### Инфраструктурный слой

- `Dockerfile` (multi-stage):
  - Stage 1: Node 22, `npm ci` + `npm run build`; опционально `VITE_YANDEX_MAPS_API_KEY` через build-arg
  - Stage 2: Node 22-slim + build tools (для native `better-sqlite3`), только production-зависимости; копируются `server.cjs`, `lib/`, `dist/`; создаётся `/app/data`
- `docker-compose.yml`: именованный volume `grassigrosso-data` → `/app/data` (БД переживает редеплои)
- **Ключ Yandex Maps (`VITE_YANDEX_MAPS_API_KEY`):**
  - В **git не попадает**: `.env` в `.gitignore`, файл не коммитится.
  - В **контекст Docker не попадает**: `.dockerignore` исключает `.env`, при сборке образа ключ передаётся только через `--build-arg VITE_YANDEX_MAPS_API_KEY=...` на проде.
  - **Локально**: ключ берётся из `.env` при `npm run dev` или `npm run build` (Vite читает `VITE_*` из окружения и из `.env` в корне).
  - В **клиентском бандле** (`dist/assets/*.js`) ключ оказывается после сборки – это нормально для ключей карт (браузеру он нужен). В репозиторий не коммитится сама сборка (`dist` в `.gitignore`).
- Healthcheck: HTTP GET `/health` (интервал 10s, timeout 3s, start-period 20s)
- `nginx.conf`: реверс-прокси для Timeweb Cloud:
  - Статика из `/app/dist`; `/api/` и `/health` проксируются на Node по `127.0.0.1:3000` (совпадает с `Dockerfile` `PORT`/`EXPOSE`; не использовать `${PORT}` в сыром виде — без подстановки ломается `nginx -t` на деплое)
  - 301-редирект `*.html` → чистые URL (канонические, совпадают с `sitemap.xml`)
  - `try_files $uri.html $uri /index.html` — `.html` проверяется **первым**, иначе директория `documents/` перехватывает `/documents` и добавляет trailing slash
  - `/assets/` — долгий иммутабельный кеш (хешированные файлы Vite); HTML — `Cache-Control: no-cache`
- CI/CD: в репозитории пайплайн не описан; при необходимости настраивается отдельно (автодеплой после push)

## 3) Как устроен поток данных из форм

1. Пользователь заполняет форму на странице (`.contact-form` или форма запроса каталога/документов/КП).  
2. `src/main.js` валидирует имя, телефон, email (обязательное поле), согласие на ПДн.  
3. Фронтенд отправляет JSON в `POST /api/submit` (`fetch`, URL из `VITE_API_URL`).  
4. `server.cjs` нормализует payload лида; антиспам (`lib/anti-spam.cjs`) проверяет honeypot, лимиты по IP и длине полей – при провале возврат `429` и `Retry-After`.
5. **Заявка записывается в SQLite** (`lib/db.cjs`, status=pending) до попытки отправки – ни одна заявка не может быть потеряна.
6. **Подтверждающее письмо** отправляется пользователю на `lead.email` (best-effort, не блокирует основной ответ).
7. Заявка отправляется в **Telegram (primary)** и дополнительно в **Email (secondary)** с маршрутизацией по страницам.  
8. При успехе – status обновляется на `delivered` с указанием канала и времени.
9. Если оба канала недоступны – retry schedule записывается в SQLite, фоновый воркер подхватывает через 15 с.
10. Клиент получает статус доставки (`200` или `202 queued_retry`).

Поля заявки (в `normalizeLeadPayload`): `name`, `phone`, `comment`, `email`, `city`, `page`.

## 4) Текущая схема доставки лидов (реализовано)

- Режим 1: `Telegram primary`
- Режим 2: `Email secondary` (параллельное дублирование)
- Режим 3: `SQLite Queue + Retry` для гарантированной доставки

Особенности текущей реализации:

- Каждая заявка сначала записывается в SQLite (status=pending), затем доставляется.
- Успех фиксируется, если сработал хотя бы один канал доставки; status обновляется на `delivered`.
- При недоступности обоих каналов API возвращает `202`; retry schedule хранится в SQLite.
- Фоновый воркер обрабатывает pending-заявки каждые 15 с с экспоненциальным backoff.
- SQLite на Docker volume (`/app/data`) переживает редеплои контейнера – заявки не теряются.
- Полный лог: все заявки с историей доставки доступны в `data/leads.db`.

## 5) Почему текущая архитектура эффективна

- Быстрый time-to-market: мало слоев, минимум операционной сложности.
- Предсказуемая эксплуатация: один Node.js сервис закрывает API и раздачу фронта.
- Быстрые релизы: автодеплой через CI/CD сокращает ручные операции.
- Повышенная надежность лидов: дублирование каналов + персистентная очередь ретраев.
- Легкая масштабируемость по этапам: можно добавлять интеграции без полной переработки фронта.
- Хорошая база для CRO/маркетинга: страницы и формы можно быстро обновлять.
- Прозрачный деплой через Docker и healthcheck.

### 5.1) Почему лоадер работает стабильно и без визуальных артефактов

- Лоадер не «слепой»: снимается только после готовности критичных шрифтов и hero-медиа (`waitForFonts` + `waitForHeroMedia`).
- Есть защитные таймауты и fallback-ветка: UI не залипает при проблемах сети/ресурсов.
- Снижен риск layout shift: контент показывается после загрузки ключевых шрифтов (`body.fonts-loaded`).
- Видео не стартуют массово сразу: autoplay запускается через `IntersectionObserver`, только когда элемент реально видим.
- Поддержана отложенная загрузка источника видео (`data-src`) без избыточного раннего трафика.

### 5.2) Почему схема хранения и отдачи медиа эффективна

- Изображения: `<picture>` с fallback-цепочкой `AVIF -> WEBP -> JPG/PNG` + `srcset` для `1x/2x`.
- Видео: `<video>` с мультиформатными `<source>` (AV1 MP4 -> WebM VP9 -> H.264 MP4); hero-видео без аудиодорожки для экономии трафика, полная версия со звуком – в модалке.
- Для каталоговых карточек есть облегчённые версии (`@0.5x`) для экономии трафика.
- Нейминг ассетов системный и предсказуемый (например `name`, `name@2x`, `name@0.5x`).
- На этапе build Vite выпускает хешированные ассеты, что упрощает кеш-инвалидацию.

### 5.3) Почему эти решения проходят peer-review
- Решения приняты не только под happy path, но и под реальные сбои (два канала доставки + очередь + retry backoff).
- Производительность решается системно, а не точечно: контролируемый preloader, правильная медиаматрица форматов, ленивый autoplay.
- Эксплуатация продумана: healthcheck, SMTP-диагностика, диагностируемые env-настройки.
- Архитектура эволюционная: без переписывания можно наращивать кеширование и слой данных (PocketBase).

## 6) Ограничения текущего этапа (честно для техверификации)

- Монолитный фронтенд-скрипт (`src/main.js`) усложняет поддержку при росте функционала.
- SQLite – локальное хранилище; при горизонтальном масштабировании потребуется внешняя БД.
- Anti-spam state (rate limits по IP) хранится in-memory и сбрасывается при редеплое.
- В `dist` высокий вес медиа-контента; без кеширования и оптимизации это влияет на TTFB/LCP.

## 7) Дальнейшее развитие (после текущей реализации доставки)

### Шаг 1: кеширование для производительности

Цель: ускорить загрузку и снизить нагрузку.

- HTTP-кеш заголовки для статики (долгий TTL для хешированных ассетов).
- Компрессия (gzip/brotli) на уровне прокси/платформы.
- Кеширование тяжелых публичных ресурсов (изображения/видео/шрифты) на стороне приложения/прокси, без CDN. Мы В Российской Федерации.
- Политики `Cache-Control` и `ETag` для predictable invalidation.

Ожидаемый эффект: быстрее первый экран, меньше инфраструктурных затрат, стабильнее UX на мобильных сетях.

### Шаг 1b (параллельно по продукту): каталог и CMS

Отдельно от шага с PocketBase возможен сценарий **headless CMS** (например Strapi) для редактируемого каталога и публичного API; витрина тогда читает API, лиды остаются на текущем `POST /api/submit`. До внедрения интеграции не менять контракт форм и не добавлять обязательные `VITE_*` под CMS без задачи. Кратко зафиксировано в [AGENTS.md](AGENTS.md).

### Шаг 2: «умная» база на PocketBase (JS SDK) с минимальным администрированием

Цель: перейти от канала уведомлений к полноценной системе данных.

- Использовать PocketBase как слой данных и администрирования, с интеграцией через JS SDK.
- Первый шаг внедрения: администрирование коллекций в PocketBase, остальной контент и страницы остаются статическими.
- Далее хранить лиды, статусы доставки, источник, UTM/страницу, SLA-метрики в коллекциях.
- Добавить базовые правила доступа, аудит изменений и операционные отчеты.

Ожидаемый эффект: меньше ручного администрирования, прозрачная отчетность, база для аналитики.

## 8) Рекомендованная целевая схема (текущее состояние + следующие шаги)

`Browser Forms -> API (Express) -> SQLite(persist) -> Confirmation Email(user) + Telegram(primary) + Email(secondary) -> SQLite(update status)`  
`Retry: SQLite(pending) -> Worker(15s) -> Telegram/Email -> SQLite(delivered/retry)`  
`Unsubscribe: Email Link(HMAC) -> GET /api/unsubscribe -> Notify(sales/office/callback) -> Redirect(unsubscribe.html)`  
`Next: PocketBase / admin UI`  
`Static/Media -> App/Proxy Cache Policy -> Browser`

Это эволюционный путь без «переписывания с нуля»: текущая архитектура позволяет внедрять изменения поэтапно.

## 9) Где это подтверждено в коде

- Frontend: `src/main.js`, `src/style.css`, `src/styles/*.css`, `src/critical-preloader.css`; страницы с формами: `hotels.html`, `dealers.html`, `contacts.html`, `documents.html`, `catalog.html` (и др., где есть `.contact-form` или формы запроса каталога/документов/КП)
- Новые страницы и единообразие оболочки: `AGENTS.md`, `templates/marketing-page.html`, `scripts/new-page.mjs`; критический CSS — плагин `criticalPreloaderPlugin` в `vite.config.mjs`
- API и заявки: `server.cjs` (нормализация лида, SQLite запись, Telegram/Email доставка, retry из SQLite, подтверждение пользователю, отписка)
- Подтверждение и отписка: `lib/confirmation-email.cjs` (HTML-шаблон, HMAC-токены), `unsubscribe.html` (страница подтверждения)
- БД: `lib/db.cjs` (SQLite через `better-sqlite3`, таблица `leads`, WAL mode, миграция из JSON)
- Антиспам: `lib/anti-spam.cjs`; CORS: `lib/cors-config.cjs`
- SMTP-диагностика: `GET /api/smtp-diag` в `server.cjs` (только при `NODE_ENV !== 'production'`)
- Логотип для email: `public/email-logo.png` (PNG-версия SVG-логотипа для email-клиентов)
- Сборка multi-page: `vite.config.mjs` (все HTML-входы включая `404.html`, `unsubscribe.html` и proxy `/api` на :3000)
- Контейнеризация: `Dockerfile` + `docker-compose.yml` (volume `grassigrosso-data`); реверс-прокси: `nginx.conf`
