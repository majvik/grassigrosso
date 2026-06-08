#!/usr/bin/env node
import {
  cleanupChromeSession,
  delay,
  startCatalogChromeSession,
} from './lib/catalog-chrome-session.mjs'
import { shouldRunBrowserSmoke } from './lib/catalog-smoke-env.mjs'

const baseUrl = String(process.env.CATALOG_PERF_BASE_URL || process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5174').replace(/\/+$/, '')
const apiBase = String(process.env.CATALOG_API_BASE_URL || '').replace(/\/+$/, '')
  || (baseUrl.includes(':5174') || baseUrl.includes(':5177') ? 'http://127.0.0.1:3000' : baseUrl)
const failures = []
const OVERALL_TIMEOUT_MS = Number(process.env.CATALOG_PERF_TIMEOUT_MS || 60000)
const runBrowser = shouldRunBrowserSmoke(baseUrl)

const BUDGET = {
  maxCardsInDom: Number(process.env.CATALOG_PERF_MAX_CARDS || 6),
  maxEagerImages: Number(process.env.CATALOG_PERF_MAX_EAGER || 2),
  maxUploadRequests: Number(process.env.CATALOG_PERF_MAX_UPLOADS || 10),
  maxDomNodes: Number(process.env.CATALOG_PERF_MAX_DOM_NODES || 900),
  maxListingJsonBytes: Number(process.env.CATALOG_PERF_MAX_LISTING_JSON || 28000),
}

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
      onCleanup: () => session.cdp.failPending('Perf runner cleaned up'),
    })
    session = null
  }
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})

if (runBrowser) {
  overallTimeoutId = setTimeout(() => {
    failures.push(`catalog perf exceeded ${OVERALL_TIMEOUT_MS}ms`)
    cleanup()
  }, OVERALL_TIMEOUT_MS)
}

async function fetchText(url) {
  let response
  try {
    response = await fetch(url)
  } catch (error) {
    throw new Error(`${url}: request failed: ${error.message}`)
  }
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.text()
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

async function waitFor(evaluate, label, expression, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evaluate(expression)
    if (value) return value
    await delay(250)
  }
  failures.push(`${label}: timed out`)
  return null
}

function assertListingPayload(listingPayload) {
  const listingBytes = JSON.stringify(listingPayload).length
  if (listingBytes > BUDGET.maxListingJsonBytes) {
    failures.push(`listing JSON ${listingBytes} B exceeds budget ${BUDGET.maxListingJsonBytes} B`)
  }
  const orient = (listingPayload.items || []).find((item) => item.slug === 'orient')
  if (orient?.gallery?.[0]?.sources) {
    failures.push('listing orient gallery must not include sources[]')
  }
  if (orient?.layersCatalog) {
    failures.push('listing orient must not include layersCatalog')
  }
  return listingBytes
}

function assertCatalogHtmlPreloads(html) {
  if (!html.includes('rel="preload"') || !html.includes('catalog-hero.avif')) {
    failures.push('catalog HTML missing hero AVIF preload link')
  }
  if (!html.includes('/api/catalog/products?view=listing')) {
    failures.push('catalog HTML missing listing API preload')
  }
}

function assertBrowserMetrics(listingBytes, metrics) {
  if (!metrics) {
    failures.push('failed to collect perf metrics')
    return
  }
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

try {
  const listingPayload = await fetchJson(`${apiBase}/api/catalog/products?view=listing`)
  const listingBytes = assertListingPayload(listingPayload)

  if (!runBrowser) {
    const html = await fetchText(`${baseUrl}/catalog`)
    assertCatalogHtmlPreloads(html)
    console.log('Catalog perf API/HTML metrics:', JSON.stringify({
      listingBytes,
      heroPreload: html.includes('catalog-hero.avif'),
      listingPreload: html.includes('/api/catalog/products?view=listing'),
      mode: 'remote-fetch',
    }, null, 2))
    console.log('Remote deploy: DOM perf skipped (headless Chrome unreliable on HTTPS). Use Cursor browser MCP for cards/eager/uploads.')
  } else {
    session = await startCatalogChromeSession(baseUrl)
    session.chrome.on('exit', (code, signal) => {
      if (cleaned) return
      failures.push(`Chrome exited early (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
      cleanup()
    })

    const evaluate = (expression, timeoutMs) => session.cdp.evaluate(expression, timeoutMs)

    await waitFor(
      evaluate,
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
        .some((l) => (l.getAttribute('href') || l.href || '').includes('catalog-hero'))
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

    assertBrowserMetrics(listingBytes, metrics)
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
