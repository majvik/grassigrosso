# Backend Server для форм

## Установка

1. Установите зависимости:
```bash
cd server
npm install
```

2. Создайте файл `.env` в папке `server`:
```
BOT_TOKEN=8396505144:AAHNfVxpI_l_a0t0aB_VvzfSld1zE6B-EUs
CHAT_ID=ваш_chat_id_здесь
```

3. Получите CHAT_ID:
   - Отправьте любое сообщение боту @grassigrosso_form_bot в Telegram
   - Запустите сервер: `npm start`
   - Откройте в браузере: `http://localhost:3000/get-chat-id`
   - Скопируйте полученный CHAT_ID (числовой код)
   - Вставьте его в `.env` файл вместо `YOUR_CHAT_ID_HERE`
   
   Альтернативный способ:
   - Откройте в браузере: `https://api.telegram.org/bot8396505144:AAHNfVxpI_l_a0t0aB_VvzfSld1zE6B-EUs/getUpdates`
   - Найдите в ответе поле `"chat":{"id":` - это и есть ваш CHAT_ID

## Запуск

```bash
npm start
```

Сервер запустится на порту 3000 (или на порту, указанном в переменной окружения PORT).

## Настройка для деплоя

После деплоя на Timeweb Cloud Apps:

### Backend (server):
1. Добавьте переменные окружения в настройках приложения:
   - `BOT_TOKEN` = ваш токен
   - `CHAT_ID` = ваш ID
   - `PORT` = порт (обычно устанавливается автоматически)

### Frontend:
2. Обновите переменную окружения `VITE_API_URL` в файле `.env` в корне проекта:
   ```
   VITE_API_URL=https://ваш-бэкенд-на-timeweb.ru/submit
   ```
   
   Или добавьте переменную окружения `VITE_API_URL` в настройках фронтенд-приложения на Timeweb Cloud.
   
   **Важно:** После изменения `.env` файла перезапустите dev-сервер Vite (`npm run dev`).
