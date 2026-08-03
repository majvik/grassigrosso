import type { CatalogHeroFeed, CatalogHeroSlide } from './catalog-api'

function escapeAttr(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeUploadPath(url: string): string {
  const clean = String(url || '').split('?')[0].split('#')[0]
  const match = clean.match(/\/uploads\/[^/]+$/)
  return match ? match[0] : clean
}

/** Compare upload assets ignoring @2x suffix and raster extension (png/webp/avif). */
function normalizeUploadAssetKey(url: string): string {
  return normalizeUploadPath(url)
    .replace(/@2x(?=\.[^.]+$)/i, '')
    .replace(/\.(avif|webp|png|jpe?g)$/i, '')
}

function collectUploadPathsFromSlide(slideEl: Element): string[] {
  const attrs: string[] = []
  const img = slideEl.querySelector('img')
  if (img) {
    attrs.push(img.currentSrc || '', img.getAttribute('src') || '', img.getAttribute('srcset') || '')
  }
  slideEl.querySelectorAll('source').forEach((source) => {
    attrs.push(source.getAttribute('srcset') || '', source.getAttribute('src') || '')
  })
  const video = slideEl.querySelector('video')
  if (video) {
    attrs.push(video.getAttribute('src') || '', video.getAttribute('poster') || '')
    video.querySelectorAll('source').forEach((source) => {
      attrs.push(source.getAttribute('src') || '')
    })
  }
  const joined = attrs.filter(Boolean).join(' ')
  return joined.match(/\/uploads\/[^,\s]+/g) || []
}

function slideSrcMatchesExisting(existingSlide: Element, slide: CatalogHeroSlide): boolean {
  if (!existingSlide || !slide?.src) return false
  const feedKey = normalizeUploadAssetKey(String(slide.src))
  if (!feedKey) return false

  if (slide.type === 'video') {
    const video = existingSlide.querySelector('video')
    if (!video) return false
    const source = video.querySelector('source')
    const current = normalizeUploadPath(source?.getAttribute('src') || video.getAttribute('src') || '')
    const feedPath = normalizeUploadPath(String(slide.src))
    return current.endsWith(feedPath) || feedPath.endsWith(current)
  }

  return collectUploadPathsFromSlide(existingSlide).some(
    (path) => normalizeUploadAssetKey(path) === feedKey,
  )
}

function renderSlide(slide: CatalogHeroSlide, index: number): string {
  const active = index === 0
  const activeClass = active ? ' is-active' : ''
  const ariaHidden = active ? 'false' : 'true'
  const id = `catalog-hero-slide-${index}`
  const loading = index === 0 ? 'eager' : 'lazy'
  const fetchPriority = index === 0 ? ' fetchpriority="high"' : ''
  const alt = escapeAttr(slide.alt || '')
  const src = escapeAttr(slide.src || '')

  if (slide.type === 'video') {
    const poster = escapeAttr(slide.poster || '')
    const mime = escapeAttr(slide.mime || 'video/mp4')
    return `<div class="catalog-hero-slide${activeClass}" id="${id}" data-slide="${index}" aria-hidden="${ariaHidden}"><video${poster ? ` poster="${poster}"` : ''} muted loop playsinline preload="none" aria-label="${alt}"><source src="${src}" type="${mime}" /></video></div>`
  }

  return `<div class="catalog-hero-slide${activeClass}" id="${id}" data-slide="${index}" aria-hidden="${ariaHidden}"><img src="${src}" alt="${alt}" loading="${loading}" decoding="async"${fetchPriority} /></div>`
}

function renderDot(index: number): string {
  const active = index === 0
  const activeClass = active ? ' is-active' : ''
  const selected = active ? 'true' : 'false'
  const tabId = `catalog-hero-tab-${index}`
  const slideId = `catalog-hero-slide-${index}`
  const label = `Слайд ${index + 1}`

  return `<button type="button" class="catalog-hero-dot${activeClass}" role="tab" aria-selected="${selected}" aria-controls="${slideId}" id="${tabId}" data-target="${index}" aria-label="${escapeAttr(label)}"><span class="catalog-hero-dot-shape" aria-hidden="true"><span class="catalog-hero-dot-fill"></span></span></button>`
}

export function applyCatalogHeroFeed(sliderRoot: Element, data: CatalogHeroFeed): void {
  const slidesRoot = sliderRoot.querySelector('.catalog-hero-slides')
  const dotsRoot = sliderRoot.querySelector('.catalog-hero-dots')
  if (!slidesRoot || !dotsRoot) return

  const autoplayMs = Number(data.autoplayMs ?? data.autoplay_ms ?? (sliderRoot as HTMLElement).dataset.autoplayMs)
  if (Number.isFinite(autoplayMs) && autoplayMs >= 2500) {
    ;(sliderRoot as HTMLElement).dataset.autoplayMs = String(autoplayMs)
  }

  const slides = Array.isArray(data.slides) ? data.slides : []
  const existingSlides = [...slidesRoot.querySelectorAll('.catalog-hero-slide')]
  const slidesHtml = slides
    .map((slide, index) => {
      if (index === 0 && slideSrcMatchesExisting(existingSlides[0], slide)) {
        return existingSlides[0].outerHTML
      }
      return renderSlide(slide, index)
    })
    .join('')

  slidesRoot.innerHTML = slidesHtml
  dotsRoot.innerHTML = slides.map((_, index) => renderDot(index)).join('')
}

export function setDownloadCatalogMediaDisplayMode(
  sliderRoot: Element,
  displayMode: 'slider' | 'image_only',
): void {
  const root = sliderRoot as HTMLElement
  const isImageOnly = displayMode === 'image_only'
  root.classList.toggle('is-image-only', isImageOnly)
  if (isImageOnly) {
    root.removeAttribute('aria-roledescription')
    root.setAttribute('aria-label', 'Изображение каталога')
  } else {
    root.setAttribute('aria-roledescription', 'carousel')
    root.setAttribute('aria-label', 'Галерея каталога')
  }

  sliderRoot.querySelectorAll('.catalog-hero-nav-side').forEach((node) => {
    node.toggleAttribute('hidden', isImageOnly)
  })
  const dotsRoot = sliderRoot.querySelector('.catalog-hero-dots')
  if (dotsRoot instanceof HTMLElement) {
    if (isImageOnly) {
      dotsRoot.replaceChildren()
    }
    dotsRoot.hidden = isImageOnly
    dotsRoot.setAttribute('aria-hidden', isImageOnly ? 'true' : 'false')
  }
}
