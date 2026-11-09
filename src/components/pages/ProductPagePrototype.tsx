import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

import { CatalogHelpSection, CATALOG_FAQ_ITEMS } from '@/components/catalog-page/layout'
import { FaqSection } from '@/components/marketing/shared-page-sections'
import { readCatalogFavourites, writeCatalogFavourites } from '@/catalog/catalog-favourites'
import { copyTextWithToast, flashCatalogShareLinkCopiedLabel } from '@/catalog/catalog-share'
import { initCatalogHeroSlider } from '@/catalog-hero-slider.js'
import { getCatalogProductsFullFeed, type CatalogProduct, type CatalogProductMediaItem } from '@/catalog/catalog-api'
import styles from './ProductPagePrototype.module.css'

const DAVOS_MEDIA = [
  'davos_f60728f139',
  'davos_product_extreme_macro_pilot_03_c9cc9e687e',
  'davos_product_studio_pilot_01_605d8327e4',
  'davos_interior_pilot_01_37e208e0c8',
  'davos_material_textile_top_01_8162c06b96',
] as const

const DAVOS_EDITORIAL_MEDIA = [
  'davos_gallery_knit_detail_01',
  'davos_gallery_coir_detail_02',
  'davos_gallery_dark_textile_03',
  'davos_gallery_quilt_detail_04',
  'davos_gallery_foam_detail_05',
] as const

const DAVOS_EDITORIAL_CAPTIONS = [
  'Мягкая, приятная на ощупь поверхность.',
  'Добавляет жёсткость и плотную опору.',
  'Защищает боковины и завершает отделку.',
  'Отдельные тканевые карманы позволяют пружинам работать независимо.',
  'Упругий материал для поддержки и сохранения формы.',
] as const

const DAVOS_EDITORIAL_TITLES = [
  'Трикотаж',
  'Кокосовая койра',
  'Боковая ткань',
  'Чехлы пружин',
  'Пена',
] as const

const DAVOS_EDITORIAL_DETAILS = [
  'Трикотаж представляет собой полотно из переплетённых петель. Такая структура позволяет ткани растягиваться и подстраиваться под поверхность. На матрасе трикотаж образует внешний слой чехла: это ткань, к которой мы прикасаемся через постельное бельё. Стёжка соединяет её с мягким наполнением чехла.',
  'Койра представляет собой натуральное волокно из наружной оболочки кокосового ореха. Его отделяют от оболочки и очищают. Из волокон делают канаты, циновки и наполнители для мебели и матрасов. В «Давосе» слой койры расположен с обеих сторон пружинного блока и помогает создать плотную поверхность для сна.',
  'Боковая ткань служит наружной обивкой по периметру матраса. Она закрывает края внутренних слоёв и придаёт изделию законченный вид. На этом крупном плане видна мягкая ворсистая фактура. Она создаёт визуальный контраст со светлой поверхностью и подчёркивает форму боковины.',
  'В независимом пружинном блоке каждая пружина помещена в отдельный тканевый карман. Пружины не соединены между собой общей металлической спиралью. Под нагрузкой они сжимаются по отдельности. Карманы удерживают пружины на своих местах и отделяют соседние витки друг от друга.',
  'Пена представляет собой материал с ячеистой структурой. Под нагрузкой ячейки сжимаются, а после её снятия материал стремится вернуться к исходной форме. В матрасах пенные элементы используют для упругой опоры и формирования отдельных частей конструкции. Крупный план показывает фактуру материала; расположение слоёв можно посмотреть на схеме выше.',
] as const

const DAVOS_SIZES = [
  [140, 190],
  [140, 200],
  [160, 190],
  [160, 200],
  [180, 190],
  [180, 200],
] as const

// The layout accepts 1, 4, or 6 frames. Davos currently has one product-layer image.
const DAVOS_CHARACTERISTICS_MEDIA = [
  'davos_material_layers_detail_01',
] as const

// Static Figma export for now; this same slot can later receive the animated SVG.
// Mobile remains a separate static source below.
const PRODUCT_COVER_DESKTOP_SRC = '/product-page-prototype/davos-product-cover-desktop-full.svg?v=letter-cascade-2'
const PRODUCT_COVER_MOBILE_SRC = '/product-page-prototype/davos-product-cover-mobile.svg'
const PRODUCT_COVER_LOCATION_LINE_SRC = '/product-page-prototype/cover-location-line.svg'
const PRODUCT_MEDIA_PLACEHOLDER_SRC = '/product-page-prototype/davos_f60728f139.png'

const DAVOS_LAYERS = [
  'кокосовая койра (20мм)',
  'хлопковый войлок',
  '1000 пружин на одно спальное место (h – 140мм)',
  'хлопковый войлок',
  'кокосовая койра (20мм)',
  'татами борт',
] as const

function PrototypePicture({ basename, eager = false, fallbackExtension = 'png', alt = 'Матрас Давос' }: { basename: string; eager?: boolean; fallbackExtension?: 'jpg' | 'png'; alt?: string }) {
  const root = `/product-page-prototype/${basename}`
  return (
    <picture>
      <source type="image/avif" srcSet={`${root}.avif`} />
      <source type="image/webp" srcSet={`${root}.webp`} />
      <img
        src={`${root}.${fallbackExtension}`}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
      />
    </picture>
  )
}

function centerVisibleImageContent(image: HTMLImageElement) {
  const sampleSize = 256
  const canvas = document.createElement('canvas')
  canvas.width = sampleSize
  canvas.height = sampleSize
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return

  try {
    context.drawImage(image, 0, 0, sampleSize, sampleSize)
    const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data
    let minX = sampleSize
    let minY = sampleSize
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < sampleSize; y += 1) {
      for (let x = 0; x < sampleSize; x += 1) {
        if (pixels[((y * sampleSize + x) * 4) + 3] < 8) continue
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
    if (maxX < minX || maxY < minY) return
    const centerX = ((minX + maxX + 1) / 2) / sampleSize
    const centerY = ((minY + maxY + 1) / 2) / sampleSize
    image.style.setProperty('--fullscreen-media-shift-x', `${(0.5 - centerX) * 100}%`)
    image.style.setProperty('--fullscreen-media-shift-y', `${(0.5 - centerY) * 100}%`)
  } catch {
    // Cross-origin or unsupported image data: geometric centering remains active.
  }
}

function ProductMedia({ media, eager = false, alt, centerTransparentContent = false }: { media: CatalogProductMediaItem; eager?: boolean; alt: string; centerTransparentContent?: boolean }) {
  if (media.type === 'video') {
    return (
      <video
        src={media.fallbackSrc || media.src}
        poster={media.posterFallbackSrc || media.poster || PRODUCT_MEDIA_PLACEHOLDER_SRC}
        aria-label={media.alt || alt}
        muted
        playsInline
        controls
        preload="metadata"
      />
    )
  }

  return (
    <img
      src={media.fallbackSrc || media.src}
      alt={media.alt || alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      onLoad={(event) => {
        if (centerTransparentContent) centerVisibleImageContent(event.currentTarget)
      }}
      onError={(event) => {
        const image = event.currentTarget
        if (image.dataset.placeholderApplied === 'true') return
        image.dataset.placeholderApplied = 'true'
        image.src = PRODUCT_MEDIA_PLACEHOLDER_SRC
        image.removeAttribute('srcset')
      }}
    />
  )
}

function TextWithBreaks({ text }: { text: string }) {
  return <>{text.split(/<br\s*\/?\s*>|\n/gi).map((line, index) => <span key={`${index}-${line}`}>{index > 0 && <br />}{line}</span>)}</>
}

function ProductCoverPicture({ desktop, mobile, productName, useDavosFallback }: { desktop?: CatalogProductMediaItem | null; mobile?: CatalogProductMediaItem | null; productName: string; useDavosFallback: boolean }) {
  const readyRef = useRef(false)

  function announceReady() {
    if (readyRef.current) return
    readyRef.current = true
    window.dispatchEvent(new CustomEvent('product-cover-ready'))
  }

  return (
    <picture>
      {(mobile || useDavosFallback) && <source media="(max-width: 900px)" type="image/svg+xml" srcSet={mobile?.fallbackSrc || mobile?.src || PRODUCT_COVER_MOBILE_SRC} />}
      <img
        data-product-cover-media
        src={desktop?.fallbackSrc || desktop?.src || PRODUCT_COVER_DESKTOP_SRC}
        alt={desktop?.alt || `Матрас ${productName} в интерьере`}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onLoad={announceReady}
        onError={(event) => {
          const image = event.currentTarget
          if (image.dataset.placeholderApplied !== 'true') {
            image.dataset.placeholderApplied = 'true'
            image.src = PRODUCT_COVER_DESKTOP_SRC
          }
          announceReady()
        }}
      />
    </picture>
  )
}

function ProductPrototypeSlider({ media, productName, fallbackToDavos, onOpenGallery }: { media: CatalogProductMediaItem[]; productName: string; fallbackToDavos: boolean; onOpenGallery: (items: CatalogProductMediaItem[], index: number) => void }) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!sliderRef.current || initializedRef.current) return
    initializedRef.current = true
    initCatalogHeroSlider(sliderRef.current)
  }, [])

  const sliderItems = media.length ? media : fallbackToDavos ? DAVOS_MEDIA : []

  return (
    <div
      ref={sliderRef}
      className="catalog-hero-slider catalogue-new-shared-product-slider"
      data-product-detail-slider
      data-media-source="prototype"
      data-autoplay-ms="6500"
      aria-roledescription="carousel"
      aria-label="Галерея позиции"
    >
      <div className="catalog-hero-slides">
        {sliderItems.map((item, index) => {
          const key = typeof item === 'string' ? item : item.fallbackSrc || item.src
          return (
          <div
            key={key}
            className={`catalog-hero-slide${index === 0 ? ' is-active' : ''}`}
            id={`product-prototype-slide-${index}`}
            data-slide={index}
            aria-hidden={index === 0 ? 'false' : 'true'}
          >
            <button
              type="button"
              className={styles.sliderGalleryButton}
              data-product-slider-gallery-trigger
              aria-label={`Открыть изображение ${index + 1} во весь экран`}
              onClick={() => {
                const galleryItems = sliderItems.map((entry) => typeof entry === 'string'
                  ? { type: 'image' as const, src: `/product-page-prototype/${entry}.png`, alt: `Матрас ${productName}` }
                  : entry)
                onOpenGallery(galleryItems, index)
              }}
            >
              {typeof item === 'string'
                ? <PrototypePicture basename={item} eager={index === 0} alt={`Матрас ${productName}`} />
                : <ProductMedia media={item} eager={index === 0} alt={`Матрас ${productName}`} />}
            </button>
          </div>
          )
        })}
      </div>
      {sliderItems.length > 1 && <><div className="catalog-hero-nav-side catalog-hero-nav-side--left">
        <button type="button" className="catalog-hero-nav-btn catalog-hero-nav-prev" aria-label="Предыдущий слайд">
          <svg width="11" height="18" viewBox="0 0 11 18" fill="none" aria-hidden="true">
            <path d="M8.5 2.5L2.5 9l6 6.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="catalog-hero-nav-side catalog-hero-nav-side--right">
        <button type="button" className="catalog-hero-nav-btn catalog-hero-nav-next" aria-label="Следующий слайд">
          <svg width="11" height="18" viewBox="0 0 11 18" fill="none" aria-hidden="true">
            <path d="M2.5 2.5l6 6.5-6 6.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="catalog-hero-dots" role="tablist" aria-label="Слайды позиции">
        {sliderItems.map((item, index) => (
          <button
            key={typeof item === 'string' ? item : item.fallbackSrc || item.src}
            type="button"
            className={`catalog-hero-dot${index === 0 ? ' is-active' : ''}`}
            role="tab"
            aria-selected={index === 0}
            aria-controls={`product-prototype-slide-${index}`}
            data-target={index}
            aria-label={`Слайд ${index + 1}`}
          >
            <span className="catalog-hero-dot-shape" aria-hidden="true"><span className="catalog-hero-dot-fill" /></span>
          </button>
        ))}
      </div></>}
    </div>
  )
}

function FullscreenProductGallery({ items, initialIndex, open, onOpenChange, productName }: {
  items: CatalogProductMediaItem[]
  initialIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
}) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => setIndex(initialIndex), [initialIndex, open])
  useEffect(() => {
    if (!open) return
    const previousRootOverflow = document.documentElement.style.overflow
    const previousOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
      if (event.key === 'ArrowLeft' && items.length > 1) setIndex((current) => (current - 1 + items.length) % items.length)
      if (event.key === 'ArrowRight' && items.length > 1) setIndex((current) => (current + 1) % items.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.documentElement.style.overflow = previousRootOverflow
      document.body.style.overflow = previousOverflow
    }
  }, [items.length, onOpenChange, open])

  const active = items[index]
  const hasNavigation = items.length > 1
  if (!active) return null

  if (!open) return null

  return createPortal(
    <div className={styles.fullscreenGalleryPortal}>
      <div className={styles.fullscreenGalleryBackdrop} onClick={() => onOpenChange(false)} />
      <div className={styles.fullscreenGallery} data-product-fullscreen-gallery role="dialog" aria-modal="true" aria-labelledby="product-fullscreen-gallery-title">
          <h2 className={styles.visuallyHidden} id="product-fullscreen-gallery-title">Галерея товара {productName}</h2>
          <div className={styles.fullscreenGalleryStage}>
            <ProductMedia media={active} eager alt={`${productName}, изображение ${index + 1}`} centerTransparentContent />
          </div>
          {hasNavigation && <>
            <button type="button" className={`${styles.fullscreenGalleryNav} ${styles.fullscreenGalleryPrev}`} aria-label="Предыдущее изображение" onClick={() => setIndex((index - 1 + items.length) % items.length)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
            </button>
            <button type="button" className={`${styles.fullscreenGalleryNav} ${styles.fullscreenGalleryNext}`} aria-label="Следующее изображение" onClick={() => setIndex((index + 1) % items.length)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7" /></svg>
            </button>
            <div className={styles.fullscreenGalleryCounter}>{index + 1} / {items.length}</div>
          </>}
      </div>
      <button type="button" className={styles.fullscreenGalleryClose} aria-label="Закрыть галерею" onClick={() => onOpenChange(false)}>×</button>
    </div>,
    document.body,
  )
}

function FirmnessScale({ score }: { score: number }) {
  return (
    <section className="catalogue-new-firmness-scale">
      <h3 className="catalogue-new-firmness-title">Жесткость</h3>
      <div className="catalogue-new-firmness-row is-single">
        <div className="catalogue-new-firmness-track" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} className={`catalogue-new-firmness-segment${index < score ? ' is-filled' : ''}`} />
          ))}
        </div>
        <span className="catalogue-new-firmness-score">{score}/10</span>
      </div>
    </section>
  )
}

function SizeCardIcon({ width, height }: { width: number; height: number }) {
  const x = (210 - width) / 2
  const y = (210 - height) / 2
  return (
    <svg className={styles.sizeCardIcon} viewBox="0 0 210 220" fill="none" aria-hidden="true">
      <rect x={x} y={y} width={width} height={height} rx="5" stroke="currentColor" strokeWidth="4" />
      <path d={`M${x + 10} ${y + 27}h${width - 20}`} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function EditorialGallery({ materials, useDavosFallback }: { materials: NonNullable<CatalogProduct['pageMaterials']>; useDavosFallback: boolean }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const intentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleActive(index: number) {
    if (intentTimerRef.current) clearTimeout(intentTimerRef.current)
    intentTimerRef.current = setTimeout(() => setActiveIndex(index), 100)
  }

  function clearActive() {
    if (intentTimerRef.current) clearTimeout(intentTimerRef.current)
    intentTimerRef.current = null
    setActiveIndex(null)
  }

  function toggleActive(index: number) {
    setActiveIndex((current) => current === index ? null : index)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, index: number) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggleActive(index)
  }

  useEffect(() => () => {
    if (intentTimerRef.current) clearTimeout(intentTimerRef.current)
  }, [])

  return (
    <section
      className={styles.editorialGallery}
      aria-label="Галерея деталей матраса"
      data-product-editorial-gallery
      data-has-active={activeIndex === null ? 'false' : 'true'}
      onPointerLeave={clearActive}
    >
      {(materials.length ? materials : useDavosFallback ? DAVOS_EDITORIAL_MEDIA : []).map((item, index) => {
        const basename = typeof item === 'string' ? item : item.image.fallbackSrc || item.image.src
        const title = typeof item === 'string' ? DAVOS_EDITORIAL_TITLES[index] : item.title
        const lead = typeof item === 'string' ? DAVOS_EDITORIAL_CAPTIONS[index] : item.lead
        const details = typeof item === 'string' ? DAVOS_EDITORIAL_DETAILS[index] : item.description
        return (
        <figure
          className={`${styles.editorialGalleryItem}${activeIndex === index ? ` ${styles.editorialGalleryItemActive}` : ''}`}
          key={`editorial-${basename}`}
          role="button"
          tabIndex={0}
          aria-expanded={activeIndex === index}
          onClick={() => toggleActive(index)}
          onFocus={() => setActiveIndex(index)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {typeof item === 'string'
            ? <PrototypePicture basename={basename} eager={index === 0} />
            : <ProductMedia media={item.image} eager={index === 0} alt={title || 'Материал матраса'} />}
          <figcaption className={styles.editorialGalleryCaption}>
            <strong>{title}</strong>
            <span className={styles.editorialGalleryCaptionLead}><TextWithBreaks text={String(lead || '')} /></span>
            <span className={styles.editorialGalleryCaptionDetails}><TextWithBreaks text={String(details || '')} /></span>
          </figcaption>
        </figure>
        )
      })}
      <div className={styles.editorialGalleryHitAreas} aria-hidden="true">
        {(materials.length ? materials : useDavosFallback ? DAVOS_EDITORIAL_MEDIA : []).map((item, index) => (
          <span
            className={activeIndex === index ? styles.editorialGalleryHitAreaActive : undefined}
            key={`hit-${typeof item === 'string' ? item : item.image.fallbackSrc || item.image.src}`}
            onPointerEnter={() => scheduleActive(index)}
          />
        ))}
      </div>
    </section>
  )
}

export function ProductPagePrototype() {
  const requestedSlug = String(new URLSearchParams(window.location.search).get('product') || 'davos').trim() || 'davos'
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [favourite, setFavourite] = useState(() => readCatalogFavourites().has(requestedSlug))
  const [fullscreenGallery, setFullscreenGallery] = useState<{ items: CatalogProductMediaItem[]; index: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    getCatalogProductsFullFeed()
      .then((items) => {
        if (cancelled) return
        setCatalogProducts(items)
        setProduct(items.find((item) => String(item.slug || '') === requestedSlug) || null)
      })
      .finally(() => {
        if (!cancelled) setCatalogLoaded(true)
      })
    return () => { cancelled = true }
  }, [requestedSlug])

  useEffect(() => {
    document.documentElement.classList.add('catalogue-shared-view', 'catalogue-shared-product-view', 'product-page-prototype-view')
    return () => document.documentElement.classList.remove('catalogue-shared-view', 'catalogue-shared-product-view', 'product-page-prototype-view')
  }, [])

  function toggleFavourite() {
    const favourites = readCatalogFavourites()
    if (favourites.has(requestedSlug)) favourites.delete(requestedSlug)
    else favourites.add(requestedSlug)
    writeCatalogFavourites(favourites)
    setFavourite(favourites.has(requestedSlug))
  }

  function copyPrototypeLink(event: MouseEvent<HTMLButtonElement>) {
    copyTextWithToast(window.location.href)
    flashCatalogShareLinkCopiedLabel(event.currentTarget)
  }

  function openFullscreenGallery(items: CatalogProductMediaItem[], index: number) {
    if (!items.length) return
    setFullscreenGallery({ items, index })
  }

  if (!catalogLoaded) return null

  const productName = String(product?.name || (requestedSlug === 'davos' ? 'Давос' : requestedSlug))
  const useDavosFallback = requestedSlug === 'davos'
  const collectionSlug = String(product?.collectionSlug || '').trim()
  const collectionName = String(product?.collectionName || collectionSlug)
  const normalizedCollectionName = collectionName.trim().toLocaleLowerCase('ru-RU')
  const relatedCollectionProducts = collectionSlug || normalizedCollectionName
    ? catalogProducts
      .filter((item) => {
        if (String(item.slug || '') === requestedSlug) return false
        const sameSlug = Boolean(collectionSlug) && String(item.collectionSlug || '') === collectionSlug
        const sameName = Boolean(normalizedCollectionName)
          && String(item.collectionName || '').trim().toLocaleLowerCase('ru-RU') === normalizedCollectionName
        return sameSlug || sameName
      })
      .slice(0, 3)
    : []
  const tags = Array.isArray(product?.tags) ? product.tags.map(String).filter(Boolean) : useDavosFallback ? ['Пружинный', 'Жесткий'] : []
  const description = String(product?.pageDescription || (requestedSlug === 'davos'
    ? 'Натуральная кокосовая койра с обеих сторон придаёт матрасу жёсткость. Независимые пружины реагируют на нагрузку по отдельности и поддерживают тело, а хлопковый войлок разделяет слои наполнения. Трикотажный чехол делает прикосновение мягче. Матрас рассчитан на нагрузку до 160 кг на спальное место.'
    : ''))
  const typeLabel = tags[0] || String(product?.mattressType || '')
  const loadLabel = product?.maxLoadKg ? `до ${product.maxLoadKg} кг` : ''
  const firmnessScore = Math.max(1, Math.min(10, Number(product?.firmnessSide1 || product?.firmnessSide2 || 9)))
  const sizes = (Array.isArray(product?.sizes) ? product.sizes : DAVOS_SIZES)
    .map((value) => {
      if (Array.isArray(value)) return [Number(value[0]), Number(value[1])] as const
      const match = String(value).match(/(\d+)\D+(\d+)/)
      return match ? [Number(match[1]), Number(match[2])] as const : null
    })
    .filter((value): value is readonly [number, number] => Boolean(value))
  const layers = String(product?.layersCatalog || '').split('\n').map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean)
  const coverLocation = product?.pageCoverLocation
  const characteristicsMedia = product?.pageCharacteristicsMedia?.length
    ? product.pageCharacteristicsMedia
    : useDavosFallback
      ? DAVOS_CHARACTERISTICS_MEDIA
      : product?.gallery?.slice(0, 1) || []

  return (
    <>
      <figure className={`${styles.productCover} product-cover-image`} data-product-cover-image>
        <ProductCoverPicture desktop={product?.pageCoverDesktop} mobile={product?.pageCoverMobile} productName={productName} useDavosFallback />
        <div className={styles.coverLocation} data-product-cover-location>
          <img className={styles.coverLocationLine} src={PRODUCT_COVER_LOCATION_LINE_SRC} alt="" aria-hidden="true" />
          <p>
            <TextWithBreaks text={coverLocation?.place || 'Тоскана, Италия'} /><br />
            <TextWithBreaks text={coverLocation?.coordinates || '43,7696° N / 11,2558° E'} /><br />
            <TextWithBreaks text={coverLocation?.dateTime || '15.09.2026 · 08:30 CEST · UTC+2'} /><br />
            <TextWithBreaks text={coverLocation?.sunPosition || 'Азимут 101,5° · Высота 16,7°'} />
          </p>
        </div>
        <a className={styles.coverBack} href="/catalog" data-product-cover-back aria-label="Назад в каталог">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={styles.coverBackLabel}>Назад в каталог</span>
        </a>
        <div className={`catalogue-new-shared-product-title-actions ${styles.coverActions}`} data-product-title-actions>
          <button
            type="button"
            className={`catalogue-new-image-modal-favourite catalogue-new-shared-product-icon-action${favourite ? ' is-active' : ''}`}
            aria-pressed={favourite}
            aria-label={favourite ? 'Удалить из избранного' : 'Добавить в избранное'}
            onClick={toggleFavourite}
          >
            <img className="catalogue-new-image-modal-favourite-icon--empty" src="/icons/favourite-empty.svg" alt="" aria-hidden="true" />
            <img className="catalogue-new-image-modal-favourite-icon--full" src="/icons/favourite-full.svg" alt="" aria-hidden="true" />
          </button>
          <button type="button" className="catalogue-new-favourites-share-link-btn catalogue-new-shared-product-icon-action" aria-label="Скопировать ссылку" onClick={copyPrototypeLink}>
            <span className="catalogue-new-favourites-share-link-label catalogue-new-shared-product-share-label">Скопировать ссылку</span>
            <span className="catalogue-new-favourites-share-link-icon" aria-hidden="true">
              <img className="catalogue-new-favourites-share-icon--default" src="/icons/share-default.svg" alt="" />
              <img className="catalogue-new-favourites-share-icon--hover" src="/icons/share-hover.svg" alt="" />
              <img className="catalogue-new-favourites-share-icon--copied" src="/icons/share-copied.svg" alt="" />
            </span>
          </button>
        </div>
      </figure>
      <div className="catalogue-new-layout">
        <section className="catalogue-new-shared-product" data-product-editorial data-product-prototype>
          <div className="catalogue-new-shared-product-shell">
            <div className={styles.productIntro}>
              <div className={`catalogue-new-shared-product-stage ${styles.productSlider}`} data-product-media-stage>
                <ProductPrototypeSlider media={product?.gallery || []} productName={productName} fallbackToDavos={useDavosFallback} onOpenGallery={openFullscreenGallery} />
              </div>
              <div className={styles.productSummary}>
                <p className={styles.collection}>Коллекция {collectionName}</p>
                <div className={styles.titleRow}>
                  <div className="catalogue-new-shared-product-heading">
                    <h1 className={`catalogue-new-shared-product-title ${styles.productTitle}`}>{productName}</h1>
                  </div>
                </div>
                <div className="catalogue-new-shared-product-tags catalogue-new-tags">
                  {tags.map((tag) => <span className="catalogue-new-tag" key={tag}>{tag}</span>)}
                </div>
                <p className={styles.description}>
                  <TextWithBreaks text={description} />
                </p>
                <dl className={styles.primarySpecs}>
                  <div><dt>Тип матраса</dt><dd>{typeLabel}</dd></div>
                  <div><dt>Нагрузка</dt><dd>{loadLabel}</dd></div>
                </dl>
                <FirmnessScale score={firmnessScore} />
              </div>
            </div>
            <section className={styles.characteristicsBlock} data-product-info-band>
              <div className={styles.characteristicsText}>
                <h3 className={styles.characteristicsTitle}>Характеристики</h3>
                <p className={styles.sizeCardsLabel}>Размеры, см</p>
                <div className={styles.sizeCards} aria-label="Доступные размеры матраса">
                  {sizes.map(([width, height]) => (
                    <div className={styles.sizeCard} key={`${width}-${height}`}>
                      <SizeCardIcon width={width} height={height} />
                      <span>{width} × {height}</span>
                    </div>
                  ))}
                </div>
                <h4 className={styles.layersTitle}>Наполнение</h4>
                <ol className={styles.layersList}>
                  {(layers.length ? layers : useDavosFallback ? DAVOS_LAYERS : []).map((layer, index) => <li key={`${index}-${layer}`}>{layer}</li>)}
                </ol>
                <dl className={`${styles.characteristicsSpecs} ${styles.coverSpec}`}>
                  <div>
                    <dt>Чехол</dt>
                    <dd><TextWithBreaks text={String(product?.coverDescription || (useDavosFallback ? 'Премиальный трикотаж с объёмной стежкой на холконе' : ''))} /></dd>
                  </div>
                </dl>
              </div>
              <figure className={styles.characteristicsMedia} data-media-count={characteristicsMedia.length}>
                {characteristicsMedia.map((item, index) => {
                  const galleryItems = characteristicsMedia.map((entry) => typeof entry === 'string'
                    ? { type: 'image' as const, src: `/product-page-prototype/${entry}.png`, alt: `${productName} — характеристики` }
                    : entry)
                  return (
                    <button
                      type="button"
                      className={styles.characteristicsMediaButton}
                      data-product-characteristics-gallery-trigger
                      aria-label={`Открыть изображение характеристики ${index + 1} во весь экран`}
                      key={typeof item === 'string' ? item : item.fallbackSrc || item.src}
                      onClick={() => openFullscreenGallery(galleryItems, index)}
                    >
                      {typeof item === 'string'
                        ? <PrototypePicture basename={item} />
                        : <ProductMedia media={item} alt={`${productName} — характеристики`} />}
                    </button>
                  )
                })}
              </figure>
            </section>
            <EditorialGallery materials={product?.pageMaterials || []} useDavosFallback={useDavosFallback} />
            <section className={styles.positionCta} data-product-position-cta>
              <div className={styles.positionCtaHeading}>
                <p className={styles.positionCtaEyebrow}>Персональная консультация</p>
                <h2>Обсудить модель с менеджером</h2>
              </div>
              <div className={styles.positionCtaContent}>
                <p>Ответим на вопросы о модели «{productName}», наличии размеров и условиях заказа.</p>
                <a href={`/contacts?product=${encodeURIComponent(requestedSlug)}#contact-form`}>Связаться по позиции</a>
              </div>
            </section>
            {relatedCollectionProducts.length > 0 && <section className={styles.collectionSection} data-related-collection>
              <header className={styles.collectionSectionHeader}>
                <h2>Ещё в коллекции</h2>
                <a href={`/catalog?collection=${encodeURIComponent(collectionSlug)}`}>Коллекция {collectionName}</a>
              </header>
              <div className={styles.collectionCards}>
                {relatedCollectionProducts.map((relatedProduct) => {
                  const relatedSlug = String(relatedProduct.slug || '')
                  const relatedName = String(relatedProduct.name || relatedSlug)
                  const relatedMedia = relatedProduct.gallery?.[0]
                  const relatedTags = Array.isArray(relatedProduct.tags) ? relatedProduct.tags.map(String).filter(Boolean) : []
                  return <article className={styles.collectionCard} key={relatedSlug}>
                    <a className={styles.collectionCardMedia} href={`/catalog?product=${encodeURIComponent(relatedSlug)}`} aria-label={`Открыть ${relatedName}`}>
                      {relatedMedia
                        ? <ProductMedia media={relatedMedia} alt={`Матрас ${relatedName}`} />
                        : <img src={String(relatedProduct.imageUrl || PRODUCT_MEDIA_PLACEHOLDER_SRC)} alt={`Матрас ${relatedName}`} loading="lazy" />}
                    </a>
                    <div className={styles.collectionCardBody}>
                      <h3><a href={`/catalog?product=${encodeURIComponent(relatedSlug)}`}>{relatedName}</a></h3>
                      <dl>
                        <div><dt>Высота</dt><dd>{Number(relatedProduct.heightCm || 0)} см</dd></div>
                        <div><dt>Нагрузка</dt><dd>до {Number(relatedProduct.maxLoadKg || 0)} кг</dd></div>
                      </dl>
                      <div className={styles.collectionCardTags}>
                        {relatedTags.map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                    </div>
                  </article>
                })}
              </div>
            </section>}
          </div>
        </section>
      </div>

      <FaqSection items={CATALOG_FAQ_ITEMS} title="Вопросы и ответы о выборе матраса" />
      <CatalogHelpSection />
      {fullscreenGallery && (
        <FullscreenProductGallery
          items={fullscreenGallery.items}
          initialIndex={fullscreenGallery.index}
          open
          onOpenChange={(open) => { if (!open) setFullscreenGallery(null) }}
          productName={productName}
        />
      )}
    </>
  )
}
