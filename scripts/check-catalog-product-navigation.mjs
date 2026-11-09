#!/usr/bin/env node
import fs from 'node:fs'

const share = fs.readFileSync('src/catalog/catalog-share.ts', 'utf8')
const controller = fs.readFileSync('src/catalog/catalog-listing-controller.ts', 'utf8')
const prototype = fs.readFileSync('src/components/pages/ProductPagePrototype.tsx', 'utf8')
const catalogPage = fs.readFileSync('src/components/pages/CatalogPage.tsx', 'utf8')
const failures = []

if (!share.includes("const url = catalogUrl()") || share.includes("url.pathname = '/product-page-prototype'")) {
  failures.push('product URL must stay on /catalog')
}
if (!share.includes("url.searchParams.set('product', normalized)")) {
  failures.push('product URL must preserve the selected product slug')
}
if (!controller.includes("target.closest('.catalogue-new-favourite, .catalogue-new-shared-remove')")) {
  failures.push('favourite control must be excluded from card navigation')
}
if (!controller.includes("target.closest('[data-catalog-gallery-dot]')")) {
  failures.push('gallery controls must be excluded from card navigation')
}
if (!controller.includes("target.closest<HTMLElement>('.catalogue-new-card')")) {
  failures.push('navigation must resolve from the whole product card')
}
if (!prototype.includes("new URLSearchParams(window.location.search).get('product')")) {
  failures.push('product page must read the selected product slug')
}
if (!prototype.includes('getCatalogProductsFullFeed')) {
  failures.push('product page must resolve the selected product from the full catalog feed')
}
if (!catalogPage.includes("new URLSearchParams(window.location.search).has('product')") || !catalogPage.includes('<ProductPagePrototype />')) {
  failures.push('/catalog?product=<slug> must render the new product page')
}
if (!prototype.includes('sliderItems.length > 1')) {
  failures.push('single-image products must not render slider controls')
}
if (!prototype.includes('media={product?.gallery || []}')) {
  failures.push('product page slider must use the same gallery as the catalog card')
}
if (!prototype.includes("String(item.collectionSlug || '') === collectionSlug") || !prototype.includes("String(item.collectionName || '').trim().toLocaleLowerCase('ru-RU') === normalizedCollectionName")) {
  failures.push('related products must match the current collection slug or CMS name')
}
if (prototype.includes('href="/catalog?collection=relax"') || prototype.includes('RELATED_COLLECTION_PRODUCTS')) {
  failures.push('related collection must not be hardcoded to Relax')
}
if (!prototype.includes('split(/<br')) {
  failures.push('CMS text fields must support explicit <br> line breaks')
}
if (!prototype.includes('PRODUCT_MEDIA_PLACEHOLDER_SRC') || !prototype.includes("image.dataset.placeholderApplied = 'true'")) {
  failures.push('broken product media must fall back to a local placeholder')
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('check:catalog-product-navigation ok')
