/**
 * Canonicalize + validate legal page CMS → public feed `{ data }` shape (contract v2.1).
 * TypeScript port of strapi-catalog pages-cms legal-page-contract + allowlist (browser-safe).
 */

import type {
  LegalBlock,
  LegalLinkRun,
  LegalListBlock,
  LegalOperatorBlock,
  LegalPageData,
  LegalPageId,
  LegalParagraphBlock,
  LegalRun,
  LegalTableBlock,
  LegalTextRun,
} from './legal-types'

export type {
  LegalBlock,
  LegalLinkRun,
  LegalListBlock,
  LegalOperatorBlock,
  LegalPageData,
  LegalPageId,
  LegalParagraphBlock,
  LegalRun,
  LegalTableBlock,
  LegalTextRun,
} from './legal-types'

/** Exact href allowlist (contract v2.1). */
export const LEGAL_HREF_ALLOWLIST: readonly string[] = Object.freeze([
  'https://grassigrosso.com',
  'mailto:office@grassigrosso.com',
  '/privacy',
])

/** Mechanical CMS body.length from Phase A matrix. */
export const LEGAL_BODY_LENGTH_BY_SLUG: Readonly<Record<LegalPageId, number>> = Object.freeze({
  privacy: 55,
  terms: 37,
  cookies: 17,
})

const LEGAL_BLOCK_TYPES = ['paragraph', 'list', 'table', 'operator'] as const
const LEGAL_RUN_TYPES = ['text', 'link'] as const

const COMPONENT_TO_BLOCK_TYPE: Readonly<Record<string, (typeof LEGAL_BLOCK_TYPES)[number]>> =
  Object.freeze({
    'legal.paragraph-block': 'paragraph',
    'legal.list-block': 'list',
    'legal.table-block': 'table',
    'legal.operator-block': 'operator',
  })

const STRAPI_META_KEYS = new Set([
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
  'status',
  '__component',
])

const ROOT_ALLOWED = new Set(['title', 'effective_date', 'body'])
const PARAGRAPH_RAW = new Set(['type', 'heading', 'runs'])
const LIST_RAW = new Set(['type', 'heading', 'items'])
const TABLE_RAW = new Set(['type', 'heading', 'headers', 'rows'])
const OPERATOR_RAW = new Set([
  'type',
  'heading',
  'role_label',
  'legal_name',
  'ogrn',
  'inn',
  'address',
  'email',
])
const TEXT_RUN_RAW = new Set(['type', 'value', 'strong'])
const LINK_RUN_RAW = new Set(['type', 'href', 'children', 'link_label', 'strong'])
const LIST_ITEM_RAW = new Set(['runs'])
const TABLE_ROW_RAW = new Set(['cells'])
const TABLE_CELL_RAW = new Set(['runs'])

const PARAGRAPH_OUT = new Set(['type', 'heading', 'runs'])
const LIST_OUT = new Set(['type', 'heading', 'items'])
const TABLE_OUT = new Set(['type', 'heading', 'headers', 'rows'])
const OPERATOR_OUT = new Set([
  'type',
  'heading',
  'role_label',
  'legal_name',
  'ogrn',
  'inn',
  'address',
  'email',
])
const TEXT_RUN_OUT = new Set(['type', 'value', 'strong'])
const LINK_RUN_OUT = new Set(['type', 'href', 'children'])

export class LegalContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LegalContractError'
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function fail(path: string, message: string): never {
  throw new LegalContractError(`${path}: ${message}`)
}

function assertNoForbiddenKeys(
  obj: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) fail(path, `unknown field "${key}"`)
  }
}

function assertRawKeys(raw: unknown, allowed: Set<string>, path: string): asserts raw is Record<string, unknown> {
  if (!isPlainObject(raw)) fail(path, 'must be object')
  for (const key of Object.keys(raw)) {
    if (STRAPI_META_KEYS.has(key)) fail(path, `forbidden meta field "${key}"`)
    if (!allowed.has(key)) fail(path, `unknown field "${key}"`)
  }
}

/**
 * Reject HTML / markup-like strings in CMS text (atomic reject).
 * Matches open/close tags such as <b>, </div>, <script ...>.
 */
export function assertNoHtmlLike(value: unknown, path: string): void {
  if (typeof value !== 'string') return
  if (/<\/?[a-zA-Z][^>]*>/.test(value)) {
    fail(path, 'HTML-like value forbidden')
  }
  if (/&lt;\/?[a-zA-Z]/.test(value)) {
    fail(path, 'HTML-like value forbidden')
  }
}

function assertNonEmptyString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, 'non-empty string required')
  }
  assertNoHtmlLike(value, path)
}

function normalizeHref(href: unknown): unknown {
  return typeof href === 'string' ? href.trim() : href
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    return leap ? 29 : 28
  }
  if ([4, 6, 9, 11].includes(month)) return 30
  return 31
}

/**
 * Format calendar YYYY-MM-DD → DD.MM.YYYY without `new Date('YYYY-MM-DD')` (timezone-safe).
 */
export function formatLegalEffectiveDate(iso: string): string {
  if (typeof iso !== 'string') {
    throw new LegalContractError('effective_date: ISO date string required (YYYY-MM-DD)')
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) {
    throw new LegalContractError('effective_date: ISO date string required (YYYY-MM-DD)')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new LegalContractError('effective_date: invalid calendar date')
  }
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  return `${dd}.${mm}.${year}`
}

export function formatLegalUpdatedAtLabel(iso: string): string {
  return `Дата последнего обновления: ${formatLegalEffectiveDate(iso)}`
}

function canonicalizeTextRun(raw: Record<string, unknown>, path: string): LegalTextRun {
  assertRawKeys(raw, TEXT_RUN_RAW, path)
  if (!('strong' in raw) || typeof raw.strong !== 'boolean') {
    fail(path, 'text.strong must be boolean')
  }
  assertNonEmptyString(raw.value, `${path}.value`)
  const out: LegalTextRun = { type: 'text', value: raw.value, strong: raw.strong }
  assertNoForbiddenKeys(out as unknown as Record<string, unknown>, TEXT_RUN_OUT, path)
  return out
}

function canonicalizeLinkRun(raw: Record<string, unknown>, path: string): LegalLinkRun {
  assertRawKeys(raw, LINK_RUN_RAW, path)
  // Discriminator: value not allowed on link
  if ('value' in raw) fail(path, 'discriminator leakage: value not allowed on link run')
  if ('strong' in raw && raw.strong !== false && raw.strong != null) {
    fail(path, 'discriminator leakage: strong not allowed on link run')
  }

  const href = normalizeHref(raw.href)
  if (typeof href !== 'string' || !LEGAL_HREF_ALLOWLIST.includes(href)) {
    fail(path, `href not in exact allowlist: ${JSON.stringify(href)}`)
  }

  let children: LegalTextRun[]
  if (Array.isArray(raw.children)) {
    if (raw.children.length === 0) fail(path, 'link.children must be non-empty')
    children = raw.children.map((c, i) => {
      if (!isPlainObject(c)) fail(`${path}.children[${i}]`, 'only text runs allowed')
      if (c.type === 'link') fail(`${path}.children[${i}]`, 'only text runs allowed')
      return canonicalizeTextRun({ ...c, type: 'text' }, `${path}.children[${i}]`)
    })
  } else if (typeof raw.link_label === 'string' && raw.link_label.trim()) {
    children = [
      canonicalizeTextRun(
        { type: 'text', value: raw.link_label, strong: false },
        `${path}.children[0]`,
      ),
    ]
  } else {
    fail(path, 'link.children must be non-empty array of text runs (or schema link_label)')
  }

  const out: LegalLinkRun = { type: 'link', href, children }
  assertNoForbiddenKeys(out as unknown as Record<string, unknown>, LINK_RUN_OUT, path)
  return out
}

export function canonicalizeRun(raw: unknown, path: string): LegalRun {
  if (!isPlainObject(raw)) fail(path, 'run must be object')
  for (const key of Object.keys(raw)) {
    if (STRAPI_META_KEYS.has(key)) fail(path, `forbidden meta field "${key}"`)
  }
  const type = raw.type
  if (typeof type !== 'string' || !(LEGAL_RUN_TYPES as readonly string[]).includes(type)) {
    fail(path, `unknown run type "${type}"`)
  }

  if (type === 'text') {
    if ('href' in raw && raw.href != null && raw.href !== '') {
      fail(path, 'discriminator leakage: href not allowed on text run')
    }
    if ('link_label' in raw && raw.link_label != null && raw.link_label !== '') {
      fail(path, 'discriminator leakage: link_label not allowed on text run')
    }
    if ('children' in raw && raw.children != null) {
      fail(path, 'discriminator leakage: children not allowed on text run')
    }
    const cleaned: Record<string, unknown> = {
      type: 'text',
      value: raw.value,
      strong: raw.strong,
    }
    for (const key of Object.keys(raw)) {
      if (['type', 'value', 'strong', 'href', 'link_label', 'children'].includes(key)) continue
      fail(path, `unknown field "${key}"`)
    }
    return canonicalizeTextRun(cleaned, path)
  }

  // link
  if ('value' in raw && raw.value != null && raw.value !== '') {
    fail(path, 'discriminator leakage: value not allowed on link run')
  }
  const cleaned: Record<string, unknown> = {
    type: 'link',
    href: raw.href,
  }
  if (Array.isArray(raw.children)) cleaned.children = raw.children
  if (typeof raw.link_label === 'string') cleaned.link_label = raw.link_label
  if ('strong' in raw) cleaned.strong = raw.strong
  for (const key of Object.keys(raw)) {
    if (['type', 'href', 'children', 'link_label', 'strong', 'value'].includes(key)) continue
    fail(path, `unknown field "${key}"`)
  }
  return canonicalizeLinkRun(cleaned, path)
}

function canonicalizeRuns(runs: unknown, path: string): LegalRun[] {
  if (!Array.isArray(runs) || runs.length === 0) fail(path, 'non-empty runs array required')
  return runs.map((r, i) => canonicalizeRun(r, `${path}[${i}]`))
}

function optionalHeading(raw: unknown, path: string): string | undefined {
  if (raw == null || raw === '') return undefined
  assertNonEmptyString(raw, path)
  return raw
}

function canonicalizeParagraph(raw: Record<string, unknown>, path: string): LegalParagraphBlock {
  assertRawKeys(raw, PARAGRAPH_RAW, path)
  const out: LegalParagraphBlock = {
    type: 'paragraph',
    runs: canonicalizeRuns(raw.runs, `${path}.runs`),
  }
  const heading = optionalHeading(raw.heading, `${path}.heading`)
  if (heading !== undefined) out.heading = heading
  assertNoForbiddenKeys(out as unknown as Record<string, unknown>, PARAGRAPH_OUT, path)
  return out
}

function canonicalizeList(raw: Record<string, unknown>, path: string): LegalListBlock {
  assertRawKeys(raw, LIST_RAW, path)
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    fail(`${path}.items`, 'non-empty items array required')
  }
  const items = raw.items.map((item, i) => {
    assertRawKeys(item, LIST_ITEM_RAW, `${path}.items[${i}]`)
    return { runs: canonicalizeRuns(item.runs, `${path}.items[${i}].runs`) }
  })
  const out: LegalListBlock = { type: 'list', items }
  const heading = optionalHeading(raw.heading, `${path}.heading`)
  if (heading !== undefined) out.heading = heading
  assertNoForbiddenKeys(out as unknown as Record<string, unknown>, LIST_OUT, path)
  return out
}

function canonicalizeTable(raw: Record<string, unknown>, path: string): LegalTableBlock {
  assertRawKeys(raw, TABLE_RAW, path)
  if (!Array.isArray(raw.headers) || raw.headers.length === 0) {
    fail(`${path}.headers`, 'non-empty headers required')
  }
  const headers = raw.headers.map((h, i) => {
    if (typeof h === 'string') {
      assertNonEmptyString(h, `${path}.headers[${i}]`)
      return h
    }
    if (isPlainObject(h) && typeof h.value === 'string') {
      for (const key of Object.keys(h)) {
        if (STRAPI_META_KEYS.has(key)) fail(`${path}.headers[${i}]`, `forbidden meta field "${key}"`)
        if (key !== 'value') fail(`${path}.headers[${i}]`, `unknown field "${key}"`)
      }
      assertNonEmptyString(h.value, `${path}.headers[${i}].value`)
      return h.value
    }
    fail(`${path}.headers[${i}]`, 'header must be string or { value }')
  })
  if (new Set(headers).size !== headers.length) {
    fail(`${path}.headers`, 'headers must be unique within table')
  }

  if (!Array.isArray(raw.rows)) fail(`${path}.rows`, 'rows array required')
  const rows = raw.rows.map((row, ri) => {
    assertRawKeys(row, TABLE_ROW_RAW, `${path}.rows[${ri}]`)
    if (!Array.isArray(row.cells)) fail(`${path}.rows[${ri}].cells`, 'cells array required')
    if (row.cells.length !== headers.length) {
      fail(
        `${path}.rows[${ri}].cells`,
        `cells.length (${row.cells.length}) !== headers.length (${headers.length})`,
      )
    }
    const cells = row.cells.map((cell, ci) => {
      assertRawKeys(cell, TABLE_CELL_RAW, `${path}.rows[${ri}].cells[${ci}]`)
      if ('data-label' in cell || 'data_label' in cell) {
        fail(`${path}.rows[${ri}].cells[${ci}]`, 'data-label must not appear in CMS/feed')
      }
      return {
        runs: canonicalizeRuns(cell.runs, `${path}.rows[${ri}].cells[${ci}].runs`),
      }
    })
    return { cells }
  })

  const out: LegalTableBlock = { type: 'table', headers, rows }
  const heading = optionalHeading(raw.heading, `${path}.heading`)
  if (heading !== undefined) out.heading = heading
  assertNoForbiddenKeys(out as unknown as Record<string, unknown>, TABLE_OUT, path)
  return out
}

function canonicalizeOperator(raw: Record<string, unknown>, path: string): LegalOperatorBlock {
  assertRawKeys(raw, OPERATOR_RAW, path)
  const fields = ['role_label', 'legal_name', 'ogrn', 'inn', 'address', 'email'] as const
  const out: LegalOperatorBlock = {
    type: 'operator',
    role_label: '',
    legal_name: '',
    ogrn: '',
    inn: '',
    address: '',
    email: '',
  }
  for (const field of fields) {
    assertNonEmptyString(raw[field], `${path}.${field}`)
    out[field] = raw[field]
  }
  const heading = optionalHeading(raw.heading, `${path}.heading`)
  if (heading !== undefined) out.heading = heading
  assertNoForbiddenKeys(out as unknown as Record<string, unknown>, OPERATOR_OUT, path)
  return out
}

function resolveBlockType(raw: Record<string, unknown>, path: string): (typeof LEGAL_BLOCK_TYPES)[number] {
  if (typeof raw.type === 'string' && (LEGAL_BLOCK_TYPES as readonly string[]).includes(raw.type)) {
    return raw.type as (typeof LEGAL_BLOCK_TYPES)[number]
  }
  if (typeof raw.__component === 'string') {
    const mapped = COMPONENT_TO_BLOCK_TYPE[raw.__component]
    if (mapped) return mapped
    fail(path, `unknown block component "${raw.__component}"`)
  }
  fail(path, `unknown block type "${raw.type}"`)
}

export function canonicalizeBlock(raw: unknown, path: string): LegalBlock {
  if (!isPlainObject(raw)) fail(path, 'block must be object')
  if ('data-label' in raw || 'data_label' in raw) {
    fail(path, 'data-label must not appear in CMS/feed')
  }
  const type = resolveBlockType(raw, path)
  const withoutComponent: Record<string, unknown> = { ...raw }
  delete withoutComponent.__component
  if (!withoutComponent.type) withoutComponent.type = type

  if (type === 'paragraph') return canonicalizeParagraph(withoutComponent, path)
  if (type === 'list') return canonicalizeList(withoutComponent, path)
  if (type === 'table') return canonicalizeTable(withoutComponent, path)
  if (type === 'operator') return canonicalizeOperator(withoutComponent, path)
  fail(path, `unknown block type "${type}"`)
}

export function canonicalizeLegalPageData(entry: unknown): LegalPageData {
  if (!isPlainObject(entry)) fail('data', 'must be object')

  for (const key of Object.keys(entry)) {
    if (STRAPI_META_KEYS.has(key)) fail('data', `forbidden meta field "${key}"`)
    if (!ROOT_ALLOWED.has(key)) fail('data', `unknown root field "${key}"`)
  }

  assertNonEmptyString(entry.title, 'data.title')
  if (typeof entry.effective_date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(entry.effective_date)) {
    fail('data.effective_date', 'ISO date string required (YYYY-MM-DD)')
  }
  if (!Array.isArray(entry.body)) fail('data.body', 'ordered body array required')
  if (entry.body.length === 0) fail('data.body', 'non-empty body array required')

  const body = entry.body.map((block, i) => canonicalizeBlock(block, `data.body[${i}]`))
  return {
    title: entry.title,
    effective_date: entry.effective_date.slice(0, 10),
    body,
  }
}
