import { useEffect, useRef, useState, type MouseEvent } from 'react'

import { CatalogHelpSection, CATALOG_FAQ_ITEMS } from '@/components/catalog-page/layout'
import { FaqSection } from '@/components/marketing/shared-page-sections'
import { readCatalogFavourites, writeCatalogFavourites } from '@/catalog/catalog-favourites'
import { copyTextWithToast, flashCatalogShareLinkCopiedLabel } from '@/catalog/catalog-share'
import { initCatalogHeroSlider } from '@/catalog-hero-slider.js'
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

// Static Figma export for now; this same slot can later receive the animated SVG.
// Mobile remains a separate static source below.
const PRODUCT_COVER_DESKTOP_SRC = '/product-page-prototype/davos-product-cover-desktop-full.svg?v=letter-cascade-2'
const PRODUCT_COVER_MOBILE_SRC = '/product-page-prototype/davos-product-cover-mobile.svg'

const DAVOS_LAYERS = [
  'кокосовая койра (20мм)',
  'хлопковый войлок',
  '1000 пружин на одно спальное место (h – 140мм)',
  'хлопковый войлок',
  'кокосовая койра (20мм)',
  'татами борт',
] as const

const RELATED_COLLECTION_PRODUCTS = [
  { name: 'Империо', slug: 'imperio', media: 'imperio_8069a3faa1', height: 24, load: 140, tags: ['Пружинный', 'Разная жесткость сторон'] },
  { name: 'Люксор', slug: 'luxor', media: 'luxor_adb0d9305d', height: 26, load: 160, tags: ['Пружинный', 'Средний'] },
  { name: 'Галакси', slug: 'galaksi', media: 'galaksi_29d31b0292', height: 26, load: 160, tags: ['Пружинный', 'Средний'] },
] as const

function PrototypePicture({ basename, eager = false }: { basename: string; eager?: boolean }) {
  const root = `/product-page-prototype/${basename}`
  return (
    <picture>
      <source type="image/avif" srcSet={`${root}.avif`} />
      <source type="image/webp" srcSet={`${root}.webp`} />
      <img
        src={`${root}.png`}
        alt="Матрас Давос"
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
      />
    </picture>
  )
}

function ProductCoverPicture() {
  const readyRef = useRef(false)

  function announceReady() {
    if (readyRef.current) return
    readyRef.current = true
    window.dispatchEvent(new CustomEvent('product-cover-ready'))
  }

  return (
    <picture>
      <source media="(max-width: 900px)" type="image/svg+xml" srcSet={PRODUCT_COVER_MOBILE_SRC} />
      <img
        data-product-cover-media
        src={PRODUCT_COVER_DESKTOP_SRC}
        alt="Матрас Давос в интерьере"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onLoad={announceReady}
        onError={announceReady}
      />
    </picture>
  )
}

function DavosPrototypeSlider() {
  const sliderRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!sliderRef.current || initializedRef.current) return
    initializedRef.current = true
    initCatalogHeroSlider(sliderRef.current)
  }, [])

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
        {DAVOS_MEDIA.map((basename, index) => (
          <div
            key={basename}
            className={`catalog-hero-slide${index === 0 ? ' is-active' : ''}`}
            id={`product-prototype-slide-${index}`}
            data-slide={index}
            aria-hidden={index === 0 ? 'false' : 'true'}
          >
            <PrototypePicture basename={basename} eager={index === 0} />
          </div>
        ))}
      </div>
      <div className="catalog-hero-nav-side catalog-hero-nav-side--left">
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
        {DAVOS_MEDIA.map((basename, index) => (
          <button
            key={basename}
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
      </div>
    </div>
  )
}

function FirmnessScale() {
  return (
    <section className="catalogue-new-firmness-scale">
      <h3 className="catalogue-new-firmness-title">Жесткость</h3>
      <div className="catalogue-new-firmness-row is-single">
        <div className="catalogue-new-firmness-track" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} className={`catalogue-new-firmness-segment${index < 9 ? ' is-filled' : ''}`} />
          ))}
        </div>
        <span className="catalogue-new-firmness-score">9/10</span>
      </div>
    </section>
  )
}

function EditorialGallery() {
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

  useEffect(() => () => {
    if (intentTimerRef.current) clearTimeout(intentTimerRef.current)
  }, [])

  return (
    <section
      className={styles.editorialGallery}
      aria-label="Галерея деталей матраса"
      data-product-editorial-gallery
      onPointerLeave={clearActive}
    >
      {DAVOS_EDITORIAL_MEDIA.map((basename, index) => (
        <figure
          className={`${styles.editorialGalleryItem}${activeIndex === index ? ` ${styles.editorialGalleryItemActive}` : ''}`}
          key={`editorial-${basename}`}
        >
          <PrototypePicture basename={basename} eager={index === 0} />
        </figure>
      ))}
      <div className={styles.editorialGalleryHitAreas} aria-hidden="true">
        {DAVOS_EDITORIAL_MEDIA.map((basename, index) => (
          <span
            className={activeIndex === index ? styles.editorialGalleryHitAreaActive : undefined}
            key={`hit-${basename}`}
            onPointerEnter={() => scheduleActive(index)}
          />
        ))}
      </div>
    </section>
  )
}

export function ProductPagePrototype() {
  const [favourite, setFavourite] = useState(() => readCatalogFavourites().has('davos'))

  useEffect(() => {
    document.documentElement.classList.add('catalogue-shared-view', 'catalogue-shared-product-view', 'product-page-prototype-view')
    return () => document.documentElement.classList.remove('catalogue-shared-view', 'catalogue-shared-product-view', 'product-page-prototype-view')
  }, [])

  function toggleFavourite() {
    const favourites = readCatalogFavourites()
    if (favourites.has('davos')) favourites.delete('davos')
    else favourites.add('davos')
    writeCatalogFavourites(favourites)
    setFavourite(favourites.has('davos'))
  }

  function copyPrototypeLink(event: MouseEvent<HTMLButtonElement>) {
    copyTextWithToast(window.location.href)
    flashCatalogShareLinkCopiedLabel(event.currentTarget)
  }

  return (
    <>
      <figure className={`${styles.productCover} product-cover-image`} data-product-cover-image>
        <ProductCoverPicture />
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
                <DavosPrototypeSlider />
              </div>
              <div className={styles.productSummary}>
                <a className={`catalogue-new-shared-back ${styles.backLink}`} href="/catalog">Назад в каталог</a>
                <p className={styles.collection}>Коллекция Relax</p>
                <div className={styles.titleRow}>
                  <div className="catalogue-new-shared-product-heading">
                    <h1 className={`catalogue-new-shared-product-title ${styles.productTitle}`}>Давос</h1>
                  </div>
                </div>
                <div className="catalogue-new-shared-product-tags catalogue-new-tags">
                  <span className="catalogue-new-tag">Пружинный</span>
                  <span className="catalogue-new-tag">Жесткий</span>
                </div>
                <p className={styles.description}>
                  Жёсткий пружинный матрас с усиленной поддержкой и натуральной кокосовой койрой с обеих сторон.
                </p>
                <dl className={styles.primarySpecs}>
                  <div><dt>Тип матраса</dt><dd>Пружинный</dd></div>
                  <div><dt>Нагрузка</dt><dd>до 160 кг</dd></div>
                </dl>
                <FirmnessScale />
              </div>
            </div>
            <section className={styles.characteristicsBlock} data-product-info-band>
              <div className={styles.characteristicsText}>
                <h3 className={styles.characteristicsTitle}>Характеристики</h3>
                <dl className={styles.characteristicsSpecs}>
                  <div>
                    <dt>Размер</dt>
                    <dd>140 × 190, 140 × 200, 160 × 190, 160 × 200, 180 × 190, 180 × 200</dd>
                  </div>
                  <div>
                    <dt>Чехол</dt>
                    <dd>Премиальный трикотаж с объёмной стежкой на холконе</dd>
                  </div>
                </dl>
                <h4 className={styles.layersTitle}>Наполнение</h4>
                <ol className={styles.layersList}>
                  {DAVOS_LAYERS.map((layer, index) => <li key={`${index}-${layer}`}>{layer}</li>)}
                </ol>
              </div>
              <figure className={styles.characteristicsMedia}>
                <PrototypePicture basename="davos_material_layers_detail_01" />
              </figure>
            </section>
            <EditorialGallery />
            <section className={styles.positionCta} data-product-position-cta>
              <div className={styles.positionCtaHeading}>
                <p className={styles.positionCtaEyebrow}>Персональная консультация</p>
                <h2>Обсудить модель с менеджером</h2>
              </div>
              <div className={styles.positionCtaContent}>
                <p>Ответим на вопросы о модели «Давос», наличии размеров и условиях заказа.</p>
                <a href="/contacts?product=davos#contact-form">Связаться по позиции</a>
              </div>
            </section>
            <section className={styles.collectionSection} data-related-collection>
              <header className={styles.collectionSectionHeader}>
                <h2>Ещё в коллекции</h2>
                <a href="/catalog?collection=relax">Коллекция Relax</a>
              </header>
              <div className={styles.collectionCards}>
                {RELATED_COLLECTION_PRODUCTS.map((product) => (
                  <article className={styles.collectionCard} key={product.slug}>
                    <a className={styles.collectionCardMedia} href={`/catalog?product=${product.slug}`} aria-label={`Открыть ${product.name}`}>
                      <PrototypePicture basename={product.media} />
                    </a>
                    <div className={styles.collectionCardBody}>
                      <h3><a href={`/catalog?product=${product.slug}`}>{product.name}</a></h3>
                      <dl>
                        <div><dt>Высота</dt><dd>{product.height} см</dd></div>
                        <div><dt>Нагрузка</dt><dd>до {product.load} кг</dd></div>
                      </dl>
                      <div className={styles.collectionCardTags}>
                        {product.tags.map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>

      <FaqSection items={CATALOG_FAQ_ITEMS} title="Вопросы и ответы о выборе матраса" />
      <CatalogHelpSection />
    </>
  )
}
