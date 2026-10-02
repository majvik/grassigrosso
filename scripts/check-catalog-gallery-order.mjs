import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildProductGallery, MAX_GALLERY_ITEMS } = require('../strapi-catalog/src/api/catalog/utils/build-product-gallery.js')

function image(url) {
  return { url, mime: 'image/png', name: url }
}

function slide(url) {
  return { slide_image: image(url) }
}

function srcs(row) {
  return buildProductGallery(row).gallery.map((item) => item.fallbackSrc || item.src)
}

const withMedia = srcs({
  name: 'Давос',
  media: image('/uploads/catalog-order-cover.png'),
  gallery: [slide('/uploads/catalog-order-a.png'), slide('/uploads/catalog-order-b.png')],
})
assert.deepEqual(withMedia, [
  '/uploads/catalog-order-cover.png',
  '/uploads/catalog-order-a.png',
  '/uploads/catalog-order-b.png',
])
assert.equal(
  buildProductGallery({
    media: image('/uploads/catalog-order-cover.png'),
    gallery: [slide('/uploads/catalog-order-a.png')],
  }).imageUrl,
  '/uploads/catalog-order-cover.png',
)

const emptyMedia = srcs({
  media: null,
  gallery: [slide('/uploads/catalog-order-a.png'), slide('/uploads/catalog-order-b.png')],
})
assert.deepEqual(emptyMedia, [
  '/uploads/catalog-order-a.png',
  '/uploads/catalog-order-b.png',
])

const duplicate = srcs({
  media: image('/uploads/catalog-order-cover.png'),
  gallery: [slide('/uploads/catalog-order-cover.png'), slide('/uploads/catalog-order-b.png')],
})
assert.deepEqual(duplicate, [
  '/uploads/catalog-order-cover.png',
  '/uploads/catalog-order-b.png',
])

const legacyOnly = srcs({
  image_url: '/uploads/catalog-order-legacy.png',
  gallery: [],
})
assert.deepEqual(legacyOnly, ['/uploads/catalog-order-legacy.png'])

const capped = srcs({
  media: image('/uploads/catalog-order-cover.png'),
  gallery: Array.from({ length: 8 }, (_, index) => slide(`/uploads/catalog-order-slide-${index}.png`)),
})
assert.equal(capped.length, MAX_GALLERY_ITEMS)
assert.equal(capped[0], '/uploads/catalog-order-cover.png')
assert.equal(capped[1], '/uploads/catalog-order-slide-0.png')

console.log('check:catalog-gallery-order ok')
