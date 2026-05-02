export type CatalogSizeSelectController = {
  closeMenus: () => void
  placeMenu: () => void
  resolveMenu: (sizeSelectEl: Element | null) => Element | null
  containsActiveMenuTarget: (target: EventTarget | null) => boolean
  handleDocumentClick: (event: MouseEvent) => boolean
  hasOpenMenu: () => boolean
}

export type CatalogSizeSelectOptions = {
  onOptionSelected: (value: string) => boolean
}

export function initCatalogSizeSelect(
  sidebar: Element,
  options: CatalogSizeSelectOptions,
): CatalogSizeSelectController {
  let activeSizeSelectHost: Element | null = null
  let activeSizeSelectTrigger: HTMLElement | null = null
  let activeSizeSelectMenu: HTMLElement | null = null
  let sizeSelectScrollIndicatorTimer: ReturnType<typeof setTimeout> | null = null

  const markSizeMenuAsScrolling = (): void => {
    if (!activeSizeSelectMenu) return
    activeSizeSelectMenu.classList.add('is-scrolling')
    if (sizeSelectScrollIndicatorTimer) clearTimeout(sizeSelectScrollIndicatorTimer)
    sizeSelectScrollIndicatorTimer = setTimeout(() => {
      if (activeSizeSelectMenu) activeSizeSelectMenu.classList.remove('is-scrolling')
    }, 650)
  }

  const handleActiveSizeMenuWheel = (event: WheelEvent): void => {
    if (!activeSizeSelectMenu || !activeSizeSelectMenu.contains(event.target as Node | null)) return
    event.preventDefault()
    event.stopPropagation()
    activeSizeSelectMenu.scrollTop += event.deltaY
    markSizeMenuAsScrolling()
  }

  const handleGlobalWheelWhileSizeMenuOpen = (event: WheelEvent): void => {
    if (!activeSizeSelectMenu || !activeSizeSelectMenu.contains(event.target as Node | null)) return
    event.preventDefault()
    event.stopPropagation()
    activeSizeSelectMenu.scrollTop += event.deltaY
    markSizeMenuAsScrolling()
  }

  const resolveMenu = (sizeSelectEl: Element | null): Element | null => {
    if (!sizeSelectEl) return null
    const localMenu = sizeSelectEl.querySelector('.catalogue-new-size-select-menu')
    if (localMenu) return localMenu
    if (activeSizeSelectHost === sizeSelectEl && activeSizeSelectMenu) return activeSizeSelectMenu
    return null
  }

  const applySizeSelectAutocomplete = (sizeSelect: Element | null): void => {
    if (!sizeSelect) return
    const menu = resolveMenu(sizeSelect)
    if (!menu) return
    const input = menu.querySelector<HTMLInputElement>('.catalogue-new-size-select-search')
    if (!input) return
    const query = String(input.value || '').trim().toLowerCase()
    menu.querySelectorAll<HTMLElement>('.catalogue-new-size-select-option').forEach((option) => {
      const value = String(option.dataset.value || '')
      if (value === 'all') {
        option.classList.remove('is-filtered-out')
        option.dataset.autocompleteHidden = '0'
        const available = option.dataset.available !== '0'
        option.hidden = !available
        const optionRow = option.closest<HTMLElement>('li')
        if (optionRow) optionRow.hidden = !available
        return
      }
      const text = option.textContent?.trim().toLowerCase() || ''
      const matched = !query || text.includes(query)
      option.classList.toggle('is-filtered-out', !matched)
      option.dataset.autocompleteHidden = matched ? '0' : '1'
      const available = option.dataset.available !== '0'
      const shouldHide = !available || !matched
      option.hidden = shouldHide
      const optionRow = option.closest<HTMLElement>('li')
      if (optionRow) optionRow.hidden = shouldHide
    })
  }

  const resetSizeSelectAutocomplete = (sizeSelect: Element | null): void => {
    if (!sizeSelect) return
    const menu = resolveMenu(sizeSelect)
    if (!menu) return
    const input = menu.querySelector<HTMLInputElement>('.catalogue-new-size-select-search')
    if (input) input.value = ''
    menu.querySelectorAll<HTMLElement>('.catalogue-new-size-select-option').forEach((option) => {
      option.classList.remove('is-filtered-out')
      option.dataset.autocompleteHidden = '0'
      const available = option.dataset.available !== '0'
      option.hidden = !available
      const optionRow = option.closest<HTMLElement>('li')
      if (optionRow) optionRow.hidden = !available
    })
  }

  const closeMenus = (): void => {
    if (sizeSelectScrollIndicatorTimer) {
      clearTimeout(sizeSelectScrollIndicatorTimer)
      sizeSelectScrollIndicatorTimer = null
    }
    if (activeSizeSelectMenu) {
      activeSizeSelectMenu.removeEventListener('wheel', handleActiveSizeMenuWheel)
      activeSizeSelectMenu.classList.remove('is-scrolling')
    }
    document.removeEventListener('wheel', handleGlobalWheelWhileSizeMenuOpen, true)
    if (activeSizeSelectMenu && activeSizeSelectHost && activeSizeSelectMenu.parentElement !== activeSizeSelectHost) {
      activeSizeSelectHost.appendChild(activeSizeSelectMenu)
    }
    if (activeSizeSelectMenu) {
      activeSizeSelectMenu.classList.remove('is-portal-open')
      activeSizeSelectMenu.style.removeProperty('--catalogue-new-size-menu-width')
      activeSizeSelectMenu.style.removeProperty('--catalogue-new-size-menu-max-height')
      activeSizeSelectMenu.style.removeProperty('top')
      activeSizeSelectMenu.style.removeProperty('left')
      activeSizeSelectMenu.style.removeProperty('display')
    }
    sidebar.querySelectorAll('.catalogue-new-size-select').forEach((sizeSelect) => {
      sizeSelect.classList.remove('is-open')
      resetSizeSelectAutocomplete(sizeSelect)
      const trigger = sizeSelect.querySelector('.catalogue-new-size-select-trigger')
      const menu = sizeSelect.querySelector<HTMLElement>('.catalogue-new-size-select-menu')
      if (trigger) trigger.setAttribute('aria-expanded', 'false')
      if (menu) menu.hidden = true
    })
    sidebar.classList.remove('is-size-select-open')
    activeSizeSelectHost = null
    activeSizeSelectTrigger = null
    activeSizeSelectMenu = null
  }

  const placeMenu = (): void => {
    if (!activeSizeSelectMenu || !activeSizeSelectTrigger) return
    if (activeSizeSelectMenu.hidden) return
    const rect = activeSizeSelectTrigger.getBoundingClientRect()
    const viewportPadding = 8
    const nextLeft = Math.max(viewportPadding, Math.round(rect.left))
    const nextTop = Math.max(viewportPadding, Math.round(rect.bottom + 6))
    activeSizeSelectMenu.style.left = `${nextLeft}px`
    activeSizeSelectMenu.style.top = `${nextTop}px`
    activeSizeSelectMenu.style.setProperty('--catalogue-new-size-menu-width', `${Math.round(rect.width)}px`)
    activeSizeSelectMenu.style.setProperty('--catalogue-new-size-menu-max-height', 'calc(var(--catalogue-new-size-option-height) * 8)')
  }

  const applySizeSelectOption = (option: Element | null): boolean => {
    if (!option || !(option instanceof HTMLElement)) return false
    const sizeSelect = option.closest('.catalogue-new-size-select') || activeSizeSelectHost
    if (!sizeSelect || !(sizeSelect instanceof HTMLElement)) return false
    const groupName = sizeSelect.dataset.sizeGroup
    const value = String(option.dataset.value || 'all')
    if (groupName !== 'size') return false
    const shouldCloseAfterSelect = options.onOptionSelected(value)
    if (shouldCloseAfterSelect) closeMenus()
    return true
  }

  sidebar.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const trigger = event.target.closest<HTMLElement>('.catalogue-new-size-select-trigger')
    if (trigger) {
      const sizeSelect = trigger.closest('.catalogue-new-size-select')
      if (!sizeSelect) return
      const isOpen = sizeSelect.classList.contains('is-open')
      closeMenus()
      if (!isOpen) {
        sizeSelect.classList.add('is-open')
        trigger.setAttribute('aria-expanded', 'true')
        const menu = sizeSelect.querySelector<HTMLElement>('.catalogue-new-size-select-menu')
        if (menu) {
          activeSizeSelectHost = sizeSelect
          activeSizeSelectTrigger = trigger
          activeSizeSelectMenu = menu
          document.documentElement.appendChild(menu)
          menu.classList.add('is-portal-open')
          menu.hidden = false
          menu.style.display = 'block'
          menu.addEventListener('wheel', handleActiveSizeMenuWheel, { passive: false })
          document.addEventListener('wheel', handleGlobalWheelWhileSizeMenuOpen, { passive: false, capture: true })
          placeMenu()
          resetSizeSelectAutocomplete(sizeSelect)
        }
        sidebar.classList.add('is-size-select-open')
      }
      return
    }

    const option = event.target.closest('.catalogue-new-size-select-option')
    if (!option) return
    event.preventDefault()
    event.stopPropagation()
    applySizeSelectOption(option)
  })

  const onSizeSelectSearchInput = (event: Event): void => {
    if (!(event.target instanceof Element)) return
    const searchInput = event.target.closest('.catalogue-new-size-select-search')
    if (!searchInput) return
    const sizeSelect = searchInput.closest('.catalogue-new-size-select') || activeSizeSelectHost
    applySizeSelectAutocomplete(sizeSelect)
  }
  sidebar.addEventListener('input', onSizeSelectSearchInput)
  document.addEventListener('input', onSizeSelectSearchInput)
  window.addEventListener('resize', placeMenu)
  document.addEventListener('scroll', placeMenu, true)

  return {
    closeMenus,
    placeMenu,
    resolveMenu,
    containsActiveMenuTarget: (target) => Boolean(activeSizeSelectMenu && target instanceof Node && activeSizeSelectMenu.contains(target)),
    handleDocumentClick: (event) => {
      if (!(event.target instanceof Element)) return false
      const sizeOption = event.target.closest('.catalogue-new-size-select-option')
      if (sizeOption && activeSizeSelectMenu && activeSizeSelectMenu.contains(sizeOption)) {
        event.preventDefault()
        event.stopPropagation()
        applySizeSelectOption(sizeOption)
        return true
      }
      return false
    },
    hasOpenMenu: () => Boolean(activeSizeSelectMenu && !activeSizeSelectMenu.hidden),
  }
}
