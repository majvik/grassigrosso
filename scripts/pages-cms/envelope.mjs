/**
 * Envelope + canonical page-content validators (Phase A).
 *
 * - Strapi feed: { data: <canonical> }  — no source
 * - Disk snapshot file: <canonical> only — no source, no wrapper
 * - Node GET /api/pages/:slug: { data, source } where source ∈ PAGES_CMS_SOURCES
 */
import { PAGES_CMS_SLUGS, PAGES_CMS_SOURCES } from './constants.mjs'
import { normalizeMapIframeHtml } from './normalize-map-iframe.mjs'

/** Required top-level keys on canonical page content (fixture baseline). */
export const CANONICAL_REQUIRED_KEYS = Object.freeze({
  index: ['hero', 'solutions', 'collections', 'testimonials', 'docs'],
  hotels: ['hero', 'stats', 'categories', 'products', 'faq_items'],
  dealers: ['hero', 'stats', 'offers', 'packages', 'faq_items'],
  contacts: ['hero', 'offices', 'contact_info'],
  documents: ['hero', 'certificates', 'company_documents', 'faq_items'],
  'download-catalog': ['title', 'submit_label', 'media_display_mode', 'slides'],
})

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Walk object/arrays; collect paths where key === map_iframe_html.
 * @param {unknown} node
 * @param {string} prefix
 * @param {string[]} out
 */
function collectMapIframePaths(node, prefix, out) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectMapIframePaths(item, `${prefix}[${i}]`, out))
    return
  }
  if (!isPlainObject(node)) return
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (key === 'map_iframe_html') out.push(path)
    collectMapIframePaths(value, path, out)
  }
}

/**
 * @param {unknown} data
 * @param {string} slug
 * @returns {string[]} failures
 */
export function validateCanonicalPageContent(data, slug) {
  const failures = []
  if (!PAGES_CMS_SLUGS.includes(slug)) {
    failures.push(`unknown slug: ${slug}`)
    return failures
  }
  if (!isPlainObject(data)) {
    failures.push(`${slug}: canonical data must be a plain object`)
    return failures
  }

  const required = CANONICAL_REQUIRED_KEYS[slug] || []
  for (const key of required) {
    if (!(key in data)) failures.push(`${slug}: missing required key "${key}"`)
  }

  const htmlPaths = []
  collectMapIframePaths(data, '', htmlPaths)
  for (const p of htmlPaths) {
    failures.push(`${slug}: public canonical must not include map_iframe_html at ${p}`)
  }

  if (slug === 'contacts' && Array.isArray(data.offices)) {
    data.offices.forEach((office, i) => {
      if (!isPlainObject(office)) {
        failures.push(`${slug}: offices[${i}] must be object`)
        return
      }
      if (!('map_embed_url' in office)) {
        failures.push(`${slug}: offices[${i}] missing map_embed_url`)
        return
      }
      const url = office.map_embed_url
      if (url !== null && typeof url !== 'string') {
        failures.push(`${slug}: offices[${i}].map_embed_url must be string|null`)
      }
      if (typeof url === 'string') {
        // Re-validate allowlist by wrapping as single iframe src
        const roundTrip = normalizeMapIframeHtml(`<iframe src="${url}"></iframe>`)
        if (roundTrip !== url) {
          failures.push(`${slug}: offices[${i}].map_embed_url failed allowlist re-check`)
        }
      }
    })
  }

  if ('source' in data) {
    failures.push(`${slug}: canonical data must not include source`)
  }

  return failures
}

/**
 * Strapi feed response shape.
 * @param {unknown} body
 * @param {string} slug
 * @returns {string[]}
 */
export function validateFeedEnvelope(body, slug) {
  const failures = []
  if (!isPlainObject(body)) {
    failures.push(`${slug} feed: body must be object`)
    return failures
  }
  const keys = Object.keys(body)
  if (!keys.includes('data')) failures.push(`${slug} feed: missing data`)
  if (keys.includes('source')) failures.push(`${slug} feed: must not include source`)
  for (const key of keys) {
    if (key !== 'data') failures.push(`${slug} feed: unexpected key "${key}"`)
  }
  if ('data' in body) {
    failures.push(...validateCanonicalPageContent(body.data, slug))
  }
  return failures
}

/**
 * Disk snapshot = canonical only.
 * @param {unknown} body
 * @param {string} slug
 * @returns {string[]}
 */
export function validateSnapshotPayload(body, slug) {
  const failures = []
  if (!isPlainObject(body)) {
    failures.push(`${slug} snapshot: must be canonical object`)
    return failures
  }
  if ('source' in body) failures.push(`${slug} snapshot: must not include source`)
  // Snapshot must not be wrapped as { data }
  if (
    Object.keys(body).length === 1 &&
    'data' in body &&
    isPlainObject(body.data) &&
    !('hero' in body) &&
    !('title' in body) &&
    !('offices' in body)
  ) {
    failures.push(`${slug} snapshot: must store canonical data, not { data } wrapper`)
  }
  failures.push(...validateCanonicalPageContent(body, slug))
  return failures
}

/**
 * Node GET /api/pages/:slug response.
 * @param {unknown} body
 * @param {string} slug
 * @returns {string[]}
 */
export function validateNodeEnvelope(body, slug) {
  const failures = []
  if (!isPlainObject(body)) {
    failures.push(`${slug} node: body must be object`)
    return failures
  }
  const keys = Object.keys(body)
  if (!keys.includes('data')) failures.push(`${slug} node: missing data`)
  if (!keys.includes('source')) failures.push(`${slug} node: missing source`)
  for (const key of keys) {
    if (key !== 'data' && key !== 'source') {
      failures.push(`${slug} node: unexpected key "${key}"`)
    }
  }
  if ('source' in body && !PAGES_CMS_SOURCES.includes(body.source)) {
    failures.push(`${slug} node: invalid source ${JSON.stringify(body.source)}`)
  }
  if ('data' in body) {
    failures.push(...validateCanonicalPageContent(body.data, slug))
  }
  return failures
}

/**
 * Build public canonical contacts payload from CMS/fixture shape.
 * @param {Record<string, unknown>} fixture
 */
export function contactsFixtureToCanonical(fixture) {
  const offices = Array.isArray(fixture.offices)
    ? fixture.offices.map((office) => {
        if (!office || typeof office !== 'object') return office
        const { map_iframe_html: html, ...rest } = office
        return {
          ...rest,
          map_embed_url: normalizeMapIframeHtml(html),
        }
      })
    : fixture.offices
  const { ...rest } = fixture
  return { ...rest, offices }
}
