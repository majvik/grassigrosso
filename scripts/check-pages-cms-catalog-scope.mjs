#!/usr/bin/env node
/**
 * Task 6 scope guard: catalog schemas after Admin RU work may only change displayName
 * (info.displayName / attribute.displayName). Runtime contract must match base revision.
 *
 * Usage:
 *   node scripts/check-pages-cms-catalog-scope.mjs
 *   PAGES_CMS_CATALOG_SCOPE_BASE=b59f0ec^ node scripts/check-pages-cms-catalog-scope.mjs
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.PAGES_CMS_CATALOG_SCOPE_BASE || 'b59f0ec^'
const HEAD = process.env.PAGES_CMS_CATALOG_SCOPE_HEAD || 'HEAD'

const failures = []
const fail = (msg) => failures.push(msg)

function gitShowJson(rev, rel) {
  try {
    const out = execFileSync('git', ['show', `${rev}:${rel}`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return JSON.parse(out)
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
    fail(`${rel}: added after ${BASE} (unexpected for Task 6 catalog scope)`)
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

// Feed / routes / controllers must not change in the Admin RU window
const forbiddenGlobs = [
  'strapi-catalog/src/api/catalog/controllers',
  'strapi-catalog/src/api/catalog/routes',
  'strapi-catalog/src/api/catalog/services',
  'server.cjs',
  'src/catalog',
  'public/catalog',
]
const changed = execFileSync('git', ['diff', '--name-only', `${BASE}..${HEAD}`, '--', ...forbiddenGlobs], {
  cwd: ROOT,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  // Admin label sync util under catalog/utils is allowed (not a feed/route)
  .filter((f) => f !== 'strapi-catalog/src/api/catalog/utils/sync-pages-cms-admin-labels.js')

for (const f of changed) {
  fail(`forbidden catalog runtime/feed change: ${f}`)
}

if (failures.length) {
  console.error('check:pages-cms-catalog-scope FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-cms-catalog-scope PASS')
console.log(
  ` base=${BASE} head=${HEAD} schemas=${paths.size} identical=${identical} adminDisplayNameOnly=${adminOnly} feedRouteDiffs=0`,
)
