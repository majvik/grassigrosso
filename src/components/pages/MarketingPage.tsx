import { MARKETING_PAGE_CONTENT, type MarketingPageId } from './marketing-content'

interface MarketingPageProps {
  pageId: MarketingPageId
}

export function MarketingPage({ pageId }: MarketingPageProps) {
  return <div dangerouslySetInnerHTML={{ __html: MARKETING_PAGE_CONTENT[pageId] }} />
}
