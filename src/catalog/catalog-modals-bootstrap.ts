import { readCatalogFavourites, writeCatalogFavourites } from './catalog-favourites'
import { initCatalogFavouritesClearModal } from './catalog-favourites-clear-modal'
import { initCatalogFilterHelpModal } from './catalog-filter-help-modal'

interface ScrollOptions {
  lockScroll?: () => void
  unlockScroll?: () => void
}

function queryElement<T extends HTMLElement>(root: Document, id: string): T | null {
  return root.getElementById(id) as T | null
}

export function initCatalogModals(documentRef: Document, scrollOptions: ScrollOptions = {}) {
  const catalogueFilterHelpModal = queryElement<HTMLElement>(documentRef, 'catalogueFilterHelpModal')
  const catalogueFilterHelpModalOverlay = queryElement<HTMLElement>(documentRef, 'catalogueFilterHelpModalOverlay')
  const catalogueFilterHelpModalTitle = queryElement<HTMLElement>(documentRef, 'catalogueFilterHelpModalTitle')
  const catalogueFilterHelpModalBody = queryElement<HTMLElement>(documentRef, 'catalogueFilterHelpModalBody')
  const catalogueFilterHelpModalClose = queryElement<HTMLButtonElement>(documentRef, 'catalogueFilterHelpModalClose')
  if (
    catalogueFilterHelpModal &&
    catalogueFilterHelpModalOverlay &&
    catalogueFilterHelpModalTitle &&
    catalogueFilterHelpModalBody
  ) {
    initCatalogFilterHelpModal(
      documentRef,
      {
        modal: catalogueFilterHelpModal,
        overlay: catalogueFilterHelpModalOverlay,
        title: catalogueFilterHelpModalTitle,
        body: catalogueFilterHelpModalBody,
        closeBtn: catalogueFilterHelpModalClose,
      },
      scrollOptions,
    )
  }

  const catalogueFavouritesClearModal = queryElement<HTMLElement>(documentRef, 'catalogueFavouritesClearModal')
  const catalogueFavouritesClearModalOverlay = queryElement<HTMLElement>(documentRef, 'catalogueFavouritesClearModalOverlay')
  const catalogueFavouritesClearModalTitle = queryElement<HTMLElement>(documentRef, 'catalogueFavouritesClearModalTitle')
  const catalogueFavouritesClearModalText = documentRef.querySelector<HTMLElement>('.catalogue-new-favourites-clear-modal-text')
  const catalogueFavouritesClearModalCancel = queryElement<HTMLButtonElement>(documentRef, 'catalogueFavouritesClearModalCancel')
  const catalogueFavouritesClearModalClose = queryElement<HTMLButtonElement>(documentRef, 'catalogueFavouritesClearModalClose')
  const catalogueFavouritesClearModalConfirm = queryElement<HTMLButtonElement>(documentRef, 'catalogueFavouritesClearModalConfirm')
  const catalogueNewFavouritesClearAllBtn = queryElement<HTMLElement>(documentRef, 'catalogue-new-favourites-clear-all')
  if (
    catalogueFavouritesClearModal &&
    catalogueFavouritesClearModalOverlay &&
    catalogueFavouritesClearModalConfirm
  ) {
    initCatalogFavouritesClearModal(
      {
        modal: catalogueFavouritesClearModal,
        overlay: catalogueFavouritesClearModalOverlay,
        openTrigger: catalogueNewFavouritesClearAllBtn,
        cancelBtn: catalogueFavouritesClearModalCancel,
        closeBtn: catalogueFavouritesClearModalClose,
        confirmBtn: catalogueFavouritesClearModalConfirm,
        titleEl: catalogueFavouritesClearModalTitle,
        textEl: catalogueFavouritesClearModalText,
      },
      {
        ...scrollOptions,
        getFavouritesCount: () => readCatalogFavourites().size,
        onConfirm: (context) => {
          if (context.mode === 'remove-position') {
            window.dispatchEvent(new CustomEvent('catalogue:remove-shared-position-confirmed', {
              detail: { slug: context.slug },
            }))
            return
          }
          writeCatalogFavourites(new Set())
          window.dispatchEvent(new CustomEvent('catalogue:favourites-updated'))
        },
      },
    )
  }
}
