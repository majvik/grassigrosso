import { readCatalogFavourites, writeCatalogFavourites } from './catalog-favourites'
import { buildCatalogCardMetaHtmlFromDataset, buildCatalogModalSpecs } from './catalog-modal'

const CATALOG_PAGE_NAME = 'Страница "Каталог"'

const POSITION_MEDIA_BASE_PX = 120
const POSITION_MEDIA_MAX_PX = 168

function isNarrowCatalogModalPositionLayout(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 640px)').matches
}

export type CatalogImageModalElements = {
  modal: HTMLElement
  dialog: HTMLElement
  previewRoot: HTMLElement
  contactRoot: HTMLElement
  contactForm: HTMLFormElement
  contactHeading: HTMLElement
  contactBackBtn: HTMLButtonElement
  positionsList: HTMLElement
  positionsCount: HTMLElement
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

function cssEscapeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function showFormNotification(form: HTMLFormElement, message: string, type: 'success' | 'error', anchor?: Element | null): void {
  form.querySelectorAll('.form-notification').forEach((node) => node.remove())
  const notification = document.createElement('div')
  notification.className = `form-notification form-notification-${type}`
  notification.textContent = message
  const footer = anchor?.closest('.catalogue-new-image-modal-contact-footer')
  if (footer?.parentNode) {
    footer.parentNode.insertBefore(notification, footer)
  } else {
    const target = anchor?.parentNode
    if (target && anchor) {
      target.insertBefore(notification, anchor.nextSibling)
    } else {
      form.appendChild(notification)
    }
  }
  const scrollHost = notification.closest('.catalogue-new-image-modal-contact-scroll')
  if (scrollHost) {
    scrollHost.scrollTo({ top: scrollHost.scrollHeight, behavior: 'smooth' })
  } else {
    notification.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }
  window.setTimeout(() => {
    notification.classList.add('form-notification-hide')
    window.setTimeout(() => notification.remove(), 300)
  }, 6000)
}

function clearFormErrors(form: HTMLFormElement): void {
  form.querySelectorAll('.form-group, [data-form-group]').forEach((group) => {
    group.classList.remove('error')
    group.querySelector('input, textarea')?.classList.remove('error')
    group.querySelector('.error-message')?.remove()
  })
}

function showFieldError(input: HTMLElement, message: string): void {
  const formGroup = input.closest('.form-group, [data-form-group]')
  if (!formGroup) return
  formGroup.classList.add('error')
  input.classList.add('error')
  formGroup.querySelector('.error-message')?.remove()
  const errorMsg = document.createElement('div')
  errorMsg.className = 'error-message'
  errorMsg.textContent = message
  formGroup.appendChild(errorMsg)
}

function validateCatalogImageContactForm(form: HTMLFormElement): boolean {
  clearFormErrors(form)
  let ok = true

  const nameInput = form.querySelector<HTMLInputElement>('#cim-name')
  if (nameInput) {
    const name = nameInput.value.trim()
    if (!name || name.length < 2) {
      showFieldError(nameInput, !name ? 'Пожалуйста, укажите ваше имя' : 'Имя должно содержать минимум 2 символа')
      ok = false
    }
  }

  const phoneInput = form.querySelector<HTMLInputElement>('#cim-phone')
  if (phoneInput) {
    const phone = phoneInput.value.trim()
    const phoneRegex = /^[\d\s+().-]{10,}$/
    if (!phone) {
      showFieldError(phoneInput, 'Пожалуйста, укажите ваш телефон')
      ok = false
    } else if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      showFieldError(phoneInput, 'Пожалуйста, укажите корректный номер телефона')
      ok = false
    }
  }

  const emailInput = form.querySelector<HTMLInputElement>('#cim-email')
  if (emailInput) {
    const email = emailInput.value.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError(emailInput, !email ? 'Пожалуйста, укажите email адрес' : 'Пожалуйста, укажите корректный email адрес')
      ok = false
    }
  }

  const privacy = form.querySelector<HTMLInputElement>('#cim-privacy')
  if (privacy && !privacy.checked) {
    const submitBtn = form.querySelector('button[type="submit"]')
    showFormNotification(form, 'Необходимо согласие на обработку персональных данных', 'error', submitBtn)
    ok = false
  }

  return ok
}

function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || '/api/submit'
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

function cardDatasetToSpecDataset(ds: DOMStringMap): Parameters<typeof buildCatalogModalSpecs>[0] {
  return {
    firmness: ds.firmness,
    type: ds.type,
    height: ds.height,
    load: ds.load,
    loadRange: ds.loadRange,
    heightRange: ds.heightRange,
    sizes: ds.sizes,
    widths: ds.widths,
    lengths: ds.lengths,
    fillings: ds.fillings,
    features: ds.features,
  }
}

function findCardByProductSlug(cardsRoot: Element, slug: string): HTMLElement | null {
  const safe = cssEscapeSelector(String(slug || '').trim())
  if (!safe) return null
  const el = cardsRoot.querySelector<HTMLElement>(`.catalogue-new-card[data-product-slug="${safe}"]`)
  return el
}

/** Те же теги, что в `.catalogue-new-card` (Strapi / статичные карточки). */
function appendCatalogModalPositionTagsFromCard(body: HTMLElement, card: HTMLElement): void {
  const tagsRoot = card.querySelector('.catalogue-new-tags')
  if (!tagsRoot) return
  const labels = [...tagsRoot.querySelectorAll(':scope > .catalogue-new-tag')]
    .map((el) => el.textContent?.trim())
    .filter((t): t is string => Boolean(t))
  if (labels.length === 0) return
  const row = document.createElement('div')
  row.className = 'catalogue-new-tags-row catalogue-new-modal-position-tags-row'
  const inner = document.createElement('div')
  inner.className = 'catalogue-new-tags'
  for (const text of labels) {
    const span = document.createElement('span')
    span.className = 'catalogue-new-tag'
    span.textContent = text
    inner.appendChild(span)
  }
  row.appendChild(inner)
  body.appendChild(row)
}

export function initCatalogImageModal(
  elements: CatalogImageModalElements,
  options: CatalogImageModalOptions = {},
): void {
  let activeModalProductSlug = ''
  let activeModalProductTitle = ''
  let contactEntry: 'preview' | 'favourites' | null = null
  let pendingContactSlugs: string[] = []

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

  let positionMediaSyncRaf = 0
  const syncModalPositionMediaSizes = (): void => {
    if (elements.modal.hasAttribute('hidden')) return
    if (!elements.dialog.classList.contains('is-contact-view')) return

    const narrow = isNarrowCatalogModalPositionLayout()
    elements.positionsList.querySelectorAll<HTMLElement>('.catalogue-new-modal-position').forEach((row) => {
      if (narrow) {
        row.style.removeProperty('--catalogue-modal-position-media-side')
        return
      }
      const body = row.querySelector<HTMLElement>('.catalogue-new-modal-position-body')
      if (!body) return
      const metaLineCount = row.querySelectorAll('.catalogue-new-meta-line').length
      const multiMeta = metaLineCount >= 2
      const bodyH = body.offsetHeight
      let side = POSITION_MEDIA_BASE_PX
      if (!multiMeta && bodyH > POSITION_MEDIA_BASE_PX) {
        side = Math.min(Math.round(bodyH), POSITION_MEDIA_MAX_PX)
      }
      row.style.setProperty('--catalogue-modal-position-media-side', `${side}px`)
    })
  }

  const scheduleSyncModalPositionMediaSizes = (): void => {
    if (positionMediaSyncRaf) cancelAnimationFrame(positionMediaSyncRaf)
    positionMediaSyncRaf = requestAnimationFrame(() => {
      positionMediaSyncRaf = 0
      syncModalPositionMediaSizes()
    })
  }

  const setContactViewVisible = (visible: boolean): void => {
    elements.dialog.classList.toggle('is-contact-view', visible)
    elements.contactRoot.hidden = !visible
    elements.previewRoot.hidden = visible
    if (!visible) {
      elements.contactBackBtn.hidden = true
    } else {
      elements.contactBackBtn.hidden = contactEntry !== 'preview'
    }
    if (visible) {
      const n = pendingContactSlugs.length
      elements.contactHeading.textContent = n === 1 ? 'Связаться по позиции' : 'Связаться по позициям'
    }
  }

  const renderPositionsList = (): void => {
    elements.positionsList.replaceChildren()
    elements.positionsCount.textContent = String(pendingContactSlugs.length)

    const showRemoveFromFavourites = contactEntry === 'favourites'

    pendingContactSlugs.forEach((slug) => {
      const card = findCardByProductSlug(elements.cardsRoot, slug)
      const row = document.createElement('div')
      row.className = 'catalogue-new-modal-position'

      const imgWrap = document.createElement('div')
      imgWrap.className = 'catalogue-new-modal-position-media'
      const img = document.createElement('img')
      img.className = 'catalogue-new-modal-position-img'
      img.alt = ''
      if (card) {
        const src = card.querySelector('picture img')?.getAttribute('src') || ''
        const alt = card.querySelector('picture img')?.getAttribute('alt') || ''
        if (src) img.setAttribute('src', src)
        img.alt = alt || ''
      }
      img.addEventListener('load', () => scheduleSyncModalPositionMediaSizes(), { once: true })
      imgWrap.appendChild(img)

      const body = document.createElement('div')
      body.className = 'catalogue-new-modal-position-body'
      const titleText =
        card?.querySelector('.catalogue-new-card-body h3')?.textContent?.trim() || slug || 'Позиция'

      if (showRemoveFromFavourites) {
        const headerRow = document.createElement('div')
        headerRow.className = 'catalogue-new-modal-position-header'
        const titleEl = document.createElement('h4')
        titleEl.className = 'catalogue-new-modal-position-title'
        titleEl.textContent = titleText
        const removeBtn = document.createElement('button')
        removeBtn.type = 'button'
        removeBtn.className = 'catalogue-new-modal-position-remove'
        removeBtn.dataset.productSlug = slug
        removeBtn.setAttribute('aria-label', 'Убрать позицию из текущей отправки')
        const removeIcon = document.createElement('img')
        removeIcon.src = '/icons/catalogue-modal-remove-position.svg'
        removeIcon.width = 24
        removeIcon.height = 24
        removeIcon.alt = ''
        removeIcon.setAttribute('aria-hidden', 'true')
        removeBtn.appendChild(removeIcon)
        headerRow.append(titleEl, removeBtn)
        body.appendChild(headerRow)
      } else {
        const titleEl = document.createElement('h4')
        titleEl.className = 'catalogue-new-modal-position-title'
        titleEl.textContent = titleText
        body.appendChild(titleEl)
      }

      if (card) {
        const metaHtml = buildCatalogCardMetaHtmlFromDataset(cardDatasetToSpecDataset(card.dataset))
        if (metaHtml) {
          const wrap = document.createElement('div')
          wrap.innerHTML = metaHtml
          while (wrap.firstChild) body.appendChild(wrap.firstChild)
        }
        appendCatalogModalPositionTagsFromCard(body, card)
      }

      row.append(imgWrap, body)
      elements.positionsList.appendChild(row)
    })

    scheduleSyncModalPositionMediaSizes()
    requestAnimationFrame(() => scheduleSyncModalPositionMediaSizes())
  }

  const resetContactForm = (options?: { preserveNotifications?: boolean }): void => {
    elements.contactForm.reset()
    const privacy = elements.contactForm.querySelector<HTMLInputElement>('#cim-privacy')
    if (privacy) privacy.checked = true
    clearFormErrors(elements.contactForm)
    if (!options?.preserveNotifications) {
      elements.contactForm.querySelectorAll('.form-notification').forEach((n) => n.remove())
    }
  }

  const openContactView = (slugs: string[], entry: 'preview' | 'favourites'): void => {
    const unique = [...new Set(slugs.map((s) => String(s || '').trim()).filter(Boolean))]
    if (!unique.length) return
    pendingContactSlugs = unique
    contactEntry = entry
    resetContactForm()
    renderPositionsList()
    const wasHidden = elements.modal.hasAttribute('hidden')
    setContactViewVisible(true)
    elements.modal.removeAttribute('hidden')
    if (wasHidden) {
      options.lockScroll?.()
      document.body.classList.add('modal-open')
    }
  }

  const backToPreview = (): void => {
    if (contactEntry !== 'preview') return
    contactEntry = null
    pendingContactSlugs = []
    setContactViewVisible(false)
    elements.previewRoot.hidden = false
    elements.contactRoot.hidden = true
    elements.dialog.classList.remove('is-contact-view')
  }

  const closeCatalogueImageModal = (): void => {
    elements.modal.setAttribute('hidden', '')
    elements.image.setAttribute('src', '')
    elements.image.setAttribute('alt', '')
    elements.title.textContent = ''
    activeModalProductSlug = ''
    activeModalProductTitle = ''
    contactEntry = null
    pendingContactSlugs = []
    setContactViewVisible(false)
    elements.previewRoot.hidden = false
    elements.contactRoot.hidden = true
    elements.dialog.classList.remove('is-contact-view')
    syncModalFavouriteState()
    clearModalSpecs()
    resetContactForm()
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
    buildCatalogModalSpecs(cardDatasetToSpecDataset(dataset)).forEach((spec) => {
      appendModalSpec(elements.specs, spec.label, spec.value)
    })
    if (!elements.specs.childElementCount) {
      elements.specsEmpty.hidden = false
    }
    elements.previewRoot.hidden = false
    elements.contactRoot.hidden = true
    elements.dialog.classList.remove('is-contact-view')
    contactEntry = null
    elements.contactBackBtn.hidden = true
    elements.modal.removeAttribute('hidden')
    options.lockScroll?.()
    document.body.classList.add('modal-open')
  }

  elements.contactBtn.addEventListener('click', () => {
    if (!activeModalProductSlug) return
    openContactView([activeModalProductSlug], 'preview')
  })

  elements.contactBackBtn.addEventListener('click', () => {
    backToPreview()
  })

  elements.positionsList.addEventListener('click', (event) => {
    if (contactEntry !== 'favourites') return
    const target = event.target
    if (!(target instanceof Element)) return
    const btn = target.closest('.catalogue-new-modal-position-remove')
    if (!(btn instanceof HTMLButtonElement)) return
    const slug = String(btn.dataset.productSlug || '').trim()
    if (!slug) return

    pendingContactSlugs = pendingContactSlugs.filter((s) => s !== slug)
    if (pendingContactSlugs.length === 0) {
      closeCatalogueImageModal()
      return
    }
    renderPositionsList()
    const n = pendingContactSlugs.length
    elements.contactHeading.textContent = n === 1 ? 'Связаться по позиции' : 'Связаться по позициям'
  })

  elements.contactForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!validateCatalogImageContactForm(elements.contactForm)) {
      const firstError = elements.contactForm.querySelector<HTMLElement>('.form-group.error')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      firstError?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.focus()
      return
    }

    const honeypot = elements.contactForm.querySelector<HTMLInputElement>('#cim-website')
    if (honeypot?.value?.trim()) return

    const name = elements.contactForm.querySelector<HTMLInputElement>('#cim-name')?.value.trim() || ''
    const city = elements.contactForm.querySelector<HTMLInputElement>('#cim-city')?.value.trim() || ''
    const email = elements.contactForm.querySelector<HTMLInputElement>('#cim-email')?.value.trim() || ''
    const phone = elements.contactForm.querySelector<HTMLInputElement>('#cim-phone')?.value.trim() || ''
    const message = elements.contactForm.querySelector<HTMLTextAreaElement>('#cim-message')?.value.trim() || ''

    const positionTitles = pendingContactSlugs.map((slug) => {
      const card = findCardByProductSlug(elements.cardsRoot, slug)
      return card?.querySelector('.catalogue-new-card-body h3')?.textContent?.trim() || slug
    })

    const commentParts = [
      message && `Сообщение:\n${message}`,
      `Интересующие позиции (${positionTitles.length}):\n${positionTitles.join('\n')}`,
    ].filter(Boolean)

    const payload = {
      name: name || 'Не указано',
      phone,
      email,
      city,
      comment: commentParts.join('\n\n'),
      page: CATALOG_PAGE_NAME,
    }

    const submitBtn = elements.contactForm.querySelector<HTMLButtonElement>('#catalogueImageModalContactSubmit')
    const originalText = submitBtn?.textContent
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Отправка...'
    }

    const apiUrl = getApiUrl()
    if (!apiUrl) {
      showFormNotification(elements.contactForm, 'Ошибка конфигурации API.', 'error', submitBtn)
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = originalText || 'Отправить'
      }
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        showFormNotification(
          elements.contactForm,
          'Заявка отправлена! Мы свяжемся с вами в ближайшее время.',
          'success',
          submitBtn,
        )
        resetContactForm({ preserveNotifications: true })
        setTimeout(() => closeCatalogueImageModal(), 4500)
      } else {
        showFormNotification(elements.contactForm, data.error || data.details || 'Ошибка сервера.', 'error', submitBtn)
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      const name = error instanceof Error ? error.name : ''
      showFormNotification(
        elements.contactForm,
        name === 'AbortError'
          ? 'Превышено время ожидания ответа от сервера. Попробуйте позже.'
          : 'Не удалось отправить данные. Проверьте подключение к интернету.',
        'error',
        submitBtn,
      )
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = originalText || 'Отправить'
      }
    }
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

  let positionLayoutResizeTimer = 0
  const onWindowResizeForPositionLayout = (): void => {
    if (elements.modal.hasAttribute('hidden')) return
    window.clearTimeout(positionLayoutResizeTimer)
    positionLayoutResizeTimer = window.setTimeout(() => scheduleSyncModalPositionMediaSizes(), 120)
  }
  window.addEventListener('resize', onWindowResizeForPositionLayout, { passive: true })

  const onContactManager = (ev: Event): void => {
    const ce = ev as CustomEvent<{ slugs?: string[] }>
    const raw = ce.detail?.slugs
    const slugs = Array.isArray(raw) ? raw.filter(Boolean).map(String) : []
    if (!slugs.length) return
    openContactView(slugs, 'favourites')
  }
  window.addEventListener('catalogue:contact-manager', onContactManager as EventListener)

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
    if (event.key !== 'Escape' || elements.modal.hasAttribute('hidden')) return
    if (elements.dialog.classList.contains('is-contact-view') && contactEntry === 'preview') {
      backToPreview()
      return
    }
    closeCatalogueImageModal()
  })
}
