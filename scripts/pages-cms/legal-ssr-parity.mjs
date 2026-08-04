#!/usr/bin/env node
/**
 * Legal SSR semantic parity helpers (Phase 6D).
 *
 * Compares structured defaults ↔ fixtures ↔ SSR DOM (between markers).
 *
 * Usage:
 *   node scripts/pages-cms/legal-ssr-parity.mjs --check
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  applyLegalSsrRegion,
  formatEffectiveDateDisplay,
  loadLegalDefaults,
  renderLegalSsrHtml,
} from './generate-legal-ssr.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

const {
  canonicalizeLegalPageData,
  LEGAL_HREF_ALLOWLIST,
} = require(path.join(root, 'strapi-catalog/src/api/pages-cms/utils/legal-page-contract.js'))
const { LEGAL_PAGES_CMS_SLUGS, LEGAL_BODY_LENGTH_BY_SLUG } = require(
  path.join(root, 'strapi-catalog/src/api/pages-cms/utils/legal-allowlist.js'),
)

const MARKER_START = '<!-- pages-cms:legal-ssr:start -->'
const MARKER_END = '<!-- pages-cms:legal-ssr:end -->'
const DATE_PREFIX = 'Дата последнего обновления:'
const fixturesDir = path.join(root, 'scripts/fixtures/pages-cms')

/**
 * @param {string} html
 */
export function extractLegalSsrRegion(html) {
  const startIdx = html.indexOf(MARKER_START)
  const endIdx = html.indexOf(MARKER_END)
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) {
    throw new Error('legal SSR markers missing or broken')
  }
  return html.slice(startIdx + MARKER_START.length, endIdx).trim()
}

/** @param {string} s */
function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/** @param {string} s */
function stripTags(s) {
  return decodeEntities(String(s).replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse inline runs from a fragment (p/li/td inner HTML).
 * @param {string} innerHtml
 */
export function parseInlineRunsFromHtml(innerHtml) {
  /** @type {object[]} */
  const runs = []
  const re = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>|<strong>([\s\S]*?)<\/strong>|([^<]+)/g
  let m
  while ((m = re.exec(innerHtml))) {
    if (m[1] != null) {
      const href = decodeEntities(m[1])
      const label = stripTags(m[2])
      if (!label) continue
      runs.push({
        type: 'link',
        href,
        children: [{ type: 'text', value: label, strong: false }],
      })
    } else if (m[3] != null) {
      const value = stripTags(m[3])
      if (!value) continue
      runs.push({ type: 'text', value, strong: true })
    } else if (m[4] != null) {
      const value = decodeEntities(m[4].replace(/\s+/g, ' '))
      if (value.trim() === '') continue
      runs.push({ type: 'text', value, strong: false })
    }
  }
  if (runs.length === 0) {
    const plain = stripTags(innerHtml)
    if (plain) runs.push({ type: 'text', value: plain, strong: false })
  }
  return runs
}

/**
 * @param {string} preview
 */
function isOperatorParagraph(preview) {
  return preview.includes('ОГРН') && preview.includes('ИНН')
}

/**
 * @param {string} preview
 */
export function parseOperatorFieldsFromText(preview) {
  const text = preview.replace(/\s+/g, ' ').trim()
  const roleMatch = text.match(/^(.+?):\s*/)
  const ogrnMatch = text.match(/ОГРН\s+(\S+)/)
  const innMatch = text.match(/ИНН\s+(\S+)/)
  const emailMatch = text.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)
  const legalName = (() => {
    const m = text.match(/^[^:]+:\s*(.+?),\s*ОГРН\s+/)
    return m ? m[1].trim() : ''
  })()
  const address = (() => {
    const m = text.match(/адрес:\s*(.+?),\s*[A-Z0-9._%+-]+@/i)
    return m ? m[1].trim() : ''
  })()
  return {
    type: 'operator',
    role_label: roleMatch ? roleMatch[1].trim() : '',
    legal_name: legalName,
    ogrn: ogrnMatch ? ogrnMatch[1].replace(/,$/, '') : '',
    inn: innMatch ? innMatch[1].replace(/,$/, '') : '',
    address,
    email: emailMatch ? emailMatch[1] : '',
  }
}

/**
 * Walk legal-page-content body into ordered tokens.
 * @param {string} body
 */
function walkContentTokens(body) {
  const tokens = []
  let i = 0
  while (i < body.length) {
    if (/^<div\b[^>]*\blegal-table-wrap\b/.test(body.slice(i))) {
      const endDiv = body.indexOf('</div>', i)
      if (endDiv < 0) break
      const chunk = body.slice(i, endDiv)
      const headers = [...chunk.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((x) => stripTags(x[1]))
      const rows = []
      for (const tr of chunk.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)) {
        const cells = [...tr[0].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)].map((c) => {
          const attrs = c[1] || ''
          const labelM = attrs.match(/data-label="([^"]*)"/)
          return {
            runs: parseInlineRunsFromHtml(c[2]),
            dataLabel: labelM ? decodeEntities(labelM[1]) : null,
          }
        })
        if (cells.length === 0) continue
        rows.push({ cells })
      }
      tokens.push({ tag: 'table', headers, rows })
      i = endDiv + '</div>'.length
      continue
    }
    const open = body.slice(i).match(/^<(h2|p|ul)\b[^>]*>/)
    if (!open) {
      i += 1
      continue
    }
    const tag = open[1]
    const start = i + open[0].length
    const close = `</${tag}>`
    let depth = 1
    let j = start
    const openRe = new RegExp(`<${tag}\\b`)
    while (j < body.length && depth > 0) {
      const nextOpen = body.slice(j).search(openRe)
      const nextClose = body.indexOf(close, j)
      if (nextClose < 0) break
      const absOpen = nextOpen >= 0 ? j + nextOpen : -1
      if (absOpen >= 0 && absOpen < nextClose) {
        depth += 1
        j = absOpen + 1
      } else {
        depth -= 1
        if (depth === 0) {
          tokens.push({ tag, inner: body.slice(start, nextClose) })
          i = nextClose + close.length
          break
        }
        j = nextClose + close.length
      }
    }
    if (depth !== 0) i += 1
  }
  return tokens
}

/**
 * Parse SSR region into canonical LegalPageData (+ table data-labels for checks).
 * @param {string} regionHtml
 */
export function parseLegalSsrToData(regionHtml) {
  const titleM = regionHtml.match(/<h1\b[^>]*\blegal-page-title\b[^>]*>([\s\S]*?)<\/h1>/)
  const dateM = regionHtml.match(/<p\b[^>]*\blegal-page-date\b[^>]*>([\s\S]*?)<\/p>/)
  const contentM = regionHtml.match(
    /<div\b[^>]*\blegal-page-content\b[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/,
  )
  if (!titleM || !dateM || !contentM) {
    throw new Error('SSR region missing title/date/content slots')
  }
  const title = stripTags(titleM[1])
  const dateText = stripTags(dateM[1])
  if (!dateText.startsWith(DATE_PREFIX)) {
    throw new Error(`date missing code prefix: ${JSON.stringify(dateText)}`)
  }
  const dm = dateText.slice(DATE_PREFIX.length).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!dm) throw new Error(`unparseable date display: ${JSON.stringify(dateText)}`)
  const effective_date = `${dm[3]}-${dm[2]}-${dm[1]}`

  const tokens = walkContentTokens(contentM[1])
  /** @type {object[]} */
  const body = []
  let pendingHeading = null

  for (const tok of tokens) {
    if (tok.tag === 'h2') {
      pendingHeading = stripTags(tok.inner)
      continue
    }
    if (tok.tag === 'p') {
      const preview = stripTags(tok.inner)
      if (isOperatorParagraph(preview)) {
        const op = parseOperatorFieldsFromText(preview)
        if (pendingHeading) {
          op.heading = pendingHeading
          pendingHeading = null
        }
        body.push(op)
        continue
      }
      const block = { type: 'paragraph', runs: parseInlineRunsFromHtml(tok.inner) }
      if (pendingHeading) {
        block.heading = pendingHeading
        pendingHeading = null
      }
      body.push(block)
      continue
    }
    if (tok.tag === 'ul') {
      const items = [...tok.inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((li) => ({
        runs: parseInlineRunsFromHtml(li[1]),
      }))
      const block = { type: 'list', items }
      if (pendingHeading) {
        block.heading = pendingHeading
        pendingHeading = null
      }
      body.push(block)
      continue
    }
    if (tok.tag === 'table') {
      const block = {
        type: 'table',
        headers: tok.headers,
        rows: tok.rows.map((r) => ({
          cells: r.cells.map((c) => ({ runs: c.runs })),
        })),
      }
      if (pendingHeading) {
        block.heading = pendingHeading
        pendingHeading = null
      }
      body.push(block)
    }
  }
  if (pendingHeading) throw new Error(`orphan heading in SSR: ${pendingHeading}`)

  const data = canonicalizeLegalPageData({ title, effective_date, body })
  return { data, dateText }
}

/**
 * Stable semantic fingerprint for comparisons / diffs.
 * @param {object} data
 */
export function legalSemanticTokens(data) {
  const canonical = canonicalizeLegalPageData(data)
  return {
    title: canonical.title,
    effective_date: canonical.effective_date,
    bodyLength: canonical.body.length,
    headings: canonical.body.map((b) => b.heading || null),
    blockTypes: canonical.body.map((b) => b.type),
    paragraphs: canonical.body
      .filter((b) => b.type === 'paragraph')
      .map((b) => ({ heading: b.heading || null, runs: b.runs })),
    lists: canonical.body
      .filter((b) => b.type === 'list')
      .map((b) => ({
        heading: b.heading || null,
        items: b.items.map((it) => it.runs),
      })),
    strongSpans: collectStrong(canonical),
    links: collectLinks(canonical),
    operators: canonical.body.filter((b) => b.type === 'operator').map((b) => ({
      role_label: b.role_label,
      legal_name: b.legal_name,
      ogrn: b.ogrn,
      inn: b.inn,
      address: b.address,
      email: b.email,
      heading: b.heading || null,
    })),
    tables: canonical.body
      .filter((b) => b.type === 'table')
      .map((b) => ({
        heading: b.heading || null,
        headers: b.headers,
        rows: b.rows.map((r) => r.cells.map((c) => c.runs)),
      })),
    counts: {
      body: canonical.body.length,
      headings: canonical.body.filter((b) => b.heading).length,
      paragraphs: canonical.body.filter((b) => b.type === 'paragraph').length,
      lists: canonical.body.filter((b) => b.type === 'list').length,
      tables: canonical.body.filter((b) => b.type === 'table').length,
      operators: canonical.body.filter((b) => b.type === 'operator').length,
    },
  }
}

/** @param {object} data */
function collectStrong(data) {
  /** @type {string[]} */
  const out = []
  const walkRuns = (runs) => {
    for (const r of runs || []) {
      if (r.type === 'text' && r.strong) out.push(r.value)
      if (r.type === 'link') walkRuns(r.children)
    }
  }
  for (const b of data.body) {
    if (b.type === 'paragraph') walkRuns(b.runs)
    if (b.type === 'list') for (const it of b.items) walkRuns(it.runs)
    if (b.type === 'table') {
      for (const row of b.rows) for (const cell of row.cells) walkRuns(cell.runs)
    }
  }
  return out
}

/** @param {object} data */
function collectLinks(data) {
  /** @type {{ href: string, label: string }[]} */
  const out = []
  const walkRuns = (runs) => {
    for (const r of runs || []) {
      if (r.type === 'link') {
        out.push({
          href: r.href,
          label: (r.children || []).map((c) => c.value).join(''),
        })
        walkRuns(r.children)
      }
    }
  }
  for (const b of data.body) {
    if (b.type === 'paragraph') walkRuns(b.runs)
    if (b.type === 'list') for (const it of b.items) walkRuns(it.runs)
    if (b.type === 'table') {
      for (const row of b.rows) for (const cell of row.cells) walkRuns(cell.runs)
    }
    if (b.type === 'operator' && b.email) {
      out.push({ href: `mailto:${b.email}`, label: b.email })
    }
  }
  return out
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Validate every table cell data-label equals headers[i].
 * @param {string} region
 * @param {object} data
 * @param {string} slug
 */
function checkDataLabels(region, data, slug) {
  /** @type {string[]} */
  const failures = []
  const tables = data.body.filter((b) => b.type === 'table')
  const wrapMatches = [...region.matchAll(/<div class="legal-table-wrap">([\s\S]*?)<\/div>/g)]
  tables.forEach((block, tableIdx) => {
    const wrap = wrapMatches[tableIdx]
    if (!wrap) {
      failures.push(`${slug}: missing table wrap #${tableIdx}`)
      return
    }
    const rows = [...wrap[1].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].filter((tr) => /<td\b/.test(tr[0]))
    rows.forEach((tr, ri) => {
      const cells = [...tr[0].matchAll(/<td\b([^>]*)>/g)]
      cells.forEach((c, ci) => {
        const labelM = (c[1] || '').match(/data-label="([^"]*)"/)
        const label = labelM ? decodeEntities(labelM[1]) : null
        if (label !== block.headers[ci]) {
          failures.push(
            `${slug}: table[${tableIdx}] row ${ri} cell ${ci} data-label ${JSON.stringify(label)} ≠ header ${JSON.stringify(block.headers[ci])}`,
          )
        }
      })
    })
  })
  return failures
}

/**
 * Compare defaults ↔ fixtures ↔ SSR for one slug.
 * @param {string} slug
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function checkLegalSsrParityForSlug(slug) {
  /** @type {string[]} */
  const failures = []
  const defaults = loadLegalDefaults(slug)
  const fixturePath = path.join(fixturesDir, `${slug}.json`)
  if (!fs.existsSync(fixturePath)) {
    failures.push(`${slug}: missing fixture`)
    return { ok: false, failures }
  }
  const fixture = canonicalizeLegalPageData(JSON.parse(fs.readFileSync(fixturePath, 'utf8')))

  if (!deepEqual(legalSemanticTokens(defaults), legalSemanticTokens(fixture))) {
    failures.push(`${slug}: defaults ≠ fixtures (semantic)`)
  }
  if (defaults.body.length !== LEGAL_BODY_LENGTH_BY_SLUG[slug]) {
    failures.push(
      `${slug}: defaults body.length ${defaults.body.length} ≠ ${LEGAL_BODY_LENGTH_BY_SLUG[slug]}`,
    )
  }

  const htmlPath = path.join(root, `${slug}.html`)
  const html = fs.readFileSync(htmlPath, 'utf8')
  let parsed
  let region
  try {
    region = extractLegalSsrRegion(html)
    parsed = parseLegalSsrToData(region)
  } catch (err) {
    failures.push(`${slug}: SSR parse failed: ${err instanceof Error ? err.message : String(err)}`)
    return { ok: false, failures }
  }

  if (!deepEqual(legalSemanticTokens(defaults), legalSemanticTokens(parsed.data))) {
    failures.push(`${slug}: defaults ≠ SSR DOM (semantic)`)
    // Helpful one-line hint
    const a = legalSemanticTokens(defaults)
    const b = legalSemanticTokens(parsed.data)
    if (a.bodyLength !== b.bodyLength) {
      failures.push(`${slug}: bodyLength defaults=${a.bodyLength} ssr=${b.bodyLength}`)
    }
    if (JSON.stringify(a.blockTypes) !== JSON.stringify(b.blockTypes)) {
      failures.push(`${slug}: blockTypes differ`)
    }
    if (JSON.stringify(a.operators) !== JSON.stringify(b.operators)) {
      failures.push(`${slug}: operators differ ${JSON.stringify(a.operators)} vs ${JSON.stringify(b.operators)}`)
    }
  }

  failures.push(...checkDataLabels(region, parsed.data, slug))

  const expectedDate = `${DATE_PREFIX} ${formatEffectiveDateDisplay(defaults.effective_date)}`
  if (parsed.dateText !== expectedDate) {
    failures.push(
      `${slug}: date display ${JSON.stringify(parsed.dateText)} ≠ ${JSON.stringify(expectedDate)}`,
    )
  }

  for (const link of collectLinks(parsed.data)) {
    if (!LEGAL_HREF_ALLOWLIST.includes(link.href)) {
      failures.push(`${slug}: non-allowlisted SSR href ${JSON.stringify(link.href)}`)
    }
  }

  const tags = assertAllowedLegalSsrTags(region)
  if (!tags.ok) failures.push(`${slug}: forbidden tags ${tags.bad.join(',')}`)

  return { ok: failures.length === 0, failures }
}

/**
 * Run parity for all legal slugs.
 */
export function checkAllLegalSsrParity() {
  /** @type {string[]} */
  const failures = []
  for (const slug of LEGAL_PAGES_CMS_SLUGS) {
    const result = checkLegalSsrParityForSlug(slug)
    failures.push(...result.failures)
  }
  return { ok: failures.length === 0, failures }
}

// ─── Built-in negatives (exportable for phase-6d gate) ───────────────────────

/**
 * @param {string} slug
 */
function baseRegion(slug) {
  return renderLegalSsrHtml(loadLegalDefaults(slug))
}

/** @param {string} [slug] */
export function negativeRemoveParagraph(slug = 'privacy') {
  const data = structuredClone(loadLegalDefaults(slug))
  const idx = data.body.findIndex((b) => b.type === 'paragraph')
  if (idx < 0) throw new Error('no paragraph')
  data.body.splice(idx, 1)
  return { kind: 'remove-paragraph', slug, region: renderLegalSsrHtml(data), data }
}

/** @param {string} [slug] */
export function negativeSwapBlocks(slug = 'privacy') {
  const data = structuredClone(loadLegalDefaults(slug))
  if (data.body.length < 3) throw new Error('need ≥3 blocks')
  const tmp = data.body[0]
  data.body[0] = data.body[2]
  data.body[2] = tmp
  return { kind: 'swap-blocks', slug, region: renderLegalSsrHtml(data), data }
}

/** @param {string} [slug] */
export function negativeChangeStrongBoundary(slug = 'cookies') {
  const data = structuredClone(loadLegalDefaults(slug))
  let found = false
  for (const block of data.body) {
    if (block.type !== 'list') continue
    for (const item of block.items) {
      for (const run of item.runs) {
        if (run.type === 'text' && run.strong) {
          run.strong = false
          found = true
          break
        }
      }
      if (found) break
    }
    if (found) break
  }
  if (!found) throw new Error('no strong run')
  return { kind: 'change-strong', slug, region: renderLegalSsrHtml(data), data }
}

/** @param {string} [slug] */
export function negativeChangeHref(slug = 'privacy') {
  const data = structuredClone(loadLegalDefaults(slug))
  for (const block of data.body) {
    if (block.type !== 'paragraph') continue
    for (const run of block.runs) {
      if (run.type === 'link') {
        const region = renderLegalSsrHtml(data).replace(
          `href="${run.href}"`,
          'href="https://evil.example"',
        )
        return { kind: 'change-href', slug, region, data }
      }
    }
  }
  throw new Error('no link')
}

/** @param {string} [slug] */
export function negativeChangeOperatorField(slug = 'privacy') {
  const data = structuredClone(loadLegalDefaults(slug))
  const op = data.body.find((b) => b.type === 'operator')
  if (!op) throw new Error('no operator')
  op.inn = '0000000000'
  return { kind: 'change-operator', slug, region: renderLegalSsrHtml(data), data }
}

/** @param {string} [slug] */
export function negativeRemoveTableCell(slug = 'cookies') {
  const data = structuredClone(loadLegalDefaults(slug))
  let region = renderLegalSsrHtml(data)
  region = region.replace(/<td\b[^>]*>[\s\S]*?<\/td>(?=\s*<\/tr>)/, '')
  return { kind: 'remove-table-cell', slug, region, data }
}

/** @param {string} [slug] */
export function negativeMismatchedDataLabel(slug = 'cookies') {
  const data = structuredClone(loadLegalDefaults(slug))
  let region = renderLegalSsrHtml(data)
  region = region.replace(/data-label="[^"]*"/, 'data-label="WRONG"')
  return { kind: 'mismatched-data-label', slug, region, data }
}

/** @param {string} [slug] */
export function negativeInsertRawHtmlLike(slug = 'privacy') {
  let region = baseRegion(slug)
  if (!region.includes('legal-page-content')) throw new Error('missing content')
  region = region.replace(
    /class="legal-page-content">/,
    'class="legal-page-content">\n            <p><script>alert(1)</script></p>',
  )
  return { kind: 'raw-html-like', slug, region, data: loadLegalDefaults(slug) }
}

/** @param {string} [slug] */
export function negativeRemoveSsrMarker(slug = 'privacy') {
  const section = baseRegion(slug)
  const file = fs.readFileSync(path.join(root, `${slug}.html`), 'utf8')
  let without = file
  if (without.includes(MARKER_START)) {
    without = without.replace(MARKER_START, '').replace(MARKER_END, '')
  } else {
    without = applyLegalSsrRegion(without, section)
    without = without.replace(MARKER_START, '').replace(MARKER_END, '')
  }
  return { kind: 'remove-marker', slug, fileHtml: without, region: section }
}

/** @param {string} [slug] */
export function negativeExtraSsrElement(slug = 'privacy') {
  let region = baseRegion(slug)
  region = region.replace(
    'class="legal-page-content">',
    'class="legal-page-content">\n            <div class="extra-ui">extra</div>',
  )
  return { kind: 'extra-element', slug, region, data: loadLegalDefaults(slug) }
}

/**
 * Evaluate whether a negative sample is correctly detected as FAIL.
 * @param {{ kind: string, slug: string, region?: string, fileHtml?: string, data?: object }} sample
 */
export function negativeShouldFail(sample) {
  const defaults = loadLegalDefaults(sample.slug)
  if (sample.kind === 'remove-marker') {
    try {
      extractLegalSsrRegion(sample.fileHtml)
      return false
    } catch {
      return true
    }
  }
  if (sample.kind === 'mismatched-data-label') {
    const labelFails = checkDataLabels(sample.region, defaults, sample.slug)
    return labelFails.length > 0
  }
  if (sample.kind === 'extra-element') {
    return /class="extra-ui"/.test(sample.region) || !assertAllowedLegalSsrTags(sample.region).ok
  }
  if (sample.kind === 'raw-html-like') {
    return /<script\b/.test(sample.region) || !assertAllowedLegalSsrTags(sample.region).ok
  }
  if (sample.kind === 'change-href') {
    return /evil\.example/.test(sample.region)
  }
  try {
    const parsed = parseLegalSsrToData(sample.region)
    return !deepEqual(legalSemanticTokens(defaults), legalSemanticTokens(parsed.data))
  } catch {
    return true
  }
}

/**
 * Assert every built-in negative fails parity vs defaults.
 * @returns {{ ok: boolean, failures: string[] }}
 */
export function runBuiltInParityNegatives() {
  /** @type {string[]} */
  const failures = []
  const cases = [
    negativeRemoveParagraph,
    negativeSwapBlocks,
    negativeChangeStrongBoundary,
    negativeChangeHref,
    negativeChangeOperatorField,
    negativeRemoveTableCell,
    negativeMismatchedDataLabel,
    negativeInsertRawHtmlLike,
    negativeExtraSsrElement,
    negativeRemoveSsrMarker,
  ]

  for (const fn of cases) {
    try {
      const sample = fn()
      if (!negativeShouldFail(sample)) {
        failures.push(`${fn.name}: expected FAIL, got PASS`)
      }
    } catch (err) {
      failures.push(`${fn.name}: threw ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { ok: failures.length === 0, failures }
}

/**
 * Detect forbidden tags / extra chrome inside SSR region (beyond allowlist).
 * @param {string} regionHtml
 */
export function assertAllowedLegalSsrTags(regionHtml) {
  const allowed = new Set([
    'section',
    'div',
    'h1',
    'h2',
    'p',
    'ul',
    'li',
    'a',
    'strong',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ])
  /** @type {string[]} */
  const bad = []
  for (const m of regionHtml.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b/g)) {
    const tag = m[1].toLowerCase()
    if (!allowed.has(tag)) bad.push(tag)
  }
  return { ok: bad.length === 0, bad: [...new Set(bad)] }
}

function main() {
  /** @type {string[]} */
  const failures = []

  const neg = runBuiltInParityNegatives()
  if (!neg.ok) failures.push(...neg.failures.map((f) => `negative: ${f}`))
  else console.log('legal-ssr-parity negatives PASS')

  const parity = checkAllLegalSsrParity()
  if (!parity.ok) failures.push(...parity.failures)
  else console.log('legal-ssr-parity defaults↔fixtures↔SSR PASS')

  if (failures.length) {
    console.error('legal-ssr-parity FAILED')
    for (const f of failures) console.error(` - ${f}`)
    process.exit(1)
  }
  console.log('legal-ssr-parity --check PASS')
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main()
}
