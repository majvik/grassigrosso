import {
  initCatalogExclusiveAccordionState,
  openCatalogAccordionGroupExclusive,
  setCatalogAccordionGroupExpanded,
} from './catalog-accordion'
import { fetchCatalogFilters, fetchCatalogProducts, type CatalogFilterGroups } from './catalog-api'
import { buildCatalogueCardHtml } from './catalog-card'
import { readCatalogueCardMeta } from './catalog-card-meta'
import { readCatalogFavourites, writeCatalogFavourites } from './catalog-favourites'
import {
  emitCatalogManagerContactIntent,
  emitCatalogShareIntent,
  setCatalogFavouritesSwitchState,
  syncCatalogFavouriteButtons,
  syncCatalogFavouritesControls,
} from './catalog-favourites-ui'
import {
  applyAvailableFilterOptions,
  renderCatalogueFilterGroups as renderCatalogueFilterGroupsInto,
  syncCatalogFilterDependencies,
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

const CATALOGUE_PAGE_SIZE = 6

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

export function initCatalogListingController(documentRef: Document, scrollOptions: ScrollOptions = {}) {
  const catalogueNewSidebar = queryElement<HTMLElement>(documentRef, '.catalogue-new-sidebar')
  const catalogueNewCardsRoot = queryElement<HTMLElement>(documentRef, '.catalogue-new-cards')

  if (!catalogueNewSidebar || !catalogueNewCardsRoot) {
    return
  }

  const sidebarEl = catalogueNewSidebar
  const cardsRootEl = catalogueNewCardsRoot

  const catalogueNewLayout = queryElement<HTMLElement>(documentRef, '.catalogue-new-layout')
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
  const infiniteSentinel = documentRef.createElement('div')
  infiniteSentinel.className = 'catalogue-new-infinite-sentinel'
  infiniteSentinel.setAttribute('aria-hidden', 'true')
  catalogueNewCardsRoot.insertAdjacentElement('afterend', infiniteSentinel)
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

  function updateCardsCache() {
    cards = queryElements<HTMLElement>(cardsRootEl, '.catalogue-new-card')
    cardMeta = cards.map((card, index) => {
      card.dataset.initialOrder = String(index)
      return readCatalogueCardMeta(card, index)
    })
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

  function scrollToCatalogueToolbar() {
    if (!catalogueNewToolbar) return
    catalogueNewToolbar.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      if (matchesCatalogCardMeta(meta, state, favSet)) matchedCards.push(meta.card)
    })

    const visibleSet = new Set(matchedCards.slice(0, visibleCardsLimit))
    cards.forEach((card) => {
      card.style.display = visibleSet.has(card) ? '' : 'none'
    })

    if (catalogueNewFavouritesBackRow) {
      catalogueNewFavouritesBackRow.hidden = !state.favouritesOnly
    }
    if (catalogueNewFavouritesActions) {
      const shouldShowFavouritesAction = state.favouritesOnly && readCatalogFavourites().size > 0
      catalogueNewFavouritesActions.hidden = !shouldShowFavouritesAction
    }

    infiniteSentinel.hidden = matchedCards.length <= visibleCardsLimit
    updateResultsCount()
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
      const fav = [...readCatalogFavourites()]
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
      const fav = [...readCatalogFavourites()]
      if (!fav.length) return
      emitCatalogShareIntent({
        source: 'favourites',
        slugs: fav,
        title: 'Избранные позиции',
      })
    })
  }

  catalogueNewSidebar.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return
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
