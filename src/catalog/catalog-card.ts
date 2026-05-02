import type { CatalogProduct } from './catalog-api'
import {
  STANDARD_MATTRESS_SIZES,
  buildStandardMattressSizesFromLegacy,
  filterStandardMattressSizes,
} from './catalog-sizes'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildMetaLine(label: string, value: string): string {
  return `<span class="catalogue-new-meta-line">${escapeHtml(label)}: <span class="catalogue-new-meta-value">${escapeHtml(value)}</span></span>`
}

function buildCatalogueFavouriteButton(slug: string): string {
  const safe = escapeHtml(String(slug || '').trim() || 'product')
  const iconEmpty =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">' +
    '<path d="M12.5195 6.54004C14.1275 4.99547 16.0325 4.89463 17.5469 5.65625C19.0852 6.42991 20.25 8.11223 20.25 10.2129C20.2499 12.6747 18.7457 14.5572 16.5186 16.4248C15.7487 17.0703 14.9096 17.6806 14.0352 18.3408C13.3539 18.8552 12.6589 19.3946 12 19.9795C11.33 19.3832 10.6306 18.8382 9.94727 18.3223C9.07374 17.6627 8.24269 17.0607 7.48047 16.4238C5.24361 14.5548 3.75012 12.6922 3.75 10.2129C3.75 8.11223 4.91481 6.42991 6.45312 5.65625C7.96754 4.89463 9.87248 4.99548 11.4805 6.54004L12 7.03906L12.5195 6.54004Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
    '</svg>'
  const iconFull =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">' +
    '<path d="M21 10.2126C21 13.0257 19.2637 15.1009 17 16.9992C16.1255 17.7325 15.1591 18.4259 14.2086 19.1506C12.9284 20.1268 11.0733 20.1248 9.79369 19.1479C8.83697 18.4174 7.87175 17.7276 7 16.9992C4.72535 15.0986 3 13.0432 3 10.2126C3 5.49901 8.17524 2.53121 11.8579 5.8666C11.9374 5.93865 12.0626 5.93865 12.1421 5.8666C15.8248 2.53121 21 5.499 21 10.2126Z" fill="currentColor"/>' +
    '</svg>'
  return (
    `<button type="button" class="catalogue-new-favourite" data-product-slug="${safe}" aria-pressed="false" aria-label="Добавить в избранное">` +
    `<span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--empty" aria-hidden="true">${iconEmpty}</span>` +
    `<span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--full" aria-hidden="true">${iconFull}</span>` +
    '</button>'
  )
}

export function buildCatalogueCardHtml(item: CatalogProduct): string {
  const name = escapeHtml(item.name || '')
  const heightCm = Number(item.heightCm || 0)
  const maxLoadKg = Number(item.maxLoadKg || 0)
  const collectionSlug = item.collectionSlug || item.slug || ''
  const productSlug = String(item.slug || collectionSlug || '').trim() || 'product'
  const firmness = item.firmness || 'medium'
  const mattressType = item.mattressType || 'nospring'
  const imageUrl = escapeHtml(item.imageUrl || '')
  const imageAlt = escapeHtml(item.imageAlt || `Коллекция ${item.name || ''}`)
  const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean).slice(0, 3) : []
  const loadRange = String(item.loadRange || '').trim()
  const heightRange = String(item.heightRange || '').trim()
  const sizesFromItem = Array.isArray(item.sizes) ? filterStandardMattressSizes(item.sizes) : []
  const sizesFromLegacy = (() => {
    const widths = Array.isArray(item.widths) ? item.widths.map((value) => String(value)) : []
    const lengths = Array.isArray(item.lengths) ? item.lengths.map((value) => String(value)) : []
    return [...buildStandardMattressSizesFromLegacy(widths.join(','), lengths.join(','))]
  })()
  const sizes = sizesFromItem.length
    ? sizesFromItem
    : (sizesFromLegacy.length ? sizesFromLegacy : [...STANDARD_MATTRESS_SIZES])
  const fillings = Array.isArray(item.fillings) ? item.fillings.map((value) => String(value)) : []
  const features = Array.isArray(item.features) ? item.features.map((value) => String(value)) : []

  return `
      <article class="catalogue-new-card"
        data-product-slug="${escapeHtml(productSlug)}"
        data-collection="${escapeHtml(collectionSlug)}"
        data-firmness="${escapeHtml(firmness)}"
        data-type="${escapeHtml(mattressType)}"
        data-height="${heightCm}"
        data-load="${maxLoadKg}"
        data-load-range="${escapeHtml(loadRange)}"
        data-height-range="${escapeHtml(heightRange)}"
        data-sizes="${escapeHtml(sizes.join(','))}"
        data-fillings="${escapeHtml(fillings.join(','))}"
        data-features="${escapeHtml(features.join(','))}">
        <picture>
          <img src="${imageUrl}" alt="${imageAlt}" />
        </picture>
        <div class="catalogue-new-card-body">
          <h3>${name}</h3>
          <p class="catalogue-new-meta">
            ${buildMetaLine('Высота', `${heightCm}см`)}
            ${buildMetaLine('Нагрузка', `до ${maxLoadKg} кг`)}
          </p>
          <div class="catalogue-new-tags-row">
            <div class="catalogue-new-tags">
            ${tags.map((tag) => `<span class="catalogue-new-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            ${buildCatalogueFavouriteButton(productSlug)}
          </div>
        </div>
      </article>
    `
}
