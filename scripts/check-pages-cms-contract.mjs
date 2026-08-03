#!/usr/bin/env node
/**
 * Pages CMS contract harness (Phase 2 Task 1 gate + schema gates).
 *
 * Default mode (Task 1):
 * - Validate content-contract.json structure, definitions, rows
 * - Resolve CMS paths recursively through component definitions
 * - Forbid TBD / OR / wildcard / compound pseudo-paths
 * - Require fixtures for all 6 pages; reject unknown keys; validate against definitions
 * - Validate Phase 1 component schemas + full Phase 1 RU CM+CTB keys
 * - Preserve download-catalog attributes
 * - Built-in negative checks (bad nested path, extra fixture key, schema type mismatch)
 * - Do NOT treat Phase 1 / existing download-catalog as Phase 2 progress
 *
 * Components mode (Task 2):
 * - Enabled when PAGES_CMS_SCHEMA_MODE=components OR any phase2 component file exists
 *   (and no new Wave 1 single-type files yet)
 * - Requires EVERY phase2Components schema; full attribute contract compare
 * - Missing single types still OK
 *
 * Single-types mode (Task 3):
 * - Enabled when PAGES_CMS_SCHEMA_MODE=single-types OR any of the five new Wave 1
 *   single types exist (and download-catalog-page is not yet extended for Task 4)
 * - Requires EVERY phase2Components + the five new single types
 * - Does NOT require download-catalog-page to match the full contract definition yet
 *
 * Strict schema mode (Task 4+):
 * - Enabled when PAGES_CMS_SCHEMA_MODE=strict OR download-catalog-page gains Task 4 fields
 * - Requires EVERY phase2Components + phase2SingleTypes (including extended download-catalog)
 * - Compares full normalized attribute contract (type/required/repeatable/component/allowedTypes/enum/default)
 * - Missing any required Phase 2 schema → FAIL
 *
 * Usage:
 *   npm run check:pages-cms-contract
 *   PAGES_CMS_SCHEMA_MODE=components npm run check:pages-cms-contract
 *   PAGES_CMS_SCHEMA_MODE=single-types npm run check:pages-cms-contract
 *   PAGES_CMS_SCHEMA_MODE=strict npm run check:pages-cms-contract
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

function fail(message) {
  failures.push(message)
}

function readJson(rel) {
  const file = abs(rel)
  if (!fs.existsSync(file)) {
    fail(`Missing JSON: ${rel}`)
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`Invalid JSON ${rel}: ${error.message}`)
    return null
  }
}

function componentRel(uid) {
  const [ns, ...rest] = uid.split('.')
  const name = rest.join('.')
  return `strapi-catalog/src/components/${ns}/${name}.json`
}

function singleTypeRel(uid) {
  return `strapi-catalog/src/api/${uid}/content-types/${uid}/schema.json`
}

function isForbiddenCmsPath(cms) {
  if (typeof cms !== 'string' || !cms.trim()) return 'empty'
  if (/\bTBD\b/i.test(cms)) return 'contains TBD'
  if (cms.includes('|')) return 'contains OR (|)'
  if (cms.includes('*')) return 'contains wildcard (*)'
  if (/\s/.test(cms)) return 'contains whitespace / pseudo phrase'
  if (!/^[a-z0-9-]+(?:\.[a-z0-9_]+)+$/i.test(cms)) return 'not dotted path root.attr...'
  return null
}

function expectedRuKeysForComponent(uid, attributes) {
  const keys = []
  for (const attrName of Object.keys(attributes)) {
    keys.push(`content-manager.components.${uid}.${attrName}`)
    keys.push(`content-type-builder.components.${uid}.attributes.${attrName}`)
  }
  return keys
}

function expectedRuKeysForSingleType(uid, attributes) {
  const api = `api::${uid}.${uid}`
  const keys = []
  for (const attrName of Object.keys(attributes)) {
    keys.push(`content-manager.content-types.${api}.${attrName}`)
    keys.push(`content-type-builder.content-types.${api}.attributes.${attrName}`)
  }
  return keys
}

function expectedEnumRuKeys(uid, attributes, { isComponent }) {
  const keys = []
  for (const [attrName, attr] of Object.entries(attributes || {})) {
    if (attr.type !== 'enumeration' || !Array.isArray(attr.enum)) continue
    for (const value of attr.enum) {
      keys.push(
        isComponent
          ? `${uid}.${attrName}.${value}`
          : `api::${uid}.${uid}.${attrName}.${value}`,
      )
    }
  }
  return keys
}

/** Full Wave 1 RU key list (components + single types + enums + displayNames). */
function collectWave1RuKeys(c) {
  const keys = new Set(['page'])
  for (const uid of [...c.phase1Components, ...c.phase2Components]) {
    const def = c.definitions.components[uid]
    if (!def) continue
    keys.add(def.displayName)
    for (const key of expectedRuKeysForComponent(uid, def.attributes)) keys.add(key)
    for (const key of expectedEnumRuKeys(uid, def.attributes, { isComponent: true })) keys.add(key)
  }
  for (const uid of c.phase2SingleTypes) {
    const def = c.definitions.singleTypes[uid]
    if (!def) continue
    keys.add(def.displayName)
    for (const key of expectedRuKeysForSingleType(uid, def.attributes)) keys.add(key)
    for (const key of expectedEnumRuKeys(uid, def.attributes, { isComponent: false })) keys.add(key)
  }
  // Legacy English displayName for download-catalog still referenced historically
  keys.add('Download catalog page')
  return [...keys]
}

function validateAttrDef(prefix, def) {
  if (!def || typeof def !== 'object') {
    fail(`${prefix}: attribute definition missing`)
    return
  }
  if (!def.type) fail(`${prefix}: type required`)
  if (typeof def.required !== 'boolean') fail(`${prefix}: required boolean required`)
  if (def.type === 'media') {
    if (!Array.isArray(def.allowedTypes) || def.allowedTypes.length === 0) {
      fail(`${prefix}: media.allowedTypes required`)
    }
  }
  if (def.type === 'component') {
    if (!def.component) fail(`${prefix}: component uid required`)
    if (def.repeatable != null && typeof def.repeatable !== 'boolean') {
      fail(`${prefix}: repeatable must be boolean when set`)
    }
  }
  if (def.type === 'enumeration') {
    if (!Array.isArray(def.enum) || def.enum.length === 0) fail(`${prefix}: enum required`)
  }
}

/**
 * Resolve dotted CMS path through single-type → nested component attributes.
 * @returns {{ ok: true, attr: object, leafPath: string } | { ok: false, error: string }}
 */
function resolveCmsPath(contract, cmsPath) {
  const parts = cmsPath.split('.')
  if (parts.length < 2) {
    return { ok: false, error: `path too short: ${cmsPath}` }
  }
  const rootName = parts[0]
  const typeDef = contract.definitions.singleTypes[rootName]
  if (!typeDef) {
    return { ok: false, error: `cms root not in definitions.singleTypes: ${cmsPath}` }
  }

  let attributes = typeDef.attributes || {}
  let attr = null
  let leafPath = rootName

  for (let i = 1; i < parts.length; i += 1) {
    const name = parts[i]
    leafPath = `${leafPath}.${name}`
    attr = attributes[name]
    if (!attr) {
      return {
        ok: false,
        error: `cms path does not resolve (missing "${name}" under ${parts.slice(0, i).join('.')}): ${cmsPath}`,
      }
    }
    if (i === parts.length - 1) {
      return { ok: true, attr, leafPath }
    }
    if (attr.type !== 'component') {
      return {
        ok: false,
        error: `cannot descend into non-component "${name}" (${attr.type}): ${cmsPath}`,
      }
    }
    const child = contract.definitions.components[attr.component]
    if (!child?.attributes) {
      return {
        ok: false,
        error: `unknown component ref ${attr.component} at ${leafPath}: ${cmsPath}`,
      }
    }
    attributes = child.attributes
  }

  return { ok: false, error: `unresolved path: ${cmsPath}` }
}

/** Normalize contract or Strapi schema attribute for strict structural compare. */
function normalizeAttrContract(attr) {
  if (!attr || typeof attr !== 'object') return null
  const out = {
    type: attr.type,
    required: attr.required === true,
  }
  if (attr.type === 'component') {
    out.component = attr.component
    out.repeatable = attr.repeatable === true
  }
  if (attr.type === 'media') {
    out.allowedTypes = [...(attr.allowedTypes || [])].map(String).sort()
    out.multiple = attr.multiple === true
  }
  if (attr.type === 'enumeration') {
    out.enum = [...(attr.enum || [])].map(String)
  }
  if (Object.prototype.hasOwnProperty.call(attr, 'default')) {
    out.default = attr.default
  }
  return out
}

/**
 * @returns {string|null} error message when mismatch
 */
function compareNormalizedAttrs(defAttr, schemaAttr, label) {
  const expected = normalizeAttrContract(defAttr)
  const actual = normalizeAttrContract(schemaAttr)
  if (!expected) return `${label}: definition attr missing`
  if (!actual) return `${label}: schema attr missing`
  const expectedJson = JSON.stringify(expected)
  const actualJson = JSON.stringify(actual)
  if (expectedJson !== actualJson) {
    return `${label}: attribute contract mismatch expected=${expectedJson} actual=${actualJson}`
  }
  return null
}

function collectFixtureObjectErrors(prefix, obj, attributes, components, errors) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    errors.push(`${prefix}: expected object`)
    return
  }
  for (const key of Object.keys(obj)) {
    if (!Object.prototype.hasOwnProperty.call(attributes, key)) {
      errors.push(`${prefix}: unknown fixture key "${key}"`)
    }
  }
  for (const [name, def] of Object.entries(attributes)) {
    collectFixtureValueErrors(`${prefix}.${name}`, obj[name], def, components, errors)
  }
}

function collectFixtureValueErrors(prefix, value, attrDef, components, errors) {
  if (!attrDef) {
    errors.push(`${prefix}: no attribute definition`)
    return
  }
  if (value === undefined) {
    if (attrDef.required) errors.push(`${prefix}: required value missing in fixture`)
    return
  }
  if (attrDef.type === 'component') {
    const childUid = attrDef.component
    const childDef = components[childUid]
    if (!childDef) {
      errors.push(`${prefix}: unknown component ${childUid}`)
      return
    }
    if (attrDef.repeatable) {
      if (!Array.isArray(value)) {
        errors.push(`${prefix}: expected array of ${childUid}`)
        return
      }
      value.forEach((item, i) => {
        collectFixtureObjectErrors(`${prefix}[${i}]`, item, childDef.attributes, components, errors)
      })
    } else {
      collectFixtureObjectErrors(prefix, value, childDef.attributes, components, errors)
    }
    return
  }
  if (attrDef.type === 'media') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`${prefix}: media fixture must be { url: string }`)
      return
    }
    for (const key of Object.keys(value)) {
      if (key !== 'url') errors.push(`${prefix}: unknown media fixture key "${key}"`)
    }
    if (typeof value.url !== 'string') errors.push(`${prefix}: media.url must be string`)
    return
  }
  if (attrDef.type === 'boolean' && typeof value !== 'boolean') errors.push(`${prefix}: expected boolean`)
  if (attrDef.type === 'integer' && typeof value !== 'number') errors.push(`${prefix}: expected number`)
  if (
    (attrDef.type === 'string' || attrDef.type === 'text' || attrDef.type === 'enumeration') &&
    typeof value !== 'string'
  ) {
    errors.push(`${prefix}: expected string`)
  }
  if (attrDef.type === 'enumeration' && Array.isArray(attrDef.enum) && !attrDef.enum.includes(value)) {
    errors.push(`${prefix}: value not in enum ${attrDef.enum.join('|')}`)
  }
}

/** Strapi 5 reserved attribute names that must never appear in page CMS components. */
const STRAPI_RESERVED_ATTR_NAMES = new Set(['document_id', 'documentId'])

/**
 * @returns {string[]} human-readable hits (empty = clean)
 */
function collectReservedAttributeHits(c) {
  const hits = []
  for (const [uid, def] of Object.entries(c.definitions?.components || {})) {
    for (const name of Object.keys(def.attributes || {})) {
      if (STRAPI_RESERVED_ATTR_NAMES.has(name)) {
        hits.push(`definitions.components.${uid}.attributes.${name}`)
      }
    }
  }
  return hits
}

function assertNoReservedComponentAttributes(c) {
  for (const hit of collectReservedAttributeHits(c)) {
    fail(`reserved Strapi attribute forbidden: ${hit}`)
  }

  const docCard = c.definitions.components['page.document-card']
  if (!docCard?.attributes?.document_key) {
    fail('page.document-card must expose document_key (not document_id)')
  }
  if (docCard?.attributes?.document_id) {
    fail('page.document-card must not expose reserved document_id')
  }

  // Schema files on disk (Phase 1 + Phase 2 components)
  const pageDir = abs('strapi-catalog/src/components/page')
  if (!fs.existsSync(pageDir)) return
  for (const file of fs.readdirSync(pageDir).filter((f) => f.endsWith('.json'))) {
    const rel = `strapi-catalog/src/components/page/${file}`
    const schema = readJson(rel)
    if (!schema?.attributes) continue
    for (const name of Object.keys(schema.attributes)) {
      if (STRAPI_RESERVED_ATTR_NAMES.has(name)) {
        fail(`reserved Strapi attribute forbidden in schema: ${rel}.attributes.${name}`)
      }
    }
  }
}

const contractRel = '.planning/phases/02-wave-1-single-types/02-content-contract.json'
const contractMdRel = '.planning/phases/02-wave-1-single-types/02-CONTENT-CONTRACT.md'
const contract = readJson(contractRel)
if (!fs.existsSync(abs(contractMdRel))) fail(`Missing ${contractMdRel}`)

let mode = 'contract'
let phase2ComponentsPresent = 0
let phase2SingleTypesPresent = 0

if (contract) {
  assertBasics(contract)
  assertDefinitions(contract)
  assertNoReservedComponentAttributes(contract)
  assertRows(contract)
  assertFixtures(contract)
  assertNegativeChecks(contract)
  phase2ComponentsPresent = countExistingPhase2Components(contract)
  phase2SingleTypesPresent = countExistingPhase2SingleTypes(contract)
  const envMode = process.env.PAGES_CMS_SCHEMA_MODE || ''
  const downloadExtended = isDownloadCatalogExtended(contract)
  if (envMode === 'strict' || downloadExtended) {
    mode = 'strict-schemas'
    assertAllPhase2Components(contract, 'strict-schemas')
    assertAllPhase2SingleTypes(contract, 'strict-schemas')
  } else if (envMode === 'single-types' || phase2SingleTypesPresent > 0) {
    mode = 'single-types'
    assertAllPhase2Components(contract, 'single-types')
    assertWave1PageSingleTypes(contract, 'single-types')
  } else if (envMode === 'components' || phase2ComponentsPresent > 0) {
    mode = 'components'
    assertAllPhase2Components(contract, 'components')
  }
}

assertPhase1Schemas()
assertWave1FullRu()
assertDownloadPreserve(contract)

function assertBasics(c) {
  if (c.version < 2) fail('contract.version must be >= 2')
  if (!Array.isArray(c.pages) || c.pages.length !== 6) fail('contract.pages must list exactly 6 pages')
  if (!Array.isArray(c.phase1Components) || c.phase1Components.length !== 4) {
    fail('phase1Components must list 4 Phase 1 UIDs')
  }
  if (!Array.isArray(c.phase2Components) || c.phase2Components.length === 0) fail('phase2Components required')
  if (!Array.isArray(c.phase2SingleTypes) || c.phase2SingleTypes.length === 0) fail('phase2SingleTypes required')
  if (!c.definitions?.components || !c.definitions?.singleTypes) fail('definitions.components/singleTypes required')
  if (!Array.isArray(c.rows) || c.rows.length === 0) fail('rows required')
  if (!c.fixtures || typeof c.fixtures !== 'object') fail('fixtures map required')
  const office = c.definitions.components['page.office']
  if (!office?.attributes?.map_iframe_html || office.attributes.map_iframe_html.required !== true) {
    fail('page.office.map_iframe_html must be required text (CMS map source of truth)')
  }
  for (const forbidden of ['lat', 'lng', 'latitude', 'longitude', 'zoom', 'balloon']) {
    if (office?.attributes?.[forbidden]) {
      fail(`page.office must not expose ${forbidden} as CMS attribute`)
    }
  }
  if (c.definitions.singleTypes['contacts-page']?.attributes?.mapSeed) {
    fail('contacts-page.mapSeed must not be a CMS single-type attribute')
  }
}

function assertDefinitions(c) {
  for (const uid of [...c.phase1Components, ...c.phase2Components]) {
    if (!c.definitions.components[uid]) fail(`definitions.components missing ${uid}`)
  }
  for (const [uid, def] of Object.entries(c.definitions.components)) {
    if (!def.displayName) fail(`${uid}: displayName required`)
    if (!def.attributes || !Object.keys(def.attributes).length) fail(`${uid}: attributes required`)
    for (const [name, attr] of Object.entries(def.attributes)) {
      validateAttrDef(`definitions.components.${uid}.${name}`, attr)
    }
  }
  for (const uid of c.phase2SingleTypes) {
    const def = c.definitions.singleTypes[uid]
    if (!def) {
      fail(`definitions.singleTypes missing ${uid}`)
      continue
    }
    if (!def.displayName) fail(`${uid}: displayName required`)
    for (const [name, attr] of Object.entries(def.attributes || {})) {
      validateAttrDef(`definitions.singleTypes.${uid}.${name}`, attr)
    }
  }
  for (const [uid, def] of Object.entries(c.definitions.components)) {
    for (const [name, attr] of Object.entries(def.attributes || {})) {
      if (attr.type === 'component' && !c.definitions.components[attr.component]) {
        fail(`${uid}.${name}: unknown component ref ${attr.component}`)
      }
    }
  }
  for (const [uid, def] of Object.entries(c.definitions.singleTypes)) {
    for (const [name, attr] of Object.entries(def.attributes || {})) {
      if (attr.type === 'component' && !c.definitions.components[attr.component]) {
        fail(`${uid}.${name}: unknown component ref ${attr.component}`)
      }
    }
  }
  if (!c.definitions.components['catalog.hero-slide']) {
    fail('definitions.components must include existing catalog.hero-slide for download-catalog slides')
  }
}

function assertRows(c) {
  const pagesSeen = new Set()
  for (const [index, row] of c.rows.entries()) {
    const p = `rows[${index}]`
    if (!row || typeof row !== 'object') {
      fail(`${p}: must be object`)
      continue
    }
    if (!c.pages.includes(row.page)) fail(`${p}: unknown page ${row.page}`)
    pagesSeen.add(row.page)
    if (!row.section || !row.source) fail(`${p}: section/source required`)
    if (/\bTBD\b/i.test(JSON.stringify(row))) fail(`${p}: contains TBD`)
    if (row.ownership === 'cms') {
      const bad = isForbiddenCmsPath(row.cms)
      if (bad) {
        fail(`${p}: invalid cms path (${bad}): ${row.cms}`)
      } else {
        const resolved = resolveCmsPath(c, row.cms)
        if (!resolved.ok) fail(`${p}: ${resolved.error}`)
        if (/(^|\.)(lat|lng|latitude|longitude|zoom|balloon)(\.|$)/i.test(row.cms)) {
          fail(`${p}: lat/lng/zoom/balloon cannot be CMS-owned: ${row.cms}`)
        }
      }
      if (row.reason) fail(`${p}: cms row must not have reason`)
    } else if (row.ownership === 'code') {
      if (row.cms != null) fail(`${p}: code row cms must be null`)
      if (!row.reason || !String(row.reason).trim()) fail(`${p}: code reason required`)
    } else {
      fail(`${p}: ownership must be cms|code`)
    }
  }
  for (const page of c.pages) {
    if (!pagesSeen.has(page)) fail(`no rows for page ${page}`)
  }
}

function assertFixtures(c) {
  const components = c.definitions.components
  for (const page of c.pages) {
    const rel = c.fixtures?.[page]
    if (!rel) {
      fail(`fixtures.${page} path missing in contract`)
      continue
    }
    const data = readJson(rel)
    if (!data) continue
    const typeUid = page === 'download-catalog' ? 'download-catalog-page' : `${page}-page`
    const typeDef = c.definitions.singleTypes[typeUid]
    if (!typeDef) {
      fail(`no single type definition for fixture page ${page}`)
      continue
    }
    const errors = []
    collectFixtureObjectErrors(rel, data, typeDef.attributes, components, errors)
    for (const error of errors) fail(error)
  }
}

function assertNegativeChecks(c) {
  const badNested = resolveCmsPath(c, 'index-page.hero.not_a_real_field')
  if (badNested.ok) {
    fail('negative-check failed: invalid nested CMS path unexpectedly resolved')
  }

  const heroDef = c.definitions.components['page.hero-media']
  if (!heroDef) {
    fail('negative-check failed: page.hero-media definition missing')
  } else {
    const extraErrors = []
    collectFixtureObjectErrors(
      'negative-fixture',
      { title: 'x', bogus_extra_field: true },
      heroDef.attributes,
      c.definitions.components,
      extraErrors,
    )
    if (!extraErrors.some((e) => /unknown fixture key "bogus_extra_field"/.test(e))) {
      fail('negative-check failed: extra fixture key did not produce FAIL')
    }
  }

  const typeMismatch = compareNormalizedAttrs(
    { type: 'string', required: true },
    { type: 'text', required: true },
    'negative-schema',
  )
  if (!typeMismatch) {
    fail('negative-check failed: schema type mismatch did not produce FAIL')
  }

  const requiredMismatch = compareNormalizedAttrs(
    { type: 'string', required: true },
    { type: 'string', required: false },
    'negative-required',
  )
  if (!requiredMismatch) {
    fail('negative-check failed: required mismatch did not produce FAIL')
  }

  // Meta: reserved-field detector must FAIL when document_id is injected
  const reservedProbe = collectReservedAttributeHits({
    definitions: {
      components: {
        'page.__reserved_probe': {
          attributes: { document_id: { type: 'string', required: true } },
        },
      },
    },
  })
  if (!reservedProbe.some((hit) => hit.includes('document_id'))) {
    fail('negative-check failed: reserved document_id probe did not produce FAIL')
  }
}

function wave1PageSingleTypes(c) {
  return (c.phase2SingleTypes || []).filter((uid) => uid !== 'download-catalog-page')
}

function isDownloadCatalogExtended(c) {
  const rel = singleTypeRel('download-catalog-page')
  if (!fs.existsSync(abs(rel))) return false
  // Avoid calling readJson here (it would push Missing JSON into failures); file exists
  let schema
  try {
    schema = JSON.parse(fs.readFileSync(abs(rel), 'utf8'))
  } catch {
    return false
  }
  const task4Fields = ['title', 'lead', 'submit_label', 'catalog_pdf', 'back_label', 'back_href']
  return task4Fields.every((name) => schema.attributes?.[name])
}

function countExistingPhase2Components(c) {
  let n = 0
  for (const uid of c.phase2Components) {
    if (fs.existsSync(abs(componentRel(uid)))) n += 1
  }
  return n
}

function countExistingPhase2SingleTypes(c) {
  let n = 0
  for (const uid of wave1PageSingleTypes(c)) {
    if (fs.existsSync(abs(singleTypeRel(uid)))) n += 1
  }
  return n
}

function assertAllPhase2Components(c, gate) {
  for (const uid of c.phase2Components) {
    const rel = componentRel(uid)
    if (!fs.existsSync(abs(rel))) fail(`${gate}: missing component schema ${rel}`)
    else assertSchemaMatchesDefinition(rel, c.definitions.components[uid], 'component', gate)
  }
  assertNoCircularComponentGraph(c, gate)
}

function assertWave1PageSingleTypes(c, gate) {
  const uids = wave1PageSingleTypes(c)
  if (uids.length !== 5) fail(`${gate}: expected exactly 5 Wave 1 page single types, got ${uids.length}`)
  for (const uid of uids) {
    const rel = singleTypeRel(uid)
    if (!fs.existsSync(abs(rel))) fail(`${gate}: missing single type schema ${rel}`)
    else assertSchemaMatchesDefinition(rel, c.definitions.singleTypes[uid], 'singleType', gate)
  }
}

function assertAllPhase2SingleTypes(c, gate) {
  for (const uid of c.phase2SingleTypes) {
    const rel = singleTypeRel(uid)
    if (!fs.existsSync(abs(rel))) fail(`${gate}: missing single type schema ${rel}`)
    else assertSchemaMatchesDefinition(rel, c.definitions.singleTypes[uid], 'singleType', gate)
  }
}

function assertNoCircularComponentGraph(c, gate) {
  const visiting = new Set()
  const visited = new Set()

  function walk(uid, stack) {
    if (visiting.has(uid)) {
      fail(`${gate}: circular component graph: ${[...stack, uid].join(' -> ')}`)
      return
    }
    if (visited.has(uid)) return
    const def = c.definitions.components[uid]
    if (!def) return
    visiting.add(uid)
    for (const attr of Object.values(def.attributes || {})) {
      if (attr.type === 'component' && attr.component) {
        walk(attr.component, [...stack, uid])
      }
    }
    visiting.delete(uid)
    visited.add(uid)
  }

  for (const uid of c.phase2Components) walk(uid, [])
}

function assertSchemaMatchesDefinition(rel, def, kind, gate = 'schema') {
  const schema = readJson(rel)
  if (!schema || !def) return
  if (kind === 'singleType' && schema.kind !== 'singleType') fail(`${rel}: kind must be singleType`)
  if (kind === 'component' && !schema.info?.displayName) fail(`${rel}: displayName required`)
  const defAttrs = def.attributes || {}
  const schemaAttrs = schema.attributes || {}
  for (const name of Object.keys(defAttrs)) {
    if (!schemaAttrs[name]) {
      fail(`${gate}: ${rel}: missing attribute ${name} from contract definition`)
      continue
    }
    const mismatch = compareNormalizedAttrs(defAttrs[name], schemaAttrs[name], `${rel}.attributes.${name}`)
    if (mismatch) fail(`${gate}: ${mismatch}`)
  }
  for (const name of Object.keys(schemaAttrs)) {
    if (!defAttrs[name]) {
      fail(`${gate}: ${rel}: schema has attribute "${name}" not present in contract definition`)
    }
  }
}

function assertPhase1Schemas() {
  if (!contract) return
  for (const uid of contract.phase1Components) {
    const rel = componentRel(uid)
    const schema = readJson(rel)
    const def = contract.definitions.components[uid]
    if (!schema || !def) continue
    if (!schema.info?.displayName) fail(`${rel}: displayName required`)
    if (uid === 'page.section' && schema.attributes?.items?.component !== 'page.list-item') {
      fail(`${rel}: items must nest page.list-item`)
    }
    for (const name of Object.keys(def.attributes || {})) {
      if (!schema.attributes?.[name]) {
        fail(`${rel}: missing Phase 1 attribute ${name}`)
        continue
      }
      const mismatch = compareNormalizedAttrs(
        def.attributes[name],
        schema.attributes[name],
        `${rel}.attributes.${name}`,
      )
      if (mismatch) fail(mismatch)
    }
  }
}

function isCyrillicLabel(value) {
  return typeof value === 'string' && /[А-Яа-яЁё]/.test(value.trim())
}

/** Flat enum value → RU label keys required for Admin Select (formatMessage id=value). */
function collectWave1EnumFlatLabelKeys(c) {
  const labels = new Map()
  const visit = (uid, attributes, isComponent) => {
    for (const [attrName, attr] of Object.entries(attributes || {})) {
      if (attr?.type !== 'enumeration' || !Array.isArray(attr.enum)) continue
      for (const value of attr.enum) {
        const raw = String(value)
        const nsKey = isComponent
          ? `${uid}.${attrName}.${raw}`
          : `api::${uid}.${uid}.${attrName}.${raw}`
        labels.set(raw, nsKey)
      }
    }
  }
  for (const uid of [...c.phase1Components, ...c.phase2Components]) {
    const def = c.definitions.components[uid]
    if (def) visit(uid, def.attributes, true)
  }
  for (const uid of c.phase2SingleTypes) {
    const def = c.definitions.singleTypes[uid]
    if (def) visit(uid, def.attributes, false)
  }
  // download-catalog enums live on the preserve ST, not only phase2SingleTypes list
  const dl = c.definitions.singleTypes['download-catalog-page']
  if (dl) visit('download-catalog-page', dl.attributes, false)
  return labels
}

function assertWave1EnumFlatLabels(ru, c) {
  const pairs = collectWave1EnumFlatLabelKeys(c)
  if (pairs.size === 0) {
    fail('Wave 1 enum flat-label set unexpectedly empty')
    return
  }
  for (const [value, nsKey] of pairs) {
    const nsLabel = ru[nsKey]
    const flatLabel = ru[value]
    if (!isCyrillicLabel(nsLabel)) {
      fail(`ru.json enum ns label missing/non-RU: ${nsKey}`)
    }
    if (!isCyrillicLabel(flatLabel)) {
      fail(`ru.json enum flat UI label missing/non-RU for value "${value}" (needed by Admin Select)`)
      continue
    }
    // Latin technical values must not equal their UI labels
    if (/[A-Za-z]/.test(value) && flatLabel.trim() === value) {
      fail(`ru.json enum flat label still technical for value "${value}"`)
    }
  }

  // Negative: removing one flat enum UI key must fail the check
  const probeValue = 'image_only'
  if (!pairs.has(probeValue)) {
    fail('negative-check failed: image_only not in Wave 1 enum flat-label set')
  } else {
    const probeRu = { ...ru }
    delete probeRu[probeValue]
    let detected = false
    for (const [value] of pairs) {
      if (!isCyrillicLabel(probeRu[value]) || (/[A-Za-z]/.test(value) && probeRu[value]?.trim() === value)) {
        if (value === probeValue) detected = true
      }
    }
    if (!detected) {
      fail('negative-check failed: enum flat-label regression did not detect removed image_only')
    }
  }
}

function assertWave1FullRu() {
  const ru = readJson('strapi-catalog/src/admin/translations/ru.json')
  if (!ru || !contract) return
  const required = collectWave1RuKeys(contract)
  if (required.length < 100) {
    fail(`Wave 1 RU key set unexpectedly small: ${required.length}`)
  }
  for (const key of required) {
    if (typeof ru[key] !== 'string' || !ru[key].trim()) {
      fail(`ru.json missing Wave 1 key: ${key}`)
    }
  }

  // Negative regression: deleting one required key must be detected
  const probeKey = 'content-manager.components.page.office.map_iframe_html'
  if (!required.includes(probeKey)) {
    fail('negative-check failed: RU probe key not in required Wave 1 set')
  } else {
    const probeRu = { ...ru }
    delete probeRu[probeKey]
    const misses = required.filter((k) => typeof probeRu[k] !== 'string' || !probeRu[k].trim())
    if (!misses.includes(probeKey)) {
      fail('negative-check failed: Wave 1 RU coverage did not detect removed key')
    }
  }

  assertWave1EnumFlatLabels(ru, contract)
}

function collectDownloadPreserveMisses(schema, c) {
  const misses = []
  const def = c.definitions.singleTypes['download-catalog-page']
  for (const attr of c.downloadCatalogPreserveAttrs || []) {
    if (!schema?.attributes?.[attr]) {
      misses.push(`missing preserved attr: ${attr}`)
      continue
    }
    const expected = def?.attributes?.[attr]
    if (!expected) {
      misses.push(`contract missing preserve definition: ${attr}`)
      continue
    }
    const mismatch = compareNormalizedAttrs(
      expected,
      schema.attributes[attr],
      `download-catalog-page.attributes.${attr}`,
    )
    if (mismatch) misses.push(mismatch)
  }
  return misses
}

function assertDownloadPreserve(c) {
  const rel = 'strapi-catalog/src/api/download-catalog-page/content-types/download-catalog-page/schema.json'
  const schema = readJson(rel)
  if (!schema || !c) return
  for (const miss of collectDownloadPreserveMisses(schema, c)) {
    fail(`download-catalog preserve: ${miss}`)
  }

  // Regression: removing a preserved attr must be detected
  const probe = JSON.parse(JSON.stringify(schema))
  delete probe.attributes.media_display_mode
  const probeMisses = collectDownloadPreserveMisses(probe, c)
  if (!probeMisses.some((m) => /media_display_mode/.test(m))) {
    fail('negative-check failed: download-catalog preserve regression did not detect removed media_display_mode')
  }
}

if (failures.length) {
  console.error(`check:pages-cms-contract FAILED (${mode})`)
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log(`check:pages-cms-contract PASS (${mode})`)
console.log(
  ` rows=${contract?.rows?.length ?? 0}` +
    ` phase1Components=${contract?.phase1Components?.length ?? 0}` +
    ` phase2Components=${contract?.phase2Components?.length ?? 0}` +
    ` phase2ComponentFiles=${phase2ComponentsPresent}` +
    ` phase2SingleTypeFiles=${phase2SingleTypesPresent}` +
    ` fixtures=${Object.keys(contract?.fixtures || {}).length}` +
    ` negativeChecks=ok`,
)
