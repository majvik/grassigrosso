#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const failures = []
const html = read('product-page-prototype.html')
const component = read('src/components/pages/ProductPagePrototype.tsx')
const pageBootstrap = read('src/page-bootstrap.js')
const coverPreparationScript = read('scripts/prepare-cover-svg-animation.mjs')
const vite = read('vite.config.mjs')

const requireText = (source, expected, label) => {
  if (!source.includes(expected)) failures.push(`Missing ${label}: ${expected}`)
}

requireText(html, 'data-react-page="product-page-prototype"', 'prototype React route')
requireText(component, 'data-product-prototype', 'prototype marker')
requireText(component, 'data-product-cover-image', 'standalone promotional cover slot')
requireText(component, 'PRODUCT_COVER_DESKTOP_SRC', 'replaceable desktop animated cover source')
requireText(component, '/product-page-prototype/davos-product-cover-desktop-full.svg', 'complete desktop SVG cover')
requireText(component, 'data-product-cover-media', 'cover media loading target')
requireText(component, "window.dispatchEvent(new CustomEvent('product-cover-ready'))", 'cover readiness event')
requireText(component, 'davos_interior_pilot_01_37e208e0c8', 'static promotional cover image')
requireText(component, 'davos_product_studio_pilot_01_605d8327e4', 'separate square mobile promotional image')
requireText(component, 'media="(max-width: 900px)"', 'responsive mobile cover source')
requireText(pageBootstrap, "document.body?.dataset.page === 'product-page-prototype'", 'prototype preload gate')
requireText(pageBootstrap, "window.addEventListener('product-cover-ready', resolve, { once: true })", 'preloader waits for cover readiness')
requireText(component, 'Коллекция Relax', 'product collection eyebrow')
requireText(component, 'className={styles.primarySpecs}', 'two-column primary specifications')
requireText(component, 'Жёсткий пружинный матрас', 'standalone product description')
requireText(component, 'characteristicsTitle}>Характеристики', 'characteristics section heading')
requireText(component, 'davos_material_textile_top_01_8162c06b96', 'characteristics media')
requireText(component, 'data-product-editorial-gallery', 'five-image editorial gallery')
requireText(component, 'DAVOS_MEDIA.map', 'editorial gallery images')
requireText(component, 'editorialGalleryHitAreas', 'stable editorial gallery hover zones')
requireText(component, 'editorialGalleryHitAreaActive', 'hover zone synchronized with expanded image')
requireText(component, 'setTimeout(() => setActiveIndex(index), 100)', 'editorial gallery hover intent delay')
requireText(component, 'data-product-position-cta', 'container-width position CTA')
requireText(component, 'Связаться по позиции', 'position CTA label')
requireText(component, 'data-related-collection', 'related collection section')
requireText(component, 'Коллекция Relax', 'collection return link')
requireText(component, 'RELATED_COLLECTION_PRODUCTS.map', 'three related product cards')
requireText(component, '>Давос</h1>', 'Davos title')
requireText(component, 'до 160 кг', 'Davos load')
requireText(component, '9/10', 'Davos firmness')
requireText(vite, "'/product-page-prototype': 'product-page-prototype.html'", 'clean Vite route')

const desktopCoverSvg = path.join(root, 'public/product-page-prototype/davos-product-cover-desktop-full.svg')
if (!fs.existsSync(desktopCoverSvg) || fs.statSync(desktopCoverSvg).size === 0) {
  failures.push('Missing non-empty Figma desktop SVG cover')
} else {
  const desktopCoverSource = fs.readFileSync(desktopCoverSvg, 'utf8')
  requireText(desktopCoverSource, 'class="cover-title-letter"', 'independently animated SVG title letters')
  requireText(desktopCoverSource, '@keyframes cover-title-letter-slide-up', 'SVG letter entrance animation')
  requireText(desktopCoverSource, 'transform: translateY(240px)', 'SVG title starts below its mask')
  requireText(desktopCoverSource, 'prefers-reduced-motion: reduce', 'SVG reduced-motion fallback')
}
requireText(coverPreparationScript, 'letterCount - letterIndex - 1', 'stagger follows visual word order')
requireText(coverPreparationScript, 'one path per letter', 'separate-letter SVG contract')

for (const forbidden of ['fetch(', '/api/', '/uploads/', 'usePageCms']) {
  if (component.includes(forbidden)) failures.push(`Prototype must stay CMS/API independent: ${forbidden}`)
}

const basenames = [
  'davos_f60728f139',
  'davos_product_extreme_macro_pilot_03_c9cc9e687e',
  'davos_product_studio_pilot_01_605d8327e4',
  'davos_interior_pilot_01_37e208e0c8',
  'davos_material_textile_top_01_8162c06b96',
  'imperio_8069a3faa1',
  'luxor_adb0d9305d',
  'galaksi_29d31b0292',
]

for (const basename of basenames) {
  for (const extension of ['avif', 'webp', 'png']) {
    const file = path.join(root, 'public/product-page-prototype', `${basename}.${extension}`)
    if (!fs.existsSync(file)) failures.push(`Missing static prototype media: ${path.relative(root, file)}`)
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Product page prototype contract ok: static Davos content, ${basenames.length * 3} local media files, no CMS/API coupling.`)
