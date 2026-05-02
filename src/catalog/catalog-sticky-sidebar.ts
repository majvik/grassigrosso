export type CatalogStickySidebarController = {
  scheduleSync: () => void
}

function readFirstGridTrackWidthPx(layoutEl: Element): number {
  const tpl = window.getComputedStyle(layoutEl).gridTemplateColumns || ''
  const first = tpl.trim().split(/\s+/)[0] || ''
  const match = /^([\d.]+)px$/i.exec(first)
  if (match) {
    const value = parseFloat(match[1])
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 320
  }
  return 320
}

function readBodyScale(): number {
  const computed = window.getComputedStyle(document.body).transform
  if (!computed || computed === 'none') return 1
  const match2d = computed.match(/^matrix\(([^)]+)\)$/)
  if (match2d) {
    const parts = match2d[1].split(',').map((value) => Number(value.trim()))
    return Number.isFinite(parts[0]) && parts[0] > 0 ? parts[0] : 1
  }
  const match3d = computed.match(/^matrix3d\(([^)]+)\)$/)
  if (match3d) {
    const parts = match3d[1].split(',').map((value) => Number(value.trim()))
    return Number.isFinite(parts[0]) && parts[0] > 0 ? parts[0] : 1
  }
  return 1
}

export function initCatalogStickySidebar(
  layout: HTMLElement,
  sidebar: HTMLElement,
  placeholder: HTMLElement,
): CatalogStickySidebarController {
  const stickyTopOffset = 16
  const desktopMedia = window.matchMedia('(min-width: 1025px)')

  const syncStickySidebar = (): void => {
    const isDesktop = desktopMedia.matches
    if (!isDesktop) {
      placeholder.classList.remove('is-active')
      placeholder.style.height = ''
      sidebar.classList.remove('is-fixed', 'is-bottom')
      sidebar.style.width = ''
      sidebar.style.left = ''
      sidebar.style.top = ''
      return
    }
    const layoutRect = layout.getBoundingClientRect()
    const sidebarHeight = sidebar.offsetHeight
    const sidebarVisualHeight = sidebar.getBoundingClientRect().height || sidebarHeight
    const bodyScale = readBodyScale()
    const reachedStickyArea = layoutRect.top <= stickyTopOffset
    const hasRoomInLayout = layoutRect.bottom - stickyTopOffset > 120
    const shouldFix = reachedStickyArea && hasRoomInLayout && layoutRect.bottom - stickyTopOffset > sidebarVisualHeight

    placeholder.style.height = shouldFix ? `${sidebarHeight}px` : ''
    placeholder.classList.toggle('is-active', shouldFix)
    sidebar.classList.toggle('is-fixed', shouldFix)
    sidebar.classList.remove('is-bottom')
    if (shouldFix) {
      // The placeholder is measurable only after is-active; before that it is display:none and rect.width is 0.
      const phRect = placeholder.getBoundingClientRect()
      const scaleSafe = bodyScale > 0 ? bodyScale : 1
      const colW = readFirstGridTrackWidthPx(layout)
      const measured = Math.max(phRect.width, placeholder.offsetWidth, 1)
      const rawW = measured >= 8 ? Math.min(colW, measured) : colW
      const widthPx = Math.max(1, Math.round(rawW / scaleSafe))
      sidebar.style.width = `${widthPx}px`
      sidebar.style.left = `${Math.round(phRect.left / scaleSafe)}px`
      sidebar.style.top = `${(stickyTopOffset / scaleSafe).toFixed(2)}px`
    } else {
      sidebar.style.width = ''
      sidebar.style.left = ''
      sidebar.style.top = ''
    }
  }

  let stickyRaf = 0
  const scheduleSync = (): void => {
    if (stickyRaf) cancelAnimationFrame(stickyRaf)
    stickyRaf = requestAnimationFrame(() => {
      stickyRaf = 0
      syncStickySidebar()
    })
  }

  scheduleSync()
  window.addEventListener('scroll', scheduleSync, { passive: true })
  window.addEventListener('resize', scheduleSync)
  desktopMedia.addEventListener('change', scheduleSync)

  return { scheduleSync }
}
