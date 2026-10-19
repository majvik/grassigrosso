'use strict';

const UID = 'api::catalog-listing.catalog-listing';

const DEFAULTS = {
  recommended_section_title: 'Мы рекомендуем',
  all_products_section_title: 'Все товары',
};

/**
 * Idempotently ensure catalog listing section titles exist.
 * Never overwrites admin edits once the single type document is present.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi
 */
async function seedCatalogListing(strapi) {
  const docs = strapi.documents(UID);
  const existing = await docs.findFirst({});
  if (existing?.documentId) {
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
    allProductsTitle: DEFAULTS.all_products_section_title,
  },
};
