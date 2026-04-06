# Grassigrosso

Корпоративный сайт Grassigrosso с backend-обработкой заявок из форм.

## Технологии

- **Frontend:** Vite, Vanilla JavaScript, HTML/CSS (MPA)
- **Backend:** Node.js + Express
- **Доставка заявок:** Telegram Bot API + SMTP (Yandex) через `nodemailer`
- **Надежность доставки:** очередь `Queue + Retry` с сохранением на диск

## Установка

```bash
npm install
```

## Локальная разработка

```bash
# Терминал 1: frontend (Vite)
npm run dev

# Терминал 2: backend API
npm start
```

**Новая HTML-страница:** см. [AGENTS.md](AGENTS.md). Кратко: `npm run new-page -- <slug> "Заголовок – Grassigrosso"` или копия [templates/marketing-page.html](templates/marketing-page.html) + запись в `vite.config.mjs`.

## Продакшен

```bash
npm run build
npm start
```

## Логика доставки заявок

Текущая реализация:

1. **Primary:** Telegram
2. **Secondary (дублирование):** Email (SMTP) с маршрутизацией по страницам
3. Если оба канала недоступны: заявка попадает в очередь и отправляется повторно с backoff.

Успешной считается доставка, если сработал хотя бы один канал.

### Маршрутизация email

Каждая форма отправляет поле `page`, по которому сервер определяет email-получателя:

| Страница | Получатель (+ callback@ в копию) |
|---|---|
| Главная | sales@ |
| Отелям | hotels@ |
| Дилерам | b2b@ |
| Документы, Контакты | sales@ |

Клиентская часть (`getPageName()` в `src/main.js`) и серверная (`PAGE_EMAIL_ROUTING` в `server.cjs`) должны быть синхронизированы. Подробный чеклист — [AGENTS.md](AGENTS.md).

## Преимущества системы

- Надежность: два канала доставки + очередь с повторными попытками.
- Безопасный прод-контур: тестовые и диагностические endpoint'ы отключены в `NODE_ENV=production`.
- Производительность frontend: управляемый preloader, отложенный autoplay видео, адаптивные изображения (`AVIF/WEBP/PNG`, `srcset`).
- Удобство эксплуатации: healthcheck с состоянием каналов и размером очереди.
- Антиспам и защита API: rate-limit на submit по IP, временная блокировка, honeypot-поле формы и CORS allowlist.

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```env
# Telegram
BOT_TOKEN=your_bot_token
CHAT_ID=your_chat_id

# SMTP (Yandex)
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_TLS_REJECT_UNAUTHORIZED=true
SMTP_USER=callback@grassigrosso.com
SMTP_PASS=your_app_password
MAIL_FROM=callback@grassigrosso.com
MAIL_TO=callback@grassigrosso.com

# Queue + Retry
QUEUE_FILE_PATH=./data/delivery-queue.json
QUEUE_RETRY_INTERVAL_MS=15000
QUEUE_BASE_RETRY_DELAY_MS=30000
QUEUE_MAX_RETRY_DELAY_MS=900000

# Anti-spam
SPAM_WINDOW_MS=600000
SPAM_MAX_SUBMITS_PER_WINDOW=6
SPAM_MIN_SUBMIT_INTERVAL_MS=8000
SPAM_BLOCK_MS=1800000
SPAM_MAX_COMMENT_LENGTH=2500
SPAM_MAX_NAME_LENGTH=120
SPAM_MAX_PHONE_LENGTH=40
SPAM_MAX_EMAIL_LENGTH=160

# CORS allowlist (через запятую)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Frontend API URL (локально)
VITE_API_URL=/api/submit

# Runtime
NODE_ENV=production
PORT=3000
```

Важно:

- На проде переменные должны быть добавлены в окружение платформы (а не только в локальный `.env`).
- Не публикуйте токены/пароли в Git.

## Деплой (Timeweb Cloud Apps)

1. Тип приложения: Node.js
2. Команда сборки: `npm run build`
3. Команда запуска: `npm start`
4. Обязательно задать ENV: Telegram + SMTP + Queue параметры
5. Для карт на контактах: **VITE_YANDEX_MAPS_API_KEY** – задать в панели хостинга в переменных окружения сборки (ключ не коммитить).

## Структура проекта

```text
├── public/                # статические файлы
├── src/
│   ├── main.js            # frontend логика + отправка форм
│   ├── style.css          # точка входа стилей (@import)
│   ├── styles/
│   │   ├── tokens.css     # дизайн-токены (:root)
│   │   ├── base.css       # reset, шрифты, прелоадер, body
│   │   └── components.css # разметка страниц и блоков
│   ├── critical-preloader.css  # первый кадр; подставляется в HTML плагином Vite
│   └── fonts/
├── server.cjs             # API + доставка заявок + очередь
├── data/delivery-queue.json # runtime-очередь (игнорируется git)
├── *.html                 # страницы сайта (MPA)
└── vite.config.mjs        # плагин inject critical CSS в <style id="vite-critical-css">
```

## Дизайн-система (стили)

### Где что лежит

| Файл | Назначение |
|------|------------|
| `src/styles/tokens.css` | Цвета, шрифты, отступы `--space-*`, радиусы `--radius-*`, z-index `--z-*`, шкала размеров текста |
| `src/styles/base.css` | Сброс, `@font-face`, прелоадер, скрытие контента до шрифтов |
| `src/styles/components.css` | Все компоненты и страницы (легаси-значения в px постепенно можно заменять на токены) |
| `src/critical-preloader.css` | Минимум для первого кадра; **дублирует** часть токенов — при смене бренда синхронизировать с `tokens.css` |

### Новый цвет или шаг отступа

1. Добавить переменную в `:root` в **`tokens.css`** и строку в комментарий-инвентарь вверху файла (для цветов).
2. В **`components.css`** использовать `var(--your-token)`, не произвольный hex.
3. Если цвет нужен в inline critical CSS — обновить **`critical-preloader.css`** и пересобрать (`npm run build`).

### Z-index

Использовать только токены из `tokens.css`: `--z-local-1`, `--z-local-2`, `--z-banner-mobile`, `--z-floating`, `--z-overlay` (прелоадер и модалки). Новый слой — сначала договориться в токенах, иначе перекрытия случайны.

### Повторяющиеся UI-паттерны (классы)

- **Primary-кнопка (заливка):** фон `var(--color-primary)`, hover `var(--color-primary-hover)` — примеры: `.btn-contact`, `.btn-cookie`, основные кнопки в модалках.
- **Шапка:** `.header-top`, `.header-main`, `.nav-menu`, `.btn-contact`, мобильное меню `.mobile-menu-*`.
- **Cookie:** `.cookie-banner`, `.cookie-text`, `.btn-cookie` (на мобилке — перенос строки, кнопка на всю ширину).
- **Юридические / отписка:** `.legal-page`, `.legal-page-back-link`.
- **Заголовки секций:** `.section-title` (Bounded + `var(--font-size-section-title)`).

Новые блоки по возможности копируют эти паттерны и токены, а не новые «магические» числа.

### Сборка

После правок CSS: `npm run build`. Скриншотные тесты в проекте не заданы — регрессию смотреть вручную на ключевых страницах и ширинах.

## API Endpoints

### Production

- `GET /health` – статус сервиса, активность каналов и размер очереди
- `POST /api/submit` – отправка заявки (с fallback и queue+retry)

### Development only

- `GET /api/test` – тест API
- `POST /api/test` – тест POST
- `GET /api/get-chat-id` – получение `chat_id` через `getUpdates`
- `GET /api/smtp-diag` – диагностика SMTP/DNS/TCP/авторизации
