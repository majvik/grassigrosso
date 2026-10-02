#!/usr/bin/env node
/**
 * Convert accepted legal Markdown into structured legal-page defaults.
 * Does not edit the source Markdown. Presentation-only: URLs and the
 * operator mailbox become allowlisted links; edition line becomes effective_date.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sourceDir = path.join(
  root,
  'client-documents/personal-data-policy/corrected/to update',
)
const outDir = path.join(root, 'src/pages/legal-defaults')

const MONTHS = {
  января: '01',
  февраля: '02',
  марта: '03',
  апреля: '04',
  мая: '05',
  июня: '06',
  июля: '07',
  августа: '08',
  сентября: '09',
  октября: '10',
  ноября: '11',
  декабря: '12',
}

const LINK_RE = /https:\/\/grassigrosso\.com|office@grassigrosso\.com/g

const DOCX_WITHDRAWAL = '/documents/Grassigrosso-form-withdrawal-of-consent.docx'
const DOCX_REQUEST = '/documents/Grassigrosso-form-data-subject-request.docx'

function textRun(value) {
  return { type: 'text', value, strong: false }
}

function linkRun(href, label) {
  return { type: 'link', href, children: [textRun(label)] }
}

function linkify(value) {
  const runs = []
  let last = 0
  for (const match of value.matchAll(LINK_RE)) {
    const start = match.index ?? 0
    if (start > last) runs.push(textRun(value.slice(last, start)))
    const token = match[0]
    if (token.startsWith('http')) runs.push(linkRun(token, token))
    else runs.push(linkRun(`mailto:${token}`, token))
    last = start + token.length
  }
  if (last < value.length) runs.push(textRun(value.slice(last)))
  return runs.length ? runs : [textRun(value)]
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isSeparator(line) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim())
}

function parseMarkdown(markdown, { docxLinks = false } = {}) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  let title = ''
  let effectiveDate = ''
  /** @type {object[]} */
  const body = []
  let pendingHeading = null
  let i = 0

  function push(block) {
    if (pendingHeading) {
      block.heading = pendingHeading
      pendingHeading = null
    }
    body.push(block)
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      i += 1
      continue
    }
    if (trimmed.startsWith('# ')) {
      title = trimmed.slice(2).trim()
      i += 1
      continue
    }
    const edition = trimmed.match(/^Редакция от (\d{1,2}) ([а-яё]+) (\d{4}) года$/i)
    if (edition) {
      const month = MONTHS[edition[2].toLowerCase()]
      if (!month) throw new Error(`unknown month: ${edition[2]}`)
      effectiveDate = `${edition[3]}-${month}-${edition[1].padStart(2, '0')}`
      i += 1
      continue
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      pendingHeading = trimmed.replace(/^#{2,3}\s+/, '').trim()
      i += 1
      continue
    }
    if (trimmed.startsWith('|')) {
      const headers = parseTableRow(trimmed)
      i += 1
      if (i < lines.length && isSeparator(lines[i])) i += 1
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = parseTableRow(lines[i])
        rows.push({ cells: cells.map((cell) => ({ runs: linkify(cell) })) })
        i += 1
      }
      push({ type: 'table', headers, rows })
      continue
    }
    if (trimmed.startsWith('- ')) {
      const items = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push({ runs: linkify(lines[i].trim().slice(2).trim()) })
        i += 1
      }
      push({ type: 'list', items })
      continue
    }
    const paragraph = [trimmed]
    i += 1
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('- ')
    ) {
      paragraph.push(lines[i].trim())
      i += 1
    }
    push({ type: 'paragraph', runs: linkify(paragraph.join(' ')) })
  }

  if (pendingHeading) throw new Error(`orphan heading: ${pendingHeading}`)
  if (!title || !effectiveDate) throw new Error('missing title or edition date')

  if (docxLinks) {
    const anchor = body.findIndex((block) =>
      (block.runs || []).some((run) => run.type === 'text' && run.value.startsWith('7.3.')),
    )
    const downloads = {
      type: 'paragraph',
      runs: [
        linkRun(DOCX_WITHDRAWAL, 'Бланк отзыва согласия'),
        textRun('. '),
        linkRun(DOCX_REQUEST, 'Бланк запроса субъекта персональных данных'),
        textRun('.'),
      ],
    }
    if (anchor >= 0) body.splice(anchor + 1, 0, downloads)
    else body.push(downloads)
  }

  return { title, effective_date: effectiveDate, body }
}

function writeJson(name, data) {
  const file = path.join(outDir, name)
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
  const headings = data.body.filter((block) => block.heading).length
  const lists = data.body.filter((block) => block.type === 'list').length
  const tables = data.body.filter((block) => block.type === 'table')
  console.log(
    path.basename(file),
    'body',
    data.body.length,
    'headings',
    headings,
    'lists',
    lists,
    'tables',
    tables.map((table) => `${table.headers.length}x${table.rows.length}`).join(',') || 0,
  )
}

const privacy = parseMarkdown(
  fs.readFileSync(path.join(sourceDir, 'privacy.md'), 'utf8'),
  { docxLinks: true },
)
const cookies = parseMarkdown(fs.readFileSync(path.join(sourceDir, 'cookies.md'), 'utf8'))
const consent = parseMarkdown(
  fs.readFileSync(path.join(sourceDir, 'personal-data-consent.md'), 'utf8'),
)

writeJson('privacy.json', privacy)
writeJson('cookies.json', cookies)
writeJson('personal-data-consent.json', consent)
