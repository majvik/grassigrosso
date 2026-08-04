/**
 * Pages CMS hydrate — shared constants (Phase 4A + Phase 6C nine slugs).
 * Browser talks only to Node GET /api/pages/:slug.
 * Legal hydrate UI is Phase D — constants/allowlist expand here for API parity.
 */

export const PAGES_CMS_SLUGS = [
  'index',
  'hotels',
  'dealers',
  'contacts',
  'documents',
  'download-catalog',
  'privacy',
  'terms',
  'cookies',
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
  privacy: ['title', 'effective_date', 'body'],
  terms: ['title', 'effective_date', 'body'],
  cookies: ['title', 'effective_date', 'body'],
}

export const DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS = [
  'slides',
  'media_display_mode',
  'slider_autoplay_ms',
] as const

export const LEGAL_PAGES_CMS_SLUGS = ['privacy', 'terms', 'cookies'] as const

export type LegalPagesCmsSlug = (typeof LEGAL_PAGES_CMS_SLUGS)[number]

export const PAGES_API_TIMEOUT_MS_DEFAULT = 10_000
export let PAGES_API_TIMEOUT_MS = PAGES_API_TIMEOUT_MS_DEFAULT

export function setPagesApiTimeoutMsForTests(ms: number | null): void {
  PAGES_API_TIMEOUT_MS = ms === null ? PAGES_API_TIMEOUT_MS_DEFAULT : Math.max(1, ms)
}

export function isPagesCmsSlug(value: string): value is PagesCmsSlug {
  return (PAGES_CMS_SLUGS as readonly string[]).includes(value)
}

export function isLegalPagesCmsSlug(value: string): value is LegalPagesCmsSlug {
  return (LEGAL_PAGES_CMS_SLUGS as readonly string[]).includes(value)
}

export function isPagesCmsSource(value: unknown): value is PagesCmsSource {
  return typeof value === 'string' && (PAGES_CMS_SOURCES as readonly string[]).includes(value)
}
