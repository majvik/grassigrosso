# Grassi Grosso

Корпоративный сайт для компании Grassi Grosso - производителя матрасов.

## Технологии

- **Frontend:** Vanilla JavaScript, Vite, HTML/CSS
- **Backend:** Node.js + Express
- **Интеграция:** Telegram Bot API

## Установка

```bash
npm install
```

## Разработка

```bash
# Frontend (терминал 1)
npm run dev

# Backend (терминал 2)
node server.cjs
```

Или вместе:

```bash
npm run dev:full  # если установлен concurrently
```

## Продакшен

1. Соберите фронтенд:
```bash
npm run build
```

2. Запустите сервер:
```bash
npm start
```

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```env
BOT_TOKEN=ваш_токен_бота
CHAT_ID=ваш_chat_id
PORT=3000
```

**Важно:** 
- `BOT_TOKEN` и `CHAT_ID` обязательны для работы форм
- `PORT` обычно устанавливается автоматически на Timeweb Cloud Apps
- Никогда не публикуйте секреты в репозиторий!

## Деплой на Timeweb Cloud Apps

1. **Тип приложения:** Node.js (не статический сайт!)
2. **Команда сборки:** `npm run build`
3. **Команда запуска:** `npm start` (уже в package.json)
4. **Переменные окружения:** добавьте `BOT_TOKEN` и `CHAT_ID` в настройках

Timeweb автоматически определит Node.js приложение по наличию `package.json` и `server.js`.

## Структура проекта

```
├── public/          # Статические файлы (изображения, иконки)
├── src/
│   ├── main.js      # Основной JavaScript
│   ├── style.css    # Стили
│   └── fonts/       # Шрифты
├── server.js        # Обёртка для Timeweb (требует server.cjs)
├── server.cjs       # Express сервер
├── index.html       # Главная страница
├── hotels.html      # Страница для отелей
└── dealers.html     # Страница для дилеров
```

## API Endpoints

- `GET /health` - Healthcheck
- `GET /api/test` - Тест API
- `POST /api/test` - Тест POST API
- `GET /api/get-chat-id` - Получить Chat ID для настройки
- `POST /api/submit` - Отправка формы обратной связи
