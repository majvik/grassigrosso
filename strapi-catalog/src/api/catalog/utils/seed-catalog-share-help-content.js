'use strict';

const { SUMMARY_TITLE, CATALOG_SHARE_HELP_CONTENT } = require('./seed-catalog-share-help-content-data');

const SHARE_UID = 'api::catalog-share-help.catalog-share-help';
const CONTENT_SEED_MARKER = 'catalog-share-help-content-v1';

function buildSharePayload(content) {
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

function needsShareHelpSeed(existing) {
  if (!existing) return true;
  const segments = Array.isArray(existing.segments) ? existing.segments : [];
  if (segments.length === 0) return true;
  const summaryItems = Array.isArray(existing.summary_items) ? existing.summary_items : [];
  if (summaryItems.length === 0) return true;
  return false;
}

/**
 * Idempotently seed share help modals with structured copy. Re-seeds legacy single-paragraph rows.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi
 */
async function seedCatalogShareHelpContent(strapi) {
  const docs = strapi.documents(SHARE_UID);
  let seeded = 0;
  let skipped = 0;

  for (const [shareKey, content] of Object.entries(CATALOG_SHARE_HELP_CONTENT)) {
    const existing = await docs.findFirst({
      filters: { share_key: shareKey },
      populate: ['segments', 'summary_items'],
    });

    const payload = buildSharePayload(content);

    if (!existing) {
      await docs.create({
        data: {
          share_key: shareKey,
          is_active: true,
          ...payload,
        },
      });
      seeded += 1;
      continue;
    }

    if (!needsShareHelpSeed(existing)) {
      skipped += 1;
      continue;
    }

    await docs.update({
      documentId: existing.documentId,
      data: payload,
    });
    seeded += 1;
  }

  if (seeded) {
    strapi.log.info(
      `Catalog share help content seed (${CONTENT_SEED_MARKER}): seeded=${seeded}, skipped=${skipped}`,
    );
  }

  return { seeded, skipped, marker: CONTENT_SEED_MARKER };
}

module.exports = {
  seedCatalogShareHelpContent,
  CONTENT_SEED_MARKER,
};
