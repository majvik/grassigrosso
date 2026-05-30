import { fetchCatalogFilters } from './catalog-api'
import type {
  CatalogFilterGroupKey,
  CatalogFilterHelp,
  CatalogFilterHelpEntry,
  CatalogHelpKey,
  CatalogShareHelp,
  CatalogShareHelpKey,
} from './catalog-api'

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

const SHARE_HELP_KEYS: CatalogShareHelpKey[] = ['favouritesShare', 'productShare']

const HELP_KEYS: CatalogHelpKey[] = [...FILTER_HELP_KEYS, ...SHARE_HELP_KEYS]

const FAVOURITES_SHARE_HELP_TEXT =
  'Вы можете отправить эту ссылку менеджеру или своему другу — так будет легче согласовать нужные позиции из каталога.'

const PRODUCT_SHARE_HELP_TEXT =
  'Вы можете отправить ссылку на эту позицию менеджеру или коллеге — так проще обсудить модель и параметры до заказа.'

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

const DEFAULT_SHARE_HELP: CatalogShareHelp = {
  favouritesShare: {
    modalTitle: 'Ссылка на подборку',
    segments: [{ text: FAVOURITES_SHARE_HELP_TEXT }],
  },
  productShare: {
    modalTitle: 'Ссылка на позицию',
    segments: [{ text: PRODUCT_SHARE_HELP_TEXT }],
  },
}

function mergeHelpEntriesFromApi<T extends string>(
  defaults: Partial<Record<T, CatalogFilterHelpEntry>>,
  allowedKeys: readonly T[],
  api: Partial<Record<T, CatalogFilterHelpEntry>> | undefined,
): Partial<Record<T, CatalogFilterHelpEntry>> {
  const out: Partial<Record<T, CatalogFilterHelpEntry>> = { ...defaults }
  if (!api || typeof api !== 'object') return out
  for (const key of allowedKeys) {
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
      modalTitle: modalTitle || (defaults[key]?.modalTitle ?? ''),
      segments: segments.length ? segments : (defaults[key]?.segments ?? []),
    }
  }
  return out
}

function mergeCatalogHelpState(filterHelp?: CatalogFilterHelp, shareHelp?: CatalogShareHelp): Partial<Record<CatalogHelpKey, CatalogFilterHelpEntry>> {
  return {
    ...mergeHelpEntriesFromApi(DEFAULT_FILTER_HELP, FILTER_HELP_KEYS, filterHelp),
    ...mergeHelpEntriesFromApi(DEFAULT_SHARE_HELP, SHARE_HELP_KEYS, shareHelp),
  }
}

let mergedHelpState: Partial<Record<CatalogHelpKey, CatalogFilterHelpEntry>> = mergeCatalogHelpState()

export function setCatalogFilterHelpFromApi(filterHelp?: CatalogFilterHelp, shareHelp?: CatalogShareHelp): void {
  mergedHelpState = mergeCatalogHelpState(filterHelp, shareHelp)
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

  const open = (key: CatalogHelpKey): void => {
    const entry = mergedHelpState[key]
    if (!entry) return
    elements.title.textContent = entry.modalTitle
    renderHelpBody(elements.body, entry)
    elements.modal.removeAttribute('hidden')
    options.lockScroll?.()
    document.body.classList.add('modal-open')
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    if (!target) return
    const btn = target.closest<HTMLElement>('[data-filter-help-open]')
    if (!btn) return
    event.preventDefault()
    event.stopPropagation()
    const key = String(btn.dataset.filterHelpOpen || '').trim() as CatalogHelpKey
    if (!HELP_KEYS.includes(key)) return
    void fetchCatalogFilters()
      .then(({ filterHelp, shareHelp }) => {
        mergedHelpState = mergeCatalogHelpState(filterHelp, shareHelp)
        open(key)
      })
      .catch(() => {
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
