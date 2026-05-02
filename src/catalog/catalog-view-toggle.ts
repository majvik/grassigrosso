export function initCatalogViewToggle(buttons: Element[], cardsRoot: Element | null): void {
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => {
        const isActive = item === button
        item.classList.toggle('is-active', isActive)
        item.setAttribute('aria-pressed', isActive ? 'true' : 'false')
      })

      if (button instanceof HTMLElement && cardsRoot) {
        cardsRoot.classList.toggle('is-list-view', button.dataset.view === 'list')
      }
    })
  })
}
