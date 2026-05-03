import {
  CATALOG_HERO_SLIDES,
  type CatalogHeroSlideData,
  type CatalogPictureImage,
} from '@/components/pages/catalog-page-data'

function HeroSlideAsset({ slide }: { slide: CatalogHeroSlideData }) {
  const { asset } = slide

  if (asset.type === 'video') {
    return (
      <video muted loop playsInline preload="metadata" poster={asset.poster} aria-label={asset.ariaLabel}>
        {asset.sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} />
        ))}
      </video>
    )
  }

  const image = asset as CatalogPictureImage

  return (
    <picture>
      <source type="image/avif" srcSet={image.sources.avif} />
      <source type="image/webp" srcSet={image.sources.webp} />
      {image.sources.png ? <source type="image/png" srcSet={image.sources.png} /> : null}
      <img
        src={image.src}
        alt={image.alt}
        loading={image.loading}
        fetchPriority={image.fetchPriority}
        decoding={image.decoding}
      />
    </picture>
  )
}

export function CatalogHeroSlides() {
  return (
    <div className="catalog-hero-slider" data-autoplay-ms="6500" aria-roledescription="carousel" aria-label="Галерея интерьеров">
      <div className="catalog-hero-slides">
        {CATALOG_HERO_SLIDES.map((slide) => (
          <div
            key={slide.id}
            className={`catalog-hero-slide${slide.id === 0 ? ' is-active' : ''}`}
            id={`catalog-hero-slide-${slide.id}`}
            data-slide={String(slide.id)}
            aria-hidden={slide.id === 0 ? 'false' : 'true'}
          >
            <HeroSlideAsset slide={slide} />
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
      <div className="catalog-hero-dots" role="tablist" aria-label="Слайды">
        {CATALOG_HERO_SLIDES.map((slide) => (
          <button
            key={slide.id}
            type="button"
            className={`catalog-hero-dot${slide.id === 0 ? ' is-active' : ''}`}
            role="tab"
            aria-selected={slide.id === 0}
            aria-controls={`catalog-hero-slide-${slide.id}`}
            id={`catalog-hero-tab-${slide.id}`}
            data-target={String(slide.id)}
            aria-label={`Слайд ${slide.id + 1}`}
          >
            <span className="catalog-hero-dot-shape" aria-hidden="true">
              <span className="catalog-hero-dot-fill" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function CatalogHeroSection() {
  return (
    <section className="catalog-hero">
      <div className="catalog-hero-content">
        <div className="catalog-hero-text">
          <h1 className="catalog-hero-title">
            Каталог <br /> продукции
          </h1>
          <p className="catalog-hero-description">
            Подберите матрас под ваши задачи: формат использования, уровень жесткости и требуемую нагрузку.
          </p>
        </div>
        <div className="catalog-hero-image">
          <CatalogHeroSlides />
        </div>
      </div>
    </section>
  )
}
