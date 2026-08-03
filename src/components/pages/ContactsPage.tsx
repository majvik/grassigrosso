import { ContactSection } from '@/components/marketing/shared-page-sections'
import { usePageCms } from '@/pages/use-page-cms'
import {
  CONTACT_ICON_SRC,
  CONTACTS_CONTACT_FORM_FIELDS,
  CONTACTS_HERO_PICTURE,
  CONTACTS_PAGE_DEFAULTS,
  type ContactsPageContent,
  type PagesMedia,
} from './contacts-page-defaults'

function mediaUrl(media: PagesMedia): string {
  return media?.url || ''
}

export function ContactsPage() {
  const data = usePageCms(
    'contacts',
    CONTACTS_PAGE_DEFAULTS as ContactsPageContent & Record<string, unknown>,
  ) as ContactsPageContent

  const contactInfoItems = data.contact_info.map((item) => ({
    title: item.title,
    value: item.value,
    note: item.note,
    href: item.href || undefined,
    iconSrc: CONTACT_ICON_SRC[item.icon_key] || CONTACT_ICON_SRC.phone,
  }))

  const cmsHero = mediaUrl(data.hero.image)

  return (
    <>
      <section className="contacts-hero">
        <div className="contacts-hero-content">
          <div className="contacts-hero-text">
            <h1 className="contacts-hero-title">{data.hero.title}</h1>
            <p className="contacts-hero-description">{data.hero.description}</p>
          </div>
          <div className="contacts-hero-image">
            {cmsHero ? (
              <img src={cmsHero} alt={data.hero.image_alt || ''} />
            ) : (
              <picture>
                <source type="image/avif" srcSet={CONTACTS_HERO_PICTURE.avif} />
                <source type="image/webp" srcSet={CONTACTS_HERO_PICTURE.webp} />
                <source type="image/png" srcSet={CONTACTS_HERO_PICTURE.png} />
                <img src={CONTACTS_HERO_PICTURE.src} alt={data.hero.image_alt || ''} />
              </picture>
            )}
          </div>
        </div>
      </section>

      <section className="contacts-offices">
        <h2 className="section-title">{data.offices_title}</h2>
        <div className="contacts-offices-grid">
          {data.offices.map((office) => (
            <div className="contacts-office-card" key={office.slug}>
              <div className="contacts-office-header">
                <span className="contacts-office-badge">{office.badge}</span>
                {office.region ? <p className="contacts-office-region">{office.region}</p> : null}
                <h3 className="contacts-office-city">{office.city}</h3>
              </div>
              <div className="contacts-office-info">
                <div className="contacts-office-item">
                  <span className="contacts-office-label">Адрес:</span>
                  <span className="contacts-office-value">{office.address}</span>
                </div>
                <div className="contacts-office-item">
                  <span className="contacts-office-label">Телефон:</span>
                  <span className="contacts-office-value">
                    <a href={office.phone_href}>{office.phone}</a>
                  </span>
                </div>
                <div className="contacts-office-item">
                  <span className="contacts-office-label">Email:</span>
                  <span className="contacts-office-value">
                    <span className="contacts-office-email-row" data-office-email-row>
                      <a href={`mailto:${office.email}`}>{office.email}</a>
                      <button
                        type="button"
                        className="contacts-office-copy-email"
                        aria-label="Скопировать email"
                        data-copy-email={office.email}
                        data-copy-email-trigger
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M15.8 4H12.2C9.8804 4 8 5.8804 8 8.2V11.8C8 14.1196 9.8804 16 12.2 16H15.8C18.1196 16 20 14.1196 20 11.8V8.2C20 5.8804 18.1196 4 15.8 4Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M14.5 16V16.4C14.5 18.6644 12.6644 20.5 10.4 20.5H8.1C5.83563 20.5 4 18.6644 4 16.4V13C4 10.7909 5.79086 9 8 9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </span>
                  </span>
                </div>
                <div className="contacts-office-item">
                  <span className="contacts-office-label">Время работы:</span>
                  <span className="contacts-office-value">{office.schedule}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="contacts-map">
        <div className="contacts-map-header">
          <h2 className="section-title">{data.map_title}</h2>
          <div className="contacts-map-tabs">
            {data.offices.map((office, index) => (
              <button
                className={`contacts-map-tab${index === 0 ? ' active' : ''}`}
                data-office={office.slug}
                data-map-tab
                key={office.slug}
              >
                {office.tab_label}
              </button>
            ))}
          </div>
        </div>
        <div className="contacts-map-container">
          {data.offices.map((office, index) =>
            office.map_embed_url ? (
              <iframe
                className="contacts-map-frame"
                id={`map-${office.slug}`}
                data-office={office.slug}
                data-map-frame
                data-map-embed="1"
                src={office.map_embed_url}
                title={`Карта: ${office.city}`}
                hidden={index !== 0}
                key={office.slug}
              />
            ) : (
              <div
                className="contacts-map-placeholder contacts-map-frame"
                id={`map-${office.slug}`}
                data-office={office.slug}
                data-map-frame
                hidden={index !== 0}
                key={office.slug}
              />
            ),
          )}
        </div>
      </section>

      <ContactSection
        contactInfoItems={contactInfoItems}
        fields={CONTACTS_CONTACT_FORM_FIELDS}
        formTitle={data.contact_form_title}
        sectionTitle={data.contact_section_title}
        submitLabel={data.contact_submit_label}
      />
    </>
  )
}
