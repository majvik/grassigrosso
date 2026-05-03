# Grassigrosso Documentation Hub

Единая точка документации проекта. Все актуальные инструкции и архитектурные заметки поддерживаются здесь.

## 1. Быстрый старт

### Установка

```bash
npm install
```

### Локальная разработка

```bash
# Терминал 1: frontend (Vite)
npm run dev

# Терминал 2: backend API
npm start
```

### Продакшен-режим локально

```bash
npm run build
npm start
```

## 2. Технологический стек

- Frontend: Vite MPA, Vanilla JS + React islands, Base UI, CSS Modules.
- Backend: Node.js + Express.
- Доставка лидов: Telegram Bot API + SMTP (`nodemailer`).
- Персистентность: SQLite (`better-sqlite3`) с retry-очередью.

## 3. Архитектура (актуально)

### Frontend

- HTML-страницы: `index`, `hotels`, `dealers`, `catalog`, `documents`, `contacts`, сервисные (`privacy`, `terms`, `cookies`, `404`, `unsubscribe`).
- Точка входа: `src/main.js`.
- React runtime: `src/react-entry.tsx` + `src/components/app/ReactIslandRoot.tsx`.
- Модульная клиентская логика:
  - `src/catalog/*` — каталог, hero, filters, cards, controls, smoke helpers.
  - `src/app-shell.js` — preloader/page-load, lenis, overlay relocation, scroll lock, wide-screen scaling.
  - `src/page-bootstrap.js` — widow typography fix, font/media preload helpers, inline video activation, dealers package preset.
  - `src/catalog-hero-slider.js` — catalog hero data hydration и slider runtime.
  - `src/geography-effects.js` — geography marquee и SVG-point animation.
  - `src/page-interactions.js` — welcome/cookie/nav/mobile/FAQ/copy toast и другой общий UI interaction слой.
  - `src/page-layout.js` — page-specific layout sync и desktop sizing behavior.
  - `src/contact-forms.js` — общие lead/contact формы и `getPageName()`.
  - `src/resource-modals.js` — video/catalog/documents/help modals.
  - `src/commercial-offer.js` — многошаговая форма коммерческого предложения.
  - `src/contacts-maps.js` — Yandex Maps и contacts tabs.
  - `src/components/ui/*` — локальный Base UI-based UI kit без Tailwind.
  - `src/components/pages/*` — React page layer; `documents`, `contacts`, `hotels`, `dealers`, legal/service pages уже вынесены из HTML-строк.
- Стили: `src/style.css` + `src/styles/*`.
- Новый React visual layer: CSS Modules там, где это не ломает parity; legacy global CSS остаётся как fallback для ещё не перенесённых зон и для полноширинных migrated layouts, которые пока нельзя безболезненно пересобрать.
- Критический CSS прелоадера инжектится плагином из `vite.config.mjs` в `<style id="vite-critical-css"></style>`.

### Backend

- Основной сервер: `server.cjs`.
- Антиспам: `lib/anti-spam.cjs`.
- CORS allowlist: `lib/cors-config.cjs`.
- Подтверждающее письмо + HMAC unsubscribe: `lib/confirmation-email.cjs`.
- БД/очередь: `lib/db.cjs` и `data/leads.db`.

### Ключевые API

- `POST /api/submit` — приём и доставка заявок.
- `GET /api/unsubscribe` — отписка по HMAC-ссылке.
- `GET /health` — состояние сервиса.
- Dev-only: `/api/test`, `/api/get-chat-id`, `/api/smtp-diag` (в non-production).

### Контракт маршрутизации email (критично)

- Клиент формирует `page` в `src/contact-forms.js` (`getPageName()`) и в отдельных модальных flow (`src/resource-modals.js`, `src/commercial-offer.js`).
- Сервер маршрутизирует `page` через `PAGE_EMAIL_ROUTING` в `server.cjs`.
- Ключи в клиенте и сервере должны совпадать 1:1, иначе уйдёт в fallback `MAIL_TO`.

## 4. Доставка лидов и retry

Пайплайн:

1. Валидация + антиспам.
2. Запись лида в SQLite (`pending`) до попытки доставки.
3. Отправка в Telegram (primary) и Email (secondary).
4. При частичном/полном успехе — обновление статуса.
5. Если оба канала недоступны — запись retry schedule в SQLite и повтор из фонового воркера.

Гарантия: лид не теряется между приёмом и доставкой, так как сначала персистится в БД.

## 5. Strapi Catalog

Интеграция Strapi уже внедрена через backend proxy.

### Подключённые endpoint'ы

- `GET /api/catalog/products`
- `GET /api/catalog/hero-slides`

### Переменные окружения

- `STRAPI_URL`
- `STRAPI_TOKEN` (рекомендуется для production)

### Поведение при сбоях Strapi

- Без `STRAPI_URL`: backend возвращает `503`.
- При ошибке запроса к Strapi: backend возвращает `502`.
- Страница `catalog` при сбое Strapi использует статические карточки и слайды в разметке (runtime fallback).

### Важное по данным

- В `bootstrap` Strapi автоматически поддерживается только эталонный справочник размеров матрасов; автоназначение размеров товарам отключено.
- Значения опций в Strapi ведутся на русском; API маппит их в коды storefront.
- `features` реализован как `manyToMany` relation к `feature-option`.

## 6. Яндекс Карты

- Используется Yandex JavaScript API 2.1 (`ymaps`) в `src/contacts-maps.js`.
- API ключ: `VITE_YANDEX_MAPS_API_KEY`.
- Метки/поведение (цвет, hover/balloon) задаются программно.
- Подход через Яндекс Конструктор в текущей реализации не используется.

## 7. Переменные окружения (минимум)

Смотрите `.env.example`. Ключевые группы:

- Telegram: `BOT_TOKEN`, `CHAT_ID`
- SMTP: `SMTP_*`, `MAIL_FROM`, `MAIL_TO`
- Storage/Retry: `DB_PATH`, `QUEUE_*`
- Anti-spam: `SPAM_*`
- CORS: `CORS_ALLOWED_ORIGINS`
- Frontend API: `VITE_API_URL`
- Maps: `VITE_YANDEX_MAPS_API_KEY`
- Runtime: `NODE_ENV`, `PORT`
- Strapi: `STRAPI_URL`, `STRAPI_TOKEN`

## 8. Деплой

- Основной путь: `Dockerfile` (multi-stage) + `docker-compose.yml` для локального контейнерного запуска.
- Данные сохраняются в `/app/data` (volume).
- Реверс-прокси и clean URL правила: `nginx.conf`.

## 9. Новые страницы и контент

- Скрипт создания страницы: `npm run new-page -- <slug> "Заголовок – Grassigrosso"`.
- Шаблон: `templates/marketing-page.html`.
- Обязательные инварианты и чеклист поддержки страниц/форм: `AGENTS.md`.

## 10. Статус документации

- Этот файл — основной источник истины.
- Отдельный статус и контракт UI migration: `docs/ui-migration.md`.
- Исторические markdown-отчёты/точечные инструкции, дублирующие этот хаб, удалены или сведены к ссылкам.
- При выносе кода из `src/main.js` документация должна обновляться синхронно: минимум `AGENTS.md` и этот файл.
- Отдельный инвариант parity: React migration не должна самовольно зажимать старые полноширинные секции в новые container/page-shell обёртки без отдельного дизайн-решения.
