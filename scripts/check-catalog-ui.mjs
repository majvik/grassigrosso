#!/usr/bin/env node
import {
  cleanupChromeSession,
  delay,
  startCatalogChromeSession,
} from './lib/catalog-chrome-session.mjs'
import { shouldRunBrowserSmoke } from './lib/catalog-smoke-env.mjs'

const baseUrl = String(process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5174').replace(/\/+$/, '')
const runBrowser = shouldRunBrowserSmoke(baseUrl)
const EXPECTED_PRODUCT_COUNT = 45
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
  if (await evaluate(`[...document.querySelectorAll('.catalogue-new-card')]
    .some((card) => card.dataset.productName?.endsWith(' OLD'))`)) {
    failures.push('OLD products must stay behind the current products, even when recommended')
  }
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

  const deferredGallery = await waitFor(evaluate, 'deferred catalog gallery image loads', `(() => {
    const root = [...document.querySelectorAll('[data-catalog-card-media][data-catalog-gallery-enabled="true"]')]
      .find((item) => item.querySelector('[data-catalog-gallery-dot="1"]'))
    if (!root) return { skipped: true }
    const dot = root?.querySelector('[data-catalog-gallery-dot="1"]')
    if (!dot) return false
    dot.click()
    const image = root.querySelector('[data-catalog-gallery-slide="1"] img')
    if (!image || !image.complete || image.naturalWidth === 0) return false
    return image.dataset.placeholderApplied === 'true'
      ? false
      : { src: image.currentSrc, naturalWidth: image.naturalWidth }
  })()`, 15000)
  if (!deferredGallery) failures.push('second catalog gallery image fell back to a placeholder')

  await evaluate(`document.querySelector('.catalogue-new-chip[data-filter-group="collection"][data-value="relax"]')?.click()`)
  const davosPlaceholder = await waitFor(evaluate, 'Davos catalog image loads', `(() => {
    const image = document.querySelector('[data-catalog-card-media][data-product-slug="davos"] img')
    if (!image || !image.complete || image.naturalWidth === 0) return false
    const current = new URL(image.currentSrc || image.src, location.href).pathname
    return current.startsWith('/uploads/') && current.includes('RELAX_Davos_canonical_')
      ? { current }
      : false
  })()`, 15000)
  if (!davosPlaceholder) failures.push('Davos catalog card did not load the saved image')
  await evaluate(`document.querySelector('.catalogue-new-reset')?.click()`)
  await waitFor(evaluate, 'catalog filters reset after Davos media check', `document.querySelector('.catalogue-new-results strong')?.textContent?.trim() === '${EXPECTED_PRODUCT_COUNT}'`)

  for (const [type, count] of [['spring', 27], ['doubleSided', 20]]) {
    await evaluate(`document.querySelector('.catalogue-new-chip[data-filter-group="type"][data-value="${type}"]')?.click()`)
    await waitFor(evaluate, `construction filter ${type} includes the double-sided spring products`,
      `document.querySelector('.catalogue-new-results strong')?.textContent?.trim() === '${count}'`)
    await evaluate(`document.querySelector('.catalogue-new-reset')?.click()`)
    await waitFor(evaluate, 'construction filter reset',
      `document.querySelector('.catalogue-new-results strong')?.textContent?.trim() === '${EXPECTED_PRODUCT_COUNT}'`)
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
  const productPage = await waitFor(evaluate, 'new product page opened', `(() => {
    const page = document.querySelector('[data-product-prototype]')
    const title = page?.querySelector('.catalogue-new-shared-product-title')?.textContent?.trim()
    const slug = new URLSearchParams(location.search).get('product')
    return location.pathname === '/catalog' && slug && page && title
      ? { title, slug }
      : false
  })()`)
  if (!productPage) failures.push('card did not open the new product page with the selected slug')

  await send('Page.navigate', { url: `${baseUrl}/catalog?product=aspect` })
  const aspectMedia = await waitFor(evaluate, 'non-Davos cover and product slider media', `(() => {
    const cover = document.querySelector('img[data-product-cover-media]')
    const slider = document.querySelector('picture[data-media-slot="product-slider"] img')
    if (!cover || !slider || !slider.complete || slider.naturalWidth === 0) return false
    const coverUrl = new URL(cover.currentSrc || cover.src, location.href).pathname
    const sliderStyle = getComputedStyle(slider)
    return coverUrl === '/media-placeholders/product-cover-desktop.svg'
      && sliderStyle.objectFit === 'cover'
      && slider.clientWidth > 0
      && slider.clientHeight > 0
      && slider.dataset.placeholderApplied !== 'true'
      ? { coverUrl, sliderUrl: slider.currentSrc }
      : false
  })()`, 30000)
  if (!aspectMedia) failures.push('Aspect must use the neutral SVG cover and a real cover-fit slider image')
  await waitFor(evaluate, 'absent workbook product displays OLD in the title',
    `document.querySelector('.catalogue-new-shared-product-title')?.textContent?.trim() === 'Аспект OLD'`)

  for (const slug of ['orient', 'orient-plus']) {
    await send('Page.navigate', { url: `${baseUrl}/catalog?product=${slug}` })
    const mediaFallback = await waitFor(evaluate, `${slug} uses saved CMS media`, `(() => {
      const image = document.querySelector('picture[data-media-slot="product-slider"] img')
      if (!image || !image.complete || image.naturalWidth === 0) return false
      const current = new URL(image.currentSrc, location.href).pathname
      return current.startsWith('/uploads/')
        && image.dataset.placeholderApplied !== 'true'
        ? { current }
        : false
    })()`, 30000)
    if (!mediaFallback) failures.push(`${slug} did not render its saved Strapi media`)
  }

  await send('Page.navigate', { url: `${baseUrl}/catalog?product=davos` })
  const clearedDavos = await waitFor(evaluate, 'Davos uses the saved gallery and cover', `(() => {
    const slider = document.querySelector('picture[data-media-slot="product-slider"] img')
    const cover = document.querySelector('img[data-product-cover-media]')
    if (!slider || !cover || !slider.complete || slider.naturalWidth === 0) return false
    const sliderUrl = new URL(slider.currentSrc, location.href).pathname
    const coverUrl = new URL(cover.currentSrc, location.href).pathname
    return sliderUrl.includes('/uploads/') && sliderUrl.includes('RELAX_Davos_canonical_')
      && coverUrl.includes('/uploads/') && coverUrl.includes('RELAX_Davos_canonical_')
      && !document.querySelector('[data-product-editorial-gallery]')
      ? { sliderUrl, coverUrl }
      : false
  })()`, 30000)
  if (!clearedDavos) failures.push('Davos did not load its saved gallery and cover')

  await send('Page.navigate', { url: `${baseUrl}/catalog?product=orient` })
  await waitFor(evaluate, 'legacy compatibility product restored for remaining checks', `Boolean(document.querySelector('.catalogue-new-shared-product[data-product-editorial]:not([hidden])'))`, 30000)

  await waitFor(evaluate, 'product page uses the approved prototype layout without quick view', `(() => {
    const page = document.querySelector('.catalogue-new-shared-product[data-product-editorial]:not([hidden])')
    const stage = page?.querySelector('[data-product-media-stage]')
    const info = page?.querySelector('[data-product-info-band]')
    const legacyMediaWall = page?.querySelector('[data-product-media-wall], [data-bento-area]')
    const titleActions = document.querySelector('[data-product-title-actions]')
    const titleFavourite = titleActions?.querySelector('.catalogue-new-image-modal-favourite')
    const titleShare = titleActions?.querySelector('.catalogue-new-favourites-share-link-btn')
    const broken = [...page?.querySelectorAll('img') || []].filter((img) => img.complete && img.naturalWidth === 0)
    return Boolean(page && stage && info && titleActions && titleFavourite && titleShare)
      && !legacyMediaWall
      && !document.querySelector('#catalogueImageModal')
      && broken.length === 0
  })()`)

  await send('Page.navigate', { url: `${baseUrl}/catalog?product=lider` })
  await waitFor(evaluate, 'product renders both construction types with the Strapi name', `(() => {
    const page = document.querySelector('.catalogue-new-shared-product:not([hidden])')
    return page?.querySelector('.catalogue-new-shared-product-title')?.textContent?.trim() === 'Лидер Грей Софт'
      && [...page.querySelectorAll('dd')].some((cell) => cell.textContent.trim() === 'Пружинный, Двусторонний')
  })()`)

  for (const [slug, name, type] of [
    ['supreme-grey-soft', 'Суприм Грей Софт', 'Пружинный, Двусторонний'],
    ['balance-comfort', 'Баланс Кофморт', 'Беспружинный'],
  ]) {
    await send('Page.navigate', { url: `${baseUrl}/catalog?product=${slug}` })
    await waitFor(evaluate, `${slug} opens with its Strapi characteristics and placeholder`, `(() => {
      const page = document.querySelector('.catalogue-new-shared-product:not([hidden])')
      const slider = page?.querySelector('picture[data-media-slot="product-slider"] img')
      const coverLabel = [...(page?.querySelectorAll('dt') || [])].find((label) => label.textContent.trim() === 'Чехол')
      const cover = coverLabel?.nextElementSibling
      const singleLineCover = ${JSON.stringify(slug)} !== 'supreme-grey-soft'
        || (cover?.textContent.trim() === 'трикотаж gray soft с объёмной стежкой на холконе' && !cover.querySelector('br'))
      return singleLineCover && page?.querySelector('.catalogue-new-shared-product-title')?.textContent?.trim() === ${JSON.stringify(name)}
        && [...page.querySelectorAll('dd')].some((cell) => cell.textContent.trim() === ${JSON.stringify(type)})
        && slider?.complete && slider.naturalWidth > 0
        && new URL(slider.currentSrc || slider.src, location.href).pathname.startsWith('/media-placeholders/product-slider.')
    })()`)
  }

  for (const [slug, expected] of [
    ['hard-format', [['Сторона 1', '7/10', 7], ['Сторона 2', '8/10', 8]]],
    ['balance-comfort', [['', '7/10', 7]]],
  ]) {
    await send('Page.navigate', { url: `${baseUrl}/catalog?product=${slug}` })
    await waitFor(evaluate, `${slug} renders the Strapi firmness scores`, `(() => {
      const rows = [...document.querySelectorAll('[data-product-firmness-scale] .catalogue-new-firmness-row')]
      const actual = rows.map((row) => [
        row.querySelector('.catalogue-new-firmness-label')?.textContent.trim() || '',
        row.querySelector('.catalogue-new-firmness-score')?.textContent.trim(),
        row.querySelectorAll('.catalogue-new-firmness-segment.is-filled').length,
      ])
      const tags = [...document.querySelectorAll('.catalogue-new-shared-product-tags .catalogue-new-tag')]
        .map((tag) => tag.textContent.trim())
      const hasDescription = [...document.querySelectorAll('[data-product-editorial] p')]
        .some((p) => p.textContent.includes('14 сантиметров пены Flexi'))
      return (${JSON.stringify(slug)} !== 'hard-format'
          || (tags.includes('Беспружинный') && !tags.includes('Пружинный') && hasDescription))
        && JSON.stringify(actual) === JSON.stringify(${JSON.stringify(expected)})
    })()`)
  }

  await send('Page.navigate', { url: `${baseUrl}/catalog?product=imperio` })
  await waitFor(evaluate, 'product beyond initial catalogue batch opens directly', `(() => {
    const page = document.querySelector('.catalogue-new-shared-product:not([hidden])')
    return location.search === '?product=imperio'
      && page?.querySelector('.catalogue-new-shared-product-title')?.textContent?.trim() === 'Империо'
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

  await evaluate(`document.querySelector('[data-related-collection] a[href="/catalog?collection=relax"]')?.click()`)
  await waitFor(evaluate, 'product collection link opens the full Relax template', `(() => {
    const products = document.querySelector('[data-collection-products]')
    return location.search === '?collection=relax'
      && document.querySelector('[data-collection-hero] h1')?.textContent.trim() === 'Relax'
      && document.querySelector('[data-collection-hero-media] img')?.getAttribute('src') === '/media-placeholders/product-cover-desktop.svg'
      && !!products?.querySelector('article p')?.textContent.trim()
      && products.querySelector('article p').nextElementSibling?.matches('dl')
      && !![...(products?.querySelectorAll('dt') || [])].find((field) => field.textContent.trim() === 'Тип конструкции')
      && !![...(products?.querySelectorAll('dt') || [])].find((field) => field.textContent.trim() === 'Нагрузка')
      && !!products?.querySelector('a[href="/catalog?product=imperio"]')
      && !products.querySelector('a[href="/catalog?product=hard-format"]')
      && !document.querySelector('.catalogue-new-sidebar, .catalogue-new-results')
  })()`, 15000)
  for (const width of [390, 768]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true })
    await waitFor(evaluate, 'collection mobile description fills the card and divider follows the CTA', `(() => {
      const article = document.querySelector('[data-collection-products] article')
      const divider = article?.nextElementSibling
      const description = article?.querySelector('p')
      const cta = article?.querySelector('a:not([aria-label])')
      const image = article?.querySelector('img[alt^="Матрас"]')
      const cover = document.querySelector('[data-collection-hero-media] img')
      if (!description || !cta || !image || !divider?.hasAttribute('data-collection-divider')) return false
      const box = (element) => element.getBoundingClientRect()
      return cover?.currentSrc.endsWith('/media-placeholders/product-cover-mobile.svg')
        && Math.abs(box(description).width - box(article).width) < 1
        && box(image).bottom <= box(cta).top
        && box(cta).bottom <= box(divider).top
    })()`)
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await evaluate(`document.querySelector('[data-collection-products] a[href="/catalog?product=imperio"]')?.click()`)
  await waitFor(evaluate, 'collection card links back to the product page', `(() =>
    location.search === '?product=imperio' && !!document.querySelector('[data-product-editorial]')
  )()`)
  await send('Page.navigate', { url: `${baseUrl}/catalog?collection=flexi` })
  await waitFor(evaluate, 'collection template shows the requested collection', `(() => {
    const products = document.querySelector('[data-collection-products]')
    const firmnessRows = (slug) => {
      const card = products?.querySelector('a[href="/catalog?product=' + slug + '"]')?.closest('article')
      return [...(card?.querySelectorAll('[data-product-firmness-scale] .catalogue-new-firmness-row') || [])]
        .map((row) => [
          row.querySelector('.catalogue-new-firmness-label')?.textContent.trim() || '',
          row.querySelector('.catalogue-new-firmness-score')?.textContent.trim(),
        ])
    }
    return document.querySelector('[data-collection-hero] h1')?.textContent.trim() === 'Flexi'
      && JSON.stringify(firmnessRows('hard-format')) === JSON.stringify([['Сторона 1', '7/10'], ['Сторона 2', '8/10']])
      && JSON.stringify(firmnessRows('balance-comfort')) === JSON.stringify([['', '7/10']])
      && !!products?.querySelector('a[href="/catalog?product=hard-format"]')
      && !products.querySelector('a[href="/catalog?product=imperio"]')
  })()`, 15000)

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
