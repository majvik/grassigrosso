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

const priceBundle = path.join(os.tmpdir(), `gg-catalog-price-filter-${process.pid}.mjs`)
const filteringBundle = path.join(os.tmpdir(), `gg-catalog-filtering-price-${process.pid}.mjs`)

esbuild.buildSync({
  entryPoints: [path.join(root, 'src/catalog/catalog-price.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: priceBundle,
})

esbuild.buildSync({
  entryPoints: [path.join(root, 'src/catalog/catalog-filtering.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: filteringBundle,
})

const {
  formatCatalogPriceInput,
  parseCatalogPriceInput,
  collectCatalogPriceBounds,
  clampCatalogPriceRange,
  isCatalogPriceFilterActive,
  matchCatalogPrice,
  formatCatalogPriceRub,
} = await import(pathToFileURL(priceBundle).href)

const { matchesCatalogCardMeta, resetCatalogFilterState } = await import(
  pathToFileURL(filteringBundle).href,
)

assert.equal(formatCatalogPriceInput(32000), '32 000')
assert.equal(parseCatalogPriceInput('32 000'), 32000)
assert.equal(parseCatalogPriceInput('45000'), 45000)
assert.equal(parseCatalogPriceInput(''), null)
assert.equal(formatCatalogPriceRub(32000), '32 000 ₽')

const bounds = collectCatalogPriceBounds([45000, 32000, 0, null, 50000, 36000])
assert.deepEqual(bounds, { min: 32000, max: 50000 })
assert.equal(collectCatalogPriceBounds([0, null, undefined]), null)

assert.deepEqual(clampCatalogPriceRange(10000, 60000, bounds), { priceMin: 32000, priceMax: 50000 })
assert.deepEqual(clampCatalogPriceRange(40000, 35000, bounds), { priceMin: 35000, priceMax: 40000 })

assert.equal(isCatalogPriceFilterActive(32000, 50000, bounds), false)
assert.equal(isCatalogPriceFilterActive(32000, 40000, bounds), true)
assert.equal(matchCatalogPrice(36000, 32000, 50000, bounds), true)
assert.equal(matchCatalogPrice(36000, 40000, 50000, bounds), false)
assert.equal(matchCatalogPrice(0, 40000, 50000, bounds), false)
assert.equal(matchCatalogPrice(0, 32000, 50000, bounds), true)

const state = {
  collection: new Set(),
  firmness: new Set(),
  type: new Set(),
  size: new Set(),
  loadRange: new Set(),
  heightRange: new Set(),
  fillings: new Set(),
  features: new Set(),
  priceMin: 40000,
  priceMax: 45000,
  sort: 'default',
  favouritesOnly: false,
}

const cheap = {
  card: null,
  initialOrder: 0,
  slug: 'a',
  collection: 'classic',
  firmness: 'medium',
  type: 'spring',
  height: 19,
  load: 120,
  price: 32000,
  recommended: false,
  loadRange: '',
  heightRange: '',
  sizes: new Set(['160x200']),
  fillings: new Set(),
  features: new Set(),
}
const mid = { ...cheap, slug: 'b', price: 42000 }
assert.equal(matchesCatalogCardMeta(cheap, state, new Set(), bounds), false)
assert.equal(matchesCatalogCardMeta(mid, state, new Set(), bounds), true)

resetCatalogFilterState(state, bounds)
assert.equal(state.priceMin, 32000)
assert.equal(state.priceMax, 50000)
assert.equal(matchesCatalogCardMeta(cheap, state, new Set(), bounds), true)

const filtersSource = fs.readFileSync(
  path.join(root, 'src/components/catalog-page/filters.tsx'),
  'utf8',
)
assert.match(filtersSource, /data-filter-group="price"/)
assert.match(filtersSource, /data-price-input="min"/)
assert.match(filtersSource, /data-price-input="max"/)
assert.match(filtersSource, /data-price-range="min"/)
assert.match(filtersSource, /data-price-range="max"/)
assert.match(filtersSource, /aria-expanded="false"/)
assert.ok(
  filtersSource.lastIndexOf('CATALOG_FILTER_GROUPS.map') < filtersSource.lastIndexOf('data-filter-group="price"'),
  'price filter must render after other filter groups',
)

const css = fs.readFileSync(path.join(root, 'src/styles/catalog-page.css'), 'utf8')
assert.match(css, /\.catalogue-new-price-filter\s*\{/)
assert.match(css, /\.catalogue-new-price-range-input/)
assert.match(css, /margin-top:\s*calc\(\(var\(--price-range-track-height\)/)

const listing = JSON.parse(
  fs.readFileSync(path.join(root, 'public/catalog-products-listing.snapshot.json'), 'utf8'),
)
const snapBounds = collectCatalogPriceBounds((listing.items || []).map((item) => item.priceRub))
assert.ok(snapBounds)
assert.ok(snapBounds.min >= 30000)
assert.ok(snapBounds.max <= 50000)
assert.ok(snapBounds.min < snapBounds.max)

console.log('check-catalog-price-filter: ok')
