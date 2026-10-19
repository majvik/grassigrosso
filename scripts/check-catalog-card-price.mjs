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

const priceBundle = path.join(os.tmpdir(), `gg-catalog-price-${process.pid}.mjs`)
const cardBundle = path.join(os.tmpdir(), `gg-catalog-card-${process.pid}.mjs`)
const filteringBundle = path.join(os.tmpdir(), `gg-catalog-filtering-${process.pid}.mjs`)

esbuild.buildSync({
  entryPoints: [path.join(root, 'src/catalog/catalog-price.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: priceBundle,
})

esbuild.buildSync({
  entryPoints: [path.join(root, 'src/catalog/catalog-card.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: cardBundle,
})

esbuild.buildSync({
  entryPoints: [path.join(root, 'src/catalog/catalog-filtering.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: filteringBundle,
})

const { formatCatalogPriceRub } = await import(pathToFileURL(priceBundle).href)
const { buildCatalogueCardHtml } = await import(pathToFileURL(cardBundle).href)
const { compareCatalogCardMeta } = await import(pathToFileURL(filteringBundle).href)

assert.equal(formatCatalogPriceRub(100000), '100 000 ₽')
assert.equal(formatCatalogPriceRub('2500000'), '2 500 000 ₽')
assert.equal(formatCatalogPriceRub(0), '')
assert.equal(formatCatalogPriceRub(null), '')
assert.equal(formatCatalogPriceRub(undefined), '')
assert.equal(formatCatalogPriceRub(-10), '')

const withPrice = buildCatalogueCardHtml({
  name: 'Ориент',
  slug: 'orient',
  collectionSlug: 'classic',
  firmness: 'medium',
  mattressType: 'spring',
  heightCm: 19,
  maxLoadKg: 120,
  priceRub: 100000,
  tags: ['Пружинный', 'Средний'],
  imageUrl: '/uploads/orient.png',
})
assert.match(withPrice, /catalogue-new-card-price/)
assert.match(withPrice, /100 000 ₽/)
assert.match(withPrice, /data-price="100000"/)
assert.ok(
  withPrice.indexOf('catalogue-new-card-footer') > -1,
  'price+tags must share card footer',
)
assert.ok(
  withPrice.indexOf('catalogue-new-card-footer') < withPrice.indexOf('catalogue-new-card-price'),
  'price must render inside card footer',
)
assert.ok(
  withPrice.indexOf('catalogue-new-card-price') < withPrice.indexOf('catalogue-new-tags-row'),
  'price must render before tags row',
)

const cheap = { price: 30000, initialOrder: 1 }
const mid = { price: 40000, initialOrder: 0 }
const expensive = { price: 50000, initialOrder: 2 }
const missing = { price: 0, initialOrder: 3 }
assert.ok(compareCatalogCardMeta(cheap, expensive, 'price-asc') < 0)
assert.ok(compareCatalogCardMeta(expensive, cheap, 'price-desc') < 0)
assert.ok(compareCatalogCardMeta(missing, cheap, 'price-asc') > 0)
assert.ok(compareCatalogCardMeta(missing, cheap, 'price-desc') > 0)
assert.ok(compareCatalogCardMeta(mid, cheap, 'price-asc') > 0)

const sortOptionsSource = fs.readFileSync(
  path.join(root, 'src/components/pages/catalog-page-data.ts'),
  'utf8',
)
assert.match(sortOptionsSource, /value: 'price-asc'/)
assert.match(sortOptionsSource, /value: 'price-desc'/)
assert.match(sortOptionsSource, /Цена: по возрастанию/)
assert.match(sortOptionsSource, /Цена: по убыванию/)

const withoutPrice = buildCatalogueCardHtml({
  name: 'Ориент',
  slug: 'orient',
  collectionSlug: 'classic',
  firmness: 'medium',
  mattressType: 'spring',
  heightCm: 19,
  maxLoadKg: 120,
  tags: ['Пружинный'],
})
assert.doesNotMatch(withoutPrice, /catalogue-new-card-price/)

const css = fs.readFileSync(path.join(root, 'src/styles/catalog-page.css'), 'utf8')
assert.match(css, /\.catalogue-new-card-price\s*\{[^}]*font-size:\s*32px/s)
assert.match(css, /\.catalogue-new-sidebar-title\s*\{[^}]*font-size:\s*32px/s)

const schema = JSON.parse(
  fs.readFileSync(
    path.join(root, 'strapi-catalog/src/api/product/content-types/product/schema.json'),
    'utf8',
  ),
)
assert.equal(schema.attributes.price_rub?.type, 'integer')

const feed = fs.readFileSync(
  path.join(root, 'strapi-catalog/src/api/catalog/controllers/catalog-feed.js'),
  'utf8',
)
assert.match(feed, /priceRub/)

console.log('check-catalog-card-price: ok')
