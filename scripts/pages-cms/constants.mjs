/**
 * Pages CMS Phase A — locked map embed allowlist.
 * Spec: docs/superpowers/specs/2026-08-03-pages-cms-feeds-proxy-seed-design.md
 */

/** Exact hostnames only (no wildcards). Proven by contacts fixtures. */
export const MAP_EMBED_ALLOWED_HOSTS = Object.freeze(['yandex.ru'])

/** Pathname must start with this prefix (e.g. /map-widget/v1/...). */
export const MAP_EMBED_PATH_PREFIX = '/map-widget/'

export const PAGES_CMS_SLUGS = Object.freeze([
  'index',
  'hotels',
  'dealers',
  'contacts',
  'documents',
  'download-catalog',
])

export const PAGES_CMS_SOURCES = Object.freeze(['strapi', 'memory-cache', 'disk-snapshot'])

export const SLUG_TO_UID = Object.freeze({
  index: 'api::index-page.index-page',
  hotels: 'api::hotels-page.hotels-page',
  dealers: 'api::dealers-page.dealers-page',
  contacts: 'api::contacts-page.contacts-page',
  documents: 'api::documents-page.documents-page',
  'download-catalog': 'api::download-catalog-page.download-catalog-page',
})
