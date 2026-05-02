export type CatalogMobileFiltersElements = {
  sidebar: Element | null
  overlay: HTMLElement | null
}

export type CatalogMobileFiltersOptions = {
  desktopBreakpoint?: number
  lockScroll?: () => void
  unlockScroll?: () => void
}

export function openCatalogMobileFiltersDrawer(
  elements: CatalogMobileFiltersElements,
  options: CatalogMobileFiltersOptions = {},
): void {
  if (!elements.sidebar || !elements.overlay) return
  if (window.innerWidth > (options.desktopBreakpoint ?? 1024)) return
  elements.sidebar.classList.add('is-open')
  elements.overlay.hidden = false
  options.lockScroll?.()
}

export function closeCatalogMobileFiltersDrawer(
  elements: CatalogMobileFiltersElements,
  options: CatalogMobileFiltersOptions = {},
): void {
  if (!elements.sidebar || !elements.overlay) return
  elements.sidebar.classList.remove('is-open')
  elements.overlay.hidden = true
  options.unlockScroll?.()
}
