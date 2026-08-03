/**
 * Resolve fixture media {url} → absolute filesystem path.
 * Missing file after aliases/case-fold → caller must FAIL before DB mutation.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

/** Fixture URL → path relative to public/ (or absolute under uploads via /uploads/). */
export const MEDIA_URL_ALIASES = Object.freeze({
  '/partners-desktop.png': 'logos@2x-normal.png',
  '/partners-mobile.png': 'logos@2x-mobile.png',
  '/icon-quality.svg': 'icon-badge.svg',
  '/dealers-quality.png': 'quality-video-poster.jpg',
  '/collection-classic.png': 'collection-Classic.png',
  '/documents/Deklaraciya.pdf': 'documents/Декларация.pdf',
  '/documents/Sertifikat.pdf': 'documents/СертификатСоответствия.pdf',
  '/documents/Trademark.pdf': 'documents/СвидетельствоНаТоварныйЗнак.pdf',
  '/documents/presentation.pdf': 'documents/Grassigrosso-company.pdf',
})

/**
 * @param {string} url
 * @param {{ repoRoot?: string }} [opts]
 * @returns {{ url: string, absolutePath: string, via: 'exact' | 'alias' | 'casefold' }}
 */
export function resolveFixtureMediaUrl(url, opts = {}) {
  const root = opts.repoRoot || repoRoot
  if (typeof url !== 'string' || !url.startsWith('/')) {
    throw new Error(`Invalid media url: ${JSON.stringify(url)}`)
  }

  const publicDir = path.join(root, 'public')
  const uploadsDir = path.join(root, 'strapi-catalog/public/uploads')

  /** @param {string} rel */
  function tryPublic(rel) {
    const abs = path.join(publicDir, rel)
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs
    return null
  }

  if (url.startsWith('/uploads/')) {
    const name = url.slice('/uploads/'.length)
    const abs = path.join(uploadsDir, name)
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return { url, absolutePath: abs, via: 'exact' }
    }
    throw new Error(`Missing upload media for ${url} → ${abs}`)
  }

  const alias = MEDIA_URL_ALIASES[url]
  if (alias) {
    const abs = tryPublic(alias)
    if (abs) return { url, absolutePath: abs, via: 'alias' }
    throw new Error(`Alias target missing for ${url} → public/${alias}`)
  }

  const rel = url.replace(/^\//, '')
  const exact = tryPublic(rel)
  if (exact) return { url, absolutePath: exact, via: 'exact' }

  // Case-insensitive match within the same directory (macOS vs Linux)
  const dir = path.join(publicDir, path.dirname(rel))
  const base = path.basename(rel)
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    const match = fs.readdirSync(dir).find((name) => name.toLowerCase() === base.toLowerCase())
    if (match) {
      return { url, absolutePath: path.join(dir, match), via: 'casefold' }
    }
  }

  throw new Error(`Missing media file for ${url} → public/${rel}`)
}

/**
 * Collect every media stub `{ url }` from a fixture tree.
 * @param {unknown} node
 * @param {string[]} [out]
 */
export function collectMediaUrls(node, out = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectMediaUrls(item, out))
    return out
  }
  if (!node || typeof node !== 'object') return out
  const keys = Object.keys(node)
  if (
    typeof node.url === 'string' &&
    node.url.startsWith('/') &&
    keys.every((k) =>
      ['url', 'alt', 'alternativeText', 'caption', 'name', 'mime', 'width', 'height', 'size'].includes(k),
    )
  ) {
    out.push(node.url)
  }
  for (const value of Object.values(node)) collectMediaUrls(value, out)
  return out
}
