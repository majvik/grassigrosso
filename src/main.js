import './style.css'
import Lenis from 'lenis'
import {
  createLenisInstance,
  createScrollLocks,
  ensureVideoSource,
  initPageLoad,
  relocateOverlayRoots,
  scalePageForWideScreens,
} from './app-shell'
import { initCommercialOfferModal } from './commercial-offer'
import { initCollectionsSlider } from './collections-slider'
import { initContactForms } from './contact-forms'
import { initContactsMaps } from './contacts-maps'
import { initPrivacyConsentGuards } from './privacy-consent'
import { initGeographyEffects } from './geography-effects'
import {
  applyWidowFix,
  initDealersPackagePreset,
  PRELOADER_FONT_BUDGET_MS,
  startInlineVideos,
  waitForFonts,
  waitForHeroMedia,
} from './page-bootstrap'
import { initPageInteractions } from './page-interactions'
import { initPageLayout } from './page-layout'
import { initResourceModals } from './resource-modals'
import { initTestimonialsSlider } from './testimonials-slider'

const isCatalogPage = document.body.dataset.page === 'catalog'
const isDownloadCatalogPage = document.body.dataset.page === 'download-catalog'
const pagesCmsPrefetchSlug =
  document.body.dataset.page === 'index'
    ? 'index'
    : document.body.dataset.page === 'download-catalog'
      ? 'download-catalog'
      : null

const reactEntryPromise = document.querySelector('[data-react-root]')
  ? import('./react-entry').catch((error) => {
      console.error('react-entry bootstrap failed:', error)
    })
  : Promise.resolve()

const catalogRuntimePromise = isCatalogPage
  ? Promise.all([
      import('./catalog-hero-slider'),
      import('./catalog/catalog-api'),
      import('./catalog/catalog-page'),
    ]).then(([heroSlider, catalogApi, catalogPage]) => ({
      heroSlider,
      catalogApi,
      catalogPage,
    }))
  : Promise.resolve(null)

const downloadCatalogRuntimePromise = isDownloadCatalogPage
  ? import('./catalog-hero-slider')
  : Promise.resolve(null)

applyWidowFix()

initGeographyEffects()

const lenisInstance = createLenisInstance(Lenis)

const preloader = document.getElementById('preloader')

function initApp(catalogRuntime) {
  scalePageForWideScreens()
  window.addEventListener('resize', scalePageForWideScreens)

  const { copyToastRoot } = relocateOverlayRoots()
  const { lockScroll, unlockScroll } = createScrollLocks(lenisInstance)

  initPageInteractions({ lockScroll, unlockScroll, copyToastRoot })
  catalogRuntime?.catalogPage.initCataloguePage({ lockScroll, unlockScroll })
  initCollectionsSlider()
  initTestimonialsSlider()
  initPageLayout()
  initContactsMaps()
  initPrivacyConsentGuards()
  initContactForms()
  initDealersPackagePreset()
  initResourceModals({ lockScroll, unlockScroll, ensureVideoSource })
  initCommercialOfferModal({ lockScroll, unlockScroll })
}

// Start catalog feed requests immediately — before React renders.
if (isCatalogPage) {
  void catalogRuntimePromise.then((runtime) => {
    if (!runtime) return
    runtime.heroSlider.prefetchCatalogHeroFeed()
    runtime.catalogApi.prefetchCatalogProductsFeed()
  })
}

if (isDownloadCatalogPage) {
  void downloadCatalogRuntimePromise.then((heroSlider) => {
    if (!heroSlider) return
    heroSlider.prefetchDownloadCatalogFeed()
  })
}

// Wave-1 pages CMS texts (Phase 4B): early Node /api/pages/:slug prefetch.
if (pagesCmsPrefetchSlug) {
  void import('./pages/pages-api')
    .then((mod) => {
      mod.prefetchPageContent(pagesCmsPrefetchSlug)
    })
    .catch(() => {
      /* non-fatal: page hook will fetch on mount */
    })
}

initPageLoad({
  preloader,
  waitForFonts,
  waitForHeroMedia,
  startInlineVideos,
  preloaderFontBudgetMs: PRELOADER_FONT_BUDGET_MS,
})
  .catch((err) => {
    console.error('initPageLoad error:', err)
    document.body.classList.add('fonts-loaded')
    if (preloader) {
      preloader.classList.add('hidden')
      setTimeout(() => {
        if (preloader && preloader.parentNode) {
          preloader.remove()
        }
      }, 500)
    }
  })
  .finally(() => {
    void Promise.all([reactEntryPromise, catalogRuntimePromise, downloadCatalogRuntimePromise]).finally(() => {
      void catalogRuntimePromise.then((runtime) => {
        initApp(runtime)
        if (runtime) {
          void runtime.heroSlider.setupCatalogueNewPageHero()
        }
      })
      if (isDownloadCatalogPage) {
        void downloadCatalogRuntimePromise.then((heroSlider) => {
          if (heroSlider) void heroSlider.setupDownloadCatalogHero()
        })
      }
    })
  })
