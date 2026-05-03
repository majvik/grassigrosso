import type { CatalogFilterGroups } from './catalog-api'
import { normalizeCatalogFilterOptions } from './catalog-filter-options'
import type { NormalizedCatalogFilterOption } from './catalog-filter-options'
import {
  type CatalogAvailableFilterSets,
  type CatalogFilterState,
  CANONICAL_CATALOG_FIRMNESS_SLUGS,
  CANONICAL_LOAD_RANGE_SLUGS,
} from './catalog-filtering'
import {
  STANDARD_MATTRESS_SIZES,
  STANDARD_MATTRESS_SIZE_SET,
  normalizeCatalogSizeValue,
} from './catalog-sizes'

/**
 * Меню размеров всегда = канон из кода (никогда не подмешиваем «лишнее» из Strapi и не опускаем slug,
 * которого ещё нет ни на одной карточке — иначе после syncFilterOptionsFromCards пункт скрывался бы).
 * Подписи подтягиваем из API, если slug совпал.
 */
function mergeSizeOptionsWithStandard(apiOptions: unknown): NormalizedCatalogFilterOption[] {
  const normalized = normalizeCatalogFilterOptions(apiOptions)
  const labelBySlug = new Map<string, string>()
  for (const row of normalized) {
    const slug = normalizeCatalogSizeValue(row.value) || String(row.value || '').trim()
    if (!slug || !STANDARD_MATTRESS_SIZE_SET.has(slug)) continue
    if (row.label) labelBySlug.set(slug, row.label)
  }
  return STANDARD_MATTRESS_SIZES.map((slug, i) => ({
    value: slug,
    label: labelBySlug.get(slug) ?? slug.replace('x', ' × '),
    sortOrder: i,
  }))
}

/** Канон жёсткости из кода; подписи из API при совпадении slug (как у размеров). */
const STANDARD_FIRMNESS_SET = new Set<string>(CANONICAL_CATALOG_FIRMNESS_SLUGS)
const DEFAULT_FIRMNESS_LABELS: Record<string, string> = {
  soft: 'Мягкий',
  medium: 'Средний',
  hard: 'Жесткий',
  dualFirmness: 'Разная жесткость сторон',
}

function mergeFirmnessOptionsWithStandard(apiOptions: unknown): NormalizedCatalogFilterOption[] {
  const normalized = normalizeCatalogFilterOptions(apiOptions)
  const labelBySlug = new Map<string, string>()
  for (const row of normalized) {
    const slug = String(row.value || '').trim()
    if (!slug || !STANDARD_FIRMNESS_SET.has(slug)) continue
    if (row.label) labelBySlug.set(slug, row.label)
  }
  return CANONICAL_CATALOG_FIRMNESS_SLUGS.map((slug, i) => ({
    value: slug,
    label: labelBySlug.get(slug) ?? DEFAULT_FIRMNESS_LABELS[slug] ?? slug,
    sortOrder: i,
  }))
}

function renderCatalogueFirmnessChips(root: Element, options: unknown): boolean {
  const normalized = mergeFirmnessOptionsWithStandard(options)
  if (!normalized.length) return false
  const group = root.querySelector('.catalogue-new-filter-group[data-filter-group="firmness"]')
  const list = group?.querySelector('.catalogue-new-filter-list')
  if (!list) return false
  list.replaceChildren(
    createCatalogueFilterButton(
      'catalogue-new-chip is-active',
      { 'data-filter-group': 'firmness', 'data-value': 'all' },
      'Любая',
    ),
    ...normalized.map((option) => createCatalogueFilterButton(
      'catalogue-new-chip',
      { 'data-filter-group': 'firmness', 'data-value': option.value },
      option.label,
    )),
  )
  return true
}

const LOAD_RANGE_SLUG_SET = new Set<string>(CANONICAL_LOAD_RANGE_SLUGS)
const DEFAULT_LOAD_RANGE_LABELS: Record<string, string> = {
  upTo120: 'до 120кг',
  upTo160: 'до 160кг',
  upTo180: 'до 180кг',
  over160: 'Без ограничений',
}

function mergeLoadRangeOptionsWithStandard(apiOptions: unknown): NormalizedCatalogFilterOption[] {
  const normalized = normalizeCatalogFilterOptions(apiOptions)
  const labelBySlug = new Map<string, string>()
  for (const row of normalized) {
    const slug = String(row.value || '').trim()
    if (!slug || !LOAD_RANGE_SLUG_SET.has(slug)) continue
    if (row.label) labelBySlug.set(slug, row.label)
  }
  return CANONICAL_LOAD_RANGE_SLUGS.map((slug, i) => ({
    value: slug,
    label: labelBySlug.get(slug) ?? DEFAULT_LOAD_RANGE_LABELS[slug] ?? slug,
    sortOrder: i,
  }))
}

function renderCatalogueLoadRangeOptions(root: Element, options: unknown): boolean {
  const normalized = mergeLoadRangeOptionsWithStandard(options)
  if (!normalized.length) return false
  const host = root.querySelector('.catalogue-new-size-select[data-catalog-select="loadRange"]')
  const menu = host?.querySelector('.catalogue-new-size-select-menu')
  if (!menu) return false
  const allRow = document.createElement('li')
  allRow.className = 'catalogue-new-size-select-all-row'
  const allRowInner = document.createElement('div')
  allRowInner.className = 'catalogue-new-size-select-all-row-inner'
  allRowInner.appendChild(createCatalogueFilterButton(
    'catalogue-new-size-select-option is-active',
    { 'data-value': 'all' },
    'Любая',
  ))
  const menuResetMark = document.createElement('button')
  menuResetMark.type = 'button'
  menuResetMark.className = 'catalogue-new-size-reset-mark'
  menuResetMark.dataset.action = 'load-range-reset'
  menuResetMark.textContent = 'Сбросить'
  allRowInner.appendChild(menuResetMark)
  allRow.appendChild(allRowInner)
  const rows: Element[] = [allRow]
  normalized.forEach((option) => {
    const row = document.createElement('li')
    row.appendChild(createCatalogueFilterButton(
      'catalogue-new-size-select-option',
      { 'data-value': option.value },
      option.label,
    ))
    rows.push(row)
  })
  menu.replaceChildren(...rows)
  return true
}

type ResolveSizeMenu = (sizeSelectEl: Element | null) => Element | null

function createCatalogueFilterButton(className: string, attrs: Record<string, string>, label: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  Object.entries(attrs).forEach(([name, value]) => {
    button.setAttribute(name, String(value))
  })
  button.textContent = label
  return button
}

function renderCatalogueChipOptions(root: Element, groupName: string, options: unknown, allLabel: string): boolean {
  const normalized = normalizeCatalogFilterOptions(options)
  if (!normalized.length) return false
  const group = root.querySelector(`.catalogue-new-filter-group[data-filter-group="${groupName}"]`)
  const list = group?.querySelector('.catalogue-new-filter-list')
  if (!list) return false
  list.replaceChildren(
    createCatalogueFilterButton(
      'catalogue-new-chip is-active',
      { 'data-filter-group': groupName, 'data-value': 'all' },
      allLabel,
    ),
    ...normalized.map((option) => createCatalogueFilterButton(
      'catalogue-new-chip',
      { 'data-filter-group': groupName, 'data-value': option.value },
      option.label,
    )),
  )
  return true
}

function renderCatalogueSizeOptions(root: Element, options: unknown): boolean {
  const normalized = mergeSizeOptionsWithStandard(options)
  if (!normalized.length) return false
  const sizeSelect = root.querySelector('.catalogue-new-size-select[data-catalog-select="size"]')
  const menu = sizeSelect?.querySelector('.catalogue-new-size-select-menu')
  if (!menu) return false
  const searchRow = menu.querySelector('.catalogue-new-size-select-search-row')
  const allRow = document.createElement('li')
  allRow.className = 'catalogue-new-size-select-all-row'
  const allRowInner = document.createElement('div')
  allRowInner.className = 'catalogue-new-size-select-all-row-inner'
  allRowInner.appendChild(createCatalogueFilterButton(
    'catalogue-new-size-select-option is-active',
    { 'data-value': 'all' },
    'Любой',
  ))
  const menuResetMark = document.createElement('button')
  menuResetMark.type = 'button'
  menuResetMark.className = 'catalogue-new-size-reset-mark'
  menuResetMark.dataset.action = 'size-reset'
  menuResetMark.textContent = 'Сбросить'
  allRowInner.appendChild(menuResetMark)
  allRow.appendChild(allRowInner)
  const rows: Element[] = []
  if (searchRow) rows.push(searchRow)
  rows.push(allRow)
  normalized.forEach((option) => {
    const row = document.createElement('li')
    row.appendChild(createCatalogueFilterButton(
      'catalogue-new-size-select-option',
      { 'data-value': normalizeCatalogSizeValue(option.value) || option.value },
      option.label,
    ))
    rows.push(row)
  })
  menu.replaceChildren(...rows)
  return true
}

export function renderCatalogueFilterGroups(root: Element, groups: CatalogFilterGroups): boolean {
  if (!groups || typeof groups !== 'object') return false
  return [
    renderCatalogueChipOptions(root, 'collection', groups.collection, 'Все коллекции'),
    renderCatalogueSizeOptions(root, groups.size),
    renderCatalogueFirmnessChips(root, groups.firmness),
    renderCatalogueChipOptions(root, 'type', groups.type, 'Любая'),
    renderCatalogueLoadRangeOptions(root, groups.loadRange),
    renderCatalogueChipOptions(root, 'heightRange', groups.heightRange, 'Любая'),
    renderCatalogueChipOptions(root, 'fillings', groups.fillings, 'Любая'),
    renderCatalogueChipOptions(root, 'features', groups.features, 'Любые'),
  ].some(Boolean)
}

export function setSingleChipSelection(root: Element, groupName: string, value: string): void {
  const group = root.querySelector(`.catalogue-new-filter-group[data-filter-group="${groupName}"]`)
  if (!group) return
  group.querySelectorAll<HTMLElement>(`.catalogue-new-chip[data-filter-group="${groupName}"]`).forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.value === value)
  })
}

export function setFilterGroupDisabled(root: Element, groupName: string, disabled: boolean): void {
  const group = root.querySelector(`.catalogue-new-filter-group[data-filter-group="${groupName}"]`)
  if (!group) return
  group.classList.toggle('is-disabled', disabled)
}

export function syncCatalogFilterDependencies(root: Element, state: CatalogFilterState): void {
  const topperOnly = state.type.size === 1 && state.type.has('topper')
  if (topperOnly) state.loadRange.clear()
  setFilterGroupDisabled(root, 'loadRange', topperOnly)
}

export function syncCatalogueFilterUi(root: Element, state: CatalogFilterState, resolveSizeSelectMenu: ResolveSizeMenu): void {
  setSingleChipSelection(root, 'collection', state.collection)
  const setMultiChipSelection = (groupName: string, targetSet: Set<string>) => {
    root.querySelectorAll<HTMLElement>(`.catalogue-new-chip[data-filter-group="${groupName}"]`).forEach((chip) => {
      const chipValue = String(chip.dataset.value || '')
      const isAll = chipValue === 'all'
      chip.classList.toggle('is-active', isAll ? targetSet.size === 0 : targetSet.has(chipValue))
    })
  }
  setMultiChipSelection('firmness', state.firmness)
  setMultiChipSelection('type', state.type)
  setMultiChipSelection('heightRange', state.heightRange)
  setMultiChipSelection('fillings', state.fillings)
  setMultiChipSelection('features', state.features)

  const sizeSelect = root.querySelector('.catalogue-new-size-select[data-catalog-select="size"]')
  const menu = resolveSizeSelectMenu(sizeSelect)
  const trigger = sizeSelect?.querySelector<HTMLElement>('.catalogue-new-size-select-trigger')
  const options = menu ? [...menu.querySelectorAll<HTMLElement>('.catalogue-new-size-select-option')] : []
  options.forEach((option) => {
    const value = String(option.dataset.value || '')
    const isAll = value === 'all'
    option.classList.toggle('is-active', isAll ? state.size.size === 0 : state.size.has(value))
  })
  if (trigger) {
    if (!state.size.size) {
      trigger.textContent = 'Любой'
    } else {
      const labels = options
        .filter((option) => {
          const value = String(option.dataset.value || '')
          return value !== 'all' && state.size.has(value)
        })
        .map((option) => option.textContent?.trim() || '')
        .filter(Boolean)
      if (labels.length === 1) {
        trigger.textContent = labels[0]
      } else if (labels.length > 1) {
        trigger.textContent = `${labels[0]} +${labels.length - 1}`
      } else {
        trigger.textContent = 'Любой'
      }
    }
  }
  const sizeField = sizeSelect?.closest('.catalogue-new-filter-field')
  const sizeUnder = sizeField?.querySelector<HTMLElement>('.catalogue-new-size-select-under')
  if (sizeUnder) {
    const showUnder = state.size.size > 0
    sizeUnder.hidden = !showUnder
    sizeUnder.setAttribute('aria-hidden', showUnder ? 'false' : 'true')
  }

  const loadSelect = root.querySelector('.catalogue-new-size-select[data-catalog-select="loadRange"]')
  const loadMenu = resolveSizeSelectMenu(loadSelect)
  const loadTrigger = loadSelect?.querySelector<HTMLElement>('.catalogue-new-size-select-trigger')
  const loadOptions = loadMenu ? [...loadMenu.querySelectorAll<HTMLElement>('.catalogue-new-size-select-option')] : []
  loadOptions.forEach((option) => {
    const value = String(option.dataset.value || '')
    const isAll = value === 'all'
    option.classList.toggle('is-active', isAll ? state.loadRange.size === 0 : state.loadRange.has(value))
    if (isAll) option.textContent = 'Любая'
  })
  if (loadTrigger) {
    if (!state.loadRange.size) {
      loadTrigger.textContent = 'Любая'
    } else {
      const selected = [...state.loadRange][0]
      const opt = loadOptions.find((o) => String(o.dataset.value || '') === selected)
      loadTrigger.textContent = opt?.textContent?.trim() || 'Любая'
    }
  }
  const loadField = loadSelect?.closest('.catalogue-new-filter-field')
  const loadUnder = loadField?.querySelector<HTMLElement>('.catalogue-new-size-select-under')
  if (loadUnder) {
    const showLoadUnder = state.loadRange.size > 0
    loadUnder.hidden = !showLoadUnder
    loadUnder.setAttribute('aria-hidden', showLoadUnder ? 'false' : 'true')
  }
  syncCatalogFilterDependencies(root, state)
}

export function applyAvailableFilterOptions(
  root: Element,
  state: CatalogFilterState,
  available: CatalogAvailableFilterSets,
): void {
  const toggleBySet = (selector: string, allowedSet: Set<string>) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const value = String(el.dataset.value || '')
      const visible = value === 'all' || allowedSet.has(value)
      el.dataset.available = visible ? '1' : '0'
      const filteredOut = el.dataset.autocompleteHidden === '1'
      const shouldHide = !visible || filteredOut
      el.hidden = shouldHide
      const optionRow = el.closest<HTMLElement>('li')
      // Строка «Любой»/«Любая» + «Сбросить» в одном li — не скрываем весь li (иначе пропадает пометка Сбросить, как у размера).
      if (optionRow && !optionRow.classList.contains('catalogue-new-size-select-all-row')) {
        optionRow.hidden = shouldHide
      }
    })
  }

  toggleBySet('.catalogue-new-chip[data-filter-group="collection"]', available.collection)
  toggleBySet('.catalogue-new-chip[data-filter-group="firmness"]', available.firmness)
  toggleBySet('.catalogue-new-chip[data-filter-group="type"]', available.type)
  toggleBySet('.catalogue-new-chip[data-filter-group="heightRange"]', available.heightRange)
  toggleBySet('.catalogue-new-chip[data-filter-group="fillings"]', available.fillings)
  toggleBySet('.catalogue-new-chip[data-filter-group="features"]', available.features)
  toggleBySet('.catalogue-new-size-select[data-catalog-select="size"] .catalogue-new-size-select-option', available.size)
  toggleBySet('.catalogue-new-size-select[data-catalog-select="loadRange"] .catalogue-new-size-select-option', available.loadRange)

  if (state.collection !== 'all' && !available.collection.has(state.collection)) state.collection = 'all'
  state.loadRange.forEach((value) => { if (!available.loadRange.has(value)) state.loadRange.delete(value) })
  state.heightRange.forEach((value) => { if (!available.heightRange.has(value)) state.heightRange.delete(value) })
  state.firmness.forEach((value) => { if (!available.firmness.has(value)) state.firmness.delete(value) })
  state.type.forEach((value) => { if (!available.type.has(value)) state.type.delete(value) })
  state.size.forEach((value) => { if (!available.size.has(value)) state.size.delete(value) })
  state.fillings.forEach((value) => { if (!available.fillings.has(value)) state.fillings.delete(value) })
  state.features.forEach((value) => { if (!available.features.has(value)) state.features.delete(value) })
}
