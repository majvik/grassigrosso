'use strict';

const { preferAvifVariant } = require('./prefer-avif');

const LEGACY_SHARE_FILTER_KEYS = new Set(['favouritesShare', 'productShare']);

const SEGMENT_VARIANTS = new Set([
  'intro',
  'heading',
  'paragraph',
  'listItem',
  'numberedListItem',
]);

function mediaUrl(media) {
  return media && media.url ? preferAvifVariant(String(media.url)) : '';
}

function mediaAlt(media, fallback) {
  if (!media) return fallback || '';
  return String(media.alternativeText || media.name || fallback || '');
}

function mapSummaryItems(items) {
  const mapped = (Array.isArray(items) ? items : [])
    .map((item) => ({
      lead: String(item?.lead || '').replace(/^\s+/, ''),
      highlight: String(item?.highlight || '').trim(),
    }))
    .filter((item) => item.lead || item.highlight);
  if (!mapped.length) return undefined;
  return mapped;
}

function mapHelpRow(row, keyField) {
  const key = String(row?.[keyField] || '').trim();
  if (!key) return null;

  const segments = (Array.isArray(row.segments) ? row.segments : [])
    .map((seg) => {
      const variantRaw = String(seg?.variant || 'paragraph').trim();
      const variant = SEGMENT_VARIANTS.has(variantRaw) ? variantRaw : 'paragraph';
      const listIndex = Number(seg?.list_index);
      return {
        variant,
        text: String(seg?.body || '').trim(),
        listIndex:
          variant === 'numberedListItem' && Number.isFinite(listIndex) && listIndex > 0
            ? listIndex
            : undefined,
        imageUrl: mediaUrl(seg?.photo) || undefined,
        imageAlt: mediaAlt(seg?.photo, '') || undefined,
      };
    })
    .filter((s) => s.text || s.imageUrl);

  const summaryItems = mapSummaryItems(row?.summary_items);
  const summaryTitle = String(row?.summary_title || 'Если коротко').trim() || 'Если коротко';
  const modalTitle = String(row?.modal_title || '').trim();

  if (!modalTitle && segments.length === 0 && !summaryItems) return null;

  return {
    key,
    entry: {
      modalTitle,
      summary: summaryItems
        ? {
            title: summaryTitle,
            items: summaryItems,
          }
        : undefined,
      segments,
    },
  };
}

function mapHelpRows(rows, keyField) {
  const out = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const mapped = mapHelpRow(row, keyField);
    if (!mapped) continue;
    out[mapped.key] = mapped.entry;
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
