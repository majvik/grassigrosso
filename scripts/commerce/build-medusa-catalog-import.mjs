import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const contractSchema = JSON.parse(
  readFileSync(new URL('../../commerce-contracts/catalog-v1.schema.json', import.meta.url), 'utf8'),
)
const SCHEMA_VERSION = contractSchema.properties.schemaVersion.const
const KEY_PATTERN = new RegExp(contractSchema.$defs.integrationKey.pattern)
const SIZE_PATTERN = /^(\d+)[xх×](\d+)$/i

const fail = (message) => {
  throw new Error(message)
}

const normalizeProductKey = (value) => {
  const key = String(value || '').trim().toUpperCase()
  if (!KEY_PATTERN.test(key)) fail(`Invalid or missing integration key: ${String(value || '')}`)
  return key
}

const normalizeSize = (value) => {
  const raw = String(value?.slug || value?.name || value || '').trim().replace(/\s+/g, '')
  const match = raw.match(SIZE_PATTERN)
  if (!match) fail(`Invalid mattress size: ${raw || '(empty)'}`)
  const width = Number(match[1])
  const length = Number(match[2])
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(length) || length <= 0) {
    fail(`Invalid mattress size: ${raw}`)
  }
  return `${width}x${length}`
}

const compareSizes = (left, right) => {
  const [leftWidth, leftLength] = left.split('x').map(Number)
  const [rightWidth, rightLength] = right.split('x').map(Number)
  return leftWidth - rightWidth || leftLength - rightLength
}

const requirePositiveInteger = (value, label) => {
  if (!Number.isSafeInteger(value) || value <= 0) fail(`${label} must be a positive integer`)
  return value
}

const requireInventory = (value) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail('Inventory quantity must be an explicit finite non-negative integer')
  }
  return value
}

export function formatSku(productKey, size) {
  return `GG-${normalizeProductKey(productKey)}-${normalizeSize(size).toUpperCase()}`
}

export function buildCommerceProduct(row) {
  const integrationKey = normalizeProductKey(row?.commerceKey ?? row?.commerce_key)
  const strapiDocumentId = String(row?.documentId || row?.strapiDocumentId || '').trim()
  const title = String(row?.name || row?.title || '').trim()
  if (!strapiDocumentId) fail(`Product ${integrationKey} is missing Strapi document ID`)
  if (!title) fail(`Product ${integrationKey} is missing title`)
  return { integrationKey, strapiDocumentId, title }
}

export function buildCommerceVariants(row) {
  const productKey = normalizeProductKey(row?.commerceKey ?? row?.commerce_key)
  const allowedSizes = (Array.isArray(row?.sizes) ? row.sizes : []).map(normalizeSize)
  const uniqueAllowedSizes = new Set(allowedSizes)
  if (uniqueAllowedSizes.size !== allowedSizes.length) fail(`Duplicate allowed size for ${productKey}`)
  if (uniqueAllowedSizes.size === 0) fail(`Product ${productKey} has no allowed sizes`)

  const inputs = Array.isArray(row?.commerceVariants) ? row.commerceVariants : []
  const variantsBySize = new Map()
  for (const input of inputs) {
    const size = normalizeSize(input?.size)
    if (variantsBySize.has(size)) fail(`Duplicate variant size/SKU for ${productKey}: ${size}`)
    if (!uniqueAllowedSizes.has(size)) fail(`Variant ${size} is not an allowed size for ${productKey}`)
    const inventoryQuantity = requireInventory(input?.inventoryQuantity)
    variantsBySize.set(size, {
      integrationKey: `${productKey}:${size.toUpperCase()}`,
      sku: formatSku(productKey, size),
      size,
      priceKopecks: requirePositiveInteger(input?.priceKopecks, 'Price in kopecks'),
      inventoryQuantity,
      manageInventory: true,
      allowBackorder: false,
      available: inventoryQuantity > 0,
    })
  }

  for (const size of uniqueAllowedSizes) {
    if (!variantsBySize.has(size)) fail(`Missing explicit commerce variant for allowed size ${size}`)
  }
  return [...variantsBySize.values()].sort((left, right) => compareSizes(left.size, right.size))
}

export function validateImport(document) {
  const errors = []
  if (!document || document.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}`)
  if (!Array.isArray(document?.products)) errors.push('products must be an array')
  const productKeys = new Set()
  const strapiIds = new Set()
  const skus = new Set()
  for (const product of document?.products || []) {
    if (!KEY_PATTERN.test(product?.integrationKey || '')) errors.push('invalid product integrationKey')
    if (productKeys.has(product?.integrationKey)) errors.push(`duplicate product integration key: ${product.integrationKey}`)
    productKeys.add(product?.integrationKey)
    if (!String(product?.strapiDocumentId || '').trim()) errors.push(`missing Strapi document ID: ${product?.integrationKey}`)
    if (strapiIds.has(product?.strapiDocumentId)) errors.push(`duplicate Strapi document ID: ${product.strapiDocumentId}`)
    strapiIds.add(product?.strapiDocumentId)
    if (!String(product?.title || '').trim()) errors.push(`missing title: ${product?.integrationKey}`)
    if (!Array.isArray(product?.variants) || product.variants.length === 0) errors.push(`missing variants: ${product?.integrationKey}`)
    for (const variant of product?.variants || []) {
      if (skus.has(variant?.sku)) errors.push(`duplicate SKU: ${variant?.sku}`)
      skus.add(variant?.sku)
      if (variant?.sku !== formatSku(product.integrationKey, variant?.size)) errors.push(`invalid SKU: ${variant?.sku}`)
      if (!Number.isSafeInteger(variant?.priceKopecks) || variant.priceKopecks <= 0) errors.push(`invalid price: ${variant?.sku}`)
      if (!Number.isSafeInteger(variant?.inventoryQuantity) || variant.inventoryQuantity < 0) errors.push(`invalid inventory: ${variant?.sku}`)
      if (variant?.manageInventory !== true) errors.push(`managed inventory required: ${variant?.sku}`)
      if (variant?.allowBackorder !== false) errors.push(`backorders must be disabled: ${variant?.sku}`)
      if (variant?.available !== (variant?.inventoryQuantity > 0)) errors.push(`availability mismatch: ${variant?.sku}`)
    }
  }
  return { valid: errors.length === 0, errors }
}

export function buildImportDocument(rows) {
  if (!Array.isArray(rows)) fail('Catalog input must be an array')
  const activeRows = rows.filter((row) => row?.isActive !== false && row?.is_active !== false)
  const products = activeRows.map((row) => ({
    ...buildCommerceProduct(row),
    variants: buildCommerceVariants(row),
  })).sort((left, right) => left.integrationKey.localeCompare(right.integrationKey, 'en'))
  const document = { schemaVersion: SCHEMA_VERSION, products }
  const result = validateImport(document)
  if (!result.valid) fail(`Invalid commerce catalog import:\n${result.errors.join('\n')}`)
  return document
}

async function main() {
  const [inputPath, outputPath] = process.argv.slice(2)
  if (!inputPath) fail('Usage: build-medusa-catalog-import.mjs <input.json> [output.json]')
  const input = JSON.parse(await readFile(inputPath, 'utf8'))
  const document = buildImportDocument(Array.isArray(input) ? input : input.items)
  const serialized = `${JSON.stringify(document, null, 2)}\n`
  if (outputPath) await writeFile(outputPath, serialized, 'utf8')
  else process.stdout.write(serialized)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
