export type CatalogFavouritesClearModalElements = {
  modal: HTMLElement
  overlay: HTMLElement
  openTrigger: HTMLElement | null
  cancelBtn: HTMLButtonElement | null
  confirmBtn: HTMLButtonElement | null
}

export type CatalogFavouritesClearModalOptions = {
  lockScroll?: () => void
  unlockScroll?: () => void
  onConfirm: () => void
  getFavouritesCount: () => number
}

export function initCatalogFavouritesClearModal(
  elements: CatalogFavouritesClearModalElements,
  options: CatalogFavouritesClearModalOptions,
): void {
  const { modal, overlay, openTrigger, cancelBtn, confirmBtn } = elements
  if (!modal || !overlay || !confirmBtn) return

  const close = (): void => {
    modal.setAttribute('hidden', '')
    options.unlockScroll?.()
    document.body.classList.remove('modal-open')
  }

  const open = (): void => {
    if (options.getFavouritesCount() <= 0) return
    modal.removeAttribute('hidden')
    options.lockScroll?.()
    document.body.classList.add('modal-open')
  }

  openTrigger?.addEventListener('click', (event) => {
    event.preventDefault()
    open()
  })

  overlay.addEventListener('click', close)
  cancelBtn?.addEventListener('click', close)

  confirmBtn.addEventListener('click', () => {
    options.onConfirm()
    close()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (modal.hasAttribute('hidden')) return
    close()
  })
}
