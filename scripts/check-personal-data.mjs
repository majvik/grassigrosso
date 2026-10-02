#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import {
  cleanupChromeSession,
  connectChromeDevtools,
  createCdpClient,
  createChromeSession,
  delay,
  findCatalogTab,
  waitForDevtools,
} from './lib/catalog-chrome-session.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const esbuild = require('esbuild')
const consentBundle = path.join(os.tmpdir(), `gg-consent-model-${process.pid}.mjs`)
esbuild.buildSync({
  entryPoints: [path.join(root, 'src/cookie-consent-config.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: consentBundle,
})
const failures = []
function check(cond, message) {
  if (!cond) failures.push(message)
}

const {
  ANALYTICS_CONSENT_VERSION,
  YANDEX_MAPS_CONSENT_VERSION,
  createConsentRecord,
  effectiveConsent,
  parseCookieConsentRecord,
} = await import(pathToFileURL(consentBundle).href)
const consentRegistry = (await import('../lib/consent-registry.cjs')).default

{
  const fresh = createConsentRecord(
    { status: 'granted', version: ANALYTICS_CONSENT_VERSION },
    { status: 'granted', version: YANDEX_MAPS_CONSENT_VERSION },
    '2026-10-02T00:00:00.000Z',
  )
  assert.deepEqual(effectiveConsent(fresh), { analytics: 'granted', yandexMaps: 'granted' })
  const staleAnalytics = createConsentRecord(
    { status: 'granted', version: '1999-01-01' },
    { status: 'granted', version: YANDEX_MAPS_CONSENT_VERSION },
    '2026-10-02T00:00:00.000Z',
  )
  assert.deepEqual(effectiveConsent(staleAnalytics), { analytics: 'unset', yandexMaps: 'granted' })
  const staleMaps = createConsentRecord(
    { status: 'denied', version: ANALYTICS_CONSENT_VERSION },
    { status: 'granted', version: '1999-01-01' },
    '2026-10-02T00:00:00.000Z',
  )
  assert.deepEqual(effectiveConsent(staleMaps), { analytics: 'denied', yandexMaps: 'unset' })
  assert.equal(parseCookieConsentRecord({ ...fresh, schemaVersion: 99 }), null)
  assert.equal(parseCookieConsentRecord('nope'), null)
  assert.equal(consentRegistry.consentRequestError({}), 'consent-required')
  assert.equal(consentRegistry.consentRequestError({
    consentAccepted: true,
    consentDocumentId: 'other',
    formId: 'x',
    pagePath: '/',
  }), 'consent-required')
  assert.equal(consentRegistry.consentRequestError({
    consentAccepted: true,
    consentDocumentId: 'personal-data-consent',
    formId: 'contact',
    pagePath: '/',
    documentVersion: 'fake',
    documentSha256: 'fake',
    acceptedAt: '2000-01-01T00:00:00.000Z',
  }), null)
}

{
  const dbPath = path.join(os.tmpdir(), `gg-consent-${Date.now()}.db`)
  process.env.DB_PATH = dbPath
  const db = (await import('../lib/db.cjs')).default
  const lead = { name: 'A', phone: '+7000', email: 'a@example.test', page: 'test' }
  const proof = consentRegistry.consentProof('contact', '/contacts', '2026-10-02T00:00:00.000Z', '203.0.113.5', 'TestAgent')
  try {
    db.insertLeadWithConsent(lead, { ...proof, document_id: null })
    failures.push('null consent document should throw')
  } catch {
    const count = db.getDb().prepare('SELECT COUNT(*) AS c FROM leads').get().c
    check(count === 0, 'failed consent insert rolled back the lead')
  }
  const leadId = db.insertLeadWithConsent(lead, proof)
  const consent = db.consentsForLead(leadId)[0]
  check(consent.document_sha256 === consentRegistry.sha256, 'stored hash comes from the registry')
  check(consent.document_version === '2026-09-14', 'stored version comes from the registry')
  check(consent.ip_address === '203.0.113.5', 'server stores ip on the consent row')
  check(!Object.hasOwn(db.getDb().prepare('SELECT * FROM leads WHERE id = ?').get(leadId), 'ip_address'), 'lead row has no ip column')
  db.getDb().prepare(`UPDATE leads SET status = 'delivered', last_interaction_at = '2000-01-01T00:00:00.000Z' WHERE id = ?`).run(leadId)
  const pendingId = db.insertLeadWithConsent(
    { ...lead, email: 'pending@example.test' },
    proof,
  )
  db.getDb().prepare(`UPDATE leads SET last_interaction_at = '2000-01-01T00:00:00.000Z' WHERE id = ?`).run(pendingId)
  const dry = db.purgeExpiredLeads({ apply: false, retentionDays: 1095, now: Date.parse('2026-10-02T00:00:00.000Z') })
  check(dry.deleted === 0 && dry.matched === 1, 'retention dry-run does not delete')
  check(db.consentsForLead(leadId).length === 1, 'dry-run keeps consent')
  const applied = db.purgeExpiredLeads({ apply: true, retentionDays: 1095, now: Date.parse('2026-10-02T00:00:00.000Z') })
  check(applied.deleted === 1, 'retention apply deletes finished leads')
  check(db.findLeads({ leadId: pendingId }).length === 1, 'pending delivery is kept')
  check(db.consentsForLead(leadId).length === 0, 'apply cascades consent deletion')
  const mode = fs.statSync(dbPath).mode & 0o777
  check(mode === 0o600, `db mode is 0600, got ${mode.toString(8)}`)
  db.closeDb()
  fs.rmSync(dbPath, { force: true })
}

{
  const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith('.html'))
  htmlFiles.push('templates/marketing-page.html')
  for (const file of htmlFiles) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    check(!source.includes('mc.yandex.ru') && !source.includes('ym('), `${file} embeds Metrika`)
  }
  for (const slug of ['privacy', 'cookies', 'personal-data-consent']) {
    check(fs.existsSync(path.join(root, `${slug}.html`)), `${slug}.html missing`)
    const md = fs.readFileSync(path.join(root, 'lib/consent-documents/personal-data-consent.md'), 'utf8')
    check(md.includes('Согласие на обработку персональных данных'), 'canonical consent text')
    const fixture = fs.readFileSync(path.join(root, 'scripts/fixtures/pages-cms', `${slug}.json`), 'utf8')
    if (slug === 'privacy') check(fixture.includes('Бланк отзыва согласия'), 'privacy download link')
    if (slug === 'cookies') check(fixture.includes('3. Яндекс Карты'), 'cookies maps section')
  }
  const privacyHtml = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8')
  check(privacyHtml.includes('/documents/Grassigrosso-form-withdrawal-of-consent.docx'), 'privacy docx href')
  const cookiesHtml = fs.readFileSync(path.join(root, 'cookies.html'), 'utf8')
  check(cookiesHtml.includes('id="yandex-maps"'), 'cookies anchor')
  for (const name of [
    'Grassigrosso-form-withdrawal-of-consent.docx',
    'Grassigrosso-form-data-subject-request.docx',
  ]) {
    const file = path.join(root, 'public/documents', name)
    check(fs.existsSync(file), `${name} published`)
  }
}

const base = process.env.PERSONAL_DATA_BASE_URL || 'http://127.0.0.1:5174'

async function openPage(pagePath, extraArgs = []) {
  const targetUrl = `${base}${pagePath}`
  const session = createChromeSession(targetUrl, { extraArgs, tempPrefix: 'grass-pd-chrome-' })
  await waitForDevtools(session.port)
  const tab = await findCatalogTab(session.port, targetUrl)
  const socket = await connectChromeDevtools(tab.webSocketDebuggerUrl)
  const cdp = createCdpClient(socket)
  const requests = []
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url)
  })
  await cdp.send('Network.enable')
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  return { session, socket, cdp, requests, async close() { cleanupChromeSession({ ...session, socket }) } }
}

async function setViewport(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  })
}

if (failures.length === 0) {
  const home = await openPage('/?pd=1')
  try {
    await setViewport(home.cdp, 390, 844)
    await home.cdp.send('Page.reload', { ignoreCache: true })
    await delay(1500)
    const layout = await home.cdp.evaluate(`(() => {
      const banner = document.querySelector('.cookie-banner')
      const rect = banner.getBoundingClientRect()
      const buttons = [...banner.querySelectorAll('button')].map((node) => node.textContent.trim()).filter(Boolean)
      const close = banner.querySelector('.modal-close')
      const configure = banner.querySelector('[data-cookie-configure]')
      return {
        hidden: banner.hidden,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        inside: rect.left >= -1 && rect.right <= window.innerWidth + 1 && rect.bottom <= window.innerHeight + 1,
        fullWidth: rect.width >= window.innerWidth - 40,
        buttons,
        closeLabel: close?.getAttribute('aria-label') || '',
        configureTag: configure?.tagName || '',
        metrika: !!document.querySelector('script[src*="mc.yandex.ru"]'),
      }
    })()`)
    check(layout.hidden === false, 'first banner is visible')
    check(layout.overflow === false, 'banner page has no horizontal scroll')
    check(layout.inside, 'banner stays inside the viewport')
    check(layout.fullWidth, 'mobile banner is full width')
    check(layout.buttons.includes('Принять все') && layout.buttons.includes('Только необходимые') && layout.configureTag === 'A', 'banner actions')
    check(layout.closeLabel === 'Закрыть', 'banner has modal close')
    check(layout.metrika === false, 'metrika script absent before consent')
    await home.cdp.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
    await delay(200)
    const still = await home.cdp.evaluate(`document.querySelector('.cookie-banner')?.hidden === false`)
    check(still, 'escape does not dismiss the first banner')
    await home.cdp.evaluate(`document.documentElement.style.fontSize = '32px'`)
    await delay(100)
    const zoomed = await home.cdp.evaluate(`(() => {
      const banner = document.querySelector('.cookie-banner')
      const actions = [...banner.querySelectorAll('button')]
      const bannerRect = banner.getBoundingClientRect()
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        reachable: actions.every((node) => node.getBoundingClientRect().height >= 24),
        bannerBottom: bannerRect.bottom <= window.innerHeight + banner.scrollHeight,
      }
    })()`)
    check(zoomed.overflow === false, '200% text does not create horizontal scroll')
    check(zoomed.reachable, '200% text keeps actions rendered')
    await home.cdp.evaluate(`document.documentElement.style.fontSize = ''`)
    await setViewport(home.cdp, 1280, 800)
    await delay(200)
    const desktop = await home.cdp.evaluate(`(() => {
      const banner = document.querySelector('.cookie-banner')
      const rect = banner.getBoundingClientRect()
      return {
        width: Math.round(rect.width),
        rightGap: Math.round(window.innerWidth - rect.right),
        leftGap: Math.round(rect.left),
        actionHeights: [...banner.querySelectorAll('[data-cookie-necessary], [data-cookie-accept-all]')].map((node) => Math.round(node.getBoundingClientRect().height)),
        necessaryInset: getComputedStyle(banner.querySelector('[data-cookie-necessary]')).boxShadow.includes('inset'),
        closeOffset: (() => {
          const close = banner.querySelector('.modal-close').getBoundingClientRect()
          return {
            top: Math.round(close.top - rect.top),
            right: Math.round(rect.right - close.right),
          }
        })(),
        linksOnNewLine: (() => {
          const links = banner.querySelector('.cookie-banner-links')
          const more = links?.querySelector('a[href="/cookies"]')
          const configure = links?.querySelector('[data-cookie-configure]')
          if (!links || !more || !configure) return false
          const copy = banner.querySelector('.cookie-banner-copy').getBoundingClientRect()
          const linksRect = links.getBoundingClientRect()
          const moreRect = more.getBoundingClientRect()
          const configureRect = configure.getBoundingClientRect()
          return (
            linksRect.top >= copy.top + 24 &&
            Math.abs(moreRect.top - configureRect.top) < 4 &&
            moreRect.left - copy.left < 8
          )
        })(),
      }
    })()`)
    check(desktop.width === 520, 'desktop banner matches modal width')
    check(desktop.rightGap >= 16 && desktop.rightGap <= 32 && desktop.leftGap > desktop.rightGap, 'desktop banner is right-aligned')
    check(desktop.necessaryInset && desktop.actionHeights[0] === desktop.actionHeights[1], 'necessary button uses inner stroke')
    check(desktop.closeOffset.top === 8 && desktop.closeOffset.right === 8, 'close button inset is 8px')
    check(desktop.linksOnNewLine, 'details and settings stay on a new line')
    await setViewport(home.cdp, 768, 1024)
    await delay(200)
    const tablet = await home.cdp.evaluate(`(() => {
      const banner = document.querySelector('.cookie-banner')
      const rect = banner.getBoundingClientRect()
      return {
        width: Math.round(rect.width),
        rightGap: Math.round(window.innerWidth - rect.right),
        leftGap: Math.round(rect.left),
      }
    })()`)
    check(tablet.width === 520, 'tablet banner matches modal width')
    check(tablet.rightGap >= 16 && tablet.rightGap <= 32 && tablet.leftGap > tablet.rightGap, 'tablet banner is right-aligned')
    await setViewport(home.cdp, 1280, 800)
    await delay(200)
    await home.cdp.evaluate(`document.querySelector('[data-cookie-configure]')?.click()`)
    await delay(200)
    const settings = await home.cdp.evaluate(`(() => {
      const banner = document.querySelector('.cookie-banner')
      const rect = banner.getBoundingClientRect()
      const divider = banner.querySelector('.cookie-banner-divider')
      const save = banner.querySelector('[data-cookie-save]')
      const list = banner.querySelector('.cookie-settings-list')
      if (!divider || !save || !list) return { ok: false }
      const dividerRect = divider.getBoundingClientRect()
      const saveRect = save.getBoundingClientRect()
      const listRect = list.getBoundingClientRect()
      return {
        ok: true,
        height: Math.round(rect.height),
        saveRight: Math.round(rect.right - saveRect.right),
        saveAfterDivider: saveRect.top >= dividerRect.bottom - 1,
        dividerAfterList: dividerRect.top >= listRect.bottom - 1,
        saveFullWidth: Math.abs(saveRect.width - listRect.width) < 8,
        labelSize: getComputedStyle(banner.querySelector('.checkbox-text')).fontSize,
        descSize: getComputedStyle(banner.querySelector('#cookie-consent-desc')).fontSize,
        labelAlign: getComputedStyle(banner.querySelector('.form-checkbox label')).alignItems,
        disabledStroke: getComputedStyle(banner.querySelector('#cookie-necessary + label .checkmark')).stroke,
        disabledFill: getComputedStyle(banner.querySelector('#cookie-necessary + label .checkbox-fill')).fill,
        enabledFill: getComputedStyle(banner.querySelector('#cookie-analytics + label .checkbox-fill')).fill,
      }
    })()`)
    check(settings.ok, 'settings panel renders save and divider')
    check(settings.height > 0 && settings.height <= 480, 'settings banner hugs content height')
    check(settings.saveAfterDivider && settings.dividerAfterList, 'save sits below the divider')
    check(settings.saveRight <= 32 && settings.saveFullWidth === false, 'save is right-aligned')
    check(settings.labelSize === settings.descSize, 'settings labels match description size')
    check(settings.labelAlign === 'center', 'settings labels are vertically centered')
    check(settings.disabledStroke.includes('107, 114, 128') || settings.disabledStroke.includes('6b7280') || settings.disabledStroke === 'rgb(107, 114, 128)', 'necessary checkmark is gray')
    check(settings.disabledFill === 'rgb(225, 225, 225)' && settings.enabledFill !== settings.disabledFill, 'necessary checkbox fill is disabled gray')
  } finally {
    await home.close()
  }

  const contacts = await openPage('/contacts?pd=1', [])
  try {
    await contacts.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__placemarks = [];
        window.ymaps = {
          ready(fn) { fn() },
          Map: class {
            constructor(el, state) {
              this.el = el; this.state = state;
              this.geoObjects = { add: (mark) => { this.added = mark; el.dataset.added = '1' } };
              this.behaviors = { disable() {} };
              this.events = { add() {} };
              this.container = { fitToViewport() {} };
              this.setCenter = () => {};
              const pin = document.createElement('button');
              pin.className = 'test-office-pin';
              pin.textContent = 'pin';
              el.appendChild(pin);
            }
            destroy() {}
          },
          Placemark: class {
            constructor(center, props) { window.__placemarks.push({ center, props }); this.props = props }
          }
        };`,
    })
    await contacts.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `try { localStorage.removeItem('grassigrosso-cookie-consent-v1') } catch {}`,
    })
    await contacts.cdp.send('Page.reload', { ignoreCache: true })
    await delay(1200)
    const contactInfo = await contacts.cdp.evaluate(`(() => {
      const info = document.querySelector('#contact-form .contact-info')
      if (!info) return { ok: false }
      const kids = [...info.children].map((el) => el.className.split(/\\s+/)[0])
      const item = info.querySelector('.contact-info-item')
      const divider = info.querySelector('.contact-info-divider')
      const space = item && divider
        ? Math.round(divider.getBoundingClientRect().top - item.getBoundingClientRect().bottom)
        : 0
      return { ok: true, kids, space }
    })()`)
    check(contactInfo.ok, 'contact info is present')
    check(
      JSON.stringify(contactInfo.kids) ===
        JSON.stringify([
          'contact-info-item',
          'contact-info-divider',
          'contact-info-item',
          'contact-info-divider',
          'contact-info-item',
        ]),
      'contact info items and dividers are flex siblings',
    )
    check(contactInfo.space >= 32, 'contact divider is spaced from the item')
    const placeholder = await contacts.cdp.evaluate(`(() => {
      const frame = document.querySelector('[data-map-frame]:not([hidden])')
      const picture = frame?.querySelector('picture')
      const paragraph = frame?.querySelector('.contacts-map-consent-copy p')
      const accept = frame?.querySelector('[data-map-consent-accept]')
      const style = accept ? getComputedStyle(accept) : null
      const textStyle = frame?.querySelector('.contacts-map-consent-copy')
      const copyStyle = textStyle ? getComputedStyle(textStyle) : null
      const frameRect = frame?.getBoundingClientRect()
      const copyRect = textStyle?.getBoundingClientRect()
      const centerDelta = frameRect && copyRect
        ? Math.abs((copyRect.left + copyRect.right) / 2 - (frameRect.left + frameRect.right) / 2)
        : 99
      return {
        sources: picture ? [...picture.querySelectorAll('source')].map((node) => node.type + ' ' + node.srcset) : [],
        acceptTag: accept?.tagName || '',
        acceptClass: accept?.className || '',
        detailsInside: paragraph?.querySelector('a')?.getAttribute('href') || '',
        acceptDisplay: style?.display || '',
        align: copyStyle?.textAlign || '',
        copyCentered: centerDelta < 8,
        key: frame?.getAttribute('data-map-placeholder') || '',
        remote: [...document.querySelectorAll('iframe, script')].some((node) => /api-maps|yandex/.test(node.src || '')),
      }
    })()`)
    check(placeholder.key === 'simferopol', 'first office placeholder')
    check(placeholder.sources.some((item) => item.includes('image/avif') && item.includes('@2x.avif')), 'avif srcset')
    check(placeholder.sources.some((item) => item.includes('image/webp')), 'webp srcset')
    check(placeholder.sources.some((item) => item.includes('image/png')), 'png srcset')
    check(placeholder.acceptTag === 'BUTTON' && String(placeholder.acceptClass).includes('btn-contact'), 'map accept uses contact button')
    check(placeholder.detailsInside === '/cookies#yandex-maps', 'details link inside the paragraph')
    check(placeholder.acceptDisplay.includes('flex'), 'accept button is compact')
    check(placeholder.align === 'center' && placeholder.copyCentered, 'consent copy is centered')
    check(placeholder.remote === false, 'maps sdk is not requested before consent')
    const clicked = await contacts.cdp.evaluate(`(() => {
      const link = document.querySelector('[data-map-consent-accept]')
      if (!link) {
        return { ok: false, html: document.querySelector('.contacts-map')?.innerHTML?.slice(0, 500) || 'no-map' }
      }
      link.click()
      return { ok: true }
    })()`)
    check(clicked.ok, `map accept link missing: ${clicked.html || ''}`)
    if (clicked.ok) {
    await delay(400)
    const afterAccept = await contacts.cdp.evaluate(`(() => {
      const raw = JSON.parse(localStorage.getItem('grassigrosso-cookie-consent-v1'))
      const frame = document.querySelector('[data-map-frame]:not([hidden])')
      const canvas = frame?.querySelector('[data-map-canvas]')
      const frameStyle = frame ? getComputedStyle(frame) : null
      return {
        analytics: raw.choices.analytics.status,
        maps: raw.choices.yandexMaps.status,
        pins: document.querySelectorAll('.test-office-pin').length,
        marks: window.__placemarks.length,
        overflow: frameStyle?.overflow || '',
        radius: frameStyle?.borderRadius || '',
        hasCanvas: Boolean(canvas),
      }
    })()`)
    check(afterAccept.analytics === 'unset', 'map accept does not grant analytics')
    check(afterAccept.maps === 'granted', 'map accept grants maps')
    check(afterAccept.marks >= 1 && afterAccept.pins >= 1, 'accepted office renders one placemark')
    check(
      afterAccept.hasCanvas && afterAccept.overflow === 'hidden' && afterAccept.radius.includes('24px'),
      'accepted map keeps rounded clip',
    )
    }
  } finally {
    await contacts.close()
  }
}

if (failures.length) {
  console.error('check:personal-data FAILED')
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}
console.log('check:personal-data PASS')
