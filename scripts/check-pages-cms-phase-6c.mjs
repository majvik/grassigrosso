#!/usr/bin/env node
/**
 * Phase 6C hard gate — legal fixtures + seed + 9-slug Node API + snapshots.
 * Owned dynamic ports only; never touch :1337/:3000/:5174. Self-cleaning.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  FORBIDDEN_PORTS,
  listListeners,
  freePort,
  gitPorcelain,
  startIsolatedPagesCmsStack,
} from './lib/pages-cms-isolated-stack.mjs'
import {
  uploadsDirForRoot,
  uploadsFingerprint,
  cleanupAndAssertUploadsRestored,
  assertNoUntrackedPagesCmsUploads,
  formatUploadsDiff,
} from './lib/pages-cms-uploads-guard.mjs'
import {
  validateFeedEnvelope,
  validateNodeEnvelope,
  validateSnapshotPayload,
  validateCanonicalPageContent,
} from './pages-cms/envelope.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const strapiRoot = path.join(root, 'strapi-catalog')
const fixturesDir = path.join(root, 'scripts/fixtures/pages-cms')
const publicDir = path.join(root, 'public')

const {
  PAGES_CMS_SLUGS,
  WAVE1_PAGES_CMS_SLUGS,
  LEGAL_PAGES_CMS_SLUGS: LEGAL_FROM_MAP,
} = require(path.join(strapiRoot, 'src/api/pages-cms/utils/map-allowlist.js'))
const {
  LEGAL_PAGES_CMS_SLUGS,
  LEGAL_BODY_LENGTH_BY_SLUG,
  LEGAL_HREF_ALLOWLIST,
  fixtureToStrapiLegalData,
} = require(path.join(strapiRoot, 'src/api/pages-cms/utils/legal-allowlist.js'))
const {
  canonicalizeLegalPageData,
  LegalContractError,
} = require(path.join(strapiRoot, 'src/api/pages-cms/utils/legal-page-contract.js'))
const {
  verifyPagesSnapshotSet,
  writePagesSnapshotsAtomic,
  fingerprintPagesSnapshotDir,
  snapshotFilenameForSlug,
  PAGES_SNAPSHOT_MANIFEST_NAME,
} = require(path.join(root, 'lib/pages-cms-snapshots.cjs'))
const { createPagesCmsApi } = require(path.join(root, 'lib/pages-cms-api.cjs'))
const {
  countPageComponentRows,
  findOrphanPageComponents,
  pageEntityDigests,
  catalogGuardFromDb,
  createSqliteBackup,
  restoreSqliteBackup,
} = (() => {
  const insp = require('./pages-cms/db-inspect.cjs')
  const bak = require('./pages-cms/sqlite-backup.cjs')
  return { ...insp, ...bak }
})()
const { seedPagesCmsFromFixtures } = require('./pages-cms/seed-core.cjs')
const { resolveFixtureMediaUrl } = require('./pages-cms/media-resolve.mjs')
const { syncDistRuntimeAssets } = require(path.join(strapiRoot, 'scripts/prepare-dist.cjs'))

const failures = []
function fail(m) {
  failures.push(m)
}
function assert(c, m) {
  if (!c) fail(m)
}

function readFixture(slug) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, `${slug}.json`), 'utf8'))
}

function fixtureStats(data) {
  return {
    bodyLength: data.body.length,
    headings: data.body.filter((b) => b.heading).length,
    lists: data.body.filter((b) => b.type === 'list').length,
    tables: data.body.filter((b) => b.type === 'table'),
    operators: data.body.filter((b) => b.type === 'operator').length,
  }
}

function expectCanonicalReject(label, data, needle) {
  try {
    canonicalizeLegalPageData(data)
    fail(`negative ${label}: expected reject`)
  } catch (err) {
    if (!(err instanceof LegalContractError) && err?.name !== 'LegalContractError') {
      fail(`negative ${label}: wrong error ${err}`)
      return
    }
    if (needle && !String(err.message).includes(needle)) {
      fail(`negative ${label}: missing "${needle}" in ${err.message}`)
    }
  }
}

// ========== 0. Baseline ==========
const uploadsDir = uploadsDirForRoot(root)
const baselineListeners = listListeners([...FORBIDDEN_PORTS])
const baselinePorcelain = gitPorcelain()
const trackedSnapFp = fingerprintPagesSnapshotDir(publicDir)
const baselineUploads = uploadsFingerprint(uploadsDir)
{
  const audit = assertNoUntrackedPagesCmsUploads(uploadsDir, root)
  assert(audit.ok, `pre: untracked pages_cms uploads: ${JSON.stringify(audit.leftovers)}`)
}

assert(PAGES_CMS_SLUGS.length === 9, 'nine slugs')
assert(WAVE1_PAGES_CMS_SLUGS.length === 6, 'six wave1')
assert(LEGAL_PAGES_CMS_SLUGS.length === 3, 'three legal')
assert(
  LEGAL_FROM_MAP.join(',') === LEGAL_PAGES_CMS_SLUGS.join(','),
  'map-allowlist legal slugs match',
)

// ========== 1. Fixtures / parity ==========
{
  const extract = spawnSync(process.execPath, ['scripts/pages-cms/extract-legal-fixtures.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  })
  assert(extract.status === 0, `fixture parity: ${extract.stderr || extract.stdout}`)
}

const expectedHeadings = { privacy: 16, terms: 13, cookies: 8 }
for (const slug of LEGAL_PAGES_CMS_SLUGS) {
  const data = readFixture(slug)
  const canonFails = validateCanonicalPageContent(data, slug)
  assert(canonFails.length === 0, `${slug} fixture canonical: ${canonFails.join('; ')}`)
  const st = fixtureStats(data)
  assert(st.bodyLength === LEGAL_BODY_LENGTH_BY_SLUG[slug], `${slug} body length`)
  assert(st.headings === expectedHeadings[slug], `${slug} headings ${st.headings}`)
  if (slug === 'privacy') {
    assert(st.lists === 6, 'privacy lists')
    assert(st.tables.length === 1 && st.tables[0].headers.length === 6, 'privacy table headers')
    assert(st.tables[0].rows.length === 9, 'privacy table rows')
    assert(st.operators === 1, 'privacy operator')
  }
  if (slug === 'terms') {
    assert(st.lists === 3, 'terms lists')
    assert(st.operators === 1, 'terms operator')
  }
  if (slug === 'cookies') {
    assert(st.lists === 1, 'cookies lists')
    assert(st.tables.length === 1 && st.tables[0].headers.length === 4, 'cookies table headers')
    assert(st.tables[0].rows.length === 4, 'cookies table rows')
    assert(st.operators === 0, 'cookies no operator')
  }
  // no duplicated OGRN free-text paragraphs
  for (const block of data.body) {
    if (block.type !== 'paragraph') continue
    const text = (block.runs || []).map((r) => (r.type === 'text' ? r.value : '')).join('')
    assert(!(text.includes('ОГРН') && text.includes('ИНН')), `${slug}: free-text requisites paragraph`)
  }
  const hrefs = []
  JSON.stringify(data, (k, v) => {
    if (k === 'href') hrefs.push(v)
    return v
  })
  for (const href of hrefs) {
    assert(LEGAL_HREF_ALLOWLIST.includes(href), `${slug} bad href ${href}`)
  }
}

// Fixture negatives
{
  const base = readFixture('privacy')
  assert(base.body.length === 55, 'privacy still 55')
  expectCanonicalReject(
    'forbidden-href',
    {
      title: 'T',
      effective_date: '2026-03-01',
      body: [
        {
          type: 'paragraph',
          runs: [
            {
              type: 'link',
              href: 'https://evil.example',
              children: [{ type: 'text', value: 'x', strong: false }],
            },
          ],
        },
      ],
    },
    'href not in exact allowlist',
  )
  expectCanonicalReject(
    'html-like-value',
    {
      title: 'T',
      effective_date: '2026-03-01',
      body: [{ type: 'paragraph', runs: [{ type: 'text', value: '<b>x</b>', strong: false }] }],
    },
    'HTML-like value forbidden',
  )
  expectCanonicalReject(
    'bad-table-width',
    {
      title: 'T',
      effective_date: '2026-03-01',
      body: [
        {
          type: 'table',
          headers: ['A', 'B'],
          rows: [{ cells: [{ runs: [{ type: 'text', value: '1', strong: false }] }] }],
        },
      ],
    },
    'cells.length',
  )
  expectCanonicalReject(
    'missing-strong',
    {
      title: 'T',
      effective_date: '2026-03-01',
      body: [{ type: 'paragraph', runs: [{ type: 'text', value: 'x' }] }],
    },
    'text.strong',
  )
}

// Mutation in source/fixture must FAIL parity
{
  const tmp = path.join(root, '.tmp', `phase6c-parity-${Date.now()}.json`)
  fs.mkdirSync(path.dirname(tmp), { recursive: true })
  const privacyPath = path.join(fixturesDir, 'privacy.json')
  const original = fs.readFileSync(privacyPath, 'utf8')
  try {
    const mutated = JSON.parse(original)
    mutated.body = mutated.body.slice(0, 5)
    fs.writeFileSync(privacyPath, `${JSON.stringify(mutated, null, 2)}\n`)
    const extract = spawnSync(
      process.execPath,
      ['scripts/pages-cms/extract-legal-fixtures.mjs', '--check'],
      { cwd: root, encoding: 'utf8' },
    )
    assert(extract.status !== 0, 'parity must FAIL after fixture mutation')
  } finally {
    fs.writeFileSync(privacyPath, original)
  }
}

// Forbidden ports probe
{
  let refused = false
  for (const p of FORBIDDEN_PORTS) {
    if (p === 1337 || p === 3000 || p === 5174) refused = true
  }
  assert(refused && FORBIDDEN_PORTS.length === 3, 'forbidden ports locked')
}

// ========== 2. Seed on owned temp DB ==========
async function runSeedGate() {
  const workDir = fs.mkdtempSync(path.join(root, '.tmp', 'phase6c-seed-'))
  const dbPath = path.join(workDir, 'data.db')
  const seedDb = path.join(strapiRoot, 'database', 'seed', 'data.db')
  fs.copyFileSync(seedDb, dbPath)
  syncDistRuntimeAssets(strapiRoot)

  const fixturesBySlug = Object.fromEntries(
    PAGES_CMS_SLUGS.map((slug) => [slug, readFixture(slug)]),
  )

  // Preflight legal before mutation (already done above); also fixtureToStrapi
  for (const slug of LEGAL_PAGES_CMS_SLUGS) {
    fixtureToStrapiLegalData(fixturesBySlug[slug])
  }

  const prevCwd = process.cwd()
  const prevEnv = { ...process.env }
  process.env.DATABASE_FILENAME = dbPath
  process.env.DATABASE_CLIENT = 'sqlite'
  process.env.HOST = '127.0.0.1'
  process.env.PORT = String(await freePort())
  process.env.APP_KEYS = process.env.APP_KEYS || 'p6c1,p6c2,p6c3,p6c4'
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'p6cApi'
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'p6cAdmin'
  process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'p6cTransfer'
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'p6cJwt'
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'phase6cEncryptionKey0123456789abcd'

  process.chdir(strapiRoot)
  const { createStrapi } = require(path.join(strapiRoot, 'node_modules/@strapi/strapi'))

  let app
  try {
    app = await createStrapi({
      appDir: strapiRoot,
      distDir: path.join(strapiRoot, 'dist'),
    }).load()

    const resolveMedia = (url) => resolveFixtureMediaUrl(url, { repoRoot: root })

    // seed ×2
    await seedPagesCmsFromFixtures(app, { fixturesBySlug, resolveMedia })
    const after1 = {
      comps: countPageComponentRows(dbPath),
      digests: pageEntityDigests(dbPath),
      orphans: findOrphanPageComponents(dbPath),
      catalog: catalogGuardFromDb(dbPath),
    }
    await seedPagesCmsFromFixtures(app, { fixturesBySlug, resolveMedia })
    const after2 = {
      comps: countPageComponentRows(dbPath),
      digests: pageEntityDigests(dbPath),
      orphans: findOrphanPageComponents(dbPath),
      catalog: catalogGuardFromDb(dbPath),
    }
    assert(after1.comps.total === after2.comps.total, 'seed×2 component rows stable')
    assert(
      JSON.stringify(after1.digests) === JSON.stringify(after2.digests),
      'seed×2 digests stable',
    )
    assert(after2.orphans.length === 0, `orphans=${after2.orphans.length}`)
    assert(after1.catalog.productCount === after2.catalog.productCount, 'catalog count stable')

    // Wave-1 digests present
    for (const table of [
      'index_pages',
      'hotels_pages',
      'dealers_pages',
      'contacts_pages',
      'documents_pages',
      'download_catalog_pages',
      'privacy_pages',
      'terms_pages',
      'cookies_pages',
    ]) {
      assert(after2.digests.byPage?.[table], `missing digest ${table}`)
    }

    // Injected failure after first legal mutation + rollback
    const backup = await createSqliteBackup(dbPath, path.join(workDir, 'backups'))
    const baseline = {
      comps: countPageComponentRows(dbPath),
      digests: pageEntityDigests(dbPath),
      catalog: catalogGuardFromDb(dbPath),
    }
    let injected = false
    try {
      await seedPagesCmsFromFixtures(app, {
        fixturesBySlug,
        resolveMedia,
        injectFailureAfterLegalMutation: true,
      })
    } catch (err) {
      injected = err.code === 'PAGES_CMS_INJECTED_FAILURE'
    }
    assert(injected, 'expected injected legal failure')
    try {
      await app.destroy()
    } catch {
      /* ignore */
    }
    app = null
    restoreSqliteBackup(dbPath, backup.backupPath)
    const restored = {
      comps: countPageComponentRows(dbPath),
      digests: pageEntityDigests(dbPath),
      catalog: catalogGuardFromDb(dbPath),
    }
    assert(restored.comps.total === baseline.comps.total, 'rollback component rows')
    assert(
      JSON.stringify(restored.digests) === JSON.stringify(baseline.digests),
      'rollback digests',
    )
    assert(restored.catalog.productCount === baseline.catalog.productCount, 'rollback catalog')

    // no legal media stubs in fixtures (legal uploads stay 0 delta beyond wave-1)
    void require('./pages-cms/db-inspect.cjs').countPagesCmsUploadRows(dbPath)
  } finally {
    try {
      if (app) await app.destroy()
    } catch {
      /* ignore */
    }
    process.chdir(prevCwd)
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    fs.rmSync(workDir, { recursive: true, force: true })
  }
}

// ========== 3. Isolated stack: feeds + Node 9 sources + export ==========
async function runApiExportGate() {
  const stack = await startIsolatedPagesCmsStack({ withVite: false, seedFixtures: true })
  const { ports, snapshotDir, dispose } = stack
  const baseStrapi = `http://127.0.0.1:${ports.strapiPort}`
  const baseNode = `http://127.0.0.1:${ports.nodePort}`

  async function fetchJson(url) {
    const res = await fetch(url)
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
    return { status: res.status, body }
  }

  try {
    for (const slug of LEGAL_PAGES_CMS_SLUGS) {
      const r = await fetchJson(`${baseStrapi}/api/${slug}-page-feed`)
      assert(r.status === 200, `${slug} feed status ${r.status}`)
      const envFails = validateFeedEnvelope(r.body, slug)
      assert(envFails.length === 0, `${slug} feed envelope: ${envFails.join('; ')}`)
      assert(
        Array.isArray(r.body.data?.body) &&
          r.body.data.body.length === LEGAL_BODY_LENGTH_BY_SLUG[slug],
        `${slug} feed body length`,
      )
    }

    for (const slug of PAGES_CMS_SLUGS) {
      const r = await fetchJson(`${baseNode}/api/pages/${slug}`)
      assert(r.status === 200, `node ${slug} status ${r.status}`)
      const fails = validateNodeEnvelope(r.body, slug)
      assert(fails.length === 0, `node ${slug}: ${fails.join('; ')}`)
      assert(r.body.source === 'strapi', `node ${slug} source=${r.body.source}`)
    }

    {
      // Isolated Node stack uses TTL=0; exercise memory-cache via API helper with TTL.
      const prevTtl = process.env.PAGES_STRAPI_CACHE_TTL_MS
      const prevStale = process.env.PAGES_STRAPI_CACHE_STALE_MS
      process.env.PAGES_STRAPI_CACHE_TTL_MS = '60000'
      process.env.PAGES_STRAPI_CACHE_STALE_MS = '60000'
      try {
        const api = createPagesCmsApi({
          isProd: false,
          rootDir: root,
          strapiUrl: baseStrapi,
          snapshotDir,
        })
        for (const slug of PAGES_CMS_SLUGS) {
          const first = await api.resolvePage(slug)
          assert(first.status === 200 && first.source === 'strapi', `${slug} cache fill`)
          const second = await api.resolvePage(slug)
          assert(
            second.status === 200 && second.source === 'memory-cache',
            `${slug} memory-cache got ${second.source}`,
          )
          const fails = validateNodeEnvelope(second.body, slug)
          assert(fails.length === 0, `${slug} memory-cache envelope: ${fails.join('; ')}`)
        }
      } finally {
        if (prevTtl === undefined) delete process.env.PAGES_STRAPI_CACHE_TTL_MS
        else process.env.PAGES_STRAPI_CACHE_TTL_MS = prevTtl
        if (prevStale === undefined) delete process.env.PAGES_STRAPI_CACHE_STALE_MS
        else process.env.PAGES_STRAPI_CACHE_STALE_MS = prevStale
      }
    }

    {
      const r = await fetchJson(`${baseNode}/api/pages/not-a-page`)
      assert(r.status === 404, 'unknown slug 404')
    }

    /** @type {Record<string, object>} */
    const payloads = {}
    for (const slug of PAGES_CMS_SLUGS) {
      const api = createPagesCmsApi({
        isProd: false,
        rootDir: root,
        strapiUrl: baseStrapi,
        snapshotDir,
      })
      api.clearCache()
      const resolved = await api.resolvePage(slug)
      assert(resolved.status === 200 && resolved.source === 'strapi', `export resolve ${slug}`)
      payloads[slug] = resolved.body.data
    }

    writePagesSnapshotsAtomic(snapshotDir, payloads, {
      syncedAt: new Date().toISOString(),
      slugs: [...PAGES_CMS_SLUGS],
    })
    const verifyFails = verifyPagesSnapshotSet({
      manifestPath: path.join(snapshotDir, PAGES_SNAPSHOT_MANIFEST_NAME),
      snapshotsDir: snapshotDir,
      expectedSlugs: [...PAGES_CMS_SLUGS],
    })
    assert(verifyFails.length === 0, `verify snapshots: ${verifyFails.join('; ')}`)

    // Late legal slug memory-cache → atomic no-op on exporter (before any corrupt writes)
    {
      const { exportPagesSnapshots } = await import('./export-pages-snapshot.mjs')
      const victimDir = path.join(snapshotDir, 'late-fail-victim')
      fs.mkdirSync(victimDir, { recursive: true })
      writePagesSnapshotsAtomic(victimDir, payloads, {
        syncedAt: new Date().toISOString(),
        slugs: [...PAGES_CMS_SLUGS],
      })
      const beforeLate = fingerprintPagesSnapshotDir(victimDir)
      const lastLegal = 'cookies'
      let threw = false
      try {
        await exportPagesSnapshots({
          publicDir: victimDir,
          fetchPage: async (slug) => {
            const data = payloads[slug]
            if (slug === lastLegal) {
              return { data, source: 'memory-cache' }
            }
            return { data, source: 'strapi' }
          },
        })
      } catch (err) {
        threw = /memory-cache|source=strapi/i.test(String(err.message))
      }
      assert(threw, 'late legal memory-cache must fail export')
      assert(
        JSON.stringify(fingerprintPagesSnapshotDir(victimDir)) === JSON.stringify(beforeLate),
        'late legal failure must be atomic no-op',
      )
    }

    // Wrong hash in manifest
    {
      const badHashDir = path.join(snapshotDir, 'bad-hash')
      fs.mkdirSync(badHashDir, { recursive: true })
      for (const slug of PAGES_CMS_SLUGS) {
        const src = path.join(snapshotDir, snapshotFilenameForSlug(slug))
        fs.copyFileSync(src, path.join(badHashDir, snapshotFilenameForSlug(slug)))
      }
      const man = JSON.parse(
        fs.readFileSync(path.join(snapshotDir, PAGES_SNAPSHOT_MANIFEST_NAME), 'utf8'),
      )
      man.sha256BySlug.privacy = '0'.repeat(64)
      fs.writeFileSync(
        path.join(badHashDir, PAGES_SNAPSHOT_MANIFEST_NAME),
        `${JSON.stringify(man, null, 2)}\n`,
      )
      const fails = verifyPagesSnapshotSet({
        manifestPath: path.join(badHashDir, PAGES_SNAPSHOT_MANIFEST_NAME),
        snapshotsDir: badHashDir,
        expectedSlugs: [...PAGES_CMS_SLUGS],
      })
      assert(fails.some((m) => /sha256 mismatch/.test(m)), 'wrong hash must FAIL')
    }

    await stack.stopStrapiOnly()
    for (const slug of PAGES_CMS_SLUGS) {
      const api = createPagesCmsApi({
        isProd: false,
        rootDir: root,
        strapiUrl: 'http://127.0.0.1:9',
        snapshotDir,
      })
      const resolved = await api.resolvePage(slug)
      assert(
        resolved.status === 200 && resolved.source === 'disk-snapshot',
        `${slug} disk-snapshot got ${resolved.status}/${resolved.source}`,
      )
    }

    {
      const privacyFile = path.join(snapshotDir, snapshotFilenameForSlug('privacy'))
      fs.writeFileSync(privacyFile, '{not-json')
      const api = createPagesCmsApi({
        isProd: false,
        rootDir: root,
        strapiUrl: 'http://127.0.0.1:9',
        snapshotDir,
      })
      const resolved = await api.resolvePage('privacy')
      assert(resolved.status === 503, 'corrupt legal snapshot → 503')
      assert(!('data' in resolved.body && resolved.body.data), 'no partial data on corrupt')
    }

    {
      const badDir = path.join(snapshotDir, 'bad-manifest')
      fs.mkdirSync(badDir, { recursive: true })
      for (const slug of WAVE1_PAGES_CMS_SLUGS) {
        const src = path.join(snapshotDir, snapshotFilenameForSlug(slug))
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(badDir, snapshotFilenameForSlug(slug)))
        }
      }
      fs.writeFileSync(
        path.join(badDir, PAGES_SNAPSHOT_MANIFEST_NAME),
        JSON.stringify({
          syncedAt: new Date().toISOString(),
          slugs: [...WAVE1_PAGES_CMS_SLUGS],
          sha256BySlug: {},
        }),
      )
      const fails = verifyPagesSnapshotSet({
        manifestPath: path.join(badDir, PAGES_SNAPSHOT_MANIFEST_NAME),
        snapshotsDir: badDir,
        expectedSlugs: [...PAGES_CMS_SLUGS],
      })
      assert(fails.length > 0, 'manifest missing legal must FAIL')
    }

    {
      const exportSrc = fs.readFileSync(path.join(root, 'scripts/export-pages-snapshot.mjs'), 'utf8')
      assert(exportSrc.includes('strapi'), 'exporter must require source=strapi')
    }

    // untracked artifact probe: gate must not leave files in public/
    const untrackedProbe = path.join(publicDir, 'pages-privacy.snapshot.json.phase6c-probe')
    assert(!fs.existsSync(untrackedProbe), 'unexpected probe artifact')
  } finally {
    await dispose()
  }
}

let ran = { seed: false, api: false }
const seedOnly = process.argv.includes('--seed-only')
try {
  await runSeedGate()
  ran.seed = true
  if (!seedOnly) {
    await runApiExportGate()
    ran.api = true
  }
} catch (err) {
  fail(`runtime: ${err && err.stack ? err.stack : err}`)
}

// Restore uploads (seed/stack may write pages_cms_* into shared uploads/)
{
  const restored = cleanupAndAssertUploadsRestored(uploadsDir, baselineUploads)
  if (!restored.ok) {
    fail(`uploads not restored: ${formatUploadsDiff(restored.diff)}`)
  }
  const audit = assertNoUntrackedPagesCmsUploads(uploadsDir, root)
  assert(audit.ok, `post: untracked pages_cms uploads: ${JSON.stringify(audit.leftovers)}`)
}

// Normal gate must not dirty tracked public snapshots / porcelain
const afterPorcelain = gitPorcelain()
const afterSnapFp = fingerprintPagesSnapshotDir(publicDir)
assert(JSON.stringify(afterSnapFp) === JSON.stringify(trackedSnapFp), 'tracked public/pages-* fingerprint changed')
assert(afterPorcelain === baselinePorcelain, 'git porcelain changed after normal gate')

const afterListeners = listListeners([...FORBIDDEN_PORTS])
for (const p of FORBIDDEN_PORTS) {
  assert(afterListeners[p] === baselineListeners[p], `forbidden port ${p} changed`)
}

if (failures.length) {
  console.error('check:pages-cms-phase-6c FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log(
  `check:pages-cms-phase-6c PASS slugs=9 fixtures=55/37/17 seed=${ran.seed} api=${ran.api} snapshots=ok`,
)
