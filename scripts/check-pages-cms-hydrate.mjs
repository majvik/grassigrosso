#!/usr/bin/env node
/**
 * Phase 4A unit harness: merge semantics, client lifecycle, mount guard, pages-api isolation.
 * Bundles src/pages/*.ts via esbuild (repo has no tsx; root package is commonjs).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import * as esbuild from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

const outfile = path.join(os.tmpdir(), `pages-cms-hydrate-bundle-${process.pid}.mjs`)
await esbuild.build({
  entryPoints: [path.join(root, 'scripts/pages-cms/hydrate-harness-entry.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  packages: 'bundle',
  logLevel: 'silent',
})

const {
  mergePageContent,
  validateNodeEnvelope,
  fetchPageContent,
  prefetchPageContent,
  resetPagesApiCacheForTests,
  setPagesApiFetchForTests,
  getPagesApiCacheStateForTests,
  pagesApiPath,
  createMountGuard,
  BEHAVIOR_BOUND_ARRAYS,
} = await import(pathToFileURL(outfile).href)

try {
  fs.unlinkSync(outfile)
} catch {
  /* ignore */
}

const { DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS } = require(
  path.join(root, 'strapi-catalog/src/api/pages-cms/utils/deep-populate.js'),
)
const { normalizeMapIframeHtml } = require(
  path.join(root, 'strapi-catalog/src/api/pages-cms/utils/normalize-map-iframe.js'),
)

const failures = []
const fail = (msg) => failures.push(msg)
const assert = (cond, msg) => {
  if (!cond) fail(msg)
}

function readFixture(slug) {
  const raw = JSON.parse(
    fs.readFileSync(path.join(root, 'scripts/fixtures/pages-cms', `${slug}.json`), 'utf8'),
  )
  if (slug === 'download-catalog') {
    const out = { ...raw }
    for (const key of DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS) delete out[key]
    return out
  }
  if (slug === 'contacts') {
    return {
      ...raw,
      offices: (raw.offices || []).map((office) => {
        const { map_iframe_html: html, ...rest } = office
        return { ...rest, map_embed_url: normalizeMapIframeHtml(html) }
      }),
    }
  }
  return raw
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// --- Merge: identity / absence ---
{
  const fallback = readFixture('dealers')
  const merged = mergePageContent('dealers', fallback, {})
  assert(merged.ok, `empty cms object should ok (all absent): ${merged.ok === false ? merged.reason : ''}`)
  if (merged.ok) assert(deepEqual(merged.value, fallback), 'absence keeps full fallback')
}

// --- Merge: scalar CMS apply ---
{
  const fallback = readFixture('dealers')
  const cms = { packages_title: 'Новые пакеты' }
  const merged = mergePageContent('dealers', structuredClone(fallback), cms)
  assert(merged.ok, `scalar apply: ${merged.ok === false ? merged.reason : ''}`)
  if (merged.ok) {
    assert(merged.value.packages_title === 'Новые пакеты', 'CMS scalar applied')
    assert(merged.value.packages_subtitle === fallback.packages_subtitle, 'other fields preserved')
  }
}

// --- Merge: empty required string rejects atomically ---
{
  const fallback = readFixture('dealers')
  const before = structuredClone(fallback)
  const merged = mergePageContent('dealers', fallback, { packages_title: '' })
  assert(!merged.ok, 'empty required string must reject')
  assert(deepEqual(fallback, before), 'reject must not mutate fallback')
}

// --- Merge: null only for map_embed_url ---
{
  const fallback = readFixture('contacts')
  const bad = mergePageContent('contacts', fallback, { map_title: null })
  assert(!bad.ok, 'null on normal string must reject')

  const office = fallback.offices[0]
  const cms = {
    offices: fallback.offices.map((o) =>
      o.slug === office.slug ? { ...o, map_embed_url: null } : { ...o },
    ),
  }
  const good = mergePageContent('contacts', structuredClone(fallback), cms)
  assert(good.ok, `map_embed_url null: ${good.ok === false ? good.reason : ''}`)
  if (good.ok) {
    const updated = good.value.offices.find((o) => o.slug === office.slug)
    assert(updated.map_embed_url === null, 'map_embed_url applied null')
  }
}

// --- Merge: empty [] ≠ absence; content-only vs behavior-bound ---
{
  const fallback = readFixture('dealers')
  const contentEmpty = mergePageContent('dealers', structuredClone(fallback), { faq_items: [] })
  assert(contentEmpty.ok, `content-only []: ${contentEmpty.ok === false ? contentEmpty.reason : ''}`)
  if (contentEmpty.ok) assert(contentEmpty.value.faq_items.length === 0, 'content-only empty applied')

  const behaviorEmpty = mergePageContent('dealers', structuredClone(fallback), { packages: [] })
  assert(!behaviorEmpty.ok, 'behavior-bound [] must reject')
}

// --- Merge: behavior-bound unknown / duplicate / missing key ---
{
  const fallback = readFixture('dealers')
  const basePkgs = fallback.packages.map((p) => ({ ...p }))

  const unknown = mergePageContent('dealers', structuredClone(fallback), {
    packages: [...basePkgs, { ...basePkgs[0], value: 'enterprise', title: 'X' }],
  })
  assert(!unknown.ok, 'unknown package value must reject')

  const dup = mergePageContent('dealers', structuredClone(fallback), {
    packages: [basePkgs[0], { ...basePkgs[0] }, basePkgs[1], basePkgs[2]],
  })
  assert(!dup.ok, 'duplicate package value must reject')

  const missing = mergePageContent('dealers', structuredClone(fallback), {
    packages: basePkgs.slice(0, 2),
  })
  assert(!missing.ok, 'missing package value must reject')

  const reorderedCms = {
    packages: [basePkgs[2], basePkgs[0], basePkgs[1]].map((p) => ({
      ...p,
      title: `T-${p.value}`,
    })),
  }
  const ordered = mergePageContent('dealers', structuredClone(fallback), reorderedCms)
  assert(ordered.ok, `reorder cms: ${ordered.ok === false ? ordered.reason : ''}`)
  if (ordered.ok) {
    assert(
      ordered.value.packages.map((p) => p.value).join(',') ===
        fallback.packages.map((p) => p.value).join(','),
      'behavior-bound order stays fallback order',
    )
    assert(ordered.value.packages[0].title === 'T-standard', 'CMS title merged on matched key')
  }
}

// --- Merge: document_key / offices.slug / catalog_key ---
{
  for (const [arr, key] of Object.entries(BEHAVIOR_BOUND_ARRAYS)) {
    assert(typeof key === 'string' && key.length > 0, `behavior key for ${arr}`)
  }
  const docs = readFixture('documents')
  const badDoc = mergePageContent('documents', docs, {
    certificates: docs.certificates.map((c, i) =>
      i === 0 ? { ...c, document_key: 'nope' } : { ...c },
    ),
  })
  assert(!badDoc.ok, 'illegal document_key must reject')

  const hotels = readFixture('hotels')
  const badCat = mergePageContent('hotels', hotels, {
    products: [{ ...hotels.products[0], catalog_key: 'unknown-catalog' }],
  })
  assert(!badCat.ok, 'unknown catalog_key must reject')
}

// --- Merge: slides bleed on download-catalog ---
{
  const texts = readFixture('download-catalog')
  const withSlides = { ...texts, slides: [{ alt_text: 'x' }] }
  const envFails = validateNodeEnvelope(
    { data: withSlides, source: 'strapi' },
    'download-catalog',
  )
  assert(
    envFails.some((f) => /slides/.test(f)),
    'validator must reject slides on download-catalog texts',
  )
  const mergeSlides = mergePageContent('download-catalog', texts, withSlides)
  assert(!mergeSlides.ok, 'merge must reject unknown slides key vs texts fallback')
}

// --- Validator: required roots / source ---
{
  const ok = validateNodeEnvelope(
    { data: readFixture('index'), source: 'disk-snapshot' },
    'index',
  )
  assert(ok.length === 0, `index envelope: ${ok.join('; ')}`)

  const badSource = validateNodeEnvelope(
    { data: readFixture('index'), source: 'stale-cache' },
    'index',
  )
  assert(badSource.some((f) => /source/.test(f)), 'invalid source rejected')

  const missing = validateNodeEnvelope(
    { data: { hero: {} }, source: 'strapi' },
    'index',
  )
  assert(missing.some((f) => /solutions/.test(f)), 'missing required roots rejected')
}

// --- Client lifecycle ---
{
  resetPagesApiCacheForTests()
  let calls = 0
  setPagesApiFetchForTests(async (url) => {
    calls += 1
    assert(String(url) === pagesApiPath('index'), `fetch url must be ${pagesApiPath('index')}`)
    await new Promise((r) => setTimeout(r, 30))
    return {
      ok: true,
      async json() {
        return { data: readFixture('index'), source: 'strapi' }
      },
    }
  })

  const p1 = fetchPageContent('index')
  const p2 = fetchPageContent('index')
  assert(getPagesApiCacheStateForTests('index') === 'pending', 'in-flight pending')
  const [a, b] = await Promise.all([p1, p2])
  assert(calls === 1, `one in-flight fetch, got calls=${calls}`)
  assert(a.source === 'strapi' && b.source === 'strapi', 'shared success')
  assert(getPagesApiCacheStateForTests('index') === 'success', 'success cached')

  resetPagesApiCacheForTests()
  calls = 0
  setPagesApiFetchForTests(async () => {
    calls += 1
    return { ok: false, status: 503, async json() { return {} } }
  })
  let threw = false
  try {
    await fetchPageContent('hotels')
  } catch {
    threw = true
  }
  assert(threw, '503 must reject')
  assert(getPagesApiCacheStateForTests('hotels') === 'missing', 'failed entry cleared')

  setPagesApiFetchForTests(async () => ({
    ok: true,
    async json() {
      return { data: readFixture('hotels'), source: 'memory-cache' }
    },
  }))
  const retry = await fetchPageContent('hotels')
  assert(retry.source === 'memory-cache', 'retry after clear works')

  resetPagesApiCacheForTests()
  setPagesApiFetchForTests(async () => ({
    ok: true,
    async json() {
      return { data: { nope: true }, source: 'strapi' }
    },
  }))
  threw = false
  try {
    await fetchPageContent('contacts')
  } catch {
    threw = true
  }
  assert(threw, 'invalid envelope rejects')
  assert(getPagesApiCacheStateForTests('contacts') === 'missing', 'invalid not cached')

  resetPagesApiCacheForTests()
  calls = 0
  setPagesApiFetchForTests(async (url) => {
    calls += 1
    assert(String(url).startsWith('/api/pages/'), 'prefetch only /api/pages/')
    return {
      ok: true,
      async json() {
        return { data: readFixture('documents'), source: 'strapi' }
      },
    }
  })
  prefetchPageContent('documents')
  await fetchPageContent('documents')
  assert(calls === 1, 'prefetch+fetch share in-flight')

  setPagesApiFetchForTests(null)
  resetPagesApiCacheForTests()
}

// --- Mount guard ---
{
  const guard = createMountGuard()
  let updates = 0
  guard.run(() => {
    updates += 1
  })
  assert(updates === 1, 'alive run works')
  guard.cancel()
  guard.run(() => {
    updates += 1
  })
  assert(updates === 1, 'cancelled guard must not run')
}

// --- Source isolation ---
{
  const apiSrc = fs.readFileSync(path.join(root, 'src/pages/pages-api.ts'), 'utf8')
  assert(!/:1337\b/.test(apiSrc), 'pages-api must not reference :1337')
  assert(!/page-feed/.test(apiSrc), 'pages-api must not reference page-feed')
  assert(!/VITE_STRAPI_/.test(apiSrc), 'pages-api must not reference VITE_STRAPI_*')
  assert(apiSrc.includes('/api/pages/'), 'pages-api must call /api/pages/')
}

if (failures.length) {
  console.error('check:pages-cms-hydrate FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-cms-hydrate PASS')
console.log(
  ' merge=ok lifecycle=ok mountGuard=ok pagesApiIsolation=ok behaviorBound=' +
    Object.keys(BEHAVIOR_BOUND_ARRAYS).length,
)
