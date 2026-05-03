import './style.css'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { initCommercialOfferModal } from './commercial-offer'
import { initCollectionsSlider } from './collections-slider'
import { initContactForms } from './contact-forms'
import { initPageInteractions } from './page-interactions'
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

// Page hero image aspect ratio sync (desktop only)
const pageHeroText = document.querySelector('.page-hero-text')
const pageHeroImage = document.querySelector('.page-hero-image')

// Check if we're on dealers page - don't sync height there
// Check by looking for conditions-section which is unique to dealers page
function isDealersPage() {
  const path = window.location.pathname
  return path === '/dealers' ||
         path === '/dealers.html' ||
         document.querySelector('.conditions-section') !== null ||
         document.title.includes('Дилер') ||
         document.title.includes('дилер')
}

if (pageHeroText && pageHeroImage && !isDealersPage()) {
  function syncPageHeroImage() {
    // Double check we're not on dealers page
    if (isDealersPage()) {
      // Reset any styles that might have been set
      pageHeroImage.style.aspectRatio = ''
      pageHeroImage.style.height = ''
      pageHeroText.style.height = ''
      return
    }
    
    // Only sync on desktop (width > 1024px)
    if (window.innerWidth <= 1024) {
      // Reset styles on mobile
      pageHeroImage.style.aspectRatio = ''
      pageHeroImage.style.height = ''
      pageHeroText.style.height = ''
      return
    }
    
    // Reset styles to get natural dimensions
    pageHeroImage.style.aspectRatio = '1 / 1'
    pageHeroImage.style.height = 'auto'
    pageHeroText.style.height = 'auto'
    
    // Force reflow
    pageHeroImage.offsetHeight
    
    // Get dimensions
    const imageWidth = pageHeroImage.offsetWidth
    const squareHeight = imageWidth // Height if image stays square
    const textHeight = pageHeroText.offsetHeight
    
    if (textHeight > squareHeight) {
      // Text is taller, remove aspect-ratio and stretch image to match text height
      pageHeroImage.style.aspectRatio = 'none'
      pageHeroImage.style.height = `${textHeight}px`
    } else {
      // Image square height is taller or equal, keep aspect-ratio and set text to match
      pageHeroImage.style.aspectRatio = '1 / 1'
      pageHeroImage.style.height = 'auto'
      pageHeroText.style.height = `${squareHeight}px`
    }
  }
  
  // Sync on load
  setTimeout(syncPageHeroImage, 0)
  
  // Sync on resize
  let resizeTimeout
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(syncPageHeroImage, 100)
  })
  
  // Sync when content changes
  const observer = new ResizeObserver(() => {
    if (!isDealersPage()) {
      syncPageHeroImage()
    }
  })
  observer.observe(pageHeroText)
  observer.observe(pageHeroImage)
} else if (pageHeroText && pageHeroImage && isDealersPage()) {
  // On dealers page, make sure styles are reset
  pageHeroImage.style.aspectRatio = ''
  pageHeroImage.style.height = ''
  pageHeroText.style.height = ''
}

// Refresh section image height sync (desktop only)
const refreshContent = document.querySelector('.refresh-content')
const refreshImage = document.querySelector('.refresh-image')

if (refreshContent && refreshImage) {
  function syncRefreshImageHeight() {
    // Only sync on desktop (width > 1024px)
    if (window.innerWidth <= 1024) {
      refreshImage.style.height = ''
      return
    }
    
    const contentHeight = refreshContent.offsetHeight
    refreshImage.style.height = `${contentHeight}px`
  }
  
  // Sync on load
  syncRefreshImageHeight()
  
  // Sync on resize
  window.addEventListener('resize', syncRefreshImageHeight)
  
  // Sync when content changes (e.g., FAQ toggles if they affect height)
  const observer = new ResizeObserver(() => {
    syncRefreshImageHeight()
  })
  observer.observe(refreshContent)
}


// Contacts map – Yandex API 2.1: метки фирменным цветом, балун с адресом по наведению
// Ключ: .env → VITE_YANDEX_MAPS_API_KEY (на проде – в переменных окружения)
const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''
const contactsMapTabs = document.querySelectorAll('.contacts-map-tab')
const contactsMapFrames = document.querySelectorAll('.contacts-map-frame')

const CONTACTS_OFFICES = [
  { id: 'main', center: [44.970737, 34.152577], zoom: 16, title: 'Главный офис', address: 'Симферополь, ул. Кубанская д. 25' },
  { id: 'voronezh', center: [51.681129, 39.297287], zoom: 16, title: 'Представительство в Центральной России', address: 'Воронеж, ул. Остужева 43 И' },
  { id: 'lnr', center: [48.541403, 39.32438], zoom: 16, title: 'Представительство в ЛНР', address: 'Луганск, ул. Фабричная д 1' },
  { id: 'dnr', center: [48.035223, 38.147954], zoom: 16, title: 'Представительство в ДНР', address: 'Харцизск, ул. Вокзальная, д. 52' }
]
const CONTACTS_MARKER_COLOR = '#283e37'

function applyMapGrayscale (mapContainer) {
  if (!mapContainer) return
  const groundPane = mapContainer.querySelector('[class*="ground-pane"]')
  if (groundPane) groundPane.style.filter = 'grayscale(1)'
}

function initContactMaps () {
  if (typeof ymaps === 'undefined') return
  CONTACTS_OFFICES.forEach((office) => {
    const container = document.getElementById('map-' + office.id)
    if (!container) return
    const map = new ymaps.Map('map-' + office.id, {
      center: office.center,
      zoom: office.zoom,
      controls: ['zoomControl']
    })
    map.behaviors.disable('scrollZoom')
    // Обесцвечиваем слой карты (тайлы) под фирменный стиль – через DOM слоя API
    map.events.add('load', function () {
      applyMapGrayscale(container)
    })
    setTimeout(function () { applyMapGrayscale(container) }, 300)
    const placemark = new ymaps.Placemark(
      office.center,
      {
        balloonContentHeader: '<strong>' + office.title + '</strong>',
        balloonContentBody: office.address
      },
      {
        preset: 'islands#circleDotIcon',
        iconColor: CONTACTS_MARKER_COLOR,
        hasHint: false,
        openBalloonOnClick: false,
        hideIconOnBalloonOpen: false
      }
    )
    placemark.events.add('mouseenter', () => placemark.balloon.open())
    placemark.events.add('mouseleave', () => placemark.balloon.close())
    map.geoObjects.add(placemark)
  })
}

if (contactsMapTabs.length > 0 && contactsMapFrames.length > 0) {
  const yandexMapsUrl = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU' +
    (YANDEX_MAPS_API_KEY ? '&apikey=' + encodeURIComponent(YANDEX_MAPS_API_KEY) : '')
  const script = document.createElement('script')
  script.src = yandexMapsUrl
  script.onload = () => ymaps.ready(initContactMaps)
  document.head.appendChild(script)
  contactsMapTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      contactsMapTabs.forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')
      const office = tab.getAttribute('data-office')
      contactsMapFrames.forEach((frame) => {
        frame.hidden = frame.getAttribute('data-office') !== office
      })
    })
  })
}

// Catalog custom section - sync padding-top with title height
const catalogCustomLeft = document.querySelector('.catalog-custom-left')
const catalogCustomRight = document.querySelector('.catalog-custom-right')
const catalogCustomTitle = document.querySelector('.catalog-custom-left .section-title')

if (catalogCustomLeft && catalogCustomRight && catalogCustomTitle) {
  function syncCatalogCustomPadding() {
    // Only sync on desktop (width > 1024px)
    if (window.innerWidth <= 1024) {
      catalogCustomRight.style.paddingTop = '0'
      return
    }
    
    // Get the actual height of the title
    const titleHeight = catalogCustomTitle.offsetHeight
    catalogCustomRight.style.paddingTop = `${titleHeight}px`
  }
  
  // Sync on load
  setTimeout(syncCatalogCustomPadding, 0)
  
  // Sync on resize
  let resizeTimeout2
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout2)
    resizeTimeout2 = setTimeout(syncCatalogCustomPadding, 100)
  })
  
  // Sync when content changes (e.g., font loading)
  const observer2 = new ResizeObserver(() => {
    syncCatalogCustomPadding()
  })
  observer2.observe(catalogCustomTitle)
}

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
