import type { CatalogProduct } from './catalog-api'
import type { CatalogCardMeta } from './catalog-filtering'
import {
  STANDARD_MATTRESS_SIZES,
  buildStandardMattressSizesFromLegacy,
  filterStandardMattressSizes,
} from './catalog-sizes'

export type CatalogProductListingEntry = {
  product: CatalogProduct
  meta: CatalogCardMeta<HTMLElement>
}

function parseCsvList(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function buildCatalogCardMetaFromProduct(
  product: CatalogProduct,
  index: number,
  card: HTMLElement | null = null,
): CatalogCardMeta<HTMLElement> {
  const sizesFromItem = Array.isArray(product.sizes) ? filterStandardMattressSizes(product.sizes) : []
  const sizesFromLegacy = (() => {
    const widths = Array.isArray(product.widths) ? product.widths.map((value) => String(value)) : []
    const lengths = Array.isArray(product.lengths) ? product.lengths.map((value) => String(value)) : []
    return [...buildStandardMattressSizesFromLegacy(widths.join(','), lengths.join(','))]
  })()
  const sizes = sizesFromItem.length
    ? sizesFromItem
    : (sizesFromLegacy.length ? sizesFromLegacy : [...STANDARD_MATTRESS_SIZES])

  return {
    card: card as HTMLElement,
    initialOrder: index,
    slug: String(product.slug || '').trim(),
    collection: String(product.collectionSlug || product.slug || '').trim(),
    firmness: String(product.firmness || '').trim(),
    type: String(product.mattressType || '').trim(),
    height: Number(product.heightCm || 0),
    load: Number(product.maxLoadKg || 0),
    loadRange: String(product.loadRange || '').trim(),
    heightRange: String(product.heightRange || '').trim(),
    sizes: new Set(sizes.map((size) => String(size))),
    fillings: new Set(
      Array.isArray(product.fillings)
        ? product.fillings.map((value) => String(value))
        : parseCsvList(product.fillings),
    ),
    features: new Set(
      Array.isArray(product.features)
        ? product.features.map((value) => String(value))
        : parseCsvList(product.features),
    ),
  }
}

export function buildCatalogProductListingEntries(items: CatalogProduct[]): CatalogProductListingEntry[] {
  return items.map((product, index) => ({
    product,
    meta: buildCatalogCardMetaFromProduct(product, index),
  }))
}
