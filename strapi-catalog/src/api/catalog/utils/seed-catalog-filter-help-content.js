'use strict';

const { SUMMARY_TITLE, CATALOG_FILTER_HELP_CONTENT } = require('./seed-catalog-filter-help-content-data');

const HELP_UID = 'api::catalog-filter-help.catalog-filter-help';
const CONTENT_SEED_MARKER = 'catalog-filter-help-content-v1';
const COPY_REVISION_MARKER = 'catalog.catalog-filter-help.copy.v2-20260907.2';

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

async function applyApprovedCopyRevision(strapi) {
  const coreStore = strapi.db.connection('strapi_core_store_settings');
  const existingMarker = await coreStore.where({ key: COPY_REVISION_MARKER }).first();
  if (existingMarker) {
    return { applied: false, updated: 0, created: 0 };
  }

  const docs = strapi.documents(HELP_UID);
  let updated = 0;
  let created = 0;
  const keys = Object.keys(CATALOG_FILTER_HELP_CONTENT);

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
      created += 1;
      continue;
    }
    await docs.update({
      documentId: existing.documentId,
      data: payload,
    });
    updated += 1;
  }

  await coreStore.insert({
    key: COPY_REVISION_MARKER,
    value: JSON.stringify({ completedAt: new Date().toISOString(), keys }),
    type: 'object',
    environment: '',
    tag: '',
  });
  strapi.log.info(
    `Catalog filter help copy revision (${COPY_REVISION_MARKER}): created=${created}, updated=${updated}`,
  );
  return { applied: true, updated, created };
}

/**
 * Idempotently seed filter help copy. Applies the approved 2026-09-07 revision once
 * (core-store marker), then fills missing/empty rows without overwriting later admin edits.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi
 */
async function seedCatalogFilterHelpContent(strapi) {
  const revision = await applyApprovedCopyRevision(strapi);
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

    if (hasSegments) {
      skipped += 1;
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

  return { seeded, skipped, titleUpdated, marker: CONTENT_SEED_MARKER, revision };
}

module.exports = {
  seedCatalogFilterHelpContent,
  applyApprovedCopyRevision,
  CONTENT_SEED_MARKER,
  COPY_REVISION_MARKER,
};
