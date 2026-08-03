#!/usr/bin/env node
/**
 * Phase 5 D3 — live mutation via harness Strapi IPC → Node TTL=0 → React DOM → restore.
 * Includes injected post-mutation failure proving restore is mandatory and verified.
 */
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
let baselineTitle = null

async function restoreAndVerify(label) {
  if (previousTitle == null || !stack) return
  const expected = previousTitle
  let restoreOk = false
  let restoreError = ''
  try {
    if (stack.strapiStopped || stack.strapi?.killed || stack.strapi?.exitCode != null) {
      throw new Error('Strapi unavailable for restore')
    }
    const restored = await stack.ipc({ type: 'restore-index-solutions-title', value: expected })
    if (!restored.ok) throw new Error(restored.error || 'restore ok=false')
    restoreOk = true
  } catch (err) {
    restoreError = err instanceof Error ? err.message : String(err)
    failures.push(`${label}: restore IPC failed: ${restoreError}`)
    return
  } finally {
    previousTitle = null
  }

  if (!restoreOk) return

  const viaIpc = await stack.ipc({ type: 'get-index-solutions-title' })
  assert(viaIpc.ok, `${label}: get-title IPC failed: ${viaIpc.error}`)
  assert(
    viaIpc.value === expected,
    `${label}: document service title ${JSON.stringify(viaIpc.value)} !== ${JSON.stringify(expected)}`,
  )

  const { nodePort } = stack.ports
  const viaNode = await fetch(`http://127.0.0.1:${nodePort}/api/pages/index`).then((r) => r.json())
  assert(
    viaNode?.data?.solutions_title === expected,
    `${label}: Node title ${JSON.stringify(viaNode?.data?.solutions_title)} !== baseline`,
  )
}

async function main() {
  stack = await startIsolatedPagesCmsStack({ withVite: true })

  const { nodePort, vitePort } = stack.ports
  const nodeBase = `http://127.0.0.1:${nodePort}`
  const viteBase = `http://127.0.0.1:${vitePort}`

  const before = await fetch(`${nodeBase}/api/pages/index`).then((r) => r.json())
  assert(before?.source === 'strapi' || before?.data, `baseline index source=${before?.source}`)
  baselineTitle = before?.data?.solutions_title
  assert(typeof baselineTitle === 'string' && baselineTitle.length > 0, 'baseline solutions_title')

  const token = `phase5_live_${process.pid}_${Date.now()}`
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
  await cdp.send('Page.enable')
  await cdp.send('Page.navigate', { url: `${viteBase}/` })
  await delay(2500)

  let found = false
  for (let i = 0; i < 40; i++) {
    const ev = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hs = [...document.querySelectorAll('h2.section-title')].map(h => h.textContent.trim())
        return { hasToken: hs.includes(${JSON.stringify(token)}) }
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

  await restoreAndVerify('happy-path')

  // Injected post-mutation failure: restore must still run and be verified.
  const token2 = `phase5_inject_${process.pid}_${Date.now()}`
  const mut2 = await stack.ipc({ type: 'mutate-index-solutions-title', token: token2 })
  assert(mut2.ok, `inject mutate failed: ${mut2.error}`)
  previousTitle = mut2.previous
  assert(previousTitle === baselineTitle, 'inject previous must be baseline')
  try {
    throw new Error('injected post-mutation failure')
  } catch (err) {
    assert(
      String(err.message) === 'injected post-mutation failure',
      'injected failure must propagate to catch',
    )
  } finally {
    await restoreAndVerify('injected-failure')
  }

  cleanupChromeSession(chromeSession)
  chromeSession = null

  assertForbiddenPortsUntouched(stack.baselineListeners)
}

try {
  await main()
} catch (err) {
  failures.push(`gate crashed: ${err instanceof Error ? err.message : String(err)}`)
} finally {
  try {
    await restoreAndVerify('final-finally')
  } catch (err) {
    failures.push(
      `final restore crashed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  try {
    cleanupChromeSession(chromeSession)
  } catch {
    /* ignore */
  }
  const baselineListeners = stack?.baselineListeners
  const baselinePorcelain = stack?.baselinePorcelain
  try {
    if (stack) await stack.dispose()
  } catch {
    /* ignore */
  }
  const cleaned = cleanupAndAssertUploadsRestored(uploadsDir, uploadsBefore)
  if (!cleaned.ok) {
    failures.push(`uploads not restored: ${formatUploadsDiff(cleaned.diff)}`)
  }
  if (baselineListeners) {
    try {
      assertForbiddenPortsUntouched(baselineListeners)
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err))
    }
  }
  if (baselinePorcelain != null) {
    assert(
      gitPorcelain() === baselinePorcelain,
      `porcelain drifted\n--- before ---\n${baselinePorcelain}\n--- after ---\n${gitPorcelain()}`,
    )
  }
}

if (failures.length) {
  console.error('check:pages-cms-live-edit FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}
console.log('check:pages-cms-live-edit PASS')
