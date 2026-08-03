#!/usr/bin/env node
/**
 * Sync pages-cms fixtures + public snapshots for wired Phase 4 pages
 * from hardcoded React defaults (CMS-owned projection).
 *
 * - index: full INDEX_PAGE_DEFAULTS → fixture + snapshot
 * - hotels: full HOTELS_PAGE_DEFAULTS → fixture + snapshot
 * - dealers: full DEALERS_PAGE_DEFAULTS → fixture + snapshot
 * - download-catalog: DOWNLOAD_CATALOG_TEXT_DEFAULTS → snapshot;
 *   fixture keeps slides/slider fields from existing fixture, replaces texts
 *
 * Does NOT run strapi:sync-seed. Local Strapi seed still needs fixtures re-seed
 * when editors want Strapi to match (separate request).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as esbuild from 'esbuild'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixturesDir = path.join(root, 'scripts/fixtures/pages-cms')
const publicDir = path.join(root, 'public')
const manifestPath = path.join(publicDir, 'pages-snapshot.manifest.json')

const {
  serializeCanonicalSnapshot,
  sha256Text,
  snapshotFilenameForSlug,
  PAGES_SNAPSHOT_MANIFEST_NAME,
  verifyPagesSnapshotSet,
} = require(path.join(root, 'lib/pages-cms-snapshots.cjs'))
const { PAGES_CMS_SLUGS } = require(
  path.join(root, 'strapi-catalog/src/api/pages-cms/utils/map-allowlist.js'),
)

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, serializeCanonicalSnapshot(value), 'utf8')
}

async function bundleExport(entry, exportNames) {
  const outfile = path.join(os.tmpdir(), `pages-defaults-${process.pid}-${path.basename(entry)}.mjs`)
  await esbuild.build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    packages: 'bundle',
    logLevel: 'silent',
  })
  const mod = await import(pathToFileURL(outfile).href)
  try {
    fs.unlinkSync(outfile)
  } catch {
    /* ignore */
  }
  const out = {}
  for (const name of exportNames) {
    if (!(name in mod)) throw new Error(`Missing export ${name} from ${entry}`)
    out[name] = mod[name]
  }
  return out
}

function cmsProjection(defaults) {
  return JSON.parse(JSON.stringify(defaults))
}

const { INDEX_PAGE_DEFAULTS } = await bundleExport('src/components/pages/index-page-defaults.ts', [
  'INDEX_PAGE_DEFAULTS',
])
const { HOTELS_PAGE_DEFAULTS } = await bundleExport('src/components/pages/hotels-page-defaults.ts', [
  'HOTELS_PAGE_DEFAULTS',
])
const { DEALERS_PAGE_DEFAULTS } = await bundleExport(
  'src/components/pages/dealers-page-defaults.ts',
  ['DEALERS_PAGE_DEFAULTS'],
)
const { DOWNLOAD_CATALOG_TEXT_DEFAULTS } = await bundleExport(
  'src/components/pages/DownloadCatalogPage.tsx',
  ['DOWNLOAD_CATALOG_TEXT_DEFAULTS'],
)

const indexCms = cmsProjection(INDEX_PAGE_DEFAULTS)
const hotelsCms = cmsProjection(HOTELS_PAGE_DEFAULTS)
const dealersCms = cmsProjection(DEALERS_PAGE_DEFAULTS)
const downloadTexts = cmsProjection(DOWNLOAD_CATALOG_TEXT_DEFAULTS)

writeJson(path.join(fixturesDir, 'index.json'), indexCms)
writeJson(path.join(fixturesDir, 'hotels.json'), hotelsCms)
writeJson(path.join(fixturesDir, 'dealers.json'), dealersCms)

const downloadFixturePath = path.join(fixturesDir, 'download-catalog.json')
const prevDownload = JSON.parse(fs.readFileSync(downloadFixturePath, 'utf8'))
const downloadFixture = {
  ...downloadTexts,
  media_display_mode: prevDownload.media_display_mode ?? 'image_only',
  slider_autoplay_ms: prevDownload.slider_autoplay_ms ?? 6500,
  slides: prevDownload.slides ?? [],
}
writeJson(downloadFixturePath, downloadFixture)

writeJson(path.join(publicDir, 'pages-index.snapshot.json'), indexCms)
writeJson(path.join(publicDir, 'pages-hotels.snapshot.json'), hotelsCms)
writeJson(path.join(publicDir, 'pages-dealers.snapshot.json'), dealersCms)
writeJson(path.join(publicDir, 'pages-download-catalog.snapshot.json'), downloadTexts)

/** Recompute manifest hashes from on-disk snapshot files (all six). */
const sha256BySlug = {}
for (const slug of PAGES_CMS_SLUGS) {
  const file = path.join(publicDir, snapshotFilenameForSlug(slug))
  sha256BySlug[slug] = sha256Text(fs.readFileSync(file, 'utf8'))
}
const manifest = {
  syncedAt: new Date().toISOString(),
  slugs: [...PAGES_CMS_SLUGS],
  sha256BySlug,
}
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

const fails = verifyPagesSnapshotSet({
  manifestPath,
  snapshotsDir: publicDir,
})
if (fails.length) {
  console.error('Snapshot verify failed after sync:')
  for (const f of fails) console.error(` - ${f}`)
  process.exit(1)
}

console.log(
  `Synced index + hotels + dealers + download-catalog fixtures/snapshots (${PAGES_SNAPSHOT_MANIFEST_NAME} ok)`,
)
console.log(`  index sha256=${sha256BySlug.index.slice(0, 12)}…`)
console.log(`  hotels sha256=${sha256BySlug.hotels.slice(0, 12)}…`)
console.log(`  dealers sha256=${sha256BySlug.dealers.slice(0, 12)}…`)
console.log(`  download-catalog sha256=${sha256BySlug['download-catalog'].slice(0, 12)}…`)
console.log('Note: local Strapi .tmp not updated (no seed / no sync-seed).')
