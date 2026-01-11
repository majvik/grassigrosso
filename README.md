# Grassi Grosso

Сайт для компании Grassi Grosso.

## Установка и запуск

### Frontend

```bash
npm install
npm run dev
```

### Backend (сервер для форм)

```bash
cd server
npm install
npm start
```

## Переменные окружения

### Frontend (.env)

Создайте файл `.env` в корне проекта:

```
VITE_API_URL=http://localhost:3000/submit
```

Для продакшена укажите URL вашего бэкенда:
```
VITE_API_URL=https://ваш-бэкенд-на-timeweb.ru/submit
```

### Backend (server/.env)

Создайте файл `.env` в папке `server`:

```
BOT_TOKEN=ваш_токен_бота
CHAT_ID=ваш_chat_id
```

Подробные инструкции по настройке бота см. в `server/README.md`.
