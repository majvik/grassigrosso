export type CatalogModalHandlers = {
  close: () => void
  hide?: () => void
  show?: () => void
  /** Close without restoring a suspended modal underneath (overlay dismissed). */
  dismiss?: () => void
}

type CatalogModalEntry = {
  modal: HTMLElement
  handlers: CatalogModalHandlers
}

const catalogModals = new Map<string, CatalogModalEntry>()
const suspendStack: string[] = []

export function registerCatalogModal(id: string, modal: HTMLElement, handlers: CatalogModalHandlers): void {
  catalogModals.set(id, { modal, handlers })
}

function isModalVisible(id: string): boolean {
  const entry = catalogModals.get(id)
  return Boolean(entry && !entry.modal.hasAttribute('hidden'))
}

function getVisibleModalId(exceptId?: string): string | null {
  for (const [id, entry] of catalogModals) {
    if (id === exceptId) continue
    if (!entry.modal.hasAttribute('hidden')) return id
  }
  return null
}

export function clearSuspendedCatalogModals(): void {
  while (suspendStack.length) {
    const id = suspendStack.pop()
    if (!id) continue
    catalogModals.get(id)?.handlers.close()
  }
}

/** Hide the currently visible modal (keep state) before opening an overlay layer. */
export function prepareCatalogModalLayer(activeId: string): void {
  const visibleId = getVisibleModalId(activeId)
  if (!visibleId) return

  const visible = catalogModals.get(visibleId)
  if (!visible) return

  if (visible.handlers.hide) {
    visible.handlers.hide()
    suspendStack.push(visibleId)
    return
  }

  visible.handlers.dismiss?.() ?? visible.handlers.close()
}

/** Close overlay layer and restore the modal that was hidden underneath, if any. */
export function finishCatalogModalLayer(
  cleanup: () => void,
  unlockScroll?: () => void,
): void {
  cleanup()

  const restoreId = suspendStack.pop()
  if (restoreId && catalogModals.get(restoreId)?.handlers.show) {
    catalogModals.get(restoreId)?.handlers.show?.()
    return
  }

  unlockScroll?.()
  if (!getVisibleModalId()) {
    document.body.classList.remove('modal-open')
  }
}

/** Close overlay without restoring suspended modals; fully teardown suspended stack. */
export function abandonCatalogModalLayer(cleanup: () => void, unlockScroll?: () => void): void {
  cleanup()
  clearSuspendedCatalogModals()
  unlockScroll?.()
  if (!getVisibleModalId()) {
    document.body.classList.remove('modal-open')
  }
}

/** Opening a primary modal (product): dismiss overlays and any suspended state. */
export function resetCatalogModalLayersBeforePrimaryOpen(): void {
  for (const id of ['filter-help', 'favourites-clear']) {
    if (!isModalVisible(id)) continue
    const entry = catalogModals.get(id)
    entry?.handlers.dismiss?.() ?? entry?.handlers.close()
  }
  clearSuspendedCatalogModals()
}

export function removeCatalogModalFromSuspendStack(id: string): void {
  const index = suspendStack.lastIndexOf(id)
  if (index >= 0) suspendStack.splice(index, 1)
}
