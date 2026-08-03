#!/usr/bin/env node
/**
 * Phase A gate: map allowlist + normalizer (N8), envelope validators, deep-populate,
 * download-catalog texts isolation, prepare-dist runtime utils presence.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  PAGES_CMS_SOURCES,
  PAGES_CMS_SLUGS,
  contactsFixtureToCanonical,
  downloadCatalogFixtureToTextsCanonical,
  validateCanonicalPageContent,
  validateFeedEnvelope,
  validateNodeEnvelope,
  validateSnapshotPayload,
} from './pages-cms/envelope.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const pagesCmsUtilsSrc = path.join(root, 'strapi-catalog/src/api/pages-cms/utils')

const {
  MAP_EMBED_ALLOWED_HOSTS,
  MAP_EMBED_PATH_PREFIX,
  normalizeMapIframeHtml,
} = require(path.join(pagesCmsUtilsSrc, 'normalize-map-iframe.js'))
const {
  DEEP_POPULATE_BY_SLUG,
  POPULATE_ASSERT_PATHS_BY_SLUG,
  DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS,
  assertNoStarPopulate,
  getDeepPopulateForSlug,
} = require(path.join(pagesCmsUtilsSrc, 'deep-populate.js'))
const { syncDistRuntimeAssets } = require(path.join(root, 'strapi-catalog/scripts/prepare-dist.cjs'))

const failures = []

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))
}

function fixtureToCanonical(slug, fixture) {
  if (slug === 'contacts') return contactsFixtureToCanonical(fixture)
  if (slug === 'download-catalog') return downloadCatalogFixtureToTextsCanonical(fixture)
  return { ...fixture }
}

// --- Map allowlist contract ---
assert(
  MAP_EMBED_ALLOWED_HOSTS.length === 1 && MAP_EMBED_ALLOWED_HOSTS[0] === 'yandex.ru',
  'MAP_EMBED_ALLOWED_HOSTS must be exactly ["yandex.ru"] for Phase A',
)
assert(MAP_EMBED_PATH_PREFIX === '/map-widget/', 'MAP_EMBED_PATH_PREFIX must be /map-widget/')

const contactsFixture = readJson('scripts/fixtures/pages-cms/contacts.json')
const positiveIframes = contactsFixture.offices.map((o) => o.map_iframe_html)

for (const html of positiveIframes) {
  const url = normalizeMapIframeHtml(html)
  assert(
    typeof url === 'string' && url.startsWith('https://yandex.ru/map-widget/'),
    `positive map normalize failed: ${html}`,
  )
}

/** @type {Array<[string, string]>} */
const n8Cases = [
  ['srcdoc', '<iframe srcdoc="<script>alert(1)</script>" src="https://yandex.ru/map-widget/v1/"></iframe>'],
  ['multi-iframe', `${positiveIframes[0]}${positiveIframes[1]}`],
  ['http-scheme', '<iframe src="http://yandex.ru/map-widget/v1/?ll=1%2C2"></iframe>'],
  ['credentials', '<iframe src="https://user:pass@yandex.ru/map-widget/v1/?ll=1%2C2"></iframe>'],
  ['non-default-port', '<iframe src="https://yandex.ru:8443/map-widget/v1/?ll=1%2C2"></iframe>'],
  ['wrong-host-subdomain', '<iframe src="https://maps.yandex.ru/map-widget/v1/?ll=1%2C2"></iframe>'],
  ['wrong-host-other', '<iframe src="https://evil.example/map-widget/v1/?ll=1%2C2"></iframe>'],
  ['wrong-path', '<iframe src="https://yandex.ru/maps/100/moscow/?ll=1%2C2"></iframe>'],
  ['malformed-url', '<iframe src="not a url"></iframe>'],
  ['no-iframe', '<div src="https://yandex.ru/map-widget/v1/"></div>'],
  ['empty', ''],
  ['missing-src', '<iframe width="100%"></iframe>'],
]

for (const [name, html] of n8Cases) {
  assert(normalizeMapIframeHtml(html) === null, `N8 ${name}: expected null`)
}

// --- Envelope validators ---
assert(PAGES_CMS_SOURCES.join(',') === 'strapi,memory-cache,disk-snapshot', 'source vocabulary mismatch')

const canonicalContacts = contactsFixtureToCanonical(contactsFixture)
assert(
  validateCanonicalPageContent(canonicalContacts, 'contacts').length === 0,
  `contacts canonical invalid: ${validateCanonicalPageContent(canonicalContacts, 'contacts').join('; ')}`,
)

{
  const rawFails = validateCanonicalPageContent(contactsFixture, 'contacts')
  assert(
    rawFails.some((f) => f.includes('map_iframe_html')),
    'raw contacts fixture should fail canonical (map_iframe_html)',
  )
}

for (const slug of PAGES_CMS_SLUGS) {
  const fixture = readJson(`scripts/fixtures/pages-cms/${slug}.json`)
  const canonical = fixtureToCanonical(slug, fixture)
  const canonFails = validateCanonicalPageContent(canonical, slug)
  assert(canonFails.length === 0, `${slug} canonical: ${canonFails.join('; ')}`)

  const feedOk = validateFeedEnvelope({ data: canonical }, slug)
  assert(feedOk.length === 0, `${slug} feed ok: ${feedOk.join('; ')}`)

  const feedBadSource = validateFeedEnvelope({ data: canonical, source: 'strapi' }, slug)
  assert(feedBadSource.some((f) => f.includes('source')), `${slug} feed must reject source`)

  const snapOk = validateSnapshotPayload(canonical, slug)
  assert(snapOk.length === 0, `${slug} snapshot ok: ${snapOk.join('; ')}`)

  const snapWrapped = validateSnapshotPayload({ data: canonical }, slug)
  assert(snapWrapped.length > 0, `${slug} snapshot must reject { data } wrapper`)

  for (const source of PAGES_CMS_SOURCES) {
    const nodeOk = validateNodeEnvelope({ data: canonical, source }, slug)
    assert(nodeOk.length === 0, `${slug} node ${source}: ${nodeOk.join('; ')}`)
  }

  const nodeBadSource = validateNodeEnvelope({ data: canonical, source: 'stale-cache' }, slug)
  assert(nodeBadSource.some((f) => f.includes('invalid source')), `${slug} node must reject stale-cache`)

  const nodeMissingSource = validateNodeEnvelope({ data: canonical }, slug)
  assert(nodeMissingSource.some((f) => f.includes('missing source')), `${slug} node must require source`)
}

assert(validateFeedEnvelope({ data: null }, 'index').length > 0, 'feed data null must fail')
assert(validateFeedEnvelope({ data: {} }, 'index').length > 0, 'empty index data must fail required keys')

// --- download-catalog texts isolation (negative) ---
{
  const fixture = readJson('scripts/fixtures/pages-cms/download-catalog.json')
  assert('slides' in fixture, 'fixture should still contain slides for CMS entity')
  const rawFails = validateCanonicalPageContent(fixture, 'download-catalog')
  for (const key of DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS) {
    assert(
      rawFails.some((f) => f.includes(`"${key}"`)),
      `download-catalog raw fixture must FAIL on forbidden key ${key}`,
    )
  }
  const withSlides = downloadCatalogFixtureToTextsCanonical(fixture)
  withSlides.slides = []
  assert(
    validateCanonicalPageContent(withSlides, 'download-catalog').some((f) => f.includes('"slides"')),
    'texts payload with slides must FAIL',
  )
  const withMode = downloadCatalogFixtureToTextsCanonical(fixture)
  withMode.media_display_mode = 'slider'
  assert(
    validateCanonicalPageContent(withMode, 'download-catalog').some((f) =>
      f.includes('"media_display_mode"'),
    ),
    'texts payload with media_display_mode must FAIL',
  )
  const withAutoplay = downloadCatalogFixtureToTextsCanonical(fixture)
  withAutoplay.slider_autoplay_ms = 6500
  assert(
    validateCanonicalPageContent(withAutoplay, 'download-catalog').some((f) =>
      f.includes('"slider_autoplay_ms"'),
    ),
    'texts payload with slider_autoplay_ms must FAIL',
  )

  const populate = DEEP_POPULATE_BY_SLUG['download-catalog']
  assert(populate && !('slides' in populate), 'download-catalog populate must not include slides')
  assert(
    !POPULATE_ASSERT_PATHS_BY_SLUG['download-catalog'].some((p) => p.startsWith('slides')),
    'download-catalog assert paths must not include slides',
  )
  assert(
    !POPULATE_ASSERT_PATHS_BY_SLUG['download-catalog'].includes('media_display_mode'),
    'download-catalog assert paths must not include media_display_mode',
  )
}

// --- Deep populate descriptors ---
for (const slug of PAGES_CMS_SLUGS) {
  assert(DEEP_POPULATE_BY_SLUG[slug], `missing populate for ${slug}`)
  assert(
    Array.isArray(POPULATE_ASSERT_PATHS_BY_SLUG[slug]) && POPULATE_ASSERT_PATHS_BY_SLUG[slug].length > 0,
    `missing assert paths for ${slug}`,
  )
  const desc = getDeepPopulateForSlug(slug)
  assert(desc.uid.startsWith('api::'), `${slug} uid`)
  const starFails = []
  assertNoStarPopulate(desc.populate, slug, starFails)
  assert(starFails.length === 0, `${slug} populate *: ${starFails.join('; ')}`)
}

{
  const starFails = []
  assertNoStarPopulate({ populate: '*' }, 'probe', starFails)
  assert(starFails.length > 0, 'assertNoStarPopulate must flag *')
}

// --- prepare-dist copies pages-cms utils into dist ---
{
  const runtimeFiles = [
    'normalize-map-iframe.js',
    'deep-populate.js',
    'map-allowlist.js',
  ]
  for (const file of runtimeFiles) {
    assert(fs.existsSync(path.join(pagesCmsUtilsSrc, file)), `missing src util ${file}`)
  }
  syncDistRuntimeAssets(path.join(root, 'strapi-catalog'))
  const distUtils = path.join(root, 'strapi-catalog/dist/src/api/pages-cms/utils')
  for (const file of runtimeFiles) {
    assert(fs.existsSync(path.join(distUtils, file)), `prepare-dist missing dist util ${file}`)
  }
}

// scripts/ must not own the Strapi runtime copies
assert(
  !fs.existsSync(path.join(root, 'scripts/pages-cms/normalize-map-iframe.mjs')),
  'normalize-map-iframe must not live under scripts/pages-cms',
)
assert(
  !fs.existsSync(path.join(root, 'scripts/pages-cms/deep-populate.mjs')),
  'deep-populate must not live under scripts/pages-cms',
)

if (failures.length) {
  console.error('check:pages-cms-phase-a FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-cms-phase-a PASS')
console.log(
  ` slugs=${PAGES_CMS_SLUGS.length} mapHosts=${MAP_EMBED_ALLOWED_HOSTS.join(',')} pathPrefix=${MAP_EMBED_PATH_PREFIX} n8=${n8Cases.length} downloadTextsIsolation=ok distUtils=ok`,
)
