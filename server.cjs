const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const nodemailer = require('nodemailer');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { createAntiSpamProtector } = require('./lib/anti-spam.cjs');
const { normalizeOriginList, buildCorsOptions } = require('./lib/cors-config.cjs');
const db = require('./lib/db.cjs');
const { buildConfirmationEmail } = require('./lib/confirmation-email.cjs');
require('dotenv').config();

const app = express();
const isProd = process.env.NODE_ENV === 'production';

const PORT = Number(process.env.PORT || 3000);
const STRAPI_URL = String(process.env.STRAPI_URL || '').trim().replace(/\/+$/, '');
const STRAPI_TOKEN = String(process.env.STRAPI_TOKEN || '').trim();
const APP_VERSION = String(process.env.APP_VERSION || process.env.GIT_SHA || 'dev').trim();
const INTERNAL_API_PREFIXES = [
  '/api/submit',
  '/api/catalog',
  '/api/download',
  '/api/unsubscribe',
  '/api/test',
  '/api/get-chat-id',
  '/api/smtp-diag'
];

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const RAW_CHAT_ID = process.env.CHAT_ID || '';
const CHAT_IDS = RAW_CHAT_ID
  .split(',')
  .map((id) => id.trim())
  .filter((id) => id.length > 0);
const CHAT_ID = CHAT_IDS[0] || '';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = (process.env.SMTP_SECURE || 'true') === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;
const MAIL_TO = process.env.MAIL_TO || SMTP_USER;
const SMTP_TLS_REJECT_UNAUTHORIZED = (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true') === 'true';

const QUEUE_RETRY_INTERVAL_MS = Number(process.env.QUEUE_RETRY_INTERVAL_MS || 15000);
const QUEUE_BASE_RETRY_DELAY_MS = Number(process.env.QUEUE_BASE_RETRY_DELAY_MS || 30000);
const QUEUE_MAX_RETRY_DELAY_MS = Number(process.env.QUEUE_MAX_RETRY_DELAY_MS || 15 * 60 * 1000);
const SPAM_WINDOW_MS = Number(process.env.SPAM_WINDOW_MS || 10 * 60 * 1000);
const SPAM_MAX_SUBMITS_PER_WINDOW = Number(process.env.SPAM_MAX_SUBMITS_PER_WINDOW || 6);
const SPAM_MIN_SUBMIT_INTERVAL_MS = Number(process.env.SPAM_MIN_SUBMIT_INTERVAL_MS || 8000);
const SPAM_BLOCK_MS = Number(process.env.SPAM_BLOCK_MS || 30 * 60 * 1000);
const SPAM_MAX_COMMENT_LENGTH = Number(process.env.SPAM_MAX_COMMENT_LENGTH || 2500);
const SPAM_MAX_NAME_LENGTH = Number(process.env.SPAM_MAX_NAME_LENGTH || 120);
const SPAM_MAX_PHONE_LENGTH = Number(process.env.SPAM_MAX_PHONE_LENGTH || 40);
const SPAM_MAX_EMAIL_LENGTH = Number(process.env.SPAM_MAX_EMAIL_LENGTH || 160);
const CORS_ALLOWED_ORIGINS = normalizeOriginList(
  process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173'
);

let isQueueProcessing = false;

const corsOptions = buildCorsOptions({
  allowedOrigins: CORS_ALLOWED_ORIGINS
});
app.use(cors(corsOptions));

app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Canonical domain redirect (production only)
const SITE_URL = String(process.env.SITE_URL || '').trim();
let PRIMARY_HOST = 'grassigrosso.com';
if (SITE_URL) {
  try {
    PRIMARY_HOST = new URL(SITE_URL).host.toLowerCase();
  } catch {
    // Keep default if SITE_URL is malformed
  }
}
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.path === '/health') {
      return next();
    }
    const host = String(req.headers.host || '').replace(/:\d+$/, '').toLowerCase();

    if (!host || host === PRIMARY_HOST) {
      return next();
    }

    const targetUrl = `https://${PRIMARY_HOST}${req.originalUrl || '/'}`;
    return res.redirect(301, targetUrl);
  });

  // Канонические URL без .html (совпадают с canonical в HTML и sitemap)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/assets/')) return next();
    if (!req.path.endsWith('.html')) return next();

    const q = req.originalUrl.indexOf('?');
    const qs = q >= 0 ? req.originalUrl.slice(q) : '';
    const dest = req.path === '/index.html' ? `/${qs}` : `${req.path.slice(0, -5)}${qs}`;
    return res.redirect(301, dest);
  });
}

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
    page: String(body.page || '').trim() || 'Не указана',
  };
}

function normalizeStrapiListPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function normalizeStrapiMediaUrl(rawUrl) {
  if (!rawUrl) return '';
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (!STRAPI_URL) return rawUrl;
  return `${STRAPI_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

function mapStrapiProduct(item) {
  const node = item && item.attributes ? item.attributes : item;
  if (!node) return null;
  const normalizeStringList = (value) => {
    if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean)
    const single = String(value || '').trim()
    return single ? [single] : []
  };
  const normalizeFeatureRelations = (value) => {
    const rows = Array.isArray(value?.data) ? value.data : (Array.isArray(value) ? value : []);
    return rows
      .map((row) => {
        const attrs = row?.attributes || row || {};
        const slug = String(attrs.slug || '').trim();
        if (slug) return slug;
        const name = String(attrs.name || '').trim();
        const mapByName = {
          'Съемный чехол': 'removableCover',
          'Эффект зима-лето': 'winterSummer',
          'Разная жесткость сторон': 'dualFirmness',
        };
        return mapByName[name] || '';
      })
      .filter(Boolean);
  };
  const normalizeDimensionValue = (value) => {
    const raw = String(value || '').trim()
    const match = raw.match(/\d+/)
    return match ? match[0] : raw
  };
  const mapFirmness = (value) => {
    const raw = String(value || '').trim().toLowerCase()
    if (raw === 'мягкий') return 'soft'
    if (raw === 'средний') return 'medium'
    if (raw === 'жесткий') return 'hard'
    return raw
  };
  const mapMattressType = (value) => {
    const raw = String(value || '').trim().toLowerCase()
    if (raw === 'пружинный') return 'spring'
    if (raw === 'беспружинный') return 'nospring'
    if (raw === 'топер') return 'topper'
    return raw
  };
  const mapLoadRange = (value) => {
    const raw = String(value || '').trim()
    const dict = {
      'до_90_кг': 'upTo90',
      'до_110_кг': 'upTo110',
      'до_130_кг': 'upTo130',
      'до_150_кг': 'upTo150',
      'свыше_150_кг': 'over150',
    }
    return dict[raw] || raw
  };
  const mapHeightRange = (value) => {
    const raw = String(value || '').trim()
    const dict = { 'низкий': 'low', 'средний': 'mid', 'высокий': 'high' }
    return dict[raw] || raw
  };
  const mapFilling = (value) => {
    const raw = String(value || '').trim()
    const dict = { 'кокос': 'coir', 'латекс': 'latex', 'мемори': 'memory', 'ппу': 'ppu', 'холкон': 'holkon' }
    return dict[raw] || raw
  };
  const mapFeature = (value) => {
    const raw = String(value || '').trim()
    const dict = {
      'съемный_чехол': 'removableCover',
      'зима_лето': 'winterSummer',
      'разная_жесткость': 'dualFirmness',
    }
    return dict[raw] || raw
  };

  const collectionRaw = node.collection?.data?.attributes || node.collection || {};
  const tagsRaw = Array.isArray(node.tags?.data) ? node.tags.data : (Array.isArray(node.tags) ? node.tags : []);
  const mediaNode = Array.isArray(node.media?.data) ? node.media.data[0] : (node.media?.data || node.media || null);
  const mediaAttrs = mediaNode?.attributes || mediaNode || {};

  const collectionName = collectionRaw.name || '';
  const collectionSlug = collectionRaw.slug || '';
  const firmness = mapFirmness(node.firmness || '');
  const mattressType = mapMattressType(node.mattress_type || node.mattressType || '');

  return {
    name: node.name || '',
    slug: node.slug || '',
    collectionName,
    collectionSlug,
    firmness,
    mattressType,
    heightCm: Number(node.height_cm ?? node.heightCm ?? 0),
    maxLoadKg: Number(node.max_load_kg ?? node.maxLoadKg ?? 0),
    loadRange: mapLoadRange(node.load_range ?? node.loadRange ?? ''),
    heightRange: mapHeightRange(node.height_range ?? node.heightRange ?? ''),
    widths: normalizeStringList(node.widths).map(normalizeDimensionValue),
    lengths: normalizeStringList(node.lengths).map(normalizeDimensionValue),
    fillings: normalizeStringList(node.fillings).map(mapFilling),
    features: (() => {
      const fromRelation = normalizeFeatureRelations(node.features);
      if (fromRelation.length > 0) return fromRelation;
      return normalizeStringList(node.features).map(mapFeature);
    })(),
    imageUrl: normalizeStrapiMediaUrl(mediaAttrs.url || ''),
    imageAlt: mediaAttrs.alternativeText || mediaAttrs.name || (node.name ? `Коллекция ${node.name}` : 'Изображение товара'),
    tags: tagsRaw.map((tagNode) => {
      const t = tagNode?.attributes || tagNode || {};
      return String(t.name || '').trim();
    }).filter(Boolean),
    isActive: node.is_active !== false
  };
}

function buildTelegramMessage(lead) {
  return `🚀 *Новая заявка с сайта*\n\n` +
    `📄 *Страница:* ${escapeMarkdown(lead.page) || 'Не указана'}\n` +
    `👤 *Имя:* ${escapeMarkdown(lead.name) || 'Не указано'}\n` +
    (lead.city ? `📍 *Город:* ${escapeMarkdown(lead.city)}\n` : '') +
    (lead.email ? `📧 *Email:* ${escapeMarkdown(lead.email)}\n` : '') +
    `📞 *Телефон:* ${escapeMarkdown(lead.phone) || 'Не указан'}\n` +
    `💬 *Сообщение:* ${escapeMarkdown(lead.comment) || 'Нет'}`;
}

function buildEmailSubject(lead) {
  return `[Grassigrosso] Новая заявка (${lead.page || 'Сайт'})`;
}

function formatMoscowTime() {
  try {
    return new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' МСК';
  } catch {
    return new Date().toISOString();
  }
}

function buildEmailText(lead) {
  return [
    'Новая заявка с сайта Grassigrosso',
    '',
    `Страница: ${lead.page || 'Не указана'}`,
    `Имя: ${lead.name || 'Не указано'}`,
    `Город: ${lead.city || 'Не указан'}`,
    `Email: ${lead.email || 'Не указан'}`,
    `Телефон: ${lead.phone || 'Не указан'}`,
    `Сообщение: ${lead.comment || 'Нет'}`,
    '',
    `Время: ${formatMoscowTime()}`
  ].join('\n');
}

function buildEmailHtml(lead) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1e1e1e; line-height: 1.45;">
      <h2 style="margin: 0 0 16px;">Новая заявка с сайта Grassigrosso</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 760px;">
        <tr><td style="padding: 6px 0; font-weight: bold;">Страница:</td><td style="padding: 6px 0;">${escapeHtml(lead.page || 'Не указана')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Имя:</td><td style="padding: 6px 0;">${escapeHtml(lead.name || 'Не указано')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Город:</td><td style="padding: 6px 0;">${escapeHtml(lead.city || 'Не указан')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Email:</td><td style="padding: 6px 0;">${escapeHtml(lead.email || 'Не указан')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Телефон:</td><td style="padding: 6px 0;">${escapeHtml(lead.phone || 'Не указан')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; vertical-align: top;">Сообщение:</td><td style="padding: 6px 0;">${escapeHtml(lead.comment || 'Нет')}</td></tr>
      </table>
      <p style="margin-top: 16px; color: #666;">Время: ${escapeHtml(formatMoscowTime())}</p>
    </div>
  `;
}

function channelEmailConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_TO && MAIL_FROM);
}

function channelTelegramConfigured() {
  return Boolean(BOT_TOKEN && CHAT_IDS.length > 0);
}

function extractErrorDetails(error) {
  if (!error) return 'Unknown error';
  if (error.response?.data?.description) return String(error.response.data.description);
  if (error.response?.data?.error) return String(error.response.data.error);
  if (error.message) return String(error.message);
  return String(error);
}

function extractAxiosErrorDetails(error) {
  if (!error) return { message: 'Unknown error' };
  const details = {
    message: String(error.message || 'Request failed'),
  };
  if (error.code) details.code = String(error.code);
  if (error.config?.url) details.url = String(error.config.url);
  if (Number.isFinite(error.response?.status)) details.status = Number(error.response.status);
  if (error.response?.statusText) details.statusText = String(error.response.statusText);
  if (error.response?.data !== undefined) {
    if (typeof error.response.data === 'string') {
      details.responseData = error.response.data.slice(0, 1200);
    } else {
      details.responseData = error.response.data;
    }
  }
  return details;
}

function createStrapiProxy() {
  return createProxyMiddleware({
    target: STRAPI_URL,
    changeOrigin: true,
    xfwd: true,
    ws: true,
    logLevel: 'warn',
    proxyTimeout: 15000,
    timeout: 15000,
    // Express strips the mount prefix from req.url for app.use('/admin', ...).
    // Forward the original URL so Strapi receives /admin/* instead of /init, /login, etc.
    pathRewrite: (path, req) => req.originalUrl || path,
    onError(err, req, res) {
      const errorDetails = {
        message: String(err?.message || 'Proxy error'),
        code: err?.code ? String(err.code) : undefined
      };
      console.error('❌ Ошибка Strapi proxy:', { path: req.originalUrl, ...errorDetails });
      if (res.headersSent) return;
      res.status(502).json({
        error: 'Failed to proxy request to Strapi',
        path: req.originalUrl,
        details: errorDetails
      });
    }
  });
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

const antiSpamProtector = createAntiSpamProtector({
  windowMs: SPAM_WINDOW_MS,
  maxSubmitsPerWindow: SPAM_MAX_SUBMITS_PER_WINDOW,
  minSubmitIntervalMs: SPAM_MIN_SUBMIT_INTERVAL_MS,
  blockMs: SPAM_BLOCK_MS,
  maxCommentLength: SPAM_MAX_COMMENT_LENGTH,
  maxNameLength: SPAM_MAX_NAME_LENGTH,
  maxPhoneLength: SPAM_MAX_PHONE_LENGTH,
  maxEmailLength: SPAM_MAX_EMAIL_LENGTH
});

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

const PAGE_EMAIL_ROUTING = {
  'Главная страница':   ['sales@grassigrosso.com'],
  'Главная (КП)':       ['sales@grassigrosso.com'],
  'Страница "Отелям"':  ['hotels@grassigrosso.com'],
  'Отелям (каталог)':   ['hotels@grassigrosso.com'],
  'Страница "Дилерам"': ['b2b@grassigrosso.com'],
  'Документы':          ['sales@grassigrosso.com'],
  'Документы (помощь)': ['sales@grassigrosso.com'],
  'Страница "Контакты"':['sales@grassigrosso.com'],
};

function getEmailRecipients(page) {
  return PAGE_EMAIL_ROUTING[page] || [MAIL_TO];
}

const DOWNLOAD_FILE_ROUTING = {
  declaration: 'Декларация.pdf',
  certificate: 'СертификатСоответствия.pdf',
  trademark: 'СвидетельствоНаТоварныйЗнак.pdf',
  presentation: 'Grassigrosso-company.pdf',
  catalog: 'Catalog_v1.2.pdf'
};

function resolveDownloadPath(filename) {
  const candidates = [
    path.join(__dirname, 'data', 'documents', filename),
    path.join(__dirname, 'dist', 'documents', filename),
    path.join(__dirname, 'public', 'documents', filename)
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function sendLeadToEmail(lead) {
  if (!channelEmailConfigured()) {
    throw new Error('Email channel is not configured');
  }

  const transporter = createMailTransport();
  const baseRecipients = getEmailRecipients(lead.page);
  const recipients = Array.from(new Set([...baseRecipients, 'callback@grassigrosso.com']));

  const to = recipients.join(', ');
  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: buildEmailSubject(lead),
    text: buildEmailText(lead),
    html: buildEmailHtml(lead),
  });
  console.log(`📧 Lead-письмо отправлено: ${to} (страница: ${lead.page})`);
}

async function sendConfirmationToUser(lead) {
  if (!channelEmailConfigured() || !lead.email) return;
  try {
    const transporter = createMailTransport();
    const { subject, html, text, attachments } = buildConfirmationEmail(lead);
    await transporter.sendMail({
      from: MAIL_FROM,
      to: lead.email,
      subject,
      html,
      text,
      attachments,
    });
    console.log(`✅ Подтверждение отправлено на ${lead.email}`);
  } catch (err) {
    console.error(`⚠️ Не удалось отправить подтверждение на ${lead.email}:`, err.message);
  }
}

async function sendLeadToTelegram(lead) {
  if (!channelTelegramConfigured()) {
    throw new Error('Telegram channel is not configured');
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const message = buildTelegramMessage(lead);
  const errors = [];

  for (const id of CHAT_IDS) {
    try {
      await axios.post(url, {
        chat_id: id,
        text: message,
        parse_mode: 'Markdown'
      });
    } catch (err) {
      errors.push({ chatId: id, error: extractErrorDetails(err) });
    }
  }

  if (errors.length === CHAT_IDS.length) {
    const summary = errors.map((e) => `${e.chatId}: ${e.error}`).join('; ');
    throw new Error(`Telegram delivery failed for all CHAT_IDs: ${summary}`);
  }
}

async function deliverLeadWithFallback(lead) {
  const errors = {};

  // Telegram – primary (быстрый, надёжный)
  try {
    await sendLeadToTelegram(lead);
  } catch (error) {
    errors.telegram = extractErrorDetails(error);
    console.error('❌ Ошибка отправки Telegram:', errors.telegram);
  }

  // Email – secondary (дублирование)
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

async function migrateJsonQueueToSqlite() {
  const legacyPath = process.env.QUEUE_FILE_PATH || path.join(__dirname, 'data', 'delivery-queue.json');
  try {
    const raw = await fsp.readFile(legacyPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      await fsp.rename(legacyPath, legacyPath + '.bak').catch(() => {});
      return 0;
    }
    const count = db.importFromQueue(parsed);
    await fsp.rename(legacyPath, legacyPath + '.bak');
    console.log(`📦 Мигрировано ${count} заявок из JSON в SQLite`);
    return count;
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    console.error('⚠️ Ошибка миграции JSON-очереди:', err.message);
    return 0;
  }
}

async function processQueue() {
  if (isQueueProcessing) return;
  isQueueProcessing = true;

  try {
    const pending = db.getPendingLeads(Date.now());

    for (const row of pending) {
      const lead = {
        name: row.name,
        phone: row.phone,
        email: row.email,
        city: row.city,
        comment: row.comment,
        page: row.page,
      };

      const attemptNumber = row.attempts + 1;
      const result = await deliverLeadWithFallback(lead);

      if (result.ok) {
        db.markDelivered(row.id, result.channel);
        console.log(`✅ Заявка #${row.id} доставлена через ${result.channel}`);
        continue;
      }

      const delayMs = calculateRetryDelayMs(attemptNumber);
      const errorText = JSON.stringify(result.errors);
      db.updateRetrySchedule(row.id, attemptNumber, Date.now() + delayMs, errorText);
      console.error(`❌ Заявка #${row.id} не доставлена (попытка ${attemptNumber}). Повтор через ${Math.round(delayMs / 1000)}s`);
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

  db.getDb();
  await migrateJsonQueueToSqlite();

  const pendingCount = db.getPendingCount();
  console.log(`📥 SQLite инициализирована: ${pendingCount} заявок ожидают доставки (${db.DB_PATH})`);

  const timer = setInterval(() => {
    processQueue().catch((error) => {
      console.error('❌ Queue tick error:', extractErrorDetails(error));
    });
  }, QUEUE_RETRY_INTERVAL_MS);
  timer.unref();
}

console.log('\n🚀 Starting server...');
console.log(`   PORT: ${PORT}`);
console.log(`   APP_VERSION: ${APP_VERSION}`);
console.log(`   BOT_TOKEN: ${BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
console.log(`   CHAT_ID: ${CHAT_IDS.length > 0 ? '✅ Set' : '❌ Not set'}`);
console.log(`   SMTP_HOST: ${SMTP_HOST ? '✅ Set' : '❌ Not set'}`);
console.log(`   SMTP_USER: ${SMTP_USER ? '✅ Set' : '❌ Not set'}`);
console.log(`   MAIL_TO: ${MAIL_TO ? '✅ Set' : '❌ Not set'}`);
console.log(`   SPAM_WINDOW_MS: ${SPAM_WINDOW_MS}`);
console.log(`   SPAM_MAX_SUBMITS_PER_WINDOW: ${SPAM_MAX_SUBMITS_PER_WINDOW}`);
console.log(`   SPAM_MIN_SUBMIT_INTERVAL_MS: ${SPAM_MIN_SUBMIT_INTERVAL_MS}`);
console.log(`   SPAM_BLOCK_MS: ${SPAM_BLOCK_MS}`);
console.log(`   CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS.length > 0 ? CORS_ALLOWED_ORIGINS.join(', ') : '(none)'}`);
console.log(`   DB_PATH: ${db.DB_PATH}\n`);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: APP_VERSION,
    queueSize: db.getPendingCount(),
    channels: {
      email: channelEmailConfigured(),
      telegram: channelTelegramConfigured()
    }
  });
});

app.get('/api/catalog/hero-slides', async (req, res) => {
  if (!STRAPI_URL) {
    return res.status(503).json({ error: 'STRAPI_URL is not configured', slides: [] });
  }

  try {
    const feedUrl = `${STRAPI_URL}/api/catalog-hero-feed`;
    const response = await axios.get(feedUrl, { timeout: 10000 });
    const slides = Array.isArray(response.data?.slides) ? response.data.slides : [];
    const normalizedSlides = slides.map((slide) => ({
      type: slide.type === 'video' ? 'video' : 'image',
      src: normalizeStrapiMediaUrl(slide.src || ''),
      poster: normalizeStrapiMediaUrl(slide.poster || ''),
      alt: String(slide.alt || '').trim(),
      mime: String(slide.mime || '').trim(),
    })).filter((slide) => slide.src);
    const autoplayRaw = Number(response.data?.autoplayMs ?? response.data?.autoplay_ms);
    const autoplayMs = Number.isFinite(autoplayRaw) ? Math.max(2500, autoplayRaw) : 6500;
    return res.json({
      slides: normalizedSlides,
      autoplayMs,
      source: response.data?.source || 'strapi-catalog-hero-feed',
    });
  } catch (error) {
    const details = extractAxiosErrorDetails(error);
    console.error('❌ Ошибка загрузки hero-слайдера из Strapi:', details);
    return res.status(502).json({
      error: 'Failed to fetch catalog hero from Strapi',
      details,
      slides: [],
    });
  }
});

app.get('/api/catalog/products', async (req, res) => {
  if (!STRAPI_URL) {
    return res.status(503).json({ error: 'STRAPI_URL is not configured' });
  }

  try {
    // Preferred: custom public Strapi endpoint (no role permissions needed)
    const feedUrl = `${STRAPI_URL}/api/catalog-feed`;
    const feedResponse = await axios.get(feedUrl, { timeout: 15000 });
    const feedItems = Array.isArray(feedResponse.data?.items) ? feedResponse.data.items : [];
    const normalizedFeedItems = feedItems.map((item) => ({
      ...item,
      imageUrl: normalizeStrapiMediaUrl(item?.imageUrl || '')
    }));
    // Treat a successful feed response as authoritative even when list is empty.
    // This avoids false 502 when Strapi /api/products is unavailable in current setup.
    return res.json({ items: normalizedFeedItems, source: 'strapi-catalog-feed' });
  } catch (_) {
    // Fallback to default products endpoint (if project is configured that way)
  }

  try {
    const fallbackUrl = `${STRAPI_URL}/api/products`;
    const fallbackResponse = await axios.get(fallbackUrl, {
      headers: STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {},
      params: {
        'filters[is_active][$eq]': true,
        'populate[collection]': '*',
        'populate[tags]': '*',
        'populate[media]': '*',
        sort: ['sort_order:asc', 'id:asc'],
        pagination: { pageSize: 100 }
      },
      timeout: 15000
    });

    const rows = normalizeStrapiListPayload(fallbackResponse.data);
    const products = rows.map(mapStrapiProduct).filter((item) => item && item.name);
    return res.json({ items: products, source: 'strapi-products' });
  } catch (error) {
    const details = extractAxiosErrorDetails(error);
    console.error('❌ Ошибка загрузки каталога из Strapi:', details);
    return res.status(502).json({
      error: 'Failed to fetch catalog from Strapi',
      details
    });
  }
});

if (isProd && STRAPI_URL) {
  const strapiProxy = createStrapiProxy();
  const strapiAdminPrefixes = [
    '/admin',
    '/uploads',
    '/content-manager',
    '/content-type-builder',
    '/i18n',
    '/documentation'
  ];
  app.use(strapiAdminPrefixes, strapiProxy);
  app.use('/api', (req, res, next) => {
    const originalPath = req.originalUrl || req.url || '';
    const isInternal = INTERNAL_API_PREFIXES.some((prefix) => originalPath.startsWith(prefix));
    if (isInternal) return next();
    return strapiProxy(req, res, next);
  });
}

app.get('/api/download/:docId', (req, res) => {
  const docId = String(req.params.docId || '').trim().toLowerCase();
  const filename = DOWNLOAD_FILE_ROUTING[docId];

  if (!filename) {
    return res.status(404).json({ error: 'Документ не найден' });
  }

  const filePath = resolveDownloadPath(filename);
  if (!filePath) {
    return res.status(404).json({ error: 'Файл недоступен' });
  }

  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  return res.sendFile(filePath);
});

if (!isProd) {
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
}

const { verifyUnsubscribeToken } = require('./lib/confirmation-email.cjs');

app.get('/api/unsubscribe', async (req, res) => {
  const { email, token } = req.query;

  if (!email || !token) {
    return res.status(400).send('Неверная ссылка отписки');
  }

  try {
    if (!verifyUnsubscribeToken(email, token)) {
      return res.status(403).send('Неверная ссылка отписки');
    }
  } catch {
    return res.status(403).send('Неверная ссылка отписки');
  }

  if (channelEmailConfigured()) {
    try {
      const transporter = createMailTransport();
      const notifyRecipients = [
        'sales@grassigrosso.com',
        'callback@grassigrosso.com',
      ].join(', ');

      await transporter.sendMail({
        from: MAIL_FROM,
        to: notifyRecipients,
        subject: `Запрос на отписку: ${email}`,
        text: `Email ${email} запрашивает исключение из рассылки.\n\nДата: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
        html: `<p>Email <strong>${email}</strong> запрашивает исключение из рассылки.</p><p>Дата: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</p>`,
      });
      console.log(`📧 Уведомление об отписке ${email} отправлено`);
    } catch (err) {
      console.error(`⚠️ Не удалось отправить уведомление об отписке:`, err.message);
    }
  }

  return res.redirect('/unsubscribe.html');
});

app.post('/api/submit', async (req, res) => {
  const lead = normalizeLeadPayload(req.body);

  const antiSpamResult = antiSpamProtector.checkSubmission({
    ip: getClientIp(req),
    body: req.body,
    lead
  });
  if (!antiSpamResult.ok) {
    if (antiSpamResult.retryAfterSeconds) {
      res.setHeader('Retry-After', String(antiSpamResult.retryAfterSeconds));
    }
    console.warn(`🛡️ Антиспам: блокировка submit с IP ${antiSpamResult.ip}. Причина: ${antiSpamResult.error}`);
    return res.status(antiSpamResult.status).json({
      error: antiSpamResult.error
    });
  }

  if (!lead.name || !lead.phone || !lead.email) {
    return res.status(400).json({
      error: 'name, phone и email обязательны'
    });
  }

  if (!channelEmailConfigured() && !channelTelegramConfigured()) {
    return res.status(500).json({
      error: 'Нет активных каналов доставки (email/telegram)'
    });
  }

  let leadId;
  try {
    leadId = db.insertLead(lead);
  } catch (dbErr) {
    console.error('❌ Ошибка записи в БД:', extractErrorDetails(dbErr));
    return res.status(500).json({ error: 'Ошибка обработки заявки' });
  }

  try {
    const deliveryResult = await deliverLeadWithFallback(lead);

    // Подтверждение пользователю отправляется ПОСЛЕ доставки заявки,
    // чтобы не конкурировать за SMTP-соединение
    sendConfirmationToUser(lead);

    if (deliveryResult.ok) {
      db.markDelivered(leadId, deliveryResult.channel);
      return res.status(200).json({
        success: true,
        delivery: deliveryResult.channel,
        queued: false
      });
    }

    const errorText = JSON.stringify(deliveryResult.errors);
    const delayMs = calculateRetryDelayMs(1);
    db.updateRetrySchedule(leadId, 1, Date.now() + delayMs, errorText);
    console.error(`⚠️ Заявка #${leadId} добавлена в очередь ретраев`);

    return res.status(202).json({
      success: true,
      delivery: 'queued_retry',
      queued: true,
      leadId
    });
  } catch (error) {
    console.error('❌ Ошибка при обработке формы:', extractErrorDetails(error));
    sendConfirmationToUser(lead);
    return res.status(500).json({
      error: 'Ошибка обработки заявки',
      details: extractErrorDetails(error)
    });
  }
});

const isDev = !isProd;

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

  // Явная раздача OG-изображения с кэшированием, чтобы краулеры/соцсети стабильно получали картинку
  app.get('/social-image.png', (req, res) => {
    const file = path.join(staticPath, 'social-image.png');
    if (!fs.existsSync(file)) {
      return res.status(404).end();
    }
    res.set({
      'Cache-Control': 'public, max-age=604800, immutable',
      'Content-Type': 'image/png'
    });
    res.sendFile(file);
  });

  const documentsVolumePath = path.join(__dirname, 'data', 'documents');
  if (fs.existsSync(documentsVolumePath)) {
    app.use('/documents', express.static(documentsVolumePath, { redirect: false }));
  }

  app.use(express.static(staticPath, {
    extensions: ['html', 'htm'],
    index: false,
    redirect: false
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    const normalizedPath = (req.path === '/' || req.path === '') ? '/' : req.path;
    if (normalizedPath === '/') {
      const indexPath = path.join(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }

    const requestedPath = path.join(staticPath, req.path);
    const htmlPath = path.join(staticPath, req.path + '.html');

    if (fs.existsSync(requestedPath) && !fs.statSync(requestedPath).isDirectory()) {
      return res.sendFile(requestedPath);
    }

    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }

    const notFoundPath = path.join(staticPath, '404.html');
    if (fs.existsSync(notFoundPath)) {
      return res.status(404).sendFile(notFoundPath);
    }
    return res.status(404).sendFile(path.join(staticPath, 'index.html'));
  });
}

initializeDeliveryChannels().catch((error) => {
  console.error('❌ Инициализация каналов не завершилась:', extractErrorDetails(error));
});

const spamCleanupTimer = setInterval(() => {
  antiSpamProtector.cleanupState();
}, Math.max(60000, Math.floor(SPAM_WINDOW_MS / 2)));
spamCleanupTimer.unref();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log('📡 API endpoints:');
  console.log('   - GET  /health');
  if (!isProd) {
    console.log('   - GET  /api/test');
    console.log('   - POST /api/test');
    console.log('   - GET  /api/get-chat-id');
    console.log('   - GET  /api/smtp-diag');
  }
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
