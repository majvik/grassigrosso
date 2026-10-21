#!/usr/bin/env node
import { cleanupChromeSession, delay, startCatalogChromeSession } from './lib/catalog-chrome-session.mjs'

const baseUrl = String(process.env.MODAL_UI_BASE_URL || 'http://127.0.0.1:5174').replace(/\/+$/, '')
const failures = []

async function waitFor(evaluate, label, expression, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evaluate(expression)
    if (value) return value
    await delay(150)
  }
  failures.push(`${label}: timed out`)
  return false
}

async function checkPage(pagePath, expectations) {
  let session
  try {
    session = await startCatalogChromeSession(baseUrl, pagePath)
    const evaluate = (expression, timeoutMs) => session.cdp.evaluate(expression, timeoutMs)
    await waitFor(evaluate, `${pagePath} loaded`, `document.readyState === 'complete'
      && getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() !== ''`, 10000)

    for (const expectation of expectations) {
      await waitFor(evaluate, `${pagePath} ${expectation.label}`, `(() => {
        const overlay = document.querySelector(${JSON.stringify(expectation.overlay)})
        const surface = overlay?.querySelector(${JSON.stringify(expectation.surface)})
        const close = surface?.querySelector(${JSON.stringify(expectation.close)})
        return Boolean(
          overlay?.classList.contains('site-modal-overlay')
          && surface?.classList.contains(${JSON.stringify(expectation.media ? 'site-modal-media-surface' : 'site-modal-surface')})
          && close?.classList.contains('site-modal-close')
        )
      })()`)
    }

    await waitFor(evaluate, `${pagePath} short modal keeps natural height and shared geometry`, `(() => {
      const probe = document.createElement('div')
      probe.className = 'site-modal-overlay'
      probe.style.opacity = '1'
      probe.style.visibility = 'visible'
      probe.innerHTML = '<section class="site-modal-surface" style="width:320px"><button class="site-modal-close" aria-label="Закрыть">×</button><p style="margin:0">Короткое окно</p></section>'
      document.documentElement.appendChild(probe)
      const surface = probe.querySelector('.site-modal-surface')
      const close = probe.querySelector('.site-modal-close')
      const surfaceRect = surface.getBoundingClientRect()
      const closeStyles = getComputedStyle(close)
      const result = surfaceRect.height < 220
        && surfaceRect.top >= 47
        && window.innerHeight - surfaceRect.bottom >= 47
        && getComputedStyle(surface).borderRadius === '24px'
        && getComputedStyle(surface).boxShadow !== 'none'
        && closeStyles.backgroundColor === 'rgb(255, 255, 255)'
        && closeStyles.borderRadius === '999px'
        && closeStyles.width === closeStyles.height
      probe.remove()
      return result
    })()`)

    await waitFor(evaluate, `${pagePath} exclusions stay outside modal shell`, `(() => {
      const cookie = document.querySelector('.cookie-banner')
      const mobileMenu = document.querySelector('.mobile-menu')
      const excluded = [cookie, mobileMenu].filter(Boolean)
      return excluded.length > 0 && excluded.every((node) => (
        !node.classList.contains('site-modal-overlay')
        && !node.classList.contains('site-modal-surface')
        && !node.classList.contains('site-modal-media-surface')
      ))
    })()`)
  } finally {
    if (session) cleanupChromeSession(session)
  }
}

await checkPage('/', [
  { label: 'document request shell', overlay: '#documentRequestModal', surface: '.catalog-request-modal-content', close: '.document-request-close' },
  { label: 'commercial offer shell', overlay: '#commercialOfferModal', surface: '.commercial-offer-modal-content', close: '.commercial-offer-close' },
  { label: 'video shell', overlay: '#videoModal', surface: '.modal-content', close: '.modal-close', media: true },
])

await checkPage('/hotels', [
  { label: 'catalog request shell', overlay: '#catalogRequestModal', surface: '.catalog-request-modal-content', close: '.catalog-request-close' },
])

await checkPage('/documents', [
  { label: 'help request shell', overlay: '#helpDocumentsModal', surface: '.catalog-request-modal-content', close: '.help-documents-close' },
])

await checkPage('/dealers', [
  { label: 'quality video shell', overlay: '#videoModal', surface: '.modal-content', close: '.modal-close', media: true },
])

await checkPage('/catalog', [
  { label: 'product shell', overlay: '#catalogueImageModal', surface: '.catalogue-new-image-modal-dialog', close: '#catalogueImageModalClose' },
  { label: 'filter help shell', overlay: '#catalogueFilterHelpModal', surface: '.catalogue-new-filter-help-modal-dialog', close: '#catalogueFilterHelpModalClose' },
  { label: 'favourites clear shell', overlay: '#catalogueFavouritesClearModal', surface: '.catalogue-new-favourites-clear-modal-dialog', close: '#catalogueFavouritesClearModalClose' },
])

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Modal system ok: ${baseUrl}`)
