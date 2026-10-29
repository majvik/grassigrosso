#!/usr/bin/env node
import {
  cleanupChromeSession,
  delay,
  startCatalogChromeSession,
} from './lib/catalog-chrome-session.mjs'
import { shouldRunBrowserSmoke } from './lib/catalog-smoke-env.mjs'

const baseUrl = String(process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5174').replace(/\/+$/, '')
const runBrowser = shouldRunBrowserSmoke(baseUrl)
const EXPECTED_PRODUCT_COUNT = 47
const MIN_INITIAL_CARDS = 6
const MAX_INITIAL_CARDS = 12
const EXPECTED_CLASSIC_FILTER_COUNT = '6'
const EXPECTED_SIZE_SLUGS = [
  '140x190',
  '140x200',
  '160x190',
  '160x200',
  '180x190',
  '180x200',
]
const failures = []
const OVERALL_TIMEOUT_MS = Number(process.env.CATALOG_UI_TIMEOUT_MS || 75000)

let session = null
let cleaned = false
let overallTimeoutId = null

function cleanup() {
  if (cleaned) return
  cleaned = true
  if (overallTimeoutId) clearTimeout(overallTimeoutId)
  if (session) {
    cleanupChromeSession({
      ...session,
      onCleanup: () => session.cdp.failPending('Smoke runner was cleaned up'),
    })
    session = null
  }
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})

overallTimeoutId = setTimeout(() => {
  failures.push(`catalog ui smoke exceeded ${OVERALL_TIMEOUT_MS}ms`)
  cleanup()
}, OVERALL_TIMEOUT_MS)

async function waitFor(evaluate, label, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs
  let value
  while (Date.now() < deadline) {
    value = await evaluate(expression)
    if (value) return value
    await delay(200)
  }
  failures.push(`${label}: timed out`)
  return value
}

try {
  if (!runBrowser) {
    console.log(`Catalog UI smoke skipped for remote deploy: ${baseUrl}/catalog`)
    console.log('Use Cursor browser MCP (navigate + snapshot/CDP) for full UI checks on Timeweb dev/prod.')
    process.exit(0)
  }

  session = await startCatalogChromeSession(baseUrl)
  session.chrome.on('exit', (code, signal) => {
    if (cleaned) return
    failures.push(`Chrome exited early (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
    cleanup()
  })

  const { cdp } = session
  const evaluate = (expression, timeoutMs) => cdp.evaluate(expression, timeoutMs)
  const send = (method, params, timeoutMs) => cdp.send(method, params, timeoutMs)

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

  await waitFor(
    evaluate,
    'catalog results loaded',
    `document.querySelector('.catalogue-new-results strong')?.textContent?.trim() === '${EXPECTED_PRODUCT_COUNT}'`,
    30000,
  )

  const initial = await evaluate(`(() => ({
    url: location.pathname,
    cards: document.querySelectorAll('.catalogue-new-card').length,
    visible: [...document.querySelectorAll('.catalogue-new-card')].filter((card) => getComputedStyle(card).display !== 'none').length,
    results: document.querySelector('.catalogue-new-results strong')?.textContent?.trim() || '',
    consoleErrors: window.__catalogSmokeErrors || 0,
  }))()`)
  if (initial.url !== '/catalog') failures.push(`expected /catalog, got ${initial.url}`)
  if (initial.results !== String(EXPECTED_PRODUCT_COUNT)) {
    failures.push(`expected ${EXPECTED_PRODUCT_COUNT} results, got ${initial.results}`)
  }
  if (initial.cards < MIN_INITIAL_CARDS || initial.cards > MAX_INITIAL_CARDS) {
    failures.push(`expected ${MIN_INITIAL_CARDS}-${MAX_INITIAL_CARDS} cards in DOM during initial viewport fill, got ${initial.cards}`)
  }
  if (initial.visible < MIN_INITIAL_CARDS || initial.visible > MAX_INITIAL_CARDS) {
    failures.push(`expected ${MIN_INITIAL_CARDS}-${MAX_INITIAL_CARDS} visible cards during initial viewport fill, got ${initial.visible}`)
  }

  await evaluate(`(() => {
    const chip = document.querySelector('.catalogue-new-chip[data-filter-group="collection"][data-value="classic"]')
    if (!chip) return false
    chip.click()
    return true
  })()`)
  const classic = await waitFor(evaluate, 'classic filter applied', `(() => {
    const result = document.querySelector('.catalogue-new-results strong')?.textContent?.trim()
    return result === '${EXPECTED_CLASSIC_FILTER_COUNT}' ? { result } : false
  })()`)
  if (!classic) failures.push(`classic filter did not produce ${EXPECTED_CLASSIC_FILTER_COUNT} results`)

  const sizeMenuOk = await waitFor(evaluate, 'catalog size menu slugs', `(() => {
    const sizeSelect = document.querySelector('.catalogue-new-size-select[data-catalog-select="size"]')
    if (!sizeSelect) return false
    const trigger = sizeSelect.querySelector('.catalogue-new-size-select-trigger')
    if (!trigger) return false
    if (!sizeSelect.classList.contains('is-open')) {
      trigger.click()
    }
    const menu =
      document.querySelector('.catalogue-new-size-select-menu.is-portal-open')
      || sizeSelect.querySelector('.catalogue-new-size-select-menu')
    if (!menu || menu.hidden) return false
    const slugs = [...menu.querySelectorAll('.catalogue-new-size-select-option')]
      .filter((item) => !item.hidden && item.dataset.value && item.dataset.value !== 'all')
      .map((item) => item.dataset.value)
    const expected = ${JSON.stringify(EXPECTED_SIZE_SLUGS)}
    const banned = ['200x200','140x220','160x220','180x220','200x220','220x220']
    if (slugs.length !== expected.length) return false
    for (let i = 0; i < expected.length; i++) if (slugs[i] !== expected[i]) return false
    if (banned.some((b) => slugs.includes(b))) return false
    return { slugs: slugs.join(',') }
  })()`)
  if (!sizeMenuOk) failures.push(`catalog size menu: expected ${EXPECTED_SIZE_SLUGS.length} standard slugs in order`)

  await evaluate(`(() => {
    const option = document.querySelector('.catalogue-new-sort-option[data-value="height-desc"]')
    if (!option) return false
    option.click()
    return true
  })()`)
  const sorted = await waitFor(evaluate, 'height sort applied', `(() => {
    const visible = [...document.querySelectorAll('.catalogue-new-card')]
      .filter((card) => getComputedStyle(card).display !== 'none')
      .map((card) => Number(card.dataset.height || 0))
    return visible.length > 1 && visible[0] >= visible[visible.length - 1] ? visible : false
  })()`)
  if (!sorted) failures.push('height-desc sort did not order visible cards')

  await evaluate(`(() => {
    const favourite = [...document.querySelectorAll('.catalogue-new-card')]
      .find((card) => getComputedStyle(card).display !== 'none')
      ?.querySelector('.catalogue-new-favourite')
    if (!favourite) return false
    favourite.click()
    return true
  })()`)
  const favourite = await waitFor(evaluate, 'favourite toggled', `(() => {
    const count = document.querySelector('#catalogue-new-favourites-count')?.textContent?.trim()
    return count === '1' ? { count } : false
  })()`)
  if (!favourite) failures.push('favourite count did not become 1')

  await evaluate(`(() => {
    const card = [...document.querySelectorAll('.catalogue-new-card')]
      .find((item) => getComputedStyle(item).display !== 'none')
    if (!card) return false
    card.click()
    return true
  })()`)
  const productPage = await waitFor(evaluate, 'product page opened', `(() => {
    const page = document.querySelector('.catalogue-new-shared-product:not([hidden])')
    const title = page?.querySelector('.catalogue-new-shared-product-title')?.textContent?.trim()
    const specs = page?.querySelectorAll('.catalogue-new-shared-product-spec').length || 0
    const controls = page?.querySelectorAll('[data-shared-product-contact], [data-shared-product-similar], [data-shared-product-favourite], [data-shared-product-share]').length || 0
    const firmnessScale = page?.querySelector('[data-product-firmness-scale]')
    return location.search.startsWith('?product=') && page && title && specs >= 3 && controls === 4 && firmnessScale
      ? { title, specs, controls }
      : false
  })()`)
  if (!productPage) failures.push('product page did not open with specs and controls')

  const editorialDesktop = await waitFor(evaluate, 'product page uses editorial desktop layout without quick view', `(() => {
    const page = document.querySelector('.catalogue-new-shared-product[data-product-editorial]:not([hidden])')
    const masthead = page?.querySelector('[data-product-masthead]')
    const stage = page?.querySelector('[data-product-media-stage]')
    const info = page?.querySelector('[data-product-info-band]')
    const futureAction = page?.querySelector('[data-product-commerce-action-slot]')
    const mediaWall = page?.querySelector('[data-product-media-wall]')
    const mediaWallItems = mediaWall?.querySelectorAll('[data-product-media-wall-item]').length || 0
    const bentoAreas = [...(mediaWall?.querySelectorAll('[data-bento-area]') || [])]
      .map((item) => item.getAttribute('data-bento-area'))
    const specGroups = page?.querySelectorAll('[data-product-spec-group]').length || 0
    const specTabs = page?.querySelectorAll('[data-spec-segment]').length || 0
    const fillerCopy = page?.querySelector('.catalogue-new-shared-product-action-copy')
    const eyebrow = page?.querySelector('.catalogue-new-shared-product-eyebrow')
    const sectionLabel = page?.querySelector('.catalogue-new-shared-product-section-label')
    const titleActions = page?.querySelector('[data-product-title-actions]')
    const titleFavourite = titleActions?.querySelector('[data-shared-product-favourite]')
    const titleShare = titleActions?.querySelector('[data-shared-product-share].catalogue-new-shared-product-icon-action')
    const shareHelp = page?.querySelector('[data-filter-help-open="productShare"]')
    const tags = page?.querySelector('.catalogue-new-shared-product-tags')
    const firstSpec = page?.querySelector('.catalogue-new-shared-product-spec')
    const specGroupsRoot = page?.querySelector('.catalogue-new-shared-product-spec-groups')
    const contact = page?.querySelector('[data-shared-product-contact]')
    const actions = page?.querySelector('.catalogue-new-shared-product-actions')
    const firstBentoImage = mediaWall?.querySelector('[data-product-media-wall-item] img')
    const firstBentoItem = mediaWall?.querySelector('[data-product-media-wall-item]')
    const detailSlider = page?.querySelector('[data-product-detail-slider][data-media-source="detail"]')
    const bentoSource = mediaWall?.getAttribute('data-media-source')
    if (!page || !masthead || !stage || !info || !futureAction || document.querySelector('#catalogueImageModal')) return false
    const ordered = Boolean(stage.compareDocumentPosition(masthead) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(masthead.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING)
      && (!mediaWall || Boolean(info.compareDocumentPosition(mediaWall) & Node.DOCUMENT_POSITION_FOLLOWING))
    const stageRect = stage.getBoundingClientRect()
    const ratio = stageRect.width / Math.max(1, stageRect.height)
    const infoColumns = getComputedStyle(info).gridTemplateColumns.split(' ').filter(Boolean).length
    const tagsMarginTop = tags ? parseFloat(getComputedStyle(tags).marginTop) : 0
    const specColumns = firstSpec ? getComputedStyle(firstSpec).gridTemplateColumns.split(' ').map((value) => parseFloat(value)) : []
    const specWidth = firstSpec?.getBoundingClientRect().width || 0
    const specGroupColumns = specGroupsRoot ? getComputedStyle(specGroupsRoot).gridTemplateColumns.split(' ').filter(Boolean).length : 0
    const bentoColumnGap = mediaWall ? parseFloat(getComputedStyle(mediaWall).columnGap) : 0
    const bentoRowGap = mediaWall ? parseFloat(getComputedStyle(mediaWall).rowGap) : 0
    const bentoItemFillsRow = firstBentoItem ? firstBentoItem.getBoundingClientRect().height > 400 : false
    const bentoImageTransform = firstBentoImage ? getComputedStyle(firstBentoImage).transform : 'none'
    const contactDecoration = contact ? getComputedStyle(contact).textDecorationLine : ''
    const actionsBorderTop = actions ? parseFloat(getComputedStyle(actions).borderTopWidth) : 0
    const titleSize = parseFloat(getComputedStyle(page.querySelector('.catalogue-new-shared-product-title')).fontSize)
    const shareRect = titleShare?.getBoundingClientRect()
    return ordered
      && ratio >= 1.45
      && infoColumns === 1
      && specGroups === 2
      && specTabs === 0
      && !fillerCopy
      && !eyebrow
      && !sectionLabel
      && titleActions
      && titleFavourite
      && titleShare
      && detailSlider
      && (!mediaWall || bentoSource === 'bento')
      && !shareHelp
      && specGroupColumns === 2
      && (!mediaWall || (bentoColumnGap <= 24 && Math.abs(bentoColumnGap - bentoRowGap) < 0.5))
      && (!mediaWall || bentoItemFillsRow)
      && (!mediaWall || bentoImageTransform === 'none')
      && actionsBorderTop >= 1
      && titleSize <= 112
      && shareRect && Math.abs(shareRect.width - shareRect.height) < 1
      && (!mediaWall || (mediaWallItems >= 3 && ['main', 'top', 'bottom'].every((area) => bentoAreas.includes(area))))
  })()`)
  if (!editorialDesktop) {
    const diagnostic = await evaluate(`(() => {
      const page = document.querySelector('.catalogue-new-shared-product[data-product-editorial]:not([hidden])')
      const stage = page?.querySelector('[data-product-media-stage]')
      const masthead = page?.querySelector('[data-product-masthead]')
      const info = page?.querySelector('[data-product-info-band]')
      const share = page?.querySelector('[data-shared-product-share].catalogue-new-shared-product-icon-action')
      const rect = share?.getBoundingClientRect()
      return {
        page: Boolean(page), stage: Boolean(stage), masthead: Boolean(masthead), info: Boolean(info),
        ratio: stage ? stage.getBoundingClientRect().width / Math.max(1, stage.getBoundingClientRect().height) : 0,
        infoColumns: info ? getComputedStyle(info).gridTemplateColumns : '',
        specGroups: page?.querySelectorAll('[data-product-spec-group]').length || 0,
        specGroupColumns: page?.querySelector('.catalogue-new-shared-product-spec-groups') ? getComputedStyle(page.querySelector('.catalogue-new-shared-product-spec-groups')).gridTemplateColumns : '',
        detailSlider: Boolean(page?.querySelector('[data-product-detail-slider][data-media-source="detail"]')),
        actionsBorder: page?.querySelector('.catalogue-new-shared-product-actions') ? getComputedStyle(page.querySelector('.catalogue-new-shared-product-actions')).borderTopWidth : '',
        titleSize: page?.querySelector('.catalogue-new-shared-product-title') ? getComputedStyle(page.querySelector('.catalogue-new-shared-product-title')).fontSize : '',
        share: rect ? [rect.width, rect.height] : null,
      }
    })()`)
    console.error('editorial diagnostic', diagnostic)
  }

  await send('Page.navigate', { url: `${baseUrl}/catalog?product=imperio` })
  await waitFor(evaluate, 'product beyond initial catalogue batch opens directly', `(() => {
    const page = document.querySelector('.catalogue-new-shared-product:not([hidden])')
    return location.search === '?product=imperio'
      && page?.querySelector('.catalogue-new-shared-product-title')?.textContent?.trim() === 'Империо'
  })()`, 30000)

  const similarClicked = await evaluate(`(() => {
    const button = document.querySelector('[data-shared-product-similar]')
    if (!button) return false
    button.click()
    return true
  })()`)
  if (!similarClicked) failures.push('similar-products action is missing')
  await waitFor(evaluate, 'similar-products filters are applied in catalogue', `(() => {
    const active = [...document.querySelectorAll('[data-filter-group][aria-pressed="true"], [data-filter-group].is-active')]
    return location.search === '?similar=imperio' && active.length >= 2
  })()`, 30000)

  await send('Page.navigate', { url: `${baseUrl}/catalog?product=imperio` })
  await waitFor(evaluate, 'product restored before responsive checks', `Boolean(document.querySelector('.catalogue-new-shared-product[data-product-editorial]:not([hidden])'))`, 30000)

  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: true })
  await waitFor(evaluate, 'product page avoids cramped editorial columns on tablet', `(() => {
    const page = document.querySelector('.catalogue-new-shared-product[data-product-editorial]:not([hidden])')
    const info = page?.querySelector('[data-product-info-band]')
    if (!page || !info) return false
    const pageRect = page.getBoundingClientRect()
    const infoColumns = getComputedStyle(info).gridTemplateColumns.split(' ').filter(Boolean).length
    return infoColumns === 1 && pageRect.right <= document.documentElement.clientWidth + 1
  })()`)

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await waitFor(evaluate, 'product page preserves its responsive editorial flow', `(() => {
    const page = document.querySelector('.catalogue-new-shared-product[data-product-editorial]:not([hidden])')
    const info = page?.querySelector('[data-product-info-band]')
    if (!page || !info) return false
    const pageRect = page.getBoundingClientRect()
    const infoColumns = getComputedStyle(info).gridTemplateColumns.split(' ').filter(Boolean).length
    return infoColumns === 1 && pageRect.right <= document.documentElement.clientWidth + 1
  })()`)
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

  await send('Page.navigate', { url: `${baseUrl}/catalog` })
  await waitFor(evaluate, 'returned from product page to catalogue', `location.search === '' && Boolean(document.querySelector('.catalogue-new-card'))`)

  await evaluate(`document.querySelector('[data-filter-help-open="collection"]')?.click()`)
  await waitFor(evaluate, 'filter help modal uses shared shell and closes normally', `(() => {
    const overlay = document.querySelector('#catalogueFilterHelpModal')
    const dialog = overlay?.querySelector('.catalogue-new-filter-help-modal-dialog')
    const close = overlay?.querySelector('#catalogueFilterHelpModalClose')
    if (!overlay || overlay.hasAttribute('hidden') || !dialog || !close) return false
    const shared = overlay.classList.contains('site-modal-overlay')
      && dialog.classList.contains('site-modal-surface')
      && close.classList.contains('site-modal-close')
    close.click()
    return shared
  })()`)
  await waitFor(evaluate, 'filter help modal closed', `document.querySelector('#catalogueFilterHelpModal')?.hasAttribute('hidden') === true`)

  await evaluate(`document.querySelector('#catalogue-new-favourites-only-switch')?.click()`)
  await waitFor(evaluate, 'favourites mode opened', `document.querySelector('#catalogue-new-favourites-back-row')?.hidden === false`)
  await evaluate(`document.querySelector('#catalogue-new-favourites-clear-all')?.click()`)
  await waitFor(evaluate, 'favourites clear modal uses shared shell', `(() => {
    const overlay = document.querySelector('#catalogueFavouritesClearModal')
    const dialog = overlay?.querySelector('.catalogue-new-favourites-clear-modal-dialog')
    const close = overlay?.querySelector('#catalogueFavouritesClearModalClose')
    return Boolean(
      overlay && !overlay.hasAttribute('hidden')
      && overlay.classList.contains('site-modal-overlay')
      && dialog?.classList.contains('site-modal-surface')
      && close?.classList.contains('site-modal-close')
    )
  })()`)
  await evaluate(`document.querySelector('#catalogueFavouritesClearModalClose')?.click()`)
  await waitFor(evaluate, 'favourites clear modal closes from shared close control', `document.querySelector('#catalogueFavouritesClearModal')?.hasAttribute('hidden') === true`)

  const logs = await send('Runtime.evaluate', {
    expression: `(() => {
      const errors = window.__catalogSmokeErrors || 0
      return { errors }
    })()`,
    returnByValue: true,
  })
  if (logs.result?.value?.errors > 0) failures.push(`browser console errors: ${logs.result.value.errors}`)
} catch (error) {
  failures.push(error.message)
} finally {
  cleanup()
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Catalog UI smoke ok: ${baseUrl}/catalog`)
