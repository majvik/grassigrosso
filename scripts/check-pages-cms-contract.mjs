#!/usr/bin/env node
/**
 * Persistent Pages CMS contract + schema harness (Phase 2 gate).
 *
 * Always validates:
 * - content-contract JSON completeness (ADM-05)
 * - Phase 1 page.* component schemas still present
 * - RU keys for Phase 1 components
 * - download-catalog-page preserves required attributes
 *
 * When Phase 2 schemas exist, additionally validates:
 * - required components / single types from contract
 * - representative fixtures under scripts/fixtures/pages-cms/ (if present)
 *
 * Usage: npm run check:pages-cms-contract
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const failures = []

function abs(...parts) {
  return path.join(root, ...parts)
}

function readJson(rel) {
  const file = abs(rel)
  if (!fs.existsSync(file)) {
    failures.push(`Missing JSON: ${rel}`)
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    failures.push(`Invalid JSON ${rel}: ${error.message}`)
    return null
  }
}

function assert(cond, message) {
  if (!cond) failures.push(message)
}

const contractRel = '.planning/phases/02-wave-1-single-types/02-content-contract.json'
const contractMdRel = '.planning/phases/02-wave-1-single-types/02-CONTENT-CONTRACT.md'
const contract = readJson(contractRel)

assert(fs.existsSync(abs(contractMdRel)), `Missing ${contractMdRel}`)

if (contract) {
  assert(Array.isArray(contract.pages) && contract.pages.length === 6, 'contract.pages must list 6 pages')
  assert(Array.isArray(contract.rows) && contract.rows.length > 0, 'contract.rows must be non-empty')
  assert(Array.isArray(contract.requiredComponents), 'contract.requiredComponents required')
  assert(Array.isArray(contract.requiredSingleTypes), 'contract.requiredSingleTypes required')

  const pagesSeen = new Set()
  for (const [index, row] of contract.rows.entries()) {
    const prefix = `rows[${index}]`
    assert(row && typeof row === 'object', `${prefix}: must be object`)
    if (!row) continue
    assert(typeof row.page === 'string' && row.page, `${prefix}: page required`)
    assert(typeof row.section === 'string' && row.section, `${prefix}: section required`)
    assert(typeof row.source === 'string' && row.source, `${prefix}: source required`)
    assert(row.ownership === 'cms' || row.ownership === 'code', `${prefix}: ownership must be cms|code`)
    pagesSeen.add(row.page)

    if (row.ownership === 'cms') {
      assert(typeof row.cms === 'string' && row.cms.trim(), `${prefix}: cms field required for cms ownership`)
      assert(!row.reason, `${prefix}: code reason must be empty for cms ownership`)
    } else {
      assert(row.cms === null || row.cms === undefined || row.cms === '', `${prefix}: cms must be null for code ownership`)
      assert(typeof row.reason === 'string' && row.reason.trim(), `${prefix}: reason required for code ownership`)
    }
  }

  for (const page of contract.pages) {
    assert(pagesSeen.has(page), `contract missing rows for page: ${page}`)
  }
}

const phase1Components = {
  'page.hero': 'strapi-catalog/src/components/page/hero.json',
  'page.section': 'strapi-catalog/src/components/page/section.json',
  'page.faq-item': 'strapi-catalog/src/components/page/faq-item.json',
  'page.list-item': 'strapi-catalog/src/components/page/list-item.json',
}

for (const [uid, rel] of Object.entries(phase1Components)) {
  const schema = readJson(rel)
  if (!schema) continue
  assert(schema.collectionName, `${rel}: collectionName required`)
  assert(schema.info?.displayName, `${rel}: info.displayName required`)
  assert(schema.attributes && Object.keys(schema.attributes).length > 0, `${rel}: attributes required`)
  if (uid === 'page.section') {
    const items = schema.attributes.items
    assert(items?.component === 'page.list-item', `${rel}: items must nest page.list-item`)
    assert(items?.repeatable === true, `${rel}: items must be repeatable`)
  }
  if (uid === 'page.hero') {
    assert(schema.attributes.image?.allowedTypes?.includes('images'), `${rel}: image must allow images`)
  }
}

const ru = readJson('strapi-catalog/src/admin/translations/ru.json')
if (ru) {
  const phase1RuNeedles = [
    'content-manager.components.page.hero.title',
    'content-manager.components.page.section.title',
    'content-manager.components.page.faq-item.question',
    'content-manager.components.page.list-item.title',
    'content-type-builder.components.page.hero.attributes.title',
    'content-type-builder.components.page.section.attributes.title',
    'content-type-builder.components.page.faq-item.attributes.question',
    'content-type-builder.components.page.list-item.attributes.title',
  ]
  for (const key of phase1RuNeedles) {
    assert(typeof ru[key] === 'string' && ru[key].trim(), `ru.json missing Phase 1 key: ${key}`)
  }
}

const downloadSchema = readJson(
  'strapi-catalog/src/api/download-catalog-page/content-types/download-catalog-page/schema.json',
)
if (downloadSchema && contract) {
  for (const attr of contract.downloadCatalogPreserveAttrs || []) {
    assert(downloadSchema.attributes?.[attr], `download-catalog-page missing preserved attr: ${attr}`)
  }
}

/** Optional Phase 2 schema assertions — only when files exist. */
function componentPathFromUid(uid) {
  const name = uid.replace(/^page\./, '')
  return `strapi-catalog/src/components/page/${name}.json`
}

function singleTypePath(uid) {
  return `strapi-catalog/src/api/${uid}/content-types/${uid}/schema.json`
}

let phase2SchemasPresent = 0
if (contract) {
  for (const uid of contract.requiredComponents) {
    const rel = componentPathFromUid(uid)
    if (!fs.existsSync(abs(rel))) continue
    phase2SchemasPresent += 1
    const schema = readJson(rel)
    if (!schema) continue
    assert(schema.info?.displayName, `${rel}: displayName required`)
    assert(schema.attributes, `${rel}: attributes required`)
  }
  for (const uid of contract.requiredSingleTypes) {
    const rel = singleTypePath(uid)
    if (!fs.existsSync(abs(rel))) continue
    phase2SchemasPresent += 1
    const schema = readJson(rel)
    if (!schema) continue
    assert(schema.kind === 'singleType', `${rel}: kind must be singleType`)
    assert(schema.info?.displayName, `${rel}: displayName required`)
  }
}

const fixturesDir = abs('scripts/fixtures/pages-cms')
if (fs.existsSync(fixturesDir)) {
  const files = fs.readdirSync(fixturesDir).filter((name) => name.endsWith('.json'))
  for (const name of files) {
    readJson(path.join('scripts/fixtures/pages-cms', name))
  }
}

const mode = phase2SchemasPresent > 0 ? 'contract+partial-schemas' : 'contract-only'
if (failures.length) {
  console.error(`check:pages-cms-contract FAILED (${mode})`)
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}

console.log(`check:pages-cms-contract PASS (${mode})`)
console.log(` rows=${contract?.rows?.length ?? 0} phase1Components=4 phase2SchemaFilesTouched=${phase2SchemasPresent}`)
