import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  InMemoryCatalogRepository,
  syncCatalog,
  type CatalogImport,
} from '../src/workflows/catalog-sync'

const product = (overrides: Partial<CatalogImport['products'][number]> = {}): CatalogImport['products'][number] => ({
  integrationKey: 'ERGO',
  strapiDocumentId: 'strapi-ergo',
  title: 'Ergo',
  variants: [
    {
      integrationKey: 'ERGO:90X200',
      sku: 'GG-ERGO-90X200',
      size: '90x200',
      priceKopecks: 990000,
      inventoryQuantity: 10,
      manageInventory: true,
      allowBackorder: false,
      available: true,
    },
    {
      integrationKey: 'ERGO:160X200',
      sku: 'GG-ERGO-160X200',
      size: '160x200',
      priceKopecks: 1450000,
      inventoryQuantity: 1000,
      manageInventory: true,
      allowBackorder: false,
      available: true,
    },
  ],
  ...overrides,
})

const input = (...products: CatalogImport['products']): CatalogImport => ({
  schemaVersion: 'catalog-v1',
  products,
})

describe('catalog sync', () => {
  it('creates once and reports a byte-stable no-op rerun', async () => {
    const repository = new InMemoryCatalogRepository()
    const first = await syncCatalog(input(product()), repository)
    assert.deepEqual(first, {
      products: { created: 1, updated: 0, unchanged: 0, rejected: 0 },
      variants: { created: 2, updated: 0, unchanged: 0, unpublished: 0, rejected: 0 },
    })
    const snapshot = JSON.stringify(await repository.snapshot())
    const second = await syncCatalog(input(product()), repository)
    assert.deepEqual(second, {
      products: { created: 0, updated: 0, unchanged: 1, rejected: 0 },
      variants: { created: 0, updated: 0, unchanged: 2, unpublished: 0, rejected: 0 },
    })
    assert.equal(JSON.stringify(await repository.snapshot()), snapshot)
  })

  it('updates price and inventory without replacing immutable identities', async () => {
    const repository = new InMemoryCatalogRepository()
    await syncCatalog(input(product()), repository)
    const before = await repository.snapshot()
    const changed = product({
      variants: product().variants.map((variant) =>
        variant.size === '90x200'
          ? { ...variant, priceKopecks: 1010000, inventoryQuantity: 3 }
          : variant,
      ),
    })
    const report = await syncCatalog(input(changed), repository)
    const after = await repository.snapshot()
    assert.equal(report.variants.updated, 1)
    assert.equal(after[0].id, before[0].id)
    assert.equal(after[0].variants[0].id, before[0].variants[0].id)
  })

  it('adds sizes and unpublishes removed sizes instead of deleting them', async () => {
    const repository = new InMemoryCatalogRepository()
    await syncCatalog(input(product()), repository)
    const added = {
      ...product(),
      variants: [
        ...product().variants,
        {
          integrationKey: 'ERGO:180X200',
          sku: 'GG-ERGO-180X200',
          size: '180x200',
          priceKopecks: 1650000,
          inventoryQuantity: 2,
          manageInventory: true as const,
          allowBackorder: false as const,
          available: true,
        },
      ],
    }
    assert.equal((await syncCatalog(input(added), repository)).variants.created, 1)
    const removed = { ...added, variants: added.variants.filter((variant) => variant.size !== '160x200') }
    assert.equal((await syncCatalog(input(removed), repository)).variants.unpublished, 1)
    const stored = await repository.snapshot()
    assert.equal(stored[0].variants.length, 3)
    assert.equal(stored[0].variants.find((variant) => variant.size === '160x200')?.published, false)
  })

  it('rejects duplicate input keys and SKUs before opening a transaction', async () => {
    const repository = new InMemoryCatalogRepository()
    await assert.rejects(
      syncCatalog(input(product(), product({ strapiDocumentId: 'other' })), repository),
      /duplicate product integration key/i,
    )
    await assert.rejects(
      syncCatalog(input(product({ variants: [product().variants[0], product().variants[0]] })), repository),
      /duplicate variant/i,
    )
    assert.deepEqual(await repository.snapshot(), [])
  })

  it('rolls the complete batch back when a write fails mid-transaction', async () => {
    const repository = new InMemoryCatalogRepository({ failOnWrite: 3 })
    const luna = product({
      integrationKey: 'LUNA',
      strapiDocumentId: 'strapi-luna',
      variants: product().variants.map((variant) => ({
        ...variant,
        integrationKey: variant.integrationKey.replace('ERGO', 'LUNA'),
        sku: variant.sku.replace('ERGO', 'LUNA'),
      })),
    })
    await assert.rejects(
      syncCatalog(input(product(), luna), repository),
      /injected write failure/i,
    )
    assert.deepEqual(await repository.snapshot(), [])
  })
})
