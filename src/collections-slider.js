import { gsap } from 'gsap'

export function initCollectionsSlider() {
  const slider = document.querySelector('.collections-grid')
  const prevBtn = document.querySelector('.collections-arrows .arrow-btn.prev')
  const nextBtn = document.querySelector('.collections-arrows .arrow-btn.next')
  const progressFill = document.querySelector('.collections-progress-fill')

  if (!slider || !prevBtn || !nextBtn || !progressFill) return

  const cards = slider.querySelectorAll('.collection-card')
  const cardImages = slider.querySelectorAll('.collection-image img')

  function getVisibleCollectionCards() {
    return [...cards].filter((card) => card.offsetWidth > 0)
  }

  function getMaxCollectionScroll() {
    return Math.max(0, slider.scrollWidth - slider.clientWidth)
  }

  function getCollectionSnapPositions() {
    const maxScroll = getMaxCollectionScroll()
    const visible = getVisibleCollectionCards()
    if (!visible.length) return [0, maxScroll]
    const firstLeft = visible[0].offsetLeft
    const fromCards = visible.map((card) => card.offsetLeft - firstLeft)
    const merged = [...new Set([0, ...fromCards, maxScroll])]
    return merged
      .map((position) => Math.max(0, Math.min(maxScroll, position)))
      .filter((position, index, all) => all.indexOf(position) === index)
      .sort((a, b) => a - b)
  }

  const state = {
    currentX: 0,
    targetX: 0,
    isDragging: false,
    startX: 0,
    lastX: 0,
    lastMouseX: 0,
  }

  function snapCollectionToNearest() {
    const maxScroll = getMaxCollectionScroll()
    const positions = getCollectionSnapPositions()
    if (!positions.length) return
    let best = positions[0]
    let bestDist = Infinity
    for (const position of positions) {
      const distance = Math.abs(state.targetX - position)
      if (distance < bestDist) {
        bestDist = distance
        best = position
      }
    }
    state.targetX = Math.max(0, Math.min(maxScroll, best))
  }

  function goCollectionPrev() {
    const positions = getCollectionSnapPositions()
    const prev = [...positions].reverse().find((position) => position < state.targetX - 2)
    state.targetX = prev !== undefined ? prev : 0
  }

  function goCollectionNext() {
    const maxScroll = getMaxCollectionScroll()
    const positions = getCollectionSnapPositions()
    const next = positions.find((position) => position > state.targetX + 2)
    state.targetX = next !== undefined ? next : maxScroll
  }

  cardImages.forEach((img) => {
    img.style.willChange = 'transform'
    img.style.transformOrigin = 'center center'
  })

  const LERP_FACTOR = 0.08
  const scale = 1.25

  function updateParallax() {
    const viewportCenter = window.innerWidth / 2
    cards.forEach((card) => {
      const img = card.querySelector('.collection-image img')
      if (!img) return
      const cardRect = card.getBoundingClientRect()
      if (cardRect.right < -500 || cardRect.left > window.innerWidth + 500) return

      const maxParallaxPx = (cardRect.width * (scale - 1)) / 2
      const coefficient = (maxParallaxPx / (viewportCenter || 1)) * 0.9
      const cardCenter = cardRect.left + cardRect.width / 2
      const distanceFromCenter = cardCenter - viewportCenter
      const parallaxOffset = distanceFromCenter * -coefficient
      img.style.transform = `translateX(${parallaxOffset}px) scale(${scale})`
    })
  }

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

  function animate() {
    const maxScroll = getMaxCollectionScroll()
    state.targetX = Math.max(0, Math.min(maxScroll, state.targetX))
    state.currentX += (state.targetX - state.currentX) * LERP_FACTOR
    slider.style.transform = `translate3d(${-state.currentX}px, 0, 0)`
    updateParallax()
    updateUI()
    requestAnimationFrame(animate)
  }

  prevBtn.addEventListener('click', goCollectionPrev)
  nextBtn.addEventListener('click', goCollectionNext)

  slider.addEventListener('mousedown', (event) => {
    state.isDragging = true
    state.startX = event.clientX
    state.lastMouseX = event.clientX
    state.lastX = state.targetX
    slider.classList.add('active')
    event.preventDefault()
  })

  document.addEventListener('mousemove', (event) => {
    if (!state.isDragging) return
    event.preventDefault()
    const deltaX = (event.clientX - state.lastMouseX) * 2
    state.targetX -= deltaX
    state.lastMouseX = event.clientX
  })

  document.addEventListener('mouseup', () => {
    if (!state.isDragging) return
    state.isDragging = false
    slider.classList.remove('active')
    snapCollectionToNearest()
  })

  slider.addEventListener('mouseleave', () => {
    if (!state.isDragging) return
    state.isDragging = false
    slider.classList.remove('active')
    snapCollectionToNearest()
  })

  slider.addEventListener('touchstart', (event) => {
    state.isDragging = true
    state.startX = event.touches[0].clientX
    state.lastX = state.targetX
    slider.classList.add('active')
  }, { passive: false })

  slider.addEventListener('touchmove', (event) => {
    if (!state.isDragging) return
    const deltaX = (event.touches[0].clientX - state.startX) * 1.5
    state.targetX = state.lastX - deltaX
  }, { passive: false })

  const stopTouchDrag = () => {
    state.isDragging = false
    slider.classList.remove('active')
    snapCollectionToNearest()
  }
  slider.addEventListener('touchend', stopTouchDrag)
  slider.addEventListener('touchcancel', stopTouchDrag)
  slider.addEventListener('dragstart', (event) => event.preventDefault())

  slider.style.overflow = 'visible'
  slider.style.transform = 'translate3d(0, 0, 0)'
  state.currentX = 0
  state.targetX = 0

  window.addEventListener('resize', () => {
    const maxScroll = getMaxCollectionScroll()
    state.targetX = Math.min(state.targetX, maxScroll)
    snapCollectionToNearest()
  })

  animate()

  if (cards.length > 0) {
    gsap.set(cards, { opacity: 0, y: 30 })
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (!entry.isIntersecting) return
        gsap.to(entry.target, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: index * 0.1,
          ease: 'power2.out',
        })
        observer.unobserve(entry.target)
      })
    }, { threshold: 0 })

    requestAnimationFrame(() => {
      cards.forEach((card) => observer.observe(card))
    })
  }
}
