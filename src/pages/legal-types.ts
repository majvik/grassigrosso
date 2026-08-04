export type LegalTextRun = { type: 'text'; value: string; strong: boolean }
export type LegalLinkRun = { type: 'link'; href: string; children: LegalTextRun[] }
export type LegalRun = LegalTextRun | LegalLinkRun
export type LegalParagraphBlock = { type: 'paragraph'; heading?: string; runs: LegalRun[] }
export type LegalListBlock = { type: 'list'; heading?: string; items: { runs: LegalRun[] }[] }
export type LegalTableBlock = {
  type: 'table'
  heading?: string
  headers: string[]
  rows: { cells: { runs: LegalRun[] }[] }[]
}
export type LegalOperatorBlock = {
  type: 'operator'
  heading?: string
  role_label: string
  legal_name: string
  ogrn: string
  inn: string
  address: string
  email: string
}
export type LegalBlock =
  | LegalParagraphBlock
  | LegalListBlock
  | LegalTableBlock
  | LegalOperatorBlock
export type LegalPageData = { title: string; effective_date: string; body: LegalBlock[] }
export type LegalPageId = 'privacy' | 'terms' | 'cookies'
