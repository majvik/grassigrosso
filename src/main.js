import './style.css'

// Cookie banner
const cookieBanner = document.querySelector('.cookie-banner')
const cookieBtn = document.querySelector('.btn-cookie')

if (cookieBtn && cookieBanner) {
  if (localStorage.getItem('cookieAccepted')) {
    cookieBanner.style.display = 'none'
  }
  
  cookieBtn.addEventListener('click', () => {
    cookieBanner.style.opacity = '0'
    cookieBanner.style.transform = 'translateY(20px)'
    setTimeout(() => {
      cookieBanner.style.display = 'none'
    }, 300)
    localStorage.setItem('cookieAccepted', 'true')
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

if (testimonialsSlider) {
  // Get actual card width + gap for 2 columns
  const getScrollStep = () => {
    const card = testimonialsSlider.querySelector('.testimonial-card')
    return card ? (card.offsetWidth + 32) * 2 : 1000
  }
  let autoplayInterval
  let isUserInteracting = false
  
  // Autoplay function
  function startAutoplay() {
    autoplayInterval = setInterval(() => {
      if (isUserInteracting) return
      
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
  }
  
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
    stopAutoplay()
  })
  
  testimonialsSlider.addEventListener('mouseleave', () => {
    if (isDown) {
      isDown = false
      testimonialsSlider.classList.remove('active')
      isUserInteracting = false
      startAutoplay()
    }
  })
  
  testimonialsSlider.addEventListener('mouseup', () => {
    isDown = false
    testimonialsSlider.classList.remove('active')
    isUserInteracting = false
    startAutoplay()
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
    stopAutoplay()
  })
  
  testimonialsSlider.addEventListener('touchend', () => {
    isUserInteracting = false
    startAutoplay()
  })
  
  // Start autoplay
  startAutoplay()
}
