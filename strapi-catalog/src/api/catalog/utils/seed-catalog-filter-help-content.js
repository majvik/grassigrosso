'use strict';

const { SUMMARY_TITLE, CATALOG_FILTER_HELP_CONTENT } = require('./seed-catalog-filter-help-content-data');

const HELP_UID = 'api::catalog-filter-help.catalog-filter-help';
const CONTENT_SEED_MARKER = 'catalog-filter-help-content-v1';

function buildHelpPayload(content) {
  return {
    modal_title: content.modal_title,
    summary_title: SUMMARY_TITLE,
    summary_items: content.summary_items.map((item) => ({
      lead: item.lead,
      highlight: item.highlight,
    })),
    segments: content.segments.map((segment) => ({
      variant: segment.variant,
      body: segment.body,
      ...(segment.list_index != null ? { list_index: segment.list_index } : {}),
    })),
  };
}

/**
 * Idempotently seed filter help copy from Figma. Skips rows that already have segments
 * (admin edits preserved). Always syncs modal_title when it differs from seed.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi
 */
async function seedCatalogFilterHelpContent(strapi) {
  const docs = strapi.documents(HELP_UID);
  let seeded = 0;
  let skipped = 0;
  let titleUpdated = 0;

  for (const [filterKey, content] of Object.entries(CATALOG_FILTER_HELP_CONTENT)) {
    const existing = await docs.findFirst({
      filters: { filter_key: filterKey },
      populate: ['segments', 'summary_items'],
    });

    const payload = buildHelpPayload(content);

    if (!existing) {
      await docs.create({
        data: {
          filter_key: filterKey,
          is_active: true,
          ...payload,
        },
      });
      seeded += 1;
      continue;
    }

    const hasSegments = Array.isArray(existing.segments) && existing.segments.length > 0;
    const needsTitleUpdate = String(existing.modal_title || '').trim() !== content.modal_title;

    if (hasSegments) {
      if (needsTitleUpdate) {
        await docs.update({
          documentId: existing.documentId,
          data: { modal_title: content.modal_title },
        });
        titleUpdated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    await docs.update({
      documentId: existing.documentId,
      data: payload,
    });
    seeded += 1;
  }

  if (seeded || titleUpdated) {
    strapi.log.info(
      `Catalog filter help content seed (${CONTENT_SEED_MARKER}): seeded=${seeded}, titles=${titleUpdated}, skipped=${skipped}`,
    );
  }

  return { seeded, skipped, titleUpdated, marker: CONTENT_SEED_MARKER };
}

module.exports = {
  seedCatalogFilterHelpContent,
  CONTENT_SEED_MARKER,
};
