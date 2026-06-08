import type { CatalogFilterOption } from './catalog-filter-options'

export type CatalogFilterGroupKey =
  | 'collection'
  | 'size'
  | 'firmness'
  | 'type'
  | 'loadRange'
  | 'heightRange'
  | 'fillings'
  | 'features'

export type CatalogFilterGroups = Partial<Record<CatalogFilterGroupKey, CatalogFilterOption[]>>

/** Сегмент модалки «Как выбрать?»: текст и опционально изображение (из Strapi). */
export type CatalogFilterHelpSegment = {
  text: string
  imageUrl?: string
  imageAlt?: string
}

export type CatalogFilterHelpEntry = {
  modalTitle: string
  segments: CatalogFilterHelpSegment[]
}

export type CatalogFilterHelp = Partial<Record<CatalogFilterGroupKey, CatalogFilterHelpEntry>>

export type CatalogShareHelpKey = 'favouritesShare' | 'productShare'

export type CatalogShareHelp = Partial<Record<CatalogShareHelpKey, CatalogFilterHelpEntry>>

export type CatalogHelpKey = CatalogFilterGroupKey | CatalogShareHelpKey

export type CatalogFiltersPayload = {
  groups: CatalogFilterGroups
  filterHelp: CatalogFilterHelp
  shareHelp: CatalogShareHelp
}

export type CatalogMediaSource = {
  type: string
  src: string
}

export type CatalogProductMediaItem = {
  type: 'image' | 'video'
  src: string
  fallbackSrc?: string
  sources?: CatalogMediaSource[]
  poster?: string
  posterFallbackSrc?: string
  posterSources?: CatalogMediaSource[]
  alt?: string
  mime?: string
}

export type CatalogProduct = {
  name?: string | null
  slug?: string | null
  collectionName?: string | null
  collectionSlug?: string | null
  firmness?: string | null
  mattressType?: string | null
  heightCm?: number | string | null
  maxLoadKg?: number | string | null
  loadRange?: string | null
  heightRange?: string | null
  sizes?: unknown[]
  widths?: unknown[]
  lengths?: unknown[]
  fillings?: unknown[]
  features?: unknown[]
  imageUrl?: string | null
  imageAlt?: string | null
  gallery?: CatalogProductMediaItem[]
  tags?: unknown[]
  coverDescription?: string | null
  layersCatalog?: string | null
  isActive?: boolean | null
}

export type CatalogHeroSlide = {
  type?: 'image' | 'video' | string | null
  src?: string | null
  poster?: string | null
  alt?: string | null
  mime?: string | null
}

export type CatalogHeroFeed = {
  slides: CatalogHeroSlide[]
  autoplayMs?: number | string | null
  autoplay_ms?: number | string | null
}

export type CatalogProductsView = 'listing' | 'full'

export type CatalogFeedSource = 'api' | 'session-storage' | 'disk-snapshot'

export type CatalogProductsFetchResult = {
  items: CatalogProduct[]
  source: CatalogFeedSource
}

const SESSION_CATALOG_PRODUCTS_LISTING_KEY = 'catalog:products:listing'
const SESSION_CATALOG_PRODUCTS_FULL_KEY = 'catalog:products:full'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

function readSessionCatalogProducts(view: CatalogProductsView): CatalogProduct[] | null {
  try {
    const key = view === 'listing' ? SESSION_CATALOG_PRODUCTS_LISTING_KEY : SESSION_CATALOG_PRODUCTS_FULL_KEY
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { items?: CatalogProduct[] }
    const items = Array.isArray(parsed.items) ? parsed.items : []
    return items.length > 0 ? items.map(normalizeCatalogProductForUi) : null
  } catch {
    return null
  }
}

function writeSessionCatalogProducts(view: CatalogProductsView, items: CatalogProduct[]): void {
  try {
    const key = view === 'listing' ? SESSION_CATALOG_PRODUCTS_LISTING_KEY : SESSION_CATALOG_PRODUCTS_FULL_KEY
    sessionStorage.setItem(key, JSON.stringify({ items, savedAt: Date.now() }))
  } catch {
    // sessionStorage may be unavailable
  }
}

async function fetchCatalogProductsSnapshot(view: CatalogProductsView): Promise<CatalogProduct[]> {
  const snapshotPath =
    view === 'listing' ? '/catalog-products-listing.snapshot.json' : '/catalog-products.snapshot.json'
  const payload = await fetchJson<{ items?: CatalogProduct[] }>(snapshotPath)
  const items = Array.isArray(payload.items) ? payload.items : []
  return items.map(normalizeCatalogProductForUi)
}

export async function fetchCatalogProductsWithFallback(
  view: CatalogProductsView = 'full',
): Promise<CatalogProductsFetchResult> {
  try {
    const payload = await fetchJson<{ items?: CatalogProduct[] }>(catalogProductsPath(view))
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeCatalogProductForUi) : []
    if (items.length === 0) throw new Error('Empty catalog feed')
    writeSessionCatalogProducts(view, items)
    return { items, source: 'api' }
  } catch {
    const cached = readSessionCatalogProducts(view)
    if (cached && cached.length > 0) {
      return { items: cached, source: 'session-storage' }
    }
    const snapshotItems = await fetchCatalogProductsSnapshot(view)
    if (snapshotItems.length > 0) {
      return { items: snapshotItems, source: 'disk-snapshot' }
    }
    throw new Error('Catalog unavailable')
  }
}

export async function fetchCatalogFilters(): Promise<CatalogFiltersPayload> {
  const payload = await fetchJson<{
    groups?: CatalogFilterGroups
    filterHelp?: CatalogFilterHelp
    shareHelp?: CatalogShareHelp
  }>('/api/catalog/filters')
  const filterHelp =
    payload.filterHelp && typeof payload.filterHelp === 'object' && !Array.isArray(payload.filterHelp)
      ? payload.filterHelp
      : {}
  const shareHelp =
    payload.shareHelp && typeof payload.shareHelp === 'object' && !Array.isArray(payload.shareHelp)
      ? payload.shareHelp
      : {}
  return {
    groups: payload.groups && typeof payload.groups === 'object' ? payload.groups : {},
    filterHelp,
    shareHelp,
  }
}

export function normalizeCatalogCollectionSlug(item: CatalogProduct): string {
  const raw = String(item.collectionSlug || item.slug || '').trim().toLowerCase()
  if (raw === 'toppers' || raw === 'topers' || raw === 'topper') return 'topper'
  return raw
}

export function normalizeCatalogProductForUi(item: CatalogProduct): CatalogProduct {
  return {
    ...item,
    collectionSlug: normalizeCatalogCollectionSlug(item),
  }
}

let catalogProductsListingPrefetch: Promise<CatalogProduct[]> | null = null
let catalogProductsFullPrefetch: Promise<CatalogProduct[]> | null = null

function catalogProductsPath(view: CatalogProductsView): string {
  return view === 'listing' ? '/api/catalog/products?view=listing' : '/api/catalog/products'
}

export function prefetchCatalogProductsFeed(): void {
  catalogProductsListingPrefetch = fetchCatalogProducts('listing')
  catalogProductsFullPrefetch = fetchCatalogProducts('full')
}

export async function fetchCatalogProducts(view: CatalogProductsView = 'full'): Promise<CatalogProduct[]> {
  const payload = await fetchJson<{ items?: CatalogProduct[] }>(catalogProductsPath(view))
  const items = Array.isArray(payload.items) ? payload.items : []
  return items.map(normalizeCatalogProductForUi)
}

export async function getCatalogProductsFeed(): Promise<CatalogProduct[]> {
  if (catalogProductsListingPrefetch) {
    const pending = catalogProductsListingPrefetch
    catalogProductsListingPrefetch = null
    try {
      const items = await pending
      if (items.length > 0) return items
    } catch {
      // prefetch failed — use fallback chain below
    }
  }
  const result = await fetchCatalogProductsWithFallback('listing')
  return result.items
}

export async function getCatalogProductsFullFeed(): Promise<CatalogProduct[]> {
  if (catalogProductsFullPrefetch) {
    const pending = catalogProductsFullPrefetch
    catalogProductsFullPrefetch = null
    try {
      const items = await pending
      if (items.length > 0) return items
    } catch {
      // prefetch failed — use fallback chain below
    }
  }
  const result = await fetchCatalogProductsWithFallback('full')
  return result.items
}

export async function fetchCatalogHeroFeed(): Promise<CatalogHeroFeed> {
  const payload = await fetchJson<Partial<CatalogHeroFeed>>('/api/catalog/hero-slides')
  return {
    ...payload,
    slides: Array.isArray(payload.slides) ? payload.slides : [],
  }
}
