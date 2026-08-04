#!/usr/bin/env node
/**
 * Legal fixtures ↔ structured defaults parity (Phase 6D).
 *
 * Primary source of truth: `src/pages/legal-defaults/{slug}.json`
 * Fixtures: `scripts/fixtures/pages-cms/{slug}.json`
 *
 * Both sides are deep-equal after canonicalizeLegalPageData (CJS contract).
 * Does NOT parse JSX / LEGAL_PAGES ReactNode sources.
 *
 * Usage:
 *   node scripts/pages-cms/extract-legal-fixtures.mjs            # write fixtures from defaults
 *   node scripts/pages-cms/extract-legal-fixtures.mjs --write    # same
 *   node scripts/pages-cms/extract-legal-fixtures.mjs --check    # parity only
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
const defaultsDir = path.join(root, 'src/pages/legal-defaults')
const fixturesDir = path.join(root, 'scripts/fixtures/pages-cms')

const {
  canonicalizeLegalPageData,
} = require(path.join(root, 'strapi-catalog/src/api/pages-cms/utils/legal-page-contract.js'))
const { LEGAL_BODY_LENGTH_BY_SLUG, LEGAL_PAGES_CMS_SLUGS } =
  require(path.join(root, 'strapi-catalog/src/api/pages-cms/utils/legal-allowlist.js'))

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function loadCanonicalDefaults(slug) {
  const defaultsPath = path.join(defaultsDir, `${slug}.json`)
  if (!fs.existsSync(defaultsPath)) {
    throw new Error(`missing defaults ${defaultsPath}`)
  }
  return canonicalizeLegalPageData(loadJson(defaultsPath))
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

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function main() {
  const checkOnly = process.argv.includes('--check')
  const writeRequested =
    process.argv.includes('--write') || (!checkOnly && !process.argv.includes('--check'))
  /** @type {string[]} */
  const failures = []

  for (const slug of LEGAL_PAGES_CMS_SLUGS) {
    let defaults
    try {
      defaults = loadCanonicalDefaults(slug)
    } catch (err) {
      failures.push(`${slug}: defaults canonicalize failed: ${err.message}`)
      continue
    }

    const stats = fixtureStats(defaults)
    if (stats.bodyLength !== LEGAL_BODY_LENGTH_BY_SLUG[slug]) {
      failures.push(
        `${slug}: defaults body.length ${stats.bodyLength} !== ${LEGAL_BODY_LENGTH_BY_SLUG[slug]}`,
      )
    }

    const outPath = path.join(fixturesDir, `${slug}.json`)
    const serialized = stableStringify(defaults)

    if (checkOnly) {
      if (!fs.existsSync(outPath)) {
        failures.push(`${slug}: missing fixture ${outPath}`)
        continue
      }
      let onDisk
      try {
        onDisk = canonicalizeLegalPageData(loadJson(outPath))
      } catch (err) {
        failures.push(`${slug}: fixture canonicalize failed: ${err.message}`)
        continue
      }
      if (!deepEqual(defaults, onDisk)) {
        failures.push(`${slug}: defaults ↔ fixture drift after canonicalize`)
      }
      // Also require stable formatting match when semantically equal
      const diskRaw = fs.readFileSync(outPath, 'utf8')
      if (diskRaw !== serialized && deepEqual(defaults, onDisk)) {
        failures.push(`${slug}: fixture formatting drift vs canonical defaults serialization`)
      }
    } else if (writeRequested) {
      fs.mkdirSync(fixturesDir, { recursive: true })
      fs.writeFileSync(outPath, serialized)
      console.log(
        `wrote ${slug}.json from defaults body=${stats.bodyLength} headings=${stats.headings} lists=${stats.lists} tables=${stats.tables} ops=${stats.operators}`,
      )
    }
  }

  if (failures.length) {
    console.error('extract-legal-fixtures FAILED')
    for (const f of failures) console.error(` - ${f}`)
    process.exit(1)
  }
  if (checkOnly) console.log('extract-legal-fixtures --check PASS (defaults ↔ fixtures)')
}

main()
