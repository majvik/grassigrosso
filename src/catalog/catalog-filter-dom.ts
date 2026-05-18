import type { CatalogFilterGroups } from './catalog-api'
import { normalizeCatalogFilterOptions } from './catalog-filter-options'
import type { NormalizedCatalogFilterOption } from './catalog-filter-options'
import {
  type CatalogAvailableFilterSets,
  type CatalogFilterState,
  FALLBACK_CATALOG_FIRMNESS_OPTIONS,
  FALLBACK_LOAD_RANGE_OPTIONS,
} from './catalog-filtering'
import {
  STANDARD_MATTRESS_SIZES,
  normalizeCatalogSizeValue,
} from './catalog-sizes'

/**
 * Strapi — источник истины для размеров. Кодовый список нужен только как fallback,
 * если feed справочников недоступен.
 */
function mergeSizeOptionsWithStandard(apiOptions: unknown): NormalizedCatalogFilterOption[] {
  const normalized = normalizeCatalogFilterOptions(apiOptions)
  const apiSizeOptions = normalized
    .map((row, i) => {
      const slug = normalizeCatalogSizeValue(row.value) || normalizeCatalogSizeValue(row.label)
      if (!slug) return null
      return {
        value: slug,
        label: row.label || slug.replace('x', ' × '),
        sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : i,
      }
    })
    .filter((row): row is NormalizedCatalogFilterOption => Boolean(row))
  if (apiSizeOptions.length) return apiSizeOptions

  return STANDARD_MATTRESS_SIZES.map((slug, i) => ({
    value: slug,
    label: slug.replace('x', ' × '),
    sortOrder: i,
  }))
}

function mergeFirmnessOptionsWithStandard(apiOptions: unknown): NormalizedCatalogFilterOption[] {
  const normalized = normalizeCatalogFilterOptions(apiOptions)
  if (normalized.length) return normalized
  return FALLBACK_CATALOG_FIRMNESS_OPTIONS.map((option, i) => ({ ...option, sortOrder: i }))
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

function mergeLoadRangeOptionsWithStandard(apiOptions: unknown): NormalizedCatalogFilterOption[] {
  const normalized = normalizeCatalogFilterOptions(apiOptions)
  if (normalized.length) return normalized
  return FALLBACK_LOAD_RANGE_OPTIONS.map((option, i) => ({ ...option, sortOrder: i }))
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

function selectedCountForFilterGroup(state: CatalogFilterState, groupKey: string): number {
  switch (groupKey) {
    case 'collection':
      return state.collection.size
    case 'size':
      return state.size.size
    case 'firmness':
      return state.firmness.size
    case 'type':
      return state.type.size
    case 'loadRange':
      return state.loadRange.size
    case 'heightRange':
      return state.heightRange.size
    case 'fillings':
      return state.fillings.size
    case 'features':
      return state.features.size
    default:
      return 0
  }
}

/** Бейдж числа активных значений в строке заголовка аккордиона (как у избранного). */
function syncCatalogFilterAccordionBadges(root: Element, state: CatalogFilterState): void {
  root.querySelectorAll<HTMLElement>('.catalogue-new-filter-group[data-filter-group]').forEach((group) => {
    const key = String(group.dataset.filterGroup || '')
    const badge = group.querySelector<HTMLElement>('.catalogue-new-filter-selection-count')
    if (!badge) return
    const n = selectedCountForFilterGroup(state, key)
    if (n <= 0) {
      badge.textContent = ''
      badge.hidden = true
      badge.setAttribute('aria-hidden', 'true')
      badge.removeAttribute('aria-label')
      return
    }
    badge.textContent = String(n)
    badge.hidden = false
    badge.setAttribute('aria-hidden', 'false')
    badge.setAttribute('aria-label', `Выбрано: ${n}`)
  })
}

export function syncCatalogueFilterUi(root: Element, state: CatalogFilterState, resolveSizeSelectMenu: ResolveSizeMenu): void {
  const setMultiChipSelection = (groupName: string, targetSet: Set<string>) => {
    root.querySelectorAll<HTMLElement>(`.catalogue-new-chip[data-filter-group="${groupName}"]`).forEach((chip) => {
      const chipValue = String(chip.dataset.value || '')
      const isAll = chipValue === 'all'
      chip.classList.toggle('is-active', isAll ? targetSet.size === 0 : targetSet.has(chipValue))
    })
  }
  setMultiChipSelection('collection', state.collection)
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
  syncCatalogFilterAccordionBadges(root, state)
}

export function applyAvailableFilterOptions(
  root: Element,
  state: CatalogFilterState,
  available: CatalogAvailableFilterSets,
): void {
  const preserveRenderedOptions = (selector: string, targetSet: Set<string>) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const value = String(el.dataset.value || '').trim()
      if (value && value !== 'all') targetSet.add(value)
    })
  }

  preserveRenderedOptions('.catalogue-new-chip[data-filter-group="collection"]', available.collection)
  preserveRenderedOptions('.catalogue-new-chip[data-filter-group="firmness"]', available.firmness)
  preserveRenderedOptions('.catalogue-new-chip[data-filter-group="type"]', available.type)
  preserveRenderedOptions('.catalogue-new-chip[data-filter-group="heightRange"]', available.heightRange)
  preserveRenderedOptions('.catalogue-new-chip[data-filter-group="fillings"]', available.fillings)
  preserveRenderedOptions('.catalogue-new-chip[data-filter-group="features"]', available.features)
  preserveRenderedOptions('.catalogue-new-size-select[data-catalog-select="size"] .catalogue-new-size-select-option', available.size)
  preserveRenderedOptions('.catalogue-new-size-select[data-catalog-select="loadRange"] .catalogue-new-size-select-option', available.loadRange)

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

  state.collection.forEach((value) => { if (!available.collection.has(value)) state.collection.delete(value) })
  state.loadRange.forEach((value) => { if (!available.loadRange.has(value)) state.loadRange.delete(value) })
  state.heightRange.forEach((value) => { if (!available.heightRange.has(value)) state.heightRange.delete(value) })
  state.firmness.forEach((value) => { if (!available.firmness.has(value)) state.firmness.delete(value) })
  state.type.forEach((value) => { if (!available.type.has(value)) state.type.delete(value) })
  state.size.forEach((value) => { if (!available.size.has(value)) state.size.delete(value) })
  state.fillings.forEach((value) => { if (!available.fillings.has(value)) state.fillings.delete(value) })
  state.features.forEach((value) => { if (!available.features.has(value)) state.features.delete(value) })
}
