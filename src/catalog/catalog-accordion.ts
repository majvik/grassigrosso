export function setCatalogAccordionGroupExpanded(groupEl: Element | null, expanded: boolean): void {
  if (!groupEl) return
  const trigger = groupEl.querySelector('.catalogue-new-filter-accordion-trigger')
  const panel = groupEl.querySelector<HTMLElement>('.catalogue-new-filter-accordion-panel')
  if (!trigger || !panel) return
  trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false')
  panel.hidden = !expanded
}

export function openCatalogAccordionGroupExclusive(sidebar: Element, groupElToOpen: Element): void {
  sidebar.querySelectorAll('.catalogue-new-filter-group').forEach((groupEl) => {
    setCatalogAccordionGroupExpanded(groupEl, groupEl === groupElToOpen)
  })
}

/** Одна открытая секция: первая с aria-expanded=true в разметке, иначе первая с триггером. */
export function initCatalogExclusiveAccordionState(sidebar: Element): void {
  const groups = [...sidebar.querySelectorAll('.catalogue-new-filter-group')]
  const accordionGroups = groups.filter((groupEl) => groupEl.querySelector('.catalogue-new-filter-accordion-trigger'))
  if (accordionGroups.length === 0) return
  const firstExpanded =
    accordionGroups.find((groupEl) => {
      const trigger = groupEl.querySelector('.catalogue-new-filter-accordion-trigger')
      return trigger?.getAttribute('aria-expanded') === 'true'
    }) || accordionGroups[0]
  openCatalogAccordionGroupExclusive(sidebar, firstExpanded)
}
