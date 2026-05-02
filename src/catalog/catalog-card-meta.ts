import type { CatalogCardMeta } from './catalog-filtering'
import {
  STANDARD_MATTRESS_SIZES,
  STANDARD_MATTRESS_SIZE_SET,
  buildStandardMattressSizesFromLegacy,
  normalizeCatalogSizeValue,
} from './catalog-sizes'

function parseCsvDataset(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseSizesToSet(value: unknown): Set<string> {
  return new Set(
    parseCsvDataset(value)
      .map(normalizeCatalogSizeValue)
      .filter((size) => STANDARD_MATTRESS_SIZE_SET.has(size)),
  )
}

export function readCatalogueCardMeta(card: HTMLElement, index: number): CatalogCardMeta<HTMLElement> {
  const dataset = card.dataset || {}
  return {
    card,
    initialOrder: index,
    slug: String(dataset.productSlug || ''),
    collection: String(dataset.collection || ''),
    firmness: String(dataset.firmness || ''),
    type: String(dataset.type || ''),
    height: Number(dataset.height || 0),
    load: Number(dataset.load || 0),
    loadRange: String(dataset.loadRange || '').trim(),
    heightRange: String(dataset.heightRange || '').trim(),
    sizes: (() => {
      const sizes = parseSizesToSet(dataset.sizes)
      if (sizes.size) return sizes
      const legacySizes = buildStandardMattressSizesFromLegacy(dataset.widths, dataset.lengths)
      return legacySizes.size ? legacySizes : new Set(STANDARD_MATTRESS_SIZES)
    })(),
    fillings: new Set(parseCsvDataset(dataset.fillings)),
    features: new Set(parseCsvDataset(dataset.features)),
  }
}
