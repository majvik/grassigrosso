/** Format product price for catalog cards: `100 000 ₽`. */
export function formatCatalogPriceRub(priceRub: unknown): string {
  const n = Number(priceRub)
  if (!Number.isFinite(n) || n <= 0) return ''
  const int = Math.round(n)
  return `${formatCatalogPriceInput(int)} ₽`
}

/** Format price for filter inputs: `100 000` (no currency). */
export function formatCatalogPriceInput(priceRub: unknown): string {
  const n = Number(priceRub)
  if (!Number.isFinite(n) || n < 0) return ''
  const int = Math.round(n)
  return String(int).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Parse typed price (`32 000`, `32000`, `32.000`) into a non-negative integer. */
export function parseCatalogPriceInput(value: unknown): number | null {
  const raw = String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[^\d]/g, '')
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n)
}

export type CatalogPriceBounds = {
  min: number
  max: number
}

/** Collect min/max from product prices (`priceRub > 0`). */
export function collectCatalogPriceBounds(
  prices: Array<number | string | null | undefined>,
): CatalogPriceBounds | null {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const value of prices) {
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) continue
    const int = Math.round(n)
    if (int < min) min = int
    if (int > max) max = int
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return { min, max }
}

export function clampCatalogPriceRange(
  priceMin: number,
  priceMax: number,
  bounds: CatalogPriceBounds,
): { priceMin: number; priceMax: number } {
  let nextMin = Math.round(Number(priceMin))
  let nextMax = Math.round(Number(priceMax))
  if (!Number.isFinite(nextMin)) nextMin = bounds.min
  if (!Number.isFinite(nextMax)) nextMax = bounds.max
  nextMin = Math.min(Math.max(nextMin, bounds.min), bounds.max)
  nextMax = Math.min(Math.max(nextMax, bounds.min), bounds.max)
  if (nextMin > nextMax) {
    const mid = nextMin
    nextMin = nextMax
    nextMax = mid
  }
  return { priceMin: nextMin, priceMax: nextMax }
}

export function isCatalogPriceFilterActive(
  priceMin: number | null | undefined,
  priceMax: number | null | undefined,
  bounds: CatalogPriceBounds | null | undefined,
): boolean {
  if (!bounds) return false
  if (priceMin == null || priceMax == null) return false
  return priceMin > bounds.min || priceMax < bounds.max
}

/** When filter is inactive, all products pass. When active, require priced products in range. */
export function matchCatalogPrice(
  priceRub: number | null | undefined,
  priceMin: number | null | undefined,
  priceMax: number | null | undefined,
  bounds: CatalogPriceBounds | null | undefined,
): boolean {
  if (!isCatalogPriceFilterActive(priceMin, priceMax, bounds)) return true
  const n = Number(priceRub)
  if (!Number.isFinite(n) || n <= 0) return false
  return n >= Number(priceMin) && n <= Number(priceMax)
}
