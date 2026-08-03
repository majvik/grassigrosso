#!/usr/bin/env node
/**
 * Phase 4B/C DOM hydrate gate — index + download-catalog + hotels + dealers.
 *
 * Requires local Vite. Stubs window.fetch for /api/pages/:slug.
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
const OVERALL_TIMEOUT_MS = Number(process.env.PAGES_CMS_HYDRATE_DOM_TIMEOUT_MS || 240000)
const PHASE_PAGES = ['index', 'download-catalog', 'hotels', 'dealers']
const FAILURE_MODES = [
  { id: '404', mock: { mode: 'fail', status: 404 } },
  { id: '503', mock: { mode: 'fail', status: 503 } },
  { id: 'network', mock: { mode: 'network' } },
  { id: 'invalid', mock: { mode: 'invalid-json' } },
]

const HOTELS_SECTIONS = [
  'page-hero',
  'hotel-categories-section',
  'product-cards-section',
  'discount-section',
  'contact-section',
  'refresh-section',
  'faq-section',
]
const DEALERS_SECTIONS = [
  'page-hero',
  'conditions-section',
  'offers-section',
  'geography-section',
  'quality-section',
  'requirements-section',
  'packages-section',
  'contact-section',
  'faq-section',
]

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

function reactPageAttr(slug) {
  return slug
}

function loadParityPayload(slug) {
  const file =
    slug === 'index'
      ? 'pages-index.snapshot.json'
      : slug === 'download-catalog'
        ? 'pages-download-catalog.snapshot.json'
        : slug === 'hotels'
          ? 'pages-hotels.snapshot.json'
          : 'pages-dealers.snapshot.json'
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'public', file), 'utf8'))
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
      if (next.mode === 'invalid-json') {
        return new Response('{not-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (next.mode === 'network') throw new TypeError('Failed to fetch')
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
    if (mock.mode === 'network') throw new TypeError('Failed to fetch')
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
  await evaluate(`window.__pagesCmsMock = ${JSON.stringify(mock)}`)
}

async function navigateWithMock(cdp, slug, mock) {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `${FETCH_STUB_SOURCE}; window.__pagesCmsMock = ${JSON.stringify(mock)};`,
  })
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
    `!!document.querySelector('[data-react-root][data-react-page="${reactPageAttr(slug)}"]')`,
    20000,
  )
  await cdp.evaluate(FETCH_STUB_SOURCE)
}

function hooksReadyExpr(slug) {
  if (slug === 'index') {
    return `(() => {
      const commercial = !!document.querySelector('#heroCommercialOfferLink')
      const play = !!document.querySelector('.hero-play-btn')
      const presentation = !!document.querySelector('[data-document="presentation"]')
      const baseline = document.querySelectorAll('[data-certification-baseline-card]').length
      const mainText = (document.querySelector('main')?.innerText || '').trim().length
      return commercial && play && presentation && baseline === 3 && mainText > 20
    })()`
  }
  if (slug === 'download-catalog') {
    return `(() => {
      const downloadDoc = !!document.querySelector('[data-download-doc="catalog"]')
      const form = !!document.querySelector('[data-contact-form]')
      const honeypot = !!document.querySelector('#website')
      const title = (document.querySelector('#download-catalog-title')?.textContent || '').trim()
      const mainText = (document.querySelector('main')?.innerText || '').trim().length
      return downloadDoc && form && honeypot && title.length > 0 && mainText > 20
    })()`
  }
  if (slug === 'hotels') {
    return `(() => {
      const commercial = !!document.querySelector('[data-open-commercial-offer]')
      const boxspring = !!document.querySelector('[data-catalog="boxspring"]')
      const accessories = !!document.querySelector('[data-catalog="accessories"]')
      const form = !!document.querySelector('[data-contact-form]')
      const mainText = (document.querySelector('main')?.innerText || '').trim().length
      return commercial && boxspring && accessories && form && mainText > 20
    })()`
  }
  return `(() => {
    const map = !!document.querySelector('#geographyMapContainer')
    const packages = ['standard','individual','exclusive'].every((v) =>
      !!document.querySelector('[data-package="' + v + '"]'),
    )
    const select = !!document.querySelector('select[name="package"]')
    const play = !!document.querySelector('#qualityVideo .hero-play-btn')
    const form = !!document.querySelector('[data-contact-form]')
    const mainText = (document.querySelector('main')?.innerText || '').trim().length
    return map && packages && select && play && form && mainText > 20
  })()`
}

function criticalHooksExpr(slug) {
  if (slug === 'index') {
    return `(() => {
      const baselineTitles = [...document.querySelectorAll('[data-certification-baseline-card] .certification-title')]
        .map((el) => (el.textContent || '').trim())
      return {
        commercial: !!document.querySelector('#heroCommercialOfferLink'),
        play: !!document.querySelector('.hero-play-btn'),
        presentation: !!document.querySelector('[data-document="presentation"]'),
        baselineCount: document.querySelectorAll('[data-certification-baseline-card]').length,
        certificationCardCount: document.querySelectorAll('.certification .certification-card').length,
        certificationChildren: [...document.querySelectorAll('.certification > *')]
          .map((el) => el.className),
        certificationGridChildren: document.querySelectorAll('.certification > .certification-grid > *').length,
        unexpectedIndexDocs: !!document.querySelector('[data-index-docs], .certification-docs'),
        topLevelSections: [...document.querySelectorAll('[data-react-root][data-react-page="index"] > section')]
          .map((el) => el.className),
        baselineTitles,
        solutions: document.querySelectorAll('.solution-card').length,
        collections: document.querySelectorAll('.collection-card').length,
        testimonials: new Set(
          [...document.querySelectorAll('.testimonial-card[data-testimonial-index]')].map((el) =>
            el.getAttribute('data-testimonial-index'),
          ),
        ).size,
        heroTitle: (document.querySelector('.hero-title')?.textContent || '').replace(/\\s+/g, ' ').trim(),
        poster: document.querySelector('.hero-poster img')?.getAttribute('src') || '',
        partners: document.querySelector('.partners-img-normal')?.getAttribute('src') || '',
        mainText: (document.querySelector('main')?.innerText || '').trim().length,
        rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
      }
    })()`
  }
  if (slug === 'download-catalog') {
    return `(() => ({
      downloadDoc: !!document.querySelector('[data-download-doc="catalog"]'),
      form: !!document.querySelector('[data-contact-form]'),
      honeypot: !!document.querySelector('#website'),
      privacy: !!document.querySelector('#privacy'),
      title: (document.querySelector('#download-catalog-title')?.textContent || '').trim(),
      lead: (document.querySelector('[data-download-lead]')?.textContent || '').trim(),
      submit: (document.querySelector('[data-contact-form] button[type="submit"]')?.textContent || '').trim(),
      catalogPdf: document.querySelector('[data-contact-form]')?.getAttribute('data-catalog-pdf') || '',
      slide0: !!document.querySelector('#catalog-hero-slide-0'),
      mainText: (document.querySelector('main')?.innerText || '').trim().length,
      rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
    }))()`
  }
  if (slug === 'hotels') {
    return `(() => ({
      commercial: !!document.querySelector('[data-open-commercial-offer]'),
      seasonal: !!document.querySelector('[data-open-commercial-offer="seasonal"]'),
      openCatalog: document.querySelectorAll('[data-open-catalog]').length,
      catalogs: [...document.querySelectorAll('[data-catalog]')].map((el) => el.getAttribute('data-catalog')),
      form: !!document.querySelector('[data-contact-form]'),
      honeypot: !!document.querySelector('#website'),
      topLevelSections: [...document.querySelectorAll('[data-react-root][data-react-page="hotels"] > section')]
        .map((el) => el.className),
      categories: document.querySelectorAll('.category-item').length,
      products: document.querySelectorAll('.product-card').length,
      discountRows: document.querySelectorAll('.discount-row').length,
      faq: document.querySelectorAll('[data-faq-item]').length,
      heroTitle: (document.querySelector('.page-hero-title')?.textContent || '').trim(),
      contactTitle: (document.querySelector('.contact-section .section-title')?.textContent || '').trim(),
      heroImg: document.querySelector('.page-hero-image img')?.getAttribute('src') || '',
      mainText: (document.querySelector('main')?.innerText || '').trim().length,
      rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
    }))()`
  }
  return `(() => ({
    map: !!document.querySelector('#geographyMapContainer'),
    mapImg: document.querySelector('#geographyMapImg')?.getAttribute('src') || '',
    packages: [...document.querySelectorAll('[data-package]')].map((el) => el.getAttribute('data-package')),
    packageSelect: !!document.querySelector('select[name="package"]'),
    packageOptions: [...document.querySelectorAll('select[name="package"] option')]
      .map((el) => el.value)
      .filter(Boolean),
    play: !!document.querySelector('#qualityVideo .hero-play-btn'),
    video: !!document.querySelector('#qualityVideo video.quality-video'),
    form: !!document.querySelector('[data-contact-form]'),
    honeypot: !!document.querySelector('#website'),
    topLevelSections: [...document.querySelectorAll('[data-react-root][data-react-page="dealers"] > section')]
      .map((el) => el.className),
    offers: document.querySelectorAll('.offer-card').length,
    requirements: document.querySelectorAll('.requirement-card').length,
    packageCards: document.querySelectorAll('.package-card').length,
    cities: document.querySelectorAll('.geography-cities .city-item').length,
    faq: document.querySelectorAll('[data-faq-item]').length,
    heroTitle: (document.querySelector('.page-hero-title')?.textContent || '').trim(),
    contactTitle: (document.querySelector('.contact-section .section-title')?.textContent || '').trim(),
    qualityPoster: document.querySelector('#qualityVideo video')?.getAttribute('poster') || '',
    mainText: (document.querySelector('main')?.innerText || '').trim().length,
    rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
  }))()`
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
  if (slug === 'download-catalog') {
    return `(() => {
      const box = (el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      return {
        title: box(document.querySelector('#download-catalog-title')),
        form: box(document.querySelector('[data-contact-form]')),
        media: box(document.querySelector('[data-download-media]')),
        shell: box(document.querySelector('.catalogue-new-shared-product-shell')),
      }
    })()`
  }
  if (slug === 'hotels') {
    return `(() => {
      const box = (el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      return {
        hero: box(document.querySelector('.page-hero-title')),
        cta: box(document.querySelector('[data-open-commercial-offer]')),
        products: box(document.querySelector('.product-cards-section')),
        form: box(document.querySelector('[data-contact-form]')),
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
      hero: box(document.querySelector('.page-hero-title')),
      map: box(document.querySelector('#geographyMapContainer')),
      packages: box(document.querySelector('.packages-section')),
      form: box(document.querySelector('[data-contact-form]')),
    }
  })()`
}

function withinPx(a, b, keys, tol = 1) {
  if (!a || !b) return false
  return keys.every((k) => Math.abs((a[k] || 0) - (b[k] || 0)) <= tol)
}

function assertGeometryKeys(label, before, after, map) {
  for (const [name, keys] of Object.entries(map)) {
    assert(
      withinPx(before?.[name], after?.[name], keys),
      `${label}: ${name} drift ${JSON.stringify({ before: before?.[name], after: after?.[name], keys })}`,
    )
  }
}

function assertFirstPaintBaseline(slug, snap) {
  if (slug === 'index') {
    assert(snap?.baselineCount === 3, `${slug} baseline: expected 3 certification cards, got ${snap?.baselineCount}`)
    assert(
      snap?.certificationCardCount === 3,
      `${slug} baseline: certification surface must contain exactly 3 cards, got ${snap?.certificationCardCount}`,
    )
    assert(!snap?.unexpectedIndexDocs, `${slug} baseline: unexpected CMS docs consumer on Index`)
    assert(
      JSON.stringify(snap?.certificationChildren) ===
        JSON.stringify(['certification-header', 'certification-grid']),
      `${slug} baseline: certification may contain only header + baseline grid (${JSON.stringify(snap?.certificationChildren)})`,
    )
    assert(
      snap?.certificationGridChildren === 3,
      `${slug} baseline: certification grid must contain exactly 3 children, got ${snap?.certificationGridChildren}`,
    )
    assert(
      JSON.stringify(snap?.topLevelSections) ===
        JSON.stringify(['hero', 'business-solutions', 'philosophy', 'collections', 'partners', 'testimonials', 'certification']),
      `${slug} baseline: top-level section allowlist changed (${JSON.stringify(snap?.topLevelSections)})`,
    )
    assert(
      snap?.baselineTitles?.includes('Производство') &&
        snap?.baselineTitles?.includes('Особенности сотрудничества') &&
        snap?.baselineTitles?.includes('Сертификация'),
      `${slug} baseline: missing certification titles (${JSON.stringify(snap?.baselineTitles)})`,
    )
    assert(snap?.solutions === 3, `${slug} baseline: expected 3 solutions, got ${snap?.solutions}`)
    assert(snap?.collections === 5, `${slug} baseline: expected 5 collections, got ${snap?.collections}`)
    assert(snap?.testimonials === 14, `${slug} baseline: expected 14 testimonials, got ${snap?.testimonials}`)
    assert(String(snap?.heroTitle || '').includes('Любовь с первого утра'), `${slug} baseline: hero title`)
  } else if (slug === 'download-catalog') {
    assert(snap?.title === 'Скачать каталог', `${slug} baseline: title`)
    assert(snap?.downloadDoc && snap?.honeypot && snap?.slide0, `${slug} baseline: hooks/slides`)
    assert(!!snap?.catalogPdf, `${slug} baseline: data-catalog-pdf present`)
  } else if (slug === 'hotels') {
    assert(
      JSON.stringify(snap?.topLevelSections) === JSON.stringify(HOTELS_SECTIONS),
      `${slug} baseline: section allowlist (${JSON.stringify(snap?.topLevelSections)})`,
    )
    assert(
      JSON.stringify(snap?.catalogs) === JSON.stringify(['boxspring', 'accessories']),
      `${slug} baseline: catalog_key hooks (${JSON.stringify(snap?.catalogs)})`,
    )
    assert(snap?.products === 2, `${slug} baseline: 2 product cards`)
    assert(snap?.categories === 4, `${slug} baseline: 4 categories`)
    assert(snap?.discountRows === 3, `${slug} baseline: 3 discount rows`)
    assert(snap?.faq === 3, `${slug} baseline: 3 faq`)
    assert(snap?.commercial && snap?.seasonal && snap?.form && snap?.honeypot, `${slug} baseline: hooks`)
    assert(snap?.openCatalog === 2, `${slug} baseline: open-catalog hooks`)
    assert(String(snap?.heroTitle || '').includes('Сон, о котором хочется написать в отзыве'), `${slug} baseline: hero`)
  } else {
    assert(
      JSON.stringify(snap?.topLevelSections) === JSON.stringify(DEALERS_SECTIONS),
      `${slug} baseline: section allowlist (${JSON.stringify(snap?.topLevelSections)})`,
    )
    assert(
      JSON.stringify(snap?.packages) === JSON.stringify(['standard', 'individual', 'exclusive']),
      `${slug} baseline: data-package (${JSON.stringify(snap?.packages)})`,
    )
    assert(
      JSON.stringify(snap?.packageOptions) === JSON.stringify(['standard', 'individual', 'exclusive']),
      `${slug} baseline: select package options (${JSON.stringify(snap?.packageOptions)})`,
    )
    assert(snap?.map && snap?.packageSelect && snap?.play && snap?.video && snap?.form && snap?.honeypot, `${slug} baseline: hooks`)
    assert(snap?.packageCards === 3, `${slug} baseline: 3 package cards`)
    assert(snap?.offers === 2, `${slug} baseline: 2 offers`)
    assert(snap?.requirements === 2, `${slug} baseline: 2 requirements`)
    assert(snap?.faq === 3, `${slug} baseline: 3 faq`)
    // Marquee duplicates cities once → 86 city items
    assert(snap?.cities === 86, `${slug} baseline: city marquee items (${snap?.cities})`)
    assert(String(snap?.heroTitle || '').includes('Дилерская программа'), `${slug} baseline: hero`)
  }
  assert(!snap?.rawHtml, `${slug} baseline: map_iframe_html leaked`)
  assert(snap?.mainText > 20, `${slug} baseline: empty main`)
}

function fallbackTitleFor(slug, parityPayload) {
  if (slug === 'index') return 'Любовь с первого утра'
  if (slug === 'download-catalog') return parityPayload.title || 'Скачать каталог'
  if (slug === 'hotels') return parityPayload.hero?.title || 'Сон, о котором хочется написать в отзыве'
  return parityPayload.hero?.title || 'Дилерская программа Grassigrosso'
}

function fe05DelayedMap(slug) {
  if (slug === 'index') {
    return { hero: ['top', 'left', 'width'], cta: ['top', 'left', 'width'], section: ['top', 'left', 'width'] }
  }
  if (slug === 'download-catalog') {
    return {
      title: ['top', 'left', 'width'],
      form: ['top', 'left', 'width'],
      media: ['top', 'left', 'width'],
      shell: ['top', 'left', 'width'],
    }
  }
  if (slug === 'hotels') {
    return {
      hero: ['top', 'left', 'width'],
      cta: ['top', 'left', 'width'],
      products: ['top', 'left', 'width'],
      form: ['top', 'left', 'width'],
    }
  }
  return {
    hero: ['top', 'left', 'width'],
    map: ['top', 'left', 'width'],
    packages: ['top', 'left', 'width'],
    form: ['top', 'left', 'width'],
  }
}

async function runPageScenarios(slug) {
  const { cdp } = session
  const evaluate = (expression, timeoutMs) => cdp.evaluate(expression, timeoutMs)
  const parityPayload = loadParityPayload(slug)
  const fallbackTitle = fallbackTitleFor(slug, parityPayload)

  // --- Delayed API + first-paint baseline ---
  {
    await navigateWithMock(cdp, slug, { mode: 'hold' })
    await waitFor(evaluate, `${slug} delayed paint`, hooksReadyExpr(slug), 15000)
    const delayed = await evaluate(criticalHooksExpr(slug))
    assertFirstPaintBaseline(slug, delayed)
    const geoBefore = await evaluate(geometryExpr(slug))
    await setMock(evaluate, { mode: 'json', status: 200, body: envelope(parityPayload) })
    await delay(1000)
    const geoAfter = await evaluate(geometryExpr(slug))
    assertGeometryKeys(`${slug} delayed FE-05`, geoBefore, geoAfter, fe05DelayedMap(slug))
    console.log(`  ${slug} delayed+baseline: PASS`, JSON.stringify({ geoBefore, geoAfter }))
  }

  // --- Failure modes: 404 / 503 / network / invalid ---
  for (const mode of FAILURE_MODES) {
    await navigateWithMock(cdp, slug, mode.mock)
    await waitFor(evaluate, `${slug} ${mode.id} paint`, hooksReadyExpr(slug), 15000)
    await delay(400)
    const failed = await evaluate(criticalHooksExpr(slug))
    assertFirstPaintBaseline(slug, failed)
    if (slug === 'index') {
      assert(String(failed?.heroTitle || '').includes(fallbackTitle), `${slug} ${mode.id}: lost fallback title`)
    } else if (slug === 'download-catalog') {
      assert(failed?.title === fallbackTitle, `${slug} ${mode.id}: lost fallback title`)
    } else {
      assert(String(failed?.heroTitle || '') === fallbackTitle, `${slug} ${mode.id}: lost fallback title`)
    }
    console.log(`  ${slug} failure:${mode.id}: PASS`)
  }

  // --- Success divergent (texts + media) ---
  {
    const divergent = structuredClone(parityPayload)
    let geoBaseline
    await navigateWithMock(cdp, slug, { mode: 'hold' })
    await waitFor(evaluate, `${slug} success baseline paint`, hooksReadyExpr(slug), 15000)
    geoBaseline = await evaluate(geometryExpr(slug))

    if (slug === 'index') {
      divergent.hero = {
        ...divergent.hero,
        title: 'CMS Index Title Marker',
        poster: { url: '/uploads/cms-index-poster-marker.avif' },
        poster_alt: divergent.hero?.poster_alt || 'Grassigrosso',
      }
      divergent.partners_image_desktop = { url: '/uploads/cms-partners-marker.png' }
    } else if (slug === 'download-catalog') {
      divergent.title = 'CMS Download Title Marker'
      divergent.submit_label = 'CMS Submit Marker'
      divergent.lead = 'CMS Lead Marker'
      divergent.catalog_pdf = { url: '/uploads/cms-catalog-marker.pdf' }
    } else if (slug === 'hotels') {
      divergent.hero = {
        ...divergent.hero,
        title: 'CMS Hotels Title Marker',
        image: { url: '/uploads/cms-hotels-hero-marker.png' },
      }
      divergent.contact_section_title = 'CMS Hotels Contact Marker'
    } else {
      divergent.hero = {
        ...divergent.hero,
        title: 'CMS Dealers Title Marker',
      }
      divergent.contact_section_title = 'CMS Dealers Contact Marker'
      divergent.quality_image = { url: '/uploads/cms-dealers-quality-marker.avif' }
      divergent.geography_map_image = { url: '/uploads/cms-dealers-map-marker.svg' }
    }

    await setMock(evaluate, { mode: 'json', status: 200, body: envelope(divergent, 'strapi') })
    if (slug === 'index') {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('.hero-title')?.textContent?.includes('CMS Index Title Marker')`,
        15000,
      )
    } else if (slug === 'download-catalog') {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('#download-catalog-title')?.textContent?.trim() === 'CMS Download Title Marker'`,
        15000,
      )
    } else if (slug === 'hotels') {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('.page-hero-title')?.textContent?.trim() === 'CMS Hotels Title Marker'`,
        15000,
      )
    } else {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('.page-hero-title')?.textContent?.trim() === 'CMS Dealers Title Marker'`,
        15000,
      )
    }
    const ok = await evaluate(criticalHooksExpr(slug))
    const geoAfter = await evaluate(geometryExpr(slug))
    assert(!ok?.rawHtml, `${slug} success: map_iframe_html leaked`)
    if (slug === 'index') {
      assert(ok?.commercial && ok?.play && ok?.presentation, `${slug} success: hooks missing`)
      assert(ok?.baselineCount === 3, `${slug} success: baseline cards must stay`)
      assert(ok?.certificationCardCount === 3, `${slug} success: extra certification card/consumer`)
      assert(
        JSON.stringify(ok?.certificationChildren) ===
          JSON.stringify(['certification-header', 'certification-grid']) &&
          ok?.certificationGridChildren === 3,
        `${slug} success: certification DOM ownership changed`,
      )
      assert(!ok?.unexpectedIndexDocs, `${slug} success: CMS docs must not render on Index`)
      assert(ok?.poster === '/uploads/cms-index-poster-marker.avif', `${slug} success: poster media not hydrated (${ok?.poster})`)
      assert(
        ok?.partners === '/uploads/cms-partners-marker.png',
        `${slug} success: partners media not hydrated (${ok?.partners})`,
      )
      assertGeometryKeys(`${slug} success FE-05`, geoBaseline, geoAfter, {
        cta: ['left', 'width'],
        hero: ['left', 'width'],
      })
    } else if (slug === 'download-catalog') {
      assert(ok?.downloadDoc && ok?.form && ok?.honeypot && ok?.slide0, `${slug} success: hooks/slides missing`)
      assert(ok?.lead === 'CMS Lead Marker', `${slug} success: lead`)
      assert(ok?.submit === 'CMS Submit Marker', `${slug} success: submit`)
      assert(
        ok?.catalogPdf === '/uploads/cms-catalog-marker.pdf',
        `${slug} success: catalog_pdf attr (${ok?.catalogPdf})`,
      )
      assertGeometryKeys(`${slug} success FE-05`, geoBaseline, geoAfter, {
        form: ['left', 'width'],
        media: ['left', 'width'],
        shell: ['left', 'width'],
      })
    } else if (slug === 'hotels') {
      assert(
        JSON.stringify(ok?.topLevelSections) === JSON.stringify(HOTELS_SECTIONS),
        `${slug} success: section allowlist drifted`,
      )
      assert(
        JSON.stringify(ok?.catalogs) === JSON.stringify(['boxspring', 'accessories']),
        `${slug} success: catalog_key drifted`,
      )
      assert(ok?.heroTitle === 'CMS Hotels Title Marker', `${slug} success: hero title`)
      assert(ok?.contactTitle === 'CMS Hotels Contact Marker', `${slug} success: contact title`)
      assert(
        ok?.heroImg === '/uploads/cms-hotels-hero-marker.png',
        `${slug} success: hero image (${ok?.heroImg})`,
      )
      assert(ok?.commercial && ok?.form && ok?.seasonal, `${slug} success: hooks`)
      assertGeometryKeys(`${slug} success FE-05`, geoBaseline, geoAfter, {
        cta: ['left', 'width'],
        products: ['left', 'width'],
        form: ['left', 'width'],
      })
    } else {
      assert(
        JSON.stringify(ok?.topLevelSections) === JSON.stringify(DEALERS_SECTIONS),
        `${slug} success: section allowlist drifted`,
      )
      assert(
        JSON.stringify(ok?.packages) === JSON.stringify(['standard', 'individual', 'exclusive']),
        `${slug} success: packages drifted`,
      )
      assert(ok?.heroTitle === 'CMS Dealers Title Marker', `${slug} success: hero title`)
      assert(ok?.contactTitle === 'CMS Dealers Contact Marker', `${slug} success: contact title`)
      assert(
        ok?.qualityPoster === '/uploads/cms-dealers-quality-marker.avif',
        `${slug} success: quality poster (${ok?.qualityPoster})`,
      )
      assert(
        ok?.mapImg === '/uploads/cms-dealers-map-marker.svg',
        `${slug} success: map image (${ok?.mapImg})`,
      )
      assert(ok?.map && ok?.play && ok?.video && ok?.form && ok?.packageSelect, `${slug} success: hooks`)
      assertGeometryKeys(`${slug} success FE-05`, geoBaseline, geoAfter, {
        map: ['left', 'width'],
        packages: ['left', 'width'],
        form: ['left', 'width'],
      })
    }
    console.log(`  ${slug} success: PASS`, JSON.stringify({ geoBaseline, geoAfter }))
  }

  // --- FE-05 content-equal parity hydrate ---
  {
    await navigateWithMock(cdp, slug, { mode: 'hold' })
    await waitFor(evaluate, `${slug} parity paint`, hooksReadyExpr(slug), 15000)
    const before = await evaluate(geometryExpr(slug))
    const beforeHooks = await evaluate(criticalHooksExpr(slug))
    await setMock(evaluate, { mode: 'json', status: 200, body: envelope(parityPayload) })
    await delay(1000)
    const after = await evaluate(geometryExpr(slug))
    const afterHooks = await evaluate(criticalHooksExpr(slug))
    if (slug === 'index') {
      assertGeometryKeys(`${slug} FE-05 parity`, before, after, {
        hero: ['top', 'left', 'width'],
        cta: ['top', 'left', 'width'],
        section: ['top', 'left', 'width'],
      })
      assert(beforeHooks?.solutions === afterHooks?.solutions, `${slug} parity: solutions count changed`)
      assert(
        beforeHooks?.testimonials === afterHooks?.testimonials,
        `${slug} parity: testimonials count changed`,
      )
      assert(
        Math.abs((before?.section?.height || 0) - (after?.section?.height || 0)) <= 1,
        `${slug} parity: section height changed (not content-equal?) ${JSON.stringify({
          before: before?.section,
          after: after?.section,
        })}`,
      )
    } else if (slug === 'download-catalog') {
      assertGeometryKeys(`${slug} FE-05 parity`, before, after, {
        title: ['top', 'left', 'width'],
        form: ['top', 'left', 'width'],
        media: ['top', 'left', 'width'],
        shell: ['top', 'left', 'width'],
      })
      assert(beforeHooks?.catalogPdf === afterHooks?.catalogPdf, `${slug} parity: catalog_pdf changed`)
    } else if (slug === 'hotels') {
      assertGeometryKeys(`${slug} FE-05 parity`, before, after, fe05DelayedMap(slug))
      assert(
        JSON.stringify(beforeHooks?.catalogs) === JSON.stringify(afterHooks?.catalogs),
        `${slug} parity: catalogs changed`,
      )
      assert(beforeHooks?.products === afterHooks?.products, `${slug} parity: products count`)
      assert(
        Math.abs((before?.products?.height || 0) - (after?.products?.height || 0)) <= 1,
        `${slug} parity: products height changed`,
      )
    } else {
      assertGeometryKeys(`${slug} FE-05 parity`, before, after, fe05DelayedMap(slug))
      assert(
        JSON.stringify(beforeHooks?.packages) === JSON.stringify(afterHooks?.packages),
        `${slug} parity: packages changed`,
      )
      assert(beforeHooks?.cities === afterHooks?.cities, `${slug} parity: cities count`)
      assert(
        Math.abs((before?.packages?.height || 0) - (after?.packages?.height || 0)) <= 1,
        `${slug} parity: packages height changed`,
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

  console.log('\npages-cms hydrate-dom PASS (index + download-catalog + hotels + dealers)')
  cleanup()
  process.exit(0)
} catch (err) {
  console.error('pages-cms hydrate-dom crashed:', err)
  cleanup()
  process.exit(1)
}
