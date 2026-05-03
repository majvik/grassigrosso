import { STANDARD_MATTRESS_SIZES } from './catalog-sizes'

export type CatalogSortValue =
  | 'default'
  | 'height-asc'
  | 'height-desc'
  | 'load-desc'
  | 'firmness-asc'
  | 'firmness-desc'

export type CatalogFilterState = {
  collection: string
  firmness: Set<string>
  type: Set<string>
  size: Set<string>
  loadRange: Set<string>
  heightRange: Set<string>
  fillings: Set<string>
  features: Set<string>
  sort: CatalogSortValue | string
  favouritesOnly: boolean
}

export type CatalogCardMeta<TCard = unknown> = {
  card: TCard
  initialOrder: number
  slug: string
  collection: string
  firmness: string
  type: string
  height: number
  load: number
  loadRange: string
  heightRange: string
  sizes: Set<string>
  fillings: Set<string>
  features: Set<string>
}

export type CatalogAvailableFilterSets = {
  collection: Set<string>
  firmness: Set<string>
  type: Set<string>
  size: Set<string>
  loadRange: Set<string>
  heightRange: Set<string>
  fillings: Set<string>
  features: Set<string>
}

export const CATALOG_MULTI_FILTER_GROUPS = new Set([
  'firmness',
  'type',
  'loadRange',
  'heightRange',
  'fillings',
  'features',
])

const firmnessRank: Record<string, number> = {
  soft: 1,
  medium: 2,
  hard: 3,
  dualFirmness: 4,
}

/** Все пункты фильтра «Жёсткость» остаются в разметке (как канон размеров); отбор карточек по-прежнему по data-firmness. */
export const CANONICAL_CATALOG_FIRMNESS_SLUGS = ['soft', 'medium', 'hard', 'dualFirmness'] as const

const knownTypeOptions = ['spring', 'nospring', 'topper', 'doubleSided', 'singleSided']
const knownLoadRangeOptions = ['upTo120', 'upTo160', 'over160']
const knownHeightRangeOptions = ['low', 'mid', 'high']
const knownFillingOptions = ['coir', 'latex', 'orthoFoam', 'memoryEffect', 'nanoFoam', 'forplit']
const knownFeatureOptions = ['removableCover', 'winterSummer', 'edgeSupport']

function intersectsSet(sourceSet: Set<string>, selectedSet: Set<string>): boolean {
  if (!selectedSet.size) return true
  for (const value of selectedSet) {
    if (sourceSet.has(value)) return true
  }
  return false
}

function containsAll(sourceSet: Set<string>, selectedSet: Set<string>): boolean {
  if (!selectedSet.size) return true
  for (const value of selectedSet) {
    if (!sourceSet.has(value)) return false
  }
  return true
}

export function matchLoadRange(load: number, range: string): boolean {
  if (range === 'all') return true
  if (range === 'upTo120') return load <= 120
  if (range === 'upTo160') return load <= 160
  if (range === 'over160') return load > 160
  return true
}

export function matchHeightRange(height: number, range: string): boolean {
  if (range === 'all') return true
  if (range === 'low') return height <= 16
  if (range === 'mid') return height >= 16 && height <= 20
  if (range === 'high') return height > 20
  return true
}

export function getLoadRangeBucket(load: number): string {
  if (load <= 120) return 'upTo120'
  if (load <= 160) return 'upTo160'
  return 'over160'
}

export function getHeightRangeBucket(height: number): string {
  if (height <= 16) return 'low'
  if (height <= 20) return 'mid'
  return 'high'
}

export function compareCatalogCardMeta<TCard>(
  metaA: CatalogCardMeta<TCard> | undefined,
  metaB: CatalogCardMeta<TCard> | undefined,
  sort: string,
): number {
  if (sort === 'height-asc') {
    return Number(metaA?.height || 0) - Number(metaB?.height || 0)
  }
  if (sort === 'height-desc') {
    return Number(metaB?.height || 0) - Number(metaA?.height || 0)
  }
  if (sort === 'load-desc') {
    return Number(metaB?.load || 0) - Number(metaA?.load || 0)
  }
  if (sort === 'firmness-asc') {
    return (firmnessRank[metaA?.firmness || ''] || 0) - (firmnessRank[metaB?.firmness || ''] || 0)
  }
  if (sort === 'firmness-desc') {
    return (firmnessRank[metaB?.firmness || ''] || 0) - (firmnessRank[metaA?.firmness || ''] || 0)
  }
  return Number(metaA?.initialOrder || 0) - Number(metaB?.initialOrder || 0)
}

export function matchesCatalogCardMeta<TCard>(
  meta: CatalogCardMeta<TCard>,
  state: CatalogFilterState,
  favouriteSlugs: Set<string>,
): boolean {
  const matchCollection = state.collection === 'all' || meta.collection === state.collection
  const matchFirmness = !state.firmness.size || state.firmness.has(meta.firmness)
  const matchType = !state.type.size || state.type.has(meta.type)
  const matchSize = intersectsSet(meta.sizes, state.size)
  const matchLoad = meta.loadRange
    ? !state.loadRange.size || state.loadRange.has(meta.loadRange)
    : !state.loadRange.size || [...state.loadRange].some((range) => matchLoadRange(meta.load, range))
  const matchHeight = meta.heightRange
    ? !state.heightRange.size || state.heightRange.has(meta.heightRange)
    : !state.heightRange.size || [...state.heightRange].some((range) => matchHeightRange(meta.height, range))
  const matchFillings = containsAll(meta.fillings, state.fillings)
  const matchFeatures = containsAll(meta.features, state.features)
  const matchFavourites = !state.favouritesOnly || (meta.slug && favouriteSlugs.has(meta.slug))

  return Boolean(
    matchCollection &&
      matchFirmness &&
      matchType &&
      matchSize &&
      matchLoad &&
      matchHeight &&
      matchFillings &&
      matchFeatures &&
      matchFavourites,
  )
}

export function collectAvailableCatalogFilters<TCard>(cardMeta: CatalogCardMeta<TCard>[]): CatalogAvailableFilterSets {
  const available: CatalogAvailableFilterSets = {
    collection: new Set(),
    firmness: new Set(),
    type: new Set(),
    size: new Set(),
    loadRange: new Set(),
    heightRange: new Set(),
    fillings: new Set(),
    features: new Set(),
  }

  cardMeta.forEach((meta) => {
    if (meta.collection) available.collection.add(meta.collection)
    if (meta.firmness) available.firmness.add(meta.firmness)
    if (meta.type) available.type.add(meta.type)
    meta.sizes.forEach((value) => available.size.add(value))
    meta.fillings.forEach((value) => available.fillings.add(value))
    meta.features.forEach((value) => available.features.add(value))
    if (meta.loadRange) available.loadRange.add(meta.loadRange)
    else if (Number.isFinite(meta.load) && meta.load > 0) available.loadRange.add(getLoadRangeBucket(meta.load))
    if (meta.heightRange) available.heightRange.add(meta.heightRange)
    else if (Number.isFinite(meta.height) && meta.height > 0) available.heightRange.add(getHeightRangeBucket(meta.height))
  })

  knownTypeOptions.forEach((value) => available.type.add(value))
  knownLoadRangeOptions.forEach((value) => available.loadRange.add(value))
  knownHeightRangeOptions.forEach((value) => available.heightRange.add(value))
  knownFillingOptions.forEach((value) => available.fillings.add(value))
  knownFeatureOptions.forEach((value) => available.features.add(value))

  // Размеры: как у type/loadRange — все канонические пункты фильтра остаются кликабельными;
  // отбор товаров по-прежнему по data-sizes на карточках (см. matchesCatalogCardMeta).
  STANDARD_MATTRESS_SIZES.forEach((value) => available.size.add(value))

  CANONICAL_CATALOG_FIRMNESS_SLUGS.forEach((value) => available.firmness.add(value))

  return available
}

export function resetCatalogFilterState(state: CatalogFilterState): void {
  state.collection = 'all'
  state.firmness.clear()
  state.type.clear()
  state.size.clear()
  state.loadRange.clear()
  state.heightRange.clear()
  state.fillings.clear()
  state.features.clear()
  state.sort = 'default'
}

export function setCatalogSort(state: CatalogFilterState, value: unknown): string {
  state.sort = String(value || 'default')
  return state.sort
}

export function toggleCatalogFavouritesOnly(state: CatalogFilterState): boolean {
  state.favouritesOnly = !state.favouritesOnly
  return state.favouritesOnly
}

export function applyCatalogChipFilter(state: CatalogFilterState, groupName: string, value: string): boolean {
  if (CATALOG_MULTI_FILTER_GROUPS.has(groupName)) {
    const targetSet =
      groupName === 'firmness' ? state.firmness :
      groupName === 'type' ? state.type :
      groupName === 'loadRange' ? state.loadRange :
      groupName === 'heightRange' ? state.heightRange :
      groupName === 'fillings' ? state.fillings :
      state.features

    if (value === 'all') {
      targetSet.clear()
    } else if (targetSet.has(value)) {
      targetSet.delete(value)
    } else {
      targetSet.add(value)
    }
    return true
  }

  if (groupName === 'collection') {
    state.collection = value
    return true
  }

  return false
}

export function applyCatalogSizeFilter(state: CatalogFilterState, value: string): boolean {
  if (value === 'all') {
    state.size.clear()
    return true
  }

  if (state.size.has(value)) {
    state.size.delete(value)
  } else {
    state.size.add(value)
  }
  return false
}
