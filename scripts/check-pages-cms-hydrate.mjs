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
  BEHAVIOR_ARRAY_ITEMS,
  setPagesApiTimeoutMsForTests,
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

function assertUnchanged(fallback, before, label) {
  assert(deepEqual(fallback, before), `${label}: fallback must be unchanged after reject`)
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
  assertUnchanged(fallback, before, 'empty required string')
}

// --- Content-only descriptor negatives ---
{
  const fallback = readFixture('dealers')
  const before = structuredClone(fallback)

  const nullTitle = mergePageContent('dealers', fallback, {
    faq_items: [{ question: null, answer: 'a' }],
  })
  assert(!nullTitle.ok, 'contentOnlyItem title/question null must reject')
  assertUnchanged(fallback, before, 'contentOnly null title')

  // list-item title null (conditions)
  const nullListTitle = mergePageContent('dealers', fallback, {
    conditions: [{ title: null }],
  })
  assert(!nullListTitle.ok, 'contentOnlyItem.title = null must reject')
  assertUnchanged(fallback, before, 'conditions title null')

  const unknownField = mergePageContent('dealers', fallback, {
    faq_items: [{ question: 'q', answer: 'a', extranea: true }],
  })
  assert(!unknownField.ok, 'unknown field inside content-only item must reject')
  assertUnchanged(fallback, before, 'contentOnly unknown field')

  // arbitrary null must not be treated as media
  const nullAsMedia = mergePageContent('dealers', fallback, {
    faq_items: [{ question: 'q', answer: 'a', open_by_default: null }],
  })
  assert(!nullAsMedia.ok, 'null boolean must reject (not media)')
  assertUnchanged(fallback, before, 'null boolean')
}

// --- Media nullability by path ---
{
  const hotels = readFixture('hotels')
  const before = structuredClone(hotels)
  const requiredNull = mergePageContent('hotels', hotels, {
    products: hotels.products.map((p) => ({ ...p, image: null })),
  })
  assert(!requiredNull.ok, 'required media null must reject')
  assertUnchanged(hotels, before, 'required media null')

  const dealers = readFixture('dealers')
  const beforeD = structuredClone(dealers)
  // icon on offers is optional media
  const optionalNull = mergePageContent('dealers', dealers, {
    offers: dealers.offers.map((o) => ({ ...o, icon: null })),
  })
  assert(optionalNull.ok, `optional media null must accept: ${optionalNull.ok === false ? optionalNull.reason : ''}`)
  assert(deepEqual(dealers, beforeD), 'optional media accept must not mutate input fallback')
  if (optionalNull.ok) {
    assert(optionalNull.value.offers[0].icon === null, 'optional media null applied')
  }

  // document file optional
  const docs = readFixture('documents')
  const beforeDocs = structuredClone(docs)
  const fileNull = mergePageContent('documents', docs, {
    certificates: docs.certificates.map((c) => ({ ...c, file: null })),
  })
  assert(fileNull.ok, `optional file null: ${fileNull.ok === false ? fileNull.reason : ''}`)
  assertUnchanged(docs, beforeDocs, 'optional file (fallback identity)')
}

// --- Merge: null only for map_embed_url among strings ---
{
  const fallback = readFixture('contacts')
  const before = structuredClone(fallback)
  const bad = mergePageContent('contacts', fallback, { map_title: null })
  assert(!bad.ok, 'null on normal string must reject')
  assertUnchanged(fallback, before, 'map_title null')

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

  const before = structuredClone(fallback)
  const behaviorEmpty = mergePageContent('dealers', fallback, { packages: [] })
  assert(!behaviorEmpty.ok, 'behavior-bound [] must reject')
  assertUnchanged(fallback, before, 'behavior empty')
}

// --- Behavior-bound: data-driven for all paths ---
{
  /** @type {{ slug: string, arrayKey: string, stableKey: string, getFallback: () => any }[]} */
  const cases = [
    {
      slug: 'dealers',
      arrayKey: 'packages',
      stableKey: 'value',
      getFallback: () => readFixture('dealers'),
    },
    {
      slug: 'documents',
      arrayKey: 'certificates',
      stableKey: 'document_key',
      getFallback: () => readFixture('documents'),
    },
    {
      slug: 'documents',
      arrayKey: 'company_documents',
      stableKey: 'document_key',
      getFallback: () => readFixture('documents'),
    },
    {
      slug: 'index',
      arrayKey: 'docs',
      stableKey: 'document_key',
      getFallback: () => readFixture('index'),
    },
    {
      slug: 'contacts',
      arrayKey: 'offices',
      stableKey: 'slug',
      getFallback: () => readFixture('contacts'),
    },
    {
      slug: 'hotels',
      arrayKey: 'products',
      stableKey: 'catalog_key',
      getFallback: () => readFixture('hotels'),
    },
    {
      slug: 'hotels',
      arrayKey: 'contact_info',
      stableKey: 'icon_key',
      getFallback: () => readFixture('hotels'),
    },
    {
      slug: 'dealers',
      arrayKey: 'contact_info',
      stableKey: 'icon_key',
      getFallback: () => readFixture('dealers'),
    },
    {
      slug: 'contacts',
      arrayKey: 'contact_info',
      stableKey: 'icon_key',
      getFallback: () => readFixture('contacts'),
    },
  ]

  assert(
    Object.keys(BEHAVIOR_ARRAY_ITEMS).sort().join(',') ===
      Object.keys(BEHAVIOR_BOUND_ARRAYS).sort().join(','),
    'BEHAVIOR_ARRAY_ITEMS keys must match BEHAVIOR_BOUND_ARRAYS',
  )

  for (const c of cases) {
    assert(
      BEHAVIOR_ARRAY_ITEMS[c.arrayKey]?.key === c.stableKey,
      `${c.arrayKey} stable key config`,
    )
    const fallback = c.getFallback()
    const items = fallback[c.arrayKey]
    assert(Array.isArray(items) && items.length > 0, `${c.slug}.${c.arrayKey} fixture array`)
    const before = structuredClone(fallback)
    const cloneItems = () => items.map((x) => ({ ...x }))

    const empty = mergePageContent(c.slug, fallback, { [c.arrayKey]: [] })
    assert(!empty.ok, `${c.slug}.${c.arrayKey} empty must reject`)
    assertUnchanged(fallback, before, `${c.arrayKey} empty`)

    const unknown = mergePageContent(c.slug, fallback, {
      [c.arrayKey]: [
        ...cloneItems(),
        { ...items[0], [c.stableKey]: `__unknown_${c.arrayKey}__` },
      ],
    })
    assert(!unknown.ok, `${c.slug}.${c.arrayKey} unknown must reject`)
    assertUnchanged(fallback, before, `${c.arrayKey} unknown`)

    const dup = mergePageContent(c.slug, fallback, {
      [c.arrayKey]: [items[0], { ...items[0] }, ...items.slice(1)],
    })
    assert(!dup.ok, `${c.slug}.${c.arrayKey} duplicate must reject`)
    assertUnchanged(fallback, before, `${c.arrayKey} duplicate`)

    if (items.length > 1) {
      const missing = mergePageContent(c.slug, fallback, {
        [c.arrayKey]: cloneItems().slice(0, -1),
      })
      assert(!missing.ok, `${c.slug}.${c.arrayKey} missing must reject`)
      assertUnchanged(fallback, before, `${c.arrayKey} missing`)
    }
  }

  // positive reorder on packages
  const dealers = readFixture('dealers')
  const basePkgs = dealers.packages.map((p) => ({ ...p }))
  const ordered = mergePageContent('dealers', structuredClone(dealers), {
    packages: [basePkgs[2], basePkgs[0], basePkgs[1]].map((p) => ({
      ...p,
      title: `T-${p.value}`,
    })),
  })
  assert(ordered.ok, `reorder cms: ${ordered.ok === false ? ordered.reason : ''}`)
  if (ordered.ok) {
    assert(
      ordered.value.packages.map((p) => p.value).join(',') ===
        dealers.packages.map((p) => p.value).join(','),
      'behavior-bound order stays fallback order',
    )
  }
}

// --- Merge: slides bleed on download-catalog ---
{
  const texts = readFixture('download-catalog')
  const before = structuredClone(texts)
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
  assertUnchanged(texts, before, 'slides bleed')
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
  setPagesApiFetchForTests(async () => {
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

  // invalid JSON
  resetPagesApiCacheForTests()
  setPagesApiFetchForTests(async () => ({
    ok: true,
    async json() {
      throw new SyntaxError('Unexpected token')
    },
  }))
  threw = false
  try {
    await fetchPageContent('contacts')
  } catch {
    threw = true
  }
  assert(threw, 'invalid JSON must reject')
  assert(getPagesApiCacheStateForTests('contacts') === 'missing', 'invalid JSON cleared')
  setPagesApiFetchForTests(async () => ({
    ok: true,
    async json() {
      return { data: readFixture('contacts'), source: 'strapi' }
    },
  }))
  const afterJson = await fetchPageContent('contacts')
  assert(afterJson.source === 'strapi', 'retry after invalid JSON works')

  // timeout / abort
  resetPagesApiCacheForTests()
  setPagesApiTimeoutMsForTests(40)
  setPagesApiFetchForTests(async (_url, init) => {
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, 200)
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(t)
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      })
    })
    return {
      ok: true,
      async json() {
        return { data: readFixture('documents'), source: 'strapi' }
      },
    }
  })
  threw = false
  try {
    await fetchPageContent('documents')
  } catch {
    threw = true
  }
  assert(threw, 'timeout/abort must reject')
  assert(getPagesApiCacheStateForTests('documents') === 'missing', 'timeout cleared')
  setPagesApiTimeoutMsForTests(null)
  setPagesApiFetchForTests(async () => ({
    ok: true,
    async json() {
      return { data: readFixture('documents'), source: 'disk-snapshot' }
    },
  }))
  const afterTimeout = await fetchPageContent('documents')
  assert(afterTimeout.source === 'disk-snapshot', 'retry after timeout works')

  resetPagesApiCacheForTests()
  setPagesApiFetchForTests(async () => ({
    ok: true,
    async json() {
      return { data: { nope: true }, source: 'strapi' }
    },
  }))
  threw = false
  try {
    await fetchPageContent('index')
  } catch {
    threw = true
  }
  assert(threw, 'invalid envelope rejects')
  assert(getPagesApiCacheStateForTests('index') === 'missing', 'invalid not cached')

  resetPagesApiCacheForTests()
  let prefCalls = 0
  setPagesApiFetchForTests(async (url) => {
    prefCalls += 1
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
  assert(prefCalls === 1, 'prefetch+fetch share in-flight')

  setPagesApiFetchForTests(null)
  setPagesApiTimeoutMsForTests(null)
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
  ' merge=ok descriptors=ok lifecycle=timeout+json behaviorBound=' +
    Object.keys(BEHAVIOR_ARRAY_ITEMS).length,
)
