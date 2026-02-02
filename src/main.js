import './style.css'
import { gsap } from 'gsap'
import Lenis from '@studio-freight/lenis'

// Geography cities animation - start only when in viewport
const geographySection = document.querySelector('.geography-section')
const geographyCities = document.querySelector('.geography-cities')

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
    threshold: 0.1 // Start animation when 10% of section is visible
  })

  observer.observe(geographySection)
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

// Function to check if fonts are loaded
async function waitForFonts() {
  // Wait for document to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve)
    })
  }

  // Check if document.fonts API is available
  if (document.fonts && document.fonts.ready) {
    try {
      // Wait for all fonts to be loaded
      await document.fonts.ready
      
      // Additional check: verify specific fonts are loaded
      const nunitoLoaded = document.fonts.check('16px Nunito')
      const boundedLoaded = document.fonts.check('16px Bounded')
      
      // If fonts are not loaded yet, wait a bit more
      if (!nunitoLoaded || !boundedLoaded) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (e) {
      console.warn('Font loading check failed:', e)
    }
  } else {
    // Fallback: wait a reasonable time for fonts to load
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// Initialize page load
async function initPageLoad() {
  // Wait for fonts to load
  await waitForFonts()
  
  // Small delay to ensure fonts are rendered
  await new Promise(resolve => requestAnimationFrame(resolve))
  
  // Mark fonts as loaded - this will show the body with fade
  document.body.classList.add('fonts-loaded')
  
  // Hide preloader with fade
  if (preloader) {
    preloader.classList.add('hidden')
    // Remove from DOM after animation
    setTimeout(() => {
      if (preloader && preloader.parentNode) {
        preloader.remove()
      }
    }, 500)
  }
}

// Start initialization
initPageLoad().catch(err => {
  console.error('Error initializing page:', err)
  // Fallback: show page anyway after timeout
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
  
  // Update parallax effect on images
  function updateParallax() {
    const viewportCenter = window.innerWidth / 2
    
    cards.forEach((card) => {
      const img = card.querySelector('.collection-image img')
      if (!img) return
      
      const cardRect = card.getBoundingClientRect()
      
      // Skip if card is far outside viewport
      if (cardRect.right < -500 || cardRect.left > window.innerWidth + 500) {
        return
      }
      
      const cardCenter = cardRect.left + cardRect.width / 2
      const distanceFromCenter = cardCenter - viewportCenter
      const parallaxOffset = distanceFromCenter * -0.25
      
      img.style.transform = `translateX(${parallaxOffset}px) scale(2.25)`
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
    item.addEventListener('click', () => {
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

// Contacts map tabs switching
const contactsMapTabs = document.querySelectorAll('.contacts-map-tab')
const contactsMapFrames = document.querySelectorAll('.contacts-map-frame')

if (contactsMapTabs.length > 0 && contactsMapFrames.length > 0) {
  contactsMapTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      contactsMapTabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      const office = tab.getAttribute('data-office')
      contactsMapFrames.forEach(frame => {
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
      alert('Необходимо согласие на обработку персональных данных')
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
        company: form.querySelector('#company')?.value.trim() || '',
        page: getPageName()
      }

      // Блокируем кнопку и показываем состояние загрузки
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Отправка...'
      }

      // Проверка наличия API_URL
      if (!API_URL) {
        alert('Ошибка конфигурации: API URL не настроен. Обратитесь к администратору.')
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
          alert('Заявка отправлена! Мы свяжемся с вами в ближайшее время.')
          form.reset()
          clearErrors(form)
        } else {
          console.error('Ошибка сервера:', data)
          alert(data.error || data.details || 'Ошибка сервера. Попробуйте позже.')
        }
      } catch (error) {
        console.error('Ошибка:', error)
        alert('Не удалось отправить данные. Проверьте подключение к интернету и убедитесь, что сервер запущен.')
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
