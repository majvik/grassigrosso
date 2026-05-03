import './style.css'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { initCommercialOfferModal } from './commercial-offer'
import { initCollectionsSlider } from './collections-slider'
import { initContactForms } from './contact-forms'
import { initContactsMaps } from './contacts-maps'
import { initPageInteractions } from './page-interactions'
import { initPageLayout } from './page-layout'
import { initResourceModals } from './resource-modals'
import { initTestimonialsSlider } from './testimonials-slider'
import { fetchCatalogHeroFeed } from './catalog/catalog-api'
import { applyCatalogHeroFeed } from './catalog/catalog-hero'
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

// Geography section: cities animation + map points animation
const geographySection = document.querySelector('.geography-section')
const geographyCities = document.querySelector('.geography-cities')
const geographyMapContainer = document.getElementById('geographyMapContainer')
const geographyMapImg = document.getElementById('geographyMapImg')

if (geographySection && geographyCities) {
  let citiesAnimating = false
  let citiesOffset = 0
  const citiesSpeed = 80

  function animateCities(timestamp) {
    if (!citiesAnimating) return
    if (!animateCities._prev) animateCities._prev = timestamp
    const delta = (timestamp - animateCities._prev) / 1000
    animateCities._prev = timestamp
    citiesOffset += citiesSpeed * delta
    const halfWidth = geographyCities.scrollWidth / 2
    if (citiesOffset >= halfWidth) citiesOffset -= halfWidth
    geographyCities.style.transform = `translate3d(${-citiesOffset}px, 0, 0)`
    requestAnimationFrame(animateCities)
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!citiesAnimating) {
          citiesAnimating = true
          animateCities._prev = null
          requestAnimationFrame(animateCities)
        }
      } else {
        citiesAnimating = false
      }
    })
  }, {
    threshold: 0.1
  })
  observer.observe(geographySection)
}

// Geography map: load SVG inline and animate points when section is in view
if (geographyMapContainer && geographyMapImg && geographySection) {
  let mapPointsAnimated = false
  const mapObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || mapPointsAnimated) return
      const svg = geographyMapContainer.querySelector('svg')
      if (!svg) return
      const g = svg.querySelector('g[clip-path]')
      if (!g) return
      const pointPaths = [...g.children].filter(
        (el) => el.tagName === 'path' && (el.getAttribute('fill') === '#283E37' || el.getAttribute('fill') === 'white')
      )
      if (pointPaths.length === 0) return
      mapPointsAnimated = true
      const pathsPerPoint = 4
      const groups = []
      for (let i = 0; i < pointPaths.length; i += pathsPerPoint) {
        groups.push(pointPaths.slice(i, i + pathsPerPoint))
      }
      groups.forEach((group, i) => {
        gsap.fromTo(
          group,
          { opacity: 0, scale: 0, transformOrigin: '50% 50%' },
          { opacity: 1, scale: 1, duration: 0.7, delay: i * 0.056, ease: 'back.out', transformOrigin: '50% 50%' }
        )
      })
    })
  }, { threshold: 0.15 })

  fetch(geographyMapImg.getAttribute('src'))
    .then((r) => r.text())
    .then((text) => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'image/svg+xml')
      const svg = doc.querySelector('svg')
      if (!svg) return
      svg.removeAttribute('width')
      svg.removeAttribute('height')
      svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
      svg.setAttribute('role', 'img')
      svg.setAttribute('aria-label', 'География дилеров')
      geographyMapImg.remove()
      geographyMapContainer.appendChild(svg)
      mapObserver.observe(geographySection)
    })
    .catch(() => {})
}

// Lenis smooth scroll - только для десктопа
let lenisInstance = null
if (window.innerWidth > 1024) {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  })

  function raf(time) {
    lenis.raf(time)
    requestAnimationFrame(raf)
  }

  requestAnimationFrame(raf)
  lenisInstance = lenis

  // Обработка якорных ссылок
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href')
      if (href !== '#' && href !== '') {
        const target = document.querySelector(href)
        if (target) {
          e.preventDefault()
          lenis.scrollTo(target, {
            offset: 0,
            duration: 1.5,
          })
        }
      }
    })
  })
}

// Font loading and preloader
const preloader = document.getElementById('preloader')
const AUTOPLAY_VIDEO_VISIBILITY_THRESHOLD = 0.2
/** Не держать экран из‑за шрифтов дольше этого (моб. сеть): @font-face уже font-display:swap */
const PRELOADER_FONT_BUDGET_MS = 1800

function ensureVideoSource(video) {
  const inlineSrc = video.getAttribute('src')
  const deferredSrc = video.dataset.src
  if (!inlineSrc && deferredSrc) {
    video.setAttribute('src', deferredSrc)
    video.load()
  }
}

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

async function setupCatalogueNewPageHero() {
  const sliderRoot = document.querySelector('.catalog-hero-slider')
  if (!sliderRoot) return
  try {
    const data = await fetchCatalogHeroFeed()
    if (Array.isArray(data.slides) && data.slides.length > 0) {
      applyCatalogHeroFeed(sliderRoot, data)
    }
  } catch (err) {
    console.warn('Catalog hero Strapi fetch failed, using static slides:', err)
  }
  initCatalogHeroSlider(sliderRoot)
}

function initCatalogHeroSlider(sliderRoot) {
  const slides = [...sliderRoot.querySelectorAll('.catalog-hero-slide')]
  const dots = [...sliderRoot.querySelectorAll('.catalog-hero-dot')]
  if (slides.length === 0) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const autoplayMsRaw = Number(sliderRoot.dataset.autoplayMs || '6500')
  const autoplayMs = Number.isFinite(autoplayMsRaw) ? Math.max(2500, autoplayMsRaw) : 6500
  sliderRoot.style.setProperty('--catalog-hero-autoplay', `${autoplayMs}ms`)

  let index = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')))
  if (index < 0) index = 0

  let timer = null
  let isPaused = false
  let isVisible = true

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function restartActiveDotAnimation() {
    const activeDot = dots[index]
    if (!activeDot) return
    const progress = activeDot.querySelector('.catalog-hero-dot-fill')
    if (!progress) return
    const clone = progress.cloneNode(true)
    progress.replaceWith(clone)
  }

  function syncDots() {
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === index
      dot.classList.toggle('is-active', isActive)
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false')
      dot.tabIndex = isActive ? 0 : -1
    })
    restartActiveDotAnimation()
  }

  function applySlideMedia() {
    slides.forEach((slide, slideIndex) => {
      const video = slide.querySelector('video')
      if (!video) return
      const isActive = slideIndex === index
      const shouldPlay = isActive && isVisible && !reducedMotion
      if (shouldPlay) {
        video.muted = true
        video.setAttribute('playsinline', '')
        void video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }

  function syncSlides() {
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index
      slide.classList.toggle('is-active', isActive)
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true')
    })
    applySlideMedia()
    syncDots()
  }

  function goTo(nextIndex) {
    if (slides.length === 0) return
    const next = ((nextIndex % slides.length) + slides.length) % slides.length
    index = next
    syncSlides()
    scheduleAutoplay()
  }

  function scheduleAutoplay() {
    clearTimer()
    if (reducedMotion) return
    if (!isVisible || isPaused) return

    timer = setTimeout(() => {
      goTo(index + 1)
    }, autoplayMs)
  }

  const prevBtn = sliderRoot.querySelector('.catalog-hero-nav-prev')
  const nextBtn = sliderRoot.querySelector('.catalog-hero-nav-next')
  prevBtn?.addEventListener('click', (e) => {
    goTo(index - 1)
    e.currentTarget.blur()
  })
  nextBtn?.addEventListener('click', (e) => {
    goTo(index + 1)
    e.currentTarget.blur()
  })

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const target = Number(dot.dataset.target || '0')
      if (!Number.isFinite(target)) return
      goTo(target)
    })
  })

  sliderRoot.addEventListener('mouseenter', () => {
    isPaused = true
    clearTimer()
  })
  sliderRoot.addEventListener('mouseleave', () => {
    isPaused = false
    scheduleAutoplay()
  })

  sliderRoot.addEventListener('focusin', () => {
    isPaused = true
    clearTimer()
  })
  sliderRoot.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (sliderRoot.contains(document.activeElement)) return
      isPaused = false
      scheduleAutoplay()
    }, 0)
  })

  sliderRoot.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(index + 1)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(index - 1)
    }
  })

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting
        if (!isVisible) {
          clearTimer()
          applySlideMedia()
          return
        }
        applySlideMedia()
        if (!isPaused) scheduleAutoplay()
      })
    }, { threshold: 0.2 })
    observer.observe(sliderRoot)
  }

  syncSlides()
  scheduleAutoplay()
}

// Initialize page load
async function initPageLoad() {
  await Promise.all([
    Promise.race([
      waitForFonts(),
      new Promise((resolve) => setTimeout(resolve, PRELOADER_FONT_BUDGET_MS)),
    ]),
    waitForHeroMedia(),
  ])

  await new Promise((resolve) => requestAnimationFrame(resolve))
  
  document.body.classList.add('fonts-loaded')
  
  startInlineVideos()
  
  if (preloader) {
    preloader.classList.add('hidden')
    setTimeout(() => {
      if (preloader && preloader.parentNode) {
        preloader.remove()
      }
    }, 500)
  }
}

// Весь тяжёлый init — после initPageLoad, иначе на мобильных main thread занят тысячами строк
// и не обрабатывает таймеры/шрифты, прелоадер «висит» при том же Wi‑Fi, что и десктоп.
function initApp() {
// Scale page on screens 1920px and larger
function scalePage() {
  const htmlEl = document.documentElement
  const bodyEl = document.body
  if (!htmlEl || !bodyEl) return
  const clearLegacyTransform = () => {
    bodyEl.style.transform = ''
    bodyEl.style.transformOrigin = ''
  }

  if (window.innerWidth >= 1920) {
    const scale = window.innerWidth / 1920
    // zoom не создаёт новый containing block для position: fixed,
    // в отличие от transform: scale(...) на body.
    htmlEl.style.zoom = String(scale)
    clearLegacyTransform()
  } else {
    htmlEl.style.zoom = ''
    clearLegacyTransform()
  }
}

scalePage()
window.addEventListener('resize', scalePage)

// Move modals out of body to <html> so body's transform doesn't break position:fixed
document.querySelectorAll('.modal-overlay').forEach(modal => {
  document.documentElement.appendChild(modal)
})

const catalogueImageModalRoot = document.getElementById('catalogueImageModal')
if (catalogueImageModalRoot) {
  document.documentElement.appendChild(catalogueImageModalRoot)
}

const catalogueMobileFiltersOverlayRoot = document.getElementById('catalogue-new-mobile-filters-overlay')
if (catalogueMobileFiltersOverlayRoot) {
  document.documentElement.appendChild(catalogueMobileFiltersOverlayRoot)
}

// Cookie banner – вне body, чтобы position:fixed не ломался из-за transform на body
const cookieBannerEl = document.querySelector('.cookie-banner')
if (cookieBannerEl) document.documentElement.appendChild(cookieBannerEl)

const copyToastRoot = document.getElementById('copy-toast')
if (copyToastRoot) document.documentElement.appendChild(copyToastRoot)
initPageInteractions({ lockScroll, unlockScroll, copyToastRoot })

initCataloguePage({ lockScroll, unlockScroll })

initCollectionsSlider()
initTestimonialsSlider()
initPageLayout()
initContactsMaps()

initContactForms()

// Dealers: pre-select package in form when clicking "Выбрать пакет"
const dealerPackageSelect = document.getElementById('dealer-package')
if (dealerPackageSelect) {
  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('a[href="#contact-form"][data-package]')
    if (!link) return
    const pkg = link.getAttribute('data-package')
    if (pkg && ['standard', 'individual', 'exclusive'].includes(pkg)) {
      dealerPackageSelect.value = pkg
    }
  })
}

function lockScroll() {
  if (lenisInstance) lenisInstance.stop()
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
}

function unlockScroll() {
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
  if (lenisInstance) lenisInstance.start()
}

initResourceModals({ lockScroll, unlockScroll, ensureVideoSource })
initCommercialOfferModal({ lockScroll, unlockScroll })

}

if (document.body.dataset.page === 'catalog') {
  void setupCatalogueNewPageHero()
}

initPageLoad()
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
