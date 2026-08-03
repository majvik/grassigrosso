'use strict';

/**
 * Locked map embed allowlist (Phase A+).
 * Exact hosts only — no wildcards.
 */

const MAP_EMBED_ALLOWED_HOSTS = Object.freeze(['yandex.ru']);

/** Pathname must start with this prefix (e.g. /map-widget/v1/...). */
const MAP_EMBED_PATH_PREFIX = '/map-widget/';

const PAGES_CMS_SLUGS = Object.freeze([
  'index',
  'hotels',
  'dealers',
  'contacts',
  'documents',
  'download-catalog',
]);

const SLUG_TO_UID = Object.freeze({
  index: 'api::index-page.index-page',
  hotels: 'api::hotels-page.hotels-page',
  dealers: 'api::dealers-page.dealers-page',
  contacts: 'api::contacts-page.contacts-page',
  documents: 'api::documents-page.documents-page',
  'download-catalog': 'api::download-catalog-page.download-catalog-page',
});

module.exports = {
  MAP_EMBED_ALLOWED_HOSTS,
  MAP_EMBED_PATH_PREFIX,
  PAGES_CMS_SLUGS,
  SLUG_TO_UID,
};
