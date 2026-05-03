/**
 * Канон размеров матрасов для каталога (slug = ширина + «x» + длина в см).
 * После 160×190 добавлен 180×190; удалены: 200×200, 140×220, 160×220, 180×220, 200×220, 220×220.
 */
export const STANDARD_MATTRESS_SIZES = [
  '80x190',
  '80x200',
  '90x190',
  '90x200',
  '120x190',
  '120x200',
  '140x190',
  '140x200',
  '160x190',
  '180x190',
  '160x200',
  '180x200',
] as const

export const STANDARD_MATTRESS_SIZE_SET = new Set<string>(STANDARD_MATTRESS_SIZES)

function parseDimensionList(raw: unknown): string[] {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/[^\d]/g, ''))
    .filter(Boolean)
}

export function normalizeCatalogSizeValue(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  const match = raw.replace(/\s+/g, '').replace(/[×х]/g, 'x').match(/(\d+)x(\d+)/)
  if (!match) return ''
  return `${match[1]}x${match[2]}`
}

export function buildStandardMattressSizesFromLegacy(widthsValue: unknown, lengthsValue: unknown): Set<string> {
  const widths = parseDimensionList(widthsValue)
  const lengths = parseDimensionList(lengthsValue)
  if (!widths.length || !lengths.length) return new Set()

  const combos: string[] = []
  widths.forEach((width) => {
    lengths.forEach((length) => {
      combos.push(normalizeCatalogSizeValue(`${width}x${length}`))
    })
  })

  return new Set(combos.filter((size) => STANDARD_MATTRESS_SIZE_SET.has(size)))
}

export function filterStandardMattressSizes(values: unknown[]): string[] {
  return values
    .map(normalizeCatalogSizeValue)
    .filter((size) => STANDARD_MATTRESS_SIZE_SET.has(size))
}

export function formatCatalogSizeList(values: unknown[]): string {
  return filterStandardMattressSizes(values)
    .map((value) => value.replace('x', ' × '))
    .join(', ')
}
