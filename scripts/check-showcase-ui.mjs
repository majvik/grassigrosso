import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cleanupChromeSession,
  delay,
  startCatalogChromeSession,
} from './lib/catalog-chrome-session.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const webPort = 5184
const apiPort = 3320
const products = JSON.parse(await readFile(path.join(root, 'public/catalog-products-listing.snapshot.json'), 'utf8'))
const filters = JSON.parse(await readFile(path.join(root, 'public/catalog-filters.snapshot.json'), 'utf8'))
const hero = JSON.parse(await readFile(path.join(root, 'public/catalog-hero.snapshot.json'), 'utf8'))

const api = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.url?.startsWith('/api/catalog/products')) return res.end(JSON.stringify(products))
  if (req.url === '/api/catalog/filters') return res.end(JSON.stringify(filters))
  if (req.url === '/api/catalog/hero-slides') return res.end(JSON.stringify(hero))
  res.statusCode = 404
  return res.end(JSON.stringify({ error: 'not found' }))
})
await new Promise((resolve, reject) => {
  api.once('error', reject)
  api.listen(apiPort, '127.0.0.1', resolve)
})

const vite = spawn('npm', ['run', 'dev:web', '--', '--port', String(webPort)], {
  cwd: root,
  env: { ...process.env, SITE_MODE: 'showcase', DEV_API_PORT: String(apiPort) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let viteOutput = ''
vite.stdout.on('data', (chunk) => { viteOutput += chunk })
vite.stderr.on('data', (chunk) => { viteOutput += chunk })

let browser
try {
  const baseUrl = `http://127.0.0.1:${webPort}`
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/catalog`)
      if (response.ok) break
    } catch (_) {
      // Vite is still starting.
    }
    if (attempt === 99) throw new Error(`Vite did not start.\n${viteOutput}`)
    await delay(100)
  }

  browser = await startCatalogChromeSession(baseUrl)
  let state
  for (let attempt = 0; attempt < 100; attempt += 1) {
    state = await browser.cdp.evaluate(`(() => ({
      cards: document.querySelectorAll('.catalogue-new-card').length,
      downloadHref: document.querySelector('.catalog-hero-download-link')?.getAttribute('href') || '',
      downloadText: document.querySelector('.catalog-hero-download-link')?.textContent?.trim() || '',
      downloadArrow: document.querySelector('.catalog-hero-download-link .catalog-arrow')?.getAttribute('src') || '',
      downloadTextColor: document.querySelector('.catalog-hero-download-link span')
        ? getComputedStyle(document.querySelector('.catalog-hero-download-link span')).color
        : '',
      smartSelector: Boolean(document.querySelector('[data-smart-selector], .smart-selector-trigger, .smart-selector-modal')),
      priceFilter: Boolean(document.querySelector('[data-filter-group="price"]')),
      priceSorts: document.querySelectorAll('.catalogue-new-sort-option[data-value^="price-"]').length,
      visiblePrices: document.querySelectorAll('.catalogue-new-card-price').length,
      priceDatasets: [...document.querySelectorAll('.catalogue-new-card')].filter((card) => card.hasAttribute('data-price')).length,
    }))()`)
    if (state.cards > 0 && state.downloadHref) break
    await delay(100)
  }

  assert.ok(state.cards > 0, 'catalogue cards did not load')
  assert.equal(state.downloadHref, '/download-catalog')
  assert.equal(state.downloadText.toUpperCase(), 'СКАЧАТЬ КАТАЛОГ')
  assert.equal(state.downloadArrow, '/arrow-hero-catalog.svg')
  assert.notEqual(state.downloadTextColor, 'rgb(0, 0, 238)', 'download CTA must use project styles, not browser link blue')
  assert.equal(state.smartSelector, false)
  assert.equal(state.priceFilter, false)
  assert.equal(state.priceSorts, 0)
  assert.equal(state.visiblePrices, 0)
  assert.equal(state.priceDatasets, 0)

  await browser.cdp.evaluate(`document.querySelector('.catalogue-new-card .catalogue-new-favourite')?.click()`)
  await delay(100)
  assert.equal(await browser.cdp.evaluate('location.search'), '', 'favourite control must not open the product page')
  await browser.cdp.evaluate(`document.querySelector('.catalogue-new-card')?.click()`)
  for (let attempt = 0; attempt < 100; attempt += 1) {
    state = await browser.cdp.evaluate(`(() => ({
      search: location.search,
      productPage: Boolean(document.querySelector('.catalogue-new-shared-product:not([hidden])')),
      contact: Boolean(document.querySelector('[data-shared-product-contact]')),
      contactHref: document.querySelector('[data-shared-product-contact]')?.getAttribute('href') || '',
      favourite: Boolean(document.querySelector('[data-shared-product-favourite]')),
      share: Boolean(document.querySelector('[data-shared-product-share]')),
      shareHelp: Boolean(document.querySelector('[data-filter-help-open="productShare"]')),
      gallery: Boolean(document.querySelector('.catalogue-new-shared-product-media[data-catalog-card-media]')),
      specs: Boolean(document.querySelector('.catalogue-new-shared-product [data-catalog-spec-segments]')),
      quickViewModal: Boolean(document.querySelector('#catalogueImageModal')),
    }))()`)
    if (state.productPage) break
    await delay(100)
  }
  assert.match(state.search, /^\?product=[a-z0-9-]+$/)
  assert.equal(state.productPage, true)
  assert.equal(state.contact, true)
  assert.match(state.contactHref, /^\/contacts\?product=[a-z0-9-]+#contact-form$/)
  assert.equal(state.favourite, true)
  assert.equal(state.share, true)
  assert.equal(state.shareHelp, true)
  assert.equal(state.gallery, true)
  assert.equal(state.specs, true)
  assert.equal(state.quickViewModal, false)

  const favouriteBefore = await browser.cdp.evaluate(`document.querySelector('[data-shared-product-favourite]')?.getAttribute('aria-pressed')`)
  await browser.cdp.evaluate(`document.querySelector('[data-shared-product-favourite]')?.click()`)
  assert.notEqual(
    await browser.cdp.evaluate(`document.querySelector('[data-shared-product-favourite]')?.getAttribute('aria-pressed')`),
    favouriteBefore,
  )
  await browser.cdp.evaluate(`document.querySelector('[data-shared-product-share]')?.click()`)
  assert.equal(
    await browser.cdp.evaluate(`document.querySelector('[data-shared-product-share] .catalogue-new-favourites-share-link-label')?.textContent?.trim()`),
    'Скопировано',
  )
  console.log('✅ Showcase UI: download CTA present; smart selector and all price surfaces absent')
} finally {
  if (browser) cleanupChromeSession(browser)
  vite.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => vite.once('exit', resolve)),
    delay(2000),
  ])
  await new Promise((resolve) => api.close(resolve))
}
