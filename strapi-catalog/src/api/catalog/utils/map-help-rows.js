'use strict';

const { preferAvifVariant } = require('./prefer-avif');

const LEGACY_SHARE_FILTER_KEYS = new Set(['favouritesShare', 'productShare']);

function mediaUrl(media) {
  return media && media.url ? preferAvifVariant(String(media.url)) : '';
}

function mediaAlt(media, fallback) {
  if (!media) return fallback || '';
  return String(media.alternativeText || media.name || fallback || '');
}

function mapHelpRows(rows, keyField) {
  const out = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = String(row?.[keyField] || '').trim();
    if (!key) continue;
    const segments = (Array.isArray(row.segments) ? row.segments : [])
      .map((seg) => ({
        text: String(seg?.body || '').trim(),
        imageUrl: mediaUrl(seg?.photo) || undefined,
        imageAlt: mediaAlt(seg?.photo, '') || undefined,
      }))
      .filter((s) => s.text || s.imageUrl);
    const modalTitle = String(row?.modal_title || '').trim();
    if (!modalTitle && segments.length === 0) continue;
    out[key] = { modalTitle, segments };
  }
  return out;
}

function mapFilterHelpRows(rows) {
  const mapped = mapHelpRows(rows, 'filter_key');
  for (const key of LEGACY_SHARE_FILTER_KEYS) {
    delete mapped[key];
  }
  return mapped;
}

function mapShareHelpRows(rows) {
  return mapHelpRows(rows, 'share_key');
}

module.exports = {
  LEGACY_SHARE_FILTER_KEYS,
  mapFilterHelpRows,
  mapShareHelpRows,
};
