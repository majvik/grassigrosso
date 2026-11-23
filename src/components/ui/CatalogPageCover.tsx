import { useRef, useState } from 'react'
import type { CatalogProductMediaItem } from '@/catalog/catalog-api'
import { buildResponsiveMediaSet } from '@/media/responsive-media'

const desktopPlaceholder = '/media-placeholders/product-cover-desktop.svg'
const mobilePlaceholder = '/media-placeholders/product-cover-mobile.svg'

function coverSrcSet(media?: CatalogProductMediaItem | null): string | undefined {
  if (!media?.sources?.length) return undefined
  const widths = new Map<number, string>()
  for (const {src, width} of media.sources) {
    if (width && !widths.has(width)) widths.set(width, src)
  }
  const original = media.sources.find((source) => source.src === media.fallbackSrc)
  if (original?.width && media.src) widths.set(original.width, media.src)
  return widths.size ? [...widths].map(([width, src]) => `${src} ${width}w`).join(', ') : undefined
}

export function CatalogPageCover({ desktop, mobile, alt, className, product = false }: {
  desktop?: CatalogProductMediaItem | null
  mobile?: CatalogProductMediaItem | null
  alt: string
  className?: string
  product?: boolean
}) {
  const [desktopFallback, setDesktopFallback] = useState(0)
  const [mobileFallback, setMobileFallback] = useState(0)
  const ready = useRef(false)
  const mobileQuery = '(max-width: 900px)'

  function cover(media: CatalogProductMediaItem | null | undefined, slot: string, placeholder: string, fallback: number) {
    const original = media?.fallbackSrc || media?.src
    if (!original || fallback > 1) return { src: placeholder }
    if (fallback || /\.svg(?:[?#]|$)/i.test(original)) {
      return { src: original, srcSet: coverSrcSet(media) }
    }
    const variants = buildResponsiveMediaSet(original, slot)
    const widthDescriptors = (srcSet: string) => srcSet
      .replace(' 1x', ` ${variants.width}w`)
      .replace(' 2x', ` ${variants.width * 2}w`)
    return {
      src: variants.fallbackSrc,
      srcSet: widthDescriptors(variants.fallbackSrcSet),
      sources: variants.sources.map((source) => ({ ...source, srcSet: widthDescriptors(source.srcSet) })),
    }
  }

  const desktopCover = cover(desktop, 'product-cover-desktop', desktopPlaceholder, desktopFallback)
  const mobileCover = cover(mobile, 'product-cover-mobile', mobilePlaceholder, mobileFallback)

  function announceReady() {
    if (!product || ready.current) return
    ready.current = true
    window.dispatchEvent(new CustomEvent('product-cover-ready'))
  }

  function recoverCover() {
    if (window.matchMedia(mobileQuery).matches) {
      setMobileFallback((stage) => Math.min(stage + 1, 2))
    } else {
      setDesktopFallback((stage) => Math.min(stage + 1, 2))
    }
    announceReady()
  }

  return (
    <picture className={className} data-product-cover-picture={product || undefined}>
      {mobileCover.sources?.map(({type, srcSet}) => <source key={type} media={mobileQuery} type={type} srcSet={srcSet} sizes="100vw" />)}
      {!mobileCover.sources && <source media={mobileQuery} sizes="100vw" srcSet={mobileCover.srcSet || mobileCover.src} />}
      {desktopCover.sources?.map(({type, srcSet}) => <source key={type} type={type} srcSet={srcSet} sizes="100vw" />)}
      <img
        data-product-cover-media={product || undefined}
        src={desktopCover.src}
        srcSet={desktopCover.srcSet}
        sizes="100vw"
        alt={alt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onLoad={announceReady}
        onError={recoverCover}
      />
    </picture>
  )
}
