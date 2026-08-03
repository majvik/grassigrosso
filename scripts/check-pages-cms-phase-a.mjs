#!/usr/bin/env node
/**
 * Phase A gate: map allowlist + normalizer (N8), envelope validators, deep-populate descriptors.
 * Does not touch seed, feeds, or server.cjs.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MAP_EMBED_ALLOWED_HOSTS,
  MAP_EMBED_PATH_PREFIX,
  PAGES_CMS_SLUGS,
  PAGES_CMS_SOURCES,
} from './pages-cms/constants.mjs'
import { normalizeMapIframeHtml } from './pages-cms/normalize-map-iframe.mjs'
import {
  contactsFixtureToCanonical,
  validateCanonicalPageContent,
  validateFeedEnvelope,
  validateNodeEnvelope,
  validateSnapshotPayload,
} from './pages-cms/envelope.mjs'
import {
  DEEP_POPULATE_BY_SLUG,
  POPULATE_ASSERT_PATHS_BY_SLUG,
  assertNoStarPopulate,
  getDeepPopulateForSlug,
} from './pages-cms/deep-populate.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
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
  assert(typeof url === 'string' && url.startsWith('https://yandex.ru/map-widget/'), `positive map normalize failed: ${html}`)
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
assert(
  !('map_iframe_html' in (canonicalContacts.offices?.[0] || {})),
  'contacts canonical still has map_iframe_html',
)
assert(
  typeof canonicalContacts.offices[0].map_embed_url === 'string',
  'contacts canonical missing map_embed_url',
)

// Raw fixture (with map_iframe_html) must fail canonical validation
{
  const rawFails = validateCanonicalPageContent(contactsFixture, 'contacts')
  assert(rawFails.some((f) => f.includes('map_iframe_html')), 'raw contacts fixture should fail canonical (map_iframe_html)')
}

for (const slug of PAGES_CMS_SLUGS) {
  const fixture = readJson(`scripts/fixtures/pages-cms/${slug}.json`)
  const canonical =
    slug === 'contacts' ? contactsFixtureToCanonical(fixture) : { ...fixture }
  // Non-contacts fixtures do not include map_iframe_html; still validate required keys
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

// Empty Strapi-like body must not validate as feed data
assert(validateFeedEnvelope({ data: null }, 'index').length > 0, 'feed data null must fail')
assert(validateFeedEnvelope({ data: {} }, 'index').length > 0, 'empty index data must fail required keys')

// --- Deep populate descriptors ---
for (const slug of PAGES_CMS_SLUGS) {
  assert(DEEP_POPULATE_BY_SLUG[slug], `missing populate for ${slug}`)
  assert(Array.isArray(POPULATE_ASSERT_PATHS_BY_SLUG[slug]) && POPULATE_ASSERT_PATHS_BY_SLUG[slug].length > 0, `missing assert paths for ${slug}`)
  const desc = getDeepPopulateForSlug(slug)
  assert(desc.uid.startsWith('api::'), `${slug} uid`)
  const starFails = []
  assertNoStarPopulate(desc.populate, slug, starFails)
  assert(starFails.length === 0, `${slug} populate *: ${starFails.join('; ')}`)
}

// Forbidden star as explicit negative
{
  const starFails = []
  assertNoStarPopulate({ populate: '*' }, 'probe', starFails)
  assert(starFails.length > 0, 'assertNoStarPopulate must flag *')
}

if (failures.length) {
  console.error('check:pages-cms-phase-a FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-cms-phase-a PASS')
console.log(
  ` slugs=${PAGES_CMS_SLUGS.length} mapHosts=${MAP_EMBED_ALLOWED_HOSTS.join(',')} pathPrefix=${MAP_EMBED_PATH_PREFIX} n8=${n8Cases.length} sources=${PAGES_CMS_SOURCES.length}`,
)
