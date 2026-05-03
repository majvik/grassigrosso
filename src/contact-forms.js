function showNotification(message, type = 'success', button) {
  const parentForm = button?.closest('form')
  if (parentForm) {
    parentForm.querySelectorAll('.form-notification').forEach((node) => node.remove())
  }

  const notification = document.createElement('div')
  notification.className = `form-notification form-notification-${type}`
  notification.textContent = message

  if (button && button.parentNode) {
    button.parentNode.insertBefore(notification, button.nextSibling)
  } else if (parentForm) {
    parentForm.appendChild(notification)
  }

  setTimeout(() => {
    notification.classList.add('form-notification-hide')
    setTimeout(() => notification.remove(), 300)
  }, 6000)
}

function getPageName() {
  const slug = (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index'
  const pageNames = {
    index: 'Главная страница',
    hotels: 'Страница "Отелям"',
    dealers: 'Страница "Дилерам"',
    contacts: 'Страница "Контакты"',
    catalog: 'Страница "Каталог"',
  }
  return pageNames[slug] || slug
}

function clearErrors(form) {
  form.querySelectorAll('.form-group, [data-form-group]').forEach((group) => {
    group.classList.remove('error')
    const input = group.querySelector('input, textarea')
    if (input) input.classList.remove('error')
    group.querySelector('.error-message')?.remove()
  })
}

function showError(input, message) {
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

function validateForm(form) {
  let isValid = true
  clearErrors(form)

  const nameInput = form.querySelector('#name')
  if (nameInput) {
    const name = nameInput.value.trim()
    if (!name) {
      showError(nameInput, 'Пожалуйста, укажите ваше имя')
      isValid = false
    } else if (name.length < 2) {
      showError(nameInput, 'Имя должно содержать минимум 2 символа')
      isValid = false
    }
  }

  const phoneInput = form.querySelector('#phone')
  if (phoneInput) {
    const phone = phoneInput.value.trim()
    if (!phone) {
      showError(phoneInput, 'Пожалуйста, укажите ваш телефон')
      isValid = false
    } else {
      const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        showError(phoneInput, 'Пожалуйста, укажите корректный номер телефона')
        isValid = false
      }
    }
  }

  const emailInput = form.querySelector('#email')
  if (emailInput) {
    const email = emailInput.value.trim()
    if (!email) {
      showError(emailInput, 'Пожалуйста, укажите email адрес')
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(emailInput, 'Пожалуйста, укажите корректный email адрес')
      isValid = false
    }
  }

  const privacyCheckbox = form.querySelector('#privacy')
  if (privacyCheckbox && !privacyCheckbox.checked) {
    const submitBtn = form.querySelector('button[type="submit"]')
    showNotification('Необходимо согласие на обработку персональных данных', 'error', submitBtn)
    isValid = false
  }

  return isValid
}

function attachBlurValidation(form) {
  form.querySelectorAll('input, textarea').forEach((input) => {
    input.addEventListener('blur', () => {
      if (!['name', 'phone', 'email'].includes(input.id)) return
      const formGroup = input.closest('.form-group, [data-form-group]')
      if (!formGroup || !formGroup.classList.contains('error')) return

      if (input.id === 'name') {
        const name = input.value.trim()
        if (name && name.length >= 2) {
          formGroup.classList.remove('error')
          input.classList.remove('error')
          formGroup.querySelector('.error-message')?.remove()
        }
        return
      }

      if (input.id === 'phone') {
        const phone = input.value.trim()
        const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/
        if (phone && phoneRegex.test(phone.replace(/\s/g, ''))) {
          formGroup.classList.remove('error')
          input.classList.remove('error')
          formGroup.querySelector('.error-message')?.remove()
        }
        return
      }

      const email = input.value.trim()
      if (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        formGroup.classList.remove('error')
        input.classList.remove('error')
        formGroup.querySelector('.error-message')?.remove()
      }
    })
  })
}

export function initContactForms() {
  const contactForms = document.querySelectorAll('.contact-form, [data-contact-form]')
  if (contactForms.length === 0) return

  const apiUrl = import.meta.env.VITE_API_URL || '/api/submit'

  contactForms.forEach((form) => {
    attachBlurValidation(form)

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      if (!validateForm(form)) {
        const firstError = form.querySelector('.form-group.error')
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
          firstError.querySelector('input, textarea')?.focus()
        }
        return
      }

      const submitBtn = form.querySelector('button[type="submit"]')
      const originalText = submitBtn?.textContent
      const formData = {
        name: form.querySelector('#name')?.value.trim() || '',
        phone: form.querySelector('#phone')?.value.trim() || '',
        comment: form.querySelector('#message')?.value.trim() || '',
        email: form.querySelector('#email')?.value.trim() || '',
        city: form.querySelector('#city')?.value.trim() || '',
        website: form.querySelector('#website')?.value.trim() || '',
        page: getPageName(),
      }
      const packageSelect = form.querySelector('#dealer-package')
      if (packageSelect) formData.package = packageSelect.value || ''

      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Отправка...'
      }

      if (!apiUrl) {
        showNotification('Ошибка конфигурации: API URL не настроен. Обратитесь к администратору.', 'error', submitBtn)
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = originalText
        }
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000)

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        const data = await response.json().catch(() => ({}))

        if (response.ok) {
          showNotification('Заявка отправлена! Мы свяжемся с вами в ближайшее время.', 'success', submitBtn)
          form.reset()
          clearErrors(form)
        } else {
          showNotification(data.error || data.details || 'Ошибка сервера. Попробуйте позже.', 'error', submitBtn)
        }
      } catch (error) {
        clearTimeout(timeoutId)
        showNotification(
          error.name === 'AbortError'
            ? 'Превышено время ожидания ответа от сервера. Попробуйте позже.'
            : 'Не удалось отправить данные. Проверьте подключение к интернету и убедитесь, что сервер запущен.',
          'error',
          submitBtn,
        )
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = originalText
        }
      }
    })
  })
}
