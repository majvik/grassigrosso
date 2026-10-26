import type { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createStockLocationsWorkflow,
  createProductVariantsWorkflow,
  deleteProductsWorkflow,
  deleteProductVariantsWorkflow,
  updateInventoryLevelsWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from '@medusajs/medusa/core-flows'

import type {
  CatalogImportProduct,
  CatalogImportVariant,
  CatalogRepository,
  CatalogTransaction,
  StoredCatalogProduct,
  StoredCatalogVariant,
} from './index'

const PRODUCT_KEY = 'grassigrosso_integration_key'
const STRAPI_ID = 'grassigrosso_strapi_document_id'
const VARIANT_KEY = 'grassigrosso_variant_key'
const SIZE = 'grassigrosso_size'
const PUBLISHED = 'grassigrosso_published'
const INVENTORY = 'grassigrosso_inventory_quantity'
const PRICE = 'grassigrosso_price_kopecks'
const STOCK_LOCATION_NAME = 'Grassigrosso основной склад'

type GraphProduct = Record<string, any>

const metadataString = (metadata: Record<string, unknown> | null | undefined, key: string): string =>
  typeof metadata?.[key] === 'string' ? String(metadata[key]) : ''

const metadataNumber = (metadata: Record<string, unknown> | null | undefined, key: string): number =>
  typeof metadata?.[key] === 'number' ? Number(metadata[key]) : 0

export class MedusaCatalogRepository implements CatalogRepository, CatalogTransaction {
  private locationId: string | null = null

  constructor(private readonly container: MedusaContainer) {}

  async transaction<T>(operation: (transaction: CatalogTransaction) => Promise<T>): Promise<T> {
    const before = await this.listProducts()
    try {
      return await operation(this)
    } catch (error) {
      await this.restoreSnapshot(before)
      throw error
    }
  }

  private async restoreSnapshot(before: StoredCatalogProduct[]): Promise<void> {
    const current = await this.listProducts()
    const beforeByKey = new Map(before.map((product) => [product.integrationKey, product]))
    const currentByKey = new Map(current.map((product) => [product.integrationKey, product]))
    const createdProductIds = current
      .filter((product) => !beforeByKey.has(product.integrationKey))
      .map((product) => product.id)
    if (createdProductIds.length) {
      await deleteProductsWorkflow(this.container).run({ input: { ids: createdProductIds } })
    }
    for (const previousProduct of before) {
      const currentProduct = currentByKey.get(previousProduct.integrationKey)
      if (!currentProduct) continue
      const previousVariants = new Map(previousProduct.variants.map((variant) => [variant.integrationKey, variant]))
      const createdVariantIds = currentProduct.variants
        .filter((variant) => !previousVariants.has(variant.integrationKey))
        .map((variant) => variant.id)
      if (createdVariantIds.length) {
        await deleteProductVariantsWorkflow(this.container).run({ input: { ids: createdVariantIds } })
      }
      await this.updateProduct(currentProduct.id, previousProduct)
      const currentVariants = new Map(currentProduct.variants.map((variant) => [variant.integrationKey, variant]))
      for (const previousVariant of previousProduct.variants) {
        const currentVariant = currentVariants.get(previousVariant.integrationKey)
        if (currentVariant) {
          await this.updateVariant(currentVariant.id, {
            ...previousVariant,
            manageInventory: true,
            allowBackorder: false,
          })
        }
      }
    }
  }

  private async graphProducts(): Promise<GraphProduct[]> {
    const query = this.container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: 'product',
      fields: [
        'id',
        'title',
        'metadata',
        'variants.id',
        'variants.sku',
        'variants.manage_inventory',
        'variants.allow_backorder',
        'variants.metadata',
        'variants.price_set.prices.amount',
        'variants.price_set.prices.currency_code',
        'variants.inventory_items.inventory.location_levels.stocked_quantity',
      ],
    })
    return data as GraphProduct[]
  }

  async listProducts(): Promise<StoredCatalogProduct[]> {
    const products = await this.graphProducts()
    return products
      .filter((product) => metadataString(product.metadata, PRODUCT_KEY))
      .map((product) => ({
        id: String(product.id),
        integrationKey: metadataString(product.metadata, PRODUCT_KEY),
        strapiDocumentId: metadataString(product.metadata, STRAPI_ID),
        title: String(product.title || ''),
        variants: (product.variants || [])
          .filter((variant: GraphProduct) => metadataString(variant.metadata, VARIANT_KEY))
          .map((variant: GraphProduct): StoredCatalogVariant => {
            const rubPrice = (variant.price_set?.prices || []).find(
              (price: GraphProduct) => String(price.currency_code || '').toLowerCase() === 'rub',
            )
            const inventoryQuantity = (variant.inventory_items || []).reduce(
              (total: number, link: GraphProduct) => total + (link.inventory?.location_levels || []).reduce(
                (levelTotal: number, level: GraphProduct) => levelTotal + Number(level.stocked_quantity || 0),
                0,
              ),
              0,
            )
            return {
              id: String(variant.id),
              integrationKey: metadataString(variant.metadata, VARIANT_KEY),
              sku: String(variant.sku || ''),
              size: metadataString(variant.metadata, SIZE),
              priceKopecks: Number(rubPrice?.amount ?? metadataNumber(variant.metadata, PRICE)),
              inventoryQuantity,
              manageInventory: variant.manage_inventory === true,
              allowBackorder: variant.allow_backorder === true,
              available: inventoryQuantity > 0,
              published: variant.metadata?.[PUBLISHED] !== false,
            }
          }),
      }))
  }

  async createProduct(product: CatalogImportProduct): Promise<StoredCatalogProduct> {
    const { result } = await createProductsWorkflow(this.container).run({
      input: {
        products: [{
          title: product.title,
          status: 'published',
          metadata: {
            [PRODUCT_KEY]: product.integrationKey,
            [STRAPI_ID]: product.strapiDocumentId,
          },
          options: [{ title: 'Размер', values: product.variants.map((variant) => variant.size) }],
        }],
      },
    })
    return {
      id: result[0].id,
      integrationKey: product.integrationKey,
      strapiDocumentId: product.strapiDocumentId,
      title: product.title,
      variants: [],
    }
  }

  async updateProduct(id: string, product: Pick<CatalogImportProduct, 'strapiDocumentId' | 'title'>): Promise<void> {
    const existing = (await this.graphProducts()).find((item) => item.id === id)
    await updateProductsWorkflow(this.container).run({
      input: {
        products: [{
          id,
          title: product.title,
          metadata: { ...(existing?.metadata || {}), [STRAPI_ID]: product.strapiDocumentId },
        }],
      },
    })
  }

  private async stockLocationId(): Promise<string> {
    if (this.locationId) return this.locationId
    const service = this.container.resolve(Modules.STOCK_LOCATION)
    let [location] = await service.listStockLocations({ name: STOCK_LOCATION_NAME })
    if (!location) {
      const { result } = await createStockLocationsWorkflow(this.container).run({
        input: { locations: [{ name: STOCK_LOCATION_NAME }] },
      })
      location = result[0]
    }
    this.locationId = location.id
    return location.id
  }

  private async setInventory(variantId: string, quantity: number): Promise<void> {
    const query = this.container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: 'product_variant',
      fields: ['id', 'inventory_items.inventory_item_id'],
      filters: { id: variantId },
    })
    const inventoryItemId = (data as any[])[0]?.inventory_items?.[0]?.inventory_item_id
    if (!inventoryItemId) throw new Error(`Managed inventory item missing for variant ${variantId}`)
    const locationId = await this.stockLocationId()
    const inventoryService = this.container.resolve(Modules.INVENTORY)
    const levels = await inventoryService.listInventoryLevels({
      inventory_item_id: inventoryItemId,
      location_id: locationId,
    })
    if (levels.length) {
      await updateInventoryLevelsWorkflow(this.container).run({
        input: {
          updates: [{
            id: levels[0].id,
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            stocked_quantity: quantity,
          }],
        },
      })
    } else {
      await createInventoryLevelsWorkflow(this.container).run({
        input: { inventory_levels: [{ inventory_item_id: inventoryItemId, location_id: locationId, stocked_quantity: quantity }] },
      })
    }
  }

  async createVariant(productId: string, variant: CatalogImportVariant): Promise<StoredCatalogVariant> {
    const { result } = await createProductVariantsWorkflow(this.container).run({
      input: {
        product_variants: [{
          product_id: productId,
          title: variant.size,
          sku: variant.sku,
          manage_inventory: true,
          allow_backorder: false,
          options: { 'Размер': variant.size },
          prices: [{ amount: variant.priceKopecks, currency_code: 'rub' }],
          metadata: {
            [VARIANT_KEY]: variant.integrationKey,
            [SIZE]: variant.size,
            [PUBLISHED]: true,
            [INVENTORY]: variant.inventoryQuantity,
            [PRICE]: variant.priceKopecks,
          },
        }],
      },
    })
    await this.setInventory(result[0].id, variant.inventoryQuantity)
    return { ...variant, id: result[0].id, published: true }
  }

  async updateVariant(id: string, variant: CatalogImportVariant & { published: boolean }): Promise<void> {
    await updateProductVariantsWorkflow(this.container).run({
      input: {
        product_variants: [{
          id,
          title: variant.size,
          sku: variant.sku,
          manage_inventory: true,
          allow_backorder: false,
          prices: [{ amount: variant.priceKopecks, currency_code: 'rub' }],
          metadata: {
            [VARIANT_KEY]: variant.integrationKey,
            [SIZE]: variant.size,
            [PUBLISHED]: variant.published,
            [INVENTORY]: variant.inventoryQuantity,
            [PRICE]: variant.priceKopecks,
          },
        }],
      },
    })
    await this.setInventory(id, variant.inventoryQuantity)
  }
}
