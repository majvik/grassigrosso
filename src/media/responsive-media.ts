import { getResponsiveMediaSlot, type ResponsiveMediaSlot } from './responsive-media-slots'

export type ResponsiveSource = {
  type: 'image/avif' | 'image/webp' | 'image/png'
  srcSet: string
}

export type ResponsiveMediaSet = {
  slot: ResponsiveMediaSlot
  sources: ResponsiveSource[]
  fallbackSrc: string
  fallbackSrcSet: string
  width: number
  height: number
}

function splitUrl(url: string): { pathname: string; suffix: string } {
  const match = String(url || '').match(/^([^?#]*)(.*)$/)
  return { pathname: match?.[1] || '', suffix: match?.[2] || '' }
}

export function responsiveVariantBase(src: string, slotId: string): string {
  const { pathname } = splitUrl(src)
  const slash = pathname.lastIndexOf('/')
  const directory = slash >= 0 ? pathname.slice(0, slash) : ''
  const filename = slash >= 0 ? pathname.slice(slash + 1) : pathname
  const basename = filename.replace(/\.[^.]+$/, '')
  return `${directory}/responsive/${basename}--${slotId}`
}

export function placeholderVariantBase(slotId: string): string {
  return `/media-placeholders/${slotId}`
}

export function buildResponsiveMediaSet(src: string, slotId: string, placeholder = false): ResponsiveMediaSet {
  const slot = getResponsiveMediaSlot(slotId)
  const base = placeholder ? placeholderVariantBase(slotId) : responsiveVariantBase(src, slotId)
  const makeSrcSet = (extension: string) => `${base}.${extension} 1x, ${base}@2x.${extension} 2x`
  return {
    slot,
    sources: [
      { type: 'image/avif', srcSet: makeSrcSet('avif') },
      { type: 'image/webp', srcSet: makeSrcSet('webp') },
      { type: 'image/png', srcSet: makeSrcSet('png') },
    ],
    fallbackSrc: `${base}.png`,
    fallbackSrcSet: makeSrcSet('png'),
    width: slot.width,
    height: slot.height,
  }
}

export function applyResponsivePlaceholder(
  picture: HTMLPictureElement | null,
  image: HTMLImageElement,
  slotId: string,
): void {
  if (image.dataset.placeholderApplied === 'true') return
  image.dataset.placeholderApplied = 'true'
  const fallback = buildResponsiveMediaSet('', slotId, true)
  const sourceNodes = picture ? [...picture.querySelectorAll('source')] : []
  fallback.sources.forEach((source, index) => {
    const node = sourceNodes[index]
    if (!node) return
    node.type = source.type
    node.srcset = source.srcSet
  })
  image.src = fallback.fallbackSrc
  image.srcset = fallback.fallbackSrcSet
}

export function applyResponsiveOriginalFallback(
  picture: HTMLPictureElement | null,
  image: HTMLImageElement,
  originalSrc: string,
): boolean {
  const source = String(originalSrc || '').trim()
  if (!source || image.dataset.originalFallbackApplied === 'true') return false
  image.dataset.originalFallbackApplied = 'true'
  picture?.querySelectorAll('source').forEach((node) => node.removeAttribute('srcset'))
  image.removeAttribute('srcset')
  image.src = source
  return true
}

const fallbackRoots = new WeakSet<Document | Element>()

export function installResponsiveMediaFallbacks(root: Document | Element = document): void {
  const applyForImage = (image: HTMLImageElement): void => {
    const picture = image.closest<HTMLPictureElement>('picture[data-responsive-picture]')
    if (!picture) return
    if (applyResponsiveOriginalFallback(picture, image, image.dataset.originalSrc || '')) return
    applyResponsivePlaceholder(picture, image, picture.dataset.mediaSlot || 'catalog-card')
  }
  if (!fallbackRoots.has(root)) {
    fallbackRoots.add(root)
    root.addEventListener('error', (event) => {
      if (event.target instanceof HTMLImageElement) applyForImage(event.target)
    }, true)
  }
  root.querySelectorAll<HTMLImageElement>('picture[data-responsive-picture] img').forEach((image) => {
    if (image.complete && image.naturalWidth === 0) applyForImage(image)
  })
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildResponsivePictureHtml({
  src,
  slotId,
  alt = '',
  sizes = '100vw',
  eager = false,
  className = '',
}: {
  src: string
  slotId: string
  alt?: string
  sizes?: string
  eager?: boolean
  className?: string
}): string {
  const media = buildResponsiveMediaSet(src, slotId, !src)
  const sources = media.sources.map((source) => `<source type="${source.type}" srcset="${escapeHtml(source.srcSet)}" sizes="${escapeHtml(sizes)}" />`).join('')
  return `<picture data-responsive-picture data-media-slot="${escapeHtml(slotId)}">${sources}<img${className ? ` class="${escapeHtml(className)}"` : ''} data-original-src="${escapeHtml(src)}" src="${escapeHtml(media.fallbackSrc)}" srcset="${escapeHtml(media.fallbackSrcSet)}" sizes="${escapeHtml(sizes)}" width="${media.width}" height="${media.height}" alt="${escapeHtml(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''} /></picture>`
}
