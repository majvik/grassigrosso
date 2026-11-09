import { CatalogPageLayout } from '@/components/catalog-page/layout'
import { ProductPagePrototype } from '@/components/pages/ProductPagePrototype'

export function CatalogPage() {
  if (new URLSearchParams(window.location.search).has('product')) {
    return <ProductPagePrototype />
  }
  return <CatalogPageLayout />
}
