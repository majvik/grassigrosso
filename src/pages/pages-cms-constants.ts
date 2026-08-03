/**
 * Pages CMS hydrate — shared constants (Phase 4A).
 * Browser talks only to Node GET /api/pages/:slug.
 */

export const PAGES_CMS_SLUGS = [
  'index',
  'hotels',
  'dealers',
  'contacts',
  'documents',
  'download-catalog',
] as const

export type PagesCmsSlug = (typeof PAGES_CMS_SLUGS)[number]

export const PAGES_CMS_SOURCES = ['strapi', 'memory-cache', 'disk-snapshot'] as const

export type PagesCmsSource = (typeof PAGES_CMS_SOURCES)[number]

export const CANONICAL_REQUIRED_KEYS: Readonly<Record<PagesCmsSlug, readonly string[]>> = {
  index: ['hero', 'solutions', 'collections', 'testimonials', 'docs'],
  hotels: ['hero', 'stats', 'categories', 'products', 'faq_items'],
  dealers: ['hero', 'stats', 'offers', 'packages', 'faq_items'],
  contacts: ['hero', 'offices', 'contact_info'],
  documents: ['hero', 'certificates', 'company_documents', 'faq_items'],
  'download-catalog': ['title', 'lead', 'submit_label', 'catalog_pdf', 'back_label', 'back_href'],
}

export const DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS = [
  'slides',
  'media_display_mode',
  'slider_autoplay_ms',
] as const

/** Stable key field for behavior-bound arrays (design §2). */
export const BEHAVIOR_BOUND_ARRAYS: Readonly<Record<string, string>> = {
  packages: 'value',
  certificates: 'document_key',
  company_documents: 'document_key',
  docs: 'document_key',
  offices: 'slug',
  products: 'catalog_key',
  contact_info: 'icon_key',
}

/** Content-only array field names (design §2). Nested `features` / `bullets` included. */
export const CONTENT_ONLY_ARRAYS = new Set([
  'solutions',
  'philosophy_cards',
  'collections',
  'features',
  'testimonials',
  'stats',
  'categories',
  'discount_rows',
  'refresh_features',
  'faq_items',
  'conditions',
  'offers',
  'bullets',
  'geography_cities',
  'requirements',
])

/** String fields that may apply CMS empty string (design §1). */
export const OPTIONAL_EMPTY_STRING_KEYS = new Set(['note', 'href', 'text', 'region', 'image_alt'])

/** Only nullable string in public contract. */
export const NULLABLE_STRING_KEYS = new Set(['map_embed_url'])

export const PAGES_API_TIMEOUT_MS = 10_000

export function isPagesCmsSlug(value: string): value is PagesCmsSlug {
  return (PAGES_CMS_SLUGS as readonly string[]).includes(value)
}

export function isPagesCmsSource(value: unknown): value is PagesCmsSource {
  return typeof value === 'string' && (PAGES_CMS_SOURCES as readonly string[]).includes(value)
}
