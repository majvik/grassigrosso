/**
 * Envelope + canonical validators (test/harness only — not Strapi runtime).
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const strapiPagesCmsUtils = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../strapi-catalog/src/api/pages-cms/utils',
)

const { normalizeMapIframeHtml } = require(path.join(strapiPagesCmsUtils, 'normalize-map-iframe.js'))
const { PAGES_CMS_SLUGS } = require(path.join(strapiPagesCmsUtils, 'map-allowlist.js'))
const { DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS } = require(
  path.join(strapiPagesCmsUtils, 'deep-populate.js'),
)
const { LEGAL_PAGES_CMS_SLUGS } = require(path.join(strapiPagesCmsUtils, 'legal-allowlist.js'))
const { canonicalizeLegalPageData } = require(
  path.join(strapiPagesCmsUtils, 'legal-page-contract.js'),
)

/** Node response source vocabulary (API-05). */
export const PAGES_CMS_SOURCES = Object.freeze(['strapi', 'memory-cache', 'disk-snapshot'])

export { PAGES_CMS_SLUGS, DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS, normalizeMapIframeHtml }

/** Required top-level keys on canonical page content. */
export const CANONICAL_REQUIRED_KEYS = Object.freeze({
  index: ['hero', 'solutions', 'collections', 'testimonials', 'docs'],
  hotels: ['hero', 'stats', 'categories', 'products', 'faq_items'],
  dealers: ['hero', 'stats', 'offers', 'packages', 'faq_items'],
  contacts: ['hero', 'offices', 'contact_info'],
  documents: ['hero', 'certificates', 'company_documents', 'faq_items'],
  'download-catalog': ['title', 'lead', 'submit_label', 'catalog_pdf', 'back_label', 'back_href'],
  privacy: ['title', 'effective_date', 'body'],
  terms: ['title', 'effective_date', 'body'],
  cookies: ['title', 'effective_date', 'body'],
})

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
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
    const pathKey = prefix ? `${prefix}.${key}` : key
    if (key === 'map_iframe_html') out.push(pathKey)
    collectMapIframePaths(value, pathKey, out)
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

  if (slug === 'download-catalog') {
    for (const key of DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS) {
      if (key in data) {
        failures.push(
          `${slug}: texts canonical must not include "${key}" (slides feed owns slider fields)`,
        )
      }
    }
  }

  if (LEGAL_PAGES_CMS_SLUGS.includes(slug)) {
    try {
      canonicalizeLegalPageData(data)
    } catch (err) {
      failures.push(`${slug}: legal contract: ${err.message}`)
    }
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
  return { ...fixture, offices }
}

/**
 * Strip slider-owned fields from download-catalog fixture → texts canonical.
 * @param {Record<string, unknown>} fixture
 */
export function downloadCatalogFixtureToTextsCanonical(fixture) {
  const out = { ...fixture }
  for (const key of DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS) {
    delete out[key]
  }
  return out
}
