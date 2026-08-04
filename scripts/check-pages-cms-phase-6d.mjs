#!/usr/bin/env node
/**
 * Phase 6D aggregator — legal hydrate + SSR gates.
 *
 * Runs:
 *   - defaults ↔ fixtures parity (extract --check)
 *   - generate-legal-ssr --check
 *   - legal-ssr-parity --check (incl negatives)
 *   - check:pages-cms-hydrate (wave-1 + legal slice)
 *   - check:pages-cms-hydrate-dom with legal pages (owned Vite via isolated stack)
 *   - check:pages-cms-isolation
 *   - typecheck
 *
 * Forbidden ports 1337/3000/5174 untouched; self-cleaning.
 * No push / no strapi:sync-seed / no tracked writes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  FORBIDDEN_PORTS,
  assertForbiddenPortsUntouched,
  listListeners,
  root,
  startIsolatedPagesCmsStack,
} from './lib/pages-cms-isolated-stack.mjs'
import {
  assertNoUntrackedPagesCmsUploads,
  cleanupAndAssertUploadsRestored,
  formatUploadsDiff,
  gitPorcelain,
  restoreUploadsFingerprint,
  uploadsDirForRoot,
  uploadsFingerprint,
} from './lib/pages-cms-uploads-guard.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = uploadsDirForRoot(root)

const STEPS = Object.freeze([
  {
    label: 'defaults↔fixtures parity',
    kind: 'node',
    args: ['scripts/pages-cms/extract-legal-fixtures.mjs', '--check'],
  },
  {
    label: 'generate-legal-ssr --check',
    kind: 'node',
    args: ['scripts/pages-cms/generate-legal-ssr.mjs', '--check'],
  },
  {
    label: 'legal-ssr-parity --check',
    kind: 'node',
    args: ['scripts/pages-cms/legal-ssr-parity.mjs', '--check'],
  },
  { label: 'hydrate (wave-1 + legal)', script: 'check:pages-cms-hydrate', kind: 'npm' },
  { label: 'hydrate-dom (+ legal)', script: 'check:pages-cms-hydrate-dom', kind: 'owned-ui' },
  { label: 'isolation', script: 'check:pages-cms-isolation', kind: 'npm' },
  { label: 'typecheck', script: 'typecheck', kind: 'npm' },
])

const failures = []
const startedAt = new Date().toISOString()
/** @type {Awaited<ReturnType<typeof startIsolatedPagesCmsStack>> | null} */
let ownedStack = null
let cleaned = false

const porcelainBefore = gitPorcelain(root)
const listenersBefore = listListeners([...FORBIDDEN_PORTS])
/** @type {import('./lib/pages-cms-uploads-guard.mjs').UploadsFingerprint | null} */
let uploadsBefore = null

function recordFail(msg) {
  failures.push(msg)
}

async function ensureOwnedUiStack() {
  if (ownedStack) return ownedStack
  ownedStack = await startIsolatedPagesCmsStack({
    withVite: true,
    seedFixtures: false,
  })
  return ownedStack
}

async function disposeOwnedStack() {
  if (!ownedStack) return
  try {
    await ownedStack.dispose()
  } catch (err) {
    recordFail(`owned stack dispose: ${err instanceof Error ? err.message : String(err)}`)
  }
  ownedStack = null
}

function finalizeLocality(reason) {
  try {
    assertForbiddenPortsUntouched(listenersBefore)
  } catch (err) {
    recordFail(
      `${reason}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (uploadsBefore) {
    try {
      cleanupAndAssertUploadsRestored(uploadsDir, uploadsBefore, reason)
    } catch (err) {
      const diff = formatUploadsDiff(uploadsBefore, uploadsFingerprint(uploadsDir))
      recordFail(
        `${reason}: uploads restore failed: ${err instanceof Error ? err.message : String(err)}${
          diff ? ` (${diff})` : ''
        }`,
      )
    }
  }

  try {
    const audit = assertNoUntrackedPagesCmsUploads(uploadsDir, root)
    if (!audit.ok) {
      recordFail(`${reason}: untracked pages_cms uploads: ${JSON.stringify(audit.leftovers)}`)
    }
  } catch (err) {
    recordFail(`${reason}: uploads audit: ${err instanceof Error ? err.message : String(err)}`)
  }

  const porcelainAfter = gitPorcelain(root)
  if (porcelainAfter !== porcelainBefore) {
    recordFail(`${reason}: porcelain changed\n before: ${porcelainBefore}\n after: ${porcelainAfter}`)
  }
}

async function shutdown(reason) {
  if (cleaned) return
  cleaned = true
  await disposeOwnedStack()
  finalizeLocality(reason)
}

function onSignal(signal) {
  recordFail(`interrupted by ${signal}`)
  try {
    if (ownedStack?.syncTeardownOwned) ownedStack.syncTeardownOwned()
  } catch {
    /* ignore */
  }
  ownedStack = null
  finalizeLocality(`signal:${signal}`)
  console.error('\ncheck:pages-cms-phase-6d FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(130)
}

process.on('SIGINT', () => onSignal('SIGINT'))
process.on('SIGTERM', () => onSignal('SIGTERM'))
process.on('exit', () => {
  if (!cleaned && uploadsBefore) {
    try {
      restoreUploadsFingerprint(uploadsDir, uploadsBefore)
    } catch {
      /* ignore */
    }
  }
})

function runNode(args, env = process.env) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    env,
  })
}

function runNpm(script, env = process.env) {
  return spawnSync('npm', ['run', script], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    env,
  })
}

console.log('\ncheck:pages-cms-phase-6d — legal hydrate / SSR gate')
console.log(`started ${startedAt}`)

try {
  const audit = assertNoUntrackedPagesCmsUploads(uploadsDir, root)
  if (!audit.ok) {
    throw new Error(`pre: untracked pages_cms uploads: ${JSON.stringify(audit.leftovers)}`)
  }
  uploadsBefore = uploadsFingerprint(uploadsDir)

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i]
    console.log(`\n── ${step.label} ──`)
    const started = Date.now()
    let env = process.env
    if (step.kind === 'owned-ui') {
      const stack = await ensureOwnedUiStack()
      const viteBase = `http://127.0.0.1:${stack.ports.vitePort}`
      const nodeBase = `http://127.0.0.1:${stack.ports.nodePort}`
      env = {
        ...process.env,
        PAGES_CMS_UI_BASE_URL: viteBase,
        CATALOG_UI_BASE_URL: viteBase,
        CATALOG_API_BASE_URL: nodeBase,
        DEV_API_PORT: String(stack.ports.nodePort),
      }
      console.log(`  owned ui=${viteBase} api=${nodeBase}`)
    }

    let result
    if (step.kind === 'node') {
      result = runNode(step.args, env)
    } else {
      result = runNpm(step.script, env)
    }
    const ms = Date.now() - started
    if (result.status !== 0) {
      recordFail(`${step.label}: exit ${result.status} (${ms}ms)`)
      break
    }
    console.log(`  PASS (${ms}ms)`)

    const next = STEPS[i + 1]
    if (step.kind === 'owned-ui' && next?.kind !== 'owned-ui') {
      await disposeOwnedStack()
    }
  }
} catch (err) {
  recordFail(`gate crashed: ${err instanceof Error ? err.message : String(err)}`)
} finally {
  await shutdown('post-gate')
}

if (failures.length) {
  console.error('\ncheck:pages-cms-phase-6d FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log(
  '\ncheck:pages-cms-phase-6d PASS (listeners/uploads/porcelain unchanged; no tracked writes)',
)
