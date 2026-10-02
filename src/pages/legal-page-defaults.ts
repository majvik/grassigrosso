import privacy from './legal-defaults/privacy.json'
import terms from './legal-defaults/terms.json'
import cookies from './legal-defaults/cookies.json'
import personalDataConsent from './legal-defaults/personal-data-consent.json'
import {
  canonicalizeLegalPageData,
  type LegalPageData,
  type LegalPageId,
} from './legal-page-contract'

export type { LegalPageData, LegalPageId }

export const LEGAL_PAGE_DEFAULTS: Record<LegalPageId, LegalPageData> = {
  privacy: canonicalizeLegalPageData(privacy),
  terms: canonicalizeLegalPageData(terms),
  cookies: canonicalizeLegalPageData(cookies),
  'personal-data-consent': canonicalizeLegalPageData(personalDataConsent),
}

export function getLegalPageDefaults(id: LegalPageId): LegalPageData {
  return structuredClone(LEGAL_PAGE_DEFAULTS[id])
}
