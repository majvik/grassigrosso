#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const failures = []
const html = read('product-page-prototype.html')
const component = read('src/components/pages/ProductPagePrototype.tsx')
const css = read('src/components/pages/ProductPagePrototype.module.css')
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
requireText(component, 'PRODUCT_COVER_MOBILE_SRC', 'separate mobile SVG cover source')
requireText(component, '/product-page-prototype/davos-product-cover-desktop-full.svg', 'complete desktop SVG cover')
requireText(component, '/product-page-prototype/davos-product-cover-mobile.svg', 'complete mobile SVG cover')
requireText(component, 'data-product-cover-media', 'cover media loading target')
requireText(component, "window.dispatchEvent(new CustomEvent('product-cover-ready'))", 'cover readiness event')
requireText(component, 'type="image/svg+xml" srcSet={PRODUCT_COVER_MOBILE_SRC}', 'mobile SVG picture source')
requireText(component, 'media="(max-width: 900px)"', 'responsive mobile cover source')
requireText(pageBootstrap, "document.body?.dataset.page === 'product-page-prototype'", 'prototype preload gate')
requireText(pageBootstrap, "window.addEventListener('product-cover-ready', resolve, { once: true })", 'preloader waits for cover readiness')
requireText(component, 'Коллекция Relax', 'product collection eyebrow')
requireText(component, 'className={styles.primarySpecs}', 'two-column primary specifications')
requireText(css, '.primarySpecs {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 20px 48px;\n  width: fit-content;\n  max-width: 100%;', 'content-sized wrapping primary specifications')
requireText(css, '.primarySpecs div {\n  flex: 0 0 auto;\n  max-width: 100%;', 'natural-width primary specification columns')
requireText(component, 'Жёсткий пружинный матрас', 'standalone product description')
requireText(component, 'characteristicsTitle}>Характеристики', 'characteristics section heading')
requireText(css, '.productIntro {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));', 'equal product intro columns')
requireText(css, '.characteristicsBlock {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));', 'equal characteristics columns')
requireText(css, '.productIntro {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: clamp(32px, 5vw, 80px);\n  align-items: stretch;', 'equal-height product intro columns')
requireText(css, '.productSlider {\n  width: 100%;\n  height: 100%;\n  min-height: 0;\n  aspect-ratio: 1;', 'stretching square product slider')
requireText(css, '.characteristicsMedia {\n  width: 100%;\n  height: 100%;\n  min-height: 0;\n  aspect-ratio: 1;', 'stretching square characteristics image')
requireText(css, '.productSummary {\n  box-sizing: border-box;', 'product summary surface')
requireText(css, '.characteristicsText {\n  box-sizing: border-box;', 'characteristics text surface')
requireText(css, '@media (max-width: 900px)', 'tablet stacking breakpoint')
requireText(css, '.characteristicsBlock {\n    grid-template-columns: minmax(0, 1fr);', 'stacked mobile characteristics block')
requireText(css, '.productSlider {\n    height: auto;', 'mobile product slider restores intrinsic square height')
requireText(css, '.characteristicsMedia {\n    height: auto;', 'mobile characteristics image restores intrinsic square height')
requireText(component, '<PrototypePicture basename="davos_material_layers_detail_01" />', 'characteristics layers media')
requireText(component, 'data-product-editorial-gallery', 'five-image editorial gallery')
requireText(component, "const DAVOS_MEDIA = [\n  'davos_f60728f139',", 'original Davos slider media')
requireText(component, 'const DAVOS_EDITORIAL_MEDIA = [', 'independent editorial gallery media')
requireText(component, 'DAVOS_EDITORIAL_MEDIA.map', 'editorial gallery images')
requireText(component, "'davos_gallery_knit_detail_01'", 'replacement gallery image 1')
requireText(component, "'davos_gallery_coir_detail_02'", 'replacement gallery image 2')
requireText(component, "'davos_gallery_dark_textile_03'", 'replacement gallery image 3')
requireText(component, "'davos_gallery_quilt_detail_04'", 'replacement gallery image 4')
requireText(component, "'davos_gallery_foam_detail_05'", 'replacement gallery image 5')
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
const mobileCoverSvg = path.join(root, 'public/product-page-prototype/davos-product-cover-mobile.svg')
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

if (!fs.existsSync(mobileCoverSvg) || fs.statSync(mobileCoverSvg).size === 0) {
  failures.push('Missing non-empty mobile SVG cover')
} else {
  const mobileCoverSource = fs.readFileSync(mobileCoverSvg, 'utf8')
  requireText(mobileCoverSource, 'viewBox="0 0 720 720"', 'square mobile SVG viewBox')
}

for (const forbidden of ['fetch(', '/api/', '/uploads/', 'usePageCms']) {
  if (component.includes(forbidden)) failures.push(`Prototype must stay CMS/API independent: ${forbidden}`)
}

const basenames = [
  'davos_f60728f139',
  'davos_product_extreme_macro_pilot_03_c9cc9e687e',
  'davos_product_studio_pilot_01_605d8327e4',
  'davos_interior_pilot_01_37e208e0c8',
  'davos_material_textile_top_01_8162c06b96',
  'davos_material_layers_detail_01',
  'davos_gallery_knit_detail_01',
  'davos_gallery_coir_detail_02',
  'davos_gallery_dark_textile_03',
  'davos_gallery_quilt_detail_04',
  'davos_gallery_foam_detail_05',
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
