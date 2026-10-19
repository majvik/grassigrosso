#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const esbuild = require('esbuild')

const bundle = path.join(os.tmpdir(), `gg-catalog-listing-sections-${process.pid}.mjs`)
esbuild.buildSync({
  entryPoints: [path.join(root, 'src/catalog/catalog-listing-sections.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundle,
})

const { buildCatalogListingSectionsHtml, normalizeCatalogListingSections } = await import(
  pathToFileURL(bundle).href
)

const sections = normalizeCatalogListingSections({
  recommendedTitle: '  Мы рекомендуем ',
  allProductsTitle: '',
})
assert.equal(sections.recommendedTitle, 'Мы рекомендуем')
assert.equal(sections.allProductsTitle, 'Все товары')

const html = buildCatalogListingSectionsHtml(
  [{ name: 'Ориент', slug: 'orient', isRecommended: true, priceRub: 30000, firmness: 'medium', mattressType: 'spring' }],
  [{ name: 'Classic', slug: 'classic', isRecommended: false, priceRub: 40000, firmness: 'medium', mattressType: 'spring' }],
  sections,
)
assert.match(html, /data-listing-section="recommended"/)
assert.match(html, /data-listing-section="all"/)
assert.match(html, /catalogue-new-section-title">Мы рекомендуем</)
assert.match(html, /catalogue-new-section-title">Все товары</)
assert.match(html, /Ориент/)
assert.match(html, /Classic/)
assert.ok(html.indexOf('recommended') < html.indexOf('data-listing-section="all"'))

const productSchema = JSON.parse(
  fs.readFileSync(
    path.join(root, 'strapi-catalog/src/api/product/content-types/product/schema.json'),
    'utf8',
  ),
)
assert.equal(productSchema.attributes.is_recommended?.type, 'boolean')

const listingSchema = JSON.parse(
  fs.readFileSync(
    path.join(root, 'strapi-catalog/src/api/catalog-listing/content-types/catalog-listing/schema.json'),
    'utf8',
  ),
)
assert.equal(listingSchema.kind, 'singleType')
assert.ok(listingSchema.attributes.recommended_section_title)
assert.ok(listingSchema.attributes.all_products_section_title)

const feed = fs.readFileSync(
  path.join(root, 'strapi-catalog/src/api/catalog/controllers/catalog-feed.js'),
  'utf8',
)
assert.match(feed, /isRecommended/)
assert.match(feed, /recommendedTitle/)

console.log('check-catalog-recommended-section: ok')
