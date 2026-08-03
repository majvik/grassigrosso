/**
 * Runtime validators for Node pages envelope + canonical data (Phase 4A).
 * Not a TypeScript cast — used by the shared client before merge.
 */
import {
  CANONICAL_REQUIRED_KEYS,
  DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS,
  isPagesCmsSlug,
  isPagesCmsSource,
  type PagesCmsSlug,
  type PagesCmsSource,
} from './pages-cms-constants'

export type PagesCmsEnvelope = {
  data: Record<string, unknown>
  source: PagesCmsSource
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function collectMapIframePaths(node: unknown, prefix: string, out: string[]): void {
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

export function validateCanonicalPageContent(data: unknown, slug: string): string[] {
  const failures: string[] = []
  if (!isPagesCmsSlug(slug)) {
    failures.push(`unknown slug: ${slug}`)
    return failures
  }
  if (!isPlainObject(data)) {
    failures.push(`${slug}: canonical data must be a plain object`)
    return failures
  }

  for (const key of CANONICAL_REQUIRED_KEYS[slug]) {
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

  const htmlPaths: string[] = []
  collectMapIframePaths(data, '', htmlPaths)
  for (const p of htmlPaths) {
    failures.push(`${slug}: public canonical must not include map_iframe_html at ${p}`)
  }

  if ('source' in data) {
    failures.push(`${slug}: canonical data must not include source`)
  }

  return failures
}

export function validateNodeEnvelope(body: unknown, slug: string): string[] {
  const failures: string[] = []
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
  if ('source' in body && !isPagesCmsSource(body.source)) {
    failures.push(`${slug} node: invalid source ${JSON.stringify(body.source)}`)
  }
  if ('data' in body) {
    failures.push(...validateCanonicalPageContent(body.data, slug))
  }
  return failures
}

export function parseNodeEnvelope(body: unknown, slug: PagesCmsSlug): PagesCmsEnvelope {
  const failures = validateNodeEnvelope(body, slug)
  if (failures.length) {
    throw new Error(`Invalid pages envelope for ${slug}: ${failures.join('; ')}`)
  }
  const obj = body as PagesCmsEnvelope
  return { data: obj.data as Record<string, unknown>, source: obj.source }
}
