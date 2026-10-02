import { ConsentCheckbox } from '@/components/marketing/shared-page-sections'
import { usePageCms } from '@/pages/use-page-cms'
import styles from './download-catalog.module.css'

const DOWNLOAD_SLIDE_COUNT = 8

/** SSR/LCP fallback — basename must match slide #0 in Strapi + download-catalog-slides.snapshot.json */
const DOWNLOAD_SLIDE_0_BASE = '/uploads/download_catalog_cover_4eb40d86f8'

export type DownloadCatalogTextContent = {
  title: string
  lead: string
  submit_label: string
  back_label: string
  back_href: string
  catalog_pdf: { url: string } | null
}

export const DOWNLOAD_CATALOG_TEXT_DEFAULTS: DownloadCatalogTextContent = {
  title: 'Скачать каталог',
  lead: 'Оставьте контакты — пришлём PDF каталога.',
  submit_label: 'Скачать каталог',
  back_label: 'Назад в каталог',
  back_href: '/catalog',
  catalog_pdf: { url: '/documents/Catalog_v1.2.pdf' },
}

function DownloadCatalogSlideZeroFallback() {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${DOWNLOAD_SLIDE_0_BASE}@2x.avif 2x, ${DOWNLOAD_SLIDE_0_BASE}.avif 1x`}
      />
      <source
        type="image/webp"
        srcSet={`${DOWNLOAD_SLIDE_0_BASE}@2x.webp 2x, ${DOWNLOAD_SLIDE_0_BASE}.webp 1x`}
      />
      <source
        type="image/png"
        srcSet={`${DOWNLOAD_SLIDE_0_BASE}@2x.png 2x, ${DOWNLOAD_SLIDE_0_BASE}.png 1x`}
      />
      <img
        src={`${DOWNLOAD_SLIDE_0_BASE}.png`}
        alt="Каталог продукции Grassigrosso"
        width={880}
        height={880}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </picture>
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
  const data = usePageCms(
    'download-catalog',
    DOWNLOAD_CATALOG_TEXT_DEFAULTS as DownloadCatalogTextContent & Record<string, unknown>,
  ) as DownloadCatalogTextContent

  const pdfUrl = data.catalog_pdf?.url || ''

  return (
    <section className={`catalogue-new-shared-product ${styles.page}`} aria-labelledby="download-catalog-title">
      <a href={data.back_href || '/catalog'} className="catalogue-new-shared-back">
        {data.back_label}
      </a>

      <div className="catalogue-new-shared-product-shell">
        <div className={styles.media} data-download-media="">
          <DownloadCatalogSlider />
        </div>

        <div className="catalogue-new-shared-product-info">
          <h1 className="catalogue-new-shared-product-title" id="download-catalog-title">
            {data.title}
          </h1>
          {data.lead ? (
            <p className={styles.lead} data-download-lead="">
              {data.lead}
            </p>
          ) : null}

          <div className={styles.form}>
            <form
              className="contact-form"
              data-contact-form
              data-download-doc="catalog"
              data-catalog-pdf={pdfUrl || undefined}
              data-form-id="download-catalog"
            >
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
                <ConsentCheckbox />
                <button type="submit" className="btn-primary" disabled>
                  {data.submit_label}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
