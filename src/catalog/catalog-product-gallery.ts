import type { CatalogProductMediaItem } from './catalog-api'

export type CatalogGallerySlideSnapshot = {
  type: 'image' | 'video'
  src: string
  alt: string
  poster?: string
}

export type CatalogProductMediaHtmlOptions = {
  rootClass?: string
  productSlug?: string
  carousel?: boolean
}

const GALLERY_ROOT_SELECTOR = '[data-catalog-card-media]'
const INTERACT_FLAG = 'data-catalog-gallery-did-interact'
const LEGACY_INIT_FLAG = 'data-catalog-gallery-init'

const galleryControllers = new WeakMap<HTMLElement, { destroy: () => void }>()

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttrJson(value: unknown): string {
  return escapeHtml(JSON.stringify(value))
}

export function normalizeCatalogGalleryItems(
  items: CatalogProductMediaItem[] | null | undefined,
  fallback?: { imageUrl?: string | null; imageAlt?: string | null },
): CatalogProductMediaItem[] {
  const out: CatalogProductMediaItem[] = []
  const seen = new Set<string>()

  const push = (item: CatalogProductMediaItem | null | undefined): void => {
    if (!item?.src) return
    const key = `${item.type}|${item.src}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({
      type: item.type === 'video' ? 'video' : 'image',
      src: String(item.src),
      poster: item.poster ? String(item.poster) : undefined,
      alt: item.alt ? String(item.alt) : undefined,
      mime: item.mime ? String(item.mime) : undefined,
    })
  }

  if (Array.isArray(items)) {
    for (const item of items) push(item)
  }

  if (!out.length && fallback?.imageUrl) {
    push({
      type: 'image',
      src: String(fallback.imageUrl),
      alt: fallback.imageAlt ? String(fallback.imageAlt) : undefined,
    })
  }

  return out.slice(0, 5)
}

function buildSlideHtml(item: CatalogProductMediaItem, index: number, eager: boolean): string {
  const activeClass = index === 0 ? ' is-active' : ''
  const alt = escapeHtml(item.alt || '')
  if (item.type === 'video') {
    const poster = escapeHtml(item.poster || '')
    const mime = escapeHtml(item.mime || 'video/mp4')
    return (
      `<div class="catalogue-new-card-media-slide${activeClass}" data-catalog-gallery-slide="${index}">` +
      `<video class="catalogue-new-card-media-video" muted playsinline loop preload="none"` +
      (poster ? ` poster="${poster}"` : '') +
      ` data-src="${escapeHtml(item.src)}"` +
      (mime ? ` data-mime="${mime}"` : '') +
      ` aria-label="${alt || 'Видео'}"></video>` +
      `</div>`
    )
  }

  const loading = eager ? 'eager' : 'lazy'
  const fetchPriority = eager ? ' fetchpriority="high"' : ''
  return (
    `<div class="catalogue-new-card-media-slide${activeClass}" data-catalog-gallery-slide="${index}">` +
    `<img src="${escapeHtml(item.src)}" alt="${alt}" loading="${loading}" decoding="async"${fetchPriority} />` +
    `</div>`
  )
}

function buildCatalogProductMediaInnerHtml(gallery: CatalogProductMediaItem[]): {
  slidesHtml: string
  dotsBlock: string
  carousel: boolean
} {
  const carousel = gallery.length >= 2
  const slidesHtml = gallery.map((item, index) => buildSlideHtml(item, index, index === 0)).join('')
  const dotsHtml = carousel
    ? gallery
        .map(
          (_, index) =>
            `<button type="button" class="catalogue-new-card-media-dot${index === 0 ? ' is-active' : ''}" data-catalog-gallery-dot="${index}" aria-label="Слайд ${index + 1}"></button>`,
        )
        .join('')
    : ''
  const dotsBlock = carousel
    ? `<div class="catalogue-new-card-media-dots" data-catalog-gallery-dots>${dotsHtml}</div>`
    : ''
  return { slidesHtml, dotsBlock, carousel }
}

export function applyCatalogProductMediaHostAttributes(
  host: HTMLElement,
  gallery: CatalogProductMediaItem[],
  options: CatalogProductMediaHtmlOptions = {},
): void {
  const rootClass = options.rootClass || 'catalogue-new-card-media'
  host.className = rootClass
  host.setAttribute('data-catalog-card-media', '')
  if (options.productSlug) host.setAttribute('data-product-slug', options.productSlug)
  if (gallery.length >= 2 && options.carousel !== false) {
    host.setAttribute('data-catalog-gallery-enabled', 'true')
    host.setAttribute('role', 'region')
    host.setAttribute('aria-roledescription', 'carousel')
  } else {
    host.removeAttribute('data-catalog-gallery-enabled')
    host.removeAttribute('role')
    host.removeAttribute('aria-roledescription')
  }
  host.setAttribute('data-catalog-gallery', JSON.stringify(gallery))
}

export function mountCatalogProductMedia(
  host: HTMLElement,
  rawGallery: CatalogProductMediaItem[] | null | undefined,
  options: CatalogProductMediaHtmlOptions = {},
  fallback?: { imageUrl?: string | null; imageAlt?: string | null },
): void {
  const gallery = normalizeCatalogGalleryItems(rawGallery, fallback)
  applyCatalogProductMediaHostAttributes(host, gallery, options)
  const { slidesHtml, dotsBlock } = buildCatalogProductMediaInnerHtml(gallery)
  host.innerHTML =
    `<div class="catalogue-new-card-media-viewport" data-catalog-gallery-viewport tabindex="-1">` +
    slidesHtml +
    `</div>` +
    dotsBlock
}

export function buildCatalogProductMediaHtml(
  rawGallery: CatalogProductMediaItem[] | null | undefined,
  options: CatalogProductMediaHtmlOptions = {},
  fallback?: { imageUrl?: string | null; imageAlt?: string | null },
): string {
  const gallery = normalizeCatalogGalleryItems(rawGallery, fallback)
  const rootClass = escapeHtml(options.rootClass || 'catalogue-new-card-media')
  const productSlug = options.productSlug ? escapeHtml(options.productSlug) : ''
  const slugAttr = productSlug ? ` data-product-slug="${productSlug}"` : ''
  const { slidesHtml, dotsBlock, carousel } = buildCatalogProductMediaInnerHtml(gallery)
  const carouselAttr = carousel && options.carousel !== false ? ' data-catalog-gallery-enabled="true"' : ''
  const aria = carousel && options.carousel !== false ? ' role="region" aria-roledescription="carousel"' : ''

  return (
    `<div class="${rootClass}" data-catalog-card-media${slugAttr}${carouselAttr}${aria} data-catalog-gallery="${escapeAttrJson(gallery)}">` +
    `<div class="catalogue-new-card-media-viewport" data-catalog-gallery-viewport tabindex="-1">` +
    slidesHtml +
    `</div>` +
    dotsBlock +
    `</div>`
  )
}

export function readGalleryFromElement(root: Element | null): CatalogProductMediaItem[] {
  if (!root || !(root instanceof HTMLElement)) return []
  const raw = root.getAttribute('data-catalog-gallery')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return normalizeCatalogGalleryItems(Array.isArray(parsed) ? (parsed as CatalogProductMediaItem[]) : [])
  } catch {
    return []
  }
}

export function getActiveSlideSnapshot(root: Element | null): CatalogGallerySlideSnapshot | null {
  if (!root || !(root instanceof HTMLElement)) return null
  const activeSlide = root.querySelector<HTMLElement>('.catalogue-new-card-media-slide.is-active')
  if (!activeSlide) return null
  const video = activeSlide.querySelector<HTMLVideoElement>('video')
  if (video) {
    const src = video.getAttribute('src') || video.dataset.src || ''
    const poster = video.getAttribute('poster') || ''
    return {
      type: 'video',
      src: src || poster,
      alt: video.getAttribute('aria-label') || '',
      poster: poster || undefined,
    }
  }
  const img = activeSlide.querySelector<HTMLImageElement>('img')
  if (!img) return null
  return {
    type: 'image',
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || '',
  }
}

function prefersGalleryScrub(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function markGalleryInteracted(root: HTMLElement): void {
  root.setAttribute(INTERACT_FLAG, '1')
}

function syncVideoSlide(slide: HTMLElement, active: boolean): void {
  const video = slide.querySelector<HTMLVideoElement>('video')
  if (!video) return
  const dataSrc = video.dataset.src || ''
  if (active) {
    if (dataSrc && !video.getAttribute('src')) {
      video.setAttribute('src', dataSrc)
      const mime = video.dataset.mime
      if (mime) {
        let source = video.querySelector<HTMLSourceElement>('source')
        if (!source) {
          source = document.createElement('source')
          video.appendChild(source)
        }
        source.src = dataSrc
        source.type = mime
      }
    }
    video.load()
    void video.play().catch(() => {})
    return
  }
  video.pause()
  video.currentTime = 0
}

function bindGalleryController(root: HTMLElement): void {
  const gallery = readGalleryFromElement(root)
  if (gallery.length < 2) return

  const viewport = root.querySelector<HTMLElement>('[data-catalog-gallery-viewport]')
  const slides = [...root.querySelectorAll<HTMLElement>('[data-catalog-gallery-slide]')]
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-catalog-gallery-dot]')]
  if (!viewport || slides.length < 2) return

  let activeIndex = slides.findIndex((slide) => slide.classList.contains('is-active'))
  if (activeIndex < 0) activeIndex = 0

  const setActiveIndex = (nextIndex: number, options?: { markInteract?: boolean }): void => {
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIndex))
    if (clamped === activeIndex) return
    if (options?.markInteract) markGalleryInteracted(root)
    slides[activeIndex]?.classList.remove('is-active')
    syncVideoSlide(slides[activeIndex], false)
    activeIndex = clamped
    slides[activeIndex]?.classList.add('is-active')
    syncVideoSlide(slides[activeIndex], true)
    dots.forEach((dot, index) => {
      dot.classList.toggle('is-active', index === activeIndex)
    })
  }

  const scrubToPointer = (clientX: number): void => {
    const rect = viewport.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const index = Math.min(slides.length - 1, Math.floor(ratio * slides.length))
    if (index !== activeIndex) setActiveIndex(index)
  }

  const useMouseScrub = prefersGalleryScrub()
  const hasTouchScreen = typeof window !== 'undefined' && 'ontouchstart' in window
  const bindTarget = root
  const cleanups: Array<() => void> = []
  const SWIPE_THRESHOLD_PX = 32

  if (useMouseScrub) {
    const onMouseScrubMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return
      scrubToPointer(event.clientX)
    }
    const onMouseScrubLeave = (): void => {
      setActiveIndex(0)
    }
    viewport.addEventListener('pointermove', onMouseScrubMove)
    viewport.addEventListener('pointerleave', onMouseScrubLeave)
    cleanups.push(() => {
      viewport.removeEventListener('pointermove', onMouseScrubMove)
      viewport.removeEventListener('pointerleave', onMouseScrubLeave)
    })
  }

  let startX = 0
  let startY = 0
  let tracking = false
  let touchTracking = false
  let swipeHandledAt = 0

  const isHorizontalSwipe = (dx: number, dy: number): boolean =>
    Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)

  const finishSwipe = (dx: number, dy: number): void => {
    if (!isHorizontalSwipe(dx, dy)) return
    const now = Date.now()
    if (now - swipeHandledAt < 300) return
    swipeHandledAt = now
    markGalleryInteracted(root)
    setActiveIndex(activeIndex + (dx < 0 ? 1 : -1), { markInteract: true })
  }

  if (hasTouchScreen) {
    const onTouchStart = (event: TouchEvent): void => {
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      if (!touch) return
      touchTracking = true
      startX = touch.clientX
      startY = touch.clientY
    }

    const onTouchMove = (event: TouchEvent): void => {
      if (!touchTracking || event.touches.length !== 1) return
      const touch = event.touches[0]
      if (!touch) return
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onTouchEnd = (event: TouchEvent): void => {
      if (!touchTracking) return
      touchTracking = false
      const touch = event.changedTouches[0]
      if (!touch) return
      finishSwipe(touch.clientX - startX, touch.clientY - startY)
    }

    bindTarget.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    bindTarget.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    bindTarget.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })
    bindTarget.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true })
    cleanups.push(() => {
      bindTarget.removeEventListener('touchstart', onTouchStart, true)
      bindTarget.removeEventListener('touchmove', onTouchMove, true)
      bindTarget.removeEventListener('touchend', onTouchEnd, true)
      bindTarget.removeEventListener('touchcancel', onTouchEnd, true)
    })
  }

  const pointerSwipeForMouseOnly = hasTouchScreen
  if (!hasTouchScreen || pointerSwipeForMouseOnly) {
    const onSwipePointerDown = (event: PointerEvent): void => {
      if (pointerSwipeForMouseOnly && event.pointerType !== 'mouse') return
      if (event.pointerType === 'mouse' && useMouseScrub) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      tracking = true
      startX = event.clientX
      startY = event.clientY
      try {
        bindTarget.setPointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
    }

    const onSwipePointerMove = (event: PointerEvent): void => {
      if (!tracking) return
      if (pointerSwipeForMouseOnly && event.pointerType !== 'mouse') return
      if (event.pointerType === 'mouse' && useMouseScrub) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        event.preventDefault()
      }
    }

    const onSwipePointerEnd = (event: PointerEvent): void => {
      if (!tracking) return
      tracking = false
      if (pointerSwipeForMouseOnly && event.pointerType !== 'mouse') return
      if (event.pointerType === 'mouse' && useMouseScrub) return
      finishSwipe(event.clientX - startX, event.clientY - startY)
      try {
        bindTarget.releasePointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
    }

    bindTarget.addEventListener('pointerdown', onSwipePointerDown)
    bindTarget.addEventListener('pointermove', onSwipePointerMove, { passive: false })
    bindTarget.addEventListener('pointerup', onSwipePointerEnd)
    bindTarget.addEventListener('pointercancel', onSwipePointerEnd)
    cleanups.push(() => {
      bindTarget.removeEventListener('pointerdown', onSwipePointerDown)
      bindTarget.removeEventListener('pointermove', onSwipePointerMove)
      bindTarget.removeEventListener('pointerup', onSwipePointerEnd)
      bindTarget.removeEventListener('pointercancel', onSwipePointerEnd)
    })
  }

  dots.forEach((dot) => {
    const onDotClick = (event: Event): void => {
      event.preventDefault()
      event.stopPropagation()
      const index = Number(dot.dataset.catalogGalleryDot)
      if (!Number.isFinite(index)) return
      setActiveIndex(index, { markInteract: true })
    }
    dot.addEventListener('click', onDotClick)
    cleanups.push(() => dot.removeEventListener('click', onDotClick))
  })

  syncVideoSlide(slides[activeIndex], true)

  galleryControllers.set(root, {
    destroy: () => {
      cleanups.forEach((fn) => fn())
      galleryControllers.delete(root)
      slides.forEach((slide) => syncVideoSlide(slide, false))
    },
  })
}

export function destroyCatalogProductGalleries(root: ParentNode = document): void {
  collectGalleryHosts(root).forEach((el) => {
    galleryControllers.get(el)?.destroy()
    el.removeAttribute(LEGACY_INIT_FLAG)
  })
}

function collectGalleryHosts(root: ParentNode): HTMLElement[] {
  const hosts: HTMLElement[] = []
  if (root instanceof HTMLElement && root.matches(GALLERY_ROOT_SELECTOR)) {
    hosts.push(root)
  }
  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
    root.querySelectorAll<HTMLElement>(GALLERY_ROOT_SELECTOR).forEach((el) => {
      if (!hosts.includes(el)) hosts.push(el)
    })
  }
  return hosts
}

export function initCatalogProductGalleries(root: ParentNode = document): void {
  collectGalleryHosts(root).forEach((el) => {
    el.removeAttribute(LEGACY_INIT_FLAG)
    if (galleryControllers.has(el)) return
    bindGalleryController(el)
  })
}

export function getCatalogGalleryActiveIndex(root: Element | null): number {
  if (!root || !(root instanceof HTMLElement)) return 0
  const slides = [...root.querySelectorAll<HTMLElement>('[data-catalog-gallery-slide]')]
  const index = slides.findIndex((slide) => slide.classList.contains('is-active'))
  return index >= 0 ? index : 0
}

export function setCatalogGalleryActiveIndex(root: HTMLElement, nextIndex: number): void {
  const slides = [...root.querySelectorAll<HTMLElement>('[data-catalog-gallery-slide]')]
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-catalog-gallery-dot]')]
  if (!slides.length) return
  const clamped = Math.max(0, Math.min(slides.length - 1, nextIndex))
  slides.forEach((slide, index) => {
    const active = index === clamped
    slide.classList.toggle('is-active', active)
    syncVideoSlide(slide, active)
  })
  dots.forEach((dot, index) => {
    dot.classList.toggle('is-active', index === clamped)
  })
}

export function wasCatalogGalleryInteracted(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const root = target.closest<HTMLElement>(GALLERY_ROOT_SELECTOR)
  if (!root) return false
  if (root.getAttribute(INTERACT_FLAG) !== '1') return false
  root.removeAttribute(INTERACT_FLAG)
  return true
}
