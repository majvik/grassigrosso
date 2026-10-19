import type { CatalogCardMeta } from './catalog-filtering'
import {
  STANDARD_MATTRESS_SIZES,
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
      .filter(Boolean),
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
    firmnessSide1: dataset.firmnessSide1 && Number.isInteger(Number(dataset.firmnessSide1)) ? Number(dataset.firmnessSide1) : null,
    firmnessSide2: dataset.firmnessSide2 && Number.isInteger(Number(dataset.firmnessSide2)) ? Number(dataset.firmnessSide2) : null,
    type: String(dataset.type || ''),
    height: Number(dataset.height || 0),
    load: Number(dataset.load || 0),
    price: Number(dataset.price || 0),
    recommended: String(dataset.recommended || '') === 'true' || String(dataset.recommended || '') === '1',
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
