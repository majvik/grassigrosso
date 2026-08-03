import { ContactSection, FaqSection } from '@/components/marketing/shared-page-sections'
import { usePageCms } from '@/pages/use-page-cms'
import {
  CONTACT_ICON_SRC,
  DEALERS_CONTACT_FORM_FIELDS,
  DEALERS_PAGE_DEFAULTS,
  DEALERS_QUALITY_VIDEO,
  type DealersPageContent,
  type PagesMedia,
} from './dealers-page-defaults'

function mediaUrl(media: PagesMedia): string {
  return media?.url || ''
}

function MultilineText({ text }: { text: string }) {
  const parts = text.split('\n')
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? <br /> : null}
          {part}
        </span>
      ))}
    </>
  )
}

export function DealersPage() {
  const data = usePageCms(
    'dealers',
    DEALERS_PAGE_DEFAULTS as DealersPageContent & Record<string, unknown>,
  ) as DealersPageContent

  const cities = [...data.geography_cities].sort((a, b) => a.sort_order - b.sort_order)
  const marqueeItems = [...cities, ...cities]

  const contactInfoItems = data.contact_info.map((item) => ({
    title: item.title,
    value: item.value,
    note: item.note,
    href: item.href || undefined,
    iconSrc: CONTACT_ICON_SRC[item.icon_key] || CONTACT_ICON_SRC.phone,
  }))

  const packageField = {
    id: 'dealer-package',
    label: data.contact_package_field_label || 'Пакет',
    placeholderLabel: data.contact_package_placeholder || 'Выберите пакет',
    options: data.packages.map((pkg) => ({
      value: pkg.value,
      label: pkg.form_option_label,
    })),
  }

  const faqItems = data.faq_items.map((item) => ({
    question: item.question,
    answer: item.answer,
    active: item.open_by_default,
  }))

  const heroImage = mediaUrl(data.hero.image)
  const mapImage = mediaUrl(data.geography_map_image) || '/Map.svg'
  const qualityPoster = mediaUrl(data.quality_image) || DEALERS_QUALITY_VIDEO.poster
  const qualityParagraphs = data.quality_body.split('\n').filter(Boolean)

  return (
    <>
      <section className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-text">
            <div className="page-hero-text-top">
              <h1 className="page-hero-title">{data.hero.title}</h1>
              <p className="page-hero-description">
                <MultilineText text={data.hero.description} />
              </p>
              <a href={data.hero.cta_url || '#contact-form'} className="btn-primary-large">
                {data.hero.cta_label}
              </a>
            </div>
          </div>
          <div className="page-hero-image">
            {heroImage ? (
              <picture>
                <img src={heroImage} alt={data.hero.image_alt || ''} />
              </picture>
            ) : null}
          </div>
        </div>
        <div className="section-divider" />
        <div className="stats-wrapper">
          <div className="stats-grid">
            {data.stats.map((stat) => (
              <div className="stat-item" key={`${stat.label}-${stat.value}`}>
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="conditions-section">
        <div className="conditions-left">
          <h2 className="section-title">{data.conditions_title}</h2>
          {data.conditions_subtitle ? (
            <p className="conditions-subtitle">{data.conditions_subtitle}</p>
          ) : null}
        </div>
        <div className="conditions-right">
          {data.conditions.map((item, index) => (
            <div className="condition-item" key={`${item.title}-${index}`}>
              <h3 className="condition-title">{item.title}</h3>
              {index < data.conditions.length - 1 ? <div className="condition-divider" /> : null}
            </div>
          ))}
        </div>
        <div className="conditions-icon">
          {mediaUrl(data.conditions_icon) ? (
            <img src={mediaUrl(data.conditions_icon)} alt="Иконка руки с указателем для условий участия" />
          ) : null}
        </div>
      </section>

      <section className="offers-section">
        <div className="offers-header">
          <h2 className="section-title">{data.offers_title}</h2>
          {data.offers_subtitle ? <p className="offers-subtitle">{data.offers_subtitle}</p> : null}
        </div>
        <div className="section-divider" />
        <div className="offers-grid">
          {data.offers.map((offer) => (
            <div className="offer-card" key={offer.title}>
              <div className="offer-icon">
                {mediaUrl(offer.icon) ? <img src={mediaUrl(offer.icon)} alt="" /> : null}
              </div>
              <div className="offer-content">
                <h3 className="offer-title">{offer.title}</h3>
                <ul className="offer-list">
                  {offer.bullets.map((item, index) => (
                    <li key={`${item.title}-${index}`}>{item.title}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="geography-section">
        <div className="geography-header">
          <h2 className="section-title">{data.geography_title}</h2>
          {data.geography_subtitle ? (
            <p className="geography-subtitle">{data.geography_subtitle}</p>
          ) : null}
        </div>
        <div className="geography-map" id="geographyMapContainer">
          <img src={mapImage} alt="География дилеров" id="geographyMapImg" />
        </div>
        <div className="geography-cities-wrapper">
          <div className="geography-cities">
            {marqueeItems.map((city, index) => (
              <span key={`${city.name}-${index}`}>
                <span className="city-item">
                  {city.name}
                  {city.badge ? (
                    <>
                      {' '}
                      <span className="city-tag">{city.badge}</span>
                    </>
                  ) : null}
                </span>
                {index < marqueeItems.length - 1 ? <span className="city-separator" /> : null}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="quality-section">
        <div className="quality-content-wrapper">
          <div className="quality-content">
            <h2 className="section-title">{data.quality_title}</h2>
            <div className="quality-text">
              {qualityParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div className="quality-image" id="qualityVideo">
            <video className="quality-video" poster={qualityPoster} autoPlay loop muted playsInline>
              <source src={DEALERS_QUALITY_VIDEO.webm} type="video/webm" />
              <source src={DEALERS_QUALITY_VIDEO.mp4} type="video/mp4" />
            </video>
            <picture className="quality-poster">
              <source type="image/avif" srcSet={qualityPoster} />
              <source type="image/webp" srcSet={DEALERS_QUALITY_VIDEO.posterWebp} />
              <img src={DEALERS_QUALITY_VIDEO.posterFallbackJpg} alt="Производство" />
            </picture>
            <button className="hero-play-btn" aria-label="Воспроизвести видео">
              <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="32" fill="white" fillOpacity="0.9" />
                <path d="M26 20L46 32L26 44V20Z" fill="#243731" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <section className="requirements-section">
        <div className="requirements-header">
          <h2 className="section-title">{data.requirements_title}</h2>
          {data.requirements_subtitle ? (
            <p className="requirements-subtitle">{data.requirements_subtitle}</p>
          ) : null}
        </div>
        <div className="section-divider" />
        <div className="requirements-grid">
          {data.requirements.map((card) => (
            <div className="requirement-card" key={card.title}>
              <div className="requirement-icon">
                {mediaUrl(card.icon) ? <img src={mediaUrl(card.icon)} alt="" /> : null}
              </div>
              <div className="requirement-content">
                <h3 className="requirement-title">{card.title}</h3>
                <ul className="requirement-list">
                  {card.bullets.map((item, index) => (
                    <li key={`${item.title}-${index}`}>{item.title}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="packages-section">
        <div className="packages-header">
          <h2 className="section-title">{data.packages_title}</h2>
          {data.packages_subtitle ? (
            <p className="packages-subtitle">{data.packages_subtitle}</p>
          ) : null}
        </div>
        <div className="packages-grid">
          {data.packages.map((pkg) => (
            <div
              className={`package-card${pkg.featured ? ' package-featured' : ''}`}
              key={pkg.value}
            >
              <div className="package-header">
                <h3 className="package-title">{pkg.title}</h3>
                <div className="package-price">
                  <span className="price-value">{pkg.price}</span>
                </div>
              </div>
              <ul className="package-features">
                {pkg.features.map((item, index) => (
                  <li className="feature-included" key={`${item.title}-${index}`}>
                    <span className="feature-check">✓</span> {item.title}
                  </li>
                ))}
              </ul>
              <a
                href="#contact-form"
                className={pkg.featured ? 'btn-secondary' : 'btn-primary'}
                data-package={pkg.value}
              >
                {pkg.cta_label || 'Выбрать пакет'}
              </a>
            </div>
          ))}
        </div>
      </section>

      <ContactSection
        contactInfoItems={contactInfoItems}
        fields={DEALERS_CONTACT_FORM_FIELDS}
        formTitle={data.contact_form_title}
        sectionTitle={data.contact_section_title}
        selectField={packageField}
        submitLabel={data.contact_submit_label}
      />

      <FaqSection items={faqItems} title={data.faq_title} />
    </>
  )
}
