import {
  initCatalogExclusiveAccordionState,
  openCatalogAccordionGroupExclusive,
  setCatalogAccordionGroupExpanded,
} from './catalog-accordion'
import { fetchCatalogFilters, fetchCatalogProducts, type CatalogFilterGroups } from './catalog-api'
import { buildCatalogueCardHtml } from './catalog-card'
import { readCatalogueCardMeta } from './catalog-card-meta'
import { readCatalogFavourites, writeCatalogFavourites } from './catalog-favourites'
import { buildCatalogModalSpecs } from './catalog-modal'
import {
  emitCatalogManagerContactIntent,
  setCatalogFavouritesSwitchState,
  syncCatalogFavouriteButtons,
  syncCatalogFavouritesControls,
} from './catalog-favourites-ui'
import {
  applyAvailableFilterOptions,
  renderCatalogueFilterGroups as renderCatalogueFilterGroupsInto,
  syncCatalogFilterDependencies,
  syncCatalogZeroResultsHint,
  syncCatalogueFilterUi,
} from './catalog-filter-dom'
import {
  applyCatalogChipFilter,
  applyCatalogLoadRangeSelect,
  applyCatalogSizeFilter,
  type CatalogCardMeta,
  type CatalogFilterState,
  collectAvailableCatalogFilters,
  compareCatalogCardMeta,
  matchesCatalogCardMeta,
  resetCatalogFilterState,
  setCatalogSort,
  toggleCatalogFavouritesOnly,
} from './catalog-filtering'
import {
  closeCatalogMobileFiltersDrawer,
  openCatalogMobileFiltersDrawer,
} from './catalog-mobile-filters'
import { lockCatalogSidebarScroll } from './catalog-sidebar-scroll'
import { initCatalogSizeSelect } from './catalog-size-select'
import {
  closeCatalogSortMenu,
  setCatalogActiveSortOption,
  toggleCatalogSortMenu,
} from './catalog-sort-menu'
import { initCatalogStickySidebar } from './catalog-sticky-sidebar'
import { setCatalogFilterHelpFromApi } from './catalog-filter-help-modal'
import {
  buildCatalogFavouritesShareMeta,
  buildCatalogFavouritesShareUrl,
  buildCatalogProductShareUrl,
  copyTextWithToast,
  readCatalogSharedState,
  showCatalogShareWarningToast,
} from './catalog-share'

const CATALOGUE_PAGE_SIZE = 6
const ZERO_RESULTS_FILTER_GROUPS = [
  'collection',
  'size',
  'firmness',
  'type',
  'loadRange',
  'heightRange',
  'fillings',
  'features',
] as const

type ZeroResultsFilterGroup = typeof ZERO_RESULTS_FILTER_GROUPS[number]

interface ScrollOptions {
  lockScroll?: () => void
  unlockScroll?: () => void
}

function queryElement<T extends Element>(root: ParentNode, selector: string): T | null {
  return root.querySelector(selector) as T | null
}

function queryElements<T extends Element>(root: ParentNode, selector: string): T[] {
  return [...root.querySelectorAll(selector)] as T[]
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function initCatalogListingController(documentRef: Document, scrollOptions: ScrollOptions = {}) {
  const catalogueNewSidebar = queryElement<HTMLElement>(documentRef, '.catalogue-new-sidebar')
  const catalogueNewCardsRoot = queryElement<HTMLElement>(documentRef, '.catalogue-new-cards')

  if (!catalogueNewSidebar || !catalogueNewCardsRoot) {
    return
  }

  const sidebarEl = catalogueNewSidebar
  const cardsRootEl = catalogueNewCardsRoot

  const catalogueNewLayout = queryElement<HTMLElement>(documentRef, '.catalogue-new-layout')
  const catalogueHero = queryElement<HTMLElement>(documentRef, '.catalog-hero')
  const catalogueNewResultsValue = queryElement<HTMLElement>(documentRef, '.catalogue-new-results strong')
  const catalogueNewSort = queryElement<HTMLElement>(documentRef, '.catalogue-new-sort')
  const catalogueNewSortTrigger = queryElement<HTMLButtonElement>(documentRef, '.catalogue-new-sort-trigger')
  const catalogueNewSortOptions = queryElements<HTMLButtonElement>(documentRef, '.catalogue-new-sort-option')
  const catalogueNewReset = queryElement<HTMLButtonElement>(documentRef, '.catalogue-new-reset')
  const catalogueNewToolbar = queryElement<HTMLElement>(documentRef, '#catalogue-new-products .catalogue-new-toolbar')
  const catalogueNewFavouritesBackBtn = queryElement<HTMLButtonElement>(documentRef, '#catalogue-new-favourites-back')
  const catalogueNewFavouritesBackRow = queryElement<HTMLElement>(documentRef, '#catalogue-new-favourites-back-row')
  const catalogueNewFavouritesOnlySwitch = queryElement<HTMLButtonElement>(documentRef, '#catalogue-new-favourites-only-switch')
  const catalogueNewFavouritesCountEl = queryElement<HTMLElement>(documentRef, '#catalogue-new-favourites-count')
  const catalogueNewFavouritesLink = queryElement<HTMLElement>(documentRef, '#catalogue-new-favourites-link')
  const catalogueNewFavouritesContactBtn = queryElement<HTMLButtonElement>(documentRef, '#catalogue-new-favourites-contact')
  const catalogueNewFavouritesShareBtn = queryElement<HTMLButtonElement>(documentRef, '#catalogue-new-favourites-share')
  const catalogueNewFavouritesActions = queryElement<HTMLElement>(documentRef, '#catalogue-new-favourites-actions')
  const catalogueNewMobileFiltersOpen = queryElement<HTMLButtonElement>(documentRef, '#catalogue-new-mobile-filters-open')
  const catalogueNewMobileFiltersClose = queryElement<HTMLButtonElement>(documentRef, '#catalogue-new-mobile-filters-close')
  const catalogueNewMobileFiltersOverlay = queryElement<HTMLElement>(documentRef, '#catalogue-new-mobile-filters-overlay')
  const stickyPlaceholder = documentRef.createElement('div')
  stickyPlaceholder.className = 'catalogue-new-sidebar-placeholder'
  if (catalogueNewLayout) {
    catalogueNewLayout.insertBefore(stickyPlaceholder, catalogueNewSidebar)
  }

  let scheduleStickySidebarSync = () => {}
  let cards = queryElements<HTMLElement>(catalogueNewCardsRoot, '.catalogue-new-card')
  let cardMeta: CatalogCardMeta<HTMLElement>[] = []
  let visibleCardsLimit = CATALOGUE_PAGE_SIZE
  let matchedCards: HTMLElement[] = []
  const sharedState = readCatalogSharedState()
  let sharedFavouritesSlugs = sharedState.mode === 'favourites' ? [...sharedState.slugs] : []
  let sharedSlugs = new Set(sharedFavouritesSlugs)
  const isSharedFavouritesView = sharedState.mode === 'favourites'
  const isSharedProductView = sharedState.mode === 'product'
  let sharedFavouritesSection: HTMLElement | null = null
  let sharedFavouritesIdEl: HTMLElement | null = null
  let sharedProductSection: HTMLElement | null = null
  const infiniteSentinel = documentRef.createElement('div')
  infiniteSentinel.className = 'catalogue-new-infinite-sentinel'
  infiniteSentinel.setAttribute('aria-hidden', 'true')
  catalogueNewCardsRoot.insertAdjacentElement('afterend', infiniteSentinel)
  const emptyStateEl = documentRef.createElement('div')
  emptyStateEl.className = 'catalogue-new-empty-state'
  emptyStateEl.hidden = true
  emptyStateEl.innerHTML =
    '<img src="/icons/catalog-empty-monogram.png" alt="" aria-hidden="true" />' +
    '<p>Выбрано слишком много фильтров.<br />Сбросьте некоторые для обновления выдачи.</p>'
  catalogueNewCardsRoot.insertAdjacentElement('afterend', emptyStateEl)
  const state: CatalogFilterState = {
    collection: new Set<string>(),
    firmness: new Set<string>(),
    type: new Set<string>(),
    size: new Set<string>(),
    loadRange: new Set<string>(),
    heightRange: new Set<string>(),
    fillings: new Set<string>(),
    features: new Set<string>(),
    sort: 'default',
    favouritesOnly: false,
  }

  const sortMenuElements = {
    root: catalogueNewSort,
    trigger: catalogueNewSortTrigger,
    options: catalogueNewSortOptions,
  }
  const mobileFiltersElements = {
    sidebar: catalogueNewSidebar,
    overlay: catalogueNewMobileFiltersOverlay,
  }
  const mobileFiltersOptions = {
    lockScroll: typeof scrollOptions.lockScroll === 'function' ? scrollOptions.lockScroll : undefined,
    unlockScroll: typeof scrollOptions.unlockScroll === 'function' ? scrollOptions.unlockScroll : undefined,
  }
  const favouritesUiElements = {
    cardsRoot: catalogueNewCardsRoot,
    switchEl: catalogueNewFavouritesOnlySwitch,
    countEl: catalogueNewFavouritesCountEl,
    linkEl: catalogueNewFavouritesLink,
    contactBtn: catalogueNewFavouritesContactBtn,
    shareBtn: catalogueNewFavouritesShareBtn,
    actionsEl: catalogueNewFavouritesActions,
  }

  if (isSharedFavouritesView || isSharedProductView) {
    documentRef.documentElement.classList.add('catalogue-shared-view')
    catalogueHero?.setAttribute('hidden', '')
  }
  if (isSharedFavouritesView) {
    documentRef.documentElement.classList.add('catalogue-shared-favourites-view')
    visibleCardsLimit = Number.MAX_SAFE_INTEGER
    sharedFavouritesSection = documentRef.createElement('section')
    sharedFavouritesSection.className = 'catalogue-new-shared-favourites'
    const sharedBack = documentRef.createElement('a')
    sharedBack.className = 'catalogue-new-shared-back'
    sharedBack.href = '/catalog'
    sharedBack.textContent = 'Назад в каталог'
    const sharedHead = documentRef.createElement('div')
    sharedHead.className = 'catalogue-new-shared-head'
    const shareId = sharedState.mode === 'favourites' ? sharedState.id : ''
    sharedHead.innerHTML = `<h1>Подборка</h1><span>ID ${escapeHtml(shareId)}</span>`
    sharedFavouritesIdEl = sharedHead.querySelector('span')
    if (catalogueNewLayout?.parentNode) {
      catalogueNewLayout.parentNode.insertBefore(sharedFavouritesSection, catalogueNewLayout)
      sharedFavouritesSection.append(sharedBack, sharedHead, cardsRootEl)
      if (catalogueNewFavouritesActions) {
        sharedFavouritesSection.appendChild(catalogueNewFavouritesActions)
      }
    }
  }
  if (isSharedProductView) {
    documentRef.documentElement.classList.add('catalogue-shared-product-view')
    sharedProductSection = documentRef.createElement('section')
    sharedProductSection.className = 'catalogue-new-shared-product'
    sharedProductSection.hidden = true
    catalogueNewLayout?.insertBefore(sharedProductSection, catalogueNewSidebar)
  }

  function updateCardsCache() {
    cards = queryElements<HTMLElement>(cardsRootEl, '.catalogue-new-card')
    cardMeta = cards.map((card, index) => {
      card.dataset.initialOrder = String(index)
      return readCatalogueCardMeta(card, index)
    })
    syncSharedFavouritesRemoveButtons()
  }

  function syncCatalogueFavouritesFilterSwitchState() {
    const fav = readCatalogFavourites()
    const result = syncCatalogFavouritesControls(favouritesUiElements, fav.size, state.favouritesOnly)
    state.favouritesOnly = result.favouritesOnly
    if (result.shouldReapplyFilters) {
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
    }
  }

  function syncCatalogueFavouritesUi() {
    const fav = readCatalogFavourites()
    syncCatalogFavouriteButtons(cardsRootEl, fav)
    syncCatalogueFavouritesFilterSwitchState()
  }

  function updateResultsCount() {
    if (!catalogueNewResultsValue) return
    catalogueNewResultsValue.textContent = String(matchedCards.length)
  }

  function cloneFilterState(source: CatalogFilterState): CatalogFilterState {
    return {
      collection: new Set(source.collection),
      firmness: new Set(source.firmness),
      type: new Set(source.type),
      size: new Set(source.size),
      loadRange: new Set(source.loadRange),
      heightRange: new Set(source.heightRange),
      fillings: new Set(source.fillings),
      features: new Set(source.features),
      sort: source.sort,
      favouritesOnly: source.favouritesOnly,
    }
  }

  function clearFilterGroup(target: CatalogFilterState, group: ZeroResultsFilterGroup): void {
    target[group].clear()
  }

  function hasActiveFilterGroup(group: ZeroResultsFilterGroup): boolean {
    return state[group].size > 0
  }

  function countMatchesWithState(candidateState: CatalogFilterState, favSet: Set<string>): number {
    let count = 0
    cardMeta.forEach((meta) => {
      if (matchesCatalogCardMeta(meta, candidateState, favSet)) count += 1
    })
    return count
  }

  function getBestZeroResultsResetGroup(favSet: Set<string>): string | null {
    if (isSharedFavouritesView || isSharedProductView || matchedCards.length > 0) return null
    let bestGroup: ZeroResultsFilterGroup | null = null
    let bestCount = -1
    ZERO_RESULTS_FILTER_GROUPS.forEach((group) => {
      if (!hasActiveFilterGroup(group)) return
      const candidateState = cloneFilterState(state)
      clearFilterGroup(candidateState, group)
      const count = countMatchesWithState(candidateState, favSet)
      if (count > bestCount) {
        bestGroup = group
        bestCount = count
      }
    })
    return bestGroup
  }

  function scrollToCatalogueToolbar() {
    if (!catalogueNewToolbar) return
    catalogueNewToolbar.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function getSharedOrLocalFavouriteSlugs(): string[] {
    if (isSharedFavouritesView) return sharedFavouritesSlugs
    return [...readCatalogFavourites()]
  }

  function syncSharedFavouritesRemoveButtons(): void {
    if (!isSharedFavouritesView) return
    cardsRootEl.querySelectorAll<HTMLElement>('.catalogue-new-card').forEach((card) => {
      const slug = String(card.dataset.productSlug || '').trim()
      if (!slug) return
      if (card.querySelector('.catalogue-new-shared-remove')) return
      const tagsRow = card.querySelector<HTMLElement>('.catalogue-new-tags-row')
      if (!tagsRow) return
      const button = documentRef.createElement('button')
      button.type = 'button'
      button.className = 'catalogue-new-modal-position-remove catalogue-new-shared-remove'
      button.dataset.productSlug = slug
      button.setAttribute('aria-label', 'Удалить позицию из подборки')
      const icon = documentRef.createElement('img')
      icon.src = '/icons/catalogue-modal-remove-position.svg'
      icon.alt = ''
      icon.setAttribute('aria-hidden', 'true')
      button.appendChild(icon)
      tagsRow.appendChild(button)
    })
  }

  function removeSharedFavouriteSlug(slug: string): void {
    if (!isSharedFavouritesView) return
    sharedFavouritesSlugs = sharedFavouritesSlugs.filter((item) => item !== slug)
    sharedSlugs = new Set(sharedFavouritesSlugs)
    if (sharedFavouritesSlugs.length) {
      const next = buildCatalogFavouritesShareMeta(sharedFavouritesSlugs)
      window.history.replaceState(null, '', next.url)
      if (sharedFavouritesIdEl) sharedFavouritesIdEl.textContent = `ID ${next.id}`
    } else {
      window.location.assign('/catalog')
      return
    }
    showCatalogShareWarningToast()
    visibleCardsLimit = Number.MAX_SAFE_INTEGER
    applyFilters()
  }

  function findCardBySlug(slug: string): HTMLElement | null {
    const safe = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(slug)
      : slug.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    return cardsRootEl.querySelector<HTMLElement>(`.catalogue-new-card[data-product-slug="${safe}"]`)
  }

  function syncSharedProductFavouriteButton(button: HTMLButtonElement, slug: string): void {
    const isActive = readCatalogFavourites().has(slug)
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    button.setAttribute('aria-label', isActive ? 'Удалить из избранного' : 'Добавить в избранное')
  }

  function renderSharedProductView(): void {
    if (!isSharedProductView || sharedState.mode !== 'product' || !sharedProductSection) return
    const card = findCardBySlug(sharedState.slug)
    if (!card) {
      sharedProductSection.hidden = true
      return
    }

    const image = card.querySelector<HTMLImageElement>('picture img')
    const title = card.querySelector('.catalogue-new-card-body h3')?.textContent?.trim() || image?.alt || 'Матрас'
    const specs = buildCatalogModalSpecs(card.dataset)
    const tags = [...card.querySelectorAll('.catalogue-new-tags > .catalogue-new-tag')]
      .map((tag) => tag.textContent?.trim())
      .filter((tag): tag is string => Boolean(tag))
    const slug = String(card.dataset.productSlug || sharedState.slug).trim()
    const specsHtml = specs
      .map((spec) => (
        `<div class="catalogue-new-shared-product-spec">` +
        `<span class="catalogue-new-shared-product-spec-label">${escapeHtml(spec.label)}</span>` +
        `<span class="catalogue-new-shared-product-spec-value">${escapeHtml(spec.value)}</span>` +
        `</div>`
      ))
      .join('')
    const tagsHtml = tags.length
      ? `<div class="catalogue-new-shared-product-tags catalogue-new-tags">${tags.map((tag) => `<span class="catalogue-new-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
      : ''

    sharedProductSection.hidden = false
    sharedProductSection.innerHTML = `
      <a class="catalogue-new-shared-back" href="/catalog">Назад в каталог</a>
      <div class="catalogue-new-shared-product-shell">
        <div class="catalogue-new-shared-product-info">
          <h1 class="catalogue-new-shared-product-title">${escapeHtml(title)}</h1>
          <div class="catalogue-new-shared-product-specs">${specsHtml}</div>
          ${tagsHtml}
          <div class="catalogue-new-shared-product-actions catalogue-new-image-modal-actions">
            <button type="button" class="catalogue-new-image-modal-action catalogue-new-manager-contact-btn" data-shared-product-contact>Связаться с менеджером по позиции</button>
            <div class="catalogue-new-image-modal-side-actions">
              <button type="button" class="catalogue-new-image-modal-share" data-shared-product-share aria-label="Поделиться">
                <img class="catalogue-new-image-modal-share-icon--default" src="/icons/share-default.svg" alt="" aria-hidden="true" />
                <img class="catalogue-new-image-modal-share-icon--hover" src="/icons/share-hover.svg" alt="" aria-hidden="true" />
                <span class="catalogue-new-image-modal-share-label">Поделиться</span>
              </button>
              <button type="button" class="catalogue-new-image-modal-favourite" data-shared-product-favourite aria-pressed="false" aria-label="Добавить в избранное">
                <img class="catalogue-new-image-modal-favourite-icon--empty" src="/icons/favourite-empty.svg" alt="" aria-hidden="true" />
                <img class="catalogue-new-image-modal-favourite-icon--full" src="/icons/favourite-full.svg" alt="" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div class="catalogue-new-shared-product-media">
          <img src="${escapeHtml(image?.getAttribute('src') || '')}" alt="${escapeHtml(image?.getAttribute('alt') || '')}" />
        </div>
      </div>
    `

    const favBtn = sharedProductSection.querySelector<HTMLButtonElement>('[data-shared-product-favourite]')
    if (favBtn) syncSharedProductFavouriteButton(favBtn, slug)
  }

  function applySorting() {
    const cardsToSort = [...cards]
    const metaByCard = new Map(cardMeta.map((meta) => [meta.card, meta]))
    cardsToSort.sort((a, b) => {
      const metaA = metaByCard.get(a)
      const metaB = metaByCard.get(b)
      return compareCatalogCardMeta(metaA, metaB, state.sort)
    })
    cardsToSort.forEach((card) => {
      cardsRootEl.appendChild(card)
    })
  }

  function syncUiFromState() {
    syncCatalogueFilterUi(sidebarEl, state, sizeSelectController.resolveMenu)
  }

  function syncFilterOptionsFromCards() {
    if (!cardMeta.length) return
    const available = collectAvailableCatalogFilters(cardMeta)
    applyAvailableFilterOptions(sidebarEl, state, available)
    syncUiFromState()
  }

  function syncFilterDependencies() {
    syncCatalogFilterDependencies(sidebarEl, state)
  }

  function applyFilters() {
    const favSet = readCatalogFavourites()
    matchedCards = []
    cardMeta.forEach((meta) => {
      if (isSharedFavouritesView) {
        if (meta.slug && sharedSlugs.has(meta.slug)) matchedCards.push(meta.card)
        return
      }
      if (matchesCatalogCardMeta(meta, state, favSet)) matchedCards.push(meta.card)
    })

    const limit = isSharedFavouritesView ? Number.MAX_SAFE_INTEGER : visibleCardsLimit
    const visibleSet = new Set(matchedCards.slice(0, limit))
    cards.forEach((card) => {
      card.style.display = visibleSet.has(card) ? '' : 'none'
    })

    if (catalogueNewFavouritesBackRow) {
      catalogueNewFavouritesBackRow.hidden = !state.favouritesOnly
    }
    if (catalogueNewFavouritesActions) {
      const shouldShowFavouritesAction = isSharedFavouritesView || (state.favouritesOnly && readCatalogFavourites().size > 0)
      catalogueNewFavouritesActions.hidden = !shouldShowFavouritesAction
    }
    if (isSharedFavouritesView) {
      if (catalogueNewFavouritesContactBtn) catalogueNewFavouritesContactBtn.disabled = matchedCards.length === 0
      if (catalogueNewFavouritesShareBtn) catalogueNewFavouritesShareBtn.disabled = matchedCards.length === 0
    }

    const isEmptyNormalCatalogue = !isSharedFavouritesView && !isSharedProductView && matchedCards.length === 0
    emptyStateEl.hidden = !isEmptyNormalCatalogue
    cardsRootEl.classList.toggle('is-empty', isEmptyNormalCatalogue)
    syncCatalogZeroResultsHint(sidebarEl, isEmptyNormalCatalogue ? getBestZeroResultsResetGroup(favSet) : null)
    infiniteSentinel.hidden = isSharedFavouritesView || isSharedProductView || matchedCards.length <= visibleCardsLimit
    updateResultsCount()
    renderSharedProductView()
    scheduleStickySidebarSync()
  }

  function resetCatalogueNewFilterChipsAndSort() {
    resetCatalogFilterState(state)
    syncUiFromState()
    setCatalogActiveSortOption(sortMenuElements, 'default')
    closeCatalogSortMenu(sortMenuElements)
    applySorting()
  }

  function showCatalogueFavouritesOnlyView() {
    const fav = readCatalogFavourites()
    if (fav.size === 0) return
    resetCatalogueNewFilterChipsAndSort()
    state.favouritesOnly = true
    setCatalogFavouritesSwitchState(catalogueNewFavouritesOnlySwitch, true)
    if (catalogueNewFavouritesOnlySwitch) catalogueNewFavouritesOnlySwitch.disabled = false
    visibleCardsLimit = CATALOGUE_PAGE_SIZE
    applyFilters()
    scrollToCatalogueToolbar()
  }

  const runCatalogSizeReset = () => {
    applyCatalogSizeFilter(state, 'all')
    syncUiFromState()
    visibleCardsLimit = CATALOGUE_PAGE_SIZE
    applyFilters()
    scrollToCatalogueToolbar()
  }

  const runCatalogLoadRangeReset = () => {
    applyCatalogLoadRangeSelect(state, 'all')
    syncUiFromState()
    visibleCardsLimit = CATALOGUE_PAGE_SIZE
    applyFilters()
    scrollToCatalogueToolbar()
  }

  const runCatalogFilterGroupReset = (groupName: string) => {
    const group = ZERO_RESULTS_FILTER_GROUPS.find((item) => item === groupName)
    if (!group) return
    clearFilterGroup(state, group)
    syncUiFromState()
    syncFilterDependencies()
    sizeSelectController.closeMenus()
    visibleCardsLimit = CATALOGUE_PAGE_SIZE
    applyFilters()
    scrollToCatalogueToolbar()
  }

  const sizeSelectController = initCatalogSizeSelect(sidebarEl, {
    onOptionSelected: (group, value) => {
      if (group === 'size') {
        const shouldCloseAfterSelect = applyCatalogSizeFilter(state, value)
        syncUiFromState()
        visibleCardsLimit = CATALOGUE_PAGE_SIZE
        applyFilters()
        return shouldCloseAfterSelect
      }
      if (group === 'loadRange') {
        applyCatalogLoadRangeSelect(state, value)
        syncUiFromState()
        visibleCardsLimit = CATALOGUE_PAGE_SIZE
        applyFilters()
        return true
      }
      return true
    },
    onSizeReset: runCatalogSizeReset,
    onLoadRangeReset: runCatalogLoadRangeReset,
  })

  function renderCatalogueFilterGroups(groups: CatalogFilterGroups) {
    sizeSelectController.closeMenus()
    const rendered = renderCatalogueFilterGroupsInto(sidebarEl, groups)
    if (!rendered) return false
    syncUiFromState()
    syncFilterOptionsFromCards()
    applyFilters()
    return true
  }

  async function loadCatalogueFiltersFromStrapi() {
    try {
      const { groups, filterHelp } = await fetchCatalogFilters()
      setCatalogFilterHelpFromApi(filterHelp)
      renderCatalogueFilterGroups(groups)
    } catch (err) {
      console.warn('Catalogue filter feed failed, using static filter controls:', err)
      setCatalogFilterHelpFromApi(undefined)
      renderCatalogueFilterGroups({ size: [] })
    }
  }

  async function loadCatalogueFromStrapi() {
    try {
      const items = await fetchCatalogProducts()
      if (items.length === 0) return

      const html = items.map((item) => buildCatalogueCardHtml(item)).join('')
      cardsRootEl.innerHTML = html
      updateCardsCache()
      syncCatalogueFavouritesUi()
      syncFilterOptionsFromCards()
      applySorting()
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
    } catch (err) {
      console.warn('Catalogue Strapi fetch failed, using static fallback:', err)
    }
  }

  updateCardsCache()
  syncCatalogueFavouritesUi()

  window.addEventListener('catalogue:favourites-updated', () => {
    syncCatalogueFavouritesUi()
    if (state.favouritesOnly) {
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
    }
  })

  if (catalogueNewFavouritesLink) {
    catalogueNewFavouritesLink.addEventListener('click', (event) => {
      const fav = readCatalogFavourites()
      if (fav.size === 0) {
        event.preventDefault()
        return
      }
      event.preventDefault()
      showCatalogueFavouritesOnlyView()
    })
  }

  if (catalogueNewFavouritesContactBtn) {
    catalogueNewFavouritesContactBtn.addEventListener('click', () => {
      if (catalogueNewFavouritesContactBtn.disabled) return
      const fav = getSharedOrLocalFavouriteSlugs()
      if (!fav.length) return
      emitCatalogManagerContactIntent({
        source: 'favourites',
        slugs: fav,
        title: 'Избранные позиции',
      })
    })
  }

  if (catalogueNewFavouritesBackBtn) {
    catalogueNewFavouritesBackBtn.addEventListener('click', () => {
      state.favouritesOnly = false
      setCatalogFavouritesSwitchState(catalogueNewFavouritesOnlySwitch, false)
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
    })
  }

  if (catalogueNewFavouritesShareBtn) {
    catalogueNewFavouritesShareBtn.addEventListener('click', () => {
      if (catalogueNewFavouritesShareBtn.disabled) return
      const fav = getSharedOrLocalFavouriteSlugs()
      if (!fav.length) return
      copyTextWithToast(isSharedFavouritesView ? window.location.href : buildCatalogFavouritesShareUrl(fav))
    })
  }

  sharedProductSection?.addEventListener('click', (event) => {
    if (sharedState.mode !== 'product') return
    const target = event.target instanceof Element ? event.target : null
    if (!target) return
    const slug = sharedState.slug
    if (target.closest('[data-shared-product-contact]')) {
      emitCatalogManagerContactIntent({
        source: 'product',
        slugs: [slug],
        title: 'Позиция',
      })
      return
    }
    if (target.closest('[data-shared-product-share]')) {
      copyTextWithToast(buildCatalogProductShareUrl(slug))
      return
    }
    const favBtn = target.closest<HTMLButtonElement>('[data-shared-product-favourite]')
    if (favBtn) {
      const favSet = readCatalogFavourites()
      if (favSet.has(slug)) favSet.delete(slug)
      else favSet.add(slug)
      writeCatalogFavourites(favSet)
      window.dispatchEvent(new CustomEvent('catalogue:favourites-updated'))
      syncSharedProductFavouriteButton(favBtn, slug)
    }
  })

  catalogueNewSidebar.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return
      const zeroResultsHint = target.closest('.catalogue-new-zero-results-hint')
      if (zeroResultsHint) {
        const groupEl = zeroResultsHint.closest<HTMLElement>('.catalogue-new-filter-group[data-filter-group]')
        const groupName = String(groupEl?.dataset.filterGroup || '')
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        runCatalogFilterGroupReset(groupName)
        return
      }
      const loadRangeResetMark = target.closest('[data-action="load-range-reset"]')
      if (loadRangeResetMark) {
        event.preventDefault()
        sizeSelectController.closeMenus()
        runCatalogLoadRangeReset()
        return
      }
      const sizeResetMark = target.closest('[data-action="size-reset"]')
      if (sizeResetMark) {
        event.preventDefault()
        sizeSelectController.closeMenus()
        runCatalogSizeReset()
        return
      }
      const sizeHelpLink = target.closest('.catalogue-new-size-help-link[data-action="size-help"]')
      if (sizeHelpLink) {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('catalogue:size-help-request'))
        return
      }
      const chip = target.closest('.catalogue-new-chip') as HTMLElement | null
      if (chip) {
        const groupName = chip.dataset.filterGroup
        const value = chip.dataset.value
        if (groupName && value) {
          if (applyCatalogChipFilter(state, groupName, value)) {
            syncUiFromState()
          }
          syncFilterDependencies()
          visibleCardsLimit = CATALOGUE_PAGE_SIZE
          applyFilters()
          scrollToCatalogueToolbar()
        }
        return
      }
      const trigger = target.closest('.catalogue-new-filter-accordion-trigger') as HTMLElement | null
      if (!trigger) return
      const groupEl = trigger.closest('.catalogue-new-filter-group')
      if (!groupEl) return
      const expanded = trigger.getAttribute('aria-expanded') === 'true'
      if (expanded) {
        setCatalogAccordionGroupExpanded(groupEl, false)
        return
      }
      openCatalogAccordionGroupExclusive(sidebarEl, groupEl)
    },
    true,
  )

  renderCatalogueFilterGroups({ size: [] })

  cardsRootEl.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    const removeBtn = (target?.closest('.catalogue-new-shared-remove') as HTMLElement | null) ?? null
    if (removeBtn && isSharedFavouritesView) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      const slug = String(removeBtn.dataset.productSlug || '').trim()
      if (slug) {
        window.dispatchEvent(new CustomEvent('catalogue:confirm-remove-position', {
          detail: { slug, isLast: sharedFavouritesSlugs.length <= 1 },
        }))
      }
      return
    }
    const btn = (target?.closest('.catalogue-new-favourite') as HTMLElement | null) ?? null
    if (!btn || !cardsRootEl.contains(btn)) return
    event.preventDefault()
    event.stopPropagation()
    const slug = String(btn.dataset.productSlug || '')
    if (!slug) return
    const fav = readCatalogFavourites()
    if (fav.has(slug)) fav.delete(slug)
    else fav.add(slug)
    writeCatalogFavourites(fav)
    window.dispatchEvent(new CustomEvent('catalogue:favourites-updated'))
  })

  window.addEventListener('catalogue:remove-shared-position-confirmed', (event) => {
    const ce = event as CustomEvent<{ slug?: string }>
    const slug = String(ce.detail?.slug || '').trim()
    if (slug) removeSharedFavouriteSlug(slug)
  })

  if (catalogueNewFavouritesOnlySwitch) {
    catalogueNewFavouritesOnlySwitch.addEventListener('click', () => {
      toggleCatalogFavouritesOnly(state)
      setCatalogFavouritesSwitchState(catalogueNewFavouritesOnlySwitch, state.favouritesOnly)
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
      scrollToCatalogueToolbar()
    })
  }

  documentRef.addEventListener('click', (event) => {
    const target = event.target instanceof Node ? event.target : null
    if (sizeSelectController.handleDocumentClick(event)) return
    if (catalogueNewSort && !catalogueNewSort.contains(target)) {
      closeCatalogSortMenu(sortMenuElements)
    }
    const clickedInsidePortalSizeMenu = sizeSelectController.containsActiveMenuTarget(target)
    if (!sidebarEl.contains(target) && !clickedInsidePortalSizeMenu) {
      sizeSelectController.closeMenus()
    }
  })

  documentRef.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    closeCatalogSortMenu(sortMenuElements)
    sizeSelectController.closeMenus()
  })

  if (catalogueNewSort && catalogueNewSortTrigger && catalogueNewSortOptions.length > 0) {
    catalogueNewSortTrigger.addEventListener('click', () => {
      toggleCatalogSortMenu(sortMenuElements)
    })

    catalogueNewSortOptions.forEach((option) => {
      option.addEventListener('click', () => {
        setCatalogSort(state, option.dataset.value)
        setCatalogActiveSortOption(sortMenuElements, state.sort)
        closeCatalogSortMenu(sortMenuElements)
        applySorting()
        visibleCardsLimit = CATALOGUE_PAGE_SIZE
        applyFilters()
        scrollToCatalogueToolbar()
      })
    })

    setCatalogActiveSortOption(sortMenuElements, 'default')
  }

  if (catalogueNewReset) {
    catalogueNewReset.addEventListener('click', () => {
      resetCatalogueNewFilterChipsAndSort()
      state.favouritesOnly = false
      setCatalogFavouritesSwitchState(catalogueNewFavouritesOnlySwitch, false)
      syncCatalogueFavouritesFilterSwitchState()
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
      scrollToCatalogueToolbar()
    })
  }

  if (catalogueNewMobileFiltersOpen) {
    catalogueNewMobileFiltersOpen.addEventListener('click', () => {
      openCatalogMobileFiltersDrawer(mobileFiltersElements, mobileFiltersOptions)
    })
  }
  if (catalogueNewMobileFiltersClose) {
    catalogueNewMobileFiltersClose.addEventListener('click', () => {
      closeCatalogMobileFiltersDrawer(mobileFiltersElements, mobileFiltersOptions)
    })
  }
  if (catalogueNewMobileFiltersOverlay) {
    catalogueNewMobileFiltersOverlay.addEventListener('click', () => {
      closeCatalogMobileFiltersDrawer(mobileFiltersElements, mobileFiltersOptions)
    })
  }
  documentRef.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCatalogMobileFiltersDrawer(mobileFiltersElements, mobileFiltersOptions)
  })

  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (matchedCards.length <= visibleCardsLimit) return
          visibleCardsLimit += CATALOGUE_PAGE_SIZE
          applyFilters()
        })
      },
      {
        root: null,
        rootMargin: '400px 0px',
        threshold: 0,
      },
    )
    observer.observe(infiniteSentinel)
  } else {
    visibleCardsLimit = Number.MAX_SAFE_INTEGER
  }

  lockCatalogSidebarScroll(sidebarEl, {
    shouldSkipWheel: () => sizeSelectController.hasOpenMenu(),
  })

  if (catalogueNewLayout) {
    scheduleStickySidebarSync = initCatalogStickySidebar(
      catalogueNewLayout,
      sidebarEl,
      stickyPlaceholder,
    ).scheduleSync
  }

  applySorting()
  syncUiFromState()
  initCatalogExclusiveAccordionState(sidebarEl)
  syncFilterOptionsFromCards()
  applyFilters()
  loadCatalogueFiltersFromStrapi()
  loadCatalogueFromStrapi()
}
