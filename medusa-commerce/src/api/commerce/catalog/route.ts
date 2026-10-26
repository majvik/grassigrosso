import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

import { MedusaCatalogRepository } from '../../../workflows/catalog-sync/medusa-repository'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const products = await new MedusaCatalogRepository(req.scope).listProducts()
  res.status(200).json({
    items: products.map((product) => ({
      integrationKey: product.integrationKey,
      medusaProductId: product.id,
      variants: product.variants
        .filter((variant) => variant.published)
        .map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          size: variant.size,
          priceKopecks: variant.priceKopecks,
          inventoryQuantity: variant.inventoryQuantity,
          available: variant.available,
        })),
    })),
  })
}
