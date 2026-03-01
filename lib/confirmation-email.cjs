'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function getSiteUrl() {
  return process.env.SITE_URL || 'https://grassigrosso.com';
}

function getUnsubscribeSecret() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.BOT_TOKEN || 'fallback-secret';
}

let logoBase64 = '';
try {
  const logoPath = path.join(__dirname, '..', 'public', 'email-logo.png');
  if (!fs.existsSync(logoPath)) {
    const distPath = path.join(__dirname, '..', 'dist', 'email-logo.png');
    if (fs.existsSync(distPath)) {
      logoBase64 = fs.readFileSync(distPath).toString('base64');
    }
  } else {
    logoBase64 = fs.readFileSync(logoPath).toString('base64');
  }
} catch { /* fallback: no logo */ }

function generateUnsubscribeToken(email) {
  return crypto
    .createHmac('sha256', getUnsubscribeSecret())
    .update(email.toLowerCase().trim())
    .digest('hex');
}

function verifyUnsubscribeToken(email, token) {
  const expected = generateUnsubscribeToken(email);
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(token, 'hex')
  );
}

function buildUnsubscribeUrl(email) {
  const token = generateUnsubscribeToken(email);
  return `${getSiteUrl()}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildConfirmationEmail(lead) {
  const name = escapeHtml(lead.name || 'клиент');
  const unsubscribeUrl = buildUnsubscribeUrl(lead.email);

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Grassigrosso – Подтверждение обращения</title>
<!--[if mso]>
<style>
  table, td { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f7f5f3;font-family:'Nunito',Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f5f3;">
<tr><td align="center" style="padding:24px 16px;">

<!-- Main container -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">

  <!-- Header -->
  <tr>
    <td style="background-color:#ffffff;padding:24px 32px;border-bottom:1px solid #e8e6e2;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="left" valign="middle" style="width:50%;">
            <img src="data:image/png;base64,${logoBase64}" alt="Grassigrosso" width="175" height="48" style="display:block;border:0;height:auto;max-width:175px;" />
          </td>
          <td align="right" valign="middle" style="width:50%;">
            <a href="mailto:sales@grassigrosso.com" style="color:#283e37;font-size:14px;text-decoration:none;font-family:'Nunito',Arial,Helvetica,sans-serif;">sales@grassigrosso.com</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:40px 32px 32px;">
      <h1 style="margin:0 0 24px;font-size:22px;line-height:1.4;color:#283e37;font-weight:700;font-family:'Nunito',Arial,Helvetica,sans-serif;">
        Доброе утро, ${name}
      </h1>

      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1e1e1e;font-family:'Nunito',Arial,Helvetica,sans-serif;">
        Спасибо за&nbsp;обращение в&nbsp;Grassigrosso
      </p>

      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1e1e1e;font-family:'Nunito',Arial,Helvetica,sans-serif;">
        Согласно нашим стандартам мы&nbsp;отвечаем в&nbsp;течение 24&nbsp;часов в&nbsp;рамках рабочего времени. Мы&nbsp;сделаем всё возможное, чтобы вернуться с&nbsp;ответом и&nbsp;интересующей Вас информацией как можно скорее.
      </p>

      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#1e1e1e;font-family:'Nunito',Arial,Helvetica,sans-serif;">
        В&nbsp;случае если этого не&nbsp;случилось&nbsp;– вероятно произошла техническая или человеческая ошибка. В&nbsp;данной ситуации, пожалуйста, свяжитесь напрямую по&nbsp;номеру телефона с&nbsp;руководителем отдела продаж:
      </p>

      <p style="margin:0 0 4px;font-size:18px;line-height:1.5;font-family:'Nunito',Arial,Helvetica,sans-serif;">
        <a href="tel:+79782484380" style="color:#283e37;font-weight:700;text-decoration:none;">+7 (978) 248-43-80</a>
      </p>
      <p style="margin:0 0 32px;font-size:14px;line-height:1.5;color:#6b7b75;font-family:'Nunito',Arial,Helvetica,sans-serif;">
        Пн–Пт: 9:00 – 18:00
      </p>

      <p style="margin:0;font-size:16px;line-height:1.6;color:#1e1e1e;font-family:'Nunito',Arial,Helvetica,sans-serif;">
        С&nbsp;уважением,<br>
        Команда Grassigrosso
      </p>
    </td>
  </tr>

  <!-- Divider -->
  <tr>
    <td style="padding:0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-top:1px solid #e8e6e2;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 32px 24px;">
      <p style="margin:0;font-size:11px;line-height:1.5;color:rgba(30,30,30,0.35);font-family:'Nunito',Arial,Helvetica,sans-serif;">
        Письмо сформировано автоматически и&nbsp;не&nbsp;требует ответа.<br>
        <a href="${unsubscribeUrl}" style="color:rgba(30,30,30,0.35);text-decoration:underline;">Отписаться от&nbsp;рассылки</a>
      </p>
    </td>
  </tr>

</table>
<!-- /Main container -->

</td></tr>
</table>
</body>
</html>`;

  const text = `Доброе утро, ${lead.name || 'клиент'}

Спасибо за обращение в Grassigrosso

Согласно нашим стандартам мы отвечаем в течение 24 часов в рамках рабочего времени. Мы сделаем всё возможное, чтобы вернуться с ответом и интересующей Вас информацией как можно скорее.

В случае если этого не случилось – вероятно произошла техническая или человеческая ошибка. В данной ситуации, пожалуйста, свяжитесь напрямую по номеру телефона с руководителем отдела продаж:

+7 (978) 248-43-80
Пн–Пт: 9:00 – 18:00

С уважением,
Команда Grassigrosso

---
Письмо сформировано автоматически и не требует ответа.
Отписаться: ${unsubscribeUrl}`;

  return {
    subject: 'Grassigrosso – Спасибо за обращение',
    html,
    text,
  };
}

module.exports = {
  buildConfirmationEmail,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
};
