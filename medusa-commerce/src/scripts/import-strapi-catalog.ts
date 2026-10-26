import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { ExecArgs } from '@medusajs/framework/types'

import type { CatalogImport } from '../workflows/catalog-sync'
import { MedusaCatalogRepository } from '../workflows/catalog-sync/medusa-repository'
import { syncCatalogWorkflow } from '../workflows/catalog-sync/workflow'

const defaultImportPath = resolve(process.cwd(), '../commerce-contracts/catalog-v1.local.json')

export default async function importStrapiCatalog({ container, args }: ExecArgs) {
  const inputPath = resolve(args.find((arg) => arg !== 'dry-run') || defaultImportPath)
  const input = JSON.parse(await readFile(inputPath, 'utf8')) as CatalogImport
  const dryRun = args.includes('dry-run')
  const before = await new MedusaCatalogRepository(container).listProducts()
  if (dryRun) {
    const expectedProducts = new Set(input.products.map((product) => product.integrationKey))
    const expectedVariants = new Map(input.products.flatMap((product) => product.variants.map((variant) => [variant.sku, variant])))
    const actualVariantRows = before.flatMap((product) => product.variants.filter((variant) => variant.published))
    const actualVariants = new Map(actualVariantRows.map((variant) => [variant.sku, variant]))
    const duplicateActualSkus = actualVariantRows
      .map((variant) => variant.sku)
      .filter((sku, index, list) => list.indexOf(sku) !== index)
    const differences = [
      ...input.products.filter((product) => !before.some((stored) => stored.integrationKey === product.integrationKey)).map((product) => `missing product ${product.integrationKey}`),
      ...before.filter((product) => !expectedProducts.has(product.integrationKey)).map((product) => `unexpected product ${product.integrationKey}`),
      ...input.products.flatMap((expected) => {
        const actual = before.find((product) => product.integrationKey === expected.integrationKey)
        if (!actual) return []
        return [
          actual.strapiDocumentId === expected.strapiDocumentId ? '' : `Strapi link mismatch ${expected.integrationKey}`,
          actual.title === expected.title ? '' : `title mismatch ${expected.integrationKey}`,
        ].filter(Boolean)
      }),
      ...[...expectedVariants.keys()].filter((sku) => !actualVariants.has(sku)).map((sku) => `missing SKU ${sku}`),
      ...[...actualVariants.keys()].filter((sku) => !expectedVariants.has(sku)).map((sku) => `unexpected SKU ${sku}`),
      ...duplicateActualSkus.map((sku) => `duplicate SKU ${sku}`),
      ...[...expectedVariants].flatMap(([sku, expected]) => {
        const actual = actualVariants.get(sku)
        if (!actual) return []
        return [
          actual.priceKopecks === expected.priceKopecks ? '' : `price mismatch ${sku}`,
          actual.inventoryQuantity === expected.inventoryQuantity ? '' : `inventory mismatch ${sku}`,
        ].filter(Boolean)
      }),
    ]
    if (differences.length) throw new Error(`Catalog reconciliation failed:\n${differences.join('\n')}`)
    console.log(JSON.stringify({ status: 'ok', differences: [] }))
    return
  }
  const { result } = await syncCatalogWorkflow(container).run({ input })
  console.log(JSON.stringify(result))
}
