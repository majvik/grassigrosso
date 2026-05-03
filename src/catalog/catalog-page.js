import {
  initCatalogExclusiveAccordionState,
  openCatalogAccordionGroupExclusive,
} from './catalog-accordion'
import { fetchCatalogFilterGroups, fetchCatalogProducts } from './catalog-api'
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
  setSingleChipSelection as setSingleChipSelectionInto,
  syncCatalogFilterDependencies,
  syncCatalogueFilterUi,
} from './catalog-filter-dom'
import {
  CATALOG_MULTI_FILTER_GROUPS,
  applyCatalogChipFilter,
  applyCatalogSizeFilter,
  collectAvailableCatalogFilters,
  compareCatalogCardMeta,
  matchesCatalogCardMeta,
  resetCatalogFilterState,
  setCatalogSort,
  toggleCatalogFavouritesOnly,
} from './catalog-filtering'
import { initCatalogImageModal } from './catalog-image-modal'
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
import { initCatalogViewToggle } from './catalog-view-toggle'

export function initCataloguePage({ lockScroll, unlockScroll } = {}) {
  const catalogueNewSidebar = document.querySelector('.catalogue-new-sidebar')
  const catalogueNewCardsRoot = document.querySelector('.catalogue-new-cards')
  const catalogueNewResultsValue = document.querySelector('.catalogue-new-results strong')
  const catalogueNewSort = document.querySelector('.catalogue-new-sort')
  const catalogueNewSortTrigger = document.querySelector('.catalogue-new-sort-trigger')
  const catalogueNewSortOptions = [...document.querySelectorAll('.catalogue-new-sort-option')]
  const catalogueNewReset = document.querySelector('.catalogue-new-reset')
  const catalogueNewToolbar = document.querySelector('#catalogue-new-products .catalogue-new-toolbar')
  const catalogueNewFavouritesBackBtn = document.querySelector('#catalogue-new-favourites-back')
  const catalogueNewFavouritesBackRow = document.querySelector('#catalogue-new-favourites-back-row')
  const catalogueNewFavouritesOnlySwitch = document.querySelector('#catalogue-new-favourites-only-switch')
  const catalogueNewFavouritesCountEl = document.querySelector('#catalogue-new-favourites-count')
  const catalogueNewFavouritesLink = document.querySelector('#catalogue-new-favourites-link')
  const catalogueNewFavouritesContactBtn = document.querySelector('#catalogue-new-favourites-contact')
  const catalogueNewFavouritesShareBtn = document.querySelector('#catalogue-new-favourites-share')
  const catalogueNewFavouritesActions = document.querySelector('#catalogue-new-favourites-actions')
  const catalogueNewMobileFiltersOpen = document.querySelector('#catalogue-new-mobile-filters-open')
  const catalogueNewMobileFiltersClose = document.querySelector('#catalogue-new-mobile-filters-close')
  const catalogueNewMobileFiltersOverlay = document.querySelector('#catalogue-new-mobile-filters-overlay')

  if (catalogueNewSidebar && catalogueNewCardsRoot) {
    const catalogueNewLayout = document.querySelector('.catalogue-new-layout')
    const stickyPlaceholder = document.createElement('div')
    stickyPlaceholder.className = 'catalogue-new-sidebar-placeholder'
    if (catalogueNewLayout) {
      catalogueNewLayout.insertBefore(stickyPlaceholder, catalogueNewSidebar)
    }
    let scheduleStickySidebarSync = () => {}
    let cards = [...catalogueNewCardsRoot.querySelectorAll('.catalogue-new-card')]
    let cardMeta = []
    const CATALOGUE_PAGE_SIZE = 6
    let visibleCardsLimit = CATALOGUE_PAGE_SIZE
    let matchedCards = []
    const infiniteSentinel = document.createElement('div')
    infiniteSentinel.className = 'catalogue-new-infinite-sentinel'
    infiniteSentinel.setAttribute('aria-hidden', 'true')
    catalogueNewCardsRoot.insertAdjacentElement('afterend', infiniteSentinel)
    const state = {
      collection: 'all',
      firmness: new Set(),
      type: new Set(),
      size: new Set(),
      loadRange: new Set(),
      heightRange: new Set(),
      fillings: new Set(),
      features: new Set(),
      sort: 'default',
      favouritesOnly: false,
    }

    function renderCatalogueFilterGroups(groups) {
      // Пока меню размеров в портале (body), querySelector в сайдбаре не находит ul — replaceChildren не срабатывал.
      sizeSelectController.closeMenus()
      const rendered = renderCatalogueFilterGroupsInto(catalogueNewSidebar, groups)
      if (!rendered) return false
      syncUiFromState()
      syncFilterOptionsFromCards()
      applyFilters()
      return true
    }

    function updateCardsCache() {
      cards = [...catalogueNewCardsRoot.querySelectorAll('.catalogue-new-card')]
      cardMeta = cards.map((card, index) => {
        card.dataset.initialOrder = String(index)
        return readCatalogueCardMeta(card, index)
      })
    }

    function readCatalogueFavourites() {
      return readCatalogFavourites()
    }

    function writeCatalogueFavourites(set) {
      writeCatalogFavourites(set)
    }

    function syncCatalogueFavouritesFilterSwitchState() {
      const fav = readCatalogueFavourites()
      const result = syncCatalogFavouritesControls(favouritesUiElements, fav.size, state.favouritesOnly)
      state.favouritesOnly = result.favouritesOnly
      if (result.shouldReapplyFilters) {
        visibleCardsLimit = CATALOGUE_PAGE_SIZE
        applyFilters()
      }
    }

    function syncCatalogueFavouritesUi() {
      const fav = readCatalogueFavourites()
      syncCatalogFavouriteButtons(catalogueNewCardsRoot, fav)
      syncCatalogueFavouritesFilterSwitchState()
    }

    window.addEventListener('catalogue:favourites-updated', () => {
      syncCatalogueFavouritesUi()
      if (state.favouritesOnly) {
        visibleCardsLimit = CATALOGUE_PAGE_SIZE
        applyFilters()
      }
    })

    async function loadCatalogueFiltersFromStrapi() {
      try {
        const groups = await fetchCatalogFilterGroups()
        renderCatalogueFilterGroups(groups)
      } catch (err) {
        console.warn('Catalogue filter feed failed, using static filter controls:', err)
        renderCatalogueFilterGroups({ size: [] })
      }
    }

    async function loadCatalogueFromStrapi() {
      try {
        const items = await fetchCatalogProducts()
        if (items.length === 0) return

        const html = items.map((item) => buildCatalogueCardHtml(item)).join('')
        catalogueNewCardsRoot.innerHTML = html
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
      lockScroll: typeof lockScroll === 'function' ? lockScroll : undefined,
      unlockScroll: typeof unlockScroll === 'function' ? unlockScroll : undefined,
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

    updateCardsCache()
    syncCatalogueFavouritesUi()

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
        catalogueNewCardsRoot.appendChild(card)
      })
    }

    function syncFilterOptionsFromCards() {
      if (!cardMeta.length) return
      const available = collectAvailableCatalogFilters(cardMeta)
      applyAvailableFilterOptions(catalogueNewSidebar, state, available)
      syncUiFromState()
    }

    function syncFilterDependencies() {
      syncCatalogFilterDependencies(catalogueNewSidebar, state)
    }

    function syncUiFromState() {
      syncCatalogueFilterUi(catalogueNewSidebar, state, sizeSelectController.resolveMenu)
    }

    function applyFilters() {
      const favSet = readCatalogueFavourites()
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
        const shouldShowFavouritesAction = state.favouritesOnly && readCatalogueFavourites().size > 0
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
      const fav = readCatalogueFavourites()
      if (fav.size === 0) return
      resetCatalogueNewFilterChipsAndSort()
      state.favouritesOnly = true
      setCatalogFavouritesSwitchState(catalogueNewFavouritesOnlySwitch, true)
      if (catalogueNewFavouritesOnlySwitch) catalogueNewFavouritesOnlySwitch.disabled = false
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
      scrollToCatalogueToolbar()
    }

    if (catalogueNewFavouritesLink) {
      catalogueNewFavouritesLink.addEventListener('click', (event) => {
        const fav = readCatalogueFavourites()
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
        const fav = [...readCatalogueFavourites()]
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
        const fav = [...readCatalogueFavourites()]
        if (!fav.length) return
        emitCatalogShareIntent({
          source: 'favourites',
          slugs: fav,
          title: 'Избранные позиции',
        })
      })
    }

    catalogueNewSidebar.addEventListener('click', (event) => {
      const sizeHelpLink = event.target.closest('.catalogue-new-size-help-link[data-action="size-help"]')
      if (sizeHelpLink) {
        event.preventDefault()
        return
      }
      const chip = event.target.closest('.catalogue-new-chip')
      if (chip) {
        const groupName = chip.dataset.filterGroup
        const value = chip.dataset.value
        if (groupName && value) {
          const isMultiGroup = CATALOG_MULTI_FILTER_GROUPS.has(groupName)
          if (applyCatalogChipFilter(state, groupName, value) && isMultiGroup) {
            syncUiFromState()
          } else if (groupName === 'collection') {
            setSingleChipSelectionInto(catalogueNewSidebar, groupName, value)
          }
          syncFilterDependencies()
          visibleCardsLimit = CATALOGUE_PAGE_SIZE
          applyFilters()
          scrollToCatalogueToolbar()
        }
        return
      }
      const trigger = event.target.closest('.catalogue-new-filter-accordion-trigger')
      if (!trigger) return
      const groupEl = trigger.closest('.catalogue-new-filter-group')
      if (!groupEl) return
      const expanded = trigger.getAttribute('aria-expanded') === 'true'
      if (expanded) return
      openCatalogAccordionGroupExclusive(catalogueNewSidebar, groupEl)
    })

    const sizeSelectController = initCatalogSizeSelect(catalogueNewSidebar, {
      onOptionSelected: (value) => {
        const shouldCloseAfterSelect = applyCatalogSizeFilter(state, value)
        syncUiFromState()
        visibleCardsLimit = CATALOGUE_PAGE_SIZE
        applyFilters()
        return shouldCloseAfterSelect
      },
    })

    // Канон размеров из JS сразу (не ждём Strapi); при открытом портале renderCatalogueFilterGroups закроет меню и обновит DOM.
    renderCatalogueFilterGroups({ size: [] })

    catalogueNewCardsRoot.addEventListener('click', (event) => {
      const btn = event.target.closest('.catalogue-new-favourite')
      if (!btn || !catalogueNewCardsRoot.contains(btn)) return
      event.preventDefault()
      event.stopPropagation()
      const slug = String(btn.dataset.productSlug || '')
      if (!slug) return
      const fav = readCatalogueFavourites()
      if (fav.has(slug)) fav.delete(slug)
      else fav.add(slug)
      writeCatalogueFavourites(fav)
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

      document.addEventListener('click', (event) => {
        if (sizeSelectController.handleDocumentClick(event)) return
        if (!catalogueNewSort.contains(event.target)) {
          closeCatalogSortMenu(sortMenuElements)
        }
        const clickedInsidePortalSizeMenu = sizeSelectController.containsActiveMenuTarget(event.target)
        if (!catalogueNewSidebar.contains(event.target) && !clickedInsidePortalSizeMenu) {
          sizeSelectController.closeMenus()
        }
      })

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeCatalogSortMenu(sortMenuElements)
          sizeSelectController.closeMenus()
        }
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
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeCatalogMobileFiltersDrawer(mobileFiltersElements, mobileFiltersOptions)
    })

    if (window.IntersectionObserver) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (matchedCards.length <= visibleCardsLimit) return
          visibleCardsLimit += CATALOGUE_PAGE_SIZE
          applyFilters()
        })
      }, {
        root: null,
        rootMargin: '400px 0px',
        threshold: 0,
      })
      observer.observe(infiniteSentinel)
    } else {
      visibleCardsLimit = Number.MAX_SAFE_INTEGER
    }

    lockCatalogSidebarScroll(catalogueNewSidebar, {
      shouldSkipWheel: () => sizeSelectController.hasOpenMenu(),
    })

    if (catalogueNewLayout) {
      scheduleStickySidebarSync = initCatalogStickySidebar(
        catalogueNewLayout,
        catalogueNewSidebar,
        stickyPlaceholder,
      ).scheduleSync
    }

    applySorting()
    syncUiFromState()
    initCatalogExclusiveAccordionState(catalogueNewSidebar)
    syncFilterOptionsFromCards()
    applyFilters()
    loadCatalogueFiltersFromStrapi()
    loadCatalogueFromStrapi()
  }

  const catalogueNewViewButtons = document.querySelectorAll('.catalogue-new-view-btn')
  if (catalogueNewViewButtons.length > 0) {
    initCatalogViewToggle([...catalogueNewViewButtons], document.querySelector('.catalogue-new-cards'))
  }

  const catalogueImageModal = document.getElementById('catalogueImageModal')
  const catalogueImageModalImg = document.getElementById('catalogueImageModalImg')
  const catalogueImageModalTitle = document.getElementById('catalogueImageModalTitle')
  const catalogueImageModalSpecs = document.getElementById('catalogueImageModalSpecs')
  const catalogueImageModalSpecsEmpty = document.getElementById('catalogueImageModalSpecsEmpty')
  const catalogueImageModalContactBtn = document.getElementById('catalogueImageModalContactBtn')
  const catalogueImageModalFavouriteBtn = document.getElementById('catalogueImageModalFavouriteBtn')
  const catalogueImageModalClose = document.getElementById('catalogueImageModalClose')
  const catalogueCardsRootForModal = document.querySelector('.catalogue-new-cards')

  if (
    catalogueImageModal &&
    catalogueImageModalImg &&
    catalogueImageModalTitle &&
    catalogueImageModalSpecs &&
    catalogueImageModalSpecsEmpty &&
    catalogueImageModalContactBtn &&
    catalogueImageModalFavouriteBtn &&
    catalogueCardsRootForModal
  ) {
    initCatalogImageModal({
      modal: catalogueImageModal,
      image: catalogueImageModalImg,
      title: catalogueImageModalTitle,
      specs: catalogueImageModalSpecs,
      specsEmpty: catalogueImageModalSpecsEmpty,
      contactBtn: catalogueImageModalContactBtn,
      favouriteBtn: catalogueImageModalFavouriteBtn,
      closeBtn: catalogueImageModalClose,
      cardsRoot: catalogueCardsRootForModal,
    }, {
      lockScroll: typeof lockScroll === 'function' ? lockScroll : undefined,
      unlockScroll: typeof unlockScroll === 'function' ? unlockScroll : undefined,
    })
  }
}
