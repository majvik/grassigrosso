import styles from './download-catalog.module.css'

const DOWNLOAD_SLIDE_COUNT = 8

/** SSR/LCP fallback — must match slide #0 in Strapi + download-catalog-slides.snapshot.json */
const DOWNLOAD_SLIDE_0_SRC = '/uploads/download_catalog_cover_4eb40d86f8.avif'

function DownloadCatalogSlideZeroFallback() {
  return (
    <img
      src={DOWNLOAD_SLIDE_0_SRC}
      alt="Каталог продукции Grassigrosso"
      width={440}
      height={440}
      loading="eager"
      fetchPriority="high"
      decoding="async"
    />
  )
}

function DownloadCatalogSlider() {
  const slides = Array.from({ length: DOWNLOAD_SLIDE_COUNT }, (_, id) => id)

  return (
    <div className={styles.coverSlider}>
      <div
        className="catalog-hero-slider"
        data-autoplay-ms="6500"
        aria-roledescription="carousel"
        aria-label="Галерея каталога"
      >
        <div className="catalog-hero-slides">
          {slides.map((id) => (
            <div
              key={id}
              className={`catalog-hero-slide${id === 0 ? ' is-active' : ''}`}
              id={`catalog-hero-slide-${id}`}
              data-slide={String(id)}
              aria-hidden={id === 0 ? 'false' : 'true'}
            >
              {id === 0 ? <DownloadCatalogSlideZeroFallback /> : null}
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
          {slides.map((id) => (
            <button
              key={id}
              type="button"
              className={`catalog-hero-dot${id === 0 ? ' is-active' : ''}`}
              role="tab"
              aria-selected={id === 0}
              aria-controls={`catalog-hero-slide-${id}`}
              id={`catalog-hero-tab-${id}`}
              data-target={String(id)}
              aria-label={`Слайд ${id + 1}`}
            >
              <span className="catalog-hero-dot-shape" aria-hidden="true">
                <span className="catalog-hero-dot-fill" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PrivacyCheckbox() {
  return (
    <div className="form-checkbox">
      <input type="checkbox" id="privacy" name="privacy" required />
      <label htmlFor="privacy">
        <span className="checkbox-custom">
          <svg
            className="checkbox-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="white" />
            <path d="M4 0.5H20C21.933 0.5 23.5 2.067 23.5 4V20C23.5 21.933 21.933 23.5 20 23.5H4C2.067 23.5 0.5 21.933 0.5 20V4C0.5 2.067 2.067 0.5 4 0.5Z" stroke="#283E37" strokeOpacity="0.1" />
            <path className="checkmark" d="M6 10.5L11 16L18 8" stroke="#283E37" strokeWidth="2" />
          </svg>
        </span>
        <span className="checkbox-text">
          Я согласен на обработку моих персональных данных в соответствии с{' '}
          <a href="/privacy">Политикой конфиденциальности</a>
        </span>
      </label>
    </div>
  )
}

function HiddenTrapField() {
  return (
    <div
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <label htmlFor="website">Website</label>
      <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
    </div>
  )
}

export function DownloadCatalogPage() {
  return (
    <section className={`catalogue-new-shared-product ${styles.page}`} aria-labelledby="download-catalog-title">
      <a href="/catalog" className="catalogue-new-shared-back">
        Назад в каталог
      </a>

      <div className="catalogue-new-shared-product-shell">
        <div className={styles.media}>
          <DownloadCatalogSlider />
        </div>

        <div className="catalogue-new-shared-product-info">
          <h1 className="catalogue-new-shared-product-title" id="download-catalog-title">
            Скачать каталог
          </h1>

          <div className={styles.form}>
            <form className="contact-form" data-contact-form data-download-doc="catalog">
              <HiddenTrapField />
              <div className="form-group" data-form-group>
                <label htmlFor="name">Имя</label>
                <input type="text" id="name" placeholder="Иван Иванов" />
              </div>
              <div className="form-group" data-form-group>
                <label htmlFor="phone">Телефон</label>
                <input type="tel" id="phone" placeholder="+7 (999) 123-45-67" required />
              </div>
              <div className="form-group" data-form-group>
                <label htmlFor="email">E-mail</label>
                <input type="email" id="email" placeholder="example@company.com" required />
              </div>
              <div className="form-submit-group">
                <PrivacyCheckbox />
                <button type="submit" className="btn-primary" disabled>
                  Скачать каталог
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
