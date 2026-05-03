import { gsap } from 'gsap'

export function initTestimonialsSlider() {
  const testimonialsSlider = document.querySelector('.testimonials-grid')
  const testimonialsSection = document.querySelector('.testimonials')

  if (!testimonialsSlider || !testimonialsSection) return

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

  if (originalCardCount > 0) {
    const copies = 5
    const sequenceWidth = getCardSpan() * originalCardCount

    for (let i = 0; i < copies; i++) {
      testimonialCards.forEach((card) => {
        const clone = card.cloneNode(true)
        testimonialsSlider.appendChild(clone)
      })
    }

    testimonialCards = testimonialsSlider.querySelectorAll('.testimonial-card')
    const startOffset = sequenceWidth * 2
    testimonialsSlider.style.transform = `translate3d(${-startOffset}px, 0, 0)`
  }

  const state = {
    currentX: originalCardCount > 0 ? getCardSpan() * originalCardCount * 2 : 0,
    targetX: originalCardCount > 0 ? getCardSpan() * originalCardCount * 2 : 0,
    isDragging: false,
    startX: 0,
    lastX: 0,
    lastMouseX: 0,
    isUserInteracting: false,
    isInView: false,
  }

  const snapToNearestCard = () => {
    if (!isMobileTestimonials()) return
    const cardSpan = getCardSpan()
    if (!cardSpan) return
    state.targetX = Math.round(state.targetX / cardSpan) * cardSpan
  }

  const LERP_FACTOR = 0.05
  const AUTOPLAY_LERP_FACTOR = 0.03
  let autoplayInterval = null
  let isAutoplayActive = false

  if (testimonialCards.length > 0) {
    gsap.set(testimonialCards, { opacity: 0, x: 50 })

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (!entry.isIntersecting) return
        gsap.to(entry.target, {
          opacity: 1,
          x: 0,
          duration: 0.7,
          delay: index * 0.08,
          ease: 'power2.out',
        })
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.1 })

    testimonialCards.forEach((card) => observer.observe(card))
  }

  const getScrollStep = () => {
    const cardSpan = getCardSpan()
    return cardSpan ? cardSpan * getCardsPerStep() : 1000
  }

  const getSequenceWidth = () => {
    const cardSpan = getCardSpan()
    return cardSpan ? cardSpan * originalCardCount : 0
  }

  function startAutoplay() {
    if (autoplayInterval) return
    isAutoplayActive = true
    autoplayInterval = setInterval(() => {
      if (state.isUserInteracting || !state.isInView) {
        isAutoplayActive = false
        return
      }
      state.targetX += getScrollStep()
    }, 16000)
  }

  function stopAutoplay() {
    if (!autoplayInterval) return
    clearInterval(autoplayInterval)
    autoplayInterval = null
    isAutoplayActive = false
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      state.isInView = entry.isIntersecting
      if (entry.isIntersecting) startAutoplay()
      else stopAutoplay()
    })
  }, { threshold: 0.66 })

  sectionObserver.observe(testimonialsSection)

  function animate() {
    const sequenceWidth = getSequenceWidth()
    const lerpFactor = isAutoplayActive && !state.isDragging ? AUTOPLAY_LERP_FACTOR : LERP_FACTOR

    state.currentX += (state.targetX - state.currentX) * lerpFactor

    const minBound = sequenceWidth * 1.5
    const maxBound = sequenceWidth * 2.5

    if (state.currentX > maxBound || state.targetX > maxBound) {
      state.currentX -= sequenceWidth
      state.targetX -= sequenceWidth
    } else if (state.currentX < minBound || state.targetX < minBound) {
      state.currentX += sequenceWidth
      state.targetX += sequenceWidth
    }

    testimonialsSlider.style.transform = `translate3d(${-state.currentX}px, 0, 0)`
    requestAnimationFrame(animate)
  }

  testimonialsSlider.addEventListener('mousedown', (event) => {
    state.isDragging = true
    state.isUserInteracting = true
    stopAutoplay()
    state.startX = event.clientX
    state.lastMouseX = event.clientX
    state.lastX = state.targetX
    testimonialsSlider.classList.add('active')
    event.preventDefault()
  })

  document.addEventListener('mousemove', (event) => {
    if (!state.isDragging) return
    event.preventDefault()
    const deltaX = (event.clientX - state.lastMouseX) * 2
    state.targetX -= deltaX
    state.lastMouseX = event.clientX
  })

  const stopMouseDrag = () => {
    if (!state.isDragging) return
    state.isDragging = false
    testimonialsSlider.classList.remove('active')
    snapToNearestCard()
    setTimeout(() => {
      state.isUserInteracting = false
    }, 300)
  }

  document.addEventListener('mouseup', stopMouseDrag)
  testimonialsSlider.addEventListener('mouseleave', stopMouseDrag)

  testimonialsSlider.addEventListener('touchstart', (event) => {
    state.isDragging = true
    state.isUserInteracting = true
    stopAutoplay()
    state.startX = event.touches[0].clientX
    state.lastX = state.targetX
    testimonialsSlider.classList.add('active')
  }, { passive: false })

  testimonialsSlider.addEventListener('touchmove', (event) => {
    if (!state.isDragging) return
    const deltaX = (event.touches[0].clientX - state.startX) * 1.5
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

  testimonialsSlider.addEventListener('mouseenter', () => {
    state.isUserInteracting = true
  })

  testimonialsSlider.addEventListener('mouseleave', () => {
    if (!state.isDragging) state.isUserInteracting = false
  })

  testimonialsSlider.addEventListener('dragstart', (event) => event.preventDefault())

  testimonialsSlider.style.overflow = 'visible'
  testimonialsSlider.style.transform = 'translate3d(0, 0, 0)'
  state.currentX = 0
  state.targetX = 0

  animate()
}
