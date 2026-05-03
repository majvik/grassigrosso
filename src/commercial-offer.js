function showCONotification(form, message, type) {
  form.querySelector('.form-notification')?.remove()
  const notification = document.createElement('div')
  notification.className = `form-notification form-notification-${type}`
  notification.textContent = message
  form.querySelector('.commercial-offer-step[data-step="3"]')?.appendChild(notification)
}

export function initCommercialOfferModal({ lockScroll, unlockScroll }) {
  const commercialOfferModal = document.getElementById('commercialOfferModal')
  const commercialOfferForm = document.getElementById('commercialOfferForm')
  const commercialOfferStepLabel = document.getElementById('commercialOfferStepLabel')

  if (!commercialOfferModal || !commercialOfferForm) return

  let currentStep = 1
  const steps = commercialOfferModal.querySelectorAll('.commercial-offer-step')
  const totalSteps = steps.length

  const showCommercialOfferStep = (step) => {
    currentStep = step
    steps.forEach((element) => {
      element.classList.toggle('active', parseInt(element.dataset.step, 10) === step)
    })
    if (commercialOfferStepLabel) {
      commercialOfferStepLabel.textContent = `Шаг ${step} из ${totalSteps}`
    }
  }

  const openCommercialOfferModal = () => {
    commercialOfferModal.querySelectorAll('.form-notification').forEach((node) => node.remove())
    showCommercialOfferStep(1)
    commercialOfferModal.classList.add('active')
    lockScroll()
    document.body.classList.add('modal-open')
  }

  const closeCommercialOfferModal = () => {
    commercialOfferModal.classList.remove('active')
    commercialOfferModal.querySelectorAll('.form-notification').forEach((node) => node.remove())
    unlockScroll()
    document.body.classList.remove('modal-open')
  }

  document.getElementById('heroCommercialOfferLink')?.addEventListener('click', (event) => {
    event.preventDefault()
    openCommercialOfferModal()
  })

  document.body.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-commercial-offer]')
    if (!trigger) return
    event.preventDefault()
    openCommercialOfferModal()
    const seasonalCheckbox = commercialOfferForm.querySelector('#co-seasonal')
    if (seasonalCheckbox) {
      seasonalCheckbox.checked = trigger.getAttribute('data-open-commercial-offer') === 'seasonal'
    }
  })

  commercialOfferModal.querySelector('.commercial-offer-close')?.addEventListener('click', (event) => {
    event.stopPropagation()
    closeCommercialOfferModal()
  })
  commercialOfferModal.addEventListener('click', (event) => {
    if (event.target === commercialOfferModal) closeCommercialOfferModal()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && commercialOfferModal.classList.contains('active')) {
      closeCommercialOfferModal()
    }
  })

  commercialOfferForm.querySelectorAll('.btn-next').forEach((button) => {
    button.addEventListener('click', () => {
      const goto = parseInt(button.dataset.goto, 10)
      if (goto === 2) {
        const phone = commercialOfferForm.querySelector('#co-phone')
        const formGroup = phone?.closest('.form-group')
        if (!phone || !phone.value.trim()) {
          if (formGroup) {
            formGroup.classList.add('error')
            phone.classList.add('error')
            let errorNode = formGroup.querySelector('.error-message')
            if (!errorNode) {
              errorNode = document.createElement('div')
              errorNode.className = 'error-message'
              formGroup.appendChild(errorNode)
            }
            errorNode.textContent = 'Пожалуйста, укажите телефон'
          }
          return
        }
        if (formGroup) {
          formGroup.classList.remove('error')
          phone.classList.remove('error')
          formGroup.querySelector('.error-message')?.remove()
        }
      }
      showCommercialOfferStep(goto)
    })
  })

  commercialOfferForm.querySelectorAll('.btn-back').forEach((button) => {
    button.addEventListener('click', () => {
      showCommercialOfferStep(parseInt(button.dataset.goto, 10))
    })
  })

  commercialOfferForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const privacyCheck = commercialOfferForm.querySelector('#co-privacy')
    if (privacyCheck && !privacyCheck.checked) {
      showCONotification(commercialOfferForm, 'Необходимо согласие на обработку персональных данных', 'error')
      return
    }

    const phone = commercialOfferForm.querySelector('#co-phone')?.value.trim()
    if (!phone) return

    const name = commercialOfferForm.querySelector('#co-name')?.value.trim() || 'Не указано'
    const email = commercialOfferForm.querySelector('#co-email')?.value.trim() || ''
    const mattresses = commercialOfferForm.querySelector('#co-mattresses')?.value.trim() || ''
    const segments = [...commercialOfferForm.querySelectorAll('input[name="segment"]:checked')]
      .map((checkbox) => checkbox.value)
      .join(', ') || 'Не указано'
    const seasonal = commercialOfferForm.querySelector('#co-seasonal')?.checked ? 'Да' : 'Нет'
    const timeFrom = commercialOfferForm.querySelector('#co-time-from')?.value.trim() || ''
    const timeTo = commercialOfferForm.querySelector('#co-time-to')?.value.trim() || ''
    const message = commercialOfferForm.querySelector('#co-message')?.value.trim() || ''
    const comment = [
      'Заявка на коммерческое предложение.',
      mattresses ? `Количество матрасов: ${mattresses}.` : '',
      `Сегмент: ${segments}.`,
      `Сезонное обновление: ${seasonal}.`,
      timeFrom || timeTo ? `Время для связи: ${[timeFrom, timeTo].filter(Boolean).join(' – ')}.` : '',
      message ? `Сообщение: ${message}` : '',
    ].filter(Boolean).join(' ')

    const apiUrl = import.meta.env.VITE_API_URL || '/api/submit'
    const submitBtn = commercialOfferForm.querySelector('.btn-submit')
    const originalText = submitBtn?.textContent
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Отправка...'
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, comment, page: 'Главная (КП)' }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        const container = commercialOfferForm.querySelector('.commercial-offer-step[data-step="3"] .commercial-offer-buttons')
        if (container) {
          const notification = document.createElement('div')
          notification.className = 'form-notification form-notification-success'
          notification.textContent = 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.'
          container.parentElement.insertBefore(notification, container)
        }
        commercialOfferForm.reset()
        const mattressesInput = commercialOfferForm.querySelector('#co-mattresses')
        if (mattressesInput) mattressesInput.value = 100
        setTimeout(closeCommercialOfferModal, 5000)
      } else {
        showCONotification(commercialOfferForm, data.error || data.details || 'Ошибка отправки. Попробуйте позже.', 'error')
      }
    } catch (_) {
      showCONotification(commercialOfferForm, 'Не удалось отправить заявку. Проверьте подключение к интернету.', 'error')
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = originalText
      }
    }
  })
}
