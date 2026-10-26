export const COMMERCE_CATALOG_SCHEMA_VERSION = 'catalog-v1' as const

export type CommerceProductRef = {
  strapiDocumentId: string
  medusaProductId: string
  integrationKey: string
}

export type CommerceVariantProjection = {
  id: string
  sku: string
  size: string
  priceKopecks: number
  inventoryQuantity: number
  available: boolean
}

export type CommerceCatalogImportVariant = Omit<CommerceVariantProjection, 'id'> & {
  integrationKey: string
  manageInventory: true
  allowBackorder: false
}

export type CommerceCatalogImportProduct = {
  integrationKey: string
  strapiDocumentId: string
  title: string
  variants: CommerceCatalogImportVariant[]
}

export type CommerceCatalogImportDocument = {
  schemaVersion: typeof COMMERCE_CATALOG_SCHEMA_VERSION
  products: CommerceCatalogImportProduct[]
}
