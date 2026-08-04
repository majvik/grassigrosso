/**
 * Legal pages public surface — structured CMS defaults (Phase 6D).
 * ReactNode JSX body removed; render via LegalPage + legal-renderer.
 */
export {
  LEGAL_PAGE_DEFAULTS as LEGAL_PAGES,
  getLegalPageDefaults,
  type LegalPageData,
  type LegalPageId,
} from '@/pages/legal-page-defaults'

/** @deprecated Prefer LegalPageId from legal-page-defaults */
export type LegalPageContent = {
  id: import('@/pages/legal-page-defaults').LegalPageId
  title: string
  effective_date: string
  body: import('@/pages/legal-types').LegalBlock[]
}
