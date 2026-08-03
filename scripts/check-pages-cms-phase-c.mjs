#!/usr/bin/env node
/**
 * Phase C hard gate:
 * - refuse busy :1337 (no process kill)
 * - seed `.tmp` (idempotent)
 * - boot Strapi HTTP, curl six page feeds → `{ data }` + deep-populate paths
 * - N7: download-catalog slides feed unchanged after texts feed
 * No server.cjs page proxy. No strapi:sync-seed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { validateFeedEnvelope } from './pages-cms/envelope.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const strapiRoot = path.join(root, 'strapi-catalog')
const dbPath = path.join(strapiRoot, '.tmp/data.db')
const seedScript = path.join(root, 'scripts/seed-pages-cms-from-fixtures.mjs')

const {
  PAGES_CMS_SLUGS,
  POPULATE_ASSERT_PATHS_BY_SLUG,
} = require(path.join(strapiRoot, 'src/api/pages-cms/utils/deep-populate.js'))
const { syncDistRuntimeAssets } = require(path.join(strapiRoot, 'scripts/prepare-dist.cjs'))

const FEED_PATH_BY_SLUG = Object.freeze({
  index: '/api/index-page-feed',
  hotels: '/api/hotels-page-feed',
  dealers: '/api/dealers-page-feed',
  contacts: '/api/contacts-page-feed',
  documents: '/api/documents-page-feed',
  'download-catalog': '/api/download-catalog-page-feed',
})

const SLIDES_FEED_PATH = '/api/download-catalog-feed'
const STRAPI_BASE = process.env.PAGES_CMS_PHASE_C_BASE_URL || 'http://127.0.0.1:1337'

const failures = []
function fail(message) {
  failures.push(message)
}
function assert(cond, message) {
  if (!cond) fail(message)
}

function portInUse(port) {
  const result = spawnSync('lsof', [`-iTCP:${port}`, '-sTCP:LISTEN', '-n', '-P'], {
    encoding: 'utf8',
  })
  return result.status === 0 && Boolean(result.stdout && result.stdout.trim())
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** Assert dotted path exists; arrays require non-empty and every element continues the path. */
function pathPresent(data, dotted) {
  const parts = dotted.split('.')
  function walk(node, idx) {
    if (idx >= parts.length) return node !== undefined && node !== null
    if (Array.isArray(node)) {
      if (node.length === 0) return false
      return node.every((item) => walk(item, idx))
    }
    if (!isPlainObject(node)) return false
    const key = parts[idx]
    if (!(key in node)) return false
    return walk(node[key], idx + 1)
  }
  return walk(data, 0)
}

async function fetchJson(urlPath) {
  const url = `${STRAPI_BASE}${urlPath}`
  const res = await fetch(url)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, body, url }
}

function stableStringify(value) {
  return JSON.stringify(value)
}

assert(fs.existsSync(dbPath), `missing ${dbPath}`)

if (portInUse(1337)) {
  fail(
    'port :1337 is in use — stop Strapi yourself, then re-run check:pages-cms-phase-c (harness will not kill processes)',
  )
  console.error('check:pages-cms-phase-c FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

// Seed into .tmp (createStrapi load/destroy — no HTTP listen)
{
  const seeded = spawnSync(process.execPath, [seedScript], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env },
  })
  assert(seeded.status === 0, `seed failed: ${seeded.stderr || seeded.stdout}`)
}

syncDistRuntimeAssets(strapiRoot)

const prevCwd = process.cwd()
process.chdir(strapiRoot)
const { createStrapi } = require(path.join(strapiRoot, 'node_modules/@strapi/strapi'))

let app
try {
  app = await createStrapi({
    appDir: strapiRoot,
    distDir: path.join(strapiRoot, 'dist'),
  }).load()
  await app.listen()

  // N7 baseline: slides feed before / after texts feed must match
  const slidesBefore = await fetchJson(SLIDES_FEED_PATH)
  assert(slidesBefore.status === 200, `slides feed HTTP ${slidesBefore.status}`)
  assert(isPlainObject(slidesBefore.body), 'slides feed body must be object')
  assert(Array.isArray(slidesBefore.body.slides), 'slides feed must include slides[]')
  assert('autoplayMs' in slidesBefore.body, 'slides feed missing autoplayMs')
  assert('displayMode' in slidesBefore.body, 'slides feed missing displayMode')

  for (const slug of PAGES_CMS_SLUGS) {
    const feedPath = FEED_PATH_BY_SLUG[slug]
    const result = await fetchJson(feedPath)
    assert(result.status === 200, `${slug} feed HTTP ${result.status} at ${result.url}`)
    const envelopeFails = validateFeedEnvelope(result.body, slug)
    for (const msg of envelopeFails) fail(msg)

    if (isPlainObject(result.body) && isPlainObject(result.body.data)) {
      const assertPaths = POPULATE_ASSERT_PATHS_BY_SLUG[slug] || []
      for (const dotted of assertPaths) {
        assert(
          pathPresent(result.body.data, dotted),
          `${slug}: deep-populate path missing after seed: ${dotted}`,
        )
      }

      if (slug === 'download-catalog') {
        assert(
          !('slides' in result.body.data),
          'download-catalog texts feed must not include slides',
        )
      }
      if (slug === 'contacts') {
        const offices = result.body.data.offices
        assert(Array.isArray(offices) && offices.length > 0, 'contacts offices empty')
        for (const [i, office] of offices.entries()) {
          assert(!('map_iframe_html' in office), `contacts offices[${i}] leaked map_iframe_html`)
          assert('map_embed_url' in office, `contacts offices[${i}] missing map_embed_url`)
        }
      }
    }
  }

  const slidesAfter = await fetchJson(SLIDES_FEED_PATH)
  assert(slidesAfter.status === 200, `slides feed after texts HTTP ${slidesAfter.status}`)
  assert(
    stableStringify(slidesBefore.body) === stableStringify(slidesAfter.body),
    'N7: download-catalog slides feed changed after texts page-feed requests',
  )
} catch (error) {
  fail(`Phase C runtime error: ${error && error.stack ? error.stack : error}`)
} finally {
  if (app) {
    try {
      await app.destroy()
    } catch (destroyError) {
      fail(`Strapi destroy failed: ${destroyError.message}`)
    }
  }
  process.chdir(prevCwd)
}

if (failures.length) {
  console.error('check:pages-cms-phase-c FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-cms-phase-c PASS')
console.log(
  ` feeds=${PAGES_CMS_SLUGS.length} deepPopulate=ok mapStrip=ok textsIsolation=ok N7=ok`,
)
