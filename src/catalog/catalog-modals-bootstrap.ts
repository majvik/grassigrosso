import { readCatalogFavourites, writeCatalogFavourites } from './catalog-favourites'
import { initCatalogFavouritesClearModal } from './catalog-favourites-clear-modal'
import { initCatalogFilterHelpModal } from './catalog-filter-help-modal'
import { initCatalogImageModal } from './catalog-image-modal'

interface ScrollOptions {
  lockScroll?: () => void
  unlockScroll?: () => void
}

function queryElement<T extends HTMLElement>(root: Document, id: string): T | null {
  return root.getElementById(id) as T | null
}

export function initCatalogModals(documentRef: Document, scrollOptions: ScrollOptions = {}) {
  const catalogueImageModal = queryElement<HTMLElement>(documentRef, 'catalogueImageModal')
  const catalogueImageModalDialog = queryElement<HTMLElement>(documentRef, 'catalogueImageModalDialog')
  const catalogueImageModalPreview = queryElement<HTMLElement>(documentRef, 'catalogueImageModalPreview')
  const catalogueImageModalContactView = queryElement<HTMLElement>(documentRef, 'catalogueImageModalContactView')
  const catalogueImageModalContactForm = queryElement<HTMLFormElement>(documentRef, 'catalogueImageModalContactForm')
  const catalogueImageModalContactHeading = queryElement<HTMLElement>(documentRef, 'catalogueImageModalContactHeading')
  const catalogueImageModalContactBack = queryElement<HTMLButtonElement>(documentRef, 'catalogueImageModalContactBack')
  const catalogueImageModalPositionsList = queryElement<HTMLElement>(documentRef, 'catalogueImageModalPositionsList')
  const catalogueImageModalPositionsCount = queryElement<HTMLElement>(documentRef, 'catalogueImageModalPositionsCount')
  const catalogueImageModalImg = queryElement<HTMLImageElement>(documentRef, 'catalogueImageModalImg')
  const catalogueImageModalTitle = queryElement<HTMLElement>(documentRef, 'catalogueImageModalTitle')
  const catalogueImageModalSpecs = queryElement<HTMLElement>(documentRef, 'catalogueImageModalSpecs')
  const catalogueImageModalSpecsEmpty = queryElement<HTMLElement>(documentRef, 'catalogueImageModalSpecsEmpty')
  const catalogueImageModalContactBtn = queryElement<HTMLButtonElement>(documentRef, 'catalogueImageModalContactBtn')
  const catalogueImageModalFavouriteBtn = queryElement<HTMLButtonElement>(documentRef, 'catalogueImageModalFavouriteBtn')
  const catalogueImageModalClose = queryElement<HTMLElement>(documentRef, 'catalogueImageModalClose')
  const catalogueCardsRootForModal = documentRef.querySelector('.catalogue-new-cards')

  if (
    catalogueImageModal &&
    catalogueImageModalDialog &&
    catalogueImageModalPreview &&
    catalogueImageModalContactView &&
    catalogueImageModalContactForm &&
    catalogueImageModalContactHeading &&
    catalogueImageModalContactBack &&
    catalogueImageModalPositionsList &&
    catalogueImageModalPositionsCount &&
    catalogueImageModalImg &&
    catalogueImageModalTitle &&
    catalogueImageModalSpecs &&
    catalogueImageModalSpecsEmpty &&
    catalogueImageModalContactBtn &&
    catalogueImageModalFavouriteBtn &&
    catalogueCardsRootForModal
  ) {
    initCatalogImageModal(
      {
        modal: catalogueImageModal,
        dialog: catalogueImageModalDialog,
        previewRoot: catalogueImageModalPreview,
        contactRoot: catalogueImageModalContactView,
        contactForm: catalogueImageModalContactForm,
        contactHeading: catalogueImageModalContactHeading,
        contactBackBtn: catalogueImageModalContactBack,
        positionsList: catalogueImageModalPositionsList,
        positionsCount: catalogueImageModalPositionsCount,
        image: catalogueImageModalImg,
        title: catalogueImageModalTitle,
        specs: catalogueImageModalSpecs,
        specsEmpty: catalogueImageModalSpecsEmpty,
        contactBtn: catalogueImageModalContactBtn,
        favouriteBtn: catalogueImageModalFavouriteBtn,
        closeBtn: catalogueImageModalClose,
        cardsRoot: catalogueCardsRootForModal,
      },
      scrollOptions,
    )
  }

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
  const catalogueFavouritesClearModalCancel = queryElement<HTMLButtonElement>(documentRef, 'catalogueFavouritesClearModalCancel')
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
        confirmBtn: catalogueFavouritesClearModalConfirm,
      },
      {
        ...scrollOptions,
        getFavouritesCount: () => readCatalogFavourites().size,
        onConfirm: () => {
          writeCatalogFavourites(new Set())
          window.dispatchEvent(new CustomEvent('catalogue:favourites-updated'))
        },
      },
    )
  }
}
