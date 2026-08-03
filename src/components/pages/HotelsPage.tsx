import { ContactSection, FaqSection } from '@/components/marketing/shared-page-sections'
import { usePageCms } from '@/pages/use-page-cms'
import {
  CONTACT_ICON_SRC,
  HOTELS_CATEGORIES_CTA,
  HOTELS_CONTACT_FORM_FIELDS,
  HOTELS_PAGE_DEFAULTS,
  HOTELS_PRODUCT_PICTURE,
  type HotelsPageContent,
  type PagesMedia,
} from './hotels-page-defaults'

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

export function HotelsPage() {
  const data = usePageCms(
    'hotels',
    HOTELS_PAGE_DEFAULTS as HotelsPageContent & Record<string, unknown>,
  ) as HotelsPageContent

  const activeCategory =
    data.categories.find((item) => item.active) || data.categories[0] || null

  const contactInfoItems = data.contact_info.map((item) => ({
    title: item.title,
    value: item.value,
    note: item.note,
    href: item.href || undefined,
    iconSrc: CONTACT_ICON_SRC[item.icon_key] || CONTACT_ICON_SRC.phone,
  }))

  const faqItems = data.faq_items.map((item) => ({
    question: item.question,
    answer: item.answer,
    active: item.open_by_default,
  }))

  const heroImage = mediaUrl(data.hero.image)

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
              <a href={data.hero.cta_url || '#'} className="btn-primary-large" data-open-commercial-offer>
                {data.hero.cta_label}
              </a>
            </div>
            <a href="/catalog" className="catalog-link catalog-link-desktop">
              <span>
                Смотреть
                <br />
                каталог
              </span>
              <img src="/arrow-hero-catalog.svg" alt="" className="catalog-arrow" />
            </a>
          </div>
          <div className="page-hero-image">
            {heroImage ? (
              <picture>
                <img src={heroImage} alt={data.hero.image_alt || ''} />
              </picture>
            ) : null}
          </div>
          <a href="/catalog" className="catalog-link catalog-link-mobile">
            <span>
              Смотреть
              <br />
              каталог
            </span>
            <img src="/arrow-hero-catalog.svg" alt="" className="catalog-arrow" />
          </a>
        </div>
        <div className="section-divider" />
        <div className="stats-wrapper">
          <div className="stats-grid">
            {data.stats.map((stat) => (
              <div className="stat-item" key={`${stat.label}-${stat.value}`}>
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">
                  {stat.value}
                  {stat.label === 'Расширенная гарантия' ? (
                    <span className="stat-note">*</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          {data.stats_note ? <p className="stats-note">{data.stats_note}</p> : null}
        </div>
      </section>

      <section className="hotel-categories-section">
        <div className="hotel-categories-header">
          <h2 className="section-title">{data.categories_title}</h2>
        </div>
        <div className="hotel-categories-content">
          <div className="categories-list">
            {data.categories.map((item) => (
              <div
                className={`category-item${item.active ? ' category-active' : ''}`}
                data-text={item.text}
                key={item.name}
              >
                <div className="category-item-row">
                  <span className="category-name">{item.name}</span>
                  <img src="/arrow-category.svg" alt="" className="category-arrow" />
                </div>
                <div className="category-divider" />
              </div>
            ))}
          </div>
          <div className="categories-description">
            <p className="categories-text">{activeCategory?.text || ''}</p>
            <div className="categories-cta">
              <p className="categories-question">{HOTELS_CATEGORIES_CTA.question}</p>
              <a href="#contact-form" className="btn-primary-large">
                {HOTELS_CATEGORIES_CTA.button}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="product-cards-section">
        {data.products.map((card, index) => {
          const cmsImage = mediaUrl(card.image)
          const picture = HOTELS_PRODUCT_PICTURE[card.catalog_key]
          const alt = card.image_alt || card.title
          return (
            <div key={card.catalog_key}>
              {index > 0 ? <div className="section-divider" /> : null}
              <div className="product-card" data-catalog={card.catalog_key}>
                <div className="product-card-content">
                  <div className="product-card-text">
                    <h3 className="product-card-title">{card.title}</h3>
                    <p className="product-card-description">{card.description}</p>
                  </div>
                  <a href="#" className="product-card-link" data-open-catalog>
                    <span>{card.cta_label || 'Подробнее'}</span>
                    <img src="/arrow-small.svg" alt="" />
                  </a>
                </div>
                <div className="product-card-image">
                  {cmsImage ? (
                    // CMS media owns the slot: no legacy <source> (they would win over img src).
                    <img src={cmsImage} alt={alt} />
                  ) : picture ? (
                    <picture>
                      <source type="image/avif" srcSet={picture.avif} />
                      <source type="image/webp" srcSet={picture.webp} />
                      <source type={picture.fallbackType} srcSet={picture.fallback} />
                      <img src={picture.src} alt={alt} />
                    </picture>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="discount-section">
        <div className="discount-header">
          <h2 className="section-title">{data.discount_title}</h2>
          {data.discount_subtitle ? (
            <p className="discount-subtitle">{data.discount_subtitle}</p>
          ) : null}
        </div>
        <div className="discount-wrapper">
          <div className="discount-table">
            <div className="discount-table-header">
              <span className="discount-col">{data.discount_col_amount}</span>
              <span className="discount-col">{data.discount_col_discount}</span>
              <span className="discount-col">{data.discount_col_terms}</span>
            </div>
            <div className="discount-table-body">
              {data.discount_rows.map((row) => (
                <div
                  className={`discount-row${row.highlight ? ' highlight' : ''}`}
                  key={`${row.amount_label}-${row.discount_label}`}
                >
                  <span className="discount-col">{row.amount_label}</span>
                  <span className="discount-col">
                    <span className="discount-badge">{row.discount_label}</span>
                  </span>
                  <span className="discount-col">{row.terms_label}</span>
                </div>
              ))}
            </div>
          </div>
          {data.discount_note ? <p className="discount-note">{data.discount_note}</p> : null}
        </div>
      </section>

      <ContactSection
        contactInfoItems={contactInfoItems}
        fields={HOTELS_CONTACT_FORM_FIELDS}
        formTitle={data.contact_form_title}
        sectionTitle={data.contact_section_title}
        submitLabel={data.contact_submit_label}
      />

      <section className="refresh-section">
        <div className="refresh-content">
          {data.refresh_badge ? <div className="refresh-badge">{data.refresh_badge}</div> : null}
          <h2 className="section-title">{data.refresh_title}</h2>
          <p className="refresh-description">{data.refresh_description}</p>
          <div className="refresh-features">
            {data.refresh_features.map((feature, index) => (
              <div key={`${feature.title}-${index}`} style={{ display: 'contents' }}>
                {index > 0 ? <div className="refresh-feature-divider" /> : null}
                <div className="refresh-feature">
                  <div className="refresh-feature-icon">
                    {mediaUrl(feature.icon) ? (
                      <img src={mediaUrl(feature.icon)} alt="" />
                    ) : null}
                  </div>
                  <div className="refresh-feature-content">
                    <h4 className="refresh-feature-title">{feature.title}</h4>
                    <p className="refresh-feature-text">{feature.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <a href="#" className="btn-primary-large" data-open-commercial-offer="seasonal">
            {data.refresh_cta_label}
          </a>
        </div>
        <div className="refresh-image">
          <picture>
            <source type="image/avif" srcSet="/refresh@2x.avif 2x, /refresh.avif 1x" />
            <source type="image/webp" srcSet="/refresh@2x.webp 2x, /refresh.webp 1x" />
            <source type="image/png" srcSet="/refresh@2x.png 2x, /refresh.png 1x" />
            <img src="/refresh.png" alt="Refresh программа" />
          </picture>
        </div>
      </section>

      <FaqSection items={faqItems} title={data.faq_title} />
    </>
  )
}
