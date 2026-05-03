function setupWelcomeModal({ lockScroll, unlockScroll }) {
  const welcomeModal = document.getElementById('welcomeModal')
  const welcomeCloseBtn = document.getElementById('welcomeClose')
  const welcomeCloseX = document.getElementById('welcomeCloseX')

  if (!welcomeModal) return

  let welcomeAutoClose = null

  const closeWelcomeModal = () => {
    if (welcomeAutoClose) {
      clearTimeout(welcomeAutoClose)
      welcomeAutoClose = null
    }
    welcomeModal.classList.remove('active')
    unlockScroll()
    document.body.classList.remove('modal-open')
  }

  requestAnimationFrame(() => {
    welcomeModal.classList.add('active')
    lockScroll()
    document.body.classList.add('modal-open')
    welcomeAutoClose = setTimeout(closeWelcomeModal, 30000)
  })

  welcomeCloseBtn?.addEventListener('click', closeWelcomeModal)
  welcomeCloseX?.addEventListener('click', (event) => {
    event.stopPropagation()
    closeWelcomeModal()
  })
  welcomeModal.addEventListener('click', (event) => {
    if (event.target === welcomeModal) closeWelcomeModal()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && welcomeModal.classList.contains('active')) {
      closeWelcomeModal()
    }
  })
}

function setupCookieBanner() {
  const cookieBanner = document.querySelector('.cookie-banner')
  const cookieBtn = document.querySelector('.btn-cookie')

  if (!cookieBtn || !cookieBanner) return

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

function setupCopyToast(copyToastRoot) {
  if (!copyToastRoot) return

  let copyToastHideTimer = null
  let copyToastRemoveHidingTimer = null

  const hideCopyToast = () => {
    copyToastRoot.classList.remove('copy-toast--show')
    copyToastRoot.classList.add('copy-toast--hiding')
    if (copyToastRemoveHidingTimer) clearTimeout(copyToastRemoveHidingTimer)
    copyToastRemoveHidingTimer = setTimeout(() => {
      copyToastRoot.setAttribute('hidden', '')
      copyToastRoot.classList.remove('copy-toast--hiding')
    }, 300)
  }

  const showCopyToast = () => {
    if (copyToastHideTimer) clearTimeout(copyToastHideTimer)
    if (copyToastRemoveHidingTimer) clearTimeout(copyToastRemoveHidingTimer)
    copyToastRoot.removeAttribute('hidden')
    copyToastRoot.classList.remove('copy-toast--hiding')
    requestAnimationFrame(() => {
      copyToastRoot.classList.add('copy-toast--show')
    })
    copyToastHideTimer = setTimeout(hideCopyToast, 3000)
  }

  const copyEmailToClipboard = (email) => {
    const done = () => showCopyToast()

    const fallbackCopy = () => {
      const textarea = document.createElement('textarea')
      textarea.value = email
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        if (document.execCommand('copy')) done()
      } catch (_) {}
      document.body.removeChild(textarea)
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(email).then(done).catch(fallbackCopy)
    } else {
      fallbackCopy()
    }
  }

  document.body.addEventListener('click', (event) => {
    const button = event.target.closest('.contacts-office-copy-email')
    if (!button) return
    const email = button.getAttribute('data-copy-email')
    if (!email) return
    event.preventDefault()
    copyEmailToClipboard(email)
  })
}

function setupContactsOfficeEmailRows() {
  const contactsOfficeEmailRows = document.querySelectorAll('.contacts-office-email-row')
  if (contactsOfficeEmailRows.length === 0) return

  const measureSingleLineHeightPx = (element) => {
    const styles = getComputedStyle(element)
    const fontSize = parseFloat(styles.fontSize) || 17
    const lineHeight = styles.lineHeight
    if (lineHeight && lineHeight !== 'normal') {
      const value = parseFloat(lineHeight)
      if (!Number.isNaN(value)) {
        return lineHeight.endsWith('%') ? (value / 100) * fontSize : value
      }
    }

    const probe = document.createElement('span')
    probe.textContent = 'Ay'
    probe.style.cssText = [
      'position:fixed',
      'left:-9999px',
      'top:0',
      'visibility:hidden',
      'pointer-events:none',
      'white-space:nowrap',
      `font-family:${styles.fontFamily}`,
      `font-size:${styles.fontSize}`,
      `font-weight:${styles.fontWeight}`,
      `font-style:${styles.fontStyle}`,
      `line-height:${styles.lineHeight}`,
      `letter-spacing:${styles.letterSpacing || 'normal'}`,
    ].join(';')
    document.body.appendChild(probe)
    const height = probe.offsetHeight
    probe.remove()
    return height > 0 ? height : fontSize * 1.4
  }

  const rangeHasMultipleLines = (link) => {
    try {
      const range = document.createRange()
      range.selectNodeContents(link)
      const rects = range.getClientRects()
      const tops = new Set()
      for (let index = 0; index < rects.length; index += 1) {
        const rect = rects[index]
        if (rect.width < 1 || rect.height < 1) continue
        tops.add(Math.round(rect.top * 2) / 2)
      }
      return tops.size > 1
    } catch (_) {
      return false
    }
  }

  const isMailtoWrapped = (link) => {
    if (!link) return false
    const lineHeight = measureSingleLineHeightPx(link)
    const tolerance = Math.max(6, Math.round(lineHeight * 0.08))
    if (link.offsetHeight > lineHeight + tolerance) return true
    return rangeHasMultipleLines(link)
  }

  const syncContactsOfficeEmailRow = (row) => {
    const link = row.querySelector('a[href^="mailto:"]')
    if (!link) return
    row.classList.toggle('contacts-office-email-row--wrapped', isMailtoWrapped(link))
  }

  let emailRowsLayoutRaf = null
  const scheduleSyncAllEmailRows = () => {
    if (emailRowsLayoutRaf != null) return
    emailRowsLayoutRaf = requestAnimationFrame(() => {
      emailRowsLayoutRaf = null
      contactsOfficeEmailRows.forEach(syncContactsOfficeEmailRow)
    })
  }

  contactsOfficeEmailRows.forEach((row) => {
    const link = row.querySelector('a[href^="mailto:"]')
    syncContactsOfficeEmailRow(row)
    const resizeObserver = new ResizeObserver(() => scheduleSyncAllEmailRows())
    resizeObserver.observe(row)
    if (link) resizeObserver.observe(link)
  })

  let resizeEmailRowsTimer = null
  window.addEventListener('resize', () => {
    clearTimeout(resizeEmailRowsTimer)
    resizeEmailRowsTimer = setTimeout(scheduleSyncAllEmailRows, 100)
  })

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleSyncAllEmailRows)
  }

  scheduleSyncAllEmailRows()
  setTimeout(scheduleSyncAllEmailRows, 0)
}

function setupNavMenu() {
  const navMenu = document.querySelector('.nav-menu')
  if (!navMenu) return

  const slider = document.createElement('span')
  slider.className = 'nav-menu-slider'
  slider.setAttribute('aria-hidden', 'true')
  navMenu.appendChild(slider)

  const positionSlider = (link) => {
    if (!link) {
      slider.style.width = '0'
      return
    }
    slider.style.left = `${link.offsetLeft}px`
    slider.style.width = `${link.offsetWidth}px`
  }

  const activeLink = navMenu.querySelector('a.active')
  positionSlider(activeLink || null)
  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('mouseenter', () => positionSlider(link))
  })
  navMenu.addEventListener('mouseleave', () => positionSlider(activeLink || null))
  window.addEventListener('resize', () => positionSlider(activeLink || null))
}

function setupMobileMenu() {
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn')
  const mobileMenuClose = document.querySelector('.mobile-menu-close')
  const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay')
  const mobileNavLinks = document.querySelectorAll('.mobile-nav a, .mobile-menu-cta')

  if (!mobileMenuBtn || !mobileMenuClose || !mobileMenuOverlay) return

  const closeMenu = () => {
    mobileMenuOverlay.classList.remove('active')
    document.body.style.overflow = ''
  }

  mobileMenuBtn.addEventListener('click', () => {
    mobileMenuOverlay.classList.add('active')
    document.body.style.overflow = 'hidden'
  })
  mobileMenuClose.addEventListener('click', closeMenu)
  mobileMenuOverlay.addEventListener('click', (event) => {
    if (event.target === mobileMenuOverlay) closeMenu()
  })
  mobileNavLinks.forEach((link) => {
    link.addEventListener('click', closeMenu)
  })
}

function setupHotelCategories() {
  const categoryItems = document.querySelectorAll('.category-item')
  const categoriesText = document.querySelector('.categories-text')

  if (categoryItems.length === 0 || !categoriesText) return

  categoryItems.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      categoryItems.forEach((otherItem) => {
        otherItem.classList.remove('category-active')
      })
      item.classList.add('category-active')
      const newText = item.dataset.text
      if (newText) categoriesText.textContent = newText
    })
  })
}

function setupFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item')
  if (faqItems.length === 0) return

  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question')
    question?.addEventListener('click', () => {
      faqItems.forEach((otherItem) => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active')
        }
      })
      item.classList.toggle('active')
    })
  })
}

function setupTopPaddingSync(leftSelector, rightSelector, titleSelector) {
  const right = document.querySelector(rightSelector)
  const title = document.querySelector(titleSelector)
  if (!right || !title) return

  const syncPadding = () => {
    if (window.innerWidth <= 1024) {
      right.style.paddingTop = '0'
      return
    }
    right.style.paddingTop = `${title.offsetHeight}px`
  }

  setTimeout(syncPadding, 0)
  let resizeTimer = null
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(syncPadding, 100)
  })

  const resizeObserver = new ResizeObserver(syncPadding)
  resizeObserver.observe(title)
}

export function initPageInteractions({ lockScroll, unlockScroll, copyToastRoot }) {
  setupWelcomeModal({ lockScroll, unlockScroll })
  setupCookieBanner()
  setupCopyToast(copyToastRoot)
  setupContactsOfficeEmailRows()
  setupNavMenu()
  setupMobileMenu()
  setupHotelCategories()
  setupFaqAccordion()

  setupTopPaddingSync('.catalog-custom-left', '.catalog-custom-right', '.catalog-custom-left .section-title')
  setupTopPaddingSync('.documents-certification-header-left', '.documents-certification-header-right', '.documents-certification-header-left .section-title')
  setupTopPaddingSync('.documents-help-left', '.documents-help-right', '.documents-help-left .section-title')
  setupTopPaddingSync('.documents-commercial-left', '.documents-commercial-right', '.documents-commercial-title')
}
