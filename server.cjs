const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();

const PORT = Number(process.env.PORT || 3000);

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const CHAT_ID = process.env.CHAT_ID || '';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = (process.env.SMTP_SECURE || 'true') === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;
const MAIL_TO = process.env.MAIL_TO || SMTP_USER;
const SMTP_TLS_REJECT_UNAUTHORIZED = (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true') === 'true';

const QUEUE_FILE_PATH = process.env.QUEUE_FILE_PATH || path.join(__dirname, 'data', 'delivery-queue.json');
const QUEUE_RETRY_INTERVAL_MS = Number(process.env.QUEUE_RETRY_INTERVAL_MS || 15000);
const QUEUE_BASE_RETRY_DELAY_MS = Number(process.env.QUEUE_BASE_RETRY_DELAY_MS || 30000);
const QUEUE_MAX_RETRY_DELAY_MS = Number(process.env.QUEUE_MAX_RETRY_DELAY_MS || 15 * 60 * 1000);

let deliveryQueue = [];
let isQueueProcessing = false;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function escapeMarkdown(text) {
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
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeLeadPayload(body = {}) {
  return {
    name: String(body.name || '').trim(),
    phone: String(body.phone || '').trim(),
    comment: String(body.comment || '').trim(),
    email: String(body.email || '').trim(),
    city: String(body.city || '').trim(),
    company: String(body.company || '').trim(),
    page: String(body.page || '').trim() || 'Не указана',
  };
}

function buildTelegramMessage(lead) {
  return `🚀 *Новая заявка с сайта*\n\n` +
    `📄 *Страница:* ${escapeMarkdown(lead.page) || 'Не указана'}\n` +
    `👤 *Имя:* ${escapeMarkdown(lead.name) || 'Не указано'}\n` +
    (lead.company ? `🏢 *Компания:* ${escapeMarkdown(lead.company)}\n` : '') +
    (lead.city ? `📍 *Город:* ${escapeMarkdown(lead.city)}\n` : '') +
    (lead.email ? `📧 *Email:* ${escapeMarkdown(lead.email)}\n` : '') +
    `📞 *Телефон:* ${escapeMarkdown(lead.phone) || 'Не указан'}\n` +
    `💬 *Сообщение:* ${escapeMarkdown(lead.comment) || 'Нет'}`;
}

function buildEmailSubject(lead) {
  return `[Grassi Grosso] Новая заявка (${lead.page || 'Сайт'})`;
}

function buildEmailText(lead) {
  return [
    'Новая заявка с сайта Grassi Grosso',
    '',
    `Страница: ${lead.page || 'Не указана'}`,
    `Имя: ${lead.name || 'Не указано'}`,
    `Компания: ${lead.company || 'Не указана'}`,
    `Город: ${lead.city || 'Не указан'}`,
    `Email: ${lead.email || 'Не указан'}`,
    `Телефон: ${lead.phone || 'Не указан'}`,
    `Сообщение: ${lead.comment || 'Нет'}`,
    '',
    `Время: ${new Date().toISOString()}`
  ].join('\n');
}

function buildEmailHtml(lead) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1e1e1e; line-height: 1.45;">
      <h2 style="margin: 0 0 16px;">Новая заявка с сайта Grassi Grosso</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 760px;">
        <tr><td style="padding: 6px 0; font-weight: bold;">Страница:</td><td style="padding: 6px 0;">${escapeHtml(lead.page || 'Не указана')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Имя:</td><td style="padding: 6px 0;">${escapeHtml(lead.name || 'Не указано')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Компания:</td><td style="padding: 6px 0;">${escapeHtml(lead.company || 'Не указана')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Город:</td><td style="padding: 6px 0;">${escapeHtml(lead.city || 'Не указан')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Email:</td><td style="padding: 6px 0;">${escapeHtml(lead.email || 'Не указан')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Телефон:</td><td style="padding: 6px 0;">${escapeHtml(lead.phone || 'Не указан')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; vertical-align: top;">Сообщение:</td><td style="padding: 6px 0;">${escapeHtml(lead.comment || 'Нет')}</td></tr>
      </table>
      <p style="margin-top: 16px; color: #666;">Время: ${new Date().toISOString()}</p>
    </div>
  `;
}

function channelEmailConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_TO && MAIL_FROM);
}

function channelTelegramConfigured() {
  return Boolean(BOT_TOKEN && CHAT_ID);
}

function extractErrorDetails(error) {
  if (!error) return 'Unknown error';
  if (error.response?.data?.description) return String(error.response.data.description);
  if (error.response?.data?.error) return String(error.response.data.error);
  if (error.message) return String(error.message);
  return String(error);
}

function createMailTransport() {
  const transportOptions = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: SMTP_TLS_REJECT_UNAUTHORIZED,
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  };

  if (!SMTP_SECURE && SMTP_PORT === 587) {
    transportOptions.secure = false;
    transportOptions.requireTLS = true;
  }

  return nodemailer.createTransport(transportOptions);
}

async function sendLeadToEmail(lead) {
  if (!channelEmailConfigured()) {
    throw new Error('Email channel is not configured');
  }

  const transporter = createMailTransport();

  await transporter.sendMail({
    from: MAIL_FROM,
    to: MAIL_TO,
    subject: buildEmailSubject(lead),
    text: buildEmailText(lead),
    html: buildEmailHtml(lead),
  });
}

async function sendLeadToTelegram(lead) {
  if (!channelTelegramConfigured()) {
    throw new Error('Telegram channel is not configured');
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: CHAT_ID,
    text: buildTelegramMessage(lead),
    parse_mode: 'Markdown'
  });
}

async function deliverLeadWithFallback(lead) {
  const errors = {};

  // Telegram — primary (быстрый, надёжный)
  try {
    await sendLeadToTelegram(lead);
  } catch (error) {
    errors.telegram = extractErrorDetails(error);
    console.error('❌ Ошибка отправки Telegram:', errors.telegram);
  }

  // Email — secondary (дублирование)
  try {
    await sendLeadToEmail(lead);
  } catch (error) {
    errors.email = extractErrorDetails(error);
    console.error('❌ Ошибка отправки Email:', errors.email);
  }

  // Успех, если хотя бы один канал сработал
  if (!errors.telegram) {
    return { ok: true, channel: errors.email ? 'telegram' : 'telegram+email', errors };
  }
  if (!errors.email) {
    return { ok: true, channel: 'email', errors };
  }

  return { ok: false, errors };
}

function calculateRetryDelayMs(attemptNumber) {
  const exponent = Math.max(0, attemptNumber - 1);
  return Math.min(QUEUE_BASE_RETRY_DELAY_MS * (2 ** exponent), QUEUE_MAX_RETRY_DELAY_MS);
}

async function persistQueueToDisk() {
  const dir = path.dirname(QUEUE_FILE_PATH);
  await fsp.mkdir(dir, { recursive: true });

  const tmpPath = `${QUEUE_FILE_PATH}.tmp`;
  await fsp.writeFile(tmpPath, JSON.stringify(deliveryQueue, null, 2), 'utf8');
  await fsp.rename(tmpPath, QUEUE_FILE_PATH);
}

async function loadQueueFromDisk() {
  try {
    const raw = await fsp.readFile(QUEUE_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    deliveryQueue = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      deliveryQueue = [];
      await persistQueueToDisk();
      return;
    }

    const backupName = `${QUEUE_FILE_PATH}.corrupted.${Date.now()}.json`;
    console.error('⚠️ Очередь повреждена, создаю резервную копию:', backupName);
    await fsp.mkdir(path.dirname(backupName), { recursive: true });
    await fsp.copyFile(QUEUE_FILE_PATH, backupName).catch(() => {});
    deliveryQueue = [];
    await persistQueueToDisk();
  }
}

function buildQueueId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

async function enqueueLeadForRetry(lead, initialErrors = {}) {
  const item = {
    id: buildQueueId(),
    lead,
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
    nextAttemptAt: Date.now(),
    lastErrors: initialErrors
  };

  deliveryQueue.push(item);
  await persistQueueToDisk();
  return item;
}

async function processQueue() {
  if (isQueueProcessing) return;
  isQueueProcessing = true;

  try {
    const now = Date.now();
    let changed = false;

    for (const item of [...deliveryQueue]) {
      if ((item.nextAttemptAt || 0) > now) {
        continue;
      }

      const attemptNumber = Number(item.attempts || 0) + 1;
      item.attempts = attemptNumber;
      item.lastAttemptAt = new Date().toISOString();

      const result = await deliverLeadWithFallback(item.lead);
      changed = true;

      if (result.ok) {
        deliveryQueue = deliveryQueue.filter((qItem) => qItem.id !== item.id);
        console.log(`✅ Заявка ${item.id} доставлена из очереди через ${result.channel}`);
        continue;
      }

      item.lastErrors = result.errors;
      const delayMs = calculateRetryDelayMs(attemptNumber);
      item.nextAttemptAt = Date.now() + delayMs;
      console.error(`❌ Заявка ${item.id} не доставлена. Повтор через ${Math.round(delayMs / 1000)}s`);
    }

    if (changed) {
      await persistQueueToDisk();
    }
  } catch (error) {
    console.error('❌ Ошибка обработки очереди:', extractErrorDetails(error));
  } finally {
    isQueueProcessing = false;
  }
}

async function initializeDeliveryChannels() {
  if (channelTelegramConfigured()) {
    console.log('📲 Telegram канал настроен (primary)');
  } else {
    console.warn('⚠️ Telegram не настроен (проверьте BOT_TOKEN/CHAT_ID)');
  }

  if (channelEmailConfigured()) {
    console.log('📧 SMTP канал настроен (secondary)');
  } else {
    console.warn('⚠️ SMTP не настроен (проверьте SMTP_HOST/SMTP_USER/SMTP_PASS/MAIL_TO)');
  }

  await loadQueueFromDisk();
  console.log(`📥 Очередь доставки загружена: ${deliveryQueue.length} задач`);

  const timer = setInterval(() => {
    processQueue().catch((error) => {
      console.error('❌ Queue tick error:', extractErrorDetails(error));
    });
  }, QUEUE_RETRY_INTERVAL_MS);
  timer.unref();
}

console.log('\n🚀 Starting server...');
console.log(`   PORT: ${PORT}`);
console.log(`   BOT_TOKEN: ${BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`   CHAT_ID: ${CHAT_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`   SMTP_HOST: ${SMTP_HOST ? '✅ Set' : '❌ Not set'}`);
console.log(`   SMTP_USER: ${SMTP_USER ? '✅ Set' : '❌ Not set'}`);
console.log(`   MAIL_TO: ${MAIL_TO ? '✅ Set' : '❌ Not set'}`);
console.log(`   QUEUE_FILE_PATH: ${QUEUE_FILE_PATH}\n`);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    queueSize: deliveryQueue.length,
    channels: {
      email: channelEmailConfigured(),
      telegram: channelTelegramConfigured()
    }
  });
});

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

    return res.json({
      message: 'Не найдено сообщений. Отправьте любое сообщение боту и попробуйте снова.',
      hint: 'После отправки сообщения боту, обновите эту страницу'
    });
  } catch (error) {
    console.error('Ошибка при получении CHAT_ID:', extractErrorDetails(error));
    return res.status(500).json({ error: 'Ошибка при получении CHAT_ID' });
  }
});

app.get('/api/smtp-diag', async (req, res) => {
  const net = require('net');
  const dns = require('dns');
  const results = {
    timestamp: new Date().toISOString(),
    config: {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER: SMTP_USER ? '✅ Set' : '❌ Not set',
      SMTP_PASS: SMTP_PASS ? '✅ Set' : '❌ Not set',
      MAIL_FROM,
      MAIL_TO,
    },
    tests: {}
  };

  // 1. DNS resolve
  try {
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4(SMTP_HOST, (err, addrs) => err ? reject(err) : resolve(addrs));
    });
    results.tests.dns = { ok: true, addresses };
  } catch (err) {
    results.tests.dns = { ok: false, error: err.message };
  }

  // 2. TCP connect port 465
  for (const port of [465, 587]) {
    try {
      await new Promise((resolve, reject) => {
        const sock = net.createConnection({ host: SMTP_HOST, port, timeout: 10000 });
        sock.once('connect', () => { sock.destroy(); resolve(); });
        sock.once('timeout', () => { sock.destroy(); reject(new Error(`TCP timeout ${port}`)); });
        sock.once('error', (e) => { sock.destroy(); reject(e); });
      });
      results.tests[`tcp_${port}`] = { ok: true };
    } catch (err) {
      results.tests[`tcp_${port}`] = { ok: false, error: err.message };
    }
  }

  // 3. Nodemailer verify (current config)
  try {
    const transporter = createMailTransport();
    await transporter.verify();
    results.tests.nodemailer_verify = { ok: true, message: 'SMTP auth successful' };
  } catch (err) {
    results.tests.nodemailer_verify = { ok: false, error: err.message, code: err.code };
  }

  // 4. Nodemailer verify port 587 (if current is 465)
  if (SMTP_PORT === 465) {
    try {
      const alt = nodemailer.createTransport({
        host: SMTP_HOST, port: 587, secure: false, requireTLS: true,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: { rejectUnauthorized: SMTP_TLS_REJECT_UNAUTHORIZED },
        connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 15000,
      });
      await alt.verify();
      results.tests.nodemailer_verify_587 = { ok: true, message: 'SMTP auth on 587 successful' };
    } catch (err) {
      results.tests.nodemailer_verify_587 = { ok: false, error: err.message, code: err.code };
    }
  }

  const allOk = Object.values(results.tests).every(t => t.ok);
  res.status(allOk ? 200 : 500).json(results);
});

app.post('/api/submit', async (req, res) => {
  const lead = normalizeLeadPayload(req.body);

  if (!lead.name || !lead.phone) {
    return res.status(400).json({
      error: 'name и phone обязательны'
    });
  }

  if (!channelEmailConfigured() && !channelTelegramConfigured()) {
    return res.status(500).json({
      error: 'Нет активных каналов доставки (email/telegram)'
    });
  }

  try {
    const deliveryResult = await deliverLeadWithFallback(lead);

    if (deliveryResult.ok) {
      return res.status(200).json({
        success: true,
        delivery: deliveryResult.channel,
        queued: false
      });
    }

    const queuedItem = await enqueueLeadForRetry(lead, deliveryResult.errors);
    console.error(`⚠️ Заявка ${queuedItem.id} добавлена в очередь ретраев`);

    return res.status(202).json({
      success: true,
      delivery: 'queued_retry',
      queued: true,
      queueId: queuedItem.id
    });
  } catch (error) {
    console.error('❌ Ошибка при обработке формы:', extractErrorDetails(error));
    return res.status(500).json({
      error: 'Ошибка обработки заявки',
      details: extractErrorDetails(error)
    });
  }
});

const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  app.use(createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true,
    logLevel: 'silent',
    filter: (pathname) => !pathname.startsWith('/api')
  }));
} else {
  const staticPath = path.join(__dirname, 'dist');
  app.use(express.static(staticPath, {
    extensions: ['html', 'htm'],
    index: false
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    const requestedPath = path.join(staticPath, req.path);
    const htmlPath = path.join(staticPath, req.path + '.html');

    if (fs.existsSync(requestedPath) && !fs.statSync(requestedPath).isDirectory()) {
      return res.sendFile(requestedPath);
    }

    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }

    return res.sendFile(path.join(staticPath, 'index.html'));
  });
}

initializeDeliveryChannels().catch((error) => {
  console.error('❌ Инициализация каналов не завершилась:', extractErrorDetails(error));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log('📡 API endpoints:');
  console.log('   - GET  /health');
  console.log('   - GET  /api/test');
  console.log('   - POST /api/test');
  console.log('   - GET  /api/get-chat-id');
  console.log('   - POST /api/submit');
  console.log(`🌐 Frontend: http://0.0.0.0:${PORT}\n`);
});

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
