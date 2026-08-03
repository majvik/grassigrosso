#!/usr/bin/env node
/**
 * Export six pages CMS disk snapshots from Node GET /api/pages/:slug.
 * Accepts only source=strapi (N3). Writes canonical `data` only + manifest sha256 (N5).
 *
 * Usage:
 *   PAGES_API_BASE_URL=http://127.0.0.1:3000 npm run pages:export-snapshot
 */
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { validateNodeEnvelope, validateSnapshotPayload } from './pages-cms/envelope.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')

const { PAGES_CMS_SLUGS } = require(path.join(
  rootDir,
  'strapi-catalog/src/api/pages-cms/utils/map-allowlist.js',
))
const { snapshotFilenameForSlug } = require(path.join(rootDir, 'lib/pages-cms-api.cjs'))

const baseUrl = String(process.env.PAGES_API_BASE_URL || process.env.CATALOG_API_BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  '',
)

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

async function fetchPage(slug) {
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

async function writeSnapshot(filename, canonical) {
  const text = `${JSON.stringify(canonical, null, 2)}\n`
  await fs.writeFile(path.join(publicDir, filename), text, 'utf8')
  return sha256(text)
}

async function main() {
  /** @type {Record<string, string>} */
  const hashes = {}
  await fs.mkdir(publicDir, { recursive: true })

  for (const slug of PAGES_CMS_SLUGS) {
    const body = await fetchPage(slug)
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
    const filename = snapshotFilenameForSlug(slug)
    hashes[slug] = await writeSnapshot(filename, body.data)
  }

  const manifest = {
    syncedAt: new Date().toISOString(),
    slugs: [...PAGES_CMS_SLUGS],
    sha256BySlug: hashes,
  }
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`
  await fs.writeFile(path.join(publicDir, 'pages-snapshot.manifest.json'), manifestText, 'utf8')

  console.log(`pages snapshot exported: ${PAGES_CMS_SLUGS.length} slugs (source=strapi)`)
}

main().catch((error) => {
  console.error(`pages:export-snapshot failed: ${error.message}`)
  process.exit(1)
})
