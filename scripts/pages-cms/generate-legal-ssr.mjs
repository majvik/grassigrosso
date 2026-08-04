#!/usr/bin/env node
/**
 * Deterministic legal SSR HTML generator (Phase 6D).
 *
 * Reads structured defaults → canonicalize → emit full `.legal-page` section
 * between markers in privacy.html / terms.html / cookies.html.
 *
 * Usage:
 *   node scripts/pages-cms/generate-legal-ssr.mjs           # write
 *   node scripts/pages-cms/generate-legal-ssr.mjs --check   # drift check, exit 1
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

const {
  canonicalizeLegalPageData,
  LEGAL_HREF_ALLOWLIST,
} = require(path.join(root, 'strapi-catalog/src/api/pages-cms/utils/legal-page-contract.js'))
const { LEGAL_PAGES_CMS_SLUGS } = require(
  path.join(root, 'strapi-catalog/src/api/pages-cms/utils/legal-allowlist.js'),
)

const MARKER_START = '<!-- pages-cms:legal-ssr:start -->'
const MARKER_END = '<!-- pages-cms:legal-ssr:end -->'
const DATE_PREFIX = 'Дата последнего обновления:'
const ALLOWED_MAILTO_EMAIL = 'office@grassigrosso.com'
const SECTION_INDENT = '      '
const INNER_INDENT = '        '
const CONTENT_INDENT = '          '
const BLOCK_INDENT = '            '
const LI_INDENT = '              '
const CELL_INDENT = '                  '

const defaultsDir = path.join(root, 'src/pages/legal-defaults')

/** @param {string} s */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Format YYYY-MM-DD → DD.MM.YYYY without Date timezone parsing.
 * @param {string} iso
 */
export function formatEffectiveDateDisplay(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) throw new Error(`invalid effective_date: ${JSON.stringify(iso)}`)
  const [, y, mo, d] = m
  const yi = Number(y)
  const mi = Number(mo)
  const di = Number(d)
  if (mi < 1 || mi > 12 || di < 1 || di > 31) {
    throw new Error(`invalid calendar date: ${iso}`)
  }
  // Basic calendar sanity (month lengths; leap years for Feb)
  const dim = [31, yi % 4 === 0 && (yi % 100 !== 0 || yi % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (di > dim[mi - 1]) throw new Error(`invalid calendar date: ${iso}`)
  return `${d}.${mo}.${y}`
}

/**
 * @param {string} href
 */
function assertAllowlistedHref(href) {
  if (!LEGAL_HREF_ALLOWLIST.includes(href)) {
    throw new Error(`href not allowlisted for SSR: ${JSON.stringify(href)}`)
  }
}

/**
 * @param {object[]} runs
 */
function renderRuns(runs) {
  let out = ''
  for (const run of runs) {
    if (run.type === 'text') {
      const escaped = escapeHtml(run.value)
      out += run.strong ? `<strong>${escaped}</strong>` : escaped
      continue
    }
    if (run.type === 'link') {
      assertAllowlistedHref(run.href)
      const label = (run.children || []).map((c) => escapeHtml(c.value)).join('')
      out += `<a href="${escapeHtml(run.href)}">${label}</a>`
      continue
    }
    throw new Error(`unknown run type: ${run && run.type}`)
  }
  return out
}

/**
 * @param {object} block
 */
function renderOperatorParagraph(block) {
  const email = block.email
  if (email !== ALLOWED_MAILTO_EMAIL) {
    throw new Error(`operator email not allowlisted for mailto: ${JSON.stringify(email)}`)
  }
  const mailto = `mailto:${email}`
  assertAllowlistedHref(mailto)
  const parts = [
    `${escapeHtml(block.role_label)}: ${escapeHtml(block.legal_name)}`,
    `ОГРН ${escapeHtml(block.ogrn)}`,
    `ИНН ${escapeHtml(block.inn)}`,
    `адрес: ${escapeHtml(block.address)}`,
    `<a href="${escapeHtml(mailto)}">${escapeHtml(email)}</a>`,
  ]
  return `<p>${parts.join(', ')}</p>`
}

/**
 * @param {object} block
 */
function renderBlock(block) {
  const lines = []
  if (block.heading) {
    lines.push(`${BLOCK_INDENT}<h2>${escapeHtml(block.heading)}</h2>`)
  }
  if (block.type === 'paragraph') {
    lines.push(`${BLOCK_INDENT}<p>${renderRuns(block.runs)}</p>`)
    return lines.join('\n')
  }
  if (block.type === 'operator') {
    lines.push(`${BLOCK_INDENT}${renderOperatorParagraph(block)}`)
    return lines.join('\n')
  }
  if (block.type === 'list') {
    lines.push(`${BLOCK_INDENT}<ul>`)
    for (const item of block.items) {
      lines.push(`${LI_INDENT}<li>${renderRuns(item.runs)}</li>`)
    }
    lines.push(`${BLOCK_INDENT}</ul>`)
    return lines.join('\n')
  }
  if (block.type === 'table') {
    lines.push(`${BLOCK_INDENT}<div class="legal-table-wrap">`)
    lines.push(`${LI_INDENT}<table class="legal-table">`)
    lines.push(`${LI_INDENT}  <thead>`)
    lines.push(`${LI_INDENT}    <tr>`)
    for (const header of block.headers) {
      lines.push(`${LI_INDENT}      <th>${escapeHtml(header)}</th>`)
    }
    lines.push(`${LI_INDENT}    </tr>`)
    lines.push(`${LI_INDENT}  </thead>`)
    lines.push(`${LI_INDENT}  <tbody>`)
    for (const row of block.rows) {
      lines.push(`${LI_INDENT}    <tr>`)
      row.cells.forEach((cell, i) => {
        const label = block.headers[i]
        lines.push(
          `${CELL_INDENT}<td data-label="${escapeHtml(label)}">${renderRuns(cell.runs)}</td>`,
        )
      })
      lines.push(`${LI_INDENT}    </tr>`)
    }
    lines.push(`${LI_INDENT}  </tbody>`)
    lines.push(`${LI_INDENT}</table>`)
    lines.push(`${BLOCK_INDENT}</div>`)
    return lines.join('\n')
  }
  throw new Error(`unknown block type: ${block && block.type}`)
}

/**
 * Render full legal SSR section HTML (without markers).
 * @param {{ title: string, effective_date: string, body: object[] }} data
 */
export function renderLegalSsrHtml(data) {
  const canonical = canonicalizeLegalPageData(data)
  const dateText = `${DATE_PREFIX} ${formatEffectiveDateDisplay(canonical.effective_date)}`
  const bodyHtml = canonical.body.map((b) => renderBlock(b)).join('\n')
  return [
    `${SECTION_INDENT}<section class="legal-page">`,
    `${INNER_INDENT}<div class="legal-page-inner">`,
    `${CONTENT_INDENT}<h1 class="legal-page-title">${escapeHtml(canonical.title)}</h1>`,
    `${CONTENT_INDENT}<p class="legal-page-date">${escapeHtml(dateText)}</p>`,
    `${CONTENT_INDENT}<div class="legal-page-content">`,
    bodyHtml,
    `${CONTENT_INDENT}</div>`,
    `${INNER_INDENT}</div>`,
    `${SECTION_INDENT}</section>`,
  ].join('\n')
}

/**
 * @param {string} fileHtml
 * @param {string} sectionHtml
 */
/**
 * Build marked region with the same indent as the surrounding main content.
 * @param {string} sectionHtml
 * @param {string} [indent]
 */
function wrapMarkedRegion(sectionHtml, indent = SECTION_INDENT) {
  return `${indent}${MARKER_START}\n${sectionHtml}\n${indent}${MARKER_END}`
}

/**
 * Expand startIdx backward over leading spaces on the same line.
 * @param {string} fileHtml
 * @param {number} idx
 */
function lineIndentStart(fileHtml, idx) {
  let i = idx
  while (i > 0 && (fileHtml[i - 1] === ' ' || fileHtml[i - 1] === '\t')) i -= 1
  return i
}

export function applyLegalSsrRegion(fileHtml, sectionHtml) {
  const startIdx = fileHtml.indexOf(MARKER_START)
  const endIdx = fileHtml.indexOf(MARKER_END)
  if (startIdx >= 0 && endIdx > startIdx) {
    const replaceFrom = lineIndentStart(fileHtml, startIdx)
    const indent = fileHtml.slice(replaceFrom, startIdx) || SECTION_INDENT
    const afterEnd = endIdx + MARKER_END.length
    // Drop trailing spaces after end marker on the same line
    let after = afterEnd
    while (after < fileHtml.length && (fileHtml[after] === ' ' || fileHtml[after] === '\t')) after += 1
    const region = wrapMarkedRegion(sectionHtml, indent)
    return fileHtml.slice(0, replaceFrom) + region + fileHtml.slice(after)
  }
  if (startIdx >= 0 || endIdx >= 0) {
    throw new Error('broken legal SSR markers (start/end mismatch)')
  }

  // First run: wrap/replace existing <section class="legal-page">…</section>
  const openRe = /<section\b[^>]*\bclass=(["'])[^"']*\blegal-page\b[^"']*\1[^>]*>/
  const openMatch = fileHtml.match(openRe)
  if (!openMatch || openMatch.index == null) {
    throw new Error('no <section class="legal-page"> found and no markers present')
  }
  const openStart = openMatch.index
  const replaceFrom = lineIndentStart(fileHtml, openStart)
  const indent = fileHtml.slice(replaceFrom, openStart) || SECTION_INDENT
  const openEnd = openStart + openMatch[0].length
  // Find matching close with depth walk
  let depth = 1
  let i = openEnd
  let closeStart = -1
  while (i < fileHtml.length) {
    const nextOpen = fileHtml.indexOf('<section', i)
    const nextClose = fileHtml.indexOf('</section>', i)
    if (nextClose < 0) break
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1
      i = nextOpen + 8
      continue
    }
    depth -= 1
    if (depth === 0) {
      closeStart = nextClose
      break
    }
    i = nextClose + '</section>'.length
  }
  if (closeStart < 0) throw new Error('unclosed legal-page section')
  const closeEnd = closeStart + '</section>'.length
  const region = wrapMarkedRegion(sectionHtml, indent)
  return fileHtml.slice(0, replaceFrom) + region + fileHtml.slice(closeEnd)
}

/**
 * @param {string} slug
 */
export function loadLegalDefaults(slug) {
  const filePath = path.join(defaultsDir, `${slug}.json`)
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return canonicalizeLegalPageData(raw)
}

/**
 * @param {string} slug
 * @param {{ checkOnly?: boolean }} [opts]
 */
export function generateLegalSsrForSlug(slug, opts = {}) {
  const checkOnly = Boolean(opts.checkOnly)
  const data = loadLegalDefaults(slug)
  const sectionHtml = renderLegalSsrHtml(data)
  const htmlPath = path.join(root, `${slug}.html`)
  const current = fs.readFileSync(htmlPath, 'utf8')
  const next = applyLegalSsrRegion(current, sectionHtml)
  if (checkOnly) {
    return { slug, htmlPath, changed: next !== current, next, current }
  }
  if (next !== current) {
    fs.writeFileSync(htmlPath, next)
  }
  return { slug, htmlPath, changed: next !== current, next, current }
}

function main() {
  const checkOnly = process.argv.includes('--check')
  /** @type {string[]} */
  const failures = []
  for (const slug of LEGAL_PAGES_CMS_SLUGS) {
    try {
      const result = generateLegalSsrForSlug(slug, { checkOnly })
      if (checkOnly) {
        if (result.changed) {
          failures.push(`${slug}: SSR drift vs defaults (run without --check to write)`)
        } else {
          console.log(`${slug}: SSR --check OK`)
        }
      } else {
        console.log(`${slug}: ${result.changed ? 'wrote' : 'unchanged'} ${path.relative(root, result.htmlPath)}`)
      }
    } catch (err) {
      failures.push(`${slug}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  if (failures.length) {
    console.error('generate-legal-ssr FAILED')
    for (const f of failures) console.error(` - ${f}`)
    process.exit(1)
  }
  if (checkOnly) console.log('generate-legal-ssr --check PASS')
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main()
}
