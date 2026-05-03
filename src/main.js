import './style.css'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { initCollectionsSlider } from './collections-slider'
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

initCataloguePage({ lockScroll, unlockScroll })

initCollectionsSlider()
initTestimonialsSlider()

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
