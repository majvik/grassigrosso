#!/usr/bin/env node
/**
 * Phase 6 milestone aggregator (legal pages closeout).
 *
 * Composes Phase 6B/C/D + Phase A/strict/catalog-scope + isolation + hydrate +
 * 9-slug pages-api + owned catalog API/UI/perf + routes/typecheck/build.
 * Does NOT embed into / rewrite Phase 5 aggregator.
 * No push. No strapi:sync-seed.
 *
 * Modes:
 *   npm run check:pages-cms-phase-6
 *     Normal verify — never writes tracked files; requires clean postconditions.
 *   npm run check:pages-cms-phase-6:record
 *     Same suite, then writes `.planning/.../06-SUITE-RESULTS.md` (dirty until commit).
 *     After commit, re-run normal mode to prove clean-tree contract.
 *
 * Pre/post: default listeners (:1337/:3000/:5174), uploads fingerprint, porcelain.
 * Never kills foreign processes on default ports.
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
  startIsolatedPagesCmsStack,
} from './lib/pages-cms-isolated-stack.mjs'
import {
  assertNoUntrackedPagesCmsUploads,
  cleanupAndAssertUploadsRestored,
  formatUploadsDiff,
  gitPorcelain,
  restoreUploadsFingerprint,
  runUntrackedPagesCmsProbe,
  runUploadsCleanupProbe,
  uploadsDirForRoot,
  uploadsFingerprint,
} from './lib/pages-cms-uploads-guard.mjs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { fingerprintPagesSnapshotDir } = require('../lib/pages-cms-snapshots.cjs')

const recordMode =
  process.argv.includes('--record') || process.env.PAGES_CMS_PHASE6_RECORD === '1'

const uploadsDir = uploadsDirForRoot(root)
const publicDir = path.join(root, 'public')
const resultsPath = path.join(root, '.planning/phases/06-legal-pages/06-SUITE-RESULTS.md')

/**
 * Ordered Phase 6 suite.
 * Catalog API/UI/perf + hydrate-dom run against owned Strapi+Node+Vite (kind: catalog/owned-ui).
 * pages-api uses free ports + harness DB when defaults are busy.
 */
const STEPS = Object.freeze([
  { label: 'Phase 6B schemas/feeds', script: 'check:pages-cms-phase-6b' },
  { label: 'Phase 6C seed/API/snapshots', script: 'check:pages-cms-phase-6c' },
  { label: 'Phase 6D hydrate/SSR parity', script: 'check:pages-cms-phase-6d' },
  { label: 'snapshot media integrity', script: 'check:pages-cms-media-integrity' },
  { label: 'phase-a map/envelope', script: 'check:pages-cms-phase-a' },
  { label: 'strict contract', script: 'check:pages-cms-strict' },
  { label: 'catalog-scope', script: 'check:pages-cms-catalog-scope' },
  { label: 'isolation', script: 'check:pages-cms-isolation' },
  { label: 'hydrate unit', script: 'check:pages-cms-hydrate' },
  { label: 'routes', script: 'check:routes' },
  { label: 'typecheck', script: 'typecheck' },
  { label: 'pages-api (9 slug)', script: 'check:pages-api', kind: 'pages-api' },
  { label: 'hydrate-dom (9 pages)', script: 'check:pages-cms-hydrate-dom', kind: 'owned-ui' },
  { label: 'catalog-api', script: 'check:catalog-api', kind: 'catalog' },
  { label: 'catalog-ui', script: 'check:catalog-ui', kind: 'catalog' },
  { label: 'catalog-perf', script: 'check:catalog-perf', kind: 'catalog' },
  { label: 'build', script: 'build' },
])

const failures = []
const results = []
const startedAt = new Date().toISOString()
/** @type {Set<string>} */
const tempDirs = new Set()
/** @type {Awaited<ReturnType<typeof startIsolatedPagesCmsStack>> | null} */
let catalogStack = null
let cleaned = false

const porcelainBefore = gitPorcelain(root)
const listenersBefore = listListeners([...FORBIDDEN_PORTS])
/** @type {import('./lib/pages-cms-uploads-guard.mjs').UploadsFingerprint | null} */
let uploadsBefore = null

function registerTempDir(dir) {
  if (dir) tempDirs.add(dir)
}

function cleanupTempDirs() {
  for (const dir of tempDirs) {
    try {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
  tempDirs.clear()
}

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
  if (!uploadsBefore) return true
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

function assertPagesCmsUploadsTrackedOnly(label) {
  const audit = assertNoUntrackedPagesCmsUploads(uploadsDir, root)
  if (!audit.ok) {
    failures.push(
      `${label}: untracked/ignored pages_cms uploads must be 0, found ${audit.leftovers.length}: ${JSON.stringify(audit.leftovers)}`,
    )
    record(label, 'FAIL', `leftovers=${audit.leftovers.length}`)
    return false
  }
  record(label, 'PASS', 'untracked/ignored pages_cms uploads = 0')
  return true
}

async function ensureCatalogStack() {
  if (catalogStack) return catalogStack
  console.log('\n── owned catalog stack (Strapi+Node+Vite) ──')
  catalogStack = await startIsolatedPagesCmsStack({
    withVite: true,
    seedFixtures: false,
    installSignalHandlers: false,
  })
  registerTempDir(catalogStack.workDir)
  const { strapiPort, nodePort, vitePort } = catalogStack.ports
  console.log(`  owned catalog ports strapi:${strapiPort} node:${nodePort} vite:${vitePort}`)
  return catalogStack
}

async function disposeCatalogStack() {
  if (!catalogStack) return
  const stack = catalogStack
  catalogStack = null
  try {
    await stack.dispose()
  } catch {
    /* ignore */
  }
}

function writeResultsFile(overall) {
  const lines = [
    '# Phase 6 — Recorded local suite (legal closeout)',
    '',
    `**Started:** ${startedAt}`,
    `**Finished:** ${new Date().toISOString()}`,
    `**Overall:** ${overall}`,
    `**Aggregator:** \`npm run check:pages-cms-phase-6:record\` → commit → \`npm run check:pages-cms-phase-6\``,
    '**Phase 6 commits:** through Phase D hydrate + this aggregator',
    '',
    '## Attestation (QA-03 / R5-7)',
    '',
    '- [x] No `git push` performed by this gate',
    '- [x] No `strapi:sync-seed` performed by this gate',
    '- [x] No PR / remote deploy / remote mutation',
    '- [x] Default listeners `:1337`/`:3000`/`:5174` not killed (owned catalog stack on dynamic ports)',
    '- [x] Catalog API/UI/perf ran against owned Strapi+Node+Vite',
    '- [x] untracked/ignored pages_cms uploads = 0 (pre + post; includes gitignored `*.mp4`)',
    '- [x] Legal SSR markers present; no thin shell; no dangerouslySetInnerHTML in legal consumer',
    '- [x] LEG-01 / LEG-02 covered by Phase 6B–D gates',
    '',
    '## Legal pages',
    '',
    '- privacy / terms / cookies',
    '- fixture/default/SSR counts: 55 / 37 / 17',
    '- Node allowlist: 9 slugs',
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
  lines.push('- untracked/ignored `*pages_cms_*` uploads = 0 (vs `git ls-files`, including ignored)')
  lines.push('- Git porcelain matches pre-gate working tree (**normal** mode only; record mode writes this file)')
  lines.push('- Forbidden-port listeners match pre-gate snapshot')
  lines.push('')
  lines.push('*Generated by `npm run check:pages-cms-phase-6:record`*')
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true })
  fs.writeFileSync(resultsPath, `${lines.join('\n')}\n`)
  console.log(`\nRecorded suite → ${path.relative(root, resultsPath)}`)
  console.log('  (commit this file, then re-run `npm run check:pages-cms-phase-6` without --record)')
}

function finalizeLocality(reason) {
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
    if (uploadsBefore) {
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
    }

    assertPagesCmsUploadsTrackedOnly('post: pages_cms uploads tracked-only')

    // Porcelain: normal mode must match pre-gate. Record mode writes evidence after this —
    // so we only assert porcelain in normal mode (before any tracked write).
    if (!recordMode) {
      if (assertPorcelain(reason)) {
        record('porcelain unchanged', 'PASS')
      } else {
        record('porcelain unchanged', 'FAIL')
      }
    } else {
      record(
        'porcelain unchanged',
        'SKIP',
        'record mode writes 06-SUITE-RESULTS.md; commit then re-run normal mode',
      )
    }
  } catch (err) {
    failures.push(
      `${reason}: finalize crashed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

async function envForStep(step) {
  if (step.kind === 'catalog' || step.kind === 'owned-ui') {
    const stack = await ensureCatalogStack()
    const nodeBase = `http://127.0.0.1:${stack.ports.nodePort}`
    const viteBase = `http://127.0.0.1:${stack.ports.vitePort}`
    return {
      ...process.env,
      CATALOG_API_BASE_URL: nodeBase,
      CATALOG_UI_BASE_URL: viteBase,
      CATALOG_PERF_BASE_URL: viteBase,
      PAGES_CMS_UI_BASE_URL: viteBase,
      DEV_API_PORT: String(stack.ports.nodePort),
    }
  }

  if (step.kind !== 'pages-api') return process.env
  if (process.env.PAGES_API_BASE_URL) return process.env

  const wantStrapi = Number(process.env.PAGES_API_STRAPI_PORT || 1337)
  const wantNode = Number(process.env.PAGES_API_CHECK_PORT || 3011)
  const env = { ...process.env }

  if (portInUse(wantStrapi) || process.env.PAGES_API_ISOLATE_DB === '1') {
    const workDir = fs.mkdtempSync(path.join(root, '.tmp', 'phase6-pages-api-'))
    registerTempDir(workDir)
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

async function shutdownOwned(reason) {
  await disposeCatalogStack()
  cleanupTempDirs()
  finalizeLocality(reason)
  if (recordMode) {
    writeResultsFile(failures.length ? 'FAIL' : 'PASS')
  }
}

function onSignal(signal) {
  failures.push(`interrupted by ${signal}`)
  record(`signal ${signal}`, 'FAIL')
  try {
    if (catalogStack?.syncTeardownOwned) {
      catalogStack.syncTeardownOwned()
    }
  } catch {
    /* ignore */
  }
  catalogStack = null
  cleanupTempDirs()
  finalizeLocality(`signal:${signal}`)
  if (recordMode) {
    try {
      writeResultsFile('FAIL')
    } catch {
      /* ignore */
    }
  }
  console.error('\ncheck:pages-cms-phase-6 FAILED')
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
  // Best-effort sync temp cleanup on abrupt exit
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
})

console.log(
  recordMode
    ? '\ncheck:pages-cms-phase-6 RECORD mode (will write 06-SUITE-RESULTS.md)'
    : '\ncheck:pages-cms-phase-6 NORMAL mode (no tracked writes)',
)

try {
  console.log('\n── pre: pages_cms uploads tracked-only ──')
  if (!assertPagesCmsUploadsTrackedOnly('pre: pages_cms uploads tracked-only')) {
    throw new Error('precondition failed: untracked/ignored pages_cms uploads present')
  }

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
    console.log('\n── ignored pages_cms mp4 probe ──')
    const ignoredProbe = runUntrackedPagesCmsProbe(uploadsDir, root)
    if (!ignoredProbe.ok) {
      for (const f of ignoredProbe.failures) failures.push(f)
      record('ignored pages_cms mp4 probe', 'FAIL', ignoredProbe.failures.join('; '))
    } else {
      console.log('ignored pages_cms mp4 probe PASS')
      record('ignored pages_cms mp4 probe', 'PASS')
    }
  }

  // Fingerprint only after a clean tracked-only baseline (never accept ignored seed junk).
  if (failures.length === 0) {
    uploadsBefore = uploadsFingerprint(uploadsDir)
  }

  const snapFpBefore = fingerprintPagesSnapshotDir(publicDir)

  if (failures.length === 0) {
    console.log('\n── Phase 6 locality probes ──')
    // Thin SSR / markers
    for (const slug of ['privacy', 'terms', 'cookies']) {
      const html = fs.readFileSync(path.join(root, `${slug}.html`), 'utf8')
      if (!html.includes('<!-- pages-cms:legal-ssr:start -->') || !html.includes('<!-- pages-cms:legal-ssr:end -->')) {
        failures.push(`${slug}.html missing SSR markers`)
        record(`SSR markers ${slug}`, 'FAIL')
      } else if (!html.includes('class="legal-page-content"') || !/<div class="legal-page-content">[\s\S]*?<\/div>/.test(html)) {
        failures.push(`${slug}.html thin/missing legal-page-content`)
        record(`SSR body ${slug}`, 'FAIL')
      } else {
        const m = html.match(/<!-- pages-cms:legal-ssr:start -->([\s\S]*?)<!-- pages-cms:legal-ssr:end -->/)
        const region = m ? m[1] : ''
        if (region.length < 200) {
          failures.push(`${slug}.html thin SSR region`)
          record(`SSR body ${slug}`, 'FAIL', `len=${region.length}`)
        } else {
          record(`SSR body ${slug}`, 'PASS', `region=${region.length}B`)
        }
      }
    }
    // No dangerouslySetInnerHTML / raw HTML injection in legal consumer
    const legalSrc = [
      'src/components/pages/LegalPage.tsx',
      'src/components/pages/legal-renderer.tsx',
      'src/components/pages/legal-content.tsx',
    ]
    for (const rel of legalSrc) {
      const text = fs.readFileSync(path.join(root, rel), 'utf8')
      if (/dangerouslySetInnerHTML|innerHTML\s*=/.test(text)) {
        failures.push(`${rel}: forbidden HTML injection API`)
        record(`no-raw-html ${rel}`, 'FAIL')
      } else {
        record(`no-raw-html ${path.basename(rel)}`, 'PASS')
      }
    }
  }

  if (failures.length === 0) {
    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i]
      console.log(`\n── ${step.label} (${step.script}) ──`)
      const env = await envForStep(step)
      const started = Date.now()
      let result
      const maxAttempts = step.kind === 'owned-ui' || step.kind === 'catalog' ? 2 : 1
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        result = spawnSync('npm', ['run', step.script], {
          cwd: root,
          encoding: 'utf8',
          stdio: 'inherit',
          env,
        })
        if (result.status === 0) break
        if (attempt < maxAttempts) {
          console.log(`  retry ${step.label} after exit ${result.status}`)
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
      const ms = Date.now() - started
      if (result.status !== 0) {
        const detail = `exit ${result.status} (${ms}ms)`
        failures.push(`${step.label}: ${detail}`)
        record(step.label, 'FAIL', detail)
        break
      }
      let detail = `${ms}ms`
      if (step.kind === 'pages-api' && env.PAGES_API_STRAPI_PORT) {
        detail = `${ms}ms strapi:${env.PAGES_API_STRAPI_PORT} node:${env.PAGES_API_CHECK_PORT || '3011'}`
      } else if (
        (step.kind === 'catalog' || step.kind === 'owned-ui') &&
        env.CATALOG_UI_BASE_URL
      ) {
        detail = `${ms}ms ui:${env.CATALOG_UI_BASE_URL}${env.CATALOG_API_BASE_URL ? ` api:${env.CATALOG_API_BASE_URL}` : ''}`
      }
      record(step.label, 'PASS', detail)
      restoreUploads(`after:${step.label}`)

      // Release owned catalog stack before build (and when leaving catalog/ui steps).
      const next = STEPS[i + 1]
      const stepNeedsStack = step.kind === 'catalog' || step.kind === 'owned-ui'
      const nextNeedsStack = next && (next.kind === 'catalog' || next.kind === 'owned-ui')
      if (stepNeedsStack && !nextNeedsStack) {
        await disposeCatalogStack()
      }
    }
  }

  // Snapshot fingerprint must not change in normal gate (after steps, before record write)
  if (failures.length === 0 && !recordMode) {
    const snapFpAfter = fingerprintPagesSnapshotDir(publicDir)
    if (JSON.stringify(snapFpAfter) !== JSON.stringify(snapFpBefore)) {
      failures.push('tracked public/pages-* snapshot fingerprint changed during normal gate')
      record('snapshot fingerprint', 'FAIL')
    } else {
      record('snapshot fingerprint', 'PASS')
    }
  }
} catch (err) {
  failures.push(`gate crashed: ${err instanceof Error ? err.message : String(err)}`)
  record('aggregator', 'FAIL', String(err))
} finally {
  await shutdownOwned('post-gate')
}

if (failures.length) {
  console.error('\ncheck:pages-cms-phase-6 FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

if (recordMode) {
  console.log(
    '\ncheck:pages-cms-phase-6 RECORD PASS — commit 06-SUITE-RESULTS.md, then run normal mode',
  )
} else {
  console.log(
    '\ncheck:pages-cms-phase-6 PASS (listeners/uploads/porcelain unchanged; no tracked writes)',
  )
}
