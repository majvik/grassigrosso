import { initCatalogViewToggle } from './catalog-view-toggle'
import { initCatalogListingController } from './catalog-listing-controller'
import { initCatalogModals } from './catalog-modals-bootstrap'

export function initCataloguePage({ lockScroll, unlockScroll } = {}) {
  initCatalogListingController(document, {
    lockScroll: typeof lockScroll === 'function' ? lockScroll : undefined,
    unlockScroll: typeof unlockScroll === 'function' ? unlockScroll : undefined,
  })

  const catalogueNewViewButtons = document.querySelectorAll('.catalogue-new-view-btn')
  if (catalogueNewViewButtons.length > 0) {
    initCatalogViewToggle([...catalogueNewViewButtons], document.querySelector('.catalogue-new-cards'))
  }
  initCatalogModals(document, {
    lockScroll: typeof lockScroll === 'function' ? lockScroll : undefined,
    unlockScroll: typeof unlockScroll === 'function' ? unlockScroll : undefined,
  })
}
