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
  tags?: unknown[]
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

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

export async function fetchCatalogFilterGroups(): Promise<CatalogFilterGroups> {
  const payload = await fetchJson<{ groups?: CatalogFilterGroups }>('/api/catalog/filters')
  return payload.groups && typeof payload.groups === 'object' ? payload.groups : {}
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

export async function fetchCatalogProducts(): Promise<CatalogProduct[]> {
  const payload = await fetchJson<{ items?: CatalogProduct[] }>('/api/catalog/products')
  const items = Array.isArray(payload.items) ? payload.items : []
  return items.map(normalizeCatalogProductForUi)
}

export async function fetchCatalogHeroFeed(): Promise<CatalogHeroFeed> {
  const payload = await fetchJson<Partial<CatalogHeroFeed>>('/api/catalog/hero-slides')
  return {
    ...payload,
    slides: Array.isArray(payload.slides) ? payload.slides : [],
  }
}
