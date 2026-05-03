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
import { setupCatalogueNewPageHero, prefetchCatalogHeroFeed } from './catalog-hero-slider'
import { initCommercialOfferModal } from './commercial-offer'
import { initCollectionsSlider } from './collections-slider'
import { initContactForms } from './contact-forms'
import { initContactsMaps } from './contacts-maps'
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
import { initCataloguePage } from './catalog/catalog-page'

const reactEntryPromise = document.querySelector('[data-react-root]')
  ? import('./react-entry').catch((error) => {
      console.error('react-entry bootstrap failed:', error)
    })
  : Promise.resolve()

applyWidowFix()

initGeographyEffects()

const lenisInstance = createLenisInstance(Lenis)

const preloader = document.getElementById('preloader')

function initApp() {
  scalePageForWideScreens()
  window.addEventListener('resize', scalePageForWideScreens)

  const { copyToastRoot } = relocateOverlayRoots()
  const { lockScroll, unlockScroll } = createScrollLocks(lenisInstance)

  initPageInteractions({ lockScroll, unlockScroll, copyToastRoot })
  initCataloguePage({ lockScroll, unlockScroll })
  initCollectionsSlider()
  initTestimonialsSlider()
  initPageLayout()
  initContactsMaps()
  initContactForms()
  initDealersPackagePreset()
  initResourceModals({ lockScroll, unlockScroll, ensureVideoSource })
  initCommercialOfferModal({ lockScroll, unlockScroll })
}

// Start hero feed network request immediately — before React renders.
// DOM initialization (initCatalogHeroSlider) happens after React in reactEntryPromise.finally().
if (document.body.dataset.page === 'catalog') {
  prefetchCatalogHeroFeed()
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
    void reactEntryPromise.finally(() => {
      initApp()
      // Initialize hero slider AFTER React has rendered the catalog DOM.
      // prefetchCatalogHeroFeed() already started the network request above.
      if (document.body.dataset.page === 'catalog') {
        void setupCatalogueNewPageHero()
      }
    })
  })
