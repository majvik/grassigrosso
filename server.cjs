const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.set('trust proxy', true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование при запуске
console.log('\n🚀 Starting server...');
console.log(`   PORT: ${PORT}`);
console.log(`   BOT_TOKEN: ${BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`   CHAT_ID: ${CHAT_ID ? '✅ Set' : '❌ Not set'}\n`);

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API: Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API работает!', 
    timestamp: new Date().toISOString() 
  });
});

app.post('/api/test', (req, res) => {
  res.json({ 
    message: 'POST API работает!', 
    body: req.body,
    timestamp: new Date().toISOString() 
  });
});

// API: Get Chat ID helper
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
      message: 'Не найдено сообщений. Отправьте любое сообщение боту и попробуйте снова.',
      hint: 'После отправки сообщения боту, обновите эту страницу'
    });
  } catch (error) {
    console.error('Ошибка при получении CHAT_ID:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка при получении CHAT_ID' });
  }
});

// API: Submit form
app.post('/api/submit', async (req, res) => {
  const { name, phone, comment, email, city, company, page } = req.body;
  
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('BOT_TOKEN или CHAT_ID не настроены');
      return res.status(500).json({ error: 'Сервер не настроен' });
    }

    // Экранирование Markdown
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

    // Формирование сообщения
    const message = `🚀 *Новая заявка с сайта*\n\n` +
      `📄 *Страница:* ${escapeMarkdown(page) || 'Не указана'}\n` +
      `👤 *Имя:* ${escapeMarkdown(name) || 'Не указано'}\n` +
      (company ? `🏢 *Компания:* ${escapeMarkdown(company)}\n` : '') +
      (city ? `📍 *Город:* ${escapeMarkdown(city)}\n` : '') +
      (email ? `📧 *Email:* ${escapeMarkdown(email)}\n` : '') +
      `📞 *Телефон:* ${escapeMarkdown(phone) || 'Не указан'}\n` +
      `💬 *Сообщение:* ${escapeMarkdown(comment) || 'Нет'}`;

    // Отправка в Telegram
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    
    console.log('✅ Сообщение отправлено в Telegram');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка при отправке в Telegram:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.description || error.message || 'Неизвестная ошибка';
    res.status(500).json({ 
      error: 'Ошибка при отправке в Telegram',
      details: errorMessage
    });
  }
});

// Статические файлы (после API routes)
const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  // В dev режиме проксируем запросы к Vite (кроме API)
  app.use(createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true, // для WebSocket (HMR)
    logLevel: 'silent',
    filter: (pathname) => {
      // Не проксируем API запросы
      return !pathname.startsWith('/api');
    }
  }));
} else {
  // В production отдаем статические файлы из dist
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Fallback для SPA - все остальные GET запросы отдаем index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Запуск сервера
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   - GET  /health`);
  console.log(`   - GET  /api/test`);
  console.log(`   - POST /api/test`);
  console.log(`   - GET  /api/get-chat-id`);
  console.log(`   - POST /api/submit`);
  console.log(`🌐 Frontend: http://0.0.0.0:${PORT}\n`);
});

// Обработка ошибок
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`   Port ${PORT} is already in use`);
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
