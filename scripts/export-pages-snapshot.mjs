#!/usr/bin/env node
/**
 * Export pages CMS disk snapshots from Node GET /api/pages/:slug (all allowlisted slugs).
 * Accepts only source=strapi (N3).
 * Atomic publish: validate all responses → stage → verify (N5) → swap with rollback.
 *
 * Usage:
 *   PAGES_API_BASE_URL=http://127.0.0.1:3000 npm run pages:export-snapshot
 */
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validateNodeEnvelope, validateSnapshotPayload } from './pages-cms/envelope.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const defaultPublicDir = path.join(rootDir, 'public')

const { PAGES_CMS_SLUGS } = require(path.join(
  rootDir,
  'strapi-catalog/src/api/pages-cms/utils/map-allowlist.js',
))
const {
  writePagesSnapshotsAtomic,
  verifyPagesSnapshotSet,
  PAGES_SNAPSHOT_MANIFEST_NAME,
  fingerprintPagesSnapshotDir,
} = require(path.join(rootDir, 'lib/pages-cms-snapshots.cjs'))

function defaultBaseUrl() {
  return String(
    process.env.PAGES_API_BASE_URL || process.env.CATALOG_API_BASE_URL || 'http://127.0.0.1:3000',
  ).replace(/\/+$/, '')
}

async function fetchPageFromBase(baseUrl, slug) {
  const url = `${baseUrl}/api/pages/${encodeURIComponent(slug)}`
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error(`${slug}: non-JSON response HTTP ${response.status}`)
  }
  if (!response.ok) {
    throw new Error(`${slug}: expected 2xx, got ${response.status}`)
  }
  return body
}

/**
 * Fetch + validate all six pages, then atomically publish.
 * Late-slug failures never write tracked snapshots (staging only after full validation).
 *
 * @param {{
 *   baseUrl?: string,
 *   publicDir?: string,
 *   fetchPage?: (slug: string) => Promise<object>,
 * }} [opts]
 */
export async function exportPagesSnapshots(opts = {}) {
  const targetDir = opts.publicDir || defaultPublicDir
  const baseUrl = (opts.baseUrl || defaultBaseUrl()).replace(/\/+$/, '')
  const fetchOne = opts.fetchPage || ((slug) => fetchPageFromBase(baseUrl, slug))
  const before = fingerprintPagesSnapshotDir(targetDir)

  /** @type {Array<{ slug: string, body: object }>} */
  const fetched = []
  for (const slug of PAGES_CMS_SLUGS) {
    fetched.push({ slug, body: await fetchOne(slug) })
  }

  /** @type {Record<string, object>} */
  const canonicalBySlug = {}
  for (const { slug, body } of fetched) {
    const envelopeFails = validateNodeEnvelope(body, slug)
    if (envelopeFails.length) {
      throw new Error(`${slug}: invalid node envelope:\n - ${envelopeFails.join('\n - ')}`)
    }
    if (body.source !== 'strapi') {
      throw new Error(
        `${slug}: exporter requires source=strapi (got ${JSON.stringify(body.source)}) — refuse memory-cache/disk-snapshot (N3)`,
      )
    }
    const snapshotFails = validateSnapshotPayload(body.data, slug)
    if (snapshotFails.length) {
      throw new Error(`${slug}: canonical data invalid:\n - ${snapshotFails.join('\n - ')}`)
    }
    canonicalBySlug[slug] = body.data
  }

  writePagesSnapshotsAtomic(targetDir, canonicalBySlug)

  const verifyFails = verifyPagesSnapshotSet({
    manifestPath: path.join(targetDir, PAGES_SNAPSHOT_MANIFEST_NAME),
    snapshotsDir: targetDir,
    expectedSlugs: [...PAGES_CMS_SLUGS],
  })
  if (verifyFails.length) {
    throw new Error(`post-publish verify failed:\n - ${verifyFails.join('\n - ')}`)
  }

  return { publicDir: targetDir, before, after: fingerprintPagesSnapshotDir(targetDir) }
}

async function main() {
  await exportPagesSnapshots()
  console.log(`pages snapshot exported: ${PAGES_CMS_SLUGS.length} slugs (source=strapi, atomic)`)
}

const isDirectRun =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirectRun) {
  main().catch((error) => {
    console.error(`pages:export-snapshot failed: ${error.message}`)
    process.exit(1)
  })
}
