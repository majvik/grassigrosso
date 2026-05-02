export type CatalogSortMenuElements = {
  root: Element | null
  trigger: Element | null
  options: Element[]
}

function getSortMenu(root: Element | null): HTMLElement | null {
  return root?.querySelector<HTMLElement>('.catalogue-new-sort-menu') || null
}

export function setCatalogActiveSortOption(
  elements: CatalogSortMenuElements,
  value: string,
  fallbackLabel = 'Сортировка по умолчанию',
): void {
  const activeOption = elements.options.find((option) => option instanceof HTMLElement && option.dataset.value === value)
  if (elements.trigger && activeOption) {
    elements.trigger.textContent = activeOption.textContent || fallbackLabel
  }
  elements.options.forEach((option) => {
    if (!(option instanceof HTMLElement)) return
    option.classList.toggle('is-active', option.dataset.value === value)
  })
}

export function closeCatalogSortMenu(elements: CatalogSortMenuElements): void {
  if (!elements.root || !elements.trigger) return
  elements.root.classList.remove('is-open')
  elements.trigger.setAttribute('aria-expanded', 'false')
  const menu = getSortMenu(elements.root)
  if (menu) menu.hidden = true
}

export function openCatalogSortMenu(elements: CatalogSortMenuElements): void {
  if (!elements.root || !elements.trigger) return
  elements.root.classList.add('is-open')
  elements.trigger.setAttribute('aria-expanded', 'true')
  const menu = getSortMenu(elements.root)
  if (menu) menu.hidden = false
}

export function toggleCatalogSortMenu(elements: CatalogSortMenuElements): void {
  if (!elements.root) return
  if (elements.root.classList.contains('is-open')) {
    closeCatalogSortMenu(elements)
  } else {
    openCatalogSortMenu(elements)
  }
}
