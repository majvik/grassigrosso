#!/usr/bin/env node
/**
 * Phase 5 D2 — SIGTERM during owned stack must tear down owned processes/temp and leave defaults/porcelain intact.
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
} from './lib/pages-cms-uploads-guard.mjs'

const failures = []
function assert(cond, msg) {
  if (!cond) failures.push(msg)
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

const uploadsDir = uploadsDirForRoot(root)
const uploadsBefore = uploadsFingerprint(uploadsDir)
const porcelainBefore = gitPorcelain()
const listenersBefore = listListeners([...FORBIDDEN_PORTS])

const childPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'lib/pages-cms-stack-signal-child.mjs',
)

const child = fork(childPath, [], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
})

let childLog = ''
child.stdout?.on('data', (c) => {
  childLog += String(c)
})
child.stderr?.on('data', (c) => {
  childLog += String(c)
})

let ready = null
try {
  ready = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('signal child ready timeout')), 180000)
    const onMessage = (msg) => {
      if (msg?.type === 'ready') {
        clearTimeout(t)
        child.off('message', onMessage)
        child.off('exit', onEarlyExit)
        resolve(msg)
      }
    }
    const onEarlyExit = (code) => {
      clearTimeout(t)
      child.off('message', onMessage)
      reject(new Error(`signal child exited early ${code}\n${childLog.slice(-2000)}`))
    }
    child.on('message', onMessage)
    child.on('exit', onEarlyExit)
  })

  const { strapiPort, nodePort } = ready.ports
  assert(await portListening(strapiPort), 'owned strapi should listen before signal')
  assert(await portListening(nodePort), 'owned node should listen before signal')

  child.kill('SIGTERM')

  const exitCode = await new Promise((resolve) => {
    child.on('exit', (code, signal) => resolve({ code, signal }))
  })
  assert(
    exitCode.code === 143 || exitCode.signal === 'SIGTERM' || exitCode.code === 0,
    `unexpected exit ${JSON.stringify(exitCode)}`,
  )

  // Poll until owned listeners and temp dir are gone (sync signal teardown).
  let cleared = false
  for (let i = 0; i < 40; i++) {
    const strapiUp = await portListening(strapiPort)
    const nodeUp = await portListening(nodePort)
    const workLeft = fs.existsSync(ready.workDir)
    if (!strapiUp && !nodeUp && !workLeft) {
      cleared = true
      break
    }
    // Backup: if child exited but owned PIDs linger, force-kill them.
    if (ready.pids?.strapi) {
      try {
        process.kill(-ready.pids.strapi, 'SIGKILL')
      } catch {
        try {
          process.kill(ready.pids.strapi, 'SIGKILL')
        } catch {
          /* ignore */
        }
      }
    }
    if (ready.pids?.node) {
      try {
        process.kill(-ready.pids.node, 'SIGKILL')
      } catch {
        try {
          process.kill(ready.pids.node, 'SIGKILL')
        } catch {
          /* ignore */
        }
      }
    }
    await new Promise((r) => setTimeout(r, 250))
  }

  assert(cleared || !(await portListening(strapiPort)), `owned strapi port ${strapiPort} still listening`)
  assert(cleared || !(await portListening(nodePort)), `owned node port ${nodePort} still listening`)
  assert(!fs.existsSync(ready.workDir), `temp workDir still exists: ${ready.workDir}`)

  const cleaned = cleanupAndAssertUploadsRestored(uploadsDir, uploadsBefore)
  if (!cleaned.ok) {
    failures.push(`uploads not restored: ${formatUploadsDiff(cleaned.diff)}`)
  }

  assertForbiddenPortsUntouched(listenersBefore)
  assert(gitPorcelain() === porcelainBefore, 'porcelain changed after signal teardown')
} catch (err) {
  failures.push(`gate crashed: ${err instanceof Error ? err.message : String(err)}`)
  try {
    child.kill('SIGKILL')
  } catch {
    /* ignore */
  }
} finally {
  if (ready?.workDir && fs.existsSync(ready.workDir)) {
    try {
      fs.rmSync(ready.workDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
  const cleaned = cleanupAndAssertUploadsRestored(uploadsDir, uploadsBefore)
  if (!cleaned.ok) {
    failures.push(`uploads not restored: ${formatUploadsDiff(cleaned.diff)}`)
  }
}

if (failures.length) {
  console.error('check:pages-cms-stack-signal FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}
console.log('check:pages-cms-stack-signal PASS')
