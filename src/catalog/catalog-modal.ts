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
    orthoFoam: 'Высокоэластичная пена',
    memoryEffect: 'С эффектом памяти',
    latex: 'Латекс',
    coir: 'Кокосовая койра',
    nanoFoam: 'Пена повышенной плотности',
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

export function buildCatalogModalSpecs(dataset: CatalogCardDataset): CatalogModalSpec[] {
  const sizes = readSizes(dataset)
  const layersCatalog = String(dataset.layersCatalog || '').trim()
  const coverDescription = String(dataset.coverDescription || '').trim()
  const fillings = layersCatalog
    ? layersCatalog
    : parseCsv(dataset.fillings).map((value) => mapValue(value, modalLabelMaps.fillings)).join(', ')
  const features = parseCsv(dataset.features).map((value) => mapValue(value, modalLabelMaps.features)).join(', ')
  const height = dataset.height ? `${dataset.height} см` : ''
  const heightRange = mapValue(dataset.heightRange, modalLabelMaps.heightRange)
  const heightLabel = height && heightRange ? `${height} (${heightRange})` : height || heightRange
  const loadLabel = mapValue(dataset.loadRange, modalLabelMaps.loadRange)

  const specs: CatalogModalSpec[] = [
    { label: 'Жесткость', value: mapValue(dataset.firmness, modalLabelMaps.firmness) },
    { label: 'Тип матраса', value: mapValue(dataset.type, modalLabelMaps.type) },
    { label: 'Высота', value: heightLabel },
    { label: 'Нагрузка', value: loadLabel },
    { label: 'Размер', value: sizes.length ? formatCatalogSizeList(sizes) : '' },
  ]

  if (coverDescription) {
    specs.push({ label: 'Чехол', value: coverDescription })
  }

  specs.push(
    { label: layersCatalog ? 'Наполнение' : 'Наполнители', value: fillings },
    { label: 'Особенности', value: features },
  )

  return specs.filter((spec) => spec.value)
}

function escapeHtmlLite(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
  const lines = orderedSpecs.map(
    (spec) =>
      `<span class="catalogue-new-meta-line">${escapeHtmlLite(spec.label)}: <span class="catalogue-new-meta-value">${escapeHtmlLite(spec.value)}</span></span>`,
  )
  if (!lines.length) return ''
  return `<p class="catalogue-new-meta">${lines.join('')}</p>`
}
