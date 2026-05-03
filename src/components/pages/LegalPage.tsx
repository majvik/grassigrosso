import { LEGAL_PAGES, type LegalPageId } from './legal-content'
import styles from './service-page.module.css'

interface LegalPageProps {
  pageId: LegalPageId
}

export function LegalPage({ pageId }: LegalPageProps) {
  const page = LEGAL_PAGES[pageId]

  return (
    <section className={styles.page} aria-labelledby={`${page.id}-title`}>
      <div className={styles.inner}>
        <h1 className={styles.title} id={`${page.id}-title`}>
          {page.title}
        </h1>
        <p className={styles.date}>{page.updatedAt}</p>
        <div className={styles.content}>{page.content}</div>
      </div>
    </section>
  )
}
