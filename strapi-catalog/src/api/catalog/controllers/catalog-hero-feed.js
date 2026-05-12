'use strict';

const fs = require('fs');
const path = require('path');

function getStrapiPublicDir() {
  try {
    const fromStrapi = strapi && strapi.dirs && strapi.dirs.app && strapi.dirs.app.root;
    if (fromStrapi) {
      return path.join(fromStrapi, 'public');
    }
  } catch {}
  // Fallback для случаев когда strapi.dirs недоступен (тесты и т.п.).
  // В production контроллер исполняется из dist/src/..., поэтому пробуем оба варианта.
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', '..', 'public'),       // src/api/.../controllers → 4 уровня + public
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'public'), // dist/src/api/.../controllers → 5 уровней + public
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {}
  }
  return candidates[0];
}

/**
 * Если рядом с PNG/JPG/JPEG файлом из Strapi-uploads лежит .avif с тем же
 * базовым именем — отдаём AVIF (в 5-10 раз меньше PNG). Это касается и
 * основной картинки, и video-poster. Файлы попадают в образ через COPY . . и
 * раздаются Node-прокси на /uploads/* (см. server.cjs).
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

function mediaUrl(media) {
  if (!media) return '';
  return media.url || '';
}

function mediaMime(media) {
  if (!media) return '';
  return media.mime || '';
}

function mediaAlt(media, fallback) {
  if (!media) return fallback || '';
  return media.alternativeText || media.name || fallback || '';
}

module.exports = {
  async index(ctx) {
    const hero = await strapi.db.query('api::catalog-new-hero.catalog-new-hero').findOne({
      populate: {
        slides: {
          populate: ['slide_image', 'slide_video', 'poster'],
        },
      },
    });

    if (!hero) {
      ctx.body = { slides: [], autoplayMs: 6500, source: 'strapi-catalog-hero-feed' };
      return;
    }

    const slidesRaw = Array.isArray(hero.slides) ? hero.slides : [];
    const slides = [];

    for (const row of slidesRaw) {
      const videoUrl = mediaUrl(row.slide_video);
      const imageUrl = mediaUrl(row.slide_image);
      const posterUrl = mediaUrl(row.poster);
      const alt = String(row.alt_text || '').trim();

      if (videoUrl) {
        slides.push({
          type: 'video',
          src: videoUrl,
          poster: preferAvifVariant(posterUrl),
          alt: alt || mediaAlt(row.slide_video, 'Видео'),
          mime: mediaMime(row.slide_video) || 'video/mp4',
        });
        continue;
      }
      if (imageUrl) {
        slides.push({
          type: 'image',
          src: preferAvifVariant(imageUrl),
          alt: alt || mediaAlt(row.slide_image, 'Слайд'),
        });
      }
    }

    const autoplayMs = Number(hero.autoplay_ms || 6500);

    ctx.body = {
      slides,
      autoplayMs: Number.isFinite(autoplayMs) ? Math.max(2500, autoplayMs) : 6500,
      source: 'strapi-catalog-hero-feed',
    };
  },
};
