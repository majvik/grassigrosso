const certificates = [
  {
    id: 'declaration',
    title: 'Евразийский Экономический Союз. Декларация о соответствии',
    type: 'Декларация',
    size: '2.5 MB',
  },
  {
    id: 'certificate',
    title: 'Результаты лабораторных испытаний «ПромМаш Тест»',
    type: 'Сертификат',
    size: '1.8 MB',
  },
  {
    id: 'trademark',
    title: 'Свидетельство на товарный знак GrassiGrosso',
    type: 'Товарный знак',
    size: '1.2 MB',
  },
]

const companyDocuments = [
  { id: 'catalog', title: 'Каталог продукции', label: 'Запросить каталог продукции' },
  { id: 'presentation', title: 'Презентация компании', label: 'Запросить презентацию компании' },
]

const faqItems: Array<{ active?: boolean; answer: string; question: string }> = [
  {
    active: true,
    answer:
      'Стандартные сроки производства составляют 3 рабочих дня с момента подтверждения заказа. Для индивидуальных проектов сроки согласовываются отдельно.',
    question: 'Как быстро производите?',
  },
  {
    answer:
      'Да, мы осуществляем доставку по всей России. Стоимость и сроки доставки рассчитываются индивидуально в зависимости от региона и объема заказа.',
    question: 'Доставляете ли в регионы?',
  },
  {
    answer:
      'Мы принимаем все способы оплаты, а также работаем по системе отсрочки платежа для постоянных клиентов.\nВсе условия оплаты обсуждаются индивидуально.',
    question: 'Какие есть способы оплаты?',
  },
]

export function DocumentsPage() {
  return (
    <>
      <section className="documents-hero">
        <div className="documents-hero-content">
          <div className="documents-hero-text">
            <h1 className="documents-hero-title">Документы и сертификаты</h1>
            <p className="documents-hero-description">
              Полная прозрачность и соответствие стандартам. Мы предоставляем всю необходимую документацию для работы.
            </p>
          </div>
          <div className="documents-hero-image">
            <picture>
              <source type="image/avif" srcSet="./public/docs-hero@2x.avif 2x, ./public/docs-hero.avif 1x" />
              <source type="image/webp" srcSet="./public/docs-hero@2x.webp 2x, ./public/docs-hero.webp 1x" />
              <source type="image/png" srcSet="./public/docs-hero@2x.png 2x, ./public/docs-hero.png 1x" />
              <img src="./public/docs-hero.png" alt="Интерьер спальни" />
            </picture>
          </div>
        </div>
      </section>

      <section className="documents-certification">
        <div className="documents-certification-header">
          <div className="documents-certification-header-left">
            <h2 className="section-title">Официальная сертификация</h2>
          </div>
          <div className="documents-certification-header-right">
            <p className="documents-certification-intro" />
          </div>
        </div>
        <div className="documents-certification-grid">
          {certificates.map((document) => (
            <div className="documents-cert-card" data-document={document.id} data-document-card key={document.id}>
              <div className="documents-cert-icon">
                <img src="./public/document.svg" alt="" />
              </div>
              <h3 className="documents-cert-title">{document.title}</h3>
              <span className="documents-cert-type">{document.type}</span>
              <div className="documents-cert-footer">
                <a href="#" className="documents-cert-download" data-document-request-trigger>
                  ЗАПРОСИТЬ
                  <img src="./public/arrow-down.svg" alt="" className="arrow-down" />
                </a>
                <span className="documents-cert-size">{document.size}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="documents-commercial">
        <div className="documents-commercial-content">
          <div className="documents-commercial-left">
            <h2 className="section-title documents-commercial-title">О компании Grassigrosso</h2>
            <div className="documents-commercial-icon">
              <img src="./public/catalog-illustration.svg" alt="" />
            </div>
          </div>
          <div className="documents-commercial-right">
            <div className="documents-commercial-list">
              {companyDocuments.map((document) => (
                <div className="documents-commercial-item" data-document={document.id} data-document-card key={document.id}>
                  <div className="documents-commercial-item-icon">
                    <img src="./public/catalog.svg" alt="" />
                  </div>
                  <div className="documents-commercial-item-content">
                    <h3 className="documents-commercial-item-title">{document.title}</h3>
                    <p className="documents-commercial-item-type">PDF документ</p>
                  </div>
                  <a
                    href="#"
                    className="documents-commercial-item-download"
                    data-document-request-trigger
                    aria-label={document.label}
                  >
                    <img src="./public/arrow-down.svg" alt="" />
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
            <h2 className="section-title">Нужна помощь с документами?</h2>
          </div>
          <div className="documents-help-right">
            <p className="documents-help-text">Наши менеджеры готовы предоставить любые необходимые документы по запросу</p>
            <a href="#" className="btn-primary-large" data-open-help-modal>
              Связаться с менеджером
            </a>
          </div>
        </div>
      </section>

      <section className="documents-faq">
        <h2 className="section-title">Часто задаваемые вопросы</h2>
        <div className="faq-list">
          {faqItems.map((item) => (
            <div
              className={`faq-item${item.active ? ' active' : ''}`}
              data-faq-item
              data-open={item.active ? 'true' : 'false'}
              key={item.question}
            >
              <div className="faq-question" data-faq-question>
                <h3>{item.question}</h3>
                <div className="faq-toggle" />
              </div>
              <div className="faq-answer">
                <p>
                  {item.answer.split('\n').map((line, index, lines) => (
                    <span key={line}>
                      {line}
                      {index < lines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
