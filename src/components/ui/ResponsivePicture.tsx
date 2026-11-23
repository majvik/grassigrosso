import { useMemo, useRef, type ReactEventHandler } from 'react'

import { applyResponsiveOriginalFallback, applyResponsivePlaceholder, buildResponsiveMediaSet } from '@/media/responsive-media'

export function ResponsivePicture({
  src,
  slotId,
  mobileSlotId,
  alt = '',
  sizes = '100vw',
  eager = false,
  className,
  catalogFallback = false,
  onLoad,
}: {
  src: string
  slotId: string
  mobileSlotId?: string
  alt?: string
  sizes?: string
  eager?: boolean
  className?: string
  catalogFallback?: boolean
  onLoad?: ReactEventHandler<HTMLImageElement>
}) {
  const pictureRef = useRef<HTMLPictureElement>(null)
  const media = useMemo(() => buildResponsiveMediaSet(src, slotId, catalogFallback && !src), [src, slotId, catalogFallback])

  const mobile = useMemo(() => mobileSlotId
    ? buildResponsiveMediaSet(src, mobileSlotId, catalogFallback && !src)
    : null, [src, mobileSlotId, catalogFallback])

  return (
    <picture ref={pictureRef} data-responsive-picture data-media-slot={slotId}>
      {mobile?.sources.map((source) => (
        <source key={source.type} media="(max-width: 900px)" type={source.type} srcSet={source.srcSet} sizes={sizes} />
      ))}
      {media.sources.map((source) => (
        <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={sizes} />
      ))}
      <img
        className={className}
        data-original-src={src}
        src={media.fallbackSrc}
        srcSet={media.fallbackSrcSet}
        sizes={sizes}
        width={media.width}
        height={media.height}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        onLoad={onLoad}
        onError={catalogFallback ? (event) => {
          if (applyResponsiveOriginalFallback(pictureRef.current, event.currentTarget, src)) return
          applyResponsivePlaceholder(pictureRef.current, event.currentTarget,
            mobileSlotId && window.matchMedia('(max-width: 900px)').matches ? mobileSlotId : slotId)
        } : undefined}
      />
    </picture>
  )
}
