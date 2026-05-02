#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const baseUrl = String(process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5177').replace(/\/+$/, '')
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = Number(process.env.CHROME_DEBUG_PORT || 9223)
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grass-catalog-chrome-'))
const failures = []

if (!fs.existsSync(chromePath)) {
  console.error(`Chrome not found: ${chromePath}`)
  process.exit(1)
}

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  `${baseUrl}/catalog`,
], { stdio: 'ignore' })

let socket
let nextId = 1
const pending = new Map()
let cleaned = false

function cleanup() {
  if (cleaned) return
  cleaned = true
  try { socket?.close() } catch {}
  try { chrome.kill('SIGTERM') } catch {}
  try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch {}
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.json()
}

async function waitForDevtools() {
  const deadline = Date.now() + 10000
  let lastError
  while (Date.now() < deadline) {
    try {
      const tabs = await fetchJson(`http://127.0.0.1:${port}/json/list`)
      const tab = tabs.find((item) => String(item.url || '').startsWith(`${baseUrl}/catalog`)) || tabs[0]
      if (tab?.webSocketDebuggerUrl) return tab.webSocketDebuggerUrl
    } catch (error) {
      lastError = error
    }
    await delay(200)
  }
  throw lastError || new Error('Chrome DevTools endpoint did not become ready')
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    socket = new WebSocket(wsUrl)
    socket.addEventListener('open', () => resolve())
    socket.addEventListener('error', reject)
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (!message.id) return
      const entry = pending.get(message.id)
      if (!entry) return
      pending.delete(message.id)
      if (message.error) entry.reject(new Error(message.error.message || JSON.stringify(message.error)))
      else entry.resolve(message.result)
    })
  })
}

function send(method, params = {}) {
  const id = nextId++
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    setTimeout(() => {
      if (!pending.has(id)) return
      pending.delete(id)
      reject(new Error(`${method} timed out`))
    }, 10000)
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime.evaluate exception')
  }
  return result.result?.value
}

async function waitFor(label, expression, timeoutMs = 10000) {
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
  await connect(await waitForDevtools())
  await send('Runtime.enable')
  await send('Page.enable')
  await waitFor('catalog cards loaded', 'document.querySelectorAll(".catalogue-new-card").length >= 100')

  const initial = await evaluate(`(() => ({
    url: location.pathname,
    cards: document.querySelectorAll('.catalogue-new-card').length,
    visible: [...document.querySelectorAll('.catalogue-new-card')].filter((card) => getComputedStyle(card).display !== 'none').length,
    results: document.querySelector('.catalogue-new-results strong')?.textContent?.trim() || '',
    consoleErrors: window.__catalogSmokeErrors || 0,
  }))()`)
  if (initial.url !== '/catalog') failures.push(`expected /catalog, got ${initial.url}`)
  if (initial.cards < 100) failures.push(`expected at least 100 cards, got ${initial.cards}`)
  if (initial.visible !== 6) failures.push(`expected first page to show 6 cards, got ${initial.visible}`)

  await evaluate(`(() => {
    const chip = document.querySelector('.catalogue-new-chip[data-filter-group="collection"][data-value="classic"]')
    if (!chip) return false
    chip.click()
    return true
  })()`)
  const classic = await waitFor('classic filter applied', `(() => {
    const result = document.querySelector('.catalogue-new-results strong')?.textContent?.trim()
    return result === '26' ? { result } : false
  })()`)
  if (!classic) failures.push('classic filter did not produce 26 results')

  await evaluate(`(() => {
    const trigger = document.querySelector('.catalogue-new-size-select-trigger')
    if (!trigger) return false
    trigger.click()
    const option = [...document.querySelectorAll('.catalogue-new-size-select-option')]
      .find((item) => item.dataset.value === '90x200')
    if (!option) return false
    option.click()
    return true
  })()`)
  const size = await waitFor('size filter applied', `(() => {
    const result = document.querySelector('.catalogue-new-results strong')?.textContent?.trim()
    return result === '8' ? { result } : false
  })()`)
  if (!size) failures.push('90x200 size filter did not produce 8 Classic results')

  await evaluate(`(() => {
    const option = document.querySelector('.catalogue-new-sort-option[data-value="height-desc"]')
    if (!option) return false
    option.click()
    return true
  })()`)
  const sorted = await waitFor('height sort applied', `(() => {
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
  const favourite = await waitFor('favourite toggled', `(() => {
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
  const modal = await waitFor('modal opened', `(() => {
    const modal = document.querySelector('#catalogueImageModal')
    const title = document.querySelector('#catalogueImageModalTitle')?.textContent?.trim()
    const specs = document.querySelectorAll('.catalogue-new-image-modal-spec').length
    return modal && !modal.hasAttribute('hidden') && title && specs >= 4 ? { title, specs } : false
  })()`)
  if (!modal) failures.push('catalog modal did not open with specs')

  await evaluate(`document.querySelector('#catalogueImageModalClose')?.click()`)
  await waitFor('modal closed', `document.querySelector('#catalogueImageModal')?.hasAttribute('hidden') === true`)

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
