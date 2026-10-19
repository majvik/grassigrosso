import {
  type CatalogPriceBounds,
  clampCatalogPriceRange,
  formatCatalogPriceInput,
  isCatalogPriceFilterActive,
  parseCatalogPriceInput,
} from './catalog-price'
import type { CatalogFilterState } from './catalog-filtering'

export type CatalogPriceFilterElements = {
  group: HTMLElement | null
  minInput: HTMLInputElement | null
  maxInput: HTMLInputElement | null
  minRange: HTMLInputElement | null
  maxRange: HTMLInputElement | null
  rangeRoot: HTMLElement | null
}

export function queryCatalogPriceFilter(root: ParentNode): CatalogPriceFilterElements {
  const group = root.querySelector<HTMLElement>('.catalogue-new-filter-group[data-filter-group="price"]')
  return {
    group,
    minInput: group?.querySelector<HTMLInputElement>('[data-price-input="min"]') || null,
    maxInput: group?.querySelector<HTMLInputElement>('[data-price-input="max"]') || null,
    minRange: group?.querySelector<HTMLInputElement>('[data-price-range="min"]') || null,
    maxRange: group?.querySelector<HTMLInputElement>('[data-price-range="max"]') || null,
    rangeRoot: group?.querySelector<HTMLElement>('[data-price-range-root]') || null,
  }
}

export function applyCatalogPriceBoundsToState(
  state: CatalogFilterState,
  bounds: CatalogPriceBounds | null,
  options: { resetSelection?: boolean } = {},
): void {
  if (!bounds) {
    state.priceMin = null
    state.priceMax = null
    return
  }
  if (options.resetSelection || state.priceMin == null || state.priceMax == null) {
    state.priceMin = bounds.min
    state.priceMax = bounds.max
    return
  }
  const clamped = clampCatalogPriceRange(state.priceMin, state.priceMax, bounds)
  state.priceMin = clamped.priceMin
  state.priceMax = clamped.priceMax
}

export function resetCatalogPriceFilter(
  state: CatalogFilterState,
  bounds: CatalogPriceBounds | null,
): void {
  applyCatalogPriceBoundsToState(state, bounds, { resetSelection: true })
}

function setRangeFill(rangeRoot: HTMLElement | null, bounds: CatalogPriceBounds, priceMin: number, priceMax: number) {
  if (!rangeRoot) return
  const span = Math.max(bounds.max - bounds.min, 1)
  const left = ((priceMin - bounds.min) / span) * 100
  const right = ((priceMax - bounds.min) / span) * 100
  rangeRoot.style.setProperty('--price-range-min', `${Math.min(Math.max(left, 0), 100)}%`)
  rangeRoot.style.setProperty('--price-range-max', `${Math.min(Math.max(right, 0), 100)}%`)
}

export function syncCatalogPriceFilterUi(
  root: ParentNode,
  state: CatalogFilterState,
  bounds: CatalogPriceBounds | null,
): void {
  const els = queryCatalogPriceFilter(root)
  if (!els.group) return

  const hasBounds = Boolean(bounds && bounds.max >= bounds.min)
  els.group.hidden = !hasBounds
  els.group.classList.toggle('is-disabled', !hasBounds)
  if (!hasBounds || !bounds) return

  const priceMin = state.priceMin == null ? bounds.min : state.priceMin
  const priceMax = state.priceMax == null ? bounds.max : state.priceMax
  const formattedMin = formatCatalogPriceInput(priceMin)
  const formattedMax = formatCatalogPriceInput(priceMax)

  if (els.minInput && document.activeElement !== els.minInput) {
    els.minInput.value = formattedMin
    els.minInput.placeholder = formatCatalogPriceInput(bounds.min)
    els.minInput.min = String(bounds.min)
    els.minInput.max = String(bounds.max)
  }
  if (els.maxInput && document.activeElement !== els.maxInput) {
    els.maxInput.value = formattedMax
    els.maxInput.placeholder = formatCatalogPriceInput(bounds.max)
    els.maxInput.min = String(bounds.min)
    els.maxInput.max = String(bounds.max)
  }

  for (const range of [els.minRange, els.maxRange]) {
    if (!range) continue
    range.min = String(bounds.min)
    range.max = String(bounds.max)
    range.step = '1'
    range.disabled = bounds.min === bounds.max
  }
  if (els.minRange) els.minRange.value = String(priceMin)
  if (els.maxRange) els.maxRange.value = String(priceMax)
  setRangeFill(els.rangeRoot, bounds, priceMin, priceMax)

  const badge = els.group.querySelector<HTMLElement>('.catalogue-new-filter-selection-count')
  if (badge) {
    const active = isCatalogPriceFilterActive(priceMin, priceMax, bounds)
    if (!active) {
      badge.textContent = ''
      badge.hidden = true
      badge.setAttribute('aria-hidden', 'true')
      badge.removeAttribute('aria-label')
    } else {
      badge.textContent = '1'
      badge.hidden = false
      badge.setAttribute('aria-hidden', 'false')
      badge.setAttribute('aria-label', 'Выбран диапазон цены')
    }
  }
}

export type CatalogPriceFilterHandlers = {
  onChange: () => void
}

export function bindCatalogPriceFilter(
  root: ParentNode,
  getState: () => CatalogFilterState,
  getBounds: () => CatalogPriceBounds | null,
  handlers: CatalogPriceFilterHandlers,
): () => void {
  const els = queryCatalogPriceFilter(root)
  if (!els.group) return () => {}

  const commitRange = (nextMin: number, nextMax: number) => {
    const bounds = getBounds()
    if (!bounds) return
    const state = getState()
    const clamped = clampCatalogPriceRange(nextMin, nextMax, bounds)
    state.priceMin = clamped.priceMin
    state.priceMax = clamped.priceMax
    syncCatalogPriceFilterUi(root, state, bounds)
    handlers.onChange()
  }

  const onMinRangeInput = () => {
    const bounds = getBounds()
    const state = getState()
    if (!bounds || !els.minRange) return
    let nextMin = Number(els.minRange.value)
    let nextMax = state.priceMax == null ? bounds.max : state.priceMax
    if (nextMin > nextMax) nextMax = nextMin
    commitRange(nextMin, nextMax)
  }

  const onMaxRangeInput = () => {
    const bounds = getBounds()
    const state = getState()
    if (!bounds || !els.maxRange) return
    let nextMax = Number(els.maxRange.value)
    let nextMin = state.priceMin == null ? bounds.min : state.priceMin
    if (nextMax < nextMin) nextMin = nextMax
    commitRange(nextMin, nextMax)
  }

  const commitInput = (which: 'min' | 'max') => {
    const bounds = getBounds()
    const state = getState()
    if (!bounds) return
    const raw = which === 'min' ? els.minInput?.value : els.maxInput?.value
    const parsed = parseCatalogPriceInput(raw)
    let nextMin = state.priceMin == null ? bounds.min : state.priceMin
    let nextMax = state.priceMax == null ? bounds.max : state.priceMax
    if (parsed == null) {
      syncCatalogPriceFilterUi(root, state, bounds)
      return
    }
    if (which === 'min') nextMin = parsed
    else nextMax = parsed
    commitRange(nextMin, nextMax)
  }

  const onMinInputChange = () => commitInput('min')
  const onMaxInputChange = () => commitInput('max')
  const onMinInputKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitInput('min')
      els.minInput?.blur()
    }
  }
  const onMaxInputKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitInput('max')
      els.maxInput?.blur()
    }
  }

  els.minRange?.addEventListener('input', onMinRangeInput)
  els.maxRange?.addEventListener('input', onMaxRangeInput)
  els.minInput?.addEventListener('change', onMinInputChange)
  els.maxInput?.addEventListener('change', onMaxInputChange)
  els.minInput?.addEventListener('blur', onMinInputChange)
  els.maxInput?.addEventListener('blur', onMaxInputChange)
  els.minInput?.addEventListener('keydown', onMinInputKeydown)
  els.maxInput?.addEventListener('keydown', onMaxInputKeydown)

  return () => {
    els.minRange?.removeEventListener('input', onMinRangeInput)
    els.maxRange?.removeEventListener('input', onMaxRangeInput)
    els.minInput?.removeEventListener('change', onMinInputChange)
    els.maxInput?.removeEventListener('change', onMaxInputChange)
    els.minInput?.removeEventListener('blur', onMinInputChange)
    els.maxInput?.removeEventListener('blur', onMaxInputChange)
    els.minInput?.removeEventListener('keydown', onMinInputKeydown)
    els.maxInput?.removeEventListener('keydown', onMaxInputKeydown)
  }
}
