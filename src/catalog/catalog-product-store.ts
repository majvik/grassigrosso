import type { CatalogProduct } from './catalog-api'

const productsBySlug = new Map<string, CatalogProduct>()

export function setCatalogProductStore(items: CatalogProduct[]): void {
  productsBySlug.clear()
  for (const item of items) {
    const slug = String(item.slug || '').trim()
    if (slug) productsBySlug.set(slug, item)
  }
}

export function getCatalogProductBySlug(slug: string): CatalogProduct | undefined {
  return productsBySlug.get(String(slug || '').trim())
}

export function getCatalogProductStoreSize(): number {
  return productsBySlug.size
}
