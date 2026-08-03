#!/usr/bin/env node
/**
 * Phase 4B DOM hydrate gate — index + download-catalog only.
 *
 * Requires local Vite. Stubs window.fetch for /api/pages/:slug so Node/Strapi
 * need not serve page payloads during the gate.
 *
 * Env:
 *   CATALOG_UI_BASE_URL / PAGES_CMS_UI_BASE_URL — default http://127.0.0.1:5174
 *   CATALOG_SMOKE_SKIP_BROWSER=1 — skip
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cleanupChromeSession,
  delay,
  startCatalogChromeSession,
} from './lib/catalog-chrome-session.mjs'
import { shouldRunBrowserSmoke } from './lib/catalog-smoke-env.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseUrl = String(
  process.env.PAGES_CMS_UI_BASE_URL || process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5174',
).replace(/\/+$/, '')
const runBrowser = shouldRunBrowserSmoke(baseUrl)
const OVERALL_TIMEOUT_MS = Number(process.env.PAGES_CMS_HYDRATE_DOM_TIMEOUT_MS || 120000)
const PHASE_PAGES = ['index', 'download-catalog']

const failures = []
let session = null
let cleaned = false
let overallTimeoutId = null

function assert(cond, message) {
  if (!cond) failures.push(message)
}

function cleanup() {
  if (cleaned) return
  cleaned = true
  if (overallTimeoutId) clearTimeout(overallTimeoutId)
  if (session) {
    cleanupChromeSession({
      ...session,
      onCleanup: () => session.cdp.failPending('hydrate-dom cleaned up'),
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
  failures.push(`pages-cms hydrate-dom exceeded ${OVERALL_TIMEOUT_MS}ms`)
  cleanup()
}, OVERALL_TIMEOUT_MS)

async function waitFor(evaluate, label, expression, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs
  let value
  while (Date.now() < deadline) {
    value = await evaluate(expression)
    if (value) return value
    await delay(150)
  }
  failures.push(`${label}: timed out`)
  return value
}

function pagePath(slug) {
  return slug === 'index' ? '/' : `/${slug}`
}

function loadDefaultsPayload(slug) {
  if (slug === 'index') {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'public/pages-index.snapshot.json'), 'utf8'))
  }
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public/pages-download-catalog.snapshot.json'), 'utf8'),
  )
}

function envelope(data, source = 'disk-snapshot') {
  return { data, source }
}

const FETCH_STUB_SOURCE = `(() => {
  if (window.__pagesCmsFetchStubInstalled) return
  window.__pagesCmsFetchStubInstalled = true
  window.__pagesCmsMock = { mode: 'pass' }
  const orig = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = String(typeof input === 'string' ? input : (input && input.url) || '')
    if (!url.includes('/api/pages/')) return orig(input, init)
    const mock = window.__pagesCmsMock || { mode: 'pass' }
    if (mock.mode === 'pass') return orig(input, init)
    if (mock.mode === 'hold') {
      const started = Date.now()
      while (window.__pagesCmsMock && window.__pagesCmsMock.mode === 'hold') {
        if (Date.now() - started > 20000) break
        await new Promise((r) => setTimeout(r, 50))
      }
      const next = window.__pagesCmsMock || { mode: 'fail', status: 503 }
      if (next.mode === 'json') {
        return new Response(JSON.stringify(next.body), {
          status: next.status || 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'held-timeout' }), {
        status: next.status || 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (mock.mode === 'json') {
      return new Response(JSON.stringify(mock.body), {
        status: mock.status || 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (mock.mode === 'invalid-json') {
      return new Response('{not-json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'mocked-failure' }), {
      status: mock.status || 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})()`

async function installFetchStub(cdp) {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: FETCH_STUB_SOURCE })
}

async function setMock(evaluate, mock) {
  const serialized = JSON.stringify(mock)
  await evaluate(`window.__pagesCmsMock = ${serialized}`)
}

async function navigate(cdp, slug) {
  const url = `${baseUrl}${pagePath(slug)}`
  await cdp.send('Page.navigate', { url })
  await waitFor(
    cdp.evaluate.bind(cdp),
    `${slug} document ready`,
    `document.readyState === 'complete' || document.readyState === 'interactive'`,
    20000,
  )
  await waitFor(
    cdp.evaluate.bind(cdp),
    `${slug} react root`,
    `!!document.querySelector('[data-react-root][data-react-page="${slug === 'index' ? 'index' : 'download-catalog'}"]')`,
    20000,
  )
  // Ensure stub present even if addScript raced (SPA soft nav unlikely; belt-and-suspenders).
  await cdp.evaluate(FETCH_STUB_SOURCE)
}

function criticalHooksExpr(slug) {
  if (slug === 'index') {
    return `(() => ({
      commercial: !!document.querySelector('#heroCommercialOfferLink'),
      play: !!document.querySelector('.hero-play-btn'),
      presentation: !!document.querySelector('[data-document="presentation"]'),
      heroTitle: (document.querySelector('.hero-title')?.textContent || '').replace(/\\s+/g, ' ').trim(),
      mainText: (document.querySelector('main')?.innerText || '').trim().length,
      rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
    }))()`
  }
  return `(() => ({
    downloadDoc: !!document.querySelector('[data-download-doc="catalog"]'),
    form: !!document.querySelector('[data-contact-form]'),
    name: !!document.querySelector('#name'),
    phone: !!document.querySelector('#phone'),
    email: !!document.querySelector('#email'),
    privacy: !!document.querySelector('#privacy'),
    honeypot: !!document.querySelector('#website'),
    title: (document.querySelector('#download-catalog-title')?.textContent || '').trim(),
    mainText: (document.querySelector('main')?.innerText || '').trim().length,
    rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
    slide0: !!document.querySelector('#catalog-hero-slide-0'),
  }))()`
}

function hooksReadyExpr(slug) {
  if (slug === 'index') {
    return `(() => {
      const commercial = !!document.querySelector('#heroCommercialOfferLink')
      const play = !!document.querySelector('.hero-play-btn')
      const presentation = !!document.querySelector('[data-document="presentation"]')
      const mainText = (document.querySelector('main')?.innerText || '').trim().length
      return commercial && play && presentation && mainText > 20
    })()`
  }
  return `(() => {
    const downloadDoc = !!document.querySelector('[data-download-doc="catalog"]')
    const form = !!document.querySelector('[data-contact-form]')
    const honeypot = !!document.querySelector('#website')
    const title = (document.querySelector('#download-catalog-title')?.textContent || '').trim()
    const mainText = (document.querySelector('main')?.innerText || '').trim().length
    return downloadDoc && form && honeypot && title.length > 0 && mainText > 20
  })()`
}

function geometryExpr(slug) {
  if (slug === 'index') {
    return `(() => {
      const box = (el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      return {
        hero: box(document.querySelector('.hero-title')),
        cta: box(document.querySelector('#heroCommercialOfferLink')),
        section: box(document.querySelector('.business-solutions')),
      }
    })()`
  }
  return `(() => {
    const box = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: r.top, left: r.left, width: r.width, height: r.height }
    }
    return {
      title: box(document.querySelector('#download-catalog-title')),
      form: box(document.querySelector('[data-contact-form]')),
      media: box(document.querySelector('.catalogue-new-shared-product-shell')),
    }
  })()`
}

function within1px(a, b, keys = ['left', 'width']) {
  if (!a || !b) return false
  return keys.every((k) => Math.abs((a[k] || 0) - (b[k] || 0)) <= 1)
}

async function runPageScenarios(slug) {
  const { cdp } = session
  const evaluate = (expression, timeoutMs) => cdp.evaluate(expression, timeoutMs)
  const fallbackPayload = loadDefaultsPayload(slug)
  const fallbackTitle =
    slug === 'index' ? 'Любовь с первого утра' : fallbackPayload.title || 'Скачать каталог'

  // --- Delayed API ---
  {
    await setMock(evaluate, { mode: 'hold' })
    // setMock before navigate won't stick across navigation — use addScript + set after load start.
    // Re-install hold via evaluateOnNewDocument pattern: navigate with hold baked into stub default for this scenario.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `${FETCH_STUB_SOURCE}; window.__pagesCmsMock = { mode: 'hold' };`,
    })
    await navigate(cdp, slug)
    await waitFor(evaluate, `${slug} delayed paint`, hooksReadyExpr(slug), 15000)

    const delayed = await evaluate(criticalHooksExpr(slug))
    assert(delayed?.mainText > 20, `${slug} delayed: empty main`)
    assert(!delayed?.rawHtml, `${slug} delayed: map_iframe_html leaked`)
    if (slug === 'index') {
      assert(delayed?.commercial && delayed?.play && delayed?.presentation, `${slug} delayed: missing critical hooks`)
      assert(String(delayed?.heroTitle || '').includes(fallbackTitle), `${slug} delayed: hero title missing`)
    } else {
      assert(delayed?.downloadDoc && delayed?.form && delayed?.honeypot, `${slug} delayed: missing form hooks`)
      assert(delayed?.title === fallbackTitle, `${slug} delayed: title mismatch (${delayed?.title})`)
      assert(delayed?.slide0, `${slug} delayed: slide0 missing`)
    }

    const geoBefore = await evaluate(geometryExpr(slug))
    await setMock(evaluate, { mode: 'json', status: 200, body: envelope(fallbackPayload) })
    await delay(900)
    const geoAfter = await evaluate(geometryExpr(slug))
    if (slug === 'index') {
      assert(within1px(geoBefore?.cta, geoAfter?.cta), `${slug} delayed FE-05: CTA left/width drift`)
      assert(within1px(geoBefore?.hero, geoAfter?.hero), `${slug} delayed FE-05: hero left/width drift`)
    } else {
      assert(within1px(geoBefore?.form, geoAfter?.form), `${slug} delayed FE-05: form left/width drift`)
      assert(within1px(geoBefore?.title, geoAfter?.title), `${slug} delayed FE-05: title left/width drift`)
    }
    console.log(`  ${slug} delayed: PASS`, JSON.stringify({ geoBefore, geoAfter }))
  }

  // --- Failure 503 ---
  {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `${FETCH_STUB_SOURCE}; window.__pagesCmsMock = { mode: 'fail', status: 503 };`,
    })
    await navigate(cdp, slug)
    await waitFor(evaluate, `${slug} failure paint`, hooksReadyExpr(slug), 15000)
    await delay(500)
    const failed = await evaluate(criticalHooksExpr(slug))
    assert(failed?.mainText > 20, `${slug} failure: blank main`)
    if (slug === 'index') {
      assert(String(failed?.heroTitle || '').includes(fallbackTitle), `${slug} failure: lost fallback title`)
      assert(failed?.commercial && failed?.presentation, `${slug} failure: lost hooks`)
    } else {
      assert(failed?.title === fallbackTitle, `${slug} failure: lost fallback title`)
      assert(failed?.downloadDoc && failed?.honeypot, `${slug} failure: lost hooks`)
    }
    assert(!failed?.rawHtml, `${slug} failure: map_iframe_html leaked`)
    console.log(`  ${slug} failure: PASS`)
  }

  // --- Success divergent ---
  {
    const divergent = structuredClone(fallbackPayload)
    if (slug === 'index') {
      divergent.hero = {
        ...divergent.hero,
        title: 'CMS Index Title Marker',
        cta_label: divergent.hero?.cta_label || 'CTA',
      }
    } else {
      divergent.title = 'CMS Download Title Marker'
      divergent.submit_label = 'CMS Submit Marker'
      divergent.lead = 'CMS Lead Marker'
    }

    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `${FETCH_STUB_SOURCE}; window.__pagesCmsMock = ${JSON.stringify({
        mode: 'json',
        status: 200,
        body: envelope(divergent, 'strapi'),
      })};`,
    })
    await navigate(cdp, slug)
    if (slug === 'index') {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('.hero-title')?.textContent?.includes('CMS Index Title Marker')`,
        15000,
      )
    } else {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('#download-catalog-title')?.textContent?.trim() === 'CMS Download Title Marker'`,
        15000,
      )
    }
    const ok = await evaluate(criticalHooksExpr(slug))
    assert(!ok?.rawHtml, `${slug} success: map_iframe_html leaked`)
    if (slug === 'index') {
      assert(ok?.commercial && ok?.play && ok?.presentation, `${slug} success: hooks changed/missing`)
      const formGeo = await evaluate(geometryExpr(slug))
      assert(formGeo?.cta && formGeo.cta.width > 0, `${slug} success: CTA geometry missing`)
      console.log(`  ${slug} success geometry:`, JSON.stringify(formGeo))
    } else {
      assert(ok?.downloadDoc && ok?.form && ok?.honeypot && ok?.slide0, `${slug} success: hooks/slides missing`)
      const lead = await evaluate(`document.querySelector('[data-download-lead]')?.textContent?.trim()`)
      assert(lead === 'CMS Lead Marker', `${slug} success: lead not hydrated (${lead})`)
      const submit = await evaluate(
        `document.querySelector('[data-contact-form] button[type="submit"]')?.textContent?.trim()`,
      )
      assert(submit === 'CMS Submit Marker', `${slug} success: submit not hydrated (${submit})`)
      const formGeo = await evaluate(geometryExpr(slug))
      assert(formGeo?.form && formGeo.form.width > 0, `${slug} success: form geometry missing`)
      // Divergent copy: left/width of form chrome must hold vs delayed/failure geometry class
      console.log(`  ${slug} success geometry:`, JSON.stringify(formGeo))
    }
    console.log(`  ${slug} success: PASS`)
  }

  // --- FE-05 parity (snapshot payload) ---
  {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `${FETCH_STUB_SOURCE}; window.__pagesCmsMock = { mode: 'hold' };`,
    })
    await navigate(cdp, slug)
    await waitFor(evaluate, `${slug} parity paint`, hooksReadyExpr(slug), 15000)
    const before = await evaluate(geometryExpr(slug))
    await setMock(evaluate, { mode: 'json', status: 200, body: envelope(fallbackPayload) })
    await delay(1000)
    const after = await evaluate(geometryExpr(slug))
    if (slug === 'index') {
      assert(
        within1px(before?.cta, after?.cta),
        `${slug} FE-05 parity: CTA left/width drift ${JSON.stringify({ before: before?.cta, after: after?.cta })}`,
      )
    } else {
      assert(within1px(before?.form, after?.form), `${slug} FE-05 parity: form left/width drift`)
      assert(
        within1px(before?.title, after?.title, ['left', 'width', 'top']),
        `${slug} FE-05 parity: title drift`,
      )
    }
    console.log(`  ${slug} FE-05 parity: PASS`, JSON.stringify({ before, after }))
  }
}

try {
  if (!runBrowser) {
    console.log(`pages-cms hydrate-dom skipped for remote/non-local: ${baseUrl}`)
    process.exit(0)
  }

  try {
    const probe = await fetch(`${baseUrl}/`)
    if (!probe.ok && probe.status !== 304) throw new Error(`HTTP ${probe.status}`)
  } catch (err) {
    console.error(
      `pages-cms hydrate-dom: base URL not reachable (${baseUrl}): ${err instanceof Error ? err.message : err}`,
    )
    console.error('Start Vite (npm run dev:web) and re-run.')
    process.exit(1)
  }

  session = await startCatalogChromeSession(baseUrl, '/')
  session.chrome.on('exit', (code, signal) => {
    if (cleaned) return
    failures.push(`Chrome exited early (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
    cleanup()
  })

  await installFetchStub(session.cdp)

  console.log(`pages-cms hydrate-dom: ${baseUrl} pages=${PHASE_PAGES.join(',')}`)
  for (const slug of PHASE_PAGES) {
    console.log(`\n── ${slug} ──`)
    await runPageScenarios(slug)
  }

  if (failures.length) {
    console.error('\npages-cms hydrate-dom FAILED')
    for (const f of failures) console.error(` - ${f}`)
    cleanup()
    process.exit(1)
  }

  console.log('\npages-cms hydrate-dom PASS (index + download-catalog)')
  cleanup()
  process.exit(0)
} catch (err) {
  console.error('pages-cms hydrate-dom crashed:', err)
  cleanup()
  process.exit(1)
}
