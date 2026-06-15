#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')

const baseUrl = String(process.env.CATALOG_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')

async function fetchJson(pathname) {
  const url = `${baseUrl}${pathname}`
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`${pathname}: expected 2xx, got ${response.status}`)
  }
  return response.json()
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

async function writeSnapshot(filename, payload) {
  const text = `${JSON.stringify(payload, null, 2)}\n`
  await fs.writeFile(path.join(publicDir, filename), text, 'utf8')
  return sha256(text)
}

async function main() {
  const [productsFull, productsListing, filters, hero, downloadSlides] = await Promise.all([
    fetchJson('/api/catalog/products'),
    fetchJson('/api/catalog/products?view=listing'),
    fetchJson('/api/catalog/filters'),
    fetchJson('/api/catalog/hero-slides'),
    fetchJson('/api/download-catalog/slides').catch((error) => {
      console.warn(`download-catalog slides snapshot skipped: ${error.message}`)
      return null
    }),
  ])

  const productCount = Array.isArray(productsFull.items) ? productsFull.items.length : 0
  if (productCount === 0) {
    throw new Error('Refusing to export empty catalog-products snapshot')
  }

  await fs.mkdir(publicDir, { recursive: true })

  const productsHash = await writeSnapshot('catalog-products.snapshot.json', productsFull)
  await writeSnapshot('catalog-products-listing.snapshot.json', productsListing)
  await writeSnapshot('catalog-filters.snapshot.json', filters)
  await writeSnapshot('catalog-hero.snapshot.json', hero)
  if (downloadSlides && Array.isArray(downloadSlides.slides) && downloadSlides.slides.length) {
    await writeSnapshot('download-catalog-slides.snapshot.json', downloadSlides)
  }

  const manifest = {
    syncedAt: new Date().toISOString(),
    productCount,
    productsSha256: productsHash,
    source: productsFull.source || 'strapi-catalog-feed',
  }
  await fs.writeFile(
    path.join(publicDir, 'catalog-snapshot.manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  )

  console.log(`catalog snapshot exported: ${productCount} products (${manifest.source})`)
}

main().catch((error) => {
  console.error(`catalog:export-snapshot failed: ${error.message}`)
  process.exit(1)
})
