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
# Увеличено время ожидания до 90 секунд для полной инициализации приложения
HEALTHCHECK --interval=15s --timeout=10s --start-period=90s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => { r.on('data', () => {}); r.on('end', () => process.exit(r.statusCode === 200 ? 0 : 1)); }).on('error', () => process.exit(1));"

# Запускаем Node.js сервер
# Важно: слушаем на 0.0.0.0, а не на localhost
CMD ["node", "server.cjs"]
