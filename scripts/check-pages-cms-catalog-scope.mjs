#!/usr/bin/env node
/**
 * Catalog scope guard for Pages CMS Phase 3+.
 *
 * Still forbidden:
 * - catalog schema runtime drift beyond displayName (vs base)
 * - changes under catalog controllers/routes/services, src/catalog, public/catalog*
 *
 * Allowed (Phase D+):
 * - additive pages proxy / cache / snapshot helpers in server.cjs
 * - provided catalog route/cache markers remain intact
 *
 * Usage:
 *   node scripts/check-pages-cms-catalog-scope.mjs
 *   PAGES_CMS_CATALOG_SCOPE_BASE=b59f0ec^ node scripts/check-pages-cms-catalog-scope.mjs
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.PAGES_CMS_CATALOG_SCOPE_BASE || 'b59f0ec^'
const HEAD = process.env.PAGES_CMS_CATALOG_SCOPE_HEAD || 'HEAD'

const failures = []
const fail = (msg) => failures.push(msg)

/** Catalog invariants that must remain in server.cjs after pages proxy lands. */
const SERVER_CATALOG_MARKERS = [
  "app.get('/api/catalog/products'",
  "app.get('/api/catalog/filters'",
  "app.get('/api/catalog/hero-slides'",
  "app.get('/api/download-catalog/slides'",
  'CATALOG_STRAPI_CACHE_TTL_MS',
  'CATALOG_STRAPI_STALE_MS',
  'catalog-products.snapshot.json',
  'catalog-filters.snapshot.json',
  'catalog-hero.snapshot.json',
  'download-catalog-slides.snapshot.json',
  'resolveCatalogFallbackPayload',
  'setCatalogStrapiCache',
  'getCatalogStrapiCache',
]

/** Pages markers expected once Phase D proxy is present. */
const SERVER_PAGES_MARKERS = [
  "app.get('/api/pages/:slug'",
  'PAGES_STRAPI_CACHE_TTL_MS',
  'createPagesCmsApi',
  'X-Pages-Source',
]

function gitShowText(rev, rel) {
  try {
    return execFileSync('git', ['show', `${rev}:${rel}`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    return null
  }
}

function gitShowJson(rev, rel) {
  const text = gitShowText(rev, rel)
  if (text == null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function gitLs(rev, prefix) {
  const out = execFileSync('git', ['ls-tree', '-r', '--name-only', rev, prefix], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return out.split('\n').filter(Boolean)
}

function stripAdmin(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'info' && v && typeof v === 'object') {
      out.info = Object.fromEntries(Object.entries(v).filter(([ik]) => ik !== 'displayName'))
      continue
    }
    if (k === 'attributes' && v && typeof v === 'object') {
      const attrs = {}
      for (const [an, av] of Object.entries(v)) {
        if (av && typeof av === 'object' && !Array.isArray(av)) {
          attrs[an] = Object.fromEntries(
            Object.entries(av)
              .filter(([ak]) => ak !== 'displayName')
              .map(([ak, avv]) => [ak, stripAdmin(avv)]),
          )
        } else {
          attrs[an] = av
        }
      }
      out.attributes = attrs
      continue
    }
    out[k] = typeof v === 'object' ? stripAdmin(v) : v
  }
  return out
}

function isCatalogSchemaPath(rel) {
  if (rel.startsWith('strapi-catalog/src/components/catalog/') && rel.endsWith('.json')) return true
  if (!rel.startsWith('strapi-catalog/src/api/') || !rel.endsWith('/schema.json')) return false
  return /\/(product|collection|tag|catalog-|feature-option|filling-option|firmness-option|height-range-option|load-range-option|mattress-)/.test(
    rel,
  )
}

const paths = new Set([
  ...gitLs(BASE, 'strapi-catalog/src/api').filter(isCatalogSchemaPath),
  ...gitLs(HEAD, 'strapi-catalog/src/api').filter(isCatalogSchemaPath),
  ...gitLs(BASE, 'strapi-catalog/src/components/catalog').filter(isCatalogSchemaPath),
  ...gitLs(HEAD, 'strapi-catalog/src/components/catalog').filter(isCatalogSchemaPath),
])

let adminOnly = 0
let identical = 0

for (const rel of [...paths].sort()) {
  const before = gitShowJson(BASE, rel)
  const after = gitShowJson(HEAD, rel)
  if (!before && after) {
    fail(`${rel}: added after ${BASE} (unexpected catalog schema add)`)
    continue
  }
  if (before && !after) {
    fail(`${rel}: removed after ${BASE}`)
    continue
  }
  if (!before && !after) continue

  const sb = stripAdmin(before)
  const sa = stripAdmin(after)
  if (JSON.stringify(sb) !== JSON.stringify(sa)) {
    fail(`${rel}: runtime schema differs from ${BASE} beyond displayName`)
    continue
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) adminOnly += 1
  else identical += 1
}

// Catalog runtime surfaces remain forbidden; server.cjs is pages-aware (checked below).
const forbiddenGlobs = [
  'strapi-catalog/src/api/catalog/controllers',
  'strapi-catalog/src/api/catalog/routes',
  'strapi-catalog/src/api/catalog/services',
  'src/catalog',
  'public/catalog',
]
const changed = execFileSync('git', ['diff', '--name-only', `${BASE}..${HEAD}`, '--', ...forbiddenGlobs], {
  cwd: ROOT,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .filter((f) => f !== 'strapi-catalog/src/api/catalog/utils/sync-pages-cms-admin-labels.js')

for (const f of changed) {
  fail(`forbidden catalog runtime/feed change: ${f}`)
}

// server.cjs: allow pages proxy additions; require catalog markers intact
const serverHeadPath = path.join(ROOT, 'server.cjs')
const serverHead = fs.existsSync(serverHeadPath)
  ? fs.readFileSync(serverHeadPath, 'utf8')
  : gitShowText(HEAD, 'server.cjs')
const serverBase = gitShowText(BASE, 'server.cjs')

if (!serverHead) {
  fail('server.cjs missing at HEAD')
} else {
  for (const marker of SERVER_CATALOG_MARKERS) {
    if (!serverHead.includes(marker)) {
      fail(`server.cjs missing catalog marker: ${marker}`)
    }
  }
  if (serverBase) {
    for (const marker of SERVER_CATALOG_MARKERS) {
      if (serverBase.includes(marker) && !serverHead.includes(marker)) {
        fail(`server.cjs removed catalog marker vs ${BASE}: ${marker}`)
      }
    }
  }

  const serverChanged =
    Boolean(serverBase) && serverBase !== serverHead
      ? true
      : execFileSync('git', ['diff', '--name-only', `${BASE}..${HEAD}`, '--', 'server.cjs'], {
          cwd: ROOT,
          encoding: 'utf8',
        }).trim() === 'server.cjs'

  if (serverChanged) {
    const missingPages = SERVER_PAGES_MARKERS.filter((m) => !serverHead.includes(m))
    if (missingPages.length) {
      fail(
        `server.cjs changed without pages proxy markers (${missingPages.join(', ')}); additive /api/pages/:slug required`,
      )
    }
  }
}

if (failures.length) {
  console.error('check:pages-cms-catalog-scope FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-cms-catalog-scope PASS')
console.log(
  ` base=${BASE} head=${HEAD} schemas=${paths.size} identical=${identical} adminDisplayNameOnly=${adminOnly} serverPagesAware=ok feedRouteDiffs=0`,
)
