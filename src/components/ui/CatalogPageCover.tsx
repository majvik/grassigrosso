import { useRef, type SyntheticEvent } from 'react'
import type { CatalogProductMediaItem } from '@/catalog/catalog-api'

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
  const mobileSource = useRef<HTMLSourceElement>(null)
  const ready = useRef(false)

  function announceReady() {
    if (!product || ready.current) return
    ready.current = true
    window.dispatchEvent(new CustomEvent('product-cover-ready'))
  }

  function recoverCover(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget
    if (window.matchMedia('(max-width: 900px)').matches && mobileSource.current) {
      mobileSource.current.srcset = mobilePlaceholder
    } else {
      image.removeAttribute('srcset')
      image.src = desktopPlaceholder
    }
    announceReady()
  }

  return (
    <picture className={className} data-product-cover-picture={product || undefined}>
      <source ref={mobileSource} media="(max-width: 900px)" sizes="100vw" srcSet={coverSrcSet(mobile) || mobile?.src || mobilePlaceholder} />
      <img
        data-product-cover-media={product || undefined}
        src={desktop?.fallbackSrc || desktop?.src || desktopPlaceholder}
        srcSet={coverSrcSet(desktop)}
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
