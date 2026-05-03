import type { CatalogFilterGroupKey, CatalogFilterHelp, CatalogFilterHelpEntry } from './catalog-api'

export type CatalogFilterHelpModalElements = {
  modal: HTMLElement
  overlay: HTMLElement
  title: HTMLElement
  body: HTMLElement
  closeBtn: HTMLButtonElement | null
}

export type CatalogFilterHelpModalOptions = {
  lockScroll?: () => void
  unlockScroll?: () => void
}

const FILTER_HELP_KEYS: CatalogFilterGroupKey[] = [
  'collection',
  'size',
  'firmness',
  'type',
  'loadRange',
  'heightRange',
  'fillings',
  'features',
]

const DEFAULT_LOREM_P1 =
  'Этот абзац — временный текст для проверки вёрстки модального окна. Редактор заменит его в Strapi на пояснение, как выбрать значение фильтра в каталоге.'

const DEFAULT_LOREM_P2 =
  'Второй абзац — типографский набросок на русском языке: он помогает оценить межстрочные интервалы и отступы между блоками перед публикацией финального материала.'

const DEFAULT_FILTER_HELP: CatalogFilterHelp = {
  collection: {
    modalTitle: 'Как выбрать коллекцию',
    segments: [{ text: DEFAULT_LOREM_P1 }, { text: DEFAULT_LOREM_P2 }],
  },
  size: {
    modalTitle: 'Как выбрать размер',
    segments: [{ text: DEFAULT_LOREM_P1 }, { text: DEFAULT_LOREM_P2 }],
  },
  firmness: {
    modalTitle: 'Как выбрать жёсткость',
    segments: [{ text: DEFAULT_LOREM_P1 }, { text: DEFAULT_LOREM_P2 }],
  },
  type: {
    modalTitle: 'Как выбрать тип конструкции',
    segments: [{ text: DEFAULT_LOREM_P1 }, { text: DEFAULT_LOREM_P2 }],
  },
  loadRange: {
    modalTitle: 'Как выбрать нагрузку',
    segments: [{ text: DEFAULT_LOREM_P1 }, { text: DEFAULT_LOREM_P2 }],
  },
  heightRange: {
    modalTitle: 'Как выбрать высоту матраса',
    segments: [{ text: DEFAULT_LOREM_P1 }, { text: DEFAULT_LOREM_P2 }],
  },
  fillings: {
    modalTitle: 'Как выбрать наполнитель',
    segments: [{ text: DEFAULT_LOREM_P1 }, { text: DEFAULT_LOREM_P2 }],
  },
  features: {
    modalTitle: 'Как выбрать особенности',
    segments: [{ text: DEFAULT_LOREM_P1 }, { text: DEFAULT_LOREM_P2 }],
  },
}

export function mergeCatalogFilterHelpFromApi(api: CatalogFilterHelp | undefined): CatalogFilterHelp {
  const out: CatalogFilterHelp = { ...DEFAULT_FILTER_HELP }
  if (!api || typeof api !== 'object') return out
  for (const key of FILTER_HELP_KEYS) {
    const row = api[key]
    if (!row || typeof row !== 'object') continue
    const modalTitle = String(row.modalTitle || '').trim()
    const segments = Array.isArray(row.segments)
      ? row.segments
          .map((s) => ({
            text: String(s?.text || '').trim(),
            imageUrl: String(s?.imageUrl || '').trim() || undefined,
            imageAlt: String(s?.imageAlt || '').trim() || undefined,
          }))
          .filter((s) => s.text || s.imageUrl)
      : []
    if (!modalTitle && segments.length === 0) continue
    out[key] = {
      modalTitle: modalTitle || (DEFAULT_FILTER_HELP[key]?.modalTitle ?? ''),
      segments: segments.length ? segments : (DEFAULT_FILTER_HELP[key]?.segments ?? []),
    }
  }
  return out
}

let mergedHelpState: CatalogFilterHelp = mergeCatalogFilterHelpFromApi(undefined)

export function setCatalogFilterHelpFromApi(api: CatalogFilterHelp | undefined): void {
  mergedHelpState = mergeCatalogFilterHelpFromApi(api)
}

function renderHelpBody(root: HTMLElement, entry: CatalogFilterHelpEntry): void {
  root.replaceChildren()
  for (const seg of entry.segments) {
    const block = document.createElement('div')
    block.className = 'catalogue-new-filter-help-modal-segment'
    if (seg.text) {
      const p = document.createElement('p')
      p.className = 'catalogue-new-filter-help-modal-text'
      p.textContent = seg.text
      block.appendChild(p)
    }
    if (seg.imageUrl) {
      const fig = document.createElement('figure')
      fig.className = 'catalogue-new-filter-help-modal-figure'
      const img = document.createElement('img')
      img.className = 'catalogue-new-filter-help-modal-img'
      img.src = seg.imageUrl
      img.alt = seg.imageAlt || ''
      img.loading = 'lazy'
      fig.appendChild(img)
      block.appendChild(fig)
    }
    if (block.childNodes.length) root.appendChild(block)
  }
}

export function initCatalogFilterHelpModal(
  root: Document | HTMLElement,
  elements: CatalogFilterHelpModalElements,
  options: CatalogFilterHelpModalOptions = {},
): void {
  const close = (): void => {
    elements.modal.setAttribute('hidden', '')
    elements.title.textContent = ''
    elements.body.replaceChildren()
    options.unlockScroll?.()
    document.body.classList.remove('modal-open')
  }

  const open = (key: CatalogFilterGroupKey): void => {
    const entry = mergedHelpState[key]
    if (!entry) return
    elements.title.textContent = entry.modalTitle
    renderHelpBody(elements.body, entry)
    elements.modal.removeAttribute('hidden')
    options.lockScroll?.()
    document.body.classList.add('modal-open')
  }

  root.querySelectorAll<HTMLElement>('[data-filter-help-open]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      const key = String(btn.dataset.filterHelpOpen || '').trim() as CatalogFilterGroupKey
      if (!FILTER_HELP_KEYS.includes(key)) return
      open(key)
    })
  })

  elements.overlay.addEventListener('click', close)
  elements.closeBtn?.addEventListener('click', close)

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    if (!elements.modal.hasAttribute('hidden')) close()
  })
}
