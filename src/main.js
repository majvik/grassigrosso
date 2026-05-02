import './style.css'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { fetchCatalogFilterGroups, fetchCatalogHeroFeed, fetchCatalogProducts } from './catalog/catalog-api'
import { buildCatalogueCardHtml } from './catalog/catalog-card'
import { readCatalogFavourites, writeCatalogFavourites } from './catalog/catalog-favourites'
import { normalizeCatalogFilterOptions } from './catalog/catalog-filter-options'
import {
  collectAvailableCatalogFilters,
  compareCatalogCardMeta,
  matchesCatalogCardMeta,
} from './catalog/catalog-filtering'
import { applyCatalogHeroFeed } from './catalog/catalog-hero'
import { buildCatalogModalSpecs } from './catalog/catalog-modal'
import {
  STANDARD_MATTRESS_SIZES,
  STANDARD_MATTRESS_SIZE_SET,
  buildStandardMattressSizesFromLegacy,
  normalizeCatalogSizeValue,
} from './catalog/catalog-sizes'

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

// Welcome Modal – показ при первом визите
const welcomeModal = document.getElementById('welcomeModal')
const welcomeCloseBtn = document.getElementById('welcomeClose')
const welcomeCloseX = document.getElementById('welcomeCloseX')

if (welcomeModal) {
  let welcomeAutoClose = null

  function closeWelcomeModal() {
    if (welcomeAutoClose) { clearTimeout(welcomeAutoClose); welcomeAutoClose = null }
    welcomeModal.classList.remove('active')
    if (typeof unlockScroll === 'function') unlockScroll()
    document.body.classList.remove('modal-open')
  }

  requestAnimationFrame(() => {
    welcomeModal.classList.add('active')
    if (typeof lockScroll === 'function') lockScroll()
    document.body.classList.add('modal-open')
    welcomeAutoClose = setTimeout(closeWelcomeModal, 30000)
  })

  if (welcomeCloseBtn) {
    welcomeCloseBtn.addEventListener('click', closeWelcomeModal)
  }

  if (welcomeCloseX) {
    welcomeCloseX.addEventListener('click', (e) => {
      e.stopPropagation()
      closeWelcomeModal()
    })
  }

  welcomeModal.addEventListener('click', (e) => {
    if (e.target === welcomeModal) closeWelcomeModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && welcomeModal.classList.contains('active')) closeWelcomeModal()
  })
}

// Cookie banner
const cookieBanner = document.querySelector('.cookie-banner')
const cookieBtn = document.querySelector('.btn-cookie')

if (cookieBtn && cookieBanner) {
  if (localStorage.getItem('cookieAccepted')) {
    cookieBanner.style.display = 'none'
    document.body.classList.remove('cookie-visible')
  } else {
    document.body.classList.add('cookie-visible')
  }
  
  cookieBtn.addEventListener('click', () => {
    cookieBanner.classList.add('hiding')
    document.body.classList.remove('cookie-visible')
    setTimeout(() => {
      cookieBanner.style.display = 'none'
    }, 300)
    localStorage.setItem('cookieAccepted', 'true')
  })
}

// Копирование email в карточках офисов (contacts) + тост «Скопировано»
if (copyToastRoot) {
  let copyToastHideTimer = null
  let copyToastRemoveHidingTimer = null

  function hideCopyToast () {
    copyToastRoot.classList.remove('copy-toast--show')
    copyToastRoot.classList.add('copy-toast--hiding')
    if (copyToastRemoveHidingTimer) clearTimeout(copyToastRemoveHidingTimer)
    copyToastRemoveHidingTimer = setTimeout(() => {
      copyToastRoot.setAttribute('hidden', '')
      copyToastRoot.classList.remove('copy-toast--hiding')
    }, 300)
  }

  function showCopyToast () {
    if (copyToastHideTimer) clearTimeout(copyToastHideTimer)
    if (copyToastRemoveHidingTimer) clearTimeout(copyToastRemoveHidingTimer)
    copyToastRoot.removeAttribute('hidden')
    copyToastRoot.classList.remove('copy-toast--hiding')
    requestAnimationFrame(() => {
      copyToastRoot.classList.add('copy-toast--show')
    })
    copyToastHideTimer = setTimeout(hideCopyToast, 3000)
  }

  function copyEmailToClipboard (email) {
    function done () {
      showCopyToast()
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(email).then(done).catch(fallbackCopy)
    } else {
      fallbackCopy()
    }
    function fallbackCopy () {
      const ta = document.createElement('textarea')
      ta.value = email
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        if (document.execCommand('copy')) done()
      } catch (_) { /* ignore */ }
      document.body.removeChild(ta)
    }
  }

  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.contacts-office-copy-email')
    if (!btn) return
    const email = btn.getAttribute('data-copy-email')
    if (!email) return
    e.preventDefault()
    copyEmailToClipboard(email)
  })
}

// Карточки офисов: иконка по центру в одну строку, при переносе email — по верху.
// getClientRects() на <a> внутри flex часто даёт один rect; используем высоту строки и Range.
const contactsOfficeEmailRows = document.querySelectorAll('.contacts-office-email-row')
if (contactsOfficeEmailRows.length > 0) {
  function measureSingleLineHeightPx (el) {
    const cs = getComputedStyle(el)
    const fs = parseFloat(cs.fontSize) || 17
    const lh = cs.lineHeight
    if (lh && lh !== 'normal') {
      const n = parseFloat(lh)
      if (!Number.isNaN(n)) {
        return lh.endsWith('%') ? (n / 100) * fs : n
      }
    }
    const probe = document.createElement('span')
    probe.textContent = 'Ay'
    probe.style.cssText = [
      'position:fixed',
      'left:-9999px',
      'top:0',
      'visibility:hidden',
      'pointer-events:none',
      'white-space:nowrap',
      `font-family:${cs.fontFamily}`,
      `font-size:${cs.fontSize}`,
      `font-weight:${cs.fontWeight}`,
      `font-style:${cs.fontStyle}`,
      `line-height:${cs.lineHeight}`,
      `letter-spacing:${cs.letterSpacing || 'normal'}`
    ].join(';')
    document.body.appendChild(probe)
    const h = probe.offsetHeight
    probe.remove()
    return h > 0 ? h : fs * 1.4
  }

  function rangeHasMultipleLines (link) {
    try {
      const range = document.createRange()
      range.selectNodeContents(link)
      const rects = range.getClientRects()
      const tops = new Set()
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i]
        if (r.width < 1 || r.height < 1) continue
        tops.add(Math.round(r.top * 2) / 2)
      }
      return tops.size > 1
    } catch (_) {
      return false
    }
  }

  function isMailtoWrapped (link) {
    if (!link) return false
    const lineH = measureSingleLineHeightPx(link)
    const tol = Math.max(6, Math.round(lineH * 0.08))
    if (link.offsetHeight > lineH + tol) return true
    return rangeHasMultipleLines(link)
  }

  function syncContactsOfficeEmailRow (row) {
    const link = row.querySelector('a[href^="mailto:"]')
    if (!link) return
    row.classList.toggle('contacts-office-email-row--wrapped', isMailtoWrapped(link))
  }

  let emailRowsLayoutRaf = null
  function scheduleSyncAllEmailRows () {
    if (emailRowsLayoutRaf != null) return
    emailRowsLayoutRaf = requestAnimationFrame(() => {
      emailRowsLayoutRaf = null
      contactsOfficeEmailRows.forEach(syncContactsOfficeEmailRow)
    })
  }

  contactsOfficeEmailRows.forEach((row) => {
    const link = row.querySelector('a[href^="mailto:"]')
    syncContactsOfficeEmailRow(row)
    const ro = new ResizeObserver(() => scheduleSyncAllEmailRows())
    ro.observe(row)
    if (link) ro.observe(link)
  })
  let resizeEmailRowsTimer = null
  window.addEventListener('resize', () => {
    clearTimeout(resizeEmailRowsTimer)
    resizeEmailRowsTimer = setTimeout(scheduleSyncAllEmailRows, 100)
  })
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleSyncAllEmailRows)
  }
  scheduleSyncAllEmailRows()
  setTimeout(scheduleSyncAllEmailRows, 0)
}

// Nav menu: анимированная полоска подчеркивания (десктоп)
const navMenu = document.querySelector('.nav-menu')
if (navMenu) {
  const slider = document.createElement('span')
  slider.className = 'nav-menu-slider'
  slider.setAttribute('aria-hidden', 'true')
  navMenu.appendChild(slider)

  function positionSlider(link) {
    if (!link) {
      slider.style.width = '0'
      return
    }
    slider.style.left = `${link.offsetLeft}px`
    slider.style.width = `${link.offsetWidth}px`
  }

  const activeLink = navMenu.querySelector('a.active')
  positionSlider(activeLink || null)

  navMenu.querySelectorAll('a').forEach((a) => {
    a.addEventListener('mouseenter', () => positionSlider(a))
  })
  navMenu.addEventListener('mouseleave', () => positionSlider(activeLink || null))

  window.addEventListener('resize', () => positionSlider(activeLink || null))
}

// Mobile menu
const mobileMenuBtn = document.querySelector('.mobile-menu-btn')
const mobileMenuClose = document.querySelector('.mobile-menu-close')
const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay')
const mobileNavLinks = document.querySelectorAll('.mobile-nav a, .mobile-menu-cta')

if (mobileMenuBtn && mobileMenuClose && mobileMenuOverlay) {
  // Open menu
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenuOverlay.classList.add('active')
    document.body.style.overflow = 'hidden'
  })
  
  // Close menu
  const closeMenu = () => {
    mobileMenuOverlay.classList.remove('active')
    document.body.style.overflow = ''
  }
  
  mobileMenuClose.addEventListener('click', closeMenu)
  
  // Close when clicking on overlay (outside menu)
  mobileMenuOverlay.addEventListener('click', (e) => {
    if (e.target === mobileMenuOverlay) {
      closeMenu()
    }
  })
  
  // Close when clicking nav links
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', closeMenu)
  })
}

// Catalogue: sidebar filters + sorting
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

  function parseCsvDataset(value) {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  function createCatalogueFilterButton(className, attrs, label) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = className
    Object.entries(attrs).forEach(([name, value]) => {
      button.setAttribute(name, String(value))
    })
    button.textContent = label
    return button
  }

  function renderCatalogueChipOptions(groupName, options, allLabel) {
    const normalized = normalizeCatalogFilterOptions(options)
    if (!normalized.length) return false
    const group = catalogueNewSidebar.querySelector(`.catalogue-new-filter-group[data-filter-group="${groupName}"]`)
    const list = group?.querySelector('.catalogue-new-filter-list')
    if (!list) return false
    list.replaceChildren(
      createCatalogueFilterButton(
        'catalogue-new-chip is-active',
        { 'data-filter-group': groupName, 'data-value': 'all' },
        allLabel
      ),
      ...normalized.map((option) => createCatalogueFilterButton(
        'catalogue-new-chip',
        { 'data-filter-group': groupName, 'data-value': option.value },
        option.label
      ))
    )
    return true
  }

  function renderCatalogueSizeOptions(options) {
    const normalized = normalizeCatalogFilterOptions(options)
    if (!normalized.length) return false
    const sizeSelect = catalogueNewSidebar.querySelector('.catalogue-new-size-select[data-size-group="size"]')
    const menu = sizeSelect?.querySelector('.catalogue-new-size-select-menu')
    if (!menu) return false
    const searchRow = menu.querySelector('.catalogue-new-size-select-search-row')
    const allRow = document.createElement('li')
    allRow.appendChild(createCatalogueFilterButton(
      'catalogue-new-size-select-option is-active',
      { 'data-value': 'all' },
      'Любой'
    ))
    const rows = [allRow]
    if (searchRow) rows.push(searchRow)
    normalized.forEach((option) => {
      const row = document.createElement('li')
      row.appendChild(createCatalogueFilterButton(
        'catalogue-new-size-select-option',
        { 'data-value': normalizeCatalogSizeValue(option.value) || option.value },
        option.label
      ))
      rows.push(row)
    })
    menu.replaceChildren(...rows)
    return true
  }

  function renderCatalogueFilterGroups(groups) {
    if (!groups || typeof groups !== 'object') return false
    const rendered = [
      renderCatalogueChipOptions('collection', groups.collection, 'Все коллекции'),
      renderCatalogueSizeOptions(groups.size),
      renderCatalogueChipOptions('firmness', groups.firmness, 'Любая'),
      renderCatalogueChipOptions('type', groups.type, 'Любая'),
      renderCatalogueChipOptions('loadRange', groups.loadRange, 'Любая'),
      renderCatalogueChipOptions('heightRange', groups.heightRange, 'Любая'),
      renderCatalogueChipOptions('fillings', groups.fillings, 'Любая'),
      renderCatalogueChipOptions('features', groups.features, 'Любые'),
    ].some(Boolean)
    if (!rendered) return false
    syncUiFromState()
    syncFilterOptionsFromCards()
    applyFilters()
    return true
  }

  function parseSizesToSet(value) {
    return new Set(
      parseCsvDataset(value)
        .map(normalizeCatalogSizeValue)
        .filter((size) => STANDARD_MATTRESS_SIZE_SET.has(size))
    )
  }

  function readCardMeta(card, index) {
    const dataset = card.dataset || {}
    return {
      card,
      initialOrder: index,
      slug: String(dataset.productSlug || ''),
      collection: String(dataset.collection || ''),
      firmness: String(dataset.firmness || ''),
      type: String(dataset.type || ''),
      height: Number(dataset.height || 0),
      load: Number(dataset.load || 0),
      loadRange: String(dataset.loadRange || '').trim(),
      heightRange: String(dataset.heightRange || '').trim(),
      sizes: (() => {
        const sizes = parseSizesToSet(dataset.sizes)
        if (sizes.size) return sizes
        const legacySizes = buildStandardMattressSizesFromLegacy(dataset.widths, dataset.lengths)
        return legacySizes.size ? legacySizes : new Set(STANDARD_MATTRESS_SIZES)
      })(),
      fillings: new Set(parseCsvDataset(dataset.fillings)),
      features: new Set(parseCsvDataset(dataset.features)),
    }
  }

  function updateCardsCache() {
    cards = [...catalogueNewCardsRoot.querySelectorAll('.catalogue-new-card')]
    cardMeta = cards.map((card, index) => {
      card.dataset.initialOrder = String(index)
      return readCardMeta(card, index)
    })
  }

  function readCatalogueFavourites() {
    return readCatalogFavourites()
  }

  function writeCatalogueFavourites(set) {
    writeCatalogFavourites(set)
  }

  function syncCatalogueFavouritesFilterSwitchState() {
    if (!catalogueNewFavouritesOnlySwitch) return
    const fav = readCatalogueFavourites()
    const n = fav.size
    const hadFavouritesFilter = state.favouritesOnly
    if (catalogueNewFavouritesCountEl) {
      catalogueNewFavouritesCountEl.textContent = String(n)
      catalogueNewFavouritesCountEl.toggleAttribute('hidden', n === 0)
    }
    if (n === 0) {
      state.favouritesOnly = false
      catalogueNewFavouritesOnlySwitch.classList.remove('is-on')
      catalogueNewFavouritesOnlySwitch.setAttribute('aria-checked', 'false')
      catalogueNewFavouritesOnlySwitch.disabled = true
      if (catalogueNewFavouritesLink) {
        catalogueNewFavouritesLink.classList.add('is-disabled')
        catalogueNewFavouritesLink.setAttribute('aria-disabled', 'true')
        catalogueNewFavouritesLink.tabIndex = -1
      }
      if (catalogueNewFavouritesContactBtn) {
        catalogueNewFavouritesContactBtn.disabled = true
      }
      if (catalogueNewFavouritesShareBtn) {
        catalogueNewFavouritesShareBtn.disabled = true
      }
      if (catalogueNewFavouritesActions) {
        catalogueNewFavouritesActions.hidden = true
      }
      if (hadFavouritesFilter) {
        visibleCardsLimit = CATALOGUE_PAGE_SIZE
        applyFilters()
      }
    } else {
      catalogueNewFavouritesOnlySwitch.disabled = false
      if (catalogueNewFavouritesLink) {
        catalogueNewFavouritesLink.classList.remove('is-disabled')
        catalogueNewFavouritesLink.removeAttribute('aria-disabled')
        catalogueNewFavouritesLink.removeAttribute('tabindex')
      }
      if (catalogueNewFavouritesContactBtn) {
        catalogueNewFavouritesContactBtn.disabled = false
      }
      if (catalogueNewFavouritesShareBtn) {
        catalogueNewFavouritesShareBtn.disabled = false
      }
    }
  }

  function emitCatalogueManagerContactIntent(detail) {
    const payload = {
      source: detail?.source || 'unknown',
      slugs: Array.isArray(detail?.slugs) ? detail.slugs.filter(Boolean) : [],
      title: String(detail?.title || '').trim(),
    }
    window.dispatchEvent(new CustomEvent('catalogue:contact-manager', { detail: payload }))
  }

  function syncCatalogueFavouritesUi() {
    const fav = readCatalogueFavourites()
    catalogueNewCardsRoot.querySelectorAll('.catalogue-new-favourite').forEach((btn) => {
      const slug = String(btn.dataset.productSlug || '')
      const on = Boolean(slug && fav.has(slug))
      btn.classList.toggle('is-active', on)
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
      btn.setAttribute('aria-label', on ? 'Удалить из избранного' : 'Добавить в избранное')
    })
    syncCatalogueFavouritesFilterSwitchState()
    // Не диспатчить catalogue:favourites-updated отсюда — слушатель вызывает syncCatalogueFavouritesUi() и получится бесконечная рекурсия.
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
  function setActiveSortOption(value) {
    if (catalogueNewSortTrigger) {
      const activeOption = catalogueNewSortOptions.find((option) => option.dataset.value === value)
      if (activeOption) catalogueNewSortTrigger.textContent = activeOption.textContent || 'Сортировка по умолчанию'
    }
    catalogueNewSortOptions.forEach((option) => {
      option.classList.toggle('is-active', option.dataset.value === value)
    })
  }

  function closeSortMenu() {
    if (!catalogueNewSort || !catalogueNewSortTrigger) return
    catalogueNewSort.classList.remove('is-open')
    catalogueNewSortTrigger.setAttribute('aria-expanded', 'false')
    const menu = catalogueNewSort.querySelector('.catalogue-new-sort-menu')
    if (menu) menu.hidden = true
  }

  function openSortMenu() {
    if (!catalogueNewSort || !catalogueNewSortTrigger) return
    catalogueNewSort.classList.add('is-open')
    catalogueNewSortTrigger.setAttribute('aria-expanded', 'true')
    const menu = catalogueNewSort.querySelector('.catalogue-new-sort-menu')
    if (menu) menu.hidden = false
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

    const toggleBySet = (selector, allowedSet) => {
      catalogueNewSidebar.querySelectorAll(selector).forEach((el) => {
        const value = String(el.dataset.value || '')
        const visible = value === 'all' || allowedSet.has(value)
        el.dataset.available = visible ? '1' : '0'
        const filteredOut = el.dataset.autocompleteHidden === '1'
        const shouldHide = !visible || filteredOut
        el.hidden = shouldHide
        const optionRow = el.closest('li')
        if (optionRow) optionRow.hidden = shouldHide
      })
    }

    toggleBySet('.catalogue-new-chip[data-filter-group="collection"]', available.collection)
    toggleBySet('.catalogue-new-chip[data-filter-group="firmness"]', available.firmness)
    toggleBySet('.catalogue-new-chip[data-filter-group="type"]', available.type)
    toggleBySet('.catalogue-new-chip[data-filter-group="loadRange"]', available.loadRange)
    toggleBySet('.catalogue-new-chip[data-filter-group="heightRange"]', available.heightRange)
    toggleBySet('.catalogue-new-chip[data-filter-group="fillings"]', available.fillings)
    toggleBySet('.catalogue-new-chip[data-filter-group="features"]', available.features)
    toggleBySet('.catalogue-new-size-select[data-size-group="size"] .catalogue-new-size-select-option', available.size)

    if (state.collection !== 'all' && !available.collection.has(state.collection)) state.collection = 'all'
    state.loadRange.forEach((value) => { if (!available.loadRange.has(value)) state.loadRange.delete(value) })
    state.heightRange.forEach((value) => { if (!available.heightRange.has(value)) state.heightRange.delete(value) })
    state.firmness.forEach((value) => { if (!available.firmness.has(value)) state.firmness.delete(value) })
    state.type.forEach((value) => { if (!available.type.has(value)) state.type.delete(value) })
    state.size.forEach((value) => { if (!available.size.has(value)) state.size.delete(value) })
    state.fillings.forEach((value) => { if (!available.fillings.has(value)) state.fillings.delete(value) })
    state.features.forEach((value) => { if (!available.features.has(value)) state.features.delete(value) })
    syncUiFromState()
  }

  function setSingleChipSelection(groupName, value) {
    const group = catalogueNewSidebar.querySelector(`.catalogue-new-filter-group[data-filter-group="${groupName}"]`)
    if (!group) return
    group.querySelectorAll(`.catalogue-new-chip[data-filter-group="${groupName}"]`).forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.value === value)
    })
  }

  function setFilterGroupDisabled(groupName, disabled) {
    const group = catalogueNewSidebar.querySelector(`.catalogue-new-filter-group[data-filter-group="${groupName}"]`)
    if (!group) return
    group.classList.toggle('is-disabled', disabled)
  }

  function syncFilterDependencies() {
    const topperOnly = state.type.size === 1 && state.type.has('topper')
    if (topperOnly) state.loadRange.clear()
    setFilterGroupDisabled('loadRange', topperOnly)
  }

  function syncUiFromState() {
    setSingleChipSelection('collection', state.collection)
    const setMultiChipSelection = (groupName, targetSet) => {
      catalogueNewSidebar.querySelectorAll(`.catalogue-new-chip[data-filter-group="${groupName}"]`).forEach((chip) => {
        const chipValue = String(chip.dataset.value || '')
        const isAll = chipValue === 'all'
        chip.classList.toggle('is-active', isAll ? targetSet.size === 0 : targetSet.has(chipValue))
      })
    }
    setMultiChipSelection('firmness', state.firmness)
    setMultiChipSelection('type', state.type)
    setMultiChipSelection('loadRange', state.loadRange)
    setMultiChipSelection('heightRange', state.heightRange)
    setMultiChipSelection('fillings', state.fillings)
    setMultiChipSelection('features', state.features)
    const sizeSelect = catalogueNewSidebar.querySelector('.catalogue-new-size-select[data-size-group="size"]')
    const resolveSizeSelectMenu = (sizeSelectEl) => {
      if (!sizeSelectEl) return null
      const localMenu = sizeSelectEl.querySelector('.catalogue-new-size-select-menu')
      if (localMenu) return localMenu
      if (activeSizeSelectHost === sizeSelectEl && activeSizeSelectMenu) return activeSizeSelectMenu
      return null
    }
    const setSizeSelectValue = (sizeSelectEl, targetSet) => {
      if (!sizeSelectEl) return
      const menu = resolveSizeSelectMenu(sizeSelectEl)
      const trigger = sizeSelectEl.querySelector('.catalogue-new-size-select-trigger')
      const options = menu ? [...menu.querySelectorAll('.catalogue-new-size-select-option')] : []
      options.forEach((option) => {
        const value = String(option.dataset.value || '')
        const isAll = value === 'all'
        option.classList.toggle('is-active', isAll ? targetSet.size === 0 : targetSet.has(value))
      })
      if (trigger) {
        if (!targetSet.size) {
          trigger.textContent = 'Любой'
        } else {
          const labels = options
            .filter((option) => {
              const value = String(option.dataset.value || '')
              return value !== 'all' && targetSet.has(value)
            })
            .map((option) => option.textContent.trim())
            .filter(Boolean)
          if (labels.length === 1) {
            trigger.textContent = labels[0]
          } else if (labels.length > 1) {
            trigger.textContent = `${labels[0]} +${labels.length - 1}`
          } else {
            trigger.textContent = 'Любой'
          }
        }
      }
    }
    setSizeSelectValue(sizeSelect, state.size)
    syncFilterDependencies()
  }

  function setAccordionGroupExpanded(groupEl, expanded) {
    if (!groupEl) return
    const trigger = groupEl.querySelector('.catalogue-new-filter-accordion-trigger')
    const panel = groupEl.querySelector('.catalogue-new-filter-accordion-panel')
    if (!trigger || !panel) return
    trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false')
    panel.hidden = !expanded
  }

  function openAccordionGroupExclusive(groupElToOpen) {
    const allGroups = catalogueNewSidebar.querySelectorAll('.catalogue-new-filter-group')
    allGroups.forEach((groupEl) => {
      const shouldExpand = groupEl === groupElToOpen
      setAccordionGroupExpanded(groupEl, shouldExpand)
    })
  }

  function initExclusiveAccordionState() {
    const groups = [...catalogueNewSidebar.querySelectorAll('.catalogue-new-filter-group')]
    const accordionGroups = groups.filter((groupEl) => groupEl.querySelector('.catalogue-new-filter-accordion-trigger'))
    if (accordionGroups.length === 0) return
    const firstExpanded =
      accordionGroups.find((groupEl) => {
        const trigger = groupEl.querySelector('.catalogue-new-filter-accordion-trigger')
        return trigger?.getAttribute('aria-expanded') === 'true'
      }) || accordionGroups[0]
    openAccordionGroupExclusive(firstExpanded)
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
    state.collection = 'all'
    state.firmness.clear()
    state.type.clear()
    state.size.clear()
    state.loadRange.clear()
    state.heightRange.clear()
    state.fillings.clear()
    state.features.clear()
    state.sort = 'default'
    syncUiFromState()
    setActiveSortOption('default')
    closeSortMenu()
    applySorting()
  }

  function showCatalogueFavouritesOnlyView() {
    const fav = readCatalogueFavourites()
    if (fav.size === 0) return
    resetCatalogueNewFilterChipsAndSort()
    state.favouritesOnly = true
    if (catalogueNewFavouritesOnlySwitch) {
      catalogueNewFavouritesOnlySwitch.classList.add('is-on')
      catalogueNewFavouritesOnlySwitch.setAttribute('aria-checked', 'true')
      catalogueNewFavouritesOnlySwitch.disabled = false
    }
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
      emitCatalogueManagerContactIntent({
        source: 'favourites',
        slugs: fav,
        title: 'Избранные позиции',
      })
    })
  }

  if (catalogueNewFavouritesBackBtn) {
    catalogueNewFavouritesBackBtn.addEventListener('click', () => {
      state.favouritesOnly = false
      if (catalogueNewFavouritesOnlySwitch) {
        catalogueNewFavouritesOnlySwitch.classList.remove('is-on')
        catalogueNewFavouritesOnlySwitch.setAttribute('aria-checked', 'false')
      }
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
    })
  }

  if (catalogueNewFavouritesShareBtn) {
    catalogueNewFavouritesShareBtn.addEventListener('click', () => {
      if (catalogueNewFavouritesShareBtn.disabled) return
      const fav = [...readCatalogueFavourites()]
      if (!fav.length) return
      window.dispatchEvent(new CustomEvent('catalogue:share', {
        detail: {
          source: 'favourites',
          slugs: fav,
          title: 'Избранные позиции',
        },
      }))
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
        const multiGroups = new Set(['firmness', 'type', 'loadRange', 'heightRange', 'fillings', 'features'])
        if (multiGroups.has(groupName)) {
          const targetSet =
            groupName === 'firmness' ? state.firmness :
            groupName === 'type' ? state.type :
            groupName === 'loadRange' ? state.loadRange :
            groupName === 'heightRange' ? state.heightRange :
            groupName === 'fillings' ? state.fillings :
            state.features
          if (value === 'all') {
            targetSet.clear()
          } else if (targetSet.has(value)) {
            targetSet.delete(value)
          } else {
            targetSet.add(value)
          }
          syncUiFromState()
        } else {
          if (groupName === 'collection') state.collection = value
          setSingleChipSelection(groupName, value)
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
    openAccordionGroupExclusive(groupEl)
  })

  const closeSizeSelectMenus = () => {
    if (sizeSelectScrollIndicatorTimer) {
      clearTimeout(sizeSelectScrollIndicatorTimer)
      sizeSelectScrollIndicatorTimer = null
    }
    if (activeSizeSelectMenu) {
      activeSizeSelectMenu.removeEventListener('wheel', handleActiveSizeMenuWheel)
      activeSizeSelectMenu.classList.remove('is-scrolling')
    }
    document.removeEventListener('wheel', handleGlobalWheelWhileSizeMenuOpen, true)
    if (activeSizeSelectMenu && activeSizeSelectHost && activeSizeSelectMenu.parentElement !== activeSizeSelectHost) {
      activeSizeSelectHost.appendChild(activeSizeSelectMenu)
    }
    if (activeSizeSelectMenu) {
      activeSizeSelectMenu.classList.remove('is-portal-open')
      activeSizeSelectMenu.style.removeProperty('--catalogue-new-size-menu-width')
      activeSizeSelectMenu.style.removeProperty('--catalogue-new-size-menu-max-height')
      activeSizeSelectMenu.style.removeProperty('top')
      activeSizeSelectMenu.style.removeProperty('left')
      activeSizeSelectMenu.style.removeProperty('display')
    }
    catalogueNewSidebar.querySelectorAll('.catalogue-new-size-select').forEach((sizeSelect) => {
      sizeSelect.classList.remove('is-open')
      resetSizeSelectAutocomplete(sizeSelect)
      const trigger = sizeSelect.querySelector('.catalogue-new-size-select-trigger')
      const menu = sizeSelect.querySelector('.catalogue-new-size-select-menu')
      if (trigger) trigger.setAttribute('aria-expanded', 'false')
      if (menu) menu.hidden = true
    })
    catalogueNewSidebar.classList.remove('is-size-select-open')
    activeSizeSelectHost = null
    activeSizeSelectTrigger = null
    activeSizeSelectMenu = null
  }

  let activeSizeSelectHost = null
  let activeSizeSelectTrigger = null
  let activeSizeSelectMenu = null
  let sizeSelectScrollIndicatorTimer = null

  const markSizeMenuAsScrolling = () => {
    if (!activeSizeSelectMenu) return
    activeSizeSelectMenu.classList.add('is-scrolling')
    if (sizeSelectScrollIndicatorTimer) clearTimeout(sizeSelectScrollIndicatorTimer)
    sizeSelectScrollIndicatorTimer = setTimeout(() => {
      if (activeSizeSelectMenu) activeSizeSelectMenu.classList.remove('is-scrolling')
    }, 650)
  }

  const applySizeSelectAutocomplete = (sizeSelect) => {
    if (!sizeSelect) return
    const menu = sizeSelect.querySelector('.catalogue-new-size-select-menu')
      || (activeSizeSelectHost === sizeSelect ? activeSizeSelectMenu : null)
    if (!menu) return
    const input = menu.querySelector('.catalogue-new-size-select-search')
    if (!input) return
    const query = String(input.value || '').trim().toLowerCase()
    menu.querySelectorAll('.catalogue-new-size-select-option').forEach((option) => {
      const value = String(option.dataset.value || '')
      if (value === 'all') {
        option.classList.remove('is-filtered-out')
        option.dataset.autocompleteHidden = '0'
        const available = option.dataset.available !== '0'
        option.hidden = !available
        const optionRow = option.closest('li')
        if (optionRow) optionRow.hidden = !available
        return
      }
      const text = option.textContent.trim().toLowerCase()
      const matched = !query || text.includes(query)
      option.classList.toggle('is-filtered-out', !matched)
      option.dataset.autocompleteHidden = matched ? '0' : '1'
      const available = option.dataset.available !== '0'
      const shouldHide = !available || !matched
      option.hidden = shouldHide
      const optionRow = option.closest('li')
      if (optionRow) optionRow.hidden = shouldHide
    })
  }

  const resetSizeSelectAutocomplete = (sizeSelect) => {
    if (!sizeSelect) return
    const menu = sizeSelect.querySelector('.catalogue-new-size-select-menu')
      || (activeSizeSelectHost === sizeSelect ? activeSizeSelectMenu : null)
    if (!menu) return
    const input = menu.querySelector('.catalogue-new-size-select-search')
    if (input) input.value = ''
    menu.querySelectorAll('.catalogue-new-size-select-option').forEach((option) => {
      option.classList.remove('is-filtered-out')
      option.dataset.autocompleteHidden = '0'
      const available = option.dataset.available !== '0'
      option.hidden = !available
      const optionRow = option.closest('li')
      if (optionRow) optionRow.hidden = !available
    })
  }

  const handleActiveSizeMenuWheel = (event) => {
    if (!activeSizeSelectMenu || !activeSizeSelectMenu.contains(event.target)) return
    event.preventDefault()
    event.stopPropagation()
    activeSizeSelectMenu.scrollTop += event.deltaY
    markSizeMenuAsScrolling()
  }

  const handleGlobalWheelWhileSizeMenuOpen = (event) => {
    if (!activeSizeSelectMenu || !activeSizeSelectMenu.contains(event.target)) return
    event.preventDefault()
    event.stopPropagation()
    activeSizeSelectMenu.scrollTop += event.deltaY
    markSizeMenuAsScrolling()
  }

  const placeActiveSizeSelectMenu = () => {
    if (!activeSizeSelectMenu || !activeSizeSelectTrigger) return
    if (activeSizeSelectMenu.hidden) return
    const rect = activeSizeSelectTrigger.getBoundingClientRect()
    const viewportPadding = 8
    const nextLeft = Math.max(viewportPadding, Math.round(rect.left))
    const nextTop = Math.max(viewportPadding, Math.round(rect.bottom + 6))
    activeSizeSelectMenu.style.left = `${nextLeft}px`
    activeSizeSelectMenu.style.top = `${nextTop}px`
    activeSizeSelectMenu.style.setProperty('--catalogue-new-size-menu-width', `${Math.round(rect.width)}px`)
    activeSizeSelectMenu.style.setProperty('--catalogue-new-size-menu-max-height', 'calc(var(--catalogue-new-size-option-height) * 8)')
  }

  const applySizeSelectOption = (option) => {
    if (!option) return false
    const sizeSelect = option.closest('.catalogue-new-size-select') || activeSizeSelectHost
    if (!sizeSelect) return false
    const groupName = sizeSelect.dataset.sizeGroup
    const value = String(option.dataset.value || 'all')
    const targetSet = groupName === 'size' ? state.size : null
    if (!targetSet) return false
    const shouldCloseAfterSelect = value === 'all'
    if (value === 'all') {
      targetSet.clear()
    } else if (targetSet.has(value)) {
      targetSet.delete(value)
    } else {
      targetSet.add(value)
    }
    syncUiFromState()
    if (shouldCloseAfterSelect) closeSizeSelectMenus()
    visibleCardsLimit = CATALOGUE_PAGE_SIZE
    applyFilters()
    return true
  }

  catalogueNewSidebar.addEventListener('click', (event) => {
    const trigger = event.target.closest('.catalogue-new-size-select-trigger')
    if (trigger) {
      const sizeSelect = trigger.closest('.catalogue-new-size-select')
      if (!sizeSelect) return
      const isOpen = sizeSelect.classList.contains('is-open')
      closeSizeSelectMenus()
      if (!isOpen) {
        sizeSelect.classList.add('is-open')
        trigger.setAttribute('aria-expanded', 'true')
        const menu = sizeSelect.querySelector('.catalogue-new-size-select-menu')
        if (menu) {
          activeSizeSelectHost = sizeSelect
          activeSizeSelectTrigger = trigger
          activeSizeSelectMenu = menu
          document.documentElement.appendChild(menu)
          menu.classList.add('is-portal-open')
          menu.hidden = false
          menu.style.display = 'block'
          menu.addEventListener('wheel', handleActiveSizeMenuWheel, { passive: false })
          document.addEventListener('wheel', handleGlobalWheelWhileSizeMenuOpen, { passive: false, capture: true })
          placeActiveSizeSelectMenu()
          resetSizeSelectAutocomplete(sizeSelect)
        }
        catalogueNewSidebar.classList.add('is-size-select-open')
      }
      return
    }

    const option = event.target.closest('.catalogue-new-size-select-option')
    if (!option) return
    event.preventDefault()
    event.stopPropagation()
    applySizeSelectOption(option)
  })

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
      state.favouritesOnly = !state.favouritesOnly
      catalogueNewFavouritesOnlySwitch.classList.toggle('is-on', state.favouritesOnly)
      catalogueNewFavouritesOnlySwitch.setAttribute('aria-checked', state.favouritesOnly ? 'true' : 'false')
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
      scrollToCatalogueToolbar()
    })
  }

  if (catalogueNewSort && catalogueNewSortTrigger && catalogueNewSortOptions.length > 0) {
    catalogueNewSortTrigger.addEventListener('click', () => {
      const isOpen = catalogueNewSort.classList.contains('is-open')
      if (isOpen) {
        closeSortMenu()
      } else {
        openSortMenu()
      }
    })

    catalogueNewSortOptions.forEach((option) => {
      option.addEventListener('click', () => {
        state.sort = option.dataset.value || 'default'
        setActiveSortOption(state.sort)
        closeSortMenu()
        applySorting()
        visibleCardsLimit = CATALOGUE_PAGE_SIZE
        applyFilters()
        scrollToCatalogueToolbar()
      })
    })

    document.addEventListener('click', (event) => {
      const sizeOption = event.target.closest('.catalogue-new-size-select-option')
      if (sizeOption && activeSizeSelectMenu && activeSizeSelectMenu.contains(sizeOption)) {
        event.preventDefault()
        event.stopPropagation()
        applySizeSelectOption(sizeOption)
        return
      }
      if (!catalogueNewSort.contains(event.target)) {
        closeSortMenu()
      }
      const clickedInsidePortalSizeMenu = Boolean(activeSizeSelectMenu && activeSizeSelectMenu.contains(event.target))
      if (!catalogueNewSidebar.contains(event.target) && !clickedInsidePortalSizeMenu) {
        closeSizeSelectMenus()
      }
    })

    window.addEventListener('resize', placeActiveSizeSelectMenu)
    document.addEventListener('scroll', placeActiveSizeSelectMenu, true)

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSortMenu()
        closeSizeSelectMenus()
      }
    })

    setActiveSortOption('default')
  }

  const onSizeSelectSearchInput = (event) => {
    const searchInput = event.target.closest('.catalogue-new-size-select-search')
    if (!searchInput) return
    const sizeSelect = searchInput.closest('.catalogue-new-size-select') || activeSizeSelectHost
    applySizeSelectAutocomplete(sizeSelect)
  }
  catalogueNewSidebar.addEventListener('input', onSizeSelectSearchInput)
  document.addEventListener('input', onSizeSelectSearchInput)

  if (catalogueNewReset) {
    catalogueNewReset.addEventListener('click', () => {
      resetCatalogueNewFilterChipsAndSort()
      state.favouritesOnly = false
      if (catalogueNewFavouritesOnlySwitch) {
        catalogueNewFavouritesOnlySwitch.classList.remove('is-on')
        catalogueNewFavouritesOnlySwitch.setAttribute('aria-checked', 'false')
      }
      syncCatalogueFavouritesFilterSwitchState()
      visibleCardsLimit = CATALOGUE_PAGE_SIZE
      applyFilters()
      scrollToCatalogueToolbar()
    })
  }

  const openMobileFiltersDrawer = () => {
    if (!catalogueNewSidebar || !catalogueNewMobileFiltersOverlay) return
    if (window.innerWidth > 1024) return
    catalogueNewSidebar.classList.add('is-open')
    catalogueNewMobileFiltersOverlay.hidden = false
    if (typeof lockScroll === 'function') lockScroll()
  }
  const closeMobileFiltersDrawer = () => {
    if (!catalogueNewSidebar || !catalogueNewMobileFiltersOverlay) return
    catalogueNewSidebar.classList.remove('is-open')
    catalogueNewMobileFiltersOverlay.hidden = true
    if (typeof unlockScroll === 'function') unlockScroll()
  }
  if (catalogueNewMobileFiltersOpen) {
    catalogueNewMobileFiltersOpen.addEventListener('click', openMobileFiltersDrawer)
  }
  if (catalogueNewMobileFiltersClose) {
    catalogueNewMobileFiltersClose.addEventListener('click', closeMobileFiltersDrawer)
  }
  if (catalogueNewMobileFiltersOverlay) {
    catalogueNewMobileFiltersOverlay.addEventListener('click', closeMobileFiltersDrawer)
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileFiltersDrawer()
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
      threshold: 0
    })
    observer.observe(infiniteSentinel)
  } else {
    visibleCardsLimit = Number.MAX_SAFE_INTEGER
  }

  const lockScrollWithinSidebar = () => {
    const sidebar = catalogueNewSidebar
    if (!sidebar) return

    const isInsideSidebar = (target) => target instanceof Element && sidebar.contains(target)
    const canScroll = () => sidebar.scrollHeight > sidebar.clientHeight + 1

    const handleWheelCapture = (event) => {
      if (activeSizeSelectMenu && !activeSizeSelectMenu.hidden) return
      if (!isInsideSidebar(event.target)) return
      if (!canScroll()) return
      event.preventDefault()
      event.stopPropagation()
      sidebar.scrollTop += event.deltaY
    }

    let lastTouchY = 0
    const handleTouchStartCapture = (event) => {
      if (!isInsideSidebar(event.target)) return
      if (!event.touches || event.touches.length === 0) return
      lastTouchY = event.touches[0].clientY
    }
    const handleTouchMoveCapture = (event) => {
      if (!isInsideSidebar(event.target)) return
      if (!canScroll()) return
      if (!event.touches || event.touches.length === 0) return
      const currentY = event.touches[0].clientY
      const delta = lastTouchY - currentY
      lastTouchY = currentY
      event.preventDefault()
      event.stopPropagation()
      sidebar.scrollTop += delta
    }

    document.addEventListener('wheel', handleWheelCapture, { passive: false, capture: true })
    document.addEventListener('touchstart', handleTouchStartCapture, { passive: true, capture: true })
    document.addEventListener('touchmove', handleTouchMoveCapture, { passive: false, capture: true })
  }
  lockScrollWithinSidebar()

  if (catalogueNewLayout) {
    const stickyTopOffset = 16
    const desktopMedia = window.matchMedia('(min-width: 1025px)')
    const readFirstGridTrackWidthPx = (layoutEl) => {
      const tpl = window.getComputedStyle(layoutEl).gridTemplateColumns || ''
      const first = tpl.trim().split(/\s+/)[0] || ''
      const m = /^([\d.]+)px$/i.exec(first)
      if (m) {
        const n = parseFloat(m[1])
        return Number.isFinite(n) && n > 0 ? Math.round(n) : 320
      }
      return 320
    }
    const readBodyScale = () => {
      const computed = window.getComputedStyle(document.body).transform
      if (!computed || computed === 'none') return 1
      const match2d = computed.match(/^matrix\(([^)]+)\)$/)
      if (match2d) {
        const parts = match2d[1].split(',').map((v) => Number(v.trim()))
        return Number.isFinite(parts[0]) && parts[0] > 0 ? parts[0] : 1
      }
      const match3d = computed.match(/^matrix3d\(([^)]+)\)$/)
      if (match3d) {
        const parts = match3d[1].split(',').map((v) => Number(v.trim()))
        return Number.isFinite(parts[0]) && parts[0] > 0 ? parts[0] : 1
      }
      return 1
    }
    const syncStickySidebar = () => {
      const isDesktop = desktopMedia.matches
      if (!isDesktop) {
        stickyPlaceholder.classList.remove('is-active')
        stickyPlaceholder.style.height = ''
        catalogueNewSidebar.classList.remove('is-fixed', 'is-bottom')
        catalogueNewSidebar.style.width = ''
        catalogueNewSidebar.style.left = ''
        catalogueNewSidebar.style.top = ''
        return
      }
      const layoutRect = catalogueNewLayout.getBoundingClientRect()
      const sidebarHeight = catalogueNewSidebar.offsetHeight
      const sidebarVisualHeight = catalogueNewSidebar.getBoundingClientRect().height || sidebarHeight
      const bodyScale = readBodyScale()
      const reachedStickyArea = layoutRect.top <= stickyTopOffset
      const hasRoomInLayout = layoutRect.bottom - stickyTopOffset > 120
      const shouldFix = reachedStickyArea && hasRoomInLayout && (layoutRect.bottom - stickyTopOffset > sidebarVisualHeight)

      stickyPlaceholder.style.height = shouldFix ? `${sidebarHeight}px` : ''
      stickyPlaceholder.classList.toggle('is-active', shouldFix)
      catalogueNewSidebar.classList.toggle('is-fixed', shouldFix)
      catalogueNewSidebar.classList.remove('is-bottom')
      if (shouldFix) {
        // Измерять плейсхолдер только после is-active: до toggle он display:none → rect.width === 0 и сайдбар «схлопывается».
        // Не брать catalogueNewSidebar.offsetWidth: у только что ставшего fixed он часто = ширине вьюпорта.
        // Ширину не больше 1-й колонки грида (см. catalog-page.css): иначе rect/zoom дают >320px и сайдбар залезает на контент.
        const phRect = stickyPlaceholder.getBoundingClientRect()
        const scaleSafe = bodyScale > 0 ? bodyScale : 1
        const colW = readFirstGridTrackWidthPx(catalogueNewLayout)
        const measured = Math.max(phRect.width, stickyPlaceholder.offsetWidth, 1)
        const rawW = measured >= 8 ? Math.min(colW, measured) : colW
        const widthPx = Math.max(1, Math.round(rawW / scaleSafe))
        catalogueNewSidebar.style.width = `${widthPx}px`
        catalogueNewSidebar.style.left = `${Math.round(phRect.left / scaleSafe)}px`
        catalogueNewSidebar.style.top = `${(stickyTopOffset / scaleSafe).toFixed(2)}px`
      } else {
        catalogueNewSidebar.style.width = ''
        catalogueNewSidebar.style.left = ''
        catalogueNewSidebar.style.top = ''
      }
    }

    let stickyRaf = 0
    scheduleStickySidebarSync = () => {
      if (stickyRaf) cancelAnimationFrame(stickyRaf)
      stickyRaf = requestAnimationFrame(() => {
        stickyRaf = 0
        syncStickySidebar()
      })
    }

    scheduleStickySidebarSync()
    window.addEventListener('scroll', scheduleStickySidebarSync, { passive: true })
    window.addEventListener('resize', scheduleStickySidebarSync)
    desktopMedia.addEventListener('change', scheduleStickySidebarSync)
  }

  applySorting()
  syncUiFromState()
  initExclusiveAccordionState()
  syncFilterOptionsFromCards()
  applyFilters()
  loadCatalogueFiltersFromStrapi()
  loadCatalogueFromStrapi()
}

const catalogueNewViewButtons = document.querySelectorAll('.catalogue-new-view-btn')
if (catalogueNewViewButtons.length > 0) {
  const catalogueNewCards = document.querySelector('.catalogue-new-cards')

  catalogueNewViewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      catalogueNewViewButtons.forEach((item) => {
        const isActive = item === button
        item.classList.toggle('is-active', isActive)
        if (isActive) {
          item.setAttribute('aria-pressed', 'true')
        } else {
          item.setAttribute('aria-pressed', 'false')
        }
      })

      if (catalogueNewCards) {
        catalogueNewCards.classList.toggle('is-list-view', button.dataset.view === 'list')
      }
    })
  })
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
  let activeModalProductSlug = ''
  let activeModalProductTitle = ''

  const readModalFavourites = () => {
    return readCatalogFavourites()
  }

  const writeModalFavourites = (set) => {
    writeCatalogFavourites(set)
  }

  const clearModalSpecs = () => {
    catalogueImageModalSpecs.replaceChildren()
    catalogueImageModalSpecsEmpty.hidden = true
  }

  const syncModalFavouriteState = () => {
    const favSet = readModalFavourites()
    const isActive = Boolean(activeModalProductSlug && favSet.has(activeModalProductSlug))
    catalogueImageModalFavouriteBtn.classList.toggle('is-active', isActive)
    catalogueImageModalFavouriteBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    catalogueImageModalFavouriteBtn.setAttribute('aria-label', isActive ? 'Удалить из избранного' : 'Добавить в избранное')
  }

  const appendModalSpec = (label, value) => {
    if (!value) return
    const row = document.createElement('div')
    row.className = 'catalogue-new-image-modal-spec'
    const labelEl = document.createElement('span')
    labelEl.className = 'catalogue-new-image-modal-spec-label'
    labelEl.textContent = label
    const valueEl = document.createElement('span')
    valueEl.className = 'catalogue-new-image-modal-spec-value'
    valueEl.textContent = value
    row.append(labelEl, valueEl)
    catalogueImageModalSpecs.appendChild(row)
  }

  const closeCatalogueImageModal = () => {
    catalogueImageModal.setAttribute('hidden', '')
    catalogueImageModalImg.setAttribute('src', '')
    catalogueImageModalImg.setAttribute('alt', '')
    catalogueImageModalTitle.textContent = ''
    activeModalProductSlug = ''
    activeModalProductTitle = ''
    syncModalFavouriteState()
    clearModalSpecs()
    if (typeof unlockScroll === 'function') unlockScroll()
    document.body.classList.remove('modal-open')
  }

  const openCatalogueImageModal = (card) => {
    if (!card) return
    const image = card.querySelector('picture img')
    const src = image?.getAttribute('src') || ''
    const alt = image?.getAttribute('alt') || ''
    const title = card.querySelector('.catalogue-new-card-body h3')?.textContent?.trim() || alt
    if (!src) return

    const dataset = card.dataset || {}
    activeModalProductSlug = String(dataset.productSlug || '').trim()
    activeModalProductTitle = title || 'Матрас'
    syncModalFavouriteState()

    catalogueImageModalImg.setAttribute('src', src)
    catalogueImageModalImg.setAttribute('alt', alt || '')
    catalogueImageModalTitle.textContent = title || 'Матрас'
    clearModalSpecs()
    buildCatalogModalSpecs(dataset).forEach((spec) => {
      appendModalSpec(spec.label, spec.value)
    })
    if (!catalogueImageModalSpecs.childElementCount) {
      catalogueImageModalSpecsEmpty.hidden = false
    }
    catalogueImageModal.removeAttribute('hidden')
    if (typeof lockScroll === 'function') lockScroll()
    document.body.classList.add('modal-open')
  }

  catalogueImageModalContactBtn.addEventListener('click', () => {
    if (!activeModalProductSlug) return
    window.dispatchEvent(new CustomEvent('catalogue:contact-manager', {
      detail: {
        source: 'modal-position',
        slugs: [activeModalProductSlug],
        title: activeModalProductTitle,
      },
    }))
  })

  catalogueImageModalFavouriteBtn.addEventListener('click', () => {
    if (!activeModalProductSlug) return
    const favSet = readModalFavourites()
    if (favSet.has(activeModalProductSlug)) favSet.delete(activeModalProductSlug)
    else favSet.add(activeModalProductSlug)
    writeModalFavourites(favSet)
    window.dispatchEvent(new CustomEvent('catalogue:favourites-updated'))
    syncModalFavouriteState()
  })

  window.addEventListener('catalogue:favourites-updated', syncModalFavouriteState)

  catalogueCardsRootForModal.addEventListener('click', (event) => {
    if (event.target.closest('.catalogue-new-favourite')) return
    const card = event.target.closest('.catalogue-new-card')
    if (!card) return
    openCatalogueImageModal(card)
  })

  if (catalogueImageModalClose) {
    catalogueImageModalClose.addEventListener('click', (event) => {
      event.stopPropagation()
      closeCatalogueImageModal()
    })
  }

  catalogueImageModal.addEventListener('click', (event) => {
    if (event.target === catalogueImageModal) closeCatalogueImageModal()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !catalogueImageModal.hasAttribute('hidden')) {
      closeCatalogueImageModal()
    }
  })
}

// Collections slider with LERP and parallax
const slider = document.querySelector('.collections-grid')
const prevBtn = document.querySelector('.collections-arrows .arrow-btn.prev')
const nextBtn = document.querySelector('.collections-arrows .arrow-btn.next')
const progressFill = document.querySelector('.collections-progress-fill')

if (slider && prevBtn && nextBtn && progressFill) {
  const cards = slider.querySelectorAll('.collection-card')
  const cardImages = slider.querySelectorAll('.collection-image img')

  function getVisibleCollectionCards() {
    return [...cards].filter((c) => c.offsetWidth > 0)
  }

  function getMaxCollectionScroll() {
    return Math.max(0, slider.scrollWidth - slider.clientWidth)
  }

  /** Позиции с snap: выравнивание по левому краю каждой карточки + край с отступом справа (::after) */
  function getCollectionSnapPositions() {
    const maxScroll = getMaxCollectionScroll()
    const visible = getVisibleCollectionCards()
    if (!visible.length) return [0, maxScroll]
    const firstLeft = visible[0].offsetLeft
    const fromCards = visible.map((c) => c.offsetLeft - firstLeft)
    const merged = [...new Set([0, ...fromCards, maxScroll])]
    return merged
      .map((p) => Math.max(0, Math.min(maxScroll, p)))
      .filter((p, i, a) => a.indexOf(p) === i)
      .sort((a, b) => a - b)
  }

  function snapCollectionToNearest() {
    const maxScroll = getMaxCollectionScroll()
    const positions = getCollectionSnapPositions()
    if (!positions.length) return
    let best = positions[0]
    let bestDist = Infinity
    for (const p of positions) {
      const d = Math.abs(state.targetX - p)
      if (d < bestDist) {
        bestDist = d
        best = p
      }
    }
    state.targetX = Math.max(0, Math.min(maxScroll, best))
  }

  function goCollectionPrev() {
    const positions = getCollectionSnapPositions()
    const cur = state.targetX
    const prev = [...positions].reverse().find((p) => p < cur - 2)
    state.targetX = prev !== undefined ? prev : 0
  }

  function goCollectionNext() {
    const maxScroll = getMaxCollectionScroll()
    const positions = getCollectionSnapPositions()
    const cur = state.targetX
    const next = positions.find((p) => p > cur + 2)
    state.targetX = next !== undefined ? next : maxScroll
  }

  // State for smooth scrolling
  const state = {
    currentX: 0,
    targetX: 0,
    isDragging: false,
    startX: 0,
    lastX: 0,
    lastMouseX: 0
  }

  // LERP factor for smooth animation
  const LERP_FACTOR = 0.08
  
  // Set up images for parallax
  cardImages.forEach(img => {
    img.style.willChange = 'transform'
    img.style.transformOrigin = 'center center'
  })
  
  // Update parallax effect on images (offset < scale overflow so image always fills container)
  const scale = 1.25
  function updateParallax() {
    const viewportCenter = window.innerWidth / 2

    cards.forEach((card) => {
      const img = card.querySelector('.collection-image img')
      if (!img) return

      const cardRect = card.getBoundingClientRect()
      if (cardRect.right < -500 || cardRect.left > window.innerWidth + 500) {
        return
      }

      const maxParallaxPx = (cardRect.width * (scale - 1)) / 2
      const coefficient = (maxParallaxPx / (viewportCenter || 1)) * 0.9
      const cardCenter = cardRect.left + cardRect.width / 2
      const distanceFromCenter = cardCenter - viewportCenter
      const parallaxOffset = distanceFromCenter * -coefficient

      img.style.transform = `translateX(${parallaxOffset}px) scale(${scale})`
    })
  }
  
  // Update progress bar and buttons
  function updateUI() {
    const maxScroll = getMaxCollectionScroll()
    const scrollProgress = maxScroll > 0 ? Math.min(1, Math.max(0, state.currentX / maxScroll)) : 0
    
    const visibleRatio = slider.clientWidth / slider.scrollWidth
    const thumbWidth = Math.max(visibleRatio * 100, 15)
    const trackSpace = 100 - thumbWidth
    const thumbPosition = scrollProgress * trackSpace
    
    progressFill.style.width = `${thumbWidth}%`
    progressFill.style.left = `${thumbPosition}%`
    
    const prevDisabled = state.currentX <= 1
    const nextDisabled = state.currentX >= maxScroll - 1
    
    prevBtn.style.opacity = prevDisabled ? '0.25' : '0.7'
    nextBtn.style.opacity = nextDisabled ? '0.25' : '0.7'
    prevBtn.disabled = prevDisabled
    nextBtn.disabled = nextDisabled
  }
  
  // Main animation loop
  function animate() {
    // Limit targetX to valid range
    const maxScroll = getMaxCollectionScroll()
    state.targetX = Math.max(0, Math.min(maxScroll, state.targetX))
    
    // LERP interpolation for smooth movement
    state.currentX += (state.targetX - state.currentX) * LERP_FACTOR
    
    // Apply transform
    slider.style.transform = `translate3d(${-state.currentX}px, 0, 0)`
    
    // Update parallax and UI
    updateParallax()
    updateUI()
    
    requestAnimationFrame(animate)
  }
  
  // Arrow navigation — ровно на ширину слайда (по реальной геометрии карточек)
  prevBtn.addEventListener('click', () => {
    goCollectionPrev()
  })

  nextBtn.addEventListener('click', () => {
    goCollectionNext()
  })
  
  // Mouse drag
  slider.addEventListener('mousedown', (e) => {
    state.isDragging = true
    state.startX = e.clientX
    state.lastMouseX = e.clientX
    state.lastX = state.targetX
    slider.classList.add('active')
    e.preventDefault()
  })
  
  document.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return
    e.preventDefault()
    const deltaX = (e.clientX - state.lastMouseX) * 2
    state.targetX -= deltaX
    state.lastMouseX = e.clientX
  })
  
  document.addEventListener('mouseup', () => {
    if (state.isDragging) {
      state.isDragging = false
      slider.classList.remove('active')
      snapCollectionToNearest()
    }
  })

  slider.addEventListener('mouseleave', () => {
    if (state.isDragging) {
      state.isDragging = false
      slider.classList.remove('active')
      snapCollectionToNearest()
    }
  })
  
  // Touch support
  slider.addEventListener('touchstart', (e) => {
    state.isDragging = true
    state.startX = e.touches[0].clientX
    state.lastX = state.targetX
    slider.classList.add('active')
  }, { passive: false })
  
  slider.addEventListener('touchmove', (e) => {
    if (!state.isDragging) return
    const deltaX = (e.touches[0].clientX - state.startX) * 1.5
    state.targetX = state.lastX - deltaX
  }, { passive: false })
  
  slider.addEventListener('touchend', () => {
    state.isDragging = false
    slider.classList.remove('active')
    snapCollectionToNearest()
  })

  slider.addEventListener('touchcancel', () => {
    state.isDragging = false
    slider.classList.remove('active')
    snapCollectionToNearest()
  })

  // Prevent default drag behavior
  slider.addEventListener('dragstart', (e) => e.preventDefault())
  
  // Initialize
  slider.style.overflow = 'visible'
  slider.style.transform = 'translate3d(0, 0, 0)'
  state.currentX = 0
  state.targetX = 0

  window.addEventListener('resize', () => {
    const maxScroll = getMaxCollectionScroll()
    state.targetX = Math.min(state.targetX, maxScroll)
    snapCollectionToNearest()
  })

  // Start animation loop
  animate()

  // Animate cards on initial load
  if (cards.length > 0) {
    gsap.set(cards, { opacity: 0, y: 30 })

    // threshold: 0 — иначе на узких экранах «peek» соседней карточки <10% площади и она остаётся opacity:0
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          gsap.to(entry.target, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: index * 0.1,
            ease: 'power2.out'
          })
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0 })

    requestAnimationFrame(() => {
      cards.forEach((card) => observer.observe(card))
    })
  }
}

// Testimonials slider with LERP, parallax and autoplay
const testimonialsSlider = document.querySelector('.testimonials-grid')
const testimonialsSection = document.querySelector('.testimonials')

if (testimonialsSlider && testimonialsSection) {
  let testimonialCards = testimonialsSlider.querySelectorAll('.testimonial-card')
  const originalCardCount = testimonialCards.length

  const isMobileTestimonials = () => window.matchMedia('(max-width: 1024px)').matches
  const getSliderGap = () => {
    const styles = window.getComputedStyle(testimonialsSlider)
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '32')
    return Number.isFinite(gap) ? gap : 32
  }
  const getCardSpan = () => {
    const card = testimonialCards[0]
    return card ? card.offsetWidth + getSliderGap() : 0
  }
  const getCardsPerStep = () => (isMobileTestimonials() ? 1 : 2)
  const snapToNearestCard = () => {
    if (!isMobileTestimonials()) return
    const cardSpan = getCardSpan()
    if (!cardSpan) return
    state.targetX = Math.round(state.targetX / cardSpan) * cardSpan
  }
  
  // Duplicate cards for infinite loop (5 copies for smoother transition)
  if (originalCardCount > 0) {
    const copies = 5
    const sequenceWidth = getCardSpan() * originalCardCount
    
    // Clone cards
    for (let i = 0; i < copies; i++) {
      testimonialCards.forEach(card => {
        const clone = card.cloneNode(true)
        testimonialsSlider.appendChild(clone)
      })
    }
    
    // Update cards list
    testimonialCards = testimonialsSlider.querySelectorAll('.testimonial-card')
    
    // Start from middle copy (copy 2 of 5, so we have 2 copies before and 2 after)
    const startOffset = sequenceWidth * 2
    testimonialsSlider.style.transform = `translate3d(${-startOffset}px, 0, 0)`
  }
  
  // State for smooth scrolling
  const state = {
    currentX: originalCardCount > 0 ? getCardSpan() * originalCardCount * 2 : 0,
    targetX: originalCardCount > 0 ? getCardSpan() * originalCardCount * 2 : 0,
    isDragging: false,
    startX: 0,
    lastX: 0,
    lastMouseX: 0,
    isUserInteracting: false,
    isInView: false
  }
  
  // LERP factor for smooth animation (lower = smoother but slower)
  const LERP_FACTOR = 0.05
  const AUTOPLAY_LERP_FACTOR = 0.03 // Slower for autoplay
  let autoplayInterval = null
  let isAutoplayActive = false
  
  // Animate cards on initial load
  if (testimonialCards.length > 0) {
    gsap.set(testimonialCards, { opacity: 0, x: 50 })
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          gsap.to(entry.target, {
            opacity: 1,
            x: 0,
            duration: 0.7,
            delay: index * 0.08,
            ease: 'power2.out'
          })
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1 })
    
    testimonialCards.forEach(card => observer.observe(card))
  }
  
  // Get actual card width + gap for 2 columns
  const getScrollStep = () => {
    const cardSpan = getCardSpan()
    return cardSpan ? cardSpan * getCardsPerStep() : 1000
  }
  
  // Get sequence width (one full set of original cards)
  const getSequenceWidth = () => {
    const cardSpan = getCardSpan()
    return cardSpan ? cardSpan * originalCardCount : 0
  }
  
  
  // Autoplay function
  function startAutoplay() {
    if (autoplayInterval) return
    isAutoplayActive = true
    autoplayInterval = setInterval(() => {
      if (state.isUserInteracting || !state.isInView) {
        isAutoplayActive = false
        return
      }
      
      // Infinite loop - just keep moving forward
      state.targetX += getScrollStep()
    }, 16000) // 2x slower (was 8000)
  }
  
  function stopAutoplay() {
    if (autoplayInterval) {
      clearInterval(autoplayInterval)
      autoplayInterval = null
      isAutoplayActive = false
    }
  }
  
  // Intersection Observer - start autoplay when 2/3 visible
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      state.isInView = entry.isIntersecting
      if (entry.isIntersecting) {
        startAutoplay()
      } else {
        stopAutoplay()
      }
    })
  }, {
    threshold: 0.66
  })
  
  sectionObserver.observe(testimonialsSection)
  
  // Main animation loop
  function animate() {
    const sequenceWidth = getSequenceWidth()
    
    // Use slower LERP for autoplay, faster for manual interaction
    const lerpFactor = isAutoplayActive && !state.isDragging ? AUTOPLAY_LERP_FACTOR : LERP_FACTOR
    
    // LERP interpolation for smooth movement
    state.currentX += (state.targetX - state.currentX) * lerpFactor
    
    // Handle infinite loop - reset position when reaching boundaries
    // Check both currentX and targetX to prevent visible edge
    const minBound = sequenceWidth * 1.5  // Start checking earlier
    const maxBound = sequenceWidth * 2.5  // Start checking earlier
    
    if (state.currentX > maxBound || state.targetX > maxBound) {
      // Moved too far right, jump back one sequence
      const offset = sequenceWidth
      state.currentX -= offset
      state.targetX -= offset
    } else if (state.currentX < minBound || state.targetX < minBound) {
      // Moved too far left, jump forward one sequence
      const offset = sequenceWidth
      state.currentX += offset
      state.targetX += offset
    }
    
    // Apply transform
    testimonialsSlider.style.transform = `translate3d(${-state.currentX}px, 0, 0)`
    
    requestAnimationFrame(animate)
  }
  
  // Mouse drag
  testimonialsSlider.addEventListener('mousedown', (e) => {
    state.isDragging = true
    state.isUserInteracting = true
    stopAutoplay() // Stop autoplay on drag
    state.startX = e.clientX
    state.lastMouseX = e.clientX
    state.lastX = state.targetX
    testimonialsSlider.classList.add('active')
    e.preventDefault()
  })
  
  document.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return
    e.preventDefault()
    const deltaX = (e.clientX - state.lastMouseX) * 2
    state.targetX -= deltaX
    state.lastMouseX = e.clientX
  })
  
  document.addEventListener('mouseup', () => {
    if (state.isDragging) {
      state.isDragging = false
      testimonialsSlider.classList.remove('active')
      snapToNearestCard()
      setTimeout(() => {
        state.isUserInteracting = false
      }, 300)
    }
  })
  
  testimonialsSlider.addEventListener('mouseleave', () => {
    if (state.isDragging) {
      state.isDragging = false
      testimonialsSlider.classList.remove('active')
      snapToNearestCard()
      setTimeout(() => {
        state.isUserInteracting = false
      }, 300)
    }
  })
  
  // Touch support
  testimonialsSlider.addEventListener('touchstart', (e) => {
    state.isDragging = true
    state.isUserInteracting = true
    stopAutoplay() // Stop autoplay on drag
    state.startX = e.touches[0].clientX
    state.lastX = state.targetX
    testimonialsSlider.classList.add('active')
  }, { passive: false })
  
  testimonialsSlider.addEventListener('touchmove', (e) => {
    if (!state.isDragging) return
    const deltaX = (e.touches[0].clientX - state.startX) * 1.5
    state.targetX = state.lastX - deltaX
  }, { passive: false })
  
  testimonialsSlider.addEventListener('touchend', () => {
    state.isDragging = false
    testimonialsSlider.classList.remove('active')
    snapToNearestCard()
    setTimeout(() => {
      state.isUserInteracting = false
    }, 300)
  })
  
  // Pause autoplay on hover
  testimonialsSlider.addEventListener('mouseenter', () => {
    state.isUserInteracting = true
  })
  
  testimonialsSlider.addEventListener('mouseleave', () => {
    if (!state.isDragging) {
      state.isUserInteracting = false
    }
  })
  
  // Prevent default drag behavior
  testimonialsSlider.addEventListener('dragstart', (e) => e.preventDefault())
  
  // Initialize
  testimonialsSlider.style.overflow = 'visible'
  testimonialsSlider.style.transform = 'translate3d(0, 0, 0)'
  state.currentX = 0
  state.targetX = 0
  
  // Start animation loop
  animate()
}

// Hotel Categories Switcher
const categoryItems = document.querySelectorAll('.category-item')
const categoriesText = document.querySelector('.categories-text')

if (categoryItems.length > 0 && categoriesText) {
  categoryItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      // Remove active from all items
      categoryItems.forEach(otherItem => {
        otherItem.classList.remove('category-active')
      })
      
      // Add active to clicked item
      item.classList.add('category-active')
      
      // Update description text
      const newText = item.dataset.text
      if (newText) {
        categoriesText.textContent = newText
      }
    })
  })
}

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

// Documents certification header - sync padding-top with title height
const documentsCertificationHeaderLeft = document.querySelector('.documents-certification-header-left')
const documentsCertificationHeaderRight = document.querySelector('.documents-certification-header-right')
const documentsCertificationTitle = document.querySelector('.documents-certification-header-left .section-title')

if (documentsCertificationHeaderLeft && documentsCertificationHeaderRight && documentsCertificationTitle) {
  function syncDocumentsCertificationPadding() {
    // Only sync on desktop (width > 1024px)
    if (window.innerWidth <= 1024) {
      documentsCertificationHeaderRight.style.paddingTop = '0'
      return
    }
    
    // Get the actual height of the title
    const titleHeight = documentsCertificationTitle.offsetHeight
    documentsCertificationHeaderRight.style.paddingTop = `${titleHeight}px`
  }
  
  // Sync on load
  setTimeout(syncDocumentsCertificationPadding, 0)
  
  // Sync on resize
  let resizeTimeout3
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout3)
    resizeTimeout3 = setTimeout(syncDocumentsCertificationPadding, 100)
  })
  
  // Sync when content changes (e.g., font loading)
  const observer3 = new ResizeObserver(() => {
    syncDocumentsCertificationPadding()
  })
  observer3.observe(documentsCertificationTitle)
}

// Documents help section - sync padding-top with title height
const documentsHelpLeft = document.querySelector('.documents-help-left')
const documentsHelpRight = document.querySelector('.documents-help-right')
const documentsHelpTitle = document.querySelector('.documents-help-left .section-title')

if (documentsHelpLeft && documentsHelpRight && documentsHelpTitle) {
  function syncDocumentsHelpPadding() {
    // Only sync on desktop (width > 1024px)
    if (window.innerWidth <= 1024) {
      documentsHelpRight.style.paddingTop = '0'
      return
    }
    
    // Get the actual height of the title
    const titleHeight = documentsHelpTitle.offsetHeight
    documentsHelpRight.style.paddingTop = `${titleHeight}px`
  }
  
  // Sync on load
  setTimeout(syncDocumentsHelpPadding, 0)
  
  // Sync on resize
  let resizeTimeout4
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout4)
    resizeTimeout4 = setTimeout(syncDocumentsHelpPadding, 100)
  })
  
  // Sync when content changes (e.g., font loading)
  const observer4 = new ResizeObserver(() => {
    syncDocumentsHelpPadding()
  })
  observer4.observe(documentsHelpTitle)
}

// Documents commercial section - sync padding-top with title height
const documentsCommercialTitle = document.querySelector('.documents-commercial-title')
const documentsCommercialRight = document.querySelector('.documents-commercial-right')

if (documentsCommercialTitle && documentsCommercialRight) {
  function syncDocumentsCommercialPadding() {
    // Only sync on desktop (width > 1024px)
    if (window.innerWidth <= 1024) {
      documentsCommercialRight.style.paddingTop = '0'
      return
    }
    
    // Get the actual height of the title
    const titleHeight = documentsCommercialTitle.offsetHeight
    documentsCommercialRight.style.paddingTop = `${titleHeight}px`
  }
  
  // Sync on load
  setTimeout(syncDocumentsCommercialPadding, 0)
  
  // Sync on resize
  let resizeTimeout5
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout5)
    resizeTimeout5 = setTimeout(syncDocumentsCommercialPadding, 100)
  })
  
  // Sync when content changes (e.g., font loading)
  const observer5 = new ResizeObserver(() => {
    syncDocumentsCommercialPadding()
  })
  observer5.observe(documentsCommercialTitle)
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

// FAQ Accordion
const faqItems = document.querySelectorAll('.faq-item')

if (faqItems.length > 0) {
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question')
    
    question.addEventListener('click', () => {
      // Close other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active')
        }
      })
      
      // Toggle current item
      item.classList.toggle('active')
    })
  })
}

// Form submission handler
const contactForms = document.querySelectorAll('.contact-form')

if (contactForms.length > 0) {
  // API endpoint - используем относительный путь для работы в одном приложении
  // В dev режиме будет проксироваться через Vite, на продакшене будет работать напрямую
  const API_URL = import.meta.env.VITE_API_URL || '/api/submit'

  // Функция для показа уведомления рядом с кнопкой
  const showNotification = (message, type = 'success', button) => {
    const parentForm = button?.closest('form')
    if (parentForm) {
      parentForm.querySelectorAll('.form-notification').forEach(n => n.remove())
    }

    const notification = document.createElement('div')
    notification.className = `form-notification form-notification-${type}`
    notification.textContent = message

    if (button && button.parentNode) {
      button.parentNode.insertBefore(notification, button.nextSibling)
    } else if (parentForm) {
      parentForm.appendChild(notification)
    }

    setTimeout(() => {
      notification.classList.add('form-notification-hide')
      setTimeout(() => notification.remove(), 300)
    }, 6000)
  }

  // Функция для определения названия страницы
  const getPageName = () => {
    const slug = (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index'

    const pageNames = {
      'index': 'Главная страница',
      'hotels': 'Страница "Отелям"',
      'dealers': 'Страница "Дилерам"',
      'contacts': 'Страница "Контакты"',
      'catalog': 'Страница "Каталог"'
    }

    return pageNames[slug] || slug
  }

  // Функция для очистки ошибок
  const clearErrors = (form) => {
    form.querySelectorAll('.form-group').forEach(group => {
      group.classList.remove('error')
      const input = group.querySelector('input, textarea')
      if (input) {
        input.classList.remove('error')
      }
      const errorMsg = group.querySelector('.error-message')
      if (errorMsg) {
        errorMsg.remove()
      }
    })
  }

  // Функция для показа ошибки
  const showError = (input, message) => {
    const formGroup = input.closest('.form-group')
    if (!formGroup) return
    
    formGroup.classList.add('error')
    input.classList.add('error')
    
    // Удаляем предыдущее сообщение об ошибке
    const existingError = formGroup.querySelector('.error-message')
    if (existingError) {
      existingError.remove()
    }
    
    // Создаем новое сообщение об ошибке
    const errorMsg = document.createElement('div')
    errorMsg.className = 'error-message'
    errorMsg.textContent = message
    formGroup.appendChild(errorMsg)
  }

  // Функция валидации
  const validateForm = (form) => {
    let isValid = true
    clearErrors(form)

    // Валидация имени
    const nameInput = form.querySelector('#name')
    if (nameInput) {
      const name = nameInput.value.trim()
      if (!name) {
        showError(nameInput, 'Пожалуйста, укажите ваше имя')
        isValid = false
      } else if (name.length < 2) {
        showError(nameInput, 'Имя должно содержать минимум 2 символа')
        isValid = false
      }
    }

    // Валидация телефона
    const phoneInput = form.querySelector('#phone')
    if (phoneInput) {
      const phone = phoneInput.value.trim()
      if (!phone) {
        showError(phoneInput, 'Пожалуйста, укажите ваш телефон')
        isValid = false
      } else {
        // Простая валидация телефона (цифры, +, -, пробелы, скобки)
        const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
          showError(phoneInput, 'Пожалуйста, укажите корректный номер телефона')
          isValid = false
        }
      }
    }

    // Валидация email (обязательное поле)
    const emailInput = form.querySelector('#email')
    if (emailInput) {
      const email = emailInput.value.trim()
      if (!email) {
        showError(emailInput, 'Пожалуйста, укажите email адрес')
        isValid = false
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          showError(emailInput, 'Пожалуйста, укажите корректный email адрес')
          isValid = false
        }
      }
    }

    // Проверка согласия на обработку данных
    const privacyCheckbox = form.querySelector('#privacy')
    if (privacyCheckbox && !privacyCheckbox.checked) {
      const submitBtn = form.querySelector('button[type="submit"]')
      showNotification('Необходимо согласие на обработку персональных данных', 'error', submitBtn)
      isValid = false
    }

    return isValid
  }

  contactForms.forEach(form => {
    // Валидация при потере фокуса
    form.querySelectorAll('input, textarea').forEach(input => {
      input.addEventListener('blur', () => {
        if (input.id === 'name' || input.id === 'phone' || input.id === 'email') {
          const formGroup = input.closest('.form-group')
          if (formGroup && formGroup.classList.contains('error')) {
            // Перепроверяем только это поле
            if (input.id === 'name') {
              const name = input.value.trim()
              if (name && name.length >= 2) {
                formGroup.classList.remove('error')
                input.classList.remove('error')
                const errorMsg = formGroup.querySelector('.error-message')
                if (errorMsg) errorMsg.remove()
              }
            } else if (input.id === 'phone') {
              const phone = input.value.trim()
              if (phone) {
                const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/
                if (phoneRegex.test(phone.replace(/\s/g, ''))) {
                  formGroup.classList.remove('error')
                  input.classList.remove('error')
                  const errorMsg = formGroup.querySelector('.error-message')
                  if (errorMsg) errorMsg.remove()
                }
              }
            } else if (input.id === 'email') {
              const email = input.value.trim()
              if (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                formGroup.classList.remove('error')
                input.classList.remove('error')
                const errorMsg = formGroup.querySelector('.error-message')
                if (errorMsg) errorMsg.remove()
              }
            }
          }
        }
      })
    })

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      // Валидация формы
      if (!validateForm(form)) {
        // Прокручиваем к первой ошибке
        const firstError = form.querySelector('.form-group.error')
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
          firstError.querySelector('input, textarea')?.focus()
        }
        return
      }
      
      // Получаем кнопку отправки
      const submitBtn = form.querySelector('button[type="submit"]')
      const originalText = submitBtn?.textContent
      
      // Собираем данные формы
      const formData = {
        name: form.querySelector('#name')?.value.trim() || '',
        phone: form.querySelector('#phone')?.value.trim() || '',
        comment: form.querySelector('#message')?.value.trim() || '',
        email: form.querySelector('#email')?.value.trim() || '',
        city: form.querySelector('#city')?.value.trim() || '',
        website: form.querySelector('#website')?.value.trim() || '',
        page: getPageName()
      }
      const packageSelect = form.querySelector('#dealer-package')
      if (packageSelect) {
        formData.package = packageSelect.value || ''
      }

      // Блокируем кнопку и показываем состояние загрузки
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Отправка...'
      }

      // Проверка наличия API_URL
      if (!API_URL) {
        showNotification('Ошибка конфигурации: API URL не настроен. Обратитесь к администратору.', 'error', submitBtn)
        console.error('VITE_API_URL не установлен в переменных окружения')
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = originalText
        }
        return
      }

      const FETCH_TIMEOUT_MS = 25000
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      try {
        console.log('Отправка запроса на:', API_URL)
        console.log('Данные формы:', formData)
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        console.log('Ответ сервера:', response.status, response.statusText)
        console.log('Headers ответа:', [...response.headers.entries()])

        const data = await response.json().catch((err) => {
          console.error('Ошибка парсинга JSON:', err)
          return {}
        })
        
        console.log('Данные ответа:', data)
        
        if (response.ok) {
          showNotification('Заявка отправлена! Мы свяжемся с вами в ближайшее время.', 'success', submitBtn)
          form.reset()
          clearErrors(form)
        } else {
          console.error('Ошибка сервера:', data)
          showNotification(data.error || data.details || 'Ошибка сервера. Попробуйте позже.', 'error', submitBtn)
        }
      } catch (error) {
        clearTimeout(timeoutId)
        const isTimeout = error.name === 'AbortError'
        console.error('Ошибка:', error)
        showNotification(
          isTimeout ? 'Превышено время ожидания ответа от сервера. Попробуйте позже.' : 'Не удалось отправить данные. Проверьте подключение к интернету и убедитесь, что сервер запущен.',
          'error',
          submitBtn
        )
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = originalText
        }
      }
    })
  })
}

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

// Video Modal
const videoModal = document.getElementById('videoModal')
const modalClose = videoModal?.querySelector('.modal-close')

function isMobileView() {
  return window.innerWidth <= 768
}

function getActiveModalVideo() {
  if (!videoModal) return null
  const mobile = videoModal.querySelector('.modal-video--mobile')
  const desktop = videoModal.querySelector('.modal-video--desktop')
  if (mobile && desktop) {
    return isMobileView() ? mobile : desktop
  }
  return videoModal.querySelector('.modal-video')
}

function pauseAllModalVideos() {
  if (!videoModal) return
  videoModal.querySelectorAll('.modal-video').forEach((v) => {
    v.pause()
    v.currentTime = 0
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

function openVideoModal() {
  if (!videoModal) return
  const modalVideo = getActiveModalVideo()
  if (!modalVideo) return
  pauseAllModalVideos()
  ensureVideoSource(modalVideo)
  videoModal.classList.add('active')
  lockScroll()
  modalVideo.currentTime = 0
  modalVideo.play().catch(() => {})
}

function closeVideoModal() {
  if (!videoModal) return
  videoModal.classList.remove('active')
  unlockScroll()
  pauseAllModalVideos()
}

// Bind all video triggers to the modal
const videoTriggers = document.querySelectorAll('#heroVideo, #qualityVideo')

videoTriggers.forEach(trigger => {
  trigger.addEventListener('click', () => {
    openVideoModal()
  })
})

// Ensure quality video on page loops (in-page background video)
document.querySelectorAll('.quality-video').forEach(v => { v.loop = true })

if (videoModal) {
  if (modalClose) {
    modalClose.addEventListener('click', (e) => {
      e.stopPropagation()
      closeVideoModal()
    })
  }

  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) {
      closeVideoModal()
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal.classList.contains('active')) {
      closeVideoModal()
    }
  })
}

// Commercial Offer Modal (3 steps) – только на главной
const commercialOfferModal = document.getElementById('commercialOfferModal')
const commercialOfferForm = document.getElementById('commercialOfferForm')
const commercialOfferStepLabel = document.getElementById('commercialOfferStepLabel')

if (commercialOfferModal && commercialOfferForm) {
  let currentStep = 1
  const steps = commercialOfferModal.querySelectorAll('.commercial-offer-step')
  const totalSteps = steps.length

  function showCommercialOfferStep(step) {
    currentStep = step
    steps.forEach((el) => {
      el.classList.toggle('active', parseInt(el.dataset.step, 10) === step)
    })
    if (commercialOfferStepLabel) {
      commercialOfferStepLabel.textContent = `Шаг ${step} из ${totalSteps}`
    }
  }

  function openCommercialOfferModal() {
    if (!commercialOfferModal) return
    commercialOfferModal.querySelectorAll('.form-notification').forEach(n => n.remove())
    showCommercialOfferStep(1)
    commercialOfferModal.classList.add('active')
    if (typeof lockScroll === 'function') lockScroll()
    document.body.classList.add('modal-open')
  }

  function closeCommercialOfferModal() {
    if (!commercialOfferModal) return
    commercialOfferModal.classList.remove('active')
    commercialOfferModal.querySelectorAll('.form-notification').forEach(n => n.remove())
    if (typeof unlockScroll === 'function') unlockScroll()
    document.body.classList.remove('modal-open')
  }

  const heroLink = document.getElementById('heroCommercialOfferLink')
  if (heroLink) {
    heroLink.addEventListener('click', (e) => {
      e.preventDefault()
      openCommercialOfferModal()
    })
  }

  document.body.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-commercial-offer]')
    if (trigger) {
      e.preventDefault()
      openCommercialOfferModal()
      const seasonalCheckbox = commercialOfferForm.querySelector('#co-seasonal')
      if (seasonalCheckbox) {
        seasonalCheckbox.checked = trigger.getAttribute('data-open-commercial-offer') === 'seasonal'
      }
    }
  })

  commercialOfferModal.querySelector('.commercial-offer-close')?.addEventListener('click', (e) => {
    e.stopPropagation()
    closeCommercialOfferModal()
  })

  commercialOfferModal.addEventListener('click', (e) => {
    if (e.target === commercialOfferModal) closeCommercialOfferModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && commercialOfferModal.classList.contains('active')) {
      closeCommercialOfferModal()
    }
  })

  commercialOfferForm.querySelectorAll('.btn-next').forEach((btn) => {
    btn.addEventListener('click', () => {
      const goto = parseInt(btn.dataset.goto, 10)
      if (goto === 2) {
        const phone = commercialOfferForm.querySelector('#co-phone')
        const formGroup = phone?.closest('.form-group')
        if (!phone || !phone.value.trim()) {
          if (formGroup) {
            formGroup.classList.add('error')
            phone.classList.add('error')
            let err = formGroup.querySelector('.error-message')
            if (!err) {
              err = document.createElement('div')
              err.className = 'error-message'
              formGroup.appendChild(err)
            }
            err.textContent = 'Пожалуйста, укажите телефон'
          }
          return
        }
        if (formGroup) {
          formGroup.classList.remove('error')
          phone.classList.remove('error')
          formGroup.querySelector('.error-message')?.remove()
        }
      }
      showCommercialOfferStep(goto)
    })
  })

  commercialOfferForm.querySelectorAll('.btn-back').forEach((btn) => {
    btn.addEventListener('click', () => {
      showCommercialOfferStep(parseInt(btn.dataset.goto, 10))
    })
  })

  function showCONotification(message, type) {
    const existing = commercialOfferForm.querySelector('.form-notification')
    if (existing) existing.remove()
    const notification = document.createElement('div')
    notification.className = `form-notification form-notification-${type}`
    notification.textContent = message
    commercialOfferForm.querySelector('.commercial-offer-step[data-step="3"]')?.appendChild(notification)
  }

  commercialOfferForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const privacyCheck = commercialOfferForm.querySelector('#co-privacy')
    if (privacyCheck && !privacyCheck.checked) {
      showCONotification('Необходимо согласие на обработку персональных данных', 'error')
      return
    }
    const phone = commercialOfferForm.querySelector('#co-phone')?.value.trim()
    if (!phone) return
    const name = commercialOfferForm.querySelector('#co-name')?.value.trim() || 'Не указано'
    const email = commercialOfferForm.querySelector('#co-email')?.value.trim() || ''
    const mattresses = commercialOfferForm.querySelector('#co-mattresses')?.value.trim() || ''
    const segments = [...commercialOfferForm.querySelectorAll('input[name="segment"]:checked')].map((c) => c.value).join(', ') || 'Не указано'
    const seasonal = commercialOfferForm.querySelector('#co-seasonal')?.checked ? 'Да' : 'Нет'
    const timeFrom = commercialOfferForm.querySelector('#co-time-from')?.value.trim() || ''
    const timeTo = commercialOfferForm.querySelector('#co-time-to')?.value.trim() || ''
    const message = commercialOfferForm.querySelector('#co-message')?.value.trim() || ''
    const commentParts = [
      'Заявка на коммерческое предложение.',
      mattresses ? `Количество матрасов: ${mattresses}.` : '',
      `Сегмент: ${segments}.`,
      `Сезонное обновление: ${seasonal}.`,
      timeFrom || timeTo ? `Время для связи: ${[timeFrom, timeTo].filter(Boolean).join(' – ')}.` : '',
      message ? `Сообщение: ${message}` : ''
    ]
    const comment = commentParts.filter(Boolean).join(' ')
    const API_URL = import.meta.env.VITE_API_URL || '/api/submit'
    const submitBtn = commercialOfferForm.querySelector('.btn-submit')
    const originalText = submitBtn?.textContent
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Отправка...'
    }
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          comment,
          page: 'Главная (КП)'
        })
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const container = commercialOfferForm.querySelector('.commercial-offer-step[data-step="3"] .commercial-offer-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-success'
          notification.textContent = 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.'
          container.parentElement.insertBefore(notification, container)
        }
        commercialOfferForm.reset()
        const mattressesInput = commercialOfferForm.querySelector('#co-mattresses')
        if (mattressesInput) mattressesInput.value = 100
        setTimeout(closeCommercialOfferModal, 5000)
      } else {
        showCONotification(data.error || data.details || 'Ошибка отправки. Попробуйте позже.', 'error')
      }
    } catch (err) {
      showCONotification('Не удалось отправить заявку. Проверьте подключение к интернету.', 'error')
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = originalText
      }
    }
  })
}

// Catalog Request Modal (Boxspring / Аксессуары) – на странице Отелям
const catalogRequestModal = document.getElementById('catalogRequestModal')
const catalogRequestForm = document.getElementById('catalogRequestForm')
const catalogRequestText = document.getElementById('catalogRequestText')
const catalogRequestTypeInput = document.getElementById('catalogRequestType')

const CATALOG_MESSAGES = {
  boxspring: 'Если вы хотите получить каталог Boxspring, укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  accessories: 'Если вы хотите получить каталог аксессуаров, укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  classic: 'Если вы хотите получить каталог коллекции Classic (Классик), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  flexi: 'Если вы хотите получить каталог коллекции Flexi (Флекси), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  relax: 'Если вы хотите получить каталог коллекции Relax (Релакс), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  trend: 'Если вы хотите получить каталог коллекции Trend (Тренд), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  'viva-natura': 'Если вы хотите получить каталог коллекции Viva Natura (Вива Натура), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  consultation: 'Мы можем изготовить матрасы и аксессуары по вашим индивидуальным требованиям и размерам. Свяжитесь с нами для обсуждения проекта.'
}

const CATALOG_TITLES = {
  consultation: 'Не нашли то, что искали?'
}

const CATALOG_LABELS = {
  boxspring: 'Boxspring',
  accessories: 'Аксессуары',
  classic: 'Classic (Классик)',
  flexi: 'Flexi (Флекси)',
  relax: 'Relax (Релакс)',
  trend: 'Trend (Тренд)',
  'viva-natura': 'Viva Natura (Вива Натура)',
  consultation: 'Запрос консультации (индивидуальные требования)'
}

const catalogRequestTitleEl = document.getElementById('catalogRequestTitle')
const defaultModalTitle = catalogRequestTitleEl?.textContent || 'Получить каталог'

if (catalogRequestModal && catalogRequestForm && catalogRequestText) {
  function openCatalogRequestModal(catalogType) {
    catalogRequestModal.querySelectorAll('.form-notification').forEach(n => n.remove())
    const message = CATALOG_MESSAGES[catalogType] || CATALOG_MESSAGES.boxspring
    catalogRequestText.textContent = message
    if (catalogRequestTypeInput) catalogRequestTypeInput.value = catalogType || 'boxspring'
    if (catalogRequestTitleEl) {
      catalogRequestTitleEl.textContent = CATALOG_TITLES[catalogType] || defaultModalTitle
    }
    catalogRequestModal.classList.add('active')
    if (typeof lockScroll === 'function') lockScroll()
    document.body.classList.add('modal-open')
  }

  function getCatalogLabel(catalogType) {
    return CATALOG_LABELS[catalogType] || catalogType || 'каталог'
  }

  function closeCatalogRequestModal() {
    catalogRequestModal.classList.remove('active')
    catalogRequestModal.querySelectorAll('.form-notification').forEach(n => n.remove())
    if (typeof unlockScroll === 'function') unlockScroll()
    document.body.classList.remove('modal-open')
  }

  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('[data-open-catalog]') || e.target.closest('.catalog-collection-link')
    if (!link) return
    e.preventDefault()
    const card = link.closest('.product-card') || link.closest('.catalog-collection-item') || link.closest('[data-catalog]')
    const catalogType = (card && card.dataset.catalog) || 'boxspring'
    openCatalogRequestModal(catalogType)
  })

  catalogRequestModal.querySelector('.catalog-request-close')?.addEventListener('click', (e) => {
    e.stopPropagation()
    closeCatalogRequestModal()
  })

  catalogRequestModal.addEventListener('click', (e) => {
    if (e.target === catalogRequestModal) closeCatalogRequestModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && catalogRequestModal.classList.contains('active')) {
      closeCatalogRequestModal()
    }
  })

  catalogRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const privacyCheck = catalogRequestForm.querySelector('#cr-privacy')
    if (privacyCheck && !privacyCheck.checked) return
    const name = catalogRequestForm.querySelector('#cr-name')?.value.trim() || 'Не указано'
    const phone = catalogRequestForm.querySelector('#cr-phone')?.value.trim()
    const email = catalogRequestForm.querySelector('#cr-email')?.value.trim() || ''
    const catalogType = catalogRequestTypeInput?.value || 'boxspring'
    if (!phone) return
    const comment = `Запрос каталога: ${getCatalogLabel(catalogType)}.`
    const API_URL = import.meta.env.VITE_API_URL || '/api/submit'
    const submitBtn = catalogRequestForm.querySelector('button[type="submit"]')
    const originalText = submitBtn?.textContent
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Отправка...'
    }
    const catalogFetchTimeoutMs = 25000
    const catalogController = new AbortController()
    const catalogTimeoutId = setTimeout(() => catalogController.abort(), catalogFetchTimeoutMs)
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          comment,
          page: 'Отелям (каталог)'
        }),
        signal: catalogController.signal
      })
      clearTimeout(catalogTimeoutId)
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const container = catalogRequestForm.querySelector('.catalog-request-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-success'
          notification.textContent = 'Заявка отправлена! Каталог будет направлен на указанный e-mail.'
          container.parentElement.insertBefore(notification, container)
        }
        catalogRequestForm.reset()
        if (catalogRequestTypeInput) catalogRequestTypeInput.value = catalogType
        setTimeout(closeCatalogRequestModal, 5000)
      } else {
        const container = catalogRequestForm.querySelector('.catalog-request-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-error'
          notification.textContent = data.error || data.details || 'Ошибка отправки. Попробуйте позже.'
          container.parentElement.insertBefore(notification, container)
          setTimeout(() => notification.remove(), 5000)
        }
      }
    } catch (err) {
      clearTimeout(catalogTimeoutId)
      const container = catalogRequestForm.querySelector('.catalog-request-buttons')
      if (container) {
        const notification = document.createElement('div')
        notification.className = 'form-notification form-notification-error'
        notification.textContent = err.name === 'AbortError' ? 'Превышено время ожидания ответа от сервера. Попробуйте позже.' : 'Не удалось отправить заявку. Проверьте подключение к интернету.'
        container.parentElement.insertBefore(notification, container)
        setTimeout(() => notification.remove(), 5000)
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = originalText
      }
    }
  })
}

// Document Request Modal (страница Документы): форма → отправка → затем скачивание файла (ссылка не в разметке)
const documentRequestModal = document.getElementById('documentRequestModal')
const documentRequestForm = document.getElementById('documentRequestForm')
const documentRequestText = document.getElementById('documentRequestText')
const documentRequestTypeInput = document.getElementById('documentRequestType')

const DOCUMENT_REQUEST_MESSAGES = {
  declaration: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.',
  certificate: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.',
  trademark: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.',
  catalog: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.',
  presentation: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.'
}

const DOCUMENT_REQUEST_FILES = {
  declaration: 'Декларация.pdf',
  certificate: 'СертификатСоответствия.pdf',
  trademark: 'СвидетельствоНаТоварныйЗнак.pdf',
  catalog: 'Catalog_v1.2.pdf',
  presentation: 'Grassigrosso-company.pdf'
}

if (documentRequestModal && documentRequestForm && documentRequestText) {
  function openDocumentRequestModal(documentType) {
    documentRequestModal.querySelectorAll('.form-notification').forEach(n => n.remove())
    const message = DOCUMENT_REQUEST_MESSAGES[documentType] || DOCUMENT_REQUEST_MESSAGES.declaration
    documentRequestText.textContent = message
    if (documentRequestTypeInput) documentRequestTypeInput.value = documentType || 'declaration'
    documentRequestModal.classList.add('active')
    if (typeof lockScroll === 'function') lockScroll()
    document.body.classList.add('modal-open')
  }

  function closeDocumentRequestModal() {
    documentRequestModal.classList.remove('active')
    documentRequestModal.querySelectorAll('.form-notification').forEach(n => n.remove())
    if (typeof unlockScroll === 'function') unlockScroll()
    document.body.classList.remove('modal-open')
  }

  function triggerDocumentDownload(documentType) {
    const filename = DOCUMENT_REQUEST_FILES[documentType]
    if (!filename) return
    const base = typeof import.meta.env.BASE_URL !== 'undefined' ? import.meta.env.BASE_URL : '/'
    const url = `${base}documents/${encodeURIComponent(filename)}`
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  document.body.addEventListener('click', (e) => {
    const certLink = e.target.closest('.documents-cert-download[data-request-document]')
    const certCard = e.target.closest('.documents-cert-card[data-document]')
    const commercialLink = e.target.closest('.documents-commercial-item-download[data-request-document]')
    const commercialItem = e.target.closest('.documents-commercial-item[data-document]')
    const target = certLink || certCard || commercialLink || commercialItem
    if (!target) return
    if (certLink || commercialLink) e.preventDefault()
    const card = target.closest('.documents-cert-card') || target.closest('.documents-commercial-item')
    const documentType = (card && card.dataset.document) || 'declaration'
    openDocumentRequestModal(documentType)
  })

  documentRequestModal.querySelector('.document-request-close')?.addEventListener('click', (e) => {
    e.stopPropagation()
    closeDocumentRequestModal()
  })

  documentRequestModal.addEventListener('click', (e) => {
    if (e.target === documentRequestModal) closeDocumentRequestModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && documentRequestModal.classList.contains('active')) {
      closeDocumentRequestModal()
    }
  })

  documentRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const privacyCheck = documentRequestForm.querySelector('#dr-privacy')
    if (privacyCheck && !privacyCheck.checked) return
    const name = documentRequestForm.querySelector('#dr-name')?.value.trim() || 'Не указано'
    const phone = documentRequestForm.querySelector('#dr-phone')?.value.trim()
    const email = documentRequestForm.querySelector('#dr-email')?.value.trim() || ''
    const documentType = documentRequestTypeInput?.value || 'declaration'
    if (!phone) return
    const docLabels = { declaration: 'Декларация о соответствии', certificate: 'Сертификат соответствия «ПромТехСтандарт»', trademark: 'Свидетельство на товарный знак GrassiGrosso' }
    const comment = `Запрос документа: ${docLabels[documentType] || documentType}.`
    const API_URL = import.meta.env.VITE_API_URL || '/api/submit'
    const submitBtn = documentRequestForm.querySelector('button[type="submit"]')
    const originalText = submitBtn?.textContent
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Отправка...'
    }
    const docFetchTimeoutMs = 25000
    const docController = new AbortController()
    const docTimeoutId = setTimeout(() => docController.abort(), docFetchTimeoutMs)
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, comment, page: 'Документы' }),
        signal: docController.signal
      })
      clearTimeout(docTimeoutId)
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const container = documentRequestForm.querySelector('.catalog-request-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-success'
          notification.textContent = 'Заявка отправлена! Начинается загрузка документа.'
          container.parentElement.insertBefore(notification, container)
        }
        documentRequestForm.reset()
        if (documentRequestTypeInput) documentRequestTypeInput.value = documentType
        triggerDocumentDownload(documentType)
        setTimeout(closeDocumentRequestModal, 5000)
      } else {
        const container = documentRequestForm.querySelector('.catalog-request-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-error'
          notification.textContent = data.error || data.details || 'Ошибка отправки. Попробуйте позже.'
          container.parentElement.insertBefore(notification, container)
          setTimeout(() => notification.remove(), 5000)
        }
      }
    } catch (err) {
      clearTimeout(docTimeoutId)
      const container = documentRequestForm.querySelector('.catalog-request-buttons')
      if (container) {
        const notification = document.createElement('div')
        notification.className = 'form-notification form-notification-error'
        notification.textContent = err.name === 'AbortError' ? 'Превышено время ожидания ответа от сервера. Попробуйте позже.' : 'Не удалось отправить заявку. Проверьте подключение к интернету.'
        container.parentElement.insertBefore(notification, container)
        setTimeout(() => notification.remove(), 5000)
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = originalText
      }
    }
  })
}

// Help Documents Modal (страница Документы – «Нужна помощь с документами?»)
const helpDocumentsModal = document.getElementById('helpDocumentsModal')
const helpDocumentsForm = document.getElementById('helpDocumentsForm')

if (helpDocumentsModal && helpDocumentsForm) {
  function openHelpDocumentsModal() {
    helpDocumentsModal.querySelectorAll('.form-notification').forEach(n => n.remove())
    helpDocumentsModal.classList.add('active')
    if (typeof lockScroll === 'function') lockScroll()
    document.body.classList.add('modal-open')
  }

  function closeHelpDocumentsModal() {
    helpDocumentsModal.classList.remove('active')
    helpDocumentsModal.querySelectorAll('.form-notification').forEach(n => n.remove())
    if (typeof unlockScroll === 'function') unlockScroll()
    document.body.classList.remove('modal-open')
  }

  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('[data-open-help-modal]')
    if (!link) return
    e.preventDefault()
    openHelpDocumentsModal()
  })

  helpDocumentsModal.querySelector('.help-documents-close')?.addEventListener('click', (e) => {
    e.stopPropagation()
    closeHelpDocumentsModal()
  })

  helpDocumentsModal.addEventListener('click', (e) => {
    if (e.target === helpDocumentsModal) closeHelpDocumentsModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpDocumentsModal.classList.contains('active')) {
      closeHelpDocumentsModal()
    }
  })

  helpDocumentsForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const privacyCheck = helpDocumentsForm.querySelector('#hd-privacy')
    if (privacyCheck && !privacyCheck.checked) return
    const name = helpDocumentsForm.querySelector('#hd-name')?.value.trim() || 'Не указано'
    const phone = helpDocumentsForm.querySelector('#hd-phone')?.value.trim()
    const email = helpDocumentsForm.querySelector('#hd-email')?.value.trim() || ''
    if (!phone) return
    const comment = 'Запрос помощи с документами.'
    const API_URL = import.meta.env.VITE_API_URL || '/api/submit'
    const submitBtn = helpDocumentsForm.querySelector('button[type="submit"]')
    const originalText = submitBtn?.textContent
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Отправка...'
    }
    const hdController = new AbortController()
    const hdTimeoutId = setTimeout(() => hdController.abort(), 25000)
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, comment, page: 'Документы (помощь)' }),
        signal: hdController.signal
      })
      clearTimeout(hdTimeoutId)
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const container = helpDocumentsForm.querySelector('.catalog-request-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-success'
          notification.textContent = 'Заявка отправлена! Менеджер свяжется с вами в ближайшее время.'
          container.parentElement.insertBefore(notification, container)
        }
        helpDocumentsForm.reset()
        setTimeout(closeHelpDocumentsModal, 5000)
      } else {
        const container = helpDocumentsForm.querySelector('.catalog-request-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-error'
          notification.textContent = data.error || data.details || 'Ошибка отправки. Попробуйте позже.'
          container.parentElement.insertBefore(notification, container)
          setTimeout(() => notification.remove(), 5000)
        }
      }
    } catch (err) {
      clearTimeout(hdTimeoutId)
      const container = helpDocumentsForm.querySelector('.catalog-request-buttons')
      if (container) {
        const notification = document.createElement('div')
        notification.className = 'form-notification form-notification-error'
        notification.textContent = err.name === 'AbortError' ? 'Превышено время ожидания ответа от сервера. Попробуйте позже.' : 'Не удалось отправить заявку. Проверьте подключение к интернету.'
        container.parentElement.insertBefore(notification, container)
        setTimeout(() => notification.remove(), 5000)
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = originalText
      }
    }
  })
}
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
