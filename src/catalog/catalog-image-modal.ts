import { readCatalogFavourites, writeCatalogFavourites } from './catalog-favourites'
import { emitCatalogManagerContactIntent } from './catalog-favourites-ui'
import { buildCatalogModalSpecs } from './catalog-modal'

export type CatalogImageModalElements = {
  modal: HTMLElement
  image: HTMLImageElement
  title: HTMLElement
  specs: HTMLElement
  specsEmpty: HTMLElement
  contactBtn: HTMLButtonElement
  favouriteBtn: HTMLButtonElement
  closeBtn: HTMLElement | null
  cardsRoot: Element
}

export type CatalogImageModalOptions = {
  lockScroll?: () => void
  unlockScroll?: () => void
}

function appendModalSpec(specsRoot: HTMLElement, label: string, value: string): void {
  if (!value) return
  const row = document.createElement('div')
  row.className = 'catalogue-new-image-modal-spec'
  const labelEl = document.createElement('span')
  labelEl.className = 'catalogue-new-image-modal-spec-label'
  labelEl.textContent = label
  const valueEl = document.createElement('span')
  valueEl.className = 'catalogue-new-image-modal-spec-value'
  valueEl.textContent = value
  row.append(labelEl, valueEl)
  specsRoot.appendChild(row)
}

export function initCatalogImageModal(
  elements: CatalogImageModalElements,
  options: CatalogImageModalOptions = {},
): void {
  let activeModalProductSlug = ''
  let activeModalProductTitle = ''

  const clearModalSpecs = (): void => {
    elements.specs.replaceChildren()
    elements.specsEmpty.hidden = true
  }

  const syncModalFavouriteState = (): void => {
    const favSet = readCatalogFavourites()
    const isActive = Boolean(activeModalProductSlug && favSet.has(activeModalProductSlug))
    elements.favouriteBtn.classList.toggle('is-active', isActive)
    elements.favouriteBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false')
    elements.favouriteBtn.setAttribute('aria-label', isActive ? 'Удалить из избранного' : 'Добавить в избранное')
  }

  const closeCatalogueImageModal = (): void => {
    elements.modal.setAttribute('hidden', '')
    elements.image.setAttribute('src', '')
    elements.image.setAttribute('alt', '')
    elements.title.textContent = ''
    activeModalProductSlug = ''
    activeModalProductTitle = ''
    syncModalFavouriteState()
    clearModalSpecs()
    options.unlockScroll?.()
    document.body.classList.remove('modal-open')
  }

  const openCatalogueImageModal = (card: Element | null): void => {
    if (!card || !(card instanceof HTMLElement)) return
    const image = card.querySelector('picture img')
    const src = image?.getAttribute('src') || ''
    const alt = image?.getAttribute('alt') || ''
    const title = card.querySelector('.catalogue-new-card-body h3')?.textContent?.trim() || alt
    if (!src) return

    const dataset = card.dataset || {}
    activeModalProductSlug = String(dataset.productSlug || '').trim()
    activeModalProductTitle = title || 'Матрас'
    syncModalFavouriteState()

    elements.image.setAttribute('src', src)
    elements.image.setAttribute('alt', alt || '')
    elements.title.textContent = title || 'Матрас'
    clearModalSpecs()
    buildCatalogModalSpecs(dataset).forEach((spec) => {
      appendModalSpec(elements.specs, spec.label, spec.value)
    })
    if (!elements.specs.childElementCount) {
      elements.specsEmpty.hidden = false
    }
    elements.modal.removeAttribute('hidden')
    options.lockScroll?.()
    document.body.classList.add('modal-open')
  }

  elements.contactBtn.addEventListener('click', () => {
    if (!activeModalProductSlug) return
    emitCatalogManagerContactIntent({
      source: 'modal-position',
      slugs: [activeModalProductSlug],
      title: activeModalProductTitle,
    })
  })

  elements.favouriteBtn.addEventListener('click', () => {
    if (!activeModalProductSlug) return
    const favSet = readCatalogFavourites()
    if (favSet.has(activeModalProductSlug)) favSet.delete(activeModalProductSlug)
    else favSet.add(activeModalProductSlug)
    writeCatalogFavourites(favSet)
    window.dispatchEvent(new CustomEvent('catalogue:favourites-updated'))
    syncModalFavouriteState()
  })

  window.addEventListener('catalogue:favourites-updated', syncModalFavouriteState)

  elements.cardsRoot.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    if (event.target.closest('.catalogue-new-favourite')) return
    const card = event.target.closest('.catalogue-new-card')
    if (!card) return
    openCatalogueImageModal(card)
  })

  if (elements.closeBtn) {
    elements.closeBtn.addEventListener('click', (event) => {
      event.stopPropagation()
      closeCatalogueImageModal()
    })
  }

  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) closeCatalogueImageModal()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.modal.hasAttribute('hidden')) {
      closeCatalogueImageModal()
    }
  })
}
