#!/usr/bin/env node
/**
 * Extract canonical legal page fixtures from LEGAL_PAGES source (legal-content.tsx).
 * Also used as parity harness: regenerated semantics must match fixtures on disk.
 *
 * Usage:
 *   node scripts/pages-cms/extract-legal-fixtures.mjs            # write fixtures
 *   node scripts/pages-cms/extract-legal-fixtures.mjs --check     # parity only
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
const sourcePath = path.join(root, 'src/components/pages/legal-content.tsx')
const fixturesDir = path.join(root, 'scripts/fixtures/pages-cms')

const {
  canonicalizeLegalPageData,
  LegalContractError,
} = require(path.join(root, 'strapi-catalog/src/api/pages-cms/utils/legal-page-contract.js'))
const { LEGAL_BODY_LENGTH_BY_SLUG, LEGAL_PAGES_CMS_SLUGS } =
  require(path.join(root, 'strapi-catalog/src/api/pages-cms/utils/legal-allowlist.js'))

const EFFECTIVE_DATE = '2026-03-01'

const OPERATOR_BY_SLUG = Object.freeze({
  privacy: {
    role_label: 'Оператор персональных данных',
    legal_name: 'ООО «Грасси»',
    ogrn: '1239100014548',
    inn: '9102292969',
    address: 'Республика Крым, г. Симферополь, ул. Кубанская, д. 25',
    email: 'office@grassigrosso.com',
  },
  terms: {
    role_label: 'Оператор Сайта',
    legal_name: 'ООО «Грасси»',
    ogrn: '1239100014548',
    inn: '9102292969',
    address: 'Республика Крым, г. Симферополь, ул. Кубанская, д. 25',
    email: 'office@grassigrosso.com',
  },
})

function stripTags(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractPage(text, name) {
  const pat = new RegExp(`${name}:\\s*\\{[\\s\\S]*?content:\\s*\\(<>([\\s\\S]*?)</>\\),`)
  const m = text.match(pat)
  if (!m) throw new Error(`page ${name} not found`)
  const titleM = text.slice(text.indexOf(`${name}:`)).match(/title:\s*`([^`]*)`/)
  return { body: m[1], title: titleM ? titleM[1] : name }
}

function parseInlineRuns(innerHtml) {
  /** @type {object[]} */
  const runs = []
  const re = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<strong>([\s\S]*?)<\/strong>|([^<]+)/g
  let m
  while ((m = re.exec(innerHtml))) {
    if (m[1] != null) {
      const label = stripTags(m[2])
      if (!label) continue
      runs.push({
        type: 'link',
        href: m[1],
        children: [{ type: 'text', value: label, strong: false }],
      })
    } else if (m[3] != null) {
      const value = stripTags(m[3])
      if (!value) continue
      runs.push({ type: 'text', value, strong: true })
    } else if (m[4] != null) {
      // Preserve intentional spaces around tags; collapse only internal multi-space
      const value = m[4].replace(/\s+/g, ' ')
      if (value.length === 0) continue
      // Skip pure whitespace-only runs that are only newlines from formatting
      if (value.trim() === '' && !value.includes(' ')) continue
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

function isOperatorParagraph(preview, slug) {
  if (slug === 'cookies') return false
  return preview.includes('ОГРН') && preview.includes('ИНН')
}

function walkTokens(body) {
  const tokens = []
  let i = 0
  while (i < body.length) {
    if (body.startsWith('<div className="legal-table-wrap">', i)) {
      const endDiv = body.indexOf('</div>', i)
      const chunk = body.slice(i, endDiv)
      const headers = [...chunk.matchAll(/<th>([\s\S]*?)<\/th>/g)].map((x) => stripTags(x[1]))
      const rows = []
      for (const tr of chunk.matchAll(/<tr>[\s\S]*?<\/tr>/g)) {
        const cells = [...tr[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((c) => ({
          runs: parseInlineRuns(c[1]),
        }))
        if (cells.length === 0) continue // header row
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
          const inner = body.slice(start, nextClose)
          tokens.push({ tag, inner })
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

function tokensToBody(tokens, slug) {
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
      if (isOperatorParagraph(preview, slug)) {
        const op = { type: 'operator', ...OPERATOR_BY_SLUG[slug] }
        // heading attaches to first content after h2 — operator may carry it if first
        if (pendingHeading) {
          // Contract: operator usually has no heading; attach heading to previous? 
          // Matrix: §1.2 operator has NO heading; heading is on §1.1 paragraph.
          // So if we see operator with pending heading, that's a bug — heading should already be consumed.
          // Keep without heading.
        }
        body.push(op)
        pendingHeading = null
        continue
      }
      const block = { type: 'paragraph', runs: parseInlineRuns(tok.inner) }
      if (pendingHeading) {
        block.heading = pendingHeading
        pendingHeading = null
      }
      body.push(block)
      continue
    }
    if (tok.tag === 'ul') {
      const items = [...tok.inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => ({
        runs: parseInlineRuns(li[1]),
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
      const block = { type: 'table', headers: tok.headers, rows: tok.rows }
      if (pendingHeading) {
        block.heading = pendingHeading
        pendingHeading = null
      }
      body.push(block)
    }
  }
  if (pendingHeading) {
    throw new Error(`${slug}: orphan heading ${pendingHeading}`)
  }
  return body
}

function buildFixture(slug, text) {
  const { body: raw, title } = extractPage(text, slug)
  const tokens = walkTokens(raw)
  const body = tokensToBody(tokens, slug)
  const draft = {
    title,
    effective_date: EFFECTIVE_DATE,
    body,
  }
  return canonicalizeLegalPageData(draft)
}

function fixtureStats(data) {
  const headings = data.body.filter((b) => b.heading).length
  const lists = data.body.filter((b) => b.type === 'list').length
  const tables = data.body.filter((b) => b.type === 'table')
  const operators = data.body.filter((b) => b.type === 'operator').length
  return {
    bodyLength: data.body.length,
    headings,
    lists,
    tables: tables.length,
    tableHeaders: tables.map((t) => t.headers.length),
    tableRows: tables.map((t) => t.rows.length),
    operators,
  }
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function main() {
  const checkOnly = process.argv.includes('--check')
  const text = fs.readFileSync(sourcePath, 'utf8')
  /** @type {string[]} */
  const failures = []

  for (const slug of LEGAL_PAGES_CMS_SLUGS) {
    let data
    try {
      data = buildFixture(slug, text)
    } catch (err) {
      failures.push(`${slug}: extract/canonicalize failed: ${err.message}`)
      continue
    }
    const stats = fixtureStats(data)
    if (stats.bodyLength !== LEGAL_BODY_LENGTH_BY_SLUG[slug]) {
      failures.push(
        `${slug}: body.length ${stats.bodyLength} !== ${LEGAL_BODY_LENGTH_BY_SLUG[slug]}`,
      )
    }
    const outPath = path.join(fixturesDir, `${slug}.json`)
    const serialized = stableStringify(data)
    if (checkOnly) {
      if (!fs.existsSync(outPath)) {
        failures.push(`${slug}: missing fixture ${outPath}`)
      } else {
        const onDisk = fs.readFileSync(outPath, 'utf8')
        if (onDisk !== serialized) {
          failures.push(`${slug}: fixture drift vs LEGAL_PAGES extraction`)
        }
      }
    } else {
      fs.writeFileSync(outPath, serialized)
      console.log(
        `wrote ${slug}.json body=${stats.bodyLength} headings=${stats.headings} lists=${stats.lists} tables=${stats.tables} ops=${stats.operators}`,
      )
    }
  }

  if (failures.length) {
    console.error('extract-legal-fixtures FAILED')
    for (const f of failures) console.error(` - ${f}`)
    process.exit(1)
  }
  if (checkOnly) console.log('extract-legal-fixtures --check PASS')
}

main()
