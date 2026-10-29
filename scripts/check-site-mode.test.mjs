import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { normalizeSiteMode, getSiteCapabilities, sanitizeCatalogPayload } = require(
  path.join(root, 'lib/site-mode.cjs'),
)

test('site mode fails closed unless commerce is explicitly requested', () => {
  assert.equal(normalizeSiteMode(undefined), 'showcase')
  assert.equal(normalizeSiteMode(''), 'showcase')
  assert.equal(normalizeSiteMode('unexpected'), 'showcase')
  assert.equal(normalizeSiteMode(' SHOWCASE '), 'showcase')
  assert.equal(normalizeSiteMode(' COMMERCE '), 'commerce')
})

test('showcase disables all commercial capabilities as one atomic mode', () => {
  assert.deepEqual(getSiteCapabilities('showcase'), {
    prices: false,
    smartSelector: false,
    commerce: false,
  })
  assert.deepEqual(getSiteCapabilities('commerce'), {
    prices: true,
    smartSelector: true,
    commerce: true,
  })
  assert.deepEqual(getSiteCapabilities('unknown'), {
    prices: false,
    smartSelector: false,
    commerce: false,
  })
})

test('showcase catalogue sanitization removes nested price and commerce identity fields', () => {
  const source = {
    items: [
      {
        id: 1,
        name: 'Матрас',
        priceRub: 31900,
        price_rub: 31900,
        commerceKey: 'mattress-1',
        commerce_key: 'mattress-1',
        variants: [{ sku: 'SKU-1', priceRub: 31900 }],
      },
    ],
    sections: { recommended: [{ commerceKey: 'mattress-1', priceRub: 31900 }] },
  }

  const result = sanitizeCatalogPayload(source, 'showcase')
  assert.equal(result.items[0].name, 'Матрас')
  assert.equal('priceRub' in result.items[0], false)
  assert.equal('price_rub' in result.items[0], false)
  assert.equal('commerceKey' in result.items[0], false)
  assert.equal('commerce_key' in result.items[0], false)
  assert.equal('variants' in result.items[0], false)
  assert.equal('priceRub' in result.sections.recommended[0], false)

  assert.deepEqual(sanitizeCatalogPayload(source, 'commerce'), source)
  assert.notEqual(result, source)
})
