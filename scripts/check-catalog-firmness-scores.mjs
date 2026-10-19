#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const schema = JSON.parse(read('strapi-catalog/src/api/product/content-types/product/schema.json'))
const importer = read('strapi-catalog/scripts/import-catalog-import.cjs')
const feed = read('strapi-catalog/src/api/catalog/controllers/catalog-feed.js')
const relaxPlus = read('docs/catalog-import/products/relax-plus.md')

for (const field of ['firmness_side1', 'firmness_side2']) {
  assert.deepEqual(
    schema.attributes[field],
    {
      displayName: field === 'firmness_side1' ? 'Жесткость стороны 1 (1–10)' : 'Жесткость стороны 2 (1–10)',
      type: 'integer',
      min: 1,
      max: 10,
    },
  )
  assert.match(importer, new RegExp(`${field}: Number\\.isInteger\\(product\\.${field}\\)`))
  const apiField = field === 'firmness_side1' ? 'firmnessSide1' : 'firmnessSide2'
  assert.match(feed, new RegExp(`${apiField}: Number\\.isInteger\\(row\\.${field}\\)`))
}

assert.match(relaxPlus, /firmness_side1: 5/)
assert.match(relaxPlus, /firmness_side2: 7/)
assert.match(relaxPlus, /firmness: dualFirmness/)

console.log('Catalog firmness scores contract ok (source → Strapi → feed)')
