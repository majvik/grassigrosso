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

/** Допуск на расхождение mtime между оригиналом и сайдкаром, записанными одной командой. */
const SIDECAR_SKEW_MS = 2000;

function uploadStat(url, publicDir) {
  if (!url || !String(url).startsWith('/uploads/')) return null;
  const relativePath = String(url).split('?')[0].replace(/^\//, '');
  if (relativePath.includes('..')) return null;
  try {
    return fs.statSync(path.join(publicDir, relativePath));
  } catch {
    return null;
  }
}

/**
 * Сайдкар можно подставлять только если он не старше файла из БД.
 * Замена медиа в админке часто сохраняет тот же hash/имя, а старый .avif/.webp/.webm
 * остаётся рядом — без проверки mtime каталог продолжает показывать первоначальное изображение.
 *
 * @param {string} sourceUrl
 * @param {string} sidecarUrl
 * @param {string} [publicDir]
 */
function isCurrentUploadSidecar(sourceUrl, sidecarUrl, publicDir = getStrapiPublicDir()) {
  const sidecar = uploadStat(sidecarUrl, publicDir);
  if (!sidecar) return false;
  const source = uploadStat(sourceUrl, publicDir);
  if (!source) return true;
  return sidecar.mtimeMs + SIDECAR_SKEW_MS >= source.mtimeMs;
}

/**
 * Если рядом с PNG/JPG/JPEG из Strapi-uploads лежит не устаревший .avif с тем же
 * базовым именем — возвращаем AVIF URL. Иначе исходный url.
 * Файлы AVIF лежат в strapi-catalog/public/uploads рядом с PNG.
 *
 * @param {string} url
 * @param {string} [publicDir]
 */
function preferAvifVariant(url, publicDir = getStrapiPublicDir()) {
  if (!url) return url;
  const match = String(url).match(/^(.+\.)(png|jpe?g)(\?.*)?$/i);
  if (!match) return url;
  const avifUrl = `${match[1]}avif${match[3] || ''}`;
  if (!avifUrl.startsWith('/uploads/')) return url;
  if (isCurrentUploadSidecar(url, avifUrl, publicDir)) return avifUrl;
  return url;
}

module.exports = { preferAvifVariant, isCurrentUploadSidecar, getStrapiPublicDir };
