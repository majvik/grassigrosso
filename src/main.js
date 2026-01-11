import './style.css'

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

// Collections slider
const slider = document.querySelector('.collections-grid')
const prevBtn = document.querySelector('.collections-arrows .arrow-btn.prev')
const nextBtn = document.querySelector('.collections-arrows .arrow-btn.next')
const progressFill = document.querySelector('.collections-progress-fill')

if (slider && prevBtn && nextBtn && progressFill) {
  const cardWidth = 392 + 56 // card width + gap
  
  // Update progress and button states
  function updateSlider() {
    const scrollLeft = slider.scrollLeft
    const maxScroll = slider.scrollWidth - slider.clientWidth
    const scrollProgress = maxScroll > 0 ? scrollLeft / maxScroll : 0
    
    // Calculate thumb size based on visible/total ratio
    const visibleRatio = slider.clientWidth / slider.scrollWidth
    const thumbWidth = Math.max(visibleRatio * 100, 15) // minimum 15%
    
    // Calculate thumb position
    const trackSpace = 100 - thumbWidth
    const thumbPosition = scrollProgress * trackSpace
    
    progressFill.style.width = `${thumbWidth}%`
    progressFill.style.left = `${thumbPosition}%`
    
    // Update button states
    prevBtn.disabled = scrollLeft <= 1
    nextBtn.disabled = scrollLeft >= maxScroll - 1
  }
  
  // Arrow navigation
  prevBtn.addEventListener('click', () => {
    slider.scrollBy({ left: -cardWidth, behavior: 'smooth' })
  })
  
  nextBtn.addEventListener('click', () => {
    slider.scrollBy({ left: cardWidth, behavior: 'smooth' })
  })
  
  // Listen to scroll events
  slider.addEventListener('scroll', updateSlider)
  
  // Drag to scroll
  let isDown = false
  let startX
  let scrollLeftStart
  
  slider.addEventListener('mousedown', (e) => {
    isDown = true
    slider.classList.add('active')
    startX = e.pageX - slider.offsetLeft
    scrollLeftStart = slider.scrollLeft
  })
  
  slider.addEventListener('mouseleave', () => {
    isDown = false
    slider.classList.remove('active')
  })
  
  slider.addEventListener('mouseup', () => {
    isDown = false
    slider.classList.remove('active')
  })
  
  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - slider.offsetLeft
    const walk = (x - startX) * 1.5
    slider.scrollLeft = scrollLeftStart - walk
  })
  
  // Initialize: ensure scroll is at start
  slider.scrollLeft = 0
  
  // Wait for layout then update
  requestAnimationFrame(() => {
    slider.scrollLeft = 0
    updateSlider()
  })
}

// Testimonials slider with autoplay
const testimonialsSlider = document.querySelector('.testimonials-grid')
const testimonialsSection = document.querySelector('.testimonials')

if (testimonialsSlider && testimonialsSection) {
  // Get actual card width + gap for 2 columns
  const getScrollStep = () => {
    const card = testimonialsSlider.querySelector('.testimonial-card')
    return card ? (card.offsetWidth + 32) * 2 : 1000
  }
  let autoplayInterval
  let isUserInteracting = false
  let isInView = false
  
  // Autoplay function
  function startAutoplay() {
    if (autoplayInterval) return // Already running
    autoplayInterval = setInterval(() => {
      if (isUserInteracting || !isInView) return
      
      const maxScroll = testimonialsSlider.scrollWidth - testimonialsSlider.clientWidth
      
      if (testimonialsSlider.scrollLeft >= maxScroll - 1) {
        // Reset to start smoothly
        testimonialsSlider.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        testimonialsSlider.scrollBy({ left: getScrollStep(), behavior: 'smooth' })
      }
    }, 8000)
  }
  
  function stopAutoplay() {
    clearInterval(autoplayInterval)
    autoplayInterval = null
  }
  
  // Intersection Observer - start autoplay when 2/3 visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isInView = entry.isIntersecting
      if (entry.isIntersecting) {
        startAutoplay()
      } else {
        stopAutoplay()
      }
    })
  }, {
    threshold: 0.66 // 2/3 visible
  })
  
  observer.observe(testimonialsSection)
  
  // Drag to scroll
  let isDown = false
  let startX
  let scrollLeftStart
  
  testimonialsSlider.addEventListener('mousedown', (e) => {
    isDown = true
    isUserInteracting = true
    testimonialsSlider.classList.add('active')
    startX = e.pageX - testimonialsSlider.offsetLeft
    scrollLeftStart = testimonialsSlider.scrollLeft
  })
  
  testimonialsSlider.addEventListener('mouseleave', () => {
    if (isDown) {
      isDown = false
      testimonialsSlider.classList.remove('active')
      isUserInteracting = false
    }
  })
  
  testimonialsSlider.addEventListener('mouseup', () => {
    isDown = false
    testimonialsSlider.classList.remove('active')
    isUserInteracting = false
  })
  
  testimonialsSlider.addEventListener('mousemove', (e) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - testimonialsSlider.offsetLeft
    const walk = (x - startX) * 1.5
    testimonialsSlider.scrollLeft = scrollLeftStart - walk
  })
  
  // Pause autoplay on hover
  testimonialsSlider.addEventListener('mouseenter', () => {
    isUserInteracting = true
  })
  
  testimonialsSlider.addEventListener('mouseleave', () => {
    if (!isDown) {
      isUserInteracting = false
    }
  })
  
  // Touch support
  testimonialsSlider.addEventListener('touchstart', () => {
    isUserInteracting = true
  })
  
  testimonialsSlider.addEventListener('touchend', () => {
    isUserInteracting = false
  })
}
