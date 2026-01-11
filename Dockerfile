# Используем официальный образ Node.js
FROM node:24-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --verbose

# Копируем весь код проекта
COPY . .

# Собираем фронтенд
RUN npm run build

# Открываем порт (Timeweb Cloud Apps использует переменную PORT)
EXPOSE 3000

# Healthcheck для проверки работоспособности приложения
# Используем простой endpoint /health для быстрой проверки
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Запускаем Node.js сервер
# Важно: слушаем на 0.0.0.0, а не на localhost
CMD ["node", "server.js"]
