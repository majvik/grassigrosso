'use strict';

const { preferAvifVariant } = require('../utils/prefer-avif');

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
    const page = await strapi.db
      .query('api::download-catalog-page.download-catalog-page')
      .findOne({
        populate: {
          slides: {
            populate: ['slide_image', 'slide_video', 'poster'],
          },
        },
      });

    if (!page) {
      ctx.body = { slides: [], autoplayMs: 6500, source: 'strapi-download-catalog-feed' };
      return;
    }

    const slidesRaw = Array.isArray(page.slides) ? page.slides : [];
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

    const autoplayMs = Number(page.slider_autoplay_ms || 6500);

    ctx.body = {
      slides,
      autoplayMs: Number.isFinite(autoplayMs) ? Math.max(2500, autoplayMs) : 6500,
      source: 'strapi-download-catalog-feed',
    };
  },
};
