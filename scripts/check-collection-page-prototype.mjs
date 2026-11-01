#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const failures = []
const html = read('collection-page-prototype.html')
const component = read('src/components/pages/CollectionPagePrototype.tsx')
const css = read('src/components/pages/CollectionPagePrototype.module.css')

const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`Missing ${label}: ${expected}`)
}

requireText(html, 'data-react-page="collection-page-prototype"', 'React page route')
requireText(component, 'data-collection-hero', 'collection hero')
requireText(component, 'data-collection-hero-media', 'isolated parallax media layer')
requireText(component, '<p>Коллекция Релакс</p>', 'Russian collection eyebrow inside hero')
requireText(component, '<h1>Relax</h1>', 'collection title inside hero')
requireText(component, 'data-collection-actions', 'collection share action')
requireText(component, 'copyCollectionLink', 'collection share behavior')
requireText(component, "window.requestAnimationFrame(updateParallax)", 'requestAnimationFrame parallax')
requireText(component, "prefers-reduced-motion: reduce", 'reduced-motion parallax guard')
requireText(component, 'data-collection-products', 'collection product list')
requireText(component, 'product.tags.map', 'product tags')
requireText(css, 'aspect-ratio: 21 / 9', 'wide hero ratio')
requireText(css, '.productImage {\n  display: block;\n  min-width: 0;\n  aspect-ratio: 1;', 'square product image contract')
requireText(css, 'var(--collection-parallax-y)', 'hero image parallax transform')
requireText(css, '.heroMedia img {', 'parallax scoped to hero media image')
if (css.includes('.hero img {')) failures.push('Parallax must not target every hero image, including share icons')

for (const forbidden of ['fetch(', '/api/', '/uploads/', 'usePageCms']) {
  if (component.includes(forbidden)) failures.push(`Collection prototype must stay CMS/API independent: ${forbidden}`)
}

const basenames = [
  'imperio_8069a3faa1',
  'luxor_adb0d9305d',
  'galaksi_29d31b0292',
  'discovery_caf02c8839',
  'davos_f60728f139',
  'davos_interior_pilot_01_37e208e0c8',
  'davos_product_studio_pilot_01_605d8327e4',
]

for (const basename of basenames) {
  for (const extension of ['avif', 'webp', 'png']) {
    const file = path.join(root, 'public/collection-page-prototype', `${basename}.${extension}`)
    if (!fs.existsSync(file)) failures.push(`Missing collection prototype media: ${path.relative(root, file)}`)
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Collection page prototype contract ok: ${basenames.length * 3} local media files, no CMS/API coupling.`)
