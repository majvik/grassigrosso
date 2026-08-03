#!/usr/bin/env node
/**
 * Phase 4A unit harness: schema-derived merge, coverage, lifecycle, mount guard.
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
  applyFieldDescForTests,
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
  PAGES_CMS_SLUGS,
  getPageRootSchema,
  resolveComponentSchema,
  collectUndescribedFixturePaths,
  listRequiredMediaPaths,
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

// --- Coverage gate: every fixture path classified by schema ---
{
  for (const slug of PAGES_CMS_SLUGS) {
    const data = readFixture(slug)
    const undescribed = collectUndescribedFixturePaths(slug, data)
    assert(
      undescribed.length === 0,
      `${slug} coverage: ${undescribed.slice(0, 5).join('; ')}`,
    )
  }
}

// --- Positive parity: merge(fixture, fixture) ok for all six ---
{
  for (const slug of PAGES_CMS_SLUGS) {
    const fixture = readFixture(slug)
    const before = structuredClone(fixture)
    const merged = mergePageContent(slug, fixture, structuredClone(fixture))
    assert(merged.ok, `parity ${slug}: ${merged.ok === false ? merged.reason : ''}`)
    assertUnchanged(fixture, before, `parity ${slug}`)
    if (merged.ok) {
      assert(deepEqual(merged.value, fixture), `parity ${slug} value equals fixture`)
    }
  }
}

// --- Schema-derived string/media policy ---
{
  const hotelsRoot = getPageRootSchema('hotels')
  assert(hotelsRoot.kind === 'object', 'hotels root object')
  const heroDesc = resolveComponentSchema('page.hero')
  assert(heroDesc.kind === 'object', 'page.hero object')
  assert(heroDesc.fields.image.kind === 'media' && heroDesc.fields.image.optional === true, 'hero.image optional')
  assert(
    heroDesc.fields.description.kind === 'string' && heroDesc.fields.description.optionalEmpty === true,
    'hero.description optionalEmpty',
  )

  const productDesc = resolveComponentSchema('page.hotel-product')
  assert(productDesc.kind === 'object' && productDesc.fields.image.optional === true, 'product.image optional')
  const collectionDesc = resolveComponentSchema('page.collection-card')
  assert(
    collectionDesc.kind === 'object' && collectionDesc.fields.image.optional === true,
    'collection.image optional',
  )
  const heroMedia = resolveComponentSchema('page.hero-media')
  assert(heroMedia.kind === 'object', 'hero-media')
  for (const k of ['poster', 'video_desktop', 'video_mobile']) {
    assert(heroMedia.fields[k]?.kind === 'media' && heroMedia.fields[k].optional === true, `${k} optional media`)
  }

  const hotels = readFixture('hotels')
  const beforeH = structuredClone(hotels)
  const heroImgNull = mergePageContent('hotels', hotels, {
    hero: { ...hotels.hero, image: null },
  })
  assert(heroImgNull.ok, `optional hero.image null: ${heroImgNull.ok === false ? heroImgNull.reason : ''}`)
  assertUnchanged(hotels, beforeH, 'hero.image null')

  const productNull = mergePageContent('hotels', hotels, {
    products: hotels.products.map((p) => ({ ...p, image: null })),
  })
  assert(productNull.ok, `optional product.image null: ${productNull.ok === false ? productNull.reason : ''}`)

  const index = readFixture('index')
  const beforeI = structuredClone(index)
  const collNull = mergePageContent('index', index, {
    collections: index.collections.map((c) => ({ ...c, image: null })),
  })
  assert(collNull.ok, `optional collection.image null: ${collNull.ok === false ? collNull.reason : ''}`)
  assertUnchanged(index, beforeI, 'collection.image null')

  const posterNull = mergePageContent('index', index, {
    hero: { ...index.hero, poster: null, video_desktop: null, video_mobile: null },
  })
  assert(posterNull.ok, `optional poster/video null: ${posterNull.ok === false ? posterNull.reason : ''}`)

  const descEmpty = mergePageContent('hotels', hotels, {
    hero: { ...hotels.hero, description: '' },
  })
  assert(descEmpty.ok, `optional hero.description "": ${descEmpty.ok === false ? descEmpty.reason : ''}`)

  const titleEmpty = mergePageContent('hotels', hotels, {
    hero: { ...hotels.hero, title: '' },
  })
  assert(!titleEmpty.ok, 'required hero.title "" must reject')
  assertUnchanged(hotels, beforeH, 'required title empty')

  const requiredMedia = PAGES_CMS_SLUGS.flatMap((s) => listRequiredMediaPaths(s))
  assert(requiredMedia.length === 0, `unexpected required media: ${requiredMedia.join(',')}`)
  const synth = applyFieldDescForTests('synth.image', null, { kind: 'media', optional: false })
  assert(!synth.ok, 'synthetic required media null must reject')
  const synthOpt = applyFieldDescForTests('synth.image', null, { kind: 'media', optional: true })
  assert(synthOpt.ok && synthOpt.value === null, 'synthetic optional media null accept')

  for (const uid of [
    'page.hero',
    'page.hero-media',
    'page.list-item',
    'page.faq-item',
    'page.hotel-product',
    'page.collection-card',
    'page.dealer-package',
    'page.office',
    'page.contact-info',
    'page.document-card',
  ]) {
    const desc = resolveComponentSchema(uid)
    assert(desc.kind === 'object', uid)
    const sample = {}
    for (const [k, f] of Object.entries(desc.fields)) {
      if (f.kind === 'string' && !f.optional) sample[k] = 'x'
      else if (f.kind === 'nullableString') sample[k] = null
      else if (f.kind === 'boolean') sample[k] = false
      else if (f.kind === 'number') sample[k] = 1
      else if (f.kind === 'media') sample[k] = null
      else if (f.kind === 'contentArray') sample[k] = []
      else if (f.kind === 'behaviorArray') sample[k] = []
    }
    sample.__unknown__ = true
    const hit = applyFieldDescForTests(uid, sample, desc)
    assert(!hit.ok, `${uid} unknown key must reject`)
  }
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
  assert(!nullTitle.ok, 'contentOnlyItem question null must reject')
  assertUnchanged(fallback, before, 'contentOnly null title')

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

  const nullAsMedia = mergePageContent('dealers', fallback, {
    faq_items: [{ question: 'q', answer: 'a', open_by_default: null }],
  })
  assert(!nullAsMedia.ok, 'null boolean must reject (not media)')
  assertUnchanged(fallback, before, 'null boolean')
}

// --- optional media null on offers.icon / documents.file ---
{
  const dealers = readFixture('dealers')
  const beforeD = structuredClone(dealers)
  const optionalNull = mergePageContent('dealers', dealers, {
    offers: dealers.offers.map((o) => ({ ...o, icon: null })),
  })
  assert(optionalNull.ok, `optional media null must accept: ${optionalNull.ok === false ? optionalNull.reason : ''}`)
  assertUnchanged(dealers, beforeD, 'optional media accept')

  const docs = readFixture('documents')
  const beforeDocs = structuredClone(docs)
  const fileNull = mergePageContent('documents', docs, {
    certificates: docs.certificates.map((c) => ({ ...c, file: null })),
  })
  assert(fileNull.ok, `optional file null: ${fileNull.ok === false ? fileNull.reason : ''}`)
  assertUnchanged(docs, beforeDocs, 'optional file')
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
  ' coverage=ok parity=6 schemaMedia=path lifecycle=timeout+json behaviorBound=' +
    Object.keys(BEHAVIOR_ARRAY_ITEMS).length,
)
