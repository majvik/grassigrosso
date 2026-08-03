#!/usr/bin/env node
/**
 * Phase 5 milestone aggregator (QA-02 / R5-2).
 *
 * Composes D1–D4 + Phase E companions + routes/typecheck/build/catalog.
 * No new product/runtime scope. No push. No strapi:sync-seed.
 *
 * Pre/post: default listeners (:1337/:3000/:5174), uploads fingerprint, porcelain.
 * Never kills foreign processes on default ports.
 *
 * Usage:
 *   npm run check:pages-cms-phase-5
 */
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  FORBIDDEN_PORTS,
  assertForbiddenPortsUntouched,
  listListeners,
  root,
} from './lib/pages-cms-isolated-stack.mjs'
import {
  cleanupAndAssertUploadsRestored,
  formatUploadsDiff,
  gitPorcelain,
  restoreUploadsFingerprint,
  runUploadsCleanupProbe,
  uploadsDirForRoot,
  uploadsFingerprint,
} from './lib/pages-cms-uploads-guard.mjs'

const uploadsDir = uploadsDirForRoot(root)
const resultsPath = path.join(
  root,
  '.planning/phases/05-local-acceptance/05-SUITE-RESULTS.md',
)

/**
 * Ordered suite. Isolated D1–D4 first (dynamic ports).
 * `check:pages-api` boots Strapi on :1337 when free; if busy, allocates free
 * PAGES_API_STRAPI_PORT + PAGES_API_CHECK_PORT (never kills default listeners).
 */
const STEPS = Object.freeze([
  { label: 'D1 uploads-disk-first', script: 'check:pages-cms-uploads-disk-first' },
  { label: 'D2 stack-signal', script: 'check:pages-cms-stack-signal' },
  { label: 'D3 live-edit', script: 'check:pages-cms-live-edit' },
  { label: 'D4 degraded-media', script: 'check:pages-cms-degraded-media' },
  { label: 'isolation', script: 'check:pages-cms-isolation' },
  { label: 'hydrate', script: 'check:pages-cms-hydrate' },
  { label: 'hydrate-dom', script: 'check:pages-cms-hydrate-dom' },
  { label: 'phase-a map/envelope', script: 'check:pages-cms-phase-a' },
  { label: 'strict contract', script: 'check:pages-cms-strict' },
  { label: 'catalog-scope', script: 'check:pages-cms-catalog-scope' },
  { label: 'routes', script: 'check:routes' },
  { label: 'typecheck', script: 'typecheck' },
  { label: 'pages-api (Phase E N1–N5)', script: 'check:pages-api', kind: 'pages-api' },
  { label: 'catalog-api', script: 'check:catalog-api' },
  { label: 'catalog-ui', script: 'check:catalog-ui' },
  { label: 'build', script: 'build' },
])

const failures = []
const results = []
const startedAt = new Date().toISOString()

const porcelainBefore = gitPorcelain(root)
const uploadsBefore = uploadsFingerprint(uploadsDir)
const listenersBefore = listListeners([...FORBIDDEN_PORTS])
let cleaned = false

function portInUse(port) {
  const r = spawnSync('lsof', [`-iTCP:${port}`, '-sTCP:LISTEN', '-n', '-P'], {
    encoding: 'utf8',
  })
  return r.status === 0 && Boolean(r.stdout && r.stdout.trim())
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close((err) => (err ? reject(err) : resolve(port)))
    })
    s.on('error', reject)
  })
}

async function allocateNonForbiddenPorts(count) {
  const ports = []
  for (let i = 0; i < count; i++) {
    let port = null
    for (let attempt = 0; attempt < 30; attempt++) {
      const candidate = await freePort()
      if (!FORBIDDEN_PORTS.includes(candidate) && !ports.includes(candidate) && !portInUse(candidate)) {
        port = candidate
        break
      }
    }
    if (!port) throw new Error('failed to allocate free non-forbidden port')
    ports.push(port)
  }
  return ports
}

function record(label, status, detail = '') {
  results.push({
    label,
    status,
    detail,
    at: new Date().toISOString(),
  })
}

function assertPorcelain(label) {
  const after = gitPorcelain(root)
  if (after !== porcelainBefore) {
    failures.push(
      `${label}: porcelain drifted\n--- before ---\n${porcelainBefore || '(clean)'}\n--- after ---\n${after || '(clean)'}`,
    )
    return false
  }
  return true
}

function restoreUploads(label) {
  const result = cleanupAndAssertUploadsRestored(uploadsDir, uploadsBefore)
  if (!result.ok) {
    failures.push(`${label}: uploads not restored (${formatUploadsDiff(result.diff)})`)
    return false
  }
  if (result.removed.length) {
    console.log(
      `  uploads cleanup (${label}): removed ${result.removed.length} file(s)` +
        (result.removed.length
          ? ` (${result.removed.slice(0, 5).join(', ')}${result.removed.length > 5 ? ', …' : ''})`
          : ''),
    )
  }
  return true
}

function finalize(reason) {
  if (cleaned) return
  cleaned = true
  try {
    restoreUploads(reason)
    try {
      assertForbiddenPortsUntouched(listenersBefore)
      record('default listeners unchanged', 'PASS')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push(`${reason}: ${msg}`)
      record('default listeners unchanged', 'FAIL', msg)
    }
    if (assertPorcelain(reason)) {
      record('porcelain unchanged', 'PASS')
    } else {
      record('porcelain unchanged', 'FAIL')
    }
    const uploadsAfter = uploadsFingerprint(uploadsDir)
    let same = uploadsAfter.size === uploadsBefore.size
    if (same) {
      for (const [name, meta] of uploadsBefore) {
        const next = uploadsAfter.get(name)
        if (!next || next.size !== meta.size || next.sha256 !== meta.sha256) {
          same = false
          break
        }
      }
    }
    record('uploads fingerprint restored', same ? 'PASS' : 'FAIL')
    if (!same) failures.push(`${reason}: uploads fingerprint mismatch after cleanup`)
  } catch (err) {
    failures.push(
      `${reason}: finalize crashed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

function writeResultsFile(overall) {
  const lines = [
    '# Phase 5 — Recorded local suite (QA-02)',
    '',
    `**Started:** ${startedAt}`,
    `**Finished:** ${new Date().toISOString()}`,
    `**Overall:** ${overall}`,
    `**Aggregator:** \`npm run check:pages-cms-phase-5\``,
    '**Phase B commits:** `dd0825e` + harden `8beedda` + `26b15d4`',
    '',
    '## Attestation (QA-03 / R5-7)',
    '',
    '- [x] No `git push` performed by this gate',
    '- [x] No `strapi:sync-seed` performed by this gate',
    '- [x] No PR / remote deploy / remote mutation',
    '- [x] Default listeners `:1337`/`:3000`/`:5174` not killed by harness (refuse-busy / isolated free ports + harness DB when busy)',
    '',
    '## Steps',
    '',
    '| Step | Result | Detail |',
    '|------|--------|--------|',
  ]
  for (const r of results) {
    const detail = String(r.detail || '')
      .replace(/\|/g, '\\|')
      .replace(/\n/g, ' ')
      .slice(0, 160)
    lines.push(`| ${r.label} | **${r.status}** | ${detail} |`)
  }
  lines.push('')
  lines.push('## Locality post-conditions')
  lines.push('')
  lines.push('- Uploads fingerprint restored (additions cleaned; missing/changed → FAIL)')
  lines.push('- Git porcelain matches pre-gate working tree')
  lines.push('- Forbidden-port listeners match pre-gate snapshot')
  lines.push('')
  lines.push('*Generated by scripts/check-pages-cms-phase-5.mjs*')
  lines.push('')
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true })
  fs.writeFileSync(resultsPath, `${lines.join('\n')}\n`)
  console.log(`\nRecorded suite → ${path.relative(root, resultsPath)}`)
}

async function envForStep(step) {
  if (step.kind !== 'pages-api') return process.env
  if (process.env.PAGES_API_BASE_URL) return process.env

  const wantStrapi = Number(process.env.PAGES_API_STRAPI_PORT || 1337)
  const wantNode = Number(process.env.PAGES_API_CHECK_PORT || 3011)
  const env = { ...process.env }

  // Always isolate DB when default Strapi port is busy so we never touch live .tmp/data.db.
  if (portInUse(wantStrapi) || process.env.PAGES_API_ISOLATE_DB === '1') {
    const workDir = fs.mkdtempSync(path.join(root, '.tmp', 'phase5-pages-api-'))
    const dbPath = path.join(workDir, 'data.db')
    const seedDb = path.join(root, 'strapi-catalog/database/seed/data.db')
    fs.copyFileSync(seedDb, dbPath)
    env.PAGES_API_DATABASE_FILENAME = dbPath
    env.DATABASE_FILENAME = dbPath
    env.PAGES_API_WORK_DIR = workDir
    console.log(`  note: isolated pages-api DB at ${workDir}`)
  }

  if (!portInUse(wantStrapi) && !portInUse(wantNode)) {
    return env
  }

  const [strapiPort, nodePort] = await allocateNonForbiddenPorts(2)
  console.log(
    `  note: default pages-api ports busy — using Strapi :${strapiPort} + Node :${nodePort} (no kill)`,
  )
  env.PAGES_API_STRAPI_PORT = String(strapiPort)
  env.PAGES_API_CHECK_PORT = String(nodePort)
  return env
}

function onSignal(signal) {
  failures.push(`interrupted by ${signal}`)
  record(`signal ${signal}`, 'FAIL')
  finalize(`signal:${signal}`)
  writeResultsFile('FAIL')
  console.error('\ncheck:pages-cms-phase-5 FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(130)
}

process.on('SIGINT', () => onSignal('SIGINT'))
process.on('SIGTERM', () => onSignal('SIGTERM'))
process.on('exit', () => {
  if (!cleaned) {
    try {
      restoreUploadsFingerprint(uploadsDir, uploadsBefore)
    } catch {
      /* ignore */
    }
  }
})

try {
  console.log('\n── uploads cleanup probe ──')
  const probe = runUploadsCleanupProbe(uploadsDir)
  if (!probe.ok) {
    for (const f of probe.failures) failures.push(f)
    record('uploads cleanup probe', 'FAIL', probe.failures.join('; '))
  } else {
    console.log('uploads cleanup probe PASS')
    record('uploads cleanup probe', 'PASS')
  }

  if (failures.length === 0) {
    for (const step of STEPS) {
      console.log(`\n── ${step.label} (${step.script}) ──`)
      const env = await envForStep(step)
      const started = Date.now()
      const result = spawnSync('npm', ['run', step.script], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'inherit',
        env,
      })
      const ms = Date.now() - started
      if (result.status !== 0) {
        const detail = `exit ${result.status} (${ms}ms)`
        failures.push(`${step.label}: ${detail}`)
        record(step.label, 'FAIL', detail)
        break
      }
      const detail =
        step.kind === 'pages-api' && env.PAGES_API_STRAPI_PORT
          ? `${ms}ms strapi:${env.PAGES_API_STRAPI_PORT} node:${env.PAGES_API_CHECK_PORT || '3011'}`
          : `${ms}ms`
      record(step.label, 'PASS', detail)
      if (env.PAGES_API_WORK_DIR && fs.existsSync(env.PAGES_API_WORK_DIR)) {
        try {
          fs.rmSync(env.PAGES_API_WORK_DIR, { recursive: true, force: true })
        } catch {
          /* ignore */
        }
      }
      restoreUploads(`after:${step.label}`)
    }
  }
} catch (err) {
  failures.push(`gate crashed: ${err instanceof Error ? err.message : String(err)}`)
  record('aggregator', 'FAIL', String(err))
} finally {
  finalize('post-gate')
  writeResultsFile(failures.length ? 'FAIL' : 'PASS')
}

if (failures.length) {
  console.error('\ncheck:pages-cms-phase-5 FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('\ncheck:pages-cms-phase-5 PASS (suite recorded; listeners/uploads/porcelain unchanged)')
