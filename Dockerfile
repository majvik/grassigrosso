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
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=5 \
  CMD node -e "const http=require('http');const port=process.env.PORT||3000;const req=http.get('http://127.0.0.1:'+port+'/health',(res)=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.setTimeout(5000,()=>{req.destroy();process.exit(1)})"

# Запускаем Node.js сервер
# Важно: слушаем на 0.0.0.0, а не на localhost
CMD ["node", "server.cjs"]
