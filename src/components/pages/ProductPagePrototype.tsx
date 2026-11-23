import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

import { CatalogHelpSection, CATALOG_FAQ_ITEMS } from '@/components/catalog-page/layout'
import { FaqSection } from '@/components/marketing/shared-page-sections'
import { readCatalogFavourites, writeCatalogFavourites } from '@/catalog/catalog-favourites'
import { copyTextWithToast, flashCatalogShareLinkCopiedLabel } from '@/catalog/catalog-share'
import { initCatalogHeroSlider } from '@/catalog-hero-slider.js'
import { CatalogFirmnessScale } from '@/components/ui/CatalogFirmnessScale'
import { formatConstructionType } from '@/catalog/catalog-modal'
import { getCatalogProductsFullFeed, type CatalogProduct, type CatalogProductMediaItem } from '@/catalog/catalog-api'
import { CatalogPageCover } from '@/components/ui/CatalogPageCover'
import { ResponsivePicture } from '@/components/ui/ResponsivePicture'
import styles from './ProductPagePrototype.module.css'

const PRODUCT_COVER_LOCATION_LINE_SRC = '/product-page-prototype/cover-location-line.svg'
const PRODUCT_MEDIA_PLACEHOLDER_SRC = '/media-placeholders/product-slider.png'
const EMPTY_PRODUCT_MEDIA: CatalogProductMediaItem = { type: 'image', src: '', alt: '' }

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

function ProductMedia({ media, eager = false, alt, centerTransparentContent = false, slotId = 'product-slider' }: { media: CatalogProductMediaItem; eager?: boolean; alt: string; centerTransparentContent?: boolean; slotId?: 'product-slider' | 'product-characteristics' | 'product-material' | 'product-fullscreen' | 'catalog-card' }) {
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

  return <ResponsivePicture
    src={media.fallbackSrc || media.src}
    slotId={slotId}
    alt={media.alt || alt}
    eager={eager}
    catalogFallback
    onLoad={(event) => {
      if (centerTransparentContent) centerVisibleImageContent(event.currentTarget)
    }}
  />
}

function TextWithBreaks({ text }: { text: string }) {
  return <>{text.split(/<br\s*\/?\s*>|\n/gi).map((line, index) => <span key={`${index}-${line}`}>{index > 0 && <br />}{line}</span>)}</>
}

function ProductPrototypeSlider({ media, productName, onOpenGallery }: { media: CatalogProductMediaItem[]; productName: string; onOpenGallery: (items: CatalogProductMediaItem[], index: number) => void }) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!sliderRef.current || initializedRef.current) return
    initializedRef.current = true
    initCatalogHeroSlider(sliderRef.current)
  }, [])

  const sliderItems = media.length ? media : [EMPTY_PRODUCT_MEDIA]

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
          const key = item.fallbackSrc || item.src || 'product-placeholder'
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
                if (media.length) onOpenGallery(sliderItems, index)
              }}
            >
              <ProductMedia media={item} eager={index === 0} alt={`Матрас ${productName}`} />
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
            key={item.fallbackSrc || item.src || `product-placeholder-${index}`}
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
            <ProductMedia media={active} eager alt={`${productName}, изображение ${index + 1}`} centerTransparentContent slotId="product-fullscreen" />
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

function EditorialGallery({ materials }: { materials: NonNullable<CatalogProduct['pageMaterials']> }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const intentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const galleryItems = materials

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

  if (galleryItems.length === 0) return null

  return (
    <section
      className={styles.editorialGallery}
      aria-label="Галерея деталей матраса"
      data-product-editorial-gallery
      data-has-active={activeIndex === null ? 'false' : 'true'}
      onPointerLeave={clearActive}
    >
      {galleryItems.map((item, index) => {
        const basename = item.image.fallbackSrc || item.image.src
        const title = item.title
        const lead = item.lead
        const details = item.description
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
          <ProductMedia media={item.image} eager={index === 0} alt={title || 'Материал матраса'} slotId="product-material" />
          <figcaption className={styles.editorialGalleryCaption}>
            <strong>{title}</strong>
            <span className={styles.editorialGalleryCaptionLead}><TextWithBreaks text={String(lead || '')} /></span>
            <span className={styles.editorialGalleryCaptionDetails}><TextWithBreaks text={String(details || '')} /></span>
          </figcaption>
        </figure>
        )
      })}
      <div className={styles.editorialGalleryHitAreas} aria-hidden="true">
        {galleryItems.map((item, index) => (
          <span
            className={activeIndex === index ? styles.editorialGalleryHitAreaActive : undefined}
            key={`hit-${item.image.fallbackSrc || item.image.src}`}
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
  const tags = Array.isArray(product?.tags) ? product.tags.map(String).filter(Boolean) : []
  const description = String(product?.pageDescription || '')
  const typeLabel = formatConstructionType(product?.mattressType, product?.sidedness)
  const loadLabel = product?.maxLoadKg ? `до ${product.maxLoadKg} кг` : ''
  const sizes = (Array.isArray(product?.sizes) ? product.sizes : [])
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
    : [EMPTY_PRODUCT_MEDIA]

  return (
    <>
      <figure className={`${styles.productCover} product-cover-image`} data-product-cover-image>
        <CatalogPageCover
          product
          desktop={product?.pageCoverDesktop}
          mobile={product?.pageCoverMobile}
          alt={product?.pageCoverDesktop?.alt || `Матрас ${productName} в интерьере`}
        />
        {coverLocation && <div className={styles.coverLocation} data-product-cover-location>
          <img className={styles.coverLocationLine} src={PRODUCT_COVER_LOCATION_LINE_SRC} alt="" aria-hidden="true" />
          <p>
            <TextWithBreaks text={coverLocation.place || ''} /><br />
            <TextWithBreaks text={coverLocation.coordinates || ''} /><br />
            <TextWithBreaks text={coverLocation.dateTime || ''} /><br />
            <TextWithBreaks text={coverLocation.sunPosition || ''} />
          </p>
        </div>}
        <a className={styles.coverBack} href="/catalog" data-product-cover-back aria-label="Назад в каталог">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={styles.coverBackLabel}>Назад в каталог</span>
        </a>
        <div className={`catalogue-new-shared-product-title-actions ${styles.coverActions}`} data-product-title-actions>
          <button
            type="button"
            data-shared-product-favourite
            className={`catalogue-new-image-modal-favourite catalogue-new-shared-product-icon-action${favourite ? ' is-active' : ''}`}
            aria-pressed={favourite}
            aria-label={favourite ? 'Удалить из избранного' : 'Добавить в избранное'}
            onClick={toggleFavourite}
          >
            <img className="catalogue-new-image-modal-favourite-icon--empty" src="/icons/favourite-empty.svg" alt="" aria-hidden="true" />
            <img className="catalogue-new-image-modal-favourite-icon--full" src="/icons/favourite-full.svg" alt="" aria-hidden="true" />
          </button>
          <button type="button" data-shared-product-share className="catalogue-new-favourites-share-link-btn catalogue-new-shared-product-icon-action" aria-label="Скопировать ссылку" onClick={copyPrototypeLink}>
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
                <ProductPrototypeSlider media={product?.gallery || []} productName={productName} onOpenGallery={openFullscreenGallery} />
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
                  <div><dt>Тип конструкции</dt><dd>{typeLabel}</dd></div>
                  <div><dt>Нагрузка</dt><dd>{loadLabel}</dd></div>
                </dl>
                <CatalogFirmnessScale side1={product?.firmnessSide1} side2={product?.firmnessSide2} />
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
                  {layers.map((layer, index) => <li key={`${index}-${layer}`}>{layer}</li>)}
                </ol>
                <dl className={`${styles.characteristicsSpecs} ${styles.coverSpec}`}>
                  <div>
                    <dt>Чехол</dt>
                    <dd>{product?.coverDescription}</dd>
                  </div>
                </dl>
              </div>
              <figure className={styles.characteristicsMedia} data-media-count={characteristicsMedia.length}>
                {characteristicsMedia.map((item, index) => {
                  const galleryItems = characteristicsMedia.filter((entry) => Boolean(entry.src))
                  return (
                    <button
                      type="button"
                      className={styles.characteristicsMediaButton}
                      data-product-characteristics-gallery-trigger
                      aria-label={`Открыть изображение характеристики ${index + 1} во весь экран`}
                      key={item.fallbackSrc || item.src || `characteristics-placeholder-${index}`}
                      onClick={() => {
                        if (galleryItems.length) openFullscreenGallery(galleryItems, index)
                      }}
                    >
                      <ProductMedia media={item} alt={`${productName} — характеристики`} slotId="product-characteristics" />
                    </button>
                  )
                })}
              </figure>
            </section>
            <EditorialGallery materials={product?.pageMaterials || []} />
            <section className={styles.positionCta} data-product-position-cta>
              <div className={styles.positionCtaHeading}>
                <p className={styles.positionCtaEyebrow}>Персональная консультация</p>
                <h2>Обсудить модель с менеджером</h2>
              </div>
              <div className={styles.positionCtaContent}>
                <p>Ответим на вопросы о модели «{productName}», наличии размеров и условиях заказа.</p>
                <a data-shared-product-contact href={`/contacts?product=${encodeURIComponent(requestedSlug)}#contact-form`}>Связаться по позиции</a>
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
                        ? <ProductMedia media={relatedMedia} alt={`Матрас ${relatedName}`} slotId="catalog-card" />
                        : <ResponsivePicture src={String(relatedProduct.imageUrl || '')} slotId="catalog-card" alt={`Матрас ${relatedName}`} catalogFallback />}
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
