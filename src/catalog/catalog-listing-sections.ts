import type { CatalogProduct } from './catalog-api'
import { buildCatalogueCardHtml } from './catalog-card'

export type CatalogListingSections = {
  recommendedTitle: string
  recommendedSubtitle: string
  allProductsTitle: string
  hideRecommendedTitle?: boolean
}

export const DEFAULT_CATALOG_LISTING_SECTIONS: CatalogListingSections = {
  recommendedTitle: 'Наш выбор для вашего сна',
  recommendedSubtitle: 'Оптимальные системы поддержки, комфорта и восстановления.',
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
  value: {
    recommendedTitle?: string | null
    recommendedSubtitle?: string | null
    allProductsTitle?: string | null
    hideRecommendedTitle?: boolean
  } | null | undefined,
): CatalogListingSections {
  const recommendedTitle = String(value?.recommendedTitle || '').trim()
  const recommendedSubtitle = String(value?.recommendedSubtitle || '').trim()
  const allProductsTitle = String(value?.allProductsTitle || '').trim()
  return {
    recommendedTitle: recommendedTitle || DEFAULT_CATALOG_LISTING_SECTIONS.recommendedTitle,
    recommendedSubtitle:
      value?.recommendedSubtitle === ''
        ? ''
        : recommendedSubtitle || DEFAULT_CATALOG_LISTING_SECTIONS.recommendedSubtitle,
    allProductsTitle: allProductsTitle || DEFAULT_CATALOG_LISTING_SECTIONS.allProductsTitle,
    hideRecommendedTitle: value?.hideRecommendedTitle === true,
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
        (titles.hideRecommendedTitle
          ? ''
          : `<h2 class="catalogue-new-section-title">${escapeHtml(titles.recommendedTitle)}</h2>`) +
        (titles.recommendedSubtitle
          ? `<p class="catalogue-new-section-subtitle">${escapeHtml(titles.recommendedSubtitle)}</p>`
          : '') +
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
