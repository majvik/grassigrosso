#!/usr/bin/env node
/**
 * Phase 4B–D DOM hydrate gate — all six wave-1 pages.
 *
 * Requires local Vite. Stubs window.fetch for /api/pages/:slug.
 *
 * Env:
 *   CATALOG_UI_BASE_URL / PAGES_CMS_UI_BASE_URL — default http://127.0.0.1:5174
 *   CATALOG_SMOKE_SKIP_BROWSER=1 — skip
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  cleanupChromeSession,
  delay,
  startCatalogChromeSession,
} from './lib/catalog-chrome-session.mjs'
import { shouldRunBrowserSmoke } from './lib/catalog-smoke-env.mjs'

const require = createRequire(import.meta.url)
const { normalizeMapIframeHtml } = require(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../strapi-catalog/src/api/pages-cms/utils/normalize-map-iframe.js',
  ),
)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseUrl = String(
  process.env.PAGES_CMS_UI_BASE_URL || process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5174',
).replace(/\/+$/, '')
const runBrowser = shouldRunBrowserSmoke(baseUrl)
const OVERALL_TIMEOUT_MS = Number(process.env.PAGES_CMS_HYDRATE_DOM_TIMEOUT_MS || 360000)
const WAVE1_PAGES = ['index', 'download-catalog', 'hotels', 'dealers', 'contacts', 'documents']
const LEGAL_PHASE_PAGES = ['privacy', 'terms', 'cookies']
const PHASE_PAGES = [...WAVE1_PAGES, ...LEGAL_PHASE_PAGES]
const LEGAL_PAGE_SET = new Set(LEGAL_PHASE_PAGES)
const FAILURE_MODES = [
  { id: '404', mock: { mode: 'fail', status: 404 } },
  { id: '503', mock: { mode: 'fail', status: 503 } },
  { id: 'network', mock: { mode: 'network' } },
  { id: 'invalid', mock: { mode: 'invalid-json' } },
]
const LEGAL_EXTRA_FAILURE_MODES = [
  { id: '422', mock: { mode: 'fail', status: 422 } },
  {
    id: 'invalid-payload',
    mock: {
      mode: 'json',
      status: 200,
      body: { data: { title: 'x', effective_date: '2026-03-01' }, source: 'strapi' },
    },
  },
]

const LEGAL_SECTIONS = ['legal-page']
const LEGAL_CONTENT_TAGS = [
  'H2',
  'P',
  'UL',
  'LI',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TH',
  'TD',
  'A',
  'STRONG',
  'DIV',
]
const LEGAL_DATE_LABEL = 'Дата последнего обновления: 01.03.2026'

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
const CONTACTS_SECTIONS = [
  'contacts-hero',
  'contacts-offices',
  'contacts-map',
  'contact-section',
]
const DOCUMENTS_SECTIONS = [
  'documents-hero',
  'documents-certification',
  'documents-commercial',
  'documents-help',
  'documents-faq',
]
const CONTACTS_OFFICE_SLUGS = ['main', 'voronezh', 'lnr', 'dnr']
const DOCUMENTS_CERT_KEYS = ['declaration', 'certificate', 'trademark']
const DOCUMENTS_COMPANY_KEYS = ['catalog', 'presentation']

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
  // Legal: defaults/fixtures/snapshots are identical (no media URL drift).
  if (LEGAL_PAGE_SET.has(slug)) {
    return JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public', `pages-${slug}.snapshot.json`), 'utf8'),
    )
  }
  // Wave-1: fixtures match React defaults (public snapshots may use seed-resolved uploads).
  const raw = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts/fixtures/pages-cms', `${slug}.json`), 'utf8'),
  )
  if (slug === 'download-catalog') {
    const { slides, media_display_mode, slider_autoplay_ms, ...texts } = raw
    return texts
  }
  if (slug === 'contacts') {
    return {
      ...raw,
      offices: (raw.offices || []).map((office) => {
        const { map_iframe_html: html, ...rest } = office
        return { ...rest, map_embed_url: normalizeMapIframeHtml(html) }
      }),
    }
  }
  return raw
}

function envelope(data, source = 'disk-snapshot') {
  return { data, source }
}

const FETCH_STUB_SOURCE = `(() => {
  if (window.__pagesCmsFetchStubInstalled) return
  window.__pagesCmsFetchStubInstalled = true
  window.__pagesCmsMock = { mode: 'pass' }
  window.__pagesCmsConsoleErrors = window.__pagesCmsConsoleErrors || []
  if (!window.__pagesCmsConsoleHooked) {
    window.__pagesCmsConsoleHooked = true
    const pushErr = (msg) => {
      try { window.__pagesCmsConsoleErrors.push(String(msg)) } catch {}
    }
    const origError = console.error.bind(console)
    console.error = (...args) => {
      pushErr(args.map((a) => (typeof a === 'string' ? a : (a && a.message) || String(a))).join(' '))
      origError(...args)
    }
    window.addEventListener('error', (e) => pushErr(e?.message || 'window.error'))
    window.addEventListener('unhandledrejection', (e) =>
      pushErr(e?.reason?.message || String(e?.reason || 'unhandledrejection')),
    )
  }
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
    source: `${FETCH_STUB_SOURCE}; window.__pagesCmsMock = ${JSON.stringify(mock)}; window.__pagesCmsConsoleErrors = [];`,
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
  if (LEGAL_PAGE_SET.has(slug)) {
    return `(() => {
      const section = document.querySelector('section.legal-page')
      const title = (document.querySelector('.legal-page-title')?.textContent || '').trim()
      const date = (document.querySelector('.legal-page-date')?.textContent || '').trim()
      const content = document.querySelector('.legal-page-content')
      const mainText = (document.querySelector('main')?.innerText || '').trim().length
      return !!(section && title && date && content && mainText > 20)
    })()`
  }
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
  if (slug === 'dealers') {
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
  if (slug === 'contacts') {
    return `(() => {
      const tabs = document.querySelectorAll('[data-map-tab]').length
      const frames = document.querySelectorAll('[data-map-frame]').length
      const mainMap = !!document.querySelector('#map-main')
      const form = !!document.querySelector('[data-contact-form]')
      const mainText = (document.querySelector('main')?.innerText || '').trim().length
      return tabs === 4 && frames === 4 && mainMap && form && mainText > 20
    })()`
  }
  return `(() => {
    const docs = ['declaration','certificate','trademark','catalog','presentation'].every((k) =>
      !!document.querySelector('[data-document="' + k + '"]'),
    )
    const request = document.querySelectorAll('[data-document-request-trigger]').length
    const help = !!document.querySelector('[data-open-help-modal]')
    const mainText = (document.querySelector('main')?.innerText || '').trim().length
    return docs && request >= 5 && help && mainText > 20
  })()`
}

function criticalHooksExpr(slug) {
  if (LEGAL_PAGE_SET.has(slug)) {
    return `(() => {
      const content = document.querySelector('.legal-page-content')
      const allowed = new Set(${JSON.stringify(LEGAL_CONTENT_TAGS)})
      const badTags = []
      if (content) {
        for (const el of content.querySelectorAll('*')) {
          if (!allowed.has(el.tagName)) badTags.push(el.tagName)
        }
      }
      const tds = content ? [...content.querySelectorAll('td')] : []
      const dataLabels = tds.map((td) => td.getAttribute('data-label'))
      const operatorText = content
        ? [...content.querySelectorAll('p')]
            .map((p) => (p.textContent || '').trim())
            .filter((t) => t.includes('ОГРН') && t.includes('ИНН'))
        : []
      const topLevelSections = [...document.querySelectorAll('[data-react-root][data-react-page="${slug}"] > section')]
        .map((el) => el.className)
      return {
        section: !!document.querySelector('section.legal-page'),
        titleEl: !!document.querySelector('.legal-page-title'),
        dateEl: !!document.querySelector('.legal-page-date'),
        contentEl: !!content,
        topLevelSections,
        title: (document.querySelector('.legal-page-title')?.textContent || '').trim(),
        date: (document.querySelector('.legal-page-date')?.textContent || '').trim(),
        h2: content ? content.querySelectorAll('h2').length : 0,
        paragraphs: content ? content.querySelectorAll(':scope > p, :scope > ul').length : 0,
        tables: content ? content.querySelectorAll('table').length : 0,
        tableWraps: content ? content.querySelectorAll('.legal-table-wrap').length : 0,
        links: content ? content.querySelectorAll('a').length : 0,
        strongs: content ? content.querySelectorAll('strong').length : 0,
        operatorCount: operatorText.length,
        tdCount: tds.length,
        dataLabelOk: tds.length === 0 || dataLabels.every((l) => typeof l === 'string' && l.length > 0),
        badTags: [...new Set(badTags)],
        hasDangerousHtml: content
          ? content.querySelector('script, iframe, object, embed') != null ||
            /<script\\b/i.test(content.innerHTML)
          : true,
        consoleErrors: Array.isArray(window.__pagesCmsConsoleErrors)
          ? window.__pagesCmsConsoleErrors.length
          : -1,
        mainText: (document.querySelector('main')?.innerText || '').trim().length,
        rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
      }
    })()`
  }
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
    return `(() => {
      const productImages = [...document.querySelectorAll('.product-card[data-catalog]')].map((card) => {
        const img = card.querySelector('.product-card-image img')
        return {
          key: card.getAttribute('data-catalog'),
          src: img?.getAttribute('src') || '',
          currentSrc: img?.currentSrc || '',
          sourceCount: card.querySelectorAll('.product-card-image source').length,
        }
      })
      return {
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
        productImages,
        mainText: (document.querySelector('main')?.innerText || '').trim().length,
        rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
      }
    })()`
  }
  if (slug === 'dealers') {
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
  if (slug === 'contacts') {
    return `(() => {
      const frames = [...document.querySelectorAll('[data-map-frame]')].map((el) => ({
        slug: el.getAttribute('data-office'),
        tag: el.tagName,
        id: el.id,
        src: el.tagName === 'IFRAME' ? el.getAttribute('src') || '' : '',
        embed: el.getAttribute('data-map-embed') === '1',
      }))
      return {
        tabs: [...document.querySelectorAll('[data-map-tab]')].map((el) => el.getAttribute('data-office')),
        frames,
        mapIds: ['main','voronezh','lnr','dnr'].map((s) => !!document.querySelector('#map-' + s)),
        form: !!document.querySelector('[data-contact-form]'),
        honeypot: !!document.querySelector('#website'),
        copyEmail: document.querySelectorAll('[data-copy-email-trigger]').length,
        topLevelSections: [...document.querySelectorAll('[data-react-root][data-react-page="contacts"] > section')]
          .map((el) => el.className),
        offices: document.querySelectorAll('.contacts-office-card').length,
        heroTitle: (document.querySelector('.contacts-hero-title')?.textContent || '').trim(),
        mapTitle: (document.querySelector('.contacts-map .section-title')?.textContent || '').trim(),
        contactTitle: (document.querySelector('.contact-section .section-title')?.textContent || '').trim(),
        heroImg: document.querySelector('.contacts-hero-image img')?.getAttribute('src') || '',
        mainText: (document.querySelector('main')?.innerText || '').trim().length,
        rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
        hasDangerousMapHtml: /<iframe[^>]+srcdoc=/i.test(document.documentElement.innerHTML),
      }
    })()`
  }
  return `(() => ({
    documents: [...document.querySelectorAll('[data-document]')].map((el) => el.getAttribute('data-document')),
    requestTriggers: document.querySelectorAll('[data-document-request-trigger]').length,
    help: !!document.querySelector('[data-open-help-modal]'),
    formAbsent: !document.querySelector('[data-contact-form]'),
    topLevelSections: [...document.querySelectorAll('[data-react-root][data-react-page="documents"] > section')]
      .map((el) => el.className),
    certCards: document.querySelectorAll('.documents-cert-card').length,
    companyItems: document.querySelectorAll('.documents-commercial-item').length,
    faq: document.querySelectorAll('[data-faq-item]').length,
    heroTitle: (document.querySelector('.documents-hero-title')?.textContent || '').trim(),
    helpTitle: (document.querySelector('.documents-help .section-title')?.textContent || '').trim(),
    helpCta: (document.querySelector('[data-open-help-modal]')?.textContent || '').trim(),
    heroImg: document.querySelector('.documents-hero-image img')?.getAttribute('src') || '',
    companyImg: document.querySelector('.documents-commercial-icon img')?.getAttribute('src') || '',
    mainText: (document.querySelector('main')?.innerText || '').trim().length,
    rawHtml: document.documentElement.innerHTML.includes('map_iframe_html'),
  }))()`
}

function geometryExpr(slug) {
  if (LEGAL_PAGE_SET.has(slug)) {
    return `(() => {
      const box = (el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      return {
        title: box(document.querySelector('.legal-page-title')),
        date: box(document.querySelector('.legal-page-date')),
        content: box(document.querySelector('.legal-page-content')),
        section: box(document.querySelector('section.legal-page')),
      }
    })()`
  }
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
  if (slug === 'dealers') {
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
  if (slug === 'contacts') {
    return `(() => {
      const box = (el) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      return {
        hero: box(document.querySelector('.contacts-hero-title')),
        tabs: box(document.querySelector('[data-map-tab]')),
        map: box(document.querySelector('#map-main')),
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
      hero: box(document.querySelector('.documents-hero-title')),
      certs: box(document.querySelector('.documents-certification')),
      help: box(document.querySelector('[data-open-help-modal]')),
      faq: box(document.querySelector('.documents-faq')),
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

function productImageByKey(snap, key) {
  return (snap?.productImages || []).find((item) => item.key === key) || null
}

function assertCurrentSrcIncludes(label, product, needle) {
  assert(
    String(product?.currentSrc || '').includes(needle),
    `${label}: currentSrc must include ${needle}, got ${JSON.stringify(product)}`,
  )
}

const MAP_VISIBILITY_EXPR = `(() => {
  const container = document.querySelector('.contacts-map-container')
  if (!container) return null
  const cRect = container.getBoundingClientRect()
  const frames = [...document.querySelectorAll('[data-map-frame]')].map((el) => {
    const style = window.getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const displayNone = style.display === 'none' || style.visibility === 'hidden'
    const hiddenAttr = el.hasAttribute('hidden')
    const intersectsContainer =
      r.width > 1 &&
      r.height > 1 &&
      r.right > cRect.left + 1 &&
      r.left < cRect.right - 1 &&
      r.bottom > cRect.top + 1 &&
      r.top < cRect.bottom - 1
    const inViewport =
      r.width > 1 &&
      r.height > 1 &&
      r.bottom > 0 &&
      r.top < window.innerHeight &&
      r.right > 0 &&
      r.left < window.innerWidth
    const isVisible = !displayNone && !hiddenAttr && intersectsContainer
    return {
      slug: el.getAttribute('data-office'),
      tag: el.tagName,
      hiddenAttr,
      display: style.display,
      filter: style.filter,
      borderRadius: style.borderRadius,
      left: r.left,
      width: r.width,
      height: r.height,
      intersectsContainer,
      inViewport,
      isVisible,
    }
  })
  return {
    containerLeft: cRect.left,
    containerWidth: cRect.width,
    frames,
    visibleSlugs: frames.filter((f) => f.isVisible).map((f) => f.slug),
  }
})()`

async function prepareContactsMapView(evaluate) {
  await evaluate(`document.querySelector('.contacts-map-container')?.scrollIntoView({ block: 'center', inline: 'nearest' })`)
  await delay(150)
}

function assertExactlyOneVisibleMap(label, snap, expectedSlug) {
  assert(!!snap, `${label}: map visibility snapshot missing`)
  assert(
    Array.isArray(snap.visibleSlugs) && snap.visibleSlugs.length === 1,
    `${label}: expected exactly one visible map, got ${JSON.stringify(snap.visibleSlugs)} (${JSON.stringify(snap.frames)})`,
  )
  assert(
    snap.visibleSlugs[0] === expectedSlug,
    `${label}: expected visible ${expectedSlug}, got ${JSON.stringify(snap.visibleSlugs)}`,
  )
  const visible = (snap.frames || []).find((f) => f.slug === expectedSlug)
  assert(visible?.intersectsContainer, `${label}: visible map not inside container (${JSON.stringify(visible)})`)
  assert(visible?.inViewport, `${label}: visible map not in viewport (${JSON.stringify(visible)})`)
  assert(
    visible?.left >= (snap.containerLeft || 0) - 1,
    `${label}: visible map left off-container (${JSON.stringify({ visible, containerLeft: snap.containerLeft })})`,
  )
  if (visible?.tag === 'IFRAME') {
    assert(
      visible.filter === 'grayscale(1)',
      `${label}: CMS map iframe lost baseline grayscale (${JSON.stringify(visible)})`,
    )
    assert(
      visible.borderRadius === '24px',
      `${label}: CMS map iframe lost rounded frame (${JSON.stringify(visible)})`,
    )
  }
  for (const frame of snap.frames || []) {
    if (frame.slug === expectedSlug) continue
    assert(
      frame.hiddenAttr === true || frame.display === 'none' || !frame.isVisible,
      `${label}: map ${frame.slug} should be hidden (${JSON.stringify(frame)})`,
    )
  }
}

async function assertContactsMapTabSwitching(evaluate, label) {
  await prepareContactsMapView(evaluate)
  let snap = await evaluate(MAP_VISIBILITY_EXPR)
  assertExactlyOneVisibleMap(`${label} initial`, snap, 'main')

  for (const officeSlug of CONTACTS_OFFICE_SLUGS) {
    await evaluate(
      `document.querySelector('[data-map-tab][data-office="${officeSlug}"]')?.click()`,
    )
    await delay(120)
    await prepareContactsMapView(evaluate)
    snap = await evaluate(MAP_VISIBILITY_EXPR)
    assertExactlyOneVisibleMap(`${label} tab:${officeSlug}`, snap, officeSlug)
  }

  // Return to main for subsequent scenarios.
  await evaluate(`document.querySelector('[data-map-tab][data-office="main"]')?.click()`)
  await delay(80)
}

function assertFirstPaintBaseline(slug, snap) {
  if (LEGAL_PAGE_SET.has(slug)) {
    assert(
      JSON.stringify(snap?.topLevelSections) === JSON.stringify(LEGAL_SECTIONS),
      `${slug} baseline: section allowlist (${JSON.stringify(snap?.topLevelSections)})`,
    )
    assert(snap?.section && snap?.titleEl && snap?.dateEl && snap?.contentEl, `${slug} baseline: legal slots`)
    assert(String(snap?.date || '') === LEGAL_DATE_LABEL, `${slug} baseline: date label (${snap?.date})`)
    assert(String(snap?.title || '').length > 5, `${slug} baseline: title`)
    assert(snap?.h2 > 0, `${slug} baseline: headings`)
    assert(Array.isArray(snap?.badTags) && snap.badTags.length === 0, `${slug} baseline: bad tags ${JSON.stringify(snap?.badTags)}`)
    assert(snap?.dataLabelOk, `${slug} baseline: td data-label`)
    assert(!snap?.hasDangerousHtml, `${slug} baseline: dangerous HTML`)
    if (slug === 'privacy' || slug === 'terms') {
      assert(snap?.operatorCount === 1, `${slug} baseline: operator once (${snap?.operatorCount})`)
    } else {
      assert(snap?.operatorCount === 0, `${slug} baseline: cookies has no operator`)
    }
    if (slug === 'cookies' || slug === 'privacy') {
      assert(snap?.tables >= 1 && snap?.tableWraps >= 1, `${slug} baseline: table wrap`)
    }
    assert(snap?.consoleErrors === 0, `${slug} baseline: console errors ${snap?.consoleErrors}`)
  } else if (slug === 'index') {
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
    // Defaults include product.image URLs → CMS slot path (no legacy <source>).
    const boxspring = productImageByKey(snap, 'boxspring')
    const accessories = productImageByKey(snap, 'accessories')
    assert(boxspring?.sourceCount === 0, `${slug} baseline: boxspring must not use legacy sources when image set`)
    assert(accessories?.sourceCount === 0, `${slug} baseline: accessories must not use legacy sources when image set`)
    assertCurrentSrcIncludes(`${slug} baseline boxspring`, boxspring, 'boxspring')
    assertCurrentSrcIncludes(`${slug} baseline accessories`, accessories, 'accessories')
  } else if (slug === 'dealers') {
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
  } else if (slug === 'contacts') {
    assert(
      JSON.stringify(snap?.topLevelSections) === JSON.stringify(CONTACTS_SECTIONS),
      `${slug} baseline: section allowlist (${JSON.stringify(snap?.topLevelSections)})`,
    )
    assert(
      JSON.stringify(snap?.tabs) === JSON.stringify(CONTACTS_OFFICE_SLUGS),
      `${slug} baseline: map tabs (${JSON.stringify(snap?.tabs)})`,
    )
    assert(
      snap?.mapIds?.every(Boolean) && snap.mapIds.length === 4,
      `${slug} baseline: #map-* ids missing`,
    )
    assert(snap?.offices === 4, `${slug} baseline: 4 office cards`)
    assert(snap?.form && snap?.honeypot && snap?.copyEmail === 4, `${slug} baseline: form/hooks`)
    assert(String(snap?.heroTitle || '') === 'Контакты', `${slug} baseline: hero`)
    assert(!snap?.hasDangerousMapHtml, `${slug} baseline: srcdoc iframe`)
    for (const frame of snap?.frames || []) {
      assert(frame.tag === 'IFRAME' && frame.embed, `${slug} baseline: expected embed iframe for ${frame.slug}`)
      assert(
        String(frame.src).startsWith('https://yandex.ru/map-widget/'),
        `${slug} baseline: iframe src allowlist (${frame.src})`,
      )
    }
  } else {
    assert(
      JSON.stringify(snap?.topLevelSections) === JSON.stringify(DOCUMENTS_SECTIONS),
      `${slug} baseline: section allowlist (${JSON.stringify(snap?.topLevelSections)})`,
    )
    assert(
      JSON.stringify(snap?.documents) ===
        JSON.stringify([...DOCUMENTS_CERT_KEYS, ...DOCUMENTS_COMPANY_KEYS]),
      `${slug} baseline: document keys (${JSON.stringify(snap?.documents)})`,
    )
    assert(snap?.certCards === 3, `${slug} baseline: 3 cert cards`)
    assert(snap?.companyItems === 2, `${slug} baseline: 2 company docs`)
    assert(snap?.requestTriggers >= 5, `${slug} baseline: request triggers`)
    assert(snap?.help && snap?.faq === 3, `${slug} baseline: help/faq`)
    assert(String(snap?.heroTitle || '').includes('Документы'), `${slug} baseline: hero`)
  }
  assert(!snap?.rawHtml, `${slug} baseline: map_iframe_html leaked`)
  assert(snap?.mainText > 20, `${slug} baseline: empty main`)
}

function fallbackTitleFor(slug, parityPayload) {
  if (LEGAL_PAGE_SET.has(slug)) return parityPayload.title || ''
  if (slug === 'index') return 'Любовь с первого утра'
  if (slug === 'download-catalog') return parityPayload.title || 'Скачать каталог'
  if (slug === 'hotels') return parityPayload.hero?.title || 'Сон, о котором хочется написать в отзыве'
  if (slug === 'dealers') return parityPayload.hero?.title || 'Дилерская программа Grassigrosso'
  if (slug === 'contacts') return parityPayload.hero?.title || 'Контакты'
  return parityPayload.hero?.title || 'Документы и сертификаты'
}

function fe05DelayedMap(slug) {
  if (LEGAL_PAGE_SET.has(slug)) {
    // Legal pages are long; sticky header / scrollY can shift `top` without content change.
    return {
      title: ['left', 'width'],
      date: ['left', 'width'],
      content: ['left', 'width'],
      section: ['left', 'width'],
    }
  }
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
  if (slug === 'dealers') {
    return {
      hero: ['top', 'left', 'width'],
      map: ['top', 'left', 'width'],
      packages: ['top', 'left', 'width'],
      form: ['top', 'left', 'width'],
    }
  }
  if (slug === 'contacts') {
    return {
      hero: ['top', 'left', 'width'],
      tabs: ['top', 'left', 'width'],
      map: ['top', 'left', 'width'],
      form: ['top', 'left', 'width'],
    }
  }
  return {
    hero: ['top', 'left', 'width'],
    certs: ['top', 'left', 'width'],
    help: ['top', 'left', 'width'],
    faq: ['top', 'left', 'width'],
  }
}

async function stabilizeViewport(evaluate) {
  await evaluate(`window.scrollTo(0, 0)`)
  await delay(120)
}

async function assertDealersMarqueeMoves(evaluate, label) {
  await evaluate(`document.querySelector('.geography-section')?.scrollIntoView({ block: 'center' })`)
  await delay(350)
  const before = await evaluate(`document.querySelector('.geography-cities')?.style.transform || ''`)
  await delay(500)
  const after = await evaluate(`document.querySelector('.geography-cities')?.style.transform || ''`)
  assert(before && after && before !== after, `${label}: marquee did not move (${before} → ${after})`)
  await stabilizeViewport(evaluate)
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
    await stabilizeViewport(evaluate)
    const delayed = await evaluate(criticalHooksExpr(slug))
    assertFirstPaintBaseline(slug, delayed)
    if (slug === 'dealers') {
      await assertDealersMarqueeMoves(evaluate, `${slug} hydrated lifecycle`)
      console.log(`  ${slug} marquee movement: PASS`)
    }
    if (slug === 'contacts') {
      await assertContactsMapTabSwitching(evaluate, `${slug} first-paint embed`)
      console.log(`  ${slug} first-paint map tabs: PASS`)
    }
    await stabilizeViewport(evaluate)
    const geoBefore = await evaluate(geometryExpr(slug))
    await setMock(evaluate, { mode: 'json', status: 200, body: envelope(parityPayload) })
    await delay(1000)
    await stabilizeViewport(evaluate)
    const geoAfter = await evaluate(geometryExpr(slug))
    assertGeometryKeys(`${slug} delayed FE-05`, geoBefore, geoAfter, fe05DelayedMap(slug))
    console.log(`  ${slug} delayed+baseline: PASS`, JSON.stringify({ geoBefore, geoAfter }))
  }

  // --- Failure modes: 404 / 503 / network / invalid (+ legal extras) ---
  const failureModes = LEGAL_PAGE_SET.has(slug)
    ? [...FAILURE_MODES, ...LEGAL_EXTRA_FAILURE_MODES]
    : FAILURE_MODES
  for (const mode of failureModes) {
    await navigateWithMock(cdp, slug, mode.mock)
    await waitFor(evaluate, `${slug} ${mode.id} paint`, hooksReadyExpr(slug), 15000)
    await delay(400)
    const failed = await evaluate(criticalHooksExpr(slug))
    assertFirstPaintBaseline(slug, failed)
    if (LEGAL_PAGE_SET.has(slug)) {
      assert(String(failed?.title || '') === fallbackTitle, `${slug} ${mode.id}: lost fallback title`)
      assert(String(failed?.date || '') === LEGAL_DATE_LABEL, `${slug} ${mode.id}: lost fallback date`)
      assert(failed?.consoleErrors === 0, `${slug} ${mode.id}: console errors`)
    } else if (slug === 'index') {
      assert(String(failed?.heroTitle || '').includes(fallbackTitle), `${slug} ${mode.id}: lost fallback title`)
    } else if (slug === 'download-catalog') {
      assert(failed?.title === fallbackTitle, `${slug} ${mode.id}: lost fallback title`)
    } else {
      assert(String(failed?.heroTitle || '') === fallbackTitle, `${slug} ${mode.id}: lost fallback title`)
    }
    console.log(`  ${slug} failure:${mode.id}: PASS`)
  }

  // --- Legal: timeout-like hold → fail keeps SSR/fallback ---
  if (LEGAL_PAGE_SET.has(slug)) {
    await navigateWithMock(cdp, slug, { mode: 'hold' })
    await waitFor(evaluate, `${slug} timeout hold paint`, hooksReadyExpr(slug), 15000)
    const held = await evaluate(criticalHooksExpr(slug))
    assertFirstPaintBaseline(slug, held)
    assert(String(held?.title || '') === fallbackTitle, `${slug} timeout: SSR/fallback title missing`)
    await setMock(evaluate, { mode: 'network' })
    await delay(600)
    const afterTimeout = await evaluate(criticalHooksExpr(slug))
    assertFirstPaintBaseline(slug, afterTimeout)
    assert(String(afterTimeout?.title || '') === fallbackTitle, `${slug} timeout: fallback lost after abort-like fail`)
    assert(afterTimeout?.consoleErrors === 0, `${slug} timeout: console errors`)
    console.log(`  ${slug} failure:timeout: PASS`)
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
      divergent.products = divergent.products.map((product) => {
        if (product.catalog_key === 'boxspring') {
          return {
            ...product,
            image: { url: '/uploads/cms-hotels-boxspring-marker.png' },
          }
        }
        if (product.catalog_key === 'accessories') {
          return {
            ...product,
            image: { url: '/uploads/cms-hotels-accessories-marker.png' },
          }
        }
        return product
      })
    } else if (slug === 'dealers') {
      divergent.hero = {
        ...divergent.hero,
        title: 'CMS Dealers Title Marker',
      }
      divergent.contact_section_title = 'CMS Dealers Contact Marker'
      divergent.quality_image = { url: '/uploads/cms-dealers-quality-marker.avif' }
      divergent.geography_map_image = { url: '/uploads/cms-dealers-map-marker.svg' }
    } else if (slug === 'contacts') {
      divergent.hero = {
        ...divergent.hero,
        title: 'CMS Contacts Title Marker',
        image: { url: '/uploads/cms-contacts-hero-marker.png' },
      }
      divergent.map_title = 'CMS Contacts Map Marker'
      divergent.contact_section_title = 'CMS Contacts Contact Marker'
      divergent.offices = divergent.offices.map((office) =>
        office.slug === 'main'
          ? {
              ...office,
              map_embed_url:
                'https://yandex.ru/map-widget/v1/?ll=34.152577%2C44.970737&z=16&cms=contacts-map-marker',
            }
          : office,
      )
    } else if (LEGAL_PAGE_SET.has(slug)) {
      divergent.title = `CMS ${slug} Title Marker`
      divergent.effective_date = '2026-04-15'
      // Mutate first paragraph text so body visibly updates
      const firstPara = divergent.body.find((b) => b.type === 'paragraph')
      if (firstPara?.runs?.[0]?.type === 'text') {
        firstPara.runs[0].value = `CMS ${slug} body marker. ${firstPara.runs[0].value}`
      }
    } else {
      divergent.hero = {
        ...divergent.hero,
        title: 'CMS Documents Title Marker',
        image: { url: '/uploads/cms-documents-hero-marker.png' },
      }
      divergent.help_title = 'CMS Documents Help Marker'
      divergent.help_cta_label = 'CMS Documents Help CTA'
      divergent.company_illustration = { url: '/uploads/cms-documents-company-marker.svg' }
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
      await waitFor(
        evaluate,
        `${slug} product currentSrc CMS`,
        `(() => {
          const box = document.querySelector('[data-catalog="boxspring"] .product-card-image img')
          const acc = document.querySelector('[data-catalog="accessories"] .product-card-image img')
          const boxOk = (box?.currentSrc || '').includes('cms-hotels-boxspring-marker')
          const accOk = (acc?.currentSrc || '').includes('cms-hotels-accessories-marker')
          const noLegacy =
            document.querySelectorAll('[data-catalog="boxspring"] .product-card-image source').length === 0 &&
            document.querySelectorAll('[data-catalog="accessories"] .product-card-image source').length === 0
          return boxOk && accOk && noLegacy
        })()`,
        15000,
      )
    } else if (slug === 'dealers') {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('.page-hero-title')?.textContent?.trim() === 'CMS Dealers Title Marker'`,
        15000,
      )
    } else if (slug === 'contacts') {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('.contacts-hero-title')?.textContent?.trim() === 'CMS Contacts Title Marker'`,
        15000,
      )
      await waitFor(
        evaluate,
        `${slug} map embed marker`,
        `(() => {
          const main = document.querySelector('#map-main')
          return (
            main?.tagName === 'IFRAME' &&
            (main.getAttribute('src') || '').includes('cms=contacts-map-marker') &&
            !document.documentElement.innerHTML.includes('map_iframe_html')
          )
        })()`,
        15000,
      )
    } else if (LEGAL_PAGE_SET.has(slug)) {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('.legal-page-title')?.textContent?.trim() === 'CMS ${slug} Title Marker'`,
        15000,
      )
      await waitFor(
        evaluate,
        `${slug} success date`,
        `document.querySelector('.legal-page-date')?.textContent?.trim() === 'Дата последнего обновления: 15.04.2026'`,
        15000,
      )
      await waitFor(
        evaluate,
        `${slug} success body`,
        `(document.querySelector('.legal-page-content')?.innerText || '').includes('CMS ${slug} body marker')`,
        15000,
      )
    } else {
      await waitFor(
        evaluate,
        `${slug} success hydrate`,
        `document.querySelector('.documents-hero-title')?.textContent?.trim() === 'CMS Documents Title Marker'`,
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
      {
        const boxspring = productImageByKey(ok, 'boxspring')
        const accessories = productImageByKey(ok, 'accessories')
        assert(boxspring?.sourceCount === 0, `${slug} success: CMS boxspring must drop legacy sources`)
        assert(accessories?.sourceCount === 0, `${slug} success: CMS accessories must drop legacy sources`)
        assertCurrentSrcIncludes(`${slug} success boxspring`, boxspring, 'cms-hotels-boxspring-marker')
        assertCurrentSrcIncludes(`${slug} success accessories`, accessories, 'cms-hotels-accessories-marker')
      }
      assertGeometryKeys(`${slug} success FE-05`, geoBaseline, geoAfter, {
        cta: ['left', 'width'],
        products: ['left', 'width'],
        form: ['left', 'width'],
      })
    } else if (slug === 'dealers') {
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
    } else if (slug === 'contacts') {
      assert(
        JSON.stringify(ok?.topLevelSections) === JSON.stringify(CONTACTS_SECTIONS),
        `${slug} success: section allowlist drifted`,
      )
      assert(
        JSON.stringify(ok?.tabs) === JSON.stringify(CONTACTS_OFFICE_SLUGS),
        `${slug} success: tabs drifted`,
      )
      assert(ok?.heroTitle === 'CMS Contacts Title Marker', `${slug} success: hero title`)
      assert(ok?.mapTitle === 'CMS Contacts Map Marker', `${slug} success: map title`)
      assert(ok?.contactTitle === 'CMS Contacts Contact Marker', `${slug} success: contact title`)
      assert(
        ok?.heroImg === '/uploads/cms-contacts-hero-marker.png',
        `${slug} success: hero image (${ok?.heroImg})`,
      )
      const mainFrame = (ok?.frames || []).find((f) => f.slug === 'main')
      assert(
        mainFrame?.tag === 'IFRAME' && String(mainFrame.src).includes('cms=contacts-map-marker'),
        `${slug} success: main map embed marker (${JSON.stringify(mainFrame)})`,
      )
      assert(!ok?.rawHtml && !ok?.hasDangerousMapHtml, `${slug} success: map HTML leak`)
      assert(ok?.form && ok?.honeypot, `${slug} success: form hooks`)
      assertGeometryKeys(`${slug} success FE-05`, geoBaseline, geoAfter, {
        tabs: ['left', 'width'],
        form: ['left', 'width'],
      })
      await assertContactsMapTabSwitching(evaluate, `${slug} success embed`)
      console.log(`  ${slug} success map tabs: PASS`)
    } else if (LEGAL_PAGE_SET.has(slug)) {
      assert(
        JSON.stringify(ok?.topLevelSections) === JSON.stringify(LEGAL_SECTIONS),
        `${slug} success: section allowlist drifted`,
      )
      assert(ok?.title === `CMS ${slug} Title Marker`, `${slug} success: title`)
      assert(
        ok?.date === 'Дата последнего обновления: 15.04.2026',
        `${slug} success: date (${ok?.date})`,
      )
      assert(ok?.dataLabelOk, `${slug} success: td data-label`)
      assert(!ok?.hasDangerousHtml, `${slug} success: dangerous HTML`)
      assert(ok?.consoleErrors === 0, `${slug} success: console errors`)
      if (slug === 'privacy' || slug === 'terms') {
        assert(ok?.operatorCount === 1, `${slug} success: operator once`)
      }
      assertGeometryKeys(`${slug} success FE-05`, geoBaseline, geoAfter, {
        title: ['left', 'width'],
        content: ['left', 'width'],
        section: ['left', 'width'],
      })
    } else {
      assert(
        JSON.stringify(ok?.topLevelSections) === JSON.stringify(DOCUMENTS_SECTIONS),
        `${slug} success: section allowlist drifted`,
      )
      assert(
        JSON.stringify(ok?.documents) ===
          JSON.stringify([...DOCUMENTS_CERT_KEYS, ...DOCUMENTS_COMPANY_KEYS]),
        `${slug} success: document keys drifted`,
      )
      assert(ok?.heroTitle === 'CMS Documents Title Marker', `${slug} success: hero title`)
      assert(ok?.helpTitle === 'CMS Documents Help Marker', `${slug} success: help title`)
      assert(ok?.helpCta === 'CMS Documents Help CTA', `${slug} success: help cta`)
      assert(
        ok?.heroImg === '/uploads/cms-documents-hero-marker.png',
        `${slug} success: hero image (${ok?.heroImg})`,
      )
      assert(
        ok?.companyImg === '/uploads/cms-documents-company-marker.svg',
        `${slug} success: company illustration (${ok?.companyImg})`,
      )
      assert(ok?.help && ok?.requestTriggers >= 5, `${slug} success: hooks`)
      assertGeometryKeys(`${slug} success FE-05`, geoBaseline, geoAfter, {
        certs: ['left', 'width'],
        // CTA label changes on divergent hydrate → width may reflow; left must stay.
        help: ['left'],
      })
    }
    console.log(`  ${slug} success: PASS`, JSON.stringify({ geoBaseline, geoAfter }))
  }

  // --- Hotels: null product.image → code-owned responsive <picture> (fresh navigation; success cache) ---
  if (slug === 'hotels') {
    const nullImages = structuredClone(parityPayload)
    nullImages.products = nullImages.products.map((product) => ({ ...product, image: null }))
    await navigateWithMock(cdp, slug, {
      mode: 'json',
      status: 200,
      body: envelope(nullImages, 'strapi'),
    })
    await waitFor(evaluate, `${slug} null-image paint`, hooksReadyExpr(slug), 15000)
    await waitFor(
      evaluate,
      `${slug} null-image responsive`,
      `(() => {
        const box = document.querySelector('[data-catalog="boxspring"] .product-card-image')
        const acc = document.querySelector('[data-catalog="accessories"] .product-card-image')
        const boxSources = box?.querySelectorAll('source').length || 0
        const accSources = acc?.querySelectorAll('source').length || 0
        const boxSrc = box?.querySelector('img')?.currentSrc || ''
        const accSrc = acc?.querySelector('img')?.currentSrc || ''
        return (
          boxSources >= 3 &&
          accSources >= 3 &&
          boxSrc.includes('boxspring') &&
          accSrc.includes('accessories')
        )
      })()`,
      15000,
    )
    const fallback = await evaluate(criticalHooksExpr(slug))
    const boxFallback = productImageByKey(fallback, 'boxspring')
    const accFallback = productImageByKey(fallback, 'accessories')
    assert(boxFallback?.sourceCount >= 3, `${slug} null-image: boxspring needs legacy sources`)
    assert(accFallback?.sourceCount >= 3, `${slug} null-image: accessories needs legacy sources`)
    assertCurrentSrcIncludes(`${slug} null-image boxspring`, boxFallback, 'boxspring')
    assertCurrentSrcIncludes(`${slug} null-image accessories`, accFallback, 'accessories')
    console.log(`  ${slug} null-image fallback: PASS`, JSON.stringify({ boxFallback, accFallback }))
  }

  // --- Contacts: null map_embed_url → placeholder (JS map path), never HTML ---
  if (slug === 'contacts') {
    const nullMaps = structuredClone(parityPayload)
    nullMaps.offices = nullMaps.offices.map((office) => ({ ...office, map_embed_url: null }))
    await navigateWithMock(cdp, slug, {
      mode: 'json',
      status: 200,
      body: envelope(nullMaps, 'strapi'),
    })
    await waitFor(evaluate, `${slug} null-map paint`, hooksReadyExpr(slug), 15000)
    await waitFor(
      evaluate,
      `${slug} null-map placeholders`,
      `(() => {
        const frames = [...document.querySelectorAll('[data-map-frame]')]
        return (
          frames.length === 4 &&
          frames.every((el) => el.tagName === 'DIV' && el.getAttribute('data-map-embed') !== '1') &&
          !!document.querySelector('#map-main.contacts-map-placeholder') &&
          !document.documentElement.innerHTML.includes('map_iframe_html')
        )
      })()`,
      15000,
    )
    const nullSnap = await evaluate(criticalHooksExpr(slug))
    assert(
      (nullSnap?.frames || []).every((f) => f.tag === 'DIV' && !f.embed && !f.src),
      `${slug} null-map: expected placeholder divs (${JSON.stringify(nullSnap?.frames)})`,
    )
    assert(!nullSnap?.rawHtml && !nullSnap?.hasDangerousMapHtml, `${slug} null-map: HTML leak`)
    await assertContactsMapTabSwitching(evaluate, `${slug} null-map placeholder`)
    console.log(`  ${slug} null-map fallback: PASS`, JSON.stringify({ frames: nullSnap?.frames }))
  }

  // --- FE-05 content-equal parity hydrate ---
  {
    await navigateWithMock(cdp, slug, { mode: 'hold' })
    await waitFor(evaluate, `${slug} parity paint`, hooksReadyExpr(slug), 15000)
    await stabilizeViewport(evaluate)
    const before = await evaluate(geometryExpr(slug))
    const beforeHooks = await evaluate(criticalHooksExpr(slug))
    await setMock(evaluate, { mode: 'json', status: 200, body: envelope(parityPayload) })
    await delay(1000)
    await stabilizeViewport(evaluate)
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
    } else if (slug === 'dealers') {
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
    } else if (slug === 'contacts') {
      assertGeometryKeys(`${slug} FE-05 parity`, before, after, fe05DelayedMap(slug))
      assert(
        JSON.stringify(beforeHooks?.tabs) === JSON.stringify(afterHooks?.tabs),
        `${slug} parity: tabs changed`,
      )
      assert(
        JSON.stringify((beforeHooks?.frames || []).map((f) => f.src)) ===
          JSON.stringify((afterHooks?.frames || []).map((f) => f.src)),
        `${slug} parity: map src changed on content-equal`,
      )
    } else if (LEGAL_PAGE_SET.has(slug)) {
      assertGeometryKeys(`${slug} FE-05 parity`, before, after, fe05DelayedMap(slug))
      assert(beforeHooks?.title === afterHooks?.title, `${slug} parity: title changed`)
      assert(beforeHooks?.date === afterHooks?.date, `${slug} parity: date changed`)
      assert(beforeHooks?.h2 === afterHooks?.h2, `${slug} parity: h2 count`)
      assert(beforeHooks?.operatorCount === afterHooks?.operatorCount, `${slug} parity: operator`)
      assert(
        Math.abs((before?.content?.height || 0) - (after?.content?.height || 0)) <= 1,
        `${slug} parity: content height changed ${JSON.stringify({
          before: before?.content,
          after: after?.content,
        })}`,
      )
      assert(afterHooks?.consoleErrors === 0, `${slug} parity: console errors`)
      assert(afterHooks?.dataLabelOk, `${slug} parity: data-label`)
    } else {
      assertGeometryKeys(`${slug} FE-05 parity`, before, after, fe05DelayedMap(slug))
      assert(
        JSON.stringify(beforeHooks?.documents) === JSON.stringify(afterHooks?.documents),
        `${slug} parity: documents keys changed`,
      )
      assert(beforeHooks?.certCards === afterHooks?.certCards, `${slug} parity: cert count`)
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

  console.log('\npages-cms hydrate-dom PASS (wave-1 + legal pages)')
  cleanup()
  process.exit(0)
} catch (err) {
  console.error('pages-cms hydrate-dom crashed:', err)
  cleanup()
  process.exit(1)
}
