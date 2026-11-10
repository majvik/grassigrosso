#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
const failures = []

const productSchema = readJson('strapi-catalog/src/api/product/content-types/product/schema.json')
const attributes = productSchema.attributes || {}
const server = fs.readFileSync(path.join(root, 'server.cjs'), 'utf8')
const nginx = fs.readFileSync(path.join(root, 'nginx.conf'), 'utf8')

const expectAttribute = (name, expected) => {
  const actual = attributes[name]
  if (!actual) {
    failures.push(`missing Product attribute: ${name}`)
    return
  }
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) failures.push(`${name}.${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual[key])}`)
  }
}

if ('bento_gallery' in attributes) failures.push('legacy bento_gallery must be removed')

expectAttribute('gallery', { type: 'component', repeatable: true, component: 'catalog.product-gallery-item' })
if ('detail_gallery' in attributes) failures.push('duplicate detail_gallery must be removed')
if (attributes.sort_order?.displayName !== 'Позиция в каталоге') failures.push('sort_order admin label must be "Позиция в каталоге"')
expectAttribute('page_cover_desktop', { type: 'media', multiple: false })
expectAttribute('page_cover_mobile', { type: 'media', multiple: false })
expectAttribute('page_description', { type: 'text' })
expectAttribute('page_characteristics_media', { type: 'media', multiple: true })
expectAttribute('page_cover_location', { type: 'component', repeatable: false, component: 'catalog.product-cover-location' })
expectAttribute('page_materials', { type: 'component', repeatable: true, component: 'catalog.product-material-slide' })

for (const coverField of ['page_cover_desktop', 'page_cover_mobile']) {
  const allowed = attributes[coverField]?.allowedTypes || []
  if (!allowed.includes('images') || !allowed.includes('files')) {
    failures.push(`${coverField} must accept SVG uploads as image/file media`)
  }
}
if (!server.includes('svg|mp4|webm') || !nginx.includes('image/svg+xml')) {
  failures.push('runtime must serve SVG media with an SVG-compatible static media contract')
}

const location = readJson('strapi-catalog/src/components/catalog/product-cover-location.json').attributes || {}
for (const name of ['place', 'coordinates', 'date_time', 'sun_position']) {
  if (location[name]?.type !== 'string') failures.push(`product-cover-location.${name} must be a string`)
}

const material = readJson('strapi-catalog/src/components/catalog/product-material-slide.json').attributes || {}
if (material.image?.type !== 'media' || material.image?.multiple !== false) failures.push('product-material-slide.image must be one media item')
for (const name of ['title', 'lead']) {
  if (material[name]?.type !== 'string') failures.push(`product-material-slide.${name} must be a string`)
}
if (material.description?.type !== 'text') failures.push('product-material-slide.description must be text')

const adminSync = fs.readFileSync(path.join(root, 'strapi-catalog/src/api/catalog/utils/sync-pages-cms-admin-labels.js'), 'utf8')
if (!adminSync.includes("const PRODUCT_HIDDEN_FIELDS = new Set(['image_url'])")) failures.push('legacy image_url must be hidden from Product admin')
const orderedPageFields = [
  'page_cover_desktop',
  'page_cover_mobile',
  'page_cover_location',
  'gallery',
  'name',
  'collection',
  'tags',
  'page_description',
  'mattress_type_option',
  'max_load_kg',
  'firmness_side1',
  'firmness_side2',
  'sizes',
  'layers_catalog',
  'cover_description',
  'page_characteristics_media',
  'page_materials',
]
let previousIndex = -1
for (const field of orderedPageFields) {
  const index = adminSync.indexOf(`'${field}'`)
  if (index < 0) failures.push(`admin layout is missing ordered field ${field}`)
  if (index >= 0 && index <= previousIndex) failures.push(`admin layout field ${field} is out of page order`)
  previousIndex = Math.max(previousIndex, index)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('check:product-page-cms-schema ok')
