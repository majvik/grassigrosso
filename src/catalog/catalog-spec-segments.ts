import type { CatalogModalSpec } from './catalog-modal'

export type CatalogSpecSegment = 'main' | 'details'

export type CatalogSpecRowClasses = {
  row: string
  label: string
  value: string
}

const MODAL_SPEC_CLASSES: CatalogSpecRowClasses = {
  row: 'catalogue-new-image-modal-spec',
  label: 'catalogue-new-image-modal-spec-label',
  value: 'catalogue-new-image-modal-spec-value',
}

const SHARED_PRODUCT_SPEC_CLASSES: CatalogSpecRowClasses = {
  row: 'catalogue-new-shared-product-spec',
  label: 'catalogue-new-shared-product-spec-label',
  value: 'catalogue-new-shared-product-spec-value',
}

function escapeHtmlLite(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildSpecsHtml(specs: CatalogModalSpec[], classes: CatalogSpecRowClasses = MODAL_SPEC_CLASSES): string {
  return specs
    .map((spec) => {
      const valueStyle = spec.value.includes('\n') ? ' style="white-space:pre-line"' : ''
      return (
        `<div class="${classes.row}">` +
        `<span class="${classes.label}">${escapeHtmlLite(spec.label)}</span>` +
        `<span class="${classes.value}"${valueStyle}>${escapeHtmlLite(spec.value)}</span>` +
        `</div>`
      )
    })
    .join('')
}

export function renderSpecsIntoPanel(
  root: HTMLElement,
  specs: CatalogModalSpec[],
  classes: CatalogSpecRowClasses = MODAL_SPEC_CLASSES,
): void {
  root.replaceChildren()
  for (const spec of specs) {
    if (!spec.value) continue
    const row = document.createElement('div')
    row.className = classes.row
    const labelEl = document.createElement('span')
    labelEl.className = classes.label
    labelEl.textContent = spec.label
    const valueEl = document.createElement('span')
    valueEl.className = classes.value
    valueEl.textContent = spec.value
    if (spec.value.includes('\n')) {
      valueEl.style.whiteSpace = 'pre-line'
    }
    row.append(labelEl, valueEl)
    root.appendChild(row)
  }
}

export function setCatalogSpecSegment(root: HTMLElement, segment: CatalogSpecSegment): void {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-spec-segment]')]
  const panels = [...root.querySelectorAll<HTMLElement>('[data-spec-segment-panel]')]
  for (const button of buttons) {
    const isActive = button.dataset.specSegment === segment
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-selected', isActive ? 'true' : 'false')
    button.tabIndex = isActive ? 0 : -1
  }
  for (const panel of panels) {
    const isActive = panel.dataset.specSegmentPanel === segment
    panel.hidden = !isActive
  }
}

export function initCatalogSpecSegments(root: HTMLElement): void {
  if (root.dataset.specSegmentsInit === '1') return
  root.dataset.specSegmentsInit = '1'

  root.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('[data-spec-segment]')
    if (!button || !root.contains(button)) return
    const segment = String(button.dataset.specSegment || '').trim() as CatalogSpecSegment
    if (segment !== 'main' && segment !== 'details') return
    setCatalogSpecSegment(root, segment)
  })

  root.addEventListener('keydown', (event) => {
    const target = event.target
    if (!(target instanceof HTMLButtonElement) || !target.matches('[data-spec-segment]')) return
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-spec-segment]')]
    const index = buttons.indexOf(target)
    if (index < 0) return

    let nextIndex = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % buttons.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + buttons.length) % buttons.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = buttons.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextButton = buttons[nextIndex]
    const segment = String(nextButton.dataset.specSegment || '').trim() as CatalogSpecSegment
    if (segment === 'main' || segment === 'details') {
      setCatalogSpecSegment(root, segment)
      nextButton.focus()
    }
  })
}

export function buildCatalogSpecSegmentsShellHtml(
  mainHtml: string,
  detailsHtml: string,
  options: { idPrefix?: string; panelClass?: string } = {},
): string {
  const idPrefix = options.idPrefix || 'catalogSpec'
  const panelClass = options.panelClass || 'catalogue-new-image-modal-specs'
  const tabMainId = `${idPrefix}TabMain`
  const tabDetailsId = `${idPrefix}TabDetails`
  const panelMainId = `${idPrefix}PanelMain`
  const panelDetailsId = `${idPrefix}PanelDetails`

  return (
    `<div class="catalogue-new-spec-segments" data-catalog-spec-segments>` +
    `<div class="catalogue-new-spec-segments-control" role="tablist" aria-label="Раздел характеристик">` +
    `<button type="button" class="catalogue-new-spec-segments-btn is-active" role="tab" id="${tabMainId}" aria-selected="true" aria-controls="${panelMainId}" data-spec-segment="main" tabindex="0">Основные характеристики</button>` +
    `<button type="button" class="catalogue-new-spec-segments-btn" role="tab" id="${tabDetailsId}" aria-selected="false" aria-controls="${panelDetailsId}" data-spec-segment="details" tabindex="-1">Наполнение</button>` +
    `</div>` +
    `<div class="catalogue-new-spec-segments-panels">` +
    `<div class="${panelClass} catalogue-new-spec-segments-panel" id="${panelMainId}" role="tabpanel" aria-labelledby="${tabMainId}" data-spec-segment-panel="main">${mainHtml}</div>` +
    `<div class="${panelClass} catalogue-new-spec-segments-panel" id="${panelDetailsId}" role="tabpanel" aria-labelledby="${tabDetailsId}" data-spec-segment-panel="details" hidden>${detailsHtml}</div>` +
    `</div>` +
    `</div>`
  )
}

export function buildSharedProductSpecSegmentsHtml(
  mainSpecs: CatalogModalSpec[],
  detailsSpecs: CatalogModalSpec[],
): string {
  return buildCatalogSpecSegmentsShellHtml(
    buildSpecsHtml(mainSpecs, SHARED_PRODUCT_SPEC_CLASSES),
    buildSpecsHtml(detailsSpecs, SHARED_PRODUCT_SPEC_CLASSES),
    {
      idPrefix: 'sharedProductSpec',
      panelClass: 'catalogue-new-shared-product-specs catalogue-new-spec-segments-panel-inner',
    },
  )
}
