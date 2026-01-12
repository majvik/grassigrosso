FROM node:22-slim

WORKDIR /app

# Копируем только нужные файлы манифеста
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем весь код проекта
COPY . .

# Собираем фронтенд
RUN npm run build

# Переменные окружения
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Healthcheck убран - используем Timeweb healthcheck через /health endpoint
# В настройках Timeweb укажите "Путь проверки состояния" = /health

# Запускаем Node.js сервер через npm start (использует server.js -> server.cjs)
CMD ["npm", "start"]
