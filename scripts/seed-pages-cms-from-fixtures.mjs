#!/usr/bin/env node
/**
 * Seed six Wave 1 page single types from fixtures into local Strapi .tmp/data.db.
 *
 * - Backs up .tmp/data.db before mutation
 * - Preflights all media (FAIL before DB writes if missing)
 * - On seed error after mutation: restores backup
 * - Does NOT run strapi:sync-seed
 *
 * Usage:
 *   node scripts/seed-pages-cms-from-fixtures.mjs
 *   node scripts/seed-pages-cms-from-fixtures.mjs --preflight-only
 *   node scripts/seed-pages-cms-from-fixtures.mjs --restore-backup <path>
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
const dbPath = path.join(strapiRoot, '.tmp/data.db')
const backupDir = path.join(strapiRoot, '.tmp/pages-cms-seed-backups')
const fixturesDir = path.join(root, 'scripts/fixtures/pages-cms')

const { PAGES_CMS_SLUGS } = require(path.join(
  strapiRoot,
  'src/api/pages-cms/utils/map-allowlist.js',
))
const { seedPagesCmsFromFixtures } = require('./pages-cms/seed-core.cjs')
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

function createBackup() {
  fs.mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = path.join(backupDir, `data.db.before-pages-cms-seed.${stamp}`)
  fs.copyFileSync(dbPath, dest)
  // Also keep a stable "last" pointer for restore
  const last = path.join(backupDir, 'data.db.last-before-seed')
  fs.copyFileSync(dbPath, last)
  return { dest, last }
}

function restoreBackup(backupPath) {
  if (!fs.existsSync(backupPath)) throw new Error(`Backup not found: ${backupPath}`)
  fs.copyFileSync(backupPath, dbPath)
  console.error(`Restored ${dbPath} from ${backupPath}`)
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

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--restore-backup') {
    restoreBackup(args[1] || path.join(backupDir, 'data.db.last-before-seed'))
    return
  }

  assertDbExists()
  const fixturesBySlug = readFixtures()

  let preflight
  try {
    preflight = preflightMedia(fixturesBySlug)
  } catch (error) {
    console.error(`Preflight media FAILED (no DB mutation): ${error.message}`)
    process.exit(1)
  }

  if (args.includes('--preflight-only')) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mediaCount: preflight.unique.length,
          resolved: preflight.resolved.map((r) => ({ url: r.url, via: r.via })),
        },
        null,
        2,
      ),
    )
    return
  }

  if (portInUse(1337)) {
    console.error(
      'Strapi appears to be listening on :1337. Stop it before seed (exclusive .tmp/data.db access).',
    )
    process.exit(1)
  }

  const backup = createBackup()
  console.log(`Backup: ${backup.dest}`)

  try {
    const result = await withStrapi(async (strapi) =>
      seedPagesCmsFromFixtures(strapi, {
        fixturesBySlug,
        resolveMedia: (url) => resolveFixtureMediaUrl(url, { repoRoot: root }),
      }),
    )
    console.log(JSON.stringify({ ok: true, backup: backup.dest, ...result }, null, 2))
  } catch (error) {
    console.error(`Seed FAILED: ${error.message}`)
    try {
      restoreBackup(backup.last)
    } catch (restoreError) {
      console.error(`Restore also failed: ${restoreError.message}`)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
