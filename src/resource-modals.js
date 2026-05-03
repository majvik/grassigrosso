const CATALOG_MESSAGES = {
  boxspring: 'Если вы хотите получить каталог Boxspring, укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  accessories: 'Если вы хотите получить каталог аксессуаров, укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  classic: 'Если вы хотите получить каталог коллекции Classic (Классик), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  flexi: 'Если вы хотите получить каталог коллекции Flexi (Флекси), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  relax: 'Если вы хотите получить каталог коллекции Relax (Релакс), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  trend: 'Если вы хотите получить каталог коллекции Trend (Тренд), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  'viva-natura': 'Если вы хотите получить каталог коллекции Viva Natura (Вива Натура), укажите ваше имя, телефон и e-mail – мы направим каталог на указанный адрес.',
  consultation: 'Мы можем изготовить матрасы и аксессуары по вашим индивидуальным требованиям и размерам. Свяжитесь с нами для обсуждения проекта.',
}

const CATALOG_TITLES = {
  consultation: 'Не нашли то, что искали?',
}

const CATALOG_LABELS = {
  boxspring: 'Boxspring',
  accessories: 'Аксессуары',
  classic: 'Classic (Классик)',
  flexi: 'Flexi (Флекси)',
  relax: 'Relax (Релакс)',
  trend: 'Trend (Тренд)',
  'viva-natura': 'Viva Natura (Вива Натура)',
  consultation: 'Запрос консультации (индивидуальные требования)',
}

const DOCUMENT_REQUEST_MESSAGES = {
  declaration: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.',
  certificate: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.',
  trademark: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.',
  catalog: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.',
  presentation: 'Укажите имя, телефон и e-mail – после отправки заявки вам будет доступна ссылка для скачивания документа.',
}

const DOCUMENT_REQUEST_FILES = {
  declaration: 'Декларация.pdf',
  certificate: 'СертификатСоответствия.pdf',
  trademark: 'СвидетельствоНаТоварныйЗнак.pdf',
  catalog: 'Catalog_v1.2.pdf',
  presentation: 'Grassigrosso-company.pdf',
}

const DOCUMENT_LABELS = {
  declaration: 'Декларация о соответствии',
  certificate: 'Сертификат соответствия «ПромТехСтандарт»',
  trademark: 'Свидетельство на товарный знак GrassiGrosso',
}

function showInlineNotification(container, type, message) {
  if (!container || !container.parentElement) return
  const notification = document.createElement('div')
  notification.className = `form-notification form-notification-${type}`
  notification.textContent = message
  container.parentElement.insertBefore(notification, container)
  if (type === 'error') {
    setTimeout(() => notification.remove(), 5000)
  }
}

function getApiUrl() {
  return import.meta.env.VITE_API_URL || '/api/submit'
}

async function submitLead({ payload, submitBtn, onSuccess, errorContainer, successMessage }) {
  const originalText = submitBtn?.textContent
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = 'Отправка...'
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)

  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      showInlineNotification(errorContainer, 'error', data.error || data.details || 'Ошибка отправки. Попробуйте позже.')
      return
    }

    if (successMessage) {
      showInlineNotification(errorContainer, 'success', successMessage)
    }

    onSuccess?.()
  } catch (error) {
    clearTimeout(timeoutId)
    showInlineNotification(
      errorContainer,
      'error',
      error.name === 'AbortError'
        ? 'Превышено время ожидания ответа от сервера. Попробуйте позже.'
        : 'Не удалось отправить заявку. Проверьте подключение к интернету.',
    )
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = originalText
    }
  }
}

export function initResourceModals({ lockScroll, unlockScroll, ensureVideoSource }) {
  const videoModal = document.getElementById('videoModal')
  const modalClose = videoModal?.querySelector('.modal-close')

  function isMobileView() {
    return window.innerWidth <= 768
  }

  function getActiveModalVideo() {
    if (!videoModal) return null
    const mobile = videoModal.querySelector('.modal-video--mobile')
    const desktop = videoModal.querySelector('.modal-video--desktop')
    if (mobile && desktop) return isMobileView() ? mobile : desktop
    return videoModal.querySelector('.modal-video')
  }

  function pauseAllModalVideos() {
    if (!videoModal) return
    videoModal.querySelectorAll('.modal-video').forEach((video) => {
      video.pause()
      video.currentTime = 0
    })
  }

  function openVideoModal() {
    if (!videoModal) return
    const modalVideo = getActiveModalVideo()
    if (!modalVideo) return
    pauseAllModalVideos()
    ensureVideoSource(modalVideo)
    videoModal.classList.add('active')
    lockScroll()
    modalVideo.currentTime = 0
    modalVideo.play().catch(() => {})
  }

  function closeVideoModal() {
    if (!videoModal) return
    videoModal.classList.remove('active')
    unlockScroll()
    pauseAllModalVideos()
  }

  document.querySelectorAll('#heroVideo, #qualityVideo').forEach((trigger) => {
    trigger.addEventListener('click', openVideoModal)
  })
  document.querySelectorAll('.quality-video').forEach((video) => {
    video.loop = true
  })

  if (videoModal) {
    modalClose?.addEventListener('click', (event) => {
      event.stopPropagation()
      closeVideoModal()
    })

    videoModal.addEventListener('click', (event) => {
      if (event.target === videoModal) closeVideoModal()
    })

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && videoModal.classList.contains('active')) {
        closeVideoModal()
      }
    })
  }

  const catalogRequestModal = document.getElementById('catalogRequestModal')
  const catalogRequestForm = document.getElementById('catalogRequestForm')
  const catalogRequestText = document.getElementById('catalogRequestText')
  const catalogRequestTypeInput = document.getElementById('catalogRequestType')
  const catalogRequestTitleEl = document.getElementById('catalogRequestTitle')
  const defaultModalTitle = catalogRequestTitleEl?.textContent || 'Получить каталог'

  if (catalogRequestModal && catalogRequestForm && catalogRequestText) {
    const closeCatalogRequestModal = () => {
      catalogRequestModal.classList.remove('active')
      catalogRequestModal.querySelectorAll('.form-notification').forEach((node) => node.remove())
      unlockScroll()
      document.body.classList.remove('modal-open')
    }

    const openCatalogRequestModal = (catalogType) => {
      catalogRequestModal.querySelectorAll('.form-notification').forEach((node) => node.remove())
      catalogRequestText.textContent = CATALOG_MESSAGES[catalogType] || CATALOG_MESSAGES.boxspring
      if (catalogRequestTypeInput) catalogRequestTypeInput.value = catalogType || 'boxspring'
      if (catalogRequestTitleEl) {
        catalogRequestTitleEl.textContent = CATALOG_TITLES[catalogType] || defaultModalTitle
      }
      catalogRequestModal.classList.add('active')
      lockScroll()
      document.body.classList.add('modal-open')
    }

    document.body.addEventListener('click', (event) => {
      const link = event.target.closest('[data-open-catalog]') || event.target.closest('.catalog-collection-link')
      if (!link) return
      event.preventDefault()
      const card = link.closest('.product-card') || link.closest('.catalog-collection-item') || link.closest('[data-catalog]')
      const catalogType = (card && card.dataset.catalog) || 'boxspring'
      openCatalogRequestModal(catalogType)
    })

    catalogRequestModal.querySelector('.catalog-request-close')?.addEventListener('click', (event) => {
      event.stopPropagation()
      closeCatalogRequestModal()
    })
    catalogRequestModal.addEventListener('click', (event) => {
      if (event.target === catalogRequestModal) closeCatalogRequestModal()
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && catalogRequestModal.classList.contains('active')) {
        closeCatalogRequestModal()
      }
    })

    catalogRequestForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const privacyCheck = catalogRequestForm.querySelector('#cr-privacy')
      if (privacyCheck && !privacyCheck.checked) return

      const phone = catalogRequestForm.querySelector('#cr-phone')?.value.trim()
      if (!phone) return

      const catalogType = catalogRequestTypeInput?.value || 'boxspring'
      const submitBtn = catalogRequestForm.querySelector('button[type="submit"]')
      const container = catalogRequestForm.querySelector('.catalog-request-buttons')

      await submitLead({
        payload: {
          name: catalogRequestForm.querySelector('#cr-name')?.value.trim() || 'Не указано',
          phone,
          email: catalogRequestForm.querySelector('#cr-email')?.value.trim() || '',
          comment: `Запрос каталога: ${CATALOG_LABELS[catalogType] || catalogType || 'каталог'}.`,
          page: 'Отелям (каталог)',
        },
        submitBtn,
        errorContainer: container,
        successMessage: 'Заявка отправлена! Каталог будет направлен на указанный e-mail.',
        onSuccess: () => {
          catalogRequestForm.reset()
          if (catalogRequestTypeInput) catalogRequestTypeInput.value = catalogType
          setTimeout(closeCatalogRequestModal, 5000)
        },
      })
    })
  }

  const documentRequestModal = document.getElementById('documentRequestModal')
  const documentRequestForm = document.getElementById('documentRequestForm')
  const documentRequestText = document.getElementById('documentRequestText')
  const documentRequestTypeInput = document.getElementById('documentRequestType')

  if (documentRequestModal && documentRequestForm && documentRequestText) {
    const triggerDocumentDownload = (documentType) => {
      const filename = DOCUMENT_REQUEST_FILES[documentType]
      if (!filename) return
      const base = typeof import.meta.env.BASE_URL !== 'undefined' ? import.meta.env.BASE_URL : '/'
      const url = `${base}documents/${encodeURIComponent(filename)}`
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    const closeDocumentRequestModal = () => {
      documentRequestModal.classList.remove('active')
      documentRequestModal.querySelectorAll('.form-notification').forEach((node) => node.remove())
      unlockScroll()
      document.body.classList.remove('modal-open')
    }

    const openDocumentRequestModal = (documentType) => {
      documentRequestModal.querySelectorAll('.form-notification').forEach((node) => node.remove())
      documentRequestText.textContent = DOCUMENT_REQUEST_MESSAGES[documentType] || DOCUMENT_REQUEST_MESSAGES.declaration
      if (documentRequestTypeInput) documentRequestTypeInput.value = documentType || 'declaration'
      documentRequestModal.classList.add('active')
      lockScroll()
      document.body.classList.add('modal-open')
    }

    document.body.addEventListener('click', (event) => {
      const certLink = event.target.closest('.documents-cert-download[data-request-document]')
      const certCard = event.target.closest('.documents-cert-card[data-document]')
      const commercialLink = event.target.closest('.documents-commercial-item-download[data-request-document]')
      const commercialItem = event.target.closest('.documents-commercial-item[data-document]')
      const target = certLink || certCard || commercialLink || commercialItem
      if (!target) return
      if (certLink || commercialLink) event.preventDefault()
      const card = target.closest('.documents-cert-card') || target.closest('.documents-commercial-item')
      openDocumentRequestModal((card && card.dataset.document) || 'declaration')
    })

    documentRequestModal.querySelector('.document-request-close')?.addEventListener('click', (event) => {
      event.stopPropagation()
      closeDocumentRequestModal()
    })
    documentRequestModal.addEventListener('click', (event) => {
      if (event.target === documentRequestModal) closeDocumentRequestModal()
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && documentRequestModal.classList.contains('active')) {
        closeDocumentRequestModal()
      }
    })

    documentRequestForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const privacyCheck = documentRequestForm.querySelector('#dr-privacy')
      if (privacyCheck && !privacyCheck.checked) return

      const phone = documentRequestForm.querySelector('#dr-phone')?.value.trim()
      if (!phone) return

      const documentType = documentRequestTypeInput?.value || 'declaration'
      const submitBtn = documentRequestForm.querySelector('button[type="submit"]')
      const container = documentRequestForm.querySelector('.catalog-request-buttons')

      await submitLead({
        payload: {
          name: documentRequestForm.querySelector('#dr-name')?.value.trim() || 'Не указано',
          phone,
          email: documentRequestForm.querySelector('#dr-email')?.value.trim() || '',
          comment: `Запрос документа: ${DOCUMENT_LABELS[documentType] || documentType}.`,
          page: 'Документы',
        },
        submitBtn,
        errorContainer: container,
        successMessage: 'Заявка отправлена! Начинается загрузка документа.',
        onSuccess: () => {
          documentRequestForm.reset()
          if (documentRequestTypeInput) documentRequestTypeInput.value = documentType
          triggerDocumentDownload(documentType)
          setTimeout(closeDocumentRequestModal, 5000)
        },
      })
    })
  }

  const helpDocumentsModal = document.getElementById('helpDocumentsModal')
  const helpDocumentsForm = document.getElementById('helpDocumentsForm')

  if (helpDocumentsModal && helpDocumentsForm) {
    const closeHelpDocumentsModal = () => {
      helpDocumentsModal.classList.remove('active')
      helpDocumentsModal.querySelectorAll('.form-notification').forEach((node) => node.remove())
      unlockScroll()
      document.body.classList.remove('modal-open')
    }

    const openHelpDocumentsModal = () => {
      helpDocumentsModal.querySelectorAll('.form-notification').forEach((node) => node.remove())
      helpDocumentsModal.classList.add('active')
      lockScroll()
      document.body.classList.add('modal-open')
    }

    document.body.addEventListener('click', (event) => {
      const link = event.target.closest('[data-open-help-modal]')
      if (!link) return
      event.preventDefault()
      openHelpDocumentsModal()
    })

    helpDocumentsModal.querySelector('.help-documents-close')?.addEventListener('click', (event) => {
      event.stopPropagation()
      closeHelpDocumentsModal()
    })
    helpDocumentsModal.addEventListener('click', (event) => {
      if (event.target === helpDocumentsModal) closeHelpDocumentsModal()
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && helpDocumentsModal.classList.contains('active')) {
        closeHelpDocumentsModal()
      }
    })

    helpDocumentsForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      const privacyCheck = helpDocumentsForm.querySelector('#hd-privacy')
      if (privacyCheck && !privacyCheck.checked) return

      const phone = helpDocumentsForm.querySelector('#hd-phone')?.value.trim()
      if (!phone) return

      const submitBtn = helpDocumentsForm.querySelector('button[type="submit"]')
      const container = helpDocumentsForm.querySelector('.catalog-request-buttons')

      await submitLead({
        payload: {
          name: helpDocumentsForm.querySelector('#hd-name')?.value.trim() || 'Не указано',
          phone,
          email: helpDocumentsForm.querySelector('#hd-email')?.value.trim() || '',
          comment: 'Запрос помощи с документами.',
          page: 'Документы (помощь)',
        },
        submitBtn,
        errorContainer: container,
        successMessage: 'Заявка отправлена! Менеджер свяжется с вами в ближайшее время.',
        onSuccess: () => {
          helpDocumentsForm.reset()
          setTimeout(closeHelpDocumentsModal, 5000)
        },
      })
    })
  }
}
