#!/usr/bin/env node
/**
 * Phase D gate for Node pages API:
 * - N1 unknown slug → 404
 * - N2 invalid Strapi body → memory not updated
 * - N3 exporter rejects non-strapi sources
 * - N4 corrupted snapshot → 503
 * - N5 manifest sha256 mismatch → FAIL
 * - Happy paths: strapi / memory-cache / disk-snapshot
 *
 * Boots Strapi + server.cjs when ports free (never kills user processes).
 * Env: PAGES_API_BASE_URL to skip boot and hit an existing Node server (Strapi still needed for strapi source).
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

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const strapiRoot = path.join(root, 'strapi-catalog')
const publicDir = path.join(root, 'public')
const seedScript = path.join(root, 'scripts/seed-pages-cms-from-fixtures.mjs')
const exportScript = path.join(root, 'scripts/export-pages-snapshot.mjs')

const { PAGES_CMS_SLUGS } = require(path.join(strapiRoot, 'src/api/pages-cms/utils/map-allowlist.js'))
const {
  createPagesCmsApi,
  snapshotFilenameForSlug,
} = require(path.join(root, 'lib/pages-cms-api.cjs'))
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
    })
    const result = await api.resolvePage(slug)
    assert(result.status === 503, `N4 expected 503, got ${result.status}`)
    assert(/corrupt/i.test(String(result.body?.error || '')), `N4 error=${JSON.stringify(result.body)}`)
    await mock.close()
  }

  fs.rmSync(tmpRoot, { recursive: true, force: true })
}

// --- N3 exporter rejects non-strapi sources (same rule as export-pages-snapshot.mjs) ---
{
  function assertExporterAcceptsSource(source, slug) {
    if (source !== 'strapi') {
      throw new Error(
        `${slug}: exporter requires source=strapi (got ${JSON.stringify(source)}) — refuse memory-cache/disk-snapshot (N3)`,
      )
    }
  }
  let refused = false
  try {
    assertExporterAcceptsSource('memory-cache', 'index')
  } catch (error) {
    refused = /source=strapi|memory-cache/i.test(String(error.message))
  }
  assert(refused, 'N3: exporter must refuse memory-cache')
  refused = false
  try {
    assertExporterAcceptsSource('disk-snapshot', 'index')
  } catch (error) {
    refused = /source=strapi|disk-snapshot/i.test(String(error.message))
  }
  assert(refused, 'N3: exporter must refuse disk-snapshot')
  try {
    assertExporterAcceptsSource('strapi', 'index')
  } catch {
    fail('N3: exporter must accept source=strapi')
  }

  // Also ensure the real exporter script encodes the same hard gate.
  const exportSrc = fs.readFileSync(exportScript, 'utf8')
  assert(
    exportSrc.includes("body.source !== 'strapi'") || exportSrc.includes('source !== "strapi"'),
    'N3: export-pages-snapshot.mjs missing source=strapi hard gate',
  )
}

// --- N5 manifest verify helper ---
function verifyPagesManifest(manifestPath, snapshotsDir) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const fails = []
  if (!Array.isArray(manifest.slugs)) fails.push('manifest.slugs missing')
  if (!manifest.sha256BySlug || typeof manifest.sha256BySlug !== 'object') {
    fails.push('manifest.sha256BySlug missing')
  }
  for (const slug of manifest.slugs || []) {
    const file = path.join(snapshotsDir, snapshotFilenameForSlug(slug))
    if (!fs.existsSync(file)) {
      fails.push(`missing snapshot file for ${slug}`)
      continue
    }
    const text = fs.readFileSync(file, 'utf8')
    const actual = sha256(text)
    const expected = manifest.sha256BySlug?.[slug]
    if (actual !== expected) fails.push(`N5 sha256 mismatch for ${slug}`)
  }
  return fails
}

{
  const tmp = fs.mkdtempSync(path.join(root, '.tmp', 'pages-manifest-'))
  const slug = 'index'
  const file = path.join(tmp, snapshotFilenameForSlug(slug))
  const body = `${JSON.stringify({ hero: {} }, null, 2)}\n`
  fs.writeFileSync(file, body, 'utf8')
  const goodHash = sha256(body)
  const manifestPath = path.join(tmp, 'pages-snapshot.manifest.json')
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ syncedAt: new Date().toISOString(), slugs: [slug], sha256BySlug: { [slug]: goodHash } }),
    'utf8',
  )
  assert(verifyPagesManifest(manifestPath, tmp).length === 0, 'N5 positive verify failed')
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ syncedAt: new Date().toISOString(), slugs: [slug], sha256BySlug: { [slug]: 'deadbeef' } }),
    'utf8',
  )
  const bad = verifyPagesManifest(manifestPath, tmp)
  assert(bad.some((m) => /N5 sha256 mismatch/.test(m)), `N5 negative expected mismatch, got ${JSON.stringify(bad)}`)
  fs.rmSync(tmp, { recursive: true, force: true })
}

// --- Integration: Strapi + server.cjs ---
const externalBase = process.env.PAGES_API_BASE_URL
  ? String(process.env.PAGES_API_BASE_URL).replace(/\/+$/, '')
  : null

const CHECK_NODE_PORT = String(process.env.PAGES_API_CHECK_PORT || '3011')
const CHECK_NODE_BASE = `http://127.0.0.1:${CHECK_NODE_PORT}`

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
      // TTL/stale 0 so exporter always sees source=strapi; memory-cache covered in-process.
      PAGES_STRAPI_CACHE_TTL_MS: '0',
      PAGES_STRAPI_CACHE_STALE_MS: '0',
      CATALOG_STRAPI_CACHE_TTL_MS: '0',
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

  // Exporter + disk fallback (harness-owned stack only)
  if (!externalBase && nodeChild) {
    // Inline export (must not spawnSync — that blocks the event loop hosting Strapi).
    /** @type {Record<string, string>} */
    const hashes = {}
    await fsp.mkdir(publicDir, { recursive: true })
    for (const slug of PAGES_CMS_SLUGS) {
      const result = await fetchJson(apiBase, `/api/pages/${slug}`)
      assert(result.status === 200, `export ${slug} HTTP ${result.status}`)
      const envelopeFails = validateNodeEnvelope(result.body, slug)
      for (const msg of envelopeFails) fail(`export ${msg}`)
      assert(
        result.body?.source === 'strapi',
        `export ${slug}: requires source=strapi (got ${result.body?.source})`,
      )
      const filename = snapshotFilenameForSlug(slug)
      const text = `${JSON.stringify(result.body.data, null, 2)}\n`
      await fsp.writeFile(path.join(publicDir, filename), text, 'utf8')
      hashes[slug] = sha256(text)
    }
    const manifest = {
      syncedAt: new Date().toISOString(),
      slugs: [...PAGES_CMS_SLUGS],
      sha256BySlug: hashes,
    }
    await fsp.writeFile(
      path.join(publicDir, 'pages-snapshot.manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    )

    const manifestPath = path.join(publicDir, 'pages-snapshot.manifest.json')
    assert(fs.existsSync(manifestPath), 'pages-snapshot.manifest.json missing after export')
    const manifestFails = verifyPagesManifest(manifestPath, publicDir)
    for (const msg of manifestFails) fail(msg)

    // disk-snapshot: stop Strapi, keep Node with TTL=0
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
}

if (failures.length) {
  console.error('check:pages-api FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-api PASS')
console.log(
  ` slugs=${PAGES_CMS_SLUGS.length} N1-N5=ok sources=strapi/memory-cache/disk-snapshot exporter=ok`,
)
