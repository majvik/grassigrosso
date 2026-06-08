#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const baseUrl = String(process.env.CATALOG_PERF_BASE_URL || process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5174').replace(/\/+$/, '')
const apiBase = String(process.env.CATALOG_API_BASE_URL || '').replace(/\/+$/, '')
  || (baseUrl.includes(':5174') || baseUrl.includes(':5177') ? 'http://127.0.0.1:3000' : baseUrl)
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = Number(process.env.CHROME_DEBUG_PORT || (9300 + Math.floor(Math.random() * 400)))
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grass-catalog-perf-'))
const failures = []
const OVERALL_TIMEOUT_MS = Number(process.env.CATALOG_PERF_TIMEOUT_MS || 60000)

const BUDGET = {
  maxCardsInDom: Number(process.env.CATALOG_PERF_MAX_CARDS || 6),
  maxEagerImages: Number(process.env.CATALOG_PERF_MAX_EAGER || 2),
  maxUploadRequests: Number(process.env.CATALOG_PERF_MAX_UPLOADS || 10),
  maxDomNodes: Number(process.env.CATALOG_PERF_MAX_DOM_NODES || 900),
  maxListingJsonBytes: Number(process.env.CATALOG_PERF_MAX_LISTING_JSON || 28000),
}

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

function cleanup() {
  if (cleaned) return
  cleaned = true
  if (overallTimeoutId) clearTimeout(overallTimeoutId)
  for (const [id, entry] of pending.entries()) {
    pending.delete(id)
    entry.reject(new Error('Perf runner cleaned up'))
  }
  try { socket?.close() } catch {}
  try { chrome.kill('SIGKILL') } catch {}
  try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch {}
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})

overallTimeoutId = setTimeout(() => {
  failures.push(`catalog perf exceeded ${OVERALL_TIMEOUT_MS}ms`)
  cleanup()
}, OVERALL_TIMEOUT_MS)

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJson(url) {
  let response
  try {
    response = await fetch(url)
  } catch (error) {
    throw new Error(`${url}: request failed: ${error.message}`)
  }
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.json()
}

chrome.on('exit', (code, signal) => {
  if (cleaned) return
  failures.push(`Chrome exited early (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
  cleanup()
})

async function waitForDevtools() {
  const deadline = Date.now() + 10000
  let lastError
  while (Date.now() < deadline) {
    try {
      const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())
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
    socket.addEventListener('error', (event) => reject(event.error || new Error('WebSocket error')))
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
    }, 15000)
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

async function waitFor(label, expression, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evaluate(expression)
    if (value) return value
    await delay(250)
  }
  failures.push(`${label}: timed out`)
  return null
}

try {
  const listingPayload = await fetchJson(`${apiBase}/api/catalog/products?view=listing`)
  const listingBytes = JSON.stringify(listingPayload).length
  if (listingBytes > BUDGET.maxListingJsonBytes) {
    failures.push(`listing JSON ${listingBytes} B exceeds budget ${BUDGET.maxListingJsonBytes} B`)
  }
  const orient = (listingPayload.items || []).find((item) => item.slug === 'orient')
  if (orient?.gallery?.[0]?.sources) {
    failures.push('listing orient gallery must not include sources[]')
  }

  await delay(800)
  await connect(await waitForDevtools())
  await send('Runtime.enable')
  await send('Page.enable')

  await waitFor(
    'catalog results loaded',
    `document.querySelector('.catalogue-new-results strong')?.textContent?.trim() === '43'`,
  )

  const metrics = await evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const uploads = resources.filter((r) => r.name.includes('/uploads/'))
    const imgs = [...document.querySelectorAll('img')]
    const eager = imgs.filter((i) => i.loading === 'eager')
    const hiddenEager = eager.filter((i) => {
      const r = i.getBoundingClientRect()
      return r.width === 0 || r.height === 0 || i.offsetParent === null
    })
    const heroPreload = [...document.querySelectorAll('link[rel="preload"][as="image"]')]
      .some((l) => (l.getAttribute('href') || '').includes('catalog-hero'))
    return {
      cards: document.querySelectorAll('.catalogue-new-card').length,
      domNodes: document.getElementsByTagName('*').length,
      eager: eager.length,
      hiddenEager: hiddenEager.length,
      uploads: uploads.length,
      transferUploadsKB: Math.round(uploads.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
      ttfb: nav ? Math.round(nav.responseStart) : null,
      dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      heroPreload,
    }
  })()`)

  if (!metrics) failures.push('failed to collect perf metrics')
  else {
    if (metrics.cards > BUDGET.maxCardsInDom) {
      failures.push(`cards in DOM ${metrics.cards} > ${BUDGET.maxCardsInDom}`)
    }
    if (metrics.eager > BUDGET.maxEagerImages) {
      failures.push(`eager images ${metrics.eager} > ${BUDGET.maxEagerImages}`)
    }
    if (metrics.hiddenEager > 0) {
      failures.push(`hidden eager images ${metrics.hiddenEager}`)
    }
    if (metrics.uploads > BUDGET.maxUploadRequests) {
      failures.push(`upload requests ${metrics.uploads} > ${BUDGET.maxUploadRequests}`)
    }
    if (metrics.domNodes > BUDGET.maxDomNodes) {
      failures.push(`DOM nodes ${metrics.domNodes} > ${BUDGET.maxDomNodes}`)
    }
    if (!metrics.heroPreload) {
      failures.push('missing hero AVIF preload link')
    }
    console.log('Catalog perf metrics:', JSON.stringify({ listingBytes, ...metrics }, null, 2))
  }
} catch (error) {
  failures.push(error.message)
} finally {
  cleanup()
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Catalog perf ok: ${baseUrl}/catalog`)
