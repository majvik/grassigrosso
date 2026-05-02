import type { CatalogHeroFeed, CatalogHeroSlide } from './catalog-api'

function escapeAttr(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
    return `<div class="catalog-hero-slide${activeClass}" id="${id}" data-slide="${index}" aria-hidden="${ariaHidden}"><video${poster ? ` poster="${poster}"` : ''} muted loop playsinline preload="metadata" aria-label="${alt}"><source src="${src}" type="${mime}" /></video></div>`
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
  slidesRoot.innerHTML = slides.map(renderSlide).join('')
  dotsRoot.innerHTML = slides.map((_, index) => renderDot(index)).join('')
}
