'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Корень Strapi-проекта (где лежит public/uploads/...). В production контроллер
 * исполняется из dist/src/..., в dev — из src/.... strapi.dirs.app.root —
 * самый надёжный источник.
 */
function getStrapiPublicDir() {
  try {
    const fromStrapi = strapi && strapi.dirs && strapi.dirs.app && strapi.dirs.app.root;
    if (fromStrapi) {
      return path.join(fromStrapi, 'public');
    }
  } catch {}
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', '..', 'public'),       // src/api/.../utils → 4 уровня
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'public'), // dist/src/api/.../utils → 5 уровней
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {}
  }
  return candidates[0];
}

/**
 * Если рядом с PNG/JPG/JPEG из Strapi-uploads лежит .avif с тем же базовым
 * именем — возвращаем AVIF URL (в 3-10 раз меньше PNG). Иначе возвращаем
 * исходный url без изменений. Файлы AVIF положены в strapi-catalog/public/uploads
 * рядом с PNG; на проде попадают в образ через COPY . . и раздаются Node-прокси.
 */
function preferAvifVariant(url) {
  if (!url) return url;
  const match = String(url).match(/^(.+\.)(png|jpe?g)(\?.*)?$/i);
  if (!match) return url;
  const avifUrl = `${match[1]}avif${match[3] || ''}`;
  if (!avifUrl.startsWith('/uploads/')) return url;
  const relativePath = avifUrl.split('?')[0].replace(/^\//, '');
  const absPath = path.join(getStrapiPublicDir(), relativePath);
  try {
    if (fs.existsSync(absPath)) return avifUrl;
  } catch {}
  return url;
}

module.exports = { preferAvifVariant };
