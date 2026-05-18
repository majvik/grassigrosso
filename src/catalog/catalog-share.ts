type CatalogSharedFavouritesPayload = {
  v: 1
  slugs: string[]
}

export type CatalogSharedState =
  | { mode: 'none' }
  | { mode: 'favourites'; slugs: string[]; payload: string; id: string }
  | { mode: 'product'; slug: string }

function normalizeSlugs(slugs: unknown[]): string[] {
  return [...new Set(slugs.map((slug) => String(slug || '').trim()).filter(Boolean))]
}

function encodeJsonPayload(value: unknown): string {
  const json = JSON.stringify(value)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeJsonPayload<T>(value: string): T | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as T
  } catch {
    return null
  }
}

function buildShareId(payload: string): string {
  let hash = 5381
  for (let i = 0; i < payload.length; i += 1) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(i)
  }
  return Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)
}

function catalogUrl(): URL {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  return url
}

export function buildCatalogFavouritesShareUrl(slugs: string[]): string {
  const normalized = normalizeSlugs(slugs)
  const payload = encodeJsonPayload({ v: 1, slugs: normalized } satisfies CatalogSharedFavouritesPayload)
  const url = catalogUrl()
  url.searchParams.set('fav', payload)
  return url.toString()
}

export function buildCatalogFavouritesShareMeta(slugs: string[]): { url: string; id: string } {
  const normalized = normalizeSlugs(slugs)
  const payload = encodeJsonPayload({ v: 1, slugs: normalized } satisfies CatalogSharedFavouritesPayload)
  const url = catalogUrl()
  url.searchParams.set('fav', payload)
  return { url: url.toString(), id: buildShareId(payload) }
}

export function buildCatalogProductShareUrl(slug: string): string {
  const normalized = String(slug || '').trim()
  const url = catalogUrl()
  if (normalized) url.searchParams.set('product', normalized)
  return url.toString()
}

export function readCatalogSharedState(): CatalogSharedState {
  const params = new URLSearchParams(window.location.search)
  const productSlug = String(params.get('product') || '').trim()
  if (productSlug) return { mode: 'product', slug: productSlug }

  const favPayload = String(params.get('fav') || '').trim()
  if (!favPayload) return { mode: 'none' }

  const decoded = decodeJsonPayload<CatalogSharedFavouritesPayload>(favPayload)
  const slugs = normalizeSlugs(Array.isArray(decoded?.slugs) ? decoded.slugs : [])
  if (!slugs.length) return { mode: 'none' }

  return {
    mode: 'favourites',
    slugs,
    payload: favPayload,
    id: buildShareId(favPayload),
  }
}

export function copyTextWithToast(text: string): void {
  window.dispatchEvent(new CustomEvent('app:copy-text', { detail: { text } }))
}

export function showCatalogShareWarningToast(): void {
  window.dispatchEvent(new CustomEvent('app:toast', {
    detail: {
      message: 'Позиции изменились. Скопируйте ссылку заново.',
      tone: 'warning',
    },
  }))
}
