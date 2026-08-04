#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const uploadsDir = path.join(root, 'strapi-catalog/public/uploads')
const {
  canonicalPagesCmsFilename,
} = require('../strapi-catalog/src/api/pages-cms/utils/canonical-media-url.js')
const {
  ensureExistingUploadFile,
} = require('./pages-cms/seed-core.cjs')

const failures = []
const referenced = new Set()

function walk(value) {
  if (Array.isArray(value)) return value.forEach(walk)
  if (value && typeof value === 'object') return Object.values(value).forEach(walk)
  if (typeof value === 'string' && value.startsWith('/uploads/')) referenced.add(value)
}

for (const name of fs.readdirSync(publicDir).filter((item) => /^pages-.*\.snapshot\.json$/.test(item))) {
  walk(JSON.parse(fs.readFileSync(path.join(publicDir, name), 'utf8')))
}

for (const url of [...referenced].sort()) {
  const basename = path.posix.basename(url)
  const abs = path.join(uploadsDir, basename)
  if (!url.startsWith('/uploads/') || basename !== url.slice('/uploads/'.length)) {
    failures.push(`unsafe upload URL: ${url}`)
    continue
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile() || fs.statSync(abs).size === 0) {
    failures.push(`snapshot media missing/empty: ${url}`)
  }
  if (basename.startsWith('pages_cms_') && /_[0-9a-f]{10}\.[^.]+$/i.test(basename)) {
    failures.push(`non-deterministic pages CMS URL: ${url}`)
  }
}

// Regression: a surviving DB row must not suppress restoration of its missing file.
const probeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-cms-media-repair-'))
try {
  const source = path.join(probeRoot, 'icon-test.svg')
  fs.writeFileSync(source, '<svg xmlns="http://www.w3.org/2000/svg"/>')
  const fakeStrapi = { dirs: { app: { root: probeRoot } } }
  const existing = { name: 'pages-cms__0123456789abcdef__icon-test.svg' }
  const result = ensureExistingUploadFile(fakeStrapi, existing, source)
  const expected = canonicalPagesCmsFilename(existing.name)
  if (!result.repaired || path.basename(result.destination) !== expected || !fs.existsSync(result.destination)) {
    failures.push('missing-file repair probe did not materialize deterministic upload')
  }
} finally {
  fs.rmSync(probeRoot, { recursive: true, force: true })
}

if (failures.length) {
  console.error('check:pages-cms-media-integrity FAILED')
  failures.forEach((failure) => console.error(` - ${failure}`))
  process.exit(1)
}

console.log(`check:pages-cms-media-integrity PASS referenced=${referenced.size} repairProbe=ok`)
