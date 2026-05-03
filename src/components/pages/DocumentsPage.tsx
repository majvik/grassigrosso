import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card'
import styles from './documents-page.module.css'

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

const faqItems = [
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
    <div className={styles.page}>
      <section className={`${styles.section} ${styles.hero}`}>
        <div className={styles.heroText}>
          <div className={styles.eyebrow}>Grassigrosso</div>
          <div>
            <h1 className={styles.heroTitle}>Документы и сертификаты</h1>
            <p className={styles.heroDescription}>
              Полная прозрачность и соответствие стандартам. Мы предоставляем всю необходимую документацию для работы.
            </p>
          </div>
        </div>
        <div className={styles.heroMedia}>
          <picture>
            <source type="image/avif" srcSet="./public/docs-hero@2x.avif 2x, ./public/docs-hero.avif 1x" />
            <source type="image/webp" srcSet="./public/docs-hero@2x.webp 2x, ./public/docs-hero.webp 1x" />
            <source type="image/png" srcSet="./public/docs-hero@2x.png 2x, ./public/docs-hero.png 1x" />
            <img src="./public/docs-hero.png" alt="Интерьер спальни" />
          </picture>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Официальная сертификация</h2>
          <p className={styles.sectionLead}>
            Официальные документы доступны по запросу. После отправки заявки менеджер сразу откроет доступ к скачиванию.
          </p>
        </div>
        <div className={styles.certGrid}>
          {certificates.map((document) => (
            <Card className={styles.certCard} data-document={document.id} data-document-card key={document.id}>
              <CardHeader className={styles.certCardHeader}>
                <div className={styles.certIcon}>
                  <img src="./public/document.svg" alt="" />
                </div>
                <Badge variant="muted">{document.type}</Badge>
                <h3 className={styles.certTitle}>{document.title}</h3>
              </CardHeader>
              <CardContent>
                <div className={styles.metaText}>Файл PDF, доступен после отправки заявки.</div>
              </CardContent>
              <CardFooter className={styles.certActions}>
                <Button className={styles.ghostButton} data-document-request-trigger size="md" type="button" variant="secondary">
                  Запросить
                </Button>
                <span className={styles.metaText}>{document.size}</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.documentsBlock}>
          <div className={styles.documentsAside}>
            <div className={`${styles.sectionHeader} ${styles.sectionHeaderCompact}`}>
              <h2 className={styles.sectionTitle}>О компании Grassigrosso</h2>
            </div>
            <div className={styles.documentsAsideIllustration}>
              <img src="./public/catalog-illustration.svg" alt="" />
            </div>
          </div>
          <div className={styles.documentsList}>
            {companyDocuments.map((document) => (
              <article className={styles.documentRow} data-document={document.id} data-document-card key={document.id}>
                <div className={styles.documentIcon}>
                  <img src="./public/catalog.svg" alt="" />
                </div>
                <div className={styles.documentMeta}>
                  <h3 className={styles.documentTitle}>{document.title}</h3>
                  <span className={styles.documentType}>PDF документ</span>
                </div>
                <Button
                  aria-label={document.label}
                  className={styles.actionButton}
                  data-document-request-trigger
                  size="md"
                  type="button"
                  variant="secondary"
                >
                  Запросить
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.helpCard}>
          <div className={styles.helpCopy}>
            <h2 className={styles.sectionTitle}>Нужна помощь с документами?</h2>
            <p className={styles.helpText}>Наши менеджеры готовы предоставить любые необходимые документы по запросу.</p>
          </div>
          <Button data-open-help-modal size="lg" type="button">
            Связаться с менеджером
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.sectionHeader} ${styles.sectionHeaderCompact}`}>
          <h2 className={styles.sectionTitle}>Часто задаваемые вопросы</h2>
        </div>
        <div className={styles.faqList}>
          {faqItems.map((item) => (
            <div
              className={`${styles.faqItem}${item.active ? ' active' : ''}`}
              data-faq-item
              data-open={item.active ? 'true' : 'false'}
              key={item.question}
            >
              <button className={styles.faqQuestion} data-faq-question type="button">
                <h3>{item.question}</h3>
                <span className={styles.faqToggle} aria-hidden="true" />
              </button>
              <div className={styles.faqAnswer}>
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
    </div>
  )
}
