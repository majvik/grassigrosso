const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// ВАЖНО: Логирование ВСЕХ входящих запросов для диагностики
app.use((req, res, next) => {
  console.log(`\n🔵 [${new Date().toISOString()}] INCOMING REQUEST`);
  console.log(`   Method: ${req.method}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   URL: ${req.url}`);
  console.log(`   Original URL: ${req.originalUrl}`);
  next();
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Настройка для работы за прокси (Timeweb Cloud Apps)
app.set('trust proxy', true);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Логирование переменных окружения при запуске
console.log('\n📋 Environment variables:');
console.log(`   PORT: ${PORT}`);
console.log(`   BOT_TOKEN: ${BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`   CHAT_ID: ${CHAT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n`);

// Проверка переменных окружения при запуске
if (!BOT_TOKEN) {
  console.warn('⚠️  BOT_TOKEN не найден в переменных окружения!');
}
if (!CHAT_ID) {
  console.warn('⚠️  CHAT_ID не найден в переменных окружения!');
} else {
  console.log('✅ BOT_TOKEN и CHAT_ID загружены');
}

// Обработка OPTIONS для CORS preflight (для всех API роутов)
app.options('/api/*', cors());

// Дополнительное логирование для API запросов
app.use('/api', (req, res, next) => {
  console.log(`\n🟢 [${new Date().toISOString()}] API REQUEST DETECTED`);
  console.log(`   Method: ${req.method}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));
  if (req.method === 'POST' && req.body) {
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// Healthcheck endpoint для проверки работоспособности
// ВАЖНО: должен отвечать быстро и всегда возвращать 200
// Timeweb проверяет этот endpoint изнутри контейнера
app.get('/health', (req, res) => {
  // Минимальный ответ для быстрой проверки - без логирования
  res.status(200).json({ status: 'ok' });
});

// Тестовый эндпоинт для проверки работы API
app.get('/api/test', (req, res) => {
  res.json({ message: 'API работает!', timestamp: new Date().toISOString() });
});

// API Routes - должны быть ДО статики
app.get('/api/get-chat-id', async (req, res) => {
  try {
    if (!BOT_TOKEN) {
      return res.status(500).json({ error: 'BOT_TOKEN не настроен' });
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
    const response = await axios.get(url);
    
    if (response.data.ok && response.data.result.length > 0) {
      const lastUpdate = response.data.result[response.data.result.length - 1];
      const chatId = lastUpdate.message?.chat?.id;
      
      if (chatId) {
        return res.json({ 
          chat_id: chatId,
          message: `Ваш CHAT_ID: ${chatId}. Добавьте его в .env файл как CHAT_ID=${chatId}`
        });
      }
    }
    
    res.json({ 
      message: 'Не найдено сообщений. Отправьте любое сообщение боту @grassigrosso_form_bot и попробуйте снова.',
      hint: 'После отправки сообщения боту, обновите эту страницу'
    });
  } catch (error) {
    console.error('Ошибка при получении CHAT_ID:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка при получении CHAT_ID' });
  }
});

// Тестовый POST эндпоинт
app.post('/api/test', (req, res) => {
  console.log('=== POST /api/test ===');
  res.json({ message: 'POST API работает!', body: req.body, timestamp: new Date().toISOString() });
});

app.post('/api/submit', async (req, res) => {
  console.log('\n✅ === POST /api/submit HANDLER CALLED ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
  const { name, phone, comment, email, city, company, page } = req.body;
  
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('BOT_TOKEN или CHAT_ID не настроены');
      return res.status(500).json({ error: 'Сервер не настроен' });
    }

    // Экранируем специальные символы Markdown для безопасности
    const escapeMarkdown = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/~/g, '\\~')
        .replace(/`/g, '\\`')
        .replace(/>/g, '\\>')
        .replace(/#/g, '\\#')
        .replace(/\+/g, '\\+')
        .replace(/-/g, '\\-')
        .replace(/=/g, '\\=')
        .replace(/\|/g, '\\|')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');
    };

    // Формируем безопасное сообщение
    const safeMessage = `🚀 *Новая заявка с сайта*\n\n` +
      `📄 *Страница:* ${escapeMarkdown(page) || 'Не указана'}\n` +
      `👤 *Имя:* ${escapeMarkdown(name) || 'Не указано'}\n` +
      (company ? `🏢 *Компания:* ${escapeMarkdown(company)}\n` : '') +
      (city ? `📍 *Город:* ${escapeMarkdown(city)}\n` : '') +
      (email ? `📧 *Email:* ${escapeMarkdown(email)}\n` : '') +
      `📞 *Телефон:* ${escapeMarkdown(phone) || 'Не указан'}\n` +
      `💬 *Сообщение:* ${escapeMarkdown(comment) || 'Нет'}`;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: CHAT_ID,
      text: safeMessage,
      parse_mode: 'Markdown'
    });
    
    console.log('Сообщение успешно отправлено в Telegram');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ошибка при отправке в Telegram:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.description || error.message || 'Неизвестная ошибка';
    res.status(500).json({ 
      error: 'Ошибка при отправке в TG',
      details: errorMessage
    });
  }
});

// Статические файлы фронтенда (после API routes)
// ВАЖНО: статика должна быть ПОСЛЕ всех API роутов
// Явно исключаем API запросы из статики
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`⏭️  Пропускаем API запрос мимо статики: ${req.method} ${req.path}`);
    return next(); // Пропускаем API запросы
  }
  next(); // Продолжаем для остальных запросов
});
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback для SPA - все остальные GET запросы отдаем index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   - POST /api/submit`);
  console.log(`   - GET  /api/get-chat-id`);
  console.log(`   - GET  /api/test`);
  console.log(`   - POST /api/test`);
  console.log(`   - GET  /health`);
  console.log(`🌐 Frontend: http://0.0.0.0:${PORT}\n`);
  console.log(`✅ Server is ready to accept connections\n`);
});

// Обработка ошибок сервера
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`   Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('   Unexpected server error, but continuing...');
  }
});

// Обработка ошибок для предотвращения падения приложения
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Не завершаем процесс, чтобы приложение продолжало работать
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Не завершаем процесс, чтобы приложение продолжало работать
});
