#!/usr/bin/env node
/**
 * Phase E companion / full pages-cms local gate (no push, no strapi:sync-seed).
 *
 * Fast by default. Set PAGES_CMS_PHASE_E_FULL=1 to also run check:pages-api
 * (boots Strapi + Node; requires free :1337 and PAGES_API_CHECK_PORT).
 *
 * Full mode is self-cleaning for strapi-catalog/public/uploads filesystem drift
 * (seed originals + Strapi size derivatives) and requires:
 *   - uploads fingerprint (path+size+SHA-256) restored for additions only
 *   - missing/changed baseline files → FAIL (not silently restored)
 *   - git porcelain to match the pre-gate working tree after cleanup
 *
 * Usage:
 *   npm run check:pages-cms
 *   PAGES_CMS_PHASE_E_FULL=1 npm run check:pages-cms-phase-e
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cleanupAndAssertUploadsRestored,
  formatUploadsDiff,
  gitPorcelain,
  restoreUploadsFingerprint,
  runUploadsCleanupProbe,
  uploadsDirForRoot,
  uploadsFingerprint,
} from './lib/pages-cms-uploads-guard.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const full = process.env.PAGES_CMS_PHASE_E_FULL === '1' || process.argv.includes('--full')
const uploadsDir = uploadsDirForRoot(root)

const steps = [
  ['check:pages-cms-isolation', ['run', 'check:pages-cms-isolation']],
  ['check:pages-cms-hydrate', ['run', 'check:pages-cms-hydrate']],
  ['check:pages-cms-hydrate-dom', ['run', 'check:pages-cms-hydrate-dom']],
  ['check:pages-cms-phase-a', ['run', 'check:pages-cms-phase-a']],
  ['check:pages-cms-strict', ['run', 'check:pages-cms-strict']],
  ['check:pages-cms-catalog-scope', ['run', 'check:pages-cms-catalog-scope']],
]

if (full) {
  steps.push(['check:pages-api', ['run', 'check:pages-api']])
}

const failures = []
const porcelainBefore = gitPorcelain(root)
const uploadsBefore = full ? uploadsFingerprint(uploadsDir) : null
let cleaned = false

function assertPorcelainRestored(label) {
  const after = gitPorcelain(root)
  if (after !== porcelainBefore) {
    failures.push(
      `${label}: git status --porcelain drifted from pre-gate state\n` +
        `--- before ---\n${porcelainBefore || '(clean)'}` +
        `--- after ---\n${after || '(clean)'}`,
    )
  }
}

function restoreUploadsIfNeeded(label) {
  if (!uploadsBefore) return
  const result = cleanupAndAssertUploadsRestored(uploadsDir, uploadsBefore)
  if (!result.ok) {
    failures.push(
      `${label}: uploads fingerprint not restored (${formatUploadsDiff(result.diff)})`,
    )
  } else if (result.removed.length) {
    console.log(
      `  uploads cleanup (${label}): removed ${result.removed.length} generated file(s)` +
        (result.removed.length
          ? ` (${result.removed.slice(0, 5).join(', ')}${result.removed.length > 5 ? ', …' : ''})`
          : ''),
    )
  }
}

function finalize(reason) {
  if (cleaned) return
  cleaned = true
  try {
    restoreUploadsIfNeeded(reason)
    assertPorcelainRestored(reason)
  } catch (err) {
    failures.push(
      `${reason}: cleanup crashed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

function onSignal(signal) {
  failures.push(`interrupted by ${signal}`)
  finalize(`signal:${signal}`)
  console.error('\ncheck:pages-cms FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(130)
}

process.on('SIGINT', () => onSignal('SIGINT'))
process.on('SIGTERM', () => onSignal('SIGTERM'))
process.on('exit', () => {
  // Last-resort: delete additions only if process exits without normal finalize.
  if (!cleaned && uploadsBefore) {
    try {
      restoreUploadsFingerprint(uploadsDir, uploadsBefore)
    } catch {
      /* ignore */
    }
  }
})

try {
  if (full) {
    console.log('\n── uploads cleanup probe ──')
    const probe = runUploadsCleanupProbe(uploadsDir)
    if (!probe.ok) {
      for (const f of probe.failures) failures.push(f)
    } else {
      console.log(
        'uploads cleanup probe PASS (additions cleaned; sentinel preserved; delete/change negatives FAIL as expected)',
      )
    }
  }

  if (failures.length === 0) {
    for (const [label, args] of steps) {
      console.log(`\n── ${label} ──`)
      const result = spawnSync('npm', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: 'inherit',
        env: process.env,
      })
      if (result.status !== 0) {
        failures.push(`${label} exited ${result.status}`)
        break
      }
    }
  }
} catch (err) {
  failures.push(`gate crashed: ${err instanceof Error ? err.message : String(err)}`)
} finally {
  finalize('post-gate')
}

if (failures.length) {
  console.error('\ncheck:pages-cms FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log(`\ncheck:pages-cms PASS (full=${full ? 'yes' : 'no'}; working-tree restored)`)
