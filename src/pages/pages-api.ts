/**
 * Shared Pages CMS client — GET /api/pages/:slug only (Phase 4A).
 * One in-flight promise per slug; failures are not cached; retries allowed.
 */
import {
  PAGES_API_TIMEOUT_MS,
  isPagesCmsSlug,
  type PagesCmsSlug,
} from './pages-cms-constants'
import { parseNodeEnvelope, type PagesCmsEnvelope } from './pages-cms-validate'

type CacheEntry =
  | { status: 'pending'; promise: Promise<PagesCmsEnvelope> }
  | { status: 'success'; value: PagesCmsEnvelope }

const cache = new Map<PagesCmsSlug, CacheEntry>()

type FetchLike = typeof fetch

let fetchImpl: FetchLike = globalThis.fetch.bind(globalThis)

export function setPagesApiFetchForTests(fn: FetchLike | null): void {
  fetchImpl = fn ? fn.bind(globalThis) : globalThis.fetch.bind(globalThis)
}

export function resetPagesApiCacheForTests(): void {
  cache.clear()
}

export function pagesApiPath(slug: PagesCmsSlug): string {
  return `/api/pages/${slug}`
}

async function loadPageContent(slug: PagesCmsSlug): Promise<PagesCmsEnvelope> {
  if (!isPagesCmsSlug(slug)) {
    throw new Error(`Unknown pages slug: ${slug}`)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PAGES_API_TIMEOUT_MS)
  try {
    const response = await fetchImpl(pagesApiPath(slug), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const body: unknown = await response.json()
    return parseNodeEnvelope(body, slug)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Returns validated envelope. Shares in-flight promise per slug.
 * Successful results are session-cached; failures clear the entry for retry.
 */
export function fetchPageContent(slug: PagesCmsSlug): Promise<PagesCmsEnvelope> {
  const existing = cache.get(slug)
  if (existing?.status === 'success') {
    return Promise.resolve(existing.value)
  }
  if (existing?.status === 'pending') {
    return existing.promise
  }

  const promise = loadPageContent(slug).then(
    (value) => {
      cache.set(slug, { status: 'success', value })
      return value
    },
    (err: unknown) => {
      cache.delete(slug)
      throw err
    },
  )
  cache.set(slug, { status: 'pending', promise })
  return promise
}

/** Fire-and-forget prefetch; errors are swallowed (retry on later fetch). */
export function prefetchPageContent(slug: PagesCmsSlug): void {
  void fetchPageContent(slug).catch(() => {
    /* cleared by fetchPageContent rejection path */
  })
}

/** Test helper: inspect cache state without fetching. */
export function getPagesApiCacheStateForTests(
  slug: PagesCmsSlug,
): 'missing' | 'pending' | 'success' {
  const entry = cache.get(slug)
  if (!entry) return 'missing'
  return entry.status
}
