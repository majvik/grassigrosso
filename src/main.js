import './style.css'

// Geography cities animation - start only when in viewport
const geographySection = document.querySelector('.geography-section')
const geographyCities = document.querySelector('.geography-cities')

if (geographySection && geographyCities) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        geographyCities.classList.add('animate')
      } else {
        geographyCities.classList.remove('animate')
      }
    })
  }, {
    threshold: 0.1 // Start animation when 10% of section is visible
  })

  observer.observe(geographySection)
}

// Font loading and preloader
const preloader = document.getElementById('preloader')

// Function to check if fonts are loaded
async function waitForFonts() {
  // Wait for document to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve)
    })
  }

  // Check if document.fonts API is available
  if (document.fonts && document.fonts.ready) {
    try {
      // Wait for all fonts to be loaded
      await document.fonts.ready
      
      // Additional check: verify specific fonts are loaded
      const nunitoLoaded = document.fonts.check('16px Nunito')
      const boundedLoaded = document.fonts.check('16px Bounded')
      
      // If fonts are not loaded yet, wait a bit more
      if (!nunitoLoaded || !boundedLoaded) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (e) {
      console.warn('Font loading check failed:', e)
    }
  } else {
    // Fallback: wait a reasonable time for fonts to load
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// Initialize page load
async function initPageLoad() {
  // Wait for fonts to load
  await waitForFonts()
  
  // Small delay to ensure fonts are rendered
  await new Promise(resolve => requestAnimationFrame(resolve))
  
  // Mark fonts as loaded - this will show the body with fade
  document.body.classList.add('fonts-loaded')
  
  // Hide preloader with fade
  if (preloader) {
    preloader.classList.add('hidden')
    // Remove from DOM after animation
    setTimeout(() => {
      if (preloader && preloader.parentNode) {
        preloader.remove()
      }
    }, 500)
  }
}

// Start initialization
initPageLoad().catch(err => {
  console.error('Error initializing page:', err)
  // Fallback: show page anyway after timeout
  setTimeout(() => {
    document.body.classList.add('fonts-loaded')
    if (preloader) {
      preloader.classList.add('hidden')
      setTimeout(() => {
        if (preloader && preloader.parentNode) {
          preloader.remove()
        }
      }, 500)
    }
  }, 2000)
})

// Scale page on screens 1920px and larger
function scalePage() {
  if (window.innerWidth >= 1920) {
    const scale = window.innerWidth / 1920
    document.body.style.transform = `scale(${scale})`
    document.body.style.transformOrigin = 'top center'
  } else {
    document.body.style.transform = ''
    document.body.style.transformOrigin = ''
  }
}

// Apply scale on load and resize
scalePage()
window.addEventListener('resize', scalePage)

// Cookie banner
const cookieBanner = document.querySelector('.cookie-banner')
const cookieBtn = document.querySelector('.btn-cookie')

if (cookieBtn && cookieBanner) {
  if (localStorage.getItem('cookieAccepted')) {
    cookieBanner.style.display = 'none'
    document.body.classList.remove('cookie-visible')
  } else {
    document.body.classList.add('cookie-visible')
  }
  
  cookieBtn.addEventListener('click', () => {
    cookieBanner.classList.add('hiding')
    document.body.classList.remove('cookie-visible')
    setTimeout(() => {
      cookieBanner.style.display = 'none'
    }, 300)
    localStorage.setItem('cookieAccepted', 'true')
  })
}

// Mobile menu
const mobileMenuBtn = document.querySelector('.mobile-menu-btn')
const mobileMenuClose = document.querySelector('.mobile-menu-close')
const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay')
const mobileNavLinks = document.querySelectorAll('.mobile-nav a, .mobile-menu-cta')

if (mobileMenuBtn && mobileMenuClose && mobileMenuOverlay) {
  // Open menu
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenuOverlay.classList.add('active')
    document.body.style.overflow = 'hidden'
  })
  
  // Close menu
  const closeMenu = () => {
    mobileMenuOverlay.classList.remove('active')
    document.body.style.overflow = ''
  }
  
  mobileMenuClose.addEventListener('click', closeMenu)
  
  // Close when clicking on overlay (outside menu)
  mobileMenuOverlay.addEventListener('click', (e) => {
    if (e.target === mobileMenuOverlay) {
      closeMenu()
    }
  })
  
  // Close when clicking nav links
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', closeMenu)
  })
}

// Collections slider
const slider = document.querySelector('.collections-grid')
const prevBtn = document.querySelector('.collections-arrows .arrow-btn.prev')
const nextBtn = document.querySelector('.collections-arrows .arrow-btn.next')
const progressFill = document.querySelector('.collections-progress-fill')

if (slider && prevBtn && nextBtn && progressFill) {
  const cardWidth = 392 + 56 // card width + gap
  
  // Update progress and button states
  function updateSlider() {
    const scrollLeft = slider.scrollLeft
    const maxScroll = slider.scrollWidth - slider.clientWidth
    const scrollProgress = maxScroll > 0 ? scrollLeft / maxScroll : 0
    
    // Calculate thumb size based on visible/total ratio
    const visibleRatio = slider.clientWidth / slider.scrollWidth
    const thumbWidth = Math.max(visibleRatio * 100, 15) // minimum 15%
    
    // Calculate thumb position
    const trackSpace = 100 - thumbWidth
    const thumbPosition = scrollProgress * trackSpace
    
    progressFill.style.width = `${thumbWidth}%`
    progressFill.style.left = `${thumbPosition}%`
    
    // Update button states
    prevBtn.disabled = scrollLeft <= 1
    nextBtn.disabled = scrollLeft >= maxScroll - 1
  }
  
  // Arrow navigation
  prevBtn.addEventListener('click', () => {
    slider.scrollBy({ left: -cardWidth, behavior: 'smooth' })
  })
  
  nextBtn.addEventListener('click', () => {
    slider.scrollBy({ left: cardWidth, behavior: 'smooth' })
  })
  
  // Listen to scroll events
  slider.addEventListener('scroll', updateSlider)
  
  // Drag to scroll
  let isDown = false
  let startX
  let scrollLeftStart
  
  slider.addEventListener('mousedown', (e) => {
    isDown = true
    slider.classList.add('active')
    startX = e.pageX - slider.offsetLeft
    scrollLeftStart = slider.scrollLeft
  })
  
  slider.addEventListener('mouseleave', () => {
    isDown = false
    slider.classList.remove('active')
  })
  
  slider.addEventListener('mouseup', () => {
    isDown = false
    slider.classList.remove('active')
  })
  
  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - slider.offsetLeft
    const walk = (x - startX) * 1.5
    slider.scrollLeft = scrollLeftStart - walk
  })
  
  // Touch support for drag to scroll
  slider.addEventListener('touchstart', (e) => {
    isDown = true
    slider.classList.add('active')
    startX = e.touches[0].pageX - slider.offsetLeft
    scrollLeftStart = slider.scrollLeft
  }, { passive: false })
  
  slider.addEventListener('touchend', () => {
    isDown = false
    slider.classList.remove('active')
  })
  
  slider.addEventListener('touchmove', (e) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.touches[0].pageX - slider.offsetLeft
    const walk = (x - startX) * 1.5
    slider.scrollLeft = scrollLeftStart - walk
  }, { passive: false })
  
  // Initialize: ensure scroll is at start
  slider.scrollLeft = 0
  
  // Wait for layout then update
  requestAnimationFrame(() => {
    slider.scrollLeft = 0
    updateSlider()
  })
}

// Testimonials slider with autoplay
const testimonialsSlider = document.querySelector('.testimonials-grid')
const testimonialsSection = document.querySelector('.testimonials')

if (testimonialsSlider && testimonialsSection) {
  // Get actual card width + gap for 2 columns
  const getScrollStep = () => {
    const card = testimonialsSlider.querySelector('.testimonial-card')
    return card ? (card.offsetWidth + 32) * 2 : 1000
  }
  let autoplayInterval
  let isUserInteracting = false
  let isInView = false
  
  // Autoplay function
  function startAutoplay() {
    if (autoplayInterval) return // Already running
    autoplayInterval = setInterval(() => {
      if (isUserInteracting || !isInView) return
      
      const maxScroll = testimonialsSlider.scrollWidth - testimonialsSlider.clientWidth
      
      if (testimonialsSlider.scrollLeft >= maxScroll - 1) {
        // Reset to start smoothly
        testimonialsSlider.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        testimonialsSlider.scrollBy({ left: getScrollStep(), behavior: 'smooth' })
      }
    }, 8000)
  }
  
  function stopAutoplay() {
    clearInterval(autoplayInterval)
    autoplayInterval = null
  }
  
  // Intersection Observer - start autoplay when 2/3 visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isInView = entry.isIntersecting
      if (entry.isIntersecting) {
        startAutoplay()
      } else {
        stopAutoplay()
      }
    })
  }, {
    threshold: 0.66 // 2/3 visible
  })
  
  observer.observe(testimonialsSection)
  
  // Drag to scroll
  let isDown = false
  let startX
  let scrollLeftStart
  
  testimonialsSlider.addEventListener('mousedown', (e) => {
    isDown = true
    isUserInteracting = true
    testimonialsSlider.classList.add('active')
    startX = e.pageX - testimonialsSlider.offsetLeft
    scrollLeftStart = testimonialsSlider.scrollLeft
  })
  
  testimonialsSlider.addEventListener('mouseleave', () => {
    if (isDown) {
      isDown = false
      testimonialsSlider.classList.remove('active')
      isUserInteracting = false
    }
  })
  
  testimonialsSlider.addEventListener('mouseup', () => {
    isDown = false
    testimonialsSlider.classList.remove('active')
    isUserInteracting = false
  })
  
  testimonialsSlider.addEventListener('mousemove', (e) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - testimonialsSlider.offsetLeft
    const walk = (x - startX) * 1.5
    testimonialsSlider.scrollLeft = scrollLeftStart - walk
  })
  
  // Touch support for drag to scroll
  testimonialsSlider.addEventListener('touchstart', (e) => {
    isDown = true
    testimonialsSlider.classList.add('active')
    startX = e.touches[0].pageX - testimonialsSlider.offsetLeft
    scrollLeftStart = testimonialsSlider.scrollLeft
  }, { passive: false })
  
  testimonialsSlider.addEventListener('touchend', () => {
    isDown = false
    testimonialsSlider.classList.remove('active')
  })
  
  testimonialsSlider.addEventListener('touchmove', (e) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.touches[0].pageX - testimonialsSlider.offsetLeft
    const walk = (x - startX) * 1.5
    testimonialsSlider.scrollLeft = scrollLeftStart - walk
  }, { passive: false })
  
  // Pause autoplay on hover
  testimonialsSlider.addEventListener('mouseenter', () => {
    isUserInteracting = true
  })
  
  testimonialsSlider.addEventListener('mouseleave', () => {
    if (!isDown) {
      isUserInteracting = false
    }
  })
  
  // Touch support
  testimonialsSlider.addEventListener('touchstart', () => {
    isUserInteracting = true
  })
  
  testimonialsSlider.addEventListener('touchend', () => {
    isUserInteracting = false
  })
}

// Hotel Categories Switcher
const categoryItems = document.querySelectorAll('.category-item')
const categoriesText = document.querySelector('.categories-text')

if (categoryItems.length > 0 && categoriesText) {
  categoryItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active from all items
      categoryItems.forEach(otherItem => {
        otherItem.classList.remove('category-active')
      })
      
      // Add active to clicked item
      item.classList.add('category-active')
      
      // Update description text
      const newText = item.dataset.text
      if (newText) {
        categoriesText.textContent = newText
      }
    })
  })
}

// Page hero image aspect ratio sync (desktop only)
const pageHeroText = document.querySelector('.page-hero-text')
const pageHeroImage = document.querySelector('.page-hero-image')

// Check if we're on dealers page - don't sync height there
// Check by looking for conditions-section which is unique to dealers page
function isDealersPage() {
  const path = window.location.pathname
  const href = window.location.href
  return path.includes('dealers.html') || 
         path.includes('/dealers') ||
         href.includes('dealers.html') ||
         href.includes('/dealers') ||
         document.querySelector('.conditions-section') !== null ||
         document.title.includes('Дилер') ||
         document.title.includes('дилер')
}

if (pageHeroText && pageHeroImage && !isDealersPage()) {
  function syncPageHeroImage() {
    // Double check we're not on dealers page
    if (isDealersPage()) {
      // Reset any styles that might have been set
      pageHeroImage.style.aspectRatio = ''
      pageHeroImage.style.height = ''
      pageHeroText.style.height = ''
      return
    }
    
    // Only sync on desktop (width > 1024px)
    if (window.innerWidth <= 1024) {
      // Reset styles on mobile
      pageHeroImage.style.aspectRatio = ''
      pageHeroImage.style.height = ''
      pageHeroText.style.height = ''
      return
    }
    
    // Reset styles to get natural dimensions
    pageHeroImage.style.aspectRatio = '1 / 1'
    pageHeroImage.style.height = 'auto'
    pageHeroText.style.height = 'auto'
    
    // Force reflow
    pageHeroImage.offsetHeight
    
    // Get dimensions
    const imageWidth = pageHeroImage.offsetWidth
    const squareHeight = imageWidth // Height if image stays square
    const textHeight = pageHeroText.offsetHeight
    
    if (textHeight > squareHeight) {
      // Text is taller, remove aspect-ratio and stretch image to match text height
      pageHeroImage.style.aspectRatio = 'none'
      pageHeroImage.style.height = `${textHeight}px`
    } else {
      // Image square height is taller or equal, keep aspect-ratio and set text to match
      pageHeroImage.style.aspectRatio = '1 / 1'
      pageHeroImage.style.height = 'auto'
      pageHeroText.style.height = `${squareHeight}px`
    }
  }
  
  // Sync on load
  setTimeout(syncPageHeroImage, 0)
  
  // Sync on resize
  let resizeTimeout
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(syncPageHeroImage, 100)
  })
  
  // Sync when content changes
  const observer = new ResizeObserver(() => {
    if (!isDealersPage()) {
      syncPageHeroImage()
    }
  })
  observer.observe(pageHeroText)
  observer.observe(pageHeroImage)
} else if (pageHeroText && pageHeroImage && isDealersPage()) {
  // On dealers page, make sure styles are reset
  pageHeroImage.style.aspectRatio = ''
  pageHeroImage.style.height = ''
  pageHeroText.style.height = ''
}

// Refresh section image height sync (desktop only)
const refreshContent = document.querySelector('.refresh-content')
const refreshImage = document.querySelector('.refresh-image')

if (refreshContent && refreshImage) {
  function syncRefreshImageHeight() {
    // Only sync on desktop (width > 1024px)
    if (window.innerWidth <= 1024) {
      refreshImage.style.height = ''
      return
    }
    
    const contentHeight = refreshContent.offsetHeight
    refreshImage.style.height = `${contentHeight}px`
  }
  
  // Sync on load
  syncRefreshImageHeight()
  
  // Sync on resize
  window.addEventListener('resize', syncRefreshImageHeight)
  
  // Sync when content changes (e.g., FAQ toggles if they affect height)
  const observer = new ResizeObserver(() => {
    syncRefreshImageHeight()
  })
  observer.observe(refreshContent)
}

// FAQ Accordion
const faqItems = document.querySelectorAll('.faq-item')

if (faqItems.length > 0) {
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question')
    
    question.addEventListener('click', () => {
      // Close other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active')
        }
      })
      
      // Toggle current item
      item.classList.toggle('active')
    })
  })
}

// Form submission handler
const contactForms = document.querySelectorAll('.contact-form')

if (contactForms.length > 0) {
  // API endpoint - используем относительный путь для работы в одном приложении
  // В dev режиме будет проксироваться через Vite, на продакшене будет работать напрямую
  const API_URL = import.meta.env.VITE_API_URL || '/api/submit'

  // Функция для определения названия страницы
  const getPageName = () => {
    const path = window.location.pathname
    const filename = path.split('/').pop() || 'index.html'
    
    const pageNames = {
      'index.html': 'Главная страница',
      'hotels.html': 'Страница "Отелям"',
      'dealers.html': 'Страница "Дилерам"'
    }
    
    return pageNames[filename] || filename
  }

  // Функция для очистки ошибок
  const clearErrors = (form) => {
    form.querySelectorAll('.form-group').forEach(group => {
      group.classList.remove('error')
      const input = group.querySelector('input, textarea')
      if (input) {
        input.classList.remove('error')
      }
      const errorMsg = group.querySelector('.error-message')
      if (errorMsg) {
        errorMsg.remove()
      }
    })
  }

  // Функция для показа ошибки
  const showError = (input, message) => {
    const formGroup = input.closest('.form-group')
    if (!formGroup) return
    
    formGroup.classList.add('error')
    input.classList.add('error')
    
    // Удаляем предыдущее сообщение об ошибке
    const existingError = formGroup.querySelector('.error-message')
    if (existingError) {
      existingError.remove()
    }
    
    // Создаем новое сообщение об ошибке
    const errorMsg = document.createElement('div')
    errorMsg.className = 'error-message'
    errorMsg.textContent = message
    formGroup.appendChild(errorMsg)
  }

  // Функция валидации
  const validateForm = (form) => {
    let isValid = true
    clearErrors(form)

    // Валидация имени
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

    // Валидация телефона
    const phoneInput = form.querySelector('#phone')
    if (phoneInput) {
      const phone = phoneInput.value.trim()
      if (!phone) {
        showError(phoneInput, 'Пожалуйста, укажите ваш телефон')
        isValid = false
      } else {
        // Простая валидация телефона (цифры, +, -, пробелы, скобки)
        const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
          showError(phoneInput, 'Пожалуйста, укажите корректный номер телефона')
          isValid = false
        }
      }
    }

    // Валидация email (если указан)
    const emailInput = form.querySelector('#email')
    if (emailInput && emailInput.value.trim()) {
      const email = emailInput.value.trim()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        showError(emailInput, 'Пожалуйста, укажите корректный email адрес')
        isValid = false
      }
    }

    // Проверка согласия на обработку данных
    const privacyCheckbox = form.querySelector('#privacy')
    if (privacyCheckbox && !privacyCheckbox.checked) {
      alert('Необходимо согласие на обработку персональных данных')
      isValid = false
    }

    return isValid
  }

  contactForms.forEach(form => {
    // Валидация при потере фокуса
    form.querySelectorAll('input, textarea').forEach(input => {
      input.addEventListener('blur', () => {
        if (input.id === 'name' || input.id === 'phone' || input.id === 'email') {
          const formGroup = input.closest('.form-group')
          if (formGroup && formGroup.classList.contains('error')) {
            // Перепроверяем только это поле
            if (input.id === 'name') {
              const name = input.value.trim()
              if (name && name.length >= 2) {
                formGroup.classList.remove('error')
                input.classList.remove('error')
                const errorMsg = formGroup.querySelector('.error-message')
                if (errorMsg) errorMsg.remove()
              }
            } else if (input.id === 'phone') {
              const phone = input.value.trim()
              if (phone) {
                const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/
                if (phoneRegex.test(phone.replace(/\s/g, ''))) {
                  formGroup.classList.remove('error')
                  input.classList.remove('error')
                  const errorMsg = formGroup.querySelector('.error-message')
                  if (errorMsg) errorMsg.remove()
                }
              }
            } else if (input.id === 'email') {
              const email = input.value.trim()
              if (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                formGroup.classList.remove('error')
                input.classList.remove('error')
                const errorMsg = formGroup.querySelector('.error-message')
                if (errorMsg) errorMsg.remove()
              }
            }
          }
        }
      })
    })

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      // Валидация формы
      if (!validateForm(form)) {
        // Прокручиваем к первой ошибке
        const firstError = form.querySelector('.form-group.error')
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
          firstError.querySelector('input, textarea')?.focus()
        }
        return
      }
      
      // Получаем кнопку отправки
      const submitBtn = form.querySelector('button[type="submit"]')
      const originalText = submitBtn?.textContent
      
      // Собираем данные формы
      const formData = {
        name: form.querySelector('#name')?.value.trim() || '',
        phone: form.querySelector('#phone')?.value.trim() || '',
        comment: form.querySelector('#message')?.value.trim() || '',
        email: form.querySelector('#email')?.value.trim() || '',
        city: form.querySelector('#city')?.value.trim() || '',
        company: form.querySelector('#company')?.value.trim() || '',
        page: getPageName()
      }

      // Блокируем кнопку и показываем состояние загрузки
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Отправка...'
      }

      // Проверка наличия API_URL
      if (!API_URL) {
        alert('Ошибка конфигурации: API URL не настроен. Обратитесь к администратору.')
        console.error('VITE_API_URL не установлен в переменных окружения')
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = originalText
        }
        return
      }

      try {
        console.log('Отправка запроса на:', API_URL)
        console.log('Данные формы:', formData)
        
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        console.log('Ответ сервера:', response.status, response.statusText)
        console.log('Headers ответа:', [...response.headers.entries()])

        const data = await response.json().catch((err) => {
          console.error('Ошибка парсинга JSON:', err)
          return {}
        })
        
        console.log('Данные ответа:', data)
        
        if (response.ok) {
          alert('Заявка отправлена! Мы свяжемся с вами в ближайшее время.')
          form.reset()
          clearErrors(form)
        } else {
          console.error('Ошибка сервера:', data)
          alert(data.error || data.details || 'Ошибка сервера. Попробуйте позже.')
        }
      } catch (error) {
        console.error('Ошибка:', error)
        alert('Не удалось отправить данные. Проверьте подключение к интернету и убедитесь, что сервер запущен.')
      } finally {
        // Восстанавливаем кнопку
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = originalText
        }
      }
    })
  })
}
