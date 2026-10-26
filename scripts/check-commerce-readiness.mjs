import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const express = require('express')
const { createCommerceCatalogRouter } = require('../server/commerce/routes/catalog-routes.cjs')
const { composeCatalog } = require('../server/commerce/catalog-projection.cjs')
const { getCommerceReadiness } = require('../server/commerce/commerce-readiness.cjs')

const content = [{ commerceKey: 'ERGO', strapiDocumentId: 'doc-ergo', name: 'Ergo', slug: 'ergo' }]
const trading = [{
  integrationKey: 'ERGO',
  medusaProductId: 'prod_ergo',
  variants: [{ id: 'variant_ergo_90', sku: 'GG-ERGO-90X200', size: '90x200', priceKopecks: 990000, inventoryQuantity: 2, available: true }],
}]

const okClients = {
  strapiClient: { probe: async () => true, getCatalog: async () => content },
  medusaClient: { probe: async () => true, getCatalog: async () => trading },
}

const ready = await getCommerceReadiness('catalog', { ...okClients, requestId: 'req-ok' })
assert.deepEqual(ready, { ready: true, status: 200, failedDependencies: [], requestId: 'req-ok' })

for (const scope of ['catalog', 'product', 'favourites', 'smartSelector']) {
  const result = await getCommerceReadiness(scope, {
    ...okClients,
    strapiClient: { ...okClients.strapiClient, probe: async () => { throw new Error('secret upstream body') } },
    requestId: `req-${scope}`,
  })
  assert.equal(result.status, 503)
  assert.deepEqual(result.failedDependencies, ['strapi'])
  assert.doesNotMatch(JSON.stringify(result), /secret upstream body/)
}

for (const scope of ['catalog', 'product', 'favourites', 'smartSelector', 'cart', 'checkout', 'auth', 'profile', 'orders']) {
  const result = await getCommerceReadiness(scope, {
    ...okClients,
    medusaClient: { ...okClients.medusaClient, probe: async () => false },
    requestId: `medusa-${scope}`,
  })
  assert.equal(result.status, 503)
  assert.ok(result.failedDependencies.includes('medusa'))
}

assert.equal(composeCatalog(content, trading)[0].integrationKey, 'ERGO')
assert.throws(() => composeCatalog([...content, content[0]], trading), /duplicate/i)
assert.throws(() => composeCatalog(content, []), /orphan|missing|incomplete/i)
assert.throws(() => composeCatalog(content, [{ ...trading[0], variants: [] }]), /incomplete/i)

const request = async (clients, path) => {
  const app = express()
  app.get('/privacy', (_req, res) => res.status(200).send('privacy'))
  app.use('/api/commerce', createCommerceCatalogRouter(clients))
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  try {
    const address = server.address()
    return await fetch(`http://127.0.0.1:${address.port}${path}`)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

const catalogResponse = await request(okClients, '/api/commerce/catalog')
assert.equal(catalogResponse.status, 200)
assert.equal((await catalogResponse.json()).items[0].variants[0].sku, 'GG-ERGO-90X200')

const productResponse = await request(okClients, '/api/commerce/products/ERGO')
assert.equal(productResponse.status, 200)

const downClients = { ...okClients, medusaClient: { ...okClients.medusaClient, probe: async () => false } }
const unavailable = await request(downClients, '/api/commerce/catalog')
assert.equal(unavailable.status, 503)
assert.equal(unavailable.headers.get('retry-after'), '30')
assert.equal(unavailable.headers.get('x-robots-tag'), 'noindex, nofollow')
assert.ok(unavailable.headers.get('x-request-id'))
const unavailableBody = await unavailable.json()
assert.equal(unavailableBody.ready, false)
assert.equal('items' in unavailableBody, false, 'fail-closed response must not expose snapshot data')

const malformedClients = { ...okClients, strapiClient: { ...okClients.strapiClient, getCatalog: async () => [{ slug: 'missing-key' }] } }
assert.equal((await request(malformedClients, '/api/commerce/catalog')).status, 503)
assert.equal((await request(malformedClients, '/api/commerce/readiness?scope=catalog')).status, 503)
assert.equal((await request(downClients, '/privacy')).status, 200)

console.log('Commerce readiness: PASS')
