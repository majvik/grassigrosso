export function ensureVideoSource(video) {
  const inlineSrc = video.getAttribute('src')
  const deferredSrc = video.dataset.src
  if (!inlineSrc && deferredSrc) {
    video.setAttribute('src', deferredSrc)
    video.load()
  }
}

export function createLenisInstance(LenisCtor) {
  if (window.innerWidth <= 1024) return null

  const lenis = new LenisCtor({
    duration: 1.2,
    easing: (value) => Math.min(1, 1.001 - Math.pow(2, -10 * value)),
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

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function handleAnchorClick(event) {
      const href = this.getAttribute('href')
      if (href === '#' || href === '') return
      const target = document.querySelector(href)
      if (!target) return
      event.preventDefault()
      lenis.scrollTo(target, { offset: 0, duration: 1.5 })
    })
  })

  return lenis
}

export function createScrollLocks(lenisInstance) {
  return {
    lockScroll() {
      if (lenisInstance) lenisInstance.stop()
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    },
    unlockScroll() {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      if (lenisInstance) lenisInstance.start()
    },
  }
}

export function relocateOverlayRoots() {
  document.querySelectorAll('.modal-overlay').forEach((modal) => {
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

  const cookieBannerEl = document.querySelector('.cookie-banner')
  if (cookieBannerEl) document.documentElement.appendChild(cookieBannerEl)

  const copyToastRoot = document.getElementById('copy-toast')
  if (copyToastRoot) document.documentElement.appendChild(copyToastRoot)

  return { copyToastRoot }
}

export function scalePageForWideScreens() {
  const htmlEl = document.documentElement
  const bodyEl = document.body
  if (!htmlEl || !bodyEl) return

  const clearLegacyTransform = () => {
    bodyEl.style.transform = ''
    bodyEl.style.transformOrigin = ''
  }

  if (window.innerWidth >= 1920) {
    htmlEl.style.zoom = String(window.innerWidth / 1920)
    clearLegacyTransform()
  } else {
    htmlEl.style.zoom = ''
    clearLegacyTransform()
  }
}

export function initPageLoad({ preloader, waitForFonts, waitForHeroMedia, startInlineVideos, preloaderFontBudgetMs }) {
  return Promise.all([
    Promise.race([
      waitForFonts(),
      new Promise((resolve) => setTimeout(resolve, preloaderFontBudgetMs)),
    ]),
    waitForHeroMedia(),
  ]).then(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    document.body.classList.add('fonts-loaded')
    startInlineVideos()
    if (!preloader) return
    preloader.classList.add('hidden')
    setTimeout(() => {
      if (preloader && preloader.parentNode) preloader.remove()
    }, 500)
  })
}
