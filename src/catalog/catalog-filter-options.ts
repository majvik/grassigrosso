export type CatalogFilterOption = {
  slug?: string | null
  name?: string | null
  sortOrder?: number | string | null
}

export type NormalizedCatalogFilterOption = {
  value: string
  label: string
  sortOrder: number
}

export function normalizeCatalogFilterOptions(value: unknown): NormalizedCatalogFilterOption[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()

  return value
    .map((item: CatalogFilterOption) => ({
      value: String(item?.slug || '').trim(),
      label: String(item?.name || '').trim(),
      sortOrder: Number(item?.sortOrder || 0),
    }))
    .filter((item) => {
      if (!item.value || !item.label || seen.has(item.value)) return false
      seen.add(item.value)
      return true
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'ru'))
}
