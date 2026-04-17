'use strict';

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
          poster: posterUrl,
          alt: alt || mediaAlt(row.slide_video, 'Видео'),
          mime: mediaMime(row.slide_video) || 'video/mp4',
        });
        continue;
      }
      if (imageUrl) {
        slides.push({
          type: 'image',
          src: imageUrl,
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
