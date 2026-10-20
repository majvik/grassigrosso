import {
  initCatalogExclusiveAccordionState,
  openCatalogAccordionGroupExclusive,
  setCatalogAccordionGroupExpanded,
} from './catalog-accordion'
import {
  fetchCatalogFilters,
  getCatalogProductsFeed,
  getCatalogProductsFullFeed,
  getLastCatalogListingSections,
  type CatalogFilterGroups,
  type CatalogProduct,
} from './catalog-api'
import { buildCatalogueCardHtml } from './catalog-card'
import {
  buildCatalogListingSectionsHtml,
  normalizeCatalogListingSections,
} from './catalog-listing-sections'
import {
  buildCatalogCardMetaFromProduct,
  buildCatalogProductListingEntries,
  type CatalogProductListingEntry,
} from './catalog-product-meta'
import { setCatalogProductStore } from './catalog-product-store'
import {
  buildCatalogProductMediaHtml,
  destroyCatalogProductGalleries,
  getActiveSlideSnapshot,
  getCatalogGalleryActiveIndex,
  initCatalogProductGalleries,
  readGalleryFromElement,
  setCatalogGalleryActiveIndex,
  syncVisibleCatalogCardMediaLoading,
} from './catalog-product-gallery'
import { observeCatalogMediaHosts } from './catalog-media-load-queue'
import { readCatalogueCardMeta } from './catalog-card-meta'
import { readCatalogFavourites, writeCatalogFavourites } from './catalog-favourites'
import { buildCatalogModalSpecGroups } from './catalog-modal'
import { buildSharedProductSpecSegmentsHtml, initCatalogSpecSegments } from './catalog-spec-segments'
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
  collectCatalogPriceBounds,
  isCatalogPriceFilterActive,
  type CatalogPriceBounds,
} from './catalog-price'
import {
  applyCatalogPriceBoundsToState,
  bindCatalogPriceFilter,
  resetCatalogPriceFilter,
  syncCatalogPriceFilterUi,
} from './catalog-price-filter'
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
  flashCatalogShareLinkCopiedLabel,
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

type CatalogSmartFilterGroup = 'collection' | 'size' | 'firmness' | 'type' | 'loadRange' | 'heightRange' | 'fillings' | 'features'
type CatalogQuizAnswers = Partial<Record<string, string>>
type CatalogSmartFiltersEvent = CustomEvent<{
  filters?: Partial<Record<CatalogSmartFilterGroup, string[]>>
  queryText?: string
  quizAnswers?: CatalogQuizAnswers
}>

// Earlier groups are relaxed first. Physical fit and safe load are deliberately
// kept longer than preferences such as collection, filling or mattress height.
const SMART_FILTER_RELAXATION_ORDER: CatalogSmartFilterGroup[] = [
  'heightRange',
  'fillings',
  'features',
  'collection',
  'type',
  'firmness',
  'loadRange',
  'size',
]

const SMART_UNSAFE_LOAD_PENALTY = 1200
const SMART_EXPLICIT_SIZE_MISS_PENALTY = 700
const SMART_FIRMNESS_DISTANCE_PENALTY = 70
const SMART_RECOMMENDED_BONUS = 12
const SMART_RESULTS_LIMIT = 9

const DIRECT_SEARCH_STOP_WORDS = new Set([
  'матрас', 'матраса', 'матрасе', 'нужен', 'нужна', 'хочу', 'ищу', 'модель', 'пеной', 'пена', 'слой', 'слоя', 'состав', 'есть', 'мне', 'для',
])

function normalizeSearchLexicon(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/эволюшен/g, 'evolution')
    .replace(/релакс/g, 'relax')
    .replace(/элакс(?:ом|а|е)?/g, 'elax')
    .replace(/флекси/g, 'flexi')
    .replace(/мемори/g, 'memory')
    .replace(/эвер\s+фоам/g, 'ever foam')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim()
}

function stemSearchToken(token: string): string {
  if (/^[a-z0-9]+$/.test(token)) return token
  return token.length > 6 ? token.replace(/(?:иями|ями|ами|ого|ему|ому|ыми|ими|ой|ый|ий|ая|яя|ое|ее|ом|ем|ах|ях|ов|ев|а|я|ы|и)$/u, '') : token
}

function tokenizeSearchLexicon(value: unknown): Set<string> {
  return new Set(
    normalizeSearchLexicon(value)
      .split(/\s+/)
      .map(stemSearchToken)
      .filter((token) => token.length >= 4 && !DIRECT_SEARCH_STOP_WORDS.has(token)),
  )
}

function scoreDirectProductMatch(meta: CatalogCardMeta<HTMLElement>, queryText: string): number {
  const query = normalizeSearchLexicon(queryText)
  if (!query) return 0
  const name = normalizeSearchLexicon(meta.name)
  const slug = normalizeSearchLexicon(meta.slug.replace(/-/g, ' '))
  let score = 0
  const fullNameMatch = (name.length >= 4 && query.includes(name)) || (slug.length >= 4 && query.includes(slug))
  if (fullNameMatch) score += 500
  else {
    const queryTokens = tokenizeSearchLexicon(query)
    const productTokens = new Set([...tokenizeSearchLexicon(name), ...tokenizeSearchLexicon(slug)])
    if ([...queryTokens].some((token) => productTokens.has(token))) score += 250
  }

  const layerText = normalizeSearchLexicon(meta.layers.join(' '))
  const componentMatches = new Set<string>()
  const addComponent = (key: string, queryPattern: RegExp, layerPattern: RegExp) => {
    if (queryPattern.test(query) && layerPattern.test(layerText)) componentMatches.add(key)
  }
  addComponent('1000-springs', /1000\s+пруж|мультипокет|много\s+пруж/, /1000\s+пруж/)
  addComponent('bicotton', /бикоттон/, /бикоттон/)
  addComponent('elax', /\belax\b/, /\belax\b/)
  addComponent('flexi', /\bflexi\b/, /\bflexi\b/)
  addComponent('felt', /войлок/, /войлок/)
  addComponent('euroframe', /еврокаркас/, /еврокаркас/)
  addComponent('memory', /memory|эффект\s+памят/, /memory|эффект\s+памят/)
  addComponent('coir-20', /20\s*мм\s+кокос|кокос[^0-9]{0,12}20\s*мм/, /кокос[^0-9]{0,12}20\s*мм/)

  const queryTokens = tokenizeSearchLexicon(query)
  const layerTokens = tokenizeSearchLexicon(layerText)
  for (const token of queryTokens) {
    if (layerTokens.has(token)) componentMatches.add(`token:${token}`)
  }
  score += componentMatches.size * 75

  const descriptionTokens = tokenizeSearchLexicon(meta.description)
  if ([...queryTokens].some((token) => descriptionTokens.has(token))) score += 25
  return score
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
  const catalogueNewResultsDefault = queryElement<HTMLElement>(documentRef, '[data-catalog-results-default]')
  const catalogueNewResultsSmart = queryElement<HTMLElement>(documentRef, '[data-catalog-results-smart]')
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
  let productCatalog: CatalogProductListingEntry[] | null = null
  let smartPreferenceState: CatalogFilterState | null = null
  let smartQueryText = ''
  let smartQuizAnswers: CatalogQuizAnswers = {}
  let visibleCardsLimit = CATALOGUE_PAGE_SIZE
  let matchedCards: HTMLElement[] = []
  let matchedResultsCount = 0
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
    '<p>По выбранным параметрам точных совпадений нет.<br />Попробуйте изменить один из фильтров.</p>' +
    '<button type="button" class="catalogue-new-empty-reset-btn" data-catalog-empty-reset hidden>Сбросить фильтр</button>'
  catalogueNewCardsRoot.insertAdjacentElement('afterend', emptyStateEl)
  const loadErrorEl = documentRef.createElement('div')
  loadErrorEl.className = 'catalogue-new-load-error'
  loadErrorEl.hidden = true
  loadErrorEl.innerHTML =
    '<p>Каталог временно недоступен. Проверьте соединение и попробуйте снова.</p>' +
    '<button type="button" class="btn-primary-large" data-catalog-load-retry>Повторить</button>'
  catalogueNewCardsRoot.insertAdjacentElement('afterend', loadErrorEl)
  const loadErrorRetryBtn = queryElement<HTMLButtonElement>(loadErrorEl, '[data-catalog-load-retry]')
  const emptyStateResetBtn = queryElement<HTMLButtonElement>(emptyStateEl, '[data-catalog-empty-reset]')
  let emptyStateResetClickCount = 0
  const state: CatalogFilterState = {
    collection: new Set<string>(),
    firmness: new Set<string>(),
    type: new Set<string>(),
    size: new Set<string>(),
    loadRange: new Set<string>(),
    heightRange: new Set<string>(),
    fillings: new Set<string>(),
    features: new Set<string>(),
    priceMin: null,
    priceMax: null,
    sort: 'default',
    favouritesOnly: false,
  }
  let priceBounds: CatalogPriceBounds | null = null

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

  function setCatalogCardsGridLoading(isLoading: boolean): void {
    cardsRootEl.classList.toggle('catalogue-new-cards--loading', isLoading)
    if (isLoading) {
      cardsRootEl.setAttribute('aria-busy', 'true')
      return
    }
    cardsRootEl.removeAttribute('aria-busy')
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

  function getFilterMeta(): CatalogCardMeta<HTMLElement>[] {
    return productCatalog ? productCatalog.map((entry) => entry.meta) : cardMeta
  }

  function updateCardsCache() {
    cards = queryElements<HTMLElement>(cardsRootEl, '.catalogue-new-card')
    if (productCatalog) {
      const cardBySlug = new Map(
        cards.map((card) => [String(card.dataset.productSlug || '').trim(), card] as const),
      )
      productCatalog.forEach((entry) => {
        const card = cardBySlug.get(entry.meta.slug) || null
        entry.meta.card = card as HTMLElement
      })
      cardMeta = cards.map((card, index) => {
        card.dataset.initialOrder = String(index)
        return readCatalogueCardMeta(card, index)
      })
    } else {
      cardMeta = cards.map((card, index) => {
        card.dataset.initialOrder = String(index)
        return readCatalogueCardMeta(card, index)
      })
    }
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
    const hasSmartSelection = Boolean(smartPreferenceState && !isSharedFavouritesView && !isSharedProductView)
    if (catalogueNewResultsDefault) catalogueNewResultsDefault.hidden = hasSmartSelection
    if (catalogueNewResultsSmart) catalogueNewResultsSmart.hidden = !hasSmartSelection
    if (!hasSmartSelection && catalogueNewResultsValue) {
      catalogueNewResultsValue.textContent = String(matchedResultsCount)
    }

    const defaultSortOption = catalogueNewSortOptions.find((option) => option.dataset.value === 'default')
    if (defaultSortOption) {
      defaultSortOption.textContent = hasSmartSelection
        ? 'Сортировка по соответствию'
        : 'Сортировка по умолчанию'
    }
    if (state.sort === 'default') {
      setCatalogActiveSortOption(sortMenuElements, 'default')
    }
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
      priceMin: source.priceMin,
      priceMax: source.priceMax,
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
    getFilterMeta().forEach((meta) => {
      if (matchesCatalogCardMeta(meta, candidateState, favSet, priceBounds)) count += 1
    })
    return count
  }

  function getSmartRequiredLoad(query: string): number {
    const requestedWeights = [...query.matchAll(/(\d{2,3})\s*кг/g)]
      .map((match) => Number(match[1]))
      .filter((value) => value >= 30 && value <= 250)
    const adaptiveWeight = smartQuizAnswers.single_weight || smartQuizAnswers.couple_weight || smartQuizAnswers.parent_child_weight || ''
    const quizRequiredLoad = smartQuizAnswers.weight === '90–120 кг' || ['90to120', '95to120'].includes(adaptiveWeight)
      ? 135
      : smartQuizAnswers.weight === 'Больше 120 кг' || ['over120', 'heavyOrTall'].includes(adaptiveWeight) ? 160 : 0
    return Math.max(quizRequiredLoad, ...requestedWeights, 0)
  }

  function scoreSmartMatch(meta: CatalogCardMeta<HTMLElement>, preferences: CatalogFilterState): number {
    let score = scoreDirectProductMatch(meta, smartQueryText)
    const query = smartQueryText.toLowerCase().replace(/ё/g, 'е')
    const wantsTopper = /на\s+диван|тонк[^.;,]{0,12}матрас|выровн[^.;,]{0,20}стык|топп?ер/.test(query)
    const isTopper = meta.type === 'topper' || meta.collection === 'topper'
    score += wantsTopper ? (isTopper ? 200 : -200) : (isTopper ? -200 : 200)

    if (preferences.size.size) {
      const sizeMatches = [...preferences.size].some((value) => meta.sizes.has(value))
      score += sizeMatches ? 100 : 0
      const explicitSizes = [...query.matchAll(/\b(\d{2,3})\s*[xх×]\s*(190|200)\b/g)].map((match) => `${match[1]}x${match[2]}`)
      if (explicitSizes.length && !explicitSizes.some((value) => meta.sizes.has(value))) score -= SMART_EXPLICIT_SIZE_MISS_PENALTY
      if (/рост\s*(?:выше|более|от)?\s*19\d|высок/.test(query) && ![...meta.sizes].some((value) => value.endsWith('x200'))) score -= 300
    }
    const hasLength200 = [...meta.sizes].some((value) => value.endsWith('x200'))
    if (smartQuizAnswers.height === '170–190 см' && hasLength200) score += 40
    if (smartQuizAnswers.height === '170–190 см' && smartQuizAnswers.gender === 'Мужской' && hasLength200) score += 15
    if (smartQuizAnswers.height === 'Выше 190 см') score += hasLength200 ? 100 : -60
    const needsLength200 = ['tall', 'tallBackPain', 'athletic'].includes(smartQuizAnswers.single_health || '')
      || smartQuizAnswers.couple_comfort === 'tall'
      || smartQuizAnswers.parent_child_weight === 'heavyOrTall'
      || smartQuizAnswers.child_age_bed === 'tallTeen'
    if (needsLength200) score += hasLength200 ? 100 : -80

    const requestedWeights = [...query.matchAll(/(\d{2,3})\s*кг/g)].map((match) => Number(match[1])).filter((value) => value >= 30 && value <= 250)
    const requiredLoad = getSmartRequiredLoad(query)
    if (requiredLoad) {
      score += meta.load >= requiredLoad ? 100 : -SMART_UNSAFE_LOAD_PENALTY
    } else if (preferences.loadRange.size) {
      score += preferences.loadRange.has(meta.loadRange) ? 85 : 0
    }

    if (preferences.firmness.size) {
      const sides = [meta.firmnessSide1, meta.firmnessSide2]
        .filter((value): value is number => Number.isInteger(value))
      const preferredFirmness = [...preferences.firmness]
      const finalFirmness = smartQuizAnswers.final_firmness
      const quizFirmnessRange: [number, number] | null = smartQuizAnswers.firmness === 'Помягче' || finalFirmness === 'soft'
        ? [3.5, 5]
        : smartQuizAnswers.firmness === 'Средняя' || finalFirmness === 'medium'
          ? [5, 6]
          : smartQuizAnswers.firmness === 'Пожёстче' || finalFirmness === 'hard'
            ? [6, 7.5]
            : smartQuizAnswers.firmness === 'Не знаю' || finalFirmness === 'dual' ? [5, 6.5] : null
      if (sides.length && quizFirmnessRange) {
        const distanceToRange = (value: number) => value < quizFirmnessRange[0]
          ? quizFirmnessRange[0] - value
          : value > quizFirmnessRange[1] ? value - quizFirmnessRange[1] : 0
        const adaptiveWeight = smartQuizAnswers.single_weight || smartQuizAnswers.couple_weight || smartQuizAnswers.parent_child_weight || ''
        const weightOffset = smartQuizAnswers.weight === 'До 60 кг' || adaptiveWeight === 'under65' ? -0.5 : smartQuizAnswers.weight === '90–120 кг' || smartQuizAnswers.weight === 'Больше 120 кг' || ['90to120', '95to120', 'over120', 'heavyOrTall'].includes(adaptiveWeight) ? 0.5 : 0
        const sideDistances = sides.map((value) => distanceToRange(value - weightOffset))
        const distance = smartQuizAnswers.firmness === 'Не знаю' || finalFirmness === 'dual'
          ? sideDistances.reduce((sum, value) => sum + value, 0) / sideDistances.length
          : Math.min(...sideDistances)
        score += 100 - distance * distance * SMART_FIRMNESS_DISTANCE_PENALTY
        if ((smartQuizAnswers.firmness === 'Не знаю' || finalFirmness === 'dual') && sides.length === 2 && sides[0] !== sides[1]) score += 50
      } else if (sides.length && preferences.firmness.has('dualFirmness') && sides.length === 2) {
        const low = Math.min(...sides)
        const high = Math.max(...sides)
        score += Math.max(0, 80 - (Math.abs(low - 5) + Math.abs(high - 7)) * 8)
      } else if (sides.length) {
        const targetByFirmness: Record<string, number> = { soft: 3, medium: 5, hard: 7 }
        const targets = preferredFirmness.map((value) => targetByFirmness[value]).filter(Number.isFinite)
        const distance = targets.length
          ? Math.min(...sides.flatMap((side) => targets.map((target) => Math.abs(side - target))))
          : Number.POSITIVE_INFINITY
        score += Number.isFinite(distance) ? 100 - distance * distance * SMART_FIRMNESS_DISTANCE_PENALTY : 0
      } else if (preferences.firmness.has(meta.firmness)) {
        score += preferredFirmness.indexOf(meta.firmness) === 0 ? 80 : 65
      } else if (preferences.firmness.has('soft') && meta.firmness === 'medium') {
        score += 50
      }
    }

    if (preferences.type.size) score += preferences.type.has(meta.type) ? 40 : 0
    if (preferences.collection.size) score += preferences.collection.has(meta.collection) ? 25 : 0
    if (preferences.heightRange.size) score += preferences.heightRange.has(meta.heightRange) ? 30 : 0

    const explicitFillingValues = new Set<string>()
    if (/эффект(?:ом|а)?\s+памят|memory/.test(query)) explicitFillingValues.add('memoryEffect')
    if (/латекс/.test(query)) explicitFillingValues.add('latex')
    if (/кокос|койр/.test(query)) explicitFillingValues.add('coir')
    if (/форплит/.test(query)) explicitFillingValues.add('forplit')
    if (/нанопен/.test(query)) explicitFillingValues.add('nanoFoam')
    if (/ортопедическ[^.;,]{0,8}пен/.test(query)) explicitFillingValues.add('orthoFoam')
    const fillingMatches = [...preferences.fillings].filter((value) => meta.fillings.has(value)).length
    if (explicitFillingValues.size) score += [...explicitFillingValues].some((value) => meta.fillings.has(value)) ? 60 : -60
    else score += Math.min(50, fillingMatches * 30)

    const explicitFeatureValues = new Set<string>()
    if (/съемн[^.;,]{0,12}чехол/.test(query)) explicitFeatureValues.add('removableCover')
    if (/зима[- ]лето/.test(query)) explicitFeatureValues.add('winterSummer')
    if (/усиленн[^.;,]{0,12}(?:край|борт)/.test(query)) explicitFeatureValues.add('edgeSupport')
    if (/две\s+сторон|разн[^.;,]{0,16}жестк[^.;,]{0,16}сторон/.test(query)) explicitFeatureValues.add('dualFirmness')
    const featureMatches = [...preferences.features].filter((value) => meta.features.has(value)).length
    if (explicitFeatureValues.size) score += [...explicitFeatureValues].some((value) => meta.features.has(value)) ? 50 : -50
    else score += Math.min(45, featureMatches * 25)

    const sideSleep = /(?:сплю|спим|спит|сон)[^.;,]{0,24}на\s+боку|болят?[^.;,]{0,20}(?:плеч|сустав)/.test(query)
    const hasComfortLayer = ['memoryEffect', 'latex', 'nanoFoam', 'orthoFoam'].some((value) => meta.fillings.has(value))
    if (sideSleep && meta.fillings.has('coir') && !hasComfortLayer) score -= 50

    const needsEasyRise = /пожил|пенсионер|бол(?:ит|ят)[^.;,]{0,24}(?:спин|поясниц)/.test(query)
    const heavySleeper = requestedWeights.some((value) => value >= 100)
    const childBed = /детск(?:ая|ую|ой)\s+кроват|подростк|для\s+ребенк/.test(query)
    if ((needsEasyRise || heavySleeper) && meta.heightRange === 'low') score -= 30
    if (childBed && meta.heightRange === 'high') score -= 30
    if (smartQuizAnswers.sleepers === 'Взрослый с ребёнком' || smartQuizAnswers.step_target === 'parentWithChild' || smartQuizAnswers.step_target === 'childOnly') {
      const scores = [meta.firmnessSide1, meta.firmnessSide2].filter((value): value is number => Number.isInteger(value))
      if (scores.length && Math.max(...scores) < 5) score -= 60
    }
    if ((smartQuizAnswers.weight === 'До 60 кг' || smartQuizAnswers.single_weight === 'under65') && meta.fillings.has('coir') && !hasComfortLayer) score -= 50
    if (meta.recommended) score += SMART_RECOMMENDED_BONUS
    return score
  }

  function getProtectedSmartFilterGroups(): Set<CatalogSmartFilterGroup> {
    const query = smartQueryText.toLowerCase().replace(/ё/g, 'е')
    const protectedGroups = new Set<CatalogSmartFilterGroup>()
    if (/на\s+диван|тонк[^.;,]{0,12}матрас|выровн[^.;,]{0,20}стык|топп?ер/.test(query)) {
      protectedGroups.add('type')
      protectedGroups.add('collection')
    }
    if (smartQuizAnswers.final_firmness === 'dual' || /две\s+(?:разн(?:ые|ой)\s+)?сторон|две\s+сторон[^.;,]{0,24}разн[^.;,]{0,12}жестк|разн[^.;,]{0,16}жестк[^.;,]{0,16}сторон/.test(query)) {
      protectedGroups.add('firmness')
      protectedGroups.add('features')
    }
    return protectedGroups
  }

  function matchesSmartHardConstraints(meta: CatalogCardMeta<HTMLElement>): boolean {
    const query = smartQueryText.toLowerCase().replace(/ё/g, 'е')
    const wantsTopper = /на\s+диван|тонк[^.;,]{0,12}матрас|выровн[^.;,]{0,20}стык|топп?ер/.test(query)
    if (wantsTopper && meta.type !== 'topper' && meta.collection !== 'topper') return false
    if (/беспружин/.test(query) && meta.type !== 'nospring') return false

    const explicitWidth = query.match(/ширин[^.;,]{0,12}(140|160|180)\s*см/)
    if (explicitWidth && ![...meta.sizes].some((size) => size.startsWith(`${explicitWidth[1]}x`))) return false

    const requiredLoad = getSmartRequiredLoad(query)
    if (requiredLoad && meta.load < requiredLoad) return false

    const wantsDual = smartQuizAnswers.final_firmness === 'dual'
      || /две\s+(?:разн(?:ые|ой)\s+)?сторон|две\s+сторон[^.;,]{0,24}разн[^.;,]{0,12}жестк|разн[^.;,]{0,16}жестк[^.;,]{0,16}сторон/.test(query)
    if (wantsDual) {
      const sides = [meta.firmnessSide1, meta.firmnessSide2].filter((value): value is number => Number.isInteger(value))
      if (sides.length !== 2 || sides[0] === sides[1]) return false
    }
    return true
  }

  function resolveNearestSmartFilterState(): void {
    const favSet = readCatalogFavourites()
    const meta = getFilterMeta()
    const protectedGroups = getProtectedSmartFilterGroups()

    // `soft` is a valid user preference, but the current CMS catalogue has no
    // literal soft products. Medium is the closest ordered firmness value.
    if (
      state.firmness.size === 1 &&
      state.firmness.has('soft') &&
      !meta.some((item) => item.firmness === 'soft') &&
      meta.some((item) => item.firmness === 'medium')
    ) {
      state.firmness.clear()
      state.firmness.add('medium')
    }

    while (countMatchesWithState(state, favSet) === 0) {
      const activeGroups = SMART_FILTER_RELAXATION_ORDER.filter((group) => state[group].size > 0 && !protectedGroups.has(group))
      if (activeGroups.length === 0) break

      let selectedGroup: CatalogSmartFilterGroup | null = null
      for (const group of activeGroups) {
        const candidateState = cloneFilterState(state)
        candidateState[group].clear()
        const count = countMatchesWithState(candidateState, favSet)
        if (count > 0) {
          selectedGroup = group
          break
        }
      }
      // If one relaxation is not enough, remove the least important active
      // group and repeat. This keeps size/load constraints until last.
      state[selectedGroup || activeGroups[0]].clear()
    }
  }

  function getBestZeroResultsResetGroup(favSet: Set<string>): string | null {
    if (isSharedFavouritesView || isSharedProductView || matchedResultsCount > 0) return null
    let bestGroup: string | null = null
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
    if (isCatalogPriceFilterActive(state.priceMin, state.priceMax, priceBounds)) {
      const candidateState = cloneFilterState(state)
      resetCatalogPriceFilter(candidateState, priceBounds)
      const count = countMatchesWithState(candidateState, favSet)
      if (count > bestCount) {
        bestGroup = 'price'
        bestCount = count
      }
    }
    return bestGroup
  }

  function refreshPriceBoundsFromCatalog(options: { resetSelection?: boolean } = {}): void {
    if (!productCatalog) {
      priceBounds = null
      applyCatalogPriceBoundsToState(state, null, { resetSelection: true })
      return
    }
    const next = collectCatalogPriceBounds(
      productCatalog.map((entry) => entry.product.priceRub ?? entry.meta.price),
    )
    const hadBounds = Boolean(priceBounds)
    priceBounds = next
    applyCatalogPriceBoundsToState(state, priceBounds, {
      resetSelection: options.resetSelection === true || !hadBounds,
    })
  }

  function syncEmptyStateResetButton(favSet: Set<string>): void {
    if (!emptyStateResetBtn) return
    const group = getBestZeroResultsResetGroup(favSet)
    if (!group) {
      emptyStateResetBtn.hidden = true
      emptyStateResetBtn.removeAttribute('data-filter-group')
      return
    }
    emptyStateResetBtn.hidden = false
    emptyStateResetBtn.dataset.filterGroup = group
    const label = emptyStateResetClickCount > 0 ? 'Сбросить ещё' : 'Сбросить фильтр'
    emptyStateResetBtn.textContent = label
    emptyStateResetBtn.setAttribute('aria-label', label)
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

    const cardMedia = card.querySelector<HTMLElement>('[data-catalog-card-media]')
    const snapshot = getActiveSlideSnapshot(cardMedia)
    const gallery = readGalleryFromElement(cardMedia)
    const title = card.querySelector('.catalogue-new-card-body h3')?.textContent?.trim() || snapshot?.alt || 'Матрас'
    const specGroups = buildCatalogModalSpecGroups(card.dataset)
    const tags = [...card.querySelectorAll('.catalogue-new-tags > .catalogue-new-tag')]
      .map((tag) => tag.textContent?.trim())
      .filter((tag): tag is string => Boolean(tag))
    const slug = String(card.dataset.productSlug || sharedState.slug).trim()
    const specsHtml = buildSharedProductSpecSegmentsHtml(specGroups.main, specGroups.details)
    const tagsHtml = tags.length
      ? `<div class="catalogue-new-shared-product-tags catalogue-new-tags">${tags.map((tag) => `<span class="catalogue-new-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
      : ''

    sharedProductSection.hidden = false
    sharedProductSection.innerHTML = `
      <a class="catalogue-new-shared-back" href="/catalog">Назад в каталог</a>
      <div class="catalogue-new-shared-product-shell">
        ${buildCatalogProductMediaHtml(gallery, {
          rootClass: 'catalogue-new-shared-product-media catalogue-new-card-media',
          productSlug: slug,
        })}
        <div class="catalogue-new-shared-product-info">
          <h1 class="catalogue-new-shared-product-title">${escapeHtml(title)}</h1>
          ${specsHtml}
          ${tagsHtml}
          <div class="catalogue-new-shared-product-actions catalogue-new-image-modal-actions">
            <div class="catalogue-new-image-modal-actions-row">
              <button type="button" class="catalogue-new-image-modal-action catalogue-new-manager-contact-btn" data-shared-product-contact>Связаться с менеджером по позиции</button>
              <button type="button" class="catalogue-new-image-modal-favourite" data-shared-product-favourite aria-pressed="false" aria-label="Добавить в избранное">
                <img class="catalogue-new-image-modal-favourite-icon--empty" src="/icons/favourite-empty.svg" alt="" aria-hidden="true" />
                <img class="catalogue-new-image-modal-favourite-icon--full" src="/icons/favourite-full.svg" alt="" aria-hidden="true" />
              </button>
            </div>
            <div class="catalogue-new-favourites-share-cluster catalogue-new-image-modal-share-row">
              <button type="button" class="catalogue-new-favourites-share-link-btn" data-shared-product-share aria-label="Скопировать ссылку">
                <span class="catalogue-new-favourites-share-link-label">Скопировать ссылку</span>
                <span class="catalogue-new-favourites-share-link-icon" aria-hidden="true">
                  <img class="catalogue-new-favourites-share-icon--default" src="/icons/share-default.svg" alt="" />
                  <img class="catalogue-new-favourites-share-icon--hover" src="/icons/share-hover.svg" alt="" />
                  <img class="catalogue-new-favourites-share-icon--copied" src="/icons/share-copied.svg" alt="" />
                </span>
              </button>
              <button
                type="button"
                class="catalogue-new-favourites-share-help-trigger"
                data-filter-help-open="productShare"
                aria-haspopup="dialog"
                aria-label="Подсказка про ссылку на позицию"
              >
                <span class="catalogue-new-filter-help-icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"></circle>
                    <path d="M12 10v5M12 8v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `

    const favBtn = sharedProductSection.querySelector<HTMLButtonElement>('[data-shared-product-favourite]')
    if (favBtn) syncSharedProductFavouriteButton(favBtn, slug)
    if (sharedProductSection) {
      initCatalogProductGalleries(sharedProductSection, { lazyBind: false })
      observeCatalogMediaHosts(sharedProductSection)
      const specSegments = sharedProductSection.querySelector<HTMLElement>('[data-catalog-spec-segments]')
      if (specSegments) initCatalogSpecSegments(specSegments)
      const sharedMedia = sharedProductSection.querySelector<HTMLElement>('[data-catalog-card-media]')
      const cardMediaEl = card.querySelector<HTMLElement>('[data-catalog-card-media]')
      if (sharedMedia && cardMediaEl) {
        setCatalogGalleryActiveIndex(sharedMedia, getCatalogGalleryActiveIndex(cardMediaEl))
      }
    }
  }

  function applySorting() {
    if (productCatalog) return
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
    syncCatalogPriceFilterUi(sidebarEl, state, priceBounds)
  }

  function syncFilterOptionsFromCards() {
    const filterMeta = getFilterMeta()
    if (!filterMeta.length) return
    const available = collectAvailableCatalogFilters(filterMeta)
    applyAvailableFilterOptions(sidebarEl, state, available)
    syncUiFromState()
  }

  function syncFilterDependencies() {
    syncCatalogFilterDependencies(sidebarEl, state)
  }

  function applyFilters() {
    const favSet = readCatalogFavourites()
    const hasSmartSelection = Boolean(smartPreferenceState && !isSharedFavouritesView && !isSharedProductView)
    matchedCards = []

    if (productCatalog) {
      let matchedEntries = productCatalog.filter((entry) => {
        if (isSharedFavouritesView) {
          return Boolean(entry.meta.slug && sharedSlugs.has(entry.meta.slug))
        }
        if (hasSmartSelection) return matchesSmartHardConstraints(entry.meta)
        return matchesCatalogCardMeta(entry.meta, state, favSet, priceBounds)
      })
      if (hasSmartSelection && smartPreferenceState) {
        const smartPreferences = smartPreferenceState
        matchedEntries.sort((a, b) => {
          const scoreDifference = scoreSmartMatch(b.meta, smartPreferences) - scoreSmartMatch(a.meta, smartPreferences)
          if (scoreDifference !== 0) return scoreDifference
          return compareCatalogCardMeta(a.meta, b.meta, 'default')
        })
        matchedEntries = matchedEntries.slice(0, SMART_RESULTS_LIMIT)
        if (state.sort !== 'default') {
          matchedEntries.sort((a, b) => compareCatalogCardMeta(a.meta, b.meta, state.sort))
        }
      } else {
        matchedEntries.sort((a, b) => compareCatalogCardMeta(a.meta, b.meta, state.sort))
      }
      matchedResultsCount = matchedEntries.length

      const useSections = !isSharedFavouritesView && !isSharedProductView && !hasSmartSelection
      destroyCatalogProductGalleries(cardsRootEl)

      if (hasSmartSelection) {
        const selectedProducts = new Set(matchedEntries.map((entry) => entry.product))
        const remainingEntries = productCatalog.filter((entry) => !selectedProducts.has(entry.product))
        if (state.sort !== 'default') {
          remainingEntries.sort((a, b) => compareCatalogCardMeta(a.meta, b.meta, state.sort))
        }
        cardsRootEl.classList.add('has-listing-sections')
        cardsRootEl.innerHTML = buildCatalogListingSectionsHtml(
          matchedEntries.map((entry) => entry.product),
          remainingEntries.map((entry) => entry.product),
          {
            recommendedTitle: 'Результаты подбора',
            recommendedSubtitle: '',
            allProductsTitle: 'Все позиции',
          },
        )
      } else if (useSections) {
        const recommendedEntries = matchedEntries.filter((entry) => entry.meta.recommended)
        const restEntries = matchedEntries.filter((entry) => !entry.meta.recommended)
        const visibleRest = restEntries.slice(0, visibleCardsLimit)
        const sections = normalizeCatalogListingSections(getLastCatalogListingSections())
        cardsRootEl.classList.add('has-listing-sections')
        cardsRootEl.innerHTML = buildCatalogListingSectionsHtml(
          recommendedEntries.map((entry) => entry.product),
          visibleRest.map((entry) => entry.product),
          sections,
        )
      } else {
        const limit = isSharedFavouritesView ? Number.MAX_SAFE_INTEGER : visibleCardsLimit
        const visibleEntries = matchedEntries.slice(0, limit)
        cardsRootEl.classList.remove('has-listing-sections')
        cardsRootEl.innerHTML = visibleEntries.map((entry) => buildCatalogueCardHtml(entry.product)).join('')
      }

      updateCardsCache()
      matchedCards = [...cards]
    } else {
      cardMeta.forEach((meta) => {
        if (isSharedFavouritesView) {
          if (meta.slug && sharedSlugs.has(meta.slug)) matchedCards.push(meta.card)
          return
        }
        if (matchesCatalogCardMeta(meta, state, favSet, priceBounds)) matchedCards.push(meta.card)
      })
      matchedResultsCount = matchedCards.length

      const limit = isSharedFavouritesView ? Number.MAX_SAFE_INTEGER : visibleCardsLimit
      const visibleSet = new Set(matchedCards.slice(0, limit))
      cards.forEach((card) => {
        card.style.display = visibleSet.has(card) ? '' : 'none'
      })
      matchedCards = matchedCards.filter((card) => visibleSet.has(card))
    }

    if (catalogueNewFavouritesBackRow) {
      catalogueNewFavouritesBackRow.hidden = !state.favouritesOnly
    }
    if (catalogueNewFavouritesActions) {
      const shouldShowFavouritesAction = isSharedFavouritesView || (state.favouritesOnly && readCatalogFavourites().size > 0)
      catalogueNewFavouritesActions.hidden = !shouldShowFavouritesAction
    }
    if (isSharedFavouritesView) {
      if (catalogueNewFavouritesContactBtn) catalogueNewFavouritesContactBtn.disabled = matchedResultsCount === 0
      if (catalogueNewFavouritesShareBtn) catalogueNewFavouritesShareBtn.disabled = matchedResultsCount === 0
    }

    const isEmptyNormalCatalogue = !isSharedFavouritesView && !isSharedProductView && matchedResultsCount === 0
    if (!isEmptyNormalCatalogue) {
      emptyStateResetClickCount = 0
    }
    emptyStateEl.hidden = !isEmptyNormalCatalogue
    cardsRootEl.classList.toggle('is-empty', isEmptyNormalCatalogue)
    const zeroResultsResetGroup = isEmptyNormalCatalogue ? getBestZeroResultsResetGroup(favSet) : null
    syncCatalogZeroResultsHint(sidebarEl, zeroResultsResetGroup)
    syncEmptyStateResetButton(favSet)
    const restMatchedCount = hasSmartSelection
      ? matchedResultsCount
      : productCatalog
      ? productCatalog.filter((entry) => {
          if (isSharedFavouritesView || isSharedProductView) return false
          if (!matchesCatalogCardMeta(entry.meta, state, favSet, priceBounds)) return false
          return !entry.meta.recommended
        }).length
      : matchedResultsCount
    const infiniteLimitBase =
      productCatalog && !isSharedFavouritesView && !isSharedProductView
        ? restMatchedCount
        : matchedResultsCount
    infiniteSentinel.hidden =
      hasSmartSelection || isSharedFavouritesView || isSharedProductView || infiniteLimitBase <= visibleCardsLimit
    updateResultsCount()
    renderSharedProductView()
    syncVisibleCatalogCardMediaLoading(cardsRootEl)
    initCatalogProductGalleries(cardsRootEl, { lazyBind: true })
    observeCatalogMediaHosts(cardsRootEl)
    syncCatalogFavouriteButtons(cardsRootEl, favSet)
    scheduleStickySidebarSync()
  }

  function resetCatalogueNewFilterChipsAndSort() {
    smartQueryText = ''
    smartQuizAnswers = {}
    smartPreferenceState = null
    resetCatalogFilterState(state, priceBounds)
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
    const wasEmptyCatalogue =
      !isSharedFavouritesView && !isSharedProductView && matchedResultsCount === 0
    if (groupName === 'price') {
      resetCatalogPriceFilter(state, priceBounds)
    } else {
      const group = ZERO_RESULTS_FILTER_GROUPS.find((item) => item === groupName)
      if (!group) return
      clearFilterGroup(state, group)
    }
    syncUiFromState()
    syncFilterDependencies()
    sizeSelectController.closeMenus()
    visibleCardsLimit = CATALOGUE_PAGE_SIZE
    applyFilters()
    if (wasEmptyCatalogue && matchedResultsCount === 0) {
      emptyStateResetClickCount += 1
      syncEmptyStateResetButton(readCatalogFavourites())
    }
    scrollToCatalogueToolbar()
  }

  emptyStateEl.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    const resetBtn = target?.closest<HTMLButtonElement>('[data-catalog-empty-reset]')
    if (!resetBtn || resetBtn.hidden) return
    const groupName = String(resetBtn.dataset.filterGroup || '')
    if (!groupName) return
    event.preventDefault()
    runCatalogFilterGroupReset(groupName)
  })

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

  bindCatalogPriceFilter(
    sidebarEl,
    () => state,
    () => priceBounds,
    {
      onChange: () => {
        visibleCardsLimit = CATALOGUE_PAGE_SIZE
        applyFilters()
      },
    },
  )

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
      const { groups, filterHelp, shareHelp } = await fetchCatalogFilters()
      setCatalogFilterHelpFromApi(filterHelp, shareHelp)
      renderCatalogueFilterGroups(groups)
    } catch (err) {
      console.warn('Catalogue filter feed failed, using static filter controls:', err)
      setCatalogFilterHelpFromApi(undefined, undefined)
      renderCatalogueFilterGroups({ size: [] })
    }
  }

  function mergeFullCatalogProducts(items: CatalogProduct[]): void {
    if (!productCatalog) return
    setCatalogProductStore(items)
    const bySlug = new Map(items.map((item) => [String(item.slug || '').trim(), item]))
    productCatalog.forEach((entry) => {
      const full = bySlug.get(entry.meta.slug)
      if (!full) return
      entry.product = full
      entry.meta = buildCatalogCardMetaFromProduct(full, entry.meta.initialOrder, entry.meta.card)
    })
    refreshPriceBoundsFromCatalog()
    syncUiFromState()
    applyFilters()
  }

  function showCatalogLoadError(): void {
    setCatalogCardsGridLoading(false)
    cardsRootEl.classList.add('is-empty')
    loadErrorEl.hidden = false
  }

  function hideCatalogLoadError(): void {
    loadErrorEl.hidden = true
  }

  async function sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    })
  }

  async function loadCatalogProductsWithRetry(maxAttempts = 3): Promise<CatalogProduct[]> {
    let lastError: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const items = await getCatalogProductsFeed()
        if (items.length === 0) throw new Error('Empty catalog feed')
        return items
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts) await sleep(attempt * 1000)
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Catalog unavailable')
  }

  async function applyLoadedCatalogProducts(items: CatalogProduct[]): Promise<void> {
    hideCatalogLoadError()
    setCatalogProductStore(items)
    productCatalog = buildCatalogProductListingEntries(items)
    refreshPriceBoundsFromCatalog({ resetSelection: true })
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    syncCatalogueFavouritesUi()
    syncFilterOptionsFromCards()
    visibleCardsLimit = CATALOGUE_PAGE_SIZE
    applyFilters()

    void getCatalogProductsFullFeed()
      .then((fullItems) => {
        if (fullItems.length === 0) return
        mergeFullCatalogProducts(fullItems)
      })
      .catch((err) => {
        console.warn('Catalogue full product feed failed:', err)
      })
  }

  async function loadCatalogueFromStrapi() {
    hideCatalogLoadError()
    setCatalogCardsGridLoading(true)
    try {
      const items = await loadCatalogProductsWithRetry()
      await applyLoadedCatalogProducts(items)
    } catch (err) {
      console.warn('Catalogue load failed:', err)
      showCatalogLoadError()
    } finally {
      setCatalogCardsGridLoading(false)
    }
  }

  loadErrorRetryBtn?.addEventListener('click', () => {
    void loadCatalogueFromStrapi()
  })

  updateCardsCache()
  syncCatalogueFavouritesUi()

  window.addEventListener('catalogue:favourites-updated', () => {
    syncCatalogueFavouritesUi()
    if (state.favouritesOnly) {
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
    }
  })

  window.addEventListener('catalogue:apply-smart-filters', (event) => {
    const filters = (event as CatalogSmartFiltersEvent).detail?.filters
    if (!filters) return
    smartQueryText = String((event as CatalogSmartFiltersEvent).detail?.queryText || '')
    smartQuizAnswers = (event as CatalogSmartFiltersEvent).detail?.quizAnswers || {}
    resetCatalogFilterState(state, priceBounds)
    smartPreferenceState = null
    const groups: CatalogSmartFilterGroup[] = ['collection', 'size', 'firmness', 'type', 'loadRange', 'heightRange', 'fillings', 'features']
    groups.forEach((group) => {
      const values = Array.isArray(filters[group]) ? filters[group] : []
      values.filter((value) => typeof value === 'string' && value && value !== 'all').forEach((value) => state[group].add(value))
    })
    smartPreferenceState = cloneFilterState(state)
    resolveNearestSmartFilterState()
    syncUiFromState()
    syncFilterDependencies()
    visibleCardsLimit = CATALOGUE_PAGE_SIZE
    applyFilters()
    scrollToCatalogueToolbar()
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
      flashCatalogShareLinkCopiedLabel(catalogueNewFavouritesShareBtn)
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
    const sharedProductShareBtn = target.closest<HTMLButtonElement>('[data-shared-product-share]')
    if (sharedProductShareBtn) {
      copyTextWithToast(buildCatalogProductShareUrl(slug))
      flashCatalogShareLinkCopiedLabel(sharedProductShareBtn)
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
          if (matchedResultsCount <= visibleCardsLimit) return
          visibleCardsLimit += CATALOGUE_PAGE_SIZE
          applyFilters()
        })
      },
      {
        root: null,
        rootMargin: '200px 0px',
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
