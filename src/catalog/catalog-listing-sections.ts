import type { CatalogProduct } from './catalog-api'
import { buildCatalogueCardHtml } from './catalog-card'

export type CatalogListingSections = {
  recommendedTitle: string
  allProductsTitle: string
}

export const DEFAULT_CATALOG_LISTING_SECTIONS: CatalogListingSections = {
  recommendedTitle: 'Мы рекомендуем',
  allProductsTitle: 'Все товары',
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function normalizeCatalogListingSections(
  value: { recommendedTitle?: string | null; allProductsTitle?: string | null } | null | undefined,
): CatalogListingSections {
  const recommendedTitle = String(value?.recommendedTitle || '').trim()
  const allProductsTitle = String(value?.allProductsTitle || '').trim()
  return {
    recommendedTitle: recommendedTitle || DEFAULT_CATALOG_LISTING_SECTIONS.recommendedTitle,
    allProductsTitle: allProductsTitle || DEFAULT_CATALOG_LISTING_SECTIONS.allProductsTitle,
  }
}

export function buildCatalogListingSectionsHtml(
  recommended: CatalogProduct[],
  rest: CatalogProduct[],
  sections: CatalogListingSections,
): string {
  const titles = normalizeCatalogListingSections(sections)
  const blocks: string[] = []

  if (recommended.length > 0) {
    blocks.push(
      `<section class="catalogue-new-listing-section" data-listing-section="recommended">` +
        `<h2 class="catalogue-new-section-title">${escapeHtml(titles.recommendedTitle)}</h2>` +
        `<div class="catalogue-new-cards-grid">${recommended.map((item) => buildCatalogueCardHtml(item)).join('')}</div>` +
        `</section>`,
    )
  }

  if (rest.length > 0 || recommended.length === 0) {
    blocks.push(
      `<section class="catalogue-new-listing-section" data-listing-section="all">` +
        `<h2 class="catalogue-new-section-title">${escapeHtml(titles.allProductsTitle)}</h2>` +
        `<div class="catalogue-new-cards-grid">${rest.map((item) => buildCatalogueCardHtml(item)).join('')}</div>` +
        `</section>`,
    )
  }

  return blocks.join('')
}
