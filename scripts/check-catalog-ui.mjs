#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const baseUrl = String(process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5177').replace(/\/+$/, '')
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = Number(process.env.CHROME_DEBUG_PORT || (9200 + Math.floor(Math.random() * 400)))
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grass-catalog-chrome-'))
const failures = []
const OVERALL_TIMEOUT_MS = Number(process.env.CATALOG_UI_TIMEOUT_MS || 45000)

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
let overallTimeoutId = null

function failPending(reason) {
  for (const [id, entry] of pending.entries()) {
    pending.delete(id)
    entry.reject(new Error(reason))
  }
}

function cleanup() {
  if (cleaned) return
  cleaned = true
  if (overallTimeoutId) clearTimeout(overallTimeoutId)
  failPending('Smoke runner was cleaned up')
  try { socket?.close() } catch {}
  try { chrome.kill('SIGKILL') } catch {}
  try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch {}
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})
chrome.on('exit', (code, signal) => {
  if (cleaned) return
  failures.push(`Chrome exited early (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
  cleanup()
})

overallTimeoutId = setTimeout(() => {
  failures.push(`catalog ui smoke exceeded ${OVERALL_TIMEOUT_MS}ms`)
  cleanup()
}, OVERALL_TIMEOUT_MS)

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
    let settled = false
    socket = new WebSocket(wsUrl)
    const settleResolve = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const settleReject = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    socket.addEventListener('open', settleResolve)
    socket.addEventListener('error', (event) => {
      settleReject(event.error || new Error('WebSocket connection error'))
    })
    socket.addEventListener('close', () => {
      failPending('WebSocket closed')
      settleReject(new Error('WebSocket closed before smoke finished'))
    })
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

  const sizeMenuOk = await waitFor('catalog size menu slugs', `(() => {
    const trigger = document.querySelector('.catalogue-new-size-select-trigger')
    if (!trigger) return false
    trigger.click()
    const slugs = [...document.querySelectorAll('.catalogue-new-size-select-option')]
      .map((item) => item.dataset.value)
      .filter((v) => v && v !== 'all')
    const expected = ['80x190','80x200','90x190','90x200','120x190','120x200','140x190','140x200','160x190','180x190','160x200','180x200']
    const banned = ['200x200','140x220','160x220','180x220','200x220','220x220']
    if (slugs.length !== 12) return false
    for (let i = 0; i < 12; i++) if (slugs[i] !== expected[i]) return false
    if (banned.some((b) => slugs.includes(b))) return false
    return { slugs: slugs.join(',') }
  })()`)
  if (!sizeMenuOk) failures.push('catalog size menu: expected 12 slugs in order, 180x190 after 160x190, no removed 220/200x200 line')

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
