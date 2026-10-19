import {
  STANDARD_MATTRESS_SIZES,
  buildStandardMattressSizesFromLegacy,
  formatCatalogSizeList,
} from './catalog-sizes'

export type CatalogCardDataset = {
  firmness?: string
  type?: string
  height?: string
  load?: string
  loadRange?: string
  heightRange?: string
  sizes?: string
  widths?: string
  lengths?: string
  fillings?: string
  features?: string
  coverDescription?: string
  layersCatalog?: string
}

export type CatalogModalSpec = {
  label: string
  value: string
}

export type CatalogModalSpecGroups = {
  main: CatalogModalSpec[]
  details: CatalogModalSpec[]
}

const modalLabelMaps = {
  firmness: {
    soft: 'Мягкий',
    medium: 'Средний',
    hard: 'Жесткий',
    dualFirmness: 'Разная жесткость сторон',
  },
  type: {
    spring: 'Пружинный',
    nospring: 'Беспружинный',
    topper: 'Топер',
    doubleSided: 'Двухсторонние',
    singleSided: 'Односторонние',
  },
  loadRange: {
    upTo120: 'до 120 кг',
    upTo160: 'до 160 кг',
    upTo180: 'до 180 кг',
    over160: 'Без ограничений',
  },
  heightRange: {
    low: 'Компактные до 16 см',
    mid: 'Средние 16-22 см',
    high: 'Высокие от 23 см',
  },
  fillings: {
    orthoFoam: 'Орто-пена',
    memoryEffect: 'С эффектом памяти',
    latex: 'Латекс',
    coir: 'Кокосовая койра',
    nanoFoam: 'Нано-пена',
    forplit: 'Форплит',
  },
  features: {
    removableCover: 'Съемный чехол',
    winterSummer: 'Эффект зима-лето',
    edgeSupport: 'Усиленный периметр',
    dualFirmness: 'Разная жесткость сторон',
  },
} as const

function parseCsv(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function mapValue(value: unknown, map: Record<string, string>): string {
  const key = String(value || '').trim()
  if (!key) return ''
  return map[key] || key
}

function readSizes(dataset: CatalogCardDataset): string[] {
  const parsed = parseCsv(dataset.sizes)
  if (parsed.length) return parsed

  const legacy = [...buildStandardMattressSizesFromLegacy(dataset.widths, dataset.lengths)]
  return legacy.length ? legacy : [...STANDARD_MATTRESS_SIZES]
}

export function buildCatalogModalSpecGroups(dataset: CatalogCardDataset): CatalogModalSpecGroups {
  const sizes = readSizes(dataset)
  const layersCatalog = String(dataset.layersCatalog || '').trim()
  const coverDescription = String(dataset.coverDescription || '').trim()
  const fillings = layersCatalog
    ? layersCatalog
    : parseCsv(dataset.fillings).map((value) => mapValue(value, modalLabelMaps.fillings)).join(', ')
  const loadLabel = mapValue(dataset.loadRange, modalLabelMaps.loadRange)

  const main: CatalogModalSpec[] = [
    { label: 'Жесткость', value: mapValue(dataset.firmness, modalLabelMaps.firmness) },
    { label: 'Тип матраса', value: mapValue(dataset.type, modalLabelMaps.type) },
    { label: 'Нагрузка', value: loadLabel },
    { label: 'Размер', value: sizes.length ? formatCatalogSizeList(sizes) : '' },
  ].filter((spec) => spec.value)

  if (coverDescription) {
    main.push({ label: 'Чехол', value: coverDescription })
  }

  const details: CatalogModalSpec[] = []
  if (fillings) {
    details.push({ label: 'Наполнение', value: fillings })
  }

  return { main, details }
}

export function buildCatalogModalSpecs(dataset: CatalogCardDataset): CatalogModalSpec[] {
  const layersCatalog = String(dataset.layersCatalog || '').trim()
  const features = parseCsv(dataset.features).map((value) => mapValue(value, modalLabelMaps.features)).join(', ')
  const height = dataset.height ? `${dataset.height} см` : ''
  const heightRange = mapValue(dataset.heightRange, modalLabelMaps.heightRange)
  const heightLabel = height && heightRange ? `${height} (${heightRange})` : height || heightRange
  const groups = buildCatalogModalSpecGroups(dataset)

  const specs: CatalogModalSpec[] = [
    ...groups.main,
    { label: 'Высота', value: heightLabel },
    ...groups.details,
    { label: 'Особенности', value: features },
  ]

  return specs.filter((spec) => spec.value)
}

function escapeHtmlLite(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Split layers catalog text like `1. a 2. b` into list items (numbers stripped). */
export function parseCatalogLayerItems(value: unknown): string[] {
  const stripLeadingIndex = (part: string) => part.replace(/^\d+\.\s*/, '').trim()
  const raw = String(value ?? '').trim()
  if (!raw) return []
  const numbered = raw
    .split(/(?=\d+\.\s)/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (numbered.length > 1) {
    return numbered.map(stripLeadingIndex).filter(Boolean)
  }
  const byLine = raw
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (byLine.length > 1) {
    return byLine.map(stripLeadingIndex).filter(Boolean)
  }
  // Single item: drop a leading "1. " so we never show a lone index.
  return [stripLeadingIndex(raw)].filter(Boolean)
}

function buildCatalogMetaValueHtml(label: string, value: string): string {
  if (label === 'Наполнение') {
    const items = parseCatalogLayerItems(value)
    // Multiple layers → numbered list; a single layer stays plain text (no "1.").
    if (items.length > 1) {
      return (
        `<ol class="catalogue-new-meta-layers">` +
        items.map((item) => `<li>${escapeHtmlLite(item)}</li>`).join('') +
        `</ol>`
      )
    }
    if (items.length === 1) {
      return `<span class="catalogue-new-meta-value">${escapeHtmlLite(items[0])}</span>`
    }
  }
  return `<span class="catalogue-new-meta-value">${escapeHtmlLite(value)}</span>`
}

export function buildCatalogCardMetaHtmlFromDataset(dataset: CatalogCardDataset): string {
  const specs = buildCatalogModalSpecs(dataset)
  const byLabel = new Map(specs.map((spec) => [spec.label, spec.value]))
  const orderedSpecs = [
    { label: 'Высота', value: byLabel.get('Высота') || '' },
    { label: 'Нагрузка', value: byLabel.get('Нагрузка') || '' },
    { label: 'Жесткость', value: byLabel.get('Жесткость') || '' },
    { label: 'Тип матраса', value: byLabel.get('Тип матраса') || '' },
    { label: 'Размер', value: byLabel.get('Размер') || '' },
    { label: 'Чехол', value: byLabel.get('Чехол') || '' },
    { label: 'Наполнение', value: byLabel.get('Наполнение') || byLabel.get('Наполнители') || '' },
    { label: 'Особенности', value: byLabel.get('Особенности') || '' },
  ].filter((spec) => spec.value)
  const lines = orderedSpecs.map((spec) => {
    const isLayers = spec.label === 'Наполнение'
    return (
      `<span class="catalogue-new-meta-line${isLayers ? ' catalogue-new-meta-line--layers' : ''}">` +
      `<span class="catalogue-new-meta-label">${escapeHtmlLite(spec.label)}:</span> ` +
      `${buildCatalogMetaValueHtml(spec.label, spec.value)}` +
      `</span>`
    )
  })
  if (!lines.length) return ''
  return `<div class="catalogue-new-meta">${lines.join('')}</div>`
}
