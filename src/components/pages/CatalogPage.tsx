import { CatalogPageLayout } from '@/components/catalog-page/layout'
import { CollectionPagePrototype } from '@/components/pages/CollectionPagePrototype'
import { ProductPagePrototype } from '@/components/pages/ProductPagePrototype'

export function CatalogPage() {
  if (new URLSearchParams(window.location.search).has('product')) {
    return <ProductPagePrototype />
  }
  const collectionSlug = new URLSearchParams(window.location.search).get('collection')?.trim().toLowerCase()
  if (collectionSlug) {
    return <CollectionPagePrototype collectionSlug={collectionSlug} />
  }
  return <CatalogPageLayout />
}
