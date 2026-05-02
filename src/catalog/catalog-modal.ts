import {
  STANDARD_MATTRESS_SIZES,
  buildStandardMattressSizesFromLegacy,
  formatCatalogSizeList,
} from './catalog-sizes'

type CatalogCardDataset = {
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
    upTo120: 'до 120кг',
    upTo160: 'до 160кг',
    over160: 'без ограничений (свыше 160кг)',
  },
  heightRange: {
    low: 'Компактные до 16 см',
    mid: 'Средние 16-20 см',
    high: 'Высокие свыше 20 см',
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
  const fillings = parseCsv(dataset.fillings).map((value) => mapValue(value, modalLabelMaps.fillings)).join(', ')
  const features = parseCsv(dataset.features).map((value) => mapValue(value, modalLabelMaps.features)).join(', ')

  return [
    { label: 'Жесткость', value: mapValue(dataset.firmness, modalLabelMaps.firmness) },
    { label: 'Тип матраса', value: mapValue(dataset.type, modalLabelMaps.type) },
    { label: 'Высота', value: dataset.height ? `${dataset.height} см` : '' },
    { label: 'Нагрузка', value: dataset.load ? `До ${dataset.load} кг` : '' },
    { label: 'Макс. нагрузка на спальное место', value: mapValue(dataset.loadRange, modalLabelMaps.loadRange) },
    { label: 'Высота матраса', value: mapValue(dataset.heightRange, modalLabelMaps.heightRange) },
    { label: 'Размер', value: sizes.length ? formatCatalogSizeList(sizes) : '' },
    { label: 'Наполнители', value: fillings },
    { label: 'Особенности', value: features },
  ].filter((spec) => spec.value)
}
