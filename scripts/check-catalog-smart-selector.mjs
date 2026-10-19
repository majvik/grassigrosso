#!/usr/bin/env node
import { cleanupChromeSession, delay, startCatalogChromeSession } from './lib/catalog-chrome-session.mjs'

const baseUrl = String(process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5174').replace(/\/+$/, '')
const failures = []
let session

async function waitFor(evaluate, label, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evaluate(expression)
    if (value) return value
    await delay(150)
  }
  failures.push(`${label}: timed out`)
  return false
}

try {
  session = await startCatalogChromeSession(baseUrl)
  const evaluate = (expression, timeoutMs) => session.cdp.evaluate(expression, timeoutMs)

  await waitFor(evaluate, 'smart selector trigger', `Boolean(document.querySelector('[data-smart-selector-trigger]'))`)
  await evaluate(`document.querySelector('[data-smart-selector-trigger]')?.click()`)
  await waitFor(evaluate, 'dialog opens at step 1 of 5', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const submit = dialog?.querySelector('[data-smart-selector-quick-submit]')
    const status = dialog?.querySelector('[data-smart-selector-profile-status]')
    return Boolean(dialog && dialog.textContent.includes('Шаг 1 из 5') && dialog.querySelectorAll('[data-smart-selector-question]').length === 1 && submit?.disabled && submit.textContent.includes('Подобрать матрас') && status?.textContent.includes('Профиль пока не заполнен'))
  })()`)

  await waitFor(evaluate, 'input example is typed into the placeholder', `(() => {
    const input = document.querySelector('[data-smart-selector-animated-placeholder]')
    return Boolean(input?.placeholder.startsWith('Например:') && input.placeholder.length > 12 && Number(input.dataset.placeholderExampleCount) >= 25)
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-animated-placeholder]')?.focus()`)
  await waitFor(evaluate, 'animated placeholder clears on focus', `document.querySelector('[data-smart-selector-animated-placeholder]')?.placeholder === ''`)

  await evaluate(`(() => {
    const input = document.querySelector('[data-smart-selector-input]')
    if (!input) return false
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'сплю на боку')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    return true
  })()`)
  await waitFor(evaluate, 'free text becomes a tag and enables submit', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const submit = dialog?.querySelector('[data-smart-selector-quick-submit]')
    return Boolean(dialog?.querySelector('[data-smart-selector-tags]')?.textContent.includes('сплю на боку') && submit && !submit.disabled)
  })()`)

  await evaluate(`document.querySelector('[data-smart-selector-option]')?.click()`)
  await waitFor(evaluate, 'option becomes a tag and advances', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    return Boolean(dialog?.textContent.includes('Шаг 2 из 5') && dialog.querySelector('[data-smart-selector-tags]')?.textContent.includes('Один'))
  })()`)

  await evaluate(`(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input, init) => String(input).includes('/api/catalog/smart-select')
      ? Promise.resolve(new Response(JSON.stringify({ filters: { firmness: ['soft'], heightRange: ['low'], fillings: ['coir'] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : originalFetch(input, init)
    return true
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-quick-submit]')?.click()`)
  await waitFor(evaluate, 'conflicting smart filters relax to nearest matching products', `(() => {
    const dialogClosed = !document.querySelector('[data-smart-selector-dialog]')
    const medium = document.querySelector('.catalogue-new-chip[data-filter-group="firmness"][data-value="medium"]')
    const soft = document.querySelector('.catalogue-new-chip[data-filter-group="firmness"][data-value="soft"]')
    const resultCount = Number(document.querySelector('.catalogue-new-results strong')?.textContent || 0)
    const emptyState = document.querySelector('.catalogue-new-empty-state')
    const firstCard = document.querySelector('.catalogue-new-card')
    return Boolean(dialogClosed && medium?.classList.contains('is-active') && !soft?.classList.contains('is-active') && resultCount > 6 && emptyState?.hidden && firstCard?.dataset.firmness === 'medium')
  })()`)
} catch (error) {
  failures.push(error.message)
} finally {
  if (session) cleanupChromeSession({ ...session, onCleanup: () => session.cdp.failPending('Smart selector smoke ended') })
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Catalog smart selector ok: ${baseUrl}/catalog`)
