import { FaqSection } from '@/components/marketing/shared-page-sections'
import { usePageCms } from '@/pages/use-page-cms'
import {
  DOCUMENTS_COMPANY_ILLUSTRATION_FALLBACK,
  DOCUMENTS_HERO_PICTURE,
  DOCUMENTS_PAGE_DEFAULTS,
  type DocumentsPageContent,
  type PagesMedia,
} from './documents-page-defaults'

function mediaUrl(media: PagesMedia): string {
  return media?.url || ''
}

export function DocumentsPage() {
  const data = usePageCms(
    'documents',
    DOCUMENTS_PAGE_DEFAULTS as DocumentsPageContent & Record<string, unknown>,
  ) as DocumentsPageContent

  const cmsHero = mediaUrl(data.hero.image)
  const companyIllustration =
    mediaUrl(data.company_illustration) || DOCUMENTS_COMPANY_ILLUSTRATION_FALLBACK

  const faqItems = data.faq_items.map((item) => ({
    question: item.question,
    answer: item.answer,
    active: item.open_by_default,
  }))

  return (
    <>
      <section className="documents-hero">
        <div className="documents-hero-content">
          <div className="documents-hero-text">
            <h1 className="documents-hero-title">{data.hero.title}</h1>
            <p className="documents-hero-description">{data.hero.description}</p>
          </div>
          <div className="documents-hero-image">
            {cmsHero ? (
              <img src={cmsHero} alt={data.hero.image_alt || ''} />
            ) : (
              <picture>
                <source type="image/avif" srcSet={DOCUMENTS_HERO_PICTURE.avif} />
                <source type="image/webp" srcSet={DOCUMENTS_HERO_PICTURE.webp} />
                <source type="image/png" srcSet={DOCUMENTS_HERO_PICTURE.png} />
                <img src={DOCUMENTS_HERO_PICTURE.src} alt={data.hero.image_alt || ''} />
              </picture>
            )}
          </div>
        </div>
      </section>

      <section className="documents-certification">
        <div className="documents-certification-header">
          <div className="documents-certification-header-left">
            <h2 className="section-title">{data.certificates_title}</h2>
          </div>
          <div className="documents-certification-header-right">
            <p className="documents-certification-intro" />
          </div>
        </div>
        <div className="documents-certification-grid">
          {data.certificates.map((document) => (
            <div
              className="documents-cert-card"
              data-document={document.document_key}
              data-document-card
              key={document.document_key}
            >
              <div className="documents-cert-icon">
                <img src="/document.svg" alt="" />
              </div>
              <h3 className="documents-cert-title">{document.title}</h3>
              <span className="documents-cert-type">{document.type_label}</span>
              <div className="documents-cert-footer">
                <a
                  href="#"
                  className="documents-cert-download"
                  data-document-request-trigger
                  aria-label={document.request_aria_label || document.request_label}
                >
                  {document.request_label || 'ЗАПРОСИТЬ'}
                  <img src="/arrow-down.svg" alt="" className="arrow-down" />
                </a>
                {document.size_label ? (
                  <span className="documents-cert-size">{document.size_label}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="documents-commercial">
        <div className="documents-commercial-content">
          <div className="documents-commercial-left">
            <h2 className="section-title documents-commercial-title">{data.company_title}</h2>
            <div className="documents-commercial-icon">
              <img src={companyIllustration} alt="" />
            </div>
          </div>
          <div className="documents-commercial-right">
            <div className="documents-commercial-list">
              {data.company_documents.map((document) => (
                <div
                  className="documents-commercial-item"
                  data-document={document.document_key}
                  data-document-card
                  key={document.document_key}
                >
                  <div className="documents-commercial-item-icon">
                    <img src="/catalog.svg" alt="" />
                  </div>
                  <div className="documents-commercial-item-content">
                    <h3 className="documents-commercial-item-title">{document.title}</h3>
                    <p className="documents-commercial-item-type">
                      {document.type_label || 'PDF документ'}
                    </p>
                  </div>
                  <a
                    href="#"
                    className="documents-commercial-item-download"
                    data-document-request-trigger
                    aria-label={document.request_aria_label || document.title}
                  >
                    <img src="/arrow-down.svg" alt="" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="documents-help">
        <div className="documents-help-content">
          <div className="documents-help-left">
            <h2 className="section-title">{data.help_title}</h2>
          </div>
          <div className="documents-help-right">
            <p className="documents-help-text">{data.help_body}</p>
            <a href="#" className="btn-primary-large" data-open-help-modal>
              {data.help_cta_label}
            </a>
          </div>
        </div>
      </section>

      <FaqSection
        items={faqItems}
        sectionClassName="documents-faq"
        title={data.faq_title}
        toggleElement="div"
      />
    </>
  )
}
