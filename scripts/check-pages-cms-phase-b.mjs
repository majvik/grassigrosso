#!/usr/bin/env node
/**
 * Phase B hard gate:
 * - missing-file negative (pre-mutation)
 * - refuse busy :1337 (no process kill)
 * - N6: component-row counts, orphans, logical digests, upload stability across seed×2
 * - injected-failure rollback: DB + catalog + upload rows + upload FS derivatives
 * No strapi:sync-seed. No feeds/server.cjs.
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
const uploadsDir = path.join(strapiRoot, 'public/uploads')
const seedScript = path.join(root, 'scripts/seed-pages-cms-from-fixtures.mjs')

const { PAGES_CMS_SLUGS } = require(path.join(strapiRoot, 'src/api/pages-cms/utils/map-allowlist.js'))
const { DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS } = require(
  path.join(strapiRoot, 'src/api/pages-cms/utils/deep-populate.js'),
)
const {
  countPageComponentRows,
  findOrphanPageComponents,
  countPagesCmsUploadRows,
  listPagesCmsUploadRows,
  catalogGuardFromDb,
  pageEntityDigests,
  snapshotUploadsFs,
} = require('./pages-cms/db-inspect.cjs')

const failures = []
function fail(message) {
  failures.push(message)
}
function assert(cond, message) {
  if (!cond) fail(message)
}

function runNode(args, opts = {}) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env || {}) },
  })
}

function portInUse(port) {
  const result = spawnSync('lsof', [`-iTCP:${port}`, '-sTCP:LISTEN', '-n', '-P'], {
    encoding: 'utf8',
  })
  return result.status === 0 && Boolean(result.stdout && result.stdout.trim())
}

function snapshotState(label) {
  return {
    label,
    components: countPageComponentRows(dbPath),
    orphans: findOrphanPageComponents(dbPath),
    uploadRows: countPagesCmsUploadRows(dbPath),
    uploadNames: listPagesCmsUploadRows(dbPath).map((r) => r.name),
    catalog: catalogGuardFromDb(dbPath),
    digests: pageEntityDigests(dbPath),
    uploadFs: snapshotUploadsFs(uploadsDir),
  }
}

function assertStateEqual(before, after, context) {
  assert(
    before.components.total === after.components.total,
    `${context}: component total ${before.components.total} → ${after.components.total}`,
  )
  assert(
    JSON.stringify(before.components.counts) === JSON.stringify(after.components.counts),
    `${context}: component-row counts drifted`,
  )
  assert(after.orphans.length === 0, `${context}: orphan page components: ${after.orphans.length}`)
  assert(
    before.orphans.length === after.orphans.length,
    `${context}: orphan count drifted ${before.orphans.length} → ${after.orphans.length}`,
  )
  assert(before.uploadRows === after.uploadRows, `${context}: upload rows ${before.uploadRows} → ${after.uploadRows}`)
  assert(
    JSON.stringify(before.uploadNames) === JSON.stringify(after.uploadNames),
    `${context}: upload names drifted`,
  )
  assert(
    JSON.stringify(before.catalog) === JSON.stringify(after.catalog),
    `${context}: catalog guard drifted`,
  )
  assert(
    JSON.stringify(before.digests) === JSON.stringify(after.digests),
    `${context}: logical page digests drifted (roots/links/components/media)`,
  )
  assert(
    JSON.stringify(before.uploadFs) === JSON.stringify(after.uploadFs),
    `${context}: upload FS pages_cms_* drifted (${after.uploadFs.length - before.uploadFs.length})`,
  )
}

function parseSeedStdout(stdout) {
  const start = stdout.lastIndexOf('\n{') >= 0 ? stdout.lastIndexOf('\n{') + 1 : stdout.indexOf('{')
  if (start < 0) throw new Error(`no JSON in seed stdout: ${stdout.slice(0, 400)}`)
  return JSON.parse(stdout.slice(start))
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

// --- Refuse busy port (never kill) ---
if (portInUse(1337)) {
  fail(
    'port :1337 is in use — stop Strapi yourself, then re-run check:pages-cms-phase-b (harness will not kill processes)',
  )
  console.error('check:pages-cms-phase-b FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

const beforeAll = snapshotState('before')
assert(beforeAll.orphans.length === 0, `pre-existing orphan page components: ${JSON.stringify(beforeAll.orphans.slice(0, 5))}`)

// --- Injected-failure rollback regression ---
{
  const beforeInject = snapshotState('before-inject')
  const injected = runNode([seedScript, '--inject-failure'], {
    env: { PAGES_CMS_SEED_INJECT_FAILURE: '1' },
  })
  assert(injected.status === 42, `inject-failure expected exit 42, got ${injected.status}: ${injected.stderr || injected.stdout}`)
  assert(/injected failure after mutation/.test(injected.stderr || ''), 'inject message missing')
  assert(/"restored":\s*true/.test(injected.stderr || injected.stdout || ''), 'restore marker missing')
  const afterInject = snapshotState('after-inject-restore')
  assertStateEqual(beforeInject, afterInject, 'inject-failure rollback')
}

// --- Seed ×2 with N6 ---
const afterInjectBaseline = snapshotState('baseline-before-seed1')

const first = runNode([seedScript])
assert(first.status === 0, `seed #1 failed: ${first.stderr || first.stdout}`)
let firstJson
try {
  firstJson = parseSeedStdout(first.stdout)
} catch (error) {
  fail(`seed #1 parse: ${error.message}`)
}
const after1 = snapshotState('after-seed1')
assert(after1.orphans.length === 0, `orphans after seed #1: ${JSON.stringify(after1.orphans.slice(0, 5))}`)
assert(after1.components.total > 0, 'component rows should exist after seed #1')

const second = runNode([seedScript])
assert(second.status === 0, `seed #2 failed: ${second.stderr || second.stdout}`)
let secondJson
try {
  secondJson = parseSeedStdout(second.stdout)
} catch (error) {
  fail(`seed #2 parse: ${error.message}`)
}
const after2 = snapshotState('after-seed2')

assertStateEqual(after1, after2, 'N6 seed×2')
assert(after2.orphans.length === 0, 'N6 orphans after seed #2')

if (firstJson && secondJson) {
  assert(firstJson.ok && secondJson.ok, 'seed ok flags')
  assert(firstJson.uploadsAfter === secondJson.uploadsAfter, 'seed JSON uploadsAfter drift')
  assert(
    secondJson.uploadsAfter === secondJson.uploadsBefore ||
      secondJson.uploadsAfter === firstJson.uploadsAfter,
    'second seed must not create new pages-cms uploads',
  )
  assert(firstJson.catalog?.productCount === secondJson.catalog?.productCount, 'catalog productCount drift')
}

// download-catalog texts isolation still holds for media collection
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
  assert(!urls.some((u) => u.includes('download_catalog_cover')), 'texts-only must not include slide cover')
  assert(urls.includes('/documents/Catalog_v1.2.pdf'), 'texts media includes catalog_pdf')
}

assert(PAGES_CMS_SLUGS.length === 9, 'nine slugs')
assert(!process.env.PAGES_CMS_RAN_SYNC_SEED, 'strapi:sync-seed must not run')

// catalog must remain stable vs pre-seed baseline for product identities
assert(
  JSON.stringify(afterInjectBaseline.catalog) === JSON.stringify(after2.catalog),
  'catalog identities changed across Phase B seeds',
)

if (failures.length) {
  console.error('check:pages-cms-phase-b FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-cms-phase-b PASS')
console.log(
  ` N6 ok components=${after2.components.total} orphans=0 uploads=${after2.uploadRows} products=${after2.catalog.productCount} injectRollback=ok`,
)
