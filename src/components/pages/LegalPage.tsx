import { usePageCms } from '@/pages/use-page-cms'
import {
  getLegalPageDefaults,
  type LegalPageData,
  type LegalPageId,
} from '@/pages/legal-page-defaults'
import { formatLegalUpdatedAtLabel } from '@/pages/legal-page-contract'
import { renderLegalPageBody } from './legal-renderer'

interface LegalPageProps {
  pageId: LegalPageId
}

export function LegalPage({ pageId }: LegalPageProps) {
  const fallback = getLegalPageDefaults(pageId)
  const data = usePageCms(
    pageId,
    fallback as LegalPageData & Record<string, unknown>,
  ) as LegalPageData

  return (
    <section className="legal-page" aria-labelledby={`${pageId}-title`}>
      <div className="legal-page-inner">
        <h1 className="legal-page-title" id={`${pageId}-title`}>
          {data.title}
        </h1>
        <p className="legal-page-date">{formatLegalUpdatedAtLabel(data.effective_date)}</p>
        <div className="legal-page-content">{renderLegalPageBody(data)}</div>
      </div>
    </section>
  )
}
