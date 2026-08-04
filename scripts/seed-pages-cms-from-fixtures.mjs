#!/usr/bin/env node
/**
 * Seed nine page single types (Wave 1 + legal) from fixtures into local Strapi .tmp/data.db.
 *
 * - SQLite-safe backup (better-sqlite3 backup + WAL/SHM clear on restore)
 * - Preflights all media (FAIL before DB writes if missing)
 * - On seed error after mutation: restore DB + remove new pages_cms upload files
 * - Does NOT run strapi:sync-seed
 * - Does NOT kill processes on :1337 — exits with instructions if busy
 *
 * Usage:
 *   node scripts/seed-pages-cms-from-fixtures.mjs
 *   node scripts/seed-pages-cms-from-fixtures.mjs --preflight-only
 *   node scripts/seed-pages-cms-from-fixtures.mjs --restore-backup [path]
 *   PAGES_CMS_SEED_INJECT_FAILURE=1 node scripts/seed-pages-cms-from-fixtures.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { collectMediaUrls, resolveFixtureMediaUrl } from './pages-cms/media-resolve.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const strapiRoot = path.join(root, 'strapi-catalog')
const defaultDbPath = path.join(strapiRoot, '.tmp/data.db')
const dbPath = process.env.DATABASE_FILENAME
  ? path.resolve(
      path.isAbsolute(process.env.DATABASE_FILENAME)
        ? process.env.DATABASE_FILENAME
        : path.join(strapiRoot, process.env.DATABASE_FILENAME),
    )
  : defaultDbPath
const backupDir = path.join(strapiRoot, '.tmp/pages-cms-seed-backups')
const uploadsDir = path.join(strapiRoot, 'public/uploads')
const fixturesDir = path.join(root, 'scripts/fixtures/pages-cms')

const { PAGES_CMS_SLUGS } = require(path.join(
  strapiRoot,
  'src/api/pages-cms/utils/map-allowlist.js',
))
const {
  LEGAL_PAGES_CMS_SLUGS,
} = require(path.join(strapiRoot, 'src/api/pages-cms/utils/legal-allowlist.js'))
const { canonicalizeLegalPageData } = require(path.join(
  strapiRoot,
  'src/api/pages-cms/utils/legal-page-contract.js',
))
const { seedPagesCmsFromFixtures } = require('./pages-cms/seed-core.cjs')
const { createSqliteBackup, restoreSqliteBackup } = require('./pages-cms/sqlite-backup.cjs')
const { snapshotUploadsFs, removeUploadFsDiff } = require('./pages-cms/db-inspect.cjs')
const { syncDistRuntimeAssets } = require(path.join(strapiRoot, 'scripts/prepare-dist.cjs'))

function readFixtures() {
  /** @type {Record<string, object>} */
  const out = {}
  for (const slug of PAGES_CMS_SLUGS) {
    const file = path.join(fixturesDir, `${slug}.json`)
    out[slug] = JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  return out
}

function preflightMedia(fixturesBySlug) {
  /** @type {string[]} */
  const urls = []
  for (const slug of PAGES_CMS_SLUGS) {
    let fixture = fixturesBySlug[slug]
    if (slug === 'download-catalog') {
      const { slides, media_display_mode, slider_autoplay_ms, ...texts } = fixture
      fixture = texts
      void slides
      void media_display_mode
      void slider_autoplay_ms
    }
    urls.push(...collectMediaUrls(fixture))
  }
  const unique = [...new Set(urls)]
  const resolved = unique.map((url) => ({ url, ...resolveFixtureMediaUrl(url, { repoRoot: root }) }))
  return { unique, resolved }
}

function assertDbExists() {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Missing Strapi DB at ${dbPath}. Start Strapi once locally to create .tmp/data.db`)
  }
}

function portInUse(port) {
  try {
    const { execFileSync } = require('node:child_process')
    const out = execFileSync('lsof', ['-iTCP:' + port, '-sTCP:LISTEN', '-n', '-P'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return Boolean(out && out.trim())
  } catch {
    return false
  }
}

function refuseIfPortBusy() {
  // Isolated harness DB (Phase 5 aggregator) does not touch live :1337 SQLite.
  if (dbPath !== defaultDbPath) return
  if (process.env.PAGES_CMS_SEED_ALLOW_BUSY_PORT === '1') return
  if (!portInUse(1337)) return
  console.error(
    [
      'Refusing to seed: port :1337 is in use.',
      'Stop your local Strapi/dev process yourself, then re-run.',
      'This script will not kill processes.',
    ].join('\n'),
  )
  process.exit(1)
}

async function withStrapi(fn) {
  syncDistRuntimeAssets(strapiRoot)
  const { createStrapi } = require(path.join(strapiRoot, 'node_modules/@strapi/strapi'))
  process.chdir(strapiRoot)
  const app = await createStrapi({
    appDir: strapiRoot,
    distDir: path.join(strapiRoot, 'dist'),
  }).load()
  try {
    return await fn(app)
  } finally {
    await app.destroy()
    process.chdir(root)
  }
}

function rollback(backupPath, uploadsBefore) {
  restoreSqliteBackup(dbPath, backupPath)
  const removed = removeUploadFsDiff(uploadsDir, uploadsBefore)
  return { removedUploadFiles: removed }
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--restore-backup') {
    refuseIfPortBusy()
    const backupPath = args[1] || path.join(backupDir, 'data.db.last-before-pages-cms-seed')
    const uploadsBefore = snapshotUploadsFs(uploadsDir)
    restoreSqliteBackup(dbPath, backupPath)
    // restore-backup alone does not delete upload files unless --prune-uploads-diff given
    if (args.includes('--prune-uploads-diff')) {
      removeUploadFsDiff(uploadsDir, uploadsBefore)
    }
    console.log(JSON.stringify({ ok: true, restored: backupPath }, null, 2))
    return
  }

  assertDbExists()
  const fixturesBySlug = readFixtures()

  let preflight
  try {
    preflight = preflightMedia(fixturesBySlug)
    for (const slug of LEGAL_PAGES_CMS_SLUGS) {
      canonicalizeLegalPageData(fixturesBySlug[slug])
    }
  } catch (error) {
    console.error(`Preflight FAILED (no DB mutation): ${error.message}`)
    process.exit(1)
  }

  if (args.includes('--preflight-only')) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mediaCount: preflight.unique.length,
          legalSlugs: [...LEGAL_PAGES_CMS_SLUGS],
          resolved: preflight.resolved.map((r) => ({ url: r.url, via: r.via })),
        },
        null,
        2,
      ),
    )
    return
  }

  refuseIfPortBusy()

  const uploadsBefore = snapshotUploadsFs(uploadsDir)
  const backup = await createSqliteBackup(dbPath, backupDir, 'pages-cms-seed')
  console.error(`Backup: ${backup.backupPath}`)

  const injectFailureAfterMutation =
    process.env.PAGES_CMS_SEED_INJECT_FAILURE === '1' || args.includes('--inject-failure')
  const injectFailureAfterLegalMutation =
    process.env.PAGES_CMS_SEED_INJECT_LEGAL_FAILURE === '1' ||
    args.includes('--inject-legal-failure')

  try {
    const result = await withStrapi(async (strapi) =>
      seedPagesCmsFromFixtures(strapi, {
        fixturesBySlug,
        resolveMedia: (url) => resolveFixtureMediaUrl(url, { repoRoot: root }),
        injectFailureAfterMutation,
        injectFailureAfterLegalMutation,
      }),
    )
    console.log(JSON.stringify({ ok: true, backup: backup.backupPath, ...result }, null, 2))
  } catch (error) {
    console.error(`Seed FAILED: ${error.message}`)
    try {
      const rolled = rollback(backup.lastPath, uploadsBefore)
      console.error(
        JSON.stringify(
          {
            restored: true,
            backup: backup.lastPath,
            removedUploadFiles: rolled.removedUploadFiles.length,
          },
          null,
          2,
        ),
      )
    } catch (restoreError) {
      console.error(`Restore also failed: ${restoreError.message}`)
    }
    process.exit(error.code === 'PAGES_CMS_INJECTED_FAILURE' ? 42 : 1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
