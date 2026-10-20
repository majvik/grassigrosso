'use strict';

const UID = 'api::catalog-listing.catalog-listing';

const DEFAULTS = {
  recommended_section_title: 'Наш выбор для вашего сна',
  recommended_section_subtitle: 'Оптимальные системы поддержки, комфорта и восстановления.',
  all_products_section_title: 'Все товары',
};

const LEGACY_RECOMMENDED_TITLE = 'Мы рекомендуем';

/**
 * Idempotently ensure catalog listing section copy exists.
 * Only migrates the previous default title and fills the newly introduced subtitle;
 * custom admin copy remains untouched.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi
 */
async function seedCatalogListing(strapi) {
  const docs = strapi.documents(UID);
  const existing = await docs.findFirst({});
  if (existing?.documentId) {
    const updates = {};
    if (String(existing.recommended_section_title || '').trim() === LEGACY_RECOMMENDED_TITLE) {
      updates.recommended_section_title = DEFAULTS.recommended_section_title;
    }
    if (!String(existing.recommended_section_subtitle || '').trim()) {
      updates.recommended_section_subtitle = DEFAULTS.recommended_section_subtitle;
    }
    if (Object.keys(updates).length > 0) {
      await docs.update({ documentId: existing.documentId, data: updates });
      strapi.log.info('Catalog bootstrap: migrated catalog-listing section copy');
      return { updated: true };
    }
    return { skipped: true };
  }

  await docs.create({ data: { ...DEFAULTS } });
  strapi.log.info('Catalog bootstrap: seeded catalog-listing section titles');
  return { created: true };
}

module.exports = {
  seedCatalogListing,
  DEFAULT_CATALOG_LISTING_SECTIONS: {
    recommendedTitle: DEFAULTS.recommended_section_title,
    recommendedSubtitle: DEFAULTS.recommended_section_subtitle,
    allProductsTitle: DEFAULTS.all_products_section_title,
  },
};
