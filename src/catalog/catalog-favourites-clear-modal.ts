export type CatalogFavouritesClearModalElements = {
  modal: HTMLElement
  overlay: HTMLElement
  openTrigger: HTMLElement | null
  cancelBtn: HTMLButtonElement | null
  confirmBtn: HTMLButtonElement | null
  titleEl?: HTMLElement | null
  textEl?: HTMLElement | null
}

export type CatalogFavouritesClearModalOptions = {
  lockScroll?: () => void
  unlockScroll?: () => void
  onConfirm: (context: CatalogFavouritesClearModalContext) => void
  getFavouritesCount: () => number
}

export type CatalogFavouritesClearModalContext =
  | { mode: 'clear' }
  | { mode: 'remove-position'; slug: string; isLast?: boolean }

export function initCatalogFavouritesClearModal(
  elements: CatalogFavouritesClearModalElements,
  options: CatalogFavouritesClearModalOptions,
): void {
  const { modal, overlay, openTrigger, cancelBtn, confirmBtn } = elements
  if (!modal || !overlay || !confirmBtn) return
  let context: CatalogFavouritesClearModalContext = { mode: 'clear' }
  const defaultTitle = elements.titleEl?.textContent || 'Очистить избранное?'
  const defaultText = elements.textEl?.textContent || 'Все позиции будут удалены из списка. Это действие нельзя отменить.'
  const defaultConfirm = confirmBtn.textContent || 'Очистить'

  const renderContent = (): void => {
    if (context.mode === 'remove-position') {
      if (elements.titleEl) elements.titleEl.textContent = 'Удалить позицию?'
      if (elements.textEl) {
        elements.textEl.textContent = context.isLast
          ? 'Это последняя позиция. После удаления вся подборка будет удалена, и вы вернётесь в каталог.'
          : 'Позиция будет удалена из этой подборки. После изменения нужно скопировать ссылку заново.'
      }
      confirmBtn.textContent = 'Удалить'
      return
    }
    if (elements.titleEl) elements.titleEl.textContent = defaultTitle
    if (elements.textEl) elements.textEl.textContent = defaultText
    confirmBtn.textContent = defaultConfirm
  }

  const close = (): void => {
    modal.setAttribute('hidden', '')
    options.unlockScroll?.()
    document.body.classList.remove('modal-open')
    context = { mode: 'clear' }
    renderContent()
  }

  const open = (nextContext: CatalogFavouritesClearModalContext = { mode: 'clear' }): void => {
    if (nextContext.mode === 'clear' && options.getFavouritesCount() <= 0) return
    context = nextContext
    renderContent()
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
    options.onConfirm(context)
    close()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (modal.hasAttribute('hidden')) return
    close()
  })

  window.addEventListener('catalogue:confirm-remove-position', (event) => {
    const ce = event as CustomEvent<{ slug?: string; isLast?: boolean }>
    const slug = String(ce.detail?.slug || '').trim()
    if (!slug) return
    open({ mode: 'remove-position', slug, isLast: Boolean(ce.detail?.isLast) })
  })
}
