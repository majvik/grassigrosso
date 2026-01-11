const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Проверка переменных окружения при запуске
if (!BOT_TOKEN) {
  console.warn('⚠️  BOT_TOKEN не найден в переменных окружения!');
}
if (!CHAT_ID) {
  console.warn('⚠️  CHAT_ID не найден в переменных окружения!');
} else {
  console.log('✅ BOT_TOKEN и CHAT_ID загружены');
}

// Обработка OPTIONS для CORS preflight
app.options('/api/submit', cors());
app.options('/api/get-chat-id', cors());

// Вспомогательный endpoint для получения CHAT_ID
// Отправьте сообщение боту @grassigrosso_form_bot, затем вызовите GET /api/get-chat-id
app.get('/api/get-chat-id', async (req, res) => {
  try {
    if (!BOT_TOKEN) {
      return res.status(500).json({ error: 'BOT_TOKEN не настроен' });
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
    const response = await axios.get(url);
    
    if (response.data.ok && response.data.result.length > 0) {
      // Берем последнее обновление
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

app.post('/api/submit', async (req, res) => {
  console.log('=== POST /api/submit ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
  const { name, phone, comment, email, city, company, page } = req.body;
  
  // Формируем текст сообщения
  let message = `🚀 *Новая заявка с сайта*\n\n`;
  message += `👤 *Имя:* ${name || 'Не указано'}\n`;
  
  if (company) {
    message += `🏢 *Компания:* ${company}\n`;
  }
  
  if (city) {
    message += `📍 *Город:* ${city}\n`;
  }
  
  if (email) {
    message += `📧 *Email:* ${email}\n`;
  }
  
  message += `📞 *Телефон:* ${phone || 'Не указан'}\n`;
  message += `💬 *Сообщение:* ${comment || 'Нет'}`;

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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
