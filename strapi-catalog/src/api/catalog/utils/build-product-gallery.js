'use strict';

const {
  resolveImageMedia,
  resolveVideoMedia,
  resolvePosterMedia,
} = require('./resolve-media-sources');

const MAX_GALLERY_ITEMS = 5;

function mediaUrl(media) {
  if (!media) return '';
  return String(media.url || '').trim();
}

function mediaMime(media) {
  if (!media) return '';
  return String(media.mime || '').trim();
}

function mediaAlt(media, fallback) {
  if (!media) return fallback || '';
  return String(media.alternativeText || media.name || fallback || '').trim();
}

function dedupeKey(item) {
  if (!item || !item.src) return '';
  return `${item.type}|${item.fallbackSrc || item.src}`;
}

function pushItem(items, seen, item) {
  if (!item || !item.src) return;
  const key = dedupeKey(item);
  if (!key || seen.has(key)) return;
  seen.add(key);
  items.push(item);
}

function applyImageFields(item, resolved) {
  item.src = resolved.src;
  item.fallbackSrc = resolved.fallbackSrc;
  if (resolved.sources.length > 0) {
    item.sources = resolved.sources;
  }
}

function applyPosterFields(item, posterUrl) {
  if (!posterUrl) return;
  const resolved = resolvePosterMedia(posterUrl);
  item.poster = resolved.src;
  item.posterFallbackSrc = resolved.fallbackSrc;
  if (resolved.sources.length > 0) {
    item.posterSources = resolved.sources;
  }
}

function itemFromVideoRow(row, fallbackName) {
  const videoUrl = mediaUrl(row?.slide_video);
  if (!videoUrl) return null;
  const resolved = resolveVideoMedia(videoUrl);
  const alt = String(row?.alt_text || '').trim();
  const item = {
    type: 'video',
    src: resolved.src,
    fallbackSrc: resolved.fallbackSrc,
    alt: alt || mediaAlt(row.slide_video, fallbackName || 'Видео'),
    mime: mediaMime(row.slide_video) || resolved.mime || 'video/mp4',
  };
  applyPosterFields(item, mediaUrl(row?.poster));
  return item;
}

function itemFromImageRow(row, fallbackName) {
  const imageUrl = mediaUrl(row?.slide_image);
  if (!imageUrl) return null;
  const resolved = resolveImageMedia(imageUrl);
  const alt = String(row?.alt_text || '').trim();
  const item = {
    type: 'image',
    alt: alt || mediaAlt(row.slide_image, fallbackName || 'Изображение товара'),
  };
  applyImageFields(item, resolved);
  return item;
}

function itemFromGalleryComponentRow(row, fallbackName) {
  const video = itemFromVideoRow(row, fallbackName);
  if (video) return video;
  return itemFromImageRow(row, fallbackName);
}

function itemFromLegacyMedia(media, imageUrl, fallbackName) {
  const url = mediaUrl(media) || String(imageUrl || '').trim();
  if (!url) return null;
  const mime = mediaMime(media);
  if (mime.startsWith('video/')) {
    const resolved = resolveVideoMedia(url);
    return {
      type: 'video',
      src: resolved.src,
      fallbackSrc: resolved.fallbackSrc,
      alt: mediaAlt(media, fallbackName || 'Видео'),
      mime: mime || resolved.mime || 'video/mp4',
    };
  }
  const resolved = resolveImageMedia(url);
  const item = {
    type: 'image',
    alt: mediaAlt(media, fallbackName || 'Изображение товара'),
  };
  applyImageFields(item, resolved);
  return item;
}

/**
 * @param {object} row Product row with optional gallery[], media, image_url, name
 * @returns {{ gallery: Array<{ type: string, src: string, fallbackSrc?: string, sources?: Array<{ type: string, src: string }>, poster?: string, posterSources?: Array<{ type: string, src: string }>, posterFallbackSrc?: string, alt?: string, mime?: string }>, imageUrl: string, imageAlt: string }}
 */
function buildProductGallery(row) {
  const fallbackName = row?.name ? `Коллекция ${row.name}` : 'Изображение товара';
  const items = [];
  const seen = new Set();

  const galleryRows = Array.isArray(row?.gallery) ? row.gallery : [];
  for (const galleryRow of galleryRows) {
    pushItem(items, seen, itemFromGalleryComponentRow(galleryRow, fallbackName));
    if (items.length >= MAX_GALLERY_ITEMS) break;
  }

  if (items.length === 0) {
    pushItem(items, seen, itemFromLegacyMedia(row?.media, row?.image_url, fallbackName));
  }

  const gallery = items.slice(0, MAX_GALLERY_ITEMS);
  const first = gallery[0];
  const imageUrl =
    first?.type === 'image'
      ? first.src
      : first?.type === 'video'
        ? first.poster || ''
        : '';
  const imageAlt = first?.alt || fallbackName;

  return { gallery, imageUrl, imageAlt };
}

module.exports = {
  MAX_GALLERY_ITEMS,
  buildProductGallery,
};
