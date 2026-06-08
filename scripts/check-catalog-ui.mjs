#!/usr/bin/env node
import {
  cleanupChromeSession,
  delay,
  startCatalogChromeSession,
} from './lib/catalog-chrome-session.mjs'
import { shouldRunBrowserSmoke } from './lib/catalog-smoke-env.mjs'

const baseUrl = String(process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5177').replace(/\/+$/, '')
const runBrowser = shouldRunBrowserSmoke(baseUrl)
const EXPECTED_PRODUCT_COUNT = 43
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
const OVERALL_TIMEOUT_MS = Number(process.env.CATALOG_UI_TIMEOUT_MS || 45000)

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
  if (initial.cards > 6) failures.push(`expected at most 6 cards in DOM on first page, got ${initial.cards}`)
  if (initial.visible !== 6) failures.push(`expected first page to show 6 cards, got ${initial.visible}`)

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
  const modal = await waitFor(evaluate, 'modal opened', `(() => {
    const modal = document.querySelector('#catalogueImageModal')
    const title = document.querySelector('#catalogueImageModalTitle')?.textContent?.trim()
    const specs = document.querySelectorAll('.catalogue-new-image-modal-spec').length
    return modal && !modal.hasAttribute('hidden') && title && specs >= 4 ? { title, specs } : false
  })()`)
  if (!modal) failures.push('catalog modal did not open with specs')

  await evaluate(`document.querySelector('#catalogueImageModalClose')?.click()`)
  await waitFor(evaluate, 'modal closed', `document.querySelector('#catalogueImageModal')?.hasAttribute('hidden') === true`)

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
