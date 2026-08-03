#!/usr/bin/env node
/**
 * Phase D gate for Node pages API:
 * - N1–N5 (shared verifyPagesSnapshotSet for N5)
 * - atomic exporter + late-slug negative (no partial public writes)
 * - does not dirty tracked public/pages-*.json (exports to harness snapshot dir)
 * - check:catalog-api against harness Node while Strapi is up
 *
 * Boots Strapi + server.cjs when ports free (never kills user processes).
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import { validateNodeEnvelope } from './pages-cms/envelope.mjs'
import { exportPagesSnapshots } from './export-pages-snapshot.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const strapiRoot = path.join(root, 'strapi-catalog')
const publicDir = path.join(root, 'public')
const seedScript = path.join(root, 'scripts/seed-pages-cms-from-fixtures.mjs')
const exportScript = path.join(root, 'scripts/export-pages-snapshot.mjs')
const catalogApiScript = path.join(root, 'scripts/check-catalog-api.mjs')

const { PAGES_CMS_SLUGS } = require(path.join(strapiRoot, 'src/api/pages-cms/utils/map-allowlist.js'))
const { createPagesCmsApi } = require(path.join(root, 'lib/pages-cms-api.cjs'))
const {
  snapshotFilenameForSlug,
  verifyPagesSnapshotSet,
  PAGES_SNAPSHOT_MANIFEST_NAME,
  fingerprintPagesSnapshotDir,
  writePagesSnapshotsAtomic,
  listPagesSnapshotFilenames,
} = require(path.join(root, 'lib/pages-cms-snapshots.cjs'))
const { syncDistRuntimeAssets } = require(path.join(strapiRoot, 'scripts/prepare-dist.cjs'))

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

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function runNodeScriptAsync(scriptPath, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (c) => {
      stdout += String(c)
    })
    child.stderr.on('data', (c) => {
      stderr += String(c)
    })
    child.on('close', (status) => {
      resolve({ status: status ?? 1, stdout, stderr })
    })
  })
}

async function fetchJson(base, urlPath) {
  const url = `${base}${urlPath}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, body, headers: res.headers, url }
}

function listenMock(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({
        server,
        base: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r, j) => {
            server.close((err) => (err ? j(err) : r()))
          }),
      })
    })
  })
}

function copyTrackedPagesSnapshots(destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const name of listPagesSnapshotFilenames()) {
    const src = path.join(publicDir, name)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(destDir, name))
  }
}

const trackedBefore = fingerprintPagesSnapshotDir(publicDir)

// --- In-process negatives (no ports) ---
{
  const tmpRoot = fs.mkdtempSync(path.join(root, '.tmp', 'pages-api-'))
  const tmpPublic = path.join(tmpRoot, 'public')
  fs.mkdirSync(tmpPublic, { recursive: true })

  // N2: unusable Strapi must not populate cache
  {
    const mock = await listenMock((_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ data: { title: 'nope' } }))
    })
    process.env.PAGES_STRAPI_CACHE_TTL_MS = '60000'
    process.env.PAGES_STRAPI_CACHE_STALE_MS = '60000'
    const api = createPagesCmsApi({
      isProd: false,
      strapiUrl: mock.base,
      rootDir: tmpRoot,
    })
    const before = api.peekCache('index')
    const result = await api.resolvePage('index')
    assert(result.status === 503 || result.source === 'disk-snapshot', 'N2: unusable strapi should not be source=strapi')
    assert(result.source !== 'strapi', 'N2: source must not be strapi for unusable body')
    assert(api.peekCache('index') == null || api.peekCache('index') === before, 'N2: cache must not gain unusable payload')
    await mock.close()
  }

  // N2b: stale memory retained when Strapi becomes unusable
  {
    let mode = 'good'
    const goodPayload = {
      data: {
        hero: { title: 'H' },
        solutions: [],
        collections: [],
        testimonials: [],
        docs: [],
      },
    }
    const mock = await listenMock((_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      if (mode === 'good') res.end(JSON.stringify(goodPayload))
      else res.end(JSON.stringify({ data: { broken: true } }))
    })
    process.env.PAGES_STRAPI_CACHE_TTL_MS = '1'
    process.env.PAGES_STRAPI_CACHE_STALE_MS = '600000'
    const api = createPagesCmsApi({
      isProd: false,
      strapiUrl: mock.base,
      rootDir: tmpRoot,
    })
    const first = await api.resolvePage('index')
    assert(first.source === 'strapi', `N2b first source=${first.source}`)
    await new Promise((r) => setTimeout(r, 5))
    mode = 'bad'
    const second = await api.resolvePage('index')
    assert(second.source === 'memory-cache', `N2b expected memory-cache, got ${second.source}`)
    assert(second.body?.data?.hero?.title === 'H', 'N2b stale canonical retained')
    await mock.close()
  }

  // N4: corrupted snapshot → 503
  {
    process.env.PAGES_STRAPI_CACHE_TTL_MS = '0'
    process.env.PAGES_STRAPI_CACHE_STALE_MS = '0'
    const slug = 'contacts'
    fs.writeFileSync(path.join(tmpPublic, snapshotFilenameForSlug(slug)), '{not-json', 'utf8')
    const mock = await listenMock((_req, res) => {
      res.statusCode = 500
      res.end('nope')
    })
    const api = createPagesCmsApi({
      isProd: false,
      strapiUrl: mock.base,
      rootDir: tmpRoot,
      snapshotDir: tmpPublic,
    })
    const result = await api.resolvePage(slug)
    assert(result.status === 503, `N4 expected 503, got ${result.status}`)
    assert(/corrupt/i.test(String(result.body?.error || '')), `N4 error=${JSON.stringify(result.body)}`)
    await mock.close()
  }

  fs.rmSync(tmpRoot, { recursive: true, force: true })
}

// --- N3 exporter rejects non-strapi sources ---
{
  const exportSrc = fs.readFileSync(exportScript, 'utf8')
  assert(exportSrc.includes("body.source !== 'strapi'"), 'N3: export-pages-snapshot.mjs missing source=strapi hard gate')
  assert(exportSrc.includes('writePagesSnapshotsAtomic'), 'N3: exporter must use atomic publish')
}

// --- N5: shared runtime verifier (lib/pages-cms-snapshots.cjs) ---
{
  assert(
    typeof verifyPagesSnapshotSet === 'function',
    'N5: verifyPagesSnapshotSet must come from lib/pages-cms-snapshots.cjs',
  )
  const tmp = fs.mkdtempSync(path.join(root, '.tmp', 'pages-manifest-'))
  const slug = 'index'
  /** Minimal full set so expectedSlugs default still works when we pass one slug */
  const oneSlug = [slug]
  const file = path.join(tmp, snapshotFilenameForSlug(slug))
  const body = `${JSON.stringify({ hero: {} }, null, 2)}\n`
  fs.writeFileSync(file, body, 'utf8')
  const goodHash = sha256(body)
  const manifestPath = path.join(tmp, PAGES_SNAPSHOT_MANIFEST_NAME)
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      syncedAt: new Date().toISOString(),
      slugs: oneSlug,
      sha256BySlug: { [slug]: goodHash },
    }),
    'utf8',
  )
  assert(
    verifyPagesSnapshotSet({
      manifestPath,
      snapshotsDir: tmp,
      expectedSlugs: oneSlug,
    }).length === 0,
    'N5 positive verify failed',
  )
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      syncedAt: new Date().toISOString(),
      slugs: oneSlug,
      sha256BySlug: { [slug]: 'deadbeef' },
    }),
    'utf8',
  )
  const bad = verifyPagesSnapshotSet({
    manifestPath,
    snapshotsDir: tmp,
    expectedSlugs: oneSlug,
  })
  assert(bad.some((m) => /N5 sha256 mismatch/.test(m)), `N5 negative expected mismatch, got ${JSON.stringify(bad)}`)
  fs.rmSync(tmp, { recursive: true, force: true })
}

// --- Late-slug negative: failing last slug must not change any snapshot/manifest ---
{
  const victimDir = fs.mkdtempSync(path.join(root, '.tmp', 'pages-late-slug-'))
  copyTrackedPagesSnapshots(victimDir)
  if (!fs.existsSync(path.join(victimDir, PAGES_SNAPSHOT_MANIFEST_NAME))) {
    writePagesSnapshotsAtomic(victimDir, {
      index: {
        hero: { title: 't' },
        solutions: [],
        collections: [],
        testimonials: [],
        docs: [],
      },
      hotels: {
        hero: { title: 't' },
        stats: [],
        categories: [],
        products: [],
        faq_items: [],
      },
      dealers: {
        hero: { title: 't' },
        stats: [],
        offers: [],
        packages: [],
        faq_items: [],
      },
      contacts: {
        hero: { title: 't' },
        offices: [{ slug: 'main', map_embed_url: 'https://yandex.ru/map-widget/v1/?ll=1%2C2' }],
        contact_info: [],
      },
      documents: {
        hero: { title: 't' },
        certificates: [],
        company_documents: [],
        faq_items: [],
      },
      'download-catalog': {
        title: 't',
        lead: 'l',
        submit_label: 's',
        catalog_pdf: { url: '/x.pdf' },
        back_label: 'b',
        back_href: '/catalog',
      },
    })
  }
  const beforeLate = fingerprintPagesSnapshotDir(victimDir)
  const lastSlug = PAGES_CMS_SLUGS[PAGES_CMS_SLUGS.length - 1]

  const minimalOk = {
    index: {
      data: {
        hero: { title: 't' },
        solutions: [],
        collections: [],
        testimonials: [],
        docs: [],
      },
      source: 'strapi',
    },
    hotels: {
      data: {
        hero: { title: 't' },
        stats: [],
        categories: [],
        products: [],
        faq_items: [],
      },
      source: 'strapi',
    },
    dealers: {
      data: {
        hero: { title: 't' },
        stats: [],
        offers: [],
        packages: [],
        faq_items: [],
      },
      source: 'strapi',
    },
    contacts: {
      data: {
        hero: { title: 't' },
        offices: [{ slug: 'main', map_embed_url: 'https://yandex.ru/map-widget/v1/?ll=1%2C2' }],
        contact_info: [],
      },
      source: 'strapi',
    },
    documents: {
      data: {
        hero: { title: 't' },
        certificates: [],
        company_documents: [],
        faq_items: [],
      },
      source: 'strapi',
    },
    'download-catalog': {
      data: {
        title: 't',
        lead: 'l',
        submit_label: 's',
        catalog_pdf: { url: '/x.pdf' },
        back_label: 'b',
        back_href: '/catalog',
      },
      source: 'strapi',
    },
  }

  let threw = false
  try {
    await exportPagesSnapshots({
      publicDir: victimDir,
      fetchPage: async (slug) => {
        if (slug === lastSlug) {
          return { ...minimalOk[slug], source: 'memory-cache' }
        }
        return minimalOk[slug]
      },
    })
  } catch (error) {
    threw = true
    assert(
      /source=strapi|memory-cache/i.test(String(error.message)),
      `late-slug error should mention source refusal: ${error.message}`,
    )
  }
  assert(threw, 'late-slug export must fail when last slug is memory-cache')
  const afterLate = fingerprintPagesSnapshotDir(victimDir)
  assert(
    JSON.stringify(beforeLate) === JSON.stringify(afterLate),
    'late-slug failure must not change any snapshot/manifest files',
  )
  fs.rmSync(victimDir, { recursive: true, force: true })
}

// --- Integration: Strapi + server.cjs ---
const externalBase = process.env.PAGES_API_BASE_URL
  ? String(process.env.PAGES_API_BASE_URL).replace(/\/+$/, '')
  : null

const CHECK_NODE_PORT = String(process.env.PAGES_API_CHECK_PORT || '3011')
const CHECK_NODE_BASE = `http://127.0.0.1:${CHECK_NODE_PORT}`
const harnessSnapshotDir = fs.mkdtempSync(path.join(root, '.tmp', 'pages-harness-snapshots-'))

let strapiApp = null
let nodeChild = null
let apiBase = externalBase

async function shutdown() {
  if (nodeChild && !nodeChild.killed) {
    nodeChild.kill('SIGTERM')
    nodeChild = null
  }
  if (strapiApp) {
    try {
      await strapiApp.destroy()
    } catch {
      // ignore
    }
    strapiApp = null
  }
}

try {
  if (!externalBase) {
    if (portInUse(1337)) {
      fail('port :1337 is in use — stop Strapi yourself (harness will not kill processes)')
    }
    if (portInUse(Number(CHECK_NODE_PORT))) {
      fail(
        `port :${CHECK_NODE_PORT} is in use — free it or set PAGES_API_CHECK_PORT (harness will not kill processes)`,
      )
    }
    if (failures.length) throw new Error('ports busy')

    const seeded = spawnSync(process.execPath, [seedScript], { cwd: root, encoding: 'utf8' })
    assert(seeded.status === 0, `seed failed: ${seeded.stderr || seeded.stdout}`)

    syncDistRuntimeAssets(strapiRoot)
    const prevCwd = process.cwd()
    process.chdir(strapiRoot)
    const { createStrapi } = require(path.join(strapiRoot, 'node_modules/@strapi/strapi'))
    strapiApp = await createStrapi({
      appDir: strapiRoot,
      distDir: path.join(strapiRoot, 'dist'),
    }).load()
    await strapiApp.listen()
    process.chdir(prevCwd)

    const nodeEnv = {
      ...process.env,
      NODE_ENV: 'development',
      PORT: CHECK_NODE_PORT,
      STRAPI_URL: 'http://127.0.0.1:1337',
      PAGES_STRAPI_CACHE_TTL_MS: '0',
      PAGES_STRAPI_CACHE_STALE_MS: '0',
      CATALOG_STRAPI_CACHE_TTL_MS: '0',
      PAGES_CMS_SNAPSHOT_DIR: harnessSnapshotDir,
      BOT_TOKEN: 'fake',
      CHAT_ID: '123',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'test',
      SMTP_PASS: 'test',
      MAIL_FROM: 'test@example.com',
      MAIL_TO: 'test@example.com',
      DB_PATH: path.join(root, '.tmp/leads-pages-api-check.db'),
    }

    let nodeStderr = ''
    nodeChild = spawn(process.execPath, [path.join(root, 'server.cjs')], {
      cwd: root,
      env: nodeEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    nodeChild.stderr.on('data', (chunk) => {
      nodeStderr += String(chunk)
    })
    nodeChild.stdout.on('data', (chunk) => {
      nodeStderr += String(chunk)
    })
    apiBase = CHECK_NODE_BASE

    let ready = false
    for (let i = 0; i < 80; i++) {
      if (nodeChild.exitCode != null) break
      try {
        const health = await fetchJson(apiBase, '/health')
        if (health.status === 200) {
          ready = true
          break
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    assert(ready, `Node server /health did not become ready\n${nodeStderr.slice(-2000)}`)
  }

  // N1
  {
    const unknown = await fetchJson(apiBase, '/api/pages/not-a-real-page')
    assert(unknown.status === 404, `N1 expected 404, got ${unknown.status}`)
  }

  // Happy path: all slugs source=strapi
  for (const slug of PAGES_CMS_SLUGS) {
    const result = await fetchJson(apiBase, `/api/pages/${slug}`)
    assert(result.status === 200, `${slug} HTTP ${result.status} body=${JSON.stringify(result.body).slice(0, 300)}`)
    const fails = validateNodeEnvelope(result.body, slug)
    for (const msg of fails) fail(msg)
    assert(result.body?.source === 'strapi', `${slug} expected source=strapi, got ${result.body?.source}`)
    assert(
      result.headers.get('x-pages-source') === 'strapi',
      `${slug} missing X-Pages-Source: strapi`,
    )
  }

  // catalog-api against harness Node (async — must not spawnSync while Strapi lives in this process)
  if (!externalBase && nodeChild) {
    const catalog = await runNodeScriptAsync(catalogApiScript, {
      CATALOG_API_BASE_URL: apiBase,
    })
    assert(
      catalog.status === 0,
      `check:catalog-api failed:\n${catalog.stdout || ''}\n${catalog.stderr || ''}`,
    )
  }

  // Atomic export into harness dir (never tracked public/)
  if (!externalBase && nodeChild) {
    await exportPagesSnapshots({
      baseUrl: apiBase,
      publicDir: harnessSnapshotDir,
    })
    const verifyFails = verifyPagesSnapshotSet({
      manifestPath: path.join(harnessSnapshotDir, PAGES_SNAPSHOT_MANIFEST_NAME),
      snapshotsDir: harnessSnapshotDir,
      expectedSlugs: [...PAGES_CMS_SLUGS],
    })
    for (const msg of verifyFails) fail(`harness export verify: ${msg}`)

    // disk-snapshot: stop Strapi; Node reads PAGES_CMS_SNAPSHOT_DIR
    await strapiApp.destroy()
    strapiApp = null
    const disk = await fetchJson(apiBase, '/api/pages/index')
    assert(
      disk.status === 200,
      `disk-snapshot HTTP ${disk.status} body=${JSON.stringify(disk.body).slice(0, 300)}`,
    )
    assert(disk.body?.source === 'disk-snapshot', `expected disk-snapshot, got ${disk.body?.source}`)
    const diskFails = validateNodeEnvelope(disk.body, 'index')
    for (const msg of diskFails) fail(msg)
  }
} catch (error) {
  fail(`Phase D runtime error: ${error && error.stack ? error.stack : error}`)
} finally {
  await shutdown()
  try {
    fs.rmSync(harnessSnapshotDir, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

const trackedAfter = fingerprintPagesSnapshotDir(publicDir)
assert(
  JSON.stringify(trackedBefore) === JSON.stringify(trackedAfter),
  'check:pages-api must not dirty tracked public/pages-*.snapshot.json or pages-snapshot.manifest.json',
)

if (failures.length) {
  console.error('check:pages-api FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-api PASS')
console.log(
  ` slugs=${PAGES_CMS_SLUGS.length} N1-N5=ok atomicExport=ok lateSlug=ok catalog-api=ok trackedPublicClean=ok`,
)
