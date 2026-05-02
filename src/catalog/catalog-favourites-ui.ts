export type CatalogFavouritesUiElements = {
  cardsRoot: Element
  switchEl: HTMLButtonElement | null
  countEl: HTMLElement | null
  linkEl: HTMLElement | null
  contactBtn: HTMLButtonElement | null
  shareBtn: HTMLButtonElement | null
  actionsEl: HTMLElement | null
}

export type CatalogFavouritesControlsSyncResult = {
  favouritesOnly: boolean
  shouldReapplyFilters: boolean
}

export function setCatalogFavouritesSwitchState(switchEl: Element | null, isOn: boolean): void {
  if (!switchEl) return
  switchEl.classList.toggle('is-on', isOn)
  switchEl.setAttribute('aria-checked', isOn ? 'true' : 'false')
}

export function syncCatalogFavouriteButtons(cardsRoot: Element, favourites: Set<string>): void {
  cardsRoot.querySelectorAll<HTMLElement>('.catalogue-new-favourite').forEach((btn) => {
    const slug = String(btn.dataset.productSlug || '')
    const on = Boolean(slug && favourites.has(slug))
    btn.classList.toggle('is-active', on)
    btn.setAttribute('aria-pressed', on ? 'true' : 'false')
    btn.setAttribute('aria-label', on ? 'Удалить из избранного' : 'Добавить в избранное')
  })
}

export function syncCatalogFavouritesControls(
  elements: CatalogFavouritesUiElements,
  favouritesCount: number,
  favouritesOnly: boolean,
): CatalogFavouritesControlsSyncResult {
  if (elements.countEl) {
    elements.countEl.textContent = String(favouritesCount)
    elements.countEl.toggleAttribute('hidden', favouritesCount === 0)
  }

  if (favouritesCount === 0) {
    setCatalogFavouritesSwitchState(elements.switchEl, false)
    if (elements.switchEl) elements.switchEl.disabled = true
    if (elements.linkEl) {
      elements.linkEl.classList.add('is-disabled')
      elements.linkEl.setAttribute('aria-disabled', 'true')
      elements.linkEl.tabIndex = -1
    }
    if (elements.contactBtn) elements.contactBtn.disabled = true
    if (elements.shareBtn) elements.shareBtn.disabled = true
    if (elements.actionsEl) elements.actionsEl.hidden = true

    return {
      favouritesOnly: false,
      shouldReapplyFilters: favouritesOnly,
    }
  }

  if (elements.switchEl) elements.switchEl.disabled = false
  if (elements.linkEl) {
    elements.linkEl.classList.remove('is-disabled')
    elements.linkEl.removeAttribute('aria-disabled')
    elements.linkEl.removeAttribute('tabindex')
  }
  if (elements.contactBtn) elements.contactBtn.disabled = false
  if (elements.shareBtn) elements.shareBtn.disabled = false

  return {
    favouritesOnly,
    shouldReapplyFilters: false,
  }
}

export function emitCatalogManagerContactIntent(detail: unknown): void {
  const source =
    detail && typeof detail === 'object' && 'source' in detail
      ? String((detail as { source?: unknown }).source || 'unknown')
      : 'unknown'
  const slugs =
    detail && typeof detail === 'object' && 'slugs' in detail && Array.isArray((detail as { slugs?: unknown }).slugs)
      ? (detail as { slugs: unknown[] }).slugs.filter(Boolean)
      : []
  const title =
    detail && typeof detail === 'object' && 'title' in detail
      ? String((detail as { title?: unknown }).title || '').trim()
      : ''

  window.dispatchEvent(new CustomEvent('catalogue:contact-manager', { detail: { source, slugs, title } }))
}

export function emitCatalogShareIntent(detail: { source: string; slugs: string[]; title: string }): void {
  window.dispatchEvent(new CustomEvent('catalogue:share', { detail }))
}
