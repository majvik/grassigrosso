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
import { setupCatalogueNewPageHero } from './catalog-hero-slider'
import { initCommercialOfferModal } from './commercial-offer'
import { initCollectionsSlider } from './collections-slider'
import { initContactForms } from './contact-forms'
import { initContactsMaps } from './contacts-maps'
import { initGeographyEffects } from './geography-effects'
import { initPageInteractions } from './page-interactions'
import { initPageLayout } from './page-layout'
import { initResourceModals } from './resource-modals'
import { initTestimonialsSlider } from './testimonials-slider'
import { initCataloguePage } from './catalog/catalog-page'

if (document.querySelector('[data-react-root]')) {
  await import('./react-entry')
}

// Типографика: привязка коротких предлогов/союзов к следующему слову неразрывным пробелом
;(function fixWidows() {
  const WORDS = [
    'а','в','и','к','о','с','у','я',
    'бы','во','да','до','же','за','из','ил','ко','ли','на','не','ни','но','об','от','по','со','то',
    'без','бес','все','всё','для','его','еще','ещё','или','как','над','под','при','про','что','это',
  ]
  const re = new RegExp(`(?<=^|\\s)(${WORDS.join('|')})\\s`, 'giu')
  const NBSP = '\u00A0'

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const replaced = node.textContent.replace(re, `$1${NBSP}`)
      if (replaced !== node.textContent) node.textContent = replaced
      return
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'CODE' || tag === 'PRE') return
      for (const child of node.childNodes) walk(child)
    }
  }

  walk(document.body)
})()

initGeographyEffects()

const lenisInstance = createLenisInstance(Lenis)

// Font loading and preloader
const preloader = document.getElementById('preloader')
const AUTOPLAY_VIDEO_VISIBILITY_THRESHOLD = 0.2
/** Не держать экран из‑за шрифтов дольше этого (моб. сеть): @font-face уже font-display:swap */
const PRELOADER_FONT_BUDGET_MS = 1800

// Wait only for the specific fonts we need
async function waitForFonts() {
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve)
    })
  }

  if (!document.fonts) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return
  }

  await Promise.all([
    document.fonts.load('400 1em "Nunito"'),
    document.fonts.load('400 1em "Bounded"')
  ])
}

// Kick off autoplay for inline videos after page is visible
function startInlineVideos() {
  const videos = document.querySelectorAll('video[autoplay]:not(.modal-video)')
  if (videos.length === 0) return

  const activateVideo = (video) => {
    ensureVideoSource(video)
    if (video.paused) {
      video.play().catch(() => {})
    }
  }

  if (!window.IntersectionObserver) {
    videos.forEach(activateVideo)
    return
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      const video = entry.target
      activateVideo(video)
      observer.unobserve(video)
    })
  }, {
    threshold: AUTOPLAY_VIDEO_VISIBILITY_THRESHOLD
  })

  videos.forEach(video => {
    observer.observe(video)
  })
}

// Wait for hero media so preloader covers the loading gap
function waitForHeroMedia() {
  try {
    const container = document.querySelector(
      '.hero-image, .page-hero-image, .catalog-hero-image, .contacts-hero-image, .documents-hero-image'
    )
    if (!container) return Promise.resolve()

    const catalogSlider = container.querySelector('.catalog-hero-slider')
    if (catalogSlider) {
      const activeSlide = catalogSlider.querySelector('.catalog-hero-slide.is-active')
      if (activeSlide) {
        const activeVideo = activeSlide.querySelector('video')
        if (activeVideo) {
          const poster = activeVideo.getAttribute('poster')
          if (poster) {
            return Promise.race([
              new Promise((resolve) => {
                const img = new Image()
                img.onload = resolve
                img.onerror = resolve
                img.src = poster
                if (img.complete) resolve()
              }),
              new Promise((resolve) => setTimeout(resolve, 3000))
            ])
          }
          if (activeVideo.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            return Promise.resolve()
          }
          return Promise.race([
            new Promise((resolve) => {
              activeVideo.addEventListener('canplay', resolve, { once: true })
              activeVideo.addEventListener('error', resolve, { once: true })
            }),
            new Promise((resolve) => setTimeout(resolve, 5000))
          ])
        }
        const img = activeSlide.querySelector('picture img, img')
        if (img) {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve()
          return Promise.race([
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true })
              img.addEventListener('error', resolve, { once: true })
            }),
            new Promise((resolve) => setTimeout(resolve, 3000))
          ])
        }
      }
      return Promise.resolve()
    }

    const video = container.querySelector('video[poster]')
    if (video) {
      const src = video.getAttribute('poster')
      return Promise.race([
        new Promise(resolve => {
          const img = new Image()
          img.onload = resolve
          img.onerror = resolve
          img.src = src
          if (img.complete) resolve()
        }),
        new Promise(resolve => setTimeout(resolve, 3000))
      ])
    }

    const img = container.querySelector('picture img')
    if (img) {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve()
      return Promise.race([
        new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
        }),
        new Promise(resolve => setTimeout(resolve, 3000))
      ])
    }

    return Promise.resolve()
  } catch (e) {
    return Promise.resolve()
  }
}

function initDealersPackagePreset() {
  const dealerPackageSelect = document.getElementById('dealer-package')
  if (!dealerPackageSelect) return
  document.body.addEventListener('click', (event) => {
    const link = event.target.closest('a[href="#contact-form"][data-package]')
    if (!link) return
    const pkg = link.getAttribute('data-package')
    if (pkg && ['standard', 'individual', 'exclusive'].includes(pkg)) {
      dealerPackageSelect.value = pkg
    }
  })
}

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

if (document.body.dataset.page === 'catalog') {
  void setupCatalogueNewPageHero()
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
    initApp()
  })
