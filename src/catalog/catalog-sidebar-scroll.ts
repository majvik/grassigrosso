export type CatalogSidebarScrollLockOptions = {
  shouldSkipWheel?: () => boolean
}

export function lockCatalogSidebarScroll(sidebar: HTMLElement, options: CatalogSidebarScrollLockOptions = {}): void {
  const isInsideSidebar = (target: EventTarget | null): boolean => target instanceof Element && sidebar.contains(target)
  const canScroll = (): boolean => sidebar.scrollHeight > sidebar.clientHeight + 1

  const handleWheelCapture = (event: WheelEvent): void => {
    if (options.shouldSkipWheel?.()) return
    if (!isInsideSidebar(event.target)) return
    if (!canScroll()) return
    event.preventDefault()
    event.stopPropagation()
    sidebar.scrollTop += event.deltaY
  }

  let lastTouchY = 0
  const handleTouchStartCapture = (event: TouchEvent): void => {
    if (!isInsideSidebar(event.target)) return
    if (!event.touches || event.touches.length === 0) return
    lastTouchY = event.touches[0].clientY
  }

  const handleTouchMoveCapture = (event: TouchEvent): void => {
    if (!isInsideSidebar(event.target)) return
    if (!canScroll()) return
    if (!event.touches || event.touches.length === 0) return
    const currentY = event.touches[0].clientY
    const delta = lastTouchY - currentY
    lastTouchY = currentY
    event.preventDefault()
    event.stopPropagation()
    sidebar.scrollTop += delta
  }

  document.addEventListener('wheel', handleWheelCapture, { passive: false, capture: true })
  document.addEventListener('touchstart', handleTouchStartCapture, { passive: true, capture: true })
  document.addEventListener('touchmove', handleTouchMoveCapture, { passive: false, capture: true })
}
