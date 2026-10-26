export type CatalogImportVariant = {
  integrationKey: string
  sku: string
  size: string
  priceKopecks: number
  inventoryQuantity: number
  manageInventory: true
  allowBackorder: false
  available: boolean
}

export type CatalogImportProduct = {
  integrationKey: string
  strapiDocumentId: string
  title: string
  variants: CatalogImportVariant[]
}

export type CatalogImport = {
  schemaVersion: 'catalog-v1'
  products: CatalogImportProduct[]
}

export type StoredCatalogVariant = Omit<CatalogImportVariant, 'manageInventory' | 'allowBackorder'> & {
  id: string
  published: boolean
  manageInventory: boolean
  allowBackorder: boolean
}

export type StoredCatalogProduct = Omit<CatalogImportProduct, 'variants'> & {
  id: string
  variants: StoredCatalogVariant[]
}

export type CatalogSyncReport = {
  products: { created: number; updated: number; unchanged: number; rejected: number }
  variants: { created: number; updated: number; unchanged: number; unpublished: number; rejected: number }
}

export interface CatalogTransaction {
  listProducts(): Promise<StoredCatalogProduct[]>
  createProduct(product: CatalogImportProduct): Promise<StoredCatalogProduct>
  updateProduct(id: string, product: Pick<CatalogImportProduct, 'strapiDocumentId' | 'title'>): Promise<void>
  createVariant(productId: string, variant: CatalogImportVariant): Promise<StoredCatalogVariant>
  updateVariant(id: string, variant: CatalogImportVariant & { published: boolean }): Promise<void>
}

export interface CatalogRepository {
  transaction<T>(operation: (transaction: CatalogTransaction) => Promise<T>): Promise<T>
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const emptyReport = (): CatalogSyncReport => ({
  products: { created: 0, updated: 0, unchanged: 0, rejected: 0 },
  variants: { created: 0, updated: 0, unchanged: 0, unpublished: 0, rejected: 0 },
})

const sameVariant = (stored: StoredCatalogVariant, desired: CatalogImportVariant): boolean =>
  stored.integrationKey === desired.integrationKey
  && stored.sku === desired.sku
  && stored.size === desired.size
  && stored.priceKopecks === desired.priceKopecks
  && stored.inventoryQuantity === desired.inventoryQuantity
  && stored.manageInventory === desired.manageInventory
  && stored.allowBackorder === desired.allowBackorder
  && stored.available === desired.available
  && stored.published

function validateInput(input: CatalogImport): void {
  if (input?.schemaVersion !== 'catalog-v1' || !Array.isArray(input?.products)) {
    throw new Error('Invalid catalog-v1 import document')
  }
  const productKeys = new Set<string>()
  const strapiIds = new Set<string>()
  const variantKeys = new Set<string>()
  const skus = new Set<string>()
  for (const product of input.products) {
    if (!product.integrationKey || productKeys.has(product.integrationKey)) {
      throw new Error(`Duplicate product integration key: ${product.integrationKey}`)
    }
    productKeys.add(product.integrationKey)
    if (!product.strapiDocumentId || strapiIds.has(product.strapiDocumentId)) {
      throw new Error(`Duplicate Strapi document ID: ${product.strapiDocumentId}`)
    }
    strapiIds.add(product.strapiDocumentId)
    if (!Array.isArray(product.variants) || product.variants.length === 0) {
      throw new Error(`Product ${product.integrationKey} has no variants`)
    }
    for (const variant of product.variants) {
      if (variantKeys.has(variant.integrationKey) || skus.has(variant.sku)) {
        throw new Error(`Duplicate variant key or SKU: ${variant.integrationKey} / ${variant.sku}`)
      }
      variantKeys.add(variant.integrationKey)
      skus.add(variant.sku)
      if (variant.manageInventory !== true || variant.allowBackorder !== false) {
        throw new Error(`Invalid inventory policy: ${variant.sku}`)
      }
      if (!Number.isSafeInteger(variant.priceKopecks) || variant.priceKopecks <= 0) {
        throw new Error(`Invalid price: ${variant.sku}`)
      }
      if (!Number.isSafeInteger(variant.inventoryQuantity) || variant.inventoryQuantity < 0) {
        throw new Error(`Invalid inventory: ${variant.sku}`)
      }
    }
  }
}

export async function syncCatalog(input: CatalogImport, repository: CatalogRepository): Promise<CatalogSyncReport> {
  validateInput(input)
  return repository.transaction(async (transaction) => {
    const report = emptyReport()
    const storedProducts = await transaction.listProducts()
    const byKey = new Map(storedProducts.map((product) => [product.integrationKey, product]))

    for (const desiredProduct of input.products) {
      let storedProduct = byKey.get(desiredProduct.integrationKey)
      if (!storedProduct) {
        storedProduct = await transaction.createProduct(desiredProduct)
        report.products.created += 1
      } else if (
        storedProduct.strapiDocumentId !== desiredProduct.strapiDocumentId
        || storedProduct.title !== desiredProduct.title
      ) {
        await transaction.updateProduct(storedProduct.id, desiredProduct)
        report.products.updated += 1
      } else {
        report.products.unchanged += 1
      }

      const variantsByKey = new Map(storedProduct.variants.map((variant) => [variant.integrationKey, variant]))
      const desiredKeys = new Set(desiredProduct.variants.map((variant) => variant.integrationKey))
      for (const desiredVariant of desiredProduct.variants) {
        const storedVariant = variantsByKey.get(desiredVariant.integrationKey)
        if (!storedVariant) {
          await transaction.createVariant(storedProduct.id, desiredVariant)
          report.variants.created += 1
        } else if (!sameVariant(storedVariant, desiredVariant)) {
          await transaction.updateVariant(storedVariant.id, { ...desiredVariant, published: true })
          report.variants.updated += 1
        } else {
          report.variants.unchanged += 1
        }
      }
      for (const storedVariant of storedProduct.variants) {
        if (storedVariant.published && !desiredKeys.has(storedVariant.integrationKey)) {
          await transaction.updateVariant(storedVariant.id, {
            ...storedVariant,
            inventoryQuantity: 0,
            manageInventory: true,
            allowBackorder: false,
            available: false,
            published: false,
          })
          report.variants.unpublished += 1
        }
      }
    }
    return report
  })
}

export class InMemoryCatalogRepository implements CatalogRepository, CatalogTransaction {
  private products: StoredCatalogProduct[] = []
  private nextId = 1
  private writes = 0

  constructor(private readonly options: { failOnWrite?: number } = {}) {}

  private beforeWrite(): void {
    this.writes += 1
    if (this.options.failOnWrite === this.writes) throw new Error('Injected write failure')
  }

  async transaction<T>(operation: (transaction: CatalogTransaction) => Promise<T>): Promise<T> {
    const savedProducts = clone(this.products)
    const savedNextId = this.nextId
    try {
      return await operation(this)
    } catch (error) {
      this.products = savedProducts
      this.nextId = savedNextId
      throw error
    }
  }

  async listProducts(): Promise<StoredCatalogProduct[]> {
    return clone(this.products)
  }

  async createProduct(product: CatalogImportProduct): Promise<StoredCatalogProduct> {
    this.beforeWrite()
    const created = {
      integrationKey: product.integrationKey,
      strapiDocumentId: product.strapiDocumentId,
      title: product.title,
      id: `prod_${this.nextId++}`,
      variants: [],
    }
    this.products.push(created)
    return clone(created)
  }

  async updateProduct(id: string, product: Pick<CatalogImportProduct, 'strapiDocumentId' | 'title'>): Promise<void> {
    this.beforeWrite()
    const stored = this.products.find((item) => item.id === id)
    if (!stored) throw new Error(`Unknown product: ${id}`)
    stored.strapiDocumentId = product.strapiDocumentId
    stored.title = product.title
  }

  async createVariant(productId: string, variant: CatalogImportVariant): Promise<StoredCatalogVariant> {
    this.beforeWrite()
    const product = this.products.find((item) => item.id === productId)
    if (!product) throw new Error(`Unknown product: ${productId}`)
    const created = { ...clone(variant), id: `variant_${this.nextId++}`, published: true }
    product.variants.push(created)
    return clone(created)
  }

  async updateVariant(id: string, variant: CatalogImportVariant & { published: boolean }): Promise<void> {
    this.beforeWrite()
    const stored = this.products.flatMap((product) => product.variants).find((item) => item.id === id)
    if (!stored) throw new Error(`Unknown variant: ${id}`)
    Object.assign(stored, clone(variant))
  }

  async snapshot(): Promise<StoredCatalogProduct[]> {
    return clone(this.products)
  }
}
