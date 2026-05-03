import { CatalogFallbackCardsGrid } from '@/components/catalog-page/cards'
import { CatalogSidebarFilters } from '@/components/catalog-page/filters'
import { CatalogHeroSection } from '@/components/catalog-page/hero'
import {
  CatalogFavouritesActions,
  CatalogFavouritesBackRow,
  CatalogToolbar,
} from '@/components/catalog-page/toolbar'

export function CatalogHelpSection() {
  return (
    <section className="documents-help">
      <div className="documents-help-content">
        <div className="documents-help-left">
          <h2 className="section-title">Нужна помощь с подбором?</h2>
        </div>
        <div className="documents-help-right">
          <p className="documents-help-text">
            Наши менеджеры помогут выбрать подходящую модель и подготовят персональное предложение под ваш запрос
          </p>
          <a href="/contacts#contact-form" className="btn-primary-large">
            Связаться с менеджером
          </a>
        </div>
      </div>
    </section>
  )
}

export function CatalogPageLayout() {
  return (
    <>
      <CatalogHeroSection />

      <div className="catalogue-new-layout">
        <CatalogSidebarFilters />

        <section className="catalogue-new-content" id="catalogue-new-products">
          <CatalogToolbar />
          <CatalogFavouritesBackRow />
          <CatalogFallbackCardsGrid />
          <CatalogFavouritesActions />
        </section>
      </div>

      <div className="catalogue-new-mobile-filters-overlay" id="catalogue-new-mobile-filters-overlay" hidden />

      <CatalogHelpSection />
    </>
  )
}
