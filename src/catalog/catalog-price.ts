/** Format product price for catalog cards: `100.000 руб`. */
export function formatCatalogPriceRub(priceRub: unknown): string {
  const n = Number(priceRub)
  if (!Number.isFinite(n) || n <= 0) return ''
  const int = Math.round(n)
  return `${String(int).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} руб`
}
