#!/usr/bin/env node
/**
 * Phase 5 D3 — live mutation via harness Strapi IPC → Node TTL=0 → React DOM → restore.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
let previousTitle = null
let token = null

async function restoreIfNeeded() {
  if (stack && previousTitle != null && stack.strapi && !stack.strapi.killed) {
    try {
      await stack.ipc({ type: 'restore-index-solutions-title', value: previousTitle })
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  stack = await startIsolatedPagesCmsStack({ withVite: true })
  const { nodePort, vitePort } = stack.ports
  const nodeBase = `http://127.0.0.1:${nodePort}`
  const viteBase = `http://127.0.0.1:${vitePort}`

  token = `phase5_live_${process.pid}_${Date.now()}`

  const before = await fetch(`${nodeBase}/api/pages/index`).then((r) => r.json())
  assert(before?.source === 'strapi' || before?.data, `baseline index source=${before?.source}`)
  const baselineTitle = before?.data?.solutions_title
  assert(typeof baselineTitle === 'string' && baselineTitle.length > 0, 'baseline solutions_title')

  const mutated = await stack.ipc({ type: 'mutate-index-solutions-title', token })
  assert(mutated.ok, `mutate failed: ${mutated.error}`)
  previousTitle = mutated.previous
  assert(previousTitle === baselineTitle, 'IPC previous must match Node baseline')

  const afterMut = await fetch(`${nodeBase}/api/pages/index`).then((r) => r.json())
  assert(afterMut?.data?.solutions_title === token, `Node title after mutate: ${afterMut?.data?.solutions_title}`)

  chromeSession = createChromeSession(`${viteBase}/`, {
    tempPrefix: 'phase5-live-edit-',
  })
  await waitForDevtools(chromeSession.port)
  const tab = await findCatalogTab(chromeSession.port, `${viteBase}/`, 20000)
  const socket = await connectChromeDevtools(tab.webSocketDebuggerUrl)
  chromeSession.socket = socket
  const cdp = createCdpClient(socket)
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.navigate', { url: `${viteBase}/` })
  await delay(2500)

  let found = false
  for (let i = 0; i < 40; i++) {
    const ev = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hs = [...document.querySelectorAll('h2.section-title')].map(h => h.textContent.trim())
        return { hs, hasToken: hs.includes(${JSON.stringify(token)}) }
      })()`,
      returnByValue: true,
    })
    if (ev?.result?.value?.hasToken) {
      found = true
      break
    }
    await delay(250)
  }
  assert(found, 'React DOM did not show mutated solutions_title token')

  const restored = await stack.ipc({ type: 'restore-index-solutions-title', value: previousTitle })
  assert(restored.ok, `restore failed: ${restored.error}`)
  previousTitle = null

  const afterRestore = await fetch(`${nodeBase}/api/pages/index`).then((r) => r.json())
  assert(
    afterMut?.data && afterRestore?.data?.solutions_title === baselineTitle,
    `restore Node title: ${afterRestore?.data?.solutions_title}`,
  )

  cleanupChromeSession(chromeSession)
  chromeSession = null

  assertForbiddenPortsUntouched(stack.baselineListeners)
  const porcelainAfter = gitPorcelain()
  // Allow only transient harness artifacts under .tmp (not tracked) — porcelain for tracked paths must match.
  // git status --porcelain includes untracked .tmp if not ignored — .tmp usually gitignored.
  assert(
    porcelainAfter === stack.baselinePorcelain,
    `porcelain drifted\n--- before ---\n${stack.baselinePorcelain}\n--- after ---\n${porcelainAfter}`,
  )
}

try {
  await main()
} catch (err) {
  failures.push(`gate crashed: ${err instanceof Error ? err.message : String(err)}`)
} finally {
  try {
    await restoreIfNeeded()
  } catch {
    /* ignore */
  }
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
  console.error('check:pages-cms-live-edit FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}
console.log('check:pages-cms-live-edit PASS')
