import { gsap } from 'gsap'

export function initGeographyEffects() {
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
      entries.forEach((entry) => {
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
    }, { threshold: 0.1 })

    observer.observe(geographySection)
  }

  if (geographyMapContainer && geographyMapImg && geographySection) {
    let mapPointsAnimated = false
    const mapObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || mapPointsAnimated) return
        const svg = geographyMapContainer.querySelector('svg')
        if (!svg) return
        const group = svg.querySelector('g[clip-path]')
        if (!group) return
        const pointPaths = [...group.children].filter(
          (element) => element.tagName === 'path'
            && (element.getAttribute('fill') === '#283E37' || element.getAttribute('fill') === 'white'),
        )
        if (pointPaths.length === 0) return
        mapPointsAnimated = true

        const pathsPerPoint = 4
        const groups = []
        for (let index = 0; index < pointPaths.length; index += pathsPerPoint) {
          groups.push(pointPaths.slice(index, index + pathsPerPoint))
        }

        groups.forEach((item, index) => {
          gsap.fromTo(
            item,
            { opacity: 0, scale: 0, transformOrigin: '50% 50%' },
            { opacity: 1, scale: 1, duration: 0.7, delay: index * 0.056, ease: 'back.out', transformOrigin: '50% 50%' },
          )
        })
      })
    }, { threshold: 0.15 })

    fetch(geographyMapImg.getAttribute('src'))
      .then((response) => response.text())
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
}
