const PRIVACY_TOAST_MESSAGE = 'Согласитесь на обработку данных'

function showPrivacyToast() {
  window.dispatchEvent(new CustomEvent('app:toast', {
    detail: {
      message: PRIVACY_TOAST_MESSAGE,
      tone: 'warning',
    },
  }))
}

function findPrivacyCheckbox(form) {
  return form.querySelector('input[type="checkbox"][name="privacy"], #privacy, #co-privacy, #cr-privacy, #dr-privacy, #hd-privacy, #cim-privacy')
}

function findSubmitButton(form) {
  return form.querySelector('button[type="submit"], input[type="submit"]')
}

function syncPrivacySubmitState(form, privacy, submitBtn) {
  const isAllowed = Boolean(privacy.checked)
  submitBtn.disabled = !isAllowed
  submitBtn.classList.toggle('is-privacy-disabled', !isAllowed)
  submitBtn.setAttribute('aria-disabled', isAllowed ? 'false' : 'true')
  form.classList.toggle('is-privacy-unchecked', !isAllowed)
}

function blockUncheckedPrivacySubmit(form, event) {
  const privacy = findPrivacyCheckbox(form)
  if (!privacy || privacy.checked) return false
  event.preventDefault()
  event.stopImmediatePropagation()
  showPrivacyToast()
  return true
}

function initDocumentPrivacySubmitGuard(root) {
  const doc = root.ownerDocument || root
  if (doc.documentElement?.dataset.privacySubmitGuard === 'true') return
  doc.documentElement.dataset.privacySubmitGuard = 'true'
  doc.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null
    if (!form) return
    blockUncheckedPrivacySubmit(form, event)
  }, true)
}

export function initPrivacyConsentGuard(form) {
  if (!form || form.dataset.privacyConsentGuard === 'true') return
  const privacy = findPrivacyCheckbox(form)
  const submitBtn = findSubmitButton(form)
  if (!privacy || !submitBtn) return

  form.dataset.privacyConsentGuard = 'true'
  privacy.checked = false
  syncPrivacySubmitState(form, privacy, submitBtn)

  privacy.addEventListener('change', () => {
    syncPrivacySubmitState(form, privacy, submitBtn)
  })

  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      privacy.checked = false
      syncPrivacySubmitState(form, privacy, submitBtn)
    }, 0)
  })

  form.addEventListener('click', (event) => {
    if (privacy.checked) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('.form-checkbox')) return
    if (!target?.closest('.form-submit-group, .catalog-request-buttons, .catalogue-new-image-modal-contact-footer')) return
    event.preventDefault()
    showPrivacyToast()
  }, true)

  form.addEventListener('submit', (event) => {
    blockUncheckedPrivacySubmit(form, event)
  }, true)
}

export function initPrivacyConsentGuards(root = document) {
  initDocumentPrivacySubmitGuard(root)
  root.querySelectorAll('form').forEach((form) => initPrivacyConsentGuard(form))
}
