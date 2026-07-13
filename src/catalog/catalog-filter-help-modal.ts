import { fetchCatalogFilters } from './catalog-api'
import { appendHelpInlineBold } from './catalog-filter-help-inline'
import {
  abandonCatalogModalLayer,
  finishCatalogModalLayer,
  prepareCatalogModalLayer,
  registerCatalogModal,
} from './catalog-modal-coordinator'
import type {
  CatalogFilterGroupKey,
  CatalogFilterHelp,
  CatalogFilterHelpEntry,
  CatalogFilterHelpSegment,
  CatalogFilterHelpSegmentVariant,
  CatalogFilterHelpSummary,
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

const SEGMENT_VARIANTS = new Set<CatalogFilterHelpSegmentVariant>([
  'intro',
  'heading',
  'paragraph',
  'listItem',
  'numberedListItem',
])

const FAVOURITES_SHARE_HELP_TEXT =
  'Вы можете отправить эту ссылку менеджеру или своему другу — так будет легче согласовать нужные позиции из каталога.'

const PRODUCT_SHARE_HELP_TEXT =
  'Вы можете отправить ссылку на эту позицию менеджеру или коллеге — так проще обсудить модель и параметры до заказа.'

const DEFAULT_SHARE_HELP: CatalogShareHelp = {
  favouritesShare: {
    modalTitle: 'Ссылка на подборку',
    segments: [{ variant: 'paragraph', text: FAVOURITES_SHARE_HELP_TEXT }],
  },
  productShare: {
    modalTitle: 'Ссылка на позицию',
    segments: [{ variant: 'paragraph', text: PRODUCT_SHARE_HELP_TEXT }],
  },
}

function normalizeSummary(raw: unknown): CatalogFilterHelpSummary | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const title = String((raw as CatalogFilterHelpSummary).title || 'Если коротко').trim() || 'Если коротко'
  const items = Array.isArray((raw as CatalogFilterHelpSummary).items)
    ? (raw as CatalogFilterHelpSummary).items
        .map((item) => ({
          lead: String(item?.lead || '').trim(),
          highlight: String(item?.highlight || '').trim(),
        }))
        .filter((item) => item.lead || item.highlight)
    : []
  if (!items.length) return undefined
  return { title, items }
}

function normalizeSegment(raw: unknown): CatalogFilterHelpSegment | null {
  if (!raw || typeof raw !== 'object') return null
  const text = String((raw as CatalogFilterHelpSegment).text || '').trim()
  const imageUrl = String((raw as CatalogFilterHelpSegment).imageUrl || '').trim() || undefined
  const imageAlt = String((raw as CatalogFilterHelpSegment).imageAlt || '').trim() || undefined
  const variantRaw = String((raw as CatalogFilterHelpSegment).variant || 'paragraph').trim()
  const variant = SEGMENT_VARIANTS.has(variantRaw as CatalogFilterHelpSegmentVariant)
    ? (variantRaw as CatalogFilterHelpSegmentVariant)
    : 'paragraph'
  const listIndexRaw = Number((raw as CatalogFilterHelpSegment).listIndex)
  const listIndex =
    variant === 'numberedListItem' && Number.isFinite(listIndexRaw) && listIndexRaw > 0
      ? listIndexRaw
      : undefined
  if (!text && !imageUrl) return null
  return { variant, text, listIndex, imageUrl, imageAlt }
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
    const summary = normalizeSummary(row.summary)
    const segments = Array.isArray(row.segments)
      ? row.segments.map(normalizeSegment).filter((s): s is CatalogFilterHelpSegment => Boolean(s))
      : []
    if (!modalTitle && segments.length === 0 && !summary) continue
    out[key] = {
      modalTitle: modalTitle || (defaults[key]?.modalTitle ?? ''),
      summary: summary ?? defaults[key]?.summary,
      segments: segments.length ? segments : (defaults[key]?.segments ?? []),
    }
  }
  return out
}

function mergeCatalogHelpState(filterHelp?: CatalogFilterHelp, shareHelp?: CatalogShareHelp): Partial<Record<CatalogHelpKey, CatalogFilterHelpEntry>> {
  return {
    ...mergeHelpEntriesFromApi({}, FILTER_HELP_KEYS, filterHelp),
    ...mergeHelpEntriesFromApi(DEFAULT_SHARE_HELP, SHARE_HELP_KEYS, shareHelp),
  }
}

let mergedHelpState: Partial<Record<CatalogHelpKey, CatalogFilterHelpEntry>> = mergeCatalogHelpState()

export function setCatalogFilterHelpFromApi(filterHelp?: CatalogFilterHelp, shareHelp?: CatalogShareHelp): void {
  mergedHelpState = mergeCatalogHelpState(filterHelp, shareHelp)
}

function createTextBlock(className: string, text: string): HTMLElement {
  const block = document.createElement('p')
  block.className = className
  appendHelpInlineBold(block, text)
  return block
}

function appendSegmentImage(block: HTMLElement, seg: CatalogFilterHelpSegment): void {
  if (!seg.imageUrl) return
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

function renderSummary(root: HTMLElement, summary: CatalogFilterHelpSummary): void {
  const box = document.createElement('aside')
  box.className = 'catalogue-new-filter-help-modal-summary'

  const title = document.createElement('p')
  title.className = 'catalogue-new-filter-help-modal-summary-title'
  title.textContent = summary.title
  box.appendChild(title)

  const list = document.createElement('ul')
  list.className = 'catalogue-new-filter-help-modal-summary-list'
  for (const item of summary.items) {
    const li = document.createElement('li')
    li.className = 'catalogue-new-filter-help-modal-summary-item'
    appendHelpInlineBold(li, item.lead)
    if (item.highlight) {
      const strong = document.createElement('strong')
      strong.textContent = item.highlight
      li.appendChild(strong)
    }
    list.appendChild(li)
  }
  box.appendChild(list)
  root.appendChild(box)
}

function flushListGroup(
  root: HTMLElement,
  group: CatalogFilterHelpSegment[],
  listKind: 'bullet' | 'numbered',
): void {
  if (!group.length) return
  const list = document.createElement(listKind === 'numbered' ? 'ol' : 'ul')
  list.className =
    listKind === 'numbered'
      ? 'catalogue-new-filter-help-modal-numbered-list'
      : 'catalogue-new-filter-help-modal-list'

  for (const seg of group) {
    const li = document.createElement('li')
    li.className =
      listKind === 'numbered'
        ? 'catalogue-new-filter-help-modal-numbered-list-item'
        : 'catalogue-new-filter-help-modal-list-item'

    if (listKind === 'numbered' && seg.listIndex) {
      const marker = document.createElement('span')
      marker.className = 'catalogue-new-filter-help-modal-number'
      marker.textContent = String(seg.listIndex)
      li.appendChild(marker)
    }

    const copy = document.createElement('span')
    copy.className = 'catalogue-new-filter-help-modal-list-copy'
    appendHelpInlineBold(copy, seg.text)
    li.appendChild(copy)
    list.appendChild(li)
  }

  root.appendChild(list)
}

function renderStandaloneSegment(root: HTMLElement, seg: CatalogFilterHelpSegment): void {
  const block = document.createElement('div')
  block.className = 'catalogue-new-filter-help-modal-segment'

  const variant = seg.variant || 'paragraph'
  if (variant === 'intro') {
    block.appendChild(createTextBlock('catalogue-new-filter-help-modal-intro', seg.text))
  } else if (variant === 'heading') {
    block.classList.add('catalogue-new-filter-help-modal-segment--heading')
    const heading = document.createElement('h3')
    heading.className = 'catalogue-new-filter-help-modal-heading'
    heading.textContent = seg.text
    block.appendChild(heading)
  } else {
    block.appendChild(createTextBlock('catalogue-new-filter-help-modal-text', seg.text))
  }

  appendSegmentImage(block, seg)
  if (block.childNodes.length) root.appendChild(block)
}

function renderHelpBody(root: HTMLElement, entry: CatalogFilterHelpEntry): void {
  root.replaceChildren()

  if (entry.summary?.items.length) {
    renderSummary(root, entry.summary)
  }

  let bulletGroup: CatalogFilterHelpSegment[] = []
  let numberedGroup: CatalogFilterHelpSegment[] = []

  const flushGroups = (): void => {
    flushListGroup(root, bulletGroup, 'bullet')
    flushListGroup(root, numberedGroup, 'numbered')
    bulletGroup = []
    numberedGroup = []
  }

  for (const seg of entry.segments) {
    const variant = seg.variant || 'paragraph'
    if (variant === 'listItem') {
      if (numberedGroup.length) {
        flushListGroup(root, numberedGroup, 'numbered')
        numberedGroup = []
      }
      bulletGroup.push(seg)
      continue
    }
    if (variant === 'numberedListItem') {
      if (bulletGroup.length) {
        flushListGroup(root, bulletGroup, 'bullet')
        bulletGroup = []
      }
      numberedGroup.push(seg)
      continue
    }

    flushGroups()
    renderStandaloneSegment(root, seg)
  }

  flushGroups()
}

export function initCatalogFilterHelpModal(
  root: Document | HTMLElement,
  elements: CatalogFilterHelpModalElements,
  options: CatalogFilterHelpModalOptions = {},
): void {
  const cleanup = (): void => {
    elements.modal.setAttribute('hidden', '')
    elements.title.textContent = ''
    elements.body.replaceChildren()
  }

  const close = (): void => {
    finishCatalogModalLayer(cleanup, options.unlockScroll)
  }

  const dismiss = (): void => {
    abandonCatalogModalLayer(cleanup, options.unlockScroll)
  }

  const open = (key: CatalogHelpKey): void => {
    const entry = mergedHelpState[key]
    if (!entry) return
    prepareCatalogModalLayer('filter-help')
    elements.title.textContent = entry.modalTitle
    renderHelpBody(elements.body, entry)
    elements.modal.removeAttribute('hidden')
    options.lockScroll?.()
    document.body.classList.add('modal-open')
  }

  registerCatalogModal('filter-help', elements.modal, { close, dismiss })

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
