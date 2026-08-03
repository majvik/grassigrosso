#!/usr/bin/env node
/**
 * Phase B gate: media preflight, seed×2 idempotency, missing-file negative,
 * catalog identity stability. No strapi:sync-seed. No feeds/server.cjs.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { collectMediaUrls, resolveFixtureMediaUrl } from './pages-cms/media-resolve.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const strapiRoot = path.join(root, 'strapi-catalog')
const dbPath = path.join(strapiRoot, '.tmp/data.db')
const seedScript = path.join(root, 'scripts/seed-pages-cms-from-fixtures.mjs')

const { PAGES_CMS_SLUGS } = require(path.join(strapiRoot, 'src/api/pages-cms/utils/map-allowlist.js'))
const { DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS } = require(
  path.join(strapiRoot, 'src/api/pages-cms/utils/deep-populate.js'),
)

const failures = []
function fail(message) {
  failures.push(message)
}
function assert(cond, message) {
  if (!cond) fail(message)
}

function runNode(args, opts = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env || {}) },
  })
  return result
}

function portInUse(port) {
  const result = spawnSync('lsof', [`-iTCP:${port}`, '-sTCP:LISTEN', '-n', '-P'], {
    encoding: 'utf8',
  })
  return result.status === 0 && Boolean(result.stdout && result.stdout.trim())
}

function stopStrapiIfNeeded() {
  if (!portInUse(1337)) return false
  spawnSync('pkill', ['-f', 'strapi develop'], { encoding: 'utf8' })
  spawnSync('bash', ['-lc', 'pids=$(lsof -t -iTCP:1337 -sTCP:LISTEN 2>/dev/null || true); [ -n "$pids" ] && kill $pids || true'], {
    encoding: 'utf8',
  })
  // wait up to ~15s
  for (let i = 0; i < 30; i += 1) {
    if (!portInUse(1337)) return true
    spawnSync('sleep', ['0.5'])
  }
  return !portInUse(1337)
}

assert(fs.existsSync(dbPath), `missing ${dbPath}`)

// --- Missing-file negative (before any seed mutation) ---
{
  let threw = false
  try {
    resolveFixtureMediaUrl('/definitely-missing-pages-cms-asset-xyz.png', { repoRoot: root })
  } catch (error) {
    threw = /Missing media file/.test(String(error.message))
  }
  assert(threw, 'missing-file resolver must throw before DB mutation')
}

// --- Preflight all fixture media ---
{
  const pre = runNode([seedScript, '--preflight-only'])
  assert(pre.status === 0, `preflight-only failed: ${pre.stderr || pre.stdout}`)
  const payload = JSON.parse(pre.stdout)
  assert(payload.ok === true, 'preflight payload ok')
  assert(payload.mediaCount > 0, 'preflight mediaCount')
}

// Ensure exclusive DB access
{
  const stopped = stopStrapiIfNeeded()
  if (portInUse(1337)) {
    fail('Could not free :1337 for exclusive seed access')
  } else if (stopped) {
    // ok
  }
}

function parseSeedStdout(stdout) {
  const start = stdout.indexOf('{')
  if (start < 0) throw new Error(`no JSON in seed stdout: ${stdout.slice(0, 400)}`)
  return JSON.parse(stdout.slice(start))
}

const first = runNode([seedScript])
assert(first.status === 0, `seed #1 failed: ${first.stderr || first.stdout}`)
let firstJson
try {
  firstJson = parseSeedStdout(first.stdout)
} catch (error) {
  fail(`seed #1 parse: ${error.message}`)
}

const second = runNode([seedScript])
assert(second.status === 0, `seed #2 failed: ${second.stderr || second.stdout}`)
let secondJson
try {
  secondJson = parseSeedStdout(second.stdout)
} catch (error) {
  fail(`seed #2 parse: ${error.message}`)
}

if (firstJson && secondJson) {
  assert(firstJson.ok && secondJson.ok, 'seed ok flags')
  assert(
    firstJson.uploadsAfter === secondJson.uploadsAfter,
    `upload row count drifted across seed×2: ${firstJson.uploadsAfter} → ${secondJson.uploadsAfter}`,
  )
  assert(
    secondJson.uploadsAfter === secondJson.uploadsBefore ||
      secondJson.uploadsAfter === firstJson.uploadsAfter,
    'second seed should not create new pages-cms uploads (idempotent)',
  )
  assert(
    JSON.stringify(firstJson.catalog?.productSample) === JSON.stringify(secondJson.catalog?.productSample),
    'catalog product sample drifted',
  )
  assert(firstJson.catalog?.productCount === secondJson.catalog?.productCount, 'catalog productCount drifted')
  assert(firstJson.mediaFiles === secondJson.mediaFiles, 'mediaFiles count drifted')
}

// download-catalog fixture still has slides in file, but seed texts path must not require slide media from uploads cover for texts-only
{
  const fixture = JSON.parse(
    fs.readFileSync(path.join(root, 'scripts/fixtures/pages-cms/download-catalog.json'), 'utf8'),
  )
  for (const key of DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS) {
    assert(key in fixture, `fixture keeps ${key} for CMS entity shape`)
  }
  const { slides, media_display_mode, slider_autoplay_ms, ...texts } = fixture
  void slides
  void media_display_mode
  void slider_autoplay_ms
  const urls = collectMediaUrls(texts)
  assert(
    !urls.some((u) => u.includes('download_catalog_cover')),
    'texts-only media set must not include slide cover',
  )
  assert(urls.includes('/documents/Catalog_v1.2.pdf'), 'texts media includes catalog_pdf')
}

assert(PAGES_CMS_SLUGS.length === 6, 'six slugs')

// sync-seed must not have been invoked by this harness
assert(!process.env.PAGES_CMS_RAN_SYNC_SEED, 'strapi:sync-seed must not run')

if (failures.length) {
  console.error('check:pages-cms-phase-b FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-cms-phase-b PASS')
console.log(
  ` seed×2 ok uploads=${secondJson?.uploadsAfter} products=${secondJson?.catalog?.productCount} mediaFiles=${secondJson?.mediaFiles}`,
)
