# Grassi Grosso

Корпоративный сайт Grassi Grosso с backend-обработкой заявок из форм.

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

## Продакшен

```bash
npm run build
npm start
```

## Логика доставки заявок

Текущая реализация:

1. **Primary:** Telegram
2. **Secondary (дублирование):** Email (SMTP)
3. Если оба канала недоступны: заявка попадает в очередь и отправляется повторно с backoff.

Успешной считается доставка, если сработал хотя бы один канал.

## Преимущества системы

- Надежность: два канала доставки + очередь с повторными попытками.
- Диагностика: есть отдельный endpoint `GET /api/smtp-diag` для проверки SMTP в проде.
- Производительность frontend: управляемый preloader, отложенный autoplay видео, адаптивные изображения (`AVIF/WEBP/PNG`, `srcset`).
- Удобство эксплуатации: healthcheck с состоянием каналов и размером очереди.

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

# Frontend API URL (локально)
VITE_API_URL=/api/submit

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

## Структура проекта

```text
├── public/                # статические файлы
├── src/
│   ├── main.js            # frontend логика + отправка форм
│   ├── style.css
│   └── fonts/
├── server.cjs             # API + доставка заявок + очередь
├── data/delivery-queue.json # runtime-очередь (игнорируется git)
├── *.html                 # страницы сайта
└── vite.config.mjs
```

## API Endpoints

- `GET /health` — статус сервиса, активность каналов и размер очереди
- `GET /api/test` — тест API
- `POST /api/test` — тест POST
- `GET /api/get-chat-id` — получение `chat_id` через `getUpdates`
- `GET /api/smtp-diag` — диагностика SMTP/DNS/TCP/авторизации
- `POST /api/submit` — отправка заявки (с fallback и queue+retry)
