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

const modalBundle = path.join(os.tmpdir(), `gg-catalog-modal-${process.pid}.mjs`)
const cardBundle = path.join(os.tmpdir(), `gg-catalog-card-list-meta-${process.pid}.mjs`)

esbuild.buildSync({
  entryPoints: [path.join(root, 'src/catalog/catalog-modal.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: modalBundle,
})

esbuild.buildSync({
  entryPoints: [path.join(root, 'src/catalog/catalog-card.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: cardBundle,
})

const { parseCatalogLayerItems, buildCatalogCardMetaHtmlFromDataset } = await import(
  pathToFileURL(modalBundle).href,
)
const { buildCatalogueCardHtml } = await import(pathToFileURL(cardBundle).href)

const layersSample =
  '1. высокоэластичная пена "flexi" (20мм) 2. термовойлок 3. 500 пружин на одно спальное место (h – 140мм) 4. войлок 5. высокоэластичная пена flexi (20мм) 6. еврокаркас'

const parsed = parseCatalogLayerItems(layersSample)
assert.equal(parsed.length, 6)
assert.equal(parsed[0], 'высокоэластичная пена "flexi" (20мм)')
assert.equal(parsed[2], '500 пружин на одно спальное место (h – 140мм)')
assert.equal(parsed[5], 'еврокаркас')

assert.deepEqual(parseCatalogLayerItems('один слой'), ['один слой'])
assert.deepEqual(parseCatalogLayerItems('1. только пена flexi'), ['только пена flexi'])
assert.deepEqual(parseCatalogLayerItems('a\nb\nc'), ['a', 'b', 'c'])
assert.deepEqual(parseCatalogLayerItems(''), [])

const metaHtml = buildCatalogCardMetaHtmlFromDataset({
  firmness: 'medium',
  type: 'spring',
  height: '19',
  loadRange: 'upTo120',
  layersCatalog: layersSample,
})
assert.match(metaHtml, /<ol class="catalogue-new-meta-layers">/)
assert.match(metaHtml, /catalogue-new-meta-line--layers/)
assert.match(metaHtml, /<li>термовойлок<\/li>/)
assert.match(metaHtml, /<li>еврокаркас<\/li>/)
assert.doesNotMatch(metaHtml, /catalogue-new-meta-value[^>]*>1\. высокоэластичная/)
assert.match(metaHtml, /<div class="catalogue-new-meta">/)

const singleMeta = buildCatalogCardMetaHtmlFromDataset({
  firmness: 'medium',
  type: 'spring',
  height: '19',
  layersCatalog: '1. только пена flexi',
})
assert.match(singleMeta, /catalogue-new-meta-value/)
assert.doesNotMatch(singleMeta, /catalogue-new-meta-layers/)
assert.match(singleMeta, /только пена flexi/)
assert.doesNotMatch(singleMeta, />1\.\s*только пена/)

const cardHtml = buildCatalogueCardHtml({
  name: 'Ориент',
  slug: 'orient',
  collectionSlug: 'classic',
  firmness: 'medium',
  mattressType: 'spring',
  heightCm: 19,
  maxLoadKg: 120,
  priceRub: 45000,
  tags: ['Пружинный', 'Средний'],
  imageUrl: '/uploads/orient.png',
  layersCatalog: layersSample,
})

const footerIdx = cardHtml.indexOf('catalogue-new-card-footer')
const priceIdx = cardHtml.indexOf('catalogue-new-card-price')
const tagsIdx = cardHtml.indexOf('catalogue-new-tags-row')
const metaIdx = cardHtml.indexOf('catalogue-new-meta')
assert.ok(footerIdx > -1, 'card footer wrapper required')
assert.ok(metaIdx > -1 && metaIdx < footerIdx, 'meta must stay above footer')
assert.ok(priceIdx > footerIdx, 'price must live inside footer')
assert.ok(tagsIdx > priceIdx, 'price must render before tags inside footer')
assert.match(cardHtml, /catalogue-new-meta-layers/)

const css = fs.readFileSync(path.join(root, 'src/styles/catalog-page.css'), 'utf8')
assert.match(css, /\.catalogue-new-card-footer\s*\{[^}]*margin-top:\s*auto/s)
assert.match(css, /\.catalogue-new-card-footer\s*\{[^}]*padding-top:\s*var\(--space-6\)/s)
assert.match(css, /\.catalogue-new-meta-layers\s*\{[^}]*list-style:\s*decimal/s)
assert.match(
  css,
  /\.catalogue-new-cards\.is-list-view[\s\S]*?\.catalogue-new-meta-line--layers[\s\S]*?display:\s*flex/,
)
assert.match(
  css,
  /\.catalogue-new-cards\.is-list-view\s+\.catalogue-new-card-body\s+h3[\s\S]*?font-size:\s*24px/,
)
assert.match(
  css,
  /\.catalogue-new-cards\.is-list-view\s+\.catalogue-new-card-price[\s\S]*?font-size:\s*28px/,
)
assert.match(css, /\.catalogue-new-card-body\s+h3\s*\{[^}]*font-size:\s*28px/s)
assert.match(css, /\.catalogue-new-card-price\s*\{[^}]*font-size:\s*32px/s)
assert.match(
  css,
  /\.catalogue-new-cards\.is-list-view\s+\.catalogue-new-card\s*>\s*\.catalogue-new-card-media[\s\S]*?aspect-ratio:\s*4\s*\/\s*5/,
)
console.log('check-catalog-card-list-meta: ok')
