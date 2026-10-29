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

function responsiveImageSources(media, resolved) {
  const rows = [];
  const seen = new Set();
  const push = (type, src, width) => {
    const safeSrc = String(src || '').trim();
    const safeWidth = Number(width || 0);
    if (!safeSrc || !Number.isInteger(safeWidth) || safeWidth <= 0) return;
    const key = `${type}|${safeSrc}|${safeWidth}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ type: String(type || 'image/jpeg'), src: safeSrc, width: safeWidth });
  };

  const formats = media?.formats && typeof media.formats === 'object' ? Object.values(media.formats) : [];
  for (const format of formats) {
    push(format?.mime || media?.mime, format?.url, format?.width);
  }
  push(media?.mime, media?.url, media?.width);
  for (const source of resolved.sources || []) {
    const matchingWidth = rows.find((row) => row.src === resolved.fallbackSrc)?.width || Number(media?.width || 0);
    push(source.type, source.src, matchingWidth);
  }
  return rows.sort((a, b) => a.width - b.width);
}

function applyImageFields(item, resolved, media) {
  item.src = resolved.src;
  item.fallbackSrc = resolved.fallbackSrc;
  const sources = responsiveImageSources(media, resolved);
  if (sources.length > 0) {
    item.sources = sources;
  } else if (resolved.sources.length > 0) {
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
  applyImageFields(item, resolved, row.slide_image);
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
  applyImageFields(item, resolved, media);
  return item;
}

/**
 * Обложка каталога — поле media. Слайды gallery идут следом.
 * Если media пустое, первым слайдом становится первая карточка gallery.
 * image_url остаётся только когда нет ни media, ни gallery.
 *
 * @param {object} row Product row with optional gallery[], media, image_url, name
 * @returns {{ gallery: Array<{ type: string, src: string, fallbackSrc?: string, sources?: Array<{ type: string, src: string }>, poster?: string, posterSources?: Array<{ type: string, src: string }>, posterFallbackSrc?: string, alt?: string, mime?: string }>, imageUrl: string, imageAlt: string }}
 */
function buildProductGallery(row) {
  const fallbackName = row?.name ? `Коллекция ${row.name}` : 'Изображение товара';
  const items = [];
  const seen = new Set();

  pushItem(items, seen, itemFromLegacyMedia(row?.media, '', fallbackName));

  const galleryRows = Array.isArray(row?.gallery) ? row.gallery : [];
  for (const galleryRow of galleryRows) {
    if (items.length >= MAX_GALLERY_ITEMS) break;
    pushItem(items, seen, itemFromGalleryComponentRow(galleryRow, fallbackName));
  }

  if (items.length === 0) {
    pushItem(items, seen, itemFromLegacyMedia(null, row?.image_url, fallbackName));
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

function buildGalleryFromComponentRows(rows, fallbackName) {
  const items = [];
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (items.length >= MAX_GALLERY_ITEMS) break;
    pushItem(items, seen, itemFromGalleryComponentRow(row, fallbackName));
  }
  return items;
}

function buildProductDetailGallery(row) {
  const fallbackName = row?.name ? `Коллекция ${row.name}` : 'Изображение товара';
  const detail = buildGalleryFromComponentRows(row?.detail_gallery, fallbackName);
  return detail.length ? detail : buildProductGallery(row).gallery;
}

function buildProductBentoGallery(row) {
  const fallbackName = row?.name ? `Коллекция ${row.name}` : 'Изображение товара';
  return buildGalleryFromComponentRows(row?.bento_gallery, fallbackName);
}

module.exports = {
  MAX_GALLERY_ITEMS,
  buildProductGallery,
  buildProductDetailGallery,
  buildProductBentoGallery,
};
