#!/usr/bin/env node
/**
 * Phase 5 D2 — SIGINT and SIGTERM must tear down owned Strapi+Node+Vite without parent help.
 * Parent only observes a grace period; emergency kill is only after FAIL is recorded (finally).
 */
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fork } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  FORBIDDEN_PORTS,
  assertForbiddenPortsUntouched,
  gitPorcelain,
  listListeners,
  root,
} from './lib/pages-cms-isolated-stack.mjs'
import {
  uploadsDirForRoot,
  uploadsFingerprint,
  cleanupAndAssertUploadsRestored,
  formatUploadsDiff,
  compareUploadsFingerprints,
} from './lib/pages-cms-uploads-guard.mjs'

const GRACE_MS = 12_000
const POLL_MS = 250
const READY_TIMEOUT_MS = 180_000
const EXIT_TIMEOUT_MS = 15_000

const EXPECTED_EXIT = Object.freeze({
  SIGINT: { code: 130, signal: 'SIGINT' },
  SIGTERM: { code: 143, signal: 'SIGTERM' },
})

const childPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'lib/pages-cms-stack-signal-child.mjs',
)

function pidAlive(pid) {
  if (pid == null || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function portListening(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: '127.0.0.1', port }, () => {
      s.end()
      resolve(true)
    })
    s.on('error', () => resolve(false))
  })
}

function forceKillPid(pid) {
  if (!pid) return
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      /* ignore */
    }
  }
}

/**
 * Observe only — never kill owned children here.
 * @returns {Promise<{ cleared: boolean, leftover: object }>}
 */
async function observeTeardown(ready, deadline) {
  const { strapiPort, nodePort, vitePort } = ready.ports
  const pids = ready.pids || {}

  async function snapshotLeftover() {
    return {
      strapiPort: (await portListening(strapiPort)) ? strapiPort : null,
      nodePort: (await portListening(nodePort)) ? nodePort : null,
      vitePort: (await portListening(vitePort)) ? vitePort : null,
      workDir: fs.existsSync(ready.workDir) ? ready.workDir : null,
      strapiPid: pidAlive(pids.strapi) ? pids.strapi : null,
      nodePid: pidAlive(pids.node) ? pids.node : null,
      vitePid: pidAlive(pids.vite) ? pids.vite : null,
    }
  }

  while (Date.now() < deadline) {
    const leftover = await snapshotLeftover()
    if (
      !leftover.strapiPort &&
      !leftover.nodePort &&
      !leftover.vitePort &&
      !leftover.workDir &&
      !leftover.strapiPid &&
      !leftover.nodePid &&
      !leftover.vitePid
    ) {
      return { cleared: true, leftover }
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }

  return { cleared: false, leftover: await snapshotLeftover() }
}

/**
 * @param {'SIGINT' | 'SIGTERM'} signal
 * @returns {Promise<string[]>}
 */
async function runScenario(signal) {
  const tag = `[${signal}]`
  const scenarioFailures = []
  const assert = (cond, msg) => {
    if (!cond) scenarioFailures.push(`${tag} ${msg}`)
  }

  const uploadsDir = uploadsDirForRoot(root)
  const uploadsBefore = uploadsFingerprint(uploadsDir)
  const porcelainBefore = gitPorcelain()
  const listenersBefore = listListeners([...FORBIDDEN_PORTS])

  let child = null
  let ready = null
  let childLog = ''

  try {
    child = fork(childPath, [], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        PAGES_CMS_SIGNAL_WITH_VITE: '1',
        PAGES_CMS_SIGNAL_SEED: '0',
      },
    })
    child.stdout?.on('data', (c) => {
      childLog += String(c)
    })
    child.stderr?.on('data', (c) => {
      childLog += String(c)
    })

    ready = await new Promise((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error(`${tag} signal child ready timeout`)),
        READY_TIMEOUT_MS,
      )
      const onMessage = (msg) => {
        if (msg?.type === 'ready') {
          clearTimeout(t)
          child.off('message', onMessage)
          child.off('exit', onEarlyExit)
          resolve(msg)
        }
      }
      const onEarlyExit = (code, sig) => {
        clearTimeout(t)
        child.off('message', onMessage)
        reject(
          new Error(
            `${tag} signal child exited early code=${code} signal=${sig}\n${childLog.slice(-2000)}`,
          ),
        )
      }
      child.on('message', onMessage)
      child.on('exit', onEarlyExit)
    })

    const { strapiPort, nodePort, vitePort } = ready.ports
    assert(vitePort != null, 'vitePort missing from ready payload')
    assert(ready.pids?.strapi, 'strapi pid missing')
    assert(ready.pids?.node, 'node pid missing')
    assert(ready.pids?.vite, 'vite pid missing')
    assert(await portListening(strapiPort), `owned strapi :${strapiPort} should listen before signal`)
    assert(await portListening(nodePort), `owned node :${nodePort} should listen before signal`)
    assert(await portListening(vitePort), `owned vite :${vitePort} should listen before signal`)

    if (scenarioFailures.length) {
      return scenarioFailures
    }

    child.kill(signal)

    const exitInfo = await new Promise((resolve) => {
      const t = setTimeout(() => resolve({ timedOut: true }), EXIT_TIMEOUT_MS)
      child.once('exit', (code, exitSignal) => {
        clearTimeout(t)
        resolve({ timedOut: false, code, signal: exitSignal })
      })
    })

    if (exitInfo.timedOut) {
      assert(false, `harness did not exit within ${EXIT_TIMEOUT_MS}ms after ${signal}`)
    } else {
      const expected = EXPECTED_EXIT[signal]
      const okExit =
        exitInfo.code === expected.code ||
        exitInfo.signal === expected.signal ||
        // some platforms report null code with signal name only
        (exitInfo.code == null && exitInfo.signal === signal)
      assert(okExit, `unexpected harness exit ${JSON.stringify(exitInfo)} (want code ${expected.code})`)
    }

    // Observe only — do not kill owned children during grace.
    const { cleared, leftover } = await observeTeardown(ready, Date.now() + GRACE_MS)

    if (!cleared) {
      assert(false, `teardown incomplete after grace: ${JSON.stringify(leftover)}`)
    } else {
      assert(!leftover.strapiPort, `strapi port still listening`)
      assert(!leftover.nodePort, `node port still listening`)
      assert(!leftover.vitePort, `vite port still listening`)
      assert(!leftover.workDir, `workDir still exists: ${leftover.workDir}`)
      assert(!leftover.strapiPid, `strapi pid ${leftover.strapiPid} still alive`)
      assert(!leftover.nodePid, `node pid ${leftover.nodePid} still alive`)
      assert(!leftover.vitePid, `vite pid ${leftover.vitePid} still alive`)
    }

    try {
      assertForbiddenPortsUntouched(listenersBefore)
    } catch (err) {
      scenarioFailures.push(`${tag} ${err instanceof Error ? err.message : String(err)}`)
    }

    const uploadsAfter = uploadsFingerprint(uploadsDir)
    const diff = compareUploadsFingerprints(uploadsBefore, uploadsAfter)
    assert(
      diff.additions.length === 0 && diff.missing.length === 0 && diff.changed.length === 0,
      `uploads fingerprint drifted: ${formatUploadsDiff(diff)}`,
    )

    assert(
      gitPorcelain() === porcelainBefore,
      `porcelain changed\n--- before ---\n${porcelainBefore}\n--- after ---\n${gitPorcelain()}`,
    )
  } catch (err) {
    scenarioFailures.push(
      `${tag} gate crashed: ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    // FAIL already recorded above — emergency cleanup must not mask results.
    if (ready?.pids) {
      forceKillPid(ready.pids.strapi)
      forceKillPid(ready.pids.node)
      forceKillPid(ready.pids.vite)
    }
    if (child && child.exitCode == null && !child.killed) {
      try {
        child.kill('SIGKILL')
      } catch {
        /* ignore */
      }
    }
    if (ready?.workDir && fs.existsSync(ready.workDir)) {
      try {
        fs.rmSync(ready.workDir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }
    const cleaned = cleanupAndAssertUploadsRestored(uploadsDir, uploadsBefore)
    if (!cleaned.ok) {
      scenarioFailures.push(`${tag} uploads not restored after emergency cleanup: ${formatUploadsDiff(cleaned.diff)}`)
    }
  }

  return scenarioFailures
}

const failures = []
for (const signal of /** @type {const} */ (['SIGINT', 'SIGTERM'])) {
  failures.push(...(await runScenario(signal)))
}

if (failures.length) {
  console.error('check:pages-cms-stack-signal FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}
console.log('check:pages-cms-stack-signal PASS (SIGINT + SIGTERM, Strapi+Node+Vite, observe-only)')
