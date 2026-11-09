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
requireText(component, 'data-product-cover-back', 'cover-level back navigation')
requireText(component, 'className={styles.coverBackLabel}>Назад в каталог', 'expandable cover back label')
requireText(css, '.coverBack:hover .coverBackLabel', 'desktop hover expansion for cover back navigation')
requireText(css, '@media (hover: none)', 'touch-safe cover back navigation')
requireText(component, 'PRODUCT_COVER_DESKTOP_SRC', 'replaceable desktop animated cover source')
requireText(component, 'PRODUCT_COVER_MOBILE_SRC', 'separate mobile SVG cover source')
requireText(component, 'PRODUCT_COVER_LOCATION_LINE_SRC', 'replaceable cover location line asset')
requireText(component, 'data-product-cover-location', 'cover location metadata block')
requireText(component, 'Тоскана, Италия', 'cover location text')
requireText(component, '43,7696° N / 11,2558° E', 'cover coordinates')
requireText(component, '15.09.2026 · 08:30 CEST · UTC+2', 'cover datetime metadata')
requireText(component, 'Азимут 101,5° · Высота 16,7°', 'cover sun metadata')
requireText(css, 'container-type: inline-size;', 'cover container for proportional overlays')
requireText(css, '.coverLocation {\n  position: absolute;\n  z-index: 2;\n  right: 3.8095cqw;\n  bottom: 2.8571cqw;', 'proportionally scaled desktop cover location spacing')
requireText(css, 'font-size: 0.7143cqw;', 'proportionally scaled desktop cover location text')
requireText(css, '.coverLocation {\n    right: 24px;\n    bottom: 24px;', 'mobile cover location spacing')
requireText(component, '/product-page-prototype/davos-product-cover-desktop-full.svg', 'complete desktop SVG cover')
requireText(component, '/product-page-prototype/davos-product-cover-mobile.svg', 'complete mobile SVG cover')
requireText(component, 'data-product-cover-media', 'cover media loading target')
requireText(component, "window.dispatchEvent(new CustomEvent('product-cover-ready'))", 'cover readiness event')
requireText(component, 'mobile?.fallbackSrc || mobile?.src || PRODUCT_COVER_MOBILE_SRC', 'CMS-aware mobile SVG picture source')
requireText(component, 'media="(max-width: 900px)"', 'responsive mobile cover source')
requireText(pageBootstrap, "document.body?.dataset.page === 'product-page-prototype'", 'prototype preload gate')
requireText(pageBootstrap, "window.addEventListener('product-cover-ready', resolve, { once: true })", 'preloader waits for cover readiness')
requireText(component, 'Коллекция {collectionName}', 'dynamic product collection eyebrow')
requireText(component, 'className={styles.primarySpecs}', 'two-column primary specifications')
requireText(css, '.primarySpecs {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 20px 48px;\n  width: fit-content;\n  max-width: 100%;', 'content-sized wrapping primary specifications')
requireText(css, '.primarySpecs div {\n  flex: 0 0 auto;\n  max-width: 100%;', 'natural-width primary specification columns')
requireText(component, 'Натуральная кокосовая койра с обеих сторон придаёт матрасу жёсткость.', 'standalone product description')
requireText(component, 'characteristicsTitle}>Характеристики', 'characteristics section heading')
requireText(component, 'const DAVOS_SIZES = [', 'structured Davos size options')
requireText(component, 'className={styles.sizeCards}', 'size micro-card list')
requireText(component, 'className={styles.sizeCardIcon}', 'size card mattress icon')
requireText(component, 'viewBox="0 0 210 220"', 'client proportional mattress size icon')
requireText(component, 'M19 12H5m6-6-6 6 6 6', 'client back arrow geometry')
requireText(component, 'Натуральная кокосовая койра с обеих сторон придаёт матрасу жёсткость.', 'client product description')
requireText(component, 'styles.coverSpec', 'cover specification after layers')
requireText(css, '.sizeCards {', 'responsive size card layout')
requireText(css, '.productIntro {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));', 'equal product intro columns')
requireText(css, '.characteristicsBlock {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));', 'equal characteristics columns')
requireText(css, '.productIntro {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 0;\n  align-items: stretch;\n  overflow: hidden;\n  border-radius: clamp(24px, 2.5vw, 40px);\n  background: var(--color-bg-beige);', 'unified product intro surface')
requireText(css, '.productSlider {\n  width: 100%;\n  height: 100%;\n  min-height: 0;\n  aspect-ratio: 1;', 'stretching square product slider')
requireText(css, '.characteristicsMedia {\n  display: grid;\n  width: 100%;\n  height: 100%;', 'characteristics media grid fills the paired panel')
requireText(css, '.productSummary {\n  --prototype-panel-padding: clamp(32px, 4vw, 56px);\n  box-sizing: border-box;', 'product summary content')
requireText(css, '@media (min-width: 1281px)', 'desktop-only doubled padding breakpoint')
requireText(css, '.productSummary {\n    padding-left: calc(2 * var(--prototype-panel-padding));', 'desktop double inner padding for product summary')
requireText(css, '.characteristicsBlock {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 0;\n  align-items: stretch;\n  margin-top: clamp(48px, 7vw, 112px);\n  overflow: hidden;\n  border-radius: clamp(24px, 2.5vw, 40px);\n  background: var(--color-bg-beige);', 'unified characteristics surface')
requireText(css, '.characteristicsText {\n  --prototype-panel-padding: clamp(32px, 4vw, 56px);\n  box-sizing: border-box;', 'characteristics text content')
requireText(css, '.characteristicsText {\n    padding-right: calc(2 * var(--prototype-panel-padding));', 'desktop double inner padding for characteristics text')
requireText(css, '@media (max-width: 900px)', 'tablet stacking breakpoint')
requireText(css, '.characteristicsBlock {\n    grid-template-columns: minmax(0, 1fr);', 'stacked mobile characteristics block')
requireText(css, '.productSlider {\n    height: auto;', 'mobile product slider restores intrinsic square height')
requireText(css, '.characteristicsMedia {\n    height: auto;', 'mobile characteristics image restores intrinsic square height')
requireText(css, '.productSummary {\n    padding: var(--prototype-panel-padding);', 'mobile product summary resets balanced padding')
requireText(css, '.characteristicsText {\n    padding: var(--prototype-panel-padding);', 'mobile characteristics text resets balanced padding')
requireText(component, 'const DAVOS_CHARACTERISTICS_MEDIA = [', 'extensible characteristics media collection')
requireText(component, "data-media-count={characteristicsMedia.length}", 'characteristics media count contract')
requireText(component, 'useDavosFallback\n      ? DAVOS_CHARACTERISTICS_MEDIA', 'characteristics media uses Davos fallback only for Davos')
requireText(css, '.characteristicsMedia[data-media-count=\'1\']', 'single characteristics image keeps an inset frame')
requireText(css, '.characteristicsMedia[data-media-count=\'4\']', 'four-image characteristics grid support')
requireText(css, '.characteristicsMedia[data-media-count=\'6\']', 'six-image characteristics grid support')
requireText(css, 'border-radius: 0;\n  background: var(--color-bg-beige);', 'characteristics media shares the section background')
requireText(component, 'data-product-editorial-gallery', 'five-image editorial gallery')
requireText(component, 'data-product-fullscreen-gallery', 'shared fullscreen product gallery')
requireText(component, 'data-product-slider-gallery-trigger', 'slider image fullscreen trigger')
requireText(component, 'data-product-characteristics-gallery-trigger', 'characteristics image fullscreen trigger')
requireText(css, '.fullscreenGallery', 'fullscreen gallery styling')
requireText(css, 'background: #fff;', 'fullscreen gallery white background')
requireText(css, '.fullscreenGalleryStage picture,', 'fullscreen gallery picture containment')
requireText(css, 'object-position: center;', 'fullscreen gallery centered media')
requireText(css, 'box-sizing: border-box;', 'fullscreen gallery viewport-safe sizing')
requireText(css, 'border-radius: 0;', 'fullscreen gallery square media')
requireText(css, 'width: auto !important;', 'fullscreen gallery overrides global responsive image width')
requireText(component, "document.body.style.overflow = 'hidden'", 'fullscreen gallery locks page scrolling')
requireText(component, "document.documentElement.style.overflow = 'hidden'", 'fullscreen gallery locks root scrolling')
requireText(component, 'centerVisibleImageContent', 'transparent fullscreen media visual centering')
requireText(css, '.characteristicsMediaButton', 'rounded characteristics image button')
requireText(css, 'cursor: pointer;', 'pointer cursors for product interactions')
requireText(component, "const DAVOS_MEDIA = [\n  'davos_f60728f139',", 'original Davos slider media')
requireText(component, 'const DAVOS_EDITORIAL_MEDIA = [', 'independent editorial gallery media')
requireText(component, 'materials.length ? materials : useDavosFallback ? DAVOS_EDITORIAL_MEDIA : []', 'CMS editorial gallery with Davos-only fallback')
requireText(component, 'if (galleryItems.length === 0) return null', 'empty materials gallery is omitted without layout gap')
requireText(component, 'const DAVOS_EDITORIAL_CAPTIONS = [', 'editorial material descriptions')
requireText(component, 'const DAVOS_EDITORIAL_DETAILS = [', 'expanded editorial material details')
requireText(component, 'className={styles.editorialGalleryCaptionLead}', 'always-visible material teaser')
requireText(component, 'className={styles.editorialGalleryCaptionDetails}', 'expandable material details')
requireText(component, 'className={styles.editorialGalleryCaption}', 'animated material description cards')
requireText(component, "'davos_gallery_knit_detail_01'", 'replacement gallery image 1')
requireText(component, "'davos_gallery_coir_detail_02'", 'replacement gallery image 2')
requireText(component, "'davos_gallery_dark_textile_03'", 'replacement gallery image 3')
requireText(component, "'davos_gallery_quilt_detail_04'", 'replacement gallery image 4')
requireText(component, "'davos_gallery_foam_detail_05'", 'replacement gallery image 5')
requireText(component, 'editorialGalleryHitAreas', 'stable editorial gallery hover zones')
requireText(component, 'editorialGalleryHitAreaActive', 'hover zone synchronized with expanded image')
requireText(component, 'setTimeout(() => setActiveIndex(index), 100)', 'editorial gallery hover intent delay')
requireText(css, 'backdrop-filter: blur(16px);', 'gradient blur behind material descriptions')
requireText(css, '-webkit-mask-image: linear-gradient', 'masked gradient blur for material descriptions')
requireText(css, 'background: linear-gradient(to top, rgba(0, 0, 0, 0.6)', 'neutral black readability gradient for material descriptions')
requireText(css, '.editorialGalleryItem:not(.editorialGalleryItemActive) .editorialGalleryCaption', 'collapsed gallery captions hidden for inactive cards')
requireText(css, '.editorialGalleryCaptionDetails {\n    max-height: 180px;\n    margin-top: 10px;', 'mobile material descriptions stay visible without hover')
requireText(component, 'Боковая ткань служит наружной обивкой по периметру матраса.', 'client material details')
requireText(css, '.editorialGalleryItemActive .editorialGalleryCaptionDetails', 'expanded material description state')
requireText(css, '.editorialGalleryCaption {\n    transform: none;', 'material captions remain visible in mobile swipe gallery')
requireText(component, 'data-product-position-cta', 'container-width position CTA')
requireText(component, 'Связаться по позиции', 'position CTA label')
requireText(component, 'data-related-collection', 'related collection section')
requireText(component, 'relatedCollectionProducts.length > 0', 'related collection section only when products exist')
requireText(component, 'String(item.collectionSlug || \'\') === collectionSlug', 'related products match current collection')
requireText(component, "String(item.collectionName || '').trim().toLocaleLowerCase('ru-RU') === normalizedCollectionName", 'related products tolerate legacy collection slugs')
requireText(component, "if (String(item.slug || '') === requestedSlug) return false", 'current product excluded from related products')
requireText(component, 'Коллекция {collectionName}', 'dynamic collection return link')
requireText(component, 'relatedProduct.gallery?.[0]', 'related cards use CMS gallery media')
requireText(component, '>{productName}</h1>', 'dynamic product title')
requireText(component, 'до 160 кг', 'Davos load')
requireText(component, '>{score}/10</span>', 'dynamic product firmness')
requireText(vite, "'/product-page-prototype': 'product-page-prototype.html'", 'clean Vite route')

const desktopCoverSvg = path.join(root, 'public/product-page-prototype/davos-product-cover-desktop-full.svg')
const mobileCoverSvg = path.join(root, 'public/product-page-prototype/davos-product-cover-mobile.svg')
const coverLocationLineSvg = path.join(root, 'public/product-page-prototype/cover-location-line.svg')
if (!fs.existsSync(desktopCoverSvg) || fs.statSync(desktopCoverSvg).size === 0) {
  failures.push('Missing non-empty Figma desktop SVG cover')
} else {
  const desktopCoverSource = fs.readFileSync(desktopCoverSvg, 'utf8')
  requireText(desktopCoverSource, 'width="1680" height="720"', 'updated desktop cover dimensions')
  requireText(desktopCoverSource, 'viewBox="0 0 1680 720"', 'updated desktop cover view box')
  requireText(desktopCoverSource, 'pattern0_3034_11', 'updated desktop cover artwork')
  requireText(desktopCoverSource, 'class="cover-title-letter"', 'independently animated SVG title letters')
  requireText(desktopCoverSource, '@keyframes cover-title-letter-slide-up', 'SVG letter entrance animation')
  requireText(desktopCoverSource, 'transform: translateY(240px)', 'SVG title starts below its mask')
  requireText(desktopCoverSource, 'prefers-reduced-motion: reduce', 'SVG reduced-motion fallback')
}

if (!fs.existsSync(coverLocationLineSvg) || fs.statSync(coverLocationLineSvg).size === 0) {
  failures.push('Missing non-empty cover location line SVG')
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

const relatedProductBasenames = [
  'related-imperio-interior',
  'related-luxor-interior',
  'related-galaksi-interior',
]

for (const basename of relatedProductBasenames) {
  for (const extension of ['avif', 'webp', 'jpg']) {
    const file = path.join(root, 'public/product-page-prototype', `${basename}.${extension}`)
    if (!fs.existsSync(file)) failures.push(`Missing prototype-only related product media: ${path.relative(root, file)}`)
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Product page prototype contract ok: static Davos content, ${(basenames.length + relatedProductBasenames.length) * 3} local media files, no CMS/API coupling.`)
