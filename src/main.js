import './style.css'
import { gsap } from 'gsap'
import Lenis from 'lenis'

// Geography section: cities animation + map points animation
const geographySection = document.querySelector('.geography-section')
const geographyCities = document.querySelector('.geography-cities')
const geographyMapContainer = document.getElementById('geographyMapContainer')
const geographyMapImg = document.getElementById('geographyMapImg')

if (geographySection && geographyCities) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        geographyCities.classList.add('animate')
      } else {
        geographyCities.classList.remove('animate')
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

// Initialize page load
async function initPageLoad() {
  
  await Promise.all([waitForFonts(), waitForHeroMedia()])
  
  await new Promise(resolve => requestAnimationFrame(resolve))
  
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

// Start initialization
initPageLoad().catch(err => {
  console.error('initPageLoad error:', err)
  setTimeout(() => {
    document.body.classList.add('fonts-loaded')
    if (preloader) {
      preloader.classList.add('hidden')
      setTimeout(() => {
        if (preloader && preloader.parentNode) {
          preloader.remove()
        }
      }, 500)
    }
    
  }, 2000)
})

// Scale page on screens 1920px and larger
function scalePage() {
  if (window.innerWidth >= 1920) {
    const scale = window.innerWidth / 1920
    document.body.style.transform = `scale(${scale})`
    document.body.style.transformOrigin = 'top center'
  } else {
    document.body.style.transform = ''
    document.body.style.transformOrigin = ''
  }
}

// Apply scale on load and resize
scalePage()
window.addEventListener('resize', scalePage)

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

// Collections slider with LERP and parallax
const slider = document.querySelector('.collections-grid')
const prevBtn = document.querySelector('.collections-arrows .arrow-btn.prev')
const nextBtn = document.querySelector('.collections-arrows .arrow-btn.next')
const progressFill = document.querySelector('.collections-progress-fill')

if (slider && prevBtn && nextBtn && progressFill) {
  const cardWidth = 392 + 56 // card width + gap
  const cards = slider.querySelectorAll('.collection-card')
  const cardImages = slider.querySelectorAll('.collection-image img')
  
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
    const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth)
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
    const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth)
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
  
  // Arrow navigation
  prevBtn.addEventListener('click', () => {
    state.targetX = Math.max(0, state.targetX - cardWidth)
  })
  
  nextBtn.addEventListener('click', () => {
    const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth)
    state.targetX = Math.min(maxScroll, state.targetX + cardWidth)
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
    }
  })
  
  slider.addEventListener('mouseleave', () => {
    if (state.isDragging) {
      state.isDragging = false
      slider.classList.remove('active')
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
  })
  
  // Prevent default drag behavior
  slider.addEventListener('dragstart', (e) => e.preventDefault())
  
  // Initialize
  slider.style.overflow = 'visible'
  slider.style.transform = 'translate3d(0, 0, 0)'
  state.currentX = 0
  state.targetX = 0
  
  // Start animation loop
  animate()
  
  // Animate cards on initial load
  if (cards.length > 0) {
    gsap.set(cards, { opacity: 0, y: 30 })
    
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
    }, { threshold: 0.1 })
    
    cards.forEach(card => observer.observe(card))
  }
}

// Testimonials slider with LERP, parallax and autoplay
const testimonialsSlider = document.querySelector('.testimonials-grid')
const testimonialsSection = document.querySelector('.testimonials')

if (testimonialsSlider && testimonialsSection) {
  let testimonialCards = testimonialsSlider.querySelectorAll('.testimonial-card')
  const originalCardCount = testimonialCards.length
  
  // Duplicate cards for infinite loop (5 copies for smoother transition)
  if (originalCardCount > 0) {
    const copies = 5
    const cardWidth = testimonialCards[0].offsetWidth + 32 // width + gap
    const sequenceWidth = cardWidth * originalCardCount
    
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
    currentX: originalCardCount > 0 ? (testimonialCards[0].offsetWidth + 32) * originalCardCount * 2 : 0,
    targetX: originalCardCount > 0 ? (testimonialCards[0].offsetWidth + 32) * originalCardCount * 2 : 0,
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
    const card = testimonialCards[0]
    return card ? (card.offsetWidth + 32) * 2 : 1000
  }
  
  // Get sequence width (one full set of original cards)
  const getSequenceWidth = () => {
    const card = testimonialCards[0]
    return card ? (card.offsetWidth + 32) * originalCardCount : 0
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
      setTimeout(() => {
        state.isUserInteracting = false
      }, 300)
    }
  })
  
  testimonialsSlider.addEventListener('mouseleave', () => {
    if (state.isDragging) {
      state.isDragging = false
      testimonialsSlider.classList.remove('active')
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
  const href = window.location.href
  return path.includes('dealers.html') || 
         path.includes('/dealers') ||
         href.includes('dealers.html') ||
         href.includes('/dealers') ||
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

// Catalog collections header - sync padding-top with title height
const catalogCollectionsHeaderLeft = document.querySelector('.catalog-collections-header-left')
const catalogCollectionsHeaderRight = document.querySelector('.catalog-collections-header-right')
const catalogCollectionsTitle = document.querySelector('.catalog-collections-header-left .section-title')

if (catalogCollectionsHeaderLeft && catalogCollectionsHeaderRight && catalogCollectionsTitle) {
  function syncCatalogCollectionsPadding() {
    // Only sync on desktop (width > 1024px)
    if (window.innerWidth <= 1024) {
      catalogCollectionsHeaderRight.style.paddingTop = '0'
      return
    }
    
    // Get the actual height of the title
    const titleHeight = catalogCollectionsTitle.offsetHeight
    catalogCollectionsHeaderRight.style.paddingTop = `${titleHeight}px`
  }
  
  // Sync on load
  setTimeout(syncCatalogCollectionsPadding, 0)
  
  // Sync on resize
  let resizeTimeout1
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout1)
    resizeTimeout1 = setTimeout(syncCatalogCollectionsPadding, 100)
  })
  
  // Sync when content changes (e.g., font loading)
  const observer1 = new ResizeObserver(() => {
    syncCatalogCollectionsPadding()
  })
  observer1.observe(catalogCollectionsTitle)
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

// Contacts map — Yandex API 2.1: метки фирменным цветом, балун с адресом по наведению
// Ключ: .env → VITE_YANDEX_MAPS_API_KEY (на проде — в переменных окружения)
const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''
const contactsMapTabs = document.querySelectorAll('.contacts-map-tab')
const contactsMapFrames = document.querySelectorAll('.contacts-map-frame')

const CONTACTS_OFFICES = [
  { id: 'main', center: [44.9522, 34.1027], zoom: 16, title: 'Главный офис', address: 'Симферополь, ул. Кубанская д. 25' },
  { id: 'voronezh', center: [51.6605, 39.2006], zoom: 16, title: 'Представительство в Центральной России', address: 'Воронеж, ул. Остужева 43 И' },
  { id: 'lnr', center: [48.567, 39.3172], zoom: 16, title: 'Представительство в ЛНР', address: 'Луганск, ул. Фабричная д 1' },
  { id: 'dnr', center: [48.0333, 38.2667], zoom: 16, title: 'Представительство в ДНР', address: 'Харцизск, ул. Вокзальная, д. 52' }
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
    // Обесцвечиваем слой карты (тайлы) под фирменный стиль — через DOM слоя API
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
    // Удаляем предыдущее уведомление, если есть
    const existingNotification = document.querySelector('.form-notification')
    if (existingNotification) {
      existingNotification.remove()
    }

    // Создаем элемент уведомления
    const notification = document.createElement('div')
    notification.className = `form-notification form-notification-${type}`
    notification.textContent = message

    // Вставляем после кнопки или в конец формы
    if (button && button.parentNode) {
      button.parentNode.insertBefore(notification, button.nextSibling)
    } else {
      const form = button?.closest('form')
      if (form) {
        form.appendChild(notification)
      }
    }

    // Ждем завершения анимации появления (300ms), затем начинаем отсчет 5 секунд
    setTimeout(() => {
      // Автоматически скрываем через 5 секунд после появления
      setTimeout(() => {
        notification.classList.add('form-notification-hide')
        setTimeout(() => {
          notification.remove()
        }, 300)
      }, 5000)
    }, 300)
  }

  // Функция для определения названия страницы
  const getPageName = () => {
    const path = window.location.pathname
    const filename = path.split('/').pop() || 'index.html'
    
    const pageNames = {
      'index.html': 'Главная страница',
      'hotels.html': 'Страница "Отелям"',
      'dealers.html': 'Страница "Дилерам"',
      'contacts.html': 'Страница "Контакты"'
    }
    
    return pageNames[filename] || filename
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

    // Валидация email (если указан)
    const emailInput = form.querySelector('#email')
    if (emailInput && emailInput.value.trim()) {
      const email = emailInput.value.trim()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        showError(emailInput, 'Пожалуйста, укажите корректный email адрес')
        isValid = false
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

      try {
        console.log('Отправка запроса на:', API_URL)
        console.log('Данные формы:', formData)
        
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

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
        console.error('Ошибка:', error)
        showNotification('Не удалось отправить данные. Проверьте подключение к интернету и убедитесь, что сервер запущен.', 'error', submitBtn)
      } finally {
        // Восстанавливаем кнопку
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
const modalVideo = videoModal?.querySelector('.modal-video')

function isMobileView() {
  return window.innerWidth <= 768
}

let scrollPosition = 0

function lockScroll() {
  scrollPosition = window.pageYOffset
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollPosition}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.documentElement.style.overflow = 'hidden'
}

function unlockScroll() {
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.documentElement.style.overflow = ''
  window.scrollTo(0, scrollPosition)
}

function openVideoModal() {
  if (!videoModal || !modalVideo || isMobileView()) return
  ensureVideoSource(modalVideo)
  videoModal.classList.add('active')
  lockScroll()
  modalVideo.currentTime = 0
  modalVideo.play()
}

function closeVideoModal() {
  if (!videoModal || !modalVideo) return
  videoModal.classList.remove('active')
  unlockScroll()
  modalVideo.pause()
  modalVideo.currentTime = 0
}

// Bind all video triggers to the modal
const videoTriggers = document.querySelectorAll('#heroVideo, #qualityVideo')

videoTriggers.forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    if (isMobileView()) return
    openVideoModal()
  })
})

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

// Commercial Offer Modal (3 steps) — только на главной
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
    showCommercialOfferStep(1)
    commercialOfferModal.classList.add('active')
    if (typeof lockScroll === 'function') lockScroll()
    document.body.classList.add('modal-open')
  }

  function closeCommercialOfferModal() {
    if (!commercialOfferModal) return
    commercialOfferModal.classList.remove('active')
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
      timeFrom || timeTo ? `Время для связи: ${[timeFrom, timeTo].filter(Boolean).join(' — ')}.` : '',
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
          setTimeout(() => notification.classList.add('form-notification-hide'), 3000)
        }
        commercialOfferForm.reset()
        const mattressesInput = commercialOfferForm.querySelector('#co-mattresses')
        if (mattressesInput) mattressesInput.value = 100
        setTimeout(closeCommercialOfferModal, 1500)
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

// Catalog Request Modal (Boxspring / Аксессуары) — на странице Отелям
const catalogRequestModal = document.getElementById('catalogRequestModal')
const catalogRequestForm = document.getElementById('catalogRequestForm')
const catalogRequestText = document.getElementById('catalogRequestText')
const catalogRequestTypeInput = document.getElementById('catalogRequestType')

const CATALOG_MESSAGES = {
  boxspring: 'Если вы хотите получить каталог Boxspring, укажите ваше имя, телефон и e-mail — мы направим каталог на указанный адрес.',
  accessories: 'Если вы хотите получить каталог аксессуаров, укажите ваше имя, телефон и e-mail — мы направим каталог на указанный адрес.',
  classic: 'Если вы хотите получить каталог коллекции Classic (Классик), укажите ваше имя, телефон и e-mail — мы направим каталог на указанный адрес.',
  flexi: 'Если вы хотите получить каталог коллекции Flexi (Флекси), укажите ваше имя, телефон и e-mail — мы направим каталог на указанный адрес.',
  relax: 'Если вы хотите получить каталог коллекции Relax (Релакс), укажите ваше имя, телефон и e-mail — мы направим каталог на указанный адрес.',
  trend: 'Если вы хотите получить каталог коллекции Trend (Тренд), укажите ваше имя, телефон и e-mail — мы направим каталог на указанный адрес.',
  'viva-natura': 'Если вы хотите получить каталог коллекции Viva Natura (Вива Натура), укажите ваше имя, телефон и e-mail — мы направим каталог на указанный адрес.',
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
        })
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const container = catalogRequestForm.querySelector('.catalog-request-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-success'
          notification.textContent = 'Заявка отправлена! Каталог будет направлен на указанный e-mail.'
          container.parentElement.insertBefore(notification, container)
          setTimeout(() => notification.classList.add('form-notification-hide'), 3000)
        }
        catalogRequestForm.reset()
        if (catalogRequestTypeInput) catalogRequestTypeInput.value = catalogType
        setTimeout(closeCatalogRequestModal, 1500)
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
      const container = catalogRequestForm.querySelector('.catalog-request-buttons')
      if (container) {
        const notification = document.createElement('div')
        notification.className = 'form-notification form-notification-error'
        notification.textContent = 'Не удалось отправить заявку. Проверьте подключение к интернету.'
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
  declaration: 'Укажите имя, телефон и e-mail — после отправки заявки вам будет доступна ссылка для скачивания документа.',
  certificate: 'Укажите имя, телефон и e-mail — после отправки заявки вам будет доступна ссылка для скачивания документа.',
  trademark: 'Укажите имя, телефон и e-mail — после отправки заявки вам будет доступна ссылка для скачивания документа.'
}

const DOCUMENT_REQUEST_FILES = {
  declaration: 'Декларация.pdf',
  certificate: 'СертификатСоответствия.pdf',
  trademark: 'СвидетельствоНаТоварныйЗнак.pdf'
}

if (documentRequestModal && documentRequestForm && documentRequestText) {
  function openDocumentRequestModal(documentType) {
    const message = DOCUMENT_REQUEST_MESSAGES[documentType] || DOCUMENT_REQUEST_MESSAGES.declaration
    documentRequestText.textContent = message
    if (documentRequestTypeInput) documentRequestTypeInput.value = documentType || 'declaration'
    documentRequestModal.classList.add('active')
    if (typeof lockScroll === 'function') lockScroll()
    document.body.classList.add('modal-open')
  }

  function closeDocumentRequestModal() {
    documentRequestModal.classList.remove('active')
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
    const link = e.target.closest('.documents-cert-download[data-request-document]')
    if (!link) return
    e.preventDefault()
    const card = link.closest('.documents-cert-card')
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
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, comment, page: 'Документы' })
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const container = documentRequestForm.querySelector('.catalog-request-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-success'
          notification.textContent = 'Заявка отправлена! Начинается загрузка документа.'
          container.parentElement.insertBefore(notification, container)
          setTimeout(() => notification.classList.add('form-notification-hide'), 3000)
        }
        documentRequestForm.reset()
        if (documentRequestTypeInput) documentRequestTypeInput.value = documentType
        triggerDocumentDownload(documentType)
        setTimeout(closeDocumentRequestModal, 2000)
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
      const container = documentRequestForm.querySelector('.catalog-request-buttons')
      if (container) {
        const notification = document.createElement('div')
        notification.className = 'form-notification form-notification-error'
        notification.textContent = 'Не удалось отправить заявку. Проверьте подключение к интернету.'
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
