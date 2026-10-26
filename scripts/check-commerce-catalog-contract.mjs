import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const importerUrl = new URL('./commerce/build-medusa-catalog-import.mjs', import.meta.url)
const {
  buildCommerceProduct,
  buildCommerceVariants,
  buildImportDocument,
  formatSku,
  validateImport,
} = await import(importerUrl)

const productRow = {
  documentId: 'strapi-product-1',
  commerceKey: 'ERGO',
  name: 'Ergo',
  isActive: true,
  sizes: ['160x200', { slug: '90x200' }],
  commerceVariants: [
    { size: '160x200', priceKopecks: 1450000, inventoryQuantity: 1000 },
    { size: '90x200', priceKopecks: 990000, inventoryQuantity: 0 },
  ],
}

assert.equal(formatSku('ergo', '160×200'), 'GG-ERGO-160X200')
assert.deepEqual(buildCommerceProduct(productRow), {
  integrationKey: 'ERGO',
  strapiDocumentId: 'strapi-product-1',
  title: 'Ergo',
})

const variants = buildCommerceVariants(productRow)
assert.deepEqual(
  variants.map(({ sku, size, priceKopecks, inventoryQuantity, available, allowBackorder }) => ({
    sku,
    size,
    priceKopecks,
    inventoryQuantity,
    available,
    allowBackorder,
  })),
  [
    {
      sku: 'GG-ERGO-90X200',
      size: '90x200',
      priceKopecks: 990000,
      inventoryQuantity: 0,
      available: false,
      allowBackorder: false,
    },
    {
      sku: 'GG-ERGO-160X200',
      size: '160x200',
      priceKopecks: 1450000,
      inventoryQuantity: 1000,
      available: true,
      allowBackorder: false,
    },
  ],
)

const first = buildImportDocument([productRow])
const second = buildImportDocument([productRow])
assert.equal(JSON.stringify(first), JSON.stringify(second), 'rerun must be byte-identical')
assert.deepEqual(validateImport(first), { valid: true, errors: [] })

const expectFailure = (label, operation, pattern) => {
  assert.throws(operation, pattern, label)
}

expectFailure(
  'active products require immutable integration keys',
  () => buildImportDocument([{ ...productRow, commerceKey: '' }]),
  /integration key/i,
)
expectFailure(
  'duplicate product integration keys fail closed',
  () => buildImportDocument([productRow, { ...productRow, documentId: 'strapi-product-2' }]),
  /duplicate.*integration key/i,
)
expectFailure(
  'every allowed size requires explicit commerce input',
  () => buildCommerceVariants({ ...productRow, commerceVariants: productRow.commerceVariants.slice(0, 1) }),
  /missing.*90x200/i,
)
expectFailure(
  'duplicate variant sizes and SKUs fail closed',
  () => buildCommerceVariants({
    ...productRow,
    commerceVariants: [...productRow.commerceVariants, productRow.commerceVariants[0]],
  }),
  /duplicate/i,
)

for (const invalidInventory of [undefined, -1, 1.5, Number.POSITIVE_INFINITY, 'infinite']) {
  expectFailure(
    `inventory ${String(invalidInventory)} is rejected`,
    () => buildCommerceVariants({
      ...productRow,
      commerceVariants: productRow.commerceVariants.map((variant, index) =>
        index === 0 ? { ...variant, inventoryQuantity: invalidInventory } : variant,
      ),
    }),
    /inventory/i,
  )
}

for (const invalidPrice of [undefined, 0, -1, 1.5, Number.POSITIVE_INFINITY]) {
  expectFailure(
    `price ${String(invalidPrice)} is rejected`,
    () => buildCommerceVariants({
      ...productRow,
      commerceVariants: productRow.commerceVariants.map((variant, index) =>
        index === 0 ? { ...variant, priceKopecks: invalidPrice } : variant,
      ),
    }),
    /price/i,
  )
}

const schema = JSON.parse(
  await readFile(new URL('../commerce-contracts/catalog-v1.schema.json', import.meta.url), 'utf8'),
)
assert.equal(schema.$id, 'https://grassigrosso.local/contracts/catalog-v1.schema.json')
assert.equal(schema.properties.schemaVersion.const, 'catalog-v1')

const browserTypes = await readFile(new URL('../src/commerce/contracts.ts', import.meta.url), 'utf8')
for (const field of [
  'strapiDocumentId',
  'medusaProductId',
  'integrationKey',
  'id',
  'sku',
  'size',
  'priceKopecks',
  'inventoryQuantity',
  'available',
]) {
  assert.match(browserTypes, new RegExp(`\\b${field}\\b`), `browser contract must expose ${field}`)
}

console.log('Commerce catalog contract: PASS')
