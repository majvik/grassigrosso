function isDealersPage() {
  const path = window.location.pathname
  return path === '/dealers'
    || path === '/dealers.html'
    || document.querySelector('.conditions-section') !== null
    || document.title.includes('Дилер')
    || document.title.includes('дилер')
}

function setupPageHeroImageSync() {
  const pageHeroText = document.querySelector('.page-hero-text')
  const pageHeroImage = document.querySelector('.page-hero-image')
  if (!pageHeroText || !pageHeroImage) return

  const syncPageHeroImage = () => {
    if (isDealersPage()) {
      pageHeroImage.style.aspectRatio = ''
      pageHeroImage.style.height = ''
      pageHeroText.style.height = ''
      return
    }

    if (window.innerWidth <= 1024) {
      pageHeroImage.style.aspectRatio = ''
      pageHeroImage.style.height = ''
      pageHeroText.style.height = ''
      return
    }

    pageHeroImage.style.aspectRatio = '1 / 1'
    pageHeroImage.style.height = 'auto'
    pageHeroText.style.height = 'auto'
    pageHeroImage.offsetHeight

    const imageWidth = pageHeroImage.offsetWidth
    const squareHeight = imageWidth
    const textHeight = pageHeroText.offsetHeight

    if (textHeight > squareHeight) {
      pageHeroImage.style.aspectRatio = 'none'
      pageHeroImage.style.height = `${textHeight}px`
    } else {
      pageHeroImage.style.aspectRatio = '1 / 1'
      pageHeroImage.style.height = 'auto'
      pageHeroText.style.height = `${squareHeight}px`
    }
  }

  if (isDealersPage()) {
    pageHeroImage.style.aspectRatio = ''
    pageHeroImage.style.height = ''
    pageHeroText.style.height = ''
    return
  }

  setTimeout(syncPageHeroImage, 0)
  let resizeTimeout = null
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(syncPageHeroImage, 100)
  })

  const observer = new ResizeObserver(() => {
    if (!isDealersPage()) syncPageHeroImage()
  })
  observer.observe(pageHeroText)
  observer.observe(pageHeroImage)
}

function setupRefreshImageHeightSync() {
  const refreshContent = document.querySelector('.refresh-content')
  const refreshImage = document.querySelector('.refresh-image')
  if (!refreshContent || !refreshImage) return

  const syncRefreshImageHeight = () => {
    if (window.innerWidth <= 1024) {
      refreshImage.style.height = ''
      return
    }
    refreshImage.style.height = `${refreshContent.offsetHeight}px`
  }

  syncRefreshImageHeight()
  window.addEventListener('resize', syncRefreshImageHeight)
  const observer = new ResizeObserver(syncRefreshImageHeight)
  observer.observe(refreshContent)
}

function setupTopPaddingSync(rightSelector, titleSelector) {
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
  let resizeTimeout = null
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(syncPadding, 100)
  })

  const observer = new ResizeObserver(syncPadding)
  observer.observe(title)
}

export function initPageLayout() {
  setupPageHeroImageSync()
  setupRefreshImageHeightSync()
  setupTopPaddingSync('.catalog-custom-right', '.catalog-custom-left .section-title')
}
