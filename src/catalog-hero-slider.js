import { fetchCatalogHeroFeed } from './catalog/catalog-api'
import { applyCatalogHeroFeed } from './catalog/catalog-hero'

export async function setupCatalogueNewPageHero() {
  const sliderRoot = document.querySelector('.catalog-hero-slider')
  if (!sliderRoot) return

  try {
    const data = await fetchCatalogHeroFeed()
    if (Array.isArray(data.slides) && data.slides.length > 0) {
      applyCatalogHeroFeed(sliderRoot, data)
    }
  } catch (error) {
    console.warn('Catalog hero Strapi fetch failed, using static slides:', error)
  }

  initCatalogHeroSlider(sliderRoot)
}

export function initCatalogHeroSlider(sliderRoot) {
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

  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  const restartActiveDotAnimation = () => {
    const activeDot = dots[index]
    if (!activeDot) return
    const progress = activeDot.querySelector('.catalog-hero-dot-fill')
    if (!progress) return
    const clone = progress.cloneNode(true)
    progress.replaceWith(clone)
  }

  const syncDots = () => {
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === index
      dot.classList.toggle('is-active', isActive)
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false')
      dot.tabIndex = isActive ? 0 : -1
    })
    restartActiveDotAnimation()
  }

  const applySlideMedia = () => {
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

  const syncSlides = () => {
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index
      slide.classList.toggle('is-active', isActive)
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true')
    })
    applySlideMedia()
    syncDots()
  }

  const scheduleAutoplay = () => {
    clearTimer()
    if (reducedMotion || !isVisible || isPaused) return
    timer = setTimeout(() => {
      goTo(index + 1)
    }, autoplayMs)
  }

  const goTo = (nextIndex) => {
    if (slides.length === 0) return
    index = ((nextIndex % slides.length) + slides.length) % slides.length
    syncSlides()
    scheduleAutoplay()
  }

  sliderRoot.querySelector('.catalog-hero-nav-prev')?.addEventListener('click', (event) => {
    goTo(index - 1)
    event.currentTarget.blur()
  })
  sliderRoot.querySelector('.catalog-hero-nav-next')?.addEventListener('click', (event) => {
    goTo(index + 1)
    event.currentTarget.blur()
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
