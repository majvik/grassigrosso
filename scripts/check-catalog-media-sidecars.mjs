import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { preferAvifVariant } = require('../strapi-catalog/src/api/catalog/utils/prefer-avif.js')
const { resolveImageMedia, resolveVideoMedia } = require('../strapi-catalog/src/api/catalog/utils/resolve-media-sources.js')

function touch(file, mtimeMs) {
  const date = new Date(mtimeMs)
  utimesSync(file, date, date)
}

const publicDir = mkdtempSync(path.join(tmpdir(), 'catalog-sidecars-'))
const uploads = path.join(publicDir, 'uploads')
mkdirSync(uploads)

try {
  const now = Date.now()
  const png = path.join(uploads, 'davos.png')
  const avif = path.join(uploads, 'davos.avif')
  const webp = path.join(uploads, 'davos.webp')
  writeFileSync(png, 'replaced-png')
  writeFileSync(avif, 'original-avif')
  writeFileSync(webp, 'original-webp')
  touch(png, now)
  touch(avif, now - 60_000)
  touch(webp, now - 60_000)

  const url = '/uploads/davos.png'
  const stale = resolveImageMedia(url, publicDir)
  assert.equal(stale.src, url, 'newer original must win over a stale avif/webp sidecar')
  assert.deepEqual(stale.sources, [])
  assert.equal(preferAvifVariant(url, publicDir), url)

  touch(webp, now + 1000)
  const webpOnly = resolveImageMedia(url, publicDir)
  assert.equal(webpOnly.src, '/uploads/davos.webp', 'a fresh webp sidecar is used when avif is stale')

  touch(avif, now + 2000)
  const fresh = resolveImageMedia(url, publicDir)
  assert.equal(fresh.src, '/uploads/davos.avif', 'a fresh avif sidecar stays preferred')
  assert.equal(preferAvifVariant(url, publicDir), '/uploads/davos.avif')

  const lone = resolveImageMedia('/uploads/missing-sidecar.png', publicDir)
  assert.equal(lone.src, '/uploads/missing-sidecar.png')

  const mp4 = path.join(uploads, 'clip.mp4')
  const webm = path.join(uploads, 'clip.webm')
  writeFileSync(mp4, 'replaced-mp4')
  writeFileSync(webm, 'original-webm')
  touch(mp4, now)
  touch(webm, now - 60_000)
  assert.equal(resolveVideoMedia('/uploads/clip.mp4', publicDir).src, '/uploads/clip.mp4')
  touch(webm, now + 1000)
  assert.equal(resolveVideoMedia('/uploads/clip.mp4', publicDir).src, '/uploads/clip.webm')

  console.log('check:catalog-media-sidecars ok')
} finally {
  rmSync(publicDir, { recursive: true, force: true })
}
