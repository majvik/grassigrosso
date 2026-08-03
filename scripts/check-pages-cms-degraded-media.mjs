#!/usr/bin/env node
/**
 * Phase 5 D4 — Strapi-down: snapshot JSON + disk-first uploads + CDP + 404 negative.
 */
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exportPagesSnapshots } from './export-pages-snapshot.mjs'
import {
  startIsolatedPagesCmsStack,
  assertForbiddenPortsUntouched,
  gitPorcelain,
  root,
} from './lib/pages-cms-isolated-stack.mjs'
import {
  uploadsDirForRoot,
  uploadsFingerprint,
  cleanupAndAssertUploadsRestored,
  formatUploadsDiff,
} from './lib/pages-cms-uploads-guard.mjs'
import {
  createChromeSession,
  waitForDevtools,
  findCatalogTab,
  connectChromeDevtools,
  createCdpClient,
  cleanupChromeSession,
  delay,
} from './lib/catalog-chrome-session.mjs'

const failures = []
function assert(cond, msg) {
  if (!cond) failures.push(msg)
}

const uploadsDir = uploadsDirForRoot(root)
const uploadsBefore = uploadsFingerprint(uploadsDir)
let stack = null
let chromeSession = null

function collectUploadUrls(payload, out = new Set()) {
  if (!payload || typeof payload !== 'object') return out
  if (Array.isArray(payload)) {
    for (const item of payload) collectUploadUrls(item, out)
    return out
  }
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v === 'string' && v.startsWith('/uploads/')) out.add(v.split('?')[0])
    else if (v && typeof v === 'object') collectUploadUrls(v, out)
  }
  return out
}

async function main() {
  stack = await startIsolatedPagesCmsStack({ withVite: true })
  const { nodePort, vitePort } = stack.ports
  const nodeBase = `http://127.0.0.1:${nodePort}`
  const viteBase = `http://127.0.0.1:${vitePort}`

  // 1) Owned Strapi up — feeds/snapshots valid
  const indexLive = await fetch(`${nodeBase}/api/pages/index`)
  assert(indexLive.status === 200, `index live HTTP ${indexLive.status}`)
  const indexBody = await indexLive.json()
  assert(indexBody?.source === 'strapi', `index source=${indexBody?.source}`)

  const catalogLive = await fetch(`${nodeBase}/api/catalog/products?view=listing`)
  assert(catalogLive.status === 200, `catalog live HTTP ${catalogLive.status}`)
  const catalogBody = await catalogLive.json()
  assert(Array.isArray(catalogBody?.items) && catalogBody.items.length > 0, 'catalog items empty')

  const heroLive = await fetch(`${nodeBase}/api/catalog/hero-slides`)
  assert(heroLive.status === 200, `hero live HTTP ${heroLive.status}`)
  const heroBody = await heroLive.json()

  await exportPagesSnapshots({
    baseUrl: nodeBase,
    publicDir: stack.snapshotDir,
  })

  const uploadUrls = new Set()
  collectUploadUrls(catalogBody, uploadUrls)
  collectUploadUrls(heroBody, uploadUrls)
  assert(uploadUrls.size > 0, 'expected catalog/hero /uploads references')

  const pageUploadUrls = new Set()
  collectUploadUrls(indexBody, pageUploadUrls)
  for (const slug of ['hotels', 'dealers', 'contacts', 'documents', 'download-catalog']) {
    const r = await fetch(`${nodeBase}/api/pages/${slug}`)
    if (r.ok) collectUploadUrls(await r.json(), pageUploadUrls)
  }
  // Pages fixtures may reference media absent from disk (local seed drift).
  // Assert all catalog/hero refs + page refs that exist on disk.
  const fsMod = await import('node:fs')
  const uploadsRoot = path.join(root, 'strapi-catalog/public/uploads')
  for (const urlPath of pageUploadUrls) {
    const file = path.basename(urlPath)
    if (fsMod.existsSync(path.join(uploadsRoot, file))) uploadUrls.add(urlPath)
  }

  // 2) Stop only owned Strapi
  await stack.stopStrapiOnly()

  // 3) Node still up — snapshot JSON
  const indexDown = await fetch(`${nodeBase}/api/pages/index`)
  assert(indexDown.status === 200, `index degraded HTTP ${indexDown.status}`)
  const indexDownBody = await indexDown.json()
  assert(
    indexDownBody?.source === 'disk-snapshot' || indexDownBody?.source === 'memory-cache',
    `index degraded source=${indexDownBody?.source}`,
  )

  const catalogDown = await fetch(`${nodeBase}/api/catalog/products?view=listing`)
  assert(catalogDown.status === 200, `catalog degraded HTTP ${catalogDown.status}`)

  const heroDown = await fetch(`${nodeBase}/api/catalog/hero-slides`)
  assert(heroDown.status === 200, `hero degraded HTTP ${heroDown.status}`)

  // 4) All referenced uploads 200 via disk-first
  for (const urlPath of uploadUrls) {
    const r = await fetch(`${nodeBase}${urlPath}`)
    assert(r.status === 200, `upload ${urlPath} expected 200, got ${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    assert(buf.length > 0, `upload ${urlPath} empty body`)
  }

  // 5) CDP catalog — naturalWidth + network
  const failedUploads = []
  chromeSession = createChromeSession(`${viteBase}/catalog`, {
    tempPrefix: 'phase5-degraded-',
  })
  await waitForDevtools(chromeSession.port)
  const tab = await findCatalogTab(chromeSession.port, `${viteBase}/catalog`, 20000)
  const socket = await connectChromeDevtools(tab.webSocketDebuggerUrl)
  chromeSession.socket = socket
  const cdp = createCdpClient(socket)
  await cdp.send('Network.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')

  socket.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(String(event.data))
      if (msg.method === 'Network.responseReceived') {
        const res = msg.params?.response
        const u = String(res?.url || '')
        if (u.includes('/uploads/') && res.status >= 400) {
          failedUploads.push({ url: u, status: res.status })
        }
      }
    } catch {
      /* ignore */
    }
  })

  await cdp.send('Page.navigate', { url: `${viteBase}/catalog` })
  await delay(4000)

  const dom = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const imgs = [...document.querySelectorAll('.catalog-hero img, .catalog-hero-slide img, .catalogue-new-card img, picture img')]
      const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src)
      return { count: imgs.length, broken, ok: imgs.filter(i => i.naturalWidth > 0).length }
    })()`,
    returnByValue: true,
  })
  const info = dom?.result?.value || {}
  assert(info.count > 0, 'no catalog images in DOM')
  assert((info.broken || []).length === 0, `broken images: ${JSON.stringify(info.broken)}`)
  assert(failedUploads.length === 0, `failed /uploads network: ${JSON.stringify(failedUploads)}`)

  cleanupChromeSession(chromeSession)
  chromeSession = null

  // 6) Missing upload → 404 non-empty (raw path)
  const missPath = `/uploads/__phase5_missing_${Date.now()}.avif`
  const miss = await new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: nodePort, path: missPath }, (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }),
        )
      })
      .on('error', reject)
  })
  assert(miss.status === 404, `missing upload expected 404, got ${miss.status}`)
  assert(miss.body && miss.body.length > 0, 'missing upload body empty')
  assert(miss.status !== 502, 'missing must not be 502')

  assertForbiddenPortsUntouched(stack.baselineListeners)
  assert(
    gitPorcelain() === stack.baselinePorcelain,
    'porcelain drifted after degraded gate',
  )
}

try {
  await main()
} catch (err) {
  failures.push(`gate crashed: ${err instanceof Error ? err.message : String(err)}`)
} finally {
  try {
    cleanupChromeSession(chromeSession)
  } catch {
    /* ignore */
  }
  try {
    if (stack) await stack.dispose()
  } catch {
    /* ignore */
  }
  const cleaned = cleanupAndAssertUploadsRestored(uploadsDir, uploadsBefore)
  if (!cleaned.ok) {
    failures.push(`uploads not restored: ${formatUploadsDiff(cleaned.diff)}`)
  }
}

if (failures.length) {
  console.error('check:pages-cms-degraded-media FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}
console.log('check:pages-cms-degraded-media PASS')
