import { DealersPage } from '@/components/pages/DealersPage'
import { ContactsPage } from '@/components/pages/ContactsPage'
import { DocumentsPage } from '@/components/pages/DocumentsPage'
import { HotelsPage } from '@/components/pages/HotelsPage'
import { LegacyContentPage } from '@/components/pages/LegacyContentPage'
import { LegalPage } from '@/components/pages/LegalPage'
import { LEGAL_PAGES, type LegalPageId } from '@/components/pages/legal-content'
import { MarketingPage } from '@/components/pages/MarketingPage'
import { MARKETING_PAGE_CONTENT, type MarketingPageId } from '@/components/pages/marketing-content'
import { NotFoundPage } from '@/components/pages/NotFoundPage'
import { UnsubscribePage } from '@/components/pages/UnsubscribePage'

interface ReactIslandRootProps {
  fallbackHtml: string
  page: string
}

export function ReactIslandRoot({ fallbackHtml, page }: ReactIslandRootProps) {
  if (page === 'hotels') return <HotelsPage />
  if (page === 'dealers') return <DealersPage />
  if (page === 'contacts') return <ContactsPage />
  if (page === 'documents') return <DocumentsPage />
  if (page === 'unsubscribe') return <UnsubscribePage />
  if (page === '404') return <NotFoundPage />
  if (page in LEGAL_PAGES) return <LegalPage pageId={page as LegalPageId} />
  if (page in MARKETING_PAGE_CONTENT) return <MarketingPage pageId={page as MarketingPageId} />

  return <LegacyContentPage html={fallbackHtml} />
}
